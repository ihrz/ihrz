# File d'attente du changelog (prochaine version)

Changements intégrés depuis la dernière version, en attente d'être repris dans `CHANGELOG_FR.md` au prochain bump de version.

---

## 🎶 Musique — `/music play` ouvre le lecteur en direct

`/music play` répond désormais avec le même panneau de lecteur en direct que `/music nowplaying` : il suit le lecteur du serveur d'un morceau à l'autre (pochette, couleurs et carte mises à jour à chaque changement), affiche la source du morceau (Deezer, SoundCloud, YouTube...) et indique quand un morceau a été ajouté à la file d'attente. Un seul panneau en direct par serveur : en ouvrir un nouveau ferme le précédent. La bannière « en cours de lecture » envoyée dans le salon disparaît, et les boutons du lecteur ont de nouveaux emojis.

---

## 🛠️ Corrections & améliorations

- **Auto-hébergement** : Chrome / Chromium n'est plus du tout nécessaire, les images sont rendues avec resvg. Le script d'installation ne télécharge plus Chrome, et `PUPPETEER_EXECUTABLE_PATH` peut être retiré du `.env`
