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
import { opendir } from "fs/promises";
import { join as pathJoin } from "node:path";

import { Command } from "../../../types/command.js";
import { EltType } from "../../../types/eltType.js";
import { Option } from "../../../types/option.js";

import logger from "../logger.js";

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildDirectoryTree(path: string): Promise<(string | object)[]> {
    let result = [];
    let dir = await opendir(path);
    for await (let dirent of dir) {
        if (!dirent.name.startsWith('!')) {
            if (dirent.isDirectory()) {
                result.push({ name: dirent.name, sub: await buildDirectoryTree(pathJoin(path, dirent.name)) });
            } else {
                result.push(dirent.name);
            }
        }
    }
    return result;
};

function buildPaths(basePath: string, directoryTree: (string | object)[]): string[] {
    let paths = [];
    for (let elt of directoryTree) {
        switch (typeof elt) {
            case "object":
                for (let subElt of buildPaths((elt as EltType).name, (elt as EltType).sub)) {
                    paths.push(pathJoin(basePath, subElt));
                }
                break;
            case "string":
                paths.push(pathJoin(basePath, elt));
                break;
            default:
                throw new Error('Invalid element type');
        }
    }
    return paths;
};

async function processOptions(options: Option[], category: string, parentName: string = "", client: Client) {
    for (let option of options) {
        let fullName = parentName ? `${parentName} ${option.name}` : option.name;

        if (option.type === 1) {

            client.content.push(
                {
                    cmd: fullName,
                    messageCmd: false,
                    category: category,
                    desc: option.description,
                    desc_localized: option.description_localizations
                }
            )

        };
        if (option.options) {
            await processOptions(option.options, category, fullName, client);
        };
    };
};

let p = path.join(__dirname, '..', '..', 'Interaction', 'SlashCommands');

export default async function loadCommands(client: Client, path: string = p): Promise<void> {

    let directoryTree = await buildDirectoryTree(path);
    let paths = buildPaths(path, directoryTree);

    client.commands = new Collection<string, Command>();

    var i = 0;
    for (let path of paths) {
        if (!path.endsWith('.js') && !path.endsWith('.json')) continue;
        i++;

        let module;
        if (path.endsWith('.js')) {
            module = await import(path);
        } else if (path.endsWith('init.json')) {
            module = await import(path, { with: { "type": "json" } })
        }

        if (module && module.command) {
            const { command } = module;

            if (command.options) {
                await processOptions(command.options, command.category, command.name, client);
            };

            client.content.push(
                {
                    cmd: command.name,
                    desc: command.description,
                    category: command.category,
                    messageCmd: false,
                    desc_localized: command.description_localizations
                }
            )

            client.commands.set(command.name, command);
        } else if (module?.default?.categoryInitializer) {
            client.category.push(module.default.categoryInitializer);
        };
    };

    logger.log(`${client.config.console.emojis.OK} >> Loaded ${i} Slash commands.`);
};
