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

import { Collection, GuildMember, Message, Snowflake } from "discord.js";

export namespace AntiSpam {
    export interface CachedMessage {
        messageID: Snowflake;
        guildID: Snowflake;
        authorID: Snowflake;
        channelID: Snowflake;
        content: string;
        sentTimestamp: number;
    }

    export interface AntiSpamCache {
        raidInfo: Map<string, { value: number | boolean }>;
        messages: Set<CachedMessage>;

        kickedUsers: Set<Snowflake>;
        bannedUsers: Set<Snowflake>;

        membersToPunish: Set<GuildMember>;
        spamMessagesToClear: Set<CachedMessage>;
    }

    export interface AntiSpamOptions {
        BYPASS_ROLES?: string[];
        ignoreBots: boolean;
        maxDuplicatesInterval: number;
        maxInterval: number;
        Enabled: boolean;
        Threshold: number;
        maxDuplicates: number;
        removeMessages: boolean;
        punishment_type: 'mute' | 'kick' | 'ban';
        punishTime: number;
        similarMessageThreshold: number;
        intervalBetweenWarn: number;
        punishTimeMultiplier: boolean;
    }
}
