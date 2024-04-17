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
    ApplicationCommandOptionType,
    ApplicationCommandType,
    BaseGuildTextChannel,
    ChannelType,
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
    
    name: 'vc',

    description: 'Get the voice states of the guild!',
    description_localizations: {
        "fr": "Obtenez les états des vocaux du serveur"
    },

    thinking: true,
    category: 'utils',
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (client: Client, interaction: Message, args: string[]) => {

        let data = await client.functions.getLanguageData(interaction.guild?.id) as LanguageData;
        let voiceStates = interaction.guild?.voiceStates.cache;
        let membersStates = interaction.guild?.members.cache;

        if (!interaction.member?.permissions?.has([PermissionsBitField.Flags.ViewAuditLog])) {
            await interaction.reply({ content: data.renew_not_administrator });
            return;
        };

        let embed = new EmbedBuilder()
            .setColor(2829617)
            .setDescription(
                "## Voice States\n" +
                `\`${voiceStates?.size}\` member(s) is in voice channel :\n` +
                `${client.iHorizon_Emojis.icon.iHorizon_Streaming} **=>** ${voiceStates?.filter(vc => vc.streaming).size}\n` +
                `${client.iHorizon_Emojis.icon.iHorizon_Deaf} **=>** ${voiceStates?.filter(vc => vc.selfDeaf).size}\n` +
                `${client.iHorizon_Emojis.icon.iHorizon_Mute} **=>** ${voiceStates?.filter(vc => vc.selfMute).size}\n` +
                `${client.iHorizon_Emojis.icon.iHorizon_Camera} **=>** ${voiceStates?.filter(vc => vc.selfVideo).size}\n` +
                `## Member States\n` +
                `\`${membersStates?.size}\` member(s) are in the guild :\n` +
                `${client.iHorizon_Emojis.icon.iHorizon_DND} **=>** ${membersStates?.filter(mbr => mbr.presence?.status === "dnd").size}\n` +
                `${client.iHorizon_Emojis.icon.iHorizon_Online} **=>** ${membersStates?.filter(mbr => mbr.presence?.status === "online").size}\n` +
                `${client.iHorizon_Emojis.icon.iHorizon_Idle} **=>** ${membersStates?.filter(mbr => mbr.presence?.status === "idle").size}\n` +
                `${client.iHorizon_Emojis.icon.iHorizon_Invisible} **=>** ${membersStates?.filter(mbr => mbr.presence?.status === "invisible").size}\n` +
                "## Boost States\n" +
                `\`${interaction.guild?.premiumSubscriptionCount}\` boost(s) in the guild,\n` +
                `${interaction.guild?.roles.premiumSubscriberRole?.members.map(usr => `<@${usr.id}>`)}`
            )
            .addFields(
                {
                    name: `・Member Count`,
                    value: `\`\`\`py\n${interaction.guild?.memberCount} members \`\`\``,
                    inline: true
                },
                {
                    name: `・Channel Count`,
                    value: `\`\`\`py\n${interaction.guild?.channels.cache.filter(c => c.type === ChannelType.GuildText).size} text channel(s)\n${interaction.guild?.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size} voice channel(s)\`\`\``,
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