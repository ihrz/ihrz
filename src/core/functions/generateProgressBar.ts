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

import emojis from "../../files/emojis.json" with { "type": "json" };

export default function generateProgressBar(currentTimeMs: number, totalTimeMs: number): {
	bar: string;
	currentTime: string;
	totalTime: string;
} {
	let currentTimeInSeconds = Math.floor(currentTimeMs / 1000);
	let totalTimeInSeconds = Math.floor(totalTimeMs / 1000);

	let progress = (currentTimeInSeconds / totalTimeInSeconds) * 100;

	let currentTimeFormatted = formatTime(currentTimeInSeconds);
	let totalTimeFormatted = formatTime(totalTimeInSeconds);

	let progressBarLength = 17;

	let dashesBefore = Math.floor((progressBarLength - 2) * (progress / 100));
	let dashesAfter = progressBarLength - dashesBefore - 2;

	let progressBar = `${currentTimeFormatted} ┃ ${`${emojis.Bar}`.repeat(dashesBefore)}${emojis.Pointer}${`${emojis.Bar}`.repeat(dashesAfter)} ┃ ${totalTimeFormatted}`;

	return {
		bar: progressBar,
		currentTime: currentTimeFormatted,
		totalTime: totalTimeFormatted
	};
}

function formatTime(seconds: number): string {
	let minutes = Math.floor(seconds / 60);
	let remainingSeconds = seconds % 60;

	return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}