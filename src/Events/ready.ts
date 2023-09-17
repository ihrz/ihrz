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

import { Client, Collection, ApplicationCommandType, PermissionsBitField, ActivityType, Guild, Embed, EmbedBuilder } from 'discord.js';
import { execSync } from 'child_process';

export = async (client: Client) => {
    await register(client, client.register_arr.map((command: { name: string; description: string; options: JSON }) => ({
        name: command.name,
        description: command.description,
        options: command.options,
        type: ApplicationCommandType.ChatInput
    })));

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
            "The only true wisdom is in knowing you know nothing. - Socrates",
            "Life is really simple, but we insist on making it complicated. - Confucius",
            "The unexamined life is not worth living. - Socrates",
            "Happiness is not something ready-made. It comes from your own actions. - Dalai Lama",
            "The only way to do great work is to love what you do. - Steve Jobs",
            "In three words I can sum up everything I've learned about life: it goes on. - Robert Frost",
            "The greatest glory in living lies not in never falling, but in rising every time we fall. - Nelson Mandela",
            "Life is 10% what happens to us and 90% how we react to it. - Charles R. Swindoll",
            "The purpose of our lives is to be happy. - Dalai Lama",
            "I have not failed. I've just found 10,000 ways that won't work. - Thomas A. Edison",
            "The best way to predict your future is to create it. - Peter Drucker",
            "The only limit to our realization of tomorrow will be our doubts of today. - Franklin D. Roosevelt",
            "In the end, it's not the years in your life that count. It's the life in your years. - Abraham Lincoln",
            "The greatest wealth is to live content with little. - Plato",
            "Life is a succession of lessons which must be lived to be understood. - Ralph Waldo Emerson",
            "The only way to escape the corruptible effect of praise is to go on working. - Albert Einstein",
            "Life is what happens when you're busy making other plans. - John Lennon",
            "The secret of success is to know something nobody else knows. - Aristotle Onassis"
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
                if (i !== 'TEMP') {
                    execSync(`git pull`, {
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

    setInterval(quotesPresence, 80_000), setInterval(refreshSchedule, 15_000);

    await fetchInvites(), refreshDatabaseModel(), term(), quotesPresence(), refreshSchedule();
};