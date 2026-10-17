// W7 slice 35 battery: Events/protection/avoidKickMember.ts decision legs.
// Verbatim replica (Discord I/O stubbed, pure decisions only).
// TS chain: outer Administrator gate -> data? -> data.kickmember? ->
// ViewAuditLog+ManageGuild gate (post-getLogs in TS, pre in Rust, same
// outcome) -> !relevantLog return -> allowlist/nobody dispatch ->
// !isOwner && shouldSanction -> punish(data, user) switch.

// Gate A replica: bot gates.
function gateA({ isAdmin, canAudit }) {
	if (!isAdmin) return 'skip-no-admin';
	// TS fetches the audit log here, then checks ViewAuditLog+ManageGuild.
	if (!canAudit) return 'skip-no-audit-grant';
	return 'proceed';
}

// Gate B+C+D replica: returns 'skip-no-data' | 'skip-rule-off' |
// 'skip-no-log' | 'sanction' | 'no-sanction'.
function verdict({ data, log, allowEntry, isOwner, ownerId }) {
	if (!data) return 'skip-no-data';
	if (data.kickmember) {
		if (!log) return 'skip-no-log';
		let user = `[cached:${log.executorId}]`;
		let shouldSanction = false;
		if (data.kickmember.mode === 'allowlist') {
			const baseData = allowEntry;
			if (!baseData) {
				// cache.get(executorId) || undefined
				user = log.executorCached ? `[cached:${log.executorId}]` : undefined;
				shouldSanction = true;
			}
		} else if (data.kickmember.mode === 'nobody') {
			if (log.executorId !== ownerId) {
				user = log.executorCached ? `[cached:${log.executorId}]` : undefined;
				shouldSanction = true;
			}
		}
		// `${user?.guild.id}.OWNER.${user?.id}` — undefined user reads a
		// garbage key, always misses.
		const ownerRow = user === undefined ? undefined : isOwner;
		if (!ownerRow && shouldSanction) return { v: 'sanction', user };
		return { v: 'no-sanction', user };
	}
	return 'skip-rule-off';
}

// punish() replica: returns 'noop' | 'derank-attempt' | 'ban-attempt' | 'throws'.
function punish(sanction, user) {
	switch (sanction) {
		case 'simply':
			return 'noop';
		case 'simply+derank':
			if (user === undefined) return 'throws'; // derank reads user.roles
			return 'derank-attempt';
		case 'simply+ban':
			if (user === undefined) return 'noop'; // user?.ban optional chain
			return 'ban-attempt';
		default:
			return 'noop';
	}
}

const T = (name, got, want) => {
	const s = JSON.stringify(got);
	const ok = s === JSON.stringify(want);
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got=${s} want=${JSON.stringify(want)}`);
	if (!ok) process.exitCode = 1;
};

// --- Gate A ---
T('A1 non-admin', gateA({ isAdmin: false, canAudit: true }), 'skip-no-admin');
T('A2 no-audit-grant', gateA({ isAdmin: true, canAudit: false }), 'skip-no-audit-grant');
T('A3 full-grants', gateA({ isAdmin: true, canAudit: true }), 'proceed');

// --- Gate B: data / kickmember truthiness ---
const base = { log: { executorId: '9', executorCached: true }, allowEntry: null, isOwner: null, ownerId: '1' };
T('B1 no-data-undef', verdict({ ...base, data: undefined }), 'skip-no-data');
T('B2 no-data-null', verdict({ ...base, data: null }), 'skip-no-data');
T('B3 rule-missing', verdict({ ...base, data: {} }), 'skip-rule-off');
T('B4 rule-false', verdict({ ...base, data: { kickmember: false } }), 'skip-rule-off');
T('B5 rule-zero', verdict({ ...base, data: { kickmember: 0 } }), 'skip-rule-off');
T('B6 rule-empty-str', verdict({ ...base, data: { kickmember: '' } }), 'skip-rule-off');
T('B7 rule-true', verdict({ ...base, data: { kickmember: true } }), { v: 'no-sanction', user: '[cached:9]' });
T('B8 rule-str', verdict({ ...base, data: { kickmember: 'yes' } }), { v: 'no-sanction', user: '[cached:9]' });
T('B9 rule-empty-obj', verdict({ ...base, data: { kickmember: {} } }), { v: 'no-sanction', user: '[cached:9]' });
T('B10 no-log', verdict({ ...base, data: { kickmember: { mode: 'allowlist' } }, log: null }), 'skip-no-log');

// --- Gate C: mode dispatch ---
const al = { mode: 'allowlist' }, nb = { mode: 'nobody' }, mb = { mode: 'member' };
T('C1 allow-no-entry', verdict({ ...base, data: { kickmember: al } }), { v: 'sanction', user: '[cached:9]' });
T('C2 allow-with-entry', verdict({ ...base, data: { kickmember: al }, allowEntry: { allowed: true } }), { v: 'no-sanction', user: '[cached:9]' });
T('C3 allow-false-obj', verdict({ ...base, data: { kickmember: al }, allowEntry: { allowed: false } }), { v: 'no-sanction', user: '[cached:9]' }); // truthy object, no sanction
T('C4 allow-falsy-zero', verdict({ ...base, data: { kickmember: al }, allowEntry: 0 }), { v: 'sanction', user: '[cached:9]' }); // falsy scalar sanctions in TS
T('C5 allow-falsy-empty-str', verdict({ ...base, data: { kickmember: al }, allowEntry: '' }), { v: 'sanction', user: '[cached:9]' });
T('C6 nobody-non-owner', verdict({ ...base, data: { kickmember: nb } }), { v: 'sanction', user: '[cached:9]' });
T('C7 nobody-owner', verdict({ ...base, data: { kickmember: nb }, log: { executorId: '1', executorCached: true } }), { v: 'no-sanction', user: '[cached:1]' });
T('C8 member-mode', verdict({ ...base, data: { kickmember: mb } }), { v: 'no-sanction', user: '[cached:9]' });

// --- Gate D: owner-row falsy scalars proceed ---
for (const [n, row] of [['false', false], ['zero', 0], ['empty-str', ''], ['null', null], ['undef', undefined]])
	T(`D-owner-${n}`, verdict({ ...base, data: { kickmember: al }, isOwner: row }), { v: 'sanction', user: '[cached:9]' });
T('D-owner-object', verdict({ ...base, data: { kickmember: al }, isOwner: { owner: true } }), { v: 'no-sanction', user: '[cached:9]' });

// --- Gate E: uncached executor -> user undefined -> punish shape ---
T('E1 uncached-sanction', verdict({ ...base, data: { kickmember: al }, log: { executorId: '9', executorCached: false } }), { v: 'sanction', user: undefined });
T('E2 punish-simply-undef', punish('simply', undefined), 'noop');
T('E3 punish-ban-undef', punish('simply+ban', undefined), 'noop');
T('E4 punish-unknown-undef', punish('whatever', undefined), 'noop');
T('E5 punish-derank-undef', punish('simply+derank', undefined), 'throws');
T('E6 punish-derank-cached', punish('simply+derank', '[cached:9]'), 'derank-attempt');
T('E7 punish-ban-cached', punish('simply+ban', '[cached:9]'), 'ban-attempt');
