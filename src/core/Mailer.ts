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
}

export interface MailerAuth {
	mail: string;
	password: string;
}

export class Mailer {
	private config: MailerConfig;
	private transport: nodemailer.Transporter;
	public connected: boolean;

	constructor(useEnv: boolean, config?: MailerConfig) {
		if (useEnv) {
			this.config = {
				auth: {
					password: process.env.SMTP_PASS!,
					mail: process.env.SMTP_USER!
				},
				host: process.env.SMTP_HOST!,
				port: Number(process.env.SMTP_PORT),
				secure: process.env.SMTP_SECURE === 'true',
				fromName: client.user?.username
			};
		} else if (config) {
			this.config = config;
		} else {
			throw new Error("Missing config payload. (useEnv=false)");
		}

		this.init();
	}

	private async init() {
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

		await this.verifyConnection();
	}

	public async send(
		to: string,
		subject: string,
		text: string,
		html?: string
	): Promise<boolean> {
		try {
			const info = await this.transport.sendMail({
				from: `"${this.config.fromName}" <${this.config.auth.mail}>`,
				to,
				subject,
				text,
				html: html || text
			});

			logger.debug('Email Sended:', info.messageId);
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