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

import { join } from 'path';
import fs from 'fs';
import path from 'path';
import logger from '../src/core/logger.js';

const all_imports: Record<string, string> = {};
const all_exports: Record<string, string> = {};
const all_vars: Record<string, any> = {};
const all_types: Record<string, string> = {};

interface DirectoryTreeItem {
	name: string;
	sub: DirectoryTreeItem[];
}

/**
 * Build a directory tree from a path
 * @param path The path to build the tree from
 * @returns The directory tree
*/
async function buildDirectoryTree(dirPath: string): Promise<DirectoryTreeItem[]> {
	const result: DirectoryTreeItem[] = [];
	const dir = fs.opendirSync(dirPath);
	for await (const dirent of dir) {
		if (dirent.isDirectory()) {
			result.push({ name: dirent.name, sub: await buildDirectoryTree(join(dirPath, dirent.name)) });
		} else if (dirent.name.endsWith('.js') || dirent.name.endsWith('.json')) {
			result.push({ name: dirent.name, sub: [] });
		}
	}
	return result;
}

/**
 * Build a directory tree including exclamation mark files
 * @param path The path to build the tree from
 * @returns The directory tree
 */
async function buildFullDirectoryTree(dirPath: string): Promise<DirectoryTreeItem[]> {
	const result: DirectoryTreeItem[] = [];
	const dir = fs.opendirSync(dirPath);
	for await (const dirent of dir) {
		if (dirent.isDirectory()) {
			result.push({ name: dirent.name, sub: await buildFullDirectoryTree(join(dirPath, dirent.name)) });
		} else if (dirent.name.endsWith('.js') || dirent.name.endsWith('.json')) {
			result.push({ name: dirent.name, sub: [] });
		}
	}
	return result;
}

/**
 * Build a directory tree from a path, escaping exclamation marks
 * @param path The path to build the tree from
 * @returns The directory tree
 */
async function buildDirectoryTreeEscapeExclamation(dirPath: string): Promise<DirectoryTreeItem[]> {
	const result: DirectoryTreeItem[] = [];
	const dir = fs.opendirSync(dirPath);
	for await (let dirent of dir) {
		if (!dirent.name.startsWith('!')) {
			if (dirent.isDirectory()) {
				result.push({ name: dirent.name, sub: await buildDirectoryTreeEscapeExclamation(join(dirPath, dirent.name)) });
			} else {
				result.push({ name: dirent.name, sub: [] });
			}
		}
	}
	return result;
};

/**
 * Build paths from a directory tree
 * @param basePath The base path
 * @param directoryTree The directory tree
 * @returns The paths
 */
function buildPaths(basePath: string, directoryTree: DirectoryTreeItem[]): string[] {
	const paths: string[] = [];
	for (const elt of directoryTree) {
		if (elt.sub.length === 0) {
			paths.push(join(basePath, elt.name));
		} else {
			paths.push(...buildPaths(join(basePath, elt.name), elt.sub));
		}
	}
	return paths;
}


// Other functions from the original file...
function loadAnotherStuff() {
	const components_button = join(process.cwd(), "dist", "src", 'Interaction', 'Components', 'Buttons');
	const components_select_menu = join(process.cwd(), "dist", "src", 'Interaction', 'Components', 'SelectMenu');
	const core_functions = join(process.cwd(), "dist", "src", 'core', 'functions');

	all_exports["components_button"] = '';
	all_imports["components_button"] = '';
	all_exports["core_functions"] = '';
	all_imports["core_functions"] = '';
	all_exports["components_select_menu"] = '';
	all_imports["components_select_menu"] = '';

	fs.readdirSync(components_button)
		.filter(file => file.endsWith(".js"))
		.forEach(file => {
			const commandPath = `./src/Interaction/Components/Buttons/${file}`;
			let commandName = file
				.replace('.js', '')
				.replaceAll('-', '_')
				.replaceAll('!', '_');
			commandName = `component_button_${commandName}`;

			all_imports["components_button"] += `import * as _${commandName}_  from '${commandPath}';\n`;
			all_exports["components_button"] += `  _${commandName}_,\n`;
		});

	fs.readdirSync(core_functions)
		.filter(file => file.endsWith(".js"))
		.forEach(file => {
			const commandPath = `./src/core/functions/${file}`;
			var commandName = file
				.replace('.js', '')
				.replaceAll('-', '_')
				.replaceAll('!', '_');
			commandName = `core_function_${commandName}`;

			all_imports["core_functions"] += `import * as _${commandName}_  from '${commandPath}';\n`;
			all_exports["core_functions"] += `  _${commandName}_,\n`;
		});

	fs.readdirSync(components_select_menu)
		.filter(file => file.endsWith(".js"))
		.forEach(file => {
			const commandPath = `./src/Interaction/Components/SelectMenu/${file}`;
			let commandName = file
				.replace('.js', '')
				.replaceAll('-', '_')
				.replaceAll('!', '_');
			commandName = `component_select_menu_${commandName}`;

			all_imports["components_select_menu"] += `import * as _${commandName}_  from '${commandPath}';\n`;
			all_exports["components_select_menu"] += `  _${commandName}_,\n`;
		});
}

