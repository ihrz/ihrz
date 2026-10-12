# iHorizon Discord Bot - live-sdk campaign runner.
# Runs plans/batch-NN.json sequentially with the SDK, one report per
# batch under qa-reports/. Stops after 2 consecutive batch failures
# (likely 429/flag - never push through rate limits).
# Token via IHRZ_TEST_TOKEN env only. Usage:
#   IHRZ_TEST_TOKEN=... IHRZ_LIVE_WRITE=1 ./run_all.sh [first [last]]

import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PLANS = os.path.join(HERE, "plans")
REPORTS = os.path.join(HERE, "..", "..", "qa-reports")
SDK = os.path.join(HERE, ".venv", "bin", "python")


def main() -> int:
    batches = sorted(f for f in os.listdir(PLANS)
                     if f.startswith("batch-") and f.endswith(".json"))
    first = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    last = int(sys.argv[2]) if len(sys.argv) > 2 else len(batches)
    fails = 0
    for name in batches:
        n = int(name.split("-")[1].split(".")[0])
        if n < first or n > last:
            continue
        out = os.path.join(REPORTS, f"live-batch-{n:02d}.json")
        if os.path.exists(out):
            print(f"skip {name} (report exists)", flush=True)
            continue
        print(f"run {name} ...", flush=True)
        env = dict(os.environ)
        p = subprocess.run([SDK, os.path.join(HERE, "sdk.py"), "run",
                            os.path.join(PLANS, name)],
                           capture_output=True, text=True, env=env, timeout=3600)
        with open(out, "w", encoding="utf8") as f:
            f.write(p.stdout[-20000:] if len(p.stdout) > 20000 else p.stdout)
        if p.returncode != 0:
            fails += 1
            with open(out + ".err", "w", encoding="utf8") as f:
                f.write(p.stderr[-4000:])
            print(f"{name} FAILED rc={p.returncode}", flush=True)
            if fails >= 2:
                print("two consecutive failures - stopping campaign", flush=True)
                return 1
        else:
            fails = 0
            try:
                raw = p.stdout
                data = json.loads(raw[raw.index("\n{") + 1:])
                bad = [a for a in data["actions"]
                       if a.get("verdict", "ok") != "ok"]
                print(f"{name} done: {len(data['actions'])} actions, "
                      f"{len(bad)} non-ok", flush=True)
            except Exception as e:  # noqa: BLE001
                print(f"{name} done (unparsed tail: {e})", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
