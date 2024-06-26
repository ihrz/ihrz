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

import {
    ActionRowBuilder,
    APIModalInteractionResponseCallbackData,
    CacheType,
    Interaction,
    MessageComponentInteraction,
    ModalBuilder,
    ModalSubmitInteraction,
    TextInputBuilder,
    TextInputStyle
} from 'pwss';

export interface ModalOptionsBuilder {
    title: string;
    customId: string;
    deferUpdate: boolean;

    fields: {
        customId: string;
        placeHolder?: string;
        label: string;
        style: TextInputStyle;
        required: boolean;
        maxLength?: number;
        minLength?: number
    }[]
}

export function iHorizonModalBuilder(modalOptions: ModalOptionsBuilder): APIModalInteractionResponseCallbackData {
    let modal = new ModalBuilder()
        .setCustomId(modalOptions.customId)
        .setTitle(modalOptions.title);

    modalOptions.fields.forEach((content) => {
        let _ = new TextInputBuilder()
            .setCustomId(content.customId)
            .setLabel(content.label)
            .setStyle(content.style)
            .setRequired(content.required)
            .setMaxLength(content.maxLength || 20)
            .setMinLength(content.minLength || 5);

        if (content?.placeHolder) {
            _.setPlaceholder(content.placeHolder)
        }

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(_));
    });

    return modal.toJSON();
}

const cache: number[] = [];

export async function iHorizonModalResolve(modalOptions: ModalOptionsBuilder, interaction: Interaction): Promise<ModalSubmitInteraction<CacheType> | undefined> {
    const { deferUpdate = true } = modalOptions;
    modalOptions.deferUpdate = deferUpdate;

    let modal = iHorizonModalBuilder(modalOptions);

    await (interaction as MessageComponentInteraction).showModal(modal);

    let response = await (interaction as MessageComponentInteraction).awaitModalSubmit({
        filter: (i) => i.customId === modalOptions.customId && i.user.id === interaction.user.id,
        time: 240_000
    });

    if (cache.includes(parseInt(response.id))) {
        return undefined;
    };
    cache.push(parseInt(response.id));
    if (deferUpdate) {
        await response.deferUpdate();
    }

    return response;
}