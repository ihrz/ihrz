'use strict';
// W4 slice 80 battery: detachMemberFromSession + tryScrobbleListener
// finalize=true path, verbatim from src/core/modules/lastFMScrobblerManager.ts.
//
// detachMemberFromSession(session, userId):
//   const listener = session.listeners.get(userId);
//   if (!listener) return;
//   await this.tryScrobbleListener(session, listener, true);
//   this.clearListenerTimeout(listener);
//   session.listeners.delete(userId);
//
// tryScrobbleListener(session, listener, finalize=true):
//   if (listener.scrobbled || !this.shouldScrobble(session.track)) return false;
//   // finalize=true skips the stale-generation + presence gates.
//   if (this.getElapsedListeningMs(listener) < listener.thresholdMs) return false;
//   const response = await this.scrobbleTrack(listener, session.track);
//   if (!response.ok) {
//     if (this.isInvalidSessionError(response)) await this.invalidateUserSession(listener.userId);
//     else logger.err(...);
//     return false;
//   }
//   listener.scrobbled = true;
//   this.clearListenerTimeout(listener);
//   return true;

function shouldScrobble(track) {
	return track.durationMs >= 30_000;
}

function isInvalidSessionError(response) {
	return response.errorCode === 9 || /session/i.test(response.message || '');
}

function detach(session, userId, elapsedMs, postResult, ops) {
	const listener = session.listeners.get(userId);
	if (!listener) return;
	// tryScrobbleListener(session, listener, finalize=true), inlined.
	if (!listener.scrobbled && shouldScrobble(session.track)) {
		if (elapsedMs >= listener.thresholdMs) {
			ops.push(`post:${userId}`);
			if (!postResult.ok) {
				if (isInvalidSessionError(postResult)) {
					ops.push(`invalidate:${userId}`);
				}
				// else: logger.err only, no op.
			} else {
				listener.scrobbled = true;
			}
		}
	}
	ops.push(`clear:${userId}`);
	session.listeners.delete(userId);
	ops.push(`delete:${userId}`);
}

const TRACK = { durationMs: 200_000 };
const SHORT = { durationMs: 10_000 };

function mkSession(track) {
	return {
		track,
		listeners: new Map([['u1', { userId: 'u1', scrobbled: false, thresholdMs: 100_000 }]]),
	};
}

const OK = { ok: true };
const INVALID = { ok: false, errorCode: 9, message: 'Invalid session key' };
const OTHER = { ok: false, errorCode: 4, message: 'Authentication Failed' };

const cases = [
	// [name, track|null(absent session), present, scrobbled, elapsed, post, expected ops, dropped]
	['miss = total noop', TRACK, false, false, 0, OK, [], true],
	['scrobbled = clear + delete, no post', TRACK, true, true, 200_000, OK,
		['clear:u1', 'delete:u1'], true],
	['short track = clear + delete, no post', SHORT, true, false, 200_000, OK,
		['clear:u1', 'delete:u1'], true],
	['under threshold = clear + delete, no post', TRACK, true, false, 99_999, OK,
		['clear:u1', 'delete:u1'], true],
	['due + ok = post + clear + delete', TRACK, true, false, 150_000, OK,
		['post:u1', 'clear:u1', 'delete:u1'], true],
	['exact threshold boundary posts (< fails the check)', TRACK, true, false, 100_000, OK,
		['post:u1', 'clear:u1', 'delete:u1'], true],
	['due + invalid session = post + invalidate + clear + delete', TRACK, true, false, 150_000, INVALID,
		['post:u1', 'invalidate:u1', 'clear:u1', 'delete:u1'], true],
	['due + other error = post + clear + delete, no invalidate', TRACK, true, false, 150_000, OTHER,
		['post:u1', 'clear:u1', 'delete:u1'], true],
];

let fail = 0;
for (const [name, track, present, scrobbled, elapsed, post, want, dropped] of cases) {
	const sessions = new Map();
	if (present) {
		const s = mkSession(track);
		s.listeners.get('u1').scrobbled = scrobbled;
		sessions.set('g1', s);
	}
	const ops = [];
	if (sessions.has('g1')) detach(sessions.get('g1'), 'u1', elapsed, post, ops);
	const gone = present ? !sessions.get('g1').listeners.has('u1') : true;
	const ok = JSON.stringify(ops) === JSON.stringify(want) && gone === dropped;
	if (!ok) fail++;
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got=${JSON.stringify(ops)} want=${JSON.stringify(want)}`);
}

console.log(fail === 0 ? 'BATTERY GREEN 8/8' : `BATTERY RED ${fail} failures`);
process.exit(fail === 0 ? 0 : 1);
