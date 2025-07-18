/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

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
import type { ClusterMethod, GatewayMethod } from '../src/core/functions/apiUrlParser.js';
import { ModalOptionsBuilder } from '../src/core/functions/modalHelper.js';
import { AnySelectMenuInteraction, APIModalInteractionResponseCallbackData, AutocompleteInteraction, BaseGuildTextChannel, BaseGuildVoiceChannel, ButtonBuilder, ButtonInteraction, CacheType, Channel, ChatInputCommandInteraction, Client, EmbedBuilder, Guild, GuildMember, Interaction, InteractionReplyOptions, Message, MessageContextMenuCommandInteraction, MessageEditOptions, MessageReplyOptions, ModalSubmitInteraction, PrimaryEntryPointCommandInteraction, Role, StringSelectMenuInteraction, User, UserContextMenuCommandInteraction, VoiceBasedChannel } from 'discord.js';
import { Assets } from './assets.js';
import { LangForPrompt } from '../src/core/functions/awaitingResponse.js';
import { AuthRestore_EntryType, AuthRestore_ResponseType, GuildAuthRestore, AuthRestore_ForceJoin_EntryType, AuthRestore_ForceJoin_ResponseType, AuthRestore_KeyUpdate_EntryType, AuthRestore_RoleUpdate_EntryType, Oauth2_Link_Entry } from '../src/core/functions/authRestoreHelper.ts';
import { Command } from './command.js';
import { Option } from './option.js';
import { PasswordOptions } from '../src/core/functions/random.ts';
import { command } from '../src/core/functions/permissonsCalculator.ts';
import { DetailedGuildData, GuildData } from '../src/core/functions/shard_helper.ts';
import { BatchProcessorOptions, BatchProcessorResult } from '../src/core/functions/batchProcessor.ts';
import { PallasDB } from 'pallas-db';

declare namespace Client_Functions {

	// From colors.ts
	export namespace colors {
	}

	// From axios.ts
	export namespace axios {
	}

	// From encryptDecryptMethod.ts
	export namespace encryptDecryptMethod {
		export function encrypt(k: string, text: string): string;
		export function decrypt(k: string, text: string): string | undefined;
	}

	// From getToken.ts
	export function getToken(): Promise<string | undefined>;

	// From date_and_time.ts
	export function date_and_time(date: number | Date, formatString: string): string;

	// From apiUrlParser.ts
	export namespace apiUrlParser {
		export function assetsFinder(body: Assets, type: string): string;
		export function OwnIhrzCluster(
			options: { cluster_number: number; cluster_method: ClusterMethod; bot_id?: string; discord_bot_token?: string; forceDatabaseSet?: boolean; }
		): string;
		export function HorizonGateway(gateway_method: GatewayMethod): string;
	}

	// From ms.ts
	export namespace ms {
	}

	// From assetsCalc.ts
	export function assetsCalc(client: Client<boolean>): Promise<void>;

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

	// From getLanguageData.ts
	export function getLanguageData(arg: string | null | undefined): Promise<LanguageData>;

	// From mediaManipulation.ts
	export namespace mediaManipulation {
		export function convertToPng(buffer: Buffer<ArrayBufferLike>): Promise<Buffer<ArrayBufferLike>>;
		export function adjustImageQuality(imagePath: string): any;
		export function resizeImage(
			inputImage: Buffer<ArrayBufferLike>,
			outputPath: string,
			width?: number,
			height?: number
		): any;
	}

	// From kdenliveManipulator.ts
	export namespace kdenliveManipulator {
	}

	// From numberBeautifuer.ts
	export function numberBeautifuer(num: number): string;

	// From awaitingResponse.ts
	export function awaitingResponse(
		interaction: ChatInputCommandInteraction<"cached"> | Message<boolean>,
		opt: LangForPrompt
	): any;

