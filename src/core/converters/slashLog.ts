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

// Used thingy LLM IA for this files (claude 4)

import logger from "../logger.ts";

/**
 * Represents a parsed Discord command from log files
 */
interface ParsedSavedCommand {
	guildName: string;
	guildId?: string;
	executorUsername: string;
	timestamp: number;
	channelName: string;
	channelId: string;
	command: string;
}

/**
 * Parser for Discord bot command logs
 * Converts Discord log entries into structured JSON format
 */
class DiscordSlashLogParser {
	/**
	 * Parse a single Discord log line
	 * Expected format: [timestamp] "guildName" #channelName: username: command
	 * @param line - The log line to parse
	 * @returns Parsed command object or null if parsing fails
	 */
	private parseLine(line: string): ParsedSavedCommand | null {
		// Regex pattern to match Discord log format with flexibility
		const logPattern = /^\[([^\]]+)\]\s+"([^"]+)"\s+#([^:]+):\s*([^:]+):\s*(.+)$/;
		const match = line.trim().match(logPattern);

		if (!match) {
			logger.err(`Failed to match line:`.red + ` "${line}"`); // Debug output
			return null;
		}

		const [, timestampStr, guildName, channelName, executorUsername, command] = match;

		// Convert timestamp to Unix timestamp
		const timestamp = this.parseTimestamp(timestampStr);

		// Extract or generate channel ID
		const channelId = this.extractChannelId(channelName);

		return {
			guildName: guildName.trim(),
			executorUsername: executorUsername.trim(),
			timestamp,
			channelName: channelName.trim(),
			channelId,
			command: command.trim()
		};
	}

	/**
	 * Parse timestamp from DD/MM/YYYY HH:MM:SS format to Unix timestamp
	 * @param timestampStr - Timestamp string in DD/MM/YYYY HH:MM:SS format
	 * @returns Unix timestamp in milliseconds
	 */
	private parseTimestamp(timestampStr: string): number {
		const [datePart, timePart] = timestampStr.split(' ');
		const [day, month, year] = datePart.split('/').map(Number);
		const [hours, minutes, seconds] = timePart.split(':').map(Number);

		const date = new Date(year, month - 1, day, hours, minutes, seconds);
		return date.getTime();
	}

	/**
	 * Extract channel ID from channel name
	 * Uses predefined mapping or generates a consistent ID
	 * @param channelName - Name of the Discord channel
	 * @returns Channel ID as string
	 */
	private extractChannelId(channelName: string): string {
		// Predefined channel name to ID mapping
		// In a real scenario, these would come from your Discord bot's data
		const channelIds: { [key: string]: string } = {
			'général': '1395410967525064967',
			'🌍．chat': '1320122624470290536',
			'smash-or-pass': '1368265657807798524',
			'temp-chat': '1234567890123456789',
			'commandes': '1234567890123456790',
			'🏠．accueil': '1234567890123456791',
			'🧩・ voc 1': '1234567890123456792',
			'⛔．chat-owner': '1234567890123456793',
			'💬・chat-évent': '1234567890123456794',
			'⭐〃tropher': '1234567890123456795',
			'🌷˚⋆𝐜𝐡𝐚t⋆˚🌷': '1234567890123456796',
			'🌊・𝐃𝐢𝐬𝐜𝐮𝐬𝐬𝐢𝐨𝐧': '1234567890123456797',
			'logs-raid': '1234567890123456798'
		};

		return channelIds[channelName] || this.generateChannelId(channelName);
	}

	/**
	 * Generate a consistent channel ID based on channel name
	 * Uses a simple hash function to create reproducible IDs
	 * @param channelName - Name of the channel
	 * @returns Generated channel ID as string
	 */
	private generateChannelId(channelName: string): string {
		// Simple hash function for consistent ID generation
		let hash = 0;
		for (let i = 0; i < channelName.length; i++) {
			const char = channelName.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString().padStart(18, '1');
	}

	/**
	 * Parse complete Discord log text into structured commands
	 * Handles multi-line commands and filters empty lines
	 * @param logText - Complete log file content as string
	 * @returns Array of parsed command objects
	 */
	public parse(logText: string): ParsedSavedCommand[] {
		// Split into lines and filter empty ones
		const lines = logText.split('\n')
			.map(line => line.trim())
			.filter(line => line.length > 0);

		logger.log(`Processing ${lines.length} lines`.green); // Debug output

		const results: ParsedSavedCommand[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Skip lines that don't start with timestamp bracket
			if (!line.startsWith('[')) {
				continue;
			}

			// Combine lines if necessary (in case command spans multiple lines)
			let fullLine = line;
			let nextLineIndex = i + 1;

			// If next line doesn't start with [ and isn't empty, it's likely a continuation
			while (nextLineIndex < lines.length &&
				!lines[nextLineIndex].startsWith('[') &&
				lines[nextLineIndex].trim().length > 0) {
				fullLine += ' ' + lines[nextLineIndex].trim();
				nextLineIndex++;
			}

			// Adjust index to avoid reprocessing already combined lines
			i = nextLineIndex - 1;

			const parsed = this.parseLine(fullLine);
			if (parsed) {
				results.push(parsed);
			}
		}

		logger.log(`Successfully parsed ${results.length} commands`.green); // Debug output
		return results;
	}

	/**
	 * Parse log text and return formatted JSON string
	 * @param logText - Complete log file content as string
	 * @returns Formatted JSON string of parsed commands
	 */
	public parseToJson(logText: string): string {
		const parsed = this.parse(logText);
		return JSON.stringify(parsed, null, 2);
	}

	/**
	 * Get statistics about parsed commands
	 * @param commands - Array of parsed commands
	 * @returns Object containing various statistics
	 */
	public getStatistics(commands: ParsedSavedCommand[]): {
		totalCommands: number;
		uniqueUsers: number;
		uniqueGuilds: number;
		uniqueChannels: number;
		commandTypes: { [key: string]: number };
		mostActiveUser: string;
		mostActiveGuild: string;
	} {
		const users = new Set<string>();
		const guilds = new Set<string>();
		const channels = new Set<string>();
		const commandTypes: { [key: string]: number } = {};
		const userCounts: { [key: string]: number } = {};
		const guildCounts: { [key: string]: number } = {};

		commands.forEach(cmd => {
			users.add(cmd.executorUsername);
			guilds.add(cmd.guildName);
			channels.add(cmd.channelName);

			// Extract command type (first part of command)
			const commandType = cmd.command.split(' ')[0];
			commandTypes[commandType] = (commandTypes[commandType] || 0) + 1;

			// Count user activity
			userCounts[cmd.executorUsername] = (userCounts[cmd.executorUsername] || 0) + 1;

			// Count guild activity
			guildCounts[cmd.guildName] = (guildCounts[cmd.guildName] || 0) + 1;
		});

		// Find most active user and guild
		const mostActiveUser = Object.keys(userCounts).reduce((a, b) =>
			userCounts[a] > userCounts[b] ? a : b, '');
		const mostActiveGuild = Object.keys(guildCounts).reduce((a, b) =>
			guildCounts[a] > guildCounts[b] ? a : b, '');

		return {
			totalCommands: commands.length,
			uniqueUsers: users.size,
			uniqueGuilds: guilds.size,
			uniqueChannels: channels.size,
			commandTypes,
			mostActiveUser,
			mostActiveGuild
		};
	}
}

export {
	DiscordSlashLogParser,
	ParsedSavedCommand
}