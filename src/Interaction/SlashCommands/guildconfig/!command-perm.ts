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
    ChatInputCommandInteraction,
    Client,
    PermissionsBitField,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, data: LanguageData) => {
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.guildprofil_not_admin });
            return;
        }

        const requestedCommand = interaction.options.getString("command")!;
        const commandParts = requestedCommand.split(" ");
        let fetchedCommand = client.commands.get(commandParts[0]);

        if (!fetchedCommand && commandParts.length > 1) {
            fetchedCommand = client.commands.get(commandParts[1]);
        }

        if (fetchedCommand) {
            const commandType = commandParts.length === 1 ? "Commande" :
                commandParts.length === 2 ? "Sous-commande" :
                    "Sous-commande groupe";

            await client.method.interactionSend(interaction, `${commandType}: ${fetchedCommand.name}`);
        } else {
            await client.method.interactionSend(interaction, "Commande introuvable");
        }

        // console.log(requestedCommand, fetchedCommand);
    }
};