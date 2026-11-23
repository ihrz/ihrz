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

import { expect, test } from "bun:test";

import {
	canReplaceEmbedOf,
	isValidEmbedId,
	uploadedMediaName,
	withoutUploadedMedia
} from "../../src/core/functions/embedHelper.ts";

test("an uploaded image and an uploaded thumbnail get different file names", () => {
	expect(uploadedMediaName("image", "image.png")).not.toBe(
		uploadedMediaName("thumbnail", "image.png")
	);
	expect(uploadedMediaName("footer", "image.gif")).toBe("footer-image.gif");
});

test("a saved embed leaves out the media uploaded as files", () => {
	const source = {
		title: "Rules",
		image: { url: "attachment://image-image.png" },
		thumbnail: { url: "attachment://thumbnail-image.png" },
		footer: { text: "Staff", icon_url: "attachment://footer-image.png" }
	};

	const { embed, dropped } = withoutUploadedMedia(source);

	expect(dropped).toBe(true);
	expect(embed.title).toBe("Rules");
	expect(embed.image).toBeUndefined();
	expect(embed.thumbnail).toBeUndefined();
	expect(embed.footer).toEqual({ text: "Staff" });
	// The builder keeps its own copy (it still sends the files).
	expect(source.image.url).toBe("attachment://image-image.png");
	expect(source.footer.icon_url).toBe("attachment://footer-image.png");
});

test("media given as links are kept as they are", () => {
	const source = {
		image: { url: "https://example.com/banner.png" },
		thumbnail: { url: "https://example.com/logo.png" },
		footer: { text: "Staff", icon_url: "https://example.com/icon.png" }
	};

	const { embed, dropped } = withoutUploadedMedia(source);

	expect(dropped).toBe(false);
	expect(embed).toEqual(source);
});

test("embed codes follow the database key rules", () => {
	expect(isValidEmbedId("AbCdEfGhIjKlMnOp")).toBe(true);
	expect(isValidEmbedId("")).toBe(false);
	expect(isValidEmbedId("abc.")).toBe(false);
	expect(isValidEmbedId(undefined)).toBe(false);
});

test("only a message sent by iHorizon can have its embed replaced", () => {
	const fromBot = { author: { id: "100" } };
	const fromMember = { author: { id: "200" } };

	expect(canReplaceEmbedOf(fromBot, "100")).toBe(true);
	expect(canReplaceEmbedOf(fromMember, "100")).toBe(false);
	expect(canReplaceEmbedOf(fromBot, undefined)).toBe(false);
});
