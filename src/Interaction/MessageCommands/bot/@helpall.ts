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
	StringSelectMenuBuilder,
	ColorResolvable,
	ComponentType,
	GuildMember
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import { Command } from "../../../../types/command.js";
import { CategoryData } from "../../../../types/category.js";
import { BotContent } from "../../../../types/botContent.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
import { guildPrefix } from "../../../core/functions/prefix.js";
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
		"es-ES": "Muestra todos los comandos híbridos que puedes usar"
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

		const categories: CategoryData[] = [];
		for (const cat of client.category) {
			const allowed = hybridEntries.filter(
				(c) => c.category === cat.categoryName && canUse(c)
			);
			if (allowed.length === 0) continue;

			const placeholder =
				lang[cat.options.placeholder as keyof LanguageData].toString();
			categories.push({
				name: placeholder,
				value: allowed,
				inline: false,
				description:
					lang[
						cat.options.description as keyof LanguageData
					].toString(),
				color: "#1519f0",
				emoji: cat.options.emoji
			});
		}

		if (categories.length === 0) {
			await interaction.reply({
				content: lang.helpall_no_access,
				allowedMentions: { repliedUser: false }
			});
			return;
		}

		categories.sort((a, b) => a.name.localeCompare(b.name));

		const footer = `© iHorizon ${new Date().getFullYear()}`;
		const categoryEmbeds: { [key: string]: EmbedBuilder[] } = {};
		for (const cat of categories) {
			const key = cat.name.toLowerCase().replace(/\s+/g, "_");
			const pages: EmbedBuilder[] = [];
			let current = new EmbedBuilder()
				.setTitle(cat.name)
				.setDescription(
					lang.hybridcommands_embed_footer_text.replace(
						"${botPrefix}",
						botPrefix
					)
				)
				.setColor("#1519f0" as ColorResolvable)
				.setFooter({ text: footer });

			cat.value.forEach((cmd, index) => {
				if (index > 0 && index % 25 === 0) {
					pages.push(current);
					current = new EmbedBuilder()
						.setTitle(`${cat.name} (${pages.length + 1})`)
						.setDescription(
							lang.hybridcommands_embed_footer_text.replace(
								"${botPrefix}",
								botPrefix
							)
						)
						.setColor("#1519f0" as ColorResolvable)
						.setFooter({ text: footer });
				}
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
				current.addFields({
					name: fieldName.substring(0, 256),
					value: localizedDesc(cmd, guildLang)
				});
			});
			pages.push(current);
			categoryEmbeds[key] = pages;
		}

		const selectRow =
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				new StringSelectMenuBuilder()
					.setCustomId("helpall_category_select")
					.setPlaceholder(lang.help_select_menu)
					.addOptions(
						categories.map((cat) => ({
							label: cat.name,
							value: cat.name.toLowerCase().replace(/\s+/g, "_"),
							description: `${cat.value.length} Commands`,
							emoji: cat.emoji
						}))
					)
			);

		const helpMessage = await (
			interaction.channel as BaseGuildTextChannel
		).send({
			embeds: categoryEmbeds[
				categories[0].name.toLowerCase().replace(/\s+/g, "_")
			],
			components: [selectRow]
		});

		const authorId = member.user.id;
		const collector = helpMessage.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			time: 120000 * 15
		});

		collector.on("collect", async (i) => {
			if (i.customId !== "helpall_category_select") return;
			if (i.user.id !== authorId) {
				await i.reply({
					content: lang.help_not_for_you,
					flags: [1 << 6]
				});
				return;
			}
			const embeds = categoryEmbeds[i.values[0]];
			if (!embeds) {
				await i.update({
					content: lang.var_unreachable_command,
					embeds: [],
					components: []
				});
				return;
			}
			await i.update({ embeds, components: [selectRow] });
		});

		collector.on("end", async () => {
			try {
				const disabled =
					new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
						StringSelectMenuBuilder.from(
							selectRow.components[0]
						).setDisabled(true)
					);
				await helpMessage.edit({ components: [disabled] });
			} catch {
				// Message may have been deleted
			}
		});
	}
};
