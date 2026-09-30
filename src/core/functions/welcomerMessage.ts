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

import {
	AttachmentBuilder,
	BaseGuildTextChannel,
	ContainerBuilder,
	GuildMember,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	Message,
	MessageFlags,
	SectionBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder
} from "discord.js";

export default async function welcomerMessage(
	channel: BaseGuildTextChannel,
	member: GuildMember,
	options: {
		message: string;
		accentColor: number;
		avatarAttachmentName: string;
		bannerImage?: Buffer;
		bannerAttachmentName?: string;
	}
): Promise<Message> {
	let thumbnailURL = member.displayAvatarURL({ size: 256 });
	const files: AttachmentBuilder[] = [];
	const bannerName = options.bannerAttachmentName ?? "image.png";
	const hasBanner = !!options.bannerImage;

	if (options.bannerImage) {
		files.push(
			new AttachmentBuilder(options.bannerImage, { name: bannerName })
		);
	}

	try {
		const avatarBuffer = await member.client.func.image64.image64(
			member.displayAvatarURL({
				size: 256,
				extension: "png",
				forceStatic: true
			})
		);
		if (avatarBuffer) {
			files.push(
				new AttachmentBuilder(avatarBuffer, {
					name: options.avatarAttachmentName
				})
			);
			thumbnailURL = `attachment://${options.avatarAttachmentName}`;
		}
	} catch {
		// Fallback to CDN URL below
	}

	const container = new ContainerBuilder()
		.setAccentColor(options.accentColor)
		.addSectionComponents(
			new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(options.message)
				)
				.setThumbnailAccessory(
					new ThumbnailBuilder().setURL(thumbnailURL)
				)
		);

	if (hasBanner) {
		container.addMediaGalleryComponents(
			new MediaGalleryBuilder().addItems(
				new MediaGalleryItemBuilder().setURL(
					`attachment://${bannerName}`
				)
			)
		);
	}

	return await member.client.func.method.channelSend(channel, {
		components: [container],
		files,
		flags: [MessageFlags.IsComponentsV2]
	});
}
