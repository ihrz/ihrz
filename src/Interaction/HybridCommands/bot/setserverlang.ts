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
    PermissionsBitField,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    BaseGuildTextChannel,
    ApplicationCommandType,
    Message,
    PermissionFlagsBits
} from 'discord.js'

import { Command } from '../../../../types/command.js';
import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData.js';

export const command: Command = {
    name: 'setlang',
    name_localizations: {
        "fr": "setlangue"
    },

    aliases: ["setsrvlang", "lang"],

    description: 'Set the server language!',
    description_localizations: {
        "fr": "Choisir la langue du bot discord !"
    },

    options: [
        {
            name: 'language',
            name_localizations: {
                "fr": "langue"
            },

            type: ApplicationCommandOptionType.String,

            description: 'What language you want ?',
            description_localizations: {
                "fr": "Quelle language voulez-vous mettre ?"
            },

            required: true,
            choices: [
                {
                    name: "Deutsch",
                    value: "de-DE"
                },
                {
                    name: "English",
                    value: "en-US"
                },
                {
                    name: "Arab Egyptian",
                    value: "ar-EG"
                },
                {
                    name: "French",
                    value: "fr-FR"
                },
                {
                    name: "Italian",
                    value: "it-IT"
                },
                {
                    name: "Japanese",
                    value: "jp-JP"
                },
                {
                    name: "Portuguese",
                    value: "pt-PT"
                },
                {
                    name: "Rude French",
                    value: "fr-ME"
                },
                {
                    name: "Russian",
                    value: "ru-RU"
                },
                {
                    name: "Spanish",
                    value: "es-ES"
                },
            ],

            permission: null
        }
    ],
    thinking: false,
    category: 'bot',
    type: ApplicationCommandType.ChatInput,
    permission: PermissionFlagsBits.Administrator,
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var type = interaction.options.getString("language");
        } else {

            var type = args?.[0] as string | null;
        };

        let already = await client.db.get(`${interaction.guildId}.GUILD.LANG`);

        if (already?.lang === type) {
            await client.func.method.interactionSend(interaction, { content: lang.setserverlang_already });
            return;
        }

        await client.db.set(`${interaction.guildId}.GUILD.LANG`, { lang: type });
        lang = await client.func.getLanguageData(interaction.guildId);

        await client.func.ihorizon_logs(interaction, {
            title: lang.setserverlang_logs_embed_title_on_enable,
            description: lang.setserverlang_logs_embed_description_on_enable
                .replace(/\${type}/g, type!)
                .replace(/\${interaction\.user.id}/g, interaction.member.user.id)
        });

        await client.func.method.interactionSend(interaction, { content: lang.setserverlang_command_work_enable.replace(/\${type}/g, type!) });
        return;
    },
};
