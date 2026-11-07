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

import type { DatabaseStructure } from "./database_structure.d.ts";
import type { LanguageData } from "./languageData.d.ts";
import type { GatewayMethod } from "../src/core/functions/apiUrlParser.js";
import { ModalOptionsBuilder } from "../src/core/functions/modalHelper.js";
import {
	ActionRowBuilder,
	ActionRowData,
	AnySelectMenuInteraction,
	APIMessageTopLevelComponent,
	APIModalInteractionResponseCallbackData,
	Attachment,
	AutocompleteInteraction,
	BaseGuildTextChannel,
	BaseGuildVoiceChannel,
	ButtonBuilder,
	ButtonInteraction,
	CacheType,
	Channel,
	ChatInputCommandInteraction,
	Client,
	EmbedBuilder,
	Guild,
	GuildMember,
	Interaction,
	InteractionReplyOptions,
	JSONEncodable,
	Message,
	MessageActionRowComponentBuilder,
	MessageActionRowComponentData,
	MessageContextMenuCommandInteraction,
	MessageEditOptions,
	MessageReplyOptions,
	ModalSubmitInteraction,
	PrimaryEntryPointCommandInteraction,
	Role,
	StringSelectMenuInteraction,
	TopLevelComponentData,
	User,
	UserContextMenuCommandInteraction,
	VoiceBasedChannel
} from "discord.js";
import { Assets } from "./assets.js";
import { LangForPrompt } from "../src/core/functions/awaitingResponse.js";
import {
	AuthRestore_EntryType,
	AuthRestore_ResponseType,
	GuildAuthRestore,
	AuthRestore_ForceJoin_EntryType,
	AuthRestore_ForceJoin_ResponseType,
	AuthRestore_KeyUpdate_EntryType,
	AuthRestore_RoleUpdate_EntryType,
	Oauth2_Link_Entry
} from "../src/core/functions/authRestoreHelper.ts";
import { Command } from "./command.js";
import { Option } from "./option.js";
import { PasswordOptions } from "../src/core/functions/random.ts";
import {
	command,
	PermissionValue
} from "../src/core/functions/permissonsCalculator.ts";
import {
	CommunityGuildData,
	DetailedGuildData,
	GuildData
} from "../src/core/functions/shard_helper.ts";
import {
	BatchProcessorOptions,
	BatchProcessorResult
} from "../src/core/functions/batchProcessor.ts";
import { Sqlite } from "../src/core/database/driver/sqlite.ts";
import { Json } from "../src/core/database/driver/json.ts";
import { Memory } from "../src/core/database/driver/memory.ts";
import { Postgres } from "../src/core/database/driver/postgres.ts";
import { TrackEmbbeded } from "../src/core/functions/music_proximity.ts";
import {
	LavalinkNode,
	LyricsResult,
	SearchResult,
	Track
} from "lavalink-client";
import { components } from "../src/core/functions/method.ts";
import { Player } from "lavalink-client";
import { HandleMusicPlayOptions, SearchMusicQueryResult } from "./musicPlay";
import {
	BannerExtension,
	BannerSource,
	BannerUrlOptions
} from "../src/core/functions/bannerURL.ts";

declare namespace Client_Functions {
	// From apiUrlParser.ts
	export namespace apiUrlParser {
		export function HorizonGateway(gateway_method: GatewayMethod): string;
		export function HorizonGatewayInternal(
			gateway_method: GatewayMethod
		): string;
		export function assetsFinder(body: Assets, type: string): string;
	}

	// From assetsCalc.ts
	export function assetsCalc(client: Client<boolean>): Promise<void>;

	// From authRestoreHelper.ts
	export namespace authRestoreHelper {
		export function changeRoleAuthRestore(
			data: AuthRestore_RoleUpdate_EntryType
		): Promise<AuthRestore_ForceJoin_ResponseType>;
		export function createAuthRestore(
			data: AuthRestore_EntryType
		): Promise<AuthRestore_ResponseType>;
		export function createOauth2LinkWithGuild(
			data: AuthRestore_EntryType
		): string;
		export function createOauth2LinkWithoutGuild(
			data: Oauth2_Link_Entry
		): string;
		export function forceJoinAuthRestore(
			data: AuthRestore_ForceJoin_EntryType
		): Promise<AuthRestore_ForceJoin_ResponseType>;
		export function getGuildDataPerSecretCode(
			secretCode: string
		): Promise<{ id: string; data: GuildAuthRestore } | null>;
		export function securityCodeUpdate(
			data: AuthRestore_KeyUpdate_EntryType
		): Promise<AuthRestore_ForceJoin_ResponseType>;
	}

