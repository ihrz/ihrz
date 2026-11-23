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

// Components V2 cards shared by the economy commands: the shop's role list
// (add / delete / boost-set / list), the daily / weekly / monthly rewards,
// and a paginator that keeps a generated image (leaderboard podium).

import {
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	ContainerBuilder,
	GuildMember,
	Message,
	MessageFlags
} from "discord.js";

import { LanguageData } from "../../../types/languageData.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	cardPayload,
	sendCardWithFiles
} from "./uiCard.js";

type Source = ChatInputCommandInteraction<"cached"> | Message;

/** One line per buyable role, most expensive first. */
export function roleLines(
	client: Client,
	roleData: DatabaseStructure.EconomyModel["buyableRoles"],
	lang: LanguageData
): string {
	const coin = client.iHorizon_Emojis.Coin;
	return Object.entries(roleData || {})
		.sort(([, a], [, b]) => (b?.price ?? 0) - (a?.price ?? 0))
		.map(
			([roleId, role], index) =>
				`\`#${index + 1}\` <@&${roleId}>\n-# ${lang.var_price} **${role.price}**${coin} · ${lang.var_boost} **x${role.boost || 1}**`
		)
		.join("\n");
}

/** The shop's buyable roles, after a change or for /economy shop-list. */
export async function roleListCard(
	client: Client,
	guildId: string,
	roleData: DatabaseStructure.EconomyModel["buyableRoles"],
	lang: LanguageData,
	text: { title: string; description: string }
): Promise<ContainerBuilder> {
	const lines = roleLines(client, roleData, lang);
	return buildCard({
		accent: ACCENT.neutral,
		emoji: client.iHorizon_Emojis.Wallet,
		title: text.title,
		description: text.description,
		blocks: [lines || lang.economy_role_list_no_buyable_roles],
		signature: await botSignature(client, guildId)
	});
}

/** Daily / weekly / monthly reward collected. */
export async function rewardCard(
	client: Client,
	member: GuildMember,
	lang: LanguageData,
	text: { title: string; description: string; label: string },
	amount: number
): Promise<ContainerBuilder> {
	const e = client.iHorizon_Emojis;
	return buildCard({
		accent: ACCENT.success,
		emoji: e.Coin,
		title: text.title,
		description: text.description,
		thumbnail: member.displayAvatarURL({ size: 256 }),
		fields: [
			{ emoji: e.Wallet, label: text.label, value: `${amount}${e.Coin}` }
		],
		signature: await botSignature(client, member.guild.id)
	});
}

const NAV = {
	first: "economy_first",
	previous: "economy_previous",
	next: "economy_next",
	last: "economy_last"
} as const;

export interface PaginatedWithFilesOptions {
	client: Client;
	interaction: Source;
	lang: LanguageData;
	pages: number;
	/** Sent once with the first page; the cards show them by name. */
	files: AttachmentBuilder[];
	render: (page: number) => ContainerBuilder | Promise<ContainerBuilder>;
	timeoutMs?: number;
}

/**
 * sendPaginatedCard with attachments (it sends none): the files go with the
 * first page and stay on the message when pages turn. Only the author turns
 * pages; the buttons are disabled when time runs out.
 */
export async function sendPaginatedCardWithFiles(
	o: PaginatedWithFilesOptions
): Promise<Message> {
	const { client, interaction, lang, pages } = o;
	const authorId =
		interaction instanceof Message
			? interaction.author.id
			: interaction.user.id;
	let page = 0;

	const withNav = async (
		p: number,
		disabled: boolean
	): Promise<ContainerBuilder> => {
		const container = await o.render(p);
		if (pages > 1) {
			const button = (id: string, label: string, off: boolean) =>
				new ButtonBuilder()
					.setCustomId(id)
					.setLabel(label)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(disabled || off);
			container.addActionRowComponents(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					button(NAV.first, "«", p === 0),
					button(NAV.previous, lang.var_previous, p === 0),
					button(NAV.next, lang.var_next, p === pages - 1),
					button(NAV.last, "»", p === pages - 1)
				)
			);
		}
		return container;
	};

	const message = await sendCardWithFiles(
		client,
		interaction,
		o.files,
		await withNav(0, false)
	);
	if (pages < 2) return message;

	const collector = message.createMessageComponentCollector({
		time: o.timeoutMs ?? 5 * 60_000
	});
	collector.on("collect", async (i) => {
		if (!i.isButton()) return;
		if (i.user.id !== authorId) {
			await i.reply({
				content: lang.help_not_for_you,
				flags: [MessageFlags.Ephemeral]
			});
			return;
		}
		if (i.customId === NAV.first) page = 0;
		else if (i.customId === NAV.previous) page = Math.max(0, page - 1);
		else if (i.customId === NAV.next) page = Math.min(pages - 1, page + 1);
		else if (i.customId === NAV.last) page = pages - 1;
		else return;
		await i.update({ components: [await withNav(page, false)] });
	});
	collector.on("end", async () => {
		await message
			.edit(cardPayload(await withNav(page, true)) as never)
			.catch(() => undefined);
	});
	return message;
}
