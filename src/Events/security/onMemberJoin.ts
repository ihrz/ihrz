/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { AttachmentBuilder, Client, EmbedBuilder, GuildMember, GuildTextBasedChannel, Message } from 'discord.js';

import logger from "../../core/logger.js";
import captcha from "../../core/captcha.js";

import { BotEvent } from '../../../types/event';
import { LanguageData } from '../../../types/languageData.js';

export const event: BotEvent = {
    name: "guildMemberAdd",
    run: async (client: Client, member: GuildMember) => {

        let baseData = await client.db.get(`${member.guild.id}.SECURITY`);
        if (!baseData || baseData?.disable === true) return;

        let data = await client.functions.getLanguageData(member.guild.id) as LanguageData;
        let channel = member.guild.channels.cache.get(baseData?.channel);
        let generatedCaptcha = await captcha(280, 100)

        let sfbuff = Buffer.from((generatedCaptcha?.image).split(",")[1], "base64");
        const memberJoinDate = member.joinedAt;

        let embed = new EmbedBuilder()
            .setColor('#c4001f')
            .setTimestamp()
            .setImage("attachment://captcha.png")
            .setDescription(data.event_security.replace('${member}', member.toString()))
            ;

        (channel as GuildTextBasedChannel).send({
            content: member.toString(),
            embeds: [embed],
            files: [
                { name: "captcha.png", attachment: sfbuff },
            ]
        }).then(async (msg) => {
            let collector = msg.channel.createMessageCollector({
                filter: (m) => m.author.id === member.id,
                time: 30_000
            });

            let passedtest = false;

            collector.on('collect', async (m) => {
                collector.stop();
                await m.delete();

                if (generatedCaptcha.code === m.content) {
                    member.roles.add(baseData?.role);
                    msg.delete().catch(() => { });
                    passedtest = true;
                    return;
                } else {
                    msg.delete().catch(() => { });
                    member.kick();
                    return;
                }
            });

            collector.on('end', () => {
                if (passedtest) return;

                if (!member.joinedAt && memberJoinDate === member.joinedAt) {
                    member.kick();
                }

                msg.delete().catch(() => { });
            });

        }).catch((error: any) => {
            logger.err(error);
        });
    },
};