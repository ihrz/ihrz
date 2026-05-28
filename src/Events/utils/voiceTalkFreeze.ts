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
	Client,
	PermissionFlagsBits,
	VoiceState,
	ChannelType
} from "discord.js";
import logger from "../../core/logger.js";
import { BotEvent } from "../../../types/event.js";

export const event: BotEvent = {
	name: "voiceStateUpdate",
	run: async (client: Client, oldState: VoiceState, newState: VoiceState) => {
		if (oldState.channelId === newState.channelId) return;

		const guildId = newState.guild.id;
		const talkData = (await client.db.get(
			`${guildId}.UTILS.VOICE_TALK`
		)) as { channelId?: string } | null;
		const freezeData = (await client.db.get(
			`${guildId}.UTILS.VOICE_FREEZE`
		)) as { channelId?: string; allowedUsers?: string[] } | null;

		if (talkData?.channelId) {
			if (
				oldState.channelId === talkData.channelId &&
				newState.channelId !== talkData.channelId &&
				oldState.member &&
				!oldState.member.user.bot &&
				oldState.serverMute
			) {
				try {
					await oldState.member.voice.setMute(
						false,
						"talk leave cleanup"
					);
				} catch (error) {
					logger.err(error);
				}
			}

			if (
				newState.channelId === talkData.channelId &&
				oldState.channelId !== talkData.channelId &&
				newState.member
			) {
				const member = newState.member;
				const canBypass =
					member.user.bot ||
					member.permissions.has(PermissionFlagsBits.Administrator) ||
					member.permissions.has(PermissionFlagsBits.ManageChannels);

				if (!canBypass && !newState.serverMute) {
					try {
						await member.voice.setMute(true, "talk join auto mute");
					} catch (error) {
						logger.err(error);
					}
				}
			}
		}

		if (freezeData?.channelId) {
			const frozenChannel =
				newState.guild.channels.cache.get(freezeData.channelId) ||
				(await newState.guild.channels
					.fetch(freezeData.channelId)
					.catch(() => null));

			if (
				!frozenChannel ||
				frozenChannel.type !== ChannelType.GuildVoice
			) {
				await client.db.delete(`${guildId}.UTILS.VOICE_FREEZE`);
				return;
			}

			if (frozenChannel.members.size === 0) {
				await client.db.delete(`${guildId}.UTILS.VOICE_FREEZE`);
				return;
			}

			if (
				newState.channelId === freezeData.channelId &&
				oldState.channelId !== freezeData.channelId &&
				newState.member
			) {
				const member = newState.member;
				const canBypass =
					member.user.bot ||
					member.permissions.has(PermissionFlagsBits.Administrator) ||
					member.permissions.has(
						PermissionFlagsBits.ManageChannels
					) ||
					freezeData.allowedUsers?.includes(member.id);

				if (
					!canBypass &&
					member.voice.channelId === freezeData.channelId
				) {
					try {
						await member.voice.setChannel(
							null,
							"voice freeze enforcement"
						);
						member.timeout(5000);
					} catch (error) {
						logger.err(error);
					}
				}
			}
		}
	}
};
