# File d'attente du changelog (prochaine version)

Changements intégrés depuis la dernière version, en attente d'être repris dans `CHANGELOG_FR.md` au prochain bump de version.

---

## 🎶 Musique — `/music play` ouvre le lecteur en direct

`/music play` répond désormais avec le même panneau de lecteur en direct que `/music nowplaying` : il suit le lecteur du serveur d'un morceau à l'autre (pochette, couleurs et carte mises à jour à chaque changement), affiche la source du morceau (Deezer, SoundCloud, YouTube...) et indique quand un morceau a été ajouté à la file d'attente. Un seul panneau en direct par serveur : en ouvrir un nouveau ferme le précédent. La bannière « en cours de lecture » envoyée dans le salon disparaît, et les boutons du lecteur ont de nouveaux emojis.

---

## 🎶 Musique — des transitions fluides

Les morceaux s'enchaînent désormais en fondu : le suivant de la file monte pendant les 3 dernières secondes du morceau en cours, sans silence entre les deux, comme sur une appli de streaming. Les morceaux très courts et les diffusions en direct s'enchaînent sans blanc.

---

## 🎶 Musique — un nouveau `/music queue`

`/music queue` est redessiné en panneau moderne : le morceau en cours avec sa pochette et sa position, puis les morceaux à venir, dix par page, avec leur artiste, leur durée et qui les a demandés, ainsi que le nombre de morceaux, le temps restant et le mode de boucle. Tout le monde peut le parcourir ; les auditeurs du salon vocal du bot peuvent aussi **mélanger** la file ou **passer directement** à n'importe quel morceau depuis un menu.

---

## 🛠️ Corrections & améliorations

- **Auto-hébergement** : Chrome / Chromium n'est plus du tout nécessaire, les images sont rendues avec resvg. Le script d'installation ne télécharge plus Chrome, et `PUPPETEER_EXECUTABLE_PATH` peut être retiré du `.env`
- **Musique** : `/music trackinfo` fonctionne de nouveau, accepte un titre facultatif (vide : le morceau en cours) et affiche sa pochette, sa durée, sa source et ses paroles dans une nouvelle carte
- **Musique** : la carte « en cours de lecture » utilise la police JetBrains Mono
- **Musique** : les paroles fonctionnent de nouveau (`/music lyrics`, le bouton **Paroles** du lecteur, `/music trackinfo`) : elles viennent maintenant de lyrics.ovh via le nœud musical, et sont mémorisées par chanson pour s'afficher instantanément la fois suivante
- **Musique** : `/music lyrics` propose des morceaux pendant la saisie, comme `/music play`
