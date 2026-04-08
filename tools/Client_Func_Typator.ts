/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

export interface FunctionMetadata {
	name: string;
	parameters: ParameterMetadata[];
	returnType: string;
	filePath: string;
	typeParameters?: string[]; // Add support for generic type parameters
}

export interface ParameterMetadata {
	name: string;
	type: string;
	optional: boolean;
}

export interface FileMetadata {
	fileName: string;
	functions: FunctionMetadata[];
}

import ts from 'typescript';
import path from 'path';

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import logger from '../src/core/logger.js';
import { formatTypeScriptCode, readVSCodeConfig } from './formatter.js';
import { LICENCE_HEADER } from './LicenceHeader.js';

let header = LICENCE_HEADER + `

import type { DatabaseStructure } from './database_structure.d.ts';
import type { LanguageData } from './languageData.d.ts';
import type { GatewayMethod } from '../src/core/functions/apiUrlParser.js';
import { ModalOptionsBuilder } from '../src/core/functions/modalHelper.js';
import { ActionRowBuilder, ActionRowData, AnySelectMenuInteraction, APIMessageTopLevelComponent, APIModalInteractionResponseCallbackData, AutocompleteInteraction, BaseGuildTextChannel, BaseGuildVoiceChannel, ButtonBuilder, ButtonInteraction, CacheType, Channel, ChatInputCommandInteraction, Client, EmbedBuilder, Guild, GuildMember, Interaction, InteractionReplyOptions, JSONEncodable, Message, MessageActionRowComponentBuilder, MessageActionRowComponentData, MessageContextMenuCommandInteraction, MessageEditOptions, MessageReplyOptions, ModalSubmitInteraction, PrimaryEntryPointCommandInteraction, Role, StringSelectMenuInteraction, TopLevelComponentData, User, UserContextMenuCommandInteraction, VoiceBasedChannel } from 'discord.js';
import { Assets } from './assets.js';
import { LangForPrompt } from '../src/core/functions/awaitingResponse.js';
import { AuthRestore_EntryType, AuthRestore_ResponseType, GuildAuthRestore, AuthRestore_ForceJoin_EntryType, AuthRestore_ForceJoin_ResponseType, AuthRestore_KeyUpdate_EntryType, AuthRestore_RoleUpdate_EntryType, Oauth2_Link_Entry } from '../src/core/functions/authRestoreHelper.ts';
import { Command } from './command.js';
import { Option } from './option.js';
import { PasswordOptions } from '../src/core/functions/random.ts';
import { command, PermissionValue } from '../src/core/functions/permissonsCalculator.ts';
import { DetailedGuildData, GuildData } from '../src/core/functions/shard_helper.ts';
import { BatchProcessorOptions, BatchProcessorResult } from '../src/core/functions/batchProcessor.ts';
import { Sqlite } from '../src/core/database/driver/sqlite.ts';
import { Json } from '../src/core/database/driver/json.ts';
import { Memory } from '../src/core/database/driver/memory.ts';
import { Postgres } from '../src/core/database/driver/postgres.ts';
import { Horizon } from '../src/core/database/driver/horizon.ts';
import { TrackEmbbeded } from '../src/core/functions/music_proximity.ts';
import { LavalinkNode, LyricsResult, SearchResult, Track } from "lavalink-client";
import { components } from '../src/core/functions/method.ts';
import { Player } from 'lavalink-client';
import { HandleMusicPlayOptions, SearchMusicQueryResult } from './musicPlay';
`
export class FunctionAnalyzer {
	private program: ts.Program;
	private typeChecker: ts.TypeChecker;
	private importedTypes: Set<string> = new Set();

	constructor(private rootDir: string) {
		this.rootDir = path.resolve(rootDir);

		const configPath = ts.findConfigFile(
			this.rootDir,
			ts.sys.fileExists,
			'tsconfig.json'
		);

		if (!configPath) {
			throw new Error("Could not find a valid 'tsconfig.json'.");
		}

		const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
		const { options, fileNames } = ts.parseJsonConfigFileContent(
			config,
			ts.sys,
			path.dirname(configPath)
		);

		this.program = ts.createProgram(fileNames, options);
		this.typeChecker = this.program.getTypeChecker();
	}

	public analyzeFunctions(): FileMetadata[] {
		const sourceFiles = this.program.getSourceFiles()
			.filter(sourceFile => {
				// Normalize paths for cross-platform comparison
				const normalizedFileName = path.resolve(sourceFile.fileName);
				const normalizedRootDir = path.resolve(this.rootDir);

				const isNotNodeModules = !sourceFile.fileName.includes('node_modules');
				const isInRootDir = normalizedFileName.startsWith(normalizedRootDir);

				return isNotNodeModules && isInRootDir;
			});


		const results = sourceFiles.map(sourceFile => this.analyzeSourceFile(sourceFile));
		return results;
	}

