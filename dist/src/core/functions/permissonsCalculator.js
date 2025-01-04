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
import { ChatInputCommandInteraction } from "discord.js";
export async function checkCommandPermission(interaction, command) {
    const usr = interaction instanceof ChatInputCommandInteraction
        ? interaction.user
        : interaction.author;
    const db = interaction.client.db;
    // Fetch permission data from database
    const guildPerm = (await db.get(`${interaction.guildId}.UTILS`));
    let cmdPermData = guildPerm?.PERMS?.[command];
    // Handle legacy permission levels (numbers instead of PermCommandData)
    if (typeof cmdPermData === "number") {
        cmdPermData = {
            users: [],
            roles: [],
            level: cmdPermData
        };
    }
    // If the command is not set, check if the category is set
    if (!cmdPermData && guildPerm?.PERMS?.[command.split(" ")[0]]) {
        cmdPermData = guildPerm?.PERMS?.[command.split(" ")[0]];
        // Handle legacy permission levels (numbers instead of PermCommandData)
        if (typeof cmdPermData === "number") {
            cmdPermData = {
                users: [],
                roles: [],
                level: cmdPermData
            };
        }
    }
    // If no specific permission is required, allow by default
    if (!cmdPermData) {
        return { allowed: true, neededPerm: 0 };
    }
    const { users, roles, level: cmdNeededPerm } = cmdPermData;
    // Check roles and implement pyramidal system
    let highestRolePermLevel = 0;
    if (guildPerm.roles) {
        // Loop through all possible permission levels (1 to 8)
        for (let permLevel = 1; permLevel <= 8; permLevel++) {
            const roleId = guildPerm.roles[permLevel];
            // If user has this role, update their highest permission level
            if (roleId && interaction.member?.roles.cache.has(roleId)) {
                highestRolePermLevel = Math.max(highestRolePermLevel, permLevel);
            }
        }
    }
    // Check if user has a role with permission level equal or higher than required
    if (highestRolePermLevel >= cmdNeededPerm) {
        return { allowed: true, neededPerm: cmdNeededPerm };
    }
    // Check if user is explicitly allowed
    if (users.includes(usr.id)) {
        return { allowed: true, neededPerm: cmdNeededPerm };
    }
    // Check if user has the required role
    const memberRoles = interaction.member?.roles.cache;
    if (memberRoles && roles.some((roleId) => memberRoles.has(roleId))) {
        return { allowed: true, neededPerm: cmdNeededPerm };
    }
    // Check if user has a permission level in database equal or higher than required
    const userPermLevel = guildPerm?.USER_PERMS?.[usr.id] || 0;
    if (userPermLevel >= cmdNeededPerm) {
        return { allowed: true, neededPerm: cmdNeededPerm };
    }
    // If no conditions are met, deny access
    return { allowed: false, neededPerm: cmdNeededPerm };
}
export async function checkUserPermissions(member) {
    const userPerm = (await member.client.db.get(`${member.guild.id}.UTILS.USER_PERMS.${member.user.id}`));
    return userPerm || 0;
}
export async function sendErrorMessage(interaction, lang, neededPerm) {
    return await interaction.client.method.interactionSend(interaction, {
        content: lang.event_permission_wrong
            .replace("${interaction.member?.user.toString()}", interaction.member?.user.toString())
            .replace("${neededPerm}", String(neededPerm === 0 ? 'Discord Permission' : neededPerm)),
        ephemeral: true
    });
}
