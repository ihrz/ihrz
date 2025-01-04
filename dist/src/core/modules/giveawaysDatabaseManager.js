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
import { existsSync, mkdirSync, } from 'node:fs';
import logger from '../logger.js';
import { readdir, readFile, unlink, writeFile } from 'node:fs/promises';
class db {
    path;
    InitFilePath(path) {
        if (!existsSync(path)) {
            mkdirSync(path);
        }
        ;
        this.path = path;
    }
    ;
    getFilePath(giveawayId) {
        return `${this.path}/${giveawayId}.json`;
    }
    async readGiveawayFile(giveawayId) {
        const filePath = this.getFilePath(giveawayId);
        try {
            const data = await readFile(filePath, 'utf-8');
            return JSON.parse(data);
        }
        catch (error) {
            return null;
        }
    }
    async writeGiveawayFile(giveawayId, data) {
        const filePath = this.getFilePath(giveawayId);
        await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }
    async AddEntries(giveawayId, user) {
        const giveaway = await this.readGiveawayFile(giveawayId);
        if (giveaway) {
            giveaway.entries.push(user);
            await this.writeGiveawayFile(giveawayId, giveaway);
        }
    }
    async RemoveEntries(giveawayId, userId) {
        const giveaway = await this.readGiveawayFile(giveawayId);
        if (giveaway) {
            giveaway.entries = giveaway.entries.filter((entry) => entry !== userId);
            await this.writeGiveawayFile(giveawayId, giveaway);
            return giveaway.entries;
        }
        return [];
    }
    async GetGiveawayData(giveawayId) {
        const giveaway = await this.readGiveawayFile(giveawayId);
        return giveaway ? giveaway : undefined;
    }
    async Create(giveaway, giveawayId) {
        await this.writeGiveawayFile(giveawayId, giveaway);
    }
    async SetEnded(giveawayId, state) {
        const giveaway = (await this.readGiveawayFile(giveawayId));
        giveaway.ended = state;
        await this.writeGiveawayFile(giveawayId, giveaway);
        return 'OK';
    }
    async SetWinners(giveawayId, winners) {
        const giveaway = (await this.readGiveawayFile(giveawayId));
        giveaway.winners = winners;
        await this.writeGiveawayFile(giveawayId, giveaway);
        return 'OK';
    }
    async GetAllGiveawaysData() {
        const giveawayFiles = await readdir(this.path);
        const allGiveaways = [];
        for (const file of giveawayFiles) {
            const giveawayId = file.replace('.json', '');
            const giveawayData = await this.readGiveawayFile(giveawayId);
            if (giveawayData) {
                allGiveaways.push({ giveawayId, giveawayData });
            }
        }
        return allGiveaways;
    }
    async DeleteGiveaway(giveawayId) {
        const filePath = this.getFilePath(giveawayId);
        try {
            await unlink(filePath);
            logger.log(`Giveaway ${giveawayId} deleted successfully.`);
        }
        catch (error) {
            logger.err(`Error deleting giveaway ${giveawayId}: ${error}`);
        }
    }
    async AvoidDoubleEntries(giveawayId) {
        const giveaway = (await this.readGiveawayFile(giveawayId));
        const uniqueEntries = Array.from(new Set(giveaway.entries));
        giveaway.entries = uniqueEntries;
        await this.writeGiveawayFile(giveawayId, giveaway);
    }
}
;
export default new db();
