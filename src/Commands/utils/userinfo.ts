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

import { Client, ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import * as apiUrlParser from '../../core/functions/apiUrlParser';
import { Command } from '../../../types/command';
import DiscordOauth2 from 'discord-oauth2';
import config from '../../files/config';
import logger from '../../core/logger';
import moment from 'moment';
import axios from 'axios';

const oauth = new DiscordOauth2();

interface Badge {
    Value: number;
    Emoji: string;
};

let badges: { [key: string]: Badge } = {
    Discord_Employee: {
        Value: 1,
        Emoji: "<:STAFF:1047264630109642802>",
    },
    Partnered_Server_Owner: {
        Value: 2,
        Emoji: "<:PARTENAIRE:1047264628704559164>",
    },
    HypeSquad_Events: {
        Value: 4,
        Emoji: "<:HYPESQUAD_EVENTS:1047264625156169778>",
    },
    Bug_Hunter_Level_1: {
        Value: 8,
        Emoji: "<:BUG1:1047264619686789170>",
    },
    Early_Supporter: {
        Value: 512,
        Emoji: "<:EARLY:1047264622249521212>",
    },
    Bug_Hunter_Level_2: {
        Value: 16384,
        Emoji: "<:BUG2:1047264620873797702>",
    },
    Early_Verified_Bot_Developer: {
        Value: 131072,
        Emoji: "<:EARLY_CERTIFIED_DISCORD_BOT_DEVE:1047264623805595758>",
    },
    House_Bravery: {
        Value: 64,
        Emoji: "<:BRAVERY:1047264617317011556>",
    },
    House_Brilliance: {
        Value: 128,
        Emoji: "<:BRILLANCE:1047264618554331157>",
    },
    House_Balance: {
        Value: 256,
        Emoji: "<:BALANCE:1047264615509270579>",
    },
    Active_Developers: {
        Value: 4194304,
        Emoji: "<:VERIFIED_DEV:1047266396725334078>",
    },
    Discord_Moderators: {
        Value: 262144,
        Emoji: "<:MODERATORS:1047264626695483453>",
    },
    Slash_Bot: {
        Value: 524288,
        Emoji: "<:SLASH_BOTS:1116790067365683251>",
    },
};

// Fonction pour obtenir les badges de l'utilisateur
function getBadges(flags: number) {
    const badgeValues = Object.values(badges);
    return badgeValues
        .filter(badge => (flags & badge.Value) === badge.Value)
        .map(badge => badge.Emoji)
        .join('');
};

export const command: Command = {
    name: 'userinfo',
    description: 'Get information about a user!',
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionType.User,
            description: 'user you want to lookup',
            required: false,
        },
    ],
    category: 'utils',
    run: async (client: Client, interaction: any) => {
        const data = await client.functions.getLanguageData(interaction.guild.id);
        const member = interaction.options.getUser('user') || interaction.user;

        async function sendMessage(description: string) {
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${member.username}`, iconURL: member.displayAvatarURL({ dynamic: true }) })
                .setThumbnail(member.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `ID: ${member.id}` })
                .setTimestamp()
                .setColor('#0014a8')
                .setDescription(description);

            return interaction.editReply({ embeds: [embed], content: '✅ Fetched !' });
        };

        await interaction.reply({ content: data.userinfo_wait_please });

        let requestData = {
            tokent: 'want',
            adminKey: config.api.apiToken,
            userid: member.id,
            tor: 'CHECK_IN_SYSTEM',
        };

        let nitr0 = '';

        try {
            let response = await axios.post(apiUrlParser.ApiURL(), requestData);
            let description = '';
            if (response.data.available === 'yes') {
                const access_token = response.data.connectionToken;
                const userData = await oauth.getUser(access_token);

                if (userData.premium_type === 1) {
                    nitr0 = '<:NITRO:1047317443770581062>';
                } else if (userData.premium_type === 2) {
                    nitr0 = '<:NITRO:1047317443770581062><:BOOST:1047322188493099038>';
                } else if (userData.premium_type === 3) {
                    nitr0 = '<:NITRO:1047317443770581062>';
                };
            };

            description = getBadges(member.flags) + nitr0 + `\n**User:** \`${member.username}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\``;
            if (nitr0 === '') { description += `\n[My nitro is not shown](${apiUrlParser.LoginURL()})`; };

            sendMessage(description);

        } catch (error: any) {
            logger.err(error);

            let description = `${getBadges(member.flags)}\n**User:** \`${member.username}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\`\n[🔴 API DOWN](${apiUrlParser.LoginURL()})`;

            await sendMessage(description);
        }
    },
};