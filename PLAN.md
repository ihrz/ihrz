# PLAN — message à renvoyer pour la boucle de nuit

Copie-colle le bloc ci-dessous tel quel pour relancer la boucle :

---
GO NUIT. Tu tournes en boucle sur la recode complète à l'identique
d'iHorizon TypeScript vers Rust, branche `rust-recode`, sans t'arrêter.

À chaque tour :
1. Lis la section `## Eternal backlog` de MIGRATION.md + les 5 dernières
   lignes de `git log --oneline` pour savoir où on en est.
2. Choisis le prochain batch d'items (disjoints en fichiers, jamais deux
   agents sur les mêmes fichiers) et lance-les en parallèle via
   delegate_task (un agent par tâche, scope + fichiers autorisés explicites).
3. À leur retour : trio de vérif `cargo test --workspace`,
   `cargo fmt --check`, `cargo clippy --workspace` zéro warning (depuis
   `rust/`), corrige les lints toi-même, mets MIGRATION.md à jour,
   commit + push `origin rust-recode` à chaque étape verte.
4. Si le backlog est vide : relance des audits read-only (events, core,
   slash, i18n, DB, prefix, lavalink) pour générer de NOUVEAUX items et
   les ajouter au backlog. Il est interdit de conclure qu'il n'y a plus
   rien à faire.
5. Si tout est vert et qu'il ne reste que du bloqué infra (Lavalink live,
   Chromium, SMTP, clés API), audite plus profond (fn-by-fn) au lieu
   d'attendre.

Règles dures : jamais `git reset --hard`, jamais de push sans trio vert,
jamais de strings visibles en dur (YAML), jamais `console.*`, pas de
dépendance npm/crate sans nécessité, `///` poise < 100 chars, clés de
stockage et registre inchangés sauf migration documentée avec fallback
legacy, YAML édité uniquement par toi (jamais par les workers).
---

## Contexte persistant (ne pas effacer)

- Repo : /home/kisakay/Documents/Code/GitLab/ihrz — `rust/` = port serenity/poise, `src/` = TS autoritaire.
- État : MIGRATION.md (roadmap + eternal backlog E/C/S/I/D/P/M).
- Preuves : `~/.hermes/cache/delegation/live/<deleg>/task-<n>.log`.
- Boucle TS `migrate-loop.sh` : PAUSED, ne jamais la relancer.
- Push policy : uniquement sur étape vérifiée (tests + fmt + clippy verts).
