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

import { EmbedBuilder } from "@discordjs/builders";
import { CaseList } from "./modules/ticketsManager.js";
import { AntiSpam } from "../../types/antispam.js";

export namespace DatabaseStructure {

    export interface DbTableJson {
        BACKUPS?: DbBackupsObject;
        EMBED?: DbEmbedObject;
        [key: string]: DbInId | DbBackupsObject | DbEmbedObject | undefined;
    }

    export interface DbEmbedObject {
        [code: string]: {
            embedOwner: string;
            embedSource: EmbedBuilder;
        };
    }

    export interface DbBackupsObject {
        [userId: string]: {
            [backupId: string]: {
                guildName: string;
                categoryCount: number;
                channelCount: number;
            };
        };
    }

    export interface TicketData {
        [userId: string]: {
            [channelId: string]: {
                channel: string;
                author: string;
                alive: boolean;
            };
        };
    }

    export interface ProtectionData {
        [rule: string]: {
            mode: string;
        } | string | undefined;
        SANCTION?: string;
    }

    export interface RoleSaverData {
        [userId: string]: string[];
    }

    export interface RoleSaverSchema {
        enable?: boolean;
        timeout?: string;
        admin?: string;
    }

    export interface AllowListData {
        enable?: boolean;
        list?: {
            [x: string]: {
                allowed: boolean;
            };
        };
    }

    export interface SuggestSchema {
        channel: string;
        disable?: boolean;
    }

    export interface SuggestionData {
        [suggestCode: string]: {
            author: string;
            msgId: string;
            replied?: boolean;
        };
    }

    export interface VoiceData {
        staff_role?: string;
        interface?: {
            channelId?: string;
            messageId?: string;
        };
        voice_channel?: string | undefined;
    };

    export interface GhostPingData {
        channels?: string[];
        active?: boolean;
    }

    export interface PunishPubSchema {
        amountMax?: number;
        punishementType?: string | null;
        state?: string;
    }

    export interface EconomyUserSchema {
        money?: number;
        bank?: number;
        daily?: number;
        monthly?: number;
        weekly?: number;
        work?: number;
    }

    export interface InvitesUserData {
        BY?: {
            inviter: string;
            invite: string;
        };
        regular?: number;
        invites?: number;
        bonus?: number;
        leaves?: number;
    }

    export interface XpLevelingUserSchema {
        xp?: number;
        xptotal?: number;
        level?: number;
    }

    export interface ReactionRolesData {
        [messageId: string]: {
            [reaction: string]: {
                rolesID: string;
                reactionNAME: string;
                enable: boolean;
            };
        };
    }

    export interface SnipeData {
        [channelId: string]: {
            snipe: string;
            snipeUserInfoTag: string;
            snipeUserInfoPp: string;
            snipeTimestamp: number;
        };
    }

    export interface SecuritySchema {
        channel?: string;
        disable?: boolean;
        role?: string;
    }

    export interface ConfessionSchema {
        panel?: {
            channelId: string;
            messageId: string;
        }
        disable?: boolean;
        ALL_CONFESSIONS?: {
            [confessionId: string]: {
                userId?: string;
                timestamp?: number;
                private?: boolean;
            }
        }
        cooldown?: number
    }

    export interface MemberCountSchema {
        member?: {
            name?: string;
            enable?: boolean;
            event?: string;
            channel?: string;
        };
        roles?: {
            name?: string;
            enable?: boolean;
            event?: 'roles';
            channel?: string;
        };
        bot?: {
            name?: string;
            enable?: boolean;
            event?: string;
            channel?: string;
        };
    }

    export interface DbInId {
        USER?: DbGuildUserObject;
        GUILD?: DbGuildObject;
        TICKET_ALL?: TicketData;
        PROTECTION?: ProtectionData;
        ROLE_SAVER?: RoleSaverData;
        ALLOWLIST?: AllowListData;
        SUGGEST?: SuggestSchema;
        SUGGESTION?: SuggestionData;
        ECONOMY?: {
            disabled: boolean;
        };
        SECURITY?: SecuritySchema;
        CONFESSION?: ConfessionSchema;
        UTILS?: {
            unban_members?: string[];
        };
        VOICE_INTERFACE?: VoiceData;
    }

    export interface DbGuildUserObject {
        [userId: string]: {
            INVITES?: InvitesUserData;
            ECONOMY?: EconomyUserSchema;
            REPORT?: {
                cooldown: number;
            };
            XP_LEVELING?: XpLevelingUserSchema;
        };
    }

    export interface GuildConfigSchema {
        joinmessage?: string;
        join?: string;
        leave?: string;
        joindm?: string;
        joinroles?: string | string[];
        leavemessage?: string;
        mass_mention?: string;
        antipub?: string;
        spam?: string;
        hey_reaction?: boolean;
        rolesaver?: RoleSaverSchema;
        GHOST_PING: GhostPingData;
    }

    export interface BlockNewAccountSchema {
        state: boolean;
        req: number;
    }

    export interface DbGuildObject {
        LANG?: {
            lang: string;
        };
        TICKET?: {
            [key: string]: DbTicketConfigurationObject | string | boolean | undefined;
            logs?: string;
            disable?: boolean;
            category?: string;
        };
        GUILD_CONFIG?: GuildConfigSchema
        BLOCK_BOT?: boolean;
        MCOUNT?: MemberCountSchema;
        PUNISH?: {
            PUNISH_PUB?: PunishPubSchema
        };
        SERVER_LOGS?: {
            roles?: string;
            moderation?: string;
            voice?: string;
            message?: string;
            boosts?: string;
            user?: string;
            antispam?: string;
        };
        SUPPORT?: {
            input?: string | null;
            rolesId?: string;
            state?: string;
        };
        PFPS?: {
            channel?: string;
            disable?: boolean;
        };
        XP_LEVELING?: {
            disable?: 'disable' | boolean;
            xpchannels?: string;
        };
        REACTION_ROLES?: ReactionRolesData;
        RANK_ROLES?: {
            roles: string;
            nicknames: string;
        };
        SNIPE?: SnipeData;
        REACT_MSG?: {
            [message: string]: string;
        };
        BLOCK_NEW_ACCOUNT?: BlockNewAccountSchema;
        ANTISPAM?: AntiSpam.AntiSpamOptions;
    }

    export interface DbTicketConfigurationObject {
        author: string;
        used: boolean;
        selection?: CaseList[];
        panelName: string;
        channel: string;
        messageID: string;
    }
}