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
 * Where a hybrid command comes from — a slash command or a prefix message — without `instanceof`: an
 * interaction has `isRepliable()`, a message does not. Arguments are read with `options(source, args)`
 * (args.ts), never by testing the source and calling `interaction.options.getX` / `method.member(…)` by hand.
 */
import type {
	ChatInputCommandInteraction,
	Interaction,
	Message,
	User
} from "discord.js";

/** Any interaction (slash, button, select menu, modal…), as opposed to a message. */
export function isInteraction(
	source: Message | Interaction
): source is Interaction {
	return (
		typeof (source as { isRepliable?: unknown }).isRepliable === "function"
	);
}

/** A prefix message, as opposed to an interaction. */
export function isMessage(source: Message | Interaction): source is Message {
	return !isInteraction(source);
}

/** A slash command (chat input interaction). */
export function isSlash<C extends ChatInputCommandInteraction>(
	source: C | Message | Interaction
): source is C {
	return isInteraction(source) && source.isChatInputCommand();
}

/** Who ran the command: the interaction's user, or the message's author. */
export function authorOf(source: Message | Interaction): User {
	return isInteraction(source) ? source.user : source.author;
}