	// From awaitingResponse.ts
	export function awaitingResponse(
		interaction: ChatInputCommandInteraction<"cached"> | Message<boolean>,
		opt: LangForPrompt
	): Promise<boolean>;

	// From bannerGenerator.ts
	export function bannerGenerator(guildId: string | null): Promise<string>;

	// From bannerURL.ts
	export function bannerURL(
		target: GuildMember | User | Guild | BannerSource,
		options?: BannerUrlOptions
	): Promise<string | null>;

	// From batchProcessor.ts
	export namespace batchProcessor {
		export function processBatch<T>(
			items: Array<T>,
			processor: (item: T) => Promise<boolean>,
			options?: BatchProcessorOptions
		): Promise<BatchProcessorResult>;
		export function processBatchAsync<T>(
			items: Array<T>,
			processor: (item: T) => Promise<boolean>,
			options?: BatchProcessorOptions,
			onComplete?: (result: BatchProcessorResult) => void
		): void;
	}

	// From customProfileHelper.ts
	export namespace customProfileHelper {
		export function applyLanguageBio(
			guild: Guild,
			langCode: string
		): Promise<boolean>;
		export function changeGuildBotAvatar(
			guild: Guild,
			avatar: string
		): Promise<boolean>;
		export function changeGuildBotBanner(
			guild: Guild,
			banner: string
		): Promise<boolean>;
		export function changeGuildBotBio(
			guild: Guild,
			bio: string
		): Promise<boolean>;
		export function changeGuildBotName(
			guild: Guild,
			nick: string
		): Promise<boolean>;
	}

	// From database_latency.ts
	export function database_latency(): Promise<number>;

	// From date_and_time.ts
	export function date_and_time(
		date: number | Date,
		formatString: string
	): string;

	// From displayBotName.ts
	export namespace displayBotName {
		export function displayBotPP(
			guildId?: string
		): Promise<{ type: 1 | 2; string: string }>;
		export function footerAttachmentBuilder(
			entry?:
				| Interaction
				| GuildMember
				| ChatInputCommandInteraction<"cached">
				| Message<boolean>
				| Guild
		): Promise<{ attachment: string | Buffer<ArrayBuffer>; name: string }>;
		export function footerBuilder(
			guildId?: string | null | undefined
		): Promise<{ text: string; iconURL: string }>;
		export function footerPaginationBuilder(
			guildId: string,
			lang: LanguageData,
			page: number,
			maxPage: number
		): Promise<{ text: string; iconURL: string }>;
	}

	// From economyHelper.ts
	export namespace economyHelper {
		export function generateRoleFields(
			roleData: Record<string, DatabaseStructure.EconomyRole> | undefined,
			lang: LanguageData
		): Array<{
			name: string;
			value: string;
			amount: number;
			inline: boolean;
		}>;
		export function getMemberBoost(member: GuildMember): Promise<number>;
	}

