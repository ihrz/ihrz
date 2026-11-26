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
	Message,
	GuildMember,
	PermissionsBitField,
	Role
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import promptYesOrNo from "../../../core/functions/awaitingResponse.js";

import { SubCommand } from "../../../../types/command.js";
import { cardPayload, sendCard } from "../../../core/modules/uiCard.js";
import { roleListCard } from "../../../core/modules/economyCards.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (
			!interaction.member ||
			!client.user ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const opts = client.func.method.options(interaction, args);
		const role = opts.role("role", 0) as Role;
		const amount = opts.number("amount", 1)!;

		const refusedReason =
			client.func.permissonsCalculator.getRefusedRoleReason(
				role,
				interaction.member as GuildMember,
				lang
			);

		if (refusedReason) {
			await client.func.method.interactionSend(interaction, {
				content: `${client.iHorizon_Emojis.Stop} ${refusedReason}`
			});
			return;
		}

		const roleData = await client.func.economyHelper.pruneBuyableRoles(
			interaction.guild
		);

		// check if the roles has dangerous permissions
		const rolePermissions = new PermissionsBitField(role.permissions);
		const roleDangerousPermissions: string[] = [];

		for (const perm of client.func.method.getDangerousPermissions(lang)) {
			if (rolePermissions.has(perm.flag)) {
				roleDangerousPermissions.push(perm.name);
			}
		}

		// send message if the role has dangerous permissions
		const prompted = roleDangerousPermissions.length > 0;
		if (prompted) {
			const stringDangerousPermissions = roleDangerousPermissions
				.map((x) => "`" + x + "`")
				.join(", ");

			const response = await promptYesOrNo(interaction, {
				content: lang.economy_role_add_prompt_dangerous.replace(
					"${stringDangerousPermissions}",
					stringDangerousPermissions
				),
				noButton: lang.var_no,
				yesButton: lang.var_yes,
				dangerAction: true
			});

			if (!response)
				return client.func.method.interactionSend(interaction, {
					content: lang.economy_role_add_canceled,
					components: []
				}); // if the user responds with no
		}

		if (Object.keys(roleData).length >= 20) {
			await client.func.method.interactionSend(interaction, {
				content: lang.economy_role_add_max_20_roles,
				components: []
			});
			return;
		}

		roleData[role.id] = {
			price: amount
		};

		await client.db.set(
			`${interaction.guildId}.ECONOMY.buyableRoles`,
			roleData
		);

		const card = await roleListCard(
			client,
			interaction.guildId!,
			roleData,
			lang,
			{
				title: lang.economy_boost_embed_title,
				description: lang.economy_boost_embed_desc
			}
		);
		// The confirmation prompt is a plain message, which can't become a
		// Components V2 card on edit: the card follows it instead.
		if (prompted && client.func.method.isSlash(interaction)) {
			await interaction.followUp(cardPayload(card));
		} else {
			await sendCard(client, interaction, card);
		}

		await client.func.economyLogs.roleAdd(
			interaction.guild,
			interaction.member.user.id,
			role.id,
			amount,
			lang
		);
	}
};
