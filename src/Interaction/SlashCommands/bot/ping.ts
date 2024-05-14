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
    ApplicationCommandType,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
} from 'discord.js'

import { Command } from '../../../../types/command';
import ping from 'ping';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'ping',

    description: 'Get the bot latency!',
    description_localizations: {
        "fr": "Obtenir la latence du bot"
    },

    category: 'bot',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {

        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;
        await interaction.reply({ content: client.iHorizon_Emojis.icon.iHorizon_Discord_Loading });

        let _net01: number | string = '';
        let _net02: number | string = '';
        let _net03: number | string = '';
        let _net04: number | string = '';

        await ping.promise.probe("google.com").then(result => { _net01 = Number(result.time) }).catch(() => { _net01 = data.ping_down_msg });
        await ping.promise.probe("cloudflare.com").then(result => { _net02 = Number(result.time) }).catch(() => { _net02 = data.ping_down_msg });
        await ping.promise.probe("discord.com").then(result => { _net03 = Number(result.time) }).catch(() => { _net03 = data.ping_down_msg });
        await ping.promise.probe("ihorizon.me").then(result => { _net04 = Number(result.time) }).catch(() => { _net04 = data.ping_down_msg });

        let averagePing = (parseInt(_net01) + parseInt(_net02) + parseInt(_net03) + parseInt(_net04)) / 4;

        let embed = new EmbedBuilder()
            .setColor(2829617)
            .setDescription(data.ping_embed_desc
                .replaceAll('${interaction.client.user.username}', interaction.client.user.username)
                .replaceAll('${_net03}', _net03)
                .replaceAll('${_net02}', _net02)
                .replaceAll('${_net01}', _net01)
                .replaceAll('${client.iHorizon_Emojis.icon.Crown_Logo}', client.iHorizon_Emojis.icon.Crown_Logo)
                .replace('${_net04}', _net04)
                .replace('${client.ws.ping}', client.ws.ping.toString())
                .replace('${interaction.client.user.username}', interaction.client.user.username)
                .replace('${client.iHorizon_Emojis.icon.iHorizon_Pointer}', client.iHorizon_Emojis.icon.iHorizon_Pointer)
                .replace('${averagePing}', averagePing.toString())
            )
            .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" });

        await interaction.editReply({
            content: null,
            embeds: [embed],
            files: [{ attachment: await client.functions.image64(client.user?.displayAvatarURL()), name: 'icon.png' }],
        });
        return;
    },
};