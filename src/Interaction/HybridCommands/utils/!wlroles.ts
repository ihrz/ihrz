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
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    PermissionsBitField,
    RoleSelectMenuBuilder,
    RoleSelectMenuInteraction,
    ComponentType,
    Role,
    PermissionFlagsBits,
    Message,
    BaseGuildTextChannel
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import logger from '../../../core/logger.js';
import { SubCommandArgumentValue } from '../../../core/functions/method';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, data: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        let permCheck = await client.method.permission.checkCommandPermission(interaction, command.command!);
        if (!permCheck.allowed) return client.method.permission.sendErrorMessage(interaction, data, permCheck.neededPerm || 0);

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        if ((!interaction.member.permissions?.has(PermissionsBitField.Flags.Administrator) && permCheck.neededPerm === 0)) {
            await client.method.interactionSend(interaction, { content: data.setjoinroles_not_admin });
            return;
        }

        let all_roles: DatabaseStructure.UtilsData["wlRoles"] = await client.db.get(`${interaction.guildId}.UTILS.wlRoles`) || [];

        let embed = new EmbedBuilder()
            .setTitle(data.utils_wlroles_embed_title)
            .setColor("#475387")
            .setDescription(data.utils_wlroles_embed_desc)
            .addFields({
                name: data.setjoinroles_help_embed_fields_1_name,
                value: Array.isArray(all_roles) && all_roles.length > 0
                    ? all_roles.map(x => `<@&${x}>`).join(', ')
                    : data.setjoinroles_var_none
            });

        let roleSelectMenu = new RoleSelectMenuBuilder()
            .setCustomId('utils-wlRoles-role-selecter')
            .setMaxValues(25)
            .setMinValues(0);

        if (all_roles !== undefined && all_roles?.length > 1) {
            const roles: string[] = Array.isArray(all_roles) ? all_roles : [all_roles];
            roleSelectMenu.setDefaultRoles(roles);
        }

        let saveButton = new ButtonBuilder()
            .setCustomId('utils-wlRoles-save-button')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💾');

        let comp = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleSelectMenu);
        let comp_2 = new ActionRowBuilder<ButtonBuilder>().addComponents(saveButton);

        let og_response = await client.method.interactionSend(interaction, {
            embeds: [embed],
            components: [comp, comp_2]
        });

        const confirmedDangerousRoles = new Set<string>();
        const tooHighterRoles = new Set<string>();

        let selectedRoles: Role[] = [];

        const collector = og_response.createMessageComponentCollector({
            componentType: ComponentType.RoleSelect,
            time: 240_000,
            filter: (i) => i.user.id === interaction.member?.user.id
        });

        const buttonCollector = og_response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 240_000,
            filter: (i) => i.user.id === interaction.member?.user.id
        });

        collector.on('collect', async (roleInteraction: RoleSelectMenuInteraction) => {
            selectedRoles = [];
            all_roles = [];

            let dangerous_roles: { id: string, name: string, permissions: string[] }[] = [];
            let too_highter_roles: { id: string, name: string, position: string }[] = [];

            if (!roleInteraction.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
                await roleInteraction.deferUpdate();
                await client.method.interactionSend(interaction, { content: data.setjoinroles_var_perm_issue, ephemeral: true });
                return;
            }

            for (const role of roleInteraction.roles) {
                all_roles.push(role[1].id);
                const rolePermissions = new PermissionsBitField((role[1] as Role).permissions);
                let roleDangerousPermissions: string[] = [];

                const dangerousPermissions = [
                    { flag: PermissionsBitField.Flags.Administrator, name: data.setjoinroles_var_perm_admin },
                    { flag: PermissionsBitField.Flags.ManageGuild, name: data.setjoinroles_var_perm_manage_guild },
                    { flag: PermissionsBitField.Flags.ManageRoles, name: data.setjoinroles_var_perm_manage_role },
                    { flag: PermissionsBitField.Flags.MentionEveryone, name: data.setjoinroles_var_perm_use_mention },
                    { flag: PermissionsBitField.Flags.BanMembers, name: data.setjoinroles_var_perm_ban_members },
                    { flag: PermissionsBitField.Flags.KickMembers, name: data.setjoinroles_var_perm_kick_members },
                    { flag: PermissionsBitField.Flags.ManageWebhooks, name: data.setjoinroles_var_perm_manage_webhooks },
                    { flag: PermissionsBitField.Flags.ManageChannels, name: data.setjoinroles_var_perm_manage_channels },
                    { flag: PermissionsBitField.Flags.ManageGuildExpressions, name: data.setjoinroles_var_perm_manage_expression },
                    { flag: PermissionsBitField.Flags.ViewCreatorMonetizationAnalytics, name: data.setjoinroles_var_perm_view_monetization_analytics },
                ];

                for (const perm of dangerousPermissions) {
                    if (rolePermissions.has(perm.flag)) {
                        roleDangerousPermissions.push(perm.name);
                    }
                }

                if (roleDangerousPermissions.length > 0 && !confirmedDangerousRoles.has(role[1].id)) {
                    dangerous_roles.push({ id: role[1].id, name: role[1].name, permissions: roleDangerousPermissions });
                }

                selectedRoles.push(role[1] as Role);

                if (interaction.guild?.members.me?.roles.highest.position! <= role[1].position) {
                    if (!tooHighterRoles.has(role[1].id)) {
                        too_highter_roles.push({ id: role[1].id, name: role[1].name, position: role[1].position.toString() });
                    }
                }
            }

            if (dangerous_roles.length > 0) {
                await handleDangerousRolesConfirmation(roleInteraction, dangerous_roles, confirmedDangerousRoles, embed, og_response, data);
            } else if (too_highter_roles.length > 0) {
                await handleTooHighterRoles(roleInteraction, too_highter_roles);
            } else {
                await roleInteraction.deferUpdate();
                updateEmbed(embed, selectedRoles, data);
                await og_response.edit({ embeds: [embed] });
            }
        });

        buttonCollector.on('collect', async (buttonInteraction: ButtonInteraction) => {
            await buttonInteraction.deferUpdate();
            if (buttonInteraction.customId === 'utils-wlRoles-save-button') {
                let newComp_2 = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        saveButton
                            .setStyle(ButtonStyle.Success)
                            .setEmoji(client.iHorizon_Emojis.icon.Yes_Logo)
                            .setDisabled(true)
                    );

                await og_response.edit({ components: [newComp_2] })

                await client.method.iHorizonLogs.send(interaction, {
                    title: data.utils_wlRoles_logsEmbed_title,
                    description: data.utils_wlRoles_logsEmbed_desc
                        .replace("${interaction.member?.user.toString()}", interaction.member?.user.toString()!)
                });

                await client.db.set(`${interaction.guildId}.UTILS.wlRoles`, all_roles);
                collector.stop();
                buttonCollector.stop();
            }
        });

        collector.on('end', async () => {
            comp.components.forEach(x => {
                x.setDisabled(true)
            });

            comp_2.components.forEach(x => {
                x.setDisabled(true);
            })

            await og_response.edit({ components: [comp, comp_2] });
        });

        function updateEmbed(embed: EmbedBuilder, roles: Role[], data: LanguageData) {
            const roleValues = roles.map(role => `<@&${role.id}>`).join(', ') || data.setjoinroles_var_none;
            embed.setFields({
                name: data.setjoinroles_help_embed_fields_1_name,
                value: roleValues
            });
        };

        async function handleDangerousRolesConfirmation(roleInteraction: RoleSelectMenuInteraction,
            dangerous_roles: {
                id: string; name: string; permissions: string[];
            }[],
            confirmedDangerousRoles: Set<string>,
            embed: EmbedBuilder,
            og_response: Message,
            data: LanguageData) {
            let dangerous_fields = dangerous_roles.map(role => ({
                name: `@${role.name} (${role.id})`,
                value: role.permissions.map(p => `\`${p}\``).join(', ')
            }));

            let dangerous_embed = new EmbedBuilder()
                .setTitle(data.setjoinroles_warn_title)
                .setDescription(data.setjoinroles_warn_dangerous_perm)
                .addFields(dangerous_fields);

            let confirm_buttons = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('dangerous_roles_confirm_yes')
                        .setStyle(ButtonStyle.Danger)
                        .setLabel(data.mybot_submit_utils_msg_yes),
                    new ButtonBuilder()
                        .setCustomId('dangerous_roles_confirm_no')
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel(data.mybot_submit_utils_msg_no)
                );

            let warn_msg = await roleInteraction.reply({ embeds: [dangerous_embed], components: [confirm_buttons], ephemeral: true });

            try {
                let buttonInteraction = await (interaction.channel as BaseGuildTextChannel)?.awaitMessageComponent({
                    componentType: ComponentType.Button,
                    time: 20_000,
                    filter: (i) => i.user.id === interaction.member?.user.id!
                });

                await buttonInteraction?.deferUpdate();

                if (buttonInteraction?.customId === 'dangerous_roles_confirm_yes') {
                    dangerous_roles.forEach(role => confirmedDangerousRoles.add(role.id));
                    confirm_buttons.components.forEach(x => x.setDisabled(true));
                    await warn_msg.edit({ components: [confirm_buttons] });

                    updateEmbed(embed, selectedRoles, data);
                    await og_response.edit({ embeds: [embed] });
                } else if (buttonInteraction?.customId === 'dangerous_roles_confirm_no') {
                    await warn_msg.edit({
                        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setDisabled(true)
                                .setStyle(ButtonStyle.Secondary)
                                .setCustomId('utils-wlRoles-choice-timeOut')
                                .setLabel(data.setjoinroles_action_canceled)
                        )]
                    });
                }
            } catch (err) {
                await warn_msg.edit({
                    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setDisabled(true)
                            .setStyle(ButtonStyle.Secondary)
                            .setCustomId('utils-wlRoles-choice-timeOut')
                            .setLabel(data.setjoinroles_timesup_button)
                    )]
                });
            }
        }

        async function handleTooHighterRoles(
            roleInteraction: RoleSelectMenuInteraction,
            too_highter_roles:
                {
                    id: string;
                    name: string;
                    position: string;
                }[]) {
            let too_highter_fields = too_highter_roles.map(role => ({
                name: `@${role.name} (${role.id})`,
                value: `<@&${role.id}>: \`${role.position}\` vs ${interaction.client.user.toString()}: \`${interaction.guild?.members.me?.roles.highest.position}\``
            }));

            let too_highter_embed = new EmbedBuilder()
                .setTitle(data.setjoinroles_warn_title)
                .setDescription(data.setjoinroles_too_highter_roles)
                .addFields(too_highter_fields);

            await roleInteraction.reply({
                embeds: [too_highter_embed],
                ephemeral: true
            });
        }
    },
};