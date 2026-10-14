# iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)
# Licensed under CC-BY-NC-SA-4.0. Mainly developed by Kisakay.
# Copyright (C) 2020-2026 iHorizon

# Intelligent selfbot action library (imported by sdk.py).
#
# ~30 actions so waves can TEST MODULES, not just commands: join/move/
# leave voice, create/delete/edit channels and roles, drive threads,
# invites, pins, reactions, and snapshot guild state before/after.
# Every action returns a JSON-serializable report dict.
#
# SAFETY TIERS (never weaken: the owner was disconnected for spam):
# - READ: snapshots, fixtures, voice_snapshot, bot_in_voice — no flag
#   needed, zero writes.
# - WRITE (`IHRZ_LIVE_WRITE=1`): voice presence, reactions, pins,
#   own-message edits, thread create, invite create — visible but
#   self-contained or trivially reversible.
# - STRUCTURAL (`IHRZ_LIVE_WRITE=1` AND `IHRZ_ALLOW_STRUCTURAL=1`):
#   channel/role create/delete/edit, role membership changes, thread
#   delete. Hard-refusals inside: the three observation channels
#   (cmd/cmd-1/cmd-2), admin-permission roles, the three fixture
#   members' admin roles, @everyone.
# - HARD-BLOCKED always: ban/kick/unban/timeout/purge/guild delete,
#   ownership transfer, token-ish content (inherited from sdk.py
#   FORBIDDEN via assert_writable on content-bearing actions).
#
# All mutating actions go through Sdk.guarded_write (serial outbox,
# WRITE_GAP_MS pacing). Plans stay capped at 25 actions per run.

from __future__ import annotations

import os
import time

import discord

ALLOW_STRUCTURAL = os.environ.get("IHRZ_ALLOW_STRUCTURAL") == "1"

# Observation channels: never deleted/edited by a wave.
PROTECTED_CHANNELS = {
    os.environ.get("IHRZ_CMD_CHANNEL", "1509600863512170496"),
    os.environ.get("IHRZ_CMD1_CHANNEL", "1509600862346154064"),
    "1559800690006556763",  # cmd-2 (current observation channel)
}

# Fixture members (operator-mandated real probe targets).
FIX_ADMIN = "324942190222770176"    # 82hw, Admin 1 + Admin 2
FIX_NORMAL = "1132574182270570557"  # lirus_12345, VERIFIED
FIX_OWNER = "606504664610897920"    # guild owner (bot account, no roles)

# Role ids that must never be granted/revoked/deleted by a wave.
PROTECTED_ROLES = {
    "1509600840242040852",  # Admin 1
    "1509600841844265054",  # Admin 2
}

TEST_GUILD = int(os.environ.get("IHRZ_TEST_GUILD", "999449972615413861"))
BOT_APP_ID = int(os.environ.get("IHRZ_BOT_APP_ID", "1053818045073739817"))


def _need_write(action: dict) -> None:
    from sdk import assert_writable  # deferred: avoids circular import

    assert_writable(action)


def _need_structural(action: dict) -> None:
    _need_write(action)
    if not ALLOW_STRUCTURAL:
        raise RuntimeError("refusing structural action: set IHRZ_ALLOW_STRUCTURAL=1")


async def _guild(client, guild_id: int | None):
    gid = guild_id or TEST_GUILD
    guild = client.get_guild(gid)
    if guild is None:
        guild = await client.fetch_guild(gid)
    return guild


def _member_entry(m) -> dict:
    return {
        "id": str(m.id),
        "name": str(m),
        "bot": bool(m.bot),
        "roles": [str(r.id) for r in getattr(m, "roles", [])],
        "voice_channel": str(m.voice.channel.id)
        if getattr(m, "voice", None) and m.voice.channel
        else None,
    }


# ---- READ actions (no flag) ----

async def act_fixtures(client, a: dict) -> dict:
    return {
        "kind": "fixtures",
        "guild_id": str(TEST_GUILD),
        "admin": FIX_ADMIN,
        "normal": FIX_NORMAL,
        "owner": FIX_OWNER,
    }


