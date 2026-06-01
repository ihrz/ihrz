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
	"asar"
];

export function ilegalFile(str: string): boolean {
	return binaryExtensions.some((x) => str.includes(`.${x}`));
}

export const event: BotEvent = {
	name: "messageCreate",
	run: async (client: Client, message: Message) => {
		if (
			!message.guild ||
			message.author.bot ||
			message.channel.type === ChannelType.DM ||
			message.author.id === client.user?.id ||
			message.member?.permissions.has(
				PermissionFlagsBits.Administrator |
					PermissionFlagsBits.ModerateMembers
			)
		) {
			return;
		}

		let config = (await client.db.get(
			`${message.guildId}.UTILS.antiExe`
		)) as DatabaseStructure.UtilsData["antiExe"];
		if (!config && config !== "on") return;

		const toDelete = [...message.attachments.values()].some((atc) =>
			ilegalFile(atc.name)
		);

		if (toDelete) {
			if (message.member?.moderatable) {
				message.member?.timeout(client.timeCalculator.to_ms("15m"));
			}

			if (message.deletable) {
				message.delete();
			}

			client.func.method.warnMember(
				message.guild!.members.me!,
				message.member!,
				"[Anti-Exe] sending binary file",
				await client.func.getLanguageData(message.guildId)
			);
		}
	}
};
