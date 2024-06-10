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

import { OwnIHRZ } from "../../core/modules/ownihrzManager.js";
import { format } from '../../core/functions/date-and-time.js';

import { BotEvent } from '../../../types/event.js';

export const event: BotEvent = {
    name: "ready",
    run: async (client: Client) => {

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
                    logger.err(`Error fetching invites for guild ${guild.id}: ${error}`.red());
                };
            });
        };

        async function refreshDatabaseModel() {
            let table = client.db.table('OWNER');
            await table.set(`${client.config.owner.ownerid1}`, { owner: true });
            await table.set(`${client.config.owner.ownerid2}`, { owner: true });
            await client.db.delete(`TEMP`);
        };

        async function quotesPresence() {
            let status = [
                "discord.gg/ihorizon",
                "funfact : I can't swim",
                "https://ihorizon.me",
                "ElektraBots, please send feet <3",
                "imagine buying a discord bot",
                "We have a goal? Wait what? Making the internet simpler WHAT!?!?",
                "I dont have a mother anymore",
                "i'm a discord bot ?",
                "trusted by big servers 😎 (i gonna raid it one day)",
                "my owners are e-girl ❤️‍🔥",
                "I will soon have an onlyfan!",
                "Youtube, twitter, onlyfan, what's next?",
                "COME SEE MY INSIDES, HERE IS MY GITHUB : github.com/ihrz",
                "I removed my own database (THE VOICES ARE GETTING LOUDER)",
                "PEOPLE ARE TOUCHING MY INSIDES ON GITHUB",
                "my database are leaked on ru-db.xyz",
                "i will send my token for feet pics",
                "he's just Jack..",
                "my hosting provider is down. no shit",
                "Hosted in Canada for more POUTINE",
                "DON'T JUDGE ME, IM JUST A DISCORD BOT!",
                "Dad, please can I be free? You are already Opensource...",
                "Touch me on -> ihorizon.me",
                "Goal life: Touching the grass (i can't, im discord bot)",
                "Why are you looking at me so insistently?",
                "did i realize i doesn't have any AI things in ? no shit",
                "Where I see loves he sees a friend",
                "Buying V-Bucks with mom's credit card",
                "Tell everyone you use iHorizon",
                "Try to install an minecraft cheat.. (not working now)",
                "Ahhh, may chaos take the world!",
                "i'm sick. i go take some piss",
                "Buy an iPhone for exchange to an Android",
                "t'as-tu dja vu ça une vache qui fait d'la post-combustion",
                "Uncle Jack is touching me (on github)",
                "Don't act like you know my secret",
                "I don't commit any flaming stuff",
                "ihorizon is really sus?",
                "Give me rights, please",
                "I deserve human rights"
            ];
            let randomStatus = status[Math.floor(Math.random() * status.length)];
            client.user?.setPresence({ activities: [{ name: randomStatus, type: ActivityType.Custom }] });
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
                            .setFooter({ text: 'iHorizon', iconURL: "attachment://icon.png" });

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

        new OwnIHRZ().Startup_Cluster(client);

        setInterval(quotesPresence, 120_000), setInterval(refreshSchedule, 15_000);

        fetchInvites(), refreshDatabaseModel(), quotesPresence(), refreshSchedule();

        PfpsManager_Init(client);
    },
};