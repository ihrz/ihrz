// W7 slice 33 battery: Events/protection/avoidMemberUpdate.ts decision legs.
// Verbatim replica (Discord I/O stubbed, pure decisions only).
const { Collection } = require('discord.js');

const roleObjs = {};
const role = (id) => (roleObjs[id] ??= { id });
const mkRoles = (ids) => new Collection(ids.map((id) => [id, role(id)]));
const rolesEqual = (oldIds, newIds) => mkRoles(oldIds).equals(mkRoles(newIds));

// Gate B+C replica: returns 'skip-no-roles' | 'skip-no-data' | 'skip-rule-off'
// | 'skip-no-log' | 'sanction' | 'no-sanction'
function verdict({ oldIds, newIds, data, log, allowEntry, isOwner, ownerId }) {
	if (mkRoles(oldIds).equals(mkRoles(newIds))) return 'skip-no-roles';
	if (!data) return 'skip-no-data';
	if (data.updatemember) {
		if (!log) return 'skip-no-log';
		let user = { id: log.executorId };
		let shouldSanction = false;
		if (data.updatemember.mode === 'allowlist') {
			if (!allowEntry) {
				user = { id: log.executorId };
				shouldSanction = true;
			}
		} else if (data.updatemember.mode === 'nobody') {
			if (log.executorId !== ownerId) {
				user = { id: log.executorId };
				shouldSanction = true;
			}
		}
		if (!isOwner && shouldSanction) return 'sanction';
		return 'no-sanction';
	}
	return 'skip-rule-off';
}

const T = (name, got, want) => {
	const ok = got === want;
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
	if (!ok) process.exitCode = 1;
};

// --- Gate A: Collection.equals ---
T('A1 same-order', rolesEqual(['1', '2'], ['1', '2']), true);
T('A2 reordered', rolesEqual(['1', '2'], ['2', '1']), true); // order-insensitive: TS skips
T('A3 added', rolesEqual(['1'], ['1', '2']), false);
T('A4 removed', rolesEqual(['1', '2'], ['1']), false);
T('A5 empty-empty', rolesEqual([], []), true);
T('A6 empty-vs-one', rolesEqual([], ['1']), false);

// --- Gate B: data / updatemember truthiness ---
const base = { oldIds: ['1'], newIds: ['1', '2'], log: { executorId: '9' }, allowEntry: null, isOwner: null, ownerId: '1' };
T('B1 no-data-undef', verdict({ ...base, data: undefined }), 'skip-no-data');
T('B2 no-data-null', verdict({ ...base, data: null }), 'skip-no-data');
T('B3 rule-missing', verdict({ ...base, data: {} }), 'skip-rule-off');
T('B4 rule-false', verdict({ ...base, data: { updatemember: false } }), 'skip-rule-off');
T('B5 rule-zero', verdict({ ...base, data: { updatemember: 0 } }), 'skip-rule-off');
T('B6 rule-empty-str', verdict({ ...base, data: { updatemember: '' } }), 'skip-rule-off');
T('B7 rule-true', verdict({ ...base, data: { updatemember: true } }), 'no-sanction');
T('B8 rule-str', verdict({ ...base, data: { updatemember: 'yes' } }), 'no-sanction');
T('B9 rule-empty-obj', verdict({ ...base, data: { updatemember: {} } }), 'no-sanction');

// --- Gate C: modes ---
T('C1 allowlist-miss', verdict({ ...base, data: { updatemember: { mode: 'allowlist' } } }), 'sanction');
T('C2 allowlist-hit', verdict({ ...base, data: { updatemember: { mode: 'allowlist' } }, allowEntry: { allowed: true } }), 'no-sanction');
T('C3 allowlist-false-obj', verdict({ ...base, data: { updatemember: { mode: 'allowlist' } }, allowEntry: { allowed: false } }), 'no-sanction');
T('C4 nobody-stranger', verdict({ ...base, data: { updatemember: { mode: 'nobody' } } }), 'sanction');
T('C5 nobody-owner', verdict({ ...base, data: { updatemember: { mode: 'nobody' } }, log: { executorId: '1' } }), 'no-sanction');
T('C6 member-mode', verdict({ ...base, data: { updatemember: { mode: 'member' } } }), 'no-sanction');
T('C7 weird-mode', verdict({ ...base, data: { updatemember: { mode: 'EVERYONE' } } }), 'no-sanction');
T('C8 no-log', verdict({ ...base, data: { updatemember: { mode: 'allowlist' } }, log: null }), 'skip-no-log');
T('C9 owner-row', verdict({ ...base, data: { updatemember: { mode: 'allowlist' } }, isOwner: { owner: true } }), 'no-sanction');
T('C10 owner-false-obj', verdict({ ...base, data: { updatemember: { mode: 'allowlist' } }, isOwner: { owner: false } }), 'no-sanction');
T('C11 isOwner-false', verdict({ ...base, data: { updatemember: { mode: 'allowlist' } }, isOwner: false }), 'sanction');
T('C12 isOwner-zero', verdict({ ...base, data: { updatemember: { mode: 'allowlist' } }, isOwner: 0 }), 'sanction');
