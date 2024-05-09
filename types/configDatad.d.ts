
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
        method: 'MONGO_DB' | 'JSON' | 'MYSQL' | 'SQLITE'

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