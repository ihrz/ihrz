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
    ChatInputCommandInteraction
} from 'pwss';

import { axios } from '../../../core/functions/axios.js';
import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData.js';

export const command: Command = {

    name: 'userinfo',

    description: 'Get information about a user!',
    description_localizations: {
        "fr": "Obtenir des informations sur un utilisateur"
    },

    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionType.User,

            description: 'user you want to lookup',
            description_localizations: {
                "fr": "utilisateur que vous souhaitez rechercher"
            },

            required: false,
        },
    ],
    category: 'utils',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

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

        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;
        let member = interaction.options.getUser('user') || interaction.user;

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
                .setFooter({ text: await client.func.displayBotName(interaction.guild?.id), iconURL: "attachment://ihrz_logo.png" })
                .setThumbnail("attachment://user_icon.gif")
                .setTimestamp()
                .setColor('#0014a8')
                .setFields(
                    {
                        name: data.userinfo_embed_fields_1_name,
                        value: getBadges(member.flags?.bitfield!) || data.userinfo_var_notfound,
                        inline: true,
                    },
                    {
                        name: data.userinfo_embed_fields_2_name,
                        value: user.username,
                        inline: true,
                    },
                    {
                        name: data.userinfo_embed_fields_3_name,
                        value: user.displayName || data.userinfo_var_notfound,
                        inline: true,
                    },
                    {
                        name: data.userinfo_embed_fields_4_name,
                        value: time(user.createdAt, "D") || data.userinfo_var_notfound,
                        inline: true,
                    },
                    {
                        name: data.userinfo_embed_fields_5_name,
                        value: GetNitro(user_1.premium_type) || data.userinfo_var_notfound,
                        inline: true,
                    }
                )
                .setImage("attachment://user_banner.gif");

            var files: { name: string; attachment: string }[] = [
                {
                    attachment: await interaction.client.func.image64(interaction.client.user.displayAvatarURL({ forceStatic: false })),
                    name: 'ihrz_logo.png'
                },
                {
                    attachment: user.displayAvatarURL({ size: 512, forceStatic: false }),
                    name: 'user_icon.gif'
                }
            ];

            if (banner) files.push({
                attachment: await interaction.client.func.image64(`https://cdn.discordapp.com/banners/${user_1?.id}/${banner}.${format}?size=1024`),
                name: 'user_banner.gif'
            });

            await interaction.editReply({
                content: client.iHorizon_Emojis.icon.Yes_Logo,
                embeds: [embed],
                files: files,
                components: [
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Link)
                                .setURL(`https://discordapp.com/users/${user.id}`)
                                .setLabel(data.userinfo_button_label)
                        )
                ]
            });

            return;
        };

        await interaction.reply({
            content: data.userinfo_wait_please.replace("${client.iHorizon_Emojis.icon.Timer}", client.iHorizon_Emojis.icon.Timer)
        });

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