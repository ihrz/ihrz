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
	AttachmentBuilder,
	BaseGuildTextChannel,
	Client,
	Collection,
	Guild,
	GuildFeature,
	GuildMember,
	Invite,
	PermissionsBitField,
	Vanity
} from "discord.js";
import { BotEvent } from "../../../types/event.js";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { InviteCacheData } from "../../../types/client.js";
import { apiTable } from "../client/ready.js";

const INVITE_RESOLVE_TIMEOUT_MS = 1200;

const pendingInviteFetch = new Map<
	string,
	Promise<Collection<string, Invite>>
>();

function fetchInvitesOnce(guild: Guild): Promise<Collection<string, Invite>> {
	const cached = pendingInviteFetch.get(guild.id);
	if (cached) return cached;

	const promise = guild.invites.fetch().finally(() => {
		setTimeout(() => pendingInviteFetch.delete(guild.id), 1500);
	});

	pendingInviteFetch.set(guild.id, promise);
	return promise;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
	return Promise.race([
		promise,
		new Promise<null>((resolve) => {
			setTimeout(() => resolve(null), ms);
		})
	]);
}

export async function generateJoinImage(
	member: GuildMember,
	ImageBannerOptions?: DatabaseStructure.JoinBannerOptions
): Promise<AttachmentBuilder> {
	let htmlContent = member.client.htmlfiles["guildconfigWelcomeCart"];

	let backgroundURL =
		member.guild.bannerURL({ size: 512 }) ||
		member.user.bannerURL({ size: 512 }) ||
		"";
	let profilePictureRound = member.displayHexColor;
	let textColour = "#aa9999";
	let textMessage = member.client.func.method.generateCustomMessagePreview(
		"Welcome {memberUsername} to {guildName}<br>We are now {memberCount} in the guild",
		{
			user: member.user,
			guild: member.guild,
			guildLocal: "en-US"
		}
	);
	let textSize = "40px";
	let avatarSize = "140px";

	if (ImageBannerOptions) {
		backgroundURL = ImageBannerOptions.backgroundURL;
		textColour = ImageBannerOptions.textColour;
		textMessage = ImageBannerOptions.message;
		textSize = ImageBannerOptions.textSize;
		avatarSize = ImageBannerOptions.avatarSize;

		if (ImageBannerOptions.profilePictureRound === "status") {
			switch (member.presence?.status) {
				case "dnd":
					profilePictureRound = "#f23f43";
					break;
				case "invisible":
				case "offline":
					profilePictureRound = "#80848e";
					break;
				case "idle":
					profilePictureRound = "#f0b232";
					break;
				case "online":
					profilePictureRound = "#23a55a";
					break;
			}
		}
	}

	htmlContent = htmlContent
		.replaceAll("USERLOGO", member.displayAvatarURL({ size: 512 }))
		.replaceAll(
			"USERNAME",
			member.user.globalName || member.user.displayName
		)
		.replaceAll("SERVERNAME", member.guild.name)
		.replaceAll("XXX", member.guild.memberCount.toString())
		.replaceAll("#000000", profilePictureRound)
		.replaceAll("BACKGROUNDURL", `url('${backgroundURL}')`)
		.replaceAll("#aa9999", textColour)
		.replaceAll(
			"MSG",
			member.client.func.method.generateCustomMessagePreview(
				textMessage,
				{
					user: member.user,
					guild: member.guild!,
					guildLocal: "fr-FR"
				}
			)
		)
		.replaceAll("40px", textSize)
		.replaceAll("140px", avatarSize);

	const image = await member.client.func.html2png(htmlContent, {
		omitBackground: false,
		selectElement: false
	});
	return new AttachmentBuilder(image, { name: "image.png" });
}

export async function resolveInvite(
	guild: Guild,
	oldInvites: Collection<string, InviteCacheData> | undefined
): Promise<Invite | null> {
	const invites = await fetchInvitesOnce(guild);

	const invite = invites.find((i: Invite) => {
		const oldInvite = oldInvites?.get(i.code);
		return i.uses && i.uses > (oldInvite?.uses || 0);
	});

	if (!invite) return null;

	clientInviteCache(guild, invites);
	return invite;
}

function clientInviteCache(guild: Guild, invites: Collection<string, Invite>) {
	guild.client.invites.set(
		guild.id,
		new Collection(
			invites.map((invite) => [
				invite.code,
				{
					uses: invite.uses,
					inviterId: invite.inviterId,
					inviterUsername: invite.inviter?.username || null
				}
			])
		)
	);
}

async function recordInviterStats(
	client: Client,
	guild: Guild,
	member: GuildMember,
	invite: Invite
): Promise<void> {
	const inviterId = invite.inviterId!;

	const check = await client.db.get(`${guild.id}.USER.${inviterId}.INVITES`);

	if (!check) {
		await client.db.set(`${guild.id}.USER.${inviterId}.INVITES`, {
			regular: 0,
			bonus: 0,
			leaves: 0,
			invites: 0
		});
	}

	await client.db.add(`${guild.id}.USER.${inviterId}.INVITES.regular`, 1);
	await client.db.add(`${guild.id}.USER.${inviterId}.INVITES.invites`, 1);

	await client.db.set(`${guild.id}.USER.${member.user.id}.INVITES.BY`, {
		inviter: inviterId,
		invite: invite.code
	});
}

