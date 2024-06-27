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

import { Message, Channel, User } from "pwss";

export function user(interaction: Message, argsNumber: number): User | null {
    return interaction.mentions.users
        .map(x => x)
        .filter(x => x.id !== interaction.client.user?.id!)
    [argsNumber] || interaction.author;
}

export function channel(interaction: Message, argsNumber: number): Channel | null {
    return interaction.mentions.channels
        .map(x => x)
    [argsNumber] || null;
}

export function string(interaction: Message, argsNumber: number): string | null {
    return interaction.content.split(" ")
    [argsNumber] || null;
}

export function number(interaction: Message, argsNumber: number): number {
    let _ = interaction.content.split(" ")[argsNumber];
    return Number.isNaN(parseInt(_)) ? 0 : parseInt(_);
}