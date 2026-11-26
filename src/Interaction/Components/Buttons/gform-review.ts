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

// Accept / Refuse under an application card (Google Forms link in review mode): only the form's reviewers,
// administrators and the owner (googleForms.isReviewer). A refusal asks for an optional reason, sent to the
// applicant. The card's buttons are replaced by the decision (googleForms.decideReview).
import { ButtonInteraction, TextInputStyle } from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import { iHorizonModalResolve } from "../../../core/functions/modalHelper.js";
import {
	decideReview,
	getLink,
	isReviewer
} from "../../../core/modules/googleForms.js";

const EPHEMERAL = [1 << 6] as const;

export default async function (
	interaction: ButtonInteraction<"cached">,
	lang: LanguageData
) {
	const [, action, linkId, reviewId] = interaction.customId.split("%");
	const link = linkId
		? await getLink(interaction.client, interaction.guildId, linkId)
		: null;
	if (!link || !reviewId || (action !== "accept" && action !== "refuse")) {
		await interaction.reply({
			content: lang.gforms_review_not_found,
			flags: EPHEMERAL
		});
		return;
	}
	if (!isReviewer(interaction.member, link)) {
		await interaction.reply({
			content: lang.gforms_review_not_reviewer,
			flags: EPHEMERAL
		});
		return;
	}

	let reason: string | null = null;
	if (action === "refuse") {
		const submit = await iHorizonModalResolve(
			{
				customId: "gform_refuse_modal",
				title: lang.gforms_review_modal_title,
				deferUpdate: true,
				fields: [
					{
						customId: "reason",
						label: lang.gforms_review_modal_reason,
						style: TextInputStyle.Paragraph,
						required: false,
						maxLength: 1000
					}
				]
			},
			interaction
		);
		if (!submit) return;
		reason = submit.fields.getTextInputValue("reason") || null;
	} else {
		await interaction.deferUpdate();
	}

	try {
		await decideReview(interaction.client, {
			guild: interaction.guild,
			link,
			reviewId,
			actor: interaction.member,
			decision: action,
			reason
		});
	} catch (error) {
		const content =
			error === "already decided"
				? lang.gforms_review_already
				: error === "application not found"
					? lang.gforms_review_not_found
					: error === "forbidden: not a reviewer of this form"
						? lang.gforms_review_not_reviewer
						: String(error);
		await interaction
			.followUp({ content, flags: EPHEMERAL })
			.catch(() => null);
	}
}
