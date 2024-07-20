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
    ApplicationCommandType,
    Message,
    MessagePayload,
    InteractionEditReplyOptions,
    MessageReplyOptions
} from 'pwss'

import { Command } from '../../../../types/command';
import logger from '../../../core/logger.js';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'setmentionrole',

    description: 'Give a specific role to the user who pings me!',
    description_localizations: {
        "fr": "Donner un rôle spécifique à l'utilisateur qui me ping"
    },

    aliases: ["setrank", "setranks", "rankset"],

    options: [
        {
            name: 'action',
            type: ApplicationCommandOptionType.String,

            description: 'What you want to do?',
            description_localizations: {
                "fr": "Que veux-tu faire?"
            },

            required: true,
            choices: [
                {
                    name: "Power Off",
                    value: "off"
                },
                {
                    name: 'Power On',
                    value: "on"
                }
            ],
        },
        {
            name: 'roles',
            type: ApplicationCommandOptionType.Role,

            description: 'The specific roles to give !',
            description_localizations: {
                "fr": "Les rôles spécifiques à donner"
            },

            required: false
        },
        {
            name: 'part-of-nickname',
            type: ApplicationCommandOptionType.String,

            description: 'La partie du surnom que vous souhaitez que la personne ait dans son surnom',
            description_localizations: {
                "fr": "The part of the nickname you want the person to have in their nickname"
            },

            required: false
        }
    ],
    category: 'utils',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, lang: LanguageData, runningCommand: any, execTimestamp?: number, args?: string[]) => {        // Guard's Typing
        // Guard's Typing
        if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if (interaction instanceof ChatInputCommandInteraction) {
            var type = interaction.options.getString("action");
            var argsid = interaction.options.getRole("roles");
            var nickname = interaction.options.getString("part-of-nickname");
        } else {
            var _ = await client.args.checkCommandArgs(interaction, command, args!, lang); if (!_) return;
            var type = client.args.string(args!, 0);
            var argsid = client.args.role(interaction, 0);
            var nickname = client.args.longString(args!, 2);
        };

        const permissionsArray = [PermissionsBitField.Flags.Administrator]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions) {
            await client.args.interactionSend(interaction, { content: lang.punishpub_not_admin });
        }

        if (type === "on") {
            if (!argsid) {
                await client.args.interactionSend(interaction, {
                    content: lang.setrankroles_not_roles_typed.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                });
                return;
            };

            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(lang.setrankroles_logs_embed_title_enable)
                    .setDescription(lang.setrankroles_logs_embed_description_enable
                        .replace(/\${interaction\.user.id}/g, interaction.member.user.id)
                        .replace(/\${argsid}/g, argsid.id)
                    );

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) };
            } catch (e: any) { logger.err(e) };

            try {
                let already = await client.db.get(`${interaction.guildId}.GUILD.RANK_ROLES.roles`);

                if (already === argsid.id) {
                    await client.args.interactionSend(interaction, {
                        content: lang.setrankroles_already_this_in_db.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                    });
                    return;
                };

                let msg = '';

                if (nickname) {
                    msg = lang.setrankroles_command_work_with_nicknames
                        .replace('${argsid}', argsid.id)
                        .replace('${nicknames}', nickname);

                    await client.db.set(`${interaction.guildId}.GUILD.RANK_ROLES.nicknames`, nickname);
                } else {
                    msg = lang.setrankroles_command_work.replace('${argsid}', argsid.id)
                }

                await client.db.set(`${interaction.guildId}.GUILD.RANK_ROLES.roles`, argsid.id);

                let e = new EmbedBuilder().setDescription(msg);

                await client.args.interactionSend(interaction, { embeds: [e] });
                return;

            } catch (e: any) {
                logger.err(e);
                await client.args.interactionSend(interaction, {
                    content: lang.setrankroles_command_error.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                });
                return;
            }
        } else if (type == "off") {
            try {
                let logEmbed = new EmbedBuilder()
                    .setColor("#bf0bb9")
                    .setTitle(lang.setrankroles_logs_embed_title_disable)
                    .setDescription(lang.setrankroles_logs_embed_description_disable
                        .replace(/\${interaction\.user.id}/g, interaction.member.user.id)
                    )

                let logchannel = interaction.guild.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                if (logchannel) { (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] }) }
            } catch (e: any) { logger.err(e) };

            try {
                await client.db.delete(`${interaction.guildId}.GUILD.RANK_ROLES`);

                await client.args.interactionSend(interaction, {
                    content: lang.setrankroles_command_work_disable
                        .replace(/\${interaction\.user.id}/g, interaction.member.user.id)
                });
                return;
            } catch (e: any) {
                logger.err(e)
                await client.args.interactionSend(interaction, {
                    content: lang.setrankroles_command_error.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo)
                });
                return;
            }
        }
    },
};