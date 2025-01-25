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

import config from "../../files/config.js";
import { axios } from "./axios.js";
import { encrypt } from "./encryptDecryptMethod.js";
import { env } from "../../version.js";

export async function getToken(): Promise<string | undefined> {
    if (config.api.HorizonGateway && env === "production") {
        let url = config.api.HorizonGateway + "/api/ihorizon/v1/login";
        let key = config.api.apiToken;

        try {
            let res = await axios.post(url, {
                apiToken: encrypt(key, key),
                clientID: encrypt(key, config.api.clientID)
            },
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );
            return res.data?.token;
        } catch {
            return undefined;
        }
    } else {
        return undefined;
    }
}