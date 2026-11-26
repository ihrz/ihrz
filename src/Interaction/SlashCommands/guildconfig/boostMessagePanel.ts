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
	ButtonInteraction,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelSelectMenuInteraction,
	ChatInputCommandInteraction,
	Client,
	ContainerBuilder,
	GuildMember,
	Interaction,
	Message,
	MessageFlags,
	PermissionFlagsBits,
	SeparatorBuilder,
	SeparatorSpacingSize,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder,
	TextInputStyle
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
import { iHorizonModalResolve } from "../../../core/functions/modalHelper.js";
import { readSavedEmbed } from "../../../core/functions/embedHelper.js";
import { metasTable } from "../../../Events/client/ready.js";
import { cardPayload } from "../../../core/modules/uiCard.js";
import {
	BOOST_CHANNEL_TYPES,
	BOOST_MESSAGE_MAX_LENGTH,
	BOOST_MESSAGE_VARS,
	BoostKind,
	DeliveryResult,
	buildBoostPayload,
	defaultBoostText,
	deliverBoostMessage
} from "../../../core/modules/boostMessage.js";

const COLLECTOR_TIMEOUT = 600_000;
const PANEL_ACCENT_COLOR = 0xf47fff;

type Source =
	| ButtonInteraction<"cached">
	| ChannelSelectMenuInteraction<"cached">
	| StringSelectMenuInteraction<"cached">;

/** Feedback after the interaction was acknowledged (expired: ignored). */
async function safeFollowUp(source: Source, content: string): Promise<void> {
	try {
		await source.followUp({
			content,
			flags: [MessageFlags.Ephemeral],
			allowedMentions: { parse: [] }
		});
	} catch (error) {
		const code = (error as { code?: number })?.code;
		if (code !== 10062 && code !== 40060) logger.err(error);
	}
}

/** A code block that a ``` in the text cannot close. */
function codeBlock(value: string): string {
	return "```\n" + value.replaceAll("```", "`​``") + "\n```";
}

function sideLabel(lang: LanguageData, kind: BoostKind): string {
	return kind === "boost"
		? lang.boostmsg_side_boost
		: lang.boostmsg_side_unboost;
}

function testLine(
	lang: LanguageData,
	target: "channel" | "dm",
	result: DeliveryResult,
	channelId: string | null
): string | null {
	if (!result) return null;
	if (target === "dm")
		return result === "ok"
			? lang.boostmsg_test_dm_ok
			: lang.boostmsg_test_dm_fail;
	return (
		result === "ok"
			? lang.boostmsg_test_channel_ok
			: lang.boostmsg_test_channel_fail
	).replace("${channel}", `<#${channelId}>`);
}

