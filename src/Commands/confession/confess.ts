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
    ApplicationCommandOptionType,
    GuildChannel
} from 'discord.js'

import { Command } from '../../../types/command';
import * as db from '../../core/functions/DatabaseModel';
import logger from '../../core/logger';
import date from 'date-and-time';

export const command: Command = {
    name: 'confess',
    description: 'Sending an confession anonymously !',
    options: [
        {
            name: "message",
            description: "Your confession you want to send!",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
    ],
    category: 'confession',
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);

        let baseData = await db.DataBaseModel({ id: db.Get, key: `${interaction.guild.id}.CONFESSION` });

        let cooldown = baseData?.[interaction.user.id]?.['cooldown'];
        let disable = baseData?.['disable'];

        if (cooldown <= Date.now()) {
            let formatedDate = date.format(cooldown, 'HH:mm:ss, DD/MM')

            await interaction.editReply({ content: `Your are on cooldown, please wait ${formatedDate}` });
            return;
        };

        if (disable) {
            await interaction.editReply({ content: `The Confession module are disabled, you can't use this command right now.` });
            return;
        };

        let message = interaction.options.getString('message');
        let args = message.split(' ');

        if (args.length <= 3) {
            await interaction.editReply({ content: `Your message are to small, i can't sending this!` });
            return;
        };

        // do some things with data

        let embed = new EmbedBuilder()
            .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
            .setDescription(message)
            .setTimestamp()
            .setColor('#0000d0')
            .setAuthor({
                name: interaction.user.globalName,
                iconURL: interaction.user.avatarURL({ format: 'png', dynamic: true })
            });

        let ConfessionChannel = await client.channels.cache.get(baseData?.['channel']);

        if (!ConfessionChannel) {
            await interaction.editReply({ content: `The confession channel are delete or unreachable!` });
            return;
        };

        await (ConfessionChannel as any).send({
            embeds: [embed],
            content: interaction.user
        });

        await interaction.editReply({ content: "Succefuly sended!" });
        return;
    },
};