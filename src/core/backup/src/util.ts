import type {
	CategoryData,
	ChannelPermissionsData,
	CreateOptions,
	LoadOptions,
	MessageData,
	TextChannelData,
	ThreadChannelData,
	VoiceChannelData
} from './types';

import {
	CategoryChannel,
	Collection,
	Guild,
	GuildFeature,
	GuildDefaultMessageNotifications,
	GuildSystemChannelFlags,
	Message,
	OverwriteData,
	Snowflake,
	TextChannel,
	VoiceChannel,
	NewsChannel,
	ThreadChannel,
	Webhook,
	GuildExplicitContentFilter,
	GuildVerificationLevel,
	FetchMessagesOptions,
	StageChannel,
	GuildPremiumTier,
	OverwriteType,
	ChannelType,
	AttachmentBuilder,
	GuildChannelCreateOptions,
	MessagePayloadOption
} from "discord.js"

const MaxBitratePerTier: Record<number, number> = {
	[GuildPremiumTier.None]: 64000,
	[GuildPremiumTier.Tier1]: 128000,
	[GuildPremiumTier.Tier2]: 256000,
	[GuildPremiumTier.Tier3]: 384000
};

/**
 * Gets the permissions for a channel
 */
export function fetchChannelPermissions(channel: TextChannel | VoiceChannel | CategoryChannel | NewsChannel | StageChannel) {
	const permissions: ChannelPermissionsData[] = [];
	try {
		const typedChannel = channel;

		// Check if permissionOverwrites exists and has a cache property
		if (!typedChannel.permissionOverwrites || !typedChannel.permissionOverwrites.cache) {
			console.error(`Channel ${typedChannel.name || typedChannel.id || 'unknown'} doesn't have valid permissionOverwrites`);
			return permissions;
		}

		typedChannel.permissionOverwrites.cache
			.filter((p) => p.type === OverwriteType.Role)
			.forEach((perm) => {
				try {
					// For each overwrites permission
					if (!typedChannel.guild || !typedChannel.guild.roles || !typedChannel.guild.roles.cache) {
						return; // Skip if guild or roles cache is not available
					}

					const role = typedChannel.guild.roles.cache.get(perm.id);
					if (role) {
						// Check if perm.allow and perm.deny exist and have a bitfield property
						const allowBitfield = perm.allow && perm.allow.bitfield ? perm.allow.bitfield.toString() : '0';
						const denyBitfield = perm.deny && perm.deny.bitfield ? perm.deny.bitfield.toString() : '0';

						permissions.push({
							roleName: role.name,
							allow: allowBitfield,
							deny: denyBitfield
						});
					}
				} catch (permError) {
					console.error(`Error getting permissions for role ${perm?.id || 'unknown'}: ${permError}`);
				}
			});
	} catch (error) {
		console.error(`Error getting channel permissions: ${error}`);
	}
	return permissions;
}

/**
 * Fetches the voice channel data that is necessary for the backup
 */
export async function fetchVoiceChannelData(channel: VoiceChannel) {
	return new Promise<VoiceChannelData>(async (resolve) => {
		const typedChannel = channel;
		const channelData: VoiceChannelData = {
			type: ChannelType.GuildVoice,
			name: typedChannel.name,
			bitrate: typedChannel.bitrate,
			userLimit: typedChannel.userLimit,
			parent: typedChannel.parent ? typedChannel.parent.name : null,
			permissions: fetchChannelPermissions(typedChannel)
		};
		/* Return channel data */
		resolve(channelData);
	});
}

export async function fetchStageChannelData(channel: StageChannel) {
	return new Promise<VoiceChannelData>(async (resolve) => {
		const typedChannel = channel;
		const channelData: VoiceChannelData = {
			type: typedChannel.type,
			name: typedChannel.name,
			bitrate: typedChannel.bitrate,
			userLimit: typedChannel.userLimit,
			parent: typedChannel.parent ? typedChannel.parent.name : null,
			permissions: fetchChannelPermissions(typedChannel)
		};
		/* Return channel data */
		resolve(channelData);
	});
}

