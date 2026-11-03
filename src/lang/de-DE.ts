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
	// de-DE: Deutsch

	// Variable
	var_member: "Mitglieder",
	var_user: "Benutzer",
	var_author: "Autor",
	var_reason: "Grund",
	var_guild: "Gilde",
	var_sanction: "Sanktion",
	var_time: "Zeit",
	var_message: "Nachricht",
	var_no_set: "Nicht gesetzt",
	var_none: "Keine",
	var_roles: "Rollen",
	var_names: "Namen",
	var_text_channel: "Textkanal",
	var_voice_channel: "Sprachkanal",
	var_creator: "Ersteller",
	var_doesnt_have_permissions:
		"Du bist nicht autorisiert, dies zu tun. Du benötigst die {permission} Berechtigung.",
	var_ihorizon: "iHorizon",
	var_developer: "Entwickler",
	var_chance: "Glück",
	var_other: "Andere",
	var_unknown: "Unbekannt",
	var_secure: "Sicher",
	var_unsecure: "Unsicher",
	var_prefix: "Präfix",
	var_slash: "Slash",
	var_discord: "Discord",
	var_network: "Netzwerk",
	var_latency: "Latenz",
	var_bot: "Bot",
	var_true: "Wahr",
	var_false: "Falsch",
	var_enabled: "Aktiviert",
	var_disabled: "Deaktiviert",
	var_yes: "Ja",
	var_no: "Nein",
	var_colour: "Farbe",
	var_length: "Länge",
	var_good: "Gut",
	var_size: "Größe",
	var_level: "Stufe",
	var_add: "Hinzufügen",
	var_remove: "Entfernen",
	var_edit: "Bearbeiten",
	var_confirm: "Bestätigen",
	var_succes: "Erfolg",
	var_page: "Seite",
	var_permission: "Berechtigung",
	var_usage: "Verwendung",
	var_aliases: "Aliase",
	var_dont_have_perm:
		"Sie haben nicht die erforderlichen Berechtigungen. (Benötigt {perm} Berechtigung)",
	var_price: "Preis",
	var_boost: "Boost",
	var_uses: "Verwendungen",
	var_vc_stats: "Sprachstatistiken",
	var_1d: "1 Tag",
	var_7d: "7 Tage",
	var_14d: "14 Tage",
	var_year: "Jahr(e)",
	var_mo: "Monat(e)",
	var_w: "Woche(n)",
	var_d: "Tag(e)",
	var_h: "Stunde(n)",
	var_m: "Minute(n)",
	var_s: "Sekunde(n)",
	var_ms: "Millisekunde(n)",
	var_banned_user: "Gesperrter Benutzer",
	var_no_one_banned: "Niemand ist in diesem Server gesperrt.",
	var_category: "Kategorie",
	var_total: "Gesamt",
	var_online_members: "Online-Mitglied(er)",
	var_boost_level: "Boost-Stufe",
	var_features: "Funktionen",
	var_guild_icon: "Server-Icon",
	var_guild_banner: "Server-Banner",
	var_guild_splash: "Server-Splash",
	var_unknown_guild_name: "Unbekannter Servername",
	var_preview: "Vorschau",
	var_form: "Formular",
	var_original_message: "Ursprüngliche Nachricht",
	var_click_here: "Hier klicken",
	var_s_message: "Nachricht von {nickname}",
	var_source: "Musik von: ",
	var_online_call: "Im Sprachkanal",
	var_online: "Online",
	var_stream: "Streamt",
	var_boosts: "Boosts",
	var_muted: "Stummgeschaltet",
	var_camera: "Kamera aktiviert",

	// Discord-Berechtigungsnamen
	perm_createinstantinvite_name: "Soforteinladung erstellen",
	perm_kickmembers_name: "Mitglieder kicken",
	perm_banmembers_name: "Mitglieder bannen",
	perm_administrator_name: "Administrator",
	perm_managechannels_name: "Kanäle verwalten",
	perm_manageguild_name: "Server verwalten",
	perm_addreactions_name: "Reaktionen hinzufügen",
	perm_viewauditlog_name: "Audit-Log einsehen",
	perm_priorityspeaker_name: "Vorrangiger Sprecher",
	perm_stream_name: "Streamen",
	perm_viewchannel_name: "Kanäle ansehen",
	perm_sendmessages_name: "Nachrichten senden",
	perm_sendttsmessages_name: "TTS-Nachrichten senden",
	perm_managemessages_name: "Nachrichten verwalten",
	perm_embedlinks_name: "Links einbetten",
	perm_attachfiles_name: "Dateien anhängen",
	perm_readmessagehistory_name: "Nachrichtenverlauf lesen",
	perm_mentioneveryone_name: "@everyone erwähnen",
	perm_useexternalemojis_name: "Externe Emojis verwenden",
	perm_viewguildinsights_name: "Server-Einblicke anzeigen",
	perm_connect_name: "Verbinden",
	perm_speak_name: "Sprechen",
	perm_mutemembers_name: "Mitglieder stummschalten",
	perm_deafenmembers_name: "Mitglieder taubschalten",
	perm_movemembers_name: "Mitglieder verschieben",
	perm_usevad_name: "Sprachaktivierung nutzen",
	perm_changenickname_name: "Nickname ändern",
	perm_managenicknames_name: "Nicknamen verwalten",
	perm_manageroles_name: "Rollen verwalten",
	perm_managewebhooks_name: "Webhooks verwalten",
	perm_manageemojisandstickers_name: "Emojis und Sticker verwalten",
	perm_manageguildexpressions_name: "Server-Ausdrücke verwalten",
	perm_useapplicationcommands_name: "Anwendungsbefehle verwenden",
	perm_requesttospeak_name: "Reden anfragen",
	perm_manageevents_name: "Events verwalten",
	perm_managethreads_name: "Threads verwalten",
	perm_createpublicthreads_name: "Öffentliche Threads erstellen",
	perm_createprivatethreads_name: "Private Threads erstellen",
	perm_useexternalstickers_name: "Externe Sticker verwenden",
	perm_sendmessagesinthreads_name: "Nachrichten in Threads senden",
	perm_useembeddedactivities_name: "Eingebettete Aktivitäten nutzen",
	perm_moderatemembers_name: "Mitglieder moderieren",
	perm_viewcreatormonetizationanalytics_name:
		"Monetarisierungsanalysen anzeigen",
	perm_usesoundboard_name: "Soundboard verwenden",
	perm_createguildexpressions_name: "Server-Ausdrücke erstellen",
	perm_createevents_name: "Events erstellen",
	perm_useexternalsounds_name: "Externe Sounds verwenden",
	perm_sendvoicemessages_name: "Sprachnachrichten senden",
	perm_sendpolls_name: "Umfragen senden",
	perm_useexternalapps_name: "Externe Apps verwenden",

	// Ticket commands
	// /add, /close, /delete, /sethereticket, /open, /remove, /transript, /disableticket
	ticket_disabled_command:
		"Sie können diesen Befehl nicht verwenden, da ein Administrator die Ticket-Befehle deaktiviert hat!",

	// /add
	add_disabled_command:
		"Sie können diesen Befehl nicht verwenden, da ein Administrator die Ticket-Befehle deaktiviert hat!",
	add_command_work:
		"${memberTag} wurde erfolgreich zu Ihrem Ticket hinzugefügt!",
	add_command_error:
		"Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut!",

	// /close
	close_disabled_command:
		"Sie können diesen Befehl nicht verwenden, da ein Administrator die Ticket-Befehle deaktiviert hat!",
	close_title_sourcebin: "Ticket-Transkript von iHorizon",
	close_description_sourcebin: " ",
	close_error_command:
		"Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut!",
	close_command_work_channel:
		"Sie haben Ihr Ticket geschlossen. iHorizon hat Ihnen das Transkript gesendet.",
	close_command_work_notify_channel:
		"Das Ticket wurde erfolgreich geschlossen!",
	close_command_error:
		"Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut!",
	close_not_in_ticket:
		"Sie können diesen Befehl außerhalb eines Ticket-Kanals nicht verwenden!",

	// /delete
	delete_disabled_command:
		"Sie können diesen Befehl nicht verwenden, da ein Administrator die Ticket-Befehle deaktiviert hat!",
	delete_not_in_ticket:
		"Sie können diesen Befehl außerhalb eines Ticket-Kanals nicht verwenden!",
	ticket_deleted:
		"Das Ticket ${ticketOwnerMention} wurde von <@${deletedByUserId}> gelöscht. Hier ist das Transkript:",

	// /sethereticket
	sethereticket_panel_select_embed_desc:
		"# Panelname\n```${panelName}```\n{msg}\n\n## Kategorie\n```{category}```\n",

	// /open
	open_disabled_command:
		"Du kannst diesen Befehl nicht verwenden, da ein Administrator die Ticket-Befehle deaktiviert hat!",
	open_command_work: "${channel} erfolgreich wieder geöffnet",
	open_command_error:
		"Es ist ein Fehler aufgetreten, bitte versuche es erneut!",
	open_not_in_ticket:
		"Du kannst diesen Befehl außerhalb eines Ticket-Kanals nicht verwenden!",

	// /remove
	remove_disabled_command:
		"Du kannst diesen Befehl nicht verwenden, da ein Administrator die Ticket-Befehle deaktiviert hat!",
	remove_not_in_ticket:
		"Du kannst diesen Befehl außerhalb eines Ticket-Kanals nicht verwenden!",
	remove_command_error:
		"Es ist ein Fehler aufgetreten, bitte versuche es erneut!",
	remove_command_work: "${memberTag} erfolgreich aus deinem Ticket entfernt!",

	// /transcript
	transript_disabled_command:
		"Du kannst diesen Befehl nicht verwenden, da ein Administrator die Ticket-Befehle deaktiviert hat!",
	transript_name_sourcebin: " ",
	transript_title_sourcebin: "Ticket Chat-Protokoll für ${channelName}",
	transript_command_error:
		"Es ist ein Fehler aufgetreten, bitte versuche es erneut!",
	transript_command_work:
		"Du hast dein Ticket geschlossen. iHorizon hat dir das Protokoll gesendet.",
	transript_not_in_ticket:
		"Du kannst diesen Befehl außerhalb eines Ticket-Kanals nicht verwenden!",

	// /disableticket
	disableticket_not_admin:
		":x: | Sie müssen Administrator dieses Servers sein, um diesen Befehl auszuführen!",
	disableticket_logs_embed_title_disable: "Deaktiviere-Ticket-Logs",
	disableticket_logs_embed_description_disable:
		"<@${authorId}> hat die Ticket-Befehle deaktiviert!",
	disableticket_command_work_disable:
		"Sie haben erfolgreich die Ticket-Befehle deaktiviert!",
	disableticket_logs_embed_title_enable: "Aktiviere-Ticket-Logs",
	disableticket_logs_embed_description_enable:
		"<@${authorId}> hat die Ticket-Befehle aktiviert!",
	disableticket_command_work_enable:
		"Sie haben erfolgreich die Ticket-Befehle aktiviert!",

	// /setticketcategory
	setticketcategory_not_admin:
		":x: | Sie müssen ein Administrator dieses Servers sein, um diesen Befehl anzufordern!",
	setticketcategory_disabled_command:
		"Sie können diesen Befehl nicht verwenden, da ein Administrator die Ticket-Befehle deaktiviert hat!",
	setticketcategory_not_a_category:
		"Der angegebene Kanal ist keine Kategorie, bitte versuchen Sie es erneut.",
	setticketcategory_command_work:
		"<@${authorId}>, Sie haben die Kategorie für den Ticket-Kanal auf `${categoryName}` festgelegt!",

	// /ticket log-channel
	ticket_logchannel_embed_title: "Ticket-Logs-Kanal",
	ticket_logchannel_embed_desc:
		"${author}, du hast den Ticket-Modul-Logs-Kanal auf ${channel} gesetzt!",

	// /ticket panel
	ticket_panel_default_placeholder:
		"Wähle eine Kategorie, um ein Ticket zu öffnen",
	ticket_panel_embed_title: "Ticket-Panel #",
	ticket_panel_embed_desc:
		"Passe ein Ticket-Embed mit spezifischen Optionen an",
	ticket_panel_saved_conf: "💾 Gespeicherte Konfiguration",
	ticket_panel_related_embed: "🕸️ Zugehöriges Embed",
	ticket_panel_role_to_ping: "📌 Zu pingende Rolle",
	ticket_panel_ping_user: "📎 Benutzer pingen",
	ticket_panel_placeholder: "🏷️ Platzhalter",
	ticket_panel_category: "📤 Kategorie",
	ticket_panel_option_fields: "📔 Optionsfelder",
	ticket_panel_form: "📝 Formular",
	ticket_panel_panel_placeholder: "Optionen auswählen",
	ticket_panel_panel_1_label: "Aktuelle Konfiguration speichern",
	ticket_panel_panel_2_label: "Vorschau anzeigen",
	ticket_panel_panel_3_label: "Aktuelles zugehöriges Embed ändern",
	ticket_panel_panel_4_label: "Rolle zum Pingen hinzufügen/entfernen",
	ticket_panel_panel_5_label: "Platzhalter ändern",
	ticket_panel_panel_6_label: "Kategorie ändern",
	ticket_panel_panel_7_label: "Benutzer-Ping ändern",
	ticket_panel_panel_8_label: "Optionsfelder hinzufügen/entfernen",
	ticket_panel_panel_9_label: "Formular ändern",
	ticket_panel_button_send: "Embed senden",
	ticket_panel_change_category_channelSelect_placeholder:
		"Kategorie auswählen",
	ticket_panel_select_channel_to_send:
		"Wähle einen Kanal zum Senden des Embeds",
	ticket_panel_change_placeholder_modal_title: "Platzhalter ändern",
	ticket_panel_change_placeholder_modal_placeholder: "Neuer Platzhalter",
	ticket_panel_need_save_config:
		"Du musst die aktuelle Konfiguration speichern, bevor du das Embed sendest",
	ticket_panel_need_1_option:
		"Du brauchst mindestens eine Option, um das Embed zu senden",
	ticket_panel_related_embed_dont_exist:
		"Das zugehörige Embed existiert nicht",
	ticket_panel_channel_error:
		"Der Kanal existiert nicht oder ich habe keine Berechtigung, dort Nachrichten zu senden",
	ticket_panel_embed_been_send: "Das Embed wurde an den Kanal gesendet",
	ticket_panel_successfully_saved:
		"Die Konfiguration wurde erfolgreich gespeichert",
	ticket_panel_change_role_roleSelect_placeholder: "Rolle auswählen",
	ticket_panel_change_role_interaction_content:
		"Wähle eine Rolle aus, die beim Öffnen eines Tickets gepingt werden soll",
	ticket_panel_change_embed_modal_title: "Zugehöriges Embed ändern",
	ticket_panel_change_embed_modal_placeholder: "Embed-ID",
	ticket_panel_change_embed_dont_exist: "Das Embed existiert nicht",
	ticket_panel_change_option_select_placeholder: "Option auswählen",
	ticket_panel_change_option_select_1_label: "Neues Optionsfeld hinzufügen",
	ticket_panel_change_option_select_2_label: "Optionsfeld entfernen",
	ticket_panel_change_option_interaction_content:
		"Wähle eine Option zum Hinzufügen oder Entfernen von Optionsfeldern",
	ticket_panel_add_option_max_10:
		"Du kannst nicht mehr als 10 Optionsfelder hinzufügen",
	ticket_panel_add_option_modal_title: "Optionsfeld hinzufügen",
	ticket_panel_add_option_modal_field1_label: "Name",
	ticket_panel_add_option_modal_field2_label: "Beschreibung",
	ticket_panel_add_option_modal_field3_label: "Emoji",
	ticket_panel_remove_option_empty:
		"Es gibt keine Optionsfelder zum Entfernen",
	ticket_panel_remove_option_select_placeholder:
		"Wähle eine Option zum Entfernen",
	ticket_panel_rempve_option_interaction_content:
		"Wähle eine Option zum Entfernen",
	ticket_panel_change_form_select_placeholder_1: "Formularfeld hinzufügen",
	ticket_panel_change_form_select_placeholder_2: "Formularfeld entfernen",
	ticket_panel_change_form_interaction_content:
		"Wähle eine Option zum Hinzufügen oder Entfernen von Formularfeldern",
	ticket_panel_add_form_max_3:
		"Du kannst nicht mehr als 3 Formularfelder hinzufügen",
	ticket_panel_add_form_modal_title: "Formularfeld hinzufügen",
	ticket_panel_add_form_modal_field1_label: "Fragentitel",
	ticket_panel_add_form_modal_field2_label: "Fragen-Platzhalter",
	ticket_panel_preview_message: "Vorschau des Ticket-Panels",
	ticket_panel_option_change_category:
		"Wählen Sie eine Option, um die Kategorie zu ändern",
	ticket_panel_panel_10_label: "Kategorie für eine spezifische Option ändern",
	ticket_panel_channel_panel_embed_id: "Ticket-Kanal-Embed-ID",
	ticket_panel_panel_11_label: "Ticket-Kanal-Embed-Panel ändern",
	ticket_panel_select_user: "Menü zum Hinzufügen von Mitgliedern zum Ticket",
	ticket_panel_button_delete: "Schaltfläche zum Löschen des Tickets",
	ticket_panel_button_transcript:
		"Schaltfläche zum Erstellen eines Transkripts",
	ticket_panel_panel_12_label:
		"Menü zum Hinzufügen/Entfernen von Mitgliedern im Ticket anzeigen",
	ticket_panel_panel_13_label:
		"Schaltfläche zum Löschen eines Tickets anzeigen",
	ticket_panel_panel_14_label: "Schaltfläche für das Transkript anzeigen",
	ticket_panel_tip_about_variable1:
		"${emoji_VC_OpenChat} **Wussten Sie schon?** Wenn Sie `/utils embed` verwenden, um ein Embed zu erstellen, können Sie die Variable **`{category}`** einfügen, die durch die vom Benutzer gewählte Kategorie ersetzt wird.",
	ticket_panel_no_question_to_delete: "Keine Frage zum Löschen vorhanden.",
	ticket_panel_chose_a_question: "Wähle eine Frage",
	ticket_panel_select_question_to_delete: "Wähle eine Frage zum Löschen aus.",
	ticket_panel_panel_15_label: "Embed pro Option konfigurieren",
	ticket_panel_panel_16_label: "Formular pro Option konfigurieren",
	ticket_panel_panel_17_label:
		"Konfiguriere Rollen, die pro Option erwähnt werden sollen",
	ticket_panel_mode: "⚙️ Modus",
	ticket_panel_mode_simple: "Einfach",
	ticket_panel_mode_advanced: "Erweitert",
	ticket_panel_mode_simple_desc:
		"Ein Button öffnet ein Ticket, ohne Auswahl oder Fragen.",
	ticket_panel_mode_advanced_desc:
		"Ein Menü mit Optionen, Einstellungen pro Option und Formularen.",
	ticket_panel_panel_18_label: "Modus wechseln (einfach / erweitert)",
	ticket_panel_simple_default_title: "Support",
	ticket_panel_simple_default_desc:
		"Brauchst du Hilfe? Klicke auf den Button unten, um ein Ticket zu öffnen.",
	ticket_panel_manage_form_title:
		"Formular verwalten für Option: **${optionName}**",
	ticket_panel_change_embed_options:
		"Wähle eine Option, um die Embed-ID des Kanal-Panels zu ändern.",
	ticket_panel_change_embed_options_null:
		"Es gibt keine Optionen zum Bearbeiten der Kanal-Panel-Embed-ID.",
	ticket_panel_change_embed_options_chose:
		"Wähle die Kategorie, um die Kanal-Panel-ID zu ändern.",
	ticket_panel_add_a_question: "Frage hinzufügen",
	ticket_panel_remove_a_question: "Frage löschen",
	ticket_panel_option_invalid: "❌ Ungültige Option.",
	ticket_panel_chose_option_to_form:
		"Wähle eine Option, um ihr Formular zu konfigurieren.",
	var_chose_option: "Wähle eine Option",
	ticket_panel_saved_and_sended_panel:
		"Das Ticket-Panel #${panelCode} wurde erfolgreich in ${channel} gesendet. Bitte bewahre den Code auf, falls du das Panel ändern musst.",
	var_title: "Titel",
	var_action: "Aktion",

	// /ticket rename
	ticket_rename_ok: "Ticket-Kanal wurde umbenannt!",
	ticket_rename_error: "Fehler beim Umbenennen des Textkanals.",

	// /ticket unlink
	ticket_unlink_command_ok:
		"${emoji_Yes} | **Der Kanal wurde vom Ticket-Modul getrennt.**",
	ticket_unlink_panel_edited_content:
		"Dieser Kanal war ein altes Ticket. Der Benutzer {user} hat diesen Kanal getrennt.",

	// /ticket remind
	ticket_remind_embed_title: "Oh-oh! Ticket-Erinnerung",
	ticket_remind_embed_desc:
		"Du bist nicht sehr aktiv, das ist kein Problem, aber dein Ticket wird noch bearbeitet! Komm vorbei und antworte!",
	ticket_remind_embed_fields_1_name: "Letzte Antwort",
	ticket_remind_command_ok:
		"Ich habe dem Benutzer eine Erinnerungsnachricht gesendet.",
	var_never: "Nie",

	// Ranks commands
	// /xp, /setxpchannels, /disablexp

	// /disablexp
	disablexp_not_admin:
		":x: | Sie müssen Administrator dieses Servers sein, um diesen Befehl auszuführen!",
	disablexp_logs_embed_title_disable: "Deaktiviere-XP-Logs",
	disablexp_logs_embed_description_disable:
		"<@${authorId}> hat XP deaktiviert!",
	disablexp_command_work_disable:
		"Sie haben erfolgreich die Leveling-Nachrichten (XP) deaktiviert!",
	disablexp_logs_embed_title_enable: "Aktiviere-XP-Logs",
	disablexp_logs_embed_description_enable: "<@${authorId}> hat XP aktiviert!",
	disablexp_command_work_enable:
		"Sie haben erfolgreich die Leveling-Nachrichten (XP) aktiviert!",
	disablexp_command_work_disable_entierly:
		"Sie haben das Ränge-Modul erfolgreich deaktiviert! (Keine weiteren Beiträge und Benutzer steigen nicht auf)",

	// /setxpchannels
	setxpchannels_not_admin:
		":x: | Sie müssen ein Administrator dieses Servers sein, um diesen Befehl auszuführen!",
	setxpchannels_logs_embed_title_disable: "SetXpChannels Protokolle",
	setxpchannels_logs_embed_description_disable:
		"<@${authorId}> deaktivieren die benutzerdefinierten XP-Kanäle. Ich setze die Standardeinstellungen...",
	setxpchannels_already_disabled_disable:
		"Die benutzerdefinierten XP-Kanäle sind bereits deaktiviert!",
	setxpchannels_command_work_disable:
		"Sie haben den benutzerdefinierten XP-Kanal erfolgreich deaktiviert!",
	setxpchannels_command_error_disable:
		"Fehler: fehlende Berechtigungen oder Kanal existiert nicht",
	setxpchannels_logs_embed_title_enable: "SetXpChannels Protokolle",
	setxpchannels_logs_embed_description_enable:
		"<@${authorId}> setzen die benutzerdefinierten XP-Kanäle auf: <#${argsid}>",
	setxpchannels_valid_channel_message:
		"Sie müssen einen gültigen Kanal für Ihre Konfiguration angeben.",
	setxpchannels_already_with_this_config:
		"Die benutzerdefinierten XP-Kanäle sind bereits mit dieser Kanal-ID konfiguriert!",
	setxpchannels_confirmation_message:
		"**Benutzerdefinierter XP-Kanal hier festgelegt!**",
	setxpchannels_command_work_enable:
		"Sie haben den benutzerdefinierten XP-Kanal erfolgreich auf <#${argsid}> festgelegt!",
	setxpchannels_command_error_enable:
		"Fehler: fehlende Berechtigungen oder Kanal existiert nicht",

	// /level
	level_embed_title: "__**XP Level**__: `${userUsername}`",
	level_embed_fields1_name: ":arrow_up:・__Levels:__",
	level_embed_fields1_value: "`${currentxp}/${xpNeeded}`",
	level_embed_fields2_name: ":money_with_wings:・__Erfahrung:__",
	level_embed_fields2_value: "`${level}`",
	level_embed_description:
		"`${expNeededForLevelUp}` **Erfahrungspunkte benötigt für das nächste Level!**",
	level_xp_needed_for_new_level: "XP bis zum nächsten Level:",
	level_xp_total: "Gesamt-XP:",

	// /ranks leaderboard
	ranks_leaderboard_top_txt: "Top #${i}",
	ranks_leaderboard_top_txt_raw: "Top #${i} ${rawText}\n",
	ranks_leaderboard_txt_text:
		"👤 ${user} `(${userGlobalName})`\n⭐ ➥ **Level**: `${level}`\n🔱 ➥ **XP Gesamt**: `${xpTotal}`",
	ranks_leaderboard_embed_title: "🏆 Server-Bestenliste der Legenden",
	ranks_leaderboard_embed_footer:
		"Seite ${cPage} von ${totalPages} • Sortiert nach Gesamt-XP",

	// /ranks ignore-channels
	ranks_ignorechannels_embed_title: "Ranks Modulkonfigurationen",
	ranks_ignorechannels_embed_desc:
		"Wenn neue Nachrichten in einem dieser Kanäle gesendet werden, ignoriert das Ranks Modul sie.",

	// /ranks set-message
	ranksSetMessage_not_admin:
		":x: | Sie müssen ein Administrator dieses Servers sein, um diesen Befehl anzufordern!",
	ranksSetMessage_help_embed_title: "/ranks set-message Hilfe !",
	ranksSetMessage_help_embed_description: "/ranks set-message",
	ranksSetMessage_help_embed_fields_name: "Wie zu verwenden?",
	ranksSetMessage_logs_embed_title_on_enable: "RanksSetMessage Logs",
	ranksSetMessage_logs_embed_description_on_enable:
		"<@${authorId}> hat die Ränge-Nachricht gesetzt!",
	ranksSetMessage_command_work_on_enable:
		"${emoji_GreenTick} | Ränge-Nachricht erfolgreich gesetzt.",
	ranksSetMessage_logs_embed_title_on_disable: "RanksSetMessage Logs",
	ranksSetMessage_logs_embed_description_on_disable:
		"<@${authorId}> hat die Ränge-Nachricht gelöscht!",
	ranksSetMessage_command_work_on_disable:
		"${emoji_Yes} | Benutzerdefinierte Ränge-Nachricht erfolgreich gelöscht.",
	ranksSetMessage_command_work_ls: "Die Ränge-Nachricht ist:",
	ranksSetMessage_help_embed_fields_custom_name:
		"Benutzerdefinierte Nachricht",
	ranksSetMessage_help_embed_fields_custom_name_empy: "Nicht gesetzt!",
	ranksSetMessage_help_embed_fields_default_name_empy: "Standardnachricht",
	ranksSetMessage_help_embed_desc:
		"{memberUsername} => Der Benutzername des Mitglieds\n{memberMention} => Das Mitglied erwähnen\n{memberCount} => Anzahl der Gildenmitglieder\n{guildName} => Der Name der Gilde\n{createdAt} => Kontenerstellungsdatum im Format tt/mm/jjjj\n{xpLevel} => XP-Level des Benutzers\n{accountCreationTimestamp} => Zeitstempel der Kontoerstellung",
	ranksSetMessage_button_set_name: "Nachricht setzen",
	ranksSetMessage_buttom_del_name: "Standardnachricht",
	ranksSetMessage_awaiting_response:
		"Schreiben Sie die neue benutzerdefinierte Ränge-Nachricht.",
	ranksSetMessage_embed_fields_xpmessage: "Ränge-Nachricht",

	// /ranks ranks-ureset
	reset_uranks_are_you_sure:
		"**Sind Sie sich wirklich sicher, dass Sie alle Rangdaten löschen möchten?\nDiese Aktion ist dauerhaft und kann nicht rückgängig gemacht werden.**\n**Diese Aktion ist zerstörerisch!!**",
	reset_uranks_logs_embed_title:
		"Protokolle des Rangmoduls (GEFÄHRLICHE AKTION)",
	reset_uranks_logs_embed_desc:
		"${author} hat alle Rangdaten für ${user} gelöscht!",

	// /ranks config
	ranks_config_embed_title: "🏆 Rangrollen-Konfiguration",
	ranks_config_embed_desc:
		"Passen Sie die rollenbasierten Belohnungen Ihres Servers an!",
	ranks_config_autofields_name: "🌟 Stufe ${level}",
	ranks_config_autofields_value:
		"Rolle: <@&${roleId}>\n🔓 Freigeschaltet bei Stufe ${level}",
	ranks_config_nofields_name: "🚫 Keine Rollen konfiguriert",
	ranks_config_nofields_value:
		"Richten Sie Rangrollen ein, um aktive Mitglieder zu belohnen!",
	ranks_config_help_footer:
		"Seite ${currentPage} von ${totalPage} • Gesamtränge: ${totalRanks}",
	ranks_config_btn_add_name: "Rolle hinzufügen",
	ranks_config_btn_remove_name: "Rolle entfernen",
	ranks_config_add_max_roles:
		"Die maximale Anzahl von Rangrollen (25) wurde erreicht.",
	ranks_config_add_role_menu_placeholder: "Wählen Sie eine Rolle",
	ranks_config_awaiting1_response:
		"Wählen Sie die Rolle, die Sie einer bestimmten Stufe zuweisen möchten.",
	ranks_config_add_modal_title: "Stufe für Rolle festlegen",
	ranks_config_add_modal_fields1_placeholder: "Stufenanforderung",
	ranks_config_add_invalid_level:
		"Ungültige Stufe! Bitte geben Sie eine positive Zahl ein.",
	ranks_config_add_invalid_role:
		"Die Rolle {role} existiert bereits. Eine Rolle kann nur einer Stufe zugewiesen werden.",
	ranks_config_add_command_work:
		"Rolle ${selectedRole} für Stufe ${level} hinzugefügt!",
	ranks_config_add_command_warn:
		"# WARN ⚠️ Warnung: Die Rolle ${selectedRole} hat folgende sensible Berechtigungen:\n\n${_}",
	ranks_config_remove_no_rank:
		"Es sind keine Rangrollen konfiguriert, die entfernt werden können.",
	ranks_config_var_level: "Stufe {level}",
	ranks_config_remove_string_menu_desc: "Rolle auf Stufe ${level} entfernen",
	ranks_config_remove_string_menu1_placeholder:
		"Wählen Sie eine Rolle zum Entfernen",
	ranks_config_remove_awaiting_response:
		"Wählen Sie die Rolle, die Sie entfernen möchten.",
	ranks_config_remove_command_work:
		"Rolle für Stufe ${levelToRemove} wurde entfernt!",

	// Owner commands
	// /owner, /unowner, /blacklist, /unblacklist

	// /owner
	owner_not_owner:
		"Sie sind nicht der Eigentümer von iHorizon Projects. Sie können diesen Befehl nicht verwenden.",
	owner_already_owner: "Dieser Benutzer ist bereits Eigentümer!",
	owner_is_now_owner:
		"${memberUsername} ist jetzt Eigentümer von iHorizon Projects",

	// /unowner
	unowner_not_owner:
		"Sie sind nicht der Eigentümer von iHorizon Projects. Sie können diesen Befehl nicht verwenden.",
	unowner_cant_unowner_creator:
		"Es ist nicht möglich, ihn zu entfernen, da er der iHorizon Projects-Ersteller ist.",
	unowner_command_work: "${memberUsername} ist nicht mehr Eigentümer",

	// /blacklist
	blacklist_not_owner:
		"Du bist nicht der Besitzer von iHorizon Projects. Du kannst diesen Befehl nicht verwenden.",
	blacklist_bot_lol: "Ich kann mich nicht selbst auf die Blacklist setzen x)",
	blacklist_command_work: "${memberUsername} steht jetzt auf der Blacklist",
	blacklist_blacklisted_but_can_ban_him:
		"${emoji_No} Steht jetzt auf der Blacklist. Kann dieses Mitglied hier nicht bannen, fehlende Berechtigungen?",
	blacklist_already_blacklisted:
		"${memberUsername} steht bereits auf der Blacklist!",
	blacklist_no_one_blacklist:
		"${emoji_No} Niemand auf der schwarzen Liste gefunden!",
	blacklist_var_no_reason: "Kein Grund gefunden",
	blacklist_embed_title: "Schwarze Liste - Seite ${page}",
	blacklist_command_work_shard:
		"✅ ${username} wurde auf **${totalSuccess}** Server(n) über alle Shards hinweg gebannt (`{score}`)",

	// /unblacklist
	unblacklist_not_owner:
		"Du bist nicht der Besitzer von iHorizon Projects. Du kannst diesen Befehl nicht verwenden.",
	unblacklist_command_work:
		"<@${memberId}> steht nicht mehr auf der Blacklist",
	unblacklist_not_blacklisted: "<@${memberId}> stand nicht auf der Blacklist",
	unblacklist_unblacklisted_but_can_unban_him:
		"${emoji_No} Ist jetzt nicht mehr auf der Blacklist, kann dieses Mitglied hier nicht entbannen, fehlende Berechtigungen oder bereits entbannt?",
	unblacklist_user_is_not_exist: "Ich konnte das Mitglied nicht finden",
	unblacklist_command_work_across_all_shard:
		"✅ ${bannedMemberUsername} wurde auf **${totalSuccess}** Server(n) über alle Shards hinweg entbannt (`${score}`)",

	// Invite Manager commands
	// /addinvites, /invites, /leaderboard, /removeinvites

	// /addinvites
	addinvites_not_admin_embed_description:
		"Du benötigst Administratorrechte, um diesen Befehl zu verwenden!",
	addinvites_confirmation_embed_description:
		"${amount} Einladungen für ${user} hinzugefügt",
	addinvites_logs_embed_title: "Einladungsmanager-Protokoll",
	addinvites_logs_embed_description:
		"<@${authorId}> hat ${amount} Einladungen zu <@${userId}> hinzugefügt!",

	// /invites
	invites_confirmation_embed_description:
		"<@${memberId}> hat `${invites}` Einladungen (`${regular}` Reguläre, `${bonus}` Bonus, `${leaves}` Abgänge).",
	invites_confirmation_embed_title: "Inviter-Statistik",

	// /leaderboard
	leaderboard_text_inline:
		"`${i} ` <@${inviter}> • Einladungen∶ **${invites}**\n  ┖ Regulär **${regular}**, Bonus∶ **${bonus}**, Verlassen∶ **${leaves}**\n",
	leaderboard_default_text: "**__Bestenliste__**",
	leaderboard_rank_text:
		"🏅Du bist derzeit auf Platz `${rank}` von `${arrCount}` mit **${invites}** Einladungen\n\n",
	leaderboard_rank_none: "🏅Du bist derzeit nicht im Ranking.\n\n",
	leaderboard_gen_time_msg:
		"Die Bestenliste von **${guildName}** wurde in ${elapsed}ms erstellt.\n\n",

	// /removeinvites
	removeinvites_not_admin_embed_description:
		"Du benötigst Administratorrechte, um diesen Befehl zu verwenden!",
	removeinvites_confirmation_embed_description:
		"${amount} Einladungen für ${user} entfernt",
	removeinvites_logs_embed_title: "Einladungsmanager-Protokoll",
	removeinvites_logs_embed_description:
		"<@${authorId}> hat ${amount} Einladungen von <@${userId}> entfernt!",

	// /invites reset-all
	resetallinvites_warning_msg:
		"**Sind Sie wirklich sicher, dass Sie alle Daten des InviteManagers löschen möchten?\nDiese Aktion ist dauerhaft und kann nicht rückgängig gemacht werden.**\n**Diese Aktion ist destruktiv!!**",
	resetallinvites_yes_button: "Alles löschen",
	resetallinvites_no_button: "Aktion rückgängig machen",
	resetallinvites_succes_on_delete: "Erfolgreich gelöscht!",
	resetallinvites_logs_embed_title: "Invite Manager Logs (GEFAHR AKTION)",
	resetallinvites_logs_embed_desc:
		"${author} hat alle Daten des Invite Managers gelöscht!",

	// Bot commands
	// /botinfo, /invite, /kisakay, /ping, /status

	// /links
	links_message: "Klicken Sie auf die unten stehenden Links über mich!",
	links_website: "Meine Website",
	links_gitlab: "Meine GitLab",

	// /botinfo
	botinfo_embed_fields_myname: "Mein Name:",
	botinfo_embed_fields_mychannels: "Meine Kanäle:",
	botinfo_embed_fields_myservers: "Meine Server:",
	botinfo_embed_fields_members: "Mitglieder:",
	botinfo_embed_fields_libraires: "Bibliotheken:",
	botinfo_embed_fields_created_at: "Erstellt am:",
	botinfo_embed_fields_created_by: "Erstellt von:",

	// /invite
	invite_embed_title: "Vielen Dank, dass du iHorizon hinzugefügt hast!",
	invite_embed_description:
		"Ich liebe dich, zeig mir deine Liebe zu mir zurück! Lade mich ein!",

	// /kisakay
	kisakay_message:
		"${emoji_Sparkles} Kisakay ist sowohl meine Schöpferin als auch meine Entwicklerin. Dank ihr und ihrer Tastatur bin ich entstanden. Ich bin ihr zutiefst dankbar!✨ ❤️❤️",

	// /andru
	andru_message:
		'Andru ist ein Mitarbeiter und Entwickler. "Das Mädchen für alles", er kümmert sich um Marketing, Community...',

	// /ether
	ether_message:
		"${emoji_Sparkles} Ether war ein Mitwirkender und Teammitglied des iHorizon-Projekts. Er hat die iHorizon-Dokumentation und das iHorizon-Installationsskript erstellt und die Übersetzungen des Bots betreut, um sie (fast) perfekt zu machen! Er ist am <t:1785567600:f> gegangen.",

	// /Irisweb
	irisweb_message:
		"😼IrisWeb ist meine zweite Entwicklerin/Zuträgerin , IrisWeb x Kisakay ❤️",

	// /ping
	pong_message: "【:ballot_box_with_check:】__**Pong**__ : ",

	// /status
	status_be_bot_dev:
		":x: | **Du musst der Bot-Entwickler sein, um dies zu tun!**",

	// /help
	help_tip_embed:
		"```${botName} ・ Hilfe Menü```\n${emoji_Pin} ・ **${categorieCount}** verfügbare Kategorien von Befehlen\n${emoji_Slash_Bot_Badge} ・ **${slashCount}** verfügbare Slash-Befehle\n${emoji_Crown} ・ **Erstellt von** <@${owner1}>, <@${owner2}>\n\n```Wussten Sie schon? ・ Tipps```\n${emoji_VC_Region} ・ ${botName} ist **100 % mehrsprachig**\n${emoji_Slash_Bot_Badge} ・ `/setlang language:Japanese`",
	help_mod_fields: "Moderation",
	help_ranks_fields: "Ränge",
	help_fun_fields: "Fun",
	help_utils_fields: "Utils",
	help_giveaway_fields: "Giveaway",
	help_bot_fields: "Bot",
	help_music_fields: "Musik",
	help_backup_fields: "Backup",
	help_guildconf_fields: "Guild-Konfiguration",
	help_prof_fields: "Profilanpassung",
	help_economy_fields: "Wirtschaft",
	help_owner_fields: "Owner",
	help_roler_fields: "Rollenreaktion",
	help_invitem_fields: "Einladungsmanager",
	help_ticket_fields: "Ticket",
	help_memberc_fields: "Mitgliederzählung",
	help_newftrs_fields: "Neue Funktionen",
	help_mod_dsc:
		"> *Verwalten Sie Ihren Discord-Server stressfrei mit den Befehlen von iHorizon.*",
	help_ranks_dsc:
		"> *Haben Sie Spaß dabei, Ihr Erfahrungsniveau zu beobachten und zu sehen, wer am aktivsten auf dem Server ist!*",
	help_fun_dsc:
		"> *Finden Sie Discord langweilig? Diese Kategorie bietet unterhaltsame Befehle, die Ihnen ein Lächeln ins Gesicht zaubern werden!*",
	help_utils_dsc:
		"> *Benötigen Sie bestimmte Befehle, die in bestimmten Fällen nützlich sind? Hier sind sie!*",
	help_giveaway_dsc:
		"> *Fühlen Sie sich großzügig? Möchten Sie Ihrer Community etwas geben? Hier sind meine Befehle, um Ihnen zu helfen!*",
	help_bot_dsc:
		"> *Sind Sie neugierig und möchten mehr über mich erfahren? Diese Befehle sind dafür da!*",
	help_music_dsc:
		"> *Stehen Sie eher auf Musik? Hier ist ein Geschenk für Sie :)*",
	help_backup_dsc:
		"> *Benötigen Sie eine schnelle Sicherung Ihres Servers? Hier bin ich!*",
	help_guildconf_dsc:
		"> *Möchten Sie eine fortgeschrittene und einfach einzurichtende Konfiguration? Hier bin ich :3*",
	help_prof_dsc:
		"> *Pflegen Sie Ihr Erscheinungsbild? Hier sind einige Befehle, um Ihnen ein großartiges Profil bei den Benutzern zu garantieren :)*",
	help_economy_dsc:
		"> *Sind Sie sparsam oder möchten Sie einfach Einkäufe tätigen? Ich bin für Sie da :)*",
	help_owner_dsc:
		"> *Diese Kategorie ist den Eigentümern und Administratoren des iHorizon-Projekts vorbehalten!*",
	help_roler_dsc:
		"> *Möchten Sie eine Reaktionsrolle für Ihren Server einrichten? Hier bin ich!!*",
	help_invitem_dsc:
		"> *Möchten Sie die Einladungen eines Mitglieds überprüfen? Hier ist es!*",
	help_ticket_dsc:
		"> *Möchten Sie ein Ticket erstellen oder eine meiner Funktionen darin verwenden? Natürlich!*",
	help_memberc_dsc:
		"> *Möchten Sie Sprachkanäle für die Mitgliederzählung einrichten? Natürlich :smile:*",
	help_newftrs_dsc:
		"> *Hier sind einige brandneue und äußerst interessante Funktionen!*",
	help_not_for_you: "Diese Interaktion ist nicht für dich",
	help_protection_fields: "Schutz",
	help_protection_dsc:
		"> *Verhindern Sie, dass nicht autorisierte Benutzer bestimmte Aktionen ausführen, um den Server zu schützen.*",
	help_suggestion_fields: "Vorschlag",
	help_suggestion_dsc:
		"> *Geben Sie Ihren Benutzern die Möglichkeit, sich auszudrücken, und ermächtigen Sie sie, Vorschläge in einem dedizierten Kanal einzureichen!*",
	help_security_fields: "Sicherheit",
	help_security_dsc:
		"> *Verwalten Sie Captcha-Tests für Ihre neuen Mitglieder, um den Zugriff auf Ihren Server abzusichern.*",
	help_schedule_fields: "Zeitplan",
	help_schedule_dsc:
		"> *Erstellen Sie Erinnerungen mit vorprogrammierten Nachrichten, die der Bot Ihnen in einer privaten Nachricht sendet.*",
	help_pfps_fields: "PFPS",
	help_pfps_dsc: "> *Sendet zufälliges Benutzer-Avatar im Kanal!*",
	help_voicedashboard_fields: "VoiceDashboard",
	help_voicedashboard_dsc:
		"> *Erstellen Sie einen benutzerdefinierten temporären Sprachkanal mit Benutzeroberfläche!*",
	help_select_menu: "Treffe eine Auswahl!",
	help_select_menu_fields_desc: "${commandCount} Befehle",
	help_back_to_menu: "Hauptmenü",
	help_back_to_menu_desc: "Zurück zum Hauptmenü",
	help_confession_dsc:
		"> *Möchtest du ein Geständnis ablegen? Sehr gut, egal wie schmutzig es ist, iHorizon ist für dich da!*",
	help_confession_fields: "Beichte",
	help_antispam_dsc:
		"> *Genervt von Spam? Kein Problem! iHorizon ist da, um Spam zu moderieren!*",
	help_antispam_fields: "AntiSpam",
	help_stats_fields: "Benutzerstatistiken",
	help_stats_dsc:
		"> *Sieh dir die Anzahl der Nachrichten und die Sprachaktivität eines Benutzers in einer Gilde an.*",
	help_notifier_dsc:
		"> *Werde benachrichtigt, wenn ein YouTuber oder Streamer ein Video veröffentlicht!*",
	help_notifier_fields: "Benachrichtigung",
	help_authrestore_fields: "AuthRestore",
	help_authrestore_dsc:
		"> *Verifizierung des Servers mit oAuth2. Wenn Ihr Server angegriffen oder gelöscht wurde, können Sie Ihre alten Mitglieder über oAuth2 zurückholen!*",
	help_tags_fields: "Benutzerdefinierte Tags",
	help_tags_dsc:
		"> *Erstellen Sie Nachrichten-Tags für Ihren Server und verwenden Sie sie auf Ihrem Server!*",
	help_starboard_dsc:
		"> *Sieh dir die meistbewerteten Nachrichten auf einem Discord-Server an.*",
	help_starboard_fields: "StarBoard",
	help_blogger_dsc:
		"Folge deinen bevorzugten RSS-Feeds und erhalte Benachrichtigungen, wenn über iHorizon neue Artikel veröffentlicht werden",
	help_blogger_fields: "Blogger",
	help_lastfm_dsc:
		"> *Verbinde dein Last.fm-Konto und scrobble automatisch die von iHorizon abgespielten Titel, solange du im Sprachkanal bleibst.*",
	help_lastfm_fields: "LastFM Scrobbler",
	help_honeypot_fields: "Honeypot",
	help_honeypot_dsc:
		"> *Richte einen Fallenkanal ein, um kompromittierte Konten zu erkennen und aktuellen Spam auf deinem Server automatisch zu bereinigen.*",

	// /h
	h_suite: "(Fortsetzung)",
	h_suite_desc: "*Fortsetzung der Kategoriekommandos*",
	helpall_no_perms_defined:
		"Auf diesem Server sind keine benutzerdefinierten Berechtigungen definiert, daher ist `helpall` hier nutzlos — verwende stattdessen `${botPrefix}h`.",
	helpall_no_access:
		"Du hast auf diesem Server keinen Zugriff auf Befehle mit Berechtigungen.",

	// /say
	say_footer_msg: "\n\nGesendet von `/sagen` von ${author}",

	// /ping
	ping_down_msg: "**DOWN**",
	ping_embed_desc:
		"# Pong! Netzwerkstatistiken von ${botName}:\n\n**[Discord Website Ping]** >> `${_net03}` ms.\n**[Cloudflare Ping]** >> `${_net02}` ms.\n**[Google Ping]** >> `${_net01}` ms.\n\n${emoji_Crown} **[iHorizon Website Ping]** >> `${_net04}` ms.\n${emoji_Crown} **[Websocket Ping]** `${ping}` ms.\n\n## ${emoji_Pointer} **[Durchschnitt]** >> (Durchschn.)`${averagePing}` ms.",

	// /custom
	custom_avatar_reset:
		"Sie haben sich entschieden, das Profilbild des Bots auf dem Server zurückzusetzen. Embed-Fußzeilen kehren zu ihrem Standardzustand zurück, ebenso wie das Profilbild des Bots auf dem Server.",
	custom_avatar_set:
		"${emoji_Yes} **Sie haben sich entschieden, das Profilbild des Bots auf dem Server zu ändern. Embed-Fußzeilen sind jetzt geändert, ebenso wie das Profilbild des Bots auf dem Server.**\n${emoji_Crown} Neuer Wert: `${x}`",
	custom_name_reset:
		"Sie haben sich entschieden, den Namen des Bots auf dem Server zurückzusetzen. Embed-Fußzeilen kehren zu ihrem Standardzustand zurück, ebenso wie der Name des Bots auf dem Server.",
	custom_name_set:
		"${emoji_Yes} **Sie haben sich entschieden, den Namen des Bots auf dem Server zu ändern. Embed-Fußzeilen sind jetzt geändert, ebenso wie der Name des Bots auf dem Server.**\n${emoji_Crown} Neuer Wert: `${name}`",
	custom_desc_reset:
		"Sie haben sich entschieden, die Beschreibung des Bots auf dem Server zurückzusetzen. Embed-Fußzeilen kehren zu ihrem Standardzustand zurück, ebenso wie die Beschreibung des Bots auf dem Server.",
	custom_desc_set:
		"${emoji_Yes} **Sie haben sich entschieden, die Beschreibung des Bots auf dem Server zu ändern. Embed-Fußzeilen sind jetzt geändert, ebenso wie die Beschreibung des Bots auf dem Server.**\n${emoji_Crown} Neuer Wert: `${desc}`",
	custom_banner_reset:
		"Sie haben sich entschieden, das Banner des Bots auf dem Server zurückzusetzen.",
	custom_banner_set:
		"${emoji_Yes} **Sie haben sich entschieden, das Banner des Bots auf dem Server zu ändern.**\n${emoji_Crown} Neuer Wert: `${x}`",
	custom_sdk_only:
		"Dieser Befehl ist in der Produktion nur für Server mit dem Abonnement `Custom iHorizon Profile` verfügbar.",
	custom_sdk_only_title: "Unterstütze iHorizon mit Custom iHorizon Profile",
	custom_sdk_only_description:
		"Unser Bot ist seit 2022 kostenlos und Open Source. Wir brauchen Einnahmen, um den Bot weiter zu betreiben, zu entwickeln und zu hosten. Unsere Betriebskosten liegen bei etwa 500 EUR pro Jahr für Server, Boosts, Domains und Lizenzen.\n\nMit dem Befehl `/custom` kannst du die Identität von iHorizon auf deinem Server ändern, indem du Avatar, Namen, Banner und Bio anpasst. Wenn du ihn nutzt, verschwindet die visuelle Identität von iHorizon von deinem Server.\n\nDeshalb haben wir ein in Discord integriertes Abonnement für 2.99 USD pro Monat eingeführt.\n\nMit diesem Abonnement kannst du diesen Befehl verwenden. Sieh es als einen Custom-Bot an, ähnlich wie OWN-IHRZ, aber stabil, sauber und vollständig funktional.",

	// Fun commands
	// /caracteres, /cats, /hack, /hug, /kiss, /morse, /poll, /question, /slap

	// Fun Var
	fun_var_down_api: "Fehler: Die API ist nicht erreichbar!",
	fun_var_good_sentence: "Bitte, sende einen guten Satz!",

	// /cats
	cats_embed_title: "Miauw :cat:",

	// /duck
	duck_embed_title: "Quak :duck:",

	// /panda
	panda_embed_title: "Mwaa 🐼",

	// /fox
	fox_embed_title: "wa-pa-pa-pa-pa 🦊",

	// /dolphin
	dolphin_embed_title: "eee-eee-click-click 🐬",

	// /frog
	frog_embed_title: "quak-quak 🐸",

	// /squirrel
	squirrel_embed_title: "tschilp-tschilp 🐿️",

	// /hack
	hack_embed_description: "<@${victimId}> wurde von <@${authorId}> gehackt!",
	hack_embed_fields_ip: "IP",
	hack_embed_fields_email: "E-Mail",
	hack_embed_fields_password: "Passwort",

	// /hug
	hug_embed_title: "<@${authorId}> gibt <@${hugId}> eine Umarmung ❤️",

	// /kiss
	kiss_embed_description: "<@${authorId}> gibt <@${kissId}> einen Kuss 💏",

	// /poll
	poll_not_admin: "Du hast keine Berechtigung dafür!",
	poll_embed_title: "__**Umfrage**__: `${authorUsername}`",
	poll_embed_fields_reaction: "Tippe auf die Reaktionen unten.⬇",
	poll_embed_fields_choice: ":white_check_mark: **Ja**\n :x: **Nein** ",

	// /question
	question_not_full:
		"Geben Sie eine vollständige Frage mit 3 oder mehr Wörtern ein!",
	question_s: [
		"Ja.",
		"Nein.",
		"Ich weiß es nicht.",
		"Ich bin mir nicht sicher!",
		"Du bist verrückt!",
		"Nein danke.",
		"Nein.",
		"Ja."
	],
	question_fields_input_embed: ":question:__**Frage**__",
	question_fields_output_embed: ":grey_exclamation:__**Antwort:**__",
	question_embed_title: "__**Frage**__: `${authorUsername}`",

	// /slap
	slap_embed_description: "<@${authorId}> schlägt <@${slapId}> 😓",

	// /dogs
	dogs_embed_command_error: "Fehler beim Abrufen des Hunde-Bildes.",
	dogs_embed_title: "🐶 wuff-wuff.",

	// /love
	love_embed_description:
		"**${user1Username}** + **${user2Username}** = __${randomNumber}%__ Liebe 💗",
	love_command_error:
		"Beim Versuch, das Bild zu erstellen, ist ein Fehler aufgetreten",

	// /fun disable
	fun_disable_command_msg:
		"${author}, du hast die Kategorie Spaß ${action_type}!",
	fun_category_disable:
		"Du kannst diesen Befehl nicht verwenden, die Spaß-Kategorie ist deaktiviert.",

	// /fun gay
	fun_gay_command_ok: "Der Benutzer ${user} ist **${random}%** schwul 🏳️‍🌈",

	// /fun stench
	fun_stench_command_ok: "Der Benutzer ${user} stinkt zu **${random}%** 👃🛀",

	// /fun rate
	fun_rate_command_ok: "Ich gebe **${the_things}** ${random}/10.",

	// /fun caracteres
	fun_caracteres_command_ok:
		"Bitte gib einen Text ein, der umgewandelt werden soll!",
	fun_caracteres_help_title: "🎨 Wähle einen Textstil",
	fun_caracteres_embed_desc:
		"Originaltext: **${inputText}**\n\nWähle unten im Dropdown-Menü einen Stil aus, um deinen Text zu transformieren.",
	fun_caracteres_select_menu_placeholder: "Wähle einen Schriftstil...",
	fun_caracteres_final_embed_title:
		"🎨 Transformierter Text - Stil: ${selectedStyle}",
	fun_caracteres_final_embed_field1_name: "📝 Originaltext",
	fun_caracteres_final_embed_field2_name: "✨ Transformierter Text",

	// /fun random dice
	fun_dice_embed_title: "🎲 Würfelergebnis",
	fun_dice_var_rolled_dices: "**Geworfene Würfel:**",
	fun_dice_var_results: "**Ergebnisse:**",
	fun_dice_var_total: "**Gesamt:**",

	// /fun random heads-tails
	fun_coinflip_embed_title: "🪙 Kopf oder Zahl",
	fun_coinflip_result_text: "Das Ergebnis ist:",
	fun_coinflip_result_heads: "Kopf",
	fun_coinflip_result_tails: "Zahl",

	// /fun random number
	fun_random_embed_title: "🔢 Zufallszahl",
	fun_random_result_text: "Die generierte Zahl ist:",
	fun_random_between: "zwischen",

	// +transgender
	fun_trans_command_ok:
		"Der Benutzer ${user} ist **${random}%** transgender 🏳️‍⚧️",

	// Economy commands
	// /addmoney, /balance, /daily, /monthly, /pay, /removemoney, /rob, /weekly, /work

	economy_cooldown_error:
		"Warte **${time}**, bevor du diesen Befehl erneut ausführen kannst!",

	// /addmoney
	addmoney_not_admin:
		"Sie können diesen Befehl nicht ausführen, da Sie nicht über die erforderlichen Berechtigungen `ADMINISTRATOR` verfügen",
	addmoney_logs_embed_title: "Wirtschaftsprotokolle",
	addmoney_logs_embed_description:
		"<@${authorId}> hat ${amountValue} Münzen zu <@${userId}> hinzugefügt!",
	addmoney_command_work:
		"Erfolgreich `${amountValue}`$ zu <@${userId}> hinzugefügt",

	// /balance
	balance_dont_have_wallet: "👛 Du hast keine Brieftasche... !",
	balance_he_dont_have_wallet:
		"${emoji_Wallet} ${user} hat keine Brieftasche... !",
	balance_have_wallet: "👛 Du hast ${bal} Münzen !",
	balance_he_have_wallet: "${emoji_Wallet} ${user} hat ${bal} Münzen !",
	balance_embed_fields1_name: "Bank",
	balance_embed_fields2_name: "Im Guthaben",

	// /daily
	daily_cooldown_error:
		"Entschuldigung, Sie müssen **${time}** warten, bevor Sie diesen Befehl ausführen können!",
	daily_embed_title: "Täglich",
	daily_embed_description: "**Tägliche Belohnung**",
	daily_embed_fields: "Gesammelt",

	// /monthly
	monthly_cooldown_error:
		"Entschuldigung, Sie müssen **${time}** warten, bevor Sie diesen Befehl erneut ausführen können!",
	monthly_embed_title: "Monatlich",
	monthly_embed_description: "**Monatliche Belohnung**",
	monthly_embed_fields: "Eingesammelt",

	// /pay
	pay_negative_number_error:
		"Negative Geldbeträge können nicht gezahlt werden.",
	pay_dont_have_enought_to_give:
		"Das ist mehr Geld, als Sie auf Ihrem Konto haben. Bitte versuchen Sie es erneut.",
	pay_command_work:
		"${authorUsername}, Sie haben erfolgreich ${amount}$ an ${userUsername} überwiesen.",

	// /removemoney
	removemoney_not_admin:
		"Sie können diesen Befehl nicht ausführen, weil Sie nicht über die erforderlichen Berechtigungen `ADMINISTRATOR` verfügen.",
	removemoney_embed_title: "Geld entfernt!",
	removemoney_embed_fields: "Betrag",
	removemoney_embed_second_fields: "Kontostand aktualisiert",
	removemoney_logs_embed_description:
		"<@${authorId}> hat ${amount} Münze von <@${userId}> entfernt!",
	removemoney_logs_embed_title: "Wirtschaftsprotokolle",

	// /rob
	rob_cooldown_error:
		"**Warten Sie 50 Minuten, bevor Sie erneut versuchen, einen Benutzer zu überfallen!**",
	rob_dont_enought_error:
		":x: Sie benötigen mindestens 250$, um jemanden zu überfallen.",
	rob_him_dont_enought_error:
		":x: ${userUsername} hat nicht genug, um ausgeraubt zu werden.",
	rob_embed_description:
		"<@${authorId}> Sie haben ${random}$ bei Ihrem Raubzug gegen <@${userId}> erbeutet!",

	// /weekly
	weekly_cooldown_error:
		"Entschuldigung, Sie müssen **${time}** warten, bevor Sie diesen Befehl erneut ausführen können!",
	weekly_embed_title: "Wöchentlich",
	weekly_embed_description: "**Wöchentliche Belohnung**",
	weekly_embed_fields: "Eingesammelt",

	// /work
	work_cooldown_error:
		"<@${authorId}>, **Warten Sie ${time} Minuten, bevor Sie einen anderen Benutzer erneut bestehlen!**",
	work_embed_author: "${authorUsername}, es hat sich ausgezahlt!",
	work_embed_description:
		"${authorUsername}, du hast gearbeitet und ${amount}$ verdient!",

	// /withdraw
	withdraw_cannot_abuse:
		"${emoji_No} | Sie können nicht mehr Münzen abheben, als Sie auf der Bank haben!",
	withdraw_embed_title: "Abhebung von Ihrer Bank",
	withdraw_embed_desc:
		"${author}, Sie haben ${toWithdraw}${emoji_Coin} von Ihrer `Bank` abgehoben",
	withdraw_embed_fields1_name: "Bank",

	// /deposit
	deposit_cannot_abuse:
		"${emoji_No} | Sie können nicht mehr Münzen einzahlen, als Sie in Ihrer Brieftasche haben!",
	deposit_embed_title: "Einzahlung auf Ihre Bank",
	deposit_embed_desc:
		"${author}, Sie haben ${toDeposit}${emoji_Coin} auf Ihre `Bank` eingezahlt",
	deposit_embed_fields1_name: "Bank",

	// /leaderboard
	economy_leaderboard_embed_title: "Wirtschafts-Rangliste von `${guildName}`",
	economy_leaderboard_embed_fields_value:
		"<@${userId}> - Bank: `${bank}`${emoji_Coin} | Guthaben: `${money}`${emoji_Coin}",

	// /economy disable
	economy_disable_not_admin:
		":x: | Du musst ein Administrator dieses Servers sein, um diesen Befehl auszuführen!",
	economy_disable_already_disable:
		"<@${authorId}>, das Wirtschaftsmodul ist bereits **deaktiviert**!",
	economy_disable_already_enable:
		"<@${authorId}>, das Wirtschaftsmodul ist bereits **aktiviert**!",
	economy_disable_set_enable:
		"<@${authorId}>, du hast das Wirtschaftsmodul erfolgreich **aktiviert**!",
	economy_disable_set_disable:
		"<@${authorId}>, du hast das Wirtschaftsmodul erfolgreich **deaktiviert**!",
	economy_disable_logs_embed_desc:
		"<@${authorId}> hat das Wirtschaftsmodul auf den Zustand `${state}` gesetzt!",
	economy_disable_logs_embed_title: "Wirtschaftsprotokolle",

	// /economy boost-set
	economy_boost_role_not_found:
		"Rolle nicht gefunden. Sie müssen einen Preis für die Rolle festlegen.",
	economy_boost_embed_title: "Wirtschaftssystem - Kaufbare Rollen",
	economy_boost_embed_desc: "Alle kaufbaren Rollen sind unten aufgeführt.",

	// /economy role add
	economy_role_add_no_role: "Es gibt keine kaufbaren Rollen zum Löschen.",
	economy_role_add_max_20_roles:
		"Sie können maximal 20 kaufbare Rollen haben.",
	economy_role_add_canceled:
		"Die Rolle wurde nicht zu den kaufbaren Rollen hinzugefügt.",
	economy_role_add_prompt_dangerous:
		"Sind Sie sicher, dass Sie diese Rolle zu den kaufbaren Rollen hinzufügen möchten?\n**Warnung:** Diese Rolle hat gefährliche Berechtigungen.\nBerechtigungen: ${stringDangerousPermissions}",

	// /economy shop
	economy_shop_embed_title: "🛍️ Shop von `${guildName}`",
	economy_shop_embed_desc:
		"Der Shop ermöglicht es Ihnen, Artikel/Rollen mit Ihrem Geld zu kaufen. Unten können Sie die verfügbaren Rollen einsehen.",
	economy_shop_not_available:
		"Die ausgewählte Rolle ist nicht zum Kauf verfügbar.",
	economy_shop_already_own_role: "Sie besitzen diese Rolle bereits.",
	economy_shop_not_enough_money:
		"Sie haben nicht genug Geld, um diese Rolle zu kaufen.",
	economy_shop_role_purchased:
		"Sie haben die Rolle **{roleName}** erfolgreich für **${rolePrice}** 💰 gekauft.",
	economy_shop_unknown_role: "Unbekannte Rolle",
	economy_shop_not_set:
		"Es gibt keine Rollen, die in diesem Server zum Kauf verfügbar sind. Bitte kontaktieren Sie den Serveradministrator für weitere Informationen.",
	economy_shop_already_owned: "Bereits im Besitz",
	economy_shop_menu_placeholder: "Wählen Sie eine Rolle zum Kaufen aus",

	// /economy manage-rewards set-cooldown
	economy_manage_rewards_cooldown_invalid_time:
		"Ungültiges Zeitformat. Bitte verwende ein gültiges Zeitformat.",
	economy_manage_rewards_cooldown_command_ok:
		"Die Abklingzeit für ${type} wurde erfolgreich auf ${stime} gesetzt.",

	// /economy mange-rewards set-money
	economy_manage_rewards_set_money:
		"Das Geld für ${type} wurde erfolgreich auf ${money} gesetzt.",

	// /economy role list
	economy_role_list_no_buyable_roles:
		"Es gibt keine kaufbaren Rollen zum Anzeigen.",
	economy_role_list_embed_title: "Wirtschaftssystem – Kaufbare Rollen",
	economy_role_list_embed_desc:
		"Alle kaufbaren Rollen sind unten aufgelistet.",

	// /economy economy-ureset
	reset_ueconomy_are_you_sure:
		"**Bist du dir wirklich sicher, dass du alle Wirtschaftsdaten löschen möchtest?\nDiese Aktion ist dauerhaft und kann nicht rückgängig gemacht werden.**\n**Diese Aktion ist destruktiv!!**",
	reset_ueconomy_logs_embed_title:
		"Wirtschaftsmodul-Logs (GEFÄHRLICHE AKTION)",
	reset_ueconomy_logs_embed_desc:
		"${author} hat alle Daten des Wirtschaftsmoduls für ${user} gelöscht!",

	// /economy economy-greset
	reset_geconomy_are_you_sure:
		"**Bist du dir wirklich sicher, dass du alle Wirtschaftsdaten für ALLE SERVERMITGLIEDER löschen möchtest?\nDiese Aktion ist dauerhaft und kann nicht rückgängig gemacht werden.**\n**Diese Aktion ist destruktiv!!**",
	reset_geconomy_logs_embed_title:
		"Wirtschaftsmodul-Logs (SEHR GEFÄHRLICHE AKTION)",
	reset_geconomy_logs_embed_desc:
		"${author} hat alle Daten des Wirtschaftsmoduls für **ALLE** gelöscht!",

	// Profil Customisation commands
	// /setprofilage, /setprofildescriptions, /profil

	// /setprofilage
	setprofilage_command_work:
		"**Dein Alter im Profil wurde erfolgreich aktualisiert.**",

	// /setprofildescriptions
	setprofildescriptions_command_work:
		"**Deine Beschreibung wurde erfolgreich aktualisiert.**",

	// /profil
	profil_not_description_set: "Keine Beschreibung angegeben!",
	profil_unknown: "Unbekannt",
	profil_embed_title: "${emoji_Pin} __Profil von ${memberTag}__",
	profil_embed_fields_nickname: "📝 ・ __Spitzname__",
	profil_embed_fields_money: "🪙 ・ __Geld__",
	profil_embed_fields_money_value: " Münzen",
	profil_embed_fields_xplevels: "💳 ・ __XP-Levels__",
	profil_embed_fields_xplevels_value: " XP-Levels",
	profil_embed_fields_age: "🎂 ・ __Alter__",
	profil_embed_fields_age_value: " Jahre",
	profil_embed_fields_gender: "👤 ・ __Geschlecht__",
	profil_embed_fields_pronouns: "📌 ・ __Pronomen__",
	profil_embed_fields_birthdate: "🎂 ・ __Geburtstagsdatum__",

	// /profil-geburtstag-einstellen
	profil_birthday_month_button_label: "Monat einstellen",
	profil_birthday_day_button_label: "Tag einstellen",
	profil_birthday_year_button_label: "Jahr einstellen",
	profil_birthday_embed_title: "🎂 ・ Stelle deinen Geburtstag ein!",
	profil_birthday_embed_introduction:
		"${emoji_Sparkles} **Wie jeder Mensch hast du einen Geburtstag!**${emoji_Sparkles}\n\n${emoji_Crown} ・ Hey, ${author}\n:tada: ・ Um ihn zu feiern, ist es Zeit, ihn einzustellen!\n",
	profil_birthday_embed_current_birthday:
		"${emoji_Pin} ・ **Aktueller Geburtstag**: `${birthdayMonth}/${birthdayDay}/${birthdayYear}` (im Format MM/TT/JJJJ)",
	profil_birthday_modal1_title: "Gib dein Geburtsjahr ein",
	profil_birthday_modal1_fields1_label: "Jahr",
	profil_birthday_invalid_year:
		"Ungültiges Jahr! Bitte gib ein gültiges Jahr ein.",
	profil_birthday_year_already_set: "Dein Jahr ist bereits eingestellt.",
	profil_birthday_year_set: "Dein Jahr wurde eingestellt!",
	profil_birthday_modal2_title: "Gib deinen Geburtsmonat ein",
	profil_birthday_modal2_fields1_label: "Monat",
	profil_birthday_invalid_month:
		"Ungültiger Monat! Bitte gib einen gültigen Monat ein.",
	profil_birthday_month_already_set: "Dein Monat ist bereits eingestellt.",
	profil_birthday_month_set: "Dein Monat wurde eingestellt!",
	profil_birthday_modal3_title: "Gib deinen Geburtstag ein",
	profil_birthday_modal3_fields1_label: "Tag",
	profil_birthday_invalid_day:
		"Ungültiger Tag! Bitte gib einen gültigen Tag ein.",
	profil_birthday_day_already_set: "Dein Tag ist bereits eingestellt.",
	profil_birthday_day_set: "Dein Tag wurde eingestellt!",

	// Befehle für nützliche Funktionen
	// /serverinfo, /snipe, /userinfo, /renew

	// /serverinfo
	serverinfo_verlvl_NONE: "KEINE",
	serverinfo_verlvl_LOW: "NIEDRIG",
	serverinfo_verlvl_MEDIUM: "MITTEL",
	serverinfo_verlvl_HIGHT: "(╯°□°）╯︵ ┻━┻",
	serverinfo_verlvl_VERY_HIGHT: "(ノಠ益ಠ)ノ彡┻━┻ ",
	serverinfo_embed_author: "🚩 -> ${guildName}",
	serverinfo_embed_description: "**Beschreibungen**: ${guildDescription}",
	serverinfo_embed_fields_name: "🏷・**Name:**",
	serverinfo_embed_fields_members: "🧔・**Mitglieder:**",
	serverinfo_embed_fields_id: "🆔・**ID:**",
	serverinfo_embed_fields_owner: "👑・**Besitzer:**",
	serverinfo_embed_fields_verlvl: "🎚 ・**Verifikationslevel:**",
	serverinfo_embed_fields_region: "🌍・**Region:**",
	serverinfo_embed_fields_roles: "📇・**Anzahl der Rollen:**",
	serverinfo_embed_fields_channels: "✍・**Anzahl der Kanäle:**",
	serverinfo_embed_fields_joinat: "🚲・**Beitrittsdatum:**",
	serverinfo_embed_fields_createat: "⚓・**Erstellungsdatum:**",

	// /setrankroles
	setrankroles_not_admin:
		"${emoji_No} Du bist kein Administrator dieses Servers. Du kannst diesen Befehl nicht ausführen!",
	setrankroles_already_this_in_db:
		"${emoji_No} Die Rangrollen sind bereits in der Datenbank für diesen Server vorhanden.",
	setrankroles_not_roles_typed:
		"${emoji_No} Du hast keine Rollen in deinem Befehl angegeben!",
	setrankroles_command_work:
		"Ab jetzt, wenn du mich markierst `@iHorizon`, werde ich die folgenden Rollen hinzufügen: <@&${argsid}>",
	setrankroles_logs_embed_description_enable:
		"<@${authorId}> hat die Rangrolle auf <@&${argsid}> gesetzt",
	setrankroles_logs_embed_title_enable: "Rangrolle setzen",
	setrankroles_logs_embed_description_disable:
		"<@${authorId}> hat die Rangrolle gelöscht!",
	setrankroles_logs_embed_title_disable: "Rangrolle setzen",
	setrankroles_command_work_disable:
		"<@${authorId}>, du hast die Rangrolle gelöscht!",
	setrankroles_command_error:
		"${emoji_No} Bei der Ausführung des Befehls ist ein Fehler aufgetreten! Bitte versuche es später erneut.",
	setrankroles_command_work_with_nicknames:
		"Wenn du mich jetzt mit `@iHorizon` pingst, werde ich die folgenden Rollen hinzufügen: <@&${argsid}> **Nur wenn der Benutzer** `${nicknames}` in seinem Benutzernamen oder globalen Namen hat",
	setrankroles_command_work_with_nicknames_2:
		"\n**Hinweis**:\nWenn die Person den Teil des Nicknamen entfernt, wird die Rolle automatisch entfernt. Wenn sie ihn wieder hinzufügt, werde ich ihm die Rolle zurückgeben.",

	// /snipe
	snipe_no_previous_message_deleted:
		"Keine Nachricht in diesem Kanal gelöscht!",

	// /userinfo
	userinfo_wait_please: "${emoji_Timer} Bitte warten...",
	userinfo_embed_fields_1_name: "Abzeichen",
	userinfo_embed_fields_2_name: "Benutzername",
	userinfo_embed_fields_3_name: "Anzeigename",
	userinfo_embed_fields_4_name: "Erstellungsdatum",
	userinfo_embed_fields_5_name: "Nitro-Status",
	userinfo_var_notfound: "`Nicht gefunden`",
	userinfo_button_label: "Benutzerprofil",

	// /renew
	renew_channel_send_success:
		"${author} Kanal wurde erfolgreich neu erstellt!",
	renew_dont_have_permission: ":x: **Kann nicht** `Keine Berechtigung!`",
	renew_not_administrator:
		":x: **Du bist kein Administrator, um diesen Befehl zu verwenden!**",

	// /renewvc
	renewvc_not_in_voice:
		"${emoji_No} Du musst mit einem Sprachkanal verbunden sein, um diesen Befehl zu verwenden!",
	renewvc_region_success:
		"${emoji_Yes} Die Sprachregion von ${targetVc} wurde auf automatisch gesetzt!",
	renewvc_dont_have_permission: ":x: **Kann nicht** `Keine Berechtigung!`",

	// /prevnames
	prevnames_embed_title: "Liste aller Spitznamen von ${userUsername}",
	prevnames_undetected: "Keine Daten gefunden!",
	prevnames_not_admin:
		"Du hast nicht die `ADMINISTRATOR`-Berechtigung, um diesen Befehl auszuführen!",
	prevnames_data_erased:
		"Ihre früheren Benutzernamen wurden auf Ihren Wunsch hin vollständig gelöscht!",
	prevnames_embed_footer_text: "iHorizon | Seite ${page}/${pageCount}",

	// /blockbot
	blockbot_not_owner: ":x: **Du bist nicht der Besitzer des Servers!**",
	blockbot_logs_enable_title: "BlockBot-Protokoll",
	blockbot_logs_enable_description:
		"${author} (Der Besitzer des Servers) hat `BlockBot` __aktiviert__. Jetzt kann der Bot **nicht** zu diesem Server hinzugefügt werden!",
	blockbot_command_work_on_enable:
		"**Du hast `BlockBot` aktiviert**\nJetzt kann der Bot **nicht** zu diesem Server hinzugefügt werden!",
	blockbot_command_work_on_disable:
		"**Du hast `BlockBot` deaktiviert**\nJetzt kann der Bot zu diesem Server hinzugefügt werden!",
	blockbot_logs_disable_commmand_work: "BlockBot-Protokoll",
	blockbot_logs_disable_description:
		"${author} (Der Besitzer des Servers) hat `BlockBot` __deaktiviert__. Jetzt kann der Bot zu diesem Server hinzugefügt werden!",

	// /banner
	banner_guild_embed: "**Dies ist das Banner des Gildenservers!**",
	banner_user_embed: "**Dies ist das Banner von ${userUsername}!**",
	banner_guild_no_banner: "Der Server hat kein Banner.",
	banner_user_no_banner: "Dieser Benutzer hat kein Banner.",

	// /massiverole
	massiverole_add_command_work:
		"${author}, iHorizon hat den massiverole-Befehl ausgeführt.\n\n**${a}** Benutzer haben die Rolle ${role} __erhalten__\n**${s}** Benutzer hatten die Rolle ${role} __bereits__\niHorizon konnte die Rolle nicht zu **${e}** Benutzern hinzufügen.",
	massiverole_sub_command_work:
		"${author}, iHorizon hat den massiverole-Befehl ausgeführt.\n\n**${a}** Benutzer haben die Rolle ${role} __verloren__\n**${s}** Benutzer hatten die Rolle ${role} __nicht mehr__\niHorizon konnte die Rolle nicht von **${e}** Benutzern entfernen.",
	massiverole_too_much_member:
		"Zu viele Mitglieder, kann nicht ausgeführt werden, da eine Begrenzung möglich ist!",

	// /nickrole
	nickrole_add_command_work:
		"${author}, iHorizon hat den nickrole-Befehl ausgeführt.\n\n**${a}** Benutzer haben die ${role}-Rolle erhalten\n**${s}** Benutzer hatten `${part_of_nickname}` nicht im Namen\niHorizon konnte die Rolle nicht zu **${e}** Benutzern hinzufügen.",
	nickrole_sub_command_work:
		"${author}, iHorizon hat den nickrole-Befehl ausgeführt.\n\n**${a}** Benutzer haben die ${role}-Rolle verloren\n**${s}** Benutzer hatten `${part_of_nickname}` nicht mehr im Namen\niHorizon konnte die Rolle nicht von **${e}** Benutzern entfernen.",
	nickrole_too_much_member:
		"Zu viele Mitglieder, kann aufgrund einer möglichen Rate-Limitierung nicht fortgesetzt werden!",

	// /emoji
	emoji_send_new_emoji:
		"__Neues Emoji erstellt__ mit dem Namen **${emojiName}** ! (${emoji})",
	emoji_send_err_emoji:
		"__Fehler beim Erstellen des neuen Emoji__ mit dem Namen **${emojiName}** !",
	emoji_embed_desc_work:
		"__Erstellt **${cnt}** Emoji(s) in `${guildName}`__\n(${nemj})",

	// /derank
	derank_msg_desc_embed:
		"## Ich habe erfolgreich **${good}** Rolle(n) von <@${memberId}> entfernt.\n## Leider konnte ich **${bad}** Rolle(n) nicht entfernen.",
	derank_msg_failed: "Ein Fehler ist beim Entfernen der Rollen aufgetreten.",
	derank_no_role: "Dieses Mitglied hat keine Rollen zum Entfernen.",

	// /Aktion Entbannen alle
	action_unban_all_embed_desc:
		"## Alle Gildenmitglieder entbannen\n${emoji_Yes} | Ich habe erfolgreich das Verbot von `${unbannedMemberCount}` Mitglied(ern) in der Gilde aufgehoben!\n${emoji_No} | Ich kann `${cannot_unban}` Mitglied(er) nicht entbannen!",
	action_unban_all_no_banned_members: "Es gibt keine gesperrten Mitglieder.",

	// /Aktion Entbannen rückgängig machen
	action_unban_undo_embed_desc:
		"## Das Entbannen aller rückgängig machen\n${emoji_Yes} | Ich habe erfolgreich `${bannedMemberCount}` Mitglied(er) in der Gilde gebannt!\n${emoji_No} | Ich kann `${cannot_ban}` Mitglied(er) nicht entbannen!",

	// /vc
	vc_embed_desc:
		"## Sprachstatus\n`${voiceCount}` Mitglied(er) sind im Sprachkanal:\n${emoji_iHorizon_Streaming} **=>** ${streaming}\n${emoji_iHorizon_Deaf} **=>** ${deafened}\n${emoji_iHorizon_Mute} **=>** ${muted}\n${emoji_iHorizon_Camera} **=>** ${video}\n## Mitgliederstatus\n`${memberCount}` Mitglied(er) sind in der Gilde:\n${emoji_DND} **=>** ${dnd}\n${emoji_Online} **=>** ${online}\n${emoji_Idle} **=>** ${idle}\n${emoji_Invisible} **=>** ${offline}\n## Boost-Status\n`${boostCount}` Boost(s) in der Gilde,\n${members}",
	vc_embed_fields_1_name: "・Mitgliederzahl",
	vc_embed_fields_1_value: "```py\n${memberCount} Mitglieder```",
	vc_embed_fields_2_name: "・Kanalanzahl",
	vc_embed_fields_2_value:
		"```py\n${textChannelSize} Textkanal(e)\n${voiceChannelSize} Sprachkanal(e)```",
	vc_embed_short_desc:
		"## Sprachkanäle\n`${voiceCount}` Mitglied(er) sind im Sprachkanal:\n${emoji_iHorizon_Streaming} **=>** ${total_members_vc_streaming}\n${emoji_iHorizon_Deaf} **=>** ${total_members_vc_deaf}\n${emoji_iHorizon_Mute} **=>** ${total_members_vc_mute}\n${emoji_iHorizon_Camera} **=>** ${total_members_vc_video}\n## Mitgliederstatus\n`${total_members_size}` Mitglied(er) sind in der Gilde:\n${emoji_DND} **=>** ${total_members_states_dnd}\n${emoji_Online} **=>** ${total_members_states_online}\n${emoji_Idle} **=>** ${total_members_states_idle}",

	// /massmove
	massmove_results:
		"${author}, iHorizon hat Mitglieder zwischen Sprachkanälen verschoben.\n\n**${movedCount}** Mitglied(er) wurden erfolgreich von ${fromChannel} nach ${toChannel} verschoben.\n**${errorCount}** Mitglied(er) konnten nicht verschoben werden (siehe Serverprotokolle für Details).",
	massmove_too_much_member:
		"Zu viele Mitglieder, kann es aufgrund möglicher Ratenbegrenzung nicht tun!",

	// /all-admins
	all_admins_nobody_admins: "Es gibt keinen Administrator in diesem Server!",
	all_admins_embed_title: "Liste aller Administratoren | Seite ${page}",
	all_admins_unrank_button_label: "Alle entlassen",
	all_admins_unrank_embed_desc:
		"${author}, iHorizon hat das Entlassen aller für das AllAdmins Modul ausgeführt.\n\n**${good}** Benutzer wurden __erfolgreich__ entlassen\niHorizon konnte **${bad}** Benutzer __nicht__ entlassen.",
	all_admins_unrank_not_owner:
		"Nur der Besitzer des Servers kann alle Administratoren des Servers entlassen",

	// /allbots
	all_bots_embed_title: "Liste aller Bot(s) | Seite ${page}",

	// /addrole
	utils_addrole_highter_or_egal_roles_msg:
		"${emoji_Stop} Du kannst keine Rolle zu einem Benutzer hinzufügen, der eine höhere Rolle als du hat...",
	utils_addrole_command_ok:
		"${author} hat erfolgreich die Rolle ${role} zu ${user} hinzugefügt",
	utils_addrole_not_wl:
		"${emoji_No} | Die Rolle, die du dem Benutzer hinzufügen möchtest, ist nicht auf der Whitelist. Ein Administrator muss sie zuerst hinzufügen! (mit `/utils wlroles`)",
	utils_addrole_cant_level:
		"Das Mitglied ist kein Admin, und du willst ihm eine Admin-Rolle geben? Willst du mich veräppeln? Willst du den Server sprengen?",
	utils_addrole_try2brain:
		"Der Bot steht zu weit unten in der Rollen-Hierarchie. Ich kann ihm diese blöde Rolle nicht geben.",

	// /delrole
	utils_delrole_highter_or_egal_roles_msg:
		"${emoji_Stop} Du kannst keine Rolle von einem Benutzer entfernen, der eine höhere Rolle als du hat...",
	utils_delrole_command_ok:
		"${author} hat erfolgreich die Rolle ${role} von ${user} entfernt",
	utils_delrole_not_wl:
		"${emoji_No} | Die Rolle, die du dem Benutzer entfernen möchtest, ist nicht auf der Whitelist. Ein Administrator muss sie zuerst hinzufügen! (mit `/utils wlroles`)",
	utils_delrole_try2brain:
		"Der Bot steht zu weit unten in der Rollen-Hierarchie. Ich kann diese blöde Rolle nicht entfernen.",

	// /utils wlroles
	utils_wlroles_embed_title: "Whitelist-Rollen",
	utils_wlroles_embed_desc:
		"Hier sind alle erlaubten Rollen, die mit den Befehlen `addrole` und `delrole` gegeben werden können!",
	utils_wlRoles_logsEmbed_title: "Whitelist-Rollenmodul",
	utils_wlRoles_logsEmbed_desc:
		"${author} hat die Whitelist-Rollen bearbeitet (für die Befehle `addrole` und `delrole`)",
	utils_derogation_already_exists:
		"${emoji_No} Die Ausnahmerolle ${role} ist bereits korrekt konfiguriert",
	utils_derogation_created:
		"${emoji_Yes} Die Ausnahmerolle ${role} wurde erstellt. Synchronisierte Kanäle: `${updatedChannels}`. Fehler: `${failedChannels}`",
	utils_derogation_resynced:
		"${emoji_Yes} Die Ausnahmerolle ${role} existierte bereits, ich habe `${updatedChannels}` Kanäle neu synchronisiert. Fehler: `${failedChannels}`",

	// /utils dm
	utils_dm:
		"${emoji_Yes} Die Nachricht wurde erfolgreich an ${targetMember} gesendet.",
	utils_dm_cant:
		"${emoji_No} Ich konnte die Nachricht nicht an ${targetMember} senden. Vielleicht hat er private Nachrichten blockiert oder er hat mich blockiert!",

	// /utils pic-only
	utils_pic_only_embed_title: "Nur Medien Kanäle",
	utils_pic_only_emnbed_desc:
		"Kanal, in dem nur Bilder/Videos erlaubt sind. Andere Inhalte (wie Textnachrichten) werden vom Bot blockiert",
	utils_piconly_embed_fields_3_name: "Timeout-Zeit",
	utils_piconly_select1_option1_label: "Timeout-Zeit ändern",
	utils_piconly_select1_option2_label: "Schwellenwert ändern",
	utils_piconly_modal1_title: "MediaOnly - Zeitkonfiguration",
	utils_piconly_modal1_fields1_placeholder: "Dauer der Stummschaltung",
	utils_piconly_modal1_fields1_label: "Stummschaltzeit",
	utils_piconly_modal2_title: "MediaOnly - Schwellenwert-Konfiguration",
	utils_piconly_modal2_fields1_placeholder:
		"Schwellenwert vor Stummschaltung",
	utils_piconly_modal2_fields1_label: "Schwellenwert",
	utils_piconly_embed_fields2_placeholder:
		"Thread unter dem Bild/Video erstellen",
	utils_piconly_var_thread_name: "Thread von {name}",

	// /zip-emojis
	zip_emojis_doesnt_have_perm:
		"Sie haben keine Berechtigung, Emojis zu verwalten.",
	zip_emojis_command_work:
		"🎉 Export abgeschlossen in **${calcTime}**ms! Hier ist das Archiv mit ${emojiCount} Emojis.",
	zip_emojis_command_error:
		"Beim Exportieren der Emojis ist ein Fehler aufgetreten.",

	// /zip-stickers
	zip_stickers_doesnt_have_perm:
		"Du hast keine Berechtigung, Aufkleber zu verwalten.",
	zip_stickers_command_work:
		"🎉 Export abgeschlossen in **${calcTime}**ms! Hier ist das Archiv mit ${stickerCount} Aufklebern.",
	zip_stickers_command_error:
		"Beim Exportieren der Aufkleber ist ein Fehler aufgetreten.",

	// +sticker
	sticket_no_sticker: "Kein Sticker in der beantworteten Nachricht gefunden.",
	sticket_command_work: "Der Sticker `${name}` wurde erfolgreich erstellt.",
	sticker_command_error:
		"Der Sticker konnte nicht erstellt werden. Ein Fehler ist aufgetreten: `${errMessage}`.",
	sticket_command_error2:
		"Bitte antworten Sie auf eine Nachricht, die einen Sticker enthält.",

	// /util nick-kicker
	util_nick_kicker_embed_title: "Spitzname-Entferner",
	util_nick_kicker_embed_desc:
		"Wenn ein Mitglied beitritt und sein Spitzname ein bestimmtes Wort enthält, wird es gekickt",
	util_nick_kicker_words: "Wörter",
	util_nick_kicker_select_to_remove: "Wählen Sie ein Wort zum Entfernen",
	util_nick_kicker_remove_word: "Dieses Wort entfernen",
	util_nick_kicker_no_word_to_remove: "Es gibt kein Wort zum Entfernen",
	util_nick_kicker_add_word: "Wort hinzufügen",
	util_nick_kicker_words_max_15:
		"Sie können nicht mehr als 15 Wörter hinzufügen",
	util_nick_kicker_disable: "Deaktivieren",
	util_nick_kicker_remove_word2: "Wort entfernen",
	util_nick_kicker_remove_desc:
		"Ein Wort aus dem Spitzname-Entferner entfernen",
	util_nick_kicker_add_desc: "Ein Wort zum Spitzname-Entferner hinzufügen",
	util_nick_kicker_disable_desc: "Spitzname-Entferner deaktivieren",
	util_nick_kicker_enable_desc: "Spitzname-Entferner aktivieren",

	// /util wakeup
	util_wakeup_yourself:
		"Ey, bist du verrückt oder was? Schreibst du im Schlaf auf der Tastatur oder was ist los? lol",
	util_wakeup_not_in_vc:
		"Ey Bruder, der Bot wird ${userDisplayName} nicht mit demselben Profilbild und Banner klonen, damit du denkst, die Person wäre wach... Die ist nicht mal im VC lol",
	util_wakeup_command_work: "Los geht's mit dem Wecken von ${user} !",

	// /util talk
	util_talk_not_in_vc:
		"Du musst dich in einem Sprachkanal befinden, um diesen Befehl zu verwenden.",
	util_talk_audit_reason: "Sprach-Talkmodus aktiviert",
	util_talk_logs_title: "Voice Talk",
	util_talk_logs_description:
		"${author} hat den Talkmodus in ${voiceChannel} aktiviert und ${mutedCount} Mitglied(er) stummgeschaltet. ${skippedCount} Mitglied(er) wurden übersprungen.",
	util_talk_command_work:
		"Der Talkmodus ist jetzt in ${voiceChannel} aktiviert. ${mutedCount} Mitglied(er) wurden stummgeschaltet und ${skippedCount} Mitglied(er) wurden übersprungen.",

	// /util untalk
	util_untalk_nothing_active:
		"Für diesen Server ist kein aktiver Talkmodus vorhanden.",
	util_untalk_audit_reason: "Sprach-Talkmodus deaktiviert",
	util_untalk_logs_title: "Voice Untalk",
	util_untalk_logs_description:
		"${author} hat den Talkmodus in ${voiceChannel} deaktiviert und ${unmutedCount} Mitglied(er) entstummt.",
	util_untalk_command_work:
		"Der Talkmodus wurde in ${voiceChannel} deaktiviert. ${unmutedCount} Mitglied(er) wurden entstummt.",

	// /util freeze
	util_freeze_logs_title: "Voice Freeze",
	util_freeze_logs_description:
		"${author} hat den Zugriff auf ${voiceChannel} eingefroren.",
	util_freeze_command_work:
		"Der Sprachkanal ${voiceChannel} ist jetzt eingefroren.",

	// /util wlvc
	util_wlvc_no_member:
		"Du musst ein Mitglied angeben, das dem eingefrorenen Sprachkanal beitreten darf.",
	util_wlvc_no_freeze:
		"Es gibt keinen aktiven eingefrorenen Sprachkanal auf diesem Server.",
	util_wlvc_logs_title: "Voice Freeze Allow",
	util_wlvc_logs_description:
		"${author} hat ${member} erlaubt, dem eingefrorenen Sprachkanal beizutreten.",
	util_wlvc_command_work:
		"${member} darf jetzt dem eingefrorenen Sprachkanal beitreten.",

	// /util unwlvc
	util_unwlvc_no_member:
		"Du musst ein Mitglied angeben, das aus der Whitelist des eingefrorenen Sprachkanals entfernt werden soll.",
	util_unwlvc_no_freeze:
		"Es gibt keinen aktiven eingefrorenen Sprachkanal auf diesem Server.",
	util_unwlvc_not_whitelisted:
		"${member} ist im eingefrorenen Sprachkanal nicht erlaubt.",
	util_unwlvc_logs_title: "Voice Freeze Erlaubnis Entfernen",
	util_unwlvc_logs_description:
		"${author} hat ${member} aus der Whitelist des eingefrorenen Sprachkanals entfernt.",
	util_unwlvc_command_work:
		"${member} kann dem eingefrorenen Sprachkanal nicht mehr beitreten.",

	// /util unfreeze
	util_unfreeze_no_freeze:
		"Es gibt keinen aktiven eingefrorenen Sprachkanal auf diesem Server.",
	util_unfreeze_logs_title: "Voice Unfreeze",
	util_unfreeze_logs_description:
		"${author} hat die aktive Sprachsperre entfernt.",
	util_unfreeze_command_work: "Der Sprachkanal ist nicht mehr eingefroren.",

	// /util leash
	util_leash_too_naugthy:
		"Du kleiner Frechdachs, du kannst nicht mehr als 3 Personen an die Leine nehmen :D",
	util_leah_already_owned:
		"Du kleiner Frechdachs, du besitzt diese kleinen Wunder schon :smirk:",
	util_leash_confirm_message:
		"${emoji_No} | Das Mitglied, das du an die Leine legen möchtest, ist nicht in einem Sprachkanal!\n${emoji_Warning_Icon} | Bist du sicher, dass du diese Aktion ausführen möchtest?",
	util_leash_canceled_leash: "${emoji_Yes} | Leine-Konfiguration abgebrochen",
	util_leash_confirmed_leash:
		"${emoji_Yes} | Sie haben den Benutzer erfolgreich an die Leine gelegt in diesem Server :smirk:",

	// /util unleash
	util_unleash_not_in_leash:
		"${emoji_No} | Dieser Benutzer ist nicht an deiner Leine!",
	util_unleash_command_ok:
		"${emoji_Yes} | Du hast den Benutzer in diesem Server erfolgreich losgelassen :)",

	// /utilss leashlist
	util_leashlist_no_data:
		"${emoji_No} | Es gibt keine aktive Leine auf diesem Server.",
	util_leashlist_embed_title: "Aktive Leinen",
	util_leashlist_embed_desc: "${dom} -> ${sub} (läuft in `${remaining}` ab)",

	// /util lockname, /util unlockname
	util_lockname_not_in_guild:
		"${emoji_No} | Dieses Mitglied ist nicht auf dem Server!",
	util_lockname_not_manageable:
		"${emoji_No} | Ich habe keine Berechtigung, den Nicknamen dieses Mitglieds zu verwalten!",
	util_lockname_already_locked:
		"${emoji_No} | Der Nickname dieses Mitglieds ist bereits gesperrt!",
	util_lockname_success:
		"${emoji_Yes} | Der Nickname von ${member} ist nun auf **${nick}** gesperrt!",
	util_lockname_success_reset:
		"${emoji_Yes} | Der Nickname von ${member} ist nun gesperrt!",
	util_unlockname_not_locked:
		"${emoji_No} | Der Nickname dieses Mitglieds ist nicht gesperrt!",
	util_unlockname_success:
		"${emoji_Yes} | Der Nickname von ${member} wurde entsperrt!",
	util_lockname_logs_embed_title: "Nickname-Sperr-Logs",
	util_lockname_logs_embed_description:
		"<@${authorId}> hat den Nicknamen von <@${memberId}> gesperrt",
	util_unlockname_logs_embed_description:
		"<@${authorId}> hat den Nicknamen von <@${memberId}> entsperrt",

	util_locknamelist_empty:
		"${emoji_No} | Kein gesperrter Nickname auf diesem Server! `/utilss lockname` zum Erstellen.",
	util_locknamelist_embed_title: "Gesperrte Nicknames",
	util_locknamelist_embed_count: "**${count}** gesperrte(r) Nickname(s):",
	util_locknamelist_embed_line:
		"> <@${memberId}> • **${nick}** • von ${lockedBy} • <t:${lockedAt}:f> (<t:${lockedAt}:R>)",
	util_locknamelist_embed_line_short: "> <@${memberId}> • **${nick}**",

	// /util autorenew
	util_autorenew_time_too_short:
		"Die Zeit zwischen einer Kanalerneuerung muss mehr als 1 Minute betragen",
	util_autorenew_time_too_long:
		"Die Zeit zwischen einer Kanalerneuerung muss weniger als 30 Tage betragen",
	util_autorenew_command_ok:
		"${emoji_Yes} Ab jetzt wird der Kanal ${channel} automatisch alle ${time} gelöscht und neu erstellt (erneuert)!\nUm die Kanalerneuerung zu stoppen, lösche ihn einfach selbst.",
	event_autorenew_channel_renewed:
		"Die AutoRenew-Funktion hat den Kanal erneuert!",
	event_autorenew_channel_warning:
		"Das AutoRenew-Modul ist so konfiguriert, dass dieser Kanal erneuert wird. Nächste Erneuerung in ${time}.",

	// /util where
	util_where_deaf: "Selbst taub",
	util_where_mute: "Selbst stumm",
	var_video: "Video",
	var_whereis: "Wo ist",
	util_not_in_vc: "Die Mitglieder sind nicht in einem Sprachkanal",

	// /util allwebhooks
	util_no_webhooks: "Es gibt keine Webhooks in diesem Server.",
	util_allwebhooks_embed_title: "Alle Webhooks",
	util_allwebhooks_deleting: "Alle Webhooks werden gelöscht...",
	util_allwebhooks_deleted: "**`${u}`** Webhook(s) gelöscht!",

	// /util unzip-emojis
	util_unzip_emojis_command_work:
		"🎉 Entpacken abgeschlossen in ${calcTime}ms! Ich habe ${emojiCount} Emoji(s) in der Gilde erstellt.",
	util_unzip_emojis_command_error:
		"Beim Entpacken der Emojis ist ein Fehler aufgetreten.",
	util_unzip_emojis_command_no_file:
		"Bitte fügen Sie eine ZIP-Datei mit Emojis bei.",

	// /util vkick
	vkick_member_not_in_guild: "Das Mitglied ist nicht in der Gilde.",
	vkick_not_in_vc: "Das Mitglied ist nicht in einem Sprachkanal.",
	vkick_not_admin_kick:
		"Sie können keinen Administrator von einem Sprachkanal trennen.",
	vkick_logEmbed_title: "Sprachkick",
	vkick_logEmbed_desc:
		"${author} hat ${member} vom Sprachkanal ${voiceChannel} getrennt.",
	vkick_command_work:
		"${author}, Sie haben ${member} erfolgreich von ${voiceChannel} getrennt.",

	// /util sync
	util_sync_embed_description_1:
		"Die folgenden Kanäle wurden mit der Kategorie `#${categoryName}` synchronisiert:\n\n${changes}",
	util_sync_embed_description_0:
		"Alle Kanäle in der Kategorie haben bereits synchronisierte Berechtigungen.",

	// /util securewebhook
	util_securewebhook_action_create: "Ungültige Discord Webhook URL",
	util_securewebhook_action_create_error:
		"Fehler beim Erstellen des Webhooks: `${status}`",
	util_securewebhook_action_create_ok:
		"Webhook erfolgreich erstellt\n> URL: ${url}\n> Verwendung: ${use}",
	util_securewebhook_action_delete_any: "Du hast keine Webhooks",
	util_securewebhook_action_delete_not_owner:
		"Du bist nicht der Besitzer dieses Webhooks",
	util_securewebhook_action_delete_error: "Fehler beim Löschen des Webhooks",
	util_securewebhook_actiom_list_ok: ":star: __**Deine Webhooks**__:\n",

	// /util admin-roles
	admin_roles_nobody_roles:
		"In diesem Server gibt es keine Administrator‑Rollen!",
	admin_roles_embed_title: "Liste aller Administrator‑Rollen | Seite ${page}",
	admin_roles_remove_button_label: "Admin von allen entfernen",
	admin_roles_remove_embed_desc:
		"${author}, iHorizon hat die Entfernung der Admin‑Berechtigung für das AdminRoles‑Modul ausgeführt.\n\n**${good}** Rolle(n) wurden erfolgreich __geändert__\nBei **${bad}** Rolle(n) konnte iHorizon keine Änderungen vornehmen.",
	admin_roles_remove_not_owner: "Du bist nicht der Server‑Besitzer!",

	// /util rolelimit
	util_rolelimit_bad_opt:
		"${emoji_No} | Die angegebenen Optionen sind ungültig. Bitte überprüfe deine Eingabe.",
	util_rolelimit_good:
		"${emoji_Crown} | Rolle: ${role} | Maximale Mitgliederanzahl: ${limit_count}\n- Neue Benutzer können diese Rolle nicht erhalten, wenn bereits ${limit_count} Mitglieder sie haben.",

	// /util inviteinfo
	util_inviteinfo_not_valid_invite:
		"Diese Einladung `discord_invite` ist ungültig!",

	// /util cooldown
	util_cooldown_command_ok:
		"Der Slowmode des Kanals wurde auf ${duration_in_string} gesetzt.",

	// /util role-members
	util_role_members: "Liste der Benutzer mit den Rollen",
	util_role_members_no_one: "Niemand auf dem Server hat diese Rolle",

	// /util vanity-generator
	util_vanity_generator_invalid_code:
		"Der URL-Vanity-Code `${VanityCode}` ist ungültig. Der String sollte alphanumerisch sein und Bindestriche zwischen Wörtern enthalten können. Die maximale Länge beträgt 32 Zeichen. Bindestriche dürfen nicht am Anfang oder Ende stehen.",
	util_vanity_generator_already_claimed:
		"Der URL-Vanity-Code ist bereits vergeben! Wähle einen anderen.",
	util_vanity_generator_command_err:
		"Beim Erstellen des Vanity-Codes ist ein Fehler aufgetreten. Bitte versuche es später erneut.",

	// +top
	utils_top_no_message: "Keine Nachrichten in diesem Kanal gefunden",
	utils_top_command_ok:
		"Die erste Nachricht in diesem Kanal ist [hier](${link})",

	// +bringall
	bringall_no_from_channel: "Bitte geben Sie einen Quell-Sprachkanal an.",
	bringall_invalid_category: "Bitte geben Sie eine gültige Kategorie an.",
	bringall_no_voice_channels:
		"Die angegebene Kategorie enthält keine Sprachkanäle.",
	bringall_no_members:
		"Es befinden sich keine Mitglieder im Quell-Sprachkanal.",
	bringall_results:
		"${author}, iHorizon hat Mitglieder auf Sprachkanäle verteilt.\n\n**${movedCount}** Mitglied(er) wurden erfolgreich von ${fromChannel} auf ${channelCount} Kanäle in ${category} verschoben.\n**${errorCount}** Mitglied(er) konnten nicht verschoben werden (siehe Serverprotokolle für Details).",

	// /util move
	util_move_not_in_vc:
		"Das Mitglied, das du verschieben möchtest, ist in keinem Sprachkanal verbunden.",
	util_move_impossible_to_move_admin:
		"Das Mitglied, das du verschieben möchtest, ist Administrator und du bist kein Administrator.",
	util_move_command_ok: "${member} ist jetzt in ${channel}",

	// Guild Config commands
	// /blockpub, /guildprofil, /setchannels, /setjoindm, /setjoinmessage, /setjoinroles, /setleavemessage, /setup

	// /blockpub
	blockpub_not_admin:
		":x: | Sie müssen ein Administrator dieses Servers sein!",
	blockpub_now_enable:
		"📌 | Der Anti-Werbung ist jetzt aktiviert (Es funktioniert für alle außer Administratoren)",
	blockpub_now_disable: "📌 | Der Anti-Werbung ist jetzt deaktiviert!",

	// /guildprofil
	guildprofil_not_admin:
		":x: | Sie müssen ein Administrator dieses Servers sein!",
	guildprofil_not_set_reactionrole: "Nicht gesetzt!",
	guildprofil_set_reactionrole:
		"**MessageID**: `${i}` -> ${emoji} gibt <@&${rolesID}> Rolle\n",
	guildprofil_not_set_ticketFetched: "Nicht gesetzt!",
	guildprofil_set_ticketFetched: "",
	guildprofil_not_set_punishPub: "Nicht gesetzt!",
	guildprofil_set_punishPub:
		"`${punishementType}`: max: `${amountMax}` Flags.",
	guildprofil_not_set_supportConfig: "Nicht gesetzt!",
	guildprofil_set_supportConfig:
		"`${input}` in der Bio gibt <@&${rolesId}> Rolle.",
	guildprofil_not_set_setchannelsjoin: "Nicht gesetzt!",
	guildprofil_set_setchannelsjoin: "",
	guildprofil_not_set_setchannelsleave: "Nicht gesetzt!",
	guildprofil_set_setchannelsleave: "",
	guildprofil_not_set_joinmessage: "Nicht gesetzt!",
	guildprofil_set_joinmessage: "",
	guildprofil_not_set_leavemessage: "Nicht gesetzt!",
	guildprofil_set_leavemessage: "",
	guildprofil_not_set_joinroles: "Nicht gesetzt!",
	guildprofil_set_joinroles: "",
	guildprofil_not_set_joinDmMessage: "Nicht gesetzt!",
	guildprofil_set_joinDmMessage: "",
	guildprofil_not_set_blockpub: "Ausgeschaltet",
	guildprofil_set_blockpub: "Eingeschaltet",
	guildprofil_embed_description: "`Guild Config:` ${guildName} !",
	guildprofil_embed_fields_joinmessage: "Beitritt Nachricht",
	guildprofil_embed_fields_leavemessage: "Verlassen Nachricht",
	guildprofil_embed_fields_setchannelsjoin: "Kanal Beitritt",
	guildprofil_embed_fields_setchannelsleave: "Kanal Verlassen",
	guildprofil_embed_fields_joinroles: "Beitritt Rolle",
	guildprofil_embed_fields_joinDmMessage: "Beitritt DM",
	guildprofil_embed_fields_blockpub: "Werbung blockieren",
	guildprofil_embed_fields_punishPub: "Werbung bestrafen",
	guildprofil_embed_fields_supportConfig: "Unterstützung",
	guildprofil_embed_fields_ticketFetched: "Tickets",
	guildprofil_embed_fields_reactionrole: "Reaktionsrolle",
	guildprofil_not_logs_set: "Keine Kanalprotokolle festgelegt",
	guildprofil_blockbot_on: "Bot-Blockierung aktiviert",
	guildprofil_blockbot_off: "Bot-Blockierung deaktiviert",
	guildprofil_disable_xp: "Nachricht deaktiviert",
	guildprofil_enable_xp: "Nachricht aktiviert",
	guildprofil_another_enable_xp:
		"Nachricht aktiviert für Senden in <#${xpChannels}>",
	guildprofil_embed_fields_blockbot: "Bot-Blockierung",
	guildprofil_embed_fields_logs: "Protokolle",
	guildprofil_embed_fields_ranks: "Ränge",

	// /setchannels
	setchannels_not_admin:
		":x: | Sie müssen ein Administrator dieses Servers sein, um diesen Befehl auszuführen!",
	setchannels_not_specified_args:
		"Sie müssen einen gültigen Kanal für Ihr Modul angeben.",
	setchannels_already_this_channel_on_join:
		"Das Modul ist bereits mit diesem Kanal konfiguriert!",
	setchannels_confirmation_message_on_join:
		"**Beitrittskanal hier eingestellt!** :tada:",
	setchannels_command_error_on_join:
		"Fehler: Fehlende Berechtigungen oder Kanal existiert nicht",
	setchannels_command_work_on_join:
		"Sie haben das Beitrittskanal-Modul erfolgreich auf <#${argsidId}> gesetzt",
	setchannels_logs_embed_title_on_join: "Setze Kanalprotokolle",
	setchannels_logs_embed_description_on_join:
		"<@${authorId}> hat das Beitrittskanal-Modul auf folgenden Kanal gesetzt: <#${argsidId}>",
	setchannels_already_this_channel_on_leave:
		"Das Modul ist bereits mit diesem Kanal konfiguriert!",
	setchannels_confirmation_message_on_leave:
		"**Austrittskanal hier eingestellt!** :tada:",
	setchannels_command_error_on_leave:
		"Fehler: Fehlende Berechtigungen oder Kanal existiert nicht",
	setchannels_command_work_on_leave:
		"Sie haben das Austrittskanal-Modul erfolgreich auf <#${argsidId}> gesetzt",
	setchannels_logs_embed_title_on_leave: "Setze Kanalprotokolle",
	setchannels_logs_embed_description_on_leave:
		"<@${authorId}> hat das Austrittskanal-Modul auf folgenden Kanal gesetzt: <#${argsidId}>",
	setchannels_already_on_off:
		"Die Beitritts- und Austrittskanäle sind bereits deaktiviert",
	setchannels_command_work_on_off:
		"Sie haben die Beitritts- und Austrittskanäle erfolgreich deaktiviert!",
	setchannels_logs_embed_title_on_off: "Setze Kanalprotokolle",
	setchannels_logs_embed_description_on_off:
		"<@${authorId}> hat alle Einstellungen für Beitritts- und Austrittskanäle gelöscht!",
	setchannels_button_join: "Ändere Beitrittskanal",
	setchannels_button_leave: "Ändere Austrittskanal",
	setchannels_button_delete: "Konfiguration löschen",
	setchannels_embed_fields_value_join: "Beitrittskanal",
	setchannels_embed_fields_value_leave: "Austrittskanal",
	setchannels_not_a_text_channel:
		"${emoji_Warning_Icon} Der angegebene Kanal ist kein Textkanal!",
	setchannels_which_channel:
		"<@${authorId}>, Welchen Kanal möchten Sie einrichten?",
	setchannels_title_embed_panel:
		"Konfigurationspanel für Kanäle der Gildenkonfiguration",

	// /setjoindm
	setjoindm_not_admin:
		":x: | Sie müssen ein Administrator dieses Servers sein, um diesen Befehl auszuführen!",
	setjoindm_logs_embed_title_on_enable: "Setze JoinDm-Protokolle",
	setjoindm_logs_embed_description_on_enable:
		"<@${authorId}> hat die Join-Dm-Nachricht eingestellt!",
	setjoindm_not_specified_args_on_enable:
		"Sie müssen eine gültige Nachricht für Ihre Join-Dm angeben.",
	setjoindm_confirmation_message_on_enable:
		"Sie haben die Join-Dm-Nachricht erfolgreich auf ```${dm_msg}``` gesetzt und aktiviert",
	setjoindm_command_error_on_enable:
		"Fehler: Fehlende Berechtigungen oder Kanal existiert nicht",
	setjoindm_logs_embed_title_on_disable: "Setze JoinDm-Protokolle",
	setjoindm_confirmation_message_on_disable:
		"You havesuccessfully disable the join dm !",
	setjoindm_logs_embed_description_on_disable:
		"<@${authorId}> hat die Join-Dm-Nachricht deaktiviert!",
	setjoindm_command_error_on_disable:
		"Fehler: fehlende Berechtigungen oder Kanal existiert nicht",
	setjoindm_already_disable: "Die Join-DM-Nachricht ist bereits deaktiviert!",
	setjoindm_not_setup_ls: "Es ist hier keine Join-DM eingerichtet!",
	setjoindm_command_work_ls:
		"Die Join-DM-Nachricht lautet: \n```${already_off}```",
	setjoindm_help_embed_title:
		"Hilfe zur Einstellung der Beitritts-DM-Nachricht!",
	setjoindm_help_embed_desc:
		"{memberUsername} => Der Benutzername des Mitglieds\n{memberMention} => Das Mitglied erwähnen\n{memberCount} => Anzahl der Mitglieder in der Gilde\n{guildName} => Name der Gilde\n{createdAt} => Kontenerstellungsdatum im Format tt/mm/jjjj\n{accountCreationTimestamp} => Zeitstempel des Kontenerstellungsdatums",
	setjoindm_buttom_set_name: "Nachricht festlegen",
	setjoindm_buttom_delete_name: "DM-Nachricht löschen",
	setjoindm_awaiting_response:
		"Schreiben Sie die neue benutzerdefinierte Beitritts-DM-Nachricht in den Kanal.",

	// /setjoinmessage
	setjoinmessage_not_admin:
		":x: | Sie müssen Administrator dieses Servers sein, um diesen Befehl zu verwenden!",
	setjoinmessage_help_embed_title: "SetJoinMessage Hilfe!",
	setjoinmessage_help_embed_description:
		"/setjoinmessage <Power on / Power off / Nachricht anzeigen> <Join-Nachricht>",
	setjoinmessage_help_embed_fields_name: "Wie wird es verwendet?",
	setjoinmessage_help_embed_fields_value:
		"Verwenden Sie ```/setjoinmessage <Power on / Power off / Nachricht anzeigen> <Nachricht>```\n{user} = Benutzername des Mitglieds\n{membercount} = Anzahl der Mitglieder auf dem Server\n{createdat} = Datum der Kontoerstellung des Mitglieds\n{guild} = Der Name des Servers\n{inviter} = Der Name und Diskriminator des Einladenden\n{invites} = Die Anzahl der von ihm gesendeten Einladungen",
	setjoinmessage_logs_embed_title_on_enable: "SetJoinMessage Logs",
	setjoinmessage_logs_embed_description_on_enable:
		"<@${authorId}> hat die Join-Nachricht eingerichtet!",
	setjoinmessage_command_work_on_enable:
		"${emoji_GreenTick} | Benutzerdefinierte Join-Nachricht erfolgreich eingerichtet.",
	setjoinmessage_logs_embed_title_on_disable: "SetJoinMessage Logs",
	setjoinmessage_logs_embed_description_on_disable:
		"<@${authorId}> hat die Join-Nachricht gelöscht!",
	setjoinmessage_command_work_on_disable:
		"${emoji_Yes} | Benutzerdefinierte Join-Nachricht erfolgreich gelöscht.",
	setjoinmessage_command_work_ls: "Die Join-Nachricht lautet:",
	setjoinmessage_help_embed_fields_custom_name:
		"Benutzerdefinierte Nachricht",
	setjoinmessage_help_embed_fields_custom_name_empy: "Nicht festgelegt!",
	setjoinmessage_help_embed_fields_default_name_empy: "Standardnachricht",
	setjoinmessage_help_embed_desc:
		"{memberUsername} => Der Benutzername des Mitglieds\n{memberMention} => Das Mitglied erwähnen\n{inviterUsername} => Der Benutzername des Einladenden\n{inviterMention} => Den Einladenden erwähnen\n{memberCount} => Anzahl der Mitglieder in der Gilde\n{invitesCount} => Anzahl der Einladungen des Einladenden\n{guildName} => Der Name der Gilde\n{createdAt} => Kontenerstellungsdatum im Format tt/mm/jjjj\n{accountCreationTimestamp} => Zeitstempel des Kontenerstellungsdatums",
	setjoinmessage_button_set_name: "Nachricht festlegen",
	setjoinmessage_buttom_del_name: "Standardnachricht",
	setjoinmessage_awaiting_response: "Schreiben Sie eine Beitrittsnachricht",
	setjoinmessage_image_default_text:
		"Willkommen {memberUsername} bei {guildName}<br>Wir sind jetzt {memberCount} im Server",
	setjoinmessage_change_image_button_title: "Bild ändern",
	setjoinmessage_default_image_button_title: "Standardbild",
	setjoinmessage_var_enable_image: "Bild aktivieren",
	setjoinmessage_var_disable_image: "Bild löschen",
	setjoinmessage_var_image_card: "Begrüßungsnachrichtenkarte",
	setjoinmessage_change_image_propreties_background: "Hintergrund ändern",
	setjoinmessage_change_image_propreties_frame_color:
		"Runde Rahmenfarbe ändern",
	setjoinmessage_change_image_propreties_text_colour: "Textfarbe ändern",
	setjoinmessage_change_image_propreties_text_message: "Textnachricht ändern",
	setjoinmessage_change_image_propreties_text_size: "Textgröße ändern",
	setjoinmessage_change_image_propreties_avatar_size: "Avatargröße ändern",
	setjoinmessage_modal_fields_background_url: "Hintergrundbild-URL",
	setjoinmessage_change_image_menu_frame_color_profil:
		"Basierend auf der Benutzerprofilfarbe",
	setjoinmessage_change_image_menu_frame_status_profil:
		"Basierend auf dem Benutzerstatus",
	setjoinmessage_modal_fields_hex_color: "Farbe www.color-hex.com",
	setjoinmessage_modal_fields_message: "Nachricht, die du möchtest",
	setjoinmessage_var_text_size: "Textgröße: ",
	setjoinmessage_var_avatar_size: "Avatargröße: ",
	setjoinmessage_change_image_invalid_url:
		"Ungültige Bild-URL. Bitte versuchen Sie es mit einem anderen Bildanbieter.",

	// /setjoinroles
	setjoinroles_var_none: "Keine",
	setjoinroles_var_perm_admin: "Administrator",
	setjoinroles_var_perm_manage_guild: "Server verwalten",
	setjoinroles_var_perm_manage_role: "Rollen verwalten",
	setjoinroles_var_perm_use_mention:
		"@everyone @here verwenden und Rollen pingen",
	setjoinroles_var_perm_ban_members: "Mitglieder bannen",
	setjoinroles_var_perm_kick_members: "Mitglieder kicken",
	setjoinroles_var_perm_manage_webhooks: "Webhooks verwalten",
	setjoinroles_var_perm_manage_channels: "Kanäle verwalten",
	setjoinroles_var_perm_manage_expression:
		"Emojis, Sticker und Soundboards verwalten",
	setjoinroles_var_perm_view_monetization_analytics:
		"Ersteller-Monetarisierung und -Analytik anzeigen",
	setjoinroles_var_perm_issue:
		"Ich habe keine Berechtigung, Rollen zu verwalten.",
	setjoinroles_var_timesup: "Zeit für die Rollenauswahl abgelaufen.",
	setjoinroles_warn_dangerous_perm:
		"Die folgenden Rollen haben gefährliche Berechtigungen. Möchten Sie sie wirklich zuweisen?",
	setjoinroles_warn_title: "Warnung!",
	setjoinroles_timesup_button: "Zeit abgelaufen!",
	setjoinroles_action_canceled: "Aktion abgebrochen",
	setjoinroles_too_highter_roles:
		"Die folgenden Rollen haben eine höhere Position als ich.",
	setjoinroles_not_admin:
		":x: | Sie müssen Administrator dieses Servers sein, um diesen Befehl zu verwenden!",
	setjoinroles_help_embed_title: "Beitrittsrollenmodul",
	setjoinroles_help_embed_description:
		"Tässä ovat kaikki roolit, jotka annan uudelle jäsenelle.",
	setjoinroles_help_embed_fields_1_name: "Kaikki rekisteröidyt roolit",
	setjoinroles_logs_embed_title_on_enable: "Liittymisroolien lokit",
	setjoinroles_logs_embed_description_on_enable:
		"<@${authorId}> määritteli liittymisroolit!",
	setjoinroles_already_on_enable:
		"Liittymisroolit on jo määritetty tällä roolilla!",

	// /welcomer
	welcomer_panel_title: "Willkommen",
	welcomer_section_placeholder: "Wähle aus, was du konfigurieren möchtest",
	welcomer_section_channels: "Kanäle",
	welcomer_embed_label: "Benutzerdefiniertes Embed",
	welcomer_text_label: "Text",
	welcomer_embed_set_button: "Embed festlegen",
	welcomer_embed_remove_button: "Embed entfernen",
	welcomer_embed_modal_title: "Embed festlegen",
	welcomer_embed_modal_label: "Embed-ID (aus dem Embed-Builder)",
	welcomer_embed_not_found:
		"Kein gespeichertes Embed mit der ID `${embed_id}` gefunden. Erstelle zuerst eines mit dem Embed-Builder.",
	welcomer_embed_set_ok:
		"Das benutzerdefinierte Embed `${embed_id}` wird jetzt für dieses Ereignis gesendet. Variablen wie {memberMention} werden automatisch ersetzt.",
	welcomer_embed_removed_ok:
		"Benutzerdefiniertes Embed entfernt. Zurück zur Standardkarte.",
	welcomer_text_enable_button: "Text aktivieren",
	welcomer_text_disable_button: "Text deaktivieren",
	welcomer_components_enable_button: "Components aktivieren",
	welcomer_components_disable_button: "Components deaktivieren",
	welcomer_render_mode_label: "Darstellungsmodus",
	welcomer_render_mode_components: "Components (Karte)",
	welcomer_render_mode_simple: "Einfache Nachricht",

	// /setleavemessage
	setleavemessage_not_admin:
		":x: | Sie müssen ein Administrator dieses Servers sein, um diesen Befehl auszuführen!",
	setleavemessage_help_embed_title: "/setleavemessage Hilfe!",
	setleavemessage_help_embed_description:
		"/setleavemessage <Einschalten / Ausschalten / Anzeigen der festgelegten Nachricht> <Austrittsnachricht>",
	setleavemessage_help_embed_fields_name: "Wie verwendet man?",
	setleavemessage_help_embed_fields_value:
		"Verwenden Sie ```/setleavemessage <Einschalten / Ausschalten / Anzeigen der festgelegten Nachricht> <Nachricht>```\n{user} = Benutzername des Mitglieds\n{membercount} = Anzahl der Mitglieder im Server\n{guild} = Der Name des Servers",
	setleavemessage_logs_embed_title_on_enable: "SetLeaveMessage-Protokolle",
	setleavemessage_logs_embed_description_on_enable:
		"<@${authorId}> hat die Austrittsnachricht festgelegt!",
	setleavemessage_command_work_on_enable:
		"${emoji_Yes} | Benutzerdefinierte Austrittsnachricht erfolgreich festgelegt.",
	setleavemessage_logs_embed_title_on_disable: "SetLeaveMessage-Protokolle",
	setleavemessage_logs_embed_description_on_disable:
		"<@${authorId}> hat die Austrittsnachricht gelöscht!",
	setleavemessage_command_work_on_disable:
		"${emoji_Yes} | Benutzerdefinierte Austrittsnachricht erfolgreich gelöscht.",
	setleavemessage_command_work_ls: "Die Austrittsnachricht lautet:",
	setleavemessage_awaiting_response:
		"Schreiben Sie die Hinterlassensnachricht",

	// /setup
	setup_not_admin:
		":x: | Sie müssen ein Administrator dieses Servers sein, um diesen Befehl auszuführen!",
	setup_command_work: "${emoji_Yes} | Kanal-Einrichtung",
	setup_command_error:
		"Der Bot hat bereits die Protokollkanäle eingerichtet! Oder der Bot hat keine Berechtigung ...",

	// /setlogschannel
	setlogschannel_not_admin:
		":x: | Du musst ein Administrator dieses Servers sein, um diesen Befehl auszuführen!",
	setlogschannel_not_specified_args:
		"Du musst einen gültigen Kanal für dein Modul angeben.",
	setlogschannel_confirmation_message:
		"${emoji_Yes} | Hier ist jetzt für `${typeOfLogs}` eingerichtet von <@${authorId}> !",
	setlogschannel_already_this_channel:
		"Dieser Server hat bereits diesen Kanal für Logs!",
	setlogschannel_already_deleted:
		"Dieser Server hat bereits keinen `SERVER_LOGS` mehr!",
	setlogschannel_command_error: "Fehler bei der Ausführung des Befehls?",
	setlogschannel_command_work:
		"Du hast erfolgreich `${typeOfLogs}` in <#${argsidId}> eingerichtet!",
	setlogschannel_utils_command_work:
		"Du hast erfolgreich `${typeOfLogs}` in ${argsidId} eingerichtet!",
	setlogschannel_command_work_on_delete:
		"Du hast erfolgreich alle `SERVER_LOGS` in **${guildName}** gelöscht!",
	setlogschannel_logs_embed_title: "Setze ServerLogs",
	setlogschannel_logs_embed_description_on_enable:
		"<@${authorId}> hat `${typeOfLogs}` zu <#${argsidId}> gesetzt",
	setlogschannel_logs_embed_title_on_off: "Setze ServerLogs",
	setlogschannel_logs_embed_description_on_off:
		"<@${authorId}> hat alle `SERVER_LOGS` in der Gilde gelöscht!",
	setlogschannel_var_roles: "Rollenprotokolle",
	setlogschannel_var_mods: "Moderationsprotokolle",
	setlogschannel_var_voice: "Sprachprotokolle",
	setlogschannel_var_msg: "Nachrichtenprotokolle",
	setlogschannel_var_boost: "Boost-Protokolle",
	setlogschannel_var_tickets: "Ticketprotokolle",
	setlogschannel_var_antispam: "AntiSpam-Protokolle",
	setlogschannel_var_channel: "Kanalprotokolle",
	setlogschannel_var_confession: "Beichtprotokolle",
	setlogschannel_all_already_exist:
		"Alle Log-Kanäle sind bereits konfiguriert!",
	setlogschannel_var_economy: "Wirtschaftsprotokolle",

	// /join-ghostping add
	joinghostping_add_already_set:
		"Der Kanal ${channel} ist bereits festgelegt!",
	joinghostping_add_sent_to_channel:
		"Ab jetzt, wenn ein Mitglied dem Server beitritt, sende ich hier eine Geistermeldung.",
	joinghostping_add_ok_embed_title: "Join GhostPing Modul",
	joinghostping_add_ok_embed_desc:
		"Ich werde jetzt immer eine Geistermeldung in diesem Kanal senden, wenn ein Mitglied dem Server beitritt!",
	joinghostping_add_ok_embed_fields_name: "Alle registrierten Kanäle",
	joinghostping_add_logs_embed_title: "Join GhostPing Protokolle",
	joinghostping_add_logs_embed_desc:
		"${author} hat ${channel} zum Join GhostPing Modul hinzugefügt!",

	// /join-ghostping remove
	joinghostping_remove_isnt_set: "Der Kanal ${channel} ist nicht festgelegt!",
	joinghostping_remove_ok_embed_desc:
		"Die Kanäle wurden aus dem Join GhostPing Modul entfernt!",
	joinghostping_remove_logs_embed_desc:
		"${author} hat ${channel} aus dem Join GhostPing Modul entfernt!",

	// /automod
	automod_panel_title: "AutoMod-Steuerpult",
	automod_panel_desc:
		"Konfiguriere jede iHorizon-AutoMod-Regel: aktiviere oder deaktiviere sie, lege ihren Log-Kanal fest und wähle die Rollen aus, die sie umgehen dürfen.",
	automod_panel_overview_title: "Geschützte Regeln",
	automod_panel_select_placeholder: "Wähle eine Regel zum Konfigurieren",
	automod_panel_label_logs: "Log-Kanal",
	automod_panel_label_bypass: "Bypass-Rollen",
	automod_panel_label_mention_limit: "Erwähnungslimit",
	automod_panel_rule_spam_name: "Nachrichten-Spam",
	automod_panel_rule_spam_desc:
		"Blockiert Flood und wiederholte Nachrichten auf dem Server.",
	automod_panel_rule_mass_mention_name: "Massenerwähnungen",
	automod_panel_rule_mass_mention_desc:
		"Blockiert Nachrichten mit einer übermäßigen Anzahl an Erwähnungen.",
	automod_panel_rule_antipub_name: "Links & Werbung",
	automod_panel_rule_antipub_desc:
		"Blockiert Werbelinks, mit einer sicheren Whitelist (GitHub, Tenor, YouTube, ...).",
	automod_panel_rule_media_name: "Discord-Einladungen",
	automod_panel_rule_media_desc:
		"Blockiert Discord-Server-Einladungslinks in Nachrichten.",
	automod_panel_rule_telegram_name: "Telegram-Links",
	automod_panel_rule_telegram_desc:
		"Blockiert Telegram-Links (t.me, telegram.me, tg://...).",
	automod_panel_logs_placeholder:
		"Wähle den Kanal, der die Logs dieser Regel erhält",
	automod_panel_bypass_placeholder:
		"Wähle die Rollen, die diese Regel umgehen",
	automod_panel_enable_button: "Aktivieren",
	automod_panel_disable_button: "Deaktivieren",
	automod_panel_back_button: "Zurück",
	automod_panel_refresh_button: "Aktualisieren",
	automod_panel_close_button: "Panel schließen",
	automod_panel_rule_enabled: "Die Regel **${rule}** ist jetzt aktiviert!",
	automod_panel_rule_disabled: "Die Regel **${rule}** ist jetzt deaktiviert!",
	automod_panel_bypass_saved:
		"Die Bypass-Rollen von **${rule}** wurden aktualisiert!",
	automod_panel_logs_saved:
		"Die Logs von **${rule}** werden jetzt in ${channel} gesendet.",
	automod_panel_logs_reset: "Der Log-Kanal von **${rule}** wurde entfernt!",
	automod_panel_api_error:
		"Ich konnte diese Änderung nicht anwenden. Stelle sicher, dass ich die Berechtigung `Server verwalten` habe und die Standard-AutoMod-Regeln von Discord deaktiviert sind, und versuche es erneut.",

	// /guildconfig block too-new-account
	too_new_account_dont_specified_time_on_enable:
		"Sie haben keine Zeit angegeben. Um dieses Modul zu aktivieren, ist ein Mindestalter des Kontos erforderlich!",
	too_new_account_invalid_time_on_enable:
		"Die eingegebene Zeit ist nicht gültig! **Beispiel für gültige Zeit**: `3h; 30m; 4w; 4y` -> 3 Stunden; 30 Minuten; 4 Wochen; 4 Jahre",
	too_new_account_logEmbed_title: "TooNewAccount Modul",
	too_new_account_logEmbed_desc_on_enable:
		"${author} hat das TooNewAccount-Modul aktiviert. Konten müssen nun mindestens ${beautifulTime} alt sein, und wenn ein Benutzer mehr als `${maxJoin}` Mal beitritt, wird er gebannt.",
	too_new_account_command_work_on_enable:
		"${author}, neue Mitglieder, die **${guildName}** beitreten, deren Konten jünger als `${beautifulTime}` sind, werden jetzt entfernt.",
	too_new_account_command_work_on_enable2:
		"\n-#  ${emoji_Sparkles} Nachdem das Konto dem Server **`${maxJoin}`** Mal beigetreten ist, wird es gebannt.",
	too_new_account_logEmbed_desc_on_disable:
		"${author} hat das Modul deaktiviert!",
	too_new_account_command_work_on_disable:
		"${author}, das Modul wurde erfolgreich deaktiviert. Neue Mitgliedskonten werden nicht mehr überprüft.",

	// /guildconfig set-bot footer-name
	guildconfig_setbot_footername_footer_too_long_msg:
		"Der Bot-Fußzeile ist zu lang, es wird zu hässlich, um angezeigt zu werden.",
	guildconfig_setbot_footername_is_good:
		"Erfolgreich geändert, alle iHorizon-Einbettungen werden `${footerName}` als Fußzeile verwenden!",
	guildconfig_setbot_footername_is_reset:
		"Der Fußzeilentext wurde gelöscht. Jetzt verwenden alle iHorizon-Einbettungen den `Namen des Bots`.",
	guildconfig_setbot_footername_not_found:
		"Der Fußzeilentext wurde nicht gefunden. Bitte versuchen Sie es erneut!",

	// /guildconfig set-bot footer-pfp
	guildconfig_setbot_footeravatar_is_good:
		"Erfolgreich geändert, alle Einbettungen von iHorizon verwenden `image` als Fußzeile!",
	guildconfig_setbot_footeravatar_incorect:
		"Die Datei entspricht keinem Bild. Bitte versuchen Sie es erneut mit einem Bild.",
	guildconfig_setbot_footeravatar_is_reset:
		"Das Fußzeilenbild wurde gelöscht. Jetzt verwenden alle iHorizon-Einbettungen den `Avatar des Bots`.",

	// /guildconfig set-bot prefix
	guildconfig_setbot_prefix_prefix_now_mention:
		"Das Bot-Präfix für Befehle ist jetzt Erwähnung! `@Ping-Me`",
	guildconfig_setbot_prefix_prefix_specify_prefix:
		"Sie müssen das Bot-Präfix angeben.",
	guildconfig_setbot_prefix_prefix_too_long:
		"Das Bot-Präfix ist zu lang, es wird zu schwierig zu verwenden.",
	guildconfig_setbot_prefix_prefix_is_good:
		"Das Bot-Präfix wurde erfolgreich geändert, jetzt sind Befehle mit: `${formatedPrefix}` nutzbar.",

	// /guildconfig config save
	guildconfig_config_save_check_dm:
		"Bitte schaue in deine DM. Wenn du die Nachricht nicht erhalten hast, überprüfe bitte, ob du DMs akzeptierst.",
	guildconfig_config_save_user_msg:
		"Dies ist das Backup der Konfigurationen von `${guildName}`!",
	guildconfig_config_save_user_msg_2:
		"Hier ist der Link zum Herunterladen des Server-Backups!\n",

	// /guildconfig config restore
	guildconfig_config_restore_err_msg:
		"Es gab einen Fehler beim Herunterladen der Datei.",
	guildconfig_config_restore_msg:
		"Die Daten wurden in meiner Datenbank gespeichert.",

	// /perm add
	perm_add_args_error:
		"Sie haben die zu ändernden Befehle oder die zu setzende Berechtigung nicht angegeben.",

	// /perm list
	perm_list_embed_title: "Berechtigungen aller Benutzer:",
	perm_list_unknown_user: "Unbekannter Benutzer (ID: ${userId})",
	perm_list_no_user: "Benutzer nicht gefunden",
	var_command: "Befehl",
	var_subcommand: "Unterbefehl",
	var_subcommand_group: "Unterbefehl-Gruppe",
	var_unreachable_command: "Befehl nicht gefunden",
	perm_list_no_command_set:
		"Es gibt keine Befehle mit spezifischen Berechtigungen in diesem Server!",

	// /perm set
	perm_set_deleted: "${user} hat seine Berechtigung **gelöscht**!",
	perm_set_ok: "${user} hat seine Berechtigung auf **`${perm}`** geändert",
	perm_set_warn_message:
		"${author}, du kannst keine Berechtigungen vergeben, die höher oder gleich deinen eigenen sind!",
	perm_set_chng_perm_lvl: "Berechtigungsstufe geändert",
	perm_set_add_role: "Rolle hinzugefügt",
	perm_set_add_usr: "Benutzer hinzugefügt",
	perm_rmv_role: "Rolle entfernt",
	perm_rmv_usr: "Benutzer entfernt",
	perm_set_command_reset: "Dieser Befehl wurde zurückgesetzt",
	perm_set_no_modified: "Keine Berechtigung geändert",
	perm_command_delete_dont_exist:
		"Für den angegebenen Befehl sind keine Berechtigungen festgelegt.",
	perm_command_delete_command_deleted:
		"Berechtigungen für Befehl gelöscht: `${commands}`",
	perm_command_delete_specify_command:
		"Sie müssen einen Befehl angeben, um dessen Berechtigungen zu löschen.",
	perm_command_delete_all_one:
		"Sie müssen eine Option angeben, um eine Berechtigung zu löschen.",
	perm_command_delete_all_one_option:
		"Sie können nur eine Option angeben, um eine Berechtigung zu löschen.",
	perm_command_delete_all_zero_change:
		"Der von Ihnen angegebene Berechtigungstyp wurde in keinem Befehl verwendet.",
	perm_command_delete_all_command_ok:
		"\nErfolgreich **${changeCount}** verschachtelte `${type}`-Berechtigungen (${value}) aus der Datenbank gelöscht.",
	commandlimit_current_value: "${count} Nutzung(en) pro ${time}",
	commandlimit_invalid_value:
		"Die für das Befehlslimit angegebenen Werte sind ungültig.",
	commandlimit_missing_command: "Du musst einen Befehl angeben.",
	commandlimit_set_success:
		"Das Limit für `${command}` wurde auf `${limit}` gesetzt.",
	commandlimit_reset_success:
		"Das Limit für `${command}` wurde zurückgesetzt.",
	commandlimit_reset_missing: "Für `${command}` ist kein Limit konfiguriert.",
	commandlimit_list_title: "Konfigurierte Befehlslimits",
	commandlimit_list_item: "- `${command}`: ${limit}",
	commandlimit_list_empty:
		"In diesem Server ist kein Befehlslimit konfiguriert.",
	commandlimit_rate_limited:
		"Du hast das Limit für diesen Befehl erreicht. Versuche es in ${time} erneut.",

	// /perm roles
	perm_roles_created_role: "Folgende Rollen wurden erstellt: ${roles}",
	perm_roles_already_upate:
		"Alle Rollen existieren bereits und sind auf dem neuesten Stand.",
	perm_roles_error:
		"Bei der Erstellung oder Aktualisierung der Rollen ist ein Fehler aufgetreten.",
	perm_roles_not_owner:
		"Nur der Serverbesitzer kann Berechtigungsstufen-Rollen hinzufügen.",

	// /perm edit-roles
	perm_edit_roles_command_ok:
		"Die Berechtigung ${permName} wurde auf die Rolle ${strRole} geändert",

	// /toggle-react
	toggle_react_command_work:
		"<@${authorId}>, jetzt wenn ein Mitglied eine Begrüßungsnachricht sendet, wird der Bot **{activeMsg}**",
	toggle_react_doesnt_react: "nicht mehr reagieren",
	toggle_react_react: "reagieren",

	// /remove-react
	remove_react_command_work:
		"<@${authorId}>, jetzt wenn ein Mitglied `${message}` sendet, wird der Bot **nicht mehr reagieren**.",

	// /add-react
	add_react_command_err_emojis:
		"Das Emoji `{emoji}` für die Reaktion ist kein gültiges Emoji!",
	add_react_command_err_message:
		"Du musst die Nachricht angeben, die die Reaktion auslösen soll!",
	add_react_command_work:
		"<@${authorId}>, jetzt wenn ein Mitglied `${message}` sendet, wird der Bot **mit {emoji} reagieren**.",

	// /list-react
	list_react_nothing_found:
		"Keine Daten gefunden, bitte füge erst welche hinzu.",
	list_react_embed_msg:
		"Wenn jemand **`${key}`** sendet, werde ich **mit ${value} reagieren**.\n",

	// /autoreact
	autoreact_embed_title: "Autoreact-Konfiguration",
	autoreact_embed_desc:
		"Wenn eine neue Nachricht im angegebenen Kanal gesendet wird, reagiert der Bot mit den angegebenen Emojis.",
	autoreact_embed_autofields_value: "Reaktion: ${reaction}",
	autoreact_embed_autofields_none_value:
		"Keine Autoreact-Konfiguration festgelegt.",
	autoreact_embed_footer:
		"Seite ${currentPage} von ${totalPage} • Gesamtreaktionen: ${totalReact}",
	autoreact_btn_add_name: "Kanal hinzufügen",
	autoreact_btn_remove_name: "Kanal entfernen",
	autoreact_max_25:
		"Maximal 25 Autoreact-Konfigurationen können festgelegt werden.",
	autoreact_menu_add_place: "Wählen Sie einen Kanal zum Hinzufügen",
	autoreact_awaiting1_msg:
		"Bitte wählen Sie einen Kanal, den Sie zum Autoreact-Modul hinzufügen möchten.",
	autoreact_modal_title: "Autoreact-Konfiguration",
	autoreact_modal_fields1_label: "Die Reaktion (Emoji)",
	autoreact_invalid_emoji:
		"Ungültiges Emoji. Bitte geben Sie ein gültiges Emoji ein.",
	autoreact_add_command_ok: "Die Autoreact-Konfiguration wurde festgelegt.",
	autoreact_remove_not_found: "Keine Autoreact-Konfigurationen festgelegt.",
	autoreact_menu_remove_place: "Wählen Sie einen Kanal zum Entfernen",
	autoreact_awaiting_remove_msg:
		"Bitte wählen Sie einen Kanal, den Sie aus dem Autoreact-Modul entfernen möchten.",
	autoreact_remove_command_ok:
		"Die Autoreact-Konfiguration für diesen Kanal wurde entfernt.",

	// Member Count commands
	// /setmembercount

	// /setmembercount
	setmembercount_not_admin:
		":x: | Sie müssen ein Administrator dieses Servers sein, um diesen Befehl auszuführen!",
	setmembercount_helpembed_title: "Set MemberCount Hilfe!",
	setmembercount_helpembed_description:
		"/membercount <Aktivieren / Deaktivieren> <Kanalname>",
	setmembercount_helpembed_fields_name: "Wie benutzt man es?",
	setmembercount_helpembed_fields_value:
		"{MemberCount} = Anzahl der Mitglieder auf dem Server\n{RolesCount} = Anzahl der Rollen\n{BotCount} = Anzahl der Bots auf dem Server\n{ChannelCount} = Anzahl der Kanäle auf dem Server\n{BoostCount} = Anzahl der Server-Boosts\n{VoiceCount} = Gesamtzahl der Mitglieder in Sprachkanälen auf dem Server\n{OnlineCount} = Gesamtzahl der online Mitglieder auf dem Server",
	setmembercount_logs_embed_title_on_enable: "Set MemberCount Logs",
	setmembercount_logs_embed_description_on_enable:
		"<@${authorId}> hat den MemberCount von <#${channelId}> auf `${messagei}` gesetzt!",
	setmembercount_command_work_on_enable:
		"${emoji_Yes} | MemberCount erfolgreich eingerichtet.",
	setmembercount_command_work_on_disable:
		"${emoji_Yes} | MemberCount erfolgreich entfernt.",
	setmembercount_logs_embed_title_on_disable: "Set MemberCount Logs",
	setmembercount_logs_embed_description_on_disable:
		"<@${authorId}> hat den MemberCount dieser Gilde entfernt!",

	// Music commands
	// /p, /loop, /nowplaying, /pause, /resume, /skip, /stop, /queue, /shuffle

	music_cannot:
		"${emoji_No} Du musst im selben Sprachkanal wie ich sein, um diesen Befehl zu verwenden!",

	// /p
	p_not_in_voice_channel:
		"Sie müssen mit einem Sprachkanal verbunden sein, um diesen Befehl zu verwenden!",
	p_embed_title: "Keine Ergebnisse",
	p_not_allowed:
		"Der von Ihnen gesendete Link wird von diesem Bot nicht unterstützt. Bitte verwenden Sie autorisierte Musik-Streaming-Dienste wie Deezer, Spotify, Soundcloud usw.",
	p_attachment_too_large:
		"${emoji_No} Die angehängte Datei überschreitet das 10MB-Limit und kann nicht gelesen werden.",

	// /loop
	loop_no_queue: "Es gibt keine Warteschlange!",
	loop_command_work: "{mode} | Loop-Modus aktualisiert",

	// /nowplaying
	nowplaying_no_queue: "Es wird gerade nichts abgespielt",
	nowplaying_message_embed_title: "Jetzt wird abgespielt",
	nowplaying_resume_button: "${author} **setzt** die Musik fort!",
	nowplaying_pause_button: "${author} **pausiert** die Musik!",
	nowplaying_lyrics_button:
		"Die Liedtexte für dieses Lied wurden nicht gefunden",
	nowplaying_stop_buttom: "${author} **stoppt** die Musik!",
	nowplaying_header: "Läuft gerade in ${channel}",
	nowplaying_requested_by: "Gewünscht von ${user}",
	nowplaying_paused: "Pausiert",
	nowplaying_live: "Livestream",
	nowplaying_volume: "Lautstärke ${volume}%",
	nowplaying_loop_off: "Wiederholung aus",
	nowplaying_loop_track: "Titel wiederholen",
	nowplaying_loop_queue: "Warteschlange wiederholen",
	nowplaying_queue_count: "${count} in der Warteschlange",
	nowplaying_up_next: "Als Nächstes: ${track}",
	nowplaying_queue_end: "Letzter Titel der Warteschlange",
	nowplaying_ended: "Dieser Titel wird nicht mehr abgespielt.",
	nowplaying_button_pause: "Pause",
	nowplaying_button_resume: "Fortsetzen",
	nowplaying_button_skip: "Überspringen",
	nowplaying_button_stop: "Stoppen",
	nowplaying_button_lyrics: "Songtext",
	nowplaying_button_open: "Öffnen",
	nowplaying_skip_button: "${author} hat den Titel **übersprungen**!",
	nowplaying_loop_button:
		"${author} hat den Wiederholungsmodus geändert: **${mode}**",

	// /pause
	pause_no_queue:
		"${emoji_Warning_Icon} - Sie befinden sich nicht in einem Sprachkanal!",
	pause_nothing_playing: "Es wird nichts abgespielt",
	pause_var_paused: "pausiert",
	pause_var_err: "ein Fehler ist aufgetreten",

	// /resume
	resume_nothing_playing: "Es wird nichts abgespielt",
	resume_command_work: "wurde erfolgreich fortgesetzt",

	// /skip
	skip_not_in_voice_channel:
		"${emoji_Warning_Icon} - Sie befinden sich nicht in einem Sprachkanal!",
	skip_nothing_playing: "Es wird nichts abgespielt",
	skip_command_work: "{queue} wurde übersprungen",

	// /stop
	stop_nothing_playing: "Es wird nichts abgespielt",
	stop_command_work: "Warteschlange gestoppt",

	// /queue
	queue_iam_not_voicec: "Ich bin nicht in einem Sprachkanal",
	queue_no_queue: "Es gibt keine Warteschlange",
	queue_empty_queue: "Es gibt keine weiteren Titel in der Warteschlange",
	queue_embed_title: "Warteschlange der Titel",
	queue_embed_description_empty:
		"**Keine weiteren Titel in der Warteschlange**",
	queue_embed_footer_text: "Seite {index} | Insgesamt {track} Titel",

	// /shuffle
	shuffle_no_queue: "Ich bin nicht in einem Sprachkanal",
	shuffle_no_enought:
		"Es gibt nicht genug Titel in der Warteschlange, um zu **mischen**",
	shuffle_command_work: "Ich habe die Warteschlange **gemischt**",

	// /music history
	history_no_entries: "Es gibt keinen Eintrag in diesem Wettbewerb.",
	history_embed_title: "Musikgeschichte von ${guildName} | Seite ${page}",
	history_embed_footer_text: "iHorizon | Seite ${page}/${pageCount}",
	history_delete_embed_title: "✅ Verlauf gelöscht",
	history_delete_embed_desc: "Der Musikverlauf wurde erfolgreich gelöscht.",

	// /music lyrics
	lyrics_embed_title_unknown: "Unbekannter Titel",
	lyrics_embed_author_name_unknown: "Unbekannter Autor",
	lyrics_not_found: "Keine Liedtexte gefunden",

	// /music clear-queue
	clear_queue_command_ok:
		"${emoji_Security} | Die Musikwarteschlange auf diesem Discord-Server wurde geleert.",

	// /music trackinfo
	music_requested_by: "Anfordert von",
	music_visit_here: "Klicken hier",
	music_lyrics: "Liedtexte",
	music_link_here: "Klicken hier: [Klicken hier]({link})",

	music_volume_command_ok:
		"${emoji_Yes} **Lautstärke auf** `${query}`% **gesetzt**",

	// Giveaway commands
	// /end, /start, /reroll

	// /end
	end_not_admin:
		"Sie müssen die Berechtigung haben, Nachrichten zu verwalten, um dieses Giveaway zu beenden.",
	end_not_find_giveaway: "Konnte kein Giveaway für `${gw}` finden.",
	end_confirmation_message:
		"Das Giveaway endet in weniger als (${timeEstimate}) Sekunden...",
	end_logs_embed_title: "Giveaway-Logs",
	end_logs_embed_description:
		"<@${authorId}> hat Giveaways mit dieser ID beendet: ${messageId}",
	end_command_error: "Dieses Giveaway ist bereits beendet!",

	// /start
	start_not_perm:
		"Sie müssen die Berechtigung haben, Nachrichten zu verwalten, um Giveaways zu starten.",
	start_is_not_valid: "Sie müssen eine gültige Anzahl von Gewinnern angeben!",
	start_confirmation_command: "Giveaway gestartet in ${giveawayChannel}!",
	start_logs_embed_title: "Giveaway-Logs",
	start_logs_embed_description:
		"<@${authorId}> hat ein Giveaway gestartet in: ${giveawayChannel}",
	start_time_not_valid:
		"${author}, die von Ihnen angegebene Dauer des Giveaways ist ungültig, bitte versuchen Sie es erneut!",
	start_invalid_invites_req_value:
		"${emoji_No} | Der Wert für 'Einladungen' ist ungültig! Es muss eine Anzahl angegeben werden, z.B. X Einladungen, um am Giveaway teilzunehmen!",
	start_invalid_messages_req_value:
		"${emoji_No} | Der Wert für 'Nachrichten' ist ungültig! Es muss eine Anzahl angegeben werden, z.B. X Nachrichten, um am Giveaway teilzunehmen!",
	start_invalid_roles_req_value:
		"${emoji_No} | Die Rolle für den Wert 'Rollen' wurde nicht gefunden! Eine Rollen-ID muss angegeben werden, um am Giveaway teilzunehmen!",

	// /reroll
	reroll_not_perm:
		"Sie müssen die Berechtigung haben, Nachrichten zu verwalten, um dieses Giveaway erneut auszulosen.",
	reroll_dont_find_giveaway: "Konnte kein Giveaway für `{args}` finden.",
	reroll_command_work: "Giveaway erneut ausgelost!",
	reroll_logs_embed_title: "Giveaway-Logs",
	reroll_logs_embed_description:
		"<@${authorId}> hat Giveaways mit dieser ID erneut ausgelost: ${messageId}",
	reroll_command_error: "Fehler!",
	reroll_giveaway_not_over: "Dieses Gewinnspiel ist noch nicht beendet!",

	// /get-all
	gw_getall_embed_title: "Liste der Giveaway(s) für ${guildName}",
	gw_getall_embed_fields:
		"${Channel} [Hier ansehen](${MessageURL}) \n**Läuft ab in** ${ExpireIn}",

	// /get-data
	gw_getdata_embed_title: "Informationen zum Giveaway!",
	gw_getdata_embed_fields_channel: "Kanal",
	gw_getdata_embed_fields_amountWinner: "Gewinneranzahl",
	gw_getdata_embed_fields_value_amountWinner: "`${winnerCount}` Gewinner",
	gw_getdata_embed_fields_prize: "Preis",
	gw_getdata_embed_fields_value_prize: "`${prize}`",
	gw_getdata_embed_fields_hostedBy: "Veranstaltet von",
	gw_getdata_embed_fields_isEnded: "Ist beendet?",
	gw_getdata_embed_fields_isValid: "Ist gültig?",
	gw_getdata_embed_fields_time: "Endet um",
	gw_getdata_embed_fields_entriesAmount: "Anzahl der Einträge",
	gw_getdata_embed_fields_winners: "Gewinner",
	gw_getdata_embed_fields_value_entriesAmount:
		"**${entries}** (Verwende `/gw list-entries giveaway-id:${giveawayId}` für weitere Informationen)",
	gw_getdata_yes: "`Ja`",
	gw_getdata_no: "`Nein`",
	gw_doesnt_exit:
		"Die Werbegeschenke sind nicht erreichbar oder existieren nicht.",

	// /go
	gw_go_panel_title: "Giveaway-Panel",
	gw_go_panel_desc:
		"Bereite unten dein Giveaway vor und starte es. Nutze die Menüs, um jede Einstellung zu ändern.",
	gw_go_select_placeholder: "Einstellung bearbeiten",
	gw_go_opt_prize: "Preis",
	gw_go_opt_duration: "Dauer",
	gw_go_opt_winners: "Gewinner",
	gw_go_opt_requirement: "Teilnahmevoraussetzung",
	gw_go_opt_image: "Vorschaubild",
	gw_go_channel_placeholder: "Giveaway-Kanal",
	gw_go_launch_buttontitle: "Starten",
	gw_go_cancel_buttontitle: "Abbrechen",
	gw_go_req_none: "Keine",
	gw_go_req_invites: "Einladungen",
	gw_go_req_messages: "Nachrichten",
	gw_go_req_roles: "Rollen",
	gw_go_req_value_dsc: "Erforderlicher Wert: **${value}**",
	gw_go_started: "Das Giveaway wurde in ${channel} gestartet!",
	gw_go_cancelled: "Panel geschlossen, es wurde nichts gestartet.",
	gw_go_expired:
		"Das Panel ist abgelaufen, bevor das Giveaway gestartet wurde.",
	gw_go_need_prize:
		"${emoji_No} | Du musst einen Preis festlegen, bevor du das Giveaway startest!",
	gw_go_need_duration:
		"${emoji_No} | Du musst eine gültige Dauer festlegen, bevor du das Giveaway startest!",
	gw_go_need_winners:
		"${emoji_No} | Du musst eine gültige Gewinneranzahl festlegen, bevor du das Giveaway startest!",
	gw_go_channel_error:
		"${emoji_No} | Der ausgewählte Kanal kann keine Nachrichten empfangen!",
	gw_go_invalid_image: "${emoji_No} | Diese Bild-URL ist ungültig!",
	gw_go_modal_prize: "Preis festlegen",
	gw_go_modal_prize_label: "Preis",
	gw_go_modal_duration: "Dauer festlegen",
	gw_go_modal_duration_label: "Dauer (zum Beispiel: 2d oder 12h30)",
	gw_go_modal_winners: "Gewinneranzahl festlegen",
	gw_go_modal_winners_label: "Anzahl der Gewinner",
	gw_go_modal_req_title: "Teilnahmevoraussetzung",
	gw_go_modal_req_type_label: "Voraussetzungstyp",
	gw_go_modal_req_value_label: "Voraussetzungswert (Rollen-ID oder Zahl)",
	gw_go_modal_image: "Vorschaubild festlegen",
	gw_go_modal_image_label: "Bild-URL",

	// Moderation commands
	// /ban, /kick, /clear, /lock, /unlock, /avatar, /lockall,
	// /unban, /tempmute, /unmute

	// /avatar
	avatar_embed_description: "Schau dir diesen erstaunlichen Avatar an! :D",
	avatar_embed_title: "__**Avatar**__: `${mentionedUserUsername}`",

	// /ban
	ban_not_permission:
		"${emoji_No} | Sie haben keine Berechtigung, Mitglieder zu bannen.",
	ban_dont_found_member: "🔍 | Dieses Mitglied konnte nicht gefunden werden",
	ban_dont_have_perm_myself:
		"${emoji_No} | Ich habe keine Berechtigung, Mitglieder zu bannen!",
	ban_try_to_ban_yourself:
		"${emoji_No} | Sie können sich nicht selbst bannen!",
	ban_attempt_ban_higter_member:
		"${emoji_Stop} Sie können Benutzer mit höherer Rolle als Sie nicht bannen...",
	ban_cant_ban_member: "${emoji_No} | Ich kann dieses Mitglied nicht bannen",
	ban_message_to_the_banned_member:
		"Du wurdest von diesem Server gebannt: `${guildName}` aus folgendem Grund: **`${reason}`**",
	ban_command_work: "<@${memberId}> gebannt von <@${authorId}>",
	ban_logs_embed_title: "Ban-Logs",
	ban_logs_embed_description: "<@${memberId}> gebannt von <@${authorId}>",

	// /kick
	kick_not_permission:
		"${emoji_No} | Sie haben keine Berechtigung, Mitglieder zu kicken.",
	kick_dont_have_permission:
		"${emoji_No} | Ich habe keine Berechtigung, Mitglieder zu kicken!",
	kick_attempt_kick_your_self:
		"${emoji_No} | Sie können sich nicht selbst kicken!",
	kick_attempt_kick_higter_member:
		"${emoji_Stop} Sie können Benutzer mit höherer Rolle als Sie nicht kicken...",
	kick_message_to_the_banned_member:
		"Sie wurden von diesem Server gekickt: **${guildName}** von `${authorUsername}`",
	kick_command_work: "${member} gekickt von ${author}",
	kick_logs_embed_title: "Kick-Logs",
	kick_logs_embed_description: "${member} gekickt von <@${authorId}>",

	// /clear
	clear_dont_have_permission:
		"${emoji_No} | Sie haben keine Berechtigung `MANAGE_MESSAGES`.",
	clear_max_message_limit:
		"${emoji_No} | Ich kann nicht mehr als 99 Nachrichten auf einmal löschen!",
	clear_channel_message_deleted: "${messageCount} Nachrichten gelöscht!",
	clear_confirmation_message: "${messageCount} Nachrichten wurden gelöscht!",
	clear_logs_embed_title: "Löschen von Nachrichten-Logs",
	clear_logs_embed_description:
		"<@${authorId}> hat ${messageCount} Nachrichten in <#${channelId}> gelöscht",
	clear_command_no_message: "Keine Nachrichten zum Löschen in diesem Kanal",

	// /lock
	lock_embed_message_description:
		"Der Kanal wurde von <@${authorId}> gesperrt.",
	lock_dont_have_permission:
		"${emoji_No} | Du hast keine Berechtigung, Kanäle zu sperren.",
	lock_logs_embed_title: "Sperrprotokoll",
	lock_logs_embed_description: "<@${authorId}> hat <#${channelId}> gesperrt.",

	// /unlock
	unlock_embed_message_description: "Der Kanal wurde erfolgreich entsperrt!",
	unlock_dont_have_permission:
		"${emoji_No} | Du hast keine Berechtigung, Kanäle zu entsperren.",
	unlock_logs_embed_title: "Entsperrprotokoll",
	unlock_logs_embed_description:
		"<@${authorId}> hat <#${channelId}> entsperrt.",

	// /lockall
	lockall_dont_have_permission:
		"${emoji_No} | Du hast keine Berechtigung, alle Kanäle zu sperren.",
	lockall_embed_message_description:
		"Alle Kanäle wurden von <@${authorId}> gesperrt.",
	lockall_logs_embed_title: "Sperrprotokoll für alle Kanäle",
	lockall_logs_embed_description: "<@${authorId}> hat alle Kanäle gesperrt!",

	// /unlockall
	unlockall_embed_message_description:
		"Alle Kanäle wurden von <@${authorId}> entsperrt.",
	unlockall_logs_embed_title: "Entsperrprotokoll für alle Kanäle",
	unlockall_logs_embed_description:
		"<@${authorId}> hat alle Kanäle entsperrt!",

	// /unban
	unban_dont_have_permission:
		"${emoji_No} | Du hast keine Berechtigung, Mitglieder zu entbannen.",
	unban_bot_dont_have_permission:
		"${emoji_No} | Ich habe keine Berechtigung dazu.",
	unban_there_is_nobody_banned:
		"${emoji_No} | **Es gibt niemanden, der von diesem Server verbannt wurde!**",
	unban_the_member_is_not_banned:
		"${emoji_No} | **Die angegebene ID ist von diesem Server nicht verbannt!**",
	unban_is_now_unbanned: "<@${userID}> wurde von diesem Server entbannt!",
	unban_logs_embed_title: "Entbannungsprotokoll",
	unban_logs_embed_description:
		"<@${userID}> wurde von <@${authorId}> von diesem Server entbannt!",
	unban_reason: "Es wurde keine Begründung angegeben.",

	// /tempmute
	tempmute_dont_have_permission:
		"${emoji_No} | Du hast keine Berechtigung, Mitglieder zu temporär stummschalten.",
	tempmute_i_dont_have_permission:
		"${emoji_No} | Ich habe keine Berechtigung.",
	tempmute_cannot_mute_yourself:
		"${emoji_No} | Du kannst dich nicht selbst stummschalten!",
	tempmute_already_muted: "Dieser Benutzer ist bereits stummgeschaltet!",
	tempmute_command_work:
		"<@${tomuteId}> wurde für ${duration} stummgeschaltet\n**Grund**: `${reason}`",
	tempmute_unmuted_by_time: "<@${tomuteId}> wurde wieder freigeschaltet!",
	tempmute_logs_embed_title: "Tempmute-Protokolle",
	tempmute_logs_embed_description:
		"<@${authorId}> stummschaltete <@${tomuteId}> für ${duration}\n**Grund**: `${reason}`",
	tempmute_reason_create_roles:
		"Erstellen von temporären stummschaltbaren Rollen!",
	tempmute_tomute_is_admin:
		"${emoji_No} | Der Benutzer hat Administratorrechte, ich kann ihn nicht stummschalten.",
	tempmute_tomute_highest_role_or_same:
		"${emoji_No} | **Meine Rolle auf diesem Server ist niedriger oder gleich ${tomute}. Ich kann dieses Mitglied nicht moderieren.**",
	tempmute_cannot_mute_higher_role:
		"${emoji_No} | **${tomute}'s role is higher than or equal to yours. You cannot timeout this member.**",
	tempmute_tomute_max_time_passed:
		"\n-# ${emoji_VC_OpenChat} Discord hat ein Limit von 28 Tagen für einen Mute. Ich habe 28 Tage angewendet.",

	// /temprole
	temprole_dont_have_permission:
		"${emoji_No} | Du hast keine Berechtigung, temporäre Rollen hinzuzufügen.",
	temprole_i_dont_have_permission:
		"${emoji_No} | Ich habe keine Berechtigung.",
	temprole_cannot_add_yourself:
		"${emoji_No} | Du kannst dir selbst keine temporäre Rolle geben!",
	temprole_already_has_role:
		"Dieser Benutzer hat diese temporäre Rolle bereits!",
	temprole_command_work:
		"<@${tomuteId}> hat die Rolle für ${duration} erhalten\n**Grund**: `${reason}`",
	temprole_removed_by_time:
		"Die temporäre Rolle von <@${tomuteId}> wurde entfernt!",
	temprole_logs_embed_title: "Temporäre Rollen Logs",
	temprole_logs_embed_description:
		"<@${authorId}> hat <@${tomuteId}> eine temporäre Rolle für ${duration} vergeben\n**Grund**: `${reason}`",
	temprole_tomute_is_admin:
		"${emoji_No} | Der Benutzer hat Administratorrechte, ich kann ihm keine temporäre Rolle geben.",
	temprole_tomute_highest_role_or_same:
		"${emoji_No} | **Meine Rolle auf diesem Server ist niedriger oder gleich wie ${tomute}. Ich kann dieses Mitglied nicht moderieren.**",
	temprole_tomute_max_time_passed:
		"\n-# ${emoji_VC_OpenChat} Die maximale Dauer für eine temporäre Rolle beträgt 1 Jahr. Ich habe 1 Jahr angewendet.",

	// /unmute
	unmute_dont_have_permission:
		"${emoji_No} | Du hast keine Berechtigung, Mitglieder temporär zu entstummschalten.",
	unmute_attempt_mute_your_self:
		"${emoji_No} | Du kannst dich nicht selbst stummschalten!",
	unmute_i_dont_have_permission: "${emoji_No} | Ich habe keine Berechtigung.",
	unmute_not_muted: "Dieser Benutzer ist nicht stummgeschaltet!",
	unmute_muted_role_doesnt_exist:
		"Die Rolle `stummgeschaltet` existiert nicht. Bitte stummschalten Sie den Benutzer **vor** der Erstellung der stummschaltbaren Rollen...",
	unmute_command_work: "<@${tomuteId}> wurde entstummschaltet!",
	unmute_logs_embed_title: "Entstummschaltungs-Protokolle",
	unmute_logs_embed_description:
		"<@${authorId}> entstummschaltet <@${tomuteId}>",
	unmuteall_no_muted_members:
		"Es wurden keine stummgeschalteten Mitglieder gefunden.",
	unmuteall_audit_reason: "Alle entstummen",
	unmuteall_command_work: "${unmuted}/${total} Mitglieder wurden entstummt.",
	unmuteall_logs_embed_title: "Protokolle für globale Entstummung",
	unmuteall_logs_embed_description:
		"<@${authorId}> hat ${unmuted}/${total} Mitglieder entstummt.",

	// /warn
	warn_command_work:
		"${emoji_Yes} ${member} wurde verwarnt! **Grund**: `${reason}`\n__Verwarnungs-ID__: `${warnId}`",
	warn_logEmbed_title: "Verwarnungsprotokolle",
	warn_logEmbed_desc: "${author} hat ${member} verwarnt wegen `${reason}`",
	warn_dont_have_permission:
		"${emoji_No} | Sie haben keine Berechtigung, ein Mitglied auf diesem Discord-Server zu verwarnen.",

	// /unwarn
	unwarn_cannot_found:
		"${emoji_No} ${member} scheint keine Verwarnungen in meiner Datenbank zu haben!",
	unwarn_cannot_found_id:
		"${emoji_No} ${member} die von dir angegebene Verwarnungs-ID ist nicht in meiner Datenbank",
	unwarn_command_ok:
		"${emoji_Yes} Die Verwarnung von ${member} wurde aufgehoben!",
	unwarn_logEmbed_title: "Protokolle aufgehobener Verwarnungen",
	unwarn_logEmbed_desc:
		"${author} hat die Verwarnung von ${member} aufgehoben",
	unwarn_dont_have_permission:
		"${emoji_No} | Sie haben keine Berechtigung, eine Verwarnung eines Mitglieds auf diesem Discord-Server zu entfernen.",

	// /clear-allwarns
	clear_allwarns_confirmation_message:
		"**Sind Sie wirklich sicher, dass Sie alle Verwarnungsdaten löschen möchten? Diese Aktion ist permanent und kann nicht rückgängig gemacht werden.** **Diese Aktion ist zerstörerisch!!**",
	clear_allwarns_command_ok:
		"Alle Verwarnungen auf diesem Discord-Server wurden gelöscht.",

	// /warnlist
	warnlist_no_data:
		"${emoji_No} ${member} scheint keine Verwarnungen in meiner Datenbank zu haben!",
	warnlist_embed_desc:
		"### ID: ${id} - ${date}\n> Autor: <@${authorID}>\n> Grund: `${reason}`",
	warnlist_embed_title:
		"Verwarnungsliste von ${memberGlobalName} | Seite ${page}",
	warnlist_dont_have_permission:
		"${emoji_No} | Sie haben keine Berechtigung, die Verwarnungen von Mitgliedern auf diesem Discord-Server zu verwalten.",

	// /baninfo
	baninfo_not_banned: "Benutzer ist nicht gebannt",
	baninfo_ban_info: "Bann-Informationen",
	baninfo_user_not_found: "Benutzer nicht gefunden",
	var_banned_by: "Gebannt von",
	var_ban_date: "Bann-Datum",

	// /warnungen-löschen
	clearwarn_command_ok:
		"${emoji_Yes} ${author}, **`${allWarnCount}`** Verwarnung(en) von ${member} wurde(n) gelöscht.",

	// /tempban
	tempban_dont_have_permission:
		"Du hast keine Berechtigung, Mitglieder temporär zu bannen.",
	tempban_i_dont_have_permission:
		"Ich habe keine Berechtigung, Mitglieder zu bannen.",
	tempban_cannot_ban_yourself: "Du kannst dich nicht selbst bannen!",
	tempban_already_banned: "Dieser Benutzer ist bereits temporär gebannt!",
	tempban_command_work:
		"**<@${userId}>** wurde für **${duration}** temporär gebannt\n**Grund**: `${reason}`",
	tempban_unbanned_by_time: "**<@${userId}>** wurde entbannt!",
	tempban_logs_embed_title: "Temporäre Bannprotokolle",
	tempban_logs_embed_description:
		"**<@${executorId}>** hat **<@${userId}>** für **${duration}** temporär gebannt\n**Grund**: `${reason}`",
	tempban_user_is_admin:
		"Der Benutzer hat Administratorrechte, ich kann ihn nicht bannen.",
	tempban_user_highest_role_or_same:
		"Meine Rolle auf diesem Server ist niedriger oder gleich **user_mention**. Ich kann dieses Mitglied nicht moderieren.",
	tempban_max_time_passed:
		"\n*Die maximale Zeit für einen temporären Bann beträgt 1 Jahr. Ich habe 1 Jahr angewendet.*",
	tempban_user_not_in_guild:
		"Dieser Benutzer ist nicht auf dem Server, kann aber trotzdem gebannt werden.",

	// Backup-Befehle
	// /backup

	// /backup
	backup_wait_please: "⏲ Bitte warten...",
	backup_not_admin:
		":x: | Du musst ein Administrator dieses Servers sein, um ein Backup anzufordern!",
	backup_i_dont_have_permission:
		"Ich habe keine Berechtigung `ADMINISTRATOR`",
	backup_command_work_on_creation:
		":white_check_mark: Backup erfolgreich erstellt.",
	backup_command_work_info_on_creation:
		"Das Backup wurde erstellt! ID: `${id}`!",
	backup_logs_embed_title_on_creation: "Backup-Protokolle",
	backup_logs_embed_description_on_creation:
		"<@${authorId}> Backup erstellen!",
	backup_dont_have_perm_on_load:
		":x: | Du musst ein Administrator dieses Servers sein, um ein Backup zu laden!",
	backup_i_dont_have_perm_on_load:
		"Ich habe keine Berechtigung `ADMINISTRATOR`",
	backup_unvalid_id_on_load: ":x: | Du musst eine gültige Backup-ID angeben!",
	backup_waiting_on_load: "${emoji_Yes} - Laden...",
	backup_error_on_load:
		":x: | Entschuldigung, ein Fehler ist aufgetreten... Bitte überprüfe, ob ich Administratorberechtigungen habe!",
	backup_error_when_fetch_backup_on_load:
		":x: | Kein Backup für ${backupID} gefunden!",
	backup_this_is_not_your_backup:
		"${emoji_No} | Dies ist nicht Ihre Sicherungskopie!",
	backup_backup_doesnt_exist: "FEHLER? Sicherungskopie existiert nicht.",
	backup_string_see_v:
		":placard:・Anzahl der Kategorien: `${categoryCount}`\n:hash:・Anzahl der Kanäle: `${channelCount}`",
	backup_all_of_your_backup: "**Alle Ihre Sicherungskopien:**",
	backup_string_see_another_v:
		":placard:・Anzahl der Kategorien: `${categoryCount}`\n:hash:・Anzahl der Kanäle: `${channelCount}`",
	backup_load_confirm:
		"${author},\n# EXTREM GEFÄHRLICHE AKTION\n# Sind Sie sicher, dass Sie dieses Backup laden möchten?\nDies wird alle aktuellen Kanäle, Rollen, Emojis, Bannungen, Konfigurationen... Ihres Servers ersetzen.\nDIESE AKTION IST NICHT UMKEHRBAR!",
	backup_not_load:
		"Das Backup wurde nicht geladen, die Aktion wurde auf Ihren Wunsch hin abgebrochen.",

	// /backup delete
	backup_really_want:
		"${emoji_Warning_Icon} Möchten Sie wirklich dieses Backup löschen?",
	backup_confirm_button: "Ja, dieses Backup löschen",
	backup_cancel_button: "Aktion abbrechen",
	backup_embed_title_succefully_deleted:
		"${emoji_Yes} Das Backup wurde erfolgreich gelöscht!",
	backup_embed_title_cancel_deletion:
		"${emoji_Yes} Das Backup wurde behalten!",
	backup_embed_title_timesup_deletion:
		"${emoji_No} Die Zeit ist abgelaufen. Das Backup wurde behalten!",

	// /backup manage
	backup_manage_nique_tes_mort:
		"Zugriff verweigert. Dieser Befehl ist nur dem Serverbesitzer vorbehalten.\n# Sie können den Backup-Schutz nicht deaktivieren, um die Serversicherheit zu gefährden.\n# Jeder Missbrauchsversuch wird gemeldet und blockiert.",
	backup_manage_admin: "alle Administratoren",
	backup_manage_owner: "Serverbesitzer",
	backup_manage_command_ok:
		"Das Backup-Modul wurde aktualisiert. Ab sofort kann ${allowed_user_string} Backups auf diesem Server erstellen oder laden.",

	// Role Reactions
	// /reactionroles

	// /reactionroles
	reactionroles_dont_admin_added:
		":x: | Sie müssen ein Administrator dieses Servers sein, um diesen Befehl auszuführen!",
	reactionroles_embed_message_description_added:
		"__Wie man benutzt?__\n/rolesreaction add `<message id>` `<reaction>` `<rolesid>`\n/rolesreaction remove `<message id>` `<reaction>`\n/rolesreaction list `<message id>`",
	reactionroles_missing_reaction_added: "Fehlendes Argument: Reaktionsemote",
	reactionroles_invalid_emote_format_added:
		"${emoji_No} | Sie können mir kein `CUSTOM_EMOJI` im Format `<::xxx>` senden! Ich brauche nur deren ID!",
	reactionroles_logs_embed_title_added: "ReactionRoles-Protokolle",
	reactionroles_logs_embed_description_added:
		"<@${authorId}> hat eine Reaktionsrolle festgelegt: Nachricht: `${messagei}` | Reaktion: `${reaction}` | Rolle: ${role}",
	reactionroles_command_work_added:
		"${reaction} wurde der Nachricht von ${messagei} hinzugefügt, um ${role} zu geben",
	reactionroles_missing_remove: "Fehlendes Argument: Reaktionsemote",
	reactionroles_missing_reaction_remove:
		"Reaktionsrolle nicht in meiner Datenbank gefunden...",
	reactionroles_cant_fetched_reaction_remove:
		"Kann die Zielreaktion in dieser Nachricht nicht abrufen!",
	reactionroles_logs_embed_title_remove: "ReactionRoles-Protokolle",
	reactionroles_logs_embed_description_remove:
		"<@${authorId}> hat eine Reaktionsrolle gelöscht: Nachricht: `${messagei}` | Reaktion: `${reaction}`",
	reactionroles_command_work_remove:
		"${reaction} wurde aus der Nachricht von ${messagei} gelöscht",
	reactionroles_dont_message_found:
		"Ich kann die Nachricht mit der aktuellen Nachrichten-ID nicht abrufen, oder das Emoji, das Sie ausgewählt haben, befindet sich nicht auf einem Server, auf dem ich bin!",

	// /buttonreaction
	buttonreaction_logs_embed_title_added: "ButtonReaction Protokolle",
	buttonreaction_logs_embed_description_added:
		"<@${authorId}> hat eine Reaktion mit dem Button gesetzt: Nachricht: `${messagei}` | Reaktion: `${reaction}` | Rolle: ${role}",
	buttonreaction_dont_message_found:
		"Kann diesen Button nicht hinzufügen, die Rollen scheinen bereits in einem bestehenden Button gesetzt zu sein!",
	buttonreaction_roles_not_found:
		"Fehlende Argumente: Du hast die Rollen, die gesetzt werden sollen, nicht angegeben!",
	buttonreaction_message_other_user_error:
		"In Discord kann der Bot die Komponenten einer Nachricht eines anderen Benutzers nicht ändern. Du musst eine von mir gesendete Nachricht wählen. Tipp: Mach `/utils embed`, um dein eigenes schönes Embed zu erstellen!",

	// /roleselect
	roleselect_invalid_message_id:
		"Ungültige Nachrichten-ID. Bitte geben Sie eine gültige Nachrichten-ID an.",
	roleselect_message_not_found:
		"Nachricht im angegebenen Kanal nicht gefunden.",
	roleselect_default_placeholder: "Konfigurierte Rollen auswählen",
	roleselect_menu1_placeholder: "Aktion auswählen",
	roleselect_menu1_add: "Rollenauswahl hinzufügen",
	roleselect_menu1_remove: "Rollenauswahl entfernen",
	roleselect_menu1_change_placeholder: "Auswahlmenü-Platzhalter ändern",
	roleselect_menu1_save: "Konfiguration speichern und anwenden",
	roleselect_menu1_cancel: "Abbrechen",
	roleselect_menu1_embed_title: "Rollenauswahl-Konfiguration",
	roleselect_menu1_embed_description:
		"Wenn Benutzer Felder im Auswahlmenü auswählen, erhalten sie die angegebene Rolle",
	roleselect_modal1_title: "Rollenauswahl hinzufügen",
	roleselect_modal1_fields1_label: "Emoji",
	roleselect_modal1_fields1_placeholder:
		"Emoji für Rollenauswahl wählen (optional)",
	roleselect_modal1_fields2_label: "Optionsname",
	roleselect_modal1_fields2_placeholder: "Kurzer Name für Rollenauswahl",
	roleselect_modal1_fields3_label: "Beschreibung",
	roleselect_modal1_fields3_placeholder:
		"Rollenauswahl beschreiben (optional)",
	roleselect_awaiting1_msg: "Wählen Sie eine Rolle für diese Option",
	roleselect_awaiting1_menu_placeholder: "Rolle auswählen",
	roleselect_role_already_exist:
		"Rolle existiert bereits in der Konfiguration.",
	roleselect_no_role_found: "Keine Rollenoptionen zum Entfernen.",
	roleselect_all_role_removed: "Alle Rollenoptionen wurden entfernt.",
	roleselect_last_role_removed: "Letzte Rolleoption erfolgreich entfernt.",
	roleselect_save_command_ok:
		"Rollenauswahl-Konfiguration erfolgreich gespeichert!",
	roleselect_failed_to_save_config:
		"Speichern der Konfiguration fehlgeschlagen. Bitte versuchen Sie es erneut.",
	roleselect_canceled_command_ok: "Rollenauswahl-Konfiguration abgebrochen.",
	roleselect_modal2_title: "Auswahlmenü-Platzhalter",
	roleselect_modal2_label: "Platzhalter",
	roleselect_modal2_placeholder: "Auswahlmenü-Platzhalter",

	// Neue Funktionenbefehle
	// /punishpub, /report, /support

	// /punishpub
	punishpub_not_admin:
		":x: | Sie müssen ein Administrator dieses Servers sein, um diesen Befehl auszuführen!",
	punishpub_too_hight_enable:
		"Ihr Betrag ist zu hoch! Es wird nicht empfohlen!",
	punishpub_negative_number_enable:
		"Sie können keine negative Zahl eingeben!",
	punishpub_zero_number_enable: "Die Zahl 0 ist nicht möglich!",
	punishpub_confirmation_message_enable:
		"Sie haben PunishPub erfolgreich mit einer maximalen Flaggenanzahl von **${amount}** und einer Bestrafung von **${punishement}** aktiviert!",
	punishpub_logs_embed_title: "PunishPub-Protokolle",
	punishpub_logs_embed_description:
		"<@${authorId}> hat PunishPub auf **An** mit einer Höchstzahl von ${amount} Flaggen und einer Bestrafung von ${punishement} gesetzt!",
	punishpub_confirmation_disable:
		"Sie haben PunishPub erfolgreich deaktiviert",
	punishpub_logs_embed_title_disable: "PunishPub-Protokolle",
	punishpub_logs_embed_description_disable:
		"<@${authorId}> hat PunishPub deaktiviert!",

	// /report
	report_cooldown_command:
		"Entschuldigung, Sie müssen **${time}** warten, bevor Sie diesen Befehl ausführen!",
	report_owner_need:
		":x: | **Sie müssen der Besitzer des Servers sein, um diesen Befehl ausführen zu können!**",
	report_specify:
		"Bitte spezifiziere den Fehler, bitte mache einen guten Satz!",
	report_command_work: "**Vielen Dank für das Einreichen des Fehlers!**",

	// /support
	support_not_admin:
		":x: | Du musst ein Administrator dieses Servers sein, um diesen Befehl auszuführen!",
	support_command_work:
		"Du hast das Support-Modul für **${guildName}** eingerichtet. Wenn ein Benutzer dies im Profil hat:\n**${input}**.\nSoll ich die <@&${rolesId}>-Rolle an sie vergeben!",
	support_command_work_on_disable:
		"Du hast das Support-Modul für **${guildName}** eingerichtet. Jetzt kann niemand eine Rolle haben!",
	support_command_not_role: ":x: | Du hast die Rolle nicht angegeben!",
	support_command_not_type:
		":x: | Du hast nicht angegeben, welche Art von Support du im Benutzerprofil möchtest (bio = die Bio, z. B. Serverlink; tag = der Discord-Tag des Servers)!",
	support_command_guild_not_have_tag:
		":x: | Der Server hat aktuell keine Tags.",
	support_command_work_2:
		"Du hast das Support-Modul für ${guildName} konfiguriert.\nWenn ein Benutzer den Server-Tag setzt,\nwerde ich ihm die Rolle <@&${rolesId}> zuweisen!",

	// /setserverlang

	updates_embed_title: "iHorizon Updates",
	updates_embed_description:
		"Hier sind die neuesten Änderungen und Updates für iHorizon.",
	updates_field_version: "Version",
	updates_field_commit: "Letzter Commit",
	updates_field_branch: "Branch",
	updates_field_links: "Links",
	updates_changelog_attached:
		"Das vollständige Changelog ist als PDF beigefügt.",
	newsletter_dm_title: "iHorizon {version} - Release Notes",
	newsletter_dm_body:
		"Hallo {owner},\n\nEine neue Major-Version von iHorizon wurde bereitgestellt.\n\n**Version**: {version}\n**Release**: {releaseUrl}\n\nDas vollständige Changelog ist als PDF beigefügt.\n\nBrauchst du Hilfe? Tritt unserem Support-Server bei: https://discord.gg/ihorizon\n-# Nutze +updates oder den Button unten um dein Abo zu verwalten.",
	newsletter_btn_unsubscribe: "Unsubscribe from newsletter",
	newsletter_btn_subscribe: "Subscribe to newsletter",
	newsletter_not_owner:
		"Ahah, freut mich zu sehen, dass du meine Code-Änderungen in Echtzeit verfolgen willst :3\n\n**Aber hey, du musst mich zuerst auf einen Discord-Server hinzufügen:**\n\n<https://discord.com/oauth2/authorize?client_id=${clientId}>\n**So halte ich dich auf dem Laufenden.**\n\n> Alternative: Tritt discord.gg/ihorizon bei. Meine Gründerinnen pingen den Changelog bei jedem Update. Deine Wahl :3",
	newsletter_toggle_enabled: "Newsletter notifications enabled.",
	newsletter_toggle_disabled: "Newsletter notifications disabled.",
	setserverlang_not_admin:
		":x: | Du musst ein Administrator dieses Servers sein, um diesen Befehl auszuführen!",
	setserverlang_logs_embed_title_on_enable: "SetServerLang Logs",
	setserverlang_logs_embed_description_on_enable:
		"<@${authorId}> hat die Sprache von iHorizon auf **${type}** geändert!",
	setserverlang_already: "Ich bin bereits auf dieser Sprache!",
	setserverlang_command_work_enable:
		"Meine Sprache ist jetzt auf **${type}**",
	setserverlang_panel_title: "Sprachauswahl",
	setserverlang_panel_description:
		"Wähle die Sprache, die iHorizon auf diesem Server verwenden soll.",
	setserverlang_panel_current: "Aktuelle Sprache",
	setserverlang_panel_select: "Sprache wählen...",
	setserverlang_panel_saved: "Die Sprache wurde erfolgreich geändert!",
	setserverlang_command_error_enable: "Fehler!",

	// /embed
	embed_placeholder_string_select_menu_builder: "Was möchtest du tun?",
	embed_placeholder_option_copy_embed: "Einbettung kopieren",
	embed_placeholder_option_edit_title: "Titel bearbeiten",
	embed_placeholder_option_delete_title: "Titel löschen",
	embed_placeholder_option_edit_description: "Beschreibung bearbeiten",
	embed_placeholder_option_delete_description: "Beschreibung löschen",
	embed_placeholder_option_edit_author: "Autor bearbeiten",
	embed_placeholder_option_delete_author: "Autor löschen",
	embed_placeholde_option_change_footer_image: "Footer-Symbol ändern",
	embed_placeholder_option_edit_footer: "Fußzeile bearbeiten",
	embed_placeholder_option_delete_footer: "Fußzeile löschen",
	embed_placeholder_option_edit_thumbnail: "Miniaturbild bearbeiten",
	embed_placeholder_option_edit_image: "Bild bearbeiten",
	embed_placeholder_option_edit_titleurl: "URL des Titels bearbeiten",
	embed_placeholder_option_edit_color: "Farbe bearbeiten",
	embed_placeholder_option_delete_color: "Farbe löschen",
	embed_btn_save: "Einbettung speichern",
	embed_btn_send: "Einbettung senden",
	embed_btn_cancel: "Abbrechen",
	embed_interaction_not_for_you: "Diese Interaktion ist nicht für dich",
	embed_first_message: "Was möchtest du tun?",
	embed_save_message:
		"<@${authorId}>, **Du hast die Einbettungskonfiguration erfolgreich gespeichert!**```Embed-ID: ${embedId}```",
	embed_cancel_message:
		"<@${authorId}>, **Du hast die Einbettungskonfiguration abgebrochen!**",
	embed_send_message:
		"<@${authorId}>, **In welchen Kanal soll ich diese Einbettung senden?**",
	embed_timeout_getbtn:
		"<@${authorId}>, **Du hast zu lange gebraucht, um zu antworten. Ich breche die laufende Operation ab!**",
	embed_choose_0:
		"Welche Nachricht möchtest du in deine Einbettung aufnehmen?",
	embed_choose_1: "Welchen Titel möchtest du in deine Einbettung aufnehmen?",
	embed_choose_2: "Der Titel der Einbettung wurde erfolgreich gelöscht!",
	embed_choose_3:
		"Welche Beschreibung möchtest du in deine Einbettung aufnehmen?",
	embed_choose_4:
		"Die Beschreibung der Einbettung wurde erfolgreich gelöscht!",
	embed_choose_5: "Welchen Autor möchtest du in deine Einbettung aufnehmen?",
	embed_choose_6: "Der Autor der Einbettung wurde erfolgreich gelöscht!",
	embed_choose_7:
		"Welche Fußzeile möchtest du in deine Einbettung aufnehmen?",
	embed_choose_7bis:
		"Welches Footer-Symbol möchten Sie in Ihr Embed einbinden?",
	embed_choose_8: "Die Fußzeile der Einbettung wurde erfolgreich gelöscht!",
	embed_choose_9:
		"Welches Miniaturbild möchtest du in deine Einbettung aufnehmen?",
	embed_choose_10: "Welches Bild möchtest du in deine Einbettung aufnehmen?",
	embed_choose_11:
		"Welche URL des Titels möchtest du in deine Einbettung aufnehmen?",
	embed_choose_12:
		"Welche Farbe möchtest du in deine Einbettung aufnehmen? **www.color-hex.com**",
	embed_choose_12_error:
		"${emoji_No} | Ungültige Farbe! Bitte überprüfe **www.color-hex.com**",
	embed_choose_13: "Die Farbe der Einbettung wurde erfolgreich gelöscht!",
	embed_send_embed_work:
		"<@${authorId}>, **Du hast die Einbettung erfolgreich in den Kanal <#${messageContent}> gesendet!**",
	embed_copy_bad_guild_msg:
		"Die Gilde, in der sich die Nachricht befindet, ist nicht dieselbe wie ${guildName}",
	embed_copy_bad_channel_msg:
		"Der Kanal, in dem sich die Nachricht befindet, ist nicht erreichbar!",
	embed_copy_bad_message_msg: "Die Nachricht ist nicht erreichbar!",
	embed_copy_bad_embed_message_msg: "Die Nachricht hat kein Embed!",
	embed_copy_bad_url_msg:
		"Ungültige URL, bitte erneut versuchen. Das korrekte Format ist: https://discord.com/channels/${messageGuildId}/${channelId}/${id}",
	embed_btn_replace: "Einbettung ersetzen",
	embed_replace_question_msg:
		"Was ist die neue URL der Nachricht, in der die Einbettung ersetzt werden soll?",
	embed_replace_message:
		"{user}, die neue Einbettung hat die Einbettung von {messageUrl} ersetzt.",

	// /rolesaver
	rolesaver_embed_title: "RoleSaver Modul",
	rolesaver_embed_desc:
		"Wenn Mitglieder den Server verlassen, werden ihre Rollen in der Datenbank gespeichert. Wenn sie nun wieder beitreten, gibt ihnen iHorizon ihre Rollen zurück.",
	rolesaver_embed_fields_1_name: "Aktivieren",
	rolesaver_embed_fields_2_name: "Admin-Rollen erneut vergeben",
	rolesaver_embed_fields_3_name: "Zeitüberschreitung",
	rolesaver_on_off_already_set: "Das Modul ist bereits deaktiviert!",
	rolesaver_on_off_embed_title: "RoleSaver Modul",
	rolesaver_on_off_embed_desc:
		"Wenn Mitglieder den Server verlassen, werden ihre Rollen nicht in der Datenbank gespeichert. iHorizon stellt die alten Rollen der Mitglieder nicht wieder her, wenn sie in den Server zurückkehren.",
	rolesaver_on_off_embed_fields_1_name: "Aktivieren",

	// /nigthmode
	var_nm_role_app_dont_exist:
		"${emoji_Warning_Icon} Der Bot hat keine Anwendungsrolle. Bitte fügen Sie den Bot korrekt hinzu.\n",
	var_nm_role_app_not_high:
		"${emoji_Warning_Icon} Der Bot ist nicht die höchste Rolle. Bitte setzen Sie ihn an die Spitze.\n",
	var_nm_role_app_not_admin:
		"${emoji_Warning_Icon} Die Bot-Rolle hat keine Administratorrechte.\n",
	var_nm_end_main: "Der Nachtmodus wird beendet.\n\n",
	var_nm_start_main: "Der Nachtmodus beginnt.\n\n",
	var_nm_edited_roles: "Die folgenden Rollen wurden geändert:",
	var_nm_running: "des Starts",
	var_nm_stopping: "des Stopps",
	var_nm_running2: "beginnt",
	var_nm_stopping2: "wird beendet",
	var_nm_title: "Nachtmodus",
	var_nm_ping_embed_title: "Der Nachtmodus ${type}",
	var_nm_ping_embed_fields_0_name: "Zeitbereich",
	var_nm_error_occured:
		"# Ein Problem ist beim ${type} des Nachtmodus aufgetreten.\n",
	nightmode_embed_desc:
		"# ⭐️ Nachtmodus\n> *Was ist der Nachtmodus?* Der Nachtmodus ist eine Sicherheitsfunktion **[made by iHorizon](https://www.ihorizon.org)**, die es ermöglicht, alle Administratorrechte auf einem Discord-Server für einen bestimmten Zeitraum zu deaktivieren.\n> *Beispiel: Sie sind auf einem Discord-Server mit vielen Mitarbeitern, Sie möchten nachts alle Administratorrechte entfernen, um einen Raid, einen Discord-Vanity-Snipe usw. zu vermeiden*\n> *Sie sind am richtigen Ort, mein Lieber. **iHorizon wird immer die Lösung sein.***\n\n---\n",
	nightmode_embed_fields_0_name: "Modul aktivieren",
	nightmode_embed_fields_1_name: "Server-Besitzer benachrichtigen",
	nightmode_embed_fields_2_name: "Bots degradieren?",
	nightmode_embed_fields_3_name: "Bot auf der Whitelist",
	nightmode_embed_fields_4_name: "Zeitbereich",
	nightmode_select_placeholder:
		"Konfigurieren Sie den Nachtmodus auf dem Server.",
	nightmode_select_0_label: "Nachtmodus aktivieren",
	nightmode_select_0_desc: "Nachtmodus aktivieren/deaktivieren.",
	nightmode_select_1_label: "Server-Besitzer warnen",
	nightmode_select_1_desc:
		"Den Server-Besitzer bei Aktivierung/Deaktivierung benachrichtigen",
	nightmode_select_2_label: "Zeitbereich des Nachtmodus konfigurieren",
	nightmode_select_2_desc:
		"Zeitbereich, in dem Administratorrechte automatisch entfernt werden.",
	nightmode_select_3_label: "Bots degradieren",
	nightmode_select_3_desc: "Sollen Bots nachts degradiert werden?",
	nightmode_select_4_label: "Zeitzone ändern (UTC)",
	nightmode_select_4_desc:
		"Wenn Sie eine spezifische Zeit haben, müssen Sie diese eingeben (UTC-Zahlenformat)",
	nightmode_select1_placeholder: "Bot autorisiert, nachts Admin zu sein",
	nightmode_change_timezone_question:
		"Wählen Sie die UTC für Ihren Discord-Server",
	nightmode_modal_hours_window_fields0_label:
		"Startzeit (z.B.: 21:30 oder 2130)",
	nightmode_modal_hours_window_fields1_label:
		"Endzeit (z.B.: 06:15 oder 0615)",
	nightmode_modal_hours_window_title:
		"NightMode - Zeitbereich (24h-Format mit Minuten)",
	nightmode_invalid_hour_morning:
		"${emoji_No} Die Startzeit ist ungültig. Verwenden Sie das Format: 21:30 oder 2130",
	nightmode_invalid_hour_night:
		"${emoji_No} Die Endzeit ist ungültig. Verwenden Sie das Format: 06:15 oder 0615",
	nightmode_utc_timezone_on: "UTC-Zeitzone auf",

	// /git lines
	git_lines_avoiding_spam:
		"Entschuldigung, aber um Spam zu vermeiden, begrenzen wir die Anzahl der angezeigten Zeilen auf 50",
	git_lines_avoiding_limit:
		"Entschuldigung, aber es gibt ein Limit von 2000 Zeichen auf Discord, daher konnten wir das gewünschte Snippet nicht anzeigen",
	git_lines_work: "✅ Git Lines ist jetzt aktiviert.",
	git_lines_work_disabled: "❌ Git Lines ist jetzt deaktiviert.",
	git_lines_borred_warning:
		"\n-# ${emoji_VC_OpenChat} Störe ich dich? Du kannst `/git lines` machen, um dieses Modul zu deaktivieren!",

	// /counter config
	counter_config_command_action_on:
		"${author}, du hast das Zähler-Modul auf `Eingeschaltet` gesetzt.\nFalls der Kanal nicht existiert, konfiguriere ihn mit dem Befehl: **/counter channel**.",
	counter_config_command_action_off:
		"${author}, du hast das Zähler-Modul auf `Ausgeschaltet` gesetzt.",

	// /counter channel
	counter_channel_embed_title: "Zähler-Modul hier festgelegt!",
	counter_channel_embed_desc:
		"${author} hat das Zähler-Modul hier festgelegt!\nBenutzer können jetzt hier zählen!",
	counter_channel_command_work:
		"${author}, du hast das Zähler-Modul erfolgreich auf den Kanal ${channel} gesetzt!",
	counter_channel_command_error:
		"${author}, der Befehl hat einen Fehler zurückgegeben. Bitte überprüfe, ob der angegebene Kanal existiert und ob das Zähler-Modul aktiviert ist!",

	counter_actual_number: "✨ **Aktuelle Zahl:** {number}",

	// Vorschlagsbefehle
	// /setsuggest, /suggest

	// /suggest akzeptieren
	suggest_accept_not_admin: "Sie sind kein Administrator!",
	suggest_acceptnot_good_channel:
		"Dieser Befehl muss im Kanal des Vorschlagsmoduls ausgeführt werden (<#${channel}>)!\nBitte überprüfen Sie, ob das Vorschlagsmodul nicht deaktiviert ist!",
	suggest_accept_not_found_db:
		"Der Vorschlag wurde nicht in meiner Datenbank gefunden!",
	suggest_accept_already_replied:
		"Dieser Vorschlag wurde bereits beantwortet!",
	suggest_accept_embed_fields_to_put:
		"Antwort von ${authorUsername} (Akzeptieren)",
	suggest_acceptembed_title_to_put: "[Akzeptieren] ${title}",
	suggest_accept_command_work:
		"Sie haben den Vorschlag akzeptiert!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_accept_command_error:
		"Der Vorschlag wurde nicht im Discord-Kanal gefunden!",

	// /suggest ablehnen
	suggest_deny_not_admin: "Sie sind kein Administrator!",
	suggest_deny_not_good_channel:
		"Dieser Befehl muss im Kanal des Vorschlagsmoduls ausgeführt werden (<#${channel}>)!\nBitte überprüfen Sie, ob das Vorschlagsmodul nicht deaktiviert ist!",
	suggest_deny_not_found_db:
		"Der Vorschlag wurde nicht in meiner Datenbank gefunden!",
	suggest_deny_already_replied: "Dieser Vorschlag wurde bereits beantwortet!",
	suggest_deny_embed_fields_to_put:
		"Antwort von ${authorUsername} (Abweisen)",
	suggest_deny_embed_title_to_put: "[Abweisen] ${title}",
	suggest_deny_command_work:
		"Sie haben den Vorschlag abgelehnt!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_deny_command_error:
		"Der Vorschlag wurde nicht im Discord-Kanal gefunden!",

	// /suggest antworten
	suggest_reply_not_admin: "Sie sind kein Administrator!",
	suggest_reply_not_good_channel:
		"Dieser Befehl muss im Kanal des Vorschlagsmoduls ausgeführt werden (<#${channel}>)!\nBitte überprüfen Sie, ob das Vorschlagsmodul nicht deaktiviert ist!",
	suggest_replynot_found_db:
		"Der Vorschlag wurde nicht in meiner Datenbank gefunden!",
	suggest_reply_already_replied:
		"Dieser Vorschlag wurde bereits beantwortet!",
	suggest_reply_embed_fields_to_put: "Antwort von ${authorUsername}",
	suggest_reply_embed_title_to_put: "[Beantwortet] ${title}",
	suggest_reply_command_work:
		"Sie haben eine Antwort auf den Vorschlag gesendet!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_reply_command_error:
		"Der Vorschlag wurde nicht im Discord-Kanal gefunden!",

	// /suggest löschen
	suggest_delete_not_delete: "Sie sind kein Administrator!",
	suggest_delete_not_good_channel:
		"Dieser Befehl muss im Kanal des Vorschlagsmoduls ausgeführt werden (<#${channel}>)!\nBitte überprüfen Sie, ob das Vorschlagsmodul nicht deaktiviert ist!",
	suggest_delete_not_found_db:
		"Der Vorschlag wurde nicht in meiner Datenbank gefunden!",
	suggest_delete_command_work: "Sie haben den Vorschlag gelöscht!",
	suggest_delete_command_error:
		"Der Vorschlag wurde nicht im Discord-Kanal gefunden!",

	// /setsuggest deaktivieren
	setsuggest_disable_not_admin: "Sie sind kein Administrator!",
	setsuggest_disable_pw_on:
		"${author}, Sie haben das Vorschlagsmodul aktiviert!",
	setsuggest_disable_pw_off:
		"${author}, Sie haben das Vorschlagsmodul deaktiviert!",

	// /setsuggest kanal
	setsuggest_channel_not_admin: "Sie sind kein Administrator!",
	setsuggest_channel_already_set_with_that:
		"${author}, der Kanal des Vorschlagsmoduls ist bereits auf ${channel} eingestellt!",
	setsuggest_channel_embed_title:
		"Das Vorschlagsmodul wurde hier festgelegt!",
	setsuggest_channel_embed_desc:
		"Jetzt können alle Benutzer, die hier Nachrichten senden dürfen, einfach eine Nachricht senden, um einen Vorschlag zu machen!",
	setsuggest_channel_command_work:
		"${author}, Sie haben den Kanal des Vorschlagsmoduls auf ${channel} eingestellt!",

	// Sicherheitsbefehl
	// /sicherheit

	// /sicherheit deaktivieren
	security_disable_not_admin: "Du bist kein Administrator!",
	security_disable_pw_on:
		"${author}, du hast das Sicherheitsmodul aktiviert!",
	security_disable_pw_off:
		"${author}, du hast das Sicherheitsmodul deaktiviert.",

	// /sicherheit rolle-zuweisen
	security_role_to_give_not_admin: "Du bist kein Administrator!",
	security_role_to_give_command_work:
		"${author}, du hast die Rolle ${role} für das Sicherheitsmodul festgelegt!",

	// /sicherheit kanal
	security_channel_not_admin: "Du bist kein Administrator!",
	security_channel_command_work:
		"${author}, du hast den Kanal ${channel} für das Sicherheitsmodul festgelegt!",

	// Zeitplan-Befehl
	// /zeitplan

	// /zeitplan
	schedule_menu_placeholder: "Was möchten Sie tun?",
	schedule_menu_choice_0: "Zeitplan erstellen",
	schedule_menu_choice_1: "Zeitplan löschen",
	schedule_menu_choice_2: "Alle Zeitpläne löschen",
	schedule_menu_choice_3: "Alle Zeitpläne auflisten",
	schedule_modal_title: "Zeitplan-Manager",
	schedule_modal_fields_1_label: "Der Name des Zeitplans?",
	schedule_modal_fields_2_label: "Die Beschreibung des Zeitplans?",
	schedule_delete_question:
		"Was ist die ID des Zeitplans, den Sie löschen möchten?",
	schedule_deleteall_question:
		"Sind Sie sicher, dass Sie alle Ihre Zeitpläne löschen möchten? (J/n)",
	schedule_delete_not_found:
		"Es gibt keinen ZEITPLAN (${arg0}) für dieses Mitglied!",
	schedule_delete_title_embed: "Löschen eines Zeitplans (${arg0})",
	schedule_delete_confirm: "Zeitplan gelöscht!",
	schedule_deleteall_title_embed: "Alle Zeitpläne löschen",
	schedule_deleteall_desc_embed: "Alle Ihre Zeitpläne wurden gelöscht!",
	schedule_deleteall_confirm: "Alle Ihre Zeitpläne wurden gelöscht!",
	schedule_deleteall_cancel: "Die Aktion `ALLE_LOESCHEN` wurde abgebrochen!",
	schedule_list_not_schedule: "Es gibt keinen ZEITPLAN für dieses Mitglied!",
	schedule_list_title_embed: "Auflisten aller Zeitpläne",
	schedule_list_fields_embed:
		"**Beendet am**: ${expiresAt}```${title}``````${description}```\n",
	schedule_list_content_message: "Hier ist Ihre Liste aller Zeitpläne!",
	schedule_create_title_embed: "Erstellen eines Zeitplans",
	schedule_create_when_question:
		"Wann möchten Sie über diesen Zeitplan benachrichtigt werden? (Beispiel: 6t = 6 Tage, 2s = 2 Stunden, 10m = 10 Minuten, 10s = 10 Sekunden)",
	schedule_create_not_number_time:
		"${author}, Ihre Antwort (die Zeit, zu der Sie über diesen Zeitplan benachrichtigt werden möchten) ist keine Zahl!",
	schedule_create_embed_fields_name_confirm: "Benachrichtigungsdatum",
	schedule_create_embed_title_confirm: "Zeitplan #${scheduleCode} erstellt!",
	schedule_create_confirm_msg:
		"${author}, Ihr Zeitplan wurde erstellt!\nCode: `${scheduleCode}`",

	// PFPS-Befehl
	// /pfps Kanal, /pfps deaktivieren

	// /pfps deaktivieren
	pfps_config_not_admin:
		":x: Sie haben keine Administratorberechtigungen, um diesen Befehl auszuführen",
	pfps_config_command_action_on:
		"${author}, Sie haben das PFPS-Modul aktiviert.\nWenn der Kanal nicht existiert, konfigurieren Sie ihn mit dem Befehl: **/pfps Kanal**.",
	pfps_config_command_action_off:
		"${author}, Sie haben das PFPS-Modul deaktiviert.",

	// /pfps Kanal
	pfps_channel_not_admin:
		":x: Sie haben keine Administratorberechtigungen, um diesen Befehl auszuführen",
	pfps_channel_embed_title: "PFPS-Modul hier eingestellt!",
	pfps_channel_embed_desc:
		"${author} hat das PFPS-Modul hier eingestellt!\nJetzt sendet iHorizon alle 30 Sekunden das Avatar eines zufälligen Benutzers in dieser Gilde!\nIch werde mein Bestes tun!",
	pfps_channel_command_work:
		"${author}, Sie haben das PFPS-Modul erfolgreich auf dem Kanal ${channel} eingestellt!",
	pfps_channel_command_error:
		"${author}, der Befehl hat einen Fehler zurückgegeben. Bitte überprüfen Sie, ob der angegebene Kanal existiert und das PFPP-Modul aktiviert ist!",

	// Protection Module
	// /protect, /allowlist add, /allowlist remove, /allowlist show

	// /protect panel
	authorization_actions_not_permited:
		"Nur der Besitzer des Servers kann die Autorisierungsregel für das Schutzmodul bearbeiten!",
	authorization_actions_everyone: "Jeder",
	authorization_actions_allowlist: "Mitglied(er) der Allowlist",
	authorization_actions_nobody: "Niemand. (Außer Serverbesitzer)",
	protect_panel_title: "Protect-Steuerpult",
	protect_panel_desc:
		"Konfiguriere jede Schutzregel: aktiviere oder deaktiviere sie, wähle wer sie umgehen kann und lege die Sanktion für das verantwortliche Mitglied fest.",
	protect_panel_global_label: "Globale Sanktion",
	protect_panel_global_hint: "Gilt für jede Regel ohne eigene Sanktion",
	protect_panel_select_placeholder: "Wähle eine Regel zum Konfigurieren",
	protect_panel_mode_placeholder: "Wähle, wer diese Regel umgehen kann",
	protect_panel_sanction_placeholder: "Wähle die anzuwendende Sanktion",
	protect_panel_bypass_label: "Bypass",
	protect_panel_sanction_label: "Sanktion",
	protect_panel_rule_help:
		"Wenn diese Regel ausgelöst wird, wird die Aktion automatisch rückgängig gemacht und die Sanktion auf das verantwortliche Mitglied angewendet.",
	protect_panel_enable_button: "Aktivieren",
	protect_panel_disable_button: "Deaktivieren",
	protect_panel_back_button: "Zurück",
	protect_panel_refresh_button: "Aktualisieren",
	protect_panel_close_button: "Panel schließen",
	protect_panel_rule_enabled: "Die Regel **${rule}** ist jetzt aktiviert!",
	protect_panel_rule_disabled: "Die Regel **${rule}** ist jetzt deaktiviert!",
	protect_panel_mode_saved:
		"Die Regel **${rule}** wird jetzt umgangen von: **${mode}**.",
	protect_panel_sanction_saved:
		"Die Sanktion für **${rule}** ist jetzt: **${sanction}**.",
	protect_panel_global_saved:
		"Die globale Sanktion ist jetzt: **${sanction}**.",
	protect_panel_api_error:
		"Ich konnte diese Änderung nicht anwenden. Stelle sicher, dass ich die Berechtigung `Administrator` habe, und versuche es erneut.",
	protect_panel_sanction_global: "Globaler Standard",
	protect_panel_sanction_cancel: "Nur Aktionen rückgängig machen",
	protect_panel_sanction_derank: "Rückgängig + Derank",
	protect_panel_sanction_ban: "Rückgängig + Bann",
	protect_panel_sanction_kick: "Rückgängig + Kick",
	protect_panel_sanction_mute: "Rückgängig + Mute (10 Min.)",
	protect_panel_group_server: "Server & Webhooks",
	protect_panel_group_channels: "Kanäle",
	protect_panel_group_roles: "Rollen",
	protect_panel_group_members: "Mitglieder",
	protect_panel_rule_webhook_name: "Webhooks",
	protect_panel_rule_updateguild_name: "Server-Änderungen",
	protect_panel_rule_createchannel_name: "Kanal-Erstellung",
	protect_panel_rule_updatechannel_name: "Kanal-Änderungen",
	protect_panel_rule_deletechannel_name: "Kanal-Löschung",
	protect_panel_rule_createrole_name: "Rollen-Erstellung",
	protect_panel_rule_deleterole_name: "Rollen-Löschung",
	protect_panel_rule_updaterole_name: "Rollen-Änderungen",
	protect_panel_rule_updatemember_name: "Mitglieder-Rollen-Änderungen",
	protect_panel_rule_banmembers_name: "Mitglieder bannen",
	protect_panel_rule_kickmember_name: "Mitglieder kicken",
	protect_panel_rule_unbanmembers_name: "Banns aufheben",
	protect_panel_rule_add_admin_roles_name: "Admin-Rollenvergabe",
	// /Allowlist anzeigen
	allowlist_show_not_permited:
		"Sie sind nicht berechtigt, diesen Befehl zu verwenden! Sie müssen in der Allowlist sein!",
	allowlist_show_embed_author: "Allowlist",

	// /Allowlist hinzufügen
	allowlist_add_not_permited:
		"Sie sind nicht berechtigt, diesen Befehl zu verwenden! Sie müssen in der Allowlist sein!",
	allowlist_add_not_owner:
		"Nur der Besitzer des Servers kann Benutzer zur Allowlist hinzufügen/entfernen!",
	allowlist_add_already_in:
		"Das Mitglied, das Sie von der Allowlist hinzufügen möchten, ist bereits dort!",
	allowlist_add_command_work: "${member} wurde zur Allowlist hinzugefügt!",

	// /Allowlist löschen
	allowlist_delete_not_permited:
		"Sie sind nicht berechtigt, diesen Befehl zu verwenden! Sie müssen in der Allowlist sein!",
	allowlist_delete_not_owner:
		"Nur der Besitzer des Servers kann Benutzer zur Allowlist hinzufügen/entfernen!",
	allowlist_delete_member_unreachable:
		"Das Mitglied, das Sie aus der Allowlist entfernen wollten, ist nicht erreichbar!",
	allowlist_delete_cant_remove_owner:
		"Es ist nicht möglich, den Besitzer des Servers aus der Allowlist zu entfernen!",
	allowlist_delete_isnt_in:
		"Das Mitglied, das Sie aus der Allowlist entfernen möchten, ist nicht darin!",
	allowlist_delete_command_work:
		"${member} wurde aus der Allowlist entfernt!",

	// Custom Tag Module
	// /tag create, ... delete, ... edit, ... list, ... info

	tag_name: "Tag",
	tag_embed_created_at: "Erstellt am",
	tag_embed_last_update: "Letzte Aktualisierung",
	tag_embed_last_updated_by: "Zuletzt aktualisiert von",

	// /tag create
	tag_create_not_permited:
		"Sie dürfen keinen Tag erstellen.\nSie benötigen Administratorrechte oder müssen auf der Whitelist stehen (`tag wlroles-create`).",
	tag_create_not_good_name:
		"Der Tag-Name darf keine Leerzeichen enthalten und nicht länger als 16 Zeichen sein.",
	tag_create_command_work: "Der Tag `${tag_name}` wurde erstellt.",
	tag_create_already_exist: "Der Tag existiert bereits.",
	tag_create_embed_doesnt_exist: "Der Embed existiert nicht.",

	// /tag delete
	tag_no_one_found: "Es gibt keine gespeicherten Tags in dieser Gilde!",
	tag_delete_dnt_exist: "Der Tag `${tag_name}` existiert nicht.",
	tag_delete_command_ok: "Der Tag `${tag_name}` wurde gelöscht.",

	// /tag info
	tag_doesnt_exist: "Der Tag `${tag_name}` existiert nicht!",

	// /tag wlcreate
	tag_wlcreate_embed_title: "Whitelist Erstellen - Tags",
	tag_wlcreate_embed_desc: "Alle Rollen, die Tags erstellen dürfen.",

	// /tag wluse
	tag_wluse_embed_title: "Whitelist Verwenden - Tags",
	tag_wluse_embed_desc: "Alle Rollen, die Tags verwenden dürfen.",

	// /tag list
	tag_list_no_anything: "Es gibt keine gespeicherten Tags in dieser Gilde!",

	// /tag use
	tag_use_not_allowed:
		"Sie dürfen den Tag `${tag_name}` nicht verwenden.\nSie benötigen Administratorrechte oder können den Tag-Besitzer <@${createBy}> bitten, Sie zur Whitelist hinzuzufügen (`tag wlroles-use`).",
	tag_use_command_work: "Tag `${tag_name}` wurde gesendet.",

	// /tag edit
	tag_edit_error_perm:
		"Um den Tag zu bearbeiten, benötigen Sie Administratorrechte oder müssen der Besitzer des Tags sein.",
	tag_edit_command_ok:
		"Der aktuelle Tag-Name wurde von **`${current_tag_name}`** auf **`${new_tag_name}`** geändert.",

	// TempVoice Modul
	// /text, /voice, /status, /staff

	// /voice Schnittstelle zum Einstellen des Textkanals
	tempvoice_if_text_not_admin:
		"<@${authorId}>, Sie sind nicht berechtigt, diesen Befehl zu verwenden!",
	tempvoice_if_text_desc_embed:
		"## TempVoice Schnittstelle\nDiese **Schnittstelle** kann verwendet werden, um temporäre Sprachkanäle zu verwalten.\n",
	tempvoice_if_text_fields_value_limit: "${emoji_VC_Limit} **Grenze ändern**",
	tempvoice_if_text_fields_value_name: "${emoji_VC_Name} **Namen ändern**",
	tempvoice_if_text_fields_value_region:
		"${emoji_VC_Region} **Region ändern**",
	tempvoice_if_text_fields_value_trust: "${emoji_VC_Trust} **Vertrauen**",
	tempvoice_if_text_fields_value_untrust:
		"${emoji_VC_Untrust} **Missvertrauen**",
	tempvoice_if_text_fields_value_block: "${emoji_VC_Block} **Blockieren**",
	tempvoice_if_text_fields_value_unblock: "${emoji_VC_Unblock} **Freigeben**",
	tempvoice_if_text_fields_value_claim: "${emoji_VC_Claim} **Beanspruchen**",
	tempvoice_if_text_fields_value_privacy:
		"${emoji_VC_Privacy} **Privatsphäre**",
	tempvoice_if_text_fields_value_transfer:
		"${emoji_VC_Transfer} **Übertragen**",
	tempvoice_if_text_fields_value_delete: "${emoji_VC_Delete} **Löschen**",

	// /voice Schnittstelle zum Einstellen des Sprachkanals
	tempvoice_vc_not_admin:
		"<@${authorId}>, Sie sind nicht berechtigt, diese Befehle zu verwenden!",

	// /voice Schnittstelle zum Einstellen der Staff-Rolle
	tempvoice_staff_not_admin:
		"<@${authorId}>, Sie sind nicht berechtigt, diesen Befehl zu verwenden!",
	tempvoice_staff_desc_embed:
		"## TempVoice-Personalrolle\nRollen hier können jetzt den Kanal betreten und moderieren!\n",

	// Confessionn Modul
	// /cooldown, /disable, /channel

	// /confession channel
	confession_channel_command_work:
		"Das Bekenntnispanel wurde an ${channel} gesendet",
	confession_channel_panel_embed_desc:
		"# **Anonyme Geständnisse**\n\nKlicken Sie auf die Schaltfläche unten, um das Bekenntnisformular zu öffnen. Sie können schreiben, was Sie gestehen müssen. Wenn Sie möchten, können Sie wählen, Ihr Geständnis privat zu machen.\nBeachten Sie, dass Geständnisse möglicherweise nicht anonym bleiben — Serverbesitzer oder jeder mit Zugriff auf Geständnisprotokolle kann Benutzer identifizieren, wenn das Logging aktiviert ist.\n\n## **Ein Geständnis machen**\n\n*Hinweis: Um Ihr Geständnis privat zu machen, schreiben Sie die entsprechende Option in das Formular.*",
	confession_channel_log_embed_title: "SetChannel Bekenntnismodul",
	confession_channel_log_embed_desc:
		"${author} hat den Kanal auf ${channel} gesetzt",

	// /confession cooldown
	confession_coolodwn_command_work:
		"${author}, die Abkühlzeit des Bekenntnisses ist jetzt auf **${time}** eingestellt!",
	confession_cooldown_log_embed_title: "SetCooldown Bekenntnismodul",
	confession_cooldown_log_embed_desc:
		"${author} hat die Wartezeit auf `${time}` gesetzt",

	// /confession disable
	confession_disable_command_work_on:
		"Das Bekenntnismodul ist jetzt aktiviert.",
	confession_disable_command_work_off:
		"Das Bekenntnismodul ist jetzt deaktiviert.",
	confession_log_embed_title_on_enable: "Bekenntnis Ein-/Ausschalten",
	confession_log_embed_desc_on_enable:
		"${author} hat das Bekenntnismodul aktiviert!",
	confession_log_embed_desc_on_disabled:
		"${author} hat das Bekenntnismodul deaktiviert!",

	// /confession thread
	confession_thread_enabled:
		"Von nun an erstelle ich einen Diskussionsthread unter dem Embed, wenn jemand beichtet.",
	confession_thread_disabled:
		"Ich erstelle keinen Diskussionsthread unter dem Embed.",

	// AntiSpam Modul
	// /antispam manage

	// /antispam manage
	antispam_manage_embed_title: "AntiSpam Moduleinstellungen",
	antispam_manage_choices_1_label: "Modul aktivieren",
	antispam_manage_choices_1_desc:
		"Antispam-Modul aktivieren oder deaktivieren",
	antispam_manage_choices_2_label: "Bots ignorieren",
	antispam_manage_choices_2_desc: "Spamming von Bots im Server ignorieren",
	antispam_manage_choices_3_label: "Strafart",
	antispam_manage_choices_3_desc:
		"Welche Art von Sanktion soll ich dem Benutzer geben?",
	antispam_manage_choices_4_label: "Strafdauer",
	antispam_manage_choices_4_desc: "Wie lange die Sanktion dauert",
	antispam_manage_choices_5_label: "Strafzeit-Multiplikator",
	antispam_manage_choices_5_desc:
		"Ob die Dauer der Sanktion für jede Strafe multipliziert wird",
	antispam_manage_choices_6_label: "Nachrichten entfernen",
	antispam_manage_choices_6_desc: "Die Spam-Nachricht löschen",
	antispam_manage_choices_7_label: "Maximales Nachrichtenintervall",
	antispam_manage_choices_7_desc:
		"Maximales Intervall zwischen Nachrichten, um als Spam betrachtet zu werden",
	antispam_manage_choices_8_label: "Max. doppelte Nachrichten",
	antispam_manage_choices_8_desc:
		"Anzahl maximaler doppelter Nachrichten vor Sanktion",
	antispam_manage_choices_9_label: "Max. Intervall für doppelte Nachrichten",
	antispam_manage_choices_9_desc:
		"Das Intervall zwischen doppelten Nachrichten, um den Benutzer zu markieren",
	antispam_manage_choices_10_label: "Max. ähnliche Nachrichten",
	antispam_manage_choices_10_desc:
		"Anzahl maximaler ähnlicher Nachrichten vor Sanktion",
	antispam_manage_choices_12_label: "Schwelle vor Bestrafung",
	antispam_manage_choices_12_desc: "Die maximale Schwelle vor der Bestrafung",
	antispam_manage_select_menu_punish_mute_label: "Mitglieder stummschalten",
	antispam_manage_modal_title: "AntiSpam Modal",
	antispam_manage_button_label: "Konfiguration speichern",
	antispam_manage_preset_level1_name: "Entspannter Modus",
	antispam_manage_preset_level2_name: "Wachmodus",
	antispam_manage_preset_level3_name: "Extremer Schutzmodus",
	antispam_manage_button_preset_label: "Voreinstellung laden",
	antispam_manage_selectstring_preset_label: "Voreinstellungen",

	// /antispam bypass-roles
	antispan_bypassroles_embed_desc:
		"Alle unten stehenden Rollen können das Antispam-Modul umgehen",

	// /antispam bypass-roles
	antispam_ignorechannels_embed_desc:
		"Alle Nachrichten, die in einem der unten stehenden Kanäle gesendet werden, können das Antispam-Modul umgehen.",

	// Stats Module
	// /stats ustats

	// /stats ustats
	header_h1_value: "{author_username}s Nachrichtenstatistik",
	messages_word: "Nachrichten",
	minutes_word: "Minuten",
	voice_activity: "Sprachaktivität",
	top_voice: "Top-Sprachkanäle",
	top_message: "Top-Nachrichtenkanäle",
	activity_under_30d: "Aktivität der letzten 30 Tage",
	top_messages_title: "Nachrichten-Rangliste",
	top_voice_title: "Sprachaktivitäts-Rangliste",
	stats_no_data:
		"Für diesen Server sind keine statistischen Daten verfügbar.",
	stats_compare_title: "Statistikvergleich",
	stats_compare_invalid_users:
		"Bitte geben Sie zwei gültige Benutzer zum Vergleichen an.",
	stats_compare_no_data:
		"Einer oder beide Benutzer haben keine statistischen Daten.",
	channel_stats_title: "Kanalstatistiken",
	stats_channel_invalid: "Ungültiger angegebener Kanal.",
	top_active_users_title: "Top Aktive Benutzer",
	activity_overview: "Aktivitätsübersicht",
	active_users_title: "Aktive Benutzer",
	var_members: "Mitglied(er)",
	stats_generated_on:
		"Statistiken erstellt am {date} • Bereitgestellt von IHRZ",

	// Starboard Module
	// lazy

	// /starboard channel
	starboard_channel_command_ok:
		"${emoji_Yes} | **Der Starboard-Kanal wurde auf ${channel} festgelegt.** Wenn Servermitglieder mit '⭐' auf Nachrichten reagieren und der Schwellenwert von **`${threshold}`** überschritten wird, wird die Nachricht an ${channel} gesendet!",

	// /starboard config
	starboard_config_command_ok:
		"${emoji_Yes} | **Das Starboard-Modul wurde jetzt ${action}**",

	// /starboard threshold
	starboard_threshold_command_ok:
		"${emoji_Yes} | Wenn Servermitglieder mit '⭐' reagieren und der Schwellenwert von **`${amount}`** überschritten wird, wird die Nachricht an den angegebenen Kanal gesendet!",

	// /starboard create-thread
	starboard_create_thread_command_ok:
		"${emoji_Yes} | Wenn Servermitglieder mit '⭐' reagieren und der Schwellenwert von **`${amount}`** überschritten wird, wird die Nachricht an den angegebenen Kanal gesendet **`${action}`**",
	starboard_create_thread_yes: "und ein Diskussionsthread wird erstellt",
	starboard_create_thread_no: "und es wird kein Diskussionsthread erstellt",

	// /skullboard channel
	skullboard_channel_command_ok:
		"${emoji_Yes} | **Skullboard-Kanal wurde nun festgelegt auf: ${channel}**. Jetzt, wenn Servermitglieder auf Nachrichten mit '💀' reagieren und der Schwellenwert von **`${threshold}`** überschritten wird, wird die Nachricht an ${channel} gesendet!",

	// /skullboard config
	skullboard_config_command_ok:
		"${emoji_Yes} | **Skullboard-Modul wurde nun ${action}**",

	// /skullboard threshold
	skullboard_threshold_command_ok:
		"${emoji_Yes} | Nun, wenn Servermitglieder auf Nachrichten mit '💀' reagieren und der Schwellenwert von **`${amount}`** überschritten wird, wird die Nachricht an den angegebenen Kanal gesendet!",

	// /skullboard create-thread
	skullboard_create_thread_command_ok:
		"${emoji_Yes} | Nun, wenn Servermitglieder auf Nachrichten mit '💀' reagieren und der Schwellenwert von **`${amount}`** überschritten wird, wird die Nachricht an den angegebenen Kanal **`${action}`** gesendet",

	// Benachrichtigungsmodul
	// Benachrichtigungsautor, Benachrichtigungskonfiguration

	// /notifier author add
	notifier_author_add_author_doesnt_exist:
		"Der Autor existiert nicht. Bitte überprüfe die ID.",

	// /notifier config channel
	notifier_config_channel_logsEmbed_title: "Benachrichtigungskanalmodul",
	notifier_config_channel_logsEmbed_desc:
		"<@${authorId}> hat das Benachrichtigungskanalmodul auf ${channel} gesetzt",
	notifier_config_message_command_ok:
		"Jetzt, wenn ein Streamer/YouTuber/Twitcher ein Video veröffentlicht, sende ich eine Nachricht in ${channel}",

	// /notifier config message
	notifier_config_message_helpEmbed_title:
		"Benutzerdefinierte Benachrichtigungsnachricht",
	notifier_config_message_helpEmbed_desc:
		"{artistAuthor} => Der Benutzername des Streamers/YouTubers\n{artistLink} => Der Link zum Streamer/YouTuber-Kanal\n{mediaURL} => Die Video-URL des Streamers/YouTubers",
	notifier_config_message_embed_fields_notifyMessage:
		"Benachrichtigungsnachricht",
	notifier_config_message_awaiting_response:
		"Schreibe die Benachrichtigungsnachricht.",
	notifier_config_message_command_work_on_enable:
		"${emoji_GreenTick} | Benachrichtigungsnachricht erfolgreich festgelegt.",

	// Blogger-Modul

	blogger_generateBlogsEmbed_embed_desc:
		"Liste der konfigurierten RSS-Feeds:\n\n",
	blogger_generateBlogsEmbed_embed_title: "📰 RSS-Blog-Konfiguration",
	blogger_generateConfigurationEmbed_embed_title: "📰 Blogger-Konfiguration",
	blogger_no_rss: "Keine RSS-Feeds konfiguriert.",
	blogger_generateConfigurationEmbed_embed_fields_1_name: "Status",
	blogger_generateConfigurationEmbed_embed_fields_2_name: "Gesamtblogs",
	blogger_unknown_blog: "Unbekannter Blog",
	blogger_on_new_article_default_message:
		"📰 Neuer Artikel veröffentlicht!\n**{articleTitle}** von {articleAuthor}\n{articleLink}",
	blogger_config_status_enabled:
		"✅ Das Blogger-Modul wurde **aktiviert**. RSS-Feeds werden überwacht.",
	blogger_config_status_disabled:
		"❌ Das Blogger-Modul wurde **deaktiviert**. RSS-Feeds werden nicht überwacht.",
	blogger_read_article: "Artikel lesen",
	blogger_blog_add_invalid_channel:
		"Ungültiger Kanaltyp. Bitte wähle einen Textkanal aus.",
	blogger_blog_add_success:
		"✅ RSS-Feed **${validationName}** wurde hinzugefügt! Benachrichtigungen werden an ${channel} gesendet (ID: `${blogId}`)",
	blogger_blog_add_invalid_rss:
		"❌ Der angegebene RSS-Feed ist ungültig oder nicht erreichbar. Bitte überprüfe die URL und versuche es erneut.",
	blogger_blog_remove_success:
		"✅ RSS-Feed mit der ID `${blogId}` wurde entfernt.",
	blogger_blog_remove_not_found: "❌ Kein RSS-Feed mit dieser ID gefunden.",
	lastfm_module_not_configured:
		"${emoji_No} | Das Last.fm-Modul ist auf dem Bot nicht konfiguriert. Füge `lastfm.apiKey` und `lastfm.sharedSecret` zur Konfiguration hinzu oder setze `LASTFM_API_KEY` und `LASTFM_SHARED_SECRET`.",
	lastfm_config_login_required:
		"${emoji_No} | Du musst `/lastfm login` verwenden, bevor du das Modul aktivierst.",
	lastfm_config_enabled:
		"${emoji_Yes} | Das Last.fm-Scrobbling ist jetzt für dein Konto aktiviert.",
	lastfm_config_disabled:
		"${emoji_Yes} | Das Last.fm-Scrobbling ist jetzt für dein Konto deaktiviert.",
	lastfm_login_invalid_session:
		"${emoji_No} | Last.fm hat keine gültige Sitzung zurückgegeben.",
	lastfm_login_success:
		"${emoji_Yes} | Dein Last.fm-Konto `${username}` ist jetzt verbunden und das Scrobbling wurde aktiviert.",
	lastfm_embed_title: "Last.fm-Konfiguration für ${userLabel}",
	lastfm_embed_field_status: "Status",
	lastfm_embed_field_account: "Verbundenes Konto",
	lastfm_embed_field_connected_at: "Verbunden am",
	lastfm_api_error_login:
		"${emoji_No} | Verbindung zu Last.fm fehlgeschlagen: ${error}",
	lastfm_api_error_nowplaying:
		"${emoji_No} | Last.fm konnte nicht über Now Playing benachrichtigt werden: ${error}",
	lastfm_api_error_scrobble:
		"${emoji_No} | Dieser Titel konnte nicht gescrobbelt werden: ${error}",
	lastfm_api_error_unknown: "unbekannter Fehler",

	// Module AuthRestore
	// role, set, delete, get, force-join

	rc_key_doesnt_exist:
		"${emoji_No} Das AuthRestore-Modul mit dem Schlüssel: **${secretCode}** existiert nicht!",
	rc_verify: "Verifizieren",

	// /authrestore role
	rc_role_embed_title: "AuthRestore Neue Änderung",
	rc_role_embed_field1_name: "Neue Rolle nach der Verifizierung",

	// /authrestore set
	rc_command_ok:
		'${author}, Sie haben gerade das "AuthRestore"-Modul eingerichtet. Wenn ein Discord-Server-Mitglied auf die Schaltfläche klickt und sich über OAuth2 anmeldet, wird es zur Datenbank hinzugefügt. Sie können dem Server schließlich automatisch über OAuth2 beitreten.\n# SORGFÄLTIG LESEN\nDie Nachricht ${msgLink} hat jetzt eine Schaltfläche zur Verifizierung.\nHIER IST DER PRIVATE CODE, DER AN NIEMANDEN WEITERGEGEBEN WERDEN DARF. EINE PERSON MIT DIESEM CODE KÖNNTE IHN LÖSCHEN, MITGLIEDER ZU IHREM SERVER HINZUFÜGEN... BEWAHREN SIE IHN SICHER AUF. iHorizon WIRD IHN IHNEN NIE WIEDER GEBEN:\n```${secretCode}```',
	rc_command_ok_dm:
		"# Der AuthRestore-Code für ${guildName}\n```${secretCode}```",
	rc_command_dm_failed:
		"Ich habe versucht, Ihnen den Code als private Nachricht zu senden, aber Ihre DMs sind blockiert :/",
	rc_command_dm_ok:
		"Falls Sie es verpasst haben, habe ich Ihnen den Code als private Nachricht gesendet!",
	rc_command_horizongw_down:
		"Fehler: HorizonGateway ist möglicherweise nicht verfügbar",

	// /authrestore delete
	rc_delete_config_not_found:
		"Die Modulkonfiguration auf diesem Server konnte nicht gefunden werden!",
	rc_delete_command_ok:
		'${author}, Sie haben gerade die Konfiguration des "AuthRestore"-Moduls gelöscht. Aus Sicherheitsgründen (Daten) werde ich nur die Schaltfläche löschen, aber die OAuth2-Daten und der geheime Code werden in 48 Stunden gelöscht!',

	// /authrestore get
	rc_get_mainEmbed_title: "AuthRestore Allgemeine Informationen",
	rc_get_mainEmbed_field1_name: "Server-ID",
	rc_get_mainEmbed_field2_name: "Zugewiesene Rolle nach Verifizierung",
	rc_get_mainEmbed_field3_name: "Erstellt am",
	rc_get_mainEmbed_field3_value: "*das Datum ist im Format MM/TT/JJJJ HH:mm*",
	rc_get_mainEmbed_field4_name: "Schlüssel-Nutzungszähler",
	rc_get_mainEmbed_field5_name: "Konfigurationsautor",
	rc_get_secondEmbed_title: "Gespeicherte Benutzer",
	rc_get_secondEmbed_footer: "Seite ${from} / ${to}",
	rc_get_locale: "Sprache",
	rc_get_username: "Benutzername",
	rc_get_unkwnon_user: "Unbekannter Benutzer (${authorId})",

	// /authrestore force-join
	rc_forceJoin_embed_title: "AuthRestore - Erzwungener Beitritt",
	rc_forceJoin_embed_desc:
		"## Sind Sie sicher, dass Sie den Beitritt von Mitgliedern in dieser Gilde erzwingen möchten?\n### SORGFÄLTIG LESEN:\nWENN SIE DIESE AKTION BESTÄTIGEN, WIRD DER AKTUELLE PRIVATE SCHLÜSSEL ZERSTÖRT. EIN NEUER SCHLÜSSEL WIRD IHNEN ZUR VERFÜGUNG GESTELLT.\n\n\n",
	rc_forceJoin_embed_field1: "Gefundene Mitglieder",
	rc_forceJoin_embed_field2: "Bereits vorhandene Mitglieder",
	rc_forceJoin_embed_field3: "Mögliche Beitritte",
	rc_forceJoin_embed_2_field1: "Mögliche Beitritte",
	rc_forceJoin_embed_2_field2: "Beigetreten",
	rc_forceJoin_ws_size:
		"# Vorbereitung zum Hinzufügen von **${value2}** Mitgliedern zur Gilde.",
	rc_forceJoin_ws_start: "# Erzwungener Beitritt läuft...",
	rc_forceJoin_ws_end: "# Erzwungener Beitrittsprozess abgeschlossen.",
	rc_forceJoin_ws_end_renew_msg:
		"# SORGFÄLTIG LESEN\nHIER IST DER PRIVATE CODE, DER AN NIEMANDEN WEITERGEGEBEN WERDEN DARF. EINE PERSON MIT DIESEM CODE KÖNNTE IHN LÖSCHEN, MITGLIEDER ZU IHREM SERVER HINZUFÜGEN... BEWAHREN SIE IHN SICHER AUF. iHorizon WIRD IHN IHNEN NIE WIEDER GEBEN:\n```${value2}```",

	// Misc category
	// media manipulation

	// media cooldown
	media_gen_cooldown:
		"Du musst `1 Minute und 30 Sekunden` zwischen Medienerstellungen warten!",
	media_gen_error_args: "Bitte gebe zwei gültige Bild-URLs an.",

	// de-DE.yml (German - Germany)
	batch_ban_process:
		"🔄 Banne ${memberUsername} auf ${guildCount} Servern...",
	batch_unban_process: "🔄 Entbanne ${bannedMemberCount} Mitglieder...",
	batch_unblacklist_process:
		"🔄 Entferne ${bannedMemberUsername} von der Blacklist auf ${guildObjectCount} Servern...",
	batch_unbanall_process: "🔄 Entbanne ${bannedMemberCount} Mitglieder...",
	batch_massiverole_process:
		"🔄 Füge Rolle zu ${membersToProcessCount} Mitgliedern hinzu...",
	batch_unmassiverole_process:
		"🔄 Entferne Rolle von ${membersToProcessCount} Mitgliedern...",
	batch_undo_unban: "🔄 Entbanne ${unbannedMemberCount} Mitglieder erneut...",
	batch_derank_process:
		"🔄 Entferne ${rolesToRemoveCount} Rollen von ${memberUsername}...",
	unbanall_undo_command_err:
		"Keine Mitglieder zum erneuten Bannen. Verwende zuerst den Befehl ‚Alle entbannen‘.",

	// -----------------------------/ \-----------------------------
	// Bekenntnismodul Ereignisse
	confession_module_modal_title: "Ein Geständnis ablegen",
	confession_module_modal_components1_label: "Was möchten Sie gestehen?",
	confession_module_modal_components1_placeholder: "Mmhh",
	confession_module_modal_components2_label: "Ist das privat?",

	// Music Player Events

	even_mp_playerStart_tip:
		"> ${emoji_LastFM_Logo} Wusstest du, dass du deine Musik mit `/lastfm` auf iHorizon scrobbeln kannst ? ${emoji_Sunglass}",
	event_mp_audioTrackAdd:
		"${emoji_Player_Queue_Add} - ${trackTitle} wurde zur Warteschlange hinzugefügt !",
	event_mp_playerError: "Ich habe Probleme beim Verbinden => ${errorMessage}",
	event_mp_error:
		"Es gab ein Problem mit der Song-Warteschlange => ${errorMessage}",
	event_mp_emptyChannel:
		"${emoji_No} | Niemand ist im Sprachkanal, ich verlasse ...",
	event_mp_playerSkip:
		"${emoji_Music_Icon} - Überspringe **${trackTitle}** !",
	event_mp_emptyQueue:
		"${emoji_Warning_Icon} - Die Musik wurde gestoppt, da keine weiteren Songs in der Warteschlange sind!",

	// Ereignisse zur Kanalerstellung
	event_channel_create_message_embed_title: "Erfolgreich eingerichtet !",
	event_channel_create_message_embed_description:
		"Der Bot wurde perfekt eingerichtet. Sie müssen nichts mehr tun (zen).\n\nAlle Moderations-Logs, die iHorizon betreffen, werden hier angezeigt.",

	// Ereignisse zur Begrüßungsnachricht
	event_welcomer_inviter:
		"{memberMention} (Konto erstellt am {accountCreationTimestamp}) ist dem Server beigetreten. Sie wurden von **{inviterUsername}** eingeladen (**{invitesCount}** Einladungen), wir sind jetzt {memberCount} in {guildName}",
	event_welcomer_default:
		"{memberMention} (Konto erstellt am {accountCreationTimestamp}) ist dem Server beigetreten. Wir sind jetzt {memberCount} in {guildName}",

	// Ereignisse zur Verabschiedungsnachricht
	event_goodbye_inviter:
		"`{memberUsername}` (Konto erstellt am {accountCreationTimestamp}) hat den Server verlassen. Sie wurden von **{inviterUsername}** eingeladen (**{invitesCount}** Einladungen), wir sind jetzt {memberCount} in {guildName}",
	event_goodbye_default:
		"`{memberUsername}` (Konto erstellt am {accountCreationTimestamp}) hat den Server verlassen. Wir sind jetzt {memberCount} in {guildName}",

	// XP Level Events
	event_xp_level_earn:
		"**GG**, {memberMention} du hast +1 für dein XP-Level erhalten (Level: **{xpLevel}**)",
	event_xp_level_additional_info:
		"\n-#  ${emoji_VC_OpenChat} Findest du diese Nachricht störend? Du kannst diese Nachricht deaktivieren, indem du das Levelsystem mit dem Befehl `/ranks config` deaktivierst",

	// Ticket Module Events:
	event_ticket_embed_description:
		"Hallo ${userUsername}, willkommen in deinem Ticket! Bitte hab etwas Geduld, wir werden bald bei dir sein. Wenn du das Ticket schließen möchtest, gib bitte `/ticket close` ein.",
	event_ticket_add_member:
		"${author}, Sie haben **hinzugefügt** ${addedMembers} zum Ticket ${channel} !",
	event_ticket_del_member:
		"${author}, Sie haben **entfernt** ${removedMembers} vom Ticket ${channel} !",
	event_ticket_button_name: "Ticket erstellen",
	event_ticket_category_awaiting_response:
		"Welche Kategorie [${emoji}] >> ${name}",
	event_ticket_reason_awaiting_response:
		"${author} Sollte der Benutzer einen Grund angeben, bevor er ein Ticket erstellt?",
	event_ticket_create_reason_modal_title: "Was ist der Grund für Ihr Ticket?",
	event_ticket_create_reason_modal_fields_1_label: "Grund für das Ticket",
	event_ticket_reason_embed_desc: "# Ticketgrund\n`${reason}`",

	// interactionCreate-Ereignisse:
	iC_event_cooldown:
		"Abklingzeit, bitte warten Sie zwischen den Befehlen einen Moment!",
	iC_event_connection_error: "Verbindungsfehler!",

	// Cooldown
	Msg_cooldown:
		"Kannst du bitte einen Moment warten, bevor du einen Befehl ausführst?",

	// Ticket-Modul
	ticket_module_button_delete: "Ticket löschen",
	ticket_module_button_transcript: "Ticket transkribieren",
	ticket_module_button_addmember: "Mitglied hinzufügen",
	ticket_module_button_removemember: "Mitglied entfernen",
	ticket_module_add_question:
		"Wen möchtest du zu deinem Ticket hinzufügen? (Gib ihre Benutzer-ID an)!",
	ticket_module_remove_question:
		"Wer ist der Benutzer, den du aus deinem Ticket entfernen möchtest? (Gib ihre Benutzer-ID an)!",
	ticket_transcript_failed_to_send:
		"Ich habe versucht, dir die Datei in einer privaten Nachricht zu senden, aber du hast deine DMs blockiert :/",

	// Server-Protokolle
	event_srvLogs_banAdd_description:
		"<@${executorId}> **hat <@${targetId}> gebannt**",
	event_srvLogs_banAdd_fields_name: "Grund",
	event_srvLogs_banAdd_fields_value: "`{reason}`",
	event_srvLogs_banRemove_description:
		"<@${executorId}> **hat das Bann von ${targetUsername} aufgehoben**",
	event_srvLogs_guildMemberRemove_description:
		"<@${executorId}> **hat <@${targetId}> gekickt**",
	event_srvLogs_guildMemberUpdate_description:
		"📤 <@${executorId}> **hat die Rolle ${removedRoles} von ${oldMemberUserUsername} entfernt**",
	event_srvLogs_guildMemberUpdate_2_description:
		"📥 <@${executorId}> **hat die Rolle ${addedRoles} zu ${oldMemberUserUsername} hinzugefügt**",
	event_srvLogs_messageDelete_description:
		"**Nachricht in <#${messageChannelId}> gelöscht**\n${messageContent}",
	event_srvLogs_messageUpdate_description:
		"**Nachricht** [in](xxx) **<#${oldMessageChannelId}> bearbeitet**",
	event_srvLogs_messageUpdate_footer_1: "Vorher",
	event_srvLogs_messageUpdate_footer_2: "Nachher",
	event_srvLogs_voiceStateUpdate_description:
		"📤 <@${targetUserId}> **hat den Sprachkanal <#${OchannelID}> verlassen**",
	event_srvLogs_voiceStateUpdate_2_description:
		"📥 <@${targetUserId}> **hat den Sprachkanal <#${channelID}> betreten**",
	event_srvLogs_voiceStateUpdate_3_description:
		"<@${targetUserId}> **hat das Headset im Kanal <#${channelID}> stummgeschaltet**",
	event_srvLogs_voiceStateUpdate_4_description:
		"<@${targetUserId}> **hat das Headset im Kanal <#${channelID}> stummschalten aufgehoben**",
	event_srvLogs_voiceStateUpdate_5_description:
		"<@${targetUserId}> **hat sich im Kanal <#${channelID}> stummgeschaltet**",
	event_srvLogs_voiceStateUpdate_6_description:
		"<@${targetUserId}> **hat sich im Kanal <#${channelID}> stummschalten aufgehoben**",
	event_srvLogs_channelUpdate_disabled_for:
		"-    ❌ ${perm} deaktiviert für ${target}\n",
	event_srvLogs_channelUpdate_enabled_for:
		"-    ✅ ${perm} aktiviert für ${target}\n",
	event_srvLogs_channelUpdate_allowed_for:
		"-    ✅ ${perm} erlaubt für ${target}\n",
	event_srvLogs_channelUpdate_unallowed_for:
		"-    ❌ ${perm} nicht erlaubt für ${target}\n",
	event_srvLogs_channelUpdate_field_name: "🎫 Name: ${newChannelName}\n",
	event_srvLogs_channelUpdate_perm_added:
		"🛡 Hinzugefügte Berechtigungen für ${target}:\n",
	event_srvLogs_channelUpdate_embed_desc: "${newChannel} wurde aktualisiert",

	// Rang-Erhöhung Ereignis
	event_rank_role: "<@${messageAuthorId}>, du hast jetzt die Rolle <@&${id}>",

	// Vorschlagsereignis
	event_suggestion_embed_author:
		"Neuer Vorschlag von ${messageAuthorUsername}",

	// Sicherheitsereignis
	event_security_title: "Willkommen bei ${guild}!",
	event_security:
		"${member}, bitte gib das in dieser Nachricht angezeigte Captcha ein.",
	event_security_expiry:
		"{emoji} Automatischer Kick ${timestamp} (**${attempts}** Versuch(e) verbleibend).",
	event_security_footer:
		"Dies dauert nur wenige Sekunden und hilft dabei, unsere Community sicher zu halten.",
	event_security_kick_reason: "Sicherheitsprüfung fehlgeschlagen",

	// Ticket-Ereignis
	event_ticket_whenCreated_msg:
		"${author}, Ihr Ticket wurde erstellt, besuchen Sie <#${channelId}>!",
	event_ticket_logsChannel_onCreation_embed_title:
		"Ticket-Protokoll - Erstellung des Panels",
	event_ticket_logsChannel_onCreation_embed_desc:
		"Ticket-Panel mit dem Namen `${name}` in ${interaction} erstellt!",
	event_ticket_logsChannel_onCreationChannel_embed_title:
		"Ticket-Protokoll - Erstellung des Tickets",
	event_ticket_logsChannel_onCreationChannel_embed_desc:
		"Ticket erstellt von ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onClose_embed_title:
		"Ticket-Protokoll - Schließung des Tickets",
	event_ticket_logsChannel_onClose_embed_desc:
		"Ticket wurde nun von ${author} geschlossen (<#${channelId}>)!",
	event_ticket_logsChannel_onRemoveMember_embed_title:
		"Ticket-Protokoll - Mitglied aus einem Ticket entfernen",
	event_ticket_logsChannel_onRemoveMember_embed_desc:
		"${member} wurde von ${author} aus dem Ticket entfernt (<#${channelId}>)!",
	event_ticket_logsChannel_onAddMember_embed_title:
		"Ticket-Protokoll - Mitglied zu einem Ticket hinzufügen",
	event_ticket_logsChannel_onAddMember_embed_desc:
		"${member} wurde von ${author} dem Ticket hinzugefügt (<#${channelId}>)!",
	event_ticket_logsChannel_onReopen_embed_title:
		"Ticket-Protokoll - Ticket wieder öffnen",
	event_ticket_logsChannel_onReopen_embed_desc:
		"${author} hat ein Ticket wieder geöffnet (<#${channelId}>)!",
	event_ticket_logsChannel_onDelete_embed_title:
		"Ticket-Protokoll - Löschen eines Tickets",
	event_ticket_logsChannel_onDelete_embed_desc:
		"${author} hat ein Ticket gelöscht (#${channelName})!",
	event_ticket_logsChannel_onAddMember2_embed_title:
		"Ticket-Protokoll - Hinzufügen/Entfernen von Mitgliedern eines Tickets",
	event_ticket_logsChannel_onAddMember2_embed_desc:
		"${author}\nEntfernt: ${removedMembers}.\nHinzugefügt: ${addedMembers}.\n im Ticket (${channel})!",
	event_ticket_already_opened:
		"عذرًا، لديك بالفعل تذكرة مفتوحة (<#${channelId}>)! يرجى إغلاقها قبل فتح واحدة جديدة.",

	// Gewinnspiel-Ereignis
	event_gw_reroll_win_msg:
		"Herzlichen Glückwunsch ${winners}! Sie haben **${prize}** gewonnen!",
	event_gw_reroll_cannot_win_msg:
		"Keine gültigen Teilnehmer, daher konnte kein Gewinner ermittelt werden!",
	event_gw_finnish_msg:
		"Herzlichen Glückwunsch ${winners}! Sie haben **${prize}** gewonnen!",
	event_gw_finnish_cannot_msg:
		"Keine gültigen Teilnehmer, daher konnte kein Gewinner ermittelt werden!",
	event_gw_finnish_button_title: "Gewinnspiel beendet",
	event_gw_entries_button_title: "Teilnehmerliste",
	event_gw_removeentries_msg:
		"${author}, du hast an diesem Gewinnspiel teilgenommen!",
	event_gw_leave_button_placeholder: "Gewinnspiel verlassen",
	event_gw_confirm_leave_msg:
		"${author}, bist du sicher, dass du dieses Gewinnspiel verlassen möchtest?",
	event_gw_embed_desc:
		"Endet: ${end_string} (${end_string2})\nVeranstaltet von: <@${hostedBy}>\nTeilnehmer: **0**\nGewinner: **${winners_amount}**",
	event_gw_ended_embed_desc:
		"Beendet: ${time1} (${time2})\nGastgeber: <@${hostedBy}>\nEinträge **${entrieCount}**\nGewinner: ${winners}",
	event_gw_entries_words: "Teilnehmer",
	event_gw_ended_word:
		"Beendet: ${ended} (${time2})\nVeranstaltet von: <@${hostedBy}>\nTeilnehmer **${entries}**\nGewinner: ${winners}",
	event_gw_break_req:
		"${emoji_No} Du erfüllst nicht die erforderlichen Bedingungen, um an diesem Gewinnspiel teilzunehmen.\nTyp: `${requirementType}`\nWert: `${requirementValue}`",

	// Ereignisprotokoll für Boosts
	event_boostlog_add:
		"<@${newMemberUserId}> **hat gerade den Server geboostet**! (**${boostCount}** insgesamt)",
	event_boostlog_sub:
		"<@${newMemberUserId}> **hat gerade seinen Boost vom Server entfernt**! (**${boostCount}** insgesamt)",

	// Wirtschaftsmodul
	economy_disable_msg:
		"<@${authorId}>, das `Wirtschaftsmodul` auf diesem Server ist **deaktiviert**. Du kannst das Wirtschaftsmodul nicht mehr verwenden!",

	// Permission Event
	event_permission_wrong:
		"${author}, Sie dürfen diesen Befehl nicht verwenden! Benötigte Berechtigung: ${neededPerm}",

	// TempVoice-Modul
	// Alle Komponenten, globalVar...

	// Globale Variable

	temporary_voice_title_embec:
		"## Änderungen an Ihrem temporären Sprachkanal",
	temporary_voice_unblocked_member: "Nicht blockierte Mitglieder",
	temporary_voice_blocked_mmeber: "Blockierte Mitglieder",
	temporary_voice_no_one: "Niemand",
	temporary_voice_new_member: "Neuer Besitzer",
	temporary_voice_old_member: "Alter Besitzer",
	temporary_voice_modal_title: "iHorizon's VoiceDashboard",
	temporary_voice_new_userlimit: "Neue Benutzerbegrenzung",
	temporary_voice_new_name: "Neuer Name",
	temporary_voice_new_region: "Neue Region",
	temporary_voice_untrusted_member: "Nicht vertrauenswürdige Mitglieder",
	temporary_voice_trusted_member: "Vertrauenswürdige Mitglieder",

	// Tasten
	temporary_voice_block_button_menu_placeholder:
		"Ausgewählte Benutzer werden als nicht vertrauenswürdig eingestuft",

	temporary_voice_delete_button_desc_embed:
		"## Kanallöschung\nDer Kanal wurde erfolgreich gelöscht!",

	temporary_voice_limit_button_menu_label:
		"Wie hoch ist die Benutzer Begrenzung?",
	temporary_voice_limit_button_not_integer:
		"${emoji_No} | Die Eingabe ist keine Zahl",

	temporary_voice_name_button_menu_label: "Wie lautet der Kanalname?",

	temporary_voice_privacy_menu_placeholder:
		"Wählen Sie eine Datenschutzoption aus",
	temporary_voice_privacy_menu_lock_label: "Kanal sperren",
	temporary_voice_privacy_menu_lock_desc:
		"Nur vertrauenswürdige Benutzer können Ihrem Sprachkanal beitreten",
	temporary_voice_privacy_menu_unlock_label: "Kanal entsperren",
	temporary_voice_privacy_menu_unlock_desc:
		"Jeder kann Ihrem Sprachkanal beitreten",
	temporary_voice_privacy_menu_invisible_label: "Unsichtbar",
	temporary_voice_privacy_menu_invisible_desc:
		"Nur vertrauenswürdige Benutzer können Ihren Sprachkanal sehen",
	temporary_voice_privacy_menu_visible_label: "Sichtbar",
	temporary_voice_privacy_menu_visible_desc:
		"Jeder kann Ihren Sprachkanal sehen",
	temporary_voice_privacy_menu_closechat_label: "Chat schließen",
	temporary_voice_privacy_menu_closechat_desc:
		"Nur vertrauenswürdige Benutzer können in Ihrem Chat schreiben",
	temporary_voice_privacy_menu_openchat_label: "Chat öffnen",
	temporary_voice_privacy_menu_openchat_desc:
		"Jeder kann in Ihrem Chat schreiben",

	temporary_voice_region_menu_placeholder: "Wählen Sie eine Region aus",

	temporary_voice_transfer_menu_placeholder:
		"Ausgewählte Benutzer zum Übertragen des Sprachkanals",

	temporary_voice_transfer_trust_placeholder:
		"Ausgewählte Benutzer werden als vertrauenswürdig eingestuft, um beizutreten",

	temporary_voice_transfer_unblocked_placeholder:
		"Ausgewählte Benutzer werden als nicht blockiert eingestuft, um beizutreten",

	temporary_voice_transfer_untrust_placeholder:
		"Ausgewählte Benutzer werden als nicht vertrauenswürdig eingestuft, um beizutreten",

	temporary_voice_channel_name: "{nickname}s Kanal",

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
	tempvoice_cfg_saved: "TempVoice settings saved!",
	tempvoice_cfg_expired: "Configuration panel expired. Run /tempvoice again.",
	tempvoice_cfg_modal_title: "Set the channel name",
	tempvoice_cfg_modal_label: "Name | Variable: {Username}",
	// Schutzmodul
	// Ereignisnachricht

	protection_avoid_channel_delete:
		"**SCHUTZMODUS AKTIV**\n<@${channelGuildOwnerId}>, der Kanal wurde neu erstellt, <@${executorId}> hat versucht, den Kanal zu löschen!",
	protection_blockbot_embed_title: "⚠️ Gefahr in ${memberGuildName} ⚠️",
	protection_blockbot_embed_desc:
		"# Bot-Hinzufügung Warnung\nJemand hat versucht, einen Discord-Bot hinzuzufügen.",
	var_target_bot: "Ziel-Bot",
	var_not_detected: "Nicht erkannt",

	// AntiSpam Modul
	// Ereignismeldung

	// Basiswarnmeldung
	antispam_base_warn_message:
		"Achtung ${mentionedMembers}, du spammst und könntest bestraft werden.",

	// Zusätzliche Warnmeldungen basierend auf der Art der Bestrafung
	antispam_more_ban_msg:
		" Wenn du weitermachst, wirst du vom Server gebannt.",
	antispam_more_mute_msg: " Wenn du weitermachst, wirst du stummgeschaltet.",
	antispam_more_kick_msg:
		" Wenn du weitermachst, wirst du vom Server gekickt.",

	// Einbettungsprotokolle von AntiSpam
	antispam_log_embed_title: "[AntiSpam] Neue ${actionType}",
	antispam_log_embed_desc: "${bot} hat **${actionType}** ${user}",

	// Hybridbefehle
	// Ereignisnachricht

	hybridcommands_global_prefix_mention: "`@Ping-Mich`",
	hybridcommands_global_prefix_cleaned_mention: "@Ping-Mich ",
	hybridcommands_args_error_embed_desc:
		'```ts\nBefehlname: ${currentCommandName}\n```\n```cs\n${botPrefix}${fullNameCommand} ${argsString}\n${errorPosition}\nFehler beim Senden des Arguments "${wrongArgumentName}".\n```',
	hybridcommands_embed_help_title: "${commandName} Hilfe Einbettung",
	hybridcommands_embed_help_fields_value:
		"**Aliase:** ${aliases}\n**Verwendung:** ${use}",
	hybridcommands_embed_footer_text:
		"Optionen in [...] sind erforderlich, während diejenigen in <...> optional sind.\nVerwenden Sie den Befehl: ${botPrefix}help [command] für weitere Informationen.",

	ping_bot_show_info_msg:
		"Hey ${messageAuthor}, ich bin zu 100% in `Slash Command` (${emoji_Slash_Bot_Badge}) und zu mehr als 85% in Präfix-Befehl nutzbar. Mein Präfix auf **diesem Server** ist `${prefix}` !",
	ping_bot_show_info_msg_about_change_prefix:
		"\n-# ${emoji_VC_OpenChat} Mein Präfix stört dich? Nutze **`/guildconfig bot prefix`**, um ihn zu ändern!",

	// Benachrichtigungsmodul
	notifier_on_new_media_default_message:
		"@everyone **[{artistAuthor}](<{artistLink}>)** hat ein neues Video veröffentlicht [Hier klicken]({mediaURL})",
	notifier_on_new_media_default_button_label: "Ansehen!",
	notifier_generateAuthorsEmbed_embed_desc:
		"Dies ist die Liste aller Streamer/YouTuber:\n",
	notifier_generateAuthorsEmbed_embed_title:
		"Alle Streamer/YouTuber im Server",
	notifier_generateConfigurationEmbed_embed_title:
		"Konfiguration des Benachrichtigungsmoduls",
	notifier_generateConfigurationEmbed_embed_fields_1_name:
		"Benachrichtigungskanal",
	notifier_generateConfigurationEmbed_embed_fields_2_name:
		"Benachrichtigungsnachricht",

	// ButtonReaction
	buttonreaction_role_doesnt_exit:
		"Die Rolle in meiner Datenbank existiert nicht mehr im Server!",
	buttonreaction_role_too_high:
		"Die Rolle ist zu hoch, ich kann die Rolle nicht vergeben/entfernen. Ich muss meine Berechtigungen ändern!",
	buttonreaction_role_add: "Du hast jetzt die Rolle ${role} :tada:",
	buttonreaction_role_remove: "Du hast die Rolle ${role} nicht mehr ✅",
	rolepanel_setup_embed_title: "Rollenpanel einrichten",
	rolepanel_setup_embed_desc:
		"Wähle Rollen aus, um sie bei ${member} hinzuzufügen oder zu entfernen. Wenn ${member} eine ausgewählte Rolle bereits hat, wird sie entfernt. Nicht erlaubte Rollen werden ignoriert.",
	rolepanel_setup_embed_roles_field: "Erlaubte Rollen",
	rolepanel_setup_embed_refused_field: "Abgelehnte Rollen",
	rolepanel_setup_select_placeholder: "Rollen zum Anbieten auswählen",
	rolepanel_setup_apply_button: "Panel erstellen",
	rolepanel_setup_no_roles: "Es wurde keine gültige Rolle ausgewählt.",
	rolepanel_setup_saved: "Das Rollenpanel wurde gesendet.",
	rolepanel_panel_embed_title: "Rollenpanel",
	rolepanel_panel_embed_desc:
		"Wähle Rollen aus, um sie deinem Profil hinzuzufügen oder zu entfernen.",
	rolepanel_panel_select_placeholder: "Wähle deine Rollen",
	rolepanel_role_managed_or_everyone: "Systemrolle oder @everyone",
	rolepanel_role_too_high_bot: "Rolle höher als der Bot",
	rolepanel_role_too_high_user: "Rolle höher als du",
	rolepanel_role_missing_permissions:
		"Fehlende Berechtigungen: ${permissions}",
	rolepanel_apply_added: "Rollen hinzugefügt: ${roles}",
	rolepanel_apply_removed: "Rollen entfernt: ${roles}",
	rolepanel_apply_refused: "Rollen abgelehnt: ${roles}",
	rolepanel_logs_embed_title_create: "Rollenpanel-Logs",
	rolepanel_logs_embed_desc_create:
		"<@${authorId}> hat ein Rollenpanel (${messageId}) erstellt mit: ${roles}",
	rolepanel_logs_embed_title_apply: "Rollenpanel-Nutzungslogs",
	rolepanel_logs_embed_desc_apply:
		"<@${authorId}> hat Rollen von <@${memberId}> über ein Panel geändert. Hinzugefügt: ${addedRoles} | Entfernt: ${removedRoles}",

	// AuthRestore HTML
	rc_created_by: "Erstellt von:",
	rc_created_on: "Erstellt am:",
	rc_total_membres: "Gesamtanzahl Mitglieder",
	rc_total_verification: "Gesamtanzahl Verifizierungen",
	rc_total_key_used_count: "Anzahl der Schlüsselverwendungen",
	rc_recent_locales_distribution: "Mitglieder-Lokalisierung",
	rc_recent_verifications: "Letzte Verifizierungen",
	rc_registration_over_time: "Registrierungen im Laufe der Zeit",

	// Nur-Bilder-Modul
	piconly_module_punish_msg:
		"${messageAuthor}, Sie wurden für 10 Minuten stummgeschaltet, weil Sie zu viele Nachrichten ohne Bilder in einem bildexklusiven Kanal gesendet haben.",
	piconly_module_warn_msg:
		"${messageAuthor}, dieser Kanal akzeptiert nur Nachrichten mit Bildern (akzeptierte Formate: JPG, PNG, GIF, WEBP, BMP, TIFF). Warnung ${userWarningCount}/${threshold}",
	piconly_module_timeout_reason:
		"Spam von Nachrichten ohne Bilder in einem Nur-Bilder-Kanal",

	// Nick Kicker Event
	event_nick_kicker_kick_reason:
		"Gesperrtes Wort im Benutzernamen - Spitzname-Entferner",
	event_nick_kicker_kick_msg:
		"Im Server `${memberGuildName}` enthält dein Benutzername ein gesperrtes Wort. Du wurdest vom Server gekickt.",

	// Profilbilder-Modul
	pfps_embed_user_title: "${username}s **Benutzer**-Avatar",
	pfps_embed_guild_title: "${username}s **Server**-Avatar",
	pfps_download_user_button: "Benutzer-Avatar herunterladen",
	pfps_download_guild_button: "Server-Avatar herunterladen",
	// -----------------------------\ /-----------------------------

	// AddRoleReact Command
	addrolereact_role_not_found: "Rolle nicht gefunden.",
	addrolereact_cannot_check_permissions:
		"Kann Ihre Berechtigungen nicht überprüfen.",
	addrolereact_role_too_high:
		"Sie können keine Rolle hinzufügen, die höher oder gleich Ihrer höchsten Rolle ist.",
	addrolereact_must_be_text_channel:
		"Dieser Befehl muss in einem Textkanal ausgeführt werden.",
	addrolereact_message_not_found: "Nachricht nicht gefunden.",
	addrolereact_no_reactions: "Diese Nachricht hat keine Reaktionen.",
	addrolereact_adding_role: "Rolle {role} wird hinzugefügt...",
	addrolereact_adding_role_progress:
		"Rolle {role} wird für {count} Benutzer hinzugefügt...",
	addrolereact_role_added:
		"Rolle {role} hinzugefügt. {count} Benutzer haben die Rolle erhalten.",
	addrolereact_error: "Fehler bei der Ausführung des Befehls.",

	// Kanal ausblenden/einblenden Befehle
	channel_hide_in_progress: "Aktueller Kanal wird ausgeblendet...",
	channel_hide_success: "Kanal wurde für @everyone ausgeblendet",
	channel_hide_already_hidden:
		"Dieser Kanal ist bereits für @everyone ausgeblendet",
	channel_unhide_in_progress: "Aktueller Kanal wird eingeblendet...",
	channel_unhide_success: "Der Kanal ist jetzt für @everyone sichtbar",
	channel_unhide_already_visible:
		"Dieser Kanal ist bereits für @everyone sichtbar",
	channel_hideall_in_progress: "Alle Kanäle werden ausgeblendet...",
	channel_hideall_success:
		"**Ausblenden abgeschlossen!**\n**Statistiken:**\n• **{hiddenCount}** Kanäle ausgeblendet\n• **{errorCount}** Fehler aufgetreten",
	channel_hideall_error:
		"Ein Fehler ist beim Ausblenden der Kanäle aufgetreten.",
	channel_unhideall_in_progress: "Alle Kanäle werden eingeblendet...",
	channel_unhideall_success:
		"**Einblenden abgeschlossen!**\n**Statistiken:**\n• **{unhiddenCount}** Kanäle eingeblendet\n• **{errorCount}** Fehler aufgetreten",
	channel_unhideall_error:
		"Ein Fehler ist beim Einblenden der Kanäle aufgetreten.",

	// de-DE.yml (German - Germany)
	new_guild_embed_title: [
		"Willkommen auf eurem Server! 🎉",
		"Grüße, liebe Discord-Community! 👋",
		"iHorizon ist dem Chat beigetreten! 💬",
		"Es ist ein Vogel, es ist ein Flugzeug, nein, es ist iHorizon! 🦸‍♂",
		"Lasst uns iHorizon herzlich willkommen heißen! 🔥",
		"Ein neues Abenteuer beginnt! 🚀",
		"Ein fantastisches neues Mitglied ist da! ✨"
	],
	new_guild_embed_desc:
		"## ${randomMessage}\nHallo zusammen, liebe Freunde!\n\nIch bin iHorizon, ein fortschrittlicher Bot, der entwickelt wurde, um euer Discord-Erlebnis außergewöhnlich und voller Spaß zu gestalten.\n\n✨ **Was ich für euch tun kann:**\n• Server-Management mit Intelligenz und Professionalität\n• Interaktive Spiele und grenzenlose Unterhaltung\n• Nützliche Tools zur Community-Organisation\n• 24/7 technischer Support\n\nEntdeckt meine Befehle und taucht ein in eine Welt voller unbegrenzter Möglichkeiten.\nGemeinsam werden wir eine fantastische Community aufbauen, voller wunderschöner Erinnerungen!\n\nDanke, dass ihr mich gewählt habt – lasst uns das Abenteuer beginnen! 🌟",
	new_guild_owner_dm_title: "Willkommen in der iHorizon-Familie!",
	new_guild_owner_dm_description:
		"# Danke, dass du iHorizon zu deinem Server hinzugefügt hast!\n\n> *Warte... Ist das alles? Nein, absolut nicht.*\n\niHorizon ist ein Discord-Bot, okay? Aber nicht nur das. Es ist auch eine Community, eine Geschichte, ein Projekt, das seit über 6 Jahren (2020) aufgebaut wird.\niHorizon zu nutzen bedeutet nicht nur, einen vollständigen Discord-Bot zu haben, für immer **kostenlos** und **Open Source**. Es bedeutet auch, ein **Konzept** anzunehmen.\n\n> **Ein kostenloser Discord-Bot kann bessere Arbeit leisten als kostenpflichtige Bots.**\n*Ja, das ist iHorizon: ein vollständiger Bot, der seit 6 Jahren von leidenschaftlichen Menschen gepflegt wird.*\n\nAlso ja... nach dieser Nachricht: Danke.\nWir sind Legion. #ihorizon",
	guild_create_btn_invite: "iHorizon einladen",
	guild_create_btn_website: "iHorizon Webseite",
	guild_create_btn_search: "iHorizon Suche",
	guild_create_btn_repos: "iHorizon Repositories",
	guild_create_btn_support: "Support-Server",
	guild_create_btn_docs: "iHorizon Dokumentation",
	bot_server_bio:
		"{wink_emoji} **iHorizon Discord Bot** **`+{count} Befehle`**\n> *« Von Menschen seit 2022 gemacht, für deine Community. »*\n**https://www.ihorizon.org**",
	guild_leave_data_clear_notice_title: "iHorizon hat ${guildName} verlassen",
	guild_leave_data_clear_notice_description:
		"Buhu, das ist traurig. Du hast den Bot von `${guildName}` gekickt. Die Serverdaten werden ${deleteAt} gelöscht, wenn iHorizon bis dahin nicht zurück ist.",
	guild_leave_data_clear_notice_message:
		"Buhu, das ist traurig. Du hast iHorizon von `${guildName}` gekickt. Die Daten werden ${deleteAt} gelöscht.",
	guild_leave_data_clear_cancelled_title:
		"iHorizon ist zurück auf ${guildName}",
	guild_leave_data_clear_cancelled_description:
		"Juhuuu, danke, dass du iHorizon wieder zu `${guildName}` hinzugefügt hast. Die geplante Datenlöschung wurde abgebrochen.",
	guild_leave_data_clear_cancelled_message:
		"Juhuuu, danke, dass du iHorizon wieder zu `${guildName}` hinzugefügt hast. Deine Serverdaten sind sicher.",

	// Confession Event
	confession_embed_logs_title: "Neues Geständnis",
	confession_channel_button_name: "Anonym antworten",
	confession_1_embed_log_title: "Neue Antwort auf Geständnis",

	// Context Menu Interaction
	global_unknown_message: "Nachricht nicht gefunden.",
	global_error: "❌ Fehler",
	global_not_atc: "Die ausgewählte Nachricht enthält keinen Anhang.",
	global_not_valid_atc:
		"Der ausgewählte Anhang ist keine gültige Audiodatei.",
	global_too_heavy_file:
		"Die generierte MP4-Datei ist zu groß (${fileSize} MB). Das Discord-Limit beträgt 25 MB.",
	global_convert_ok: "✅ Erfolgreich konvertiert",
	global_convert_ok_desc:
		"Ihre Audiodatei wurde in MP4 konvertiert (${fileSize} MB).",

	// Economy logs titles
	economy_logs_add_money_title: "Wirtschaftslogs – Geld hinzugefügt",
	economy_logs_remove_money_title: "Wirtschaftslogs – Geld entfernt",
	economy_logs_boost_role_title: "Wirtschaftslogs – Rollen-Boost",
	economy_logs_config_title: "Wirtschaftslogs – Modulkonfiguration",
	economy_logs_role_add_title:
		"Wirtschaftslogs – Neue Rolle im Shop hinzugefügt",
	economy_logs_role_remove_title:
		"Wirtschaftslogs – Rolle aus dem Shop entfernt",
	economy_logs_pay_title: "Wirtschaftslogs – Zahlung",
	economy_logs_rob_title: "Wirtschaftslogs – Raub",
	economy_logs_set_cooldown_title: "Wirtschaftslogs – Cooldown festgelegt",
	economy_logs_set_money_title: "Wirtschaftslogs – Geld festgelegt",
	economy_logs_withdraw_title: "Wirtschaftslogs – Abhebung",
	economy_logs_deposit_title: "Wirtschaftslogs – Einzahlung",

	// Economy logs descriptions
	economy_logs_add_money_desc:
		"{author} hat {target} `{amount}$` {coin} hinzugefügt",
	economy_logs_remove_money_desc:
		"{author} hat von {target} `{amount}$` {coin} entfernt",
	economy_logs_boost_role_desc:
		"{author} hat den Boost für die Rolle {role} gesetzt. Boost ist jetzt: `x{amount}`",
	economy_logs_config_desc: "{author} hat das Wirtschaftsmodul {state}",
	economy_logs_role_add_desc:
		"{author} hat die Rolle {role} zum Shop hinzugefügt. Preis: `{amount}$`",
	economy_logs_role_remove_desc:
		"{author} hat die Rolle {role} aus dem Shop entfernt.",
	economy_logs_pay_desc: "{author} hat `{amount}$` an {target} gesendet",
	economy_logs_rob_desc: "{author} hat `{amount}$` von {target} geraubt",
	economy_logs_set_cooldown_desc:
		"{author} hat den Cooldown von `{type}` auf **{time}** gesetzt",
	economy_logs_set_money_desc:
		"{author} hat das Geld von `{type}` auf **{money}** gesetzt",
	economy_logs_withdraw_desc:
		"{author} hat **${money}** von der Bank abgehoben",
	economy_logs_deposit_desc:
		"{author} hat **${money}** auf die Bank eingezahlt",

	// Generic vars
	var_on: "aktiviert",
	var_off: "deaktiviert",
	global_command_cooldown_msg:
		"${emoji} Du musst **${time}** zwischen jeder Verwendung von **`${ctxCommandPath}`** warten",

	global_warn_embed_title: "Du wurdest verwarnt – Fall **`${id}`**",
	global_warn_embed_desc:
		"> **Grund:** ${reason}\n> **Verantwortlich:** @${authorUsername} (*${authorRolesHighestName}*)\nVerwarnung erstellt ${time}",
	global_warn_component_button_label: "Gesendet von ${authorGuildName}",

	counter_error_too_much_u:
		"<@${messageAuthorId}> HAT SICH BEI **${number}** VERZÄHLT!! Die nächste Zahl ist **1**. **Du kannst nicht zweimal hintereinander zählen.**",
	counter_error_syntaxic:
		"<@${messageAuthorId}> HAT EINEN FEHLER GEMACHT!! Die nächste Zahl ist **1**.",

	global_blacklist_msg_to_send:
		"Du wurdest automatisch von diesem Server gebannt, da dein Konto auf der iHorizon Global Blacklist steht.\n\nGrund: `${reason}`\n\nGemäß Abschnitt 3 unserer Nutzungsbedingungen stimmen Server, die iHorizon verwenden, zu, dass der Bot automatisch Sanktionen im Zusammenhang mit dieser globalen Blacklist durchsetzen darf.\n\nWenn du glaubst, dass dies ein Fehler ist oder du diese Entscheidung anfechten möchtest, kannst du hier Einspruch einlegen:\nAppeal: <https://www.ihorizon.org/appeal>\n\nNutzungsbedingungen: <https://www.ihorizon.org/tos>",
	global_blacklist_reason:
		"iHorizon-Projekt Bestrafung - Blacklist | Grund: ${reason}",
	server_blacklist_msg_to_send:
		"Du wurdest gebannt, da du auf der Blacklist dieses Servers stehst.\nGrund: `${data2Reason}`",
	server_blacklist_reason: "Blacklist | Grund: ${data2Reason}",
	help_sticky_fields: "Sticky",
	help_sticky_dsc:
		"> *Halte eine wichtige Nachricht in deinen Kanälen mit automatischem Reposting immer sichtbar.*",
	sticky_channel_command_error:
		"${emoji_No} | ${author}, ich konnte keinen gültigen Textkanal finden.",
	sticky_text_command_missing_message:
		"${emoji_No} | ${author}, du musst eine Sticky-Nachricht angeben.",
	sticky_text_command_work:
		"${emoji_Yes} | ${author}, die Sticky-Textnachricht ist jetzt in ${channel} aktiv.",
	sticky_embed_command_embed_not_found:
		"${emoji_No} | ${author}, ich konnte das Embed `${embed_id}` nicht finden.",
	sticky_embed_command_work:
		"${emoji_Yes} | ${author}, das Sticky-Embed `${embed_id}` ist jetzt in ${channel} aktiv.",
	sticky_disable_command_not_found:
		"${emoji_No} | ${author}, in ${channel} ist keine Sticky-Nachricht konfiguriert.",
	sticky_disable_command_work:
		"${emoji_Yes} | ${author}, die Sticky-Nachricht wurde in ${channel} deaktiviert.",
	sticky_refresh_command_not_found:
		"${emoji_No} | ${author}, in ${channel} ist keine Sticky-Nachricht konfiguriert.",
	sticky_refresh_command_missing_embed:
		"${emoji_No} | ${author}, die Sticky-Nachricht in ${channel} verweist auf ein Embed, das nicht mehr existiert.",
	sticky_refresh_command_missing_permissions:
		"${emoji_No} | ${author}, ich kann die Sticky-Nachricht in ${channel} nicht erneut senden. Prüfe meine Berechtigungen.",
	sticky_refresh_command_work:
		"${emoji_Yes} | ${author}, die Sticky-Nachricht wurde in ${channel} erneut gesendet.",
	sticky_show_command_not_found:
		"${emoji_No} | ${author}, in ${channel} ist keine Sticky-Nachricht konfiguriert.",
	sticky_show_embed_title: "Sticky-Nachrichtenkonfiguration",
	sticky_show_embed_fields_channel: "Kanal",
	sticky_show_embed_fields_type: "Typ",
	sticky_show_embed_fields_status: "Status",
	sticky_show_embed_fields_message: "Nachricht",
	sticky_show_embed_fields_embed: "Embed-ID",
	sticky_show_embed_fields_last_message: "Letzte Sticky-Nachrichten-ID",
	sticky_list_embed_title: "Sticky-Kanäle",
	sticky_list_embed_desc_empty:
		"Auf diesem Server ist kein Sticky-Kanal konfiguriert.",
	sticky_list_embed_desc_line_text: "${channel} - Text-Sticky",
	sticky_list_embed_desc_line_embed:
		"${channel} - Embed-Sticky (`${embed_id}`)",
	sticky_list_embed_desc_line_text_embed:
		"${channel} - Text + Embed-Sticky (`${embed_id}`)",
	sticky_var_text: "Text",
	sticky_var_embed: "Embed",
	sticky_var_text_embed: "Text + Embed",
	sticky_var_enabled: "Aktiviert",
	sticky_var_disabled: "Deaktiviert",
	sticky_var_none: "Keine",

	// /honeypot config
	honeypot_config_not_allowed:
		"Sie müssen Administrator sein oder auf der Allowlist stehen, um Honeypot zu konfigurieren.",
	honeypot_config_embed_title: "Honeypot-Konfiguration",
	honeypot_config_embed_desc:
		"Konfigurieren Sie den Fallenkanal, den Log-Kanal und die automatische Aktion, die verwendet wird, wenn jemand anfängt, Nachrichten im *Honeypot*-Kanal zu senden.",
	honeypot_config_embed_field_status: "Status",
	honeypot_config_embed_field_trap_channel: "Fallenkanal",
	honeypot_config_embed_field_logs_channel: "Log-Kanal",
	honeypot_config_embed_field_action: "Aktion",
	honeypot_config_embed_field_message: "Gesendete Nachricht",
	honeypot_config_embed_field_notes: "Hinweise",
	honeypot_config_embed_field_credit: "Credits",
	honeypot_config_notes_value:
		"- **Platzieren Sie die iHorizon-Rolle über allen Mitgliederrollen.**\n- **Automatisch erstellte Honeypot-Kanäle werden an die Spitze des Servers verschoben.**\n- **Sie können den Honeypot-Kanal umbenennen, ohne das System zu beeinträchtigen.**",
	honeypot_config_credit_value:
		"*Inspiriert von Honeypot von RiskyMH*\n${url}",
	honeypot_config_select_trap_placeholder: "Fallenkanal auswählen",
	honeypot_config_select_logs_placeholder: "Log-Kanal auswählen",
	honeypot_config_select_action_placeholder: "Aktion auswählen",
	honeypot_config_button_send: "Embed senden",
	honeypot_config_button_preview: "Vorschau",
	honeypot_config_button_enable: "Honeypot aktivieren",
	honeypot_config_button_disable: "Honeypot deaktivieren",
	honeypot_config_send_success:
		"Das Honeypot-Embed wurde in ${channel} gesendet.",
	honeypot_config_enable_success:
		"Honeypot ist jetzt in ${channel} aktiviert.",
	honeypot_config_disable_success: "Honeypot ist jetzt deaktiviert.",
	honeypot_config_missing_logs_channel:
		"Sie müssen vor der Aktivierung von Honeypot einen Log-Kanal konfigurieren.",
	honeypot_config_generic_error:
		"Beim Aktualisieren von Honeypot ist ein Fehler aufgetreten.",
	honeypot_config_select_action_kick: "Benutzer kicken",
	honeypot_config_select_action_ban: "Benutzer sperren",
	honeypot_config_select_action_none: "Nur Nachrichten löschen",
	honeypot_config_select_action_del_messages: "Nachrichten löschen",
	honeypot_default_channel_name: "🍯・allgemeiner-chat",
	honeypot_action_none: "Nur Nachrichten löschen",
	honeypot_action_failed: "Aktion fehlgeschlagen",
	honeypot_dm_action_kicked: "du wurdest rausgekickt!",
	honeypot_dm_action_banned: "du wurdest gebannt!",
	honeypot_dm_action_none: "deine Nachrichten wurden gelöscht",
	honeypot_trap_embed_title: "SENDEN SIE KEINE NACHRICHTEN IN DIESEM KANAL",
	honeypot_trap_embed_desc:
		"*Dieser Kanal wird verwendet, um Spam-Bots zu fangen.*\n*Jede hier gesendete Nachricht **WIRD** den automatischen Schutz des Servers auslösen.*",
	honeypot_trap_embed_footer:
		"Inspiriert vom Honeypot von RiskyMH, schau es dir an!\n${url}",
	honeypot_dm_title: "Honeypot ausgelöst!",
	honeypot_dm_desc:
		"Eine Nachricht, die du im *Honeypot*-Kanal auf dem folgenden Server gesendet hast: **`${guild}`** **ausgelöst** den konfigurierten Schutz.\n\n__Gegen dich ergriffene Maßnahme:__ **`${action}`**\n\n*Nachrichten, die du in den letzten 2 Stunden gesendet hast, werden vom Server entfernt. Wenn du glaubst, dass dein Konto gehackt wurde, ändere dein Passwort und aktiviere 2FA auf deinem Discord-Konto. Wenn es nur ein Fehler deinerseits war, kontaktiere bitte das Server-Team, um das Problem zu lösen.*",
	honeypot_log_title: "Honeypot ausgelöst - ${action}",
	honeypot_log_field_author: "Autor",
	honeypot_log_field_channel: "Kanal",
	honeypot_log_field_message: "Gelöschte Nachricht",
	honeypot_log_field_attachments: "Anhänge",
	honeypot_log_field_stickers: "Sticker",
	honeypot_log_field_embeds: "Embeds",
	honeypot_log_field_deleted_messages: "Gelöschte Nachrichten",
	honeypot_log_field_triggered_messages: "Auslösende Nachrichten",
	honeypot_log_field_dm_status: "DM-Status",
	honeypot_log_field_result: "Ergebnis",
	honeypot_log_dm_open: "Zugestellt",
	honeypot_log_dm_closed: "Geschlossen oder nicht erreichbar",
	honeypot_log_no_content: "Kein Textinhalt",
	honeypot_log_action_ban: "Benutzer verboten",
	honeypot_log_action_kick: "Benutzer rausgeworfen",
	honeypot_log_action_none: "Keine Aktion ergriffen",

	// TTS Modul
	// /tts join, /tts leave, /tts info, /tts lang

	help_tts_fields: "TTS",
	help_tts_dsc:
		"> *Verwandle Text in Sprache in Sprachkanalen mit iHorizon!*",

	// /tts join
	tts_join_not_in_voice:
		"${emoji_No} Du musst mit einem Sprachkanal verbunden sein, um diesen Befehl zu verwenden!",
	tts_join_already_enabled:
		"${emoji_No} Das TTS-Modul ist auf diesem Server bereits aktiviert!",
	tts_join_music_playing:
		"${emoji_No} Auf diesem Server wird gerade Musik abgespielt. Bitte stoppe die Musik, bevor du TTS aktivierst.",
	tts_join_enabled:
		"${emoji_Yes} Der TTS-Modus wurde in ${voiceChannel} aktiviert!",
	tts_join_error:
		"${emoji_No} Beim Aktivieren des TTS-Modus ist ein Fehler aufgetreten.",
	tts_join_lang_fallback: "de-DE",

	// /tts leave
	tts_leave_not_active:
		"${emoji_No} Das TTS-Modul ist auf diesem Server derzeit nicht aktiv!",
	tts_leave_not_in_voice:
		"${emoji_No} Du musst im TTS-Sprachkanal sein, um es zu deaktivieren!",
	tts_leave_disabled:
		"${emoji_Yes} Der TTS-Modus wurde auf diesem Server deaktiviert!",

	// /tts info
	tts_info_embed_title: "TTS Modul Information",
	tts_info_embed_description:
		"Das TTS (Text-to-Speech) Modul ermoglicht es iHorizon, Nachrichten in einem Sprachkanal vorzulesen. Wenn aktiviert, wird jede Nachricht, die im konfigurierten Textkanal von Mitgliedern im Sprachkanal gesendet wird, von iHorizon vorgelesen.",
	tts_info_field_status: "Status",
	tts_info_field_lang: "TTS Sprache",
	tts_info_field_howto: "Verwendung",
	tts_info_howto_value:
		"Verwende `/tts join` um TTS in deinem Sprachkanal zu starten.\nVerwende `/tts leave` um TTS zu beenden.\nVerwende `/tts lang` um die Sprachstimme zu andern.",

	// /tts lang
	tts_lang_not_active:
		"${emoji_No} Das TTS-Modul ist auf diesem Server derzeit nicht aktiv!",
	tts_lang_set:
		"${emoji_Yes} Die TTS-Sprache wurde auf `${language}` gesetzt.",

	// TTS Embed
	tts_embed_title: "TTS-Modus Aktiviert",
	tts_embed_description:
		"Das TTS-Modul ist jetzt in ${voiceChannel} aktiv.\nAlle Nachrichten, die hier von Mitgliedern im Sprachkanal gesendet werden, werden vorgelesen.\n\n**Mitglieder im Sprachkanal:** ${members}",
	tts_embed_footer: "Verwende /tts leave um TTS zu beenden",
	tts_join_not_text_based:
		"${emoji_No} Dieser Sprachkanal unterstutzt keine Textnachrichten. Bitte aktiviere Text-im-Sprachkanal oder verwende einen anderen Sprachkanal.",
	tts_music_blocked:
		"${emoji_No} Das TTS-Modul ist derzeit aktiv. Bitte deaktiviere TTS, bevor du Musik abspielst.",
	tts_voice_status: "TTS-Modus - Sprachsynthese",

	// H24/7 module
	// /h247 join, /h247 leave

	help_h247_fields: "H24/7",
	help_h247_dsc:
		"> *Halte iHorizon rund um die Uhr mit einem Sprachkanal verbunden!*",

	// /h247 join
	h247_join_invalid_channel:
		"${emoji_No} Bitte gib einen gültigen Sprachkanal an!",
	h247_join_already_active:
		"${emoji_No} Das H24/7-Modul ist in ${voiceChannel} bereits aktiv!",
	h247_join_music_playing:
		"${emoji_No} Auf diesem Server wird gerade Musik abgespielt. Bitte stoppe die Musik, bevor du das H24/7-Modul aktivierst.",
	h247_join_tts_active:
		"${emoji_No} Das TTS-Modul ist derzeit in einem anderen Sprachkanal aktiv. Bitte deaktiviere TTS, bevor du das H24/7-Modul aktivierst.",
	h247_joined:
		"${emoji_Yes} iHorizon bleibt ab jetzt rund um die Uhr in ${voiceChannel} verbunden!",
	h247_join_error:
		"${emoji_No} Beim Aktivieren des H24/7-Moduls ist ein Fehler aufgetreten.",

	// /h247 leave
	h247_leave_not_active:
		"${emoji_No} Das H24/7-Modul ist auf diesem Server derzeit nicht aktiv!",
	h247_left:
		"${emoji_Yes} Das H24/7-Modul wurde auf diesem Server deaktiviert!",
	h247_leave_error:
		"${emoji_No} Beim Deaktivieren des H24/7-Moduls ist ein Fehler aufgetreten.",

	// /h247 info
	h247_info_embed_title: "H24/7-Modul Informationen",
	h247_info_embed_description:
		"Das H24/7-Modul hält iHorizon rund um die Uhr mit einem Sprachkanal verbunden, auch ohne laufende Musik. So bleibst du die Sprach-Aktivität deines Servers erhalten.\nSolange dieses Modul aktiv ist, können Musik und TTS nur im H24/7-Sprachkanal verwendet werden.\nDie Verbindung wird nach Neustarts oder Player-Herunterfahrten automatisch wiederhergestellt.",
	h247_info_field_status: "Status",
	h247_info_field_howto: "So wird es verwendet",
	h247_info_howto_value:
		"Verwende `/h247 join`, um iHorizon in einem Sprachkanal zu parken.\nVerwende `/h247 leave`, um das Modul zu deaktivieren.\nVerwende `/h247 info`, um dieses Panel anzuzeigen.",

	// /music play
	h247_play_refused:
		"${emoji_No} Das H24/7-Modul ist auf diesem Server aktiv. Verbinde dich mit dem H24/7-Sprachkanal, um Musik abzuspielen!",

	// /tts join
	h247_tts_refused:
		"${emoji_No} Das H24/7-Modul ist auf diesem Server aktiv. Verbinde dich mit dem H24/7-Sprachkanal, um TTS zu aktivieren!",
	gw_go_duration_too_low: "${emoji_No} | Die Mindestdauer beträgt 3 Minuten!"
} satisfies LanguageData;
