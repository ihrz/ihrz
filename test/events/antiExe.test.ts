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

import { ilegalFile } from "../../src/Events/utils/antiExe.ts";

test("flags real binary extensions", () => {
	expect(ilegalFile("setup.exe")).toBe(true);
	expect(ilegalFile("SETUP.EXE")).toBe(true);
	expect(ilegalFile("tool.AppImage")).toBe(true);
	expect(ilegalFile("backup.tar.gz")).toBe(true);
	expect(ilegalFile("run.sh")).toBe(true);
});

test("does not flag files that only contain an extension-like substring", () => {
	expect(ilegalFile("screen.shot.png")).toBe(false);
	expect(ilegalFile("photo.binary.jpg")).toBe(false);
	expect(ilegalFile("notes.exe.txt")).toBe(false);
	expect(ilegalFile("exe")).toBe(false);
	expect(ilegalFile("README")).toBe(false);
});
