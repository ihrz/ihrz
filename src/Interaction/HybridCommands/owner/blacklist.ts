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

import {
    Client,
    EmbedBuilder,
    ApplicationCommandOptionType,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ChatInputCommandInteraction,
    GuildMember,
    ApplicationCommandType,
    Message
} from 'pwss'

import { format } from '../../../core/functions/date-and-time.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

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
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;
        let tableOwner = client.db.table('OWNER');
        let tableBlacklist = client.db.table('BLACKLIST');

        if (await tableOwner.get(`${interaction.member.user.id}.owner`) !== true) {
            await client.args.interactionSend(interaction, { content: data.blacklist_not_owner });
            return;
        };

        var blacklistedUsers = await tableBlacklist.all();

        if (interaction instanceof ChatInputCommandInteraction) {
            var member = interaction.options.getMember('user') as GuildMember | null;
            var user = interaction.options.getUser('user');
            var reason = interaction.options.getString('reason');
        } else {
            var _ = await client.args.checkCommandArgs(interaction, command, args!, data); if (!_) return;
            var member = client.args.member(interaction, 0) as GuildMember | null;
            var user = client.args.user(interaction, 0);
            var reason = client.args.longString(args!, 0);
        };

        if (!member && !user) {
            if (!blacklistedUsers.length) {
                await client.args.interactionSend(interaction, {
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
                    return `<@${userObj.id}>\n├─ ${userObj.value.createdAt !== undefined ? format(new Date(userObj.value.createdAt), 'MMM DD YYYY') : data.profil_unknown}\n├─ \`${userObj.value.reason || data.blacklist_var_no_reason}\`\n├─ By ${userObj.value.owner || data.profil_unknown}`
                }).join('\n');

                pages.push({
                    title: data.blacklist_embed_title
                        .replace('${i / usersPerPage + 1}', (i / usersPerPage + 1).toString()),
                    description: pageContent,
                });
            }

            let createEmbed = async () => {
                return new EmbedBuilder()
                    .setColor(await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.embed_color.owner`) || "#2E2EFE")
                    .setTitle(pages[currentPage]?.title)
                    .setDescription(pages[currentPage]?.description)
                    .setFooter({
                        text: data.history_embed_footer_text
                            .replace('${currentPage + 1}', (currentPage + 1).toString())
                            .replace('${pages.length}', pages.length.toString()),
                        iconURL: "attachment://footer_icon.png"
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

            let messageEmbed = await client.args.interactionSend(interaction, {
                embeds: [await createEmbed()],
                components: [row],
                files: [await client.args.bot.footerAttachmentBuilder(interaction)]
            });

            let collector = messageEmbed.createMessageComponentCollector({
                filter: async (i) => {
                    await i.deferUpdate(); return interaction.member?.user.id === i.user.id;
                },
                time: 60000
            });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'previousPage') {
                    currentPage = (currentPage - 1 + pages.length) % pages.length;
                } else if (interaction.customId === 'nextPage') {
                    currentPage = (currentPage + 1) % pages.length;
                }

                messageEmbed.edit({ embeds: [await createEmbed()] });
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

        let guilds = client.guilds.cache.map(guild => guild.id);

        if (member) {
            if (member.user.id === client.user.id) {
                await client.args.interactionSend(interaction, { content: data.blacklist_bot_lol });
                return;
            };

            let fetched = await tableBlacklist.get(`${member.user.id}`);

            if (fetched) {
                await client.args.interactionSend(interaction, {
                    content: data.blacklist_already_blacklisted
                        .replace(/\${member\.user\.username}/g, member.user.globalName || member.user.username)
                });
                return;
            };

            await tableBlacklist.set(`${member.user.id}`, {
                blacklisted: true,
                reason: reason,
                owner: interaction.member.user.id,
                createdAt: new Date().getTime()
            });

            await member.ban({ reason: 'blacklisted !' }).then(async () => {
                await client.args.interactionSend(interaction, {
                    content: data.blacklist_command_work
                        .replace(/\${member\.user\.username}/g, String(member?.user.globalName || member?.user.username))
                });
            }).catch(async () => {
                await client.args.interactionSend(interaction, {
                    content: data.blacklist_blacklisted_but_can_ban_him
                        .replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                });
            });

            let banPromises = guilds.map(async guildId => {
                let guild = client.guilds.cache.find(guild => guild.id === guildId);
                if (guild) {
                    try {
                        await guild.members.ban(member?.user.id!, { reason: reason || 'blacklisted!' });
                        return true;
                    } catch {
                        return false;
                    }
                }
                return false;
            });

            let results = await Promise.all(banPromises);
            let successCount = results.filter(result => result).length;

            await interaction.channel.send({ content: `${member.user.username} is banned on **${successCount}** server(s) (\`${successCount}/${guilds.length}\`)` });
        } else if (user) {

            if (user.id === client.user.id) {
                await client.args.interactionSend(interaction, { content: data.blacklist_bot_lol });
                return;
            };

            let fetched = await tableBlacklist.get(`${user.id}`);

            if (fetched) {
                await client.args.interactionSend(interaction, {
                    content: data.blacklist_already_blacklisted
                        .replace(/\${member\.user\.username}/g, user.globalName || user.username)
                });
                return;
            }

            await tableBlacklist.set(`${user.id}`, {
                blacklisted: true,
                reason: reason,
                owner: interaction.member.user.id,
                createdAt: new Date().getTime()
            });

            await client.args.interactionSend(interaction, {
                content: data.blacklist_command_work
                    .replace(/\${member\.user\.username}/g, user.globalName || user.username)
            });

            let banPromises = guilds.map(async guildId => {
                let guild = client.guilds.cache.find(guild => guild.id === guildId);
                if (guild) {
                    try {
                        await guild.members.ban(user?.id!, { reason: reason || 'blacklisted!' });
                        return true;
                    } catch {
                        return false;
                    }
                }
                return false;
            });

            let results = await Promise.all(banPromises);
            let successCount = results.filter(result => result).length;

            await interaction.channel.send({ content: `${user.username} is banned on **${successCount}** server(s) (\`${successCount}/${guilds.length}\`)` });
        }
    },
};