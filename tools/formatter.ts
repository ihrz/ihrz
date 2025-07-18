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

	// Create a temporary source file
	const sourceFile = ts.createSourceFile(
		'temp.ts',
		code,
		ts.ScriptTarget.Latest,
		true
	);

	// Get text changes for formatting
	return simpleFormat(code, options);
}

/**
 * Main function to format a TypeScript file
 */
function formatTypeScriptFile(filePath: string, configPath: string = './vsconfig.json'): void {
	try {
		// Read VSCode configuration
		const options = readVSCodeConfig(configPath);

		console.log('Formatting options:', options);

		// Only format if formatOnSave is enabled
		if (!options.formatOnSave) {
			console.log('Format on save is disabled. Skipping formatting.');
			return;
		}

		// Read the TypeScript file
		const sourceCode = fs.readFileSync(filePath, 'utf8');

		// Format the code
		const formattedCode = formatTypeScriptCode(sourceCode, options);

		// Write the formatted code back to the file
		fs.writeFileSync(filePath, formattedCode, 'utf8');

		console.log(`Successfully formatted: ${filePath}`);

	} catch (error) {
		console.error('Error formatting file:', error);
	}
}

/**
 * Simple indentation formatter (alternative approach)
 */
function simpleFormat(code: string, options: FormattingOptions): string {
	const lines = code.split('\n');
	let indentLevel = 0;
	const indentChar = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';

	const formattedLines = lines.map(line => {
		const trimmed = line.trim();

		if (trimmed === '') return '';

		// Decrease indent for closing braces
		if (trimmed.startsWith('}')) {
			indentLevel = Math.max(0, indentLevel - 1);
		}

		const formattedLine = indentChar.repeat(indentLevel) + trimmed;

		// Increase indent for opening braces
		if (trimmed.endsWith('{')) {
			indentLevel++;
		}

		return formattedLine;
	});

	return formattedLines.join('\n');
}

// Example usage
if (require.main === module) {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log('Usage: node formatter.js <typescript-file-path> [config-path]');
		console.log('Example: node formatter.js ./src/main.ts ./vsconfig.json');
		process.exit(1);
	}

	const filePath = args[0];
	const configPath = args[1] || './vsconfig.json';

	formatTypeScriptFile(filePath, configPath);
}

export { formatTypeScriptFile, readVSCodeConfig, formatTypeScriptCode, simpleFormat };