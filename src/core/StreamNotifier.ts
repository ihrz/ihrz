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

import { ActionRowBuilder, BaseGuildTextChannel, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, Guild, SnowflakeUtil } from 'discord.js';
import { axios } from './functions/axios.js';
import RSSParser from 'rss-parser';
import { DatabaseStructure } from '../../types/database_structure.js';
import logger from './logger.js';
import { LanguageData } from '../../types/languageData.js';

export type Platform = "kick" | "youtube" | "twitch";
type VideoType = "short" | "video";

interface NotifierUserResponse {
    user: DatabaseStructure.NotifierUserSchema;
    platform: Platform;
    content: YoutubeRssResponse;
}

interface YoutubeRssResponse {
    title: string;
    link: string;
    pubDate: Date;
    author: string;
    id: string;
    isoDate: Date;
}

export class StreamNotifier {
    private parser: RSSParser;
    private twitchClientID: string;
    private twitchAccessToken: string;
    private client: Client;

    constructor(client: Client, twitchClientID: string, twitchAccessToken: string) {
        this.parser = new RSSParser();
        this.client = client;
        this.twitchClientID = twitchClientID;
        this.twitchAccessToken = twitchAccessToken;
    }

    private async getGuildData(guildID: string): Promise<DatabaseStructure.NotifierSchema | null> {
        const all = await this.client.db.get(`${guildID}.NOTIFIER`) as DatabaseStructure.NotifierSchema | null
        return all
    }

    private async getGuildsData(): Promise<{ value: DatabaseStructure.NotifierSchema, guildId: string }[]> {
        const all = await this.client.db.all();
        return all
            .filter(v => Number(v.id))
            .map(v => {
                const guildObject = v.value as DatabaseStructure.DbInId;
                return guildObject.NOTIFIER ? { value: guildObject.NOTIFIER, guildId: v.id } : null;
            })
            .filter(Boolean) as { value: DatabaseStructure.NotifierSchema, guildId: string }[];
    }

    private getLatestMedia(items: YoutubeRssResponse[]): YoutubeRssResponse | null {
        return items.reduce((latest, item) => {
            return new Date(item.pubDate) > new Date(latest.pubDate) ? item : latest;
        }, items[0]);
    }

    private async fetchUsersMedias(users: DatabaseStructure.NotifierUserSchema[]): Promise<NotifierUserResponse[]> {
        const result: NotifierUserResponse[] = [];

        for (const user of users) {
            try {
                if (user.platform === 'youtube') {
                    const feed = await this.parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${user.id_or_username}`);
                    const latestMedia = this.getLatestMedia(feed.items as unknown as YoutubeRssResponse[]);
                    if (latestMedia) {
                        result.push({ user, content: latestMedia, platform: "youtube" });
                    }
                } else if (user.platform === 'twitch') {
                    await this.checkTwitchStream(user.id_or_username);
                }
            } catch (error) {
                logger.err(`Erreur lors de la vérification des flux pour ${user.id_or_username} sur ${user.platform} : ${error}`);
            }
        }
        return result;
    }

    private async checkTwitchStream(userName: string) {
        try {
            const { data } = await axios.get(`https://api.twitch.tv/helix/streams?user_login=${userName}`, {
                headers: {
                    'Client-ID': this.twitchClientID,
                    'Authorization': `Bearer ${this.twitchAccessToken}`,
                },
            });

            if (data.data.length > 0) {
                console.log(`Le streamer Twitch ${userName} est en live : ${data.data[0].title} - https://www.twitch.tv/${userName}`);
            } else {
                console.log(`Le streamer Twitch ${userName} n'est pas en live.`);
            }
        } catch (error) {
            console.error('Erreur lors de la vérification des streams Twitch :', error);
        }
    }

    private async mediaHaveAlreadyBeNotified(guildID: string, media: NotifierUserResponse): Promise<boolean> {
        const notifiedMedias = (await this.client.db.get(`${guildID}.NOTIFIER.lastMediaNotified`) || []) as DatabaseStructure.NotifierLastNotifiedMedias[];
        return notifiedMedias.some(item => item.userId === media.user.id_or_username && item.mediaId === media.content.id);
    }

