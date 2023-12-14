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
    ChatInputCommandInteraction,
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
            name: 'content',
            type: ApplicationCommandOptionType.String,
            description: 'What you want the bot to say!',
            required: true
        }
    ],
    thinking: false,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guildId);
        if (!(interaction as any).member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.setserverlang_not_admin });
            return;
        };
        await interaction.deferReply() && interaction.deleteReply();
        await (interaction as any).channel.send({
            content: `> ${interaction.options.getString('content')}${data.say_footer_msg.replace('${interaction.user}', interaction.user)}`
        });
        return;
    },
};