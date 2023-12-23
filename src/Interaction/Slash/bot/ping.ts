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
    ApplicationCommandType,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
} from 'discord.js'

import { Command } from '../../../../types/command';
import ping from 'ping';

export const command: Command = {
    name: 'ping',
    description: 'Get the bot latency!',
    category: 'bot',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {

        let data = await client.functions.getLanguageData(interaction.guild?.id);
        await interaction.reply({ content: ':ping_pong:' });

        let network: string = '';
        let API: string = '';

        await ping.promise.probe("google.com").then(result => { network = (result.time as string) }).catch(e => { network = data.ping_down_msg });
        await ping.promise.probe("discord.com").then(result => { API = (result.time as string) }).catch(e => { API = data.ping_down_msg });

        let embed = new EmbedBuilder()
            .setColor("#319938")
            .setTitle("Pong! 🏓")
            .setDescription(data.ping_embed_desc
                .replace('${await network}', await network)
                .replace('${await API}', await API)
            );

        await interaction.editReply({ content: '', embeds: [embed] });
        return;
    },
};