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

import nodemailer from 'nodemailer';

export interface MailerConfig {
	host: string;
	port: number;
	secure: boolean;
	auth: MailerAuth;
	fromName?: string;
	owner: string;
}

export interface MailerAuth {
	mail: string;
	password: string;
}

export class Mailer {
	private config: MailerConfig;
	private transport: nodemailer.Transporter;
	public connected: boolean;
	public ownerMail: string;
	private signature: { text: string; html: string };

	public async init(useEnv: boolean, config?: MailerConfig) {
		if (useEnv) {
			this.config = {
				auth: {
					password: process.env.SMTP_PASS!,
					mail: process.env.SMTP_USER!
				},
				host: process.env.SMTP_HOST!,
				port: Number(process.env.SMTP_PORT),
				secure: process.env.SMTP_SECURE === 'true',
				fromName: client.user?.username,
				owner: process.env.OWNER_MAIL!
			};

			this.ownerMail = this.config.owner;
		} else if (config) {
			this.config = config;
			this.ownerMail = this.config.owner;
		} else {
			throw new Error("Missing config payload. (useEnv=false)");
		}

		if (!this.config.auth.mail
			|| !this.config.auth.password
			|| !this.config.host
			|| Number.isNaN(this.config.port)
			|| !this.config.owner) return;

		this.transport = nodemailer.createTransport({
			host: this.config.host,
			port: this.config.port,
			secure: this.config.secure,
			auth: {
				user: this.config.auth.mail,
				pass: this.config.auth.password
			},
			tls: {
				rejectUnauthorized: true
			}
		});

		this.initSignature();

		await this.verifyConnection();
	}

	private initSignature() {
		this.signature = {
			text: `\r\n\r\n---\r\n${this.config.fromName}\r\niHorizon Discord Bot\r\nhttps://ihorizon.org`,

			html: `
                <br><br>
                <table style="font-family: Arial, sans-serif; color: #333; border-top: 2px solid #5865F2; padding-top: 15px; margin-top: 20px;">
                    <tr>
                        <td style="padding-right: 15px;">
                            <img src="https://www.ihorizon.org/assets/img/ihorizon.png" alt="iHorizon" width="50" height="50" style="border-radius: 8px;">
                        </td>
                        <td>
                            <strong style="color: #5865F2; font-size: 16px;">${this.config.fromName}</strong><br>
                            <span style="color: #666; font-size: 14px;">iHorizon Discord Bot</span><br>
                            <a href="https://ihorizon.org" style="color: #5865F2; text-decoration: none;">🌐 ihorizon.org</a> | 
                            <a href="https://discord.gg/ihorizon" style="color: #5865F2; text-decoration: none;">💬 Discord</a>
                        </td>
                    </tr>
                </table>
            `
		};
	}

	public async send(
		to: string,
		subject: string,
		text: string,
		html?: string,
		withSignature: boolean = true
	): Promise<boolean> {
		try {
			const normalizedText = text.replace(/\r?\n/g, '\r\n');

			const finalText = withSignature
				? normalizedText + this.signature.text
				: normalizedText;

			const finalHtml = withSignature
				? (html || normalizedText.replace(/\r?\n/g, '<br>')) + this.signature.html
				: (html || normalizedText.replace(/\r?\n/g, '<br>'));

			const info = await this.transport.sendMail({
				from: `"${this.config.fromName}" <${this.config.auth.mail}>`,
				to,
				subject,
				text: finalText,
				html: finalHtml
			});

			logger.log('Email Sended:', info.messageId);
			return true;
		} catch (error) {
			logger.err('Email Sending Error:', error);
			return false;
		}
	}

	private async verifyConnection(): Promise<boolean> {
		try {
			await this.transport.verify();
			this.connected = true;

			logger.log(`${client.config.console.emojis.OK} >> SMTP Connection success`);
			return true;
		} catch (error) {
			this.connected = false;

			logger.err('SMTP Connection Error:', error);
			return false;
		}
	}
}