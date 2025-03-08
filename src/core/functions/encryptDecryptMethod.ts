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

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Function to encrypt a string
 * @param text - The string to encrypt
 * @returns The encrypted string
 */
export function encrypt(k: string, text: string): string {
	let key = crypto.createHash('sha256').update(k).digest();

	let iv = crypto.randomBytes(IV_LENGTH);
	let cipher = crypto.createCipheriv(ALGORITHM, key, iv);
	let encrypted = cipher.update(text, 'utf8', 'hex');
	encrypted += cipher.final('hex');
	return iv.toString('hex') + ':' + encrypted;
}

/**
 * Function to decrypt a string
 * @param text - The string to decrypt
 * @returns The decrypted string
 */
export function decrypt(k: string, text: string): string | undefined {
	try {
		let key = crypto.createHash('sha256').update(k).digest();

		let textParts = text.split(':');
		let iv = Buffer.from(textParts.shift()!, 'hex');
		let encryptedText = textParts.join(':');
		let decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
		let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
		decrypted += decipher.final('utf8');
		return decrypted;
	} catch {
		return undefined;
	}
}