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

import { ActionRowBuilder, BaseGuildTextChannel, ButtonBuilder, ButtonStyle, Client, EmbedBuilder } from 'discord.js';

async function PfpsManager_Init(client: Client) {
	Refresh(client);

	setInterval(() => {
		Refresh(client);
	}, 30000);
}

async function Refresh(client: Client) {
	const all = await client.db.all();

	all.forEach((v: any) => {
		if (Number(v.id)) {
			if (!v.value.PFPS) return;
			if (v.value.PFPS.config) return;
			if (!v.value.PFPS.channel) return;

			SendMessage(client, {
				guildId: v.id,
				channelId: v.value.PFPS.channel
			})
		}
	});
}

const usr: Record<string, string> = {};
async function SendMessage(client: Client, data: { guildId: string; channelId: string; }) {

	const guild = await client.guilds.fetch(data.guildId).catch(() => null);
	const channel = guild?.channels.cache.get(data.channelId);

	if (!guild || !channel) return;

	// Verify the cache has been initialized
	if (guild.members.cache.random()?.user.id === client.user?.id) {
		await guild.members.fetch();
	};

	let user = guild.members.cache.filter(user => !user.user.bot).random();

	if (!user) return;

	const lang = await client.func.getLanguageData(guild.id);

	// Prevent the same before and after
	if (user.id === usr[data.guildId]) {
		usr[data.guildId] = (user.id);
		user = guild.members.cache.filter(user => user.id !== usr[data.guildId]).random()!;
	} else usr[data.guildId] = (user.id);

	const actRow: ActionRowBuilder<ButtonBuilder> = new ActionRowBuilder();
	const ebds = [];

	const username = user.user.globalName || user.user.username;

	if (user.avatarURL() !== null) {

		actRow.addComponents(new ButtonBuilder()
			.setStyle(ButtonStyle.Link)
			.setURL(user.displayAvatarURL({ extension: 'png' }).toString())
			.setLabel(lang.pfps_download_guild_button)
		);

		ebds.push(new EmbedBuilder()
			.setColor('#a2add0')
			.setTitle(lang.pfps_embed_guild_title.replace('{username}', username!))
			.setImage(user.displayAvatarURL({ extension: 'png', forceStatic: false }))
		);

	};

	actRow.addComponents(new ButtonBuilder()
		.setStyle(ButtonStyle.Link)
		.setURL(user.user.displayAvatarURL({ extension: 'png' }))
		.setLabel(lang.pfps_download_user_button)
	);

	ebds.push(new EmbedBuilder()
		.setColor('#a2add0')
		.setTitle(lang.pfps_embed_user_title.replace('{username}', username!))
		.setImage(user.user.displayAvatarURL({ extension: 'png', forceStatic: false }))
		.setTimestamp()
		.setFooter(await client.func.displayBotName.footerBuilder(channel.guild.id))
	);

	(channel as BaseGuildTextChannel).send({
		embeds: ebds,
		components: [actRow],
		files: [await client.func.displayBotName.footerAttachmentBuilder(channel.guild)]
	});
	return;
}

export {
	PfpsManager_Init
}