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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    Message,
    User,
} from 'discord.js';

import * as apiUrlParser from '../../../core/functions/apiUrlParser.js';
import { LanguageData } from '../../../../types/languageData.js';
import { axios } from '../../../core/functions/axios.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


        if (await client.db.get(`${interaction.guildId}.GUILD.FUN.states`) === "off") {
            await client.func.method.interactionSend(interaction, { content: lang.fun_category_disable });
            return;
        };
        if (interaction instanceof ChatInputCommandInteraction) {
            var kiss = interaction.options.getUser("user") as User;
            var user = interaction.user;
        } else {
            
            var kiss = await client.func.method.user(interaction, args!, 0) || interaction.author;
            var user = interaction.author;
        }

        let url = apiUrlParser.assetsFinder(client.assets, "kiss");

        axios.get(url)
            .then(async () => {
                let embed = new EmbedBuilder()
                    .setColor("#ff0884")
                    .setDescription(lang.kiss_embed_description
                        .replace(/\${kiss\.id}/g, kiss.id)
                        .replace(/\${interaction\.user\.id}/g, user.id)
                    )
                    .setImage(url)
                    .setTimestamp()
                await client.func.method.interactionSend(interaction, { embeds: [embed] });
                return;
            }).catch(async (err) => {
                await client.func.method.interactionSend(interaction, { content: lang.fun_var_down_api });
            });
    },
};