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

// Ticket transcripts kept in the database and shown on the web (ticket.ihorizon.org/<channelId>, gateway
// `ticket_host.rs`), next to the HTML file the bot still attaches. Written when a ticket is closed or deleted
// (the latest one wins: a reopened then closed ticket keeps its whole history).
//
// Table `ticket_transcripts`:
// - `{channelId}` = DatabaseStructure.TicketTranscriptSchema;
// - `G_{guildId}` = the server's transcript channel ids (HorizonDB has no scan: used to erase them when the bot
//   leaves the server, `deleteDatabaseDataOnGuildLeave.ts`). No dot in a key: a dot is a path.
// Who may read it is decided by the gateway: participants, holders of a staff role, server managers, bot owners.
import {
	ActionRowBuilder,
	AttachmentBuilder,
	ContainerBuilder,
	FileBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
	BaseGuildTextChannel,
	ButtonBuilder,
	ButtonStyle,
	Client,
	Collection,
	GuildMember,
	Message,
	OverwriteType,
	PermissionFlagsBits,
	User
} from "discord.js";

import { DatabaseStructure } from "../../../types/database_structure.js";
import { ticketTranscriptsTable } from "../database/tables.js";
import logger from "../logger.js";

export const TRANSCRIPT_MAX_MESSAGES = 5000;
const MAX_CONTENT = 4000;
const MAX_EMBEDS = 10;
const MAX_ATTACHMENTS = 10;
const MAX_INDEX = 5000;

/** The official transcript site, used by the production bot when TICKET_TRANSCRIPT_URL is not set. */
export const OFFICIAL_TRANSCRIPT_URL = "https://ticket.ihorizon.org";

/**
 * Where a transcript can be read, or null when this instance has no transcript site: TICKET_TRANSCRIPT_URL, else
 * the official site on the production branch (`client.version.env`) of a bot linked to a HorizonGateway
 * (HORIZON_API_TOKEN set): a self-hosted production bot has no transcript site, its links would lead nowhere.
 */
export function transcriptUrl(
	client: Client,
	channelId: string
): string | null {
	const configured = (client.config?.api?.ticketTranscriptUrl || "").trim();
	const official =
		client.version?.env === "production" && !!client.config?.api?.apiToken;
	const base = (
		configured || (official ? OFFICIAL_TRANSCRIPT_URL : "")
	).replace(/\/+$/, "");
	return /^https?:\/\//.test(base) ? `${base}/${channelId}` : null;
}

/** Link button to the transcript on the web (📜, the ticket transcript label). */
export function transcriptLinkRow(url: string, label: string) {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setStyle(ButtonStyle.Link)
			.setURL(url)
			.setEmoji("📜")
			.setLabel(label.slice(0, 80))
	);
}

/**
 * The transcript sent by private message (/ticket transcript, a deleted ticket's author), as Components V2: the
 * title and text, the ticket's channel, server and date, the HTML file, and the web transcript button when there
 * is one. `file` = the HTML attachment from DiscordJSTranscript.create, null when the web transcript replaces it
 * (production: links only, no HTML file sent to Discord).
 */
export function transcriptDmPayload(options: {
	channel: BaseGuildTextChannel;
	title: string;
	text: string;
	file: AttachmentBuilder | null;
	webUrl: string | null;
	buttonLabel: string;
}) {
	const { channel, title, text, file, webUrl, buttonLabel } = options;
	const guild = channel.guild;
	const now = Math.floor(Date.now() / 1000);
	const head = new TextDisplayBuilder().setContent(
		`## 📜 ${title}\n${text}\n-# <#${channel.id}> (#${channel.name}) · ${guild.name} · <t:${now}:f>`
	);
	const icon = guild.iconURL({ size: 128, extension: "png" });
	const container = new ContainerBuilder().setAccentColor(0x0014a8);
	if (icon) {
		container.addSectionComponents(
			new SectionBuilder()
				.addTextDisplayComponents(head)
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(icon))
		);
	} else {
		container.addTextDisplayComponents(head);
	}
	if (file) {
		container
			.addSeparatorComponents(new SeparatorBuilder())
			.addFileComponents(
				new FileBuilder().setURL(`attachment://${file.name}`)
			);
	}
	if (webUrl) {
		container.addActionRowComponents(
			transcriptLinkRow(webUrl, buttonLabel)
		);
	}
	return {
		components: [container],
		files: file ? [file] : [],
		flags: MessageFlags.IsComponentsV2 as const
	};
}

