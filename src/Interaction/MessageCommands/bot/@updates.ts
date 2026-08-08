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
	EmbedBuilder,
	AttachmentBuilder,
	Message,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { Command } from "../../../../types/command.js";
import { metasTable } from "../../../Events/client/ready.js";
import path from "node:path";

export const command: Command = {
	name: "updates",

	aliases: ["changelog", "update"],

	description: "Get the latest iHorizon updates and changelog!",
	description_localizations: {
		fr: "Obtenez les dernières mises à jour et le changelog d'iHorizon !",
		ja: "iHorizonの最新アップデートとチェンジログを取得！",
		ru: "Получить последние обновления и список изменений iHorizon!",
		"es-ES": "Obtén las últimas actualizaciones y el changelog de iHorizon!"
	},

	thinking: false,
	category: "bot",
	type: "PREFIX_IHORIZON_COMMAND",
	permission: null,
	run: async (
		client: Client,
		interaction: Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (!client.user || !interaction.guild || !interaction.channel) return;

		const version = client.version;
		const releaseUrl = `${version.git_remote}/-/releases/${version.version}`;

		const embed = new EmbedBuilder()
			.setTitle(lang.updates_embed_title)
			.setColor("#475387")
			.setDescription(lang.updates_embed_description)
			.addFields(
				{
					name: lang.updates_field_version,
					value: `\`${version.ClientVersion}\``,
					inline: false
				},
				{
					name: lang.updates_field_commit,
					value: `[\`${version.short_commit_hex}\`](${version.git_commit_url})`,
					inline: true
				},
				{
					name: lang.updates_field_branch,
					value: `\`${version.env}\``,
					inline: true
				}
			)
			.setFooter(
				await client.func.displayBotName.footerBuilder(
					interaction.guildId!
				)
			)
			.setThumbnail("attachment://footer_icon.png")
			.setTimestamp();

		const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setLabel("GitLab")
				.setEmoji(client.iHorizon_Emojis.GitLab_Logo)
				.setStyle(ButtonStyle.Link)
				.setURL(version.git_remote),
			new ButtonBuilder()
				.setLabel("Releases")
				.setEmoji(client.iHorizon_Emojis.Sparkles)
				.setStyle(ButtonStyle.Link)
				.setURL(releaseUrl),
			new ButtonBuilder()
				.setLabel("Commit")
				.setEmoji(client.iHorizon_Emojis.Crown)
				.setStyle(ButtonStyle.Link)
				.setURL(version.git_commit_url)
		);

		const components: any[] = [buttons];

		// Add newsletter button for everyone
		const bl = (await metasTable.get("newsletter_bl")) as Record<
			string,
			boolean
		> | null;
		const isDisabled = bl?.[interaction.author.id] === true;
		const isEnabled = !isDisabled;

		const newsletterBtn = new ButtonBuilder()
			.setCustomId("newsletter-toggle")
			.setLabel(
				isEnabled
					? lang.newsletter_btn_unsubscribe
					: lang.newsletter_btn_subscribe
			)
			.setStyle(isEnabled ? ButtonStyle.Danger : ButtonStyle.Primary);

		components.push(
			new ActionRowBuilder<ButtonBuilder>().addComponents(newsletterBtn)
		);

		// Attach latest changelog PDF, localized by guild language
		const guildLang = (await client.db.get(
			`${interaction.guildId}.GUILD.LANG.lang`
		)) as string;
		const pdfLang = guildLang?.startsWith("fr") ? "fr" : "en";

		const getPdfPath = (lang: string) =>
			path.join(
				process.cwd(),
				"changelogs",
				lang,
				version.version,
				`CHANGELOG_${lang.toUpperCase()}_${version.version}.pdf`
			);

		let pdfPath = getPdfPath(pdfLang);
		let pdfExists = await Bun.file(pdfPath).exists();

		// Fallback to the other language if localized PDF doesn't exist
		if (!pdfExists) {
			const fallbackLang = pdfLang === "fr" ? "en" : "fr";
			const fallbackPath = getPdfPath(fallbackLang);
			if (await Bun.file(fallbackPath).exists()) {
				pdfPath = fallbackPath;
				pdfExists = true;
			}
		}

		const files: any[] = [
			await client.func.displayBotName.footerAttachmentBuilder(
				interaction
			)
		];

		if (pdfExists) {
			const pdfBuffer = Buffer.from(
				await Bun.file(pdfPath).arrayBuffer()
			);
			files.push(
				new AttachmentBuilder(pdfBuffer, {
					name: `CHANGELOG_${version.version}.pdf`
				})
			);
		}

		await interaction.reply({
			embeds: [embed],
			components,
			files
		});
	}
};