function loadApplicationCommands() {
	const MessageApplicationCommands = join(process.cwd(), "dist", "src", 'Interaction', 'MessageApplicationCommands');
	const UserApplicationCommands = join(process.cwd(), "dist", "src", 'Interaction', 'UserApplicationCommands');

	all_exports["MessageApplicationCommands"] = '';
	all_imports["MessageApplicationCommands"] = '';
	all_exports["UserApplicationCommands"] = '';
	all_imports["UserApplicationCommands"] = '';

	fs.readdirSync(MessageApplicationCommands)
		.filter(file => file.endsWith(".js"))
		.forEach(file => {
			const commandPath = `./src/Interaction/MessageApplicationCommands/${file}`;
			let commandName = file
				.replace('.js', '')
				.replaceAll('-', '_')
				.replaceAll('!', '_');
			commandName = `message_app_${commandName}`;

			all_imports["MessageApplicationCommands"] += `import * as _${commandName}_  from '${commandPath}';\n`;
			all_exports["MessageApplicationCommands"] += `  _${commandName}_,\n`;
		});

	fs.readdirSync(UserApplicationCommands)
		.filter(file => file.endsWith(".js"))
		.forEach(file => {
			const commandPath = `./src/Interaction/UserApplicationCommands/${file}`;
			let commandName = file
				.replace('.js', '')
				.replaceAll('-', '_')
				.replaceAll('!', '_');
			commandName = `user_app_${commandName}`;

			all_imports["UserApplicationCommands"] += `import * as _${commandName}_  from '${commandPath}';\n`;
			all_exports["UserApplicationCommands"] += `  _${commandName}_,\n`;
		});
}

function loadHTML() {
	const assets_dir = join(process.cwd(), "src", 'assets');

	all_vars["html_files"] = {};
	all_types["html_files"] = "export const html_files: Record<string, string>\n";
	fs.readdirSync(assets_dir)
		.filter(file => file.endsWith(".html"))
		.forEach(file => {
			const htlmContent = fs.readFileSync(join(assets_dir, file), "utf-8");
			all_vars["html_files"][file.split('.html')[0]] = htlmContent;
		});
}

async function loadEvents() {
	const events = join(process.cwd(), "dist", "src", 'Events');
	all_exports["events"] = '';
	all_imports["events"] = '';

	const directoryTree = await buildDirectoryTree(events);
	const paths = buildPaths(events, directoryTree);

	for (let filePath of paths) {
		// Get the file name
		let fileName = (filePath
			.split('/')
			.pop()!
			.split(".")[0]) as string;
		fileName = `event_${fileName}`;

		if (all_exports["events"].includes(fileName)) {
			fileName += "_".repeat(all_exports["events"].split(fileName).length - 1);
		}

		all_exports["events"] += `  ${fileName},\n`;
		all_imports["events"] += `import * as ${fileName} from '${filePath}';\n`;
	}
}

