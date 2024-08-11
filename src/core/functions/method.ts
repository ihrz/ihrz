/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import { Message, Channel, User, Role, GuildMember, APIRole, ChannelType, BaseGuildVoiceChannel, EmbedBuilder, Client, Embed, ChatInputCommandInteraction, MessageReplyOptions, InteractionEditReplyOptions, MessageEditOptions, InteractionReplyOptions, ApplicationCommandOptionType, SnowflakeUtil, AnySelectMenuInteraction, BaseGuildTextChannel, Guild } from "discord.js";
import { Command } from "../../../types/command.js";
import { Option } from "../../../types/option.js";
import { LanguageData } from "../../../types/languageData.js";
import * as perm from './permissonsCalculator.js'
import * as f from './displayBotName.js';
import * as  h from './helper.js';
import * as c from '../core.js';

export async function user(interaction: Message, args: string[], argsNumber: number): Promise<User | null> {
    return interaction.content.startsWith(`<@${interaction.client.user.id}`)
        ?
        interaction.mentions.parsedUsers
            .map(x => x)
            .filter(x => x.id !== interaction.client.user?.id!)[argsNumber]
        :
        interaction.mentions.parsedUsers
            .map(x => x)[argsNumber]
        || interaction.client.users.fetch(args[argsNumber]).catch(() => false) || null
}

export function member(interaction: Message, args: string[], argsNumber: number): GuildMember | undefined | null {
    return interaction.content.startsWith(`<@${interaction.client.user.id}`)
        ?
        interaction.mentions.members?.map(x => x)
            .filter(x => x.id !== interaction.client.user?.id!)[argsNumber]
        :
        interaction.mentions.members?.map(x => x)[argsNumber]
        || interaction.guild?.members.cache.get(args[argsNumber]) || null
}

export function voiceChannel(interaction: Message, args: string[], argsNumber: number): BaseGuildVoiceChannel | null {
    return interaction.mentions.channels
        .map(x => x)
        .filter(x => x.type === ChannelType.GuildVoice || ChannelType.GuildStageVoice)
    [argsNumber] as BaseGuildVoiceChannel || interaction.guild?.channels.cache.get(args[argsNumber]) || null;
}

export function channel(interaction: Message, args: string[], argsNumber: number): Channel | null {
    return interaction.mentions.channels
        .map(x => x)
    [argsNumber] || interaction.guild?.channels.cache.get(args[argsNumber]) || null;
}

export function role(interaction: Message, args: string[], argsNumber: number): Role | APIRole | null {
    return interaction.mentions.roles
        .map(x => x)
    [argsNumber] || interaction.guild?.roles.cache.get(args[argsNumber]) || null;
}

export function string(args: string[], argsNumber: number): string | null {
    return args
    [argsNumber] || null;
}

export function longString(args: string[], argsNumber: number): string | null {
    return args.slice(argsNumber).join(" ") || null;
}

export function number(args: string[], argsNumber: number): number {
    let _ = args[argsNumber];
    return Number.isNaN(parseInt(_)) ? 0 : parseInt(_);
}

const getArgumentOptionType = (type: number): string => {
    switch (type) {
        case 3:
            return "string";
        case 6:
            return "user";
        case 8:
            return "roles";
        case 10:
        case 4:
            return "number";
        case 7:
            return "channel";
        default:
            return "default";
    }
};

const getArgumentOptionTypeWithOptions = (o: Option): string => {
    if (o.choices) {
        return o.choices.map(x => x.value).join("/");
    }
    return getArgumentOptionType(o.type);
};

