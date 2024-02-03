/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

import axios from 'axios';

async function isImageUrl(url: string): Promise<boolean> {
    try {
        let response = await axios.head(url);
        let contentType = response.headers["content-type"];
        return contentType.startsWith("image/");
    } catch (error) {
        return false;
    }
};

export default async function image64(arg: string): Promise<Buffer | undefined> {
    let response = await axios.get(arg, { responseType: 'arraybuffer' });

    if (await isImageUrl(arg)) {
        return Buffer.from(response.data, 'base64');
    };

    return undefined;
};