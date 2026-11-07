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

import { expect, test } from "bun:test";
import JSZip from "jszip";

import { readZipEntryCapped } from "../../src/Interaction/HybridCommands/utils/util/!unzip-emojis.ts";

// Rewrites the uncompressed size of every entry, in the local headers and
// the central directory: a zip that lies about its content (zip bomb).
function lieAboutSizes(zip: Uint8Array, fakeSize: number): Uint8Array {
	const out = Buffer.from(zip);
	for (let i = 0; i + 4 <= out.length; i++) {
		const signature = out.readUInt32LE(i);
		if (signature === 0x04034b50) out.writeUInt32LE(fakeSize, i + 22);
		if (signature === 0x02014b50) out.writeUInt32LE(fakeSize, i + 24);
	}
	return out;
}

async function load(content: Uint8Array, fakeSize?: number) {
	const source = new JSZip();
	source.file("emoji_1.png", content, { compression: "DEFLATE" });
	let zip = await source.generateAsync({ type: "uint8array" });
	if (fakeSize !== undefined) zip = lieAboutSizes(zip, fakeSize);
	const loaded = await new JSZip().loadAsync(zip, { checkCRC32: false });
	return loaded.files["emoji_1.png"];
}

test("a small entry is read whole", async () => {
	const content = new Uint8Array(1000).fill(7);
	const entry = await load(content);
	expect(await readZipEntryCapped(entry, 256 * 1024)).toEqual(
		Buffer.from(content)
	);
});

test("an entry lying about its size is cut off at the limit", async () => {
	// 50 MB of zeros compress to a few KB and claim to be 100 bytes.
	const entry = await load(new Uint8Array(50 * 1024 * 1024), 100);
	expect((entry as any)._data.uncompressedSize).toBe(100);

	// Count what the stream really inflates.
	let inflated = 0;
	const internalStream = (entry as any).internalStream.bind(entry);
	(entry as any).internalStream = (type: string) => {
		const stream = internalStream(type);
		stream.on("data", (chunk: Uint8Array) => {
			inflated += chunk.byteLength;
		});
		return stream;
	};

	expect(await readZipEntryCapped(entry, 256 * 1024)).toBeNull();
	await new Promise((resolve) => setTimeout(resolve, 200));

	// Stops after the deflate block that crossed the limit (16 KB of input,
	// ~17 MB at most), instead of the 50 MB async() would inflate.
	expect(inflated).toBeGreaterThan(256 * 1024);
	expect(inflated).toBeLessThan(18 * 1024 * 1024);
});
