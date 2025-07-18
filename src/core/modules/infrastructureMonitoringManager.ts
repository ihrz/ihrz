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

import { BaseGuildTextChannel, Client, EmbedBuilder, time } from "discord.js";
import net from "node:net";
import { axios } from "../functions/axios.ts";

interface ResponseResult {
	up: boolean;
	latency: number;
}

class InfrastructureMonitoring {
	private client: Client;
	private timeout = 5000; // 5 seconds timeout for requests
	private statusEmbed: EmbedBuilder;
	private online: string;
	private down: string;
	private evaluating: string;
	private lastResult: Record<string, ResponseResult>;

	constructor(client: Client) {
		this.client = client;

		this.online = client.iHorizon_Emojis.Online;
		this.down = client.iHorizon_Emojis.DND;
		this.evaluating = client.iHorizon_Emojis.Invisible;

		this.statusEmbed = new EmbedBuilder()
			.setColor("#ff40c4")
			.setTitle("iHorizon Status Panel")
			.setDescription("This embed refresh every 1 minutes for showing the latest informations about iHorizon infrastructure")
			// .setFooter(await client.func.displayBotName.footerBuilder(message))
			.setFields(
				{
					name: "iHorizon (Public Bot)",
					value: this.evaluating,
					inline: false
				},
				{
					name: "HorizonGateway (Public/Private API)",
					value: this.evaluating,
					inline: false
				},
				{
					name: `ClusterManager ${client.config.core.cluster.map((x, _) => "#" + _)}`,
					value: this.evaluating,
					inline: false
				},
				{
					name: `Lavalink (Music Player)`,
					value: this.evaluating,
					inline: false
				},
				{
					name: `iHorizon Website`,
					value: this.evaluating,
					inline: false
				}
			);
	}

	private async HorizonGateway(): Promise<ResponseResult> {
		const HorizonGatewayURL = this.client.config.api.HorizonGateway;
		if (HorizonGatewayURL) {
			try {
				const startTime = Date.now();
				const response = await axios.get(HorizonGatewayURL, { timeout: this.timeout });
				const latency = Date.now() - startTime;

				return {
					up: true,
					latency: latency
				};
			} catch (error) {
				return {
					up: false,
					latency: 0
				};
			}
		}

		return {
			up: false,
			latency: 0
		};
	}

	private async Lavalink(): Promise<ResponseResult> {
		const Lavalinks = this.client.config.lavalink.nodes.map(x => `${x.host}:${x.port}`) || [];
		if (Lavalinks.length >= 1) {
			// Test the first Lavalink node for simplicity
			const [host, port] = Lavalinks[0].split(':');

			return await this.checkTcpConnection(host, parseInt(port));
		}

		return {
			up: false,
			latency: 0
		};
	}

	private async ClusterManager(): Promise<ResponseResult> {
		const ClusterManagers = this.client.config.core.cluster;
		if (ClusterManagers.length >= 1) {
			// Assuming ClusterManagers contains URLs or endpoints
			try {
				const startTime = Date.now();
				const response = await axios.get(ClusterManagers[0], { timeout: this.timeout });
				const latency = Date.now() - startTime;

				return {
					up: true,
					latency: latency
				};
			} catch (error) {
				return {
					up: false,
					latency: 0
				};
			}
		}

		return {
			up: false,
			latency: 0
		};
	}

	private async iHorizonWebsite(): Promise<ResponseResult> {
		const iHorizonWebsiteURL = "https://www.ihorizon.org";

		try {
			const startTime = Date.now();
			const response = await axios.get(iHorizonWebsiteURL, { timeout: this.timeout });
			const latency = Date.now() - startTime;

			return {
				up: response.status >= 200 && response.status < 300,
				latency: latency
			};
		} catch (error) {
			return {
				up: false,
				latency: 0
			};
		}
	}

	private async PublicBot(): Promise<ResponseResult> {
		const PublicBot = this.client;
		if (PublicBot) {
			try {
				const startTime = Date.now();
				// Check if the bot is connected to Discord
				const isReady = PublicBot.ws.status === 0; // 0 means READY state
				const latency = Date.now() - startTime;

				return {
					up: isReady,
					latency: PublicBot.ws.ping // Use Discord websocket ping
				};
			} catch (error) {
				return {
					up: false,
					latency: 0
				};
			}
		}

		return {
			up: false,
			latency: 0
		};
	}

