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

// Per-member lock for the economy commands: a second command of the same
// member, sent while the first one is still running, is refused instead of
// reading the same balance twice. In memory: a guild lives on one shard.
const held = new Set<string>();

/**
 * Tries to take the per-member lock. Returns a release function, or null if
 * the lock is already held. The caller must release it in a finally block.
 */
export function acquireEconomyLock(
	guildId: string,
	userId: string
): (() => void) | null {
	const key = `${guildId}.${userId}`;
	if (held.has(key)) return null;
	held.add(key);
	return () => {
		held.delete(key);
	};
}
