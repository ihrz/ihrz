# File d'attente du changelog (prochaine version)

Changements intégrés depuis la dernière version, en attente d'être repris dans `CHANGELOG_FR.md` au prochain bump de version.

---

## 🎶 Musique — un lecteur en direct

`/music play` et `/music nowplaying` répondent désormais avec le même **lecteur en direct en Components V2** : une carte de lecteur compacte (pochette floutée en fond, pochette, titre, artiste et barre de progression avec le temps écoulé et la durée, en JetBrains Mono), le salon vocal, qui a demandé le morceau, ce qui vient ensuite, le volume, le mode de boucle et la taille de la file, la plateforme d'où vient le morceau et un bouton **Ouvrir**. **Pause/Reprendre**, **Passer**, **Boucle**, **Paroles** et **Arrêter** fonctionnent directement depuis le panneau pour les auditeurs du salon vocal du bot, et chaque action est annoncée dans le salon.

Le panneau suit la file tout seul (nouvelle pochette, nouvelles couleurs et nouvelle carte à chaque changement de morceau) : le message « en cours de lecture » séparé disparaît, et `/music play` ajoute une note quand votre morceau a été mis en file derrière un autre. Un seul panneau en direct par serveur : en ouvrir un nouveau fige le précédent. Les boutons du lecteur ont de nouveaux emojis.

---

## 🎶 Musique — des transitions fluides, pour de vrai

Le fondu annoncé avec le nouveau backend musical a maintenant vraiment lieu : le morceau suivant de la file monte pendant les 3 dernières secondes du morceau en cours, sans silence entre les deux. Les morceaux très courts et les diffusions en direct s'enchaînent sans blanc.

---

## 🎶 Musique — un nouveau `/music queue`

`/music queue` est redessiné en panneau moderne : le morceau en cours avec sa pochette et sa position, puis les morceaux à venir, dix par page, avec leur artiste, leur durée et qui les a demandés, ainsi que le nombre de morceaux, le temps restant et le mode de boucle. Tout le monde peut le parcourir ; les auditeurs du salon vocal du bot peuvent aussi **mélanger** la file ou **passer directement** à n'importe quel morceau depuis un menu.

---

## 🎤 Musique — des paroles qui marchent, et des suggestions de morceaux

- Les paroles s'affichent de nouveau partout (`/music lyrics`, le bouton **Paroles** du lecteur, `/music trackinfo`) : elles viennent maintenant de lyrics.ovh via le backend musical, et sont mémorisées par chanson pour s'afficher instantanément la fois suivante.
- `/music play` et `/music lyrics` **proposent des morceaux pendant la saisie** (« Titre - Artiste (3:20) », depuis Deezer, puis SoundCloud) ; en choisir un lance, ou affiche les paroles de, cette chanson précise. Un lien collé est gardé tel quel.
- `/music trackinfo` fonctionne de nouveau : il accepte un titre facultatif (vide : le morceau en cours) et affiche une carte avec la pochette, la durée, la source et les paroles.

---

## 🖥️ Dashboard — les changements s'appliquent tout de suite

Les réglages enregistrés sur le dashboard sont maintenant appliqués immédiatement par le bot, avec les mêmes vérifications que les commandes correspondantes : H24/7, la bio de langue du serveur, le nom et l'avatar du bot, les compteurs de membres, les messages épinglés (sticky), les rôles-réactions (boutons et menus déroulants), le piège honeypot, le panneau de confessions, les bans et rôles temporaires, l'arrivée et le départ du TTS et le bouton de vérification AuthRestore. Un changement refusé par le bot est annulé et signalé. L'historique musical garde désormais la pochette de chaque morceau pour le dashboard.

---

## 🎟️ Tickets — des panneaux simples ou avancés

`/ticket panel` a désormais un mode. **Simple** : un bouton ouvre un ticket, sans options ni questions ; l'embed est facultatif et un texte par défaut traduit est utilisé. **Avancé** : le menu déroulant avec options et formulaires, comme avant. Les nouveaux panneaux démarrent en mode simple, les existants restent avancés, et les réglages propres au mode avancé sont masqués en mode simple. `/ticket set-here` est supprimé (le mode simple le remplace) ; les panneaux déjà publiés continuent de fonctionner.

---

## 🔐 Protection — un moteur en temps réel

La protection réagit maintenant aux événements du journal d'audit de Discord au moment où ils arrivent, au lieu de relire le journal à chaque changement : sanctions et restaurations s'exécutent en parallèle et sont bien plus rapides pendant un raid.

