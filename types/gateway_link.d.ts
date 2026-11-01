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

// Wire format of the gateway → bot channel (HorizonGateway `src/bot_link.rs`
// mirrors it). The bot owns this contract.
export namespace GatewayLink {
	export interface Hello {
		op: "hello";
		token: string;
		// Shard id of this process (one connection per shard).
		cluster: string;
		// Guilds held by this shard: the gateway routes each event to the
		// connection announcing the guild.
		guilds: string[] | null;
	}

	export interface GuildsUpdate {
		op: "guilds";
		add?: string[];
		remove?: string[];
	}

	export interface Ready {
		op: "ready";
		v: number;
	}

	// One modified dashboard section (`old`/`new` = null when absent).
	export interface ConfigChange {
		path: string;
		old: unknown;
		new: unknown;
	}

	export interface ConfigUpdatedEvent {
		op: "event";
		id: string;
		type: "guild.config.updated";
		guildId: string;
		// Dashboard user who saved; the gateway already checked their rights.
		actorId: string;
		changes: ConfigChange[];
	}

	export type Event = ConfigUpdatedEvent;

	export interface ChangeResult {
		path: string;
		ok: boolean;
		error?: string;
	}

	export interface Ack {
		op: "ack";
		id: string;
		ok: boolean;
		error?: string;
		results?: ChangeResult[];
	}
}
