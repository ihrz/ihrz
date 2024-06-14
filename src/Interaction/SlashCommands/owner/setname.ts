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
    ApplicationCommandOptionType,
    ApplicationCommandType
} from 'pwss'

var timeout: number = 1_800_000;

import { Command } from '../../../../types/command';

export const command: Command = {
    name: 'setname',

    description: 'Set the name of the bot !',
    description_localizations: {
        "fr": "Définir le noms du bot"
    },

    options: [
        {
            name: 'name',
            type: ApplicationCommandOptionType.String,

            description: 'The name for the bot',
            description_localizations: {
                "fr": "Le noms du bot"
            },

            required: true,
        },
    ],
    thinking: true,
    category: 'owner',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: any) => {
        async function cooldDown() {
            let tn = Date.now();
            var fetch = await client.db.get(`TEMP_COOLDOWN.${interaction.user.id}.SETNAME`);

            if (fetch !== null && timeout - (tn - fetch) > 0) return true;

            return false;
        };

        let action_2 = interaction.options.getString("name");
        let table = client.db.table('OWNER');

        if (await table.get(`${interaction.user.id}.owner`)
            !== true) {

            await interaction.deleteReply();
            await interaction.followUp({ content: '❌', ephemeral: true });
            return;
        };

        if (await cooldDown()) {
            let time = client.timeCalculator.to_beautiful_string(timeout - (Date.now() -
                await client.db.get(`TEMP_COOLDOWN.${interaction.user.id}.SETNAME`)
            ));

            await interaction.editReply({ content: `Veuillez attendre ${time} avant de ré-éxecuter cette commandes!` });
            return;
        }

        await client.user?.setUsername(action_2);
        await client.db.set(`TEMP_COOLDOWN.${interaction.user.id}.SETNAME`, Date.now());

        await interaction.editReply({ content: `✅` });
        return;
    },
};