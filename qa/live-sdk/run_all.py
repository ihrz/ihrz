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
LOCK = os.path.join(HERE, ".campaign.lock")


def acquire_lock() -> bool:
    try:
        fd = os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, str(os.getpid()).encode())
        os.close(fd)
        return True
    except FileExistsError:
        return False


def main() -> int:
    if not acquire_lock():
        print("another campaign runner holds the lock - refusing to start", flush=True)
        return 2
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
                try:
                    os.unlink(LOCK)
                except OSError:
                    pass
                return 1
        else:
            fails = 0
            try:
                raw = p.stdout
                data = json.loads(raw[raw.index("\n{") + 1:])
                bad = [a for a in data["actions"]
                       if not a.get("verdict", "ok").startswith("ok")]
                print(f"{name} done: {len(data['actions'])} actions, "
                      f"{len(bad)} non-ok", flush=True)
            except Exception as e:  # noqa: BLE001
                print(f"{name} done (unparsed tail: {e})", flush=True)
    # Aggregate verdict counts across all batch reports in range.
    total = 0
    verdicts: dict = {}
    counted = 0
    for name in batches:
        n = int(name.split("-")[1].split(".")[0])
        if n < first or n > last:
            continue
        out = os.path.join(REPORTS, f"live-batch-{n:02d}.json")
        try:
            with open(out, encoding="utf8") as f:
                raw = f.read()
            data = json.loads(raw[raw.index("\n{") + 1:] if "\n{" in raw else raw)
        except (OSError, ValueError):
            continue
        actions = data.get("actions", []) if isinstance(data, dict) else []
        counted += 1
        for a in actions:
            total += 1
            v = a.get("verdict", "ok") if isinstance(a, dict) else "ok"
            verdicts[v] = verdicts.get(v, 0) + 1
    print(f"aggregate: {total} actions across {counted} reports: "
          + (", ".join(f"{k}={v}" for k, v in sorted(verdicts.items()))
             if verdicts else "no verdicts"), flush=True)
    try:
        os.unlink(LOCK)
    except OSError:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
