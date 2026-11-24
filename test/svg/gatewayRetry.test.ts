import { afterEach, describe, expect, test } from "bun:test";

import svg2png, { withTimeout } from "../../src/core/functions/svg2png.ts";

// A 1x1 PNG, as the gateway would answer.
const PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
	"base64"
);
const SVG =
	'<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="#f00"/></svg>';
const realFetch = globalThis.fetch;
const g = globalThis as unknown as { client?: unknown };
const previousClient = g.client;

function gatewayConfigured() {
	g.client = {
		config: {
			api: {
				HorizonGateway: "http://gateway.invalid",
				HorizonGatewayLocal: "http://127.0.0.1:1",
				apiToken: "token"
			}
		}
	};
}

afterEach(() => {
	globalThis.fetch = realFetch;
	g.client = previousClient;
});

describe("svg2png on the gateway", () => {
	test("a gateway that refuses then comes back is retried, not skipped", async () => {
		gatewayConfigured();
		let calls = 0;
		globalThis.fetch = (async () => {
			calls++;
			if (calls < 2) throw new TypeError("ECONNREFUSED");
			return new Response(PNG, {
				headers: { "content-type": "image/png" }
			});
		}) as unknown as typeof fetch;
		const out = await svg2png(SVG);
		expect(calls).toBe(2);
		expect(out.equals(PNG)).toBe(true);
	});

	test("a gateway still down after the retries falls back to a local render", async () => {
		gatewayConfigured();
		let calls = 0;
		globalThis.fetch = (async () => {
			calls++;
			throw new TypeError("ECONNREFUSED");
		}) as unknown as typeof fetch;
		const out = await svg2png(SVG);
		// First try + 2 retries, then local.
		expect(calls).toBe(3);
		expect(out.subarray(1, 4).toString()).toBe("PNG");
	}, 15_000);
});

describe("withTimeout", () => {
	test("rejects when the task takes too long", async () => {
		const never = new Promise<never>(() => {});
		await expect(withTimeout(never, 20, "stuck render")).rejects.toThrow(
			"stuck render timed out after 20 ms"
		);
	});
	test("passes the result through when in time", async () => {
		expect(await withTimeout(Promise.resolve(7), 50, "x")).toBe(7);
	});
});
