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
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	ContainerBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	Message,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { CategoryData } from "../../../../types/category.js";
import { BotContent } from "../../../../types/botContent.js";
import { Command } from "../../../../types/command.js";
import { Option } from "../../../../types/option.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	cardPayload,
	pageLabel
} from "../../../core/modules/uiCard.js";
import {
	commandMention,
	DASHBOARD_URL,
	DOCS_URL,
	SUPPORT_URL
} from "../../../core/modules/guildWelcome.js";

// /help in Components V2: a home card (banner, counts, the category menus, links), then one card per
// category (each command as a clickable mention with its prefix form, its /perm state and description,
// paged), and /help <command> as a card. Only whoever ran it can browse; everything is disabled when the
// time runs out.

const SEARCH_URL = "https://www.ihorizon.org/search/";
const TIMEOUT_MS = 840_000;
// One section per command (text + a Details button): Discord allows 40 components in a message.
const PAGE_SIZE = 6;
const PAGE_TEXT_MAX = 3500;
const MENUS = 2;
const ID = {
	menu: "help-menu-",
	previous: "help-previous",
	next: "help-next",
	details: "help-details%"
} as const;
const BACK = "back";
const AVATAR = "attachment://footer_icon.png";

// Guild language -> the Discord locale of a command's localized description.
const DESCRIPTION_LOCALE: Record<string, string> = {
	"fr-FR": "fr",
	"fr-ME": "fr",
	"jp-JP": "ja",
	"ko-KR": "ko",
	"ru-RU": "ru",
	"uk-UA": "uk",
	"de-DE": "de",
	"it-IT": "it",
	"pt-PT": "pt-BR",
	"pl-PL": "pl",
	"es-ES": "es-ES"
};

interface HelpContext {
	client: Client;
	lang: LanguageData;
	categories: CategoryData[];
	perms: DatabaseStructure.UtilsPermsData | undefined;
	prefix: { type: "prefix" | "mention"; string: string };
	guildLang: string | null;
	botName: string;
	banner: string;
	signature: string;
}

type View =
	{ kind: "home" } | { kind: "category"; index: number; page: number };

const text = (content: string) => new TextDisplayBuilder().setContent(content);
const separator = (spacing = SeparatorSpacingSize.Small) =>
	new SeparatorBuilder().setDivider(true).setSpacing(spacing);
const colorOf = (hex: string) => {
	const value = parseInt(hex.replace("#", ""), 16);
	return Number.isFinite(value) ? value : ACCENT.neutral;
};

/** The two category menus (Discord: 25 options each), with the current category ticked. */
function categoryMenus(
	ctx: HelpContext,
	selected: number | null,
	disabled: boolean
): ActionRowBuilder<StringSelectMenuBuilder>[] {
	const perMenu = Math.ceil(ctx.categories.length / MENUS);
	return Array.from({ length: MENUS }, (_, m) => {
		const menu = new StringSelectMenuBuilder()
			.setCustomId(`${ID.menu}${m + 1}`)
			.setPlaceholder(ctx.lang.help_select_menu)
			.setDisabled(disabled)
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(ctx.lang.help_back_to_menu)
					.setDescription(ctx.lang.help_back_to_menu_desc)
					.setValue(BACK)
					.setEmoji(ctx.client.iHorizon_Emojis.Home)
			);
		ctx.categories
			.slice(m * perMenu, (m + 1) * perMenu)
			.forEach((category, k) => {
				const index = m * perMenu + k;
				menu.addOptions(
					new StringSelectMenuOptionBuilder()
						.setLabel(category.name)
						.setDescription(
							ctx.lang.help_select_menu_fields_desc.replace(
								"${commandCount}",
								String(category.value.length)
							)
						)
						.setValue(String(index))
						.setEmoji(category.emoji)
						.setDefault(index === selected)
				);
			});
		return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			menu
		);
	});
}

/** The /perm state of a command: open, or locked (level, roles, members). */
function lockState(ctx: HelpContext, cmd: string): string {
	const e = ctx.client.iHorizon_Emojis;
	let state = ctx.perms?.[cmd];
	if (typeof state === "number")
		state = { users: [], roles: [], level: state };
	if (!state) return e.Unlock;
	const parts: string[] = [];
	if ((state.level ?? 0) > 0) parts.push(`${state.level}`);
	if (state.roles.length)
		parts.push(`${state.roles.length} ${ctx.lang.var_roles}`);
	if (state.users.length)
		parts.push(`${state.users.length} ${ctx.lang.var_member}`);
	return parts.length ? `${e.Lock} ${parts.join(" · ")}` : e.Unlock;
}

