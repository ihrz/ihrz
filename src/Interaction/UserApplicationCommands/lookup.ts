/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import { Client, EmbedBuilder, CommandInteraction, ApplicationCommandType } from 'discord.js';
import { AnotherCommand } from '../../../types/anotherCommand';
import DiscordOauth2 from 'discord-oauth2';
import config from '../../files/config.js';
import logger from '../../core/logger.js';
import moment from 'moment';
import axios from 'axios';

let oauth = new DiscordOauth2();

export const command: AnotherCommand = {
    name: 'User Lookup',
    type: ApplicationCommandType.User,
    thinking: false,
    run: async (client: Client, interaction: CommandInteraction) => {

        interface Badge {
            Value: number;
            Emoji: string;
        };

        let badges: { [key: string]: Badge } = {
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

        function getBadges(flags: number) {
            let badgeValues = Object.values(badges);
            return badgeValues
                .filter(badge => (flags & badge.Value) === badge.Value)
                .map(badge => badge.Emoji)
                .join('');
        };

        let data = await client.functions.getLanguageData(interaction.guild?.id);
        let member = interaction.options.getUser('user') || interaction.user;

        async function sendMessage(description: string) {
            let embed = new EmbedBuilder()
                .setAuthor({ name: `${member.username}`, iconURL: member.displayAvatarURL() })
                .setFooter({ text: `iHorizon`, iconURL: "attachment://icon.png" })
                .setThumbnail(member.displayAvatarURL())
                .setTimestamp()
                .setColor('#0014a8')
                .setDescription(description);

            await interaction.editReply({
                embeds: [embed],
                content: `${client.iHorizon_Emojis.icon.Yes_Logo} Fetched !`,
                files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
            });
            return;
        };

        await interaction.reply({
            content: data.userinfo_wait_please.replace("${client.iHorizon_Emojis.icon.Timer}", client.iHorizon_Emojis.icon.Timer)
        });

        let requestData = {
            tokent: 'want',
            adminKey: config.api.apiToken,
            userid: member.id,
            tor: 'CHECK_IN_SYSTEM',
        };

        let nitr0 = '';

        try {
            let response = await axios.post(client.functions.apiUrlParser.ApiURL, requestData);
            let description = '';

            if (response.data.available === 'yes') {
                let access_token = response.data.connectionToken;
                let userData = await oauth.getUser(access_token);

                if (userData.premium_type === 1) {
                    nitr0 = client.iHorizon_Emojis.badge.Nitro;
                } else if (userData.premium_type === 2) {
                    nitr0 = client.iHorizon_Emojis.badge.Nitro + client.iHorizon_Emojis.badge.Server_Boost_Badge;
                } else if (userData.premium_type === 3) {
                    nitr0 = client.iHorizon_Emojis.badge.Nitro;
                };
            };

            description = getBadges((member.flags as unknown as number)) + nitr0 + `\n**User:** \`${member.username}\`\n**GlobalName:** \`${member.globalName || member.username}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\``;
            if (nitr0 === '') { description += `\n[My nitro is not shown](${client.functions.apiUrlParser.LoginURL})`; };

            sendMessage(description);

        } catch (error: any) {
            logger.err(error);

            let description = `${getBadges((member.flags as unknown as number))}\n**User:** \`${member.username}\`\n**GlobalName:** \`${member.globalName || member.username}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\`\n[🔴 API DOWN](${client.functions.apiUrlParser.LoginURL})`;

            await sendMessage(description);
        };
    },
};