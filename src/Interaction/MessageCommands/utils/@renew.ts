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

    name: 'renew',

    description: 'Re-created a channels (cloning permission and all configurations). nuke equivalent',
    description_localizations: {
        "fr": "Recréation d'un canal (autorisation de clonage et toutes les configurations)"
    },

    thinking: true,
    category: 'utils',
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (client: Client, interaction: Message, args: string[]) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id as string) as LanguageData;

        if (!interaction.member?.permissions.has([PermissionsBitField.Flags.Administrator])) {
            await interaction.reply({ content: data.renew_not_administrator });
            return;
        };

        let channel = interaction.channel as BaseGuildTextChannel;

        try {
            await channel?.delete();

            let here = await channel?.clone({
                name: channel.name,
                parent: channel.parent,
                permissionOverwrites: channel.permissionOverwrites.cache!,
                topic: (channel as BaseGuildTextChannel).topic!,
                nsfw: channel.nsfw,
                rateLimitPerUser: channel.rateLimitPerUser!,
                position: channel.rawPosition,
                reason: `Channel re-create by ${interaction.author} (${interaction.author.id})`
            });

            here.send({ content: data.renew_channel_send_success.replace(/\${interaction\.user}/g, interaction.author as unknown as string) });
            return;
        } catch (error) {
            await interaction.reply({ content: data.renew_dont_have_permission });
            return;
        }
    },
};