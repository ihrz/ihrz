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

import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Client,
	GuildMember,
	SnowflakeUtil
} from "discord.js";
/**
 * Join DM, part of the welcome side (`core/modules/memberArrival.ts`): sent
 * once the gates let the member in, after the captcha when it is on.
 */
export async function sendJoinDm(
	client: Client,
	member: GuildMember
): Promise<void> {
	try {
		let msg_dm = await client.db.get(
			`${member.guild.id}.GUILD.GUILD_CONFIG.joindm`
		);
		const guildLocal =
			(await client.db.get(`${member.guild.id}.GUILD.LANG.lang`)) ||
			"en-US";

		if (!msg_dm || msg_dm === "off") return;

		/**
		 * Why doing this?
		 * On iHorizon Production, we have some ~problems~ 👎
		 * All of the guildMemberAdd, guildMemberRemove sometimes emiting in double, triple, or quadruple.
		 */
		const nonce = SnowflakeUtil.generate().toString();

		msg_dm = client.func.method.generateCustomMessagePreview(msg_dm, {
			user: member.user,
			guild: member.guild,
			guildLocal: guildLocal
		});

		const button = new ButtonBuilder()
			.setDisabled(true)
			.setCustomId("join-dm-from-server")
			.setStyle(ButtonStyle.Secondary)
			.setLabel(
				(
					await client.func.getLanguageData(member.guild.id)
				).dm_message_from
					.replace("${guild}", member.guild.name)
					.slice(0, 80)
			);

		member
			.send({
				content: msg_dm,
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(button)
				],
				enforceNonce: true,
				nonce: nonce
			})
			.catch(() => {})
			.then(() => {});
	} catch {
		// best effort: the member may not accept DMs
	}
}
