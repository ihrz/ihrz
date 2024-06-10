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

import { LyricsManager } from "../src/core/functions/lyrics-fetcher.js";
import { iHorizonTimeCalculator } from "../src/core/functions/ms.js";

import { GiveawayManager } from "discord-regiveaways";
import { Collection, Snowflake } from "discord.js";
import { LavalinkManager } from "lavalink-client";
import { QuickDB } from "quick.db";

import { clientFunction } from "./clientFunction";
import { AnotherCommand } from "./anotherCommand";
import { BotContent } from './botContent'
import { Category } from "./category";

import { VanityInviteData } from "./vanityUrlData";
import { Command } from "./command";
import { Emojis } from "./emojis";

import * as ClientVersion from "../src/version.js";
import { Assets } from "./assets";
import { ConfigData } from "./configDatad.js";

declare module 'discord.js' {
    export interface Client {
        functions: clientFunction,
        commands: Collection<string, Command>,
        category: Category[]
        message_commands: Collection<string, Command>,
        player: LavalinkManager,
        invites: Collection<string, Collection<string, number | null>>,
        vanityInvites: Collection<Snowflake, VanityInviteData>,
        buttons: Collection<string, Function>,
        selectmenu: Collection<string, Function>,
        db: QuickDB,
        applicationsCommands: Collection<string, AnotherCommand>,
        iHorizon_Emojis: Emojis,
        giveawaysManager: GiveawayManager,
        content: BotContent[],
        timeCalculator: iHorizonTimeCalculator,
        lyricsSearcher: LyricsManager,
        version: typeof ClientVersion,
        assets: Assets,
        config: ConfigData,
        isModuled?: boolean
    }
};