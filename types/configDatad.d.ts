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

interface LavalinkNodeOptions {
    retryAmount?: number;
    retryDelay?: number;
    id: string;
    host: string;
    port: number;
    authorization: string;
};

export interface ConfigData {
    discord: {
        token: string;
        phonePresence: boolean;
        messageCommandsMention?: boolean;
        defaultMessageCommandsPrefix?: string;
    };

    lavalink: {
        nodes: LavalinkNodeOptions[];
    };

    core: {
        devMode: boolean;
        bash: boolean;
        blacklistPictureInEmbed: string;
        guildLogsChannelID: string;
        reportChannelID: string;

        cluster: string[];

        shutdownClusterWhenStop: boolean;
    };

    command: {
        alway100: string[]
    };

    owner: {
        ownerid1: string
        ownerid2: string;
        owners?: string[];
    };

    api: {
        useHttps?: boolean;
        domain?: string;
        port?: string;
        useProxy?: boolean;
        proxyUrl?: string;
        apiToken: string;
        clientID: string;
    };

    console: {
        emojis: {
            OK: string;
            ERROR: string;
            HOST: string;
            KISA: string;
            LOAD: string
        }
    };

    database?: {
        method: 'MONGO_DB' | 'JSON' | 'MYSQL' | 'SQLITE' | 'CACHED_SQL'

        mongoDb?: string;

        mySQL?: {
            host?: string;
            hostname?: string;
            user: string;
            password: string;
            database: string;
            port?: number;
        };
    };

}