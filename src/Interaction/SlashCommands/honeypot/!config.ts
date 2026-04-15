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
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Guild,
	PermissionFlagsBits,
	StringSelectMenuBuilder,
	TextChannel,
} from 'discord.js';

import { DatabaseStructure } from '../../../../types/database_structure.js';
import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';

const HONEYPOT_EMBED_COLOR = "#D88A3D";
const HONEYPOT_SOURCE_URL = "https://github.com/RiskyMH/honeypot";

function getDefaultHoneypotConfig(guild: Guild): DatabaseStructure.HoneypotSchema {
	return {
		enabled: false,
		action: 'none',
		createdBy: guild.ownerId,
		lastTriggeredAt: 0,
	};
}

async function canManageHoneypot(
	client: Client,
	interaction: ChatInputCommandInteraction<"cached">
): Promise<boolean> {
	if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
		return true;
	}

	const allowlist = await client.db.get(`${interaction.guildId}.ALLOWLIST`) as DatabaseStructure.AllowListData | null;
	return allowlist?.list?.[interaction.user.id]?.allowed === true;
}

function getActionLabel(action: DatabaseStructure.HoneypotSchema["action"], lang: LanguageData): string {
	switch (action) {
		case 'ban':
			return lang.setjoinroles_var_perm_ban_members;
		case 'kick':
			return lang.setjoinroles_var_perm_kick_members;
		default:
			return lang.honeypot_action_none;
	}
}

function buildTrapEmbed(lang: LanguageData): EmbedBuilder {
	return new EmbedBuilder()
		.setColor(HONEYPOT_EMBED_COLOR)
		.setThumbnail("https://www.ihorizon.org/assets/img/honeypot.png")
		.setTitle(lang.honeypot_trap_embed_title)
		.setDescription(lang.honeypot_trap_embed_desc)
		.setFooter({ text: lang.honeypot_trap_embed_footer });
}

async function ensureTrapChannel(
	guild: Guild,
	config: DatabaseStructure.HoneypotSchema,
	lang: LanguageData
): Promise<TextChannel | null> {
	if (config.channelId) {
		const existingChannel = await guild.channels.fetch(config.channelId).catch(() => null);
		if (existingChannel instanceof TextChannel) {
			return existingChannel;
		}
	}

	const createdChannel = await guild.channels.create({
		name: lang.honeypot_default_channel_name,
		type: ChannelType.GuildText,
		reason: "Honeypot automatic setup",
	}).catch(() => null);

	if (!(createdChannel instanceof TextChannel)) {
		return null;
	}

	await createdChannel.setPosition(0).catch(() => { });
	config.channelId = createdChannel.id;
	return createdChannel;
}

async function sendTrapEmbed(
	guild: Guild,
	config: DatabaseStructure.HoneypotSchema,
	lang: LanguageData
): Promise<TextChannel | null> {
	const channel = await ensureTrapChannel(guild, config, lang);

	if (!channel) {
		return null;
	}

	if (config.messageId) {
		const previousMessage = await channel.messages.fetch(config.messageId).catch(() => null);
		await previousMessage?.delete().catch(() => { });
	}

	const sentMessage = await channel.send({ embeds: [buildTrapEmbed(lang)] }).catch(() => null);

	if (!sentMessage) {
		return null;
	}

	config.channelId = channel.id;
	config.messageId = sentMessage.id;
	return channel;
}

async function buildConfigEmbed(
	client: Client,
	interaction: ChatInputCommandInteraction<"cached">,
	config: DatabaseStructure.HoneypotSchema,
	lang: LanguageData
): Promise<EmbedBuilder> {
	const messageValue = config.messageId && config.channelId
		? client.func.getMessageURL(interaction.guildId!, config.channelId, config.messageId)
		: lang.var_none;

	return new EmbedBuilder()
		.setColor(HONEYPOT_EMBED_COLOR)
		.setTitle(lang.honeypot_config_embed_title)
		.setDescription(lang.honeypot_config_embed_desc)
		.setThumbnail("https://www.ihorizon.org/assets/img/honeypot.png")
		.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!))
		.addFields(
			{ name: lang.honeypot_config_embed_field_status, value: config.enabled ? lang.var_enabled : lang.var_disabled, inline: true },
			{ name: lang.honeypot_config_embed_field_action, value: getActionLabel(config.action, lang), inline: true },
			{ name: lang.honeypot_config_embed_field_trap_channel, value: config.channelId ? `<#${config.channelId}>` : lang.var_none, inline: true },
			{ name: lang.honeypot_config_embed_field_logs_channel, value: config.logsChannelId ? `<#${config.logsChannelId}>` : lang.var_none, inline: true },
			{ name: lang.honeypot_config_embed_field_message, value: messageValue, inline: false },
			{ name: lang.honeypot_config_embed_field_notes, value: lang.honeypot_config_notes_value, inline: false },
			{ name: lang.honeypot_config_embed_field_credit, value: lang.honeypot_config_credit_value.replace("${url}", HONEYPOT_SOURCE_URL), inline: false },
		);
}

