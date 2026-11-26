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

	// A dashboard action run by the bot (`core/modules/gatewayLinkActions`):
	// reading what only the bot knows, or acting with a slash command's guards.
	// The gateway already checked the session and Manage Server; the bot checks
	// the actor again like `commandExecutor` (custom perms, native permission).
	export interface ActionEvent {
		op: "event";
		id: string;
		type: "guild.action";
		guildId: string;
		actorId: string;
		// Name in `actions` (e.g. "music.state"); the gateway relays known names only.
		action: string;
		// GET actions: the query, as strings. POST actions: the JSON body.
		params: Record<string, unknown>;
		// POST (it changes something): the command's cooldown and the guild's
		// /commandlimit apply, as for a use of the command. Reads are free
		// (the dashboard polls some of them).
		write?: boolean;
	}

	// One answer of a Google Forms response (grids flattened to "row: value").
	export interface FormAnswer {
		question: string;
		answer: string | string[];
	}

	// A response to a linked Google Form (`GUILD.GOOGLE_FORMS`), already
	// verified (HMAC) and stored by the gateway. The bot reads the link from
	// the config again (enabled, channelId, roleId), posts the card and gives
	// the role (src/core/modules/googleForms.ts). Independent of config events.
	export interface FormSubmittedEvent {
		op: "event";
		id: string;
		type: "guild.form.submitted";
		guildId: string;
		linkId: string;
		// Link name when the response came in (the config's name wins).
		name: string;
		formTitle: string;
		// Unix ms.
		submittedAt: number;
		answers: FormAnswer[];
		// The answer to the link's memberQuestion: a user id or a username.
		memberQuery: string | null;
		// "Send a test response" of the dashboard: the card says so, no role is given.
		test?: boolean;
		// Google's response id: links a review (GoogleFormReview) to the stored response.
		responseId?: string;
	}

	// A decision taken in the dashboard on an application (a link in review mode). The bot checks the actor
	// is a reviewer, applies it like the card's buttons (googleForms.ts::decideReview) and answers
	// FormReviewAck; refusals are errors: "forbidden: …", "… not found", "already decided".
	export interface FormReviewEvent {
		op: "event";
		id: string;
		type: "guild.form.review";
		guildId: string;
		linkId: string;
		responseId: string;
		decision: "accept" | "refuse";
		// ≤ 1000, refusals only, sent to the applicant.
		reason?: string | null;
		actorId: string;
	}

	// `Ack.data` of `guild.form.review`.
	export interface FormReviewAck {
		status: "accepted" | "refused";
		// The role of the decision (accepted: roleId, refused: refusedRoleId) is held now.
		roleGiven: boolean;
		dmSent: boolean;
	}

	// `Ack.data` of `guild.form.submitted`.
	export interface FormSubmittedAck {
		posted: boolean;
		// The member holds the role now (given, or already had it).
		roleGiven: boolean;
		memberId: string | null;
	}

	export type Event =
		ConfigUpdatedEvent | ActionEvent | FormSubmittedEvent | FormReviewEvent;

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
		// `guild.action`: what the action answers (JSON);
		// `guild.form.submitted`: FormSubmittedAck; `guild.form.review`: FormReviewAck.
		data?: unknown;
	}
}
