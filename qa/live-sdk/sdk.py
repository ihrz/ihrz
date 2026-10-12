# iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
# Licensed under CC-BY-NC-SA-4.0. Mainly developed by Kisakay.
# Copyright (C) 2020-2026 iHorizon

# Live Discord test SDK (selfbot account). Backed by the proven
# `discord.py-self` library (dolfies/discord.py-self, pinned in
# requirements.txt): real client paths (gateway + REST), no bare
# HTTP, automatic 429 handling inside the lib.
#
# SAFETY MODEL (owner was disconnected for spam: never weaken this):
# - Single serial outbox. WRITE_GAP_MS (default 8000) between every
#   outbound action; READS spaced by READ_GAP_MS (default 1500).
# - Default mode is READ-ONLY (`discover`): session open, self/guild/
#   channel/application-command listing. Zero writes.
# - Writes require BOTH an explicit plan file AND `IHRZ_LIVE_WRITE=1`.
# - Destructive verbs are HARD-BLOCKED before anything is sent,
#   plan or not (ban/kick/purge/timeout/role or channel edits,
#   permission changes, webhooks, token-ish content).
# - Plans are capped at 25 actions per run.
# - The token comes from `IHRZ_TEST_TOKEN` env only: never printed,
#   never written to disk, never committed.
#
# Usage:
#   .venv/bin/python sdk.py discover [guild_id]
#   IHRZ_LIVE_WRITE=1 .venv/bin/python sdk.py run plans/batch-01.json
#
# Plan action shapes (JSON array):
#   {"kind": "send", "channel_id": "...", "content": ".ping"}
#   {"kind": "slash", "channel_id": "...", "path": ["mod", "ban"],
#    "options": {"member": "1542...", "reason": "qa probe"}}
#   {"kind": "wait", "ms": 5000}

from __future__ import annotations

import asyncio
import json
import os
import re
import sys
import time

import discord
from discord import state as _discord_state


def _parse_interaction_failure(self, data):
    # discord.py-self 2.1.0 only handles INTERACTION_FAILED, but the
    # gateway now emits INTERACTION_FAILURE for failed invocations.
    # Without this, _wrapped_interaction waits the full 12s and raises
    # InvalidData even though Discord already answered (failed).
    return _discord_state.ConnectionState.parse_interaction_failed(self, data)  # type: ignore[attr-defined]


_discord_state.ConnectionState.parse_interaction_failure = _parse_interaction_failure  # type: ignore[attr-defined]

WRITE_GAP_MS = int(os.environ.get("IHRZ_WRITE_GAP_MS", "8000"))
READ_GAP_MS = int(os.environ.get("IHRZ_READ_GAP_MS", "1500"))
ALLOW_WRITE = os.environ.get("IHRZ_LIVE_WRITE") == "1"
PLAN_CAP = 25
OBSERVE_POLLS = 8
BOT_APP_ID = int(os.environ.get("IHRZ_BOT_APP_ID", "1053818045073739817"))
SELF_ID = os.environ.get("IHRZ_SELF_ID", "1542861131939577949")

FORBIDDEN = (
    "ban", "unban", "kick", "purge", "wipe", "nuke", "timeout", "mute",
    "unmute", "tempmute", "tempban",
    "deleterole", "editrole", "permission", "channeldelete",
    "channeledit", "webhook", "token",
)
_VERB_RE = re.compile(r"[a-z]+")

# Channel-type-aware option coercion (backed by discover-channels.json
# in this directory: 26 text / 8 voice / 12 category ids).
# matrix.py probes every channel option with TEST_CHANNEL (text cmd-1),
# which Discord rejects with 50035 for voice-only ([2], e.g. membercount
# + voice/interface/set-voice-channel) and category-only ([4], e.g.
# set-voice-channel-catgory) options. On a type mismatch the id is
# swapped for a known-good id of the required type. CMD2 is the paired
# lock/hide target and is NEVER auto-picked.
_TEST_CHANNEL_ID = "1509600862346154064"  # cmd-1 (text)
_CMD2_CHANNEL_ID = "1509600863512170496"  # paired target: excluded
_SDK_DIR = os.path.dirname(os.path.abspath(__file__))
_KIND_TO_NUM = {"text": 0, "voice": 2, "category": 4}
_KNOWN_CHANNEL_KIND: dict = {}  # channel id -> "text"/"voice"/"category"
_CHANNEL_PICK: dict = {}  # discord numeric channel type -> channel id


