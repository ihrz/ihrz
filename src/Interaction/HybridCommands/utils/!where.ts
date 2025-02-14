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
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    Message,
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        if (interaction instanceof ChatInputCommandInteraction) {
            var member = interaction.options.getMember("member")
        } else {
            var member = client.method.member(interaction, args!, 0);
        }

        if (!member) {
            await client.method.interactionSend(interaction, {
                content: lang.ban_dont_found_member
            })
            return;
        }

        let member_is_connected = member?.voice.channel ? true : false;

        if (!member_is_connected) {
            await client.method.interactionSend(interaction, {
                content: lang.util_not_in_vc
            })
            return;
        }


        let embed = new EmbedBuilder()
            .setTitle(`${lang.var_whereis}: ${member.displayName}`)
            .setColor("#4fdb12")
            .setDescription(
                `> ${client.iHorizon_Emojis.vc.Limit} **${lang.var_member}:** ${member.toString()}
> ${client.iHorizon_Emojis.vc.Name} **${lang.var_voice_channel}:** ${member.voice.channel?.toString()}
> ${client.iHorizon_Emojis.icon.iHorizon_Streaming} **${lang.perm_stream_name}:** ${member.voice.streaming ? lang.var_yes : lang.var_no}
> ${client.iHorizon_Emojis.icon.iHorizon_Camera} **${lang.var_video}:** ${member.voice.selfVideo ? lang.var_yes : lang.var_no}
> ${client.iHorizon_Emojis.icon.iHorizon_Mute} **${lang.util_where_mute}:** ${member.voice.selfMute ? lang.var_yes : lang.var_no}
> ${client.iHorizon_Emojis.icon.iHorizon_Deaf} **${lang.util_where_deaf}:** ${member.voice.selfDeaf ? lang.var_yes : lang.var_no}`
            )
            .setThumbnail(member.user.displayAvatarURL({ extension: "gif", forceStatic: false, size: 4096 }))


        await client.method.interactionSend(interaction, {
            embeds: [embed]
        });
        return;

    },
};