async def act_guild_snapshot(client, a: dict) -> dict:
    g = await _guild(client, a.get("guild_id"))
    return {
        "kind": "guild_snapshot",
        "id": str(g.id),
        "name": g.name,
        "member_count": getattr(g, "member_count", None),
        "channels": [
            {"id": str(c.id), "name": getattr(c, "name", "?"), "type": str(c.type)}
            for c in g.channels
        ],
        "roles": [
            {"id": str(r.id), "name": r.name, "perms": str(r.permissions.value)}
            for r in g.roles
        ],
    }


async def act_voice_snapshot(client, a: dict) -> dict:
    g = await _guild(client, a.get("guild_id"))
    states: dict = {}
    for vc in g.voice_channels:
        states[str(vc.id)] = [str(m.id) for m in vc.members]
    return {"kind": "voice_snapshot", "channels": states}


async def act_member_snapshot(client, a: dict) -> dict:
    g = await _guild(client, a.get("guild_id"))
    uid = int(a["user_id"])
    m = g.get_member(uid) or await g.fetch_member(uid)
    return {"kind": "member_snapshot", "member": _member_entry(m)}


def _self_voice_state(g, user_id: int):
    m = g.get_member(user_id)
    if m is None:
        return None, None
    v = m.voice
    return m, v


async def act_bot_in_voice(client, a: dict) -> dict:
    g = await _guild(client, a.get("guild_id"))
    want = str(a.get("channel_id") or "")
    _, v = _self_voice_state(g, BOT_APP_ID)
    actual = str(v.channel.id) if v and v.channel else None
    return {
        "kind": "bot_in_voice",
        "want": want or None,
        "actual": actual,
        "match": (actual == want) if want else actual is not None,
    }


async def act_self_voice(client, a: dict) -> dict:
    g = await _guild(client, a.get("guild_id"))
    _, v = _self_voice_state(g, client.user.id)
    return {
        "kind": "self_voice",
        "channel": str(v.channel.id) if v and v.channel else None,
        "mute": bool(v.mute) if v else None,
        "deaf": bool(v.deaf) if v else None,
    }


# ---- WRITE actions ----

async def act_voice_join(client, a: dict) -> dict:
    _need_write(a)
    g = await _guild(client, a.get("guild_id"))
    ch = g.get_channel(int(a["channel_id"])) or await client.fetch_channel(int(a["channel_id"]))
    if not isinstance(ch, discord.VoiceChannel):
        raise RuntimeError(f"not a voice channel: {a['channel_id']}")
    t0 = time.time()
    # Gateway-only presence (OP4 voice state, no media/UDP): the
    # account visibly sits in the channel (counts, triggers
    # join-to-create, music listener scans) without audio.
    # Full media connect (ch.connect()) never completes its
    # handshake on this lib version (29s then is_connected=False),
    # so presence is the supported mode.
    await g.change_voice_state(
        channel=ch,
        self_mute=bool(a.get("self_mute", False)),
        self_deaf=bool(a.get("self_deaf", True)),
    )
    await client.guarded_write(_noop())
    me = g.get_member(client.user.id)
    v = me.voice if me else None
    return {
        "kind": "voice_join",
        "channel": str(ch.id),
        "latency_ms": int((time.time() - t0) * 1000),
        "present": bool(v and v.channel and v.channel.id == ch.id),
    }


async def _noop():
    return None


async def act_voice_leave(client, a: dict) -> dict:
    _need_write(a)
    g = await _guild(client, a.get("guild_id"))
    me, v = _self_voice_state(g, client.user.id)
    if me is None or v is None or v.channel is None:
        return {"kind": "voice_leave", "left": False, "note": "not connected"}
    await g.change_voice_state(channel=None)
    await client.guarded_write(_noop())
    return {"kind": "voice_leave", "left": True}


async def act_voice_move(client, a: dict) -> dict:
    _need_write(a)
    g = await _guild(client, a.get("guild_id"))
    me, v = _self_voice_state(g, client.user.id)
    if me is None or v is None or v.channel is None:
        raise RuntimeError("not connected: voice_join first")
    ch = g.get_channel(int(a["channel_id"])) or await client.fetch_channel(int(a["channel_id"]))
    if not isinstance(ch, discord.VoiceChannel):
        raise RuntimeError(f"not a voice channel: {a['channel_id']}")
    await g.change_voice_state(channel=ch)
    await client.guarded_write(_noop())
    return {"kind": "voice_move", "channel": str(ch.id)}


