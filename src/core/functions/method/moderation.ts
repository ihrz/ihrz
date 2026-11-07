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
	GuildMember,
	EmbedBuilder,
	BaseGuildTextChannel,
	PermissionFlagsBits,
	Guild,
	time,
	ButtonBuilder,
	ActionRowBuilder,
	PermissionsBitField,
	ButtonStyle
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";
import { generatePassword } from "../random.js";

// A member, or only an id when the member is not cached (e.g. a nuke bot).
export type PunishTarget = GuildMember | { guild: Guild; id: string };

async function resolvePunishTarget(
	target: PunishTarget
): Promise<GuildMember | null> {
	if (target instanceof GuildMember) return target;
	return target.guild.members.fetch(target.id).catch(() => null);
}

export async function derank(
	target: PunishTarget,
	reason?: string
): Promise<void> {
	const member = await resolvePunishTarget(target);
	const me = member?.guild.members.me;
	if (!member || !me) return;

	const auditReason = reason || "Protection";
	const ceiling = me.roles.highest.position;
	const everyoneId = member.guild.id;
	const roles = member.roles.cache.filter((role) => role.id !== everyoneId);
	// Managed roles and roles above the bot cannot be removed.
	const kept = roles.filter(
		(role) => role.managed || role.position >= ceiling
	);

	const tasks: Promise<unknown>[] = [];
	if (kept.size !== roles.size) {
		tasks.push(member.roles.set([...kept.keys()], auditReason));
	}

	// A bot keeps its own integration role: strip that role's permissions.
	const integrationRole = roles.find(
		(role) => role.tags?.botId === member.id && role.position < ceiling
	);
	if (integrationRole) {
		tasks.push(
			integrationRole.setPermissions(
				PermissionFlagsBits.ViewChannel,
				auditReason
			)
		);
	}

	await Promise.allSettled(tasks);
}

const PROTECT_MUTE_DURATION = 10 * 60 * 1000;

export async function punish(
	data: DatabaseStructure.ProtectionData,
	user: PunishTarget,
	reason?: string,
	ruleKey?: string
): Promise<void> {
	const rule = ruleKey ? data?.[ruleKey] : undefined;
	const ruleSanction =
		rule && typeof rule === "object" ? rule.sanction : undefined;

	const guild = user.guild;
	const auditReason = reason || "Protect!";
	// When the sanction itself is refused (hierarchy), still disarm the user.
	const fallback = () => derank(user, auditReason).catch(() => {});

	switch (ruleSanction || data?.["SANCTION"]) {
		case "simply":
			return;
		case "simply+derank":
			await derank(user, auditReason);
			return;
		case "simply+ban":
			await guild.bans
				.create(user.id, { reason: auditReason })
				.catch(fallback);
			return;
		case "simply+kick":
			// Derank first: otherwise the role saver stores the roles on leave
			// and hands them back on rejoin, undoing the sanction.
			await derank(user, auditReason).catch(() => {});
			await guild.members.kick(user.id, auditReason).catch(() => {});
			return;
		case "simply+mute": {
			const mute = () =>
				guild.members.edit(user.id, {
					communicationDisabledUntil:
						Date.now() + PROTECT_MUTE_DURATION,
					reason: auditReason
				});
			// Administrators cannot be timed out: derank first, then retry.
			await mute().catch(async () => {
				await fallback();
				await mute().catch(() => {});
			});
			return;
		}
		default:
			return;
	}
}

