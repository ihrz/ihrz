/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import {
	Client,
	ApplicationCommandOptionType,
	ActivityType,
	ApplicationCommandType,
	ChatInputCommandInteraction,
	Message
} from 'discord.js'

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';

export const command: Command = {
	name: 'presence',

	description: 'Set the presence of the bot !',
	description_localizations: {
		"fr": "Définir le status du bot"
	},

	options: [
		{
			name: 'type',
			type: ApplicationCommandOptionType.String,

			description: 'The type of activity you want!',
			description_localizations: {
				"fr": "Quelle type d'activité voulez-vous ?"
			},

			required: true,
			choices: [
				{
					name: 'Reset Status',
					value: 'reset'
				},
				{
					name: 'Streaming',
					value: 'streaming'
				},
				{
					name: 'Playing',
					value: 'playing'
				},
				{
					name: 'Listening',
					value: 'listening'
				},
				{
					name: 'Watching',
					value: 'watching'
				},
				{
					name: 'Custom',
					value: 'custom'
				},
				{
					name: 'Competing',
					value: 'competing'
				},
			],
			permission: null
		},
		{
			name: 'name',
			type: ApplicationCommandOptionType.String,

			description: 'The activity text',
			description_localizations: {
				"fr": "Le texte du status"
			},

			required: true,
			permission: null
		},
		{
			name: 'twitch_username',
			type: ApplicationCommandOptionType.String,

			description: 'The twitch account Username when you choose Streaming type',
			description_localizations: {
				"fr": "Le nom d'utilisateur du compte Twitch lorsque vous choisissez le type de streaming"
			},

			required: false,
			permission: null
		}
	],
	category: 'owner',
	thinking: true,
	permission: null,
	type: ApplicationCommandType.ChatInput,
	run: async (client: Client<boolean>, interaction: any, lang: LanguageData, args?: string[]): Promise<any> => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var action_1 = interaction.options.getString("type")!;
			var action_2 = interaction.options.getString("name")!;
			var action_3 = interaction.options.getString("twitch_username") || "anaissaraiva";
		} else {
			var action_1 = client.func.method.string(args!, 0)!;
			var action_2 = client.func.method.string(args!, 1)!;
			var action_3 = client.func.method.longString(args!, 2) || "anaissaraiva"
		};

		let table = client.db.table('OWNER');

		if (await table.get(`${interaction.member.user.id}.owner`)
			!== true) {
			await client.func.method.interactionSend(interaction, { content: lang.owner_not_owner });
			return;
		};

		switch (action_1) {
			case 'streaming':
				client.user?.setActivity(action_2, {
					type: ActivityType.Streaming,
					url: `https://www.twitch.tv/${action_3}`
				});
				await client.db.set(`BOT.PRESENCE`,
					{
						type: ActivityType.Streaming,
						twitch_username: action_3,
						name: action_2
					}
				);
				break;
			case 'watching':
				client.user?.setActivity(action_2,
					{
						type: ActivityType.Watching,
						url: "https://www.twitch.tv/anaissaraiva"
					}
				);
				await client.db.set(`BOT.PRESENCE`,
					{
						type: ActivityType.Watching,
						name: action_2
					}
				);
				break;
			case 'playing':
				client.user?.setActivity(action_2, {
					type: ActivityType.Playing,
					url: "https://www.twitch.tv/anaissaraiva"
				});
				await client.db.set(`BOT.PRESENCE`,
					{
						type: ActivityType.Playing,
						name: action_2
					}
				);
				break;
			case 'listening':
				client.user?.setActivity(action_2, {
					type: ActivityType.Listening,
					url: "https://www.twitch.tv/anaissaraiva"
				});
				await client.db.set(`BOT.PRESENCE`,
					{
						type: ActivityType.Listening,
						name: action_2,
						url: 'https://twitch.tv/anaissaraiva'
					}
				);
				break;
			case 'custom':
				client.user?.setActivity(action_2, {
					type: ActivityType.Custom,
					url: "https://www.twitch.tv/anaissaraiva"
				});
				await client.db.set(`BOT.PRESENCE`,
					{
						type: ActivityType.Custom,
						name: action_2,
						url: 'https://twitch.tv/anaissaraiva'
					}
				);
				break;
			case 'competing':
				client.user?.setActivity(action_2, {
					type: ActivityType.Competing,
					url: "https://www.twitch.tv/anaissaraiva"
				});
				await client.db.set(`BOT.PRESENCE`,
					{
						type: ActivityType.Competing,
						name: action_2,
						url: 'https://twitch.tv/anaissaraiva'
					}
				);
				break;
			default:
				await client.db.delete(`BOT.PRESENCE`);
				break;
		};

		await client.func.method.interactionSend(interaction, { content: `✅` });
		return;
	},
};