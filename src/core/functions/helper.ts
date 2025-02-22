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

import { Message } from "discord.js";
import { db } from "../database.js";

export async function coolDown(message: Message, method: string, ms: number) {
    let tn = Date.now();
    let table = message.client.db.table("TEMP");
    var fetch = await table.get(`COOLDOWN.${method}.${message.author.id}`);
    if (fetch !== null && ms - (tn - fetch) > 0) return true;

    await table.set(`COOLDOWN.${method}.${message.author.id}`, tn);
    return false;
};

export async function hardCooldown(database: db, method: string, ms: number) {
    let tn = Date.now();
    let table = database.table("TEMP");
    var fetch = await table.get(`COOLDOWN.${method}`);
    if (fetch !== null && ms - (tn - fetch) > 0) return true;

    await table.set(`COOLDOWN.${method}`, tn);
    return false;
};