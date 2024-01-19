/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import { AttachmentBuilder, Client, GuildMember, GuildTextBasedChannel, Message } from "discord.js";
import logger from "../../core/logger.js";
import captcha from "../../core/captcha.js";

export default async (client: Client, member: GuildMember) => {

    let baseData = await client.db.get(`${member.guild.id}.SECURITY`);
    if (!baseData || baseData?.disable === true) return;

    let data = await client.functions.getLanguageData(member.guild.id);
    let channel = member.guild.channels.cache.get(baseData?.channel);
    let { code, image } = await captcha(280, 100);

    let sfbuff = Buffer.from((image).split(",")[1], "base64");
    let sfattach = new AttachmentBuilder(sfbuff);

    (channel as GuildTextBasedChannel).send({
        content: data.event_security
            .replace('${member}', member),
        files: [sfattach]
    }).then(async (msg) => {
        let filter = (m: Message) => m.author.id === member.id;
        let collector = msg.channel.createMessageCollector({ filter: filter, time: 30000 });
        let passedtest = false;

        collector.on('collect', (m) => {
            m.delete().catch(() => { });

            if (code === m.content) {
                member.roles.add(baseData?.role).catch(() => { });
                msg.delete().catch(() => { });
                passedtest = true;
                collector.stop();
                return;
            } else {
                // the member has failed the captcha 
                msg.delete().catch(() => { });
                member.kick().catch(() => { });
                return;
            }
        });

        collector.on('end', (collected) => {
            if (passedtest) return;
            msg.delete().catch(() => { });
            member.kick().catch(() => { });
        });

    }).catch((error: any) => {
        logger.err(error);
    });

};