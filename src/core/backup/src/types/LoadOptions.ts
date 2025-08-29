import { MessageMentionOptions } from "discord.js";

export interface LoadOptions {
    clearGuildBeforeRestore: boolean;
    maxMessagesPerChannel?: number;
    allowedMentions?: MessageMentionOptions;
    selfBot?: boolean;
    devMode?: boolean; // Activer/désactiver les logs de débogage
}
