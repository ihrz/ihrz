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
	EmbedBuilder,
	ChatInputCommandInteraction,
	ApplicationCommandType,
	Message
} from 'discord.js'

import { Command } from '../../../../types/command.js';
import { LanguageData } from '../../../../types/languageData.js';

// Get statistics from all shards
export const getShardStats = async (client: Client) => {
	if (!client.shard) {
		// No sharding - use local cache
		return {
			guilds: client.guilds.cache.size,
			channels: client.channels.cache.size,
			users: client.users.cache.size
		};
	}

	// With sharding - broadcast to all shards
	const shardResults = await client.shard.broadcastEval(client => {
		return {
			guilds: client.guilds.cache.size,
			channels: client.guilds.cache.reduce((acc, guild) => acc + guild.channels.cache.size, 0),
			users: client.guilds.cache.reduce((a, b) => a + b.memberCount, 0)
		};
	});

	// Sum up all results from all shards
	return shardResults.reduce((total, shard) => {
		total.guilds += shard.guilds;
		total.channels += shard.channels;
		total.users += shard.users;
		return total;
	}, { guilds: 0, channels: 0, users: 0 });
};

export const command: Command = {
	name: 'botinfo',

	description: 'Get information about the bot!',
	description_localizations: {
		"fr": "Obtenir les informations supplémentaire par rapport au bot."
	},

	aliases: ["bi"],

	category: 'bot',
	thinking: false,
	type: ApplicationCommandType.ChatInput,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, options?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		const stats = await getShardStats(client);

		let clientembed = new EmbedBuilder()
			.setColor(await client.db.get(`${interaction.guild?.id}.GUILD.GUILD_CONFIG.embed_color.all`) || "#f0d020")
			.setThumbnail("attachment://footer_icon.png")
			.addFields(
				{ name: lang.botinfo_embed_fields_myname, value: `\`\`\`${client.user.username}\`\`\``, inline: false },
				{ name: lang.botinfo_embed_fields_mychannels, value: `\`\`\`py\n${stats.channels}\`\`\``, inline: false },
				{ name: lang.botinfo_embed_fields_myservers, value: `\`\`\`py\n${stats.guilds}\`\`\``, inline: false },
				{ name: lang.botinfo_embed_fields_members, value: `\`\`\`py\n${stats.users}\`\`\``, inline: false },
				{ name: lang.botinfo_embed_fields_libraires, value: `\`\`\`py\ndiscord.js@${client.version.djs}\`\`\``, inline: false },
				{ name: lang.botinfo_embed_fields_created_at, value: "<t:1600042320:R>", inline: false },
				{ name: lang.botinfo_embed_fields_created_by, value: "<@171356978310938624>", inline: false }
			)
			.setTimestamp()
			.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!))
			.setTimestamp();

		await client.func.method.interactionSend(interaction, { embeds: [clientembed], files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)] });
		return;
	},
	permission: null
};
