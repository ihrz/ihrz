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

    export interface DbInId {
        USER?: DbGuildUserObject;
        GUILD?: DbGuildObject;
        TICKET_ALL?: {
            [userId: string]: {
                [channelId: string]: {
                    channel: string;
                    author: string;
                    alive: boolean;
                };
            };
        };
        PROTECTION?: {
            [rule: string]: {
                mode: string;
            } | string | undefined;
            SANCTION?: string;
        };
        ROLE_SAVER?: {
            [userId: string]: string[];
        };
        ALLOWLIST?: {
            enable?: boolean;
            list?: {
                [x: string]: {
                    allowed: boolean;
                };
            };
        };
        SUGGEST?: {
            channel: string;
            disable?: boolean;
        };
        SUGGESTION?: {
            [suggestCode: string]: {
                author: string;
                msgId: string;
                replied?: boolean;
            };
        };
        ECONOMY?: {
            disabled: boolean;
        };
        SECURITY?: {
            channel?: string;
            disable?: boolean;
            role?: string;
        };
        UTILS?: {
            unban_members?: string[];
        };
        VOICE_INTERFACE?: {
            staff_role?: string;
            interface: {
                channelId?: string;
                messageId?: string;
            };
            voice_channel: string | undefined;
        };
    }

    export interface DbGuildUserObject {
        [userId: string]: {
            INVITES?: {
                BY?: {
                    inviter: string;
                    invite: string;
                };
                regular?: number;
                invites?: number;
                bonus?: number;
                leaves?: number;
            };
            ECONOMY?: {
                money?: number;
                bank?: number;
                daily?: number;
                monthly?: number;
                weekly?: number;
                work?: number;
            };
            REPORT?: {
                cooldown: number;
            };
            XP_LEVELING?: {
                xp?: number;
                xptotal?: number;
                level?: number;
            };
        };
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
        GUILD_CONFIG?: {
            joinmessage?: string;
            join?: string;
            leave?: string;
            joindm?: string;
            joinroles?: string;
            leavemessage?: string;
            mass_mention?: string;
            antipub?: string;
            spam?: string;
            hey_reaction?: boolean;
            rolesaver?: {
                enable?: boolean;
                timeout?: string;
                admin?: string;
            };
            GHOST_PING: {
                channels: string[];
                active: boolean;
            };
        };
        BLOCK_BOT?: boolean;
        MCOUNT?: {
            member: {
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
        };
        PUNISH?: {
            PUNISH_PUB?: {
                amountMax?: number;
                punishementType?: string | null;
                state?: string;
            };
        };
        SERVER_LOGS?: {
            roles?: string;
            moderation?: string;
            voice?: string;
            message?: string;
            boosts?: string;
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
            disable?: boolean;
            xpchannels?: string;
        };
        REACTION_ROLES?: {
            [messageId: string]: {
                [reaction: string]: {
                    rolesID: string;
                    reactionNAME: string;
                    enable: boolean;
                };
            };
        };
        RANK_ROLES?: {
            roles: string;
        };
        SNIPE?: {
            [channelId: string]: {
                snipe: string;
                snipeUserInfoTag: string;
                snipeUserInfoPp: string;
                snipeTimestamp: number;
            };
        };
        REACT_MSG: {
            [message: string]: string;
        };
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