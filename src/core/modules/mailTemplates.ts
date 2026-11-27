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
	iHorizonAsset,
	iHorizonAssetURL
} from "../functions/iHorizonAssets.js";

/**
 * The emails iHorizon sends (to its owner: started, added to / removed from a server), as clean HTML that
 * holds in email clients — tables and inline styles (Gmail drops <style> rules it doesn't like, Outlook
 * ignores flex/grid), a 600px card, a coloured band per event — plus a plain text version from the same data.
 * Every value is escaped: guild and user names come from Discord, anyone chooses them. Only https:// links
 * become links.
 */

export interface MailContent {
	subject: string;
	text: string;
	html: string;
}

export interface MailField {
	label: string;
	value: string;
	/** Makes the value a link (https only). */
	href?: string | null;
}

export type MailKind = "success" | "danger" | "info";

export interface MailOptions {
	kind: MailKind;
	subject: string;
	/** The inbox preview line (hidden in the body). */
	preheader: string;
	title: string;
	intro: string;
	fields: MailField[];
	/** A server icon or an avatar (https only), shown next to the title. */
	iconUrl?: string | null;
	button?: { label: string; url: string } | null;
	botName: string;
	/** Unix ms, shown in the footer. */
	at: number;
}

const ACCENT: Record<MailKind, string> = {
	success: "#23a55a",
	danger: "#e5484d",
	info: "#5865f2"
};
const LOGO = iHorizonAssetURL(iHorizonAsset.Logo);
const SITE = "https://ihorizon.org";
const DISCORD = "https://discord.gg/ihorizon";

export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** A link only for https:// URLs (a javascript: or data: link never reaches an inbox). */
export function safeUrl(url: string | null | undefined): string | null {
	return typeof url === "string" && /^https:\/\/[^\s"'<>]+$/i.test(url)
		? url
		: null;
}

/** A readable UTC date ("26 Nov 2026, 21:04 UTC"), the same for every reader. */
export function mailDate(ms: number): string {
	return (
		new Intl.DateTimeFormat("en-GB", {
			dateStyle: "medium",
			timeStyle: "short",
			timeZone: "UTC"
		}).format(new Date(ms)) + " UTC"
	);
}

export function renderMail(o: MailOptions): MailContent {
	const e = escapeHtml;
	const accent = ACCENT[o.kind];
	const icon = safeUrl(o.iconUrl);
	const button = o.button
		? { ...o.button, url: safeUrl(o.button.url) }
		: null;
	const date = mailDate(o.at);

	const rows = o.fields
		.map((f, i) => {
			const href = safeUrl(f.href);
			const value = href
				? `<a href="${e(href)}" style="color:${accent};text-decoration:none;font-weight:600;">${e(f.value)}</a>`
				: e(f.value);
			const border = i === 0 ? "" : "border-top:1px solid #eceef5;";
			return `<tr>
<td class="ih-label${i === 0 ? "" : " ih-sep"}" style="${border}padding:12px 0;width:38%;font-size:13px;color:#6b7080;vertical-align:top;">${e(f.label)}</td>
<td class="ih-value${i === 0 ? "" : " ih-sep"}" style="${border}padding:12px 0;font-size:14px;color:#1d1f2b;font-weight:500;word-break:break-word;">${value}</td>
</tr>`;
		})
		.join("\n");

	const iconCell = icon
		? `<td width="56" style="padding-right:14px;vertical-align:middle;"><img src="${e(icon)}" width="48" height="48" alt="" style="display:block;border-radius:14px;border:0;"></td>`
		: "";

	const buttonBlock = button?.url
		? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px;">
<tr><td style="border-radius:10px;background:${accent};">
<a href="${e(button.url)}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${e(button.label)}</a>
</td></tr></table>`
		: "";

	const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${e(o.subject)}</title>
<style>
@media (prefers-color-scheme: dark) {
  body, .ih-page { background:#111218 !important; }
  .ih-sep { border-top-color:#2c2f3c !important; }
  .ih-card { background:#1c1e27 !important; }
  .ih-title, .ih-value { color:#f1f2f6 !important; }
  .ih-intro, .ih-label, .ih-foot { color:#a4a8b8 !important; }
}
@media (max-width: 620px) {
  .ih-card { border-radius:0 !important; }
  .ih-pad { padding:24px 20px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:#f4f5fb;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${e(o.preheader)}</div>
<table role="presentation" class="ih-page" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td style="padding:0 4px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;"><img src="${LOGO}" width="28" height="28" alt="iHorizon" style="display:block;border-radius:8px;border:0;"></td>
<td class="ih-foot" style="padding-left:10px;font-size:14px;font-weight:600;color:#3b3f52;vertical-align:middle;">${e(o.botName)}</td>
</tr></table>
</td></tr>
<tr><td class="ih-card" style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 1px 3px rgba(20,22,40,.08);">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="height:6px;background:${accent};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td class="ih-pad" style="padding:32px 36px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${iconCell}
<td style="vertical-align:middle;"><h1 class="ih-title" style="margin:0;font-size:22px;line-height:1.3;font-weight:700;color:#1d1f2b;">${e(o.title)}</h1></td>
</tr></table>
<p class="ih-intro" style="margin:14px 0 22px;font-size:15px;line-height:1.6;color:#4a4f63;">${e(o.intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${rows}
</table>
${buttonBlock}
</td></tr>
</table>
</td></tr>
<tr><td class="ih-foot" align="center" style="padding:22px 12px 0;font-size:12px;line-height:1.7;color:#8a8fa3;">
Automatic message from ${e(o.botName)} · ${e(date)}<br>
<a href="${SITE}" style="color:#8a8fa3;text-decoration:underline;">ihorizon.org</a> · <a href="${DISCORD}" style="color:#8a8fa3;text-decoration:underline;">Discord</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

	const width = Math.max(...o.fields.map((f) => f.label.length), 0);
	const text = [
		o.title,
		"",
		o.intro,
		"",
		...o.fields.map(
			(f) => `${(f.label + ":").padEnd(width + 2)}${f.value}`
		),
		...(button?.url ? ["", `${button.label}: ${button.url}`] : []),
		"",
		"--",
		`Automatic message from ${o.botName} · ${date}`,
		`${SITE} · ${DISCORD}`
	].join("\r\n");

	return { subject: o.subject, text, html };
}

// ---------------------------------------------------------------- the emails ---

export interface GuildMailInput {
	name: string;
	id: string;
	memberCount: number;
	locale: string;
	vanity: string | null;
	iconUrl: string | null;
	shard: number;
	botName: string;
	at: number;
}

/** iHorizon started (main shard). */
export function readyMail(o: {
	botTag: string;
	botName: string;
	shard: number;
	guilds: number;
	at: number;
}): MailContent {
	return renderMail({
		kind: "info",
		subject: `${o.botName} is online`,
		preheader: `${o.botTag} started on shard #${o.shard}.`,
		title: `${o.botName} is online`,
		intro: `${o.botTag} has started and is connected to Discord.`,
		fields: [
			{ label: "Bot", value: o.botTag },
			{ label: "Shard", value: `#${o.shard}` },
			{
				label: "Servers (this shard)",
				value: o.guilds.toLocaleString("en-US")
			},
			{ label: "Started", value: mailDate(o.at) }
		],
		botName: o.botName,
		at: o.at
	});
}

