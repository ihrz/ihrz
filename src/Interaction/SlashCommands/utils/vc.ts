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
    EmbedBuilder,
    CommandInteraction,
    ApplicationCommandType,
    ChannelType,
    PermissionsBitField,
} from 'discord.js';

import { Command } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {

    name: 'vc',

    description: 'Get the voice states of the guild!',
    description_localizations: {
        "fr": "Obtenez les états des vocaux du serveur"
    },

    category: 'utils',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {

        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;
        let voiceStates = interaction.guild?.voiceStates.cache;
        let membersStates = interaction.guild?.members.cache;

        if (!interaction.memberPermissions?.has([PermissionsBitField.Flags.ViewAuditLog])) {
            await interaction.reply({ content: data.renew_not_administrator });
            return;
        };

        let textChannelSize = interaction.guild?.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        let voiceChannelSize = interaction.guild?.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;

        let embed = new EmbedBuilder()
            .setColor(2829617)
            .setDescription(
                data.vc_embed_desc
                    .replaceAll('${voiceStates?.size}', voiceStates?.size.toString()!)
                    .replaceAll('${client.iHorizon_Emojis.icon.iHorizon_Streaming}', client.iHorizon_Emojis.icon.iHorizon_Streaming)
                    .replaceAll('${voiceStates?.filter(vc => vc.streaming).size}', voiceStates?.filter(vc => vc.streaming).size.toString()!)
                    .replaceAll('${client.iHorizon_Emojis.icon.iHorizon_Deaf}', client.iHorizon_Emojis.icon.iHorizon_Deaf)
                    .replaceAll('${voiceStates?.filter(vc => vc.selfDeaf).size}', voiceStates?.filter(vc => vc.selfDeaf).size.toString()!)
                    .replaceAll('${client.iHorizon_Emojis.icon.iHorizon_Mute}', client.iHorizon_Emojis.icon.iHorizon_Mute)
                    .replaceAll('${voiceStates?.filter(vc => vc.selfMute).size}', voiceStates?.filter(vc => vc.selfMute).size.toString()!)
                    .replaceAll('${client.iHorizon_Emojis.icon.iHorizon_Camera}', client.iHorizon_Emojis.icon.iHorizon_Camera)
                    .replaceAll('${voiceStates?.filter(vc => vc.selfVideo).size}', voiceStates?.filter(vc => vc.selfVideo).size.toString()!)
                    .replaceAll('${membersStates?.size}', membersStates?.size.toString()!)
                    .replaceAll('${client.iHorizon_Emojis.icon.iHorizon_DND}', client.iHorizon_Emojis.icon.iHorizon_DND)
                    .replaceAll('${membersStates?.filter(mbr => mbr.presence?.status === "dnd").size}', membersStates?.filter(mbr => mbr.presence?.status === "dnd").size.toString()!)
                    .replaceAll('${client.iHorizon_Emojis.icon.iHorizon_Online}', client.iHorizon_Emojis.icon.iHorizon_Online)
                    .replaceAll('${membersStates?.filter(mbr => mbr.presence?.status === "online").size}', membersStates?.filter(mbr => mbr.presence?.status === "online").size.toString()!)
                    .replaceAll('${client.iHorizon_Emojis.icon.iHorizon_Idle}', client.iHorizon_Emojis.icon.iHorizon_Idle)
                    .replaceAll('${membersStates?.filter(mbr => mbr.presence?.status === "idle").size}', membersStates?.filter(mbr => mbr.presence?.status === "idle").size.toString()!)
                    .replaceAll('${client.iHorizon_Emojis.icon.iHorizon_Invisible}', client.iHorizon_Emojis.icon.iHorizon_Invisible)
                    .replaceAll('${membersStates?.filter(mbr => mbr.presence?.status === "invisible").size}', membersStates?.filter(mbr => mbr.presence?.status === "invisible").size.toString()!)
                    .replaceAll('${interaction.guild?.premiumSubscriptionCount}', interaction.guild?.premiumSubscriptionCount?.toString()!)
                    .replaceAll('${interaction.guild?.roles.premiumSubscriberRole?.members.map(usr => <@${usr.id}>)}', interaction.guild?.roles.premiumSubscriberRole?.members.map(usr => `<@${usr.id}>`).toString()!)
                    .replaceAll('${interaction.guild?.premiumSubscriptionCount}', interaction.guild?.premiumSubscriptionCount?.toString()!)
                    .replaceAll('${interaction.guild?.roles.premiumSubscriberRole?.members.map(usr => `<@${usr.id}>`)}', interaction.guild?.roles.premiumSubscriberRole?.members.map(usr => `<@${usr.id}>`).toString()!)
            )
            .addFields(
                {
                    name: data.vc_embed_fields_1_name,
                    value: data.vc_embed_fields_1_value
                        .replace('${interaction.guild?.memberCount}', interaction.guild?.memberCount.toString()!),
                    inline: true
                },
                {
                    name: data.vc_embed_fields_2_name,
                    value: data.vc_embed_fields_2_value
                        .replace('${textChannelSize}', textChannelSize?.toString()!)
                        .replace('${voiceChannelSize}', voiceChannelSize?.toString()!),
                    inline: true
                },
            )
            .setFooter(
                {
                    text: "iHorizon",
                    iconURL: "attachment://icon.png"
                }
            )
            ;

        await interaction.reply({
            embeds: [embed],
            files: [
                {
                    attachment: await interaction.client.functions.image64(interaction.client.user?.displayAvatarURL({ forceStatic: false })),
                    name: 'icon.png'
                },
            ]
        });
        return;
    },
};