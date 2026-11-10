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

import { Giveaway } from "../../../types/giveaways.js";
import { GiveawayEndedStatus } from "./giveawaysManager.js";
import logger from "../logger.js";
import { giveawaysTable } from "../../Events/client/ready.js";

/** Entries without duplicates, first occurrence order kept. */
export function dedupeEntries(entries: string[] | undefined): string[] {
	return Array.from(new Set(entries || []));
}

class db {
	/**
	 * Every write reads the whole giveaway document and writes it back, so
	 * concurrent writes on one giveaway (two entries, an entry during the
	 * end) are chained here: none of them can overwrite another's change.
	 */
	private locks = new Map<string, Promise<unknown>>();

	private withLock<T>(
		giveawayId: string,
		task: () => Promise<T>
	): Promise<T> {
		const previous = this.locks.get(giveawayId) || Promise.resolve();
		const run = previous.catch(() => {}).then(task);
		const tail = run.catch(() => {});
		this.locks.set(giveawayId, tail);
		tail.then(() => {
			if (this.locks.get(giveawayId) === tail) {
				this.locks.delete(giveawayId);
			}
		});
		return run;
	}

	/** Returns the entry count after the change, or null if the giveaway is gone. */
	public AddEntries(
		giveawayId: string,
		user: string
	): Promise<number | null> {
		return this.withLock(giveawayId, async () => {
			const giveaway = await this.GetGiveawayData(giveawayId);
			if (!giveaway) return null;
			giveaway.entries = giveaway.entries || [];
			if (giveaway.entries.includes(user)) return giveaway.entries.length;
			giveaway.entries.push(user);
			await giveawaysTable.set(giveawayId, giveaway);
			return giveaway.entries.length;
		});
	}

	public RemoveEntries(
		giveawayId: string,
		userId: string
	): Promise<string[]> {
		return this.withLock(giveawayId, async () => {
			const giveaway = await this.GetGiveawayData(giveawayId);
			if (giveaway) {
				giveaway.entries = (giveaway.entries || []).filter(
					(entry: string) => entry !== userId
				);
				await giveawaysTable.set(giveawayId, giveaway);
				return giveaway.entries;
			}
			return [];
		});
	}

	public async GetGiveawayData(
		giveawayId: string
	): Promise<Giveaway | undefined> {
		return (await giveawaysTable.get(giveawayId)) || undefined;
	}

	public async Create(giveaway: Giveaway, giveawayId: string) {
		await giveawaysTable.set(giveawayId, giveaway);
	}

	public SetEnded(giveawayId: string, state: GiveawayEndedStatus) {
		return this.withLock(giveawayId, async () => {
			const giveaway = await this.GetGiveawayData(giveawayId);
			if (!giveaway) return "OK";
			giveaway.ended = state;
			await giveawaysTable.set(giveawayId, giveaway);
			return "OK";
		});
	}

	public SetWinners(giveawayId: string, winners: string[] | string) {
		return this.withLock(giveawayId, async () => {
			const giveaway = await this.GetGiveawayData(giveawayId);
			if (!giveaway) return "OK";
			giveaway.winners = winners;
			await giveawaysTable.set(giveawayId, giveaway);
			return "OK";
		});
	}

	public async GetAllGiveawaysData(): Promise<
		{ giveawayId: string; giveawayData: Giveaway }[]
	> {
		const allGiveaways = await giveawaysTable.all();

		return allGiveaways.map(({ id, value }) => ({
			giveawayId: id,
			giveawayData: value as Giveaway
		}));
	}

	public async DeleteGiveaway(giveawayId: string) {
		try {
			await giveawaysTable.delete(giveawayId);
			logger.log(`Giveaway ${giveawayId} deleted successfully.`);
		} catch (error) {
			logger.err(`Error deleting giveaway ${giveawayId}: ${error}`);
		}
	}

	public AvoidDoubleEntries(giveawayId: string): Promise<void> {
		return this.withLock(giveawayId, async () => {
			const giveaway = await this.GetGiveawayData(giveawayId);
			if (!giveaway) return;

			const uniqueEntries = dedupeEntries(giveaway.entries);
			if (uniqueEntries.length === (giveaway.entries || []).length)
				return;

			giveaway.entries = uniqueEntries;

			await giveawaysTable.set(giveawayId, giveaway);
		});
	}
}

export default new db();
