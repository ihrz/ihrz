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
} from 'discord.js';

import * as db from '../../core/functions/DatabaseModel';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        let panelName = interaction.options.getString("name");

        if (await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.TICKET.disable` })) {
            await interaction.editReply({ content: data.sethereticket_disabled_command });
            return;
        };

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.sethereticket_not_admin });
            return;
        };

        let panel = new EmbedBuilder()
            .setTitle(`${panelName}`)
            .setColor("#3b8f41")
            .setDescription(data.sethereticket_description_embed)
            .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })

        interaction.channel.send({ embeds: [panel] }).then(async (message: { react: (arg0: string) => void; guild: { id: any; }; id: any; channel: { id: any; }; }) => {
            message.react("📩");

            await db.DataBaseModel({
                id: db.Set, key: `${message.guild.id}.GUILD.TICKET.${message.id}`,
                value: {
                    author: interaction.user.id,
                    used: true,
                    panelName: panelName,
                    channel: message.channel.id,
                    messageID: message.id,
                }
            });
        });
        await interaction.deleteReply();
        await interaction.followUp({ content: data.sethereticket_command_work, ephemeral: true });
        return;
    },
};