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

/*
 * Fake social posts (/tweet, /youtube) rendered with resvg. The comment
 * used to be inserted as raw HTML (`sanitizing` only drops broken surrogate
 * pairs), so any user could make the renderer load an arbitrary URL. Here
 * every user string is escaped text, laid out from the font metrics.
 */

import svg2png from "../functions/svg2png.js";
import {
	ellipsize,
	escape,
	fill,
	image,
	measure,
	paragraph,
	raw,
	text,
	wrap
} from "../functions/svgKit.js";

export interface SocialPostData {
	displayName: string;
	avatar: Buffer | null;
	content: string;
	ago: string;
}

export interface TweetData extends SocialPostData {
	handle: string;
	replies: string;
	retweets: string;
	likes: string;
	views: string;
}

export interface YoutubeCommentData extends SocialPostData {
	likes: string;
	reply: string;
}

const MAX_LINES = 15;

function avatarOrPlaceholder(
	avatar: Buffer | null,
	x: number,
	y: number,
	size: number
) {
	return avatar
		? image(avatar, { x, y, width: size, height: size, radius: "circle" })
		: raw(
				`<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="#333333"/>`
			);
}

/* ------------------------------------------------------------------ */
/* Tweet (598px wide, like the old .tweet-card)                       */
/* ------------------------------------------------------------------ */

const TWEET_WIDTH = 598;
const TWEET_TEXT_X = 68;
const TWEET_TEXT_WIDTH = TWEET_WIDTH - TWEET_TEXT_X - 16;
const TWEET_FONT = 15;
const TWEET_LINE_HEIGHT = 22.5;

export async function renderTweet(data: TweetData): Promise<Buffer> {
	const nameStyle = { size: TWEET_FONT, weight: 700 as const };
	const secondary = { size: TWEET_FONT, fill: "#71767b" };

	// Header: name, badge, handle, dot, time; the name gives way first.
	const tail = ` ${data.handle} · ${data.ago}`;
	const tailWidth = await measure(tail, secondary);
	const nameRoom = Math.max(
		60,
		TWEET_TEXT_WIDTH - 40 - 22 - Math.min(tailWidth, 220)
	);
	const name = await ellipsize(data.displayName, nameRoom, nameStyle);
	const nameWidth = await measure(name, nameStyle);
	const badgeX = TWEET_TEXT_X + nameWidth + 4;
	const tailX = badgeX + 18 + 4;
	const tailText = await ellipsize(
		tail.trimStart(),
		TWEET_WIDTH - 16 - 26 - tailX,
		secondary
	);

	const lines = (
		await wrap(
			data.content,
			TWEET_TEXT_WIDTH,
			{ size: TWEET_FONT },
			MAX_LINES
		)
	).length;
	const firstBaseline = 50;
	const textBottom = firstBaseline + (lines - 1) * TWEET_LINE_HEIGHT + 6;
	const actionsY = Math.round(textBottom + 12 + 4);
	const iconCenter = actionsY + 4 + 17;
	const cardHeight = iconCenter + 17 + 12 + 4;

	const [nameMarkup, tailMarkup, tweet] = await Promise.all([
		text(name, { ...nameStyle, x: TWEET_TEXT_X, y: 28, fill: "#e7e9ea" }),
		text(tailText, { ...secondary, x: tailX, y: 28 }),
		paragraph(data.content, {
			size: TWEET_FONT,
			x: TWEET_TEXT_X,
			y: firstBaseline,
			fill: "#e7e9ea",
			maxWidth: TWEET_TEXT_WIDTH,
			lineHeight: TWEET_LINE_HEIGHT,
			maxLines: MAX_LINES
		})
	]);

	// Actions: four buttons with a count, then bookmark + share, spread
	// like `justify-content: space-between`.
	const count = { size: 13, fill: "#71767b" };
	const buttons: { icon: string; label?: string; width: number }[] = [];
	for (const [icon, label] of [
		["reply", data.replies],
		["retweet", data.retweets],
		["like", data.likes],
		["views", data.views]
	] as const) {
		buttons.push({
			icon,
			label,
			width: Math.max(40, 8 + 18 + 6 + (await measure(label, count)) + 8)
		});
	}
	const rightGroup = 34 * 2;
	const used = buttons.reduce((sum, b) => sum + b.width, 0) + rightGroup;
	const gap = Math.max(0, (TWEET_TEXT_WIDTH - used) / buttons.length);

	const actions: string[] = [];
	let x = TWEET_TEXT_X - 8;
	for (const button of buttons) {
		actions.push(
			`<use href="#${button.icon}" x="${(x + 8).toFixed(1)}" y="${iconCenter - 9}" width="18" height="18"/>`,
			`<text x="${(x + 8 + 18 + 6).toFixed(1)}" y="${iconCenter + 4.5}" font-family="Noto Sans" font-size="13" fill="#71767b">${escape(button.label!)}</text>`
		);
		x += button.width + gap;
	}
	const rightX = TWEET_TEXT_X + TWEET_TEXT_WIDTH + 8 - rightGroup;
	actions.push(
		`<use href="#bookmark" x="${rightX + 8}" y="${iconCenter - 9}" width="18" height="18"/>`,
		`<use href="#share" x="${rightX + 34 + 8}" y="${iconCenter - 9}" width="18" height="18"/>`
	);

	const svg = fill(globalThis.client.svgfiles["tweetCard"], {
		height: cardHeight,
		card_height: cardHeight - 1,
		avatar: avatarOrPlaceholder(data.avatar, 16, 12, 40),
		thread_height: Math.max(8, cardHeight - 4 - 56),
		header: raw(
			nameMarkup.markup +
				`<use href="#badge" x="${badgeX.toFixed(1)}" y="14" width="18" height="18"/>` +
				tailMarkup.markup
		),
		tweet,
		actions_y: actionsY,
		actions: raw(actions.join(""))
	});

	return svg2png(svg, { scale: 2 });
}

