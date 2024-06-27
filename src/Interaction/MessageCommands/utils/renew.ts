/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import {
    ApplicationCommandType,
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    GuildChannel,
    PermissionsBitField,
    Message
} from 'pwss'

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'renew',

    description: 'Re-created a channels (cloning permission and all configurations). nuke equivalent',
    description_localizations: {
        "fr": "Recréation d'un canal (autorisation de clonage et toutes les configurations)"
    },

    category: 'utils',
    thinking: false,
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (client: Client, interaction: Message, execTimestamp: number, args: string[]) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.author || !interaction.guild || !interaction.channel) return;

        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;

        if (!interaction.member.permissions?.has([PermissionsBitField.Flags.Administrator])) {
            await interaction.reply({ content: data.renew_not_administrator, allowedMentions: { repliedUser: false } });
            return;
        };

        let channel = interaction.channel as BaseGuildTextChannel;

        try {
            await channel.delete();

            let here = await channel.clone({
                name: channel.name,
                parent: channel.parent,
                permissionOverwrites: channel.permissionOverwrites.cache!,
                topic: (channel as BaseGuildTextChannel).topic!,
                nsfw: channel.nsfw,
                rateLimitPerUser: channel.rateLimitPerUser!,
                position: channel.rawPosition,
                reason: `Channel re-create by ${interaction.member} (${interaction.member.id})`
            });

            here.send({ content: data.renew_channel_send_success.replace(/\${interaction\.user}/g, interaction.member.toString()) });
            return;
        } catch (error) {
            await interaction.reply({ content: data.renew_dont_have_permission, allowedMentions: { repliedUser: false } });
            return;
        }
    },
};