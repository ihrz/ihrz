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
	AttachmentBuilder,
	ChatInputCommandInteraction,
	Client,
	ColorResolvable,
	EmbedBuilder,
	GuildMember,
	Message
} from "discord.js";
import { LanguageData } from "../../../../types/languageData.js";

import { SubCommand } from "../../../../types/command.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var user =
				(interaction.options.getMember("user") as GuildMember) ||
				interaction.member;
		} else {
			var user =
				client.func.method.member(interaction, args!, 0) ||
				interaction.member;
		}

		// USER PFP COLOR
		const userAvatar = user.displayAvatarURL({
			extension: "png",
			size: 4096
		});
		const { color1, color2 } =
			await client.func.image_dominant_color(userAvatar);

		const baseData = await client.db.get(
			`${interaction.guildId}.USER.${user.id}.XP_LEVELING`
		);
		const level = baseData?.level || 0;
		const currentxp = baseData?.xp || 0;
		// The old card printed the current XP as the total.
		const totalXp = baseData?.xptotal || currentxp;

		const xpNeeded = level * 500 + 500;
		const expNeededForLevelUp = xpNeeded - currentxp;

		const kit = client.func.svgKit;
		const displayName = user.user.globalName || user.displayName;
		const avatar = await client.func.image64.image64(
			user.displayAvatarURL({ extension: "png", size: 256 })
		);
		const progress = Math.max(0, Math.min(1, currentxp / xpNeeded));
		const textX = 140;
		const textWidth = 400;

		// Bottom row: two columns where only the label may be shortened,
		// the number always stays visible.
		const statStyle = { size: 14 };
		const columnWidth = textWidth / 2 - 8;
		const statLine = async (label: string, value: number) => {
			const valueText = ` ${value}`;
			const room =
				columnWidth - (await kit.measure(valueText, statStyle));
			return (await kit.ellipsize(label, room, statStyle)) + valueText;
		};
		const [remainingText, totalText] = await Promise.all([
			statLine(lang.level_xp_needed_for_new_level, expNeededForLevelUp),
			statLine(lang.level_xp_total, totalXp)
		]);

		const [username, levelLine, xpLine, remainingLine, totalLine] =
			await Promise.all([
				kit.text(displayName, {
					x: textX,
					y: 48,
					size: 24,
					weight: 700,
					maxWidth: textWidth
				}),
				kit.text(`${lang.var_level} ${level}`, {
					x: textX,
					y: 78,
					size: 18
				}),
				kit.text(`${currentxp} / ${xpNeeded} XP`, {
					x: textX + textWidth / 2,
					y: 109,
					size: 14,
					weight: 700,
					anchor: "middle",
					attributes: 'filter="url(#shadow)"'
				}),
				kit.text(remainingText, {
					...statStyle,
					x: textX,
					y: 140,
					fill: "#B9BBBE"
				}),
				kit.text(totalText, {
					...statStyle,
					x: textX + textWidth,
					y: 140,
					fill: "#B9BBBE",
					anchor: "end"
				})
			]);

		const svg = kit.fill(client.svgfiles["ranksCard"], {
			color_start: color1,
			color_end: color2,
			progress_width: (textWidth * progress).toFixed(1),
			avatar: avatar
				? kit.image(avatar, {
						x: 20,
						y: 30,
						width: 100,
						height: 100,
						radius: "circle"
					})
				: kit.raw(""),
			username,
			level: levelLine,
			xp: xpLine,
			remaining: remainingLine,
			total: totalLine
		});

		const image = await client.func.svg2png(svg, { scale: 2 });

		const attachment = new AttachmentBuilder(image, { name: "image.png" });

		const nivEmbed = new EmbedBuilder()
			.setTitle(
				lang.level_embed_title.replace(
					"${userUsername}",
					String(user.user.globalName || user.displayName)
				)
			)
			.setColor(color1 as ColorResolvable)
			.addFields(
				{
					name: lang.level_embed_fields1_name,
					value: lang.level_embed_fields2_value.replace(
						"${level}",
						level
					),
					inline: true
				},
				{
					name: lang.level_embed_fields2_name,
					value: lang.level_embed_fields1_value
						.replace("${currentxp}", currentxp)
						.replace("${xpNeeded}", xpNeeded.toString()),
					inline: true
				}
			)
			.setImage("attachment://image.png")
			.setDescription(
				lang.level_embed_description.replace(
					"${expNeededForLevelUp}",
					expNeededForLevelUp.toString()
				)
			)
			.setTimestamp()
			.setThumbnail(userAvatar)
			.setFooter(
				await client.func.displayBotName.footerBuilder(
					interaction.guildId!
				)
			);

		await client.func.method.interactionSend(interaction, {
			embeds: [nivEmbed],
			allowedMentions: { repliedUser: false },
			files: [
				await client.func.displayBotName.footerAttachmentBuilder(
					interaction
				),
				attachment
			]
		});
		return;
	}
};
