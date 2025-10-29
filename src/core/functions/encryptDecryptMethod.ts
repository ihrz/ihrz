/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2025 iHorizon
*/

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100_000;

/**
 * Function to encrypt a string
 * @param text - The string to encrypt
 * @returns The encrypted string
 */
export function encrypt(password: string, text: string): string {
	const salt = crypto.randomBytes(SALT_LENGTH);
	const iv = crypto.randomBytes(IV_LENGTH);
	const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');

	const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
	const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
	const authTag = cipher.getAuthTag();

	return [
		salt.toString('hex'),
		iv.toString('hex'),
		encrypted.toString('hex'),
		authTag.toString('hex')
	].join(':');
}

/**
 * Function to decrypt a string
 * @param text - The string to decrypt
 * @returns The decrypted string
 */
export function decrypt(password: string, data: string): string | undefined {
	try {
		const [saltHex, ivHex, encryptedHex, authTagHex] = data.split(':');
		const salt = Buffer.from(saltHex, 'hex');
		const iv = Buffer.from(ivHex, 'hex');
		const encrypted = Buffer.from(encryptedHex, 'hex');
		const authTag = Buffer.from(authTagHex, 'hex');

		const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');

		const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
		decipher.setAuthTag(authTag);

		const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
		return decrypted.toString('utf8');
	} catch {
		return undefined;
	}
}
