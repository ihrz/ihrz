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

import { CreatePanel } from '../../core/ticketsManager';

export = {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: any) => {

        let panelName = interaction.options.getString("name");
        let panelDesc = interaction.options.getString("description");

        if (await client.db.get(`${interaction.guild?.id}.GUILD.TICKET.disable`)) {
            await interaction.editReply({ content: data.sethereticket_disabled_command });
            return;
        };

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.sethereticket_not_admin });
            return;
        };

        await CreatePanel(interaction, {
            name: panelName,
            author: interaction.user.id,
            description: panelDesc
        });
        
        await interaction.deleteReply();
        await interaction.followUp({ content: data.sethereticket_command_work, ephemeral: true });
        return;
    },
};