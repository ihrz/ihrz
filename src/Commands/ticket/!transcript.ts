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
import sourcebin from 'sourcebin';

export = {
    run: async (client: Client, interaction: any, data: any) => {

        let blockQ = await db.DataBaseModel({id: db.Get, key: `${interaction.guild.id}.GUILD.TICKET.disable`});

        if (blockQ) {
            return interaction.reply({content: data.transript_disabled_command})
        }
        ;

        let channel = interaction.channel;

        if (channel.name.includes('ticket-')) {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) || channel.name === `ticket-${interaction.user.id}`) {
                channel.messages.fetch().then(async (messages: any[]) => {
                    let output = messages.reverse().map(m => `${new Date(m.createdAt).toLocaleString('en-US')} - ${m.author.username}: ${m.attachments.size > 0 ? m.attachments.first().proxyURL : m.content}`).join('\n');

                    let response;
                    try {
                        response = await sourcebin.create({
                            title: data.close_title_sourcebin,
                            description: data.close_description_sourcebin,
                            files: [
                                {
                                    content: output,
                                    language: 'text',
                                },
                            ],
                        })

                    } catch (e: any) {
                        return interaction.reply({content: data.transript_command_error});
                    }
                    ;

                    let embed = new EmbedBuilder()
                        .setDescription(`[\`View this\`](${response.url})`)
                        .setColor('#0014a8');
                    return interaction.reply({embeds: [embed], content: data.transript_command_work});
                });
            }
        } else {
            return interaction.reply({content: data.transript_not_in_ticket});
        }
        ;
    },
}