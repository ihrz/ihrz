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

import { MySQL } from "./sqlLogin";

export interface LavalinkNodeOptions {
	retryAmount?: number;
	retryDelay?: number;
	id: string;
	host: string;
	port: number;
	authorization: string;
	secure: boolean;
}

export interface ConfigData {
	/**
	 * @description Discord part for the configuration
	 * @description Check https://www.ihorizon.org/docs/self-hosting/configuration/
	 */
	discord: {
		/**
		 * @description The authorization token of your bot token
		 */
		token: string;
		/**
		 * @description Trick the discord.js gateway websocket device propeties.
		 * @default false
		 */
		phonePresence: boolean;
		/**
		 * @description if true, the default bot prefix command will be the mention itself
		 */
		messageCommandsMention?: boolean;
		/**
		 * @description this settings is only when the 'messageCommandsMention' properties is set to false. This properties is for the default bot prefix.
		 */
		defaultMessageCommandsPrefix?: string;
	};

	/**
	 * @description Use lavalink for music playback.
	 * @description Check https://lavalink.dev/
	 */
	lavalink: {
		/**
		 * @description Check https://tomato6966.github.io/lavalink-client/home/configuration/
		 */
		nodes: LavalinkNodeOptions[];
	};

	/**
	 * @description core properties
	 */
	core: {
		/**
		 * @description will show error in the console
		 */
		devMode: boolean;
		/**
		 * @description image url for blacklist
		 */
		blacklistPictureInEmbed: string;
		/**
		 * @description channel id where the bot will log new guild/guild leave
		 */
		guildLogsChannelID: string;
		/**
		 * @description channel id where the will send error (in production)
		 */
		reportChannelID: string;
		/**
		 * @description channel id where the bot will send music playback error
		 */
		lavalinkLogsChannelID?: string;
	};

	command: {
		/**
		 * @example ["{ID ONE}X{ID TWO}"]
		 * @description in the /fun love command, they will be 100% everytime
		 */
		always100: string[];
	};

	owners: {
		/**
		 * @description owner of the bot. can eval code, blacklist, unblacklist, bypass some permission check
		 */
		users: string[];
	};

	/**
	 * @description Not required for Self-Hosting. You can skip this object.
	 */
	api: {
		/**
		 * @default "https://gateway.ihorizon.org"
		 * @description Not required for Self-Hosting.  The Horizon's Gateway URL. This thing is only in production phase. btw HorizonGW is private-source.
		 */
		HorizonGateway?: string;
		/**
		 * @default "http://127.0.0.1:31981"
		 * @description Not required for Self-Hosting. Optional local Horizon Gateway URL, used for bot-to-gateway calls on the same machine. Bypasses reverse proxies (Cloudflare, ...) and their body limits. User-facing links always keep using HorizonGateway.
		 */
		HorizonGatewayLocal?: string;

		/**
		 * @description Not required for Self-Hosting. This is a private shared-key between the HorizonGateway and the production bot.
		 */
		apiToken: string;
	};

	lastfm?: {
		/**
		 * @description The Last.fm application API key used for scrobbling requests.
		 */
		apiKey: string;
		/**
		 * @description The Last.fm application shared secret used to sign requests.
		 */
		sharedSecret: string;
	};

	console: {
		emojis: {
			OK: string;
			ERROR: string;
			HOST: string;
			KISA: string;
			LOAD: string;
		};
	};

	database?: {
		/**
		 * @description use the good driver for your environnement
		 */
		method: "json" | "sqlite" | "memory" | "postgresql" | "horizondb";

		mySQL?: MySQL;

		/**
		 * @description Public iHorizon technology - https://gitlab.com/ihrz/db.git
		 */
		horizon_db?: {
			host: string;
			port: number;
			login: string;
			password: string;
			/** Per-request timeout in milliseconds (default: 10000). */
			requestTimeoutMs?: number;
		};
	};
}
