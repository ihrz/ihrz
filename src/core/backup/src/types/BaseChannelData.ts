import { TextBasedChannelTypes, VoiceBasedChannelTypes, ThreadChannelType, ChannelType } from 'discord.js';
import { ChannelPermissionsData } from './';

export interface BaseChannelData {
	type: TextBasedChannelTypes | VoiceBasedChannelTypes | ThreadChannelType | ChannelType;
	name: string;
	parent?: string | null;
	permissions: ChannelPermissionsData[];
}
