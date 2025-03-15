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
	Client,
	EmbedBuilder,
	PermissionsBitField,
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	Role,
	Guild,
	ApplicationCommandType,
	Message,
	MessagePayload,
	InteractionEditReplyOptions,
	MessageReplyOptions
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';


import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var action = interaction.options.getString("action");
			var role = interaction.options.getRole("role");
		} else {

			var action = client.func.method.string(args!, 0);
			var role = client.func.method.role(interaction, args!, 1);
		};

		let a: number = 0;
		let s: number = 0;
		let e: number = 0;

		if ((interaction.guild as Guild).memberCount >= 5500) {
			await client.func.method.interactionSend(interaction, { content: lang.massiverole_too_much_member });
			return;
		};

		let ogInteraction = await client.func.method.interactionSend(interaction, {
			content: client.iHorizon_Emojis.icon.iHorizon_Discord_Loading
		});

		if (action === 'add') {

			try {
				let members = await interaction.guild.members.fetch();
				let promises = [];

				for (let [memberID, member] of members!) {
					if (!member.roles.cache.has(role?.id!)) {
						let promise = await member.roles.add(role as Role, "[Massrole] Module")
							.then(() => {
								a++;
							})
							.catch(() => {
								e++;
							});
						promises.push(promise);
					} else {
						s++;
					}
				};

				await Promise.all(promises);
			} catch (error) { };

			let embed = new EmbedBuilder()
				.setFooter(await client.func.displayBotName.footerBuilder(interaction))
				.setColor('#007fff')
				.setTimestamp()
				.setThumbnail(interaction.guild.iconURL())
				.setDescription(lang.massiverole_add_command_work
					.replace('${interaction.user}', interaction.member.user.toString())
					.replace('${a}', a.toString())
					.replace('${s}', s.toString())
					.replace('${e}', e.toString())
					.replaceAll('${role}', role?.toString()!)
				);

			await ogInteraction.edit({
				content: null,
				embeds: [embed],
				files: [await interaction.client.func.displayBotName.footerAttachmentBuilder(interaction)]
			});
			return;
		} else if (action === 'sub') {

			try {
				let members = await interaction.guild.members.fetch();
				let promises = [];

				for (let [memberID, member] of members!) {
					if (member.roles.cache.has(role?.id!)) {
						let promise = await member.roles.remove(role as Role, "[MassiveRole] Command")
							.then(() => {
								a++;
							})
							.catch(() => {
								e++;
							});
						promises.push(promise);
					} else {
						s++;
					}
				};

				await Promise.all(promises);
			} catch (error) { };

			let embed = new EmbedBuilder()
				.setFooter(await client.func.displayBotName.footerBuilder(interaction))
				.setColor('#007fff')
				.setTimestamp()
				.setThumbnail(interaction.guild.iconURL())
				.setDescription(lang.massiverole_sub_command_work
					.replace('${interaction.user}', interaction.member.user.toString())
					.replace('${a}', a.toString())
					.replace('${s}', s.toString())
					.replace('${e}', e.toString())
					.replaceAll('${role}', role?.toString()!)
				);

			await ogInteraction.edit({
				content: null,
				embeds: [embed],
				files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
			});
			return;
		};

		return;
	},
};