/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { DatabaseStructure } from "../database_structure.js";
import { getDatabaseInstance } from "../database.js";

let database = getDatabaseInstance();

export default async function displayBotName(guildId: string): Promise<string> {
    let botName = await database.get(`${guildId}.BOT.botName`) as DatabaseStructure.DbGuildBotObject["botName"];

    if (!botName) {
        botName = 'iHorizon';
    };

    return botName;
};