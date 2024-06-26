/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import './core/functions/colors.js';

import { ShardingManager, Client, Partials, GatewayIntentBits } from 'pwss';
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