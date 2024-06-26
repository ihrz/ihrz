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
    ChatInputCommandInteraction
} from 'pwss'

import { Command } from '../../../../types/command';
import logger from '../../../core/logger.js';

import { axios } from '../../../core/functions/axios.js';

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
    name: 'setavatar',

    description: 'Set the avatar of the bot !',
    description_localizations: {
        "fr": "Définir l'avatar du bot !"
    },

    options: [
        {
            name: 'pfp',
            type: ApplicationCommandOptionType.String,

            description: 'The pfp for the bot',
            description_localizations: {
                "fr": "La pp du bot"
            },

            required: true,
        },
    ],
    category: 'owner',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        async function cooldDown() {
            let tn = Date.now();
            var fetch = await client.db.get(`TEMP_COOLDOWN.${interaction.user.id}.SETAVATAR`);

            if (fetch !== null && timeout - (tn - fetch) > 0) return true;

            return false;
        };

        let action_2 = interaction.options.getString("pfp");
        let table = client.db.table('OWNER');

        if (await table.get(`${interaction.user.id}.owner`)
            !== true) {

            await interaction.reply({ content: '❌', ephemeral: true });
            return;
        };

        if (await cooldDown()) {
            let time = client.timeCalculator.to_beautiful_string(timeout - (Date.now() -
                await client.db.get(`TEMP_COOLDOWN.${interaction.user.id}.SETAVATAR`)
            ));

            await interaction.reply({ content: `Veuillez attendre ${time} avant de ré-éxecuter cette commandes!` });
            return;
        }

        // Exemple d'utilisation
        isImageUrl(action_2 as string)
            .then(async (isValid) => {
                if (isValid) {
                    client.user?.setAvatar(action_2);
                    await client.db.set(`TEMP_COOLDOWN.${interaction.user.id}.SETAVATAR`, Date.now());

                    return interaction.reply({ content: `La photo de profil du bot as bien été changer avec succès.` });
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