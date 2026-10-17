// W7 slice 53 battery: replicates src/Events/client/onRateLimit.ts verbatim.
const cases = [
    { route: "/channels/123", url: "https://discord.com/api/v10/channels/123", method: "POST", scope: "user", global: false, limit: 5, retryAfter: 1200, timeToReset: 1200, hash: "abc", majorParameter: "123", sublimitTimeout: undefined },
    { route: "/guilds/1", url: "https://discord.com/api/v10/guilds/1", method: "GET", scope: "global", global: true, limit: 50, retryAfter: 5000, timeToReset: 5000, hash: "def", majorParameter: undefined, sublimitTimeout: 0 },
];
let fail = 0;
for (const data of cases) {
    let msg =
        "⚠️ Rate limit detected\nRoute: " +
        data.route +
        "\nURL: " +
        data.url +
        "\nMethod: " +
        data.method +
        "\nScope: " +
        data.scope +
        "\nGlobal: " +
        data.global +
        "\nLimit: " +
        data.limit +
        "\nRetry After: " +
        data.retryAfter +
        "ms\nTime To Reset: " +
        data.timeToReset +
        "ms\nHash: " +
        data.hash +
        "\nMajor Param: " +
        data.majorParameter +
        "\nSublimit Timeout: " +
        data.sublimitTimeout +
        "ms";
    console.log(JSON.stringify(msg));
}
console.log("battery done, 2 cases");
