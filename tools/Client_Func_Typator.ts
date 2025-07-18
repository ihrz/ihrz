/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
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

import { writeFileSync } from 'fs';
import logger from '../src/core/logger.js';
import { formatTypeScriptCode, readVSCodeConfig } from './formatter.js';

let header = `/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import type { DatabaseStructure } from './database_structure.d.ts';
import type { LanguageData } from './languageData.d.ts';
import type { ClusterMethod, GatewayMethod } from '../src/core/functions/apiUrlParser.js';
import { ModalOptionsBuilder } from '../src/core/functions/modalHelper.js';
import { AnySelectMenuInteraction, APIModalInteractionResponseCallbackData, AutocompleteInteraction, BaseGuildTextChannel, BaseGuildVoiceChannel, ButtonBuilder, ButtonInteraction, CacheType, Channel, ChatInputCommandInteraction, Client, EmbedBuilder, Guild, GuildMember, Interaction, InteractionReplyOptions, Message, MessageContextMenuCommandInteraction, MessageEditOptions, MessageReplyOptions, ModalSubmitInteraction, PrimaryEntryPointCommandInteraction, Role, StringSelectMenuInteraction, User, UserContextMenuCommandInteraction, VoiceBasedChannel } from 'discord.js';
import { Assets } from './assets.js';
import { LangForPrompt } from '../src/core/functions/awaitingResponse.js';
import { AuthRestore_EntryType, AuthRestore_ResponseType, GuildAuthRestore, AuthRestore_ForceJoin_EntryType, AuthRestore_ForceJoin_ResponseType, AuthRestore_KeyUpdate_EntryType, AuthRestore_RoleUpdate_EntryType, Oauth2_Link_Entry } from '../src/core/functions/authRestoreHelper.ts';
import { Command } from './command.js';
import { Option } from './option.js';
import { PasswordOptions } from '../src/core/functions/random.ts';
import { command } from '../src/core/functions/permissonsCalculator.ts';
import { DetailedGuildData, GuildData } from '../src/core/functions/shard_helper.ts';
import { BatchProcessorOptions, BatchProcessorResult } from '../src/core/functions/batchProcessor.ts';
import { PallasDB } from 'pallas-db';
`
export class FunctionAnalyzer {
	private program: ts.Program;
	private typeChecker: ts.TypeChecker;
	private importedTypes: Set<string> = new Set();

	constructor(private rootDir: string) {
		const configPath = ts.findConfigFile(
			rootDir,
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
			.filter(sourceFile =>
				!sourceFile.fileName.includes('node_modules') &&
				sourceFile.fileName.startsWith(this.rootDir)
			);

		return sourceFiles.map(sourceFile => this.analyzeSourceFile(sourceFile));
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

		return {
			fileName: path.relative(this.rootDir, sourceFile.fileName),
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

	private getRelativeImportPath(fromPath: string, toPath: string): string | null {
		if (toPath.includes('node_modules')) {
			const nodeModulesIndex = toPath.indexOf('node_modules');
			return toPath.slice(nodeModulesIndex + 13).replace(/\\/g, '/').replace(/\.d\.ts$/, '').replace(/\.ts$/, '');
		}

		let relativePath = path.relative(path.dirname(fromPath), toPath)
			.replace(/\\/g, '/')
			.replace(/\.ts$/, '');

		if (!relativePath.startsWith('.')) {
			relativePath = './' + relativePath;
		}

		return relativePath;
	}

	public generateInterfaces(): string {
		const fileMetadata = this.analyzeFunctions();
		let output = '';

		const dirName = path.basename(this.rootDir);
		const namespaceName = this.formatNamespaceName(dirName);

		output += `declare namespace ${namespaceName} {\n`;

		for (const file of fileMetadata) {
			output += `\n  // From ${file.fileName}\n`;

			if (file.functions.length === 1) {
				const func = file.functions[0];
				this.collectParameterImports(func.parameters, file.fileName);

				// Generate type parameters string
				const typeParamsStr = func.typeParameters && func.typeParameters.length > 0
					? `<${func.typeParameters.join(', ')}>`
					: '';

				const params = this.generateParameterList(func.parameters);
				const functionName = this.sanitizeIdentifier(file.fileName.split('.')[0]);

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
				const moduleNamespace = this.sanitizeIdentifier(path.basename(file.fileName, '.ts'));
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
	const analyzer = new FunctionAnalyzer(sourceDir);
	let interfaces = header;
	interfaces += "\n";
	interfaces += formatTypeScriptCode(analyzer.generateInterfaces(), readVSCodeConfig(path.join(process.cwd(), ".vscode", "settings.json")));
	interfaces += "\n ;"

	writeFileSync(outputPath, interfaces, 'utf-8');
	logger.log(`Generated interfaces written to ${outputPath}`);
}

generateFunctionInterfaces(
	path.join(process.cwd(), "src", "core", "functions"),
	'./types/client_functions.d.ts'
);