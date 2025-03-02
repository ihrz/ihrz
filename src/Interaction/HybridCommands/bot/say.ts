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
    ApplicationCommandOptionType,
    ApplicationCommandType,
    ChatInputCommandInteraction,
    Client,
    CommandInteractionOptionResolver,
    Message,
    PermissionFlagsBits,
    PermissionsBitField,
} from 'discord.js'

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';

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

            required: true,

            permission: null
        }
    ],
    type: ApplicationCommandType.ChatInput,
    thinking: false,
    permission: PermissionFlagsBits.Administrator,
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var toSay = interaction.options.getString('content')!;
        } else {

            var toSay = args?.join(" ")!;
        };

        if (interaction instanceof ChatInputCommandInteraction) await interaction.deferReply() && await interaction.deleteReply();
        await client.func.method.channelSend(interaction, {
            content: '> ' + `${toSay}${lang.say_footer_msg.replace('${interaction.user}', interaction.member.user.toString())}`, allowedMentions: { roles: [], users: [], repliedUser: false }
        });
        return;
    },
};