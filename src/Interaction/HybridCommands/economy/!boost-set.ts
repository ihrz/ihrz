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
	PermissionsBitField,
	Role
} from "discord.js";
import { isSlash } from "../../../core/functions/method/source.js";
import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";

import { SubCommand } from "../../../../types/command.js";
import { sendCard } from "../../../core/modules/uiCard.js";
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

		if (
			(await client.db.get(`${interaction.guildId}.ECONOMY.disabled`)) ===
			true
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.economy_disable_msg.replace(
					"${authorId}",
					interaction.member.user.id
				)
			});
			return;
		}

		const opts = client.func.method.options(interaction, args);
		const role = opts.role("role", 0) as Role;
		const boost = isSlash(interaction)
			? parseInt(opts.string("boost", 1)!)
			: opts.number("boost", 1, true);

		let roleData = (await client.db.get(
			`${interaction.guildId}.ECONOMY.buyableRoles`
		)) as DatabaseStructure.EconomyModel["buyableRoles"];
		if (!roleData) {
			roleData = {};
		}

		// check if the roles has dangerous permissions
		const rolePermissions = new PermissionsBitField(role.permissions);
		const roleDangerousPermissions: string[] = [];

		for (const perm of client.func.method.getDangerousPermissions(lang)) {
			if (rolePermissions.has(perm.flag)) {
				roleDangerousPermissions.push(perm.name);
			}
		}

		// send message if the role doeesnt exist
		if (!roleData?.[role.id]) {
			await client.func.method.interactionSend(interaction, {
				content: lang.economy_boost_role_not_found
			});
			return;
		}

		roleData[role.id]["boost"] = boost;

		await client.db.set(
			`${interaction.guildId}.ECONOMY.buyableRoles`,
			roleData
		);

		await sendCard(
			client,
			interaction,
			await roleListCard(client, interaction.guildId!, roleData, lang, {
				title: lang.economy_boost_embed_title,
				description: lang.economy_boost_embed_desc
			})
		);

		await client.func.economyLogs.boostModifying(
			interaction.guild,
			interaction.member.user.id!,
			role.id,
			boost,
			lang
		);
	}
};
