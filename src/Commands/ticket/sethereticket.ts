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
    Collection,
    ChannelType,
    EmbedBuilder,
    Permissions,
    ApplicationCommandType,
    PermissionsBitField,
    ApplicationCommandOptionType
} from 'discord.js'

import { Command } from '../../../types/command';
import logger from '../../core/logger';
import ms from 'ms';
import config from '../../files/config';

import * as db from '../../core/functions/DatabaseModel';

export const command: Command = {
    name: "sethereticket",
    description: "Make a embed for allowing to user to create a ticket!",
    options: [
        {
            name: "name",
            description: "The name of you ticket's panel.",
            type: ApplicationCommandOptionType.String,
            required: true,
        }
    ],
    category: 'ticket',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        let panelName = interaction.options.getString("name");

        if (await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.GUILD.TICKET.disable` })) {
            return interaction.reply({ content: data.sethereticket_disabled_command });
        };

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: data.sethereticket_not_admin });
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

        return interaction.reply({ content: data.sethereticket_command_work, ephemeral: true });
    },
};