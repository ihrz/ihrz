#!/usr/bin/env python3
"""ihrz Rust migration — durable task-queue operations (atomic, lock-safe).

Single helper for coordinator.sh / worker.sh / integrate.sh / inventory.sh /
coord.sh. All mutations are atomic (write tmp + os.replace) and serialized
with an flock on queue.lock.

Queue schema (ops/rust-migration/queue.json):
{
  "version": 1,
  "tasks": {
    "<stable-id>": {
      "id": str, "type": inventory|implement|test|review|integrate,
      "title": str, "description": str, "acceptance": [str],
      "scope": ["rust/src/...", ...],        # file-scope prefixes, "" = tree-wide
      "depends_on": ["<id>", ...], "priority": int (higher first),
      "status": queued|running|needs-review|review-failed|integrating|
                done|failed|blocked,
      "owner": "", "worktree": "", "branch": "",
      "attempts": 0, "max_retries": 2, "timeout_sec": 3600,
      "created_utc": str, "updated_utc": str, "claimed_utc": str,
      "heartbeat_utc": str, "worker_pid": 0,
      "tests": {"passed": 0, "failed": 0, "note": ""},
      "review": {"verdict": "", "findings": "", "reviewer": ""},
      "integration": {"commit": "", "note": ""},
      "last_error": "", "history": ["..."]
    }
  }
}
"""
import argparse
import fcntl
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
QUEUE_FILE = os.path.join(HERE, "queue.json")
LOCK_FILE = os.path.join(HERE, "queue.lock")

VALID_TYPES = ("inventory", "implement", "test", "review", "integrate")
VALID_STATUS = ("queued", "running", "needs-review", "review-failed",
                "integrating", "done", "failed", "blocked")

TERMINAL = ("done", "failed", "blocked")


def utcnow():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def blank_queue():
    return {"version": 1, "tasks": {}}


def load():
    try:
        with open(QUEUE_FILE, encoding="utf-8") as fh:
            data = json.load(fh)
        if not isinstance(data, dict) or "tasks" not in data:
            raise ValueError("bad queue shape")
        return data
    except FileNotFoundError:
        return blank_queue()
    except (ValueError, json.JSONDecodeError) as exc:
        # Never silently proceed on a corrupt queue: back it up and report.
        corrupt = QUEUE_FILE + ".corrupt-" + utcnow().replace(":", "")
        try:
            os.replace(QUEUE_FILE, corrupt)
            print(f"mq: queue corrupt, preserved at {corrupt}: {exc}",
                  file=sys.stderr)
        except OSError:
            print(f"mq: queue corrupt and backup failed: {exc}",
                  file=sys.stderr)
        return blank_queue()


def save(data):
    tmp = QUEUE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, sort_keys=True)
        fh.write("\n")
    os.replace(tmp, QUEUE_FILE)


def with_lock(fn):
    with open(LOCK_FILE, "a+") as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        try:
            return fn()
        finally:
            fcntl.flock(lock.fileno(), fcntl.LOCK_UN)


def task_template(task_id, task_type, title):
    now = utcnow()
    return {
        "id": task_id, "type": task_type, "title": title,
        "description": "", "acceptance": [], "scope": [],
        "depends_on": [], "priority": 0, "status": "queued",
        "owner": "", "worktree": "", "branch": "",
        "attempts": 0, "max_retries": 2, "timeout_sec": 3600,
        "created_utc": now, "updated_utc": now, "claimed_utc": "",
        "heartbeat_utc": "", "worker_pid": 0,
        "tests": {"passed": 0, "failed": 0, "note": ""},
        "review": {"verdict": "", "findings": "", "reviewer": ""},
        "integration": {"commit": "", "note": ""},
        "last_error": "", "history": [f"{now} created"],
    }


def scopes_overlap(a_scopes, b_scopes):
    """Two scope lists conflict if any prefix overlaps ("" matches all)."""
    for a in a_scopes or [""]:
        for b in b_scopes or [""]:
            na, nb = a.rstrip("/"), b.rstrip("/")
            if na == nb or na.startswith(nb + "/") or nb.startswith(na + "/"):
                return True
            if na == "" or nb == "":
                return True
    return False