	// Helper method to check TCP connections (for Lavalink)
	private checkTcpConnection(host: string, port: number): Promise<ResponseResult> {
		return new Promise((resolve) => {
			const startTime = Date.now();
			const socket = new net.Socket();

			socket.setTimeout(this.timeout);

			socket.on('connect', () => {
				const latency = Date.now() - startTime;
				socket.destroy();
				resolve({
					up: true,
					latency: latency
				});
			});

			socket.on('timeout', () => {
				socket.destroy();
				resolve({
					up: false,
					latency: 0
				});
			});

			socket.on('error', () => {
				socket.destroy();
				resolve({
					up: false,
					latency: 0
				});
			});

			socket.connect(port, host);
		});
	}

	// Method to check all services at once
	public async checkAllServices(): Promise<Record<string, ResponseResult>> {
		const results = await Promise.all([
			this.PublicBot().then(result => ({ name: 'PublicBot', result })),
			this.HorizonGateway().then(result => ({ name: 'HorizonGateway', result })),
			this.ClusterManager().then(result => ({ name: 'ClusterManager', result })),
			this.Lavalink().then(result => ({ name: 'Lavalink', result })),
			this.iHorizonWebsite().then(result => ({ name: 'iHorizonWebsite', result }))
		]);

		return results.reduce((acc, { name, result }) => {
			acc[name] = result;
			return acc;
		}, {} as Record<string, ResponseResult>);
	}

	// Format status string based on result
	private formatStatus(result: ResponseResult): string {
		if (result.up) {
			return `${this.online} Online | Latency: ${result.latency}ms`;
		} else {
			return `${this.down} Offline`;
		}
	}

	// Update embed fields based on monitoring results
	private updateStatusEmbed(results: Record<string, ResponseResult>): void {
		// Update each field in the embed based on results
		this.statusEmbed.setFields(
			{
				name: "iHorizon (Public Bot)",
				value: results.PublicBot ? this.formatStatus(results.PublicBot) : this.evaluating,
				inline: false
			},
			{
				name: "HorizonGateway (Public/Private API)",
				value: results.HorizonGateway ? this.formatStatus(results.HorizonGateway) : this.evaluating,
				inline: false
			},
			{
				name: `ClusterManager ${this.client.config.core.cluster.map((x, i) => "#" + i)}`,
				value: results.ClusterManager ? this.formatStatus(results.ClusterManager) : this.evaluating,
				inline: false
			},
			{
				name: `Lavalink (Music Player)`,
				value: results.Lavalink ? this.formatStatus(results.Lavalink) : this.evaluating,
				inline: false
			},
			{
				name: `iHorizon Website`,
				value: results.iHorizonWebsite ? this.formatStatus(results.iHorizonWebsite) : this.evaluating,
				inline: false
			}
		);

		// Set timestamp for last update
		this.statusEmbed.setTimestamp(new Date());
	}

	public async init() {
		try {
			const all_guilds = await this.client.db.get("MISC.statusEmbed") || {};

			// Check all services and update the embed
			this.lastResult = await this.checkAllServices();
			this.updateStatusEmbed(this.lastResult);

			// Update all status messages in configured channels
			for (const [guild_id, data] of Object.entries(all_guilds)) {
				try {
					const channelData = data as any;
					const channel = await this.client.channels.fetch(channelData.channel_id || channelData.guild_id).catch(() => null);

					if (channel && channel.isTextBased()) {
						const textChannel = channel as BaseGuildTextChannel | undefined;
						try {
							const msg = await textChannel?.messages.fetch(channelData.message_id);

							if (msg) {
								await msg.edit({
									content: `**Last update:** ${time(new Date(), "R")}`,
									embeds: [this.statusEmbed]
								});
							}
						} catch (msgError) {
							console.error(`Failed to update status message in guild ${guild_id}: ${msgError}`);
						}
					}
				} catch (channelError) {
					console.error(`Failed to process guild ${guild_id}: ${channelError}`);
				}
			}
		} catch (error) {
			console.error("Error in Infrastructure Monitoring init:", error);
		}
	}

	// Method to start periodic monitoring
	public startMonitoring(intervalMinutes: number = 1): void {
		// Run initial check
		this.init();

		// Set interval for periodic checks (converted to milliseconds)
		const intervalMs = intervalMinutes * 60 * 1000;
		setInterval(() => this.init(), intervalMs);
	}
}

export {
	InfrastructureMonitoring,
	ResponseResult
};