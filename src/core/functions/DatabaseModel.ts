/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import dbPromise from '../database';
import { QuickDB } from 'quick.db';
import { TextChannel } from 'discord.js';

interface DatabaseAction {
    id: number;
    key?: string;
    values?: any | string | number | boolean | Number | JSON | undefined | TextChannel | object;
}

class DatabaseModel {
    private async useWrapper(action: DatabaseAction) {
        let db = (await dbPromise) as QuickDB;

        switch (action.id) {
            case 1:
                return db.set(action.key as string, action.values);
            case 2:
                return db.push(action.key as string, action.values);
            case 3:
                return db.sub(action.key as string, action.values);
            case 4:
                return await db.add(action.key as string, action.values);
            case 5:
                return db.get(action.key as string);
            case 6:
                return db.pull(action.key as string, action.values);
            case 7:
                return db.all();
            case 8:
                return db.delete(action.key as string);
            default:
                throw new Error(`${action.id} -> Mauvaise requête JSON sans IP/clé`);
        }
    }

    async set(key: string, value: DatabaseAction["values"]) {
        return this.useWrapper({ id: 1, key, values: value });
    }

    async push(key: string, value: DatabaseAction["values"]) {
        return this.useWrapper({ id: 2, key, values: value });
    }

    async sub(key: string, value: string) {
        return this.useWrapper({ id: 3, key, values: value });
    }

    async add(key: string, value: string) {
        return this.useWrapper({ id: 4, key, values: value });
    }

    async get(key: string) {
        return this.useWrapper({ id: 5, key });
    }

    async pull(key: string, value: DatabaseAction) {
        return this.useWrapper({ id: 6, key, values: value });
    }

    async all() {
        return this.useWrapper({ id: 7 });
    }

    async delete(key: string) {
        return this.useWrapper({ id: 8, key });
    }
}

const databaseModel = new DatabaseModel();
export default databaseModel;