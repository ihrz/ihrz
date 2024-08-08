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
    EmbedBuilder,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ActivityType,
    ApplicationCommandType,
    ChatInputCommandInteraction,
    Message
} from 'discord.js'

import { Command } from '../../../../types/command';
import logger from '../../../core/logger.js';

import { axios } from '../../../core/functions/axios.js';
import { LanguageData } from '../../../../types/languageData';

var timeout: number = 1_800_000;

async function isImageUrl(url: string): Promise<boolean> {
    try {
        const response = await axios.head(url);
        const contentType = response.headers.get('content-type');

        return contentType.startsWith("image/");
    } catch (error) {
        return false;
    }
};

export const command: Command = {
    name: 'setbanner',

    description: 'Set the banner of the bot !',
    description_localizations: {
        "fr": "Définir la bannière du bot !"
    },

    options: [
        {
            name: 'banner',
            type: ApplicationCommandOptionType.String,

            description: 'The banner for the bot',
            description_localizations: {
                "fr": "La bannière pour le bot"
            },

            required: true,
        },
    ],
    category: 'owner',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, lang: LanguageData, runningCommand: any, execTimestamp?: number, args?: string[]) => {        // Guard's Typing
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var action_2 = interaction.options.getString("banner");
        } else {
            var _ = await client.method.checkCommandArgs(interaction, command, args!, lang); if (!_) return;
            var action_2 = client.method.string(args!, 0);
        };

        let table = client.db.table('OWNER');

        if (await table.get(`${interaction.member.user.id}.owner`)
            !== true) {

            await interaction.reply({ content: '❌', ephemeral: true });
            return;
        };

        if (await client.method.helper.hardCooldown(client.db, "setbanner", 1_800_000)) {
            let time = client.timeCalculator.to_beautiful_string(1_800_000 - (Date.now() -
                await (client.db.table("TEMP")).get(`COOLDOWN.setbanner`)
            ));

            await interaction.reply({ content: `Veuillez attendre ${time} avant de ré-éxecuter cette commandes!` });
            return;
        }

        isImageUrl(action_2 as string)
            .then(async (isValid) => {
                if (isValid) {
                    await client.user?.setBanner(action_2);

                    return interaction.reply({ content: `La bannière du bot as bien été changer avec succès.` });
                } else {
                    return interaction.reply({ content: `L'URL saisie n'est pas une image. Veuillez changer d'URL.` });
                }
            })
            .catch((error: any) => {
                interaction.reply({ content: error });
                logger.err(`Erreur lors de la vérification de l'URL d'image : ${error}`);
            });

        return;
    },
};