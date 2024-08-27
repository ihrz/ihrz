/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { Client, Collection, PermissionsBitField, ActivityType, EmbedBuilder, GuildFeature, User } from 'discord.js';
import { PfpsManager_Init } from "../../core/modules/pfpsManager.js";
import { OwnIHRZ } from "../../core/modules/ownihrzManager.js";
import { format } from '../../core/functions/date-and-time.js';

import status from "../../files/status.json" with { "type": "json" }
import logger from "../../core/logger.js";
import ping from 'ping';

import { BotEvent } from '../../../types/event.js';
import { GiveawayManager } from '../../core/modules/giveawaysManager.js';
import { StreamNotifier } from '../../core/StreamNotifier.js';

export const event: BotEvent = {
    name: "ready",
    run: async (client: Client) => {

        async function fetchInvites() {
            client.guilds.cache.forEach(async (guild) => {
                try {
                    if (!guild.members.me?.permissions.has([PermissionsBitField.Flags.ManageGuild, PermissionsBitField.Flags.ViewAuditLog])) return;
                    guild.invites.fetch().then(guildInvites => {
                        client.invites.set(guild.id, new Collection(guildInvites.map((invite) => [invite.code, invite.uses])));

                        if (guild.features.includes(GuildFeature.VanityURL)) {
                            guild.fetchVanityData().then((vanityInvite) => {
                                client.vanityInvites.set(guild.id, vanityInvite);
                            });
                        }
                    })
                } catch (error: any) {
                    logger.err(`Error fetching invites for guild ${guild.id}: ${error}`.red);
                };
            });
        };

        async function refreshDatabaseModel() {
            await client.db.table(`TEMP`).deleteAll();
            let table = client.db.table('OWNER');
            let owners = [...client.owners, ...(await table.all()).map(x => x.id)];

            owners.forEach(async ownerId => {
                try {
                    let _ = await client.users?.fetch(ownerId);
                    await table.set(_.id, { owner: true })
                } catch {
                    await table.delete(ownerId)
                }
            });
        };

        async function quotesPresence() {
            client.user?.setPresence({ activities: [{ name: status.current[Math.floor(Math.random() * status.current.length)], type: ActivityType.Custom }] });
        };

        async function refreshSchedule() {
            let table = client.db.table("SCHEDULE");
            let listAll = await table.all();

            let dateNow = Date.now();
            let desc: string = '';

            Object.entries(listAll).forEach(async ([userId, array]) => {

                let member = client.users.cache.get(array.id) as User;

                for (let ScheduleId in array.value) {
                    if (array.value[ScheduleId]?.expired <= dateNow) {
                        desc += `${format(new Date(array.value[ScheduleId]?.expired), 'YYYY/MM/DD HH:mm:ss')}`;
                        desc += `\`\`\`${array.value[ScheduleId]?.title}\`\`\``;
                        desc += `\`\`\`${array.value[ScheduleId]?.description}\`\`\``;

                        let embed = new EmbedBuilder()
                            .setColor('#56a0d3')
                            .setTitle(`#${ScheduleId} Schedule has been expired!`)
                            .setDescription(desc)
                            .setThumbnail((member.displayAvatarURL()))
                            .setTimestamp()
                            .setFooter({ text: 'iHorizon', iconURL: "attachment://footer_icon.png" });

                        member?.send({
                            content: member.toString(),
                            embeds: [embed],
                            files: [await client.method.bot.footerAttachmentBuilder(client)]
                        }).catch(() => { });

                        await table.delete(`${array.id}.${ScheduleId}`);
                    };

                }
            });
        };

        async function refreshBotData() {
            await client.db.set("BOT", {
                "info": {
                    members: client.guilds.cache.reduce((a, b) => a + b.memberCount, 0),
                    servers: client.guilds.cache.size,
                    shards: client.shard?.count,
                    ping: client.ws.ping
                },
                "content": {
                    commands: client.commands.size + client.message_commands.size + client.applicationsCommands.size,
                    category: client.category.length
                },
                "user": client.user
            })
        }

        // @ts-ignore
        client.giveawaysManager = new GiveawayManager(client, {
            storage: `${process.cwd()}/src/files/giveaways/`,
            config: {
                botsCanWin: false,
                embedColor: '#9a5af2',
                embedColorEnd: '#2f3136',
                reaction: '🎉',
                botName: "iHorizon",
                forceUpdateEvery: 3600,
                endedGiveawaysLifetime: 345_600_000,
            },
        });

        await client.player.init({ id: client.user?.id as string, username: 'bot_' + client.user?.id });

        new OwnIHRZ().Startup_Cluster(client);
        new StreamNotifier(client).start();

        setInterval(quotesPresence, 120_000), setInterval(refreshSchedule, 15_000), setInterval(refreshBotData, 45_000);

        fetchInvites(), refreshDatabaseModel(), quotesPresence(), refreshSchedule(), refreshBotData();

        PfpsManager_Init(client);
    },
};
