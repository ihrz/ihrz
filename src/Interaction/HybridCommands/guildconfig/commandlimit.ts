/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Message,
	PermissionFlagsBits,
} from 'discord.js';

import { Command } from '../../../../types/command.js';
import { Option } from '../../../../types/option.js';
import { LanguageData } from '../../../../types/languageData.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';

function getCommandChoices(client: Client): string[] {
	const choices: string[] = [];

	const getCommandChoices = (command: Command | Option, parentName = '') => {
		const commandName = parentName ? `${parentName} ${command.name}` : command.name;
		choices.push(commandName);

		if (command.options) {
			command.options.forEach((option) => {
				if (option.type === ApplicationCommandOptionType.SubcommandGroup || option.type === ApplicationCommandOptionType.Subcommand) {
					getCommandChoices(option, commandName);
				}
			});
		}
	};

	client.commands.forEach((command: Command) => {
		getCommandChoices(command);
	});

	return choices;
}

function parseWindowTime(client: Client, value: string | null): number | null {
	if (!value) return null;

	const parsed = client.timeCalculator.to_ms(value);
	if (!parsed || parsed <= 0) return null;

	return parsed;
}

function formatRateLimit(limit: DatabaseStructure.CommandRateLimit, lang: LanguageData, client: Client): string {
	return lang.commandlimit_current_value
		.replace('${count}', limit.count.toString())
		.replace('${time}', client.timeCalculator.to_beautiful_string(limit.windowMs, lang));
}

function resolveCommand(client: Client, requestedCommand: string): Command | Option | undefined {
	const commandParts = requestedCommand.split(' ');

	if (commandParts.length === 1) {
		return client.commands.get(requestedCommand);
	}

	return client.subCommands.get(requestedCommand);
}

function buildListEmbed(client: Client, lang: LanguageData, entries: [string, DatabaseStructure.CommandRateLimit][]) {
	return new EmbedBuilder()
		.setColor('#11304c')
		.setTitle(lang.commandlimit_list_title)
		.setDescription(entries.map(([commandPath, limit]) =>
			lang.commandlimit_list_item
				.replace('${command}', commandPath)
				.replace('${limit}', formatRateLimit(limit, lang, client))
		).join('\n'));
}

export const command: Command = {
	name: 'commandlimit',

	description: 'Manage command rate limits',
	description_localizations: {
		fr: 'Gérer les limites de commandes'
	},

	options: [
		{
			name: 'action',
			description: 'Action to apply on command limits',
			description_localizations: {
				fr: 'Action à appliquer sur les limites de commandes'
			},
			type: ApplicationCommandOptionType.String,
			required: true,
			choices: [
				{
					name: 'Set',
					name_localizations: { fr: 'Définir' },
					value: 'set'
				},
				{
					name: 'Reset',
					name_localizations: { fr: 'Réinitialiser' },
					value: 'reset'
				},
				{
					name: 'List',
					name_localizations: { fr: 'Lister' },
					value: 'list'
				}
			],
			permission: null
		},
		{
			name: 'command',
			description: 'Search the command or subcommand',
			description_localizations: {
				fr: 'Rechercher la commande ou la sous-commande'
			},
			autocomplete: true,
			type: ApplicationCommandOptionType.String,
			required: false,
			permission: null
		},
		{
			name: 'count',
			description: 'Maximum number of uses in the window',
			description_localizations: {
				fr: 'Nombre maximum d\'utilisations dans la fenêtre'
			},
			type: ApplicationCommandOptionType.Integer,
			required: false,
			permission: null
		},
		{
			name: 'window-time',
			description: 'Time window like 10s, 1m, 5m, 1h',
			description_localizations: {
				fr: 'Fenêtre de temps comme 10s, 1m, 5m, 1h'
			},
			type: ApplicationCommandOptionType.String,
			required: false,
			permission: null
		}
	],

	thinking: true,
	category: 'guildconfig',
	type: ApplicationCommandType.ChatInput,
	permission: PermissionFlagsBits.Administrator,
	run: async (client: Client, interaction: ChatInputCommandInteraction<'cached'> | Message, lang: LanguageData, args) => {

		const action = interaction instanceof ChatInputCommandInteraction ?
			interaction.options.getString('action', true)
			: client.func.method.string(args!, 0);

		const requestedCommand = interaction instanceof ChatInputCommandInteraction ?
			interaction.options.getString('command')
			: client.func.method.string(args!, 1);

		if (action === 'list') {
			const limits = await client.db.get(`${interaction.guildId}.UTILS.COMMAND_LIMITS`) as DatabaseStructure.UtilsCommandLimitsData | undefined;

			if (!limits || Object.keys(limits).length === 0) {
				await client.func.method.interactionSend(interaction, { content: lang.commandlimit_list_empty });
				return;
			}

			const entries = Object.entries(limits).sort((a, b) => a[0].localeCompare(b[0]));
			await client.func.method.interactionSend(interaction, {
				embeds: [buildListEmbed(client, lang, entries)]
			});
			return;
		}

		if (!requestedCommand) {
			await client.func.method.interactionSend(interaction, { content: lang.commandlimit_missing_command });
			return;
		}

		const fetchedCommand = resolveCommand(client, requestedCommand);
		if (!fetchedCommand) {
			await client.func.method.interactionSend(interaction, { content: lang.var_unreachable_command });
			return;
		}

		if (action === 'reset') {
			const existingLimit = await client.db.get(`${interaction.guildId}.UTILS.COMMAND_LIMITS.${requestedCommand}`) as DatabaseStructure.CommandRateLimit | undefined;
			if (!existingLimit) {
				await client.func.method.interactionSend(interaction, { content: lang.commandlimit_reset_missing.replace('${command}', requestedCommand) });
				return;
			}

			await client.db.delete(`${interaction.guildId}.UTILS.COMMAND_LIMITS.${requestedCommand}`);
			await client.func.method.interactionSend(interaction, {
				content: lang.commandlimit_reset_success.replace('${command}', requestedCommand)
			});
			return;
		}

		const count = interaction instanceof ChatInputCommandInteraction ?
			interaction.options.getInteger('count')
			: client.func.method.number(args!, 2);

		const windowTimeInput = interaction instanceof ChatInputCommandInteraction ? interaction.options.getString('window-time')
			: client.func.method.string(args!, 3);

		const windowMs = parseWindowTime(client, windowTimeInput);

		if (!count || count <= 0 || !windowMs) {
			await client.func.method.interactionSend(interaction, { content: lang.commandlimit_invalid_value });
			return;
		}

		const payload: DatabaseStructure.CommandRateLimit = {
			count,
			windowMs
		};

		await client.db.set(`${interaction.guildId}.UTILS.COMMAND_LIMITS.${requestedCommand}`, payload);

		await client.func.method.interactionSend(interaction, {
			content: lang.commandlimit_set_success
				.replace('${command}', requestedCommand)
				.replace('${limit}', formatRateLimit(payload, lang, client))
		});
	},
	async autocomplete(client, interaction) {
		const focusedOption = interaction.options.getFocused(true);
		const choices: string[] = [];

		if (focusedOption.name === 'command') {
			choices.push(...getCommandChoices(client));
		}

		const filtered = choices.filter(choice =>
			choice.includes(focusedOption.value) || choice.startsWith(focusedOption.value)
		).slice(0, 25);

		await interaction.respond(
			filtered.map(choice => ({
				name: choice,
				value: choice
			})),
		);
	}
};
