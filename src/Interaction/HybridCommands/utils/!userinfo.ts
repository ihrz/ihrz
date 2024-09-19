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
    ApplicationCommandOptionType,
    EmbedBuilder,
    ApplicationCommandType,
    time,
    User,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Message,
} from 'discord.js';

import { axios } from '../../../core/functions/axios.js';
import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData.js';

import { SubCommandArgumentValue } from '../../../core/functions/method';
export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        let permCheck = await client.method.permission.checkCommandPermission(interaction, command.command!);
        if (!permCheck.allowed) return client.method.permission.sendErrorMessage(interaction, lang, permCheck.neededPerm || 0);

        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        let badges: {
            [key: string]: {
                Value: number;
                Emoji: string;
            }
        } = {
            Discord_Employee: {
                Value: 1,
                Emoji: client.iHorizon_Emojis.badge.Discord_Employee,
            },
            Partnered_Server_Owner: {
                Value: 2,
                Emoji: client.iHorizon_Emojis.badge.Partnered_Server_Owner,
            },
            HypeSquad_Events: {
                Value: 4,
                Emoji: client.iHorizon_Emojis.badge.HypeSquad_Events,
            },
            Bug_Hunter_Level_1: {
                Value: 8,
                Emoji: client.iHorizon_Emojis.badge.Bug_Hunter_Level_1,
            },
            Early_Supporter: {
                Value: 512,
                Emoji: client.iHorizon_Emojis.badge.Early_Supporter,
            },
            Bug_Hunter_Level_2: {
                Value: 16384,
                Emoji: client.iHorizon_Emojis.badge.Bug_Hunter_Level_2,
            },
            Early_Verified_Bot_Developer: {
                Value: 131072,
                Emoji: client.iHorizon_Emojis.badge.Early_Verified_Bot_Developer,
            },
            House_Bravery: {
                Value: 64,
                Emoji: client.iHorizon_Emojis.badge.House_Bravery,
            },
            House_Brilliance: {
                Value: 128,
                Emoji: client.iHorizon_Emojis.badge.House_Brilliance,
            },
            House_Balance: {
                Value: 256,
                Emoji: client.iHorizon_Emojis.badge.House_Balance,
            },
            Active_Developers: {
                Value: 4194304,
                Emoji: client.iHorizon_Emojis.badge.Active_Developers,
            },
            Discord_Moderators: {
                Value: 262144,
                Emoji: client.iHorizon_Emojis.badge.Discord_Moderators,
            },
            Slash_Bot: {
                Value: 524288,
                Emoji: client.iHorizon_Emojis.badge.Slash_Bot,
            },
        };

        function getBadges(flags: number): string {
            let badgeValues = Object.values(badges);
            return badgeValues
                .filter(badge => (flags & badge.Value) === badge.Value)
                .map(badge => badge.Emoji)
                .join('');
        };

        if (interaction instanceof ChatInputCommandInteraction) {
            var member = interaction.options.getUser('user') || interaction.user;
        } else {
            var _ = await client.method.checkCommandArgs(interaction, command, args!, lang); if (!_) return;
            var member = await client.method.user(interaction, args!, 0) || interaction.author;
        };

        const originalInteraction = await client.method.interactionSend(interaction, {
            content: lang.userinfo_wait_please.replace("${client.iHorizon_Emojis.icon.Timer}", client.iHorizon_Emojis.icon.Timer)
        });

        async function sendMessage(user: User) {

            let format = 'png';

            let user_1 = (await axios.get(`https://discord.com/api/v10/users/${user?.id}`, {
                headers: {
                    Authorization: `Bot ${client.token}`
                }
            })).data;

            let banner = user_1.banner;

            if (banner !== null && banner?.substring(0, 2) === 'a_') {
                format = 'gif'
            };

            let embed = new EmbedBuilder()
                .setFooter(await client.method.bot.footerBuilder(interaction))
                .setThumbnail("attachment://user_icon.gif")
                .setTimestamp()
                .setColor('#0014a8')
                .setFields(
                    {
                        name: lang.userinfo_embed_fields_1_name,
                        value: getBadges(member.flags?.bitfield!) || lang.userinfo_var_notfound,
                        inline: true,
                    },
                    {
                        name: lang.userinfo_embed_fields_2_name,
                        value: user.username,
                        inline: true,
                    },
                    {
                        name: lang.userinfo_embed_fields_3_name,
                        value: user.displayName || lang.userinfo_var_notfound,
                        inline: true,
                    },
                    {
                        name: lang.userinfo_embed_fields_4_name,
                        value: time(user.createdAt, "D") || lang.userinfo_var_notfound,
                        inline: true,
                    },
                    {
                        name: lang.userinfo_embed_fields_5_name,
                        value: GetNitro(user_1.premium_type) || lang.userinfo_var_notfound,
                        inline: true,
                    }
                )
                .setImage("attachment://user_banner.gif");

            var files: { name: string; attachment: any }[] = [
                await client.method.bot.footerAttachmentBuilder(interaction),
                {
                    attachment: user.displayAvatarURL({ size: 512, forceStatic: false }),
                    name: 'user_icon.gif'
                }
            ];

            if (banner) files.push({
                attachment: await interaction.client.func.image64(`https://cdn.discordapp.com/banners/${user_1?.id}/${banner}.${format}?size=1024`),
                name: 'user_banner.gif'
            });

            await originalInteraction.edit({
                content: client.iHorizon_Emojis.icon.Yes_Logo,
                embeds: [embed],
                files: files,
                components: [
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Link)
                                .setURL(`https://discordapp.com/users/${user.id}`)
                                .setLabel(lang.userinfo_button_label)
                        )
                ]
            });

            return;
        };

        function GetNitro(input: number): string {
            let nitro = '';

            switch (input) {
                case 1:
                    nitro = client.iHorizon_Emojis.badge.Nitro;
                    break;
                case 2:
                    nitro = client.iHorizon_Emojis.badge.Nitro + client.iHorizon_Emojis.badge.Server_Boost_Badge;
                    break;
                case 3:
                    nitro = client.iHorizon_Emojis.badge.Nitro;
                    break;
            };

            return nitro;
        };

        sendMessage(member);
    },
};