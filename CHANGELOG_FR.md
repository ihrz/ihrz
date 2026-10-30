# Version Patch 2026.11.1 (1er patch de novembre 2026)

---

## 🎙️ TempVoice — un panneau de contrôle complet, directement dans votre salon

`/tempvoice` remplace les anciennes commandes de configuration `/voice` par un **panneau Components V2** unique : choisissez le salon de création, la catégorie de destination, le nom et la position par défaut, ainsi que les rôles staff qui ignorent les restrictions. Chaque salon temporaire reçoit désormais son propre **panneau de contrôle Components V2** avec un menu de sélection pour réclamer la propriété, renommer, définir une limite d'utilisateurs, changer la confidentialité, la région, les listes de confiance/blocage, transférer la propriété et supprimer le salon. Le panneau est actualisé quand quelqu'un réclame le salon, et les anciennes commandes séparées `set-voice-channel*`, `set-staff-role` et `set-text-channel` disparaissent.

---

## 🎟️ Tickets — un panneau entièrement repensé

`/ticket panel` s'affiche maintenant en **Components V2** avec une mise en page plus claire et les emojis personnalisés d'iHorizon. Configuration, aperçu, rôles à mentionner, catégorie, champs d'options, formulaires et boutons de ticket sont regroupés en sections lisibles, tandis que le même panneau continue de gérer les options de transcription, de suppression et de sélection d'utilisateur.

---

## 🎁 Giveaways — `/gw go` ouvre un panneau interactif

`/gw go` ouvre un **panneau Components V2** pour préparer un giveaway sans taper une commande complète : lot, durée, nombre de gagnants, condition de participation, image et salon cible. Modifiez chaque réglage, puis lancez, annulez ou fermez le panneau ; le giveaway démarre dans le salon choisi une fois que tout est valide.

---

## 🚨 AutoMod — toutes les règles dans un seul panneau

`/automod` remplace les cinq sous-commandes `/automod block ...` par un **panneau Components V2** unique : activez ou désactivez chaque règle, définissez le canal qui reçoit ses logs et choisissez les **rôles autorisés à la contourner**. Spam, mentions de masse, liens & publicités, invitations Discord et liens Telegram possèdent chacun leur emoji dans la vue d'ensemble, la vue détail affiche la limite de mentions, et les anciennes sous-commandes disparaissent — le panneau pilote les mêmes règles AutoMod natives qu'avant.

---

## 🔐 Protection — un panneau dédié pour chaque règle

`/protect` remplace les anciennes sous-commandes `actions`, `sanction` et `show` par un **panneau Components V2** couvrant les 13 règles de protection : activez ou désactivez chacune, choisissez qui peut la contourner (liste d'autorisation, tout le monde ou seulement le propriétaire) et définissez une **sanction par règle** — annulation seule, +derank, +ban, +kick ou +mute — au lieu d'une sanction unique pour tout le serveur, qui reste disponible comme valeur globale par défaut.

---

## 🔒 Utilitaires — verrouillez les pseudos, listez les laisses

- `/utilss lockname` verrouille le pseudo d'un membre, avec la possibilité d'en imposer un nouveau, tandis que `/utilss unlockname` le libère. `/utilss locknamelist` affiche tous les pseudos verrouillés avec leur auteur et leur date.
- `/utilss leashlist` liste les laisses actives avec le temps restant, pagine les longues listes et supprime automatiquement les entrées expirées.

---

## 🎵 Musique — des métadonnées natives pour toutes les plateformes

Les liens Spotify, Apple Music, Amazon Music et Tidal sont désormais résolus par des **extracteurs intégrés** au lieu de paquets GitHub externes. Les métadonnées des morceaux, albums, playlists et pochettes restent disponibles même si ces paquets changent, et le parseur Apple Music gère le format actuel des pages.

---

## 🛡️ Anti-spam — des mutes progressifs

Quand un membre est mute par l'anti-spam, chaque nouvelle sanction **double la durée** au lieu d'appliquer toujours la même, avec un plafond de **28 jours**. Les récidivistes sont traités progressivement.

---

## 🆘 `+helpall` — uniquement les commandes que vous pouvez utiliser

Nouvelle commande préfixée listant toutes les commandes hybrides accessibles au membre, selon les permissions personnalisées du serveur, regroupées par catégorie. Si aucune permission personnalisée n'est configurée, elle renvoie vers `+h` au lieu d'afficher une liste vide.

---

## 🛠️ Corrections & améliorations

- **Transcriptions de tickets** : la fermeture, la suppression ou le départ d'un ticket utilise le nouveau moteur de transcription et continue de fonctionner quand le propriétaire du ticket quitte le serveur
- **Boutons et menus de rôles** : les messages de confirmation indiquent désormais correctement si un rôle a été ajouté ou retiré
- **TempVoice** : les connexions simultanées ne créent plus de salons en double ou fantômes, les entrées orphelines sont nettoyées au démarrage, et le panneau de contrôle est actualisé quand la propriété est réclamée
- **H24/7** : ré-adopte la session vocale existante après un redémarrage sans départ/arrivée visible, ne signale une connexion qu'avec une session djs-voice active, et récupère les lecteurs détruits
- **Modération** : les logs de `/warn` et `/unwarn` basculent vers `#mods` ou les logs de modération configurés quand les logs iHorizon sont absents ; `/warn`, `/lock`, `/unlock` et les commandes de réaction de rôle ne plantent plus sur un membre, un salon ou un identifiant invalide
- **`/togif`** : prend en charge les uploads en DM et les sources WebP, avec une limite de 15 Mo et des erreurs plus claires
- **Honeypot** : le nettoyage parcourt désormais les salons non cachés et les fils actifs/archivés, avec une seconde passe pour les messages postés pendant le nettoyage
- **Statut** : le graphique de ping est généré hors ligne en SVG intégré (sans CDN Chart.js), et le marqueur de point parasite a disparu
- **Aide** : l'aide en préfixe n'affiche plus d'embed en double pour les groupes de commandes slash
- **Bannières** : les bannières animées des utilisateurs et des serveurs s'affichent correctement grâce à un nouveau résolveur
- **Notificateur de release** : attend que toutes les shards soient prêtes avant de démarrer, reprend dans un ordre déterministe et journalise la progression et l'ETA
- **Base de données** : HorizonDB utilise désormais une seule `horizon_dbUrl` (identifiants et timeout inclus), et les clés de configuration obsolètes ont été supprimées
- **Sous le capot** : la randomisation crypto remplace `Math.random`, les flux RSS sont parsés avec `Bun.XML`, et les dépendances externes de transcription/RSS ont été remplacées
