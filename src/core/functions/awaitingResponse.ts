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

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, Interaction, Message } from "discord.js";

export interface LangForPrompt {
    content: string;
    yesButton: string;
    noButton: string;
    dangerAction: boolean;
}

export async function promptYesOrNo(interaction: ChatInputCommandInteraction<"cached"> | Message, opt: LangForPrompt) {
    const sent = await interaction.client.func.method.interactionSend(interaction, {
        content: opt.content,
        components: [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("yes")
                        .setStyle(opt.dangerAction ? ButtonStyle.Danger : ButtonStyle.Success)
                        .setLabel(opt.yesButton),
                    new ButtonBuilder()
                        .setCustomId("blank1")
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel('<   >')
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId("no")
                        .setStyle(opt.dangerAction ? ButtonStyle.Success : ButtonStyle.Danger)
                        .setLabel(opt.noButton),
                )
        ]
    });
    let e = (await sent.awaitMessageComponent({ componentType: ComponentType.Button, filter: (x) => x.user.id === interaction.member?.user.id }));

    e.deferUpdate();

    return e.customId === "yes" ? true : false;
}