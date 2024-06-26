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

import { join as pathJoin } from 'node:path';
import { opendir } from 'fs/promises';
import { Client } from 'pwss';

import logger from '../logger.js';

import { BotEvent } from '../../../types/event.js';

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadedEvents = new Set<string>();

interface DirectoryTreeItem {
    name: string;
    sub: DirectoryTreeItem[];
}

async function buildDirectoryTree(path: string): Promise<DirectoryTreeItem[]> {
    const result: DirectoryTreeItem[] = [];
    const dir = await opendir(path);
    for await (const dirent of dir) {
        if (dirent.isDirectory()) {
            result.push({ name: dirent.name, sub: await buildDirectoryTree(pathJoin(path, dirent.name)) });
        } else if (dirent.name.endsWith('.js')) {
            result.push({ name: dirent.name, sub: [] });
        }
    }
    return result;
}

function buildPaths(basePath: string, directoryTree: DirectoryTreeItem[]): string[] {
    const paths: string[] = [];
    for (const elt of directoryTree) {
        if (elt.sub.length === 0) {
            paths.push(pathJoin(basePath, elt.name));
        } else {
            paths.push(...buildPaths(pathJoin(basePath, elt.name), elt.sub));
        }
    }
    return paths;
}

let p = path.join(__dirname, '..', '..', 'Events');

async function loadEvents(client: Client, pathDir = p): Promise<void> {
    const directoryTree = await buildDirectoryTree(pathDir);
    const paths = buildPaths(pathDir, directoryTree);

    await Promise.all(paths.map(async (filePath) => {
        if (loadedEvents.has(filePath)) {
            logger.warn(`Event ${filePath} already loaded. Skipping.`);
            return;
        }
        loadedEvents.add(filePath);

        try {
            const imported = await import(filePath);
            if (!imported?.event) return;
            client.on((imported.event as BotEvent).name, (imported.event as BotEvent).run.bind(null, client));
        } catch (error) {
            logger.err(`Error loading event from file: ${filePath}`);
            throw error;
        }
    }));

    logger.log(`${client.config.console.emojis.OK} >> Loaded ${paths.length} events.`);
}

export default loadEvents;