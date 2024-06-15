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

import { Client, Collection, PermissionsBitField, ActivityType, EmbedBuilder, GuildFeature, User } from 'discord.js';
import { PfpsManager_Init } from "../../core/modules/pfpsManager.js";
import logger from "../../core/logger.js";

import { format } from '../../core/functions/date-and-time.js';

import { BotEvent } from '../../../types/event.js';

export const event: BotEvent = {
    name: "ready",
    run: async (client: Client) => {

        async function fetchInvites() {
            client.guilds.cache.forEach(async (guild) => {
                try {
                    if (!guild.members.me?.permissions.has(PermissionsBitField.Flags.ManageGuild)) return;
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
            let table = client.db.table('OWNER');
            await table.set(`${client.config.owner.ownerid1}`, { owner: true });
            await table.set(`${client.config.owner.ownerid2}`, { owner: true });
            await client.db.table(`TEMP`).deleteAll();
        };
    
        async function quotesPresence() {
            let e = await client.db.get(`BOT.PRESENCE`);
    
            if (e) {
                client.user?.setActivity(e.name, {
                    type: e.type,
                    url: `https://www.twitch.tv/${e.twitch_username}`
                });
            } else {
                client.user?.setPresence({ activities: [{ name: "Custom this Presence with /presence", type: ActivityType.Custom }] });
            };
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
                            .setFooter({ text: client.user?.username!, iconURL: "attachment://icon.png" });
    
                        member?.send({
                            content: member.toString(),
                            embeds: [embed],
                            files: [{ attachment: await client.functions.image64(client.user?.displayAvatarURL()), name: 'icon.png' }]
                        }).catch(() => { });
    
                        await table.delete(`${array.id}.${ScheduleId}`);
                    };
    
                }
            });
        };
    
        await client.player.init({ id: client.user?.id as string, username: 'bot_' + client.user?.id });
        
        setInterval(quotesPresence, 80_000), setInterval(refreshSchedule, 15_000);
    
        fetchInvites(), refreshDatabaseModel(), quotesPresence(), refreshSchedule();
    
        PfpsManager_Init(client);
    },
};