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
    BaseGuildTextChannel,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    ComponentType,
    EmbedBuilder,
    Message,
    PermissionsBitField,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';
import { SubCommandArgumentValue } from '../../../core/functions/method';
import { DatabaseStructure } from '../../../../types/database_structure';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, data: LanguageData, command: SubCommandArgumentValue, execTimestamp?: number, args?: string[]) => {
        let permCheck = await client.method.permission.checkCommandPermission(interaction, command.command!);
        if (!permCheck.allowed) return client.method.permission.sendErrorMessage(interaction, data, permCheck.neededPerm || 0);

        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

        let a = new EmbedBuilder()
            .setColor("#FF0000")
            .setDescription(data.removeinvites_not_admin_embed_description);

        const permissionsArray = [PermissionsBitField.Flags.Administrator]
        const permissions = interaction instanceof ChatInputCommandInteraction ?
            interaction.memberPermissions?.has(permissionsArray)
            : interaction.member.permissions.has(permissionsArray);

        if (!permissions && permCheck.neededPerm === 0) {
            await client.method.interactionSend(interaction, { embeds: [a] });
            return;
        };

        const response = await client.method.interactionSend(interaction, {
            content: data.resetallinvites_warning_msg,
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("yes")
                            .setStyle(ButtonStyle.Danger)
                            .setLabel(data.resetallinvites_yes_button),
                        new ButtonBuilder()
                            .setCustomId("no")
                            .setStyle(ButtonStyle.Success)
                            .setLabel(data.resetallinvites_no_button)
                    )
            ]
        })

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 2_240_00 });

        collector.on("collect", async i => {
            if (i.user.id !== interaction.member?.user.id) {
                await i.reply({ content: data.help_not_for_you, ephemeral: true });
                return;
            }

            await i.deferUpdate()

            if (i.customId === "yes") {
                const baseData = await client.db.get(`${interaction.guildId}.USER`) as DatabaseStructure.DbGuildUserObject;
                for (let user in baseData) {
                    baseData[user].INVITES = {}
                }
                await client.db.set(`${interaction.guildId}.USER`, baseData);
                await response.edit({ content: data.resetallinvites_succes_on_delete });

                await client.method.iHorizonLogs.send(interaction, {
                    title: data.resetallinvites_logs_embed_title,
                    description: data.resetallinvites_logs_embed_desc
                        .replace("${interaction.member.user.toString()}", interaction.member.user.toString())
                });

                collector.stop();
            } else {
                await response.edit({ content: data.setjoinroles_action_canceled, components: [] });
                collector.stop()
            }
        });

        collector.on("end", async () => {
            await response.edit({ components: [] });
        });
    },
};