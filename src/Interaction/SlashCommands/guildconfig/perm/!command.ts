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
    ButtonStyle,
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
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, command: Option | Command | undefined, neededPerm: number) => {


        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        if ((!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator) && neededPerm === 0)) {
            await interaction.editReply({ content: lang.guildprofil_not_admin });
            return;
        }

        let choice = interaction.options.getString("action")!;

        if (choice === "change") {
            const requestedCommand = interaction.options.getString("command");
            const perms = interaction.options.getString("permission")

            if (!requestedCommand || !perms) {
                await client.method.interactionSend(interaction, { content: lang.perm_add_args_error })
                return;
            }

            const commandParts = requestedCommand.split(" ");
            let fetchedCommand: Command | Option | undefined = client.commands.get(commandParts[0]);

            if (fetchedCommand && commandParts.length > 1) {
                fetchedCommand = fetchedCommand.options?.find(x => x.name === commandParts[1]);
            }

            if (perms! === "0") {
                await client.db.delete(`${interaction.guildId}.UTILS.PERMS.${fetchedCommand?.name}`);
            } else {
                await client.db.set(`${interaction.guildId}.UTILS.PERMS.${fetchedCommand?.name}`, parseInt(perms!));
            }

            if (fetchedCommand) {
                const commandType = commandParts.length === 1 ? lang.var_command :
                    commandParts.length === 2 ? lang.var_subcommand : lang.var_subcommand_group;

                await client.method.interactionSend(interaction, `${commandType}: ${fetchedCommand.name}`);
            } else {
                await client.method.interactionSend(interaction, lang.var_unreachable_command);
            }
        } else if (choice === "list") {
            let res = await client.db.get(`${interaction.guildId}.UTILS.PERMS`) as DatabaseStructure.UtilsPermsData;

            if (!res || Object.keys(res).length === 0) {
                await client.method.interactionSend(interaction, { content: lang.perm_list_no_command_set });
                return;
            }

            let permissions = Object.entries(res);

            permissions.sort((a, b) => a[1] - b[1]);

            let currentPage = 0;
            let itemsPerPage = 15;
            let pages = [];

            let groupedPermissions: { [key: number]: string[] } = {};
            permissions.forEach(([perm, level]) => {
                if (!groupedPermissions[level]) {
                    groupedPermissions[level] = [];
                }
                groupedPermissions[level].push(perm);
            });

            Object.entries(groupedPermissions).forEach(([level, perms]) => {
                let pageContent = perms.map(perm => `**\`${perm}\`**`).join('\n');
                pages.push({
                    title: `${lang.var_level} ${level}`,
                    description: pageContent,
                });
            });

            for (let i = 0; i < permissions.length; i += itemsPerPage) {
                let pagePermissions = permissions.slice(i, i + itemsPerPage);
                let pageContent = pagePermissions.map(([perm, level]) => `**\`${perm}\`**: ${lang.var_level} ${level}`).join('\n');

                pages.push({
                    title: lang.prevnames_embed_footer_text.replace("${currentPage + 1}", String(i / itemsPerPage + 1))
                        .replace("/${pages.length}", ""),
                    description: pageContent,
                });
            }

            let createEmbed = () => {
                return new EmbedBuilder()
                    .setColor("#000000")
                    .setTitle(pages[currentPage].title)
                    .setDescription(pages[currentPage].description)
                    .setFooter({
                        text:
                            lang.prevnames_embed_footer_text
                                .replace('${currentPage + 1}', (currentPage + 1).toString())
                                .replace('${pages.length}', pages.length.toString()),
                        iconURL: "attachment://footer_icon.png"
                    })
                    .setTimestamp();
            };

            let row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('previousPage')
                    .setLabel('<<<')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('nextPage')
                    .setLabel('>>>')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === pages.length - 1)
            );

            let messageEmbed = await client.method.interactionSend(interaction, {
                embeds: [createEmbed()],
                components: [row],
                files: [await client.method.bot.footerAttachmentBuilder(interaction)]
            });

            let collector = messageEmbed.createMessageComponentCollector({
                filter: async (i) => {
                    await i.deferUpdate();
                    return i.user.id === interaction.user.id;
                },
                time: 60000
            });

            collector.on('collect', async (interaction_2) => {
                if (interaction_2.customId === 'previousPage') {
                    currentPage = (currentPage - 1 + pages.length) % pages.length;
                } else if (interaction_2.customId === 'nextPage') {
                    currentPage = (currentPage + 1) % pages.length;
                }

                row.components[0].setDisabled(currentPage === 0);
                row.components[1].setDisabled(currentPage === pages.length - 1);

                await messageEmbed.edit({ embeds: [createEmbed()], components: [row] });
            });

            collector.on('end', async () => {
                await messageEmbed.edit({ components: [] });
            });
        }
    }
};