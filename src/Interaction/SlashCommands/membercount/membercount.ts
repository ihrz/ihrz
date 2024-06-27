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
    BaseGuildTextChannel,
    GuildMember,
    ApplicationCommandType
} from 'pwss'

import { Command } from '../../../../types/command';
import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'membercount',

    description: 'Set a member count channels!',
    description_localizations: {
        "fr": "Parametrer un canal vocal pour afficher des statistique"
    },

    options: [
        {
            name: "action",

            description: "<Power on /Power off>",
            description_localizations: {
                "fr": "<Power on /Power off>"
            },

            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                {
                    name: "Power on",
                    value: "on"
                },
                {
                    name: "Power off",
                    value: "off"
                },
            ]
        },
        {
            name: "channel",

            description: `The channel to set the member count`,
            description_localizations: {
                "fr": "Le cannal pour définir le module membercount"
            },

            type: ApplicationCommandOptionType.Channel,
            required: true,
        },
        {
            name: 'name',
            required: false,
            type: ApplicationCommandOptionType.String,

            description: `{BotCount}, {RolesCount}, {MemberCount}, {ChannelCount}, {BoostCount}`,
            description_localizations: {
                "fr": "{BotCount}, {RolesCount}, {MemberCount}, {ChannelCount}, {BoostCount}"
            }
        },
    ],
    thinking: true,
    category: 'membercount',
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let data = await client.func.getLanguageData(interaction.guildId) as LanguageData;

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setmembercount_not_admin });
            return;
        };

        let type = interaction.options.getString("action");
        let messagei = interaction.options.getString("name")?.toLowerCase()!;
        let channel = interaction.options.getChannel("channel");

        let help_embed = new EmbedBuilder()
            .setColor("#0014a8")
            .setTitle(data.setmembercount_helpembed_title)
            .setDescription(data.setmembercount_helpembed_description)
            .addFields({ name: data.setmembercount_helpembed_fields_name, value: data.setmembercount_helpembed_fields_value });

        if (type == "on") {
            let botMembers = interaction.guild.members.cache.filter((member: GuildMember) => member.user.bot);
            let rolesCollection = interaction.guild.roles.cache;
            let channelsCount = interaction.guild.channels.cache.size.toString()!;
            let rolesCount = rolesCollection.size!;
            let boostsCount = interaction.guild.premiumSubscriptionCount?.toString() || '0';

            if (!messagei) {
                await interaction.editReply({ embeds: [help_embed] });
                return;
            };

            let joinmsgreplace = messagei
                .replace("{membercount}", interaction.guild.memberCount.toString()!)
                .replace("{rolescount}", rolesCount.toString())
                .replace("{channelcount}", channelsCount)
                .replace("{boostcount}", boostsCount)
                .replace("{botcount}", botMembers.size.toString()!);

            if (messagei.includes("member")) {
                await client.db.set(`${interaction.guildId}.GUILD.MCOUNT.member`,
                    { name: messagei, enable: true, event: "member", channel: channel?.id }
                );
            } else if (messagei.includes("roles")) {
                await client.db.set(`${interaction.guildId}.GUILD.MCOUNT.roles`,
                    { name: messagei, enable: true, event: "roles", channel: channel?.id }
                );
            } else if (messagei.includes("channel")) {
                await client.db.set(`${interaction.guildId}.GUILD.MCOUNT.channel`,
                    { name: messagei, enable: true, event: "bot", channel: channel?.id }
                );
            } else if (messagei.includes("boost")) {
                await client.db.set(`${interaction.guildId}.GUILD.MCOUNT.boost`,
                    { name: messagei, enable: true, event: "bot", channel: channel?.id }
                );
            } else if (messagei.includes("bot")) {
                await client.db.set(`${interaction.guildId}.GUILD.MCOUNT.bot`,
                    { name: messagei, enable: true, event: "bot", channel: channel?.id }
                );
            };

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setmembercount_logs_embed_title_on_enable)
                    .setDescription(data.setmembercount_logs_embed_description_on_enable
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                        .replace(/\${channel\.id}/g, channel?.id!)
                        .replace(/\${messagei}/g, messagei)
                    );

                let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }); };
            } catch (e: any) { logger.err(e) };
            let fetched = interaction.guild?.channels.cache.get(channel?.id as string);

            (fetched as BaseGuildTextChannel).edit({ name: joinmsgreplace });
            await interaction.editReply({
                content: data.setmembercount_command_work_on_enable.replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo)
            });
            return;

        } else if (type == "off") {
            await client.db.delete(`${interaction.guildId}.GUILD.MCOUNT`);
            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(data.setmembercount_logs_embed_title_on_disable)
                    .setDescription(data.setmembercount_logs_embed_description_on_disable
                        .replace(/\${interaction\.user\.id}/g, interaction.user.id)
                    )
                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };

            await interaction.editReply({
                content: data.setmembercount_command_work_on_disable.replace('${client.iHorizon_Emojis.icon.Yes_Logo}', client.iHorizon_Emojis.icon.Yes_Logo)
            });
            return;
        } else if (!type) {
            await interaction.editReply({ embeds: [help_embed] });
            return;
        } else if (!messagei) {
            await interaction.editReply({ embeds: [help_embed] });
            return;
        };
    },
};