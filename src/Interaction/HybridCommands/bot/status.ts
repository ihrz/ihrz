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
	time,
	ApplicationCommandType,
	Message
} from 'discord.js'

import { LanguageData } from '../../../../types/languageData.js';
import { Command } from '../../../../types/command.js';

import os from 'node:os';
import { existsSync, readFile } from 'node:fs';
import { exec } from 'node:child_process';
import { getCacheStorage } from '../../../core/core.js';

function niceBytes(kb: number) {
	let bytes = kb * 1024;

	const units = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
	let unitIndex = 0;

	while (bytes >= 1024 && unitIndex < units.length - 1) {
		bytes /= 1024;
		unitIndex++;
	}

	return `${bytes < 10 && unitIndex > 0 ? bytes.toFixed(2) : bytes.toFixed(0)} ${units[unitIndex]}`;
}

function getMemoryInfo(): Promise<{
	MemTotal: number,
	MemFree: number,
	MemAvailable: number,
}> {
	if (existsSync('/proc/meminfo')) {
		return new Promise((resolve, reject) => {
			readFile('/proc/meminfo', 'utf8', (err, data) => {
				if (err) {
					reject(err);
					return;
				}

				const memInfo: Record<string, number> = {};
				const lines = data.split('\n');

				lines.forEach(line => {
					const parts = line.split(':');
					if (parts.length === 2) {
						const key = parts[0].trim();
						const valueStr = parts[1].trim().split(' ')[0];
						const value = parseInt(valueStr, 10);

						memInfo[key] = value;
					}
				});

				resolve({
					MemTotal: memInfo['MemTotal'],
					MemFree: memInfo['MemFree'],
					MemAvailable: memInfo['MemAvailable'],
				});
			});
		});
		// On macOS
	} else {
		return new Promise((resolve, reject) => {
			// Get total memory with macOS Method
			try {
				exec('sysctl -n hw.memsize', (err: any, stdout: string) => {
					if (err) {
						reject(err);
						return;
					}

					const totalBytes = parseInt(stdout.trim(), 10);
					const totalKB = Math.floor(totalBytes / 1024);

					// Get memory pressure info
					exec('vm_stat', (err2: any, stdout2: string) => {
						if (err2) {
							reject(err2);
							return;
						}

						const lines = stdout2.split('\n');
						let freePages = 0;
						let inactivePages = 0;

						lines.forEach(line => {
							if (line.includes('Pages free:')) {
								freePages = parseInt(line.match(/\d+/)?.[0] || '0', 10);
							} else if (line.includes('Pages inactive:')) {
								inactivePages = parseInt(line.match(/\d+/)?.[0] || '0', 10);
							}
						});

						// Each page is typically 4KB on macOS
						const pageSize = 4096;
						const freeKB = Math.floor((freePages * pageSize) / 1024);
						const availableKB = Math.floor(((freePages + inactivePages) * pageSize) / 1024);

						resolve({
							MemTotal: totalKB,
							MemFree: freeKB,
							MemAvailable: availableKB,
						});
					});
				});
			} catch {
				Promise.resolve({
					MemTotal: os.totalmem(),
					MemFree: os.freemem(),
					MemAvailable: os.totalmem() - os.freemem(),
				})
			}
		});
	}
}

export const command: Command = {
	name: 'status',

	aliases: ["server"],

	description: 'Get the bot status!',
	description_localizations: {
		"fr": "Obtenez le statut du bot !"
	},

	category: 'bot',
	thinking: false,
	type: ApplicationCommandType.ChatInput,
	permission: null,
	run: async (client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message, lang: LanguageData, args?: string[]) => {


		// Guard's Typing
		if (!client.user || !interaction.member || !interaction.guild || !interaction.channel) return;

		// if (!client.owners.includes(interaction.member.user.id)) {
		//     await client.func.method.interactionSend(interaction, { content: lang.status_be_bot_dev });
		//     return;
		// };

		const memInfo = await getMemoryInfo();

		const embed = new EmbedBuilder()
			.setColor("#82cda8")
			.setFields(
				{ name: "Cpu", value: `${os.cpus()[0].model} (${os.machine()})`, inline: false },
				{ name: "Memory", value: `${niceBytes(memInfo["MemTotal"] - memInfo["MemAvailable"])}/${niceBytes(memInfo["MemTotal"])}`, inline: false },
				{ name: "Machine Uptime", value: `${time(new Date(Date.now() - os.uptime() * 1000), 'd')}`, inline: false },
				{ name: "Bot Uptime", value: `${time(new Date(getCacheStorage()?.initialized_timestamp!), 'd')}` },
				{ name: "OS", value: `${os.platform()} ${os.type()} ${os.release()}`, inline: false },
				{ name: "Bot Version", value: `${client.version.ClientVersion}`, inline: false },
				{ name: `${client.iHorizon_Emojis.Bun} Bun Version`, value: `${Bun.version}`, inline: false }
			)
			.setThumbnail(interaction.guild.iconURL() as string)
			.setFooter(await client.func.displayBotName.footerBuilder(interaction.guildId!));

		await client.func.method.interactionSend(interaction, {
			embeds: [embed],
			files: [await client.func.displayBotName.footerAttachmentBuilder(interaction)]
		});
		return;
	},
};