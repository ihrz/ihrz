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

import {
	fetchPublic,
	fetchPublicImage,
	isPrivateAddress
} from "../../src/core/svg/remoteImage.ts";
import { fitsDecodeBudget } from "../../src/core/functions/svgKit.ts";

describe("isPrivateAddress", () => {
	const v4 = (address: string) => isPrivateAddress(address, 4);
	const v6 = (address: string) => isPrivateAddress(address, 6);

	test("blocks private and reserved IPv4", () => {
		for (const address of [
			"0.0.0.0",
			"10.1.2.3",
			"127.0.0.1",
			"100.64.0.1",
			"169.254.169.254",
			"172.16.0.1",
			"172.31.255.255",
			"192.168.1.1",
			"192.0.0.8",
			"198.18.0.1",
			"224.0.0.1",
			"255.255.255.255",
			"not-an-ip"
		]) {
			expect(v4(address)).toBe(true);
		}
	});

	test("allows public IPv4", () => {
		for (const address of ["1.1.1.1", "8.8.8.8", "162.159.130.233"]) {
			expect(v4(address)).toBe(false);
		}
	});

	test("blocks private, mapped and translated IPv6", () => {
		for (const address of [
			"::",
			"::1",
			"::ffff:127.0.0.1",
			"::ffff:7f00:1",
			"::ffff:a9fe:a9fe",
			"64:ff9b::7f00:1",
			"64:ff9b::808:808",
			"2002:7f00:1::",
			"fc00::1",
			"fd12:3456::1",
			"fe80::1",
			"fec0::1",
			"feff::1",
			"ff02::1",
			"2001:db8::1",
			"garbage"
		]) {
			expect(v6(address)).toBe(true);
		}
	});

	test("allows public IPv6", () => {
		for (const address of [
			"2606:4700:4700::1111",
			"2001:4860:4860::8888",
			"::ffff:8.8.8.8",
			"2002:808:808::"
		]) {
			expect(v6(address)).toBe(false);
		}
	});
});

describe("fetchPublic", () => {
	test("refuses non-http schemes and internal hosts", async () => {
		for (const url of [
			"file:///etc/passwd",
			"ftp://example.com/",
			"http://127.0.0.1/",
			"http://localhost:8080/",
			"http://[::1]/",
			"http://169.254.169.254/latest/meta-data/",
			"http://2130706433/",
			"http://0x7f.0.0.1/",
			"not a url"
		]) {
			expect(await fetchPublic(url)).toBeNull();
			expect(await fetchPublicImage(url)).toBeNull();
		}
	});
});

describe("fitsDecodeBudget", () => {
	const pngHeader = (width: number, height: number) => {
		const buffer = Buffer.alloc(33);
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(
			buffer
		);
		buffer.writeUInt32BE(13, 8);
		buffer.write("IHDR", 12, "ascii");
		buffer.writeUInt32BE(width, 16);
		buffer.writeUInt32BE(height, 20);
		return buffer;
	};

	test("accepts normal sizes and rejects bombs", () => {
		expect(fitsDecodeBudget(pngHeader(1920, 1080))).toBe(true);
		expect(fitsDecodeBudget(pngHeader(4096, 4096))).toBe(true);
		expect(fitsDecodeBudget(pngHeader(30000, 30000))).toBe(false);
		expect(fitsDecodeBudget(pngHeader(0, 10))).toBe(false);
		expect(fitsDecodeBudget(Buffer.from("not an image"))).toBe(false);
	});
});