	// From economyLogs.ts
	export namespace economyLogs {
		export function addMoney(
			guild: Guild,
			author: string,
			target: string,
			amount: number,
			lang: LanguageData
		): Promise<void>;
		export function boostModifying(
			guild: Guild,
			author: string,
			role: string,
			amount: number,
			lang: LanguageData
		): Promise<void>;
		export function config(
			guild: Guild,
			author: string,
			target: "on" | "off",
			lang: LanguageData
		): Promise<void>;
		export function deposit(
			guild: Guild,
			author: string,
			money: number,
			lang: LanguageData
		): Promise<void>;
		export function pay(
			guild: Guild,
			author: string,
			target: string,
			amount: number,
			lang: LanguageData
		): Promise<void>;
		export function removeMoney(
			guild: Guild,
			author: string,
			target: string,
			amount: number,
			lang: LanguageData
		): Promise<void>;
		export function rob(
			guild: Guild,
			author: string,
			target: string,
			amount: number,
			lang: LanguageData
		): Promise<void>;
		export function roleAdd(
			guild: Guild,
			author: string,
			role: string,
			amount: number,
			lang: LanguageData
		): Promise<void>;
		export function roleDelete(
			guild: Guild,
			author: string,
			role: string,
			lang: LanguageData
		): Promise<void>;
		export function setCooldown(
			guild: Guild,
			author: string,
			time: string,
			type: string,
			lang: LanguageData
		): Promise<void>;
		export function setMoney(
			guild: Guild,
			author: string,
			money: number,
			type: string,
			lang: LanguageData
		): Promise<void>;
		export function withdraw(
			guild: Guild,
			author: string,
			money: number,
			lang: LanguageData
		): Promise<void>;
	}

	// From embedHelper.ts
	export namespace embedHelper {
		export function getMediaByMessage(message: Message<boolean>): {
			name: string;
			attachment: string;
		};
		export function isValidColor(color: string): boolean;
		export function isValidEmbedId(id: unknown): boolean;
		export function isValidLink(url: string): boolean;
	}

	// From emojiChecker.ts
	export namespace emojiChecker {
		export function isDiscordEmoji(text: string): boolean;
		export function isSingleEmoji(text: string): boolean;
	}

	// From encryptDecryptMethod.ts
	export namespace encryptDecryptMethod {
		export function decrypt(
			password: string,
			data: string
		): string | undefined;
		export function encrypt(password: string, text: string): string;
	}

	// From generateProgressBar.ts
	export function generateProgressBar(
		emojis: any,
		currentTimeMs: number,
		totalTimeMs: number
	): { bar: string; currentTime: string; totalTime: string };

	// From getIp.ts
	export function getIp(useIPv6?: boolean): Promise<string>;

	// From getLanguageData.ts
	export function getLanguageData(
		arg: string | null | undefined
	): Promise<LanguageData>;

	// From getLanguageDataByCode.ts
	export function getLanguageDataByCode(
		locale: string
	): Promise<LanguageData>;

	// From getMessageURL.ts
	export function getMessageURL(
		guildId: string,
		channelId: string,
		messageId: string
	): string;

	// From hasIhorizonLogs.ts
	export function hasIhorizonLogs(guild: Guild): boolean;

	// From helper.ts
	export namespace helper {
		export function capitalizeFirstLetter(string: string): string;
		export function cooldown(
			authorId: string,
			method: string,
			ms: number
		): Promise<boolean>;
		export function getCooldownTimestamp(
			authorId: string,
			method: string
		): Promise<number | null>;
	}

	// From ihorizon_logs.ts
	export function ihorizon_logs(
		interaction: ChatInputCommandInteraction<"cached"> | Message<boolean>,
		embed: { title: string; description: string }
	): Promise<void>;

	// From image64.ts
	export namespace image64 {
		export function image64(
			arg: string
		): Promise<Buffer<ArrayBufferLike> | undefined>;
		export function isImageUrl(url: string): Promise<boolean>;
	}

	// From image_dominant_color.ts
	export function image_dominant_color(
		input: string | Buffer<ArrayBufferLike>
	): Promise<{ color1: string; color2: string }>;

	// From intentEnabler.ts
	export function intentEnabler(token: string): Promise<boolean>;

	// From isAllowedLinks.ts
	export function isAllowedLinks(link: string): boolean;

	// From leashModuleHelper.ts
	export namespace leashModuleHelper {
		export function getDomSubVoiceChannel(
			member: GuildMember
		): VoiceBasedChannel | null;
		export function isInVoiceChannel(member: GuildMember): boolean;
	}

	// From maskLink.ts
	export function maskLink(input: string): string;

	// From mediaManipulation.ts
	export namespace mediaManipulation {
		export function adjustImageQuality(imagePath: string): Promise<void>;
		export function convertToPng(
			buffer: Buffer<ArrayBufferLike>
		): Promise<Buffer<ArrayBufferLike>>;
		export function isImageUrl(url: string): Promise<boolean>;
		export function resizeImage(
			inputImage: Buffer<ArrayBufferLike>,
			outputPath: string,
			width?: number,
			height?: number
		): Promise<{ width: number; height: number }>;
	}

