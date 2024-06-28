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

import { Message, Channel, User, Role, GuildMember, APIRole, ChannelType, BaseGuildVoiceChannel, EmbedBuilder, Client, Embed } from "pwss";
import { Command } from "../../../types/command";

export function user(interaction: Message, argsNumber: number): User | null {
    return interaction.content.startsWith(`<@${interaction.client.user.id}`)
        ?
        interaction.mentions.parsedUsers
            .map(x => x)
            .filter(x => x.id !== interaction.client.user?.id!)[argsNumber]
        :
        interaction.mentions.parsedUsers
            .map(x => x)[argsNumber]
        || null
}

export function member(interaction: Message, argsNumber: number): GuildMember | undefined | null {
    return interaction.content.startsWith(`<@${interaction.client.user.id}`)
        ?
        interaction.mentions.members?.map(x => x)
            .filter(x => x.id !== interaction.client.user?.id!)[argsNumber]
        :
        interaction.mentions.members?.map(x => x)[argsNumber]
        || null
}

export function voiceChannel(interaction: Message, argsNumber: number): BaseGuildVoiceChannel | null {
    return interaction.mentions.channels
        .map(x => x)
        .filter(x => x.type === ChannelType.GuildVoice || ChannelType.GuildStageVoice)
    [argsNumber] as BaseGuildVoiceChannel || null;
}

export function channel(interaction: Message, argsNumber: number): Channel | null {
    return interaction.mentions.channels
        .map(x => x)
    [argsNumber] || null;
}

export function role(interaction: Message, argsNumber: number): Role | APIRole | null {
    return interaction.mentions.roles
        .map(x => x)
    [argsNumber] || null;
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

export async function createAwesomeEmbed(command: Command, client: Client, interaction: Message): Promise<EmbedBuilder> {
    const getType = (type: number): string => {
        switch (type) {
            case 3:
                return "string"
            case 6:
                return "user"
            case 8:
                return "roles"
            case 10:
            case 4:
                return "number"
            case 7:
                return "channel"
            default:
                return "default"
        }
    }

    const embed = new EmbedBuilder()
        .setTitle(command.name.charAt(0).toUpperCase() + command.name.slice(1) + " Help Embed")
        .setColor("LightGrey");
    const body = {};

    var botPrefix = await client.func.prefix.guildPrefix(client, interaction.guildId!);
    var cleanBotPrefix = botPrefix.string;

    if (botPrefix.type === "mention") { cleanBotPrefix = "`@Ping-Me`" };

    command.options?.map(x => {
        var pathString = '';
        var fullNameCommand = command.name + " " + x.name;

        x.options?.forEach((value) => {
            value.required ? pathString += "**`[" : pathString += "**`<"
            pathString += getType(value.type)
            value.required ? pathString += "]`**" + " " : pathString += ">`**" + " "
        })
        embed.addFields({
            name: cleanBotPrefix + fullNameCommand,
            value: `**Aliases:** ${x.aliases?.map(x => `\`${x}\``)
                .join(", ") || "None"}\n**Use:** ${cleanBotPrefix}${fullNameCommand} ${pathString}`
        })
    })

    return embed;
}