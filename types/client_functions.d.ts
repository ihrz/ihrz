/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import type { DatabaseStructure } from './database_structure.d.ts';
import type { LanguageData } from './languageData.d.ts';
import type { GatewayMethod } from '../src/core/functions/apiUrlParser.js';
import { ModalOptionsBuilder } from '../src/core/functions/modalHelper.js';
import { AnySelectMenuInteraction, APIModalInteractionResponseCallbackData, AutocompleteInteraction, BaseGuildTextChannel, BaseGuildVoiceChannel, ButtonBuilder, ButtonInteraction, CacheType, Channel, ChatInputCommandInteraction, Client, EmbedBuilder, Guild, GuildMember, Interaction, InteractionReplyOptions, Message, MessageContextMenuCommandInteraction, MessageEditOptions, MessageReplyOptions, ModalSubmitInteraction, PrimaryEntryPointCommandInteraction, Role, StringSelectMenuInteraction, User, UserContextMenuCommandInteraction, VoiceBasedChannel } from 'discord.js';
import { Assets } from './assets.js';
import { LangForPrompt } from '../src/core/functions/awaitingResponse.js';
import { AuthRestore_EntryType, AuthRestore_ResponseType, GuildAuthRestore, AuthRestore_ForceJoin_EntryType, AuthRestore_ForceJoin_ResponseType, AuthRestore_KeyUpdate_EntryType, AuthRestore_RoleUpdate_EntryType, Oauth2_Link_Entry } from '../src/core/functions/authRestoreHelper.ts';
import { Command } from './command.js';
import { Option } from './option.js';
import { PasswordOptions } from '../src/core/functions/random.ts';
import { command, PermissionValue } from '../src/core/functions/permissonsCalculator.ts';
import { DetailedGuildData, GuildData } from '../src/core/functions/shard_helper.ts';
import { BatchProcessorOptions, BatchProcessorResult } from '../src/core/functions/batchProcessor.ts';
import { Sqlite } from '../src/core/database/driver/sqlite.ts';
import { Json } from '../src/core/database/driver/json.ts';
import { Memory } from '../src/core/database/driver/memory.ts';
import { Postgres } from '../src/core/database/driver/postgres.ts';
import { Horizon } from '../src/core/database/driver/horizon.ts';
import { TrackEmbbeded } from '../src/core/functions/music_proximity.ts';
import { LyricsResult, SearchResult, Track } from "lavalink-client";

declare namespace Client_Functions {

	// From emojiChecker.ts
	export namespace emojiChecker {
		export function isSingleEmoji(text: string): boolean;
		export function isDiscordEmoji(text: string): boolean;
	}

	// From modalHelper.ts
	export namespace modalHelper {
		export function iHorizonModalBuilder(modalOptions: ModalOptionsBuilder): APIModalInteractionResponseCallbackData;
		export function iHorizonModalResolve(
			modalOptions: ModalOptionsBuilder,
			interaction: ChatInputCommandInteraction<CacheType> | MessageContextMenuCommandInteraction<CacheType> | UserContextMenuCommandInteraction<CacheType> | PrimaryEntryPointCommandInteraction<CacheType> | AnySelectMenuInteraction<CacheType> | ButtonInteraction<CacheType> | AutocompleteInteraction<CacheType> | ModalSubmitInteraction<CacheType>
		): Promise<ModalSubmitInteraction<"cached"> | undefined>;
	}

	// From random.ts
	export namespace random {
		export function generatePassword(options: PasswordOptions): string;
		export function generateMultiplePasswords(amount: number, options: PasswordOptions): Array<string>;
	}

	// From date_and_time.ts
	export function date_and_time(date: number | Date, formatString: string): string;

	// From permissonsCalculator.ts
	export namespace permissonsCalculator {
		export function checkCommandPermission(
			interaction: ChatInputCommandInteraction<"cached"> | Message<boolean>,
			command: string
		): Promise<{ allowed: boolean; permissionData: command; }>;
		export function checkUserPermissions(member: GuildMember): Promise<0 | DatabaseStructure.PermLevel>;
		export function sendErrorMessage(
			interaction: ChatInputCommandInteraction<"cached"> | Message<boolean>,
			lang: LanguageData,
			permissionData: { users: string[]; roles: string[]; level: number; }
		): Promise<Message<boolean>>;
		export function getPermissionByValue(value: bigint | Array<bigint>): PermissionValue | Array<PermissionValue> | null;
	}

