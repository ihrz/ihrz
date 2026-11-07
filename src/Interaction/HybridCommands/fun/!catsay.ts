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
	AttachmentBuilder,
	ChatInputCommandInteraction,
	Client,
	Message
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { axios } from "../../../core/functions/axios.js";
import { SubCommand } from "../../../../types/command.js";
import { catsay } from "../../../core/images.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCardWithFiles
} from "../../../core/modules/uiCard.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		const baseImg = (
			await axios.get(
				"https://api.thecatapi.com/v1/images/search?mime_types=jpg,png"
			)
		).data;

		if (
			(await client.db.get(`${interaction.guildId}.GUILD.FUN.states`)) ===
			"off"
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.fun_category_disable
			});
			return;
		}

		const opts = client.func.method.options(interaction, args);
		const text = opts.longString("text", 0)?.slice(0, 70);

		let imgs: AttachmentBuilder | undefined;

		try {
			let image = await catsay(baseImg[0].url, text || "");
			imgs = new AttachmentBuilder(image, { name: "catsay.png" });

			if (imgs) {
				await sendCardWithFiles(
					client,
					interaction,
					[imgs],
					buildCard({
						accent: ACCENT.neutral,
						emoji: client.iHorizon_Emojis.Sunglass,
						title: lang.catsay_card_title,
						images: ["attachment://catsay.png"],
						signature: await botSignature(
							client,
							interaction.guildId
						)
					})
				);
			}
		} catch {
			await client.func.method.interactionSend(interaction, {
				content: lang.fun_var_down_api
			});
		}

		return;
	}
};
