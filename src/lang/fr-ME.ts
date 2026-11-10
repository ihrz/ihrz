/*
・ iHorizon Discord Bot (https://gitlab.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC-BY-NC-SA-4.0)

	・   Under the following terms:

		・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

		・ NonCommercial — You may not use the material for commercial purposes.

		・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

		・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://gitlab.com/Kisakay)

・ Copyright © 2020-2026 iHorizon
*/

import type { LanguageData } from "../../types/languageData.js";

export default {
	// Basic language file for iHorizon Discord Bot
	// fr-ME: French Mal élévé

	// Variable
	var_member: "Peuple",
	var_user: "Mec",
	var_author: "Chef",
	var_reason: "Raison",
	var_guild: "Serv",
	var_sanction: "Peine",
	var_time: "Temps",
	var_message: "Msg",
	var_no_set: "Pas là",
	var_none: "Aucun",
	var_roles: "Rôles",
	var_names: "Blazes",
	var_text_channel: "salon",
	var_voice_channel: "voc",
	var_creator: "Chef",
	var_doesnt_have_permissions:
		"Ta pas les perms gros. (Y te faut la perm {permission} gros, déso)",
	var_ihorizon: "iHorizon",
	var_developer: "Dev",
	var_chance: "Chance",
	var_other: "Autre",
	var_unknown: "Inconnu",
	var_secure: "Safe",
	var_unsecure: "Pas safe",
	var_prefix: "Préfixe",
	var_slash: "Slash",
	var_discord: "Discord",
	var_network: "Réseau",
	var_latency: "Latence",
	var_bot: "Bot",
	var_true: "Réel",
	var_false: "Mytho",
	var_enabled: "Actif",
	var_disabled: "Pas actif",
	var_yes: "Oui",
	var_no: "Non",
	var_colour: "Couleur",
	var_length: "Taille",
	var_good: "Bon",
	var_size: "Taille",
	var_level: "Niveau",
	var_add: "Ajouter",
	var_remove: "Supprimer",
	var_edit: "Modifier",
	var_confirm: "Confirmer",
	var_succes: "Succès",
	var_page: "Page",
	var_previous: "Précédent",
	var_next: "Suivant",
	var_permission: "Permission",
	var_usage: "Utilisation",
	var_aliases: "Alias",
	var_dont_have_perm:
		"Aya mec, ta pa la perm dsl. Vas becter ailleurs, te faut la perm `{perm}`.",
	var_price: "Prix",
	var_boost: "Boost",
	var_uses: "Utilisations",
	var_vc_stats: "Statistiques",
	var_1d: "1 jour",
	var_7d: "7 jours",
	var_14d: "14 jours",
	var_year: "année(s)",
	var_mo: "mois",
	var_w: "semaine(s)",
	var_d: "jour(s)",
	var_h: "heure(s)",
	var_m: "minute(s)",
	var_s: "seconde(s)",
	var_ms: "milliseconde(s)",
	var_banned_user: "Mecs ban",
	var_no_one_banned: "Personne est ban, t con ou koi",
	var_category: "Catégorie du bail",
	var_total: "Total du bail",
	var_online_members: "Membre(s) en ligne",
	var_boost_level: "Niveau de boost",
	var_features: "Fonctionnalités",
	var_guild_icon: "Icône du serveur",
	var_guild_banner: "Bannière du serveur",
	var_guild_splash: "Écran d’accueil du serveur",
	var_unknown_guild_name: "Nom de serveur inconnu",
	var_preview: "Aperçue",
	var_form: "Formulaire",
	var_original_message: "Message original",
	var_click_here: "Cliquez ici",
	var_s_message: "message de {nickname}",
	var_source: "Musique de : ",
	var_online_call: "En Vocal",
	var_online: "En ligne",
	var_stream: "En stream",
	var_boosts: "Boosts",
	var_muted: "Muet",
	var_camera: "En caméra",

	// Nom des Permissions Discord
	perm_createinstantinvite_name: "Faire une inv",
	perm_kickmembers_name: "Expulser des migrants",
	perm_banmembers_name: "Bannall le serv",
	perm_administrator_name: "Admin",
	perm_managechannels_name: "Péter les salons",
	perm_manageguild_name: "Niquer le serveur",
	perm_addreactions_name: "Ajouter des réactions",
	perm_viewauditlog_name: "Voir les logs du serveur",
	perm_priorityspeaker_name: "Voix prioritaire",
	perm_stream_name: "Diffuser",
	perm_viewchannel_name: "Voir les salons",
	perm_sendmessages_name: "Envoyer des messages",
	perm_sendttsmessages_name: "Envoyer des messages TTS",
	perm_managemessages_name: "Gérer les messages",
	perm_embedlinks_name: "Intégrer des liens",
	perm_attachfiles_name: "Joindre des fichiers",
	perm_readmessagehistory_name: "Voir l'historique des messages",
	perm_mentioneveryone_name: "Mentionner @everyone",
	perm_useexternalemojis_name: "Utiliser des émojis externes",
	perm_viewguildinsights_name: "Voir les analyses du serveur",
	perm_connect_name: "Se connecter",
	perm_speak_name: "Parler",
	perm_mutemembers_name: "Rendre muet",
	perm_deafenmembers_name: "Mettre en sourdine",
	perm_movemembers_name: "Déporter des membres",
	perm_usevad_name: "Utiliser la détection de la voix",
	perm_changenickname_name: "Changer de pseudo",
	perm_managenicknames_name: "Gérer les pseudos",
	perm_manageroles_name: "Gérer les rôles",
	perm_managewebhooks_name: "Gérer les webhooks",
	perm_manageemojisandstickers_name: "Gérer les émojis et les autocollants",
	perm_manageguildexpressions_name: "Gérer les expressions du serveur",
	perm_useapplicationcommands_name: "Utiliser les commandes d'application",
	perm_requesttospeak_name: "Demander à parler",
	perm_manageevents_name: "Gérer les event",
	perm_managethreads_name: "Gérer les trucs genre dans le salon",
	perm_createpublicthreads_name:
		"Faire des trucs genre dans le salon publics",
	perm_createprivatethreads_name:
		"Faire des trucs genre dans le salon privés",
	perm_useexternalstickers_name: "Utiliser des autocollants externes",
	perm_sendmessagesinthreads_name:
		"Envoyer des messages dans les trucs genre dans le salon",
	perm_useembeddedactivities_name: "Utiliser les trucs dans l'bot",
	perm_moderatemembers_name: "Modérer des mecs",
	perm_viewcreatormonetizationanalytics_name: "Voir les analyses de la moula",
	perm_usesoundboard_name: "Utiliser du son",
	perm_createguildexpressions_name: "Faire des expressions du serveur",
	perm_createevents_name: "Faire des event",
	perm_useexternalsounds_name: "Utiliser des sons pas du serv",
	perm_sendvoicemessages_name: "Envoyer des vocaux",
	perm_sendpolls_name: "Envoyer un truc d'opinion",
	perm_useexternalapps_name: "Utiliser des applications pas du serv",

	// Ticket commands
	// /add, /close, /delete, /sethereticket, /open, /remove, /transript, /disableticket
	ticket_disabled_command:
		"Tu peux pas utilisé cette commande désolé mec ya un bouffon d'administrateur qui l'a désactivé !",

	// /add
	add_disabled_command:
		"Tu peux pas utilisé cette commande désolé mec ya un bouffon d'administrateur qui l'a désactivé !",
	add_command_work: "le mec ${memberTag} jlai bien ajouté au ticket !",
	add_command_error: "Erreur de merde , ressaie dans 1 ans.",

	// /close
	close_disabled_command:
		"Tu peux pas utilisé cette commande désolé mec ya un bouffon d'administrateur qui l'a désactivé !",
	close_title_sourcebin: "Transcription du ticket par iHorizon la bakaa",
	close_description_sourcebin: " ",
	close_error_command: "Erreur de merde , ressaie dans 1 ans.",
	close_command_work_channel:
		"Ouais ticket fermé , jvais tenvoyer le transcript pour ta mémoire de poisson rouge.",
	close_command_work_notify_channel:
		"Ticket fermé , allez déguage de la tu seras gentil !",
	close_command_error: "Erreur de merde , ressaie dans 1 ans.",
	close_not_in_ticket:
		"Tu peux pas utilisé cte commande si t pas dans un salon de ticket.",

	// /delete
	delete_disabled_command:
		"Tu peux pas utilisé cette commande désolé mec ya un bouffon d'administrateur qui l'a désactivé !",
	delete_not_in_ticket:
		"Wsh t con tu peux pas utiliser la commande dans un autre salon qu'un salon de ticket !",
	ticket_deleted:
		"Le ticket ${ticketOwnerMention} a été supprimé par <@${deletedByUserId}>. Voici le transcript :",

	// /sethereticket
	sethereticket_panel_select_embed_desc:
		"# Nom du panneau\n```${panelName}```\n{msg}\n\n## Catégorie\n```{category}```\n",

	// /open
	open_disabled_command:
		"Tu peux pas utilisé cette commande désolé mec ya un bouffon d'administrateur qui l'a désactivé !",
	open_command_work: "Le ticket ${channel} a été réouvert avec succès.",
	open_command_error: "Une erreur est survenue, réessaye bouffon",
	open_not_in_ticket:
		"Tu ne peux pas utiliser cette commande en dehors d'un salon de ticket t'es vraiment autiste toi !",

	// /remove
	remove_disabled_command:
		"Tu peux pas utilisé cette commande désolé mec ya un bouffon d'administrateur qui l'a désactivé !",
	remove_not_in_ticket:
		"Tu ne peux pas utiliser cette commande en dehors d'un salon de ticket !",
	remove_command_error: "Une erreur est survenue, Veuille réessayer !",
	remove_command_work:
		"${memberTag} a été retiré avec succès de ton ticket !",

	// /transript
	transript_disabled_command:
		"Tu peux pas utilisé cette commande désolé mec ya un bouffon d'administrateur qui l'a désactivé !",
	transript_name_sourcebin: " ",
	transript_title_sourcebin:
		"Transcription du chat de ticket pour ${channelName}",
	transript_command_error: "Erreur de merde , ressaie dans 1 ans.",
	transript_command_work:
		"T'a fermé ton ticket. Jvais t'envoyé la transcription.",
	transript_not_in_ticket:
		"Fait la commande dans un ticket ou jte fracasse !",

	// /disableticket
	disableticket_not_admin:
		":x: | wesh t'a cru t'es le patron du serveur pour utiliser cte commande !",
	disableticket_logs_embed_title_disable:
		"Logs de désactivation des tickets au cas ou tu trappelle plus",
	disableticket_logs_embed_description_disable:
		"<@${authorId}> a désactivé lréessayees commandes de ticket il étais trooop guez !",
	disableticket_command_work_disable:
		"Ta désactivé les commandes de ticket mes couilles !",
	disableticket_logs_embed_title_enable:
		"Logs d'activation des tickets ct pourrit",
	disableticket_logs_embed_description_enable:
		"<@${authorId}> a activé les commandes de ticket il est pas con le tcho!",
	disableticket_command_work_enable:
		"GG ta activé les commandes de ticket we we ca sert a rien enfaite ??!",

	// /setticketcategory
	setticketcategory_not_admin:
		":x: | Tu dois avoir perm admin , et ouais va sucer les owners il te rankeront peut etre!",
	setticketcategory_disabled_command:
		"Tu peux pas utilisé cette commande désolé mec ya un bouffon d'administrateur qui l'a désactivé !",
	setticketcategory_not_a_category:
		"C pas une catégorie refait , sois moin con un peu nan en vrai?",
	setticketcategory_command_work:
		"<@${authorId}>, tu as défini la catégorie du salon de ticket sur `${categoryName}` !",

	// /ticket log-channel
	ticket_logchannel_embed_title: "salon de Logs des Tickets",
	ticket_logchannel_embed_desc:
		"${author}, vous avez configuré le salon des logs du module des Tickets sur ${channel} !",

	// /ticket panel
	ticket_panel_default_placeholder:
		"Sélectionnez une catégorie pour becter le ticket",
	ticket_panel_embed_title: "Panneau de Tickets #",
	ticket_panel_embed_desc:
		"Personnalisez un embed de ticket avec des options spécifiques",
	ticket_panel_saved_conf: "💾 Configuration Sauvegardée",
	ticket_panel_related_embed: "🕸️ Embed associé",
	ticket_panel_role_to_ping: "📌 Rôle à mentionner",
	ticket_panel_ping_user: "📎 Mentionner l'utilisateur",
	ticket_panel_placeholder: "🏷️ Texte de con",
	ticket_panel_category: "📤 Catégorie",
	ticket_panel_option_fields: "📔 Champs d'options",
	ticket_panel_form: "📝 Formulaire",
	ticket_panel_panel_placeholder: "Choisissez les options",
	ticket_panel_panel_1_label: "Sauvegarder la configuration actuelle",
	ticket_panel_panel_2_label: "Afficher l'aperçu",
	ticket_panel_panel_3_label: "Modifier l'embed associé actuel",
	ticket_panel_panel_4_label: "Ajouter/retirer un rôle à mentionner",
	ticket_panel_panel_5_label: "Modifier le texte indicatif",
	ticket_panel_panel_6_label: "Modifier la catégorie",
	ticket_panel_panel_7_label: "Modifier la mention utilisateur",
	ticket_panel_panel_8_label: "Ajouter/Retirer des champs d'options",
	ticket_panel_panel_9_label: "Modifier le formulaire",
	ticket_panel_button_send: "Envoyer l'embed",
	ticket_panel_change_category_channelSelect_placeholder:
		"Sélectionnez une catégorie",
	ticket_panel_select_channel_to_send:
		"Sélectionnez un salon pour envoyer l'embed",
	ticket_panel_change_placeholder_modal_title: "Modifier le texte indicatif",
	ticket_panel_change_placeholder_modal_placeholder:
		"Nouveau texte indicatif",
	ticket_panel_need_save_config:
		"Vous devez sauvegarder la configuration actuelle avant d'envoyer l'embed",
	ticket_panel_need_1_option:
		"Vous avez besoin d'au moins une option pour envoyer l'embed",
	ticket_panel_related_embed_dont_exist: "L'embed associé n'existe pas",
	ticket_panel_channel_error:
		"fréro ton salon il est satanique, j'ai pas accès",
	ticket_panel_embed_been_send: "L'embed a été envoyé dans le salon",
	ticket_panel_successfully_saved:
		"La configuration a été sauvegardée avec succès",
	ticket_panel_change_role_roleSelect_placeholder: "Sélectionnez un rôle",
	ticket_panel_change_role_interaction_content:
		"Sélectionnez un rôle qui sera mentionné à l'ouverture d'un ticket",
	ticket_panel_change_embed_modal_title: "Modifier l'Embed Associé",
	ticket_panel_change_embed_modal_placeholder: "ID de l'Embed",
	ticket_panel_change_embed_dont_exist: "L'embed n'existe pas",
	ticket_panel_change_option_select_placeholder: "Sélectionnez une option",
	ticket_panel_change_option_select_1_label:
		"Ajouter un nouveau champ de côton",
	ticket_panel_change_option_select_2_label: "Retirer un champ de côton",
	ticket_panel_change_option_interaction_content:
		"Sélectionnez une option pour ajouter ou retirer des champs d'options",
	ticket_panel_add_option_max_10:
		"Vous ne pouvez pas ajouter plus de 10 champs d'options",
	ticket_panel_add_option_modal_title: "Ajouter un champ d'option",
	ticket_panel_add_option_modal_field1_label: "Nom",
	ticket_panel_add_option_modal_field2_label: "Description",
	ticket_panel_add_option_modal_field3_label: "Emoji",
	ticket_panel_remove_option_empty:
		"Il n'y a pas de champs d'options à retirer",
	ticket_panel_remove_option_select_placeholder:
		"Choisissez une option à retirer",
	ticket_panel_rempve_option_interaction_content:
		"Sélectionnez une option à retirer",
	ticket_panel_change_form_select_placeholder_1:
		"Ajouter un champ de formulaire",
	ticket_panel_change_form_select_placeholder_2:
		"Retirer un champ de formulaire",
	ticket_panel_change_form_interaction_content:
		"Sélectionnez une option pour ajouter ou retirer des champs de formulaire",
	ticket_panel_add_form_max_3:
		"Ola femme! Stop toi là mdrr. 3 questions c'est déjà beaucoup. Dégage de là sale 92i",
	ticket_panel_add_form_modal_title: "Ajouter un champ de formulaire",
	ticket_panel_add_form_modal_field1_label: "Titre de la Question",
	ticket_panel_add_form_modal_field2_label: "Texte indicatif de la Question",
	ticket_panel_preview_message: "Aperçu du panneau de tickets",
	ticket_panel_option_change_category:
		"Sélectionnez une option pour changer de catégorie",
	ticket_panel_panel_10_label:
		"Changer la catégorie pour une option spécifique",
	ticket_panel_channel_panel_embed_id: "ID d'intégration du canal de tickets",
	ticket_panel_panel_11_label:
		"Modifier le panneau d'intégration du canal de tickets",
	ticket_panel_select_user: "Menu ajouter des membres dans le ticket",
	ticket_panel_button_delete: "Bouton pour supprimer le ticket",
	ticket_panel_button_transcript: "Bouton pour créer une transcription",
	ticket_panel_panel_12_label:
		"Afficher le menu ajout/supression de membre dans un ticket",
	ticket_panel_panel_13_label: "Afficher le bouton supprimer un ticket",
	ticket_panel_panel_14_label: "Afficher le bouton transcript",
	ticket_panel_tip_about_variable1:
		"${emoji_VC_OpenChat} **Le saviez-vous ?** Quand vous utilisez `/utils embed` pour générer un embed, vous pouvez y introduire la variable **`{category}`**, qui sera remplacée par la catégorie choisie par l'utilisateur.",
	ticket_panel_no_question_to_delete: "Aucune question à supprimer.",
	ticket_panel_chose_a_question: "Choisissez une question",
	ticket_panel_select_question_to_delete:
		"Sélectionnez une question à supprimer.",
	ticket_panel_panel_15_label: "Configurer un embed par option",
	ticket_panel_panel_16_label: "Configurer un formulaire par option",
	ticket_panel_panel_17_label:
		"Configurer les rôles à mentionner pour chaque option",
	ticket_panel_mode: "⚙️ Mode",
	ticket_panel_mode_simple: "Simple",
	ticket_panel_mode_advanced: "Avancé",
	ticket_panel_mode_simple_desc:
		"Un bouton ouvre un ticket, sans choix ni question.",
	ticket_panel_mode_advanced_desc:
		"Un menu avec des options, des réglages par option et des formulaires.",
	ticket_panel_panel_18_label: "Changer de mode (simple / avancé)",
	ticket_panel_simple_default_title: "Support",
	ticket_panel_simple_default_desc:
		"Besoin d'aide ? Clique sur le bouton ci-dessous pour ouvrir un ticket.",
	ticket_panel_manage_form_title:
		"Gérer le formulaire pour l'option : **${optionName}**",
	ticket_panel_change_embed_options:
		"Sélectionnez une option pour modifier l’ID d’intégration du panneau de canal.",
	ticket_panel_change_embed_options_null:
		"There is no option(s) to edit the channel panel embed id.",
	ticket_panel_change_embed_options_chose:
		"Chose the category to edit the channel panel id.",
	ticket_panel_add_a_question: "Ajouter une question",
	ticket_panel_remove_a_question: "Supprimer une question",
	ticket_panel_option_invalid: "❌ Option invalide.",
	ticket_panel_chose_option_to_form:
		"Sélectionnez une option pour configurer son formulaire.",
	var_chose_option: "Choisissez une option",
	ticket_panel_saved_and_sended_panel:
		"Le panel de ticket #${panelCode} est bien envoyer dans ${channel}. Veuillez garder le code quelque part, au cas où vous devez modifier le panel.",
	var_title: "Titre",
	var_action: "Action",

	// /ticket rename
	ticket_rename_ok: "Le salon du ticket a été renommé !",
	ticket_rename_error:
		"Alors j'sais pas ce que j'ai consommer mais frr elle est bonne hyn. j'me suis endormis sur le keyboard jcrois. Ya un monde où ton salon c'est dla merde",

	// /ticket unlink
	ticket_unlink_command_ok:
		"${emoji_Yes} | **Le salon est maintenant dissocié du module de tickets.**",
	ticket_unlink_panel_edited_content:
		"Ce salon était un ancien ticket. L’utilisateur {user} a dissocié ce salon.",

	// /ticket remind
	ticket_remind_embed_title: "Oh-oh! Rappel Ticket",
	ticket_remind_embed_desc:
		"Tu n'ai pas très actif, ce n'est pas grave, mais ton ticket est toujours en traitement ! Viens donc y répondre!",
	ticket_remind_embed_fields_1_name: "Dernière réponse",
	ticket_remind_command_ok:
		"J'ai envoyer à l'utilisateur le message de rappel.",
	var_never: "Jamais",

	// Ranks commandsa
	// /xp, /setxpchannels, /disablexp

	// /disablexp
	disablexp_not_admin:
		":x: | T'as pas les droits pour cette commande, mec ! Les admins seulement.",
	disablexp_logs_embed_title_disable: "Logs de désactivation XP",
	disablexp_logs_embed_description_disable:
		"<@${authorId}> a désactivé XP, quel génie !",
	disablexp_command_work_disable:
		"T'as réussi à éteindre ce foutu message de niveau (XP).",
	disablexp_logs_embed_title_enable: "Logs d'activation XP",
	disablexp_logs_embed_description_enable:
		"<@${authorId}> a rallumé XP, bien joué !",
	disablexp_command_work_enable:
		"T'as réussi à allumer le message de niveau (XP).",
	disablexp_command_work_disable_entierly:
		"T'as bien désactivé le bordel des niveaux ! (Fini les messages et les membres ne gagnent plus de niveaux)",

	// /setxpchannels
	setxpchannels_not_admin:
		":x: | C'est réservé aux admins, mec ! Si tu veux faire ça faut passer sous le bureau du fonda",
	setxpchannels_logs_embed_title_disable: "Logs SetXpChannels",
	setxpchannels_logs_embed_description_disable:
		"<@${authorId}> a désactivé les canaux d'XP personnalisés. Tout redevient comme avant...",
	setxpchannels_already_disabled_disable:
		"Les canaux d'XP personnalisés sont déjà foutus, mec !",
	setxpchannels_command_work_disable:
		"T'as désactivé ces putains de canaux d'XP personnalisés avec succès !",
	setxpchannels_command_error_disable:
		"Erreur : soit t'as pas les droits, soit le salon existe pas sois tu te le fou la ou jpense.",
	setxpchannels_logs_embed_title_enable: "Logs SetXpChannels",
	setxpchannels_logs_embed_description_enable:
		"<@${authorId}> a configuré les canaux d'XP personnalisés à : <#${argsid}>",
	setxpchannels_valid_channel_message:
		"Choisis un putain de salon valide pour tes réglages, mec !",
	setxpchannels_already_with_this_config:
		"Les canaux d'XP personnalisés sont déjà configurés avec cet identifiant de salon, mec !",
	setxpchannels_confirmation_message:
		"**Canaux d'XP personnalisés définis ici !**",
	setxpchannels_command_work_enable:
		"T'as configuré ces foutus canaux d'XP personnalisés sur <#${argsid}> avec succès !",
	setxpchannels_command_error_enable:
		"Erreur : soit t'as pas les droits, soit le channel existe pas fdp.",

	// /level
	level_embed_title: "__**XP Niveau**__: `${userUsername}`",
	level_embed_fields1_name: ":arrow_up:・__Niveau :",
	level_embed_fields1_value: "`${currentxp}/${xpNeeded}`",
	level_embed_fields2_name: ":money_with_wings:・__Expérience :",
	level_embed_fields2_value: "`${level}`",
	level_embed_description:
		"`${expNeededForLevelUp}` points d'expérience nécessaires pour passer au niveau suivant !",
	level_xp_needed_for_new_level: "XP jusqu'au prochain niveau :",
	level_xp_total: "XP total :",

	// /ranks leaderboard
	ranks_leaderboard_top_txt: "Top #${i}",
	ranks_leaderboard_top_txt_raw: "Top #${i} ${rawText}\n",
	ranks_leaderboard_txt_text:
		"👤 ${user} `(${userGlobalName})`\n⭐ ➥ **Niveau**: `${level}`\n🔱 ➥ **XP Total**: `${xpTotal}`",
	ranks_leaderboard_embed_title:
		"🏆 Classement des mecs qui prennent pas de douche",
	ranks_leaderboard_embed_footer:
		"Page ${cPage} sur ${totalPages} • Classé par XP Total",

	// /ranks ignore-channels
	ranks_ignorechannels_embed_title: "Configurations du Module de Rangs",
	ranks_ignorechannels_embed_desc:
		"Lorsque de nouveaux messages sont envoyés dans l'un de ces canaux, le module de rangs les ignore. Un peu comme quand ma femme m'explique sa journée.",

	// /ranks set-message
	ranksSetMessage_not_admin:
		":x: | Vous devez être administrateur de ce serveur pour demander cette commande!",
	ranksSetMessage_help_embed_title: "/ranks set-message Aide!",
	ranksSetMessage_help_embed_description: "/ranks set-message",
	ranksSetMessage_help_embed_fields_name: "Comment utiliser?",
	ranksSetMessage_logs_embed_title_on_enable: "Logs de RanksSetMessage",
	ranksSetMessage_logs_embed_description_on_enable:
		"<@${authorId}> a configuré le message des rangs!",
	ranksSetMessage_command_work_on_enable:
		"${emoji_GreenTick} | Message des rangs configuré avec succès.",
	ranksSetMessage_logs_embed_title_on_disable: "Logs de RanksSetMessage",
	ranksSetMessage_logs_embed_description_on_disable:
		"<@${authorId}> a supprimé le message des rangs!",
	ranksSetMessage_command_work_on_disable:
		"${emoji_Yes} | Message des rangs personnalisé supprimé avec succès.",
	ranksSetMessage_command_work_ls: "Le message des rangs est:",
	ranksSetMessage_help_embed_fields_custom_name: "Message personnalisé",
	ranksSetMessage_help_embed_fields_custom_name_empy: "Non défini!",
	ranksSetMessage_help_embed_fields_default_name_empy: "Message par défaut",
	ranksSetMessage_help_embed_desc:
		"{memberUsername} => Le nom d'utilisateur du membre\n{memberMention} => Mentionner le membre\n{memberCount} => Nombre de membres de la guilde\n{guildName} => Le nom de la guilde\n{createdAt} => Création du compte en jj/mm/aaaa\n{xpLevel} => Le niveau XP de l'utilisateur\n{accountCreationTimestamp} => Le timestamp de la date de création du compte",
	ranksSetMessage_button_set_name: "Définir le message",
	ranksSetMessage_buttom_del_name: "Message par défaut",
	ranksSetMessage_awaiting_response:
		"Écrivez le nouveau message des rangs personnalisé.",
	ranksSetMessage_embed_fields_xpmessage: "Message des rangs",

	// /ranks ranks-ureset
	reset_uranks_are_you_sure:
		"**att t vraiment chaud pour supprimer toutes les données de rang?\nC'est permanent mon frrr.**\n**Cette action est destructive!!**",
	reset_uranks_logs_embed_title:
		"Logs du module de rangs (ACTION DANGEREUSE)",
	reset_uranks_logs_embed_desc:
		"${author} a supprimé toutes les données du module de rangs pour ${user}!",

	// /ranks config
	ranks_config_embed_title: "🏆 Configuration des Rôles par Rang",
	ranks_config_embed_desc:
		"Personnalisez les récompenses de rôles basées sur l'XP de votre serveur !",
	ranks_config_autofields_name: "🌟 Niveau ${level}",
	ranks_config_autofields_value:
		"Rôle : <@&${roleId}>\n🔓 Débloqué au niveau ${level}",
	ranks_config_nofields_name: "🚫 Aucun rôle configuré",
	ranks_config_nofields_value:
		"Configurez des rôles de rang pour récompenser les membres actifs !",
	ranks_config_help_footer:
		"Page ${currentPage} sur ${totalPage} • Total des rangs : ${totalRanks}",
	ranks_config_btn_add_name: "Ajouter un Rôle",
	ranks_config_btn_remove_name: "Supprimer un Rôle",
	ranks_config_add_max_roles:
		"Vous avez atteint le nombre maximum de rôles par rang (25).",
	ranks_config_add_role_menu_placeholder: "Sélectionnez un rôle",
	ranks_config_awaiting1_response:
		"Sélectionnez le rôle que vous souhaitez attribuer à un niveau spécifique.",
	ranks_config_add_modal_title: "Définir un Niveau pour le Rôle",
	ranks_config_add_modal_fields1_placeholder: "Exigence de niveau",
	ranks_config_add_invalid_level:
		"Niveau invalide ! Veuille entrer un nombre positif.",
	ranks_config_add_invalid_role:
		"Le rôle {role} existe déjà. Un rôle ne peut être attribué qu'à un seul niveau.",
	ranks_config_add_command_work:
		"Rôle ${selectedRole} ajouté pour le niveau ${level} !",
	ranks_config_add_command_warn:
		"# AVERTISSEMENT ⚠️ Le rôle ${selectedRole} possède les permissions sensibles suivantes :\n\n${_}",
	ranks_config_remove_no_rank: "Aucun rôle de rang configuré à supprimer.",
	ranks_config_var_level: "Niveau {level}",
	ranks_config_remove_string_menu_desc:
		"Supprimer le rôle au niveau ${level}",
	ranks_config_remove_string_menu1_placeholder:
		"Sélectionnez un rôle à supprimer",
	ranks_config_remove_awaiting_response:
		"Sélectionnez le rôle que vous souhaitez supprimer.",
	ranks_config_remove_command_work:
		"Le rôle pour le niveau ${levelToRemove} a été supprimé !",

	// Owner commands
	// /owner, /unowner, /blacklist, /unblacklist

	// /owner
	owner_not_owner:
		"T'es pas le boss du projet iHorizon. Cette commande est pour les vrais boss seulement.",
	owner_already_owner:
		"PTN TES CON IL EST DEJA OWNER WSH VA DEHORS, VA PRENDRE UNE PTN DE DOUCHE!",
	owner_is_now_owner: "Tu vois ${memberUsername} fait gaf c un owner..",

	// /unowner
	unowner_not_owner:
		"T'es pas le patron du projet iHorizon. Cette commande ne marche pas pour toi.",
	unowner_cant_unowner_creator:
		"Impossible de dégager de fdp, c'est un owner iHorizon",
	unowner_command_work: "${memberUsername} n'est plus aux commandes.",

	// /blacklist
	blacklist_not_owner:
		"T'es pas le patron du projet iHorizon. Cette commande ne marche pas pour toi.",
	blacklist_bot_lol:
		"Je peux pas me blacklist moi meme trou dballe , réssaie t bl",
	blacklist_cant_blacklist_owner:
		"Y a que les développeurs d'iHorizon qui peuvent blacklister un proprio du bot.",
	blacklist_command_work:
		"${memberUsername} est maintenant blacklisté allez degage de la on veut pas de toi",
	blacklist_blacklisted_but_can_ban_him:
		"${emoji_No} est maintenant bl , mais jpeu pas lban dici, wallah jcrois jai pas la perm ?",
	blacklist_already_blacklisted:
		"${memberUsername} est déjà blacklist trdc !",
	blacklist_no_one_blacklist:
		"${emoji_No} Aucun utilisateur trouvé dans la liste noire !",
	blacklist_var_no_reason: "Aucune raison trouvée",
	blacklist_embed_title: "Liste Noire - Page ${page}",
	blacklist_command_work_shard:
		"✅ ${username} banni sur **${totalSuccess}** serveur(s) à travers tous les shards (`{score}`)",

	// /unblacklist
	unblacklist_not_owner:
		"T'es pas le boss du projet iHorizon. Cette commande est pour les vrais boss seulement.",
	unblacklist_command_work: "<@${memberId}> n'est plus sur la liste noire",
	unblacklist_not_blacklisted:
		"<@${memberId}> n'était pas sur la liste noire",
	unblacklist_unblacklisted_but_can_unban_him:
		"${emoji_No} A été retiré de la liste noire, impossible de débannir ce membre ici, permission manquante ou déjà débanni ?",
	unblacklist_user_is_not_exist:
		"Je n'ai pas pu trouver l'utilisateur , surement a cause de son QI négatif",
	unblacklist_command_work_across_all_shard:
		"✅ ${bannedMemberUsername} a été débanni sur **${totalSuccess}** serveur(s) à travers tous les shards (`${score}`)",

	// Invite Manager commands
	// /addinvites, /invites, /leaderboard, /removeinvites

	// /addinvites
	addinvites_confirmation_embed_description:
		"Allez jajoute ${amount} invs a ${user} jadore triché fdp",
	addinvites_logs_embed_title: "Logs Gestionnaire d'invs",
	addinvites_logs_embed_description:
		"<@${authorId}> a ajouté ${amount} invs à <@${userId}> !",

	// /invites

	// /leaderboard

	// /removeinvites
	removeinvites_not_admin_embed_description:
		"tu dois etre admin pour faire la commande roh truc de fou de pas comprendre !!!!!",
	removeinvites_confirmation_embed_description:
		"Supprimer ${amount} invs pour ${user} car on taime pas bouhh tes moche",
	removeinvites_logs_embed_title: "Logs du gestionnaire d'invs",
	removeinvites_logs_embed_description:
		"<@${authorId}> a supprimé ${amount} invs à <@${userId}> !",

	// /invites reset-all
	resetallinvites_warning_msg:
		"**Êtes-vous vraiment sûr de vouloir supprimer toutes les données de l'InviteManager?\nCette action est permanente et vous ne pourrez pas revenir en arrière.**\n**Cette action est destructive!!**",
	resetallinvites_yes_button: "Tout supprimer",
	resetallinvites_no_button: "Annuler l'action",
	resetallinvites_succes_on_delete: "Supprimé avec succès!",
	resetallinvites_logs_embed_title:
		"Logs du Gestionnaire d'invs (ACTION DANGEREUSE)",
	resetallinvites_logs_embed_desc:
		"${author} a supprimé toutes les données du Gestionnaire d'invs!",

	// Bot commands
	// /botinfo, /invite, /kisakay, /ping, /status

	// /links
	links_message: "Clique sur ces putains de liens !",
	links_website: "Mon Putain De Site Web",
	links_gitlab: "Mon GitLab sale skidder",

	// /botinfo
	botinfo_embed_fields_myname: "Mon nom ca la vie dma mere :",
	botinfo_embed_fields_mychannels:
		"Mes chaînes sont ici sur la kalash dmon pere et dma mere:",
	botinfo_embed_fields_myservers: "Mes serveurs car on est populaire ici :",
	botinfo_embed_fields_members: "Membres (bcp jespere sinon jme suicide):",
	botinfo_embed_fields_libraires: "Librairies (les truc chiant de ts):",
	botinfo_embed_fields_created_at: "Créé le :",
	botinfo_embed_fields_created_by: "Créé par (les meilleurs dev):",

	// /invite
	invite_embed_title: "Merci d'avoir ajouté iHorizon !",
	invite_embed_description:
		"Je t'aime (no-homo), montre-moi ton amour en retour (et pas ta chatte) ! Invite-moi ! Si tu es un skidder, tu peux aussi me rejoindre sur mon serveur privé !",

	// /kisakay
	kisakay_message:
		"${emoji_Sparkles} Wsh c ma owner, elle est blg et a un vrai beau cul, elle m'a construit mais moi je veux la détruire 🤤🤤🤤\nLa vie, si jlui fait un BOULOOOT jdirais pas nan",

	// /andru
	andru_message:
		'Andru est un collaborateur et développeur. "L\'homme à tout faire", il gère le marketing, la communauté...',

	// /ether
	ether_message:
		"${emoji_Sparkles} mmh ether...comment le décrire ce mec... ct lui la doc d'ihorizon, le script d'install, et c lui qui gérait les trads pour quelles soient (presque) parfaites...c un mec bien ether, il s'est barré le <t:1785567600:f>",

	// /Irisweb
	irisweb_message:
		"😼Iris c ma seconde dev , jladore surtout sa chatte la miam , elle ma crée en version comme ca et pour ca je me soumet a elle❤️",

	// /ping
	pong_message: "【:ballot_box_with_check:】__**Pong**__ : ",

	// /status
	status_be_bot_dev:
		":x: | **Dégage de la sale ringuard , seuls les bg de dev du bot peuvent faire ça !**",

	// /help
	help_tip_embed:
		"```${botName} ・ Menu d'aide pour trou du cul```\n${emoji_Pin} ・ **${categorieCount}** catégories de commandes disponibles (eh ouais ma gueule)\n${emoji_Slash_Bot_Badge} ・ **${slashCount}** commandes Slash disponibles\n${emoji_Crown} ・ **Créé par** <@${owner1}>, <@${owner2}> des e-girl de compet\n\n```Le saviez-vous ? ・ Conseils```\n${emoji_VC_Region} ・ ${botName} est **100% multilingue**\n${emoji_Slash_Bot_Badge} ・ `/setlangue language:Japanese`",
	help_mod_fields: "Modération",
	help_ranks_fields: "Rangs",
	help_fun_fields: "Fun",
	help_utils_fields: "Utilitaires",
	help_giveaway_fields: "Tirages au sort",
	help_bot_fields: "Bot",
	help_music_fields: "Musique",
	help_backup_fields: "Sauvegarde",
	help_guildconf_fields: "Configuration du serveur",
	help_prof_fields: "Personnalisation de profil",
	help_economy_fields: "Économie",
	help_owner_fields: "Propriétaire",
	help_roler_fields: "Réactions de rôles",
	help_invitem_fields: "Gestionnaire d'invs",
	help_ticket_fields: "Ticket",
	help_memberc_fields: "Nombre de membres",
	help_newftrs_fields: "Nouvelle fonctionnalité",
	help_mod_dsc:
		"> *Finit le stress et la depression ihorizon va ban tous les psg de ton pays , c'est Marseille bébé*",
	help_ranks_dsc:
		"> *Regarde ton experience et tes ranks , pour voir si t plus fort que ton pote !!!*",
	help_fun_dsc:
		"> *Tu trouvez Discord ennuyeux ? Très bien, cette catégorie est faite pour tu ! iHorizon saura tu redonner le sourire !*",
	help_utils_dsc:
		"> *Tu as besoin de commandes spécifiques ? Utiles dans certains cas ? Très bien ! Les voici !*",
	help_giveaway_dsc:
		"*Tu sentez généreux/généreuse ? Tu voulais offrir quelque chose à ton communauté ? Voici mes commandes pour tu aider !*",
	help_bot_dsc:
		"> *Tu est curieux/curieuse et tu voulais en savoir plus à propos de moi ? Ces commandes sont là pour ça !*",
	help_music_dsc: "> *Tu est plutôt musique ? Tenez, cadeau :)*",
	help_backup_dsc:
		"> *Tu voulais une sauvegarde rapide de ton serveur ? Me voici !*",
	help_guildconf_dsc:
		"> *Tu voulais une configuration avancée et facile à mettre en place ? Me voilà :)*",
	help_prof_dsc:
		"> *Tu est du genre à prendre soin de ton apparence ? Voici des commandes pour tu garantir un profil magnifique auprès des utilisateurs :)*",
	help_economy_dsc:
		"> *Tu faites attention à ton porte-monnaie ? Ou souhaite-tu simplement faire des achats ? Je suis là :)*",
	help_owner_dsc:
		"> *Cette catégorie est réservée aux propriétaires et aux administrateurs du projet d'iHorizon !*",
	help_roler_dsc:
		"> *Tu voulais configurer un rôle de réaction pour ton serveur ? Me voilà !!*",
	help_invitem_dsc:
		"> *Tu voulais consulter les invs d'un membre ? Bah c'est ici battard*",
	help_ticket_dsc:
		"> *Tu souhaitez créer un ticket ou utiliser l'une de mes fonctions à l'intérieur ? Ouais bah on peut*",
	help_memberc_dsc:
		"> *Tu voulais configurer des salons vocaux pour le comptage des membres ? Bien sûr :smile:*",
	help_newftrs_dsc:
		"> *Voici de nouvelles fonctionnalités très intéressantes donc utilise la sous peine de mourrir !*",
	help_not_for_you: "Cette interaction tconcerne pas , pars salope",
	help_protection_fields: "Protection",
	help_protection_dsc:
		"> *Degager les mecs noon autorisé qui tente de raid. ( Qui raid sérieux on est plus en 2018 )*",
	help_suggestion_fields: "Suggestion",
	help_suggestion_dsc:
		"> *Laisse tes membres s'exprimer avant que ton serv devient la dictature (c pas la corée du nord ici, enfin j'espère..)*",
	help_security_fields: "Sécurité",
	help_security_dsc:
		"> *Administrez des tests de captcha à tes nouveaux membres pour sécuriser l'accès à ton serveur.*",
	help_schedule_fields: "Planning",
	help_schedule_dsc:
		"> *Crée des messages pré-programmés , pour les flemmards en gros*",
	help_pfps_fields: "PFPS",
	help_pfps_dsc:
		"> *Envoi d'un avatar utilisateur tout moche aléatoire dans un salon de merde !*",
	help_voicedashboard_fields: "VoiceDashboard",
	help_voicedashboard_dsc:
		"> *Créez un voc temporaire personnalisé avec une interface !*",
	help_select_menu: "Faites une sélection !",
	help_select_menu_fields_desc: "${commandCount} Commandes",
	help_back_to_menu: "Menu principal",
	help_back_to_menu_desc: "Retour au menu initial",
	help_confession_dsc:
		"> *Tu as une confession à faire ? Très bien, aussi sordide soit-elle, iHorizon est là pour toi !*",
	help_confession_fields: "Confession",
	help_antispam_dsc:
		"> *Fatigué du spam ? Super ! iHorizon est là pour modérer le spam.*",
	help_antispam_fields: "AntiSpam",
	help_stats_fields: "Statistiques de l'utilisateur",
	help_stats_dsc:
		"> *Voir le nombre de messages et l'activité vocale d'un utilisateur dans une guilde*",
	help_notifier_dsc:
		"> *Soyez notifié lorsque un Youtuber ou Streamer publie une vidéo !*",
	help_notifier_fields: "Notificateur",
	help_authrestore_fields: "AuthRestore",
	help_authrestore_dsc:
		"> *Vérification du serveur avec oAuth2. En cas de raid ou de suppression de votre serveur, vous pouvez récupérer vos anciens membres avec oAuth2!*",
	help_tags_fields: "Tags personnalisés",
	help_tags_dsc:
		"> *Créez des messages de tags pour votre serveur et utilisez-les dans votre serveur !*",
	help_starboard_dsc:
		"> *Voir les messages les plus étoilés d’un serveur Discord.*",
	help_starboard_fields: "StarBoard",
	help_blogger_dsc:
		"Suis tes flux RSS favoris et sois notifié lorsqu’un nouvel article est publié via iHorizon",
	help_blogger_fields: "Blogger",
	help_lastfm_dsc:
		"> *Connecte ton compte Last.fm et scrobble automatiquement les sons joués par iHorizon tant que tu restes dans le vocal.*",
	help_lastfm_fields: "Scrobbler LastFM",
	help_honeypot_fields: "Honeypot",
	help_honeypot_dsc:
		"> *Configure un salon piège pour choper les comptes compromis et nettoyer automatiquement le spam récent sur ton serveur.*",

	// /h
	h_suite: "(Suite)",
	h_suite_desc: "*Suite des commandes de la catégorie*",
	helpall_no_perms_defined:
		"Y'a aucune perm custom de définie sur ce serveur, `helpall` sert à rien ici — utilise `${botPrefix}h` à la place.",
	helpall_no_access: "T'as accès à aucune commande à perm sur ce serveur.",

	// /say
	say_footer_msg: "\n\nEnvoyé depuis `/say` par ${author}",

	// /ping
	ping_down_msg: "**INDISPONIBLE* miskina on sfé ddos jpp*",
	ping_embed_desc:
		"# Pong ! Statistiques du réseau de ${botName} :\n\n**[Ping du site web Discord]** >> `${_net03}` ms.\n**[Ping Cloudflare]** >> `${_net02}` ms.\n**[Ping Google]** >> `${_net01}` ms.\n\n${emoji_Crown} **[Ping du site web iHorizon]** >> `${_net04}` ms.\n${emoji_Crown} **[Ping du Websocket]** `${ping}` ms.\n\n## ${emoji_Pointer} **[Moyenne]** >> (moy)`${averagePing}` ms.",

	// /custom
	custom_avatar_reset:
		"Vous avez décider de réinitialiser la photo de profil du bot sur le serveur. Les pied de page des embeds reviendront à ce qu'il était par défaut, ainsi que la photo de profil du bot sur le serveur.",
	custom_avatar_set:
		"${emoji_Yes} **Vous avez décider de changer la photo de profil du bot sur le serveur. Les pied de page des embeds sont maintenant modifier, ainsi que la photo de profil du bot sur le serveur.**\n${emoji_Crown} Nouvelle valeur: `${x}`",
	custom_name_reset:
		"Vous avez décider de réinitialiser le nom du bot sur le serveur. Les pied de page des embeds reviendront à ce qu'il était par défaut, ainsi que le nom du bot sur le serveur.",
	custom_name_set:
		"${emoji_Yes} **Vous avez décider de changer le nom du bot sur le serveur. Les pied de page des embeds sont maintenant modifier, ainsi que le nom du bot sur le serveur.**\n${emoji_Crown} Nouvelle valeur: `${name}`",
	custom_desc_reset:
		"Vous avez décider de réinitialiser le nom du bot sur le serveur. Les pied de page des embeds reviendront à ce qu'il était par défaut, ainsi que le nom du bot sur le serveur.",
	custom_desc_set:
		"${emoji_Yes} **Vous avez décider de changer le nom du bot sur le serveur. Les pied de page des embeds sont maintenant modifier, ainsi que le nom du bot sur le serveur.**\n${emoji_Crown} Nouvelle valeur: `${desc}`",
	custom_banner_reset:
		"Vous avez décider de réinitialiser la bannière du bot sur le serveur.",
	custom_banner_set:
		"${emoji_Yes} **Vous avez décider de changer la bannière du bot sur le serveur.**\n${emoji_Crown} Nouvelle valeur: `${x}`",
	custom_sdk_only:
		"Cette commande est disponible en production uniquement pour les serveurs ayant l'abonnement `Custom iHorizon Profile`.",
	custom_sdk_only_title: "Soutenir iHorizon avec Custom iHorizon Profile",
	custom_sdk_only_description:
		"Notre bot est gratuit et open source depuis 2022. Nous avons besoin de revenus pour continuer à animer, développer et héberger le bot. Nos coûts de fonctionnement tournent autour de 500 € par an pour les serveurs, boosts, domaines et licences.\n\nLa commande `/custom` permet de changer l'identité d'iHorizon sur votre serveur en modifiant l'avatar, le nom, la bannière et la bio. En l'utilisant, l'identité visuelle d'iHorizon disparaît de votre serveur.\n\nNous avons donc mis en place un abonnement intégré à Discord à 2.99 USD par mois.\n\nEn prenant cet abonnement, vous pourrez utiliser cette commande. Voyez cela comme un bot custom, un OWN-IHRZ like, mais stable, propre et fonctionnel.",

	// Fun commands
	// /caracteres, /cats, /hack, /hug, /kiss, /morse, /poll, /question, /slap

	// Fun Var
	fun_var_down_api:
		"Erreur : L'API est hors service ! Ptn ya pas que mon carisme qui est down",
	fun_var_good_sentence: "Veuille envoyer une bonne phrase !",

	// /cats

	// /duck

	// /panda

	// /fox

	// /dolphin

	// /frog

	// /squirrel

	// /hack
	hack_embed_description:
		"<@${victimId}> a été piraté par <@${authorId}> sale merde t hack!",

	// /hug

	// /kiss

	// /poll
	poll_not_admin: "Ta pas les perms pour faire ca bouffon !",

	// /question
	question_not_full: "Entrez une question complète avec 3 mots ou plus!",
	question_s: [
		"Oui.",
		"Non.",
		"wAllah j'en sais rien",
		"Je ne suis pas sûr(e) !",
		"Tu es fou/folle!",
		"Non merci jsuis pas gay.",
		"Non.",
		"Oui.",
		"sah je men tape de ta question",
		"aupire nique ta mère nan?",
		"Tu veux pas j'tencule aupire?"
	],
	question_fields_input_embed: ":question: **Question**",
	question_fields_output_embed: ":grey_exclamation: **Réponse:**",
	question_embed_title: "`Question: ${authorUsername}`",

	// /slap

	// /dogs
	dogs_embed_command_error:
		"Jai pas recup limage de chien , ptet parce que c'est toi ?",

	// /love
	love_embed_description:
		"**${user1Username}** + **${user2Username}** = __${randomNumber}%__ d'amour 💗",
	love_command_error:
		"Ya eu une erreur lors dla création dlimage, ressaie plus tard ou debrouille toi!",

	// /fun disable
	fun_disable_command_msg:
		"${author}, tu as ${action_type} la catégorie fun!",
	fun_category_disable:
		"Tu ne peux pas utiliser cette commande, la catégorie des commandes fun est désactivée.",

	// /fun gay

	// /fun stench

	// /fun rate

	// /fun caracteres
	fun_caracteres_command_ok: "Veuillez fournir un texte à transformer !",
	fun_caracteres_embed_desc:
		"Texte original : **${inputText}**\n\nChoisissez un style dans le menu déroulant ci-dessous pour transformer votre texte.",
	fun_caracteres_select_menu_placeholder: "Choisissez un style de police...",

	// /fun random dice

	// /fun random heads-tails
	fun_coinflip_result_heads: "Pile",
	fun_coinflip_result_tails: "Face",

	// /fun random number

	// +transgender

	// Economy commands
	// /addmoney, /balance, /daily, /monthly, /pay, /removemoney, /rob, /weekly, /work

	economy_cooldown_error:
		"Attendez **${time}** avant de pouvoir exécuter cette commande à nouveau !",

	// /addmoney
	addmoney_not_admin:
		"Dsl mgl c la rue la vrai ici , donc faut perm admin pour faire ça.",
	addmoney_logs_embed_title: "Logs Économie",
	addmoney_logs_embed_description:
		"<@${authorId}> a ajouté ${amountValue} coin à <@${userId}> !",
	addmoney_command_work:
		"Ajout de `${amountValue}`$ à <@${userId}> effectué avec succès",

	// /balance
	balance_dont_have_wallet: "👛 Ta pas de porte feuille t pauvre... !",
	balance_he_dont_have_wallet:
		"${emoji_Wallet} ${user} n'a pas de portefeuille dsl il est sdf... !",
	balance_have_wallet: "👛 Vous avez ${bal} coin(s) !",
	balance_he_have_wallet: "${emoji_Wallet} ${user} a ${bal} coin(s) !",
	balance_embed_fields1_name: "Banque à découvert mgl",
	balance_embed_fields2_name:
		"En Solde (donne moi ta thune connard d'tes mort)",

	// /daily
	daily_cooldown_error:
		"Désolé mgl faut attendre **${time}** Avant drefaire la commande !",
	daily_embed_title: "Quotidien",
	daily_embed_description: "Récompense quotidienne",
	daily_embed_fields: "Collecté",

	// /monthly
	monthly_cooldown_error:
		"Désolé mgl faut attendre **${time}** Avant drefaire la commande !",
	monthly_embed_title: "Mensuel",
	monthly_embed_description: "Récompense Mensuelle",
	monthly_embed_fields: "Collecté",

	// /pay
	pay_negative_number_error:
		"T'es en négatif jpeu pas envoyer la thune déso mgl.",
	pay_dont_have_enought_to_give:
		"Ta pas assé dans ton porte feuille , arrete de visé trop haut.",
	pay_command_work:
		"${authorUsername}, ta envoyé ${amount}$ à ${userUsername}.",

	// /removemoney
	removemoney_not_admin: "Il te faut perm admin pour faire ca trdbl",
	removemoney_embed_title: "Retiré de l'argent !",
	removemoney_embed_fields: "Montant",
	removemoney_embed_second_fields: "Solde mis à jour",
	removemoney_logs_embed_description:
		"<@${authorId}> a retiré ${amount} pièce(s) de <@${userId}> !",
	removemoney_logs_embed_title: "Logs d'économie",

	// /rob
	rob_cooldown_error:
		"**Attend 50 minutes avant de pouvoir voler à nouveau un utilisateur Espece de voleur , roh !**",
	rob_dont_enought_error:
		":x: Il te faut 250 balle si tu veux voler un mec dsl frérot.",
	rob_him_dont_enought_error:
		":x: ${userUsername} cmec il a pas assez d'argent pour etre volé mdmmdr.",
	rob_embed_description:
		"<@${authorId}>, tu as volé <@${userId}> et avez réussi à tu enfuir avec ${random} allez le frapper cbatard!",

	// /weekly
	weekly_cooldown_error:
		"Désolé, tu dois attendre **${time}** avant d'exécuter cette commande !",
	weekly_embed_title: "Hebdomadaire",
	weekly_embed_description: "**Récompense Hebdomadaire**",
	weekly_embed_fields: "Collecté",

	// /work
	work_cooldown_error:
		"<@${authorId}>, **Attendez ${time} minutes avant de arabe à nouveau un utilisateur !**",
	work_embed_author: "${authorUsername}, ça a payé !",
	work_embed_description:
		"${authorUsername}, tu as travaillé et gagné ${amount}$ c'est bien bon esclave de la société!",

	// /withdraw
	withdraw_cannot_abuse:
		"${emoji_No} | Vous ne pouvez pas retirer une somme supérieure à celle que vous avez dans votre banque ! mais frère fait gaffe aussi",
	withdraw_embed_title: "Retrait de votre banque à découvert",
	withdraw_embed_desc:
		"${author}, vous avez retiré ${toWithdraw}${emoji_Coin} de votre `banque`",
	withdraw_embed_fields1_name: "Banque",

	// /deposit
	deposit_cannot_abuse:
		"${emoji_No} | Vous ne pouvez pas déposer une somme supérieure à celle que vous avez dans votre portefeuille ! Vous essayex d'emtuber la banque ? T un bz!",
	deposit_embed_title: "Dépôt dans votre banque",
	deposit_embed_desc:
		"${author}, vous avez déposé ${toDeposit}${emoji_Coin} dans votre `banque`",
	deposit_embed_fields1_name: "Banque",

	// /leaderboard
	economy_leaderboard_embed_title: "Classement d'économie de `${guildName}`",
	economy_leaderboard_embed_fields_value:
		"<@${userId}> - Banque : `${bank}`${emoji_Coin} | Solde : `${money}`${emoji_Coin}",

	// /economy (money and cooldown commands)
	economy_action_in_progress:
		"${emoji_No} | Ta commande d'économie précédente est encore en cours, réessaie dans un instant.",

	// /economy disable
	economy_disable_not_admin:
		":x: | t pa admin boloss, et ouais! Vas sucer les owner ptêtre il te rank.",
	economy_disable_already_disable:
		"<@${authorId}>, le Module Économie est déjà **désactivé** salle imbécile !",
	economy_disable_already_enable:
		"<@${authorId}>, le Module Économie est déjà **activé** mais t con !",
	economy_disable_set_enable:
		"<@${authorId}>, vous avez activé avec succès le Module Économie! Le capitalisme peut reprendre les enculers !!!",
	economy_disable_set_disable:
		"<@${authorId}>, vous avez désactivé avec succès le Module Économie ! Maintenant plus personne peut gagner de la thune....",
	economy_disable_logs_embed_desc:
		"<@${authorId}> a mis le Module Économie à l'état `${state}` !",
	economy_disable_logs_embed_title: "Logs Économiques dla Hess",

	// /economy boost-set
	economy_boost_role_not_found:
		"Rôle introuvable. Vous devez définir un prix pour le rôle.",
	economy_boost_embed_title: "Système Économique - Rôles Achetables",
	economy_boost_embed_desc:
		"Tous les rôles achetables sont listés ci-dessous.",

	// /economy role add
	economy_role_add_no_role: "Il n'y a aucun rôle achetable à supprimer.",
	economy_role_add_max_20_roles:
		"Vous pouvez avoir jusqu'à 20 rôles achetables maximum.",
	economy_role_add_canceled:
		"Le rôle n'a pas été ajouté aux rôles achetables.",
	economy_role_add_prompt_dangerous:
		"Êtes-vous sûr de vouloir ajouter ce rôle aux rôles achetables ?\n**Avertissement :** Ce rôle possède des permissions dangereuses.\nPermissions : ${stringDangerousPermissions}",

	// /economy shop
	economy_shop_embed_title: "🛍️ Boutique de `${guildName}`",
	economy_shop_embed_desc:
		"La boutique vous permet d'acheter des objets/rôles avec votre argent. (komme sa tu deviens une discord kitten tqt) Vous pouvez consulter les rôles disponibles à l'achat ci-dessous.\nj'espere que t'as de la thune sinon tu va pleurer",
	economy_shop_not_available:
		"Le rôle que vous avez sélectionné n'est pas disponible à l'achat.",
	economy_shop_already_own_role: "Mais trou dballe tu as déjà ce rôle !",
	economy_shop_not_enough_money:
		" t pas assez riche pour acheter ce rôle, va travailler un peu !",
	economy_shop_role_add_failed:
		"J'ai pas pu te donner ce rôle, donc t'as rien payé. Demande à un admin de vérifier qu'il existe encore et qu'il est sous mon rôle le plus haut.",
	economy_shop_role_purchased:
		"Vous avez acheté avec succès le rôle **{roleName}** pour **${rolePrice}** 💰.",
	economy_shop_unknown_role: "Rôle inconnu",
	economy_shop_not_set:
		"Il n'y a aucun rôle disponible à l'achat sur ce serveur. Veuille contacter l'administrateur du serveur pour plus d'informations. (ou alors t'es juste pauvre)",
	economy_shop_already_owned: "Déjà possédé",
	economy_shop_menu_placeholder: "Sélectionnez un rôle à acheter",

	// /economy manage-rewards set-cooldown
	economy_manage_rewards_cooldown_invalid_time:
		"Format de temps invalide. Veuillez utiliser un format valide.",
	economy_manage_rewards_cooldown_command_ok:
		"Le temps de recharge pour ${type} a été défini sur ${stime} avec succès.",

	// /economy mange-rewards set-money
	economy_manage_rewards_set_money:
		"Le montant d'argent pour ${type} a été défini sur ${money} avec succès.",

	// /economy role list
	economy_role_list_no_buyable_roles:
		"Il n’y a aucun rôle achetable à afficher.",
	economy_role_list_embed_title: "Système d'Économie - Rôles Achetables",
	economy_role_list_embed_desc:
		"Tous les rôles achetables sont listés ci-dessous.",

	// /economy economy-ureset
	reset_ueconomy_are_you_sure:
		"**Es-tu vraiment sûr de vouloir supprimer toutes les données de l'économie ?\nCette action est définitive et ne peut pas être annulée.**\n**Cette action est destructive !!**",
	reset_ueconomy_logs_embed_title:
		"Logs du module économie (ACTION DANGEREUSE)",
	reset_ueconomy_logs_embed_desc:
		"${author} a supprimé toutes les données du module économie pour ${user} !",

	// /economy economy-greset
	reset_geconomy_are_you_sure:
		"**Es-tu vraiment sûr de vouloir supprimer toutes les données de l'économie pour TOUS LES MEMBRES DU SERVEUR ?\nCette action est définitive et ne peut pas être annulée.**\n**Cette action est destructive !!**",
	reset_geconomy_logs_embed_title:
		"Logs du module économie (ACTION TRÈS DANGEREUSE)",
	reset_geconomy_logs_embed_desc:
		"${author} a supprimé toutes les données du module économie pour **TOUT LE MONDE** !",

	// Profil Customisation commands
	// /setprofilage, /setprofildescriptions, /profil

	// /setprofilage
	setprofilage_command_work:
		"**Ton âge de profil a été mis à jour avec succès. J'éspère te voir dans mes dm si t'es mineur :smirk:**",

	// /setprofildescriptions
	setprofildescriptions_command_work:
		"**Ta description de profil a été mise à jour avec succès.**",

	// /profil
	profil_not_description_set: "Aucune description définie !",
	profil_unknown: "Inconnu",
	profil_embed_title: "${emoji_Pin} __Profil de ${memberTag}__",
	profil_embed_fields_nickname: "📝 ・ Surnom",
	profil_embed_fields_money: "🪙 ・ __Argent__",
	profil_embed_fields_money_value: " pièces",
	profil_embed_fields_xplevels: "💳 ・ __Niveau d'XP__",
	profil_embed_fields_xplevels_value: " niveaux d'XP",
	profil_embed_fields_age: "🎂 ・ __Âge__",
	profil_embed_fields_age_value: " ans",
	profil_embed_fields_gender: "👤 ・ __C'que t'a entre les jambes__",
	profil_embed_fields_pronouns: "📌 ・ __Pronom__",
	profil_embed_fields_birthdate: "🎂 ・ __Date d'anniversaire__",

	// /profil définir-anniversaire
	profil_birthday_month_button_label: "Définir le mois",
	profil_birthday_day_button_label: "Définir le jour",
	profil_birthday_year_button_label: "Définir l'année",
	profil_birthday_embed_title: "🎂 ・ Définis ton anniversaire chacal",
	profil_birthday_embed_introduction:
		"${emoji_Sparkles} **Comme tout gros fdp d'humain, tu as un anniversaire !**${emoji_Sparkles}\n\n${emoji_Crown} ・ Hey, ${author}\n:tada: ・ Pour le célébrer, il est temps de le définir !\n",
	profil_birthday_embed_current_birthday:
		"${emoji_Pin} ・ **Anniversaire actuel**: `${birthdayMonth}/${birthdayDay}/${birthdayYear}` (au format MM/JJ/AAAA)",
	profil_birthday_modal1_title: "Entrez votre année de naissance",
	profil_birthday_modal1_fields1_label: "Année",
	profil_birthday_invalid_year:
		"Année invalide ! Veuillez entrer une année valide.",
	profil_birthday_year_already_set: "Votre année est déjà définie.",
	profil_birthday_year_set: "Votre année a été définie !",
	profil_birthday_modal2_title: "Entrez votre mois de naissance",
	profil_birthday_modal2_fields1_label: "Mois",
	profil_birthday_invalid_month:
		"Mois invalide ! Veuillez entrer un mois valide.",
	profil_birthday_month_already_set: "Votre mois est déjà défini.",
	profil_birthday_month_set: "Votre mois a été défini !",
	profil_birthday_modal3_title: "Entrez votre jour de naissance",
	profil_birthday_modal3_fields1_label: "Jour",
	profil_birthday_invalid_day:
		"Jour invalide ! Veuillez entrer un jour valide.",
	profil_birthday_day_already_set: "Votre jour est déjà défini.",
	profil_birthday_day_set: "Votre jour a été défini !",

	// Utils commands
	// /serverinfo, /snipe, /userinfo, /renew

	// /serverinfo

	// /setrankroles
	setrankroles_not_admin: "${emoji_No} Il te faut perm admin dsl beau gosse!",
	setrankroles_already_this_in_db:
		"${emoji_No} Les rôles de classement sont déjà enregistrés dans la base de données de ce serveur.",
	setrankroles_not_roles_typed:
		"${emoji_No} Tu n'avez spécifié aucun rôle dans ton commande !",
	setrankroles_logs_embed_description_enable:
		"<@${authorId}> a défini le rôle de classement sur <@&${argsid}>",
	setrankroles_logs_embed_title_enable: "Définir le rôle de classement",
	setrankroles_logs_embed_description_disable:
		"<@${authorId}> a supprimé le rôle de classement !",
	setrankroles_logs_embed_title_disable: "Définir le rôle de classement",
	setrankroles_command_work_disable:
		"<@${authorId}>, ta supprimé le rôle de classement !",
	setrankroles_command_error:
		"${emoji_No} Ouais , la ya une erreur ressaie apres bg.",

	// /snipe
	snipe_no_previous_message_deleted:
		"Le message précédent n'a pas été supprimé dans ce salon. Tu veux donc récup un message supp qui existe même pas ? sale tocard và",

	// /userinfo
	userinfo_wait_please:
		"${emoji_Timer} Patiente mgl sois pas trop impatiant...",
	userinfo_var_notfound: "`Non trouvé`",
	userinfo_button_label: "Profil utilisateur",

	// /renew
	renew_channel_send_success:
		"${author} jai recrée le salon , tu voulais cacher des trucs ouuu? !",
	renew_dont_have_permission:
		":x: **Impossible** Ta pas la perm gros shlag !",
	renew_not_administrator:
		":x: **Faut etre le boss pour faire ca , revient quand taura perm admin !**",

	// /renewvc
	renewvc_not_in_voice:
		"${emoji_No} T'es meme pas en vocal gros shlag , reviens quand t seras co !",
	renewvc_region_success:
		"${emoji_Yes} Voila , la region de ${targetVc} est passee en auto !",
	renewvc_dont_have_permission:
		":x: **Impossible** Ta pas la perm gros shlag !",

	// /prevnames
	prevnames_undetected: "Aucune donnée trouvée !",
	prevnames_not_admin:
		"Il te faut la perm admin encore une fois, essaie /kisakay c une super commande bg.",
	prevnames_data_erased:
		"Vos ancien pseudo ont entièrement été supprimer sur votre demande p'tit con!",
	prevnames_embed_footer_text: "iHorizon | Page ${page}/${pageCount}",

	// /blockbot
	blockbot_not_owner:
		":x: **Tu n'est pas le propriétaire du serveur grosse merde !**",
	blockbot_logs_enable_title: "Journal BlockBot",
	blockbot_logs_enable_description:
		"${author} (Le propriétaire du serveur) a __activé__ `BlockBot`. Maintenant, les bot ne peuvent **plus** être ajouté à ce serveur !",
	blockbot_command_work_on_enable:
		"**Tu as activé `BlockBot`**\nMaintenant, les bot ne peuvent **plus** être ajouté à ce serveur !",
	blockbot_command_work_on_disable:
		"**Tu as désactivé `BlockBot`**\nMaintenant, les bot peuvent être ajouté de nouveau sur ce serveur !",
	blockbot_logs_disable_commmand_work: "Journal BlockBot",
	blockbot_logs_disable_description:
		"${author} (Le propriétaire du serveur) a __désactivé__ `BlockBot`. Maintenant, les bot peuvent être ajouté à ce serveur !",

	// /banner
	banner_guild_no_banner: "Le serveur n'as pas de bannière.",
	banner_user_no_banner: "Cette utilisateur n'as pas de bannière.",

	// /massiverole
	massiverole_too_much_member:
		"Ya trop dmembre c mort jfais pas ça! eh ouais gars faut rationné les requête à l'api discord!. tu crois c'est toi qui payent les serveur dédiers ? bha nan enft. donc tu prend tes click et tes clack et tu te casse. sérieux frr",

	// /nickrole
	nickrole_too_much_member:
		"Ya trop dmembre c mort jfais pas ça! eh ouais gars faut rationné les requête à l'api discord!. tu crois c'est toi qui payent les serveur dédiers ? bha nan enft. donc tu prend tes click et tes clack et tu te casse. sérieux frr",

	// /emoji
	emoji_send_new_emoji:
		"__Nouvel emoji créé__ avec le nom **${emojiName}** ! (${emoji})",
	emoji_send_err_emoji:
		"__Erreur lors de la création du nouvel emoji__ avec le nom **${emojiName}** !",

	// /derank
	derank_msg_failed:
		"Une erreur s'est produite lors de la suppression des rôles.",
	derank_no_role: "Ce membre n'a aucun rôle à supprimer.",

	// /action débannir tous
	action_unban_all_no_banned_members: "Il n'y a pas de membres bannis.",
	action_mass_job_running:
		"Une action de masse de ce type tourne déjà sur ce serveur, attends qu'elle finisse.",
	util_talk_already_active:
		"Le mode talk tourne déjà dans ${voiceChannel} : coupe-le d'abord.",

	// /action débannir annuler

	// /vc
	vc_embed_desc:
		"## États Vocaux\n`${voiceCount}` membre(s) est dans le voc :\n${emoji_iHorizon_Streaming} **=>** ${streaming}\n${emoji_iHorizon_Deaf} **=>** ${deafened}\n${emoji_iHorizon_Mute} **=>** ${muted}\n${emoji_iHorizon_Camera} **=>** ${video}\n## États des Membres\n`${memberCount}` membre(s) sont dans la guilde :\n${emoji_DND} **=>** ${dnd}\n${emoji_Online} **=>** ${online}\n${emoji_Idle} **=>** ${idle}\n${emoji_Invisible} **=>** ${offline}\n## États des Boosts\n`${boostCount}` boost(s) dans la guilde,\n${members}",
	vc_embed_fields_1_name: "・Nombre de Membres",
	vc_embed_fields_1_value: "```py\n${memberCount} membres```",
	vc_embed_fields_2_name: "・Nombre de Canaux",
	vc_embed_fields_2_value:
		"```py\n${textChannelSize} salon(aux) texte\n${voiceChannelSize} salon(aux) vocal(aux)```",
	vc_embed_short_desc:
		"## États des Vocaux\n`${voiceCount}` membre(s) sont dans le voc\n${emoji_iHorizon_Streaming} **=>** ${total_members_vc_streaming}\n${emoji_iHorizon_Deaf} **=>** ${total_members_vc_deaf}\n${emoji_iHorizon_Mute} **=>** ${total_members_vc_mute}\n${emoji_iHorizon_Camera} **=>** ${total_members_vc_video}\n## États des Membres\n`${total_members_size}` membre(s) sont dans la guilde\n${emoji_DND} **=>** ${total_members_states_dnd}\n${emoji_Online} **=>** ${total_members_states_online}\n${emoji_Idle} **=>** ${total_members_states_idle}",

	// /massmove
	massmove_too_much_member:
		"Trop de membres, je ne peux pas le faire en raison d'une éventuelle limitation ! eh ouais gars faut rationné les requête à l'api discord!. tu crois c'est toi qui payent les serveur dédiers ? bha nan enft. donc tu prend tes click et tes clack et tu te casse. sérieux frr",

	// /all-admins
	all_admins_nobody_admins:
		"Il n'y a aucun administrateur dans ce serveur, ptêtre prck l'owner est schyzo et veut tout faire tout seul",
	all_admins_unrank_button_label: "Déclasser tous",
	all_admins_unrank_not_owner:
		"Seul le propriétaire du serveur peut déclasser tous les administrateurs du serveur",

	// /allbots

	// /addrole
	utils_addrole_highter_or_egal_roles_msg:
		"${emoji_Stop} Vous ne pouvez pas ajouter un rôle à un utilisateur qui a un rôle supérieur au vôtre...",
	utils_addrole_command_ok:
		"${author} a ajouté avec succès le rôle ${role} à ${user}",
	utils_addrole_not_wl:
		"${emoji_No} | Le rôle que vous souhaitez ajouter à l'utilisateur n'est pas dans la liste blanche. Un administrateur doit d'abord l'ajouter ! (en utilisant `/utils wlroles`)",
	utils_addrole_cant_level:
		"bha chef le gars est pas admin et tu veux lui ajouter un rôle admin, t'essaye de me niquer ouu? tu veux pine le serveur mon frère?",
	utils_addrole_try2brain:
		"le bot est trop bas par rapport au rôles. je ne peux pas l'ajouter sont rôle de con là",

	// /delrole
	utils_delrole_highter_or_egal_roles_msg:
		"${emoji_Stop} Vous ne pouvez pas supprimer un rôle à un utilisateur qui a un rôle supérieur au vôtre...",
	utils_delrole_command_ok:
		"${author} a supprimé avec succès le rôle ${role} à ${user}",
	utils_delrole_not_wl:
		"${emoji_No} | Le rôle que vous souhaitez supprimer à l'utilisateur n'est pas dans la liste blanche. Un administrateur doit d'abord l'ajouter ! (en utilisant `/utils wlroles`)",
	utils_delrole_try2brain:
		"le bot est trop bas par rapport au rôles. je ne peux pas supprimer sont rôle de con là",

	// /utils wlroles
	utils_wlroles_embed_title: "Rôles dans la liste blanche",
	utils_wlroles_embed_desc:
		"Voici tous les rôles autorisés pouvant être attribués avec les commandes `addrole` et `delrole` !",
	utils_wlRoles_logsEmbed_title: "Module des rôles de la liste blanche",
	utils_wlRoles_logsEmbed_desc:
		"${author} a modifié les rôles dans la liste blanche (pour les commandes `addrole` et `delrole`)",
	utils_derogation_already_exists:
		"${emoji_No} La dérogation ${role} est déjà correctement configurée",
	utils_derogation_created:
		"${emoji_Yes} La dérogation ${role} a été créée. Salons synchronisés: `${updatedChannels}`. Échecs: `${failedChannels}`",
	utils_derogation_resynced:
		"${emoji_Yes} La dérogation ${role} existait déjà, j'ai resynchronisé `${updatedChannels}` salons. Échecs: `${failedChannels}`",

	// /utils dm
	utils_dm:
		"${emoji_Yes} Le message as parfaitement été envoyer à ${targetMember}",
	utils_dm_cant:
		"${emoji_No} Je n'ai pas réussi à envoyer de message à ${targetMember}. Il à peut-être bloquer les message privée, ou il m'a bloqué ce gros fils de pute!",

	// /utils pic-only
	utils_pic_only_embed_title: "Salons Médias Uniquement",
	utils_pic_only_emnbed_desc:
		"Salon où seules les photos/images/vidéos sont autorisées. Tout autre contenu est bloqué par le bot",
	utils_piconly_embed_fields_3_name: "Durée du Timeout",
	utils_piconly_select1_option1_label: "Changer la durée du timeout",
	utils_piconly_select1_option2_label: "Changer le seuil",
	utils_piconly_modal1_title: "MediaOnly - Configuration du Temps",
	utils_piconly_modal1_fields1_placeholder: "la durée du mute",
	utils_piconly_modal1_fields1_label: "Durée du Mute",
	utils_piconly_modal2_title: "MediaOnly - Configuration du Seuil",
	utils_piconly_modal2_fields1_placeholder: "le seuil avant le mute",
	utils_piconly_modal2_fields1_label: "Seuil",
	utils_piconly_embed_fields2_placeholder:
		"Créer un fil de discussion sous l'image/vidéo",
	utils_piconly_var_thread_name: "Fil de {name}",

	// /zip-emojis
	zip_emojis_doesnt_have_perm:
		"Vous n'avez pas la permission de gérer les émojis.",
	zip_emojis_command_work:
		"🎉 Exportation terminée en **${calcTime}**ms ! Voici l'archive contenant ${emojiCount} émojis.",
	zip_emojis_command_error:
		"Une erreur s'est produite lors de l'exportation des émojis.",

	// /zip-stickers
	zip_stickers_doesnt_have_perm:
		"Vous n'avez pas la permission de gérer les stickers.",
	zip_stickers_command_work:
		"🎉 Exportation terminée en **${calcTime}**ms ! Voici l'archive contenant ${stickerCount} stickers.",
	zip_stickers_command_error:
		"Une erreur est survenue lors de l'exportation des stickers.",

	// +sticker
	sticket_no_sticker:
		"gros j'ai pas envie de t'insulter mais t'a l'air d'un vieux tocard de merde. Jpeut créer des stickers ouais, mais à condition que tu prenne un message avec. fdp",
	sticket_command_work: "L'autocollant `${name}` a été créé avec succès.",
	sticker_command_error:
		"Impossible de créer l'autocollant. Une erreur s'est produite : `${errMessage}`.",
	sticket_command_error2:
		"Veuille répondre à un message contenant un autocollant.",

	// /util nick-kicker
	util_nick_kicker_embed_desc:
		"Un mec te clc avec sa team de saloppe? pas de soucis, iHorizon est là pour les expulser comme un ptn de raciste!",
	util_nick_kicker_words: "mots",
	util_nick_kicker_select_to_remove: "Sélectionnez un mot à supprimer",
	util_nick_kicker_remove_word: "Supprimer ce mot",
	util_nick_kicker_no_word_to_remove: "Il n'y a pas de mot à supprimer",
	util_nick_kicker_add_word: "Ajouter un Mot",
	util_nick_kicker_words_max_15: "Vous ne pouvez pas ajouter plus de 15 mots",
	util_nick_kicker_disable: "Désactiver",
	util_nick_kicker_remove_word2: "Supprimer un Mot",
	util_nick_kicker_remove_desc: "Supprimer un mot de l'expulseur de pseudos",
	util_nick_kicker_add_desc: "Ajouter un mot à l'expulseur de pseudos",
	util_nick_kicker_disable_desc: "Désactiver l'expulseur de pseudos",
	util_nick_kicker_enable_desc: "Activer l'expulseur de pseudos",

	// /util wakeup
	util_wakeup_yourself:
		"mais mon reuf? t con ou t con? tu vas pas quand même me dire que tu dors sur le keyboard en même temps d'écrire cette commande mdr",
	util_wakeup_not_in_vc:
		"Mais frr, le bot vas pas créer un ptit chinois nommées ${userDisplayName} avec la même pp et bannière pour te faire croire que le gars ce réveille... Il est pas en voc ton gars ptdrr",
	util_wakeup_command_work:
		"C'est partiiiiit pour le réveil de ${user} ! LET'S GO !!!!",

	// /util talk
	util_talk_not_in_vc:
		"Vous devez être dans un salon vocal pour utiliser cette commande.",
	util_talk_audit_reason: "Mode discussion vocale activé",
	util_talk_logs_title: "Discussion Vocale",
	util_talk_logs_description:
		"${author} a activé le mode discussion dans ${voiceChannel} et a rendu muet ${mutedCount} membre(s). ${skippedCount} membre(s) ont été ignorés.",
	util_talk_command_work:
		"Le mode discussion est maintenant activé dans ${voiceChannel}. ${mutedCount} membre(s) ont été rendus muets et ${skippedCount} membre(s) ont été ignorés.",

	// /util untalk
	util_untalk_nothing_active: "Aucun mode discussion actif pour ce serveur.",
	util_untalk_audit_reason: "Mode discussion vocale désactivé",
	util_untalk_logs_title: "Fin de Discussion Vocale",
	util_untalk_logs_description:
		"${author} a désactivé le mode discussion dans ${voiceChannel} et a réactivé ${unmutedCount} membre(s).",
	util_untalk_command_work:
		"Le mode discussion a été désactivé dans ${voiceChannel}. ${unmutedCount} membre(s) ont été réactivés.",

	// /util freeze
	util_freeze_logs_title: "Gel Vocal",
	util_freeze_logs_description: "${author} a gelé l'accès à ${voiceChannel}.",
	util_freeze_command_work:
		"Le salon vocal ${voiceChannel} est maintenant gelé.",

	// /util wlvc
	util_wlvc_no_member:
		"Vous devez spécifier un membre autorisé dans le salon vocal gelé.",
	util_wlvc_no_freeze: "Aucun salon vocal gelé actif dans ce serveur.",
	util_wlvc_logs_title: "Autorisation Gel Vocal",
	util_wlvc_logs_description:
		"${author} a autorisé ${member} à rejoindre le salon vocal gelé.",
	util_wlvc_command_work:
		"${member} est maintenant autorisé à rejoindre le salon vocal gelé.",

	// /util unwlvc
	util_unwlvc_no_member:
		"Vous devez spécifier un membre à retirer de la liste blanche du salon vocal gelé.",
	util_unwlvc_no_freeze: "Aucun salon vocal gelé actif dans ce serveur.",
	util_unwlvc_not_whitelisted:
		"${member} n'est pas autorisé dans le salon vocal gelé.",
	util_unwlvc_logs_title: "Retrait Autorisation Gel Vocal",
	util_unwlvc_logs_description:
		"${author} a retiré ${member} de la liste blanche du salon vocal gelé.",
	util_unwlvc_command_work:
		"${member} ne peut plus rejoindre le salon vocal gelé.",

	// /util unfreeze
	util_unfreeze_no_freeze: "Aucun salon vocal gelé actif dans ce serveur.",
	util_unfreeze_logs_title: "Dégel Vocal",
	util_unfreeze_logs_description: "${author} a retiré le gel vocal actif.",
	util_unfreeze_command_work: "Le salon vocal n'est plus gelé.",

	// /util leash
	util_leash_too_naugthy:
		"Petit coquin, tu ne peux pas mettre plus de 3 personnes en laisse :D",
	util_leah_already_owned:
		"Petit coquin, tu possèdes déjà ces petites merveilles :smirk:",
	util_leash_confirm_message:
		"${emoji_No} | Le membre que tu veux mettre en laisse n'est pas dans un voc !\n${emoji_Warning_Icon} | Es-tu sûr de vouloir effectuer cette action ?",
	util_leash_canceled_leash: "${emoji_Yes} | Configuration de laisse annulée",
	util_leash_confirmed_leash:
		"${emoji_Yes} | Vous avez mis en laisse l'utilisateur avec succès dans ce serveur :smirk:",

	// /util unleash
	util_unleash_not_in_leash:
		"${emoji_No} | Cet utilisateur n'est pas sous votre contrôle !",
	util_unleash_command_ok:
		"${emoji_Yes} | Vous avez libéré cet utilisateur avec succès dans ce serveur :)",

	// /utilss leashlist
	util_leashlist_no_data:
		"${emoji_No} | Il n'y a aucune laisse active sur ce serveur.",
	util_leashlist_embed_title: "Laisses actives",

	// /util lockname, /util unlockname
	util_lockname_not_in_guild:
		"${emoji_No} | Ce membre n'est pas dans le serveur !",
	util_lockname_not_manageable:
		"${emoji_No} | J'ai pas la permission de gérer le pseudo de ce membre !",
	util_lockname_already_locked:
		"${emoji_No} | Le pseudo de ce membre est déjà verrouillé !",
	util_lockname_success:
		"${emoji_Yes} | Le pseudo de ${member} est maintenant verrouillé sur **${nick}** !",
	util_lockname_success_reset:
		"${emoji_Yes} | Le pseudo de ${member} est maintenant verrouillé !",
	util_unlockname_not_locked:
		"${emoji_No} | Le pseudo de ce membre est pas verrouillé !",
	util_unlockname_success:
		"${emoji_Yes} | Le pseudo de ${member} a été déverrouillé !",
	util_lockname_logs_embed_title: "Logs de verrouillage de pseudo",
	util_lockname_logs_embed_description:
		"<@${authorId}> a verrouillé le pseudo de <@${memberId}>",
	util_unlockname_logs_embed_description:
		"<@${authorId}> a déverrouillé le pseudo de <@${memberId}>",

	util_locknamelist_empty:
		"${emoji_No} | Aucun pseudo verrouillé sur ce serveur ! `/utilss lockname` pour en créer un.",
	util_locknamelist_embed_title: "Pseudos verrouillés",

	// /util autorenew
	util_autorenew_time_too_short:
		"Le temps entre chaque renouvellement de salon doit être supérieur à 1 minute",
	util_autorenew_time_too_long:
		"Le temps entre chaque renouvellement de salon doit être inférieur à 30 jours",
	util_autorenew_command_ok:
		"${emoji_Yes} Désormais, le salon ${channel} sera automatiquement supprimé-créé (renouvelé) toutes les ${time} !\nPour arrêter le renouvellement du salon, il suffit de le supprimer vous-même.",
	event_autorenew_channel_renewed: "L'AutoRenew a renouvelé le salon !",
	event_autorenew_channel_warning:
		"Le module AutoRenew est configuré pour renouveler ce salon. Prochain renouvellement dans ${time}.",

	// /util where
	var_video: "Vidéo",
	var_whereis: "Où est",
	util_not_in_vc: "Les membres ne sont pas dans un voc",

	// /util allwebhooks
	util_no_webhooks:
		"J'aimerais faire le ménage, mais il n'y a pas de webhooks dans ce putain de serveur de con!",
	util_allwebhooks_embed_title: "Tous les webhooks",
	util_allwebhooks_deleting: "Suppression de tous les webhooks...",
	util_allwebhooks_deleted: "**`${u}`** webhook(s) supprimé(s) !",

	// /util unzip-emojis
	util_unzip_emojis_command_work:
		"🎉 Décompression terminée en ${calcTime}ms ! J'ai créé ${emojiCount} emoji(s) dans la guilde.",
	util_unzip_emojis_command_error:
		"Une erreur s'est produite lors de la décompression des emojis.",
	util_unzip_emojis_command_no_file:
		"gros jmen fou des nudes de ta soeur. jveux un fichier zip moi pour les recover la conne de ta race.",

	// /util vkick
	vkick_member_not_in_guild: "Le membre n'est pas dans le serveur mec.",
	vkick_not_in_vc: "Le membre n'est pas dans un canal vocal.",
	vkick_not_admin_kick:
		"Vous ne pouvez pas déconnecter un administrateur d'un canal vocal.",
	vkick_logEmbed_title: "Déconnexion Vocale",
	vkick_logEmbed_desc:
		"${author} a déconnecté ${member} du canal vocal ${voiceChannel}.",
	vkick_command_work:
		"${author}, vous avez déconnecté avec succès ${member} de ${voiceChannel}.",

	// /util sync
	util_sync_embed_description_0:
		"Tous les canaux de la catégorie ont déjà des permissions synchronisées.",

	// /util securewebhook
	util_securewebhook_action_create: "URL de Webhook Discord invalide",
	util_securewebhook_action_create_error:
		"Erreur lors de la création du webhook : `${status}`",
	util_securewebhook_action_create_ok:
		"Webhook créé avec succès\n> URL : ${url}\n> Utilisation : ${use}",
	util_securewebhook_action_delete_any: "Vous n'avez aucun webhook",
	util_securewebhook_action_delete_not_owner:
		"Vous n'êtes pas le propriétaire de ce webhook",
	util_securewebhook_action_delete_error:
		"Erreur lors de la suppression du webhook",
	util_securewebhook_actiom_list_ok: ":star: __**Vos webhooks**__ :\n",

	// /util admin-roles
	admin_roles_nobody_roles:
		"Il n’y a aucun rôle administrateur sur ce serveur !",
	admin_roles_remove_button_label: "Retirer l’admin de tous",
	admin_roles_remove_not_owner: "Vous n’êtes pas propriétaire du serveur !",

	// /util rolelimit
	util_rolelimit_bad_opt:
		"${emoji_No} | Les options fournies sont invalides. Veuillez vérifier votre saisie.",
	util_rolelimit_good:
		"${emoji_Crown} | Rôle : ${role} | Membres max : ${limit_count}\n- Les nouveaux utilisateurs ne pourront pas recevoir ce rôle si ${limit_count} membres le possèdent déjà.",

	// /util inviteinfo
	util_inviteinfo_not_valid_invite:
		"Cette invitation `discord_invite` n'est pas valide !",

	// /util cooldown
	util_cooldown_command_ok:
		"Le salon à vu sont slowmode changer pour ${duration_in_string}.",

	// /util role-members
	util_role_members_no_one: "Personne ne possède ce rôle sur le serveur",

	// /util vanity-generator
	util_vanity_generator_invalid_code:
		"Le code URL Vanity `${VanityCode}` est invalide. La chaîne doit être alphanumérique et peut contenir des tirets entre les mots. La longueur maximale est de 32 caractères. Les tirets ne peuvent pas être au début ou à la fin de la chaîne.",
	util_vanity_generator_already_claimed:
		"Le code URL Vanity est déjà utilisé ! Choisissez-en un autre.",
	util_vanity_generator_command_err:
		"Une erreur est survenue lors de la création du code vanity. Veuillez réessayer plus tard.",

	// +top
	utils_top_no_message:
		"jcrois ce salon c'est un peu la rue. ya 0 message ma gueule.",
	utils_top_command_ok:
		"Le premier message de ce canal se trouve [ici](${link})",

	// +bringall
	bringall_no_from_channel:
		"Por favor, especifica un canal de voz de origen.",
	bringall_invalid_category: "Por favor, especifica una categoría válida.",
	bringall_no_voice_channels:
		"La categoría especificada no contiene canales de voz.",
	bringall_no_members: "No hay miembros en el canal de voz de origen.",

	// /util move
	util_move_not_in_vc:
		"Le membre que vous voulez déplacer n'est connecté à aucun canal vocal",
	util_move_impossible_to_move_admin:
		"Le membre que vous voulez déplacer est administrateur et vous ne l'êtes pas non plus.",
	util_move_command_ok: "${member} est maintenant dans ${channel}",

	// Guild Config commands
	// /blockpub, /guildprofil, /setchannels, /setjoindm, /setjoinmessage, /setjoinroles, /setleavemessage, /setup

	// /blockpub
	blockpub_not_admin:
		":x: | Tu dois etre un admin du serv bg revient après !",
	blockpub_now_enable:
		"📌 | Jai activé lantipub en gros on peut plus envoyer dlien , sauf les admins biensur",
	blockpub_now_disable:
		"📌 | Jai enlever lantipub allez go spammez tes servs !",

	// /guildprofil
	guildprofil_not_admin:
		":x: | Tu dois etre un admin du serv bg revient après avoir sucé des perms !",
	guildprofil_not_set_reactionrole: "Non configuré !",
	guildprofil_set_reactionrole:
		"**ID du message**: `${i}` -> ${emoji} donne le rôle <@&${rolesID}>\n",
	guildprofil_not_set_ticketFetched: "Non configuré !",
	guildprofil_set_ticketFetched: "",
	guildprofil_not_set_punishPub: "Non configuré !",
	guildprofil_set_punishPub:
		"`${punishementType}` : max : `${amountMax}` flags.",
	guildprofil_not_set_supportConfig: "Non configuré !",
	guildprofil_set_supportConfig:
		"Saisie `${input}` dans la bio donne le rôle <@&${rolesId}>.",
	guildprofil_not_set_setchannelsjoin: "Non configuré !",
	guildprofil_set_setchannelsjoin: "",
	guildprofil_not_set_setchannelsleave: "Non configuré !",
	guildprofil_set_setchannelsleave: "",
	guildprofil_not_set_joinmessage: "Non configuré !",
	guildprofil_set_joinmessage: "",
	guildprofil_not_set_leavemessage: "Non configuré !",
	guildprofil_set_leavemessage: "",
	guildprofil_not_set_joinroles: "Non configuré !",
	guildprofil_set_joinroles: "",
	guildprofil_not_set_joinDmMessage: "Non configuré !",
	guildprofil_set_joinDmMessage: "",
	guildprofil_not_set_blockpub: "Désactivé",
	guildprofil_set_blockpub: "Activé",
	guildprofil_embed_description: "`Configuration du serveur:` ${guildName} !",
	guildprofil_embed_fields_joinmessage: "Message d'arrivée",
	guildprofil_embed_fields_leavemessage: "Message de départ",
	guildprofil_embed_fields_setchannelsjoin: "Channel d'arrivée",
	guildprofil_embed_fields_setchannelsleave: "Channel de départ",
	guildprofil_embed_fields_joinroles: "Rôles d'arrivée",
	guildprofil_embed_fields_joinDmMessage: "Message DM d'arrivée",
	guildprofil_embed_fields_blockpub: "Bloquer la publicité",
	guildprofil_embed_fields_punishPub: "Sanctions de publicité",
	guildprofil_embed_fields_supportConfig: "Support",
	guildprofil_embed_fields_ticketFetched: "Tickets",
	guildprofil_embed_fields_reactionrole: "Rôle par réaction",
	guildprofil_not_logs_set: "Aucun journal de salon défini",
	guildprofil_blockbot_on: "Blocage des bots activé",
	guildprofil_blockbot_off: "Blocage des bots désactivé",
	guildprofil_disable_xp: "Message désactivé",
	guildprofil_enable_xp: "Message activé",
	guildprofil_another_enable_xp:
		"Message activé pour envoi dans <#${xpChannels}>",
	guildprofil_embed_fields_blockbot: "Blocage des bots",
	guildprofil_embed_fields_logs: "Journaux",
	guildprofil_embed_fields_ranks: "Rangs",

	// /setchannels
	setchannels_not_admin:
		":x: | Tu dois etre un admin du serv bg revient après pour demander cette commande !",
	setchannels_not_specified_args:
		"Envoie un bon channel , ca ca marche pas dsl.",
	setchannels_already_this_channel_on_join: "Déja config trou dballe !",
	setchannels_confirmation_message_on_join:
		"**salon de bienvenue configuré ici !** :tada:",
	setchannels_command_error_on_join:
		"Erreur : jcrois jai pas les perms ou le channel existe po",
	setchannels_command_work_on_join:
		"Tu as configuré avec succès le module du salon de bienvenue sur <#${argsidId}>",
	setchannels_logs_embed_title_on_join: "Logs de configuration de salon",
	setchannels_logs_embed_description_on_join:
		"<@${authorId}> a configuré le module de salon de bienvenue sur : <#${argsidId}>",
	setchannels_already_this_channel_on_leave:
		"Le module est déjà configuré avec ce salon !",
	setchannels_confirmation_message_on_leave:
		"**salon de départ configuré ici !** :tada:",
	setchannels_command_error_on_leave:
		"Erreur : autorisations manquantes ou le salon n'existe pas",
	setchannels_command_work_on_leave:
		"Tu as configuré avec succès le module du salon de départ sur <#${argsidId}>",
	setchannels_logs_embed_title_on_leave: "Logs de configuration de salon",
	setchannels_logs_embed_description_on_leave:
		"<@${authorId}> a configuré le module de salon de départ sur : <#${argsidId}>",
	setchannels_already_on_off:
		"Les salons de départ et d'arrivé sont maintenant désactivé bye bye les avions",
	setchannels_command_work_on_off:
		"Ta désactivé les canaux de bienvenue et de départ !",
	setchannels_logs_embed_title_on_off: "Logs de config de salons",
	setchannels_logs_embed_description_on_off:
		"<@${authorId}> a supprimé toutes les configurations des canaux de bienvenue/départ !",
	setchannels_button_join: "Changer le salon d'arrivée batar",
	setchannels_button_leave: "Changer le salon de départ",
	setchannels_button_delete: "Supprimer la configuration",
	setchannels_embed_fields_value_join: "salon d'arrivée",
	setchannels_embed_fields_value_leave: "salon de départ",
	setchannels_not_a_text_channel:
		"${emoji_Warning_Icon} Mais t con batar? Cpa un salons textuelle bouffon !",
	setchannels_which_channel:
		"<@${authorId}> chère esclave, quelle salon est à installer ?",
	setchannels_title_embed_panel:
		"Panneau de configuration des canaux pour la configuration de la guilde",

	// /setjoindm
	setjoindm_not_admin:
		":x: | Tu devez être administrateur de ce serveur pour demander cette commande !",
	setjoindm_logs_embed_title_on_enable: "Logs SetJoinDm",
	setjoindm_logs_embed_description_on_enable:
		"<@${authorId}> a configuré le message de bienvenue en DM !",
	setjoindm_not_specified_args_on_enable:
		"Tu devez spécifier un message valide pour ton message de bienvenue en DM.",
	setjoindm_confirmation_message_on_enable:
		"Tu as configuré avec succès le message de bienvenue en DM à : ```${dm_msg}``` et l'avez activé.",
	setjoindm_command_error_on_enable:
		"Erreur : autorisations manquantes ou le salon n'existe pas",
	setjoindm_logs_embed_title_on_disable: "Logs SetJoinDm",
	setjoindm_logs_embed_description_on_disable:
		"<@${authorId}> a désactivé le message de bienvenue en DM !",
	setjoindm_confirmation_message_on_disable:
		"Tu as désactivé avec succès le message de bienvenue en DM !",
	setjoindm_command_error_on_disable:
		"Erreur : autorisations manquantes ou le salon n'existe pas",
	setjoindm_already_disable:
		"Le message de bienvenue en DM est déjà désactivé !",
	setjoindm_not_setup_ls:
		"Aucun message de bienvenue en DM n'a été configuré ici !",
	setjoindm_command_work_ls:
		"Le message de bienvenue en DM est : \n```${already_off}``` suivi dun dégage d'ici on t'aime pas",
	setjoindm_help_embed_title:
		"Aide pour définir le message de DM de bienvenue pour aceuilir les enculer sur ton serv!",
	setjoindm_help_embed_desc:
		"{memberUsername} => Le nom d'utilisateur du membre\n{memberMention} => Mentionner le membre\n{memberCount} => Nombre de membres dans la guilde\n{guildName} => Nom de la guilde\n{createdAt} => Date de création du compte en jj/mm/aaaa\n{accountCreationTimestamp} => Le timestamp de la date de création du compte",
	setjoindm_buttom_set_name: "Définir le Message",
	setjoindm_buttom_delete_name: "Supprimer le Message DM",
	setjoindm_awaiting_response:
		"Écrivez le nouveau message de bienvenue personnalisé par DM dans le salon.",

	// /setjoinmessage
	setjoinmessage_not_admin:
		":x: | Tu dois etre un admin du serv bg revient après pour demander des commandes de configuration !",
	setjoinmessage_help_embed_title: "Aide pour /setjoinmessage !",
	setjoinmessage_help_embed_description:
		"/setjoinmessage <Power on /Power off/Show the message set> <join message>",
	setjoinmessage_help_embed_fields_name: "Comment utiliser ?",
	setjoinmessage_help_embed_fields_value:
		"Utilisez ```/setjoinmessage <Power on /Power off/Show the message set> <message>```\n{user} = Nom d'utilisateur du membre\n{membercount} = nombre de membres du serveur\n{createdat} = date de création du compte membre\n{guild} = le nom du serveur\n{inviter} = le nom d'utilisateur et le discriminateur de l'invitant\n{invites} = le nombre d'invs envoyées par l'invitant",
	setjoinmessage_logs_embed_title_on_enable: "Logs de SetJoinMessage",
	setjoinmessage_logs_embed_description_on_enable:
		"<@${authorId}> a défini le message de bienvenue !",
	setjoinmessage_command_work_on_enable:
		"${emoji_GreenTick}  | Message de bienvenue personnalisé défini avec succès.",
	setjoinmessage_logs_embed_title_on_disable: "Logs de SetJoinMessage",
	setjoinmessage_logs_embed_description_on_disable:
		"<@${authorId}> a supprimé le message de bienvenue !",
	setjoinmessage_command_work_on_disable:
		"${emoji_Yes} | Message de bienvenue personnalisé supprimé avec succès.",
	setjoinmessage_command_work_ls: "Le message de bienvenue est :",
	setjoinmessage_help_embed_fields_custom_name: "Message Personnalisé",
	setjoinmessage_help_embed_fields_custom_name_empy: "Non défini !",
	setjoinmessage_help_embed_fields_default_name_empy: "Message par Défaut",
	setjoinmessage_help_embed_desc:
		"{memberUsername} => Le nom d'utilisateur du membre\n{memberMention} => Mentionner le membre\n{inviterUsername} => Le nom de l'invitant\n{inviterMention} => Mentionner l'invitant\n{memberCount} => Nombre de membres dans la guilde\n{invitesCount} => Nombre d'invs de l'invitant\n{guildName} => Le nom de la guilde\n{createdAt} => Date de création du compte en JJ/MM/AAAA\n{accountCreationTimestamp} => Le timestamp de la date de création du compte",
	setjoinmessage_button_set_name: "Définir le message",
	setjoinmessage_buttom_del_name: "Message par défaut",
	setjoinmessage_awaiting_response: "Écrivez le message de bienvenue.",
	setjoinmessage_image_default_text:
		"Bienvenue {memberUsername} sur {guildName}<br>Nous sommes maintenant {memberCount} dans le serveur",
	setjoinmessage_change_image_button_title: "Changer l'image",
	setjoinmessage_default_image_button_title: "Image par défaut",
	setjoinmessage_var_enable_image: "Activer l'image",
	setjoinmessage_var_disable_image: "Supprimer l'image",
	setjoinmessage_var_image_card: "Carte de Message de Bienvenue",
	setjoinmessage_change_image_propreties_background: "Changer le Fond",
	setjoinmessage_change_image_propreties_frame_color:
		"Changer la Couleur du Cadre Rond",
	setjoinmessage_change_image_propreties_text_colour:
		"Changer la Couleur du Texte",
	setjoinmessage_change_image_propreties_text_message:
		"Changer le Message Texte",
	setjoinmessage_change_image_propreties_text_size:
		"Changer la Taille du Texte",
	setjoinmessage_change_image_propreties_avatar_size:
		"Changer la Taille de l'Avatar",
	setjoinmessage_modal_fields_background_url: "URL de l'image de fond",
	setjoinmessage_change_image_menu_frame_color_profil:
		"Basé sur la couleur du profil de l'utilisateur",
	setjoinmessage_change_image_menu_frame_status_profil:
		"Basé sur le statut de l'utilisateur",
	setjoinmessage_modal_fields_hex_color: "couleur www.color-hex.com",
	setjoinmessage_modal_fields_message: "message que vous voulez",
	setjoinmessage_var_text_size: "Taille du Texte: ",
	setjoinmessage_var_avatar_size: "Taille de l'Avatar: ",
	setjoinmessage_change_image_invalid_url:
		"URL d'image invalide. Veuillez essayer avec un autre fournisseur d'images.",

	// /setjoinroles
	setjoinroles_var_none: "Aucun",
	setjoinroles_var_perm_admin: "Administrateur en surpoid",
	setjoinroles_var_perm_manage_guild: "Gérer le serveur",
	setjoinroles_var_perm_manage_role: "Gérer les rôles",
	setjoinroles_var_perm_use_mention:
		"Utiliser @everyone @here et pinguer des rôles",
	setjoinroles_var_perm_ban_members: "Bannir des membres",
	setjoinroles_var_perm_kick_members: "Expulser des membres",
	setjoinroles_var_perm_manage_webhooks: "Gérer les webhooks",
	setjoinroles_var_perm_manage_channels: "Gérer les canaux",
	setjoinroles_var_perm_manage_expression:
		"Gérer les emojis, stickers et soundboard",
	setjoinroles_var_perm_view_monetization_analytics:
		"Voir la monétisation et les analyses du créateur",
	setjoinroles_var_perm_issue:
		"Je n'ai pas la permission de gérer les rôles.",
	setjoinroles_var_timesup: "Temps écoulé pour la sélection de rôles.",
	setjoinroles_warn_dangerous_perm:
		"Les rôles suivants possèdent des permissions dangereuses. Voulez-vous vraiment les assigner ?",
	setjoinroles_warn_title: "Attention !",
	setjoinroles_timesup_button: "Temps écoulé !",
	setjoinroles_action_canceled: "Action annulée",
	setjoinroles_too_highter_roles:
		"Les rôles suivants ont une position plus élevée que la mienne.",
	setjoinroles_not_admin:
		":x: | Vous devez être administrateur de ce serveur pour utiliser cette commande !",
	setjoinroles_help_embed_title: "Module des rôles d'entrée",
	setjoinroles_help_embed_description:
		"Voici tous les rôles que je donne au nouveau membre.",
	setjoinroles_help_embed_fields_1_name: "Tous les rôles enregistrés",
	setjoinroles_logs_embed_title_on_enable: "Journaux des rôles d'entrée",
	setjoinroles_logs_embed_description_on_enable:
		"<@${authorId}> a défini les rôles d'entrée !",
	setjoinroles_already_on_enable:
		"Les rôles d'entrée sont déjà configurés avec ce rôle !",

	// /welcomer
	welcomer_panel_title: "Bienvenue",
	welcomer_section_placeholder: "Choisissez quoi configurer",
	welcomer_section_channels: "Salons",
	welcomer_embed_label: "Embed personnalisé",
	welcomer_text_label: "Texte",
	welcomer_embed_set_button: "Définir l'embed",
	welcomer_embed_remove_button: "Retirer l'embed",
	welcomer_embed_modal_title: "Définir un embed personnalisé",
	welcomer_embed_modal_label: "ID de l'embed (depuis le créateur d'embeds)",
	welcomer_embed_not_found:
		"Aucun embed enregistré avec l'ID `${embed_id}`. Crée-en un d'abord avec le créateur d'embeds.",
	welcomer_embed_set_ok:
		"L'embed personnalisé `${embed_id}` sera maintenant envoyé pour cet événement. Les variables comme {memberMention} sont remplacées automatiquement.",
	welcomer_embed_removed_ok:
		"Embed personnalisé retiré. Retour à la carte par défaut.",
	welcomer_text_enable_button: "Activer le texte",
	welcomer_text_disable_button: "Désactiver le texte",
	welcomer_components_enable_button: "Activer les Components",
	welcomer_components_disable_button: "Désactiver les Components",
	welcomer_render_mode_label: "Mode d'affichage",
	welcomer_render_mode_components: "Components (carte)",
	welcomer_render_mode_simple: "Message simple",

	// /setleavemessage
	setleavemessage_not_admin:
		":x: | Tu dois etre un admin du serv bg revient après pour utiliser cette commande de message de départ !",
	setleavemessage_help_embed_title: "Aide pour /setleavemessage !",
	setleavemessage_help_embed_description:
		"/setleavemessage <Activer/Désactiver/Afficher le message> <message de départ>",
	setleavemessage_help_embed_fields_name: "Comment utiliser ?",
	setleavemessage_help_embed_fields_value:
		"Utilisez ```/setleavemessage <Activer/Désactiver/Afficher le message> <message>```\n{user} = Nom d'utilisateur du membre\n{membercount} = Nombre de membres dans le serveur\n{guild} = Nom du serveur",
	setleavemessage_logs_embed_title_on_enable:
		"Logs de message de départ configuré",
	setleavemessage_logs_embed_description_on_enable:
		"<@${authorId}> a configuré le message de départ !",
	setleavemessage_command_work_on_enable:
		"${emoji_Yes} | Message de départ personnalisé configuré avec succès.",
	setleavemessage_logs_embed_title_on_disable:
		"Logs de message de départ configuré",
	setleavemessage_logs_embed_description_on_disable:
		"<@${authorId}> a supprimé le message de départ personnalisé !",
	setleavemessage_command_work_on_disable:
		"${emoji_Yes} | Message de départ personnalisé supprimé avec succès.",
	setleavemessage_command_work_ls: "Le message de départ est le suivant:",
	setleavemessage_awaiting_response: "Écrivez le nouveau message de départ.",

	// /setup
	setup_not_admin: ":x: | Tu dois être administrateur de ce serveur !",
	setup_command_work: "${emoji_Yes} | Configuration du salon terminée.",
	setup_command_error:
		"Le bot a déjà configuré les salons de logs ! Ou le bot n'a pas la permission...",

	// /setlogschannel
	setlogschannel_not_admin:
		":x: | Tu dois être administrateur de ce serveur pour exécuter cette commande !",
	setlogschannel_not_specified_args:
		"Tu devez spécifier un salon valide pour ton module.",
	setlogschannel_confirmation_message:
		"${emoji_Yes} | Le salon pour les `${typeOfLogs}` est maintenant configuré par <@${authorId}> !",
	setlogschannel_already_this_channel:
		"Ce serveur a déjà ce salon pour les logs !",
	setlogschannel_already_deleted:
		"Ce serveur n'a déjà plus de `SERVER_LOGS` !",
	setlogschannel_command_error: "Erreur lors de l'exécution de la commande ?",
	setlogschannel_command_work:
		"Tu as configuré avec succès les `${typeOfLogs}` dans <#${argsidId}> !",
	setlogschannel_utils_command_work:
		"Tu as configuré avec succès les `${typeOfLogs}` dans ${argsidId} !",
	setlogschannel_command_work_on_delete:
		"Tu as supprimé avec succès tous les `SERVER_LOGS` dans **${guildName}**",
	setlogschannel_logs_embed_title: "Configuration des logs du serveur",
	setlogschannel_logs_embed_description_on_enable:
		"<@${authorId}> a configuré les `${typeOfLogs}` vers <#${argsidId}>",
	setlogschannel_logs_embed_title_on_off: "Configuration des logs du serveur",
	setlogschannel_logs_embed_description_on_off:
		"<@${authorId}> a supprimé tous les `SERVER_LOGS` dans le serveur !",
	setlogschannel_var_roles: "Logs des rôles",
	setlogschannel_var_mods: "Logs de modération",
	setlogschannel_var_voice: "Logs vocaux",
	setlogschannel_var_msg: "Logs des messages",
	setlogschannel_var_boost: "Logs de Boost",
	setlogschannel_var_tickets: "Logs des Tickets",
	setlogschannel_var_antispam: "Logs AntiSpam",
	setlogschannel_var_channel: "Logs du canal",
	setlogschannel_var_confession: "Logs des confessions",
	setlogschannel_all_already_exist:
		"Tous les salons de logs sont déjà configurés !",
	setlogschannel_var_economy: "Logs d’économie",

	// /join-ghostping add
	joinghostping_add_already_set:
		"Le salon ${channel} est déjà défini Mtn je vais pouvoir ping ptdr!",
	joinghostping_add_sent_to_channel:
		"Désormais, lorsque qu'un membre rejoint la guilde, j'enverrai un ghostping **ici**.",
	joinghostping_add_ok_embed_title: "Module Join GhostPing",
	joinghostping_add_ok_embed_desc:
		"Désormais, à chaque fois qu'un membre rejoint la guilde, j'enverrai un ghost ping dans ce salon !",
	joinghostping_add_ok_embed_fields_name: "Tous les canaux enregistrés",
	joinghostping_add_logs_embed_title: "Logs de Join GhostPing",
	joinghostping_add_logs_embed_desc:
		"${author} a ajouté ${channel} au Module Join GhostPing !",

	// /join-ghostping remove
	joinghostping_remove_isnt_set: "Le salon ${channel} n'est pas défini !",
	joinghostping_remove_ok_embed_desc:
		"Le salon a été supprimé du module Join GhostPing !",
	joinghostping_remove_logs_embed_desc:
		"${author} a supprimé ${channel} du module Join GhostPing !",

	// /automod
	automod_panel_title: "Panneau de contrôle AutoMod",
	automod_panel_desc:
		"Configurez chaque règle AutoMod iHorizon : activez ou désactivez-les, définissez leur canal de logs et choisissez les rôles pouvant les contourner.",
	automod_panel_overview_title: "Règles protégées",
	automod_panel_select_placeholder: "Sélectionnez une règle à configurer",
	automod_panel_label_logs: "Canal des logs",
	automod_panel_label_bypass: "Rôles de contournement",
	automod_panel_label_mention_limit: "Limite de mentions",
	automod_panel_rule_spam_name: "Spam de messages",
	automod_panel_rule_spam_desc:
		"Bloque le flood et les messages répétés sur le serveur.",
	automod_panel_rule_mass_mention_name: "Mentions de masse",
	automod_panel_rule_mass_mention_desc:
		"Bloque les messages contenant un nombre abusif de mentions.",
	automod_panel_rule_antipub_name: "Liens & publicités",
	automod_panel_rule_antipub_desc:
		"Bloque les liens publicitaires, avec une liste blanche sûre (GitHub, Tenor, YouTube, ...).",
	automod_panel_rule_media_name: "Invitations Discord",
	automod_panel_rule_media_desc:
		"Bloque les liens d'invitation aux serveurs Discord envoyés dans les messages.",
	automod_panel_rule_telegram_name: "Liens Telegram",
	automod_panel_rule_telegram_desc:
		"Bloque les liens Telegram (t.me, telegram.me, tg://...).",
	automod_panel_logs_placeholder:
		"Sélectionnez le canal recevant les logs de cette règle",
	automod_panel_bypass_placeholder:
		"Sélectionnez les rôles contournant cette règle",
	automod_panel_enable_button: "Activer",
	automod_panel_disable_button: "Désactiver",
	automod_panel_back_button: "Retour",
	automod_panel_refresh_button: "Rafraîchir",
	automod_panel_close_button: "Fermer le panneau",
	automod_panel_rule_enabled: "La règle **${rule}** est désormais activée !",
	automod_panel_rule_disabled:
		"La règle **${rule}** est désormais désactivée !",
	automod_panel_bypass_saved:
		"Les rôles de contournement de **${rule}** ont été mis à jour !",
	automod_panel_logs_saved:
		"Les logs de **${rule}** sont désormais envoyés dans ${channel}.",
	automod_panel_logs_reset: "Le canal de logs de **${rule}** a été retiré !",
	automod_panel_api_error:
		"Je n'ai pas pu appliquer ce changement, vérifie que j'ai la permission `Gérer le serveur` et que les règles AutoMod par défaut de Discord sont désactivées, puis réessaie.",

	// /guildconfig block too-new-account
	too_new_account_dont_specified_time_on_enable:
		"Vous n'avez pas spécifié de délai. Pour activer ce module, un âge minimum du compte est requis !",
	too_new_account_invalid_time_on_enable:
		"Le délai que vous avez entré n'est pas valide ! **Exemple de délai valide** : `3h ; 30m ; 2mo ; 4w ; 4y` -> 3 heures ; 30 minutes ; 2 mois ; 4 semaines ; 4 ans",
	too_new_account_logEmbed_title: "Module TooNewAccount",
	too_new_account_logEmbed_desc_on_enable:
		"${author} a activé le module TooNewAccount. Les comptes nécessitent désormais un âge minimum de ${beautifulTime}, si l'utilisateur rejoins plus de `${maxJoin}` fois, il se feras bannir.",
	too_new_account_command_work_on_enable:
		"${author}, les nouveaux membres rejoignant **${guildName}** avec des comptes âgés de moins de `${beautifulTime}` seront désormais expulsés.",
	too_new_account_command_work_on_enable2:
		"\n-#  ${emoji_Sparkles} Après que le compte rejoins le serveur **`${maxJoin}`** fois, il se feras donc bannir.",
	too_new_account_logEmbed_desc_on_disable:
		"${author} a désactivé le module !",
	too_new_account_command_work_on_disable:
		"${author}, le module a été désactivé avec succès. La date de création des comptes des nouveaux membres ne sera plus vérifiée.",

	// /guildconfig set-bot footer-name
	guildconfig_setbot_footername_footer_too_long_msg:
		"Le pied de page du bot est trop long, il sera trop laid à afficher.",
	guildconfig_setbot_footername_is_good:
		"Changé avec succès, tous les embeds iHorizon utiliseront `${footerName}` comme pied de page!",
	guildconfig_setbot_footername_is_reset:
		"Le nom du pied de page a été supprimé. Désormais, toutes les intégrations iHorizon utiliseront le `nom du bot`.",
	guildconfig_setbot_footername_not_found:
		"Le nom du pied de page est introuvable. Veuille réessayer !",

	// /guildconfig set-bot footer-pfp
	guildconfig_setbot_footeravatar_is_good:
		"Changé avec succès, tous les embeds d'iHorizon utiliseront `l'image` comme footer!",
	guildconfig_setbot_footeravatar_incorect:
		"Le fichier ne correspond pas à une image. Veuille réessayer avec une image.",
	guildconfig_setbot_footeravatar_is_reset:
		"L'avatar du pied de page a été supprimé. Désormais, toutes les intégrations iHorizon utiliseront l'`avatar du bot`.",

	// /guildconfig set-bot prefix
	guildconfig_setbot_prefix_prefix_now_mention:
		"Le préfixe du bot pour les commandes est maintenant mention! `@Ping-Me`",
	guildconfig_setbot_prefix_prefix_specify_prefix:
		"Vous devez spécifier le préfixe du bot.",
	guildconfig_setbot_prefix_prefix_too_long:
		"Le préfixe du bot est trop long, il sera trop difficile à utiliser.",
	guildconfig_setbot_prefix_prefix_is_good:
		"Le préfixe du bot a été changé avec succès, maintenant les commandes sont utilisables avec: `${formatedPrefix}`.",

	// /guildconfig config save
	guildconfig_config_save_check_dm:
		"Veuille consulter vos DM. Si vous n'avez pas reçu le message, vérifiez si vous acceptez les DM.",
	guildconfig_config_save_user_msg:
		"Voici la sauvegarde des configurations de `${guildName}` !",
	guildconfig_config_save_user_msg_2:
		"Voici le lien pour télécharger la sauvegarde du serveur !\n",

	// /guildconfig config restore
	guildconfig_config_restore_err_msg:
		"Il y a eu une erreur lors du téléchargement du fichier.",
	guildconfig_config_restore_msg:
		"Les données ont été enregistrées dans ma base de données.",
	guildconfig_config_restore_wrong_guild:
		"Cette sauvegarde n'appartient pas à ce serveur ou n'est pas valide, elle n'a donc pas été restaurée.",

	// /perm add
	perm_add_args_error:
		"Vous n'avez pas spécifié les commandes à modifier ou la permission à définir.",

	// /perm list
	perm_list_embed_title: "Permissions de tous les utilisateurs :",
	perm_list_unknown_user: "Utilisateur inconnu (ID : ${userId})",
	perm_list_no_user: "Utilisateur non trouvé",
	var_command: "Commande",
	var_subcommand: "Sous-commande",
	var_subcommand_group: "Groupe de sous-commandes",
	var_unreachable_command: "Commande non trouvée",
	perm_list_no_command_set:
		"Il n'y a pas de commande avec des permissions spécifiques définies dans ce serveur !",

	// /perm set
	perm_set_deleted: "${user} a eu sa permission **supprimée** !",
	perm_set_ok: "${user} a vu sa permission changée en **`${perm}`**",
	perm_set_warn_message:
		"${author}, vous ne pouvez pas donner des permissions supérieures ou égales aux vôtres !",
	perm_set_chng_perm_lvl: "Niveau de permission modifié",
	perm_set_add_role: "Rôle ajouté",
	perm_set_add_usr: "Utilisateur ajouté",
	perm_rmv_role: "Rôle supprimé",
	perm_rmv_usr: "Utilisateur supprimé",
	perm_set_command_reset: "Cette commande a été réinitialisée",
	perm_set_no_modified: "Aucune permission modifiée",
	perm_command_delete_dont_exist:
		"La commande spécifiée n'a aucune permission définie.",
	perm_command_delete_command_deleted:
		"Permissions supprimées pour la commande : `${commands}`",
	perm_command_delete_specify_command:
		"Vous devez spécifier une commande pour supprimer ses permissions.",
	perm_command_delete_all_one:
		"Vous devez spécifier une option pour supprimer une permission.",
	perm_command_delete_all_one_option:
		"Vous ne pouvez spécifier qu'une seule option pour supprimer une permission.",
	perm_command_delete_all_zero_change:
		"Le type de permission que vous avez spécifié n'a été utilisé dans aucune commande.",
	perm_command_delete_all_command_ok:
		"\n**${changeCount}** permissions imbriquées de type `${type}` (${value}) ont été supprimées avec succès de la base de données.",
	commandlimit_current_value: "${count} use(s) per ${time}",
	commandlimit_invalid_value:
		"The values provided for the command rate limit are invalid.",
	commandlimit_missing_command: "You need to specify a command.",
	commandlimit_set_success:
		"The rate limit for `${command}` has been set to `${limit}`.",
	commandlimit_reset_success:
		"The rate limit for `${command}` has been reset.",
	commandlimit_reset_missing: "No rate limit is configured for `${command}`.",
	commandlimit_list_title: "Configured command rate limits",
	commandlimit_list_item: "- `${command}`: ${limit}",
	commandlimit_list_empty:
		"No command rate limit is configured in this guild.",
	commandlimit_rate_limited:
		"You have reached the limit for this command. Try again in ${time}.",

	// /perm roles
	perm_roles_created_role: "Les rôles suivants ont été créés : ${roles}",
	perm_roles_already_upate: "Tous les rôles existent déjà et sont à jour.",
	perm_roles_error:
		"Une erreur s'est produite lors de la création ou de la mise à jour des rôles.",
	perm_roles_not_owner:
		"Seul le propriétaire du serveur peut ajouter des rôles de niveau de permission.",

	// /perm edit-roles
	perm_edit_roles_command_ok:
		"La permission ${permName} a vu son rôle modifié pour ${strRole}",

	// /toggle-react
	toggle_react_command_work:
		"<@${authorId}>, maintenant quand un membre envoie un message de bienvenue, le bot **{activeMsg}**",
	toggle_react_doesnt_react: "ne réagira plus",
	toggle_react_react: "réagira",

	// /remove-react
	remove_react_command_work:
		"<@${authorId}>, maintenant quand un membre envoie `${message}`, le bot **ne réagis plus**.",

	// /add-react
	add_react_command_err_emojis:
		"L'émoji `{emoji}`de la réaction ne correspond pas à un émojis !",
	add_react_command_err_message:
		"Tu dois préciser le message qui déclenchera la réaction !",
	add_react_command_bad_word:
		"Ce mot ne peut pas servir de réaction automatique : il ne doit pas contenir de point.",
	add_react_command_work:
		"<@${authorId}>, maintenant quand un membre envoie `${message}`, le bot **réagis** avec {emoji}",

	// /list-react
	list_react_nothing_found:
		"Aucune donnée a été trouvé, Veuille en ajouter avant.",
	list_react_embed_msg:
		"Quand une personne envoie **`${key}`**, je **réagirais** avec ${value}\n",

	// /autoreact
	autoreact_embed_title: "Configuration des Réactions Automatiques",
	autoreact_embed_desc:
		"Lorsqu'un nouveau message est envoyé dans le salon spécifié, le bot réagira avec les emojis spécifiés.",
	autoreact_embed_autofields_value: "Réaction : ${reaction}",
	autoreact_embed_autofields_none_value:
		"Aucune configuration de réaction automatique définie.",
	autoreact_embed_footer:
		"Page ${currentPage} sur ${totalPage} • Réactions totales : ${totalReact}",
	autoreact_btn_add_name: "Ajouter un salon",
	autoreact_btn_remove_name: "Supprimer un salon",
	autoreact_max_25:
		"Un maximum de 25 configurations de réactions automatiques peut être défini.",
	autoreact_menu_add_place: "Sélectionnez un salon à ajouter",
	autoreact_awaiting1_msg:
		"Veuille prendre un salon à ajouter au module de réactions automatiques.",
	autoreact_modal_title: "Configuration des Réactions Automatiques",
	autoreact_modal_fields1_label: "La réaction (emoji)",
	autoreact_invalid_emoji: "Emoji invalide. Veuille entrer un emoji valide.",
	autoreact_add_command_ok:
		"La configuration des réactions automatiques a été définie.",
	autoreact_remove_not_found:
		"Aucune configuration de réactions automatiques définie.",
	autoreact_menu_remove_place: "Sélectionnez un salon à supprimer",
	autoreact_awaiting_remove_msg:
		"Veuille prendre un salon à supprimer du module de réactions automatiques.",
	autoreact_remove_command_ok:
		"La configuration des réactions automatiques pour ce salon a été supprimée.",

	// Member Count commands
	// /setmembercount

	// /setmembercount
	setmembercount_not_admin:
		":x: | Tu devez être administrateur de ce serveur pour utiliser les commandes de configuration !",
	setmembercount_helpembed_title:
		"Aide pour la configuration du nombre de membres !",
	setmembercount_helpembed_description:
		"/membercount <Activer / Désactiver> <Nom du salon>",
	setmembercount_helpembed_fields_name: "Comment l'utiliser ?",
	setmembercount_helpembed_fields_value:
		"{MemberCount} = nombre de membres sur le serveur\n{RolesCount} = nombre de rôles\n{BotCount} = nombre de bots sur le serveur\n{ChannelCount} = nombre de salons sur le serveur\n{BoostCount} = nombre de boosts sur le serveur\n{VoiceCount} = nombre total de membres dans les salons vocaux sur le serveur\n{OnlineCount} = nombre total de membres en ligne sur le serveur",
	setmembercount_logs_embed_title_on_enable:
		"Logs de configuration du nombre de membres",
	setmembercount_logs_embed_description_on_enable:
		"<@${authorId}> a activé le nombre de membres dans <#${channelId}> avec le message ${messagei} !",
	setmembercount_command_work_on_enable:
		"${emoji_Yes} | Configuration du nombre de membres activée avec succès.",
	setmembercount_command_work_on_disable:
		"${emoji_Yes} | Configuration du nombre de membres supprimée avec succès.",
	setmembercount_logs_embed_title_on_disable:
		"Logs de configuration du nombre de membres",
	setmembercount_logs_embed_description_on_disable:
		"<@${authorId}> a supprimé le nombre de membres de ce serveur !",

	// Music commands
	// /p, /loop, /nowplaying, /pause, /resume, /skip, /stop, /queue, /shuffle

	music_cannot:
		"${emoji_No} Vous devez être dans le même canal vocal que moi pour utiliser cette commande !",

	// /p
	p_not_in_voice_channel:
		"Tu devez être connecté à un voc pour utiliser cette commande !",
	p_embed_title: "Aucun résultat",
	p_not_allowed:
		"Le lien que tu as envoyé n'est pas pris en charge par ce bot. Veuille utiliser les services de streaming audio autorisés tels que Deezer, Spotify, Soundcloud etc.",
	p_attachment_too_large:
		"${emoji_No} Le fichier joint dépasse la limite de 10MB, impossible de le lire.",

	// /loop
	loop_no_queue: "Il n'y a pas de file d'attente !",
	loop_command_work: "{mode} | Mode de boucle mis à jour",

	// /nowplaying
	nowplaying_no_queue: "Il n'y a rien qui joue actuellement",
	nowplaying_message_embed_title: "En train de jouer",
	nowplaying_resume_button: "${author} **reprend** la musique !",
	nowplaying_pause_button: "${author} **met en pause** la musique !",
	nowplaying_lyrics_button:
		"Les paroles de cette chanson n'ont pas été trouvées",
	nowplaying_stop_buttom: "${author} **arrête** la musique !",
	nowplaying_header: "En lecture dans ${channel}",
	nowplaying_requested_by: "Demandé par ${user}",
	nowplaying_paused: "En pause",
	nowplaying_live: "Diffusion en direct",
	nowplaying_volume: "Volume ${volume}%",
	nowplaying_loop_off: "Boucle désactivée",
	nowplaying_loop_track: "Boucle sur le titre",
	nowplaying_loop_queue: "Boucle sur la file",
	nowplaying_queue_count: "${count} dans la file",
	nowplaying_up_next: "À suivre : ${track}",
	nowplaying_queue_end: "Dernier titre de la file",
	nowplaying_ended: "Ce titre n'est plus en cours de lecture.",
	nowplaying_button_pause: "Pause",
	nowplaying_button_resume: "Reprendre",
	nowplaying_button_skip: "Passer",
	nowplaying_button_stop: "Arrêter",
	nowplaying_button_lyrics: "Paroles",
	nowplaying_button_open: "Ouvrir",
	nowplaying_skip_button: "${author} **passe** le titre !",
	nowplaying_loop_button: "${author} a changé le mode boucle : **${mode}**",

	// /pause
	pause_no_queue: "${emoji_Warning_Icon} - Tu n'est pas dans un voc !",
	pause_nothing_playing: "Il n'y a rien qui est en train d'être joué",
	pause_var_paused: "en pause",
	pause_var_err: "quelque chose a mal tourné",

	// /resume
	resume_nothing_playing: "Il n'y a rien en train de jouer",
	resume_command_work: "Reprise de la lecture avec succès",

	// /skip
	skip_not_in_voice_channel:
		"${emoji_Warning_Icon} - Tu n'est pas dans un voc chacal !",
	skip_nothing_playing:
		"Il n'y a rien qui est en train de jouer par ce que ta vie c'est dla merde chef",
	skip_command_work: "Piste passée : {queue}",

	// /stop
	stop_nothing_playing: "Il n'y a rien qui joue actuellement.",
	stop_command_work:
		"La file d'attente a été arrêtée. (j'éspère les autres membre en vocal vont te niquer ta râce)",

	// /queue
	queue_iam_not_voicec: "Je ne suis pas dans un voc",
	queue_no_queue: "Il n'y a pas de liste d'attente",
	queue_title: "La file, frère",
	queue_time_left: "encore ${duration} à se taper",
	queue_now_playing: "Ça joue",
	queue_up_next: "Après ça",
	queue_page: "Page ${page}/${pages}",
	queue_button_shuffle: "Mélange-moi ça",
	queue_button_refresh: "Rafraîchir",
	queue_jump_placeholder: "Saute direct à…",
	queue_shuffled: "${author} a **tout mélangé**, débrouillez-vous !",
	queue_jumped: "${author} a zappé jusqu'à ${track} !",

	// /shuffle
	shuffle_no_queue: "Je ne suis pas dans un voc",
	shuffle_no_enought:
		"Il n'y a pas **assez de pistes** dans la file d'attente pour mélanger",
	shuffle_command_work: "J'ai **mélangé** la file d'attente",

	// /music history
	history_no_entries: "Il n'y a aucune entrée dans cette compétition.",
	history_title: "Écouté récemment sur ${guild}",
	history_summary:
		"${count} morceaux, ${duration} de musique ces 30 derniers jours",
	history_top_artist:
		"Artiste le plus écouté : **${artist}** (${count} écoutes)",
	history_top_listener: "Le plus de demandes : ${user} (${count})",
	history_legacy_note:
		"Enregistré avant que les détails des morceaux soient conservés :",
	history_page: "Page ${page} sur ${pages}",
	history_kept: "Conservé 30 jours",
	history_button_previous: "Précédent",
	history_button_next: "Suivant",
	history_button_export: "Exporter",
	history_button_clear: "Vider",
	history_clear_confirm:
		"${emoji} Vider tout l'historique musical de ce serveur ? C'est définitif.",
	history_button_confirm_clear: "Vider l'historique",
	history_button_cancel: "Annuler",
	history_cleared: "${emoji} L'historique musical de ce serveur est vidé.",
	history_clear_forbidden:
		"${emoji} Il faut la permission Gérer le serveur pour vider l'historique.",
	history_not_yours:
		"${emoji} Ces boutons appartiennent à la personne qui a ouvert cet historique. Lance /music history pour avoir le tien.",
	history_export_ready:
		"${emoji} L'historique complet, du plus récent au plus ancien :",

	// /music lyrics
	lyrics_embed_title_unknown: "Titre inconnu",
	lyrics_embed_author_name_unknown: "Auteur inconnu, c'est un ptn de random",
	lyrics_not_found: "Paroles non trouvées",

	// /music clear-queue
	clear_queue_command_ok:
		"${emoji_Security} | La file d'attente musicale de ce serveur Discord a été vidée.",

	// /music trackinfo
	music_lyrics: "Paroles",

	music_volume_command_ok: "${emoji_Yes} **volume réglé à** `${query}`%",

	// /music apo
	music_apo_download_failed:
		"${emoji_No} | Impossible de télécharger le fichier, réessaie.",
	music_apo_no_node:
		"${emoji_No} | Aucun nœud audio n'est connecté pour le moment.",
	music_apo_unsupported:
		"${emoji_No} | Ce nœud audio ne gère pas les filtres APO (il faut Wavyzon avec le plugin `apo`).",
	music_apo_invalid:
		"${emoji_No} | Le nœud audio a refusé cette configuration : `${error}`",
	music_apo_warnings: "Lignes ignorées (${count}) :",

	// Giveaway commands
	// /end, /start, /reroll

	// /end
	end_not_admin:
		"Tu devez avoir les permissions pour gérer les messages afin de terminer ce giveaway.",
	end_not_find_giveaway: "Impossible de trouver un giveaway pour ${gw}.",
	end_confirmation_message:
		"Le giveaway se terminera dans moins de (${timeEstimate}) secondes...",
	end_logs_embed_title: "Logs des giveaways",
	end_logs_embed_description:
		"<@${authorId}> a terminé le giveaway avec l'identifiant : ${messageId}",
	end_command_error: "Ce giveaway est déjà terminé !",

	// /start
	start_not_perm:
		"Tu devez avoir les autorisations pour gérer les messages afin de commencer les giveaways.",
	start_is_not_valid: "Tu devez spécifier un nombre valide de gagnants !",
	start_confirmation_command: "Giveaway démarré dans ${giveawayChannel} !",
	start_logs_embed_title: "Logs des Giveaways",
	start_logs_embed_description:
		"<@${authorId}> a lancé un giveaway dans : ${giveawayChannel}",
	start_time_not_valid:
		"${author}, la durée du giveaway que tu as spécifiée n'est pas valide, Veuille réessayer !",
	start_invalid_invites_req_value:
		"${emoji_No} | La valeur pour 'invites' est invalide! Il faut mettre un nombres. X invites pour rentrer dans le giveaway!",
	start_invalid_messages_req_value:
		"${emoji_No} | La valeur pour 'messages' est invalide! Il faut mettre un nombres. X messages pour rentrer dans le giveaway!",
	start_invalid_roles_req_value:
		"${emoji_No} | Le roles pour la valeur 'roles' est introuvable! Il faut mettre un identifiant de rôle. <roleId> pour rentrer dans le giveaway!",

	// /reroll
	reroll_not_perm:
		"Tu devez avoir les permissions pour gérer les messages pour relancer ce giveaway.",
	reroll_dont_find_giveaway: "Impossible de trouver un giveaway pour {args}.",
	reroll_command_work: "Giveaway relancé !",
	reroll_logs_embed_title: "Logs des Giveaways",
	reroll_logs_embed_description:
		"<@${authorId}> a relancé le giveaway avec cet ID : ${messageId}",
	reroll_command_error: "Erreur !",
	reroll_giveaway_not_over: "Ce Giveaways n'est pas terminé ptn t con!",

	// /get-all
	gw_getall_embed_title: "Liste des Giveaway(s) pour ${guildName}",
	gw_getall_embed_fields:
		"${Channel}[Voir ici](${MessageURL}) \n**Expire dans** ${ExpireIn}",

	// /get-data
	gw_getdata_embed_title: "Informations sur le Giveaway !",
	gw_getdata_embed_fields_channel: "Chaîne",
	gw_getdata_embed_fields_amountWinner: "Nombre de Gagnants",
	gw_getdata_embed_fields_value_amountWinner: "`${winnerCount}` gagnant(s)",
	gw_getdata_embed_fields_prize: "Prix",
	gw_getdata_embed_fields_value_prize: "`${prize}`",
	gw_getdata_embed_fields_hostedBy: "Organisé par",
	gw_getdata_embed_fields_isEnded: "Est terminé ?",
	gw_getdata_embed_fields_isValid: "Est valide ?",
	gw_getdata_embed_fields_time: "Se termine à",
	gw_getdata_embed_fields_entriesAmount: "Nombre d'entrées",
	gw_getdata_embed_fields_winners: "Gagnant(s)",
	gw_getdata_embed_fields_value_entriesAmount:
		"**${entries}** (utilisez `/gw list-entries giveaway-id:${giveawayId}` pour plus d'informations)",
	gw_getdata_yes: "`Oui`",
	gw_getdata_no: "`Non`",
	gw_doesnt_exit:
		"Les cadeaux sont inaccessibles ou n'existent pas. rohhh nike sa mère voilà",

	// /go
	gw_go_panel_title: "Panel de Giveaway",
	gw_go_panel_desc:
		"Prépa ton giveaway ci-dessous, puis balance-le. Utilise les menus pour modifier chaque réglage.",
	gw_go_select_placeholder: "Modifier un réglage",
	gw_go_opt_prize: "Prix",
	gw_go_opt_duration: "Durée",
	gw_go_opt_winners: "Gagnants",
	gw_go_opt_requirement: "Prérequis de participation",
	gw_go_opt_image: "Image de prévisualisation",
	gw_go_channel_placeholder: "Salon du giveaway",
	gw_go_launch_buttontitle: "Lancer",
	gw_go_cancel_buttontitle: "Annuler",
	gw_go_req_none: "Aucun",
	gw_go_req_invites: "Invitations",
	gw_go_req_messages: "Messages",
	gw_go_req_roles: "Rôles",
	gw_go_req_value_dsc: "Valeur requise : **${value}**",
	gw_go_started: "Le giveaway a été lancé dans ${channel} !",
	gw_go_cancelled: "Panel fermé, rien a été lancé.",
	gw_go_expired: "Le panel a expiré avant que le giveaway soit lancé.",
	gw_go_need_prize:
		"${emoji_No} | Faut définir un prix avant de lancer le giveaway !",
	gw_go_need_duration:
		"${emoji_No} | Faut définir une durée valide avant de lancer le giveaway !",
	gw_go_need_winners:
		"${emoji_No} | Faut définir un nombre de gagnants valide avant de lancer le giveaway !",
	gw_go_channel_error:
		"${emoji_No} | Le salon sélectionné peut pas recevoir de message !",
	gw_go_invalid_image: "${emoji_No} | Ce lien d'image est pas valide !",
	gw_go_modal_prize: "Définir le prix",
	gw_go_modal_prize_label: "Prix",
	gw_go_modal_duration: "Définir la durée",
	gw_go_modal_duration_label: "Durée (par exemple : 2d ou 12h30)",
	gw_go_modal_winners: "Définir le nombre de gagnants",
	gw_go_modal_winners_label: "Nombre de gagnants",
	gw_go_modal_req_title: "Prérequis de participation",
	gw_go_modal_req_type_label: "Type de prérequis",
	gw_go_modal_req_value_label: "Valeur du prérequis (ID de rôle ou nombre)",
	gw_go_modal_image: "Définir l'image de prévisualisation",
	gw_go_modal_image_label: "Lien de l'image",

	// Moderation commands
	// /ban, /kick, /clear, /lock, /unlock, /avatar, /lockall,
	// /unban, /tempmute, /unmute

	// /avatar

	// /ban
	ban_not_permission:
		"${emoji_No} | Tu n'avez pas la permission de bannir des membres.",
	ban_dont_found_member: "🔍 | Impossible de trouver ce membre.",
	ban_dont_have_perm_myself:
		"${emoji_No} | Je n'ai pas la permission de bannir des membres !",
	ban_try_to_ban_yourself: "${emoji_No} | Tu ne peux pas tu bannir tu-même !",
	ban_attempt_ban_higter_member:
		"${emoji_Stop} Tu ne peux pas bannir un utilisateur qui a un rôle supérieur au vôtre...",
	ban_cant_ban_member: "${emoji_No} | Je ne peux pas bannir ce membre.",
	ban_message_to_the_banned_member:
		"Vous avez été banni de ce serveur : `${guildName}` pour la raison: **`${reason}`**",
	ban_command_work: "<@${memberId}> a été banni par <@${authorId}>.",
	ban_logs_embed_title: "Logs de bannissement",
	ban_logs_embed_description:
		"<@${memberId}> a été banni par <@${authorId}>.",

	// /kick
	kick_not_permission:
		"${emoji_No} | Tu n'avez pas la permission d'expulser des membres.",
	kick_dont_have_permission:
		"${emoji_No} | Je n'ai pas la permission d'expulser des membres!",
	kick_attempt_kick_your_self:
		"${emoji_No} | Tu ne peux pas tu expulser tu-même!",
	kick_attempt_kick_higter_member:
		"${emoji_Stop} Tu ne peux pas expulser un utilisateur ayant un rôle supérieur au vôtre...",
	kick_message_to_the_banned_member:
		"Tu as été expulser de ce serveur : ${guildName} par ${authorUsername}",
	kick_command_work: "${member} a été expulser par ${author}",
	kick_logs_embed_title: "Logs du Kick",
	kick_logs_embed_description: "${member} a été kick par <@${authorId}>",

	// /clear
	clear_dont_have_permission:
		"${emoji_No} | Tu n'avez pas la permission MANAGE_MESSAGES.",
	clear_max_message_limit:
		"${emoji_No} | Je ne peux pas supprimer plus de 99 messages à la fois !",
	clear_channel_message_deleted: "${messageCount} messages supprimés !",
	clear_confirmation_message: "${messageCount} messages ont été supprimés !",
	clear_logs_embed_title: "Logs de suppression de messages",
	clear_logs_embed_description:
		"<@${authorId}> a supprimé ${messageCount} messages dans <#${channelId}>",
	clear_command_no_message: "Aucun message à supprimer dans ce canal",

	// /lock
	lock_embed_message_description:
		"Le salon a été verrouillé par <@${authorId}>.",
	lock_dont_have_permission:
		"${emoji_No} | Tu n'avez pas la permission de verrouiller les salons.",
	lock_logs_embed_title: "Logs de Verrouillage",
	lock_logs_embed_description:
		"<@${authorId}> a verrouillé le salon <#${channelId}>",

	// /unlock
	unlock_embed_message_description:
		"Le salon a été déverrouillé avec succès !",
	unlock_dont_have_permission:
		"${emoji_No} | Tu n'avez pas la permission de déverrouiller le salon.",
	unlock_logs_embed_title: "Journal de déverrouillage",
	unlock_logs_embed_description:
		"<@${authorId}> a déverrouillé le salon <#${channelId}>",

	// /lockall
	lockall_dont_have_permission:
		"${emoji_No} | Tu n'avez pas la permission de verrouiller tous les canaux.",
	lockall_embed_message_description:
		"Tous les canaux ont été verrouillés par <@${authorId}>.",
	lockall_logs_embed_title: "Logs de Verrouillage",
	lockall_logs_embed_description:
		"<@${authorId}> a verrouillé tous les canaux !",

	// /unlockall
	unlockall_embed_message_description:
		"Tous les canaux ont été déverrouillés par <@${authorId}>.",
	unlockall_logs_embed_title: "Logs de Déverrouillage",
	unlockall_logs_embed_description:
		"<@${authorId}> a déverrouillé tous les canaux !",

	// /unban
	unban_dont_have_permission:
		"${emoji_No} | Tu n'avez pas la permission de débannir des membres.",
	unban_bot_dont_have_permission: "${emoji_No} | Je n'ai pas la permission.",
	unban_there_is_nobody_banned:
		"${emoji_No} | **Il n'y a personne banni de ce serveur !**",
	unban_the_member_is_not_banned:
		"${emoji_No} | **L'ID indiqué n'est pas banni de ce serveur !**",
	unban_is_now_unbanned:
		"<@${userID}> est maintenant débanni de ce serveur !",
	unban_logs_embed_title: "Logs de déban",
	unban_logs_embed_description:
		"<@${userID}> a été débanni du serveur par ${authorId} !",
	unban_reason: "Aucune raison n'a été fournie. PTN",

	// /tempmute
	tempmute_dont_have_permission:
		"${emoji_No} | Tu n'avez pas la permission de temporairement rendre muet les membres.",
	tempmute_i_dont_have_permission: "${emoji_No} | Je n'ai pas la permission.",
	tempmute_cannot_mute_yourself:
		"${emoji_No} | Tu ne peux pas tu rendre muet tu-même!",
	tempmute_already_muted: "Cet utilisateur est déjà rendu muet !",
	tempmute_command_work:
		"<@${tomuteId}> a été rendu muet pendant ${duration}\n**Raison**: `${reason}`",
	tempmute_unmuted_by_time: "<@${tomuteId}> a été réactivé!",
	tempmute_logs_embed_title: "Logs de Tempmute",
	tempmute_logs_embed_description:
		"<@${authorId}> a rendu muet <@${tomuteId}> pendant ${duration}\n**Raison**: `${reason}`",
	tempmute_reason_create_roles: "Faire le rôle de mute temporaire !",
	tempmute_tomute_is_admin:
		"${emoji_No} | L'utilisateur as les permissions administrateur, je ne peux pas le mute.",
	tempmute_tomute_highest_role_or_same:
		"${emoji_No} | **Mon rôle sur ce serveur est plus bas ou égal à ${tomute}. Je ne peux pas modérer ce membre.**",
	tempmute_cannot_mute_higher_role:
		"${emoji_No} | **Le rôle de ${tomute} est supérieur ou égal au vôtre. Vous ne pouvez pas le rendre muet.**",
	moderation_target_higher_role:
		"${emoji_No} | **Le rôle de ${member} est au-dessus ou égal au tien. Tu peux pas lui faire ça.**",
	tempmute_tomute_max_time_passed:
		"\n-#  ${emoji_VC_OpenChat} Discord as une limite de 28 jours pour un mute. J'ai appliquer 28 jours.",

	// /temprole
	temprole_dont_have_permission:
		"${emoji_No} | Vous n'avez pas la permission d'ajouter des rôles temporaires aux membres.",
	temprole_i_dont_have_permission: "${emoji_No} | Je n'ai pas la permission.",
	temprole_cannot_add_yourself:
		"${emoji_No} | Vous ne pouvez pas vous ajouter un rôle temporaire à vous-même !",
	temprole_already_has_role: "Cet utilisateur a déjà ce rôle temporaire !",
	temprole_command_work:
		"<@${tomuteId}> a reçu le rôle pour ${duration}\n**Raison** : `${reason}`",
	temprole_removed_by_time:
		"Le rôle temporaire de <@${tomuteId}> a été retiré !",
	temprole_logs_embed_title: "Logs des rôles temporaires",
	temprole_logs_embed_description:
		"<@${authorId}> a ajouté un rôle temporaire à <@${tomuteId}> pour ${duration}\n**Raison** : `${reason}`",
	temprole_tomute_is_admin:
		"${emoji_No} | Cet utilisateur a les permissions administrateur, je ne peux pas lui attribuer un rôle temporaire.",
	temprole_tomute_highest_role_or_same:
		"${emoji_No} | **Mon rôle sur ce serveur est inférieur ou égal à celui de ${tomute}. Je ne peux pas modérer ce membre.**",
	temprole_tomute_max_time_passed:
		"\n-# ${emoji_VC_OpenChat} Le temps maximum pour un rôle temporaire est d'un an. J'ai appliqué un an.",

	// /unmute
	unmute_dont_have_permission:
		"${emoji_No} | Tu n'avez pas la permission de retirer temporairement la sourdine aux membres.",
	unmute_attempt_mute_your_self:
		"${emoji_No} | Tu ne peux pas tu retirer la sourdine !",
	unmute_i_dont_have_permission: "${emoji_No} | Je n'ai pas la permission.",
	unmute_not_muted: "Cet utilisateur n'est pas en sourdine !",
	unmute_muted_role_doesnt_exist:
		"Le rôle sourdine n'existe pas. Veuille d'abord mettre en sourdine l'utilisateur pour créer le rôle de sourdine...",
	unmute_command_work: "<@${tomuteId}> a été enlever de sa sourdine !",
	unmute_logs_embed_title: "Logs de sourdine",
	unmute_logs_embed_description:
		"<@${authorId}> a enlever de sa sourdine <@${tomuteId}>",
	unmuteall_no_muted_members: "Aucun membre en sourdine n'a été trouvé.",
	unmuteall_audit_reason: "Retrait de sourdine global",
	unmuteall_command_work:
		"${unmuted}/${total} membres ont été retirés de leur sourdine.",
	unmuteall_logs_embed_title: "Logs de retrait de sourdine global",
	unmuteall_logs_embed_description:
		"<@${authorId}> a retiré la sourdine de ${unmuted}/${total} membres.",

	// /warn
	warn_command_work:
		"${emoji_Yes} ${member} a été averti ! **Raison** : `${reason}`\n__ID de l'avertissement__: `${warnId}`",
	warn_logEmbed_title: "Historique des Avertissements",
	warn_logEmbed_desc:
		"${author} a averti ${member} pour la raison : `${reason}`",
	warn_dont_have_permission:
		"${emoji_No} | Vous n'avez pas la permission d'avertir un membre au seins de ce serveur discord.",

	// /unwarn
	unwarn_cannot_found:
		"${emoji_No} ${member} ne semble avoir aucun avertissement dans ma base de données !",
	unwarn_cannot_found_id:
		"${emoji_No} ${member} l'ID d'avertissement que vous avez fourni n'est pas dans ma base de données",
	unwarn_logEmbed_title: "Historique des Retraits d'Avertissements",
	unwarn_logEmbed_desc: "${author} a retiré l'avertissement de ${member}",
	unwarn_dont_have_permission:
		"${emoji_No} | Vous n'avez pas la permission de supprimer un avertissement d'un membre de ce serveur discord.",

	// /clear-allwarns
	clear_allwarns_confirmation_message:
		"**Êtes-vous vraiment sûr de vouloir supprimer toutes les données d'avertissements ? Cette action est permanente et vous ne pouvez pas l'annuler.** **Cette action est destructive!!**",
	clear_allwarns_command_ok:
		"Tous les avertissements dans ce serveur discord ont été supprimés.",

	// /warnlist
	warnlist_no_data:
		"${emoji_No} ${member} ne semble avoir aucun avertissement dans ma base de données !",
	warnlist_dont_have_permission:
		"${emoji_No} | Vous n'avez pas la permission de gérer les avertissements des membres de ce serveur discord.",

	// /baninfo
	baninfo_not_banned: "L'utilisateur n'est pas banni",
	baninfo_user_not_found: "Utilisateur non trouvé",
	var_banned_by: "Banni par",
	var_ban_date: "Date du bannissement",

	// /effacer-avertissements
	clearwarn_command_ok:
		"${emoji_Yes} ${author}, **`${allWarnCount}`** avertissement(s) de ${member} a/ont été effacé(s).",

	// /tempban
	tempban_dont_have_permission:
		"Vous n'avez pas la permission de bannir temporairement des membres.",
	tempban_i_dont_have_permission:
		"Je n'ai pas la permission de bannir des membres.",
	tempban_cannot_ban_yourself: "Vous ne pouvez pas vous bannir vous-même !",
	tempban_already_banned: "Cet utilisateur est déjà banni temporairement !",
	tempban_command_work:
		"**<@${userId}>** a été banni temporairement pour **${duration}**\n**Raison** : `${reason}`",
	tempban_unbanned_by_time: "**<@${userId}>** a été débanni !",
	tempban_logs_embed_title: "Logs de bannissement temporaire",
	tempban_logs_embed_description:
		"**<@${executorId}>** a banni temporairement **<@${userId}>** pour **${duration}**\n**Raison** : `${reason}`",
	tempban_user_is_admin:
		"L’utilisateur possède les permissions administrateur, je ne peux pas le bannir.",
	tempban_user_highest_role_or_same:
		"Mon rôle sur ce serveur est inférieur ou égal à celui de **${user}**. Je ne peux pas modérer ce membre.",
	tempban_max_time_passed:
		"\n*La durée maximale d’un bannissement temporaire est d’un an. J’ai appliqué un an.*",
	tempban_user_not_in_guild:
		"Cet utilisateur n'est pas sur le serveur mais peut tout de même être banni.",

	// Backup commands
	// /backup

	// /backup
	backup_wait_please: "⏲ Attendez s'il tu plaît...",
	backup_not_admin:
		":x: | Tu devez être administrateur de ce serveur pour demander une sauvegarde !",
	backup_i_dont_have_permission: "Je n'ai pas la permission ADMINISTRATOR",
	backup_command_work_on_creation:
		":white_check_mark: Sauvegarde créée avec succès.",
	backup_command_work_info_on_creation:
		"La sauvegarde a été créée ! ID : ${id} !",
	backup_logs_embed_title_on_creation: "Logs de la sauvegarde",
	backup_logs_embed_description_on_creation:
		"<@${authorId}> a créé une sauvegarde !",
	backup_dont_have_perm_on_load:
		":x: | Tu devez être administrateur de ce serveur pour charger une sauvegarde !",
	backup_i_dont_have_perm_on_load: "Je n'ai pas la permission ADMINISTRATOR",
	backup_unvalid_id_on_load:
		":x: | Tu devez spécifier un ID de sauvegarde valide !",
	backup_waiting_on_load: "${emoji_Yes} - Chargement en cours...",
	backup_error_on_load:
		":x: | Désolé, une erreur est survenue... Veuille vérifier que j'ai les permissions d'administrateur !",
	backup_error_when_fetch_backup_on_load:
		":x: | Aucune sauvegarde trouvée pour ${backupID} !",
	backup_this_is_not_your_backup:
		"${emoji_No} | Ce n'est pas ton sauvegarde !",
	backup_backup_doesnt_exist: "ERREUR ? La sauvegarde n'existe pas.",
	backup_string_see_v:
		":placard:・Nombre de catégories: `${categoryCount}`\n:hash:・Nombre de canaux: `${channelCount}`",
	backup_all_of_your_backup: "**Toutes tes sauvegardes :**",
	backup_string_see_another_v:
		":placard:・Nombre de catégories: `${categoryCount}`\n:hash:・Nombre de canaux: `${channelCount}`",
	backup_load_confirm:
		"${author},\n# ACTION EXTREMEMENT DANGEREUSE\n# Êtes-vous sûr de vouloir charger cette sauvegarde ?\nCela remplacera tous les salons, rôles, émojis, bannisement, configuration... actuels de votre serveur.\nC'EST UNE ACTION IRREVERSIBLE !",
	backup_not_load:
		"La sauvegarde n'a pas été chargée, l'action a été annulée sur votre demande.",

	// /backup delete
	backup_really_want:
		"${emoji_Warning_Icon} Voulez-vous vraiment supprimer cette sauvegarde ?",
	backup_confirm_button: "Oui merde, supprimer cette sauvegarde",
	backup_cancel_button: "Annuler l'action ptn",
	backup_embed_title_succefully_deleted:
		"${emoji_Yes} La sauvegarde a été supprimée avec succès !",
	backup_embed_title_cancel_deletion:
		"${emoji_Yes} La sauvegarde a été conservée ah ouais t con toi tu veut supprimer une sauvegarde pour en fait la garder!",
	backup_embed_title_timesup_deletion:
		"${emoji_No} Le délai est écoulé. La sauvegarde a été conservée !",

	// /backup manage
	backup_manage_nique_tes_mort:
		"Bha alors sale gros fils de pute de tes mort? Tu crois brain le grand bot iHorizon? tsss vas niquer ta pute de mère. insh'Allah elle ce fait renverser par ton père le chauve enfant d'fiotte. \n# Cette commande est réserver pour le propriétaire du serveur. \n# TU CROIS DÉSACTIVER LA PROTECTION DU BACKUP POUR RAID LE SERVEUR\n# SALE RETARD, LA VIE TAS PAS FAIT DE CADEAU",
	backup_manage_admin: 'tout les admins"',
	backup_manage_owner: "propriétaire du serveur",
	backup_manage_command_ok:
		"Le module de backup as subit un changement. Dorrénavant, ${allowed_user_string} peut executer une création/chargement de backup sur ce serveur.",
	// /backup panels
	backup_component_settings: "Les réglages du serv",
	backup_component_settings_desc:
		"Nom, images, niveaux, salons système, écran d'accueil, tout le bazar",
	backup_component_roles: "Les rôles",
	backup_component_roles_desc:
		"Ordre, couleurs, icônes et permissions, le kit complet",
	backup_component_channels: "Les salons",
	backup_component_channels_desc:
		"Catégories, texte, vocal, forums et fils, y'a tout frérot",
	backup_component_permissions: "Permissions des salons",
	backup_component_permissions_desc:
		"Qui a le droit de faire quoi, salon par salon",
	backup_component_emojis: "Les emojis",
	backup_component_emojis_desc:
		"Tous les emojis persos du serv, même les moches",
	backup_component_stickers: "Les stickers",
	backup_component_stickers_desc: "Les stickers fixes et ceux qui gigotent",
	backup_component_bans: "Les bans",
	backup_component_bans_desc:
		"Les gros relous bannis et pourquoi ils ont dégagé",
	backup_component_automod: "Règles AutoMod",
	backup_component_automod_desc:
		"Les règles de modération de Discord, le robot flic quoi",
	backup_component_events: "Les events",
	backup_component_events_desc: "Les events prévus sur le serv",
	backup_component_messages: "Les messages",
	backup_component_messages_desc:
		"Les 100 derniers messages de chaque salon, ragots inclus",
	backup_component_members: "Les membres",
	backup_component_members_desc: "Pseudos et rôles des membres actuels",
	backup_select_placeholder: "Choisis ce que tu veux embarquer wesh",
	backup_usage: "${count}/${max} sauvegardes utilisées, tranquille",
	backup_limit_reached:
		"Oh là frérot, t'as atteint la limite de **${max} sauvegardes**. Vire-en une avec `/backup delete` d'abord.",
	backup_busy:
		"Y'a déjà une sauvegarde qui mouline ptn, réessaie dans un instant.",
	backup_panel_expired: "Ce panneau a pris sa retraite, relance la commande.",
	backup_btn_create: "Go créer la sauvegarde",
	backup_btn_all: "Je prends tout chef",
	backup_btn_load: "Tout raser et restaurer",
	backup_btn_schedule_save: "Valider le planning",
	backup_btn_schedule_disable: "Couper ce truc",
	backup_create_title: "Nouvelle sauvegarde, let's go",
	backup_create_desc: "Choisis ce qu'on met à l'abri sur **${guildName}**.",
	backup_create_progress:
		"${emoji} Ça sauvegarde, va te chercher un café, ça peut être long...",
	backup_create_cancelled: "Sauvegarde annulée, bon ben salut.",
	backup_create_failed:
		"Oups, la sauvegarde a fait pschitt, impossible de l'enregistrer. Rien n'a été ajouté à ta liste.",
	backup_created_title: "Sauvegarde créée, gg",
	backup_created_desc:
		"L'ID de ta sauvegarde c'est `${id}`. Garde-le au chaud et utilise-le avec `/backup load`.",
	backup_created_partial:
		"**Pas réussi à sauvegarder ça, donc ça sera pas restauré :** ${parts}",
	backup_load_title: "Restaurer une sauvegarde",
	backup_load_desc: "Sauvegarde de **${guildName}**, faite le ${date}.",
	backup_load_warning:
		"**ATTENTION frérot, c'est IRRÉVERSIBLE.** Tout ce qui est sélectionné est supprimé de ce serveur, puis restauré. Les rôles sont retrouvés par leur nom et mis à jour, les membres les gardent ; ceux qui sont pas dans la sauvegarde sautent seulement si les salons sont restaurés aussi.",
	backup_load_progress:
		"${emoji} Ça restaure, ça peut prendre plusieurs minutes, touche à rien...",
	backup_load_done_title: "Sauvegarde restaurée, trop stylé",
	backup_load_done_desc: "**${guildName}** est revenu d'entre les morts.",
	backup_load_report_line: "${emoji} **${label}** : ${okCount} restauré(s)",
	backup_load_report_failed: "(${failedCount} sont partis en cacahuète)",
	backup_list_title: "Tes sauvegardes de boss",
	backup_list_empty:
		"T'as encore aucune sauvegarde ptn. Fais-en une avec `/backup create`.",
	backup_list_entry:
		"**${guildName}** · ${mode} · ${date}\n`${id}`\n${categoryCount} catégories, ${channelCount} salons",
	backup_list_manual: "À la mano",
	backup_list_auto: "Automatique",
	backup_delete_title: "Tu veux vraiment virer cette sauvegarde ?",
	backup_delete_desc:
		"**${guildName}** `${id}`\n${categoryCount} catégories, ${channelCount} salons",
	backup_delete_done: "La sauvegarde a dégagé.",
	backup_delete_cancelled: "La sauvegarde reste là, t'as eu peur hein.",
	backup_schedule_title: "Sauvegardes automatiques",
	backup_schedule_desc:
		"Elles vont sur ton compte et comptent dans ta limite. Seules les ${maxAuto} dernières sauvegardes automatiques de ce serveur sont gardées.",
	backup_schedule_owner_only:
		"Y'a que le proprio du serveur qui peut programmer des sauvegardes automatiques, désolé chef.",
	backup_schedule_status_on:
		"C'est parti : **${frequency}**, prochaine sauvegarde ${next}",
	backup_schedule_status_off:
		"Aucune sauvegarde automatique de prévue, c'est le désert.",
	backup_schedule_frequency_placeholder: "Choisis la fréquence",
	backup_frequency_1d: "Tous les jours",
	backup_frequency_3d: "Tous les 3 jours",
	backup_frequency_1w: "Toutes les semaines",
	backup_frequency_2w: "Toutes les 2 semaines",
	backup_frequency_1m: "Tous les mois",
	backup_frequency_3m: "Tous les 3 mois",
	backup_frequency_6m: "Tous les 6 mois",
	backup_frequency_12m: "Tous les ans",
	backup_schedule_dm_limit:
		"La sauvegarde automatique de **${guildName}** a sauté : t'as atteint la limite de ${max} sauvegardes frérot. Vire-en une avec `/backup delete`.",
	backup_schedule_dm_failed:
		"La sauvegarde automatique de **${guildName}** s'est vautrée. On retente à la prochaine échéance.",

	// Role Reactions
	// /reactionroles

	// /reactionroles
	reactionroles_dont_admin_added:
		":x: | Tu devez être administrateur de ce serveur pour utiliser ces commandes !",
	reactionroles_embed_message_description_added:
		"comment utiliser ?\n/rolesreaction add `<identifiant message>` `<réaction>` `<identifiant du rôle>`\n/rolesreaction remove `<identifiant message>` `<réaction>`\n/rolesreaction list `<identifiant message>`",
	reactionroles_missing_reaction_added:
		"Argument manquant : Emoji de la réaction",
	reactionroles_invalid_emote_format_added:
		"${emoji_No} | Tu ne peux pas m'envoyer un CUSTOM_EMOJI au format <::xxx> ! J'ai seulement besoin de leur identifiant !",
	reactionroles_logs_embed_title_added: "Logs des ReactionRoles",
	reactionroles_logs_embed_description_added:
		"<@${authorId}> a ajouté un ReactionRole: Message: `${messagei}` | Réaction: `${reaction}` | Rôle: ${role}",
	reactionroles_command_work_added:
		"${reaction} a été ajouté au message ${messagei} pour donner le rôle ${role}",
	reactionroles_missing_remove: "Argument manquant : Emoji de la réaction",
	reactionroles_missing_reaction_remove:
		"ReactionRole non trouvé dans ma base de données...",
	reactionroles_cant_fetched_reaction_remove:
		"Impossible de récupérer la réaction visée sur ce message !",
	reactionroles_logs_embed_title_remove: "Logs des ReactionRoles",
	reactionroles_logs_embed_description_remove:
		"<@${authorId}> a supprimé un ReactionRole: Message: `${messagei}` | Réaction: `${reaction}`",
	reactionroles_command_work_remove:
		"${reaction} a été supprimé du message ${messagei}",
	reactionroles_dont_message_found:
		"Je ne peux pas obtenir le message avec l'ID de votre message actuel, ou alors l'émojis que vous avez prendre n'est pas sur un serveur où je suis!",

	// /buttonreaction
	buttonreaction_logs_embed_title_added: "Logs de ButtonReaction",
	buttonreaction_logs_embed_description_added:
		"<@${authorId}> a ajouté une réaction avec le bouton : Message : `${messagei}` | Réaction : `${reaction}` | Rôle : ${role}",
	buttonreaction_dont_message_found:
		"Impossible d'ajouter ce bouton, les rôles semblent déjà être définis dans un des boutons existants !",
	buttonreaction_roles_not_found:
		"Arguments manquants : Vous n'avez pas spécifié les rôles à définir !",
	buttonreaction_message_other_user_error:
		"Dans Discord, le bot ne peut pas modifier les composants d'un message d'un autre utilisateur. Vous devez choisir un message envoyé par moi. Conseil : Faites `/utils embed` pour créer votre propre bel embed !",

	// /roleselect
	roleselect_invalid_message_id:
		"ID de message invalide fourni. Veuille fournir un ID de message valide.",
	roleselect_message_not_found: "Message introuvable dans le salon spécifié.",
	roleselect_default_placeholder: "prendre les rôles configurés",
	roleselect_menu1_placeholder: "Choisir une action",
	roleselect_menu1_add: "Ajouter une option de rôle",
	roleselect_menu1_remove: "Supprimer une option de rôle",
	roleselect_menu1_change_placeholder: "Modifier le texte du menu",
	roleselect_menu1_save: "Enregistrer et appliquer la configuration",
	roleselect_menu1_cancel: "Annuler",
	roleselect_menu1_embed_title: "Configuration de sélection de rôle",
	roleselect_menu1_embed_description:
		"Lorsque l'utilisateur sélectionne des options dans le menu, il recevra le rôle spécifié.",
	roleselect_modal1_title: "Ajouter une option de rôle",
	roleselect_modal1_fields1_label: "Emoji",
	roleselect_modal1_fields1_placeholder:
		"Sélectionnez un emoji pour cette option de rôle (facultatif)",
	roleselect_modal1_fields2_label: "Titre de l'option",
	roleselect_modal1_fields2_placeholder: "Titre court pour l'option de rôle",
	roleselect_modal1_fields3_label: "Description",
	roleselect_modal1_fields3_placeholder:
		"Décrire l'option de rôle (facultatif)",
	roleselect_awaiting1_msg: "Sélectionnez un rôle pour cette option",
	roleselect_awaiting1_menu_placeholder: "Choisissez un rôle",
	roleselect_role_already_exist: "Le rôle existe déjà dans la configuration.",
	roleselect_no_role_found: "Aucune option de rôle à supprimer.",
	roleselect_all_role_removed:
		"Toutes les options de rôle ont été supprimées.",
	roleselect_last_role_removed:
		"La dernière option de rôle a été supprimée avec succès.",
	roleselect_save_command_ok:
		"Configuration de sélection de rôle enregistrée avec succès !",
	roleselect_failed_to_save_config:
		"Échec de l'enregistrement de la configuration. Veuille réessayer.",
	roleselect_canceled_command_ok:
		"Configuration de sélection de rôle annulée.",
	roleselect_modal2_title: "Texte du menu",
	roleselect_modal2_label: "Texte du menu",
	roleselect_modal2_placeholder: "Texte du menu de sélection",

	// New feature commands
	// /punishpub, /report, /support

	// /punishpub
	punishpub_not_admin:
		":x: | Tu dois etre un admin du serv bg revient après pour exécuter cette commande !",
	punishpub_too_hight_enable:
		"Ton montant est trop élevé ! Ce n'est pas recommandé !",
	punishpub_negative_number_enable:
		"Tu ne peux pas saisir de nombre négatif !",
	punishpub_zero_number_enable: "Le nombre 0 n'est pas possible !",
	punishpub_confirmation_message_enable:
		"Tu as activé avec succès PunishPub avec un nombre maximum de signalements de ${amount} et une sanction de ${punishement} !",
	punishpub_logs_embed_title: "Journaux de PunishPub",
	punishpub_logs_embed_description:
		"<@${authorId}> a activé PunishPUB avec un nombre maximum de ${amount} signalements et une sanction de ${punishement} !",
	punishpub_confirmation_disable: "Tu as désactivé avec succès PunishPub",
	punishpub_logs_embed_title_disable: "Journaux de PunishPub",
	punishpub_logs_embed_description_disable:
		"<@${authorId}> a désactivé PunishPUB !",

	// /report
	report_cooldown_command:
		"Désolé, tu dois attendre **${time}** avant d'exécuter cette commande !",
	report_owner_need: ":x: | **Faut etre le chef du serv pour faire ça !**",
	report_specify: "Precise le bug sinon jpeu pas lcomprendre!",
	report_command_work:
		"Merci d'avoir signalé lbug frerot mais tu t'es pris pour kisakay ?",

	// /support
	support_not_admin:
		":x: | Tu dois etre un admin du serv bg revient après pour utiliser cette commande !",
	support_command_work:
		"Tu as configuré le module de support pour ${guildName}.\nLorsqu'un utilisateur a ceci dans sa bio :\n**${input}**.\nJe devrais leur donner le rôle <@&${rolesId}> !",
	support_command_work_on_disable:
		"Tu as configuré le module de support pour ${guildName}.\nPersonne ne peut maintenant avoir de rôle !",
	support_command_not_role: ":x: | Tu n'avez pas spécifié le rôle !",
	support_command_not_type:
		":x: | Vous n'avez pas spécifié le type de soutien que vous voulez dans le profil des utilisateurs (bio=la bio. Ex: Lien du serveur; tag=le tag discord du serveur) !",
	support_command_guild_not_have_tag:
		":x: | Le serveur n'a pas de tags actuel.",
	support_command_work_2:
		"Vous avez configuré le module de support pour ${guildName}.\nLorsqu'un utilisateur a met le tag du serveur.\nJe devrais lui donner le rôle <@&${rolesId}> !",

	// /setserverlang

	updates_embed_title: "Mises à jour iHorizon",
	updates_embed_description:
		"Voici les derniers changements et updates d'iHorizon.",
	updates_field_version: "Version",
	updates_field_commit: "Dernier commit",
	updates_field_branch: "Branche",
	updates_field_links: "Liens",
	updates_changelog_attached: "Le changelog complet est joint en PDF.",
	newsletter_dm_title: "iHorizon {version} - Release Notes",
	newsletter_dm_body:
		"Wesh {owner},\n\nUne nouvelle version majeure d'iHorizon vient d'être déployée.\n\n**Version**: {version}\n**Release**: {releaseUrl}\n\nLe changelog complet est joint en PDF.\n\nBesoin d'aide ? Rejoins notre serveur support : https://discord.gg/ihorizon\n-# Utilise +updates pour gérer ton abonnement ou le bouton en bas pour te désabonner.",
	newsletter_btn_unsubscribe: "Unsubscribe from newsletter",
	newsletter_btn_subscribe: "Subscribe to newsletter",
	newsletter_not_owner:
		"Ahah, j'suis content de savoir que j't'intéresse au point de vouloir avoir les changements de mon code en temps réel :3\n\n**Mais voilà, faut que tu m'ajoutes sur un serveur Discord :**\n\n<https://discord.com/oauth2/authorize?client_id=${clientId}>\n**J'te tiendrai au courant des nouveautés comme ça.**\n\n> Une autre alternative : tu peux rejoindre discord.gg/ihorizon. Mes fondatrices font des pings avec le changelog à chaque update. À toi de voir :3",
	newsletter_toggle_enabled: "Newsletter notifications enabled.",
	newsletter_toggle_disabled: "Newsletter notifications disabled.",
	setserverlang_not_admin:
		":x: | Tu dois etre un admin du serv bg revient après pour utiliser cette commande !",
	setserverlang_logs_embed_title_on_enable: "Logs SetServerLang",
	setserverlang_logs_embed_description_on_enable:
		"<@${authorId}> a défini la langue d'iHorizon sur **${type}** boufffon fallais garder Mal Polis !",
	setserverlang_already:
		"C'est gentil dessayer dme rendre con mais jle suis déja !",
	setserverlang_command_work_enable:
		"Ma langue est maintenant sur **${type}**  lets goooo!",
	setserverlang_panel_title: "Sélection de la langue",
	setserverlang_panel_description:
		"Choisis la langue que tu veux qu'iHorizon utilise sur ce serveur.",
	setserverlang_panel_current: "Langue actuelle",
	setserverlang_panel_select: "Choisis une langue...",
	setserverlang_panel_saved: "La langue a été changée avec succès !",
	setserverlang_command_error_enable: "Erreur !",

	// /embed
	embed_placeholder_string_select_menu_builder: "Que tu veux faire ?",
	embed_placeholder_option_copy_embed: "Copier un embed",
	embed_placeholder_option_edit_title: "Modifier le titre",
	embed_placeholder_option_delete_title: "Supprimer le titre",
	embed_placeholder_option_edit_description: "Modifier la description",
	embed_placeholder_option_delete_description: "Supprimer la description",
	embed_placeholder_option_edit_author: "Modifier l'auteur",
	embed_placeholder_option_delete_author: "Supprimer l'auteur",
	embed_placeholde_option_change_footer_image: "Changer l'icône du footer",
	embed_placeholder_option_edit_footer: "Modifier le footer",
	embed_placeholder_option_delete_footer: "Supprimer le footer",
	embed_placeholder_option_edit_thumbnail: "Modifier le thumbnail",
	embed_placeholder_option_edit_image: "Modifier l'image",
	embed_placeholder_option_edit_titleurl: "Modifier l'URL du titre",
	embed_placeholder_option_edit_color: "Modifier la couleur",
	embed_placeholder_option_delete_color: "Supprimer la couleur",
	embed_btn_save: "Sauvegarder l'embed",
	embed_btn_send: "Envoyer l'embed",
	embed_btn_cancel: "Annuler",
	embed_interaction_not_for_you: "This interaction is not for you",
	embed_first_message: "Que veux tu faire ?",
	embed_save_message:
		"<@${authorId}>, **Tu as décidé de sauvegardée la configuration de l'Embed !**```Identifiant de l'Embed: ${embedId}```",
	embed_cancel_message:
		"<@${authorId}>, **Tu as décidé d'abandonner la configuration de l'Embed !**",
	embed_send_message:
		"<@${authorId}>, **Dans quel cannal je dois envoyez cette embed ?**",
	embed_timeout_getbtn:
		"<@${authorId}>, **Tu as mis trop de temps à répondre, je coupe l'opération en cours!**",
	embed_choose_0: "Quel message tu veux inclure dans ton Embed?",
	embed_choose_1: "Quel titre tu veux inclure dans ton Embed?",
	embed_choose_2: "Le titre de l'embed à été correctement Supprimer !",
	embed_choose_3: "Quelle description tu veux inclure dans ton Embed?",
	embed_choose_4: "La description de l'embed à été correctement Supprimer !",
	embed_choose_5: "Quel auteur tu veux inclure dans ton Embed?",
	embed_choose_6: "L'autheur de l'embed à été correctement Supprimer !",
	embed_choose_7: "Quel footer tu veux inclure dans ton Embed?",
	embed_choose_7bis:
		"Quel icône de footer voulez-vous inclure dans votre embed?",
	embed_choose_8: "Le footer de l'embed à été correctement Supprimer !",
	embed_choose_9: "Quel image de thumbnail tu veux inclure dans ton Embed?",
	embed_choose_10: "Quel image tu veux inclure dans ton Embed?",
	embed_choose_11: "Quel URL de titre tu veux inclure dans ton Embed?",
	embed_choose_12:
		"Quel est la couleur que tu veux inclure dans ton Embed? **www.color-hex.com**",
	embed_choose_12_error:
		"${emoji_No} | Couleur Invalide ! Renseigne toi sur **www.color-hex.com**",
	embed_choose_13:
		"Jai supprimer la couleur de lembed , c lnéan maintenant wesh !",
	embed_send_embed_work:
		"<@${authorId}>, **Tu as parfaitement envoyé l'Embed dans le salon <#${messageContent}> !**",
	embed_copy_bad_guild_msg:
		"Le serveur où se trouve le message n'est pas la même que ${guildName}",
	embed_copy_bad_channel_msg:
		"Le salon où se trouve le message est inaccessible !",
	embed_copy_bad_message_msg: "Le message est inaccessible !",
	embed_copy_bad_embed_message_msg: "Le message ne contient pas d'embed !",
	embed_copy_bad_url_msg:
		"URL invalide, Veuille réessayer. Le format correct est : https://discord.com/channels/${messageGuildId}/${channelId}/${id}",
	embed_btn_replace: "Remplacer l'intégration",
	embed_replace_question_msg:
		"Quelle est la nouvelle URL du message où l'intégration doit être remplacée ?",
	embed_replace_message:
		"{user}, la nouvelle intégration a remplacé l'intégration de {messageUrl}",

	// /rolesaver
	rolesaver_embed_title: "Module RoleSaver",
	rolesaver_embed_desc:
		"Lorsque les con de la guilde quittent le serveur, leurs rôles sont sauvegardés dans la base de données. Maintenant, lorsqu'ils rejoignent, iHorizon leur redonne leurs rôles car c'est des enculer de flemmard.",
	rolesaver_embed_fields_1_name: "Activer ( bha ouais logique )",
	rolesaver_embed_fields_2_name:
		"Rôles administrateur redonnés ( ptn vsy c pas drôle )",
	rolesaver_embed_fields_3_name: "Délai d'attente ( ROOH NTM )",
	rolesaver_on_off_already_set:
		"p'tn t con? le module est déjà activer trou de balle",
	rolesaver_on_off_embed_title: "Module RoleSaver",
	rolesaver_on_off_embed_desc:
		"Lorsque les membres de la guilde quittent le serveur, leurs rôles ne sont pas sauvegardés dans la base de données. Désormais, iHorizon ne restaure plus les anciens rôles aux membres lorsqu'ils reviennent sur le serveur Salle pauvre.",
	rolesaver_on_off_embed_fields_1_name: "Activer",

	// /nigthmode
	var_nm_role_app_dont_exist:
		"${emoji_Warning_Icon} Le bot n'as pas de rôle application. Veuillez re-ajouter le bot correctement.\n",
	var_nm_role_app_not_high:
		"${emoji_Warning_Icon} Le bot n'est pas le rôle le plus haut. Veuillez le mettre en haut.\n",
	var_nm_role_app_not_admin:
		"${emoji_Warning_Icon} Le rôle du bot n'a pas de permissions administrateur.\n",
	var_nm_end_main: "Le mode nuit ce termine.\n\n",
	var_nm_start_main: "Le mode nuit touche à commencer.\n\n",
	var_nm_edited_roles: "Les rôles suivants ont été modifiés:",
	var_nm_running: "du démarrage",
	var_nm_stopping: "de l'arrêt",
	var_nm_running2: "commence",
	var_nm_stopping2: "ce termine",
	var_nm_title: "Mode nuit",
	var_nm_ping_embed_title: "Le mode nuit ${type}",
	var_nm_ping_embed_fields_0_name: "Plage horaire",
	var_nm_error_occured:
		"# Un problème est survenu lors ${type} du mode nuit.\n",
	nightmode_embed_desc:
		"# ⭐️ Mode Nuit\n> *Qu'est-ce que le mode nuit?* Le mode nuit est une sécurité **[made by iHorizon](https://www.ihorizon.org)** qui permet de désactiver toute permissions administrateur sur un serveur discord pendant une période donnée.\n> *Exemple, vous êtes sur un serveur Discord avec beaucoup de staffs dessus, vous voulez enlever toute les PA la nuit pour éviter un raid, un snipe de vanity discord, etc*\n> *Vous êtes au bon endroit mon chère. **iHorizon seras toujours la solution.***\n\n---\n",
	nightmode_embed_fields_0_name: "Module Activer",
	nightmode_embed_fields_1_name: "Notifier l'owner du serveur",
	nightmode_embed_fields_2_name: "Derank les bots?",
	nightmode_embed_fields_3_name: "Bot sous liste blanche",
	nightmode_embed_fields_4_name: "Plage Horaire",
	nightmode_select_placeholder: "Paramétrer le mode nuit sur le serveur.",
	nightmode_select_0_label: "Activer le mode nuit",
	nightmode_select_0_desc: "Activer/Désactiver le mode nuit.",
	nightmode_select_1_label: "Avertir le propriétaire du serveur",
	nightmode_select_1_desc:
		"Prévenir l'owner du serveur lors de l'activation/désactivation",
	nightmode_select_2_label: "Configurer la plage horaire du mode nuit",
	nightmode_select_2_desc:
		"Plage horaire où les PA sont retiré automatiquement.",
	nightmode_select_3_label: "Derank les bots",
	nightmode_select_3_desc: "Faut-t'il derank les bots pendant la nuit?",
	nightmode_select_4_label: "Changer le fuseau horaire (UTC)",
	nightmode_select_4_desc:
		"Si vous avez une heure spécifique vous devez le mettre (format nombre UTC)",
	nightmode_select1_placeholder:
		"Bot authorisé as être admin pendant la nuit",
	nightmode_change_timezone_question:
		"Choissiez le UTC pour votre serveur discord",
	nightmode_modal_hours_window_fields0_label:
		"Heure de Début (ex: 21:30 ou 2130)",
	nightmode_modal_hours_window_fields1_label:
		"Heure de Fin (ex: 06:15 ou 0615)",
	nightmode_modal_hours_window_title:
		"NightMode - Plage Horaire (Format 24h avec minutes)",
	nightmode_invalid_hour_morning:
		"${emoji_No} L'heure de début n'est pas valide. Utilisez le format: 21:30 ou 2130",
	nightmode_invalid_hour_night:
		"${emoji_No} L'heure de fin n'est pas valide. Utilisez le format: 06:15 ou 0615",
	nightmode_utc_timezone_on: "fuseau UTC sur",

	// /git lines
	git_lines_avoiding_spam:
		"Désolé, mais pour éviter le spam, nous limitons le nombre de lignes affichées à 50",
	git_lines_avoiding_limit:
		"Désolé mais il y a une limite de 2000 caractères sur Discord, nous n'avons donc pas pu afficher l'extrait souhaité",
	git_lines_work: "✅ Git Lines est maintenant activé.",
	git_lines_work_disabled: "❌ Git Lines est maintenant désactivé.",
	git_lines_borred_warning:
		"\n-# ${emoji_VC_OpenChat} Je te dérange ? tu peux faire `/git lines` pour me désactiver ce module!",

	// /counter config
	counter_config_command_action_on:
		"${author}, tu as défini le module Compteur sur `Activé`.\nSi le salon n'existe pas, configure-le avec la commande : **/counter channel**.",
	counter_config_command_action_off:
		"${author}, tu as défini le module Compteur sur `Désactivé`.",

	// /counter channel
	counter_channel_embed_title: "Module Compteur défini ici !",
	counter_channel_embed_desc:
		"${author} a défini le module Compteur ici !\nLes utilisateurs peuvent maintenant compter dans ce salon !",
	counter_channel_command_work:
		"${author}, tu as correctement défini le module Compteur sur le salon ${channel} !",
	counter_channel_command_error:
		"${author}, la commande a retourné une erreur. Veuillez vérifier que le salon spécifié existe et que le module Compteur est activé !",

	counter_actual_number: "✨ **Nombre actuel :** {number}",

	// Commandes de suggestion
	// /setsuggest, /suggest

	// /suggest accept
	suggest_accept_not_admin: "Tu n'est pas administrateur, ta cru quoi ?",
	suggest_acceptnot_good_channel:
		"Cette commande doit être exécutée dans le salon du module de suggestions (<#${channel}>) !\nVeuille vérifier que le module de suggestions n'est pas désactivé !",
	suggest_accept_not_found_db:
		"La suggestion n'a pas été trouvée dans ma base de données !",
	suggest_accept_already_replied:
		"Cette suggestion a déjà reçu une réponse !",
	suggest_accept_embed_fields_to_put:
		"Réponse de ${authorUsername} (Acceptation)",
	suggest_accept_command_work:
		"Tu as accepté la suggestion !\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_accept_command_error:
		"La suggestion n'a pas été trouvée dans le salon Discord !",

	// /suggest deny
	suggest_deny_not_admin: "Tu n'est pas administrateur !",
	suggest_deny_not_good_channel:
		"Cette commande doit être exécutée dans le salon du module de suggestions (<#${channel}>) !\nVeuille vérifier que le module de suggestions n'est pas désactivé !",
	suggest_deny_not_found_db:
		"La suggestion n'a pas été trouvée dans ma base de données !",
	suggest_deny_already_replied: "Cette suggestion a déjà reçu une réponse !",
	suggest_deny_embed_fields_to_put: "Réponse de ${authorUsername} (Refus)",
	suggest_deny_command_work:
		"Tu as refusé la suggestion !\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_deny_command_error:
		"La suggestion n'a pas été trouvée dans le salon Discord !",

	// /suggest reply
	suggest_reply_not_admin: "Tu n'est pas administrateur !",
	suggest_reply_not_good_channel:
		"Cette commande doit être exécutée dans le salon du module de suggestions (<#${channel}>) !\nVeuille vérifier que le module de suggestions n'est pas désactivé !",
	suggest_replynot_found_db:
		"La suggestion n'a pas été trouvée dans ma base de données !",
	suggest_reply_already_replied: "Cette suggestion a déjà reçu une réponse !",
	suggest_reply_embed_fields_to_put: "Réponse de ${authorUsername}",
	suggest_reply_command_work:
		"Tu as envoyé une réponse à la suggestion !\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_reply_command_error:
		"La suggestion n'a pas été trouvée dans le salon Discord !",

	// /suggest delete
	suggest_delete_not_delete: "Tu n'est pas administrateur !",
	suggest_delete_not_good_channel:
		"Cette commande doit être exécutée dans le salon du module de suggestions (<#${channel}>) !\nVeuille vérifier que le module de suggestions n'est pas désactivé !",
	suggest_delete_not_found_db:
		"La suggestion n'a pas été trouvée dans ma base de données !",
	suggest_delete_command_work: "Tu as supprimé la suggestion !",
	suggest_delete_command_error:
		"La suggestion n'a pas été trouvée dans le salon Discord !",

	// /suggest status
	suggest_not_staff: "T'as pas le droit de gérer les suggestions.",
	suggest_status_pending: "En attente",
	suggest_status_reviewing: "À l'étude",
	suggest_status_accepted: "Acceptée",
	suggest_status_planned: "Planifiée",
	suggest_status_implemented: "Implémentée",
	suggest_status_denied: "Refusée",
	suggest_notify_status:
		"<@${authorId}>, ta suggestion est maintenant **${status}**.",
	suggest_notify_reply: "<@${authorId}>, le staff a répondu à ta suggestion.",
	suggest_button_reply: "Répondre",
	suggest_modal_title: "Répondre à la suggestion",
	suggest_modal_label: "Ton message",
	suggest_status_command_work:
		"La suggestion est maintenant **${status}**.\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",

	// /suggest list
	suggest_list_title: "Suggestions",
	suggest_list_empty: "Y'a aucune suggestion à afficher.",
	suggest_list_footer: "${shownCount} sur ${totalCount}",

	// /setsuggest staff-role
	setsuggest_staff_role_set:
		"${author}, le rôle staff des suggestions est maintenant ${role}.",
	setsuggest_staff_role_removed:
		"${author}, le rôle staff des suggestions est retiré.",

	// /setsuggest disable
	setsuggest_disable_not_admin: "Tu n'est pas administrateur !",
	setsuggest_disable_pw_on:
		"${author}, tu as activé le module de suggestions !",
	setsuggest_disable_pw_off:
		"${author}, tu as désactivé le module de suggestions !",

	// /setsuggest channel
	setsuggest_channel_not_admin: "Tu n'est pas administrateur !",
	setsuggest_channel_already_set_with_that:
		"${author}, le salon du module de suggestions est déjà configuré dans ${channel} !",
	setsuggest_channel_embed_title:
		"Le module de suggestions a été configuré ici !",
	setsuggest_channel_embed_desc:
		"Désormais, tous les utilisateurs autorisés à envoyer des messages ici peuvent soumettre des suggestions en envoyant simplement un message !",
	setsuggest_channel_command_work:
		"${author}, tu as configuré le salon du module de suggestions à ${channel} !",

	// Commande de sécurité
	// /securite

	// /securite desactiver
	security_disable_not_admin: "Tu n'est pas administrateur !",
	security_disable_pw_on: "${author}, tu as activé le module de sécurité !",
	security_disable_pw_off:
		"${author}, tu as désactivé le module de sécurité.",

	// /securite role-a-attribuer
	security_role_to_give_not_admin: "Tu n'est pas administrateur !",
	security_role_to_give_command_work:
		"${author}, tu as défini le rôle ${role} pour le module de sécurité !",

	// /securite salon
	security_channel_not_admin: "Tu n'est pas administrateur ptdr !",
	security_channel_command_work:
		"${author}, tu as défini le salon ${channel} pour le module de sécurité !",

	// Commande de Planification
	// /planifier

	// /planifier
	schedule_menu_placeholder: "Que souhaite-tu faire ma belle ?",
	schedule_menu_choice_0: "Faire une planification",
	schedule_menu_choice_1: "Supprimer une planification",
	schedule_menu_choice_2: "Supprimer toutes les planifications",
	schedule_menu_choice_3: "Lister toutes les planifications",
	schedule_modal_title: "Gestionnaire de Planification",
	schedule_modal_fields_1_label: "Le nom de la planification ?",
	schedule_modal_fields_2_label: "La description de la planification ?",
	schedule_delete_question:
		"Quel est l'identifiant de la planification que tu souhaitez supprimer ?",
	schedule_deleteall_question:
		"Est-tu sûr de vouloir supprimer toutes tes planifications ? (O/n)",
	schedule_delete_not_found:
		"Il n'y a pas de PLANIFICATION (${arg0}) pour ce membre !",
	schedule_delete_title_embed: "Suppression d'une planification (${arg0})",
	schedule_delete_confirm: "Planification supprimée !",
	schedule_deleteall_title_embed: "Suppression de toutes les planifications",
	schedule_deleteall_desc_embed:
		"Toutes tes planifications ont été supprimées !",
	schedule_deleteall_confirm:
		"Toutes tes planifications ont été supprimées !",
	schedule_deleteall_cancel: "L'action `SUPPRIMER_TOUT` a été annulée !",
	schedule_list_not_schedule:
		"Il n'y a pas de PLANIFICATION pour ce membre !",
	schedule_list_title_embed: "Liste de toutes les planifications",
	schedule_list_fields_embed:
		"**Terminé à** : ${expiresAt}```${title}``````${description}```\n",
	schedule_list_content_message:
		"Voici la liste de toutes tes planifications !",
	schedule_create_title_embed: "Création d'une planification",
	schedule_create_when_question:
		"Quand souhaite-tu être notifié de cette planification ? (Exemple : 6j = 6 jours, 2h = 2 heures, 10m = 10 minutes, 10s = 10 secondes)",
	schedule_create_not_number_time:
		"${author}, ton réponse (le temps pour lequel tu souhaitez être notifié de cette planification) n'est pas un nombre !",
	schedule_create_limit_reached:
		"${author}, t'as déjà ${max} rappels. Supprime-en un avant d'en créer un nouveau.",
	schedule_create_embed_fields_name_confirm: "Date de Notification",
	schedule_create_embed_title_confirm:
		"Planification #${scheduleCode} créée !",
	schedule_create_confirm_msg:
		"${author}, ton planification a été créée !\nCode : `${scheduleCode}`",

	// Commande PFPS
	// /pfps channel, /pfps config

	// /pfps config
	pfps_config_not_admin:
		":x: Vous n'avez pas les autorisations d'administrateur pour exécuter cette commande bordel de merde",
	pfps_config_command_action_on:
		"${author}, vous avez activé le module PFPS.\nSi le salon n'existe pas, configurez-le avec la commande : **/pfps channel**.",
	pfps_config_command_action_off:
		"${author}, vous avez désactivé le module PFPS.",

	// /pfps channel
	pfps_channel_not_admin:
		":x: Vous n'avez pas les autorisations d'administrateur pour exécuter cette commande",
	pfps_channel_embed_title: "Module PFPS configuré ici !",
	pfps_channel_embed_desc:
		"${author} a configuré le module PFPS ici !\nDésormais, toutes les 30 secondes, iHorizon envoie l'avatar d'un utilisateur aléatoire dans cette guilde !\nJe ferai de mon mieux !",
	pfps_channel_command_work:
		"${author}, vous avez configuré avec succès le module PFPS dans le salon ${channel} !",
	pfps_channel_command_error:
		"${author}, la commande a renvoyé une erreur. Veuille vérifier que le salon que vous avez spécifié existe et que le module PFPS est activé !",

	// Protection Module
	// /protect, /allowlist add, /allowlist remove, /allowlist show

	// /protect panel
	authorization_actions_not_permited:
		"Seul le propriétaire du serveur peut modifier les règles d'autorisation du module de protection !",
	authorization_actions_everyone: "Tout les con",
	authorization_actions_allowlist: "Membre(s) de la liste blanche",
	authorization_actions_nobody: "Personne. (Sauf le propriétaire du serveur)",
	protect_panel_title: "Panneau de contrôle Protect",
	protect_panel_desc:
		"Configurez chaque règle de protection : activez ou désactivez-la, choisissez qui peut la contourner et définissez la sanction appliquée au membre responsable.",
	protect_panel_global_label: "Sanction globale",
	protect_panel_global_hint: "Appliquée à chaque règle sans sanction propre",
	protect_panel_select_placeholder: "Sélectionnez une règle à configurer",
	protect_panel_mode_placeholder:
		"Sélectionnez qui peut contourner cette règle",
	protect_panel_sanction_placeholder: "Sélectionnez la sanction à appliquer",
	protect_panel_bypass_label: "Contournement",
	protect_panel_sanction_label: "Sanction",
	protect_panel_rule_help:
		"Quand cette règle est déclenchée, l'action est automatiquement annulée et la sanction est appliquée au membre responsable.",
	protect_panel_enable_button: "Activer",
	protect_panel_disable_button: "Désactiver",
	protect_panel_all_rules: "Toutes les règles",
	protect_panel_all_rules_desc: "Change toutes les règles d'un coup",
	protect_panel_all_status: "${enabledCount}/${ruleCount} règles activées",
	protect_panel_all_help:
		"Le contournement et la sanction s'appliquent à toutes les règles actives d'un coup.",
	protect_panel_all_mixed: "Variable",
	protect_panel_enable_all_button: "Tout activer",
	protect_panel_disable_all_button: "Tout désactiver",
	protect_panel_all_mode_saved:
		"**${ruleCount}** règles laissent maintenant passer : **${mode}**.",
	protect_panel_all_sanction_saved:
		"La sanction de **${ruleCount}** règles est maintenant : **${sanction}**.",
	protect_panel_all_enabled: "**${ruleCount}** règles sont activées !",
	protect_panel_all_disabled: "**${ruleCount}** règles sont désactivées !",
	protect_panel_back_button: "Retour",
	protect_panel_refresh_button: "Rafraîchir",
	protect_panel_close_button: "Fermer le panneau",
	protect_panel_rule_enabled: "La règle **${rule}** est désormais activée !",
	protect_panel_rule_disabled:
		"La règle **${rule}** est désormais désactivée !",
	protect_panel_mode_saved:
		"La règle **${rule}** contourne désormais : **${mode}**.",
	protect_panel_sanction_saved:
		"La sanction de **${rule}** est désormais : **${sanction}**.",
	protect_panel_global_saved:
		"La sanction globale est désormais : **${sanction}**.",
	protect_panel_api_error:
		"Je n'ai pas pu appliquer ce changement, vérifie que j'ai la permission `Administrateur`, puis réessaie.",
	protect_panel_sanction_global: "Valeur globale par défaut",
	protect_panel_sanction_cancel: "Annuler les actions seulement",
	protect_panel_sanction_derank: "Annuler + Dégrader",
	protect_panel_sanction_ban: "Annuler + Bannir",
	protect_panel_sanction_kick: "Annuler + Expulser",
	protect_panel_sanction_mute: "Annuler + Mute (10 min)",
	protect_panel_group_server: "Serveur & webhooks",
	protect_panel_group_channels: "Canaux",
	protect_panel_group_roles: "Rôles",
	protect_panel_group_members: "Membres",
	protect_panel_rule_webhook_name: "Webhooks",
	protect_panel_rule_updateguild_name: "Modifications du serveur",
	protect_panel_rule_createchannel_name: "Création de salon",
	protect_panel_rule_updatechannel_name: "Modification de salon",
	protect_panel_rule_deletechannel_name: "Suppression de salon",
	protect_panel_rule_createrole_name: "Création de rôle",
	protect_panel_rule_deleterole_name: "Suppression de rôle",
	protect_panel_rule_updaterole_name: "Modification de rôle",
	protect_panel_rule_updatemember_name: "Modification des rôles d'un membre",
	protect_panel_rule_banmembers_name: "Bannissement de membres",
	protect_panel_rule_kickmember_name: "Expulsion de membres",
	protect_panel_rule_unbanmembers_name: "Révocation de bannissements",
	protect_panel_rule_add_admin_roles_name: "Attribution de rôles admin",
	// /allowlist show
	allowlist_show_not_permited:
		"Vous n'avez pas l'autorisation d'utiliser cette commande ! Vous devez être sur la liste blanche !",
	allowlist_show_embed_author: "Liste blanche",

	// /allowlist add
	allowlist_add_not_permited:
		"Vous n'êtes pas autorisé à utiliser cette commande ! Vous devez être sur la liste blanche !",
	allowlist_add_not_owner:
		"Seul le propriétaire du serveur peut ajouter/supprimer des utilisateurs de la liste blanche !",
	allowlist_add_already_in:
		"Le membre que vous souhaitez ajouter à la liste blanche s'y trouve déjà !",
	allowlist_add_command_work: "${member} a été ajouté à la liste blanche !",

	// /allowlist delete
	allowlist_delete_not_permited:
		"Vous n'êtes pas autorisé à utiliser cette commande ! Vous devez être sur la liste blanche ! Sérieux toi? ta craquer",
	allowlist_delete_not_owner:
		"Seul le propriétaire du serveur peut ajouter/supprimer des utilisateurs de la liste blanche !",
	allowlist_delete_member_unreachable:
		"Le membre que vous souhaitiez supprimer de la liste blanche est injoignable !",
	allowlist_delete_cant_remove_owner:
		"Attend, tu t'est pris pour qui ?? Frère tu fait pitié à essayer de retirer le propriétaire du serveur de la liste blanche!",
	allowlist_delete_isnt_in:
		"Le membre que vous souhaitez supprimer de la liste blanche n'y est pas !",
	allowlist_delete_command_work:
		"${member} a été supprimé de la liste blanche !",

	// Custom Tag Module
	// /tag create, ... delete, ... edit, ... list, ... info

	tag_name: "Tag",
	tag_embed_created_at: "Créé le",
	tag_embed_last_update: "Dernière mise à jour",
	tag_embed_last_updated_by: "Dernière mise à jour par",

	// /tag create
	tag_create_not_permited:
		"Vous n'êtes pas autorisé à créer un tag.\nVous avez besoin des permissions d'administrateur ou d'être dans la liste blanche (`tag wlroles-create`).",
	tag_create_not_good_name:
		"Le nom du tag ne doit contenir ni espaces ni points et ne doit pas dépasser 16 caractères.",
	tag_create_command_work: "Le tag `${tag_name}` a été créé.",
	tag_create_already_exist: "Le tag existe déjà.",
	tag_create_embed_doesnt_exist: "L'embed n'existe pas.",

	// /tag delete
	tag_no_one_found: "Il n'y a pas de tags enregistrés sur ce serveur !",
	tag_delete_dnt_exist: "Le tag `${tag_name}` n'existe pas.",
	tag_delete_command_ok: "Le tag `${tag_name}` a été supprimé.",

	// /tag info
	tag_doesnt_exist: "Le tag `${tag_name}` n'existe pas !",

	// /tag wlcreate
	tag_wlcreate_embed_title: "Liste blanche création - Tags",
	tag_wlcreate_embed_desc: "Tous les rôles autorisés à créer des tags.",

	// /tag wluse
	tag_wluse_embed_title: "Liste blanche utilisation - Tags",
	tag_wluse_embed_desc: "Tous les rôles autorisés à utiliser des tags.",

	// /tag list
	tag_list_no_anything: "Il n'y a pas de tags enregistrés sur ce serveur !",

	// /tag use
	tag_use_not_allowed:
		"Vous n'êtes pas autorisé à utiliser le tag `${tag_name}`.\nVous avez besoin des permissions d'administrateur ou vous pouvez demander au propriétaire du tag <@${createBy}> de vous ajouter à la liste blanche (`tag wlroles-use`).",
	tag_use_empty:
		"Le tag `${tag_name}` il est vide frérot : ni texte ni embed.",
	tag_use_command_work: "Le tag `${tag_name}` a été envoyé.",

	// /tag edit
	tag_edit_error_perm:
		"Pour modifier le tag, vous devez avoir les permissions d'administrateur ou être le propriétaire du tag.",
	tag_edit_command_ok:
		"Le nom du tag actuel a été modifié de **`${current_tag_name}`** à **`${new_tag_name}`**",

	// Module TempVoice
	// /texte, /voix, /statut, /personnel

	// Interface /voix pour définir le salon de texte
	tempvoice_if_text_not_admin:
		"<@${authorId}>, vous n'êtes pas autorisé à utiliser cette commande crevard!",
	tempvoice_if_text_desc_embed:
		"## Interface TempVoice\nCette **interface** peut être utilisée pour gérer des salons vocaux temporaires.\n",
	tempvoice_if_text_fields_value_limit:
		"${emoji_VC_Limit} **Modifier la limite**",
	tempvoice_if_text_fields_value_name: "${emoji_VC_Name} **Modifier le nom**",
	tempvoice_if_text_fields_value_region:
		"${emoji_VC_Region} **Modifier la région**",
	tempvoice_if_text_fields_value_trust:
		"${emoji_VC_Trust} **Faire confiance**",
	tempvoice_if_text_fields_value_untrust:
		"${emoji_VC_Untrust} **Ne plus faire confiance**",
	tempvoice_if_text_fields_value_block: "${emoji_VC_Block} **Bloquer**",
	tempvoice_if_text_fields_value_unblock: "${emoji_VC_Unblock} **Débloquer**",
	tempvoice_if_text_fields_value_claim: "${emoji_VC_Claim} **Revendiquer**",
	tempvoice_if_text_fields_value_privacy:
		"${emoji_VC_Privacy} **Confidentialité**",
	tempvoice_if_text_fields_value_transfer:
		"${emoji_VC_Transfer} **Transférer**",
	tempvoice_if_text_fields_value_delete: "${emoji_VC_Delete} **Supprimer**",

	// Interface /voix pour définir le voc
	tempvoice_vc_not_admin:
		"<@${authorId}>, vous n'êtes pas autorisé à utiliser ces commandes !",

	// Interface /voix pour définir le rôle du personnel
	tempvoice_staff_not_admin:
		"<@${authorId}>, vous n'êtes pas autorisé à utiliser cette commande !",
	tempvoice_staff_desc_embed:
		"## Rôle du staff TempVoice\nLes rôles ici peuvent maintenant entrer dans le salon et le modérer !\n",

	// Module de Confession
	// /cooldown, /disable, /channel

	// /confession channel
	confession_channel_command_work:
		"Le panneau de confession a été envoyé à ${channel} tu vas pouvoir dire que ta bz ta soeur en secret",
	confession_channel_panel_embed_desc:
		"# **Confessions Anonymes**\n\nCliquez sur le bouton ci-dessous pour ouvrir le formulaire de confession. Vous pouvez écrire ce que vous avez besoin de confesser. Si vous le souhaitez, vous pouvez choisir de rendre votre confession privée.\nGardez à l’esprit que les confessions peuvent ne pas rester anonymes : les propriétaires du serveur ou toute personne ayant accès aux journaux de confessions peuvent identifier les utilisateurs si ces journaux sont activés.\n\n## **Faire une Confession**\n\n*Remarque : Pour rendre votre confession privée, écrivez l'option correspondante dans le formulaire.*",
	confession_channel_log_embed_title: "Module SetChannel Confession",
	confession_channel_log_embed_desc:
		"${author} a défini le salon sur ${channel}",

	// /confession cooldown
	confession_coolodwn_command_work:
		"${author}, le cooldown de la confession est maintenant de **${time}**!",
	confession_cooldown_log_embed_title: "Module SetCooldown Confession",
	confession_cooldown_log_embed_desc:
		"${author} a défini le délai d'attente sur `${time}`",

	// /confession disable
	confession_disable_command_work_on:
		"Le module de confession est maintenant activé.",
	confession_disable_command_work_off:
		"Le module de confession est maintenant désactivé.",
	confession_log_embed_title_on_enable: "Activer/Désactiver Confession",
	confession_log_embed_desc_on_enable:
		"${author} a activé le module de confession!",
	confession_log_embed_desc_on_disabled:
		"${author} a désactivé le module de confession!",

	// /confession delete
	confession_sent_confirmation: "Ta confession **#${code}** est publiée.",
	confession_not_found: "Y'a aucune confession avec le code **#${code}**.",
	confession_delete_command_work: "La confession **#${code}** est supprimée.",
	confession_delete_log_embed_title: "Suppression de confession",
	confession_delete_log_embed_desc:
		"${author} a supprimé la confession **#${code}**",

	// /confession ban
	confession_ban_command_work:
		"L'auteur de la confession **#${code}** peut plus se confesser ici.",
	confession_ban_already:
		"L'auteur de la confession **#${code}** est déjà banni.",
	confession_ban_author_expired:
		"Cette confession est trop vieille : son auteur est oublié après 90 jours.",
	confession_ban_log_embed_title: "Bannissement d'un auteur de confession",
	confession_ban_log_embed_desc:
		"${author} a banni l'auteur de la confession **#${code}**",
	confession_banned_error:
		"T'es banni du module de confessions sur ce serveur.",

	// /confession unban
	confession_unban_command_work:
		"Le ban lié à la confession **#${code}** est levé.",
	confession_unban_not_found:
		"Aucun ban n'est lié à la confession **#${code}**.",
	confession_unban_log_embed_title:
		"Débannissement d'un auteur de confession",
	confession_unban_log_embed_desc:
		"${author} a levé le ban lié à la confession **#${code}**",

	// /confession thread
	confession_thread_enabled:
		"Désormais, quand quelqu'un confesse, je crée un fil de discussion en dessous de l'embed.",
	confession_thread_disabled:
		"Je ne crée pas de fil de discussion en dessous de l'embed.",

	// Module AntiSpam
	// /antispam manage

	// /antispam manage
	antispam_manage_embed_title: "Configurations du Module AntiSpam",
	antispam_manage_choices_1_label: "Activer le module",
	antispam_manage_choices_1_desc: "Activer ou désactiver le module antispam",
	antispam_manage_choices_2_label: "Ignorer les Bots",
	antispam_manage_choices_2_desc: "Ignorer le spam des bots dans le serveur",
	antispam_manage_choices_3_label: "Type de sanction",
	antispam_manage_choices_3_desc:
		"Quel type de sanction vais-je donner à l'utilisateur ?",
	antispam_manage_choices_4_label: "Durée de la sanction",
	antispam_manage_choices_4_desc: "Combien de temps dure la sanction",
	antispam_manage_choices_5_label:
		"Multiplicateur de la durée de la sanction",
	antispam_manage_choices_5_desc:
		"Si la durée de la sanction est multipliée pour chaque sanction",
	antispam_manage_choices_6_label: "Supprimer les messages",
	antispam_manage_choices_6_desc: "Supprimer le message de spam",
	antispam_manage_choices_7_label: "Intervalle maximum entre les messages",
	antispam_manage_choices_7_desc:
		"Intervalle maximum entre les messages pour considérer qu'il s'agit de spam",
	antispam_manage_choices_8_label: "Nombre maximum de messages dupliqués",
	antispam_manage_choices_8_desc:
		"Nombre maximum de messages dupliqués avant sanction",
	antispam_manage_choices_9_label:
		"Intervalle maximum entre les messages dupliqués",
	antispam_manage_choices_9_desc:
		"L'intervalle entre les messages dupliqués pour signaler l'utilisateur",
	antispam_manage_choices_10_label: "Nombre maximum de messages similaires",
	antispam_manage_choices_10_desc:
		"Nombre maximum de messages similaires avant sanction",
	antispam_manage_choices_12_label: "Seuil avant punition",
	antispam_manage_choices_12_desc: "Le seuil maximum avant punition",
	antispam_manage_select_menu_punish_mute_label: "Rendre muets les membres",
	antispam_manage_modal_title: "Modale AntiSpam",
	antispam_manage_button_label: "Sauvegarder la configuration",
	antispam_manage_preset_level1_name: "Mode Détente",
	antispam_manage_preset_level2_name: "Mode Garde",
	antispam_manage_preset_level3_name: "Mode Protection Extrême",
	antispam_manage_button_preset_label: "Charger le préréglage",
	antispam_manage_selectstring_preset_label: "Configurations prédéfinies",

	// /antispam bypass-roles
	antispan_bypassroles_embed_desc:
		"Tous les rôles ci-dessous peuvent contourner le module antispam",

	// /antispam bypass-roles
	antispam_ignorechannels_embed_desc:
		"Tous les messages envoyés dans l'un des canaux ci-dessous peuvent contourner le module antispam.",

	// Stats Module
	// /stats ustats

	// /stats ustats
	header_h1_value: "Statistiques de messages de {author_username}",
	messages_word: "Messages",
	voice_activity: "Activité vocale",
	minutes_word: "Minutes",
	top_voice: "Principaux canaux vocaux",
	top_message: "Principaux canaux de messages",
	var_members: "membre(s)",

	// Starboard Module
	// lazy

	// /starboard channel
	starboard_channel_command_ok:
		"${emoji_Yes} | **Le salon Starboard est maintenant défini sur : ${channel}**. Désormais, lorsque les membres du serveur réagiront avec '⭐' et que le seuil de **`${threshold}`** sera atteint, le message sera envoyé dans ${channel} !",

	// /starboard config
	starboard_config_command_ok:
		"${emoji_Yes} | **Le module Starboard est maintenant ${action}**",

	// /starboard threshold
	starboard_threshold_command_ok:
		"${emoji_Yes} | Désormais, lorsque les membres du serveur réagiront avec '⭐' et que le seuil de **`${amount}`** sera atteint, le message sera envoyé dans le salon spécifié !",

	// /starboard create-thread
	starboard_create_thread_command_ok:
		"${emoji_Yes} | Désormais, lorsque les membres du serveur réagiront avec '⭐' et que le seuil de **`${amount}`** sera atteint, le message sera envoyé dans le salon spécifié **`${action}`**",
	starboard_create_thread_yes: "et un fil de discussion sera créé",
	starboard_create_thread_no: "et aucun fil de discussion ne sera créé",

	// /skullboard channel
	skullboard_channel_command_ok:
		"${emoji_Yes} | **Le canal Skullboard est maintenant défini sur : ${channel}**. Maintenant, lorsque les membres du serveur réagissent avec '💀' aux messages et que le seuil de **`${threshold}`** est dépassé, le message est envoyé à ${channel} !",

	// /skullboard config
	skullboard_config_command_ok:
		"${emoji_Yes} | **Le module Skullboard est maintenant ${action}**",

	// /skullboard threshold
	skullboard_threshold_command_ok:
		"${emoji_Yes} | Maintenant, lorsque les membres du serveur réagissent avec '💀' aux messages et que le seuil de **`${amount}`** est dépassé, le message est envoyé dans le canal spécifié !",

	// /skullboard create-thread
	skullboard_create_thread_command_ok:
		"${emoji_Yes} | Maintenant, lorsque les membres du serveur réagissent avec '💀' aux messages et que le seuil de **`${amount}`** est dépassé, le message est envoyé dans le canal spécifié **`${action}`**",

	// Module de Notification
	// auteur de la notification, configuration de la notification

	// /notifier author add
	notifier_author_add_author_doesnt_exist:
		"L'auteur n'existe pas. Veuille vérifier l'ID.",

	// /notifier config channel
	notifier_config_channel_logsEmbed_title: "Module du salon de Notification",
	notifier_config_channel_logsEmbed_desc:
		"${authorId} a configuré le module du salon de Notification sur ${channel}",
	notifier_config_message_command_ok:
		"Désormais, lorsqu'un Streamer/Youtuber/Twitcher publie une vidéo, j'enverrai un message dans ${channel}",

	// /notifier config message
	notifier_config_message_helpEmbed_title:
		"Message de Notification Personnalisé",
	notifier_config_message_helpEmbed_desc:
		"{artistAuthor} => Le nom d'utilisateur du Streamer/Youtuber\n{artistLink} => Le lien vers la chaîne du Streamer/Youtuber\n{mediaURL} => L'URL de la vidéo du Streamer/Youtuber",
	notifier_config_message_embed_fields_notifyMessage:
		"Message de Notification",
	notifier_config_message_awaiting_response:
		"Écrivez le message de notification.",
	notifier_config_message_command_work_on_enable:
		"${emoji_GreenTick} | Activation du travail sur le message de notification.",

	// Module Blogger

	blogger_generateBlogsEmbed_embed_desc:
		"Liste des flux RSS configurés :\n\n",
	blogger_generateBlogsEmbed_embed_title: "📰 Configuration des blogs RSS",
	blogger_generateConfigurationEmbed_embed_title:
		"📰 Configuration du module Blogger",
	blogger_no_rss: "Aucun flux RSS configuré.",
	blogger_generateConfigurationEmbed_embed_fields_1_name: "Statut",
	blogger_generateConfigurationEmbed_embed_fields_2_name:
		"Nombre total de blogs",
	blogger_unknown_blog: "Blog inconnu",
	blogger_on_new_article_default_message:
		"📰 Nouvel article publié !\n**{articleTitle}** par {articleAuthor}\n{articleLink}",
	blogger_config_status_enabled:
		"✅ Le module Blogger a été **activé**. Les flux RSS seront surveillés.",
	blogger_config_status_disabled:
		"❌ Le module Blogger a été **désactivé**. Les flux RSS ne seront pas surveillés.",
	blogger_read_article: "Lire l’article",
	blogger_blog_add_invalid_channel:
		"Type de canal invalide. Veuillez sélectionner un canal textuel.",
	blogger_blog_add_success:
		"✅ Le flux RSS **${validationName}** a été ajouté ! Les notifications seront envoyées à ${channel} (ID : `${blogId}`)",
	blogger_blog_add_invalid_rss:
		"❌ Le flux RSS fourni est invalide ou inaccessible. Veuillez vérifier l’URL et réessayer.",
	blogger_blog_remove_success:
		"✅ Le flux RSS avec l’ID `${blogId}` a été supprimé.",
	blogger_blog_remove_not_found: "❌ Aucun flux RSS trouvé avec cet ID.",
	lastfm_module_not_configured:
		"${emoji_No} | Le module Last.fm n'est pas configuré sur le bot. Définis `LASTFM_API_KEY` et `LASTFM_SHARED_SECRET` dans le `.env` du bot.",
	lastfm_config_login_required:
		"${emoji_No} | Tu dois utiliser `/lastfm login` avant d'activer le module.",
	lastfm_config_enabled:
		"${emoji_Yes} | Le scrobbling Last.fm est maintenant activé pour ton compte.",
	lastfm_config_disabled:
		"${emoji_Yes} | Le scrobbling Last.fm est maintenant désactivé pour ton compte.",
	lastfm_login_invalid_session:
		"${emoji_No} | Last.fm n'a pas renvoyé de session valide.",
	lastfm_login_success:
		"${emoji_Yes} | Ton compte Last.fm `${username}` est maintenant connecté et le scrobbling est activé.",
	lastfm_embed_title: "Configuration Last.fm de ${userLabel}",
	lastfm_embed_field_status: "Statut",
	lastfm_embed_field_account: "Compte connecté",
	lastfm_embed_field_connected_at: "Connecté le",
	lastfm_api_error_login:
		"${emoji_No} | Impossible de se connecter à Last.fm : ${error}",
	lastfm_api_error_nowplaying:
		"${emoji_No} | Impossible d'envoyer le Now Playing à Last.fm : ${error}",
	lastfm_api_error_scrobble:
		"${emoji_No} | Impossible de scrobbler ce morceau : ${error}",
	lastfm_api_error_unknown: "erreur inconnue",

	// Module AuthRestore
	// role, set, delete, get, force-join

	rc_key_doesnt_exist:
		"${emoji_No} Le module AuthRestore avec la clé: **${secretCode}** n'existe pas!",
	rc_verify: "Vérifier",

	// /authrestore role
	rc_role_embed_title: "Nouvelle Modification AuthRestore",
	rc_role_embed_field1_name: "Nouveau rôle attribué après vérification",

	// /authrestore set
	rc_command_ok:
		'${author}, vous venez de configurer le module "AuthRestore". Désormais, lorsqu\'un membre du serveur Discord clique sur le bouton et se connecte via OAuth2, il sera ajouté à la base de données. Il pourra éventuellement rejoindre automatiquement le serveur avec OAuth2.\n# À LIRE ATTENTIVEMENT\nLe message ${msgLink} possède maintenant un bouton qui servira de vérification.\nVOICI LE CODE PRIVÉ QUI NE DOIT ÊTRE DIVULGUÉ À PERSONNE. UNE PERSONNE AVEC CE CODE POURRAIT LE SUPPRIMER, AJOUTER DES MEMBRES À SON SERVEUR... GARDEZ-LE EN LIEU SÛR. iHorizon NE VOUS LE DONNERA PLUS JAMAIS:\n```${secretCode}```',
	rc_command_ok_dm:
		"# Le code AuthRestore pour ${guildName}\n```${secretCode}```",
	rc_command_dm_failed:
		"J'ai essayé de vous envoyer le code en message privé, mais vos MP sont bloqués :/",
	rc_command_dm_ok:
		"Au cas où vous l'auriez manqué, je vous ai envoyé le code en message privé!",
	rc_command_horizongw_down:
		"Erreur: HorizonGateway est peut-être hors service",

	// /authrestore delete
	rc_delete_config_not_found:
		"La configuration du module sur ce serveur n'a pas pu être trouvée!",
	rc_delete_command_ok:
		'${author}, vous venez de supprimer la configuration du module "AuthRestore". Pour des raisons de sécurité (données), je ne supprimerai que le bouton, mais les données oauth2 et le code secret seront supprimés dans 48 heures!',

	// /authrestore get
	rc_get_mainEmbed_title: "Informations Générales AuthRestore",
	rc_get_mainEmbed_field1_name: "ID du Serveur",
	rc_get_mainEmbed_field2_name: "Rôle attribué après vérification",
	rc_get_mainEmbed_field3_name: "Créé le",
	rc_get_mainEmbed_field3_value: "*la date est au format MM/JJ/AAAA HH:mm*",
	rc_get_mainEmbed_field4_name: "Nombre d'utilisations de la clé",
	rc_get_mainEmbed_field5_name: "Auteur de la configuration",
	rc_get_secondEmbed_title: "Utilisateur(s) enregistré(s)",
	rc_get_secondEmbed_footer: "Page ${from} / ${to}",
	rc_get_locale: "Langue",
	rc_get_username: "Nom d'utilisateur",
	rc_get_unkwnon_user: "Utilisateur inconnu (${authorId})",

	// /authrestore force-join
	rc_forceJoin_embed_title: "AuthRestore - Ajout Forcé",
	rc_forceJoin_embed_desc:
		"## Êtes-vous sûr de vouloir forcer l'ajout de membres dans ce serveur ?\n### À LIRE ATTENTIVEMENT :\nSI VOUS CONFIRMEZ CETTE ACTION, LA CLÉ PRIVÉE ACTUELLE SERA DÉTRUITE. UNE NOUVELLE CLÉ VOUS SERA FOURNIE.\n\n\n",
	rc_forceJoin_embed_field1: "Membres trouvés",
	rc_forceJoin_embed_field2: "Membres déjà présents",
	rc_forceJoin_embed_field3: "Ajouts possibles",
	rc_forceJoin_embed_2_field1: "Ajouts possibles",
	rc_forceJoin_embed_2_field2: "Ajoutés",
	rc_forceJoin_ws_size:
		"# Préparation à l'ajout de **${value2}** membres au serveur.",
	rc_forceJoin_ws_start: "# Ajout forcé en cours...",
	rc_forceJoin_ws_end: "# Processus d'ajout forcé terminé.",
	rc_forceJoin_ws_end_renew_msg:
		"# À LIRE ATTENTIVEMENT\nVOICI LE CODE PRIVÉ QUI NE DOIT ÊTRE DIVULGUÉ À PERSONNE. UNE PERSONNE AVEC CE CODE POURRAIT LE SUPPRIMER, AJOUTER DES MEMBRES À SON SERVEUR... GARDEZ-LE EN LIEU SÛR. iHorizon NE VOUS LE DONNERA PLUS JAMAIS:\n```${value2}```",

	// Catégorie Divers
	// manipulation des médias

	// cooldown pour les médias
	media_gen_cooldown:
		"Vous devez attendre `1 minute et 30 secondes` entre chaque génération de médias !",
	media_gen_error_args: "Veuille fournir deux URLs d'images valides.",

	// fr-FR.yml (French - France)
	batch_ban_process:
		"🔄 Bannissement de ${memberUsername} en cours sur ${guildCount} serveurs...",
	batch_unban_process:
		"🔄 Débannissement de ${bannedMemberCount} membres en cours...",
	batch_unblacklist_process:
		"🔄 Suppression de ${bannedMemberUsername} de la liste noire sur ${guildObjectCount} serveurs en cours...",
	unbanall_undo_command_err:
		"Aucun membre à re-bannir. Utilisez d’abord la commande de débanissement global.",

	// -----------------------------/ \-----------------------------
	// Événements du Module de Confession
	confession_module_modal_title: "Envoyer une confession",
	confession_module_modal_components1_label: "Que voulez-vous confesser?",
	confession_module_modal_components1_placeholder: "Mmhh",
	confession_module_modal_components2_label: "Est-ce privé?",

	// Music Player Events
	even_mp_playerStart_tip:
		"> ${emoji_LastFM_Logo} Savais-tu que tu peux scrobbler ta musique avec `/lastfm` sur iHorizon ? ${emoji_Sunglass}",
	event_mp_audioTrackAdd:
		"${emoji_Player_Queue_Add} - ${trackTitle} a été ajouté à la file d'attente :)",
	event_mp_playerError:
		"Je rencontre des problèmes de connexion => ${errorMessage}",
	event_mp_error:
		"Il y a un problème avec la file d'attente de la chanson => ${errorMessage}",
	event_mp_emptyChannel:
		"${emoji_No} | Personne n'est dans le voc, je quitte jme sens seul sah...",
	event_mp_playerSkip:
		"${emoji_Music_Icon} - Skip de **${trackTitle}** ct une musique de merde !",
	event_mp_emptyQueue:
		"${emoji_Warning_Icon} - Jarrete la musique ya plus dliste dattende tchao les nuloss!",

	// Channel Create Events
	event_channel_create_message_embed_title: "Configuration réussie !",
	event_channel_create_message_embed_description:
		"Bot bien config t'en fais pas bg fait toi un café. Tu n'avez plus rien à faire (zen).\n\nTous les journaux de modération liés à iHorizon seront affichés ici.",

	// Welcome Message Events
	event_welcomer_inviter:
		"let's go un con d'+! C'est {memberMention} (compte créé le {accountCreationTimestamp}) ce gars ou meuf lv jsp. Ce bg a été invité par **{inviterUsername}** (**{invitesCount}** invs), nous sommes maintenant {memberCount} dans ce serveur de con {guildName}",
	event_welcomer_default:
		"let's go un con d'+! C'est {memberMention} (compte créé le {accountCreationTimestamp}) ce gars ou meuf lv jsp. Il as rejoins rejoint le serveur. Nous sommes maintenant {memberCount} dans {guildName}",

	// Goodbye Message Events
	event_goodbye_inviter:
		"Oh fdp pq t partit? C'est `{memberUsername}` (compte créé le {accountCreationTimestamp}) qui quitte la guilde. Elle/Il a été invités par **{inviterUsername}** (**{invitesCount}** invs), nous sommes maintenant {memberCount} dans {guildName}",
	event_goodbye_default:
		"Oh fdp pq t partit? C'est `{memberUsername}` (compte créé le {accountCreationTimestamp}) qui quitte la guilde. Nous sommes maintenant {memberCount} dans {guildName}",

	// XP Level Events
	event_xp_level_earn:
		"**GG**, {memberMention}, bravo sale modo, ta gagné un niveau! On sen branle (Niveau : **{xpLevel}**)",
	event_xp_level_additional_info:
		"\n-#  ${emoji_VC_OpenChat} Ce message vous dérange ? Vous pouvez le désactiver en désactivant le système de niveaux avec la commande `/ranks config`",

	// Ticket Module Events:
	event_ticket_embed_description:
		"Salut ${userUsername}, bienvenue dans ton ticket ! S'il tu plaît, soyez patient, nous serons avec tu sous peu. Si tu souhaitez fermer ce ticket, Veuille exécuter `/ticket close`",
	event_ticket_add_member:
		"${author}, vous avez **ajouté** ${addedMembers} au ticket ${channel} !",
	event_ticket_del_member:
		"${author}, vous avez **retiré** ${removedMembers} du ticket ${channel} !",
	event_ticket_button_name: "Faire un Ticket ptite victime",
	event_ticket_category_awaiting_response:
		"Quelle est la catégorie [${emoji}] >> ${name}",
	event_ticket_reason_awaiting_response:
		"${author} l'utilisateur doit-il préciser la raison avant de créer un ticket ?",
	event_ticket_create_reason_modal_title:
		"Quelle est la raison de votre ticket ?",
	event_ticket_create_reason_modal_fields_1_label: "Raison du ticket",
	event_ticket_reason_embed_desc: "# Raison du ticket\n`${reason}`",

	// Événements interactionCreate :
	iC_event_cooldown: "Attend un peu frérot tu mutilise bcp !",
	iC_event_connection_error: "Erreur de co , on est en compagne  ?!",

	// Cooldown
	Msg_cooldown:
		"Attend une seconde avant de refaire une commande ! Jespere t pas entrain de t'actionner le levier sur moi ???",

	// Module de Ticket
	ticket_module_button_delete: "Degager cticket et lfouttre a la corbeille",
	ticket_module_button_transcript: "Transcrire le ticket",
	ticket_module_button_addmember: "Ajouter un bouffon",
	ticket_module_button_removemember: "Supprimer un bouffon",
	ticket_module_add_question:
		"Qui souhaites-tu ajouter à ton ticket ? (Donne son ID, pas son pseudo, trou dballe) !",
	ticket_module_remove_question:
		"Qui est l'utilisateur que tu souhaites retirer de ton ticket ? (Spécifie son identifiant d'utilisateur) !",
	ticket_transcript_failed_to_send:
		"J'ai essayé de vous envoyer le fichier par message privé, mais vous avez bloqué vos messages directs :/",

	// Server Logs
	event_srvLogs_banAdd_description:
		"<@${executorId}> **a banni** <@${targetId}> suivi de 'on t'aime pas dégage'",
	event_srvLogs_banAdd_fields_name: "Raison",
	event_srvLogs_banAdd_fields_value: "`{reason}`",
	event_srvLogs_banRemove_description:
		"<@${executorId}> a **révoqué le bannissement** de ${targetUsername} revient parmi nous débillos",
	event_srvLogs_guildMemberRemove_description:
		"<@${executorId}> **a kické** <@${targetId}>",
	event_srvLogs_guildMemberUpdate_description:
		"📤 <@${executorId}> a supprimé le rôle ${removedRoles} à ${oldMemberUserUsername}, bruh",
	event_srvLogs_guildMemberUpdate_2_description:
		"📥 <@${executorId}> a ajouté le rôle ${addedRoles} à ${oldMemberUserUsername} gg bg ",
	event_srvLogs_messageDelete_description:
		"**Message supprimé dans <#${messageChannelId}>**\n${messageContent}",
	event_srvLogs_messageUpdate_description:
		"**Message édité** [dans](xxx) **<#${oldMessageChannelId}>**",
	event_srvLogs_messageUpdate_footer_1: "Avant",
	event_srvLogs_messageUpdate_footer_2: "Après",
	event_srvLogs_voiceStateUpdate_description:
		"📤 <@${targetUserId}> quitte l'salon <#${OchannelID}>",
	event_srvLogs_voiceStateUpdate_2_description:
		"📥 <@${targetUserId}> se connecte au salon <#${channelID}>",
	event_srvLogs_voiceStateUpdate_3_description:
		"<@${targetUserId}> Ses mute casque dans lsalon<#${channelID}>",
	event_srvLogs_voiceStateUpdate_4_description:
		"<@${targetUserId}> s'est demute casque casque dans l'salon <#${channelID}>",
	event_srvLogs_voiceStateUpdate_5_description:
		"<@${targetUserId}> s'est mute dans le salon <#${channelID}>",
	event_srvLogs_voiceStateUpdate_6_description:
		"<@${targetUserId}> s'est demute casque dans l'salon <#${channelID}>",
	event_srvLogs_channelUpdate_disabled_for:
		"-    ❌ ${perm} désactivée pour ${target}\n",
	event_srvLogs_channelUpdate_enabled_for:
		"-    ✅ ${perm} activée pour ${target}\n",
	event_srvLogs_channelUpdate_allowed_for:
		"-    ✅ ${perm} autorisée pour ${target}\n",
	event_srvLogs_channelUpdate_unallowed_for:
		"-    ❌ ${perm} refusée pour ${target}\n",
	event_srvLogs_channelUpdate_field_name: "🎫 Nom : ${newChannelName}\n",
	event_srvLogs_channelUpdate_perm_added:
		"🛡 Permissions ajoutées pour ${target} :\n",
	event_srvLogs_channelUpdate_embed_desc: "${newChannel} a été mis à jour",

	// Événement de Promotion de Rang
	event_rank_role:
		"<@${messageAuthorId}>, tu as maintenant le rôle <@&${id}> tu la bien mérité a glander sur ton lit , sale modo discord",

	// Événement de suggestion
	event_suggestion_too_short:
		"<@${authorId}>, une suggestion ça fait au moins 5 mots. Ton message sera supprimé dans 10 secondes, copie-le si tu veux le réécrire.",
	event_suggestion_embed_author:
		"Nouvelle suggestion de ${messageAuthorUsername} Merci mgl mais c la rue ici",

	// Événement de sécurité
	event_security_title: "Bienvenue sur ${guild} !",
	event_security:
		"${member}, veuillez saisir le captcha affiché dans ce message.",
	event_security_expiry:
		"{emoji} Expulsion automatique ${timestamp} (**${attempts}** tentative(s) restante(s)).",
	event_security_footer:
		"Cela ne prend que quelques secondes et aide à protéger notre communauté.",
	event_security_kick_reason: "Échec du processus de sécurité",

	// Événement de ticket
	event_ticket_whenCreated_msg:
		"${author}, votre ticket (a la con) a été créé, visitez <#${channelId}> et ferme ta gueule sale pute !",
	event_ticket_logsChannel_onCreation_embed_title:
		"Journal des tickets - Création du panneau mes couilles",
	event_ticket_logsChannel_onCreation_embed_desc:
		"Panneau de ticket appelé `${name}` dans ${interaction} est créé  JE MEN BRANLE NTM!",
	event_ticket_logsChannel_onCreationChannel_embed_title:
		"Journal des tickets - Création du ticket qui pue",
	event_ticket_logsChannel_onCreationChannel_embed_desc:
		"Ticket de merde créé : ${author} (<#${channelId}>) !",
	event_ticket_logsChannel_onClose_embed_title:
		"Journal des tickets - Fermeture du putain d'ticket la calotte de tes mort",
	event_ticket_logsChannel_onClose_embed_desc:
		"Le ticket est maintenant fermé par ${author} (<#${channelId}>) !",
	event_ticket_logsChannel_onRemoveMember_embed_title:
		"Journal des tickets - Retirer un gogol d'un ticket",
	event_ticket_logsChannel_onRemoveMember_embed_desc:
		"${member} a été retiré du ticket par ${author} (<#${channelId}>) !",
	event_ticket_logsChannel_onAddMember_embed_title:
		"Journal des tickets - Ajouter un con à un ticket",
	event_ticket_logsChannel_onAddMember_embed_desc:
		"${member} a été ajouté au ticket par ${author} (<#${channelId}>) !",
	event_ticket_logsChannel_onReopen_embed_title:
		"Journal des tickets - Réouverture d'un ticket",
	event_ticket_logsChannel_onReopen_embed_desc:
		"${author} réouvre un ticket (<#${channelId}>) !",
	event_ticket_logsChannel_onDelete_embed_title:
		"Journal des tickets - Suppression d'un ticket",
	event_ticket_logsChannel_onDelete_embed_desc:
		"${author} a supprimé un ticket (#${channelName}) !",
	event_ticket_logsChannel_onLeave_embed_desc:
		"${author} a quitté le serveur : son ticket (#${channelName}) a été fermé et supprimé, sa transcription est jointe.",
	event_ticket_logsChannel_onAddMember2_embed_title:
		"Journal des tickets - Ajout/Retrait de con d'un ticket",
	event_ticket_logsChannel_onAddMember2_embed_desc:
		"${author}\nRetirés : ${removedMembers}.\nAjoutés : ${addedMembers}.\n dans le ticket (${channel})  (enfaite je m'en branle mdr)!",
	event_ticket_already_opened:
		"Oups, vous avez déjà un ticket ouvert (<#${channelId}>) ! Veuille le fermer avant d'en ouvrir un nouveau.",

	// Événement Giveaway
	event_gw_reroll_win_msg:
		"Félicitations ${winners} ! Vous avez remporté **${prize}** (j'éspère c'est un nitro nikoumouk)!",
	event_gw_reroll_cannot_win_msg:
		"Wesh personne n'a voulue le cadeau? Nique sa mère. Aucun participant valide, donc un gagnant n'a pas pu être déterminé ! ",
	event_gw_finnish_msg:
		"Félicitations ${winners} ! Vous avez remporté **${prize}** !",
	event_gw_finnish_cannot_msg:
		"Aucun participant valide, donc un gagnant n'a pas pu être déterminé ! Eh merde ptn",
	event_gw_finnish_button_title: "Giveaway Terminé Wallah",
	event_gw_entries_button_title: "Liste des participants",
	event_gw_removeentries_msg:
		"${author}, vous avez quitté ce giveaway ! Salle clochard wtf",
	event_gw_leave_button_placeholder: "Quitter le concours",
	event_gw_confirm_leave_msg:
		"${author}, es-tu sûr de vouloir quitter ce concours ?",
	event_gw_embed_desc:
		"Se termine: ${end_string} (${end_string2})\nOrganisé par: <@${hostedBy}>\nParticipations: **${entries}**\nGagnants: **${winners_amount}**",
	event_gw_ended_embed_desc:
		"Terminé : ${time1} (${time2})\nOrganisé par : <@${hostedBy}>\nEntrées: **${entrieCount}**\nGagnants: ${winners}",
	event_gw_entries_words: "Participations",
	event_gw_ended_word:
		"Terminé: ${ended} (${time2})\nOrganisé par: <@${hostedBy}>\nParticipations **${entries}**\nGagnants: ${winners}",
	event_gw_break_req:
		"${emoji_No} Vous ne remplissez pas les conditions nécessaires pour participer à ce concours.\nType : `${requirementType}`\nValeur : `${requirementValue}`",

	// Événement de Logs de Boost
	event_boostlog_add:
		"<@${newMemberUserId}> **vient de claquer toute ces thune** pour enculé la barre de boost du serveur (**${boostCount}** boosts au total)",
	event_boostlog_sub:
		"<@${newMemberUserId}> **vient de retirer son boost telle un gros rat** c'batard ! (**${boostCount}** boosts au total)",

	// Module Économie
	economy_disable_msg:
		"<@${authorId}>, le `Module Économie` sur ce serveur est **désactivé**. Vous ne pouvez plus utiliser le module d'économie ! Putain!!!! LA THUNE BATARD",

	// Permission Event
	event_permission_wrong:
		"${author}, vous n'êtes pas autorisé à utiliser cette commande ! Permission nécessaire : ${neededPerm}",

	// Module TempVoice
	// Tous les composants, variables globales...

	// Variables globales

	temporary_voice_title_embec:
		"## Modifications concernant votre voc temporaire",
	temporary_voice_unblocked_member: "Membres débloqués",
	temporary_voice_blocked_mmeber: "Membres bloqués",
	temporary_voice_no_one: "Personne",
	temporary_voice_new_member: "Nouveau propriétaire",
	temporary_voice_old_member: "Ancien propriétaire",
	temporary_voice_modal_title: "Tableau de bord vocal d'iHorizon",
	temporary_voice_new_userlimit: "Nouvelle limite d'utilisateur",
	temporary_voice_new_name: "Nouveau nom",
	temporary_voice_new_region: "Nouvelle région",
	temporary_voice_untrusted_member: "Membres non fiables",
	temporary_voice_trusted_member: "Membres fiables",

	// Boutons
	temporary_voice_block_button_menu_placeholder:
		"Les utilisateurs sélectionnés ne seront pas autorisés à rejoindre",

	temporary_voice_delete_button_desc_embed:
		"## Suppression du salon\nLe salon a été supprimé avec succès !",

	temporary_voice_limit_button_menu_label:
		"Quelle est la limite de membre du salon ?",
	temporary_voice_limit_button_not_integer:
		"${emoji_No} | La saisie n'est pas un nombre",

	temporary_voice_name_button_menu_label: "Quel est le nom du salon ?",

	temporary_voice_privacy_menu_placeholder:
		"Sélectionnez une option de confidentialité",
	temporary_voice_privacy_menu_lock_label: "Verrouiller le salon",
	temporary_voice_privacy_menu_lock_desc:
		"Seuls les utilisateurs fiables pourront rejoindre votre voc",
	temporary_voice_privacy_menu_unlock_label: "Déverrouiller le salon",
	temporary_voice_privacy_menu_unlock_desc:
		"Tout le monde pourra rejoindre votre voc",
	temporary_voice_privacy_menu_invisible_label: "Invisible",
	temporary_voice_privacy_menu_invisible_desc:
		"Seuls les utilisateurs fiables pourront voir votre voc",
	temporary_voice_privacy_menu_visible_label: "Visible",
	temporary_voice_privacy_menu_visible_desc:
		"Tout le monde pourra voir votre voc",
	temporary_voice_privacy_menu_closechat_label: "Fermer le chat",
	temporary_voice_privacy_menu_closechat_desc:
		"Seuls les utilisateurs fiables pourront envoyer des messages dans votre chat",
	temporary_voice_privacy_menu_openchat_label: "Ouvrir le chat",
	temporary_voice_privacy_menu_openchat_desc:
		"Tout le monde pourra envoyer des messages dans votre chat",

	temporary_voice_region_menu_placeholder: "Sélectionnez une région",

	temporary_voice_transfer_menu_placeholder:
		"Utilisateur sélectionné pour transférer le voc",

	temporary_voice_transfer_trust_placeholder:
		"Les utilisateurs sélectionnés seront fiables pour rejoindre",

	temporary_voice_transfer_unblocked_placeholder:
		"Les utilisateurs sélectionnés seront autorisés à rejoindre",

	temporary_voice_transfer_untrust_placeholder:
		"Les utilisateurs sélectionnés ne seront pas fiables pour rejoindre",

	temporary_voice_channel_name: "Salon de {nickname}",

	tempvoice_v2_embed_title: "## ${emoji_VC_Name} ${channelName}",
	tempvoice_v2_embed_desc:
		"Welcome to your temporary voice channel, ${owner}!\nManage it with the buttons below.",
	tempvoice_v2_hint: "-# Only the channel owner can use this menu.",
	tempvoice_v2_select_placeholder: "Manage your voice channel...",

	tempvoice_cfg_panel_title: "TempVoice configuration",
	tempvoice_cfg_panel_desc:
		"Configure the TempVoice module below. Every change applies immediately, and each created voice channel gets its own control panel.",
	tempvoice_cfg_hub: "Join-to-create channel",
	tempvoice_cfg_category: "Channels created in",
	tempvoice_cfg_name: "Channel name",
	tempvoice_cfg_position: "Position in category",
	tempvoice_cfg_position_top: "Top",
	tempvoice_cfg_position_bottom: "Bottom",
	tempvoice_cfg_staff: "Staff roles (bypass permissions)",
	tempvoice_cfg_select_placeholder: "More settings...",
	tempvoice_cfg_opt_name: "Change the channel name",
	tempvoice_cfg_opt_position_top: "Set position: Top",
	tempvoice_cfg_opt_position_bottom: "Set position: Bottom",
	tempvoice_cfg_done: "Done",
	tempvoice_cfg_remove_hub: "Retirer le salon de création",
	tempvoice_cfg_saved: "TempVoice settings saved!",
	tempvoice_cfg_expired: "Configuration panel expired. Run /tempvoice again.",
	tempvoice_cfg_modal_title: "Set the channel name",
	tempvoice_cfg_modal_label: "Name | Variable: {Username}",
	// Module de Protection
	// Message d'événement

	protection_avoid_channel_delete:
		"**MODE PROTECTION ACTIVÉ**\n<@${channelGuildOwnerId}>, le salon a été recréé, <@${executorId}> a tenté de supprimer le salon!",
	protection_blockbot_embed_title: "⚠️ Danger dans ${memberGuildName} ⚠️",
	protection_blockbot_embed_desc:
		"# Avertissement d'ajout de bot\nQuelqu'un a essayé d'ajouter un bot Discord.",
	var_target_bot: "Bot ciblé",
	var_not_detected: "Non détecté",

	// Module AntiSpam
	// Message d'événement

	// Message d'avertissement de base
	antispam_base_warn_message:
		"Attention ${mentionedMembers}, vous êtes en train de spammer et je vais vous enculer le fion.",

	// Messages d'avertissement supplémentaires en fonction du type de sanction
	antispam_more_ban_msg:
		" Si vous continuez, vous serez bannis du pays comme un arabe.",
	antispam_more_mute_msg:
		" Si vous continuez, vous serez mis en sourdine, comme ma femme.",
	antispam_more_kick_msg:
		" Si vous continuez, vous serez expulsés du serveur, comme les migrants à la frontière.",

	// Intégrer les journaux d'AntiSpam
	antispam_log_embed_title: "[BloqueurDeBranleur] Nouveau ${actionType}",
	antispam_log_embed_desc: "${bot} a **${actionType}** ${user}",

	// Commandes Hybrides
	// Message d'Événement

	hybridcommands_global_prefix_mention: "`@Ping-Moi`",
	hybridcommands_global_prefix_cleaned_mention: "@Ping-Moi ",
	hybridcommands_args_error_embed_desc:
		'```ts\nNom de la commande : ${currentCommandName}\n```\n```cs\n${botPrefix}${fullNameCommand} ${argsString}\n${errorPosition}\nErreur lors de lʼenvoi de lʼargument "${wrongArgumentName}".\n```',
	hybridcommands_embed_help_title: "${commandName} Aide en Intégration",
	hybridcommands_embed_help_fields_value:
		"**Alias:** ${aliases}\n**Utilisation:** ${use}",
	hybridcommands_embed_footer_text:
		"Les options entre [...] sont obligatoires, tandis que celles entre <...> sont facultatives.\nUtilisez la commande : ${botPrefix}help [command] pour plus d'informations.",

	ping_bot_show_info_msg:
		"${messageAuthor} Oh la conne de ta soeur à me ping!!! Sah2sah jsuis iHorizon le bot de fdp qui vas niquer ta mère si tu l'utilise pas partout (${emoji_Slash_Bot_Badge}). Bref si tu veux m'utiliser mon préfix c'est **${prefix}**",
	ping_bot_show_info_msg_about_change_prefix:
		"\n-# ${emoji_VC_OpenChat} Mon prefix te dérange? Fait **`/guildconfig bot prefix`** pour changer de préfixe!",

	// Module de Notification
	notifier_on_new_media_default_message:
		"@everyone le mec en calecon dans sa chambre aka **[{artistAuthor}](<{artistLink}>)** a publié une nouvelle vidéo [Cliquez ici]({mediaURL})",
	notifier_on_new_media_default_button_label: "Regarder !",
	notifier_generateAuthorsEmbed_embed_desc:
		"Voici la liste de tous les Streamers/YouTubers :\n",
	notifier_generateAuthorsEmbed_embed_title:
		"Tous les Streamers/YouTubers du serveur",
	notifier_generateConfigurationEmbed_embed_title:
		"Configuration du Module de Notification",
	notifier_generateConfigurationEmbed_embed_fields_1_name:
		"salon de Notification",
	notifier_generateConfigurationEmbed_embed_fields_2_name:
		"Message de Notification",

	// ButtonReaction
	buttonreaction_role_doesnt_exit:
		"Le rôle dans ma base de données n'existe plus dans le serveur !",
	buttonreaction_role_too_high:
		"Le rôle est trop élevé, je ne peux pas donner/enlever le rôle. J'ai besoin de changer mes permissions !",
	buttonreaction_role_add: "Ta maintenant le rôle ${role} :tada:",
	buttonreaction_role_remove: "Vous n'avez plus le rôle ${role} ✅",
	rolepanel_setup_embed_title: "Configuration du panel de rôles",
	rolepanel_setup_embed_desc:
		"Sélectionne les rôles à ajouter ou retirer à ${member}. Si ${member} possède déjà un rôle sélectionné, il sera retiré. Les rôles non autorisés seront ignorés.",
	rolepanel_setup_embed_roles_field: "Rôles autorisés",
	rolepanel_setup_embed_refused_field: "Rôles refusés",
	rolepanel_setup_select_placeholder: "Sélectionne les rôles à proposer",
	rolepanel_setup_apply_button: "Créer le panel",
	rolepanel_setup_no_roles: "Aucun rôle valide n'a été sélectionné.",
	rolepanel_setup_saved: "Le panel de rôles a été envoyé.",
	rolepanel_panel_embed_title: "Panel de rôles",
	rolepanel_panel_embed_desc:
		"Choisis les rôles à ajouter ou retirer de ton profil.",
	rolepanel_panel_select_placeholder: "Choisis tes rôles",
	rolepanel_role_managed_or_everyone: "Rôle système ou @everyone",
	rolepanel_role_too_high_bot: "Rôle plus haut que le bot",
	rolepanel_role_too_high_user: "Rôle plus haut que toi",
	rolepanel_role_missing_permissions:
		"Permissions non détenues: ${permissions}",
	rolepanel_logs_embed_title_create: "Logs du panel de rôles",
	rolepanel_logs_embed_desc_create:
		"<@${authorId}> a créé un panel de rôles (${messageId}) avec: ${roles}",
	rolepanel_logs_embed_title_apply: "Logs d'utilisation du panel de rôles",
	rolepanel_logs_embed_desc_apply:
		"<@${authorId}> a modifié les rôles de <@${memberId}> via un panel. Ajoutés: ${addedRoles} | Retirés: ${removedRoles}",

	// AuthRestore HTML
	rc_created_by: "Créé par :",
	rc_created_on: "Créé le :",
	rc_total_membres: "Nombre Total de Membres",
	rc_total_verification: "Nombre Total de Vérifications",
	rc_total_key_used_count: "Nombre d'Utilisations de la Clé",
	rc_recent_locales_distribution: "Répartition des Locales des Membres",
	rc_recent_verifications: "Vérifications Récentes",
	rc_registration_over_time: "Inscriptions au Fil du Temps",

	// PicOnly Module
	piconly_module_punish_msg:
		"${messageAuthor}, vous avez été timeout pendant 10 minutes pour avoir envoyé trop de messages sans images dans un salon réservé aux images.",
	piconly_module_warn_msg:
		"${messageAuthor}, ce salon n'accepte que les messages contenant des images (formats acceptés: JPG, PNG, GIF, WEBP, BMP, TIFF). Avertissement ${userWarningCount}/${threshold}",
	piconly_module_timeout_reason:
		"Spam de messages sans images dans un salon images-only",

	// Nick Kicker Event
	event_nick_kicker_kick_reason:
		"Mot interdit dans le nom d'utilisateur - Expulseur de Pseudos",
	event_nick_kicker_kick_msg:
		"Dans le serveur `${memberGuildName}`, votre nom d'utilisateur contient un mot interdit. Vous avez été expulsé du serveur.",

	// Module des avatars
	pfps_embed_user_title: "Avatar **utilisateur** de ${username}",
	pfps_embed_guild_title: "Avatar de **serveur** de ${username}",
	pfps_download_user_button: "Télécharger l'avatar utilisateur (ignoble)",
	pfps_download_guild_button:
		"Télécharger l'avatar du serveur (il est dégueulasse)",
	// -----------------------------\ /-----------------------------

	// AddRoleReact Command
	addrolereact_role_not_found:
		"Le rôle que tu cherches existe pas gros, t'es con ou quoi",
	addrolereact_cannot_check_permissions:
		"Jpeux pas vérifier tes perms frr, c'est la merde",
	addrolereact_role_too_high:
		"Le rôle que tu veux donner est plus haut que ton rôle, t'es ouf ou quoi",
	addrolereact_must_be_text_channel:
		"Faut que ce soit un salon texte frr, t'es con ou quoi",
	addrolereact_message_not_found:
		"Le message que tu cherches existe pas, t'es aveugle ou quoi",
	addrolereact_no_reactions:
		"Y'a pas de réactions sur ce message, t'es con ou quoi",
	addrolereact_adding_role:
		"Jvais donner le rôle {role} à tous les mecs qui ont réagi",
	addrolereact_adding_role_progress:
		"Jdonne le rôle {role} à {count} mecs qui ont réagi",
	addrolereact_role_added:
		"J'ai donné le rôle {role} à {count} mecs qui ont réagi",
	addrolereact_error: "Une erreur de merde est survenue, réessaye plus tard",

	// Commandes de masquage/démasquage des salons - Version familière
	channel_hide_in_progress: "J'masque le salon là...",
	channel_hide_success:
		"Le salon est maintenant caché pour @everyone, tranquille",
	channel_hide_already_hidden:
		"Le salon est déjà caché pour @everyone, t'es con ou quoi",
	channel_unhide_in_progress: "J'démasque le salon là...",
	channel_unhide_success:
		"Le salon est maintenant visible pour @everyone, c'est bon",
	channel_unhide_already_visible:
		"Le salon est déjà visible pour @everyone, t'es aveugle ou quoi",
	channel_hideall_in_progress:
		"J'masque tous les salons, ça va prendre du temps...",
	channel_hideall_success:
		"**Masquage terminé, tranquille !**\n**Les stats :**\n• **{hiddenCount}** salons masqués\n• **{errorCount}** erreurs de merde",
	channel_hideall_error:
		"Une erreur de merde est survenue pendant le masquage des salons.",
	channel_unhideall_in_progress: "J'démasque tous les salons, patience...",
	channel_unhideall_success:
		"**Démasquage terminé, c'est bon !**\n**Les stats :**\n• **{unhiddenCount}** salons démasqués\n• **{errorCount}** erreurs de merde",
	channel_unhideall_error:
		"Une erreur de merde est survenue pendant le démasquage des salons.",

	// fr-FR.yml (French - France)
	new_guild_embed_title: [
		"Bienvenue sur votre serveur ! 🎉",
		"Salutations, chers amis Discord ! 👋",
		"iHorizon a rejoint le chat ! 💬",
		"C'est un oiseau, c'est un avion, non, c'est iHorizon ! 🦸‍♂",
		"Souhaitons la bienvenue à iHorizon ! 🔥",
		"Une nouvelle aventure commence ! 🚀",
		"Un membre fantastique nous a rejoint ! ✨"
	],
	new_guild_embed_desc:
		"## ${randomMessage}\nSalut les amis extraordinaires !\n\nJe suis iHorizon, un bot avancé conçu pour rendre votre expérience Discord exceptionnelle et pleine de fun.\n\n✨ **Ce que je peux faire pour vous :**\n• Gestion du serveur avec intelligence et professionnalisme\n• Jeux interactifs et divertissement illimité\n• Outils utiles pour l'organisation de la communauté\n• Support technique disponible 24h/24 et 7j/7\n\nExplorez mes commandes et plongez dans un monde de possibilités infinies.\nEnsemble, nous construirons une communauté fantastique remplie de magnifiques souvenirs !\n\nMerci de m'avoir choisi, commençons cette incroyable aventure ! 🌟",
	new_guild_owner_dm_title: "Bienvenue dans la famille iHorizon, mon reuf!",
	new_guild_owner_dm_description:
		"# Wesh, merci d'avoir posé iHorizon sur ton serveur !\n\n> *Attends... C'est tout ? Nan, absolument pas.*\n\niHorizon c'est un bot Discord, ok ? Mais pas que. C'est aussi une communauté, un délire, un projet construit depuis plus de 6 piges (2020).\nUtiliser iHorizon, c'est pas juste avoir un bot Discord complet, éternellement **gratuit** et **open source**. C'est aussi adhérer à un **concept**.\n\n> **Un bot Discord gratuit peut mieux faire le taf que des bots payants.**\n*Ouais, c'est ça iHorizon : un bot complet, maintenu depuis 6 ans par des gens passionnés.*\n\nAlors ouais... après ce message, merci.\nOn est légion. #ihorizon",
	guild_create_btn_invite: "Inviter iHorizon",
	guild_create_btn_website: "Site Web iHorizon",
	guild_create_btn_search: "Recherche iHorizon",
	guild_create_btn_repos: "Dépôts iHorizon",
	guild_create_btn_support: "Serveur Support",
	guild_create_btn_docs: "Documentation iHorizon",
	bot_server_bio:
		"{wink_emoji} **iHorizon Discord Bot** **`+{count} commandes`**\n> *« Fait par des gens depuis 2022, pour ta commu. »*\n**https://www.ihorizon.org**",
	guild_leave_data_clear_notice_title: "iHorizon a quitté ${guildName}",
	guild_leave_data_clear_notice_description:
		"Mouin mouin, c'est triste. T'as kick le bot de `${guildName}`. Les données du serveur seront clear ${deleteAt} si iHorizon n'est pas de retour avant.",
	guild_leave_data_clear_notice_message:
		"Mouin mouin, c'est triste. T'as kick iHorizon de `${guildName}`. Les données seront clear ${deleteAt}.",
	guild_leave_data_clear_cancelled_title:
		"iHorizon est de retour sur ${guildName}",
	guild_leave_data_clear_cancelled_description:
		"Ouaiiiis youpii, merci d'avoir remis iHorizon sur `${guildName}`. La suppression programmée des données est annulée.",
	guild_leave_data_clear_cancelled_message:
		"Ouaiiiis youpii, merci d'avoir remis iHorizon sur `${guildName}`. Les données du serveur sont safe.",

	// Confession Event
	confession_embed_logs_title: "Nouvelle confession",
	confession_channel_button_name: "Répondre anonymement",
	confession_1_embed_log_title: "Nouvelle réponse à la confession",

	// Context Menu Interaction
	global_unknown_message: "Message introuvable.",
	global_error: "❌ Error",
	global_not_atc: "Le message sélectionné ne contient pas d'attachement.",
	global_not_valid_atc:
		"L'attachement sélectionné n'est pas un fichier audio valide.",
	global_too_heavy_file:
		"Le fichier MP4 généré est trop volumineux (${fileSize} MB). La limite Discord est de 25 MB.",
	global_convert_ok: "✅ Conversion réussie",
	global_convert_ok_desc:
		"Votre fichier audio a été converti en MP4 (${fileSize} MB).",

	// Economy logs titles
	economy_logs_add_money_title: "Logs Économie - Ajout d'argent",
	economy_logs_remove_money_title: "Logs Économie - Retrait d'argent",
	economy_logs_boost_role_title: "Logs Économie - Boost de rôle",
	economy_logs_config_title: "Logs Économie - Configuration du module",
	economy_logs_role_add_title: "Logs Économie - Rôle ajouté à la boutique",
	economy_logs_role_remove_title:
		"Logs Économie - Rôle retiré de la boutique",
	economy_logs_pay_title: "Logs Économie - Paiement",
	economy_logs_rob_title: "Logs Économie - Vol",
	economy_logs_set_cooldown_title: "Logs Économie - Définition du cooldown",
	economy_logs_set_money_title: "Logs Économie - Définition de l'argent",
	economy_logs_withdraw_title: "Logs Économie - Retrait",
	economy_logs_deposit_title: "Logs Économie - Dépôt",

	// Economy logs descriptions
	economy_logs_add_money_desc:
		"{author} a ajouté à {target} `{amount}$` {coin}",
	economy_logs_remove_money_desc:
		"{author} a retiré à {target} `{amount}$` {coin}",
	economy_logs_boost_role_desc:
		"{author} a défini le boost du rôle {role}. Le boost est maintenant : `x{amount}`",
	economy_logs_config_desc: "{author} a {state} le module économie",
	economy_logs_role_add_desc:
		"{author} a ajouté le rôle {role} à la boutique. Prix : `{amount}$`",
	economy_logs_role_remove_desc:
		"{author} a retiré le rôle {role} de la boutique.",
	economy_logs_pay_desc: "{author} a envoyé `{amount}$` à {target}",
	economy_logs_rob_desc: "{author} a volé `{amount}$` à {target}",
	economy_logs_set_cooldown_desc:
		"{author} a défini le cooldown de `{type}` à **{time}**",
	economy_logs_set_money_desc:
		"{author} a défini l'argent de `{type}` à **{money}**",
	economy_logs_withdraw_desc: "{author} a retiré **${money}** de la banque",
	economy_logs_deposit_desc: "{author} a déposé **${money}** à la banque",

	// Generic vars
	var_on: "activé",
	var_off: "désactivé",
	global_command_cooldown_msg:
		"${emoji} Vous devez attendre **${time}** entre chaque utilisation de **`${ctxCommandPath}`**",

	global_warn_embed_title: "Tu as reçu un avertissement – Cas **`${id}`**",
	global_warn_embed_desc:
		"> **Raison :** ${reason}\n> **Responsable :** @${authorUsername} (*${authorRolesHighestName}*)\nAvertissement généré ${time}",
	global_warn_component_button_label: "Envoyé depuis ${authorGuildName}",

	counter_error_too_much_u:
		"<@${messageAuthorId}> S'EST TROMPÉ À **${number}**!! Le prochain nombre est **1**. **Vous ne pouvez pas compter deux fois d'affilée.**",
	counter_error_syntaxic:
		"<@${messageAuthorId}> S'EST TROMPÉ !! Le prochain nombre est **1**.",

	global_blacklist_msg_to_send:
		"Tu as été automatiquement banni de ce serveur car ton compte figure sur la Global Blacklist d’iHorizon.\n\nRaison: `${reason}`\n\nConformément au point 3 de nos Conditions d’Utilisation, les serveurs utilisant iHorizon acceptent que le bot applique automatiquement les sanctions liées à cette blacklist globale.\n\nSi tu penses qu’il s’agit d’une erreur ou si tu souhaites contester cette décision, tu peux faire appel ici:\nAppeal: <https://www.ihorizon.org/appeal>\n\nConditions d’utilisation: <https://www.ihorizon.org/tos>",
	global_blacklist_reason:
		"Sanction du projet iHorizon - Blacklist | Raison : ${reason}",
	server_blacklist_msg_to_send:
		"Tu as été banni car tu es sur la blacklist de ce serveur.\nRaison : `${data2Reason}`",
	server_blacklist_reason: "Blacklist | Raison : ${data2Reason}",
	help_sticky_fields: "Sticky",
	help_sticky_dsc:
		"> *Gardez un message important toujours visible dans vos salons grâce à une republication automatique.*",
	sticky_channel_command_error:
		"${emoji_No} | ${author}, je n'ai pas pu trouver un salon textuel valide.",
	sticky_text_command_missing_message:
		"${emoji_No} | ${author}, vous devez fournir un message sticky.",
	sticky_text_command_work:
		"${emoji_Yes} | ${author}, le message sticky texte est maintenant actif dans ${channel}.",
	sticky_embed_command_embed_not_found:
		"${emoji_No} | ${author}, je n'ai pas pu trouver l'embed `${embed_id}`.",
	sticky_embed_command_work:
		"${emoji_Yes} | ${author}, l'embed sticky `${embed_id}` est maintenant actif dans ${channel}.",
	sticky_disable_command_not_found:
		"${emoji_No} | ${author}, aucun message sticky n'est configuré dans ${channel}.",
	sticky_disable_command_work:
		"${emoji_Yes} | ${author}, le message sticky a été désactivé dans ${channel}.",
	sticky_refresh_command_not_found:
		"${emoji_No} | ${author}, aucun message sticky n'est configuré dans ${channel}.",
	sticky_refresh_command_missing_embed:
		"${emoji_No} | ${author}, le message sticky de ${channel} référence un embed qui n'existe plus.",
	sticky_refresh_command_missing_permissions:
		"${emoji_No} | ${author}, je ne peux pas republier le message sticky dans ${channel}. Vérifiez mes permissions.",
	sticky_refresh_command_work:
		"${emoji_Yes} | ${author}, le message sticky a été republié dans ${channel}.",
	sticky_show_command_not_found:
		"${emoji_No} | ${author}, aucun message sticky n'est configuré dans ${channel}.",
	sticky_show_embed_title: "Configuration du message sticky",
	sticky_show_embed_fields_channel: "Salon",
	sticky_show_embed_fields_type: "Type",
	sticky_show_embed_fields_status: "Statut",
	sticky_show_embed_fields_message: "Message",
	sticky_show_embed_fields_embed: "ID de l'embed",
	sticky_show_embed_fields_last_message: "ID du dernier message sticky",
	sticky_list_embed_title: "Salons sticky",
	sticky_list_embed_desc_empty:
		"Aucun salon sticky n'est configuré sur ce serveur.",
	sticky_list_embed_desc_line_text: "${channel} - Sticky texte",
	sticky_list_embed_desc_line_embed:
		"${channel} - Sticky embed (`${embed_id}`)",
	sticky_list_embed_desc_line_text_embed:
		"${channel} - Sticky texte + embed (`${embed_id}`)",
	sticky_var_text: "Texte",
	sticky_var_embed: "Embed",
	sticky_var_text_embed: "Texte + embed",
	sticky_var_enabled: "Activé",
	sticky_var_disabled: "Désactivé",
	sticky_var_none: "Aucun",

	// /honeypot config
	honeypot_config_not_allowed:
		"Faut être administrateur ou dans l'allowlist pour toucher à Honeypot.",
	honeypot_config_embed_title: "Configuration de Honeypot",
	honeypot_config_embed_desc:
		"Configure le salon piège, le salon de logs et l'action automatique utilisée quand quelqu'un commence à envoyer des messages dans le salon *Honeypot*.",
	honeypot_config_embed_field_status: "Statut",
	honeypot_config_embed_field_trap_channel: "Salon piège",
	honeypot_config_embed_field_logs_channel: "Salon de logs",
	honeypot_config_embed_field_action: "Action",
	honeypot_config_embed_field_message: "Message envoyé",
	honeypot_config_embed_field_notes: "Notes",
	honeypot_config_embed_field_credit: "Crédits",
	honeypot_config_notes_value:
		"- **Mets le rôle iHorizon au-dessus de tous les rôles membres.**\n- **Les salons Honeypot créés automatiquement montent tout en haut du serveur.**\n- **Tu peux renommer le salon Honeypot sans casser le système.**",
	honeypot_config_credit_value: "*Inspiré de Honeypot par RiskyMH*\n${url}",
	honeypot_config_select_trap_placeholder: "Choisir le salon piège",
	honeypot_config_select_logs_placeholder: "Choisir le salon de logs",
	honeypot_config_select_action_placeholder: "Choisir l'action à appliquer",
	honeypot_config_button_send: "Envoyer l'embed",
	honeypot_config_button_preview: "Voir la preview",
	honeypot_config_button_enable: "Activer Honeypot",
	honeypot_config_button_disable: "Désactiver Honeypot",
	honeypot_config_send_success:
		"L'embed Honeypot a été envoyé dans ${channel}.",
	honeypot_config_enable_success:
		"Honeypot est maintenant activé dans ${channel}.",
	honeypot_config_disable_success: "Honeypot est maintenant désactivé.",
	honeypot_config_missing_logs_channel:
		"Configure un salon de logs avant d'activer Honeypot.",
	honeypot_config_generic_error:
		"Une erreur a éclaté pendant la mise à jour de Honeypot.",
	honeypot_config_select_action_kick: "Expulser les utilisateurs",
	honeypot_config_select_action_ban: "Bannir les utilisateurs",
	honeypot_config_select_action_none: "Ne supprimer que les messages",
	honeypot_config_select_action_del_messages: "Supprimer les messages",
	honeypot_default_channel_name: "🍯・discussion-generale",
	honeypot_action_none: "Suppression des messages uniquement",
	honeypot_action_failed: "Action ratée",
	honeypot_dm_action_kicked: "tu as été expulsé!",
	honeypot_dm_action_banned: "tu as été banni!",
	honeypot_dm_action_none: "tes messages ont été supprimés",
	honeypot_trap_embed_title: "ENVOIE PAS DE MESSAGES DANS CE SALON",
	honeypot_trap_embed_desc:
		"*Ce salon est utilisé pour choper les bots spam.*\n*Tout message envoyé ici **VA** déclencher la protection automatique du serveur.*",
	honeypot_trap_embed_footer:
		"Inspiré du Honeypot de RiskyMH, regarde moi ce poulet !\n${url}",
	honeypot_dm_title: "Honeypot déclenché!",
	honeypot_dm_desc:
		"Un message que vous avez envoyé dans le canal *Honeypot* sur le serveur suivant : **`${guild}`** **déclenché** la protection configurée.\n\n__Action prise contre vous :__ **`${action}`**\n\n*Les messages que vous avez envoyés au cours des 2 dernières heures sont en cours de suppression du serveur. Si vous pensez avoir été hacké, changez votre mot de passe et activez la 2FA sur votre compte Discord. S'il s'agit d'une erreur de votre part, veuillez contacter l'équipe du serveur pour résoudre le problème.*",
	honeypot_log_title: "Déclenchement Honeypot - ${action}",
	honeypot_log_field_author: "Auteur",
	honeypot_log_field_channel: "Salon",
	honeypot_log_field_message: "Message supprimé",
	honeypot_log_field_attachments: "Pièces jointes",
	honeypot_log_field_stickers: "Stickers",
	honeypot_log_field_embeds: "Embeds",
	honeypot_log_field_deleted_messages: "Messages supprimés",
	honeypot_log_field_triggered_messages: "Messages déclencheurs",
	honeypot_log_field_dm_status: "Statut du MP",
	honeypot_log_field_result: "Résultat",
	honeypot_log_dm_open: "Envoyé",
	honeypot_log_dm_closed: "Fermé ou inaccessible",
	honeypot_log_no_content: "Aucun contenu texte",
	honeypot_log_action_ban: "Utilisateur banni",
	honeypot_log_action_kick: "Utilisateur expulsé",
	honeypot_log_action_none: "Aucune action prise",

	// Module TTS
	// /tts join, /tts leave, /tts info, /tts lang

	help_tts_fields: "TTS",
	help_tts_dsc:
		"> *Transforme du texte en parole dans les salons vocaux avec iHorizon !*",

	// /tts join
	tts_join_not_in_voice:
		"${emoji_No} T'es oblige d'etre dans un salon vocal pour faire ca frerot !",
	tts_join_already_enabled:
		"${emoji_No} Wsh le module TTS est deja active sur le serv !",
	tts_join_music_playing:
		"${emoji_No} Y'a d'la zik la, arrete avant de mettre le TTS frero !",
	tts_join_enabled: "${emoji_Yes} Ca parle maintenant dans ${voiceChannel} !",
	tts_join_error: "${emoji_No} Y'a eu un souci pour activer le mode TTS...",
	tts_join_lang_fallback: "fr-FR",

	// /tts leave
	tts_leave_not_active:
		"${emoji_No} Le TTS est meme pas active sur le serv !",
	tts_leave_not_in_voice:
		"${emoji_No} Faut etre dans le vocal TTS pour l'eteindre mon reuf !",
	tts_leave_disabled:
		"${emoji_Yes} Le mode TTS est plus la, fin de l'histoire !",

	// /tts info
	tts_info_embed_title: "Info du Module TTS",
	tts_info_embed_description:
		"Le module TTS permet a iHorizon de lire les messages dans un salon vocal. Quand c'est active, chaque message envoye dans le salon texte par les gens dans le vocal sera dit par iHorizon.",
	tts_info_field_status: "Statut",
	tts_info_field_lang: "Langue TTS",
	tts_info_field_howto: "Comment ca marche",
	tts_info_howto_value:
		"Utilise `/tts join` pour lancer le TTS.\nUtilise `/tts leave` pour arreter.\nUtilise `/tts lang` pour changer la langue de la voix.",

	// /tts lang
	tts_lang_not_active: "${emoji_No} Le TTS est pas active sur le serv wsh !",
	tts_lang_set:
		"${emoji_Yes} La langue TTS est maintenant sur `${language}`.",

	// TTS Embed
	tts_embed_title: "Mode TTS Active",
	tts_embed_description:
		"Le module TTS est actif dans ${voiceChannel}.\nTout c'qui est envoye ici par les gens du vocal sera lu a voix haute.\n\n**Les gens dans le vocal :** ${members}",
	tts_embed_footer: "Utilise /tts leave pour couper le TTS",
	tts_join_not_text_based:
		"${emoji_No} Ce salon vocal supporte pas les messages texte frero. Active le chat texte dans le vocal ou va dans un autre vocal.",
	tts_music_blocked:
		"${emoji_No} Le TTS est active la. Coupe le TTS avant de mettre de la zik frero.",
	tts_voice_status: "Mode TTS - Synthèse Vocale",

	// H24/7 module
	// /h247 join, /h247 leave

	help_h247_fields: "H24/7",
	help_h247_dsc:
		"> *Garde iHorizon co 24/7 dans un vocal, la streak faut pas la perdre frero !*",

	// /h247 join
	h247_join_invalid_channel: "${emoji_No} Donnes un vrai salon vocal frero !",
	h247_join_already_active:
		"${emoji_No} Le H24/7 est deja actif dans ${voiceChannel} !",
	h247_join_music_playing:
		"${emoji_No} Y'a de la zik qui tourne la. Coupe la musique avant d'activer le H24/7.",
	h247_join_tts_active:
		"${emoji_No} Le TTS est actif dans un autre vocal la. Coupe le TTS avant d'activer le H24/7.",
	h247_joined:
		"${emoji_Yes} iHorizon reste co 24/7 dans ${voiceChannel}, la streak est sauvee !",
	h247_join_error:
		"${emoji_No} Y'a eu une erreur en activant le H24/7 frero.",

	// /h247 leave
	h247_leave_not_active:
		"${emoji_No} Le H24/7 est meme pas active la frero !",
	h247_left: "${emoji_Yes} Voila, le H24/7 est desactive sur ce serveur !",
	h247_leave_error:
		"${emoji_No} Y'a eu une erreur en desactivant le H24/7 frero.",

	// /h247 info
	h247_info_embed_title: "Infos du module H24/7",
	h247_info_embed_description:
		"Le H24/7 garde iHorizon co dans un vocal jour et nuit, meme sans rien jouer. C'est ce qui faut pour garder la streak vocal du serveur !\nTant que le module est actif, la zik et le TTS ne marchent que dans le vocal H24/7.\nLa connexion revient toute seule apres un restart ou un kill du player.",
	h247_info_field_status: "Statut",
	h247_info_field_howto: "Comment l'utiliser",
	h247_info_howto_value:
		"Utilise `/h247 join` pour garer iHorizon dans un vocal.\nUtilise `/h247 leave` pour couper le module.\nUtilise `/h247 info` pour revoir ce panneau.",

	// /music play
	h247_play_refused:
		"${emoji_No} Le H24/7 est actif ici. Rejoins le vocal H24/7 pour mettre de la zik !",

	// /tts join
	h247_tts_refused:
		"${emoji_No} Le H24/7 est actif ici. Rejoins le vocal H24/7 pour activer le TTS !",
	gw_go_duration_too_low: "${emoji_No} | La durée minimum est de 3 minutes !",

	// Components V2 cards: /avatar, /serverinfo, /allbots
	avatar_card_title: "Avatar de ${user}",
	card_download: "Télécharger",
	serverinfo_label_owner: "Propriétaire",
	serverinfo_label_members: "Membres",
	serverinfo_label_created: "Créé",
	serverinfo_label_joined: "Tu as rejoint",
	serverinfo_label_roles: "Rôles",
	serverinfo_label_channels: "Salons",
	serverinfo_label_boosts: "Boosts",
	serverinfo_boost_value: "${count} (niveau ${tier})",
	serverinfo_label_verification: "Vérification",
	serverinfo_label_language: "Langue",
	serverinfo_label_id: "ID",
	serverinfo_verif_none: "Aucune",
	serverinfo_verif_low: "Faible",
	serverinfo_verif_medium: "Moyenne",
	serverinfo_verif_high: "Élevée",
	serverinfo_verif_highest: "Maximale",
	all_bots_card_title: "Bots de ${guild}",
	all_bots_card_count: "${count} bots",
	all_bots_none: "Il n'y a aucun bot sur ce serveur.",

	// Components V2 cards: /unbanall, /media-only, /nick-kicker, /sync, /wlroles
	unbanall_card_progress: "Débannissement de `${count}` membres en cours…",
	unbanall_card_undo_progress:
		"Rebannissement de `${count}` membres en cours…",
	unbanall_card_title: "Tout débannir",
	unbanall_card_undo_title: "Débannissement annulé",
	unbanall_label_unbanned: "Débannis",
	unbanall_label_banned: "Rebannis",
	unbanall_label_failed: "Échecs",
	sync_card_title: "Permissions synchronisées",
	sync_card_desc:
		"Ces salons suivent maintenant les permissions de ${category} :",
	media_only_card_title: "Salons réservés aux médias",
	utils_label_save: "Enregistrer",
	nick_kicker_card_title: "Expulsion par pseudo",
	nick_kicker_label_status: "État",
	nick_kicker_label_words: "Mots",
	wlroles_card_title: "Rôles autorisés",
	wlroles_card_warn_title: "Permissions dangereuses",
	wlroles_card_high_title: "Rôles au-dessus du mien",

	// Components V2 cards: /userinfo, /banner, /inviteinfo, /serverpic, /where, /vc, /snipe
	userinfo_label_badges: "Badges",
	userinfo_label_username: "Nom d'utilisateur",
	userinfo_label_created: "Compte créé",
	userinfo_label_joined: "A rejoint le serveur",
	userinfo_label_nitro: "Nitro",
	userinfo_label_roles: "Rôles",
	userinfo_label_id: "ID",
	userinfo_card_loading: "Chargement du profil…",
	banner_card_guild_title: "Bannière de ${guild}",
	banner_card_user_title: "Bannière de ${user}",
	inviteinfo_label_channel: "Salon",
	inviteinfo_label_inviter: "Invité par",
	inviteinfo_label_created: "Serveur créé",
	inviteinfo_label_expires: "Expire",
	inviteinfo_label_members: "Membres",
	inviteinfo_label_online: "En ligne",
	inviteinfo_label_boosts: "Boosts",
	inviteinfo_label_features: "Fonctionnalités",
	serverpic_card_title: "Icône de ${guild}",
	serverpic_card_no_icon: "Ce serveur n'a pas d'icône.",
	where_card_title: "Où est ${member}",
	where_label_member: "Membre",
	where_label_channel: "Salon vocal",
	where_label_stream: "En stream",
	where_label_video: "Caméra",
	where_label_mute: "Micro coupé",
	where_label_deaf: "Son coupé",
	vc_card_title: "Activité vocale",
	vc_label_members: "Membres",
	vc_label_online: "En ligne",
	vc_label_in_voice: "En vocal",
	vc_label_streaming: "En stream",
	vc_label_boosts: "Boosts",
	vc_label_camera: "Caméra allumée",
	vc_label_muted: "Micro coupé",
	snipe_card_title: "Dernier message supprimé",
	snipe_label_author: "Auteur",
	snipe_label_sent: "Envoyé",

	// Components V2 cards: /delrole, /derank, /massiverole, /massmove, /nickrole, /setmentionrole, /util bringall, /util move
	utils_label_member: "Membre",
	utils_label_role: "Rôle",
	utils_label_by: "Par",
	utils_label_failed: "Échecs",
	utils_label_from: "Depuis",
	utils_label_to: "Vers",
	utils_label_moved: "Déplacés",
	utils_label_name_filter: "Le nom contient",
	derank_card_progress: "Retrait de ${count} rôles à ${member}…",
	derank_card_title: "Membre dérank",
	derank_label_removed: "Rôles retirés",
	massiverole_card_progress_add: "Ajout du rôle à ${count} membres…",
	massiverole_card_progress_sub: "Retrait du rôle à ${count} membres…",
	massiverole_card_title_add: "Rôle donné aux membres",
	massiverole_card_title_sub: "Rôle retiré aux membres",
	massiverole_label_added: "L'ont reçu",
	massiverole_label_already: "L'avaient déjà",
	massiverole_label_removed: "L'ont perdu",
	massiverole_label_without: "Ne l'avaient pas",
	nickrole_label_skipped: "Ignorés",
	massmove_card_title: "Membres déplacés",
	bringall_card_title: "Membres répartis",
	bringall_label_category: "Catégorie",
	bringall_label_channels: "Salons vocaux",
	setmentionrole_card_title: "Rôle de mention activé",
	setmentionrole_card_desc:
		"Quand un membre me mentionne, je lui donne ce rôle.",
	setmentionrole_card_note:
		"Seuls les membres dont le nom d'utilisateur ou le nom affiché contient ce texte reçoivent le rôle. S'ils le retirent, le rôle est retiré, puis rendu quand ils le remettent.",

	// Components V2 cards: /admin-users, /admin-roles, /allwebhooks, /role-members, /prevnames, /emojis, /leashlist, /locknamelist
	card_bot: "Bot",
	card_working: "En cours…",
	card_label_requested_by: "Demandé par",
	card_label_failed: "Échecs",
	admin_users_card_title: "Administrateurs",
	admin_users_card_count:
		"${count} membres avec la permission Administrateur",
	admin_users_card_only_bots: "Seuls des bots ont cette permission.",
	admin_users_button_hide_bots: "Masquer les bots",
	admin_users_button_show_bots: "Afficher les bots",
	admin_users_card_done_title: "Administrateurs dérankés",
	admin_users_label_unranked: "Membres dérankés",
	admin_roles_card_title: "Rôles administrateurs",
	admin_roles_card_count: "${count} rôles avec la permission Administrateur",
	admin_roles_card_managed: "Géré par une intégration",
	admin_roles_card_done_title: "Permission administrateur retirée",
	admin_roles_label_modified: "Rôles modifiés",
	allwebhooks_card_count: "${count} webhooks",
	allwebhooks_button_delete: "Tout supprimer",
	role_members_card_title: "Membres de ${role}",
	role_members_card_count: "${count} membres",
	prevnames_card_title: "Anciens noms de ${user}",
	prevnames_card_count: "${count} noms enregistrés",
	prevnames_button_erase: "Effacer mon historique",
	prevnames_label_username: "Nom d'utilisateur",
	prevnames_label_display_name: "Nom d'affichage",
	prevnames_label_nickname: "Pseudo sur ${guild}",
	emoji_card_title: "Emojis ajoutés",
	emoji_card_count: "${count} emojis créés sur ${guild}",
	util_leashlist_card_count: "${count} laisses actives",
	util_leashlist_card_expires: "Expire",
	util_locknamelist_card_count: "${count} pseudos verrouillés",
	util_locknamelist_card_by: "Verrouillé par ${user}",

	// Components V2 cards: /invites, /leaderboard, /addinvites, /removeinvites
	invites_card_title: "Statistiques d'invitations",
	invites_label_total: "Total",
	invites_label_regular: "Normales",
	invites_label_left: "Partis",
	invites_label_bonus: "Bonus",
	invites_label_invited_by: "Invité par",
	leaderboard_card_title: "Classement des invitations",
	leaderboard_card_count: "${count} membres classés sur ${guild}",
	leaderboard_card_your_rank:
		"Votre rang : ${rank}/${count} avec ${invites} invitations",
	leaderboard_card_not_ranked: "Vous n'êtes pas encore classé.",
	leaderboard_card_empty: "Personne n'a encore d'invitations sur ce serveur.",
	leaderboard_card_generated: "Généré en ${elapsed} ms",

	// Components V2 cards: /fun caracteres, catsay, hack, hug, kiss, slap, love, poll, question, tweet, youtube
	caracteres_card_title: "Choisis un style de texte",
	caracteres_card_result_title: "Ton texte en ${style}",
	caracteres_label_original: "Original",
	caracteres_label_converted: "Transformé",
	catsay_card_title: "Le chat a parlé",
	hack_card_title: "Piratage terminé",
	hack_label_ip: "Adresse IP",
	hack_label_email: "Email",
	hack_label_password: "Mot de passe",
	hug_card_title: "C'est l'heure du câlin",
	hug_card_desc: "${author} fait un gros câlin à ${target}.",
	kiss_card_title: "Un bisou",
	kiss_card_desc: "${author} fait un bisou à ${target}.",
	slap_card_title: "Une claque",
	slap_card_desc: "${author} met une claque à ${target}.",
	love_card_title: "Calculateur d'amour",
	love_card_desc: "**${user1}** + **${user2}** = `${percent}%` d'amour",
	poll_card_title: "Sondage de ${author}",
	poll_card_vote: "Réagis avec ${yes} pour oui ou ${no} pour non.",
	question_card_title: "${author} demande",
	question_label_question: "Question",
	question_label_answer: "Réponse",
	tweet_card_title: "Nouveau post de ${user}",
	youtube_card_title: "Nouveau commentaire de ${user}",

	// Components V2 cards: fun animal pictures (/cat /dog /dolphin /duck /fox /frog /panda /squirrel) and random results (/dice /heads-tails /number /rate /gay /trans /stench /transgender)
	fun_card_cat_title: "Miaou",
	fun_card_dog_title: "Ouaf ouaf",
	fun_card_dolphin_title: "Iii-iii, clic clic",
	fun_card_duck_title: "Coin coin",
	fun_card_fox_title: "Wa-pa-pa-pa-pa",
	fun_card_frog_title: "Croa croa",
	fun_card_panda_title: "Mwaa",
	fun_card_squirrel_title: "Tchic-tchic",
	fun_card_animal_hint: "Une image au hasard, rien que pour toi.",
	fun_card_dice_title: "Lancer de dés",
	fun_card_coinflip_title: "Pile ou face",
	fun_card_number_title: "Nombre aléatoire",
	fun_card_gay_title: "Gay-o-mètre",
	fun_card_trans_title: "Trans-o-mètre",
	fun_card_stench_title: "Puant-o-mètre",
	fun_card_rate_title: "Ma note",
	fun_card_transgender_title: "Avatar fierté trans",
	fun_label_dice: "Dés",
	fun_label_rolls: "Lancers",
	fun_label_total: "Total",
	fun_label_result: "Résultat",
	fun_label_range: "Intervalle",
	fun_label_score: "Score",
	fun_label_rated: "Noté",

	// Components V2 cards: /ban, /kick, /baninfo, /banlist, /mutelist, /warnlist, /unwarn, /rolepanel
	mod_label_moderator: "Modérateur",
	mod_label_warn_id: "ID de l'avertissement",
	ban_card_title: "Membre banni",
	kick_card_title: "Membre expulsé",
	baninfo_card_title: "Bannissement de ${user}",
	banlist_card_title: "Membres bannis",
	banlist_card_count: "${count} membres bannis",
	mutelist_card_title: "Membres en exclusion temporaire",
	mutelist_card_count: "${count} membres en exclusion temporaire",
	mutelist_card_ends: "Fin ${time}",
	mutelist_button_unmute_all: "Retirer toutes les exclusions",
	mutelist_card_cleared_title: "Exclusions retirées",
	mutelist_card_cleared_desc: "${count} membres peuvent de nouveau parler.",
	warnlist_card_title: "Avertissements de ${user}",
	warnlist_card_count: "${count} avertissements",
	unwarn_card_title: "Avertissement retiré",
	rolepanel_card_done_title: "Rôles mis à jour",
	rolepanel_label_added: "Ajoutés",
	rolepanel_label_removed: "Retirés",
	rolepanel_label_refused: "Refusés",

	// /stats rebuilt: Components V2 card and resvg pages
	stats_locale: "fr-FR",
	stats_view_overview: "Vue d'ensemble",
	stats_view_overview_desc: "Totaux, tendance et salons favoris",
	stats_view_rhythm: "Rythme",
	stats_view_rhythm_desc: "Quand ça se passe, heure par heure",
	stats_view_members: "Membres",
	stats_view_members_desc: "Qui écrit et qui traîne en vocal",
	stats_view_channels: "Salons",
	stats_view_channels_desc: "Les salons texte et vocaux les plus actifs",
	stats_select_placeholder: "Choisir une vue",
	stats_label_messages: "Messages",
	stats_label_voice: "Temps en vocal",
	stats_label_active_days: "Jours actifs",
	stats_label_rank: "Classement",
	stats_label_active_members: "Membres actifs",
	stats_label_members: "Membres",
	stats_label_peak: "Pic",
	stats_label_avg_length: "Longueur moyenne",
	stats_label_sessions: "Sessions vocales",
	stats_label_longest_session: "Plus longue session",
	stats_label_best_streak: "Meilleure série",
	stats_note_change_up: "+${change} % vs semaine passée",
	stats_note_change_down: "-${change} % vs semaine passée",
	stats_note_new: "Nouveau cette semaine",
	stats_note_steady: "Comme la semaine passée",
	stats_note_streak: "Série de ${days} jours",
	stats_note_rank_of: "sur ${count} membres",
	stats_note_unranked: "Pas encore classé",
	stats_note_chars: "caractères par message",
	stats_note_avg_session: "${duration} en moyenne",
	stats_note_days_in_row: "jours d'affilée",
	stats_chart_daily: "Activité quotidienne",
	stats_chart_voice_minutes: "Vocal (min)",
	stats_chart_messages_per_day: "Messages par jour",
	stats_text_channels: "Salons texte",
	stats_voice_channels: "Salons vocaux",
	stats_top_messages: "Le plus de messages",
	stats_top_voice: "Le plus de vocal",
	stats_heat_messages: "Messages",
	stats_heat_voice: "Vocal",
	stats_peak_note: "Pic : ${day} ${hour}",
	stats_empty: "Rien pour l'instant",
	stats_footer_zone: "Heures : ${zone} · 30 derniers jours",
	stats_title_user: "Activité de ${user}",
	stats_title_guild: "Activité de ${guild}",
	stats_title_channel: "Activité dans ${channel}",
	stats_title_compare: "${a} et ${b}",
	stats_title_top_messages: "Top messages",
	stats_title_top_voice: "Top vocal",
	stats_period_1d: "Dernières 24 heures",
	stats_period_7d: "7 derniers jours",
	stats_period_30d: "30 derniers jours",
	stats_insight_peak: "Le plus actif le ${day} vers ${hour}.",
	stats_insight_up: "${change} % de messages en plus que la semaine passée.",
	stats_insight_down:
		"${change} % de messages en moins que la semaine passée.",
	stats_insight_channel: "Salon favori : ${channel}.",
	stats_insight_streak: "Actif ${days} jours d'affilée.",
	stats_insight_leader: "${user} mène avec ${value}.",
	stats_insight_compare:
		"${user} est devant sur ${count} critères sur ${total}.",
	stats_insight_tie: "Au coude à coude.",
	stats_compare_same: "Choisis deux membres différents.",
	stats_wrong_channel: "Choisis un salon texte ou vocal.",

	// /stats rebuilt: Components V2 card and resvg pages
	stats_card_no_data: "Aucune activité enregistrée ces 30 derniers jours.",

	// /music apo panel
	music_apo_panel_title: "Equalizer APO",
	music_apo_panel_on: "Module activé",
	music_apo_panel_off: "Module désactivé",
	music_apo_panel_applied: "Appliquée par défaut : **${name}**",
	music_apo_panel_nothing_applied: "Aucune config appliquée par défaut",
	music_apo_panel_count:
		"${count}/${max} configs · celle appliquée façonne tout ce que joue le serveur",
	music_apo_panel_empty:
		"Aucune config pour l'instant. Ajoute un fichier Equalizer APO .txt avec le bouton ci-dessous.",
	music_apo_badge_applied: "Appliquée",
	music_apo_badge_frozen: "Gelée",
	music_apo_config_meta:
		"par ${user} · modifiée ${time} · ${lines} lignes · ${size}",
	music_apo_button_manage: "Gérer",
	music_apo_button_add: "Ajouter une config",
	music_apo_button_enable: "Activer",
	music_apo_button_disable: "Désactiver",
	music_apo_button_apply: "Appliquer par défaut",
	music_apo_button_unapply: "Ne plus appliquer",
	music_apo_button_rename: "Renommer",
	music_apo_button_replace: "Remplacer le fichier",
	music_apo_button_freeze: "Geler",
	music_apo_button_unfreeze: "Dégeler",
	music_apo_button_delete: "Supprimer",
	music_apo_button_confirm_delete: "Supprimer définitivement",
	music_apo_button_cancel: "Annuler",
	music_apo_frozen_note:
		"Gelée par ${user} : elle peut être appliquée, pas renommée, remplacée ni supprimée.",
	music_apo_confirm_delete: "Supprimer **${name}** ? C'est définitif.",
	music_apo_modal_add_title: "Ajouter une config APO",
	music_apo_modal_replace_title: "Remplacer le fichier",
	music_apo_modal_rename_title: "Renommer la config",
	music_apo_field_name: "Nom",
	music_apo_field_name_desc:
		"Affiché dans le panneau, ${max} caractères maximum",
	music_apo_field_file: "Fichier Equalizer APO",
	music_apo_field_file_desc:
		"Un fichier .txt, ${kb} Kio et ${lines} lignes de commandes maximum",
	music_apo_no_permission:
		"${emoji} Seuls les administrateurs et propriétaires du serveur peuvent gérer ses configs APO.",
	music_apo_full:
		"${emoji} Ce serveur a déjà ${max} configs. Supprimes-en une d'abord.",
	music_apo_name_taken: "${emoji} Une config s'appelle déjà **${name}**.",
	music_apo_name_empty: "${emoji} Donne un nom à la config.",
	music_apo_not_txt: "${emoji} Envoie un fichier .txt.",
	music_apo_too_big: "${emoji} Le fichier dépasse ${kb} Kio.",
	music_apo_too_many_lines:
		"${emoji} Le fichier a plus de ${lines} lignes de commandes.",
	music_apo_empty_file: "${emoji} Le fichier est vide.",
	music_apo_frozen: "${emoji} **${name}** est gelée : dégèle-la d'abord.",
	music_apo_cannot_unfreeze:
		"${emoji} Seuls ${user}, les propriétaires du serveur ou du bot peuvent la dégeler.",
	music_apo_saved: "${emoji} **${name}** enregistrée (${stages} étapes).",
	// +shardinfo
	shardinfo_title: "Informations sur les shards",
	shardinfo_location:
		"Ce serveur est sur le shard **${shardId}**. Commande traitée par le shard **${handlerShardId}**, processus `${pid}`.",
	shardinfo_member_data:
		"Nombre de membres : **${exactCount}** exacts, **${approximateCount}** approximatifs, **${missingCount}** manquants",
	shardinfo_offline_shards: "Shards sans réponse : ${shards}",
	shardinfo_section_unavailable: "Serveurs indisponibles",
	shardinfo_section_approximate: "Serveurs au nombre approximatif",
	shardinfo_section_missing: "Serveurs sans données de membres",
	shardinfo_card_title: "Shards d'iHorizon",
	shardinfo_card_summary: "Généré par le shard ${shardId} · processus ${pid}",
	shardinfo_card_pill: "${onlineCount}/${shardCount} en ligne",
	shardinfo_card_shard: "Shard ${shardId}",
	shardinfo_card_state_online: "En ligne",
	shardinfo_card_state_starting: "Connexion",
	shardinfo_card_state_offline: "Hors ligne",
	shardinfo_card_no_response: "Aucune réponse",
	shardinfo_card_servers: "Serveurs",
	shardinfo_card_servers_unit: "serveurs",
	shardinfo_card_servers_detail: "${unavailableCount} indisponibles",
	shardinfo_card_members: "Membres",
	shardinfo_card_members_detail: "${averageCount} par serveur",
	shardinfo_card_ping: "Ping moyen",
	shardinfo_card_ping_detail: "Maximum : ${ping}",
	shardinfo_card_shard_ping: "Ping",
	shardinfo_card_memory: "Mémoire",
	shardinfo_card_memory_detail: "${size} par shard",
	shardinfo_card_voice: "Vocal",
	shardinfo_card_voice_detail: "${channelCount} salons",
	shardinfo_card_channels: "Salons",
	shardinfo_card_uptime: "Uptime",
	shardinfo_card_chart_servers: "Serveurs par shard",
	shardinfo_card_chart_members: "Membres par shard",
	shardinfo_card_chart_average: "Moyenne : ${value}",
	shardinfo_card_unit_day: "j",
	shardinfo_card_unit_hour: "h",
	shardinfo_card_unit_minute: "min",
	// ?status-embed
	status_panel_title: "# ${emoji_Logo} Statut d'iHorizon",
	status_panel_headline:
		"${state} **${label}** · ${upCount}/${totalCount} services en ligne",
	status_panel_label_operational: "Tous les systèmes sont opérationnels",
	status_panel_label_maintenance: "Maintenance en cours",
	status_panel_label_degraded: "Panne partielle",
	status_panel_label_major: "Panne majeure",
	status_panel_button: "Page de statut",
	status_panel_group: "### ${emoji_Server_Stats} ${name}",
	status_panel_group_core: "Services principaux",
	status_panel_service_gateway: "HorizonGateway (API)",
	status_panel_service_lavalink: "Lavalink (musique)",
	status_panel_service_website: "Site d'iHorizon",
	status_panel_row: "${status} **${name}** · ${detail}",
	status_panel_row_detail: "`${ping} ms` · `${uptime}`",
	status_panel_row_offline: "Hors ligne",
	status_panel_row_maintenance: "En maintenance",
	status_panel_row_pending: "Vérification",
	status_panel_incident: "### ${emoji_Warning_Icon} ${title}\n${content}",
	status_panel_footer:
		"-# ${emoji_Timer} Mis à jour ${time} · actualisé chaque minute",
	status_panel_kuma_unavailable:
		"-# ${emoji_Warn} Uptime Kuma est injoignable, affichage des vérifications du bot.",
	status_panel_loading:
		"${emoji_Discord_Loading} Chargement du panneau de statut...",
	status_panel_card_title: "État de l'infrastructure",
	status_panel_card_summary: "${upCount}/${totalCount} services en ligne",
	status_panel_card_uptime_24h: "Disponibilité 24h",
	status_panel_card_uptime_30d: "Disponibilité 30j",
	status_panel_card_response: "Réponse moyenne",
	status_panel_card_ws: "Ping Discord",
	status_panel_card_col_history: "60 derniers contrôles",
	status_panel_card_col_ping: "Ping",
	status_panel_card_col_uptime: "30j",
	status_panel_card_chart: "Temps de réponse moyen"
} satisfies LanguageData;
