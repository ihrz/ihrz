import { describe, expect, mock, test } from "bun:test";
import type { Guild } from "discord.js";

mock.module("../../src/core/core.js", () => ({ default: {} }));
const { findRole, roleKey } =
	await import("../../src/core/functions/method/args.ts");

const G = "100000000000000000";
const guildWith = (names: string[]) => {
	const roles = new Map<string, { id: string; name: string }>();
	roles.set(G, { id: G, name: "@everyone" });
	names.forEach((name, i) =>
		roles.set(String(200000000000000000n + BigInt(i)), {
			id: String(200000000000000000n + BigInt(i)),
			name
		})
	);
	return { id: G, roles: { cache: roles } } as unknown as Guild;
};
const name = (g: Guild, arg: string) => findRole(g, arg)?.name ?? null;

describe("role argument of prefix commands", () => {
	const g = guildWith([
		"pic perm",
		"Modérateur",
		"⭐・VIP",
		"Admin",
		"Admins"
	]);

	test("a name with a space typed with _ or -", () => {
		expect(name(g, "pic_perm")).toBe("pic perm");
		expect(name(g, "pic-perm")).toBe("pic perm");
		expect(name(g, "PicPerm")).toBe("pic perm");
	});

	test("mention, id, exact name, other case", () => {
		expect(name(g, "<@&200000000000000003>")).toBe("Admin");
		expect(name(g, "200000000000000003")).toBe("Admin");
		expect(name(g, "Admins")).toBe("Admins");
		expect(name(g, "admin")).toBe("Admin");
		expect(name(g, "modérateur")).toBe("Modérateur");
	});

	test("decorations and emojis are ignored", () => {
		expect(name(g, "vip")).toBe("⭐・VIP");
		expect(roleKey("⭐・Pic-Perm")).toBe("picperm");
	});

	test("a typo is forgiven when one role is clearly the closest", () => {
		expect(name(g, "moderateur")).toBe("Modérateur");
		expect(name(g, "pic_pem")).toBe("pic perm");
		// Two letters swapped count as 2 errors: too far for a role (it may grant permissions).
		expect(name(g, "pic_prem")).toBe(null);
	});

	test("never guesses between two close roles, never @everyone, nothing for a far name", () => {
		const two = guildWith(["Staff Alpha", "Staff Alpho"]);
		expect(name(two, "staff_alphx")).toBe(null);
		expect(name(g, "everyone")).toBe(null);
		expect(name(g, "banana")).toBe(null);
		expect(name(g, "a")).toBe(null);
		expect(name(g, "<@&999999999999999999>")).toBe(null);
	});
});
