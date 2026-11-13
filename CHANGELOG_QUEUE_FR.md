# File d'attente du changelog (prochaine version)

Changements intégrés depuis la dernière version, en attente d'être repris dans `CHANGELOG_FR.md` au prochain bump de version.

---

## 💾 Backups — entièrement refaites

`/backup` passe en **panneaux Components V2** avec un jeu d'emojis dédié. **Choisissez ce qui entre dans une backup, et ce qui en ressort** : paramètres du serveur, rôles, salons, permissions des salons, emojis, autocollants, bannissements, règles AutoMod, événements, messages et membres. Une restauration n'efface que ce que vous avez sélectionné.

**`/backup schedule`** (propriétaire du serveur) sauvegarde un serveur automatiquement, de tous les jours à tous les ans. Les 5 dernières backups automatiques de chaque serveur sont conservées. Chaque utilisateur peut détenir **20 backups** au maximum.

Les backups enregistrent aussi les autocollants, les règles AutoMod, les événements, l'ordre, les icônes et les dégradés des rôles, les forums et leurs tags, les permissions par membre, les salons communautaires, l'écran d'accueil et plus encore. Les restaurations ne perdent plus les permissions des salons, ne transforment plus les forums en salons texte, ne peuvent plus rester bloquées et se terminent par un rapport par catégorie.

L'option `save-message` de `/backup create` est remplacée par le panneau.

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
- **Paroles synchronisées** dans le lecteur du dashboard : quand le serveur musical a des paroles minutées (LRCLIB), la ligne chantée se remplit et brille au rythme du titre, les autres s'estompent autour, et les paroles défilent toutes seules ; sur ordinateur, elles prennent tout le lecteur (dans l'esprit de Radiant Lyrics de meowarex).
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

## 💜 Musique — vos playlists et titres likés

