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

import { LanguageData } from '../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

        let all_roles: DatabaseStructure.GuildTagsStructure["whitelist_use"] = await client.db.get(`${interaction.guildId}.GUILD.TAGS.whitelist_create`) || [];

        let embed = new EmbedBuilder()
            .setTitle(lang.tag_wlcreate_embed_title)
            .setColor("#475387")
            .setDescription(lang.tag_wlcreate_embed_desc)
            .addFields({
                name: lang.setjoinroles_help_embed_fields_1_name,
                value: Array.isArray(all_roles) && all_roles.length > 0
                    ? all_roles.map(x => `<@&${x}>`).join(', ')
                    : lang.setjoinroles_var_none
            });

        let roleSelectMenu = new RoleSelectMenuBuilder()
            .setCustomId('utils-wlTagCreate-role-selecter')
            .setMaxValues(25)
            .setMinValues(0);

        if (all_roles !== undefined && all_roles?.length >= 1) {
            const roles: string[] = Array.isArray(all_roles) ? all_roles : [all_roles];
            roleSelectMenu.setDefaultRoles(roles);
        }

        let saveButton = new ButtonBuilder()
            .setCustomId('utils-wlTagCreate-save-button')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💾');

        let comp = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(roleSelectMenu);
        let comp_2 = new ActionRowBuilder<ButtonBuilder>().addComponents(saveButton);

        let og_response = await client.func.method.interactionSend(interaction, {
            embeds: [embed],
            components: [comp, comp_2]
        });
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

            let too_highter_roles: { id: string, name: string, position: string }[] = [];

            if (!roleInteraction.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
                await roleInteraction.deferUpdate();
                await client.func.method.interactionSend(interaction, { content: lang.setjoinroles_var_perm_issue, ephemeral: true });
                return;
            }

            for (const role of roleInteraction.roles) {
                all_roles.push(role[1].id);

                selectedRoles.push(role[1] as Role);

                if (interaction.guild?.members.me?.roles.highest.position! <= role[1].position) {
                    if (!tooHighterRoles.has(role[1].id)) {
                        too_highter_roles.push({ id: role[1].id, name: role[1].name, position: role[1].position.toString() });
                    }
                }
            }

            await roleInteraction.deferUpdate();
            updateEmbed(embed, selectedRoles, lang);
            await og_response.edit({ embeds: [embed] });
        });

        buttonCollector.on('collect', async (buttonInteraction: ButtonInteraction) => {
            await buttonInteraction.deferUpdate();
            if (buttonInteraction.customId === 'utils-wlTagCreate-save-button') {
                let newComp_2 = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        saveButton
                            .setStyle(ButtonStyle.Success)
                            .setEmoji(client.iHorizon_Emojis.icon.Yes_Logo)
                            .setDisabled(true)
                    );

                await og_response.edit({ components: [newComp_2] })

                // await client.func.ihorizon_logs(interaction, {
                //     title: lang.utils_wlRoles_logsEmbed_title,
                //     description: lang.utils_wlRoles_logsEmbed_desc
                //         .replace("${interaction.member?.user.toString()}", interaction.member?.user.toString()!)
                // });

                await client.db.set(`${interaction.guildId}.GUILD.TAGS.whitelist_create`, all_roles);
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

        function updateEmbed(embed: EmbedBuilder, roles: Role[], lang: LanguageData) {
            const roleValues = roles.map(role => `<@&${role.id}>`).join(', ') || lang.setjoinroles_var_none;
            embed.setFields({
                name: lang.setjoinroles_help_embed_fields_1_name,
                value: roleValues
            });
        };
    },
};