function descriptionOf(ctx: HelpContext, command: BotContent): string {
	const locale = ctx.guildLang
		? DESCRIPTION_LOCALE[ctx.guildLang]
		: undefined;
	const localized = locale
		? command.desc_localized?.[
				locale as keyof typeof command.desc_localized
			]
		: undefined;
	return localized || command.desc;
}

interface Entry {
	cmd: string;
	text: string;
}

/**
 * One command, always laid out the same way so the rows line up: the command first (its clickable mention,
 * or its prefix form when it has no slash command), then its description, then its other form and its
 * /perm state. The emojis close the lines, never open them.
 */
async function commandEntry(
	ctx: HelpContext,
	command: BotContent
): Promise<Entry> {
	const name = command.prefixCmd || command.cmd;
	const prefixForm =
		ctx.prefix.type === "mention"
			? `\`@${ctx.botName} ${name}\``
			: `\`${ctx.prefix.string}${name}\``;
	const hasSlash = command.messageCmd === 0 || command.messageCmd === 2;
	const hasPrefix = command.messageCmd === 1 || command.messageCmd === 2;
	const head = hasSlash
		? await commandMention(ctx.client, command.cmd)
		: `**${prefixForm}**`;
	const meta = [
		hasSlash && hasPrefix && prefixForm,
		lockState(ctx, command.cmd)
	]
		.filter(Boolean)
		.join(" · ");
	return {
		cmd: command.cmd,
		text: `${head}\n-# ${descriptionOf(ctx, command)}\n-# ${meta}`
	};
}

/** A category's entries in pages: PAGE_SIZE commands at most, and under Discord's text limit. */
async function categoryPages(
	ctx: HelpContext,
	category: CategoryData
): Promise<Entry[][]> {
	const pages: Entry[][] = [[]];
	let size = 0;
	for (const command of category.value) {
		const entry = await commandEntry(ctx, command);
		const page = pages[pages.length - 1];
		if (
			page.length &&
			(page.length >= PAGE_SIZE ||
				size + entry.text.length > PAGE_TEXT_MAX)
		) {
			pages.push([entry]);
			size = entry.text.length;
		} else {
			page.push(entry);
			size += entry.text.length;
		}
	}
	return pages;
}

/** A category's description is stored as a quote in italics ("> *...*"): shown as plain text under the title. */
const plainDescription = (description: string) =>
	description
		.replace(/^>\s*/, "")
		.replace(/^\*(.*)\*$/s, "$1")
		.trim();

function footer(ctx: HelpContext, extra?: string): TextDisplayBuilder {
	return text(`-# ${[extra, ctx.signature].filter(Boolean).join(" · ")}`);
}

async function homeView(
	ctx: HelpContext,
	disabled: boolean
): Promise<ContainerBuilder> {
	const { lang, client } = ctx;
	const e = client.iHorizon_Emojis;
	const owners = client.owners
		.slice(0, 2)
		.map((id) => `<@${id}>`)
		.join(", ");
	const commandCount = ctx.categories.reduce((n, c) => n + c.value.length, 0);

	return new ContainerBuilder()
		.setAccentColor(ACCENT.neutral)
		.addSectionComponents(
			new SectionBuilder()
				.addTextDisplayComponents(
					text(
						`## ${e.Pages} ${lang.help_home_title.replace("${botName}", ctx.botName)}\n${lang.help_home_intro}`
					)
				)
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(AVATAR))
		)
		.addMediaGalleryComponents(
			new MediaGalleryBuilder().addItems(
				new MediaGalleryItemBuilder().setURL(ctx.banner)
			)
		)
		.addSeparatorComponents(separator(SeparatorSpacingSize.Large))
		.addTextDisplayComponents(
			text(
				[
					lang.help_home_stats
						.replace(
							"${categoryCount}",
							String(ctx.categories.length)
						)
						.replace("${commandCount}", String(commandCount)),
					owners &&
						lang.help_home_creators.replace("${owners}", owners),
					lang.help_home_tip
						.replace("${botName}", ctx.botName)
						.replace(
							"${command}",
							await commandMention(client, "setlang")
						)
				]
					.filter(Boolean)
					.join("\n")
			)
		)
		.addSeparatorComponents(separator())
		.addActionRowComponents(...categoryMenus(ctx, null, disabled))
		.addActionRowComponents(
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				link(lang.help_search_button, SEARCH_URL, e.Search),
				link(lang.welcome_btn_dashboard, DASHBOARD_URL, e.Home),
				link(lang.guild_create_btn_docs, DOCS_URL, e.Documentation),
				link(lang.guild_create_btn_support, SUPPORT_URL, e.Logo)
			)
		)
		.addTextDisplayComponents(footer(ctx));
}