async function loadMessageCommands() {
	const MessageCommands = join(process.cwd(), "dist", "src", 'Interaction', 'MessageCommands');
	all_exports["MessageCommands"] = '';
	all_imports["MessageCommands"] = '';

	const directoryTree = await buildDirectoryTree(MessageCommands);
	const paths = buildPaths(MessageCommands, directoryTree);

	for (let filePath of paths) {
		// Get the file name
		let fileName = (filePath
			.split('/')
			.pop()!
			.replaceAll('!', '_')
			.replaceAll('-', '_')
			.replaceAll('@', '_')
			.split(".")[0]) as string;
		fileName = `msg_command_${fileName}`;

		if (all_exports["MessageCommands"].includes(fileName)) {
			fileName += "_".repeat(all_exports["MessageCommands"].split(fileName).length - 1);
		}

		all_exports["MessageCommands"] += `  ${fileName},\n`;
		all_imports["MessageCommands"] += `import * as ${fileName} from '${filePath}';\n`;
	}
}

async function loadBashCommands() {
	const bash = join(process.cwd(), "dist", "src", 'core', "bash", 'commands');
	all_exports["bash"] = '';
	all_imports["bash"] = '';

	const directoryTree = await buildDirectoryTree(bash);
	const paths = buildPaths(bash, directoryTree);

	for (let filePath of paths) {
		// Get the file name
		let fileName = (filePath
			.split('/')
			.pop()!
			.split(".")[0]) as string;
		fileName = `bash_${fileName}`;

		if (all_exports["bash"].includes(fileName)) {
			fileName += "_".repeat(all_exports["bash"].split(fileName).length - 1);
		}

		all_exports["bash"] += `  ${fileName},\n`;
		all_imports["bash"] += `import * as ${fileName} from '${filePath}';\n`;
	}
}

/**
 * Process slash commands with subcommands
 * @param slashPath The base slash commands path
 */
async function processSlashWithSubcommands() {
	const slashPath = join(process.cwd(), "dist", "src", 'Interaction', 'SlashCommands');

	// Initialize the imports and exports
	all_exports["slash"] = '';
	all_imports["slash"] = '';
	all_exports["subCommands"] = '';
	all_imports["subCommands"] = '';

	// First, get all main command files (non-! files)
	const mainDirectoryTree = await buildDirectoryTreeEscapeExclamation(slashPath);
	const mainCommandPaths = buildPaths(slashPath, mainDirectoryTree);

	// Initialize subcommand mapping
	if (!all_vars["subCommandMapping"]) {
		all_vars["subCommandMapping"] = {};
	}

	// Process main command files and their options
	for (let filePath of mainCommandPaths) {
		let fileName = (filePath
			.split('/')
			.pop()!
			.replaceAll('!', '_')
			.replaceAll('-', '_')
			.split(".")[0]) as string;
		fileName = `slash_${fileName}`;

		if (all_exports["slash"].includes(fileName)) {
			fileName += "_".repeat(all_exports["slash"].split(fileName).length * 2 - 1);
		}

		all_exports["slash"] += `  ${fileName},\n`;
		all_imports["slash"] += filePath.endsWith(".json")
			? `import * as ${fileName} from '${filePath}' with { "type": "json" };\n`
			: `import * as ${fileName} from '${filePath}';\n`;

		// Load and analyze the command file to find subcommands
		try {
			const commandModule = await import(filePath);
			if (commandModule?.command?.options) {
				const dirPath = path.dirname(filePath);
				const parentCommand = path.basename(filePath).split('.')[0];

				// Process command options to find subcommands
				for (const option of commandModule.command.options) {
					if (option.type === 1) { // ApplicationCommandOptionType.Subcommand
						const subcommandPath = join(dirPath, `!${option.name}.js`);
						if (fs.existsSync(subcommandPath)) {
							await loadSubCommand(subcommandPath, commandModule.command.name);
						}
					}
					else if (option.type === 2 && option.options) { // ApplicationCommandOptionType.SubcommandGroup
						for (const subOption of option.options) {
							if (subOption.type === 1) { // Subcommand within group
								const subcommandPath = join(dirPath, `!${subOption.name}.js`);
								if (fs.existsSync(subcommandPath)) {
									await loadSubCommand(subcommandPath, commandModule.command.name, option.name);
								}
							}
						}
					}
				}
			}
		} catch (error) {
			console.error(`Error processing command file ${filePath}:`, error);
		}
	}

	// Create a mapping of parent commands to their directory paths
	all_vars["commandDirectories"] = {};
	for (let filePath of mainCommandPaths) {
		const dirPath = path.dirname(filePath);
		const commandName = path.basename(filePath).split('.')[0];
		all_vars["commandDirectories"][commandName] = dirPath;
	}
}

