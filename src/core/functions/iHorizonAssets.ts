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

/**
 * The images iHorizon hosts on its site (www.ihorizon.org/assets/...), every one of them in this enum, and
 * the one function that builds their URL (like apiUrlParser.ts for the gateway's routes).
 *
 * Every URL ends with `?v=<the process start>` (Unix epoch milliseconds, from the process uptime like
 * `+status`): Discord's image proxy keeps one copy per URL, and an image replaced on the site (the banners)
 * kept showing its old version. A new process gives new URLs, so Discord fetches them again; within a
 * process they never change (computed once), so Discord's cache still works.
 */

export enum iHorizonAsset {
	/** The bot banner, per language: `{lang}` = the guild's language code (ihrz_fr-FR.png). */
	Banner = "img/banner/ihrz_{lang}.png",
	Honeypot = "img/honeypot.png",
	Logo = "img/ihorizon.png",
	Noaimie = "img/noaimie.jpg",
	PollImage = "img/poll_embed_image.gif",
	SixSeven = "img/fun/67_command.gif"
}

const CDN = "https://www.ihorizon.org/assets/";

/** When this process started, in Unix epoch milliseconds (the uptime of `+status`, once for the process). */
export const PROCESS_STARTED_AT = Math.round(
	Date.now() - process.uptime() * 1000
);

/** The full URL of a hosted image; `lang` fills the banner's language. */
export function iHorizonAssetURL(asset: iHorizonAsset, lang = "en-US"): string {
	return `${CDN}${asset.replace("{lang}", lang)}?v=${PROCESS_STARTED_AT}`;
}
