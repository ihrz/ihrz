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

import { ApplicationCommandOptionType, BaseGuildTextChannel, Client, EmbedBuilder, GuildChannel, GuildMember, Message, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { LanguageData } from '../../../types/languageData';
import { Command } from '../../../types/command';
import { BotEvent } from '../../../types/event';
import { Option } from '../../../types/option';
import { appendFile } from 'node:fs';

type MessageCommandResponse = {
    success: boolean,
    args?: string[],
    command?: Command,
    subCommand?: Option | Command
};

export async function parseMessageCommand(client: Client, message: Message): Promise<MessageCommandResponse> {
    const prefix = await client.func.prefix.guildPrefix(client, message.guildId!);
    if (!message.content.startsWith(prefix.string)) {
        return { success: false };
    }

    const args = message.content.slice(prefix.string.length).trim().split(/ +/g);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) {
        return { success: false };
    }

    if (message.reference && message.reference.messageId) {
        const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
        if (referencedMessage && referencedMessage.author) {
            const mainCommand = client.message_commands.get(commandName);
            if (mainCommand && mainCommand.options) {
                const userOptionIndex = mainCommand.options.findIndex(opt => opt.type === ApplicationCommandOptionType.User);
                if (userOptionIndex !== -1 && args.length < mainCommand.options.length) {
                    args.splice(userOptionIndex, 0, referencedMessage.author.id);
                }
            }
        }
    }

    const directSubCommand = client.subCommands.get(commandName);
    if (directSubCommand) {
        const parentCommand = client.commands.find(cmd =>
            cmd.options?.some(opt => opt.name === directSubCommand.name)
        );
        return {
            success: true,
            args: args,
            command: parentCommand,
            subCommand: directSubCommand
        };
    }

    const mainCommand = client.message_commands.get(commandName);
    if (mainCommand) {
        const potentialSubCommandName = args[0]?.toLowerCase();
        if (potentialSubCommandName && mainCommand.options) {
            const subCommand = mainCommand.options.find(opt =>
                (opt.name === potentialSubCommandName ||
                    opt.aliases?.includes(potentialSubCommandName))
                &&
                opt.type === (1 || 2)//sub or subgroup
            );
            if (subCommand) {
                args.shift();
                return {
                    success: true,
                    args: args,
                    command: mainCommand,
                    subCommand: subCommand
                };
            }
        }
        return {
            success: true,
            args: args,
            command: mainCommand
        };
    }

    return { success: false };
}

async function executeCommand(
    client: Client,
    message: Message,
    command: Command,
    args: string[],
    lang: LanguageData,
) {
    const channel = message.channel as GuildChannel;
    const permissions = channel.permissionsFor(message.member!);
    const canUseCommands = permissions.has(PermissionsBitField.Flags.UseApplicationCommands);

    if (!canUseCommands) return;

    let permCheck = await client.method.permission.checkCommandPermission(message, command!);
    if (!permCheck.allowed) return client.method.permission.sendErrorMessage(message, lang, permCheck.neededPerm || 0);

    // for format like: "+utils" without subcommand behind
    if (!command?.run) {
        await client.method.interactionSend(message, {
            embeds: [await client.method.createAwesomeEmbed(lang, command, client, message)],
            files: [await client.method.bot.footerAttachmentBuilder(message)]
        });
        return;
    }

    var _ = await client.method.checkCommandArgs(message, command, Array.from(args), lang); if (!_) return;
    await command.run(client, message, lang, command, permCheck.neededPerm, args);
}

export const event: BotEvent = {
    name: "messageCreate",
    run: async (client: Client, message: Message) => {
        if (!message.guild || message.author.bot || !message.channel) return;

        if (await client.method.helper.coolDown(message, "msg_commands", 1000)) {
            return;
        }

        if (await client.db.table('BLACKLIST').get(`${message.author.id}.blacklisted`)) {
            return;
        }

        const result = await parseMessageCommand(client, message);
        if (!result.success) return;

        try {
            const lang = await client.func.getLanguageData(message.guildId) as LanguageData;

            if (result.subCommand) {
                await executeCommand(client, message, result.subCommand as Command, result.args || [], lang);
            }
            else if (result.command) {
                await executeCommand(client, message, result.command, result.args || [], lang);
            }
        } catch (error) {
        }
    }
};