function buildComponents(lang: LanguageData, config: DatabaseStructure.HoneypotSchema) {
	const trapChannelRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
		new ChannelSelectMenuBuilder()
			.setCustomId('honeypot-config-trap-channel')
			.setPlaceholder(lang.honeypot_config_select_trap_placeholder)
			.setChannelTypes(ChannelType.GuildText)
			.setMinValues(1)
			.setMaxValues(1)
	);

	const logsChannelRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
		new ChannelSelectMenuBuilder()
			.setCustomId('honeypot-config-logs-channel')
			.setPlaceholder(lang.honeypot_config_select_logs_placeholder)
			.setChannelTypes(ChannelType.GuildText)
			.setMinValues(1)
			.setMaxValues(1)
	);

	const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId('honeypot-config-action')
			.setPlaceholder(lang.honeypot_config_select_action_placeholder)
			.addOptions(
				{
					label: lang.setjoinroles_var_perm_kick_members,
					value: 'kick',
					default: config.action === 'kick'
				},
				{
					label: lang.setjoinroles_var_perm_ban_members,
					value: 'ban',
					default: config.action === 'ban'
				},
				{
					label: lang.honeypot_action_none,
					value: 'none',
					default: config.action === 'none'
				},
			)
	);

	const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId('honeypot-config-send')
			.setLabel(lang.honeypot_config_button_send)
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId('honeypot-config-preview')
			.setLabel(lang.honeypot_config_button_preview)
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId('honeypot-config-toggle')
			.setLabel(config.enabled ? lang.honeypot_config_button_disable : lang.honeypot_config_button_enable)
			.setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
	);

	return [trapChannelRow, logsChannelRow, actionRow, buttonRow];
}

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData) => {
		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

		const canManage = await canManageHoneypot(client, interaction);
		if (!canManage) {
			await client.func.method.interactionSend(interaction, { content: lang.honeypot_config_not_allowed });
			return;
		}

		let config = (await client.db.get(`${interaction.guildId}.GUILD.HONEYPOT`) as DatabaseStructure.HoneypotSchema | null)
			|| getDefaultHoneypotConfig(interaction.guild);

		const renderPanel = async () => {
			await response.edit({
				embeds: [await buildConfigEmbed(client, interaction, config, lang)],
				components: buildComponents(lang, config),
				files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
			});
		};

		const response = await client.func.method.interactionSend(interaction, {
			embeds: [await buildConfigEmbed(client, interaction, config, lang)],
			components: buildComponents(lang, config),
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
		});

		const collector = response.createMessageComponentCollector({
			time: 240_000,
		});

		collector.on('collect', async (i) => {
			if (i.user.id !== interaction.user.id) {
				await i.reply({ content: lang.help_not_for_you, flags: [1 << 6] });
				return;
			}

			if (i.isChannelSelectMenu()) {
				await i.deferUpdate();

				if (i.customId === 'honeypot-config-trap-channel') {
					const nextChannelId = i.channels.first()?.id;
					if (config.channelId !== nextChannelId) {
						config.messageId = undefined;
					}
					config.channelId = nextChannelId;
				} else if (i.customId === 'honeypot-config-logs-channel') {
					config.logsChannelId = i.channels.first()?.id;
				}

				config.createdBy = interaction.user.id;
				await client.db.set(`${interaction.guildId}.GUILD.HONEYPOT`, config);
				await renderPanel();
				return;
			}

			if (i.isStringSelectMenu() && i.customId === 'honeypot-config-action') {
				await i.deferUpdate();
				config.action = i.values[0] as DatabaseStructure.HoneypotSchema["action"];
				config.createdBy = interaction.user.id;
				await client.db.set(`${interaction.guildId}.GUILD.HONEYPOT`, config);
				await renderPanel();
				return;
			}

			if (!i.isButton()) return;

			if (i.customId === 'honeypot-config-preview') {
				await i.reply({
					embeds: [buildTrapEmbed(lang)],
					flags: [1 << 6]
				});
				return;
			}

			if (i.customId === 'honeypot-config-send') {
				const channel = await sendTrapEmbed(interaction.guild, config, lang);

				if (!channel) {
					await i.reply({ content: lang.honeypot_config_generic_error, flags: [1 << 6] });
					return;
				}

				config.createdBy = interaction.user.id;
				await client.db.set(`${interaction.guildId}.GUILD.HONEYPOT`, config);
				await renderPanel();
				await i.reply({
					content: lang.honeypot_config_send_success.replace("${channel}", `<#${channel.id}>`),
					flags: [1 << 6]
				});
				return;
			}

			if (i.customId === 'honeypot-config-toggle') {
				if (config.enabled) {
					config.enabled = false;
					config.createdBy = interaction.user.id;
					await client.db.set(`${interaction.guildId}.GUILD.HONEYPOT`, config);
					await renderPanel();
					await i.reply({ content: lang.honeypot_config_disable_success, flags: [1 << 6] });
					return;
				}

				if (!config.logsChannelId) {
					await i.reply({ content: lang.honeypot_config_missing_logs_channel, flags: [1 << 6] });
					return;
				}

				const trapChannel = await sendTrapEmbed(interaction.guild, config, lang);

				if (!trapChannel) {
					await i.reply({ content: lang.honeypot_config_generic_error, flags: [1 << 6] });
					return;
				}

				config.enabled = true;
				config.createdBy = interaction.user.id;
				await client.db.set(`${interaction.guildId}.GUILD.HONEYPOT`, config);
				await renderPanel();
				await i.reply({
					content: lang.honeypot_config_enable_success.replace("${channel}", `<#${trapChannel.id}>`),
					flags: [1 << 6]
				});
			}
		});

		collector.on('end', async () => {
			const disabledRows = buildComponents(lang, config).map((row) => {
				row.components.forEach((component) => component.setDisabled(true));
				return row;
			});

			await response.edit({
				components: disabledRows
			}).catch(() => { });
		});
	},
};
