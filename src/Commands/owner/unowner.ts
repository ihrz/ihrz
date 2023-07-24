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
    ApplicationCommandOptionType,
    User
} from 'discord.js'

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import config from '../../files/config';

export const command: Command = {
    name: 'unowner',
    description: 'The member who wants to delete of the owner list (Only Owner of ihorizon)!',
    options: [
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,
            description: 'The member who wants to delete of the owner list',
            required: false
        },
        {
            name: 'userid',
            type: ApplicationCommandOptionType.String,
            description: 'The member who wants to delete of the owner list',
            required: false
        }
    ],
    category: 'owner',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        if (await db.DataBaseModel({ id: db.Get, key: `GLOBAL.OWNER.${interaction.user.id}.owner` })
            !== true) {
            return interaction.reply({ content: data.unowner_not_owner });
        }

        var member = interaction.options.getUser('member');
        var userid = interaction.options.getString('userid');

        if (member) {
            if (member.id === config.owner.ownerid1 || member.id === config.owner.ownerid2) {
                return interaction.reply({ content: data.unowner_cant_unowner_creator })
            }
            await db.DataBaseModel({ id: db.Delete, key: `GLOBAL.OWNER.${member.id}` });

            return interaction.reply({ content: data.unowner_command_work.replace(/\${member\.username}/g, member.username) });
        } else if (userid) {
            var userid: any = await client.users.fetch(userid);

            if (userid.id === config.owner.ownerid1 || userid.id === config.owner.ownerid2) {
                return interaction.reply({ content: data.unowner_cant_unowner_creator })
            };

            await db.DataBaseModel({ id: db.Delete, key: `GLOBAL.OWNER.${userid.id}` });

            return interaction.reply({ content: data.unowner_command_work.replace(/\${member\.username}/g, userid.username) });
        } else {
            return interaction.reply({ content: data.unowner_not_owner });
        };
    },
};