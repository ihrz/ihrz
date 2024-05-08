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
    RESTPostAPIApplicationCommandsJSONBody,
    Message
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
    type: 'PREFIX_IHORIZON_COMMAND',
    run: async (client: Client, interaction: Message) => {
        let data = await client.functions.getLanguageData(interaction.guildId);

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
                color: color,
                description: description,
                emoji: cat.options.emoji
            });
        };

        categories.sort((a, b) => a.name.localeCompare(b.name));
        let select = new StringSelectMenuBuilder().setCustomId('starter').setPlaceholder('Make a selection!');

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

            if (i.user.id !== interaction.author.id) {
                await i.reply({ content: data.help_not_for_you, ephemeral: true });
                return;
            };

            await i.deferUpdate();

            embed
                .setTitle(`${categories[i.values[0] as unknown as number].emoji}・${categories[i.values[0] as unknown as number].name}`)
                .setDescription(categories[i.values[0] as unknown as number].description);

            embed.setFields({ name: ' ', value: ' ' });

            let categoryColor = categories[i.values[0] as unknown as number].color as any;
            let commandGroups: any[][] = [];
            let embeds: EmbedBuilder[] = [];
            let currentGroup: any[] = [];

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
                let newEmbed = new EmbedBuilder().setColor(categoryColor);

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
    },
};