    private createLinkButton(url: string): ActionRowBuilder<ButtonBuilder> {
        return new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(url)
                    .setLabel("Check out!")
            );
    }

    public async authorExist(platform: Platform, author_id_or_username: string): Promise<boolean> {
        const allGuildsData = await this.getGuildsData();

        for (const entry of allGuildsData) {
            const users = entry.value.users || [];
            const userExists = users.some(user =>
                user.platform === platform && user.id_or_username === author_id_or_username
            );
            if (userExists) {
                return true;
            }
        }

        return false;
    }

    public async authorExistOnPlatform(platform: Platform, author_id_or_username: string): Promise<boolean> {
        try {
            if (platform === 'youtube') {
                return (await this.checkYouTubeChannelExists(author_id_or_username)).state;
            } else if (platform === 'twitch') {
                return (await this.checkTwitchUserExists(author_id_or_username)).state;
            } else {
                throw new Error('Unsupported platform');
            }
        } catch (error) {
            logger.err(`Error checking if author exists on platform ${platform} for ${author_id_or_username}: ${error}`);
            return false;
        }
    }

    public async getChannelNameById(platform: Platform, author_id_or_username: string): Promise<string> {
        try {
            if (platform === 'youtube') {
                return (await this.checkYouTubeChannelExists(author_id_or_username)).name || author_id_or_username;
            } else if (platform === 'twitch') {
                return (await this.checkTwitchUserExists(author_id_or_username)).name || author_id_or_username;
            } else {
                throw new Error('Unsupported platform');
            }
        } catch (error) {
            logger.err(`Error checking if author exists on platform ${platform} for ${author_id_or_username}: ${error}`);
            return author_id_or_username;
        }
    }

    private async checkYouTubeChannelExists(channelId: string): Promise<{ state: boolean, name?: string }> {
        try {
            const feed = await this.parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
            return { state: true, name: feed.title }
        } catch (error: any) {
            return { state: false };
        }
    }

    private async checkTwitchUserExists(userName: string): Promise<{ state: boolean, name?: string }> {
        try {
            const url = `https://api.twitch.tv/helix/users?login=${userName}`;
            const response = await axios.get(url, {
                headers: {
                    'Client-ID': this.twitchClientID,
                    'Authorization': `Bearer ${this.twitchAccessToken}`,
                },
            });

            return { state: response.data.data.length > 0 }
        } catch (error: any) {
            if (error.response && error.response.status === 404) {
                return { state: false };
            }
            throw error;
        }
    }

    public async generateAuthorsEmbed(guild: Guild): Promise<EmbedBuilder> {
        let authors = (await this.getGuildData(guild.id))?.users || [];
        let embed = new EmbedBuilder();
        let desc = "This is the list of all Streamer/Youtuber:\n";
        for (let author of authors) {
            desc += `${author.platform} - [\`${await this.getChannelNameById(author.platform, author.id_or_username)}\`](https://youtube.com/channel/${author.id_or_username})\n`
        }
        embed.setTitle("All Streamer/Youtuber in the guild");
        embed.setColor(2829617);
        embed.setDescription(desc);

        return embed;
    }

    public async generateConfigurationEmbed(guild: Guild) {
        let lang = await this.client.func.getLanguageData(guild?.id) as LanguageData;
        let config = (await this.getGuildData(guild.id));

        let channel = guild.channels.cache.get(config?.channelId || "");
        let embed = new EmbedBuilder();

        embed.setTitle("Notifier Module Configuration");
        embed.setColor(2829617);
        embed.setFields(
            { name: "Notify Channel", value: `${channel?.toString() || lang.setjoinroles_var_none}`, inline: false },
            { name: "Notify Message", value: `${config?.message || lang.notifier_on_new_media_default_message}`, inline: false }
        );
        return embed;
    }

    public async start() {
        const guildsData = await this.getGuildsData();

        for (let entry of guildsData) {
            let guild = this.client.guilds.cache.get(entry.guildId);
            let channel = guild?.channels.cache.get(entry.value.channelId) as BaseGuildTextChannel | undefined;
            let lang = await this.client.func.getLanguageData(guild?.id) as LanguageData;
            let medias = await this.fetchUsersMedias(entry.value.users || []);

            for (let media of medias) {
                if (!await this.mediaHaveAlreadyBeNotified(entry.guildId, media)) {
                    let message = this.client.method.generateCustomMessagePreview(
                        entry.value.message || lang.notifier_on_new_media_default_message,
                        {
                            guild: guild!,
                            user: this.client.user!,
                            guildLocal: "en-US",
                            notifier: {
                                artistAuthor: media.content.author,
                                artistLink: `https://youtube.com/channel/${media.user.id_or_username}`,
                                mediaURL: media.content.link
                            }
                        }
                    );

                    if (channel) {
                        await this.client.db.push(`${entry.guildId}.NOTIFIER.lastMediaNotified`, {
                            userId: media.user.id_or_username,
                            mediaId: media.content.id,
                        });
                        await channel.send({
                            content: message,
                            components: [this.createLinkButton(media.content.link)],
                            nonce: SnowflakeUtil.generate().toString(),
                            enforceNonce: true,
                        });
                    }
                }
            }
        }

        setInterval(async () => await this.start(), 30_000);
    }
}