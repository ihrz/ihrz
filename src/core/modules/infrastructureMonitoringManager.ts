/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

import {
	AttachmentBuilder,
	BaseGuildTextChannel,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	escapeMarkdown,
	time
} from "discord.js";
import net from "node:net";
import { axios } from "../functions/axios.ts";
import { metasTable } from "../../Events/client/ready.ts";
import type { LanguageData } from "../../../types/languageData.js";
import {
	BEATS_SHOWN,
	fetchKumaSnapshot,
	type KumaSnapshot,
	type ServiceBeat,
	type ServiceGroup,
	type ServiceState,
	type ServiceView
} from "./uptimeKuma.ts";
import {
	OVERALL_COLORS,
	formatUptime,
	renderStatusCard,
	type OverallState,
	type StatusReport
} from "./statusPanelCard.ts";

interface ResponseResult {
	up: boolean;
	latency: number;
}

interface PingHistoryEntry {
	timestamp: Date;
	ping: number;
}

const CARD_NAME = "infrastructure-status.png";
const INCIDENT_MAX_LENGTH = 300;
const GROUPS_MAX_LENGTH = 3000;

class InfrastructureMonitoring {
	private timeout = 5000; // 5 seconds timeout for requests
	private pingHistory: PingHistoryEntry[] = [];
	private readonly MAX_PING_HISTORY = 60;

