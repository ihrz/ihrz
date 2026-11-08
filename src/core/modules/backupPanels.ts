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

// Shared parts of the /backup Components V2 panels.

import {
	ActionRowBuilder,
	Client,
	ContainerBuilder,
	Guild,
	Message,
	MessageComponentInteraction,
	MessageFlags,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder
} from "discord.js";

import type { LanguageData } from "../../../types/languageData.js";
import {
	BACKUP_COMPONENTS,
	type BackupComponent,
	type BackupFrequency,
	frequencyKey
} from "../backup/src/components.js";
import type { BackupReport } from "../backup/src/load.js";
import { cardPayload } from "./uiCard.js";

export const BACKUP_PANEL_TIMEOUT = 180_000;

export function componentEmoji(client: Client, c: BackupComponent): string {
	const emojis = client.iHorizon_Emojis;
	return {
		settings: emojis.Backup_Settings,
		roles: emojis.Backup_Roles,
		channels: emojis.Backup_Channels,
		permissions: emojis.Backup_Perms,
		emojis: emojis.Backup_Emojis,
		stickers: emojis.Backup_Stickers,
		bans: emojis.Backup_Bans,
		automod: emojis.Backup_Automod,
		events: emojis.Backup_Events,
		messages: emojis.Backup_Messages,
		members: emojis.Backup_Members
	}[c];
}

export function componentLabel(lang: LanguageData, c: BackupComponent): string {
	return {
		settings: lang.backup_component_settings,
		roles: lang.backup_component_roles,
		channels: lang.backup_component_channels,
		permissions: lang.backup_component_permissions,
		emojis: lang.backup_component_emojis,
		stickers: lang.backup_component_stickers,
		bans: lang.backup_component_bans,
		automod: lang.backup_component_automod,
		events: lang.backup_component_events,
		messages: lang.backup_component_messages,
		members: lang.backup_component_members
	}[c];
}

function componentDescription(lang: LanguageData, c: BackupComponent): string {
	return {
		settings: lang.backup_component_settings_desc,
		roles: lang.backup_component_roles_desc,
		channels: lang.backup_component_channels_desc,
		permissions: lang.backup_component_permissions_desc,
		emojis: lang.backup_component_emojis_desc,
		stickers: lang.backup_component_stickers_desc,
		bans: lang.backup_component_bans_desc,
		automod: lang.backup_component_automod_desc,
		events: lang.backup_component_events_desc,
		messages: lang.backup_component_messages_desc,
		members: lang.backup_component_members_desc
	}[c];
}

export function componentsLine(
	client: Client,
	lang: LanguageData,
	components: readonly BackupComponent[]
): string {
	return components
		.map((c) => `${componentEmoji(client, c)} ${componentLabel(lang, c)}`)
		.join(" · ");
}

export function componentsSelect(
	client: Client,
	lang: LanguageData,
	customId: string,
	selected: readonly BackupComponent[],
	available: readonly BackupComponent[] = BACKUP_COMPONENTS,
	disabled = false
) {
	return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId(customId)
			.setPlaceholder(lang.backup_select_placeholder)
			.setMinValues(1)
			.setMaxValues(available.length)
			.setDisabled(disabled)
			.addOptions(
				available.map((c) =>
					new StringSelectMenuOptionBuilder()
						.setValue(c)
						.setLabel(componentLabel(lang, c))
						.setDescription(componentDescription(lang, c))
						.setEmoji(componentEmoji(client, c))
						.setDefault(selected.includes(c))
				)
			)
	);
}

export function frequencyLabel(
	lang: LanguageData,
	frequency: BackupFrequency
): string {
	const key = frequencyKey(frequency);
	switch (key) {
		case "1d":
			return lang.backup_frequency_1d;
		case "3d":
			return lang.backup_frequency_3d;
		case "1w":
			return lang.backup_frequency_1w;
		case "2w":
			return lang.backup_frequency_2w;
		case "1m":
			return lang.backup_frequency_1m;
		case "3m":
			return lang.backup_frequency_3m;
		case "6m":
			return lang.backup_frequency_6m;
		default:
			return lang.backup_frequency_12m;
	}
}

export function reportLines(
	client: Client,
	lang: LanguageData,
	report: BackupReport
): string {
	return BACKUP_COMPONENTS.flatMap((c) => {
		const entry = report[c];
		if (!entry) return [];
		const line = lang.backup_load_report_line
			.replace("${emoji}", componentEmoji(client, c))
			.replace("${label}", componentLabel(lang, c))
			.replace("${okCount}", String(entry.ok));
		return [
			entry.failed
				? `${line} ${lang.backup_load_report_failed.replace("${failedCount}", String(entry.failed))}`
				: line
		];
	}).join("\n");
}

/** Owner always; administrators only after /backup manage opened it to them. */
export async function canUseBackups(
	client: Client,
	guild: Guild,
	userId: string
): Promise<boolean> {
	if (guild.ownerId === userId) return true;
	return (
		(await client.db.get(`${guild.id}.GUILD.BACKUP.onlyOwner`)) === false
	);
}

/** True when the click is from the panel's author; answers the others. */
export async function isAuthor(
	i: MessageComponentInteraction,
	authorId: string,
	lang: LanguageData
): Promise<boolean> {
	if (i.user.id === authorId) return true;
	await i.reply({
		content: lang.help_not_for_you,
		flags: [MessageFlags.Ephemeral]
	});
	return false;
}

export async function showCard(message: Message, card: ContainerBuilder) {
	await message
		.edit({
			...cardPayload(card),
			flags: [MessageFlags.IsComponentsV2]
		} as never)
		.catch(() => undefined);
}
