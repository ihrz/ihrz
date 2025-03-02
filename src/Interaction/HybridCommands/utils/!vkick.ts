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

import {
	Client,
	ApplicationCommandOptionType,
	EmbedBuilder,
	PermissionsBitField,
	ChatInputCommandInteraction,
	ApplicationCommandType,
	Message,
	MessagePayload,
	InteractionEditReplyOptions,
	MessageReplyOptions,
	GuildMember,
	GuildChannel,
	VoiceBasedChannel,
	PermissionFlagsBits,
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[],
	) => {
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var user = interaction.options.getMember("member")!;
		} else {
			var user = client.func.method.member(interaction, args!, 0)!;
		}

		// Check if member is in the guild
		if (!interaction.guild.members.cache.get(user.id)) {
			await client.func.method.interactionSend(interaction, {
				content: lang.vkick_member_not_in_guild,
			});
		}

		// Get instance of GuildMember
		let member = interaction.guild.members.cache.get(user.id) as GuildMember;

		// Check if member is in a voice channel
		if (member.voice.channelId === null) {
			await client.func.method.interactionSend(interaction, {
				content: lang.vkick_not_in_vc, // draft
			});
		}

		// Check if the member is an admin
		if (member.permissions.has(PermissionFlagsBits.Administrator)) {
			await client.func.method.interactionSend(interaction, {
				content: lang.vkick_not_admin_kick, // draft
			});
		}

		// So, let's fetch the voice channel
		let voiceChannel = member.voice.channel;

		// So , let's kick from the voice channel the member
		await member.voice.setChannel(null);

		// Emit a logs in the ihorizon-logs

		await client.func.ihorizon_logs(interaction, {
			title: lang.vkick_logEmbed_title,
			description: lang.vkick_logEmbed_desc
				.replace("${interaction.member.user.toString()}", interaction.member.user.toString())
				.replace("${member.toString()}", member.toString())
				.replace("${voiceChannel?.toString()}", voiceChannel?.toString()!),
		});

		await client.func.method.interactionSend(interaction, {
			content: lang.vkick_command_work
				.replace("${member.toString()}", member.toString())
				.replace("${interaction.member.user.toString()}", interaction.member.user.toString())
				.replace("${voiceChannel?.toString()}", voiceChannel?.toString()!),
		});
		return;
	},
};
