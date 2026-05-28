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

class db {
	public async AddEntries(giveawayId: string, user: string) {
		const giveaway = await this.GetGiveawayData(giveawayId);
		if (giveaway) {
			giveaway.entries.push(user);
			await giveawaysTable.set(giveawayId, giveaway);
		}
	}

	public async RemoveEntries(
		giveawayId: string,
		userId: string
	): Promise<string[]> {
		const giveaway = await this.GetGiveawayData(giveawayId);
		if (giveaway) {
			giveaway.entries = giveaway.entries.filter(
				(entry: string) => entry !== userId
			);
			await giveawaysTable.set(giveawayId, giveaway);
			return giveaway.entries;
		}
		return [];
	}

	public async GetGiveawayData(
		giveawayId: string
	): Promise<Giveaway | undefined> {
		return (await giveawaysTable.get(giveawayId)) || undefined;
	}

	public async Create(giveaway: Giveaway, giveawayId: string) {
		await giveawaysTable.set(giveawayId, giveaway);
	}

	public async SetEnded(giveawayId: string, state: GiveawayEndedStatus) {
		const giveaway = (await this.GetGiveawayData(giveawayId))!;
		giveaway.ended = state;
		await giveawaysTable.set(giveawayId, giveaway);
		return "OK";
	}

	public async SetWinners(giveawayId: string, winners: string[] | string) {
		const giveaway = (await this.GetGiveawayData(giveawayId))!;
		giveaway.winners = winners;
		await giveawaysTable.set(giveawayId, giveaway);
		return "OK";
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

	public async AvoidDoubleEntries(giveawayId: string) {
		const giveaway = (await this.GetGiveawayData(giveawayId))!;
		const uniqueEntries = Array.from(new Set(giveaway.entries || []));

		giveaway.entries = uniqueEntries;

		await giveawaysTable.set(giveawayId, giveaway);
	}
}

export default new db();
