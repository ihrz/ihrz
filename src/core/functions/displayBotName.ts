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

import { ButtonInteraction, ChatInputCommandInteraction, Client, Guild, GuildMember, Interaction, Message, StringSelectMenuInteraction, UserContextMenuCommandInteraction } from "pwss";
import { DatabaseStructure } from "../../../types/database_structure.js";
import { getClient } from "../core.js";
import db from "./DatabaseModel.js";
const client = getClient();

export async function footerBuilder(message: ChatInputCommandInteraction | Message | ButtonInteraction | UserContextMenuCommandInteraction | StringSelectMenuInteraction | Interaction | GuildMember | Guild) {
    let name = await displayBotName(message instanceof Guild ? message.id : message.guild?.id!);
    return { text: name, iconURL: "attachment://footer_icon.png" }
}

export async function footerAttachmentBuilder(interaction: ChatInputCommandInteraction | Message | ButtonInteraction | UserContextMenuCommandInteraction | StringSelectMenuInteraction | Interaction | GuildMember | Guild | Client) {
    return {
        attachment: await displayBotPP(
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
        ),
        name: 'footer_icon.png'
    }
}

export async function displayBotPP(client: Client, guildId?: string): Promise<string> {
    let botPFP = await db.get(`${guildId}.BOT.botPFP`) as DatabaseStructure.DbGuildBotObject["botPFP"];

    if (!botPFP) {
        botPFP = client.user?.displayAvatarURL({ size: 1024 })!;
    };

    return botPFP;
};

export default async function displayBotName(guildId: string): Promise<string> {
    let botName = await db.get(`${guildId}.BOT.botName`) as DatabaseStructure.DbGuildBotObject["botName"];

    if (!botName) {
        botName = client.user?.username!;
    };

    return botName;
};