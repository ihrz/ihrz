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
	BaseGuildTextChannel,
	Client,
	ContainerBuilder,
	Message,
	MessageFlags,
	TextDisplayBuilder
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { Command } from "../../../../types/command.js";
import { metasTable } from "../../../Events/client/ready.js";

export const command: Command = {
	name: "status-embed",
	aliases: [],

	description: "Make a status embed about iHorizon",
	description_localizations: {
		fr: "Créer un embed par rapport à iHorizon",
		ja: "iHorizonのステータス埋め込みを作成",
		ru: "Создать эмбед статуса iHorizon",
		"es-ES": "Hacer un embed de estado sobre iHorizon"
	},

	thinking: false,
	category: "owner",
	type: "PREFIX_IHORIZON_COMMAND",

	permission: null,
	run: async (
		client: Client,
		message: Message<true>,
		lang: LanguageData,
		options?: string[]
	) => {
		if (await client.func.ownerHelper.isBotOwner(message.author.id)) {
			const res = await client.func.method.channelSend(
				message.channel as BaseGuildTextChannel,
				{
					components: [
						new ContainerBuilder()
							.setAccentColor(0xff40c4)
							.addTextDisplayComponents(
								new TextDisplayBuilder().setContent(
									lang.status_panel_loading
								)
							)
					],
					flags: [MessageFlags.IsComponentsV2]
				}
			);

			await metasTable.set(`MISC.statusEmbed.${message.guildId}`, {
				message_id: res.id,
				guild_id: res.guildId,
				channel_id: message.channelId
			});

			await client.infrastructureMonitoring.refresh();
		} else return;
	}
};
