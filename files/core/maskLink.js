function (link) {
    const maskedLink = link.replace(/./g, "*");
    return `[Hidden Link] ${maskedLink}`;
};

module.exports.maskLink = maskLink;