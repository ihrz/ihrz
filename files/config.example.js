module.exports = {
    
    discord: {
        "token": "The bot token",
    },

    giveaway: {
        "hostedBy": true,
    },

    core: {
        "devMode": false, // true => log's ERROR are been in the console OR false => In the crash's folder
        "bash": true, // true => Beautiful iHorizon bash on the console OR false => Disable them    
        "blacklistPictureInEmbed": "The image of the blacklist's Embed (When blacklisted user attempt to interact with the bot)",
        "guildLogsChannelID": "The Discord Channel's ID for logs when guildCreate/guildRemove",
        "asciicrash": "    ___              _     _                     \n   / __\\ __ __ _ ___| |__ | | ___   __ _ ___   _ \n  / / | '__/ _` / __| '_ \\| |/ _ \\ / _` / __| (_)\n / /__| | | (_| \\__ \\ | | | | (_) | (_| \\__ \\  _ \n \\____/_|  \\__,_|___/_| |_|_|\\___/ \\__, |___/ (_)\n                                   |___/         \n"
    },

    owner: {
        "ownerid1": "The discord User ID of the Owner number one",
        "ownerid2": "The discord User ID of the Owner number two",
    },

    api: {
        "apiURL": "https://exemple.domain.com:3000/api/check/",
        "loginURL": "https://login.domain.com:3000",
        "apiToken": "The API's token for create a request (Need to be private for security reason)",
    }

};