async function loadSubCommand(subcommandPath: string, parentCommand: string, groupName?: string) {
	const originalFileName = path.basename(subcommandPath);
	let fileName = (originalFileName
		.replaceAll('!', '_')
		.replaceAll('-', '_')
		.split(".")[0]) as string;
	fileName = `slash_sub_${fileName}`;

	if (all_exports["subCommands"].includes(fileName)) {
		fileName += "_".repeat(all_exports["subCommands"].split(fileName).length * 2 - 1);
	}

	// Add to exports and imports
	all_exports["subCommands"] += `  ${fileName},\n`;
	all_imports["subCommands"] += `import * as ${fileName} from '${subcommandPath}';\n`;

	// Extract real subcommand name (without the ! prefix)
	const realSubCommandName = originalFileName.startsWith('!')
		? originalFileName.substring(1).split('.')[0]
		: originalFileName.split('.')[0];

	// Create unique key for subcommand mapping
	const uniqueKey = groupName
		? `${parentCommand}/${groupName}/${realSubCommandName}`
		: `${parentCommand}/${realSubCommandName}`;

	// Add to subcommand mapping
	all_vars["subCommandMapping"][uniqueKey] = {
		parentCommand,
		groupName,
		subCommandName: realSubCommandName,
		importName: fileName
	};
}

/**
 * Process hybrid commands, similar to slash commands but for the hybrid command system
 */
async function processHybridCommands() {
	const hybridPath = join(process.cwd(), "dist", "src", 'Interaction', 'HybridCommands');

	// Initialize the imports and exports
	all_exports["hybrid"] = '';
	all_imports["hybrid"] = '';
	all_exports["hybridSubCommands"] = '';
	all_imports["hybridSubCommands"] = '';

	// First, get all main command files (non-! files)
	const mainDirectoryTree = await buildDirectoryTreeEscapeExclamation(hybridPath);
	const mainCommandPaths = buildPaths(hybridPath, mainDirectoryTree);

	// Initialize hybrid subcommand mapping
	if (!all_vars["hybridSubCommandMapping"]) {
		all_vars["hybridSubCommandMapping"] = {};
	}

	// Process main command files and their options
	for (let filePath of mainCommandPaths) {
		let fileName = (filePath
			.split('/')
			.pop()!
			.replaceAll('!', '_')
			.replaceAll('-', '_')
			.split(".")[0]) as string;
		fileName = `hy_${fileName}`;

		if (all_exports["hybrid"].includes(fileName)) {
			fileName += "_".repeat(all_exports["hybrid"].split(fileName).length - 1);
		}

		all_exports["hybrid"] += `  ${fileName},\n`;
		all_imports["hybrid"] += filePath.endsWith(".json")
			? `import * as ${fileName} from '${filePath}' with { "type": "json" };\n`
			: `import * as ${fileName} from '${filePath}';\n`;

		// Load and analyze the command file to find subcommands
		try {
			const commandModule = await import(filePath);
			if (commandModule?.command?.options) {
				const dirPath = path.dirname(filePath);
				const parentCommand = path.basename(filePath).split('.')[0];

				// Process command options to find subcommands
				for (const option of commandModule.command.options) {
					if (option.type === 1) { // ApplicationCommandOptionType.Subcommand
						const subcommandPath = join(dirPath, `!${option.name}.js`);
						if (fs.existsSync(subcommandPath)) {
							await loadHybridSubCommand(subcommandPath, commandModule.command.name);
						}
					}
					else if (option.type === 2 && option.options) { // ApplicationCommandOptionType.SubcommandGroup
						for (const subOption of option.options) {
							if (subOption.type === 1) { // Subcommand within group
								const subcommandPath = join(dirPath, `!${subOption.name}.js`);
								if (fs.existsSync(subcommandPath)) {
									await loadHybridSubCommand(subcommandPath, commandModule.command.name, option.name);
								}
							}
						}
					}
				}
			}
		} catch (error) {
			console.error(`Error processing hybrid command file ${filePath}:`, error);
		}
	}

	// Create a mapping of parent commands to their directory paths
	if (!all_vars["commandDirectories"]) {
		all_vars["commandDirectories"] = {};
	}

	for (let filePath of mainCommandPaths) {
		const dirPath = path.dirname(filePath);
		const commandName = path.basename(filePath).split('.')[0];
		all_vars["commandDirectories"][commandName] = dirPath;
	}
}

