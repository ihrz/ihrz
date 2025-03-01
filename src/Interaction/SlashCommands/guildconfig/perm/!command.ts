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
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    ComponentType,
    EmbedBuilder,
    Message,
} from 'discord.js';
import { LanguageData } from '../../../../../types/languageData.js';
import { Command, SubCommand } from '../../../../../types/command.js';

import { DatabaseStructure } from '../../../../../types/database_structure.js';
import { Option } from '../../../../../types/option.js';

export const subCommand: SubCommand = {
    run: async (
        client: Client,
        interaction: ChatInputCommandInteraction<"cached">,
        lang: LanguageData,
        args?: string[]
    ) => {
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

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

            // Initialize grouping objects
            const groupedByLevel: Record<DatabaseStructure.PermLevel, string[]> = {
                1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: []
            };
            const groupedByRole: Record<string, string[]> = {};
            const groupedByUser: Record<string, string[]> = {};

            // Process each command's permissions [same as before]
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

            // Prepare all fields
            const allFields: { name: string, value: string, inline?: boolean }[] = [];

            // Add permission levels
            Object.entries(groupedByLevel)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .forEach(([level, commands]) => {
                    if (commands.length >= 1) {
                        allFields.push({
                            name: `**${lang.var_permission} ${level}**`,
                            value: commands.join(", ")
                        });
                    }
                });

            // Add roles
            for (const [roleId, commands] of Object.entries(groupedByRole)) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (role) {
                    const codeBlock = `${role.toString()}\n\`\`\`\n${commands.map((cmd, i) =>
                        `${i + 1} ${cmd}`).join('\n')}\n\`\`\``;
                    allFields.push({ name: "** **", value: codeBlock, inline: true });
                }
            }

            // Add users
            for (const [userId, commands] of Object.entries(groupedByUser)) {
                const user = await client.users.fetch(userId);
                if (user) {
                    const codeBlock = `${user.toString()}\n\`\`\`\n${commands.map((cmd, i) =>
                        `${i + 1} ${cmd}`).join('\n')}\n\`\`\``;
                    allFields.push({ name: "** **", value: codeBlock, inline: true });
                }
            }

            // Pagination logic
            const fieldsPerPage = 15;
            const pages = Math.ceil(allFields.length / fieldsPerPage);
            let currentPage = 0;

            // Create embed for current page
            const createEmbed = (page: number) => {
                const embed = new EmbedBuilder()
                    .setColor("#000000")
                    .setTitle(`${lang.var_permission} (${page + 1}/${pages})`)
                    .setTimestamp();

                const startIdx = page * fieldsPerPage;
                const endIdx = Math.min(startIdx + fieldsPerPage, allFields.length);

                for (let i = startIdx; i < endIdx; i++) {
                    embed.addFields(allFields[i]);
                }

                return embed;
            };

            // Create navigation buttons
            const createButtons = (page: number) => {
                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('◀')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === pages - 1)
                    );
                return row;
            };

            // Only show pagination if there are more than 15 fields
            if (allFields.length <= fieldsPerPage) {
                const embed = createEmbed(0);
                await client.method.interactionSend(interaction, { embeds: [embed] });
                return;
            }

            // Send initial message with buttons
            const message = await client.method.interactionSend(interaction, {
                embeds: [createEmbed(currentPage)],
                components: [createButtons(currentPage)]
            }) as Message;

            // Create button collector
            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000 // 5 minutes
            });

            collector.on('collect', async (i: ButtonInteraction) => {
                if (i.user.id !== interaction.user.id) {
                    await i.reply({ content: lang.help_not_for_you, ephemeral: true });
                    return;
                }

                if (i.customId === 'prev') {
                    currentPage = Math.max(0, currentPage - 1);
                } else if (i.customId === 'next') {
                    currentPage = Math.min(pages - 1, currentPage + 1);
                }

                await i.update({
                    embeds: [createEmbed(currentPage)],
                    components: [createButtons(currentPage)]
                });
            });

            collector.on('end', async () => {
                // Remove buttons when collector expires
                await message.edit({
                    embeds: [createEmbed(currentPage)],
                    components: []
                }).catch(() => { });
            });
        } else if (choice === "delete") {
            const commands = interaction.options.getString("command");

            // If command is specified, delete permissions for that command only
            if (commands) {
                const existingPerms = await client.db.get(`${interaction.guildId}.UTILS.PERMS.${commands}`) as DatabaseStructure.PermCommandData | DatabaseStructure.PermLevel | undefined;

                if (!existingPerms) {
                    await client.method.interactionSend(interaction, { content: lang.perm_command_delete_dont_exist });
                    return;
                }

                await client.db.delete(`${interaction.guildId}.UTILS.PERMS.${commands}`);
                await client.method.interactionSend(interaction, {
                    content: lang.perm_command_delete_command_deleted
                        .replace("${commands}", commands)
                });
                return;
            } else {
                await client.method.interactionSend(interaction, { content: lang.perm_command_delete_specify_command });
                return;
            }
        } else if (choice === "delete-all") {
            const perms = interaction.options.getString("permission");
            const customRole = interaction.options.getRole("custom-role");
            const customUser = interaction.options.getUser("custom-user");

            let changes = [];

            // We need at least one of the options to proceed
            if (!perms && !customRole && !customUser) {
                await client.method.interactionSend(interaction, {
                    content: lang.perm_command_delete_all_one
                });
                return;
            }

            // only one of the options can be specified
            if ((perms && customRole) || (perms && customUser) || (customRole && customUser)) {
                await client.method.interactionSend(interaction, {
                    content: lang.perm_command_delete_all_one_option
                });
                return;
            }

            // Get existing permissions
            const existingPerms = await client.db.get(`${interaction.guildId}.UTILS.PERMS`) as DatabaseStructure.UtilsPermsData;

            if (!existingPerms || Object.keys(existingPerms).length === 0) {
                await client.method.interactionSend(interaction, { content: lang.perm_list_no_command_set });
                return;
            }

            // Delete all permissions according to the specified option accross all commands
            if (perms) {
                for (const [commandName, permData] of Object.entries(existingPerms)) {
                    if (typeof permData === 'number') {
                        if (permData === parseInt(perms)) {
                            await client.db.delete(`${interaction.guildId}.UTILS.PERMS.${commandName}`);
                            changes.push(`- ${commandName} (${lang.var_level}: ${permData})\n`);
                        }
                    } else {
                        if (permData.level === parseInt(perms)) {
                            await client.db.delete(`${interaction.guildId}.UTILS.PERMS.${commandName}`);
                            changes.push(`- ${commandName} (${lang.var_level}: ${permData.level})\n`);
                        }
                    }
                }
            }

            if (customRole) {
                for (const [commandName, permData] of Object.entries(existingPerms)) {
                    if (typeof permData !== 'number') {
                        const roleIndex = permData.roles.indexOf(customRole.id);
                        if (roleIndex !== -1) {
                            permData.roles.splice(roleIndex, 1);
                            await client.db.set(`${interaction.guildId}.UTILS.PERMS.${commandName}`, permData);
                            changes.push(`- ${commandName} (${lang.var_roles}: @${customRole.name})\n`);
                        }
                    }
                }
            }

            if (customUser) {
                for (const [commandName, permData] of Object.entries(existingPerms)) {
                    if (typeof permData !== 'number') {
                        const userIndex = permData.users.indexOf(customUser.id);
                        if (userIndex !== -1) {
                            permData.users.splice(userIndex, 1);
                            await client.db.set(`${interaction.guildId}.UTILS.PERMS.${commandName}`, permData);
                            changes.push(`- ${commandName} (${lang.var_user}: ${customUser.id})\n`);
                        }
                    }
                }
            }

            if (changes.length === 0) {
                await client.method.interactionSend(interaction, { content: lang.perm_command_delete_all_zero_change });
                return;
            } else {
                let msg = `\`\`\`diff\n${changes.join('')}\`\`\``;
                let type = perms ? lang.var_permission : customRole ? lang.var_roles : lang.var_user;
                let value = perms ? perms : customRole ? customRole.toString() : customUser ? customUser.toString() : '';

                msg += lang.perm_command_delete_all_command_ok
                    .replace("${changes.length}", changes.length.toString())
                    .replace("${type}", type)
                    .replace("${value}", value);
                await client.method.interactionSend(interaction, { content: msg });
                return;
            }
        }
    }
};