	private async HorizonGateway(): Promise<ResponseResult> {
		const HorizonGatewayURL = client.config.api.HorizonGateway;
		if (HorizonGatewayURL) {
			try {
				const startTime = Date.now();
				const response = await axios.get(HorizonGatewayURL, {
					timeout: this.timeout
				});
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
		const Lavalinks =
			client.config.lavalink.nodes.map((x) => `${x.host}:${x.port}`) ||
			[];
		if (Lavalinks.length >= 1) {
			// Test the first Lavalink node for simplicity
			const [host, port] = Lavalinks[0].split(":");

			return await this.checkTcpConnection(host, parseInt(port));
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
			const response = await axios.get(iHorizonWebsiteURL, {
				timeout: this.timeout
			});
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
		const PublicBot = client;
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
	private checkTcpConnection(
		host: string,
		port: number
	): Promise<ResponseResult> {
		return new Promise((resolve) => {
			const startTime = Date.now();
			const socket = new net.Socket();

			socket.setTimeout(this.timeout);

			socket.on("connect", () => {
				const latency = Date.now() - startTime;
				socket.destroy();
				resolve({
					up: true,
					latency: latency
				});
			});

			socket.on("timeout", () => {
				socket.destroy();
				resolve({
					up: false,
					latency: 0
				});
			});

			socket.on("error", () => {
				socket.destroy();
				resolve({
					up: false,
					latency: 0
				});
			});

			socket.connect(port, host);
		});
	}

	private addPingToHistory(ping: number): void {
		if (ping <= 0 || ping === -1) {
			return;
		}

		const entry: PingHistoryEntry = {
			timestamp: new Date(),
			ping: ping
		};

		this.pingHistory.push(entry);

		if (this.pingHistory.length > this.MAX_PING_HISTORY) {
			this.pingHistory.shift();
		}
	}

	private calculatePingStats(): {
		current: number;
		avg: number;
		max: number;
		min: number;
	} {
		if (this.pingHistory.length === 0) {
			return { current: 0, avg: 0, max: 0, min: 0 };
		}

		const validPings = this.pingHistory.filter((entry) => entry.ping > 0);

		if (validPings.length === 0) {
			return { current: 0, avg: 0, max: 0, min: 0 };
		}

		const current = validPings[validPings.length - 1]?.ping || 0;
		const sum = validPings.reduce((acc, entry) => acc + entry.ping, 0);
		const avg = Math.round(sum / validPings.length);
		const max = Math.max(...validPings.map((entry) => entry.ping));
		const min = Math.min(...validPings.map((entry) => entry.ping));

		return { current, avg, max, min };
	}

	public getAverageWebsocketPing(): number {
		const { avg } = this.calculatePingStats();
		return avg;
	}

	// Method to check all services at once
	public async checkAllServices(): Promise<Record<string, ResponseResult>> {
		const results = await Promise.all([
			this.PublicBot().then((result) => ({ name: "PublicBot", result })),
			this.HorizonGateway().then((result) => ({
				name: "HorizonGateway",
				result
			})),
			this.Lavalink().then((result) => ({ name: "Lavalink", result })),
			this.iHorizonWebsite().then((result) => ({
				name: "iHorizonWebsite",
				result
			}))
		]);

		return results.reduce(
			(acc, { name, result }) => {
				acc[name] = result;
				return acc;
			},
			{} as Record<string, ResponseResult>
		);
	}

	private botService(result: ResponseResult): ServiceView {
		const beats: (ServiceBeat | null)[] = this.pingHistory
			.slice(-BEATS_SHOWN)
			.map((entry) => ({ state: "up", ping: entry.ping }));

		return {
			name: client.user?.username ?? "iHorizon",
			url: null,
			state: result.up ? "up" : "down",
			ping: result.up ? result.latency : null,
			uptime24h: null,
			uptime30d: null,
			beats: [
				...new Array<null>(BEATS_SHOWN - beats.length).fill(null),
				...beats
			]
		};
	}

	// Without Uptime Kuma: one group fed by the checks of this process.
	private localGroup(
		local: Record<string, ResponseResult>,
		lang: LanguageData
	): ServiceGroup {
		const service = (
			name: string,
			result: ResponseResult
		): ServiceView => ({
			name,
			url: null,
			state: result.up ? "up" : "down",
			ping: result.up ? result.latency : null,
			uptime24h: null,
			uptime30d: null,
			beats: new Array<null>(BEATS_SHOWN).fill(null)
		});

		return {
			name: lang.status_panel_group_core,
			services: [
				service(
					lang.status_panel_service_gateway,
					local.HorizonGateway
				),
				service(lang.status_panel_service_lavalink, local.Lavalink),
				service(
					lang.status_panel_service_website,
					local.iHorizonWebsite
				)
			]
		};
	}

	private buildReport(
		bot: ResponseResult,
		kuma: KumaSnapshot | null,
		local: Record<string, ResponseResult> | null,
		lang: LanguageData
	): StatusReport {
		const baseGroups = kuma
			? kuma.groups
			: [this.localGroup(local as Record<string, ResponseResult>, lang)];
		const measured = baseGroups.flatMap((group) => group.services);
		const groups = baseGroups.map((group, index) =>
			index === 0
				? {
						...group,
						services: [this.botService(bot), ...group.services]
					}
				: group
		);
		const services = groups.flatMap((group) => group.services);
		const count = (state: ServiceState) =>
			services.filter((service) => service.state === state).length;
		const down = count("down");

		let overall: OverallState = "operational";
		if (down * 2 >= services.length) overall = "major";
		else if (down > 0) overall = "degraded";
		else if (count("maintenance") > 0) overall = "maintenance";

		const mean = (values: (number | null)[]): number | null => {
			const known = values.filter(
				(value): value is number => value !== null
			);
			return known.length === 0
				? null
				: known.reduce((sum, value) => sum + value, 0) / known.length;
		};
		const roundedMean = (values: (number | null)[]) => {
			const value = mean(values);
			return value === null ? null : Math.round(value);
		};

		const responseSeries = kuma
			? Array.from({ length: BEATS_SHOWN }, (_, index) =>
					roundedMean(
						measured.map((service) => {
							const beat = service.beats[index];
							return beat?.state === "up" ? beat.ping : null;
						})
					)
				)
			: this.botService(bot).beats.map((beat) => beat?.ping ?? null);

		return {
			overall,
			upCount: count("up"),
			totalCount: services.length,
			groups,
			uptime24h: mean(measured.map((service) => service.uptime24h)),
			uptime30d: mean(measured.map((service) => service.uptime30d)),
			averageResponse: roundedMean(
				measured.map((service) => service.ping)
			),
			websocketPing: bot.up ? bot.latency : null,
			responseSeries
		};
	}

	private stateEmoji(state: ServiceState | OverallState): string {
		const emojis = client.iHorizon_Emojis;
		switch (state) {
			case "up":
			case "operational":
				return emojis.Online;
			case "down":
			case "major":
				return emojis.DND;
			case "maintenance":
			case "degraded":
				return emojis.Idle;
			default:
				return emojis.Invisible;
		}
	}

	private serviceRow(
		service: ServiceView,
		lang: LanguageData,
		withLink: boolean
	): string {
		let detail: string;
		switch (service.state) {
			case "up":
				detail = lang.status_panel_row_detail
					.replace(
						"${ping}",
						service.ping === null ? "-" : String(service.ping)
					)
					.replace(
						"${uptime}",
						formatUptime(service.uptime30d ?? service.uptime24h)
					);
				break;
			case "down":
				detail = lang.status_panel_row_offline;
				break;
			case "maintenance":
				detail = lang.status_panel_row_maintenance;
				break;
			default:
				detail = lang.status_panel_row_pending;
		}

		const name = escapeMarkdown(service.name);

		return lang.status_panel_row
			.replace("${status}", this.stateEmoji(service.state))
			.replace(
				"${name}",
				withLink && service.url ? `[${name}](${service.url})` : name
			)
			.replace("${detail}", detail);
	}

	private buildPanel(
		report: StatusReport,
		kuma: KumaSnapshot | null,
		lang: LanguageData,
		hasCard: boolean
	): ContainerBuilder {
		const headline = new TextDisplayBuilder().setContent(
			`${lang.status_panel_title}\n${lang.status_panel_headline
				.replace("${state}", this.stateEmoji(report.overall))
				.replace(
					"${label}",
					lang[`status_panel_label_${report.overall}`]
				)
				.replace("${upCount}", String(report.upCount))
				.replace("${totalCount}", String(report.totalCount))}`
		);
		const container = new ContainerBuilder().setAccentColor(
			parseInt(OVERALL_COLORS[report.overall].slice(1), 16)
		);

		if (kuma) {
			container.addSectionComponents(
				new SectionBuilder()
					.addTextDisplayComponents(headline)
					.setButtonAccessory(
						new ButtonBuilder()
							.setStyle(ButtonStyle.Link)
							.setLabel(lang.status_panel_button)
							.setURL(kuma.pageUrl)
					)
			);
		} else {
			container.addTextDisplayComponents(headline);
		}

		if (hasCard) {
			container.addMediaGalleryComponents(
				new MediaGalleryBuilder().addItems(
					new MediaGalleryItemBuilder().setURL(
						`attachment://${CARD_NAME}`
					)
				)
			);
		}

		for (const incident of kuma?.incidents ?? []) {
			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					lang.status_panel_incident
						.replace("${title}", escapeMarkdown(incident.title))
						.replace(
							"${content}",
							incident.content.slice(0, INCIDENT_MAX_LENGTH)
						)
				)
			);
		}

		const renderGroups = (withLink: boolean) =>
			report.groups.map((group) =>
				[
					lang.status_panel_group.replace(
						"${name}",
						escapeMarkdown(group.name)
					),
					...group.services.map((service) =>
						this.serviceRow(service, lang, withLink)
					)
				].join("\n")
			);

		// A Components V2 message holds 4000 characters at most.
		let groupTexts = renderGroups(true);
		if (groupTexts.join("").length > GROUPS_MAX_LENGTH) {
			groupTexts = renderGroups(false);
		}

		container.addSeparatorComponents(
			new SeparatorBuilder()
				.setDivider(true)
				.setSpacing(SeparatorSpacingSize.Small)
		);
		for (const content of groupTexts) {
			container.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(content)
			);
		}
		container.addSeparatorComponents(
			new SeparatorBuilder()
				.setDivider(true)
				.setSpacing(SeparatorSpacingSize.Small)
		);

		let footer = lang.status_panel_footer.replace(
			"${time}",
			time(new Date(), "R")
		);
		if (!kuma && client.config.uptimeKuma) {
			footer = `${lang.status_panel_kuma_unavailable}\n${footer}`;
		}

		return container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(footer)
		);
	}

