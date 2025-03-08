/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import fs from 'node:fs';

let filePath = `${process.cwd()}/src/files/.bash_history`

import { BashCommands } from "../../../../types/bashCommands.js";

export const command: BashCommands = {
	command_name: "history",
	command_description: "Show the bash history",
	run: async function (client, stream, args) {
		fs.readFile(filePath, 'utf-8', (err, data) => {
			if (err) throw err;

			let lines = data.trim().split('\n\r');
			let maxNumberLength = lines.length.toString().length;

			let formattedHistory = lines.map((line, index) => {
				let number = (index + 1).toString().padStart(maxNumberLength, ' ');
				return `${number}  ${line.trim()}`;
			}).join('\n\r');

			stream.write("\n\r" + formattedHistory + "\n\r[Press Enter]");
		});
	}
};