	// From method.ts
	export namespace method {
		export function addCoins(
			member: GuildMember,
			coins: number
		): Promise<void>;
		export function addTopggButonToTheActualComponents(
			current: ReadonlyArray<
				| JSONEncodable<APIMessageTopLevelComponent>
				| TopLevelComponentData
				| ActionRowData<
						| MessageActionRowComponentData
						| MessageActionRowComponentBuilder
				  >
				| APIMessageTopLevelComponent
			>
		): Promise<components>;
		export function boldStringifyOption(option: Array<Option>): string;
		export function buttonReact(
			msg: Message<boolean>,
			button: ButtonBuilder
		): Promise<Message<boolean>>;
		export function buttonUnreact(
			msg: Message<boolean>,
			buttonEmoji: string
		): Promise<Message<boolean>>;
		export function changeVoiceChannelStatus(
			channelId: string,
			status: string
		): Promise<boolean>;
		export function channel(
			interaction: Message<boolean>,
			args: Array<string>,
			argsNumber: number
		): Promise<Channel | null>;
		export function channelSend(
			interaction:
				| string
				| ChatInputCommandInteraction<"cached">
				| Message<boolean>
				| AnySelectMenuInteraction<"cached">
				| BaseGuildTextChannel,
			options: string | MessageReplyOptions | MessageEditOptions
		): Promise<Message<boolean>>;
		export function checkCommandArgs(
			message: Message<boolean>,
			command: Command,
			args: Array<string>,
			lang: LanguageData
		): Promise<boolean>;
		export function createAwesomeEmbed(
			lang: LanguageData,
			command: Command,
			client: Client<boolean>,
			interaction:
				ChatInputCommandInteraction<"cached"> | Message<boolean>
		): Promise<EmbedBuilder>;
		export function deleteTicketChannelFromDatabase(
			channel: BaseGuildTextChannel
		): Promise<boolean>;
		export function derank(
			target: GuildMember | { guild: Guild; id: string },
			reason?: string
		): Promise<void>;
		export function findOptionRecursively(
			options: Array<Option>,
			subcommandName: string
		): Option | undefined;
		export function generateCustomMessagePreview(
			message: string,
			input: {
				guild: Guild;
				user: User;
				guildLocal: string;
				inviter?: {
					user: { username: string; mention: string };
					invitesAmount: number;
				};
				ranks?: { level: number };
				notifier?: {
					artistAuthor: string;
					artistLink: string;
					mediaURL: string;
				};
				blogger?: {
					articleTitle: string;
					articleAuthor: string;
					articleLink: string;
					blogName: string;
				};
			}
		): string;
		export function generateTopggActionRow(): ActionRowBuilder<ButtonBuilder>;
		export function getArgumentOptionNameWithOptions(o: Option): string;
		export function getDangerousPermissions(
			lang: LanguageData
		): Array<{ flag: bigint; name: string }>;
		export function hasSubCommand(
			options: Array<Option> | undefined
		): boolean;
		export function hasSubCommandGroup(
			options: Array<Option> | undefined
		): boolean;
		export function interactionSend(
			interaction:
				| ChatInputCommandInteraction<CacheType>
				| ModalSubmitInteraction<"cached">
				| ChatInputCommandInteraction<"cached">
				| Message<boolean>
				| StringSelectMenuInteraction<"cached">,
			options:
				| string
				| MessageReplyOptions
				| MessageEditOptions
				| InteractionReplyOptions
		): Promise<Message<boolean>>;
		export function isAnimated(attachmentUrl: string): boolean;
		export function isNumber(str: string): boolean;
		export function isSubCommand(option: Option | Command): boolean;
		export function isTicketChannel(
			channel: BaseGuildTextChannel
		): Promise<boolean>;
		export function isValidDiscordInvite(input: string): boolean;
		export function isValidDiscordInviteCode(VanityCode: string): boolean;
		export function longString(
			args: Array<string>,
			argsNumber: number
		): string | null;
		export function member(
			message: Message<boolean>,
			args: Array<string>,
			argsNumber: number
		): GuildMember | null;
		export function number(args: Array<string>, argsNumber: number): number;
		export function options(
			interaction:
				ChatInputCommandInteraction<CacheType> | Message<boolean>,
			args?: Array<string>
		): {
			string(name: string, index: number, required: true): string;
			string(
				name: string,
				index: number,
				required?: boolean
			): string | null;
			longString(name: string, index: number, required: true): string;
			longString(
				name: string,
				index: number,
				required?: boolean
			): string | null;
			number(name: string, index: number, required: true): number;
			number(
				name: string,
				index: number,
				required?: boolean
			): number | null;
			integer(name: string, index: number, required: true): number;
			integer(
				name: string,
				index: number,
				required?: boolean
			): number | null;
			member(name: string, index: number): GuildMember | null;
			user(name: string, index: number): Promise<User | null>;
			channel(name: string, index: number): Promise<Channel | null>;
			voiceChannel(
				name: string,
				index: number
			): Promise<BaseGuildVoiceChannel | null>;
			role(name: string, index: number): Role | null;
			attachment(name: string): Attachment | null;
		};
		export function punish(
			data: DatabaseStructure.ProtectionData,
			user: GuildMember | { guild: Guild; id: string },
			reason?: string,
			ruleKey?: string
		): Promise<void>;
		export function reply(
			message: Message<boolean>,
			options: string | MessageReplyOptions
		): Promise<Message<boolean>>;
		export function role(
			interaction: Message<boolean>,
			args: Array<string>,
			argsNumber: number
		): Role | null;
		export function shouldAdvertiseTheTopggVoteButton(
			authorId: string
		): Promise<boolean>;
		export function string(
			args: Array<string>,
			argsNumber: number
		): string | null;
		export function stringifyOption(option: Array<Option>): string;
		export function subCoins(
			member: GuildMember,
			coins: number
		): Promise<void>;
		export function user(
			message: Message<boolean>,
			args: Array<string>,
			argsNumber: number
		): Promise<User | null>;
		export function voiceChannel(
			interaction: Message<boolean>,
			args: Array<string>,
			argsNumber: number
		): Promise<BaseGuildVoiceChannel | null>;
		export function warnMember(
			author: GuildMember,
			member: GuildMember,
			reason: string,
			lang: LanguageData
		): Promise<string>;
	}

