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

import {
	BaseGuildVoiceChannel,
	ChannelType,
	EmbedBuilder,
	GuildMember,
	VoiceState,
} from 'discord.js';
import { Player, PlayerJson, Track, TrackEndReason } from 'lavalink-client';
import { createHash } from 'node:crypto';

import { DatabaseStructure } from '../../../types/database_structure.js';
import { profilTable } from '../../Events/client/ready.js';
import { decrypt, encrypt } from '../functions/encryptDecryptMethod.js';
import logger from '../logger.js';

interface LastFMApiResponse<T = any> {
	ok: boolean;
	data?: T;
	errorCode?: number;
	message?: string;
}

interface LastFMTrackData {
	album?: string;
	artist: string;
	durationMs: number;
	title: string;
	url?: string;
}

interface LastFMListenerSession {
	pausedDurationMs: number;
	pausedStartedAt?: number;
	scrobbled: boolean;
	sessionKey: string;
	startedAt: number;
	thresholdMs: number;
	timeout?: NodeJS.Timeout;
	userId: string;
	username: string;
}

interface LastFMGuildPlaybackSession {
	guildId: string;
	listeners: Map<string, LastFMListenerSession>;
	paused: boolean;
	track: LastFMTrackData;
	trackKey: string;
	voiceChannelId: string;
}

interface LastFMLoginResult {
	ok: boolean;
	message: string;
	username?: string;
}

export class LastFMScrobblerManager {
	private readonly apiUrl = 'https://ws.audioscrobbler.com/2.0/';
	private readonly guildSessions = new Map<string, LastFMGuildPlaybackSession>();
	private readonly apiKey: string;
	private readonly sharedSecret: string;

	constructor() {
		this.apiKey = process.env.LASTFM_API_KEY || client.config.lastfm?.apiKey || '';
		this.sharedSecret = process.env.LASTFM_SHARED_SECRET || client.config.lastfm?.sharedSecret || '';
	}

	public isConfigured(): boolean {
		return Boolean(this.apiKey && this.sharedSecret);
	}

	public getMissingConfigurationMessage(isFrench: boolean): string {
		return isFrench
			? `${client.iHorizon_Emojis.No} | Le module Last.fm n'est pas configuré côté bot. Ajoutez \`lastfm.apiKey\` et \`lastfm.sharedSecret\` dans la config, ou les variables d'environnement \`LASTFM_API_KEY\` et \`LASTFM_SHARED_SECRET\`.`
			: `${client.iHorizon_Emojis.No} | The Last.fm module is not configured on the bot. Add \`lastfm.apiKey\` and \`lastfm.sharedSecret\` to the config, or set the \`LASTFM_API_KEY\` and \`LASTFM_SHARED_SECRET\` environment variables.`;
	}

	public async getUserSettings(userId: string): Promise<DatabaseStructure.LastFMUserSchema | null> {
		const table = await this.getProfileTable();
		return (await table.get(`${userId}.lastfm`)) as DatabaseStructure.LastFMUserSchema | null;
	}

	public async hasUserSession(userId: string): Promise<boolean> {
		const settings = await this.getUserSettings(userId);
		return Boolean(settings?.sessionKey && settings?.username);
	}

	public async setEnabled(userId: string, enabled: boolean): Promise<{ ok: boolean; message?: string; }> {
		const settings = await this.getUserSettings(userId);

		if (enabled && (!settings?.sessionKey || !settings.username)) {
			return { ok: false };
		}

		const table = await this.getProfileTable();
		await table.set(`${userId}.lastfm`, {
			...(settings || {}),
			enabled,
		} satisfies DatabaseStructure.LastFMUserSchema);

		return { ok: true };
	}

	public async login(userId: string, username: string, password: string, isFrench: boolean): Promise<LastFMLoginResult> {
		if (!this.isConfigured()) {
			return {
				ok: false,
				message: this.getMissingConfigurationMessage(isFrench)
			};
		}

		const response = await this.callLastFM('auth.getMobileSession', {
			password,
			username
		});

		if (!response.ok) {
			return {
				ok: false,
				message: this.formatApiError(response, isFrench, 'login')
			};
		}

		const fetchedUsername = response.data?.session?.name as string | undefined;
		const sessionKey = response.data?.session?.key as string | undefined;

		if (!fetchedUsername || !sessionKey) {
			return {
				ok: false,
				message: isFrench
					? `${client.iHorizon_Emojis.No} | Last.fm n'a pas retourné de session valide.`
					: `${client.iHorizon_Emojis.No} | Last.fm did not return a valid session.`
			};
		}

		const table = await this.getProfileTable();
		await table.set(`${userId}.lastfm`, {
			connectedAt: Date.now(),
			enabled: true,
			sessionKey: encrypt(this.getEncryptionSecret(), sessionKey),
			username: fetchedUsername
		} satisfies DatabaseStructure.LastFMUserSchema);

		return {
			ok: true,
			message: isFrench
				? `${client.iHorizon_Emojis.Yes} | Votre compte Last.fm est maintenant connecté et le scrobbling est activé.`
				: `${client.iHorizon_Emojis.Yes} | Your Last.fm account is now connected and scrobbling has been enabled.`,
			username: fetchedUsername
		};
	}

