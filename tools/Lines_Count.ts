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

// Array of paths to search recursively
const SEARCH_PATHS: string[] = [
	'./src',
	'./types',
];

interface FileStats {
	filePath: string;
	lineCount: number;
	isEmpty: boolean;
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
 * Count lines in a file
 */
function countLines(filePath: string): number {
	try {
		const content = fs.readFileSync(filePath, 'utf-8');
		const lines = content.split('\n');
		return lines.length;
	} catch (error) {
		console.error(`Error reading file ${filePath}: ${error}`);
		return 0;
	}
}

/**
 * Check if file is empty or contains only whitespace
 */
function isFileEmpty(filePath: string): boolean {
	try {
		const content = fs.readFileSync(filePath, 'utf-8');
		return content.trim().length === 0;
	} catch (error) {
		console.error(`Error checking file ${filePath}: ${error}`);
		return false;
	}
}

/**
 * Format file size for display
 */
function formatFilePath(filePath: string, maxLength: number = 60): string {
	if (filePath.length <= maxLength) {
		return filePath.padEnd(maxLength);
	}
	return '...' + filePath.slice(-(maxLength - 3));
}

/**
 * Main function
 */
function main(): void {
	console.log('📊 Starting line count analysis...\n');

	const allFiles: string[] = [];
	const fileStats: FileStats[] = [];

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

	console.log(`\n📋 Total files to analyze: ${allFiles.length}\n`);

	// Count lines for each file
	for (const filePath of allFiles) {
		const lineCount = countLines(filePath);
		const isEmpty = isFileEmpty(filePath);

		fileStats.push({
			filePath,
			lineCount,
			isEmpty
		});
	}

	// Sort files by line count (descending)
	fileStats.sort((a, b) => b.lineCount - a.lineCount);

	console.log('📈 Line count results:\n');
	console.log('File'.padEnd(65) + 'Lines'.padStart(8) + '  Status');
	console.log('-'.repeat(80));

	// Display results
	for (const stats of fileStats) {
		const formattedPath = formatFilePath(stats.filePath, 62);
		const lineCountStr = stats.lineCount.toString().padStart(6);
		const statusIcon = stats.isEmpty ? '📄' : stats.lineCount > 500 ? '📚' : stats.lineCount > 100 ? '📝' : '📋';
		const statusText = stats.isEmpty ? 'Empty' : '';

		console.log(`${formattedPath} ${lineCountStr}  ${statusIcon} ${statusText}`);
	}

	// Calculate statistics
	const totalLines = fileStats.reduce((sum, stat) => sum + stat.lineCount, 0);
	const emptyFiles = fileStats.filter(stat => stat.isEmpty).length;
	const largeFiles = fileStats.filter(stat => stat.lineCount > 500).length;
	const mediumFiles = fileStats.filter(stat => stat.lineCount > 100 && stat.lineCount <= 500).length;
	const smallFiles = fileStats.filter(stat => stat.lineCount <= 100 && !stat.isEmpty).length;
	const averageLines = Math.round(totalLines / fileStats.length);

	console.log('\n' + '='.repeat(80));
	console.log('📊 Summary Statistics:');
	console.log(`   📁 Total files: ${fileStats.length}`);
	console.log(`   📏 Total lines: ${totalLines.toLocaleString()}`);
	console.log(`   📐 Average lines per file: ${averageLines}`);
	console.log(`   📄 Empty files: ${emptyFiles}`);
	console.log(`   📋 Small files (≤100 lines): ${smallFiles}`);
	console.log(`   📝 Medium files (101-500 lines): ${mediumFiles}`);
	console.log(`   📚 Large files (>500 lines): ${largeFiles}`);

	// Show top 5 largest files
	if (fileStats.length > 0) {
		console.log('\n🏆 Top 5 largest files:');
		const top5 = fileStats.slice(0, Math.min(5, fileStats.length));
		top5.forEach((stat, index) => {
			console.log(`   ${index + 1}. ${stat.filePath} (${stat.lineCount} lines)`);
		});
	}

	// Show empty files if any
	const emptyFilesList = fileStats.filter(stat => stat.isEmpty);
	if (emptyFilesList.length > 0) {
		console.log('\n⚠️  Empty files detected:');
		emptyFilesList.forEach((stat, index) => {
			console.log(`   ${index + 1}. ${stat.filePath}`);
		});
	}

	console.log('\n✨ Analysis completed!');
}

main();