def deps_met(task, tasks):
    for dep in task.get("depends_on", []):
        other = tasks.get(dep)
        if other is None or other.get("status") != "done":
            return False
    return True


def cmd_init(_args):
    def _op():
        if os.path.exists(QUEUE_FILE):
            print("mq: queue.json already exists, leaving untouched")
            return
        save(blank_queue())
        print("mq: initialized empty queue.json")
    with_lock(_op)


def cmd_add(args):
    def _op():
        data = load()
        tasks = data["tasks"]
        if args.id in tasks and not args.force:
            print(f"mq: task {args.id} exists (use --force to replace)",
                  file=sys.stderr)
            return 1
        task = task_template(args.id, args.type, args.title)
        if args.body:
            task["description"] = args.body
        if args.scope:
            task["scope"] = [s.strip() for s in args.scope.split(",")
                             if s.strip()]
        if args.depends:
            task["depends_on"] = [d.strip() for d in args.depends.split(",")
                                  if d.strip()]
        task["priority"] = args.priority
        task["max_retries"] = args.max_retries
        task["timeout_sec"] = args.timeout
        if args.acceptance:
            task["acceptance"] = [a.strip()
                                  for a in args.acceptance.split("||")
                                  if a.strip()]
        if args.id in tasks:  # --force replace: keep creation history
            task["history"] = tasks[args.id].get("history", []) + \
                [f"{utcnow()} re-added (force)"]
        tasks[args.id] = task
        save(data)
        print(f"mq: added {args.id}")
        return 0
    return with_lock(_op)


def cmd_set(args):
    def _op():
        data = load()
        task = data["tasks"].get(args.id)
        if task is None:
            print(f"mq: unknown task {args.id}", file=sys.stderr)
            return 1
        try:
            value = json.loads(args.value)
        except json.JSONDecodeError:
            value = args.value
        task[args.field] = value
        task["updated_utc"] = utcnow()
        task["history"].append(f"{utcnow()} set {args.field}")
        save(data)
        print(f"mq: {args.id}.{args.field} updated")
        return 0
    return with_lock(_op)


def cmd_get(args):
    data = load()
    task = data["tasks"].get(args.id)
    if task is None:
        print(f"mq: unknown task {args.id}", file=sys.stderr)
        return 1
    if args.field:
        value = task.get(args.field)
        print(value if isinstance(value, str) else json.dumps(value))
    else:
        print(json.dumps(task, indent=2, sort_keys=True))
    return 0


def cmd_list(args):
    data = load()
    tasks = list(data["tasks"].values())
    if args.status:
        tasks.sort(key=lambda t: (-t.get("priority", 0), t["id"]))
        wanted = set(args.status.split(","))
        tasks = [t for t in tasks if t.get("status") in wanted]
    else:
        tasks.sort(key=lambda t: (-t.get("priority", 0), t["id"]))
    if args.json:
        print(json.dumps(tasks, indent=2, sort_keys=True))
    else:
        for t in tasks:
            print(f'{t["id"]} [{t["type"]}/{t.get("status")}] '
                  f'prio={t.get("priority", 0)} owner={t.get("owner", "")} :: '
                  f'{t.get("title", "")[:100]}')
    return 0


def cmd_next(_args):
    """Print the highest-priority runnable task id (queued, deps met,
    no scope conflict with running tasks). Empty output = none."""
    def _op():
        data = load()
        tasks = data["tasks"]
        running_scopes = [t.get("scope", [""])
                          for t in tasks.values()
                          if t.get("status") in ("running", "integrating")]
        cands = [t for t in tasks.values()
                 if t.get("status") == "queued" and deps_met(t, tasks)]
        cands.sort(key=lambda t: (-t.get("priority", 0), t["id"]))
        for t in cands:
            if any(scopes_overlap(t.get("scope", [""]), rs)
                   for rs in running_scopes):
                continue
            print(t["id"])
            return 0
        return 0
    return with_lock(_op)


