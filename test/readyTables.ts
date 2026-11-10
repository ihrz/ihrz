/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

// `mock.module` is global to a bun process: every test file that fakes
// `Events/client/ready.js` must export the same names, or a module imported
// by another file finds an export missing. This is the list of ready.ts,
// except `giveawaysTable`: bun patches an already loaded module in place,
// and a fake here replaced the real lazy table that test/database checks.
const table = () => ({
	get: async () => null,
	set: async () => undefined,
	delete: async () => undefined,
	has: async () => false,
	all: async () => [],
	push: async () => undefined,
	pull: async () => undefined
});

export function readyTables(overrides: Record<string, unknown> = {}) {
	return {
		tempTable: table(),
		blacklistTable: table(),
		ownerTable: table(),
		profilTable: table(),
		authRestoreTable: table(),
		prevnamesTable: table(),
		apiTable: table(),
		scheduleTable: table(),
		metasTable: table(),
		backupsTable: table(),
		backupSchedulesTable: table(),
		event: {},
		...overrides
	};
}
