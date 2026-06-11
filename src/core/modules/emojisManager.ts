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

import { REST, Routes } from "discord.js";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import logger from "../logger.ts";

type LocalEmoji = {
	Name: string;
	Extension: "png" | "gif";
};

type ApplicationEmojiData = {
	Name: string | null;
	Extension: "png" | "gif";
	Id: string;
	FormatedName: string;
};

type EmojisManagerOptions = {
	rest?: REST;
	applicationId?: string;
};

class EmojisManager {
	private emojisPath = path.join(process.cwd(), "src", "assets", "emojis");
	private final_appEmojis: Record<string, string> = {};
	private rest?: REST;
	private applicationId?: string;

	public constructor(options: EmojisManagerOptions = {}) {
		this.rest = options.rest;
		this.applicationId = options.applicationId;
	}

	public async startSync() {
		const appEmojis = await this.fetchCurrentApplicationEmojis();
		const local_emojis = this.loadLocalEmojis();

		const result = {
			skiped: 0,
			writed: 0,
			cant: 0
		};

		for (const local_emoji of local_emojis) {
			// Check if the local emoji exist on the Application Emoji
			const appEmoji = appEmojis.find((x) => x.Name === local_emoji.Name);
			if (appEmoji) {
				this.final_appEmojis[
					local_emoji.Name.replace("iHorizon_", "")
				] = appEmoji.FormatedName;
				result.skiped++;
			} else {
				try {
					const res = await this.createApplicationEmoji(local_emoji);

					this.final_appEmojis[
						local_emoji.Name.replace("iHorizon_", "")
					] = res;

					result.writed++;
				} catch (error) {
					logger.err(`Failed to create emoji ${local_emoji.Name}`);
					logger.err(error);
					result.cant++;
				}
			}
		}

		logger.log(
			`${this.getLogEmoji("OK")} >> ${result.skiped} emojis skiped, ${result.writed} emojis created.`
		);
		result.cant >= 1
			? logger.warn(`I got issue with ${result.cant} emoji(s)!`)
			: null;
		this.writeInClient();
		this.writeFinalJSON();
	}

	private loadLocalEmojis(): LocalEmoji[] {
		const local_emojis = readdirSync(this.emojisPath);
		const emojis: LocalEmoji[] = [];

		for (const emoji of local_emojis) {
			emojis.push({
				Name: `${emoji.split(".")[0]}`,
				Extension: emoji.endsWith("png") ? "png" : "gif"
			});
		}

		return emojis;
	}

	private async fetchCurrentApplicationEmojis(): Promise<
		ApplicationEmojiData[]
	> {
		if (this.rest && this.applicationId) {
			const fetched_emojis_data = (await this.rest.get(
				Routes.applicationEmojis(this.applicationId)
			)) as {
				items: {
					id: string;
					name: string | null;
					animated?: boolean;
				}[];
			};

			return fetched_emojis_data.items
				.map((x) => {
					const extension: ApplicationEmojiData["Extension"] =
						x.animated ? "gif" : "png";

					return {
						Name: x.name,
						Extension: extension,
						Id: x.id,
						FormatedName: `<${x.animated ? "a" : ""}:${x.name}:${x.id}>`
					};
				})
				.filter((x) => x.Name?.startsWith("iHorizon"));
		}

		const fetched_emojis_data = await client.application?.emojis.fetch();
		return fetched_emojis_data
			? Array.from(fetched_emojis_data.values())
					.map((x) => {
						const extension: ApplicationEmojiData["Extension"] =
							x.animated ? "gif" : "png";

						return {
							Name: x.name,
							Extension: extension,
							Id: x.id,
							FormatedName: x.toString()
						};
					})
					.filter((x) => x.Name?.startsWith("iHorizon"))
			: [];
	}

	private async createApplicationEmoji(
		local_emoji: LocalEmoji
	): Promise<string> {
		if (this.rest && this.applicationId) {
			const image = this.resolveEmojiImage(local_emoji);
			const created_emoji = (await this.rest.post(
				Routes.applicationEmojis(this.applicationId),
				{
					body: {
						name: local_emoji.Name,
						image
					}
				}
			)) as { id: string; name: string | null; animated?: boolean };

			return `<${created_emoji.animated ? "a" : ""}:${created_emoji.name}:${created_emoji.id}>`;
		}

		const res = await client.application?.emojis.create({
			name: local_emoji.Name,
			attachment: readFileSync(
				path.join(
					this.emojisPath,
					`${local_emoji.Name}.${local_emoji.Extension}`
				)
			)
		});

		return res!.toString();
	}

	private resolveEmojiImage(local_emoji: LocalEmoji): string {
		const fileBuffer = readFileSync(
			path.join(
				this.emojisPath,
				`${local_emoji.Name}.${local_emoji.Extension}`
			)
		);
		const mimeType =
			local_emoji.Extension === "gif" ? "image/gif" : "image/png";

		return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
	}

	private getLogEmoji(
		key: keyof typeof client.config.console.emojis
	): string {
		return global.client?.config?.console?.emojis?.[key] ?? key;
	}

	private writeFinalJSON() {
		writeFileSync(
			path.join(process.cwd(), "src", "files", "emojis.json"),
			JSON.stringify(this.final_appEmojis, null, 4)
		);
	}

	private writeInClient() {
		if (!global.client) return;
		client.iHorizon_Emojis = this.final_appEmojis as any;
	}
}

export { EmojisManager };
