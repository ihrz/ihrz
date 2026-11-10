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
	ChatInputCommandInteraction,
	Client,
	Message,
	PermissionFlagsBits
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";

import { SubCommand } from "../../../../types/command.js";
import { metasTable } from "../../../Events/client/ready.js";

export const subCommand: SubCommand = {
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		lang: LanguageData,
		args?: string[]
	) => {
		// Guard's Typing
		if (
			!client.user ||
			!interaction.member ||
			!interaction.guild ||
			!interaction.channel
		)
			return;

		const opts = client.func.method.options(interaction, args);
		let tag_name = opts.string("tag_name", 0, true);
		const mention = opts.member("mention", 1);
		const message_id = opts.string("message_id", 2);

		tag_name = tag_name.trim();

		const baseData = (await client.db.get(
			`${interaction.guildId}.GUILD.TAGS`
		)) as DatabaseStructure.GuildTagsStructure | undefined;

		if (!baseData?.storedTags?.[tag_name]) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tag_doesnt_exist.replace("${tag_name}", tag_name)
			});
			return;
		}

		const tag = baseData.storedTags[tag_name];

		// check administrator permission if is not allowed to use the tag
		const is_in_wl = interaction.member.roles.cache.some((role) =>
			baseData.whitelist_use?.includes(role.id)
		);

		if (
			!interaction.member.permissions.has(
				PermissionFlagsBits.Administrator
			) &&
			!is_in_wl
		) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tag_use_not_allowed
					.replace("${tag_name}", tag_name)
					.replace("${createBy}", tag.createBy)
			});
			return;
		}

		// send the tag content
		const embed = await metasTable.get(`EMBED.${tag.embedId}`);
		const tagContent = baseData?.storedTags?.[tag_name].content;
		const content =
			[mention?.toString(), tagContent]
				.filter(Boolean)
				.join(" ")
				.slice(0, 2000) || undefined;

		if (!tagContent && !embed?.embedSource) {
			await client.func.method.interactionSend(interaction, {
				content: lang.tag_use_empty.replace("${tag_name}", tag_name)
			});
			return;
		}

		// Tag content is written by members: users only, never @everyone,
		// @here or a role, whoever created the tag.
		const allowedMentions = { parse: ["users" as const] };

		if (interaction.channel.isSendable()) {
			if (message_id) {
				const message = await interaction.channel.messages
					.fetch(message_id)
					.catch(() => null);
				if (message) {
					await message.reply({
						content,
						allowedMentions,
						embeds: embed?.embedSource ? [embed.embedSource] : []
					});
				}
			} else {
				await interaction.channel.send({
					content,
					allowedMentions,
					embeds: embed?.embedSource ? [embed.embedSource] : []
				});
			}
		}
		await client.func.method.interactionSend(interaction, {
			content: lang.tag_use_command_work.replace("${tag_name}", tag_name)
		});
		await client.db.set(
			`${interaction.guildId}.GUILD.TAGS.storedTags.${tag_name}.lastUseTimestamp`,
			Date.now()
		);
		await client.db.set(
			`${interaction.guildId}.GUILD.TAGS.storedTags.${tag_name}.lastUseBy`,
			interaction.member.id
		);
		await client.db.add(
			`${interaction.guildId}.GUILD.TAGS.storedTags.${tag_name}.uses`,
			1
		);
		return;
	}
};