Chacun a désormais sa **bibliothèque musicale** dans le lecteur du dashboard : **likez** un titre avec le cœur (jusqu'à 5 000 titres likés) et gardez jusqu'à **20 playlists** de 400 titres chacune. Créez une playlist vide ou avec le titre en cours et la file, ajoutez-y n'importe quel titre de la file ou de vos titres likés, renommez-la, réordonnez-la, retirez des titres, et **lancez ou mélangez** une playlist ou vos titres likés dans votre salon vocal en un clic. Les titres sont gardés prêts à jouer : même une playlist de 400 titres démarre aussitôt. Votre bibliothèque n'appartient qu'à vous et vous suit sur tous les serveurs ; la modifier n'apparaît jamais dans le journal d'activité d'un serveur.

**Importez** une playlist ou un album TIDAL, Spotify, Apple Music, Deezer, YouTube ou SoundCloud depuis son lien dans une nouvelle playlist (400 titres au plus), et **partagez** n'importe laquelle de vos playlists avec un lien public sur `music.ihorizon.org/playlist/…` : une page avec sa pochette, son propriétaire et ses titres, son propre aperçu sur Discord, et un bouton **Ajouter à ma bibliothèque** qui la copie dans la bibliothèque du visiteur. Le partage est désactivé tant que vous ne l'activez pas pour une playlist, et le lien cesse de marcher dès que vous le retirez. `/music play` accepte aussi ces liens : collez-en un et toute la playlist partagée se lance aussitôt.

---

## 🔄 Musique — le serveur musical peut redémarrer

Quand le serveur musical (Wavyzon / Lavalink) redémarre ou perd la connexion, la musique **reprend toute seule là où elle en était** : le bot reprend sa session, ou à défaut remet chaque lecteur en place (titre, position, volume, pause, filtres, Equalizer APO). Pendant ce temps, les commandes de musique, le panneau du lecteur et le dashboard disent que le serveur musical redémarre au lieu de « nothing is playing » ou d'une erreur ; arrêter, mélanger, répéter et vider la file restent possibles. Le bot retente la connexion toutes les 5 secondes au lieu de 50.

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
- Les commandes média, les URL d'images du welcomer et des giveaways, les flux RSS Blogger et les aperçus de lignes GitHub/GitLab ne joignent que des hôtes http(s) publics (vérifiés à chaque redirection, adresses internes refusées même via des astuces DNS), avec des limites de taille et de temps ; les images de plus de 16,7 millions de pixels environ sont ignorées
- `/util unzip-emojis` importe au plus 50 emojis, un par un, ignore les fichiers trop lourds et arrête de lire un fichier qui ment sur sa taille
- `/guildconfig config restore` ne restaure qu'une sauvegarde faite sur le même serveur et ne change jamais les owners du bot sur ce serveur ; les sauvegardes faites avant cette version ne peuvent plus être restaurées. Elle est désormais réservée aux propriétaires du serveur et conserve la protection, l'allowlist, la blacklist et les données des membres (économie) actuelles
- Les commandes réservées aux owners du bot vérifient toujours l'owner
- Économie : un retrait sur une banque vide est refusé, `/economy shop` débite chaque achat sur votre solde actuel, et les commandes d'argent et de cooldown ne peuvent plus être lancées plusieurs fois en même temps (une deuxième envoyée trop vite reçoit un court message). `/economy rob` et `/economy pay` verrouillent aussi l'autre membre, et `/economy deposit` / `/economy withdraw` n'acceptent que des montants entiers positifs
- Les commandes de giveaway n'agissent que sur les giveaways du serveur actuel
- `/mod tempban`, `/mod ban` et `/mod kick` refusent d'agir sur un membre dont le rôle le plus haut est égal ou supérieur au vôtre
- `/utils addrole`, `/utils delrole`, `/economy role add`, `/mod temprole`, `/utils massiverole`, `/utils nickrole`, `/utils addrolereact`, les récompenses de niveau et les panneaux de rôles (boutons, réactions, menus) refusent un rôle au-dessus de votre rôle le plus haut ou ayant des permissions que vous n'avez pas ; le retrait de `massiverole`/`nickrole` ignore les membres de rang égal ou supérieur au vôtre, et les panneaux en libre-service ne donnent jamais un rôle Administrateur, seulement les rôles de leur propre menu
- `/tag edit` est réservé à l'auteur du tag et aux administrateurs, et refuse les noms invalides ou déjà utilisés
- `/ticket delete`, `/ticket transcript` et `/ticket open` exigent l'auteur du ticket ou le staff aussi depuis la commande, plus seulement depuis les boutons
- Les messages du bot ne mentionnent plus `@everyone`, `@here` ou des rôles depuis du texte d'utilisateur (tags, options renvoyées, messages sticky) ; les notifications de stream et les pings du staff des tickets gardent leurs mentions configurées
- Les commandes du menu contextuel vérifient leur permission requise, et une permission de commande inconnue refuse au lieu d'autoriser
- `/perm set-user` niveau 0 ne peut plus retirer le niveau de quelqu'un de rang égal ou supérieur
- Le choix du fuseau du mode nuit et le choix du rôle de role-select n'acceptent que la personne qui les a ouverts
- Les codes de sécurité AuthRestore ne sont plus enregistrés dans les logs de commandes
- « Convertir en MP4 » refuse tout de suite les fichiers de plus de 25 Mo ou l'audio de plus de 10 minutes
- `/mod unmute`, `/mod unmuteall`, `/utils lockname` et `/utils unlockname` n'agissent plus sur le propriétaire du serveur ni sur un membre de rang égal ou supérieur
- Les boutons des salons vocaux temporaires (nom, limite, région) ne modifient que le salon dont vous êtes propriétaire, même si vous changez de salon avant de valider
- `/utils embed` ne copie, n'envoie et ne remplace que dans les salons où vous avez les permissions correspondantes
- Seuls les développeurs d'iHorizon peuvent ajouter ou retirer des owners du bot et blacklister un owner du bot (un co-owner pouvait ajouter d'autres co-owners ou bannir un autre co-owner de tout le réseau)
- Les durées tapées par les membres (`/schedule`, tempban, giveaways...) sont refusées au-delà de 64 caractères : une durée très longue pouvait figer un shard plusieurs secondes. `/schedule` refuse une heure invalide et garde au plus 25 rappels par membre, jusqu'à 10 ans à l'avance
- Les pages de `/guildconfig show` ne tournent que pour l'admin qui l'a lancée ; `/authrestore roles` n'accepte que la clé du serveur actuel ; `/status` n'affiche plus la version du noyau de l'hôte
- L'anti-exe bloque aussi `.scr`, `.com`, `.pif`, `.cpl`, `.jar`, `.lnk`, `.hta`, `.js`, `.jse`, `.vbe`, `.wsf`, `.reg`, `.iso`, `.img`, `.msix` et `.appx`
- Auto-hébergement : la génération de médias utilise un dossier privé (`.ihorizon/media-manipulation`) au lieu d'un dossier partagé dans `/tmp`, et l'historique des noms garde les 200 dernières entrées
- Auto-hébergement : nodemailer passe en 10.4.0 et undici est corrigé ; les noms de serveur sont échappés dans les e-mails de notification de l'owner

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