	private isNodeExported(node: ts.FunctionDeclaration | ts.MethodDeclaration): boolean {
		const modifiers = ts.getModifiers(node);
		if (!modifiers) return false;

		return modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
	}

	private analyzeSourceFile(sourceFile: ts.SourceFile): FileMetadata {
		const functions: FunctionMetadata[] = [];

		const visit = (node: ts.Node) => {
			if (ts.isFunctionDeclaration(node)) {
				const functionMetadata = this.analyzeFunctionNode(node);
				if (functionMetadata) {
					functions.push(functionMetadata);
				}
			}

			if (ts.isExportDeclaration(node)) {
				if (node.exportClause && ts.isNamedExports(node.exportClause)) {
					node.exportClause.elements.forEach(element => {
						const symbol = this.typeChecker.getSymbolAtLocation(element.name);
						if (symbol) {
							const declarations = symbol.declarations;
							if (declarations && declarations.length > 0) {
								const decl = declarations[0];
								if (ts.isFunctionDeclaration(decl)) {
									const functionMetadata = this.analyzeFunctionNode(decl);
									if (functionMetadata) {
										functions.push(functionMetadata);
									}
								}
							}
						}
					});
				}
			}

			ts.forEachChild(node, visit);
		};

		ts.forEachChild(sourceFile, visit);

		// Use path.relative with normalized paths
		const relativePath = path.relative(this.rootDir, sourceFile.fileName);

		return {
			fileName: relativePath,
			functions
		};
	}

	private collectParameterImports(parameters: ParameterMetadata[], fileName: string): void {
		const sourceFile = this.program.getSourceFile(fileName);
		if (!sourceFile) return;

		for (const param of parameters) {
			// Find type references in the source file that match our parameter type
			const visit = (node: ts.Node) => {
				ts.forEachChild(node, visit);
			};

			ts.forEachChild(sourceFile, visit);
		}
	}

	private analyzeFunctionNode(node: ts.FunctionDeclaration | ts.MethodDeclaration): FunctionMetadata | null {
		if (!this.isNodeExported(node)) {
			return null;
		}

		if (!node.name) return null;

		const signature = this.typeChecker.getSignatureFromDeclaration(node);
		if (!signature) return null;

		// Extract type parameters (generics)
		const typeParameters: string[] = [];
		if (node.typeParameters) {
			node.typeParameters.forEach(typeParam => {
				let paramText = typeParam.name.getText();

				// Handle constraints (e.g., T extends SomeType)
				if (typeParam.constraint) {
					paramText += ` extends ${this.getFullTypeText(typeParam.constraint)}`;
				}

				// Handle default types (e.g., T = DefaultType)
				if (typeParam.default) {
					paramText += ` = ${this.getFullTypeText(typeParam.default)}`;
				}

				typeParameters.push(paramText);
			});
		}

		const parameters: ParameterMetadata[] = node.parameters.map(param => {
			const paramType = param.type
				? this.getFullTypeText(param.type)
				: 'any';

			return {
				name: param.name.getText(),
				type: paramType,
				optional: !!param.questionToken
			};
		});

		const returnType = node.type
			? this.getFullTypeText(node.type)
			: 'any';

		return {
			name: node.name.getText(),
			parameters,
			returnType,
			filePath: node.getSourceFile().fileName,
			typeParameters: typeParameters.length > 0 ? typeParameters : undefined
		};
	}

	private getFullTypeText(typeNode: ts.TypeNode): string {
		// Use the type checker to get the full type representation
		const type = this.typeChecker.getTypeFromTypeNode(typeNode);
		const typeString = this.typeChecker.typeToString(
			type,
			typeNode,
			ts.TypeFormatFlags.InTypeAlias |
			ts.TypeFormatFlags.NoTruncation |
			ts.TypeFormatFlags.WriteArrayAsGenericType |
			ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
		);

		// If the type checker gives us a more accurate representation, use it
		// Otherwise, fall back to the original text
		if (typeString && typeString !== 'any' && !typeString.includes('typeof')) {
			return typeString;
		}

		return typeNode.getText();
	}

