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
    BaseGuildTextChannel,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    InteractionEditReplyOptions,
    Message,
    MessageReplyOptions,
    PermissionsBitField
} from 'pwss';
import { LanguageData } from '../../../../types/languageData';

async function interactionSend(interaction: ChatInputCommandInteraction | Message, options: string | MessageReplyOptions | InteractionEditReplyOptions): Promise<Message> {
    if (interaction instanceof ChatInputCommandInteraction) {
        const editOptions: InteractionEditReplyOptions = typeof options === 'string' ? { content: options } : options;
        return await interaction.editReply(editOptions);
    } else {
        let replyOptions: MessageReplyOptions;

        if (typeof options === 'string') {
            replyOptions = { content: options, allowedMentions: { repliedUser: false } };
        } else {
            replyOptions = {
                ...options,
                allowedMentions: { repliedUser: false },
                content: options.content ?? undefined
            } as MessageReplyOptions;
        }

        return await interaction.reply(replyOptions);
    }
}


export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, data: LanguageData, execTimestamp?: number, args?: string[]) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var action = interaction.options.getString("time") as string;
        } else {
            var action = (client.args.string(args!, 0) || "0s") as string
        };

        let time = client.timeCalculator.to_ms(action);

        const permissionsArray = [PermissionsBitField.Flags.Administrator]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions) {
            await interactionSend(interaction, { content: data.security_disable_not_admin });
            return;
        };

        if (!time) {
            await interactionSend(interaction, {
                content: data.start_time_not_valid
                    .replace('${interaction.user}', interaction.member.user.toString())
            });
            return;
        };

        await client.db.set(`${interaction.guildId}.GUILD.CONFESSION.cooldown`, time);
        await interaction.reply({
            content: data.confession_coolodwn_command_work
                .replace('${interaction.user.toString()}', interaction.member.user.toString())
                .replace('${client.timeCalculator.to_beautiful_string(time)}', client.timeCalculator.to_beautiful_string(time))
        });

        try {
            let logEmbed = new EmbedBuilder()
                .setColor("#bf0bb9")
                .setTitle(data.confession_cooldown_log_embed_title)
                .setDescription(data.confession_cooldown_log_embed_desc
                    .replace('${interaction.user}', interaction.member.user.toString())
                    .replace('${client.timeCalculator.to_beautiful_string(time)}', client.timeCalculator.to_beautiful_string(time))
                )

            let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
            if (logchannel) {
                (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
            }
        } catch { };

        return;
    },
};