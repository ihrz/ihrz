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
	ApplicationCommandType,
	Client,
	Message,
	MessageContextMenuCommandInteraction
} from "discord.js";

import { AnotherCommand } from "../../../types/anotherCommand.js";
import { LanguageData } from "../../../types/languageData.js";
import { handleMusicPlay } from "../../core/functions/musicPlay.js";

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const command: AnotherCommand = {
	name: "Play it in a voice channel",
	type: ApplicationCommandType.Message,
	thinking: true,
	permission: null,
	run: async (
		client: Client,
		interaction: MessageContextMenuCommandInteraction
	) => {
		const lang = (await client.func.getLanguageData(
			interaction.guildId
		)) as LanguageData;
		const msg = interaction.options.getMessage("message") as Message;

		if (msg.attachments.size >= 1) {
			const oversizedAttachment = msg.attachments.find(
				(attachment) => attachment.size > MAX_ATTACHMENT_SIZE_BYTES
			);

			if (oversizedAttachment) {
				await interaction.editReply({
					content: lang.p_attachment_too_large.replace(
						"${client.iHorizon_Emojis.No}",
						client.iHorizon_Emojis.No
					)
				});
				return;
			}
		}

		const queries =
			msg.attachments.size >= 1
				? msg.attachments.map((attachment) => attachment.url)
				: [msg.content];

		await handleMusicPlay({
			client,
			deleteAfterMs: 4000,
			interaction,
			lang,
			queries,
			respond: (payload) => interaction.editReply(payload)
		});
	}
};
