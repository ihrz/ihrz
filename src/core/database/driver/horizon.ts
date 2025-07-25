import type { HorizonDatabaseClientOptions } from "../types.ts";
import type { PacketMessage } from "../types.ts";

// Event emitter for non-blocking event handling
import { EventEmitter } from "node:events";
import { setTimeout as setTimeoutPromise } from "node:timers/promises";

// Constants for performance tuning
const CONSTANTS = {
	CONNECTION_TIMEOUT: 10000,
	REQUEST_TIMEOUT: 30000,
	RECONNECT_BASE_DELAY: 1000,
	RECONNECT_MAX_DELAY: 30000,
	MAX_RECONNECT_ATTEMPTS: 5,
	MESSAGE_QUEUE_SIZE: 1000,
	BATCH_SEND_INTERVAL: 10, // ms
} as const;

// Message queue for batching operations
interface QueuedMessage {
	message: string;
	timestamp: number;
}

export class HorizonDatabaseClient extends EventEmitter {
	private ws: WebSocket | null = null;
	private url: string;
	private currentTable: string = 'json';
	private pendingRequests = new Map<string, {
		resolve: (value: any) => void;
		reject: (reason?: any) => void;
		timestamp: number;
	}>();

	// Connection state
	private connectionState: 'disconnected' | 'connecting' | 'connected' | 'ready' = 'disconnected';
	private reconnectAttempts = 0;
	private reconnectTimer: Timer | null = null;

	// Authentication
	private sessionId: string | null = null;
	private readonly credentials: { login: string; password: string } | null;

	// Configuration
	private readonly tables: Set<string>;
	private readonly enableVerbose: boolean;
	private requestTimeout: number = CONSTANTS.REQUEST_TIMEOUT;
	private maxReconnectAttempts: number = CONSTANTS.MAX_RECONNECT_ATTEMPTS;

	// Message queue for batching
	private messageQueue: QueuedMessage[] = [];
	private sendTimer: Timer | null = null;

	// Promise resolvers for state management
	private statePromises: {
		connected?: { resolve: () => void; reject: (err: Error) => void };
		ready?: { resolve: () => void; reject: (err: Error) => void };
	} = {};

	constructor(url: string = 'ws://localhost:3000', options: HorizonDatabaseClientOptions) {
		super();
		this.url = url;
		this.enableVerbose = options.enableVerboses || false;

		// Initialize tables as Set for O(1) lookup
		this.tables = new Set(options.tables || ['json']);
		this.currentTable = options.tables?.[0] || 'json';

		// Store credentials if provided
		this.credentials = options.login && options.password
			? { login: options.login, password: options.password }
			: null;

		// Start connection process
		this.connect().catch(err => {
			this.logError('Initial connection failed:', err);
		});
	}

	// Optimized ID generation using crypto
	private generateId(): string {
		if (typeof globalThis.crypto !== 'undefined') {
			return globalThis.crypto.randomUUID();
		}
		// Fallback for environments without crypto
		return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}

	// Non-blocking logging
	private log(level: 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
		if (!this.enableVerbose) return;

		// Use process.nextTick for Node.js or queueMicrotask for better performance
		queueMicrotask(() => {
			const prefix = `[HorizonDB ${level.toUpperCase()}]`;
			switch (level) {
				case 'error':
					console.error(prefix, message, ...args);
					break;
				case 'warn':
					console.warn(prefix, message, ...args);
					break;
				case 'info':
					console.log(prefix, message, ...args);
					break;
			}
		});
	}

	private logError(message: string, ...args: any[]): void {
		this.log('error', message, ...args);
	}

	private async connect(): Promise<void> {
		if (this.connectionState === 'connected' || this.connectionState === 'ready') {
			return;
		}

		if (this.connectionState === 'connecting') {
			return new Promise((resolve, reject) => {
				this.statePromises.connected = { resolve, reject };
			});
		}

		this.connectionState = 'connecting';

		return new Promise((resolve, reject) => {
			this.statePromises.connected = { resolve, reject };

			// Connection timeout
			const timeoutId = setTimeout(() => {
				this.ws?.close();
				this.handleConnectionError(new Error('Connection timeout'));
			}, CONSTANTS.CONNECTION_TIMEOUT);

			try {
				this.ws = new WebSocket(this.url);
				this.ws.binaryType = 'arraybuffer'; // Use arraybuffer for better performance

				this.ws.onopen = () => {
					clearTimeout(timeoutId);
					this.handleConnectionOpen();
				};

				this.ws.onmessage = (event) => {
					// Process messages in a non-blocking way
					this.handleMessage(event);
				};

				this.ws.onerror = (error) => {
					clearTimeout(timeoutId);
					this.handleConnectionError(error);
				};

				this.ws.onclose = () => {
					clearTimeout(timeoutId);
					this.handleConnectionClose();
				};
			} catch (error) {
				clearTimeout(timeoutId);
				this.handleConnectionError(error);
			}
		});
	}

