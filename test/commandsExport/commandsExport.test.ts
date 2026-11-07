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
import { PermissionFlagsBits } from "discord.js";
import {
	readablePermissionField,
	readablePermissionNames,
	removePermissionProperties,
	withReadablePermissions
} from "../../src/core/commandsSync.ts";

const tree = () => [
	{
		name: "admin",
		permission: PermissionFlagsBits.Administrator,
		options: [
			{
				name: "purge",
				type: 1,
				permission:
					PermissionFlagsBits.ManageMessages |
					PermissionFlagsBits.BanMembers,
				perm: 1n
			},
			{ name: "open", type: 1, permission: null },
			{ name: "zero", type: 1, permission: 0 },
			{
				name: "many",
				type: 1,
				permission: [
					PermissionFlagsBits.KickMembers,
					PermissionFlagsBits.ManageRoles
				]
			}
		]
	}
];

describe("withReadablePermissions", () => {
	const out = withReadablePermissions(tree());

	test("names a single permission", () => {
		expect(out[0].permissions).toEqual(["Administrator"]);
		expect(out[0].permission).toBeUndefined();
	});

	test("names every bit of a combined permission", () => {
		expect(out[0].options[0].permissions.sort()).toEqual([
			"BanMembers",
			"ManageMessages"
		]);
		expect(out[0].options[0].perm).toBeUndefined();
	});

	test("omits null and 0", () => {
		expect("permissions" in out[0].options[1]).toBe(false);
		expect("permissions" in out[0].options[2]).toBe(false);
	});

	test("handles a bigint array", () => {
		expect(out[0].options[3].permissions).toEqual([
			"KickMembers",
			"ManageRoles"
		]);
	});

	test("is JSON serializable and keeps other fields", () => {
		expect(() => JSON.stringify(out)).not.toThrow();
		expect(out[0].options[0].name).toBe("purge");
		expect(out[0].options[0].type).toBe(1);
	});
});

describe("removePermissionProperties", () => {
	test("still strips permission and perm", () => {
		expect(removePermissionProperties(tree())).toEqual([
			{
				name: "admin",
				options: [
					{ name: "purge", type: 1 },
					{ name: "open", type: 1 },
					{ name: "zero", type: 1 },
					{ name: "many", type: 1 }
				]
			}
		]);
	});
});

describe("readablePermissionField", () => {
	test("returns permissions for a set permission", () => {
		expect(
			readablePermissionField(PermissionFlagsBits.Administrator)
		).toEqual({
			permissions: ["Administrator"]
		});
	});

	test("returns no key for null, 0 or undefined", () => {
		for (const value of [null, 0, undefined, []]) {
			const field = readablePermissionField(value);
			expect("permissions" in field).toBe(false);
			expect({ name: "x", ...field }).toEqual({ name: "x" });
		}
	});
});

test("an aliased permission bit is exported under one name", () => {
	expect(
		readablePermissionNames(PermissionFlagsBits.ManageGuildExpressions)
	).toEqual(["ManageGuildExpressions"]);
});