function categoryView(
	ctx: HelpContext,
	index: number,
	pages: Entry[][],
	page: number,
	disabled: boolean
): ContainerBuilder {
	const category = ctx.categories[index];
	const container = new ContainerBuilder()
		.setAccentColor(colorOf(category.color))
		.addTextDisplayComponents(
			text(
				`## ${category.emoji} ${category.name}\n${plainDescription(category.description)}`
			)
		)
		.addSeparatorComponents(separator(SeparatorSpacingSize.Large));
	// One section per command: Discord lines the text up on the left and the button on the right.
	for (const entry of pages[page])
		container.addSectionComponents(
			new SectionBuilder()
				.addTextDisplayComponents(text(entry.text))
				.setButtonAccessory(
					new ButtonBuilder()
						.setCustomId(`${ID.details}${entry.cmd}`)
						.setLabel(ctx.lang.help_details_button)
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(disabled)
				)
		);
	container
		.addSeparatorComponents(separator())
		.addTextDisplayComponents(
			footer(
				ctx,
				[
					pages.length > 1 && pageLabel(ctx.lang, page, pages.length),
					ctx.lang.help_select_menu_fields_desc.replace(
						"${commandCount}",
						String(category.value.length)
					)
				]
					.filter(Boolean)
					.join(" · ")
			)
		);
	if (pages.length > 1)
		container.addActionRowComponents(
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(ID.previous)
					.setLabel(ctx.lang.var_previous)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(disabled || page === 0),
				new ButtonBuilder()
					.setCustomId(ID.next)
					.setLabel(ctx.lang.var_next)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(disabled || page === pages.length - 1)
			)
		);
	return container.addActionRowComponents(
		...categoryMenus(ctx, index, disabled)
	);
}

/** The details of one command (usage, permission, aliases), as a card. */
async function commandCard(
	client: Client,
	lang: LanguageData,
	interaction: ChatInputCommandInteraction<"cached"> | Message,
	command: Command,
	signature: string
): Promise<ContainerBuilder> {
	const embed = (
		await client.func.method.createAwesomeEmbed(
			lang,
			command,
			client,
			interaction
		)
	).toJSON();
	return buildCard({
		accent: ACCENT.neutral,
		emoji: client.iHorizon_Emojis.Slash_Bot_Badge,
		title: command.prefixName || command.name,
		description: embed.description ?? null,
		thumbnail: AVATAR,
		blocks: (embed.fields ?? []).map(
			(field) => `**${field.name}**\n${field.value}`
		),
		signature
	});
}

/** A command of the help by its path ("mod ban" -> the "mod" command). */
const findCommand = (client: Client, path: string) =>
	client.commands.get(path) ||
	client.message_commands.get(path) ||
	client.commands.get(path.split(" ")[0]) ||
	client.message_commands.get(path.split(" ")[0]);

/** The help entry of a command: by its path ("mod ban"), its prefix name ("ban") or an alias. */
function findEntry(client: Client, path: string): BotContent | undefined {
	const wanted = path.trim().toLowerCase();
	return (
		client.content.find((c) => c.cmd.toLowerCase() === wanted) ??
		client.content.find(
			(c) =>
				c.prefixCmd?.toLowerCase() === wanted ||
				c.aliases?.some((a) => a.toLowerCase() === wanted)
		)
	);
}

/** The definition of a subcommand inside its root command ("mod ban" -> the "ban" option of "mod"). */
function findOption(root: Command, path: string): Command | Option | null {
	let node: Command | Option = root;
	for (const name of path.split(" ").slice(1)) {
		const next: Option | undefined = node.options?.find(
			(o) => o.name === name
		);
		if (!next) return null;
		node = next;
	}
	return node;
}

/** Who can run it: its Discord permission, or the server's /perm rule (level, roles, members). */
function permissionText(
	ctx: HelpContext,
	node: Command | Option | null,
	cmd: string
): string {
	const { client, lang } = ctx;
	let text = "";
	if (node?.permission) {
		const found = client.func.permissonsCalculator.getPermissionByValue(
			node.permission
		);
		if (found)
			text = (Array.isArray(found) ? found : [found])
				.filter(Boolean)
				.map((p) => String(lang[p.name]))
				.join(", ");
	}
	let rule = ctx.perms?.[cmd];
	if (typeof rule === "number") rule = { users: [], roles: [], level: rule };
	if (rule?.level) text = String(rule.level);
	if (rule?.roles?.length)
		text = rule.roles.map((id) => `<@&${id}>`).join(", ");
	if (rule?.users?.length)
		text = [text, rule.users.map((id) => `<@${id}>`).join(", ")]
			.filter(Boolean)
			.join(", ");
	return text || lang.setjoinroles_var_none;
}

