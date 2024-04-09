/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 2.0 Generic (CC BY-NC-SA 2.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright © 2020-2024 iHorizon
*/

/*
    This code are a remixed code from https://github.com/FlyTri/lyrics-finder/tree/main
    Thank you!
*/

import { JSDOM } from "jsdom";

type Data = {
    songwriters?: string;
    title?: string;
    artist?: string;
    genres?: string;
    sources: string[];
    lyrics?: string;
};

const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

const requestOptions = {
    headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
    },
};

function getTextContent(dom: JSDOM, querySelect: string): string | undefined {
    const element = dom.window.document.querySelector(querySelect);
    return element ? element.textContent?.split(": ")[1] : undefined;
}

async function fetchData(url: string): Promise<string> {
    const response = await fetch(url, {
        headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html",
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    return await response.text();
}

export async function Google(name: string, language = "en"): Promise<Data> {
    if (!name || typeof name != "string") {
        throw new TypeError("Invalid name was provided");
    }
    if (language && typeof language != "string") {
        throw new TypeError("Invalid language was provided");
    }

    const url = `https://google.com/search?q=Lyrics+${name}&lr=lang_${language}`;
    const data = await fetchData(url);
    const dom = new JSDOM(data);

    const elements = Array.from(dom.window.document.querySelectorAll(".ujudUb"));
    if (!elements.length) {
        throw new Error("No result were found");
    }

    return {
        songwriters: getTextContent(dom, ".auw0zb"),
        title: dom.window.document.querySelector("div.PZPZlf.ssJ7i.B5dxMb")?.textContent!,
        artist: getTextContent(dom, "div[data-attrid='kc:/music/recording_cluster:artist']"),
        genres: getTextContent(
            dom,
            "div[data-attrid='kc:/music/recording_cluster:skos_genre']"
        ),
        sources: [
            "Google",
            dom.window.document.querySelector("span.S4TQId")?.textContent!,
        ].filter(Boolean),
        lyrics: elements
            .map((_, i) => {
                const line = Array.from(elements[i]?.querySelectorAll("span"));
                return line.map((_, index) => line[index].textContent).join("\n");
            })
            .join("\n\n"),
    };
}

export async function Musixmatch(name: string): Promise<Data> {
    if (!name || typeof name != "string") {
        throw new TypeError("Invalid name was provided");
    }

    const searchUrl = `https://musixmatch.com/search/${name}`;
    const searchData = await fetchData(searchUrl);
    const searchDom = new JSDOM(searchData);

    const titleElement = searchDom.window.document.querySelector(".title");
    const title = titleElement?.textContent!;
    const artist = searchDom.window.document.querySelector(".artist")?.textContent!;
    const endpoint = titleElement?.getAttribute("href");

    if (!endpoint) {
        throw new Error("No result were found");
    }

    const lyricsUrl = `https://musixmatch.com${endpoint}`;
    const lyricsData = await fetchData(lyricsUrl);
    const lyricsDom = new JSDOM(lyricsData);
    const elements = Array.from(lyricsDom.window.document.querySelectorAll(".lyrics__content__ok"));

    return {
        songwriters: getTextContent(lyricsDom, ".mxm-lyrics__copyright")?.replace("\n", ""),
        title,
        artist,
        genres: undefined,
        sources: ["Musixmatch"],
        lyrics: elements.map((_, i) => elements[i].textContent).join("\n\n"),
    };
}
