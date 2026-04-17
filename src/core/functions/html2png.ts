/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

import { randomUUID } from 'node:crypto';
import process from 'node:process';

import {
	DEFAULT_HTML2PNG_OPTIONS,
	HTML2PNG_IPC_REQUEST,
	HTML2PNG_IPC_RESPONSE,
	Html2PngOptions,
	Html2PngResponseMessage
} from './html2pngProtocol.ts';
import { renderHtmlToPng } from './html2pngRenderer.ts';

const HTML2PNG_IPC_TIMEOUT = 60_000;

const pendingRequests = new Map<string, {
	resolve: (value: Buffer) => void;
	reject: (reason?: unknown) => void;
	timeout: NodeJS.Timeout;
}>();

let messageListenerRegistered = false;

function createRemoteError(message: Html2PngResponseMessage): Error {
	const error = new Error(message.error?.message ?? 'html2png remote renderer failed');
	error.stack = message.error?.stack ?? error.stack;
	return error;
}

function registerMessageListener() {
	if (messageListenerRegistered || !process.on) {
		return;
	}

	process.on('message', (message: unknown) => {
		const payload = message as Partial<Html2PngResponseMessage> | null;
		if (!payload || payload.type !== HTML2PNG_IPC_RESPONSE || !payload.requestId) {
			return;
		}

		const pending = pendingRequests.get(payload.requestId);
		if (!pending) {
			return;
		}

		clearTimeout(pending.timeout);
		pendingRequests.delete(payload.requestId);

		if (payload.error) {
			pending.reject(createRemoteError(payload as Html2PngResponseMessage));
			return;
		}

		if (!payload.imageBase64) {
			pending.reject(new Error('html2png remote renderer returned an empty payload'));
			return;
		}

		pending.resolve(Buffer.from(payload.imageBase64, 'base64'));
	});

	messageListenerRegistered = true;
}

function shouldUseShardManagerRenderer(): boolean {
	return Boolean(process.env.SHARDING_MANAGER && global.client?.shard && typeof global.client.shard.send === 'function');
}

async function renderViaShardManager(code: string, options: Html2PngOptions): Promise<Buffer> {
	registerMessageListener();

	const requestId = randomUUID();

	return await new Promise<Buffer>((resolve, reject) => {
		const timeout = setTimeout(() => {
			pendingRequests.delete(requestId);
			reject(new Error(`html2png request timed out after ${HTML2PNG_IPC_TIMEOUT}ms`));
		}, HTML2PNG_IPC_TIMEOUT);

		pendingRequests.set(requestId, { resolve, reject, timeout });

		global.client.shard!.send({
			type: HTML2PNG_IPC_REQUEST,
			requestId,
			code,
			options,
		}).catch((error) => {
			clearTimeout(timeout);
			pendingRequests.delete(requestId);
			reject(error);
		});
	});
}

export default async function html2Png(
	code: string,
	options: Html2PngOptions = DEFAULT_HTML2PNG_OPTIONS
): Promise<Buffer> {
	if (shouldUseShardManagerRenderer()) {
		return await renderViaShardManager(code, options);
	}

	return await renderHtmlToPng(code, options);
}
