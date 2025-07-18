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

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import logger from '../src/core/logger.ts';

interface VSCodeConfig {
	"editor.formatOnSave"?: boolean;
	"editor.insertSpaces"?: boolean;
	"editor.tabSize"?: number;
}

interface FormattingOptions {
	formatOnSave: boolean;
	insertSpaces: boolean;
	tabSize: number;
}

/**
 * Read and parse the VSCode configuration file
 */
function readVSCodeConfig(configPath: string): FormattingOptions {
	try {
		const configContent = fs.readFileSync(configPath, 'utf8');
		const config: VSCodeConfig = JSON.parse(configContent);

		return {
			formatOnSave: config["editor.formatOnSave"] ?? true,
			insertSpaces: config["editor.insertSpaces"] ?? true,
			tabSize: config["editor.tabSize"] ?? 4
		};
	} catch (error) {
		console.error('Error reading VSCode config:', error);
		// Return default values if config file cannot be read
		return {
			formatOnSave: true,
			insertSpaces: true,
			tabSize: 4
		};
	}
}

/**
 * Format TypeScript code using the specified options
 */
function formatTypeScriptCode(code: string, options: FormattingOptions): string {
	// Create TypeScript formatting options
	const formatOptions: ts.FormatCodeSettings = {
		indentSize: options.tabSize,
		tabSize: options.tabSize,
		insertSpaceAfterCommaDelimiter: true,
		insertSpaceAfterSemicolonInForStatements: true,
		insertSpaceBeforeAndAfterBinaryOperators: true,
		insertSpaceAfterKeywordsInControlFlowStatements: true,
		insertSpaceAfterFunctionKeywordForAnonymousFunctions: false,
		insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
		insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: false,
		insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: false,
		placeOpenBraceOnNewLineForFunctions: false,
		placeOpenBraceOnNewLineForControlBlocks: false,
		// Use tabs or spaces based on configuration
		convertTabsToSpaces: options.insertSpaces,
		indentStyle: options.insertSpaces ? ts.IndentStyle.Smart : ts.IndentStyle.Block
	};

	// Create a language service host
	const host: ts.LanguageServiceHost = {
		getCompilationSettings: () => ({}),
		getScriptFileNames: () => ['temp.ts'],
		getScriptVersion: () => '1',
		getScriptSnapshot: (fileName: string) => {
			if (fileName === 'temp.ts') {
				return ts.ScriptSnapshot.fromString(code);
			}
			return undefined;
		},
		getCurrentDirectory: () => process.cwd(),
		getDefaultLibFileName: (options: ts.CompilerOptions) => ts.getDefaultLibFilePath(options),
		fileExists: (fileName: string) => fileName === 'temp.ts',
		readFile: (fileName: string) => fileName === 'temp.ts' ? code : undefined,
		directoryExists: () => true,
		getDirectories: () => []
	};

	// Create the language service
	const languageService = ts.createLanguageService(host);

	// Get formatting edits
	const edits = languageService.getFormattingEditsForDocument('temp.ts', formatOptions);

	// Apply the formatting changes
	let formattedCode = code;

	// Apply edits in reverse order to maintain correct positions
	for (let i = edits.length - 1; i >= 0; i--) {
		const edit = edits[i];
		formattedCode =
			formattedCode.substring(0, edit.span.start) +
			edit.newText +
			formattedCode.substring(edit.span.start + edit.span.length);
	}

	return formattedCode;
}

/**
 * Main function to format a TypeScript file
 */
function formatTypeScriptFile(filePath: string, configPath: string = './vsconfig.json'): void {
	try {
		// Read VSCode configuration
		const options = readVSCodeConfig(configPath);

		logger.log('Formatting options:', options);

		// Only format if formatOnSave is enabled
		if (!options.formatOnSave) {
			logger.log('Format on save is disabled. Skipping formatting.');
			return;
		}

		// Read the TypeScript file
		const sourceCode = fs.readFileSync(filePath, 'utf8');

		// Format the code
		const formattedCode = formatTypeScriptCode(sourceCode, options);

		// Write the formatted code back to the file
		fs.writeFileSync(filePath, formattedCode, 'utf8');

		logger.legacy(`Successfully formatted: ${filePath}`);

	} catch (error) {
		console.error('Error formatting file:', error);
	}
}

export { formatTypeScriptFile, readVSCodeConfig, formatTypeScriptCode };