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
    ChatInputCommandInteraction,
    Client,
} from 'pwss';

import { LanguageData } from '../../../../types/languageData';

export default {
    run: async (client: Client, interaction: ChatInputCommandInteraction, data: LanguageData) => {
        // Guard's Typing
        if (!interaction.member || !client.user || !interaction.user || !interaction.guild || !interaction.channel) return;

        let i: number;

        let alpha = " ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
        let morse = "/,.-,-...,-.-.,-..,.,..-.,--.,....,..,.---,-.-,.-..,--,-.,---,.--.,--.-,.-.,...,-,..-,...-,.--,-..-,-.--,--..,.----,..---,...--,....-,.....,-....,--...,---..,----.,-----".split(",");
        let text = interaction.options.getString("input")?.toUpperCase() as string;

        while (text.includes("Ä") || text.includes("Ö") || text.includes("Ü")) {
            text = text.replace("Ä", "AE").replace("Ö", "OE").replace("Ü", "UE");
        };

        if (text.startsWith(".") || text.startsWith("-")) {
            let textArray = text.split(" ");
            let length = textArray.length;
            for (i = 0; i < length; i++) {
                textArray[i] = alpha[morse.indexOf(textArray[i])];
            };

            text = textArray.join("");
        } else {
            let textArray = text.split("");
            let length = textArray.length;
            for (i = 0; i < length; i++) {
                textArray[i] = morse[alpha.indexOf(textArray[i])];
            };

            text = textArray.join(" ");
        }
        await interaction.editReply({ content: '```' + text + '```' });
        return;
    },
};