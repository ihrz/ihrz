import type { DatabaseStructure } from './database_structure';
import type { LanguageData } from './languageData.js';
import { ClusterMethod, GatewayMethod } from '../src/core/functions/apiUrlParser.js';
import { ModalOptionsBuilder } from '../src/core/functions/modalHelper.js';
import { AnySelectMenuInteraction, APIModalInteractionResponseCallbackData, BaseGuildTextChannel, BaseGuildVoiceChannel, ButtonBuilder, ButtonInteraction, Channel, ChatInputCommandInteraction, Client, EmbedBuilder, Guild, GuildMember, Interaction, InteractionReplyOptions, Message, MessageEditOptions, MessageReplyOptions, ModalSubmitInteraction, Role, StringSelectMenuInteraction, User, UserContextMenuCommandInteraction, VoiceBasedChannel } from 'discord.js';
import { Assets } from './assets.js';
import { QuickDB } from 'quick.db';
import { LangForPrompt } from '../src/core/functions/awaitingResponse.js';
import { RestoreCord_EntryType, RestoreCord_ResponseType, GuildRestoreCord, RestoreCord_ForceJoin_EntryType, RestoreCord_ForceJoin_ResponseType, RestoreCord_KeyUpdate_EntryType, RestoreCord_RoleUpdate_EntryType } from '../src/core/functions/restoreCordHelper.js';
import { Command } from './command.js';
import { Option } from './option.js';

import type { Promise } from 'typescript/lib/lib.es5';
import type { Buffer } from '@types/node/ts5.6/buffer.buffer';
import type { PermLevel, PermNone, StatsMessage, StatsVoice } from '../../../types/database_structure.d';

declare namespace Client_Functions {

  // From encryptDecryptMethod.ts
  export namespace encryptDecryptMethod {
  }

  // From colors.ts
  export namespace colors {
  }

  // From axios.ts
  export namespace axios {
  }

  // From getToken.ts
  export function getToken(): Promise<string | undefined>;

  // From getIp.ts
  export function getIp({ useIPv6 = false }: { useIPv6?: boolean }): any;

  // From wait.ts
  export namespace wait {
  }

  // From date_and_time.ts
  export namespace date_and_time {
  }

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
  }

  // From prefix.ts
  export namespace prefix {
    export function guildPrefix(client: Client, guildId: string): Promise<{ type: 'prefix' | 'mention'; string: string; }>;
    export function defaultPrefix(client: Client): { type: 'prefix' | 'mention'; string: string; };
  }

  // From maskLink.ts
  export namespace maskLink {
  }

  // From awaitingResponse.ts
  export function awaitingResponse(interaction: ChatInputCommandInteraction<"cached"> | Message, opt: LangForPrompt): any;

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

  // From restoreCordHelper.ts
  export namespace restoreCordHelper {
    export function createRestoreCordLink(data: RestoreCord_EntryType): string;
    export function createRestoreCord(data: RestoreCord_EntryType): Promise<RestoreCord_ResponseType>;
    export function getGuildDataPerSecretCode(data: { id: string; value: any }[], secretCode: string): { id: string, data: GuildRestoreCord } | null;
    export function forceJoinRestoreCord(data: RestoreCord_ForceJoin_EntryType): Promise<RestoreCord_ForceJoin_ResponseType>;
    export function securityCodeUpdate(data: RestoreCord_KeyUpdate_EntryType): Promise<RestoreCord_ForceJoin_ResponseType>;
    export function changeRoleRestoreCord(data: RestoreCord_RoleUpdate_EntryType): Promise<RestoreCord_ForceJoin_ResponseType>;
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
    export function hardCooldown(database: QuickDB<any>, method: string, ms: number): any;
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
  export function image64(arg: string): Promise<Buffer | undefined>;

  // From isAllowedLinks.ts
  export function isAllowedLinks(link: string): boolean;

  // From method.ts
  export namespace method {
    export function isNumber(str: string): boolean;
    export function user(interaction: Message, args: string[], argsNumber: number): Promise<User | null>;
    export function member(interaction: Message, args: string[], argsNumber: number): GuildMember | null;
    export function voiceChannel(interaction: Message, args: string[], argsNumber: number): Promise<BaseGuildVoiceChannel | null>;
    export function channel(interaction: Message, args: string[], argsNumber: number): Promise<Channel | null>;
    export function role(interaction: Message, args: string[], argsNumber: number): Role | null;
    export function _string(args: string[], argsNumber: number): string | null;
    export function longString(args: string[], argsNumber: number): string | null;
    export function _number(args: string[], argsNumber: number): number;
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
            invitesAmount: string;
        },
        ranks?: {
            level: string;
        },
        notifier?: {
            artistAuthor: string;
            artistLink: string;
            mediaURL: string;
        }
    }
    ): string;
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
}

export { Client_Functions };
