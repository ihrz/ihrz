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

import logger from "../core/logger";
import couleurmdr from 'colors';
import config from "../files/config";
import * as db from '../core/functions/DatabaseModel';

import register from '../core/slashSync';
import date from 'date-and-time';
import path from 'path';
import fs from 'fs';

import { Client, Collection, ApplicationCommandType, PermissionsBitField, ActivityType, Guild, Embed, EmbedBuilder } from 'discord.js';
import { execSync } from 'child_process';

export = async (client: Client) => {
    await register(client, client.commands)

    async function term() {
        logger.log(couleurmdr.magenta("(_) /\\  /\\___  _ __(_)_______  _ __  ")),
            logger.log(couleurmdr.magenta("| |/ /_/ / _ \\| '__| |_  / _ \\| '_ \\ ")),
            logger.log(couleurmdr.magenta("| / __  / (_) | |  | |/ / (_) | | | |")),
            logger.log(couleurmdr.magenta("|_\\/ /_/ \\___/|_|  |_/___\\___/|_| |_|" + ` (${client.user?.tag}).`)),
            logger.log(couleurmdr.magenta(`${config.console.emojis.KISA} >> Mainly dev by Kisakay ♀️`));
    };

    async function fetchInvites() {
        client.guilds.cache.forEach(async (guild: any) => {
            try {
                if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;

                var firstInvites = await guild.invites.fetch();

                client.invites.set(guild.id, new Collection(firstInvites.map((invite: any) => [invite.code, invite.uses])));
            } catch (error: any) {
                logger.err(couleurmdr.red(`Error fetching invites for guild ${guild.id}: ${error}`));
            };
        });
    };

    async function refreshDatabaseModel() {
        await db.DataBaseModel({ id: db.Set, key: `GLOBAL.OWNER.${config.owner.ownerid1}`, value: { owner: true } }),
            await db.DataBaseModel({ id: db.Set, key: `GLOBAL.OWNER.${config.owner.ownerid2}`, value: { owner: true } }),
            await db.DataBaseModel({ id: db.Set, key: `TEMP`, value: {} });
    };

    async function quotesPresence() {
        let quotes = [
            "discord.gg/ihorizon",
            "Our goal is to make the internet simpler!",
            "250K USERS !? 🥳🥳🥳",
            "It's not 200k anymore it's 250k 😎😎😎😎",
            "trusted by big servers 😎",
            "Happy back to school 😭😭😭",
            "Nah men I'm not getting paid enough to manage 250K users...",
            "Did you know you can have your own iHorizon? For really cheap??",
            "We are now open source!!!",
            "Never gonna give you up...BRO YOU'VE BEEN RICK ROLLED BY A BOT",
            "I have a youtube channel!",
            "I forgor",
            "I removed my own database (going insane) 😎😎😎",
            "I can code myself (Not a joke)",
            "Looking for a botfriend 😎",
            "My owner doesn't use tiktok...I INSTALLED IT BEHIND HER BACK",
            "I BROKED MY CODE HELP ME",
            "What is a database? Do I really need one?",
            "My parents : Don't work too much, me : I forgor"
        ];

        let randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        client.user?.setPresence({ activities: [{ name: randomQuote, type: ActivityType.Custom }] });
    };

    async function refreshSchedule() {
        let listAll = await db.DataBaseModel({ id: db.Get, key: `SCHEDULE` });
        let dateNow = Date.now();
        let desc: string = '';

        for (let user in listAll) {
            let member = client.users.cache.get(user);

            for (let code in listAll[user]) {
                if (listAll[user][code]?.expired <= dateNow) {
                    desc += `${date.format(new Date(listAll[user][code]?.expired), 'YYYY/MM/DD HH:mm:ss')}`;
                    desc += `\`\`\`${listAll[user][code]?.title}\`\`\``;
                    desc += `\`\`\`${listAll[user][code]?.description}\`\`\``;

                    let embed = new EmbedBuilder()
                        .setColor('#56a0d3')
                        .setTitle(`#${code} Schedule has been expired!`)
                        .setDescription(desc)
                        .setThumbnail((member?.avatarURL() as any))
                        .setTimestamp()
                        .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() });

                    member?.send({
                        content: `<@${member.id}>`,
                        embeds: [embed]
                    }).catch(() => { });

                    await db.DataBaseModel({ id: db.Delete, key: `SCHEDULE.${user}.${code}` });
                };
            };
        };
    };

    async function otherBotPowerOn() {
        let result = await db.DataBaseModel({
            id: db.Get,
            key: `OWNIHRZ`
        });

        for (let i in result) {
            for (let c in result[i]) {
                if (result[i][c].power_off) break;

                if (i !== 'TEMP') {

                    if (fs.existsSync(path.join(result?.[i]?.[c]?.path, 'dist'))) {
                        execSync(`rm -r dist`, {
                            stdio: [0, 1, 2],
                            cwd: result?.[i]?.[c]?.path,
                        });
                    };

                    execSync(`git pull`, {
                        stdio: [0, 1, 2],
                        cwd: result?.[i]?.[c]?.path,
                    });
                    execSync(`npx tsc`, {
                        stdio: [0, 1, 2],
                        cwd: result?.[i]?.[c]?.path,
                    });
                    execSync(`mv dist/index.js dist/${result?.[i]?.[c]?.code}.js`, {
                        stdio: [0, 1, 2],
                        cwd: result?.[i]?.[c]?.path,
                    });
                    execSync(`pm2 start dist/${result?.[i]?.[c]?.code}.js -f`, {
                        stdio: [0, 1, 2],
                        cwd: result?.[i]?.[c]?.path,
                    });
                };
            }
        }
    };
    otherBotPowerOn();

    setInterval(quotesPresence, 30_000), setInterval(refreshSchedule, 15_000);

    fetchInvites(), refreshDatabaseModel(), term(), quotesPresence(), refreshSchedule();
};