	private async botAvatar(): Promise<Buffer | null> {
		try {
			const url = client.user?.displayAvatarURL({
				size: 128,
				extension: "png",
				forceStatic: true
			});
			return url
				? ((await client.func.image64.image64(url)) ?? null)
				: null;
		} catch {
			return null;
		}
	}

	private async updatePanel(
		guildId: string,
		channelData: {
			channel_id?: string;
			guild_id?: string;
			message_id: string;
		},
		render: (
			lang: LanguageData
		) => Promise<{ container: ContainerBuilder; card: Buffer | null }>
	): Promise<void> {
		const channel = await client.channels
			.fetch(channelData.channel_id || channelData.guild_id || "")
			.catch(() => null);
		if (!channel || !channel.isTextBased()) return;

		const message = await (channel as BaseGuildTextChannel).messages
			.fetch(channelData.message_id)
			.catch(() => null);

		if (!message) {
			// The entry is kept at all costs: no delete, no new message.
			logger.warn(
				`[InfrastructureMonitoring] Message ${channelData.message_id} not found in channel ${channelData.channel_id} (guild ${guildId}, shard #${client.shard?.ids[0] ?? 0}, guildCached: ${client.guilds.cache.has(guildId)}), entry kept, retrying in 1 min.`
			);
			return;
		}

		const { container, card } = await render(
			await client.func.getLanguageData(guildId)
		);

		// content and embeds are cleared so a legacy panel converts in place.
		await message.edit({
			content: null,
			embeds: [],
			components: [container],
			files: card
				? [new AttachmentBuilder(card, { name: CARD_NAME })]
				: [],
			attachments: [],
			flags: MessageFlags.IsComponentsV2,
			allowedMentions: { parse: [] }
		});
	}