	// From method.ts
	export namespace method {
		export function isNumber(str: string): boolean;
		export function user(message: Message<boolean>, args: Array<string>, argsNumber: number): Promise<User | null>;
		export function member(message: Message<boolean>, args: Array<string>, argsNumber: number): GuildMember | null;
		export function voiceChannel(interaction: Message<boolean>, args: Array<string>, argsNumber: number): Promise<BaseGuildVoiceChannel | null>;
		export function channel(interaction: Message<boolean>, args: Array<string>, argsNumber: number): Promise<Channel | null>;
		export function role(interaction: Message<boolean>, args: Array<string>, argsNumber: number): Role | null;
		export function string(args: Array<string>, argsNumber: number): string | null;
		export function longString(args: Array<string>, argsNumber: number): string | null;
		export function number(args: Array<string>, argsNumber: number): number;
		export function getArgumentOptionNameWithOptions(o: Option): string;
		export function stringifyOption(option: Array<Option>): string;
		export function boldStringifyOption(option: Array<Option>): string;
		export function createAwesomeEmbed(
			lang: LanguageData,
			command: Command,
			client: Client<boolean>,
			interaction: ChatInputCommandInteraction<"cached"> | Message<boolean>
		): Promise<EmbedBuilder>;
		export function checkCommandArgs(
			message: Message<boolean>,
			command: Command,
			args: Array<string>,
			lang: LanguageData
		): Promise<boolean>;
		export function interactionSend(
			interaction: ChatInputCommandInteraction<CacheType> | ChatInputCommandInteraction<"cached"> | Message<boolean>,
			options: string | MessageReplyOptions | MessageEditOptions | InteractionReplyOptions
		): Promise<Message<boolean>>;
		export function channelSend(
			interaction: string | ChatInputCommandInteraction<"cached"> | Message<boolean> | AnySelectMenuInteraction<"cached"> | BaseGuildTextChannel,
			options: string | MessageReplyOptions | MessageEditOptions
		): Promise<Message<boolean>>;
		export function reply(message: Message<boolean>, options: string | MessageReplyOptions): Promise<Message<boolean>>;
		export function hasSubCommand(options: Array<Option> | undefined): boolean;
		export function hasSubCommandGroup(options: Array<Option> | undefined): boolean;
		export function isSubCommand(option: Option | Command): boolean;
		export function derank(user: GuildMember, reason?: string): Promise<void>;
		export function punish(data: DatabaseStructure.ProtectionData, user: GuildMember, reason?: string): Promise<void>;
		export function generateCustomMessagePreview(
			message: string,
			input: { guild: Guild; user: User; guildLocal: string; inviter?: { user: { username: string; mention: string; }; invitesAmount: number; }; ranks?: { level: number; }; notifier?: { artistAuthor: string; artistLink: string; mediaURL: string; }; }
		): string;
		export function findOptionRecursively(options: Array<Option>, subcommandName: string): Option | undefined;
		export function buttonReact(msg: Message<boolean>, button: ButtonBuilder): Promise<Message<boolean>>;
		export function buttonUnreact(msg: Message<boolean>, buttonEmoji: string): Promise<Message<boolean>>;
		export function isAnimated(attachmentUrl: string): boolean;
		export function warnMember(author: GuildMember, member: GuildMember, reason: string): Promise<string>;
		export function getDangerousPermissions(lang: LanguageData): Array<{ flag: bigint; name: string; }>;
		export function addCoins(member: GuildMember, coins: number): Promise<void>;
		export function subCoins(member: GuildMember, coins: number): Promise<void>;
		export function isTicketChannel(channel: BaseGuildTextChannel): Promise<boolean>;
		export function deleteTicketChannelFromDatabase(channel: BaseGuildTextChannel): Promise<boolean>;
		export function isValidDiscordInvite(input: string): boolean;
		export function isValidDiscordInviteCode(VanityCode: string): any;
	}

	// From getLanguageData.ts
	export function getLanguageData(arg: string | null | undefined): Promise<LanguageData>;

	// From batchProcessor.ts
	export namespace batchProcessor {
		export function processBatch<T>(
			items: Array<T>,
			processor: (item: T) => Promise<boolean>,
			options: BatchProcessorOptions
		): Promise<BatchProcessorResult>;
		export function processBatchAsync<T>(
			items: Array<T>,
			processor: (item: T) => Promise<boolean>,
			options: BatchProcessorOptions,
			onComplete?: (result: BatchProcessorResult) => void
		): void;
	}

	// From wait.ts
	export function wait(milliseconds: number): Promise<void>;

	// From html2png.ts
	export function html2png(
		code: string,
		options: { width?: number; height?: number; scaleSize?: number; elementSelector?: string; omitBackground: boolean; selectElement: boolean; }
	): Promise<Buffer<ArrayBufferLike>>;

	// From prefix.ts
	export namespace prefix {
		export function guildPrefix(client: Client<boolean>, guildId: string): Promise<{ type: "prefix" | "mention"; string: string; }>;
		export function defaultPrefix(client: Client<boolean>): { type: "prefix" | "mention"; string: string; };
	}

