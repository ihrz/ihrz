// W7 slice 46 battery: replicates src/Events/logs/messageDeleteLogs.ts
// attachment/embeds branch verbatim (no discord.js needed — pure Collection
// shape: size + first() + contentType).
// Run: node scratch/slice-w7s46-msgdelete.cjs
function tsRoute(size, firstContentType) {
    // message.attachments is a discord.js Collection.
    if (size >= 1) {
        const first = size >= 1 ? { contentType: firstContentType } : undefined;
        if (!first || !first.contentType) return "Drop"; // :71 return, no send
        if (size >= 2) return "Multi"; // :73 re-upload ALL, embeds NOT copied
        else if (first.contentType.startsWith("image/")) return "SingleImage"; // :98
        else if (first) return "SingleFile"; // :122
    } else if ([]) {
        // message.embeds is always truthy ([] too): copies appended. :141
        return "Text";
    }
    return "Text";
}

const cases = [
    // [size, contentType, expected]
    [0, null, "Text"], // no attachments -> [logsEmbed, ...copies]
    [1, null, "Drop"], // :71 !contentType -> whole run returns
    [1, undefined, "Drop"],
    [1, "", "Drop"], // falsy -> return
    [1, "image/png", "SingleImage"],
    [1, "image/", "SingleImage"], // startsWith edge
    [1, "image/gif", "SingleImage"],
    [1, "video/mp4", "SingleFile"],
    [1, "application/pdf", "SingleFile"],
    [1, "IMAGE/PNG", "SingleFile"], // case-sensitive startsWith
    [2, null, "Drop"], // :71 fires before the :73 multi leg
    [2, "image/png", "Multi"],
    [3, "video/mp4", "Multi"],
    [10, "image/jpeg", "Multi"], // discord max; TS maps ALL (no take(5))
];

let fail = 0;
for (const [size, ct, want] of cases) {
    const got = tsRoute(size, ct);
    const ok = got === want;
    if (!ok) fail++;
    console.log(`${ok ? "PASS" : "FAIL"} size=${size} ct=${JSON.stringify(ct)} -> ${got} (want ${want})`);
}
console.log(fail === 0 ? `GREEN ${cases.length}/${cases.length}` : `RED ${fail} failures`);
process.exit(fail === 0 ? 0 : 1);