	private handleConnectionOpen(): void {
		this.connectionState = 'connected';
		this.reconnectAttempts = 0;
		this.log('info', 'Connected to HorizonDatabase server');

		// Resolve connection promise
		this.statePromises.connected?.resolve();
		delete this.statePromises.connected;

		// Emit connection event
		this.emit('connected');

		// Start authentication if credentials provided
		if (this.credentials) {
			this.authenticate().then(() => {
				this.connectionState = 'ready';
				this.statePromises.ready?.resolve();
				delete this.statePromises.ready;
				this.emit('ready');
			}).catch(err => {
				this.logError('Authentication failed:', err);
				this.statePromises.ready?.reject(err);
				delete this.statePromises.ready;
			});
		} else {
			this.connectionState = 'ready';
			this.statePromises.ready?.resolve();
			delete this.statePromises.ready;
			this.emit('ready');
		}
	}

	private handleMessage(event: MessageEvent): void {
		// Use queueMicrotask for non-blocking message processing
		queueMicrotask(() => {
			try {
				let message: PacketMessage;

				// Handle both string and binary data
				if (event.data instanceof ArrayBuffer) {
					const decoder = new TextDecoder();
					message = JSON.parse(decoder.decode(event.data));
				} else {
					message = JSON.parse(event.data);
				}

				const { id, type, data, error } = message;
				const pendingRequest = this.pendingRequests.get(id);

				if (pendingRequest) {
					this.pendingRequests.delete(id);

					if (type === 'response') {
						pendingRequest.resolve(data);
					} else if (type === 'error') {
						pendingRequest.reject(new Error(error || 'Unknown error'));
					}
				}
			} catch (err) {
				this.logError('Failed to parse server message:', err);
			}
		});
	}

	private handleConnectionError(error: any): void {
		this.connectionState = 'disconnected';
		this.logError('WebSocket error:', error);

		// Reject pending connection/ready promises
		this.statePromises.connected?.reject(error);
		this.statePromises.ready?.reject(error);
		delete this.statePromises.connected;
		delete this.statePromises.ready;

		this.emit('error', error);
	}

	private handleConnectionClose(): void {
		this.connectionState = 'disconnected';
		this.sessionId = null;
		this.log('info', 'Disconnected from HorizonDatabase server');

		// Clear message queue
		this.messageQueue = [];
		if (this.sendTimer) {
			clearTimeout(this.sendTimer);
			this.sendTimer = null;
		}

		// Reject all pending requests
		for (const [id, { reject }] of this.pendingRequests) {
			reject(new Error('Connection closed'));
		}
		this.pendingRequests.clear();

		// Reject pending promises
		const connectionError = new Error('Connection closed');
		this.statePromises.connected?.reject(connectionError);
		this.statePromises.ready?.reject(connectionError);
		delete this.statePromises.connected;
		delete this.statePromises.ready;

		this.emit('disconnected');

		// Attempt reconnection
		this.scheduleReconnect();
	}

