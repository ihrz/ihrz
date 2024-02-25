
interface LavalinkNodeOptions {
    id: string;
    host: string;
    port: number;
    authorization: string;
};

export interface ConfigData {
    discord: {
        token: string;
        botPresence: boolean;
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

        cluster: {
            0?: string;
            1?: string;
            2?: string;
            3?: string;
            4?: string;
            5?: string;
        };

        shutdownClusterWhenStop: boolean
    };

    command: {
        alway100: string[]
    };

    owner: {
        ownerid1: string
        ownerid2: string;
    };

    api: {
        useHttps: boolean;
        domain: string;
        port: string;
        useProxy: boolean;
        proxyUrl: string;
        apiToken: string;
        clientSecret: string;
        clientID: string;
        oauth2Link: string;
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