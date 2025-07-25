import type { HorizonDatabaseClientOptions } from "../types.ts";
import type { PacketMessage } from "../types.ts";

import {
	log,
	warn,
	error
} from "node:console";

export class HorizonDatabaseClient {
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

	// Reconnection logic
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;
	private reconnectDelay: number = 1000; // ms
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

	// Wait for client to be ready (connected + authenticated if needed)
	private async waitForReady(): Promise<void> {
		if (this.isReady) return;
		if (this.readyPromise) {
			await this.readyPromise;
		}
	}

	private async connect(): Promise<void> {
		if (this.connected) return;

		if (this.connectionPromise) {
			return this.connectionPromise;
		}

		this.connectionPromise = new Promise((resolve, reject) => {
			// Create connection with timeout
			const connectionTimeout = setTimeout(() => {
				if (this.ws) {
					this.ws.close();
				}
				reject(new Error('Connection timeout'));
			}, 10000); // 10 second connection timeout

			this.ws = new WebSocket(this.url);

			this.ws.onopen = () => {
				clearTimeout(connectionTimeout);
				this.reconnectAttempts = 0;
				this.connected = true;
				this.console('log', 'Connected to HorizonDatabase server');
				resolve();
			};

			this.ws.onmessage = (event) => {
				// Process message asynchronously to avoid blocking
				setImmediate(() => {
					try {
						const message: PacketMessage = JSON.parse(event.data);
						const { id, type, data, error } = message;

						const pendingRequest = this.pendingRequests.get(id);
						if (pendingRequest) {
							// Clear timeout if exists
							if (pendingRequest.timer) {
								clearTimeout(pendingRequest.timer);
							}

							this.pendingRequests.delete(id);

							if (type === 'response') {
								pendingRequest.resolve(data);
							} else if (type === 'error') {
								pendingRequest.reject(new Error(error));
							}
						}
					} catch (err) {
						this.console('err', 'Failed to parse server message:', err);
					}
				});
			};

			this.ws.onclose = () => {
				clearTimeout(connectionTimeout);
				this.connected = false;
				this.isReady = false;
				this.connectionPromise = null;
				this.authPromise = null;
				this.readyPromise = null;
				this.sessionId = null;
				this.console('log', 'Disconnected from HorizonDatabase server');

				// Clean up pending requests
				for (const [id, { reject, timer }] of this.pendingRequests.entries()) {
					if (timer) clearTimeout(timer);
					reject(new Error('Connection closed'));
				}
				this.pendingRequests.clear();

				// Attempt reconnect without blocking
				setImmediate(() => this.attemptReconnect());
			};

			this.ws.onerror = (error) => {
				clearTimeout(connectionTimeout);
				this.connected = false;
				this.isReady = false;
				this.connectionPromise = null;
				reject(error);
			};
		});

		return this.connectionPromise;
	}

	private attemptReconnect(): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			this.console('err', 'Max reconnect attempts reached. Giving up.');
			return;
		}

		const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts++), 30000); // Cap at 30s
		this.console('warn', `Attempting to reconnect in ${delay}ms...`);

		if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
		this.reconnectTimeout = setTimeout(() => {
			// Reinitialize the client on reconnect
			this.initializeClient()
		}, delay);
	}

	private async sendMessage(message: Omit<PacketMessage, 'id' | 'type'>): Promise<any> {
		// Wait for ready state before sending any message
		await this.waitForReady();

		return new Promise((resolve, reject) => {
			const id = this.generateId();
			const fullMessage: PacketMessage = {
				id,
				type: 'request',
				table: this.currentTable,
				sessionId: this.sessionId || undefined,
				...message
			};

			// Set up timeout for request
			const timer = setTimeout(() => {
				this.pendingRequests.delete(id);
				reject(new Error('Request timeout'));
			}, this.requestTimeout);

			this.pendingRequests.set(id, { resolve, reject, timer });

			if (this.ws && this.ws.readyState === WebSocket.OPEN) {
				try {
					this.ws.send(JSON.stringify(fullMessage));
				} catch (err) {
					clearTimeout(timer);
					this.pendingRequests.delete(id);
					reject(new Error('Failed to send message: ' + err));
				}
			} else {
				clearTimeout(timer);
				this.pendingRequests.delete(id);
				reject(new Error('WebSocket is not connected'));
			}
		});
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

	private async authenticate(): Promise<void> {
		if (this.authPromise) {
			return this.authPromise;
		}

		if (!this.login || !this.password) {
			throw new Error('Login credentials not provided');
		}

		this.authPromise = (async () => {
			const result = await this.sendMessageRaw({
				operation: 'login',
				login: this.login!,
				password: this.password!,
				sessionId: undefined
			});

			if (result.success) {
				this.sessionId = result.sessionId;
				this.console('log', `Authenticated as ${this.login}`);
			} else {
				throw new Error('Authentication failed');
			}
		})();

		return this.authPromise;
	}

	// Internal method for sending messages without waiting for ready state (used for auth)
	private async sendMessageRaw(message: Omit<PacketMessage, 'id' | 'type'>): Promise<any> {
		return new Promise((resolve, reject) => {
			const id = this.generateId();
			const fullMessage: PacketMessage = {
				id,
				type: 'request',
				table: this.currentTable,
				sessionId: this.sessionId || undefined,
				...message
			};

			// Set up timeout for request
			const timer = setTimeout(() => {
				this.pendingRequests.delete(id);
				reject(new Error('Request timeout'));
			}, this.requestTimeout);

			this.pendingRequests.set(id, { resolve, reject, timer });

			if (this.ws && this.ws.readyState === WebSocket.OPEN) {
				try {
					this.ws.send(JSON.stringify(fullMessage));
				} catch (err) {
					clearTimeout(timer);
					this.pendingRequests.delete(id);
					reject(new Error('Failed to send message: ' + err));
				}
			} else {
				clearTimeout(timer);
				this.pendingRequests.delete(id);
				reject(new Error('WebSocket is not connected'));
			}
		});
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
			return { success: false };
		}
	}

	public table(tableName: string): HorizonDatabaseClient {
		if (this.tables.length > 0 && !this.tables.includes(tableName)) {
			this.tables.push(tableName);
		}

		const newInstance = Object.create(Object.getPrototypeOf(this));
		Object.assign(newInstance, this);
		newInstance.currentTable = tableName;
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
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}

		// Clear all pending requests
		for (const [id, { reject, timer }] of this.pendingRequests.entries()) {
			if (timer) clearTimeout(timer);
			reject(new Error('Client disconnecting'));
		}
		this.pendingRequests.clear();

		if (this.ws) {
			this.ws.close();
			this.ws = null;
			this.connected = false;
			this.isReady = false;
			this.connectionPromise = null;
			this.authPromise = null;
			this.readyPromise = null;
			this.sessionId = null;
		}
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
		this.requestTimeout = timeout;
	}

	public setMaxReconnectAttempts(attempts: number): void {
		this.maxReconnectAttempts = attempts;
	}
}