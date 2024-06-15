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
    Client,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ApplicationCommandType,
} from 'discord.js'

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'links',

    description: 'Show all links about iHorizon',
    description_localizations: {
        "fr": "Afficher tous les liens en rapport avec iHorizon"
    },

    category: 'bot',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;

        let websitebutton = new ButtonBuilder()
            .setLabel(data.links_website)
            .setStyle(ButtonStyle.Link)
            .setURL('https://ihrz.github.io');

        let githubbutton = new ButtonBuilder()
            .setLabel(data.links_github)
            .setStyle(ButtonStyle.Link)
            .setURL('https://github.com/ihrz/ihrz')

        let row = new ActionRowBuilder<ButtonBuilder>().addComponents(websitebutton, githubbutton);

        await interaction.reply({ content: data.links_message, components: [row] });
        return;
    },
};