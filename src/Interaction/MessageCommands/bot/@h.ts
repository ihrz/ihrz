/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	Client,
	Message,
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ColorResolvable,
	BaseGuildTextChannel,
	ComponentType,
	ButtonBuilder,
	ButtonStyle
} from 'discord.js';
import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import { CategoryData } from '../../../../types/category.js';
import { guildPrefix } from '../../../core/functions/prefix.js';

interface SelectMenuPage {
	categories: CategoryData[];
	pageIndex: number;
	totalPages: number;
}

function chunkCategories(categories: CategoryData[], chunkSize: number = 25): CategoryData[][] {
	const chunks: CategoryData[][] = [];
	for (let i = 0; i < categories.length; i += chunkSize) {
		chunks.push(categories.slice(i, i + chunkSize));
	}
	return chunks;
}

function createSelectMenuRows(
	categoriesChunk: CategoryData[],
	lang: LanguageData,
	currentPage: number,
	totalPages: number,
	selectedCategory?: string
): ActionRowBuilder<StringSelectMenuBuilder>[] {
	const rows: ActionRowBuilder<StringSelectMenuBuilder>[] = [];

	// Create the main select menu
	const selectMenu = new StringSelectMenuBuilder()
		.setCustomId(`help_category_select_${currentPage}`)
		.setPlaceholder(`${lang.help_select_menu}${totalPages > 1 ? ` (Page ${currentPage + 1}/${totalPages})` : ''}`)
		.addOptions(
			categoriesChunk.map(cat => ({
				label: cat.name,
				value: cat.name.toLowerCase().replace(/\s+/g, '_'),
				emoji: cat.emoji,
				default: cat.name.toLowerCase().replace(/\s+/g, '_') === selectedCategory
			}))
		);

	const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
	rows.push(row);

	return rows;
}

function createNavigationRow(currentPage: number, totalPages: number, lang: LanguageData): ActionRowBuilder<ButtonBuilder> | null {
	if (totalPages <= 1) return null;

	const navigationRow = new ActionRowBuilder<ButtonBuilder>();

	// Previous page button
	navigationRow.addComponents(
		new ButtonBuilder()
			.setCustomId('help_prev_page')
			.setLabel('◀ Previous')
			.setStyle(ButtonStyle.Primary)
			.setDisabled(currentPage === 0)
	);

	// Page indicator
	navigationRow.addComponents(
		new ButtonBuilder()
			.setCustomId('help_page_indicator')
			.setLabel(`${currentPage + 1}/${totalPages}`)
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(true)
	);

	// Next page button
	navigationRow.addComponents(
		new ButtonBuilder()
			.setCustomId('help_next_page')
			.setLabel('Next ▶')
			.setStyle(ButtonStyle.Primary)
			.setDisabled(currentPage === totalPages - 1)
	);

	return navigationRow;
}

export function setupHelpCategoryCollector(
	helpMessage: Message,
	categoryEmbeds: { [key: string]: EmbedBuilder[] },
	categories: CategoryData[],
	lang: LanguageData,
	authorId: string
) {
	const categoryChunks = chunkCategories(categories);
	let currentPageIndex = 0;
	let selectedCategory: string | undefined;

	const collector = helpMessage.createMessageComponentCollector({
		componentType: ComponentType.StringSelect,
		time: 120000 * 15// 30 minutes
	});

	const buttonCollector = helpMessage.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: 120000 * 15 // 30 minutes
	});

	async function updateMessagePage(interaction: any, pageIndex: number, selectedCat?: string) {
		const chunk = categoryChunks[pageIndex];
		const selectMenuRows = createSelectMenuRows(chunk, lang, pageIndex, categoryChunks.length, selectedCat);
		const navigationRow = createNavigationRow(pageIndex, categoryChunks.length, lang);

		const components: any[] = [...selectMenuRows];
		if (navigationRow) {
			components.push(navigationRow);
		}

		let embedToShow: EmbedBuilder;
		if (selectedCat) {
			const matchedCategory = categories.find(
				cat => cat.name.toLowerCase().replace(/\s+/g, '_') === selectedCat
			);
			if (matchedCategory) {
				const categoryKey = selectedCat;
				const categorySpecificEmbeds = categoryEmbeds[categoryKey] ||
					categoryEmbeds[matchedCategory.value[0].category];
				embedToShow = categorySpecificEmbeds[0];
			} else {
				embedToShow = categoryEmbeds[chunk[0].value[0].category][0];
			}
		} else {
			embedToShow = categoryEmbeds[chunk[0].value[0].category][0];
		}

		await interaction.update({
			embeds: [embedToShow],
			components: components
		});
	}

	// Handle select menu interactions
	collector.on('collect', async (interaction) => {
		if (!interaction.customId.startsWith('help_category_select_')) return;

		if (interaction.user.id !== authorId) {
			await interaction.reply({
				content: lang.help_not_for_you,
				flags: [1 << 6]
			});
			return;
		}

		const selectedCategoryValue = interaction.values[0];
		selectedCategory = selectedCategoryValue;

		const matchedCategory = categories.find(
			cat => cat.name.toLowerCase().replace(/\s+/g, '_') === selectedCategoryValue
		);

		if (!matchedCategory) {
			await interaction.update({
				content: lang.var_unreachable_command,
				embeds: [],
				components: []
			});
			return;
		}

		// Update the current page to show the selected category
		await updateMessagePage(interaction, currentPageIndex, selectedCategoryValue);
	});

	// Handle button interactions for navigation
	buttonCollector.on('collect', async (interaction) => {
		if (interaction.user.id !== authorId) {
			await interaction.reply({
				content: lang.help_not_for_you,
				flags: [1 << 6]
			});
			return;
		}

		if (interaction.customId === 'help_prev_page' && currentPageIndex > 0) {
			currentPageIndex--;
			selectedCategory = undefined; // Reset selection when changing pages
			await updateMessagePage(interaction, currentPageIndex);
		} else if (interaction.customId === 'help_next_page' && currentPageIndex < categoryChunks.length - 1) {
			currentPageIndex++;
			selectedCategory = undefined; // Reset selection when changing pages
			await updateMessagePage(interaction, currentPageIndex);
		}
	});

	// Handle collector end
	collector.on('end', async () => {
		try {
			const chunk = categoryChunks[currentPageIndex];
			const disabledSelectMenuRows = createSelectMenuRows(chunk, lang, currentPageIndex, categoryChunks.length);

			// Disable all select menus
			disabledSelectMenuRows.forEach(row => {
				row.components.forEach(component => {
					if (component instanceof StringSelectMenuBuilder) {
						component.setDisabled(true);
					}
				});
			});

			const navigationRow = createNavigationRow(currentPageIndex, categoryChunks.length, lang);
			if (navigationRow) {
				// Disable navigation buttons
				navigationRow.components.forEach(button => {
					if (button instanceof ButtonBuilder) {
						button.setDisabled(true);
					}
				});
			}

			const components: any[] = [...disabledSelectMenuRows];
			if (navigationRow) {
				components.push(navigationRow);
			}

			await helpMessage.edit({ components });
		} catch (error) {
			console.error('Error disabling help menu:', error);
		}
	});

	// Also end button collector when main collector ends
	buttonCollector.on('end', () => {
		// Button collector cleanup is handled in the main collector end event
	});

	return { collector, buttonCollector };
}

