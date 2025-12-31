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

import { ActionRowBuilder, ActionRowData, APIMessageTopLevelComponent, BaseGuildTextChannel, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, JSONEncodable, MessageActionRowComponentBuilder, MessageActionRowComponentData, TextInputStyle, TopLevelComponentData } from 'discord.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';
import maskLink from '../../../core/functions/maskLink.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { tempTable } from '../../../Events/client/ready.js';

export default async function (interaction: ButtonInteraction<"cached">) {

	const confessionId = interaction.customId.split("%")[1];
	const baseData = await interaction.client.db.get(
		`${interaction.guildId}.GUILD.CONFESSION.ALL_CONFESSIONS`
	) as DatabaseStructure.ConfessionSchema["ALL_CONFESSIONS"] | undefined | null;
	if (!baseData) return;

	const lang = await interaction.client.func.getLanguageData(interaction.guildId);

	const allDataConfession = await interaction.client.db.get(`${interaction.guildId}.GUILD.CONFESSION`) as DatabaseStructure.ConfessionSchema;
	const confessionTime = await tempTable.get(`CONFESSION_COOLDOWN.${interaction.user.id}`);

	const timeout = allDataConfession?.cooldown || client.timeCalculator.to_ms("5min");

	if (confessionTime !== null && timeout - (Date.now() - confessionTime) > 0) {
		const time = interaction.client.timeCalculator.to_beautiful_string(timeout - (Date.now() - confessionTime), lang);

		await interaction.reply({
			content: lang.monthly_cooldown_error.replace(/\${time}/g, time),
			flags: [1 << 6]
		});
		return;
	};


	const submitInteraction = await iHorizonModalResolve({
		customId: 'selection_modal',
		title: lang.confession_module_modal_title,
		deferUpdate: true,
		fields: [
			{
				customId: 'case_name',
				label: lang.confession_module_modal_components1_label,
				placeHolder: lang.confession_module_modal_components1_placeholder,
				style: TextInputStyle.Paragraph,
				required: true,
				maxLength: 2500,
				minLength: 2
			}
		]
	}, interaction);

	if (!submitInteraction) return;
	const name = maskLink(submitInteraction.fields.getTextInputValue("case_name"));


	const confessionData = baseData.find(x => x.code === confessionId);
	const embed = new EmbedBuilder()
		.setColor(2829617)
		.setDescription('`' + name + '`')
		.setTimestamp()
		;

	if (confessionData) {
		const message = await interaction.channel?.messages.fetch(confessionData.messageId).catch(() => null);

		message?.thread?.send({
			embeds: [embed]
		})


		const someinfo = await client.db.get(`${interaction.guildId}.GUILD.SERVER_LOGS.confession`);
		if (someinfo) {
			let channel = interaction.guild.channels.cache.get(someinfo) || await interaction.guild.channels.fetch(someinfo).catch(() => null);
			let components: (APIMessageTopLevelComponent | JSONEncodable<APIMessageTopLevelComponent> | TopLevelComponentData | ActionRowData<MessageActionRowComponentData | MessageActionRowComponentBuilder>)[] = [];

			if (!channel) {
				await client.db.delete(`${interaction.guildId}.GUILD.SERVER_LOGS.confession`);
				return;
			}

			let msg = `## ${lang.confession_1_embed_log_title}: ${confessionData.code}
${name}`;

			components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setLabel(lang.userinfo_button_label)
					.setCustomId(`confessionauthor%${interaction.user.id}`)
			));

			let embed = new EmbedBuilder()
				.setColor("#010101")
				.setDescription(msg)
				.setTimestamp()
				;
			(channel as BaseGuildTextChannel).send({ embeds: [embed], components });
		}

	}
};