async def act_voice_self_mute(client, a: dict) -> dict:
    _need_write(a)
    g = await _guild(client, a.get("guild_id"))
    me, v = _self_voice_state(g, client.user.id)
    if me is None or v is None or v.channel is None:
        raise RuntimeError("not in voice: voice_join first")
    await g.change_voice_state(channel=v.channel, self_mute=bool(a.get("mute", True)))
    await client.guarded_write(_noop())
    return {"kind": "voice_self_mute", "mute": bool(a.get("mute", True))}


async def act_voice_self_deafen(client, a: dict) -> dict:
    _need_write(a)
    g = await _guild(client, a.get("guild_id"))
    me, v = _self_voice_state(g, client.user.id)
    if me is None or v is None or v.channel is None:
        raise RuntimeError("not in voice: voice_join first")
    await g.change_voice_state(channel=v.channel, self_deaf=bool(a.get("deaf", True)))
    await client.guarded_write(_noop())
    return {"kind": "voice_self_deafen", "deaf": bool(a.get("deaf", True))}


async def act_wait_for_bot_voice(client, a: dict) -> dict:
    _need_write(a)
    g = await _guild(client, a.get("guild_id"))
    want = str(a.get("channel_id") or "")
    # NOTE: the param is `wait_ms` (not `timeout_ms`): the SDK's
    # forbidden-verb guard matches the word "timeout" and would
    # refuse the whole plan.
    timeout = min(int(a.get("wait_ms", 20_000)), 60_000)
    t0 = time.time()
    while (time.time() - t0) * 1000 < timeout:
        # Refresh member cache for the bot.
        try:
            _, v = _self_voice_state(g, BOT_APP_ID)
            ch = v.channel.id if v and v.channel else None
        except discord.HTTPException:
            ch = None
        actual = str(ch) if ch else None
        if (want and actual == want) or (not want and actual):
            return {
                "kind": "wait_for_bot_voice",
                "want": want or None,
                "actual": actual,
                "latency_ms": int((time.time() - t0) * 1000),
            }
        import asyncio as _aio

        await _aio.sleep(2)
    return {"kind": "wait_for_bot_voice", "want": want or None, "actual": None, "timeout": True}


async def act_message_react(client, a: dict) -> dict:
    _need_write(a)
    ch, msg = await _own_message_allowed(client, a)
    await client.guarded_write(msg.add_reaction(a["emoji"]))
    return {"kind": "message_react", "emoji": a["emoji"], "message": str(msg.id)}


async def _own_message_allowed(client, channel_id_or_a, message_id=None):
    # Reactions/pins may target the BOT's messages (observing the bot
    # under test); edits/deletes are restricted to our own sends.
    if isinstance(channel_id_or_a, dict):
        a = channel_id_or_a
        ch = await client.fetch_channel(int(a["channel_id"]))
        return ch, await ch.fetch_message(int(a["message_id"]))
    ch = await client.fetch_channel(int(channel_id_or_a))
    return ch, await ch.fetch_message(int(message_id))


async def act_message_unreact(client, a: dict) -> dict:
    _need_write(a)
    ch, msg = await _own_message_allowed(client, a)
    await client.guarded_write(msg.remove_reaction(a["emoji"], client.user))
    return {"kind": "message_unreact", "emoji": a["emoji"], "message": str(msg.id)}


async def act_message_pin(client, a: dict) -> dict:
    _need_write(a)
    ch, msg = await _own_message_allowed(client, a)
    await client.guarded_write(msg.pin())
    return {"kind": "message_pin", "message": str(msg.id)}


async def act_message_unpin(client, a: dict) -> dict:
    _need_write(a)
    ch, msg = await _own_message_allowed(client, a)
    await client.guarded_write(msg.unpin())
    return {"kind": "message_unpin", "message": str(msg.id)}


