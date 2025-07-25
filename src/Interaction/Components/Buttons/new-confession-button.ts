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

import { BaseGuildTextChannel, ButtonInteraction, EmbedBuilder, TextInputStyle, SnowflakeUtil, MessageReplyOptions } from 'discord.js';
import { iHorizonModalResolve } from '../../../core/functions/modalHelper.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { generatePassword } from '../../../core/functions/random.js'
import maskLink from '../../../core/functions/maskLink.js';

export default async function (interaction: ButtonInteraction<"cached">) {

	/**
	 * Why doing this?
	 * On iHorizon Production, we have some ~problems~ 👎
	 * All of the guildMemberAdd, guildMemberRemove sometimes emiting in double, triple, or quadruple.
	 */
	const nonce = SnowflakeUtil.generate().toString();

	if (await interaction.client.db.get(
		`${interaction.guildId}.GUILD.CONFESSION.disable`
	)) return;

	const allDataConfession = await interaction.client.db.get(`${interaction.guildId}.GUILD.CONFESSION`) as DatabaseStructure.ConfessionSchema;
	const confessionTime = await (await interaction.client.db.table('TEMP')).get(`CONFESSION_COOLDOWN.${interaction.user.id}`);
	const lang = await interaction.client.func.getLanguageData(interaction.guildId);

	const timeout = allDataConfession.cooldown!;
	const panel = allDataConfession.panel;

	if (confessionTime !== null && timeout - (Date.now() - confessionTime) > 0) {
		const time = interaction.client.timeCalculator.to_beautiful_string(timeout - (Date.now() - confessionTime), lang);

		await interaction.reply({
			content: lang.monthly_cooldown_error.replace(/\${time}/g, time),
			flags: [1 << 6]
		});
		return;
	};

	const channel = interaction.guild?.channels.cache.get(panel?.channelId!);

	if (panel?.channelId !== interaction.channelId || panel?.messageId !== interaction.message.id) {
		return;
	}

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
			},
			{
				customId: 'case_private',
				label: lang.confession_module_modal_components2_label,
				placeHolder: `${lang.mybot_submit_utils_msg_yes} / ${lang.mybot_submit_utils_msg_no}`,
				style: TextInputStyle.Short,
				required: true,
				minLength: 2,
				maxLength: 8,
			},
		]
	}, interaction);

	if (!submitInteraction) return;

	const name = maskLink(submitInteraction.fields.getTextInputValue("case_name"));
	let view: string | boolean = submitInteraction.fields.getTextInputValue("case_private");
	const code = generatePassword({ length: 6, numbers: true, lowercase: true });

	const body: {
		embeds: EmbedBuilder[],
		files: { attachment: Buffer | string, name: string }[],
		enforceNonce: boolean,
		nonce: string
	} = {
		embeds: [],
		files: [],
		enforceNonce: true,
		nonce: nonce
	}

	const embed = new EmbedBuilder()
		.setColor(2829617)
		.setDescription(`### ${lang.help_confession_fields} #${code}\n\n` + '`' + name + '`')
		.setTimestamp()
		;

	if (view.toLowerCase().includes('no') || view.toLowerCase().includes(lang.mybot_submit_utils_msg_no)) {
		view = false;

		body.files.push({ attachment: interaction.user.avatarURL({ size: 512 })!, name: "user_icon.png" });

		embed.setFooter({
			text: interaction.user.globalName || interaction.user.username,
			iconURL: "attachment://user_icon.png"
		});
	} else if (view.toLowerCase().includes(lang.mybot_submit_utils_msg_yes)) {
		view = true;
	} else {
		view = false;
	}

	(body.embeds as EmbedBuilder[]).push(embed);
	await (channel as BaseGuildTextChannel).send(body);

	await interaction.client.db.push(`${interaction.guildId}.GUILD.CONFESSION.ALL_CONFESSIONS`, {
		code: code,
		userId: interaction.user.id,
		timestamp: Date.now(),
		private: view,
	});

	await (await interaction.client.db.table('TEMP')).set(`CONFESSION_COOLDOWN.${interaction.user.id}`, Date.now());

	const panelMessage = await interaction.channel?.messages.fetch(allDataConfession.panel?.messageId!);
	const embedFromPanelMessage = panelMessage?.embeds[0];
	const compFromPanelMessage = panelMessage?.components[0];

	await panelMessage?.delete();

	const newPanelFromOldData: MessageReplyOptions = {
		embeds: [EmbedBuilder.from(embedFromPanelMessage!).setFooter(await interaction.client.func.displayBotName.footerBuilder(interaction.guildId!))], components: [compFromPanelMessage!],
		files: [await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)]
	};

	interaction.client.func.method.channelSend(interaction.message, newPanelFromOldData).then(async (msg) => {
		const messageId = msg.id;
		const channelId = msg.channelId;

		await msg.client.db.set(`${interaction.guildId}.GUILD.CONFESSION.panel`, {
			channelId,
			messageId
		});
	})
	return;
};
