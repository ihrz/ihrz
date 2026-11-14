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

// The position shown right after a track change (trackClock.ts).
import { describe, expect, test } from "bun:test";

import {
	markPaused,
	markTrackStart,
	trackPosition
} from "../../src/core/modules/trackClock.ts";

function makePlayer(over: Record<string, unknown> = {}) {
	const data = new Map<string, unknown>();
	const p: any = {
		paused: false,
		lastPosition: 0,
		lastPositionChange: null as number | null,
		get position() {
			return (
				p.lastPosition +
				(p.lastPositionChange ? Date.now() - p.lastPositionChange : 0)
			);
		},
		queue: {
			current: {
				encoded: "enc-a",
				info: { identifier: "a", duration: 200_000, isStream: false }
			}
		},
		getData: (k: string) => data.get(k),
		setData: (k: string, v: unknown) => data.set(k, v),
		...over
	};
	return p;
}

describe("trackPosition", () => {
	test("paused before the node reported a position: it stays still, and goes on from there", () => {
		const p = makePlayer();
		const t0 = Date.now() - 10_000;
		markTrackStart(p, p.queue.current, t0);
		// Paused 2 s in; 8 s later, still 2 s.
		markPaused(p, true, t0 + 2_000);
		p.paused = true;
		expect(trackPosition(p)).toBe(2_000);
		// Resumed now: it goes on from 2 s, not from 10.
		markPaused(p, false);
		p.paused = false;
		const pos = trackPosition(p);
		expect(pos).toBeGreaterThanOrEqual(2_000);
		expect(pos).toBeLessThan(2_500);
	});

	test("a pause nobody noted (no markPaused) still stops the clock where it is seen", () => {
		const p = makePlayer();
		markTrackStart(p, p.queue.current, Date.now() - 3_000);
		p.paused = true;
		const first = trackPosition(p);
		const later = trackPosition(p);
		expect(later).toBe(first);
	});

	test("right after a skip, the new track starts at 0, not at the old track's position", () => {
		const p = makePlayer();
		// The node reported 150 s of the previous track 2 s ago.
		p.lastPosition = 150_000;
		p.lastPositionChange = Date.now() - 2_000;
		p.queue.current = {
			encoded: "enc-b",
			info: { identifier: "b", duration: 180_000 }
		};
		markTrackStart(p, p.queue.current, Date.now() - 1_500);
		const pos = trackPosition(p);
		expect(pos).toBeGreaterThanOrEqual(1_500);
		expect(pos).toBeLessThan(2_500);
	});

	test("once the node reports the new track, its position wins", () => {
		const p = makePlayer();
		markTrackStart(p, p.queue.current, Date.now() - 10_000);
		p.lastPosition = 4_000;
		p.lastPositionChange = Date.now();
		expect(trackPosition(p)).toBeLessThan(4_100);
	});

	test("paused: the last reported position, not one that keeps growing", () => {
		const p = makePlayer({ paused: true });
		p.lastPosition = 30_000;
		p.lastPositionChange = Date.now() - 60_000;
		expect(trackPosition(p)).toBe(30_000);
	});

	test("bounded by the duration; nothing playing is 0", () => {
		const p = makePlayer();
		p.lastPosition = 500_000;
		p.lastPositionChange = Date.now();
		expect(trackPosition(p)).toBe(200_000);
		p.queue.current = null;
		expect(trackPosition(p)).toBe(0);
	});

	test("the crossfade's start is kept when the node's trackStart comes later", () => {
		const p = makePlayer();
		const t0 = Date.now() - 3_000;
		markTrackStart(p, p.queue.current, t0);
		markTrackStart(p, p.queue.current, Date.now());
		expect(trackPosition(p)).toBeGreaterThanOrEqual(3_000);
	});

	test("a crossfade: the node's position is the outgoing track's until the fade ends", () => {
		const p = makePlayer();
		p.queue.current = {
			encoded: "enc-b",
			info: { identifier: "b", duration: 180_000 }
		};
		markTrackStart(p, p.queue.current, Date.now() - 1_000, 3_500);
		// Wavyzon reports deck A (the previous track) at 2 min while mixing.
		p.lastPosition = 120_000;
		p.lastPositionChange = Date.now();
		const pos = trackPosition(p);
		expect(pos).toBeGreaterThanOrEqual(1_000);
		expect(pos).toBeLessThan(2_000);
	});
});
