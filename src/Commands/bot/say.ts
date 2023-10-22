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
    ApplicationCommandOptionType,
    Client,
    PermissionsBitField,
} from 'discord.js'

import { Command } from '../../../types/command';

export const command: Command = {
    name: 'say',
    description: 'Sent a message throught the bot!',
    category: 'bot',
    options: [
        {
            name: 'msg',
            type: ApplicationCommandOptionType.String,
            description: 'The message to sent throught the bot!',
            required: true
        }
    ],
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let msg = interaction.options.getString('msg');

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setserverlang_not_admin });
            return;
        };

        let msg_to_send: string = `> ${msg}${data.say_footer_msg.replace('${interaction.user}', interaction.user)}`
        
        await interaction.deleteReply();
        await interaction.channel.send({
            content: msg_to_send
        });
        return;
    },
};