- Les modifications sont annulées à partir de leurs anciennes valeurs en une seule requête (salons, permissions, rôles, paramètres du serveur icône et bannière comprises, webhooks, rôles des membres)
- Les salons et rôles supprimés sont recréés avec leurs catégories, leurs permissions et leurs **membres** (le rôle revient à ses membres, pas à l'attaquant)
- Nouveaux cas couverts : permissions des salons, élagage des membres, modification et suppression de webhooks
- L'**Administrateur** donné en modifiant un rôle (@everyone compris) ou en créant un rôle avec est maintenant détecté
- Un attaquant ne peut plus récupérer ses rôles retirés, et une suppression massive de rôles ne ralentit plus le bot sur les autres serveurs

---

## 🛡️ Anti-spam & anti-pub — réécrits

- Le spam est sanctionné **immédiatement** : un raid prolongé depuis plusieurs comptes échappait jusqu'ici complètement à la sanction
- La détection repose sur une fenêtre glissante et sur les messages en double, ce qui attrape aussi le spam lent sur plusieurs salons, et les membres qui discutent vite ne sont plus rendus muets par des signalements accumulés pendant des heures
- Seule la rafale de spam est supprimée (pas des heures d'historique du membre), et les mutes progressifs se calment après 24 h
- L'anti-pub reconnaît les sites autorisés à leur domaine exact (les domaines imitateurs et les liens qui cachent un nom autorisé ne passent plus), détecte `discord.com/invite` sans `https://` et couvre les fils et les discussions des salons vocaux
- Les liens ne sont plus ouverts pour être vérifiés

---

## 🖼️ Images — un nouveau moteur de rendu

Toutes les images générées (cartes de rang, cartes de bienvenue, captcha, memes, cartes `/tweet` et `/youtube`, pages de statistiques, podiums, suivi de latence, carte du lecteur musical) passent à un nouveau moteur de rendu : bien plus rapide, avec les emojis, le texte en **arabe, japonais et coréen** et les noms longs coupés proprement. Les pages de statistiques s'agrandissent avec leur contenu, `/stats ustats` garde son format 1920×1200, le captcha dessine un nouveau bruit à chaque rendu, et le podium de l'économie affiche enfin sa pièce.

---

## 🛠️ Corrections & améliorations

- **Auto-hébergement** : Chrome / Chromium n'est plus du tout nécessaire, les images sont rendues avec resvg. Le script d'installation ne télécharge plus Chrome, et `PUPPETEER_EXECUTABLE_PATH` peut être retiré du `.env`
- **Auto-hébergement** : `pm2 start pm2.config.cjs` installe et met à jour son propre Bun, récupère le dernier code et installe les nouvelles dépendances à chaque démarrage ; les images peuvent être rendues par HorizonGateway pour économiser la mémoire de chaque shard
- **Sécurité** : les DM de rappel pouvaient contenir les rappels d'autres utilisateurs, et le message de passage de niveau pouvait mentionner `@everyone` ou des rôles — les deux sont corrigés ; le texte des utilisateurs dans les images générées est toujours affiché comme du texte
- **Musique** : certains morceaux SoundCloud échouaient avec « not found at source » ; ils se lancent maintenant
- **Musique** : une connexion au fournisseur musical qui coupe en plein morceau (après une longue pause, par exemple) n'arrête plus le morceau : il reprend là où il s'était arrêté
- **Musique** : le lecteur n'est plus détruit quand son salon textuel a disparu
- **`+helpall`** : paginé par catégorie avec un menu déroulant, comme `+h`
- **`/automod`** : le panneau s'ouvre de nouveau quand un rôle exempté ou le salon de logs a été supprimé
- **Captcha** : les membres qui l'échouent sont maintenant réellement expulsés
- **Role saver** : ne rend que les rôles que le bot peut attribuer, fusionnés avec les rôles d'arrivée ; une expulsion par la protection retire d'abord les rôles pour qu'ils ne reviennent pas au retour du membre
- **Honeypot** : bannit un spammeur déjà parti du serveur
- **Statistiques** : `/stats ustats` comptait chaque message deux fois, les titres de `/gstats` sont traduits
- **Langues** : des variables brutes corrigées dans `/perm create-roles` (japonais), `/daily`, `/schedule`, les photos de profil et le résumé de la blacklist ; les emojis manquants s'affichent dans les messages épinglés, les erreurs Last.fm, le message de départ du welcomer, le panneau TempVoice et l'avis de salon vide de la musique ; textes français corrigés
- **Performances** : les réglages des serveurs sont mis en cache, les serveurs actifs obtiennent des réponses plus rapides
- Moins de bruit dans les logs d'erreurs : les refus de Discord pour accès ou permissions manquants sont attendus et ne sont plus enregistrés
- La commande partenaire `+fexini` est supprimée