async function sendWarnLog(
	author: GuildMember,
	member: GuildMember,
	reason: string,
	lang: LanguageData
): Promise<void> {
	const guild = member.guild;
	const embed = new EmbedBuilder()
		.setColor("#bf0bb9")
		.setTitle(lang.warn_logEmbed_title)
		.setDescription(
			lang.warn_logEmbed_desc
				.replace("${author}", author.toString())
				.replace("${member}", member.toString())
				.replace("${reason}", reason)
		);

	const sendTo = async (
		channel: BaseGuildTextChannel | null | undefined
	): Promise<boolean> => {
		if (!channel || !channel.isTextBased()) return false;

		try {
			await channel.send({ embeds: [embed] });
			return true;
		} catch {
			return false;
		}
	};

	if (client.func.hasIhorizonLogs(guild)) {
		const ihorizonLogsChannel = guild.channels.cache.find(
			(channel) =>
				channel.name.includes("ihorizon-logs") && channel.isTextBased()
		) as BaseGuildTextChannel | undefined;

		if (await sendTo(ihorizonLogsChannel)) return;
	}

	const modsChannel = guild.channels.cache.find(
		(channel) => channel.name.includes("mods") && channel.isTextBased()
	) as BaseGuildTextChannel | undefined;

	if (await sendTo(modsChannel)) return;

	const moderationLogsId = (await guild.client.db.get(
		`${guild.id}.GUILD.SERVER_LOGS.moderation`
	)) as string | null;

	if (!moderationLogsId) return;

	const moderationLogsChannel = guild.channels.cache.get(moderationLogsId) as
		BaseGuildTextChannel | undefined;

	await sendTo(moderationLogsChannel);
}

export async function warnMember(
	author: GuildMember,
	member: GuildMember,
	reason: string,
	lang: LanguageData
): Promise<string> {
	const warnObject: DatabaseStructure.WarnsData = {
		timestamp: Date.now(),
		reason: reason,
		authorID: author.user.id,
		id: generatePassword({ length: 8, lowercase: false, numbers: true })
	};

	await member.client.db.push(
		`${member.guild.id}.USER.${member.user.id}.WARNS`,
		warnObject
	);

	member
		.send({
			embeds: [
				new EmbedBuilder()
					.setColor("Red")
					.setTitle(
						lang.global_warn_embed_title.replace(
							"${id}",
							warnObject.id
						)
					)
					.setDescription(
						lang.global_warn_embed_desc
							.replace("${reason}", warnObject.reason)
							.replace("${authorUsername}", author.user.username)
							.replace(
								"${authorRolesHighestName}",
								author.roles.highest.name
							)
							.replace(
								"${time}",
								time(new Date(warnObject.timestamp))
							)
					)
			],
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					new ButtonBuilder()
						.setStyle(ButtonStyle.Secondary)
						.setCustomId(`guild-id-${author.guild.id}`)
						.setDisabled(true)
						.setLabel(
							lang.global_warn_component_button_label.replace(
								"${authorGuildName}",
								author.guild.name
							)
						)
				)
			]
		})
		.catch(() => null);

	await sendWarnLog(author, member, reason, lang).catch(() => {});

	return warnObject.id;
}

export function getDangerousPermissions(lang: LanguageData): {
	flag: bigint;
	name: string;
}[] {
	const dangerousPermissions = [
		{
			flag: PermissionsBitField.Flags.Administrator,
			name: lang.setjoinroles_var_perm_admin
		},
		{
			flag: PermissionsBitField.Flags.ManageGuild,
			name: lang.setjoinroles_var_perm_manage_guild
		},
		{
			flag: PermissionsBitField.Flags.ManageRoles,
			name: lang.setjoinroles_var_perm_manage_role
		},
		{
			flag: PermissionsBitField.Flags.MentionEveryone,
			name: lang.setjoinroles_var_perm_use_mention
		},
		{
			flag: PermissionsBitField.Flags.BanMembers,
			name: lang.setjoinroles_var_perm_ban_members
		},
		{
			flag: PermissionsBitField.Flags.KickMembers,
			name: lang.setjoinroles_var_perm_kick_members
		},
		{
			flag: PermissionsBitField.Flags.ManageWebhooks,
			name: lang.setjoinroles_var_perm_manage_webhooks
		},
		{
			flag: PermissionsBitField.Flags.ManageChannels,
			name: lang.setjoinroles_var_perm_manage_channels
		},
		{
			flag: PermissionsBitField.Flags.ManageGuildExpressions,
			name: lang.setjoinroles_var_perm_manage_expression
		},
		{
			flag: PermissionsBitField.Flags.ViewCreatorMonetizationAnalytics,
			name: lang.setjoinroles_var_perm_view_monetization_analytics
		}
	];

	return dangerousPermissions;
}
