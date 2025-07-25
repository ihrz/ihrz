import type { HorizonDatabaseClientOptions } from "../types.ts";
import type { PacketMessage } from "../types.ts";

import {
	log,
	warn,
	error
} from "node:console";

export class Horizon {
	private ws: WebSocket | null = null;
	private url: string;
	private currentTable: string = 'json';
	private pendingRequests = new Map<string, {
		resolve: Function;
		reject: Function;
		timer?: NodeJS.Timeout;
	}>();
	private connected: boolean = false;
	private connectionPromise: Promise<void> | null = null;
	private authPromise: Promise<void> | null = null;
	private sessionId: string | null = null;
	private login: string | null = null;
	private password: string | null = null;
	private tables: string[] = ['json'];
	private enableVerboses: boolean;

	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;
	private initialReconnectDelay: number = 1000; // ms - Initial reconnection delay
	private currentReconnectDelay: number; // Current reconnection delay, which will increase
	private maxReconnectDelay: number = 30000; // ms - Maximum reconnection delay (30 seconds)
	private reconnectBackoffFactor: number = 1.5; // Factor by which reconnection delay increases
	private reconnectTimeout: NodeJS.Timeout | null = null;

	// Request timeout configuration
	private requestTimeout: number = 30000; // 30 seconds default

	// Ready state tracking
	private isReady: boolean = false;
	private readyPromise: Promise<void> | null = null;

	constructor(url: string = 'ws://localhost:3000', options: HorizonDatabaseClientOptions) {
		this.url = url;

		if (options.login) this.login = options.login;
		if (options.password) this.password = options.password;
		if (options.tables && options.tables.length > 0) {
			this.tables = options.tables;
			this.currentTable = options.tables[0] || "json";
		}
		this.enableVerboses = options.enableVerboses || false;

		// Initialize currentReconnectDelay with the initial value
		this.currentReconnectDelay = this.initialReconnectDelay;

		// Initialize connection and auth promise
		this.initializeClient();
	}

	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	// Initialize client with connection and optional authentication
	private initializeClient(): void {
		this.readyPromise = this.connect().then(async () => {
			// If credentials are provided, authenticate before marking as ready
			if (this.login && this.password) {
				await this.authenticate();
			}
			this.isReady = true;
		}).catch(err => {
			this.console('err', 'Client initialization failed:', err);
			throw err;
		});
	}

	private async waitForReady(): Promise<void> {
		if (this.isReady) return;
		if (this.readyPromise) {
			await this.readyPromise;
		}
	}

	private connect(): Promise<void> {
		// If a connection promise already exists and is not null, return it
		if (this.connectionPromise) return this.connectionPromise;

		this.connectionPromise = new Promise((resolve, reject) => {
			const ws = new WebSocket(this.url);
			const timeout = setTimeout(() => {
				ws.close();
				reject(new Error("Connection timeout"));
			}, 10_000); // 10 seconds timeout for initial connection

			ws.onopen = () => {
				clearTimeout(timeout);
				this.ws = ws;
				this.connected = true;
				this.console("log", "Connected");
				// Reset reconnect attempts and currentReconnectDelay on successful connection
				this.reconnectAttempts = 0;
				this.currentReconnectDelay = this.initialReconnectDelay;
				if (this.reconnectTimeout) {
					clearTimeout(this.reconnectTimeout);
					this.reconnectTimeout = null;
				}
				resolve();
			};

			ws.onerror = err => {
				clearTimeout(timeout);
				// Reject the connection promise if an error occurs during connection attempt
				reject(err);
			};

			ws.onclose = () => this.handleClose();
			ws.onmessage = evt => this.handleMessage(evt);
		});

		return this.connectionPromise;
	}

	private handleMessage(event: MessageEvent): void {
		// Use setImmediate to process messages asynchronously, preventing blocking
		setImmediate(() => {
			try {
				const { id, type, data, error }: PacketMessage = JSON.parse(event.data);
				const pending = this.pendingRequests.get(id);

				// If no pending request found for the ID, it might be an unsolicited message or already handled
				if (!pending) return;

				// Clear the timeout for this specific request
				if (pending.timer) {
					clearTimeout(pending.timer);
				}
				// Remove the request from pending map
				this.pendingRequests.delete(id);

				// Resolve or reject the promise based on the message type
				type === "response" ? pending.resolve(data) : pending.reject(new Error(error));
			} catch (e) {
				this.console("err", "Invalid server message:", e);
			}
		});
	}