async function loadHybridSubCommand(subcommandPath: string, parentCommand: string, groupName?: string) {
	const originalFileName = path.basename(subcommandPath);
	let fileName = (originalFileName
		.replaceAll('!', '_')
		.replaceAll('-', '_')
		.split(".")[0]) as string;
	fileName = `hy_sub_${fileName}`;

	if (all_exports["hybridSubCommands"].includes(fileName)) {
		fileName += "_".repeat(all_exports["hybridSubCommands"].split(fileName).length - 1);
	}

	// Add to exports and imports
	all_exports["hybridSubCommands"] += `  ${fileName},\n`;
	all_imports["hybridSubCommands"] += `import * as ${fileName} from '${subcommandPath}';\n`;

	// Extract real subcommand name (without the ! prefix)
	const realSubCommandName = originalFileName.startsWith('!')
		? originalFileName.substring(1).split('.')[0]
		: originalFileName.split('.')[0];

	// Create unique key for subcommand mapping
	const uniqueKey = groupName
		? `${parentCommand}/${groupName}/${realSubCommandName}`
		: `${parentCommand}/${realSubCommandName}`;

	// Add to hybrid subcommand mapping
	all_vars["hybridSubCommandMapping"][uniqueKey] = {
		parentCommand,
		groupName,
		subCommandName: realSubCommandName,
		importName: fileName
	};
}

/**
 * Generate helper code to be included in the handler file
 * This function creates the initialization code for loading subcommands
 */
function generateSubCommandLoaderCode() {
	// This will add code to statically import and map all subcommands
	all_vars["initCode"] = `
// Code à ajouter dans votre index.js ou fichier principal pour initialiser les sous-commandes
// Exécuter une seule fois au démarrage du bot

export function initializeSubCommands(client) {
    // Pour chaque sous-commande dans notre mapping (key = parentCommand/subCommandName)
    for (const [uniqueKey, info] of Object.entries(subCommandMapping)) {
        const { parentCommand, subCommandName, importName } = info;
        const subCommandModule = subCommands[importName];
        
        if (!subCommandModule || !subCommandModule.subCommand || !subCommandModule.subCommand.run) {
            console.error(\`Le module de sous-commande \${importName} manque les propriétés requises\`);
            continue;
        }
        
        // Trouver la commande parent et ses options qui correspondent à cette sous-commande
        const command = client.commands.get(parentCommand);
        if (!command || !command.options) {
            console.error(\`Commande parent \${parentCommand} introuvable ou sans options\`);
            continue;
        }
        
        // Traiter les sous-commandes directes et les groupes de sous-commandes
        for (const option of command.options) {
            // Cas 1: Sous-commande directe
            if (option.type === 1 && option.name === subCommandName) {
                option.run = subCommandModule.subCommand.run;
                const commandKey = \`\${parentCommand} \${subCommandName}\`;
                client.subCommands.set(commandKey, option);
                break;
            }
            
            // Cas 2: Sous-commande dans un groupe
            if (option.type === 2 && option.options) {
                for (const subOption of option.options) {
                    if (subOption.type === 1 && subOption.name === subCommandName) {
                        subOption.run = subCommandModule.subCommand.run;
                        const commandKey = \`\${parentCommand} \${option.name} \${subCommandName}\`;
                        client.subCommands.set(commandKey, subOption);
                        break;
                    }
                }
            }
        }
    }
}`;
	all_types["initCode"] = "export function initializeSubCommands(client: any): void;\n";
}

