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

/*
 * Download of a user-supplied image URL (e.g. a welcome banner background).
 * Chromium used to load such URLs from the rendering host, reaching its
 * internal network. Here: http(s) only, every hop (redirects included) must
 * resolve to public addresses, image content type, size and time bounded.
 */

const TIMEOUT_MS = 5_000;
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function ipv4Private(address: string): boolean {
	const [a, b] = address.split(".").map(Number);
	return (
		a === 0 ||
		a === 10 ||
		a === 127 ||
		(a === 100 && b >= 64 && b <= 127) ||
		(a === 169 && b === 254) ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 168) ||
		(a === 198 && (b === 18 || b === 19)) ||
		a >= 224
	);
}

function isPrivate(address: string, family: number): boolean {
	if (family === 4) return ipv4Private(address);
	const lower = address.toLowerCase();
	const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
	if (mapped) return ipv4Private(mapped[1]);
	return (
		lower === "::" ||
		lower === "::1" ||
		lower.startsWith("fc") ||
		lower.startsWith("fd") ||
		lower.startsWith("fe8") ||
		lower.startsWith("fe9") ||
		lower.startsWith("fea") ||
		lower.startsWith("feb") ||
		lower.startsWith("ff")
	);
}

async function isPublicUrl(url: URL): Promise<boolean> {
	if (url.protocol !== "https:" && url.protocol !== "http:") return false;
	const hostname = url.hostname.replace(/^\[|\]$/g, "");
	const addresses = await Bun.dns.lookup(hostname).catch(() => []);
	return (
		addresses.length > 0 &&
		addresses.every((entry) => !isPrivate(entry.address, entry.family))
	);
}

async function readCapped(response: Response): Promise<Buffer | null> {
	const declared = Number(response.headers.get("content-length") ?? 0);
	if (declared > MAX_BYTES || !response.body) return null;

	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > MAX_BYTES) {
			await reader.cancel().catch(() => {});
			return null;
		}
		chunks.push(value);
	}
	return Buffer.concat(chunks);
}

/** The image at `url`, or null if unreachable, private, too big or not an image. */
export async function fetchPublicImage(url: string): Promise<Buffer | null> {
	let current: URL;
	try {
		current = new URL(url);
	} catch {
		return null;
	}

	const signal = AbortSignal.timeout(TIMEOUT_MS);
	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		if (!(await isPublicUrl(current))) return null;

		const response = await fetch(current, {
			redirect: "manual",
			signal
		}).catch(() => null);
		if (!response) return null;

		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get("location");
			if (!location) return null;
			current = new URL(location, current);
			continue;
		}

		const type = response.headers.get("content-type") ?? "";
		if (!response.ok || !type.startsWith("image/")) return null;
		return readCapped(response).catch(() => null);
	}
	return null;
}