def _load_channel_picks() -> None:
    try:
        with open(os.path.join(_SDK_DIR, "discover-channels.json"),
                  encoding="utf8") as f:
            entries = json.load(f)
    except (OSError, ValueError):
        return
    for e in entries:
        if not isinstance(e, dict) or not e.get("id"):
            continue
        _KNOWN_CHANNEL_KIND[str(e["id"])] = e.get("type", "text")
    voices = [str(e["id"]) for e in entries
              if isinstance(e, dict) and e.get("type") == "voice"
              and str(e.get("id")) != _CMD2_CHANNEL_ID
              and "join to create" not in str(e.get("name", "")).lower()]
    cats = [str(e["id"]) for e in entries
            if isinstance(e, dict) and e.get("type") == "category"
            and str(e.get("id")) != _CMD2_CHANNEL_ID]
    if voices:
        _CHANNEL_PICK[2] = voices[0]
    if cats:
        preferred = next(
            (str(e["id"]) for e in entries
             if isinstance(e, dict) and e.get("type") == "category"
             and str(e.get("name", "")).lower() == "vocal"
             and str(e.get("id")) != _CMD2_CHANNEL_ID), None)
        _CHANNEL_PICK[4] = preferred or cats[0]
    _CHANNEL_PICK[0] = _TEST_CHANNEL_ID


_load_channel_picks()

# Signatures that mark a bot reply as a failure (mirrors the known
# live incidents: double-ack crash, debounce denial, no-response).
ERROR_SIGNATURES = (
    "ran into a problem",
    "already been acknowledged",
    "patienter une seconde",
    "did not respond",
    "interaction failed",
)


async def sleep_maybe(ms: int) -> None:
    await asyncio.sleep(ms / 1000.0)


def assert_writable(action: dict) -> None:
    if not ALLOW_WRITE:
        raise RuntimeError("refusing write: set IHRZ_LIVE_WRITE=1 with an explicit plan")
    # Word-boundary match on path segments + content words: "banner" must
    # not trip on "ban", but a real "ban"/"unban" segment still blocks.
    words = set(_VERB_RE.findall(json.dumps(action).lower()))
    segments = set((action.get("path", []) or []))
    for verb in FORBIDDEN:
        if verb in words or verb in segments:
            raise RuntimeError(f"refusing forbidden verb in plan: {verb}")


class Sdk(discord.Client):
    def __init__(self) -> None:
        super().__init__()
        self._write_lock = asyncio.Lock()

    async def on_ready(self) -> None:
        print(json.dumps({"ready": True, "self": str(self.user), "id": self.user.id}))

    async def guarded_write(self, coro):
        async with self._write_lock:
            result = await coro
            await sleep_maybe(WRITE_GAP_MS)
            return result


async def discover(client: Sdk, guild_id: int | None) -> None:
    me = client.user
    out: dict = {"self": {"id": str(me.id), "name": str(me)},
                 "guilds": [{"id": str(g.id), "name": g.name} for g in client.guilds]}
    if guild_id is not None:
        guild = client.get_guild(guild_id) or await client.fetch_guild(guild_id)
        await sleep_maybe(READ_GAP_MS)
        channels = [{"id": str(c.id), "name": getattr(c, "name", "?"), "type": str(c.type)}
                    for c in guild.channels]
        member = guild.get_member(BOT_APP_ID)
        if member is None:
            try:
                member = await guild.fetch_member(BOT_APP_ID)
            except discord.HTTPException:
                member = None
        await sleep_maybe(READ_GAP_MS)
        out["guild"] = {"id": str(guild.id), "name": guild.name,
                        "bot_present": member is not None,
                        "channels": channels}
        text = next((c for c in guild.text_channels), None)
        if text is not None:
            cmds = await text.application_commands()
            await sleep_maybe(READ_GAP_MS)
            out["app_commands_in_scope"] = [
                {"name": c.name, "id": str(c.id),
                 "children": [ch.name for ch in getattr(c, "children", [])]}
                for c in cmds if getattr(c, "application_id", 0) == BOT_APP_ID
            ]
    print(json.dumps(out, indent=2))