/* ------------------------------------------------------------------ */
/* YouTube comment                                                    */
/* ------------------------------------------------------------------ */

const YT_WIDTH = 744;
const YT_TEXT_X = 72;
const YT_TEXT_WIDTH = YT_WIDTH - YT_TEXT_X - 16;
const YT_LINE_HEIGHT = 20;

export async function renderYoutubeComment(
	data: YoutubeCommentData
): Promise<Buffer> {
	const nameStyle = { size: 13, weight: 700 as const };
	const name = await ellipsize(data.displayName, 400, nameStyle);
	const nameWidth = await measure(name, nameStyle);

	const lines = (
		await wrap(data.content, YT_TEXT_WIDTH, { size: 14 }, MAX_LINES)
	).length;
	const firstBaseline = 50;
	const lastBaseline = firstBaseline + (lines - 1) * YT_LINE_HEIGHT;
	const actionsCenter = Math.round(lastBaseline + 8 + 18);
	const height = actionsCenter + 18 + 12;

	const likesStyle = { size: 12, fill: "#aaaaaa" };
	const likesX = YT_TEXT_X + 16 + 6;
	const dislikeX = likesX + (await measure(data.likes, likesStyle)) + 20;
	const replyX = dislikeX + 16 + 24;

	const [header, timestamp, comment, likes, reply] = await Promise.all([
		text(name, { ...nameStyle, x: YT_TEXT_X, y: 30, fill: "#f1f1f1" }),
		text(data.ago, {
			size: 12,
			x: YT_TEXT_X + nameWidth + 8,
			y: 30,
			fill: "#aaaaaa"
		}),
		paragraph(data.content, {
			size: 14,
			x: YT_TEXT_X,
			y: firstBaseline,
			fill: "#f1f1f1",
			maxWidth: YT_TEXT_WIDTH,
			lineHeight: YT_LINE_HEIGHT,
			maxLines: MAX_LINES
		}),
		text(data.likes, { ...likesStyle, x: likesX, y: actionsCenter + 4 }),
		text(data.reply.toUpperCase(), {
			size: 12,
			weight: 700,
			letterSpacing: 0.5,
			x: replyX,
			y: actionsCenter + 4,
			fill: "#aaaaaa"
		})
	]);

	const svg = fill(globalThis.client.svgfiles["youtubeComment"], {
		height,
		avatar: avatarOrPlaceholder(data.avatar, 16, 16, 40),
		header: raw(header.markup + timestamp.markup),
		comment,
		actions_icon_y: actionsCenter - 8,
		actions_center_y: actionsCenter,
		likes,
		dislike_x: dislikeX.toFixed(1),
		dislike_center_x: (dislikeX + 8).toFixed(1),
		reply
	});

	return svg2png(svg, { scale: 2 });
}
