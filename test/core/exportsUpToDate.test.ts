import { expect, test } from "bun:test";

import { checkExports } from "../../src/core/modules/exportsManifest.ts";

// The pre-commit hook (.githooks/pre-commit) regenerates src/exports; this is
// the safety net for a commit made with --no-verify or without the hook.
test("src/exports is up to date (bun run gen:exports)", async () => {
	expect(await checkExports()).toEqual([]);
});