/** iHorizon was added to a server. */
export function guildJoinedMail(
	o: GuildMailInput & {
		ownerName: string | null;
		ownerId: string;
		invite: string | null;
		joinedAt: number;
	}
): MailContent {
	return renderMail({
		kind: "success",
		subject: `New server: ${o.name}`,
		preheader: `${o.botName} was added to ${o.name} (${o.memberCount} members).`,
		title: o.name,
		intro: `${o.botName} was just added to this server.`,
		iconUrl: o.iconUrl,
		fields: [
			{ label: "Server ID", value: o.id },
			{ label: "Members", value: o.memberCount.toLocaleString("en-US") },
			{
				label: "Owner",
				value: o.ownerName ? `${o.ownerName} (${o.ownerId})` : o.ownerId
			},
			{ label: "Language", value: o.locale },
			{
				label: "Vanity URL",
				value: o.vanity ?? "None",
				href: o.vanity ? `https://${o.vanity}` : null
			},
			{ label: "Joined", value: mailDate(o.joinedAt) },
			{ label: "Shard", value: `#${o.shard}` }
		],
		button: o.invite ? { label: "Open the invite", url: o.invite } : null,
		botName: o.botName,
		at: o.at
	});
}

/** iHorizon was removed from a server. */
export function guildLeftMail(o: GuildMailInput): MailContent {
	return renderMail({
		kind: "danger",
		subject: `Removed from: ${o.name}`,
		preheader: `${o.botName} was removed from ${o.name} (${o.memberCount} members).`,
		title: o.name,
		intro: `${o.botName} is no longer on this server.`,
		iconUrl: o.iconUrl,
		fields: [
			{ label: "Server ID", value: o.id },
			{ label: "Members", value: o.memberCount.toLocaleString("en-US") },
			{ label: "Language", value: o.locale },
			{
				label: "Vanity URL",
				value: o.vanity ?? "None",
				href: o.vanity ? `https://${o.vanity}` : null
			},
			{ label: "Removed", value: mailDate(o.at) },
			{ label: "Shard", value: `#${o.shard}` }
		],
		botName: o.botName,
		at: o.at
	});
}
