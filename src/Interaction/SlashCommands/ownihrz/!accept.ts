/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import {
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { Custom_iHorizon } from '../../../../types/ownihrz.js';

import logger from '../../../core/logger.js';

import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached">, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

		let cluster = parseInt(interaction.options.getString("cluster")!);
		let id = interaction.options.getString('id')!;

		var table = client.db.table("TEMP");
		let allData = await table.get(`OWNIHRZ`);

		function getData() {
			for (let ownerId in allData) {
				for (let botId in allData[ownerId]) {
					if (botId !== id) continue;
					return allData[ownerId][botId];
				}
			}
		}
		let id_2 = getData() as Custom_iHorizon;

		if (!id_2) {
			await interaction.reply({ content: lang.mybot_manage_accept_not_found });
			return;
		};

		id_2.AdminKey = client.config.api?.apiToken!;
		id_2.Code = id;

		await client.ownihrz.Active_Intents(id_2.Auth).catch(() => { })

		if (!client.owners.includes(interaction.user.id)) {
			await interaction.reply({ content: client.iHorizon_Emojis.icon.No_Logo, flags: [1 << 6] });
			return;
		};

		let bot_1 = (await client.ownihrz.Get_Bot(id_2.Auth).catch(() => { }))?.data || 404

		if (!bot_1.bot) {
			await interaction.reply({ content: lang.mybot_manage_accept_token_error });
			return;
		} else {

			let utils_msg = lang.mybot_manage_accept_utils_msg
				.replace('${bot_1.bot.id}', bot_1.bot.id)
				.replace('${bot_1.bot.username}', bot_1.bot.username)
				.replace("${bot_1.bot_public ? 'Yes' : 'No'}",
					bot_1.bot_public ? lang.mybot_manage_accept_utiis_yes : lang.mybot_manage_accept_utils_no
				);

			let embed = new EmbedBuilder()
				.setColor('#ff7f50')
				.setTitle(lang.mybot_manage_accept_embed_title
					.replace('${bot_1.bot.username}', bot_1.bot.username)
					.replace('${bot_1.bot.discriminator}', bot_1.bot.discriminator)
				)
				.setDescription(lang.mybot_manage_accept_embed_desc
					.replace('${utils_msg}', utils_msg)
				)
				.setFooter(await client.func.displayBotName.footerBuilder(interaction));

			await interaction.reply({
				content: `${interaction.user.toString()}, <@${id_2.OwnerOne}>\n\`[Administrator Invite Link]\` **>>** https://discord.com/oauth2/authorize?client_id=${id_2.Bot.Id}&scope=bot&permissions=8\n\`[Normal Invite Link]\` **>>** https://discord.com/oauth2/authorize?client_id=${id_2.Bot.Id}&scope=bot&permissions=0`,
				embeds: [embed],
				ephemeral: false,
				files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
			});

			try {
				client.ownihrz.Create_Container(cluster, id_2).then(async () => {
					await table.delete(`OWNIHRZ.${interaction.user.id}.${id}`);
				});

			} catch (error: any) {
				return logger.err(error)
			};

			return;
		};
	},
};