	public async generateUserEmbed(userId: string, userLabel: string, isFrench: boolean): Promise<EmbedBuilder> {
		const settings = await this.getUserSettings(userId);
		const embed = new EmbedBuilder()
			.setColor(2829617)
			.setTitle(isFrench ? `Configuration Last.fm de ${userLabel}` : `${userLabel}'s Last.fm configuration`)
			.addFields(
				{
					inline: true,
					name: isFrench ? 'Statut' : 'Status',
					value: settings?.enabled ? (isFrench ? 'Activé' : 'Enabled') : (isFrench ? 'Désactivé' : 'Disabled')
				},
				{
					inline: true,
					name: isFrench ? 'Compte connecté' : 'Connected account',
					value: settings?.username || (isFrench ? 'Aucun' : 'None')
				}
			);

		if (settings?.connectedAt) {
			embed.addFields({
				inline: true,
				name: isFrench ? 'Connecté le' : 'Connected on',
				value: `<t:${Math.floor(settings.connectedAt / 1000)}:F>`
			});
		}

		return embed;
	}

	public async handleTrackStart(player: Player, track: Track | null): Promise<void> {
		if (!track) return;

		this.clearGuildSession(player.guildId);

		const guild = await client.guilds.fetch(player.guildId).catch(() => null);
		if (!guild) return;

		const voiceChannel = await guild.channels.fetch(player.voiceChannelId || '').catch(() => null);
		if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) return;

		const session: LastFMGuildPlaybackSession = {
			guildId: player.guildId,
			listeners: new Map(),
			paused: player.paused,
			track: this.normalizeTrack(track),
			trackKey: this.getTrackKey(track),
			voiceChannelId: voiceChannel.id
		};

