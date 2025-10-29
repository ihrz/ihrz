/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { Logger } from "../../types/logger.js";
import { log as _ } from 'console';
import "./functions/colors.js";

enum LogLevel {
	LOG = 'LOG',
	WARN = 'WRN',
	ERROR = 'ERR',
	LEGACY = 'LEG'
}

function getCurrentTime(): string {
	const now = new Date();
	const shardId = global.client?.shard?.ids[0] ?? "X";

	const timestamp = now.toLocaleString('en-US', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	});

	return `SHARD#${shardId} ${timestamp}`;
}

function formatMessage(level: LogLevel, message: any, ...optionalParams: any[]): string {
	const timestamp = getCurrentTime();
	const prefix = `[${timestamp} ${level}]:`;

	const coloredPrefix = applyColorToPrefix(prefix, level);

	const messageStr = typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message);
	const paramsStr = optionalParams.length > 0
		? ' ' + optionalParams.map(param =>
			typeof param === 'object' ? JSON.stringify(param, null, 2) : String(param)
		).join(' ')
		: '';
	return coloredPrefix + ' ' + messageStr + paramsStr;
}

function applyColorToPrefix(prefix: string, level: LogLevel): string {
	switch (level) {
		case LogLevel.LOG:
			return prefix.green;
		case LogLevel.WARN:
			return prefix.yellow;
		case LogLevel.ERROR:
			return prefix.red;
		case LogLevel.LEGACY:
			return prefix.cyan;
		default:
			return prefix;
	}
}

const logger: Logger = {
	log(message: any, ...optionalParams: any[]): void {
		const formattedMessage = formatMessage(LogLevel.LOG, message, ...optionalParams);
		_(formattedMessage);
	},

	warn(message: any, ...optionalParams: any[]): void {
		const formattedMessage = formatMessage(LogLevel.WARN, message, ...optionalParams);
		_(formattedMessage);
	},

	err(message: any, ...optionalParams: any[]): void {
		const formattedMessage = formatMessage(LogLevel.ERROR, message, ...optionalParams);
		_(formattedMessage);

		if (typeof process !== 'undefined' && process.stderr) {
			process.stderr.write(formattedMessage + '\n');
		}
	},

	legacy(message: any, ...optionalParams: any[]): void {
		if (optionalParams.length > 0) {
			_(message, ...optionalParams);
		} else {
			_(message);
		}
	},

	returnLog(message: any, ...optionalParams: any[]): string {
		return formatMessage(LogLevel.LOG, message, ...optionalParams);
	}
};

export default logger;
global.logger = logger;