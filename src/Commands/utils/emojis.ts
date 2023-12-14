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
    ApplicationCommandOptionType,
    EmbedBuilder,
    PermissionsBitField
} from 'discord.js'

import { Command } from '../../../types/command';

export const command: Command = {
    name: 'emojis',
    description: 'Add emojis to your server easly',
    category: 'utils',
    options: [
        {
            name: 'emojis',
            type: ApplicationCommandOptionType.String,
            description: 'What the emoji then?',
            required: true,
        },
    ],
    thinking: true,
    run: async (client: Client, interaction: any) => {
        let data = await client.functions.getLanguageData(interaction.guild.id);
        let str = interaction.options.getString('emojis').split(' ');
        let cnt: number = 0;
        let nemj: string = '';


        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.punishpub_not_admin });
            return;
        };

        for (let emoji of str) {
            let match = emoji.match(/:(\w+):(\d+)>/);
            if (match) {
                let isAnimated = emoji.startsWith('<a:');

                await interaction.guild.emojis.create({
                    attachment: `https://cdn.discordapp.com/emojis/${match[2]}.${isAnimated ? 'gif' : 'png'}`,
                    name: match[1]
                }).then((emoji: any) => {
                    interaction.channel.send(data.emoji_send_new_emoji
                        .replace('${emoji.name}', emoji.name)
                        .replace('${emoji}', emoji)
                    );

                    cnt++;
                    nemj += `<${isAnimated ? 'a:' : ':'}${emoji.name}:${emoji.id}>`
                }).catch((err: any) => {
                    interaction.channel.send(data.emoji_send_err_emoji
                        .replace('${emoji.name}', emoji.name)
                    );
                });
            }
        }

        let embed = new EmbedBuilder()
            .setColor('#bea9de')
            .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
            .setTimestamp()
            .setDescription(data.emoji_embed_desc_work
                .replace('${cnt}', cnt)
                .replace('${interaction.guild.name}', interaction.guild.name)
                .replace('${nemj}', nemj)
            )

        await interaction.editReply({ embeds: [embed] });
        return;
    },
};