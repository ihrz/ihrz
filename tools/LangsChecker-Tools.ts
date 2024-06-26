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

import logger from '../src/core/logger.js'
import '../src/core/functions/colors.js';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import readline from 'readline';

logger.legacy("[*] iHorizon Discord Bot (https://github.com/ihrz/ihrz).".gray);
logger.legacy("[*] Warning: iHorizon Discord bot is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International".gray);
logger.legacy("[*] Please respect the terms of this license. Learn more at: https://creativecommons.org/licenses/by-nc-sa/4.0".gray);

interface TypingsFiles {
    [key: string]: string;
}

function generateTypeScriptType(json: any, name: string = "Root"): string {
    if (Array.isArray(json)) {
        if (json.length === 0) {
            return `${name}[]`;
        } else {
            const arrayType = generateTypeScriptType(json[0], `${name}Item`);
            return `${arrayType}[]`;
        }
    } else if (typeof json === 'object' && json !== null) {
        let typeString = `{\n`;
        for (const key in json) {
            if (json.hasOwnProperty(key)) {
                const value = json[key];
                const valueType = generateTypeScriptType(value, capitalizeFirstLetter(key));
                typeString += `  ${key}: ${valueType};\n`;
            }
        }
        typeString += `}`;
        return typeString;
    } else {
        return getPrimitiveType(json);
    }
}

function getPrimitiveType(value: any): string {
    switch (typeof value) {
        case 'string':
            return 'string';
        case 'number':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'object':
            return 'null';
        default:
            return 'any';
    }
}

function capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function parseType(typeStr: string): any {
    typeStr = typeStr.replace(/[\n\r]/g, '');
    typeStr = typeStr.replace(/\s+/g, ' ');
    if (typeStr.startsWith('{') && typeStr.endsWith('}')) {
        typeStr = typeStr.slice(1, -1).trim();
        const obj: any = {};
        const keyValuePairs = typeStr.split(';').map(kvp => kvp.trim()).filter(kvp => kvp);
        for (const kvp of keyValuePairs) {
            const [key, value] = kvp.split(':').map(part => part.trim());
            obj[key] = parseType(value);
        }
        return obj;
    }
    return typeStr;
}

function compareParsedTypes(parsed1: any, parsed2: any, path: string = ''): string[] {
    const differences: string[] = [];

    if (typeof parsed1 !== typeof parsed2) {
        differences.push(`Type mismatch at ${path}: ${parsed1} vs ${parsed2}`);
        return differences;
    }

    if (typeof parsed1 === 'object' && parsed1 !== null && parsed2 !== null) {
        const keys1 = Object.keys(parsed1);
        const keys2 = Object.keys(parsed2);

        for (const key of keys1) {
            if (!keys2.includes(key)) {
                differences.push(`Missing key '${key}' at ${path}`);
                continue;
            }
            differences.push(...compareParsedTypes(parsed1[key], parsed2[key], `${path}.${key}`));
        }

        for (const key of keys2) {
            if (!keys1.includes(key)) {
                differences.push(`Extra key '${key}' at ${path}`);
            }
        }
    } else if (parsed1 !== parsed2) {
        differences.push(`Value mismatch at ${path}: ${parsed1} vs ${parsed2}`);
    }

    return differences;
}

function mergeTypes(type1: string, type2: string): string {
    const parsedType1 = parseType(type1);
    const parsedType2 = parseType(type2);

    const mergedType = { ...parsedType1, ...parsedType2 };

    return generateMergedTypeString(mergedType);
}

function generateMergedTypeString(json: any): string {
    let typeString = `{\n`;
    for (const key in json) {
        if (json.hasOwnProperty(key)) {
            const value = json[key];
            const valueType = typeof value === 'object' && value !== null ? generateMergedTypeString(value) : value;
            typeString += `  ${key}: ${valueType};\n`;
        }
    }
    typeString += `}`;
    return typeString;
}

function promptUser(): Promise<number> {
    const rl = readline.createInterface({
        input: process.stdin as any,
        output: process.stdout as any
    });

    return new Promise((resolve) => {
        rl.question('Choose an option:\n1. [EXIT]\n2. Create TypeScript Interface files\n', (answer) => {
            rl.close();
            resolve(parseInt(answer, 10));
        });
    });
}

async function main() {
    const langsPath = path.join(process.cwd(), 'src', 'lang');
    const langsContent = readdirSync(langsPath);

    logger.legacy(`[-] Starting to check ${langsContent.length} lang files!`);

    let TypingFiles: TypingsFiles = {};

    for (const langFile of langsContent) {
        const langData = yaml.load(readFileSync(path.join(langsPath, langFile), 'utf-8'));
        TypingFiles[langFile] = generateTypeScriptType(langData);
    }

    const typeValues = Object.entries(TypingFiles);
    const [referenceFile, referenceType] = typeValues[0];
    const parsedReferenceType = parseType(referenceType);
    let allMatch = true;

    for (let i = 1; i < typeValues.length; i++) {
        const [currentFile, currentType] = typeValues[i];
        const parsedCurrentType = parseType(currentType);
        const differences = compareParsedTypes(parsedReferenceType, parsedCurrentType, `Root`);

        if (differences.length > 0) {
            allMatch = false;
            logger.err(`[x] Mismatch found in file ${currentFile} compared to ${referenceFile}`);
            differences.forEach(diff => logger.err(diff));
        }
    }

    if (allMatch) {
        logger.log('All typings are identical.');
    } else {
        logger.log('Some typings do not match.');
    }

    const userChoice = await promptUser();

    if (userChoice === 2) {
        let mergedType = referenceType;

        for (let i = 1; i < typeValues.length; i++) {
            const [_, currentType] = typeValues[i];
            mergedType = mergeTypes(mergedType, currentType);
        }

        const outputFilePath = path.join(langsPath, `LanguageData.d.ts`);
        const interfaceContent = `export interface LanguageData ${mergedType}`;
        writeFileSync(outputFilePath, interfaceContent, 'utf-8');
        logger.log(`[+] TypeScript definition file created: ${outputFilePath}`);
    }
}

main();