	/**
	 * Cleans up connection-related states and pending requests.
	 * This function is called when the WebSocket connection is closed or when disconnecting.
	 */
	private cleanupConnection(): void {
		this.console("log", "Cleaning up connection...");

		// Clear any existing reconnect timeout
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}

		// Reject and clear all pending requests
		for (const [id, { reject, timer }] of this.pendingRequests.entries()) {
			if (timer) clearTimeout(timer); // Clear timeout associated with the request
			reject(new Error("Connection closed or client disconnecting")); // Reject the promise
			this.pendingRequests.delete(id); // Remove from map
		}
		this.pendingRequests.clear(); // Ensure the map is completely empty

		// Reset connection-related states
		this.connected = false;
		this.ws = null;
		this.sessionId = null;
		this.connectionPromise = null; // Clear the connection promise to allow new connection attempts
		this.authPromise = null; // Clear the authentication promise
		this.readyPromise = null; // Clear the ready promise
		this.isReady = false; // Mark client as not ready
	}

	private handleClose(): void {
		this.console("warn", "WebSocket closed. Attempting to reconnect...");
		// Call the cleanup function to reset states and clear pending requests
		this.cleanupConnection();

		// Increment reconnect attempts
		this.reconnectAttempts++;

		// Attempt to reconnect if within max attempts
		if (this.reconnectAttempts <= this.maxReconnectAttempts) {
			this.reconnectTimeout = setTimeout(() => {
				this.console("log", `Reconnecting attempt ${this.reconnectAttempts} with delay ${this.currentReconnectDelay}ms...`);
				this.initializeClient(); // Re-initialize the client to attempt connection
				// Increase the reconnect delay for the next attempt (exponential backoff)
				this.currentReconnectDelay = Math.min(
					this.currentReconnectDelay * this.reconnectBackoffFactor,
					this.maxReconnectDelay
				);
			}, this.currentReconnectDelay);
		} else {
			this.console("err", "Max reconnect attempts reached. Connection will not be re-established automatically.");
		}
	}

	private async sendMessage(
		data: Omit<PacketMessage, 'id' | 'type' | 'table' | 'sessionId'>,
		waitReady: boolean = true
	): Promise<any> {
		// Wait for the client to be ready (connected and authenticated if credentials provided)
		if (waitReady) await this.waitForReady();

		return new Promise((resolve, reject) => {
			const id = this.generateId();
			const message: PacketMessage = {
				id,
				type: "request",
				table: this.currentTable,
				sessionId: this.sessionId || undefined, // Include sessionId if available
				...data
			};

			// Set a timeout for the request
			const timer = setTimeout(() => {
				this.pendingRequests.delete(id); // Remove the request if it times out
				reject(new Error(`Request timeout for operation: ${data.operation}`));
			}, this.requestTimeout);

			// Store the resolve/reject functions and the timer for this request
			this.pendingRequests.set(id, { resolve, reject, timer });

			// Check if WebSocket is open before sending
			if (this.ws?.readyState === WebSocket.OPEN) {
				this.ws.send(JSON.stringify(message));
			} else {
				// If WebSocket is not open, reject immediately and clean up
				clearTimeout(timer);
				this.pendingRequests.delete(id);
				reject(new Error("WebSocket is not open. Cannot send message."));
			}
		});
	}

	private authenticate(): Promise<void> {
		// If an authentication promise already exists, return it
		if (this.authPromise) return this.authPromise;

		this.authPromise = this.sendMessage({
			operation: "login",
			login: this.login!,
			password: this.password!
		}, false) // Do not wait for ready state for authentication itself
			.then(result => {
				if (!result.success) {
					throw new Error("Authentication failed");
				}
				this.sessionId = result.sessionId;
				this.console("log", "Authenticated successfully.");
			})
			.catch(err => {
				this.console("err", "Authentication failed:", err);
				// Clear authPromise on failure so it can be retried
				this.authPromise = null;
				throw err; // Re-throw to propagate the error
			});

		return this.authPromise;
	}

	private console(TYPE: "log" | "warn" | "err", message?: any, ...optionalParams: any[]) {
		if (this.enableVerboses) {
			// Use setImmediate to ensure console operations don't block
			setImmediate(() => {
				switch (TYPE) {
					case "err":
						if (optionalParams.length >= 1) {
							error(message, ...optionalParams);
						} else {
							error(message);
						}
						break;
					case "log":
						if (optionalParams.length >= 1) {
							log(message, ...optionalParams);
						} else {
							log(message);
						}
						break;
					case "warn":
						if (optionalParams.length >= 1) {
							warn(message, ...optionalParams);
						} else {
							warn(message);
						}
						break;
				}
			});
		}
	}

	public async logout(): Promise<{ success: boolean }> {
		try {
			const result = await this.sendMessage({
				operation: 'logout'
			});

			if (result.success) {
				this.sessionId = null;
				this.console('log', 'Logged out successfully');
			}

			return result;
		} catch (error: any) {
			this.console('err', 'Logout failed:', error);
			return { success: false };
		}
	}

	public table(tableName: string): Horizon {
		// Add table name if it's new and tables array is managed
		if (this.tables.length > 0 && !this.tables.includes(tableName)) {
			this.tables.push(tableName);
		}

		// Create a new instance to allow chaining without modifying the original client's table
		const newInstance = Object.create(Object.getPrototypeOf(this));
		Object.assign(newInstance, this); // Copy properties
		newInstance.currentTable = tableName; // Set the new table name
		// Important: Share pendingRequests map across instances if they are meant to share the same connection
		// If each `table()` call should create an isolated set of pending requests, then clone it.
		// Given the current implementation, sharing `pendingRequests` is implied for a single connection.
		newInstance.pendingRequests = this.pendingRequests;

		return newInstance;
	}

	// All public methods wait for ready state before executing
	public async get(key: string, defaultValue: any = undefined): Promise<any> {
		const result = await this.sendMessage({ operation: 'get', key, defaultValue });
		return result;
	}

	public async set(key: string, value: any): Promise<void> {
		await this.sendMessage({ operation: 'set', key, value });
	}

	public async delete(key: string): Promise<void> {
		await this.sendMessage({ operation: 'delete', key });
	}

	public async add(key: string, amount: number): Promise<void> {
		await this.sendMessage({ operation: 'add', key, amount });
	}

	public async sub(key: string, amount: number): Promise<void> {
		await this.sendMessage({ operation: 'sub', key, amount });
	}

	public async push(key: string, element: any): Promise<void> {
		await this.sendMessage({ operation: 'push', key, element });
	}

	public async pull(key: string, element: any): Promise<void> {
		await this.sendMessage({ operation: 'pull', key, element });
	}

	public async has(key: string): Promise<boolean> {
		const result = await this.sendMessage({ operation: 'has', key });
		return result;
	}

	public async all(): Promise<Array<{ id: string; value: any }>> {
		const result = await this.sendMessage({ operation: 'all' });
		return result;
	}

	public async deleteAll(): Promise<void> {
		await this.sendMessage({ operation: 'deleteAll' });
	}

	public async cache(key: string, value: any, time: number): Promise<void> {
		await this.sendMessage({ operation: 'cache', key, value, time });
	}

	public async disconnect(): Promise<void> {
		this.console("log", "Disconnecting client...");
		// Perform a full cleanup of the connection state
		this.cleanupConnection();

		// Explicitly close the WebSocket if it's still open
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.close();
		}
		this.ws = null; // Ensure ws is null after closing
	}

	public isConnected(): boolean {
		return this.connected;
	}

	public isAuthenticated(): boolean {
		return this.sessionId !== null;
	}

	// Wait for the client to be fully ready
	public async waitUntilReady(): Promise<void> {
		await this.waitForReady();
	}

	// Configuration methods
	public setRequestTimeout(timeout: number): void {
		if (timeout > 0) {
			this.requestTimeout = timeout;
		} else {
			this.console("warn", "Request timeout must be a positive number.");
		}
	}

	public setMaxReconnectAttempts(attempts: number): void {
		if (attempts >= 0) {
			this.maxReconnectAttempts = attempts;
		} else {
			this.console("warn", "Max reconnect attempts must be a non-negative number.");
		}
	}
}