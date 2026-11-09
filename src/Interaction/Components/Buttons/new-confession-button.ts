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
	BaseGuildTextChannel,
	ButtonInteraction,
	EmbedBuilder,
	TextInputStyle,
	SnowflakeUtil,
	MessageReplyOptions,
	ButtonBuilder,
	ButtonStyle,
	APIMessageTopLevelComponent,
	ActionRowData,
	JSONEncodable,
	MessageActionRowComponentBuilder,
	MessageActionRowComponentData,
	TopLevelComponentData,
	ActionRowBuilder
} from "discord.js";
import { iHorizonModalResolve } from "../../../core/functions/modalHelper.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
import { generatePassword } from "../../../core/functions/random.js";
import maskLink from "../../../core/functions/maskLink.js";
import { tempTable } from "../../../Events/client/ready.js";

export default async function (interaction: ButtonInteraction<"cached">) {
	/**
	 * Why doing this?
	 * On iHorizon Production, we have some ~problems~ 👎
	 * All of the guildMemberAdd, guildMemberRemove sometimes emiting in double, triple, or quadruple.
	 */
	const nonce = SnowflakeUtil.generate().toString();

	if (
		await interaction.client.db.get(
			`${interaction.guildId}.GUILD.CONFESSION.disable`
		)
	)
		return;

	const allDataConfession = (await interaction.client.db.get(
		`${interaction.guildId}.GUILD.CONFESSION`
	)) as DatabaseStructure.ConfessionSchema;
	const confessionTime = await tempTable.get(
		`CONFESSION_COOLDOWN.${interaction.guildId}.${interaction.user.id}`
	);
	const lang = await interaction.client.func.getLanguageData(
		interaction.guildId
	);

	const timeout =
		allDataConfession?.cooldown || client.timeCalculator.to_ms("5min");
	const panel = allDataConfession.panel;

	if (
		confessionTime !== null &&
		timeout - (Date.now() - confessionTime) > 0
	) {
		const time = interaction.client.timeCalculator.to_beautiful_string(
			timeout - (Date.now() - confessionTime),
			lang
		);

		await interaction.reply({
			content: lang.monthly_cooldown_error.replaceAll("${time}", time),
			flags: [1 << 6]
		});
		return;
	}

	const channel = interaction.guild?.channels.cache.get(panel?.channelId!);

	if (
		panel?.channelId !== interaction.channelId ||
		panel?.messageId !== interaction.message.id
	) {
		return;
	}

	const submitInteraction = await iHorizonModalResolve(
		{
			customId: "selection_modal",
			title: lang.confession_module_modal_title,
			deferUpdate: true,
			fields: [
				{
					customId: "case_name",
					label: lang.confession_module_modal_components1_label,
					placeHolder:
						lang.confession_module_modal_components1_placeholder,
					style: TextInputStyle.Paragraph,
					required: true,
					maxLength: 2500,
					minLength: 2
				},
				{
					type: "checkbox",
					customId: "case_private",
					label: lang.confession_module_modal_components2_label,
					default: true
				}
			]
		},
		interaction
	);

	if (!submitInteraction) return;

	const name = maskLink(
		submitInteraction.fields.getTextInputValue("case_name")
	);
	let view: boolean = submitInteraction.fields.getCheckbox("case_private");
	const code = generatePassword({
		length: 6,
		numbers: true,
		lowercase: true
	});

	const body: {
		embeds: EmbedBuilder[];
		files: { attachment: Buffer | string; name: string }[];
		enforceNonce: boolean;
		nonce: string;
		components: (
			| APIMessageTopLevelComponent
			| JSONEncodable<APIMessageTopLevelComponent>
			| TopLevelComponentData
			| ActionRowData<
					| MessageActionRowComponentData
					| MessageActionRowComponentBuilder
			  >
		)[];
	} = {
		embeds: [],
		files: [],
		enforceNonce: true,
		components: [],
		nonce: nonce
	};

	const embed = new EmbedBuilder()
		.setColor(2829617)
		.setDescription(
			`### ${lang.help_confession_fields} #${code}\n\n` + "`" + name + "`"
		)
		.setTimestamp();
	if (!view) {
		view = false;

		body.files.push({
			attachment: interaction.user.displayAvatarURL({
				size: 512,
				extension: "png"
			}),
			name: "user_icon.png"
		});

		embed.setFooter({
			text: interaction.user.globalName || interaction.user.username,
			iconURL: "attachment://user_icon.png"
		});
	} else if (view) {
		view = true;
	} else {
		view = false;
	}

	allDataConfession.thread === "yes" &&
		(async () => {
			const respondButton = new ButtonBuilder()
				.setStyle(ButtonStyle.Secondary)
				.setLabel(lang.confession_channel_button_name)
				.setCustomId(`confessionres%${code}`);

			body.components.push(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					respondButton
				)
			);
		})();

	body.embeds.push(embed);
	const msg = await (channel as BaseGuildTextChannel).send(body);
	let threadChannel: string | null = null;

	if (allDataConfession.thread === "yes") {
		const thread = await msg
			.startThread({
				name: `${lang.help_confession_fields} #${code}`,
				reason: "[Confession] Module"
			})
			.catch(() => null);

		if (thread) {
			threadChannel = thread.id;
			thread
				.edit({ invitable: true, locked: false, archived: false })
				.catch(() => {});
		}
	}

	await interaction.client.db.push(
		`${interaction.guildId}.GUILD.CONFESSION.ALL_CONFESSIONS`,
		{
			code: code,
			userId: interaction.user.id,
			timestamp: Date.now(),
			private: view,
			threadChannel,
			messageId: msg.id
		}
	);

	await tempTable.set(
		`CONFESSION_COOLDOWN.${interaction.guildId}.${interaction.user.id}`,
		Date.now()
	);

	// The panel may have been reposted while the modal was open: read its
	// current id, and let only the confession that really deleted it repost it.
	const currentPanel = (await interaction.client.db.get(
		`${interaction.guildId}.GUILD.CONFESSION.panel`
	)) as DatabaseStructure.ConfessionSchema["panel"] | null;
	const panelMessage = currentPanel
		? await interaction.channel?.messages
				.fetch(currentPanel.messageId)
				.catch(() => null)
		: null;
	const panelDeleted = await panelMessage
		?.delete()
		.then(() => true)
		.catch(() => false);

	if (panelMessage && panelDeleted) {
		const newPanelFromOldData: MessageReplyOptions = {
			embeds: [
				EmbedBuilder.from(panelMessage.embeds[0]).setFooter(
					await interaction.client.func.displayBotName.footerBuilder(
						interaction.guildId!
					)
				)
			],
			components: [panelMessage.components[0]],
			files: [
				await interaction.client.func.displayBotName.footerAttachmentBuilder(
					interaction
				)
			]
		};

		interaction.client.func.method
			.channelSend(interaction.message, newPanelFromOldData)
			.then(async (msg) => {
				const messageId = msg.id;
				const channelId = msg.channelId;

				await msg.client.db.set(
					`${interaction.guildId}.GUILD.CONFESSION.panel`,
					{
						channelId,
						messageId
					}
				);
			})
			.catch((error) =>
				logger.err(`[Confession] Panel repost failed: ${error}`)
			);
	}

	const someinfo = await client.db.get(
		`${interaction.guildId}.GUILD.SERVER_LOGS.confession`
	);
	if (someinfo) {
		let channel =
			interaction.guild.channels.cache.get(someinfo) ||
			(await interaction.guild.channels
				.fetch(someinfo)
				.catch(() => null));
		let components: (
			| APIMessageTopLevelComponent
			| JSONEncodable<APIMessageTopLevelComponent>
			| TopLevelComponentData
			| ActionRowData<
					| MessageActionRowComponentData
					| MessageActionRowComponentBuilder
			  >
		)[] = [];

		if (!channel) {
			await client.db.delete(
				`${interaction.guildId}.GUILD.SERVER_LOGS.confession`
			);
			return;
		}

		let msg = `## ${lang.confession_embed_logs_title}: ${code}
${name}`;

		components.push(
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setCustomId(`confessionauthor%${interaction.user.id}`)
					.setLabel(lang.userinfo_button_label)
			)
		);

		let embed = new EmbedBuilder()
			.setColor("#010101")
			.setDescription(msg)
			.setTimestamp();
		(channel as BaseGuildTextChannel).send({ embeds: [embed], components });
	}

	return;
}