/** One command's card: its description, how to run it, who can, its aliases. */
async function entryCard(
	ctx: HelpContext,
	entry: BotContent
): Promise<ContainerBuilder> {
	const { client, lang } = ctx;
	const e = client.iHorizon_Emojis;
	const root = findCommand(client, entry.cmd);
	const node = root ? findOption(root, entry.cmd) : null;
	const name = entry.prefixCmd || entry.cmd;
	const prefix =
		ctx.prefix.type === "mention" ? `@${ctx.botName} ` : ctx.prefix.string;
	const hasSlash = entry.messageCmd === 0 || entry.messageCmd === 2;
	const hasPrefix = entry.messageCmd === 1 || entry.messageCmd === 2;
	const usage = [
		hasSlash &&
			`${e.Slash_Bot_Badge} ${await commandMention(client, entry.cmd)}`,
		hasPrefix &&
			`${e.Message_Commands} \`${prefix}${name}${entry.usage ? ` ${entry.usage}` : ""}\``,
		// What [ ] and < > mean, under a prefix form that has arguments.
		hasPrefix && entry.usage && `-# *${lang.help_usage_legend}*`
	]
		.filter(Boolean)
		.join("\n");
	const aliases =
		(entry.aliases ?? node?.aliases ?? [])
			.map((a) => `\`${a}\``)
			.join(", ") || lang.setjoinroles_var_none;
	return buildCard({
		accent: ACCENT.neutral,
		emoji: e.Slash_Bot_Badge,
		title: entry.cmd,
		description: descriptionOf(ctx, entry),
		thumbnail: AVATAR,
		blocks: [
			`**${lang.var_usage}**\n${usage}`,
			`**${lang.var_permission}**\n${permissionText(ctx, node, entry.cmd)}`,
			`**${lang.var_aliases}**\n${aliases}`
		],
		signature: ctx.signature
	});
}

/** The details card of `path`: the exact command, or (a root that only groups subcommands, "mod") its overview. */
async function detailsCard(
	ctx: HelpContext,
	interaction: ChatInputCommandInteraction<"cached"> | Message,
	path: string
): Promise<ContainerBuilder | null> {
	const entry = findEntry(ctx.client, path);
	const root = findCommand(ctx.client, entry?.cmd ?? path);
	const groupsOnly =
		!!root &&
		!entry?.cmd.includes(" ") &&
		!!root.options?.some(
			(o) =>
				o.type === ApplicationCommandOptionType.Subcommand ||
				o.type === ApplicationCommandOptionType.SubcommandGroup
		);
	if (entry && !groupsOnly) return entryCard(ctx, entry);
	return root
		? commandCard(ctx.client, ctx.lang, interaction, root, ctx.signature)
		: null;
}

const link = (label: string, url: string, emoji: string) =>
	new ButtonBuilder()
		.setStyle(ButtonStyle.Link)
		.setLabel(label)
		.setURL(url)
		.setEmoji(emoji);

