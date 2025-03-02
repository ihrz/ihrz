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

import { Client, GatewayIntentBits, ActivityType, BaseGuildTextChannel } from 'discord.js';
import { log as Ox } from 'console';
import { readFile } from "fs/promises";
import { writeFileSync } from "fs";
import { generatePassword } from '../src/core/functions/random.js';

// Définir le chemin des tokens
const tokensPath = `${process.cwd()}/all_discord_bot_tokens.txt`;
let allTokens = (await readFile(tokensPath, 'utf-8')).split('\n');

// Développeurs autorisés
const DEVELOPERS = [
    '1181123770845503600',
    '233657223190937601'
];

const main_bot = "1266794768088956959"

const clients: Client[] = [];

// Fonction pour mettre à jour les flags d'un bot
async function updateBotFlags(token: string) {
    try {
        const response = await fetch("https://discord.com/api/v10/applications/@me", {
            method: "PATCH",
            headers: {
                Authorization: `Bot ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ flags: 565248 }),
        });
        return await response.json();
    } catch (error) {
        Ox(error);
    }
};

// Fonction de délai
function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Création des clients et gestion des événements
for (const token of allTokens) {
    // await updateBotFlags(token);
    const client = new Client({
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

    client.on('ready', async () => {
        client.user?.setActivity({ type: ActivityType.Listening, name: 'orders' });
        client.user?.setStatus('dnd');
        Ox(`${client.user?.tag} >> Ready | https://discord.com/oauth2/authorize?client_id=${client.user?.id}&scope=bot&permissions=0`);
    });

    let isSpamming = false;

    client.on('messageCreate', async (message) => {
        if (!DEVELOPERS.includes(message.author.id)) return;
        if (!message.guild || !message.channel) return;

        const args = message.content.split(' ');

        if (message.content.startsWith('start')) {
            isSpamming = true;
            message.react('✅').catch(() => { });
            const count = parseInt(args[1]) || 1;
            for (let i = 0; i < count; i++) {
                if (!isSpamming) break;
                await client.func.method.channelSend(message, "le code d'anaïs est spé").catch(() => { });
                await wait(1000);
            }
        } else if (message.content.startsWith('stop')) {
            isSpamming = false;
            message.react('✅').catch(() => { });
        } else if (message.content.startsWith('cspam')) {
            isSpamming = true;
            message.react('✅').catch(() => { });
            const count = parseInt(args[1]) || 1;
            message.guild.channels.cache.forEach(async channel => {
                if (channel.isTextBased() && channel instanceof BaseGuildTextChannel) {
                    for (let i = 0; i < count; i++) {
                        if (!isSpamming) break;
                        await (channel as BaseGuildTextChannel).send(generatePassword({ length: 500 })).catch(() => { });
                        // await wait(1000);
                    }
                }
            });
        } else if (message.content.startsWith('renew')) {
            if (main_bot !== client.user?.id) return message.react('❌').catch(() => false);
            const ignore = args[1]?.split(',');
            try {
                message.guild.channels.cache.forEach(async channel => {
                    if (channel.isTextBased() && channel instanceof BaseGuildTextChannel && !ignore?.includes(channel.id)) {
                        await channel.delete();
                        await channel.clone({
                            name: channel.name,
                            parent: channel.parent,
                            permissionOverwrites: channel.permissionOverwrites.cache,
                            topic: (channel as BaseGuildTextChannel).topic ?? '',
                            nsfw: channel.nsfw,
                            rateLimitPerUser: channel.rateLimitPerUser ?? 0,
                            position: channel.rawPosition,
                            reason: `Channel re-create by ${message.author.username}`
                        });
                    }
                });
            } catch (err) {
                Ox(err)
            }
        } else if (message.content.startsWith("untimeout")) {
            if (main_bot !== client.user?.id) return message.react('❌').catch(() => false);
            const timedOutMembers = message.guild.members.cache.filter(member => member.isCommunicationDisabled());
            if (timedOutMembers.size === 0) {
                message.reply("Aucun mec à untimeout");
            } else {
                timedOutMembers.forEach(async member => {
                    member.timeout(null)
                        .then(member => Ox("Untimeout =>", member.user.username))
                        .catch(() => { });
                });
            }
        }
    });

    client.login(token).then(() => clients.push(client)).catch(() => {
        Ox(`[INVALID-TOKEN] >> ${token}`);
        allTokens = allTokens.filter(validToken => validToken !== token);
        writeFileSync(tokensPath, allTokens.join('\n'));
    });
}

// Gestion de la fermeture du processus
process.on('SIGINT', async () => {
    for (const client of clients) {
        await client.destroy();
        Ox(`\n${client.user?.tag} logged out`);
    }
});
