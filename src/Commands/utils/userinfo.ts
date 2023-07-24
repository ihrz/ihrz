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

import {
    Client,
    Collection,
    ChannelType,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} from 'discord.js'

import { Command } from '../../../types/command';
import logger from '../../core/logger';
import ms from 'ms';
import config from '../../files/config';
import moment from 'moment';
import DiscordOauth2 from 'discord-oauth2';
import axios from 'axios';

import * as db from '../../core/functions/DatabaseModel';
import * as apiUrlParser from '../../core/functions/apiUrlParser';

const oauth = new DiscordOauth2();

interface Badge {
    Value: number;
    Emoji: string;
}

const badges: { [key: string]: Badge } = {
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

// Thank Stanley for this code part (pirate here lmao)
function getBadges(flags: number) {
    let b: string = '';
    for (const prop in badges) {
        let o = badges[prop];
        if ((flags & o.Value) === o.Value) b += o.Emoji;
    }
    if (b === '') b = 'None';
    return b;
};

export const command: Command = {
    name: 'userinfo',
    description: 'Get information about a user!',
    options: [
        {
            name: 'user',
            type: ApplicationCommandOptionType.User,
            description: 'user you want to lookup',
            required: false
        }
    ],
    category: 'utils',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let member = interaction.options.getUser("user") || interaction.user;

        function getSubscriptions(response: { available: string; connectionToken: any; }) {
            if (!response.available) { return };
            //si il n'est pas enregistré dans la db
            if (response.available == "no") {
                let description: string = `${getBadges(member.flags)}\n**User:** \`${member.username}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\`\n[My nitro is not showed](${apiUrlParser.LoginURL()})`;
                sendMessage(description)
            };

            if (response.available == "yes") {
                let descriptionTwo: string;
                const access_token = response.connectionToken;
                oauth.getUser(access_token).then(data => {
                    switch (data.premium_type) {
                        case 0:
                            /*Don't have nitro*/
                            descriptionTwo = `${getBadges(member.flags)}\n**User:** \`${member.username}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\``;
                            sendMessage(descriptionTwo)
                            break;
                        case 1:
                            /* Discord Nitro Classic*/
                            if (getBadges(member.flags) === 'None') {
                                descriptionTwo = `<:NITRO:1047317443770581062>\n**User:** \`${member.username}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\``;
                            } else {
                                descriptionTwo = `${getBadges(member.flags)}<:NITRO:1047317443770581062>\n**User:** \`${member.username}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\``;
                            }
                            sendMessage(descriptionTwo);
                            break;
                        case 2:
                            /* Discord Nitro Boost*/
                            if (getBadges(member.flags) === 'None') {
                                descriptionTwo = `<:NITRO:1047317443770581062><:BOOST:1047322188493099038>\n**User:** \`${member.username}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\``;
                            } else {
                                descriptionTwo = `${getBadges(member.flags)}<:NITRO:1047317443770581062><:BOOST:1047322188493099038>\n**User:** \`${member.username}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\``;
                            }
                            sendMessage(descriptionTwo);
                            break;
                        case 3:
                            /* Discord Nitro Basic*/
                            if (getBadges(member.flags) === 'None') {
                                descriptionTwo = `<:NITRO:1047317443770581062>\n**User:** \`${member.username}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\``;
                            } else {
                                descriptionTwo = `${getBadges(member.flags)}<:NITRO:1047317443770581062>\n**User:** \`${member.username}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\``;
                            }
                            sendMessage(descriptionTwo);
                            break;
                    };
                })
            }
        };
        async function sendMessage(description: string | null) {
            let embed = new EmbedBuilder()
                .setAuthor({ name: `${member.username}`, iconURL: member.displayAvatarURL({ dynamic: true }) })
                .setThumbnail(member.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `ID: ${member.id}` })
                .setTimestamp()
                .setColor("#0014a8")
                .setDescription(description);

            return interaction.editReply({ embeds: [embed], content: "✅ Fetched !" });
        };

        await interaction.reply({ content: data.userinfo_wait_please });

        const requestData = {
            tokent: 'want',
            adminKey: config.api.apiToken,
            userid: member.id,
            tor: 'CHECK_IN_SYSTEM'
        };

        try {
            const response = await axios.post(apiUrlParser.ApiURL(), requestData);
            getSubscriptions(response.data);
        } catch (error: any) {
            logger.err(error);

            let embed = new EmbedBuilder()
                .setAuthor({ name: `${member.username}`, iconURL: member.displayAvatarURL({ dynamic: true }) })
                .setThumbnail(member.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `ID: ${member.id}` })
                .setTimestamp()
                .setColor('#0014a8')
                .setDescription(`${getBadges(member.flags)}\n**User:** \`${member.username}\`\n**ID:** \`${member.id}\`\n**Joined Discord At:** \`${moment(member.createdAt)}\`\n[🔴 API DOWN](${apiUrlParser.LoginURL()})`)

            await interaction.editReply({ embeds: [embed], content: '🔴 API DOWN' });
        };
    },
};