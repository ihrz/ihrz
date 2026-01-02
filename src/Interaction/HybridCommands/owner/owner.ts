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
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	ApplicationCommandType,
	Message
} from 'discord.js'

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';

export const command: Command = {
	name: 'owner',

	description: 'add user to owner list (can\'t be used by normal member)!',
	description_localizations: {
		"fr": "Ajoutez un membre dans la liste des propriétaire de iHorizon. (Seulement pour les dev)"
	},

	aliases: ["addowner", "owneradd", "owners", "ownerlist"],

	options: [
		{
			name: 'member',
			type: ApplicationCommandOptionType.User,

			description: 'The member you want to made owner of the iHorizon Projects',
			description_localizations: {
				"fr": "Le membre que vous souhaitez rendre propriétaire des projets iHorizon"
			},

			required: false,

			permission: null
		}
	],
	thinking: false,
	permission: null,
	category: 'owner',
	type: ApplicationCommandType.ChatInput,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		if (await client.func.ownerHelper.isBotOwner(interaction.member?.user.id!)) {
			run_for_bot_owner(client, interaction, lang, args)
		} else {
			run_for_guild_owner(client, interaction, lang, args)
		}
	},
};

export async function run_for_bot_owner(client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) {
	// Guard's Typing
	if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

	let text = "";
	const char = await client.func.ownerHelper.getBotOwner();

	for (const entry of char) {
		text += `<@${entry}>\n`;
	}

	if (!client.func.ownerHelper.isBotOwner(interaction.member.user.id)) {
		await client.func.method.interactionSend(interaction, { content: lang.owner_not_owner });
		return;
	};

	const embed = new EmbedBuilder()
		.setColor("#2E2EFE")
		.setAuthor({ name: "Owners [Bot]" })
		.setDescription(text)
		.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!));

	if (interaction instanceof ChatInputCommandInteraction) {
		var member = interaction.options.getUser('member');
	} else {
		var member = await client.func.method.user(interaction, args!, 0);
	};

	if (!member) {
		await client.func.method.interactionSend(interaction, { embeds: [embed], files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)] });
		return;
	};


	const is_owner = await client.func.ownerHelper.isBotOwner(member.id);

	if (is_owner) {
		await client.func.method.interactionSend(interaction, { content: lang.owner_already_owner });
		return;
	};

	await client.func.ownerHelper.addBotOwner(member.id);

	await client.func.method.interactionSend(interaction, { content: lang.owner_is_now_owner.replace(/\${member\.user\.username}/g, member.globalName || member.displayName) });
	return;
}

export async function run_for_guild_owner(client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) {
	// Guard's Typing
	if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

	let text = "";
	const char = await client.func.ownerHelper.getGuildOwner(interaction.guild);

	for (const entry of char) {
		text += `<@${entry}>\n`;
	}

	if (!await client.func.ownerHelper.isGuildOwner(interaction.member.user.id, interaction.guild)) {
		await client.func.method.interactionSend(interaction, { content: lang.owner_not_owner });
		return;
	};

	const embed = new EmbedBuilder()
		.setColor("#2E2EFE")
		.setAuthor({ name: "Owners [Guild]" })
		.setDescription(text)
		.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!));

	if (interaction instanceof ChatInputCommandInteraction) {
		var member = interaction.options.getUser('member');
	} else {
		var member = await client.func.method.user(interaction, args!, 0);
	};

	if (!member) {
		await client.func.method.interactionSend(interaction, { embeds: [embed], files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)] });
		return;
	};


	const is_owner = await client.func.ownerHelper.isGuildOwner(member.id, interaction.guild);

	if (is_owner) {
		await client.func.method.interactionSend(interaction, { content: lang.owner_already_owner });
		return;
	};

	await client.func.ownerHelper.addGuildOwner(member.id, interaction.guild.id);

	await client.func.method.interactionSend(interaction, { content: lang.owner_is_now_owner.replace(/\${member\.user\.username}/g, member.globalName || member.displayName) });
	return;
}