	// From modalHelper.ts
	export namespace modalHelper {
		export function iHorizonModalBuilder(
			modalOptions: ModalOptionsBuilder
		): APIModalInteractionResponseCallbackData;
		export function iHorizonModalResolve(
			modalOptions: ModalOptionsBuilder,
			interaction:
				| ChatInputCommandInteraction<CacheType>
				| MessageContextMenuCommandInteraction<CacheType>
				| UserContextMenuCommandInteraction<CacheType>
				| PrimaryEntryPointCommandInteraction<CacheType>
				| AnySelectMenuInteraction<CacheType>
				| ButtonInteraction<CacheType>
				| AutocompleteInteraction<CacheType>
				| ModalSubmitInteraction<CacheType>
		): Promise<ModalSubmitInteraction<"cached"> | undefined>;
	}

	// From musicPlay.ts
	export namespace musicPlay {
		export function buildNoResultEmbed(lang: LanguageData): EmbedBuilder;
		export function buildTrackLabel(track: Track): string;
		export function handleAmazonMusic(
			requester: User,
			node: LavalinkNode,
			query: string
		): Promise<SearchResult | undefined>;
		export function handleAppleMusic(
			requester: User,
			node: LavalinkNode,
			query: string
		): Promise<SearchResult | undefined>;
		export function handleMusicPlay({
			client,
			interaction,
			lang,
			queries,
			respond
		}: HandleMusicPlayOptions): Promise<void>;
		export function handleSpotify(
			requester: User,
			node: LavalinkNode,
			query: string
		): Promise<SearchResult | undefined>;
		export function handleTidalMusic(
			requester: User,
			node: LavalinkNode,
			query: string
		): Promise<SearchResult | undefined>;
		export function handleYoutube(
			requester: User,
			node: LavalinkNode,
			query: string
		): Promise<SearchResult | undefined>;
		export function isAmazonMusicURL(url: string): boolean;
		export function isAppleMusicURL(url: string): boolean;
		export function isSpotifyURL(url: string): boolean;
		export function isTidalURL(url: string): boolean;
		export function isUrlQuery(query: string): boolean;
		export function isYoutubeURL(url: string): boolean;
		export function removeParenthesesContent(text: string): string;
		export function responseExist(res: SearchResult | undefined): boolean;
		export function sanitizeYoutubeUrl(input: string): string;
		export function searchMusicQuery(
			client: Client<boolean>,
			query: string,
			requester: User,
			preferredNode?: LavalinkNode
		): Promise<SearchMusicQueryResult>;
		export function searchQueryOnNode(
			client: Client<boolean>,
			node: LavalinkNode,
			query: string,
			requester: User
		): Promise<SearchResult | undefined>;
		export function sendQueueAddMessage(
			interaction:
				| ChatInputCommandInteraction<"cached">
				| Message<boolean>
				| MessageContextMenuCommandInteraction<CacheType>,
			lang: LanguageData,
			player: Player,
			client: Client<boolean>,
			track: Track
		): Promise<void>;
	}

