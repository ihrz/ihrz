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
	BaseGuildVoiceChannel,
	CategoryChannel,
	ChannelType,
	Client,
	ContainerBuilder,
	MessageFlags,
	SeparatorBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder,
	VoiceBasedChannel,
	VoiceState
} from "discord.js";

import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { LanguageData } from "../../../types/languageData.js";
import { tempTable } from "../client/ready.js";
import maskLink from "../../core/functions/maskLink.js";

/**
 * Builds the Components V2 control panel sent inside every created temporary
 * voice channel. Reuses the capability wording of the text interface
 * (tempvoice_if_text_fields_value_*) so both dashboards stay consistent.
 */
const VOICE_PANEL_EMOJI_MAP: Record<string, string> = {
	"${client.iHorizon_Emojis.VC_Limit}": "VC_Limit",
	"${client.iHorizon_Emojis.VC_Name}": "VC_Name",
	"${client.iHorizon_Emojis.VC_Region}": "VC_Region",
	"${client.iHorizon_Emojis.VC_Trust}": "VC_Trust",
	"${client.iHorizon_Emojis.VC_Untrust}": "VC_Untrust",
	"${client.iHorizon_Emojis.VC_Block}": "VC_Block",
	"${client.iHorizon_Emojis.VC_Unblock}": "VC_Unblock",
	"${client.iHorizon_Emojis.VC_Claim}": "VC_Claim",
	"${client.iHorizon_Emojis.VC_Privacy}": "VC_Privacy",
	"${client.iHorizon_Emojis.VC_Transfer}": "VC_Transfer",
	"${client.iHorizon_Emojis.VC_Delete}": "VC_Delete"
};

export function buildVoicePanel(
	lang: LanguageData,
	channelName: string,
	ownerId: string
): ContainerBuilder {
	const capabilities = [
		lang.tempvoice_if_text_fields_value_limit,
		lang.tempvoice_if_text_fields_value_name,
		lang.tempvoice_if_text_fields_value_region,
		lang.tempvoice_if_text_fields_value_trust,
		lang.tempvoice_if_text_fields_value_untrust,
		lang.tempvoice_if_text_fields_value_block,
		lang.tempvoice_if_text_fields_value_unblock,
		lang.tempvoice_if_text_fields_value_claim,
		lang.tempvoice_if_text_fields_value_privacy,
		lang.tempvoice_if_text_fields_value_transfer,
		lang.tempvoice_if_text_fields_value_delete
	]
		.join("\n")
		.replaceAll(
			/\$\{client\.iHorizon_Emojis\.VC_\w+\}/g,
			(token) =>
				(client.iHorizon_Emojis as Record<string, string>)[
					VOICE_PANEL_EMOJI_MAP[token]
				]
		);

	const container = new ContainerBuilder().setAccentColor(0xed8bbe);

	container.addTextDisplayComponents(
		new TextDisplayBuilder().setContent(
			`${lang.tempvoice_v2_embed_title
				.replace(
					"${client.iHorizon_Emojis.VC_Name}",
					client.iHorizon_Emojis.VC_Name
				)
				.replace(
					"${channelName}",
					channelName
				)}\n${lang.tempvoice_v2_embed_desc.replace(
				"${owner}",
				`<@${ownerId}>`
			)}`
		)
	);

	container.addSeparatorComponents(new SeparatorBuilder());

	container.addTextDisplayComponents(
		new TextDisplayBuilder().setContent(
			`${capabilities}\n\n${lang.tempvoice_v2_hint}`
		)
	);

	container.addSeparatorComponents(new SeparatorBuilder());

	const actions: Array<{
		text: string;
		emojiName: string;
		value: string;
	}> = [
		{
			text: lang.tempvoice_if_text_fields_value_limit,
			emojiName: "VC_Limit",
			value: "temporary_voice_limit_button"
		},
		{
			text: lang.tempvoice_if_text_fields_value_name,
			emojiName: "VC_Name",
			value: "temporary_voice_name_button"
		},
		{
			text: lang.tempvoice_if_text_fields_value_region,
			emojiName: "VC_Region",
			value: "temporary_voice_region_button"
		},
		{
			text: lang.tempvoice_if_text_fields_value_trust,
			emojiName: "VC_Trust",
			value: "temporary_voice_trust_button"
		},
		{
			text: lang.tempvoice_if_text_fields_value_untrust,
			emojiName: "VC_Untrust",
			value: "temporary_voice_untrust_button"
		},
		{
			text: lang.tempvoice_if_text_fields_value_block,
			emojiName: "VC_Block",
			value: "temporary_voice_block_button"
		},
		{
			text: lang.tempvoice_if_text_fields_value_unblock,
			emojiName: "VC_Unblock",
			value: "temporary_voice_unblock_button"
		},
		{
			text: lang.tempvoice_if_text_fields_value_claim,
			emojiName: "VC_Claim",
			value: "temporary_voice_claim_button"
		},
		{
			text: lang.tempvoice_if_text_fields_value_privacy,
			emojiName: "VC_Privacy",
			value: "temporary_voice_privacy_button"
		},
		{
			text: lang.tempvoice_if_text_fields_value_transfer,
			emojiName: "VC_Transfer",
			value: "temporary_voice_transfer_button"
		},
		{
			text: lang.tempvoice_if_text_fields_value_delete,
			emojiName: "VC_Delete",
			value: "temporary_voice_delete_button"
		}
	];

	container.addActionRowComponents(
		new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId("temporary_voice_actions_menu")
				.setPlaceholder(lang.tempvoice_v2_select_placeholder)
				.addOptions(
					actions.map((action) =>
						new StringSelectMenuOptionBuilder()
							.setLabel(
								action.text
									.replace(
										/\$\{client\.iHorizon_Emojis\.VC_\w+\}/g,
										""
									)
									.replaceAll("**", "")
									.trim()
							)
							.setValue(action.value)
							.setEmoji(
								(
									client.iHorizon_Emojis as Record<
										string,
										string
									>
								)[action.emojiName]
							)
					)
				)
		)
	);

	return container;
}

