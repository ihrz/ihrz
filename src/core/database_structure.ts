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

export namespace DatabaseStucture {

    export type db_table_json = {
        BACKUPS?: DB_Backups_Object
        EMBED?: DB_Embed_Object
        [key: string]: db_in_id | DB_Backups_Object | DB_Embed_Object | undefined
    }
    
    export type DB_Embed_Object = {
        [code: string]: {
            embedOwner: string
            embedSource: EmbedBuilder
        }
    }
    
    export type DB_Backups_Object = {
        [userId: string]: {
            [backupId: string]: {
                guildName: string
                categoryCount: number
                channelCount: number
            }
        }
    }
    
    export type db_in_id = {
        USER?: DB_GuildUser_Object;
        GUILD?: DB_Guild_Object;
        TICKET_ALL?: {
            [userId: string]: {
                [channelId: string]: {
                    channel: string
                    author: string
                    alive: boolean
                }
            }
        }
        PROTECTION?: {
            [rule: string]: {
                mode: string
            } | string | undefined
            SANCTION?: string
        }
        ROLE_SAVER?: {
            [userId: string]: string[]
        }
        ALLOWLIST?: {
            enable?: boolean
            list?: {
                [x: string]: {
                    allowed: boolean
                };
            }
        }
        SUGGEST?: {
            channel: string
            disable?: boolean
        }
        SUGGESTION?: {
            [suggestCode: string]: {
                author: string
                msgId: string
                replied?: boolean
            }
        }
        ECONOMY?: {
            disabled: boolean
        }
        SECURITY?: {
            channel?: string
            disable?: boolean
            role?: string
        }
        UTILS?: {
            unban_members?: string[]
        }
        VOICE_INTERFACE?: {
            staff_role?: string
            interface: {
                channelId?: string
                messageId?: string
            }
            voice_channel: string | undefined
        }
    }
    
    export type DB_GuildUser_Object = {
        [userId: string]: {
            INVITES?: {
                BY?: {
                    inviter: string
                    invite: string
                }
                regular?: number
                invites?: number
                bonus?: number
                leaves?: number
            }
            ECONOMY?: {
                money?: number
                bank?: number
                daily?: number
                monthly?: number
                weekly?: number
                work?: number
            }
            REPORT?: {
                cooldown: number
            }
            XP_LEVELING?: {
                xp?: number
                xptotal?: number
                level?: number
            }
        }
    };
    
    export type DB_Guild_Object = {
        LANG?: {
            lang: string
        }
        TICKET?: {
            [key: string]: DB_Ticket_Configuration_Object | string | boolean | undefined
            logs?: string
            disable?: boolean
            category?: string
        }
        GUILD_CONFIG?: {
            joinmessage?: string
            join?: string
            leave?: string
            joindm?: string
            joinroles?: string
            leavemessage?: string
            mass_mention?: string
            antipub?: string
            spam?: string
    
            rolesaver?: {
                enable?: boolean
                timeout?: string
                admin?: string
            }
        }
        BLOCK_BOT?: boolean
        MCOUNT?: {
            member: {
                name?: string
                enable?: boolean
                event?: string
                channel?: string
            }
            roles?: {
                name?: string
                enable?: boolean
                event?: 'roles'
                channel?: string
            }
            bot?: {
                name?: string
                enable?: boolean
                event?: string
                channel?: string
            }
        }
        PUNISH?: {
            PUNISH_PUB?: {
                amountMax?: number
                punishementType?: string | null
                state?: string
            }
        }
        SERVER_LOGS?: {
            roles?: string
            moderation?: string
            voice?: string
            message?: string
            boosts?: string
        }
        SUPPORT?: {
            input?: string | null
            rolesId?: string
            state?: string
        }
        PFPS?: {
            channel?: string
            disable?: boolean
        }
        XP_LEVELING?: {
            disable?: boolean
            xpchannels?: string
        }
        REACTION_ROLES?: {
            [messageId: string]: {
                [reaction: string]: {
                    rolesID: string
                    reactionNAME: string
                    enable: boolean
                }
            }
        }
        RANK_ROLES?: {
            roles: string
        }
        SNIPE?: {
            [channelId: string]: {
                snipe: string
                snipeUserInfoTag: string
                snipeUserInfoPp: string
                snipeTimestamp: number
            }
        }
    }
    
    export type DB_Ticket_Configuration_Object = {
        author: string,
        used: boolean,
        selection?: CaseList[]
        panelName: string,
        channel: string,
        messageID: string,
    }
    
  
  }