export async function fetchChannelMessages(channel: TextChannel | NewsChannel | ThreadChannel, options: CreateOptions): Promise<MessageData[]> {
	let messages: MessageData[] = [];
	const typedChannel = channel;
	const messageCount: number = isNaN(options?.maxMessagesPerChannel!) ? 10 : options.maxMessagesPerChannel!; // Fixed: Added non-null assertion
	const fetchOptions: FetchMessagesOptions = { limit: 100 };
	let lastMessageId: Snowflake | undefined; // Fixed: Initialize as undefined
	let fetchComplete: boolean = false;
	while (!fetchComplete) {
		if (lastMessageId) { // Fixed: Now properly checks if it's defined
			fetchOptions.before = lastMessageId;
		}
		const fetched = await typedChannel.messages.fetch(fetchOptions);
		if (fetched.size === 0) {
			break;
		}
		lastMessageId = fetched.last()?.id;
		await Promise.all(fetched.map(async (msg) => {
			if (!msg.author || messages.length >= messageCount) {
				fetchComplete = true;
				return;
			}
			const files = await Promise.all(msg.attachments.map(async (a) => {
				let attach = a.url
				if (a.url && ['png', 'jpg', 'jpeg', 'jpe', 'jif', 'jfif', 'jfi'].includes(a.url)) {
					if (options.saveImages) {
						// Fixed: Properly handle ArrayBuffer to Buffer conversion
						const arrayBuffer = await fetch(a.url).then((res) => res.arrayBuffer());
						attach = Buffer.from(arrayBuffer).toString("base64");
					}
				}
				return {
					name: a.name,
					attachment: attach
				};
			}))
			messages.push({
				username: msg.author.username,
				avatar: msg.author.displayAvatarURL(),
				content: msg.cleanContent,
				embeds: msg.embeds.map(x => x.toJSON()) || [],
				files,
				pinned: msg.pinned,
				sentAt: msg.createdAt.toISOString(),
			});
		}));
	}

	return messages;
}

/**
 * Fetches the text channel data that is necessary for the backup
 */
export async function fetchTextChannelData(channel: TextChannel | NewsChannel, options: CreateOptions) {
	return new Promise<TextChannelData>(async (resolve) => {
		const typedChannel = channel;
		const channelData: TextChannelData = {
			type: typedChannel.type,
			name: typedChannel.name,
			nsfw: typedChannel.nsfw,
			rateLimitPerUser: typedChannel.type === ChannelType.GuildText ? typedChannel.rateLimitPerUser : undefined,
			parent: typedChannel.parent ? typedChannel.parent.name : null,
			topic: typedChannel.topic,
			permissions: fetchChannelPermissions(typedChannel),
			messages: [],
			isNews: typedChannel.type === ChannelType.GuildAnnouncement,
			threads: []
		};
		/* Fetch channel threads */
		if (typedChannel.threads && typedChannel.threads.cache && typedChannel.threads.cache.size > 0) {
			await Promise.all(typedChannel.threads.cache.map(async (thread) => {
				const typedThread = thread;
				const threadData: ThreadChannelData = {
					type: typedThread.type,
					name: typedThread.name,
					archived: typedThread.archived,
					autoArchiveDuration: typedThread.autoArchiveDuration,
					locked: typedThread.locked,
					rateLimitPerUser: typedThread.rateLimitPerUser,
					messages: []
				};
				try {
					threadData.messages = await fetchChannelMessages(typedThread, options);
					/* Return thread data */
					channelData.threads.push(threadData);
				} catch (error) {
					channelData.threads.push(threadData);
				}
			}));
		}
		/* Fetch channel messages */
		try {
			channelData.messages = await fetchChannelMessages(typedChannel, options);

			/* Return channel data */
			resolve(channelData);
		} catch (error) {
			resolve(channelData);
		}
	});
}

/**
 * Creates a category for the guild
 */
export async function loadCategory(categoryData: CategoryData, guild: Guild) {
	return new Promise<CategoryChannel>((resolve) => {
		// Check if we are in selfbot mode
		let categoryPromise: Promise<CategoryChannel>;

		categoryPromise = guild.channels.create({
			name: categoryData.name,
			type: ChannelType.GuildCategory
		});

		categoryPromise.then(async (category) => {
			// When the category is created
			const finalPermissions: OverwriteData[] = categoryData.permissions
				.map((perm) => {
					const role = guild.roles.cache.find((r) => r.name === perm.roleName);
					if (role) {
						return {
							id: role.id,
							allow: BigInt(perm.allow),
							deny: BigInt(perm.deny),
							type: OverwriteType.Role
						} as OverwriteData;
					} else return null;
				})
				.filter((perm): perm is OverwriteData => perm !== null); // Fixed: Type guard to filter out nulls
			await category.permissionOverwrites.set(finalPermissions);
			resolve(category); // Return the category
		});
	});
}

/**
 * Create a channel and returns it
 */
