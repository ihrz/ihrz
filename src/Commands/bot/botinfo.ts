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

export const command: Command = {
    name: 'botinfo',
    description: 'Get information about the bot!',
    category: 'bot',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let usersize = client.users.cache.size
        let chansize = client.channels.cache.size
        let servsize = client.guilds.cache.size
        let pp: any = client.user?.displayAvatarURL();

        let clientembed = new EmbedBuilder()
            .setColor("#f0d020")
            .setThumbnail(pp)
            .addFields(
                { name: data.botinfo_embed_fields_myname, value: `:green_circle: ${client.user?.username}`, inline: false },
                { name: data.botinfo_embed_fields_mychannels, value: `:green_circle: ${chansize}`, inline: false },
                { name: data.botinfo_embed_fields_myservers, value: `:green_circle: ${servsize}`, inline: false },
                { name: data.botinfo_embed_fields_members, value: `:green_circle: ${usersize}`, inline: false },
                { name: data.botinfo_embed_fields_libraires, value: `:green_circle: discord.js@^14.11.0`, inline: false },
                { name: data.botinfo_embed_fields_created_at, value: ":green_circle: 14/09/2020", inline: false },
                { name: data.botinfo_embed_fields_created_by, value: ":green_circle: <@171356978310938624>", inline: false },
            )
            .setTimestamp()
            .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
            .setTimestamp()

        return interaction.editReply({ embeds: [clientembed] });
    },
};