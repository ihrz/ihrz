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

## 🎚️ Musique — les skips passent en fondu

`/music skip`, le bouton skip du panneau de lecture et les sauts depuis le panneau de file font maintenant un fondu de 3 s vers le morceau suivant sur un nœud Wavyzon, au lieu de couper. Le nouveau morceau démarre tout de suite ; il est annoncé à la fin du fondu. Les autres nœuds, un lecteur en pause et les dernières secondes d'un morceau gardent le skip classique.

---

## 🎛️ Musique — des configs Equalizer APO par serveur

`/music apo` ouvre un panneau où les administrateurs et propriétaires du serveur gardent jusqu'à **5 configurations Equalizer APO** (fichiers `.txt` de 15 Kio et 50 lignes de commandes maximum : profils AutoEQ de casques, exports REW, EQ paramétrique ou graphique, convolution et reverb). Chaque config peut être ajoutée, renommée, remplacée, supprimée et **gelée** : une config gelée reste applicable mais ne peut plus être modifiée ni supprimée, jusqu'à ce que la personne qui l'a gelée, un propriétaire du serveur ou du bot la dégèle. Une config est **appliquée par défaut** à tout ce que joue le serveur, tout de suite et pour chaque morceau suivant, et le module entier peut être désactivé. Le nœud musical vérifie chaque fichier avant l'enregistrement et les lignes ignorées sont listées. Un fichier joint à `/music apo` est ajouté comme nouvelle config. Les mêmes configs, avec les mêmes règles, se gèrent aussi depuis le dashboard (module **Equalizer APO**, administrateurs). Nécessite Wavyzon avec son plugin `apo`.

---

## 📜 Musique — un nouvel historique musical

`/music history` est refait en carte **Components V2**, aux couleurs de la dernière pochette : ce que le serveur a écouté ces 30 derniers jours, le nombre de morceaux et le temps d'écoute, l'artiste le plus écouté et qui a fait le plus de demandes, une mosaïque des dernières pochettes, puis cinq morceaux par page avec leur pochette, leur lien, leur durée, leur source, qui l'a demandé et quand (dans le fuseau horaire de chacun). **Exporter** envoie l'historique complet en fichier texte, visible par toi seul. **Vider** demande maintenant la permission Gérer le serveur et une confirmation ; les autres personnes qui cliquent sur les boutons savent pourquoi rien ne se passe.

---

## 🧰 Utilitaires — de nouvelles cartes partout

Toutes les commandes utilitaires répondent avec une carte **Components V2** au lieu d'un embed : un titre clair avec un emoji du pack du bot, une information par ligne, des dates affichées dans le fuseau horaire de chacun, le nom du bot du serveur en signature discrète, et des couleurs qui disent ce qui s'est passé (vert quand c'est fait, rouge pour une action destructive, orange quand quelque chose a échoué). `/userinfo`, `/serverinfo`, `/avatar`, `/banner`, `/inviteinfo` (une seule carte maintenant, avec l'auteur de l'invitation et son expiration), `/serverpic`, `/where`, `/vc` et `/snipe` ont des cartes plus riches ; les listes (`/allbots`, `/admin-users`, `/admin-roles`, `/allwebhooks`, `/role-members`, `/prevnames`, `/leashlist`, `/locknamelist`) se feuillettent avec Précédent / Suivant, réservés à l'auteur ; les actions de masse (`/massiverole`, `/nickrole`, `/massmove`, `/bringall`, `/derank`, `/unbanall`) montrent ce qu'elles ont fait et ce qui a échoué ; les panneaux media-only, nick-kicker et rôles autorisés gardent leurs menus dans la carte. Corrigé au passage : `/vc` comptait les membres en sourdine comme muets, `/locknamelist` affichait de mauvaises dates, `/util move` tentait de déplacer des membres absents des salons vocaux, `/admin-users` peut vraiment masquer les bots, et `/prevnames` ne propose plus que d'effacer votre propre historique.

Les mêmes cartes arrivent dans la **modération**, le **fun** et le **gestionnaire d'invitations**. `/ban` et `/kick` disent qui a été sanctionné, par qui et pourquoi ; `/baninfo` affiche la vraie date du ban (ou indique qu'elle est inconnue) ; `/banlist`, `/mutelist` et `/warnlist` se feuillettent, avec les exclusions temporaires et les avertissements datés dans ton fuseau horaire ; `/unwarn` et `/rolepanel` montrent ce qui a changé. Les photos d'animaux partagent une même carte, les résultats aléatoires (`/dice`, `/heads-tails`, `/number`, `/gay`, `/rate`…) affichent une barre de score, `/love`, `/tweet`, `/youtube` et `/catsay` gardent leurs images dans la carte, et `/poll` récolte toujours ses réactions. `/invites` détaille les invitations normales, les départs, le bonus et qui a invité le membre ; `/leaderboard` se feuillette et affiche ton propre rang. Corrigé au passage : `/kick` n'annonce plus une expulsion qui a échoué.

