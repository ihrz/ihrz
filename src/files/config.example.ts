/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

/*
WELCOME TO IHORIZON'S CONFIGURATION FILE. ALL VALUES SHOULD BE BETWEEN QUOTATION MARKS, UNLESS THE VALUE DOESN'T INITIALLY HAVE ANY QUOTATION MARK (e.g. phonePresence doesn't have quotation marks in its value)
*/


import { ConfigData } from '../../types/configDatad.js';

const config: ConfigData = {

	discord: {

		token: "THE BOT TOKEN",
		// The Discord Bot Token. This can be found in the Discord Developer Portal of your bot

		phonePresence: false,
		// If the bot should have a Phone Bot Activity Presence, aka having a telephone icon in its profile when online, Do-Not-Disturb, etc.

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

				secure: false
			}
		],

	},

	core: {

		devMode: true,
		// if true => ERRORS will be displayed in the console; if false => these ERRORS will be located in the .err.logs folder.

		blacklistPictureInEmbed: "A .png URL",
		// Optional: The image of the blacklist embed (when a blacklisted user attempts to interact with the bot)

		guildLogsChannelID: "The Discord Channel ID for logs when guildCreate/guildRemove",
		// The channel where the bot informs of his arrival on a server or when it leaves a server.

		lavalinkLogsChannelID: "The Discord Channel ID for logs when lavalink throws an error",
		// The channel where the error will be sent when lavalink throws an error.

		reportChannelID: "The Discord Channel ID for logs when bugs are reported",
		// The channel where the bot informs of a bug reported by a user of the bot.

	},

	command: {

		always100: ['USER_ID_ONExUSER_ID_TWO']
		/*
		On the love command, for a specific couple of users, 
		this setting will always show 100% for their love.
		Format: {USER_ID_ONE}x{USER_ID_TWO}
		*/

	},

	owners: {

		users: ["User ID", "User ID"]
		/*
		This owners have different permissions than others in the database,
	    
		* They can't be unowner by an owner who is in the Database.
		* They can't be blacklisted by an owner who is in the Database.
		* They can't be banned by an owner who is in the Database.
		*/

	},

	api: {

		apiToken: "The API token",
		// Optional. The API token is for secure requests. Please put a strong token. It needs to be private for security reasons.

		clientID: "The client ID of your application",
		// The client ID of the Discord Application. This can be found in the Discord Developer Portal of your bot.
	},

	console: {

		emojis: {

			OK: "✅", ERROR: "❌", HOST: "💻", KISA: "👩", LOAD: "🔄"

		}

	},

	database: {
		method: 'sqlite',
		// The method you want for the database, sqlite is used by default.

		mySQL: [
			{
				host: '',
				password: '',
				database: '',
				user: '',
				port: 3306
			},
		],
		// The MySQL connection configuration if you want to use MySQL. MySQL is not the default, meaning you need to set it up yourself.
	},

};

export default config;