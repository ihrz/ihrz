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

// The messages iHorizon sends when it joins a server (guildCreate.ts), as Components V2: one in the server, one by
// private message to its owner and to whoever added it. Both say which language the bot speaks there (picked from
// the server's region) and how to change it.
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Client,
	ContainerBuilder,
	Guild,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	ThumbnailBuilder
} from "discord.js";

import { LanguageData } from "../../../types/languageData.js";
import { AvailableLanguage } from "../functions/getLanguageData.js";

export const DASHBOARD_URL = "https://dash.ihorizon.org";
export const SUPPORT_URL = "https://discord.gg/ihorizon";
export const DOCS_URL = "https://www.ihorizon.org/docs";
export const WEBSITE_URL = "https://www.ihorizon.org";
export const REPOSITORY_URL = "https://gitlab.com/ihrz/ihrz";
const ACCENT = 0x2134ff;

// Slash command ids, fetched once per process: a clickable </name:id> mention.
let commandIds: Promise<Map<string, string>> | null = null;

/** A clickable mention of a slash command (`</setlang:id>`), or `/name` in code when its id is unknown. */
export async function commandMention(
	client: Client,
	name: string
): Promise<string> {
	commandIds ??= (async () => {
		const commands = await client.application?.commands
			.fetch()
			.catch(() => null);
		const ids = new Map<string, string>();
		for (const command of commands?.values() ?? [])
			ids.set(command.name, command.id);
		if (!ids.size) commandIds = null; // try again next time
		return ids;
	})();
	const id = (await commandIds).get(name);
	return id ? `</${name}:${id}>` : `\`/${name}\``;
}

/** The language the bot speaks in a server, as shown to people ("🇫🇷 Français"). */
export function languageName(code: string | null | undefined): string {
	const found =
		AvailableLanguage.find((l) => l.code === code) ??
		AvailableLanguage.find((l) => l.code === "en-US");
	return found ? `${found.flag} ${found.name}` : "English";
}

const fill = (text: string, values: Record<string, string>) =>
	text.replace(/\{(\w+)\}/g, (all, key: string) => values[key] ?? all);

const link = (label: string, url: string, emoji: string) =>
	new ButtonBuilder()
		.setStyle(ButtonStyle.Link)
		.setLabel(label)
		.setURL(url)
		.setEmoji(emoji);

/** The language block and the "get started" block, shared by both messages. */
async function guideBlocks(
	client: Client,
	guild: Guild,
	lang: LanguageData
): Promise<TextDisplayBuilder[]> {
	const e = client.iHorizon_Emojis;
	const code = (await client.db.get(`${guild.id}.GUILD.LANG.lang`)) as
		string | null;
	const setlang = await commandMention(client, "setlang");
	const help = await commandMention(client, "help");
	return [
		new TextDisplayBuilder().setContent(
			`### ${e.Gear} ${lang.welcome_lang_title}\n` +
				fill(lang.welcome_lang_text, {
					language: `**${languageName(code)}**`,
					command: setlang,
					count: String(AvailableLanguage.length)
				})
		),
		new TextDisplayBuilder().setContent(
			`### ${e.Sparkles} ${lang.welcome_start_title}\n` +
				[
					`- ${e.Pages} ${fill(lang.welcome_start_help, { command: help })}`,
					`- ${e.Home} ${fill(lang.welcome_start_dashboard, { url: DASHBOARD_URL })}`,
					`- ${e.Logo} ${fill(lang.welcome_start_support, { url: SUPPORT_URL })}`
				].join("\n")
		)
	];
}

function links(client: Client, lang: LanguageData, withRepository: boolean) {
	const e = client.iHorizon_Emojis;
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		link(lang.welcome_btn_dashboard, DASHBOARD_URL, e.Home),
		link(lang.guild_create_btn_docs, DOCS_URL, e.Documentation),
		link(lang.guild_create_btn_support, SUPPORT_URL, e.Logo)
	);
	row.addComponents(
		withRepository
			? link(lang.guild_create_btn_repos, REPOSITORY_URL, e.GitLab_Logo)
			: link(lang.guild_create_btn_website, WEBSITE_URL, e.Sparkles)
	);
	return row;
}

/** The message posted in the server when iHorizon joins it. */
export async function serverWelcomePayload(
	client: Client,
	guild: Guild,
	lang: LanguageData
) {
	const e = client.iHorizon_Emojis;
	const titles = lang.new_guild_embed_title;
	const title =
		titles[
			Math.floor(client.func.random.secureRandomFloat() * titles.length)
		] ?? titles[0];
	const container = new ContainerBuilder()
		.setAccentColor(ACCENT)
		.addSectionComponents(
			new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`# ${title}\n${lang.welcome_server_intro}`
					)
				)
				.setThumbnailAccessory(
					new ThumbnailBuilder().setURL(
						client.user!.displayAvatarURL({
							size: 256,
							extension: "png"
						})
					)
				)
		)
		.addMediaGalleryComponents(
			new MediaGalleryBuilder().addItems(
				new MediaGalleryItemBuilder().setURL(
					await client.func.bannerGenerator(guild.id)
				)
			)
		)
		.addSeparatorComponents(
			new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
		)
		.addTextDisplayComponents(...(await guideBlocks(client, guild, lang)))
		.addSeparatorComponents(new SeparatorBuilder())
		.addActionRowComponents(links(client, lang, false))
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`-# ${e.Wink} ${lang.welcome_footer}`
			)
		);
	return {
		components: [container],
		flags: MessageFlags.IsComponentsV2 as const
	};
}

/** The private message to the server's owner and to whoever added iHorizon. */
export async function ownerWelcomePayload(
	client: Client,
	guild: Guild,
	lang: LanguageData
) {
	const e = client.iHorizon_Emojis;
	const icon =
		guild.iconURL({ size: 256, extension: "png" }) ??
		client.user!.displayAvatarURL({ size: 256, extension: "png" });
	const container = new ContainerBuilder()
		.setAccentColor(ACCENT)
		.addSectionComponents(
			new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`# ${e.Crown} ${lang.welcome_dm_title}\n` +
							fill(lang.welcome_dm_intro, {
								guild: `**${guild.name}**`
							})
					)
				)
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(icon))
		)
		.addSeparatorComponents(
			new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
		)
		.addTextDisplayComponents(...(await guideBlocks(client, guild, lang)))
		.addSeparatorComponents(new SeparatorBuilder())
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(lang.welcome_dm_outro)
		)
		.addActionRowComponents(links(client, lang, true));
	return {
		components: [container],
		flags: MessageFlags.IsComponentsV2 as const
	};
}
