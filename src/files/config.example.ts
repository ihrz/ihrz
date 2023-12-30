/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

export default {

    discord: {

        "token": process.env.BOT_TOKEN
            || "The bot token",
        // The Discord Bot Token

    },

    core: {

        "debug": true,
        // Debug information about the slash command when he create/remove/update

        "devMode": true,
        // true => log's ERROR are been in the console OR false => In the .err_logs folder.

        "bash": false,
        // true => Beautiful iHorizon bash on the console OR false => Disable it.

        "blacklistPictureInEmbed": "The image of the blacklist's Embed (When blacklisted user attempt to interact with the bot)",

        "guildLogsChannelID": "The Discord Channel's ID for logs when guildCreate/guildRemove",
        // The channel where the robot informs of the arrival on a server or when it leaves.

        "reportChannelID": "The Discord Channel's ID for logs when bugs/message are reported",
        // The channel where the robot informs of a bug reported by a user of the bot.

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

        "ownerid1": process.env.OWNER_ONE ||
            "The discord User ID of the Owner number One",

        "ownerid2": "The discord User ID of the Owner number Two",
        /*
        This owners have different permissions than the others in the db,
        
        * They are allowed to use /eval command everywhere.
        * They can't be unowner by owner who are in the Database.
        * They can't be blacklisted by owner who are in the Database.
        * They can't be banned by owner who are in the Database.
        */

    },

    api: {

        "useHttps": false,
        // If you want to use HTTPS, put true, otherwise leave false.

        "domain": process.env.HOST ||
            "login.domain.com",
        // If you want to use Domain, else put ipv4 address.

        "port": process.env.PORT ||
            "3000",
        // The port of the API.

        "useProxy": false,
        // For example you use nginx&certbot to make the Front-end

        "proxyUrl": "https://login.example.com",
        // You need the entire URL of the proxy!

        "apiToken": "The API's token for create a request (Need to be private for security reason)",
        // The API token for secure requests, please put a strong token.

        "clientSecret": "The client Secret of your application",
        // The client secret of the Discord Application which is used to login for Oauth2.

        "clientID": process.env.CLIENT_ID ||
            "The client ID of your application",
        // The client ID of the Discord Application which is used to login for Oauth2.

        "oauth2Link": "The oauth2Link of your application",
        // The oauth2Link of the Discord Application which is used to login for Oauth2.

    },

    console: {

        "emojis": {

            OK: "✅", ERROR: "❌", HOST: "💻", KISA: "👩", LOAD: "🔄"

        }

    },

    database: {

        "mongoDb": "mongodb://ihrz:1337/iHorizonDB",
        // If you use MongoDB, put the address of the MongoDB connection.

        "useSqlite": true,
        /*
        If you want to use SQLite, put true, 
        if you want to use MongoDB, put false.
        */

        "useDatabaseAPI": false,
        /*
        If you want to use the database API before the QuickDB, put true,
        If you want to use direclty the QuickDB wrapper, put false.
        */

        "useDatabaseAPIOnlyDashboard": true,
        /*
        If you want to use the database API just for the dashboard.
        The bot ignore the DataBaseAPI and keep QuickDB wrapper per
        default in the code.

        Else, if you want to use the database API everywhere, put false.
        */

    },

};