/** Every message of the channel, oldest first (at most TRANSCRIPT_MAX_MESSAGES, the latest ones). */
async function allMessages(
	channel: BaseGuildTextChannel
): Promise<{ messages: Message[]; truncated: boolean }> {
	const out: Message[] = [];
	let before: string | undefined;
	while (out.length < TRANSCRIPT_MAX_MESSAGES) {
		const page: Collection<string, Message> = await channel.messages.fetch({
			limit: 100,
			...(before ? { before } : {})
		});
		if (page.size === 0) break;
		out.push(...page.values());
		before = page.last()?.id;
		if (page.size < 100) break;
	}
	const truncated = out.length >= TRANSCRIPT_MAX_MESSAGES;
	return { messages: out.reverse(), truncated };
}

const userEntry = (
	u: User,
	member?: GuildMember | null
): DatabaseStructure.TicketTranscriptUser => ({
	username: u.username,
	globalName:
		member?.displayName && member.displayName !== u.username
			? member.displayName
			: (u.globalName ?? null),
	avatar: member?.avatar
		? `guilds/${member.guild.id}/users/${u.id}/avatars/${member.avatar}`
		: u.avatar
			? `avatars/${u.id}/${u.avatar}`
			: null,
	bot: u.bot,
	color: member && member.displayColor ? member.displayHexColor : null
});

function toMessage(m: Message): DatabaseStructure.TicketTranscriptMessage {
	return {
		id: m.id,
		authorId: m.author.id,
		type: m.type,
		content: m.content.slice(0, MAX_CONTENT),
		createdAt: m.createdTimestamp,
		editedAt: m.editedTimestamp ?? null,
		replyTo: m.reference?.messageId ?? null,
		attachments: [...m.attachments.values()]
			.slice(0, MAX_ATTACHMENTS)
			.map((a) => ({
				name: a.name,
				url: a.url,
				contentType: a.contentType ?? null,
				size: a.size,
				width: a.width ?? null,
				height: a.height ?? null
			})),
		embeds: m.embeds.slice(0, MAX_EMBEDS).map((e) => e.toJSON()),
		stickers: [...m.stickers.values()].map((s) => ({
			id: s.id,
			name: s.name,
			format: s.format
		}))
	};
}

