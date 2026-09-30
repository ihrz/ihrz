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

import { APIEmbed, Guild, User } from "discord.js";
import { metasTable } from "../../Events/client/ready.js";
import { DatabaseStructure } from "../../../types/database_structure.js";

export interface WelcomerEmbedVariables {
	guild: Guild;
	user: User;
	guildLocal: string;
	inviter?: {
		user: {
			username: string;
			mention: string;
		};
		invitesAmount: number;
	};
}

export default async function resolveWelcomerEmbed(
	embedId: string | null | undefined,
	variables: WelcomerEmbedVariables
): Promise<APIEmbed | null> {
	if (!embedId) return null;

	const record = (await metasTable.get(`EMBED.${embedId}`)) as
		DatabaseStructure.DbEmbedObject[string] | null;

	if (!record?.embedSource) return null;

	const source = JSON.parse(JSON.stringify(record.embedSource)) as APIEmbed;
	const apply = (value: string): string =>
		client.func.method.generateCustomMessagePreview(value, variables);

	if (source.title) source.title = apply(source.title);
	if (source.description) source.description = apply(source.description);
	if (source.footer?.text) source.footer.text = apply(source.footer.text);
	if (source.author?.name) source.author.name = apply(source.author.name);
	if (Array.isArray(source.fields)) {
		for (const field of source.fields) {
			field.name = apply(field.name);
			field.value = apply(field.value);
		}
	}

	return source;
}
