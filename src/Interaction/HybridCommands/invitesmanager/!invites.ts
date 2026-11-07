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
	ChatInputCommandInteraction,
	Client,
	GuildMember,
	Message
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";

import { DatabaseStructure } from "../../../../types/database_structure.js";
import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCard
} from "../../../core/modules/uiCard.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const opts = client.func.method.options(interaction, args);
		const member =
			(opts.member("member", 0) as GuildMember) || interaction.member;

		const baseData = (await client.db.get(
			`${interaction.guildId}.USER.${member.id}.INVITES`
		)) as DatabaseStructure.InvitesUserData | null;

		const e = client.iHorizon_Emojis;
		const count = (n: number | undefined) => `\`${n || 0}\``;
		// The accent colour is only known after a forced fetch.
		const user = await member.user.fetch().catch(() => member.user);
		const inviter = baseData?.BY?.inviter;

		await sendCard(
			client,
			interaction,
			buildCard({
				accent: user.accentColor ?? ACCENT.info,
				emoji: e.Stats,
				title: lang.invites_card_title,
				description: `${member}\n-# \`${member.user.username}\` · \`${member.id}\``,
				thumbnail: member.displayAvatarURL({ size: 256 }),
				fields: [
					{
						emoji: e.Crown,
						label: lang.invites_label_total,
						value: count(baseData?.invites)
					},
					{
						emoji: e.Yes,
						label: lang.invites_label_regular,
						value: count(baseData?.regular)
					},
					{
						emoji: e.No,
						label: lang.invites_label_left,
						value: count(baseData?.leaves)
					},
					{
						emoji: e.Sparkles,
						label: lang.invites_label_bonus,
						value: count(baseData?.bonus)
					}
				],
				blocks: [
					inviter &&
						`${e.Ticket_User} **${lang.invites_label_invited_by}** : <@${inviter}>${baseData?.BY?.invite ? ` · \`${baseData.BY.invite}\`` : ""}`
				],
				signature: await botSignature(client, interaction.guildId)
			})
		);
		return;
	}
};
