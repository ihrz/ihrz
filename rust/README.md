# iHorizon — Rust port (serenity + poise)

Scope demande: full rewrite en monorepo `rust/`. Etat: socle compilable,
pas parite totale.

## Ce qui est porte

- `src/main.rs`: bootstrap, `write_version_file()` (miroir `src/index.ts`
  + `releaseNotifier.ts`), init DB puis `bot::run()`.
- `src/bot.rs`: intents/partials (miroir `src/core/bot.ts`), framework
  poise = HybridCommands natifs (slash + prefix), `start_autosharded()`
  (miroir `ShardingManager`).
- `src/config.rs`: miroir `src/files/config.ts` (env-first, prefix `?`
  par defaut).
- `src/lang.rs`: reutilise `../src/lang/*.yml` en place, fallback `en-US`
  uniquement pour resolution de table (jamais pour cles manquantes).
- `src/db.rs`: sqlx sqlite sur `src/files/db.sqlite`, tables `kv` +
  `guild_lang` (miroir `getLanguageData(guildId)`).
- `src/commands/`: `fun::ping`, `fun::dice` (miroir `!dice.ts`),
  `utils::botinfo`, `utils::help`.
- `src/core/mod.rs`: `release::write_version_file`.

## Etat (2026-10-08)

- 251 tests OK (`cargo test`), `cargo build` OK, `cargo fmt` clean, clippy 0.
- 164 commandes slash+prefix (HybridCommands natifs poise) : les 28
  catégories portées, zéro stub.
- Audio : `audio.rs` (LavalinkConfig env, AudioBackend trait,
  InMemoryBackend testé offline, file TrackQueue, guards) ; lavalink-rs
  réel en attente de serveur.
- Cartes : `cards.rs` (rank_card_svg 800x250 + podium_svg 800x460,
  auto-suffisants, XSS-safe) en remplacement de html2png/puppeteer.
- Panels UI : ticket V2 (flags/options/form), roleselect (select + toggle),
  rolepanel (boutons + toggle), routés dans interaction_create.
- Fun : dice/coinflip/number/question/morse/love/poll/hack/cat/dog/
  caracteres/catsay/transgender/youtube/tweet/bubbles/hug/kiss/slap.
- Events serenity câblés (`events_handler.rs`) : ready, guildCreate
  (GUILD.LANG), guildDelete (GC différé), joinRole + welcome template,
  memberLeave (rolesaver snapshot), memberJoin (restore), message (XP,
  counter strict, autoreact, sticky repost, suggestions, antispam window),
  messageDelete (snipe), reactionAdd (roles + starboard threshold),
  reactionRemove, userUpdate (prevnames), interactionCreate (boutons
  confession + giveaway join), ratelimit.
- Schedulers tokio (`scheduler.rs`) : sweep SCHEDULE expirés, auto-fin
  giveaways avec tirage, expiry temprole/tempban via HTTP (30s), ticks
  typés membercount/nightmode/notifier.
- Coeur : cooldowns + pagination (`executor.rs`), préfixe dynamique par
  serveur (`GUILD.PREFIX` + setprefix), blacklist lookup, i18n YAML
  partagés (couverture testée sur 10 langues), release consume-once.
- Reste ciblé : audio Lavalink (lavalink-rs), rendus PNG (html2png),
  transcripts HTML tickets, backup objets Discord, eval owner (non porté,
  volontaire), UIs collector complexes (embed builder, roleselect live).

```sh
cd rust
BOT_TOKEN=... cargo run
# optionnels: DEFAULT_PREFIX, TOTAL_SHARDS, DATABASE_URL, DEV_MODE=1
```

## Reste a porter (ordre suggere)

1. `core/handlers/*`, `commandExecutor.ts`, `commandsSync.ts` fin (perms,
   cooldowns, blacklist).
2. `core/functions/*` (56 fichiers): `html2png`, `welcomerMessage`,
   `image64`, `economyHelper`, etc.
3. Categories HybridCommands (28 dossiers): antispam, backup, bot,
   confession, economy, fun, giveaway, guildconfig, h247,
   invitesmanager, membercount, moderation, music (lavalink), newfeatures,
   owner, pfps, profil, ranks, rolereactions, schedule, security,
   starboard, stats, sticky, tag, ticket, tts, utils.
4. Modules: giveaways, temprole/tempban, nightmode, emojis, StreamNotifier,
   Mailer, Blogger, LastFM, backup, transcripts.
5. `types/*.d.ts` -> structs Rust + `database_structure` complet.
6. Assets html/png, emojis (`src/assets/*`).

Parite verifiee: `666` fichiers TS, `~115719` LOC, `10` langues.
Chaque PR doit cocher une categorie + ses cles YAML (10 langues, pas de
fallback) + `cargo check`.
