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
    ActionRowBuilder,
    BaseGuildTextChannel,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    ComponentType,
    EmbedBuilder,
    PermissionsBitField,
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.editReply({ content: data.setjoinmessage_not_admin });
            return;
        };

        let joinMessage = await client.db.get(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinmessage`) as string | undefined;
        joinMessage = joinMessage?.substring(0, 1010);

        let help_embed = new EmbedBuilder()
            .setColor(await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.embed_color.all`) || "#0014a8")
            .setDescription(data.setjoinmessage_help_embed_desc)
            .setTitle(data.setjoinmessage_help_embed_title)
            .setFields(
                {
                    name: data.setjoinmessage_help_embed_fields_custom_name,
                    value: joinMessage ? `\`\`\`${joinMessage}\`\`\`\n${joinMessage
                        .replaceAll("{memberUsername}", interaction.user.username)
                        .replaceAll("{memberMention}", interaction.user.toString())
                        .replaceAll('{memberCount}', interaction.guild?.memberCount.toString()!)
                        .replaceAll('{createdAt}', interaction.user.createdAt.toDateString())
                        .replaceAll('{guildName}', interaction.guild?.name!)
                        .replaceAll('{inviterUsername}', interaction.client.user?.username)
                        .replaceAll('{inviterMention}', interaction.client.user.toString())
                        .replaceAll('{invitesCount}', '1337')
                        }` : data.setjoinmessage_help_embed_fields_custom_name_empy
                },
                {
                    name: data.setjoinmessage_help_embed_fields_default_name_empy,
                    value: `\`\`\`${data.event_welcomer_inviter}\`\`\`\n${data.event_welcomer_inviter
                        .replace("{memberMention}", interaction.user.toString())
                        .replace('{createdAt}', interaction.user.createdAt.toDateString())
                        .replace('{inviterUsername}', interaction.client.user?.username)
                        .replace('{invitesCount}', '1337')
                        .replace('{memberCount}', interaction.guild?.memberCount.toString()!)
                        .replace('{guildName}', interaction.guild?.name!)
                        }`
                }
            );
        let embedFields = help_embed.data?.fields ?? [];

        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("joinMessage-set-message")
                    .setLabel(data.setjoinmessage_button_set_name)
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("joinMessage-default-message")
                    .setLabel(data.setjoinmessage_buttom_del_name)
                    .setStyle(ButtonStyle.Danger),
            );

        let originalResponse = await interaction.editReply({
            embeds: [help_embed],
            components: [buttons]
        });

        let collector = originalResponse.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: (u) => u.user.id === interaction.user.id,
            time: 80_000
        });

        collector.on('collect', async collectInteraction => {
            if (collectInteraction.customId === "joinMessage-set-message") {
                await collectInteraction.reply({
                    content: data.setjoinmessage_awaiting_response,
                    ephemeral: true
                });

                let questionReply = interaction.channel?.createMessageCollector({
                    filter: (m) => m.author.id === interaction.user.id,
                    max: 1,
                    time: 120_000
                });

                questionReply?.on('collect', async collected => {
                    let response = collected.content.substring(0, 1010);
                    let newEmbed = EmbedBuilder.from(help_embed).setFields(
                        {
                            name: data.setjoinmessage_help_embed_fields_custom_name,
                            value: response ? `\`\`\`${response}\`\`\`\n${response
                                .replaceAll("{memberUsername}", interaction.user.username)
                                .replaceAll("{memberMention}", interaction.user.toString())
                                .replaceAll('{memberCount}', interaction.guild?.memberCount.toString()!)
                                .replaceAll('{createdAt}', interaction.user.createdAt.toDateString())
                                .replaceAll('{guildName}', interaction.guild?.name!)
                                .replaceAll('{inviterUsername}', interaction.client.user?.username)
                                .replaceAll('{inviterMention}', interaction.client.user.toString())
                                .replaceAll('{invitesCount}', '1337')
                                .replaceAll("\\n", '\n')
                                }` : data.setjoinmessage_help_embed_fields_custom_name_empy
                        },
                    );

                    await client.db.set(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinmessage`, response);

                    collected.delete();
                    newEmbed.addFields(embedFields[1]);
                    originalResponse.edit({ embeds: [newEmbed] });
                    questionReply.stop();

                    try {
                        let logEmbed = new EmbedBuilder()
                            .setColor("#bf0bb9")
                            .setTitle(data.setjoinmessage_logs_embed_title_on_enable)
                            .setDescription(data.setjoinmessage_logs_embed_description_on_enable
                                .replace("${interaction.user.id}", interaction.user.id)
                            )

                        let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');
                        if (logchannel) {
                            (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
                        }


                        await interaction.editReply({
                            content: data.setjoinmessage_command_work_on_enable
                                .replace(
                                    "${client.iHorizon_Emojis.icon.Green_Tick_Logo}",
                                    client.iHorizon_Emojis.icon.Green_Tick_Logo
                                )
                        });
                    } catch (e) {
                    };

                });
            } else if (collectInteraction.customId === "joinMessage-default-message") {
                let newEmbed = EmbedBuilder.from(help_embed).setFields(
                    {
                        name: data.setjoinmessage_help_embed_fields_custom_name,
                        value: data.setjoinmessage_help_embed_fields_custom_name_empy
                    },
                );

                await collectInteraction.deferUpdate();
                newEmbed.addFields(embedFields[1]);
                await originalResponse.edit({ embeds: [newEmbed] });

                await client.db.delete(`${interaction.guildId}.GUILD.GUILD_CONFIG.joinmessage`);

                try {
                    let logEmbed = new EmbedBuilder()
                        .setColor("#bf0bb9")
                        .setTitle(data.setjoinmessage_logs_embed_title_on_disable)
                        .setDescription(data.setjoinmessage_logs_embed_description_on_disable
                            .replace("${interaction.user.id}", interaction.user.id)
                        );

                    let logchannel = interaction.guild?.channels.cache.find((channel: { name: string; }) => channel.name === 'ihorizon-logs');

                    if (logchannel) {
                        (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] })
                    };
                } catch { };

                await interaction.editReply({
                    content: data.setjoinmessage_command_work_on_disable.replace('${client.iHorizon_Emojis.icon.Yes_Logo}', client.iHorizon_Emojis.icon.Yes_Logo)
                });
            }
        })

        collector.on('end', async () => {
            buttons.components.forEach(x => {
                x.setDisabled(true)
            })
            await originalResponse.edit({ components: [buttons] });
        });
    },
};