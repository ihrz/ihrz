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
    ApplicationCommandType,
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    GuildVoiceChannelResolvable,
    Message,
    PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import { Command } from '../../../../types/command';

export const command: Command = {

    name: 'emojis',

    description: 'Add emojis to your server easly',
    description_localizations: {
        "fr": "Ajoutez facilement des emojis à votre serveur"
    },

    thinking: true,
    category: 'utils',
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (client: Client, interaction: Message, args: string[]) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id as string) as LanguageData;

        let str = args.join(" ").toString().split(' ');
        let cnt: number = 0;
        let nemj: string = '';
        
        if (!interaction.member?.permissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: data.punishpub_not_admin });
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
                        .replace('${emoji.name}', emoji.name as string)
                        .replace('${emoji}', emoji as unknown as string)
                    );

                    cnt++;
                    nemj += `<${isAnimated ? 'a:' : ':'}${emoji.name}:${emoji.id}>`
                }).catch((err: any) => {
                    interaction.channel?.send(data.emoji_send_err_emoji
                        .replace('${emoji.name}', emoji)
                    );
                });
            }
        }

        let embed = new EmbedBuilder()
            .setColor('#bea9de')
            .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() })
            .setTimestamp()
            .setDescription(data.emoji_embed_desc_work
                .replace('${cnt}', cnt as unknown as string)
                .replace('${interaction.guild.name}', interaction.guild?.name as string)
                .replace('${nemj}', nemj)
            )

        await interaction.reply({ embeds: [embed] });
        return;
    },
};