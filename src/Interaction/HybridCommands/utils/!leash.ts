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
	ApplicationCommandOptionType,
	EmbedBuilder,
	PermissionsBitField,
	ChatInputCommandInteraction,
	ApplicationCommandType,
	Message,
	MessagePayload,
	InteractionEditReplyOptions,
	MessageReplyOptions,
	GuildMember,
	GuildChannel,
	VoiceBasedChannel
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';

import { isInVoiceChannel } from '../../../core/functions/leashModuleHelper.js';
import promptYesOrNo from '../../../core/functions/awaitingResponse.js';
import { DatabaseStructure } from '../../../../types/database_structure.js';
import { Command } from '../../../../types/command.js';

import { SubCommand } from '../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var user = interaction.options.getMember("member")!;
		} else {
			var user = client.func.method.member(interaction, args!, 0)!;
		};

		let baseData = await client.db.get(`${interaction.guildId}.UTILS.LEASH_CONFIG`) || {
			maxLeashedByUsers: 3,
			maxLeashTime: client.timeCalculator.to_ms("30min")
		} as DatabaseStructure.LeashConfig;
		let fetchedData = (await client.db.get(`${interaction.guildId}.UTILS.LEASH`) || []) as DatabaseStructure.LeashData[];
		let filteredData = fetchedData.filter(x => x.dom === interaction.member?.user.id) || [];

		if (filteredData.length >= (baseData.maxLeashedByUsers)) {
			await client.func.method.interactionSend(interaction, { content: lang.util_leash_too_naugthy });
			return;
		}


		if (filteredData.find(x => x.sub === user.id)) {
			await client.func.method.interactionSend(interaction, { content: lang.util_leah_already_owned });
			return;
		}


		if (!isInVoiceChannel(user) || isInVoiceChannel(interaction.member)) {
			let response = await promptYesOrNo(interaction, {
				content: lang.util_leash_confirm_message
					.replace("${client.iHorizon_Emojis.icon.Warning_Icon}", client.iHorizon_Emojis.icon.Warning_Icon)
					.replace("${client.iHorizon_Emojis.icon.No_Logo}", client.iHorizon_Emojis.icon.No_Logo).replace("${client.iHorizon_Emojis.icon.Yes_Logo}", client.iHorizon_Emojis.icon.Yes_Logo),
				yesButton: lang.var_yes,
				noButton: lang.var_no,
				dangerAction: false
			})
			if (!response) {
				await client.func.method.interactionSend(interaction, { content: `${client.iHorizon_Emojis.icon.Yes_Logo} | Leash configurations canceled`, components: [] })
				return;
			}
		}

		fetchedData!.push({ dom: interaction.member.user.id, sub: user.id, timestamp: Date.now() })
		await client.db.set(`${interaction.guildId}.UTILS.LEASH`, Array.from(new Set(fetchedData)));

		await client.func.method.interactionSend(interaction, { content: `${client.iHorizon_Emojis.icon.Yes_Logo} | You have sucessfuly leashed the user in this guild :smirk:`, components: [] })
	},
};