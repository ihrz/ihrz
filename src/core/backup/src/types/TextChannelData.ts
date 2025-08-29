import { BaseChannelData, MessageData, ThreadChannelData } from './';

export interface TextChannelData extends BaseChannelData {
	nsfw: boolean;
	parent?: string | null;
	topic?: string | null;
	rateLimitPerUser?: number;
	isNews: boolean;
	messages: MessageData[];
	threads: ThreadChannelData[];
}
