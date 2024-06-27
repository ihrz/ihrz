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

import { Client, Collection } from 'pwss';
import { readdirSync } from "node:fs";

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async (client: Client) => {

    client.selectmenu = new Collection<string, Function>();
    client.buttons = new Collection<string, Function>();
    client.func = {};

    readdirSync(path.join(__dirname, '..', '..', 'Interaction', 'Components', 'Buttons')).filter(file => file.endsWith(".js")).forEach(async file => {
        const buttons = await import(path.join(__dirname, '..', '..', 'Interaction', 'Components', 'Buttons', file));
        client.buttons.set(file.split('.js')[0], buttons.default || buttons);
    });

    readdirSync(path.join(__dirname, '..', '..', 'core', 'functions')).filter(file => file.endsWith(".js")).forEach(async file => {
        const functions = await import(path.join(__dirname, '..', '..', 'core', 'functions', file));
        client.func[file.split('.js')[0]] = functions.default || functions;
    });

    readdirSync(path.join(__dirname, '..', '..', 'Interaction', 'Components', 'SelectMenu')).filter(file => file.endsWith(".js")).forEach(async file => {
        let selectmenu = await import(path.join(__dirname, '..', '..', 'Interaction', 'Components', 'SelectMenu', file));
        client.selectmenu.set(file.split('.js')[0], selectmenu.default || selectmenu);
    });
};