/**
 * In-flight custom voice creations, keyed by `${guildId}.${userId}`.
 * Discord may emit several voiceStateUpdate events for a single hub join
 * while channel creation is still async. Without this lock, two concurrent
 * creations both observe `ownedChannel == null` and each creates a channel;
 * the second DB write then orphans the first one (phantom empty channel with
 * the same name, never cleaned because untracked in CUSTOM_VOICE).
 */
const pendingCustomVoiceCreations = new Set<string>();

/**
 * Returns the real member count of a voice channel by fetching it from Discord.
 * With makeCache/sweeper, channel.members may be empty even when people are inside.
 * We re-fetch the channel so Discord.js repopulates the members collection.
 */
async function isMemberlessChannel(
	channel: VoiceBasedChannel | null | undefined
): Promise<boolean> {
	if (!channel || channel.type !== ChannelType.GuildVoice) return false;
	try {
		// Re-fetch forces Discord.js to pull fresh member data from the gateway cache
		// (not an API call — it hits the in-memory guild member store that makeCache
		// may have swept from the channel's own .members collection).
		const fresh = (await channel.fetch()) as BaseGuildVoiceChannel;
		return fresh.members.size === 0;
	} catch {
		// If the channel is already gone, treat it as empty
		return true;
	}
}

export const event: BotEvent = {
	name: "voiceStateUpdate",
	run: async (client: Client, oldState: VoiceState, newState: VoiceState) => {
		if (!oldState || !oldState.guild) return;

		// Avoid some troubles
		if (newState.channelId === oldState.channelId) return;

		const baseData = (await client.db.get(
			`${newState.guild.id}.VOICE_INTERFACE`
		)) as DatabaseStructure.VoiceData | null | undefined;

		if (!baseData || !baseData.voice_channel) {
			return;
		}

		const allChannel = await tempTable.get(
			`CUSTOM_VOICE.${newState.guild.id}`
		);
		const result_channel =
			newState.guild.channels.cache.get(baseData.voice_channel) ||
			(await newState.guild.channels
				.fetch(baseData.voice_channel)
				.catch(() => null));
		const categoryChannelId =
			baseData.voice_channel_category || result_channel?.parentId;
		const category_channel = categoryChannelId
			? ((await newState.guild.channels
					.fetch(categoryChannelId)
					.catch(() => null)) as CategoryChannel | null)
			: null;

		let channelDb = (await tempTable.get(
			`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`
		)) as string | null | undefined;
		let ownedChannel = channelDb
			? ((await newState.guild.channels
					.fetch(channelDb)
					.catch(() => null)) as BaseGuildVoiceChannel | null)
			: null;

		if (ownedChannel && ownedChannel.type !== ChannelType.GuildVoice) {
			ownedChannel = null;
		}

		if (channelDb && !ownedChannel) {
			await tempTable.delete(
				`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`
			);
			channelDb = null;
		}

		if (
			oldState.channelId === channelDb &&
			(await isMemberlessChannel(oldState.channel))
		) {
			await oldState.channel?.delete().catch(() => {});
			await tempTable.delete(
				`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`
			);
			await tempTable.delete(
				`TEMPVOICE_PANEL.${newState.guild.id}.${oldState.channelId}`
			);
			channelDb = null;
			ownedChannel = null;
		}

		if (newState.channelId === baseData.voice_channel && ownedChannel) {
			await newState.member?.voice
				.setChannel(ownedChannel.id)
				.catch(() => {});
			return;
		}

		if (oldState.channel && allChannel) {
			const allChannelEntries = Object.entries(allChannel);

			for (const [userId, channelChannelId] of allChannelEntries) {
				if (channelChannelId !== oldState.channelId) continue;
				if (userId === newState.member?.id) continue;

				const userChannel = (newState.guild.channels.cache.get(
					channelChannelId as string
				) ||
					(await newState.guild.channels
						.fetch(channelChannelId as string)
						.catch(() => null))) as BaseGuildVoiceChannel | null;

				if (
					oldState.channelId === channelChannelId &&
					(await isMemberlessChannel(
						userChannel as VoiceBasedChannel
					))
				) {
					await userChannel?.delete().catch(() => {});
					await tempTable.delete(
						`CUSTOM_VOICE.${newState.guild.id}.${userId}`
					);
					await tempTable.delete(
						`TEMPVOICE_PANEL.${newState.guild.id}.${channelChannelId}`
					);
					break;
				}
			}
		}

		const lang = await client.func.getLanguageData(newState.guild.id);

		// If the user join the Create's Channel
		if (newState.channelId === baseData.voice_channel && result_channel) {
			const creationKey = `${newState.guild.id}.${newState.member?.id}`;
			if (pendingCustomVoiceCreations.has(creationKey)) return;
			pendingCustomVoiceCreations.add(creationKey);
			const PotentialCategory = baseData.voice_channel_category
				? oldState.guild.channels.cache.get(
						baseData.voice_channel_category
					) ||
					(await oldState.guild.channels
						.fetch(baseData.voice_channel_category)
						.catch(() => null))
				: null;
			const username =
				newState.member?.displayName || newState.member?.nickname;

			newState.guild.channels
				.create({
					name: lang.temporary_voice_channel_name.replace(
						"{nickname}",
						maskLink(username!)
					),
					parent: result_channel?.parentId,
					permissionOverwrites:
						category_channel?.permissionOverwrites.cache,
					type: ChannelType.GuildVoice
				})
				.then(async (chann) => {
					try {
						await tempTable.set(
							`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`,
							chann.id
						);
						if (PotentialCategory?.id) {
							await chann
								.setParent(PotentialCategory.id)
								.catch(() => null);
						}

						if (baseData?.voice_channel_position === "top") {
							await chann
								.setPosition(0, {
									relative: true
								})
								.catch(() => null);
						}

						if (baseData?.voice_channel_name) {
							await chann
								.setName(
									baseData.voice_channel_name.includes(
										"{Username}"
									)
										? baseData.voice_channel_name.replace(
												"{Username}",
												username!
											)
										: baseData.voice_channel_name +
												" " +
												username
								)
								.catch(() => null);
						}

						newState.member?.voice
							.setChannel(chann.id)
							.then(async () => {
								const movedMember = await newState.guild.members
									.fetch({
										user: newState.member?.id as string,
										force: true
									})
									.catch(() => null);

								if (
									!movedMember ||
									movedMember.voice.channelId !== chann.id
								) {
									await chann.delete().catch(() => {});
									const current = (await tempTable.get(
										`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`
									)) as string | null | undefined;
									if (current === chann.id) {
										await tempTable.delete(
											`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`
										);
									}
									return;
								}

								// Permissions propriétaire
								await chann.permissionOverwrites
									.edit(newState.member?.user.id as string, {
										ViewChannel: true,
										Connect: true,
										Stream: true,
										Speak: true,
										SendMessages: true,
										UseApplicationCommands: true,
										AttachFiles: true,
										AddReactions: true
									})
									.catch(() => null);

								// Permissions staff
								if (baseData.staff_role) {
									if (
										typeof baseData.staff_role === "string"
									) {
										// backward compatibility
										await chann.permissionOverwrites
											.edit(baseData.staff_role, {
												ViewChannel: true,
												Connect: true,
												Stream: true,
												Speak: true,
												SendMessages: true,
												UseApplicationCommands: true,
												AttachFiles: true,
												AddReactions: true,
												MuteMembers: true,
												DeafenMembers: true,
												PrioritySpeaker: true,
												KickMembers: true
											})
											.catch(() => null);
									} else {
										for (let roleId of baseData.staff_role) {
											if (
												newState.guild.roles.cache.get(
													roleId
												)
											) {
												await chann.permissionOverwrites
													.edit(roleId, {
														ViewChannel: true,
														Connect: true,
														Stream: true,
														Speak: true,
														SendMessages: true,
														UseApplicationCommands: true,
														AttachFiles: true,
														AddReactions: true,
														MuteMembers: true,
														DeafenMembers: true,
														PrioritySpeaker: true,
														KickMembers: true
													})
													.catch(() => null);
											}
										}
									}
								}

								// Components V2 control panel inside the voice channel
								await chann
									.send({
										components: [
											buildVoicePanel(
												lang,
												chann.name,
												newState.member?.user
													.id as string
											)
										],
										flags: [MessageFlags.IsComponentsV2]
									})
									.then(async (panel) => {
										await tempTable.set(
											`TEMPVOICE_PANEL.${newState.guild.id}.${chann.id}`,
											panel.id
										);
									})
									.catch(() => null);
							})
							.catch(async () => {
								await chann.delete().catch(() => {});
								const current = (await tempTable.get(
									`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`
								)) as string | null | undefined;
								if (current === chann.id) {
									await tempTable.delete(
										`CUSTOM_VOICE.${newState.guild.id}.${newState.member?.id}`
									);
								}
							});
					} finally {
						pendingCustomVoiceCreations.delete(creationKey);
					}
				})
				.catch(() => {
					pendingCustomVoiceCreations.delete(creationKey);
				});
			return;
		}
	}
};

