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
		timestamp: number; // Track when request was made
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
	private initialReconnectDelay: number = 1000;
	private currentReconnectDelay: number;
	private maxReconnectDelay: number = 30000;
	private reconnectBackoffFactor: number = 1.5;
	private reconnectTimeout: NodeJS.Timeout | null = null;

	// Request timeout configuration - Increased from 30s to 60s
	private requestTimeout: number = 60000;

	// Ready state tracking
	private isReady: boolean = false;
	private readyPromise: Promise<void> | null = null;

	// Rate limiting to prevent overwhelming the server
	private requestQueue: Array<() => void> = [];
	private activeRequests: number = 0;
	private maxConcurrentRequests: number = 10; // Limit concurrent requests
	private isProcessingQueue: boolean = false;

	// Health check mechanism
	private healthCheckInterval: NodeJS.Timeout | null = null;
	private lastSuccessfulRequest: number = Date.now();
	private healthCheckIntervalMs: number = 30000; // 30 seconds

	constructor(url: string = 'ws://localhost:3000', options: HorizonDatabaseClientOptions) {
		this.url = url;

		if (options.login) this.login = options.login;
		if (options.password) this.password = options.password;
		if (options.tables && options.tables.length > 0) {
			this.tables = options.tables;
			this.currentTable = options.tables[0] || "json";
		}
		this.enableVerboses = options.enableVerboses || false;

		this.currentReconnectDelay = this.initialReconnectDelay;

		// Initialize client with better error handling
		this.initializeClient();
		this.startHealthCheck();
	}

	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	// Start health check to monitor connection
	private startHealthCheck(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
		}

		this.healthCheckInterval = setInterval(() => {
			const timeSinceLastSuccess = Date.now() - this.lastSuccessfulRequest;

			// If no successful request in the last 2 minutes, check connection health
			if (timeSinceLastSuccess > 120000 && this.connected) {
				this.console('warn', 'No successful requests in 2 minutes, checking connection health');
				this.checkConnectionHealth();
			}
		}, this.healthCheckIntervalMs);
	}

	// Health check by sending a simple ping
	private async checkConnectionHealth(): Promise<void> {
		try {
			// Send a simple has operation to check if connection is alive
			await this.sendMessage({
				operation: 'has',
				key: '__health_check__'
			}, false, 5000); // Short timeout for health check

			this.lastSuccessfulRequest = Date.now();
			this.console('log', 'Connection health check passed');
		} catch (error) {
			this.console('warn', 'Connection health check failed, triggering reconnection');
			this.handleClose();
		}
	}

	private initializeClient(): void {
		this.readyPromise = this.connect().then(async () => {
			if (this.login && this.password) {
				await this.authenticate();
			}
			this.isReady = true;
			this.lastSuccessfulRequest = Date.now();
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
		if (this.connectionPromise) return this.connectionPromise;

		this.connectionPromise = new Promise((resolve, reject) => {
			const ws = new WebSocket(this.url);
			const timeout = setTimeout(() => {
				ws.close();
				reject(new Error("Connection timeout"));
			}, 15000); // Increased connection timeout to 15 seconds

			ws.onopen = () => {
				clearTimeout(timeout);
				this.ws = ws;
				this.connected = true;
				this.console("log", "Connected");
				this.reconnectAttempts = 0;
				this.currentReconnectDelay = this.initialReconnectDelay;
				if (this.reconnectTimeout) {
					clearTimeout(this.reconnectTimeout);
					this.reconnectTimeout = null;
				}
				this.lastSuccessfulRequest = Date.now();
				resolve();
			};

			ws.onerror = err => {
				clearTimeout(timeout);
				this.console('err', 'WebSocket error:', err);
				reject(err);
			};

			ws.onclose = () => this.handleClose();
			ws.onmessage = evt => this.handleMessage(evt);
		});

		return this.connectionPromise;
	}

	private handleMessage(event: MessageEvent): void {
		setImmediate(() => {
			try {
				const { id, type, data, error }: PacketMessage = JSON.parse(event.data);
				const pending = this.pendingRequests.get(id);

				if (!pending) return;

				if (pending.timer) {
					clearTimeout(pending.timer);
				}
				this.pendingRequests.delete(id);
				this.activeRequests = Math.max(0, this.activeRequests - 1);

				if (type === "response") {
					this.lastSuccessfulRequest = Date.now();
					pending.resolve(data);
				} else {
					pending.reject(new Error(error));
				}

				// Process next request in queue
				this.processRequestQueue();
			} catch (e) {
				this.console("err", "Invalid server message:", e);
			}
		});
	}

	// Process request queue to manage concurrent requests
	private processRequestQueue(): void {
		if (this.isProcessingQueue || this.requestQueue.length === 0) {
			return;
		}

		if (this.activeRequests < this.maxConcurrentRequests) {
			this.isProcessingQueue = true;
			const nextRequest = this.requestQueue.shift();
			if (nextRequest) {
				nextRequest();
			}
			this.isProcessingQueue = false;
		}
	}

	private cleanupConnection(): void {
		this.console("log", "Cleaning up connection...");

		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}

		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
			this.healthCheckInterval = null;
		}

		// Reject all pending requests with more specific error
		for (const [id, { reject, timer }] of this.pendingRequests.entries()) {
			if (timer) clearTimeout(timer);
			reject(new Error("Connection lost - request cancelled"));
			this.pendingRequests.delete(id);
		}
		this.pendingRequests.clear();

		// Clear request queue
		this.requestQueue.length = 0;
		this.activeRequests = 0;

		this.connected = false;
		this.ws = null;
		this.sessionId = null;
		this.connectionPromise = null;
		this.authPromise = null;
		this.readyPromise = null;
		this.isReady = false;
	}

	private handleClose(): void {
		this.console("warn", "WebSocket closed. Attempting to reconnect...");
		this.cleanupConnection();

		this.reconnectAttempts++;

		if (this.reconnectAttempts <= this.maxReconnectAttempts) {
			this.reconnectTimeout = setTimeout(() => {
				this.console("log", `Reconnecting attempt ${this.reconnectAttempts} with delay ${this.currentReconnectDelay}ms...`);
				this.initializeClient();
				// Restart health check after reconnection
				this.startHealthCheck();
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
		waitReady: boolean = true,
		customTimeout?: number
	): Promise<any> {
		if (waitReady) await this.waitForReady();

		return new Promise((resolve, reject) => {
			// If we have too many concurrent requests, queue this one
			if (this.activeRequests >= this.maxConcurrentRequests) {
				this.requestQueue.push(() => {
					this.executeSendMessage(data, resolve, reject, customTimeout);
				});
				return;
			}

			this.executeSendMessage(data, resolve, reject, customTimeout);
		});
	}

	private executeSendMessage(
		data: Omit<PacketMessage, 'id' | 'type' | 'table' | 'sessionId'>,
		resolve: Function,
		reject: Function,
		customTimeout?: number
	): void {
		const id = this.generateId();
		const message: PacketMessage = {
			id,
			type: "request",
			table: this.currentTable,
			sessionId: this.sessionId || undefined,
			...data
		};

		const timeout = customTimeout || this.requestTimeout;
		const timer = setTimeout(() => {
			const pending = this.pendingRequests.get(id);
			if (pending) {
				this.pendingRequests.delete(id);
				this.activeRequests = Math.max(0, this.activeRequests - 1);
				this.console('warn', `Request timeout for operation: ${data.operation} (${timeout}ms) - Active requests: ${this.activeRequests}`);
				reject(new Error(`Request timeout for operation: ${data.operation} after ${timeout}ms`));
				this.processRequestQueue(); // Process next request in queue
			}
		}, timeout);

		this.pendingRequests.set(id, {
			resolve,
			reject,
			timer,
			timestamp: Date.now()
		});
		this.activeRequests++;

		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		} else {
			clearTimeout(timer);
			this.pendingRequests.delete(id);
			this.activeRequests = Math.max(0, this.activeRequests - 1);
			reject(new Error("WebSocket is not open. Cannot send message."));
			this.processRequestQueue();
		}
	}

	private authenticate(): Promise<void> {
		if (this.authPromise) return this.authPromise;

		this.authPromise = this.sendMessage({
			operation: "login",
			login: this.login!,
			password: this.password!
		}, false)
			.then(result => {
				if (!result.success) {
					throw new Error("Authentication failed");
				}
				this.sessionId = result.sessionId;
				this.console("log", "Authenticated successfully.");
			})
			.catch(err => {
				this.console("err", "Authentication failed:", err);
				this.authPromise = null;
				throw err;
			});

		return this.authPromise;
	}

	private console(TYPE: "log" | "warn" | "err", message?: any, ...optionalParams: any[]) {
		if (this.enableVerboses) {
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

	// Add retry mechanism for critical operations
	private async retryOperation<T>(
		operation: () => Promise<T>,
		maxRetries: number = 3,
		delay: number = 1000
	): Promise<T> {
		let lastError: Error;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				return await operation();
			} catch (error: any) {
				lastError = error;
				this.console('warn', `Operation failed on attempt ${attempt}/${maxRetries}:`, error.message);

				if (attempt < maxRetries) {
					await new Promise(resolve => setTimeout(resolve, delay * attempt));
				}
			}
		}

		throw lastError!;
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
		if (this.tables.length > 0 && !this.tables.includes(tableName)) {
			this.tables.push(tableName);
		}

		const newInstance = Object.create(Object.getPrototypeOf(this));
		Object.assign(newInstance, this);
		newInstance.currentTable = tableName;
		newInstance.pendingRequests = this.pendingRequests;

		return newInstance;
	}

	// Enhanced public methods with retry logic for critical operations
	public async get(key: string, defaultValue: any = undefined): Promise<any> {
		return this.retryOperation(async () => {
			const result = await this.sendMessage({ operation: 'get', key, defaultValue });
			return result;
		});
	}

	public async set(key: string, value: any): Promise<void> {
		return this.retryOperation(async () => {
			await this.sendMessage({ operation: 'set', key, value });
		});
	}

	public async delete(key: string): Promise<void> {
		return this.retryOperation(async () => {
			await this.sendMessage({ operation: 'delete', key });
		});
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
		this.cleanupConnection();

		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.close();
		}
		this.ws = null;
	}

	public isConnected(): boolean {
		return this.connected && this.ws?.readyState === WebSocket.OPEN;
	}

	public isAuthenticated(): boolean {
		return this.sessionId !== null;
	}

	public async waitUntilReady(): Promise<void> {
		await this.waitForReady();
	}

	// Enhanced configuration methods
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

	public setMaxConcurrentRequests(max: number): void {
		if (max > 0) {
			this.maxConcurrentRequests = max;
		} else {
			this.console("warn", "Max concurrent requests must be a positive number.");
		}
	}

	// Get connection statistics
	public getConnectionStats(): {
		connected: boolean;
		authenticated: boolean;
		activeRequests: number;
		queuedRequests: number;
		reconnectAttempts: number;
		lastSuccessfulRequest: number;
	} {
		return {
			connected: this.connected,
			authenticated: this.isAuthenticated(),
			activeRequests: this.activeRequests,
			queuedRequests: this.requestQueue.length,
			reconnectAttempts: this.reconnectAttempts,
			lastSuccessfulRequest: this.lastSuccessfulRequest
		};
	}
}