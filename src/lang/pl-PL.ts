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
	// pl-PL: Polish
	var_member: "Członkowie",
	var_user: "Użytkownik",
	var_author: "Autor",
	var_reason: "Powód",
	var_guild: "Serwer",
	var_sanction: "Kara",
	var_time: "Czas",
	var_message: "Wiadomość",
	var_no_set: "Nie ustawiono",
	var_none: "Brak",
	var_roles: "Role",
	var_names: "Nazwy",
	var_text_channel: "Kanał tekstowy",
	var_voice_channel: "Kanał głosowy",
	var_creator: "Twórca",
	var_doesnt_have_permissions:
		"Nie możesz tego zrobić. Potrzebujesz uprawnienia {permission}.",
	var_ihorizon: "iHorizon",
	var_developer: "Deweloper",
	var_chance: "Szczęście",
	var_other: "Inne",
	var_unknown: "Nieznane",
	var_secure: "Bezpieczne",
	var_unsecure: "Niezabezpieczone",
	var_prefix: "Prefiks",
	var_slash: "Slash",
	var_discord: "Discord",
	var_network: "Sieć",
	var_latency: "Opóźnienie",
	var_bot: "Bot",
	var_true: "Prawda",
	var_false: "Fałsz",
	var_enabled: "Włączone",
	var_disabled: "Wyłączone",
	var_yes: "Tak",
	var_no: "Nie",
	var_colour: "Kolor",
	var_length: "Długość",
	var_good: "Dobre",
	var_size: "Rozmiar",
	var_level: "Poziom",
	var_add: "Dodaj",
	var_remove: "Usuń",
	var_edit: "Edytuj",
	var_confirm: "Potwierdź",
	var_succes: "Sukces",
	var_page: "Strona",
	var_previous: "Poprzednia",
	var_next: "Następna",
	var_permission: "Uprawnienie",
	var_usage: "Użycie",
	var_aliases: "Aliasy",
	var_dont_have_perm:
		"Nie możesz tego zrobić, brakuje Ci uprawnienia {perm}!",
	var_price: "Cena",
	var_boost: "Boost",
	var_uses: "Użycia",
	var_vc_stats: "Statystyki",
	var_1d: "1 dzień",
	var_7d: "7 dni",
	var_14d: "14 dni",
	var_year: "rok/lata",
	var_mo: "mies.",
	var_w: "tydz.",
	var_d: "dni",
	var_h: "godz.",
	var_m: "min",
	var_s: "s",
	var_ms: "ms",
	var_banned_user: "Zbanowani użytkownicy",
	var_no_one_banned: "Na tym serwerze nikt nie jest zbanowany.",
	var_category: "Kategoria",
	var_total: "Łącznie",
	var_online_members: "Członkowie online",
	var_boost_level: "Poziom boosta",
	var_features: "Funkcje",
	var_guild_icon: "Ikona serwera",
	var_guild_banner: "Baner serwera",
	var_guild_splash: "Tło zaproszenia serwera",
	var_unknown_guild_name: "Nieznana nazwa serwera",
	var_preview: "Podgląd",
	var_form: "Formularz",
	var_original_message: "Oryginalna wiadomość",
	var_click_here: "Kliknij tutaj",
	var_s_message: "Wiadomość od {nickname}",
	var_source: "Muzyka z: ",
	var_online_call: "Na kanale głosowym",
	var_online: "Online",
	var_stream: "Transmituje",
	var_boosts: "Boosty",
	var_muted: "Wyciszony",
	var_camera: "Kamera włączona",
	perm_createinstantinvite_name: "Tworzenie zaproszeń",
	perm_kickmembers_name: "Wyrzucanie członków",
	perm_banmembers_name: "Banowanie członków",
	perm_administrator_name: "Administrator",
	perm_managechannels_name: "Zarządzanie kanałami",
	perm_manageguild_name: "Zarządzanie serwerem",
	perm_addreactions_name: "Dodawanie reakcji",
	perm_viewauditlog_name: "Wyświetlanie dziennika zdarzeń",
	perm_priorityspeaker_name: "Priorytetowy rozmówca",
	perm_stream_name: "Wideo",
	perm_viewchannel_name: "Wyświetlanie kanału",
	perm_sendmessages_name: "Wysyłanie wiadomości",
	perm_sendttsmessages_name: "Wysyłanie wiadomości TTS",
	perm_managemessages_name: "Zarządzanie wiadomościami",
	perm_embedlinks_name: "Osadzanie linków",
	perm_attachfiles_name: "Załączanie plików",
	perm_readmessagehistory_name: "Czytanie historii wiadomości",
	perm_mentioneveryone_name: "Wzmiankowanie @everyone",
	perm_useexternalemojis_name: "Używanie zewnętrznych emoji",
	perm_viewguildinsights_name: "Wyświetlanie statystyk serwera",
	perm_connect_name: "Łączenie",
	perm_speak_name: "Mówienie",
	perm_mutemembers_name: "Wyciszanie członków",
	perm_deafenmembers_name: "Ogłuszanie członków",
	perm_movemembers_name: "Przenoszenie członków",
	perm_usevad_name: "Wykrywanie aktywności głosowej",
	perm_changenickname_name: "Zmiana pseudonimu",
	perm_managenicknames_name: "Zarządzanie pseudonimami",
	perm_manageroles_name: "Zarządzanie rolami",
	perm_managewebhooks_name: "Zarządzanie webhookami",
	perm_manageemojisandstickers_name: "Zarządzanie emoji i naklejkami",
	perm_manageguildexpressions_name: "Zarządzanie ekspresjami serwera",
	perm_useapplicationcommands_name: "Używanie komend aplikacji",
	perm_requesttospeak_name: "Prośba o głos",
	perm_manageevents_name: "Zarządzanie wydarzeniami",
	perm_managethreads_name: "Zarządzanie wątkami",
	perm_createpublicthreads_name: "Tworzenie wątków publicznych",
	perm_createprivatethreads_name: "Tworzenie wątków prywatnych",
	perm_useexternalstickers_name: "Używanie zewnętrznych naklejek",
	perm_sendmessagesinthreads_name: "Wysyłanie wiadomości w wątkach",
	perm_useembeddedactivities_name: "Używanie aktywności",
	perm_moderatemembers_name: "Wyciszanie członków (timeout)",
	perm_viewcreatormonetizationanalytics_name:
		"Wyświetlanie analityki monetyzacji twórców",
	perm_usesoundboard_name: "Używanie soundboardu",
	perm_createguildexpressions_name: "Tworzenie ekspresji serwera",
	perm_createevents_name: "Tworzenie wydarzeń",
	perm_useexternalsounds_name: "Używanie zewnętrznych dźwięków",
	perm_sendvoicemessages_name: "Wysyłanie wiadomości głosowych",
	perm_sendpolls_name: "Tworzenie ankiet",
	perm_useexternalapps_name: "Używanie zewnętrznych aplikacji",
	ticket_disabled_command:
		"Nie możesz użyć tej komendy, ponieważ administrator ją wyłączył",
	add_disabled_command:
		"Nie możesz użyć tej komendy, ponieważ administrator ją wyłączył",
	add_command_work: "Pomyślnie dodano ${memberTag} do Twojego ticketu!",
	add_command_error: "Wystąpił błąd, spróbuj ponownie",
	close_disabled_command:
		"Nie możesz użyć tej komendy, ponieważ administrator ją wyłączył",
	close_title_sourcebin: "Transkrypcja ticketu od iHorizon",
	close_description_sourcebin: " ",
	close_error_command: "Wystąpił błąd, spróbuj ponownie!",
	close_command_work_channel:
		"Właśnie zamknąłeś swój ticket. iHorizon wysłał Ci transkrypcję",
	close_command_work_notify_channel: "Ticket został pomyślnie zamknięty!",
	close_command_error: "Wystąpił błąd, spróbuj ponownie!",
	close_not_in_ticket: "Nie możesz użyć tej komendy poza kanałem ticketu!",
	delete_disabled_command:
		"Nie możesz użyć tej komendy, ponieważ administrator ją wyłączył",
	delete_not_in_ticket: "Nie możesz użyć tej komendy poza kanałem ticketu!",
	ticket_deleted:
		"Ticket ${ticketOwnerMention} został usunięty przez <@${deletedByUserId}>. Oto transkrypcja:",
	sethereticket_panel_select_embed_desc:
		"# Nazwa panelu\n```${panelName}```\n{msg}\n\n## Kategoria\n```{category}```\n",
	open_disabled_command:
		"Nie możesz użyć tej komendy, ponieważ administrator ją wyłączył",
	open_command_work: "Pomyślnie ponownie otwarto ${channel}.",
	open_command_error: "Wystąpił błąd, spróbuj ponownie!",
	open_not_in_ticket: "Nie możesz użyć tej komendy poza kanałem ticketu!",
	remove_disabled_command:
		"Nie możesz użyć tej komendy, ponieważ administrator ją wyłączył",
	remove_not_in_ticket: "Nie możesz użyć tej komendy poza kanałem ticketu!",
	remove_command_error: "Wystąpił błąd, spróbuj ponownie",
	remove_command_work: "Pomyślnie usunięto ${memberTag} z Twojego ticketu!",
	transript_disabled_command:
		"Nie możesz użyć tej komendy, ponieważ administrator ją wyłączył!",
	transript_name_sourcebin: " ",
	transript_title_sourcebin: "Transkrypcja ticketu dla ${channelName}",
	transript_command_error: "Wystąpił błąd, spróbuj ponownie!",
	transript_command_work:
		"Zamknąłeś swój ticket. iHorizon wysłał Ci transkrypcję zawartości Twojego ticketu.",
	transript_not_in_ticket:
		"Nie możesz użyć tej komendy poza kanałem ticketu!",
	disableticket_not_admin:
		":x: | Musisz być administratorem tego serwera, aby użyć tej komendy!",
	disableticket_logs_embed_title_disable: "Wyłączenie logów ticketów",
	disableticket_logs_embed_description_disable:
		"<@${authorId}> wyłączył komendy ticketów!",
	disableticket_command_work_disable: "Pomyślnie wyłączono komendy ticketów!",
	disableticket_logs_embed_title_enable: "Włączenie logów ticketów",
	disableticket_logs_embed_description_enable:
		"<@${authorId}> włączył komendy ticketów!",
	disableticket_command_work_enable: "Pomyślnie włączono komendy ticketów!",
	setticketcategory_not_admin:
		":x: | Musisz być administratorem tego serwera, aby użyć tej komendy!",
	setticketcategory_disabled_command:
		"Nie możesz użyć tej komendy, ponieważ administrator wyłączył komendy ticketów!",
	setticketcategory_not_a_category:
		"Podany kanał nie jest kategorią, spróbuj ponownie.",
	setticketcategory_command_work:
		"<@${authorId}>, ustawiłeś kategorię kanałów ticketów na `${categoryName}`!",
	ticket_logchannel_embed_title: "Kanał logów ticketów",
	ticket_logchannel_embed_desc:
		"${author}, ustawiłeś kanał logów modułu ticketów na ${channel}!",
	ticket_panel_default_placeholder: "Wybierz kategorię, aby otworzyć ticket",
	ticket_panel_embed_title: "Panel ticketów #",
	ticket_panel_embed_desc:
		"Dostosuj embed ticketu za pomocą wybranych opcji.",
	ticket_panel_saved_conf: "💾 Zapisana konfiguracja",
	ticket_panel_related_embed: "🕸️ Powiązany embed",
	ticket_panel_role_to_ping: "📌 Rola do pingowania",
	ticket_panel_ping_user: "📎 Pingowany użytkownik",
	ticket_panel_placeholder: "🏷️ Placeholder",
	ticket_panel_category: "📤 Kategoria",
	ticket_panel_option_fields: "📔 Pola opcji",
	ticket_panel_form: "📝 Formularz",
	ticket_panel_panel_placeholder: "Wybierz opcje",
	ticket_panel_panel_1_label: "Zapisz bieżącą konfigurację",
	ticket_panel_panel_2_label: "Pokaż podgląd",
	ticket_panel_panel_3_label: "Zmień powiązany embed",
	ticket_panel_panel_4_label: "Dodaj/usuń rolę do pingowania",
	ticket_panel_panel_5_label: "Zmień placeholder",
	ticket_panel_panel_6_label: "Zmień kategorię",
	ticket_panel_panel_7_label: "Zmień pingowanego użytkownika",
	ticket_panel_panel_8_label: "Dodaj/usuń pola opcji",
	ticket_panel_panel_9_label: "Zmień formularz",
	ticket_panel_button_send: "Wyślij embed",
	ticket_panel_change_category_channelSelect_placeholder: "Wybierz kategorię",
	ticket_panel_select_channel_to_send: "Wybierz kanał, na który wysłać embed",
	ticket_panel_change_placeholder_modal_title: "Zmień placeholder",
	ticket_panel_change_placeholder_modal_placeholder: "Nowy placeholder",
	ticket_panel_need_save_config:
		"Musisz zapisać bieżącą konfigurację przed wysłaniem embeda.",
	ticket_panel_need_1_option:
		"Potrzebujesz co najmniej jednej opcji, aby wysłać embed.",
	ticket_panel_related_embed_dont_exist: "Powiązany embed nie istnieje",
	ticket_panel_channel_error:
		"Kanał nie istnieje lub nie mam uprawnień do wysyłania w nim wiadomości.",
	ticket_panel_embed_been_send: "Embed został wysłany na kanał.",
	ticket_panel_successfully_saved: "Konfiguracja została pomyślnie zapisana",
	ticket_panel_change_role_roleSelect_placeholder: "Wybierz rolę",
	ticket_panel_change_role_interaction_content:
		"Wybierz rolę, która będzie pingowana po otwarciu ticketu.",
	ticket_panel_change_embed_modal_title: "Zmień powiązany embed",
	ticket_panel_change_embed_modal_placeholder: "ID embeda",
	ticket_panel_change_embed_dont_exist: "Embed nie istnieje",
	ticket_panel_change_option_select_placeholder: "Wybierz opcję",
	ticket_panel_change_option_select_1_label: "Dodaj nowe pole opcji",
	ticket_panel_change_option_select_2_label: "Usuń pole opcji",
	ticket_panel_change_option_interaction_content:
		"Wybierz opcję, aby dodać lub usunąć pola opcji",
	ticket_panel_add_option_max_10: "Nie możesz dodać więcej niż 10 pól opcji",
	ticket_panel_add_option_modal_title: "Dodaj pole opcji",
	ticket_panel_add_option_modal_field1_label: "Nazwa",
	ticket_panel_add_option_modal_field2_label: "Opis",
	ticket_panel_add_option_modal_field3_label: "Emoji",
	ticket_panel_remove_option_empty: "Brak pól opcji do usunięcia",
	ticket_panel_remove_option_select_placeholder: "Wybierz opcję do usunięcia",
	ticket_panel_rempve_option_interaction_content:
		"Wybierz opcję do usunięcia",
	ticket_panel_change_form_select_placeholder_1: "Dodaj pole formularza",
	ticket_panel_change_form_select_placeholder_2: "Usuń pole formularza",
	ticket_panel_change_form_interaction_content:
		"Wybierz opcję, aby dodać lub usunąć pola formularza",
	ticket_panel_add_form_max_3: "Nie możesz dodać więcej niż 3 pól formularza",
	ticket_panel_add_form_modal_title: "Dodaj pole formularza",
	ticket_panel_add_form_modal_field1_label: "Tytuł pytania",
	ticket_panel_add_form_modal_field2_label: "Placeholder pytania",
	ticket_panel_preview_message: "Podgląd panelu ticketów",
	ticket_panel_option_change_category: "Wybierz opcję, aby zmienić kategorię",
	ticket_panel_panel_10_label: "Zmień kategorię dla jednej wybranej opcji",
	ticket_panel_channel_panel_embed_id: "ID embeda kanału ticketu",
	ticket_panel_panel_11_label: "Zmień embed kanału ticketu",
	ticket_panel_select_user: "Menu dodawania członków do ticketu",
	ticket_panel_button_delete: "Przycisk usuwania ticketu",
	ticket_panel_button_transcript: "Przycisk tworzenia transkrypcji",
	ticket_panel_panel_12_label:
		"Pokaż menu dodawania/usuwania członków z ticketu",
	ticket_panel_panel_13_label: "Pokaż przycisk usuwania ticketu",
	ticket_panel_panel_14_label: "Pokaż przycisk transkrypcji",
	ticket_panel_tip_about_variable1:
		"${emoji_VC_OpenChat} **Wiedziałeś?** Gdy używasz `/utils embed`, aby wygenerować embed, możesz dodać zmienną **`{category}`**, która zostanie zastąpiona kategorią wybraną przez użytkownika.",
	ticket_panel_no_question_to_delete: "Brak pytań do usunięcia.",
	ticket_panel_chose_a_question: "Wybierz pytanie",
	ticket_panel_select_question_to_delete: "Wybierz pytanie do usunięcia.",
	ticket_panel_panel_15_label: "Skonfiguruj embed dla każdej opcji",
	ticket_panel_panel_16_label: "Skonfiguruj formularz dla każdej opcji",
	ticket_panel_panel_17_label:
		"Skonfiguruj role do pingowania dla każdej opcji",
	ticket_panel_mode: "⚙️ Tryb",
	ticket_panel_mode_simple: "Prosty",
	ticket_panel_mode_advanced: "Zaawansowany",
	ticket_panel_mode_simple_desc:
		"Jeden przycisk otwiera ticket, bez wyboru i pytań.",
	ticket_panel_mode_advanced_desc:
		"Menu z opcjami, ustawieniami dla każdej opcji i formularzami.",
	ticket_panel_panel_18_label: "Przełącz tryb (prosty / zaawansowany)",
	ticket_panel_simple_default_title: "Wsparcie",
	ticket_panel_simple_default_desc:
		"Potrzebujesz pomocy? Kliknij przycisk poniżej, aby otworzyć ticket.",
	ticket_panel_manage_form_title:
		"Zarządzaj formularzem dla opcji: **${optionName}**",
	ticket_panel_change_embed_options:
		"Wybierz opcję, aby edytować ID embeda panelu kanału.",
	ticket_panel_change_embed_options_null:
		"Brak opcji do edycji ID embeda panelu kanału.",
	ticket_panel_change_embed_options_chose:
		"Wybierz kategorię, aby edytować ID panelu kanału.",
	ticket_panel_add_a_question: "Dodaj pytanie",
	ticket_panel_remove_a_question: "Usuń pytanie",
	ticket_panel_option_invalid: "❌ Nieprawidłowa opcja.",
	ticket_panel_chose_option_to_form:
		"Wybierz opcję, aby skonfigurować jej formularz.",
	var_chose_option: "Wybierz opcję",
	ticket_panel_saved_and_sended_panel:
		"Panel ticketów #${panelCode} został pomyślnie wysłany na ${channel}. Zachowaj gdzieś ten kod na wypadek, gdybyś musiał zmodyfikować panel.",
	var_title: "Tytuł",
	var_action: "Akcja",
	ticket_rename_ok: "Kanał ticketu został przemianowany!",
	ticket_rename_error: "Błąd podczas zmiany nazwy kanału tekstowego",
	ticket_unlink_command_ok:
		"${emoji_Yes} | **Kanał został odłączony od modułu ticketów.**",
	ticket_unlink_panel_edited_content:
		"Ten kanał był dawnym ticketem. Użytkownik {user} odłączył ten kanał.",
	ticket_remind_embed_title: "Ojej! Przypomnienie o tickecie",
	ticket_remind_embed_desc:
		"Nie byłeś zbyt aktywny, nic się nie stało, ale Twój ticket wciąż jest w trakcie obsługi! Wpadnij i odpowiedz!",
	ticket_remind_embed_fields_1_name: "Ostatnia odpowiedź",
	ticket_remind_command_ok:
		"Wysłałem użytkownikowi wiadomość z przypomnieniem.",
	var_never: "Nigdy",
	disablexp_not_admin:
		":x: | Musisz być administratorem tego serwera, aby użyć tej komendy!",
	disablexp_logs_embed_title_disable: "Wyłączenie logów XP",
	disablexp_logs_embed_description_disable: "<@${authorId}> wyłączył XP!",
	disablexp_command_work_disable: "Pomyślnie wyłączono XP.",
	disablexp_logs_embed_title_enable: "Włączenie logów XP",
	disablexp_logs_embed_description_enable: "<@${authorId}> włączył XP!",
	disablexp_command_work_enable: "Pomyślnie włączono XP.",
	disablexp_command_work_disable_entierly:
		"Pomyślnie wyłączono moduł rang! (Koniec wiadomości, a użytkownicy nie będą zdobywać poziomów)",
	setxpchannels_not_admin:
		":x: | Musisz być administratorem tego serwera, aby użyć tej komendy!",
	setxpchannels_logs_embed_title_disable: "Logi SetXpChannels",
	setxpchannels_logs_embed_description_disable:
		"<@${authorId}> wyłączył niestandardowe kanały XP i przywrócił ustawienia domyślne.",
	setxpchannels_already_disabled_disable:
		"Niestandardowe kanały XP są już wyłączone!",
	setxpchannels_command_work_disable:
		"Pomyślnie wyłączono niestandardowy kanał XP!",
	setxpchannels_command_error_disable:
		"Błąd: brak uprawnień lub kanał nie istnieje",
	setxpchannels_logs_embed_title_enable: "Logi SetXpChannels",
	setxpchannels_logs_embed_description_enable:
		"<@${authorId}> ustawił niestandardowe kanały XP na: <#${argsid}>",
	setxpchannels_valid_channel_message:
		"Musisz podać prawidłowy kanał dla swojej konfiguracji.",
	setxpchannels_already_with_this_config:
		"Niestandardowe kanały XP są już skonfigurowane z tym ID kanału!",
	setxpchannels_confirmation_message:
		"**Niestandardowy kanał XP ustawiony tutaj!**",
	setxpchannels_command_work_enable:
		"Pomyślnie ustawiono niestandardowy kanał XP na <#${argsid}>",
	setxpchannels_command_error_enable:
		"Błąd: brak uprawnień lub kanał nie istnieje",
	level_embed_title: "__**Poziom XP**__: `${userUsername}`",
	level_embed_fields1_name: ":arrow_up:・__Poziomy:__",
	level_embed_fields1_value: "`${currentxp}/${xpNeeded}`",
	level_embed_fields2_name: ":money_with_wings:・__Doświadczenie:__",
	level_embed_fields2_value: "`${level}`",
	level_embed_description:
		"`${expNeededForLevelUp}` **punktów doświadczenia do następnego poziomu!**",
	level_xp_needed_for_new_level: "XP do następnego poziomu:",
	level_xp_total: "Łącznie XP:",
	ranks_leaderboard_top_txt: "Top #${i}",
	ranks_leaderboard_top_txt_raw: "Top #${i} ${rawText}\n",
	ranks_leaderboard_txt_text:
		"👤 ${user} `(${userGlobalName})`\n⭐ ➥ **Poziom**: `${level}`\n🔱 ➥ **XP łącznie**: `${xpTotal}`",
	ranks_leaderboard_embed_title: "🏆 Serwerowy ranking legend",
	ranks_leaderboard_embed_footer:
		"Strona ${cPage} z ${totalPages} • Ranking według łącznego XP",
	ranks_ignorechannels_embed_title: "Konfiguracja modułu rang",
	ranks_ignorechannels_embed_desc:
		"Gdy na jednym z tych kanałów zostaną wysłane nowe wiadomości, moduł rang je ignoruje.",
	ranksSetMessage_not_admin:
		":x: | Musisz być administratorem tego serwera, aby użyć tej komendy!",
	ranksSetMessage_help_embed_title: "Pomoc do /ranks set-message!",
	ranksSetMessage_help_embed_description: "/ranks set-message",
	ranksSetMessage_help_embed_fields_name: "Jak używać?",
	ranksSetMessage_logs_embed_title_on_enable: "Logi RanksSetMessage",
	ranksSetMessage_logs_embed_description_on_enable:
		"<@${authorId}> ustawił wiadomość rang!",
	ranksSetMessage_command_work_on_enable:
		"${emoji_GreenTick} | Pomyślnie ustawiono wiadomość rang.",
	ranksSetMessage_logs_embed_title_on_disable: "Logi RanksSetMessage",
	ranksSetMessage_logs_embed_description_on_disable:
		"<@${authorId}> usunął wiadomość rang!",
	ranksSetMessage_command_work_on_disable:
		"${emoji_Yes} | Pomyślnie usunięto niestandardową wiadomość rang.",
	ranksSetMessage_command_work_ls: "Wiadomość rang to:",
	ranksSetMessage_help_embed_fields_custom_name: "Wiadomość niestandardowa",
	ranksSetMessage_help_embed_fields_custom_name_empy: "Nie ustawiono!",
	ranksSetMessage_help_embed_fields_default_name_empy: "Wiadomość domyślna",
	ranksSetMessage_help_embed_desc:
		"{memberUsername} => Nazwa użytkownika członka\n{memberMention} => Wzmianka o członku\n{memberCount} => Liczba członków serwera\n{guildName} => Nazwa serwera\n{createdAt} => Data utworzenia konta w formacie dd/mm/rrrr\n{xpLevel} => Poziom XP użytkownika\n{accountCreationTimestamp} => Znacznik czasu utworzenia konta",
	ranksSetMessage_button_set_name: "Ustaw wiadomość",
	ranksSetMessage_buttom_del_name: "Wiadomość domyślna",
	ranksSetMessage_awaiting_response:
		"Napisz nową niestandardową wiadomość rang.",
	ranksSetMessage_embed_fields_xpmessage: "Wiadomość rang",
	reset_uranks_are_you_sure:
		"**Czy na pewno chcesz usunąć wszystkie dane rang?\nTa akcja jest trwała i nie można jej cofnąć.**\n**Ta akcja jest destrukcyjna!!**",
	reset_uranks_logs_embed_title: "Logi modułu rang (NIEBEZPIECZNA AKCJA)",
	reset_uranks_logs_embed_desc:
		"${author} usunął wszystkie dane modułu rang dla ${user}!",
	ranks_config_embed_title: "🏆 Konfiguracja ról rang",
	ranks_config_embed_desc:
		"Dostosuj nagrody w postaci ról za XP na swoim serwerze!",
	ranks_config_autofields_name: "🌟 Poziom ${level}",
	ranks_config_autofields_value:
		"Rola: <@&${roleId}>\n🔓 Odblokowana na poziomie ${level}",
	ranks_config_nofields_name: "🚫 Nie skonfigurowano ról",
	ranks_config_nofields_value:
		"Skonfiguruj role rang, aby nagradzać aktywnych członków!",
	ranks_config_help_footer:
		"Strona ${currentPage} z ${totalPage} • Łącznie rang: ${totalRanks}",
	ranks_config_btn_add_name: "Dodaj rolę",
	ranks_config_btn_remove_name: "Usuń rolę",
	ranks_config_add_max_roles: "Osiągnięto maksymalną liczbę ról rang (25).",
	ranks_config_add_role_menu_placeholder: "Wybierz rolę",
	ranks_config_awaiting1_response:
		"Wybierz rolę, którą chcesz przypisać do konkretnego poziomu.",
	ranks_config_add_modal_title: "Ustaw poziom dla roli",
	ranks_config_add_modal_fields1_placeholder: "Wymagany poziom",
	ranks_config_add_invalid_level:
		"Nieprawidłowy poziom! Podaj liczbę dodatnią.",
	ranks_config_add_invalid_role:
		"Rola {role} już istnieje. Rola może być przypisana tylko do jednego poziomu.",
	ranks_config_add_command_work:
		"Dodano rolę ${selectedRole} dla poziomu ${level}!",
	ranks_config_add_command_warn:
		"# WARN ⚠️ Uwaga: rola ${selectedRole} ma następujące wrażliwe uprawnienia:\n\n${_}",
	ranks_config_remove_no_rank: "Brak skonfigurowanych ról rang do usunięcia.",
	ranks_config_var_level: "Poziom {level}",
	ranks_config_remove_string_menu_desc: "Usuń rolę z poziomu ${level}",
	ranks_config_remove_string_menu1_placeholder: "Wybierz rolę do usunięcia",
	ranks_config_remove_awaiting_response: "Wybierz rolę, którą chcesz usunąć.",
	ranks_config_remove_command_work:
		"Rola dla poziomu ${levelToRemove} została usunięta!",
	owner_not_owner:
		"Nie jesteś właścicielem projektu iHorizon. Nie możesz użyć tej komendy.",
	owner_already_owner: "Ten użytkownik jest już właścicielem!",
	owner_is_now_owner:
		"${memberUsername} jest teraz właścicielem projektu iHorizon!",
	unowner_not_owner:
		"Nie jesteś właścicielem projektu iHorizon. Nie możesz użyć tej komendy.",
	unowner_cant_unowner_creator:
		"Nie można usunąć tego użytkownika; jest twórcą projektu iHorizon.",
	unowner_command_work: "${memberUsername} nie jest już właścicielem",
	blacklist_not_owner:
		"Nie jesteś właścicielem projektu iHorizon. Nie możesz użyć tej komendy.",
	blacklist_bot_lol: "Nie mogę dodać siebie na czarną listę x)",
	blacklist_cant_blacklist_owner:
		"Tylko deweloperzy iHorizon mogą dodać właściciela bota na czarną listę.",
	blacklist_command_work: "${memberUsername} jest teraz na czarnej liście",
	blacklist_blacklisted_but_can_ban_him:
		"${emoji_No} jest teraz na czarnej liście. Nie mogę tu zbanować tego członka, brak uprawnień?",
	blacklist_already_blacklisted:
		"${memberUsername} jest już na czarnej liście!",
	blacklist_no_one_blacklist:
		"${emoji_No} Nie znaleziono użytkowników na czarnej liście!",
	blacklist_var_no_reason: "Nie podano powodu",
	blacklist_embed_title: "Czarna lista - strona ${page}",
	blacklist_command_work_shard:
		"✅ ${username} zbanowany na **${totalSuccess}** serwerach na wszystkich shardach (`{score}`)",
	unblacklist_not_owner:
		"Nie jesteś właścicielem projektu iHorizon. Nie możesz użyć tej komendy.",
	unblacklist_command_work: "<@${memberId}> nie jest już na czarnej liście",
	unblacklist_not_blacklisted: "<@${memberId}> nie był na czarnej liście",
	unblacklist_unblacklisted_but_can_unban_him:
		"${emoji_No} został usunięty z czarnej listy, ale nie mogę tu odbanować tego członka; brak uprawnień lub już odbanowany?",
	unblacklist_user_is_not_exist: "Nie znalazłem użytkownika.",
	unblacklist_command_work_across_all_shard:
		"✅ ${bannedMemberUsername} jest teraz odbanowany na **${totalSuccess}** serwerach na wszystkich shardach (`${score}`)",
	addinvites_confirmation_embed_description:
		"Dodano ${amount} zaproszeń dla ${user}",
	addinvites_logs_embed_title: "Logi menedżera zaproszeń",
	addinvites_logs_embed_description:
		"<@${authorId}> dodał ${amount} zaproszeń dla <@${userId}>!",
	removeinvites_not_admin_embed_description:
		"Musisz być administratorem, aby użyć tej komendy!",
	removeinvites_confirmation_embed_description:
		"Usunięto ${amount} zaproszeń dla ${user}",
	removeinvites_logs_embed_title: "Logi menedżera zaproszeń",
	removeinvites_logs_embed_description:
		"<@${authorId}> usunął ${amount} zaproszeń z konta <@${userId}>!",
	resetallinvites_warning_msg:
		"**Czy na pewno chcesz usunąć wszystkie dane menedżera zaproszeń?\nTa akcja jest trwała i nie można jej cofnąć.**\n**Ta akcja jest destrukcyjna!!**",
	resetallinvites_yes_button: "Usuń wszystko",
	resetallinvites_no_button: "Cofnij akcję",
	resetallinvites_succes_on_delete: "Pomyślnie usunięto!",
	resetallinvites_logs_embed_title:
		"Logi menedżera zaproszeń (NIEBEZPIECZNA AKCJA)",
	resetallinvites_logs_embed_desc:
		"${author} usunął wszystkie dane menedżera zaproszeń!",
	links_message: "Kliknij poniższe linki, aby dowiedzieć się o mnie więcej!",
	links_website: "Moja strona",
	links_gitlab: "Mój GitLab",
	botinfo_embed_fields_myname: "Moja nazwa:",
	botinfo_embed_fields_mychannels: "Moje kanały:",
	botinfo_embed_fields_myservers: "Moje serwery:",
	botinfo_embed_fields_members: "Członkowie:",
	botinfo_embed_fields_libraires: "Biblioteki:",
	botinfo_embed_fields_created_at: "Utworzony:",
	botinfo_embed_fields_created_by: "Twórca:",
	invite_embed_title: "Dziękuję za dodanie iHorizon!",
	invite_embed_description: "Kocham Cię; odwzajemnij to, zapraszając mnie!",
	kisakay_message:
		"${emoji_Sparkles} Kisakay jest zarówno moją twórczynią, jak i deweloperką. To dzięki niej i jej klawiaturze powstałem. Jestem jej głęboko wdzięczny!✨ ❤️❤️",
	andru_message:
		'Andru jest współpracownikiem i deweloperem. „Złota rączka", zajmuje się marketingiem, społecznością...',
	ether_message:
		"${emoji_Sparkles} Ether był współtwórcą i członkiem zespołu projektu iHorizon. Stworzył dokumentację iHorizon oraz skrypt instalacyjny iHorizon, a także zajmował się tłumaczeniami bota, aby były (prawie) idealne! Odszedł <t:1785567600:f>.",
	irisweb_message:
		"😼 IrisWeb jest moim drugim deweloperem/współtwórcą, IrisWeb x Kisakay ❤️",
	pong_message: "【:ballot_box_with_check:】__**Pong**__ : ",
	status_be_bot_dev: ":x: | **Musisz być deweloperem bota, aby to zrobić!**",
	help_tip_embed:
		"```${botName} ・ Menu pomocy```\n${emoji_Pin} ・ **${categorieCount}** dostępnych kategorii komend\n${emoji_Slash_Bot_Badge} ・ **${slashCount}** dostępnych komend slash\n${emoji_Crown} ・ **Stworzony przez** <@${owner1}>, <@${owner2}>\n\n```Wiedziałeś? ・ Porady```\n${emoji_VC_Region} ・ ${botName} jest **w 100% wielojęzyczny**\n${emoji_Slash_Bot_Badge} ・ `/setlang language:Japanese`",
	help_mod_fields: "Moderacja",
	help_ranks_fields: "Rangi",
	help_fun_fields: "Zabawa",
	help_utils_fields: "Narzędzia",
	help_giveaway_fields: "Konkursy",
	help_bot_fields: "Bot",
	help_music_fields: "Muzyka",
	help_backup_fields: "Kopie zapasowe",
	help_guildconf_fields: "Konfiguracja serwera",
	help_prof_fields: "Personalizacja profilu",
	help_economy_fields: "Ekonomia",
	help_owner_fields: "Właściciel",
	help_roler_fields: "Role za reakcje",
	help_invitem_fields: "Menedżer zaproszeń",
	help_ticket_fields: "Tickety",
	help_memberc_fields: "Licznik członków",
	help_newftrs_fields: "Nowa funkcja",
	help_mod_dsc:
		"> *Moderuj swój serwer Discord bez stresu dzięki komendom iHorizon.*",
	help_ranks_dsc:
		"> *Baw się, śledząc swój poziom doświadczenia, aby zobaczyć, kto jest najbardziej aktywny na serwerze!*",
	help_fun_dsc:
		"> *Nudzisz się na Discordzie? Ta kategoria jest dla Ciebie! iHorizon przywróci uśmiech na Twojej twarzy!*",
	help_utils_dsc:
		"> *Potrzebujesz konkretnych komend, które przydają się w niektórych sytuacjach? Proszę bardzo!*",
	help_giveaway_dsc:
		"> *Czujesz się hojnie? Chcesz dać coś swojej społeczności? Oto komendy, które Ci w tym pomogą!*",
	help_bot_dsc:
		"> *Jesteś ciekawy i chcesz dowiedzieć się o mnie więcej? Te komendy są właśnie po to!*",
	help_music_dsc: "> *Lubisz muzykę? Mam coś dla Ciebie :)*",
	help_backup_dsc:
		"> *Potrzebujesz szybkiej kopii zapasowej serwera? Jestem tu!*",
	help_guildconf_dsc:
		"> *Szukasz zaawansowanej i łatwej w ustawieniu konfiguracji? Jestem tu :3*",
	help_prof_dsc:
		"> *Dbasz o swój wygląd? Oto komendy, dzięki którym będziesz mieć wspaniały profil wśród użytkowników :)*",
	help_economy_dsc:
		"> *Dbasz o swój portfel? A może po prostu chcesz robić zakupy? Jestem tu :)*",
	help_owner_dsc:
		"> *Ta kategoria jest zarezerwowana dla właścicieli i administratorów projektu iHorizon!*",
	help_roler_dsc:
		"> *Chcesz ustawić role za reakcje na swoim serwerze? Jestem tu!*",
	help_invitem_dsc: "> *Chcesz sprawdzić zaproszenia członka? To tutaj!*",
	help_ticket_dsc:
		"> *Chcesz utworzyć ticket lub użyć jednej z moich funkcji w jego wnętrzu? Oczywiście!*",
	help_memberc_dsc:
		"> *Chcesz ustawić kanały głosowe z licznikiem członków? Oczywiście :smile:*",
	help_newftrs_dsc: "> *Oto kilka nowych i bardzo ciekawych funkcji!*",
	help_not_for_you: "Ta interakcja nie jest dla Ciebie",
	help_protection_fields: "Ochrona",
	help_protection_dsc:
		"> *Uniemożliwiaj użytkownikom spoza białej listy wykonywanie niektórych akcji, aby chronić serwer.*",
	help_suggestion_fields: "Sugestie",
	help_suggestion_dsc:
		"> *Daj swoim użytkownikom możliwość wypowiedzenia się i zgłaszania sugestii na dedykowanym kanale!*",
	help_security_fields: "Bezpieczeństwo",
	help_security_dsc:
		"> *Wymagaj od nowych członków rozwiązania captchy, aby zabezpieczyć dostęp do serwera.*",
	help_schedule_fields: "Harmonogram",
	help_schedule_dsc:
		"> *Twórz przypomnienia z zaplanowanymi wiadomościami, które bot wyśle Ci w wiadomości prywatnej*",
	help_pfps_fields: "PFPS",
	help_pfps_dsc: "> *Wyślij na kanale losowy awatar użytkownika!*",
	help_voicedashboard_fields: "VoiceDashboard",
	help_voicedashboard_dsc:
		"> *Utwórz własny tymczasowy kanał głosowy z interfejsem!*",
	help_select_menu: "Dokonaj wyboru!",
	help_select_menu_fields_desc: "Komendy: ${commandCount}",
	help_back_to_menu: "Menu główne",
	help_back_to_menu_desc: "Wróć do menu początkowego",
	help_confession_dsc:
		"> *Masz coś do wyznania? Świetnie, nieważne jak haniebne, iHorizon jest tu dla Ciebie!*",
	help_confession_fields: "Wyznania",
	help_antispam_dsc:
		"> *Masz dość spamu? Świetnie! iHorizon jest tu, aby moderować spam!*",
	help_antispam_fields: "AntiSpam",
	help_stats_fields: "Statystyki użytkownika",
	help_stats_dsc:
		"> *Zobacz liczbę wiadomości i aktywność głosową użytkownika na serwerze*",
	help_notifier_dsc:
		"> *Otrzymuj powiadomienia, gdy YouTuber lub streamer opublikuje film!*",
	help_notifier_fields: "Powiadomienia",
	help_authrestore_fields: "AuthRestore",
	help_authrestore_dsc:
		"> *Weryfikuj członków serwera przez OAuth2. Jeśli Twój serwer zostanie zaatakowany lub usunięty, odzyskasz dawnych członków!*",
	help_tags_fields: "Własne tagi",
	help_tags_dsc:
		"> *Twórz wiadomości-tagi dla swojego serwera i używaj ich na serwerze!*",
	help_starboard_dsc:
		"> *Zobacz najczęściej oznaczane gwiazdką wiadomości na serwerze Discord.*",
	help_starboard_fields: "StarBoard",
	help_blogger_dsc:
		"> *Śledź swoje ulubione kanały RSS i otrzymuj powiadomienia o nowych artykułach przez iHorizon.*",
	help_blogger_fields: "Blogger",
	help_lastfm_dsc:
		"> *Połącz swoje konto Last.fm i automatycznie scrobbluj utwory odtwarzane przez iHorizon, gdy jesteś na kanale głosowym.*",
	help_lastfm_fields: "Scrobbler LastFM",
	help_honeypot_fields: "Honeypot",
	help_honeypot_dsc:
		"> *Ustaw kanał-pułapkę, aby łapać przejęte konta i automatycznie czyścić świeży spam na całym serwerze.*",
	h_suite: "(Ciąg dalszy)",
	h_suite_desc: "*Dalszy ciąg komend kategorii*",
	helpall_no_perms_defined:
		"Na tym serwerze nie zdefiniowano niestandardowych uprawnień, więc `helpall` jest tu bezużyteczne — użyj zamiast tego `${botPrefix}h`.",
	helpall_no_access:
		"Nie masz dostępu do żadnej komendy wymagającej uprawnień na tym serwerze.",
	say_footer_msg: "\n\nWysłano z `/say` przez ${author}",
	ping_down_msg: "**NIEDOSTĘPNE**",
	ping_embed_desc:
		"# Pong! Statystyki sieci ${botName}:\n\n**[Ping strony Discord]** >> `${_net03}` ms.\n**[Ping Cloudflare]** >> `${_net02}` ms.\n**[Ping Google]** >> `${_net01}` ms.\n\n${emoji_Crown} **[Ping strony iHorizon]** >> `${_net04}` ms.\n${emoji_Crown} **[Ping Websocket]** `${ping}` ms.\n\n## ${emoji_Pointer} **[Średnia]** >> (avg)`${averagePing}` ms.",
	custom_avatar_reset:
		"Zdecydowałeś się zresetować zdjęcie profilowe bota na serwerze. Stopki embedów oraz zdjęcie profilowe bota na serwerze wrócą do stanu domyślnego.",
	custom_avatar_set:
		"${emoji_Yes} **Zdecydowałeś się zmienić zdjęcie profilowe bota na serwerze. Stopki embedów oraz zdjęcie profilowe bota na serwerze zostały zmienione.**\n${emoji_Crown} Nowa wartość: `${x}`",
	custom_name_reset:
		"Zdecydowałeś się zresetować nazwę bota na serwerze. Stopki embedów oraz nazwa bota na serwerze wrócą do stanu domyślnego.",
	custom_name_set:
		"${emoji_Yes} **Zdecydowałeś się zmienić nazwę bota na serwerze. Stopki embedów oraz nazwa bota na serwerze zostały zmienione.**\n${emoji_Crown} Nowa wartość: `${name}`",
	custom_desc_reset:
		"Zdecydowałeś się zresetować opis bota na serwerze. Stopki embedów oraz opis bota na serwerze wrócą do stanu domyślnego.",
	custom_desc_set:
		"${emoji_Yes} **Zdecydowałeś się zmienić opis bota na serwerze. Stopki embedów oraz opis bota na serwerze zostały zmienione.**\n${emoji_Crown} Nowa wartość: `${desc}`",
	custom_banner_reset: "Zdecydowałeś się zresetować baner bota na serwerze.",
	custom_banner_set:
		"${emoji_Yes} **Zdecydowałeś się zmienić baner bota na serwerze.**\n${emoji_Crown} Nowa wartość: `${x}`",
	custom_sdk_only:
		"Ta komenda jest dostępna tylko w wersji produkcyjnej dla serwerów z subskrypcją `Custom iHorizon Profile`.",
	custom_sdk_only_title: "Wesprzyj iHorizon dzięki Custom iHorizon Profile",
	custom_sdk_only_description:
		"Nasz bot jest darmowy i open source od 2022 roku. Potrzebujemy przychodów, aby go utrzymywać, rozwijać i hostować. Nasze koszty działania to około 500 EUR rocznie za serwery, boosty, domeny i licencje.\n\nKomenda `/custom` pozwala zmienić tożsamość iHorizon na Twoim serwerze, edytując awatar, nazwę, baner i opis. Używając jej, wizualna tożsamość iHorizon znika z Twojego serwera.\n\nDlatego dodaliśmy subskrypcję zintegrowaną z Discordem w cenie 2,99 USD miesięcznie.\n\nKupując tę subskrypcję, będziesz mógł używać tej komendy. Pomyśl o tym jak o własnym bocie, konfiguracji w stylu OWN-IHRZ, ale stabilnej, czystej i w pełni funkcjonalnej.",
	fun_var_down_api: "Błąd: wygląda na to, że API nie działa!",
	fun_var_good_sentence: "Wyślij porządne zdanie!",
	hack_embed_description:
		"<@${victimId}> został zhakowany przez <@${authorId}>!",
	poll_not_admin: "Nie masz uprawnień, aby to zrobić!",
	question_not_full:
		"Wpisz pełne pytanie składające się z co najmniej 3 słów!",
	question_s: [
		"Tak.",
		"Nie.",
		"Nie wiem.",
		"Nie jestem pewien!",
		"Zwariowałeś!",
		"Nie, dzięki.",
		"Nie.",
		"Tak."
	],
	question_fields_input_embed: ":question:__**Pytanie**__",
	question_fields_output_embed: ":grey_exclamation:__**Odpowiedź:**__",
	question_embed_title: "__**Pytanie**__: `${authorUsername}`",
	dogs_embed_command_error: "Błąd podczas pobierania zdjęcia psa.",
	love_embed_description:
		"**${user1Username}** + **${user2Username}** = __${randomNumber}%__ miłości 💗",
	love_command_error: "Wystąpił błąd podczas tworzenia obrazu",
	fun_disable_command_msg: "${author}, ${action_type} kategorię zabawy!",
	fun_category_disable:
		"Nie możesz użyć tej komendy, ponieważ kategoria komend zabawy jest wyłączona na tym serwerze.",
	fun_caracteres_command_ok: "Podaj tekst do przekształcenia!",
	fun_caracteres_embed_desc:
		"Tekst oryginalny: **${inputText}**\n\nWybierz styl z listy poniżej, aby przekształcić tekst.",
	fun_caracteres_select_menu_placeholder: "Wybierz styl czcionki...",
	fun_coinflip_result_heads: "Orzeł",
	fun_coinflip_result_tails: "Reszka",
	economy_cooldown_error:
		"Poczekaj **${time}**, zanim będziesz mógł ponownie użyć tej komendy!",
	addmoney_not_admin:
		"Nie możesz użyć tej komendy, ponieważ nie masz wymaganych uprawnień `ADMINISTRATOR`",
	addmoney_logs_embed_title: "Logi ekonomii",
	addmoney_logs_embed_description:
		"<@${authorId}> dodał ${amountValue} monet dla <@${userId}>!",
	addmoney_command_work:
		"Pomyślnie dodano `${amountValue}$` dla <@${userId}>",
	balance_dont_have_wallet: "👛 Nie masz portfela...",
	balance_he_dont_have_wallet: "${emoji_Wallet} ${user} nie ma portfela...",
	balance_have_wallet: "👛 Masz ${bal} monet!",
	balance_he_have_wallet: "${emoji_Wallet} ${user} ma ${bal} monet!",
	balance_embed_fields1_name: "Bank",
	balance_embed_fields2_name: "Na koncie",
	daily_cooldown_error:
		"Przepraszam, musisz poczekać **${time}**, zanim użyjesz tej komendy!",
	daily_embed_title: "Dzienna",
	daily_embed_description: "**Dzienna nagroda**",
	daily_embed_fields: "Odebrano",
	monthly_cooldown_error:
		"Przepraszam, musisz poczekać **${time}**, zanim użyjesz tej komendy!",
	monthly_embed_title: "Miesięczna",
	monthly_embed_description: "**Miesięczna nagroda**",
	monthly_embed_fields: "Odebrano",
	pay_negative_number_error: "Nie można zapłacić ujemnej kwoty.",
	pay_dont_have_enought_to_give:
		"To więcej pieniędzy, niż masz na koncie. Spróbuj ponownie.",
	pay_command_work:
		"${authorUsername}, pomyślnie zapłaciłeś ${userUsername} `${amount}$`.",
	removemoney_not_admin:
		"Nie możesz użyć tej komendy, ponieważ nie masz wymaganych uprawnień `ADMINISTRATOR`",
	removemoney_embed_title: "Usunięto pieniądze!",
	removemoney_embed_fields: "Kwota",
	removemoney_embed_second_fields: "Saldo zaktualizowane",
	removemoney_logs_embed_description:
		"<@${authorId}> usunął ${amount} monet z konta <@${userId}>!",
	removemoney_logs_embed_title: "Logi ekonomii",
	rob_cooldown_error:
		"**Poczekaj 50 minut, zanim ponownie okradniesz użytkownika!**",
	rob_dont_enought_error:
		":x: Potrzebujesz co najmniej 250$, aby kogoś okraść.",
	rob_him_dont_enought_error:
		":x: ${userUsername} nie ma wystarczająco dużo, aby go okraść.",
	rob_embed_description:
		"<@${authorId}> okradłeś <@${userId}> i uciekłeś z ${random}!",
	weekly_cooldown_error:
		"Przepraszam, musisz poczekać **${time}**, zanim użyjesz tej komendy!",
	weekly_embed_title: "Tygodniowa",
	weekly_embed_description: "**Tygodniowa nagroda**",
	weekly_embed_fields: "Odebrano",
	work_cooldown_error:
		"<@${authorId}>, **poczekaj ${time} min, zanim znów pójdziesz do pracy!**",
	work_embed_author: "${authorUsername}, opłaciło się!",
	work_embed_description:
		"${authorUsername}, popracowałeś i zarobiłeś ${amount}$!",
	withdraw_cannot_abuse:
		"${emoji_No} | Nie możesz wypłacić więcej monet, niż masz w banku!",
	withdraw_embed_title: "Wypłata z banku",
	withdraw_embed_desc:
		"${author}, wypłacono ${toWithdraw}${emoji_Coin} z Twojego `banku`",
	withdraw_embed_fields1_name: "Bank",
	deposit_cannot_abuse:
		"${emoji_No} | Nie możesz wpłacić więcej monet, niż masz w portfelu!",
	deposit_embed_title: "Wpłata do banku",
	deposit_embed_desc:
		"${author}, wpłacono ${toDeposit}${emoji_Coin} do Twojego `banku`",
	deposit_embed_fields1_name: "Bank",
	economy_leaderboard_embed_title: "Ranking ekonomii serwera `${guildName}`",
	economy_leaderboard_embed_fields_value:
		"<@${userId}> - Bank: `${bank}`${emoji_Coin} | Saldo: `${money}`${emoji_Coin}",
	economy_action_in_progress:
		"${emoji_No} | Twoja poprzednia komenda ekonomii wciąż się wykonuje, spróbuj ponownie za chwilę.",
	economy_disable_not_admin:
		":x: | Musisz być administratorem tego serwera, aby użyć tej komendy!",
	economy_disable_already_disable:
		"<@${authorId}>, moduł ekonomii jest już **wyłączony**!",
	economy_disable_already_enable:
		"<@${authorId}>, moduł ekonomii jest już **włączony**!",
	economy_disable_set_enable:
		"<@${authorId}>, pomyślnie **włączyłeś** moduł ekonomii!",
	economy_disable_set_disable:
		"<@${authorId}>, pomyślnie **wyłączyłeś** moduł ekonomii!",
	economy_disable_logs_embed_desc:
		"<@${authorId}> ustawił moduł ekonomii na `${state}`!",
	economy_disable_logs_embed_title: "Logi ekonomii",
	economy_boost_role_not_found:
		"Nie znaleziono roli. Musisz ustawić cenę roli.",
	economy_boost_embed_title: "System ekonomii - role do kupienia",
	economy_boost_embed_desc:
		"Wszystkie role do kupienia są wymienione poniżej.",
	economy_role_add_no_role: "Brak ról do kupienia, które można usunąć.",
	economy_role_add_max_20_roles:
		"Możesz mieć maksymalnie 20 ról do kupienia.",
	economy_role_add_canceled: "Rola nie została dodana do ról do kupienia.",
	economy_role_add_prompt_dangerous:
		"Czy na pewno chcesz dodać tę rolę do ról do kupienia?\n**Uwaga:** ta rola ma niebezpieczne uprawnienia.\nUprawnienia: ${stringDangerousPermissions}",
	economy_shop_embed_title: "🛍️ Sklep serwera `${guildName}`",
	economy_shop_embed_desc:
		"Sklep pozwala kupować przedmioty/role za Twoje pieniądze. Role dostępne do kupienia zobaczysz poniżej.",
	economy_shop_not_available: "Wybrana rola nie jest dostępna do kupienia.",
	economy_shop_already_own_role: "Masz już tę rolę.",
	economy_shop_not_enough_money:
		"Nie masz wystarczająco dużo pieniędzy, aby kupić tę rolę.",
	economy_shop_role_add_failed:
		"Nie mogłem nadać Ci tej roli, więc nic Ci nie pobrano. Poproś administratora o sprawdzenie, czy rola nadal istnieje i jest poniżej mojej najwyższej roli.",
	economy_shop_role_purchased:
		"Pomyślnie kupiłeś rolę **{roleName}** za **${rolePrice}** 💰.",
	economy_shop_unknown_role: "Nieznana rola",
	economy_shop_not_set:
		"Na tym serwerze nie ma ról dostępnych do kupienia. Skontaktuj się z administratorem serwera, aby uzyskać więcej informacji.",
	economy_shop_already_owned: "Już posiadasz",
	economy_shop_menu_placeholder: "Wybierz rolę do kupienia",
	economy_manage_rewards_cooldown_invalid_time:
		"Nieprawidłowy format czasu. Użyj prawidłowego formatu czasu.",
	economy_manage_rewards_cooldown_command_ok:
		"Pomyślnie ustawiono czas odnowienia dla ${type} na ${stime}",
	economy_manage_rewards_set_money:
		"Pomyślnie ustawiono kwotę dla ${type} na ${money}",
	economy_role_list_no_buyable_roles: "Brak ról do kupienia do wyświetlenia.",
	economy_role_list_embed_title: "System ekonomii - role do kupienia",
	economy_role_list_embed_desc:
		"Wszystkie role do kupienia są wymienione poniżej.",
	reset_ueconomy_are_you_sure:
		"**Czy na pewno chcesz usunąć wszystkie dane ekonomii?\nTa akcja jest trwała i nie można jej cofnąć.**\n**Ta akcja jest destrukcyjna!!**",
	reset_ueconomy_logs_embed_title:
		"Logi modułu ekonomii (NIEBEZPIECZNA AKCJA)",
	reset_ueconomy_logs_embed_desc:
		"${author} usunął wszystkie dane modułu ekonomii dla ${user}!",
	reset_geconomy_are_you_sure:
		"**Czy na pewno chcesz usunąć wszystkie dane ekonomii DLA WSZYSTKICH CZŁONKÓW SERWERA?\nTa akcja jest trwała i nie można jej cofnąć.**\n**Ta akcja jest destrukcyjna!!**",
	reset_geconomy_logs_embed_title:
		"Logi modułu ekonomii (BARDZO NIEBEZPIECZNA AKCJA)",
	reset_geconomy_logs_embed_desc:
		"${author} usunął wszystkie dane modułu ekonomii dla **WSZYSTKICH**!",
	setprofilage_command_work:
		"**Wiek w Twoim profilu został pomyślnie zaktualizowany.**",
	setprofildescriptions_command_work:
		"**Twój opis został pomyślnie zaktualizowany.**",
	profil_not_description_set: "Nie ustawiono opisu!",
	profil_unknown: "Nieznany",
	profil_embed_title: "${emoji_Pin} __Profil użytkownika ${memberTag}__",
	profil_embed_fields_nickname: "📝 ・ __Pseudonim__",
	profil_embed_fields_money: "🪙 ・ __Pieniądze__",
	profil_embed_fields_money_value: " monet",
	profil_embed_fields_xplevels: "💳 ・ __Poziomy XP__",
	profil_embed_fields_xplevels_value: " poziomów XP",
	profil_embed_fields_age: "🎂 ・ __Wiek__",
	profil_embed_fields_age_value: " lat",
	profil_embed_fields_gender: "👤 ・ __Płeć__",
	profil_embed_fields_pronouns: "📌 ・ __Zaimki__",
	profil_embed_fields_birthdate: "🎂 ・ __Data urodzin__",
	profil_birthday_month_button_label: "Ustaw miesiąc",
	profil_birthday_day_button_label: "Ustaw dzień",
	profil_birthday_year_button_label: "Ustaw rok",
	profil_birthday_embed_title: "🎂 ・ Ustaw swoje urodziny!",
	profil_birthday_embed_introduction:
		"${emoji_Sparkles} **Jak każdy człowiek, masz urodziny!**${emoji_Sparkles}\n\n${emoji_Crown} ・ Cześć, ${author}\n:tada: ・ Żeby je uczcić, najpierw trzeba je ustawić!\n",
	profil_birthday_embed_current_birthday:
		"${emoji_Pin} ・ **Aktualne urodziny**: `${birthdayMonth}/${birthdayDay}/${birthdayYear}` (w formacie MM/DD/RRRR)",
	profil_birthday_modal1_title: "Wpisz rok urodzenia",
	profil_birthday_modal1_fields1_label: "Rok",
	profil_birthday_invalid_year: "Nieprawidłowy rok! Wpisz poprawny rok.",
	profil_birthday_year_already_set: "Twój rok jest już ustawiony.",
	profil_birthday_year_set: "Twój rok został ustawiony!",
	profil_birthday_modal2_title: "Wpisz miesiąc urodzenia",
	profil_birthday_modal2_fields1_label: "Miesiąc",
	profil_birthday_invalid_month:
		"Nieprawidłowy miesiąc! Wpisz poprawny miesiąc.",
	profil_birthday_month_already_set: "Twój miesiąc jest już ustawiony.",
	profil_birthday_month_set: "Twój miesiąc został ustawiony!",
	profil_birthday_modal3_title: "Wpisz dzień urodzenia",
	profil_birthday_modal3_fields1_label: "Dzień",
	profil_birthday_invalid_day: "Nieprawidłowy dzień! Wpisz poprawny dzień.",
	profil_birthday_day_already_set: "Twój dzień jest już ustawiony.",
	profil_birthday_day_set: "Twój dzień został ustawiony!",
	setrankroles_not_admin:
		"${emoji_No} Nie jesteś administratorem tego serwera. Nie możesz użyć tej komendy!",
	setrankroles_already_this_in_db:
		"${emoji_No} Role rang są już zapisane w bazie danych dla tego serwera.",
	setrankroles_not_roles_typed:
		"${emoji_No} Nie podałeś żadnych ról w komendzie!",
	setrankroles_logs_embed_description_enable:
		"<@${authorId}> ustawił rolę rangi na <@&${argsid}>",
	setrankroles_logs_embed_title_enable: "Ustawienie roli rangi",
	setrankroles_logs_embed_description_disable:
		"<@${authorId}> usunął rolę rangi!",
	setrankroles_logs_embed_title_disable: "Ustawienie roli rangi",
	setrankroles_command_work_disable: "<@${authorId}>, usunąłeś rolę rangi!",
	setrankroles_command_error:
		"${emoji_No} Komenda napotkała błąd! Spróbuj ponownie później.",
	snipe_no_previous_message_deleted:
		"Na tym kanale nie usunięto żadnych wiadomości!",
	userinfo_wait_please: "${emoji_Timer} Chwileczkę...",
	userinfo_var_notfound: "`Nie znaleziono`",
	userinfo_button_label: "Profil użytkownika",
	renew_channel_send_success: "${author} kanał został odtworzony!",
	renew_dont_have_permission: ":x: **Nie można** `Brak uprawnień!`",
	renew_not_administrator:
		":x: **Nie jesteś administratorem, by użyć tej komendy!**",
	renewvc_not_in_voice:
		"${emoji_No} Musisz być połączony z kanałem głosowym, aby użyć tej komendy!",
	renewvc_region_success:
		"${emoji_Yes} Region głosowy kanału ${targetVc} został ustawiony na automatyczny!",
	renewvc_dont_have_permission: ":x: **Nie można** `Brak uprawnień!`",
	prevnames_undetected: "Nie znaleziono danych!",
	prevnames_not_admin:
		"Nie masz uprawnienia `ADMINISTRATOR`, aby użyć tej komendy!",
	prevnames_data_erased:
		"Twoje poprzednie nazwy użytkownika zostały całkowicie usunięte na twoją prośbę!",
	prevnames_embed_footer_text: "iHorizon | Strona ${page}/${pageCount}",
	blockbot_not_owner: ":x: **Nie jesteś właścicielem serwera!**",
	blockbot_logs_enable_title: "Logi BlockBot",
	blockbot_logs_enable_description:
		"${author} (właściciel serwera) __włączył__ `BlockBot`. Teraz boty **nie mogą** być dodawane na ten serwer!",
	blockbot_command_work_on_enable:
		"**Włączyłeś `BlockBot`**\nTeraz boty **nie mogą** być dodawane na ten serwer!",
	blockbot_command_work_on_disable:
		"**Wyłączyłeś `BlockBot`**\nTeraz boty **mogą** być dodawane na ten serwer!",
	blockbot_logs_disable_commmand_work: "Log BlockBot",
	blockbot_logs_disable_description:
		"${author} (właściciel serwera) __wyłączył__ `BlockBot`. Teraz boty **mogą** być dodawane na ten serwer!",
	banner_guild_no_banner: "Serwer nie ma banera.",
	banner_user_no_banner: "Ten użytkownik nie ma banera.",
	massiverole_too_much_member:
		"Zbyt wielu członków, nie można tego zrobić z powodu możliwego limitu zapytań!",
	nickrole_too_much_member:
		"Zbyt wielu członków, nie można kontynuować z powodu możliwego limitu zapytań!",
	emoji_send_new_emoji:
		"__Utworzono nowe emoji__ o nazwie: **${emojiName}**! (${emoji})",
	emoji_send_err_emoji:
		"__Błąd podczas tworzenia nowego emoji__ o nazwie: **${emojiName}**!",
	derank_msg_failed: "Wystąpił błąd podczas usuwania ról.",
	derank_no_role: "Ten członek nie ma ról do usunięcia.",
	action_unban_all_no_banned_members: "Nie ma zbanowanych członków.",
	action_mass_job_running:
		"Tego rodzaju akcja masowa jest już w toku na tym serwerze, poczekaj, aż się zakończy.",
	vc_embed_desc:
		"## Stany głosowe\n`${voiceCount}` członków jest na kanale głosowym:\n${emoji_iHorizon_Streaming} **=>** ${streaming}\n${emoji_iHorizon_Deaf} **=>** ${deafened}\n${emoji_iHorizon_Mute} **=>** ${muted}\n${emoji_iHorizon_Camera} **=>** ${video}\n## Stany członków\n`${memberCount}` członków jest na serwerze:\n${emoji_DND} **=>** ${dnd}\n${emoji_Online} **=>** ${online}\n${emoji_Idle} **=>** ${idle}\n${emoji_Invisible} **=>** ${offline}\n## Stany boostów\n`${boostCount}` boostów na serwerze,\n${members}",
	vc_embed_fields_1_name: "・Liczba członków",
	vc_embed_fields_1_value: "```py\n${memberCount} członków```",
	vc_embed_fields_2_name: "・Liczba kanałów",
	vc_embed_fields_2_value:
		"```py\n${textChannelSize} kanałów tekstowych\n${voiceChannelSize} kanałów głosowych```",
	vc_embed_short_desc:
		"## Stany głosowe\n`${voiceCount}` członków jest na kanale głosowym:\n${emoji_iHorizon_Streaming} **=>** ${total_members_vc_streaming}\n${emoji_iHorizon_Deaf} **=>** ${total_members_vc_deaf}\n${emoji_iHorizon_Mute} **=>** ${total_members_vc_mute}\n${emoji_iHorizon_Camera} **=>** ${total_members_vc_video}\n## Stany członków\n`${total_members_size}` członków jest na serwerze:\n${emoji_DND} **=>** ${total_members_states_dnd}\n${emoji_Online} **=>** ${total_members_states_online}\n${emoji_Idle} **=>** ${total_members_states_idle}",
	massmove_too_much_member:
		"Zbyt wielu członków, nie można tego zrobić z powodu możliwego limitu zapytań!",
	all_admins_nobody_admins: "Na tym serwerze nie ma żadnego administratora!",
	all_admins_unrank_button_label: "Odbierz rangę wszystkim",
	all_admins_unrank_not_owner:
		"Tylko właściciel serwera może odebrać rangę wszystkim administratorom serwera",
	utils_addrole_highter_or_egal_roles_msg:
		"${emoji_Stop} Nie możesz dodać roli użytkownikowi, który ma wyższą rolę niż ty...",
	utils_addrole_command_ok:
		"${author} pomyślnie dodał rolę ${role} użytkownikowi ${user}",
	utils_addrole_not_wl:
		"${emoji_No} | Rola, którą chcesz dodać użytkownikowi, nie jest na białej liście. Najpierw musi ją dodać administrator! (za pomocą `/utils wlroles`)",
	utils_addrole_cant_level:
		"Użytkownik nie jest adminem, a ty próbujesz dać mu rolę admina? Chcesz mnie wkręcić? Chcesz wywalić serwer, czy co?",
	utils_addrole_try2brain:
		"Rola bota jest za nisko w hierarchii. Nie mogę przypisać tej głupiej roli, przepraszam.",
	utils_delrole_highter_or_egal_roles_msg:
		"${emoji_Stop} Nie możesz usunąć roli użytkownikowi, który ma wyższą rolę niż ty...",
	utils_delrole_command_ok:
		"${author} pomyślnie usunął rolę ${role} użytkownikowi ${user}",
	utils_delrole_not_wl:
		"${emoji_No} | Rola, którą chcesz usunąć użytkownikowi, nie jest na białej liście. Najpierw musi ją dodać administrator! (za pomocą `/utils wlroles`)",
	utils_delrole_try2brain:
		"Rola bota jest za nisko w hierarchii. Nie mogę usunąć tej głupiej roli, przepraszam.",
	utils_wlroles_embed_title: "Biała lista ról",
	utils_wlroles_embed_desc:
		"Oto wszystkie role dozwolone do nadawania za pomocą komend `addrole` i `delrole`!",
	utils_wlRoles_logsEmbed_title: "Moduł białej listy ról",
	utils_wlRoles_logsEmbed_desc:
		"${author} edytował wlRoles (dla komend `addrole`, `delrole`)",
	utils_derogation_already_exists:
		"${emoji_No} Rola odstępstwa ${role} jest już poprawnie skonfigurowana",
	utils_derogation_created:
		"${emoji_Yes} Rola odstępstwa ${role} została utworzona. Zsynchronizowane kanały: `${updatedChannels}`. Niepowodzenia: `${failedChannels}`",
	utils_derogation_resynced:
		"${emoji_Yes} Rola odstępstwa ${role} już istniała, ponownie zsynchronizowałem kanały: `${updatedChannels}`. Niepowodzenia: `${failedChannels}`",
	utils_dm:
		"${emoji_Yes} Wiadomość została pomyślnie wysłana do ${targetMember}.",
	utils_dm_cant:
		"${emoji_No} Nie mogłem wysłać wiadomości do ${targetMember}. Może ma zablokowane wiadomości prywatne albo zablokował mnie!",
	utils_pic_only_embed_title: "Kanały tylko z multimediami",
	utils_pic_only_emnbed_desc:
		"Kanał, na którym dozwolone są tylko zdjęcia/obrazy/filmy. Inne treści (np. zwykłe wiadomości tekstowe) są blokowane przez bota.",
	utils_piconly_embed_fields_3_name: "Czas wyciszenia",
	utils_piconly_select1_option1_label: "Zmień czas wyciszenia",
	utils_piconly_select1_option2_label: "Zmień próg",
	utils_piconly_modal1_title: "MediaOnly - konfiguracja czasu",
	utils_piconly_modal1_fields1_placeholder: "czas wyciszenia",
	utils_piconly_modal1_fields1_label: "Czas wyciszenia",
	utils_piconly_modal2_title: "MediaOnly - konfiguracja progu",
	utils_piconly_modal2_fields1_placeholder: "próg przed wyciszeniem",
	utils_piconly_modal2_fields1_label: "Próg",
	utils_piconly_embed_fields2_placeholder: "Utwórz wątek pod obrazem/filmem",
	utils_piconly_var_thread_name: "Wątek użytkownika {name}",
	zip_emojis_doesnt_have_perm: "Nie masz uprawnienia do zarządzania emoji.",
	zip_emojis_command_work:
		"🎉 Eksport zakończony w **${calcTime}**ms! Oto archiwum zawierające ${emojiCount} emoji.",
	zip_emojis_command_error: "Wystąpił błąd podczas eksportu emoji.",
	zip_stickers_doesnt_have_perm:
		"Nie masz uprawnienia do zarządzania naklejkami.",
	zip_stickers_command_work:
		"🎉 Eksport zakończony w **${calcTime}**ms! Oto archiwum zawierające ${stickerCount} naklejek.",
	zip_stickers_command_error: "Wystąpił błąd podczas eksportu naklejek.",
	sticket_no_sticker:
		"Nie znaleziono naklejki w wiadomości, na którą odpowiadasz.",
	sticket_command_work: "Naklejka `${name}` została pomyślnie utworzona.",
	sticker_command_error:
		"Nie udało się utworzyć naklejki. Wystąpił błąd: `${errMessage}`.",
	sticket_command_error2: "Odpowiedz na wiadomość zawierającą naklejkę.",
	util_nick_kicker_embed_desc:
		"Jeśli pseudonim członka zawiera określone słowo, zostanie on wyrzucony.",
	util_nick_kicker_words: "słowa",
	util_nick_kicker_select_to_remove: "Wybierz słowo do usunięcia",
	util_nick_kicker_remove_word: "Usuń to słowo",
	util_nick_kicker_no_word_to_remove: "Nie ma słowa do usunięcia",
	util_nick_kicker_add_word: "Dodaj słowo",
	util_nick_kicker_words_max_15: "Nie możesz dodać więcej niż 15 słów",
	util_nick_kicker_disable: "Wyłącz",
	util_nick_kicker_remove_word2: "Usuń słowo",
	util_nick_kicker_remove_desc: "Usuń słowo z nick-kickera",
	util_nick_kicker_add_desc: "Dodaj słowo do nick-kickera",
	util_nick_kicker_disable_desc: "Wyłącz nick-kicker",
	util_nick_kicker_enable_desc: "Włącz nick-kicker",
	util_wakeup_yourself:
		"Stary, jesteś głupi czy co? Tylko mi nie mów, że śpisz na klawiaturze, pisząc tę komendę, lol",
	util_wakeup_not_in_vc:
		"Stary, bot nie sklonuje ${userDisplayName} z tym samym zdjęciem profilowym i banerem, żebyś myślał, że się obudził... Ta osoba nawet nie jest na kanale głosowym, lol",
	util_wakeup_command_work: "Budzimy ${user}!",
	util_talk_not_in_vc: "Musisz być na kanale głosowym, aby użyć tej komendy.",
	util_talk_already_active:
		"Tryb rozmowy jest już włączony na ${voiceChannel}: najpierw wyłącz go tam.",
	util_talk_audit_reason: "Włączono głosowy tryb rozmowy",
	util_talk_logs_title: "Rozmowa głosowa",
	util_talk_logs_description:
		"${author} włączył tryb rozmowy na ${voiceChannel} i wyciszył członków: ${mutedCount}. Pominięto członków: ${skippedCount}.",
	util_talk_command_work:
		"Tryb rozmowy jest teraz włączony na ${voiceChannel}. Wyciszono członków: ${mutedCount}, pominięto członków: ${skippedCount}.",
	util_untalk_nothing_active:
		"Na tym serwerze nie ma aktywnego trybu rozmowy.",
	util_untalk_audit_reason: "Wyłączono głosowy tryb rozmowy",
	util_untalk_logs_title: "Koniec rozmowy głosowej",
	util_untalk_logs_description:
		"${author} wyłączył tryb rozmowy na ${voiceChannel} i wyłączył wyciszenie członków: ${unmutedCount}.",
	util_untalk_command_work:
		"Tryb rozmowy został wyłączony na ${voiceChannel}. Wyłączono wyciszenie członków: ${unmutedCount}.",
	util_freeze_logs_title: "Zamrożenie kanału głosowego",
	util_freeze_logs_description:
		"${author} zamroził dostęp do ${voiceChannel}.",
	util_freeze_command_work:
		"Kanał głosowy ${voiceChannel} jest teraz zamrożony.",
	util_wlvc_no_member:
		"Musisz wskazać członka, który ma mieć dostęp do zamrożonego kanału głosowego.",
	util_wlvc_no_freeze:
		"Na tym serwerze nie ma aktywnego zamrożonego kanału głosowego.",
	util_wlvc_logs_title: "Zezwolenie na zamrożony kanał głosowy",
	util_wlvc_logs_description:
		"${author} zezwolił ${member} na dołączenie do zamrożonego kanału głosowego.",
	util_wlvc_command_work:
		"${member} może teraz dołączyć do zamrożonego kanału głosowego.",
	util_unwlvc_no_member:
		"Musisz wskazać członka, którego chcesz usunąć z białej listy zamrożonego kanału głosowego.",
	util_unwlvc_no_freeze:
		"Na tym serwerze nie ma aktywnego zamrożonego kanału głosowego.",
	util_unwlvc_not_whitelisted:
		"${member} nie ma dostępu do zamrożonego kanału głosowego.",
	util_unwlvc_logs_title: "Cofnięcie zezwolenia na zamrożony kanał głosowy",
	util_unwlvc_logs_description:
		"${author} usunął ${member} z białej listy zamrożonego kanału głosowego.",
	util_unwlvc_command_work:
		"${member} nie może już dołączyć do zamrożonego kanału głosowego.",
	util_unfreeze_no_freeze:
		"Na tym serwerze nie ma aktywnego zamrożonego kanału głosowego.",
	util_unfreeze_logs_title: "Odmrożenie kanału głosowego",
	util_unfreeze_logs_description:
		"${author} zdjął aktywne zamrożenie kanału głosowego.",
	util_unfreeze_command_work: "Kanał głosowy nie jest już zamrożony.",
	util_leash_too_naugthy:
		"Ty mały łobuzie, nie możesz wziąć na smycz więcej niż ${max} osób :D",
	util_leah_already_owned:
		"Ty mały łobuzie, te maluchy już należą do ciebie :smirk:",
	util_leash_confirm_message:
		"${emoji_No} | Członek, którego chcesz wziąć na smycz, nie jest na kanale głosowym!\n${emoji_Warning_Icon} | Na pewno chcesz kontynuować?",
	util_leash_canceled_leash: "${emoji_Yes} | Konfiguracja smyczy anulowana",
	util_leash_confirmed_leash:
		"${emoji_Yes} | Pomyślnie wziąłeś użytkownika na smycz na tym serwerze :smirk:",
	util_unleash_not_in_leash:
		"${emoji_No} | Ten użytkownik nie jest na twojej smyczy!",
	util_unleash_command_ok:
		"${emoji_Yes} | Pomyślnie zdjąłeś użytkownika ze smyczy na tym serwerze :)",
	util_leashlist_no_data:
		"${emoji_No} | Na tym serwerze nie ma aktywnych smyczy.",
	util_leashlist_embed_title: "Aktywne smycze",
	util_lockname_not_in_guild:
		"${emoji_No} | Tego członka nie ma na serwerze!",
	util_lockname_not_manageable:
		"${emoji_No} | Nie mam uprawnień do zarządzania pseudonimem tego członka!",
	util_lockname_already_locked:
		"${emoji_No} | Pseudonim tego członka jest już zablokowany!",
	util_lockname_success:
		"${emoji_Yes} | Pseudonim ${member} jest teraz zablokowany na **${nick}**!",
	util_lockname_success_reset:
		"${emoji_Yes} | Pseudonim ${member} jest teraz zablokowany!",
	util_unlockname_not_locked:
		"${emoji_No} | Pseudonim tego członka nie jest zablokowany!",
	util_unlockname_success:
		"${emoji_Yes} | Pseudonim ${member} został odblokowany!",
	util_lockname_logs_embed_title: "Logi blokady pseudonimu",
	util_lockname_logs_embed_description:
		"<@${authorId}> zablokował pseudonim <@${memberId}>",
	util_unlockname_logs_embed_description:
		"<@${authorId}> odblokował pseudonim <@${memberId}>",
	util_locknamelist_empty:
		"${emoji_No} | Brak zablokowanych pseudonimów na tym serwerze! Użyj `/utilss lockname`, aby utworzyć.",
	util_locknamelist_embed_title: "Zablokowane pseudonimy",
	util_autorenew_time_too_short:
		"Czas między odnowieniami kanału musi być dłuższy niż 1 minuta",
	util_autorenew_time_too_long:
		"Czas między odnowieniami kanału musi być krótszy niż 30 dni",
	util_autorenew_command_ok:
		"${emoji_Yes} Od teraz kanał ${channel} jest automatycznie usuwany i tworzony na nowo (odnawiany) co ${time}!\nAby zatrzymać odnawianie kanału, po prostu usuń go samodzielnie.",
	event_autorenew_channel_renewed: "AutoRenew odnowił kanał!",
	event_autorenew_channel_warning:
		"Moduł AutoRenew jest skonfigurowany do odnawiania tego kanału. Następne odnowienie za ${time}.",
	var_video: "Wideo",
	var_whereis: "Gdzie jest",
	util_not_in_vc: "Członkowie nie są na kanale głosowym",
	util_no_webhooks: "Na tym serwerze nie ma żadnych webhooków.",
	util_allwebhooks_embed_title: "Wszystkie webhooki",
	util_allwebhooks_deleting: "Usuwanie wszystkich webhooków...",
	util_allwebhooks_deleted: "Usunięto webhooków: **`${u}`**!",
	util_unzip_emojis_command_work:
		"🎉 Rozpakowanie zakończone w **${calcTime}**ms! Utworzyłem emoji na serwerze: ${emojiCount}.",
	util_unzip_emojis_command_error:
		"Wystąpił błąd podczas rozpakowywania emoji.",
	util_unzip_emojis_command_no_file: "Dołącz plik zip zawierający emoji.",
	vkick_member_not_in_guild: "Tego członka nie ma na serwerze.",
	vkick_not_in_vc: "Ten członek nie jest na kanale głosowym.",
	vkick_not_admin_kick:
		"Nie możesz rozłączyć administratora z kanału głosowego.",
	vkick_logEmbed_title: "Wyrzucenie z kanału głosowego",
	vkick_logEmbed_desc:
		"${author} rozłączył ${member} z kanału głosowego ${voiceChannel}.",
	vkick_command_work:
		"${author}, pomyślnie rozłączyłeś ${member} z ${voiceChannel}",
	util_sync_embed_description_0:
		"Wszystkie kanały w kategorii mają już zsynchronizowane uprawnienia.",
	util_securewebhook_action_create:
		"Nieprawidłowy adres URL webhooka Discord",
	util_securewebhook_action_create_error:
		"Błąd podczas tworzenia webhooka: `${status}`",
	util_securewebhook_action_create_ok:
		"Webhook został utworzony\n> URL: ${url}\n> Użycie: ${use}",
	util_securewebhook_action_delete_any: "Nie masz żadnego webhooka",
	util_securewebhook_action_delete_not_owner:
		"Nie jesteś właścicielem tego webhooka",
	util_securewebhook_action_delete_error: "Błąd podczas usuwania webhooka",
	util_securewebhook_actiom_list_ok: ":star: __**Twoje webhooki**__:\n",
	admin_roles_nobody_roles:
		"Na tym serwerze nie ma żadnej roli administratora!",
	admin_roles_remove_button_label: "Odbierz admina wszystkim",
	admin_roles_remove_not_owner:
		"Tylko właściciel serwera może odebrać rolom uprawnienie administratora",
	util_rolelimit_bad_opt:
		"${emoji_No} | Podane opcje są nieprawidłowe. Sprawdź swoje dane.",
	util_rolelimit_good:
		"${emoji_Crown} | Rola: ${role} | Maks. członków: ${limit_count}\n- Nowi użytkownicy nie będą mogli otrzymać tej roli, jeśli ma ją już ${limit_count} członków.",
	util_inviteinfo_not_valid_invite: "To `discord_invite` jest nieprawidłowe!",
	util_cooldown_command_ok:
		"Tryb powolny kanału został ustawiony na ${duration_in_string}.",
	util_role_members_no_one: "Na serwerze nikt nie ma tej roli",
	util_vanity_generator_invalid_code:
		"Kod vanity URL `${VanityCode}` jest nieprawidłowy. Ciąg powinien być alfanumeryczny i może zawierać myślniki między wyrazami. Maksymalna długość to 32 znaki. Myślniki nie mogą być na początku ani na końcu ciągu.",
	util_vanity_generator_already_claimed:
		"Kod vanity URL jest już zajęty! Wybierz inny.",
	util_vanity_generator_command_err:
		"Wystąpił błąd podczas tworzenia kodu vanity. Spróbuj ponownie później.",
	utils_top_no_message: "Nie znaleziono wiadomości na tym kanale",
	utils_top_command_ok:
		"Pierwsza wiadomość na tym kanale jest [tutaj](${link})",
	bringall_no_from_channel: "Wskaż źródłowy kanał głosowy.",
	bringall_invalid_category: "Wskaż prawidłową kategorię.",
	bringall_no_voice_channels:
		"Wskazana kategoria nie zawiera kanałów głosowych.",
	bringall_no_members: "Na źródłowym kanale głosowym nie ma członków.",
	util_move_not_in_vc:
		"Członek, którego chcesz przenieść, nie jest połączony z żadnym kanałem głosowym",
	util_move_impossible_to_move_admin:
		"Członek, którego chcesz przenieść, jest administratorem, a ty też nim nie jesteś.",
	util_move_command_ok: "${member} jest teraz na ${channel}",
	blockpub_not_admin: ":x: | Musisz być administratorem tego serwera!",
	blockpub_now_enable:
		"📌 | Antypub jest teraz aktywny (działa dla wszystkich oprócz adminów)",
	blockpub_now_disable: "📌 | Antypub jest teraz wyłączony!",
	guildprofil_not_admin: ":x: | Musisz być administratorem tego serwera!",
	guildprofil_not_set_reactionrole: "Nie ustawiono!",
	guildprofil_set_reactionrole:
		"**ID wiadomości**: `${i}` -> ${emoji} daje rolę <@&${rolesID}>\n",
	guildprofil_not_set_ticketFetched: "Nie ustawiono!",
	guildprofil_set_ticketFetched: "",
	guildprofil_not_set_punishPub: "Nie ustawiono!",
	guildprofil_set_punishPub:
		"`${punishementType}`: maks.: `${amountMax}` flag.",
	guildprofil_not_set_supportConfig: "Nie ustawiono!",
	guildprofil_set_supportConfig:
		"`${input}` w opisie profilu daje rolę <@&${rolesId}>.",
	guildprofil_not_set_setchannelsjoin: "Nie ustawiono!",
	guildprofil_set_setchannelsjoin: "",
	guildprofil_not_set_setchannelsleave: "Nie ustawiono!",
	guildprofil_set_setchannelsleave: "",
	guildprofil_not_set_joinmessage: "Nie ustawiono!",
	guildprofil_set_joinmessage: "",
	guildprofil_not_set_leavemessage: "Nie ustawiono!",
	guildprofil_set_leavemessage: "",
	guildprofil_not_set_joinroles: "Nie ustawiono!",
	guildprofil_set_joinroles: "",
	guildprofil_not_set_joinDmMessage: "Nie ustawiono!",
	guildprofil_set_joinDmMessage: "",
	guildprofil_not_set_blockpub: "Wyłączone",
	guildprofil_set_blockpub: "Włączone",
	guildprofil_embed_description: "`Konfiguracja serwera:` ${guildName}!",
	guildprofil_embed_fields_joinmessage: "Wiadomość powitalna",
	guildprofil_embed_fields_leavemessage: "Wiadomość pożegnalna",
	guildprofil_embed_fields_setchannelsjoin: "Kanał dołączeń",
	guildprofil_embed_fields_setchannelsleave: "Kanał odejść",
	guildprofil_embed_fields_joinroles: "Rola na start",
	guildprofil_embed_fields_joinDmMessage: "DM powitalny",
	guildprofil_embed_fields_blockpub: "Blokada reklam",
	guildprofil_embed_fields_punishPub: "Kara za reklamy",
	guildprofil_embed_fields_supportConfig: "Wsparcie",
	guildprofil_embed_fields_ticketFetched: "Tickety",
	guildprofil_embed_fields_reactionrole: "Role za reakcje",
	guildprofil_not_logs_set: "Nie ustawiono kanału logów",
	guildprofil_blockbot_on: "Blokada botów włączona",
	guildprofil_blockbot_off: "Blokada botów wyłączona",
	guildprofil_disable_xp: "Wiadomość wyłączona",
	guildprofil_enable_xp: "Wiadomość włączona",
	guildprofil_another_enable_xp:
		"Wiadomość włączona, wysyłana na <#${xpChannels}>",
	guildprofil_embed_fields_blockbot: "Blokada botów",
	guildprofil_embed_fields_logs: "Logi",
	guildprofil_embed_fields_ranks: "Rangi",
	setchannels_not_admin:
		":x: | Musisz być administratorem tego serwera, aby użyć tych komend!",
	setchannels_not_specified_args:
		"Musisz wskazać prawidłowy kanał dla swojego modułu.",
	setchannels_already_this_channel_on_join:
		"Moduł jest już skonfigurowany z tym kanałem!",
	setchannels_confirmation_message_on_join:
		"**Kanał dołączeń został tam ustawiony!** :tada:",
	setchannels_command_error_on_join:
		"Błąd: brak uprawnień lub kanał nie istnieje",
	setchannels_command_work_on_join:
		"Pomyślnie ustawiłeś moduł kanału dołączeń na <#${argsidId}>",
	setchannels_logs_embed_title_on_join: "Logi ustawienia kanału",
	setchannels_logs_embed_description_on_join:
		"<@${authorId}> ustawił moduł kanału dołączeń na: <#${argsidId}>",
	setchannels_already_this_channel_on_leave:
		"Moduł jest już skonfigurowany z tym kanałem!",
	setchannels_confirmation_message_on_leave:
		"**Kanał odejść został teraz tam ustawiony!** :tada:",
	setchannels_command_error_on_leave:
		"Błąd: brak uprawnień lub kanał nie istnieje",
	setchannels_command_work_on_leave:
		"Pomyślnie ustawiłeś moduł kanału odejść na <#${argsidId}>",
	setchannels_logs_embed_title_on_leave: "Logi ustawienia kanału",
	setchannels_logs_embed_description_on_leave:
		"<@${authorId}> ustawił kanał odejść na: <#${argsidId}>",
	setchannels_already_on_off: "Kanały dołączeń i odejść są już wyłączone",
	setchannels_command_work_on_off:
		"Pomyślnie wyłączyłeś kanał odejść i dołączeń!",
	setchannels_logs_embed_title_on_off: "Logi ustawienia kanału",
	setchannels_logs_embed_description_on_off:
		"<@${authorId}> usunął całą konfigurację kanałów dołączeń/odejść!",
	setchannels_button_join: "Zmień kanał dołączeń",
	setchannels_button_leave: "Zmień kanał odejść",
	setchannels_button_delete: "Usuń konfigurację",
	setchannels_embed_fields_value_join: "Kanał dołączeń",
	setchannels_embed_fields_value_leave: "Kanał odejść",
	setchannels_not_a_text_channel:
		"${emoji_Warning_Icon} Wskazany kanał nie jest kanałem tekstowym!",
	setchannels_which_channel:
		"<@${authorId}>, który kanał chcesz skonfigurować?",
	setchannels_title_embed_panel: "Panel konfiguracji kanałów GuildConfig",
	setjoindm_not_admin:
		":x: | Musisz być administratorem tego serwera, aby użyć tej komendy!",
	setjoindm_logs_embed_title_on_enable: "Logi JoinDM",
	setjoindm_logs_embed_description_on_enable:
		"<@${authorId}> ustawił wiadomość DM przy dołączeniu!",
	setjoindm_not_specified_args_on_enable:
		"Musisz podać prawidłową wiadomość dla swojego DM przy dołączeniu.",
	setjoindm_confirmation_message_on_enable:
		"Pomyślnie ustawiłeś DM przy dołączeniu na:```${dm_msg}``` i go włączyłeś",
	setjoindm_command_error_on_enable:
		"Błąd: brak uprawnień lub kanał nie istnieje",
	setjoindm_logs_embed_title_on_disable: "Logi JoinDM",
	setjoindm_logs_embed_description_on_disable:
		"<@${authorId}> wyłączył wiadomość DM przy dołączeniu!",
	setjoindm_confirmation_message_on_disable:
		"Pomyślnie wyłączyłeś DM przy dołączeniu!",
	setjoindm_command_error_on_disable:
		"Błąd: brak uprawnień lub kanał nie istnieje",
	setjoindm_already_disable:
		"Wiadomość DM przy dołączeniu jest już wyłączona!",
	setjoindm_not_setup_ls: "Nie ma tu ustawionego DM przy dołączeniu!",
	setjoindm_command_work_ls:
		"Wiadomość DM przy dołączeniu to:\n```${already_off}```",
	setjoindm_help_embed_title: "Pomoc: wiadomość JoinDM",
	setjoindm_help_embed_desc:
		"{memberUsername} => Nazwa użytkownika członka\n{memberMention} => Wzmianka o członku\n{memberCount} => Liczba członków na serwerze\n{guildName} => Nazwa serwera\n{createdAt} => Data utworzenia konta w formacie dd/mm/rrrr\n{accountCreationTimestamp} => Znacznik czasu utworzenia konta",
	setjoindm_buttom_set_name: "Ustaw wiadomość",
	setjoindm_buttom_delete_name: "Usuń wiadomość DM",
	setjoindm_awaiting_response:
		"Napisz na kanale nową własną wiadomość JoinDM.",
	setjoinmessage_not_admin:
		":x: | Musisz być administratorem tego serwera, aby użyć tych komend!",
	setjoinmessage_help_embed_title: "Pomoc: setjoinmessage",
	setjoinmessage_help_embed_description:
		"/setjoinmessage <Włącz /Wyłącz/Pokaż ustawioną wiadomość> <wiadomość powitalna>",
	setjoinmessage_help_embed_fields_name: "jak używać?",
	setjoinmessage_help_embed_fields_value:
		"Użyj ```/setjoinmessage <Włącz /Wyłącz/Pokaż ustawioną wiadomość> <wiadomość>```\n{user} = Nazwa użytkownika członka\n{membercount} = liczba członków serwera\n{createdat} = data utworzenia konta członka\n{guild} = nazwa serwera\n{inviter} = nazwa i dyskryminator osoby zapraszającej\n{invites} = liczba zaproszeń użytkownika",
	setjoinmessage_logs_embed_title_on_enable: "Logi SetJoinMessage",
	setjoinmessage_logs_embed_description_on_enable:
		"<@${authorId}> ustawił wiadomość powitalną!",
	setjoinmessage_command_work_on_enable:
		"${emoji_GreenTick} | Pomyślnie ustawiono własną wiadomość powitalną.",
	setjoinmessage_logs_embed_title_on_disable: "Logi SetJoinMessage",
	setjoinmessage_logs_embed_description_on_disable:
		"<@${authorId}> usunął wiadomość powitalną!",
	setjoinmessage_command_work_on_disable:
		"${emoji_Yes} | Pomyślnie usunięto własną wiadomość powitalną.",
	setjoinmessage_command_work_ls: "Wiadomość powitalna to:",
	setjoinmessage_help_embed_fields_custom_name: "Własna wiadomość",
	setjoinmessage_help_embed_fields_custom_name_empy: "Nie ustawiono!",
	setjoinmessage_help_embed_fields_default_name_empy: "Domyślna wiadomość",
	setjoinmessage_help_embed_desc:
		"{memberUsername} => Nazwa użytkownika członka\n{memberMention} => Wzmianka o członku\n{inviterUsername} => Nazwa użytkownika osoby zapraszającej\n{inviterMention} => Wzmianka o osobie zapraszającej\n{memberCount} => Liczba członków na serwerze\n{invitesCount} => Liczba zaproszeń osoby zapraszającej\n{guildName} => Nazwa serwera\n{createdAt} => Data utworzenia konta w formacie dd/mm/rrrr\n{accountCreationTimestamp} => Znacznik czasu utworzenia konta",
	setjoinmessage_button_set_name: "Ustaw wiadomość",
	setjoinmessage_buttom_del_name: "Domyślna wiadomość",
	setjoinmessage_awaiting_response: "Napisz nową własną wiadomość powitalną.",
	setjoinmessage_image_default_text:
		"Witaj {memberUsername} na {guildName}<br>Jest nas teraz {memberCount} na serwerze",
	setjoinmessage_change_image_button_title: "Zmień obraz",
	setjoinmessage_default_image_button_title: "Domyślny obraz",
	setjoinmessage_var_enable_image: "Włącz obraz",
	setjoinmessage_var_disable_image: "Usuń obraz",
	setjoinmessage_var_image_card: "Karta wiadomości powitalnej",
	setjoinmessage_change_image_propreties_background: "Zmień tło",
	setjoinmessage_change_image_propreties_frame_color:
		"Zmień kolor okrągłej ramki",
	setjoinmessage_change_image_propreties_text_colour: "Zmień kolor tekstu",
	setjoinmessage_change_image_propreties_text_message: "Zmień treść tekstu",
	setjoinmessage_change_image_propreties_text_size: "Zmień rozmiar tekstu",
	setjoinmessage_change_image_propreties_avatar_size: "Zmień rozmiar awatara",
	setjoinmessage_modal_fields_background_url: "adres URL obrazu tła",
	setjoinmessage_change_image_menu_frame_color_profil:
		"Na podstawie koloru profilu użytkownika",
	setjoinmessage_change_image_menu_frame_status_profil:
		"Na podstawie statusu użytkownika",
	setjoinmessage_modal_fields_hex_color: "kolor www.color-hex.com",
	setjoinmessage_modal_fields_message: "wiadomość, którą chcesz",
	setjoinmessage_var_text_size: "Rozmiar tekstu: ",
	setjoinmessage_var_avatar_size: "Rozmiar awatara: ",
	setjoinmessage_change_image_invalid_url:
		"Nieprawidłowy adres URL obrazu. Spróbuj z innym dostawcą obrazów.",
	setjoinroles_var_none: "Brak",
	setjoinroles_var_perm_admin: "Administrator",
	setjoinroles_var_perm_manage_guild: "Zarządzanie serwerem",
	setjoinroles_var_perm_manage_role: "Zarządzanie rolami",
	setjoinroles_var_perm_use_mention:
		"Używanie @everyone, @here i wszystkich ról",
	setjoinroles_var_perm_ban_members: "Banowanie członków",
	setjoinroles_var_perm_kick_members: "Wyrzucanie członków",
	setjoinroles_var_perm_manage_webhooks: "Zarządzanie webhookami",
	setjoinroles_var_perm_manage_channels: "Zarządzanie kanałami",
	setjoinroles_var_perm_manage_expression:
		"Zarządzanie emoji, naklejkami i soundboardem",
	setjoinroles_var_perm_view_monetization_analytics:
		"Wyświetlanie monetyzacji i analiz twórcy",
	setjoinroles_var_perm_issue: "Nie mam uprawnienia do zarządzania rolami.",
	setjoinroles_var_timesup: "Czas na wybór ról minął.",
	setjoinroles_warn_dangerous_perm:
		"Poniższe role mają niebezpieczne uprawnienia. Na pewno chcesz je przypisać?",
	setjoinroles_warn_title: "Uwaga!",
	setjoinroles_timesup_button: "Czas minął!",
	setjoinroles_action_canceled: "Akcja anulowana",
	setjoinroles_too_highter_roles:
		"Poniższe role są wyżej w hierarchii niż moja.",
	setjoinroles_not_admin:
		":x: | Musisz być administratorem tego serwera, aby użyć tych komend!",
	setjoinroles_help_embed_title: "Moduł JoinRoles",
	setjoinroles_help_embed_description:
		"Oto wszystkie role, które nadaję nowym członkom",
	setjoinroles_help_embed_fields_1_name: "Wszystkie zarejestrowane role",
	setjoinroles_logs_embed_title_on_enable: "Logi SetJoinRoles",
	setjoinroles_logs_embed_description_on_enable:
		"<@${authorId}> ustawił role na start!",
	setjoinroles_already_on_enable:
		"Rola na start jest już skonfigurowana z tą rolą!",
	welcomer_panel_title: "Welcomer",
	welcomer_section_placeholder: "Wybierz, co skonfigurować",
	welcomer_section_channels: "Kanały",
	welcomer_embed_label: "Własny embed",
	welcomer_text_label: "Tekst",
	welcomer_embed_set_button: "Ustaw embed",
	welcomer_embed_remove_button: "Usuń embed",
	welcomer_embed_modal_title: "Ustaw własny embed",
	welcomer_embed_modal_label: "ID embeda (z kreatora embedów)",
	welcomer_embed_not_found:
		"Nie znaleziono zapisanego embeda o ID `${embed_id}`. Najpierw utwórz go w kreatorze embedów.",
	welcomer_embed_set_ok:
		"Własny embed `${embed_id}` będzie teraz wysyłany dla tego zdarzenia. Zmienne takie jak {memberMention} są zastępowane automatycznie.",
	welcomer_embed_removed_ok:
		"Własny embed usunięty. Wracamy do domyślnej karty.",
	welcomer_text_enable_button: "Włącz tekst",
	welcomer_text_disable_button: "Wyłącz tekst",
	welcomer_components_enable_button: "Włącz komponenty",
	welcomer_components_disable_button: "Wyłącz komponenty",
	welcomer_render_mode_label: "Tryb wyświetlania",
	welcomer_render_mode_components: "Komponenty (karta)",
	welcomer_render_mode_simple: "Zwykła wiadomość",
	setleavemessage_not_admin:
		":x: | Musisz być administratorem tego serwera, aby użyć tych komend!",
	setleavemessage_help_embed_title: "Pomoc: /setleavemessage",
	setleavemessage_help_embed_description:
		"/setleavemessage <Włącz /Wyłącz/Pokaż ustawioną wiadomość> <wiadomość pożegnalna>",
	setleavemessage_help_embed_fields_name: "jak używać?",
	setleavemessage_help_embed_fields_value:
		"Użyj ```/setleavemessage <Włącz /Wyłącz/Pokaż ustawioną wiadomość> <wiadomość>```\n{user} = Nazwa użytkownika członka\n{membercount} = liczba członków serwera\n{guild} = nazwa serwera",
	setleavemessage_logs_embed_title_on_enable: "Logi SetLeaveMessage",
	setleavemessage_logs_embed_description_on_enable:
		"<@${authorId}> ustawił wiadomość pożegnalną!",
	setleavemessage_command_work_on_enable:
		"${emoji_Yes} | Pomyślnie ustawiono własną wiadomość pożegnalną.",
	setleavemessage_logs_embed_title_on_disable: "Logi SetLeaveMessage",
	setleavemessage_logs_embed_description_on_disable:
		"<@${authorId}> usunął wiadomość pożegnalną!",
	setleavemessage_command_work_on_disable:
		"${emoji_Yes} | Pomyślnie usunięto własną wiadomość pożegnalną.",
	setleavemessage_command_work_ls: "Wiadomość pożegnalna to:",
	setleavemessage_awaiting_response:
		"Napisz nową własną wiadomość pożegnalną.",
	setup_not_admin: ":x: | Musisz być administratorem tego serwera!",
	setup_command_work: "${emoji_Yes} | Konfiguracja kanałów",
	setup_command_error:
		"Bot już skonfigurował kanały logów albo nie ma wystarczających uprawnień...",
	setlogschannel_not_admin:
		":x: | Musisz być administratorem tego serwera, aby użyć tej komendy!",
	setlogschannel_not_specified_args:
		"Musisz wskazać prawidłowy kanał dla swojego modułu.",
	setlogschannel_confirmation_message:
		"${emoji_Yes} | Oto teraz kanał dla `${typeOfLogs}`, ustawiony przez <@${authorId}>!",
	setlogschannel_already_this_channel:
		"Ten serwer ma już ten kanał jako kanał logów!",
	setlogschannel_already_deleted:
		"Ten serwer nie ma ustawionego `SERVER_LOGS`!",
	setlogschannel_command_error: "Wystąpił błąd. Spróbuj ponownie.",
	setlogschannel_command_work:
		"Pomyślnie skonfigurowałeś `${typeOfLogs}` na <#${argsidId}>!",
	setlogschannel_utils_command_work:
		"Pomyślnie skonfigurowałeś `${typeOfLogs}` na ${argsidId}!",
	setlogschannel_command_work_on_delete:
		"Pomyślnie usunąłeś całe `SERVER_LOGS` na **${guildName}**",
	setlogschannel_logs_embed_title: "Ustawienie logów serwera",
	setlogschannel_logs_embed_description_on_enable:
		"<@${authorId}> ustawił `${typeOfLogs}` na <#${argsidId}>",
	setlogschannel_logs_embed_title_on_off: "Ustawienie logów serwera",
	setlogschannel_logs_embed_description_on_off:
		"<@${authorId}> usunął wszystkie `SERVER_LOGS` na serwerze!",
	setlogschannel_var_roles: "Logi ról",
	setlogschannel_var_mods: "Logi moderacji",
	setlogschannel_var_voice: "Logi głosowe",
	setlogschannel_var_msg: "Logi wiadomości",
	setlogschannel_var_boost: "Logi boostów",
	setlogschannel_var_tickets: "Logi ticketów",
	setlogschannel_var_antispam: "Logi AntiSpam",
	setlogschannel_var_channel: "Logi kanałów",
	setlogschannel_var_confession: "Logi wyznań",
	setlogschannel_var_economy: "Logi ekonomii",
	setlogschannel_all_already_exist:
		"Wszystkie kanały logów są już skonfigurowane!",
	setlogschannel_bot_missing_channel_permissions:
		"${emoji_No} | Nie mogę publikować logów na ${channel}, brakuje mi tam tych uprawnień: ${permissions}.",
	setlogschannel_bot_missing_permissions:
		"${emoji_No} | Nie mogę utworzyć kanałów logów, brakuje mi tych uprawnień: ${permissions}.",
	joinghostping_add_already_set: "Kanał ${channel} jest już ustawiony!",
	joinghostping_add_sent_to_channel:
		"Od teraz, gdy członek dołączy do serwera, wyślę **tutaj** wiadomość-widmo.",
	joinghostping_add_ok_embed_title: "Moduł Join GhostPing",
	joinghostping_add_ok_embed_desc:
		"Teraz będę wysyłać wiadomość-widmo na ten kanał za każdym razem, gdy członek dołączy do serwera!",
	joinghostping_add_ok_embed_fields_name: "Wszystkie zarejestrowane kanały",
	joinghostping_add_logs_embed_title: "Logi Join GhostPing",
	joinghostping_add_logs_embed_desc:
		"${author} dodał ${channel} do modułu Join GhostPing!",
	joinghostping_remove_isnt_set: "Kanał ${channel} nie jest ustawiony!",
	joinghostping_remove_ok_embed_desc:
		"Kanały zostały usunięte z modułu Join GhostPing!",
	joinghostping_remove_logs_embed_desc:
		"${author} usunął ${channel} z modułu Join GhostPing!",
	automod_panel_title: "Panel sterowania AutoMod",
	automod_panel_desc:
		"Skonfiguruj każdą regułę AutoMod iHorizon: włączaj lub wyłączaj je, ustaw kanał logów i wybierz role, które mogą je omijać.",
	automod_panel_overview_title: "Chronione reguły",
	automod_panel_select_placeholder: "Wybierz regułę do skonfigurowania",
	automod_panel_label_logs: "Kanał logów",
	automod_panel_label_bypass: "Role omijające",
	automod_panel_label_mention_limit: "Limit wzmianek",
	automod_panel_rule_spam_name: "Spam wiadomościami",
	automod_panel_rule_spam_desc:
		"Blokuje flood i powtarzające się wiadomości na serwerze.",
	automod_panel_rule_mass_mention_name: "Masowe wzmianki",
	automod_panel_rule_mass_mention_desc:
		"Blokuje wiadomości zawierające nadmierną liczbę wzmianek.",
	automod_panel_rule_antipub_name: "Linki i reklamy",
	automod_panel_rule_antipub_desc:
		"Blokuje linki reklamowe, z bezpieczną listą dozwolonych (GitHub, Tenor, YouTube, ...).",
	automod_panel_rule_media_name: "Zaproszenia Discord",
	automod_panel_rule_media_desc:
		"Blokuje linki z zaproszeniami na serwery Discord wysyłane w wiadomościach.",
	automod_panel_rule_telegram_name: "Linki Telegram",
	automod_panel_rule_telegram_desc:
		"Blokuje linki Telegram (t.me, telegram.me, tg://...).",
	automod_panel_logs_placeholder:
		"Wybierz kanał, który ma otrzymywać logi tej reguły",
	automod_panel_bypass_placeholder: "Wybierz role omijające tę regułę",
	automod_panel_enable_button: "Włącz",
	automod_panel_disable_button: "Wyłącz",
	automod_panel_back_button: "Wstecz",
	automod_panel_refresh_button: "Odśwież",
	automod_panel_close_button: "Zamknij panel",
	automod_panel_rule_enabled: "Reguła **${rule}** jest teraz włączona!",
	automod_panel_rule_disabled: "Reguła **${rule}** jest teraz wyłączona!",
	automod_panel_bypass_saved:
		"Role omijające dla **${rule}** zostały zaktualizowane!",
	automod_panel_logs_saved:
		"Logi reguły **${rule}** są teraz wysyłane na ${channel}.",
	automod_panel_logs_reset: "Kanał logów reguły **${rule}** został usunięty!",
	automod_panel_api_error:
		"Nie mogłem zastosować tej zmiany. Upewnij się, że mam uprawnienie `Zarządzanie serwerem` i że domyślne reguły AutoMod Discorda są wyłączone, a potem spróbuj ponownie.",
	too_new_account_dont_specified_time_on_enable:
		"Nie podałeś czasu. Aby włączyć ten moduł, wymagany jest minimalny wiek konta!",
	too_new_account_invalid_time_on_enable:
		"Podany czas jest nieprawidłowy! **Przykład prawidłowego czasu**: `3h; 30m; 4mo; 4w; 4y` -> 3 godziny; 30 minut; 4 miesiące; 4 tygodnie; 4 lata",
	too_new_account_logEmbed_title: "Moduł TooNewAccount",
	too_new_account_logEmbed_desc_on_enable:
		"${author} włączył moduł TooNewAccount. Konta muszą mieć teraz co najmniej ${beautifulTime}, a użytkownik zostanie zbanowany przy `${maxJoin}`. dołączeniu.",
	too_new_account_command_work_on_enable:
		"${author}, nowi członkowie dołączający do **${guildName}** z kontami młodszymi niż `${beautifulTime}` będą teraz wyrzucani.",
	too_new_account_command_work_on_enable2:
		"\n-# ${emoji_Sparkles} Gdy konto dołączy do serwera **`${maxJoin}`** razy, zostanie zbanowane.",
	too_new_account_logEmbed_desc_on_disable: "${author} wyłączył moduł!",
	too_new_account_command_work_on_disable:
		"${author}, moduł został pomyślnie wyłączony. Daty utworzenia kont nowych członków nie będą już sprawdzane.",
	guildconfig_setbot_footername_footer_too_long_msg:
		"Stopka bota jest za długa, wyglądałaby zbyt brzydko.",
	guildconfig_setbot_footername_is_good:
		"Pomyślnie zmieniono, wszystkie embedy iHorizon będą używać `${footerName}` jako stopki!",
	guildconfig_setbot_footername_is_reset:
		"Nazwa stopki została usunięta. Teraz wszystkie embedy iHorizon będą używać `nazwy bota`.",
	guildconfig_setbot_footername_not_found:
		"Nie znaleziono nazwy stopki. Spróbuj ponownie!",
	guildconfig_setbot_footeravatar_is_good:
		"Pomyślnie zmieniono, wszystkie embedy iHorizon będą używać `obrazu` jako stopki!",
	guildconfig_setbot_footeravatar_incorect:
		"Plik nie jest obrazem. Spróbuj ponownie z obrazem.",
	guildconfig_setbot_footeravatar_is_reset:
		"Awatar stopki został usunięty. Teraz wszystkie embedy iHorizon będą używać `awatara bota`.",
	guildconfig_setbot_prefix_prefix_now_mention:
		"Prefiks bota dla komend z wiadomości to teraz wzmianka! `@Ping-Me`",
	guildconfig_setbot_prefix_prefix_specify_prefix:
		"Musisz podać prefiks bota.",
	guildconfig_setbot_prefix_prefix_too_long:
		"Prefiks bota jest za długi, byłby zbyt niewygodny w użyciu.",
	guildconfig_setbot_prefix_prefix_is_good:
		"Prefiks bota został pomyślnie zmieniony, teraz komendy z wiadomości działają z: `${formatedPrefix}`",
	guildconfig_config_save_check_dm:
		"Sprawdź swoje DM. Jeśli nie dostałeś wiadomości, upewnij się, że przyjmujesz DM.",
	guildconfig_config_save_user_msg:
		"To jest kopia zapasowa konfiguracji serwera `${guildName}`!",
	guildconfig_config_save_user_msg_2:
		"Oto link do pobrania kopii zapasowej serwera!\n",
	guildconfig_config_restore_err_msg:
		"Wystąpił błąd podczas pobierania pliku.",
	guildconfig_config_restore_msg:
		"Dane zostały zapisane w mojej bazie danych.",
	guildconfig_config_restore_wrong_guild:
		"Ta kopia zapasowa nie należy do tego serwera lub jest nieprawidłowa, więc nie została przywrócona.",
	perm_add_args_error:
		"Nie podałeś komend do zmiany ani uprawnienia do ustawienia.",
	perm_list_embed_title: "Wszystkie uprawnienia użytkowników:",
	perm_list_unknown_user: "Nieznany użytkownik (ID: ${userId})",
	perm_list_no_user: "Nie znaleziono użytkownika",
	var_command: "Komenda",
	var_subcommand: "Podkomenda",
	var_subcommand_group: "Grupa podkomend",
	var_unreachable_command: "Nie znaleziono komendy",
	perm_list_no_command_set:
		"Na tym serwerze nie ma komendy z ustawionym osobnym uprawnieniem!",
	perm_set_deleted: "Uprawnienie użytkownika ${user} zostało **usunięte**!",
	perm_set_ok:
		"Uprawnienie użytkownika ${user} zostało zmienione na **`${perm}`**",
	perm_set_warn_message:
		"${author}, nie możesz nadać uprawnienia wyższego niż twoje ani równego twojemu!",
	perm_set_chng_perm_lvl: "Zmieniono poziom uprawnień",
	perm_set_add_role: "Dodano rolę",
	perm_set_add_usr: "Dodano użytkownika",
	perm_rmv_role: "Usunięto rolę",
	perm_rmv_usr: "Usunięto użytkownika",
	perm_set_command_reset: "Ta komenda została zresetowana",
	perm_set_no_modified: "Nie zmieniono żadnych uprawnień",
	perm_command_delete_dont_exist:
		"Wskazana komenda nie ma ustawionych żadnych uprawnień.",
	perm_command_delete_command_deleted:
		"Usunięto uprawnienia dla komendy: `${commands}`",
	perm_command_delete_specify_command:
		"Musisz wskazać komendę, której uprawnienia chcesz usunąć.",
	perm_command_delete_all_one:
		"Musisz podać jedną opcję, aby usunąć uprawnienie.",
	perm_command_delete_all_one_option:
		"Możesz podać tylko jedną opcję, aby usunąć uprawnienie.",
	perm_command_delete_all_zero_change:
		"Wskazany typ uprawnienia nie był używany w żadnej komendzie.",
	perm_command_delete_all_command_ok:
		"\nPomyślnie usunięto z bazy danych zagnieżdżone uprawnienia **${changeCount}** `${type}` (${value}).",
	commandlimit_current_value: "${count} użyć na ${time}",
	commandlimit_invalid_value:
		"Podane wartości limitu użyć komendy są nieprawidłowe.",
	commandlimit_missing_command: "Musisz wskazać komendę.",
	commandlimit_set_success:
		"Limit użyć dla `${command}` został ustawiony na `${limit}`.",
	commandlimit_reset_success:
		"Limit użyć dla `${command}` został zresetowany.",
	commandlimit_reset_missing:
		"Dla `${command}` nie skonfigurowano żadnego limitu użyć.",
	commandlimit_list_title: "Skonfigurowane limity użyć komend",
	commandlimit_list_item: "- `${command}`: ${limit}",
	commandlimit_list_empty:
		"Na tym serwerze nie skonfigurowano żadnego limitu użyć komend.",
	commandlimit_rate_limited:
		"Osiągnąłeś limit dla tej komendy. Spróbuj ponownie za ${time}.",
	perm_roles_created_role: "Utworzono następujące role: ${roles}",
	perm_roles_already_upate: "Wszystkie role już istnieją i są aktualne.",
	perm_roles_error: "Wystąpił błąd podczas tworzenia lub aktualizowania ról.",
	perm_roles_not_owner:
		"Tylko właściciel serwera może dodawać role poziomów uprawnień.",
	perm_edit_roles_command_ok:
		"Rola uprawnienia ${permName} została zmieniona na ${strRole}",
	toggle_react_command_work:
		"<@${authorId}>, teraz gdy członek wyśle wiadomość powitalną, bot **{activeMsg}**",
	toggle_react_doesnt_react: "nie będzie już reagować",
	toggle_react_react: "zareaguje",
	remove_react_command_work:
		"<@${authorId}>, teraz gdy członek wyśle `${message}`, bot **nie będzie już reagować**.",
	add_react_command_err_emojis:
		"Emoji `{emoji}` dla reakcji nie jest prawidłowym emoji!",
	add_react_command_err_message:
		"Musisz podać wiadomość, która wywoła reakcję!",
	add_react_command_bad_word:
		"Tego słowa nie można użyć do automatycznej reakcji: nie może zawierać kropki.",
	add_react_command_work:
		"<@${authorId}>, teraz gdy członek wyśle `${message}`, bot **zareaguje** za pomocą {emoji}",
	list_react_nothing_found: "Nie znaleziono danych, najpierw coś dodaj.",
	list_react_embed_msg:
		"Gdy ktoś wyśle **`${key}`**, **zareaguję** za pomocą ${value}\n",
	autoreact_embed_title: "Konfiguracja Autoreact",
	autoreact_embed_desc:
		"Gdy na wskazanym kanale zostanie wysłana nowa wiadomość, bot zareaguje wskazanymi emoji.",
	autoreact_embed_autofields_value: "Reakcja: ${reaction}",
	autoreact_embed_autofields_none_value:
		"Nie ustawiono konfiguracji autoreact.",
	autoreact_embed_footer:
		"Strona ${currentPage} z ${totalPage} • Łącznie reakcji: ${totalReact}",
	autoreact_btn_add_name: "Dodaj kanał",
	autoreact_btn_remove_name: "Usuń kanał",
	autoreact_max_25: "Można ustawić maksymalnie 25 konfiguracji autoreact.",
	autoreact_menu_add_place: "Wybierz kanał do dodania",
	autoreact_awaiting1_msg:
		"Wybierz kanał, który chcesz dodać do modułu autoreact.",
	autoreact_modal_title: "Konfiguracja AutoReact",
	autoreact_modal_fields1_label: "Reakcja (emoji)",
	autoreact_invalid_emoji: "Nieprawidłowe emoji. Wpisz prawidłowe emoji.",
	autoreact_add_command_ok: "Konfiguracja autoreact została ustawiona.",
	autoreact_remove_not_found: "Nie ustawiono konfiguracji autoreact.",
	autoreact_menu_remove_place: "Wybierz kanał do usunięcia",
	autoreact_awaiting_remove_msg:
		"Wybierz kanał, który chcesz usunąć z modułu autoreact.",
	autoreact_remove_command_ok:
		"Konfiguracja autoreact dla tego kanału została usunięta.",
	setmembercount_not_admin:
		":x: | Musisz być administratorem tego serwera, aby użyć tej komendy!",
	setmembercount_helpembed_title: "Pomoc: Set MemberCount",
	setmembercount_helpembed_description:
		"/membercount <Włącz / Wyłącz> <Nazwa kanału>",
	setmembercount_helpembed_fields_name: "Jak tego używać?",
	setmembercount_helpembed_fields_value:
		"{MemberCount} = liczba członków na serwerze\n{RolesCount} = liczba ról\n{BotCount} = liczba botów na serwerze\n{ChannelCount} = liczba kanałów na serwerze\n{BoostCount} = liczba boostów na serwerze\n{VoiceCount} = łączna liczba członków na kanałach głosowych serwera\n{OnlineCount} = łączna liczba członków online na serwerze",
	setmembercount_logs_embed_title_on_enable: "Logi Set MemberCount",
	setmembercount_logs_embed_description_on_enable:
		"<@${authorId}> ustawił MemberCount kanału <#${channelId}> na `${messagei}`!",
	setmembercount_command_work_on_enable:
		"${emoji_Yes} | Pomyślnie ustawiono MemberCount.",
	setmembercount_command_work_on_disable:
		"${emoji_Yes} | Pomyślnie usunięto MemberCount.",
	setmembercount_logs_embed_title_on_disable: "Logi Set MemberCount",
	setmembercount_logs_embed_description_on_disable:
		"<@${authorId}> usunął MemberCount tego serwera!",
	music_library_liked_name: "Polubione utwory",
	music_audio_unavailable:
		"🔄 Serwer muzyczny się restartuje. Twoja muzyka za kilka sekund sama wróci do miejsca, w którym była, spróbuj ponownie za chwilę.",
	music_requester_only:
		"${emoji_No} Tylko osoba, która zażądała tego utworu, lub zarządca serwera może to zrobić.",
	music_manager_only: "${emoji_No} Tylko zarządca serwera może to zrobić.",
	clear_queue_command_own:
		"${emoji_Security} Twoje utwory opuściły kolejkę (${removed}). Utwory innych słuchaczy zostają.",
	music_cannot:
		"${emoji_No} Musisz być na tym samym kanale głosowym co ja, aby użyć tej komendy!",
	p_not_in_voice_channel:
		"Musisz być połączony z kanałem głosowym, aby użyć tej komendy!",
	p_embed_title: "Brak wyników",
	p_not_allowed:
		"Link, który wysłałeś, nie jest obsługiwany przez tego bota. Użyj autoryzowanych serwisów muzycznych, takich jak Deezer, Spotify, Soundcloud itp.",
	p_attachment_too_large:
		"${emoji_No} Załączony plik przekracza limit 10 MB i nie można go odczytać.",
	loop_no_queue: "Nie ma kolejki!",
	loop_command_work: "{mode} | Zaktualizowano tryb zapętlenia",
	nowplaying_no_queue: "Nic nie jest odtwarzane",
	nowplaying_message_embed_title: "Teraz odtwarzane",
	nowplaying_resume_button: "${author} **wznowił** muzykę!",
	nowplaying_pause_button: "${author} **zatrzymał** muzykę!",
	nowplaying_lyrics_button: "Nie znaleziono tekstu tego utworu",
	nowplaying_stop_buttom: "${author} **zatrzymał(a)** muzykę!",
	nowplaying_header: "Teraz odtwarzane na ${channel}",
	nowplaying_requested_by: "Dodane przez ${user}",
	nowplaying_paused: "Wstrzymano",
	nowplaying_live: "Transmisja na żywo",
	nowplaying_volume: "Głośność ${volume}%",
	nowplaying_loop_off: "Zapętlenie wyłączone",
	nowplaying_loop_track: "Zapętlony utwór",
	nowplaying_loop_queue: "Zapętlona kolejka",
	nowplaying_queue_count: "${count} w kolejce",
	nowplaying_up_next: "Następny: ${track}",
	nowplaying_queue_end: "Ostatni utwór w kolejce",
	nowplaying_ended: "Ten utwór już nie jest odtwarzany.",
	nowplaying_button_pause: "Pauza",
	nowplaying_button_resume: "Wznów",
	nowplaying_button_skip: "Pomiń",
	nowplaying_button_stop: "Zatrzymaj",
	nowplaying_button_lyrics: "Tekst",
	nowplaying_button_open: "Otwórz",
	nowplaying_skip_button: "${author} **pominął(-ęła)** utwór!",
	nowplaying_loop_button: "${author} zmienił(a) tryb zapętlenia: **${mode}**",
	pause_no_queue: "${emoji_Warning_Icon} - Nie jesteś na kanale głosowym!",
	pause_nothing_playing: "Nic nie jest odtwarzane",
	pause_var_paused: "wstrzymano",
	pause_var_err: "coś poszło nie tak",
	resume_nothing_playing: "Nic nie jest odtwarzane",
	resume_command_work: "pomyślnie wznowiono",
	skip_not_in_voice_channel:
		"${emoji_Warning_Icon} - Nie jesteś na kanale głosowym!",
	skip_nothing_playing: "Nic nie jest odtwarzane",
	skip_command_work: "Pominięto {queue}",
	stop_nothing_playing: "nic nie jest odtwarzane",
	stop_command_work: "Kolejka zatrzymana",
	queue_iam_not_voicec: "Nie jestem na kanale głosowym",
	queue_no_queue: "Nie ma kolejki",
	queue_title: "Kolejka",
	queue_time_left: "Pozostało ${duration}",
	queue_now_playing: "Teraz odtwarzane",
	queue_up_next: "Następne",
	queue_page: "Strona ${page}/${pages}",
	queue_button_shuffle: "Wymieszaj",
	queue_button_refresh: "Odśwież",
	queue_jump_placeholder: "Przejdź do utworu…",
	queue_shuffled: "${author} **wymieszał(a)** kolejkę!",
	queue_jumped: "${author} przeszedł(-ła) do utworu ${track}!",
	shuffle_no_queue: "Nie jestem na kanale głosowym",
	shuffle_no_enought:
		"W kolejce jest **za mało utworów**, aby je **wymieszać**",
	shuffle_command_work: "**Wymieszałem** kolejkę",
	history_no_entries: "Historia muzyki jest pusta.",
	history_title: "Ostatnio odtwarzane na ${guild}",
	history_summary:
		"${count} utworów, ${duration} muzyki w ciągu ostatnich 30 dni",
	history_top_artist:
		"Najczęściej odtwarzany wykonawca: **${artist}** (odtworzeń: ${count})",
	history_top_listener: "Najwięcej próśb: ${user} (${count})",
	history_legacy_note:
		"Zapisane, zanim zaczęto przechowywać szczegóły utworów:",
	history_page: "Strona ${page} z ${pages}",
	history_kept: "Przechowywane przez 30 dni",
	history_button_previous: "Poprzednia",
	history_button_next: "Następna",
	history_button_export: "Eksportuj",
	history_button_clear: "Wyczyść",
	history_clear_confirm:
		"${emoji} Wyczyścić całą historię muzyki tego serwera? Tej operacji nie można cofnąć.",
	history_button_confirm_clear: "Wyczyść historię",
	history_button_cancel: "Anuluj",
	history_cleared:
		"${emoji} Historia muzyki tego serwera została wyczyszczona.",
	history_clear_forbidden:
		"${emoji} Potrzebujesz uprawnienia Zarządzanie serwerem, aby wyczyścić historię.",
	history_not_yours:
		"${emoji} Te przyciski należą do osoby, która otworzyła tę historię. Użyj /music history, aby otworzyć własną.",
	history_export_ready: "${emoji} Pełna historia, od najnowszych:",
	lyrics_embed_title_unknown: "Nieznany tytuł",
	lyrics_embed_author_name_unknown: "Nieznany autor",
	lyrics_not_found: "Nie znaleziono tekstu",
	clear_queue_command_ok:
		"${emoji_Security} | Kolejka muzyczna na tym serwerze została wyczyszczona.",
	music_lyrics: "Tekst",
	music_volume_command_ok:
		"${emoji_Yes} **głośność ustawiona na** `${query}`%",
	music_apo_download_failed:
		"${emoji_No} | Nie udało się pobrać pliku, spróbuj ponownie.",
	music_apo_no_node:
		"${emoji_No} | Żaden węzeł audio nie jest teraz połączony.",
	music_apo_unsupported:
		"${emoji_No} | Ten węzeł audio nie obsługuje filtrów APO (wymaga Wavyzon z wtyczką `apo`).",
	music_apo_invalid:
		"${emoji_No} | Węzeł audio odrzucił tę konfigurację: `${error}`",
	music_apo_warnings: "Pominięte linie (${count}):",
	end_not_admin:
		"Musisz mieć uprawnienie do zarządzania wiadomościami, aby zakończyć ten konkurs.",
	end_not_find_giveaway: "Nie znaleziono konkursu dla `${gw}`.",
	end_confirmation_message:
		"Konkurs zakończy się za mniej niż (${timeEstimate}) sekund...",
	end_logs_embed_title: "Logi konkursów",
	end_logs_embed_description:
		"<@${authorId}> zakończył(a) konkursy o tym ID: ${messageId}",
	end_command_error: "Ten konkurs jest już zakończony!",
	start_not_perm:
		"Musisz mieć uprawnienie do zarządzania wiadomościami, aby rozpoczynać konkursy.",
	start_is_not_valid: "Musisz podać prawidłową liczbę zwycięzców!",
	start_confirmation_command: "Konkurs rozpoczęty na ${giveawayChannel}!",
	start_logs_embed_title: "Logi konkursów",
	start_logs_embed_description:
		"<@${authorId}> rozpoczął(-ęła) konkurs na: ${giveawayChannel}",
	start_time_not_valid:
		"${author}, podany czas trwania konkursu jest nieprawidłowy, spróbuj ponownie!",
	start_invalid_invites_req_value:
		"${emoji_No} | Wartość dla „invites” jest nieprawidłowa! Musisz podać liczbę zaproszeń wymaganych do wzięcia udziału w konkursie!",
	start_invalid_messages_req_value:
		"${emoji_No} | Wartość dla „messages” jest nieprawidłowa! Musisz podać liczbę wiadomości wymaganych do wzięcia udziału w konkursie!",
	start_invalid_roles_req_value:
		"${emoji_No} | Nie znaleziono roli dla „roles”! Musisz podać ID roli wymaganej do wzięcia udziału w konkursie!",
	reroll_not_perm:
		"Musisz mieć uprawnienie do zarządzania wiadomościami, aby zakończyć ten konkurs.",
	reroll_dont_find_giveaway: "Nie znaleziono konkursu dla `{args}`.",
	reroll_command_work: "Konkurs wznowiony!",
	reroll_logs_embed_title: "Logi konkursów",
	reroll_logs_embed_description:
		"<@${authorId}> ponownie wylosował(a) zwycięzców konkursów o tym ID: ${messageId}",
	reroll_command_error: "Błąd!",
	reroll_giveaway_not_over: "Ten konkurs jeszcze się nie zakończył!",
	gw_getall_embed_title: "Lista konkursów na ${guildName}",
	gw_getall_embed_fields:
		"${Channel} [Zobacz tutaj](${MessageURL}) \n**Kończy się za** ${ExpireIn}",
	gw_getdata_embed_title: "Informacje o konkursie!",
	gw_getdata_embed_fields_channel: "Kanał",
	gw_getdata_embed_fields_amountWinner: "Liczba zwycięzców",
	gw_getdata_embed_fields_value_amountWinner: "zwycięzców: `${winnerCount}`",
	gw_getdata_embed_fields_prize: "Nagroda",
	gw_getdata_embed_fields_value_prize: "`${prize}`",
	gw_getdata_embed_fields_hostedBy: "Organizator",
	gw_getdata_embed_fields_isEnded: "Zakończony?",
	gw_getdata_embed_fields_isValid: "Ważny?",
	gw_getdata_embed_fields_time: "Kończy się",
	gw_getdata_embed_fields_entriesAmount: "Liczba zgłoszeń",
	gw_getdata_embed_fields_winners: "Zwycięzcy",
	gw_getdata_embed_fields_value_entriesAmount:
		"**${entries}** (użyj `/gw list-entries giveaway-id:${giveawayId}`, aby dowiedzieć się więcej)",
	gw_getdata_yes: "`Tak`",
	gw_getdata_no: "`Nie`",
	gw_doesnt_exit: "Konkurs jest niedostępny lub nie istnieje.",
	gw_go_panel_title: "Panel konkursu",
	gw_go_panel_desc:
		"Przygotuj poniżej swój konkurs, a następnie go uruchom. Użyj menu, aby edytować każde ustawienie.",
	gw_go_select_placeholder: "Edytuj ustawienie",
	gw_go_opt_prize: "Nagroda",
	gw_go_opt_duration: "Czas trwania",
	gw_go_opt_winners: "Zwycięzcy",
	gw_go_opt_requirement: "Wymóg uczestnictwa",
	gw_go_opt_image: "Obraz podglądu",
	gw_go_channel_placeholder: "Kanał konkursu",
	gw_go_launch_buttontitle: "Uruchom",
	gw_go_cancel_buttontitle: "Anuluj",
	gw_go_req_none: "Brak",
	gw_go_req_invites: "Zaproszenia",
	gw_go_req_messages: "Wiadomości",
	gw_go_req_roles: "Role",
	gw_go_req_value_dsc: "Wymagana wartość: **${value}**",
	gw_go_started: "Konkurs został rozpoczęty na ${channel}!",
	gw_go_cancelled: "Panel zamknięty, nic nie zostało uruchomione.",
	gw_go_expired: "Panel wygasł, zanim konkurs został uruchomiony.",
	gw_go_need_prize:
		"${emoji_No} | Przed uruchomieniem konkursu musisz ustawić nagrodę!",
	gw_go_need_duration:
		"${emoji_No} | Przed uruchomieniem konkursu musisz ustawić prawidłowy czas trwania!",
	gw_go_need_winners:
		"${emoji_No} | Przed uruchomieniem konkursu musisz ustawić prawidłową liczbę zwycięzców!",
	gw_go_channel_error:
		"${emoji_No} | Na wybranym kanale nie można wysyłać wiadomości!",
	gw_go_invalid_image:
		"${emoji_No} | Ten adres URL obrazu jest nieprawidłowy!",
	gw_go_modal_prize: "Ustaw nagrodę",
	gw_go_modal_prize_label: "Nagroda",
	gw_go_modal_duration: "Ustaw czas trwania",
	gw_go_modal_duration_label: "Czas trwania (na przykład: 2d lub 12h30)",
	gw_go_modal_winners: "Ustaw liczbę zwycięzców",
	gw_go_modal_winners_label: "Liczba zwycięzców",
	gw_go_modal_req_title: "Wymóg uczestnictwa",
	gw_go_modal_req_type_label: "Typ wymogu",
	gw_go_modal_req_value_label: "Wartość wymogu (ID roli lub liczba)",
	gw_go_modal_image: "Ustaw obraz podglądu",
	gw_go_modal_image_label: "Adres URL obrazu",
	ban_not_permission:
		"${emoji_No} | Nie masz uprawnień do banowania członków.",
	ban_dont_found_member: "🔍 | Nie znaleziono tego członka",
	ban_dont_have_perm_myself:
		"${emoji_No} | Nie mam uprawnień do banowania członków!",
	ban_try_to_ban_yourself: "${emoji_No} | Nie możesz zbanować samego siebie!",
	ban_attempt_ban_higter_member:
		"${emoji_Stop} Nie możesz zbanować użytkownika z wyższą rolą niż twoja...",
	ban_cant_ban_member: "${emoji_No} | Nie mogę zbanować tego członka",
	ban_message_to_the_banned_member:
		"Zostałeś(-aś) zbanowany(-a) na tym serwerze: `${guildName}` z powodu: **`${reason}`**",
	ban_command_work: "<@${memberId}> zbanowany(-a) przez <@${authorId}>",
	ban_logs_embed_title: "Logi banów",
	ban_logs_embed_description:
		"<@${memberId}> zbanowany(-a) przez <@${authorId}>",
	kick_not_permission:
		"${emoji_No} | Nie masz uprawnień do wyrzucania członków.",
	kick_dont_have_permission:
		"${emoji_No} | Nie mam uprawnień do wyrzucania członków!",
	kick_attempt_kick_your_self:
		"${emoji_No} | Nie możesz wyrzucić samego siebie!",
	kick_attempt_kick_higter_member:
		"${emoji_Stop} Nie możesz wyrzucić użytkownika z wyższą rolą niż twoja...",
	kick_message_to_the_banned_member:
		"Zostałeś(-aś) wyrzucony(-a) z tego serwera: **${guildName}** przez `${authorUsername}`",
	kick_command_work: "${member} wyrzucony(-a) przez ${author}",
	kick_logs_embed_title: "Logi wyrzuceń",
	kick_logs_embed_description: "${member} wyrzucony(-a) przez <@${authorId}>",
	clear_dont_have_permission:
		"${emoji_No} | Nie masz uprawnienia `MANAGE_MESSAGES`.",
	clear_max_message_limit:
		"${emoji_No} | Nie mogę usunąć więcej niż 99 wiadomości naraz!",
	clear_channel_message_deleted: "Usunięto wiadomości: ${messageCount}!",
	clear_logs_embed_title: "Logi czyszczenia wiadomości",
	clear_logs_button_transcript: "Transkrypcja",
	clear_logs_embed_description:
		"<@${authorId}> usunął(-ęła) wiadomości (${messageCount}) na <#${channelId}>",
	clear_command_no_message: "Na tym kanale nie ma wiadomości do usunięcia",
	lock_dont_have_permission:
		"${emoji_No} | Nie masz uprawnień do blokowania kanałów.",
	lock_logs_embed_title: "Logi blokad",
	lock_logs_embed_description: "<@${authorId}> zablokował(a) <#${channelId}>",
	unlock_dont_have_permission:
		"${emoji_No} | Nie masz uprawnień do odblokowywania kanałów.",
	unlock_logs_embed_title: "Logi odblokowań",
	unlock_logs_embed_description:
		"<@${authorId}> odblokował(a) <#${channelId}>",
	lockall_dont_have_permission:
		"${emoji_No} | Nie masz uprawnień do blokowania wszystkich kanałów.",
	lockall_logs_embed_title: "Logi blokady wszystkich kanałów",
	lockall_logs_embed_description:
		"<@${authorId}> zablokował(a) wszystkie kanały!",
	unlockall_logs_embed_title: "Logi odblokowania wszystkich kanałów",
	unlockall_logs_embed_description:
		"<@${authorId}> odblokował(a) wszystkie kanały!",
	unban_dont_have_permission:
		"${emoji_No} | Nie masz uprawnień do odbanowywania członków.",
	unban_bot_dont_have_permission: "${emoji_No} | Nie mam uprawnień.",
	unban_there_is_nobody_banned:
		"${emoji_No} | **Na tym serwerze nikt nie jest zbanowany!**",
	unban_the_member_is_not_banned:
		"${emoji_No} | **Podane ID nie jest zbanowane na tym serwerze**!",
	unban_logs_embed_title: "Logi odbanowań",
	unban_logs_embed_description:
		"<@${userID}> został(a) odbanowany(-a) na serwerze przez <@${authorId}>!",
	unban_reason: "Nie podano powodu.",
	tempmute_dont_have_permission:
		"${emoji_No} | Nie masz uprawnień do czasowego wyciszania członków.",
	tempmute_i_dont_have_permission: "${emoji_No} | Nie mam uprawnień.",
	tempmute_cannot_mute_yourself:
		"${emoji_No} | Nie możesz wyciszyć samego siebie!",
	tempmute_already_muted: "Ten użytkownik jest już wyciszony!",
	tempmute_unmuted_by_time: "<@${tomuteId}> został(a) odciszony(-a)!",
	tempmute_logs_embed_title: "Logi czasowych wyciszeń",
	tempmute_logs_embed_description:
		"<@${authorId}> wyciszył(a) <@${tomuteId}> na ${duration}\n**Powód**: `${reason}`",
	tempmute_reason_create_roles: "Utworzenie roli wyciszenia czasowego!",
	tempmute_tomute_is_admin:
		"${emoji_No} | Ten użytkownik ma uprawnienia administratora, nie mogę go wyciszyć.",
	tempmute_tomute_highest_role_or_same:
		"${emoji_No} | **Moja rola na tym serwerze jest niższa lub równa roli ${tomute}. Nie mogę moderować tego członka.**",
	tempmute_cannot_mute_higher_role:
		"${emoji_No} | **Rola ${tomute} jest wyższa lub równa twojej. Nie możesz nałożyć limitu czasowego na tego członka.**",
	moderation_target_higher_role:
		"${emoji_No} | **Rola ${member} jest wyższa lub równa twojej. Nie możesz tego zrobić temu członkowi.**",
	tempmute_tomute_max_time_passed:
		"\n-# ${emoji_VC_OpenChat} Discord ogranicza wyciszenie do 28 dni. Zastosowałem 28 dni.",
	temprole_dont_have_permission:
		"${emoji_No} | Nie masz uprawnień do nadawania członkom ról czasowych.",
	temprole_i_dont_have_permission: "${emoji_No} | Nie mam uprawnień.",
	temprole_cannot_add_yourself:
		"${emoji_No} | Nie możesz nadać sobie roli czasowej!",
	temprole_already_has_role: "Ten użytkownik ma już tę rolę czasową!",
	temprole_removed_by_time:
		"Rola czasowa użytkownika <@${tomuteId}> została usunięta!",
	temprole_logs_embed_title: "Logi ról czasowych",
	temprole_logs_embed_description:
		"<@${authorId}> nadał(a) rolę czasową <@${tomuteId}> na ${duration}\n**Powód**: `${reason}`",
	temprole_tomute_is_admin:
		"${emoji_No} | Ten użytkownik ma uprawnienia administratora, nie mogę nadać mu roli czasowej.",
	temprole_tomute_highest_role_or_same:
		"${emoji_No} | **Moja rola na tym serwerze jest niższa lub równa roli ${tomute}. Nie mogę moderować tego członka.**",
	temprole_tomute_max_time_passed:
		"\n-# ${emoji_VC_OpenChat} Maksymalny czas roli czasowej to 1 rok. Zastosowałem 1 rok.",
	unmute_dont_have_permission:
		"${emoji_No} | Nie masz uprawnień do czasowego wyciszania członków.",
	unmute_attempt_mute_your_self:
		"${emoji_No} | Nie możesz wyciszyć samego siebie!",
	unmute_i_dont_have_permission: "${emoji_No} | Nie mam uprawnień.",
	unmute_not_muted: "Ten użytkownik nie jest wyciszony!",
	unmute_muted_role_doesnt_exist:
		"Rola `muted` nie istnieje. Najpierw wycisz jakiegoś użytkownika, aby rola wyciszenia została utworzona...",
	unmute_logs_embed_title: "Logi odciszeń",
	unmute_logs_embed_description: "<@${authorId}> odciszył(a) <@${tomuteId}>",
	unmuteall_no_muted_members: "Nie znaleziono wyciszonych członków.",
	unmuteall_audit_reason: "Odciszenie wszystkich",
	unmuteall_logs_embed_title: "Logi odciszenia wszystkich",
	unmuteall_logs_embed_description:
		"<@${authorId}> odciszył(a) członków: ${unmuted}/${total}.",
	warn_dont_have_permission:
		"${emoji_No} | Nie masz uprawnień do ostrzegania członków na tym serwerze Discord.",
	unwarn_cannot_found:
		"${emoji_No} ${member} chyba nie ma żadnych ostrzeżeń w mojej bazie danych!",
	unwarn_cannot_found_id:
		"${emoji_No} ${member}, podanego ID ostrzeżenia nie ma w mojej bazie danych",
	unwarn_logEmbed_title: "Logi usunięć ostrzeżeń",
	unwarn_logEmbed_desc: "${author} usunął(-ęła) ostrzeżenie dla ${member}",
	unwarn_dont_have_permission:
		"${emoji_No} | Nie masz uprawnień do usuwania ostrzeżeń członkom na tym serwerze Discord.",
	warnlist_no_data:
		"${emoji_No} ${member} chyba nie ma żadnych ostrzeżeń w mojej bazie danych!",
	warnlist_dont_have_permission:
		"${emoji_No} | Nie masz uprawnień do zarządzania ostrzeżeniami członków na tym serwerze Discord.",
	clear_allwarns_confirmation_message:
		"**Czy na pewno chcesz usunąć wszystkie dane ostrzeżeń?\nTa czynność jest trwała i nie można jej cofnąć.**\n**Ta czynność jest destrukcyjna!!**",
	clear_allwarns_command_ok:
		"Wszystkie ostrzeżenia na tym serwerze Discord zostały usunięte.",
	baninfo_not_banned: "Użytkownik nie jest zbanowany",
	baninfo_user_not_found: "Nie znaleziono użytkownika",
	var_banned_by: "Zbanowany(-a) przez",
	var_ban_date: "Data bana",
	tempban_dont_have_permission:
		"Nie masz uprawnień do czasowego banowania członków.",
	tempban_i_dont_have_permission: "Nie mam uprawnień do banowania członków.",
	tempban_cannot_ban_yourself: "Nie możesz zbanować samego siebie!",
	tempban_already_banned: "Ten użytkownik jest już czasowo zbanowany!",
	tempban_unbanned_by_time: "**<@${userId}>** został(a) odbanowany(-a)!",
	tempban_logs_embed_title: "Logi czasowych banów",
	tempban_logs_embed_description:
		"**<@${executorId}>** czasowo zbanował(a) **<@${userId}>** na **${duration}**\n**Powód**: `${reason}`",
	tempban_user_is_admin:
		"Ten użytkownik ma uprawnienia administratora, nie mogę go zbanować.",
	tempban_user_highest_role_or_same:
		"Moja rola na tym serwerze jest niższa lub równa roli **${user}**. Nie mogę moderować tego członka.",
	tempban_max_time_passed:
		"\n*Maksymalny czas bana czasowego to 1 rok. Zastosowałem 1 rok.*",
	tempban_user_not_in_guild:
		"Tego użytkownika nie ma na serwerze, ale nadal można go zbanować.",
	backup_wait_please: "⏲ Chwileczkę...",
	backup_not_admin:
		":x: | Musisz być administratorem tego serwera, aby poprosić o kopię zapasową!",
	backup_i_dont_have_permission: "Nie mam uprawnienia `ADMINISTRATOR`",
	backup_command_work_on_creation:
		":white_check_mark: Kopia zapasowa została pomyślnie utworzona.",
	backup_command_work_info_on_creation:
		"Kopia zapasowa została utworzona! ID: `${id}`!",
	backup_logs_embed_title_on_creation: "Logi kopii zapasowych",
	backup_logs_embed_description_on_creation:
		"<@${authorId}> utworzył(a) kopię zapasową!",
	backup_dont_have_perm_on_load:
		":x: | Musisz być administratorem tego serwera, aby wczytać kopię zapasową!",
	backup_i_dont_have_perm_on_load: "Nie mam uprawnienia `ADMINISTRATOR`",
	backup_unvalid_id_on_load:
		":x: | Musisz podać prawidłowe ID kopii zapasowej!",
	backup_waiting_on_load: "${emoji_Yes} - Wczytywanie...",
	backup_error_on_load:
		":x: | Przepraszam, wystąpił błąd... Sprawdź, czy mam uprawnienia administratora!",
	backup_error_when_fetch_backup_on_load:
		":x: | Nie znaleziono kopii zapasowej dla ${backupID}!",
	backup_this_is_not_your_backup:
		"${emoji_No} | To nie jest twoja kopia zapasowa!",
	backup_backup_doesnt_exist: "Błąd: ta kopia zapasowa nie istnieje.",
	backup_string_see_v:
		":placard:・Liczba kategorii: `${categoryCount}`\n:hash:・Liczba kanałów: `${channelCount}`",
	backup_all_of_your_backup: "**Wszystkie twoje kopie zapasowe:**",
	backup_string_see_another_v:
		":placard:・Liczba kategorii: `${categoryCount}`\n:hash:・Liczba kanałów: `${channelCount}`",
	backup_load_confirm:
		"${author},\n# BARDZO NIEBEZPIECZNA CZYNNOŚĆ\n# Czy na pewno chcesz wczytać tę kopię zapasową?\nZastąpi to wszystkie obecne kanały, role, emoji, bany, konfigurację... twojego serwera.\nTEJ CZYNNOŚCI NIE MOŻNA COFNĄĆ!",
	backup_not_load:
		"Kopia zapasowa nie została wczytana, czynność została anulowana na twoją prośbę.",
	backup_really_want:
		"${emoji_Warning_Icon} Czy na pewno chcesz usunąć tę kopię zapasową?",
	backup_confirm_button: "Tak, usuń tę kopię zapasową",
	backup_cancel_button: "Anuluj czynność",
	backup_embed_title_succefully_deleted:
		"${emoji_Yes} Kopia zapasowa została pomyślnie usunięta!",
	backup_embed_title_cancel_deletion:
		"${emoji_Yes} Kopia zapasowa została zachowana!",
	backup_embed_title_timesup_deletion:
		"${emoji_No} Czas minął. Kopia zapasowa została zachowana!",
	backup_manage_nique_tes_mort:
		"Odmowa dostępu. To polecenie jest zarezerwowane dla właściciela serwera.\n# Nie możesz wyłączyć ochrony kopii zapasowych, aby narazić bezpieczeństwo serwera.\n# Każda próba nadużycia zostanie zgłoszona i zablokowana.",
	backup_manage_admin: "wszyscy administratorzy",
	backup_manage_owner: "właściciel serwera",
	backup_manage_command_ok:
		"Moduł kopii zapasowych został zaktualizowany. Od teraz: ${allowed_user_string} mogą tworzyć i wczytywać kopie zapasowe na tym serwerze.",
	backup_component_settings: "Ustawienia serwera",
	backup_component_settings_desc:
		"Nazwa, obrazy, poziomy, kanały systemowe, ekran powitalny",
	backup_component_roles: "Role",
	backup_component_roles_desc: "Kolejność, kolory, ikony i uprawnienia",
	backup_component_channels: "Kanały",
	backup_component_channels_desc:
		"Kategorie, tekstowe, głosowe, fora i wątki",
	backup_component_permissions: "Uprawnienia kanałów",
	backup_component_permissions_desc:
		"Nadpisania dla ról i członków na każdym kanale",
	backup_component_emojis: "Emoji",
	backup_component_emojis_desc: "Wszystkie niestandardowe emoji serwera",
	backup_component_stickers: "Naklejki",
	backup_component_stickers_desc: "Statyczne i animowane naklejki serwera",
	backup_component_bans: "Bany",
	backup_component_bans_desc: "Zbanowani użytkownicy i powody",
	backup_component_automod: "Reguły AutoMod",
	backup_component_automod_desc: "Natywne reguły moderacji Discorda",
	backup_component_events: "Wydarzenia",
	backup_component_events_desc: "Zaplanowane wydarzenia serwera",
	backup_component_messages: "Wiadomości",
	backup_component_messages_desc: "Ostatnie 100 wiadomości z każdego kanału",
	backup_component_members: "Członkowie",
	backup_component_members_desc: "Pseudonimy i role obecnych członków",
	backup_select_placeholder: "Wybierz, co uwzględnić",
	backup_usage: "Użyto kopii zapasowych: ${count}/${max}",
	backup_limit_reached:
		"Osiągnięto limit **${max} kopii zapasowych**. Najpierw usuń jedną za pomocą `/backup delete`.",
	backup_busy:
		"Operacja na kopii zapasowej już trwa, spróbuj ponownie za chwilę.",
	backup_panel_expired: "Ten panel wygasł, uruchom polecenie ponownie.",
	backup_btn_create: "Utwórz kopię zapasową",
	backup_btn_all: "Zaznacz wszystko",
	backup_btn_load: "Wyczyść i przywróć",
	backup_btn_schedule_save: "Zapisz harmonogram",
	backup_btn_schedule_disable: "Wyłącz",
	backup_create_title: "Nowa kopia zapasowa",
	backup_create_desc: "Wybierz, co zapisać z serwera **${guildName}**.",
	backup_create_progress:
		"${emoji} Tworzenie kopii zapasowej, to może chwilę potrwać...",
	backup_create_cancelled: "Kopia zapasowa anulowana.",
	backup_create_failed:
		"Nie udało się zapisać kopii zapasowej. Nic nie zostało dodane do twojej listy.",
	backup_created_title: "Kopia zapasowa utworzona",
	backup_created_desc:
		"ID twojej kopii zapasowej to `${id}`. Użyj go z `/backup load`.",
	backup_created_partial:
		"**Nie udało się zapisać, więc nie zostanie przywrócone:** ${parts}",
	backup_load_title: "Przywróć kopię zapasową",
	backup_load_desc:
		"Kopia zapasowa serwera **${guildName}**, wykonana ${date}.",
	backup_load_warning:
		"**Tej operacji nie można cofnąć.** Wszystko, co zaznaczono, zostanie usunięte z tego serwera, a następnie przywrócone. Role są dopasowywane według nazwy i aktualizowane, więc członkowie je zachowują; role nieobecne w kopii zapasowej są usuwane tylko wtedy, gdy przywracane są również kanały.",
	backup_load_progress:
		"${emoji} Przywracanie, to może potrwać kilka minut...",
	backup_load_done_title: "Kopia zapasowa przywrócona",
	backup_load_done_desc: "Serwer **${guildName}** został przywrócony.",
	backup_load_report_line: "${emoji} **${label}**: przywrócono ${okCount}",
	backup_load_report_failed: "(niepowodzeń: ${failedCount})",
	backup_list_title: "Twoje kopie zapasowe",
	backup_list_empty:
		"Nie masz jeszcze żadnej kopii zapasowej. Utwórz ją za pomocą `/backup create`.",
	backup_list_entry:
		"**${guildName}** · ${mode} · ${date}\n`${id}`\nkategorii: ${categoryCount}, kanałów: ${channelCount}",
	backup_list_manual: "Ręczna",
	backup_list_auto: "Automatyczna",
	backup_delete_title: "Usunąć tę kopię zapasową?",
	backup_delete_desc:
		"**${guildName}** `${id}`\nkategorii: ${categoryCount}, kanałów: ${channelCount}",
	backup_delete_done: "Kopia zapasowa została usunięta.",
	backup_delete_cancelled: "Kopia zapasowa została zachowana.",
	backup_schedule_title: "Automatyczne kopie zapasowe",
	backup_schedule_desc:
		"Są zapisywane na twoim koncie i wliczają się do twojego limitu. Przechowywanych jest tylko ostatnich ${maxAuto} automatycznych kopii zapasowych tego serwera.",
	backup_schedule_owner_only:
		"Tylko właściciel serwera może planować automatyczne kopie zapasowe.",
	backup_schedule_status_on:
		"Aktywne: **${frequency}**, następna kopia ${next}",
	backup_schedule_status_off:
		"Nie zaplanowano żadnej automatycznej kopii zapasowej.",
	backup_schedule_frequency_placeholder: "Wybierz częstotliwość",
	backup_frequency_1d: "Codziennie",
	backup_frequency_3d: "Co 3 dni",
	backup_frequency_1w: "Co tydzień",
	backup_frequency_2w: "Co 2 tygodnie",
	backup_frequency_1m: "Co miesiąc",
	backup_frequency_3m: "Co 3 miesiące",
	backup_frequency_6m: "Co 6 miesięcy",
	backup_frequency_12m: "Co rok",
	backup_schedule_dm_limit:
		"Automatyczna kopia zapasowa serwera **${guildName}** została pominięta: osiągnięto limit ${max} kopii zapasowych. Usuń jedną za pomocą `/backup delete`.",
	backup_schedule_dm_failed:
		"Automatyczna kopia zapasowa serwera **${guildName}** nie powiodła się. Zostanie ponowiona w następnym zaplanowanym terminie.",
	reactionroles_dont_admin_added:
		":x: | Musisz być administratorem tego serwera, aby użyć tego polecenia!",
	reactionroles_embed_message_description_added:
		"__Jak używać?__\n/rolesreaction add `<message id>` `<reaction>` `<rolesid>`\n/rolesreaction remove `<message id>` `<reaction>`\n/rolesreaction list `<message id>`",
	reactionroles_missing_reaction_added: "Brak argumentu: emoji reakcji",
	reactionroles_invalid_emote_format_added:
		"${emoji_No} | Nie możesz wysłać mi `CUSTOM_EMOJI` w formacie `<::xxx>`! Potrzebuję tylko jego ID!",
	reactionroles_logs_embed_title_added: "Logi ról za reakcje",
	reactionroles_logs_embed_description_added:
		"<@${authorId}> ustawił(a) rolę za reakcję: wiadomość: `${messagei}` | reakcja: `${reaction}` | rola: ${role}",
	reactionroles_command_work_added:
		"${reaction} została dodana do wiadomości ${messagei}, aby nadawać rolę ${role}",
	reactionroles_missing_remove: "Brak argumentu: emoji reakcji",
	reactionroles_missing_reaction_remove:
		"Nie znaleziono ról za reakcje w mojej bazie danych...",
	reactionroles_cant_fetched_reaction_remove:
		"Nie można pobrać wskazanej reakcji z tej wiadomości!",
	reactionroles_logs_embed_title_remove: "Logi ról za reakcje",
	reactionroles_logs_embed_description_remove:
		"<@${authorId}> usunął(-ęła) rolę za reakcję: wiadomość: `${messagei}` | reakcja: `${reaction}`",
	reactionroles_command_work_remove:
		"${reaction} została usunięta z wiadomości ${messagei}",
	reactionroles_dont_message_found:
		"Nie mogę pobrać wiadomości o podanym ID lub wybrane emoji nie pochodzi z serwera, na którym jestem!",
	buttonreaction_logs_embed_title_added: "Logi ról za przyciski",
	buttonreaction_logs_embed_description_added:
		"<@${authorId}> ustawił(a) reakcję za pomocą przycisku: wiadomość: `${messagei}` | reakcja: `${reaction}` | rola: ${role}",
	buttonreaction_dont_message_found:
		"Nie można dodać tego przycisku, role wydają się już być ustawione w jednym z istniejących przycisków!",
	buttonreaction_roles_not_found:
		"Brak argumentów: nie podano ról do ustawienia!",
	buttonreaction_message_other_user_error:
		"Nie mogę modyfikować komponentów wiadomości innego użytkownika. Musisz wybrać wiadomość wysłaną przeze mnie. Wskazówka: użyj `/utils embed`, aby stworzyć własny piękny embed!",
	roleselect_invalid_message_id:
		"Podano nieprawidłowe ID wiadomości. Podaj prawidłowe ID wiadomości.",
	roleselect_message_not_found:
		"Nie znaleziono wiadomości na wskazanym kanale.",
	roleselect_default_placeholder: "Wybierz skonfigurowane role",
	roleselect_menu1_placeholder: "Wybierz akcję",
	roleselect_menu1_add: "Dodaj opcję roli",
	roleselect_menu1_remove: "Usuń opcję roli",
	roleselect_menu1_change_placeholder: "Zmień tekst zastępczy menu wyboru",
	roleselect_menu1_save: "Zapisz i zastosuj konfigurację",
	roleselect_menu1_cancel: "Anuluj",
	roleselect_menu1_embed_title: "Konfiguracja wyboru ról",
	roleselect_menu1_embed_description:
		"Gdy użytkownik wybierze pola w menu wyboru, otrzyma określoną rolę",
	roleselect_modal1_title: "Dodaj opcję roli",
	roleselect_modal1_fields1_label: "Emoji",
	roleselect_modal1_fields1_placeholder:
		"Wybierz emoji dla tej opcji roli (opcjonalnie)",
	roleselect_modal1_fields2_label: "Tytuł opcji",
	roleselect_modal1_fields2_placeholder: "Krótki tytuł opcji roli",
	roleselect_modal1_fields3_label: "Opis",
	roleselect_modal1_fields3_placeholder: "Opisz opcję roli (opcjonalnie)",
	roleselect_awaiting1_msg: "Wybierz rolę dla tej opcji",
	roleselect_awaiting1_menu_placeholder: "Wybierz rolę",
	roleselect_role_already_exist: "Ta rola już istnieje w konfiguracji.",
	roleselect_no_role_found: "Brak opcji ról do usunięcia.",
	roleselect_all_role_removed: "Wszystkie opcje ról zostały usunięte.",
	roleselect_last_role_removed:
		"Ostatnia opcja roli została pomyślnie usunięta.",
	roleselect_save_command_ok:
		"Konfiguracja wyboru ról została pomyślnie zapisana!",
	roleselect_failed_to_save_config:
		"Nie udało się zapisać konfiguracji. Spróbuj ponownie.",
	roleselect_canceled_command_ok:
		"Konfiguracja wyboru ról została anulowana.",
	roleselect_modal2_title: "Tekst zastępczy menu wyboru",
	roleselect_modal2_label: "Tekst zastępczy",
	roleselect_modal2_placeholder: "Tekst zastępczy menu wyboru",
	punishpub_not_admin:
		":x: | Musisz być administratorem tego serwera, aby użyć tego polecenia!",
	punishpub_too_hight_enable:
		"Ta liczba jest zbyt wysoka! Nie jest to zalecane!",
	punishpub_negative_number_enable: "Nie możesz podać liczby ujemnej!",
	punishpub_zero_number_enable: "Liczba 0 jest niedozwolona!",
	punishpub_confirmation_message_enable:
		"Pomyślnie **włączono** PunishPub z maksymalną liczbą flag **${amount}** i następującą karą: **${punishement}**!",
	punishpub_logs_embed_title: "Logi PunishPub",
	punishpub_logs_embed_description:
		"<@${authorId}> włączył(a) PunishPUB z maksymalną liczbą flag ${amount} i karą ${punishement}!",
	punishpub_confirmation_disable: "Pomyślnie wyłączono PunishPub",
	punishpub_logs_embed_title_disable: "Logi PunishPub",
	punishpub_logs_embed_description_disable:
		"<@${authorId}> wyłączył(a) PunishPUB!",
	report_cooldown_command:
		"Przepraszam, musisz poczekać **${time}**, zanim użyjesz tego polecenia ponownie!",
	report_owner_need:
		":x: | **Musisz być właścicielem serwera, aby użyć tego polecenia!**",
	report_specify: "Opisz błąd. Używaj dobrych i pełnych zdań!",
	report_command_work: "**Dziękujemy za zgłoszenie błędu!**",
	support_not_admin:
		":x: | Musisz być administratorem tego serwera, aby używać tych poleceń!",
	support_card_on_title: "Rola wspierającego włączona",
	support_card_on_desc: "Członkowie spełniający warunek dostają ${role} i tracą ją, gdy przestają.",
	support_card_condition: "Warunek",
	support_card_keyword: "Szukane w statusie",
	support_card_role: "Rola",
	support_card_cond_bio: "Status niestandardowy zawiera słowo kluczowe",
	support_card_cond_tag: "Noszą tag serwera",
	support_card_cond_both: "Słowo kluczowe w statusie **i** tag serwera",
	support_card_cond_either: "Słowo kluczowe w statusie **lub** tag serwera",
	support_card_no_keyword: "Brak słowa kluczowego i własnego zaproszenia na tym serwerze: nikt nie spełni warunku statusu. Użyj komendy ponownie ze słowem kluczowym.",
	support_card_footer: "Członkowie online, którzy już spełniają warunek, dostają ją teraz, potem przy każdej zmianie statusu.",
	support_card_off_title: "Rola wspierającego wyłączona",
	support_card_off_desc: "Nikt nie dostanie już roli. Ci, którzy ją mają, zachowają ją.",
	support_command_not_role: ":x: | Nie podano roli!",
	support_command_not_type:
		":x: | Nie podałeś(-aś) typu wsparcia, jakiego chcesz w profilu użytkownika (bio = opis profilu, np. link do serwera; tag = tag serwera na Discordzie)!",
	support_command_guild_not_have_tag:
		":x: | Serwer nie ma obecnie żadnych tagów.",
	updates_embed_title: "Aktualizacje iHorizon",
	updates_embed_description: "Oto najnowsze zmiany i aktualizacje iHorizon.",
	updates_field_version: "Wersja",
	updates_field_commit: "Ostatni commit",
	updates_field_branch: "Gałąź",
	updates_field_links: "Linki",
	updates_changelog_attached: "Pełny dziennik zmian jest dołączony jako PDF.",
	newsletter_dm_title: "iHorizon {version} - Informacje o wydaniu",
	newsletter_dm_body:
		"Cześć {owner},\n\nWdrożono nową główną wersję iHorizon.\n\n**Wersja**: {version}\n**Wydanie**: {releaseUrl}\n\nPełny dziennik zmian znajdziesz w załączonym pliku PDF.\n\nPotrzebujesz pomocy? Dołącz do naszego serwera wsparcia: https://discord.gg/ihorizon\n-# Użyj +updates, aby zarządzać subskrypcją, lub przycisku poniżej, aby ją anulować.",
	newsletter_btn_unsubscribe: "Zrezygnuj z newslettera",
	newsletter_btn_subscribe: "Zapisz się do newslettera",
	newsletter_not_owner:
		"Haha, miło wiedzieć, że zależy ci na tyle, by śledzić zmiany w moim kodzie na bieżąco :3\n\n**Ale najpierw musisz dodać mnie na serwer Discord:**\n\n<https://discord.com/oauth2/authorize?client_id=${clientId}>\n**W ten sposób będę informować cię o nowościach.**\n\n> Inna możliwość: dołącz do discord.gg/ihorizon. Moi twórcy oznaczają tam z dziennikiem zmian przy każdej aktualizacji. Twój wybór :3",
	newsletter_toggle_enabled: "Powiadomienia newslettera włączone.",
	newsletter_toggle_disabled: "Powiadomienia newslettera wyłączone.",
	setserverlang_not_admin:
		":x: | Musisz być administratorem tego serwera, aby użyć tego polecenia!",
	setserverlang_logs_embed_title_on_enable: "Logi zmiany języka serwera",
	setserverlang_logs_embed_description_on_enable:
		"<@${authorId}> ustawił(a) język iHorizon na **${type}**!",
	setserverlang_already: "Już używam tego języka!",
	setserverlang_command_work_enable:
		"Mój język został zmieniony na **${type}**",
	setserverlang_panel_title: "Wybór języka",
	setserverlang_panel_description:
		"Wybierz język, którego iHorizon ma używać na tym serwerze.",
	setserverlang_panel_current: "Obecny język",
	setserverlang_panel_select: "Wybierz język...",
	setserverlang_panel_saved: "Język został pomyślnie zmieniony!",
	setserverlang_command_error_enable: "Błąd!",
	embed_placeholder_string_select_menu_builder: "Co chcesz zrobić?",
	embed_placeholder_option_copy_embed: "Skopiuj embed",
	embed_placeholder_option_edit_title: "Edytuj tytuł",
	embed_placeholder_option_delete_title: "Usuń tytuł",
	embed_placeholder_option_edit_description: "Edytuj opis",
	embed_placeholder_option_delete_description: "Usuń opis",
	embed_placeholder_option_edit_author: "Edytuj autora",
	embed_placeholde_option_change_footer_image: "Zmień ikonę stopki",
	embed_placeholder_option_delete_author: "Usuń autora",
	embed_placeholder_option_edit_footer: "Edytuj stopkę",
	embed_placeholder_option_delete_footer: "Usuń stopkę",
	embed_placeholder_option_edit_thumbnail: "Edytuj miniaturę",
	embed_placeholder_option_edit_image: "Edytuj obraz",
	embed_placeholder_option_edit_titleurl: "Edytuj adres URL tytułu",
	embed_placeholder_option_edit_color: "Edytuj kolor",
	embed_placeholder_option_delete_color: "Usuń kolor",
	embed_btn_save: "Zapisz embed",
	embed_btn_send: "Wyślij embed",
	embed_btn_cancel: "Anuluj",
	embed_interaction_not_for_you: "Ta interakcja nie jest dla ciebie",
	embed_first_message: "Co chcesz zrobić?",
	embed_save_message:
		"<@${authorId}>, **zdecydowałeś(-aś) się zapisać konfigurację embeda!**```ID embeda: ${embedId}```",
	embed_cancel_message:
		"<@${authorId}>, **zdecydowałeś(-aś) się porzucić konfigurację embeda!**",
	embed_send_message:
		"<@${authorId}>, **na którym kanale mam wysłać ten embed?**",
	embed_timeout_getbtn:
		"<@${authorId}>, **zbyt długo zwlekałeś(-aś) z odpowiedzią, przerywam bieżącą operację!**",
	embed_choose_0:
		"Wyślij link do wiadomości, której embed chcesz skopiować (prawy klik na wiadomości, Kopiuj link do wiadomości).",
	embed_choose_1: "Jaki tytuł chcesz umieścić w swoim embedzie?",
	embed_choose_2: "Tytuł embeda został pomyślnie usunięty!",
	embed_choose_3: "Jaki opis chcesz umieścić w swoim embedzie?",
	embed_choose_4: "Opis embeda został pomyślnie usunięty!",
	embed_choose_5: "Jakiego autora chcesz umieścić w swoim embedzie?",
	embed_choose_6: "Autor embeda został pomyślnie usunięty!",
	embed_choose_7: "Jaką stopkę chcesz umieścić w swoim embedzie?",
	embed_choose_7bis: "Jaką ikonę stopki chcesz umieścić w swoim embedzie?",
	embed_choose_8: "Stopka embeda została pomyślnie usunięta!",
	embed_choose_9: "Jakiej miniatury chcesz użyć w swoim embedzie?",
	embed_choose_10: "Jakiego obrazu chcesz użyć w swoim embedzie?",
	embed_choose_11: "Jakiego adresu URL tytułu chcesz użyć w swoim embedzie?",
	embed_choose_12:
		"Jakiego koloru chcesz użyć w swoim embedzie? **www.color-hex.com**",
	embed_choose_12_error:
		"${emoji_No} | Nieprawidłowy kolor! Sprawdź **www.color-hex.com**",
	embed_choose_13: "Kolor embeda został pomyślnie usunięty!",
	embed_send_embed_work:
		"<@${authorId}>, **pomyślnie wysłałeś(-aś) embed na kanał <#${messageContent}>!**",
	embed_copy_bad_guild_msg:
		"Serwer tej wiadomości nie jest taki sam jak ${guildName}",
	embed_copy_bad_channel_msg: "Kanał tej wiadomości jest niedostępny!",
	embed_copy_bad_message_msg: "Wiadomość jest niedostępna!",
	embed_copy_bad_embed_message_msg: "Ta wiadomość nie zawiera embeda!",
	embed_copy_bad_url_msg:
		"Nieprawidłowy adres URL, spróbuj ponownie. Prawidłowy format to: https://discord.com/channels/${messageGuildId}/${channelId}/${id}",
	embed_btn_replace: "Zastąp embed",
	embed_replace_question_msg:
		"Jaki jest nowy adres URL wiadomości, w której trzeba zastąpić embed?",
	embed_replace_message:
		"{user}, nowy embed zastąpił embed w wiadomości {messageUrl}",
	rolesaver_embed_title: "Moduł RoleSaver",
	rolesaver_embed_desc:
		"Gdy członkowie opuszczają serwer, ich role są zapisywane w bazie danych. Gdy wrócą, iHorizon przywraca im role.",
	rolesaver_embed_fields_1_name: "Włącz",
	rolesaver_embed_fields_2_name: "Przywracaj role administratora",
	rolesaver_embed_fields_3_name: "Limit czasu",
	rolesaver_on_off_already_set: "Moduł jest już wyłączony!",
	rolesaver_on_off_embed_title: "Moduł RoleSaver",
	rolesaver_on_off_embed_desc:
		"Gdy członkowie opuszczają serwer, ich role nie będą zapisywane w bazie danych. Od teraz iHorizon nie przywraca członkom dawnych ról po powrocie na serwer.",
	rolesaver_on_off_embed_fields_1_name: "Włącz",
	var_nm_role_app_dont_exist:
		"${emoji_Warning_Icon} Bot nie ma roli aplikacji. Dodaj bota ponownie, w prawidłowy sposób.\n",
	var_nm_role_app_not_high:
		"${emoji_Warning_Icon} Rola bota nie jest najwyższa. Umieść ją na samej górze.\n",
	var_nm_role_app_not_admin:
		"${emoji_Warning_Icon} Rola bota nie ma uprawnień administratora.\n",
	var_nm_end_main: "Tryb nocny się kończy.\n\n",
	var_nm_start_main: "Tryb nocny zaraz się rozpocznie.\n\n",
	var_nm_edited_roles: "Zmodyfikowano następujące role:",
	var_nm_running: "uruchomienia",
	var_nm_stopping: "wyłączenia",
	var_nm_running2: "rozpoczyna się",
	var_nm_stopping2: "kończy się",
	var_nm_title: "Tryb nocny",
	var_nm_ping_embed_title: "Tryb nocny: ${type}",
	var_nm_ping_embed_fields_0_name: "Przedział czasu",
	var_nm_error_occured: "# Wystąpił problem podczas ${type} trybu nocnego.\n",
	nightmode_embed_desc:
		"# ⭐️ Tryb nocny\n> *Czym jest tryb nocny?* Tryb nocny to funkcja bezpieczeństwa **[stworzona przez iHorizon](https://www.ihorizon.org)**, która pozwala wyłączyć wszystkie uprawnienia administratora na serwerze Discord w określonym czasie.\n> *Na przykład jesteś na serwerze Discord z dużą liczbą moderatorów i chcesz odebrać wszystkie uprawnienia administratora na noc, aby uniknąć rajdu, przejęcia vanity URL itp.*\n> *Jesteś we właściwym miejscu. **iHorizon zawsze będzie rozwiązaniem.***\n\n---\n",
	nightmode_embed_fields_0_name: "Włącz moduł",
	nightmode_embed_fields_1_name: "Powiadom właściciela serwera",
	nightmode_embed_fields_2_name: "Odbierać role botom?",
	nightmode_embed_fields_3_name: "Boty na białej liście",
	nightmode_embed_fields_4_name: "Przedział czasu",
	nightmode_select_placeholder: "Skonfiguruj tryb nocny na serwerze.",
	nightmode_select_0_label: "Włącz tryb nocny",
	nightmode_select_0_desc: "Włącz/wyłącz tryb nocny.",
	nightmode_select_1_label: "Ostrzegaj właściciela serwera",
	nightmode_select_1_desc:
		"Powiadom właściciela serwera przy włączaniu/wyłączaniu",
	nightmode_select_2_label: "Skonfiguruj przedział czasu trybu nocnego",
	nightmode_select_2_desc:
		"Przedział czasu, w którym uprawnienia administratora są automatycznie odbierane.",
	nightmode_select_3_label: "Odbieraj role botom",
	nightmode_select_3_desc: "Czy boty mają tracić rangę w nocy?",
	nightmode_select_4_label: "Zmień strefę czasową (UTC)",
	nightmode_select_4_desc:
		"Jeśli masz konkretną godzinę, musisz ją ustawić (format liczby UTC)",
	nightmode_select1_placeholder:
		"Boty, którym wolno być administratorami w nocy",
	nightmode_change_timezone_question:
		"Wybierz UTC dla swojego serwera Discord",
	nightmode_modal_hours_window_fields0_label:
		"Godzina rozpoczęcia (np. 21:30 lub 2130)",
	nightmode_modal_hours_window_fields1_label:
		"Godzina zakończenia (np. 06:15 lub 0615)",
	nightmode_modal_hours_window_title:
		"Tryb nocny - przedział czasu (format 24 h z minutami)",
	nightmode_invalid_hour_morning:
		"${emoji_No} Godzina rozpoczęcia jest nieprawidłowa. Użyj formatu: 21:30 lub 2130",
	nightmode_invalid_hour_night:
		"${emoji_No} Godzina zakończenia jest nieprawidłowa. Użyj formatu: 06:15 lub 0615",
	nightmode_utc_timezone_on: "Strefa czasowa UTC włączona",
	git_lines_avoiding_spam:
		"Przepraszam, ale aby zapobiec spamowi, ograniczamy liczbę wyświetlanych linii do 50",
	git_lines_avoiding_limit:
		"Przepraszam, ale Discord ma limit 2000 znaków, więc nie mogliśmy wyświetlić żądanego fragmentu",
	git_lines_work: "✅ Git Lines jest teraz włączone.",
	git_lines_work_disabled: "❌ Git Lines jest teraz wyłączone.",
	git_lines_borred_warning:
		"\n-# ${emoji_VC_OpenChat} Przeszkadzam ci? Możesz użyć `/git lines`, aby wyłączyć ten moduł!",
	counter_config_command_action_on:
		"${author}, ustawiono `Włączony` dla modułu licznika.\nJeśli kanał nie istnieje, skonfiguruj go poleceniem: **/counter channel**.",
	counter_config_command_action_off:
		"${author}, ustawiono `Wyłączony` dla modułu licznika.",
	counter_channel_embed_title: "Moduł licznika ustawiony tutaj!",
	counter_channel_embed_desc:
		"${author} ustawił(a) tutaj moduł licznika!\nUżytkownicy mogą teraz tu liczyć!",
	counter_channel_command_work:
		"${author}, pomyślnie ustawiono moduł licznika na kanale ${channel}!",
	counter_channel_command_error:
		"${author}, polecenie zwróciło błąd. Sprawdź, czy podany kanał istnieje i czy moduł licznika jest włączony!",
	counter_actual_number: "✨ **Aktualna liczba:** {number}",
	suggest_accept_not_admin: "Nie jesteś administratorem!",
	suggest_acceptnot_good_channel:
		"To polecenie musi zostać użyte na kanale modułu sugestii (<#${channel}>)!\nSprawdź, czy moduł sugestii nie jest wyłączony!",
	suggest_accept_not_found_db:
		"Nie znaleziono sugestii w mojej bazie danych!",
	suggest_accept_already_replied: "Na tę sugestię już odpowiedziano!",
	suggest_accept_embed_fields_to_put:
		"Odpowiedź od ${authorUsername} (akceptacja)",
	suggest_accept_command_work:
		"Zaakceptowano sugestię!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_accept_command_error: "Nie znaleziono sugestii na kanale Discord!",
	suggest_deny_not_admin: "Nie jesteś administratorem!",
	suggest_deny_not_good_channel:
		"To polecenie musi zostać użyte na kanale modułu sugestii (<#${channel}>)!\nSprawdź, czy moduł sugestii nie jest wyłączony!",
	suggest_deny_not_found_db: "Nie znaleziono sugestii w mojej bazie danych!",
	suggest_deny_already_replied: "Na tę sugestię już odpowiedziano!",
	suggest_deny_embed_fields_to_put:
		"Odpowiedź od ${authorUsername} (odrzucenie)",
	suggest_deny_command_work:
		"Odrzucono sugestię!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_deny_command_error:
		"Nie znaleziono sugestii na tym kanale Discord!",
	suggest_reply_not_admin: "Nie jesteś administratorem!",
	suggest_reply_not_good_channel:
		"To polecenie musi zostać użyte na kanale modułu sugestii (<#${channel}>)!\nSprawdź, czy moduł sugestii nie jest wyłączony!",
	suggest_replynot_found_db: "Nie znaleziono sugestii w mojej bazie danych!",
	suggest_reply_already_replied: "Na tę sugestię już odpowiedziano!",
	suggest_reply_embed_fields_to_put: "Odpowiedź od ${authorUsername}",
	suggest_reply_command_work:
		"Wysłano odpowiedź na sugestię!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_reply_command_error: "Nie znaleziono sugestii na kanale Discord!",
	suggest_delete_not_delete: "Nie jesteś administratorem!",
	suggest_delete_not_good_channel:
		"To polecenie musi zostać użyte na kanale modułu sugestii (<#${channel}>)!\nSprawdź, czy moduł sugestii nie jest wyłączony!",
	suggest_delete_not_found_db:
		"Nie znaleziono sugestii w mojej bazie danych!",
	suggest_delete_command_work: "Usunięto sugestię!",
	suggest_delete_command_error:
		"Nie znaleziono sugestii na tym kanale Discord!",
	suggest_not_staff: "Nie możesz zarządzać sugestiami.",
	suggest_status_pending: "Oczekuje",
	suggest_status_reviewing: "W trakcie rozpatrywania",
	suggest_status_accepted: "Zaakceptowana",
	suggest_status_planned: "Zaplanowana",
	suggest_status_implemented: "Zrealizowana",
	suggest_status_denied: "Odrzucona",
	suggest_notify_status:
		"<@${authorId}>, status twojej sugestii to teraz: **${status}**.",
	suggest_notify_reply:
		"<@${authorId}>, moderacja odpowiedziała na twoją sugestię.",
	suggest_button_reply: "Odpowiedz",
	suggest_modal_title: "Odpowiedz na sugestię",
	suggest_modal_label: "Twoja wiadomość",
	suggest_status_command_work:
		"Status sugestii to teraz: **${status}**.\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_list_title: "Sugestie",
	suggest_list_empty: "Brak sugestii do wyświetlenia.",
	suggest_list_footer: "${shownCount} z ${totalCount}",
	setsuggest_staff_role_set:
		"${author}, rola moderacji sugestii to teraz ${role}.",
	setsuggest_staff_role_removed:
		"${author}, rola moderacji sugestii została usunięta.",
	setsuggest_disable_not_admin: "Nie jesteś administratorem!",
	setsuggest_disable_pw_on: "${author}, włączono moduł sugestii!",
	setsuggest_disable_pw_off: "${author}, wyłączono moduł sugestii!",
	setsuggest_channel_not_admin: "Nie jesteś administratorem!",
	setsuggest_channel_already_set_with_that:
		"${author}, kanał modułu sugestii jest już ustawiony na ${channel}!",
	setsuggest_channel_embed_title: "Moduł sugestii ustawiony tutaj!",
	setsuggest_channel_embed_desc:
		"Teraz wszyscy użytkownicy, którzy mogą tu pisać, mogą coś zasugerować, po prostu wysyłając wiadomość!",
	setsuggest_channel_command_work:
		"${author}, kanał modułu sugestii został ustawiony na ${channel}!",
	security_disable_not_admin: "Nie jesteś administratorem!",
	security_disable_pw_on: "${author}, włączono moduł bezpieczeństwa!",
	security_disable_pw_off: "${author}, wyłączono moduł bezpieczeństwa",
	security_role_to_give_not_admin: "Nie jesteś administratorem!",
	security_role_to_give_command_work:
		"${author}, rola dla modułu bezpieczeństwa została ustawiona na ${role}!",
	security_channel_not_admin: "Nie jesteś administratorem!",
	security_channel_command_work:
		"${author}, ustawiono kanał ${channel} dla modułu Security!",
	schedule_menu_placeholder: "Co chcesz zrobić?",
	schedule_menu_choice_0: "Utwórz harmonogram",
	schedule_menu_choice_1: "Usuń harmonogram",
	schedule_menu_choice_2: "Usuń wszystkie harmonogramy",
	schedule_menu_choice_3: "Wyświetl wszystkie harmonogramy",
	schedule_modal_title: "Menedżer harmonogramów",
	schedule_modal_fields_1_label: "Nazwa harmonogramu?",
	schedule_modal_fields_2_label: "Opis harmonogramu?",
	schedule_delete_question:
		"Jakie jest ID harmonogramu, który chcesz usunąć?",
	schedule_deleteall_question:
		"Czy na pewno chcesz usunąć wszystkie swoje harmonogramy? (Y/n)",
	schedule_delete_not_found: "Ten użytkownik nie ma harmonogramów (${arg0})!",
	schedule_delete_title_embed: "Usuwanie harmonogramu (${arg0})",
	schedule_delete_confirm: "Harmonogram usunięty!",
	schedule_deleteall_title_embed: "Usuwanie wszystkich harmonogramów",
	schedule_deleteall_desc_embed:
		"Wszystkie Twoje harmonogramy zostały usunięte!",
	schedule_deleteall_confirm:
		"Wszystkie Twoje harmonogramy zostały usunięte!",
	schedule_deleteall_cancel: "Akcja `DELETE_ALL` została anulowana!",
	schedule_list_not_schedule: "Ten użytkownik nie ma żadnych harmonogramów!",
	schedule_list_title_embed: "Lista wszystkich harmonogramów",
	schedule_list_fields_embed:
		"**Kończy się**: ${expiresAt}```${title}``````${description}```\n",
	schedule_list_content_message: "Oto lista Twoich harmonogramów!",
	schedule_create_title_embed: "Tworzenie harmonogramu",
	schedule_create_when_question:
		"Kiedy chcesz otrzymać powiadomienie o tym harmonogramie? (Przykład: 6d = 6 dni, 2h = 2 godziny, 10m = 10 minut, 10s = 10 sekund)",
	schedule_create_not_number_time:
		"${author}, Twoja odpowiedź (czas, po którym chcesz otrzymać powiadomienie o harmonogramie) nie jest liczbą!",
	schedule_create_limit_reached:
		"${author}, masz już ${max} przypomnień. Usuń jedno, zanim utworzysz nowe.",
	schedule_create_embed_fields_name_confirm: "Data powiadomienia",
	schedule_create_embed_title_confirm:
		"Harmonogram #${scheduleCode} utworzony!",
	schedule_create_confirm_msg:
		"${author}, Twój harmonogram został utworzony!\nKod: `${scheduleCode}`",
	pfps_config_not_admin:
		":x: Nie masz uprawnienia Administratora, aby użyć tej komendy",
	pfps_config_command_action_on:
		"${author}, `włączono` moduł PFPS.\nJeśli kanał nie istnieje, skonfiguruj go komendą: **/pfps channel**.",
	pfps_config_command_action_off: "${author}, `wyłączono` moduł PFPS.",
	pfps_channel_not_admin:
		":x: Nie masz uprawnienia Administratora, aby użyć tej komendy",
	pfps_channel_embed_title: "Moduł PFPS ustawiony tutaj!",
	pfps_channel_embed_desc:
		"${author} ustawił tutaj moduł PFPS!\nOd teraz co 30 sekund iHorizon wysyła losowy awatar użytkownika z tego serwera!\nPostaram się, jak mogę!",
	pfps_channel_command_work:
		"${author}, pomyślnie ustawiono moduł PFPS na kanale ${channel}!",
	pfps_channel_command_error:
		"${author}, komenda zwróciła błąd. Sprawdź, czy podany kanał istnieje i czy moduł PFPS jest włączony!",
	authorization_actions_not_permited:
		"Tylko właściciel serwera może edytować regułę autoryzacji dotyczącą modułu ochrony!",
	authorization_actions_everyone: "Wszyscy",
	authorization_actions_allowlist: "Członkowie allowlisty",
	authorization_actions_nobody: "Nikt. (Poza właścicielem serwera)",
	protect_panel_title: "Panel kontrolny ochrony",
	protect_panel_desc:
		"Skonfiguruj każdą regułę ochrony: włącz ją lub wyłącz, wybierz, kto ją omija, i ustal karę dla odpowiedzialnego członka.",
	protect_panel_global_label: "Kara globalna",
	protect_panel_global_hint: "Stosowana do każdej reguły bez własnej kary",
	protect_panel_select_placeholder: "Wybierz regułę do skonfigurowania",
	protect_panel_mode_placeholder: "Wybierz, kto może ominąć tę regułę",
	protect_panel_sanction_placeholder: "Wybierz karę do zastosowania",
	protect_panel_bypass_label: "Omijanie",
	protect_panel_sanction_label: "Kara",
	protect_panel_rule_help:
		"Gdy ta reguła zostanie naruszona, akcja jest automatycznie cofana, a odpowiedzialny członek otrzymuje karę.",
	protect_panel_enable_button: "Włącz",
	protect_panel_disable_button: "Wyłącz",
	protect_panel_all_rules: "Wszystkie reguły",
	protect_panel_all_rules_desc: "Zmień wszystkie reguły naraz",
	protect_panel_all_status: "Włączone reguły: ${enabledCount}/${ruleCount}",
	protect_panel_all_help:
		"Omijanie i kara dotyczą wszystkich włączonych reguł naraz.",
	protect_panel_all_mixed: "Mieszane",
	protect_panel_enable_all_button: "Włącz wszystkie",
	protect_panel_disable_all_button: "Wyłącz wszystkie",
	protect_panel_all_mode_saved:
		"Reguły (**${ruleCount}**) omija teraz: **${mode}**.",
	protect_panel_all_sanction_saved:
		"Kara dla reguł (**${ruleCount}**) to teraz: **${sanction}**.",
	protect_panel_all_enabled: "Reguły (**${ruleCount}**) są teraz włączone!",
	protect_panel_all_disabled: "Reguły (**${ruleCount}**) są teraz wyłączone!",
	protect_panel_back_button: "Wstecz",
	protect_panel_refresh_button: "Odśwież",
	protect_panel_close_button: "Zamknij panel",
	protect_panel_rule_enabled: "Reguła **${rule}** jest teraz włączona!",
	protect_panel_rule_disabled: "Reguła **${rule}** jest teraz wyłączona!",
	protect_panel_mode_saved: "Regułę **${rule}** omija teraz: **${mode}**.",
	protect_panel_sanction_saved:
		"Kara dla reguły **${rule}** to teraz: **${sanction}**.",
	protect_panel_global_saved: "Kara globalna to teraz: **${sanction}**.",
	protect_panel_api_error:
		"Nie udało mi się zastosować tej zmiany. Upewnij się, że mam uprawnienie `Administrator`, i spróbuj ponownie.",
	protect_panel_sanction_global: "Domyślna globalna",
	protect_panel_sanction_cancel: "Tylko cofnięcie akcji",
	protect_panel_sanction_derank: "Cofnięcie + odebranie rang",
	protect_panel_sanction_ban: "Cofnięcie + ban",
	protect_panel_sanction_kick: "Cofnięcie + wyrzucenie",
	protect_panel_sanction_mute: "Cofnięcie + wyciszenie (10 min)",
	protect_panel_group_server: "Serwer i webhooki",
	protect_panel_group_channels: "Kanały",
	protect_panel_group_roles: "Role",
	protect_panel_group_members: "Członkowie",
	protect_panel_rule_webhook_name: "Webhooki",
	protect_panel_rule_updateguild_name: "Edycje serwera",
	protect_panel_rule_createchannel_name: "Tworzenie kanałów",
	protect_panel_rule_updatechannel_name: "Edycje kanałów",
	protect_panel_rule_deletechannel_name: "Usuwanie kanałów",
	protect_panel_rule_createrole_name: "Tworzenie ról",
	protect_panel_rule_deleterole_name: "Usuwanie ról",
	protect_panel_rule_updaterole_name: "Edycje ról",
	protect_panel_rule_updatemember_name: "Edycje ról członków",
	protect_panel_rule_banmembers_name: "Banowanie członków",
	protect_panel_rule_kickmember_name: "Wyrzucanie członków",
	protect_panel_rule_unbanmembers_name: "Odbanowywanie członków",
	protect_panel_rule_add_admin_roles_name: "Nadawanie ról administratora",
	allowlist_show_not_permited:
		"Nie możesz użyć tej komendy! Musisz być na allowliście!",
	allowlist_show_embed_author: "Allowlista",
	allowlist_add_not_permited:
		"Nie masz uprawnień do użycia tej komendy! Musisz być na allowliście!",
	allowlist_add_not_owner:
		"Tylko właściciel serwera może dodawać/usuwać użytkowników z allowlisty!",
	allowlist_add_already_in:
		"Członek, którego chcesz dodać do allowlisty, już na niej jest!",
	allowlist_add_command_work: "${member} został dodany do allowlisty!",
	allowlist_delete_not_permited:
		"Nie masz uprawnień do użycia tej komendy! Musisz być na allowliście!",
	allowlist_delete_not_owner:
		"Tylko właściciel serwera może dodawać/usuwać użytkowników z allowlisty!",
	allowlist_delete_member_unreachable:
		"Członek, którego chciałeś usunąć z allowlisty, jest nieosiągalny!",
	allowlist_delete_cant_remove_owner:
		"Nie można usunąć właściciela serwera z allowlisty!",
	allowlist_delete_isnt_in:
		"Członka, którego chcesz usunąć z allowlisty, na niej nie ma!",
	allowlist_delete_command_work: "${member} został usunięty z allowlisty!",
	tag_name: "Tag",
	tag_embed_created_at: "Utworzono",
	tag_embed_last_update: "Ostatnia aktualizacja",
	tag_embed_last_updated_by: "Ostatnio zaktualizował",
	tag_create_not_permited:
		"Nie możesz utworzyć tagu.\nPotrzebujesz uprawnienia Administratora albo musisz być na whiteliście (`/tag wlroles-create`).",
	tag_create_not_good_name:
		"Nazwa tagu nie może zawierać spacji ani kropek i nie może przekraczać 16 znaków.",
	tag_create_command_work: "Tag `${tag_name}` został utworzony.",
	tag_create_already_exist: "Ten tag już istnieje.",
	tag_create_embed_doesnt_exist: "Ten embed nie istnieje.",
	tag_no_one_found: "Na tym serwerze nie zapisano żadnych tagów!",
	tag_delete_dnt_exist: "Tag `${tag_name}` nie istnieje.",
	tag_delete_command_ok: "Tag `${tag_name}` został usunięty.",
	tag_doesnt_exist: "Tag `${tag_name}` nie istnieje!",
	tag_wlcreate_embed_title: "Whitelista tworzenia - Tagi",
	tag_wlcreate_embed_desc: "Wszystkie role, które mogą tworzyć tagi.",
	tag_wluse_embed_title: "Whitelista użycia - Tagi",
	tag_wluse_embed_desc: "Wszystkie role, które mogą używać tagów.",
	tag_list_no_anything: "Na tym serwerze nie zapisano żadnych tagów!",
	tag_use_not_allowed:
		"Nie możesz użyć tagu `${tag_name}`.\nPotrzebujesz uprawnienia Administratora albo możesz poprosić właściciela tagu <@${createBy}>, aby dodał Cię do whitelisty (`tag wlroles-use`).",
	tag_use_empty: "Tag `${tag_name}` jest pusty: nie ma tekstu ani embeda.",
	tag_use_command_work: "Tag `${tag_name}` został wysłany.",
	tag_edit_error_perm:
		"Aby zmodyfikować tag, musisz mieć uprawnienia Administratora lub być jego właścicielem.",
	tag_edit_command_ok:
		"Nazwa tagu została zmieniona z **`${current_tag_name}`** na **`${new_tag_name}`**",
	tempvoice_if_text_not_admin:
		"<@${authorId}>, nie masz uprawnień do użycia tej komendy!",
	tempvoice_if_text_desc_embed:
		"## Interfejs TempVoice\nTen **interfejs** służy do zarządzania tymczasowymi kanałami głosowymi.\n",
	tempvoice_if_text_fields_value_limit: "${emoji_VC_Limit} **Zmień limit**",
	tempvoice_if_text_fields_value_name: "${emoji_VC_Name} **Zmień nazwę**",
	tempvoice_if_text_fields_value_region:
		"${emoji_VC_Region} **Zmień region**",
	tempvoice_if_text_fields_value_trust: "${emoji_VC_Trust} **Zaufaj**",
	tempvoice_if_text_fields_value_untrust:
		"${emoji_VC_Untrust} **Cofnij zaufanie**",
	tempvoice_if_text_fields_value_block: "${emoji_VC_Block} **Zablokuj**",
	tempvoice_if_text_fields_value_unblock: "${emoji_VC_Unblock} **Odblokuj**",
	tempvoice_if_text_fields_value_claim: "${emoji_VC_Claim} **Przejmij**",
	tempvoice_if_text_fields_value_privacy:
		"${emoji_VC_Privacy} **Prywatność**",
	tempvoice_if_text_fields_value_transfer: "${emoji_VC_Transfer} **Przekaż**",
	tempvoice_if_text_fields_value_delete: "${emoji_VC_Delete} **Usuń**",
	tempvoice_vc_not_admin:
		"<@${authorId}>, nie masz uprawnień do użycia tej komendy!",
	tempvoice_staff_not_admin:
		"<@${authorId}>, nie masz uprawnień do użycia tej komendy!",
	tempvoice_staff_desc_embed:
		"## Rola staffu TempVoice\nWymienione tu role mogą teraz dołączać do kanału i go moderować!\n",
	confession_channel_command_work:
		"Panel wyznań został wysłany na ${channel}",
	confession_channel_panel_embed_desc:
		"# **Anonimowe wyznania**\n\nKliknij przycisk poniżej, aby otworzyć formularz wyznania. Możesz napisać to, co chcesz wyznać. Jeśli chcesz, możesz zrobić swoje wyznanie prywatnym.\nPamiętaj, że wyznania mogą nie pozostać anonimowe — właściciele serwera lub osoby mające dostęp do logów wyznań mogą zidentyfikować użytkowników, jeśli logowanie jest włączone.\n\n## **Złóż wyznanie**\n\n*Uwaga: aby Twoje wyznanie było prywatne, wpisz odpowiednią opcję w formularzu.*",
	confession_channel_log_embed_title: "SetChannel - moduł wyznań",
	confession_channel_log_embed_desc: "${author} ustawił kanał ${channel}",
	confession_coolodwn_command_work:
		"${author}, czas odnowienia wyznań wynosi teraz **${time}**!",
	confession_cooldown_log_embed_title: "SetCooldown - moduł wyznań",
	confession_cooldown_log_embed_desc:
		"${author} ustawił limit czasu na `${time}`",
	confession_disable_command_work_on: "Moduł wyznań jest teraz włączony.",
	confession_disable_command_work_off: "Moduł wyznań jest teraz wyłączony.",
	confession_log_embed_title_on_enable: "Włączenie/wyłączenie wyznań",
	confession_log_embed_desc_on_enable: "${author} włączył moduł wyznań!",
	confession_log_embed_desc_on_disabled: "${author} wyłączył moduł wyznań!",
	confession_sent_confirmation:
		"Twoje wyznanie **#${code}** zostało opublikowane.",
	confession_not_found: "Nie znaleziono wyznania o kodzie **#${code}**.",
	confession_delete_command_work: "Wyznanie **#${code}** zostało usunięte.",
	confession_delete_log_embed_title: "Usunięcie wyznania",
	confession_delete_log_embed_desc: "${author} usunął wyznanie **#${code}**",
	confession_ban_command_work:
		"Autor wyznania **#${code}** nie może już składać wyznań na tym serwerze.",
	confession_ban_already: "Autor wyznania **#${code}** jest już zbanowany.",
	confession_ban_author_expired:
		"To wyznanie jest zbyt stare: autor jest zapominany po 90 dniach.",
	confession_ban_log_embed_title: "Ban autora wyznania",
	confession_ban_log_embed_desc:
		"${author} zbanował autora wyznania **#${code}**",
	confession_banned_error: "Masz bana w module wyznań na tym serwerze.",
	confession_unban_command_work:
		"Ban powiązany z wyznaniem **#${code}** został zdjęty.",
	confession_unban_not_found:
		"Z wyznaniem **#${code}** nie jest powiązany żaden ban.",
	confession_unban_log_embed_title: "Odbanowanie autora wyznania",
	confession_unban_log_embed_desc:
		"${author} zdjął ban powiązany z wyznaniem **#${code}**",
	confession_thread_enabled:
		"Od teraz, gdy ktoś złoży wyznanie, tworzę wątek dyskusji pod embedem.",
	confession_thread_disabled: "Nie tworzę wątku dyskusji pod embedem.",
	antispam_manage_embed_title: "Konfiguracja modułu AntiSpam",
	antispam_manage_choices_1_label: "Włącz moduł",
	antispam_manage_choices_1_desc: "Włącz lub wyłącz moduł antyspamowy",
	antispam_manage_choices_2_label: "Ignoruj boty",
	antispam_manage_choices_2_desc: "Ignoruj spamowanie przez boty na serwerze",
	antispam_manage_choices_3_label: "Rodzaj kary",
	antispam_manage_choices_3_desc: "Jaką karę nałożę na użytkowników",
	antispam_manage_choices_4_label: "Czas kary",
	antispam_manage_choices_4_desc: "Jak długo trwa kara",
	antispam_manage_choices_5_label: "Mnożnik czasu kary",
	antispam_manage_choices_5_desc:
		"Czy czas kary jest mnożony przy każdej kolejnej karze",
	antispam_manage_choices_6_label: "Usuwaj wiadomości",
	antispam_manage_choices_6_desc: "Usuń wiadomość ze spamem",
	antispam_manage_choices_7_label: "Maks. odstęp wiadomości",
	antispam_manage_choices_7_desc:
		"Maksymalny odstęp między wiadomościami, by uznać je za spam",
	antispam_manage_choices_8_label: "Maks. duplikatów wiadomości",
	antispam_manage_choices_8_desc:
		"Maksymalna liczba zduplikowanych wiadomości przed karą",
	antispam_manage_choices_9_label: "Maks. odstęp duplikatów",
	antispam_manage_choices_9_desc:
		"Odstęp między zduplikowanymi wiadomościami, po którym użytkownik jest oznaczany",
	antispam_manage_choices_10_label: "Maks. podobnych wiadomości",
	antispam_manage_choices_10_desc:
		"Maksymalna liczba podobnych wiadomości przed karą",
	antispam_manage_choices_12_label: "Próg przed karą",
	antispam_manage_choices_12_desc: "Maksymalny próg przed nałożeniem kary",
	antispam_manage_select_menu_punish_mute_label: "Wyciszaj członków",
	antispam_manage_modal_title: "Okno AntiSpam",
	antispam_manage_button_label: "Zapisz konfigurację",
	antispam_manage_preset_level1_name: "Tryb luzu",
	antispam_manage_preset_level2_name: "Tryb straży",
	antispam_manage_preset_level3_name: "Tryb ekstremalnej ochrony",
	antispam_manage_button_preset_label: "Wczytaj preset",
	antispam_manage_selectstring_preset_label: "Konfiguracje presetów",
	antispan_bypassroles_embed_desc:
		"Wszystkie poniższe role mogą omijać moduł antyspamowy",
	antispam_ignorechannels_embed_desc:
		"Wiadomości wysłane na dowolnym z poniższych kanałów omijają moduł antyspamowy",
	header_h1_value: "Statystyki wiadomości użytkownika {author_username}",
	messages_word: "Wiadomości",
	voice_activity: "Aktywność głosowa",
	minutes_word: "Minuty",
	top_voice: "Top kanałów głosowych",
	top_message: "Top kanałów tekstowych",
	var_members: "członków",
	starboard_channel_command_ok:
		"${emoji_Yes} | **Kanał Starboard ustawiony na: ${channel}**. Od teraz, gdy członkowie serwera zareagują '⭐' na wiadomości i zostanie przekroczony próg **`${threshold}`**, wiadomość zostanie wysłana na ${channel}!",
	starboard_config_command_ok:
		"${emoji_Yes} | **Moduł Starboard jest teraz ${action}**",
	starboard_threshold_command_ok:
		"${emoji_Yes} | Od teraz, gdy członkowie serwera zareagują '⭐' na wiadomości i zostanie przekroczony próg **`${amount}`**, wiadomość zostanie wysłana na wskazany kanał!",
	starboard_create_thread_command_ok:
		"${emoji_Yes} | Od teraz, gdy członkowie serwera zareagują '⭐' na wiadomości i zostanie przekroczony próg **`${amount}`**, wiadomość zostanie wysłana na wskazany kanał **`${action}`**",
	starboard_create_thread_yes: "i zostanie utworzony wątek dyskusji",
	starboard_create_thread_no: "i wątek dyskusji nie zostanie utworzony",
	skullboard_channel_command_ok:
		"${emoji_Yes} | **Kanał Skullboard ustawiony na: ${channel}**. Od teraz, gdy członkowie serwera zareagują '💀' na wiadomości i zostanie przekroczony próg **`${threshold}`**, wiadomość zostanie wysłana na ${channel}!",
	skullboard_config_command_ok:
		"${emoji_Yes} | **Moduł Skullboard jest teraz ${action}**",
	skullboard_threshold_command_ok:
		"${emoji_Yes} | Od teraz, gdy członkowie serwera zareagują '💀' na wiadomości i zostanie przekroczony próg **`${amount}`**, wiadomość zostanie wysłana na wskazany kanał!",
	skullboard_create_thread_command_ok:
		"${emoji_Yes} | Od teraz, gdy członkowie serwera zareagują '💀' na wiadomości i zostanie przekroczony próg **`${amount}`**, wiadomość zostanie wysłana na wskazany kanał **`${action}`**",
	notifier_author_add_author_doesnt_exist: "Autor nie istnieje. Sprawdź ID.",
	notifier_config_channel_logsEmbed_title: "Moduł kanału Notifier",
	notifier_config_channel_logsEmbed_desc:
		"<@${authorId}> ustawił moduł Notifier na kanał ${channel}",
	notifier_config_message_command_ok:
		"Od teraz, gdy streamer lub YouTuber opublikuje film, wyślę wiadomość na ${channel}",
	notifier_config_message_helpEmbed_title: "Własna wiadomość powiadomienia",
	notifier_config_message_helpEmbed_desc:
		"{artistAuthor} => Nazwa użytkownika streamera/YouTubera\n{artistLink} => Link do streamera/YouTubera\n{mediaURL} => Adres URL filmu streamera/YouTubera",
	notifier_config_message_embed_fields_notifyMessage:
		"Wiadomość powiadomienia",
	notifier_config_message_awaiting_response:
		"Napisz wiadomość powiadomienia.",
	notifier_config_message_command_work_on_enable:
		"${emoji_GreenTick} | Pomyślnie ustawiono wiadomość powiadomienia.",
	blogger_generateBlogsEmbed_embed_desc:
		"Lista skonfigurowanych kanałów RSS:\n\n",
	blogger_generateBlogsEmbed_embed_title: "📰 Konfiguracja blogów RSS",
	blogger_generateConfigurationEmbed_embed_title: "📰 Konfiguracja Bloggera",
	blogger_no_rss: "Nie skonfigurowano żadnych kanałów RSS.",
	blogger_generateConfigurationEmbed_embed_fields_1_name: "Status",
	blogger_generateConfigurationEmbed_embed_fields_2_name: "Liczba blogów",
	blogger_unknown_blog: "Nieznany blog",
	blogger_on_new_article_default_message:
		"📰 Opublikowano nowy artykuł!\n**{articleTitle}** — {articleAuthor}\n{articleLink}",
	blogger_config_status_enabled:
		"✅ Moduł Blogger został **włączony**. Kanały RSS będą monitorowane.",
	blogger_config_status_disabled:
		"❌ Moduł Blogger został **wyłączony**. Kanały RSS nie będą monitorowane.",
	blogger_read_article: "Czytaj artykuł",
	blogger_blog_add_invalid_channel:
		"Nieprawidłowy typ kanału. Wybierz kanał tekstowy.",
	blogger_blog_add_success:
		"✅ Kanał RSS **${validationName}** został dodany! Powiadomienia będą wysyłane na ${channel} (ID: `${blogId}`)",
	blogger_blog_add_invalid_rss:
		"❌ Podany kanał RSS jest nieprawidłowy lub niedostępny. Sprawdź adres URL i spróbuj ponownie.",
	blogger_blog_remove_success:
		"✅ Kanał RSS o ID `${blogId}` został usunięty.",
	blogger_blog_remove_not_found: "❌ Nie znaleziono kanału RSS o tym ID.",
	lastfm_module_not_configured:
		"${emoji_No} | Moduł Last.fm nie jest skonfigurowany w bocie. Ustaw `LASTFM_API_KEY` i `LASTFM_SHARED_SECRET` w pliku `.env` bota.",
	lastfm_config_login_required:
		"${emoji_No} | Musisz użyć `/lastfm login`, zanim włączysz moduł.",
	lastfm_config_enabled:
		"${emoji_Yes} | Scrobblowanie Last.fm jest teraz włączone dla Twojego konta.",
	lastfm_config_disabled:
		"${emoji_Yes} | Scrobblowanie Last.fm jest teraz wyłączone dla Twojego konta.",
	lastfm_login_invalid_session:
		"${emoji_No} | Last.fm nie zwrócił prawidłowej sesji.",
	lastfm_login_success:
		"${emoji_Yes} | Twoje konto Last.fm `${username}` jest teraz połączone, a scrobblowanie zostało włączone.",
	lastfm_embed_title: "Konfiguracja Last.fm dla ${userLabel}",
	lastfm_embed_field_status: "Status",
	lastfm_embed_field_account: "Połączone konto",
	lastfm_embed_field_connected_at: "Połączono",
	lastfm_api_error_login:
		"${emoji_No} | Nie można połączyć się z Last.fm: ${error}",
	lastfm_api_error_nowplaying:
		"${emoji_No} | Nie można powiadomić Last.fm o aktualnie odtwarzanym utworze: ${error}",
	lastfm_api_error_scrobble:
		"${emoji_No} | Nie można zescrobblować tego utworu: ${error}",
	lastfm_api_error_unknown: "nieznany błąd",
	rc_key_doesnt_exist:
		"${emoji_No} Moduł AuthRestore z kluczem **${secretCode}** nie istnieje!",
	rc_verify: "Zweryfikuj",
	rc_role_embed_title: "Nowa modyfikacja AuthRestore",
	rc_role_embed_field1_name: "Nowa rola nadawana po weryfikacji",
	rc_command_ok:
		"${author}, właśnie skonfigurowałeś moduł „AuthRestore”. Od teraz, gdy członek serwera Discord kliknie przycisk i zaloguje się przez OAuth2, zostanie dodany do bazy danych. Będzie mógł potem automatycznie dołączyć do serwera przez OAuth2.\n# PRZECZYTAJ UWAŻNIE\nWiadomość ${msgLink} ma teraz przycisk, który posłuży do weryfikacji.\nOTO PRYWATNY KOD, KTÓREGO NIE WOLNO NIKOMU UJAWNIAĆ. OSOBA Z TYM KODEM MOGŁABY GO USUNĄĆ, DODAWAĆ CZŁONKÓW DO SWOJEGO SERWERA... PRZECHOWUJ GO W BEZPIECZNYM MIEJSCU. iHorizon NIGDY WIĘCEJ GO CI NIE PODA:\n```${secretCode}```",
	rc_command_ok_dm: "# Kod AuthRestore dla ${guildName}\n```${secretCode}```",
	rc_command_dm_failed:
		"Próbowałem wysłać Ci kod w wiadomości prywatnej, ale masz zablokowane DM-y :/",
	rc_command_dm_ok:
		"Na wypadek gdybyś przegapił, wysłałem Ci kod w wiadomości prywatnej!",
	rc_command_horizongw_down: "Błąd: HorizonGateway może nie działać",
	rc_delete_config_not_found:
		"Nie znaleziono konfiguracji modułu na tym serwerze!",
	rc_delete_command_ok:
		'${author}, właśnie usunąłeś przycisk "AuthRestore": członkowie nie mogą się już przez niego weryfikować. Twój klucz i już zweryfikowani członkowie zostają, więc nadal możesz ich przywrócić przez `/authrestore force-join`.',
	rc_get_mainEmbed_title: "Informacje ogólne AuthRestore",
	rc_get_mainEmbed_field1_name: "ID serwera",
	rc_get_mainEmbed_field2_name: "Rola nadawana po weryfikacji",
	rc_get_mainEmbed_field3_name: "Utworzono",
	rc_get_mainEmbed_field3_value: "*data jest w formacie MM/DD/YYYY HH:mm*",
	rc_get_mainEmbed_field4_name: "Liczba użyć klucza",
	rc_get_mainEmbed_field5_name: "Autor konfiguracji",
	rc_get_secondEmbed_title: "Zapisani użytkownicy",
	rc_get_secondEmbed_footer: "Strona ${from} / ${to}",
	rc_get_locale: "Język",
	rc_get_username: "Nazwa użytkownika",
	rc_get_unkwnon_user: "Nieznany użytkownik (${authorId})",
	rc_forceJoin_embed_title: "AuthRestore - Wymuszone dołączenie",
	rc_forceJoin_embed_desc:
		"## Czy na pewno chcesz wymusić dołączenie członków do tego serwera?\n### PRZECZYTAJ UWAŻNIE:\nJEŚLI POTWIERDZISZ TĘ AKCJĘ, OBECNY KLUCZ PRYWATNY ZOSTANIE ZNISZCZONY. OTRZYMASZ NOWY KLUCZ.\n\n\n",
	rc_forceJoin_embed_field1: "Znalezieni członkowie",
	rc_forceJoin_embed_field2: "Członkowie już obecni",
	rc_forceJoin_embed_field3: "Możliwe dołączenia",
	rc_forceJoin_embed_2_field1: "Możliwe dołączenia",
	rc_forceJoin_embed_2_field2: "Dołączyli",
	rc_forceJoin_ws_size:
		"# Przygotowuję dodanie **${value2}** członków do serwera.",
	rc_forceJoin_ws_start: "# Wymuszone dołączanie w toku...",
	rc_forceJoin_ws_end: "# Proces wymuszonego dołączania zakończony.",
	rc_forceJoin_ws_end_renew_msg:
		"# PRZECZYTAJ UWAŻNIE\nOTO PRYWATNY KOD, KTÓREGO NIE WOLNO NIKOMU UJAWNIAĆ. OSOBA Z TYM KODEM MOGŁABY GO USUNĄĆ, DODAWAĆ CZŁONKÓW DO SWOJEGO SERWERA... PRZECHOWUJ GO W BEZPIECZNYM MIEJSCU. iHorizon NIGDY WIĘCEJ GO CI NIE PODA:\n```${value2}```",
	media_gen_cooldown:
		"Między generowaniem mediów musisz odczekać `1 minutę i 30 sekund`!",
	media_gen_error_args: "Podaj dwa prawidłowe adresy URL obrazów.",
	batch_ban_process:
		"🔄 Banowanie ${memberUsername} na ${guildCount} serwerach w toku...",
	batch_unban_process:
		"🔄 Odbanowywanie ${bannedMemberCount} członków w toku...",
	batch_unblacklist_process:
		"🔄 Zdejmowanie ${bannedMemberUsername} z blacklisty na ${guildObjectCount} serwerach w toku...",
	unbanall_undo_command_err:
		"Brak członków do ponownego zbanowania. Najpierw użyj komendy odbanowania wszystkich.",
	confession_module_modal_title: "Wyślij wyznanie",
	confession_module_modal_components1_label: "Co chcesz wyznać?",
	confession_module_modal_components1_placeholder: "Mmhh",
	confession_module_modal_components2_label: "Czy jest prywatne?",
	even_mp_playerStart_tip:
		"> ${emoji_LastFM_Logo} Wiesz, że możesz scrobblować swoją muzykę komendą `/lastfm` w iHorizon? ${emoji_Sunglass}",
	event_mp_audioTrackAdd:
		"${emoji_Player_Queue_Add} - ${trackTitle} został dodany do kolejki!",
	event_mp_playerError: "Mam problem z połączeniem => ${errorMessage}",
	event_mp_error: "Wystąpił problem z kolejką utworów => ${errorMessage}",
	event_mp_emptyChannel:
		"${emoji_No} | Nikt nie jest na kanale głosowym, opuszczam go...",
	event_mp_playerSkip: "${emoji_Music_Icon} - Pomijam **${trackTitle}**!",
	event_mp_emptyQueue:
		"${emoji_Warning_Icon} - Muzyka zatrzymana, bo w kolejce nie ma już utworów!",
	event_channel_create_message_embed_title: "Pomyślnie skonfigurowano!",
	event_channel_create_message_embed_description:
		"Bot został idealnie skonfigurowany. Nie musisz już nic robić (zen).\n\nWszystkie logi moderacji związane z iHorizon będą wyświetlane tutaj",
	event_welcomer_inviter:
		"{memberMention} (konto utworzone {accountCreationTimestamp}) dołączył do serwera. Zaprosił go **{inviterUsername}** (zaproszeń: **{invitesCount}**), jest nas teraz {memberCount} na {guildName}",
	event_welcomer_default:
		"{memberMention} (konto utworzone {accountCreationTimestamp}) dołączył do serwera. Jest nas teraz {memberCount} na {guildName}",
	event_goodbye_inviter:
		"`{memberUsername}` (konto utworzone {accountCreationTimestamp}) opuścił serwer. Zaprosił go **{inviterUsername}** (zaproszeń: **{invitesCount}**), jest nas teraz {memberCount} na {guildName}",
	event_goodbye_default:
		"`{memberUsername}` (konto utworzone {accountCreationTimestamp}) opuścił serwer. Jest nas teraz {memberCount} na {guildName}",
	event_xp_level_earn:
		"**GG**, {memberMention}, awansujesz na wyższy poziom! (Poziom: **{xpLevel}**)",
	event_xp_level_additional_info:
		"\n-# ${emoji_VC_OpenChat} Ta wiadomość Cię irytuje? Możesz ją wyłączyć, wyłączając system poziomów komendą `/ranks config`.",
	event_ticket_embed_description:
		"Cześć ${userUsername}, witaj w swoim zgłoszeniu! Uzbrój się w cierpliwość, zaraz się Tobą zajmiemy. Jeśli chcesz zamknąć to zgłoszenie, użyj komendy `/ticket close`",
	event_ticket_add_member:
		"${author}, **dodano** ${addedMembers} do ticketu ${channel}!",
	event_ticket_del_member:
		"${author}, **usunięto** ${removedMembers} z ticketu ${channel}!",
	event_ticket_button_name: "Utwórz ticket",
	event_ticket_category_awaiting_response:
		"Która kategoria [${emoji}] >> ${name}",
	event_ticket_reason_awaiting_response:
		"${author}, czy użytkownicy powinni podawać powód przed utworzeniem ticketu?",
	event_ticket_create_reason_modal_title: "Jaki jest powód Twojego ticketu?",
	event_ticket_create_reason_modal_fields_1_label: "Powód ticketu",
	event_ticket_reason_embed_desc: "# Powód ticketu\n```${reason}```",
	iC_event_cooldown: "Odczekaj chwilę między komendami!",
	iC_event_connection_error: "Błąd połączenia!",
	Msg_cooldown: "Czy możesz odczekać sekundę przed wykonaniem komendy?",
	ticket_module_button_delete: "Usuń ticket",
	ticket_module_button_transcript: "Transkrypt ticketu",
	ticket_module_button_addmember: "Dodaj członka",
	ticket_module_button_removemember: "Usuń członka",
	ticket_module_add_question:
		"Kogo chcesz dodać do swojego ticketu? (Podaj jego ID użytkownika)!",
	ticket_module_remove_question:
		"Kogo chcesz usunąć ze swojego ticketu? (Podaj jego ID użytkownika)!",
	ticket_transcript_failed_to_send:
		"Próbowałem wysłać Ci plik w wiadomości prywatnej, ale masz zablokowane DM-y :/",
	event_srvLogs_banAdd_description:
		"<@${executorId}> **zbanował** <@${targetId}>",
	event_srvLogs_banAdd_fields_name: "Powód",
	event_srvLogs_banAdd_fields_value: "```{reason}```",
	event_srvLogs_banRemove_description:
		"<@${executorId}> **cofnął bana** dla ${targetUsername}",
	event_srvLogs_guildMemberRemove_description:
		"<@${executorId}> **wyrzucił** <@${targetId}>",
	event_srvLogs_guildMemberUpdate_description:
		"📤 <@${executorId}> usunął rolę ${removedRoles} użytkownikowi ${oldMemberUserUsername}",
	event_srvLogs_guildMemberUpdate_2_description:
		"📥 <@${executorId}> dodał rolę ${addedRoles} użytkownikowi ${oldMemberUserUsername}",
	event_srvLogs_messageDelete_description:
		"**Wiadomość usunięta na <#${messageChannelId}>**\n${messageContent}",
	event_srvLogs_messageUpdate_description:
		"**Wiadomość edytowana** [na](xxx) **<#${oldMessageChannelId}>**",
	event_srvLogs_messageUpdate_footer_1: "Przed",
	event_srvLogs_messageUpdate_footer_2: "Po",
	event_srvLogs_voiceStateUpdate_description:
		"📤 <@${targetUserId}> opuścił kanał <#${OchannelID}>",
	event_srvLogs_voiceStateUpdate_2_description:
		"📥 <@${targetUserId}> dołączył do kanału <#${channelID}>",
	event_srvLogs_voiceStateUpdate_3_description:
		"<@${targetUserId}> wyłączył sobie dźwięk na kanale <#${channelID}>",
	event_srvLogs_voiceStateUpdate_4_description:
		"<@${targetUserId}> włączył sobie dźwięk na kanale <#${channelID}>",
	event_srvLogs_voiceStateUpdate_5_description:
		"<@${targetUserId}> wyciszył się na kanale <#${channelID}>",
	event_srvLogs_voiceStateUpdate_6_description:
		"<@${targetUserId}> wyłączył wyciszenie na kanale <#${channelID}>",
	event_srvLogs_channelUpdate_disabled_for:
		"-    ❌ ${perm} wyłączone dla ${target}\n",
	event_srvLogs_channelUpdate_enabled_for:
		"-    ✅ ${perm} włączone dla ${target}\n",
	event_srvLogs_channelUpdate_allowed_for:
		"-    ✅ ${perm} dozwolone dla ${target}\n",
	event_srvLogs_channelUpdate_unallowed_for:
		"-    ❌ ${perm} niedozwolone dla ${target}\n",
	event_srvLogs_channelUpdate_field_name: "🎫 Nazwa: ${newChannelName}\n",
	event_srvLogs_channelUpdate_perm_added:
		"🛡 Dodano uprawnienia dla ${target}:\n",
	event_srvLogs_channelUpdate_embed_desc: "Zaktualizowano ${newChannel}",
	event_rank_role: "<@${messageAuthorId}>, masz teraz rolę <@&${id}>",
	event_suggestion_too_short:
		"<@${authorId}>, sugestia musi zawierać co najmniej 5 słów. Twoja wiadomość zostanie usunięta za 10 sekund, skopiuj ją, jeśli chcesz napisać ją od nowa.",
	event_suggestion_embed_author: "Nowa sugestia od ${messageAuthorUsername}",
	event_security_title: "Witaj na ${guild}!",
	event_security: "${member}, wpisz captchę widoczną w tej wiadomości.",
	event_security_expiry:
		"{emoji} Automatyczne wyrzucenie ${timestamp} (pozostało prób: **${attempts}**).",
	event_security_footer:
		"To zajmie tylko kilka sekund i pomaga chronić naszą społeczność.",
	event_security_kick_reason: "Proces zabezpieczający nie powiódł się",
	event_ticket_whenCreated_msg:
		"${author}, Twój ticket został utworzony, wejdź na <#${channelId}>!",
	event_ticket_logsChannel_onCreation_embed_title:
		"TicketLog - Utworzenie panelu",
	event_ticket_logsChannel_onCreation_embed_desc:
		"Panel ticketów o nazwie `${name}` na ${interaction} został utworzony!",
	event_ticket_logsChannel_onCreationChannel_embed_title:
		"TicketLog - Utworzenie ticketu",
	event_ticket_logsChannel_onCreationChannel_embed_desc:
		"Utworzono ticket: ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onClose_embed_title:
		"TicketLog - Zamknięcie ticketu",
	event_ticket_logsChannel_onClose_embed_desc:
		"Ticket został zamknięty przez ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onRemoveMember_embed_title:
		"TicketLog - Usunięcie członka z ticketu",
	event_ticket_logsChannel_onRemoveMember_embed_desc:
		"${member} został usunięty z ticketu przez ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onAddMember_embed_title:
		"TicketLog - Dodanie członka do ticketu",
	event_ticket_logsChannel_onAddMember_embed_desc:
		"${member} został dodany do ticketu przez ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onReopen_embed_title:
		"TicketLog - Ponowne otwarcie ticketu",
	event_ticket_logsChannel_onReopen_embed_desc:
		"${author} ponownie otworzył ticket (<#${channelId}>)!",
	event_ticket_logsChannel_onDelete_embed_title:
		"TicketLog - Usunięcie ticketu",
	event_ticket_logsChannel_onDelete_embed_desc:
		"${author} usunął ticket (#${channelName})!",
	event_ticket_logsChannel_onLeave_embed_desc:
		"${author} opuścił serwer: jego ticket (#${channelName}) został zamknięty i usunięty, transkrypt znajduje się w załączniku.",
	event_ticket_logsChannel_onAddMember2_embed_title:
		"TicketLog - Dodanie/usunięcie członków ticketu",
	event_ticket_logsChannel_onAddMember2_embed_desc:
		"${author}\nUsunięto: ${removedMembers}.\nDodano: ${addedMembers}.\n w tickecie (${channel})!",
	event_ticket_already_opened:
		"Ups, masz już otwarty ticket (<#${channelId}>)! Zamknij go, zanim otworzysz nowy.",
	event_gw_reroll_win_msg: "Gratulacje ${winners}! Wygrywasz **${prize}**!",
	event_gw_reroll_cannot_win_msg:
		"Brak prawidłowych uczestników, więc nie można wyłonić zwycięzcy!",
	event_gw_finnish_msg: "Gratulacje ${winners}! Wygrywasz **${prize}**!",
	event_gw_finnish_cannot_msg:
		"Brak prawidłowych uczestników, więc nie można wyłonić zwycięzcy!",
	event_gw_finnish_button_title: "Giveaway zakończony",
	event_gw_entries_button_title: "Lista uczestników",
	event_gw_removeentries_msg: "${author}, opuszczasz ten giveaway!",
	event_gw_leave_button_placeholder: "Opuść giveaway",
	event_gw_confirm_leave_msg:
		"${author}, czy na pewno chcesz opuścić ten giveaway?",
	event_gw_embed_desc:
		"Koniec: ${end_string} (${end_string2})\nOrganizator: <@${hostedBy}>\nZgłoszenia: **${entries}**\nZwycięzcy: **${winners_amount}**",
	event_gw_ended_embed_desc:
		"Zakończono: ${time1} (${time2})\nOrganizator: <@${hostedBy}>\nZgłoszenia: **${entrieCount}**\nZwycięzcy: ${winners}",
	event_gw_entries_words: "Zgłoszenia",
	event_gw_ended_word:
		"Zakończono: ${ended} (${time2})\nOrganizator: <@${hostedBy}>\nZgłoszenia: **${entries}**\nZwycięzcy: ${winners}",
	event_gw_break_req:
		"${emoji_No} Nie spełniasz wymagań, aby wziąć udział w tym giveaway.\nTyp: `${requirementType}`\nWartość: `${requirementValue}`",
	event_boostlog_add:
		"<@${newMemberUserId}> **właśnie zboostował** serwer! (łącznie boostów: **${boostCount}**)",
	event_boostlog_sub:
		"<@${newMemberUserId}> **właśnie zdjął swój boost** z serwera! (łącznie boostów: **${boostCount}**)",
	economy_disable_msg:
		"<@${authorId}>, `moduł ekonomii` na tym serwerze jest **wyłączony**. Nie możesz już z niego korzystać!",
	event_permission_wrong:
		"${author}, nie możesz użyć tej komendy! Potrzebujesz uprawnienia: ${neededPerm}",
	temporary_voice_title_embec:
		"## Zmiany w Twoim tymczasowym kanale głosowym",
	temporary_voice_unblocked_member: "Odblokowani członkowie",
	temporary_voice_blocked_mmeber: "Zablokowani członkowie",
	temporary_voice_no_one: "Nikt",
	temporary_voice_new_member: "Nowy właściciel",
	temporary_voice_old_member: "Poprzedni właściciel",
	temporary_voice_modal_title: "VoiceDashboard iHorizon",
	temporary_voice_new_userlimit: "Nowy limit użytkowników",
	temporary_voice_new_name: "Nowa nazwa",
	temporary_voice_new_region: "Nowy region",
	temporary_voice_untrusted_member: "Członkowie bez zaufania",
	temporary_voice_trusted_member: "Zaufani członkowie",
	temporary_voice_block_button_menu_placeholder:
		"Wybranym użytkownikom zostanie cofnięte zaufanie do dołączania",
	temporary_voice_delete_button_desc_embed:
		"## Usunięcie kanału\nKanał został pomyślnie usunięty!",
	temporary_voice_limit_button_menu_label:
		"Jaki jest limit użytkowników kanału?",
	temporary_voice_limit_button_not_integer:
		"${emoji_No} | Wprowadzona wartość nie jest liczbą",
	temporary_voice_name_button_menu_label: "Jaka jest nazwa kanału?",
	temporary_voice_privacy_menu_placeholder: "Wybierz opcję prywatności",
	temporary_voice_privacy_menu_lock_label: "Zablokuj kanał",
	temporary_voice_privacy_menu_lock_desc:
		"Do Twojego kanału głosowego będą mogli dołączyć tylko zaufani użytkownicy",
	temporary_voice_privacy_menu_unlock_label: "Odblokuj kanał",
	temporary_voice_privacy_menu_unlock_desc:
		"Każdy będzie mógł dołączyć do Twojego kanału głosowego",
	temporary_voice_privacy_menu_invisible_label: "Niewidoczny",
	temporary_voice_privacy_menu_invisible_desc:
		"Tylko zaufani użytkownicy będą widzieć Twój kanał głosowy",
	temporary_voice_privacy_menu_visible_label: "Widoczny",
	temporary_voice_privacy_menu_visible_desc:
		"Każdy będzie widział Twój kanał głosowy",
	temporary_voice_privacy_menu_closechat_label: "Zamknij czat",
	temporary_voice_privacy_menu_closechat_desc:
		"Tylko zaufani użytkownicy będą mogli pisać na czacie Twojego kanału",
	temporary_voice_privacy_menu_openchat_label: "Otwórz czat",
	temporary_voice_privacy_menu_openchat_desc:
		"Każdy będzie mógł pisać na czacie Twojego kanału",
	temporary_voice_region_menu_placeholder: "Wybierz region",
	temporary_voice_transfer_menu_placeholder:
		"Wybierz użytkownika, któremu przekażesz kanał głosowy",
	temporary_voice_transfer_trust_placeholder:
		"Wybrani użytkownicy zyskają zaufanie do dołączania",
	temporary_voice_transfer_unblocked_placeholder:
		"Wybrani użytkownicy zostaną odblokowani",
	temporary_voice_transfer_untrust_placeholder:
		"Wybranym użytkownikom zostanie cofnięte zaufanie do dołączania",
	temporary_voice_channel_name: "Kanał {nickname}",
	tempvoice_v2_embed_title: "## ${emoji_VC_Name} ${channelName}",
	tempvoice_v2_embed_desc:
		"Witaj na swoim tymczasowym kanale głosowym, ${owner}!\nZarządzaj nim za pomocą przycisków poniżej.",
	tempvoice_v2_hint: "-# Tylko właściciel kanału może używać tego menu.",
	tempvoice_v2_select_placeholder: "Zarządzaj swoim kanałem głosowym...",
	tempvoice_cfg_panel_title: "Konfiguracja TempVoice",
	tempvoice_cfg_panel_desc:
		"Skonfiguruj moduł TempVoice poniżej. Każda zmiana działa natychmiast, a każdy utworzony kanał głosowy dostaje własny panel sterowania.",
	tempvoice_cfg_hub: "Kanał „dołącz, aby utworzyć”",
	tempvoice_cfg_category: "Kanały tworzone w",
	tempvoice_cfg_name: "Nazwa kanału",
	tempvoice_cfg_position: "Pozycja w kategorii",
	tempvoice_cfg_position_top: "Góra",
	tempvoice_cfg_position_bottom: "Dół",
	tempvoice_cfg_staff: "Role staffu (omijają uprawnienia)",
	tempvoice_cfg_select_placeholder: "Więcej ustawień...",
	tempvoice_cfg_opt_name: "Zmień nazwę kanału",
	tempvoice_cfg_opt_position_top: "Ustaw pozycję: Góra",
	tempvoice_cfg_opt_position_bottom: "Ustaw pozycję: Dół",
	tempvoice_cfg_done: "Gotowe",
	tempvoice_cfg_remove_hub: "Usuń kanał „dołącz, aby utworzyć”",
	tempvoice_cfg_saved: "Ustawienia TempVoice zapisane!",
	tempvoice_cfg_expired:
		"Panel konfiguracji wygasł. Uruchom /tempvoice ponownie.",
	tempvoice_cfg_modal_title: "Ustaw nazwę kanału",
	tempvoice_cfg_modal_label: "Nazwa | Zmienna: {Username}",
	protection_avoid_channel_delete:
		"**TRYB OCHRONY WŁĄCZONY**\n<@${channelGuildOwnerId}>, kanał został odtworzony, <@${executorId}> próbował go usunąć!",
	protection_blockbot_embed_title:
		"⚠️ Niebezpieczeństwo na ${memberGuildName} ⚠️",
	protection_blockbot_embed_desc:
		"# Ostrzeżenie o dodaniu bota\nKtoś próbował dodać bota Discord.",
	var_target_bot: "Docelowy bot",
	var_not_detected: "Nie wykryto",
	antispam_base_warn_message:
		"Uwaga ${mentionedMembers}, spamujesz i możesz zostać ukarany.",
	antispam_more_ban_msg:
		"Jeśli będziesz kontynuować, zostaniesz zbanowany na serwerze.",
	antispam_more_mute_msg: "Jeśli będziesz kontynuować, zostaniesz wyciszony.",
	antispam_more_kick_msg:
		"Jeśli będziesz kontynuować, zostaniesz wyrzucony z serwera.",
	antispam_log_embed_title: "[AntiSpam] Nowa akcja: ${actionType}",
	antispam_log_embed_desc:
		"${bot} wykonał akcję **${actionType}** wobec ${user}",
	hybridcommands_global_prefix_mention: "`@Ping-Me`",
	hybridcommands_global_prefix_cleaned_mention: "@Ping-Me ",
	hybridcommands_args_error_embed_desc:
		'```ts\nCommand Name: ${currentCommandName}\n```\n```cs\n${botPrefix}${fullNameCommand} ${argsString}\n${errorPosition}\nBłąd podczas wysyłania argumentu "${wrongArgumentName}".\n```',
	hybridcommands_embed_help_title: "Pomoc: ${commandName}",
	hybridcommands_embed_help_fields_value:
		"**Aliasy:** ${aliases}\n**Użycie:** ${use}",
	hybridcommands_embed_footer_text:
		"Opcje w [...] są wymagane, a te w <...> są opcjonalne.\nUżyj komendy: ${botPrefix}help [komenda], aby uzyskać więcej informacji.",
	ping_bot_show_info_msg:
		"Hej ${messageAuthor}, działam w 100% jako `Slash Command` (${emoji_Slash_Bot_Badge}) i w ponad 85% jako komendy z prefiksem. Mój prefiks na **tym serwerze** to `${prefix}`!\n",
	ping_bot_show_info_msg_about_change_prefix:
		"\n-# ${emoji_VC_OpenChat} Nie podoba Ci się mój prefiks? Użyj **`/guildconfig bot prefix`**, aby go zmienić!",
	notifier_on_new_media_default_message:
		"@everyone **[{artistAuthor}](<{artistLink}>)** opublikował nowy film [Kliknij tutaj]({mediaURL})",
	notifier_on_new_media_default_button_label: "Sprawdź!",
	notifier_generateAuthorsEmbed_embed_desc:
		"Oto lista wszystkich streamerów/YouTuberów:\n",
	notifier_generateAuthorsEmbed_embed_title:
		"Wszyscy streamerzy/YouTuberzy na serwerze",
	notifier_generateConfigurationEmbed_embed_title:
		"Konfiguracja modułu Notifier",
	notifier_generateConfigurationEmbed_embed_fields_1_name:
		"Kanał powiadomień",
	notifier_generateConfigurationEmbed_embed_fields_2_name:
		"Wiadomość powiadomienia",
	buttonreaction_role_doesnt_exit:
		"Rola zapisana w mojej bazie danych już nie istnieje na serwerze!",
	buttonreaction_role_too_high:
		"Rola jest zbyt wysoko, nie mogę jej nadać/odebrać. Musisz zmienić moje uprawnienia!",
	buttonreaction_role_add: "Masz teraz rolę ${role} :tada:",
	buttonreaction_role_remove: "Nie masz już roli ${role} ✅",
	rolepanel_setup_embed_title: "Konfiguracja panelu ról",
	rolepanel_setup_embed_desc:
		"Wybierz role do dodania lub usunięcia dla ${member}. Jeśli ${member} ma już wybraną rolę, zostanie ona usunięta. Role bez uprawnień zostaną zignorowane.",
	rolepanel_setup_embed_roles_field: "Dozwolone role",
	rolepanel_setup_embed_refused_field: "Odrzucone role",
	rolepanel_setup_select_placeholder: "Wybierz role do zaoferowania",
	rolepanel_setup_apply_button: "Utwórz panel",
	rolepanel_setup_no_roles: "Nie wybrano żadnej prawidłowej roli.",
	rolepanel_setup_saved: "Panel ról został wysłany.",
	rolepanel_panel_embed_title: "Panel ról",
	rolepanel_panel_embed_desc:
		"Wybierz role, które chcesz dodać do swojego profilu lub z niego usunąć.",
	rolepanel_panel_select_placeholder: "Wybierz swoje role",
	rolepanel_role_managed_or_everyone: "Rola systemowa lub @everyone",
	rolepanel_role_too_high_bot: "Rola wyżej niż bot",
	rolepanel_role_too_high_user: "Rola wyżej niż Ty",
	rolepanel_role_missing_permissions: "Brakujące uprawnienia: ${permissions}",
	rolepanel_logs_embed_title_create: "Logi panelu ról",
	rolepanel_logs_embed_desc_create:
		"<@${authorId}> utworzył panel ról (${messageId}) z: ${roles}",
	rolepanel_logs_embed_title_apply: "Logi użycia panelu ról",
	rolepanel_logs_embed_desc_apply:
		"<@${authorId}> zmienił role użytkownika <@${memberId}> przez panel. Dodano: ${addedRoles} | Usunięto: ${removedRoles}",
	rc_created_by: "Utworzył:",
	rc_created_on: "Utworzono:",
	rc_total_membres: "Łączna liczba członków",
	rc_total_verification: "Łączna liczba weryfikacji",
	rc_total_key_used_count: "Liczba użyć klucza",
	rc_recent_locales_distribution: "Rozkład języków członków",
	rc_recent_verifications: "Ostatnie weryfikacje",
	rc_registration_over_time: "Rejestracje w czasie",
	piconly_module_punish_msg:
		"${messageAuthor}, otrzymujesz wyciszenie na 10 minut za wysyłanie zbyt wielu wiadomości bez obrazków na kanale tylko dla obrazków.",
	piconly_module_warn_msg:
		"${messageAuthor}, ten kanał przyjmuje tylko wiadomości zawierające obrazki (akceptowane formaty: JPG, PNG, GIF, WEBP, BMP, TIFF). Ostrzeżenie ${userWarningCount}/${threshold}",
	piconly_module_timeout_reason:
		"Spamowanie wiadomościami bez obrazków na kanale tylko dla obrazków",
	event_nick_kicker_kick_reason:
		"Słowo z czarnej listy w nazwie użytkownika - Nick Kicker",
	event_nick_kicker_kick_msg:
		"Na serwerze `${memberGuildName}` Twoja nazwa użytkownika zawiera słowo z czarnej listy. Zostałeś wyrzucony z serwera.",
	pfps_embed_user_title: "**Awatar użytkownika** ${username}",
	pfps_embed_guild_title: "**Awatar serwerowy** ${username}",
	pfps_download_user_button: "Pobierz awatar użytkownika",
	pfps_download_guild_button: "Pobierz awatar serwerowy",
	addrolereact_role_not_found: "Nie znaleziono roli.",
	addrolereact_cannot_check_permissions:
		"Nie można sprawdzić Twoich uprawnień.",
	addrolereact_role_too_high:
		"Nie możesz dodać roli wyższej niż Twoja najwyższa rola ani jej równej.",
	addrolereact_must_be_text_channel:
		"Ta komenda musi zostać wykonana na kanale tekstowym.",
	addrolereact_message_not_found: "Nie znaleziono wiadomości.",
	addrolereact_no_reactions: "Ta wiadomość nie ma reakcji.",
	addrolereact_adding_role: "Dodawanie roli {role} w toku...",
	addrolereact_adding_role_progress:
		"Dodawanie roli {role} w toku dla {count} użytkowników...",
	addrolereact_role_added:
		"Rola {role} dodana. Otrzymało ją {count} użytkowników.",
	addrolereact_error: "Błąd podczas wykonywania komendy.",
	channel_hide_in_progress: "Ukrywanie bieżącego kanału...",
	channel_hide_success: "Kanał został ukryty przed @everyone",
	channel_hide_already_hidden: "Ten kanał jest już ukryty przed @everyone",
	channel_unhide_in_progress: "Odkrywanie bieżącego kanału...",
	channel_unhide_success: "Kanał jest teraz widoczny dla @everyone",
	channel_unhide_already_visible: "Ten kanał jest już widoczny dla @everyone",
	channel_hideall_in_progress: "Ukrywanie wszystkich kanałów w toku...",
	channel_hideall_success:
		"**Ukrywanie zakończone!**\n**Statystyki:**\n• Ukryte kanały: **{hiddenCount}**\n• Napotkane błędy: **{errorCount}**",
	channel_hideall_error: "Wystąpił błąd podczas ukrywania kanałów.",
	channel_unhideall_in_progress: "Odkrywanie wszystkich kanałów w toku...",
	channel_unhideall_success:
		"**Odkrywanie zakończone!**\n**Statystyki:**\n• Odkryte kanały: **{unhiddenCount}**\n• Napotkane błędy: **{errorCount}**",
	channel_unhideall_error: "Wystąpił błąd podczas odkrywania kanałów.",
	new_guild_embed_title: [
		"Witamy na naszym serwerze! 🎉",
		"Pozdrowienia, drodzy Discordowicze! 👋",
		"iHorizon dołączył do czatu! 💬",
		"To ptak? To samolot? Nie, to iHorizon! 🦸‍♂",
		"Powitajmy ciepło iHorizon! 🔥"
	],
	guild_create_btn_website: "Strona iHorizon",
	guild_create_btn_repos: "Repozytoria iHorizon",
	guild_create_btn_support: "Serwer wsparcia",
	guild_create_btn_docs: "Dokumentacja iHorizon",
	welcome_server_intro:
		"Dzięki, że mnie zaprosiłeś! Jestem **iHorizon**: moderacja, tickety, muzyka, ochrona, logi i wiele więcej w jednym bocie, który jest **darmowy** i **open source**.",
	welcome_lang_title: "Język",
	welcome_lang_text:
		"Mówię tu w języku: {language}, wybranym na podstawie regionu Twojego serwera.\nAby go zmienić, administrator może użyć {command}: panel pozwala wybrać jeden z {count} języków.",
	welcome_start_title: "Na start",
	welcome_start_help:
		"{command} wyświetla wszystkie komendy, posortowane według kategorii",
	welcome_start_dashboard:
		"[Dashboard]({url}) pozwala skonfigurować wszystko z przeglądarki",
	welcome_start_support:
		"Pytanie albo błąd? Nasz [serwer wsparcia]({url}) jest do Twojej dyspozycji",
	welcome_footer: "Darmowy i open source od 2020 · ihorizon.org",
	welcome_dm_title: "Dziękujemy za dodanie iHorizon!",
	welcome_dm_intro:
		"iHorizon właśnie dołączył do {guild}. Oto wszystko, czego potrzebujesz na start.",
	welcome_dm_outro:
		"> *Darmowy bot może więcej niż płatne boty.*\nTak właśnie jest z iHorizon: to społeczność i projekt utrzymywany przy życiu przez pasjonatów od 2020 roku. Witamy na pokładzie!",
	welcome_btn_dashboard: "Dashboard",
	bot_server_bio:
		"{wink_emoji} **Bot Discord iHorizon** **`+{count} komend`**\n> *« Tworzony przez ludzi od 2022 roku, dla Twojej społeczności. »*\n**https://www.ihorizon.org**",
	guild_leave_data_clear_notice_title: "iHorizon opuścił ${guildName}",
	guild_leave_data_clear_notice_description:
		"Ojej, to smutne. Wyrzuciłeś bota z `${guildName}`. Dane serwera zostaną wyczyszczone ${deleteAt}, jeśli iHorizon nie wróci wcześniej.",
	guild_leave_data_clear_notice_message:
		"Ojej, to smutne. Wyrzuciłeś iHorizon z `${guildName}`. Dane zostaną wyczyszczone ${deleteAt}.",
	guild_leave_data_clear_cancelled_title: "iHorizon wrócił na ${guildName}",
	guild_leave_data_clear_cancelled_description:
		"Hurra, dzięki za ponowne dodanie iHorizon do `${guildName}`. Zaplanowane usunięcie danych zostało anulowane.",
	guild_leave_data_clear_cancelled_message:
		"Hurra, dzięki za ponowne dodanie iHorizon do `${guildName}`. Dane Twojego serwera są bezpieczne.",
	confession_embed_logs_title: "Nowe wyznanie",
	confession_channel_button_name: "Odpowiedz anonimowo",
	confession_1_embed_log_title: "Nowa odpowiedź na wyznanie",
	global_unknown_message: "Nie znaleziono wiadomości.",
	global_error: "❌ Błąd",
	global_not_atc: "Wybrana wiadomość nie zawiera załącznika.",
	global_not_valid_atc:
		"Wybrany załącznik nie jest prawidłowym plikiem audio.",
	global_too_heavy_file:
		"Wygenerowany plik MP4 jest za duży (${fileSize} MB). Limit Discorda to 25 MB.",
	global_convert_ok: "✅ Konwersja zakończona sukcesem",
	global_convert_ok_desc:
		"Twój plik audio został przekonwertowany do MP4 (${fileSize} MB).",
	economy_logs_add_money_title: "Logi ekonomii - Dodanie pieniędzy",
	economy_logs_remove_money_title: "Logi ekonomii - Odebranie pieniędzy",
	economy_logs_boost_role_title: "Logi ekonomii - Boost dla roli",
	economy_logs_config_title: "Logi ekonomii - Konfiguracja modułu",
	economy_logs_role_add_title: "Logi ekonomii - Nowa rola dodana do sklepu",
	economy_logs_role_remove_title: "Logi ekonomii - Rola usunięta ze sklepu",
	economy_logs_pay_title: "Logi ekonomii - Przelew",
	economy_logs_rob_title: "Logi ekonomii - Kradzież",
	economy_logs_set_cooldown_title:
		"Logi ekonomii - Ustawienie czasu odnowienia",
	economy_logs_set_money_title: "Logi ekonomii - Ustawienie pieniędzy",
	economy_logs_withdraw_title: "Logi ekonomii - Wypłata",
	economy_logs_deposit_title: "Logi ekonomii - Wpłata",
	economy_logs_add_money_desc: "{author} dodał {target} `{amount}$` {coin}",
	economy_logs_remove_money_desc:
		"{author} odebrał {target} `{amount}$` {coin}",
	economy_logs_boost_role_desc:
		"{author} ustawił boost dla roli {role}. Boost wynosi teraz: `x{amount}`",
	economy_logs_config_desc:
		"{author} zmienił stan modułu ekonomii na: {state}",
	economy_logs_role_add_desc:
		"{author} dodał rolę {role} do sklepu. Cena: `{amount}$`",
	economy_logs_role_remove_desc: "{author} usunął rolę {role} ze sklepu.",
	economy_logs_pay_desc: "{author} wysłał `{amount}$` do {target}",
	economy_logs_rob_desc: "{author} ukradł `{amount}$` użytkownikowi {target}",
	economy_logs_set_cooldown_desc:
		"{author} ustawił czas odnowienia `{type}` na **{time}**",
	economy_logs_set_money_desc:
		"{author} ustawił pieniądze `{type}` na **{money}**",
	economy_logs_withdraw_desc: "{author} wypłacił z banku **${money}**",
	economy_logs_deposit_desc: "{author} wpłacił do banku **${money}**",
	var_on: "włączony",
	var_off: "wyłączone",
	global_command_cooldown_msg:
		"${emoji} Musisz poczekać **${time}** między kolejnymi użyciami **`${ctxCommandPath}`**",
	counter_error_too_much_u:
		"<@${messageAuthorId}> POPSUŁ LICZENIE NA **${number}**!! Następna liczba to **1**. **Nie możesz liczyć dwa razy z rzędu.**",
	counter_error_syntaxic:
		"<@${messageAuthorId}> POMYLIŁ SIĘ!! Następna liczba to **1**.",
	global_blacklist_msg_to_send:
		"Zostałeś automatycznie zbanowany na tym serwerze, ponieważ Twoje konto znajduje się na globalnej czarnej liście iHorizon.\n\nPowód: `${reason}`\n\nZgodnie z sekcją 3 naszego Regulaminu serwery korzystające z iHorizon zgadzają się, że bot może automatycznie egzekwować sankcje związane z tą globalną czarną listą.\n\nJeśli uważasz, że to pomyłka lub chcesz się odwołać od tej decyzji, możesz to zrobić tutaj:\nOdwołanie: <https://www.ihorizon.org/appeal>\n\nRegulamin: <https://www.ihorizon.org/tos>",
	global_blacklist_reason:
		"Kara projektu iHorizon - czarna lista | Powód: ${reason}",
	server_blacklist_msg_to_send:
		"Zostałeś zbanowany, ponieważ jesteś na czarnej liście tego serwera.\nPowód: `${data2Reason}`",
	server_blacklist_reason: "Czarna lista | Powód: ${data2Reason}",
	help_sticky_fields: "Sticky",
	help_sticky_dsc:
		"> *Utrzymuj ważną wiadomość zawsze na widoku na swoich kanałach dzięki automatycznemu ponownemu wysyłaniu.*",
	sticky_channel_command_error:
		"${emoji_No} | ${author}, nie znalazłem prawidłowego kanału tekstowego.",
	sticky_text_command_missing_message:
		"${emoji_No} | ${author}, musisz podać wiadomość sticky.",
	sticky_text_command_work:
		"${emoji_Yes} | ${author}, tekstowa wiadomość sticky jest teraz aktywna na ${channel}.",
	sticky_embed_command_embed_not_found:
		"${emoji_No} | ${author}, nie znalazłem embeda `${embed_id}`.",
	sticky_embed_command_work:
		"${emoji_Yes} | ${author}, embed sticky `${embed_id}` jest teraz aktywny na ${channel}.",
	sticky_disable_command_not_found:
		"${emoji_No} | ${author}, na ${channel} nie skonfigurowano żadnej wiadomości sticky.",
	sticky_disable_command_work:
		"${emoji_Yes} | ${author}, wiadomość sticky została wyłączona na ${channel}.",
	sticky_refresh_command_not_found:
		"${emoji_No} | ${author}, na ${channel} nie skonfigurowano żadnej wiadomości sticky.",
	sticky_refresh_command_missing_embed:
		"${emoji_No} | ${author}, wiadomość sticky na ${channel} odwołuje się do embeda, który już nie istnieje.",
	sticky_refresh_command_missing_permissions:
		"${emoji_No} | ${author}, nie mogę ponownie wysłać wiadomości sticky na ${channel}. Sprawdź moje uprawnienia.",
	sticky_refresh_command_work:
		"${emoji_Yes} | ${author}, wiadomość sticky została ponownie wysłana na ${channel}.",
	sticky_show_command_not_found:
		"${emoji_No} | ${author}, na ${channel} nie skonfigurowano żadnej wiadomości sticky.",
	sticky_show_embed_title: "Konfiguracja wiadomości sticky",
	sticky_show_embed_fields_channel: "Kanał",
	sticky_show_embed_fields_type: "Typ",
	sticky_show_embed_fields_status: "Status",
	sticky_show_embed_fields_message: "Wiadomość",
	sticky_show_embed_fields_embed: "ID embeda",
	sticky_show_embed_fields_last_message: "ID ostatniej wiadomości sticky",
	sticky_list_embed_title: "Kanały sticky",
	sticky_list_embed_desc_empty:
		"Na tym serwerze nie skonfigurowano żadnego kanału sticky.",
	sticky_list_embed_desc_line_text: "${channel} - Sticky tekstowy",
	sticky_list_embed_desc_line_embed:
		"${channel} - Sticky z embedem (`${embed_id}`)",
	sticky_list_embed_desc_line_text_embed:
		"${channel} - Sticky z tekstem i embedem (`${embed_id}`)",
	sticky_var_text: "Tekst",
	sticky_var_embed: "Embed",
	sticky_var_text_embed: "Tekst + embed",
	sticky_var_enabled: "Włączone",
	sticky_var_disabled: "Wyłączone",
	sticky_var_none: "Brak",
	honeypot_config_not_allowed:
		"Musisz być administratorem lub znajdować się na liście dozwolonych, aby skonfigurować Honeypot.",
	honeypot_config_embed_title: "Konfiguracja Honeypot",
	honeypot_config_embed_desc:
		"Skonfiguruj kanał-pułapkę, kanał logów i automatyczną akcję stosowaną, gdy ktoś zacznie pisać na kanale *Honeypot*.",
	honeypot_config_embed_field_status: "Status",
	honeypot_config_embed_field_trap_channel: "Kanał-pułapka",
	honeypot_config_embed_field_logs_channel: "Kanał logów",
	honeypot_config_embed_field_action: "Akcja",
	honeypot_config_embed_field_message: "Wysyłana wiadomość",
	honeypot_config_embed_field_notes: "Uwagi",
	honeypot_config_embed_field_credit: "Podziękowania",
	honeypot_config_notes_value:
		"- **Umieść rolę iHorizon powyżej wszystkich ról członków, aby uzyskać maksymalną skuteczność.**\n- **Automatycznie utworzone kanały Honeypot są przenoszone na górę serwera, aby uzyskać maksymalną skuteczność.**\n- **Możesz zmienić nazwę kanału Honeypot, niczego nie psując.**",
	honeypot_config_credit_value:
		"*Zainspirowane botem Honeypot od RiskyMH, zajrzyj do niego!*\n${url}",
	honeypot_config_select_trap_placeholder: "Wybierz kanał-pułapkę",
	honeypot_config_select_logs_placeholder: "Wybierz kanał logów",
	honeypot_config_select_action_placeholder: "Wybierz akcję do zastosowania",
	honeypot_config_button_send: "Wyślij embed",
	honeypot_config_button_preview: "Podgląd",
	honeypot_config_button_enable: "Włącz Honeypot",
	honeypot_config_button_disable: "Wyłącz Honeypot",
	honeypot_config_send_success:
		"Embed Honeypot został wysłany na ${channel}.",
	honeypot_config_enable_success:
		"Honeypot jest teraz włączony na ${channel}.",
	honeypot_config_disable_success: "Honeypot jest teraz wyłączony.",
	honeypot_config_missing_logs_channel:
		"Przed włączeniem Honeypot musisz skonfigurować kanał logów.",
	honeypot_config_generic_error:
		"Wystąpił błąd podczas aktualizacji Honeypot.",
	honeypot_config_select_action_kick: "Wyrzucaj użytkowników",
	honeypot_config_select_action_ban: "Banuj użytkowników",
	honeypot_config_select_action_none: "Tylko usuwaj wiadomości",
	honeypot_config_select_action_del_messages: "Usuwaj wiadomości",
	honeypot_default_channel_name: "🍯・general-chat",
	honeypot_action_none: "Tylko usuwanie wiadomości",
	honeypot_action_failed: "Akcja nie powiodła się",
	honeypot_dm_action_kicked: "zostałeś wyrzucony!",
	honeypot_dm_action_banned: "zostałeś zbanowany!",
	honeypot_dm_action_none: "Twoje wiadomości zostały usunięte",
	honeypot_trap_embed_title: "NIE PISZ WIADOMOŚCI NA TYM KANALE",
	honeypot_trap_embed_desc:
		"*Ten kanał służy do wyłapywania spamujących botów.*\n*Każda wiadomość wysłana tutaj **URUCHOMI** automatyczną ochronę serwera.*",
	honeypot_trap_embed_footer:
		"Zainspirowane botem Honeypot od RiskyMH, zajrzyj do niego!\n${url}",
	honeypot_trap_count_none: "Nikt jeszcze nie został ukarany",
	honeypot_trap_count_one: "1 osoba ukarana",
	honeypot_trap_count_other: "Ukarano: ${count}",
	honeypot_trap_count_never: "nigdy",
	honeypot_trap_count_reply: "🍯 Kary z tej pułapki: **${count}**\nOstatnia: ${last}",
	honeypot_dm_title: "URUCHOMIONO HONEYPOT!",
	honeypot_dm_desc:
		"Wiadomość wysłana przez Ciebie na kanale *Honeypot* na serwerze **`${guild}`** **uruchomiła** skonfigurowaną ochronę.\n\n__Podjęta wobec Ciebie akcja:__ **`${action}`**\n\n*Wiadomości wysłane przez Ciebie w ciągu ostatnich 2 godzin są usuwane z serwera. Jeśli uważasz, że Twoje konto zostało zhakowane, zmień hasło i włącz 2FA na swoim koncie Discord. Jeśli to Twoja pomyłka, skontaktuj się z administracją serwera, aby rozwiązać sprawę.*",
	honeypot_log_title: "Uruchomiono Honeypot - ${action}",
	honeypot_log_field_author: "Autor",
	honeypot_log_field_channel: "Kanał",
	honeypot_log_field_message: "Usunięta wiadomość",
	honeypot_log_field_attachments: "Załączniki",
	honeypot_log_field_stickers: "Naklejki",
	honeypot_log_field_embeds: "Embedy",
	honeypot_log_field_deleted_messages: "Usunięte wiadomości",
	honeypot_log_field_triggered_messages:
		"Wiadomości, które uruchomiły ochronę",
	honeypot_log_field_dm_status: "Status DM",
	honeypot_log_field_result: "Wynik",
	honeypot_log_dm_open: "Dostarczono",
	honeypot_log_dm_closed: "Zamknięte lub nieosiągalne",
	honeypot_log_no_content: "Brak treści tekstowej",
	honeypot_log_action_ban: "Zbanowano użytkownika",
	honeypot_log_action_kick: "Wyrzucono użytkownika",
	honeypot_log_action_none: "Nie podjęto żadnej akcji",
	help_tts_fields: "TTS",
	help_tts_dsc:
		"> *Zamieniaj tekst na mowę na kanałach głosowych z iHorizon!*",
	tts_join_not_in_voice:
		"${emoji_No} Musisz być połączony z kanałem głosowym, aby użyć tej komendy!",
	tts_join_already_enabled:
		"${emoji_No} Moduł TTS jest już włączony na tym serwerze!",
	tts_join_music_playing:
		"${emoji_No} Na tym serwerze aktualnie gra muzyka. Zatrzymaj muzykę przed włączeniem TTS.",
	tts_join_enabled:
		"${emoji_Yes} Tryb TTS został włączony na ${voiceChannel}!",
	tts_join_error: "${emoji_No} Wystąpił błąd podczas włączania trybu TTS.",
	tts_join_lang_fallback: "en-US",
	tts_leave_not_active:
		"${emoji_No} Moduł TTS nie jest teraz aktywny na tym serwerze!",
	tts_leave_not_in_voice:
		"${emoji_No} Musisz być na kanale głosowym TTS, aby go wyłączyć!",
	tts_leave_disabled:
		"${emoji_Yes} Tryb TTS został wyłączony na tym serwerze!",
	tts_info_embed_title: "Informacje o module TTS",
	tts_info_embed_description:
		"Moduł TTS (zamiana tekstu na mowę) pozwala iHorizon czytać wiadomości na głos na kanale głosowym. Gdy jest włączony, każda wiadomość wysłana na skonfigurowanym kanale tekstowym przez członków przebywających na kanale głosowym zostanie odczytana przez iHorizon.",
	tts_info_field_status: "Status",
	tts_info_field_lang: "Język TTS",
	tts_info_field_howto: "Jak używać",
	tts_info_howto_value:
		"Użyj `/tts join`, aby uruchomić TTS na swoim kanale głosowym.\nUżyj `/tts leave`, aby zatrzymać TTS.\nUżyj `/tts lang`, aby zmienić język głosu.",
	tts_lang_not_active:
		"${emoji_No} Moduł TTS nie jest teraz aktywny na tym serwerze!",
	tts_lang_set: "${emoji_Yes} Język TTS został ustawiony na `${language}`.",
	tts_embed_title: "Tryb TTS aktywowany",
	tts_embed_description:
		"Moduł TTS jest teraz aktywny na ${voiceChannel}.\nWszystkie wiadomości wysłane tutaj przez członków przebywających na kanale głosowym będą czytane na głos.\n\n**Członkowie na kanale głosowym:** ${members}",
	tts_embed_footer: "Użyj /tts leave, aby zatrzymać TTS",
	tts_join_not_text_based:
		"${emoji_No} Ten kanał głosowy nie obsługuje wiadomości tekstowych. Włącz czat w kanale głosowym lub użyj innego kanału.",
	tts_music_blocked:
		"${emoji_No} Moduł TTS jest aktualnie aktywny. Wyłącz TTS przed odtwarzaniem muzyki.",
	tts_voice_status: "Tryb TTS - zamiana tekstu na mowę",
	help_h247_fields: "H24/7",
	help_h247_dsc: "> *Utrzymuj iHorizon połączonego 24/7 na kanale głosowym!*",
	h247_join_invalid_channel: "${emoji_No} Podaj prawidłowy kanał głosowy!",
	h247_join_already_active:
		"${emoji_No} Moduł H24/7 jest już aktywny na ${voiceChannel}!",
	h247_join_music_playing:
		"${emoji_No} Na tym serwerze aktualnie gra muzyka. Zatrzymaj muzykę przed włączeniem modułu H24/7.",
	h247_join_tts_active:
		"${emoji_No} Moduł TTS jest aktualnie aktywny na innym kanale głosowym. Wyłącz TTS przed włączeniem modułu H24/7.",
	h247_joined:
		"${emoji_Yes} iHorizon pozostanie połączony 24/7 na ${voiceChannel}!",
	h247_join_error:
		"${emoji_No} Wystąpił błąd podczas włączania modułu H24/7.",
	h247_leave_not_active:
		"${emoji_No} Moduł H24/7 nie jest teraz aktywny na tym serwerze!",
	h247_left: "${emoji_Yes} Moduł H24/7 został wyłączony na tym serwerze!",
	h247_leave_error:
		"${emoji_No} Wystąpił błąd podczas wyłączania modułu H24/7.",
	h247_info_embed_title: "Informacje o module H24/7",
	h247_info_embed_description:
		"Moduł H24/7 utrzymuje iHorizon połączonego z kanałem głosowym przez całą dobę, nawet gdy nic nie gra. Przydaje się do podtrzymania serii głosowej serwera.\nGdy moduł jest włączony, muzyka i TTS mogą działać tylko na kanale głosowym H24/7.\nPołączenie odzyskuje się automatycznie po restartach lub zamknięciu odtwarzacza.",
	h247_info_field_status: "Status",
	h247_info_field_howto: "Jak używać",
	h247_info_howto_value:
		"Użyj `/h247 join`, aby zaparkować iHorizon na kanale głosowym.\nUżyj `/h247 leave`, aby wyłączyć moduł.\nUżyj `/h247 info`, aby wyświetlić ten panel.",
	h247_play_refused:
		"${emoji_No} Moduł H24/7 jest aktywny na tym serwerze. Dołącz do kanału głosowego H24/7, aby odtwarzać muzykę!",
	h247_tts_refused:
		"${emoji_No} Moduł H24/7 jest aktywny na tym serwerze. Dołącz do kanału głosowego H24/7, aby włączyć TTS!",
	gw_go_duration_too_low: "${emoji_No} | Minimalny czas trwania to 3 minuty!",
	avatar_card_title: "Awatar użytkownika ${user}",
	card_download: "Pobierz",
	serverinfo_label_owner: "Właściciel",
	serverinfo_label_members: "Członkowie",
	serverinfo_label_created: "Utworzono",
	serverinfo_label_joined: "Dołączyłeś",
	serverinfo_label_roles: "Role",
	serverinfo_label_channels: "Kanały",
	serverinfo_label_boosts: "Boosty",
	serverinfo_boost_value: "${count} (poziom ${tier})",
	serverinfo_label_verification: "Weryfikacja",
	serverinfo_label_language: "Język",
	serverinfo_label_id: "ID",
	serverinfo_verif_none: "Brak",
	serverinfo_verif_low: "Niski",
	serverinfo_verif_medium: "Średni",
	serverinfo_verif_high: "Wysoki",
	serverinfo_verif_highest: "Najwyższy",
	all_bots_card_title: "Boty na serwerze ${guild}",
	all_bots_card_count: "${count} botów",
	all_bots_none: "Na tym serwerze nie ma żadnego bota.",
	unbanall_card_progress: "Odbanowuję `${count}` członków…",
	unbanall_card_undo_progress: "Banuję ponownie `${count}` członków…",
	unbanall_card_title: "Odbanowanie wszystkich",
	unbanall_card_undo_title: "Odbanowanie wszystkich cofnięte",
	unbanall_label_unbanned: "Odbanowani",
	unbanall_label_banned: "Zbanowani ponownie",
	unbanall_label_failed: "Niepowodzenia",
	sync_card_title: "Uprawnienia zsynchronizowane",
	sync_card_desc:
		"Te kanały podążają teraz za uprawnieniami kategorii ${category}:",
	media_only_card_title: "Kanały tylko dla mediów",
	utils_label_save: "Zapisz",
	nick_kicker_card_title: "Wyrzucanie za pseudonimy",
	nick_kicker_label_status: "Status",
	nick_kicker_label_words: "Słowa",
	wlroles_card_title: "Role na białej liście",
	wlroles_card_warn_title: "Niebezpieczne uprawnienia",
	wlroles_card_high_title: "Role powyżej mojej",
	userinfo_label_badges: "Odznaki",
	userinfo_label_username: "Nazwa użytkownika",
	userinfo_label_created: "Konto utworzone",
	userinfo_label_joined: "Dołączył do serwera",
	userinfo_label_nitro: "Nitro",
	userinfo_label_roles: "Role",
	userinfo_label_id: "ID",
	userinfo_card_loading: "Wczytuję profil…",
	banner_card_guild_title: "Baner serwera ${guild}",
	banner_card_user_title: "Baner użytkownika ${user}",
	inviteinfo_label_channel: "Kanał",
	inviteinfo_label_inviter: "Zaproszony przez",
	inviteinfo_label_created: "Serwer utworzony",
	inviteinfo_label_expires: "Wygasa",
	inviteinfo_label_members: "Członkowie",
	inviteinfo_label_online: "Online",
	inviteinfo_label_boosts: "Boosty",
	inviteinfo_label_features: "Funkcje",
	serverpic_card_title: "Ikona serwera ${guild}",
	serverpic_card_no_icon: "Ten serwer nie ma ikony.",
	where_card_title: "Gdzie jest ${member}",
	where_label_member: "Członek",
	where_label_channel: "Kanał głosowy",
	where_label_stream: "Transmisja",
	where_label_video: "Kamera",
	where_label_mute: "Wyciszony(-a) przez siebie",
	where_label_deaf: "Ogłuszony(-a) przez siebie",
	vc_card_title: "Aktywność głosowa",
	vc_label_members: "Członkowie",
	vc_label_online: "Online",
	vc_label_in_voice: "Na kanale głosowym",
	vc_label_streaming: "Transmitują",
	vc_label_boosts: "Boosty",
	vc_label_camera: "Z włączoną kamerą",
	vc_label_muted: "Wyciszeni",
	snipe_card_title: "Ostatnio usunięta wiadomość",
	snipe_label_author: "Autor",
	snipe_label_sent: "Wysłano",
	utils_label_member: "Członek",
	utils_label_role: "Rola",
	utils_label_by: "Przez",
	utils_label_failed: "Niepowodzenia",
	utils_label_from: "Z",
	utils_label_to: "Do",
	utils_label_moved: "Przeniesieni",
	utils_label_name_filter: "Nazwa zawiera",
	derank_card_progress: "Odbieram ${count} ról użytkownikowi ${member}…",
	derank_card_title: "Członek zdegradowany",
	derank_label_removed: "Odebrane role",
	massiverole_card_progress_add: "Nadaję rolę ${count} członkom…",
	massiverole_card_progress_sub: "Odbieram rolę ${count} członkom…",
	massiverole_card_title_add: "Rola nadana członkom",
	massiverole_card_title_sub: "Rola odebrana członkom",
	massiverole_label_added: "Otrzymali ją",
	massiverole_label_already: "Już ją mieli",
	massiverole_label_removed: "Stracili ją",
	massiverole_label_without: "Nie mieli jej",
	nickrole_label_skipped: "Pominięci",
	massmove_card_title: "Członkowie przeniesieni",
	bringall_card_title: "Członkowie rozproszeni",
	bringall_label_category: "Kategoria",
	bringall_label_channels: "Kanały głosowe",
	setmentionrole_card_title: "Rola za wzmiankę włączona",
	setmentionrole_card_desc: "Gdy członek wspomni o mnie, nadaję mu tę rolę.",
	setmentionrole_card_note:
		"Rolę dostają tylko członkowie, których nazwa użytkownika lub wyświetlana nazwa zawiera ten tekst. Jeśli ją usuną, rola zostanie odebrana, a po ponownym dodaniu tekstu nadana z powrotem.",
	card_bot: "Bot",
	card_working: "Pracuję nad tym…",
	card_label_requested_by: "Na prośbę",
	card_label_failed: "Niepowodzenia",
	admin_users_card_title: "Administratorzy",
	admin_users_card_count: "${count} członków z uprawnieniem Administrator",
	admin_users_card_only_bots: "To uprawnienie mają tylko boty.",
	admin_users_button_hide_bots: "Ukryj boty",
	admin_users_button_show_bots: "Pokaż boty",
	admin_users_card_done_title: "Administratorzy zdegradowani",
	admin_users_label_unranked: "Zdegradowani członkowie",
	admin_roles_card_title: "Role administratorskie",
	admin_roles_card_count: "${count} ról z uprawnieniem Administrator",
	admin_roles_card_managed: "Zarządzana przez integrację",
	admin_roles_card_done_title: "Uprawnienie administratora usunięte",
	admin_roles_label_modified: "Zmodyfikowane role",
	allwebhooks_card_count: "${count} webhooków",
	allwebhooks_button_delete: "Usuń wszystkie",
	role_members_card_title: "Członkowie roli ${role}",
	role_members_card_count: "${count} członków",
	prevnames_card_title: "Poprzednie nazwy użytkownika ${user}",
	prevnames_card_count: "Zapisano ${count} nazw",
	prevnames_button_erase: "Wymaż moją historię",
	prevnames_label_username: "Nazwa użytkownika",
	prevnames_label_display_name: "Wyświetlana nazwa",
	prevnames_label_nickname: "Pseudonim na ${guild}",
	emoji_card_title: "Emoji dodane",
	emoji_card_count: "Utworzono ${count} emoji na ${guild}",
	util_leashlist_card_count: "${count} aktywnych smyczy",
	util_leashlist_card_expires: "Wygasa",
	util_locknamelist_card_count: "${count} zablokowanych pseudonimów",
	util_locknamelist_card_by: "Zablokowane przez ${user}",
	invites_card_title: "Statystyki zaproszeń",
	invites_label_total: "Razem",
	invites_label_regular: "Zwykłe",
	invites_label_left: "Wyszli",
	invites_label_bonus: "Bonusowe",
	invites_label_invited_by: "Zaproszony przez",
	leaderboard_card_title: "Ranking zaproszeń",
	leaderboard_card_count: "${count} sklasyfikowanych członków na ${guild}",
	leaderboard_card_your_rank:
		"Twoja pozycja: ${rank}/${count} z ${invites} zaproszeniami",
	leaderboard_card_not_ranked: "Nie jesteś jeszcze w rankingu.",
	leaderboard_card_empty: "Nikt na tym serwerze nie ma jeszcze zaproszeń.",
	leaderboard_card_generated: "Wygenerowano w ${elapsed} ms",
	caracteres_card_title: "Wybierz styl tekstu",
	caracteres_card_result_title: "Twój tekst w stylu ${style}",
	caracteres_label_original: "Oryginał",
	caracteres_label_converted: "Po zmianie",
	catsay_card_title: "Kot przemówił",
	hack_card_title: "Włamanie zakończone",
	hack_label_ip: "Adres IP",
	hack_label_email: "E-mail",
	hack_label_password: "Hasło",
	hug_card_title: "Czas na przytulasa",
	hug_card_desc: "${author} mocno przytula ${target}.",
	kiss_card_title: "Buziak",
	kiss_card_desc: "${author} całuje ${target}.",
	slap_card_title: "Policzek",
	slap_card_desc: "${author} policzkuje ${target}.",
	love_card_title: "Kalkulator miłości",
	love_card_desc: "**${user1}** + **${user2}** = `${percent}%` miłości",
	poll_card_title: "Ankieta od ${author}",
	poll_card_vote:
		"Zareaguj ${yes}, aby zagłosować na tak, lub ${no}, aby zagłosować na nie.",
	question_card_title: "${author} pyta",
	question_label_question: "Pytanie",
	question_label_answer: "Odpowiedź",
	tweet_card_title: "Nowy post od ${user}",
	youtube_card_title: "Nowy komentarz od ${user}",
	fun_card_cat_title: "Miau",
	fun_card_dog_title: "Hau hau",
	fun_card_dolphin_title: "Iii-iii, klik klik",
	fun_card_duck_title: "Kwa kwa",
	fun_card_fox_title: "Wa-pa-pa-pa-pa",
	fun_card_frog_title: "Kum kum",
	fun_card_panda_title: "Mwaa",
	fun_card_squirrel_title: "Ćwir-ćwir",
	fun_card_animal_hint: "Losowe zdjęcie, specjalnie dla Ciebie.",
	fun_card_dice_title: "Rzut kośćmi",
	fun_card_coinflip_title: "Orzeł czy reszka",
	fun_card_number_title: "Losowa liczba",
	fun_card_gay_title: "Gejometr",
	fun_card_trans_title: "Transometr",
	fun_card_stench_title: "Smrodomierz",
	fun_card_rate_title: "Moja ocena",
	fun_card_transgender_title: "Awatar z flagą transpłciową",
	fun_label_dice: "Kości",
	fun_label_rolls: "Rzuty",
	fun_label_total: "Suma",
	fun_label_result: "Wynik",
	fun_label_range: "Zakres",
	fun_label_score: "Wynik",
	fun_label_rated: "Oceniono",
	mod_label_moderator: "Moderator",
	mod_label_warn_id: "ID ostrzeżenia",
	ban_card_title: "Członek zbanowany",
	kick_card_title: "Członek wyrzucony",
	baninfo_card_title: "Ban użytkownika ${user}",
	banlist_card_title: "Zbanowani członkowie",
	banlist_card_count: "${count} zbanowanych członków",
	mutelist_card_title: "Członkowie z timeoutem",
	mutelist_card_count: "${count} członków z timeoutem",
	mutelist_card_ends: "Kończy się ${time}",
	mutelist_button_unmute_all: "Zdejmij wszystkie timeouty",
	mutelist_card_cleared_title: "Timeouty zdjęte",
	mutelist_card_cleared_desc: "${count} członków może znów pisać.",
	warnlist_card_title: "Ostrzeżenia użytkownika ${user}",
	unwarn_card_title: "Ostrzeżenie usunięte",
	warn_card_title: "Członek ostrzeżony",
	warn_err_self: "${emoji_No} Nie możesz ostrzec samego siebie.",
	warn_err_bot: "${emoji_No} Botów nie można ostrzegać.",
	warn_err_above:
		"${emoji_No} Nie możesz ostrzec członka, którego najwyższa rola jest równa Twojej lub wyższa.",
	warn_dm_title: "Otrzymałeś ostrzeżenie",
	warn_label_date: "Data",
	warn_label_active: "Aktywne ostrzeżenia",
	warn_label_note: "Notatka staffu",
	warn_label_sanction: "Automatyczna sankcja",
	warn_auto_reason: "Automatyczna sankcja: ${count} ostrzeżeń",
	warn_sanction_timeout: "Timeout (${duration})",
	warn_sanction_kick: "Wyrzucenie",
	warn_sanction_ban: "Ban",
	warn_sanction_failed:
		"${sanction}, nie zastosowano: iHorizon nie może ukarać tego członka",
	warn_expire_note: "ostrzeżenia wygasają po ${days} dniach",
	warnlist_expired: "wygasło",
	warnlist_card_active: "${active} aktywnych · ${count} łącznie",
	warnconfig_title: "Ustawienia ostrzeżeń",
	warnconfig_label_expiry: "Wygasanie",
	warnconfig_expiry_never: "Nigdy: ostrzeżenia liczą się na zawsze",
	warnconfig_expiry_days: "Po ${days} dniach",
	warnconfig_label_rules: "Automatyczne sankcje",
	warnconfig_no_rules: "Brak: ostrzeżenia same nigdy nie powodują sankcji",
	warnconfig_rule_line: "**${count}** ostrzeżeń → ${sanction}",
	warnconfig_saved: "Ustawienia zapisane.",
	warnconfig_err_duration:
		"${emoji_No} Timeout wymaga czasu trwania od 1 minuty do 28 dni (np. `1h`, `2d`).",
	warnconfig_err_count:
		"${emoji_No} Próg musi wynosić od 1 do 100 ostrzeżeń.",
	warnconfig_err_rules:
		"${emoji_No} Maksymalnie 10 automatycznych sankcji: najpierw usuń jedną.",
	warnconfig_err_expiry:
		"${emoji_No} Wygasanie musi wynosić od 0 (nigdy) do 365 dni.",
	warnconfig_err_sanction:
		"${emoji_No} Wybierz sankcję dla tego progu (lub `none`, aby ją usunąć).",
	warnconfig_hint:
		"Dodaj sankcję: `/mod warnconfig threshold:3 sanction:timeout duration:1h` · usuń ją: `sanction:none` · wygasanie: `expire-days:30` (0 = nigdy)",
	clearwarn_card_title: "Ostrzeżenia wyczyszczone",
	clearwarn_card_desc: "Usunięto ${count} ostrzeżeń użytkownika ${member}.",
	clear_allwarns_card_title: "Wszystkie ostrzeżenia usunięte",
	mod_label_duration: "Czas trwania",
	mod_label_ends: "Koniec",
	mod_label_channel: "Kanał",
	mod_label_messages: "Usunięte wiadomości",
	mod_label_target: "Dotyczy",
	tempmute_card_title: "Członek z timeoutem",
	unmute_card_title: "Timeout zdjęty",
	unban_card_title: "Członek odbanowany",
	tempban_card_title: "Członek zbanowany czasowo",
	temprole_card_title: "Rola tymczasowa nadana",
	clear_card_title: "Wiadomości usunięte",
	lock_card_title: "Kanał zablokowany",
	unlock_card_title: "Kanał odblokowany",
	lockall_card_title: "Serwer zablokowany",
	unlockall_card_title: "Serwer odblokowany",
	rolepanel_card_done_title: "Role zaktualizowane",
	rolepanel_label_added: "Dodane",
	rolepanel_label_removed: "Usunięte",
	rolepanel_label_refused: "Odrzucone",
	stats_locale: "pl-PL",
	stats_view_overview: "Przegląd",
	stats_view_overview_desc: "Sumy, trend i ulubione kanały",
	stats_view_rhythm: "Rytm",
	stats_view_rhythm_desc: "Kiedy to się dzieje, godzina po godzinie",
	stats_view_members: "Członkowie",
	stats_view_members_desc: "Kto pisze, a kto siedzi na kanałach głosowych",
	stats_view_channels: "Kanały",
	stats_view_channels_desc: "Najbardziej ruchliwe kanały tekstowe i głosowe",
	stats_select_placeholder: "Wybierz widok",
	stats_label_messages: "Wiadomości",
	stats_label_voice: "Czas na głosowym",
	stats_label_active_days: "Aktywne dni",
	stats_label_rank: "Pozycja na serwerze",
	stats_label_active_members: "Aktywni członkowie",
	stats_label_members: "Członkowie",
	stats_label_peak: "Szczyt",
	stats_label_avg_length: "Średnia długość",
	stats_label_sessions: "Sesje głosowe",
	stats_label_longest_session: "Najdłuższa sesja",
	stats_label_best_streak: "Najlepsza seria",
	stats_note_change_up: "+${change} % względem zeszłego tygodnia",
	stats_note_change_down: "-${change} % względem zeszłego tygodnia",
	stats_note_new: "Nowe w tym tygodniu",
	stats_note_steady: "Tak samo jak w zeszłym tygodniu",
	stats_note_streak: "Seria: ${days} dni",
	stats_note_rank_of: "z ${count} członków",
	stats_note_unranked: "Jeszcze bez pozycji",
	stats_note_chars: "znaków na wiadomość",
	stats_note_avg_session: "średnio ${duration}",
	stats_note_days_in_row: "dni z rzędu",
	stats_chart_daily: "Aktywność dzienna",
	stats_chart_voice_minutes: "Głosowy (min)",
	stats_chart_messages_per_day: "Wiadomości dziennie",
	stats_text_channels: "Kanały tekstowe",
	stats_voice_channels: "Kanały głosowe",
	stats_top_messages: "Najwięcej wiadomości",
	stats_top_voice: "Najwięcej czasu na głosowym",
	stats_heat_messages: "Wiadomości",
	stats_heat_voice: "Głosowy",
	stats_peak_note: "Szczyt: ${day} ${hour}",
	stats_empty: "Jeszcze nic",
	stats_footer_zone: "Godziny w strefie ${zone} · ostatnie 30 dni",
	stats_title_user: "Aktywność użytkownika ${user}",
	stats_title_guild: "Aktywność na ${guild}",
	stats_title_channel: "Aktywność na ${channel}",
	stats_title_compare: "${a} i ${b}",
	stats_title_top_messages: "Top wiadomości",
	stats_title_top_voice: "Top czas na głosowym",
	stats_period_1d: "Ostatnie 24 godziny",
	stats_period_7d: "Ostatnie 7 dni",
	stats_period_30d: "Ostatnie 30 dni",
	stats_insight_peak: "Największa aktywność: ${day} około ${hour}.",
	stats_insight_up: "O ${change} % więcej wiadomości niż w zeszłym tygodniu.",
	stats_insight_down:
		"O ${change} % mniej wiadomości niż w zeszłym tygodniu.",
	stats_insight_channel: "Ulubiony kanał: ${channel}.",
	stats_insight_streak: "Aktywność ${days} dni z rzędu.",
	stats_insight_leader: "${user} prowadzi z wynikiem ${value}.",
	stats_insight_compare: "${user} wygrywa w ${count} z ${total} wskaźników.",
	stats_insight_tie: "Łeb w łeb.",
	stats_compare_same: "Wybierz dwóch różnych członków.",
	stats_wrong_channel: "Wybierz kanał tekstowy lub głosowy.",
	stats_card_no_data: "Brak zapisanej aktywności z ostatnich 30 dni.",
	music_apo_panel_title: "Equalizer APO",
	music_apo_panel_on: "Moduł włączony",
	music_apo_panel_off: "Moduł wyłączony",
	music_apo_panel_applied: "Domyślnie zastosowana: **${name}**",
	music_apo_panel_nothing_applied: "Brak konfiguracji stosowanej domyślnie",
	music_apo_panel_count:
		"${count}/${max} konfiguracji · zastosowana kształtuje wszystko, co gra na serwerze",
	music_apo_panel_empty:
		"Brak konfiguracji. Dodaj plik .txt Equalizer APO przyciskiem poniżej.",
	music_apo_badge_applied: "Zastosowana",
	music_apo_badge_frozen: "Zamrożona",
	music_apo_config_meta:
		"przez ${user} · zaktualizowano ${time} · ${lines} linii · ${size}",
	music_apo_button_manage: "Zarządzaj",
	music_apo_button_add: "Dodaj konfigurację",
	music_apo_button_enable: "Włącz",
	music_apo_button_disable: "Wyłącz",
	music_apo_button_apply: "Stosuj domyślnie",
	music_apo_button_unapply: "Przestań stosować",
	music_apo_button_rename: "Zmień nazwę",
	music_apo_button_replace: "Zastąp plik",
	music_apo_button_freeze: "Zamroź",
	music_apo_button_unfreeze: "Odmroź",
	music_apo_button_delete: "Usuń",
	music_apo_button_confirm_delete: "Usuń na stałe",
	music_apo_button_cancel: "Anuluj",
	music_apo_frozen_note:
		"Zamrożona przez ${user}: można ją stosować, ale nie można zmienić jej nazwy, zastąpić ani usunąć.",
	music_apo_confirm_delete:
		"Usunąć **${name}**? Tej operacji nie można cofnąć.",
	music_apo_modal_add_title: "Dodaj konfigurację APO",
	music_apo_modal_replace_title: "Zastąp plik",
	music_apo_modal_rename_title: "Zmień nazwę konfiguracji",
	music_apo_field_name: "Nazwa",
	music_apo_field_name_desc:
		"Wyświetlana w panelu, maksymalnie ${max} znaków",
	music_apo_field_file: "Plik Equalizer APO",
	music_apo_field_file_desc:
		"Plik .txt, maksymalnie ${kb} KiB i ${lines} linii poleceń",
	music_apo_no_permission:
		"${emoji} Tylko administratorzy i właściciele serwera mogą zarządzać jego konfiguracjami APO.",
	music_apo_full:
		"${emoji} Ten serwer ma już ${max} konfiguracji. Najpierw usuń jedną.",
	music_apo_name_taken:
		"${emoji} Konfiguracja o nazwie **${name}** już istnieje.",
	music_apo_name_empty: "${emoji} Nadaj konfiguracji nazwę.",
	music_apo_not_txt: "${emoji} Wyślij plik .txt.",
	music_apo_too_big: "${emoji} Plik przekracza ${kb} KiB.",
	music_apo_too_many_lines:
		"${emoji} Plik ma więcej niż ${lines} linii poleceń.",
	music_apo_empty_file: "${emoji} Plik jest pusty.",
	music_apo_frozen:
		"${emoji} **${name}** jest zamrożona: najpierw ją odmroź.",
	music_apo_cannot_unfreeze:
		"${emoji} Odmrozić ją może tylko ${user}, właściciele serwera lub właściciele bota.",
	music_apo_saved: "${emoji} Zapisano **${name}** (etapów: ${stages}).",
	shardinfo_title: "Informacje o shardach",
	shardinfo_location:
		"Ten serwer jest na shardzie **${shardId}**. Komendę obsłużył shard **${handlerShardId}**, proces `${pid}`.",
	shardinfo_member_data:
		"Liczby członków: **${exactCount}** dokładnych, **${approximateCount}** przybliżonych, **${missingCount}** brakujących",
	shardinfo_offline_shards: "Shardy, które nie odpowiadają: ${shards}",
	shardinfo_section_unavailable: "Niedostępne serwery",
	shardinfo_section_approximate: "Serwery z przybliżoną liczbą członków",
	shardinfo_section_missing: "Serwery bez danych o członkach",
	shardinfo_card_title: "Shardy iHorizon",
	shardinfo_card_summary:
		"Wygenerowano przez shard ${shardId} · proces ${pid}",
	shardinfo_card_pill: "${onlineCount}/${shardCount} online",
	shardinfo_card_shard: "Shard ${shardId}",
	shardinfo_card_state_online: "Online",
	shardinfo_card_state_starting: "Łączenie",
	shardinfo_card_state_offline: "Offline",
	shardinfo_card_no_response: "Brak odpowiedzi",
	shardinfo_card_servers: "Serwery",
	shardinfo_card_servers_unit: "serwerów",
	shardinfo_card_servers_detail: "${unavailableCount} niedostępnych",
	shardinfo_card_members: "Członkowie",
	shardinfo_card_members_detail: "${averageCount} na serwer",
	shardinfo_card_ping: "Średni ping",
	shardinfo_card_ping_detail: "Najwyższy: ${ping}",
	shardinfo_card_shard_ping: "Ping",
	shardinfo_card_memory: "Pamięć",
	shardinfo_card_memory_detail: "${size} na shard",
	shardinfo_card_voice: "Głosowe",
	shardinfo_card_voice_detail: "${channelCount} kanałów",
	shardinfo_card_channels: "Kanały",
	shardinfo_card_uptime: "Czas działania",
	shardinfo_card_chart_servers: "Serwery na shard",
	shardinfo_card_chart_members: "Członkowie na shard",
	shardinfo_card_chart_average: "Średnia: ${value}",
	shardinfo_card_unit_day: "d",
	shardinfo_card_unit_hour: "h",
	shardinfo_card_unit_minute: "m",
	status_panel_title: "# ${emoji_Logo} Status iHorizon",
	status_panel_headline:
		"${state} **${label}** · usługi online: ${upCount}/${totalCount}",
	status_panel_label_operational: "Wszystkie systemy działają",
	status_panel_label_maintenance: "Trwają prace konserwacyjne",
	status_panel_label_degraded: "Częściowa awaria",
	status_panel_label_major: "Poważna awaria",
	status_panel_button: "Strona statusu",
	status_panel_group: "### ${emoji_Server_Stats} ${name}",
	status_panel_group_core: "Usługi podstawowe",
	status_panel_service_gateway: "HorizonGateway (API)",
	status_panel_service_lavalink: "Lavalink (muzyka)",
	status_panel_service_website: "Strona iHorizon",
	status_panel_row: "${status} **${name}** · ${detail}",
	status_panel_row_detail: "`${ping} ms` · `${uptime}`",
	status_panel_row_offline: "Offline",
	status_panel_row_maintenance: "W konserwacji",
	status_panel_row_pending: "Sprawdzanie",
	status_panel_incident: "### ${emoji_Warning_Icon} ${title}\n${content}",
	status_panel_footer:
		"-# ${emoji_Timer} Zaktualizowano ${time} · odświeża się co minutę",
	status_panel_kuma_unavailable:
		"-# ${emoji_Warn} Uptime Kuma jest nieosiągalny, pokazuję własne kontrole bota.",
	status_panel_loading: "${emoji_Discord_Loading} Wczytuję panel statusu...",
	status_panel_card_title: "Status infrastruktury",
	status_panel_card_summary: "Usługi online: ${upCount}/${totalCount}",
	status_panel_card_uptime_24h: "Dostępność 24 h",
	status_panel_card_uptime_30d: "Dostępność 30 dni",
	status_panel_card_response: "Średnia odpowiedź",
	status_panel_card_ws: "Ping Discorda",
	status_panel_card_col_history: "Ostatnie 60 kontroli",
	status_panel_card_col_ping: "Ping",
	status_panel_card_col_uptime: "30 dni",
	status_panel_card_chart: "Średni czas odpowiedzi",
	button_invite_ihorizon: "Zaproś iHorizon",
	dm_only_server_desc:
		"# Ups!\n\nUżywasz iHorizon w rozmowie prywatnej, ale ta komenda działa tylko na serwerze Discord.\n\nDodaj mnie na serwer, aby z niej skorzystać!",
	topgg_vote_button: "Zagłosuj na iHorizon",
	dm_message_from: "Wiadomość z serwera ${guild}",
	dm_message_by: "Wiadomość od ${user}",
	ticket_panel_button_saved: "Zapisano",
	economy_balance_wallet_title: "Portfel użytkownika ${user}",
	reactionroles_help_embed_title: "/reactionroles help",
	command_error_title: "**Komenda napotkała problem.**",
	command_error_report: "**Zgłoś ten problem za pomocą `/report`.**",
	guild_blacklisted_leave_desc:
		"Drogi <@${ownerId}>, przykro mi, ale zostałeś umieszczony na czarnej liście iHorizon.\nW związku z tym opuszczam Twój serwer. Jeśli masz pytania, skontaktuj się z moimi twórcami.\n\nDziękuję za zrozumienie.",
	status_field_cpu: "CPU",
	status_field_memory: "Pamięć",
	status_field_machine_uptime: "Czas działania maszyny",
	status_field_bot_uptime: "Czas działania bota",
	status_field_os: "System",
	status_field_bot_version: "Wersja bota",
	status_field_bun_version: "Wersja Bun",
	owner_guild_title: "Właściciele serwerów",
	var_discord_permission: "Uprawnienie Discorda",
	rate_nothing: "nic",
	embed_default_footer: "Stopka",
	music_history_file_title:
		"Historia muzyki serwera ${guild} (ostatnie 30 dni, od najnowszych)",
	music_history_requested_by: "na prośbę ${user}",
	music_history_live: "na żywo",
	tempvoice_region_singapore: "Singapur",
	tempvoice_region_sydney: "Australia (Sydney)",
	tempvoice_region_russia: "Rosja",
	tempvoice_region_india: "Indie",
	tempvoice_region_hongkong: "Hongkong",
	tempvoice_region_southafrica: "Republika Południowej Afryki",
	tempvoice_region_rotterdam: "Holandia (Rotterdam)",
	tempvoice_region_japan: "Japonia (Tokio)",
	tempvoice_region_southkorea: "Korea Południowa",
	tempvoice_region_useast: "USA Wschód",
	tempvoice_region_ussouth: "USA Południe",
	tempvoice_region_uswest: "USA Zachód",
	tempvoice_region_uscentral: "USA Środek",
	tempvoice_region_brazil: "Brazylia",
	logs_ban_add_title: "Członek zbanowany",
	logs_ban_remove_title: "Członek odbanowany",
	logs_kick_title: "Członek wyrzucony",
	logs_boost_add_title: "Nowy boost",
	logs_boost_remove_title: "Boost usunięty",
	logs_channel_update_title: "Kanał zaktualizowany",
	logs_message_delete_title: "Wiadomość usunięta",
	logs_message_update_title: "Wiadomość edytowana",
	logs_roles_update_title: "Role zaktualizowane",
	logs_voice_title: "Aktywność głosowa",
	logs_channel_label: "Kanał",
	logs_jump_to_message: "Przejdź do wiadomości",
	logs_message_delete_embeds:
		"Osadzenia wiadomości (${count}) są pokazane tuż poniżej.",
	schedule_reminder_title: "Przypomnienie #${scheduleCode} nadeszło!",
	invites_reset_title: "Zresetuj menedżera zaproszeń",
	economy_leaderboard_your_rank:
		"Twoje miejsce: **#${rank}** z ${count} · ${wealth}",
	economy_leaderboard_not_ranked: "Nie ma Cię jeszcze w rankingu.",
	economy_leaderboard_count: "Sklasyfikowani członkowie: ${count}",
	guildconfig_perm_level: "Poziom ${level}",
	guildconfig_antiexe_enabled:
		"🔐 **Anti-Bin** włączony: pliki wykonywalne będą usuwane.",
	guildconfig_antiexe_disabled:
		"🔓 **Anti-Bin** wyłączony: pliki wykonywalne są znowu dozwolone.",
	guildconfig_list_react_title: "Automatyczne reakcje",
	updates_button_releases: "Wydania",
	updates_button_commit: "Commit",
	warn_reason_piconly: "Automatyczna kara: kanał tylko na obrazy",
	warn_reason_antiexe: "Anti-Exe: wysłano plik wykonywalny",
	warn_reason_punishpub: "Automatyczna kara: reklama",
	warn_reason_antispam: "Automatyczna kara: spam",
	automod_block_custom_message:
		"Ta wiadomość została zablokowana przez iHorizon",
	derogation_role_name: "zarządzane przez iHorizon",
	ticket_transcript_footer: "Wyeksportowane wiadomości: {number}",
	music_playlist_fallback_name: "Playlista ${platform}",
	music_apo_node_unreachable: "serwer audio jest nieosiągalny (${message})",

	// owner list refusal
	owner_list_not_allowed:
		"Tej komendy mogą używać tylko właściciel serwera i członkowie listy właścicieli serwera.",

	// owner list & permission rules fix
	owner_list_only_discord_owner:
		"Tylko właściciel serwera (właściciel na Discordzie) może usunąć kogoś z listy właścicieli lub dodać członka tej listy do czarnej listy.",

	// warnings fix
	warn_err_owner: "${emoji_No} Nie możesz ostrzec właściciela serwera.",
	warn_sanction_kept:
		"${sanction} nie zastosowano: obecne wyciszenie członka trwa dłużej i zostaje zachowane (koniec ${until})",
	clear_allwarns_log_desc:
		"Usunięto ${count} ostrzeżeń od ${members} członków.",

	// embeds fix
	embed_replace_not_bot_message:
		"Mogę zastąpić embed tylko w wiadomości, którą sam wysłałem!",
	embed_save_uploads_dropped:
		"-# Obrazy przesłane jako plik nie są zachowywane w zapisanym embedzie: istnieją tylko w tej wiadomości. Użyj linku do obrazu, aby był widoczny wszędzie, gdzie używany jest ten ID.",

	// authrestore fix
	rc_forcejoin_nobody:
		"Wszyscy zweryfikowani członkowie są już na tym serwerze: nie ma kogo dodać. Twój klucz się nie zmienił.",
	rc_forcejoin_failed:
		"Nie udało się rozpocząć wymuszonego dołączania: HorizonGateway odmówił lub jest nieosiągalny. Nikt nie został dodany, a twój klucz się nie zmienił.",
	rc_forcejoin_stopped:
		"Wymuszone dołączanie zatrzymało się przed końcem. Policzeni wyżej członkowie zostali dodani, a twój klucz został już zastąpiony: nowy poniżej.",

	// logs fix
	logs_antispam_title_mute: "[AntiSpam] Nowe wyciszenie",
	logs_antispam_title_kick: "[AntiSpam] Nowe wyrzucenie",
	logs_antispam_title_ban: "[AntiSpam] Nowy ban",
	logs_antispam_desc_mute: "${bot} **wyciszył** ${user}",
	logs_antispam_desc_kick: "${bot} **wyrzucił** ${user}",
	logs_antispam_desc_ban: "${bot} **zbanował** ${user}",

	// backup refusal
	backup_use_not_allowed:
		"Tutaj z kopii zapasowych może korzystać tylko właściciel serwera. Może je udostępnić wszystkim administratorom przez `/backup manage`.",

	// authrestore fix
	rc_set_key_already_set:
		"Ten serwer ma już klucz AuthRestore, więc nie utworzyłem nowego: ponowne uruchomienie `/authrestore set` zastąpiłoby go, a obecny klucz przestałby działać.\nAby zacząć od nowa z nowym kluczem, najpierw uruchom `/authrestore delete` (usuwa przycisk weryfikacji; już zweryfikowani członkowie zostają), a potem ponownie `/authrestore set`.",

	// google forms
	gforms_new_response: "Nowa odpowiedź na **${form}**",
	gforms_test_mark: "Odpowiedź testowa: nie jest liczona w statystykach",
	gforms_label_member: "Członek",
	gforms_member_not_found: "${query} (nie znaleziono na serwerze)",
	gforms_label_submitted: "Wysłano",
	gforms_no_answer: "Brak odpowiedzi",
	gforms_more_answers: "Pozostałe odpowiedzi: ${count}",
	gforms_role_reason: "Odpowiedź w Google Forms (${name})",
	gforms_review_accept: "Zaakceptuj",
	gforms_review_refuse: "Odrzuć",
	gforms_review_pending: "Czeka na decyzję",
	gforms_review_accepted: "✅ Zaakceptowane przez ${user} ${time}",
	gforms_review_refused: "❌ Odrzucone przez ${user} ${time}",
	gforms_review_reason: "Powód: ${reason}",
	gforms_review_not_reviewer: "Decydować mogą tylko recenzenci tego formularza.",
	gforms_review_already: "Ta aplikacja została już rozpatrzona.",
	gforms_review_not_found: "Ta aplikacja już nie istnieje.",
	gforms_review_modal_title: "Odrzuć aplikację",
	gforms_review_modal_reason: "Powód (opcjonalny, wysyłany kandydatowi)",
	gforms_review_dm_title: "Twoja aplikacja",
	gforms_review_dm_accepted: "Twoja aplikacja **${name}** na serwerze **${guild}** została zaakceptowana.",
	gforms_review_dm_refused: "Twoja aplikacja **${name}** na serwerze **${guild}** została odrzucona.",

	// /confession panel
	confession_panel_button_default_label: "Wyznaj",
	confession_panel_title: "Panel wyznań",
	confession_panel_state_on: "Wyznania są włączone",
	confession_panel_state_off: "Wyznania są wyłączone",
	confession_panel_field_channel: "Kanał panelu",
	confession_panel_no_channel: "jeszcze nie opublikowany",
	confession_panel_field_threads: "Wątki dyskusji",
	confession_panel_value_on: "włączone",
	confession_panel_value_off: "wyłączone",
	confession_panel_field_cooldown: "Czas oczekiwania",
	confession_panel_field_embed: "Embed",
	confession_panel_embed_default: "domyślny",
	confession_panel_embed_missing:
		"Nie znaleziono `${code}`, wyświetlany jest domyślny embed",
	confession_panel_field_button: "Przycisk",
	confession_panel_channel_placeholder: "Opublikuj panel w…",
	confession_panel_action_enable: "Włącz",
	confession_panel_action_disable: "Wyłącz",
	confession_panel_action_threads_on: "Włącz wątki",
	confession_panel_action_threads_off: "Wyłącz wątki",
	confession_panel_action_cooldown: "Czas oczekiwania",
	confession_panel_action_edit_button: "Tekst i emoji",
	confession_panel_action_reset_button: "Resetuj przycisk",
	confession_panel_action_embed: "Kod embeda",
	confession_panel_style_placeholder: "Kolor przycisku",
	confession_panel_style_primary: "Niebieski",
	confession_panel_style_secondary: "Szary",
	confession_panel_style_success: "Zielony",
	confession_panel_style_danger: "Czerwony",
	confession_panel_modal_cooldown_title: "Czas między wyznaniami",
	confession_panel_modal_cooldown_label: "Czas między dwoma wyznaniami",
	confession_panel_modal_cooldown_desc: "Na przykład 30s, 10m lub 3h.",
	confession_panel_modal_button_title: "Przycisk panelu",
	confession_panel_modal_label_label: "Tekst",
	confession_panel_modal_label_desc:
		"Od 1 do 80 znaków. Puste: „${default}”.",
	confession_panel_modal_emoji_label: "Emoji",
	confession_panel_modal_emoji_desc:
		"Emoji unicode lub serwera (<:nazwa:id>). Puste: brak.",
	confession_panel_modal_embed_title: "Embed panelu",
	confession_panel_modal_embed_label: "Kod embeda",
	confession_panel_modal_embed_desc:
		"Kod zapisany przez /embed. Puste: domyślny embed.",
	confession_panel_emoji_invalid:
		"To nie jest emoji, które można dodać do przycisku.",
	confession_panel_emoji_unusable:
		"Nie mogę użyć tego emoji: musi pochodzić z tego serwera.",
	confession_panel_embed_not_found:
		"Nie znaleziono embeda o kodzie `${code}`.",
	confession_panel_cooldown_invalid:
		"Ten czas jest nieprawidłowy. Użyj np. 30s, 10m lub 3h.",
	confession_panel_channel_no_access:
		"Musisz móc widzieć ${channel} i wysyłać tam wiadomości.",
	confession_panel_send_failed:
		"Nie udało mi się opublikować panelu w ${channel}: sprawdź tam moje uprawnienia.",
	confession_panel_posted: "Panel opublikowany w ${channel}.",
	confession_panel_saved: "Zapisano.",
	confession_panel_saved_refreshed:
		"Zapisano, opublikowany panel został zaktualizowany.",
	confession_panel_saved_not_refreshed:
		"Zapisano. Nie udało się zaktualizować opublikowanego panelu: wybierz ponownie jego kanał, aby opublikować go od nowa.",
	confession_panel_expired: "Ten panel wygasł, uruchom polecenie ponownie.",

	// Music library on Discord: Love button, /music playlist
	music_love_button: "Lubię to",
	music_love_added: "❤️ **${track}** jest teraz w: ${playlist}.",
	music_love_already: "**${track}** jest już w: ${playlist}.",
	music_love_remove_button: "Usuń z: ${playlist}",
	music_love_removed: "Usunięto **${track}** z: ${playlist}.",
	music_love_limit:
		"${playlist} są pełne (maksymalnie ${max}): najpierw usuń coś w odtwarzaczu panelu.",
	music_love_unavailable: "Nie można dodać **${track}** do: ${playlist}.",
	music_playlist_title: "Twoja biblioteka muzyczna",
	music_playlist_stats: "Playlisty: ${playlists}/${max}",
	music_playlist_tracks: "Utwory: ${count}",
	music_playlist_no_playlists:
		"Brak playlist: utwórz je w odtwarzaczu panelu.",
	music_playlist_empty:
		"Twoja biblioteka jest na razie pusta. Naciśnij **${button}** w odtwarzaczu, aby zachować bieżący utwór w: ${playlist}, albo utwórz playlisty w panelu: ${url}",
	music_playlist_select: "Otwórz playlistę",
	music_playlist_play: "Odtwórz",
	music_playlist_back: "Wróć",
	music_playlist_no_tracks: "Ta lista jest pusta.",
	music_playlist_queued: "Dodano **${name}** do kolejki (utwory: ${count}).",
	music_playlist_not_found:
		"Nie znaleziono playlisty o tej nazwie: oto twoja biblioteka.",
	music_playlist_gone: "Ta playlista już nie istnieje.",

	// Boost message (/guildconfig set boost-message)
	boostmsg_panel_title: "Wiadomość o boostach",
	boostmsg_panel_desc:
		"Podziękuj członkom, którzy boostują serwer, i pożegnaj się, gdy ich boost się skończy.",
	boostmsg_side_boost: "Boost",
	boostmsg_side_unboost: "Koniec boosta",
	boostmsg_field_status: "Status:",
	boostmsg_field_channel: "Kanał:",
	boostmsg_field_dm: "Wiadomość prywatna:",
	boostmsg_field_text: "Tekst:",
	boostmsg_field_embed: "Embed:",
	boostmsg_field_message: "Wiadomość",
	boostmsg_field_variables: "Zmienne",
	boostmsg_on: "Włączone",
	boostmsg_off: "Wyłączone",
	boostmsg_none: "Brak",
	boostmsg_default_label: "tekst domyślny",
	boostmsg_text_needed_hint: "Bez embeda tekst i tak zostanie wysłany.",
	boostmsg_no_target_hint:
		"Włączone, ale nic nie zostanie wysłane: wybierz kanał lub włącz wiadomość prywatną.",
	boostmsg_variables_help:
		"{boostCount}: liczba boostów serwera · {boostTier}: poziom boosta (od 0 do 3)",
	boostmsg_button_enable: "Włącz",
	boostmsg_button_disable: "Wyłącz",
	boostmsg_button_dm_enable: "Włącz DM",
	boostmsg_button_dm_disable: "Wyłącz DM",
	boostmsg_button_text_enable: "Włącz tekst",
	boostmsg_button_text_disable: "Wyłącz tekst",
	boostmsg_button_message: "Edytuj wiadomość",
	boostmsg_button_embed: "Kod embeda",
	boostmsg_button_test: "Wyślij test",
	boostmsg_channel_placeholder: "Kanał wiadomości (puste = brak)",
	boostmsg_channel_invalid:
		"Tego kanału nie można użyć: wybierz kanał tekstowy lub ogłoszeń.",
	boostmsg_channel_no_access:
		"Musisz widzieć ${channel} i móc w nim pisać, aby go wybrać.",
	boostmsg_channel_bot_no_access:
		"Nie widzę ${channel} lub nie mogę w nim pisać: najpierw daj mi dostęp.",
	boostmsg_modal_message_title: "Wiadomość o boostach",
	boostmsg_modal_message_label: "Wiadomość (puste = tekst domyślny)",
	boostmsg_modal_embed_title: "Kod embeda",
	boostmsg_modal_embed_label: "Kod embeda (puste = brak)",
	boostmsg_embed_not_found:
		"Pod kodem `${embed_id}` nie zapisano żadnego embeda: nic nie zmieniono.",
	boostmsg_test_tag: "Test wiadomości o boostach (${side})",
	boostmsg_test_nothing:
		"Nie ma czego wysłać: wybierz kanał lub włącz wiadomość prywatną.",
	boostmsg_test_channel_ok: "Test wysłany na ${channel}.",
	boostmsg_test_channel_fail:
		"Nie udało się wysłać testu na ${channel} (brak uprawnień?).",
	boostmsg_test_dm_ok: "Test wysłany w wiadomości prywatnej.",
	boostmsg_test_dm_fail:
		"Nie udało się dostarczyć DM (zamknięte wiadomości prywatne?).",
	boostmsg_default_boost:
		"💎 Ogromne dzięki, {memberMention}, za boosta **{guildName}**! Dzięki tobie serwer ma teraz {boostCount} boostów (poziom {boostTier}).",
	boostmsg_default_unboost:
		"{memberMention} nie boostuje już **{guildName}**. Dzięki za wsparcie przez cały ten czas! 💜"
} satisfies LanguageData;
