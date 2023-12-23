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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField,
} from 'discord.js';

import { isValid, isEnded, ListEntries } from '../../../core/giveawaysManager';

export = {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: any) => {

        let inputData = interaction.options.getString("giveaway-id");

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages)) {
            await interaction.editReply({ content: data.end_not_admin });
            return;
        };

        if (!await isValid((inputData as unknown as number), {
            guildId: interaction.guild?.id
        })) {
            await interaction.editReply({
                content: data.end_not_find_giveaway
                    .replace(/\${gw}/g, inputData)
            });
            return;
        };

        if (await isEnded((inputData as unknown as number), {
            guildId: interaction.guild?.id as string
        })) {
            await interaction.editReply({ content: data.end_command_error });
            return;
        };

        await ListEntries(interaction, {
            guildId: interaction.guild?.id,
            messageId: inputData as string,
        })

        return;
    },
};