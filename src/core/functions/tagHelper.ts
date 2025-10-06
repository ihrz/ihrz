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

import { ChatInputCommandInteraction, Message, EmbedBuilder, time } from "discord.js";
import { DatabaseStructure } from "../../../types/database_structure";
import { LanguageData } from "../../../types/languageData";

export default function generateTagInfoEmbed(interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, tag_id: string, tag: DatabaseStructure.TagInfo): EmbedBuilder {
	return new EmbedBuilder()
		.setTitle(`${lang.tag_name} #${tag_id}`)
		.setThumbnail(interaction?.guild!.iconURL() || interaction.member!.user.avatarURL() || interaction.client.user.displayAvatarURL())
		.setColor("Aqua")
		.setDescription(
			`${interaction.client.iHorizon_Emojis.Crown} > **${lang.var_author}:** <@${tag.createBy}>\n` +
			`${interaction.client.iHorizon_Emojis.Sparkles} > **${lang.tag_embed_created_at}:** ${time(new Date(tag.createTimestamp), "D")}\n` +
			`${interaction.client.iHorizon_Emojis.Timer} > **${lang.tag_embed_last_update}:** ${time(new Date(tag.lastUseTimestamp), "D")}\n` +
			`${interaction.client.iHorizon_Emojis.Timer} > **${lang.var_uses}:** ${"**`" + tag.uses + "`**"}\n` +
			`${interaction.client.iHorizon_Emojis.Boosting24Months_Badge} > **${lang.tag_embed_last_updated_by}:** ${tag.lastUseBy ? '<@' + tag.lastUseBy + '>' : lang.var_no_set}\n` +
			`${interaction.client.iHorizon_Emojis.Message_Commands} > **${lang.var_message}:** ** ${tag?.content || lang.var_no_set}**`
		);
}