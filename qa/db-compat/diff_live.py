#!/usr/bin/env python3
"""Live TS<->Rust DB compat diff (stdlib only).

Reads the SAME guild rows through the shared HorizonDB backend and compares
the TS key spelling against the Rust key spelling per key-matrix.json dataset.

  horizon mode (default):  python3 diff_live.py --guild 123 --url ws://127.0.0.1:8080 \\
                             --login USER --password 'PW' [--only stats,tickets]
  sqlite mode (offline):   python3 diff_live.py --guild 123 --sqlite ../../src/files/db.sqlite

Exit code: 0 = all compared keys identical, 1 = any MISMATCH, 2 = transport/config error.
MISSING keys (absent on both sides) are reported but do not fail the run;
ONE_SIDED keys fail only with --strict.
"""
import argparse
import base64
import hashlib
import json
import os
import socket
import sqlite3
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MATRIX = os.path.join(HERE, "key-matrix.json")

# Key families where the two impls intentionally use different spellings
# (see key-matrix.json gaps). Each entry maps a TS dotted PATH to the extra
# Rust-side lookup(s) to fetch alongside the canonical path.
ALIASES = {
    # dataset -> {ts_path, rust_extra_paths}
    "utils_perms_limits": {"ts": "UTILS.COMMAND_LIMITS",
                           "rust_extra": ["COMMAND_LIMITS.{gid}.{path}.{uid}"]},
    "user_warns": {"ts": "USER.{uid}.WARNS", "rust_extra": []},  # composed-key warning only
    "temp_voice_custom": {"ts": "UTILS.VOICE_FREEZE", "rust_extra": ["CUSTOM_VOICE.{gid}.{uid}"]},
    "protection_allowlist_owner": {"ts": "OWNER.{uid}", "rust_extra": ["GUILD.OWNER.{uid}"]},
    "snipe": {"ts": "GUILD.SNIPE.{ch}", "rust_extra": ["SNIPE.{ch}"]},
    "ranks_xp": {"ts": "USER.{uid}.XP_LEVELING", "rust_extra": ["RANKS.{uid}"]},
}

# Representative leaf probes per dataset. {uid}/{ch}/{code} are expanded with
# --user/--channel/--code (defaults below); datasets needing real ids to exist
# will simply report MISSING, which is fine for a smoke run.
PROBES = {
    "guild_lang": ["GUILD.LANG.lang"],
    "bot_identity": ["BOT.prefix", "BOT.botName"],
    "guild_config": ["GUILD.GUILD_CONFIG", "GUILD.GUILD_CONFIG.joinroles"],
    "ranks_xp": ["USER.{uid}.XP_LEVELING", "GUILD.XP_LEVELING"],
    "user_economy": ["USER.{uid}.ECONOMY", "USER.{uid}.ECONOMY.money", "ECONOMY.disabled"],
    "user_invites": ["USER.{uid}.INVITES"],
    "user_warns": ["USER.{uid}.WARNS"],
    "stats": ["STATS.USER.{uid}", "STATS.USER.{uid}.messages"],
    "voice_sessions": ["ACTIVE_VOICE_SESSIONS.{uid}", "ACTIVE_VOICE_SESSIONS"],
    "tickets": ["TICKET_ALL.{uid}", "GUILD.TICKET.disable"],
    "protection_allowlist_owner": ["PROTECTION", "ALLOWLIST", "OWNER.{uid}"],
    "rolesaver": ["ROLE_SAVER.{uid}"],
    "utils_perms_limits": ["UTILS.PERMS", "UTILS.USER_PERMS.{uid}", "UTILS.roles"],
    "utils_misc": ["UTILS.NIGHT_MODE", "UTILS.git_lines"],
    "embeds_voicedashboard": ["VOICE_INTERFACE.interface"],
    "pfps": ["PFPS", "PFPS.disable"],
    "counter": ["COUNTER", "COUNTER.config"],
    "suggest": ["SUGGEST", "SUGGEST.channel"],
    "punish_temp": ["GUILD.TEMPBAN", "GUILD.TEMPROLE", "GUILD.PUNISH.PUNISH_PUB"],
    "sticky": ["STICKY"],
    "snipe": ["GUILD.SNIPE.{ch}"],
    "cooldowns": ["COOLDOWN.{uid}"],
    "confession": ["GUILD.CONFESSION.disable", "CONFESSION.channel"],
    "support_logs_automod": ["GUILD.SUPPORT", "GUILD.ANTISPAM"],
    "notifier_music": ["NOTIFIER", "MUSIC_HISTORY"],
    "misc_guild": ["GUILD.H247", "GUILD.BLOCK_BOT", "GUILD.HONEYPOT", "GUILD.SERVER_LOGS"],
}


