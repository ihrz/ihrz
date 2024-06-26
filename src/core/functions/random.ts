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

import crypto from 'crypto';

interface PasswordOptions {
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

    let characters = '';

    if (lowercase) characters += 'abcdefghijklmnopqrstuvwxyz';
    if (uppercase) characters += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (numbers) characters += '0123456789';
    if (symbols) characters += symbols === true ? '!@#$%^&*()_+=' : symbols;

    if (exclude) {
        const excludeSet = new Set(exclude.split(''));
        characters = characters.split('').filter(char => !excludeSet.has(char)).join('');
    }

    if (excludeSimilarCharacters) {
        characters = characters.replace(/[il1Lo0O]/g, '');
    }

    const passwordArray: string[] = [];
    const bytesNeeded = Math.ceil((Math.log(characters.length) * length) / Math.log(256));
    const maxValid = 256 - (256 % characters.length);

    while (passwordArray.length < length) {
        const randomBytes = crypto.randomBytes(bytesNeeded);
        for (let i = 0; i < randomBytes.length && passwordArray.length < length; i++) {
            if (randomBytes[i] < maxValid) {
                const randomIndex = randomBytes[i] % characters.length;
                passwordArray.push(characters[randomIndex]);
            }
        }
    }

    let generatedPassword = passwordArray.join('');

    if (strict) {
        if (!(lowercase && [...generatedPassword].some(char => 'abcdefghijklmnopqrstuvwxyz'.includes(char)))) {
            generatedPassword = generatedPassword.replace(/[a-z]/, () => 'abcdefghijklmnopqrstuvwxyz'[randomInt(0, 26)]);
        }
        if (!(uppercase && [...generatedPassword].some(char => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(char)))) {
            generatedPassword = generatedPassword.replace(/[A-Z]/, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[randomInt(0, 26)]);
        }
        if (!(numbers && [...generatedPassword].some(char => '0123456789'.includes(char)))) {
            generatedPassword = generatedPassword.replace(/[0-9]/, () => '0123456789'[randomInt(0, 10)]);
        }
    }

    return generatedPassword;
}

export function generateMultiplePasswords(amount: number, options: PasswordOptions): string[] {
    const passwords: string[] = [];
    for (let i = 0; i < amount; i++) {
        passwords.push(generatePassword(options));
    }
    return passwords;
}

function randomInt(min: number, max: number): number {
    return Math.floor(crypto.randomInt(max - min) + min);
}