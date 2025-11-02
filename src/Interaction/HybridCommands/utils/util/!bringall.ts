import {
	Client,
	EmbedBuilder,
	ChatInputCommandInteraction,
	ChannelType,
	BaseGuildVoiceChannel,
	VoiceChannel,
	Message,
	CategoryChannel
} from 'discord.js';

import { LanguageData } from '../../../../../types/languageData.js';
import { SubCommand } from '../../../../../types/command.js';

export const subCommand: SubCommand = {
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {

		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var fromChannel = interaction.options.getChannel('from') as BaseGuildVoiceChannel | null;
			var category = interaction.options.getChannel('category') as CategoryChannel | null;
		} else {
			var fromChannel = await client.func.method.voiceChannel(interaction, args!, 0);
			var categoryId = client.func.method.string(args!, 1);
			var category = categoryId ? interaction.guild.channels.cache.get(categoryId) as CategoryChannel | null : null;
		}

		// Validate inputs
		if (!fromChannel) {
			return await client.func.method.interactionSend(interaction, {
				content: lang.bringall_no_from_channel
			});
		}

		if (!category || category.type !== ChannelType.GuildCategory) {
			return await client.func.method.interactionSend(interaction, {
				content: lang.bringall_invalid_category
			});
		}

		// Get all voice channels in the target category
		const targetVoiceChannels = Array.from(category.children.cache.values())
			.filter(channel =>
				channel.type === ChannelType.GuildVoice ||
				channel.type === ChannelType.GuildStageVoice
			) as BaseGuildVoiceChannel[];

		if (targetVoiceChannels.length === 0) {
			return await client.func.method.interactionSend(interaction, {
				content: lang.bringall_no_voice_channels
			});
		}

		const membersToMove = Array.from(fromChannel.members.values());

		if (membersToMove.length === 0) {
			return await client.func.method.interactionSend(interaction, {
				content: lang.bringall_no_members
			});
		}

		let movedCount = 0;
		let errorCount = 0;

		await client.func.method.interactionSend(interaction, {
			content: client.iHorizon_Emojis.Discord_Loading
		});

		// Shuffle members randomly
		const shuffledMembers = membersToMove.sort(() => Math.random() - 0.5);

		// Distribute members across voice channels
		for (let i = 0; i < shuffledMembers.length; i++) {
			const member = shuffledMembers[i];
			const targetChannel = targetVoiceChannels[i % targetVoiceChannels.length];

			try {
				await member.voice.setChannel(targetChannel as VoiceChannel);
				movedCount++;
			} catch (error) {
				errorCount++;
			}
		}

		const embed = new EmbedBuilder()
			.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!))
			.setColor('#007fff')
			.setTimestamp()
			.setThumbnail(interaction.guild.iconURL())
			.setDescription(lang.bringall_results
				.replace('${interaction.user}', interaction.member.user.toString())
				.replace('${movedCount}', movedCount.toString())
				.replace('${errorCount}', errorCount.toString())
				.replace('${fromChannel}', fromChannel.toString())
				.replace('${category}', category.toString())
				.replace('${channelCount}', targetVoiceChannels.length.toString())
			);

		await client.func.method.interactionSend(interaction, {
			content: null,
			embeds: [embed],
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
		});
	},
};