export async function loadChannel(channelData: TextChannelData | VoiceChannelData, guild: Guild, category?: CategoryChannel | null, options?: LoadOptions) {
	return new Promise<void>(async (resolve) => {

		const loadMessages = (channel: TextChannel | ThreadChannel, messages: MessageData[], previousWebhook?: Webhook): Promise<Webhook | null> => { // Fixed: Return type can be null
			return new Promise<Webhook | null>(async (resolve) => {
				// Check if the channel is a thread or text channel
				let webhook: Webhook | null = previousWebhook || null;
				// Check if the channel is a thread by calling the isThread function if it exists
				const isThreadChannel = channel.isThread()

				if (!webhook && !isThreadChannel && (channel as TextChannel).fetchWebhooks) {
					try {
						const webhooks = await (channel as TextChannel).fetchWebhooks();
						webhook = webhooks.find((w) => w.name === 'MessagesBackup') || null;
					} catch (err) {
					}
				}

				if (!webhook && !isThreadChannel && (channel as TextChannel).createWebhook) {
					try {
						webhook = await (channel as TextChannel).createWebhook({
							name: 'MessagesBackup',
							avatar: channel.client.user.displayAvatarURL()
						}).catch((err): null => {
							return null;
						});
					} catch (err) {
					}
				}
				if (!webhook) {
					return resolve(null); // Fixed: Return null instead of undefined
				}
				// Filter empty messages
				messages = messages
					.filter((m) => m.content?.length! > 0 || m.embeds?.length! > 0 || m.files?.length! > 0)
					.reverse();

				if (options?.maxMessagesPerChannel && options.maxMessagesPerChannel !== -1) {
					messages = messages.slice(messages.length - options.maxMessagesPerChannel);
				}
				for (const msg of messages) {
					try {
						// Prepare base options for sending the message
						const messageOptions: MessagePayloadOption = {
							content: msg.content?.length ? msg.content : undefined,
							username: msg.username,
							avatarURL: msg.avatar,
							embeds: msg.embeds,
							allowedMentions: options?.allowedMentions
						};

						// Add attachments if present
						if (msg.files && msg.files.length > 0) {
							try {
								// Handle attachments compatible with both versions
								const buffer = await fetch(msg.files[0].attachment)
									.then((res) => res.arrayBuffer())
									.catch((error): null => {
										return null;
									});

								if (buffer) {
									messageOptions.files = [new AttachmentBuilder(Buffer.from(buffer), { name: msg.files[0].name })];
								}
							} catch (error) {
							}
						}

						const sentMsg = await webhook.send(messageOptions)
							.then((msg) => {
								return msg;
							})
							.catch((err) => {
								resolve(null);
							});
						if (msg.pinned && sentMsg) await (sentMsg as Message).pin();
					} catch (error) {
					}
				}
				resolve(webhook);
			});
		}
		// Prepare channel creation options based on mode
		let channelPromise: Promise<TextChannel>;


		// Normal mode with discord.js v14

		const createOptions: GuildChannelCreateOptions = {
			name: channelData.name,
			parent: category
		};

		// Set channel type for discord.js v14
		const channelTypeStr = String(channelData.type);
		if (channelTypeStr === String(ChannelType.GuildText)) {
			createOptions.type = ChannelType.GuildText;
		} else if (channelTypeStr === String(ChannelType.GuildVoice)) {
			createOptions.type = ChannelType.GuildVoice;
		} else if (channelTypeStr === String(ChannelType.GuildAnnouncement)) {
			createOptions.type = ChannelType.GuildAnnouncement;
		} else if (channelTypeStr === String(ChannelType.GuildStageVoice)) {
			createOptions.type = ChannelType.GuildStageVoice;
		}

		// Add channel type specific options
		if (channelTypeStr === String(ChannelType.GuildText) ||
			channelTypeStr === String(ChannelType.GuildAnnouncement) ||
			channelTypeStr === String(ChannelType.GuildForum) ||
			channelTypeStr === String(ChannelType.GuildMedia) ||
			channelTypeStr === String(ChannelType.GuildStageVoice)
		) {
			createOptions.topic = (channelData as TextChannelData).topic || undefined;
			createOptions.nsfw = (channelData as TextChannelData).nsfw;
			createOptions.rateLimitPerUser = (channelData as TextChannelData).rateLimitPerUser;
		} else if (channelTypeStr === String(ChannelType.GuildVoice) || channelTypeStr === 'GUILD_VOICE') {
			// Downgrade bitrate
			let bitrate = (channelData as VoiceChannelData).bitrate;
			const bitrates = Object.values(MaxBitratePerTier);
			while (bitrate > MaxBitratePerTier[guild.premiumTier]) {
				bitrate = bitrates[guild.premiumTier];
			}
			createOptions.bitrate = bitrate;
			createOptions.userLimit = (channelData as VoiceChannelData).userLimit;
		}

		channelPromise = (guild.channels).create(createOptions);

		channelPromise.then(async (channel) => {
			/* Update channel permissions */
			const finalPermissions: OverwriteData[] = channelData.permissions
				.map((perm) => {
					const role = guild.roles.cache.find((r) => r.name === perm.roleName);
					if (role) {
						return {
							id: role.id,
							allow: BigInt(perm.allow),
							deny: BigInt(perm.deny),
							type: OverwriteType.Role
						} as OverwriteData;
					} else return null;
				})
				.filter((perm): perm is OverwriteData => perm !== null); // Fixed: Type guard to filter out nulls
			await channel.permissionOverwrites.set(finalPermissions);
			if (channelData.type === ChannelType.GuildText) {
				/* Load messages */
				let webhook: Webhook | null; // Fixed: Can be null

				// Check if the channel has messages
				if ((channelData as TextChannelData).messages && (channelData as TextChannelData).messages.length > 0) {
					try {
						webhook = await loadMessages(channel as TextChannel, (channelData as TextChannelData).messages);
					} catch (err) {
						webhook = null; // Set to null on error
					}
				} else {
					webhook = null; // Set to null when no messages
				}
				const loadThreadMessages = async (): Promise<void> => {
					if ((channelData as TextChannelData).threads && (channelData as TextChannelData).threads.length > 0) {
						// Check if the channel has the threads property
						if (!(channel).threads) {
							return;
						}

						await Promise.all((channelData as TextChannelData).threads.map(async (threadData) => {
							let autoArchiveDuration = threadData.autoArchiveDuration;
							//if (!guild.features.includes('SEVEN_DAY_THREAD_ARCHIVE') && autoArchiveDuration === 10080) autoArchiveDuration = 4320;
							//if (!guild.features.includes('THREE_DAY_THREAD_ARCHIVE') && autoArchiveDuration === 4320) autoArchiveDuration = 1440;

							try {
								// Check if the thread already exists
								const existingThread = channel.threads && (channel).threads.cache ?
									channel.threads.cache.find((t) => t.name === threadData.name) : null;

								if (existingThread) {
									await loadMessages(existingThread, threadData.messages, webhook || undefined);
								} else if (channel.threads) {
									// Create a new thread
									const newThread = await (channel).threads.create({
										name: threadData.name,
										autoArchiveDuration: autoArchiveDuration || undefined
									});
									await loadMessages(newThread, threadData.messages, webhook || undefined);
								}
							} catch (error) {
							}
						}));
					}
				}
				await loadThreadMessages();
				resolve(undefined);
			} else {
				resolve(undefined); // Return undefined for non-text channels
			}
		});
	});
}

