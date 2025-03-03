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

import { ChannelType, Client, TextChannel, VoiceBasedChannel } from "discord.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import formatNumber from "../functions/numberBeautifuer.js";
import logger from "../logger.js";

type memberCountData = { guildId: string, data: DatabaseStructure.MemberCountSchema | undefined }[];

class MemberCountModule {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	async init() {
		this.Refresh(await this.GetMemberCountData());
		setInterval(async () => {
			this.Refresh(await this.GetMemberCountData());
		}, 60_000 * 5);
	}

	private async GetMemberCountData(): Promise<memberCountData> {
		const all = await this.client.db.all();
		return all
			.filter(v => Number(v.id))
			.map(v => {
				const guildObject = v.value as DatabaseStructure.DbInId;
				return { guildId: v.id, data: guildObject.GUILD?.MCOUNT };
			})
			.filter(v => v.data);
	}

	private async Refresh(memberCountData: memberCountData) {
		for (let guildObject of memberCountData) {
			try {
				const guild = this.client.guilds.cache.get(guildObject.guildId);
				if (!guild) continue;

				const onlineCount = guild.members.cache
					.filter(member =>
						member.presence?.status === 'online' ||
						member.presence?.status === 'idle' ||
						member.presence?.status === 'dnd'
					).size;
				const botMembersCount = guild.members.cache.filter((m) => m.user.bot).size;
				const rolesCount = guild.roles.cache.size;
				const boostsCount = guild.premiumSubscriptionCount || 0;
				const voiceChannels = guild.channels.cache
					.filter((channel): channel is VoiceBasedChannel =>
						channel.type === ChannelType.GuildVoice ||
						channel.type === ChannelType.GuildStageVoice
					)
					.toJSON();

				let voiceCount = 0;
				voiceChannels.forEach((channel) => {
					if ('members' in channel) {
						voiceCount += channel.members?.size ?? 0;
					}
				});

				const baseData = guildObject.data;
				if (!baseData) continue;

				const mappings: { key: keyof DatabaseStructure.MemberCountSchema, count: number | string }[] = [
					{ key: 'bot', count: botMembersCount },
					{ key: 'member', count: formatNumber(guild.memberCount) },
					{ key: 'roles', count: rolesCount },
					{ key: 'boost', count: boostsCount },
					{ key: 'channel', count: rolesCount },
					{ key: "voice", count: voiceCount },
					{ key: "online", count: onlineCount }
				];

				for (const { key, count } of mappings) {
					const data = baseData[key];
					if (data) {
						const channel = guild.channels.cache.get(data.channel!) as TextChannel;
						if (channel && channel.isTextBased()) {
							const newName = data.name
								?.replace(/{\w+Count}/, String(count))
								?.replace(/{\w+count}/, String(count));
							await channel.edit({ name: newName });
						}
					}
				}
			} catch (error) {
				logger.err('Error handling guildMemberAdd event:' + error as any);
			}
		}
	}

}

export {
	MemberCountModule
}