export async function createAwesomeEmbed(lang: LanguageData, command: Command, client: Client, interaction: ChatInputCommandInteraction | Message): Promise<EmbedBuilder> {
    var commandName = command.name.charAt(0).toUpperCase() + command.name.slice(1);

    const embed = new EmbedBuilder()
        .setTitle(lang.hybridcommands_embed_help_title.replace("${commandName}", commandName))
        .setColor("LightGrey");

    var botPrefix = await client.func.prefix.guildPrefix(client, interaction.guildId!);
    var cleanBotPrefix = botPrefix.string;

    if (botPrefix.type === "mention") { cleanBotPrefix = lang.hybridcommands_global_prefix_mention; }

    command.options?.map(x => {
        var pathString = '';
        var fullNameCommand = command.name + " " + x.name;
        var shortCommandName = x.name;

        x.options?.forEach((value) => {
            pathString += value.required ? "**`[" : "**`<";
            pathString += getArgumentOptionTypeWithOptions(value);
            pathString += value.required ? "]`**" + " " : ">`**" + " ";
        });
        var aliases = x.aliases?.map(x => `\`${x}\``).join(", ") || lang.setjoinroles_var_none;
        var use = `${cleanBotPrefix}${fullNameCommand} ${pathString}`;

        embed.addFields({
            name: `${cleanBotPrefix}${fullNameCommand} / ${cleanBotPrefix}${shortCommandName}`,
            value: lang.hybridcommands_embed_help_fields_value
                .replace("${aliases}", aliases)
                .replace("${use}", use)
        });
    });

    return embed;
}

interface ArgumentBrief {
    name: string;
    type: string;
    required: boolean;
    longString?: boolean;
}

export interface SubCommandArgumentValue {
    name?: string;
    command: Option | undefined;
}

const isSubCommandArgumentValue = (command: any): command is SubCommandArgumentValue => {
    return command && (command as SubCommandArgumentValue).command !== undefined;
};

export async function checkCommandArgs(message: Message, command: SubCommandArgumentValue | Command, args: string[], lang: LanguageData): Promise<boolean> {
    const botPrefix = await message.client.func.prefix.guildPrefix(message.client, message.guildId);
    let cleanBotPrefix = botPrefix.string;

    if (botPrefix.type === "mention") {
        cleanBotPrefix = lang.hybridcommands_global_prefix_cleaned_mention;
    }

    let expectedArgs: ArgumentBrief[] = [];

    if (isSubCommandArgumentValue(command) && command.command) {
        command.command.options?.forEach(option => {
            expectedArgs.push({
                name: option.name,
                type: getArgumentOptionTypeWithOptions(option),
                required: option.required || false,
                longString: option.type === 3 && !option.choices
            });
        });
    }
    else if ('options' in command) {
        command.options?.forEach(option => {
            expectedArgs.push({
                name: option.name,
                type: getArgumentOptionTypeWithOptions(option),
                required: option.required || false,
                longString: option.type === 3 && !option.choices
            });
        });
    }

    const minArgsCount = expectedArgs.filter(arg => arg.required).length;
    const isLastArgLongString = expectedArgs.length > 0 && expectedArgs[expectedArgs.length - 1].longString;

    if (!Array.isArray(args) || args.length < minArgsCount || (args.length === 1 && args[0] === "")) {
        await sendErrorMessage(lang, message, cleanBotPrefix, command, expectedArgs, 0);
        return false;
    }

    if (isLastArgLongString) {
        const lastArgIndex = expectedArgs.length - 1;
        if (args.length > lastArgIndex) {
            args[lastArgIndex] = args.slice(lastArgIndex).join(" ");
            args.splice(lastArgIndex + 1);
        }
    }

    for (let i = 0; i < expectedArgs.length; i++) {
        if (i >= args.length && !expectedArgs[i].required) {
            continue;
        } else if (i < args.length && !isValidArgument(args[i], expectedArgs[i].type)) {
            await sendErrorMessage(lang, message, cleanBotPrefix, command, expectedArgs, i);
            return false;
        }
    }

    return true;
}

function isValidArgument(arg: string, type: string): boolean {
    if (type.includes("/")) {
        return type.split("/").includes(arg);
    }

    switch (type) {
        case "string":
            return typeof arg === 'string';
        case "user":
            return /^<@!?(\d+)>$/.test(arg) || !isNaN(Number(arg))
        case "roles":
            return /^<@&(\d+)>$/.test(arg) || !isNaN(Number(arg));
        case "number":
            return !isNaN(Number(arg));
        case "channel":
            return /^<#(\d+)>$/.test(arg) || !isNaN(Number(arg));
        default:
            return false;
    }
}

