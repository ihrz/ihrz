'use strict';
// W4 slice 79 battery: handleTrackEnd / handleQueueEnd (clearGuildSession)
// end-routing, verbatim from src/core/modules/lastFMScrobblerManager.ts.
//
// handleTrackEnd(player, track, reason):
//   const session = this.guildSessions.get(player.guildId);
//   if (!session) return;
//   for (const listener of session.listeners.values()) {
//     if (reason !== "loadFailed") await this.tryScrobbleListener(session, listener, true);
//     this.clearListenerTimeout(listener);
//   }
//   this.guildSessions.delete(player.guildId);
//
// handleQueueEnd(player): this.clearGuildSession(player.guildId);
// clearGuildSession(guildId):
//   const session = this.guildSessions.get(guildId);
//   if (!session) return;
//   for (const listener of session.listeners.values()) this.clearListenerTimeout(listener);
//   this.guildSessions.delete(guildId);

function handleTrackEnd(sessions, guildId, reason, ops) {
	const session = sessions.get(guildId);
	if (!session) return;
	for (const listener of session.listeners.values()) {
		if (reason !== 'loadFailed') {
			ops.push(`finalize:${listener.userId}`);
		}
		ops.push(`clear:${listener.userId}`);
	}
	sessions.delete(guildId);
	ops.push('delete');
}

function handleQueueEnd(sessions, guildId, ops) {
	const session = sessions.get(guildId);
	if (!session) return;
	for (const listener of session.listeners.values()) {
		ops.push(`clear:${listener.userId}`);
	}
	sessions.delete(guildId);
	ops.push('delete');
}

function mkSession(users) {
	const listeners = new Map();
	for (const u of users) listeners.set(u, { userId: u });
	return { listeners };
}

const cases = [
	// [name, driver, users|null(session absent), reason, expected ops]
	['end finished finalizes all + clears + deletes',
		'end', ['u1', 'u2'], 'finished',
		['finalize:u1', 'clear:u1', 'finalize:u2', 'clear:u2', 'delete']],
	['end stopped finalizes (strict !==)',
		'end', ['u1'], 'stopped', ['finalize:u1', 'clear:u1', 'delete']],
	['end replaced finalizes',
		'end', ['u1'], 'replaced', ['finalize:u1', 'clear:u1', 'delete']],
	['end cleanup finalizes',
		'end', ['u1'], 'cleanup', ['finalize:u1', 'clear:u1', 'delete']],
	['end loadFailed skips finalize but clears + deletes',
		'end', ['u1', 'u2'], 'loadFailed', ['clear:u1', 'clear:u2', 'delete']],
	['end loadfailed-case (lowercase f) still finalizes (strict compare)',
		'end', ['u1'], 'loadfailed', ['finalize:u1', 'clear:u1', 'delete']],
	['end empty-string reason finalizes',
		'end', ['u1'], '', ['finalize:u1', 'clear:u1', 'delete']],
	['end no session = total noop',
		'end', null, 'finished', []],
	['end no listeners still deletes session',
		'end', [], 'finished', ['delete']],
	['end loadFailed no listeners still deletes',
		'end', [], 'loadFailed', ['delete']],
	['queueEnd clears + deletes, never finalizes',
		'queue', ['u1', 'u2'], '-', ['clear:u1', 'clear:u2', 'delete']],
	['queueEnd no session = total noop',
		'queue', null, '-', []],
	['queueEnd empty listeners still deletes',
		'queue', [], '-', ['delete']],
];

let fail = 0;
for (const [name, driver, users, reason, want] of cases) {
	const sessions = new Map();
	if (users !== null) sessions.set('g1', mkSession(users));
	const ops = [];
	if (driver === 'end') handleTrackEnd(sessions, 'g1', reason, ops);
	else handleQueueEnd(sessions, 'g1', ops);
	const sessionGone = users === null ? sessions.size === 0 : !sessions.has('g1');
	const ok = JSON.stringify(ops) === JSON.stringify(want) && sessionGone;
	if (!ok) fail++;
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got=${JSON.stringify(ops)} want=${JSON.stringify(want)}`);
}

console.log(fail === 0 ? 'BATTERY GREEN 13/13' : `BATTERY RED ${fail} failures`);
process.exit(fail === 0 ? 0 : 1);