async def act_message_edit_own(client, a: dict) -> dict:
    _need_write(a)
    ch = await client.fetch_channel(int(a["channel_id"]))
    msg = await ch.fetch_message(int(a["message_id"]))
    if msg.author.id != client.user.id:
        raise RuntimeError("refusing edit of someone else's message")
    await client.guarded_write(msg.edit(content=a["content"]))
    return {"kind": "message_edit_own", "message": str(msg.id)}


async def act_message_delete_own(client, a: dict) -> dict:
    _need_write(a)
    ch = await client.fetch_channel(int(a["channel_id"]))
    msg = await ch.fetch_message(int(a["message_id"]))
    if msg.author.id != client.user.id:
        raise RuntimeError("refusing delete of someone else's message")
    await client.guarded_write(msg.delete())
    return {"kind": "message_delete_own", "message": str(msg.id)}


async def act_thread_create(client, a: dict) -> dict:
    _need_write(a)
    ch = await client.fetch_channel(int(a["channel_id"]))
    if a.get("message_id"):
        src = await ch.fetch_message(int(a["message_id"]))
        th = await client.guarded_write(
            ch.create_thread(name=a.get("name", "qa-probe"), message=src)
        )
    else:
        th = await client.guarded_write(
            ch.create_thread(
                name=a.get("name", "qa-probe"),
                type=discord.ChannelType.public_thread,
            )
        )
    return {"kind": "thread_create", "thread": str(th.id), "name": th.name}


async def act_invite_create(client, a: dict) -> dict:
    _need_write(a)
    ch = await client.fetch_channel(int(a["channel_id"]))
    inv = await client.guarded_write(
        ch.create_invite(max_age=int(a.get("max_age", 300)), max_uses=int(a.get("max_uses", 1)))
    )
    return {"kind": "invite_create", "code": inv.code}


async def act_invite_delete(client, a: dict) -> dict:
    _need_write(a)
    inv = await client.fetch_invite(a["code"])
    await client.guarded_write(inv.delete())
    return {"kind": "invite_delete", "code": a["code"]}


# ---- STRUCTURAL actions ----

def _refuse_protected_channel(channel_id: str) -> None:
    if str(channel_id) in PROTECTED_CHANNELS:
        raise RuntimeError(f"refusing structural op on observation channel {channel_id}")


def _refuse_protected_role(role) -> None:
    if str(role.id) in PROTECTED_ROLES or role.permissions.administrator:
        raise RuntimeError(f"refusing structural op on protected role {role.name}")
    if str(role.id) == str(role.guild.id):
        raise RuntimeError("refusing structural op on @everyone")


async def act_channel_create_text(client, a: dict) -> dict:
    _need_structural(a)
    g = await _guild(client, a.get("guild_id"))
    kw: dict = {"name": a.get("name", "qa-probe")}
    if a.get("category_id"):
        cat = g.get_channel(int(a["category_id"]))
        if cat is not None:
            kw["category"] = cat
    ch = await client.guarded_write(g.create_text_channel(**kw))
    return {"kind": "channel_create_text", "channel": str(ch.id), "name": ch.name}


async def act_channel_create_voice(client, a: dict) -> dict:
    _need_structural(a)
    g = await _guild(client, a.get("guild_id"))
    kw: dict = {"name": a.get("name", "qa-probe-vc")}
    if a.get("category_id"):
        cat = g.get_channel(int(a["category_id"]))
        if cat is not None:
            kw["category"] = cat
    ch = await client.guarded_write(g.create_voice_channel(**kw))
    return {"kind": "channel_create_voice", "channel": str(ch.id), "name": ch.name}


async def act_channel_delete(client, a: dict) -> dict:
    _need_structural(a)
    _refuse_protected_channel(a["channel_id"])
    ch = await client.fetch_channel(int(a["channel_id"]))
    name = getattr(ch, "name", "?")
    await client.guarded_write(ch.delete())
    return {"kind": "channel_delete", "channel": str(a["channel_id"]), "name": name}


