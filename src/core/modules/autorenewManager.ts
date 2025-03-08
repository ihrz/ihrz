/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { BaseGuildTextChannel, Client, time } from "discord.js";
import { DatabaseStructure } from "../../../types/database_structure.js";

type AutorenewData = {
	guildId: string,
	data: DatabaseStructure.UtilsData["renew_channel"] | undefined
}[];

class AutoRenew {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	public async init() {
		try {
			await this.Refresh(await this.GetAutoRenewData());
			setInterval(async () => {
				try {
					await this.Refresh(await this.GetAutoRenewData());
				} catch (error) {
					console.error('Error in AutoRenew interval:', error);
				}
			}, 30_000);
		} catch (error) {
			console.error('Error initializing AutoRenew:', error);
		}
	}

	private async GetAutoRenewData(): Promise<AutorenewData> {
		try {
			const all = await this.client.db.all();
			return all
				.filter(v => Number(v.id))
				.map(v => {
					const guildObject = v.value as DatabaseStructure.DbInId;
					return { guildId: v.id, data: guildObject.UTILS?.renew_channel };
				});
		} catch (error) {
			return [];
		}
	}

	private async Refresh(autoRenewData: AutorenewData) {
		for (const guildObject of autoRenewData) {
			if (!guildObject.data) continue;

			try {
				const guild = await this.client.guilds.fetch(guildObject.guildId);
				const lang = await this.client.func.getLanguageData(guildObject.guildId);
				const all_channels = Object.entries(guildObject.data);

				for (const [channelId, data] of all_channels) {
					try {
						const halfTime = data.maxTime / 2;
						const currentTime = Date.now();
						const timeElapsed = currentTime - data.timestamp;

						const isHalfTimeWindow = Math.abs(timeElapsed - halfTime) < 15_000;

						if (timeElapsed >= data.maxTime) {
							const channel = await guild.channels.fetch(channelId) as BaseGuildTextChannel | null;

							if (!channel) {
								await this.client.db.delete(`${guild.id}.UTILS.renew_channel.${channelId}`);
								continue;
							}

							const newChannel = await channel.clone({
								name: channel.name,
								parent: channel.parent,
								permissionOverwrites: channel.permissionOverwrites.cache,
								nsfw: channel.nsfw,
								reason: `Channel re-create by Auto-Renew`
							});

							if (newChannel) {
								await Promise.all([
									this.client.db.set(`${guild.id}.UTILS.renew_channel.${newChannel.id}`, {
										timestamp: currentTime,
										maxTime: data.maxTime
									}),
									this.client.db.delete(`${guild.id}.UTILS.renew_channel.${channel.id}`),
									newChannel.setPosition(channel.rawPosition),
									channel.delete()
								]);

								await newChannel.send({
									content: lang.event_autorenew_channel_renewed
								}).catch(() => false);
							}
						} else if (isHalfTimeWindow) {
							const channel = await guild.channels.fetch(channelId) as BaseGuildTextChannel | null;

							if (!channel) {
								await this.client.db.delete(`${guild.id}.UTILS.renew_channel.${channelId}`);
								continue;
							}

							await channel.send({
								content: lang.event_autorenew_channel_warning
									.replace("${time}", time(new Date(data.timestamp + data.maxTime), "R"))
							})
								.then(x => {
									if (x.pinnable) x.pin();
								})
								.catch(() => false);
						}
					} catch (error) {
						await this.client.db.delete(`${guild.id}.UTILS.renew_channel.${channelId}`);
					}
				}
			} catch { }
		}
	}
}

export { AutoRenew };