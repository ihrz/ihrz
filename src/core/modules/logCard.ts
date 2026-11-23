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

// Components V2 card for everything the bot posts in a server's log channels
// (`GUILD.SERVER_LOGS.*`, the ihorizon-logs setup message, confession logs):
// one look for every log — an accent per kind, `## emoji title`, the author's
// avatar as the header thumbnail, the event's attachments shown in the card,
// then the bot name and the time (`<t:…:F>`, no embed timestamp). Mentions
// never ping.

import {
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder,
	Client,
	ContainerBuilder,
	FileBuilder,
	Message,
	MessageFlags,
	SeparatorBuilder,
	TextDisplayBuilder
} from "discord.js";

import { buildCard, CardField } from "./uiCard.js";

/** What the entry says, not which event sent it. */
export type LogKind = "danger" | "edit" | "success" | "info" | "boost";

export const LOG_ACCENT: Record<LogKind, number> = {
	danger: 0xed4245, // deleted, banned, kicked, left, removed
	edit: 0xf0b232, // edited, updated
	success: 0x57f287, // added, unbanned, joined
	info: 0x5865f2, // neutral activity
	boost: 0xf47fff // server boosts
};

/** A file sent with the log. `image: true` shows it in the gallery. */
export interface LogAttachment {
	file: AttachmentBuilder;
	image?: boolean;
}

export interface LogCardOptions {
	kind: LogKind;
	title: string;
	/** A pack emoji (client.iHorizon_Emojis.X). */
	emoji?: string;
	description?: string | null;
	/** The avatar of whoever the entry is about. */
	thumbnail?: string | null;
	fields?: (CardField | null | undefined | false)[];
	/** Markdown blocks, each after a separator. */
	blocks?: (string | null | undefined | false)[];
	attachments?: LogAttachment[];
	/** Buttons under the entry (kept inside the card). */
	rows?: ActionRowBuilder<ButtonBuilder>[];
	/** When it happened (ms), defaults to now. */
	timestamp?: number;
}

/** Discord shows at most 10 items in one media gallery. */
const GALLERY_MAX = 10;

/** File name usable in `attachment://` (no spaces or odd characters). */
export function safeAttachmentName(name: string, index: number): string {
	const clean = (name || "file").replace(/[^\w.-]+/g, "_").slice(-80);
	return `${index}_${clean}`;
}

export function buildLogCard(
	o: LogCardOptions,
	signature: string | null
): ContainerBuilder {
	const attachments = o.attachments ?? [];
	const images = attachments.filter((a) => a.image).slice(0, GALLERY_MAX);
	const others = attachments.filter((a) => !images.includes(a));

	const container = buildCard({
		accent: LOG_ACCENT[o.kind],
		title: o.title,
		emoji: o.emoji,
		description: o.description,
		thumbnail: o.thumbnail,
		fields: o.fields,
		blocks: o.blocks,
		images: images.map((a) => `attachment://${a.file.name}`)
	});

	if (others.length) {
		container.addSeparatorComponents(new SeparatorBuilder());
		for (const a of others) {
			container.addFileComponents(
				new FileBuilder().setURL(`attachment://${a.file.name}`)
			);
		}
	}
	for (const row of o.rows ?? []) container.addActionRowComponents(row);

	const at = Math.floor((o.timestamp ?? Date.now()) / 1000);
	container.addSeparatorComponents(new SeparatorBuilder());
	container.addTextDisplayComponents(
		new TextDisplayBuilder().setContent(
			`-# ${signature ? `${signature} · ` : ""}<t:${at}:F>`
		)
	);
	return container;
}

/** The message body: V2 flag, the files the card shows, no pings. */
export function logCardPayload(o: LogCardOptions, signature: string | null) {
	return {
		components: [buildLogCard(o, signature)],
		files: (o.attachments ?? []).map((a) => a.file),
		flags: [MessageFlags.IsComponentsV2] as const,
		allowedMentions: { parse: [] as [] }
	};
}

interface LogChannel {
	id: string;
	guildId?: string | null;
	client: { func: Client["func"] };
	isSendable(): boolean;
	send(options: unknown): Promise<Message>;
}

/**
 * Posts a log card in `channel` (anything from `guild.channels.cache`).
 * Never throws; returns the message, or null when nothing was sent.
 */
export async function sendLogCard(
	channel: unknown,
	o: LogCardOptions
): Promise<Message | null> {
	try {
		const target = channel as LogChannel | null | undefined;
		if (!target?.isSendable?.()) return null;
		const footer = await target.client.func.displayBotName
			.footerBuilder(target.guildId ?? null)
			.catch(() => null);
		return await target.send(logCardPayload(o, footer?.text ?? null));
	} catch {
		return null;
	}
}
