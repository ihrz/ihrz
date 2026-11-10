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

import { ChannelType, Client, Message, PermissionFlagsBits } from "discord.js";
import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { getCachedGuildValue } from "../../core/modules/guildConfigCache.js";

const binaryExtensions: string[] = [
	"exe",
	"msi",
	"dmg",
	"apk",
	"ipa",
	"bat",
	"vbs",
	"ps1",
	"cmd",
	"sh",
	"bin",
	"AppImage",
	"deb",
	"pacman",
	"flatpakref",
	"zip",
	"7z",
	"gz",
	"tar",
	"rar",
	"asar",
	"scr",
	"com",
	"pif",
	"cpl",
	"jar",
	"lnk",
	"hta",
	"js",
	"jse",
	"vbe",
	"wsf",
	"reg",
	"iso",
	"img",
	"msix",
	"appx"
];

export function ilegalFile(str: string): boolean {
	if (!str.includes(".")) return false;
	const extension = str.split(".").pop()?.toLowerCase();
	return binaryExtensions.some((x) => x.toLowerCase() === extension);
}

export const event: BotEvent = {
	name: "messageCreate",
	run: async (client: Client, message: Message) => {
		if (
			!message.guild ||
			message.author.bot ||
			message.webhookId ||
			message.channel.type === ChannelType.DM ||
			message.author.id === client.user?.id ||
			message.member?.permissions.any([
				PermissionFlagsBits.Administrator,
				PermissionFlagsBits.ModerateMembers
			])
		) {
			return;
		}

		let config = (await getCachedGuildValue(
			`${message.guildId}.UTILS.antiExe`
		)) as DatabaseStructure.UtilsData["antiExe"];
		if (config !== "on") return;

		const toDelete = [...message.attachments.values()].some((atc) =>
			ilegalFile(atc.name)
		);

		if (toDelete) {
			if (message.member?.moderatable) {
				message.member
					?.timeout(client.timeCalculator.to_ms("15m"))
					.catch(() => {});
			}

			if (message.deletable) {
				message.delete().catch(() => {});
			}

			const lang = await client.func.getLanguageData(message.guildId);
			Promise.resolve(
				client.func.method.warnMember(
					message.guild!.members.me!,
					message.member!,
					"[Anti-Exe] sending binary file",
					lang
				)
			).catch(() => {});
		}
	}
};
