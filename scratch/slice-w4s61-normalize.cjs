// W4 slice 61 battery: normalizeTrack + shouldScrobble + duration legs verbatim.
function normalizeTrack(track) {
  const pluginInfo = track.pluginInfo;
  return {
    album: pluginInfo?.albumName,
    artist: track.info.author,
    durationMs: track.info.isStream ? 0 : track.info.duration,
    title: track.info.title,
    url: track.info.uri,
  };
}
const shouldScrobble = (t) => t.durationMs >= 30_000;
const getThresholdMs = (t) => Math.min(t.durationMs / 2, 240_000);
const durField = (ms) => ms > 0 ? Math.floor(ms / 1000).toString() : undefined;
const cases = [
  [{ info: { author: 'a', title: 't', isStream: false, duration: 200_000, uri: 'u' } }, 200_000, true, 100_000, '200'],
  [{ info: { author: 'a', title: 't', isStream: true, duration: 3_600_000, uri: 'u' } }, 0, false, 0, undefined],
  [{ info: { author: 'a', title: 't', isStream: true, duration: 0, uri: 'u' } }, 0, false, 0, undefined],
  [{ info: { author: 'a', title: 't', isStream: false, duration: 29_999, uri: 'u' } }, 29_999, false, 14_999.5, '29'],
  [{ info: { author: 'a', title: 't', isStream: false, duration: 600_000, uri: 'u' } }, 600_000, true, 240_000, '600'],
  [{ info: { author: 'a', title: 't', isStream: false, duration: 1500, uri: 'u' }, pluginInfo: { albumName: 'alb' } }, 1500, false, 750, '1'],
];
let fail = 0;
for (const [track, dur, scr, thr, df] of cases) {
  const n = normalizeTrack(track);
  const ok = n.durationMs === dur && shouldScrobble(n) === scr && getThresholdMs(n) === thr && durField(n.durationMs) === df;
  if (!ok) { fail++; console.log('FAIL', JSON.stringify(track.info), n.durationMs, shouldScrobble(n), getThresholdMs(n), durField(n.durationMs)); }
}
console.log(fail === 0 ? `GREEN ${cases.length}/${cases.length}` : `RED ${fail} failures`);
