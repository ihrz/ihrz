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

// Components V2 cards shared by the commands that used to answer with
// embeds: one look everywhere (accent colour, "## emoji title", one field per
// line, separators between blocks, the guild's bot name as a quiet signature)
// and one paginator.

import {
	ActionRowBuilder,
	AttachmentBuilder,
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
	TextDisplayBuilder,
	ThumbnailBuilder
} from "discord.js";

import { LanguageData } from "../../../types/languageData.js";

/** Accent colours: pick by what the card says, not by command. */
export const ACCENT = {
	info: 0x6fa8dc,
	success: 0x57f287,
	danger: 0xed4245,
	warning: 0xfee75c,
	neutral: 0x5865f2
} as const;

export type NoticeKind = "success" | "danger" | "warning" | "info";

export interface CardField {
	label: string;
	value: string;
	/** A pack emoji (client.iHorizon_Emojis.X). */
	emoji?: string;
}

export interface CardOptions {
	accent?: number;
	/** Plain title; shown as `## emoji title`. */
	title: string;
	emoji?: string;
	/** Markdown under the title. */
	description?: string | null;
	/** Small image on the right of the header (avatar, server icon). */
	thumbnail?: string | null;
	/** One line each: `emoji **label**: value`. */
	fields?: (CardField | null | undefined | false)[];
	/** Markdown blocks, each after a separator. Falsy entries are skipped. */
	blocks?: (string | null | undefined | false)[];
	/** Large images (avatar, banner…), shown in a gallery. */
	images?: (string | null | undefined)[];
	/** Small text after the signature (page number, counts…). */
	footer?: string | null;
	/** From botSignature(); omitted when null. */
	signature?: string | null;
}

/** Discord's limit for one text display; longer text is cut with "…". */
const TEXT_MAX = 3900;

function clip(text: string): string {
	return text.length > TEXT_MAX ? `${text.slice(0, TEXT_MAX - 1)}…` : text;
}

function text(content: string): TextDisplayBuilder {
	return new TextDisplayBuilder().setContent(clip(content));
}

/** The guild's bot name (custom bots keep their own name). */
export async function botSignature(
	client: Client,
	guildId: string | null | undefined
): Promise<string> {
	const footer = await client.func.displayBotName.footerBuilder(guildId);
	return footer.text;
}

export function fieldLines(
	fields: (CardField | null | undefined | false)[]
): string {
	return fields
		.filter((f): f is CardField => !!f && !!f.value)
		.map(
			(f) => `${f.emoji ? `${f.emoji} ` : ""}**${f.label}** : ${f.value}`
		)
		.join("\n");
}

/** One card. Add action rows to the returned container if needed. */
export function buildCard(o: CardOptions): ContainerBuilder {
	const container = new ContainerBuilder().setAccentColor(
		o.accent ?? ACCENT.info
	);
	const head = [`## ${o.emoji ? `${o.emoji} ` : ""}${o.title}`];
	if (o.description) head.push(o.description);
	const headText = text(head.join("\n"));
	if (o.thumbnail) {
		container.addSectionComponents(
			new SectionBuilder()
				.addTextDisplayComponents(headText)
				.setThumbnailAccessory(
					new ThumbnailBuilder().setURL(o.thumbnail)
				)
		);
	} else {
		container.addTextDisplayComponents(headText);
	}

	const images = (o.images ?? []).filter((u): u is string => !!u);
	if (images.length) {
		container.addMediaGalleryComponents(
			new MediaGalleryBuilder().addItems(
				images
					.slice(0, 10)
					.map((url) => new MediaGalleryItemBuilder().setURL(url))
			)
		);
	}

	const fields = o.fields ? fieldLines(o.fields) : "";
	const blocks = [fields, ...(o.blocks ?? [])].filter(
		(b): b is string => !!b
	);
	for (const [i, block] of blocks.entries()) {
		container.addSeparatorComponents(
			new SeparatorBuilder().setSpacing(
				i === 0
					? SeparatorSpacingSize.Large
					: SeparatorSpacingSize.Small
			)
		);
		container.addTextDisplayComponents(text(block));
	}

	const foot = [o.signature, o.footer].filter(Boolean).join(" · ");
	if (foot) {
		container.addSeparatorComponents(new SeparatorBuilder());
		container.addTextDisplayComponents(text(`-# ${foot}`));
	}
	return container;
}

