/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	Client,
	ApplicationCommandOptionType,
	EmbedBuilder,
	ApplicationCommandType,
	time,
	User,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Message,
	UserContextMenuCommandInteraction,
} from 'discord.js';

import { axios } from '../../../core/functions/axios.js';
import { SubCommand } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';
import { createOauth2LinkWithoutGuild, oauth2Member } from '../../../core/functions/authRestoreHelper.js';
import * as apiUrlParser from "../../../core/functions/apiUrlParser.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | UserContextMenuCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		let badges: {
			[key: string]: {
				Value: number;
				Emoji: string;
			}
		} = {
			Discord_Employee: {
				Value: 1,
				Emoji: client.iHorizon_Emojis.Discord_Staff_Badge,
			},
			Partnered_Server_Owner: {
				Value: 2,
				Emoji: client.iHorizon_Emojis.Partne_Badger,
			},
			HypeSquad_Events: {
				Value: 4,
				Emoji: client.iHorizon_Emojis.HypeSquad_Event_Badge,
			},
			Bug_Hunter_Level_1: {
				Value: 8,
				Emoji: client.iHorizon_Emojis.Bug_Hunter1_Badge,
			},
			Early_Supporter: {
				Value: 512,
				Emoji: client.iHorizon_Emojis.Early_Supporter_Badge,
			},
			Bug_Hunter_Level_2: {
				Value: 16384,
				Emoji: client.iHorizon_Emojis.Bug_Hunter2_Badge,
			},
			Early_Verified_Bot_Developer: {
				Value: 131072,
				Emoji: client.iHorizon_Emojis.ECBDD_Badge,
			},
			House_Bravery: {
				Value: 64,
				Emoji: client.iHorizon_Emojis.HypeS_Bravery_Bad,
			},
			House_Brilliance: {
				Value: 128,
				Emoji: client.iHorizon_Emojis.HypeS_Brillance_Bad,
			},
			House_Balance: {
				Value: 256,
				Emoji: client.iHorizon_Emojis.HypeS_Brillance_Bad,
			},
			Active_Developers: {
				Value: 4194304,
				Emoji: client.iHorizon_Emojis.Active_Dev_Badge,
			},
			Discord_Moderators: {
				Value: 262144,
				Emoji: client.iHorizon_Emojis.Discord_Moderators_Badg,
			},
			Slash_Bot: {
				Value: 524288,
				Emoji: client.iHorizon_Emojis.Slash_Bot_Badge,
			},
		};

		function getBadges(flags: number): string {
			let badgeValues = Object.values(badges);
			return badgeValues
				.filter(badge => (flags & badge.Value) === badge.Value)
				.map(badge => badge.Emoji)
				.join('');
		};

		if (interaction instanceof ChatInputCommandInteraction) {
			var member = interaction.options.getUser('user') || interaction.user;
		} else if (interaction instanceof UserContextMenuCommandInteraction) {
			var member = interaction.options.getUser('user') || interaction.user;
		} else {
			var member = await client.func.method.user(interaction, args!, 0) || interaction.author;
		};

		const originalInteraction = await client.func.method.interactionSend(interaction as ChatInputCommandInteraction, {
			content: client.iHorizon_Emojis.Discord_Loading
		});

		async function sendMessage(user: User) {

			let format = 'png';

			let user_1 = (await axios.get(`https://discord.com/api/v10/users/${user?.id}`, {
				headers: {
					Authorization: `Bot ${client.token}`
				}
			})).data;

			let banner = user_1.banner;

			if (banner !== null && banner?.substring(0, 2) === 'a_') {
				format = 'gif'
			};

			let badges = getBadges(member.flags?.bitfield!);
			let nitro = await GetNitro();
			badges += nitro.badge;

			let embed = new EmbedBuilder()
				.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!))
				.setThumbnail("attachment://user_icon.gif")
				.setTimestamp()
				.setColor('#0014a8')
				.setFields(
					{
						name: lang.userinfo_embed_fields_1_name,
						value: badges || lang.userinfo_var_notfound,
						inline: true,
					},
					{
						name: lang.userinfo_embed_fields_2_name,
						value: user.username,
						inline: true,
					},
					{
						name: lang.userinfo_embed_fields_3_name,
						value: user.displayName || lang.userinfo_var_notfound,
						inline: true,
					},
					{
						name: lang.userinfo_embed_fields_4_name,
						value: time(user.createdAt, "D") || lang.userinfo_var_notfound,
						inline: true,
					},
					{
						name: lang.userinfo_embed_fields_5_name,
						value: nitro.type || (client.config.api.HorizonGateway?.startsWith("http") ? `[${lang.userinfo_var_notfound}](${createOauth2LinkWithoutGuild({
							clientId: client.user?.id,
							scope: "identify"
						})})` : lang.userinfo_var_notfound),
						inline: true,
					},
					{
						name: lang.var_roles,
						value: Array.from(interaction.guild?.members.cache.get(user.id)?.roles.cache?.values() ?? [])
							.slice(0, 37)
							.join("") || lang.var_none,
						inline: false,
					}
				)
				.setImage("attachment://user_banner.gif");

			var files: { name: string; attachment: any }[] = [
				await client.func.displayBotName.footerAttachmentBuilder(interaction),
				{
					attachment: user.displayAvatarURL({ size: 512, forceStatic: false }),
					name: 'user_icon.gif'
				}
			];

			if (banner) files.push({
				attachment: await interaction.client.func.image64.image64(`https://cdn.discordapp.com/banners/${user_1?.id}/${banner}.${format}?size=1024`),
				name: 'user_banner.gif'
			});

			await originalInteraction.edit({
				content: null,
				embeds: [embed],
				files: files,
				components: [
					new ActionRowBuilder<ButtonBuilder>()
						.addComponents(
							new ButtonBuilder()
								.setStyle(ButtonStyle.Link)
								.setURL(`https://discordapp.com/users/${user.id}`)
								.setLabel(lang.userinfo_button_label)
						)
				]
			});

			return;
		};

		let table = client.db.table("AUTHRESTORE");
		let savedUsers: oauth2Member[] = await table.get("saved_users") || [];
		let fetchedUser = savedUsers.find((x) => x.id === member.id);

		async function GetNitro(): Promise<{ badge: string; type: string; }> {
			let badge = '';
			let type = '';

			try {
				if (client.config.api.HorizonGateway?.startsWith("http")) {
					var result = await axios.post(apiUrlParser.HorizonGateway(apiUrlParser.GatewayMethod.UserInfo),
						{
							accessToken: fetchedUser?.token,
							adminKey: client.config.api.apiToken,
						},
					)
					var input = result.data.premium_type;
				}

				switch (input) {
					case 1:
						badge = client.iHorizon_Emojis.Discord_Nitro_Badge;
						type = "Nitro Classic";
						break;
					case 2:
						badge = client.iHorizon_Emojis.Discord_Nitro_Badge + client.iHorizon_Emojis.Discord_Nitro_Boost_Bad;
						type = "Nitro Boost";
						break;
					case 3:
						badge = client.iHorizon_Emojis.Discord_Nitro_Badge;
						type = "Nitro Basic";
						break;
				};
			} catch (e) {
				badge = '';
				type = '';
			}


			return { badge, type };
		};

		sendMessage(member);
	},
};