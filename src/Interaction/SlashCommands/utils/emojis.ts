/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import {
    Client,
    ApplicationCommandOptionType,
    EmbedBuilder,
    PermissionsBitField,
    ChatInputCommandInteraction,
    ApplicationCommandType
} from 'discord.js'

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {

    name: 'emojis',

    description: 'Add emojis to your server easly',
    description_localizations: {
        "fr": "Ajoutez facilement des emojis à votre serveur"
    },

    category: 'utils',
    options: [
        {
            name: 'emojis',
            type: ApplicationCommandOptionType.String,

            description: 'What the emoji then?',
            description_localizations: {
                "fr": "C'est quoi cette emoji alors ?"
            },

            required: true,
        },
    ],
    thinking: true,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;
        let str = (interaction.options.getString('emojis') as string).split(' ');
        let cnt: number = 0;
        let nemj: string = '';


        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.punishpub_not_admin });
            return;
        };

        for (let emoji of str) {
            let match = emoji.match(/:(\w+):(\d+)>/);
            if (match) {
                let isAnimated = emoji.startsWith('<a:');

                await interaction.guild?.emojis.create({
                    attachment: `https://cdn.discordapp.com/emojis/${match[2]}.${isAnimated ? 'gif' : 'png'}`,
                    name: match[1]
                }).then((emoji) => {
                    interaction.channel?.send(data.emoji_send_new_emoji
                        .replace('${emoji.name}', emoji.name!)
                        .replace('${emoji}', emoji.toString())
                    );

                    cnt++;
                    nemj += `<${isAnimated ? 'a:' : ':'}${emoji.name}:${emoji.id}>`
                }).catch(() => {
                    interaction.channel?.send(data.emoji_send_err_emoji
                        .replace('${emoji.name}', emoji)
                    );
                });
            }
        }

        let embed = new EmbedBuilder()
            .setColor('#bea9de')
            .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
            .setTimestamp()
            .setDescription(data.emoji_embed_desc_work
                .replace('${cnt}', cnt.toString())
                .replace('${interaction.guild.name}', interaction.guild?.name!)
                .replace('${nemj}', nemj)
            )

        await interaction.editReply({
            embeds: [embed],
            files: [{ attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL()), name: 'icon.png' }]
        });
        return;
    },
};