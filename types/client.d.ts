/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import { Collection } from "discord.js";
import { clientFunction } from "./clientFunction";
import { Command } from "./command";
import { QuickDB } from "quick.db";
import { Player } from 'discord-player';
import { DataBase } from "./database";
import { AnotherCommand } from "./anotherCommand";
import { Emojis } from "./emojis";
import { GiveawayManager } from "discord-regiveaways";

declare module 'discord.js' {
    export interface Client {
        functions: clientFunction,
        commands: Collection<string, Command>,
        message_commands: Collection<string, Command>,
        player: Player,
        invites: Collection,
        vanityInvites: Collection<Snowflake, VanityInviteData>,
        buttons: Collection<string, Function>,
        selectmenu: Collection<string, Function>,
        db: QuickDB,
        applicationsCommands: Collection<string, AnotherCommand>,
        iHorizon_Emojis: Emojis,
        giveawaysManager: GiveawayManager
    }
};