	// From music_proximity.ts
	export namespace music_proximity {
		export function isSimilar(
			query: string,
			track: TrackEmbbeded,
			threshold?: number,
			wordThreshold?: number
		): boolean;
		export function levenshtein(a: string, b: string): number;
		export function similarity(a: string, b: string): number;
	}

	// From numberBeautifuer.ts
	export function numberBeautifuer(num: number): string;

	// From os_utils.ts
	export namespace os_utils {
		export function getMemoryInfo(): Promise<{
			MemTotal: number;
			MemFree: number;
			MemAvailable: number;
		}>;
		export function niceBytes(kb: number): string;
	}

	// From ownerHelper.ts
	export namespace ownerHelper {
		export function addBotOwner(userId: string): Promise<void>;
		export function addGuildOwner(
			userId: string,
			guildId: string
		): Promise<void>;
		export function getBotDev(): Array<string>;
		export function getBotOwner(): Promise<Array<string>>;
		export function getGuildOwner(
			guild: Guild | null
		): Promise<Array<string>>;
		export function isBotDev(userId: string): boolean;
		export function isBotOwner(userId: string): Promise<boolean>;
		export function isGuildOwner(
			userId: string,
			guild: Guild
		): Promise<boolean>;
		export function removeBotOwner(userId: string): Promise<void>;
		export function removeGuildOwner(
			userId: string,
			guildId: string
		): Promise<void>;
	}

	// From permissonsCalculator.ts
	export namespace permissonsCalculator {
		export function checkCommandPermission(
			interaction:
				ChatInputCommandInteraction<"cached"> | Message<boolean>,
			command: string
		): Promise<{ allowed: boolean; permissionData: command }>;
		export function checkExplicitRolePermission(
			member: GuildMember | null | undefined,
			cmdPermData: {
				users: string[];
				roles: string[];
				level: DatabaseStructure.PermCommandLevel;
			}
		): boolean;
		export function checkExplicitUserPermission(
			userId: string,
			cmdPermData: {
				users: string[];
				roles: string[];
				level: DatabaseStructure.PermCommandLevel;
			}
		): boolean;
		export function checkRoleHierarchy(
			member: GuildMember | null | undefined,
			guildPerm: DatabaseStructure.UtilsData,
			cmdPermData: {
				users: string[];
				roles: string[];
				level: DatabaseStructure.PermCommandLevel;
			}
		): boolean;
		export function checkUserPermLevel(
			userId: string,
			guildPerm: DatabaseStructure.UtilsData,
			cmdPermData: {
				users: string[];
				roles: string[];
				level: DatabaseStructure.PermCommandLevel;
			}
		): boolean;
		export function checkUserPermissions(
			member: GuildMember
		): Promise<0 | DatabaseStructure.PermLevel>;
		export function getCmdPermData(
			command: string,
			guildPerm: DatabaseStructure.UtilsData
		): {
			users: string[];
			roles: string[];
			level: DatabaseStructure.PermCommandLevel;
		};
		export function getPermissionByValue(
			value: bigint | Array<bigint>
		): PermissionValue | Array<PermissionValue> | null;
		export function hasCommandPermissionRequirements(
			permissionData: command | null | undefined
		): boolean;
		export function isOnTheOwnerList(
			guildId: string,
			memberId: string
		): Promise<boolean>;
		export function sendErrorMessage(
			interaction:
				ChatInputCommandInteraction<"cached"> | Message<boolean>,
			lang: LanguageData,
			permissionData: {
				users: string[];
				roles: string[];
				level: DatabaseStructure.PermCommandLevel;
			}
		): Promise<Message<boolean>>;
	}

