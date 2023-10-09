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

import axios from 'axios';
import config from '../../files/config';
import CryptoJS from 'crypto-js';
import dbPromise from '../database';
import * as apiUrlParser from './apiUrlParser';

interface DatabaseAction {
    id: number;
    key?: string;
    values?: any;
}

class DatabaseModel {
    async useApi(id: Object) {
        try {
            let encrypted = CryptoJS.AES.encrypt(JSON.stringify(id), config.api.apiToken).toString();
            let response = await axios.post(apiUrlParser.DatabaseURL, { text: encrypted }, { headers: { 'Accept': 'application/json' } });

            if (JSON.stringify(response.data) === '{}') {
                return undefined;
            } else {
                return response.data.r;
            }
        } catch (error) {
            throw error;
        }
    }

    async useWrapper(action: DatabaseAction) {
        let db = (await dbPromise) as any;

        switch (action.id) {
            case 1:
                return db.set(action.key, action.values);
            case 2:
                return db.push(action.key, action.values);
            case 3:
                return db.sub(action.key, action.values);
            case 4:
                return await db.add(action.key, action.values);
            case 5:
                return db.get(action.key);
            case 6:
                return db.pull(action.key, action.values);
            case 7:
                return db.all();
            case 8:
                return db.delete(action.key);
            default:
                throw new Error(`${action.id} -> Bad json request without ip/key`);
        }
    }

    async executeAction(action: DatabaseAction) {
        return this.useWrapper(action);
    }

    async set(key: string, value: any) {
        return this.executeAction({ id: 1, key, values: value });
    }

    async push(key: string, value: any) {
        return this.executeAction({ id: 2, key, values: value });
    }

    async sub(key: string, value: any) {
        return this.executeAction({ id: 3, key, values: value });
    }

    async add(key: string, value: any) {
        return this.executeAction({ id: 4, key, values: value });
    }

    async get(key: string) {
        return this.executeAction({ id: 5, key });
    }

    async pull(key: string, value: any) {
        return this.executeAction({ id: 6, key, values: value });
    }

    async all() {
        return this.executeAction({ id: 7 });
    }

    async delete(key: string) {
        return this.executeAction({ id: 8, key });
    }
}

const databaseModel = new DatabaseModel();
export default databaseModel;