export async function recoverCustomVoiceChannels(client: Client) {
	for (const guild of client.guilds.cache.values()) {
		const allCustomChannels = await tempTable.get(
			`CUSTOM_VOICE.${guild.id}`
		);

		// If no custom voice channels exist for this guild, skip
		if (!allCustomChannels) continue;

		const allChannelEntries = Object.entries(allCustomChannels);

		for (const [userId, channelId] of allChannelEntries) {
			try {
				if (typeof channelId !== "string" || !channelId) {
					await tempTable.delete(
						`CUSTOM_VOICE.${guild.id}.${userId}`
					);
					continue;
				}
				// Fetch the channel from Discord
				const channel = (guild.channels.cache.get(channelId) ||
					(await guild.channels
						.fetch(channelId)
						.catch(() => null))) as BaseGuildVoiceChannel | null;

				if (!channel) {
					await tempTable.delete(
						`CUSTOM_VOICE.${guild.id}.${userId}`
					);
					continue;
				}

				if (await isMemberlessChannel(channel as VoiceBasedChannel)) {
					await channel.delete().catch(() => {});
					// Clean up database entry
					await tempTable.delete(
						`CUSTOM_VOICE.${guild.id}.${userId}`
					);
					await tempTable.delete(
						`TEMPVOICE_PANEL.${guild.id}.${channelId}`
					);
				}
				// If any error occurs, clean up the database entry
			} catch {
				await tempTable.delete(`CUSTOM_VOICE.${guild.id}.${userId}`);
			}
		}
	}
}
