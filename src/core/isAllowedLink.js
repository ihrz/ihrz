const url = require('url');

const allowedDomains = [
  'open.spotify.com', 'play.spotify.com', 'spotify.com',
  'www.spotify.com', 'www.deezer.com', 'deezer.com',
  'www.youtube.com', 'youtube.com', 'youtu.be',
  'soundcloud.com', 'www.soundcloud.com',
  'music.apple.com', 'www.music.apple.com',
  'music.youtube.com', 'www.music.youtube.com',
  'www.napster.com', 'napster.com', 'us.napster.com',
  'play.google.com', 'music.youtube.com',
  'music.apple.com', 'www.music.apple.com',
];

module.exports.allowedDomains = allowedDomains;
module.exports.isLinkAllowed = (link) => !link.includes("://") || allowedDomains.includes(url.parse(link).hostname);