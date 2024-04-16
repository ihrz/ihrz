import { EmbedBuilder } from "@discordjs/builders";
import { CaseList } from "./src/core/modules/ticketsManager.js";

interface DB_json {
    BACKUPS: DB_Backups_Object
    EMBED: DB_Embed_Object
    [key: string]: DB_id | DB_Backups_Object | DB_Embed_Object
}

interface DB_Embed_Object {
    [code: string]: {
        embedOwner: string
        embedSource: EmbedBuilder
    }
}

interface DB_Backups_Object {
    [userId: string]: {
        [backupId: string]: {
            guildName: string
            categoryCount: number
            channelCount: number
        }
    }
}

interface DB_id {
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

interface DB_GuildUser_Object {
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

interface DB_Guild_Object {
    LANG?: {
        lang: string
    }
    TICKET?: {
        logs?: string
        disable?: boolean
        category?: string
        [key: string]: DB_Ticket_Configuration_Object | string | boolean | undefined
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

interface DB_Ticket_Configuration_Object {
    author: string,
    used: boolean,
    selection?: CaseList[]
    panelName: string,
    channel: string,
    messageID: string,
}

const json: DB_id = {}