	// From prefix.ts
	export namespace prefix {
		export function defaultPrefix(client: Client<boolean>): {
			type: "prefix" | "mention";
			string: string;
		};
		export function guildPrefix(
			client: Client<boolean>,
			guildId: string
		): Promise<{ type: "prefix" | "mention"; string: string }>;
	}

	// From random.ts
	export namespace random {
		export function generateMultiplePasswords(
			amount: number,
			options: PasswordOptions
		): Array<string>;
		export function generatePassword(options: PasswordOptions): string;
		export function secureRandomFloat(): number;
		export function secureRandomInt(
			minimum: number,
			maximum: number
		): number;
	}

	// From randomExpression.ts
	export function randomExpression(): string;

	// From retrieveMyself.ts
	export namespace retrieveMyself {
		export function retrieveBanner(): string;
		export function retrieveBio(): Promise<string | null>;
	}

	// From roleSelectMenu.ts
	export function roleSelectMenu(
		data: Array<{
			roleId: string;
			emoji?: string;
			desc?: string;
			label: string;
		}>,
		messageId: string,
		placeholder: string
	): any;

	// From sanitizeInteractionOptionValue.ts
	export function sanitizeInteractionOptionValue(
		optionName: string,
		optionValue: unknown
	): string;

	// From sanitizer.ts
	export function sanitizer(text: string | undefined): string;

	// From searchLyrics.ts
	export function searchLyrics(
		query: string | Track,
		author?: User
	): Promise<{ track: Track | undefined; res: LyricsData } | null>;

	// From shard_helper.ts
	export namespace shard_helper {
		export function getCommunityGuildsData(
			client: Client<boolean>,
			minMembers: number
		): Promise<Array<CommunityGuildData>>;
		export function getDetailedGuildData(
			client: Client<boolean>,
			guildId: string
		): Promise<DetailedGuildData | null>;
		export function getGuildData(
			client: Client<boolean>,
			guildId: string
		): Promise<GuildData | null>;
	}

	// From svg2png.ts
	export function svg2png(
		svg: string,
		options?: Svg2PngOptions
	): Promise<Buffer<ArrayBufferLike>>;

	// From svgKit.ts
	export namespace svgKit {
		export function dataUri(buffer: Buffer<ArrayBufferLike>): string;
		export function ellipsize(
			text: string,
			maxWidth: number,
			style: TextStyle
		): Promise<string>;
		export function escape(value: string): string;
		export function fetchImage(
			url: string
		): Promise<Buffer<ArrayBufferLike> | null>;
		export function fill(
			template: string,
			values: { [x: string]: string | number | SvgMarkup }
		): string;
		export function image(
			source: Buffer<ArrayBufferLike>,
			options: ImageOptions
		): SvgMarkup;
		export function imageSize(
			buffer: Buffer<ArrayBufferLike>
		): { width: number; height: number } | null;
		export function measure(
			text: string,
			style: TextStyle
		): Promise<number>;
		export function paragraph(
			content: string,
			options: ParagraphOptions
		): Promise<SvgMarkup>;
		export function raw(markup: string): SvgMarkup;
		export function text(
			content: string,
			options: TextOptions
		): Promise<SvgMarkup>;
		export function uid(prefix?: any): string;
		export function wrap(
			text: string,
			maxWidth: number,
			style: TextStyle,
			maxLines?: any
		): Promise<Array<string>>;
	}

