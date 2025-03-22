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
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	PermissionsBitField,
} from 'discord.js';
import { changeRoleAuthRestore, getGuildDataPerSecretCode } from '../../../core/functions/authRestoreHelper.js';
import { LanguageData } from '../../../../types/languageData.js';

import { Command } from '../../../../types/command.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {

		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

		const secretCode = interaction.options.getString("key")!;
		const role = interaction.options.getRole("roles")!;

		const table = client.db.table("AUTHRESTORE");
		const data = getGuildDataPerSecretCode(await table.all(), secretCode);

		if (!data) return client.func.method.interactionSend(interaction, {
			content: lang.rc_key_doesnt_exist
				.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
				.replace("${secretCode}", secretCode),
			flags: [1 << 6]
		});

		await changeRoleAuthRestore({ guildId: interaction.guildId!, apiToken: client.config.api.apiToken, roleId: role.id });

		let footer = await client.func.displayBotName.footerBuilder(interaction);

		const mainEmbed = new EmbedBuilder()
			.setColor(2829617)
			.setTitle(lang.rc_role_embed_title)
			.setFields(
				{ name: lang.rc_role_embed_field1_name, value: role.toString(), inline: true },
			)
			.setFooter(footer);

		await client.func.method.interactionSend(interaction, {
			embeds: [mainEmbed],
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
		});
		return;
	}
};