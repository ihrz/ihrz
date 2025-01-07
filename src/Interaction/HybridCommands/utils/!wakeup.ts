/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
    Client,
    PermissionsBitField,
    ChatInputCommandInteraction,
    Message,
    GuildMember,
    VoiceBasedChannel,
    ChannelType
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData';

import wait from '../../../core/functions/wait.js';
import { Command } from '../../../../types/command.js';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, command: Command, allowed: boolean, args?: string[]) => {

        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        const user = interaction instanceof ChatInputCommandInteraction
            ? interaction.options.getMember("member")!
            : client.method.member(interaction, args!, 0)!;

        const permissionsArray = [PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.MoveMembers];
        const permissions = interaction instanceof ChatInputCommandInteraction
            ? interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions && !allowed) {
            await client.method.interactionSend(interaction, { content: lang.punishpub_not_admin });
            return;
        }

        if (user.id === interaction.member.user.id) {
            await client.method.interactionSend(interaction, { content: lang.util_wakeup_yourself });
            return;
        }

        if (user.voice.channelId === null) {
            await client.method.interactionSend(interaction, {
                content: lang.util_wakeup_not_in_vc
                    .replace("${user.displayName}", user.displayName)
            });
            return;
        }

        await client.method.interactionSend(interaction, {
            content: lang.util_wakeup_command_work.replace("${user.toString()}", user.toString())
        });

        const moveUser = async () => {
            if (!user.voice.channelId) return;

            const channel = interaction.guild?.channels.cache.filter(
                (c) => c.type === ChannelType.GuildVoice
                    && c.permissionsFor(user as GuildMember)?.has(PermissionsBitField.Flags.Connect)
                    && c.id !== (interaction.member as GuildMember).voice.channelId
            ).random() as VoiceBasedChannel;

            if (!channel) return;

            await user.voice.setChannel(channel);
            await wait(300);

            return moveUser();
        };

        await moveUser();
    },
};