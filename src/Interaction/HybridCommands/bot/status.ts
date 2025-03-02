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
    Client,
    EmbedBuilder,
    ChatInputCommandInteraction,
    time,
    ApplicationCommandType,
    Message
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import os from 'node:os';
import { getCacheStorage } from '../../../core/core.js';

function niceBytes(a: Number) { let b = 0, c = parseInt((a.toString()), 10) || 0; for (; 1024 <= c && ++b;)c /= 1024; return c.toFixed(10 > c && 0 < b ? 1 : 0) + " " + ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][b] }

export const command: Command = {
    name: 'status',

    aliases: ["server"],

    description: 'Get the bot status! (Only for the bot owner)',
    description_localizations: {
        "fr": "Obtenez le statut du bot ! (Uniquement pour le propriétaire du bot)"
    },

    category: 'bot',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    permission: null,
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        // if (!client.owners.includes(interaction.member.user.id)) {
        //     await client.func.method.interactionSend(interaction, { content: lang.status_be_bot_dev });
        //     return;
        // };
        let embed = new EmbedBuilder()
            .setColor("#82cda8")
            .setFields(
                { name: "Cpu", value: `${os.cpus()[0].model} (${os.machine()})`, inline: false },
                { name: "Memory", value: `${niceBytes(os.totalmem() - os.freemem())}/${niceBytes(os.totalmem())}`, inline: false },
                { name: "Machine Uptime", value: `${time(new Date(Date.now() - os.uptime() * 1000), 'd')}`, inline: false },
                { name: "Bot Uptime", value: `${time(new Date(getCacheStorage()?.initialized_timestamp!), 'd')}` },
                { name: "OS", value: `${os.platform()} ${os.type()} ${os.release()}`, inline: false },
                { name: "Bot Version", value: `${client.version.ClientVersion}`, inline: false },
                { name: "NodeJS Version", value: `${process.version}`, inline: false }
            )
            .setThumbnail(interaction.guild.iconURL() as string)
            .setFooter(await client.func.displayBotName.footerBuilder(interaction));

        await client.func.method.interactionSend(interaction, {
            embeds: [embed],
            files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
        });
        return;
    },
};