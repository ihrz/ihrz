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

import {
	Client,
	EmbedBuilder,
	ApplicationCommandOptionType,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	ChatInputCommandInteraction,
	GuildMember,
	ApplicationCommandType,
	Message
} from 'discord.js'

import { format } from '../../../core/functions/date_and_time.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { blacklistTable, ownerTable } from '../../../Events/client/ready.js';

export const command: Command = {
	name: 'bledit',

	description: 'edit blacklist reaso',
	description_localizations: {
		"fr": "modifier la raison d'un blacklist"
	},

	options: [
		{
			name: 'user',
			type: ApplicationCommandOptionType.User,

			description: 'The user you want to edit the reason',
			description_localizations: {
				"fr": "L'utilisateur que vous souhaitez modifier la raison de sont blacklist"
			},

			required: true,

			permission: null
		},
		{
			name: "new_reason",
			type: ApplicationCommandOptionType.String,

			description: "the new reason",
			description_localizations: {
				"fr": "la nouvelle raison"
			},

			permission: null,
			required: true
		}
	],

	aliases: ["blacklistedit", "editbl"],

	thinking: false,
	category: 'owner',
	type: ApplicationCommandType.ChatInput,
	permission: null,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var user = interaction.options.getUser('user', true);
			var newReason = "iHorizon Project Blacklist - " + interaction.options.getString("new_reason", true);
		} else {
			var user = (await client.func.method.user(interaction, args!, 0))!;
			var newReason = "iHorizon Project Blacklist - " + client.func.method.longString(args!, 1)!;
		};

		if (!await ownerTable.get(`${interaction.member.user.id}.owner`)) {
			await client.func.method.interactionSend(interaction, { content: lang.unblacklist_not_blacklisted.replace("${member.id}", user.id) });
			return;
		};

		if (client.config.owner.ownerid1 === user?.id || client.config.owner.ownerid2 === user?.id) {
			await client.func.method.interactionSend(interaction, { content: lang.unblacklist_not_blacklisted.replace("${member.id}", user.id) });
			return;
		};

		await blacklistTable.set(`${user.id}.reason`, newReason);

		const userObj = await blacklistTable.get(user.id);

		if (!userObj) {
			await client.func.method.interactionSend(interaction, { content: lang.unblacklist_not_blacklisted.replace("${member.id}", user.id) });
			return;
		}

		await client.func.method.interactionSend(interaction, {
			embeds: [
				new EmbedBuilder()
					.setColor("#2E2EFE")
					.setDescription(`<@${user.id}> (${user.username})\n├─ ${userObj.createdAt !== undefined ? format(new Date(userObj.createdAt), 'MMM DD YYYY') : lang.profil_unknown}\n├─ \`${userObj.reason || lang.blacklist_var_no_reason}\`\n├─ By ${userObj.owner || lang.profil_unknown}`)
					.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!))
					.setTimestamp()
			],
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
		});
	},
};