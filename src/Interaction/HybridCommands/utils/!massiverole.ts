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

import { SubCommand } from "../../../../types/command.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	notice,
	sendCard
} from "../../../core/modules/uiCard.js";
import {
	MASSROLE_MAX_MEMBERS,
	massRolePlan,
	massRoleRun
} from "../../../core/modules/moderationOps.js";

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
		const action = opts.string("action", 0);
		const role = opts.role("role", 1);

		let a: number = 0;
		let s: number = 0;
		let e: number = 0;

		const emojis = client.iHorizon_Emojis;
		const guild = interaction.guild;
		const author = interaction.member;

		if (guild.memberCount >= MASSROLE_MAX_MEMBERS) {
			await client.func.method.interactionSend(interaction, {
				content: lang.massiverole_too_much_member
			});
			return;
		}

		if (role) {
			const refusedReason =
				client.func.permissonsCalculator.getRefusedRoleReason(
					role,
					author,
					lang
				);

			if (refusedReason) {
				await client.func.method.interactionSend(interaction, {
					content: `${emojis.Stop} ${refusedReason}`
				});
				return;
			}
		}

		// The progress line and the result are both Components V2, so the
		// message can be edited from one to the other.
		const ogInteraction = await sendCard(
			client,
			interaction,
			notice("info", emojis.Discord_Loading)
		);

		const resultCard = async (adding: boolean) =>
			buildCard({
				accent: e > 0 ? ACCENT.warning : role?.color || ACCENT.success,
				emoji: adding ? emojis.Plus : emojis.Minus,
				title: adding
					? lang.massiverole_card_title_add
					: lang.massiverole_card_title_sub,
				thumbnail: guild.iconURL(),
				fields: [
					{
						emoji: emojis.Ticket_Role,
						label: lang.utils_label_role,
						value: role?.toString()!
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
						label: adding
							? lang.massiverole_label_already
							: lang.massiverole_label_without,
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
						value: author.toString()
					}
				],
				signature: await botSignature(client, interaction.guildId)
			});

		const showResult = async (adding: boolean) => {
			await ogInteraction.edit({
				components: [await resultCard(adding)]
			});
		};

		if (action === "add" || action === "sub") {
			const adding = action === "add";
			try {
				const plan = await massRolePlan(author, role as Role, adding);
				if (!plan.ok && plan.code === "busy") {
					await ogInteraction.edit({
						components: [
							notice("info", lang.action_mass_job_running)
						]
					});
					return;
				}
				if (!plan.ok) throw new Error(plan.code);
				// The guild's mass-role slot is held from here: never return
				// without starting the run, which frees it when it ends.
				const run = massRoleRun(
					plan.members,
					role as Role,
					adding,
					plan.release
				);
				const membersToProcess = plan.members;

				// Members that already have the role (add) or never had it (sub)
				s = plan.skipped;

				await ogInteraction.edit({
					components: [
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
					]
				});

				// Processed in batches in the background.
				void run
					.then(async (r) => {
						a = r.changed;
						e = r.failed;
						// Send final result when processing is complete
						await showResult(adding);
					})
					.catch(() => {});
				return;
			} catch (error) {}

			await showResult(adding);
			return;
		}

		return;
	}
};
