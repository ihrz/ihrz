# Version mineure 2026.7.1 (1er patch de juillet 2026)

## Changements entre la version 2026.6.1 et la version 2026.7.1

---

## Nouveautés

Commande : `/custom`

Nous faisons évoluer notre approche des fonctionnalités de personnalisation du bot.

Depuis que le projet est devenu open source en 2022, notre objectif a toujours été de garder iHorizon gratuit et accessible à tous. Cependant, entre l'hébergement, les serveurs, les noms de domaine, les licences et les différents services nécessaires au fonctionnement du bot, les coûts continuent d'augmenter.

Concrètement, cette évolution permet à iHorizon de s'intégrer pleinement à votre communauté, comme s'il s'agissait de votre propre bot, tout en conservant la stabilité, les fonctionnalités et la maintenance continue du projet principal.

Jusqu'à présent, les fonctionnalités de personnalisation étaient considérées comme de simples commandes « fun ». Aujourd'hui, nous faisons évoluer cette vision.

Grâce à `/custom`, iHorizon peut adopter une identité propre à votre serveur, comme un bot entièrement personnalisé, tout en restant stable, maintenu et cohérent avec l'ensemble de l'écosystème.

Cette évolution contribue au financement du projet tout en offrant davantage de flexibilité aux serveurs souhaitant une expérience réellement personnalisée avec iHorizon.

Merci à toutes les personnes qui soutiennent iHorizon depuis le début. ❤️

Commande : `/utils userinfo`

* Désormais, OAuth2 n'est plus la seule méthode utilisée pour détecter si un utilisateur possède Nitro. iHorizon utilise également la présence d'une bannière de profil et d'un avatar animé pour déterminer si un utilisateur dispose de Nitro.

Commande : `/mod unban`

* Ajout de l'alias `pardon` dans la commande MessageContext.

Module : `Confession`

* Modification de l'embed du formulaire de confession afin d'informer les membres du serveur que les confessions peuvent être désanonymisées.

Module : `Security`

* Refonte du module CAPTCHA avec une nouvelle interface, ainsi qu'une meilleure gestion des erreurs avec une limite de 3 tentatives.

Module : `ihorizon-logs`

* Modification de la détection des salons de logs. Auparavant, un salon devait s'appeler exactement `ihorizon-logs`. Désormais, il suffit que son nom contienne cette chaîne.

Module : `Music`

* Ajout d'un petit message d'astuce affiché aléatoirement au démarrage du lecteur pour informer les utilisateurs de l'existence de la commande `/lastfm`.

Module : `Giveaways`

* Ajout d'un bouton « Liste des participants » dans les embeds des giveaways permettant de consulter tous les participants du giveaway en cours.

## Améliorations internes

* Ajout de Sweepers et de makeCache à la configuration `Client` de discord.js afin d'améliorer l'utilisation de la mémoire en production.
* Ajout d'une purge TTL pour tous les messages des serveurs dans le module AntiSpam.
* Amélioration de la précision de l'AntiSpam en corrigeant plusieurs bugs pouvant provoquer des faux positifs.
* Correction des logs de boosts qui pouvaient générer du spam lorsque les Sweepers supprimaient des membres du cache.
* Correction de l'exécution d'iHorizon sous Windows.
* Nouvelle apparence pour la commande `/status`.
* Suppression de toutes les boucles `while`, qui provoquaient des ralentissements sur le runtime `node:loop`.
* Correction de l'enregistrement des anciens pseudonymes : les Sweepers pouvaient produire des pseudonymes nuls à tort ; cela utilise désormais un `Set`.
* Optimisation du module interne `InviteManager` et de la récupération des invitations, avec moins d'appels à l'API et une réduction du risque de rate limiting.

## Corrections de bugs

Commande Clear

* Correction d'une régression introduite dans la version 2026.6.1 qui affectait la commande `/mod clear`.

Commande Remind Ticket

* Correction de la commande de rappel des tickets.

HoneyPot

* Correction d'un bug où les messages envoyés dans le salon HoneyPot n'étaient pas supprimés.

Commande Ranks Show

* Correction d'un bug provoquant un crash lorsque la couleur dominante ne pouvait pas être calculée correctement.
