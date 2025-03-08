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

import { LyricsManager } from "../src/core/functions/lyrics_fetcher.js";
import { iHorizonTimeCalculator } from "../src/core/functions/ms.js";

import { GiveawayManager } from "../src/core/modules/giveawaysManager.js";
import { Collection, Snowflake } from 'discord.js';
import { LavalinkManager } from "lavalink-client";

import { AnotherCommand } from "./anotherCommand.js";
import { BotContent } from './botContent.js'
import { Category } from "./category.js";

import type { VanityInviteData } from "./vanityUrlData.d.ts";
import { Command } from "./command.js";
import { Emojis } from "./emojis.js";

import * as ClientVersion from "../src/version.js";
import { Assets } from "./assets.js";
import { ConfigData } from "./configDatad.js";
import { BashCommands } from "./bashCommands.js";
import { StreamNotifier } from "../src/core/StreamNotifier.js";
import { OwnIHRZ } from "../src/core/modules/ownihrzManager.js";
import { db } from "../src/core/database.js";
import { KdenLive } from "../src/core/functions/kdenliveManipulator.js";
import { MemberCountModule } from "../src/core/modules/memberCountManager.js";
import type { Client_Functions } from "./client_functions.d.ts";
import { AutoRenew } from "../src/core/modules/autorenewManager.js";

declare module 'discord.js' {
	export interface Client {
		func: typeof Client_Functions,
		commands: Collection<string, Command>,
		subCommands: Collection<string, Command>,
		category: Category[]
		message_commands: Collection<string, Command>,
		player: LavalinkManager,
		invites: Collection<string, Collection<string, number | null>>,
		vanityInvites: Collection<Snowflake, VanityInviteData>,
		buttons: Collection<string, Function>,
		selectmenu: Collection<string, Function>,
		db: db,
		applicationsCommands: Collection<string, AnotherCommand>,
		iHorizon_Emojis: Emojis,
		giveawaysManager: GiveawayManager,
		content: BotContent[],
		timeCalculator: iHorizonTimeCalculator,
		lyricsSearcher: LyricsManager,
		version: typeof ClientVersion,
		assets: Assets,
		config: ConfigData,
		isModuled?: boolean,
		owners: string[],
		bash: Collection<string, BashCommands>,
		notifier: StreamNotifier,
		ownihrz: OwnIHRZ,
		kdenlive: KdenLive,
		htmlfiles: Record<string, string>,
		memberCountManager: MemberCountModule,
		autoRenewManager: AutoRenew
	}
}