		this.guildSessions.set(player.guildId, session);
		await this.syncMembersWithVoiceChannel(session);
	}

	public async handleTrackEnd(player: Player, track: Track | null, reason: TrackEndReason): Promise<void> {
		const session = this.guildSessions.get(player.guildId);
		if (!session) return;

		for (const listener of session.listeners.values()) {
			if (reason !== 'loadFailed') {
				await this.tryScrobbleListener(session, listener, true);
			}
			this.clearListenerTimeout(listener);
		}

		this.guildSessions.delete(player.guildId);
	}

	public async handleQueueEnd(player: Player): Promise<void> {
		this.clearGuildSession(player.guildId);
	}

	public async handlePlayerMove(player: Player, newVoiceChannelId: string): Promise<void> {
		const session = this.guildSessions.get(player.guildId);
		if (!session) return;

		session.voiceChannelId = newVoiceChannelId;
		await this.syncMembersWithVoiceChannel(session);
	}

	public async handlePlayerUpdate(oldPlayerJson: PlayerJson, newPlayer: Player): Promise<void> {
		const session = this.guildSessions.get(newPlayer.guildId);
		if (!session || oldPlayerJson.paused === newPlayer.paused) return;

		session.paused = newPlayer.paused;

		if (newPlayer.paused) {
			for (const listener of session.listeners.values()) {
				this.clearListenerTimeout(listener);
				listener.pausedStartedAt = Date.now();
			}
			return;
		}

		for (const listener of session.listeners.values()) {
			if (listener.pausedStartedAt) {
				listener.pausedDurationMs += Date.now() - listener.pausedStartedAt;
				listener.pausedStartedAt = undefined;
			}
			this.scheduleScrobble(session, listener);
		}
	}

	public async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
		const member = newState.member || oldState.member;
		if (!member || member.user.bot) return;

		const session = this.guildSessions.get(oldState.guild.id);
		if (!session) return;

		const wasInTrackedChannel = oldState.channelId === session.voiceChannelId;
		const isInTrackedChannel = newState.channelId === session.voiceChannelId;

		if (!wasInTrackedChannel && isInTrackedChannel) {
			await this.attachMemberToSession(session, member);
		} else if (wasInTrackedChannel && !isInTrackedChannel) {
			await this.detachMemberFromSession(session, member.id);
		}
	}

	private async getProfileTable() {
		return profilTable || await client.db.table('user_profil');
	}

	private getEncryptionSecret(): string {
		return client.config.api.apiToken || this.sharedSecret;
	}

	private getTrackKey(track: Track): string {
		return [track.encoded, track.info.identifier, track.info.uri, track.info.title, track.info.author].filter(Boolean).join(':');
	}

	private normalizeTrack(track: Track): LastFMTrackData {
		const pluginInfo = (track as any).pluginInfo as { albumName?: string } | undefined;

		return {
			album: pluginInfo?.albumName,
			artist: track.info.author,
			durationMs: track.info.isStream ? 0 : track.info.duration,
			title: track.info.title,
			url: track.info.uri
		};
	}

	private shouldScrobble(track: LastFMTrackData): boolean {
		return track.durationMs >= 30_000;
	}

	private getThresholdMs(track: LastFMTrackData): number {
		return Math.min(track.durationMs / 2, 240_000);
	}

	private clearListenerTimeout(listener: LastFMListenerSession): void {
		if (listener.timeout) {
			clearTimeout(listener.timeout);
			listener.timeout = undefined;
		}
	}

	private clearGuildSession(guildId: string): void {
		const session = this.guildSessions.get(guildId);
		if (!session) return;

		for (const listener of session.listeners.values()) {
			this.clearListenerTimeout(listener);
		}

		this.guildSessions.delete(guildId);
	}

	private getElapsedListeningMs(listener: LastFMListenerSession): number {
		const currentPauseDuration = listener.pausedStartedAt ? Date.now() - listener.pausedStartedAt : 0;
		return Date.now() - listener.startedAt - listener.pausedDurationMs - currentPauseDuration;
	}

	private async syncMembersWithVoiceChannel(session: LastFMGuildPlaybackSession): Promise<void> {
		const guild = await client.guilds.fetch(session.guildId).catch(() => null);
		if (!guild) return;

		const voiceChannel = await guild.channels.fetch(session.voiceChannelId).catch(() => null);
		if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) return;

		for (const userId of session.listeners.keys()) {
			if (!voiceChannel.members.has(userId)) {
				await this.detachMemberFromSession(session, userId);
			}
		}

		for (const member of voiceChannel.members.values()) {
			if (!member.user.bot && !session.listeners.has(member.id)) {
				await this.attachMemberToSession(session, member);
			}
		}
	}

	private async attachMemberToSession(session: LastFMGuildPlaybackSession, member: GuildMember): Promise<void> {
		if (session.listeners.has(member.id)) return;

		const auth = await this.getDecryptedUserSession(member.id);
		if (!auth || !auth.enabled) return;

		const listener: LastFMListenerSession = {
			pausedDurationMs: 0,
			pausedStartedAt: session.paused ? Date.now() : undefined,
			scrobbled: false,
			sessionKey: auth.sessionKey,
			startedAt: Date.now(),
			thresholdMs: this.getThresholdMs(session.track),
			userId: member.id,
			username: auth.username
		};

		const nowPlaying = await this.updateNowPlaying(listener, session.track);
		if (!nowPlaying.ok && this.isInvalidSessionError(nowPlaying)) {
			await this.invalidateUserSession(member.id);
			return;
		}

		session.listeners.set(member.id, listener);
		this.scheduleScrobble(session, listener);
	}

	private async detachMemberFromSession(session: LastFMGuildPlaybackSession, userId: string): Promise<void> {
		const listener = session.listeners.get(userId);
		if (!listener) return;

		await this.tryScrobbleListener(session, listener, true);
		this.clearListenerTimeout(listener);
		session.listeners.delete(userId);
	}

	private scheduleScrobble(session: LastFMGuildPlaybackSession, listener: LastFMListenerSession): void {
		this.clearListenerTimeout(listener);

		if (!this.shouldScrobble(session.track) || listener.scrobbled) {
			return;
		}

		const remaining = listener.thresholdMs - this.getElapsedListeningMs(listener);
		if (remaining <= 0) {
			void this.tryScrobbleListener(session, listener, true);
			return;
		}

		listener.timeout = setTimeout(() => {
			void this.tryScrobbleListener(session, listener, false);
		}, remaining);
	}

	private async tryScrobbleListener(
		session: LastFMGuildPlaybackSession,
		listener: LastFMListenerSession,
		finalize: boolean
	): Promise<boolean> {
		if (listener.scrobbled || !this.shouldScrobble(session.track)) {
			return false;
		}

		if (!finalize) {
			const activeSession = this.guildSessions.get(session.guildId);
			if (!activeSession || activeSession.trackKey !== session.trackKey) {
				return false;
			}

			const isStillInChannel = await this.isMemberInVoiceChannel(session.guildId, session.voiceChannelId, listener.userId);
			if (!isStillInChannel) {
				return false;
			}
		}

		if (this.getElapsedListeningMs(listener) < listener.thresholdMs) {
			if (!finalize) {
				this.scheduleScrobble(session, listener);
			}
			return false;
		}

		const response = await this.scrobbleTrack(listener, session.track);
		if (!response.ok) {
			if (this.isInvalidSessionError(response)) {
				await this.invalidateUserSession(listener.userId);
			} else {
				logger.err(`[LastFM] Failed to scrobble for ${listener.userId}: ${response.message}`);
			}
			return false;
		}

		listener.scrobbled = true;
		this.clearListenerTimeout(listener);
		return true;
	}

	private async isMemberInVoiceChannel(guildId: string, voiceChannelId: string, userId: string): Promise<boolean> {
		const guild = await client.guilds.fetch(guildId).catch(() => null);
		if (!guild) return false;

		const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
		return member?.voice.channelId === voiceChannelId;
	}

	private async getDecryptedUserSession(userId: string): Promise<(DatabaseStructure.LastFMUserSchema & { sessionKey: string; username: string; }) | null> {
		const settings = await this.getUserSettings(userId);

		if (!settings?.sessionKey || !settings.username) {
			return null;
		}

		const decryptedSessionKey = decrypt(this.getEncryptionSecret(), settings.sessionKey);
		if (!decryptedSessionKey) {
			await this.invalidateUserSession(userId);
			return null;
		}

		return {
			...settings,
			sessionKey: decryptedSessionKey,
			username: settings.username
		};
	}

	private async invalidateUserSession(userId: string): Promise<void> {
		const settings = await this.getUserSettings(userId);
		if (!settings) return;

		const table = await this.getProfileTable();
		await table.set(`${userId}.lastfm`, {
			connectedAt: settings.connectedAt,
			enabled: false,
			username: settings.username
		} satisfies DatabaseStructure.LastFMUserSchema);
	}

	private isInvalidSessionError(response: LastFMApiResponse): boolean {
		return response.errorCode === 9 || /session/i.test(response.message || '');
	}

	private formatApiError(response: LastFMApiResponse, isFrench: boolean, context: 'login' | 'nowPlaying' | 'scrobble'): string {
		const prefix = context === 'login'
			? (isFrench ? 'Connexion Last.fm impossible' : 'Unable to connect to Last.fm')
			: context === 'nowPlaying'
				? (isFrench ? 'Impossible de notifier le Now Playing à Last.fm' : 'Unable to notify Last.fm about now playing')
				: (isFrench ? 'Impossible de scrobbler ce morceau' : 'Unable to scrobble this track');

		return `${client.iHorizon_Emojis.No} | ${prefix}: ${response.message || (isFrench ? 'erreur inconnue' : 'unknown error')}`;
	}

	private async updateNowPlaying(listener: LastFMListenerSession, track: LastFMTrackData): Promise<LastFMApiResponse> {
		return this.callLastFM('track.updateNowPlaying', {
			album: track.album,
			artist: track.artist,
			duration: track.durationMs > 0 ? Math.floor(track.durationMs / 1000).toString() : undefined,
			sk: listener.sessionKey,
			track: track.title
		});
	}

	private async scrobbleTrack(listener: LastFMListenerSession, track: LastFMTrackData): Promise<LastFMApiResponse> {
		return this.callLastFM('track.scrobble', {
			album: track.album,
			artist: track.artist,
			chosenByUser: '1',
			duration: track.durationMs > 0 ? Math.floor(track.durationMs / 1000).toString() : undefined,
			sk: listener.sessionKey,
			timestamp: Math.floor(listener.startedAt / 1000).toString(),
			track: track.title
		});
	}

	private async callLastFM(method: string, params: Record<string, string | undefined>): Promise<LastFMApiResponse> {
		if (!this.isConfigured()) {
			return {
				errorCode: -1,
				message: 'Last.fm credentials are missing.',
				ok: false
			};
		}

		const signedParams: Record<string, string> = {
			api_key: this.apiKey,
			method,
		};

		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined && value !== null && value !== '') {
				signedParams[key] = value;
			}
		}

		const apiSig = this.createApiSignature(signedParams);
		const body = new URLSearchParams({
			...signedParams,
			api_sig: apiSig,
			format: 'json'
		});

		try {
			const response = await fetch(this.apiUrl, {
				body,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				method: 'POST'
			});

			const rawBody = await response.text();
			const payload = rawBody ? JSON.parse(rawBody) : {};

			if (!response.ok || payload.error) {
				return {
					errorCode: payload.error ? Number(payload.error) : response.status,
					message: payload.message || response.statusText,
					ok: false
				};
			}

			return {
				data: payload,
				ok: true
			};
		} catch (error) {
			logger.err(`[LastFM] ${method} request failed: ${error}`);
			return {
				message: error instanceof Error ? error.message : String(error),
				ok: false
			};
		}
	}

	private createApiSignature(params: Record<string, string>): string {
		const payload = Object.keys(params)
			.sort((a, b) => a.localeCompare(b))
			.map(key => `${key}${params[key]}`)
			.join('');

		return createHash('md5')
			.update(payload + this.sharedSecret, 'utf8')
			.digest('hex');
	}
}
