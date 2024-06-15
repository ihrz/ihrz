import './core/functions/colors.js';

import { ShardingManager, Client, Partials, GatewayIntentBits } from 'discord.js';
import { fileURLToPath } from 'url';
import path from 'path';

import { ConfigData } from '../types/configDatad.js';

import * as ClientVersion from "./version.js";
import logger from './core/logger.js';
import * as core from './core/core.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class iHorizonBuilder {
    config: ConfigData;
    client: Client;

    constructor(config: ConfigData) {
        if (!config) {
            throw new Error(`Config is a required option. (val=${config})`);
        }
        this.config = config;

        this.client = new Client({
            intents: [
                GatewayIntentBits.AutoModerationConfiguration,
                GatewayIntentBits.AutoModerationExecution,
                GatewayIntentBits.DirectMessageReactions,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.DirectMessageTyping,
                GatewayIntentBits.GuildEmojisAndStickers,
                GatewayIntentBits.GuildIntegrations,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageTyping,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildScheduledEvents,
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildWebhooks,
                GatewayIntentBits.MessageContent
            ],
            partials: [
                Partials.Channel,
                Partials.Message,
                Partials.GuildMember,
                Partials.GuildScheduledEvent,
                Partials.User,
                Partials.Reaction,
                Partials.ThreadMember
            ]
        });

        this.client.config = this.config;
        this.client.isModuled = true;
        this.client.version = ClientVersion;
    }

    public start() {
        core.main(this.client);
    }
}

export { iHorizonBuilder };