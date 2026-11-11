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
	Client,
	Guild,
	Message,
	EmbedBuilder,
	ActionRowBuilder,
	ColorResolvable,
	GuildMember
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import { Command } from "../../../../types/command.js";
import { CategoryData } from "../../../../types/category.js";
import { BotContent } from "../../../../types/botContent.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
import { guildPrefix } from "../../../core/functions/prefix.js";
import {
	chunkCategories,
	createNavigationRow,
	createSelectMenuRows
} from "./@h.js";
import {
	checkExplicitRolePermission,
	checkExplicitUserPermission,
	checkRoleHierarchy,
	checkUserPermLevel,
	getCmdPermData,
	hasCommandPermissionRequirements
} from "../../../core/functions/permissonsCalculator.js";

function formatPermGate(
	permData: ReturnType<typeof getCmdPermData>,
	guild: Guild,
	lockEmoji: string,
	crownEmoji: string
): string {
	const bits: string[] = [];
	if ((permData.level ?? 0) > 0) {
		bits.push(`${crownEmoji} Lv.${permData.level}`);
	}
	for (const roleId of permData.roles) {
		bits.push(
			`${lockEmoji} @${guild.roles.cache.get(roleId)?.name ?? roleId}`
		);
	}
	for (const userId of permData.users) {
		bits.push(`${lockEmoji} <@${userId}>`);
	}
	return bits.length > 0 ? ` ${bits.join(" ")}` : "";
}

function localizedDesc(entry: BotContent, guildLang: string): string {
	const langMap: Record<string, string> = {
		"fr-FR": "fr",
		"fr-ME": "fr",
		"jp-JP": "ja",
		"ru-RU": "ru",
		"es-ES": "es-ES"
	};
	const key = langMap[guildLang];
	return key && (entry.desc_localized as any)[key]
		? (entry.desc_localized as any)[key]
		: entry.desc;
}

