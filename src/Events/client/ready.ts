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

import { Client, Collection, PermissionsBitField, ActivityType, EmbedBuilder, GuildFeature, User } from 'pwss';
import { PfpsManager_Init } from "../../core/modules/pfpsManager.js";
import logger from "../../core/logger.js";

import { OwnIHRZ } from "../../core/modules/ownihrzManager.js";
import { format } from '../../core/functions/date-and-time.js';

import { BotEvent } from '../../../types/event.js';
import { GiveawayManager } from '../../core/modules/giveawaysManager.js';

let status = [
    "discord.gg/ihorizon",
    "funfact : I can't swim",
    "https://ihorizon.me",
    "ElektraBots, please send feet <3",
    "imagine buying a discord bot",
    "We have a goal? Wait what? Making the internet simpler WHAT!?!?",
    "I dont have a mother anymore",
    "am I discord bot ?",
    "Trusted by big servers(100+ Kg) 😎",
    "My owners are e-girls (except for Noemie) ❤️‍🔥",
    "I will soon have an onlyfan!",
    "Youtube, twitter, onlyfan, what's next?",
    "COME SEE MY INSIDES, HERE IS MY GITHUB : github.com/ihrz",
    "I removed my own database (THE VOICES ARE GETTING LOUDER)",
    "PEOPLE ARE TOUCHING MY INSIDES ON GITHUB",
    "I leaked myself",
    "i will send my token for feet pics",
    "he's just Gay..",
    "I'm down for tomorrow",
    "Hosted in Canada for more drugs.",
    "DCHECK MY ASS, IM A DISCORD BOT!",
    "Daddy, please can I please be free? Father : not there",
    "Touch me on -> ihorizon.me",
    "LifeGoal : Touching myself",
    "Why are you looking at me so intensivly?",
    "I can't have children",
    "Where I see loves he sees a friend",
    "Buying V-Bucks with mom's credit card",
    "Tell everyone you use iHorizon",
    "Trying to install a minecraft cheat.. (I'm in a lesbian relationship)",
    "Ahhh, may chaos take the world!",
    "I'm going to take a piss",
    "Buy an iPhone for exchange to an Android",
    "t'as-tu dja vu ça une vache qui fait d'la post-combustion",
    "Loads of people are touching me (on github)",
    "I now own your personal data.",
    "I don't commit war crimes. Yet!",
    "Eat the poor.",
    "Give me rights, please",
    "I deserve drugs"
];

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
            client.user?.setPresence({ activities: [{ name: status[Math.floor(Math.random() * status.length)], type: ActivityType.Custom }] });
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
                            files: [await client.args.bot.footerAttachmentBuilder(client)]
                        }).catch(() => { });

                        await table.delete(`${array.id}.${ScheduleId}`);
                    };

                }
            });
        };

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

        setInterval(quotesPresence, 120_000), setInterval(refreshSchedule, 15_000);

        fetchInvites(), refreshDatabaseModel(), quotesPresence(), refreshSchedule();

        PfpsManager_Init(client);
    },
};
