/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2023 iHorizon
*/

import { TicketTranscript } from '../core/ticketsManager';

export = async function (interaction: any, data: any) {
    await interaction.deferUpdate();

    let userId = '171356978310938624';
    let user = await interaction.client.users.fetch(userId);

    let message = 'Salut je suis le message qui casse les couilles';

    user.send(message)
        .then(() => {
            console.log('gg ca a marché')
        })
        .catch((error: any) => {
            console.error(`1Erreur clc : ${error}`);
        });


    //    await interaction.user.send('Voici les staffs d\'iHorizon\n**Kisakay** `Développeuse d\'iHorizon`\n**NayaWeb** `Développeuse d\'iHorizon et du site ainsi que la documentation`.\n**Noémie** `Développeuse et Directrice Marketting`');
    //    return;
};