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

import { ActionRow, ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, Embed, EmbedBuilder } from "discord.js";

async function Init(client: Client) {
    Refresh(client);

    setInterval(() => {
        Refresh(client);
    }, 30000);
}

async function Refresh(client: Client) {
    let all = await client.db.all();

    all.forEach((v: any) => {
        if (Number(v.id)) {
            if(!v.value.PFPS) return;
            if (v.value.PFPS.disable) return;
            if (!v.value.PFPS.channel) return;

            SendMessage(client, {
                guildId: v.id,
                channelId: v.value.PFPS.channel
            })
        }
    });
}

async function SendMessage(client: Client, data: { guildId: string; channelId: string; }) {

    let guild = client.guilds.cache.get(data.guildId);
    let channel = guild?.channels.cache.get(data.channelId);

    if (!guild || !channel) return;

    // Verify the cache has been initialized
    if (guild?.members.cache.random()?.user === client.user) {
        await guild?.members.fetch();
    };

    let user = guild?.members.cache.filter(user => !user.user.bot).random();
    let actRow = new ActionRowBuilder();
    let ebds = [];

    if (user?.avatarURL() !== null) {

        actRow.addComponents(new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setURL(user?.displayAvatarURL({ extension: 'png' }) as string)
            .setLabel('Download Guild Avatar')
        );

        ebds.push(new EmbedBuilder()
            .setColor('#a2add0')
            .setTitle(`${user?.user.username || user?.user.globalName}'s **Guild** avatar`)
            .setImage(user?.displayAvatarURL({ extension: 'png', forceStatic: false }) as string)
        );

    };

    actRow.addComponents(new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setURL(user?.user.displayAvatarURL({ extension: 'png' }) as string)
        .setLabel('Download User Avatar')
    );

    ebds.push(new EmbedBuilder()
        .setColor('#a2add0')
        .setTitle(`${user?.user.username || user?.user.globalName}'s **User** avatar`)
        .setImage(user?.user.displayAvatarURL({ extension: 'png', forceStatic: false }) as string)
        .setTimestamp()
        .setFooter({ text: 'iHorizon' })
    );

    (channel as any).send({
        embeds: ebds, components: [actRow]
    });
    return;
}

export {
    Init
}