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
    ChannelType,
    ChatInputCommandInteraction,
    Client,
    Message,
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { Option } from '../../../../types/option.js';

export const command: Command = {
    name: "util",

    description: "SubCommand category for utils command",
    description_localizations: {
        "fr": "Commande sous groupé pour la catégorie utilitaire"
    },

    options: [
        {
            name: "nick-kicker",

            description: "Kick a user if their nickname contains a specific word",
            description_localizations: {
                "fr": "Expulse un utilisateur si son surnom contient un mot spécifique"
            },

            aliases: ["nickkick", "nk"],

            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'zip-stickers',

            description: 'Create zip files with all guild stickers in!',
            description_localizations: {
                "fr": "Créer un fichier zip contenant absolument tout les stickers du serveur"
            },

            aliases: ["zipstickers", "zip2"],

            type: ApplicationCommandOptionType.Subcommand
        },
    ],

    category: 'utils',
    thinking: false,
    type: ApplicationCommandType.ChatInput,

};