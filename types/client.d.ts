/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { iHorizonTimeCalculator } from "../src/core/functions/ms.js";

import { GiveawayManager } from "../src/core/modules/giveawaysManager.js";
import { Collection, Snowflake } from 'discord.js';

import { AnotherCommand } from "./anotherCommand.js";
import { BotContent } from './botContent.js'
import { Category } from "./category.js";

import type { VanityInviteData } from "./vanityUrlData.d.ts";
import { Command } from "./command.js";
import emojis from "../src/files/emojis.json";

import * as ClientVersion from "../src/version.js";
import { Assets } from "./assets.js";
import { ConfigData } from "./configDatad.js";
import { KdenLive } from "../src/core/functions/kdenliveManipulator.js";
import { MemberCountModule } from "../src/core/modules/memberCountManager.js";
import type { Client_Functions } from "./client_functions.d.ts";
import { AutoRenew } from "../src/core/modules/autorenewManager.js";
import { EmojisManager } from "../src/core/modules/emojisManager.ts";
import { NightModeManager } from "../src/core/modules/nightModeManager.ts";
import { GithubLinesManager } from "../src/core/modules/githubLinesManager.ts";
import { PallasDB } from "pallas-db";

declare module 'discord.js' {
	export interface Client {
		func: typeof Client_Functions,
		commands: Collection<string, Command>,
		subCommands: Collection<string, Command>,
		category: Category[]
		message_commands: Collection<string, Command>,
		invites: Collection<string, Collection<string, number | null>>,
		vanityInvites: Collection<Snowflake, VanityInviteData>,
		buttons: Collection<string, Function>,
		selectmenu: Collection<string, Function>,
		db: PallasDB,
		applicationsCommands: Collection<string, AnotherCommand>,
		iHorizon_Emojis: typeof emojis,
		giveawaysManager: GiveawayManager,
		content: BotContent[],
		timeCalculator: iHorizonTimeCalculator,
		version: typeof ClientVersion,
		assets: Assets,
		config: ConfigData,
		isModuled?: boolean,
		owners: string[],
		kdenlive: KdenLive,
		htmlfiles: Record<string, string>,
		memberCountManager: MemberCountModule,
		autoRenewManager: AutoRenew,
		emojisManager: EmojisManager,
		nightmodeManager: NightModeManager,
		githubLinesManager: GithubLinesManager,
		// IN SHARD
		inShard: (guildId: string) => boolean
	}
}