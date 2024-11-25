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

import { Message, Channel, User, Role, GuildMember, APIRole, ChannelType, BaseGuildVoiceChannel, EmbedBuilder, Client, ChatInputCommandInteraction, MessageReplyOptions, InteractionEditReplyOptions, MessageEditOptions, InteractionReplyOptions, ApplicationCommandOptionType, SnowflakeUtil, AnySelectMenuInteraction, BaseGuildTextChannel, PermissionFlagsBits, Guild, time, InteractionDeferReplyOptions, ButtonBuilder, ActionRow, ActionRowBuilder, ComponentType, MessageActionRowComponent, ButtonComponent } from "discord.js";
import { Command } from "../../../types/command.js";
import { Option } from "../../../types/option.js";
import { LanguageData } from "../../../types/languageData.js";
import * as perm from './permissonsCalculator.js'
import * as f from './displayBotName.js';
import * as  h from './helper.js';
import * as c from '../core.js';
import * as html from './html2png.js';
import * as l from './ihorizon-logs.js';

export function isNumber(str: string): boolean {
    return !isNaN(Number(str)) && str.trim() !== "";
}

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

export function role(interaction: Message, args: string[], argsNumber: number): Role | null {
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

export async function createAwesomeEmbed(lang: LanguageData, command: Command, client: Client, interaction: ChatInputCommandInteraction<"cached"> | Message): Promise<EmbedBuilder> {
    var commandName = command.prefixName || command.name;
    var cleanCommandName = commandName.charAt(0).toUpperCase() + commandName.slice(1);;
    var botPrefix = await client.func.prefix.guildPrefix(client, interaction.guildId!);
    var cleanBotPrefix = botPrefix.string;

    if (botPrefix.type === "mention") cleanBotPrefix = lang.hybridcommands_global_prefix_mention;

    let embed = new EmbedBuilder()
        .setTitle(lang.hybridcommands_embed_help_title.replace("${commandName}", cleanCommandName))
        .setColor("LightGrey");

    if (hasSubCommand(command.options)) {
        command.options?.map(x => {
            var shortCommandName = x.prefixName || x.name;
            var pathString = '';

            x.options?.forEach((value) => {
                pathString += value.required ? "**`[" : "**`<";
                pathString += getArgumentOptionTypeWithOptions(value);
                pathString += value.required ? "]`**" + " " : ">`**" + " ";
            });
            var aliases = x.aliases?.map(x => `\`${x}\``).join(", ") || lang.setjoinroles_var_none;
            var use = `${cleanBotPrefix}${shortCommandName} ${pathString}`;

            embed.addFields({
                name: `${cleanBotPrefix}${shortCommandName}`,
                value: lang.hybridcommands_embed_help_fields_value
                    .replace("${aliases}", aliases)
                    .replace("${use}", use)
            });
        });
    } else {
        embed.addFields({
            name: `${cleanBotPrefix}${command.name} `,
            value: `**\`${command.description}\`**`
        });
    }

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
    command: Option | Command | undefined;
}

const isSubCommandArgumentValue = (command: any): command is SubCommandArgumentValue => {
    return command && (command as SubCommandArgumentValue).command !== undefined || command.name !== command?.command
};

export async function checkCommandArgs(message: Message, command: Command, args: string[], lang: LanguageData): Promise<boolean> {
    if (!command) return false;

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
        const missingIndex = args.length;
        await sendErrorMessage(lang, message, cleanBotPrefix, command, expectedArgs, missingIndex);
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
        } else if (i >= args.length && expectedArgs[i].required) {
            await sendErrorMessage(lang, message, cleanBotPrefix, command, expectedArgs, i);
            return false;
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

async function sendErrorMessage(lang: LanguageData, message: Message, botPrefix: string, command: Command, expectedArgs: ArgumentBrief[], errorIndex: number) {
    let argument: string[] = [];
    let fullNameCommand: string;

    expectedArgs.forEach(arg => argument.push(arg.required ? `[${arg.type}]` : `<${arg.type}>`));

    let currentCommand: Command | Option;
    let wrongArgumentName: string = "";
    let errorPosition = "";

    fullNameCommand = command.name!;
    currentCommand = command as any;

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

export async function interactionSend(interaction: ChatInputCommandInteraction<"cached"> | ChatInputCommandInteraction | Message, options: string | MessageReplyOptions | MessageEditOptions | InteractionReplyOptions): Promise<Message> {
    const nonce = SnowflakeUtil.generate().toString();
    if (interaction instanceof ChatInputCommandInteraction) {
        const editOptions: InteractionEditReplyOptions | InteractionDeferReplyOptions | InteractionReplyOptions = typeof options === 'string' ? { content: options } : options;

        if (interaction.replied) {
            return await interaction.editReply(editOptions as InteractionEditReplyOptions);
        } else if (interaction.deferred) {
            await interaction.editReply(editOptions as InteractionEditReplyOptions);
            return await interaction.fetchReply();
        } else {
            const reply = await interaction.reply({ ...editOptions as InteractionReplyOptions, fetchReply: true });
            return reply;
        }
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

export async function channelSend(interaction: Message | ChatInputCommandInteraction<"cached"> | AnySelectMenuInteraction<"cached"> | BaseGuildTextChannel, options: string | MessageReplyOptions | MessageEditOptions): Promise<Message> {
    const nonce = SnowflakeUtil.generate().toString();
    let replyOptions: MessageReplyOptions;

    if (typeof options === 'string') {
        replyOptions = { content: options, allowedMentions: { repliedUser: false } };
    } else {
        replyOptions = {
            ...options,
            content: options.content ?? undefined,
            nonce: nonce,
            enforceNonce: true
        } as MessageReplyOptions;
    }

    if (interaction instanceof BaseGuildTextChannel) {
        return await interaction.send(replyOptions)!;
    } else {
        return await (interaction.channel as BaseGuildTextChannel)?.send(replyOptions)!;
    }
}

export function hasSubCommand(options: Option[] | undefined): boolean {
    if (!options) return false;
    return options.some(option => option.type === ApplicationCommandOptionType.Subcommand);
}

export function hasSubCommandGroup(options: Option[] | undefined): boolean {
    if (!options) return false;
    return options.some(option => option.type === ApplicationCommandOptionType.SubcommandGroup);
}

export function isSubCommand(option: Option | Command): boolean {
    return option.type === ApplicationCommandOptionType.Subcommand;
}

export async function punish(data: any, user: GuildMember | undefined, reason?: string) {
    async function derank() {
        let user_roles = Array.from(user?.roles.cache.values()!);
        let role_app = user_roles.find(x => x.managed);
        if (role_app) {
            await role_app.setPermissions(PermissionFlagsBits.ViewChannel);
        }

        user_roles
            .filter(x => !x.managed && x.position < x.guild.members.me?.roles.highest.position! && x.id !== x.guild.roles.everyone.id)
            .forEach(async role => {
                await user?.roles.remove(role.id, reason || "Protection").catch(() => { })
            });
    }
    switch (data?.['SANCTION']) {
        case 'simply':
            break;
        case 'simply+derank':
            await derank();
            break;
        case 'simply+ban':
            user?.ban({ reason: reason || 'Protect!' }).catch(async () => await derank().catch(() => false));
            break;
        default:
            return;
    }
}

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
): string {
    return message
        .replaceAll("{memberUsername}", input.user.username)
        .replaceAll("{memberMention}", input.user.toString())
        .replaceAll('{memberCount}', input.guild.memberCount?.toString()!)
        .replaceAll('{createdAt}', input.user.createdAt.toLocaleDateString(input.guildLocal))
        .replaceAll('{accountCreationTimestamp}', time(input.user.createdAt))
        .replaceAll('{guildName}', input.guild.name)
        .replaceAll('{inviterUsername}', input.inviter?.user.username || `unknow_user`)
        .replaceAll('{inviterMention}', input.inviter?.user.mention || `@unknow_user`)
        .replaceAll('{invitesCount}', input.inviter?.invitesAmount || '1337')
        .replaceAll('{xpLevel}', input.ranks?.level || "1337")
        .replaceAll("\\n", '\n')
        .replaceAll('{artistAuthor}', input.notifier?.artistAuthor || "Ninja")
        .replaceAll('{artistLink}', input.notifier?.artistLink || "https://twitch.tv/Ninja")
        .replaceAll('{mediaURL}', input.notifier?.mediaURL || "https://twitch.tv/Ninja/media");

}

export const findOptionRecursively = (options: Option[], subcommandName: string): Option | undefined => {
    for (const option of options) {
        if (option.name === subcommandName) {
            return option;
        }

        if (option.options && (option.type === ApplicationCommandOptionType.SubcommandGroup || option.type === ApplicationCommandOptionType.Subcommand)) {
            const foundOption = findOptionRecursively(option.options, subcommandName);
            if (foundOption) {
                return foundOption;
            }
        }
    }
    return undefined;
};

export async function buttonReact(msg: Message, button: ButtonBuilder): Promise<Message> {
    let comp = msg.components;
    let isAdd = false;

    if (comp.length >= 5) {
        throw "Too much components on this message!";
    }

    for (let lines of comp) {
        if (lines.components.length < 5 && !isAdd) {
            if (lines.components.find(x => x.type === ComponentType.Button)) {
                let newActionRow: ActionRowBuilder = ActionRowBuilder.from(lines);

                newActionRow.addComponents(button);
                comp[comp.indexOf(lines)] = newActionRow.toJSON() as ActionRow<MessageActionRowComponent>;
                isAdd = true;
                break;
            }
        }
    }

    if (!isAdd) {
        let newActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
        comp.push(newActionRow.toJSON() as ActionRow<MessageActionRowComponent>);
    }

    await msg.edit({ components: comp });

    return msg;
}

export async function buttonUnreact(msg: Message, buttonEmoji: string): Promise<Message> {
    let comp = msg.components;
    let isRemoved = false;

    const newComp = [];

    for (let i = 0; i < comp.length; i++) {
        const actionRow = comp[i];
        const newComponents = actionRow.components.filter(component => {
            if (component.type === ComponentType.Button && component.emoji?.id === buttonEmoji) {
                isRemoved = true;
                return false;
            }
            return true;
        });

        if (newComponents.length > 0) {
            newComp.push({ type: 1, components: newComponents });
        }
    }

    if (!isRemoved) return msg;

    await msg.edit({ components: newComp });
    return msg;
}

export function isAnimated(attachmentUrl: string): boolean {
    const fileName = attachmentUrl.split('/').pop() || '';
    return fileName.startsWith('a_');
}

export const permission = perm;
export const bot = f;
export const helper = h;
export const core = c;
export const imageManipulation = html;
export const iHorizonLogs = l;