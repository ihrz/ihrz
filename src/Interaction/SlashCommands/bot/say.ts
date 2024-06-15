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
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ChatInputCommandInteraction,
    Client,
    PermissionsBitField,
} from 'discord.js'

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'say',

    description: 'Sent a message throught the bot!',
    description_localizations: {
        "fr": "Envoyer un message via le bot!"
    },

    category: 'bot',
    options: [
        {
            name: 'content',
            name_localizations: {
                "fr": "contenu"
            },

            type: ApplicationCommandOptionType.String,

            description: 'What you want the bot to say!',
            description_localizations: {
                "fr": "Le message que le bot vas dire"
            },

            required: true
        }
    ],
    type: ApplicationCommandType.ChatInput,
    thinking: false,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.setserverlang_not_admin });
            return;
        };
        await interaction.deferReply() && await interaction.deleteReply();
        await interaction.channel?.send({
            content: '> ' + `${interaction.options.getString('content')}${data.say_footer_msg.replace('${interaction.user}', interaction.user.toString())}`
        });
        return;
    },
};