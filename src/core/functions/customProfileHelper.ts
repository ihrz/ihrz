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

import { Guild } from "discord.js";
import { axios } from "./axios.js";

// https://discord.com/developers/docs/resources/guild#modify-current-member
export const GUILD_ME_WITH_GUILD_ID_ENDPOINT_URL =
	"https://discord.com/api/v10/guilds/{guild.id}/members/@me";

export async function changeGuildBotName(
	guild: Guild,
	nick: string
): Promise<boolean> {
	const res = await fetch(
		GUILD_ME_WITH_GUILD_ID_ENDPOINT_URL.replace("{guild.id}", guild.id),
		{
			method: "PATCH",
			headers: {
				Authorization: `Bot ${client.token}`,
				"X-Audit-Log-Reason": "OWNIHRZ INSIDE IHORIZON",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				nick
			})
		}
	);

	return res.status === 200;
}

export async function changeGuildBotBanner(
	guild: Guild,
	banner: string
): Promise<boolean> {
	const res = await fetch(
		GUILD_ME_WITH_GUILD_ID_ENDPOINT_URL.replace("{guild.id}", guild.id),
		{
			method: "PATCH",
			headers: {
				Authorization: `Bot ${client.token}`,
				"X-Audit-Log-Reason": "OWNIHRZ INSIDE IHORIZON",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				banner
			})
		}
	);

	return res.status === 200;
}

export async function changeGuildBotAvatar(
	guild: Guild,
	avatar: string
): Promise<boolean> {
	const res = await fetch(
		GUILD_ME_WITH_GUILD_ID_ENDPOINT_URL.replace("{guild.id}", guild.id),
		{
			method: "PATCH",
			headers: {
				Authorization: `Bot ${client.token}`,
				"X-Audit-Log-Reason": "OWNIHRZ INSIDE IHORIZON",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				avatar
			})
		}
	);

	return res.status === 200;
}

/** The bio sent to Discord: null clears it (the application's description shows). */
export function guildBioPayload(bio: string | null): string | null {
	if (bio === null) return null;
	const sanitizeBio =
		bio.length <= 190 ? bio : bio.split("\n").slice(0, 2).join("\n");
	return [...sanitizeBio].slice(0, 190).join("");
}

export async function changeGuildBotBio(
	guild: Guild,
	bio: string | null
): Promise<boolean> {
	const finalBio = guildBioPayload(bio);

	const res = await fetch(
		GUILD_ME_WITH_GUILD_ID_ENDPOINT_URL.replace("{guild.id}", guild.id),
		{
			method: "PATCH",
			headers: {
				Authorization: `Bot ${client.token}`,
				"X-Audit-Log-Reason": "OWNIHRZ INSIDE IHORIZON",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ bio: finalBio })
		}
	);

	return res.status === 200;
}

// Server bio in the guild language (setserverlang, dashboard language change).
export async function applyLanguageBio(
	guild: Guild,
	langCode: string
): Promise<boolean> {
	const lang = await client.func.getLanguageDataByCode(langCode);

	if (!lang.bot_server_bio) return false;

	return changeGuildBotBio(guild, buildServerBio(lang.bot_server_bio));
}

// Emoji slots of the server bio templates (`bot_server_bio`), filled with the
// application emojis (src/assets/emojis, `iHorizon_` prefix dropped). The 2x2
// logo (ih1..ih4) keeps short names on purpose: a server bio is capped at 190
// characters and a `<:name:id>` counts in full.
const BIO_EMOJIS = {
	wink_emoji: "Wink",
	home_emoji: "Home",
	logo_tl: "ih1",
	logo_tr: "ih2",
	logo_bl: "ih3",
	logo_br: "ih4"
};

/** The server bio of a language: command count and emojis filled in. */
export function buildServerBio(
	template: string,
	emojis: Record<
		string,
		string
	> = client.iHorizon_Emojis as unknown as Record<string, string>,
	commandCount: number = client.content.length
): string {
	let bio = template.replaceAll("{count}", String(commandCount));
	for (const [slot, name] of Object.entries(BIO_EMOJIS)) {
		// Not created yet (first boot of a new instance): leave the slot empty.
		bio = bio.replaceAll(`{${slot}}`, emojis[name] ?? "");
	}
	return bio;
}

// /custom bio refuses 400 characters and more.
export const MAX_CUSTOM_BIO_LENGTH = 399;

// /custom bio reset: no server bio at all, so Discord shows the
// application's own description (the full "About me", links included) —
// copying it here was cut at 190 characters and went stale when it changed.
export async function resetGuildBotBio(guild: Guild): Promise<boolean> {
	return changeGuildBotBio(guild, null);
}

// /custom banner: the image goes as a data URI, like the commands send it.
export function bannerDataUri(image: Buffer): string {
	return `data:image/jpeg;base64,${image.toString("base64")}`;
}

// /custom banner reset: the banner of the bot's profile.
/** Back to the bot's global avatar on this server, like `/custom avatar reset`. */
export async function resetGuildBotAvatar(guild: Guild): Promise<boolean> {
	const url = client.user?.avatarURL({ size: 4096, extension: "png" });
	if (!url) return false;
	const fileBuffer = (await axios.get(url, { responseType: "arrayBuffer" }))
		.data;
	return changeGuildBotAvatar(guild, bannerDataUri(Buffer.from(fileBuffer)));
}

export async function resetGuildBotBanner(guild: Guild): Promise<boolean> {
	const fileBuffer = (
		await axios.get(client.func.retrieveMyself.retrieveBanner(), {
			responseType: "arrayBuffer"
		})
	).data;
	return changeGuildBotBanner(guild, bannerDataUri(Buffer.from(fileBuffer)));
}