export const command: Command = {
	name: "helpall",
	aliases: ["help-all"],
	description: "Show every hybrid command you are allowed to use",
	description_localizations: {
		fr: "Affiche toutes les commandes hybrides que tu peux utiliser",
		ja: "使用可能なハイブリッドコマンドをすべて表示",
		ru: "Показать все гибридные команды, доступные вам",
		"es-ES": "Muestra todos los comandos híbridos que puedes usar",
		ko: "사용할 수 있는 모든 하이브리드 명령어를 보여줘요"
	},
	thinking: false,
	category: "bot",
	type: "PREFIX_IHORIZON_COMMAND",
	permission: null,
	run: async (
		client: Client,
		interaction: Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (!interaction.guild) return;

		const botPrefix = (await guildPrefix(client, interaction.guildId!))
			.string;
		const guildLang =
			(await client.db.get(`${interaction.guildId}.GUILD.LANG.lang`)) ||
			"en-US";

		const member =
			interaction.member ??
			(await interaction.guild.members
				.fetch(interaction.author.id)
				.catch(() => null));
		if (!member) return;

		const guildPerm = (await client.db.get(
			`${interaction.guildId}.UTILS`
		)) as DatabaseStructure.UtilsData | null;

		const hybridEntries = client.content.filter((c) => c.messageCmd == 2);

		// If no custom permission is defined on any hybrid command,
		// this command is useless: plain +h already shows everything.
		const hasAnyCustomPerm = hybridEntries.some((entry) =>
			hasCommandPermissionRequirements(
				getCmdPermData(
					entry.cmd,
					guildPerm as DatabaseStructure.UtilsData
				)
			)
		);

		if (!hasAnyCustomPerm) {
			await interaction.reply({
				content: lang.helpall_no_perms_defined.replace(
					"${botPrefix}",
					botPrefix
				),
				allowedMentions: { repliedUser: false }
			});
			return;
		}

		const isOwner =
			(await client.db.get(
				`${interaction.guildId}.OWNER.${member.user.id}.owner`
			)) === true;

		const canUse = (entry: BotContent): boolean => {
			const permData = getCmdPermData(
				entry.cmd,
				guildPerm as DatabaseStructure.UtilsData
			);

			// helpall only lists permission-gated commands: skip
			// "normal" commands without any custom permission.
			if (!hasCommandPermissionRequirements(permData)) {
				return false;
			}

			const customAllowed =
				isOwner ||
				checkExplicitUserPermission(member.user.id, permData) ||
				checkRoleHierarchy(
					member as GuildMember,
					guildPerm as DatabaseStructure.UtilsData,
					permData
				) ||
				checkExplicitRolePermission(member as GuildMember, permData) ||
				checkUserPermLevel(
					member.user.id,
					guildPerm as DatabaseStructure.UtilsData,
					permData
				);

			// Mirror src/core/commandExecutor.ts: when requirements exist,
			// custom deny wins — and custom allow bypasses the native
			// discord permission entirely (checkNativePermission returns
			// true when alreadyAllowed).
			return customAllowed;
		};

		// Discord embeds hold at most 25 fields: like +h, split each category
		// into "continued" entries of 24 commands, each with its own option.
		const categories: CategoryData[] = [];
		const continuedNames = new Set<string>();
		for (const cat of client.category) {
			const allowed = hybridEntries.filter(
				(c) => c.category === cat.categoryName && canUse(c)
			);
			if (allowed.length === 0) continue;

			const placeholder =
				lang[cat.options.placeholder as keyof LanguageData].toString();
			const description =
				lang[cat.options.description as keyof LanguageData].toString();

			for (let i = 0, suite = 0; i < allowed.length; i += 24, suite++) {
				const name =
					suite === 0
						? placeholder
						: `${placeholder} ${lang.h_suite} ${suite}`;
				if (suite > 0) continuedNames.add(name);
				categories.push({
					name,
					value: allowed.slice(i, i + 24),
					inline: false,
					description,
					color: "#1519f0",
					emoji: cat.options.emoji
				});
			}
		}

		if (categories.length === 0) {
			await interaction.reply({
				content: lang.helpall_no_access,
				allowedMentions: { repliedUser: false }
			});
			return;
		}

		categories.sort((a, b) => a.name.localeCompare(b.name));

		const categoryKey = (cat: CategoryData) =>
			cat.name.toLowerCase().replace(/\s+/g, "_");

		const footer = `© iHorizon ${new Date().getFullYear()}`;
		const categoryEmbeds: { [key: string]: EmbedBuilder } = {};
		for (const cat of categories) {
			const embed = new EmbedBuilder()
				.setTitle(cat.name)
				.setDescription(
					continuedNames.has(cat.name)
						? lang.h_suite_desc
						: lang.hybridcommands_embed_footer_text.replace(
								"${botPrefix}",
								botPrefix
							)
				)
				.setColor("#1519f0" as ColorResolvable)
				.setFooter({ text: footer });

			for (const cmd of cat.value) {
				let fieldName = `\`${botPrefix}${cmd.prefixCmd || cmd.cmd}`;
				if (cmd.usage) fieldName += " " + cmd.usage;
				fieldName += "`";
				fieldName += formatPermGate(
					getCmdPermData(
						cmd.cmd,
						guildPerm as DatabaseStructure.UtilsData
					),
					interaction.guild!,
					client.iHorizon_Emojis.Lock ?? "🔐",
					client.iHorizon_Emojis.Crown ?? "👑"
				).substring(0, Math.max(0, 256 - fieldName.length));
				embed.addFields({
					name: fieldName.substring(0, 256),
					value: localizedDesc(cmd, guildLang)
				});
			}
			categoryEmbeds[categoryKey(cat)] = embed;
		}

		// The select menu holds at most 25 options: paginate it with the
		// same rows and buttons as +h.
		const categoryChunks = chunkCategories(categories);
		let currentPageIndex = 0;

		const buildComponents = (
			pageIndex: number,
			selectedCat?: string,
			disabled: boolean = false
		) => {
			const components: ActionRowBuilder<any>[] = createSelectMenuRows(
				categoryChunks[pageIndex],
				lang,
				pageIndex,
				categoryChunks.length,
				selectedCat
			);
			const navigationRow = createNavigationRow(
				pageIndex,
				categoryChunks.length,
				lang
			);
			if (navigationRow) components.push(navigationRow);
			if (disabled) {
				for (const row of components) {
					for (const component of row.components) {
						component.setDisabled(true);
					}
				}
			}
			return components;
		};

		const helpMessage = await (
			interaction.channel as BaseGuildTextChannel
		).send({
			embeds: [categoryEmbeds[categoryKey(categoryChunks[0][0])]],
			components: buildComponents(0)
		});

		const authorId = member.user.id;
		const collector = helpMessage.createMessageComponentCollector({
			time: 120000 * 15
		});

		collector.on("collect", async (i) => {
			if (i.user.id !== authorId) {
				await i.reply({
					content: lang.help_not_for_you,
					flags: [1 << 6]
				});
				return;
			}

			if (i.isStringSelectMenu()) {
				if (!i.customId.startsWith("help_category_select_")) return;
				const selectedCat = i.values[0];
				const embed = categoryEmbeds[selectedCat];
				if (!embed) {
					await i.update({
						content: lang.var_unreachable_command,
						embeds: [],
						components: []
					});
					return;
				}
				await i.update({
					embeds: [embed],
					components: buildComponents(currentPageIndex, selectedCat)
				});
				return;
			}

			if (!i.isButton()) return;
			if (i.customId === "help_prev_page" && currentPageIndex > 0) {
				currentPageIndex--;
			} else if (
				i.customId === "help_next_page" &&
				currentPageIndex < categoryChunks.length - 1
			) {
				currentPageIndex++;
			} else {
				return;
			}
			await i.update({
				embeds: [
					categoryEmbeds[
						categoryKey(categoryChunks[currentPageIndex][0])
					]
				],
				components: buildComponents(currentPageIndex)
			});
		});

		collector.on("end", async () => {
			try {
				await helpMessage.edit({
					components: buildComponents(
						currentPageIndex,
						undefined,
						true
					)
				});
			} catch {
				// Message may have been deleted
			}
		});
	}
};
