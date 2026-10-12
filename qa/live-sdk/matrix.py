# iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
# Licensed under CC-BY-NC-SA-4.0. Mainly developed by Kisakay.
# Copyright (C) 2020-2026 iHorizon

# Exhaustive live-test matrix generator. Reads the registry dump
# (src/files/commands.json, 90 tops) and emits ordered SDK plan
# batches (plans/batch-NN.json, 25 actions max) covering every leaf
# in BOTH forms (slash + prefix), plus PLAN.md with the skip ledger.
#
# Classification per leaf slash-path:
#   SKIP-DESTRUCTIVE  ban/kick/mute/purge/warn/role-edits on users,
#                     eval/owner/unowner, channel-spawning sweeps,
#                     restores/resets (backup load, ureset/greset).
#   SKIP-CONTEXT      needs a live object id (giveaway end/reroll,
#                     suggestion reply/deny/accept/delete, message
#                     context-menu commands, backup delete, schedule
#                     delete, tag edit/delete).
#   SKIP-ATTACHMENT   required attachment option (custom avatar/banner).
#   PAIRED            lock/unlock + hide/unhide run adjacent on the
#                     dedicated CMD2 channel, never the test channel.
#   LAST              setlang runs at the very end (changes guild lang).
# Everything else runs with safe probe values (self targets only,
# @everyone for roles, TEST_CHANNEL for channels, "qa probe" strings).

import json
import os

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DUMP = os.path.join(REPO, "src", "files", "commands.json")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "plans")

SELF_ID = "1542861131939577949"
GUILD_ID = "999449972615413861"
TEST_CHANNEL = "1509600862346154064"  # cmd-1
CMD2_CHANNEL = "1509600863512170496"  # cmd-2 (paired lock/hide target)
PREFIX = "."

# Full slash paths (space-joined) skipped: destructive / spawning.
SKIP_DESTRUCTIVE = {
    "mod ban", "mod kick", "mod tempmute", "mod tempban", "mod warn",
    "mod unwarn", "mod clear", "mod temprole", "mod unban", "mod unmute",
    "mod unmuteall", "mod clearwarn", "mod clear-all-warns",
    "mod lock-all", "mod unlock-all",
    "unban-all all", "unban-all undo",
    "blacklist", "unblacklist", "bledit", "eval", "owner", "unowner",
    "gw reroll", "gw end",
    "ticket open", "ticket close", "ticket delete", "ticket add-member",
    "ticket remove-member", "ticket remind", "ticket rename",
    "ticket transcript", "ticket unlink",
    "util massmove", "util massiverole", "util bringall", "util talk",
    "util untalk", "util freeze", "util unfreeze", "util move",
    "util vkick", "util derank", "util addrole", "util delrole",
    "economy ureset", "economy greset", "economy role",
    "ranks ureset", "ranks greset",
    "authrestore delete", "authrestore force-join",
    "guildconfig setup", "perm create-roles",
    "backup load", "backup delete", "schedule delete-all",
    "util unzip-emojis", "util renewvc", "utils renew",
    "channel hideall", "channel unhideall",
}
# Needs a live object id produced by another command.
SKIP_CONTEXT = {
    "gw list-entries", "gw get-data", "backup delete", "schedule delete",
    "tag edit", "tag delete",
    "suggest reply", "suggest deny", "suggest accept", "suggest delete",
    "Pose a question!", "Play it in a voice channel", "Convert to MP4",
}
# Adjacent pairs on CMD2: (locker, unlocker).
PAIRED = [
    (["mod", "lock"], ["mod", "unlock"]),
    (["channel", "hide"], ["channel", "unhide"]),
]
LAST_PATHS = {"setlang"}

TYPE_NAME = {1: "sub", 2: "group", 3: "str", 4: "int", 5: "bool",
             6: "user", 7: "channel", 8: "role", 10: "num", 11: "file"}


def safe_value(opt):
    t = opt.get("type")
    if t == 3:
        choices = opt.get("choices") or []
        if choices:
            return choices[0].get("name", choices[0].get("value", "qa"))
        return "qa probe"
    if t == 4:
        v = 1
        if isinstance(opt.get("min_value"), int):
            v = max(v, opt["min_value"])
        if isinstance(opt.get("max_value"), int):
            v = min(v, opt["max_value"])
        return v
    if t == 10:
        v = 1.0
        if isinstance(opt.get("min_value"), (int, float)):
            v = max(v, opt["min_value"])
        if isinstance(opt.get("max_value"), (int, float)):
            v = min(v, opt["max_value"])
        return v
    if t == 5:
        return False
    if t in (6, 7):
        return {"__snowflake": SELF_ID if t == 6 else TEST_CHANNEL}
    if t == 8:
        return {"__snowflake": GUILD_ID}  # @everyone: harmless everywhere
    return None  # attachment or unknown


def prefix_arg(opt, val):
    t = opt.get("type")
    if t == 3:
        return "qa"
    if t in (4, 10):
        return str(val)
    if t == 5:
        return "false"
    if t == 6:
        return f"<@{SELF_ID}>"
    if t == 7:
        return f"<#{TEST_CHANNEL}>"
    if t == 8:
        return f"<@&{GUILD_ID}>"
    return None


