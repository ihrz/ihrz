/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import { isIPv6 } from 'node:net';

// Configuration interface
interface PingConfig {
	timeout?: number;      // Timeout in seconds (default: 2)
	count?: number;        // Number of pings (default: 1)
	packetSize?: number;   // Packet size in bytes (default: 56)
	sourceAddr?: string;   // Source IP address
	numeric?: boolean;     // Skip DNS resolution (default: true)
}

// Ping response interface
interface PingResponse {
	host: string;
	numericHost: string;
	alive: boolean;
	time?: number;         // First ping time in ms
	times: number[];       // All ping times
	min?: number;
	max?: number;
	avg?: number;
	stddev?: number;
	packetLoss?: number;
	output: string;
}

// Simple ping class
export class Ping {
	private readonly isV6: boolean;
	private readonly isMac: boolean;

	constructor(private readonly target: string, private readonly config: PingConfig = {}) {
		this.isV6 = isIPv6(target);
		this.isMac = platform() === 'darwin';

		// Set defaults
		this.config = {
			timeout: 2,
			count: 1,
			packetSize: 56,
			numeric: true,
			...config
		};
	}

	// Build command arguments based on platform
	private buildArgs(): string[] {
		const args: string[] = [];

		// Common options
		if (this.config.numeric) args.push('-n');
		if (this.config.count) args.push('-c', this.config.count.toString());
		if (this.config.packetSize) args.push('-s', this.config.packetSize.toString());

		// Platform-specific timeout handling
		if (this.config.timeout) {
			if (this.isMac && this.isV6) {
				// macOS ping6 doesn't support timeout
				console.warn('Timeout not supported on macOS ping6');
			} else {
				const timeoutValue = this.isMac ? (this.config.timeout * 1000).toString() : this.config.timeout.toString();
				args.push('-W', timeoutValue);
			}
		}

		// Source address
		if (this.config.sourceAddr) {
			const sourceFlag = this.isMac ? '-S' : '-I';
			args.push(sourceFlag, this.config.sourceAddr);
		}

		args.push(this.target);
		return args;
	}

	// Get ping executable path
	private getExecutable(): string {
		if (this.isMac) {
			return this.isV6 ? '/sbin/ping6' : '/sbin/ping';
		}
		return this.isV6 ? 'ping6' : 'ping';
	}

	// Parse ping output using simplified regex approach
	private parseOutput(output: string): Omit<PingResponse, 'output'> {
		const lines = output.split('\n').filter(line => line.trim());
		const times: number[] = [];

		let host = this.target;
		let numericHost = this.target;
		let packetLoss: number | undefined;
		let min: number | undefined;
		let max: number | undefined;
		let avg: number | undefined;

		for (const line of lines) {
			// Extract host info from first line
			if (line.includes('PING')) {
				const hostMatch = line.match(/PING\s+(\S+)\s*(?:\(([^)]+)\))?/);
				if (hostMatch) {
					host = hostMatch[1];
					numericHost = hostMatch[2] || hostMatch[1];
				}
			}

			// Extract ping times (look for time=X.Xms pattern)
			const timeMatch = line.match(/time[=<]\s*([0-9.]+)\s*ms/i);
			if (timeMatch) {
				times.push(parseFloat(timeMatch[1]));
			}

			// Extract packet loss
			const lossMatch = line.match(/(\d+(?:\.\d+)?)%\s+packet\s+loss/i);
			if (lossMatch) {
				packetLoss = parseFloat(lossMatch[1]);
			}

			// Extract statistics (min/avg/max pattern)
			const statsMatch = line.match(/=\s*([0-9.]+)\/([0-9.]+)\/([0-9.]+)(?:\/([0-9.]+))?\s*ms/);
			if (statsMatch) {
				min = parseFloat(statsMatch[1]);
				avg = parseFloat(statsMatch[2]);
				max = parseFloat(statsMatch[3]);
			}
		}

		// Calculate standard deviation if not provided
		let stddev: number | undefined;
		if (times.length > 1 && avg !== undefined) {
			const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length;
			stddev = Math.sqrt(variance);
		}

		return {
			host,
			numericHost,
			alive: times.length > 0,
			time: times[0],
			times,
			min,
			max,
			avg,
			stddev,
			packetLoss
		};
	}

	// Execute ping command
	async execute(): Promise<PingResponse> {
		return new Promise((resolve, reject) => {
			const executable = this.getExecutable();
			const args = this.buildArgs();

			const child = spawn(executable, args, {
				env: { ...process.env, LANG: 'C' }  // Force English output
			});

			let stdout = '';
			let stderr = '';

			child.stdout.on('data', (data: Buffer) => {
				stdout += data.toString();
			});

			child.stderr.on('data', (data: Buffer) => {
				stderr += data.toString();
			});

			child.on('error', (error) => {
				reject(new Error(`Failed to execute ping: ${error.message}`));
			});

			child.on('close', (code) => {
				const output = stdout + stderr;

				try {
					const result = this.parseOutput(output);
					resolve({
						...result,
						output
					});
				} catch (error) {
					reject(new Error(`Failed to parse ping output: ${error instanceof Error ? error.message : 'Unknown error'}`));
				}
			});
		});
	}
}

// Convenience function for quick pings
export async function ping(target: string, config?: PingConfig): Promise<PingResponse> {
	const pinger = new Ping(target, config);
	return pinger.execute();
}

// Export types
export type { PingConfig, PingResponse };