export const command: Command = {
	name: "help",

	description: "Get a list of all the commands!",
	description_localizations: {
		fr: "Obtenir la liste de toute les commandes",
		ja: "全コマンドのリストを取得！",
		ru: "Получить список всех команд!",
		"es-ES": "Obtener una lista de todos los comandos!",
		ko: "모든 명령어 목록을 확인해요!",
		uk: "Отримати список усіх команд!",
		de: "Zeige eine Liste aller Befehle!",
		it: "Ottieni l'elenco di tutti i comandi!",
		"pt-BR": "Veja a lista de todos os comandos!",
		pl: "Pokaż listę wszystkich komend!"
	},

	options: [
		{
			name: "command-name",

			description: "The command name you want information",
			description_localizations: {
				fr: "La commandes sur laquelle vous voulez des info",
				ja: "情報が欲しいコマンド名",
				ru: "Имя команды, о которой нужна информация",
				"es-ES": "El nombre del comando del que quieres información",
				ko: "정보를 볼 명령어 이름",
				uk: "Назва команди, про яку потрібна інформація",
				de: "Name des Befehls, zu dem du Infos willst",
				it: "Nome del comando di cui vuoi informazioni",
				"pt-BR": "Nome do comando sobre o qual você quer informações",
				pl: "Nazwa komendy, o której chcesz informacje"
			},

			type: ApplicationCommandOptionType.String,
			required: false,
			permission: null
		}
	],
	category: "bot",
	thinking: false,
	type: ApplicationCommandType.ChatInput,
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

		const opts = client.func.method.options(interaction, args);
		const targetCommand = opts.string("command-name", 0);
		const signature = await botSignature(client, interaction.guildId);
		const avatar =
			await client.func.displayBotName.footerAttachmentBuilder(
				interaction
			);

		// A slash command with subcommands is listed by its subcommands only: its root ("/honeypot") is not a
		// command you can run (the slash loader still records it in client.content).
		const groups = new Set(
			client.content
				.filter((c) => c.cmd.includes(" "))
				.map((c) => c.cmd.split(" ")[0])
		);
		const categories: CategoryData[] = client.category
			.map((cat) => ({
				name: String(
					lang[cat.options.placeholder as keyof LanguageData]
				),
				value: client.content.filter(
					(c) =>
						c.category === cat.categoryName &&
						!(groups.has(c.cmd) && !c.cmd.includes(" "))
				),
				inline: false,
				description: String(
					lang[cat.options.description as keyof LanguageData]
				),
				color: cat.categoryColor,
				emoji: cat.options.emoji
			}))
			.sort((a, b) => a.name.localeCompare(b.name));

		const ctx: HelpContext = {
			client,
			lang,
			categories,
			perms: (await client.db.get(
				`${interaction.guildId}.UTILS.PERMS`
			)) as DatabaseStructure.UtilsPermsData | undefined,
			prefix: await client.func.prefix.guildPrefix(
				client,
				interaction.guild.id
			),
			guildLang: (await client.db.get(
				`${interaction.guildId}.GUILD.LANG.lang`
			)) as string | null,
			botName: client.user.username,
			banner: await client.func.bannerGenerator(interaction.guildId),
			signature
		};

		if (targetCommand) {
			const card = await detailsCard(ctx, interaction, targetCommand);
			if (!card) {
				await client.func.method.interactionSend(interaction, {
					content:
						client.iHorizon_Emojis.No +
						" | " +
						lang.var_unreachable_command
				});
				return;
			}
			await client.func.method.interactionSend(interaction, {
				...cardPayload(card),
				flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
				files: [avatar]
			} as never);
			return;
		}

		// Pages of a category, built once per message.
		const paged = new Map<number, Entry[][]>();
		const pagesOf = async (index: number) => {
			let pages = paged.get(index);
			if (!pages) {
				pages = await categoryPages(ctx, categories[index]);
				paged.set(index, pages);
			}
			return pages;
		};
		let view: View = { kind: "home" };
		const render = async (disabled: boolean) =>
			view.kind === "home"
				? homeView(ctx, disabled)
				: categoryView(
						ctx,
						view.index,
						await pagesOf(view.index),
						view.page,
						disabled
					);

		const response = await client.func.method.interactionSend(interaction, {
			...cardPayload(await render(false)),
			files: [avatar]
		} as never);

		const authorId = client.func.method.authorOf(interaction).id;
		const collector = response.createMessageComponentCollector({
			time: TIMEOUT_MS
		});

		collector.on("collect", async (i) => {
			if (i.user.id !== authorId) {
				await i.reply({
					content: lang.help_not_for_you,
					flags: [MessageFlags.Ephemeral]
				});
				return;
			}

			if (i.isStringSelectMenu() && i.customId.startsWith(ID.menu)) {
				const value = i.values[0];
				view =
					value === BACK
						? { kind: "home" }
						: { kind: "category", index: Number(value), page: 0 };
			} else if (i.isButton() && i.customId.startsWith(ID.details)) {
				// A command's details, privately; the help stays where it is.
				const card = await detailsCard(
					ctx,
					interaction,
					i.customId.slice(ID.details.length)
				);
				if (!card) return;
				await i.reply({
					...cardPayload(card),
					flags: [
						MessageFlags.IsComponentsV2,
						MessageFlags.Ephemeral
					],
					files: [avatar]
				} as never);
				return;
			} else if (i.isButton() && view.kind === "category") {
				const pages = await pagesOf(view.index);
				if (i.customId === ID.previous)
					view = { ...view, page: Math.max(0, view.page - 1) };
				else if (i.customId === ID.next)
					view = {
						...view,
						page: Math.min(pages.length - 1, view.page + 1)
					};
				else return;
			} else return;

			await i.update({ components: [await render(false)] });
		});

		collector.on("end", async () => {
			await response
				.edit({
					components: [await render(true)],
					flags: [MessageFlags.IsComponentsV2]
				} as never)
				.catch(() => undefined);
		});
	},
	permission: null
};
