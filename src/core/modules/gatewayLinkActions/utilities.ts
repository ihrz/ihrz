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

import { ChannelType, PermissionFlagsBits, VoiceChannel } from "discord.js";
import {
	disableTalkMode,
	enableTalkMode,
	syncDerogation
} from "../voiceModes.js";
import { ActionGroup, fail } from "./types.js";

// Talk mode and the night-mode derogation, which only the bot can apply
// (it mutes members, creates a role and edits every channel).
export const utilitiesActions: ActionGroup = {
	// /util untalk ENABLES talk mode (names swapped in the bot): the
	// dashboard picks the channel instead of the author's current one.
	"voice.talk-on": {
		command: "util untalk",
		run: async ({ guild, actor, params, lang }) => {
			const channel = guild.channels.cache.get(params.id("channelId"));
			if (
				!channel ||
				channel.type !== ChannelType.GuildVoice ||
				!channel
					.permissionsFor(actor)
					?.has(PermissionFlagsBits.ViewChannel)
			) {
				return fail("channel not found");
			}
			const r = await enableTalkMode(
				guild,
				channel as VoiceChannel,
				actor,
				lang
			);
			return { channelId: channel.id, ...r };
		}
	},
	"voice.talk-off": {
		command: "util talk",
		run: async ({ guild, actor, lang }) => {
			const own = actor.voice.channel;
			const r = await disableTalkMode(
				guild,
				own?.type === ChannelType.GuildVoice ? own : null,
				actor,
				lang
			);
			if (!r.ok) return fail("talk mode is not active");
			return { channelId: r.channel.id, unmutedCount: r.unmutedCount };
		}
	},
	"utils.derogation": {
		command: "util derogation",
		run: async ({ guild, actor }) => {
			const r = await syncDerogation(guild, actor.user.tag);
			if (!r.ok) {
				return fail(
					"the bot needs Manage Roles and Manage Channels for this"
				);
			}
			return {
				roleId: r.role.id,
				created: r.created,
				missingChannels: r.missingChannels,
				updatedChannels: r.updatedChannels,
				failedChannels: r.failedChannels
			};
		}
	}
};