	// From tagHelper.ts
	export function tagHelper(
		interaction: ChatInputCommandInteraction<"cached"> | Message<boolean>,
		lang: LanguageData,
		tag_id: string,
		tag: DatabaseStructure.TagInfo
	): EmbedBuilder;

	// From tempVoiceCandidate.ts
	export function tempVoiceCandidate(
		member: GuildMember | null | undefined
	): boolean;

	// From userStatsUtils.ts
	export namespace userStatsUtils {
		export function calculateActiveChannels(
			messages: Array<DatabaseStructure.StatsMessage>
		): {
			firstActiveChannel: string;
			secondActiveChannel: string;
			thirdActiveChannel: string;
		};
		export function calculateActiveVoiceChannels(
			voices: Array<DatabaseStructure.StatsVoice>
		): {
			firstActiveVoiceChannel: string;
			secondActiveVoiceChannel: string;
			thirdActiveVoiceChannel: string;
		};
		export function calculateMessageTime(
			msg: DatabaseStructure.StatsMessage,
			nowTimestamp: number,
			dailyTimeout: number,
			weeklyTimeout: number,
			monthlyTimeout: number,
			dailyMessages: Array<DatabaseStructure.StatsMessage>,
			weeklyMessages: Array<DatabaseStructure.StatsMessage>,
			monthlyMessages: Array<DatabaseStructure.StatsMessage>
		): {
			dailyMessages: DatabaseStructure.StatsMessage[];
			weeklyMessages: DatabaseStructure.StatsMessage[];
			monthlyMessages: DatabaseStructure.StatsMessage[];
		};
		export function calculateVoiceActivity(
			voice: DatabaseStructure.StatsVoice,
			nowTimestamp: number,
			dailyTimeout: number,
			weeklyTimeout: number,
			monthlyTimeout: number,
			dailyVoiceActivity: number,
			weeklyVoiceActivity: number,
			monthlyVoiceActivity: number
		): {
			dailyVoiceActivity: number;
			weeklyVoiceActivity: number;
			monthlyVoiceActivity: number;
		};
		export function getChannelMessagesCount(
			channelId: string,
			messages: Array<DatabaseStructure.StatsMessage>
		): number;
		export function getChannelMinutesCount(
			channelId: string,
			voices: Array<DatabaseStructure.StatsVoice>
		): number;
		export function getChannelName(guild: Guild, channelId: string): string;
		export function getStatsLeaderboard(
			data: Array<{
				member: User | undefined;
				dailyMessages: number;
				weeklyMessages: number;
				monthlyMessages: number;
				dailyVoiceActivity: number;
				weeklyVoiceActivity: number;
				monthlyVoiceActivity: number;
			}>
		): Array<{
			member: User | undefined;
			dailyMessages: number;
			weeklyMessages: number;
			monthlyMessages: number;
			dailyVoiceActivity: number;
			weeklyVoiceActivity: number;
			monthlyVoiceActivity: number;
		}>;
		export function getTopUsersByMessages(
			data: Array<{
				memberId: string;
				member: User | undefined;
				messages: number;
			}>,
			limit?: number
		): Array<{
			memberId: string;
			member: User | undefined;
			messages: number;
		}>;
		export function getTopUsersByVoice(
			data: Array<{
				memberId: string;
				member: User | undefined;
				voiceDuration: number;
			}>,
			limit?: number
		): Array<{
			memberId: string;
			member: User | undefined;
			voiceDuration: number;
		}>;
	}

	// From validImageType.ts
	export function validImageType(contentType: string | null): boolean;

	// From wait.ts
	export function wait(milliseconds: number): Promise<void>;

	// From welcomerEmbed.ts
	export function welcomerEmbed(
		embedId: string | null | undefined,
		variables: WelcomerEmbedVariables
	): Promise<APIEmbed | null>;

	// From welcomerMessage.ts
	export function welcomerMessage(
		channel: BaseGuildTextChannel,
		member: GuildMember,
		options: {
			message?: string | null;
			embed?: APIEmbed | null;
			useComponents?: boolean;
			accentColor: number;
			avatarAttachmentName: string;
			bannerImage?: Buffer;
			bannerAttachmentName?: string;
		}
	): Promise<Message<boolean> | null>;
}

export { Client_Functions };
