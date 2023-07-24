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
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import config from '../../files/config';

export const command: Command = {
    name: 'unblacklist',
    description: 'The user you want to unblacklist (Only Owner of ihorizon)!',
    options: [
        {
            name: 'member',
            type: ApplicationCommandOptionType.User,
            description: 'The user you want to unblacklist (Only Owner of ihorizon)',
            required: true
        }
    ],
    category: 'owner',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        if (await db.DataBaseModel({ id: db.Get, key: `GLOBAL.OWNER.${interaction.user.id}.owner` }) !== true) {
            return interaction.reply({ content: data.unblacklist_not_owner });
        }

        const member = interaction.options.getUser('member')
        let fetched = await db.DataBaseModel({ id: db.Get, key: `GLOBAL.BLACKLIST.${member.id}` })

        if (!fetched) { return interaction.reply({ content: data.unblacklist_not_blacklisted.replace(/\${member\.id}/g, member.id) }) }

        try {
            let bannedMember = await client.users.fetch(member.user.id)
            if (!bannedMember) { return interaction.reply({ content: data.unblacklist_user_is_not_exist }) }
            interaction.guild.members.unban(bannedMember)
            await db.DataBaseModel({ id: db.Delete, key: `GLOBAL.BLACKLIST.${member.id}` });

            return interaction.reply({ content: data.unblacklist_command_work.replace(/\${member\.id}/g, member.id) })
        } catch (e) {
            await db.DataBaseModel({ id: db.Delete, key: `GLOBAL.BLACKLIST.${member.id}` });
            return interaction.reply({ content: data.unblacklist_unblacklisted_but_can_unban_him })
        }
    },
};