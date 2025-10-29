/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

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
		timestamp: number;
		operation: string;
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

	// Optimized timeouts - Much shorter for better responsiveness
	private fastOperationTimeout: number = 40_000;  // 2s for simple operations (get, set, has)
	private slowOperationTimeout: number = 120_000;  // 5s for complex operations (all, deleteAll)
	private authTimeout: number = 10000;          // 10s for authentication

	// Ready state tracking
	private isReady: boolean = false;
	private readyPromise: Promise<void> | null = null;

	// Optimized concurrency settings
	private requestQueue: Array<() => void> = [];
	private activeRequests: number = 0;
	private maxConcurrentRequests: number = 50; // Increased from 10 to 50 for better throughput
	private isProcessingQueue: boolean = false;

	// Performance monitoring
	private performanceStats = {
		totalRequests: 0,
		failedRequests: 0,
		avgResponseTime: 0,
		slowRequests: 0, // Requests taking > 1s
		timeouts: 0
	};

	constructor(url: string = 'ws://localhost:3000', options: HorizonDatabaseClientOptions) {
		this.url = url;

		if (options.login) this.login = options.login;
		if (options.password) this.password = options.password;
		if (!options.tables) {
			throw new Error("tables is missing in the Horizon's class constructor")
		}
		if (options.tables.length > 0) {
			this.tables = options.tables.map(x => x.toLowerCase());
			this.currentTable = options.tables[0].toLowerCase() || "json";
		}
		this.enableVerboses = options.enableVerboses || false;

		this.currentReconnectDelay = this.initialReconnectDelay;

		// Initialize client with better error handling
		this.initializeClient();
	}

	private generateId(): string {
		// Optimized ID generation - shorter and faster
		return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`;
	}

	private initializeClient(): void {
		this.readyPromise = this.connect().then(async () => {
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
		if (this.connectionPromise) return this.connectionPromise;

		this.connectionPromise = new Promise((resolve, reject) => {
			const ws = new WebSocket(this.url);
			const timeout = setTimeout(() => {
				ws.close();
				reject(new Error("Connection timeout"));
			}, 10000); // Reduced from 15s to 10s

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
		// Remove setImmediate - process immediately for better performance
		try {
			const { id, type, data, error }: PacketMessage = JSON.parse(event.data);
			const pending = this.pendingRequests.get(id);

			if (!pending) return;

			// Calculate response time for performance monitoring
			const responseTime = Date.now() - pending.timestamp;
			this.updatePerformanceStats(responseTime, pending.operation);

			if (pending.timer) {
				clearTimeout(pending.timer);
			}
			this.pendingRequests.delete(id);
			this.activeRequests = Math.max(0, this.activeRequests - 1);

			if (type === "response") {
				pending.resolve(data);
			} else {
				pending.reject(new Error(error));
			}

			// Process next request in queue immediately
			this.processRequestQueue();
		} catch (e) {
			this.console("err", "Invalid server message:", e);
		}
	}

	// Performance monitoring helper
	private updatePerformanceStats(responseTime: number, operation: string): void {
		this.performanceStats.totalRequests++;

		// Update average response time using exponential moving average
		const alpha = 0.1; // Smoothing factor
		this.performanceStats.avgResponseTime =
			this.performanceStats.avgResponseTime * (1 - alpha) + responseTime * alpha;

		// Track slow requests
		if (responseTime > 1000) {
			this.performanceStats.slowRequests++;
			this.console('warn', `Slow request detected: ${operation} took ${responseTime}ms`);
		}
	}

	// Optimized queue processing - removed setImmediate calls
	private processRequestQueue(): void {
		if (this.isProcessingQueue || this.requestQueue.length === 0) {
			return;
		}

		while (this.activeRequests < this.maxConcurrentRequests && this.requestQueue.length > 0) {
			this.isProcessingQueue = true;
			const nextRequest = this.requestQueue.shift();
			if (nextRequest) {
				nextRequest();
			}
		}
		this.isProcessingQueue = false;
	}

	private cleanupConnection(): void {
		this.console("log", "Cleaning up connection...");

		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}

		// Reject all pending requests with more specific error
		for (const [id, { reject, timer, operation }] of this.pendingRequests.entries()) {
			if (timer) clearTimeout(timer);
			reject(new Error(`Connection lost - ${operation} request cancelled`));
			this.performanceStats.failedRequests++;
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
				this.currentReconnectDelay = Math.min(
					this.currentReconnectDelay * this.reconnectBackoffFactor,
					this.maxReconnectDelay
				);
			}, this.currentReconnectDelay);
		} else {
			this.console("err", "Max reconnect attempts reached. Connection will not be re-established automatically.");
		}
	}

	// Optimized timeout selection based on operation type
	private getTimeoutForOperation(operation: string): number {
		const fastOps = ['get', 'set', 'delete', 'has', 'add', 'sub', 'push', 'pull', 'cache'];
		const slowOps = ['all', 'deleteAll'];
		const authOps = ['login', 'logout'];

		if (authOps.includes(operation)) {
			return this.authTimeout;
		} else if (fastOps.includes(operation)) {
			return this.fastOperationTimeout;
		} else if (slowOps.includes(operation)) {
			return this.slowOperationTimeout;
		} else {
			return this.fastOperationTimeout; // Default to fast timeout
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

		const operation = data.operation || 'unknown';
		const timeout = customTimeout || this.getTimeoutForOperation(operation);

		const timer = setTimeout(() => {
			const pending = this.pendingRequests.get(id);
			if (pending) {
				this.pendingRequests.delete(id);
				this.activeRequests = Math.max(0, this.activeRequests - 1);
				this.performanceStats.timeouts++;
				this.performanceStats.failedRequests++;

				this.console('warn', `Request timeout for ${operation} (${timeout}ms) - Active: ${this.activeRequests}`);
				reject(new Error(`Request timeout for ${operation} after ${timeout}ms`));
				this.processRequestQueue(); // Process next request in queue
			}
		}, timeout);

		this.pendingRequests.set(id, {
			resolve,
			reject,
			timer,
			timestamp: Date.now(),
			operation
		});
		this.activeRequests++;

		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		} else {
			clearTimeout(timer);
			this.pendingRequests.delete(id);
			this.activeRequests = Math.max(0, this.activeRequests - 1);
			this.performanceStats.failedRequests++;
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
		}, false, this.authTimeout) // Use auth-specific timeout
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
			// Remove setImmediate for faster logging
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
		}
	}

	public table(tableName: string): Horizon {
		tableName = tableName.toLowerCase();
		if (!this.tables.includes(tableName)) {
			throw new Error(`Table '${tableName}' is not in constructor of Horizon. aborting.`)
		}

		const newInstance = Object.create(Object.getPrototypeOf(this));
		Object.assign(newInstance, this);
		newInstance.currentTable = tableName;
		newInstance.pendingRequests = this.pendingRequests;

		return newInstance;
	}

	// All public methods WITHOUT retry logic for better performance
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

		// Logout if authenticated
		if (this.sessionId) {
			try {
				await this.sendMessage({
					operation: 'logout'
				}, true, this.authTimeout);
				this.console('log', 'Logged out successfully');
			} catch (error: any) {
				this.console('err', 'Logout failed:', error);
			}
		}

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

	// Enhanced connection statistics with performance metrics
	public getConnectionStats(): {
		connected: boolean;
		authenticated: boolean;
		activeRequests: number;
		queuedRequests: number;
		reconnectAttempts: number;
		performance: {
			totalRequests: number;
			failedRequests: number;
			avgResponseTime: number;
			slowRequests: number;
			timeouts: number;
			successRate: number;
		};
	} {
		const successRate = this.performanceStats.totalRequests > 0
			? ((this.performanceStats.totalRequests - this.performanceStats.failedRequests) / this.performanceStats.totalRequests) * 100
			: 0;

		return {
			connected: this.connected,
			authenticated: this.isAuthenticated(),
			activeRequests: this.activeRequests,
			queuedRequests: this.requestQueue.length,
			reconnectAttempts: this.reconnectAttempts,
			performance: {
				...this.performanceStats,
				successRate
			}
		};
	}

	// Performance tuning methods
	public adjustConcurrency(maxConcurrent: number): void {
		this.maxConcurrentRequests = Math.max(1, Math.min(maxConcurrent, 100));
		this.console('log', `Adjusted max concurrent requests to ${this.maxConcurrentRequests}`);
	}

	public adjustTimeouts(fast: number, slow: number, auth: number): void {
		this.fastOperationTimeout = Math.max(500, fast);
		this.slowOperationTimeout = Math.max(1000, slow);
		this.authTimeout = Math.max(2000, auth);
		this.console('log', `Adjusted timeouts: fast=${this.fastOperationTimeout}ms, slow=${this.slowOperationTimeout}ms, auth=${this.authTimeout}ms`);
	}

	// Reset performance stats
	public resetPerformanceStats(): void {
		this.performanceStats = {
			totalRequests: 0,
			failedRequests: 0,
			avgResponseTime: 0,
			slowRequests: 0,
			timeouts: 0
		};
	}
}