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
	Client,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	ActionRowBuilder,
	ComponentType,
	TextInputStyle,
	Collection,
	ChatInputCommandInteraction,
	StringSelectMenuInteraction,
	ModalSubmitInteraction,
	ApplicationCommandType,
	Message,
	MessageFlags,
	User,
	ModalData
} from "discord.js";

import {
	ACCENT,
	botSignature,
	buildCard,
	cardPayload,
	notice,
	pageLabel,
	sendCard
} from "../../../core/modules/uiCard.js";
import {
	fence,
	scheduleBlock,
	scheduleDate,
	ScheduleEntry
} from "../../../core/modules/scheduleCards.js";

import { Command } from "../../../../types/command.js";
import { generatePassword } from "../../../core/functions/random.js";
import { LanguageData } from "../../../../types/languageData.js";
import { iHorizonModalResolve } from "../../../core/functions/modalHelper.js";
import { scheduleTable } from "../../../Events/client/ready.js";

// At most 25 reminders per member, and the delay is
// bounded so entries cannot be parked in the shared table forever.
const MAX_SCHEDULES_PER_USER = 25;
const MAX_SCHEDULE_DELAY_MS = 10 * 365 * 24 * 60 * 60 * 1000;

// A Components V2 message holds 4000 characters of text: the list is paged.
const LIST_PER_PAGE = 5;
const LIST_PAGE_CHARS = 2800;
const LIST_PREVIOUS = "schedule-list-previous";
const LIST_NEXT = "schedule-list-next";

