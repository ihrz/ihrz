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
    EmbedBuilder,
    CommandInteraction,
    ApplicationCommandType,
    ChannelType,
    PermissionsBitField,
    ChatInputCommandInteraction,
    Message,
    InteractionEditReplyOptions,
    MessagePayload,
    MessageReplyOptions,
    ApplicationCommandOptionType,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import { Command } from '../../../../types/command';
import { Option } from '../../../../types/option';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, command: Command, neededPerm: number, args?: string[]) => {


        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        let voiceStates = interaction.guild.voiceStates.cache;
        let membersStates = interaction.guild.members.cache;

        const permissionsArray = [PermissionsBitField.Flags.Administrator]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions && neededPerm === 0) {
            await client.method.interactionSend(interaction, { content: lang.punishpub_not_admin });
            return;
        }

        let textChannelSize = interaction.guild?.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        let voiceChannelSize = interaction.guild?.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;

        if (interaction instanceof ChatInputCommandInteraction) {
            var mode = interaction.options.getString("show-mode");
        } else {

            var mode = client.method.string(args!, 0);
        };

        if (!mode) {
            mode = "short"
        }

        let embed = new EmbedBuilder();
        let files = [];

        files.push(await interaction.client.method.bot.footerAttachmentBuilder(interaction))

        let total_members_size = membersStates?.size!;
        let total_members_states_dnd = membersStates?.filter(mbr => mbr.presence?.status === "dnd").size!;
        let total_members_states_online = membersStates?.filter(mbr => mbr.presence?.status === "online").size!;
        let total_members_states_idle = membersStates?.filter(mbr => mbr.presence?.status === "idle").size;
        let total_members_states_invisible = total_members_size - total_members_states_dnd - total_members_states_online - total_members_states_idle;

        let total_guild_boost_count = interaction.guild?.premiumSubscriptionCount?.toString()!;
        let total_guild_boosters = interaction.guild?.roles.premiumSubscriberRole?.members.map(usr => `<@${usr.id}>`)!;

        let total_members_vc_streaming = voiceStates?.filter(vc => vc.streaming).size.toString()!;
        let total_members_vc_deaf = voiceStates?.filter(vc => vc.selfDeaf).size.toString()!;
        let total_members_vc_mute = voiceStates?.filter(vc => vc.selfMute).size.toString()!;
        let total_members_vc_video = voiceStates?.filter(vc => vc.selfVideo).size.toString()!;

        if (mode === "large") {
            embed
                .setColor(2829617)
                .setDescription(
                    lang.vc_embed_desc
                        .replaceAll('${voiceStates?.size}', voiceStates?.size.toString()!)
                        .replaceAll('${client.iHorizon_Emojis.icon.iHorizon_Streaming}', client.iHorizon_Emojis.icon.iHorizon_Streaming)
                        .replaceAll('${voiceStates?.filter(vc => vc.streaming).size}', total_members_vc_streaming)
                        .replaceAll('${client.iHorizon_Emojis.icon.iHorizon_Deaf}', client.iHorizon_Emojis.icon.iHorizon_Deaf)
                        .replaceAll('${voiceStates?.filter(vc => vc.selfDeaf).size}', total_members_vc_deaf)
                        .replaceAll('${client.iHorizon_Emojis.icon.iHorizon_Mute}', client.iHorizon_Emojis.icon.iHorizon_Mute)
                        .replaceAll('${voiceStates?.filter(vc => vc.selfMute).size}', total_members_vc_mute)
                        .replaceAll('${client.iHorizon_Emojis.icon.iHorizon_Camera}', client.iHorizon_Emojis.icon.iHorizon_Camera)
                        .replaceAll('${voiceStates?.filter(vc => vc.selfVideo).size}', total_members_vc_video)
                        .replaceAll('${membersStates?.size}', total_members_size.toString())
                        .replaceAll('${client.iHorizon_Emojis.icon.iHorizon_DND}', client.iHorizon_Emojis.icon.iHorizon_DND)
                        .replaceAll('${membersStates?.filter(mbr => mbr.presence?.status === "dnd").size}', total_members_states_dnd.toString())
                        .replaceAll('${client.iHorizon_Emojis.icon.iHorizon_Online}', client.iHorizon_Emojis.icon.iHorizon_Online)
                        .replaceAll('${membersStates?.filter(mbr => mbr.presence?.status === "online").size}', total_members_states_online.toString())
                        .replaceAll('${client.iHorizon_Emojis.icon.iHorizon_Idle}', client.iHorizon_Emojis.icon.iHorizon_Idle)
                        .replaceAll('${membersStates?.filter(mbr => mbr.presence?.status === "idle").size}', total_members_states_idle.toString()!)
                        .replaceAll('${client.iHorizon_Emojis.icon.iHorizon_Invisible}', client.iHorizon_Emojis.icon.iHorizon_Invisible)
                        .replaceAll('${membersStates?.filter(mbr => mbr.presence?.status === "invisible").size}', total_members_states_invisible.toString())
                        .replaceAll('${interaction.guild?.premiumSubscriptionCount}', total_guild_boost_count)
                        .replaceAll('${interaction.guild?.roles.premiumSubscriberRole?.members.map(usr => `<@${usr.id}>`)}', total_guild_boosters.toString())
                )
                .addFields(
                    {
                        name: lang.vc_embed_fields_1_name,
                        value: lang.vc_embed_fields_1_value
                            .replace('${interaction.guild?.memberCount}', interaction.guild?.memberCount.toString()!),
                        inline: true
                    },
                    {
                        name: lang.vc_embed_fields_2_name,
                        value: lang.vc_embed_fields_2_value
                            .replace('${textChannelSize}', textChannelSize?.toString()!)
                            .replace('${voiceChannelSize}', voiceChannelSize?.toString()!),
                        inline: true
                    },
                )
                .setFooter(await client.method.bot.footerBuilder(interaction))
                ;
        } else {
            embed
                .setDescription(
                    lang.vc_embed_short_desc
                        .replaceAll("${voiceStates?.size}", voiceStates.size.toString())
                        .replaceAll("${client.iHorizon_Emojis.icon.iHorizon_Streaming}", client.iHorizon_Emojis.icon.iHorizon_Streaming)
                        .replaceAll("${total_members_vc_streaming}", total_members_vc_streaming)
                        .replaceAll("${client.iHorizon_Emojis.icon.iHorizon_Deaf}", client.iHorizon_Emojis.icon.iHorizon_Deaf)
                        .replaceAll("${total_members_vc_deaf}", total_members_vc_deaf)
                        .replaceAll("${client.iHorizon_Emojis.icon.iHorizon_Mute}", client.iHorizon_Emojis.icon.iHorizon_Mute)
                        .replaceAll("${total_members_vc_mute}", total_members_vc_mute)
                        .replaceAll("${client.iHorizon_Emojis.icon.iHorizon_Camera}", client.iHorizon_Emojis.icon.iHorizon_Camera)
                        .replaceAll("${total_members_vc_video}", total_members_vc_video)
                        .replaceAll("${total_members_size}", total_members_size.toString())
                        .replaceAll("${client.iHorizon_Emojis.icon.iHorizon_DND}", client.iHorizon_Emojis.icon.iHorizon_DND)
                        .replaceAll("${total_members_states_dnd}", total_members_states_dnd.toString())
                        .replaceAll("${client.iHorizon_Emojis.icon.iHorizon_Online}", client.iHorizon_Emojis.icon.iHorizon_Online)
                        .replaceAll("${total_members_states_online}", total_members_states_online.toString())
                        .replaceAll("${client.iHorizon_Emojis.icon.iHorizon_Idle}", client.iHorizon_Emojis.icon.iHorizon_Idle)
                        .replaceAll("${total_members_states_idle}", total_members_states_idle.toString())
                )
                .setThumbnail("attachment://guild_icon.png")
                .setFooter(await client.method.bot.footerBuilder(interaction))

            files.push({
                name: "guild_icon.png",
                attachment: await client.func.image64(interaction.guild.iconURL() || client.user.displayAvatarURL())
            })
        }

        await client.method.interactionSend(interaction, {
            embeds: [embed],
            files: files
        });
        return;
    },
};