/**
 * Delete all roles, all channels, all emojis, etc... of a guild
 */
export async function clearGuild(guild: Guild) {
	// Delete roles
	guild.roles.cache
		.filter((role) => role.editable && role.id !== guild.id)
		.forEach(async (role) => {
			try {
				await role.delete();
			} catch { }
		});
	// Delete channels
	guild.channels.cache.forEach(async (channel) => {
		try {
			await channel.delete();
		} catch { }
	});
	// Delete emojis
	guild.emojis.cache.forEach(async (emoji) => {
		try {
			await emoji.delete();
		} catch { }
	});
	// Delete webhooks
	const webhooks = await guild.fetchWebhooks();
	webhooks.forEach(async (webhook) => {
		await webhook.delete();
	});
	// Unban members
	const bans = await guild.bans.fetch();
	bans.forEach(async (ban) => {
		await guild.members.unban(ban.user.id);
	});
	guild.setAFKChannel(null);
	guild.setAFKTimeout(60 * 5);
	guild.setIcon(null);
	guild.setBanner(null).catch(() => { });
	guild.setSplash(null).catch(() => { });
	guild.setDefaultMessageNotifications(GuildDefaultMessageNotifications.OnlyMentions);
	guild.setWidgetSettings({
		enabled: false,
		channel: null
	});
	if (!guild.features.includes(GuildFeature.Community)) {
		guild.setExplicitContentFilter(GuildExplicitContentFilter.Disabled);
		guild.setVerificationLevel(GuildVerificationLevel.None);
	}
	guild.setSystemChannel(null);
	guild.setSystemChannelFlags([GuildSystemChannelFlags.SuppressGuildReminderNotifications, GuildSystemChannelFlags.SuppressJoinNotifications, GuildSystemChannelFlags.SuppressPremiumSubscriptions]);
	return;
}