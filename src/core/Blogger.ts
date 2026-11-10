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
import { fetchPublic, readCapped } from "./svg/remoteImage.js";

/** Feeds are admin-supplied URLs: public hosts only, bounded size and time. */
const FEED_TIMEOUT_MS = 10_000;
const FEED_MAX_BYTES = 2 * 1024 * 1024;

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

interface ParsedFeed {
	title: string;
	items: RssFeedItem[];
}

type XmlNode = Record<string, any>;

function asArray<T>(value: T | T[] | null | undefined): T[] {
	if (value === null || value === undefined) return [];
	return Array.isArray(value) ? value : [value];
}

function xmlText(value: any): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "string" || typeof value === "number") {
		return String(value);
	}
	if (Array.isArray(value)) return xmlText(value[0]);
	if (typeof value === "object") {
		return xmlText(value["#text"] ?? value._ ?? "");
	}
	return "";
}

function xmlLink(value: any): string {
	const links = asArray(value);
	const alternate =
		links.find(
			(link) =>
				typeof link !== "object" ||
				!link["@rel"] ||
				link["@rel"] === "alternate"
		) ?? links[0];

	if (alternate === null || alternate === undefined) return "";
	if (typeof alternate === "string") return alternate;
	return alternate["@href"] ?? xmlText(alternate);
}

function xmlAuthor(value: any): string {
	const author = asArray(value)[0];
	if (author === null || author === undefined) return "";
	if (typeof author === "object") {
		return xmlText(author.name ?? author["dc:creator"] ?? author);
	}
	return xmlText(author);
}

function xmlDate(value: any): Date {
	const date = new Date(xmlText(value));
	return Number.isNaN(date.getTime()) ? new Date() : date;
}

export class BloggerNotifier {
	private refreshing = false;

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
		const result: {
			value: DatabaseStructure.BloggerSchema;
			guildId: string;
		}[] = [];

		for (const guild of client.guilds.cache.values()) {
			// Only the sub-key is needed: never pull the whole guild document.
			const blogger = await this.getGuildData(guild.id);
			if (blogger) {
				result.push({ value: blogger, guildId: guild.id });
			}
		}

		return result;
	}

	private getLatestArticle(items: RssFeedItem[]): RssFeedItem | null {
		return items?.reduce((latest, item) => {
			return new Date(item.pubDate) > new Date(latest.pubDate)
				? item
				: latest;
		}, items[0]);
	}

	private async parseFeed(rssUrl: string): Promise<ParsedFeed> {
		const response = await fetchPublic(rssUrl, {
			timeoutMs: FEED_TIMEOUT_MS,
			headers: {
				Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml"
			}
		});

		if (!response) {
			throw new Error(`Feed unreachable or not public: ${rssUrl}`);
		}
		if (!response.ok) {
			await response.body?.cancel().catch(() => {});
			throw new Error(`HTTP ${response.status} while fetching ${rssUrl}`);
		}

		const type = (response.headers.get("content-type") ?? "").toLowerCase();
		if (type && !type.includes("xml") && !type.startsWith("text/plain")) {
			await response.body?.cancel().catch(() => {});
			throw new Error(`Not an XML feed (${type}): ${rssUrl}`);
		}

		const body = await readCapped(response, FEED_MAX_BYTES).catch(
			() => null
		);
		if (!body) {
			throw new Error(`Feed too large or interrupted: ${rssUrl}`);
		}

		const xml = Bun.XML.parse(body.toString("utf8")) as XmlNode;
		const rss = xml.rss ?? xml["rdf:RDF"];
		const channel = rss?.channel;

		if (channel) {
			const rawItems = asArray(channel.item).length
				? asArray(channel.item)
				: asArray(rss.item);

			return {
				title: xmlText(channel.title),
				items: rawItems.map((item) => ({
					title: xmlText(item.title) || "No title",
					link: xmlLink(item.link),
					pubDate: xmlDate(
						item.pubDate ?? item["dc:date"] ?? item.date
					),
					author:
						xmlAuthor(item["dc:creator"] ?? item.author) ||
						"Unknown",
					id:
						xmlText(item.guid ?? item.id) ||
						xmlLink(item.link) ||
						"",
					contentSnippet:
						xmlText(
							item["content:encoded"] ??
								item.description ??
								item.content
						) || ""
				}))
			};
		}

		const feed = xml.feed;
		if (feed) {
			return {
				title: xmlText(feed.title),
				items: asArray(feed.entry).map((entry) => ({
					title: xmlText(entry.title) || "No title",
					link: xmlLink(entry.link),
					pubDate: xmlDate(
						entry.published ?? entry.updated ?? entry.date
					),
					author:
						xmlAuthor(entry["dc:creator"] ?? entry.author) ||
						"Unknown",
					id: xmlText(entry.id) || xmlLink(entry.link) || "",
					contentSnippet:
						xmlText(
							entry["content:encoded"] ??
								entry.content ??
								entry.summary
						) || ""
				}))
			};
		}

		return { title: "", items: [] };
	}

	private async fetchRssFeed(rssUrl: string): Promise<RssFeedItem[]> {
		try {
			const feed = await this.parseFeed(rssUrl);
			return feed.items;
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
			const feed = await this.parseFeed(rssUrl);
			return { valid: true, name: feed.title || "Unknown Blog" };
		} catch (error) {
			logger.err(`Error validating RSS feed ${rssUrl}: ${error}`);
			return { valid: false };
		}
	}

	public async getBlogNameByRss(rssUrl: string): Promise<string> {
		try {
			const feed = await this.parseFeed(rssUrl);
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

		await this.guardedRefresh();
		setInterval(() => this.guardedRefresh(), 60_000); // Check every minute
	}

	/** One refresh at a time: a slow feed must not stack overlapping runs. */
	private async guardedRefresh() {
		if (this.refreshing) return;
		this.refreshing = true;
		try {
			await this.refresh();
		} catch (error) {
			logger.err(`Blogger refresh failed: ${error}`);
		} finally {
			this.refreshing = false;
		}
	}
}
