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

import { ChatInputCommandInteraction, Message } from "pwss";
import { LanguageData } from "../../../types/languageData";
import { DatabaseStructure } from "../../../types/database_structure";
import { Command } from "../../../types/command";
import { Option } from "../../../types/option";

export async function checkCommandPermission(interaction: ChatInputCommandInteraction | Message, lang: LanguageData, command: Command | Option): Promise<boolean> {
    var usr = interaction instanceof ChatInputCommandInteraction ? interaction.user : interaction.author;
    var db = interaction.client.db;

    let guildPerm = await db.get(`${interaction.guildId}.UTILS`) as DatabaseStructure.UtilsData;
    let userInDatabase = guildPerm?.USER_PERMS?.[usr.id] || 0;
    let cmdNeedPerm = guildPerm?.PERMS?.[command.name] || 0;

    if (userInDatabase >= cmdNeedPerm) return true;
    return false;
}