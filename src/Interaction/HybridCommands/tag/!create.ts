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
	ChatInputCommandInteraction,
	Client,
	GuildMember,
	InteractionEditReplyOptions,
	Message,
	MessagePayload,
	MessageReplyOptions,
	PermissionFlagsBits,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		// Check if the user is allowed to use the command
		let baseData = await client.db.get(`${interaction.guildId}.GUILD.TAGS`) as DatabaseStructure.GuildTagsStructure | undefined;

		if (interaction instanceof ChatInputCommandInteraction) {
			var tag_name = interaction.options.getString("tag_name", true);
			var embed_id = interaction.options.getString("embed_id", true);
		} else {
			var tag_name = client.func.method.string(args!, 0)!;
			var embed_id = client.func.method.string(args!, 1)!;
		}

		tag_name = tag_name.trim();

		let is_in_wl = interaction.member.roles.cache.some(role => baseData?.whitelist_create?.includes(role.id))

		if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !is_in_wl) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tag_create_not_permited
			});
			return;
		}

		if (tag_name.length > 16 || tag_name.includes(" ")) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tag_create_not_good_name
			});
			return;
		}

		if (baseData?.storedTags?.[tag_name]) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tag_create_already_exist
			});
			return;
		}

		// Check if the embed exists
		let embed = await client.db.get(`EMBED.${embed_id}`);

		if (!embed) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tag_create_embed_doesnt_exist
			});
			return;
		}

		await client.db.set(`${interaction.guildId}.GUILD.TAGS.storedTags.${tag_name}`, {
			embedId: embed_id,
			createBy: interaction.member.id,
			createTimestamp: Date.now(),
			uses: 0,
			lastUseTimestamp: Date.now(),
			lastUseBy: null,
		});

		await client.func.method.interactionSend(interaction, {
			content: lang.tag_create_command_work
				.replace("${tag_name}", tag_name)
		});
		return;
	},
};