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
    ColorResolvable,
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData';
import { CategoryData } from '../../../../types/category';
import { Command } from '../../../../types/command';

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
        let data = await client.functions.getLanguageData(interaction.guildId) as LanguageData;

        const categories: CategoryData[] = [];

        for (const cat of client.category) {
            const color = cat.categoryColor;

            const descriptionKey = cat.options.description;
            const description = data[descriptionKey as keyof LanguageData].toString();

            const placeholderKey = cat.options.placeholder;
            const placeholder = data[placeholderKey as keyof LanguageData];

            const commands = client.content.filter(c => c.category === cat.categoryName);

            categories.push({
                name: placeholder.toString(),
                value: commands,
                inline: true,
                description: description,
                color: color,
                emoji: cat.options.emoji
            });
        };

        categories.sort((a, b) => a.name.localeCompare(b.name));

        let select = new StringSelectMenuBuilder().setCustomId('help-menu').setPlaceholder(data.help_select_menu);
        let select_2 = new StringSelectMenuBuilder().setCustomId('help-menu-2').setPlaceholder(data.help_select_menu);

        select.addOptions(new StringSelectMenuOptionBuilder()
            .setLabel(data.help_back_to_menu)
            .setDescription(data.help_back_to_menu_desc)
            .setValue("back")
            .setEmoji("⬅️"));

        select_2.addOptions(new StringSelectMenuOptionBuilder()
            .setLabel(data.help_back_to_menu)
            .setDescription(data.help_back_to_menu_desc)
            .setValue("back")
            .setEmoji("⬅️"));

        let i = 0;
        let toAddInAnotherSelect: CategoryData[] = [];

        categories.forEach((category, index) => {
            i++
            if (i >= categories.length / 2) return toAddInAnotherSelect.push(category);
            select.addOptions(new StringSelectMenuOptionBuilder()
                .setLabel(category.name)
                .setDescription(data.help_select_menu_fields_desc
                    .replace("${categories[index].value.length}", categories[index].value.length.toString())
                )
                .setValue(index.toString())
                .setEmoji(category.emoji));
        });

        toAddInAnotherSelect.forEach((category, index) => {
            select_2.addOptions(new StringSelectMenuOptionBuilder()
                .setLabel(category.name)
                .setDescription(data.help_select_menu_fields_desc
                    .replace("${categories[index].value.length}", categories[index].value.length.toString())
                )
                .setValue(index.toString())
                .setEmoji(category.emoji));
        })
        let row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
        let row_2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select_2);

        let og_embed = new EmbedBuilder()
            .setColor('#001eff')
            .setDescription(data.help_tip_embed
                .replaceAll('${client.user?.username}', interaction.client.user?.username)
                .replaceAll('${client.iHorizon_Emojis.icon.Pin}', client.iHorizon_Emojis.icon.Pin)
                .replaceAll('${categories.length}', categories.length.toString())
                .replaceAll('${client.iHorizon_Emojis.badge.Slash_Bot}', client.iHorizon_Emojis.badge.Slash_Bot)
                .replaceAll('${client.content.filter(c => c.messageCmd === false).length}', client.content.filter(c => c.messageCmd === false).length.toString())
                .replaceAll('${client.iHorizon_Emojis.icon.Crown_Logo}', client.iHorizon_Emojis.icon.Crown_Logo)
                .replaceAll('${config.owner.ownerid1}', client.config.owner.ownerid1)
                .replaceAll('${config.owner.ownerid2}', client.config.owner.ownerid2)
                .replaceAll('${client.iHorizon_Emojis.vc.Region}', client.iHorizon_Emojis.vc.Region)
                .replaceAll('${client.iHorizon_Emojis.badge.Slash_Bot}', client.iHorizon_Emojis.badge.Slash_Bot)
            )
            .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
            .setImage(`https://ihorizon.me/assets/img/banner/ihrz_${await client.db.get(`${interaction.guildId}.GUILD.LANG.lang`) || 'en-US'}.png`)
            .setThumbnail("attachment://icon.png")
            .setTimestamp();

        let embed = new EmbedBuilder()
            .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
            .setThumbnail("attachment://icon.png");

        let response = await interaction.reply({
            embeds: [og_embed],
            components: [row, row_2],
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

            if (i.values[0] === "back") {
                await response.edit({ embeds: [og_embed], components: [row, row_2] });
                return;
            }

            embed
                .setTitle(`${categories[i.values[0] as unknown as number].emoji}・${categories[i.values[0] as unknown as number].name}`)
                .setDescription(categories[i.values[0] as unknown as number].description)
                .setColor(categories[i.values[0] as unknown as number].color as ColorResolvable);

            embed.setFields({ name: ' ', value: ' ' });

            let categoryColor = categories[i.values[0] as unknown as number].color;
            let commandGroups: { name: string, value: string, inline: boolean }[][] = [];
            let embeds: EmbedBuilder[] = [];
            let currentGroup: { name: string, value: string, inline: boolean }[] = [];

            categories[i.values[0] as unknown as number].value.forEach(async (element, index) => {
                let cmdPrefix = (element.messageCmd) ? `${client.iHorizon_Emojis.icon.Prefix_Command} **@Ping-Me ${element.cmd}**` : `${client.iHorizon_Emojis.badge.Slash_Bot} **/${element.cmd}**`;
                let descValue = (guildLang === "fr-ME" || guildLang === "fr-FR") ? `\`${element.desc_localized["fr"]}\`` : `\`${element.desc}\``;

                switch (guildLang) {
                    case "en-US":
                        currentGroup.push({ name: cmdPrefix, value: descValue, inline: true });
                        break;
                    case "fr-FR":
                        currentGroup.push({ name: cmdPrefix, value: descValue, inline: true });
                        break;
                    default:
                        currentGroup.push({ name: cmdPrefix, value: descValue, inline: true });
                        break;
                }

                if ((index + 1) % 20 === 0 || index === categories[i.values[0] as unknown as number].value.length - 1) {
                    commandGroups.push([...currentGroup]);
                    currentGroup = [];
                }
            });

            for (const group of commandGroups) {
                let newEmbed = new EmbedBuilder().setColor(categoryColor as ColorResolvable);

                if (embeds.length === 0) {
                    newEmbed
                        .setTitle(`${categories[i.values[0] as unknown as number].emoji}・${categories[i.values[0] as unknown as number].name}`)
                        .setDescription(categories[i.values[0] as unknown as number].description)
                        .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" })
                        .setThumbnail("attachment://icon.png")
                        .setTimestamp();
                }

                group.forEach(field => {
                    newEmbed.addFields(field);
                });

                const remainingFields = group.length % 2;
                if (remainingFields === 0) {
                    newEmbed.addFields({ name: '**  **', value: '**  **', inline: true });
                }

                embeds.push(newEmbed);
            }

            await response.edit({ embeds: embeds });
        });

        collector.on('end', async i => {
            await response.edit({
                components: [
                    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select.setDisabled(true)),
                    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select_2.setDisabled(true))
                ]
            });

            return;
        });
    },
};