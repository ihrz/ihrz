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

import { DatabaseStructure } from "../../../types/database_structure";
import { ownerTable } from "../../Events/client/ready.ts";
import { Guild } from "discord.js";

export async function isGuildOwner(
	userId: string,
	guild: Guild
): Promise<boolean> {
	const owners: string[] = await getGuildOwner(guild);
	return owners.includes(userId);
}

export async function isBotOwner(userId: string): Promise<boolean> {
	const owners = await getBotOwner();

	return owners.includes(userId);
}

export function isBotDev(userId: string): boolean {
	return client.owners.includes(userId);
}

export async function getGuildOwner(guild: Guild | null): Promise<string[]> {
	return guild
		? [
			...new Set([
				guild?.ownerId,
				...Object.keys(
					(await client.db.get<DatabaseStructure.OwnerSchema>(
						`${guild?.id}.OWNER`
					)) || {}
				)
			])
		]
		: [];
}

export async function getBotOwner(): Promise<string[]> {
	return [
		...new Set([
			...client.owners,
			...(await ownerTable.all()).map((x) => x.id)
		])
	];
}

export function getBotDev(): string[] {
	return client.owners;
}

export async function removeBotOwner(userId: string): Promise<void> {
	await ownerTable.delete(userId);
}

export async function addBotOwner(userId: string): Promise<void> {
	await ownerTable.set(userId, { owner: true });
}

export async function addGuildOwner(
	userId: string,
	guildId: string
): Promise<void> {
	await client.db.set(`${guildId}.OWNER.${userId}`, { owner: true });
}

export async function removeGuildOwner(
	userId: string,
	guildId: string
): Promise<void> {
	await client.db.delete(`${guildId}.OWNER.${userId}`);
}
