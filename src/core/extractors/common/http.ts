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

import { DEFAULT_USER_AGENT } from "./userAgent.js";

export type FetchHeaders = Record<string, string>;

export interface FetchOptions {
	headers?: FetchHeaders;
	timeoutMs?: number;
}

/**
 * Shared browser-like user agent: most music platforms serve the
 * fully-rendered HTML / catalog API responses only to desktop browsers.
 */
export function browserHeaders(extra: FetchHeaders = {}): FetchHeaders {
	return {
		accept: "*/*",
		"accept-language": "en-US,en;q=0.9",
		"user-agent": DEFAULT_USER_AGENT,
		...extra
	};
}

async function request(
	url: string,
	{ headers, timeoutMs }: FetchOptions = {}
): Promise<Response> {
	return await fetch(url, {
		headers: browserHeaders(headers),
		...(timeoutMs
			? {
					signal: AbortSignal.timeout(timeoutMs)
				}
			: {})
	});
}

/**
 * GET a remote resource as text.
 */
export async function fetchText(
	url: string,
	options?: FetchOptions
): Promise<string> {
	const res = await request(url, options);

	if (!res.ok) {
		throw new Error(`HTTP ${res.status} for ${url}`);
	}

	return await res.text();
}

/**
 * GET a remote resource as parsed JSON.
 */
export async function fetchJson<T>(
	url: string,
	options?: FetchOptions
): Promise<T> {
	const res = await request(url, options);

	if (!res.ok) {
		throw new Error(`HTTP ${res.status} for ${url}`);
	}

	return (await res.json()) as T;
}