def classify_reply(content: str) -> str:
    low = content.lower()
    for sig in ERROR_SIGNATURES:
        if sig in low:
            return f"error:{sig}"
    return "ok"


async def observe_bot_reply(channel, since_ms: int) -> dict:
    """Poll history (spaced reads) for the bot's reply after t0."""
    started = time.time()
    last_id: int | None = None
    for _ in range(OBSERVE_POLLS):
        await sleep_maybe(READ_GAP_MS)
        found = None
        async for msg in channel.history(limit=5):
            if msg.author.id == BOT_APP_ID and (msg.created_at.timestamp() * 1000) >= since_ms - 2000:
                if last_id is None or msg.id > last_id:
                    found = msg
                    last_id = msg.id
        if found is not None:
            # One extra poll to catch a followup crash-embed after a good reply.
            await sleep_maybe(READ_GAP_MS)
            extra = None
            async for msg in channel.history(limit=5):
                if msg.author.id == BOT_APP_ID and msg.id != found.id and \
                        (msg.created_at.timestamp() * 1000) >= since_ms - 2000:
                    extra = msg
                    break
            texts = [found.content or ""] + ([extra.content] if extra else [])
            texts += [e.title or "" for e in found.embeds]
            if extra:
                texts += [e.title or "" for e in extra.embeds]
            blob = "\n".join(texts)
            return {"replied": True,
                    "latency_ms": int((time.time() - started) * 1000),
                    "verdict": classify_reply(blob),
                    "snippet": blob[:300],
                    "message_ids": [found.id] + ([extra.id] if extra else [])}
    return {"replied": False, "latency_ms": int((time.time() - started) * 1000),
            "verdict": "error:no-reply", "snippet": "", "message_ids": []}


async def act_send(client: Sdk, channel, content: str) -> dict:
    assert_writable({"kind": "send", "content": content})
    t0 = int(time.time() * 1000)

    async def _do():
        return await channel.send(content)

    msg = await client.guarded_write(_do())
    obs = await observe_bot_reply(channel, t0)
    obs.update({"kind": "send", "sent_id": msg.id})
    return obs


def _pick_channel(allowed: set) -> str | None:
    """Known-good channel id for a required channel_types set."""
    if allowed == {4}:
        return _CHANNEL_PICK.get(4)
    if allowed == {2}:
        return _CHANNEL_PICK.get(2)
    if 0 in allowed:
        return _CHANNEL_PICK.get(0)
    return _CHANNEL_PICK.get(0)


def _fix_channel_id(current_id: str, opt) -> str | None:
    """Return a substitute id when current_id violates the option's
    channel_types, else None (leave untouched). Unknown ids are never
    rewritten: only positively-identified mismatches are fixed."""
    otype = opt.get("type") if isinstance(opt, dict) else getattr(opt, "type", None)
    otype = getattr(otype, "value", otype)
    if otype != 7:  # not a channel option
        return None
    allowed = opt.get("channel_types") if isinstance(opt, dict) \
        else getattr(opt, "channel_types", None)
    if not allowed:
        return None
    allowed_vals = {getattr(t, "value", t) for t in allowed}
    known = _KNOWN_CHANNEL_KIND.get(current_id)
    if known is None:
        return None
    if _KIND_TO_NUM.get(known) in allowed_vals:
        return None
    return _pick_channel(allowed_vals)


