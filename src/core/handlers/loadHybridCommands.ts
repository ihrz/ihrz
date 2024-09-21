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

import { ApplicationCommandOptionType, Client, Collection } from 'discord.js';
import { opendir } from "fs/promises";
import { join as pathJoin } from "node:path";

import { Command } from "../../../types/command.js";
import { EltType } from "../../../types/eltType.js";
import { Option } from "../../../types/option.js";

import * as argsHelper from '../functions/method.js';
import logger from "../logger.js";

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CommandModule {
    command: Command;
}

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

        if (option.type === ApplicationCommandOptionType.Subcommand) {

            client.content.push(
                {
                    cmd: fullName,
                    messageCmd: 2,
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

let p = path.join(__dirname, '..', '..', 'Interaction', 'HybridCommands');

export default async function loadCommands(client: Client, path: string = p): Promise<void> {

    let directoryTree = await buildDirectoryTree(path);
    let paths = buildPaths(path, directoryTree);

    if (!client.commands) client.commands = new Collection<string, Command>();
    if (!client.message_commands) client.message_commands = new Collection<string, Command>();
    if (!client.method) client.method = argsHelper;

    var i = 0;
    for (let path of paths) {
        if (!path.endsWith('.js') && !path.endsWith('.json')) continue;

        if (path.endsWith('.js')) {
            var module = await import(path);
        } else if (path.endsWith('init.json')) {
            var module = await import(path, { with: { "type": "json" } })
        }

        if (!module) continue;

        if (module && module.command) {
            const { command } = module;
            i++;

            if (command.options) {
                await processOptions(command.options, command.category, command.name, client);

                if (argsHelper.hasSubCommand(command.options)) {
                    const lastSlashIndex = path.lastIndexOf('/');
                    const directoryPath = path.substring(0, lastSlashIndex);
                    for (let option of command.options) {
                        if (option.name) {
                            const commandModule = await import(`${directoryPath}/!${option.name}.js`);
                            option.run = commandModule.default.run
                            client.message_commands.set(option.name, option)

                            let aliases = option.aliases || [];
                            for (let alias of aliases) {
                                if (client.message_commands.has(alias)) {
                                    logger.err(`Alias "${alias}" for command "${command.name}" already exists! Exiting...`.bgRed);
                                    process.exit(1);
                                }                                
                                client.message_commands.set(alias, option);
                            }
                        }
                    }
                }
            };

            if (client.message_commands.has(command.name)) {
                logger.err(`Command "${command.name}" already exists! Exiting...`.bgRed);
                process.exit(1);
            }

            client.content.push({
                cmd: command.name,
                desc: command.description,
                desc_localized: command.description_localizations,
                category: command.category,
                messageCmd: 2,
            });

            client.commands.set(command.name, command);
            client.message_commands.set(command.name, command);

            if (command.aliases) {
                for (let alias of command.aliases) {
                    if (client.message_commands.has(alias)) {
                        logger.err(`Alias "${alias}" for command "${command.name}" already exists! Exiting...`.bgRed);
                        process.exit(1);
                    }
                    client.message_commands.set(alias, command);
                }
            }

        } else if (module?.default?.categoryInitializer) {
            client.category.push(module.default.categoryInitializer);
        };
    };

    logger.log(`${client.config.console.emojis.OK} >> Loaded ${i} Hybrid commands.`);
};
