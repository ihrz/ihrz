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

import { Client, CommandInteractionOptionResolver, Interaction, ChatInputCommandInteraction, BaseGuildTextChannel } from 'discord.js';
import { promises as fs } from 'fs';
import path from 'path';
import { BotEvent } from '../../../types/event.js';
import { ParsedSavedCommand } from '../../core/converters/slashLog.js';

/**
 * Safe JSON logger that handles concurrent writes without blocking the event loop
 */
class SafeJSONLogger {
	private logPath: string;
	private writeQueue: ParsedSavedCommand[] = [];
	private isWriting: boolean = false;
	private writeTimer: NodeJS.Timeout | null = null;
	private readonly BATCH_SIZE = 10; // Write in batches of 10 commands
	private readonly WRITE_DELAY = 1000; // Wait 1 second before writing (batching)

	constructor(logPath: string) {
		this.logPath = logPath;
		this.ensureFileExists();
	}

	/**
	 * Ensure the log file exists and has valid JSON structure
	 */
	private async ensureFileExists(): Promise<void> {
		try {
			await fs.access(this.logPath);
			// Check if file is valid JSON
			const content = await fs.readFile(this.logPath, 'utf-8');
			if (content.trim() === '') {
				await fs.writeFile(this.logPath, '[]', 'utf-8');
			} else {
				JSON.parse(content); // Validate JSON
			}
		} catch (error) {
			// File doesn't exist or is invalid, create it
			await fs.mkdir(path.dirname(this.logPath), { recursive: true });
			await fs.writeFile(this.logPath, '[]', 'utf-8');
		}
	}

	/**
	 * Add a command to the write queue (non-blocking)
	 * @param command - Command to log
	 */
	public addCommand(command: ParsedSavedCommand): void {
		this.writeQueue.push(command);

		// Schedule a write if not already scheduled
		if (!this.writeTimer) {
			this.writeTimer = setTimeout(() => {
				this.flushQueue();
			}, this.WRITE_DELAY);
		}

		// Force write if queue gets too large
		if (this.writeQueue.length >= this.BATCH_SIZE) {
			this.flushQueue();
		}
	}

	/**
	 * Flush the queue and write to file (async, non-blocking)
	 */
	private async flushQueue(): Promise<void> {
		if (this.isWriting || this.writeQueue.length === 0) {
			return;
		}

		this.isWriting = true;

		// Clear the timer
		if (this.writeTimer) {
			clearTimeout(this.writeTimer);
			this.writeTimer = null;
		}

		// Get commands to write and clear the queue
		const commandsToWrite = [...this.writeQueue];
		this.writeQueue = [];

		try {
			await this.writeCommandsToFile(commandsToWrite);
		} catch (error) {
			console.error('Error writing commands to log file:', error);
			// Re-add commands to queue on error
			this.writeQueue.unshift(...commandsToWrite);
		} finally {
			this.isWriting = false;

			// If more commands were added while writing, schedule another write
			if (this.writeQueue.length > 0) {
				this.writeTimer = setTimeout(() => {
					this.flushQueue();
				}, this.WRITE_DELAY);
			}
		}
	}

	/**
	 * Write commands to file safely
	 * @param commands - Commands to write
	 */
	private async writeCommandsToFile(commands: ParsedSavedCommand[]): Promise<void> {
		let existingData: ParsedSavedCommand[] = [];

		try {
			const fileContent = await fs.readFile(this.logPath, 'utf-8');
			if (fileContent.trim()) {
				existingData = JSON.parse(fileContent);
			}
		} catch (error) {
			console.warn('Could not read existing log file, starting fresh:', error);
			existingData = [];
		}

		// Add new commands
		existingData.push(...commands);

		// Optional: Keep only last 10000 commands to prevent file from growing too large
		if (existingData.length > 10000) {
			existingData = existingData.slice(-10000);
		}

		// Write atomically
		const tempPath = this.logPath + '.tmp';
		await fs.writeFile(tempPath, JSON.stringify(existingData, null, 2), 'utf-8');
		await fs.rename(tempPath, this.logPath);
	}

	/**
	 * Force flush all pending commands (useful for graceful shutdown)
	 */
	public async forceFlush(): Promise<void> {
		if (this.writeTimer) {
			clearTimeout(this.writeTimer);
			this.writeTimer = null;
		}

		while (this.writeQueue.length > 0 || this.isWriting) {
			await this.flushQueue();
			// Small delay to prevent busy waiting
			await new Promise(resolve => setTimeout(resolve, 10));
		}
	}
}

const logger = new SafeJSONLogger(path.join(process.cwd(), 'src', 'files', 'slash.log.json'));

process.on('SIGINT', async () => {
	console.log('Flushing command logs before shutdown...');
	await logger.forceFlush();
	process.exit(0);
});

process.on('SIGTERM', async () => {
	console.log('Flushing command logs before shutdown...');
	await logger.forceFlush();
	process.exit(0);
});

export const event: BotEvent = {
	name: "interactionCreate",
	run: async (client: Client, interaction: Interaction) => {

		if (!interaction.isCommand()
			|| !interaction.guild?.channels
			|| interaction.user.bot) return;

		const optionsList: string[] = ((interaction as ChatInputCommandInteraction).options as CommandInteractionOptionResolver)["_hoistedOptions"].map(element => `${element.name}:"${element.value}"`)
		let subCmd: string = '';

		if (((interaction as ChatInputCommandInteraction).options as CommandInteractionOptionResolver)["_subcommand"]) {
			if (((interaction as ChatInputCommandInteraction).options as CommandInteractionOptionResolver).getSubcommandGroup()) subCmd += ((interaction as ChatInputCommandInteraction).options as CommandInteractionOptionResolver).getSubcommandGroup()! + " ";
			subCmd += ((interaction as ChatInputCommandInteraction).options as CommandInteractionOptionResolver).getSubcommand()
		};

		const commandLog: ParsedSavedCommand = {
			channelName: (interaction.channel as BaseGuildTextChannel).name,
			command: `/${subCmd} ${optionsList?.join(' ')}`.trim(),
			executorUsername: interaction.user.username,
			guildName: interaction.guild.name,
			guildId: interaction.guildId!,
			timestamp: Date.now(),
			channelId: interaction.channelId
		};

		logger.addCommand(commandLog);
	},
};
