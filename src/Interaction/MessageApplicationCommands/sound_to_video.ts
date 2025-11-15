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

import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import {
	Client,
	EmbedBuilder,
	ApplicationCommandType,
	MessageContextMenuCommandInteraction,
	MessageFlags,
	AttachmentBuilder,
} from "discord.js";
import { AnotherCommand } from "../../../types/anotherCommand.js";

const execFileAsync = promisify(execFile);

export const command: AnotherCommand = {
	name: "Convert to MP4",
	type: ApplicationCommandType.Message,
	thinking: false,
	permission: null,
	integration_types: [0, 1],
	contexts: [0, 1, 2],
	run: async (client: Client, interaction: MessageContextMenuCommandInteraction) => {
		const lang = await client.func.getLanguageData(interaction.guildId);

		if (await client.func.helper.cooldown(interaction.user.id, "convert2mp4", client.timeCalculator.to_ms("1m30s")!)) {
			return interaction.reply({ content: lang.media_gen_cooldown })
		};

		try {
			const message = interaction.targetMessage;

			if (!message) {
				await interaction.reply({ content: lang.global_unknown_message, flags: MessageFlags.Ephemeral });
				return;
			}

			const attachment = message.attachments.first();
			if (!attachment) {
				const embed = new EmbedBuilder()
					.setTitle(lang.global_error)
					.setColor("#ff0000")
					.setDescription(lang.global_not_atc)
					.setTimestamp();
				await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
				return;
			}

			const contentType = attachment.contentType ?? "";
			if (!contentType.startsWith("audio/") && !/\.(ogg|mp3|wav|m4a|webm|flac|aac)$/i.test(attachment.name || "")) {
				const embed = new EmbedBuilder()
					.setTitle("❌ Error")
					.setColor("#ff0000")
					.setDescription(lang.global_not_valid_atc)
					.setTimestamp();
				await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.reply({ content: client.iHorizon_Emojis.Discord_Loading });

			const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ihrz-audiomp4-"));
			const inputPath = path.join(tmpDir, attachment.name ?? "input_audio");
			const outputPath = path.join(tmpDir, "output.mp4");

			const res = await fetch(attachment.url);
			if (!res.ok) throw new Error(`Échec téléchargement: ${res.status} ${res.statusText}`);
			const arrayBuffer = await res.arrayBuffer();
			fs.writeFileSync(inputPath, Buffer.from(arrayBuffer));

			let audioDuration: number;
			try {
				const { stdout: probeOutput } = await execFileAsync("ffprobe", [
					"-v", "error",
					"-show_entries", "format=duration",
					"-of", "default=noprint_wrappers=1:nokey=1",
					inputPath
				]);
				audioDuration = parseFloat(probeOutput.trim());
				if (isNaN(audioDuration) || audioDuration <= 0) {
					throw new Error("Durée audio invalide");
				}
			} catch (probeErr) {
				throw new Error("Erreur ffprobe: " + (probeErr as Error).message);
			}

			const fileTitle = path.parse(attachment.name || "Audio").base;
			const escapedTitle = fileTitle.replace(/[\\:]/g, '\\$&').replace(/'/g, "\\'");

			try {
				await execFileAsync("ffmpeg", [
					"-y",
					"-f", "lavfi",
					"-i", `color=c=black:s=1280x720:r=1:d=${audioDuration}`,
					"-i", inputPath,
					"-vf", `drawtext=text='${escapedTitle}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`,
					"-c:v", "libx264",
					"-tune", "stillimage",
					"-c:a", "aac",
					"-b:a", "192k",
					"-pix_fmt", "yuv420p",
					"-r", "1",
					"-movflags", "+faststart",
					outputPath
				], { maxBuffer: 1024 * 1024 * 50 });
			} catch (ffErr) {
				throw new Error("Erreur ffmpeg: " + (ffErr as Error).message);
			}

			const stats = fs.statSync(outputPath);
			const fileSizeMB = stats.size / (1024 * 1024);

			if (fileSizeMB > 25) {
				const embed = new EmbedBuilder()
					.setTitle(lang.global_error)
					.setColor("#ff0000")
					.setDescription(lang.global_too_heavy_file.replace("${fileSizeMB.toFixed(2)}", fileSizeMB.toFixed(2)))
					.setTimestamp();
				await interaction.editReply({ content: "", embeds: [embed] });
			} else {
				const mp4Attachment = new AttachmentBuilder(outputPath, {
					name: `${path.parse(attachment.name || "audio").name}.mp4`
				});

				const embed = new EmbedBuilder()
					.setTitle(lang.global_convert_ok)
					.setColor("#00ff00")
					.setDescription(lang.global_convert_ok_desc.replace("${fileSizeMB.toFixed(2)}", fileSizeMB.toFixed(2)))
					.setTimestamp();

				await interaction.editReply({
					content: null,
					embeds: [embed],
					files: [mp4Attachment]
				});
			}

			try {
				fs.rmSync(tmpDir, { recursive: true, force: true });
			} catch (e) {
				console.warn("Cleanup failed:", e);
			}

		} catch (err) {
			console.error("Audio to MP4 Conversion Error:", err);
			const embed = new EmbedBuilder()
				.setTitle(lang.global_error)
				.setColor("#ff0000")
				.setTimestamp();

			try {
				if (interaction.deferred || interaction.replied) {
					await interaction.editReply({ content: "", embeds: [embed] });
				} else {
					await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
				}
			} catch (e) {
				console.error("Reply failed:", e);
			}
		}

		return;
	},
};