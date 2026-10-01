# Version Patch 2026.10.1 (1er patch d'octobre 2026)

---

## 🎙️ H24/7 — iHorizon ne quitte plus votre salon vocal

Un tout nouveau module garde iHorizon dans votre salon vocal **24h/24 et 7j/7**, même quand rien ne joue — parfait pour garder le streak vocal de votre serveur :

- `/h247 join` — installe le bot dans un salon vocal (admin uniquement)
- `/h247 leave` — désactive la présence 24/7 sans couper la musique en cours
- `/h247 info` — voir le statut, le salon et le fonctionnement

Le bot rejoint automatiquement après un redémarrage, un kick ou une déconnexion, avec un watchdog qui maintient la connexion. Nouveau `/utilss renewvc` (alias `rvc`) pour réinitialiser la région de votre salon vocal en cas d'audio saccadé.

---

## 👋 Welcomer — un seul panneau pour tout

`/guildconfig set welcomer` ouvre désormais un **panneau unifié** pour configurer tout votre accueil : messages d'arrivée et de départ, DM de bienvenue, rôles automatiques, salons et aperçu de bannière — tout est modifiable directement avec des interrupteurs en temps réel. Les anciennes commandes séparées `join-dm`, `join-message`, `leave-message` et `join-role` sont fusionnées dans ce panneau.

---

## 📰 Newsletter — fiabilisée et plus sûre

La newsletter de release (DM automatique aux propriétaires à chaque mise à jour) a été retravaillée pour la fiabilité : strictement **un seul DM par propriétaire**, envoyé depuis la shard principale uniquement, avec un envoi cadencé et une pause automatique si Discord rate-limite. Les propriétaires aux DM fermés sont ignorés proprement au lieu d'être retentés indéfiniment. Désabonnement en un clic, comme avant.

---

## 🆓 `/custom` est maintenant gratuit pour tout le monde

Le paywall sur la personnalisation du bot a été retiré — les profils personnalisés sont disponibles pour tous les serveurs.

---

## ⏳ Cooldowns plus intelligents

Les commandes spammées ont désormais des cooldowns par commande avec un message d'attente au lieu d'être silencieusement ignorées.

---

## 🛠️ Corrections & améliorations

- **Automod** : activer le blocage de liens ne supprime plus les webhooks GitHub/GitLab ni les liens médias (hébergeurs de code, GIFs, images et vidéos en liste blanche)
- **Anti-spam** : les webhooks ne sont plus signalés comme spammeurs
- **Ticket** : les panneaux avec de très longues listes d'options basculent sur un fichier au lieu de casser
- **Play en vocal** : les pièces jointes de plus de 10 Mo sont refusées avec une erreur claire au lieu d'échouer silencieusement
- **Bio du bot** : iHorizon définit désormais une bio traduite (avec votre nombre de commandes) dans la langue de votre serveur à son arrivée
- **TTS** : améliorations et cohabitation fluide avec le nouveau mode H24/7
- **Sous le capot** : nouveau backend de base de données HorizonDB, réparation automatique des intents privilégiés manquants, et correction d'une fuite de descripteurs de fichiers dans les logs d'erreur
