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
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Message,
	User
} from 'discord.js';

import { LanguageData } from '../../../../../types/languageData.js';
import { axios } from '../../../../core/functions/axios.js';



import { SubCommand } from '../../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var user: User | undefined = interaction.options.getUser('user') || interaction.user;
		} else {

			var user: User | undefined = await client.func.method.user(interaction, args!, 0) || interaction.author;
		};

		let format = 'png';

		const config = {
			headers: {
				Authorization: `Bot ${client.token}`
			}
		};

		const user_1 = (await axios.get(`https://discord.com/api/v10/users/${user?.id}`, config))?.data;
		const banner = user_1?.banner;

		if (!banner) {
			client.func.method.interactionSend(interaction, {
				content: lang.banner_user_no_banner
			})
			return;
		}

		if (banner !== null && banner?.startsWith('a_')) {
			format = 'gif'
		};

		let embed = new EmbedBuilder()
			.setColor(await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.embed_color.utils-cmd`) || '#c4afed')
			.setTitle(lang.banner_user_embed.replace('${user?.username}', user?.username))
			.setImage(`https://cdn.discordapp.com/banners/${user_1?.id}/${banner}.${format}?size=1024`)
			.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!));

		await client.func.method.interactionSend(interaction, {
			embeds: [embed],
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
		});
		return;
	},
};