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
import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import { guildPrefix } from '../../../core/functions/prefix.js';
export function setupHelpCategoryCollector(helpMessage, categoryEmbeds, categories, lang, authorId) {
    const collector = helpMessage.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 120000 * 15 // 30 minutes
    });
    collector.on('collect', async (interaction) => {
        if (interaction.customId !== 'help_category_select')
            return;
        if (interaction.user.id !== authorId) {
            await interaction.reply({
                content: lang.help_not_for_you,
                ephemeral: true
            });
            return;
        }
        ;
        const selectedCategory = interaction.values[0];
        const matchedCategory = categories.find(cat => cat.name.toLowerCase().replace(/\s+/g, '_') === selectedCategory);
        if (!matchedCategory) {
            await interaction.update({
                content: lang.var_unreachable_command,
                embeds: [],
                components: []
            });
            return;
        }
        const categoryKey = selectedCategory;
        const categorySpecificEmbeds = categoryEmbeds[categoryKey] ||
            categoryEmbeds[matchedCategory.value[0].category];
        const row = new ActionRowBuilder()
            .addComponents(new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder(lang.help_select_menu)
            .addOptions(categories.map(cat => ({
            label: cat.name,
            value: cat.name.toLowerCase().replace(/\s+/g, '_'),
            emoji: cat.emoji,
            default: cat.name.toLowerCase().replace(/\s+/g, '_') === selectedCategory
        }))));
        await interaction.update({
            embeds: [categorySpecificEmbeds[0]],
            components: [row]
        });
    });
    collector.on('end', async () => {
        try {
            await helpMessage.edit({
                components: [
                    new ActionRowBuilder()
                        .addComponents(new StringSelectMenuBuilder()
                        .setCustomId('help_category_select')
                        .setPlaceholder(lang.help_select_menu)
                        .addOptions(categories.map(cat => ({
                        label: cat.name,
                        value: cat.name.toLowerCase().replace(/\s+/g, '_'),
                        emoji: cat.emoji
                    })))
                        .setDisabled(true))
                ]
            });
        }
        catch (error) {
            console.error('Error disabling help menu:', error);
        }
    });
    return collector;
}
export const command = {
    name: 'h',
    description: 'help menu for og user lmao',
    description_localizations: {
        "fr": "Un menu de help tah les matrixé"
    },
    thinking: false,
    category: 'bot',
    type: "PREFIX_IHORIZON_COMMAND",
    run: async (client, interaction, lang, command, neededPerm, args) => {
        const categoryEmbeds = {};
        const skidBot = {
            color: "#1519f0",
            footer: '© iHorizon 2025',
            botPrefix: (await guildPrefix(client, interaction.guildId)).string,
            lang: await client.db.get(`${interaction.guildId}.GUILD.LANG.lang`) || "fr-FR"
        }; // by the way, this is a joke, don't take it seriouslys
        const categories = [];
        for (const cat of client.category) {
            const descriptionKey = cat.options.description;
            const description = lang[descriptionKey].toString();
            const placeholderKey = cat.options.placeholder;
            const placeholder = lang[placeholderKey];
            const commands = client.content.filter(c => c.category === cat.categoryName
                && (c.messageCmd == 2 || c.messageCmd == 1)
                && !(c.category === "ownihrz"));
            if (commands.length > 0) {
                const embedPages = [];
                let suiteIndex = 0;
                let fieldCount = 0;
                let currentEmbed = new EmbedBuilder()
                    .setTitle(placeholder.toString())
                    .setDescription(lang.hybridcommands_embed_footer_text.replace('${botPrefix}', skidBot.botPrefix))
                    .setColor(skidBot.color)
                    .setFooter({ text: skidBot.footer });
                const suiteCategories = [];
                let currentSuiteCommands = [];
                commands.forEach((cmd, index) => {
                    if (fieldCount >= 24) {
                        embedPages.push(currentEmbed);
                        suiteIndex++;
                        const suiteCategoryName = `${placeholder.toString()} ${lang.h_suite} ${suiteIndex}`;
                        currentSuiteCommands = commands.slice(index);
                        suiteCategories.push({
                            name: suiteCategoryName,
                            commands: currentSuiteCommands
                        });
                        currentEmbed = new EmbedBuilder()
                            .setTitle(suiteCategoryName)
                            .setDescription(lang.h_suite_desc)
                            .setColor(skidBot.color)
                            .setFooter({ text: skidBot.footer });
                        fieldCount = 0;
                    }
                    let fields_name = `\`${skidBot.botPrefix}${cmd.prefixCmd || cmd.cmd}`;
                    if (cmd.usage)
                        fields_name += " " + cmd.usage;
                    fields_name += "`";
                    currentEmbed.addFields({
                        name: fields_name,
                        value: (skidBot.lang.startsWith("fr") ? cmd.desc_localized["fr"] : cmd.desc)
                    });
                    fieldCount++;
                    if (index === commands.length - 1) {
                        embedPages.push(currentEmbed);
                    }
                });
                categoryEmbeds[cat.categoryName] = embedPages;
                categories.push({
                    name: placeholder.toString(),
                    value: commands,
                    inline: false,
                    description: description,
                    color: "#1519f0",
                    emoji: cat.options.emoji
                });
                suiteCategories.forEach(suite => {
                    const suiteEmbed = new EmbedBuilder()
                        .setTitle(suite.name)
                        .setDescription(lang.h_suite_desc)
                        .setColor(skidBot.color)
                        .setFooter({ text: skidBot.footer });
                    suite.commands.forEach(cmd => {
                        let fields_name = `\`${skidBot.botPrefix}${cmd.prefixCmd || cmd.cmd}`;
                        if (cmd.usage)
                            fields_name += " " + cmd.usage;
                        fields_name += "`";
                        suiteEmbed.addFields({
                            name: fields_name,
                            value: (skidBot.lang.startsWith("fr") ? cmd.desc_localized["fr"] : cmd.desc)
                        });
                    });
                    categoryEmbeds[suite.name.toLowerCase().replace(/\s+/g, '_')] = [suiteEmbed];
                    categories.push({
                        name: suite.name,
                        value: suite.commands,
                        inline: false,
                        description: description,
                        color: "#1519f0",
                        emoji: cat.options.emoji
                    });
                });
            }
        }
        categories.sort((a, b) => a.name.localeCompare(b.name));
        const row = new ActionRowBuilder()
            .addComponents(new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder(lang.help_select_menu)
            .addOptions(categories.map(cat => ({
            label: cat.name,
            value: cat.name.toLowerCase().replace(/\s+/g, '_'),
            emoji: cat.emoji
        }))));
        const initialCategory = categories[0];
        const initialEmbeds = categoryEmbeds[initialCategory.value[0].category];
        const helpMessage = await interaction.channel.send({
            embeds: [initialEmbeds[0]],
            components: [row]
        });
        setupHelpCategoryCollector(helpMessage, categoryEmbeds, categories, lang, interaction.member?.user.id);
    }
};
