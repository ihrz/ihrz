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
	Message,
	PermissionsBitField
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { SubCommand } from "../../../../types/command.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData
	) => {
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		if (
			!interaction.guild.members.me?.permissions.has([
				PermissionsBitField.Flags.ManageRoles
			])
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.unmute_i_dont_have_permission.replace(
					"${client.iHorizon_Emojis.No}",
					client.iHorizon_Emojis.No
				)
			});
			return;
		}

		const mutedMembers = Array.from(
			interaction.guild.members.cache
				.filter((member) => member.isCommunicationDisabled())
				.values()
		);

		if (mutedMembers.length === 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.unmuteall_no_muted_members
			});
			return;
		}

		let unmuted = 0;

		for (const member of mutedMembers) {
			await member
				.timeout(null, lang.unmuteall_audit_reason)
				.then(() => unmuted++)
				.catch(() => { });
		}

		await client.func.method.interactionSend(interaction, {
			content: lang.unmuteall_command_work
				.replace("${unmuted}", unmuted.toString())
				.replace("${total}", mutedMembers.length.toString())
		});

		await client.func.ihorizon_logs(interaction, {
			title: lang.unmuteall_logs_embed_title,
			description: lang.unmuteall_logs_embed_description
				.replace("${interaction.user.id}", interaction.member.user.id)
				.replace("${unmuted}", unmuted.toString())
				.replace("${total}", mutedMembers.length.toString())
		});
	}
};
