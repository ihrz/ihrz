/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

import {
	ActionRowBuilder,
	BaseGuildTextChannel,
	ButtonBuilder,
	ButtonStyle,
	Client,
	EmbedBuilder,
	Guild,
	SnowflakeUtil
} from "discord.js";

import { DatabaseStructure } from "../../types/database_structure.js";
import logger from "./logger.js";
import Parser from "rss-parser";

interface BloggerFeedResponse {
	blog: DatabaseStructure.BloggerBlogSchema;
	content: RssFeedItem;
}

interface RssFeedItem {
	title: string;
	link: string;
	pubDate: Date;
	author: string;
	id: string;
	contentSnippet?: string;
}

export class BloggerNotifier {
	private parser: Parser;

	constructor() {
		this.parser = new Parser({
			customFields: {
				item: [
					["dc:creator", "creator"],
					["content:encoded", "contentEncoded"]
				]
			}
		});
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private async getGuildData(
		guildID: string
	): Promise<DatabaseStructure.BloggerSchema | null> {
		const all = (await client.db.get(
			`${guildID}.BLOGGER`
		)) as DatabaseStructure.BloggerSchema | null;
		return all;
	}

	private async getGuildsData(): Promise<
		{ value: DatabaseStructure.BloggerSchema; guildId: string }[]
	> {
		const all = await client.db.all();
		return all
			.filter((v) => Number(v.id) && client.inShard(v.id))
			.map((v) => {
				const guildObject = v.value as DatabaseStructure.DbInId;
				return guildObject.BLOGGER
					? { value: guildObject.BLOGGER, guildId: v.id }
					: null;
			})
			.filter(Boolean) as {
			value: DatabaseStructure.BloggerSchema;
			guildId: string;
		}[];
	}

	private getLatestArticle(items: RssFeedItem[]): RssFeedItem | null {
		return items?.reduce((latest, item) => {
			return new Date(item.pubDate) > new Date(latest.pubDate)
				? item
				: latest;
		}, items[0]);
	}

	private async fetchRssFeed(rssUrl: string): Promise<RssFeedItem[]> {
		try {
			const feed = await this.parser.parseURL(rssUrl);
			return feed.items.map((item: any) => ({
				title: item.title || "No title",
				link: item.link || "",
				pubDate: new Date(item.pubDate || item.isoDate || Date.now()),
				author: item.creator || item.author || "Unknown",
				id: item.guid || item.id || item.link || "",
				contentSnippet: item.contentSnippet || item.content || ""
			}));
		} catch (error) {
			logger.err(`Error fetching RSS feed ${rssUrl}: ${error}`);
			return [];
		}
	}

	private async fetchBlogsFeeds(
		blogs: DatabaseStructure.BloggerBlogSchema[]
	): Promise<BloggerFeedResponse[]> {
		const result: BloggerFeedResponse[] = [];

		for (const blog of blogs) {
			try {
				const articles = await this.fetchRssFeed(blog.rss);
				const latestArticle = this.getLatestArticle(articles);
				if (latestArticle) {
					result.push({ blog, content: latestArticle });
				}
			} catch (error) {
				logger.err(
					`Erreur lors de la vérification du flux RSS pour ${blog.rss} : ${error}`
				);
			}
			await this.delay(5_000);
		}
		return result;
	}

	private async articleHaveAlreadyBeNotified(
		guildID: string,
		article: BloggerFeedResponse
	): Promise<boolean> {
		const notifiedArticles = ((await client.db.get(
			`${guildID}.BLOGGER.lastArticleNotified`
		)) || []) as DatabaseStructure.BloggerLastNotifiedArticles[];
		return notifiedArticles.some(
			(item) =>
				item.blogId === article.blog.id &&
				(item.articleId === article.content.id ||
					new Date(item.timestamp) >=
						new Date(article.content.pubDate))
		);
	}

	private createLinkButton(
		url: string,
		label: string
	): ActionRowBuilder<ButtonBuilder> {
		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setURL(url)
				.setLabel(label)
		);
	}

	public async blogExist(guildId: string, blogId: string): Promise<boolean> {
		const allGuildsData = (await client.db.get(
			`${guildId}.BLOGGER`
		)) as DatabaseStructure.BloggerSchema;

		const blogs = allGuildsData?.blogs || [];
		const blogExists = blogs.some((blog) => blog.id === blogId);

		return blogExists;
	}

