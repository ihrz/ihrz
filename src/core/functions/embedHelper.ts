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

import { Message } from "discord.js";

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