/** Builds the transcript of a ticket channel as it is now. */
export async function buildTicketTranscript(
	channel: BaseGuildTextChannel,
	authorId: string,
	closedBy: User | null,
	reason: DatabaseStructure.TicketTranscriptSchema["reason"]
): Promise<DatabaseStructure.TicketTranscriptSchema> {
	const guild = channel.guild;
	const { messages, truncated } = await allMessages(channel);

	// Participants: the author, whoever wrote, and members added to the ticket.
	const participants = new Set<string>([authorId]);
	for (const m of messages)
		if (!m.author.bot && !m.system) participants.add(m.author.id);
	for (const o of channel.permissionOverwrites.cache.values()) {
		if (
			o.type === OverwriteType.Member &&
			o.allow.has(PermissionFlagsBits.ViewChannel) &&
			o.id !== guild.client.user.id
		)
			participants.add(o.id);
	}
	// Staff roles: roles let into this ticket (by its category or the panel), @everyone excluded.
	const staffRoles = [...channel.permissionOverwrites.cache.values()]
		.filter(
			(o) =>
				o.type === OverwriteType.Role &&
				o.id !== guild.id &&
				o.allow.has(PermissionFlagsBits.ViewChannel)
		)
		.map((o) => o.id);

	const userIds = new Set<string>(participants);
	for (const m of messages) {
		userIds.add(m.author.id);
		for (const u of m.mentions.users.keys()) userIds.add(u);
	}
	const members = await guild.members
		.fetch({ user: [...userIds].slice(0, 100) })
		.catch(() => new Collection<string, GuildMember>());

	// Staff, as the bot means it (ticketsManager.canManageTicket): administrators and whoever manages the channel.
	const staff = [...participants].filter((id) => {
		if (id === authorId) return false;
		const member = members.get(id);
		return (
			!!member &&
			(member.permissions.has(PermissionFlagsBits.Administrator) ||
				member
					.permissionsIn(channel.id)
					.has(PermissionFlagsBits.ManageChannels))
		);
	});

	const users: Record<string, DatabaseStructure.TicketTranscriptUser> = {};
	const roles: Record<string, { name: string; color: string | null }> = {};
	const channels: Record<string, { name: string }> = {};
	for (const m of messages) {
		users[m.author.id] ??= userEntry(
			m.author,
			members.get(m.author.id) ?? m.member
		);
		for (const u of m.mentions.users.values())
			users[u.id] ??= userEntry(u, members.get(u.id));
		for (const r of m.mentions.roles.values())
			roles[r.id] ??= {
				name: r.name,
				color: r.color ? r.hexColor : null
			};
		for (const c of m.mentions.channels.values())
			if ("name" in c && c.name) channels[c.id] ??= { name: c.name };
	}
	for (const id of [...participants, ...(closedBy ? [closedBy.id] : [])]) {
		if (users[id]) continue;
		const member = members.get(id);
		const user =
			member?.user ??
			(await guild.client.users.fetch(id).catch(() => null));
		if (user) users[id] = userEntry(user, member);
	}
	if (closedBy)
		users[closedBy.id] ??= userEntry(closedBy, members.get(closedBy.id));
	for (const id of staffRoles) {
		const r = guild.roles.cache.get(id);
		if (r)
			roles[id] ??= { name: r.name, color: r.color ? r.hexColor : null };
	}

	return {
		v: 1,
		guildId: guild.id,
		guildName: guild.name,
		guildIcon: guild.icon,
		channelId: channel.id,
		channelName: channel.name,
		authorId,
		openedAt: channel.createdTimestamp,
		closedAt: Date.now(),
		closedBy: closedBy?.id ?? null,
		reason,
		participants: [...participants],
		staff,
		staffRoles,
		users,
		roles,
		channels,
		messages: messages.map(toMessage),
		truncated
	};
}

/**
 * Saves the transcript of a ticket (close or delete) and returns its web address, or null (no transcript site, or
 * it could not be read). Never throws: a ticket closes even when the transcript fails.
 */
export async function saveTicketTranscript(
	channel: BaseGuildTextChannel,
	authorId: string,
	closedBy: User | null,
	reason: DatabaseStructure.TicketTranscriptSchema["reason"]
): Promise<string | null> {
	try {
		const doc = await buildTicketTranscript(
			channel,
			authorId,
			closedBy,
			reason
		);
		await ticketTranscriptsTable.set(channel.id, doc);
		const indexKey = `G_${channel.guildId}`;
		const index =
			((await ticketTranscriptsTable.get(indexKey)) as string[] | null) ??
			[];
		if (!index.includes(channel.id))
			await ticketTranscriptsTable.set(
				indexKey,
				[...index, channel.id].slice(-MAX_INDEX)
			);
		return transcriptUrl(channel.client, channel.id);
	} catch (error) {
		logger.warn(
			`[Tickets] transcript not saved for ${channel.id}: ${String(error)}`
		);
		return null;
	}
}

/** Erases every transcript of a server (the bot left it: deleteDatabaseDataOnGuildLeave.ts). */
export async function deleteGuildTranscripts(guildId: string): Promise<void> {
	const indexKey = `G_${guildId}`;
	const index =
		((await ticketTranscriptsTable.get(indexKey)) as string[] | null) ?? [];
	for (const id of index)
		await ticketTranscriptsTable.delete(id).catch(() => null);
	await ticketTranscriptsTable.delete(indexKey).catch(() => null);
}
