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
	Attachment,
	ChatInputCommandInteraction,
	Client,
	GuildEmoji,
	Message
} from "discord.js";
import JSZip from "jszip";
import { LanguageData } from "../../../../../types/languageData.js";
import { SubCommand } from "../../../../../types/command.js";

const MAX_ZIP_BYTES = 8 * 1024 * 1024;
const MAX_EMOJI_BYTES = 256 * 1024;
const MAX_EMOJIS = 50;

async function readCapped(
	response: Response,
	maxBytes: number
): Promise<Buffer | null> {
	const declared = Number(response.headers.get("content-length"));
	if (declared > maxBytes || !response.body) return null;

	const chunks: Uint8Array[] = [];
	let total = 0;
	for await (const chunk of response.body as any as AsyncIterable<Uint8Array>) {
		total += chunk.byteLength;
		if (total > maxBytes) return null;
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}

// Decompresses one entry, giving up as soon as it exceeds maxBytes: the size
// declared in the zip can lie (zip bomb), and async() would inflate it all.
export function readZipEntryCapped(
	file: JSZip.JSZipObject,
	maxBytes: number
): Promise<Buffer | null> {
	const stream = (
		file as unknown as {
			internalStream(
				type: "uint8array"
			): JSZip.JSZipStreamHelper<Uint8Array>;
		}
	).internalStream("uint8array");

	return new Promise((resolve) => {
		const chunks: Uint8Array[] = [];
		let total = 0;
		let settled = false;
		const settle = (value: Buffer | null) => {
			if (settled) return;
			settled = true;
			resolve(value);
		};

		stream
			.on("data", (chunk) => {
				if (settled) return;
				total += chunk.byteLength;
				if (total > maxBytes) {
					stream.pause();
					settle(null);
					return;
				}
				chunks.push(chunk);
			})
			.on("error", () => settle(null))
			.on("end", () => settle(Buffer.concat(chunks)))
			.resume();
	});
}

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		if (!interaction.guild) return;

		if (interaction instanceof ChatInputCommandInteraction) {
			var zipAttachment = interaction.options.getAttachment(
				"zip_file",
				true
			);
		} else {
			var zipAttachment = interaction.attachments.first()!;
		}

		if (!zipAttachment) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_unzip_emojis_command_no_file,
				flags: [1 << 6]
			});
			return;
		}

		const time = Date.now();

		try {
			if (zipAttachment.size > MAX_ZIP_BYTES) {
				await client.func.method.interactionSend(interaction, {
					content: lang.util_unzip_emojis_command_error,
					flags: [1 << 6]
				});
				return;
			}

			const response = await fetch(zipAttachment.url, {
				signal: AbortSignal.timeout(30_000)
			});
			const zipBuffer = await readCapped(response, MAX_ZIP_BYTES);

			if (!zipBuffer) {
				await client.func.method.interactionSend(interaction, {
					content: lang.util_unzip_emojis_command_error,
					flags: [1 << 6]
				});
				return;
			}

			const zip = new JSZip();
			const zipContents = await zip.loadAsync(zipBuffer);

			const emojis: [string, JSZip.JSZipObject][] = [];

			Object.entries(zipContents.files).filter(([filename, file]) => {
				// Extract just the filename by splitting on '/' and taking the last part
				const bareFileName = filename.split("/").pop() || "";

				if (emojis.length >= MAX_EMOJIS) return false;

				const declaredSize = (file as any)._data?.uncompressedSize;
				if (
					typeof declaredSize !== "number" ||
					declaredSize > MAX_EMOJI_BYTES
				)
					return false;

				const match = bareFileName.match(/^(.+)_(\d+)\.(png|gif)$/);
				if (!match) return false;

				const [, name, id, extension] = match;
				const cleanedName = name.replace(/_/g, " ");
				const emojiName = cleanedName
					.replace(/[^\w\s]/g, "")
					.slice(0, 32);

				if (
					interaction.guild!.emojis.cache.some(
						(emoji) => emoji.name === emojiName
					)
				)
					return false;
				emojis.push([emojiName, file]);
				return true;
			});

			// One entry at a time: each one can inflate up to ~17 MB before
			// readZipEntryCapped stops it (one 16 KB deflate block).
			const createdEmojis: GuildEmoji[] = [];
			for (const [emojiName, file] of emojis) {
				const fileBuffer = await readZipEntryCapped(
					file,
					MAX_EMOJI_BYTES
				);
				if (!fileBuffer) continue;

				const emoji = await interaction
					.guild!.emojis.create({
						name: emojiName,
						attachment: fileBuffer
					})
					.catch(() => null);
				if (emoji) createdEmojis.push(emoji);
			}

			// Respond with results
			const calcTime = Date.now() - time;
			await client.func.method.interactionSend(interaction, {
				content: lang.util_unzip_emojis_command_work
					.replace("${calcTime}", String(calcTime))
					.replace("${emojiCount}", String(createdEmojis.length)),
				flags: [1 << 6]
			});
		} catch (error) {
			await client.func.method.interactionSend(interaction, {
				content: lang.util_unzip_emojis_command_error,
				flags: [1 << 6]
			});
		}
	}
};
