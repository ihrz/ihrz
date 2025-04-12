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
	ApplicationCommandOptionType,
	Client,
	Message,
	PermissionFlagsBits,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';
import * as apiUrlParser from '../../../core/functions/apiUrlParser.js';

export const command: Command = {
	name: 'securewebhook',
	aliases: ['securehook'],

	description: 'Secure webhook',
	description_localizations: {
		"fr": "Sécuriser une webhook à travers un PROXY iHorizon"
	},

	thinking: false,
	category: 'utils',
	type: "PREFIX_IHORIZON_COMMAND",

	options: [
		{
			name: "action",

			description: "Action to do",
			description_localizations: {
				"fr": "Action à faire"
			},

			type: ApplicationCommandOptionType.String,

			required: true,
			choices: [
				{
					name: "create",
					value: "create",
				},
				{
					name: "delete",
					value: "delete",
				},
				{
					name: "list",
					value: "list",
				},
			],

			permission: null,
		},
		{
			name: "input",
			description: "Webhook URL or webhook code",
			description_localizations: {
				"fr": "URL de la Webhook ou code de la Webhook"
			},

			type: ApplicationCommandOptionType.String,

			required: false,
			permission: null,
		}
	],

	permission: null,
	run: async (client: Client, message: Message<true>, lang: LanguageData, options?: string[]) => {

		let action = client.func.method.string(options!, 0);
		let input = client.func.method.string(options!, 1) || "";

		const matches = input.match(
			/https?:\/\/(?:ptb\.|canary\.)?discord\.com\/api(?:\/v\d{1,2})?\/webhooks\/(\d{17,19})\/([\w-]{68})/i,
		);

		if (action == "create") {
			if (!matches) {
				await client.func.method.channelSend(message, {
					content: lang.util_securewebhook_action_create,
				})
				return;
			}

			const req = await fetch(apiUrlParser.HorizonGateway(apiUrlParser.GatewayMethod.SecureWebhook), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					"adminKey": client.config.api.apiToken,
					"wanna": "create",
					"url": input,
					"userId": message.author.id
				})
			})

			const data = await req.json();

			if (data.status != "OK") {
				await client.func.method.channelSend(message, {
					content: lang.util_securewebhook_action_create_error.replace("${data.status}", data.error),
				})
				return;
			}

			await client.func.method.channelSend(message, {
				content: lang.util_securewebhook_action_create_ok
					.replace("${data.url}", data.url)
					.replace("${data.code}", data.code)
					.replace("${data.use}", data.use)
			})

		} else if (action == "delete") {
			const API_TABLE = client.db.table("API");

			const data = await API_TABLE.get("WH_SEC") || {};

			let datas = Object.values(data) || [];

			let filtered_wh = datas.filter((wh: any) => wh.userId === message.author.id) || []

			// Check if the webhook is owned by the user
			if (filtered_wh.length == 0) {
				await client.func.method.channelSend(message, {
					content: lang.util_securewebhook_action_delete_any,
				})
				return;
			}

			if (!filtered_wh.some((wh: any) => wh.code === input)) {
				await client.func.method.channelSend(message, {
					content: lang.util_securewebhook_action_delete_not_owner,
				})
				return;
			}


			const req = await fetch(apiUrlParser.HorizonGateway(apiUrlParser.GatewayMethod.SecureWebhook), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					"adminKey": client.config.api.apiToken,
					"wanna": "delete",
					"code": input,
					"userId": message.author.id
				})
			});

			if (req.status != 200) {
				await client.func.method.channelSend(message, {
					content: lang.util_securewebhook_action_delete_error,
				})
				return;
			}

			message.react('✅').catch(() => { client.func.method.interactionSend(message, { content: "✅" }) });

		} else if (action == "list") {
			const API_TABLE = client.db.table("API");

			const data = await API_TABLE.get("WH_SEC") || {};

			let datas = Object.values(data) || [];

			let filtered_wh = datas.filter((wh: any) => wh.userId === message.author.id);
			let webhook_base_url = `${client.config.api.HorizonGateway}/api/webhooks/{id}/{token}`;
			let all_whs = filtered_wh
				.map((wh: any) => `> [${wh.code}](${webhook_base_url.replace("{id}", wh.code).replace("{token}", wh.token)}) - ${wh.use} use(s)`)
				.join("\n");

			await client.func.method.channelSend(message, {
				content: lang.util_securewebhook_actiom_list_ok + all_whs
			})
		}
	},
};
