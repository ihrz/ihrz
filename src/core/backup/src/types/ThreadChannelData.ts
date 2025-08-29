import { Snowflake, ThreadAutoArchiveDuration, ThreadChannelType } from "discord.js";
import { MessageData } from "./MessageData";

export interface ThreadChannelData {
	type: ThreadChannelType;
	name: string;
	archived: boolean | null;
	autoArchiveDuration: ThreadAutoArchiveDuration | null;
	locked: boolean | null;
	rateLimitPerUser: number | null;
	messages: MessageData[];
}
