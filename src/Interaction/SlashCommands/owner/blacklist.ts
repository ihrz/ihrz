/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import {
    Client,
    EmbedBuilder,
    ApplicationCommandOptionType,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ChatInputCommandInteraction,
    GuildMember,
    GuildMemberManager,
    ApplicationCommandType
} from 'discord.js'

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'blacklist',

    description: 'Add a user to the blacklist!',
    description_localizations: {
        "fr": "Ajoutez un utilisateur à la liste noir"
    },

    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionType.User,

            description: 'The user you want to blacklist...',
            description_localizations: {
                "fr": "L'utilisateur que vous voulez blacklist"
            },

            required: false
        },
        {
            name: 'reason',
            type: ApplicationCommandOptionType.String,

            description: 'The reason why you want to blacklist this member',
            description_localizations: {
                "fr": "La raison de pourquoi vous voulez le mettre dans la liste-noire"
            },

            required: false
        }
    ],
    thinking: false,
    category: 'owner',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {

        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;
        let tableOwner = client.db.table('OWNER');
        let tableBlacklist = client.db.table('BLACKLIST');

        if (await tableOwner.get(`${interaction.user.id}.owner`) !== true) {
            await interaction.reply({ content: data.blacklist_not_owner });
            return;
        };

        var blacklistedUsers = await tableBlacklist.all();

        let member = interaction.options.getMember('user') as GuildMember;
        let user = interaction.options.getUser('user');
        let reason = interaction.options.getString('reason');

        if (!member && !user) {
            if (!blacklistedUsers.length) {
                await interaction.reply({
                    content: data.blacklist_no_one_blacklist
                        .replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo),
                    ephemeral: true
                });
                return;
            };

            let currentPage = 0;
            let usersPerPage = 5;
            let pages: { title: string; description: string; }[] = [];

            for (let i = 0; i < blacklistedUsers.length; i += usersPerPage) {
                let pageUsers = blacklistedUsers.slice(i, i + usersPerPage);
                let pageContent = pageUsers.map(userObj => {
                    return `<@${userObj.id}>\n\`${userObj.value.reason || data.blacklist_var_no_reason}\``;
                }).join('\n');

                pages.push({
                    title: data.blacklist_embed_title
                        .replace('${i / usersPerPage + 1}', (i / usersPerPage + 1).toString()),
                    description: pageContent,
                });
            }

            let createEmbed = () => {
                return new EmbedBuilder()
                    .setColor("#2E2EFE")
                    .setTitle(pages[currentPage]?.title)
                    .setDescription(pages[currentPage]?.description)
                    .setFooter({
                        text: data.history_embed_footer_text
                            .replace('${currentPage + 1}', (currentPage + 1).toString())
                            .replace('${pages.length}', pages.length.toString()),
                        iconURL: "attachment://icon.png"
                    })
                    .setTimestamp()
            };

            let row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('previousPage')
                    .setLabel('⬅️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('nextPage')
                    .setLabel('➡️')
                    .setStyle(ButtonStyle.Secondary),
            );

            let messageEmbed = await interaction.reply({
                embeds: [createEmbed()],
                components: [row],
                files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
            });

            let collector = messageEmbed.createMessageComponentCollector({
                filter: async (i) => {
                    await i.deferUpdate(); return interaction.user.id === i.user.id;
                },
                time: 60000
            });

            collector.on('collect', (interaction: { customId: string; }) => {
                if (interaction.customId === 'previousPage') {
                    currentPage = (currentPage - 1 + pages.length) % pages.length;
                } else if (interaction.customId === 'nextPage') {
                    currentPage = (currentPage + 1) % pages.length;
                }

                messageEmbed.edit({ embeds: [createEmbed()] });
            });

            collector.on('end', () => {
                row.components.forEach((component) => {
                    if (component instanceof ButtonBuilder) {
                        component.setDisabled(true);
                    }
                });
                messageEmbed.edit({ components: [row] });
            });
        };

        if (member) {
            if (member.user.id === client.user?.id) {
                await interaction.reply({ content: data.blacklist_bot_lol });
                return;
            };

            let fetched = await tableBlacklist.get(`${member.user.id}`);

            if (fetched) {
                await interaction.reply({
                    content: data.blacklist_already_blacklisted
                        .replace(/\${member\.user\.username}/g, member.user.globalName || member.user.username)
                });
                return;
            };

            await tableBlacklist.set(`${member.user.id}`, {
                blacklisted: true,
                reason: reason
            });

            member.ban({ reason: 'blacklisted !' }).then(async () => {
                await interaction.reply({
                    content: data.blacklist_command_work
                        .replace(/\${member\.user\.username}/g, member.user.globalName || member.user.username)
                });
                return;
            }).catch(async () => {
                await interaction.reply({
                    content: data.blacklist_blacklisted_but_can_ban_him
                        .replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                });
                return;
            });

        } else if (user) {

            if (user.id === client.user?.id) {
                await interaction.reply({ content: data.blacklist_bot_lol });
                return;
            };

            let fetched = await tableBlacklist.get(`${user.id}`);

            if (fetched) {
                await interaction.reply({
                    content: data.blacklist_already_blacklisted
                        .replace(/\${member\.user\.username}/g, user.globalName || user.username)
                });
                return;
            }

            await tableBlacklist.set(`${user.id}`, {
                blacklisted: true,
                reason: reason
            });

            await interaction.reply({
                content: data.blacklist_command_work
                    .replace(/\${member\.user\.username}/g, user.globalName || user.username)
            });

            let guilds = client.guilds.cache.map(guild => guild.id);

            for (let guildId of guilds) {
                let guild = client.guilds.cache.find(guild => guild.id === guildId);

                guild?.members.cache.get(user.id)?.ban({ reason: reason || 'blacklisted!' });
            };

            return;
        }
    },
};