export const command: Command = {
	name: 'h',
	description: 'help menu for og user lmao',
	description_localizations: {
		"fr": "Un menu de help tah les matrixé"
	},
	thinking: false,
	category: 'bot',
	type: "PREFIX_IHORIZON_COMMAND",
	permission: null,
	run: async (client: Client, interaction: Message, lang: LanguageData, args?: string[]) => {
		const categoryEmbeds: { [key: string]: EmbedBuilder[] } = {};

		const skidBot = {
			color: "#1519f0",
			footer: '© iHorizon 2025',
			botPrefix: (await guildPrefix(client, interaction.guildId!)).string,
			lang: await client.db.get(`${interaction.guildId}.GUILD.LANG.lang`) || "en-US"
		};

		const categories: CategoryData[] = [];

		for (const cat of client.category) {
			const descriptionKey = cat.options.description;
			const description = lang[descriptionKey as keyof LanguageData].toString();
			const placeholderKey = cat.options.placeholder;
			const placeholder = lang[placeholderKey as keyof LanguageData];

			const commands = client.content.filter(c =>
				c.category === cat.categoryName
				&& (c.messageCmd == 2 || c.messageCmd == 1)
				&& !(c.category === "ownihrz")
			);

			if (commands.length > 0) {
				const embedPages: EmbedBuilder[] = [];
				let suiteIndex = 0;
				let fieldCount = 0;
				let currentEmbed = new EmbedBuilder()
					.setTitle(placeholder.toString())
					.setDescription(lang.hybridcommands_embed_footer_text.replace('${botPrefix}', skidBot.botPrefix))
					.setColor(skidBot.color as ColorResolvable)
					.setFooter({ text: skidBot.footer });

				const suiteCategories: { name: string, commands: any[] }[] = [];
				let currentSuiteCommands: any[] = [];

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
							.setColor(skidBot.color as ColorResolvable)
							.setFooter({ text: skidBot.footer });
						fieldCount = 0;
					}

					let fields_name = `\`${skidBot.botPrefix}${cmd.prefixCmd || cmd.cmd}`;
					if (cmd.usage) fields_name += " " + cmd.usage;
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
						.setColor(skidBot.color as ColorResolvable)
						.setFooter({ text: skidBot.footer });

					suite.commands.forEach(cmd => {
						let fields_name = `\`${skidBot.botPrefix}${cmd.prefixCmd || cmd.cmd}`;
						if (cmd.usage) fields_name += " " + cmd.usage;
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

		const categoryChunks = chunkCategories(categories);
		const initialSelectMenuRows = createSelectMenuRows(categoryChunks[0], lang, 0, categoryChunks.length);
		const initialNavigationRow = createNavigationRow(0, categoryChunks.length, lang);

		const initialComponents: any[] = [...initialSelectMenuRows];
		if (initialNavigationRow) {
			initialComponents.push(initialNavigationRow);
		}

		const initialCategory = categoryChunks[0][0];
		const initialEmbeds = categoryEmbeds[initialCategory.value[0].category];

		const helpMessage = await (interaction.channel as BaseGuildTextChannel).send({
			embeds: [initialEmbeds[0]],
			components: initialComponents
		});

		setupHelpCategoryCollector(helpMessage, categoryEmbeds, categories, lang, interaction.member?.user.id!);
	}
};