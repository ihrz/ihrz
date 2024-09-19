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

import { ChatInputCommandInteraction, Message } from "discord.js";
import { DatabaseStructure } from "../../../types/database_structure";
import { Command } from "../../../types/command";
import { Option } from "../../../types/option";
import { LanguageData } from "../../../types/languageData";

export async function checkCommandPermission(interaction: ChatInputCommandInteraction<"cached"> | Message, command: string | Command | Option): Promise<{
    allowed: boolean;
    neededPerm: number;
}> {
    var usr = interaction instanceof ChatInputCommandInteraction ? interaction.user : interaction.author;
    var db = interaction.client.db;

    var cmd = typeof command === 'string' ? command : command.name;
    let guildPerm = await db.get(`${interaction.guildId}.UTILS`) as DatabaseStructure.UtilsData;
    let userInDatabase = guildPerm?.USER_PERMS?.[usr.id] || 0;
    let cmdNeedPerm: 1 | 2 | 3 | 4 | undefined = guildPerm?.PERMS?.[cmd];

    // if configuration is not set: return true and do discord permission check
    if (!cmdNeedPerm) {
        return { allowed: true, neededPerm: 0 };
    }

    let roleForPerm = guildPerm.roles?.[cmdNeedPerm] as string | undefined;

    // if the member have the perm roles
    if (roleForPerm && interaction.member?.roles.cache.has(roleForPerm)) {
        return { allowed: true, neededPerm: cmdNeedPerm };
    }

    // else if the user is in the list
    if (userInDatabase >= cmdNeedPerm) {
        return { allowed: true, neededPerm: cmdNeedPerm };
    }

    return { allowed: false, neededPerm: cmdNeedPerm };
}

export async function sendErrorMessage(interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, neededPerm: number) {
    return await interaction.client.method.interactionSend(interaction, {
        content: `${interaction.member?.user.toString()}, you are not allowed to use this command! Need perm: ${neededPerm === 0 ? 'Discord Permission' : neededPerm}`
    })
}