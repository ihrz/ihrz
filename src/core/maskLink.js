async function maskLink(input) {
    let isLink = false;

    let blacklistContent = [
        "http://",
        "https://",
        "discord.gg/",
        ".gg/"
    ];

    await blacklistContent.forEach(content => {
        if (input.includes(content)) { isLink = true };
    });

    if (isLink) {
        return `[Hidden Link] ${input.replace(/./g, "*")}`;
    }

    return input;
};

module.exports.maskLink = maskLink;