def coerce_options(options: dict, node=None) -> dict:
    """Matrix emits snowflake-typed options as {"__snowflake": "<id>"}.
    The lib's _parse_kwargs reads `.id` off user/channel/role/
    mentionable values, so convert to discord.Object here.
    With the resolved leaf command node, channel options are also made
    channel-type aware: a text-channel probe id sent to a voice-only
    ([2]) or category-only ([4]) option is swapped for a matching id
    from discover-channels.json (never the paired CMD2 channel)."""
    opt_by_name: dict = {}
    for o in (getattr(node, "options", []) or []):
        name = o.get("name") if isinstance(o, dict) else getattr(o, "name", None)
        if name:
            opt_by_name[name] = o
    out = {}
    for k, v in options.items():
        if isinstance(v, dict) and set(v.keys()) == {"__snowflake"}:
            fixed = _fix_channel_id(str(v["__snowflake"]), opt_by_name.get(k))
            out[k] = discord.Object(id=int(fixed if fixed is not None else v["__snowflake"]))
        else:
            out[k] = v
    return out


def _resolve_node(root, segments: list):
    """Depth-first slash-tree resolution using the registered tree shape.

    The old walk matched every segment against DIRECT children only, so
    leaves nested under a subgroup (live: wlroles-add under wlroles,
    ghost-list under the channel group, sticker/top under their groups)
    wrongly reported error:subcommand-not-found. Resolution order per
    segment: exact direct child first (flat trees behave exactly as
    before), then recursive search through subgroup children, then the
    flattened 'group-sub' form (['utils', 'wlroles-add'] -> wlroles/add).
    Returns the leaf node, or None when genuinely not registered.
    Invoking the returned leaf is payload-correct at any depth: the
    lib's SubCommand.__call__ wraps all parents via _walk_parents."""
    if not segments:
        return root
    seg = segments[0]
    kids = list(getattr(root, "children", []) or [])
    for k in kids:
        if getattr(k, "name", "") == seg:
            found = _resolve_node(k, segments[1:])
            if found is not None:
                return found
    for k in kids:
        if getattr(k, "children", None):
            found = _resolve_node(k, list(segments))
            if found is not None:
                return found
    if "-" in seg:
        parts = seg.split("-")
        for cut in range(1, len(parts)):
            head = "-".join(parts[:cut])
            tail = parts[cut:]
            for k in kids:
                if getattr(k, "name", "") == head:
                    found = _resolve_node(k, tail + list(segments[1:]))
                    if found is not None:
                        return found
    return None


