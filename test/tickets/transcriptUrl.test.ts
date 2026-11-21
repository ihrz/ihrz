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

import { describe, expect, test } from "bun:test";
import type { Client } from "discord.js";

import { transcriptUrl } from "../../src/core/modules/ticketTranscripts.ts";

const withUrl = (ticketTranscriptUrl?: string) =>
	({ config: { api: { ticketTranscriptUrl } } }) as unknown as Client;

describe("transcriptUrl", () => {
	test("links to the channel on the transcript site", () => {
		expect(
			transcriptUrl(withUrl("https://ticket.ihorizon.org"), "123")
		).toBe("https://ticket.ihorizon.org/123");
		expect(
			transcriptUrl(withUrl("https://ticket.ihorizon.org//"), "123")
		).toBe("https://ticket.ihorizon.org/123");
	});

	test("no site, no link", () => {
		expect(transcriptUrl(withUrl(undefined), "123")).toBeNull();
		expect(transcriptUrl(withUrl(""), "123")).toBeNull();
		expect(transcriptUrl(withUrl("ticket.ihorizon.org"), "123")).toBeNull();
	});

	test("the production branch links to the official site by default", () => {
		const prod = (ticketTranscriptUrl?: string) =>
			({
				config: { api: { ticketTranscriptUrl, apiToken: "secret" } },
				version: { env: "production" }
			}) as unknown as Client;
		expect(transcriptUrl(prod(undefined), "123")).toBe(
			"https://ticket.ihorizon.org/123"
		);
		expect(transcriptUrl(prod("https://t.example.org"), "123")).toBe(
			"https://t.example.org/123"
		);
		const dev = {
			config: { api: {} },
			version: { env: "dev" }
		} as unknown as Client;
		expect(transcriptUrl(dev, "123")).toBeNull();
		const selfHosted = {
			config: { api: { apiToken: "" } },
			version: { env: "production" }
		} as unknown as Client;
		expect(transcriptUrl(selfHosted, "123")).toBeNull();
	});
});
