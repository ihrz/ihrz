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
	Message,
	CommandInteractionOptionResolver,
	ApplicationCommandOptionType,
	ButtonStyle,
	ButtonBuilder,
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';
import { CategoryData } from '../../../../types/category.js';
import { Command } from '../../../../types/command.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';

function createNavigationRow(currentPage: number, totalPages: number): ActionRowBuilder<ButtonBuilder> {
	const row = new ActionRowBuilder<ButtonBuilder>()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('first')
				.setLabel('<<')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(currentPage === 0),
			new ButtonBuilder()
				.setCustomId('previous')
				.setLabel('<')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(currentPage === 0),
			new ButtonBuilder()
				.setCustomId('page')
				.setLabel(`${currentPage + 1}/${totalPages}`)
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(true),
			new ButtonBuilder()
				.setCustomId('next')
				.setLabel('>')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(currentPage === totalPages - 1),
			new ButtonBuilder()
				.setCustomId('last')
				.setLabel('>>')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(currentPage === totalPages - 1)
		);
	return row;
}

async function updatePage(
	message: Message,
	embeds: EmbedBuilder[],
	currentPage: number,
	menuRows: ActionRowBuilder<any>[],
	navigationRow: ActionRowBuilder<ButtonBuilder>
) {
	const components = [...menuRows];
	if (embeds.length > 1) {
		components.push(navigationRow);
	}

	await message.edit({
		embeds: [embeds[currentPage]],
		components: components
	});
}