## 🕵️ Confessions — des outils de modération

- **`/confession delete`** supprime une confession et son fil à partir de son code
- **`/confession ban`** et **`/confession unban`** bloquent l'auteur d'une confession dans le module sans révéler son identité
- Les auteurs reçoivent une confirmation privée avec le code de leur confession
- L'auteur d'une confession est oublié après 90 jours, et seules les 2000 dernières confessions d'un serveur sont conservées

---

## 💡 Suggestions — un vrai suivi

- Les suggestions ont désormais un statut : en attente, à l'étude, acceptée, planifiée, implémentée ou refusée, avec **`/suggest status`** pour le changer
- Acceptez, refusez et répondez directement avec les boutons de la suggestion
- Un seul vote par membre avec compteurs en direct, et recliquer sur son vote l'annule
- **`/setsuggest staff-role`** permet à un rôle de gérer les suggestions sans être administrateur
- L'auteur est mentionné dans le fil quand sa suggestion change ou reçoit une réponse
- **`/suggest list`** affiche les suggestions les plus populaires, filtrables par statut
- Répondre ne ferme plus une suggestion : seules celles refusées ou implémentées sont définitives

---

## 🖥️ Dashboard — les outils du bot depuis le web

Le bot répond désormais lui-même aux demandes du dashboard, avec **les mêmes vérifications que les commandes équivalentes** : vos règles `/perm` et la permission propre à la commande, son cooldown et `/commandlimit`, et la hiérarchie des membres et des rôles. Depuis le dashboard, vous pouvez maintenant : piloter le **lecteur musical** (file, pause, passer, boucle, volume, rechercher et ajouter des morceaux, paroles) ; gérer les **avertissements, exclusions temporaires, bannissements et expulsions**, tout débannir et l'annuler ; ouvrir une **fiche membre** (profil, anciens pseudos, salon vocal, rôles, invitations, argent, XP, pseudo verrouillé) ; **purger, verrouiller, masquer et synchroniser** des salons, écrire au nom du bot et lancer un sondage ; donner ou retirer un rôle à tout le monde et voir qui est administrateur ; voir qui est en **vocal** et déplacer, rassembler, répartir ou déconnecter des membres ; gérer les **giveaways**, modérer les **suggestions**, parcourir le starboard et le skullboard ; traiter les **tickets ouverts** et lire leurs transcriptions ; vérifier les **webhooks, bots et invitations** ; télécharger tous les emojis et autocollants d'un coup et ajouter des emojis ; changer la **bio et la bannière** du bot sur le serveur ; créer, charger et planifier des **backups** ; régler les règles **AutoMod** natives (rôles exemptés, salon d'alerte, limite de mentions) ; activer ou couper le **mode talk** et créer le rôle d'**exception du mode nuit**. Les réglages qui n'avaient pas de page en ont une : permissions et limites d'utilisation des commandes, ghost ping à l'arrivée, commandes fun on/off, filtre de pseudos, limites de rôles, rôles que les modérateurs peuvent donner, laisses, réactions aux mots, renouvellement des salons, salon vocal gelé et rôle de l'équipe des suggestions.

---

## 🇰🇷 iHorizon parle coréen

iHorizon est maintenant disponible en **coréen (한국어)** : tous les messages du bot, et la description, les options et les choix de chaque commande slash dans le client Discord coréen. Choisissez-le avec `/setserverlang` (les serveurs dont la langue Discord est le coréen l'obtiennent automatiquement à l'ajout du bot), avec sa propre bannière. Le TTS lit les messages en coréen avec une voix coréenne (ils étaient lus comme du japonais), et `/tts` propose le coréen. Le dashboard est lui aussi traduit en coréen.

---

## 🖥️ Dashboard — carte publique, journal d'activité, couleurs et plus

- **Palette de commandes** (`Ctrl+K`, `⌘K` sur macOS) : aller à n'importe quelle page, serveur, module, membre (`@`), salon (`#`) ou commande du bot (`/`), lancer des actions rapides et changer vos préférences, de partout
- **Votre carte iHorizon** sur `dash.ihorizon.org/@pseudo`, façon page de liens : avatar, badges gagnés avec iHorizon (staff, accès anticipé, serveurs gérés avec le bot, votre réseau de membres, commandes utilisées, Last.fm, sauvegardes, vétéran, popularité, anniversaire), une accroche, la bio de votre `/profil`, vos liens, la musique que vous écoutez sur Last.fm, vos chiffres et un compteur de visiteurs uniques. Choisissez sa couleur et son fond (aurora, votre bannière, dégradé, mesh, uni) et exactement ce qui s'affiche ; elle reste désactivée tant que vous ne l'activez pas (Paramètres › Profil public)
- **Journal d'activité** : chaque serveur a désormais un journal en lecture seule de ce que ses gestionnaires ont fait sur le dashboard, avec l'auteur et l'heure, gardé 90 jours : chaque réglage modifié avec son ancienne et sa nouvelle valeur (salons, rôles et membres par leur nom), chaque action lancée via le bot, les embeds, panels de tickets et le lien vanity, refus et échecs compris. Recherche par texte, type, auteur, statut et dates, export CSV. Il est écrit par iHorizon lui-même et personne ne peut le modifier ni le supprimer
- **Couleur d'accent** : Paramètres › Apparence permet à chacun de choisir la couleur du dashboard (14 palettes ou n'importe quelle couleur, contraste toujours lisible), le thème (système, clair, sombre) et la langue
- **Signaler un bug** depuis n'importe où (menu du profil, `Ctrl+K`) : un titre, ce qui s'est passé et une capture (fichier, glisser-déposer, coller ou capture de l'écran). Suivez vos signalements et les réponses de l'équipe dans Paramètres › Signalements
- **Owners du bot** : tous les signalements dans les paramètres (filtre par statut, recherche, réponse, clôture), et la blacklist du bot avec noms, raisons, auteurs et dates
- **Pilule du lecteur** : tant que le bot joue de la musique sur un serveur, un petit lecteur reste en bas à droite des pages de ce serveur (précédent, lecture/pause, suivant, lien vers le lecteur) et porte les touches multimédia
- **Limites de rôles** : les limites posées sur des rôles supprimés du serveur sont retirées automatiquement
- **Mode nuit** : ses réglages sur le dashboard sont réservés au propriétaire du serveur, comme la commande
- **Lecteur musical** refait en lecteur plein écran façon Spotify et TIDAL : la pochette floutée derrière tout, une grande pochette, un panneau avec la file, les paroles, votre bibliothèque et la recherche, et une barre de lecture en bas (la molette sur le volume le change) ; sur téléphone, un écran « en cours » (les commandes multimédia du téléphone remplacent les raccourcis clavier). Il prévient quand le serveur musical redémarre, et les liens longs (Apple Music, Amazon, Spotify) et les playlists TIDAL y fonctionnent désormais
- **Votre carte sur `discord.wf/@pseudo`**, une adresse courte qui ouvre aussi les invitations de serveur (`discord.wf/votre-serveur`). Les cartes acceptent une **image de fond personnalisée** (jusqu'à 5 Mo), les liens affichent le **logo de leur site** (Telegram, Instagram, Facebook, YouTube, Spotify, Steam, TikTok, Twitch, GitHub et environ 80 autres), et une carte partagée sur Discord ou un réseau social a **son propre aperçu** : votre nom, votre phrase, votre couleur et une image faite de votre avatar et de vos chiffres
- **Profil du bot** : changer l'avatar du bot sur votre serveur, comme `/custom avatar`
- **Anciens pseudos** (Outils) : voir votre historique de noms et l'effacer, comme le bouton de `/utils prevnames`
- **Toutes les langues du bot** : le dashboard existe aussi en allemand, portugais, japonais, arabe (de droite à gauche) et « français vulgaire »
- **Téléphones** : une recherche plus légère (`Ctrl+K`), des onglets sur une seule ligne qui défile, plus de zoom, et un écran de chargement au logo d'iHorizon sur les cartes publiques

---

## 🛠️ Corrections & améliorations
- **Musique** : juste après un skip, le dashboard et la carte du lecteur affichent le temps du nouveau titre au lieu de celui du précédent pendant plusieurs secondes, et le temps d'un titre en pause ne défile plus
- **Musique** : les paroles synchronisées suivent ce que vous entendez vraiment : elles attendent le trajet du son jusqu'à vos oreilles (le ping vocal vers Discord, Discord et votre appareil), restent sur le bon titre pendant un skip en fondu, et un réglage − / + les décale de 0,1 s quand un fichier de paroles est décalé
- **Musique** : un lien de playlist YouTube ou YouTube Music (`list=`, mix compris) lance toute la playlist (100 titres au plus) au lieu de sa seule première vidéo, et les titres YouTube sont nettoyés (« Artiste - Titre (Clip officiel) ») avant la recherche ; les liens YouTube sont lus sur les pages publiques de YouTube, sans bibliothèque YouTube
- **Musique** : les playlists TIDAL sont converties 8 titres à la fois : les ajouter depuis le dashboard ne dépasse plus le délai
- Boutique de l'économie : les rôles supprimés du serveur ne restent plus en « rôle inconnu », ils sont retirés automatiquement et libèrent leur place dans la limite de 20 rôles.
- Rôle de soutien : un statut contenant le mot « null » ou un texte configuré vide ne donne plus le rôle.
- Tags : un tag sans texte ni embed répond désormais par un message clair, et une mention ne remplace plus le texte du tag.
- **Giveaways** : deux membres qui participent au même moment sont bien inscrits tous les deux, un giveaway ne peut plus être annoncé deux fois, on ne peut plus participer une fois qu'il est fini, quitter un giveaway ne vous retire plus des autres du salon, et un reroll sans plus personne n'annonce plus de gagnant vide.
- **Rôles-réactions** : retirer sa réaction sur un emoji personnalisé retire de nouveau le rôle.
- **Skullboard** : les réactions sur les anciens messages (envoyés avant un redémarrage) comptent de nouveau, et un post sous le seuil est retiré avec la même règle que le starboard.
- **Compteur** : deux nombres envoyés au même moment ne remettent plus un compte correct à zéro.
- **Suggestions** : une suggestion est enregistrée même quand son fil ne peut pas être créé, ses boutons continuent donc de marcher.
- **`/mod tempmute`** : un mute qui échoue le dit au lieu d'annoncer un succès, et l'avis « démuté » est envoyé à la fin du mute.
- **`/mod tempban`** : l'erreur de rôle affiche le membre au lieu de `user_mention`.
- **Salons vocaux temporaires** : une panne de Discord ou une limite de requêtes ne supprime plus un salon où il y a du monde.
- **`/economy deposit all` et `withdraw all`** : fonctionnent de nouveau avec un solde à virgule.
- **Lignes GitHub** : un lien vers plus de 50 lignes affiche de nouveau l'avertissement, et une plage qui dépasse la fin du fichier est raccourcie au lieu d'être ignorée.
- **Tickets** : quand un membre part, tous les tickets qu'il avait ouverts sont fermés et supprimés, avec leur transcription et un log dans le salon de logs des tickets s'il est configuré (sans lui, les tickets restaient ouverts pour toujours). La réponse « pas la permission » de `/ticket delete`, `transcript` et `open` s'affiche de nouveau, et un rôle présent à la fois dans les pings du panneau et de la catégorie ne bloque plus le message du ticket.
- **`/guildconfig config restore`** : sur un serveur qui n'a encore aucune donnée de protection, d'allowlist, de blacklist ou de membres, elles sont reprises de la sauvegarde au lieu d'être perdues.
- **Photos de profil, auto-renew** : ne publient plus l'avatar d'un bot et ne recréent plus un salon deux fois.

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
- **Invitations** : les arrivées sont de nouveau comptées sur les serveurs qui n'ont rien configuré (une erreur les arrêtait avant le comptage), et les départs sont désormais déduits même sans salon d'au revoir (les compteurs ne faisaient que monter)
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
- **Confessions** : une confession envoyée pendant la publication d'une autre ne perd plus son log staff, les confessions non anonymes fonctionnent pour les membres sans avatar personnalisé, et les fils de discussion sont bien enregistrés
- **Confessions** : le cooldown s'applique désormais par serveur, couvre aussi les réponses, et les réponses s'arrêtent quand le module est désactivé
- **Confessions** : le bouton **Profil utilisateur** des logs exige la permission Exclure temporairement des membres et fonctionne même si l'auteur a quitté le serveur
- **Suggestions** : un message de moins de 5 mots reçoit désormais une explication et reste 10 secondes pour pouvoir être copié, et les pièces jointes sont conservées sur la suggestion
- **`/suggest accept`** : le message d'erreur s'affiche correctement quand la suggestion ne peut pas être mise à jour
- **`/economy shop`** : si le rôle ne peut pas être donné, le membre est prévenu et n'est plus débité
- `+shardinfo` (propriétaires du bot) répond désormais avec une image couvrant tous les shards : serveurs et membres par shard, état, ping, mémoire, sessions vocales et uptime. Un shard qui ne répond pas apparaît hors ligne au lieu de faire échouer la commande.
- **`/mod lock-all` et `/mod unlock-all`** : ne réinitialisent plus les permissions des salons pour le rôle : les salons privés devenaient visibles par tout le monde
- **`/unmute`** : le dit quand l'exclusion temporaire n'a pas pu être retirée, au lieu d'annoncer un succès
- **`/unban`** : fonctionne sur les serveurs de plus de 1000 bannissements, et ne journalise plus un débannissement qui a échoué
- **Tickets** : fermer ou rouvrir fonctionne quand l'auteur du ticket n'est pas dans le cache du bot, un changement de permission refusé affiche une erreur au lieu d'un faux succès, et le journal du ticket n'est écrit que si l'action a réussi
- **`/music pause`, `/music resume`, `/music skip`** : plus d'erreur quand le lecteur est déjà en pause ou en lecture, ni quand le salon texte du lecteur a été supprimé
- **`/unban-all`, `/utils massiverole`** : un second lancement sur le même serveur est refusé tant que le premier n'est pas fini (deux lancements se chevauchaient, et un unban-all pouvait oublier qui rebannir avec `undo`)
- **`/util untalk`** : refusé tant que le mode talk est actif dans un autre salon vocal, dont les membres restaient muets pour de bon quand il était remplacé
- **Giveaways** : le nombre de participations d'un giveaway en cours se met maintenant à jour en français aussi (il restait à 0), et le message du giveaway est toujours reconstruit depuis ses données plutôt qu'en modifiant son texte
- **Dashboard — Hall of fame** : les pages du starboard et du skullboard se chargent bien plus vite (leurs messages sont lus 100 par 100 au lieu d'un par un)
- **Dashboard — Lecteur musical** : un bouton **Précédent** rejoue le dernier morceau, et le lecteur répond aux touches multimédia du clavier et aux commandes média du système (lecture/pause, suivant, précédent) tant que sa page est ouverte, Linux (MPRIS) compris
- **Dashboard — Tickets ouverts** : les messages s'affichent comme sur Discord : émojis personnalisés (Nitro), mentions de membres, rôles et salons avec leur nom, gras/italique/souligné/spoilers, réponses avec le message cité, images en aperçu (spoilers floutés jusqu'au clic), stickers, couleur des embeds, et une étiquette BOT plus discrète
- **Dashboard — Bienvenue / Départ** : une barre de mise en forme au-dessus des messages (gras, italique, souligné, barré, spoiler, code, citation, Ctrl+B/I/U) et un bouton **{channel}** qui choisit un salon du serveur et insère sa mention ; les menus d'embed affichent les titres mis en forme comme sur Discord
