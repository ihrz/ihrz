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

import {
    EmbedBuilder,
    time,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    Client,
    BaseGuildTextChannel,
    GuildTextBasedChannel,
    ChatInputCommandInteraction,
    Interaction,
    Message,
    ButtonInteraction,
    CacheType,
    ColorResolvable,
    GuildMember,
} from 'discord.js';

import { GiveawayCreateOptions, GiveawayFetch } from '../../../types/giveaways.js';
import getLanguageData from '../functions/getLanguageData.js';
import db from './giveawaysDatabaseManager.js';

interface GiveawaysManagerOptions {
    storage: string,
    config: {
        botsCanWin: boolean,
        embedColor: string,
        embedColorEnd: string,
        reaction: string,
        botName: string,
        forceUpdateEvery: number,
        endedGiveawaysLifetime: number,
    },
};

class GiveawayManager {
    client: Client;
    options: GiveawaysManagerOptions;

    constructor(client: Client, options: GiveawaysManagerOptions) {
        if (!client.options) {
            throw new Error(`Client is a required option. (val=${client})`);
        }

        this.options = options;

        db.InitFilePath(this.options.storage);

        client.on('interactionCreate', async (interaction) => {
            if (interaction.isButton() && interaction.customId === "confirm-entry-giveaway") {
                await this.addEntries(interaction as ButtonInteraction<"cached">);
            };
        });

        this.refresh(client);

        setInterval(() => {
            this.refresh(client);
        }, this.options.config?.forceUpdateEvery);
    }

    public create(channel: BaseGuildTextChannel, data: GiveawayCreateOptions): Promise<Message> {
        return new Promise(async (resolve, reject) => {
            try {
                let lang = await getLanguageData(channel.guildId)
                let confirm = new ButtonBuilder()
                    .setCustomId('confirm-entry-giveaway')
                    .setEmoji(this.options.config.reaction)
                    .setStyle(ButtonStyle.Primary);

                var end_string = time(new Date(Date.now() + data.duration), 'R');
                var end_string2 = time(new Date(Date.now() + data.duration), 'D');
                var winners_amount = data.winnerCount;

                let gw = new EmbedBuilder()
                    .setColor(this.options.config?.embedColor as ColorResolvable)
                    .setTitle(data.prize)
                    .setDescription(lang.event_gw_embed_desc
                        .replace("${end_string}", end_string)
                        .replace("${end_string2}", end_string2)
                        .replace("${winners_amount}", String(winners_amount))
                        .replace("${data.hostedBy}", String(data.hostedBy))
                    )
                    .setTimestamp(new Date(Date.now() + data.duration))
                    .setFooter({ text: this.options.config.botName })
                    .setImage(data.embedImageURL);

                let response = await channel.client.method.channelSend(channel, {
                    embeds: [gw],
                    components: [
                        new ActionRowBuilder<ButtonBuilder>()
                            .addComponents(confirm)
                    ]
                });

                let requirement = data.requirement;

                await db.Create(
                    {
                        channelId: response.channelId,
                        guildId: response.guildId!,

                        winnerCount: data.winnerCount,
                        prize: data.prize,
                        hostedBy: data.hostedBy,
                        expireIn: new Date(Date.now() + data.duration),
                        ended: false,
                        entries: [],
                        winners: [],
                        isValid: true,
                        embedImageURL: data.embedImageURL,
                        requirement
                    }, response.id
                );

                resolve(response);
            } catch (error) {
                reject(error);
            }
        });
    };