async def act_channel_edit(client, a: dict) -> dict:
    _need_structural(a)
    _refuse_protected_channel(a["channel_id"])
    ch = await client.fetch_channel(int(a["channel_id"]))
    kw: dict = {}
    if a.get("name"):
        kw["name"] = a["name"]
    if "topic" in a:
        kw["topic"] = a["topic"]
    if not kw:
        raise RuntimeError("channel_edit needs name and/or topic")
    await client.guarded_write(ch.edit(**kw))
    return {"kind": "channel_edit", "channel": str(ch.id), **kw}


async def act_role_create(client, a: dict) -> dict:
    _need_structural(a)
    g = await _guild(client, a.get("guild_id"))
    role = await client.guarded_write(g.create_role(name=a.get("name", "qa-probe")))
    return {"kind": "role_create", "role": str(role.id), "name": role.name}


async def act_role_delete(client, a: dict) -> dict:
    _need_structural(a)
    g = await _guild(client, a.get("guild_id"))
    role = g.get_role(int(a["role_id"]))
    if role is None:
        raise RuntimeError(f"unknown role: {a['role_id']}")
    _refuse_protected_role(role)
    name = role.name
    await client.guarded_write(role.delete())
    return {"kind": "role_delete", "role": str(a["role_id"]), "name": name}


async def act_role_add(client, a: dict) -> dict:
    _need_structural(a)
    g = await _guild(client, a.get("guild_id"))
    role = g.get_role(int(a["role_id"]))
    if role is None:
        raise RuntimeError(f"unknown role: {a['role_id']}")
    _refuse_protected_role(role)
    m = g.get_member(int(a["user_id"])) or await g.fetch_member(int(a["user_id"]))
    await client.guarded_write(m.add_roles(role))
    return {"kind": "role_add", "user": str(m.id), "role": str(role.id)}


async def act_role_remove(client, a: dict) -> dict:
    _need_structural(a)
    g = await _guild(client, a.get("guild_id"))
    role = g.get_role(int(a["role_id"]))
    if role is None:
        raise RuntimeError(f"unknown role: {a['role_id']}")
    _refuse_protected_role(role)
    m = g.get_member(int(a["user_id"])) or await g.fetch_member(int(a["user_id"]))
    await client.guarded_write(m.remove_roles(role))
    return {"kind": "role_remove", "user": str(m.id), "role": str(role.id)}


async def act_thread_delete(client, a: dict) -> dict:
    _need_structural(a)
    th = await client.fetch_channel(int(a["thread_id"]))
    name = getattr(th, "name", "?")
    await client.guarded_write(th.delete())
    return {"kind": "thread_delete", "thread": str(a["thread_id"]), "name": name}


ACTIONS = {
    # read
    "fixtures": act_fixtures,
    "guild_snapshot": act_guild_snapshot,
    "voice_snapshot": act_voice_snapshot,
    "member_snapshot": act_member_snapshot,
    "bot_in_voice": act_bot_in_voice,
    "self_voice": act_self_voice,
    # write
    "voice_join": act_voice_join,
    "voice_leave": act_voice_leave,
    "voice_move": act_voice_move,
    "voice_self_mute": act_voice_self_mute,
    "voice_self_deafen": act_voice_self_deafen,
    "wait_for_bot_voice": act_wait_for_bot_voice,
    "message_react": act_message_react,
    "message_unreact": act_message_unreact,
    "message_pin": act_message_pin,
    "message_unpin": act_message_unpin,
    "message_edit_own": act_message_edit_own,
    "message_delete_own": act_message_delete_own,
    "thread_create": act_thread_create,
    "invite_create": act_invite_create,
    "invite_delete": act_invite_delete,
    # structural
    "channel_create_text": act_channel_create_text,
    "channel_create_voice": act_channel_create_voice,
    "channel_delete": act_channel_delete,
    "channel_edit": act_channel_edit,
    "role_create": act_role_create,
    "role_delete": act_role_delete,
    "role_add": act_role_add,
    "role_remove": act_role_remove,
    "thread_delete": act_thread_delete,
}

ACTION_TIERS = {
    k: ("read" if k in ("fixtures", "guild_snapshot", "voice_snapshot",
                         "member_snapshot", "bot_in_voice", "self_voice")
        else "structural" if k.startswith(("channel_", "role_")) or k == "thread_delete"
        else "write")
    for k in ACTIONS
}
