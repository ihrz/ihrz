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

import { Client, ChatInputCommandInteraction, Role, Message } from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { processBatchAsync } from "../../../core/functions/batchProcessor.js";

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	notice,
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
		const action_1 = opts.string("action", 0);
		const part_of_nickname = opts.string("nickname", 1)?.toLowerCase();
		const role = opts.role("role", 2);

		if (!part_of_nickname || !role) return;
		let a: number = 0;
		let s: number = 0;
		let e: number = 0;

		if (action_1 === "add" || action_1 === "sub") {
			const adding = action_1 === "add";
			const emojis = client.iHorizon_Emojis;
			try {
				const members = await interaction.guild.members.fetch();
				const membersToProcess = Array.from(members.values()).filter(
					(member) =>
						(member.user.globalName
							?.toLowerCase()
							.includes(part_of_nickname!) ||
							(member.nickname &&
								member.nickname
									.toLowerCase()
									.includes(part_of_nickname!))) &&
						member.roles.cache.has(role?.id!) !== adding
				);

				// Count members that were skipped
				s = members.size - membersToProcess.length;

				// Send immediate response
				await sendCard(
					client,
					interaction,
					notice(
						"info",
						`${emojis.Discord_Loading} ${(adding
							? lang.massiverole_card_progress_add
							: lang.massiverole_card_progress_sub
						).replace(
							"${count}",
							membersToProcess.length.toString()
						)}`
					)
				);

				// Process in batches asynchronously
				processBatchAsync(
					membersToProcess,
					async (member) => {
						try {
							if (adding) {
								await member.roles.add(
									role as Role,
									"[NickRole] Module"
								);
							} else {
								await member.roles.remove(
									role!.id,
									"[NickRole] Module"
								);
							}
							a++;
							return true;
						} catch {
							e++;
							return false;
						}
					},
					{ batchSize: 10, delay: 150 },
					async () => {
						await sendCard(
							client,
							interaction,
							buildCard({
								accent:
									e > 0
										? ACCENT.warning
										: role?.color || ACCENT.success,
								emoji: emojis.Nametag,
								title: adding
									? lang.massiverole_card_title_add
									: lang.massiverole_card_title_sub,
								thumbnail: interaction.guild!.iconURL(),
								fields: [
									{
										emoji: emojis.Ticket_Role,
										label: lang.utils_label_role,
										value: role?.toString()!
									},
									{
										emoji: emojis.Search,
										label: lang.utils_label_name_filter,
										value: `\`${part_of_nickname}\``
									},
									{
										emoji: emojis.Yes,
										label: adding
											? lang.massiverole_label_added
											: lang.massiverole_label_removed,
										value: `\`${a}\``
									},
									{
										emoji: emojis.Ticket_User,
										label: lang.nickrole_label_skipped,
										value: `\`${s}\``
									},
									{
										emoji: emojis.No,
										label: lang.utils_label_failed,
										value: `\`${e}\``
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
				);
				return;
			} catch (error) {}
		}
		return;
	}
};
