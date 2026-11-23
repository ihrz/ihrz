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

import { APIEmbed, Message } from "discord.js";

// Utility functions
export function isValidLink(url: string): boolean {
	return ["https://", "http://"].some((protocol) => url.startsWith(protocol));
}

export function isValidColor(color: string): boolean {
	return /^#([0-9a-f]{3}){1,2}$/i.test(color);
}

export function isValidEmbedId(id: unknown): id is string {
	if (typeof id !== "string" || id.length === 0) return false;
	const key = `EMBED.${id}`;
	if (new TextEncoder().encode(key).length > 255) return false;
	const segments = key.split(".");
	if (segments.length > 32) return false;
	if (segments.some((segment) => segment.length === 0)) return false;
	return true;
}

export function getMediaByMessage(message: Message): {
	name: string;
	attachment: string;
} {
	if (isValidLink(message.content)) {
		return { name: "url", attachment: message.content };
	}

	const attachment = message.attachments.first();
	if (attachment?.contentType?.startsWith("image/")) {
		const name = client.func.method.isAnimated(attachment.url)
			? "image.gif"
			: "image.png";
		return { attachment: attachment.url, name };
	}

	return { name: "none", attachment: "" };
}

export type EmbedMediaKind = "footer" | "image" | "thumbnail";

/**
 * File name of a media uploaded in the embed builder: one name per kind, so
 * an uploaded image and an uploaded thumbnail never collide on the message.
 */
export function uploadedMediaName(kind: EmbedMediaKind, name: string): string {
	return `${kind}-${name}`;
}

const isUploaded = (url: unknown): boolean =>
	typeof url === "string" && url.startsWith("attachment://");

/**
 * The embed as it can be saved under a code. A media uploaded as a file
 * (`attachment://…`) only exists on the builder's message: the tags, sticky
 * messages, tickets and welcomer that reuse the code send the embed without
 * that file, so it is left out and `dropped` tells the author.
 */
export function withoutUploadedMedia(embed: APIEmbed): {
	embed: APIEmbed;
	dropped: boolean;
} {
	const result: APIEmbed = { ...embed };
	let dropped = false;

	if (isUploaded(result.image?.url)) {
		delete result.image;
		dropped = true;
	}
	if (isUploaded(result.thumbnail?.url)) {
		delete result.thumbnail;
		dropped = true;
	}
	if (result.footer && isUploaded(result.footer.icon_url)) {
		const { icon_url: _icon, ...footer } = result.footer;
		result.footer = footer;
		dropped = true;
	}

	return { embed: result, dropped };
}

/** "Replace embed" edits the message: Discord only lets a bot edit its own. */
export function canReplaceEmbedOf(
	message: { author: { id: string } },
	botId: string | undefined
): boolean {
	return !!botId && message.author.id === botId;
}

/** An embed saved under a code (`metas` / `EMBED.{code}`, `DbEmbedObject`). */
export interface SavedEmbed {
	embedOwner?: string;
	embedSource: APIEmbed;
}

/**
 * The embed saved under `code`, or null when the code is not a valid code
 * (`isValidEmbedId`) or nothing usable is saved there. A code with a dot
 * such as `CODE.embedSource` reads INSIDE an embed (`EMBED.CODE.embedSource`
 * is the embed itself, without `embedSource`): it is refused here instead of
 * being saved and then sending nothing.
 */
export async function readSavedEmbed(
	code: unknown,
	get: (key: string) => Promise<unknown>
): Promise<SavedEmbed | null> {
	if (!isValidEmbedId(code)) return null;
	const record = await get(`EMBED.${code}`);
	if (!record || typeof record !== "object") return null;
	const source = (record as { embedSource?: unknown }).embedSource;
	if (!source || typeof source !== "object" || Array.isArray(source))
		return null;
	return record as SavedEmbed;
}
