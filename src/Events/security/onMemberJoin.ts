/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { SnowflakeUtil, Client, EmbedBuilder, GuildMember, GuildTextBasedChannel, Message } from 'pwss';

import logger from "../../core/logger.js";
import captcha from "../../core/captcha.js";

import { BotEvent } from '../../../types/event';
import { LanguageData } from '../../../types/languageData.js';

export const event: BotEvent = {
    name: "guildMemberAdd",
    run: async (client: Client, member: GuildMember) => {

        let baseData = await client.db.get(`${member.guild.id}.SECURITY`);
        if (!baseData || baseData?.disable === true) return;

        let data = await client.func.getLanguageData(member.guild.id) as LanguageData;
        let channel = member.guild.channels.cache.get(baseData?.channel);
        if (!channel) return;
        let generatedCaptcha = await captcha(280, 100)

        let sfbuff = Buffer.from((generatedCaptcha?.image).split(",")[1], "base64");
        const memberJoinDate = member.joinedAt;

        let embed = new EmbedBuilder()
            .setColor('#c4001f')
            .setTimestamp()
            .setImage("attachment://captcha.png")
            .setDescription(data.event_security.replace('${member}', member.toString()))
            ;

        /**
         * Why doing this?
         * On iHorizon Production, we have some ~problems~ 👎
         * All of the guildMemberAdd, guildMemberRemove sometimes emiting in double, triple, or quadruple.
         */
        const nonce = SnowflakeUtil.generate().toString();

        (channel as GuildTextBasedChannel).send({
            content: member.toString(),
            embeds: [embed],
            files: [
                { name: "captcha.png", attachment: sfbuff },
            ], enforceNonce: true, nonce: nonce
        }).then(async (msg) => {
            let collector = msg.channel.createMessageCollector({
                filter: (m) => m.author.id === member.id,
                time: 30_000
            });

            let passedtest = false;

            collector.on('collect', async (m) => {
                collector.stop();
                m.delete()
                    .catch(() => { })
                    .then(() => { });

                if (generatedCaptcha.code === m.content) {
                    member.roles.add(baseData?.role)
                        .catch(() => { })
                        .then(() => { });
                    msg.delete()
                        .catch(() => { })
                        .then(() => { });
                    passedtest = true;
                    return;
                } else {
                    msg.delete()
                        .catch(() => { })
                        .then(() => { });
                    member.kick()
                        .catch(() => { })
                        .then(() => { });
                    return;
                }
            });

            collector.on('end', () => {
                if (passedtest) return;

                if (!member.joinedAt && memberJoinDate === member.joinedAt) {
                    member.kick();
                }

                msg.delete()
                    .catch(() => { })
                    .then(() => { });
            });

        }).catch((error: any) => {
            logger.err(error);
        });
    },
};