async def act_slash(client: Sdk, channel, path: list, options: dict) -> dict:
    assert_writable({"kind": "slash", "path": path})
    cmds = await channel.application_commands()
    await sleep_maybe(READ_GAP_MS)
    node = next((c for c in cmds
                 if getattr(c, "name", "") == path[0]
                 and getattr(c, "application_id", 0) == BOT_APP_ID), None)
    if node is None:
        return {"kind": "slash", "path": path, "replied": False,
                "verdict": "error:not-registered", "snippet": ""}
    node = _resolve_node(node, path[1:])
    if node is None:
        return {"kind": "slash", "path": path, "replied": False,
                "verdict": "error:subcommand-not-found", "snippet": ""}
    t0 = int(time.time() * 1000)
    invoke_ok: bool | None = None
    invoke_note = ""

    async def _do():
        inter = await _invoke()
        return inter

    async def _invoke():
        cname = type(node).__name__
        if cname == "UserCommand":
            return await node(user=discord.Object(id=int(SELF_ID)), channel=channel)
        return await node(channel, **coerce_options(options, node))

    try:
        interaction = await client.guarded_write(_do())
        try:
            invoke_ok = bool(interaction)
        except TypeError:
            invoke_ok = None
        invoke_note = f"successful={getattr(interaction, 'successful', '?')}"
    except Exception as e:  # noqa: BLE001 - recorded, never raised past report
        return {"kind": "slash", "path": path, "replied": False,
                "verdict": f"error:invoke-{type(e).__name__}",
                "snippet": str(e)[:300]}
    # Ephemeral replies never hit channel history: check the cached
    # interaction message FIRST (populated on INTERACTION_SUCCESS, ~4s),
    # history polling is the fallback for follow-up-only replies.
    try:
        cached = interaction.message if interaction is not None else None
    except Exception:  # noqa: BLE001
        cached = None
    if cached is not None:
        blob = (cached.content or "") + "".join(e.title or "" for e in cached.embeds)
        obs = {"replied": True,
               "latency_ms": int(time.time() * 1000 - t0),
               "verdict": classify_reply(blob) + ":ephemeral",
               "snippet": blob[:300], "message_ids": [cached.id]}
        # One history poll to catch a followup crash-embed after a good reply.
        await sleep_maybe(READ_GAP_MS)
        async for msg in channel.history(limit=5):
            if msg.author.id == BOT_APP_ID and msg.id != cached.id and \
                    (msg.created_at.timestamp() * 1000) >= t0 - 2000:
                extra_blob = (msg.content or "") + "".join(e.title or "" for e in msg.embeds)
                obs["snippet"] = (obs["snippet"] + "\n" + extra_blob)[:300]
                obs["message_ids"].append(msg.id)
                if classify_reply(extra_blob) != "ok":
                    obs["verdict"] = classify_reply(extra_blob) + ":followup"
                break
    else:
        obs = await observe_bot_reply(channel, t0)
        # Last-chance cache read before calling no-reply.
        if not obs["replied"]:
            try:
                cached = interaction.message if interaction is not None else None
            except Exception:  # noqa: BLE001
                cached = None
            if cached is not None:
                blob = (cached.content or "") + "".join(e.title or "" for e in cached.embeds)
                obs = {"replied": True, "latency_ms": obs["latency_ms"],
                       "verdict": classify_reply(blob) + ":ephemeral",
                       "snippet": blob[:300], "message_ids": [cached.id]}
    obs.update({"kind": "slash", "path": path, "invoke_ok": invoke_ok,
                "invoke": invoke_note})
    return obs


async def run_plan(client: Sdk, actions: list) -> None:
    if len(actions) > PLAN_CAP:
        raise RuntimeError(f"plan capped at {PLAN_CAP} actions per run")
    report = []
    for action in actions:
        kind = action.get("kind")
        if kind == "wait":
            await sleep_maybe(min(int(action.get("ms", 1000)), 30_000))
            report.append({"kind": "wait", "ok": True})
            continue
        channel = await client.fetch_channel(action["channel_id"])
        await sleep_maybe(READ_GAP_MS)
        if kind == "send":
            report.append(await act_send(client, channel, action["content"]))
        elif kind == "slash":
            report.append(await act_slash(client, channel,
                                          action["path"],
                                          action.get("options", {})))
        else:
            raise RuntimeError(f"unknown action kind: {kind}")
    print(json.dumps({"actions": report}, indent=2))


async def amain() -> None:
    token = os.environ.get("IHRZ_TEST_TOKEN")
    if not token:
        raise RuntimeError("IHRZ_TEST_TOKEN is required")
    mode = sys.argv[1] if len(sys.argv) > 1 else "discover"
    client = Sdk()
    await client.login(token)
    asyncio.create_task(client.connect(reconnect=True))
    for _ in range(100):
        await asyncio.sleep(0.5)
        if client.is_ready():
            break
    try:
        if mode == "discover":
            gid = int(sys.argv[2]) if len(sys.argv) > 2 else None
            await discover(client, gid)
        elif mode == "run":
            if len(sys.argv) < 3:
                raise RuntimeError("usage: sdk.py run plan.json")
            with open(sys.argv[2], encoding="utf8") as f:
                actions = json.load(f)
            if not isinstance(actions, list):
                raise RuntimeError("plan must be a JSON array of actions")
            await run_plan(client, actions)
        else:
            raise RuntimeError(f"unknown mode: {mode}")
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(amain())
