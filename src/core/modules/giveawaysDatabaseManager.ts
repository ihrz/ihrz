/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { Giveaway } from '../../../types/giveaways.js';

import {
	existsSync,
	mkdirSync,
} from 'node:fs';
import logger from '../logger.js';
import { readdir, readFile, unlink, writeFile } from 'node:fs/promises';

class db {
	path: string;

	public InitFilePath(path: string) {

		if (!existsSync(path)) {
			mkdirSync(path);
		};

		this.path = path
	};

	private getFilePath(giveawayId: string): string {
		return `${this.path}/${giveawayId}.json`;
	}

	private async readGiveawayFile(giveawayId: string): Promise<Giveaway | null> {
		const filePath = this.getFilePath(giveawayId);
		try {
			const data = await readFile(filePath, 'utf-8');
			return JSON.parse(data) as Giveaway;
		} catch (error) {
			return null;
		}
	}

	private async writeGiveawayFile(giveawayId: string, data: Giveaway) {
		const filePath = this.getFilePath(giveawayId);
		await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
	}

	public async AddEntries(giveawayId: string, user: string) {
		const giveaway = await this.readGiveawayFile(giveawayId);
		if (giveaway) {
			giveaway.entries.push(user);
			await this.writeGiveawayFile(giveawayId, giveaway);
		}
	}

	public async RemoveEntries(giveawayId: string, userId: string): Promise<string[]> {
		const giveaway = await this.readGiveawayFile(giveawayId);
		if (giveaway) {
			giveaway.entries = giveaway.entries.filter((entry: string) => entry !== userId);
			await this.writeGiveawayFile(giveawayId, giveaway);
			return giveaway.entries;
		}
		return [];
	}

	public async GetGiveawayData(giveawayId: string): Promise<Giveaway | undefined> {
		const giveaway = await this.readGiveawayFile(giveawayId);
		return giveaway ? giveaway : undefined;
	}

	public async Create(giveaway: Giveaway, giveawayId: string) {
		await this.writeGiveawayFile(giveawayId, giveaway);
	}

	public async SetEnded(giveawayId: string, state: boolean | string) {
		const giveaway = (await this.readGiveawayFile(giveawayId))!;
		giveaway.ended = state;
		await this.writeGiveawayFile(giveawayId, giveaway);
		return 'OK';
	}

	public async SetWinners(giveawayId: string, winners: string[] | string) {
		const giveaway = (await this.readGiveawayFile(giveawayId))!;
		giveaway.winners = winners;
		await this.writeGiveawayFile(giveawayId, giveaway);
		return 'OK';
	}

	public async GetAllGiveawaysData(): Promise<{ giveawayId: string; giveawayData: Giveaway }[]> {
		const giveawayFiles = await readdir(this.path);
		const allGiveaways: { giveawayId: string; giveawayData: Giveaway }[] = [];

		for (const file of giveawayFiles) {
			const giveawayId = file.replace('.json', '');
			const giveawayData = await this.readGiveawayFile(giveawayId);

			if (giveawayData) {
				allGiveaways.push({ giveawayId, giveawayData });
			}
		}

		return allGiveaways;
	}

	public async DeleteGiveaway(giveawayId: string) {
		const filePath = this.getFilePath(giveawayId);

		try {
			await unlink(filePath);
			logger.log(`Giveaway ${giveawayId} deleted successfully.`);
		} catch (error) {
			logger.err(`Error deleting giveaway ${giveawayId}: ${error}`);
		}
	}

	public async AvoidDoubleEntries(giveawayId: string) {
		const giveaway = (await this.readGiveawayFile(giveawayId))!;
		const uniqueEntries = Array.from(new Set(giveaway.entries || []));

		giveaway.entries = uniqueEntries;

		await this.writeGiveawayFile(giveawayId, giveaway);
	}

};

export default new db();