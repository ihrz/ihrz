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
	ActionRowBuilder,
	AuditLogEvent,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Client,
	ComponentType,
	EmbedBuilder,
	Message,
	time,
} from 'discord.js'
import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		let fetchedWebhooks = await interaction.guild?.fetchWebhooks()
		let webhookArray = fetchedWebhooks?.map(webhook => webhook);

		if (!webhookArray || webhookArray?.length == 0) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_no_webhooks
			})
			return;
		}

		let currentPage = 0;
		let usersPerPage = 5;
		let pages: { title: string; description: string; }[] = [];

		for (let i = 0; i < webhookArray.length; i += usersPerPage) {
			let page = webhookArray.slice(i, i + usersPerPage);
			let description = page.map(webhook => {
				let maskedToken = webhook.token?.split('').map(() => '◯').join('');
				return `[${webhook.name}](https://discord.com/api/webhooks/${webhook.id}/${maskedToken}) (${webhook.channel?.toString()})`;
			}).join("\n");

			pages.push({
				title: lang.util_allwebhooks_embed_title,
				description: description
			});
		}

		const createEmbed = () => {
			return new EmbedBuilder()
				.setTitle(pages[currentPage].title)
				.setDescription(pages[currentPage].description)
				.setFooter({
					text: lang.rc_get_secondEmbed_footer
						.replace("${from}", String(currentPage + 1))
						.replace("${to}", String(pages.length))
				})
				.setColor("#72f3f3")
		}

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId("previous")
				.setLabel("<<<")
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId("next")
				.setLabel(">>>")
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId("delete")
				.setEmoji("🗑️")
				.setStyle(ButtonStyle.Danger)
		)


		let message = await client.func.method.interactionSend(interaction, {
			embeds: [createEmbed()],
			components: [row]
		});

		const collector = message.createMessageComponentCollector({
			time: 60000,
			componentType: ComponentType.Button
		});

		collector.on("collect", async (i) => {
			if (i.user.id !== interaction.member?.user.id) {
				await i.reply({
					content: lang.help_not_for_you,
					flags: [1 << 6]
				});
				return;
			}

			if (i.customId === "previous") {
				i.deferUpdate();
				if (currentPage == 0) return;
				currentPage--;
				await message.edit({
					embeds: [createEmbed()],
					components: [row]
				});
			} else if (i.customId === "next") {
				i.deferUpdate();
				if (currentPage == pages.length - 1) return;
				currentPage++;
				await message.edit({
					embeds: [createEmbed()],
					components: [row]
				});
			} else if (i.customId === "delete") {
				i.deferUpdate();
				await message.edit({
					content: lang.util_allwebhooks_deleting,
					components: []
				});

				let u = 0;

				for (let webhook of webhookArray) {
					await webhook.delete().catch(() => false);
					u++;
				}

				await message.edit({
					content: lang.util_allwebhooks_deleted
						.replace("${u}", String(u)),
					components: [],
					embeds: []
				});
			}
		});

		collector.on("end", async () => {
			await message.edit({
				components: []
			});
		});

		return;
	},
};