    public async addEntries(interaction: ButtonInteraction<"cached">) {

        let giveawayData = await db.GetGiveawayData(interaction.message.id);
        let lang = await getLanguageData(interaction.guildId!);

        if (giveawayData?.entries?.includes(interaction.user.id)) {
            await this.removeEntries(interaction);
            return;
        } else {
            if (giveawayData?.requirement.type !== "none") {
                var reqPass: boolean = false;
                switch (giveawayData?.requirement.type) {
                    case "invites":
                        reqPass = await interaction.client.
                            db.get(`${interaction.guildId}.USER.${interaction.member?.user.id}.INVITES.invites`)
                            >= parseInt(giveawayData.requirement.value!);;
                        break;
                    case "messages":
                        reqPass = ((await interaction.client.
                            db.get(`${interaction.guildId}.STATS.USER.${interaction.member?.user.id}.messages`)
                            || []
                        ) as string[]).length >= parseInt(giveawayData.requirement.value!);
                        break;
                    case "roles":
                        reqPass = (interaction.member as GuildMember)?.roles.cache.has(giveawayData.requirement.value!)
                        break;
                };
                if (!reqPass) {
                    return interaction.reply({
                        content:
                            lang.event_gw_break_req
                                .replace("${giveawayData?.requirement.value}", String(giveawayData?.requirement.value))
                                .replace("${giveawayData?.requirement.type}", String(giveawayData?.requirement.type))
                                .replace("${interaction.client.iHorizon_Emojis.icon.No_Logo}", interaction.client.iHorizon_Emojis.icon.No_Logo)
                        , ephemeral: true
                    })
                }
            };

            await interaction.deferUpdate();
            let regexPattern = `${lang.event_gw_entries_words}: \\*\\*\\d+\\*\\*`;
            let regex = new RegExp(regexPattern);

            let embedsToEdit = EmbedBuilder.from(interaction.message.embeds[0])
                .setDescription(interaction.message.embeds[0]?.description!
                    .replace(regex, `${lang.event_gw_entries_words}: **${giveawayData?.entries.length! + 1}**`)
                );

            await interaction.message.edit({ embeds: [embedsToEdit] });

            await db.AddEntries(interaction.message.id, interaction.user.id);

            return;
        };
    };