async function handleCategorySelect(
	i: StringSelectMenuInteraction,
	response: Message,
	categories: CategoryData[],
	menuRows: ActionRowBuilder<any>[],
	client: Client,
	lang: LanguageData,
	bot_prefix: { type: 'prefix' | 'mention'; string: string; },
	Commands: DatabaseStructure.UtilsPermsData | undefined
) {
	const previousCollector = (response as any).buttonCollector;
	if (previousCollector && !previousCollector.ended) {
		previousCollector.stop();
	}

	if (i.values[0] === "back") {
		const og_embed = new EmbedBuilder()
			.setColor('#001eff')
			.setDescription(lang.help_tip_embed
				.replaceAll('${client.user?.username}', i.client.user.username)
				.replaceAll('${client.iHorizon_Emojis.icon.Pin}', client.iHorizon_Emojis.icon.Pin)
				.replaceAll('${categories.length}', categories.length.toString())
				.replaceAll('${client.iHorizon_Emojis.badge.Slash_Bot}', client.iHorizon_Emojis.badge.Slash_Bot)
				.replaceAll('${client.content.filter(c => c.messageCmd === false).length}', i.client.content.length.toString())
				.replaceAll('${client.iHorizon_Emojis.icon.Crown_Logo}', client.iHorizon_Emojis.icon.Crown_Logo)
				.replaceAll('${config.owner.ownerid1}', client.owners[0])
				.replaceAll('${config.owner.ownerid2}', client.owners[1] ?? client.owners[0])
				.replaceAll('${client.iHorizon_Emojis.vc.Region}', client.iHorizon_Emojis.vc.Region)
				.replaceAll('${client.iHorizon_Emojis.badge.Slash_Bot}', client.iHorizon_Emojis.badge.Slash_Bot)
			)
			.setFooter(await client.func.displayBotName.footerBuilder(i))
			.setImage(`https://ihorizon.org/assets/img/banner/ihrz_${await client.db.get(`${i.guildId}.GUILD.LANG.lang`) || 'en-US'}.png`)
			.setThumbnail("attachment://footer_icon.png")
			.setTimestamp();
		await response.edit({
			embeds: [og_embed],
			components: menuRows
		});
		return;
	}

	const guildData = await client.db.get(`${i.guildId}.GUILD.LANG.lang`);
	const categoryIndex = parseInt(i.values[0]);
	const category = categories[categoryIndex];
	let embeds: EmbedBuilder[] = [];

	let currentEmbed = new EmbedBuilder()
		.setTitle(`${category.emoji}・${category.name}`)
		.setDescription(category.description)
		.setColor(category.color as ColorResolvable)
		.setFooter(await client.func.displayBotName.footerBuilder(i))
		.setThumbnail("attachment://footer_icon.png")
		.setTimestamp();

	let currentFieldsLength = 0;
	let currentFieldsCount = 0;

	for (const element of category.value) {
		let states = "";
		let cmdPrefix: string;

		var commandStates = Commands?.[element.cmd]

		if (typeof commandStates === 'number') {
			commandStates = {
				users: [],
				roles: [],
				level: commandStates
			}
		}

		if (commandStates) {
			if (commandStates.level > 0) {
				states = `${client.iHorizon_Emojis.icon.iHorizon_Lock} ${commandStates.level}`;
			} else {
				states = `${client.iHorizon_Emojis.icon.iHorizon_Unlock}`;
			}

			const hasRoles = commandStates.roles.length > 0;
			const hasUsers = commandStates.users.length > 0;

			if (hasRoles && hasUsers) {
				states = ` ${client.iHorizon_Emojis.icon.iHorizon_Lock} (${commandStates.roles.length} ${lang.var_roles}) (${commandStates.users.length} ${lang.var_member})`;
			} else if (hasRoles) {
				states = ` ${client.iHorizon_Emojis.icon.iHorizon_Lock} (${commandStates.roles.length} ${lang.var_roles})`;
			} else if (hasUsers) {
				states = ` ${client.iHorizon_Emojis.icon.iHorizon_Lock} (${commandStates.users.length} ${lang.var_member})`;
			}
		} else {
			states = `${client.iHorizon_Emojis.icon.iHorizon_Unlock}`;
		}

		var cleanedPrefixCommandName = element.prefixCmd || element.cmd;
		var prefixOrNot = `${client.iHorizon_Emojis.icon.Prefix_Command} ${bot_prefix.string}${cleanedPrefixCommandName} \n`;

		switch (element.messageCmd) {
			// Slash command
			case 0:
				cmdPrefix = `${states}\n・${client.iHorizon_Emojis.badge.Slash_Bot} **/${element.cmd}**`;
				break;
			// Message command
			case 1:
				cmdPrefix = bot_prefix.type === 'mention'
					? `${states}\n・${client.iHorizon_Emojis.icon.Prefix_Command} **@Ping-Me ${cleanedPrefixCommandName}**`
					: `${states}\n・${client.iHorizon_Emojis.icon.Prefix_Command} **${bot_prefix.string}${cleanedPrefixCommandName}**`;
				break;
			// Hybrid command
			case 2:
				cmdPrefix = bot_prefix.type === 'mention'
					? `${states}\n・${client.iHorizon_Emojis.icon.Prefix_Command} (@Ping-Me) ${element.prefixCmd}\n≠${client.iHorizon_Emojis.badge.Slash_Bot} **${element.prefixCmd}**`
					: `${states}\n・${prefixOrNot}・${client.iHorizon_Emojis.badge.Slash_Bot} **${element.cmd}**`;
				break;
			default:
				cmdPrefix = `${states}\n・**${element.cmd}**`;
		}

		const descValue = (guildData === "fr-ME" || guildData === "fr-FR")
			? element.desc_localized["fr"] : element.desc

		const newFieldLength = cmdPrefix.length + descValue.length;

		if (currentFieldsCount >= 8 || currentFieldsLength + newFieldLength > 4000) {
			embeds.push(currentEmbed);
			currentEmbed = new EmbedBuilder()
				.setTitle(`${category.emoji}・${category.name}`)
				.setDescription(category.description)
				.setColor(category.color as ColorResolvable)
				.setFooter(await client.func.displayBotName.footerBuilder(i))
				.setThumbnail("attachment://footer_icon.png")
				.setTimestamp();
			currentFieldsLength = 0;
			currentFieldsCount = 0;
		}

		currentEmbed.addFields({
			name: cmdPrefix,
			value: `-# **┖ ${descValue}**`,
			inline: false
		});

		currentFieldsLength += newFieldLength;
		currentFieldsCount++;
	}

	if (currentFieldsCount > 0) {
		embeds.push(currentEmbed);
	}

	let currentPage = 0;
	const navigationRow = createNavigationRow(currentPage, embeds.length);

	await response.edit({
		embeds: [embeds[currentPage]],
		components: [...menuRows, navigationRow]
	});

	const buttonCollector = response.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: 840_000
	});

	(response as any).buttonCollector = buttonCollector;

	buttonCollector.on('collect', async (interaction) => {
		if (interaction.user.id !== i.user.id) {
			await interaction.reply({
				content: lang.help_not_for_you,
				flags: [1 << 6]
			});
			return;
		}

		await interaction.deferUpdate();

		switch (interaction.customId) {
			case 'first':
				currentPage = 0;
				break;
			case 'previous':
				currentPage = Math.max(0, currentPage - 1);
				break;
			case 'next':
				currentPage = Math.min(embeds.length - 1, currentPage + 1);
				break;
			case 'last':
				currentPage = embeds.length - 1;
				break;
		}

		const updatedNavigationRow = createNavigationRow(currentPage, embeds.length);
		await updatePage(response, embeds, currentPage, menuRows, updatedNavigationRow);
	});

	buttonCollector.on('end', async () => {
		const disabledNavigationRow = createNavigationRow(currentPage, embeds.length);
		disabledNavigationRow.components.forEach(button => button.setDisabled(true));

		await response.edit({
			components: [...menuRows, disabledNavigationRow]
		});
	});
}

