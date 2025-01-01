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

import { ChatInputCommandInteraction, GuildMember, Message } from "discord.js";
import { DatabaseStructure } from "../../../types/database_structure";
import { Command } from "../../../types/command";
import { Option } from "../../../types/option";
import { LanguageData } from "../../../types/languageData";

export async function checkCommandPermission(
    interaction: ChatInputCommandInteraction<"cached"> | Message,
    command: string | Command | Option
): Promise<{
    allowed: boolean;
    neededPerm: number;
}> {
    const usr = interaction instanceof ChatInputCommandInteraction ? interaction.user : interaction.author;
    const db = interaction.client.db;
    const cmd = typeof command === 'string' ? command : command.name;

    // Get permission data from database
    const guildPerm = await db.get(`${interaction.guildId}.UTILS`) as DatabaseStructure.UtilsData;
    const userPermLevel = guildPerm?.USER_PERMS?.[usr.id] || 0;
    const cmdNeedPerm: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | undefined = guildPerm?.PERMS?.[cmd];

    // If no configuration is required, grant permission by default
    if (!cmdNeedPerm) {
        return { allowed: true, neededPerm: 0 };
    }

    // Check roles and implement pyramidal system
    let highestRolePermLevel = 0;
    if (guildPerm.roles) {
        // Loop through all possible permission levels (1 to 8)
        for (let permLevel = 1; permLevel <= 8; permLevel++) {
            const roleId = guildPerm.roles[permLevel as keyof DatabaseStructure.UtilsRoleData];
            // If user has this role, update their highest permission level
            if (roleId && interaction.member?.roles.cache.has(roleId)) {
                highestRolePermLevel = Math.max(highestRolePermLevel, permLevel);
            }
        }
    }

    // Check if user has a role with permission level equal or higher than required
    if (highestRolePermLevel >= cmdNeedPerm) {
        return { allowed: true, neededPerm: cmdNeedPerm };
    }

    // Check if user has a permission level in database equal or higher than required
    if (userPermLevel >= cmdNeedPerm) {
        return { allowed: true, neededPerm: cmdNeedPerm };
    }

    // If no conditions are met, deny access
    return { allowed: false, neededPerm: cmdNeedPerm };
}

export async function checkUserPermissions(member: GuildMember): Promise<DatabaseStructure.UtilsPermsData["user_id"] | 0> {
    let fetch: DatabaseStructure.UtilsPermsData["user_id"] | 0 = (await member.client.db.get(
        `${member.guild.id}.UTILS.USER_PERMS.${member.user.id}`,
    )) || 0;
    return fetch;
}

export async function sendErrorMessage(interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, neededPerm: number) {
    return await interaction.client.method.interactionSend(interaction, {
        content: lang.event_permission_wrong
            .replace("${interaction.member?.user.toString()}", interaction.member?.user.toString()!)
            .replace("${neededPerm === 0 ? 'Discord Permission' : neededPerm}", String(neededPerm === 0 ? 'Discord Permission' : neededPerm)),
        ephemeral: true
    })
}