	public async validateRssFeed(
		rssUrl: string
	): Promise<{ valid: boolean; name?: string }> {
		try {
			const feed = await this.parser.parseURL(rssUrl);
			return { valid: true, name: feed.title || "Unknown Blog" };
		} catch (error) {
			logger.err(`Error validating RSS feed ${rssUrl}: ${error}`);
			return { valid: false };
		}
	}

	public async getBlogNameByRss(rssUrl: string): Promise<string> {
		try {
			const feed = await this.parser.parseURL(rssUrl);
			return feed.title || "Unknown Blog";
		} catch (error) {
			logger.err(`Error getting blog name for ${rssUrl}: ${error}`);
			return "Unknown Blog";
		}
	}

	public async generateBlogsEmbed(guild: Guild): Promise<EmbedBuilder> {
		const lang = await client.func.getLanguageData(guild?.id);
		const blogs = (await this.getGuildData(guild.id))?.blogs || [];
		const embed = new EmbedBuilder();
		let desc = lang.blogger_generateBlogsEmbed_embed_desc;

		for (const blog of blogs) {
			const blogName = await this.getBlogNameByRss(blog.rss);
			const channel = await guild.channels
				.fetch(blog.channelId)
				.catch(() => null);
			desc += `[\`${blogName}\`](${blog.rss}) - ${channel?.toString() || "Channel deleted"} (ID: \`${blog.id}\`)\n`;
		}

		embed.setTitle(lang.blogger_generateBlogsEmbed_embed_title);
		embed.setColor(2829617);
		embed.setDescription(desc || lang.blogger_no_rss);

		return embed;
	}

	public async generateConfigurationEmbed(guild: Guild) {
		const lang = await client.func.getLanguageData(guild?.id);
		const config = await this.getGuildData(guild.id);

		const embed = new EmbedBuilder();

		embed.setTitle(lang.blogger_generateConfigurationEmbed_embed_title);
		embed.setColor(2829617);
		embed.setFields(
			{
				name: lang.blogger_generateConfigurationEmbed_embed_fields_1_name,
				value: config?.enabled ? lang.var_enabled : lang.var_disabled,
				inline: true
			},
			{
				name: lang.blogger_generateConfigurationEmbed_embed_fields_2_name,
				value: `${config?.blogs?.length || 0}`,
				inline: true
			}
		);
		return embed;
	}

	private async refresh() {
		const guildsData = await this.getGuildsData();

		for (const entry of guildsData) {
			// Skip if module is disabled
			if (!entry.value.enabled) continue;

			const guild = await client.guilds
				.fetch(entry.guildId)
				.catch(() => null);
			if (!guild) continue;

			const lang = await client.func.getLanguageData(guild?.id);
			const articles = await this.fetchBlogsFeeds(
				entry.value.blogs || []
			);

			for (const article of articles) {
				if (
					!(await this.articleHaveAlreadyBeNotified(
						entry.guildId,
						article
					))
				) {
					const channel = (await guild?.channels
						.fetch(article.blog.channelId)
						.catch(() => null)) as BaseGuildTextChannel | undefined;

					if (channel) {
						const message =
							client.func.method.generateCustomMessagePreview(
								lang.blogger_on_new_article_default_message,
								{
									guild: guild!,
									user: client.user!,
									guildLocal: "en-US",
									blogger: {
										articleTitle: article.content.title,
										articleAuthor: article.content.author,
										articleLink: article.content.link,
										blogName: await this.getBlogNameByRss(
											article.blog.rss
										)
									}
								}
							);

						await client.db.push(
							`${entry.guildId}.BLOGGER.lastArticleNotified`,
							{
								blogId: article.blog.id,
								articleId: article.content.id,
								timestamp: article.content.pubDate.toISOString()
							}
						);

						await channel.send({
							content: message,
							components: [
								this.createLinkButton(
									article.content.link,
									lang.blogger_read_article
								)
							],
							nonce: SnowflakeUtil.generate().toString(),
							enforceNonce: true
						});
					}
				}
			}
		}
	}

	public async start() {
		logger.log(
			`${client.config.console.emojis.LOAD} >> Starting Blogger RSS Notifier...`
				.white
		);

		await this.refresh();
		setInterval(async () => await this.refresh(), 60_000); // Check every minute
	}
}