	// From authRestoreHelper.ts
	export namespace authRestoreHelper {
		export function createOauth2LinkWithGuild(data: AuthRestore_EntryType): string;
		export function createOauth2LinkWithoutGuild(data: Oauth2_Link_Entry): string;
		export function createAuthRestore(data: AuthRestore_EntryType): Promise<AuthRestore_ResponseType>;
		export function getGuildDataPerSecretCode(data: Array<{ id: string; value: any; }>, secretCode: string): { id: string; data: GuildAuthRestore; } | null;
		export function forceJoinAuthRestore(data: AuthRestore_ForceJoin_EntryType): Promise<AuthRestore_ForceJoin_ResponseType>;
		export function securityCodeUpdate(data: AuthRestore_KeyUpdate_EntryType): Promise<AuthRestore_ForceJoin_ResponseType>;
		export function changeRoleAuthRestore(data: AuthRestore_RoleUpdate_EntryType): Promise<AuthRestore_ForceJoin_ResponseType>;
	}

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
		): any;
		export function getPermissionByValue(value: bigint | Array<bigint>): any;
	}

	// From shard_helper.ts
	export namespace shard_helper {
		export function getGuildData(client: Client<boolean>, guildId: string): Promise<GuildData | null>;
		export function getDetailedGuildData(client: Client<boolean>, guildId: string): Promise<DetailedGuildData | null>;
	}

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

	// From sanitizer.ts
	export function sanitizer(text: string | undefined): string;

	// From image_dominant_color.ts
	export function image_dominant_color(input: string | Buffer<ArrayBufferLike>): Promise<string>;

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
		): any;
	}

	// From method.ts
	export namespace method {
		export function isNumber(str: string): boolean;
		export function user(interaction: Message<boolean>, args: Array<string>, argsNumber: number): Promise<User | null>;
		export function member(interaction: Message<boolean>, args: Array<string>, argsNumber: number): GuildMember | null;
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
			interaction: ChatInputCommandInteraction<"cached"> | Message<boolean> | AnySelectMenuInteraction<"cached"> | BaseGuildTextChannel,
			options: string | MessageReplyOptions | MessageEditOptions
		): Promise<Message<boolean>>;
		export function reply(message: Message<boolean>, options: string | MessageReplyOptions): Promise<Message<boolean>>;
		export function hasSubCommand(options: Array<Option> | undefined): boolean;
		export function hasSubCommandGroup(options: Array<Option> | undefined): boolean;
		export function isSubCommand(option: Option | Command): boolean;
		export function punish(data: any, user: GuildMember | undefined, reason?: string): any;
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
		export function isValidDiscordInvite(input: string): boolean;
	}

	// From leashModuleHelper.ts
	export namespace leashModuleHelper {
		export function isInVoiceChannel(member: GuildMember): any;
		export function getDomSubVoiceChannel(member: GuildMember): VoiceBasedChannel | null;
	}

	// From displayBotName.ts
	export namespace displayBotName {
		export function footerBuilder(guildId: string): any;
		export function footerAttachmentBuilder(
			entry?: Interaction | ChatInputCommandInteraction<"cached"> | Message<boolean> | GuildMember | Guild
		): any;
		export function displayBotPP(guildId?: string): Promise<{ type: 1 | 2; string: string; }>;
	}

	// From generateProgressBar.ts
	export function generateProgressBar(emojis: any, currentTimeMs: number, totalTimeMs: number): { bar: string; currentTime: string; totalTime: string; };

	// From getIp.ts
	export function getIp(useIPv6?: boolean): Promise<string>;

	// From helper.ts
	export namespace helper {
		export function coolDown(message: Message<boolean>, method: string, ms: number): any;
		export function hardCooldown(database: PallasDB, method: string, ms: number): any;
	}

	// From ihorizon_logs.ts
	export function ihorizon_logs(
		interaction: ChatInputCommandInteraction<"cached"> | Message<boolean>,
		embed: { title: string; description: string; }
	): any;

	// From image64.ts
	export namespace image64 {
		export function isImageUrl(url: string): Promise<boolean>;
		export function image64(arg: string): Promise<Buffer<ArrayBufferLike> | undefined>;
	}

	// From isAllowedLinks.ts
	export function isAllowedLinks(link: string): boolean;
}

export { Client_Functions };

 ;