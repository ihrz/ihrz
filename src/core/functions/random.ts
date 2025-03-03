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

import crypto from 'crypto';

export interface PasswordOptions {
	length: number;
	numbers?: boolean;
	symbols?: boolean | string;
	lowercase?: boolean;
	uppercase?: boolean;
	excludeSimilarCharacters?: boolean;
	exclude?: string;
	strict?: boolean;
}

export function generatePassword(options: PasswordOptions): string {
	const {
		length,
		numbers = false,
		symbols = false,
		lowercase = true,
		uppercase = true,
		excludeSimilarCharacters = false,
		exclude = '',
		strict = false,
	} = options;

	if (length <= 0) throw new Error('La longueur doit être positive');
	if (!(lowercase || uppercase || numbers || symbols)) {
		throw new Error('Au moins un type de caractère doit être activé');
	}

	const charSets = {
		lowercase: 'abcdefghijklmnopqrstuvwxyz',
		uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
		numbers: '0123456789',
		symbols: symbols === true ? '!@#$%^&*()_+=' : symbols as string
	};

	let characters = '';
	if (lowercase) characters += charSets.lowercase;
	if (uppercase) characters += charSets.uppercase;
	if (numbers) characters += charSets.numbers;
	if (symbols) characters += charSets.symbols;

	if (exclude) {
		const excludeSet = new Set(exclude.split(''));
		characters = characters.split('').filter(char => !excludeSet.has(char)).join('');
	}
	if (excludeSimilarCharacters) {
		characters = characters.replace(/[il1Lo0O]/g, '');
	}

	if (characters.length === 0) {
		throw new Error('Pas de caractères disponibles après exclusions');
	}

	const passwordArray: string[] = [];
	const getSecureRandomChar = (): string => {
		const randomBuffer = new Uint8Array(1);
		let randomNum;
		do {
			crypto.randomFillSync(randomBuffer);
			randomNum = randomBuffer[0];
		} while (randomNum >= 256 - (256 % characters.length));

		return characters[randomNum % characters.length];
	};

	for (let i = 0; i < length; i++) {
		passwordArray.push(getSecureRandomChar());
	}

	if (strict) {
		const requirements = {
			lowercase: lowercase && charSets.lowercase,
			uppercase: uppercase && charSets.uppercase,
			numbers: numbers && charSets.numbers,
			symbols: symbols && charSets.symbols
		};

		Object.entries(requirements).forEach(([type, chars]) => {
			if (chars && !passwordArray.some(char => chars.includes(char))) {
				const position = crypto.randomInt(0, length);
				passwordArray[position] = chars[crypto.randomInt(0, chars.length)];
			}
		});
	}

	return passwordArray.join('');
}

export function generateMultiplePasswords(amount: number, options: PasswordOptions): string[] {
	if (amount <= 0) throw new Error('Le nombre de mots de passe doit être positif');

	return Array.from({ length: amount }, () => generatePassword(options));
}