	// From maskLink.ts
	export function maskLink(input: string): string;

	// From awaitingResponse.ts
	export function awaitingResponse(
		interaction: ChatInputCommandInteraction<"cached"> | Message<boolean>,
		opt: LangForPrompt
	): Promise<boolean>;

	// From numberBeautifuer.ts
	export function numberBeautifuer(num: number): string;

	// From apiUrlParser.ts
	export namespace apiUrlParser {
		export function assetsFinder(body: Assets, type: string): string;
		export function HorizonGateway(gateway_method: GatewayMethod): string;
	}

	// From sanitizer.ts
	export function sanitizer(text: string | undefined): string;

	// From userStatsUtils.ts
	export namespace userStatsUtils {
		export function calculateMessageTime(
			msg: DatabaseStructure.StatsMessage,
			nowTimestamp: number,
			dailyTimeout: number,
			weeklyTimeout: number,
			monthlyTimeout: number,
			dailyMessages: Array<DatabaseStructure.StatsMessage>,
			weeklyMessages: Array<DatabaseStructure.StatsMessage>,
			monthlyMessages: Array<DatabaseStructure.StatsMessage>
		): { dailyMessages: DatabaseStructure.StatsMessage[]; weeklyMessages: DatabaseStructure.StatsMessage[]; monthlyMessages: DatabaseStructure.StatsMessage[]; };
		export function calculateVoiceActivity(
			voice: DatabaseStructure.StatsVoice,
			nowTimestamp: number,
			dailyTimeout: number,
			weeklyTimeout: number,
			monthlyTimeout: number,
			dailyVoiceActivity: number,
			weeklyVoiceActivity: number,
			monthlyVoiceActivity: number
		): { dailyVoiceActivity: number; weeklyVoiceActivity: number; monthlyVoiceActivity: number; };
		export function calculateActiveChannels(messages: Array<DatabaseStructure.StatsMessage>): { firstActiveChannel: string; secondActiveChannel: string; thirdActiveChannel: string; };
		export function calculateActiveVoiceChannels(voices: Array<DatabaseStructure.StatsVoice>): { firstActiveVoiceChannel: string; secondActiveVoiceChannel: string; thirdActiveVoiceChannel: string; };
		export function getChannelName(guild: Guild, channelId: string): string;
		export function getChannelMessagesCount(channelId: string, messages: Array<DatabaseStructure.StatsMessage>): number;
		export function getChannelMinutesCount(channelId: string, voices: Array<DatabaseStructure.StatsVoice>): number;
		export function getStatsLeaderboard(
			data: Array<{ member: User | undefined; dailyMessages: number; weeklyMessages: number; monthlyMessages: number; dailyVoiceActivity: number; weeklyVoiceActivity: number; monthlyVoiceActivity: number; }>
		): Array<{ member: User | undefined; dailyMessages: number; weeklyMessages: number; monthlyMessages: number; dailyVoiceActivity: number; weeklyVoiceActivity: number; monthlyVoiceActivity: number; }>;
	}

	// From leashModuleHelper.ts
	export namespace leashModuleHelper {
		export function isInVoiceChannel(member: GuildMember): boolean;
		export function getDomSubVoiceChannel(member: GuildMember): VoiceBasedChannel | null;
	}

	// From authRestoreHelper.ts
	export namespace authRestoreHelper {
		export function createOauth2LinkWithGuild(data: AuthRestore_EntryType): string;
		export function createOauth2LinkWithoutGuild(data: Oauth2_Link_Entry): string;
		export function createAuthRestore(data: AuthRestore_EntryType): Promise<AuthRestore_ResponseType>;
		export function getGuildDataPerSecretCode(secretCode: string): Promise<{ id: string; data: GuildAuthRestore; } | null>;
		export function forceJoinAuthRestore(data: AuthRestore_ForceJoin_EntryType): Promise<AuthRestore_ForceJoin_ResponseType>;
		export function securityCodeUpdate(data: AuthRestore_KeyUpdate_EntryType): Promise<AuthRestore_ForceJoin_ResponseType>;
		export function changeRoleAuthRestore(data: AuthRestore_RoleUpdate_EntryType): Promise<AuthRestore_ForceJoin_ResponseType>;
	}

	// From mediaManipulation.ts
	export namespace mediaManipulation {
		export function convertToPng(buffer: Buffer<ArrayBufferLike>): Promise<Buffer<ArrayBufferLike>>;
		export function adjustImageQuality(imagePath: string): Promise<void>;
		export function resizeImage(
			inputImage: Buffer<ArrayBufferLike>,
			outputPath: string,
			width?: number,
			height?: number
		): Promise<{ width: number; height: number; }>;
		export function isImageUrl(url: string): Promise<boolean>;
	}