def cmd_claim(args):
    def _op():
        data = load()
        task = data["tasks"].get(args.id)
        if task is None:
            print(f"mq: unknown task {args.id}", file=sys.stderr)
            return 1
        if task.get("status") != "queued":
            print(f"mq: task {args.id} not queued "
                  f"(status={task.get('status')})", file=sys.stderr)
            return 1
        if not deps_met(task, data["tasks"]):
            print(f"mq: task {args.id} dependencies unmet", file=sys.stderr)
            return 1
        for other in data["tasks"].values():
            if other["id"] == args.id:
                continue
            if other.get("status") in ("running", "integrating") and \
                    scopes_overlap(task.get("scope", [""]),
                                   other.get("scope", [""])):
                print(f"mq: scope conflict with {other['id']}",
                      file=sys.stderr)
                return 1
        task["status"] = "running"
        task["owner"] = args.owner or task.get("owner") or "coordinator"
        task["worker_pid"] = args.pid or 0
        now = utcnow()
        task["claimed_utc"] = now
        task["heartbeat_utc"] = now
        task["updated_utc"] = now
        task["history"].append(f"{now} claimed by {task['owner']}")
        save(data)
        print(f"mq: claimed {args.id}")
        return 0
    return with_lock(_op)


def cmd_heartbeat(args):
    def _op():
        data = load()
        task = data["tasks"].get(args.id)
        if task is None:
            return 1
        task["heartbeat_utc"] = utcnow()
        if args.pid:
            task["worker_pid"] = args.pid
        save(data)
        return 0
    return with_lock(_op)


def cmd_complete(args):
    """Mark done/failed/blocked with durable record. Enforces the
    review gate: implement tasks cannot go done without a passed review
    unless --force is given (recorded in history)."""

    def _op():
        data = load()
        task = data["tasks"].get(args.id)
        if task is None:
            print(f"mq: unknown task {args.id}", file=sys.stderr)
            return 1
        if args.status not in VALID_STATUS:
            print(f"mq: bad status {args.status}", file=sys.stderr)
            return 1
        if task.get("type") == "implement" and args.status == "done" \
                and task.get("review", {}).get("verdict") != "pass" \
                and not args.force:
            print(f"mq: implement task {args.id} needs a passing review "
                  f"first (use --force to override)", file=sys.stderr)
            return 1
        now = utcnow()
        task["status"] = args.status
        task["updated_utc"] = now
        if args.result:
            task["last_error"] = args.result[:2000] if args.status != "done" \
                else task.get("last_error", "")
            if args.status == "done":
                task["integration"]["note"] = args.result[:1000]
        task["history"].append(
            f"{now} -> {args.status}" + (f" (force)" if args.force else "") +
            (f": {args.result[:160]}" if args.result else ""))
        save(data)
        print(f"mq: {args.id} -> {args.status}")
        return 0
    return with_lock(_op)


def cmd_retry_or_block(args):
    """Attempts++ ; requeue if attempts < max_retries else failed/blocked."""

    def _op():
        data = load()
        task = data["tasks"].get(args.id)
        if task is None:
            return 1
        now = utcnow()
        task["attempts"] = int(task.get("attempts", 0)) + 1
        task["owner"] = ""
        task["worker_pid"] = 0
        if args.error:
            task["last_error"] = args.error[:2000]
        if task["attempts"] >= int(task.get("max_retries", 2)):
            task["status"] = "failed"
            task["history"].append(
                f"{now} attempts exhausted ({task['attempts']}), -> failed")
        else:
            task["status"] = "queued"
            task["history"].append(
                f"{now} attempt {task['attempts']} failed, requeued: "
                f"{(args.error or '')[:160]}")
        task["updated_utc"] = now
        save(data)
        print(f"mq: {args.id} -> {task['status']} "
              f"(attempt {task['attempts']})")
        return 0
    return with_lock(_op)


def cmd_release(args):
    """Release a claim back to queued without counting an attempt
    (e.g. coordinator shutdown, stale worker with live diff preserved)."""

    def _op():
        data = load()
        task = data["tasks"].get(args.id)
        if task is None:
            return 1
        now = utcnow()
        task["status"] = "queued"
        task["owner"] = ""
        task["worker_pid"] = 0
        task["updated_utc"] = now
        task["history"].append(f"{now} released: {(args.reason or '')[:160]}")
        save(data)
        print(f"mq: released {args.id}")
        return 0
    return with_lock(_op)


