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

import { Client, GatewayIntentBits, ActivityType, BaseGuildTextChannel } from "discord.js";
import { log as Ox } from 'console';
import { readFile } from "fs/promises";
import { writeFileSync } from "fs";

const ALL_CLIENT: Client[] = [];

let tokens_path = `${process.cwd()}/all_discord_bot_tokens.txt`
let ALL_TOKEN = (await readFile(tokens_path, 'utf-8')).split('\n');

const DEVELOPER: string[] = [
    '1181123770845503600',
    '233657223190937601'
]

let FIRST_BOT: string | false = false;

async function i(x: string) {
    try {
        const response = await fetch("https://discord.com/api/v10/applications/@me", {
            method: "PATCH",
            headers: {
                Authorization: "Bot " + x,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ flags: 565248 }),
        });
        return await response.json();

    } catch (_) {
        Ox(_);
    }
};

function w(milliseconds: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
};

for (const token of ALL_TOKEN) {
    // await i(ALL_TOKEN[token]);

    let _ = new Client({
        intents: [
            GatewayIntentBits.DirectMessageReactions,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.DirectMessageTyping,
            GatewayIntentBits.GuildIntegrations,
            GatewayIntentBits.GuildInvites,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMessageTyping,
            GatewayIntentBits.GuildPresences,
            GatewayIntentBits.Guilds,
            GatewayIntentBits.MessageContent
        ],
    });

    _.on('ready', async _ => {
        if (FIRST_BOT === false) FIRST_BOT = _.user?.id!;

        _.user.setActivity({ type: ActivityType.Listening, name: 'orders' });
        _.user.setStatus('dnd');
        Ox(`${_.user.tag} >> Ready | https://discord.com/oauth2/authorize?client_id=${_.user.id}&scope=bot&permissions=0`);
    })

    let isSpamming: boolean = false;

    _.on('messageCreate', async (m) => {
        if (!DEVELOPER.includes(m.author.id)) return;
        if (!m.guild || !m.channel) return;
        let args = m.content.split(' ');

        if (m.content.startsWith('start')) {
            m.react('✅').catch(() => { });
            isSpamming = true;
            let count = parseInt(args[1]) || 1;
            for (let i = 0; i < count; i++) {
                if (!isSpamming) break;
                m.channel.send("le code d'anaïs & sown est spé").catch(() => { });
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else if (m.content.startsWith('stop')) {
            isSpamming = false;
            m.react('✅').catch(() => { });
        } else if (m.content.startsWith('cspam')) {
            m.react('✅').catch(() => { });
            isSpamming = true;
            let count = parseInt(args[1]) || 1;
            m.guild.channels.cache.forEach(async channel => {
                if (channel.isTextBased() && channel instanceof BaseGuildTextChannel) {
                    for (let i = 0; i < count; i++) {
                        if (!isSpamming) break;
                        (channel as BaseGuildTextChannel).send("le code d'anaïs & sown est spé").catch(() => { });
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            })
        } else if (m.content.startsWith('renew')) {
            if (FIRST_BOT !== m.client.user.id) return m.react('❌');

            let ignore = args[1]?.split(',');
            m.guild.channels.cache.forEach(async channel => {
                if (channel.isTextBased() && channel instanceof BaseGuildTextChannel && !ignore?.includes(channel.id)) {
                    await channel?.delete();
                    await channel?.clone({
                        name: channel.name,
                        parent: channel.parent,
                        permissionOverwrites: channel.permissionOverwrites.cache!,
                        topic: (channel as BaseGuildTextChannel).topic!,
                        nsfw: channel.nsfw,
                        rateLimitPerUser: channel.rateLimitPerUser!,
                        position: channel.rawPosition,
                        reason: `Channel re-create by ${m.author.username}`
                    });
                }
            })
        } else if (m.content.startsWith("untimeout")) {
            let xyz = m.guild.members.cache.filter(x => x.isCommunicationDisabled());

            if (FIRST_BOT !== m.client.user.id) return m.react('❌');

            if (xyz.size === 0) {
                m.reply("Aucun mec à untimeout")
            } else {
                xyz.forEach(async k => { await k.timeout(null); });
            }
        }
    });

    _.login(token).then(() => ALL_CLIENT.push(_)).catch(() => {
        Ox(`[INVALID-TOKEN] >> ` + token)
        ALL_TOKEN = ALL_TOKEN.filter(z => z !== token);
        writeFileSync(tokens_path, ALL_TOKEN.join('\n'));
    });
}

process.on('SIGINT', async () => {
    for (let x in ALL_CLIENT) { await ALL_CLIENT[x].destroy(); Ox('\n', ALL_CLIENT[x].user?.tag, 'log out') }
})