def walk():
    data = json.load(open(DUMP, encoding="utf8"))
    leaves = []  # (path, options, top_type)
    def rec(node, path):
        opts = node.get("options") or []
        kids = [o for o in opts if o.get("type") in (1, 2)]
        if not kids:
            leaves.append((path, [o for o in opts if (o.get("type") or 0) >= 3],
                           node.get("type")))
            return
        for k in kids:
            rec(k, path + [k["name"]])
    for top in data:
        if (top.get("type") or 1) == 1:
            rec(top, [top["name"]])
        else:
            leaves.append(([top["name"]], [], top.get("type")))
    return leaves


def build():
    leaves = walk()
    slash_actions, skips = [], []
    paired_paths = {tuple(p) for pair in PAIRED for p in pair}

    def emit_slash(path, options, note=""):
        slash_actions.append({"kind": "slash", "channel_id": TEST_CHANNEL,
                              "path": path, "options": options, "_note": note})

    for path, options, top_type in leaves:
        full = " ".join(path)
        if full in SKIP_DESTRUCTIVE:
            skips.append((full, "SKIP-DESTRUCTIVE"))
            continue
        if full in SKIP_CONTEXT:
            skips.append((full, "SKIP-CONTEXT"))
            continue
        if top_type in (2, 3) and len(path) == 1:
            if top_type == 3:
                skips.append((full, "SKIP-CONTEXT(message-target)"))
                continue
            emit_slash(path, {}, "user-context(self)")
            continue
        required = [o for o in options if o.get("required")]
        if any(o.get("type") == 11 for o in required):
            skips.append((full, "SKIP-ATTACHMENT"))
            continue
        values = {}
        ok = True
        for o in required:
            v = safe_value(o)
            if v is None:
                ok = False
                break
            values[o["name"]] = v
        if not ok:
            skips.append((full, "SKIP-ATTACHMENT(optional-unmapped)"))
            continue
        emit_slash(path, values)

    # Prefix form for every emitted slash leaf (positional required args).
    prefix_actions = []
    for a in slash_actions:
        path = a["path"]
        full = " ".join(path)
        leaf_opts = None
        # re-resolve required options for prefix rendering
        node = None
        data = json.load(open(DUMP, encoding="utf8"))
        cur = next((c for c in data if c["name"] == path[0]), None)
        for seg in path[1:]:
            cur = next((o for o in (cur.get("options") or []) if o["name"] == seg), None)
        leaf_opts = [o for o in ((cur or {}).get("options") or []) if o.get("required") and (o.get("type") or 0) >= 3] if cur else []
        parts = [PREFIX + " ".join(path)]
        ok = True
        for o in leaf_opts:
            v = safe_value(o)
            arg = prefix_arg(o, v) if v is not None else None
            if arg is None:
                ok = False
                break
            parts.append(arg)
        if not ok:
            skips.append((full + " [prefix]", "SKIP-ATTACHMENT"))
            continue
        prefix_actions.append({"kind": "send", "channel_id": TEST_CHANNEL,
                               "content": " ".join(parts), "_note": full})

    # Order: slash first, then prefix; setlang dead last; paired adjacent.
    def sort_key(a):
        p = tuple(a.get("path") or [a.get("_note", "")])
        last = 1 if (p and p[0] == "setlang") else 0
        paired = 0 if p in paired_paths else 1
        return (last, paired, str(p))

    slash_actions.sort(key=sort_key)
    prefix_actions.sort(key=lambda a: (1 if a["_note"] == "setlang" else 0, a["_note"]))

    # Force paired adjacency for slash lock/unlock + hide/unhide on CMD2.
    ordered = []
    consumed = set()
    for lock, unlock in PAIRED:
        for p in (lock, unlock):
            for i, a in enumerate(slash_actions):
                if i not in consumed and a["path"] == p:
                    a = dict(a)
                    a["channel_id"] = CMD2_CHANNEL
                    a["_note"] = (a.get("_note") or "") + " [paired-cmd2]"
                    ordered.append(a)
                    consumed.add(i)
                    break
    ordered += [a for i, a in enumerate(slash_actions) if i not in consumed]

    all_actions = (ordered + prefix_actions)
    # strip notes for the runner (kept in PLAN.md mapping by index)
    notes = [a.pop("_note", "") for a in all_actions]

    os.makedirs(OUT, exist_ok=True)
    batches = [all_actions[i:i + 25] for i in range(0, len(all_actions), 25)]
    note_batches = [notes[i:i + 25] for i in range(0, len(notes), 25)]
    for n, (b, nb) in enumerate(zip(batches, note_batches), 1):
        with open(os.path.join(OUT, f"batch-{n:02d}.json"), "w", encoding="utf8") as f:
            json.dump(b, f, indent=1)
    with open(os.path.join(OUT, "PLAN.md"), "w", encoding="utf8") as f:
        f.write(f"# Live test plan: {len(all_actions)} actions, "
                f"{len(batches)} batches, {len(skips)} skips\n\n")
        f.write("Cooldown: 8s between writes (SDK), ~15s observe per action. "
                "Stop on any 429/flag.\n\n## Skips\n")
        for full, reason in sorted(skips):
            f.write(f"- `{full}` {reason}\n")
        f.write("\n## Batches\n")
        idx = 0
        for n, (b, nb) in enumerate(zip(batches, note_batches), 1):
            f.write(f"\n### batch-{n:02d} ({len(b)} actions)\n")
            for a, note in zip(b, nb):
                desc = " ".join(a.get("path", [])) or a.get("content", "")
                f.write(f"- [{idx}] {a['kind']} `{desc}` {note}\n".replace("  ", " "))
                idx += 1
    print(f"actions={len(all_actions)} batches={len(batches)} skips={len(skips)}")


if __name__ == "__main__":
    build()
