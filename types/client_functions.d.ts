import type { DatabaseStructure } from './database_structure.d.ts';
import type { LanguageData } from './languageData.d.ts';
import type { ClusterMethod, GatewayMethod } from '../src/core/functions/apiUrlParser.js';
import { ModalOptionsBuilder } from '../src/core/functions/modalHelper.js';
import { AnySelectMenuInteraction, APIModalInteractionResponseCallbackData, BaseGuildTextChannel, BaseGuildVoiceChannel, ButtonBuilder, ButtonInteraction, Channel, ChatInputCommandInteraction, Client, EmbedBuilder, Guild, GuildMember, Interaction, InteractionReplyOptions, Message, MessageEditOptions, MessageReplyOptions, ModalSubmitInteraction, Role, StringSelectMenuInteraction, User, UserContextMenuCommandInteraction, VoiceBasedChannel } from 'discord.js';
import { Assets } from './assets.js';
import { LangForPrompt } from '../src/core/functions/awaitingResponse.js';
import { AuthRestore_EntryType, AuthRestore_ResponseType, GuildAuthRestore, AuthRestore_ForceJoin_EntryType, AuthRestore_ForceJoin_ResponseType, AuthRestore_KeyUpdate_EntryType, AuthRestore_RoleUpdate_EntryType } from '../src/core/functions/authRestoreHelper.ts';
import { Command } from './command.js';
import { Option } from './option.js';
import { db } from '../src/core/database.ts';
import { PasswordOptions } from '../src/core/functions/random.ts';
import { command } from '../src/core/functions/permissonsCalculator.ts';

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

	// From getIp.ts
	export function getIp(useIPv6?: boolean): Promise<string>;

	// From date_and_time.ts
	export function date_and_time(date: Date | number, formatString: string): string;

	// From apiUrlParser.ts
	export namespace apiUrlParser {
		export function assetsFinder(body: Assets, type: string): string;
		export function OwnIhrzCluster(
			options: {
				cluster_number: number
				cluster_method: ClusterMethod,
				bot_id?: string;
				discord_bot_token?: string;
				forceDatabaseSet?: boolean;
			}
		): string;
		export function HorizonGateway(gateway_method: GatewayMethod): string;
	}

	// From sanitizer.ts
	export namespace sanitizer {
	}

	// From lyrics_fetcher.ts
	export namespace lyrics_fetcher {
	}

	// From ms.ts
	export namespace ms {
	}

	// From assetsCalc.ts
	export function assetsCalc(client: Client): Promise<void>;

	// From emojiChecker.ts
	export namespace emojiChecker {
		export function isSingleEmoji(text: string): boolean;
		export function isDiscordEmoji(text: string): boolean;
	}

	// From modalHelper.ts
	export namespace modalHelper {
		export function iHorizonModalBuilder(modalOptions: ModalOptionsBuilder): APIModalInteractionResponseCallbackData;
		export function iHorizonModalResolve(modalOptions: ModalOptionsBuilder, interaction: Interaction): Promise<ModalSubmitInteraction<"cached"> | undefined>;
	}

	// From random.ts
	export namespace random {
		export function generatePassword(options: PasswordOptions): string;
		export function generateMultiplePasswords(amount: number, options: PasswordOptions): string[];
	}

	// From getLanguageData.ts
	export function getLanguageData(arg: string | undefined | null): Promise<LanguageData>;

	// From mediaManipulation.ts
	export namespace mediaManipulation {
		export function convertToPng(buffer: Buffer): Promise<Buffer>;
		export function adjustImageQuality(imagePath: string): any;
		export function resizeImage(inputImage: Buffer, outputPath: string, width?: number, height?: number): any;
	}

	// From kdenliveManipulator.ts
	export namespace kdenliveManipulator {
	}

	// From numberBeautifuer.ts
	export function numberBeautifuer(num: number): string;

	// From awaitingResponse.ts
	export function awaitingResponse(interaction: ChatInputCommandInteraction<"cached"> | Message, opt: LangForPrompt): any;

	// From authRestoreHelper.ts
	export namespace authRestoreHelper {
		export function createAuthRestoreLink(data: AuthRestore_EntryType): string;
		export function createAuthRestore(data: AuthRestore_EntryType): Promise<AuthRestore_ResponseType>;
		export function getGuildDataPerSecretCode(data: { id: string; value: any }[], secretCode: string): { id: string, data: GuildAuthRestore } | null;
		export function forceJoinAuthRestore(data: AuthRestore_ForceJoin_EntryType): Promise<AuthRestore_ForceJoin_ResponseType>;
		export function securityCodeUpdate(data: AuthRestore_KeyUpdate_EntryType): Promise<AuthRestore_ForceJoin_ResponseType>;
		export function changeRoleAuthRestore(data: AuthRestore_RoleUpdate_EntryType): Promise<AuthRestore_ForceJoin_ResponseType>;
	}

	// From permissonsCalculator.ts
	export namespace permissonsCalculator {
		export function checkCommandPermission(interaction: ChatInputCommandInteraction<"cached"> | Message, command: string): Promise<{
			allowed: boolean;
			permissionData: command;
		}>;
		export function checkUserPermissions(member: GuildMember): Promise<DatabaseStructure.PermLevel | DatabaseStructure.PermNone>;
		export function sendErrorMessage(
			interaction: ChatInputCommandInteraction<"cached"> | Message,
			lang: LanguageData,
			permissionData: command
		): any;
		export function getPermissionByValue(value: bigint): any;
	}

	// From method.ts
	export namespace method {
		export function isNumber(str: string): boolean;
		export function user(interaction: Message, args: string[], argsNumber: number): Promise<User | null>;
		export function member(interaction: Message, args: string[], argsNumber: number): GuildMember | null;
		export function voiceChannel(interaction: Message, args: string[], argsNumber: number): Promise<BaseGuildVoiceChannel | null>;
		export function channel(interaction: Message, args: string[], argsNumber: number): Promise<Channel | null>;
		export function role(interaction: Message, args: string[], argsNumber: number): Role | null;
		export function string(args: string[], argsNumber: number): string | null;
		export function longString(args: string[], argsNumber: number): string | null;
		export function number(args: string[], argsNumber: number): number;
		export function getArgumentOptionNameWithOptions(o: Option): string;
		export function stringifyOption(option: Option[]): string;
		export function boldStringifyOption(option: Option[]): string;
		export function createAwesomeEmbed(
			lang: LanguageData,
			command: Command,
			client: Client,
			interaction: ChatInputCommandInteraction<"cached"> | Message
		): Promise<EmbedBuilder>;
		export function checkCommandArgs(message: Message, command: Command, args: string[], lang: LanguageData): Promise<boolean>;
		export function interactionSend(
			interaction: ChatInputCommandInteraction<"cached"> | ChatInputCommandInteraction | Message,
			options: string | MessageReplyOptions | MessageEditOptions | InteractionReplyOptions
		): Promise<Message>;
		export function channelSend(
			interaction: Message | ChatInputCommandInteraction<"cached"> | AnySelectMenuInteraction<"cached"> | BaseGuildTextChannel,
			options: string | MessageReplyOptions | MessageEditOptions
		): Promise<Message>;
		export function hasSubCommand(options: Option[] | undefined): boolean;
		export function hasSubCommandGroup(options: Option[] | undefined): boolean;
		export function isSubCommand(option: Option | Command): boolean;
		export function punish(data: any, user: GuildMember | undefined, reason?: string): any;
		export function generateCustomMessagePreview(
			message: string,
			input: {
				guild: Guild;
				user: User;
				guildLocal: string;
				inviter?: {
					user: {
						username: string;
						mention: string;
					}
					invitesAmount: number;
				},
				ranks?: {
					level: number;
				},
				notifier?: {
					artistAuthor: string;
					artistLink: string;
					mediaURL: string;
				}
			}
		): string;
		export function findOptionRecursively(options: Option[], subcommandName: string): Option | undefined;
		export function buttonReact(msg: Message, button: ButtonBuilder): Promise<Message>;
		export function buttonUnreact(msg: Message, buttonEmoji: string): Promise<Message>;
		export function isAnimated(attachmentUrl: string): boolean;
		export function warnMember(author: GuildMember, member: GuildMember, reason: string): Promise<string>;
		export function getDangerousPermissions(lang: LanguageData): {
			flag: bigint;
			name: string;
		}[];
		export function addCoins(member: GuildMember, coins: number): Promise<void>;
		export function subCoins(member: GuildMember, coins: number): Promise<void>;
		export function isTicketChannel(channel: BaseGuildTextChannel): Promise<boolean>;
	}

	// From wait.ts
	export function wait(milliseconds: number): Promise<void>;

	// From prefix.ts
	export namespace prefix {
		export function guildPrefix(client: Client, guildId: string): Promise<{ type: 'prefix' | 'mention'; string: string; }>;
		export function defaultPrefix(client: Client): { type: 'prefix' | 'mention'; string: string; };
	}

	// From maskLink.ts
	export function maskLink(input: string): string;

	// From image_dominant_color.ts
	export function image_dominant_color(input: string | Buffer): Promise<string>;

	// From userStatsUtils.ts
	export namespace userStatsUtils {
		export function calculateMessageTime(
			msg: DatabaseStructure.StatsMessage,
			nowTimestamp: number,
			dailyTimeout: number,
			weeklyTimeout: number,
			monthlyTimeout: number,
			dailyMessages: DatabaseStructure.StatsMessage[],
			weeklyMessages: DatabaseStructure.StatsMessage[],
			monthlyMessages: DatabaseStructure.StatsMessage[]
		): {
			dailyMessages: DatabaseStructure.StatsMessage[],
			weeklyMessages: DatabaseStructure.StatsMessage[],
			monthlyMessages: DatabaseStructure.StatsMessage[],
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
			dailyVoiceActivity: number,
			weeklyVoiceActivity: number,
			monthlyVoiceActivity: number,
		};
		export function calculateActiveChannels(messages: DatabaseStructure.StatsMessage[]): {
			firstActiveChannel: string,
			secondActiveChannel: string,
			thirdActiveChannel: string,
		};
		export function calculateActiveVoiceChannels(voices: DatabaseStructure.StatsVoice[]): {
			firstActiveVoiceChannel: string,
			secondActiveVoiceChannel: string,
			thirdActiveVoiceChannel: string,
		};
		export function getChannelName(guild: Guild, channelId: string): string;
		export function getChannelMessagesCount(channelId: string, messages: DatabaseStructure.StatsMessage[]): number;
		export function getChannelMinutesCount(channelId: string, voices: DatabaseStructure.StatsVoice[]): number;
		export function getStatsLeaderboard(
			data: {
				member: User | undefined,
				dailyMessages: number,
				weeklyMessages: number,
				monthlyMessages: number,
				dailyVoiceActivity: number,
				weeklyVoiceActivity: number,
				monthlyVoiceActivity: number
			}[]
		): any;
	}

	// From leashModuleHelper.ts
	export namespace leashModuleHelper {
		export function isInVoiceChannel(member: GuildMember): any;
		export function getDomSubVoiceChannel(member: GuildMember): VoiceBasedChannel | null;
	}

	// From displayBotName.ts
	export namespace displayBotName {
		export function footerBuilder(
			message: ChatInputCommandInteraction<"cached"> | Message | ButtonInteraction | UserContextMenuCommandInteraction | StringSelectMenuInteraction | Interaction | GuildMember | Guild
		): any;
		export function footerAttachmentBuilder(
			interaction: ChatInputCommandInteraction<"cached"> | Message | ButtonInteraction | UserContextMenuCommandInteraction | StringSelectMenuInteraction | Interaction | GuildMember | Guild | Client
		): any;
		export function displayBotPP(client: Client, guildId?: string): Promise<{ type: 1 | 2; string: string; }>;
		export function displayBotName(guildId: string): Promise<string>;
	}

	// From generateProgressBar.ts
	export function generateProgressBar(currentTimeMs: number, totalTimeMs: number): {
		bar: string;
		currentTime: string;
		totalTime: string;
	};

	// From helper.ts
	export namespace helper {
		export function coolDown(message: Message, method: string, ms: number): any;
		export function hardCooldown(database: db, method: string, ms: number): any;
	}

	// From html2png.ts
	export function html2png(
		code: string,
		options: {
			width?: number;
			height?: number;
			scaleSize?: number;
			elementSelector?: string;
			omitBackground: boolean;
			selectElement: boolean;
		}
	): Promise<Buffer>;

	// From ihorizon_logs.ts
	export function ihorizon_logs(
		interaction: ChatInputCommandInteraction<"cached"> | Message,
		embed: {
			title: string;
			description: string;
		}
	): any;

	// From image64.ts
	export namespace image64 {
		export function isImageUrl(url: string): Promise<boolean>;
		export function image64(arg: string): Promise<Buffer | undefined>;
	}

	// From isAllowedLinks.ts
	export function isAllowedLinks(link: string): boolean;
}

export { Client_Functions };
