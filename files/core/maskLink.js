require("colors");

module.exports = {
    maskLink: function (link) {
        const maskedLink = link.replace(/./g, "*");
        return `[Hidden Link] ${maskedLink}`;
    }
}