/** A short result card: one line with an accent, for actions. */
export function notice(kind: NoticeKind, content: string): ContainerBuilder {
	return new ContainerBuilder()
		.setAccentColor(ACCENT[kind])
		.addTextDisplayComponents(text(content));
}

/** Message payload for Components V2 containers; mentions never ping. */
export function cardPayload(...containers: ContainerBuilder[]) {
	return {
		components: containers,
		flags: [MessageFlags.IsComponentsV2] as const,
		allowedMentions: { parse: [] }
	};
}

type Source = ChatInputCommandInteraction<"cached"> | Message;

/**
 * Like sendCard, with attachments (generated images…). Show an attachment in
 * the card with `images: ["attachment://name.png"]` (same file name).
 */
export async function sendCardWithFiles(
	client: Client,
	interaction: Source,
	files: (AttachmentBuilder | { attachment: unknown; name: string })[],
	...containers: ContainerBuilder[]
): Promise<Message> {
	return client.func.method.interactionSend(interaction, {
		...cardPayload(...containers),
		files
	} as never);
}

export async function sendCard(
	client: Client,
	interaction: Source,
	...containers: ContainerBuilder[]
): Promise<Message> {
	return client.func.method.interactionSend(
		interaction,
		cardPayload(...containers) as never
	);
}

/** `Page 2/5`, with the shared wording. */
export function pageLabel(
	lang: LanguageData,
	page: number,
	pages: number
): string {
	return `${lang.var_page} ${page + 1}/${pages}`;
}

const NAV = {
	previous: "uicard_previous",
	next: "uicard_next"
} as const;

export interface PaginatedOptions {
	client: Client;
	interaction: Source;
	lang: LanguageData;
	pages: number;
	/** Build page `page` (0-based); buttons are added after it. */
	render: (page: number) => ContainerBuilder | Promise<ContainerBuilder>;
	/** How long the buttons work (default 5 min). */
	timeoutMs?: number;
}

/**
 * Sends `render(0)` with Previous / Next when there is more than one page.
 * Only the author can turn pages; others get an ephemeral note. The buttons
 * are disabled when time runs out.
 */
export async function sendPaginatedCard(o: PaginatedOptions): Promise<Message> {
	const { client, interaction, lang, pages } = o;
	const authorId =
		interaction instanceof Message
			? interaction.author.id
			: interaction.user.id;
	let page = 0;

	const withNav = async (
		p: number,
		disabled: boolean
	): Promise<ContainerBuilder> => {
		const container = await o.render(p);
		if (pages > 1) {
			container.addActionRowComponents(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setCustomId(NAV.previous)
						.setLabel(lang.var_previous)
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(disabled),
					new ButtonBuilder()
						.setCustomId(NAV.next)
						.setLabel(lang.var_next)
						.setStyle(ButtonStyle.Secondary)
						.setDisabled(disabled)
				)
			);
		}
		return container;
	};

	const message = await sendCard(
		client,
		interaction,
		await withNav(0, false)
	);
	if (pages < 2) return message;

	const collector = message.createMessageComponentCollector({
		time: o.timeoutMs ?? 5 * 60_000
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
		if (i.customId === NAV.previous) page = (page - 1 + pages) % pages;
		else if (i.customId === NAV.next) page = (page + 1) % pages;
		else return;
		await i.update({ components: [await withNav(page, false)] });
	});
	collector.on("end", async () => {
		await message
			.edit({
				...cardPayload(await withNav(page, true)),
				flags: [MessageFlags.IsComponentsV2]
			} as never)
			.catch(() => undefined);
	});
	return message;
}