export const command: Command = {
	name: 'help',

	description: 'Get a list of all the commands!',
	description_localizations: {
		"fr": "Obtenir la liste de toute les commandes"
	},

	options: [
		{
			name: "command-name",

			description: "The command name you want information",
			description_localizations: {
				"fr": "La commandes sur laquelle vous voulez des info"
			},

			type: ApplicationCommandOptionType.String,
			required: false,
			permission: null
		}
	],
	category: 'bot',
	thinking: false,
	type: ApplicationCommandType.ChatInput,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		const categories: CategoryData[] = [];

		if (interaction instanceof ChatInputCommandInteraction) {
			var targetCommand = interaction.options.getString('command-name');
		} else {

			var targetCommand = client.func.method.string(args!, 0);
		};

		if (!targetCommand) {
			for (const cat of client.category) {
				const color = cat.categoryColor;

				const descriptionKey = cat.options.description;
				const description = lang[descriptionKey as keyof LanguageData].toString();

				const placeholderKey = cat.options.placeholder;
				const placeholder = lang[placeholderKey as keyof LanguageData];

				const commands = client.content.filter(c => c.category === cat.categoryName);

				categories.push({
					name: placeholder.toString(),
					value: commands,
					inline: false,
					description: description,
					color: color,
					emoji: cat.options.emoji
				});
			};

			categories.sort((a, b) => a.name.localeCompare(b.name));

			const selectMenus = [];
			const categoriesPerMenu = Math.ceil(categories.length / 2);
			const Commands = await client.db.get(`${interaction.guildId}.UTILS.PERMS`) as DatabaseStructure.UtilsPermsData | undefined;
			let index = 0;

			for (let i = 0; i < 2; i++) {
				const selectMenu = new StringSelectMenuBuilder()
					.setCustomId(`help-menu-${i + 1}`)
					.setPlaceholder(lang.help_select_menu);

				selectMenu.addOptions(
					new StringSelectMenuOptionBuilder()
						.setLabel(lang.help_back_to_menu)
						.setDescription(lang.help_back_to_menu_desc)
						.setValue("back")
						.setEmoji("⬅️")
				);

				const categoriesCalc = categories.slice(i * categoriesPerMenu, (i + 1) * categoriesPerMenu);
				categoriesCalc.forEach((category) => {
					selectMenu.addOptions(
						new StringSelectMenuOptionBuilder()
							.setLabel(category.name)
							.setDescription(
								lang.help_select_menu_fields_desc.replace(
									"${categories[index].value.length}",
									category.value.length.toString()
								)
							)
							.setValue(index.toString())
							.setEmoji(category.emoji)
					);
					index++;
				});

				selectMenus.push(selectMenu);
			}

			const rows = selectMenus.map((selectMenu, index) => {
				return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
			});

			let og_embed = new EmbedBuilder()
				.setColor('#001eff')
				.setDescription(lang.help_tip_embed
					.replaceAll('${client.user?.username}', interaction.client.user.username)
					.replaceAll('${client.iHorizon_Emojis.icon.Pin}', client.iHorizon_Emojis.icon.Pin)
					.replaceAll('${categories.length}', categories.length.toString())
					.replaceAll('${client.iHorizon_Emojis.badge.Slash_Bot}', client.iHorizon_Emojis.badge.Slash_Bot)
					.replaceAll('${client.content.filter(c => c.messageCmd === false).length}', client.content.length.toString())
					.replaceAll('${client.iHorizon_Emojis.icon.Crown_Logo}', client.iHorizon_Emojis.icon.Crown_Logo)
					.replaceAll('${config.owner.ownerid1}', client.owners[0])
					.replaceAll('${config.owner.ownerid2}', client.owners[1] ?? "")
					.replaceAll('${client.iHorizon_Emojis.vc.Region}', client.iHorizon_Emojis.vc.Region)
					.replaceAll('${client.iHorizon_Emojis.badge.Slash_Bot}', client.iHorizon_Emojis.badge.Slash_Bot)
				)
				.setFooter(await client.func.displayBotName.footerBuilder(interaction))
				.setImage(`https://ihorizon.org/assets/img/banner/ihrz_${await client.db.get(`${interaction.guildId}.GUILD.LANG.lang`) || 'en-US'}.png`)
				.setThumbnail("attachment://footer_icon.png")
				.setTimestamp();

			let response = await client.func.method.interactionSend(interaction, {
				embeds: [og_embed],
				components: rows,
				files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
			});

			let collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 840000 });
			let bot_prefix = await client.func.prefix.guildPrefix(client, interaction.guild?.id!);

			collector.on('collect', async (i: StringSelectMenuInteraction) => {
				if (i.user.id !== interaction.member?.user.id) {
					await i.reply({ content: lang.help_not_for_you, flags: [1 << 6] });
					return;
				}

				await i.deferUpdate();

				await handleCategorySelect(
					i,
					response,
					categories,
					rows,
					client,
					lang,
					bot_prefix,
					Commands
				);
			});

			collector.on('end', async (i) => {
				rows.forEach((comp, i) => {
					comp.components.forEach((component) => {
						component.setDisabled(true);
					});
				});

				await response.edit({ components: rows });
				return;
			});
		} else {
			let fetchCommand = client.commands.get(targetCommand) || client.message_commands.get(targetCommand);

			if (!fetchCommand) {
				await client.func.method.interactionSend(interaction, {
					content: client.iHorizon_Emojis.icon.No_Logo + " | " + lang.var_unreachable_command,
				});
				return;
			}

			await client.func.method.interactionSend(interaction, {
				embeds: [await client.func.method.createAwesomeEmbed(lang, fetchCommand, client, interaction)],
				flags: [1 << 6],
				files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
			});
		}
	},
	permission: null
};