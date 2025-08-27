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

import { Attachment, AttachmentBuilder, BaseGuildTextChannel, Client, EmbedBuilder, Message } from 'discord.js';
import { AxiosResponse, axios } from '../../core/functions/axios.js';

import { BotEvent } from '../../../types/event.js';

export const event: BotEvent = {
	name: "messageDelete",
	run: async (client: Client, message: Message) => {

		const data = await client.func.getLanguageData(message.guildId);
		if (!message.guild || !message.author
			|| message.author.id == client.user?.id) return;

		const someinfo = await client.db.get(`${message.guild.id}.GUILD.SERVER_LOGS.message`);
		if (!someinfo) return;

		const Msgchannel = message.guild.channels.cache.get(someinfo);
		if (!Msgchannel) return;

		let iconURL = message.author.displayAvatarURL();
		let saves_emb: EmbedBuilder[] = [];
		let logsEmbed = new EmbedBuilder()
			.setColor(await client.db.get(`${message.guild.id}.GUILD.GUILD_CONFIG.embed_color.audits-logs`) || "#000000")
			.setAuthor({
				name: message.author.username,
				iconURL: iconURL
			})
			.setDescription(data.event_srvLogs_messageDelete_description
				.replace("${message.channel.id}", message.channel.id)
				.replace("${message.content}", ' ' + message.content)
			)
			.setTimestamp();

		if (message.attachments.size >= 1) {
			const attachments = message.attachments;
			const attachment = attachments.first();
			if (!attachment || !attachment.contentType) return;

			if (attachments.size >= 2) {
				const files: AttachmentBuilder[] = [];

				async function getFile(file: Attachment) {
					const response = await axios.get(file['attachment'] as string, { responseType: 'arrayBuffer' });
					const attachment = new AttachmentBuilder(Buffer.from(response.data, 'base64'), { name: file?.name });
					files.push(attachment);
				}

				const filePromises = attachments.map(async (file) => {
					await getFile(file);
				});

				await Promise.all(filePromises);

				await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed], files: files }).catch(() => { });
				return;
			} else if (attachment && attachment.contentType.startsWith('image/')) {
				let snipedImage: AttachmentBuilder;

				await axios.get((attachment['attachment'] as string), { responseType: 'arrayBuffer' }).then((response: AxiosResponse) => {
					snipedImage = new AttachmentBuilder(Buffer.from(response.data, 'base64'), { name: 'sniped-image-by-ihorizon.png' });
					logsEmbed.setImage(`attachment://sniped-image-by-ihorizon.png`);
				});

				await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed], files: [snipedImage!] }).catch(() => { });
				return;
			} else if (attachment) {
				let snipedFiles: AttachmentBuilder;

				await axios.get((attachment['attachment'] as string), { responseType: 'arrayBuffer' }).then((response: AxiosResponse) => {
					snipedFiles = new AttachmentBuilder(Buffer.from(response.data, 'base64'), { name: attachment?.name });
				});

				await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed], files: [snipedFiles!] }).catch(() => { });
				return;
			}
		} else if (message.embeds) {
			for (const embed in message.embeds) {
				saves_emb.push(EmbedBuilder.from(message.embeds[embed]))
			}
		}

		await (Msgchannel as BaseGuildTextChannel).send({ embeds: [logsEmbed, ...saves_emb] }).catch(() => { });
		return;
	},
};