	public async refresh() {
		try {
			const bot = await this.PublicBot();
			if (bot.up && bot.latency) this.addPingToHistory(bot.latency);

			const panels = Object.entries(
				((await metasTable.get("MISC.statusEmbed")) || {}) as Record<
					string,
					{
						channel_id?: string;
						guild_id?: string;
						message_id: string;
					}
				>
			).filter(([guildId]) => client.inShard(guildId));
			if (panels.length === 0) return;

			const kuma = client.config.uptimeKuma
				? await fetchKumaSnapshot(client.config.uptimeKuma)
				: null;
			const local = kuma ? null : await this.checkAllServices();
			const avatar = await this.botAvatar();

			// One render per language, shared by the panels using it.
			const renders = new Map<
				LanguageData,
				Promise<{ container: ContainerBuilder; card: Buffer | null }>
			>();
			const render = (lang: LanguageData) => {
				let result = renders.get(lang);
				if (!result) {
					result = (async () => {
						const report = this.buildReport(bot, kuma, local, lang);
						const card = await renderStatusCard(
							report,
							lang,
							avatar
						).catch((error) => {
							logger.err(
								`[InfrastructureMonitoring] Status card failed: ${error}`
							);
							return null;
						});
						return {
							card,
							container: this.buildPanel(
								report,
								kuma,
								lang,
								card !== null
							)
						};
					})();
					renders.set(lang, result);
				}
				return result;
			};

			for (const [guildId, channelData] of panels) {
				await this.updatePanel(guildId, channelData, render).catch(
					(error) =>
						logger.err(
							`[InfrastructureMonitoring] Failed to update message ${channelData.message_id} channel ${channelData.channel_id} (guild ${guildId}, shard #${client.shard?.ids[0] ?? 0}, guildCached: ${client.guilds.cache.has(guildId)}, code: ${(error as { code?: unknown })?.code}): ${error}, entry kept, retrying in 1 min.`
						)
				);
			}
		} catch (error) {
			logger.err(`Error in Infrastructure Monitoring refresh: ${error}`);
		}
	}

	// Method to start periodic monitoring
	public async startMonitoring(): Promise<void> {
		// Run initial check
		await this.refresh();

		// Set interval for periodic checks (converted to milliseconds)
		const intervalMs = 60_000;
		setInterval(() => this.refresh(), intervalMs);
	}
}

export { InfrastructureMonitoring, ResponseResult };