    private async removeEntries(interaction: ButtonInteraction<"cached">) {
        let lang = await getLanguageData(interaction.guildId!);

        await interaction.reply({
            content: lang.event_gw_confirm_leave_msg.replace("${interaction.user}", interaction.user.toString()),
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("giveaway-leave")
                            .setStyle(ButtonStyle.Danger)
                            .setLabel(lang.event_gw_leave_button_placeholder)
                    )
            ],
            ephemeral: true
        });

        let collector = interaction.channel!.createMessageComponentCollector({
            time: 60_000,
            filter: (i) => interaction.user.id === i.user.id
        });

        collector.on('collect', async (i: ButtonInteraction<"cached">) => {
            if (i.customId === 'giveaway-leave') {

                let now_members = await db.RemoveEntries(interaction.message.id, interaction.user.id);
                let regexPattern = `${lang.event_gw_entries_words}: \\*\\*\\d+\\*\\*`;
                let regex = new RegExp(regexPattern);

                let embedsToEdit = EmbedBuilder.from(interaction.message.embeds[0])
                    .setDescription(interaction.message.embeds[0]?.description!
                        .replace(regex, `${lang.event_gw_entries_words}: **${now_members.length}**`)
                    );

                await interaction.message.edit({ embeds: [embedsToEdit] });
                await interaction.editReply({ components: [], content: lang.event_gw_removeentries_msg.replace("${interaction.user}", interaction.user.toString()) })

                return;
            };
        });

        collector.on("end", async () => {
            await interaction.deleteReply();
        })
    }

    public isValid(giveawayId: string): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            try {
                let fetch = await db.GetGiveawayData(giveawayId);

                if (fetch) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            } catch (error) {
                reject(error);
            }
        });
    };

    public isEnded(giveawayId: string): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            try {
                let fetch = await db.GetGiveawayData(giveawayId);

                if (fetch?.ended) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            } catch (error) {
                reject(error);
            }
        });
    };

    end(client: Client, giveawayId: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                let giveawayData = (await db.GetGiveawayData(giveawayId))!;

                if (giveawayData.isValid && !giveawayData.ended) {
                    await db.SetEnded(giveawayId, "End()");
                    this.finish(
                        client,
                        giveawayId,
                        giveawayData.guildId,
                        giveawayData.channelId,
                    );
                    resolve();
                } else {
                    reject(new Error("Invalid Giveaway"));
                }
            } catch (error) {
                reject(error);
            }
        });
    };

    public async finish(client: Client, giveawayId: string, guildId: string, channelId: string) {
        let lang = await getLanguageData(guildId);

        let fetch = await db.GetGiveawayData(giveawayId);

        if (!fetch) return;

        if (!fetch.ended || fetch.ended === 'End()') {
            let guild = await client.guilds.fetch(guildId).catch(async () => {
                await db.DeleteGiveaway(giveawayId)
            });
            if (!guild) return;

            let winner = this.selectWinners(
                { entries: fetch.entries, winners: fetch.winners },
                fetch.winnerCount
            );

            await db.SetEnded(giveawayId, true)
            await db.SetWinners(giveawayId, winner || 'None')

            let channel = await guild.channels.fetch(channelId).catch(() => { db.DeleteGiveaway(giveawayId) })

            let message = await (channel as GuildTextBasedChannel).messages.fetch(giveawayId).catch(async () => {
                await db.DeleteGiveaway(giveawayId)
                return;
            }) as Message;

            let winners = winner ? winner.map((winner: string) => `<@${winner}>`).join(",") : null;

            let Finnish = new ButtonBuilder()
                .setLabel(lang.event_gw_finnish_button_title)
                .setURL('https://media.tenor.com/uO4u0ib3oK0AAAAC/done-and-done-spongebob.gif')
                .setStyle(ButtonStyle.Link);

            let embeds = new EmbedBuilder()
                .setColor(this.options.config.embedColorEnd as ColorResolvable)
                .setTitle(fetch.prize)
                .setImage(fetch.embedImageURL)
                .setDescription(lang.event_gw_ended_embed_desc
                    .replace("${time1}", time(new Date(fetch.expireIn), 'R'))
                    .replace("${time2}", time(new Date(fetch.expireIn), 'D'))
                    .replace("${fetch.hostedBy}", fetch.hostedBy)
                    .replace("${fetch.entries.length}", fetch.entries.length.toString())
                    .replace("${winners}", winners || lang.setjoinroles_var_none)
                )
                .setTimestamp()

            await message?.edit({
                embeds: [embeds], components: [
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(Finnish)]
            });

            if (winners) {
                await message?.reply({
                    content: lang.event_gw_reroll_win_msg.replace("${winners}", winners.toString()).replace("${fetch[channelId][messageId].prize}", fetch.prize)
                })
                return;
            } else {
                await message?.reply({
                    content: lang.event_gw_finnish_cannot_msg
                });
                return;
            };
        };
        return;
    };

    private selectWinners(fetch: GiveawayFetch, number: number): string[] {
        if (fetch.entries.length === 0) {
            return [];
        };

        let areWinnersInPreviousWinners = (currentWinners: string[]) => {
            return currentWinners.some(winner => fetch.winners.includes(winner));
        };

        let winners: Array<string> = [];

        do {
            winners = [];
            let availableMembers = [...fetch.entries];

            if (winners.length === 0 || areWinnersInPreviousWinners(winners)) {
                winners = [];
            };

            for (let i = 0; i < number; i++) {
                if (availableMembers.length === 0) {
                    break;
                }

                let randomIndex = Math.floor(Math.random() * availableMembers.length);
                let winnerID = availableMembers.splice(randomIndex, 1)[0];
                winners.push(winnerID);
            }
        } while (winners.length === 0);

        return winners.length > 0 ? winners : [];
    };

    public reroll(client: Client, giveawayId: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                let fetch = (await db.GetGiveawayData(giveawayId))!;

                let guild = await client.guilds.fetch(fetch.guildId);
                let channel = await guild.channels.fetch(fetch.channelId);

                let lang = await getLanguageData(guild.id);

                let message = await (channel as BaseGuildTextChannel).messages.fetch(giveawayId).catch(async () => {
                    await db.DeleteGiveaway(giveawayId);
                    resolve();
                    return;
                }) as Message;

                let winner = this.selectWinners(
                    { entries: fetch.entries, winners: fetch.winners },
                    fetch.winnerCount
                );

                let winners = winner ? winner.map((winner: string) => `<@${winner}>`) : [];
                let ended = time(new Date(fetch.expireIn), 'R');
                let time2 = time(new Date(fetch.expireIn), 'D');
                let hostedBy = fetch.hostedBy;
                let entries = fetch.entries.length.toString();

                let embeds = new EmbedBuilder()
                    .setColor(this.options.config.embedColorEnd as ColorResolvable)
                    .setTitle(fetch.prize)
                    .setImage(fetch.embedImageURL)
                    .setDescription(lang.event_gw_ended_word
                        .replace("${winners}", winners.toString())
                        .replace("${ended}", ended)
                        .replace("${time2}", time2)
                        .replace("${hostedBy}", hostedBy)
                        .replace("${entries}", entries)
                    )
                    .setTimestamp()
                    .setFooter({ text: this.options.config.botName });

                await message?.edit({
                    embeds: [embeds]
                });

                if (winner && winner[0] !== 'None') {
                    await message?.reply({
                        content: lang.event_gw_reroll_win_msg.replace("${winners}", winners.toString()).replace("${fetch[channelId][messageId].prize}", fetch.prize)
                    })
                } else {
                    await message?.reply({
                        content: lang.event_gw_finnish_cannot_msg
                    });
                }

                await db.SetWinners(giveawayId, winner || 'None');
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    };

    public async listEntries(interaction: ChatInputCommandInteraction<"cached"> | Message, giveawayId: string) {
        let fetch = (await db.GetGiveawayData(giveawayId))!;
        let lang = await getLanguageData(fetch.guildId);

        if (interaction.guildId === fetch.guildId) {
            var char: string[] = fetch.entries;

            if (char.length == 0) {
                if (interaction instanceof ChatInputCommandInteraction) {
                    await interaction.editReply({ content: lang.history_no_entries });
                } else {
                    await interaction.edit({ content: lang.history_no_entries });
                }
                return;
            };

            let currentPage = 0;
            let usersPerPage = 10;
            let pages: { title: string; description: string; }[] = [];

            for (let i = 0; i < char.length; i += usersPerPage) {
                let pageUsers = char.slice(i, i + usersPerPage);
                let pageContent = pageUsers.map((userId) => `<@${userId}>`).join('\n');
                pages.push({
                    title: `Giveaway's Entries List | Page ${i / usersPerPage + 1}`,
                    description: pageContent,
                });
            };

            let createEmbed = () => {
                return new EmbedBuilder()
                    .setColor(this.options.config.embedColor as ColorResolvable)
                    .setTitle(pages[currentPage].title)
                    .setDescription(pages[currentPage].description)
                    .setFooter({ text: `${this.options.config.botName} | Page ${currentPage + 1}/${pages.length}`, iconURL: interaction.client.user?.displayAvatarURL() })
                    .setTimestamp()
            };

            let row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('previousPage')
                    .setLabel('⬅️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('nextPage')
                    .setLabel('➡️')
                    .setStyle(ButtonStyle.Secondary),
            );

            if (interaction instanceof ChatInputCommandInteraction) {
                var messageEmbed = await interaction.editReply({
                    embeds: [createEmbed()], components: [(row as ActionRowBuilder<ButtonBuilder>)]
                });
            } else {
                var messageEmbed = await interaction.reply({
                    embeds: [createEmbed()], components: [(row as ActionRowBuilder<ButtonBuilder>)]
                }) as Message<true>
            }

            let collector = messageEmbed.createMessageComponentCollector({
                filter: (i) => {
                    i.deferUpdate();
                    return interaction.member?.user.id === i.user.id;
                }, time: 60000
            });

            collector.on('collect', (interaction: { customId: string; }) => {
                if (interaction.customId === 'previousPage') {
                    currentPage = (currentPage - 1 + pages.length) % pages.length;
                } else if (interaction.customId === 'nextPage') {
                    currentPage = (currentPage + 1) % pages.length;
                }

                messageEmbed.edit({ embeds: [createEmbed()] });
            });

            collector.on('end', () => {
                row.components.forEach((component) => {
                    if (component instanceof ButtonBuilder) {
                        component.setDisabled(true);
                    }
                });
                messageEmbed.edit({ components: [(row as ActionRowBuilder<ButtonBuilder>)] });
            });
        };
    };

    private async refresh(client: Client) {
        let drop_all_db = await db.GetAllGiveawaysData();

        for (let giveawayId in drop_all_db) {
            let now = new Date().getTime();
            let gwExp = new Date(drop_all_db[giveawayId].giveawayData.expireIn).getTime();
            let cooldownTime = now - gwExp;

            await db.AvoidDoubleEntries(drop_all_db[giveawayId].giveawayId);

            if (now >= gwExp) {
                this.finish(
                    client,
                    drop_all_db[giveawayId].giveawayId,
                    drop_all_db[giveawayId].giveawayData.guildId,
                    drop_all_db[giveawayId].giveawayData.channelId
                );
            };

            if (cooldownTime >= this.options.config.endedGiveawaysLifetime) {
                await db.DeleteGiveaway(drop_all_db[giveawayId].giveawayId)
            };
        }
    };

    public getGiveawayData(giveawayId: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                let fetch = await db.GetGiveawayData(giveawayId);

                if (fetch) {
                    resolve(fetch);
                } else {
                    reject(new Error("Giveaway non trouvé"));
                }
            } catch (error) {
                reject(error);
            }
        });
    };

    public async getAllGiveawayData() {
        return await db.GetAllGiveawaysData();
    }

    public delete(giveawayId: string): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            try {
                if (await this.isValid(giveawayId)) {
                    await db.DeleteGiveaway(giveawayId);
                    resolve(true);
                } else {
                    reject(new Error("Giveaway non valide"));
                }
            } catch (error) {
                reject(error);
            }
        });
    };

}
export { GiveawayManager };