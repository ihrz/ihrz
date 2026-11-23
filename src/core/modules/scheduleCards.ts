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

// Cards of /schedule and of the reminder DM sent when a schedule is due.

import { Client, ContainerBuilder, time, User } from "discord.js";

import { format } from "../functions/date_and_time.js";
import { Expressions } from "../functions/randomExpression.js";
import { LanguageData } from "../../../types/languageData.js";
import { ACCENT, botSignature, buildCard, cardPayload } from "./uiCard.js";

export interface ScheduleEntry {
	title: string;
	description: string;
	expired: number;
}

/**
 * A code block on its own lines: glued to the date and to each other, the
 * fences broke and showed up as backticks. A fence typed in the text would
 * close the block, so it is split.
 */
export function fence(text: unknown): string {
	return `\`\`\`\n${String(text ?? "").replaceAll("```", "`​``")}\n\`\`\``;
}

/** `2026/11/22 18:30:00 (in 2 hours)`: the stored format, then Discord's. */
export function scheduleDate(at: number): string {
	return `${format(new Date(at), "YYYY/MM/DD HH:mm:ss")} · ${time(Math.floor(at / 1000), "R")}`;
}

/** One reminder of the list: code, date, title and description. */
export function scheduleBlock(
	client: Client,
	code: string,
	entry: ScheduleEntry
): string {
	return [
		`**#${code}** · ${client.iHorizon_Emojis.Timer} ${scheduleDate(entry.expired)}`,
		fence(entry.title),
		fence(entry.description)
	].join("\n");
}

/** The card of a due reminder, DMed to its author. */
export async function scheduleReminderCard(
	client: Client,
	lang: LanguageData,
	user: User,
	code: string,
	entry: ScheduleEntry
): Promise<ContainerBuilder> {
	return buildCard({
		accent: ACCENT.info,
		emoji: client.iHorizon_Emojis.Schedule,
		title: lang.schedule_reminder_title.replace("${scheduleCode}", code),
		description: `${user}\n${client.iHorizon_Emojis.Timer} ${scheduleDate(entry.expired)}`,
		thumbnail: Expressions.Nerd,
		blocks: [`${fence(entry.title)}\n${fence(entry.description)}`],
		signature: await botSignature(client, null)
	});
}

/**
 * The DM payload. The reminder is for its author: unlike other cards, it
 * still pings them (and only them), as the old message did.
 */
export async function scheduleReminderPayload(
	client: Client,
	lang: LanguageData,
	user: User,
	code: string,
	entry: ScheduleEntry
) {
	return {
		...cardPayload(
			await scheduleReminderCard(client, lang, user, code, entry)
		),
		allowedMentions: { users: [user.id] }
	};
}
