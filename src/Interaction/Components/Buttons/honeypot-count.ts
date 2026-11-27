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

// The counter button under the honeypot trap message (honeypotManager.buildTrapMessage): anyone can click
// it, it only shows how many accounts the trap sanctioned and when the last one was. Clicking is not a
// message: it never triggers the trap.
import { ButtonInteraction, MessageFlags } from "discord.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
import { LanguageData } from "../../../../types/languageData.js";

export default async function (
	interaction: ButtonInteraction<"cached">,
	lang: LanguageData
) {
	const config = (await interaction.client.db.get(
		`${interaction.guildId}.GUILD.HONEYPOT`
	)) as DatabaseStructure.HoneypotSchema | null;
	const count = config?.caughtCount ?? 0;
	const last = config?.lastSanctionedAt
		? `<t:${Math.floor(config.lastSanctionedAt / 1000)}:R>`
		: lang.honeypot_trap_count_never;

	await interaction.reply({
		content: lang.honeypot_trap_count_reply
			.replace("${count}", String(count))
			.replace("${last}", last),
		flags: [MessageFlags.Ephemeral]
	});
}
