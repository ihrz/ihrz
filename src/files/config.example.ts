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

import { ConfigData } from '../../types/configDatad';

const config: ConfigData = {

    discord: {

        token: "The bot token",
        // The Discord Bot Token

        phonePresence: false,
        // If the bot have Phone Bot Activity Presence

        messageCommandsMention: true,
        /* If is in true, the message commands (prefix commands) are trigerable with @Bot-Mention,
            else, change propriety defaultMessageCommandsPrefix bellow for your default-prefix
        */

        defaultMessageCommandsPrefix: "?"
        // The message commands prefix if your choose to use prefix instead of bot mention as prefix

    },

    lavalink: {

        nodes: [
            {

                id: "example_node",
                // The ID of the Node

                host: "lavalink.example.com",
                // The Host of the Node

                port: 2333,
                // The port of the Node

                authorization: "password",
                // The password of the Node

            }
        ],

    },

    core: {

        devMode: true,
        // true => log's ERROR are been in the console OR false => In the .err_logs folder.

        bash: false,
        // true => Beautiful iHorizon bash on the console OR false => Disable them.

        blacklistPictureInEmbed: "An png url",
        // The image of the blacklist's Embed (When blacklisted user attempt to interact with the bot)

        guildLogsChannelID: "The Discord Channel's ID for logs when guildCreate/guildRemove",
        // The channel where the robot informs of the arrival on a server or when it leaves.

        reportChannelID: "The Discord Channel's ID for logs when bugs/message are reported",
        // The channel where the robot informs of a bug reported by a user of the bot.

        cluster: [
            "http://localhost:9030"
        ],
        // The Clusters's URL for the OwnIHRZ-ClusterManager

        shutdownClusterWhenStop: false
        /*
        This option permit to,
        
        * Every OWNIhrz which are hosted by a Cluster to be shutdown
        When the bot are stoped
        */

    },

    command: {

        alway100: ['171356978310938624x1099042785736282205']
        /*
        For love command, if you want for specific couple of user, 
        always show 100% for their love, adding it to the array
        Format: {USER_ID_ONE}x{USER_ID_TWO}
        */

    },

    owner: {

        ownerid1: "User id",

        ownerid2: "User id",
        /*
        This owners have different permissions than the others in the db,
        
        * They are allowed to use /eval command everywhere.
        * They can't be unowner by owner who are in the Database.
        * They can't be blacklisted by owner who are in the Database.
        * They can't be banned by owner who are in the Database.
        */

        owners: ["User id", "User id"]
        // OPTIONAL CONFIG FIELD

    },

    api: {

        apiToken: "The api token",
        // The API token for secure requests, please put a strong token, Need to be private for security reason.

        clientID: "The client id of your application",
        // The client ID of the Discord Application.
    },

    console: {

        emojis: {

            OK: "✅", ERROR: "❌", HOST: "💻", KISA: "👩", LOAD: "🔄"

        }

    },

    database: {
        method: 'SQLITE',
        // The method you want for the database

        mongoDb: "mongodb://ihrz:1337/iHorizonDB",
        // If you use MongoDB, put the address of the MongoDB connection.

        mySQL: {
            host: '',
            password: '',
            database: '',
            user: '',
            port: 3306
        },
        // The MySQL connection configuration if you using MySQL
    },

};

export default config;