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
    Message,
    PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var inputData = interaction.options.getString("giveaway-id") as string;
        } else {
            
            var inputData = client.func.method.string(args!, 0) as string;
        };

        if (!await client.giveawaysManager.isValid(inputData)) {
            await client.func.method.interactionSend(interaction, {
                content: lang.end_not_find_giveaway
                    .replace(/\${gw}/g, inputData)
            });
            return;
        };

        if (await client.giveawaysManager.isEnded(inputData)) {
            await client.func.method.interactionSend(interaction, { content: lang.end_command_error });
            return;
        };

        // @ts-ignore
        await client.giveawaysManager.listEntries(interaction, inputData)
        return;
    },
};