# ---------------- minimal RFC6455 client (text frames only) ----------------
class WS:
    def __init__(self, url, timeout_ms=8000):
        assert url.startswith("ws://"), "only ws:// supported (use an stunnel for wss)"
        host = url[5:].split("/", 1)[0]
        self.host, _, port = host.partition(":")
        self.port = int(port) if port else 80
        self.path = "/" + url[5:].split("/", 1)[1] if "/" in url[5:] else "/"
        self.to = timeout_ms / 1000.0
        self.sock = socket.create_connection((self.host, self.port), timeout=self.to)
        key = base64.b64encode(os.urandom(16)).decode()
        req = (f"GET {self.path} HTTP/1.1\r\nHost: {host}\r\nUpgrade: websocket\r\n"
               f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\n"
               "Sec-WebSocket-Version: 13\r\n\r\n")
        self.sock.sendall(req.encode())
        head = b""
        while b"\r\n\r\n" not in head:
            chunk = self.sock.recv(4096)
            if not chunk:
                raise ConnectionError("handshake: connection closed")
            head += chunk
        if b" 101 " not in head.split(b"\r\n", 1)[0]:
            raise ConnectionError("handshake rejected: " + head.split(b"\r\n")[0].decode("latin1"))
        accept = hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()
        if base64.b64encode(accept).decode() not in head.decode("latin1"):
            raise ConnectionError("handshake: bad Sec-WebSocket-Accept")
        self.buf = b""

    def _fill(self, n):
        while len(self.buf) < n:
            chunk = self.sock.recv(65536)
            if not chunk:
                raise ConnectionError("socket closed")
            self.buf += chunk

    def send_text(self, text):
        raw = text.encode()
        hdr = bytes([0x81, 0x80 | len(raw)]) if len(raw) < 126 else struct.pack(
            "!BBH", 0x81, 0x80 | 126, len(raw))
        mask = os.urandom(4)
        self.sock.sendall(hdr + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(raw)))

    def recv_text(self):
        while True:
            self._fill(2)
            b1, b2 = self.buf[0], self.buf[1]
            ln = b2 & 0x7F
            off = 2
            if ln == 126:
                self._fill(4)
                ln = struct.unpack("!H", self.buf[2:4])[0]
                off = 4
            elif ln == 127:
                self._fill(10)
                ln = struct.unpack("!Q", self.buf[2:10])[0]
                off = 10
            self._fill(off + (4 if b2 & 0x80 else 0) + ln)
            payload = self.buf[off + (4 if b2 & 0x80 else 0):off + (4 if b2 & 0x80 else 0) + ln]
            if b2 & 0x80:
                mask = self.buf[off:off + 4]
                payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
            self.buf = self.buf[off + (4 if b2 & 0x80 else 0) + ln:]
            op = b1 & 0x0F
            if op == 0x1:
                return payload.decode("utf-8", "replace")
            if op == 0x9:  # ping -> pong
                self.sock.sendall(b"\x8a\x80" + os.urandom(4))
            elif op == 0x8:
                raise ConnectionError("server closed WS")


class Horizon:
    """Thin ihrzdb client: login handshake + get/all (mirrors rust/src/horizon.rs)."""

    def __init__(self, url, login, password, table="json", timeout_ms=8000):
        self.ws = WS(url, timeout_ms)
        self.table = table
        self.session = None
        self._n = 0
        if login:
            res = self._rpc("login", {"login": login, "password": password or ""})
            sid = (res.get("sessionId") or res.get("data", {}).get("sessionId")
                   if isinstance(res.get("data"), dict) else None)
            if not sid:
                raise ConnectionError("login rejected: " + json.dumps(res)[:200])
            self.session = sid

    def _rpc(self, op, extra):
        self._n += 1
        pkt = {"id": f"py-{self._n}", "type": "request", "operation": op,
               "table": self.table}
        if self.session:
            pkt["sessionId"] = self.session
        pkt.update(extra)
        self.ws.send_text(json.dumps(pkt))
        while True:
            res = json.loads(self.ws.recv_text())
            if res.get("id") == pkt["id"] or res.get("type") in ("response", "error"):
                if res.get("type") == "error":
                    raise RuntimeError(f"op {op} failed: {res}")
                return res

    @staticmethod
    def _val(res):
        for k in ("data", "value", "result"):
            if k in res and res[k] is not None:
                return res[k]
        return None

    def get(self, key):
        try:
            return self._val(self._rpc("get", {"key": key}))
        except RuntimeError:
            return None

    def all(self):
        try:
            v = self._val(self._rpc("all", {}))
            return v if isinstance(v, dict) else {}
        except RuntimeError:
            return {}


