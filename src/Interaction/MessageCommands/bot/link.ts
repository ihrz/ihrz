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
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Message,
    ApplicationCommandType,
} from 'pwss'

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
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (client: Client, interaction: Message, execTimestamp: number, args: string[]) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.author || !interaction.guild || !interaction.channel) return;

        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;

        let websitebutton = new ButtonBuilder()
            .setLabel(data.links_website)
            .setStyle(ButtonStyle.Link)
            .setURL('https://ihrz.github.io');

        let githubbutton = new ButtonBuilder()
            .setLabel(data.links_github)
            .setStyle(ButtonStyle.Link)
            .setURL('https://github.com/ihrz/ihrz')

        let row = new ActionRowBuilder<ButtonBuilder>().addComponents(websitebutton, githubbutton);

        await interaction.reply({ content: data.links_message, components: [row], allowedMentions: { repliedUser: false} });
        return;
    },
};