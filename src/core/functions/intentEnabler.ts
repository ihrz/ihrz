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

import logger from "../logger.js";

const GATEWAY_GUILD_MEMBERS = 1 << 13;
const GATEWAY_MESSAGE_CONTENT = 1 << 15;
const GATEWAY_PRESENCE = 1 << 19;

const REQUIRED =
	GATEWAY_GUILD_MEMBERS | GATEWAY_MESSAGE_CONTENT | GATEWAY_PRESENCE;

export async function enableRequiredIntents(token: string): Promise<boolean> {
	try {
		const res = await fetch(
			"https://discord.com/api/v10/applications/@me",
			{ headers: { Authorization: "Bot " + token } }
		);

		if (!res.ok) {
			logger.err("Failed to fetch app info: " + res.status);
			return false;
		}

		const data = (await res.json()) as { flags: number };
		const current = data.flags ?? 0;
		const needed = REQUIRED & ~current;

		if (needed === 0) {
			logger.log("All intents already enabled (flags: " + current + ")");
			return true;
		}

		const updated = current | REQUIRED;

		logger.log(
			"Enabling intents: " +
				(needed & GATEWAY_GUILD_MEMBERS ? "GuildMembers " : "") +
				(needed & GATEWAY_MESSAGE_CONTENT ? "MessageContent " : "") +
				(needed & GATEWAY_PRESENCE ? "Presence " : "") +
				"(flags: " +
				current +
				" -> " +
				updated +
				")"
		);

		const patch = await fetch(
			"https://discord.com/api/v10/applications/@me",
			{
				method: "PATCH",
				headers: {
					Authorization: "Bot " + token,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ flags: updated })
			}
		);

		if (!patch.ok) {
			logger.err(
				"PATCH failed: " + patch.status + " " + (await patch.text())
			);
			return false;
		}

		const patched = (await patch.json()) as { flags: number };
		logger.log("Done. Flags: " + current + " -> " + patched.flags);

		if (patched.flags === current) {
			logger.warn("Flags unchanged. API may have rejected the update.");
			return false;
		}

		return true;
	} catch (err) {
		logger.err("Intent enabler error: " + String(err));
		return false;
	}
}
