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

import { AnotherCommand } from "../../../types/anotherCommand";
import { Client, Collection } from "discord.js";
import { readdirSync } from "fs";

export = async (client: Client) => {

    client.applicationsCommands = new Collection<string, AnotherCommand>();

    readdirSync(`${process.cwd()}/dist/src/Interaction/MessageApplicationCommands`).filter(file => file.endsWith(".js")).forEach(file => {
        let cmd = require(`${process.cwd()}/dist/src/Interaction/MessageApplicationCommands/${file}`).command;

        client.applicationsCommands.set(cmd.name, {
            type: cmd.type,
            run: cmd.run,
            name: cmd.name,
            thinking: cmd.thinking
        });
    });

    readdirSync(`${process.cwd()}/dist/src/Interaction/UserApplicationCommands`).filter(file => file.endsWith(".js")).forEach(file => {
        let cmd = require(`${process.cwd()}/dist/src/Interaction/UserApplicationCommands/${file}`).command;

        client.applicationsCommands.set(cmd.name, {
            type: cmd.type,
            run: cmd.run,
            name: cmd.name,
            thinking: cmd.thinking
        });
    });
};