async function sendErrorMessage(lang: LanguageData, message: Message, botPrefix: string, command: SubCommandArgumentValue | Command, expectedArgs: ArgumentBrief[], errorIndex: number) {
    let argument: string[] = [];
    let fullNameCommand: string;

    expectedArgs.forEach(arg => argument.push(arg.required ? `[${arg.type}]` : `<${arg.type}>`));

    let currentCommand: Command | Option;
    let wrongArgumentName: string = "";
    let errorPosition = "";

    if (isSubCommandArgumentValue(command) && command.command) {
        currentCommand = command.command;
        fullNameCommand = `${command.name} ${command.command.name}`;
    } else {
        fullNameCommand = command.name!;
        currentCommand = command as any;
    }

    errorPosition += " ".padStart(botPrefix.length + fullNameCommand.length);

    argument.forEach((arg, index) => {
        if (errorIndex === index) {
            wrongArgumentName = arg.slice(1, -1);
            errorPosition += " ^";
        } else {
            errorPosition += " ".padStart(arg.length + 1);
        }
    });

    let argsString = argument.join(" ");
    const embed = new EmbedBuilder()
        .setDescription(lang.hybridcommands_args_error_embed_desc
            .replace("${currentCommand.name}", currentCommand.name ?? "")
            .replace("${currentCommand.description}", currentCommand.description ?? "")
            .replace("${botPrefix}", botPrefix)
            .replace("${fullNameCommand}", fullNameCommand)
            .replace("${argsString}", argsString)
            .replace("${errorPosition}", errorPosition)
            .replace("${wrongArgumentName}", wrongArgumentName)
        )
        .setColor("Red")
        .setFooter(await message.client.method.bot.footerBuilder(message));

    await message.client.method.interactionSend(message, {
        embeds: [embed],
        files: [await message.client.method.bot.footerAttachmentBuilder(message)]
    });
}

export async function interactionSend(interaction: ChatInputCommandInteraction | Message, options: string | MessageReplyOptions | MessageEditOptions | InteractionReplyOptions): Promise<Message> {
    const nonce = SnowflakeUtil.generate().toString();

    if (interaction instanceof ChatInputCommandInteraction) {
        const editOptions: InteractionEditReplyOptions = typeof options === 'string' ? { content: options } : options;
        return interaction.deferred ? await interaction.editReply(editOptions) : await interaction.reply(editOptions as any);
    } else {
        let replyOptions: MessageReplyOptions;

        if (typeof options === 'string') {
            replyOptions = { content: options, allowedMentions: { repliedUser: false } };
        } else {
            replyOptions = {
                ...options,
                allowedMentions: { repliedUser: false, roles: [], users: [] },
                content: options.content ?? undefined,
                nonce: nonce,
                enforceNonce: true
            } as MessageReplyOptions;
        }

        try {
            return await interaction.reply(replyOptions);
        } catch {
            return await interaction.edit(replyOptions as MessageEditOptions);
        }
    }
}

export async function channelSend(interaction: Message | ChatInputCommandInteraction | AnySelectMenuInteraction | BaseGuildTextChannel, options: string | MessageReplyOptions | MessageEditOptions): Promise<Message> {
    const nonce = SnowflakeUtil.generate().toString();
    let replyOptions: MessageReplyOptions;

    if (typeof options === 'string') {
        replyOptions = { content: options, allowedMentions: { repliedUser: false } };
    } else {
        replyOptions = {
            ...options,
            allowedMentions: { repliedUser: false, roles: [], users: [] },
            content: options.content ?? undefined,
            nonce: nonce,
            enforceNonce: true
        } as MessageReplyOptions;
    }

    if (interaction instanceof BaseGuildTextChannel) {
        return await interaction.send(replyOptions)!;
    } else {
        return await interaction.channel?.send(replyOptions)!;
    }
}

export function hasSubCommand(options: Option[] | undefined): boolean {
    if (!options) return false;
    return options.some(option => option.type === ApplicationCommandOptionType.Subcommand);
}

export async function punish(data: any, user: GuildMember | undefined) {
    switch (data?.['SANCTION']) {
        case 'simply':
            break;
        case 'simply+derank':
            let user_roles = Array.from(user?.roles.cache.values()!)
                .filter(x => !x.managed && x.position < x.guild.members.me?.roles.highest.position! && x.id !== x.guild.roles.everyone.id)

            user_roles.forEach(async role => {
                await user?.roles.remove(role.id, "Protection").catch(() => { })
            });
            break;
        case 'simply+ban':
            user?.ban({ reason: 'Protect!' }).catch(() => { });
            break;
        default:
            return;
    }
}

export const permission = perm;
export const bot = f;
export const helper = h;
export const core = c;