/**
 * Generate helper code for hybrid commands initialization
 */
function generateHybridCommandsLoaderCode() {
	// Add initialization code for hybrid commands
	all_vars["hybridInitCode"] = `
// Code à ajouter dans votre index.js ou fichier principal pour initialiser les commandes hybrides
// Exécuter une seule fois au démarrage du bot

export function initializeHybridCommands(client) {
    // Enregistrer les commandes principales
    for (const [commandName, module] of Object.entries(hybrid)) {
        if (module && module.command) {
            const command = module.command;
            client.commands.set(command.name, command);
            client.message_commands.set(command.name, command);
            
            // Enregistrer les alias si présents
            if (command.aliases) {
                for (const alias of command.aliases) {
                    client.message_commands.set(alias, command);
                }
            }
        }
    }
    
    // Pour chaque sous-commande dans notre mapping (key = parentCommand/subCommandName)
    for (const [uniqueKey, info] of Object.entries(hybridSubCommandMapping || {})) {
        const { parentCommand, subCommandName, importName } = info;
        const subCommandModule = hybridSubCommands[importName];
        
        if (!subCommandModule || !subCommandModule.subCommand || !subCommandModule.subCommand.run) {
            console.error(\`Le module de sous-commande hybride \${importName} manque les propriétés requises\`);
            continue;
        }
        
        // Trouver la commande parent
        const command = client.commands.get(parentCommand);
        if (!command || !command.options) {
            console.error(\`Commande hybride parent \${parentCommand} introuvable ou sans options\`);
            continue;
        }
        
        // Traiter les sous-commandes directes et les groupes de sous-commandes
        for (const option of command.options) {
            // Cas 1: Sous-commande directe
            if (option.type === 1 && option.name === subCommandName) {
                option.run = subCommandModule.subCommand.run;
                const commandKey = \`\${parentCommand} \${subCommandName}\`;
                client.subCommands.set(commandKey, option);
                
                // Enregistrer également comme commande de message pour l'accès direct
                if (option.prefixName) {
                    client.message_commands.set(option.prefixName, option);
                } else {
                    client.message_commands.set(option.name, option);
                }
                
                // Enregistrer les alias si présents
                if (option.aliases) {
                    for (const alias of option.aliases) {
                        client.message_commands.set(alias, option);
                    }
                }
                
                break;
            }
            
            // Cas 2: Sous-commande dans un groupe
            if (option.type === 2 && option.options) {
                for (const subOption of option.options) {
                    if (subOption.type === 1 && subOption.name === subCommandName) {
                        subOption.run = subCommandModule.subCommand.run;
                        const commandKey = \`\${parentCommand} \${option.name} \${subCommandName}\`;
                        client.subCommands.set(commandKey, subOption);
                        
                        // Enregistrer également comme commande de message pour l'accès direct
                        if (subOption.prefixName) {
                            client.message_commands.set(subOption.prefixName, subOption);
                        } else {
                            client.message_commands.set(subOption.name, subOption);
                        }
                        
                        // Enregistrer les alias si présents
                        if (subOption.aliases) {
                            for (const alias of subOption.aliases) {
                                client.message_commands.set(alias, subOption);
                            }
                        }
                        
                        break;
                    }
                }
            }
        }
    }
}`;
	all_types["hybridInitCode"] = "export function initializeHybridCommands(client: any): void;\n";

	// Helper methods code remains the same
	all_vars["hybridHelpers"] = `
// Fonctions utilitaires pour traiter les options de commandes hybrides

export function processOptions(options, category, parentName = "", client) {
    for (let option of options) {
        let fullName = parentName ? \`\${parentName} \${option.name}\` : option.name;
        let fullNameForPrefix = option.prefixName || option.name;

        if (option.type === 1) { // 1 = ApplicationCommandOptionType.Subcommand
            client.content.push({
                cmd: fullName,
                prefixCmd: fullNameForPrefix,
                messageCmd: 2,
                category: category,
                desc: option.description,
                usage: stringifyOption(option.options || []),
                desc_localized: option.description_localizations
            });
        }
        
        if (option.options) {
            processOptions(option.options, category, fullName, client);
        }
    }
}

export function stringifyOption(options) {
    if (!options || options.length === 0) return "";
    
    return options.map(opt => {
        const required = opt.required ? "<" : "[";
        const requiredEnd = opt.required ? ">" : "]";
        
        return \`\${required}\${opt.name}\${requiredEnd}\`;
    }).join(" ");
}

export function hasSubCommand(options) {
    if (!options) return false;
    
    for (const option of options) {
        if (option.type === 1) return true; // 1 = ApplicationCommandOptionType.Subcommand
        if (option.type === 2 && option.options) { // 2 = ApplicationCommandOptionType.SubcommandGroup
            for (const subOption of option.options) {
                if (subOption.type === 1) return true;
            }
        }
    }
    
    return false;
}

export function hasSubCommandGroup(options) {
    if (!options) return false;
    
    for (const option of options) {
        if (option.type === 2) return true; // 2 = ApplicationCommandOptionType.SubcommandGroup
    }
    
    return false;
}

export function isSubCommand(option) {
    return option.type === 1; // 1 = ApplicationCommandOptionType.Subcommand
}`;
	all_types["hybridHelpers"] = `export function processOptions(options: any[], category: string, parentName: string, client: Client): void;\n`
	all_types["hybridHelpers"] += `    export function stringifyOption(options: any[]): string;\n`
	all_types["hybridHelpers"] += `    export function hasSubCommand(options: any[]): boolean;\n`
	all_types["hybridHelpers"] += `    export function hasSubCommandGroup(options: any[]): boolean;\n`
	all_types["hybridHelpers"] += `    export function isSubCommand(option: any): boolean;\n`;
}

