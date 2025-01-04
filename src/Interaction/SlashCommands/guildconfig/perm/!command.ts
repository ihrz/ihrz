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

import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField,
} from 'discord.js';
import { LanguageData } from '../../../../../types/languageData';
import { Command } from '../../../../../types/command';
import { Option } from '../../../../../types/option';
import { DatabaseStructure } from '../../../../../types/database_structure';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, command: Option | Command | undefined, allowed: boolean) => {
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        if ((!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator) && !allowed)) {
            await interaction.editReply({ content: lang.guildprofil_not_admin });
            return;
        }

        const choice = interaction.options.getString("action")!;

        if (choice === "change") {
            const requestedCommand = interaction.options.getString("command");
            const perms = interaction.options.getString("permission");
            const customRole = interaction.options.getRole("custom-role");
            const customUser = interaction.options.getMember("custom-user");

            if (!requestedCommand) {
                await client.method.interactionSend(interaction, { content: lang.perm_add_args_error });
                return;
            }

            const commandParts = requestedCommand.split(" ");
            let fetchedCommand: Command | Option | undefined;

            if (commandParts.length === 1) {
                fetchedCommand = client.commands.get(requestedCommand);
            } else if (commandParts.length >= 2) {
                fetchedCommand = client.subCommands.get(requestedCommand);
            }

            if (!fetchedCommand) {
                await client.method.interactionSend(interaction, lang.var_unreachable_command);
                return;
            }

            // Get existing permissions
            const existingPerms = await client.db.get(
                `${interaction.guildId}.UTILS.PERMS.${requestedCommand}`
            ) as DatabaseStructure.PermCommandData | DatabaseStructure.PermLevel | undefined;

            // Initialize new permission structure
            let newPerms: DatabaseStructure.PermCommandData = {
                users: [],
                roles: [],
                level: 0 as DatabaseStructure.PermLevel
            };

            const commandType = commandParts.length === 1 ? lang.var_command :
                commandParts.length === 2 ? lang.var_subcommand : lang.var_subcommand_group;

            // Convert existing permissions to new structure
            if (existingPerms) {
                if (typeof existingPerms === 'number') {
                    newPerms.level = existingPerms;
                } else {
                    newPerms = existingPerms;
                }
            }

            const changes: string[] = [];

            // Check for permission level changes
            if (perms) {
                const permLevel = parseInt(perms) as DatabaseStructure.PermLevel;
                if (permLevel !== newPerms.level) {
                    changes.push(`${lang.perm_set_chng_perm_lvl}: ${newPerms.level} ➡️ ${permLevel}`);
                    newPerms.level = permLevel;
                }
            }

            // Toggle role (add if not present, remove if present)
            if (customRole) {
                const roleIndex = newPerms.roles.indexOf(customRole.id);
                if (roleIndex === -1) {
                    changes.push(`${lang.perm_set_add_role}: ${customRole.toString()}`);
                    newPerms.roles.push(customRole.id);
                } else {
                    changes.push(`${lang.perm_rmv_role}: ${customRole.toString()}`);
                    newPerms.roles.splice(roleIndex, 1);
                }
            }

            // Toggle user (add if not present, remove if present)
            if (customUser) {
                const userIndex = newPerms.users.indexOf(customUser.id);
                if (userIndex === -1) {
                    changes.push(`${lang.perm_set_add_usr}: ${customUser.toString()}`);
                    newPerms.users.push(customUser.id);
                } else {
                    changes.push(`${lang.perm_rmv_usr}: ${customUser.toString()}`);
                    newPerms.users.splice(userIndex, 1);
                }
            }

            // Save the updated permissions to the database
            if (perms === "0" && newPerms.users.length === 0 && newPerms.roles.length === 0) {
                // If all permissions are cleared, delete the entry from the database
                await client.db.delete(`${interaction.guildId}.UTILS.PERMS.${requestedCommand}`);

                await client.method.interactionSend(interaction, {
                    content: `${commandType}: ${requestedCommand}\n ${lang.perm_set_command_reset}`
                });
            } else {
                const changesSummary = changes.length > 0
                    ? `${changes.join("\n")}`
                    : lang.perm_set_no_modified;

                await client.db.set(`${interaction.guildId}.UTILS.PERMS.${requestedCommand}`, newPerms);

                await client.method.interactionSend(interaction, {
                    content: `${commandType}: ${requestedCommand}\n\n${changesSummary}`
                });
            }

        } else if (choice === "list") {
            const res = await client.db.get(`${interaction.guildId}.UTILS.PERMS`) as DatabaseStructure.UtilsPermsData;

            if (!res || Object.keys(res).length === 0) {
                await client.method.interactionSend(interaction, { content: lang.perm_list_no_command_set });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor("#000000")
                .setTitle(`${lang.var_permission}`)
                .setTimestamp();

            // Initialize grouping objects
            const groupedByLevel: Record<DatabaseStructure.PermLevel, string[]> = {
                1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: []
            };
            const groupedByRole: Record<string, string[]> = {};
            const groupedByUser: Record<string, string[]> = {};

            // Process each command's permissions
            for (const [commandName, permData] of Object.entries(res)) {
                if (typeof permData === 'number') {
                    if (!groupedByLevel[permData]) {
                        groupedByLevel[permData] = [];
                    }
                    groupedByLevel[permData].push(`\`${commandName}\``);
                } else {
                    if (permData.level > 0) {
                        if (!groupedByLevel[permData.level]) {
                            groupedByLevel[permData.level] = [];
                        }
                        groupedByLevel[permData.level].push(`\`${commandName}\``);
                    }

                    permData.roles.forEach(roleId => {
                        if (!groupedByRole[roleId]) {
                            groupedByRole[roleId] = [];
                        }
                        groupedByRole[roleId].push(commandName);
                    });

                    permData.users.forEach(userId => {
                        if (!groupedByUser[userId]) {
                            groupedByUser[userId] = [];
                        }
                        groupedByUser[userId].push(commandName);
                    });
                }
            }

            // Add permission levels to embed
            Object.entries(groupedByLevel)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .forEach(([level, commands]) => {
                    if (commands.length >= 1) {
                        embed.addFields({
                            name: `**${lang.var_permission} ${level}**`,
                            value: commands.join(", ")
                        });
                    }
                });

            // Add roles to embed
            for (const [roleId, commands] of Object.entries(groupedByRole)) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (role) {
                    const codeBlock = `${role.toString()}\n\`\`\`\n${commands.map((cmd, i) =>
                        `${i + 1} ${cmd}`).join('\n')}\n\`\`\``;
                    embed.addFields({ name: "** **", value: codeBlock, inline: true });
                }
            }

            // Add users to embed
            for (const [userId, commands] of Object.entries(groupedByUser)) {
                const user = await client.users.fetch(userId);
                if (user) {
                    const codeBlock = `${user.toString()}\n\`\`\`\n${commands.map((cmd, i) =>
                        `${i + 1} ${cmd}`).join('\n')}\n\`\`\``;
                    embed.addFields({ name: "** **", value: codeBlock, inline: true });
                }
            }

            await client.method.interactionSend(interaction, { embeds: [embed] });
        }
    }
};