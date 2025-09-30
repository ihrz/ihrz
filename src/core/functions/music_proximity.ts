export interface TrackInfo {
	title: string;
	author: string;
}

export interface Track {
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
export function isSimilar(query: string, track: Track, threshold = 0.5): boolean {
	const fullTitle = `${track.info.author} - ${track.info.title}`;
	const score = similarity(query, fullTitle);
	return score >= threshold;
}