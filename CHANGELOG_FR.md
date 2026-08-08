# Version Patch 2026.8.2 (2ème patch d'août 2026)

---

## 🌍 iHorizon parle maintenant 5 langues (dans les description de commande)

Toutes les commandes du bot sont désormais disponibles en **Français**, **Anglais**, **Japonais**, **Russe** et **Espagnol**. Les commandes `/help` et `+h` s'adaptent automatiquement à la langue de votre serveur.

---

## 🎤 TTS : iHorizon lit vos messages à voix haute

Un tout nouveau module Text-to-Speech débarque avec 4 commandes :

- `/tts join` — iHorizon rejoint votre salon vocal et lit les messages
- `/tts leave` — iHorizon quitte le salon
- `/tts lang` — choisissez la langue de la voix
- `/tts info` — voir l'état du module

---

## 🎵 Apple Music, Amazon Music & Tidal

Le lecteur de musique prend désormais en charge les liens **Apple Music**, **Amazon Music** et **Tidal** en plus de Spotify, YouTube, SoundCloud, Deezer et CDN Discord.

---

## 👋 Un accueil plus chaleureux

Quand iHorizon rejoint un serveur, il envoie maintenant un **message de bienvenue en DM** au propriétaire — et aussi à la personne qui a ajouté le bot. Un joli embed avec des boutons pour découvrir le projet.

---

## ⚙️ `/setlang` fait peau neuve

Plus besoin de taper un code langue. `/setlang` ouvre un **menu interactif** avec la liste des langues et leurs drapeaux. Choisissez, cliquez sur Sauvegarder, c'est tout. Le panneau met désormais à jour ses labels dans la langue sélectionnée au fur et à mesure.

---

## 📋 `+updates` — Le changelog à portée de main

Une nouvelle commande `+updates` (alias : `+changelog`, `+update`) permet de consulter les dernières informations de version, le commit et la branche d'iHorizon — avec le changelog complet joint en PDF téléchargeable. Le PDF est automatiquement fourni dans la langue de votre serveur (Français ou Anglais), avec un fallback si l'une n'est pas disponible.

---

## 📰 Newsletter — restez informé automatiquement

Les propriétaires de serveur reçoivent désormais une **notification automatique en DM** à chaque nouvelle version d'iHorizon (majeure, mineure et patch). Le message inclut le numéro de version, le lien de release et le changelog complet en PDF. Les propriétaires peuvent se désabonner à tout moment en un clic.

---

## 🛠️ Corrections & améliorations

- **Lock / Unlock** : ne supprime plus les permissions personnalisées des salons
- **Tempmute** : impossible de mute quelqu'un avec un rôle supérieur ou égal au vôtre
- **Automod** : bloque maintenant les liens d'invitation cachés derrière un encodage URL
- **Ticket** : le panneau de ticket ne crash plus avec des noms d'options trop longs
- **Confession** : module réécrit pour plus de fiabilité
