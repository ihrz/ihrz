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
 * Download of a user-supplied URL (e.g. a welcome banner background, an RSS
 * feed). Chromium used to load such URLs from the rendering host, reaching
 * its internal network. Here: http(s) only, every hop (redirects included)
 * must resolve to public addresses, and the request is sent to the address
 * that was checked (no second resolution, so no DNS rebinding). Size and time
 * are bounded.
 */

const TIMEOUT_MS = 5_000;
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function ipv4Private(address: string): boolean {
	const parts = address.split(".").map(Number);
	if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n))) {
		return true;
	}
	const [a, b, c] = parts;
	return (
		a === 0 ||
		a === 10 ||
		a === 127 ||
		(a === 100 && b >= 64 && b <= 127) ||
		(a === 169 && b === 254) ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 0 && (c === 0 || c === 2)) ||
		(a === 192 && b === 168) ||
		(a === 198 && (b === 18 || b === 19)) ||
		(a === 198 && b === 51 && c === 100) ||
		(a === 203 && b === 0 && c === 113) ||
		a >= 224
	);
}

/** Expands an IPv6 address to its 8 groups, or null if it is not one. */
function ipv6Groups(address: string): number[] | null {
	let text = address.toLowerCase().split("%")[0];
	const dotted = text.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
	if (dotted) {
		const v4 = dotted[2].split(".").map(Number);
		if (v4.length !== 4 || v4.some((n) => !(n >= 0 && n <= 255))) {
			return null;
		}
		text =
			dotted[1] +
			((v4[0] << 8) | v4[1]).toString(16) +
			":" +
			((v4[2] << 8) | v4[3]).toString(16);
	}
	const halves = text.split("::");
	if (halves.length > 2) return null;
	const head = halves[0] ? halves[0].split(":") : [];
	const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
	const missing = 8 - head.length - tail.length;
	if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
	const groups = [...head, ...Array(missing).fill("0"), ...tail].map((g) =>
		/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN
	);
	return groups.some(Number.isNaN) ? null : groups;
}

export function isPrivateAddress(address: string, family: number): boolean {
	if (family === 4) return ipv4Private(address);
	const g = ipv6Groups(address);
	if (!g) return true;
	const embeddedV4 = `${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`;
	const zeroPrefix = (n: number) => g.slice(0, n).every((x) => x === 0);

	// ::, ::1, IPv4-compatible and IPv4-mapped (::ffff:a.b.c.d)
	if (zeroPrefix(5) && (g[5] === 0 || g[5] === 0xffff)) {
		if (g[5] === 0 && g[6] === 0) return true;
		return ipv4Private(embeddedV4);
	}
	// NAT64 (64:ff9b::/96 and the local-use 64:ff9b:1::/48)
	if (g[0] === 0x64 && g[1] === 0xff9b) return true;
	// 6to4 (2002::/16) embeds an IPv4 address in groups 1-2
	if (g[0] === 0x2002) {
		return ipv4Private(
			`${g[1] >> 8}.${g[1] & 255}.${g[2] >> 8}.${g[2] & 255}`
		);
	}
	// Documentation 2001:db8::/32
	if (g[0] === 0x2001 && g[1] === 0x0db8) return true;
	// Unique local fc00::/7, link-local fe80::/10, site-local fec0::/10, multicast ff00::/8
	return (
		(g[0] & 0xfe00) === 0xfc00 ||
		(g[0] & 0xffc0) === 0xfe80 ||
		(g[0] & 0xffc0) === 0xfec0 ||
		(g[0] & 0xff00) === 0xff00
	);
}

/** A public address `url` resolves to, or null if any of them is private. */
async function resolvePublic(
	url: URL
): Promise<{ address: string; family: number } | null> {
	if (url.protocol !== "https:" && url.protocol !== "http:") return null;
	const hostname = url.hostname.replace(/^\[|\]$/g, "");
	const addresses = await Bun.dns.lookup(hostname).catch(() => []);
	if (
		addresses.length === 0 ||
		addresses.some((entry) => isPrivateAddress(entry.address, entry.family))
	) {
		return null;
	}
	// IPv4 first: many hosts have no IPv6 route.
	return addresses.find((entry) => entry.family === 4) ?? addresses[0];
}

/** The body of `response`, or null once it exceeds `maxBytes`. */
export async function readCapped(
	response: Response,
	maxBytes: number = MAX_BYTES
): Promise<Buffer | null> {
	const declared = Number(response.headers.get("content-length") ?? 0);
	if (declared > maxBytes || !response.body) return null;

	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > maxBytes) {
			await reader.cancel().catch(() => {});
			return null;
		}
		chunks.push(value);
	}
	return Buffer.concat(chunks);
}

export interface PublicFetchOptions {
	method?: "GET" | "HEAD";
	headers?: Record<string, string>;
	timeoutMs?: number;
	maxRedirects?: number;
}

/**
 * Fetches `url` only through public addresses, following redirects by hand
 * and checking every hop. Each request goes to the checked IP, with the Host
 * header and the TLS server name set to the original hostname (the
 * certificate is still verified against it). Returns the final response
 * (body unread) or null.
 */
export async function fetchPublic(
	url: string,
	options: PublicFetchOptions = {}
): Promise<Response | null> {
	let current: URL;
	try {
		current = new URL(url);
	} catch {
		return null;
	}

	const signal = AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS);
	const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
	for (let hop = 0; hop <= maxRedirects; hop++) {
		const resolved = await resolvePublic(current);
		if (!resolved) return null;

		const hostname = current.hostname.replace(/^\[|\]$/g, "");
		const pinned = new URL(current);
		pinned.hostname =
			resolved.family === 6 ? `[${resolved.address}]` : resolved.address;

		const response = await fetch(pinned, {
			method: options.method ?? "GET",
			headers: { ...options.headers, Host: current.host },
			redirect: "manual",
			signal,
			tls: { serverName: hostname }
		} as RequestInit).catch(() => null);
		if (!response) return null;

		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get("location");
			await response.body?.cancel().catch(() => {});
			if (!location) return null;
			try {
				current = new URL(location, current);
			} catch {
				return null;
			}
			continue;
		}
		return response;
	}
	return null;
}

/** The image at `url`, or null if unreachable, private, too big or not an image. */
export async function fetchPublicImage(url: string): Promise<Buffer | null> {
	const response = await fetchPublic(url);
	if (!response) return null;

	const type = response.headers.get("content-type") ?? "";
	if (!response.ok || !type.startsWith("image/")) {
		await response.body?.cancel().catch(() => {});
		return null;
	}
	return readCapped(response).catch(() => null);
}

/** Whether `url` is a public http(s) URL answering with an image content type. */
export async function isPublicImageUrl(url: string): Promise<boolean> {
	const response = await fetchPublic(url, { method: "HEAD" });
	if (!response) return false;
	const type = response.headers.get("content-type") ?? "";
	return response.ok && type.startsWith("image/");
}
