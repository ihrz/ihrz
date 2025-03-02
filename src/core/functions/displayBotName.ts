/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import { ButtonInteraction, ChatInputCommandInteraction, Client, Guild, GuildMember, Interaction, Message, StringSelectMenuInteraction, UserContextMenuCommandInteraction } from "discord.js";
import { DatabaseStructure } from "../../../types/database_structure.js";

export async function footerBuilder(message: ChatInputCommandInteraction<"cached"> | Message | ButtonInteraction | UserContextMenuCommandInteraction | StringSelectMenuInteraction | Interaction | GuildMember | Guild) {
    let name = await displayBotName(message instanceof Guild ? message : message.guild!);
    return { text: name, iconURL: "attachment://footer_icon.png" }
}

export async function footerAttachmentBuilder(interaction: ChatInputCommandInteraction<"cached"> | Message | ButtonInteraction | UserContextMenuCommandInteraction | StringSelectMenuInteraction | Interaction | GuildMember | Guild | Client) {

    var res = await displayBotPP(
        interaction instanceof Client
            ?
            interaction
            :
            interaction.client,
        interaction instanceof Guild
            ?
            interaction.id
            :
            interaction instanceof Client
                ?
                undefined
                :
                interaction.guild?.id!
    );

    if (res.type === 1) {
        return {
            attachment: res.string,
            name: 'footer_icon.png'
        }
    } else {
        var buffer = Buffer.from(res.string, 'base64');

        return {
            attachment: buffer,
            name: 'footer_icon.png'
        }
    }
}

export async function displayBotPP(client: Client, guildId?: string): Promise<{ type: 1 | 2; string: string; }> {
    let botPFP = await client.db.get(`${guildId}.BOT.botPFP`) as DatabaseStructure.DbGuildBotObject["botPFP"];

    if (!botPFP) {
        botPFP = client.user?.displayAvatarURL({ size: 1024 })!;

        return { type: 1, string: botPFP }
    } else {
        return { type: 2, string: botPFP }
    }
};

export async function displayBotName(guild: Guild): Promise<string> {
    let botName = await guild.client.db.get(`${guild.id}.BOT.botName`) as DatabaseStructure.DbGuildBotObject["botName"];

    if (!botName) {
        botName = 'iHorizon';
    };

    return botName;
};