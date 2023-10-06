/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import {
    Client,
    EmbedBuilder,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ActivityType
} from 'discord.js'

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import config from '../../files/config';

import axios from "axios";
import ms from 'ms';
import logger from '../../core/logger';

var timeout: number = 1_800_000;

async function isImageUrl(url: string): Promise<boolean> {
    try {
        const response = await axios.head(url);
        const contentType = response.headers["content-type"];
        return contentType.startsWith("image/");
    } catch (error) {
        return false;
    }
};

export const command: Command = {
    name: 'setavatar',
    description: 'Set the avatar of the bot !',
    options: [
        {
            name: 'pfp',
            type: ApplicationCommandOptionType.String,
            description: 'The pfp for the bot',
            required: true,
        },
    ],
    category: 'owner',
    run: async (client: Client, interaction: any) => {
        async function cooldDown() {
            let tn = Date.now();
            var fetch = await db.DataBaseModel({ id: db.Get, key: `TEMP_COOLDOWN.${interaction.user.id}.SETAVATAR` });

            if (fetch !== null && timeout - (tn - fetch) > 0) return true;

            return false;
        };

        let action_2 = interaction.options.getString("pfp");

        if (await db.DataBaseModel({ id: db.Get, key: `GLOBAL.OWNER.${interaction.user.id}.owner` })
            !== true) {

            await interaction.deleteReply();
            await interaction.followUp({ content: '❌', ephemeral: true });
            return;
        };

        if (await cooldDown()) {
            let time = ms(timeout - (Date.now() -
                await db.DataBaseModel({ id: db.Get, key: `TEMP_COOLDOWN.${interaction.user.id}.SETAVATAR` })
            ));

            await interaction.editReply({ content: `Veuillez attendre ${time} avant de ré-éxecuter cette commandes!` });
            return;
        }

        // Exemple d'utilisation
        isImageUrl(action_2)
            .then(async (isValid) => {
                if (isValid) {
                    client.user?.setAvatar(action_2);
                    await db.DataBaseModel({
                        id: db.Set,
                        key: `TEMP_COOLDOWN.${interaction.user.id}.SETAVATAR`,
                        value: Date.now()
                    });
                    return interaction.editReply({ content: `La photo de profil du bot as bien été changer avec succès.` });
                } else {
                    return interaction.editReply({ content: `L'URL saisie n'est pas une image. Veuillez changer d'URL.` });
                }
            })
            .catch((error: any) => {
                interaction.editReply({ content: error });
                logger.err(`Erreur lors de la vérification de l'URL d'image : ${error}`);
            });


        return;
    },
};