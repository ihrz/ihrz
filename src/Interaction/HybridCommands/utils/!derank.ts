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
	GuildMember,
	Message
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	notice,
	sendCard
} from "../../../core/modules/uiCard.js";
import { derankPlan, derankRun } from "../../../core/modules/moderationOps.js";

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

		if (interaction instanceof ChatInputCommandInteraction) {
			var member = interaction.options.getMember("member") as GuildMember;
		} else {
			var member =
				client.func.method.member(interaction, args!, 0) ||
				interaction.member;
		}

		if (!member) {
			await client.func.method.interactionSend(interaction, {
				content: lang.perm_list_no_user
			});
			return;
		}

		const plan = derankPlan(interaction.member as GuildMember, member);

		if (!plan.ok) {
			await client.func.method.interactionSend(interaction, {
				content:
					plan.code === "target_above_author"
						? lang.utils_delrole_highter_or_egal_roles_msg.replace(
								"${emoji_Stop}",
								client.iHorizon_Emojis.Stop
							)
						: lang.derank_no_role
			});
			return;
		}
		const rolesToRemove = plan.roles;

		// Send immediate response
		await sendCard(
			client,
			interaction,
			notice(
				"info",
				`${client.iHorizon_Emojis.Discord_Loading} ${lang.derank_card_progress
					.replace("${count}", rolesToRemove.length.toString())
					.replace("${member}", member.toString())}`
			)
		);

		// Process role removal in batches asynchronously
		setImmediate(() =>
			derankRun(member, rolesToRemove).then(
				async ({ removed: good, failed: bad }) => {
					// Send final result when processing is complete
					const emojis = client.iHorizon_Emojis;
					await sendCard(
						client,
						interaction,
						buildCard({
							accent: bad > 0 ? ACCENT.warning : ACCENT.success,
							emoji: emojis.Minus,
							title: lang.derank_card_title,
							thumbnail: member.displayAvatarURL({ size: 256 }),
							fields: [
								{
									emoji: emojis.Ticket_User,
									label: lang.utils_label_member,
									value: member.toString()
								},
								{
									emoji: emojis.Yes,
									label: lang.derank_label_removed,
									value: `\`${good}\``
								},
								bad > 0 && {
									emoji: emojis.No,
									label: lang.utils_label_failed,
									value: `\`${bad}\``
								},
								{
									emoji: emojis.Crown,
									label: lang.utils_label_by,
									value: interaction.member!.toString()
								}
							],
							signature: await botSignature(
								client,
								interaction.guildId
							)
						})
					);
				}
			)
		);
	}
};