	private scheduleReconnect(): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			this.logError('Max reconnect attempts reached');
			this.emit('reconnectFailed');
			return;
		}

		const delay = Math.min(
			CONSTANTS.RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts),
			CONSTANTS.RECONNECT_MAX_DELAY
		);

		this.reconnectAttempts++;
		this.log('info', `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
		}

		this.reconnectTimer = setTimeout(() => {
			this.connect().catch(err => {
				this.logError('Reconnection failed:', err);
			});
		}, delay);
	}

	private async waitUntilReady(): Promise<void> {
		if (this.connectionState === 'ready') return;

		if (this.connectionState === 'disconnected') {
			await this.connect();
		}

		return new Promise((resolve, reject) => {
			this.statePromises.ready = { resolve, reject };
		});
	}

	private async authenticate(): Promise<void> {
		if (!this.credentials) {
			throw new Error('No credentials provided');
		}

		const result = await this.sendMessageDirect({
			operation: 'login',
			login: this.credentials.login,
			password: this.credentials.password
		});

		if (result.success) {
			this.sessionId = result.sessionId;
			this.log('info', `Authenticated as ${this.credentials.login}`);
		} else {
			throw new Error('Authentication failed');
		}
	}

	// Direct send without waiting for ready state (used for auth)
	private sendMessageDirect(message: Omit<PacketMessage, 'id' | 'type'>): Promise<any> {
		return new Promise((resolve, reject) => {
			if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
				reject(new Error('WebSocket not connected'));
				return;
			}

			const id = this.generateId();
			const fullMessage: PacketMessage = {
				id,
				type: 'request',
				table: this.currentTable,
				sessionId: this.sessionId || undefined,
				...message
			};

			// Set up request tracking with timestamp
			this.pendingRequests.set(id, {
				resolve,
				reject,
				timestamp: Date.now()
			});

			try {
				this.ws.send(JSON.stringify(fullMessage));

				// Set up timeout
				setTimeout(() => {
					if (this.pendingRequests.has(id)) {
						this.pendingRequests.delete(id);
						reject(new Error('Request timeout'));
					}
				}, this.requestTimeout);
			} catch (err) {
				this.pendingRequests.delete(id);
				reject(new Error(`Failed to send message: ${err}`));
			}
		});
	}

	// Optimized message sending with batching support
	private async sendMessage(message: Omit<PacketMessage, 'id' | 'type'>): Promise<any> {
		await this.waitUntilReady();
		return this.sendMessageDirect(message);
	}

	// Public API methods
	public table(tableName: string): HorizonDatabaseClient {
		this.tables.add(tableName);

		// Create a new instance with the same connection but different table context
		const instance = Object.create(Object.getPrototypeOf(this));
		Object.assign(instance, this);
		instance.currentTable = tableName;

		return instance;
	}

	public async get(key: string, defaultValue?: any): Promise<any> {
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

	public async logout(): Promise<{ success: boolean }> {
		try {
			const result = await this.sendMessage({ operation: 'logout' });
			if (result.success) {
				this.sessionId = null;
				this.log('info', 'Logged out successfully');
			}
			return result;
		} catch (error) {
			return { success: false };
		}
	}

	public async disconnect(): Promise<void> {
		// Cancel reconnection
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		// Clear message queue
		this.messageQueue = [];
		if (this.sendTimer) {
			clearTimeout(this.sendTimer);
			this.sendTimer = null;
		}

		// Clear pending requests
		for (const [_, { reject }] of this.pendingRequests) {
			reject(new Error('Client disconnecting'));
		}
		this.pendingRequests.clear();

		// Close WebSocket
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.connectionState = 'disconnected';
		this.sessionId = null;

		this.emit('disconnected');
	}

	// Status methods
	public isConnected(): boolean {
		return this.connectionState === 'connected' || this.connectionState === 'ready';
	}

	public isReady(): boolean {
		return this.connectionState === 'ready';
	}

	public isAuthenticated(): boolean {
		return this.sessionId !== null;
	}

	public getConnectionState(): string {
		return this.connectionState;
	}

	// Configuration methods
	public setRequestTimeout(timeout: number): this {
		this.requestTimeout = timeout;
		return this;
	}

	public setMaxReconnectAttempts(attempts: number): this {
		this.maxReconnectAttempts = attempts;
		return this;
	}

	// Batch operations for better performance
	public async batchGet(keys: string[]): Promise<Map<string, any>> {
		const results = await Promise.all(
			keys.map(key => this.get(key).catch(() => undefined))
		);

		return new Map(keys.map((key, i) => [key, results[i]]));
	}

	public async batchSet(entries: Array<[string, any]>): Promise<void> {
		await Promise.all(
			entries.map(([key, value]) => this.set(key, value))
		);
	}

	// Clean up stale requests periodically
	private cleanupStaleRequests(): void {
		const now = Date.now();
		for (const [id, request] of this.pendingRequests) {
			if (now - request.timestamp > this.requestTimeout) {
				this.pendingRequests.delete(id);
				request.reject(new Error('Request timeout (stale)'));
			}
		}
	}
}