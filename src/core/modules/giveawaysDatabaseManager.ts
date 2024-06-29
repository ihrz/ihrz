import { Giveaway } from '../../../types/giveaways';

import {
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    unlinkSync,
    writeFileSync
} from 'node:fs';

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

    private readGiveawayFile(giveawayId: string): Giveaway | null {
        const filePath = this.getFilePath(giveawayId);
        try {
            const data = readFileSync(filePath, 'utf-8');
            return JSON.parse(data) as Giveaway;
        } catch (error) {
            return null;
        }
    }

    private writeGiveawayFile(giveawayId: string, data: Giveaway) {
        const filePath = this.getFilePath(giveawayId);
        writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }

    AddEntries(giveawayId: string, user: string) {
        const giveaway = this.readGiveawayFile(giveawayId);
        if (giveaway) {
            giveaway.entries.push(user);
            this.writeGiveawayFile(giveawayId, giveaway);
        }
    }

    RemoveEntries(giveawayId: string, userId: string): string[] {
        const giveaway = this.readGiveawayFile(giveawayId);
        if (giveaway) {
            giveaway.entries = giveaway.entries.filter((entry: string) => entry !== userId);
            this.writeGiveawayFile(giveawayId, giveaway);
            return giveaway.entries;
        }
        return [];
    }

    GetGiveawayData(giveawayId: string): Giveaway | undefined {
        const giveaway = this.readGiveawayFile(giveawayId);
        return giveaway ? giveaway : undefined;
    }

    Create(giveaway: Giveaway, giveawayId: string) {
        this.writeGiveawayFile(giveawayId, giveaway);
    }

    SetEnded(giveawayId: string, state: boolean | string) {
        const giveaway = this.readGiveawayFile(giveawayId)!;
        giveaway.ended = state;
        this.writeGiveawayFile(giveawayId, giveaway);
        return 'OK';
    }

    SetWinners(giveawayId: string, winners: string[] | string) {
        const giveaway = this.readGiveawayFile(giveawayId)!;
        giveaway.winners = winners;
        this.writeGiveawayFile(giveawayId, giveaway);
        return 'OK';
    }

    GetAllGiveawaysData(): { giveawayId: string; giveawayData: Giveaway }[] {
        const giveawayFiles = readdirSync(this.path);
        const allGiveaways: { giveawayId: string; giveawayData: Giveaway }[] = [];

        giveawayFiles.forEach((file) => {
            const giveawayId = file.replace('.json', '');
            const giveawayData = this.readGiveawayFile(giveawayId);
            if (giveawayData) {
                allGiveaways.push({ giveawayId, giveawayData });
            }
        });

        return allGiveaways;
    }

    DeleteGiveaway(giveawayId: string) {
        const filePath = this.getFilePath(giveawayId);

        try {
            unlinkSync(filePath);
            console.log(`Giveaway ${giveawayId} deleted successfully.`);
        } catch (error) {
            console.error(`Error deleting giveaway ${giveawayId}: ${error}`);
        }
    }

    AvoidDoubleEntries(giveawayId: string) {
        const giveaway = this.readGiveawayFile(giveawayId)!;
        const uniqueEntries = Array.from(new Set(giveaway.entries));

        giveaway.entries = uniqueEntries;

        this.writeGiveawayFile(giveawayId, giveaway);
    }

};

export default new db();