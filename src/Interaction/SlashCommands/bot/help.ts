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
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    ComponentType,
    ChatInputCommandInteraction,
    StringSelectMenuInteraction,
    ApplicationCommandType,
} from 'discord.js'

import { Command, DescriptionLocalizations } from '../../../../types/command';
import { LanguageData } from '../../../../types/languageData';

export const command: Command = {
    name: 'help',

    description: 'Get a list of all the commands!',
    description_localizations: {
        "fr": "Obtenir la liste de toute les commandes"
    },

    category: 'bot',
    thinking: false,
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        let data = await client.functions.getLanguageData(interaction.guild?.id) as LanguageData;

        let categories = [
            {
                name: data.help_backup_fields,
                value: client.content.filter(c => c.category === 'backup'),
                description: data.help_backup_dsc,
                emoji: "🔁",
                inline: true,
            },
            {
                name: data.help_bot_fields,
                value: client.content.filter(c => c.category === 'bot'),
                inline: true,
                description: data.help_bot_dsc,
                emoji: "🤖"
            },
            {
                name: data.help_economy_fields,
                value: client.content.filter(c => c.category === 'economy'),
                inline: true,
                description: data.help_economy_dsc,
                emoji: "👩‍💼"
            },
            {
                name: data.help_fun_fields,
                value: client.content.filter(c => c.category === 'fun'),
                inline: true,
                description: data.help_fun_dsc,
                emoji: "🆒"
            },
            {
                name: data.help_giveaway_fields,
                value: client.content.filter(c => c.category === 'giveaway'),
                inline: true,
                description: data.help_giveaway_dsc,
                emoji: "🎉"
            },
            {
                name: data.help_guildconf_fields,
                value: client.content.filter(c => c.category === 'guildconfig'),
                inline: true,
                description: data.help_guildconf_dsc,
                emoji: "⚙"
            },
            {
                name: data.help_invitem_fields,
                value: client.content.filter(c => c.category === 'invitemanager'),
                inline: true,
                description: data.help_invitem_dsc,
                emoji: "💾"
            },
            {
                name: data.help_memberc_fields,
                value: client.content.filter(c => c.category === 'membercount'),
                inline: true,
                description: data.help_memberc_dsc,
                emoji: "👥"
            },
            {
                name: data.help_mod_fields,
                value: client.content.filter(c => c.category === 'moderation'),
                inline: true,
                description: data.help_mod_dsc,
                emoji: "👮‍♀️"
            },
            {
                name: data.help_music_fields,
                value: client.content.filter(c => c.category === 'music'),
                inline: true,
                description: data.help_music_dsc,
                emoji: "🎵"
            },
            {
                name: data.help_newftrs_fields,
                value: client.content.filter(c => c.category === 'newfeatures'),
                inline: true,
                description: data.help_newftrs_dsc,
                emoji: "🆕"
            },
            {
                name: data.help_owner_fields,
                value: client.content.filter(c => c.category === 'owner'),
                inline: true,
                description: data.help_owner_dsc,
                emoji: "👩‍✈️"
            },
            {
                name: data.help_pfps_fields,
                value: client.content.filter(c => c.category === 'pfps'),
                inline: true,
                description: data.help_pfps_dsc,
                emoji: "🕵️‍♀️"
            },
            {
                name: data.help_prof_fields,
                value: client.content.filter(c => c.category === 'profil'),
                inline: true,
                description: data.help_prof_dsc,
                emoji: "👩"
            },
            {
                name: data.help_protection_fields,
                value: client.content.filter(c => c.category === 'protection'),
                inline: true,
                description: data.help_protection_dsc,
                emoji: "🛡️"
            },
            {
                name: data.help_ranks_fields,
                value: client.content.filter(c => c.category === 'ranks'),
                inline: true,
                description: data.help_ranks_dsc,
                emoji: "🌟"
            },
            {
                name: data.help_roler_fields,
                value: client.content.filter(c => c.category === 'rolereactions'),
                inline: true,
                description: data.help_roler_dsc,
                emoji: "📇"
            },
            {
                name: data.help_schedule_fields,
                value: client.content.filter(c => c.category === 'schedule'),
                inline: true,
                description: data.help_schedule_dsc,
                emoji: "🗒"
            },
            {
                name: data.help_security_fields,
                value: client.content.filter(c => c.category === 'security'),
                inline: true,
                description: data.help_security_dsc,
                emoji: "🔐"
            },
            {
                name: data.help_suggestion_fields,
                value: client.content.filter(c => c.category === 'suggestion'),
                inline: true,
                description: data.help_suggestion_dsc,
                emoji: "❓"
            },
            {
                name: data.help_voicedashboard_fields,
                value: client.content.filter(c => c.category === 'voicedashboard'),
                inline: true,
                description: data.help_voicedashboard_dsc,
                emoji: "🔊"
            },
            {
                name: data.help_ticket_fields,
                value: client.content.filter(c => c.category === 'ticket'),
                inline: true,
                description: data.help_ticket_dsc,
                emoji: "🎫"
            },
            {
                name: data.help_utils_fields,
                value: client.content.filter(c => c.category === 'utils'),
                inline: true,
                description: data.help_utils_dsc,
                emoji: "🧰"
            },
        ];

        let select = new StringSelectMenuBuilder().setCustomId('help-menu').setPlaceholder('Make a selection!');

        categories.forEach((category, index) => {
            select.addOptions(new StringSelectMenuOptionBuilder()
                .setLabel(category.name)
                .setValue(index.toString())
                .setEmoji(category.emoji));
        });

        let row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

        let embed = new EmbedBuilder()
            .setColor('#001eff')
            .setDescription(data.help_tip_embed)
            .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
            .setThumbnail("attachment://icon.png")
            .setTimestamp();

        let response = await interaction.reply({
            embeds: [embed],
            components: [row],
            files: [{ attachment: await client.functions.image64(client.user?.displayAvatarURL()), name: 'icon.png' }]
        });

        let collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 840_000 });
        let guildLang = await client.db.get(`${interaction.guildId}.GUILD.LANG.lang`);

        collector.on('collect', async (i: StringSelectMenuInteraction) => {

            if (i.user.id !== interaction.user.id) {
                await i.reply({ content: data.help_not_for_you, ephemeral: true });
                return;
            };

            await i.deferUpdate();

            embed
                .setTitle(`${categories[i.values[0] as unknown as number].emoji}・${categories[i.values[0] as unknown as number].name}`)
                .setDescription(categories[i.values[0] as unknown as number].description);

            embed.setFields({ name: ' ', value: ' ' });

            categories[i.values[0] as unknown as number].value.forEach(async (element) => {
                if (element.messageCmd) {
                    switch (guildLang) {
                        case "en-US":
                            embed.addFields({ name: `${client.iHorizon_Emojis.icon.Prefix_Command} **@Ping-Me ${element.cmd}**`, value: `\`${element.desc}\``, inline: true });
                            break;
                        case "fr-FR":
                            embed.addFields({ name: `${client.iHorizon_Emojis.icon.Prefix_Command} **@Ping-Me ${element.cmd}**`, value: `\`${element.desc_localized["fr"]}\``, inline: true });
                            break;
                        case "fr-ME":
                            embed.addFields({ name: `${client.iHorizon_Emojis.badge.Slash_Bot} **@Ping-Me ${element.cmd}**`, value: `\`${element.desc_localized["fr"]}\``, inline: true });
                            break;
                        default:
                            embed.addFields({ name: `${client.iHorizon_Emojis.icon.Prefix_Command} **@Ping-Me ${element.cmd}**`, value: `\`${element.desc}\``, inline: true });
                            break;
                    };
                } else {
                    switch (guildLang) {
                        case "en-US":
                            embed.addFields({ name: `${client.iHorizon_Emojis.badge.Slash_Bot} **/${element.cmd}**`, value: `\`${element.desc}\``, inline: true });
                            break;
                        case "fr-FR":
                            embed.addFields({ name: `${client.iHorizon_Emojis.badge.Slash_Bot} **/${element.cmd}**`, value: `\`${element.desc_localized["fr"]}\``, inline: true });
                            break;
                        case "fr-ME":
                            embed.addFields({ name: `${client.iHorizon_Emojis.badge.Slash_Bot} **/${element.cmd}**`, value: `\`${element.desc_localized["fr"]}\``, inline: true });
                            break;
                        default:
                            embed.addFields({ name: `${client.iHorizon_Emojis.badge.Slash_Bot} **/${element.cmd}**`, value: `\`${element.desc}\``, inline: true });
                            break;
                    };
                }

                await response.edit({ embeds: [embed] });
            });

        });

        collector.on('end', async i => {
            await response.edit({
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select.setDisabled(true))]
            });

            return;
        });
    },
};