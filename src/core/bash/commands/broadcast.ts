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

import { BaseGuildTextChannel, Client, EmbedBuilder } from 'discord.js';
import logger from "../../logger.js";

export default function (client: Client, args: string) {
    let args2 = args.split(" ");
    let embed = new EmbedBuilder()
        .setColor('#4dff00')
        .setTitle('@Broadcast message')
        .setDescription(`\`${args2.slice(0).join(" ")}\``)
        .setFooter({ text: `Kisakay - iHorizon`, iconURL: "attachment://icon.png" });

    client.guilds.cache.forEach(async (guild) => {
        let channel = guild.channels.cache.find((role: { name: string; }) => role.name === 'ihorizon-logs');
        if (channel) {
            (channel as BaseGuildTextChannel).send({
                content: '@here',
                embeds: [embed],
                files: [{ attachment: await guild.client.functions.image64(client.user?.displayAvatarURL({ extension: 'png', forceStatic: false, size: 4096 })), name: 'icon.png' }]
            })
        };
    });

    logger.legacy(`* All are successfully sended`.gray().bgBlack());
};