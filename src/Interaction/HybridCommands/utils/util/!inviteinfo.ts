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
	ChatInputCommandInteraction,
	Message,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle
} from "discord.js";

import { LanguageData } from "../../../../../types/languageData.js";
import { SubCommand } from "../../../../../types/command.js";
import { isValidDiscordInvite } from "../../../../core/functions/method.js";
import {
	ACCENT,
	botSignature,
	buildCard,
	sendCard
} from "../../../../core/modules/uiCard.js";

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

		const opts = client.func.method.options(interaction, args);
		const invite = opts.string("discord_invite", 0)!;

		if (!isValidDiscordInvite(invite)) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_inviteinfo_not_valid_invite
			});
			return;
		}

		const link_data = await client.fetchInvite(invite).catch(() => null);

		if (!link_data) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_inviteinfo_not_valid_invite
			});
			return;
		}

		const e = client.iHorizon_Emojis;
		const guild = link_data.guild;
		const ts = (ms: number | null | undefined) =>
			ms
				? `<t:${Math.floor(ms / 1000)}:D> (<t:${Math.floor(ms / 1000)}:R>)`
				: "";
		const count = (n: number | null | undefined) =>
			n ? `\`${n.toLocaleString()}\`` : lang.var_unknown;

		const icon = guild?.iconURL({ size: 512, forceStatic: false });
		const banner = guild?.banner
			? await client.func.bannerURL(guild, {
					size: 1024,
					forceStatic: false
				})
			: null;
		const splash = guild?.splashURL({ size: 1024 });

		// Everything on one card: the two embed pages it replaces fit easily.
		const container = buildCard({
			accent: ACCENT.info,
			emoji: e.Link_Icon,
			title: guild?.name || lang.var_unknown_guild_name,
			description: guild?.description || lang.profil_not_description_set,
			thumbnail: icon,
			fields: [
				{
					emoji: e.Ticket_Hash,
					label: lang.inviteinfo_label_channel,
					value: link_data.channelId
						? `<#${link_data.channelId}> (\`${link_data.channelId}\`)`
						: ""
				},
				link_data.inviter && {
					emoji: e.Ticket_User,
					label: lang.inviteinfo_label_inviter,
					value: `${link_data.inviter} (\`${link_data.inviter.username}\`)`
				},
				{
					emoji: e.Schedule,
					label: lang.inviteinfo_label_created,
					value: ts(guild?.createdTimestamp)
				},
				{
					emoji: e.Timer,
					label: lang.inviteinfo_label_expires,
					value: ts(link_data.expiresTimestamp)
				}
			],
			blocks: [
				[
					`${e.Stats} **${lang.inviteinfo_label_members}** : ${count(link_data.memberCount)}`,
					`${e.Online} **${lang.inviteinfo_label_online}** : ${count(link_data.presenceCount)}`,
					`${e.Boost_Gem} **${lang.inviteinfo_label_boosts}** : \`${guild?.premiumSubscriptionCount || 0}\``
				].join("\n"),
				`${e.Sparkles} **${lang.inviteinfo_label_features}** : ${
					guild?.features.length
						? guild.features.map((f) => `\`${f}\``).join(" ")
						: lang.var_none
				}`,
				guild && `-# ${lang.serverinfo_label_id} \`${guild.id}\``
			],
			images: [banner, splash],
			signature: await botSignature(client, interaction.guildId)
		});

		const buttons: ButtonBuilder[] = [];
		const link = (label: string, url: string | null | undefined) => {
			if (url)
				buttons.push(
					new ButtonBuilder()
						.setStyle(ButtonStyle.Link)
						.setLabel(label)
						.setURL(url)
				);
		};
		link(lang.var_guild_icon, icon);
		link(lang.var_guild_banner, banner);
		link(lang.var_guild_splash, splash);
		if (buttons.length) {
			container.addActionRowComponents(
				new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)
			);
		}

		await sendCard(client, interaction, container);
	}
};