	public generateInterfaces(): string {
		const fileMetadata = this.analyzeFunctions();
		let output = '';

		const dirName = path.basename(this.rootDir);
		const namespaceName = this.formatNamespaceName(dirName);

		output += `declare namespace ${namespaceName} {\n`;

		// Check if we have any functions to process
		let totalFunctions = 0;
		fileMetadata.forEach(file => totalFunctions += file.functions.length);

		if (totalFunctions === 0) {
			console.warn('No exported functions found in any files!');
		}
		for (const file of fileMetadata) {
			if (file.functions.length === 0) continue; // Skip files with no functions
			output += `\n  // From ${file.fileName}\n`;

			if (file.functions.length === 1) {
				const func = file.functions[0];
				this.collectParameterImports(func.parameters, file.fileName);

				// Generate type parameters string
				const typeParamsStr = func.typeParameters && func.typeParameters.length > 0
					? `<${func.typeParameters.join(', ')}>`
					: '';

				const params = this.generateParameterList(func.parameters);
				const functionName = this.sanitizeIdentifier(path.parse(file.fileName).name);

				if (params.length > 80) {
					output += `  export function ${functionName}${typeParamsStr}(\n`;
					func.parameters.forEach((param, index) => {
						output += `    ${param.name}${param.optional ? '?' : ''}: ${param.type}${index < func.parameters.length - 1 ? ',' : ''}\n`;
					});
					output += `  ): ${func.returnType};\n`;
				} else {
					output += `  export function ${functionName}${typeParamsStr}(${params}): ${func.returnType};\n`;
				}
			} else {
				const moduleNamespace = this.sanitizeIdentifier(path.parse(file.fileName).name);
				output += `  export namespace ${moduleNamespace} {\n`;

				for (const func of file.functions) {
					this.collectParameterImports(func.parameters, file.fileName);

					// Generate type parameters string
					const typeParamsStr = func.typeParameters && func.typeParameters.length > 0
						? `<${func.typeParameters.join(', ')}>`
						: '';

					const params = this.generateParameterList(func.parameters);
					const functionName = this.sanitizeIdentifier(func.name);

					if (params.length > 80) {
						output += `    export function ${functionName}${typeParamsStr}(\n`;
						func.parameters.forEach((param, index) => {
							output += `      ${param.name}${param.optional ? '?' : ''}: ${param.type}${index < func.parameters.length - 1 ? ',' : ''}\n`;
						});
						output += `    ): ${func.returnType};\n`;
					} else {
						output += `    export function ${functionName}${typeParamsStr}(${params}): ${func.returnType};\n`;
					}
				}

				output += `  }\n`;
			}
		}

		output += `}\n\n`;
		output += `export { ${namespaceName} };\n`;

		return output;
	}

	private sanitizeIdentifier(name: string): string {
		let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');

		if (/^\d/.test(sanitized)) {
			sanitized = '_' + sanitized;
		}

		const reservedKeywords = new Set([
			'break', 'case', 'catch', 'class', 'const', 'continue',
			'debugger', 'default', 'delete', 'do', 'else', 'enum',
			'export', 'extends', 'false', 'finally', 'for', 'function',
			'if', 'import', 'in', 'instanceof', 'new', 'null', 'return',
			'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof',
			'var', 'void', 'while', 'with', 'implements', 'interface',
			'let', 'package', 'private', 'protected', 'public', 'static',
			'yield', 'any', 'boolean', 'symbol'
		]);

		if (reservedKeywords.has(sanitized)) {
			sanitized = '_' + sanitized;
		}

		return sanitized;
	}

	private generateParameterList(parameters: ParameterMetadata[]): string {
		return parameters
			.map(param =>
				`${param.name}${param.optional ? '?' : ''}: ${param.type}`
			)
			.join(', ');
	}

	private formatNamespaceName(name: string): string {
		return "Client_" + name
			.split(/[-_]/)
			.map(part => part.charAt(0).toUpperCase() + part.slice(1))
			.join('');
	}
}

export function generateFunctionInterfaces(
	sourceDir: string,
	outputPath: string
): void {
	try {
		if (!existsSync(sourceDir)) {
			throw new Error(`Source directory does not exist: ${sourceDir}`);
		}

		const analyzer = new FunctionAnalyzer(sourceDir);
		let interfaces = header;
		interfaces += "\n";

		const generatedInterfaces = analyzer.generateInterfaces();

		// Try to format the code, but don't fail if formatter is not available
		try {
			interfaces += formatTypeScriptCode(generatedInterfaces, readVSCodeConfig(path.join(process.cwd(), ".vscode", "settings.json")));
		} catch (formatterError) {
			console.warn('Formatter failed, using unformatted code:', formatterError);
			interfaces += generatedInterfaces;
		}

		// Ensure output directory exists
		const outputDir = path.dirname(outputPath);
		if (!existsSync(outputDir)) {
			mkdirSync(outputDir, { recursive: true });
		}

		writeFileSync(outputPath, interfaces, 'utf-8');

		logger.log(`Generated interfaces written to ${outputPath}`);
	} catch (error) {
		console.error('Error generating function interfaces:', error);
		throw error;
	}
}

generateFunctionInterfaces(
	path.join(process.cwd(), "src", "core", "functions"),
	'./types/client_functions.d.ts'
);