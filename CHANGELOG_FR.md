# Version Mineure 2026.8.1 (1er patch d'août 2026)

## Changements entre [2026.7.1](https://gitlab.com/ihrz/ihrz/-/releases/2026.7.1) et [2026.8.1](https://gitlab.com/ihrz/ihrz/-/releases/2026.8.1)

---

## Changements actuels

**__Langues (`Toutes`)__**

- Toutes les traductions internes ont été révisées et améliorées.

**__Commande `/mod rolepanel` (+rolepanel)__**

- Nouvelle commande : attribuer les rôles sélectionnés à un membre via un panneau.

**__Commande `/mod unmuteall` (+unmuteall)__**

- Nouvelle commande permettant de retirer le mute de tous les membres actuellement muets en une seule fois.

**__Commande `/mod unlockall`__**

- Nouvelle commande permettant de déverrouiller tous les salons en une seule fois.

**__Commande `/mod tempmute` (+tempmute)__**

- La durée maximale du timeout a été augmentée à 28 jours.

**__Commande `/utils admin-roles`__**

- Ajout d'un alias : `allpa`.

**__Commande `+move`__**

- Vous pouvez désormais préciser directement le nom d'un salon vocal dans la commande (ex. : `+move 2h0 Voice 1`).

**__Module : `Music`__**

- `/music skip` (+skip) — ajout de l'alias : `+next`.
- Correction du volume lorsqu'une nouvelle piste démarre.
- Ajout de la prise en charge des liens Spotify (Album/Piste/Playlist) et des liens de pistes YouTube Music.

**__Module : `Giveaways`__**

- Traduction de la commande `gw` en français.
- Correction du typage des giveaways (backend).

**__Module : `Server data on leave`__**

- Nouvelle méthode pour supprimer les données d'un serveur lors du départ (changement majeur de philosophie). iHorizon attend désormais 10 heures avant de supprimer définitivement les données du serveur, ce qui permet de réinviter le bot et d'annuler le processus s'il a été expulsé par erreur, tout en conservant la configuration complète.

**__Module : `PrevNames Logging`__**

- Amélioration des journaux des anciens noms : les pseudonymes de serveur sont désormais également enregistrés.

**__Fun__**

- Ajout de la phrase Autofeur.

## Améliorations internes

- Suppression des Sweepers pour les membres de serveur.
- Amélioration majeure du code backend — unification du gestionnaire de contexte pour les commandes Slash/Hybrides afin d'améliorer la maintenabilité du code.
- Mise à jour de toutes les bibliothèques vers leur dernière version.
- Correction du fichier pm2 pour la production.

# Corrections de bugs

**Gestionnaire de commandes dans les MP**

- *Correction du gestionnaire de commandes dans les messages privés.*

**`/utils userinfo`**

- *Correction du calcul de Nitro selon la présence ou non d'une bannière.*

**Commande `+sticker`**

- *Correction d'un problème avec la commande +sticker.*

**Commande `+antiexe`**

- *Correction des permissions de la commande +antiexe.*

**Commande `+soutien`**

- *Correction de la gestion des arguments de la commande +soutien.*

**Texte du pied de page**

- *Correction du texte du pied de page pour une meilleure expérience utilisateur.*

**Vérification `tooNewAccount`**

- *Correction d'un bug de `tooNewAccount` qui ajoutait un indicateur avant de calculer la fenêtre de temps de création du compte Discord.*