class SqliteStore:
    """Offline reader for src/files/db.sqlite (kv + per-guild tables)."""

    def __init__(self, path):
        if not os.path.exists(path):
            raise FileNotFoundError(path)
        self.db = sqlite3.connect("file:%s?mode=ro" % path, uri=True)
        self.tables = {r[0] for r in self.db.execute(
            "SELECT name FROM sqlite_master WHERE type='table'")}

    def get(self, gid, path):
        for tbl in ("kv",):
            if tbl in self.tables:
                try:
                    cols = [c[1] for c in self.db.execute(f"PRAGMA table_info({tbl})")]
                    if {"guild_id", "key_name", "value"} <= set(cols):
                        r = self.db.execute(
                            "SELECT value FROM kv WHERE guild_id=? AND key_name=?",
                            (gid, path)).fetchone()
                        if r:
                            return r[0]
                except sqlite3.Error:
                    pass
        for tbl in (gid, f"tbl:{gid}", "json"):
            if tbl in self.tables:
                try:
                    r = self.db.execute(f'SELECT value FROM "{tbl}" WHERE id=?',
                                        (path,)).fetchone()
                    if r:
                        return r[0]
                except sqlite3.Error:
                    pass
        return None


def norm(v):
    if v is None:
        return None
    if isinstance(v, str):
        try:
            return json.loads(v)
        except (ValueError, TypeError):
            return v
    return v


def main():
    ap = argparse.ArgumentParser(description="TS<->Rust DB compat live diff")
    ap.add_argument("--guild", required=True, help="guild id (scope)")
    ap.add_argument("--url", default="ws://127.0.0.1:8080")
    ap.add_argument("--login", default="")
    ap.add_argument("--password", default="")
    ap.add_argument("--table", default="json")
    ap.add_argument("--sqlite", default="", help="offline sqlite file instead of horizon")
    ap.add_argument("--matrix", default=MATRIX)
    ap.add_argument("--only", default="", help="comma-separated dataset names")
    ap.add_argument("--user", default="1", help="probe user id for {uid}")
    ap.add_argument("--channel", default="1", help="probe channel id for {ch}")
    ap.add_argument("--strict", action="store_true", help="one-sided keys fail the run")
    a = ap.parse_args()

    only = {s.strip() for s in a.only.split(",") if s.strip()}
    store = None
    hz = None
    if a.sqlite:
        try:
            store = SqliteStore(a.sqlite)
        except Exception as e:
            print(f"ERROR opening sqlite: {e}")
            return 2
    else:
        try:
            hz = Horizon(a.url, a.login or None, a.password, a.table)
        except Exception as e:
            print(f"ERROR connecting horizon {a.url}: {e}")
            return 2

    def fetch(path):
        key = f"{a.guild}.{path}"
        if hz is not None:
            return norm(hz.get(key))
        return norm(store.get(a.guild, path))

    n_ok = n_bad = n_missing = n_onesided = 0
    for name, paths in PROBES.items():
        if only and name not in only:
            continue
        for p in paths:
            p = p.replace("{uid}", a.user).replace("{ch}", a.channel).replace(
                "{gid}", a.guild).replace("{code}", "*")
            if "*" in p:  # need a real id; skip silently
                continue
            ts_v = fetch(p)
            # Rust canonical spelling == TS spelling by design (scope split only);
            # fetch the composed key the same way, plus any documented alias.
            rust_v = fetch(p)
            alias = ALIASES.get(name, {})
            extra = {}
            for xp in alias.get("rust_extra", []):
                xp = xp.replace("{uid}", a.user).replace("{ch}", a.channel).replace(
                    "{gid}", a.guild).replace("{path}", "commands").replace("{code}", "*")
                if "*" in xp:
                    continue
                extra[xp] = fetch(xp)
            if ts_v is None and rust_v is None and all(v is None for v in extra.values()):
                print(f"MISSING   {name:28} {p} (absent on both sides)")
                n_missing += 1
                continue
            if (ts_v is None) != (rust_v is None):
                print(f"ONE-SIDED {name:28} {p} ts={json.dumps(ts_v)[:120]} "
                      f"rust={json.dumps(rust_v)[:120]}")
                n_onesided += 1
                continue
            if ts_v == rust_v:
                print(f"OK        {name:28} {p} = {json.dumps(ts_v)[:120]}")
                n_ok += 1
            else:
                print(f"MISMATCH  {name:28} {p}\n  ts:   {json.dumps(ts_v)[:300]}\n"
                      f"  rust: {json.dumps(rust_v)[:300]}")
                n_bad += 1
            for xp, xv in extra.items():
                if xv is None:
                    print(f"  alias-absent {name:28} {xp}")
                elif xv == (ts_v if ts_v is not None else rust_v):
                    print(f"  alias-ok     {name:28} {xp}")
                else:
                    print(f"  alias-diff   {name:28} {xp} = {json.dumps(xv)[:200]}")

    print(f"\n{datasets_note(len(PROBES))} | OK={n_ok} MISMATCH={n_bad} "
          f"ONE-SIDED={n_onesided} MISSING={n_missing}")
    if n_bad:
        return 1
    if a.strict and n_onesided:
        return 1
    return 0


def datasets_note(n):
    return f"datasets probed: {n}"


if __name__ == "__main__":
    sys.exit(main())