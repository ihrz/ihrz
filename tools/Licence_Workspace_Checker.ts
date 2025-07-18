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
import * as readline from 'readline';
import pkg from "../package.json";

// Expected license header (first 20 lines)
const EXPECTED_HEADER = `/*
・ iHorizon Discord Bot (${pkg.repository.url})

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/${pkg.author})

・ Copyright © 2020-${new Date().getFullYear()} iHorizon
*/`;

// Array of paths to search recursively
const SEARCH_PATHS: string[] = [
	'./src',
	'./types',
];

interface FileIssue {
	filePath: string;
	reason: string;
}

/**
 * Recursively get all TypeScript files from a directory
 */
function getTypeScriptFiles(dirPath: string): string[] {
	const files: string[] = [];

	if (!fs.existsSync(dirPath)) {
		console.warn(`Warning: Path '${dirPath}' does not exist`);
		return files;
	}

	const items = fs.readdirSync(dirPath);

	for (const item of items) {
		const fullPath = path.join(dirPath, item);
		const stat = fs.statSync(fullPath);

		if (stat.isDirectory()) {
			// Recursively search subdirectories
			files.push(...getTypeScriptFiles(fullPath));
		} else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.d.ts'))) {
			files.push(fullPath);
		}
	}

	return files;
}

/**
 * Get the first 20 lines of a file
 */
function getHeadersLineCount(filePath: string): string {
	try {
		const content = fs.readFileSync(filePath, 'utf-8');
		const lines = content.split('\n');
		return lines.slice(0, EXPECTED_HEADER.split('\n').length).join('\n');
	} catch (error) {
		throw new Error(`Failed to read file: ${error}`);
	}
}

/**
 * Check if file has the correct license header
 */
function hasCorrectLicenseHeader(filePath: string): boolean {
	try {
		const first20Lines = getHeadersLineCount(filePath);
		return first20Lines.trim() === EXPECTED_HEADER.trim();
	} catch (error) {
		console.error(`Error checking file ${filePath}: ${error}`);
		return false;
	}
}

/**
 * Fix license header for a file
 */
function fixLicenseHeader(filePath: string): void {
	try {
		const content = fs.readFileSync(filePath, 'utf-8');
		const lines = content.split('\n');

		// Remove existing header if present (assuming it's in the first 25 lines)
		let startIndex = 0;
		for (let i = 0; i < Math.min(25, lines.length); i++) {
			if (lines[i].includes('*/') && i > 0) {
				startIndex = i + 1;
				break;
			}
		}

		// Remove empty lines at the beginning after removing header
		while (startIndex < lines.length && lines[startIndex].trim() === '') {
			startIndex++;
		}

		const remainingContent = lines.slice(startIndex).join('\n');
		const newContent = EXPECTED_HEADER + '\n\n' + remainingContent;

		fs.writeFileSync(filePath, newContent, 'utf-8');
		console.log(`✓ Fixed: ${filePath}`);
	} catch (error) {
		console.error(`✗ Failed to fix ${filePath}: ${error}`);
	}
}

/**
 * Prompt user for input
 */
function promptUser(question: string): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer);
		});
	});
}

/**
 * Main function
 */
async function main(): Promise<void> {
	console.log('🔍 Starting license header check...\n');

	// Check for --force argument
	const forceMode = process.argv.includes('--force') || process.argv.includes('--force=1');

	const allFiles: string[] = [];
	const issues: FileIssue[] = [];

	// Collect all TypeScript files from specified paths
	for (const searchPath of SEARCH_PATHS) {
		const files = getTypeScriptFiles(searchPath);
		allFiles.push(...files);
		console.log(`📁 Found ${files.length} TypeScript files in '${searchPath}'`);
	}

	if (allFiles.length === 0) {
		console.log('⚠️  No TypeScript files found in specified paths');
		return;
	}

	console.log(`\n📋 Total files to check: ${allFiles.length}\n`);

	// Check each file
	for (const filePath of allFiles) {
		if (!hasCorrectLicenseHeader(filePath)) {
			issues.push({
				filePath,
				reason: 'Missing or incorrect license header'
			});
			console.log(`❌ ${filePath}`);
		} else {
			console.log(`✅ ${filePath}`);
		}
	}

	console.log(`\n📊 Results:`);
	console.log(`   ✅ Files with correct header: ${allFiles.length - issues.length}`);
	console.log(`   ❌ Files with issues: ${issues.length}`);

	if (issues.length === 0) {
		console.log('\n🎉 All files have the correct license header!');
		return;
	}

	console.log('\n📝 Files with issues:');
	issues.forEach((issue, index) => {
		console.log(`   ${index + 1}. ${issue.filePath} - ${issue.reason}`);
	});

	// Ask user if they want to fix the issues
	if (!forceMode) {
		console.log('\n🛠️  Would you like to fix these issues automatically?');
		const answer = await promptUser('Type "y" to fix all issues, "n" to skip, or use --force to skip this prompt: ');

		if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
			console.log('⏭️  Skipping fixes. Use --force to skip this prompt in the future.');
			return;
		}
	} else {
		console.log('⏭️  Skipping fixes due to --force flag.');
		return;
	}

	// Fix all issues
	console.log('\n🔧 Fixing license headers...');
	for (const issue of issues) {
		fixLicenseHeader(issue.filePath);
	}

	console.log('\n✨ All fixes completed!');
}

main()