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
import logger from '../logger';
import CryptoJS from 'crypto-js';
import dbPromise from '../database';
import * as apiUrlParser from './apiUrlParser';

const dbUseApi = async (id: Object) => {
    return new Promise((resolve, reject) => {
        try {
            const encrypted = CryptoJS.AES.encrypt(JSON.stringify(id), config.api.apiToken).toString();
            axios.post(apiUrlParser.DatabaseURL(), { text: encrypted }, { headers: { 'Accept': 'application/json' } })
                .then(response => {
                    if (JSON.stringify(response.data) === '{}') {
                        resolve(undefined);
                    } else {
                        resolve(response.data.r);
                    }
                })
                .catch(error => {
                    reject(error);
                });
        } catch (error) {
            reject(error);
        }
    });
};

let dbUseWrapper = async (id: any) => {
    const db: any = await dbPromise;

    var id2 = id.id;
    var key = id.key;
    var values = id.values || id.value;

    switch (id2) {
        case 1:
            return await db.set(key, values);
        case 2:
            return await db.push(key, values);
        case 3:
            return await db.sub(key, values);
        case 4:
            return await db.add(key, values);
        case 5:
            return await db.get(key);
        case 6:
            return await db.pull(key, values);
        case 7:
            return await db.all();
        case 8:
            return await db.delete(key, values);
        default:
            return await logger.warn(`${id2} -> Bad json request without ip/key`);
    };
};

export async function DataBaseModel(id: Object) {
    if (config.database.useDatabaseAPIOnlyDashboard
        &&
        config.database.useDatabaseAPI) {
        return await dbUseWrapper(id);
    } else {
        if (config.database.useDatabaseAPI) return await dbUseApi(id);
    };

    return await dbUseWrapper(id);
};

export const Set: number = 1;
export const Push: number = 2;
export const Sub: number = 3;
export const Add: number = 4;
export const Get: number = 5;
export const Pull: number = 6;
export const All: number = 7;
export const Delete: number = 8;