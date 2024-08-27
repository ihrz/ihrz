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

import { ActionRowBuilder, BaseGuildTextChannel, ButtonBuilder, ButtonStyle, Client, SnowflakeUtil } from 'discord.js';
import { axios } from './functions/axios.js';
import RSSParser from 'rss-parser';
import { DatabaseStructure } from '../../types/database_structure.js';
import logger from './logger.js';

type Platform = "kick" | "youtube" | "twitch";
type VideoType = "short" | "video" | "short"

interface NotifierUserResponse {
    user: DatabaseStructure.NotifierUserSchema;
    platform: Platform
    content: YoutubeRssResponse
}

interface YoutubeRssResponse {
    title: string,
    link: string,
    pubDate: Date,
    author: string,
    id: string,
    isoDate: Date
}

export class StreamNotifier {
    private parser: RSSParser;
    private twitchClientID: string;
    private twitchAccessToken: string;
    private client: Client;

    constructor(client: Client) {
        this.parser = new RSSParser();
        this.client = client
        this.twitchClientID = twitchClientID;
        this.twitchAccessToken = twitchAccessToken;
    }

    private async getGuildsData(): Promise<{ value: DatabaseStructure.NotifierSchema, guildId: string; }[]> {
        let all = await this.client.db.all();
        let arr: { value: DatabaseStructure.NotifierSchema, guildId: string; }[] = [];

        all.forEach((v) => {
            if (Number(v.id)) {
                let guildObject = v.value as DatabaseStructure.DbInId;
                if (guildObject.NOTIFIER) arr.push({ value: guildObject.NOTIFIER, guildId: v.id })
            }
        });
        return arr;
    };

    private getLatestMedia(items: YoutubeRssResponse[]): YoutubeRssResponse | null {
        if (!items || items.length === 0) {
            return null;
        }
        let latestMedia = items[0];

        for (const item of items) {
            if (new Date(item.pubDate) > new Date(latestMedia.pubDate)) {
                latestMedia = item;
            }
        }

        return latestMedia;
    }


    private async fetchUsersMedias(users: DatabaseStructure.NotifierUserSchema[]): Promise<NotifierUserResponse[]> {
        let result: NotifierUserResponse[] = [];

        for (let user of users) {
            if (user.platform === 'twitch') {
                await this.checkTwitchStream(user.id_or_username);
            } else {
                let url: string | null = null;

                if (user.platform === "youtube") {
                    url = `https://www.youtube.com/feeds/videos.xml?channel_id=${user.id_or_username}`;

                    if (url) {
                        try {
                            const feed = await this.parser.parseURL(url);

                            if (feed.items.length > 0) {
                                let newMedia = this.getLatestMedia(feed.items as unknown as YoutubeRssResponse[]);
                                if (newMedia) {
                                    result.push({ user: user, content: newMedia, platform: "youtube" })
                                }
                            }
                        } catch (error) {
                            logger.err(`Erreur lors de la vérification des flux pour ${user.id_or_username} sur ${user.platform} :` + error as string);
                        }
                    }
                }

            }
        }
        return result;
    }

    private async checkTwitchStream(userName: string) {
        const url = `https://api.twitch.tv/helix/streams?user_login=${userName}`;
        try {
            const response = await axios.get(url, {
                headers: {
                    'Client-ID': this.twitchClientID,
                    'Authorization': `Bearer ${this.twitchAccessToken}`,
                },
            });

            const streamData = response.data.data;
            if (streamData.length > 0) {
                console.log(`Le streamer Twitch ${userName} est en live : ${streamData[0].title} - https://www.twitch.tv/${userName}`);
            } else {
                console.log(`Le streamer Twitch ${userName} n'est pas en live.`);
            }
        } catch (error) {
            console.error('Erreur lors de la vérification des streams Twitch :', error);
        }
    }

    private async mediaHaveAlreadyBeNotified(guildID: string, media: NotifierUserResponse): Promise<boolean> {
        let isAlreadyIn = (await this.client.db.get(`${guildID}.NOTIFIER.lastMediaNotified`) || []) as DatabaseStructure.NotifierLastNotifiedMedias[];
        return isAlreadyIn.some(item => item.userId === media.user.id_or_username && item.mediaId === media.content.id);
    }

    private createLinkButton(url: string): ActionRowBuilder<ButtonBuilder> {
        return new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(url)
                    .setLabel("Check out!")
            )
    }
    public async start() {
        (await this.getGuildsData()).forEach(async (entry) => {
            let medias = await this.fetchUsersMedias(entry.value.users || []);

            for (let media of medias) {
                if (!await this.mediaHaveAlreadyBeNotified(entry.guildId, media)) {
                    let guild = this.client.guilds.cache.get(entry.guildId);
                    let channel = guild?.channels.cache.get(entry.value.channelId) as BaseGuildTextChannel | undefined;
                    let message = entry.value.message || `@everyone **[${media.content.author}](<https://youtube.com/channel/${media.user.id_or_username}>)** have published new video **[Click Here](${media.content.link})**`;

                    if (!channel) break;
                    await this.client.db.push(`${entry.guildId}.NOTIFIER.lastMediaNotified`, {
                        userId: media.user.id_or_username,
                        mediaId: media.content.id
                    });
                    await channel.send({
                        content: message,
                        components: [this.createLinkButton(media.content.link)],
                        embeds: [],
                        nonce: SnowflakeUtil.generate().toString(),
                        enforceNonce: true
                    })
                }
            }
        })
        setInterval(async () => await this.getGuildsData(), 30_000);
    }
}

const twitchClientID = '';
const twitchAccessToken = '';
