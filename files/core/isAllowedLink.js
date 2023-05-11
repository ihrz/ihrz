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

function isLinkAllowed(link) {
  hehe = false;

  if (!link.includes("://")) {
    hehe = true;
    return hehe;

  } else {
    const parsedUrl = url.parse(link);
    const domain = parsedUrl.hostname;
    allowedDomains.forEach(dns => { if (dns == domain) hehe = true });

    return hehe;
  };

};

module.exports.allowedDomains = allowedDomains;
module.exports.isLinkAllowed = isLinkAllowed;