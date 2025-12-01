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

export interface TrackInfo {
	title: string;
	author: string;
}

export interface TrackEmbbeded {
	info: TrackInfo;
}

/**
 * Compute Levenshtein distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
	const matrix: number[][] = Array.from({ length: a.length + 1 }, () => []);

	for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
	for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			matrix[i][j] = Math.min(
				matrix[i - 1][j] + 1,        // deletion
				matrix[i][j - 1] + 1,        // insertion
				matrix[i - 1][j - 1] + cost  // substitution
			);
		}
	}

	return matrix[a.length][b.length];
}

/**
 * Returns a similarity score between 0 and 1
 */
export function similarity(a: string, b: string): number {
	const distance = levenshtein(a.toLowerCase(), b.toLowerCase());
	const maxLen = Math.max(a.length, b.length);
	return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

/**
 * Checks if the query is similar enough to a track (title + author).
 */
export function isSimilar(query: string, track: TrackEmbbeded, threshold = 0.5): boolean {
	const a = query.toLowerCase().split(/\s+/);
	const b = `${track?.info.author} ${track?.info.title}`.toLowerCase().split(/\s+/);

	let matches = 0;

	for (const word of a) {
		if (b.includes(word)) matches++;
	}

	const score = matches / a.length;

	return score >= threshold;
}