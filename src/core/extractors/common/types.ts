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

/**
 * Shared typings for the native music metadata extractors.
 * Every extractor resolves a music link into one of these plain shapes,
 * independently of the music streaming service being scraped.
 */

export interface Artist {
	name: string;
	url: string;
}

export interface Track {
	artist: Artist;
	duration: number;
	title: string;
	url: string;
	type: "song";
}

export interface RawAlbum {
	artist: Artist;
	description: string;
	numTracks: number;
	title: string;
	tracks: Track[];
	type: "album";
}

export interface RawPlaylist {
	creator?: Artist;
	description: string;
	numTracks: number;
	title: string;
	tracks: Track[];
	type: "playlist";
}

export type RawTrack = Track;

export type MetadataResult = RawTrack | RawAlbum | RawPlaylist;