export const command: Command = {
	name: "schedule",
	description: "Manager for schedule category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie de message pré-programmer",
		ja: "スケジュールカテゴリの管理！",
		ru: "Управление категорией расписания!",
		"es-ES": "Gestor para la categoría de horarios!",
		ko: "일정 카테고리 관리!",
		uk: "Керування категорією розкладу!",
		de: "Verwaltung der Zeitplan-Kategorie!",
		it: "Gestione della categoria pianificazione!",
		"pt-BR": "Gerenciador da categoria de agendamentos!",
		pl: "Zarządzanie kategorią harmonogramów!"
	},
	category: "schedule",
	thinking: false,
	permission: null,
	type: ApplicationCommandType.ChatInput,
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message<true>,
		lang: LanguageData,
		options?: string[]
	) => {
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const e = client.iHorizon_Emojis;
		const user = interaction.member.user as User;
		const signature = await botSignature(client, interaction.guildId);
		const avatar = user.displayAvatarURL({ extension: "png", size: 512 });

		const select = new StringSelectMenuBuilder()
			.setCustomId("starter")
			.setPlaceholder(lang.schedule_menu_placeholder)
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.schedule_menu_choice_0)
					.setEmoji("📝")
					.setValue("0"),
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.schedule_menu_choice_1)
					.setEmoji("🗑️")
					.setValue("1"),
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.schedule_menu_choice_2)
					.setEmoji("⚠️")
					.setValue("2"),
				new StringSelectMenuOptionBuilder()
					.setLabel(lang.schedule_menu_choice_3)
					.setEmoji("📜")
					.setValue("3")
			);

		const home = () =>
			buildCard({
				accent: ACCENT.info,
				emoji: e.Schedule,
				title: lang.schedule_modal_title,
				description: lang.schedule_menu_placeholder,
				thumbnail: avatar,
				signature
			});

		// The list, cut in pages that fit in one message.
		let listPages: string[][] = [];
		let listPage = 0;
		const listCard = () =>
			buildCard({
				accent: ACCENT.info,
				emoji: e.Ticket_List,
				title: lang.schedule_list_title_embed,
				description: lang.schedule_list_content_message,
				thumbnail: avatar,
				blocks: listPages[listPage] ?? [],
				footer:
					listPages.length > 1
						? pageLabel(lang, listPage, listPages.length)
						: null,
				signature
			});

		// The card above the menu: home first, then the last action's result.
		// The panel is a Components V2 message: every edit sends it whole.
		let current: () => ContainerBuilder = home;

		function render(): ContainerBuilder {
			const card = current().addActionRowComponents(
				new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					select
				)
			);
			if (current === listCard && listPages.length > 1) {
				card.addActionRowComponents(
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId(LIST_PREVIOUS)
							.setLabel(lang.var_previous)
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(!!select.data.disabled),
						new ButtonBuilder()
							.setCustomId(LIST_NEXT)
							.setLabel(lang.var_next)
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(!!select.data.disabled)
					)
				);
			}
			return card;
		}

		const show = (card: () => ContainerBuilder) => {
			current = card;
			return original_interaction
				.edit(cardPayload(render()) as never)
				.catch(() => undefined);
		};

		const original_interaction = await client.func.method.interactionSend(
			interaction,
			cardPayload(render()) as never
		);

		try {
			const collector =
				original_interaction.createMessageComponentCollector({
					filter: (member) =>
						member.user.id === interaction.member?.user.id,
					componentType: ComponentType.StringSelect,
					time: 420_000
				});

			const pageCollector =
				original_interaction.createMessageComponentCollector({
					filter: (member) =>
						member.user.id === interaction.member?.user.id,
					componentType: ComponentType.Button,
					time: 420_000
				});

			collector.on("collect", async (i) => {
				if (i.member?.user.id !== interaction.member?.user.id) {
					await i.reply({
						content: lang.embed_interaction_not_for_you,
						flags: [1 << 6]
					});
					return;
				}
				await chooseAction(i);
			});

			pageCollector.on("collect", async (i) => {
				if (current !== listCard || listPages.length < 2) {
					await i.deferUpdate();
					return;
				}
				const pages = listPages.length;
				if (i.customId === LIST_PREVIOUS)
					listPage = (listPage - 1 + pages) % pages;
				else if (i.customId === LIST_NEXT)
					listPage = (listPage + 1) % pages;
				await i.update(cardPayload(render()) as never);
			});

			collector.on("end", () => {
				pageCollector.stop();
				select.setDisabled(true);
				show(home);
			});
		} catch {
			return await sendCard(
				client,
				interaction,
				notice(
					"danger",
					lang.embed_timeout_getbtn.replace(
						"${authorId}",
						interaction.member!.user.id
					)
				)
			);
		}

		/** A question asked under the panel; the answer is the next message. */
		const ask = (
			i: StringSelectMenuInteraction | ModalSubmitInteraction,
			question: string
		) =>
			i.reply({
				components: [notice("info", question)],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { parse: [] }
			});

		async function chooseAction(i: StringSelectMenuInteraction) {
			switch (i.values[0]) {
				case "0":
					const modal = await iHorizonModalResolve(
						{
							customId: "modal",
							title: lang.schedule_modal_title,
							deferUpdate: false,
							fields: [
								{
									customId: "name",
									label: lang.schedule_modal_fields_1_label,
									style: TextInputStyle.Short,
									required: true,
									maxLength: 30,
									minLength: 1
								},
								{
									customId: "desc",
									label: lang.schedule_modal_fields_2_label,
									style: TextInputStyle.Paragraph,
									required: true,
									maxLength: 400,
									minLength: 1
								}
							]
						},
						i
					);

					if (!modal) return;
					executeAfterModal(modal);
					break;
				case "1":
					const u = await ask(i, lang.schedule_delete_question);

					const deleteCollector =
						interaction.channel?.createMessageCollector({
							filter: (m) =>
								m.author.id === interaction.member?.user.id,
							max: 1,
							time: 120_000
						});

					deleteCollector?.on("collect", async (message) => {
						(await message.delete()) && u.delete();
						deleteCollector?.stop();
						__1(message.content);
					});
					break;
				case "2":
					const u2 = await ask(i, lang.schedule_deleteall_question);
					const deleteAllCollector =
						interaction.channel?.createMessageCollector({
							filter: (m) =>
								m.author.id === interaction.member?.user.id,
							max: 1,
							time: 120_000
						});

					deleteAllCollector?.on("collect", async (message) => {
						(await message.delete()) && u2.delete();
						deleteAllCollector?.stop();
						if (
							message.content.toLowerCase() === "y" ||
							message.content.toLowerCase() === "yes"
						) {
							__2(true);
						} else {
							__2(false);
						}
					});
					break;
				case "3":
					await i.deferUpdate();
					__3();
					break;
				default:
					break;
			}

			async function __1(arg0: string) {
				const fetched = await scheduleTable.get(
					`${interaction.member?.user.id}`
				);

				if (!fetched || !fetched[arg0]) {
					await show(() =>
						notice(
							"danger",
							`${e.No} ${lang.schedule_delete_not_found.replace(
								"${arg0}",
								arg0
							)}`
						)
					);
					return;
				} else {
					await scheduleTable.delete(
						`${interaction.member?.user.id}.${arg0}`
					);
					await show(() =>
						buildCard({
							accent: ACCENT.danger,
							emoji: e.Ticket_Trash,
							title: lang.schedule_delete_title_embed.replace(
								"${arg0}",
								arg0
							),
							description: `${e.Yes} ${lang.schedule_delete_confirm}`,
							thumbnail: avatar,
							signature
						})
					);
					return;
				}
			}

			async function __2(arg0: boolean) {
				if (arg0) {
					await scheduleTable.delete(
						`${interaction.member?.user.id}`
					);

					await show(() =>
						buildCard({
							accent: ACCENT.danger,
							emoji: e.Ticket_Trash,
							title: lang.schedule_deleteall_title_embed,
							description: `${e.Yes} ${lang.schedule_deleteall_desc_embed}`,
							thumbnail: avatar,
							signature
						})
					);
				} else {
					await show(() =>
						notice("info", lang.schedule_deleteall_cancel)
					);
					return;
				}
			}

			async function __3() {
				const fetched = (await scheduleTable.get(
					`${interaction.member?.user.id}`
				)) as Record<string, ScheduleEntry> | null;

				if (!fetched || Object.keys(fetched).length === 0) {
					await show(() =>
						notice("info", lang.schedule_list_not_schedule)
					);
					return;
				}

				listPages = [];
				let size = 0;
				for (const code in fetched) {
					const block = scheduleBlock(client, code, fetched[code]);
					const last = listPages[listPages.length - 1];
					if (
						!last ||
						last.length >= LIST_PER_PAGE ||
						size + block.length > LIST_PAGE_CHARS
					) {
						listPages.push([block]);
						size = block.length;
					} else {
						last.push(block);
						size += block.length;
					}
				}
				listPage = 0;
				await show(listCard);
			}

			async function executeAfterModal(
				i: ModalSubmitInteraction<"cached">
			) {
				const nameValue = i.fields.getTextInputValue("name");
				const descValue = i.fields.getTextInputValue("desc");
				const preview = `${fence(nameValue)}\n${fence(descValue)}`;

				await show(() =>
					buildCard({
						accent: ACCENT.info,
						emoji: e.Schedule,
						title: lang.schedule_create_title_embed,
						thumbnail: avatar,
						blocks: [preview],
						signature
					})
				);
				const u = await ask(i, lang.schedule_create_when_question);

				const dateCollector =
					interaction.channel?.createMessageCollector({
						filter: (m) => m.author.id === user.id,
						max: 1,
						time: 120_000
					});

				dateCollector?.on("collect", async (message) => {
					(await message.delete()) && u.delete();
					dateCollector?.stop();
					__0(client.timeCalculator.to_ms(message.content)!, [
						nameValue,
						descValue
					]);
				});

				async function __0(date0: number, collection: string[]) {
					const scheduleCode = generatePassword({ length: 16 });

					if (
						!Number.isFinite(date0) ||
						date0 <= 0 ||
						date0 > MAX_SCHEDULE_DELAY_MS
					) {
						show(() =>
							notice(
								"danger",
								`${e.No} ${lang.schedule_create_not_number_time.replace(
									"${author}",
									user.toString()
								)}`
							)
						);
						return;
					}

					const notifiedAt = Date.now() + date0;
					show(() =>
						buildCard({
							accent: ACCENT.success,
							emoji: e.Schedule,
							title: lang.schedule_create_embed_title_confirm.replace(
								"${scheduleCode}",
								scheduleCode
							),
							description: lang.schedule_create_confirm_msg
								.replace("${author}", user.toString())
								.replace("${scheduleCode}", scheduleCode),
							thumbnail: avatar,
							fields: [
								{
									emoji: e.Timer,
									label: lang.schedule_create_embed_fields_name_confirm,
									value: scheduleDate(notifiedAt)
								}
							],
							blocks: [preview],
							signature
						})
					);

					const existing =
						((await scheduleTable.get(user.id)) as Record<
							string,
							unknown
						> | null) || {};
					if (
						Object.keys(existing).length >= MAX_SCHEDULES_PER_USER
					) {
						show(() =>
							notice(
								"danger",
								`${e.No} ${lang.schedule_create_limit_reached
									.replace("${author}", user.toString())
									.replace(
										"${max}",
										String(MAX_SCHEDULES_PER_USER)
									)}`
							)
						);
						return;
					}

					await scheduleTable.set(`${user.id}.${scheduleCode}`, {
						title: collection[0],
						description: collection[1],
						expired: Date.now() + date0
					});
				}
			}
		}
	}
};