---

## 📊 Stats — entièrement refaites

`/stats` répond avec une carte **Components V2** : quelques phrases sur ce qui ressort (quand tu es le plus actif, cette semaine par rapport à la précédente, ton salon favori, ta série de jours, qui mène), une nouvelle image, et un menu pour changer de vue sans relancer la commande. Les images sont redessinées de zéro : de grands chiffres avec leur tendance par rapport à la semaine passée, un graphique quotidien (les messages en barres, le vocal en courbe) et une **carte de chaleur jour × heure** qui montre quand le serveur, un membre ou un salon est vraiment actif, avec le pic entouré. Les messages sont toujours en bleu et le vocal toujours en corail. Les heures suivent le fuseau du serveur (déduit de sa langue), et les dates et jours sont écrits dans la langue du serveur.

- `/stats ustats` : messages, temps en vocal, jours actifs et série en cours, classement sur le serveur, salons texte et vocaux favoris ; la vue **Rythme** ajoute la longueur moyenne des messages, les sessions vocales, la plus longue session et la meilleure série.
- `/stats gstats` : messages, vocal, membres actifs et heure de pointe, meilleurs membres en messages et en vocal ; vues **Rythme** et **Salons**.
- `/stats channel-stats` : un salon texte ou vocal, avec ses membres et son rythme.
- `/stats compare` : deux membres face à face sur six critères, avec leurs deux courbes quotidiennes.
- `/stats top-messages` / `/stats top-voice` : un classement avec avatars sur 24 heures, 7 ou 30 jours (jusqu'à 15 membres).

Corrigé au passage : les chiffres sur 30 jours étaient étiquetés « 14d », et le graphique d'activité pouvait être coupé par le pied de page.

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
- Le panneau `/protect` propose un choix **Toutes les règles** : il indique combien de règles sont activées, règle d'un coup le contournement et la sanction de toutes les règles actives, et allume ou éteint toutes les règles avec **Tout activer** / **Tout désactiver**

---

## 🛡️ Anti-spam & anti-pub — réécrits

- Le spam est sanctionné **immédiatement** : un raid prolongé depuis plusieurs comptes échappait jusqu'ici complètement à la sanction
- La détection repose sur une fenêtre glissante et sur les messages en double, ce qui attrape aussi le spam lent sur plusieurs salons, et les membres qui discutent vite ne sont plus rendus muets par des signalements accumulés pendant des heures
- Seule la rafale de spam est supprimée (pas des heures d'historique du membre), et les mutes progressifs se calment après 24 h
- L'anti-pub reconnaît les sites autorisés à leur domaine exact (les domaines imitateurs et les liens qui cachent un nom autorisé ne passent plus), détecte `discord.com/invite` sans `https://` et couvre les fils et les discussions des salons vocaux
- Les liens ne sont plus ouverts pour être vérifiés

---

## 🖼️ Images — un nouveau moteur de rendu

Toutes les images générées (cartes de rang, cartes de bienvenue, captcha, memes, cartes `/tweet` et `/youtube`, pages de statistiques, podiums, suivi de latence, carte du lecteur musical) passent à un nouveau moteur de rendu : bien plus rapide, avec les emojis, le texte en **arabe, japonais et coréen** et les noms longs coupés proprement. Le captcha dessine un nouveau bruit à chaque rendu, et le podium de l'économie affiche enfin sa pièce.

---

## 🔒 Sécurité — mettez votre instance à jour

Cette version corrige plusieurs problèmes de sécurité. **Si vous hébergez votre propre instance d'iHorizon, mettez-la à jour au plus vite.**

- Les réglages enregistrés refusent les noms de clé réservés, et les noms de tag et mots de réaction automatique ne peuvent plus contenir de point (les lettres de toutes les langues restent acceptées)
- Les commandes média ne téléchargent que des images d'hôtes publics, avec des limites de taille et de temps
- `/util unzip-emojis` importe au plus 50 emojis, un par un, ignore les fichiers trop lourds et arrête de lire un fichier qui ment sur sa taille
- `/guildconfig config restore` ne restaure qu'une sauvegarde faite sur le même serveur et ne change jamais les owners du bot sur ce serveur ; les sauvegardes faites avant cette version ne peuvent plus être restaurées
- Les commandes réservées aux owners du bot vérifient toujours l'owner
- Économie : un retrait sur une banque vide est refusé, `/economy shop` débite chaque achat sur votre solde actuel, et les commandes d'argent et de cooldown ne peuvent plus être lancées plusieurs fois en même temps (une deuxième envoyée trop vite reçoit un court message)
- Les commandes de giveaway n'agissent que sur les giveaways du serveur actuel
- `/mod tempban` et `/mod ban` refusent d'agir sur un membre dont le rôle le plus haut est égal ou supérieur au vôtre

---

## ⚙️ Auto-hébergement — configuration en `.env` et binaire autonome

Le bot se configure avec des variables d'environnement, lues depuis un fichier `.env` (`cp .env.example .env`), au lieu de `src/files/config.ts`. Chaque connexion tient en une URL : `LAVALINK_URL=ws://motdepasse@hote:2333` (plusieurs nodes séparés par des virgules, `wss://` pour le TLS) et `DATABASE_URL` (`sqlite`, `json`, `memory`, `postgres://...` ou `ws://...` pour HorizonDB). Les listes sont séparées par des virgules (`OWNERS=id1,id2`), et une faute de frappe dans une valeur arrête le bot au démarrage avec un message clair au lieu d'être devinée. Plus rien n'est compilé dans le code : le même build fait tourner n'importe quel bot.

Un `config.ts` existant fonctionne encore pour l'instant (avec un avertissement) : `bun run config:env` le déplace dans `.env`, garde ce que `.env` contenait déjà, vérifie le résultat et déplace l'ancien fichier dans `config.ts.migrated` à la racine du projet, ignoré par Git puisqu'il contient encore vos secrets (les sauvegardes de l'installeur comme `.env.bak.*` sont ignorées aussi). Le **script d'installation est reconstruit** : il écrit `.env` avec des secrets saisis masqués, des identifiants vérifiés et des URL de connexion construites pour vous (plusieurs nodes Lavalink, SQLite, PostgreSQL, HorizonDB ou JSON au lieu d'une option MySQL qu'aucun driver ne gérait), vérifie le résultat avec l'analyseur du bot avant de démarrer, peut lancer le bot depuis le clone ou en binaire autonome (voir ci-dessous), et ne laisse jamais deux copies du bot tourner. Il installe maintenant `ffmpeg` (nécessaire au son en vidéo) et ne met plus à jour tout le système.

`bun run build:binary` compile iHorizon en **un seul exécutable** : code, langues, modèles SVG, polices, emojis et modèles vidéo sont dedans, il tourne donc avec juste un `.env` à côté, sans Bun, sans `node_modules` et sans le code source. Le même fichier fait tourner le gestionnaire de shards et chaque shard, extrait ses fichiers une fois par build dans `.ihorizon/resources/`, et les traces d'erreur pointent toujours vers les fichiers sources. Compilez-le sur la plateforme qui fait tourner le bot (`--target` pour les autres).

---

## 📡 Panneau de statut — refait de zéro

`+status-embed` devient un **panneau Components V2** avec des emojis personnalisés, dans la langue du serveur et coloré selon l'état global. Une nouvelle image affiche la disponibilité sur 24 heures et 30 jours, la réponse moyenne, le ping Discord, les 60 derniers contrôles de chaque service et un graphique du temps de réponse. Les panneaux existants se convertissent seuls à la prochaine actualisation.

**Auto-hébergement** : le panneau peut lire une page de statut **Uptime Kuma** avec `UPTIME_KUMA_URL`, `UPTIME_KUMA_API_KEY` (disponibilité sur 30 jours) et `UPTIME_KUMA_GROUPS`, et affiche ses incidents ainsi qu'un lien vers la page. Sans elle, ou tant qu'elle est injoignable, le panneau utilise les vérifications du bot.

---

## 🛠️ Corrections & améliorations

- **Auto-hébergement** : Chrome / Chromium n'est plus du tout nécessaire, les images sont rendues avec resvg. Le script d'installation ne télécharge plus Chrome, et `PUPPETEER_EXECUTABLE_PATH` peut être retiré du `.env`
- **Auto-hébergement** : `pm2 start pm2.config.cjs` installe et met à jour son propre Bun, récupère le dernier code et installe les nouvelles dépendances à chaque démarrage ; les images peuvent être rendues par HorizonGateway pour économiser la mémoire de chaque shard
- **Protection** : les membres qui choisissent ou retirent leurs rôles via l'Onboarding ou Salons et rôles ne sont plus traités comme une modification de rôle ni sanctionnés
- **Images** : les pseudos stylisés et les caractères spéciaux (`𝓕𝓪𝓷𝓬𝔂`, `★`, `ᯓ𓂃`, `༄`, runes, hébreu, thaï, hindi et bien d'autres alphabets) s'affichent maintenant sur toutes les images générées au lieu de cases vides
- **Auto-hébergement** : arrêter ou redémarrer le bot arrête maintenant aussi ses shards, et `pm2 start pm2.config.cjs` arrête tout processus resté d'une exécution précédente du même dossier : d'anciens shards ne peuvent plus répondre une seconde fois à chaque commande
- **Planificateurs** : le mode nuit retire et rend tous les rôles même si la mise à jour d'un rôle échoue, et un rôle qu'il n'a pas pu rendre est réessayé à la fin de nuit suivante ; les bans et rôles temporaires ne sont plus perdus ni rendus définitifs s'ils changent pendant une vérification, et un ban ou rôle qui ne peut pas encore être levé (permission manquante) est réessayé sans remplir les logs ; le chargement d'une backup attend que le serveur soit vidé avant de restaurer ; les notifications de streams gardent un historique limité et les vérifications ne se chevauchent plus
- **Sécurité** : les DM de rappel pouvaient contenir les rappels d'autres utilisateurs, et le message de passage de niveau pouvait mentionner `@everyone` ou des rôles — les deux sont corrigés ; le texte des utilisateurs dans les images générées est toujours affiché comme du texte
- **Musique** : certains morceaux SoundCloud échouaient avec « not found at source » ; ils se lancent maintenant
- **Musique** : une connexion au fournisseur musical qui coupe en plein morceau (après une longue pause, par exemple) n'arrête plus le morceau : il reprend là où il s'était arrêté
- **H24/7** : une connexion vocale qui échoue 3 fois de suite est maintenant réinitialisée toute seule : le bot oublie sa connexion enregistrée et revient dans son salon, le H24/7 reste activé
- **Musique** : le lecteur n'est plus détruit quand son salon textuel a disparu
- **Musique** : le bouton **Paroles** du lecteur est lui aussi désactivé une fois son panneau terminé
- **`+helpall`** : paginé par catégorie avec un menu déroulant, comme `+h`
- **`/automod`** : le panneau s'ouvre de nouveau quand un rôle exempté ou le salon de logs a été supprimé
- **Captcha** : les membres qui l'échouent sont maintenant réellement expulsés
- **Correctifs serveurs** : le captcha n'expulse plus les bots ajoutés par un admin ; quitter le salon vocal « talk » ne démute que les membres que le mode talk a lui-même rendus muets (y compris ceux rendus muets à son activation, même après un redémarrage du bot ou une déconnexion), un mute de modérateur n'est pas touché ; l'anti-bot ne bannit plus un bot ajouté par l'owner quand Discord tarde à écrire le journal d'audit ; le compteur met à jour le sujet du salon au plus toutes les 5 minutes ; l'anti-exe vérifie la vraie extension (`screen.shot.png` passe) et épargne les modérateurs ; les giveaways sont vérifiés une fois par minute, sans participations ni annonces en double ; les tickets s'ouvrent sur les serveurs dont le nom contient des guillemets, supprimer un ticket garde les autres tickets de son auteur, et seuls l'auteur ou le staff peuvent le supprimer ou en sauvegarder le transcript
- **Role saver** : ne rend que les rôles que le bot peut attribuer, fusionnés avec les rôles d'arrivée ; une expulsion par la protection retire d'abord les rôles pour qu'ils ne reviennent pas au retour du membre
- **`/utils prevnames`** : plus d'entrées `null` ni de noms listés plusieurs fois (les anciens historiques sont réparés à l'affichage), et les noms sont nettoyés : plus de caractères invisibles ni de retours à la ligne, et un nom comme `<@id>` ne s'affiche plus comme une mention. Les historiques sont maintenant stockés en objets typés (`{ type, name, at }`, avec `guild` pour les pseudos), convertis au chargement : le `data` de l'API publique prevnames suit, et `tools/ClearNullPrevnames.ts --apply` convertit toute une table
- **Dashboard** : l'âge de compte requis de la politique des nouveaux comptes accepte les durées en toutes lettres (`2 semaines`, `1 mois`) ; en taper une enregistrait 0, ce qui désactivait la politique sans prévenir. Le bot n'expulse plus tous les nouveaux membres quand la politique est activée sans âge défini
- **Dashboard** : une section contenant une date (bans et rôles temporaires, tags, blacklist, honeypot déclenché) peut de nouveau être enregistrée ; les images d'embed et les fonds de bienvenue hébergés sur Discord ne sont plus refusés ; enregistrer les niveaux, la bienvenue ou les utilitaires ne coupe plus les messages de niveau, les réactions « hey », `autoFeur` ni les liens GitHub ; changer le mode d'une règle de `/protect` garde sa sanction
- **Anti-exe** : désactivé veut vraiment dire désactivé (il restait actif)
- **Role saver** : les rôles admin ne sont rendus que si c'est demandé
- **Rôles d'arrivée** : ils ne retirent plus les rôles rendus par le role saver
- **`/schedule`** : les rappels sont envoyés même si l'utilisateur n'est pas en cache, au lieu d'être perdus
- **`/confession config`, `/starboard threshold`, `/skullboard threshold`** : s'appliquent maintenant vraiment
- **Dashboard** : le mute de l'anti-spam et les délais de l'économie étaient lus en millisecondes alors que les champs disaient secondes (un mute de 600 durait 0,6 s, un délai de 86400 durait 86 s) : ils acceptent maintenant des durées comme `15min` ou `2h`. Les champs numériques refusent ce qui n'est pas un nombre au lieu d'enregistrer rien ou 0, les valeurs d'économie non renseignées le restent, et une config à laquelle il manque l'essentiel (rôle du captcha, flux de blog, salon du notifier ou salon vocal, type de sanction) est refusée avec un message
- **Performances** : moins de requêtes Discord et de lectures en base inutiles sur les serveurs actifs (rôle de support, logs de mise à jour des salons, starboard et skullboard, salons images seulement, niveaux, TTS) ; un post du starboard ou du skullboard n'est plus créé deux fois quand deux réactions arrivent en même temps, et son compteur finit quand même juste, et deux messages rapprochés ne donnent plus un double passage de niveau
- **Anti-spam** : activé sans seuil ou sans intervalle, il ne détectait rien ; il utilise maintenant les valeurs par défaut de `/antispam`
- **Images uniquement** : le seuil d'avertissements est appliqué (il valait toujours 3)
- **Mode nuit** : UTC+8 est disponible, et le dashboard ne propose que les décalages connus du bot
- **`/punishpub`** : la sanction tombe au nombre de signalements choisi (un trop tôt avant, et jamais avec 1)
- **Starboard / skullboard** : au moins 2 réactions, même avec un seuil vide
- **Auto-hébergement** : `tools/MigrateDashboardUnits.ts --apply` répare les valeurs enregistrées dans la mauvaise unité
- **Dashboard** : enregistrer n'annule plus ce qui s'est passé depuis l'ouverture de la page : seules les sections enregistrées sont écrites, et seul ce que vous avez modifié les remplace. « Supprimer le module » sur la bienvenue et les utilitaires n'efface plus le role saver, les permissions, les limites et les autres réglages stockés au même endroit. Les longues listes tenues par le bot (notifier, blog, confessions) ne bloquent plus l'enregistrement. L'infobulle des serveurs affiche le total des membres
- **Rôles-réactions** : le dashboard peut de nouveau les enregistrer (toute clé d'émoji ou de bouton était refusée), et son interrupteur active ou coupe vraiment un rôle
- **Tickets** : une fois désactivés, les panneaux déjà publiés n'ouvrent plus de ticket non plus
- **Dashboard** : retrait des réglages sans effet : interrupteur de l'allowlist (la liste s'applique toujours en mode allowlist) et horodatage du notifier
- **`/setlogschannel`** : les choix `boost` et `ticket` fonctionnent (ils enregistraient une clé que rien ne lit)
- **Compteur de membres** : `{ChannelCount}` affiche les salons (il affichait les rôles à l'actualisation)
- **Tags** : un tag sans embed peut être utilisé et affiché
- **Panneaux de tickets** : retirer une question ne donne plus un id en double à la suivante, ce qui cassait le formulaire ; un panneau simple se publie depuis le dashboard sans embed, comme avec `/ticket panel`
- **Blacklist du dashboard** : ajouter un utilisateur le bannit avec la raison indiquée et le retirer le débannit, comme les commandes
- **Automod du dashboard** : les interrupteurs spam, mentions de masse, liens et invitations Discord activent et coupent les mêmes règles AutoMod natives que `/automod`, en gardant leurs rôles et leurs logs. Une règle refusée par Discord est signalée et son interrupteur revient en arrière
- **`/schedule`** : le rappel en MP affiche son titre et sa description dans des blocs corrects (des backticks traînaient à la fin)
- **Salons vocaux temporaires** : un bot n'en reçoit plus. Quand le salon 24/7 était aussi le salon de création, iHorizon se créait un nouveau « Salon de <bot> » chaque minute
- **`/tempvoice`** : le salon de création peut être retiré (un bouton, ou en vidant le menu), et le panneau ne casse plus quand ce salon a été supprimé
- **Commandes hors serveur** (`/fun` en MP ou en application utilisateur) : plus d'erreur « malformed key » en cherchant la signature de la carte
- **Honeypot** : bannit un spammeur déjà parti du serveur
- **Invitations** : les arrivées sont de nouveau comptées sur les serveurs qui n'ont rien configuré (une erreur les arrêtait avant le comptage)
- **Statistiques** : `/stats ustats` comptait chaque message deux fois, les titres de `/gstats` sont traduits
- **Langues** : des variables brutes corrigées dans `/perm create-roles` (japonais), `/daily`, `/schedule`, les photos de profil et le résumé de la blacklist ; les emojis manquants s'affichent dans les messages épinglés, les erreurs Last.fm, le message de départ du welcomer, le panneau TempVoice et l'avis de salon vide de la musique ; textes français corrigés
- **Performances** : les réglages des serveurs sont mis en cache, les serveurs actifs obtiennent des réponses plus rapides
- Moins de bruit dans les logs d'erreurs : les refus de Discord pour accès ou permissions manquants sont attendus et ne sont plus enregistrés
- La commande partenaire `+fexini` est supprimée
- **Auto-hébergement** : toutes les erreurs et alertes restantes passent maintenant par le logger du bot (horodatage, shard, niveau), et les erreurs sont journalisées avec leur pile complète au lieu de `{}`, une seule fois (sur stderr) au lieu de deux
- **Auto-hébergement** : l'alerte de dépréciation `[DEP0169] url.parse()` n'apparaît plus dans les logs quand un lien musical est vérifié
- **H24/7** : quand son salon vocal est supprimé, le réglage H24/7 est effacé au lieu d'être retenté indéfiniment (avec une alerte dans les logs)
- **Auto-hébergement** : les shards ne parcourent plus les dossiers sources au démarrage : commandes, events, composants, fonctions et modèles SVG sont chargés depuis les fichiers générés `src/exports/` `bun run dev` les tient à jour, `bun run gen:exports` les régénère à la main, et le bot prévient au démarrage quand ils ne sont plus à jour. À chaque démarrage, le gestionnaire de shards compile aussi une seule fois le code d'iHorizon dans `dist/shard/bot.js`, et chaque shard démarre depuis ce seul fichier au lieu de ~700 fichiers sources (les traces d'erreur pointent toujours vers `src/`). `IHORIZON_NO_BUNDLE=1` fait tourner les shards depuis `src` comme avant, et une compilation ratée y revient toute seule
- **Auto-hébergement** : la base sqlite tourne en mode WAL avec un délai d'attente, plusieurs shards n'échouent plus avec « database is locked » ; avec Postgres, une lecture en échec n'écrase plus toute la configuration d'un serveur
- **Auto-hébergement** : les logs de commandes sont enregistrés en base de données (table `slash_logs`, gardés 90 jours) au lieu de `src/files/slash.log.json`, que chaque shard réécrivait en même temps (des logs se perdaient et tout le fichier était relu toutes les quelques commandes). Ils notent maintenant le nom complet de la commande (`/music play`, et non `/play`) et l'identifiant de l'utilisateur, commandes préfixées comprises. L'ancien fichier est déplacé en base au premier démarrage, puis renommé `slash.log.json.migrated`
- **Auto-hébergement** : seul le premier shard publie les commandes slash et crée les emojis d'application manquants au démarrage, au lieu que chaque shard le fasse (les autres ne font que lire les emojis, ce qui évite aussi des emojis en double à la première installation avec plusieurs shards)
- **`/music play`** : une suggestion modifiée après avoir été choisie (« Titre - Artiste (2:58) ») est cherchée sans sa durée, qui faisait échouer la recherche
- **Dashboard** : fini les erreurs « Dashboard rate limited » en naviguant : la limite de lectures est plus haute, la liste des serveurs et votre profil ne sont chargés qu'une fois pour toute la page, et un blocage ne se prolonge plus si vous continuez à cliquer