export async function openBoostMessagePanel(
	client: Client,
	interaction: ChatInputCommandInteraction<"cached"> | Message,
	lang: LanguageData
): Promise<void> {
	const guildId = interaction.guildId!;
	const authorId = interaction.member?.user.id as string;
	const dbKey = (kind: BoostKind) => `${guildId}.GUILD.BOOST_MESSAGE.${kind}`;

	const stored = ((await client.db.get(`${guildId}.GUILD.BOOST_MESSAGE`)) ??
		{}) as DatabaseStructure.BoostMessageSchema;
	const sides: Record<BoostKind, DatabaseStructure.BoostMessageSide> = {
		boost: { ...(stored.boost ?? {}) },
		unboost: { ...(stored.unboost ?? {}) }
	};
	let current: BoostKind = "boost";

	async function save(kind: BoostKind): Promise<void> {
		await client.db.set(dbKey(kind), sides[kind]);
	}

	function build(disabled: boolean): ContainerBuilder {
		const side = sides[current];
		const on = lang.boostmsg_on;
		const off = lang.boostmsg_off;
		const container = new ContainerBuilder().setAccentColor(
			PANEL_ACCENT_COLOR
		);

		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`## ${client.iHorizon_Emojis.Boost_Gem} ${lang.boostmsg_panel_title} — ${sideLabel(lang, current)}\n${lang.boostmsg_panel_desc}`
			)
		);

		if (!disabled) {
			container.addActionRowComponents(
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId("boostmsg-side")
						.addOptions(
							(["boost", "unboost"] as const).map((kind) =>
								new StringSelectMenuOptionBuilder()
									.setLabel(sideLabel(lang, kind))
									.setValue(kind)
									.setDefault(kind === current)
							)
						)
				)
			);
		}

		const lines = [
			`**${lang.boostmsg_field_status}** ${side.enabled ? `🟢 ${on}` : `🔴 ${off}`}`,
			`**${lang.boostmsg_field_channel}** ${side.channelId ? `<#${side.channelId}>` : lang.boostmsg_none}`,
			`**${lang.boostmsg_field_dm}** ${side.dm ? on : off}`,
			`**${lang.boostmsg_field_text}** ${side.textEnabled !== false ? on : off}`,
			`**${lang.boostmsg_field_embed}** ${side.embedId ? `\`${side.embedId}\`` : lang.boostmsg_none}`
		];
		if (side.textEnabled === false && !side.embedId)
			lines.push(`-# ${lang.boostmsg_text_needed_hint}`);
		if (side.enabled && !side.channelId && !side.dm)
			lines.push(`-# ${lang.boostmsg_no_target_hint}`);

		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(lines.join("\n")),
			new TextDisplayBuilder().setContent(
				side.message?.trim()
					? `### ${lang.boostmsg_field_message}\n${codeBlock(side.message)}`
					: `### ${lang.boostmsg_field_message} (${lang.boostmsg_default_label})\n${codeBlock(defaultBoostText(lang, current))}`
			)
		);

		container.addSeparatorComponents(
			new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
		);
		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`### ${lang.boostmsg_field_variables}\n${BOOST_MESSAGE_VARS.map((v) => `\`${v}\``).join(" · ")}\n-# ${lang.boostmsg_variables_help}`
			)
		);

		container.addActionRowComponents(
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId("boostmsg-toggle")
					.setLabel(
						side.enabled
							? lang.boostmsg_button_disable
							: lang.boostmsg_button_enable
					)
					.setStyle(
						side.enabled ? ButtonStyle.Danger : ButtonStyle.Success
					)
					.setDisabled(disabled),
				new ButtonBuilder()
					.setCustomId("boostmsg-dm")
					.setLabel(
						side.dm
							? lang.boostmsg_button_dm_disable
							: lang.boostmsg_button_dm_enable
					)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(disabled),
				new ButtonBuilder()
					.setCustomId("boostmsg-text")
					.setLabel(
						side.textEnabled !== false
							? lang.boostmsg_button_text_disable
							: lang.boostmsg_button_text_enable
					)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(disabled)
			)
		);

		if (!disabled) {
			const select = new ChannelSelectMenuBuilder()
				.setCustomId("boostmsg-channel")
				.setPlaceholder(lang.boostmsg_channel_placeholder)
				.setChannelTypes(...BOOST_CHANNEL_TYPES)
				.setMinValues(0)
				.setMaxValues(1);
			if (side.channelId) select.setDefaultChannels(side.channelId);
			container.addActionRowComponents(
				new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
					select
				)
			);
		}

		container.addActionRowComponents(
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId("boostmsg-message")
					.setLabel(lang.boostmsg_button_message)
					.setStyle(ButtonStyle.Primary)
					.setDisabled(disabled),
				new ButtonBuilder()
					.setCustomId("boostmsg-embed")
					.setLabel(lang.boostmsg_button_embed)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(disabled),
				new ButtonBuilder()
					.setCustomId("boostmsg-test")
					.setLabel(lang.boostmsg_button_test)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(disabled)
			)
		);

		return container;
	}

	async function render(message: Message, disabled = false): Promise<void> {
		await message.edit(cardPayload(build(disabled)) as never);
	}

	async function pickChannel(
		source: ChannelSelectMenuInteraction<"cached">
	): Promise<boolean> {
		await source.deferUpdate().catch(() => null);
		const channelId = source.values[0] ?? null;

		if (channelId) {
			const channel =
				source.guild.channels.cache.get(channelId) ??
				(await source.guild.channels
					.fetch(channelId)
					.catch(() => null));
			const me = source.guild.members.me;
			const needed = [
				PermissionFlagsBits.ViewChannel,
				PermissionFlagsBits.SendMessages
			];

			if (!channel) {
				await safeFollowUp(source, lang.boostmsg_channel_invalid);
				return false;
			}
			if (!source.member.permissionsIn(channel).has(needed)) {
				await safeFollowUp(
					source,
					lang.boostmsg_channel_no_access.replace(
						"${channel}",
						channel.toString()
					)
				);
				return false;
			}
			if (!me || !channel.permissionsFor(me)?.has(needed)) {
				await safeFollowUp(
					source,
					lang.boostmsg_channel_bot_no_access.replace(
						"${channel}",
						channel.toString()
					)
				);
				return false;
			}
		}

		sides[current].channelId = channelId;
		await save(current);
		return true;
	}

	async function editMessage(
		source: ButtonInteraction<"cached">
	): Promise<boolean> {
		const modal = await iHorizonModalResolve(
			{
				customId: "boostmsg-message-modal",
				title: lang.boostmsg_modal_message_title,
				deferUpdate: false,
				fields: [
					{
						customId: "boostmsg-message-input",
						label: lang.boostmsg_modal_message_label,
						style: TextInputStyle.Paragraph,
						required: false,
						maxLength: BOOST_MESSAGE_MAX_LENGTH,
						value: sides[current].message ?? undefined
					}
				]
			},
			source as Interaction
		);
		if (!modal) return false;

		const value = modal.fields
			.getTextInputValue("boostmsg-message-input")
			.trim();
		sides[current].message = value || null;
		await save(current);
		await modal.deferUpdate().catch(() => null);
		return true;
	}

	async function editEmbed(
		source: ButtonInteraction<"cached">
	): Promise<boolean> {
		const modal = await iHorizonModalResolve(
			{
				customId: "boostmsg-embed-modal",
				title: lang.boostmsg_modal_embed_title,
				deferUpdate: false,
				fields: [
					{
						customId: "boostmsg-embed-input",
						label: lang.boostmsg_modal_embed_label,
						style: TextInputStyle.Short,
						required: false,
						maxLength: 64,
						value: sides[current].embedId ?? undefined
					}
				]
			},
			source as Interaction
		);
		if (!modal) return false;

		const code = modal.fields
			.getTextInputValue("boostmsg-embed-input")
			.trim();

		// An unknown or invalid code is refused: saved, it would send nothing.
		if (
			code &&
			!(await readSavedEmbed(code, (key) => metasTable.get(key)))
		) {
			await modal.reply({
				content: lang.boostmsg_embed_not_found.replace(
					"${embed_id}",
					code
				),
				flags: [MessageFlags.Ephemeral],
				allowedMentions: { parse: [] }
			});
			return false;
		}

		sides[current].embedId = code || null;
		await save(current);
		await modal.deferUpdate().catch(() => null);
		return true;
	}

	async function sendTest(
		source: ButtonInteraction<"cached">
	): Promise<void> {
		await source.deferUpdate().catch(() => null);
		const side = sides[current];
		const member = source.member as GuildMember;

		if (!side.channelId && !side.dm) {
			await safeFollowUp(source, lang.boostmsg_test_nothing);
			return;
		}

		const guildLocal =
			((await client.db.get(`${guildId}.GUILD.LANG.lang`)) as
				string | null) || "en-US";
		const { payload, plan } = await buildBoostPayload(
			member,
			current,
			side,
			lang,
			guildLocal,
			`-# ${lang.boostmsg_test_tag.replace("${side}", sideLabel(lang, current))}`
		);
		if (!payload) {
			await safeFollowUp(source, lang.boostmsg_test_nothing);
			return;
		}

		const result = await deliverBoostMessage(member, payload, plan);
		await safeFollowUp(
			source,
			[
				testLine(lang, "channel", result.channel, plan.channelId),
				testLine(lang, "dm", result.dm, null)
			]
				.filter(Boolean)
				.join("\n")
		);
	}

	const panel = (await client.func.method.interactionSend(
		interaction,
		cardPayload(build(false)) as never
	)) as Message;

	const collector = panel.createMessageComponentCollector({
		time: COLLECTOR_TIMEOUT
	});

	collector.on("collect", async (collected) => {
		if (collected.user.id !== authorId) {
			await collected
				.reply({
					content: lang.help_not_for_you,
					flags: [MessageFlags.Ephemeral]
				})
				.catch(() => null);
			return;
		}

		try {
			let changed = false;

			if (collected.isStringSelectMenu()) {
				await collected.deferUpdate();
				current = collected.values[0] as BoostKind;
				changed = true;
			} else if (collected.isChannelSelectMenu()) {
				changed = await pickChannel(
					collected as ChannelSelectMenuInteraction<"cached">
				);
			} else if (collected.isButton()) {
				const source = collected as ButtonInteraction<"cached">;
				const side = sides[current];

				switch (source.customId) {
					case "boostmsg-toggle":
					case "boostmsg-dm":
					case "boostmsg-text": {
						await source.deferUpdate();
						if (source.customId === "boostmsg-toggle")
							side.enabled = !side.enabled;
						else if (source.customId === "boostmsg-dm")
							side.dm = !side.dm;
						else side.textEnabled = side.textEnabled === false;
						await save(current);
						changed = true;
						break;
					}
					case "boostmsg-message":
						changed = await editMessage(source);
						break;
					case "boostmsg-embed":
						changed = await editEmbed(source);
						break;
					case "boostmsg-test":
						await sendTest(source);
						break;
				}
			}

			if (changed) await render(panel);
		} catch (error) {
			logger.err(error);
		}
	});

	collector.on("end", async () => {
		await render(panel, true).catch(() => null);
	});
}
