/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { BaseGuildTextChannel, EmbedBuilder } from 'discord.js';
import { BashCommands } from '../../../../types/bashCommands.js';

export const command: BashCommands = {
    command_name: "broadcast",
    command_description: "Send a message to all of iHorizon guild",
    aliases: ["bc", "announce", "sendall", "send"],
    run: async function (client, stream, args) {
        let embed = new EmbedBuilder()
            .setColor('#4dff00')
            .setTitle('@Broadcast message')
            .setDescription(`\`${args.join(" ")}\``)
            .setFooter({ text: `Kisakay - iHorizon`, iconURL: "attachment://footer_icon.png" });

        let i = 0;
        for (let guildId of client.guilds.cache) {
            let guild = guildId[1];
            try {
                let channel = guild.channels.cache.find((chann) => chann.name === 'ihorizon-logs');
                if (channel) {
                    (channel as BaseGuildTextChannel).send({
                        content: '@here',
                        embeds: [embed],
                        files: [await client.method.bot.footerAttachmentBuilder(client)]
                    });
                    i++;
                };
            } catch { }
        };

        stream.write(`* All are successfully sended to ${i} guild(s)`.gray.bgBlack);
    }
};