def cmd_rm(args):
    """Delete a task (triage corrections only; records reason in history
    of the report file, not the queue). Refuses to delete running tasks."""

    def _op():
        data = load()
        task = data["tasks"].get(args.id)
        if task is None:
            print(f"mq: unknown task {args.id}", file=sys.stderr)
            return 1
        if task.get("status") == "running":
            print(f"mq: refusing to delete running task {args.id}",
                  file=sys.stderr)
            return 1
        del data["tasks"][args.id]
        save(data)
        print(f"mq: removed {args.id} ({args.reason[:120]})")
        return 0
    return with_lock(_op)


def cmd_stats(_args):
    data = load()
    counts = {}
    for t in data["tasks"].values():
        counts[t.get("status", "?")] = counts.get(t.get("status", "?"), 0) + 1
    print(json.dumps({"total": len(data["tasks"]), "by_status": counts},
                     indent=2, sort_keys=True))
    return 0


def cmd_stale(args):
    """List running tasks whose heartbeat is older than --older-than sec."""
    data = load()
    now = time.time()
    out = []
    for t in data["tasks"].values():
        if t.get("status") != "running":
            continue
        hb = t.get("heartbeat_utc", "")
        try:
            hb_t = time.mktime(time.strptime(hb, "%Y-%m-%dT%H:%M:%SZ"))
        except (ValueError, TypeError):
            hb_t = 0
        if now - hb_t > args.older_than:
            out.append(t["id"])
    print("\n".join(out))
    return 0


def build_parser():
    parser = argparse.ArgumentParser(prog="mq.py")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init")
    add = sub.add_parser("add")
    add.add_argument("id")
    add.add_argument("--type", default="implement", choices=VALID_TYPES)
    add.add_argument("--title", default="")
    add.add_argument("--body", default="")
    add.add_argument("--scope", default="")
    add.add_argument("--depends", default="")
    add.add_argument("--priority", type=int, default=0)
    add.add_argument("--max-retries", type=int, default=2)
    add.add_argument("--timeout", type=int, default=3600)
    add.add_argument("--acceptance", default="")
    add.add_argument("--force", action="store_true")
    setter = sub.add_parser("set")
    setter.add_argument("id")
    setter.add_argument("field")
    setter.add_argument("value")
    getter = sub.add_parser("get")
    getter.add_argument("id")
    getter.add_argument("field", nargs="?")
    lister = sub.add_parser("list")
    lister.add_argument("--status", default="")
    lister.add_argument("--json", action="store_true")
    sub.add_parser("next")
    claim = sub.add_parser("claim")
    claim.add_argument("id")
    claim.add_argument("--owner", default="")
    claim.add_argument("--pid", type=int, default=0)
    hb = sub.add_parser("heartbeat")
    hb.add_argument("id")
    hb.add_argument("--pid", type=int, default=0)
    comp = sub.add_parser("complete")
    comp.add_argument("id")
    comp.add_argument("--status", default="done")
    comp.add_argument("--result", default="")
    comp.add_argument("--force", action="store_true")
    retry = sub.add_parser("retry-or-block")
    retry.add_argument("id")
    retry.add_argument("--error", default="")
    rel = sub.add_parser("release")
    rel.add_argument("id")
    rel.add_argument("--reason", default="")
    sub.add_parser("stats")
    rm = sub.add_parser("rm")
    rm.add_argument("id")
    rm.add_argument("--reason", default="")
    stale = sub.add_parser("stale")
    stale.add_argument("--older-than", type=int, default=900)
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    handlers = {
        "init": cmd_init, "add": cmd_add, "set": cmd_set,
        "get": cmd_get, "list": cmd_list, "next": cmd_next,
        "claim": cmd_claim, "heartbeat": cmd_heartbeat,
        "complete": cmd_complete, "retry-or-block": cmd_retry_or_block,
        "release": cmd_release, "stats": cmd_stats, "stale": cmd_stale,
        "rm": cmd_rm,
    }
    try:
        result = handlers[args.cmd](args)
    except BrokenPipeError:
        return 0
    return result if isinstance(result, int) else 0


if __name__ == "__main__":
    sys.exit(main())
