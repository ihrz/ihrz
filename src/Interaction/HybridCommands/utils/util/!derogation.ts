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
	PermissionFlagsBits,
	PermissionsBitField,
} from 'discord.js';

import { LanguageData } from '../../../../../types/languageData.js';

import { SubCommand } from '../../../../../types/command.js';
import { role } from '../../../../core/functions/method.js';
import { DatabaseStructure } from '../../../../../types/database_structure.js';

const DEROGATION_ROLE_NAME = 'managed by iHorizon';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<'cached'> | Message, lang: LanguageData, args?: string[]) => {
		if (!interaction.member || !client.user || !interaction.guild || !interaction.channel) return;

		if (!interaction.guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)
			|| !interaction.guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
			await client.func.method.interactionSend(interaction, {
				content: lang.setjoinroles_var_perm_issue,
				flags: [1 << 6]
			});
			return;
		}

		const permissions = new PermissionsBitField(PermissionsBitField.All);
		permissions.remove(PermissionFlagsBits.Administrator);

		const baseInteraction = await client.func.method.interactionSend(interaction, {
			content: client.iHorizon_Emojis.Discord_Loading
		});

		let baseData = await client.db.get(`${interaction.guildId}.GUILD.UTILS.DEROGATION`) as DatabaseStructure.Derogation | null;

		let role = baseData ? (
			interaction.guild.roles.cache.get(baseData) || await interaction.guild.roles.fetch(baseData).catch(() => null)
		) : null;

		let created = false;

		if (!role) {
			role = await interaction.guild.roles.create({
				name: DEROGATION_ROLE_NAME,
				permissions,
				reason: `[Utils:Derogation] Created by ${interaction.member.user.tag}`,
			});
			created = true;

			await client.db.set(`${interaction.guild.id}.GUILD.UTILS.DEROGATION`, role.id);

		} else if (!role.permissions.equals(permissions)) {
			await role.setPermissions(permissions, `[Utils:Derogation] Sync base permissions requested by ${interaction.member.user.tag}`);
		}

		let updatedChannels = 0;
		let failedChannels = 0;
		let missingChannels = 0;

		for (const [, channel] of interaction.guild.channels.cache) {
			if (channel.isThread()) continue;

			const overwrite = channel.permissionOverwrites.cache.get(role.id);
			const allowedPermissions = new PermissionsBitField(overwrite?.allow.bitfield ?? 0n);
			const deniedPermissions = new PermissionsBitField(overwrite?.deny.bitfield ?? 0n);
			const missingPermissions = permissions.toArray().some(permission => !allowedPermissions.has(permission));
			const hasUnexpectedDeniedPermissions = deniedPermissions.toArray().some(permission => permissions.has(permission));
			const needsSync = !overwrite || !allowedPermissions.has(PermissionFlagsBits.ViewChannel) || missingPermissions || hasUnexpectedDeniedPermissions;

			if (!needsSync) continue;

			missingChannels++;

			try {
				await channel.permissionOverwrites.edit(role, {
					ViewChannel: true,
					...Object.fromEntries(permissions.toArray().map(permission => [permission, true]))
				}, {
					reason: `[Utils:Derogation] Sync fake admin perms for ${role.name}`,
				});

				updatedChannels++;
			} catch {
				failedChannels++;
			}
		}

		const content = created
			? lang.utils_derogation_created
			: missingChannels > 0
				? lang.utils_derogation_resynced
				: lang.utils_derogation_already_exists;

		await baseInteraction.edit({
			content: content
				.replace('${role}', role.toString())
				.replace('${updatedChannels}', updatedChannels.toString())
				.replace('${failedChannels}', failedChannels.toString())
				.replace('${missingChannels}', missingChannels.toString())
				.replace('${client.iHorizon_Emojis.Yes}', client.iHorizon_Emojis.Yes)
				.replace('${client.iHorizon_Emojis.No}', client.iHorizon_Emojis.No)
		});
	}
};