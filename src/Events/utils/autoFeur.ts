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

import { ChannelType, Client, Message } from 'discord.js';
import { BotEvent } from '../../../types/event.js';
import { guildPrefix } from '../../core/functions/prefix.js';
export const auto_respond: { [key: string]: string } = {
	"feur": "tgl",
	"quoi": "feur",
	"salut": "tgl",
	"tgl": "toi même fdp",
	"wesh": "wesh canne à pêche",
	"pd": "parle mieux fils",
	"tcon": "tu t'es vu toi? mdrr",
	"aïe": "aïe aïe aïe",
	"ah": "b",
	"hein": "deux",
	"ok": "oklm",
	"non": "si",
	"si": "non",
	"oui": "bah non en fait",
	"bof": "comme ta daronne",
	"mdr": "rigole pas trop stp",
	"lol": "t'as 40 ans ?",
	"ptdr": "tu t'es pissé dessus ?",
	"bruh": "bruh toi-même",
	"nique": "ta race",
	"zebi": "ta grand-mère la zébrée",
	"putain": "encore ?",
	"jsuis mort": "meurs pas stp",
	"t'es sérieux": "non j'fais semblant",
	"tg": "tgl",
	"quoi ?": "feur",
	"hein ?": "deux",
	"koé": "feur 2.0",
	"ouais": "non",
	"je sais": "ta gueule hermione",
};

export const event: BotEvent = {
	name: "messageCreate",
	run: async (client: Client, message: Message) => {
		if (
			!message.guild
			|| message.author.bot
			|| message.channel.type === ChannelType.DM
			|| message.author.id === client.user?.id
			|| await client.db.get(`${message.guildId}.UTILS.autoFeur`) === false
		) {
			return;
		}

		let guildLang = await client.db.get(`${message.guild?.id}.GUILD.LANG.lang`);

		if (guildLang === "fr-ME") {
			if (auto_respond[message.content.toLowerCase()]) {
				var msg = auto_respond[message.content.toLowerCase()];
				// 1 chance sur 8
				if (!await client.db.has(`${message.guildId}.UTILS.autoFeur`) && (Math.floor(Math.random() * 8) === 0)) {
					msg += `\n-# ${client.iHorizon_Emojis.VC_OpenChat} Jte pète les couilles ? fait \`${(await guildPrefix(client, message.guildId!)).string}autorespond\` pour me faire fermer ma gueule pétasse!`
				}

				message.reply({ content: msg });
			}
		}
	},
};