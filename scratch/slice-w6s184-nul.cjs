// W6 slice 184 battery: isAllowedLinks.ts NUL/control legs verbatim.
// Replicates `url.parse(link).hostname` + the allowlist decision exactly,
// including the THROW legs (isAllowedLinks has no try/catch; url.parse
// throws propagate to the caller).
const url = require('url');

const DOMAINS = [
  'open.spotify.com','play.spotify.com','spotify.com','www.spotify.com',
  'www.deezer.com','deezer.com','deezer.page.link','dzr.page.link','link.deezer.com',
  'soundcloud.com','www.soundcloud.com','on.soundcloud.com','m.soundcloud.com',
  'music.apple.com','www.music.apple.com','www.napster.com','napster.com','us.napster.com',
  'music.amazon.com','amazon.com','www.amazon.com','music.amazon.co.uk','music.amazon.de',
  'music.amazon.fr','music.amazon.it','music.amazon.es','music.amazon.ca','music.amazon.co.jp',
  'music.amazon.com.au','music.amazon.com.br','music.amazon.in','music.amazon.com.mx',
  'cdn.discordapp.com','youtu.be','youtube.com','www.youtube.com','music.youtube.com',
  'cdn.discordapp.com','youtu.be','youtube.com','www.youtube.com','music.youtube.com',
  'tidal.com','www.tidal.com','listen.tidal.com','store.tidal.com','tidal.lnk.to','tdl.lnk.to',
];

function isAllowedLinks(link) {
  if (link !== null) {
    const parsedUrl = url.parse(link);
    if (parsedUrl.hostname !== null) {
      return allowedDomains_includes(parsedUrl.hostname);
    }
  }
  return true;
}
function allowedDomains_includes(h) { return DOMAINS.includes(h); }

// [input, expected] — expected is true/false, or 'THROW' when url.parse throws.
const cases = [
  ['foo:youtube.com\0', true],          // hostname cut at NUL -> youtube.com, allowed
  ['foo:youtube.com\0evil', 'THROW'],   // NUL mid-host with garbage tail throws
  ['foo:youtube.com:80\0', true],       // port leg drops ":80\0" -> youtube.com
  ['https://open.spotify.com/\0', true],
  ['https://open.spotify.com\0.evil.com/', 'THROW'],
  ['https://open.spotify.com:443\0/', true],
  ['\0https://open.spotify.com/', true],// leading NUL ignored -> allowed host
  ['https://\0open.spotify.com/', 'THROW'],
  ['https://open.spotify.com\x7f/', false], // DEL kept in hostname -> miss
  ['https://open.spotify.com\x01/', false], // C0 kept in hostname -> miss
  ['foo:bar\0:80/x', 'THROW'],
  ['foo:youtube.com\0 ', true],         // trailing NUL+space cut -> youtube.com
  ['foo:youtube.com\0\0', true],        // trailing NUL run cut -> youtube.com
  ['foo:youtube.com \0', true],         // space ends host first, NUL in path
];

let pass = 0, fail = 0;
for (const [input, want] of cases) {
  let got;
  try { got = isAllowedLinks(input); }
  catch (e) { got = 'THROW'; }
  const ok = got === want;
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${JSON.stringify(input)} -> ${JSON.stringify(got)} (want ${JSON.stringify(want)})`);
}
console.log(`slice-w6s184: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
