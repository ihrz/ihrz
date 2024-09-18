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
import { Command } from '../../../../types/command';
import { Option } from '../../../../types/option';
import { SubCommandArgumentValue } from '../../../core/functions/method';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, data: LanguageData, command: SubCommandArgumentValue) => {        
        let permCheck = await client.method.permission.checkCommandPermission(interaction, command.command!);
        if (!permCheck.allowed) return client.method.permission.sendErrorMessage(interaction, data, permCheck.neededPerm || 0);

        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.guildprofil_not_admin });
            return;
        }

        const requestedCommand = interaction.options.getString("command")!;
        const perms = interaction.options.getString("permission")
        const commandParts = requestedCommand.split(" ");
        let fetchedCommand: Command | Option | undefined = client.commands.get(commandParts[0]);

        if (fetchedCommand && commandParts.length > 1) {
            fetchedCommand = fetchedCommand.options?.find(x => x.name === commandParts[1]);
        }

        await client.db.set(`${interaction.guildId}.UTILS.PERMS.${fetchedCommand?.name}`, parseInt(perms!) || 0);

        if (fetchedCommand) {
            const commandType = commandParts.length === 1 ? "Command" :
                commandParts.length === 2 ? "Subcommand" :
                    "Subcommand group";

            await client.method.interactionSend(interaction, `${commandType}: ${fetchedCommand.name}`);
        } else {
            await client.method.interactionSend(interaction, "Commande introuvable");
        }
    }
};