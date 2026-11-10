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
	ChatInputCommandInteraction,
	Client,
	ContainerBuilder,
	GuildMember,
	Message,
	MessageFlags
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	cardPayload,
	pageLabel,
	sendCard
} from "../../../core/modules/uiCard.js";
import { getMutedMembers } from "../../../core/modules/moderationOps.js";

const PER_PAGE = 10;

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const char: GuildMember[] = getMutedMembers(interaction.guild);

		if (char.length == 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.prevnames_undetected
			});
			return;
		}

		const e = client.iHorizon_Emojis;
		const guild = interaction.guild;
		const authorId = interaction.member.user.id;
		const pages = Math.ceil(char.length / PER_PAGE);
		const signature = await botSignature(client, guild.id);
		let currentPage = 0;
		let cleared: ContainerBuilder | null = null;

		const render = (page: number, disabled: boolean): ContainerBuilder => {
			const container = buildCard({
				accent: ACCENT.warning,
				emoji: e.Mute,
				title: lang.mutelist_card_title,
				description: `-# ${lang.mutelist_card_count.replace("${count}", String(char.length))}`,
				thumbnail: guild.iconURL({ size: 128 }),
				blocks: [
					char
						.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
						.map((member) => {
							const until = Math.floor(
								(member.communicationDisabledUntilTimestamp ??
									0) / 1000
							);
							return `${member} \`${member.user.tag}\`\n-# ${lang.mutelist_card_ends.replace("${time}", `<t:${until}:f> · <t:${until}:R>`)}`;
						})
						.join("\n")
				],
				footer: pageLabel(lang, page, pages),
				signature
			});

			const row = new ActionRowBuilder<ButtonBuilder>();
			if (pages > 1) {
				row.addComponents(
					new ButtonBuilder()
						.setCustomId("previousPage")
						.setLabel(lang.var_previous)
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(disabled),
					new ButtonBuilder()
						.setCustomId("nextPage")
						.setLabel(lang.var_next)
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(disabled)
				);
			}
			row.addComponents(
				new ButtonBuilder()
					.setCustomId("trash-mutelist-embed")
					.setLabel(lang.mutelist_button_unmute_all)
					.setEmoji(e.Ticket_Trash)
					.setStyle(ButtonStyle.Danger)
					.setDisabled(disabled)
			);
			return container.addActionRowComponents(row);
		};

		const message = await sendCard(
			client,
			interaction,
			render(currentPage, false)
		);

		const collector = message.createMessageComponentCollector({
			time: 60_000
		});

		collector.on("collect", async (i) => {
			if (!i.isButton()) return;
			if (i.user.id !== authorId) {
				await i.reply({
					content: lang.help_not_for_you,
					flags: [MessageFlags.Ephemeral]
				});
				return;
			}

			if (i.customId === "previousPage") {
				currentPage = (currentPage - 1 + pages) % pages;
			} else if (i.customId === "nextPage") {
				currentPage = (currentPage + 1) % pages;
			} else if (i.customId === "trash-mutelist-embed") {
				await i.deferUpdate();
				for (let member of char) {
					await member.timeout(null).catch(() => {});
				}
				cleared = buildCard({
					accent: ACCENT.success,
					emoji: e.Yes,
					title: lang.mutelist_card_cleared_title,
					description: lang.mutelist_card_cleared_desc.replace(
						"${count}",
						String(char.length)
					),
					signature
				});
				await i.editReply({ components: [cleared] });
				collector.stop();
				return;
			} else return;

			await i.update({ components: [render(currentPage, false)] });
		});

		collector.on("end", async () => {
			if (cleared) return;
			await message
				.edit({
					...cardPayload(render(currentPage, true)),
					flags: [MessageFlags.IsComponentsV2]
				} as never)
				.catch(() => undefined);
		});
	}
};
