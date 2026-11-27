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
 * Modules a server can turn off, and the one place that says how: the commands, buttons and dashboard
 * actions of a module ask isModuleDisabled(), the commands answer with replyIfModuleDisabled():
 *
 *   if (await client.func.moduleToggle.replyIfModuleDisabled(client, interaction, lang, "fun")) return;
 */
import { ChatInputCommandInteraction, Client, Message } from "discord.js";

import { LanguageData } from "../../../types/languageData.js";
import { authorOf } from "./method/source.js";

export type ToggleableModule = "fun" | "economy" | "ticket";

// Where each module keeps its switch, and which stored value means "off".
const SWITCHES: Record<
	ToggleableModule,
	{ path: (guildId: string) => string; off: (value: unknown) => boolean }
> = {
	// /fun config, dashboard: "off" | "on"
	fun: { path: (g) => `${g}.GUILD.FUN.states`, off: (v) => v === "off" },
	// /economy config, dashboard: true when disabled
	economy: { path: (g) => `${g}.ECONOMY.disabled`, off: (v) => v === true },
	// /ticket config, dashboard: truthy when disabled
	ticket: { path: (g) => `${g}.GUILD.TICKET.disable`, off: (v) => !!v }
};

export async function isModuleDisabled(
	client: Client,
	guildId: string | null | undefined,
	module: ToggleableModule
): Promise<boolean> {
	if (!guildId) return false;
	const rule = SWITCHES[module];
	return rule.off(await client.db.get(rule.path(guildId)));
}

/** The module's usual refusal (the fun, economy or ticket message). */
function refusal(
	lang: LanguageData,
	module: ToggleableModule,
	authorId: string
): string {
	switch (module) {
		case "fun":
			return lang.fun_category_disable;
		case "economy":
			return lang.economy_disable_msg.replace("${authorId}", authorId);
		case "ticket":
			return lang.ticket_disabled_command;
	}
}

/**
 * When the module is off on this server: answers with its refusal (or `message`) and returns true, so the
 * command stops there. Returns false when the module is on.
 */
export async function replyIfModuleDisabled(
	client: Client,
	interaction: ChatInputCommandInteraction<"cached"> | Message,
	lang: LanguageData,
	module: ToggleableModule,
	message?: string
): Promise<boolean> {
	if (!(await isModuleDisabled(client, interaction.guildId, module)))
		return false;
	await client.func.method.interactionSend(interaction, {
		content: message ?? refusal(lang, module, authorOf(interaction).id)
	});
	return true;
}