	// From encryptDecryptMethod.ts
	export namespace encryptDecryptMethod {
		export function encrypt(password: string, text: string): string;
		export function decrypt(password: string, data: string): string | undefined;
	}

	// From assetsCalc.ts
	export function assetsCalc(client: Client<boolean>): Promise<void>;

	// From shard_helper.ts
	export namespace shard_helper {
		export function getGuildData(client: Client<boolean>, guildId: string): Promise<GuildData | null>;
		export function getDetailedGuildData(client: Client<boolean>, guildId: string): Promise<DetailedGuildData | null>;
	}

	// From music_proximity.ts
	export namespace music_proximity {
		export function levenshtein(a: string, b: string): number;
		export function similarity(a: string, b: string): number;
		export function isSimilar(query: string, track: TrackEmbbeded, threshold: any): boolean;
	}

	// From customProfileHelper.ts
	export namespace customProfileHelper {
		export function changeGuildBotName(guild: Guild, nick: string): Promise<boolean>;
		export function changeGuildBotBanner(guild: Guild, banner: string): Promise<boolean>;
		export function changeGuildBotAvatar(guild: Guild, avatar: string): Promise<boolean>;
		export function changeGuildBotBio(guild: Guild, bio: string): Promise<boolean>;
	}

	// From database_latency.ts
	export function database_latency(): Promise<number>;

	// From displayBotName.ts
	export namespace displayBotName {
		export function footerBuilder(guildId: string): Promise<{ text: string; iconURL: string; }>;
		export function footerAttachmentBuilder(
			entry?: Interaction | ChatInputCommandInteraction<"cached"> | Message<boolean> | GuildMember | Guild
		): Promise<{ attachment: string | Buffer<ArrayBuffer>; name: string; }>;
		export function displayBotPP(guildId?: string): Promise<{ type: 1 | 2; string: string; }>;
	}

	// From economyHelper.ts
	export namespace economyHelper {
		export function getMemberBoost(member: GuildMember): Promise<number>;
		export function generateRoleFields(
			roleData: Record<string, DatabaseStructure.EconomyRole> | undefined,
			lang: LanguageData
		): any;
	}

	// From embedHelper.ts
	export namespace embedHelper {
		export function isValidLink(url: string): boolean;
		export function isValidColor(color: string): boolean;
		export function getMediaByMessage(message: Message<boolean>): { name: string; attachment: string; };
	}

	// From generateProgressBar.ts
	export function generateProgressBar(emojis: any, currentTimeMs: number, totalTimeMs: number): { bar: string; currentTime: string; totalTime: string; };

	// From getIp.ts
	export function getIp(useIPv6?: boolean): Promise<string>;

	// From getMessageURL.ts
	export function getMessageURL(guildId: string, channelId: string, messageId: string): string;

	// From helper.ts
	export namespace helper {
		export function coolDown(message: Message<boolean>, method: string, ms: number): Promise<boolean>;
		export function hardCooldown(
			database: Sqlite<any> | Json<any> | Memory<any> | Postgres<any> | Horizon,
			method: string,
			ms: number
		): Promise<boolean>;
		export function capitalizeFirstLetter(string: string): string;
	}

	// From ihorizon_logs.ts
	export function ihorizon_logs(
		interaction: ChatInputCommandInteraction<"cached"> | Message<boolean>,
		embed: { title: string; description: string; }
	): Promise<void>;

	// From image64.ts
	export namespace image64 {
		export function isImageUrl(url: string): Promise<boolean>;
		export function image64(arg: string): Promise<Buffer<ArrayBufferLike> | undefined>;
	}

	// From image_dominant_color.ts
	export function image_dominant_color(input: string | Buffer<ArrayBufferLike>): Promise<{ color1: string; color2: string; }>;

	// From isAllowedLinks.ts
	export function isAllowedLinks(link: string): boolean;

	// From os_utils.ts
	export namespace os_utils {
		export function niceBytes(kb: number): any;
		export function getMemoryInfo(): Promise<{ MemTotal: number; MemFree: number; MemAvailable: number; }>;
	}

	// From searchLyrics.ts
	export function searchLyrics(query: string, author?: User): Promise<{ track: Track | undefined; res: LyricsResult; } | null>;

	// From tagHelper.ts
	export function tagHelper(
		interaction: ChatInputCommandInteraction<"cached"> | Message<boolean>,
		lang: LanguageData,
		tag_id: string,
		tag: DatabaseStructure.TagInfo
	): EmbedBuilder;

	// From validImageType.ts
	export function validImageType(contentType: string | null): boolean;
}

export { Client_Functions };
