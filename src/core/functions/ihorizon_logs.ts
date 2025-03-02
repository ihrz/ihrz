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

import { BaseGuildTextChannel, ChatInputCommandInteraction, EmbedBuilder, GuildMember, Message } from "discord.js";

export default async function send(
    interaction: ChatInputCommandInteraction<"cached"> | Message,
    embed: {
        title: string;
        description: string;
    }
) {
    try {
        let logEmbed = new EmbedBuilder()
            .setColor("#bf0bb9")
            .setTitle(embed.title)
            .setDescription(embed.description);

        let logchannel = interaction.guild?.channels.cache.find((channel) => channel.name === 'ihorizon-logs');

        if (!logchannel) return;
        (logchannel as BaseGuildTextChannel).send({ embeds: [logEmbed] });
    } catch {
    }
}