export async function generateHandlerCache() {
	loadAnotherStuff();
	loadApplicationCommands();
	loadHTML();
	await processSlashWithSubcommands(); // Traitement des commandes slash et sous-commandes
	await processHybridCommands(); // Ajout du traitement des commandes hybrides
	await loadEvents();
	await loadMessageCommands();
	await loadBashCommands();
	generateSubCommandLoaderCode(); // Code d'initialisation des sous-commandes slash
	generateHybridCommandsLoaderCode(); // Code d'initialisation des commandes hybrides

	const outputFile = join(process.cwd(), 'dist', 'handlerCache.js');
	const outputFile2 = join(process.cwd(), 'types', 'handlerCache.d.ts');

	let fileContent = '';
	let file2Content = '';

	file2Content += `/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/\n\nexport namespace handlerCache {\n`;
	for (let key in all_imports) {
		fileContent += `${all_imports[key]}\n`;
	}

	for (let key in all_exports) {
		fileContent += `// -- ${key} --\n\n`;
		fileContent += `export const ${key} = {\n`;
		fileContent += `${all_exports[key]}`;
		fileContent += `};\n\n`;

		file2Content += `    export const ${key}: Record<string, any>;\n`;
	}

	for (let key in all_types) {
		file2Content += `    ${all_types[key]}`;
	}

	file2Content += `}\n`;

	for (let key in all_vars) {
		if (key === "initCode" || key === "hybridInitCode" || key === "hybridHelpers") {
			fileContent += `// -- ${key} --\n\n`;
			fileContent += `${all_vars[key]}\n\n`;
		} else {
			fileContent += `// -- ${key} --\n\n`;
			fileContent += `export const ${key} = ${JSON.stringify(all_vars[key], null, 4)};\n\n`;
		}
	}

	await fs.promises.writeFile(outputFile, fileContent, 'utf-8');
	await fs.promises.writeFile(outputFile2, file2Content, 'utf-8');
	logger.log(`Handler cache generated successfully at ${outputFile}`);
	logger.log(`Handler cache types generated successfully at ${outputFile2}`);
}

generateHandlerCache();
