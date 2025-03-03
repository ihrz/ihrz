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
	EmbedBuilder,
	GuildMember,
	InteractionEditReplyOptions,
	Message,
	MessagePayload,
	MessageReplyOptions,
	PermissionFlagsBits,
	time,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { generateTagInfoEmbed } from './tag.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var current_tag_name = interaction.options.getString("current_tag_name", true);
			var new_tag_name = interaction.options.getString("new_tag_name", true);
		} else {
			var current_tag_name = client.func.method.string(args!, 0)!;
			var new_tag_name = client.func.method.string(args!, 1)!;
		}

		let baseData = await client.db.get(`${interaction.guildId}.GUILD.TAGS.storedTags.${current_tag_name}`) as DatabaseStructure.TagInfo | undefined;

		// check if there are no tags

		if (!baseData) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tag_doesnt_exist
					.replace("${tag_name}", current_tag_name)
			});
			return;
		}

		// check if the member have admin perm of are the tag's owner

		if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && baseData.createBy !== interaction.member.user.id) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tag_edit_error_perm
			})
		}

		await client.db.delete(`${interaction.guildId}.GUILD.TAGS.storedTags.${current_tag_name}`);
		await client.db.set(`${interaction.guildId}.GUILD.TAGS.storedTags.${new_tag_name}`, baseData);

		await client.func.method.interactionSend(interaction, {
			content: `The current tag name are now modified by **\`${current_tag_name}\`** to **\`${new_tag_name}\`**`
		});
		return;
	},
};