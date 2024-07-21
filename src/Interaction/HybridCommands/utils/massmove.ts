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
    Client,
    EmbedBuilder,
    PermissionsBitField,
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    ChannelType,
    ApplicationCommandType,
    BaseGuildVoiceChannel,
    VoiceChannel,
    Message,
    MessagePayload,
    InteractionEditReplyOptions,
    MessageReplyOptions
} from 'pwss';

import { LanguageData } from '../../../../types/languageData';
import { Command } from '../../../../types/command';

export const command: Command = {
    name: 'massmove',

    description: 'Move all members connected in a voice channel to another one',
    description_localizations: {
        "fr": "Déplacer tous les membres connectés dans un canal vocal vers un autre"
    },

    options: [
        {
            name: 'to',
            type: ApplicationCommandOptionType.Channel,

            channel_types: [ChannelType.GuildVoice],

            description: 'The voice channel to move members to',
            description_localizations: {
                "fr": "Le canal vocal où déplacer les membres"
            },

            required: true,
        },
        {
            name: 'from',
            type: ApplicationCommandOptionType.Channel,

            channel_types: [ChannelType.GuildVoice],

            description: 'The voice channel to move members from',
            description_localizations: {
                "fr": "Le canal vocal d'où déplacer les membres"
            },

            required: false,
        },
    ],
    thinking: true,
    category: 'utils',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, lang: LanguageData, runningCommand: any, execTimestamp?: number, args?: string[]) => {        // Guard's Typing
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        const allChannel = Array.from(interaction.guild.channels.cache.values()!)
            .filter(x => x.type === (ChannelType.GuildVoice || ChannelType.GuildStageVoice)) || [];

        if (interaction instanceof ChatInputCommandInteraction) {
            var fromChannel = interaction.options.getChannel('from') as BaseGuildVoiceChannel | null;
            var toChannel = interaction.options.getChannel('to')! as BaseGuildVoiceChannel | null;
        } else {
            var _ = await client.args.checkCommandArgs(interaction, command, args!, lang); if (!_) return;
            var fromChannel = client.args.voiceChannel(interaction, args!, 0);
            var toChannel = client.args.voiceChannel(interaction, args!, 1);
        };

        if (toChannel === null) return;

        const permissionsArray = [PermissionsBitField.Flags.Administrator]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions) {
            await client.args.interactionSend(interaction, { content: lang.punishpub_not_admin });
            return;
        };

        let movedCount = 0;
        let errorCount = 0;

        if (fromChannel) {
            for (const member of (fromChannel as BaseGuildVoiceChannel).members.values()) {
                try {
                    await member.voice.setChannel((toChannel as VoiceChannel));
                    movedCount++;
                } catch (error) {
                    errorCount++;
                }
            }
        } else if (allChannel) {
            for (const channel of allChannel) {
                for (const member of (channel as BaseGuildVoiceChannel).members.values()) {
                    try {
                        await member.voice.setChannel((toChannel as VoiceChannel));
                        movedCount++;
                    } catch (error) {
                        errorCount++;
                    }
                }
            }
        }

        let embed = new EmbedBuilder()
            .setFooter(await client.args.bot.footerBuilder(interaction))
            .setColor('#007fff')
            .setTimestamp()
            .setThumbnail(interaction.guild.iconURL())
            .setDescription(lang.massmove_results
                .replace('${interaction.user}', interaction.member.user.toString())
                .replace('${movedCount}', movedCount.toString())
                .replace('${errorCount}', errorCount.toString())
                .replace('${fromChannel}', fromChannel?.toString() || allChannel.map(x => x.toString()).join(","))
                .replace('${toChannel}', toChannel.toString())
            );

        await client.args.interactionSend(interaction, {
            embeds: [embed],
            files: [await client.args.bot.footerAttachmentBuilder(interaction)]
        });
    },
};