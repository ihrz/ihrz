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
	PermissionsBitField,
	Message,
	GuildMember,
	AutoModerationRuleTriggerType,
	Guild
} from "discord.js";
import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { UnifiedDatabase } from "../../core/database/types.js";
import { tempTable } from "../client/ready.js";
import { LanguageData } from "../../../types/languageData.js";

// Hosts whose links are allowed (subdomains included).
const WHITELIST = [
	"giphy.com",
	"tenor.com",
	"imgur.com",
	"gyazo.com",
	"ezgif.com",
	"reddit.com",
	"tumblr.com",
	"twitter.com",
	"flickr.com",
	"postimages.org",
	"imagebam.com",
	"x.com",
	"youtube.com",
	"github.com",
	"gitlab.com",
	"cdn.discordapp.com",
	"media.discordapp.net",
	"streamable.com",
	"files.catbox.moe",
	"0x0.st"
];

// Cheap pre-filter: anything that may be a link or an invite. Messages that
// do not match never cost a DB read.
const CANDIDATE_PATTERN = /https?:\/\/|\.gg\/|discord(?:app)?\.com\/invite/i;
const INVITE_PATTERN = /\.gg\/\S|discord(?:app)?\.com\/invite\/\S/i;
const LINK_PATTERN = /https?:\/\/[^\s<>]+/gi;
const AUTOMOD_REFRESH_MS = 10 * 60 * 1000;
const automodFetchedAt = new Map<string, number>();

/**
 * Apply sanctions to a member based on the configured punishment type
 * @param client Discord client
 * @param message Message that triggered the sanction
 * @param member Guild member to sanction
 * @param LOG Punishment configuration
 * @param table Database table for temporary data
 */
async function applySanction(
	client: Client,
	message: Message,
	member: GuildMember | null,
	LOG: DatabaseStructure.PunishPubSchema,
	table: UnifiedDatabase,
	lang: LanguageData
): Promise<void> {
	try {
		switch (LOG.punishementType) {
			case "ban":
				await message.guild!.members.ban(message.author, {
					reason: "Ban by PUNISHPUB"
				});
				break;
			case "kick":
				await message.guild!.members.kick(
					message.author,
					"Kick by PunishPub"
				);
				break;
			case "mute":
				if (!member) break;
				await member.timeout(40000, "Timeout by PunishPUB");
				await client.func.method.warnMember(
					message.guild?.members.me!,
					member,
					"Timeout by PunishPUB",
					lang
				);
				break;
		}

		// Clear the punishment data after successful sanction application
		await table.set(
			`${message.guildId}.PUNISH_DATA.${message.author.id}`,
			{}
		);
	} catch (error) {
		logger.err(
			`Failed to apply sanction to ${message.author.tag}: ${error}`
		);
	}
}

/**
 * Exact host match (or subdomain): `url.includes(domain)` let
 * `https://evil.com/?tenor.com` or `https://tenor.com.evil.com` through.
 */
function isWhitelisted(url: string): boolean {
	let host: string;
	try {
		host = new URL(url.replace(/[)\]}>.,!?'"]+$/, "")).hostname;
	} catch {
		return false;
	}
	return WHITELIST.some(
		(domain) => host === domain || host.endsWith(`.${domain}`)
	);
}

/**
 * Every link must be whitelisted (one allowed link no longer covers an invite
 * in the same message), invites are never allowed. No network request is made
 * on user-supplied URLs.
 */
function shouldSanctionMessage(content: string): boolean {
	if (INVITE_PATTERN.test(content)) return true;
	const links = content.match(LINK_PATTERN) ?? [];
	return links.some((link) => !isWhitelisted(link));
}

async function automodExemptRoleIds(guild: Guild): Promise<string[]> {
	const lastFetch = automodFetchedAt.get(guild.id) ?? 0;
	if (Date.now() - lastFetch > AUTOMOD_REFRESH_MS) {
		automodFetchedAt.set(guild.id, Date.now());
		await guild.autoModerationRules.fetch().catch(() => null);
	}
	const rule = guild.autoModerationRules.cache.find(
		(entry) => entry.triggerType === AutoModerationRuleTriggerType.Keyword
	);
	return rule ? [...rule.exemptRoles.keys()] : [];
}

export const event: BotEvent = {
	name: "messageCreate",
	run: async (client: Client, message: Message) => {
		// Any guild text channel, threads and voice chats included.
		if (
			!message.inGuild() ||
			!message.member ||
			message.author.bot ||
			message.webhookId ||
			!CANDIDATE_PATTERN.test(message.content)
		) {
			return;
		}

		if (
			message.member.permissions.any([
				PermissionsBitField.Flags.Administrator,
				PermissionsBitField.Flags.ManageGuild
			])
		)
			return;

		const content = message.content;
		if (!shouldSanctionMessage(content)) return;

		const type = (await client.db.get(
			`${message.guild.id}.GUILD.GUILD_CONFIG.antipub`
		)) as DatabaseStructure.GuildConfigSchema["antipub"];
		if (type !== "on") return;

		const member = message.member;
		const exemptRoles = await automodExemptRoleIds(message.guild);
		if (exemptRoles.some((id) => member.roles.cache.has(id))) return;

		const [LOG, flags, lang] = await Promise.all([
			client.db.get(
				`${message.guild.id}.GUILD.PUNISH.PUNISH_PUB`
			) as Promise<DatabaseStructure.PunishPubSchema | null>,
			tempTable.get(
				`${message.guild.id}.PUNISH_DATA.${message.author.id}.flags`
			) as Promise<number | null>,
			client.func.getLanguageData(message.guildId)
		]);

		try {
			await message.delete();
		} catch {}

		const newFlagsCount = (flags || 0) + 1;
		await tempTable.set(
			`${message.guild.id}.PUNISH_DATA.${message.author.id}`,
			{ flags: newFlagsCount }
		);

		// `>=`: lowering amountMax must not make sanctions unreachable.
		if (
			LOG?.state === "true" &&
			LOG.amountMax &&
			newFlagsCount >= LOG.amountMax
		) {
			await applySanction(client, message, member, LOG, tempTable, lang);
		}
	}
};
