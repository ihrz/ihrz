/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { AttachmentBuilder, BaseGuildTextChannel, Client, GuildFeature, GuildMember, Invite, PermissionsBitField, SnowflakeUtil } from 'discord.js';
import { BotEvent } from '../../../types/event.js';
import { DatabaseStructure } from '../../../types/database_structure.js';

export async function generateJoinImage(member: GuildMember, optionalOptions?: DatabaseStructure.JoinBannerOptions): Promise<AttachmentBuilder> {
	let htmlContent = member.client.htmlfiles["guildconfigWelcomeCart"];
	const ImageBannerOptions = await member.client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.joinbanner`) as DatabaseStructure.JoinBannerOptions | undefined;

	let backgroundURL = member.guild.bannerURL({ size: 512 }) || member.user.bannerURL({ size: 512 }) || ""
	let profilePictureRound = member.displayHexColor;
	let textColour = "#aa9999";
	let textMessage = member.client.func.method.generateCustomMessagePreview("Welcome {memberUsername} to {guildName}<br>We are now {memberCount} in the guild", {
		user: member.user,
		guild: member.guild,
		guildLocal: "en-US"
	});
	let textSize = "40px";
	let avatarSize = "140px"

	if (optionalOptions) {
		backgroundURL = optionalOptions.backgroundURL;
		textColour = optionalOptions.textColour;
		textMessage = optionalOptions.message;
		textSize = optionalOptions.textSize;
		avatarSize = optionalOptions.avatarSize;

		if (optionalOptions.profilePictureRound === "status") {
			switch (member.presence?.status) {
				case "dnd":
					profilePictureRound = "#f23f43"
					break;
				case "invisible":
				case "offline":
					profilePictureRound = "#80848e"
					break;
				case "idle":
					profilePictureRound = "#f0b232"
					break;
				case "online":
					profilePictureRound = "#23a55a"
					break;
			}
		}
	} else if (ImageBannerOptions) {
		backgroundURL = ImageBannerOptions.backgroundURL;
		textColour = ImageBannerOptions.textColour;
		textMessage = ImageBannerOptions.message;
		textSize = ImageBannerOptions.textSize;
		avatarSize = ImageBannerOptions.avatarSize;

		if (ImageBannerOptions.profilePictureRound === "status") {
			switch (member.presence?.status) {
				case "dnd":
					profilePictureRound = "#f23f43"
					break;
				case "invisible":
				case "offline":
					profilePictureRound = "#80848e"
					break;
				case "idle":
					profilePictureRound = "#f0b232"
					break;
				case "online":
					profilePictureRound = "#23a55a"
					break;
			}
		}
	}

	htmlContent = htmlContent
		.replaceAll("USERLOGO", member.displayAvatarURL({ size: 512 }))
		.replaceAll("USERNAME", member.user.globalName || member.user.displayName)
		.replaceAll("SERVERNAME", member.guild.name)
		.replaceAll("XXX", member.guild.memberCount.toString())
		.replaceAll("#000000", profilePictureRound)
		.replaceAll("BACKGROUNDURL", `url('${backgroundURL}')`)
		.replaceAll("#aa9999", textColour)
		.replaceAll("MSG", member.client.func.method.generateCustomMessagePreview(textMessage, {
			user: member.user,
			guild: member.guild!,
			guildLocal: "fr-FR"
		}))
		.replaceAll("40px", textSize)
		.replaceAll("140px", avatarSize)

	const image = await member.client.func.html2png(htmlContent, {
		omitBackground: false,
		selectElement: false
	});
	return new AttachmentBuilder(image, { name: "image.png" })
};

export const event: BotEvent = {
	name: "guildMemberAdd",
	run: async (client: Client, member: GuildMember) => {
		const data = await client.func.getLanguageData(member.guild.id);

		if (!member.guild.members.me?.permissions.has(PermissionsBitField.Flags.ManageGuild)) return;

		const guildLocal = await client.db.get(`${member.guild.id}.GUILD.LANG.lang`) || "en-US";
		const oldInvites = client.invites.get(member.guild.id);
		const newInvites = await member.guild.invites.fetch();

		const invite = newInvites.find((i: Invite) => i.uses && i.uses > (oldInvites?.get(i.code) || 0));
		const joinMessage = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.joinmessage`);
		const wChan = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.join`);
		const ImageBannerStates = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.joinbannerStates`) as string | undefined;

		const channel = member.guild.channels.cache.get(wChan) as BaseGuildTextChannel;

		const files = [];

		if (ImageBannerStates === "on") {
			files.push(await generateJoinImage(member))
		}

		/**
		 * Why doing this?
		 * On iHorizon Production, we have some ~problems~ 👎
		 * All of the guildMemberAdd, guildMemberRemove sometimes emiting in double, triple, or quadruple.
		 */
		const nonce = SnowflakeUtil.generate().toString();

		if (invite) {
			const inviter = await client.users.fetch(invite?.inviterId!);
			client.invites.get(member.guild.id)?.set(invite?.code, invite?.uses);

			const check = await client.db.get(`${invite?.guild?.id}.USER.${inviter.id}.INVITES`);

			if (check) {

				await client.db.add(`${invite?.guild?.id}.USER.${inviter.id}.INVITES.regular`, 1);
				await client.db.add(`${invite?.guild?.id}.USER.${inviter.id}.INVITES.invites`, 1);

			} else {

				await client.db.set(`${invite?.guild?.id}.USER.${inviter.id}.INVITES`,
					{
						regular: 0, bonus: 0, leaves: 0, invites: 0
					}
				);

				await client.db.add(`${invite?.guild?.id}.USER.${inviter.id}.INVITES.regular`, 1);
				await client.db.add(`${invite?.guild?.id}.USER.${inviter.id}.INVITES.invites`, 1);
			};

			await client.db.set(`${invite?.guild?.id}.USER.${member.user.id}.INVITES.BY`,
				{
					inviter: inviter.id,
					invite: invite?.code,
				}
			);

			const invitesAmount = await client.db.get(`${member.guild.id}.USER.${inviter.id}.INVITES.invites`);
			let isCustomVanity = false; // Is discord.wf link
			let msg = '';

			if (!wChan || !channel) return;

			const CustomVanityInvite = await (client.db.table('API')).get(`VANITY.${member.guild.id}`)
			if (inviter.id === client.user?.id && CustomVanityInvite.invite === invite.code) {
				isCustomVanity = true;
			}

			msg = client.func.method.generateCustomMessagePreview(joinMessage || data.event_welcomer_inviter,
				{
					user: member.user,
					guild: member.guild,
					guildLocal: guildLocal,
					inviter: {
						user: {
							username: (isCustomVanity ? ".wf/" + CustomVanityInvite.vanity : inviter.username),
							mention: isCustomVanity ? "discord.wf/" + CustomVanityInvite.vanity : inviter.toString()
						},
						invitesAmount: invitesAmount
					}
				}
			);

			await client.func.method.channelSend(channel, { content: msg, enforceNonce: true, nonce: nonce, files: files });
			return;

		} else if (member.guild.features.includes(GuildFeature.VanityURL)) {

			let msg = '';
			const VanityURL = await member.guild.fetchVanityData();
			const vanityInviteCache = client.vanityInvites.get(member.guild.id);

			client.vanityInvites.set(member.guild.id, VanityURL);

			const wChan = await client.db.get(`${member.guild.id}.GUILD.GUILD_CONFIG.join`);
			const channel = member.guild.channels.cache.get(wChan) as BaseGuildTextChannel;

			if (!wChan || !channel) return;

			if (vanityInviteCache && vanityInviteCache.uses! < VanityURL.uses!) {
				msg = client.func.method.generateCustomMessagePreview(joinMessage || data.event_welcomer_default,
					{
						user: member.user,
						guild: member.guild,
						guildLocal: guildLocal,
						inviter: {
							user: {
								username: '.gg/' + VanityURL.code,
								mention: VanityURL.code!
							},
							invitesAmount: VanityURL.uses
						}
					}
				);

				await client.func.method.channelSend(channel, { content: msg, enforceNonce: true, nonce: nonce, files });
				return;
			};

		} else {

			let msg = '';
			if (!wChan || !channel) return;

			msg = client.func.method.generateCustomMessagePreview(joinMessage || data.event_welcomer_default,
				{
					user: member.user,
					guild: member.guild,
					guildLocal: guildLocal,
				}
			);

			await client.func.method.channelSend(channel, { content: msg, enforceNonce: true, nonce: nonce, files });
			return;
		};

	},
};