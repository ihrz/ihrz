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

import { Client, Collection, PermissionsBitField, ActivityType, EmbedBuilder, GuildFeature } from 'discord.js';
import { Init } from "../core/pfpsManager";
import logger from "../core/logger";
import couleurmdr from 'colors';
import config from "../files/config";
import register from '../core/commandsSync';

import date from 'date-and-time';

export = async (client: Client) => {
    await register(client);

    async function term() {
        logger.log(couleurmdr.magenta("(_) /\\  /\\___  _ __(_)_______  _ __  "));
        logger.log(couleurmdr.magenta("| |/ /_/ / _ \\| '__| |_  / _ \\| '_ \\ "));
        logger.log(couleurmdr.magenta("| / __  / (_) | |  | |/ / (_) | | | |"));
        logger.log(couleurmdr.magenta("|_\\/ /_/ \\___/|_|  |_/___\\___/|_| |_|" + ` (${client.user?.tag}).`));
        logger.log(couleurmdr.magenta(`${config.console.emojis.KISA} >> Mainly dev by Kisakay ♀️`));
    };

    async function fetchInvites() {
        client.guilds.cache.forEach(async (guild) => {
            try {
                if (!guild.members.me?.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) return;
                var firstInvites = await guild.invites.fetch();
                client.invites.set(guild.id, new Collection(firstInvites.map((invite) => [invite.code, invite.uses])));

                if (guild.features.includes(GuildFeature.VanityURL)) {
                    guild.fetchVanityData().then((vanityInvite) => {
                        client.vanityInvites.set(guild.id, vanityInvite);
                    });
                }
            } catch (error: any) {
                logger.err(couleurmdr.red(`Error fetching invites for guild ${guild.id}: ${error}`));
            };
        });
    };

    async function refreshDatabaseModel() {
        await client.db.set(`GLOBAL.OWNER.${config.owner.ownerid1}`, { owner: true });
        await client.db.set(`GLOBAL.OWNER.${config.owner.ownerid2}`, { owner: true });
        await client.db.set(`TEMP`, {});
    };

    async function quotesPresence() {
        let quotes = [
            "Custom this Presence with /presence",
        ];
        let e = await client.db.get(`BOT.PRESENCE`);

        if (e) {
            client.user?.setActivity(e.name, {
                type: e.type,
                url: "https://www.twitch.tv/anaissaraiva"
            });
        } else {
            let randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            client.user?.setPresence({ activities: [{ name: randomQuote, type: ActivityType.Playing }] });
        };
    };

    async function refreshSchedule() {
        let listAll = await client.db.get(`SCHEDULE`);
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
                        .setThumbnail((member?.displayAvatarURL() as string))
                        .setTimestamp()
                        .setFooter({ text: 'iHorizon', iconURL: client.user?.displayAvatarURL() });

                    member?.send({
                        content: `<@${member.id}>`,
                        embeds: [embed]
                    }).catch(() => { });

                    await client.db.delete(`SCHEDULE.${user}.${code}`);
                };
            };
        };
    };

    setInterval(quotesPresence, 80_000), setInterval(refreshSchedule, 15_000);

    fetchInvites(), refreshDatabaseModel(), term(), quotesPresence(), refreshSchedule();

    Init(client);
};