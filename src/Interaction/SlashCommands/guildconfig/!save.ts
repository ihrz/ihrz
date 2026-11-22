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
	Client,
	ChatInputCommandInteraction,
	AttachmentBuilder,
	FileBuilder
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import * as apiUrlParser from "../../../core/functions/apiUrlParser.js";
import { encrypt } from "../../../core/functions/encryptDecryptMethod.js";

import { SubCommand } from "../../../../types/command.js";
import { cardPayload, notice } from "../../../core/modules/uiCard.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached">,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!interaction.member ||
			!client.user ||
			!interaction.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		if (
			client.version.env === "production" ||
			client.version.env === "dev"
		) {
			await interaction.editReply(
				cardPayload(
					notice("info", lang.guildconfig_config_save_check_dm)
				) as never
			);
			const link = apiUrlParser.HorizonGateway(
				apiUrlParser.GatewayMethod.ServerBackup
			);

			await interaction.user
				.send(
					cardPayload(
						notice(
							"info",
							`${lang.guildconfig_config_save_user_msg_2}${link}/${encrypt(client.config.api.apiToken, interaction.guildId)}/${encrypt(client.config.api.apiToken, Date.now().toString())}`
						)
					)
				)
				.catch(() => {})
				.then(() => {});
		} else {
			const dbGuild = await client.db.get(`${interaction.guildId}`);

			const buffer = Buffer.from(
				encrypt(
					client.config.api.apiToken,
					JSON.stringify({
						...dbGuild,
						guildId: interaction.guildId
					})
				),
				"utf-8"
			);
			const attachment = new AttachmentBuilder(buffer, {
				name: interaction.guildId + ".json"
			});

			await interaction.editReply(
				cardPayload(
					notice("info", lang.guildconfig_config_save_check_dm)
				) as never
			);

			await interaction.user
				.send({
					// V2: the file is shown by a file component.
					...cardPayload(
						notice(
							"info",
							lang.guildconfig_config_save_user_msg.replace(
								"${guildName}",
								interaction.guild.name
							)
						).addFileComponents(
							new FileBuilder().setURL(
								`attachment://${interaction.guildId}.json`
							)
						)
					),
					files: [attachment]
				})
				.catch(() => {})
				.then(() => {});
		}
		return;
	}
};