export const event: BotEvent = {
	name: "guildMemberAdd",
	run: async (client: Client, member: GuildMember) => {
		try {
			if (
				!member.guild.members.me?.permissions.has(
					PermissionsBitField.Flags.ManageGuild
				)
			)
				return;

			const [data, guildLocalRaw, config] = await Promise.all([
				client.func.getLanguageData(member.guild.id),
				client.db.get(`${member.guild.id}.GUILD.LANG.lang`),
				client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG`)
			]);

			const guildLocal = guildLocalRaw || "en-US";
			const {
				joinmessage: joinMessage,
				joinbannerStates: ImageBannerStates,
				join: wChan,
				joinbanner: JoinBannerOptions
			} = config as DatabaseStructure.GuildConfigSchema;

			const oldInvites = client.invites.get(member.guild.id);

			let statsRecorded = false;
			const recordStatsOnce = async (resolved: Invite | null) => {
				if (statsRecorded || !resolved?.inviterId) return;
				statsRecorded = true;
				try {
					await recordInviterStats(
						client,
						member.guild,
						member,
						resolved
					);
				} catch (e) {
					logger.err(member.guild.name, "Invite stats error: " + e);
				}
			};

			const inviteResultPromise = resolveInvite(
				member.guild,
				oldInvites
			).catch((e) => {
				logger.err(member.guild.name, "Invite resolve error: " + e);
				return null;
			});

			const invite = await withTimeout(
				inviteResultPromise,
				INVITE_RESOLVE_TIMEOUT_MS
			);

			inviteResultPromise.then(recordStatsOnce);

			if (invite?.inviterId) {
				await recordStatsOnce(invite);
			}

			logger.debug(
				member.guild.name,
				joinMessage,
				JoinBannerOptions,
				wChan,
				ImageBannerStates,
				invite?.toJSON()
			);

			if (!wChan) return;

			const channel =
				member.guild.channels.cache.get(wChan) ||
				(await member.guild.channels.fetch(wChan).catch(() => null));

			if (!channel) return;

			const files: AttachmentBuilder[] = [];
			if (ImageBannerStates === "on") {
				try {
					files.push(
						await generateJoinImage(member, JoinBannerOptions)
					);
				} catch (e) {
					logger.err(member.guild.name, "Join image error: " + e);
				}
			}

			if (invite?.inviterId) {
				const cachedInvite = client.invites
					.get(member.guild.id)
					?.get(invite.code);
				const inviterId = invite.inviterId;
				const inviterUsername =
					invite.inviter?.username ||
					cachedInvite?.inviterUsername ||
					`@${inviterId}`;
				const inviterMention = `<@${inviterId}>`;

				const invitesAmount = await client.db.get(
					`${member.guild.id}.USER.${inviterId}.INVITES.invites`
				);

				let isCustomVanity = false; // Is discord.wf link
				const CustomVanityInvite = await apiTable.get(
					`VANITY.${member.guild.id}`
				);
				if (
					inviterId === client.user?.id &&
					CustomVanityInvite?.invite === invite.code
				) {
					isCustomVanity = true;
				}

				const msg = client.func.method.generateCustomMessagePreview(
					joinMessage || data.event_welcomer_inviter,
					{
						user: member.user,
						guild: member.guild,
						guildLocal: guildLocal,
						inviter: {
							user: {
								username: isCustomVanity
									? ".wf/" + CustomVanityInvite.vanity
									: inviterUsername,
								mention: isCustomVanity
									? "discord.wf/" + CustomVanityInvite.vanity
									: inviterMention
							},
							invitesAmount: invitesAmount
						}
					}
				);

				await client.func.method.channelSend(
					channel as BaseGuildTextChannel,
					{ content: msg, files }
				);
				return;
			}

			if (member.guild.features.includes(GuildFeature.VanityURL)) {
				const VanityURL: Vanity = await member.guild.fetchVanityData();
				const vanityInviteCache = client.vanityInvites.get(
					member.guild.id
				);
				client.vanityInvites.set(member.guild.id, VanityURL);

				let msg: string;
				if (
					vanityInviteCache &&
					vanityInviteCache.uses! < VanityURL.uses!
				) {
					msg = client.func.method.generateCustomMessagePreview(
						joinMessage || data.event_welcomer_default,
						{
							user: member.user,
							guild: member.guild,
							guildLocal: guildLocal,
							inviter: {
								user: {
									username: ".gg/" + VanityURL.code,
									mention: VanityURL.code!
								},
								invitesAmount: VanityURL.uses
							}
						}
					);
				} else {
					msg = client.func.method.generateCustomMessagePreview(
						joinMessage || data.event_welcomer_default,
						{
							user: member.user,
							guild: member.guild,
							guildLocal: guildLocal
						}
					);
				}

				await client.func.method.channelSend(
					channel as BaseGuildTextChannel,
					{ content: msg, files }
				);
				return;
			}

			const msg = client.func.method.generateCustomMessagePreview(
				joinMessage || data.event_welcomer_default,
				{
					user: member.user,
					guild: member.guild,
					guildLocal: guildLocal
				}
			);

			await client.func.method.channelSend(
				channel as BaseGuildTextChannel,
				{ content: msg, files }
			);
		} catch (error) {
			logger.err(error);
		}
	}
};
