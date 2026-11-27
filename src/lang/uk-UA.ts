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
	// uk-UA: Ukrainian
	var_member: "Учасники",
	var_user: "Користувач",
	var_author: "Автор",
	var_reason: "Причина",
	var_guild: "Сервер",
	var_sanction: "Покарання",
	var_time: "Час",
	var_message: "Повідомлення",
	var_no_set: "Не встановлено",
	var_none: "Немає",
	var_roles: "Ролі",
	var_names: "Імена",
	var_text_channel: "Текстовий канал",
	var_voice_channel: "Голосовий канал",
	var_creator: "Творець",
	var_doesnt_have_permissions:
		"Ви не можете цього зробити. Вам потрібен дозвіл {permission}.",
	var_ihorizon: "iHorizon",
	var_developer: "Розробник",
	var_chance: "Удача",
	var_other: "Інше",
	var_unknown: "Невідомо",
	var_secure: "Безпечно",
	var_unsecure: "Небезпечно",
	var_prefix: "Префікс",
	var_slash: "Слеш",
	var_discord: "Discord",
	var_network: "Мережа",
	var_latency: "Затримка",
	var_bot: "Бот",
	var_true: "Так",
	var_false: "Ні",
	var_enabled: "Увімкнено",
	var_disabled: "Вимкнено",
	var_yes: "Так",
	var_no: "Ні",
	var_colour: "Колір",
	var_length: "Довжина",
	var_good: "Добре",
	var_size: "Розмір",
	var_level: "Рівень",
	var_add: "Додати",
	var_remove: "Видалити",
	var_edit: "Змінити",
	var_confirm: "Підтвердити",
	var_succes: "Успіх",
	var_page: "Сторінка",
	var_previous: "Назад",
	var_next: "Далі",
	var_permission: "Дозвіл",
	var_usage: "Використання",
	var_aliases: "Псевдоніми",
	var_dont_have_perm:
		"Ви не можете цього зробити, вам бракує дозволу {perm}!",
	var_price: "Ціна",
	var_boost: "Буст",
	var_uses: "Використання",
	var_vc_stats: "Статистика",
	var_1d: "1 день",
	var_7d: "7 днів",
	var_14d: "14 днів",
	var_year: "рік(и)",
	var_mo: "місяць(і)",
	var_w: "тиждень(і)",
	var_d: "день(дні)",
	var_h: "година(и)",
	var_m: "хвилина(и)",
	var_s: "секунда(и)",
	var_ms: "мілісекунда(и)",
	var_banned_user: "Забанені користувачі",
	var_no_one_banned: "На цьому сервері ніхто не забанений.",
	var_category: "Категорія",
	var_total: "Усього",
	var_online_members: "Учасники онлайн",
	var_boost_level: "Рівень бусту",
	var_features: "Можливості",
	var_guild_icon: "Іконка сервера",
	var_guild_banner: "Банер сервера",
	var_guild_splash: "Фон запрошення сервера",
	var_unknown_guild_name: "Невідома назва сервера",
	var_preview: "Попередній перегляд",
	var_form: "Форма",
	var_original_message: "Оригінальне повідомлення",
	var_click_here: "Натисніть тут",
	var_s_message: "Повідомлення {nickname}",
	var_source: "Музика з: ",
	var_online_call: "У голосовому",
	var_online: "Онлайн",
	var_stream: "Стрим",
	var_boosts: "Бусти",
	var_muted: "Без звуку",
	var_camera: "Камера увімкнена",
	perm_createinstantinvite_name: "Створювати запрошення",
	perm_kickmembers_name: "Виганяти учасників",
	perm_banmembers_name: "Банити учасників",
	perm_administrator_name: "Адміністратор",
	perm_managechannels_name: "Керувати каналами",
	perm_manageguild_name: "Керувати сервером",
	perm_addreactions_name: "Додавати реакції",
	perm_viewauditlog_name: "Переглядати журнал аудиту",
	perm_priorityspeaker_name: "Пріоритетний мовець",
	perm_stream_name: "Відео",
	perm_viewchannel_name: "Переглядати канал",
	perm_sendmessages_name: "Надсилати повідомлення",
	perm_sendttsmessages_name: "Надсилати TTS-повідомлення",
	perm_managemessages_name: "Керувати повідомленнями",
	perm_embedlinks_name: "Вбудовувати посилання",
	perm_attachfiles_name: "Прикріплювати файли",
	perm_readmessagehistory_name: "Читати історію повідомлень",
	perm_mentioneveryone_name: "Згадувати всіх",
	perm_useexternalemojis_name: "Використовувати зовнішні емодзі",
	perm_viewguildinsights_name: "Переглядати аналітику сервера",
	perm_connect_name: "Під'єднуватися",
	perm_speak_name: "Говорити",
	perm_mutemembers_name: "Вимикати мікрофон учасникам",
	perm_deafenmembers_name: "Вимикати звук учасникам",
	perm_movemembers_name: "Переміщувати учасників",
	perm_usevad_name: "Використовувати активацію голосом",
	perm_changenickname_name: "Змінювати нікнейм",
	perm_managenicknames_name: "Керувати нікнеймами",
	perm_manageroles_name: "Керувати ролями",
	perm_managewebhooks_name: "Керувати вебхуками",
	perm_manageemojisandstickers_name: "Керувати емодзі та наліпками",
	perm_manageguildexpressions_name: "Керувати виразами сервера",
	perm_useapplicationcommands_name: "Використовувати команди застосунків",
	perm_requesttospeak_name: "Просити слова",
	perm_manageevents_name: "Керувати подіями",
	perm_managethreads_name: "Керувати гілками",
	perm_createpublicthreads_name: "Створювати публічні гілки",
	perm_createprivatethreads_name: "Створювати приватні гілки",
	perm_useexternalstickers_name: "Використовувати зовнішні наліпки",
	perm_sendmessagesinthreads_name: "Надсилати повідомлення в гілках",
	perm_useembeddedactivities_name: "Використовувати активності",
	perm_moderatemembers_name: "Модерувати учасників",
	perm_viewcreatormonetizationanalytics_name:
		"Переглядати аналітику монетизації автора",
	perm_usesoundboard_name: "Використовувати звукову панель",
	perm_createguildexpressions_name: "Створювати вирази сервера",
	perm_createevents_name: "Створювати події",
	perm_useexternalsounds_name: "Використовувати зовнішні звуки",
	perm_sendvoicemessages_name: "Надсилати голосові повідомлення",
	perm_sendpolls_name: "Надсилати опитування",
	perm_useexternalapps_name: "Використовувати зовнішні застосунки",
	ticket_disabled_command:
		"Ви не можете використовувати цю команду, оскільки адміністратор вимкнув команди для тікетів!",
	add_disabled_command:
		"Ви не можете використовувати цю команду, оскільки адміністратор вимкнув команди для тікетів!",
	add_command_work: "Успішно додано ${memberTag} до вашого тікетів!",
	add_command_error: "Сталася помилка, будь ласка, спробуйте ще раз.",
	close_disabled_command:
		"Ви не можете використовувати цю команду, оскільки адміністратор вимкнув команди для тікетів!",
	close_title_sourcebin: "Транскрипт тікетів від iHorizon",
	close_description_sourcebin: " ",
	close_error_command: "Сталася помилка, будь ласка, спробуйте ще раз.",
	close_command_work_channel:
		"Ви закрили свій тікет. iHorizon надіслав вам транскрипт.",
	close_command_work_notify_channel: "Тікет було успішно закрито!",
	close_command_error: "Сталася помилка, будь ласка, спробуйте ще раз.",
	close_not_in_ticket:
		"Ви не можете використовувати цю команду поза каналом для тікетів!",
	delete_disabled_command:
		"Ви не можете використовувати цю команду, оскільки адміністратор вимкнув команди для тікетів!",
	delete_not_in_ticket:
		"Ви не можете використовувати цю команду поза каналом для тікетів!",
	ticket_deleted:
		"Тікет ${ticketOwnerMention} видалив <@${deletedByUserId}>. Ось транскрипт:",
	sethereticket_panel_select_embed_desc:
		"# Назва панелі\n```${panelName}```\n{msg}\n\n## Категорія\n```{category}```\n",
	open_disabled_command:
		"Ви не можете використовувати цю команду, оскільки адміністратор вимкнув команди для тікетів!",
	open_command_work: "Знову відкрито ${channel}",
	open_command_error: "Сталася помилка, будь ласка, спробуйте ще раз!",
	open_not_in_ticket:
		"Ви не можете використовувати цю команду поза каналом для тікетів!",
	remove_disabled_command:
		"Ви не можете використовувати цю команду, оскільки адміністратор вимкнув команди для тікетів!",
	remove_not_in_ticket:
		"Ви не можете використовувати цю команду поза каналом для тікетів!",
	remove_command_error: "Сталася помилка, будь ласка, спробуйте ще раз.",
	remove_command_work: "Успішно видалено ${memberTag} з вашого тікету!",
	transript_disabled_command:
		"Ви не можете використовувати цю команду, оскільки адміністратор вимкнув команди для тікетів!",
	transript_name_sourcebin: " ",
	transript_title_sourcebin: "Транскрипт чату тікета для ${channelName}",
	transript_command_error: "Сталася помилка, будь ласка, спробуйте ще раз!",
	transript_command_work:
		"Ви закрили свій тікет. iHorizon надіслав вам транскрипт.",
	transript_not_in_ticket:
		"Ви не можете використовувати цю команду поза каналом для тікетів!",
	disableticket_not_admin:
		":x: | Ви повинні бути адміністратором цього сервера, щоб використовувати цю команду!",
	disableticket_logs_embed_title_disable: "Логи вимкнення тікетів",
	disableticket_logs_embed_description_disable:
		"<@${authorId}> вимкнув(-ла) команди тікетів!",
	disableticket_command_work_disable:
		"Ви успішно вимкнули команди для тікетів!",
	disableticket_logs_embed_title_enable: "Логи увімкнення тікетів",
	disableticket_logs_embed_description_enable:
		"<@${authorId}> увімкнув(-ла) команди тікетів!",
	disableticket_command_work_enable:
		"Ви успішно увімкнули команди для тікетів!",
	setticketcategory_not_admin:
		":x: | Ви повинні бути адміністратором цього сервера, щоб використовувати цю команду!",
	setticketcategory_disabled_command:
		"Ви не можете використовувати цю команду, оскільки адміністратор вимкнув команди для тікетів!",
	setticketcategory_not_a_category:
		"Вказаний канал не є категорією, будь ласка, спробуйте ще раз.",
	setticketcategory_command_work:
		"<@${authorId}>, ви встановили категорію для каналу тікетів на `${categoryName}`!",
	ticket_logchannel_embed_title: "Канал логів тікетів",
	ticket_logchannel_embed_desc:
		"${author}, ви встановили канал логів модуля тікетів на ${channel}!",
	ticket_panel_default_placeholder: "Оберіть категорію, щоб відкрити тікет",
	ticket_panel_embed_title: "Панель тікетів #",
	ticket_panel_embed_desc: "Налаштуйте ембед тікета з певними параметрами.",
	ticket_panel_saved_conf: "💾 Збережена конфігурація",
	ticket_panel_related_embed: "🕸️ Пов'язаний ембед",
	ticket_panel_role_to_ping: "📌 Роль для згадки",
	ticket_panel_ping_user: "📎 Згадувати користувача",
	ticket_panel_placeholder: "🏷️ Підказка",
	ticket_panel_category: "📤 Категорія",
	ticket_panel_option_fields: "📔 Поля варіантів",
	ticket_panel_form: "📝 Форма",
	ticket_panel_panel_placeholder: "Оберіть дії",
	ticket_panel_panel_1_label: "Зберегти поточну конфігурацію",
	ticket_panel_panel_2_label: "Показати попередній перегляд",
	ticket_panel_panel_3_label: "Змінити пов'язаний ембед",
	ticket_panel_panel_4_label: "Додати/прибрати роль для згадки",
	ticket_panel_panel_5_label: "Змінити підказку",
	ticket_panel_panel_6_label: "Змінити категорію",
	ticket_panel_panel_7_label: "Змінити згадуваного користувача",
	ticket_panel_panel_8_label: "Додати/прибрати поля варіантів",
	ticket_panel_panel_9_label: "Змінити форму",
	ticket_panel_button_send: "Надіслати ембед",
	ticket_panel_change_category_channelSelect_placeholder: "Оберіть категорію",
	ticket_panel_select_channel_to_send: "Оберіть канал, куди надіслати ембед",
	ticket_panel_change_placeholder_modal_title: "Змінити підказку",
	ticket_panel_change_placeholder_modal_placeholder: "Нова підказка",
	ticket_panel_need_save_config:
		"Перш ніж надіслати ембед, збережіть поточну конфігурацію.",
	ticket_panel_need_1_option:
		"Щоб надіслати ембед, потрібен принаймні один варіант.",
	ticket_panel_related_embed_dont_exist: "Пов'язаний ембед не існує",
	ticket_panel_channel_error:
		"Канал не існує або я не маю дозволу надсилати в нього повідомлення.",
	ticket_panel_embed_been_send: "Ембед надіслано в канал.",
	ticket_panel_successfully_saved: "Конфігурацію успішно збережено",
	ticket_panel_change_role_roleSelect_placeholder: "Оберіть роль",
	ticket_panel_change_role_interaction_content:
		"Оберіть роль, яку буде згадано під час відкриття тікета.",
	ticket_panel_change_embed_modal_title: "Змінити пов'язаний ембед",
	ticket_panel_change_embed_modal_placeholder: "ID ембеда",
	ticket_panel_change_embed_dont_exist: "Ембед не існує",
	ticket_panel_change_option_select_placeholder: "Оберіть дію",
	ticket_panel_change_option_select_1_label: "Додати нове поле варіанта",
	ticket_panel_change_option_select_2_label: "Прибрати поле варіанта",
	ticket_panel_change_option_interaction_content:
		"Оберіть дію, щоб додати або прибрати поля варіантів",
	ticket_panel_add_option_max_10: "Не можна додати більше 10 полів варіантів",
	ticket_panel_add_option_modal_title: "Додати поле варіанта",
	ticket_panel_add_option_modal_field1_label: "Назва",
	ticket_panel_add_option_modal_field2_label: "Опис",
	ticket_panel_add_option_modal_field3_label: "Емодзі",
	ticket_panel_remove_option_empty:
		"Немає полів варіантів, які можна прибрати",
	ticket_panel_remove_option_select_placeholder:
		"Оберіть варіант, який прибрати",
	ticket_panel_rempve_option_interaction_content:
		"Оберіть варіант, який прибрати",
	ticket_panel_change_form_select_placeholder_1: "Додати поле форми",
	ticket_panel_change_form_select_placeholder_2: "Прибрати поле форми",
	ticket_panel_change_form_interaction_content:
		"Оберіть дію, щоб додати або прибрати поля форми",
	ticket_panel_add_form_max_3: "Не можна додати більше 3 полів форми",
	ticket_panel_add_form_modal_title: "Додати поле форми",
	ticket_panel_add_form_modal_field1_label: "Текст запитання",
	ticket_panel_add_form_modal_field2_label: "Підказка до запитання",
	ticket_panel_preview_message: "Попередній перегляд панелі тікетів",
	ticket_panel_option_change_category:
		"Оберіть варіант, щоб змінити категорію",
	ticket_panel_panel_10_label: "Змінити категорію для окремого варіанта",
	ticket_panel_channel_panel_embed_id: "ID ембеда каналу тікета",
	ticket_panel_panel_11_label: "Змінити ембед каналу тікета",
	ticket_panel_select_user: "Меню для додавання учасників до тікета",
	ticket_panel_button_delete: "Кнопка видалення тікета",
	ticket_panel_button_transcript: "Кнопка створення транскрипту",
	ticket_panel_panel_12_label:
		"Показувати меню додавання/видалення учасників тікета",
	ticket_panel_panel_13_label: "Показувати кнопку видалення тікета",
	ticket_panel_panel_14_label: "Показувати кнопку транскрипту",
	ticket_panel_tip_about_variable1:
		"${emoji_VC_OpenChat} **А ви знали?** Створюючи ембед через `/utils embed`, ви можете додати змінну **`{category}`**, яку буде замінено на категорію, обрану користувачем.",
	ticket_panel_no_question_to_delete: "Немає запитань для видалення.",
	ticket_panel_chose_a_question: "Оберіть запитання",
	ticket_panel_select_question_to_delete: "Оберіть запитання, яке видалити.",
	ticket_panel_panel_15_label: "Налаштувати ембед для кожного варіанта",
	ticket_panel_panel_16_label: "Налаштувати форму для кожного варіанта",
	ticket_panel_panel_17_label:
		"Налаштувати ролі для згадки для кожного варіанта",
	ticket_panel_mode: "⚙️ Режим",
	ticket_panel_mode_simple: "Простий",
	ticket_panel_mode_advanced: "Розширений",
	ticket_panel_mode_simple_desc:
		"Одна кнопка відкриває тікет, без вибору й запитань.",
	ticket_panel_mode_advanced_desc:
		"Меню з варіантами, налаштуваннями для кожного варіанта та формами.",
	ticket_panel_panel_18_label: "Змінити режим (простий / розширений)",
	ticket_panel_simple_default_title: "Підтримка",
	ticket_panel_simple_default_desc:
		"Потрібна допомога? Натисніть кнопку нижче, щоб відкрити тікет.",
	ticket_panel_manage_form_title:
		"Керування формою для варіанта: **${optionName}**",
	ticket_panel_change_embed_options:
		"Оберіть варіант, щоб змінити ID ембеда панелі каналу.",
	ticket_panel_change_embed_options_null:
		"Немає варіантів, для яких можна змінити ID ембеда панелі каналу.",
	ticket_panel_change_embed_options_chose:
		"Оберіть категорію, щоб змінити ID панелі каналу.",
	ticket_panel_add_a_question: "Додати запитання",
	ticket_panel_remove_a_question: "Видалити запитання",
	ticket_panel_option_invalid: "❌ Недійсний варіант.",
	ticket_panel_chose_option_to_form:
		"Оберіть варіант, щоб налаштувати його форму.",
	var_chose_option: "Оберіть варіант",
	ticket_panel_saved_and_sended_panel:
		"Панель тікетів #${panelCode} успішно надіслано в ${channel}. Збережіть цей код, якщо захочете змінити панель.",
	var_title: "Заголовок",
	var_action: "Дія",
	ticket_rename_ok: "Канал тікета перейменовано!",
	ticket_rename_error: "Помилка під час перейменування текстового каналу",
	ticket_unlink_command_ok:
		"${emoji_Yes} | **Канал більше не пов'язаний із модулем тікетів.**",
	ticket_unlink_panel_edited_content:
		"Цей канал був старим тікетом. Користувач {user} від'єднав цей канал.",
	ticket_remind_embed_title: "Ой! Нагадування про тікет",
	ticket_remind_embed_desc:
		"Ви не дуже активні, нічого страшного, але ваш тікет досі опрацьовується! Поверніться й дайте відповідь!",
	ticket_remind_embed_fields_1_name: "Остання відповідь",
	ticket_remind_command_ok: "Я надіслав користувачеві нагадування.",
	var_never: "Ніколи",
	disablexp_not_admin:
		":x: | Ви повинні бути адміністратором цього сервера, щоб використовувати цю команду!",
	disablexp_logs_embed_title_disable: "Логи xp вимкнення",
	disablexp_logs_embed_description_disable: "<@${authorId}> вимкнув xp!",
	disablexp_command_work_disable:
		"Ви успішно вимкнули повідомлення про підвищення рівня (xp)!",
	disablexp_logs_embed_title_enable: "Логи xp увімкнені",
	disablexp_logs_embed_description_enable: "<@${authorId}> увімкнув xp!",
	disablexp_command_work_enable:
		"Ви успішно ввімкнули повідомлення про підвищення рівня (xp)!",
	disablexp_command_work_disable_entierly:
		"Ви успішно відключили модуль рангів! (Більше повідомлень і користувачі не отримують рівні)",
	setxpchannels_not_admin:
		":x: | Ви повинні бути адміністратором цього сервера, щоб використовувати цю команду!",
	setxpchannels_logs_embed_title_disable: "Логи вимкнення каналів досвіду",
	setxpchannels_logs_embed_description_disable:
		"<@${authorId}> вимкнув користувацькі канали досвіду. Я встановив налаштування за замовчуванням...",
	setxpchannels_already_disabled_disable:
		"Користувацькі канали досвіду вже вимкнені!",
	setxpchannels_command_work_disable:
		"Ви успішно вимкнули користувацький канал досвіду!",
	setxpchannels_command_error_disable:
		"Помилка: недостатньо прав або канал не існує",
	setxpchannels_logs_embed_title_enable: "Логи увімкнення каналів досвіду",
	setxpchannels_logs_embed_description_enable:
		"<@${authorId}> встановив користувацькі канали досвіду на: <#${argsid}>",
	setxpchannels_valid_channel_message:
		"Ви повинні вказати дійсний канал для ваших налаштувань.",
	setxpchannels_already_with_this_config:
		"Користувацькі канали досвіду вже налаштовані з цим ідентифікатором каналу!",
	setxpchannels_confirmation_message:
		"**Користувацький канал досвіду встановлено тут!**",
	setxpchannels_command_work_enable:
		"Ви успішно встановили користувацький канал досвіду на <#${argsid}>!",
	setxpchannels_command_error_enable:
		"Помилка: недостатньо прав або канал не існує",
	level_embed_title: "__**Рівень - XP**__: `${userUsername}`",
	level_embed_fields1_name: ":arrow_up:・__Рівень:__",
	level_embed_fields1_value: "`${currentxp}/${xpNeeded}`",
	level_embed_fields2_name: ":money_with_wings:・__XP:__",
	level_embed_fields2_value: "`${level}`",
	level_embed_description:
		"**Для підвищення рівня потрібно потрібно xp!** `${expNeededForLevelUp}`",
	level_xp_needed_for_new_level: "XP до наступного рівня:",
	level_xp_total: "Усього XP:",
	ranks_leaderboard_top_txt: "Топ #${i}",
	ranks_leaderboard_top_txt_raw: "Топ #${i} ${rawText}\n",
	ranks_leaderboard_txt_text:
		"👤 ${user} `(${userGlobalName})`\n⭐ ➥ **Рівень**: `${level}`\n🔱 ➥ **Загальний XP**: `${xpTotal}`",
	ranks_leaderboard_embed_title: "🏆 Легендарна таблиця лідерів сервера",
	ranks_leaderboard_embed_footer:
		"Сторінка ${cPage} з ${totalPages} • За загальним XP",
	ranks_ignorechannels_embed_title: "Налаштування модуля рангів",
	ranks_ignorechannels_embed_desc:
		"Нові повідомлення в цих каналах модуль рангів ігнорує.",
	ranksSetMessage_not_admin:
		":x: | Щоб використати цю команду, ви маєте бути адміністратором сервера!",
	ranksSetMessage_help_embed_title: "Довідка /ranks set-message!",
	ranksSetMessage_help_embed_description: "/ranks set-message",
	ranksSetMessage_help_embed_fields_name: "Як користуватися?",
	ranksSetMessage_logs_embed_title_on_enable: "Логи RanksSetMessage",
	ranksSetMessage_logs_embed_description_on_enable:
		"<@${authorId}> встановив повідомлення рангів!",
	ranksSetMessage_command_work_on_enable:
		"${emoji_GreenTick} | Повідомлення рангів успішно встановлено.",
	ranksSetMessage_logs_embed_title_on_disable: "Логи RanksSetMessage",
	ranksSetMessage_logs_embed_description_on_disable:
		"<@${authorId}> видалив повідомлення рангів!",
	ranksSetMessage_command_work_on_disable:
		"${emoji_Yes} | Власне повідомлення рангів успішно видалено.",
	ranksSetMessage_command_work_ls: "Повідомлення рангів:",
	ranksSetMessage_help_embed_fields_custom_name: "Власне повідомлення",
	ranksSetMessage_help_embed_fields_custom_name_empy: "Не встановлено!",
	ranksSetMessage_help_embed_fields_default_name_empy:
		"Стандартне повідомлення",
	ranksSetMessage_help_embed_desc:
		"{memberUsername} => Ім'я користувача учасника\n{memberMention} => Згадка учасника\n{memberCount} => Кількість учасників сервера\n{guildName} => Назва сервера\n{createdAt} => Дата створення акаунта у форматі dd/mm/yyyy\n{xpLevel} => Рівень XP користувача\n{accountCreationTimestamp} => Мітка часу створення акаунта",
	ranksSetMessage_button_set_name: "Встановити повідомлення",
	ranksSetMessage_buttom_del_name: "Стандартне повідомлення",
	ranksSetMessage_awaiting_response:
		"Напишіть нове власне повідомлення рангів.",
	ranksSetMessage_embed_fields_xpmessage: "Повідомлення рангів",
	reset_uranks_are_you_sure:
		"**Ви справді хочете видалити всі дані рангів?\nЦя дія остаточна, її неможливо скасувати.**\n**Ця дія руйнівна!!**",
	reset_uranks_logs_embed_title: "Логи модуля рангів (НЕБЕЗПЕЧНА ДІЯ)",
	reset_uranks_logs_embed_desc:
		"${author} видалив усі дані модуля рангів для ${user}!",
	ranks_config_embed_title: "🏆 Налаштування ролей рангів",
	ranks_config_embed_desc:
		"Налаштуйте нагороди-ролі за XP на вашому сервері!",
	ranks_config_autofields_name: "🌟 Рівень ${level}",
	ranks_config_autofields_value:
		"Роль: <@&${roleId}>\n🔓 Відкривається на рівні ${level}",
	ranks_config_nofields_name: "🚫 Ролі не налаштовано",
	ranks_config_nofields_value:
		"Налаштуйте ролі рангів, щоб нагороджувати активних учасників!",
	ranks_config_help_footer:
		"Сторінка ${currentPage} з ${totalPage} • Усього рангів: ${totalRanks}",
	ranks_config_btn_add_name: "Додати роль",
	ranks_config_btn_remove_name: "Видалити роль",
	ranks_config_add_max_roles:
		"Ви досягли максимальної кількості ролей рангів (25).",
	ranks_config_add_role_menu_placeholder: "Оберіть роль",
	ranks_config_awaiting1_response:
		"Оберіть роль, яку хочете призначити певному рівню.",
	ranks_config_add_modal_title: "Рівень для ролі",
	ranks_config_add_modal_fields1_placeholder: "Потрібний рівень",
	ranks_config_add_invalid_level: "Недійсний рівень! Введіть додатне число.",
	ranks_config_add_invalid_role:
		"Роль {role} уже додано. Роль можна призначити лише одному рівню.",
	ranks_config_add_command_work:
		"Роль ${selectedRole} додано для рівня ${level}!",
	ranks_config_add_command_warn:
		"# WARN ⚠️ Увага: роль ${selectedRole} має такі чутливі дозволи:\n\n${_}",
	ranks_config_remove_no_rank:
		"Немає налаштованих ролей рангів, які можна видалити.",
	ranks_config_var_level: "Рівень {level}",
	ranks_config_remove_string_menu_desc: "Видалити роль на рівні ${level}",
	ranks_config_remove_string_menu1_placeholder: "Оберіть роль для видалення",
	ranks_config_remove_awaiting_response: "Оберіть роль, яку хочете видалити.",
	ranks_config_remove_command_work:
		"Роль для рівня ${levelToRemove} видалено!",
	owner_not_owner:
		"Ви не є власником проекту iHorizon. Ви не можете використовувати цю команду.",
	owner_already_owner: "Цей користувач уже власник!",
	owner_is_now_owner: "${memberUsername} тепер власник проекту iHorizon",
	unowner_not_owner:
		"Ви не є власником проекту iHorizon. Ви не можете використовувати цю команду.",
	unowner_cant_unowner_creator:
		"ННеможливо видалити цього користувача, оскільки він є творцем проекту iHorizon.",
	unowner_command_work: "${memberUsername} більше не є власником",
	blacklist_not_owner:
		"Ви не є власником проекту iHorizon. Ви не можете використовувати цю команду.",
	blacklist_bot_lol: "Не можу внести себе в чорний список x)",
	blacklist_cant_blacklist_owner:
		"Лише розробники iHorizon можуть додати власника бота до чорного списку.",
	blacklist_command_work: "${memberUsername} тепер у чорному списку",
	blacklist_blacklisted_but_can_ban_him:
		"${emoji_No} Тепер у чорному списку, не можна заблокувати цього учасника тут, відсутні дозволи?",
	blacklist_already_blacklisted: "${memberUsername} уже у чорному списку!",
	blacklist_no_one_blacklist:
		"${emoji_No} Нікого не знайдено в чорному списку!",
	blacklist_var_no_reason: "Причину не знайдено",
	blacklist_embed_title: "Чорний список - Сторінка ${page}",
	blacklist_command_work_shard:
		"✅ ${username} забанено на **${totalSuccess}** сервері(ах) на всіх шардах (`{score}`)",
	unblacklist_not_owner:
		"Ви не є власником проекту iHorizon. Ви не можете використовувати цю команду.",
	unblacklist_command_work: "<@${memberId}> більше не у чорному списку",
	unblacklist_not_blacklisted: "<@${memberId}> не був у чорному списку",
	unblacklist_unblacklisted_but_can_unban_him:
		"${emoji_No} Тепер не в чорному списку, не можна розблокувати цього учасника тут, відсутні дозволи або його вже розблоковано?",
	unblacklist_user_is_not_exist: "Я не можу знайти цього користувача",
	unblacklist_command_work_across_all_shard:
		"✅ ${bannedMemberUsername} тепер розбанено на **${totalSuccess}** сервері(ах) на всіх шардах (`${score}`)",
	addinvites_confirmation_embed_description:
		"Додано ${amount} запрошень для ${user}",
	addinvites_logs_embed_title: "Логи менеджера запрошень",
	addinvites_logs_embed_description:
		"<@${authorId}> Додав ${amount} запрошень для <@${userId}>!",
	removeinvites_not_admin_embed_description:
		"Вам потрібні права адміністратора для використання цієї команди!",
	removeinvites_confirmation_embed_description:
		"Видалено ${amount} запрошень для ${user}",
	removeinvites_logs_embed_title: "Логи менеджера запрошень",
	removeinvites_logs_embed_description:
		"<@${authorId}> Видалив ${amount} запрошень для <@${userId}>!",
	resetallinvites_warning_msg:
		"**Ви справді хочете видалити всі дані Invite Manager?\nЦя дія остаточна, її неможливо відкотити.**\n**Ця дія руйнівна!!**",
	resetallinvites_yes_button: "Видалити все",
	resetallinvites_no_button: "Скасувати дію",
	resetallinvites_succes_on_delete: "Успішно видалено!",
	resetallinvites_logs_embed_title: "Логи Invite Manager (НЕБЕЗПЕЧНА ДІЯ)",
	resetallinvites_logs_embed_desc:
		"${author} видалив усі дані Invites Manager!",
	links_message: "Натисніть на посилання нижче про мене!",
	links_website: "Мій веб-сайт",
	links_gitlab: "Мій GitLab",
	botinfo_embed_fields_myname: "Моє ім'я:",
	botinfo_embed_fields_mychannels: "Мої канали:",
	botinfo_embed_fields_myservers: "Мої сервери:",
	botinfo_embed_fields_members: "Учасники:",
	botinfo_embed_fields_libraires: "Бібліотеки:",
	botinfo_embed_fields_created_at: "Створений:",
	botinfo_embed_fields_created_by: "Створено:",
	invite_embed_title: "Дякую за довіру iHorizon!",
	invite_embed_description:
		"Я вас люблю, покажіть мені свою любов до мене! Запросіть мене!",
	kisakay_message:
		"${emoji_Sparkles} Kisakay - і мій творець і розробник. Завдяки їй та її клавіатурі я з'явився в цьому світі. Я глибоко вдячний їй!✨ ❤️❤️",
	andru_message:
		"Andru — співавтор і розробник. «Майстер на всі руки», він займається маркетингом, спільнотою...",
	ether_message:
		"${emoji_Sparkles} Ether був контриб'ютором і членом команди проєкту iHorizon. Він створив документацію iHorizon та iHorizon Installation Script, а також керував перекладами бота, щоб зробити їх (майже) досконалими! Він пішов <t:1785567600:f>.",
	irisweb_message:
		"😼IrisWeb - мій другий розробник/співавтор , IrisWeb и Kisakay ❤️",
	pong_message: "【:ballot_box_with_check:】__**Понг**__ : ",
	status_be_bot_dev:
		":x: | **Ви маєте бути розробником бота, щоб виконати це!**",
	help_tip_embed:
		"```${botName} ・ Меню допомоги```\n${emoji_Pin} ・ **${categorieCount}** доступні категорії команд\n${emoji_Slash_Bot_Badge} ・ **${slashCount}** доступні слеш-команди\n${emoji_Crown} ・ **Створено** <@${owner1}>, <@${owner2}>\n\n```Чи знаєте ви? ・ Підказки```\n${emoji_VC_Region} ・ ${botName} **100% багатомовний**\n${emoji_Slash_Bot_Badge} ・ `/setlang language:Japanese`",
	help_mod_fields: "Модерація",
	help_ranks_fields: "Ранги",
	help_fun_fields: "Розваги",
	help_utils_fields: "Утиліти",
	help_giveaway_fields: "Розіграші",
	help_bot_fields: "Бот",
	help_music_fields: "Музика",
	help_backup_fields: "Резервне копіювання",
	help_guildconf_fields: "Налаштування сервера",
	help_prof_fields: "Налаштування профілю",
	help_economy_fields: "Економіка",
	help_owner_fields: "Власникові",
	help_roler_fields: "Реакції на ролі",
	help_invitem_fields: "Менджер запрошень",
	help_ticket_fields: "Тікети",
	help_memberc_fields: "Лічильник учасників",
	help_newftrs_fields: "Нові функції",
	help_mod_dsc:
		"Модеруйте свій сервер Discord без стресу за допомогою команд iHorizon.",
	help_ranks_dsc:
		"Розважайтеся, відстежуючи ваш рівень досвіду, щоб дізнатися, хто найактивніший на сервері!",
	help_fun_dsc:
		"Вважаєте Discord нудним? Добре, ця категорія створена саме для вас! iHorizon поверне посмішку на ваше обличчя!",
	help_utils_dsc:
		"Потрібні специфічні команди, корисні у певних випадках? Добре! Ось вони!",
	help_giveaway_dsc:
		"Щедрі настрої? Хочете подарувати щось своєму спільноті? Ось мої команди, щоб допомогти вам!",
	help_bot_dsc:
		"Вас цікавить і ви хочете дізнатися більше про мене? Ці команди тут для цього!",
	help_music_dsc: "Ви любите музику? Ось подарунок для вас :)",
	help_backup_dsc: "Потрібна швидка резервна копія вашого сервера? Ось я :3",
	help_guildconf_dsc: "Шукаєте розширену та просту настройку? Ось я :3",
	help_prof_dsc:
		"Ви слідкуєте за своїм зовнішнім виглядом? Ось деякі команди, щоб забезпечити чудовий профіль серед користувачів :)",
	help_economy_dsc:
		"Ви слідкуєте за своїм гаманцем? Або просто хочете щось придбати? Я тут :)",
	help_owner_dsc:
		"Ця категорія зарезервована для власників та адміністраторів проекту iHorizon!",
	help_roler_dsc:
		"Хочете налаштувати реакції на ролі для свого сервера? Ось я!",
	help_invitem_dsc: "Хочете перевірити запрошення учасника? Це тут!",
	help_ticket_dsc:
		"Хотіли б ви створити тікет або використовувати одну з моїх функцій всередині нього? Звичайно!",
	help_memberc_dsc:
		"Хочете налаштувати голосові канали для підрахунку учасників? Звичайно :smile:",
	help_newftrs_dsc: "Ось деякі нові та дуже цікаві функції!",
	help_not_for_you: "Ця взаємодія не для вас",
	help_protection_fields: "Захист",
	help_protection_dsc:
		"Уникайте виконання деяких дій не в білому списку для захисту сервера.",
	help_suggestion_fields: "Пропозиції",
	help_suggestion_dsc:
		"Надайте вашим користувачам можливість висловлюватися, дайте їм можливість пропонувати ідеї в окремому каналі!",
	help_security_fields: "Безпека",
	help_security_dsc:
		"Проводьте тести CAPTCHA для нових учасників, щоб забезпечити безпечний доступ до вашого сервера.",
	help_schedule_fields: "Планування",
	help_schedule_dsc:
		"Створюйте нагадування заздалегідь заданими повідомленнями, які бот буде відправляти вам у приватному повідомленні",
	help_pfps_fields: "PFPS",
	help_pfps_dsc: "Відправлення випадкового аватара користувача у канал!",
	help_voicedashboard_fields: "Голосова панель",
	help_voicedashboard_dsc:
		"Створіть користувацький тимчасовий голосовий канал з інтерфейсом!",
	help_select_menu: "Зробіть вибір!",
	help_select_menu_fields_desc: "${commandCount} Команди",
	help_back_to_menu: "Основне меню",
	help_back_to_menu_desc: "Повернутися в основне меню",
	help_confession_dsc:
		"Хочете зробити сповідь? Дуже добре, яка б вона не була відразливою, iHorizon тут для вас!",
	help_confession_fields: "Сповідь",
	help_antispam_dsc:
		"Набрид спам? Відмінно! iHorizon тут, щоб модерувати спам!",
	help_antispam_fields: "Антиспам",
	help_stats_fields: "Статистика користувачів",
	help_stats_dsc:
		"> *Переглядайте кількість повідомлень і голосову активність користувача на сервері*",
	help_notifier_dsc:
		"> *Отримуйте сповіщення, коли ютубер або стример публікує відео!*",
	help_notifier_fields: "Сповіщення",
	help_authrestore_fields: "AuthRestore",
	help_authrestore_dsc:
		"> *Перевіряйте учасників сервера через OAuth2. Якщо на сервер нападуть рейдом або його видалять, ви зможете повернути старих учасників!*",
	help_tags_fields: "Власні теги",
	help_tags_dsc:
		"> *Створюйте повідомлення-теги для свого сервера й використовуйте їх на ньому!*",
	help_starboard_dsc:
		"> *Переглядайте повідомлення з найбільшою кількістю зірок на сервері Discord.*",
	help_starboard_fields: "StarBoard",
	help_blogger_dsc:
		"> *Стежте за улюбленими RSS-стрічками й отримуйте сповіщення від iHorizon про нові статті.*",
	help_blogger_fields: "Blogger",
	help_lastfm_dsc:
		"> *Під'єднайте свій акаунт Last.fm і автоматично скроббліть треки, які грає iHorizon, поки ви в голосовому каналі.*",
	help_lastfm_fields: "LastFM Scrobbler",
	help_honeypot_fields: "Honeypot",
	help_honeypot_dsc:
		"> *Створіть канал-пастку, щоб ловити зламані акаунти й автоматично прибирати недавній спам на всьому сервері.*",
	h_suite: "(Продовження)",
	h_suite_desc: "*Продовження команд категорії*",
	helpall_no_perms_defined:
		"На цьому сервері не задано власних дозволів, тож `helpall` тут марний — використайте `${botPrefix}h`.",
	helpall_no_access:
		"На цьому сервері у вас немає доступу до жодної команди, захищеної дозволами.",
	say_footer_msg: "\n\nВідправлено з команди `/say` від ${author}",
	ping_down_msg: "**НЕДОСТУПНО**",
	ping_embed_desc:
		"# Понг! Статистика мережі ${botName}:\n\n**[Пінг веб-сайту Discord]** >> `${_net03}` мс.\n**[Пінг Cloudflare]** >> `${_net02}` мс.\n**[Пінг Google]** >> `${_net01}` мс.\n\n${emoji_Crown} **[Пінг веб-сайту iHorizon]** >> `${_net04}` мс.\n${emoji_Crown} **[Пінг веб-сокету]** `${ping}` мс.\n\n## ${emoji_Pointer} **[Середнє]** >> (ср)`${averagePing}` мс.",
	custom_avatar_reset:
		"Ви вирішили скинути аватар бота на сервері. Футери ембедів повернуться до стандартного вигляду, як і аватар бота на сервері.",
	custom_avatar_set:
		"${emoji_Yes} **Ви вирішили змінити аватар бота на сервері. Футери ембедів тепер змінено, як і аватар бота на сервері.**\n${emoji_Crown} Нове значення: `${x}`",
	custom_name_reset:
		"Ви вирішили скинути ім'я бота на сервері. Футери ембедів повернуться до стандартного вигляду, як і ім'я бота на сервері.",
	custom_name_set:
		"${emoji_Yes} **Ви вирішили змінити ім'я бота на сервері. Футери ембедів тепер змінено, як і ім'я бота на сервері.**\n${emoji_Crown} Нове значення: `${name}`",
	custom_desc_reset:
		"Ви вирішили скинути опис бота на сервері. Футери ембедів повернуться до стандартного вигляду, як і опис бота на сервері.",
	custom_desc_set:
		"${emoji_Yes} **Ви вирішили змінити опис бота на сервері. Футери ембедів тепер змінено, як і опис бота на сервері.**\n${emoji_Crown} Нове значення: `${desc}`",
	custom_banner_reset: "Ви вирішили скинути банер бота на сервері.",
	custom_banner_set:
		"${emoji_Yes} **Ви вирішили змінити банер бота на сервері.**\n${emoji_Crown} Нове значення: `${x}`",
	custom_sdk_only:
		"Ця команда доступна в production лише для серверів із підпискою `Custom iHorizon Profile`.",
	custom_sdk_only_title: "Підтримайте iHorizon з Custom iHorizon Profile",
	custom_sdk_only_description:
		"Наш бот безкоштовний і з відкритим кодом із 2022 року. Нам потрібен дохід, щоб і далі підтримувати, розвивати та хостити бота. Наші витрати становлять близько 500 EUR на рік на сервери, бусти, домени та ліцензії.\n\nКоманда `/custom` дає змогу змінити вигляд iHorizon на вашому сервері: аватар, ім'я, банер і біо. Після цього візуальна ідентичність iHorizon зникає з вашого сервера.\n\nТому ми додали інтегровану в Discord підписку за 2.99 USD на місяць.\n\nПридбавши цю підписку, ви зможете користуватися цією командою. Це як власний бот, на кшталт OWN-IHRZ, але стабільний, охайний і повністю робочий.",
	fun_var_down_api: "Помилка: API не доступно!",
	fun_var_good_sentence: "Будь ласка, надішліть гарну пропозицію!",
	hack_embed_description: "<@${victimId}> зламаний <@${authorId}> !",
	poll_not_admin: "У вас немає прав для цього!",
	question_not_full: "Введіть повне питання з 3 або більше словами!",
	question_s: [
		"Так.",
		"Ні.",
		"Я не знаю.",
		"Я не впевнений!",
		"Ти збожеволів!",
		"Ні, дякую.",
		"Ні.",
		"Так."
	],
	question_fields_input_embed: ":question:__**Питання**__",
	question_fields_output_embed: ":grey_exclamation:__**Відповідь:**__",
	question_embed_title: "__**Питання**__: `${authorUsername}`",
	dogs_embed_command_error: "Помилка під час отримання зображення собаки.",
	love_embed_description:
		"**${user1Username}** + **${user2Username}** = __${randomNumber}%__ любові 💗",
	love_command_error: "Сталася помилка під час створення зображення",
	fun_disable_command_msg: "${author}, ви ${action_type} категорію розваг!",
	fun_category_disable:
		"Ви не можете використати цю команду, бо категорію розважальних команд на цьому сервері вимкнено.",
	fun_caracteres_command_ok: "Вкажіть текст для перетворення!",
	fun_caracteres_embed_desc:
		"Оригінальний текст: **${inputText}**\n\nОберіть стиль у списку нижче, щоб перетворити текст.",
	fun_caracteres_select_menu_placeholder: "Оберіть стиль шрифту...",
	fun_coinflip_result_heads: "Орел",
	fun_coinflip_result_tails: "Решка",
	economy_cooldown_error:
		"Зачекайте **${time}**, перш ніж знову виконати цю команду!",
	addmoney_not_admin:
		"Ви не можете виконати цю команду, оскільки у вас немає необхідних прав `АДМІНІСТРАТОР`.",
	addmoney_logs_embed_title: "Логи економіки",
	addmoney_logs_embed_description:
		"Адміністратор <@${authorId}> додав ${amountValue} монет користувачу <@${userId}>!",
	addmoney_command_work:
		"Успішно додано `${amountValue}`$ користувачу <@${userId}>.",
	balance_dont_have_wallet: "👛 У вас немає гаманця... !",
	balance_he_dont_have_wallet: "${emoji_Wallet} ${user} не має гаманця... !",
	balance_have_wallet: "👛 У вас є ${bal} монет(и) !",
	balance_he_have_wallet: "${emoji_Wallet} У ${user} є ${bal} монет(и) !",
	balance_embed_fields1_name: "Банк",
	balance_embed_fields2_name: "На рахунку",
	daily_cooldown_error:
		"Вибачте, вам потрібно зачекати ще **${time}**, перш ніж виконувати цю команду!",
	daily_embed_title: "Щоденна винагорода",
	daily_embed_description: "**Ви зібрали щоденну винагороду**",
	daily_embed_fields: "Зібрано",
	monthly_cooldown_error:
		"Вибачте, вам потрібно зачекати **${time}**, перш ніж виконувати цю команду!",
	monthly_embed_title: "Щомісячна винагорода",
	monthly_embed_description: "**Ви отримали щомісячну винагороду**",
	monthly_embed_fields: "Зібрано",
	pay_negative_number_error: "Ви не можете перевести від'ємну суму.",
	pay_dont_have_enought_to_give:
		"Це більше коштів, ніж у вас на балансі. Спробуйте ще раз.",
	pay_command_work:
		"${authorUsername}, ви успішно переказали ${amount}$ користувачеві ${userUsername}.",
	removemoney_not_admin:
		"Ви не можете виконати цю команду, так як у вас немає необхідних прав `АДМІНІСТРАТОРА`",
	removemoney_embed_title: "Гроші успішно видалені!",
	removemoney_embed_fields: "Сума",
	removemoney_embed_second_fields: "Баланс оновлено",
	removemoney_logs_embed_description:
		"<@${authorId}> видалив ${amount} монет у користувача <@${userId}>!",
	removemoney_logs_embed_title: "Логи економіки",
	rob_cooldown_error:
		"**Зачекайте 50 хвилин, перш ніж знову грабувати користувача!**",
	rob_dont_enought_error:
		":x: Вам потрібно щонайменше 250$, щоб грабувати когось.",
	rob_him_dont_enought_error:
		":x: У ${userUsername} недостатньо коштів для грабежу.",
	rob_embed_description:
		"<@${authorId}>, ви пограбували <@${userId}> і втекли з ${random}!",
	weekly_cooldown_error:
		"Вибачте, вам потрібно зачекати **${time}**, перш ніж виконати цю команду!",
	weekly_embed_title: "Щотижнево",
	weekly_embed_description: "**Щотижнева нагорода**",
	weekly_embed_fields: "Зібрано",
	work_cooldown_error:
		"<@${authorId}>, **Зачекайте ${time} хвилин, перш ніж знову грабувати іншого користувача!**",
	work_embed_author: "${authorUsername}, це було вигідно!",
	work_embed_description:
		"${authorUsername}, ви працювали і заробили ${amount}$ !",
	withdraw_cannot_abuse:
		"${emoji_No} | Ви не можете зняти більшу суму монет, ніж у вас в банку!",
	withdraw_embed_title: "Зняття з вашого банку",
	withdraw_embed_desc:
		"${author}, ви зняли ${toWithdraw}${emoji_Coin} з вашого `банку`",
	withdraw_embed_fields1_name: "Банк",
	deposit_cannot_abuse:
		"${emoji_No} | Ви не можете внести більшу суму монет, ніж у вас в гаманці!",
	deposit_embed_title: "Внесення в ваш банк",
	deposit_embed_desc:
		"${author}, ви внесли ${toDeposit}${emoji_Coin} в ваш `банк`",
	deposit_embed_fields1_name: "Банк",
	economy_leaderboard_embed_title: "Лідерство за економікою `${guildName}`",
	economy_leaderboard_embed_fields_value:
		"<@${userId}> - Банк: `${bank}`${emoji_Coin} | Баланс: `${money}`${emoji_Coin}",
	economy_action_in_progress:
		"${emoji_No} | Ваша попередня команда економіки ще виконується, спробуйте за мить.",
	economy_disable_not_admin:
		":x: | Ви повинні бути адміністратором цього сервера, щоб виконати цю команду!",
	economy_disable_already_disable:
		"<@${authorId}>, Модуль Економіки вже **відключений**!",
	economy_disable_already_enable:
		"<@${authorId}>, Модуль Економіки вже **увімкнений**!",
	economy_disable_set_enable:
		"<@${authorId}>, ви успішно **увімкнули** Модуль Економіки!",
	economy_disable_set_disable:
		"<@${authorId}>, ви успішно **вимкнули** Модуль Економіки!",
	economy_disable_logs_embed_desc:
		"<@${authorId}> змінив(ла) стан Модуля Економіки на `${state}`!",
	economy_disable_logs_embed_title: "Логи Економіки",
	economy_boost_role_not_found:
		"Роль не знайдено. Потрібно встановити ціну для ролі.",
	economy_boost_embed_title: "Система економіки — ролі на продаж",
	economy_boost_embed_desc: "Усі ролі, які можна купити, наведено нижче.",
	economy_role_add_no_role: "Немає ролей на продаж, які можна видалити.",
	economy_role_add_max_20_roles: "Можна мати не більше 20 ролей на продаж.",
	economy_role_add_canceled: "Роль не додано до ролей на продаж.",
	economy_role_add_prompt_dangerous:
		"Ви впевнені, що хочете додати цю роль до ролей на продаж?\n**Увага:** ця роль має небезпечні дозволи.\nДозволи: ${stringDangerousPermissions}",
	economy_shop_embed_title: "🛍️ Магазин `${guildName}`",
	economy_shop_embed_desc:
		"У магазині можна купувати предмети/ролі за ваші гроші. Ролі, доступні для покупки, наведено нижче.",
	economy_shop_not_available: "Обрана роль недоступна для покупки.",
	economy_shop_already_own_role: "У вас уже є ця роль.",
	economy_shop_not_enough_money:
		"У вас недостатньо грошей, щоб купити цю роль.",
	economy_shop_role_add_failed:
		"Я не зміг видати вам цю роль, тож гроші не списано. Попросіть адміністратора перевірити, що роль досі існує і стоїть нижче за мою найвищу роль.",
	economy_shop_role_purchased:
		"Ви успішно купили роль **{roleName}** за **${rolePrice}** 💰.",
	economy_shop_unknown_role: "Невідома роль",
	economy_shop_not_set:
		"На цьому сервері немає ролей для покупки. Зверніться до адміністратора сервера, щоб дізнатися більше.",
	economy_shop_already_owned: "Уже є",
	economy_shop_menu_placeholder: "Оберіть роль для покупки",
	economy_manage_rewards_cooldown_invalid_time:
		"Недійсний формат часу. Використайте правильний формат часу.",
	economy_manage_rewards_cooldown_command_ok:
		"Кулдаун для ${type} успішно встановлено на ${stime}",
	economy_manage_rewards_set_money:
		"Суму для ${type} успішно встановлено на ${money}",
	economy_role_list_no_buyable_roles: "Немає ролей на продаж для показу.",
	economy_role_list_embed_title: "Система економіки — ролі на продаж",
	economy_role_list_embed_desc: "Усі ролі, які можна купити, наведено нижче.",
	reset_ueconomy_are_you_sure:
		"**Ви справді хочете видалити всі дані економіки?\nЦя дія остаточна, її неможливо скасувати.**\n**Ця дія руйнівна!!**",
	reset_ueconomy_logs_embed_title: "Логи модуля економіки (НЕБЕЗПЕЧНА ДІЯ)",
	reset_ueconomy_logs_embed_desc:
		"${author} видалив усі дані модуля економіки для ${user}!",
	reset_geconomy_are_you_sure:
		"**Ви справді хочете видалити всі дані економіки ДЛЯ ВСІХ УЧАСНИКІВ СЕРВЕРА?\nЦя дія остаточна, її неможливо скасувати.**\n**Ця дія руйнівна!!**",
	reset_geconomy_logs_embed_title:
		"Логи модуля економіки (ДУЖЕ НЕБЕЗПЕЧНА ДІЯ)",
	reset_geconomy_logs_embed_desc:
		"${author} видалив усі дані модуля економіки для **УСІХ**!",
	setprofilage_command_work: "**Ваш вік у профілі успішно оновлено.**",
	setprofildescriptions_command_work: "**Ваш опис успішно оновлено.**",
	profil_not_description_set: "Опис не встановлено!",
	profil_unknown: "Невідомо",
	profil_embed_title: "${emoji_Pin} __Профіль ${memberTag}__",
	profil_embed_fields_nickname: "📝 ・ __Нікнейм__",
	profil_embed_fields_money: "🪙 ・ __Гроші__",
	profil_embed_fields_money_value: " Монет",
	profil_embed_fields_xplevels: "💳 ・ __Рівень xp__",
	profil_embed_fields_xplevels_value: " рівнів xp",
	profil_embed_fields_age: "🎂 ・ __Вік__",
	profil_embed_fields_age_value: " років",
	profil_embed_fields_gender: "👤 ・ __Стать__",
	profil_embed_fields_pronouns: "📌 ・ __Займенник__",
	profil_embed_fields_birthdate: "🎂 ・ __Дата народження__",
	profil_birthday_month_button_label: "Вказати місяць",
	profil_birthday_day_button_label: "Вказати день",
	profil_birthday_year_button_label: "Вказати рік",
	profil_birthday_embed_title: "🎂 ・ Вкажіть свій день народження!",
	profil_birthday_embed_introduction:
		"${emoji_Sparkles} **Як і в кожної людини, у вас є день народження!**${emoji_Sparkles}\n\n${emoji_Crown} ・ Привіт, ${author}\n:tada: ・ Щоб його відсвяткувати, саме час його вказати!\n",
	profil_birthday_embed_current_birthday:
		"${emoji_Pin} ・ **Поточний день народження**: `${birthdayMonth}/${birthdayDay}/${birthdayYear}` (у форматі MM/DD/YYYY)",
	profil_birthday_modal1_title: "Введіть рік народження",
	profil_birthday_modal1_fields1_label: "Рік",
	profil_birthday_invalid_year: "Недійсний рік! Введіть правильний рік.",
	profil_birthday_year_already_set: "Ваш рік уже вказано.",
	profil_birthday_year_set: "Ваш рік вказано!",
	profil_birthday_modal2_title: "Введіть місяць народження",
	profil_birthday_modal2_fields1_label: "Місяць",
	profil_birthday_invalid_month:
		"Недійсний місяць! Введіть правильний місяць.",
	profil_birthday_month_already_set: "Ваш місяць уже вказано.",
	profil_birthday_month_set: "Ваш місяць вказано!",
	profil_birthday_modal3_title: "Введіть день народження",
	profil_birthday_modal3_fields1_label: "День",
	profil_birthday_invalid_day: "Недійсний день! Введіть правильний день.",
	profil_birthday_day_already_set: "Ваш день уже вказано.",
	profil_birthday_day_set: "Ваш день вказано!",
	setrankroles_not_admin:
		"${emoji_No} Ви не є адміністратором цього сервера. Ви не можете виконати цю команду!",
	setrankroles_already_this_in_db:
		"${emoji_No} Ролі рангів вже є в базі даних для цього сервера.",
	setrankroles_not_roles_typed:
		"${emoji_No} Ви не включили жодної ролі у своїй команді!",
	setrankroles_logs_embed_description_enable:
		"<@${authorId}> встановив ролі рангів на <@&${argsid}>",
	setrankroles_logs_embed_title_enable: "Встановлення ролей рангів",
	setrankroles_logs_embed_description_disable:
		"<@${authorId}> видалив роль рангів!",
	setrankroles_logs_embed_title_disable: "Встановлення ролей рангів",
	setrankroles_command_work_disable:
		"<@${authorId}>, ви видалили роль рангів!",
	setrankroles_command_error:
		"${emoji_No} Команда зіткнулася з помилкою! Спробуйте ще раз пізніше.",
	snipe_no_previous_message_deleted:
		"У цьому каналі немає видалених повідомлень!",
	userinfo_wait_please: "${emoji_Timer} Будь ласка, зачекайте...",
	userinfo_var_notfound: "`Не знайдено`",
	userinfo_button_label: "Профіль користувача",
	renew_channel_send_success: "${author} канал було відновлено!",
	renew_dont_have_permission: ":x: **Не можна** `Не має дозволу!`",
	renew_not_administrator:
		":x: **Ви не є адміністратором для використання цієї команди!**",
	renewvc_not_in_voice:
		"${emoji_No} Щоб використати цю команду, ви маєте бути в голосовому каналі!",
	renewvc_region_success:
		"${emoji_Yes} Регіон голосового каналу ${targetVc} встановлено на автоматичний!",
	renewvc_dont_have_permission: ":x: **Неможливо** `Немає дозволу!`",
	prevnames_undetected: "Дані не знайдено!",
	prevnames_not_admin:
		"У вас немає дозволу `АДМІНІСТРАТОРА` для виконання цієї команди!",
	prevnames_data_erased:
		"Ваші попередні імена користувача були повністю видалені за вашим запитом!",
	prevnames_embed_footer_text: "iHorizon | Сторінка ${page}/${pageCount}",
	blockbot_not_owner: ":x: **Ви не є власником сервера!**",
	blockbot_logs_enable_title: "Журнал блокування бота",
	blockbot_logs_enable_description:
		"${author} (Власник сервера) __увімкнув__ `BlockBot`. Тепер бот **не може** бути доданий на цей сервер!",
	blockbot_command_work_on_enable:
		"**Ви увімкнули `BlockBot`**\nТепер бот **не може** бути доданий на цей сервер!",
	blockbot_command_work_on_disable:
		"**Ви вимкнули `BlockBot`**\nТепер бот **може** бути доданий на цей сервер!",
	blockbot_logs_disable_commmand_work: "Журнал блокування бота",
	blockbot_logs_disable_description:
		"${author} (Власник сервера) __вимкнув__ `BlockBot`. Тепер бот **може** бути доданий на цей сервер!",
	banner_guild_no_banner: "У сервера немає банера.",
	banner_user_no_banner: "У цього користувача немає банера.",
	massiverole_too_much_member:
		"Занадто багато учасників, операція не може бути виконана через можливі обмеження швидкості!",
	nickrole_too_much_member:
		"Занадто багато учасників, операція не може бути виконана через можливі обмеження швидкості!",
	emoji_send_new_emoji:
		"__Створено новий емодзі__ з ім'ям **${emojiName}** ! (${emoji})",
	emoji_send_err_emoji:
		"__Помилка при створенні нового емодзі__ з ім'ям **${emojiName}** !",
	derank_msg_failed: "При видаленні ролей сталася помилка.",
	derank_no_role: "У цього учасника немає ролей, які можна зняти.",
	action_unban_all_no_banned_members: "Заблокованих учасників немає.",
	action_mass_job_running:
		"На цьому сервері вже виконується масова дія такого типу, дочекайтеся її завершення.",
	vc_embed_desc:
		"## Стани Голосу\n`${voiceCount}` учасник(ів) у голосовому каналі:\n${emoji_iHorizon_Streaming} **=>** ${streaming}\n${emoji_iHorizon_Deaf} **=>** ${deafened}\n${emoji_iHorizon_Mute} **=>** ${muted}\n${emoji_iHorizon_Camera} **=>** ${video}\n## Стани Учасників\n`${memberCount}` учасник(ів) у гільдії:\n${emoji_DND} **=>** ${dnd}\n${emoji_Online} **=>** ${online}\n${emoji_Idle} **=>** ${idle}\n${emoji_Invisible} **=>** ${offline}\n## Стани Бустів\n`${boostCount}` буст(ів) у гільдії,\n${members}",
	vc_embed_fields_1_name: "・Кількість Учасників",
	vc_embed_fields_1_value: "```py\n${memberCount} учасників```",
	vc_embed_fields_2_name: "・Кількість Каналів",
	vc_embed_fields_2_value:
		"```py\n${textChannelSize} текстовий(і) канал(и)\n${voiceChannelSize} голосовий(і) канал(и)```",
	vc_embed_short_desc:
		"## Голосові стани\n`${voiceCount}` учасник(ів) у голосовому каналі:\n${emoji_iHorizon_Streaming} **=>** ${total_members_vc_streaming}\n${emoji_iHorizon_Deaf} **=>** ${total_members_vc_deaf}\n${emoji_iHorizon_Mute} **=>** ${total_members_vc_mute}\n${emoji_iHorizon_Camera} **=>** ${total_members_vc_video}\n## Стани учасників\n`${total_members_size}` учасник(ів) на сервері:\n${emoji_DND} **=>** ${total_members_states_dnd}\n${emoji_Online} **=>** ${total_members_states_online}\n${emoji_Idle} **=>** ${total_members_states_idle}",
	massmove_too_much_member:
		"Занадто багато учасників, не можу перемістити усіх через можливе обмеження швидкості!",
	all_admins_nobody_admins: "На цьому сервері немає жодного адміністратора!",
	all_admins_unrank_button_label: "Зняти всіх",
	all_admins_unrank_not_owner:
		"Лише власник сервера може зняти ранг з усіх адміністраторів сервера",
	utils_addrole_highter_or_egal_roles_msg:
		"${emoji_Stop} Ви не можете додати роль користувачу, який має вищу роль, ніж ви...",
	utils_addrole_command_ok:
		"${author} успішно додав(-ла) роль ${role} користувачу ${user}",
	utils_addrole_not_wl:
		"${emoji_No} | Роль, яку ви хочете додати користувачу, не в білому списку. Адміністратор має спершу її додати! (за допомогою `/utils wlroles`)",
	utils_addrole_cant_level:
		"Користувач не адмін, а ви хочете дати йому адмінську роль? Ви з мене знущаєтеся? Хочете поламати сервер чи що?",
	utils_addrole_try2brain:
		"Роль бота надто низько в ієрархії. Я не можу видати цю дурнувату роль, вибачте.",
	utils_delrole_highter_or_egal_roles_msg:
		"${emoji_Stop} Ви не можете забрати роль у користувача, який має вищу роль, ніж ви...",
	utils_delrole_command_ok:
		"${author} успішно забрав(-ла) роль ${role} у ${user}",
	utils_delrole_not_wl:
		"${emoji_No} | Роль, яку ви хочете забрати в користувача, не в білому списку. Адміністратор має спершу її додати! (за допомогою `/utils wlroles`)",
	utils_delrole_try2brain:
		"Роль бота надто низько в ієрархії. Я не можу забрати цю дурнувату роль, вибачте.",
	utils_wlroles_embed_title: "Білий список ролей",
	utils_wlroles_embed_desc:
		"Ось усі дозволені ролі, які можна видавати командами `addrole`, `delrole`!",
	utils_wlRoles_logsEmbed_title: "Модуль білого списку ролей",
	utils_wlRoles_logsEmbed_desc:
		"${author} змінив(-ла) wlRoles (для команд `addrole`, `delrole`)",
	utils_derogation_already_exists:
		"${emoji_No} Роль-виняток ${role} уже правильно налаштована",
	utils_derogation_created:
		"${emoji_Yes} Роль-виняток ${role} створено. Синхронізовані канали: `${updatedChannels}`. Збої: `${failedChannels}`",
	utils_derogation_resynced:
		"${emoji_Yes} Роль-виняток ${role} уже існувала, я повторно синхронізував `${updatedChannels}` каналів. Збої: `${failedChannels}`",
	utils_dm: "${emoji_Yes} Повідомлення успішно надіслано ${targetMember}.",
	utils_dm_cant:
		"${emoji_No} Я не зміг надіслати повідомлення ${targetMember}. Можливо, у нього закриті особисті повідомлення або він заблокував мене!",
	utils_pic_only_embed_title: "Канали лише для медіа",
	utils_pic_only_emnbed_desc:
		"Канал, де дозволені лише світлини/зображення/відео. Інший вміст (наприклад, звичайні текстові повідомлення) блокується ботом.",
	utils_piconly_embed_fields_3_name: "Тривалість тайм-ауту",
	utils_piconly_select1_option1_label: "Змінити тривалість тайм-ауту",
	utils_piconly_select1_option2_label: "Змінити поріг",
	utils_piconly_modal1_title: "MediaOnly — налаштування часу",
	utils_piconly_modal1_fields1_placeholder: "тривалість заглушення",
	utils_piconly_modal1_fields1_label: "Тривалість заглушення",
	utils_piconly_modal2_title: "MediaOnly — налаштування порогу",
	utils_piconly_modal2_fields1_placeholder: "поріг до заглушення",
	utils_piconly_modal2_fields1_label: "Поріг",
	utils_piconly_embed_fields2_placeholder:
		"Створювати гілку під зображенням/відео",
	utils_piconly_var_thread_name: "Гілка від {name}",
	zip_emojis_doesnt_have_perm: "У вас немає дозволу керувати емодзі.",
	zip_emojis_command_work:
		"🎉 Експорт завершено за **${calcTime}** мс! Ось архів із ${emojiCount} емодзі.",
	zip_emojis_command_error: "Під час експорту емодзі сталася помилка.",
	zip_stickers_doesnt_have_perm: "У вас немає дозволу керувати стікерами.",
	zip_stickers_command_work:
		"🎉 Експорт завершено за **${calcTime}** мс! Ось архів із ${stickerCount} стікерами.",
	zip_stickers_command_error: "Під час експорту стікерів сталася помилка.",
	sticket_no_sticker:
		"У повідомленні, на яке ви відповіли, не знайдено стікера.",
	sticket_command_work: "Стікер `${name}` успішно створено.",
	sticker_command_error:
		"Не вдалося створити стікер. Сталася помилка: `${errMessage}`.",
	sticket_command_error2:
		"Будь ласка, дайте відповідь на повідомлення зі стікером.",
	util_nick_kicker_embed_desc:
		"Якщо нікнейм учасника містить певне слово, його буде вигнано.",
	util_nick_kicker_words: "слова",
	util_nick_kicker_select_to_remove: "Виберіть слово для видалення",
	util_nick_kicker_remove_word: "Видалити це слово",
	util_nick_kicker_no_word_to_remove: "Немає слів для видалення",
	util_nick_kicker_add_word: "Додати слово",
	util_nick_kicker_words_max_15: "Не можна додати більше ніж 15 слів",
	util_nick_kicker_disable: "Вимкнути",
	util_nick_kicker_remove_word2: "Видалити слово",
	util_nick_kicker_remove_desc: "Видалити слово з nick-kicker",
	util_nick_kicker_add_desc: "Додати слово до nick-kicker",
	util_nick_kicker_disable_desc: "Вимкнути nick-kicker",
	util_nick_kicker_enable_desc: "Увімкнути nick-kicker",
	util_wakeup_yourself:
		"Брате, ви що, серйозно? Тільки не кажіть, що спите на клавіатурі, поки пишете цю команду, лол",
	util_wakeup_not_in_vc:
		"Брате, бот не буде клонувати ${userDisplayName} з тією ж аватаркою і банером, щоб ви подумали, що він прокинувся... Його навіть немає у войсі, лол",
	util_wakeup_command_work: "Ходімо будити ${user}!",
	util_talk_not_in_vc:
		"Щоб використати цю команду, ви маєте бути в голосовому каналі.",
	util_talk_already_active:
		"Режим talk вже увімкнено в ${voiceChannel}: спершу вимкніть його там.",
	util_talk_audit_reason: "Режим розмови в голосовому каналі увімкнено",
	util_talk_logs_title: "Режим розмови",
	util_talk_logs_description:
		"${author} увімкнув(-ла) режим розмови в ${voiceChannel} і заглушив(-ла) учасників: ${mutedCount}. Пропущено учасників: ${skippedCount}.",
	util_talk_command_work:
		"Режим розмови тепер увімкнено в ${voiceChannel}. Заглушено учасників: ${mutedCount}, пропущено: ${skippedCount}.",
	util_untalk_nothing_active:
		"На цьому сервері немає активного режиму розмови.",
	util_untalk_audit_reason: "Режим розмови в голосовому каналі вимкнено",
	util_untalk_logs_title: "Вимкнення режиму розмови",
	util_untalk_logs_description:
		"${author} вимкнув(-ла) режим розмови в ${voiceChannel} і зняв(-ла) заглушення з учасників: ${unmutedCount}.",
	util_untalk_command_work:
		"Режим розмови в ${voiceChannel} вимкнено. Знято заглушення з учасників: ${unmutedCount}.",
	util_freeze_logs_title: "Заморожування голосового каналу",
	util_freeze_logs_description:
		"${author} заморозив(-ла) доступ до ${voiceChannel}.",
	util_freeze_command_work:
		"Голосовий канал ${voiceChannel} тепер заморожено.",
	util_wlvc_no_member:
		"Ви маєте вказати учасника, якого допустити до замороженого голосового каналу.",
	util_wlvc_no_freeze:
		"На цьому сервері немає активного замороженого голосового каналу.",
	util_wlvc_logs_title: "Дозвіл у замороженому каналі",
	util_wlvc_logs_description:
		"${author} дозволив(-ла) ${member} заходити до замороженого голосового каналу.",
	util_wlvc_command_work:
		"${member} тепер може заходити до замороженого голосового каналу.",
	util_unwlvc_no_member:
		"Ви маєте вказати учасника, якого прибрати з білого списку замороженого голосового каналу.",
	util_unwlvc_no_freeze:
		"На цьому сервері немає активного замороженого голосового каналу.",
	util_unwlvc_not_whitelisted:
		"${member} не має дозволу в замороженому голосовому каналі.",
	util_unwlvc_logs_title: "Скасування дозволу в замороженому каналі",
	util_unwlvc_logs_description:
		"${author} прибрав(-ла) ${member} з білого списку замороженого голосового каналу.",
	util_unwlvc_command_work:
		"${member} більше не може заходити до замороженого голосового каналу.",
	util_unfreeze_no_freeze:
		"На цьому сервері немає активного замороженого голосового каналу.",
	util_unfreeze_logs_title: "Розморожування голосового каналу",
	util_unfreeze_logs_description:
		"${author} зняв(-ла) активне заморожування голосового каналу.",
	util_unfreeze_command_work: "Голосовий канал більше не заморожено.",
	util_leash_too_naugthy:
		"Ах ви ж бешкетнику, не можна тримати на повідку більше ніж ${max} людей :D",
	util_leah_already_owned:
		"Ах ви ж бешкетнику, ці маленькі дива вже ваші :smirk:",
	util_leash_confirm_message:
		"${emoji_No} | Учасник, якого ви хочете взяти на повідок, не в голосовому каналі!\n${emoji_Warning_Icon} | Ви впевнені, що хочете продовжити?",
	util_leash_canceled_leash: "${emoji_Yes} | Налаштування повідка скасовано",
	util_leash_confirmed_leash:
		"${emoji_Yes} | Ви успішно взяли користувача на повідок на цьому сервері :smirk:",
	util_unleash_not_in_leash:
		"${emoji_No} | Цей користувач не на вашому повідку!",
	util_unleash_command_ok:
		"${emoji_Yes} | Ви успішно відпустили користувача з повідка на цьому сервері :)",
	util_leashlist_no_data:
		"${emoji_No} | На цьому сервері немає активних повідків.",
	util_leashlist_embed_title: "Активні повідки",
	util_lockname_not_in_guild:
		"${emoji_No} | Цього учасника немає на сервері!",
	util_lockname_not_manageable:
		"${emoji_No} | У мене немає дозволу змінювати нікнейм цього учасника!",
	util_lockname_already_locked:
		"${emoji_No} | Нікнейм цього учасника вже заблоковано!",
	util_lockname_success:
		"${emoji_Yes} | Нікнейм ${member} тепер заблоковано на **${nick}**!",
	util_lockname_success_reset:
		"${emoji_Yes} | Нікнейм ${member} тепер заблоковано!",
	util_unlockname_not_locked:
		"${emoji_No} | Нікнейм цього учасника не заблоковано!",
	util_unlockname_success: "${emoji_Yes} | Нікнейм ${member} розблоковано!",
	util_lockname_logs_embed_title: "Логи блокування нікнеймів",
	util_lockname_logs_embed_description:
		"<@${authorId}> заблокував(-ла) нікнейм <@${memberId}>",
	util_unlockname_logs_embed_description:
		"<@${authorId}> розблокував(-ла) нікнейм <@${memberId}>",
	util_locknamelist_empty:
		"${emoji_No} | На цьому сервері немає заблокованих нікнеймів! `/utilss lockname`, щоб створити.",
	util_locknamelist_embed_title: "Заблоковані нікнейми",
	util_autorenew_time_too_short:
		"Інтервал між оновленнями каналу має бути більшим за 1 хвилину",
	util_autorenew_time_too_long:
		"Інтервал між оновленнями каналу має бути меншим за 30 днів",
	util_autorenew_command_ok:
		"${emoji_Yes} Тепер канал ${channel} автоматично видаляється й створюється заново (оновлюється) кожні ${time}!\nЩоб канал більше не оновлювався, просто видаліть його самі.",
	event_autorenew_channel_renewed: "AutoRenew оновив канал!",
	event_autorenew_channel_warning:
		"Модуль AutoRenew налаштовано на оновлення цього каналу. Наступне оновлення через ${time}.",
	var_video: "Відео",
	var_whereis: "Де",
	util_not_in_vc: "Учасники не в голосовому каналі",
	util_no_webhooks: "На цьому сервері немає вебхуків.",
	util_allwebhooks_embed_title: "Усі вебхуки",
	util_allwebhooks_deleting: "Видалення всіх вебхуків...",
	util_allwebhooks_deleted: "Видалено вебхуків: **`${u}`**!",
	util_unzip_emojis_command_work:
		"🎉 Розпакування завершено за **${calcTime}** мс! Я створив на сервері емодзі: ${emojiCount}.",
	util_unzip_emojis_command_error:
		"Під час розпакування емодзі сталася помилка.",
	util_unzip_emojis_command_no_file:
		"Будь ласка, прикріпіть zip-файл з емодзі.",
	vkick_member_not_in_guild: "Цього учасника немає на сервері.",
	vkick_not_in_vc: "Учасник не в голосовому каналі.",
	vkick_not_admin_kick:
		"Ви не можете від'єднати адміністратора від голосового каналу.",
	vkick_logEmbed_title: "Вигнання з голосового каналу",
	vkick_logEmbed_desc:
		"${author} від'єднав(-ла) ${member} від голосового каналу ${voiceChannel}.",
	vkick_command_work:
		"${author}, ви успішно від'єднали ${member} від ${voiceChannel}",
	util_sync_embed_description_0:
		"Усі канали цієї категорії вже мають синхронізовані дозволи.",
	util_securewebhook_action_create: "Недійсна URL-адреса вебхука Discord",
	util_securewebhook_action_create_error:
		"Помилка під час створення вебхука: `${status}`",
	util_securewebhook_action_create_ok:
		"Вебхук успішно створено\n> URL: ${url}\n> Використання: ${use}",
	util_securewebhook_action_delete_any: "У вас немає жодного вебхука",
	util_securewebhook_action_delete_not_owner: "Ви не власник цього вебхука",
	util_securewebhook_action_delete_error: "Помилка під час видалення вебхука",
	util_securewebhook_actiom_list_ok: ":star: __**Ваші вебхуки**__:\n",
	admin_roles_nobody_roles: "На цьому сервері немає ролі адміністратора!",
	admin_roles_remove_button_label: "Забрати адмінку в усіх",
	admin_roles_remove_not_owner:
		"Лише власник сервера може забрати дозвіл адміністратора в ролей",
	util_rolelimit_bad_opt:
		"${emoji_No} | Вказані параметри недійсні. Перевірте введені дані.",
	util_rolelimit_good:
		"${emoji_Crown} | Роль: ${role} | Макс. учасників: ${limit_count}\n- Нові користувачі не зможуть отримати цю роль, якщо її вже мають ${limit_count} учасників.",
	util_inviteinfo_not_valid_invite: "Цей `discord_invite` недійсний!",
	util_cooldown_command_ok:
		"Повільний режим каналу встановлено на ${duration_in_string}.",
	util_role_members_no_one: "На сервері немає нікого з цією роллю",
	util_vanity_generator_invalid_code:
		"Код URL Vanity `${VanityCode}` недійсний. Рядок має складатися з літер і цифр і може містити дефіси між словами. Максимальна довжина — 32 символи. Дефіси не можуть стояти на початку чи в кінці рядка.",
	util_vanity_generator_already_claimed:
		"Цей код URL Vanity вже зайнято! Виберіть інший.",
	util_vanity_generator_command_err:
		"Під час створення коду vanity сталася помилка. Спробуйте пізніше.",
	utils_top_no_message: "У цьому каналі не знайдено повідомлень",
	utils_top_command_ok: "Перше повідомлення в цьому каналі — [тут](${link})",
	bringall_no_from_channel: "Будь ласка, вкажіть вихідний голосовий канал.",
	bringall_invalid_category: "Будь ласка, вкажіть дійсну категорію.",
	bringall_no_voice_channels: "У вказаній категорії немає голосових каналів.",
	bringall_no_members: "У вихідному голосовому каналі немає учасників.",
	util_move_not_in_vc:
		"Учасник, якого ви хочете перемістити, не під'єднаний до жодного голосового каналу",
	util_move_impossible_to_move_admin:
		"Учасник, якого ви хочете перемістити, — адміністратор, а ви ним не є.",
	util_move_command_ok: "${member} тепер у ${channel}",
	blockpub_not_admin: ":x: | Ви повинні бути адміністратором цього сервера!",
	blockpub_now_enable:
		"📌 | Антиреклама тепер увімкнена (вона працює для всіх, крім адміністраторів)",
	blockpub_now_disable: "📌 | Антиреклама тепер вимкнена!",
	guildprofil_not_admin:
		":x: | Ви повинні бути адміністратором цього сервера!",
	guildprofil_not_set_reactionrole: "Не встановлено!",
	guildprofil_set_reactionrole:
		"**MessageID**: `${i}` -> ${emoji} дає роль <@&${rolesID}>\n",
	guildprofil_not_set_ticketFetched: "Не встановлено!",
	guildprofil_set_ticketFetched: "",
	guildprofil_not_set_punishPub: "Не встановлено!",
	guildprofil_set_punishPub:
		"`${punishementType}`: максимум: `${amountMax}` прапорців.",
	guildprofil_not_set_supportConfig: "Не встановлено!",
	guildprofil_set_supportConfig: "`${input}` в біо дає роль <@&${rolesId}>.",
	guildprofil_not_set_setchannelsjoin: "Не встановлено!",
	guildprofil_set_setchannelsjoin: "",
	guildprofil_not_set_setchannelsleave: "Не встановлено!",
	guildprofil_set_setchannelsleave: "",
	guildprofil_not_set_joinmessage: "Не встановлено!",
	guildprofil_set_joinmessage: "",
	guildprofil_not_set_leavemessage: "Не встановлено!",
	guildprofil_set_leavemessage: "",
	guildprofil_not_set_joinroles: "Не встановлено!",
	guildprofil_set_joinroles: "",
	guildprofil_not_set_joinDmMessage: "Не встановлено!",
	guildprofil_set_joinDmMessage: "",
	guildprofil_not_set_blockpub: "Вимкнено",
	guildprofil_set_blockpub: "Увімкнено",
	guildprofil_embed_description: "`Налаштування сервера:` ${guildName} !",
	guildprofil_embed_fields_joinmessage: "Повідомлення про вхід",
	guildprofil_embed_fields_leavemessage: "Повідомлення про виход",
	guildprofil_embed_fields_setchannelsjoin: "Канал для входу",
	guildprofil_embed_fields_setchannelsleave: "Канал для виходу",
	guildprofil_embed_fields_joinroles: "Ролі при вході",
	guildprofil_embed_fields_joinDmMessage: "Особисте повідомлення при вході",
	guildprofil_embed_fields_blockpub: "Блокування реклами",
	guildprofil_embed_fields_punishPub: "Покарання за рекламу",
	guildprofil_embed_fields_supportConfig: "Підтримка",
	guildprofil_embed_fields_ticketFetched: "Тікети",
	guildprofil_embed_fields_reactionrole: "Реакційні ролі",
	guildprofil_not_logs_set: "Канали журналів не налаштовані",
	guildprofil_blockbot_on: "Блокування ботів увімкнено",
	guildprofil_blockbot_off: "Блокування ботів вимкнено",
	guildprofil_disable_xp: "Повідомлення відключені",
	guildprofil_enable_xp: "Повідомлення увімкнені",
	guildprofil_another_enable_xp:
		"Повідомлення увімкнені для надсилання в <#${xpChannels}>",
	guildprofil_embed_fields_blockbot: "Блокування ботів",
	guildprofil_embed_fields_logs: "Журнали",
	guildprofil_embed_fields_ranks: "Ранги",
	setchannels_not_admin:
		":x: | Ви повинні бути адміністратором цього сервера, щоб виконати цю команду!",
	setchannels_not_specified_args:
		"Ви повинні вказати припустимі канали для цього модулю.",
	setchannels_already_this_channel_on_join:
		"Модуль вже налаштований на цей канал для входу!",
	setchannels_confirmation_message_on_join:
		"**Канал входу встановлено тут!** :tada:",
	setchannels_command_error_on_join:
		"Помилка: відсутні дозволи або канал не існує",
	setchannels_command_work_on_join:
		"Ви успішно налаштували модуль входу на канал <#${argsidId}>",
	setchannels_logs_embed_title_on_join: "Налаштування журналу каналів",
	setchannels_logs_embed_description_on_join:
		"<@${authorId}> встановив модуль входу на: <#${argsidId}>",
	setchannels_already_this_channel_on_leave:
		"Модуль вже налаштований на цей канал для виходу!",
	setchannels_confirmation_message_on_leave:
		"**Канал виходу встановлено тут!** :tada:",
	setchannels_command_error_on_leave:
		"Помилка: відсутні дозволи або канал не існує",
	setchannels_command_work_on_leave:
		"Ви успішно налаштували модуль виходу на <#${argsidId}>",
	setchannels_logs_embed_title_on_leave: "Налаштування журналу каналів",
	setchannels_logs_embed_description_on_leave:
		"<@${authorId}> встановив канал виходу на: <#${argsidId}>",
	setchannels_already_on_off: "Канали входу та виходу вже вимкнені",
	setchannels_command_work_on_off:
		"Ви успішно вимкнули канали входу та виходу!",
	setchannels_logs_embed_title_on_off: "Налаштування журналу каналів",
	setchannels_logs_embed_description_on_off:
		"<@${authorId}> видалив усі налаштування каналів входу та виходу!",
	setchannels_button_join: "Змінити канал приєднання",
	setchannels_button_leave: "Змінити канал виходу",
	setchannels_button_delete: "Видалити конфігурацію",
	setchannels_embed_fields_value_join: "Канал приєднання",
	setchannels_embed_fields_value_leave: "Канал виходу",
	setchannels_not_a_text_channel:
		"${emoji_Warning_Icon} Вказаний канал не є текстовим каналом!",
	setchannels_which_channel:
		"<@${authorId}>, Який канал ви хочете встановити?",
	setchannels_title_embed_panel:
		"Панель конфігурації каналів для налаштувань серверу",
	setjoindm_not_admin:
		":x: | Для виконання цієї команди ви повинні бути адміністратором цього сервера!",
	setjoindm_logs_embed_title_on_enable: "Журнал встановлення JoinDm",
	setjoindm_logs_embed_description_on_enable:
		"<@${authorId}> встановив повідомлення при вході в особисті повідомлення!",
	setjoindm_not_specified_args_on_enable:
		"Ви повинні вказати допустиме повідомлення для повідомлення при вході в особисті повідомлення.",
	setjoindm_confirmation_message_on_enable:
		"Ви успішно встановили повідомлення при вході в особисті повідомлення:```${dm_msg}``` та включили його",
	setjoindm_command_error_on_enable:
		"Помилка: відсутні дозволи або канал не існує",
	setjoindm_logs_embed_title_on_disable: "Журнал вимкнення JoinDm",
	setjoindm_logs_embed_description_on_disable:
		"<@${authorId}> вимкнув повідомлення при вході в особисті повідомлення!",
	setjoindm_confirmation_message_on_disable:
		"Ви успішно вимкнули повідомлення при вході в особисті повідомлення!",
	setjoindm_command_error_on_disable:
		"Помилка: відсутні дозволи або канал не існує",
	setjoindm_already_disable:
		"Повідомлення при вході в особисті повідомлення вже вимкнено!",
	setjoindm_not_setup_ls:
		"Тут не налаштоване повідомлення при вході в особисті повідомлення!",
	setjoindm_command_work_ls:
		"Повідомлення при вході в особисті повідомлення: \n```${already_off}```",
	setjoindm_help_embed_title:
		"Допомога у налаштуванні повідомлення про вступ у приватні повідомлення!",
	setjoindm_help_embed_desc:
		"{memberUsername} => Ім'я користувача учасника\n{memberMention} => Згадати учасника\n{memberCount} => Кількість учасників на сервері\n{guildName} => Назва сервера\n{createdAt} => Дата створення акаунта у форматі дд/мм/рррр\n{accountCreationTimestamp} => Мітка часу створення акаунта",
	setjoindm_buttom_set_name: "Встановити повідомлення",
	setjoindm_buttom_delete_name: "Видалити повідомлення в ОП",
	setjoindm_awaiting_response:
		"Напишіть нове користувацьке повідомлення про вступ у приватних повідомленнях у каналі.",
	setjoinmessage_not_admin:
		":x: | Для виконання цієї команди ви повинні бути адміністратором цього сервера!",
	setjoinmessage_help_embed_title: "Довідка щодо команди setjoinmessage!",
	setjoinmessage_help_embed_description:
		"/setjoinmessage <Включити / Вимкнути / Показати встановлене повідомлення> <повідомлення при вході>",
	setjoinmessage_help_embed_fields_name: "Як використовувати?",
	setjoinmessage_help_embed_fields_value:
		"Використовуйте ```/setjoinmessage <Включити / Вимкнути / Показати встановлене повідомлення> <повідомлення>```\n{user} = Ім'я учасника\n{membercount} = Кількість учасників сервера\n{createdat} = Дата створення облікового запису учасника\n{guild} = Назва сервера\n{inviter} = Ім'я та дискримінатор запрошуючого користувача\n{invites} = Кількість запрошень користувача",
	setjoinmessage_logs_embed_title_on_enable:
		"Журнал встановлення повідомлення при вході",
	setjoinmessage_logs_embed_description_on_enable:
		"<@${authorId}> встановив повідомлення при вході!",
	setjoinmessage_command_work_on_enable:
		"${emoji_GreenTick}  | Повідомлення при вході успішно встановлено.",
	setjoinmessage_logs_embed_title_on_disable:
		"Журнал вимкнення повідомлення при вході",
	setjoinmessage_logs_embed_description_on_disable:
		"<@${authorId}> видалив повідомлення при вході!",
	setjoinmessage_command_work_on_disable:
		"${emoji_Yes} | Повідомлення при вході успішно видалено.",
	setjoinmessage_command_work_ls: "Повідомлення при вході:",
	setjoinmessage_help_embed_fields_custom_name: "Користувацьке повідомлення",
	setjoinmessage_help_embed_fields_custom_name_empy: "Не встановлено!",
	setjoinmessage_help_embed_fields_default_name_empy:
		"Стандартне повідомлення",
	setjoinmessage_help_embed_desc:
		"{memberUsername} => Ім'я користувача учасника\n{memberMention} => Згадати учасника\n{inviterUsername} => Ім'я користувача того, хто запросив\n{inviterMention} => Згадати того, хто запросив\n{memberCount} => Кількість учасників на сервері\n{invitesCount} => Кількість запрошень того, хто запросив\n{guildName} => Назва сервера\n{createdAt} => Дата створення акаунта у форматі дд/мм/рррр\n{accountCreationTimestamp} => Мітка часу створення акаунта",
	setjoinmessage_button_set_name: "Встановити повідомлення",
	setjoinmessage_buttom_del_name: "Стандартне повідомлення",
	setjoinmessage_awaiting_response:
		"Написав нове повідомлення про приєднання.",
	setjoinmessage_image_default_text:
		"Вітаємо, {memberUsername}, на {guildName}<br>Тепер нас на сервері {memberCount}",
	setjoinmessage_change_image_button_title: "Змінити зображення",
	setjoinmessage_default_image_button_title: "Стандартне зображення",
	setjoinmessage_var_enable_image: "Увімкнути зображення",
	setjoinmessage_var_disable_image: "Видалити зображення",
	setjoinmessage_var_image_card: "Картка привітання",
	setjoinmessage_change_image_propreties_background: "Змінити фон",
	setjoinmessage_change_image_propreties_frame_color:
		"Змінити колір круглої рамки",
	setjoinmessage_change_image_propreties_text_colour: "Змінити колір тексту",
	setjoinmessage_change_image_propreties_text_message:
		"Змінити текст повідомлення",
	setjoinmessage_change_image_propreties_text_size: "Змінити розмір тексту",
	setjoinmessage_change_image_propreties_avatar_size:
		"Змінити розмір аватара",
	setjoinmessage_modal_fields_background_url: "URL фонового зображення",
	setjoinmessage_change_image_menu_frame_color_profil:
		"За кольором профілю користувача",
	setjoinmessage_change_image_menu_frame_status_profil:
		"За статусом користувача",
	setjoinmessage_modal_fields_hex_color: "колір www.color-hex.com",
	setjoinmessage_modal_fields_message: "бажане повідомлення",
	setjoinmessage_var_text_size: "Розмір тексту: ",
	setjoinmessage_var_avatar_size: "Розмір аватара: ",
	setjoinmessage_change_image_invalid_url:
		"Недійсна URL-адреса зображення. Спробуйте інший хостинг зображень.",
	setjoinroles_var_none: "Немає",
	setjoinroles_var_perm_admin: "Адміністратор",
	setjoinroles_var_perm_manage_guild: "Управління сервером",
	setjoinroles_var_perm_manage_role: "Управління ролями",
	setjoinroles_var_perm_use_mention:
		"Використання @everyone @here та згадування ролей",
	setjoinroles_var_perm_ban_members: "Бан учасників",
	setjoinroles_var_perm_kick_members: "Виключення учасників",
	setjoinroles_var_perm_manage_webhooks: "Управління вебхуками",
	setjoinroles_var_perm_manage_channels: "Управління каналами",
	setjoinroles_var_perm_manage_expression:
		"Управління емодзі, стікерами та звуковими дошками",
	setjoinroles_var_perm_view_monetization_analytics:
		"Перегляд монетизації та аналітики власника",
	setjoinroles_var_perm_issue: "У мене немає дозволу на управління ролями.",
	setjoinroles_var_timesup: "Час минув для вибору ролі.",
	setjoinroles_warn_dangerous_perm:
		"Наступні ролі мають небезпечні дозволи. Ви дійсно хочете призначити їх?",
	setjoinroles_warn_title: "Увага!",
	setjoinroles_timesup_button: "Час минув!",
	setjoinroles_action_canceled: "Дія скасована",
	setjoinroles_too_highter_roles:
		"Наступні ролі мають більш високу позицію, ніж моя.",
	setjoinroles_not_admin:
		":x: | Ви повинні бути адміністратором цього сервера, щоб використовувати цю команду!",
	setjoinroles_help_embed_title: "Модуль ролей приєднання",
	setjoinroles_help_embed_description:
		"Ось всі ролі, які я додаю новому учаснику.",
	setjoinroles_help_embed_fields_1_name: "Усі зареєстровані ролі",
	setjoinroles_logs_embed_title_on_enable: "Журнал ролей приєднання",
	setjoinroles_logs_embed_description_on_enable:
		"<@${authorId}> налаштував ролі приєднання!",
	setjoinroles_already_on_enable:
		"Ролі приєднання вже налаштовані з цією роллю!",
	welcomer_panel_title: "Привітання",
	welcomer_section_placeholder: "Виберіть, що налаштувати",
	welcomer_section_channels: "Канали",
	welcomer_embed_label: "Власний ембед",
	welcomer_text_label: "Текст",
	welcomer_embed_set_button: "Задати ембед",
	welcomer_embed_remove_button: "Прибрати ембед",
	welcomer_embed_modal_title: "Задати власний ембед",
	welcomer_embed_modal_label: "ID ембеда (з конструктора ембедів)",
	welcomer_embed_not_found:
		"Не знайдено збереженого ембеда з ID `${embed_id}`. Спершу створіть його в конструкторі ембедів.",
	welcomer_embed_set_ok:
		"Тепер для цієї події надсилатиметься власний ембед `${embed_id}`. Змінні на кшталт {memberMention} замінюються автоматично.",
	welcomer_embed_removed_ok:
		"Власний ембед прибрано. Повернуто стандартну картку.",
	welcomer_text_enable_button: "Увімкнути текст",
	welcomer_text_disable_button: "Вимкнути текст",
	welcomer_components_enable_button: "Увімкнути компоненти",
	welcomer_components_disable_button: "Вимкнути компоненти",
	welcomer_render_mode_label: "Режим відображення",
	welcomer_render_mode_components: "Компоненти (картка)",
	welcomer_render_mode_simple: "Просте повідомлення",
	setleavemessage_not_admin:
		":x: | Для виконання цієї команди ви повинні бути адміністратором цього сервера!",
	setleavemessage_help_embed_title: "/setleavemessage Довідка!",
	setleavemessage_help_embed_description:
		"/setleavemessage <Увімкнути / Вимкнути / Показати встановлене повідомлення> <повідомлення при виході>",
	setleavemessage_help_embed_fields_name: "Як використовувати?",
	setleavemessage_help_embed_fields_value:
		"Використовуйте ```/setleavemessage <Увімкнути / Вимкнути / Показати встановлене повідомлення> <повідомлення>```\n{user} = Ім'я учасника\n{membercount} = Кількість учасників сервера\n{guild} = Назва сервера",
	setleavemessage_logs_embed_title_on_enable:
		"Журнал встановлення повідомлення при виході",
	setleavemessage_logs_embed_description_on_enable:
		"<@${authorId}> встановив повідомлення при виході!",
	setleavemessage_command_work_on_enable:
		"${emoji_Yes} | Успішно встановлено користувацьке повідомлення при виході.",
	setleavemessage_logs_embed_title_on_disable:
		"Журнал вимкнення повідомлення при виході",
	setleavemessage_logs_embed_description_on_disable:
		"<@${authorId}> видалив повідомлення при виході!",
	setleavemessage_command_work_on_disable:
		"${emoji_Yes} | Успішно видалено користувацьке повідомлення при виході.",
	setleavemessage_command_work_ls: "Повідомлення при виході:",
	setleavemessage_awaiting_response: "Напишіть повідомлення.",
	setup_not_admin:
		":x: | Для виконання цієї команди ви повинні бути адміністратором цього сервера!",
	setup_command_work: "${emoji_Yes} | Налаштування каналів",
	setup_command_error:
		"Бот вже налаштував канали для журналів! Або у бота немає дозволів...",
	setlogschannel_not_admin:
		":x: | Для виконання цієї команди ви повинні бути адміністратором цього сервера!",
	setlogschannel_not_specified_args:
		"Ви повинні вказати припустимий канал для вашого модуля.",
	setlogschannel_confirmation_message:
		"${emoji_Yes} | Тепер `${typeOfLogs}` налаштовано, встановлено користувачем <@${authorId}> !",
	setlogschannel_already_this_channel:
		"На цьому сервері вже є цей канал для журналів!",
	setlogschannel_already_deleted: "На цьому сервері вже немає `SERVER_LOGS`!",
	setlogschannel_command_error: "Помилка?",
	setlogschannel_command_work:
		"Ви успішно налаштували `${typeOfLogs}` в <#${argsidId}> !",
	setlogschannel_utils_command_work:
		"Ви успішно налаштували `${typeOfLogs}` в ${argsidId} !",
	setlogschannel_command_work_on_delete:
		"Ви успішно видалили всі `SERVER_LOGS` в **${guildName}**",
	setlogschannel_logs_embed_title: "Налаштування ServerLogs",
	setlogschannel_logs_embed_description_on_enable:
		"<@${authorId}> встановив `${typeOfLogs}` на <#${argsidId}>",
	setlogschannel_logs_embed_title_on_off: "Налаштування ServerLogs",
	setlogschannel_logs_embed_description_on_off:
		"<@${authorId}> видалив всі `SERVER_LOGS` на сервері!",
	setlogschannel_var_roles: "Логи ролей",
	setlogschannel_var_mods: "Логи модерації",
	setlogschannel_var_voice: "Логи Голосових каналів",
	setlogschannel_var_msg: "Логи повідомлень",
	setlogschannel_var_boost: "Логи Бустів",
	setlogschannel_var_tickets: "Логи Тікетів",
	setlogschannel_var_antispam: "Логи Антиспаму",
	setlogschannel_var_channel: "Логи каналів",
	setlogschannel_var_confession: "Логи зізнань",
	setlogschannel_var_economy: "Логи економіки",
	setlogschannel_all_already_exist: "Усі канали логів уже налаштовано!",
	setlogschannel_bot_missing_channel_permissions:
		"${emoji_No} | Я не можу надсилати логи в ${channel}, мені бракує там таких дозволів: ${permissions}.",
	setlogschannel_bot_missing_permissions:
		"${emoji_No} | Я не можу створити канали логів, мені бракує таких дозволів: ${permissions}.",
	joinghostping_add_already_set: "Канал ${channel} вже встановлено!",
	joinghostping_add_sent_to_channel:
		"Тепер, коли учасник приєднується до сервера, я надішлю привітальне повідомлення **сюди**.",
	joinghostping_add_ok_embed_title: "Модуль Join GhostPing",
	joinghostping_add_ok_embed_desc:
		"Тепер, коли учасник приєднується до сервера, я буду надсилати привітальне повідомлення в цей канал!",
	joinghostping_add_ok_embed_fields_name: "Всі канали",
	joinghostping_add_logs_embed_title: "Журнали Join GhostPing",
	joinghostping_add_logs_embed_desc:
		"${author} додав ${channel} до модуля Join GhostPing!",
	joinghostping_remove_isnt_set: "Канал ${channel} не встановлено!",
	joinghostping_remove_ok_embed_desc:
		"Канали були видалені з модуля Join GhostPing!",
	joinghostping_remove_logs_embed_desc:
		"${author} видалив ${channel} з модуля Join GhostPing!",
	automod_panel_title: "Панель керування AutoMod",
	automod_panel_desc:
		"Налаштуйте кожне правило AutoMod від iHorizon: увімкніть або вимкніть його, задайте канал логів і виберіть ролі, яким дозволено його оминати.",
	automod_panel_overview_title: "Захисні правила",
	automod_panel_select_placeholder: "Виберіть правило для налаштування",
	automod_panel_label_logs: "Канал логів",
	automod_panel_label_bypass: "Ролі-винятки",
	automod_panel_label_mention_limit: "Ліміт згадок",
	automod_panel_rule_spam_name: "Спам повідомленнями",
	automod_panel_rule_spam_desc:
		"Блокує флуд і повторювані повідомлення на сервері.",
	automod_panel_rule_mass_mention_name: "Масові згадки",
	automod_panel_rule_mass_mention_desc:
		"Блокує повідомлення з надмірною кількістю згадок.",
	automod_panel_rule_antipub_name: "Посилання та реклама",
	automod_panel_rule_antipub_desc:
		"Блокує рекламні посилання, з безпечним списком дозволених (GitHub, Tenor, YouTube, ...).",
	automod_panel_rule_media_name: "Запрошення Discord",
	automod_panel_rule_media_desc:
		"Блокує посилання-запрошення на сервери Discord у повідомленнях.",
	automod_panel_rule_telegram_name: "Посилання Telegram",
	automod_panel_rule_telegram_desc:
		"Блокує посилання Telegram (t.me, telegram.me, tg://...).",
	automod_panel_logs_placeholder:
		"Виберіть канал, куди надходитимуть логи цього правила",
	automod_panel_bypass_placeholder: "Виберіть ролі, які оминають це правило",
	automod_panel_enable_button: "Увімкнути",
	automod_panel_disable_button: "Вимкнути",
	automod_panel_back_button: "Назад",
	automod_panel_refresh_button: "Оновити",
	automod_panel_close_button: "Закрити панель",
	automod_panel_rule_enabled: "Правило **${rule}** тепер увімкнено!",
	automod_panel_rule_disabled: "Правило **${rule}** тепер вимкнено!",
	automod_panel_bypass_saved: "Ролі-винятки для **${rule}** оновлено!",
	automod_panel_logs_saved:
		"Логи **${rule}** тепер надсилаються в ${channel}.",
	automod_panel_logs_reset: "Канал логів **${rule}** прибрано!",
	automod_panel_api_error:
		"Не вдалося застосувати цю зміну. Переконайтеся, що в мене є дозвіл `Керувати сервером` і що стандартні правила AutoMod від Discord вимкнено, а тоді спробуйте ще раз.",
	too_new_account_dont_specified_time_on_enable:
		"Ви не вказали час. Для включення цього модуля необхідний мінімальний вік облікового запису!",
	too_new_account_invalid_time_on_enable:
		"Введений вами час недійсний! **Приклад допустимого часу**: `3h; 30m; 4w; 4y` -> 3 години; 30 хвилин; 4 тижні; 4 роки",
	too_new_account_logEmbed_title: "Модуль TooNewAccount",
	too_new_account_logEmbed_desc_on_enable:
		"${author} увімкнув(-ла) модуль TooNewAccount. Тепер акаунтам має бути щонайменше ${beautifulTime}, а користувача буде заблоковано, щойно він зайде `${maxJoin}`-й раз.",
	too_new_account_command_work_on_enable:
		"${author}, нові учасники, які приєдналися до **${guildName}** з обліковими записами молодше `${beautifulTime}`, будуть видалені.",
	too_new_account_command_work_on_enable2:
		"\n-# ${emoji_Sparkles} Після того як акаунт зайде на сервер **`${maxJoin}`** разів, його буде забанено.",
	too_new_account_logEmbed_desc_on_disable: "${author} вимкнув модуль!",
	too_new_account_command_work_on_disable:
		"${author}, модуль успішно вимкнено. Дати створення нових облікових записів учасників більше не будуть перевірятися.",
	guildconfig_setbot_footername_footer_too_long_msg:
		"Футер бота задовгий, він виглядатиме надто негарно.",
	guildconfig_setbot_footername_is_good:
		"Успішно змінено, усі ембеди iHorizon використовуватимуть `${footerName}` як футер!",
	guildconfig_setbot_footername_is_reset:
		"Назву футера видалено. Тепер усі ембеди iHorizon використовуватимуть `ім'я бота`.",
	guildconfig_setbot_footername_not_found:
		"Назву футера не знайдено. Спробуйте ще раз!",
	guildconfig_setbot_footeravatar_is_good:
		"Успішно змінено, усі ембеди iHorizon використовуватимуть `зображення` як футер!",
	guildconfig_setbot_footeravatar_incorect:
		"Файл не є зображенням. Спробуйте ще раз із зображенням.",
	guildconfig_setbot_footeravatar_is_reset:
		"Аватар футера видалено. Тепер усі ембеди iHorizon використовуватимуть `аватар бота`.",
	guildconfig_setbot_prefix_prefix_now_mention:
		"Тепер префікс бота для текстових команд — згадка! `@Ping-Me`",
	guildconfig_setbot_prefix_prefix_specify_prefix:
		"Вам потрібно вказати префікс бота.",
	guildconfig_setbot_prefix_prefix_too_long:
		"Префікс бота задовгий, ним буде надто незручно користуватися.",
	guildconfig_setbot_prefix_prefix_is_good:
		"Префікс бота успішно змінено, тепер текстові команди працюють із: `${formatedPrefix}`",
	guildconfig_config_save_check_dm:
		"Перевірте особисті повідомлення. Якщо ви не отримали повідомлення, перевірте, чи дозволені у вас особисті повідомлення.",
	guildconfig_config_save_user_msg:
		"Це резервна копія налаштувань `${guildName}`!",
	guildconfig_config_save_user_msg_2:
		"Ось посилання для завантаження резервної копії сервера!\n",
	guildconfig_config_restore_err_msg:
		"Під час завантаження файлу сталася помилка.",
	guildconfig_config_restore_msg: "Дані записано в мою базу даних.",
	guildconfig_config_restore_wrong_guild:
		"Ця резервна копія не належить цьому серверу або недійсна, тому її не відновлено.",
	perm_add_args_error:
		"Ви не вказали команди для зміни або дозвіл, який треба встановити.",
	perm_list_embed_title: "Усі дозволи користувачів:",
	perm_list_unknown_user: "Невідомий користувач (ID: ${userId})",
	perm_list_no_user: "Користувачів не знайдено",
	var_command: "Команда",
	var_subcommand: "Підкоманда",
	var_subcommand_group: "Група підкоманд",
	var_unreachable_command: "Команду не знайдено",
	perm_list_no_command_set:
		"На цьому сервері немає команд з особливими дозволами!",
	perm_set_deleted: "Дозвіл ${user} **видалено**!",
	perm_set_ok: "Дозвіл ${user} змінено на **`${perm}`**",
	perm_set_warn_message:
		"${author}, ви не можете видати дозвіл, вищий за ваш або рівний йому!",
	perm_set_chng_perm_lvl: "Змінено рівень дозволу",
	perm_set_add_role: "Додано роль",
	perm_set_add_usr: "Додано користувача",
	perm_rmv_role: "Прибрано роль",
	perm_rmv_usr: "Прибрано користувача",
	perm_set_command_reset: "Цю команду скинуто",
	perm_set_no_modified: "Жодного дозволу не змінено",
	perm_command_delete_dont_exist:
		"Для вказаної команди не встановлено жодних дозволів.",
	perm_command_delete_command_deleted:
		"Видалено дозволи для команди: `${commands}`",
	perm_command_delete_specify_command:
		"Вам потрібно вказати команду, щоб видалити її дозволи.",
	perm_command_delete_all_one:
		"Вам потрібно вказати один параметр, щоб видалити дозвіл.",
	perm_command_delete_all_one_option:
		"Щоб видалити дозвіл, можна вказати лише один параметр.",
	perm_command_delete_all_zero_change:
		"Вказаний тип дозволу не використовується в жодній команді.",
	perm_command_delete_all_command_ok:
		"\nУспішно видалено з бази даних вкладені дозволи `${type}` (${value}): **${changeCount}**.",
	commandlimit_current_value: "${count} використ. за ${time}",
	commandlimit_invalid_value:
		"Вказані значення ліміту частоти для команди недійсні.",
	commandlimit_missing_command: "Вам потрібно вказати команду.",
	commandlimit_set_success:
		"Ліміт частоти для `${command}` встановлено на `${limit}`.",
	commandlimit_reset_success: "Ліміт частоти для `${command}` скинуто.",
	commandlimit_reset_missing:
		"Для `${command}` не налаштовано ліміту частоти.",
	commandlimit_list_title: "Налаштовані ліміти частоти команд",
	commandlimit_list_item: "- `${command}`: ${limit}",
	commandlimit_list_empty:
		"На цьому сервері не налаштовано лімітів частоти команд.",
	commandlimit_rate_limited:
		"Ви досягли ліміту для цієї команди. Спробуйте знову через ${time}.",
	perm_roles_created_role: "Створено такі ролі: ${roles}",
	perm_roles_already_upate: "Усі ролі вже існують і актуальні.",
	perm_roles_error: "Під час створення або оновлення ролей сталася помилка.",
	perm_roles_not_owner:
		"Лише власник сервера може додавати ролі рівнів дозволів.",
	perm_edit_roles_command_ok:
		"Для дозволу ${permName} роль змінено на ${strRole}",
	toggle_react_command_work:
		"<@${authorId}>, тепер, коли учасник надсилає вітальне повідомлення, бот **{activeMsg}**",
	toggle_react_doesnt_react: "більше не реагуватиме",
	toggle_react_react: "реагуватиме",
	remove_react_command_work:
		"<@${authorId}>, тепер, коли учасник надсилає `${message}`, бот **більше не реагуватиме**.",
	add_react_command_err_emojis: "Емодзі `{emoji}` для реакції недійсне!",
	add_react_command_err_message:
		"Ви маєте вказати повідомлення, яке викликатиме реакцію!",
	add_react_command_bad_word:
		"Це слово не можна використати для автоматичної реакції: воно не повинно містити крапку.",
	add_react_command_work:
		"<@${authorId}>, тепер, коли учасник надсилає `${message}`, бот **реагуватиме** {emoji}",
	list_react_nothing_found: "Даних не знайдено, спершу додайте їх.",
	list_react_embed_msg:
		"Коли хтось надсилає **`${key}`**, я **реагую** ${value}\n",
	autoreact_embed_title: "Налаштування автореакцій",
	autoreact_embed_desc:
		"Коли у вказаному каналі з'являється нове повідомлення, бот реагує на нього вказаними емодзі.",
	autoreact_embed_autofields_value: "Реакція: ${reaction}",
	autoreact_embed_autofields_none_value: "Автореакції не налаштовано.",
	autoreact_embed_footer:
		"Сторінка ${currentPage} з ${totalPage} • Усього: ${totalReact}",
	autoreact_btn_add_name: "Додати канал",
	autoreact_btn_remove_name: "Прибрати канал",
	autoreact_max_25: "Можна налаштувати щонайбільше 25 автореакцій.",
	autoreact_menu_add_place: "Виберіть канал для додавання",
	autoreact_awaiting1_msg:
		"Будь ласка, виберіть канал, який додати до модуля автореакцій.",
	autoreact_modal_title: "Налаштування AutoReact",
	autoreact_modal_fields1_label: "Реакція (емодзі)",
	autoreact_invalid_emoji: "Недійсне емодзі. Введіть дійсне емодзі.",
	autoreact_add_command_ok: "Автореакцію налаштовано.",
	autoreact_remove_not_found: "Автореакції не налаштовано.",
	autoreact_menu_remove_place: "Виберіть канал для видалення",
	autoreact_awaiting_remove_msg:
		"Будь ласка, виберіть канал, який прибрати з модуля автореакцій.",
	autoreact_remove_command_ok: "Автореакцію для цього каналу прибрано.",
	setmembercount_not_admin:
		":x: | Ви повинні бути адміністратором цього сервера, щоб використовувати цю команду!",
	setmembercount_helpembed_title:
		"Помічник з налаштування лічильника учасників!",
	setmembercount_helpembed_description:
		"/setmembercount <Увімкнути / Вимкнути> <Назва каналу>",
	setmembercount_helpembed_fields_name: "Як використовувати?",
	setmembercount_helpembed_fields_value:
		"{MemberCount} = кількість учасників на сервері\n{RolesCount} = кількість ролей\n{BotCount} = кількість ботів на сервері\n{ChannelCount} = кількість каналів на сервері\n{BoostCount} = кількість бустів сервера\n{VoiceCount} = кількість учасників у голосових каналах сервера\n{OnlineCount} = кількість учасників онлайн на сервері",
	setmembercount_logs_embed_title_on_enable:
		"Журнал встановлення лічильника учасників",
	setmembercount_logs_embed_description_on_enable:
		"<@${authorId}> встановив лічильник учасників на <#${channelId}> у `${messagei}`!",
	setmembercount_command_work_on_enable:
		"${emoji_Yes} | Лічильник учасників успішно встановлено.",
	setmembercount_command_work_on_disable:
		"${emoji_Yes} | Лічильник учасників успішно видалено.",
	setmembercount_logs_embed_title_on_disable:
		"Журнал видалення лічильника учасників",
	setmembercount_logs_embed_description_on_disable:
		"<@${authorId}> видалив лічильник учасників з цього сервера!",
	music_library_liked_name: "Вподобані треки",
	music_audio_unavailable:
		"🔄 Музичний сервер перезапускається. За кілька секунд ваша музика сама продовжиться з того ж місця, спробуйте трохи згодом.",
	music_requester_only:
		"${emoji_No} Це може зробити лише той, хто замовив цей трек, або керівник сервера.",
	music_manager_only: "${emoji_No} Це може зробити лише керівник сервера.",
	clear_queue_command_own:
		"${emoji_Security} Ваші треки прибрано з черги (${removed}). Треки інших слухачів залишаються.",
	music_cannot:
		"${emoji_No} Щоб використати цю команду, ви маєте бути в тому ж голосовому каналі, що й я!",
	p_not_in_voice_channel:
		"Ви повинні бути в голосовому каналі, щоб використовувати цю команду!",
	p_embed_title: "Немає результатів",
	p_not_allowed:
		"Посилання, яке ви відправили, не підтримується цим ботом. Будь ласка, використовуйте авторизовані музичні сервіси, такі як Deezer, Spotify, Soundcloud та інші.",
	p_attachment_too_large:
		"${emoji_No} Прикріплений файл перевищує ліміт 10 МБ і не може бути прочитаний.",
	loop_no_queue: "Відсутній список відтворення!",
	loop_command_work: "{mode} | Режим повторення оновлено",
	nowplaying_no_queue: "Зараз нічого не відтворюється",
	nowplaying_message_embed_title: "Зараз відтворюється",
	nowplaying_resume_button: "${author} **продовжив** відтворення музики!",
	nowplaying_pause_button: "${author} **поставив(ла) на паузу** музику!",
	nowplaying_lyrics_button: "Текст для цієї пісні не знайдено",
	nowplaying_stop_buttom: "${author} **зупинив(ла)** музику!",
	nowplaying_header: "Зараз грає в ${channel}",
	nowplaying_requested_by: "Замовив(-ла) ${user}",
	nowplaying_paused: "На паузі",
	nowplaying_live: "Пряма трансляція",
	nowplaying_volume: "Гучність ${volume}%",
	nowplaying_loop_off: "Повтор вимкнено",
	nowplaying_loop_track: "Повтор треку",
	nowplaying_loop_queue: "Повтор черги",
	nowplaying_queue_count: "У черзі: ${count}",
	nowplaying_up_next: "Далі: ${track}",
	nowplaying_queue_end: "Останній трек у черзі",
	nowplaying_ended: "Цей трек більше не грає.",
	nowplaying_button_pause: "Пауза",
	nowplaying_button_resume: "Продовжити",
	nowplaying_button_skip: "Пропустити",
	nowplaying_button_stop: "Стоп",
	nowplaying_button_lyrics: "Текст",
	nowplaying_button_open: "Відкрити",
	nowplaying_skip_button: "${author} **пропустив(-ла)** трек!",
	nowplaying_loop_button: "${author} змінив(-ла) режим повтору: **${mode}**",
	pause_no_queue:
		"${emoji_Warning_Icon} - Ви не перебуваєте в голосовому каналі!",
	pause_nothing_playing: "Зараз нічого не відтворюється",
	pause_var_paused: "Пауза",
	pause_var_err: "Щось пішло не так",
	resume_nothing_playing: "Зараз нічого не відтворюється",
	resume_command_work: "Успішно відновлено",
	skip_not_in_voice_channel:
		"${emoji_Warning_Icon} - Ви не перебуваєте у голосовому каналі!",
	skip_nothing_playing: "Зараз нічого не відтворюється",
	skip_command_work: "Пропущено {queue}",
	stop_nothing_playing: "Зараз нічого не відтворюється",
	stop_command_work: "Чергу зупинено",
	queue_iam_not_voicec: "Я не знаходжусь у голосовому каналі",
	queue_no_queue: "Черги немає",
	queue_title: "Черга",
	queue_time_left: "Залишилось ${duration}",
	queue_now_playing: "Зараз грає",
	queue_up_next: "Далі",
	queue_page: "Сторінка ${page}/${pages}",
	queue_button_shuffle: "Перемішати",
	queue_button_refresh: "Оновити",
	queue_jump_placeholder: "Перейти до треку…",
	queue_shuffled: "${author} **перемішав(-ла)** чергу!",
	queue_jumped: "${author} перейшов(-ла) до ${track}!",
	shuffle_no_queue: "Я не знаходжуся у голосовому каналі",
	shuffle_no_enought: "Недостатньо треків у черзі для перемішування",
	shuffle_command_work: "Я **перемішав** чергу",
	history_no_entries: "У цьому конкурсі немає записів.",
	history_title: "Нещодавно грало на ${guild}",
	history_summary: "Треків: ${count}, ${duration} музики за останні 30 днів",
	history_top_artist:
		"Найпопулярніший виконавець: **${artist}** (прослуховувань: ${count})",
	history_top_listener: "Найбільше замовлень: ${user} (${count})",
	history_legacy_note:
		"Записано до того, як почали зберігатися подробиці треків:",
	history_page: "Сторінка ${page} з ${pages}",
	history_kept: "Зберігається 30 днів",
	history_button_previous: "Назад",
	history_button_next: "Далі",
	history_button_export: "Експорт",
	history_button_clear: "Очистити",
	history_clear_confirm:
		"${emoji} Очистити всю музичну історію цього сервера? Це неможливо скасувати.",
	history_button_confirm_clear: "Очистити історію",
	history_button_cancel: "Скасувати",
	history_cleared: "${emoji} Музичну історію цього сервера очищено.",
	history_clear_forbidden:
		"${emoji} Щоб очистити історію, вам потрібен дозвіл «Керувати сервером».",
	history_not_yours:
		"${emoji} Ці кнопки належать тому, хто відкрив цю історію. Виконайте /music history, щоб отримати власну.",
	history_export_ready: "${emoji} Уся історія, від найновішого:",
	lyrics_embed_title_unknown: "Невідомий заголовок",
	lyrics_embed_author_name_unknown: "Невідомий автор",
	lyrics_not_found: "Тексти не знайдено",
	clear_queue_command_ok:
		"${emoji_Security} | Музичну чергу на цьому Discord-сервері було очищено.",
	music_lyrics: "Текст пісні",
	music_volume_command_ok:
		"${emoji_Yes} **гучність встановлено на** `${query}`%",
	music_apo_download_failed:
		"${emoji_No} | Не вдалося завантажити файл, спробуйте ще раз.",
	music_apo_no_node: "${emoji_No} | Зараз не під'єднано жодного аудіовузла.",
	music_apo_unsupported:
		"${emoji_No} | Цей аудіовузол не підтримує фільтри APO (потрібен Wavyzon із плагіном `apo`).",
	music_apo_invalid:
		"${emoji_No} | Аудіовузол відхилив цю конфігурацію: `${error}`",
	music_apo_warnings: "Пропущені рядки (${count}):",
	end_not_admin:
		"Для завершення цієї розіграшу призів вам потрібні дозволи на керування повідомленнями.",
	end_not_find_giveaway: "Не вдалося знайти розіграш для `${gw}`.",
	end_confirmation_message:
		"Розіграш завершиться менш ніж через (${timeEstimate}) секунд...",
	end_logs_embed_title: "Журнали завершення розіграшу призів",
	end_logs_embed_description:
		"<@${authorId}> завершив розіграші з ідентифікатором: ${messageId}",
	end_command_error: "Цей розіграш вже завершено!",
	start_not_perm:
		"Для початку розіграшу призів вам потрібні дозволи на керування повідомленнями.",
	start_is_not_valid: "Ви повинні вказати допустиму кількість переможців!",
	start_confirmation_command:
		"Розіграш розпочався у каналі ${giveawayChannel}!",
	start_logs_embed_title: "Журнали початку розіграшу призів",
	start_logs_embed_description:
		"<@${authorId}> розпочав розіграш у каналі: ${giveawayChannel}",
	start_time_not_valid:
		"${author}, вказаний вами час розіграшу недійсний, будь ласка, спробуйте ще раз!",
	start_invalid_invites_req_value:
		"${emoji_No} | Значення для 'invites' недійсне! Ви маєте вказати кількість запрошень для участі в розіграші!",
	start_invalid_messages_req_value:
		"${emoji_No} | Значення для 'messages' недійсне! Ви маєте вказати кількість повідомлень для участі в розіграші!",
	start_invalid_roles_req_value:
		"${emoji_No} | Роль для 'roles' не знайдено! Ви маєте вказати ID ролі для участі в розіграші!",
	reroll_not_perm:
		"Для перезапуску цієї розіграшу призів вам потрібні дозволи на керування повідомленнями.",
	reroll_dont_find_giveaway: "Не вдалося знайти розіграш для `{args}`.",
	reroll_command_work: "Розіграш призів перезапущено!",
	reroll_logs_embed_title: "Журнали розіграшу призів",
	reroll_logs_embed_description:
		"<@${authorId}> перезапустив розіграш з ідентифікатором: ${messageId}",
	reroll_command_error: "Помилка!",
	reroll_giveaway_not_over: "Цей розіграш ще не завершено!",
	gw_getall_embed_title: "Список розіграшів для ${guildName}",
	gw_getall_embed_fields:
		"${Channel} [Переглянути тут](${MessageURL}) \n**Закінчується через** ${ExpireIn}",
	gw_getdata_embed_title: "Інформація про розіграш!",
	gw_getdata_embed_fields_channel: "Канал",
	gw_getdata_embed_fields_amountWinner: "Кількість переможців",
	gw_getdata_embed_fields_value_amountWinner:
		"`${winnerCount}` переможець(ів)",
	gw_getdata_embed_fields_prize: "Приз",
	gw_getdata_embed_fields_value_prize: "`${prize}`",
	gw_getdata_embed_fields_hostedBy: "Організатор",
	gw_getdata_embed_fields_isEnded: "Завершено?",
	gw_getdata_embed_fields_isValid: "Дійсно?",
	gw_getdata_embed_fields_time: "Закінчується о",
	gw_getdata_embed_fields_entriesAmount: "Кількість учасників",
	gw_getdata_embed_fields_winners: "Переможець(і)",
	gw_getdata_embed_fields_value_entriesAmount:
		"**${entries}** (використовуйте `/gw list-entries giveaway-id:${giveawayId}` для отримання додаткової інформації)",
	gw_getdata_yes: "`Так`",
	gw_getdata_no: "`Ні`",
	gw_doesnt_exit: "Розіграш недоступний або не існує.",
	gw_go_panel_title: "Панель розіграшу",
	gw_go_panel_desc:
		"Підготуйте розіграш нижче, а потім запустіть його. Змінюйте кожне налаштування через меню.",
	gw_go_select_placeholder: "Змінити налаштування",
	gw_go_opt_prize: "Приз",
	gw_go_opt_duration: "Тривалість",
	gw_go_opt_winners: "Переможці",
	gw_go_opt_requirement: "Умова участі",
	gw_go_opt_image: "Зображення для попереднього перегляду",
	gw_go_channel_placeholder: "Канал розіграшу",
	gw_go_launch_buttontitle: "Запустити",
	gw_go_cancel_buttontitle: "Скасувати",
	gw_go_req_none: "Немає",
	gw_go_req_invites: "Запрошення",
	gw_go_req_messages: "Повідомлення",
	gw_go_req_roles: "Ролі",
	gw_go_req_value_dsc: "Потрібне значення: **${value}**",
	gw_go_started: "Розіграш запущено в ${channel}!",
	gw_go_cancelled: "Панель закрито, нічого не запущено.",
	gw_go_expired: "Термін дії панелі сплив до запуску розіграшу.",
	gw_go_need_prize:
		"${emoji_No} | Перед запуском розіграшу потрібно задати приз!",
	gw_go_need_duration:
		"${emoji_No} | Перед запуском розіграшу потрібно задати дійсну тривалість!",
	gw_go_need_winners:
		"${emoji_No} | Перед запуском розіграшу потрібно задати дійсну кількість переможців!",
	gw_go_channel_error:
		"${emoji_No} | У вибраний канал не можна надсилати повідомлення!",
	gw_go_invalid_image: "${emoji_No} | Ця URL-адреса зображення недійсна!",
	gw_go_modal_prize: "Вказати приз",
	gw_go_modal_prize_label: "Приз",
	gw_go_modal_duration: "Вказати тривалість",
	gw_go_modal_duration_label: "Тривалість (наприклад: 2d або 12h30)",
	gw_go_modal_winners: "Вказати кількість переможців",
	gw_go_modal_winners_label: "Кількість переможців",
	gw_go_modal_req_title: "Умова участі",
	gw_go_modal_req_type_label: "Тип умови",
	gw_go_modal_req_value_label: "Значення умови (ID ролі або число)",
	gw_go_modal_image: "Вказати зображення попереднього перегляду",
	gw_go_modal_image_label: "URL зображення",
	ban_not_permission:
		"${emoji_No} | У вас немає дозволу на блокування учасників.",
	ban_dont_found_member: "🔍 | Не вдалося знайти цього учасника",
	ban_dont_have_perm_myself:
		"${emoji_No} | У мене немає дозволу на блокування учасників!",
	ban_try_to_ban_yourself:
		"${emoji_No} | Ви не можете заблокувати самих себе!",
	ban_attempt_ban_higter_member:
		"${emoji_Stop} Ви не можете заблокувати користувача з вищою роллю, ніж у вас...",
	ban_cant_ban_member: "${emoji_No} | Я не можу заблокувати цього учасника",
	ban_message_to_the_banned_member:
		"Вас заблоковано на сервері `${guildName}` з причини: **`${reason}`**",
	ban_command_work: "<@${memberId}> заблокований користувачем <@${authorId}>",
	ban_logs_embed_title: "Логи блокувань",
	ban_logs_embed_description:
		"<@${memberId}> заблокований користувачем <@${authorId}>",
	kick_not_permission:
		"${emoji_No} | У вас немає дозволу на вигнання учасників.",
	kick_dont_have_permission:
		"${emoji_No} | У мене немає дозволу на вигнання учасників!",
	kick_attempt_kick_your_self:
		"${emoji_No} | Ви не можете вигнати самих себе!",
	kick_attempt_kick_higter_member:
		"${emoji_Stop} Ви не можете вигнати користувача з вищою роллю, ніж у вас...",
	kick_message_to_the_banned_member:
		"Ви були вигнані з цього серверу: **${guildName}** користувачем `${authorUsername}`",
	kick_command_work: "${member} був вигнаний користувачем ${author}",
	kick_logs_embed_title: "Логи вигнань",
	kick_logs_embed_description:
		"${member} був вигнаний користувачем <@${authorId}>",
	clear_dont_have_permission:
		"${emoji_No} | У вас немає дозволу на керування повідомленнями (`MANAGE_MESSAGES`).",
	clear_max_message_limit:
		"${emoji_No} | Я не можу видалити більше 99 повідомлень за один раз!",
	clear_channel_message_deleted: "Видалено ${messageCount} повідомлень!",
	clear_logs_embed_title: "Логи видалення повідомлень",
	clear_logs_button_transcript: "Транскрипт",
	clear_logs_embed_description:
		"<@${authorId}> видалив ${messageCount} повідомлень в <#${channelId}>",
	clear_command_no_message: "У цьому каналі немає повідомлень для видалення",
	lock_dont_have_permission:
		"${emoji_No} | У вас немає дозволу на блокування каналів.",
	lock_logs_embed_title: "Логи блокування каналів",
	lock_logs_embed_description:
		"<@${authorId}> заблокував канал <#${channelId}>",
	unlock_dont_have_permission:
		"${emoji_No} | У вас немає дозволу на розблокування каналу.",
	unlock_logs_embed_title: "Логи розблокування каналів",
	unlock_logs_embed_description:
		"<@${authorId}> розблокував канал <#${channelId}>",
	lockall_dont_have_permission:
		"${emoji_No} | У вас немає дозволу на блокування всіх каналів.",
	lockall_logs_embed_title: "Логи блокування всіх каналів",
	lockall_logs_embed_description: "<@${authorId}> заблокував всі канали!",
	unlockall_logs_embed_title: "Логи Unlockall",
	unlockall_logs_embed_description:
		"<@${authorId}> розблокував(-ла) всі канали!",
	unban_dont_have_permission:
		"${emoji_No} | У вас немає дозволу на розблокування учасників.",
	unban_bot_dont_have_permission: "${emoji_No} | У мене немає дозволу.",
	unban_there_is_nobody_banned:
		"${emoji_No} | **На цьому сервері немає забанених учасників!**",
	unban_the_member_is_not_banned:
		"${emoji_No} | **Вказаний ID не забанений на цьому сервері**!",
	unban_logs_embed_title: "Логи розбанів",
	unban_logs_embed_description:
		"<@${userID}> тепер розбанений на сервері користувачем ${authorId}!",
	unban_reason: "Причина не вказана.",
	tempmute_dont_have_permission:
		"${emoji_No} | У вас немає дозволу на тимчасове блокування учасників.",
	tempmute_i_dont_have_permission: "${emoji_No} | У мене немає дозволу.",
	tempmute_cannot_mute_yourself:
		"${emoji_No} | Ви не можете тимчасово заблокувати самі себе!",
	tempmute_already_muted: "Цей користувач вже заблокований!",
	tempmute_unmuted_by_time: "<@${tomuteId}> був розблокований!",
	tempmute_logs_embed_title: "Логи тимчасової блокування",
	tempmute_logs_embed_description:
		"<@${authorId}> заглушив(-ла) <@${tomuteId}> на ${duration}\n**Причина**: `${reason}`",
	tempmute_reason_create_roles: "Створено роль для тимчасового блокування!",
	tempmute_tomute_is_admin:
		"${emoji_No} | Користувач має права адміністратора, я не можу його заглушити.",
	tempmute_tomute_highest_role_or_same:
		"${emoji_No} | **Моя роль на цьому сервері нижча або дорівнює ролі ${tomute}. Я не можу модерувати цього учасника.**",
	tempmute_cannot_mute_higher_role:
		"${emoji_No} | **Роль ${tomute} вища за вашу або дорівнює їй. Ви не можете дати тайм-аут цьому учаснику.**",
	moderation_target_higher_role:
		"${emoji_No} | **Роль ${member} вища за вашу або дорівнює їй. Ви не можете зробити це з цим учасником.**",
	tempmute_tomute_max_time_passed:
		"\n-# ${emoji_VC_OpenChat} Discord обмежує мут 28 днями. Я застосував 28 днів.",
	temprole_dont_have_permission:
		"${emoji_No} | У вас немає дозволу додавати учасникам тимчасові ролі.",
	temprole_i_dont_have_permission: "${emoji_No} | У мене немає дозволу.",
	temprole_cannot_add_yourself:
		"${emoji_No} | Ви не можете додати тимчасову роль собі!",
	temprole_already_has_role: "Цей користувач уже має цю тимчасову роль!",
	temprole_removed_by_time: "Тимчасову роль <@${tomuteId}> знято!",
	temprole_logs_embed_title: "Логи Temprole",
	temprole_logs_embed_description:
		"<@${authorId}> додав(-ла) тимчасову роль <@${tomuteId}> на ${duration}\n**Причина**: `${reason}`",
	temprole_tomute_is_admin:
		"${emoji_No} | Користувач має права адміністратора, я не можу додати йому тимчасову роль.",
	temprole_tomute_highest_role_or_same:
		"${emoji_No} | **Моя роль на цьому сервері нижча або дорівнює ролі ${tomute}. Я не можу модерувати цього учасника.**",
	temprole_tomute_max_time_passed:
		"\n-# ${emoji_VC_OpenChat} Максимальний час тимчасової ролі — 1 рік. Я застосував 1 рік.",
	unmute_dont_have_permission:
		"${emoji_No} | У вас немає дозволу на розблокування учасників.",
	unmute_attempt_mute_your_self:
		"${emoji_No} | Ви не можете розблокувати самі себе!",
	unmute_i_dont_have_permission: "${emoji_No} | У мене немає дозволу.",
	unmute_not_muted: "Цей користувач не заблокований!",
	unmute_muted_role_doesnt_exist:
		"Роль `muted` не існує. Будь ласка, заблокуйте користувача **перед** створенням ролей для блокування...",
	unmute_logs_embed_title: "Логи розблокування",
	unmute_logs_embed_description: "<@${authorId}> розблокував <@${tomuteId}>",
	unmuteall_no_muted_members: "Заглушених учасників не знайдено.",
	unmuteall_audit_reason: "Зняти заглушення з усіх",
	unmuteall_logs_embed_title: "Логи масового зняття заглушення",
	unmuteall_logs_embed_description:
		"<@${authorId}> зняв заглушення з ${unmuted}/${total} учасників.",
	warn_dont_have_permission:
		"${emoji_No} | У вас немає дозволу видавати попередження учасникам на цьому сервері Discord.",
	unwarn_cannot_found:
		"${emoji_No} Схоже, у ${member} немає жодного попередження в моїй базі даних!",
	unwarn_cannot_found_id:
		"${emoji_No} ${member}, вказаного ID попередження немає в моїй базі даних",
	unwarn_logEmbed_title: "Логи UnWarn",
	unwarn_logEmbed_desc: "${author} зняв(-ла) попередження з ${member}",
	unwarn_dont_have_permission:
		"${emoji_No} | У вас немає дозволу знімати попередження з учасників на цьому сервері Discord.",
	warnlist_no_data:
		"${emoji_No} Схоже, у ${member} немає жодного попередження в моїй базі даних!",
	warnlist_dont_have_permission:
		"${emoji_No} | У вас немає дозволу керувати попередженнями учасників на цьому сервері Discord.",
	clear_allwarns_confirmation_message:
		"**Ви справді впевнені, що хочете видалити всі дані про попередження?\nЦя дія остаточна, і скасувати її неможливо.**\n**Ця дія руйнівна!!**",
	clear_allwarns_command_ok:
		"Усі попередження на цьому сервері Discord видалено.",
	baninfo_not_banned: "Користувача не заблоковано",
	baninfo_user_not_found: "Користувача не знайдено",
	var_banned_by: "Заблокував(-ла)",
	var_ban_date: "Дата бану",
	tempban_dont_have_permission:
		"У вас немає дозволу тимчасово блокувати учасників.",
	tempban_i_dont_have_permission: "У мене немає дозволу блокувати учасників.",
	tempban_cannot_ban_yourself: "Ви не можете заблокувати себе!",
	tempban_already_banned: "Цього користувача вже тимчасово заблоковано!",
	tempban_unbanned_by_time: "**<@${userId}>** розблоковано!",
	tempban_logs_embed_title: "Логи Tempban",
	tempban_logs_embed_description:
		"**<@${executorId}>** тимчасово заблокував(-ла) **<@${userId}>** на **${duration}**\n**Причина**: `${reason}`",
	tempban_user_is_admin:
		"Користувач має права адміністратора, я не можу його заблокувати.",
	tempban_user_highest_role_or_same:
		"Моя роль на цьому сервері нижча або дорівнює ролі **${user}**. Я не можу модерувати цього учасника.",
	tempban_max_time_passed:
		"\n*Максимальний час тимчасового бану — 1 рік. Я застосував 1 рік.*",
	tempban_user_not_in_guild:
		"Цього користувача немає на сервері, але його все одно можна заблокувати.",
	backup_wait_please: "⏲ Зачекайте, будь ласка...",
	backup_not_admin:
		":x: | Ви повинні бути адміністратором сервера, щоб запросити створення резервної копії!",
	backup_i_dont_have_permission: "У мене немає дозволу `АДМІНІСТРАТОР`",
	backup_command_work_on_creation:
		":white_check_mark: Резервне копіювання успішно створено.",
	backup_command_work_info_on_creation:
		"Резервна копія створена! ID: `${id}`!",
	backup_logs_embed_title_on_creation: "Журнали створення резервної копії",
	backup_logs_embed_description_on_creation:
		"<@${authorId}> Створено резервне копіювання!",
	backup_dont_have_perm_on_load:
		":x: | Ви повинні бути адміністратором сервера, щоб завантажити резервну копію!",
	backup_i_dont_have_perm_on_load: "У мене немає дозволу `АДМІНІСТРАТОР`",
	backup_unvalid_id_on_load:
		":x: | Ви повинні вказати дійсний ID резервної копії!",
	backup_waiting_on_load: "${emoji_Yes} - Завантаження...",
	backup_error_on_load:
		":x: | Вибачте, сталася помилка... Будь ласка, перевірте, що у мене є права адміністратора!",
	backup_error_when_fetch_backup_on_load:
		":x: | Резервна копія не знайдена для ${backupID}!",
	backup_this_is_not_your_backup: "${emoji_No} | Це не ваша резервна копія!",
	backup_backup_doesnt_exist: "Помилка? Резервна копія не існує.",
	backup_string_see_v:
		":placard:・Кількість категорій: `${categoryCount}`\n:hash:・Кількість каналів: `${channelCount}`",
	backup_all_of_your_backup: "**Всі ваші резервні копії:**",
	backup_string_see_another_v:
		":placard:・Кількість категорій: `${categoryCount}`\n:hash:・Кількість каналів: `${channelCount}`",
	backup_load_confirm:
		"${author},\n# НАДЗВИЧАЙНО НЕБЕЗПЕЧНА ДІЯ\n# Ви впевнені, що хочете завантажити цю резервну копію?\nВона замінить усі поточні канали, ролі, емодзі, бани, налаштування... вашого сервера.\nЦЮ ДІЮ НЕМОЖЛИВО СКАСУВАТИ!",
	backup_not_load:
		"Резервну копію не завантажено, дію скасовано на ваш запит.",
	backup_really_want:
		"${emoji_Warning_Icon} Ви дійсно бажаєте видалити цей резервний файл?",
	backup_confirm_button: "Так, видалити цей резервний файл",
	backup_cancel_button: "Скасувати дію",
	backup_embed_title_succefully_deleted:
		"${emoji_Yes} Резервну копію успішно видалено!",
	backup_embed_title_cancel_deletion:
		"${emoji_Yes} Резервна копія збережена!",
	backup_embed_title_timesup_deletion:
		"${emoji_No} Час вийшов. Резервна копія збережена!",
	backup_manage_nique_tes_mort:
		"Доступ заборонено. Ця команда доступна лише власнику сервера.\n# Ви не можете вимкнути захист резервних копій, щоб поставити під загрозу безпеку сервера.\n# Будь-яку спробу зловживання буде зафіксовано й заблоковано.",
	backup_manage_admin: "усі адміністратори",
	backup_manage_owner: "власник сервера",
	backup_manage_command_ok:
		"Модуль резервних копій оновлено. Відтепер створювати й завантажувати резервні копії на цьому сервері можуть: ${allowed_user_string}.",
	backup_component_settings: "Налаштування сервера",
	backup_component_settings_desc:
		"Назва, зображення, рівні, системні канали, екран привітання",
	backup_component_roles: "Ролі",
	backup_component_roles_desc: "Порядок, кольори, іконки та дозволи",
	backup_component_channels: "Канали",
	backup_component_channels_desc:
		"Категорії, текстові, голосові канали, форуми та гілки",
	backup_component_permissions: "Дозволи каналів",
	backup_component_permissions_desc:
		"Перевизначення для ролей і учасників у кожному каналі",
	backup_component_emojis: "Емодзі",
	backup_component_emojis_desc: "Усі власні емодзі сервера",
	backup_component_stickers: "Стікери",
	backup_component_stickers_desc: "Статичні й анімовані стікери сервера",
	backup_component_bans: "Бани",
	backup_component_bans_desc: "Заблоковані користувачі та причини",
	backup_component_automod: "Правила AutoMod",
	backup_component_automod_desc: "Вбудовані правила модерації Discord",
	backup_component_events: "Події",
	backup_component_events_desc: "Заплановані події сервера",
	backup_component_messages: "Повідомлення",
	backup_component_messages_desc: "Останні 100 повідомлень кожного каналу",
	backup_component_members: "Учасники",
	backup_component_members_desc: "Нікнейми та ролі поточних учасників",
	backup_select_placeholder: "Виберіть, що включити",
	backup_usage: "Використано резервних копій: ${count}/${max}",
	backup_limit_reached:
		"Ви досягли ліміту в **${max} резервних копій**. Спершу видаліть одну через `/backup delete`.",
	backup_busy:
		"Операція з резервною копією вже виконується, спробуйте трохи згодом.",
	backup_panel_expired:
		"Термін дії цієї панелі минув, запустіть команду ще раз.",
	backup_btn_create: "Створити резервну копію",
	backup_btn_all: "Вибрати все",
	backup_btn_load: "Очистити й відновити",
	backup_btn_schedule_save: "Зберегти розклад",
	backup_btn_schedule_disable: "Вимкнути",
	backup_create_title: "Нова резервна копія",
	backup_create_desc: "Виберіть, що зберегти з **${guildName}**.",
	backup_create_progress:
		"${emoji} Створюю резервну копію, це може зайняти деякий час...",
	backup_create_cancelled: "Створення резервної копії скасовано.",
	backup_create_failed:
		"Не вдалося зберегти резервну копію. До вашого списку нічого не додано.",
	backup_created_title: "Резервну копію створено",
	backup_created_desc:
		"ID вашої резервної копії — `${id}`. Використовуйте його з `/backup load`.",
	backup_created_partial:
		"**Не вдалося зберегти, тож не буде відновлено:** ${parts}",
	backup_load_title: "Відновити резервну копію",
	backup_load_desc: "Резервна копія **${guildName}**, створена ${date}.",
	backup_load_warning:
		"**Це неможливо скасувати.** Усе вибране буде видалено з цього сервера, а потім відновлено. Ролі зіставляються за назвою й оновлюються, тож учасники їх зберігають; ролі, яких немає в резервній копії, видаляються лише тоді, коли відновлюються й канали.",
	backup_load_progress:
		"${emoji} Відновлюю, це може зайняти кілька хвилин...",
	backup_load_done_title: "Резервну копію відновлено",
	backup_load_done_desc: "**${guildName}** відновлено.",
	backup_load_report_line: "${emoji} **${label}**: відновлено ${okCount}",
	backup_load_report_failed: "(${failedCount} з помилкою)",
	backup_list_title: "Ваші резервні копії",
	backup_list_empty:
		"У вас ще немає резервних копій. Створіть її через `/backup create`.",
	backup_list_entry:
		"**${guildName}** · ${mode} · ${date}\n`${id}`\nКатегорій: ${categoryCount}, каналів: ${channelCount}",
	backup_list_manual: "Вручну",
	backup_list_auto: "Автоматично",
	backup_delete_title: "Видалити цю резервну копію?",
	backup_delete_desc:
		"**${guildName}** `${id}`\nКатегорій: ${categoryCount}, каналів: ${channelCount}",
	backup_delete_done: "Резервну копію видалено.",
	backup_delete_cancelled: "Резервну копію збережено.",
	backup_schedule_title: "Автоматичні резервні копії",
	backup_schedule_desc:
		"Вони зберігаються у вашому обліковому записі й враховуються у вашому ліміті. Зберігаються лише останні ${maxAuto} автоматичних резервних копій цього сервера.",
	backup_schedule_owner_only:
		"Лише власник сервера може планувати автоматичні резервні копії.",
	backup_schedule_status_on:
		"Увімкнено: **${frequency}**, наступна резервна копія ${next}",
	backup_schedule_status_off: "Автоматичних резервних копій не заплановано.",
	backup_schedule_frequency_placeholder: "Виберіть, як часто",
	backup_frequency_1d: "Щодня",
	backup_frequency_3d: "Кожні 3 дні",
	backup_frequency_1w: "Щотижня",
	backup_frequency_2w: "Кожні 2 тижні",
	backup_frequency_1m: "Щомісяця",
	backup_frequency_3m: "Кожні 3 місяці",
	backup_frequency_6m: "Кожні 6 місяців",
	backup_frequency_12m: "Щороку",
	backup_schedule_dm_limit:
		"Автоматичну резервну копію **${guildName}** пропущено: ви досягли ліміту в ${max} резервних копій. Видаліть одну через `/backup delete`.",
	backup_schedule_dm_failed:
		"Не вдалося створити автоматичну резервну копію **${guildName}**. Наступна спроба — у наступний запланований час.",
	reactionroles_dont_admin_added:
		":x: | Ви повинні мати права адміністратора сервера, щоб використовувати цю команду!",
	reactionroles_embed_message_description_added:
		"__як користуватися?__\n/rolesreaction add `<ID повідомлення>` `<реакція>` `<ID ролі>`\n/rolesreaction remove `<ID повідомлення>` `<реакція>`\n/rolesreaction list `<ID повідомлення>`",
	reactionroles_missing_reaction_added: "Відсутній аргумент: Емодзі реакції",
	reactionroles_invalid_emote_format_added:
		"${emoji_No} | Ви не можете надіслати мені `CUSTOM_EMOJI` у форматі `<::xxx>`! Мені потрібно лише їх ID!",
	reactionroles_logs_embed_title_added: "Логи реакцій на ролі",
	reactionroles_logs_embed_description_added:
		"<@${authorId}> встановив реакцію на ролі: Повідомлення: `${messagei}` | Реакція: `${reaction}` | Роль: ${role}",
	reactionroles_command_work_added:
		"${reaction} було додано до повідомлення ${messagei} для надання ролі ${role}",
	reactionroles_missing_remove: "`Відсутній аргумент: Емодзі реакції",
	reactionroles_missing_reaction_remove:
		"Реакція на ролі не знайдена в моїй базі даних...",
	reactionroles_cant_fetched_reaction_remove:
		"Не вдалося отримати вибрану реакцію в цьому повідомленні!",
	reactionroles_logs_embed_title_remove: "Логи реакцій на ролі",
	reactionroles_logs_embed_description_remove:
		"<@${authorId}> видалив реакцію на ролі: Повідомлення: `${messagei}` | Реакція: `${reaction}`",
	reactionroles_command_work_remove:
		"${reaction} було видалено з повідомлення ${messagei}",
	reactionroles_dont_message_found:
		"Я не можу отримати повідомлення з поточним",
	buttonreaction_logs_embed_title_added: "Логи ButtonReaction",
	buttonreaction_logs_embed_description_added:
		"<@${authorId}> налаштував(-ла) реакцію з кнопкою: Повідомлення: `${messagei}` | Реакція: `${reaction}` | Роль: ${role}",
	buttonreaction_dont_message_found:
		"Не вдається додати цю кнопку: схоже, ці ролі вже задано в одній з наявних кнопок!",
	buttonreaction_roles_not_found: "Бракує аргументів: ви не вказали ролі!",
	buttonreaction_message_other_user_error:
		"Я не можу змінювати компоненти повідомлення іншого користувача. Потрібно вибрати повідомлення, надіслане мною. Порада: скористайтеся `/utils embed`, щоб створити власний гарний ембед!",
	roleselect_invalid_message_id:
		"Вказано недійсний ID повідомлення. Будь ласка, вкажіть дійсний ID повідомлення.",
	roleselect_message_not_found:
		"Повідомлення не знайдено у вказаному каналі.",
	roleselect_default_placeholder: "Виберіть налаштовані ролі",
	roleselect_menu1_placeholder: "Виберіть дію",
	roleselect_menu1_add: "Додати варіант ролі",
	roleselect_menu1_remove: "Видалити варіант ролі",
	roleselect_menu1_change_placeholder: "Змінити підказку меню вибору",
	roleselect_menu1_save: "Зберегти й застосувати налаштування",
	roleselect_menu1_cancel: "Скасувати",
	roleselect_menu1_embed_title: "Налаштування RoleSelect",
	roleselect_menu1_embed_description:
		"Коли користувач вибирає пункти в меню вибору, він отримує відповідну роль",
	roleselect_modal1_title: "Додати варіант ролі",
	roleselect_modal1_fields1_label: "Емодзі",
	roleselect_modal1_fields1_placeholder:
		"Виберіть емодзі для цього варіанта ролі (необов’язково)",
	roleselect_modal1_fields2_label: "Назва варіанта",
	roleselect_modal1_fields2_placeholder: "Коротка назва варіанта ролі",
	roleselect_modal1_fields3_label: "Опис",
	roleselect_modal1_fields3_placeholder:
		"Опишіть варіант ролі (необов’язково)",
	roleselect_awaiting1_msg: "Виберіть роль для цього варіанта",
	roleselect_awaiting1_menu_placeholder: "Виберіть роль",
	roleselect_role_already_exist: "Ця роль уже є в налаштуваннях.",
	roleselect_no_role_found: "Немає варіантів ролей для видалення.",
	roleselect_all_role_removed: "Усі варіанти ролей видалено.",
	roleselect_last_role_removed: "Останній варіант ролі успішно видалено.",
	roleselect_save_command_ok: "Налаштування вибору ролей успішно збережено!",
	roleselect_failed_to_save_config:
		"Не вдалося зберегти налаштування. Будь ласка, спробуйте ще раз.",
	roleselect_canceled_command_ok: "Налаштування вибору ролей скасовано.",
	roleselect_modal2_title: "Підказка меню вибору",
	roleselect_modal2_label: "Підказка",
	roleselect_modal2_placeholder: "Підказка меню вибору",
	punishpub_not_admin:
		":x: | Ви повинні мати права адміністратора сервера, щоб використовувати ці команди!",
	punishpub_too_hight_enable: "Ваша сума занадто велика! Не рекомендується!",
	punishpub_negative_number_enable: "Ви не можете вводити від'ємні числа!",
	punishpub_zero_number_enable: "Число 0 неприпустиме!",
	punishpub_confirmation_message_enable:
		"Ви успішно **увімкнули** PunishPub з максимальною кількістю прапорців **${amount}** та покаранням **${punishement}** !",
	punishpub_logs_embed_title: "Логи PunishPub",
	punishpub_logs_embed_description:
		"<@${authorId}> увімкнув PunishPUB з кількістю прапорців ${amount} та покаранням ${punishement} !",
	punishpub_confirmation_disable: "Ви успішно вимкнули PunishPub",
	punishpub_logs_embed_title_disable: "Логи PunishPub",
	punishpub_logs_embed_description_disable:
		"<@${authorId}> вимкнув PunishPUB !",
	report_cooldown_command:
		"Вибачте, ви повинні зачекати **${time}** перед виконанням цієї команди!",
	report_owner_need:
		":x: | **Ви повинні бути власником сервера, щоб виконати цю команду!**",
	report_specify:
		"Будь ласка, уточніть помилку та сформулюйте хорошу пропозицію!",
	report_command_work: "**Дякуємо за надсилання помилки!**",
	support_not_admin:
		":x: | Ви повинні бути адміністратором сервера, щоб використовувати ці команди!",
	support_card_on_title: "Роль підтримки увімкнено",
	support_card_on_desc:
		"Учасники, які виконують умову, отримують ${role} і втрачають її, коли перестають.",
	support_card_condition: "Умова",
	support_card_keyword: "Шукається в статусі",
	support_card_role: "Роль",
	support_card_cond_bio: "Власний статус містить ключове слово",
	support_card_cond_tag: "Вони носять тег сервера",
	support_card_cond_both: "Ключове слово в статусі **і** тег сервера",
	support_card_cond_either: "Ключове слово в статусі **або** тег сервера",
	support_card_no_keyword:
		"Немає ключового слова й персонального запрошення: ніхто не може виконати умову статусу. Запустіть команду ще раз із ключовим словом.",
	support_card_footer:
		"Учасники в мережі, які вже виконують умову, отримують її зараз, далі — за кожної зміни статусу.",
	support_card_off_title: "Роль підтримки вимкнено",
	support_card_off_desc:
		"Роль більше ніхто не отримає. Хто її має, збережуть її.",
	support_command_not_role: ":x: | Ви не вказали роль!",
	support_command_not_type:
		":x: | Ви не вказали, який тип підтримки в профілі користувача вам потрібен (bio = біо, напр. посилання на сервер; tag = Discord-тег сервера)!",
	support_command_guild_not_have_tag: ":x: | Наразі сервер не має тегів.",
	updates_embed_title: "Оновлення iHorizon",
	updates_embed_description: "Ось останні зміни та оновлення iHorizon.",
	updates_field_version: "Версія",
	updates_field_commit: "Останній коміт",
	updates_field_branch: "Гілка",
	updates_field_links: "Посилання",
	updates_changelog_attached: "Повний список змін додано у форматі PDF.",
	newsletter_dm_title: "iHorizon {version} — примітки до випуску",
	newsletter_dm_body:
		"Вітаю, {owner}!\n\nРозгорнуто нову основну версію iHorizon.\n\n**Версія**: {version}\n**Випуск**: {releaseUrl}\n\nПовний список змін додано у форматі PDF.\n\nПотрібна допомога? Приєднуйтеся до нашого сервера підтримки: https://discord.gg/ihorizon\n-# Використовуйте +updates, щоб керувати підпискою, або кнопку нижче, щоб відписатися.",
	newsletter_btn_unsubscribe: "Відписатися від розсилки",
	newsletter_btn_subscribe: "Підписатися на розсилку",
	newsletter_not_owner:
		"Ахах, приємно знати, що вам настільки цікаво стежити за змінами в моєму коді в реальному часі :3\n\n**Але спершу додайте мене на сервер Discord:**\n\n<https://discord.com/oauth2/authorize?client_id=${clientId}>\n**Так я триматиму вас у курсі новин.**\n\n> Інший варіант: приєднайтеся до discord.gg/ihorizon. Мої засновники пінгують зі списком змін після кожного оновлення. Вирішувати вам :3",
	newsletter_toggle_enabled: "Сповіщення розсилки увімкнено.",
	newsletter_toggle_disabled: "Сповіщення розсилки вимкнено.",
	setserverlang_not_admin:
		":x: | Ви повинні бути адміністратором сервера, щоб використовувати цю команду!",
	setserverlang_logs_embed_title_on_enable: "Логи SetServerLang",
	setserverlang_logs_embed_description_on_enable:
		"<@${authorId}> встановив мову iHorizon на **${type}** !",
	setserverlang_already: "Я вже на цій мові!",
	setserverlang_command_work_enable: "Тепер моя мова - **${type}**",
	setserverlang_panel_title: "Вибір мови",
	setserverlang_panel_description:
		"Виберіть мову, якою iHorizon користуватиметься на цьому сервері.",
	setserverlang_panel_current: "Поточна мова",
	setserverlang_panel_select: "Виберіть мову...",
	setserverlang_panel_saved: "Мову успішно змінено!",
	setserverlang_command_error_enable: "Помилка!",
	embed_placeholder_string_select_menu_builder: "Що ви хочете зробити?",
	embed_placeholder_option_copy_embed: "Скопіювати вбудовання",
	embed_placeholder_option_edit_title: "Змінити заголовок",
	embed_placeholder_option_delete_title: "Видалити заголовок",
	embed_placeholder_option_edit_description: "Змінити опис",
	embed_placeholder_option_delete_description: "Видалити опис",
	embed_placeholder_option_edit_author: "Змінити автора",
	embed_placeholde_option_change_footer_image: "Змінити іконку футера",
	embed_placeholder_option_delete_author: "Видалити автора",
	embed_placeholder_option_edit_footer: "Змінити нижній колонтитул",
	embed_placeholder_option_delete_footer: "Видалити нижній колонтитул",
	embed_placeholder_option_edit_thumbnail: "Змінити мініатюру",
	embed_placeholder_option_edit_image: "Змінити зображення",
	embed_placeholder_option_edit_titleurl: "Змінити URL заголовка",
	embed_placeholder_option_edit_color: "Змінити колір",
	embed_placeholder_option_delete_color: "Видалити колір",
	embed_btn_save: "Зберегти вбудовання",
	embed_btn_send: "Надіслати вбудовання",
	embed_btn_cancel: "Скасувати",
	embed_interaction_not_for_you: "Ця інтеракція не для вас",
	embed_first_message: "Що ви хочете зробити?",
	embed_save_message:
		"<@${authorId}>, **Ви вирішили зберегти конфігурацію вбудовання!**```ID вбудовання: ${embedId}```",
	embed_cancel_message:
		"<@${authorId}>, **Ви вирішили відмовитися від конфігурації вбудовання!**",
	embed_send_message:
		"<@${authorId}>, **В якому каналі ви хочете надіслати це вбудовання?**",
	embed_timeout_getbtn:
		"<@${authorId}>, **Ви занадто довго не відповідали, я перериваю поточну операцію!**",
	embed_choose_0:
		"Надішліть посилання на повідомлення, ембед якого хочете скопіювати (правий клік на повідомленні, «Копіювати посилання на повідомлення»).",
	embed_choose_1: "Який заголовок ви хочете включити в вбудовання?",
	embed_choose_2: "Заголовок вбудовання успішно видалено!",
	embed_choose_3: "Який опис ви хочете включити в вбудовання?",
	embed_choose_4: "Опис вбудовання успішно видалено!",
	embed_choose_5: "Якого автора ви хочете включити в вбудовання?",
	embed_choose_6: "Автор вбудовання успішно видалено!",
	embed_choose_7: "Який нижній колонтитул ви хочете включити в вбудовання?",
	embed_choose_7bis: "Яку іконку футера ви хочете додати до свого ембеда?",
	embed_choose_8: "Нижній колонтитул вбудовання успішно видалено!",
	embed_choose_9: "Яке зображення мініатюри ви хочете включити в вбудовання?",
	embed_choose_10: "Яке зображення ви хочете включити в вбудовання?",
	embed_choose_11: "Який URL заголовка ви хочете включити в вбудовання?",
	embed_choose_12:
		"Який колір ви хочете включити в вбудовання? **www.color-hex.com**",
	embed_choose_12_error:
		"${emoji_No} | Неправильний колір! Будь ласка, перевірте **www.color-hex.com**",
	embed_choose_13: "Колір вбудовання успішно видалено!",
	embed_send_embed_work:
		"<@${authorId}>, **Ви успішно відправили ембет у канал <#${messageContent}>!**",
	embed_copy_bad_guild_msg:
		"Сервер повідомлення не збігається з ${guildName}",
	embed_copy_bad_channel_msg: "Канал повідомлення недоступний!",
	embed_copy_bad_message_msg: "Повідомлення недоступне!",
	embed_copy_bad_embed_message_msg: "У повідомленні немає ембеда!",
	embed_copy_bad_url_msg:
		"Недійсний URL, спробуйте ще раз. Правильний формат: https://discord.com/channels/${messageGuildId}/${channelId}/${id}",
	embed_btn_replace: "Замінити ембед",
	embed_replace_question_msg:
		"Який новий URL повідомлення, у якому потрібно замінити ембед?",
	embed_replace_message:
		"{user}, новий ембед замінив ембед повідомлення {messageUrl}",
	rolesaver_embed_title: "Модуль RoleSaver",
	rolesaver_embed_desc:
		"При виході учасників з сервера їх ролі зберігаються в базі даних. Тепер, коли вони повертаються, iHorizon відновлює їх ролі.",
	rolesaver_embed_fields_1_name: "Увімкнути",
	rolesaver_embed_fields_2_name: "Повторне призначення ролей адміністратора",
	rolesaver_embed_fields_3_name: "Тайм-аут",
	rolesaver_on_off_already_set: "Модуль вже вимкнено!",
	rolesaver_on_off_embed_title: "Модуль RoleSaver",
	rolesaver_on_off_embed_desc:
		"При виході учасників з сервера їх ролі не зберігаються в базі даних. Тепер iHorizon більше не відновлює старі ролі учасникам при їх поверненні на сервер.",
	rolesaver_on_off_embed_fields_1_name: "Увімкнути",
	var_nm_role_app_dont_exist:
		"${emoji_Warning_Icon} Бот не має ролі застосунку. Будь ласка, додайте бота повторно правильно.\n",
	var_nm_role_app_not_high:
		"${emoji_Warning_Icon} Роль бота не найвища. Будь ласка, перемістіть її на самий верх.\n",
	var_nm_role_app_not_admin:
		"${emoji_Warning_Icon} Роль бота не має прав адміністратора.\n",
	var_nm_end_main: "Нічний режим завершується.\n\n",
	var_nm_start_main: "Нічний режим ось-ось почнеться.\n\n",
	var_nm_edited_roles: "Змінено такі ролі:",
	var_nm_running: "запуск",
	var_nm_stopping: "вимкнення",
	var_nm_running2: "починається",
	var_nm_stopping2: "закінчується",
	var_nm_title: "Нічний режим",
	var_nm_ping_embed_title: "Нічний режим: ${type}",
	var_nm_ping_embed_fields_0_name: "Проміжок часу",
	var_nm_error_occured:
		"# Під час події «${type}» нічного режиму виникла проблема.\n",
	nightmode_embed_desc:
		"# ⭐️ Нічний режим\n> *Що таке нічний режим?* Нічний режим — це функція безпеки **[від iHorizon](https://www.ihorizon.org)**, яка дає змогу вимкнути всі права адміністратора на сервері Discord протягом заданого періоду.\n> *Наприклад, ви на сервері Discord з великою кількістю персоналу й хочете вночі прибрати всі права адміністратора, щоб уникнути рейду, перехоплення vanity-посилання Discord тощо*\n> *Ви там, де треба, мій друже. **iHorizon завжди буде рішенням.***\n\n---\n",
	nightmode_embed_fields_0_name: "Увімкнути модуль",
	nightmode_embed_fields_1_name: "Сповіщати власника сервера",
	nightmode_embed_fields_2_name: "Знімати ролі з ботів?",
	nightmode_embed_fields_3_name: "Боти в білому списку",
	nightmode_embed_fields_4_name: "Проміжок часу",
	nightmode_select_placeholder: "Налаштуйте нічний режим на сервері.",
	nightmode_select_0_label: "Увімкнути нічний режим",
	nightmode_select_0_desc: "Увімкнути/вимкнути нічний режим.",
	nightmode_select_1_label: "Попереджати власника сервера",
	nightmode_select_1_desc:
		"Сповіщати власника сервера під час увімкнення/вимкнення",
	nightmode_select_2_label: "Налаштувати проміжок часу нічного режиму",
	nightmode_select_2_desc:
		"Проміжок часу, коли права адміністратора автоматично знімаються.",
	nightmode_select_3_label: "Знімати ролі з ботів",
	nightmode_select_3_desc: "Чи знімати ролі з ботів уночі?",
	nightmode_select_4_label: "Змінити часовий пояс (UTC)",
	nightmode_select_4_desc:
		"Якщо у вас особливий час, його потрібно вказати (числовий формат UTC)",
	nightmode_select1_placeholder:
		"Боти, яким дозволено бути адміністраторами вночі",
	nightmode_change_timezone_question:
		"Виберіть UTC для свого сервера Discord",
	nightmode_modal_hours_window_fields0_label:
		"Час початку (напр.: 21:30 або 2130)",
	nightmode_modal_hours_window_fields1_label:
		"Час завершення (напр.: 06:15 або 0615)",
	nightmode_modal_hours_window_title:
		"Нічний режим — проміжок часу (24-годинний формат із хвилинами)",
	nightmode_invalid_hour_morning:
		"${emoji_No} Недійсний час початку. Використовуйте формат: 21:30 або 2130",
	nightmode_invalid_hour_night:
		"${emoji_No} Недійсний час завершення. Використовуйте формат: 06:15 або 0615",
	nightmode_utc_timezone_on: "Часовий пояс UTC увімкнено",
	git_lines_avoiding_spam:
		"Вибачте, але щоб запобігти спаму, ми обмежуємо кількість показаних рядків до 50",
	git_lines_avoiding_limit:
		"Вибачте, але в Discord є ліміт у 2000 символів, тож ми не змогли показати потрібний фрагмент",
	git_lines_work: "✅ Git Lines тепер увімкнено.",
	git_lines_work_disabled: "❌ Git Lines тепер вимкнено.",
	git_lines_borred_warning:
		"\n-# ${emoji_VC_OpenChat} Я вам заважаю? Ви можете вимкнути цей модуль через `/git lines`!",
	counter_config_command_action_on:
		"${author}, ви перевели модуль Counter у стан `Power On`.\nЯкщо канал не існує, налаштуйте його командою: **/counter channel**.",
	counter_config_command_action_off:
		"${author}, ви перевели модуль Counter у стан `Power Off`.",
	counter_channel_embed_title: "Модуль Counter налаштовано тут!",
	counter_channel_embed_desc:
		"${author} налаштував(-ла) тут модуль Counter!\nТепер користувачі можуть рахувати тут числа!",
	counter_channel_command_work:
		"${author}, ви успішно налаштували модуль Counter у каналі ${channel}!",
	counter_channel_command_error:
		"${author}, команда повернула помилку. Перевірте, чи існує вказаний канал і чи увімкнено модуль Counter!",
	counter_actual_number: "✨ **Поточне число:** {number}",
	suggest_accept_not_admin: "Ви не є адміністратором!",
	suggest_acceptnot_good_channel:
		"Цю команду слід виконувати в каналі модуля пропозицій (<#${channel}>)!\nПереконайтеся, що модуль пропозицій не вимкнено!",
	suggest_accept_not_found_db: "Пропозиція не знайдена у моїй базі даних!",
	suggest_accept_already_replied: "На цю пропозицію вже було дано відповідь!",
	suggest_accept_embed_fields_to_put:
		"Відповідь від ${authorUsername} (Прийнято)",
	suggest_accept_command_work:
		"Ви прийняли пропозицію!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_accept_command_error: "Пропозиція не знайдена на Discord-каналі!",
	suggest_deny_not_admin: "Ви не є адміністратором!",
	suggest_deny_not_good_channel:
		"Цю команду слід виконувати в каналі модуля пропозицій (<#${channel}>)!\nПереконайтеся, що модуль пропозицій не вимкнено!",
	suggest_deny_not_found_db: "Пропозиція не знайдена у моїй базі даних!",
	suggest_deny_already_replied: "На цю пропозицію вже було дано відповідь!",
	suggest_deny_embed_fields_to_put:
		"Відповідь від ${authorUsername} (Відхилено)",
	suggest_deny_command_work:
		"Ви відхилили пропозицію!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_deny_command_error: "Пропозиція не знайдена на Discord-каналі!",
	suggest_reply_not_admin: "Ви не є адміністратором!",
	suggest_reply_not_good_channel:
		"Цю команду слід виконувати в каналі модуля пропозицій (<#${channel}>)!\nПереконайтеся, що модуль пропозицій не вимкнено!",
	suggest_replynot_found_db: "Пропозиція не знайдена у моїй базі даних!",
	suggest_reply_already_replied: "На цю пропозицію вже було дано відповідь!",
	suggest_reply_embed_fields_to_put: "Відповідь від ${authorUsername}",
	suggest_reply_command_work:
		"Ви відправили відповідь на пропозицію!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_reply_command_error: "Пропозиція не знайдена на Discord-каналі!",
	suggest_delete_not_delete: "Ви не адміністратор!",
	suggest_delete_not_good_channel:
		"Цю команду слід виконувати в каналі модуля пропозицій (<#${channel}>)!\nПереконайтеся, що модуль пропозицій не вимкнено!",
	suggest_delete_not_found_db: "Пропозиція не знайдена у моїй базі даних!",
	suggest_delete_command_work: "Ви видалили пропозицію!",
	suggest_delete_command_error: "Пропозиція не знайдена на Discord-каналі!",
	suggest_not_staff: "Вам не дозволено керувати пропозиціями.",
	suggest_status_pending: "Очікує",
	suggest_status_reviewing: "На розгляді",
	suggest_status_accepted: "Прийнято",
	suggest_status_planned: "Заплановано",
	suggest_status_implemented: "Реалізовано",
	suggest_status_denied: "Відхилено",
	suggest_notify_status:
		"<@${authorId}>, ваша пропозиція тепер має статус **${status}**.",
	suggest_notify_reply:
		"<@${authorId}>, персонал відповів на вашу пропозицію.",
	suggest_button_reply: "Відповісти",
	suggest_modal_title: "Відповісти на пропозицію",
	suggest_modal_label: "Ваше повідомлення",
	suggest_status_command_work:
		"Пропозиція тепер має статус **${status}**.\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_list_title: "Пропозиції",
	suggest_list_empty: "Немає пропозицій для показу.",
	suggest_list_footer: "${shownCount} з ${totalCount}",
	setsuggest_staff_role_set:
		"${author}, роль персоналу для пропозицій тепер — ${role}.",
	setsuggest_staff_role_removed:
		"${author}, роль персоналу для пропозицій знято.",
	setsuggest_disable_not_admin: "Ви не адміністратор!",
	setsuggest_disable_pw_on: "${author}, ви увімкнули модуль пропозицій!",
	setsuggest_disable_pw_off: "${author}, ви вимкнули модуль пропозицій!",
	setsuggest_channel_not_admin: "Ви не адміністратор!",
	setsuggest_channel_already_set_with_that:
		"${author}, канал модуля пропозицій вже встановлено в ${channel}!",
	setsuggest_channel_embed_title: "Модуль пропозицій встановлено тут!",
	setsuggest_channel_embed_desc:
		"Тепер усі користувачі, які мають право надсилати повідомлення тут, можуть пропонувати свої ідеї, надсилаючи повідомлення!",
	setsuggest_channel_command_work:
		"${author}, ви встановили канал модуля пропозицій в ${channel}!",
	security_disable_not_admin: "Ви не є адміністратором!",
	security_disable_pw_on: "${author}, ви увімкнули модуль безпеки!",
	security_disable_pw_off: "${author}, ви вимкнули модуль безпеки!",
	security_role_to_give_not_admin: "Ви не є адміністратором!",
	security_role_to_give_command_work:
		"${author}, ви встановили роль ${role} для модуля безпеки!",
	security_channel_not_admin: "Ви не є адміністратором!",
	security_channel_command_work:
		"${author}, ви встановили канал ${channel} для модуля безпеки!",
	schedule_menu_placeholder: "Що ви хочете зробити?",
	schedule_menu_choice_0: "Створити розклад",
	schedule_menu_choice_1: "Видалити розклад",
	schedule_menu_choice_2: "Видалити всі розклади",
	schedule_menu_choice_3: "Список усіх розкладів",
	schedule_modal_title: "Менеджер розкладів",
	schedule_modal_fields_1_label: "Назва розкладу?",
	schedule_modal_fields_2_label: "Опис розкладу?",
	schedule_delete_question: "Який ідентифікатор розкладу ви хочете видалити?",
	schedule_deleteall_question:
		"Ви впевнені, що хочете видалити всі свої розклади? (Y/n)",
	schedule_delete_not_found:
		"РОЗКЛАД (${arg0}) для цього учасника не знайдено!",
	schedule_delete_title_embed: "Видалення розкладу (${arg0})",
	schedule_delete_confirm: "Розклад видалено!",
	schedule_deleteall_title_embed: "Видалення всіх розкладів",
	schedule_deleteall_desc_embed: "Всі ваші розклади були видалені!",
	schedule_deleteall_confirm: "Всі ваші розклади видалено!",
	schedule_deleteall_cancel: "Дію `DELETE_ALL` скасовано!",
	schedule_list_not_schedule: "РОЗКЛАД для цього учасника не знайдено!",
	schedule_list_title_embed: "Список усіх розкладів",
	schedule_list_fields_embed:
		"**Закінчується**: ${expiresAt}```${title}``````${description}```\n",
	schedule_list_content_message: "Це список всіх ваших розкладів!",
	schedule_create_title_embed: "Створення розкладу",
	schedule_create_when_question:
		"Коли ви хочете отримувати сповіщення про цей розклад? (Приклад: 6d = 6 днів, 2h = 2 години, 10m = 10 хвилин, 10s = 10 секунд)",
	schedule_create_not_number_time:
		"${author}, ваша відповідь (час, коли ви хочете отримувати сповіщення про цей розклад) не є числом!",
	schedule_create_limit_reached:
		"${author}, у вас уже ${max} нагадувань. Видаліть одне, перш ніж створити нове.",
	schedule_create_embed_fields_name_confirm: "Дата сповіщення",
	schedule_create_embed_title_confirm: "Розклад #${scheduleCode} створено!",
	schedule_create_confirm_msg:
		"${author}, ваш розклад був створений!\nКод: `${scheduleCode}`",
	pfps_config_not_admin:
		":x: У вас немає прав адміністратора для виконання цієї команди",
	pfps_config_command_action_on:
		"${author}, ви увімкнули модуль PFPS.\nЯкщо канал не існує, налаштуйте його за допомогою команди: **/pfps channel**.",
	pfps_config_command_action_off: "${author}, ви вимкнули модуль PFPS.",
	pfps_channel_not_admin:
		":x: У вас немає прав адміністратора для виконання цієї команди",
	pfps_channel_embed_title: "Модуль PFPS налаштовано тут!",
	pfps_channel_embed_desc:
		"${author} налаштував модуль PFPS тут!\nТепер кожні 30 секунд iHorizon буде відправляти аватар випадкового користувача у цій гільдії!\nЯ зроблю все можливе!",
	pfps_channel_command_work:
		"${author}, ви успішно налаштували модуль PFPS для каналу ${channel}!",
	pfps_channel_command_error:
		"${author}, команда повернула помилку. Будь ласка, перевірте, чи існує зазначений канал і чи увімкнено модуль PFPP!",
	authorization_actions_not_permited:
		"Тільки власник сервера може редагувати правило авторизації модуля захисту!",
	authorization_actions_everyone: "Всі",
	authorization_actions_allowlist: "Учасник(и) списку дозволених",
	authorization_actions_nobody: "Ніхто. (Крім власника сервера)",
	protect_panel_title: "Панель керування захистом",
	protect_panel_desc:
		"Налаштуйте кожне правило захисту: увімкніть або вимкніть його, виберіть, хто його обходить, і вкажіть санкцію для відповідального учасника.",
	protect_panel_global_label: "Загальна санкція",
	protect_panel_global_hint:
		"Застосовується до кожного правила без власної санкції",
	protect_panel_select_placeholder: "Виберіть правило для налаштування",
	protect_panel_mode_placeholder: "Виберіть, хто може обходити це правило",
	protect_panel_sanction_placeholder: "Виберіть санкцію",
	protect_panel_bypass_label: "Обхід",
	protect_panel_sanction_label: "Санкція",
	protect_panel_rule_help:
		"Коли спрацьовує це правило, дію автоматично скасовано, а до відповідального учасника застосовано санкцію.",
	protect_panel_enable_button: "Увімкнути",
	protect_panel_disable_button: "Вимкнути",
	protect_panel_all_rules: "Усі правила",
	protect_panel_all_rules_desc: "Змінити всі правила одразу",
	protect_panel_all_status: "Увімкнено правил: ${enabledCount}/${ruleCount}",
	protect_panel_all_help:
		"Обхід і санкція застосовуються до всіх увімкнених правил одразу.",
	protect_panel_all_mixed: "Змішано",
	protect_panel_enable_all_button: "Увімкнути всі",
	protect_panel_disable_all_button: "Вимкнути всі",
	protect_panel_all_mode_saved:
		"Обхід для правил (**${ruleCount}**) тепер: **${mode}**.",
	protect_panel_all_sanction_saved:
		"Санкція для правил (**${ruleCount}**) тепер: **${sanction}**.",
	protect_panel_all_enabled: "Правила (**${ruleCount}**) тепер увімкнено!",
	protect_panel_all_disabled: "Правила (**${ruleCount}**) тепер вимкнено!",
	protect_panel_back_button: "Назад",
	protect_panel_refresh_button: "Оновити",
	protect_panel_close_button: "Закрити панель",
	protect_panel_rule_enabled: "Правило **${rule}** тепер увімкнено!",
	protect_panel_rule_disabled: "Правило **${rule}** тепер вимкнено!",
	protect_panel_mode_saved: "Обхід правила **${rule}** тепер: **${mode}**.",
	protect_panel_sanction_saved:
		"Санкція правила **${rule}** тепер: **${sanction}**.",
	protect_panel_global_saved: "Загальна санкція тепер: **${sanction}**.",
	protect_panel_api_error:
		"Мені не вдалося застосувати цю зміну. Переконайтеся, що я маю дозвіл `Administrator`, і спробуйте ще раз.",
	protect_panel_sanction_global: "Загальна за замовчуванням",
	protect_panel_sanction_cancel: "Лише скасувати дії",
	protect_panel_sanction_derank: "Скасувати + зняти ролі",
	protect_panel_sanction_ban: "Скасувати + бан",
	protect_panel_sanction_kick: "Скасувати + вигнати",
	protect_panel_sanction_mute: "Скасувати + мут (10 хв)",
	protect_panel_group_server: "Сервер і вебхуки",
	protect_panel_group_channels: "Канали",
	protect_panel_group_roles: "Ролі",
	protect_panel_group_members: "Учасники",
	protect_panel_rule_webhook_name: "Вебхуки",
	protect_panel_rule_updateguild_name: "Зміни сервера",
	protect_panel_rule_createchannel_name: "Створення каналів",
	protect_panel_rule_updatechannel_name: "Зміни каналів",
	protect_panel_rule_deletechannel_name: "Видалення каналів",
	protect_panel_rule_createrole_name: "Створення ролей",
	protect_panel_rule_deleterole_name: "Видалення ролей",
	protect_panel_rule_updaterole_name: "Зміни ролей",
	protect_panel_rule_updatemember_name: "Зміни ролей учасників",
	protect_panel_rule_banmembers_name: "Бан учасників",
	protect_panel_rule_kickmember_name: "Вигнання учасників",
	protect_panel_rule_unbanmembers_name: "Розбан учасників",
	protect_panel_rule_add_admin_roles_name: "Видача ролей адміністратора",
	allowlist_show_not_permited:
		"Ви не маєте дозволу використовувати цю команду! Ви повинні бути у списку дозволів!",
	allowlist_show_embed_author: "Список дозволів",
	allowlist_add_not_permited:
		"У вас немає дозволу використовувати цю команду! Ви повинні бути у списку дозволів!",
	allowlist_add_not_owner:
		"Тільки власник сервера може додавати/видаляти користувачів зі списку дозволів!",
	allowlist_add_already_in:
		"Учасник, якого ви хочете додати до списку дозволів, вже там є!",
	allowlist_add_command_work: "${member} був доданий до списку дозволів!",
	allowlist_delete_not_permited:
		"У вас немає дозволу використовувати цю команду! Ви повинні бути у списку дозволів!",
	allowlist_delete_not_owner:
		"Тільки власник сервера може додавати/видаляти користувачів зі списку дозволів!",
	allowlist_delete_member_unreachable:
		"Учасник, якого ви хотіли видалити зі списку дозволів, недосяжний!",
	allowlist_delete_cant_remove_owner:
		"Неможливо видалити власника сервера зі списку дозволів!",
	allowlist_delete_isnt_in:
		"Учасник, якого ви хочете видалити зі списку дозволів, не знаходиться там!",
	allowlist_delete_command_work:
		"${member} був видалений зі списку дозволів!",
	tag_name: "Тег",
	tag_embed_created_at: "Створено",
	tag_embed_last_update: "Останнє оновлення",
	tag_embed_last_updated_by: "Востаннє оновив(-ла)",
	tag_create_not_permited:
		"Вам не дозволено створювати теги.\nПотрібен дозвіл Administrator або бути в білому списку (`/tag wlroles-create`).",
	tag_create_not_good_name:
		"Назва тегу не повинна містити пробілів чи крапок і не повинна перевищувати 16 символів.",
	tag_create_command_work: "Тег `${tag_name}` створено.",
	tag_create_already_exist: "Такий тег уже існує.",
	tag_create_embed_doesnt_exist: "Такого ембеда не існує.",
	tag_no_one_found: "На цьому сервері немає збережених тегів!",
	tag_delete_dnt_exist: "Тегу `${tag_name}` не існує.",
	tag_delete_command_ok: "Тег `${tag_name}` видалено.",
	tag_doesnt_exist: "Тегу `${tag_name}` не існує!",
	tag_wlcreate_embed_title: "Білий список створення — теги",
	tag_wlcreate_embed_desc: "Усі ролі, яким дозволено створювати теги.",
	tag_wluse_embed_title: "Білий список використання — теги",
	tag_wluse_embed_desc: "Усі ролі, яким дозволено використовувати теги.",
	tag_list_no_anything: "На цьому сервері немає збережених тегів!",
	tag_use_not_allowed:
		"Вам не дозволено використовувати тег `${tag_name}`.\nПотрібен дозвіл Administrator, або ви можете попросити власника тегу <@${createBy}> додати вас до білого списку (`tag wlroles-use`).",
	tag_use_empty:
		"Тег `${tag_name}` порожній: у ньому немає ні тексту, ні ембеда.",
	tag_use_command_work: "Тег `${tag_name}` надіслано.",
	tag_edit_error_perm:
		"Щоб змінити тег, потрібно мати права адміністратора або бути власником тегу.",
	tag_edit_command_ok:
		"Назву тегу змінено з **`${current_tag_name}`** на **`${new_tag_name}`**",
	tempvoice_if_text_not_admin:
		"<@${authorId}>, у вас немає прав на використання цієї команди!",
	tempvoice_if_text_desc_embed:
		"## Інтерфейс тимчасового голосового каналу\nЦей **інтерфейс** може бути використаний для управління тимчасовими голосовими каналами.\n",
	tempvoice_if_text_fields_value_limit: "${emoji_VC_Limit} **Змінити ліміт**",
	tempvoice_if_text_fields_value_name: "${emoji_VC_Name} **Змінити назву**",
	tempvoice_if_text_fields_value_region:
		"${emoji_VC_Region} **Змінити регіон**",
	tempvoice_if_text_fields_value_trust:
		"${emoji_VC_Trust} **Довірений користувач**",
	tempvoice_if_text_fields_value_untrust:
		"${emoji_VC_Untrust} **Недовірий користувач**",
	tempvoice_if_text_fields_value_block: "${emoji_VC_Block} **Блокувати**",
	tempvoice_if_text_fields_value_unblock:
		"${emoji_VC_Unblock} **Розблокувати**",
	tempvoice_if_text_fields_value_claim: "${emoji_VC_Claim} **Призначити**",
	tempvoice_if_text_fields_value_privacy:
		"${emoji_VC_Privacy} **Конфіденційність**",
	tempvoice_if_text_fields_value_transfer:
		"${emoji_VC_Transfer} **Передати**",
	tempvoice_if_text_fields_value_delete: "${emoji_VC_Delete} **Видалити**",
	tempvoice_vc_not_admin:
		"<@${authorId}>, у вас немає прав на використання цієї команди!",
	tempvoice_staff_not_admin:
		"<@${authorId}>, у вас немає прав на використання цієї команди!",
	tempvoice_staff_desc_embed:
		"## Роль стаффу TempVoice\nРолі зі списку тепер можуть заходити в канал і модерувати його!\n",
	confession_channel_command_work:
		"Панель исповедей була надіслана у ${channel}",
	confession_channel_panel_embed_desc:
		"# **Анонімні Сповіді**\n\nНатисніть кнопку нижче, щоб відкрити форму сповіді. Ви можете написати те, що хочете сповідати. Якщо хочете, можете зробити вашу сповідь приватною.\n\n## **Зробити Сповідь**\n\n*Примітка: Щоб зробити вашу сповідь приватною, вкажіть відповідний варіант у формі.*",
	confession_channel_log_embed_title: "Модуль Установки Каналу Сповідей",
	confession_channel_log_embed_desc:
		"${author} встановив канал на ${channel}",
	confession_coolodwn_command_work:
		"${author}, час очікування для сповіді тепер складає **${time}**!",
	confession_cooldown_log_embed_title:
		"Модуль Встановлення Часу Очікування Сповідей",
	confession_cooldown_log_embed_desc:
		"${author} встановив час очікування на `${time}`",
	confession_disable_command_work_on: "Модуль сповідей тепер увімкнено.",
	confession_disable_command_work_off: "Модуль сповідей тепер вимкнено.",
	confession_log_embed_title_on_enable: "Увімкнення/Вимкнення Сповідей",
	confession_log_embed_desc_on_enable: "${author} увімкнув модуль сповідей!",
	confession_log_embed_desc_on_disabled: "${author} вимкнув модуль сповідей!",
	confession_sent_confirmation: "Ваше зізнання **#${code}** опубліковано.",
	confession_not_found: "Зізнання з кодом **#${code}** не знайдено.",
	confession_delete_command_work: "Зізнання **#${code}** видалено.",
	confession_delete_log_embed_title: "Видалення зізнання",
	confession_delete_log_embed_desc:
		"${author} видалив(-ла) зізнання **#${code}**",
	confession_ban_command_work:
		"Автор зізнання **#${code}** більше не може надсилати зізнання на цьому сервері.",
	confession_ban_already: "Автора зізнання **#${code}** уже заблоковано.",
	confession_ban_author_expired:
		"Це зізнання надто старе: його автор забувається через 90 днів.",
	confession_ban_log_embed_title: "Блокування автора зізнання",
	confession_ban_log_embed_desc:
		"${author} заблокував(-ла) автора зізнання **#${code}**",
	confession_banned_error:
		"Вас заблоковано в модулі зізнань на цьому сервері.",
	confession_unban_command_work:
		"Блокування, пов’язане із зізнанням **#${code}**, знято.",
	confession_unban_not_found:
		"Із зізнанням **#${code}** не пов’язано жодного блокування.",
	confession_unban_log_embed_title: "Розблокування автора зізнання",
	confession_unban_log_embed_desc:
		"${author} зняв(-ла) блокування, пов’язане із зізнанням **#${code}**",
	confession_thread_enabled:
		"Відтепер, коли хтось надсилає зізнання, я створюю гілку для обговорення під ембедом.",
	confession_thread_disabled:
		"Я не створюю гілку для обговорення під ембедом.",
	antispam_manage_embed_title: "Налаштування модуля AntiSpam",
	antispam_manage_choices_1_label: "Увімкнути модуль",
	antispam_manage_choices_1_desc: "Увімкнути або вимкнути модуль антиспаму",
	antispam_manage_choices_2_label: "Ігнорувати ботів",
	antispam_manage_choices_2_desc: "Ігнорувати спам від ботів на сервері",
	antispam_manage_choices_3_label: "Тип покарання",
	antispam_manage_choices_3_desc:
		"Який тип санкції буде застосований до користувача?",
	antispam_manage_choices_4_label: "Час покарання",
	antispam_manage_choices_4_desc: "Як довго триває санкція",
	antispam_manage_choices_5_label: "Множник часу покарання",
	antispam_manage_choices_5_desc:
		"Чи помножується тривалість санкції за кожне порушення",
	antispam_manage_choices_6_label: "Видаляти повідомлення",
	antispam_manage_choices_6_desc: "Видаляти спам-повідомлення",
	antispam_manage_choices_7_label: "Максимальний інтервал між повідомленнями",
	antispam_manage_choices_7_desc:
		"Максимальний інтервал між повідомленнями, щоб вони вважалися спамом",
	antispam_manage_choices_8_label:
		"Максимальна кількість повторюваних повідомлень",
	antispam_manage_choices_8_desc:
		"Максимальна кількість повторюваних повідомлень перед санкцією",
	antispam_manage_choices_9_label: "Максимальний інтервал між повторами",
	antispam_manage_choices_9_desc:
		"Інтервал між повторюваними повідомленнями для позначення користувача",
	antispam_manage_choices_10_label:
		"Максимальна кількість схожих повідомлень",
	antispam_manage_choices_10_desc:
		"Максимальна кількість схожих повідомлень перед санкцією",
	antispam_manage_choices_12_label: "Поріг перед попередженням",
	antispam_manage_choices_12_desc:
		"Поріг перед відправленням попереджувального повідомлення",
	antispam_manage_select_menu_punish_mute_label: "Заглушити учасників",
	antispam_manage_modal_title: "Модальне вікно AntiSpam",
	antispam_manage_button_label: "Зберегти налаштування",
	antispam_manage_preset_level1_name: "Спокійний режим",
	antispam_manage_preset_level2_name: "Режим охорони",
	antispam_manage_preset_level3_name: "Режим екстремального захисту",
	antispam_manage_button_preset_label: "Завантажити пресет",
	antispam_manage_selectstring_preset_label: "Готові налаштування",
	antispan_bypassroles_embed_desc:
		"Усі ролі нижче можуть обійти модуль антиспаму",
	antispam_ignorechannels_embed_desc:
		"Повідомлення, надіслані в будь-якому з наведених нижче каналів, оминають модуль антиспаму",
	header_h1_value: "Статистика повідомлень {author_username}",
	messages_word: "Повідомлення",
	voice_activity: "Голосова активність",
	minutes_word: "Хвилини",
	top_voice: "Топ голосових каналів",
	top_message: "Топ текстових каналів",
	var_members: "учасник(ів)",
	starboard_channel_command_ok:
		"${emoji_Yes} | **Канал Starboard тепер: ${channel}**. Тепер, коли учасники сервера ставлять реакцію '⭐' на повідомлення й поріг **`${threshold}`** перевищено, повідомлення надсилається в ${channel}!",
	starboard_config_command_ok:
		"${emoji_Yes} | **Модуль Starboard тепер ${action}**",
	starboard_threshold_command_ok:
		"${emoji_Yes} | Тепер, коли учасники сервера ставлять реакцію '⭐' на повідомлення й поріг **`${amount}`** перевищено, повідомлення надсилається у відповідний канал!",
	starboard_create_thread_command_ok:
		"${emoji_Yes} | Тепер, коли учасники сервера ставлять реакцію '⭐' на повідомлення й поріг **`${amount}`** перевищено, повідомлення надсилається у відповідний канал **`${action}`**",
	starboard_create_thread_yes: "і буде створено гілку для обговорення",
	starboard_create_thread_no: "і гілку для обговорення не буде створено",
	skullboard_channel_command_ok:
		"${emoji_Yes} | **Канал Skullboard тепер: ${channel}**. Тепер, коли учасники сервера ставлять реакцію '💀' на повідомлення й поріг **`${threshold}`** перевищено, повідомлення надсилається в ${channel}!",
	skullboard_config_command_ok:
		"${emoji_Yes} | **Модуль Skullboard тепер ${action}**",
	skullboard_threshold_command_ok:
		"${emoji_Yes} | Тепер, коли учасники сервера ставлять реакцію '💀' на повідомлення й поріг **`${amount}`** перевищено, повідомлення надсилається у відповідний канал!",
	skullboard_create_thread_command_ok:
		"${emoji_Yes} | Тепер, коли учасники сервера ставлять реакцію '💀' на повідомлення й поріг **`${amount}`** перевищено, повідомлення надсилається у відповідний канал **`${action}`**",
	notifier_author_add_author_doesnt_exist:
		"Автора не існує. Будь ласка, перевірте ID.",
	notifier_config_channel_logsEmbed_title: "Модуль каналу Notifier",
	notifier_config_channel_logsEmbed_desc:
		"<@${authorId}> налаштував(-ла) канал модуля Notifier: ${channel}",
	notifier_config_message_command_ok:
		"Тепер, коли стример або ютубер опублікує відео, я надішлю повідомлення в ${channel}",
	notifier_config_message_helpEmbed_title: "Власне повідомлення сповіщення",
	notifier_config_message_helpEmbed_desc:
		"{artistAuthor} => Ім’я користувача стримера/ютубера\n{artistLink} => Посилання на стримера/ютубера\n{mediaURL} => URL відео стримера/ютубера",
	notifier_config_message_embed_fields_notifyMessage:
		"Повідомлення сповіщення",
	notifier_config_message_awaiting_response:
		"Напишіть повідомлення сповіщення.",
	notifier_config_message_command_work_on_enable:
		"${emoji_GreenTick} | Повідомлення сповіщення успішно встановлено.",
	blogger_generateBlogsEmbed_embed_desc:
		"Список налаштованих RSS-стрічок:\n\n",
	blogger_generateBlogsEmbed_embed_title: "📰 Налаштування RSS-блогів",
	blogger_generateConfigurationEmbed_embed_title: "📰 Налаштування Blogger",
	blogger_no_rss: "RSS-стрічок не налаштовано.",
	blogger_generateConfigurationEmbed_embed_fields_1_name: "Статус",
	blogger_generateConfigurationEmbed_embed_fields_2_name: "Усього блогів",
	blogger_unknown_blog: "Невідомий блог",
	blogger_on_new_article_default_message:
		"📰 Опубліковано нову статтю!\n**{articleTitle}** від {articleAuthor}\n{articleLink}",
	blogger_config_status_enabled:
		"✅ Модуль Blogger **увімкнено**. RSS-стрічки відстежуватимуться.",
	blogger_config_status_disabled:
		"❌ Модуль Blogger **вимкнено**. RSS-стрічки не відстежуватимуться.",
	blogger_read_article: "Читати статтю",
	blogger_blog_add_invalid_channel:
		"Неправильний тип каналу. Виберіть текстовий канал.",
	blogger_blog_add_success:
		"✅ RSS-стрічку **${validationName}** додано! Сповіщення надсилатимуться в ${channel} (ID: `${blogId}`)",
	blogger_blog_add_invalid_rss:
		"❌ Вказана RSS-стрічка недійсна або недоступна. Перевірте URL і спробуйте ще раз.",
	blogger_blog_remove_success: "✅ RSS-стрічку з ID `${blogId}` видалено.",
	blogger_blog_remove_not_found: "❌ RSS-стрічку з таким ID не знайдено.",
	lastfm_module_not_configured:
		"${emoji_No} | Модуль Last.fm не налаштовано в боті. Задайте `LASTFM_API_KEY` і `LASTFM_SHARED_SECRET` у файлі `.env` бота.",
	lastfm_config_login_required:
		"${emoji_No} | Перш ніж увімкнути модуль, скористайтеся `/lastfm login`.",
	lastfm_config_enabled:
		"${emoji_Yes} | Скроблінг Last.fm тепер увімкнено для вашого облікового запису.",
	lastfm_config_disabled:
		"${emoji_Yes} | Скроблінг Last.fm тепер вимкнено для вашого облікового запису.",
	lastfm_login_invalid_session:
		"${emoji_No} | Last.fm не повернув дійсного сеансу.",
	lastfm_login_success:
		"${emoji_Yes} | Ваш обліковий запис Last.fm `${username}` підключено, скроблінг увімкнено.",
	lastfm_embed_title: "Налаштування Last.fm для ${userLabel}",
	lastfm_embed_field_status: "Стан",
	lastfm_embed_field_account: "Підключений обліковий запис",
	lastfm_embed_field_connected_at: "Підключено",
	lastfm_api_error_login:
		"${emoji_No} | Не вдалося підключитися до Last.fm: ${error}",
	lastfm_api_error_nowplaying:
		"${emoji_No} | Не вдалося повідомити Last.fm про поточний трек: ${error}",
	lastfm_api_error_scrobble:
		"${emoji_No} | Не вдалося заскроблити цей трек: ${error}",
	lastfm_api_error_unknown: "невідома помилка",
	rc_key_doesnt_exist:
		"${emoji_No} Модуля AuthRestore з ключем **${secretCode}** не існує!",
	rc_verify: "Підтвердити",
	rc_role_embed_title: "AuthRestore: нова зміна",
	rc_role_embed_field1_name: "Нова роль після підтвердження",
	rc_command_ok:
		'${author}, ви щойно налаштували модуль "AuthRestore". Тепер, коли учасник Discord-сервера натисне кнопку й увійде через OAuth2, його буде додано до бази даних. Згодом він зможе автоматично приєднатися до сервера через OAuth2.\n# ПРОЧИТАЙТЕ УВАЖНО\nПовідомлення ${msgLink} тепер має кнопку, що слугуватиме для підтвердження.\nОСЬ ПРИВАТНИЙ КОД, ЯКИЙ НЕ МОЖНА НІКОМУ ПОВІДОМЛЯТИ. ЛЮДИНА З ЦИМ КОДОМ МОЖЕ ЙОГО ВИДАЛИТИ, ДОДАТИ УЧАСНИКІВ НА СВІЙ СЕРВЕР... ЗБЕРІГАЙТЕ ЙОГО В НАДІЙНОМУ МІСЦІ. iHorizon БІЛЬШЕ НІКОЛИ ЙОГО ВАМ НЕ ДАСТЬ:\n```${secretCode}```',
	rc_command_ok_dm: "# Код AuthRestore для ${guildName}\n```${secretCode}```",
	rc_command_dm_failed:
		"Я спробував надіслати вам код в особисті повідомлення, але ви їх заблокували :/",
	rc_command_dm_ok:
		"Якщо ви пропустили: я надіслав вам код в особисті повідомлення!",
	rc_command_horizongw_down: "Помилка: можливо, HorizonGateway недоступний",
	rc_delete_config_not_found:
		"Не вдалося знайти налаштування модуля на цьому сервері!",
	rc_delete_command_ok:
		'${author}, ви прибрали кнопку "AuthRestore": учасники більше не можуть пройти перевірку через неї. Ваш ключ і вже перевірені учасники зберігаються, тож ви все ще можете повернути їх через `/authrestore force-join`.',
	rc_get_mainEmbed_title: "AuthRestore: загальна інформація",
	rc_get_mainEmbed_field1_name: "ID сервера",
	rc_get_mainEmbed_field2_name: "Роль після підтвердження",
	rc_get_mainEmbed_field3_name: "Створено",
	rc_get_mainEmbed_field3_value: "*дата у форматі MM/DD/YYYY HH:mm*",
	rc_get_mainEmbed_field4_name: "Кількість використань ключа",
	rc_get_mainEmbed_field5_name: "Автор налаштування",
	rc_get_secondEmbed_title: "Збережені користувачі",
	rc_get_secondEmbed_footer: "Сторінка ${from} / ${to}",
	rc_get_locale: "Мова",
	rc_get_username: "Ім'я користувача",
	rc_get_unkwnon_user: "Невідомий користувач (${authorId})",
	rc_forceJoin_embed_title: "AuthRestore: примусове приєднання",
	rc_forceJoin_embed_desc:
		"## Ви впевнені, що хочете примусово приєднати учасників до цього сервера?\n### ПРОЧИТАЙТЕ УВАЖНО:\nЯКЩО ВИ ПІДТВЕРДИТЕ ЦЮ ДІЮ, ПОТОЧНИЙ ПРИВАТНИЙ КЛЮЧ БУДЕ ЗНИЩЕНО. ВИ ОТРИМАЄТЕ НОВИЙ КЛЮЧ.\n\n\n",
	rc_forceJoin_embed_field1: "Знайдено учасників",
	rc_forceJoin_embed_field2: "Учасників уже тут",
	rc_forceJoin_embed_field3: "Можуть приєднатися",
	rc_forceJoin_embed_2_field1: "Можуть приєднатися",
	rc_forceJoin_embed_2_field2: "Приєдналися",
	rc_forceJoin_ws_size:
		"# Підготовка до додавання **${value2}** учасників на сервер.",
	rc_forceJoin_ws_start: "# Триває примусове приєднання...",
	rc_forceJoin_ws_end: "# Примусове приєднання завершено.",
	rc_forceJoin_ws_end_renew_msg:
		"# ПРОЧИТАЙТЕ УВАЖНО\nОСЬ ПРИВАТНИЙ КОД, ЯКИЙ НЕ МОЖНА НІКОМУ ПОВІДОМЛЯТИ. ЛЮДИНА З ЦИМ КОДОМ МОЖЕ ЙОГО ВИДАЛИТИ, ДОДАТИ УЧАСНИКІВ НА СВІЙ СЕРВЕР... ЗБЕРІГАЙТЕ ЙОГО В НАДІЙНОМУ МІСЦІ. iHorizon БІЛЬШЕ НІКОЛИ ЙОГО ВАМ НЕ ДАСТЬ:\n```${value2}```",
	media_gen_cooldown:
		"Між генераціями медіа потрібно зачекати `1 хвилину й 30 секунд`!",
	media_gen_error_args: "Укажіть два дійсні URL-адреси зображень.",
	batch_ban_process:
		"🔄 Триває бан ${memberUsername} на ${guildCount} серверах...",
	batch_unban_process: "🔄 Триває розбан ${bannedMemberCount} учасників...",
	batch_unblacklist_process:
		"🔄 Триває вилучення ${bannedMemberUsername} з чорного списку на ${guildObjectCount} серверах...",
	unbanall_undo_command_err:
		"Немає учасників для повторного бану. Спершу скористайтеся командою розбану всіх.",
	confession_module_modal_title: "Надіслати сповідь",
	confession_module_modal_components1_label: "Що ви хочете сповідати?",
	confession_module_modal_components1_placeholder: "Ммхх",
	confession_module_modal_components2_label: "Це приватно?",
	even_mp_playerStart_tip:
		"> ${emoji_LastFM_Logo} А ви знали, що в iHorizon можна скроблити музику через `/lastfm`? ${emoji_Sunglass}",
	event_mp_audioTrackAdd:
		"${emoji_Player_Queue_Add} - ${trackTitle} було додано до черги!",
	event_mp_playerError: "Виникли проблеми з підключенням => ${errorMessage}",
	event_mp_error: "Виникла проблема з музичною чергою => ${errorMessage}",
	event_mp_emptyChannel:
		"${emoji_No} | Ніхто не знаходиться в голосовому каналі, виходимо...",
	event_mp_playerSkip:
		"${emoji_Music_Icon} - Пропускається **${trackTitle}** !",
	event_mp_emptyQueue:
		"${emoji_Warning_Icon} - Музика зупинена, оскільки в черзі більше немає музики!",
	event_channel_create_message_embed_title: "Успішно налаштовано!",
	event_channel_create_message_embed_description:
		"Бот було налаштовано і він готовий до роботи. Вам більше нічого не потрібно робити.\n\nУсі журнали модерації, пов'язані з iHorizon, будуть відображатися тут",
	event_welcomer_inviter:
		"{memberMention} (акаунт створено {accountCreationTimestamp}) приєднався(-лася) до сервера. Запросив(-ла) **{inviterUsername}** (**{invitesCount}** запрошень), тепер нас {memberCount} на сервері {guildName}",
	event_welcomer_default:
		"{memberMention} (акаунт створено {accountCreationTimestamp}) приєднався(-лася) до сервера. Тепер нас {memberCount} на сервері {guildName}",
	event_goodbye_inviter:
		"`{memberUsername}` (акаунт створено {accountCreationTimestamp}) покинув(-ла) сервер. Запросив(-ла) **{inviterUsername}** (**{invitesCount}** запрошень), тепер нас {memberCount} на сервері {guildName}",
	event_goodbye_default:
		"`{memberUsername}` (акаунт створено {accountCreationTimestamp}) покинув(-ла) сервер. Тепер нас {memberCount} на сервері {guildName}",
	event_xp_level_earn:
		"**Новий рівень**, {memberMention}, ви отримали новий рівень, ваш поточний рівень: **{xpLevel}**",
	event_xp_level_additional_info:
		"\n-# ${emoji_VC_OpenChat} Це повідомлення вас дратує? Його можна вимкнути, вимкнувши систему рівнів командою `/ranks config`.",
	event_ticket_embed_description:
		"Привіт, ${userUsername}, ласкаво просимо до вашого тікета",
	event_ticket_add_member:
		"${author}, ви **додали** ${addedMembers} до тікету ${channel} !",
	event_ticket_del_member:
		"${author}, ви **видалили** ${removedMembers} з тікета ${channel} !",
	event_ticket_button_name: "Створити тікет",
	event_ticket_category_awaiting_response:
		"Виберіть категорію [${emoji}] >> ${name}",
	event_ticket_reason_awaiting_response:
		"${author} чи потрібно користувачеві вказати причину перед створенням тікета?",
	event_ticket_create_reason_modal_title: "У чому причина вашого звернення?",
	event_ticket_create_reason_modal_fields_1_label: "Причина звернення",
	event_ticket_reason_embed_desc: "# Причина звернення\n`${reason}`",
	iC_event_cooldown: "Кулдаун, будь ласка, зачекайте трохи між командами!",
	iC_event_connection_error: "Помилка підключення!",
	Msg_cooldown: "Можете почекати секунду перед виконанням команди?",
	ticket_module_button_delete: "Видалити тікет",
	ticket_module_button_transcript: "Транскрипт тікету",
	ticket_module_button_addmember: "Додати учасника",
	ticket_module_button_removemember: "Видалити учасника",
	ticket_module_add_question:
		"Кого ви хочете додати до тікету? (Вкажіть їх ідентифікатор користувача)!",
	ticket_module_remove_question:
		"Кого ви хочете видалити з тікету? (Вкажіть їх ідентифікатор користувача)!",
	ticket_transcript_failed_to_send:
		"Я спробував надіслати вам файл в особисті повідомлення, але ви їх заблокували :/",
	event_srvLogs_banAdd_description:
		"<@${executorId}> **забанив** <@${targetId}>",
	event_srvLogs_banAdd_fields_name: "Причина",
	event_srvLogs_banAdd_fields_value: "`{reason}`",
	event_srvLogs_banRemove_description:
		"<@${executorId}> **зняв бан** з ${targetUsername}",
	event_srvLogs_guildMemberRemove_description:
		"<@${executorId}> **вигнав** <@${targetId}>",
	event_srvLogs_guildMemberUpdate_description:
		"📤 <@${executorId}> зняв роль ${removedRoles} з ${oldMemberUserUsername}",
	event_srvLogs_guildMemberUpdate_2_description:
		"📥 <@${executorId}> додав роль ${addedRoles} до ${oldMemberUserUsername}",
	event_srvLogs_messageDelete_description:
		"**Повідомлення видалено в <#${messageChannelId}>**\n${messageContent}",
	event_srvLogs_messageUpdate_description:
		"**Повідомлення відредаговане** [в](xxx) **<#${oldMessageChannelId}>**",
	event_srvLogs_messageUpdate_footer_1: "До",
	event_srvLogs_messageUpdate_footer_2: "Після",
	event_srvLogs_voiceStateUpdate_description:
		"📤 <@${targetUserId}> покинув канал <#${OchannelID}>",
	event_srvLogs_voiceStateUpdate_2_description:
		"📥 <@${targetUserId}> приєднався до каналу <#${channelID}>",
	event_srvLogs_voiceStateUpdate_3_description:
		"<@${targetUserId}> вимкнув мікрофон у каналі <#${channelID}>",
	event_srvLogs_voiceStateUpdate_4_description:
		"<@${targetUserId}> увімкнув мікрофон у каналі <#${channelID}>",
	event_srvLogs_voiceStateUpdate_5_description:
		"<@${targetUserId}> вимкнув звук у каналі <#${channelID}>",
	event_srvLogs_voiceStateUpdate_6_description:
		"<@${targetUserId}> увімкнув звук у каналі <#${channelID}>",
	event_srvLogs_channelUpdate_disabled_for:
		"-    ❌ ${perm} вимкнено для ${target}\n",
	event_srvLogs_channelUpdate_enabled_for:
		"-    ✅ ${perm} увімкнено для ${target}\n",
	event_srvLogs_channelUpdate_allowed_for:
		"-    ✅ ${perm} дозволено для ${target}\n",
	event_srvLogs_channelUpdate_unallowed_for:
		"-    ❌ ${perm} не дозволено для ${target}\n",
	event_srvLogs_channelUpdate_field_name: "🎫 Назва: ${newChannelName}\n",
	event_srvLogs_channelUpdate_perm_added: "🛡 Додано дозволи для ${target}:\n",
	event_srvLogs_channelUpdate_embed_desc: "${newChannel} оновлено",
	event_rank_role: "<@${messageAuthorId}>, у вас тепер є нова роль <@&${id}>",
	event_suggestion_too_short:
		"<@${authorId}>, пропозиція має містити щонайменше 5 слів. Ваше повідомлення буде видалено через 10 секунд, скопіюйте його, якщо хочете переписати.",
	event_suggestion_embed_author:
		"Нова пропозиція від ${messageAuthorUsername}",
	event_security_title: "Ласкаво просимо на ${guild}!",
	event_security:
		"${member}, будь ласка, введіть капчу, надіслану в цьому повідомленні.\nВаша відповідь має бути в правильному синтаксисі!\n__У вас є 30 секунд на відповідь.__",
	event_security_expiry:
		"{emoji} Автоматичне вигнання ${timestamp} (залишилося спроб: **${attempts}**).",
	event_security_footer:
		"Це займе лише кілька секунд і допоможе зберегти нашу спільноту в безпеці.",
	event_security_kick_reason: "Перевірку безпеки не пройдено",
	event_ticket_whenCreated_msg:
		"${author}, ваш тікет був створений, відвідайте <#${channelId}>!",
	event_ticket_logsChannel_onCreation_embed_title:
		"Логи тікетів - Створення панелі",
	event_ticket_logsChannel_onCreation_embed_desc:
		"Панель тікетів з назвою `${name}` в ${interaction} створена!",
	event_ticket_logsChannel_onCreationChannel_embed_title:
		"Логи тікетів - Створення тікету",
	event_ticket_logsChannel_onCreationChannel_embed_desc:
		"Квиток створено: ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onClose_embed_title:
		"Логи тікетів - Закриття тікету",
	event_ticket_logsChannel_onClose_embed_desc:
		"Квиток тепер закритий ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onRemoveMember_embed_title:
		"Логи тікетів - Видалення учасника з тікету",
	event_ticket_logsChannel_onRemoveMember_embed_desc:
		"${member} видалений з тікету ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onAddMember_embed_title:
		"Логи тікетів - Додавання учасника до тікету",
	event_ticket_logsChannel_onAddMember_embed_desc:
		"${member} доданий до тікету ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onReopen_embed_title:
		"Логи тікетів - Повторне відкриття тікету",
	event_ticket_logsChannel_onReopen_embed_desc:
		"${author} повторно відкриває тікет (<#${channelId}>)!",
	event_ticket_logsChannel_onDelete_embed_title:
		"Логи тікетів - Видалення тікету",
	event_ticket_logsChannel_onDelete_embed_desc:
		"${author} видалив тікет (#${channelName})!",
	event_ticket_logsChannel_onLeave_embed_desc:
		"${author} покинув сервер: його тікет (#${channelName}) закрито й видалено, транскрипт додано.",
	event_ticket_logsChannel_onAddMember2_embed_title:
		"Логи тікетів - Додавання/видалення учасників з тікету",
	event_ticket_logsChannel_onAddMember2_embed_desc:
		"${author}\nВидалені: ${removedMembers}.\nДодані: ${addedMembers}.\n в тікеті (${channel})!",
	event_ticket_already_opened:
		"Ой, у вас уже відкрито тікет (<#${channelId}>)! Закрийте його, перш ніж відкривати новий.",
	event_gw_reroll_win_msg: "Вітаємо ${winners}! ваш приз **${prize}**!",
	event_gw_reroll_cannot_win_msg:
		"Немає дійсних учасників, тому переможець не може бути визначений!",
	event_gw_finnish_msg: "Вітаємо ${winners}! Ваш приз **${prize}**!",
	event_gw_finnish_cannot_msg:
		"Немає дійсних учасників, тому переможець не може бути визначений!",
	event_gw_finnish_button_title: "Розіграш завершено",
	event_gw_entries_button_title: "Список учасників",
	event_gw_removeentries_msg: "${author}, ви покинули цей конкурс!",
	event_gw_leave_button_placeholder: "Вийти з розіграшу",
	event_gw_confirm_leave_msg:
		"${author}, ви впевнені, що хочете вийти з цього розіграшу?",
	event_gw_embed_desc:
		"Завершення: ${end_string} (${end_string2})\nОрганізатор: <@${hostedBy}>\nУчасників: **${entries}**\nПереможців: **${winners_amount}**",
	event_gw_ended_embed_desc:
		"Завершено: ${time1} (${time2})\nОрганізатор: <@${hostedBy}>\nУчасників **${entrieCount}**\nПереможці: ${winners}",
	event_gw_entries_words: "Учасники",
	event_gw_ended_word:
		"Завершено: ${ended} (${time2})\nОрганізатор: <@${hostedBy}>\nУчасників **${entries}**\nПереможці: ${winners}",
	event_gw_break_req:
		"${emoji_No} Ви не відповідаєте умовам участі в цьому розіграші.\nТип: `${requirementType}`\nЗначення: `${requirementValue}`",
	event_boostlog_add:
		"<@${newMemberUserId}> **лише що покращив(ла)** сервер! (**${boostCount}** всього покращень)",
	event_boostlog_sub:
		"<@${newMemberUserId}> **лише що зняв(ла) своє покращення** з сервера! (**${boostCount}** всього покращень)",
	economy_disable_msg:
		"<@${authorId}>, `Модуль Економіки` на цьому сервері **відключено**. Тепер ви не можете використовувати модуль економіки!",
	event_permission_wrong:
		"${author}, вам не дозволено використовувати цю команду! Потрібен дозвіл: ${neededPerm}",
	temporary_voice_title_embec:
		"## Зміни у вашому тимчасовому голосовому каналі",
	temporary_voice_unblocked_member: "Розблоковані учасники",
	temporary_voice_blocked_mmeber: "Заблоковані учасники",
	temporary_voice_no_one: "Ніхто",
	temporary_voice_new_member: "Новий власник",
	temporary_voice_old_member: "Старий власник",
	temporary_voice_modal_title: "Панель керування голосом iHorizon",
	temporary_voice_new_userlimit: "Новий ліміт користувачів",
	temporary_voice_new_name: "Нова назва",
	temporary_voice_new_region: "Новий регіон",
	temporary_voice_untrusted_member: "Ненадійні учасники",
	temporary_voice_trusted_member: "Довірені учасники",
	temporary_voice_block_button_menu_placeholder:
		"Вибрані користувачі не матимуть доступу",
	temporary_voice_delete_button_desc_embed:
		"## Видалення каналу\nКанал успішно видалено!",
	temporary_voice_limit_button_menu_label: "Який ліміт користувачів каналу?",
	temporary_voice_limit_button_not_integer:
		"${emoji_No} | Введене значення не є числом",
	temporary_voice_name_button_menu_label: "Яка назва каналу?",
	temporary_voice_privacy_menu_placeholder:
		"Виберіть параметр конфіденційності",
	temporary_voice_privacy_menu_lock_label: "Заблокувати канал",
	temporary_voice_privacy_menu_lock_desc:
		"Тільки довірені користувачі зможуть приєднатися до вашого голосового каналу",
	temporary_voice_privacy_menu_unlock_label: "Розблокувати канал",
	temporary_voice_privacy_menu_unlock_desc:
		"Всі зможуть приєднатися до вашого голосового каналу",
	temporary_voice_privacy_menu_invisible_label: "Невидимий",
	temporary_voice_privacy_menu_invisible_desc:
		"Тільки довірені користувачі зможуть бачити ваш голосовий канал",
	temporary_voice_privacy_menu_visible_label: "Видимий",
	temporary_voice_privacy_menu_visible_desc:
		"Всі зможуть бачити ваш голосовий канал",
	temporary_voice_privacy_menu_closechat_label: "Закрити чат",
	temporary_voice_privacy_menu_closechat_desc:
		"Тільки довірені користувачі зможуть надсилати повідомлення у ваш чат",
	temporary_voice_privacy_menu_openchat_label: "Відкрити чат",
	temporary_voice_privacy_menu_openchat_desc:
		"Всі зможуть надсилати повідомлення у ваш чат",
	temporary_voice_region_menu_placeholder: "Виберіть регіон",
	temporary_voice_transfer_menu_placeholder:
		"Вибраний користувач для передачі голосового каналу",
	temporary_voice_transfer_trust_placeholder:
		"Вибрані користувачі будуть довірені для приєднання",
	temporary_voice_transfer_unblocked_placeholder:
		"Вибрані користувачі будуть розблоковані для приєднання",
	temporary_voice_transfer_untrust_placeholder:
		"Вибрані користувачі не будуть довірені для приєднання",
	temporary_voice_channel_name: "Канал {nickname}",
	tempvoice_v2_embed_title: "## ${emoji_VC_Name} ${channelName}",
	tempvoice_v2_embed_desc:
		"Ласкаво просимо до вашого тимчасового голосового каналу, ${owner}!\nКеруйте ним кнопками нижче.",
	tempvoice_v2_hint: "-# Лише власник каналу може користуватися цим меню.",
	tempvoice_v2_select_placeholder: "Керувати голосовим каналом...",
	tempvoice_cfg_panel_title: "Налаштування TempVoice",
	tempvoice_cfg_panel_desc:
		"Налаштуйте модуль TempVoice нижче. Кожна зміна застосовується одразу, а кожен створений голосовий канал отримує власну панель керування.",
	tempvoice_cfg_hub: "Канал «Зайди, щоб створити»",
	tempvoice_cfg_category: "Канали створюються в",
	tempvoice_cfg_name: "Назва каналу",
	tempvoice_cfg_position: "Позиція в категорії",
	tempvoice_cfg_position_top: "Угорі",
	tempvoice_cfg_position_bottom: "Унизу",
	tempvoice_cfg_staff: "Ролі персоналу (обхід дозволів)",
	tempvoice_cfg_select_placeholder: "Інші налаштування...",
	tempvoice_cfg_opt_name: "Змінити назву каналу",
	tempvoice_cfg_opt_position_top: "Позиція: угорі",
	tempvoice_cfg_opt_position_bottom: "Позиція: унизу",
	tempvoice_cfg_done: "Готово",
	tempvoice_cfg_remove_hub: "Прибрати канал «Зайди, щоб створити»",
	tempvoice_cfg_saved: "Налаштування TempVoice збережено!",
	tempvoice_cfg_expired:
		"Термін дії панелі налаштувань минув. Знову запустіть /tempvoice.",
	tempvoice_cfg_modal_title: "Задати назву каналу",
	tempvoice_cfg_modal_label: "Назва | Змінна: {Username}",
	protection_avoid_channel_delete:
		"**РЕЖИМ ЗАХИСТУ УВІМКНЕНО**\n<@${channelGuildOwnerId}>, канал було відновлено, <@${executorId}> намагався видалити канал!",
	protection_blockbot_embed_title: "⚠️ Небезпека на ${memberGuildName} ⚠️",
	protection_blockbot_embed_desc:
		"# Попередження BotAdd\nХтось спробував додати Discord-бота.",
	var_target_bot: "Цільовий бот",
	var_not_detected: "Не виявлено",
	antispam_base_warn_message:
		"Увага, ${mentionedMembers}, ви спамите і можете бути покарані.",
	antispam_more_ban_msg: " Якщо ви продовжите, вас буде забанено на сервері.",
	antispam_more_mute_msg: " Якщо ви продовжите, вас буде вимкнено.",
	antispam_more_kick_msg: " Якщо ви продовжите, вас буде вилучено з сервера.",
	antispam_log_embed_title: "[АнтіСпам] Новий ${actionType}",
	antispam_log_embed_desc: "${bot} **${actionType}** ${user}",
	hybridcommands_global_prefix_mention: "`@Ping-Me`",
	hybridcommands_global_prefix_cleaned_mention: "@Ping-Me ",
	hybridcommands_args_error_embed_desc:
		'```ts\nНазва команди: ${currentCommandName}\n```\n```cs\n${botPrefix}${fullNameCommand} ${argsString}\n${errorPosition}\nПомилка в аргументі "${wrongArgumentName}".\n```',
	hybridcommands_embed_help_title: "Довідка: ${commandName}",
	hybridcommands_embed_help_fields_value:
		"**Псевдоніми:** ${aliases}\n**Використання:** ${use}",
	hybridcommands_embed_footer_text:
		"Параметри в [...] обов'язкові, а в <...> — необов'язкові.\nВикористайте команду ${botPrefix}help [command], щоб дізнатися більше.",
	ping_bot_show_info_msg:
		"Привіт, ${messageAuthor}! Я на 100% працюю через `Slash Command` (${emoji_Slash_Bot_Badge}) і більш ніж на 85% — через префіксні команди. Мій префікс на **цьому сервері**: `${prefix}`!\n",
	ping_bot_show_info_msg_about_change_prefix:
		"\n-# ${emoji_VC_OpenChat} Не подобається мій префікс? Змініть його командою **`/guildconfig bot prefix`**!",
	notifier_on_new_media_default_message:
		"@everyone **[{artistAuthor}](<{artistLink}>)** опублікував нове відео [Натисніть тут]({mediaURL})",
	notifier_on_new_media_default_button_label: "Переглянути!",
	notifier_generateAuthorsEmbed_embed_desc:
		"Ось список усіх стрімерів/ютуберів:\n",
	notifier_generateAuthorsEmbed_embed_title: "Усі стрімери/ютубери сервера",
	notifier_generateConfigurationEmbed_embed_title:
		"Налаштування модуля Notifier",
	notifier_generateConfigurationEmbed_embed_fields_1_name: "Канал сповіщень",
	notifier_generateConfigurationEmbed_embed_fields_2_name:
		"Повідомлення сповіщення",
	buttonreaction_role_doesnt_exit:
		"Роль із моєї бази даних більше не існує на сервері!",
	buttonreaction_role_too_high:
		"Роль зависока, я не можу видати чи забрати її. Потрібно змінити мої дозволи!",
	buttonreaction_role_add: "Тепер у вас є роль ${role} :tada:",
	buttonreaction_role_remove: "У вас більше немає ролі ${role} ✅",
	rolepanel_setup_embed_title: "Налаштування панелі ролей",
	rolepanel_setup_embed_desc:
		"Виберіть ролі, які можна додати чи забрати в ${member}. Якщо ${member} вже має вибрану роль, її буде забрано. Недозволені ролі буде проігноровано.",
	rolepanel_setup_embed_roles_field: "Дозволені ролі",
	rolepanel_setup_embed_refused_field: "Відхилені ролі",
	rolepanel_setup_select_placeholder: "Виберіть ролі для пропозиції",
	rolepanel_setup_apply_button: "Створити панель",
	rolepanel_setup_no_roles: "Не вибрано жодної дійсної ролі.",
	rolepanel_setup_saved: "Панель ролей надіслано.",
	rolepanel_panel_embed_title: "Панель ролей",
	rolepanel_panel_embed_desc:
		"Виберіть ролі, які хочете додати до свого профілю чи прибрати з нього.",
	rolepanel_panel_select_placeholder: "Виберіть свої ролі",
	rolepanel_role_managed_or_everyone: "Системна роль або @everyone",
	rolepanel_role_too_high_bot: "Роль вища за бота",
	rolepanel_role_too_high_user: "Роль вища за вашу",
	rolepanel_role_missing_permissions: "Бракує дозволів: ${permissions}",
	rolepanel_logs_embed_title_create: "Журнал панелей ролей",
	rolepanel_logs_embed_desc_create:
		"<@${authorId}> створив панель ролей (${messageId}) з: ${roles}",
	rolepanel_logs_embed_title_apply: "Журнал використання панелей ролей",
	rolepanel_logs_embed_desc_apply:
		"<@${authorId}> змінив ролі <@${memberId}> через панель. Додано: ${addedRoles} | Забрано: ${removedRoles}",
	rc_created_by: "Створив:",
	rc_created_on: "Створено:",
	rc_total_membres: "Усього учасників",
	rc_total_verification: "Усього підтверджень",
	rc_total_key_used_count: "Кількість використань ключа",
	rc_recent_locales_distribution: "Розподіл мов учасників",
	rc_recent_verifications: "Останні підтвердження",
	rc_registration_over_time: "Реєстрації з часом",
	piconly_module_punish_msg:
		"${messageAuthor}, вам видано тайм-аут на 10 хвилин за надсилання забагатьох повідомлень без зображень у каналі лише для зображень.",
	piconly_module_warn_msg:
		"${messageAuthor}, цей канал приймає лише повідомлення із зображеннями (формати: JPG, PNG, GIF, WEBP, BMP, TIFF). Попередження ${userWarningCount}/${threshold}",
	piconly_module_timeout_reason:
		"Спам повідомленнями без зображень у каналі лише для зображень",
	event_nick_kicker_kick_reason:
		"Заборонене слово в імені користувача - Nick Kicker",
	event_nick_kicker_kick_msg:
		"На сервері `${memberGuildName}` ваше ім'я користувача містить заборонене слово. Вас вигнано з сервера.",
	pfps_embed_user_title: "Аватар **користувача** ${username}",
	pfps_embed_guild_title: "Аватар ${username} **на сервері**",
	pfps_download_user_button: "Завантажити аватар користувача",
	pfps_download_guild_button: "Завантажити аватар сервера",
	addrolereact_role_not_found: "Роль не знайдено.",
	addrolereact_cannot_check_permissions:
		"Не вдається перевірити ваші дозволи.",
	addrolereact_role_too_high:
		"Ви не можете додати роль, вищу за вашу найвищу роль або рівну їй.",
	addrolereact_must_be_text_channel:
		"Цю команду потрібно виконувати в текстовому каналі.",
	addrolereact_message_not_found: "Повідомлення не знайдено.",
	addrolereact_no_reactions: "Це повідомлення не має реакцій.",
	addrolereact_adding_role: "Триває додавання ролі {role}...",
	addrolereact_adding_role_progress:
		"Триває додавання ролі {role} для {count} користувачів...",
	addrolereact_role_added:
		"Роль {role} додано. Її отримали користувачі: {count}.",
	addrolereact_error: "Помилка під час виконання команди.",
	channel_hide_in_progress: "Приховування поточного каналу...",
	channel_hide_success: "Канал був прихований від @everyone",
	channel_hide_already_hidden: "Цей канал уже прихований від @everyone",
	channel_unhide_in_progress: "Показ поточного каналу...",
	channel_unhide_success: "Канал тепер видимий для @everyone",
	channel_unhide_already_visible: "Цей канал уже видимий для @everyone",
	channel_hideall_in_progress: "Приховування всіх каналів в процесі...",
	channel_hideall_success:
		"**Приховування завершено!**\n**Статистика:**\n• **{hiddenCount}** каналів приховано\n• **{errorCount}** помилок виявлено",
	channel_hideall_error: "Сталася помилка під час приховування каналів.",
	channel_unhideall_in_progress: "Показ всіх каналів в процесі...",
	channel_unhideall_success:
		"**Показ завершено!**\n**Статистика:**\n• **{unhiddenCount}** каналів показано\n• **{errorCount}** помилок виявлено",
	channel_unhideall_error: "Сталася помилка під час показу каналів.",
	new_guild_embed_title: [
		"Ласкаво просимо на наш сервер! 🎉",
		"Вітаємо, друзі-дискордівці! 👋",
		"iHorizon приєднався до чату! 💬",
		"Це птах? Це літак? Ні, це iHorizon! 🦸‍♂",
		"Тепло зустріньмо iHorizon! 🔥"
	],
	guild_create_btn_website: "Сайт iHorizon",
	guild_create_btn_repos: "Репозиторії iHorizon",
	guild_create_btn_support: "Сервер підтримки",
	guild_create_btn_docs: "Документація iHorizon",
	welcome_server_intro:
		"Дякую, що запросили мене! Я **iHorizon**: модерація, тікети, музика, захист, журнали та багато іншого в одному боті, **безкоштовному** й з **відкритим кодом**.",
	welcome_lang_title: "Мова",
	welcome_lang_text:
		"Тут я розмовляю мовою {language}, вибраною за регіоном вашого сервера.\nЩоб змінити її, адміністратор може скористатися {command}: на панелі можна вибрати одну з {count} мов.",
	welcome_start_title: "Початок роботи",
	welcome_start_help: "{command} показує всі команди за категоріями",
	welcome_start_dashboard:
		"[Панель керування]({url}) дає змогу налаштувати все з браузера",
	welcome_start_support:
		"Маєте запитання чи знайшли баг? Наш [сервер підтримки]({url}) до ваших послуг",
	welcome_footer:
		"Безкоштовно та з відкритим кодом з 2020 року · ihorizon.org",
	welcome_dm_title: "Дякуємо, що додали iHorizon!",
	welcome_dm_intro:
		"iHorizon щойно приєднався до {guild}. Ось усе, що потрібно для початку.",
	welcome_dm_outro:
		"> *Безкоштовний бот може бути кращим за платних.*\nЦе і є iHorizon: спільнота й проєкт, які з 2020 року підтримують ентузіасти. Ласкаво просимо на борт!",
	welcome_btn_dashboard: "Панель керування",
	bot_server_bio:
		"{wink_emoji} **iHorizon Discord Bot** **`+{count} команд`**\n> *« Створено людьми з 2022 року для вашої спільноти. »*\n**https://www.ihorizon.org**",
	guild_leave_data_clear_notice_title: "iHorizon покинув ${guildName}",
	guild_leave_data_clear_notice_description:
		"Ох, як сумно. Ви вигнали бота з `${guildName}`. Дані сервера буде видалено ${deleteAt}, якщо iHorizon до того часу не повернеться.",
	guild_leave_data_clear_notice_message:
		"Ох, як сумно. Ви вигнали iHorizon з `${guildName}`. Дані буде видалено ${deleteAt}.",
	guild_leave_data_clear_cancelled_title:
		"iHorizon повернувся на ${guildName}",
	guild_leave_data_clear_cancelled_description:
		"Ура, дякуємо, що знову додали iHorizon на `${guildName}`. Заплановане видалення даних скасовано.",
	guild_leave_data_clear_cancelled_message:
		"Ура, дякуємо, що знову додали iHorizon на `${guildName}`. Дані вашого сервера в безпеці.",
	confession_embed_logs_title: "Нове зізнання",
	confession_channel_button_name: "Відповісти анонімно",
	confession_1_embed_log_title: "Нова відповідь на зізнання",
	global_unknown_message: "Повідомлення не знайдено.",
	global_error: "❌ Помилка",
	global_not_atc: "Вибране повідомлення не містить вкладення.",
	global_not_valid_atc: "Вибране вкладення не є дійсним аудіофайлом.",
	global_too_heavy_file:
		"Створений файл MP4 завеликий (${fileSize} МБ). Обмеження Discord — 25 МБ.",
	global_convert_ok: "✅ Конвертацію виконано",
	global_convert_ok_desc:
		"Ваш аудіофайл конвертовано в MP4 (${fileSize} МБ).",
	economy_logs_add_money_title: "Журнал економіки - Додавання грошей",
	economy_logs_remove_money_title: "Журнал економіки - Вилучення грошей",
	economy_logs_boost_role_title: "Журнал економіки - Буст для ролі",
	economy_logs_config_title: "Журнал економіки - Налаштування модуля",
	economy_logs_role_add_title:
		"Журнал економіки - Нову роль додано до магазину",
	economy_logs_role_remove_title:
		"Журнал економіки - Роль вилучено з магазину",
	economy_logs_pay_title: "Журнал економіки - Переказ",
	economy_logs_rob_title: "Журнал економіки - Пограбування",
	economy_logs_set_cooldown_title: "Журнал економіки - Встановлення затримки",
	economy_logs_set_money_title: "Журнал економіки - Встановлення грошей",
	economy_logs_withdraw_title: "Журнал економіки - Зняття",
	economy_logs_deposit_title: "Журнал економіки - Внесок",
	economy_logs_add_money_desc: "{author} додав {target} `{amount}$` {coin}",
	economy_logs_remove_money_desc:
		"{author} забрав у {target} `{amount}$` {coin}",
	economy_logs_boost_role_desc:
		"{author} встановив буст для ролі {role}. Тепер буст: `x{amount}`",
	economy_logs_config_desc: "{author}: модуль економіки {state}",
	economy_logs_role_add_desc:
		"{author} додав роль {role} до магазину. Ціна: `{amount}$`",
	economy_logs_role_remove_desc: "{author} вилучив роль {role} з магазину.",
	economy_logs_pay_desc: "{author} надіслав `{amount}$` користувачу {target}",
	economy_logs_rob_desc: "{author} пограбував {target} на `{amount}$`",
	economy_logs_set_cooldown_desc:
		"{author} встановив затримку для `{type}` на **{time}**",
	economy_logs_set_money_desc:
		"{author} встановив гроші для `{type}` на **{money}**",
	economy_logs_withdraw_desc: "{author} зняв з банку **${money}**",
	economy_logs_deposit_desc: "{author} вніс **${money}** до банку",
	var_on: "увімкнено",
	var_off: "вимкнено",
	global_command_cooldown_msg:
		"${emoji} Між використаннями **`${ctxCommandPath}`** потрібно зачекати **${time}**",
	counter_error_too_much_u:
		"<@${messageAuthorId}> ЗБИВСЯ НА **${number}**!! Наступне число — **1**. **Не можна рахувати двічі поспіль.**",
	counter_error_syntaxic:
		"<@${messageAuthorId}> ПОМИЛИВСЯ!! Наступне число — **1**.",
	global_blacklist_msg_to_send:
		"Вас автоматично заблоковано на цьому сервері, оскільки ваш обліковий запис є в глобальному чорному списку iHorizon.\n\nПричина: `${reason}`\n\nЗгідно з розділом 3 наших Умов використання, сервери, що користуються iHorizon, погоджуються, що бот може автоматично застосовувати санкції, пов'язані з цим глобальним чорним списком.\n\nЯкщо ви вважаєте це помилкою або хочете оскаржити рішення, зробіть це тут:\nОскарження: <https://www.ihorizon.org/appeal>\n\nУмови використання: <https://www.ihorizon.org/tos>",
	global_blacklist_reason:
		"Покарання проєкту iHorizon - Чорний список | Причина: ${reason}",
	server_blacklist_msg_to_send:
		"Вас заблоковано, оскільки ви в чорному списку цього сервера.\nПричина: `${data2Reason}`",
	server_blacklist_reason: "Чорний список | Причина: ${data2Reason}",
	help_sticky_fields: "Sticky",
	help_sticky_dsc:
		"> *Тримайте важливе повідомлення завжди на виду у своїх каналах завдяки автоматичному повторному надсиланню.*",
	sticky_channel_command_error:
		"${emoji_No} | ${author}, я не знайшов дійсного текстового каналу.",
	sticky_text_command_missing_message:
		"${emoji_No} | ${author}, потрібно вказати закріплене повідомлення.",
	sticky_text_command_work:
		"${emoji_Yes} | ${author}, закріплене текстове повідомлення тепер активне в ${channel}.",
	sticky_embed_command_embed_not_found:
		"${emoji_No} | ${author}, я не знайшов ембед `${embed_id}`.",
	sticky_embed_command_work:
		"${emoji_Yes} | ${author}, закріплений ембед `${embed_id}` тепер активний в ${channel}.",
	sticky_disable_command_not_found:
		"${emoji_No} | ${author}, у ${channel} не налаштовано закріпленого повідомлення.",
	sticky_disable_command_work:
		"${emoji_Yes} | ${author}, закріплене повідомлення в ${channel} вимкнено.",
	sticky_refresh_command_not_found:
		"${emoji_No} | ${author}, у ${channel} не налаштовано закріпленого повідомлення.",
	sticky_refresh_command_missing_embed:
		"${emoji_No} | ${author}, закріплене повідомлення в ${channel} посилається на ембед, якого більше не існує.",
	sticky_refresh_command_missing_permissions:
		"${emoji_No} | ${author}, я не можу повторно надіслати закріплене повідомлення в ${channel}. Перевірте мої дозволи.",
	sticky_refresh_command_work:
		"${emoji_Yes} | ${author}, закріплене повідомлення повторно надіслано в ${channel}.",
	sticky_show_command_not_found:
		"${emoji_No} | ${author}, у ${channel} не налаштовано закріпленого повідомлення.",
	sticky_show_embed_title: "Налаштування закріпленого повідомлення",
	sticky_show_embed_fields_channel: "Канал",
	sticky_show_embed_fields_type: "Тип",
	sticky_show_embed_fields_status: "Стан",
	sticky_show_embed_fields_message: "Повідомлення",
	sticky_show_embed_fields_embed: "ID ембеда",
	sticky_show_embed_fields_last_message:
		"ID останнього закріпленого повідомлення",
	sticky_list_embed_title: "Канали із закріпленими повідомленнями",
	sticky_list_embed_desc_empty:
		"На цьому сервері не налаштовано жодного каналу із закріпленим повідомленням.",
	sticky_list_embed_desc_line_text: "${channel} - Закріплений текст",
	sticky_list_embed_desc_line_embed:
		"${channel} - Закріплений ембед (`${embed_id}`)",
	sticky_list_embed_desc_line_text_embed:
		"${channel} - Закріплені текст + ембед (`${embed_id}`)",
	sticky_var_text: "Текст",
	sticky_var_embed: "Ембед",
	sticky_var_text_embed: "Текст + ембед",
	sticky_var_enabled: "Увімкнено",
	sticky_var_disabled: "Вимкнено",
	sticky_var_none: "Немає",
	honeypot_config_not_allowed:
		"Щоб налаштувати Honeypot, потрібно бути адміністратором або бути в списку дозволених.",
	honeypot_config_embed_title: "Налаштування Honeypot",
	honeypot_config_embed_desc:
		"Налаштуйте канал-пастку, канал журналів і автоматичну дію, яка застосовується, коли хтось починає надсилати повідомлення в канал *Honeypot*.",
	honeypot_config_embed_field_status: "Стан",
	honeypot_config_embed_field_trap_channel: "Канал-пастка",
	honeypot_config_embed_field_logs_channel: "Канал журналів",
	honeypot_config_embed_field_action: "Дія",
	honeypot_config_embed_field_message: "Надіслане повідомлення",
	honeypot_config_embed_field_notes: "Примітки",
	honeypot_config_embed_field_credit: "Подяки",
	honeypot_config_notes_value:
		"- **Для максимальної ефективності розмістіть роль iHorizon над усіма ролями учасників.**\n- **Для максимальної ефективності автоматично створені канали Honeypot переміщуються на верх сервера.**\n- **Канал Honeypot можна перейменувати, нічого не зламавши.**",
	honeypot_config_credit_value:
		"*Натхненно ботом Honeypot від RiskyMH, загляньте до нього!*\n${url}",
	honeypot_config_select_trap_placeholder: "Виберіть канал-пастку",
	honeypot_config_select_logs_placeholder: "Виберіть канал журналів",
	honeypot_config_select_action_placeholder: "Виберіть дію",
	honeypot_config_button_send: "Надіслати ембед",
	honeypot_config_button_preview: "Попередній перегляд",
	honeypot_config_button_enable: "Увімкнути Honeypot",
	honeypot_config_button_disable: "Вимкнути Honeypot",
	honeypot_config_send_success: "Ембед Honeypot надіслано в ${channel}.",
	honeypot_config_enable_success: "Honeypot тепер увімкнено в ${channel}.",
	honeypot_config_disable_success: "Honeypot тепер вимкнено.",
	honeypot_config_missing_logs_channel:
		"Перш ніж увімкнути Honeypot, потрібно налаштувати канал журналів.",
	honeypot_config_generic_error:
		"Під час оновлення Honeypot сталася помилка.",
	honeypot_config_select_action_kick: "Виганяти користувачів",
	honeypot_config_select_action_ban: "Банити користувачів",
	honeypot_config_select_action_none: "Лише видаляти повідомлення",
	honeypot_config_select_action_del_messages: "Видаляти повідомлення",
	honeypot_default_channel_name: "🍯・загальний-чат",
	honeypot_action_none: "Лише видалення повідомлень",
	honeypot_action_failed: "Дію не виконано",
	honeypot_dm_action_kicked: "вас вигнано!",
	honeypot_dm_action_banned: "вас заблоковано!",
	honeypot_dm_action_none: "ваші повідомлення видалено",
	honeypot_trap_embed_title: "НЕ НАДСИЛАЙТЕ ПОВІДОМЛЕНЬ У ЦЕЙ КАНАЛ",
	honeypot_trap_embed_desc:
		"*Цей канал використовується для виявлення спам-ботів.*\n*Будь-яке повідомлення, надіслане сюди, **ОБОВ'ЯЗКОВО** запустить автоматичний захист сервера.*",
	honeypot_trap_embed_footer:
		"Натхненно ботом Honeypot від RiskyMH, загляньте до нього!\n${url}",
	honeypot_trap_count_none: "Ще ніхто не покараний",
	honeypot_trap_count_one: "Покарано 1 людину",
	honeypot_trap_count_other: "Покарано: ${caughtCount}",
	honeypot_trap_count_never: "ніколи",
	honeypot_trap_count_reply:
		"🍯 Покарань цією пасткою: **${caughtCount}**\nОстаннє: ${last}",
	honeypot_dm_title: "HONEYPOT СПРАЦЮВАВ!",
	honeypot_dm_desc:
		"Повідомлення, яке ви надіслали в канал *Honeypot* на сервері **`${guild}`**, **запустило** налаштований захист.\n\n__Дія щодо вас:__ **`${action}`**\n\n*Повідомлення, надіслані вами за останні 2 години, видаляються з сервера. Якщо ви вважаєте, що вас зламали, змініть пароль і ввімкніть 2FA у своєму обліковому записі Discord. Якщо це просто ваша помилка, зверніться до персоналу сервера, щоб вирішити питання.*",
	honeypot_log_title: "Honeypot спрацював - ${action}",
	honeypot_log_field_author: "Автор",
	honeypot_log_field_channel: "Канал",
	honeypot_log_field_message: "Видалене повідомлення",
	honeypot_log_field_attachments: "Вкладення",
	honeypot_log_field_stickers: "Стікери",
	honeypot_log_field_embeds: "Ембеди",
	honeypot_log_field_deleted_messages: "Видалені повідомлення",
	honeypot_log_field_triggered_messages: "Повідомлення, що спрацювали",
	honeypot_log_field_dm_status: "Стан ОП",
	honeypot_log_field_result: "Результат",
	honeypot_log_dm_open: "Доставлено",
	honeypot_log_dm_closed: "Закриті або недоступні",
	honeypot_log_no_content: "Немає тексту",
	honeypot_log_action_ban: "Користувача заблоковано",
	honeypot_log_action_kick: "Користувача вигнано",
	honeypot_log_action_none: "Жодних дій не вжито",
	help_tts_fields: "TTS",
	help_tts_dsc:
		"> *Перетворюйте текст на мовлення в голосових каналах з iHorizon!*",
	tts_join_not_in_voice:
		"${emoji_No} Щоб скористатися цією командою, потрібно бути в голосовому каналі!",
	tts_join_already_enabled:
		"${emoji_No} Модуль TTS уже ввімкнено на цьому сервері!",
	tts_join_music_playing:
		"${emoji_No} На цьому сервері зараз грає музика. Зупиніть її, перш ніж увімкнути TTS.",
	tts_join_enabled: "${emoji_Yes} Режим TTS увімкнено в ${voiceChannel}!",
	tts_join_error:
		"${emoji_No} Під час увімкнення режиму TTS сталася помилка.",
	tts_join_lang_fallback: "en-US",
	tts_leave_not_active:
		"${emoji_No} Модуль TTS зараз не активний на цьому сервері!",
	tts_leave_not_in_voice:
		"${emoji_No} Щоб вимкнути TTS, потрібно бути в його голосовому каналі!",
	tts_leave_disabled: "${emoji_Yes} Режим TTS вимкнено на цьому сервері!",
	tts_info_embed_title: "Інформація про модуль TTS",
	tts_info_embed_description:
		"Модуль TTS (синтез мовлення) дає змогу iHorizon читати повідомлення вголос у голосовому каналі. Коли його ввімкнено, iHorizon озвучуватиме кожне повідомлення, надіслане в налаштований текстовий канал учасниками, які перебувають у голосовому каналі.",
	tts_info_field_status: "Стан",
	tts_info_field_lang: "Мова TTS",
	tts_info_field_howto: "Як користуватися",
	tts_info_howto_value:
		"Використайте `/tts join`, щоб запустити TTS у вашому голосовому каналі.\nВикористайте `/tts leave`, щоб зупинити TTS.\nВикористайте `/tts lang`, щоб змінити мову голосу.",
	tts_lang_not_active:
		"${emoji_No} Модуль TTS зараз не активний на цьому сервері!",
	tts_lang_set: "${emoji_Yes} Мову TTS встановлено на `${language}`.",
	tts_embed_title: "Режим TTS активовано",
	tts_embed_description:
		"Модуль TTS тепер активний у ${voiceChannel}.\nУсі повідомлення, надіслані тут учасниками з голосового каналу, читатимуться вголос.\n\n**Учасники в голосовому:** ${members}",
	tts_embed_footer: "Використайте /tts leave, щоб зупинити TTS",
	tts_join_not_text_based:
		"${emoji_No} Цей голосовий канал не підтримує текстові повідомлення. Увімкніть текстовий чат у голосовому каналі або скористайтеся іншим каналом.",
	tts_music_blocked:
		"${emoji_No} Зараз активний модуль TTS. Вимкніть TTS, перш ніж вмикати музику.",
	tts_voice_status: "Режим TTS - Синтез мовлення",
	help_h247_fields: "H24/7",
	help_h247_dsc: "> *Тримайте iHorizon у голосовому каналі 24/7!*",
	h247_join_invalid_channel: "${emoji_No} Укажіть дійсний голосовий канал!",
	h247_join_already_active:
		"${emoji_No} Модуль H24/7 уже активний у ${voiceChannel}!",
	h247_join_music_playing:
		"${emoji_No} На цьому сервері зараз грає музика. Зупиніть її, перш ніж увімкнути модуль H24/7.",
	h247_join_tts_active:
		"${emoji_No} Модуль TTS зараз активний в іншому голосовому каналі. Вимкніть TTS, перш ніж увімкнути модуль H24/7.",
	h247_joined: "${emoji_Yes} iHorizon залишатиметься в ${voiceChannel} 24/7!",
	h247_join_error:
		"${emoji_No} Під час увімкнення модуля H24/7 сталася помилка.",
	h247_leave_not_active:
		"${emoji_No} Модуль H24/7 зараз не активний на цьому сервері!",
	h247_left: "${emoji_Yes} Модуль H24/7 вимкнено на цьому сервері!",
	h247_leave_error:
		"${emoji_No} Під час вимкнення модуля H24/7 сталася помилка.",
	h247_info_embed_title: "Інформація про модуль H24/7",
	h247_info_embed_description:
		"Модуль H24/7 тримає iHorizon у голосовому каналі цілодобово, навіть коли нічого не грає. Це корисно, щоб підтримувати голосову серію сервера.\nПоки модуль увімкнено, музика й TTS працюють лише в голосовому каналі H24/7.\nЗ'єднання автоматично відновлюється після перезапусків або зупинки плеєра.",
	h247_info_field_status: "Стан",
	h247_info_field_howto: "Як користуватися",
	h247_info_howto_value:
		"Використайте `/h247 join`, щоб залишити iHorizon у голосовому каналі.\nВикористайте `/h247 leave`, щоб вимкнути модуль.\nВикористайте `/h247 info`, щоб показати цю панель.",
	h247_play_refused:
		"${emoji_No} На цьому сервері активний модуль H24/7. Зайдіть у голосовий канал H24/7, щоб увімкнути музику!",
	h247_tts_refused:
		"${emoji_No} На цьому сервері активний модуль H24/7. Зайдіть у голосовий канал H24/7, щоб увімкнути TTS!",
	gw_go_duration_too_low: "${emoji_No} | Мінімальна тривалість — 3 хвилини!",
	avatar_card_title: "Аватар ${user}",
	card_download: "Завантажити",
	serverinfo_label_owner: "Власник",
	serverinfo_label_members: "Учасники",
	serverinfo_label_created: "Створено",
	serverinfo_label_joined: "Ви приєдналися",
	serverinfo_label_roles: "Ролі",
	serverinfo_label_channels: "Канали",
	serverinfo_label_boosts: "Бусти",
	serverinfo_boost_value: "${count} (рівень ${tier})",
	serverinfo_label_verification: "Перевірка",
	serverinfo_label_language: "Мова",
	serverinfo_label_id: "ID",
	serverinfo_verif_none: "Немає",
	serverinfo_verif_low: "Низька",
	serverinfo_verif_medium: "Середня",
	serverinfo_verif_high: "Висока",
	serverinfo_verif_highest: "Найвища",
	all_bots_card_title: "Боти на ${guild}",
	all_bots_card_count: "Ботів: ${count}",
	all_bots_none: "На цьому сервері немає ботів.",
	unbanall_card_progress: "Розбан `${count}` учасників…",
	unbanall_card_undo_progress: "Повторний бан `${count}` учасників…",
	unbanall_card_title: "Розбанити всіх",
	unbanall_card_undo_title: "Розбан усіх скасовано",
	unbanall_label_unbanned: "Розбанено",
	unbanall_label_banned: "Знову забанено",
	unbanall_label_failed: "Не вдалося",
	sync_card_title: "Дозволи синхронізовано",
	sync_card_desc: "Ці канали тепер мають дозволи ${category}:",
	media_only_card_title: "Канали лише для медіа",
	utils_label_save: "Зберегти",
	nick_kicker_card_title: "Вигнання за нікнеймом",
	nick_kicker_label_status: "Статус",
	nick_kicker_label_words: "Слова",
	wlroles_card_title: "Ролі в білому списку",
	wlroles_card_warn_title: "Небезпечні дозволи",
	wlroles_card_high_title: "Ролі вище за мою",
	userinfo_label_badges: "Значки",
	userinfo_label_username: "Ім'я користувача",
	userinfo_label_created: "Акаунт створено",
	userinfo_label_joined: "Приєднався до сервера",
	userinfo_label_nitro: "Nitro",
	userinfo_label_roles: "Ролі",
	userinfo_label_id: "ID",
	userinfo_card_loading: "Завантаження профілю…",
	banner_card_guild_title: "Банер ${guild}",
	banner_card_user_title: "Банер ${user}",
	inviteinfo_label_channel: "Канал",
	inviteinfo_label_inviter: "Запросив",
	inviteinfo_label_created: "Сервер створено",
	inviteinfo_label_expires: "Спливає",
	inviteinfo_label_members: "Учасники",
	inviteinfo_label_online: "Онлайн",
	inviteinfo_label_boosts: "Бусти",
	inviteinfo_label_features: "Функції",
	serverpic_card_title: "Іконка ${guild}",
	serverpic_card_no_icon: "Цей сервер не має іконки.",
	where_card_title: "Де ${member}",
	where_label_member: "Учасник",
	where_label_channel: "Голосовий канал",
	where_label_stream: "Трансляція",
	where_label_video: "Камера",
	where_label_mute: "Мікрофон вимкнено",
	where_label_deaf: "Звук вимкнено",
	vc_card_title: "Голосова активність",
	vc_label_members: "Учасники",
	vc_label_online: "Онлайн",
	vc_label_in_voice: "У голосових",
	vc_label_streaming: "Транслюють",
	vc_label_boosts: "Бусти",
	vc_label_camera: "З камерою",
	vc_label_muted: "Без мікрофона",
	snipe_card_title: "Останнє видалене повідомлення",
	snipe_label_author: "Автор",
	snipe_label_sent: "Надіслано",
	utils_label_member: "Учасник",
	utils_label_role: "Роль",
	utils_label_by: "Ким",
	utils_label_failed: "Не вдалося",
	utils_label_from: "Звідки",
	utils_label_to: "Куди",
	utils_label_moved: "Переміщено",
	utils_label_name_filter: "Ім'я містить",
	derank_card_progress: "Знімаю ${count} ролей з ${member}…",
	derank_card_title: "Учасника позбавлено ролей",
	derank_label_removed: "Знято ролей",
	massiverole_card_progress_add: "Видаю роль ${count} учасникам…",
	massiverole_card_progress_sub: "Знімаю роль з ${count} учасників…",
	massiverole_card_title_add: "Роль видано учасникам",
	massiverole_card_title_sub: "Роль знято з учасників",
	massiverole_label_added: "Отримали",
	massiverole_label_already: "Вже мали",
	massiverole_label_removed: "Втратили",
	massiverole_label_without: "Не мали",
	nickrole_label_skipped: "Пропущено",
	massmove_card_title: "Учасників переміщено",
	bringall_card_title: "Учасників розподілено",
	bringall_label_category: "Категорія",
	bringall_label_channels: "Голосові канали",
	setmentionrole_card_title: "Роль за згадку увімкнено",
	setmentionrole_card_desc: "Коли учасник згадує мене, я видаю йому цю роль.",
	setmentionrole_card_note:
		"Роль отримують лише учасники, чиє ім'я користувача або відображуване ім'я містить цей текст. Якщо вони його приберуть, роль буде знято, а коли додадуть знову — видано повторно.",
	card_bot: "Бот",
	card_working: "Працюю над цим…",
	card_label_requested_by: "Запит від",
	card_label_failed: "Не вдалося",
	admin_users_card_title: "Адміністратори",
	admin_users_card_count: "${count} учасників із дозволом «Адміністратор»",
	admin_users_card_only_bots: "Цей дозвіл мають лише боти.",
	admin_users_button_hide_bots: "Сховати ботів",
	admin_users_button_show_bots: "Показати ботів",
	admin_users_card_done_title: "Адміністраторів позбавлено ролей",
	admin_users_label_unranked: "Учасників позбавлено ролей",
	admin_roles_card_title: "Ролі адміністраторів",
	admin_roles_card_count: "${count} ролей із дозволом «Адміністратор»",
	admin_roles_card_managed: "Керується інтеграцією",
	admin_roles_card_done_title: "Дозвіл адміністратора знято",
	admin_roles_label_modified: "Змінено ролей",
	allwebhooks_card_count: "Вебхуків: ${count}",
	allwebhooks_button_delete: "Видалити всі",
	role_members_card_title: "Учасники ${role}",
	role_members_card_count: "Учасників: ${count}",
	prevnames_card_title: "Попередні імена ${user}",
	prevnames_card_count: "Записано імен: ${count}",
	prevnames_button_erase: "Стерти мою історію",
	prevnames_label_username: "Ім'я користувача",
	prevnames_label_display_name: "Відображуване ім'я",
	prevnames_label_nickname: "Нікнейм на ${guild}",
	emoji_card_title: "Емодзі додано",
	emoji_card_count: "Створено емодзі на ${guild}: ${count}",
	util_leashlist_card_count: "Активних прив'язок: ${count}",
	util_leashlist_card_expires: "Спливає",
	util_locknamelist_card_count: "Заблокованих нікнеймів: ${count}",
	util_locknamelist_card_by: "Заблокував ${user}",
	invites_card_title: "Статистика запрошень",
	invites_label_total: "Усього",
	invites_label_regular: "Звичайні",
	invites_label_left: "Вийшли",
	invites_label_bonus: "Бонус",
	invites_label_invited_by: "Запросив",
	leaderboard_card_title: "Рейтинг запрошень",
	leaderboard_card_count: "Учасників у рейтингу на ${guild}: ${count}",
	leaderboard_card_your_rank:
		"Ваше місце: ${rank}/${count}, запрошень: ${invites}",
	leaderboard_card_not_ranked: "Ви ще не в рейтингу.",
	leaderboard_card_empty: "На цьому сервері ще ні в кого немає запрошень.",
	leaderboard_card_generated: "Згенеровано за ${elapsed} мс",
	caracteres_card_title: "Оберіть стиль тексту",
	caracteres_card_result_title: "Ваш текст у стилі ${style}",
	caracteres_label_original: "Оригінал",
	caracteres_label_converted: "Перетворено",
	catsay_card_title: "Кіт сказав",
	hack_card_title: "Злам завершено",
	hack_label_ip: "IP-адреса",
	hack_label_email: "Email",
	hack_label_password: "Пароль",
	hug_card_title: "Час обіймів",
	hug_card_desc: "${author} міцно обіймає ${target}.",
	kiss_card_title: "Цьом",
	kiss_card_desc: "${author} цілує ${target}.",
	slap_card_title: "Ляпас",
	slap_card_desc: "${author} дає ляпаса ${target}.",
	love_card_title: "Калькулятор кохання",
	love_card_desc: "**${user1}** + **${user2}** = `${percent}%` кохання",
	poll_card_title: "Опитування від ${author}",
	poll_card_vote:
		"Поставте ${yes}, щоб відповісти «так», або ${no}, щоб відповісти «ні».",
	question_card_title: "${author} питає",
	question_label_question: "Питання",
	question_label_answer: "Відповідь",
	tweet_card_title: "Новий допис від ${user}",
	youtube_card_title: "Новий коментар від ${user}",
	fun_card_cat_title: "Няв",
	fun_card_dog_title: "Гав-гав",
	fun_card_dolphin_title: "І-і-і, клац-клац",
	fun_card_duck_title: "Кря-кря",
	fun_card_fox_title: "Ва-па-па-па-па",
	fun_card_frog_title: "Ква-ква",
	fun_card_panda_title: "Мва-а",
	fun_card_squirrel_title: "Цок-цок",
	fun_card_animal_hint: "Випадкова картинка, спеціально для вас.",
	fun_card_dice_title: "Кидок кубиків",
	fun_card_coinflip_title: "Орел чи решка",
	fun_card_number_title: "Випадкове число",
	fun_card_gay_title: "Гей-метр",
	fun_card_trans_title: "Транс-метр",
	fun_card_stench_title: "Смердометр",
	fun_card_rate_title: "Моя оцінка",
	fun_card_transgender_title: "Аватар трансгендерного прайду",
	fun_label_dice: "Кубики",
	fun_label_rolls: "Кидки",
	fun_label_total: "Сума",
	fun_label_result: "Результат",
	fun_label_range: "Діапазон",
	fun_label_score: "Бал",
	fun_label_rated: "Оцінено",
	mod_label_moderator: "Модератор",
	mod_label_warn_id: "ID попередження",
	ban_card_title: "Учасника заблоковано",
	kick_card_title: "Учасника вигнано",
	baninfo_card_title: "Бан ${user}",
	banlist_card_title: "Заблоковані учасники",
	banlist_card_count: "Заблокованих учасників: ${count}",
	mutelist_card_title: "Учасники в тайм-ауті",
	mutelist_card_count: "Учасників у тайм-ауті: ${count}",
	mutelist_card_ends: "Завершується ${time}",
	mutelist_button_unmute_all: "Зняти всі тайм-аути",
	mutelist_card_cleared_title: "Тайм-аути знято",
	mutelist_card_cleared_desc:
		"Учасників, які знову можуть говорити: ${count}.",
	warnlist_card_title: "Попередження ${user}",
	unwarn_card_title: "Попередження знято",
	warn_card_title: "Учасник отримав попередження",
	warn_err_self: "${emoji_No} Ви не можете видати попередження собі.",
	warn_err_bot: "${emoji_No} Ботам не можна видавати попередження.",
	warn_err_above:
		"${emoji_No} Ви не можете видати попередження учаснику, чия найвища роль дорівнює вашій або вища за неї.",
	warn_dm_title: "Ви отримали попередження",
	warn_label_date: "Дата",
	warn_label_active: "Активні попередження",
	warn_label_note: "Нотатка персоналу",
	warn_label_sanction: "Автоматична санкція",
	warn_auto_reason: "Автоматична санкція: попереджень — ${count}",
	warn_sanction_timeout: "Тайм-аут (${duration})",
	warn_sanction_kick: "Вигнання",
	warn_sanction_ban: "Бан",
	warn_sanction_failed:
		"${sanction}, не застосовано: iHorizon не може покарати цього учасника",
	warn_expire_note: "попередження спливають через ${days} дн.",
	warnlist_expired: "сплило",
	warnlist_card_active: "Активних: ${active} · усього: ${count}",
	warnconfig_title: "Налаштування попереджень",
	warnconfig_label_expiry: "Термін дії",
	warnconfig_expiry_never: "Ніколи: попередження враховуються назавжди",
	warnconfig_expiry_days: "Через ${days} дн.",
	warnconfig_label_rules: "Автоматичні санкції",
	warnconfig_no_rules:
		"Немає: попередження самі по собі ніколи не спричиняють санкцію",
	warnconfig_rule_line: "**${count}** попереджень → ${sanction}",
	warnconfig_saved: "Налаштування збережено.",
	warnconfig_err_duration:
		"${emoji_No} Тайм-ауту потрібна тривалість від 1 хвилини до 28 днів (наприклад, `1h`, `2d`).",
	warnconfig_err_count:
		"${emoji_No} Поріг має бути від 1 до 100 попереджень.",
	warnconfig_err_rules:
		"${emoji_No} Не більше 10 автоматичних санкцій: спершу видаліть одну.",
	warnconfig_err_expiry:
		"${emoji_No} Термін дії має бути від 0 (ніколи) до 365 днів.",
	warnconfig_err_sanction:
		"${emoji_No} Оберіть санкцію для цього порогу (або `none`, щоб видалити її).",
	warnconfig_hint:
		"Додати санкцію: `/mod warnconfig threshold:3 sanction:timeout duration:1h` · видалити: `sanction:none` · термін дії: `expire-days:30` (0 = ніколи)",
	clearwarn_card_title: "Попередження очищено",
	clearwarn_card_desc: "Знято попереджень у ${member}: ${count}.",
	clear_allwarns_card_title: "Усі попередження видалено",
	mod_label_duration: "Тривалість",
	mod_label_ends: "Завершується",
	mod_label_channel: "Канал",
	mod_label_messages: "Видалені повідомлення",
	mod_label_target: "Стосується",
	tempmute_card_title: "Учасника відправлено в тайм-аут",
	unmute_card_title: "Тайм-аут знято",
	unban_card_title: "Учасника розблоковано",
	tempban_card_title: "Учасника тимчасово заблоковано",
	temprole_card_title: "Тимчасову роль видано",
	clear_card_title: "Повідомлення видалено",
	lock_card_title: "Канал заблоковано",
	unlock_card_title: "Канал розблоковано",
	lockall_card_title: "Сервер заблоковано",
	unlockall_card_title: "Сервер розблоковано",
	rolepanel_card_done_title: "Ролі оновлено",
	rolepanel_label_added: "Додано",
	rolepanel_label_removed: "Знято",
	rolepanel_label_refused: "Відхилено",
	stats_locale: "uk-UA",
	stats_view_overview: "Огляд",
	stats_view_overview_desc: "Підсумки, тенденції та улюблені канали",
	stats_view_rhythm: "Ритм",
	stats_view_rhythm_desc: "Коли це відбувається, година за годиною",
	stats_view_members: "Учасники",
	stats_view_members_desc: "Хто пише і хто сидить у голосових",
	stats_view_channels: "Канали",
	stats_view_channels_desc: "Найактивніші текстові та голосові канали",
	stats_select_placeholder: "Оберіть вигляд",
	stats_label_messages: "Повідомлення",
	stats_label_voice: "Час у голосових",
	stats_label_active_days: "Активні дні",
	stats_label_rank: "Місце на сервері",
	stats_label_active_members: "Активні учасники",
	stats_label_members: "Учасники",
	stats_label_peak: "Пік",
	stats_label_avg_length: "Середня довжина",
	stats_label_sessions: "Голосові сесії",
	stats_label_longest_session: "Найдовша сесія",
	stats_label_best_streak: "Найкраща серія",
	stats_note_change_up: "+${change} % порівняно з минулим тижнем",
	stats_note_change_down: "-${change} % порівняно з минулим тижнем",
	stats_note_new: "Нове цього тижня",
	stats_note_steady: "Як минулого тижня",
	stats_note_streak: "Серія: ${days} дн.",
	stats_note_rank_of: "з ${count} учасників",
	stats_note_unranked: "Ще немає місця",
	stats_note_chars: "символів на повідомлення",
	stats_note_avg_session: "${duration} у середньому",
	stats_note_days_in_row: "днів поспіль",
	stats_chart_daily: "Щоденна активність",
	stats_chart_voice_minutes: "Голос (хв)",
	stats_chart_messages_per_day: "Повідомлень на день",
	stats_text_channels: "Текстові канали",
	stats_voice_channels: "Голосові канали",
	stats_top_messages: "Найбільше повідомлень",
	stats_top_voice: "Найбільше часу в голосових",
	stats_heat_messages: "Повідомлення",
	stats_heat_voice: "Голос",
	stats_peak_note: "Пік: ${day} ${hour}",
	stats_empty: "Поки нічого",
	stats_footer_zone: "Час у ${zone} · останні 30 днів",
	stats_title_user: "Активність ${user}",
	stats_title_guild: "Активність на ${guild}",
	stats_title_channel: "Активність у ${channel}",
	stats_title_compare: "${a} і ${b}",
	stats_title_top_messages: "Топ за повідомленнями",
	stats_title_top_voice: "Топ за голосом",
	stats_period_1d: "Останні 24 години",
	stats_period_7d: "Останні 7 днів",
	stats_period_30d: "Останні 30 днів",
	stats_insight_peak: "Найактивніше: ${day} близько ${hour}.",
	stats_insight_up: "На ${change} % більше повідомлень, ніж минулого тижня.",
	stats_insight_down: "На ${change} % менше повідомлень, ніж минулого тижня.",
	stats_insight_channel: "Улюблений канал: ${channel}.",
	stats_insight_streak: "Активність ${days} днів поспіль.",
	stats_insight_leader: "${user} лідирує з результатом ${value}.",
	stats_insight_compare:
		"${user} попереду за ${count} із ${total} показників.",
	stats_insight_tie: "Йдуть пліч-о-пліч.",
	stats_compare_same: "Оберіть двох різних учасників.",
	stats_wrong_channel: "Оберіть текстовий або голосовий канал.",
	stats_card_no_data: "За останні 30 днів активності не зафіксовано.",
	music_apo_panel_title: "Equalizer APO",
	music_apo_panel_on: "Модуль увімкнено",
	music_apo_panel_off: "Модуль вимкнено",
	music_apo_panel_applied: "Застосовано за замовчуванням: **${name}**",
	music_apo_panel_nothing_applied:
		"Жодну конфігурацію не застосовано за замовчуванням",
	music_apo_panel_count:
		"${count}/${max} конфігурацій · застосована впливає на все, що грає на сервері",
	music_apo_panel_empty:
		"Конфігурацій ще немає. Додайте .txt-файл Equalizer APO кнопкою нижче.",
	music_apo_badge_applied: "Застосовано",
	music_apo_badge_frozen: "Заморожено",
	music_apo_config_meta:
		"від ${user} · оновлено ${time} · рядків: ${lines} · ${size}",
	music_apo_button_manage: "Керувати",
	music_apo_button_add: "Додати конфігурацію",
	music_apo_button_enable: "Увімкнути",
	music_apo_button_disable: "Вимкнути",
	music_apo_button_apply: "Застосовувати за замовчуванням",
	music_apo_button_unapply: "Не застосовувати",
	music_apo_button_rename: "Перейменувати",
	music_apo_button_replace: "Замінити файл",
	music_apo_button_freeze: "Заморозити",
	music_apo_button_unfreeze: "Розморозити",
	music_apo_button_delete: "Видалити",
	music_apo_button_confirm_delete: "Видалити назавжди",
	music_apo_button_cancel: "Скасувати",
	music_apo_frozen_note:
		"Заморожено користувачем ${user}: її можна застосувати, але не перейменувати, замінити чи видалити.",
	music_apo_confirm_delete: "Видалити **${name}**? Це не можна скасувати.",
	music_apo_modal_add_title: "Додати конфігурацію APO",
	music_apo_modal_replace_title: "Замінити файл",
	music_apo_modal_rename_title: "Перейменувати конфігурацію",
	music_apo_field_name: "Назва",
	music_apo_field_name_desc:
		"Показується на панелі, не більше ${max} символів",
	music_apo_field_file: "Файл Equalizer APO",
	music_apo_field_file_desc:
		"Файл .txt, не більше ${kb} КіБ і ${lines} рядків команд",
	music_apo_no_permission:
		"${emoji} Лише адміністратори та власники сервера можуть керувати його конфігураціями APO.",
	music_apo_full:
		"${emoji} На цьому сервері вже ${max} конфігурацій. Спершу видаліть одну.",
	music_apo_name_taken:
		"${emoji} Конфігурація з назвою **${name}** вже існує.",
	music_apo_name_empty: "${emoji} Дайте конфігурації назву.",
	music_apo_not_txt: "${emoji} Надішліть файл .txt.",
	music_apo_too_big: "${emoji} Файл перевищує ${kb} КіБ.",
	music_apo_too_many_lines: "${emoji} У файлі понад ${lines} рядків команд.",
	music_apo_empty_file: "${emoji} Файл порожній.",
	music_apo_frozen: "${emoji} **${name}** заморожено: спершу розморозьте її.",
	music_apo_cannot_unfreeze:
		"${emoji} Розморозити її можуть лише ${user}, власники сервера або власники бота.",
	music_apo_saved: "${emoji} **${name}** збережено (етапів: ${stages}).",
	shardinfo_title: "Інформація про шард",
	shardinfo_location:
		"Цей сервер на шарді **${shardId}**. Команду обробив шард **${handlerShardId}**, процес `${pid}`.",
	shardinfo_member_data:
		"Кількість учасників: точна — **${exactCount}**, приблизна — **${approximateCount}**, відсутня — **${missingCount}**",
	shardinfo_offline_shards: "Шарди, що не відповідають: ${shards}",
	shardinfo_section_unavailable: "Недоступні сервери",
	shardinfo_section_approximate: "Сервери з приблизною кількістю",
	shardinfo_section_missing: "Сервери без даних про учасників",
	shardinfo_card_title: "Шарди iHorizon",
	shardinfo_card_summary: "Згенеровано шардом ${shardId} · процес ${pid}",
	shardinfo_card_pill: "${onlineCount}/${shardCount} онлайн",
	shardinfo_card_shard: "Шард ${shardId}",
	shardinfo_card_state_online: "Онлайн",
	shardinfo_card_state_starting: "Підключення",
	shardinfo_card_state_offline: "Офлайн",
	shardinfo_card_no_response: "Немає відповіді",
	shardinfo_card_servers: "Сервери",
	shardinfo_card_servers_unit: "серверів",
	shardinfo_card_servers_detail: "Недоступно: ${unavailableCount}",
	shardinfo_card_members: "Учасники",
	shardinfo_card_members_detail: "${averageCount} на сервер",
	shardinfo_card_ping: "Середній пінг",
	shardinfo_card_ping_detail: "Найвищий: ${ping}",
	shardinfo_card_shard_ping: "Пінг",
	shardinfo_card_memory: "Пам'ять",
	shardinfo_card_memory_detail: "${size} на шард",
	shardinfo_card_voice: "Голос",
	shardinfo_card_voice_detail: "Каналів: ${channelCount}",
	shardinfo_card_channels: "Канали",
	shardinfo_card_uptime: "Час роботи",
	shardinfo_card_chart_servers: "Серверів на шард",
	shardinfo_card_chart_members: "Учасників на шард",
	shardinfo_card_chart_average: "Середнє: ${value}",
	shardinfo_card_unit_day: "д",
	shardinfo_card_unit_hour: "год",
	shardinfo_card_unit_minute: "хв",
	status_panel_title: "# ${emoji_Logo} Статус iHorizon",
	status_panel_headline:
		"${state} **${label}** · ${upCount}/${totalCount} сервісів онлайн",
	status_panel_label_operational: "Усі системи працюють",
	status_panel_label_maintenance: "Тривають технічні роботи",
	status_panel_label_degraded: "Частковий збій",
	status_panel_label_major: "Серйозний збій",
	status_panel_button: "Сторінка статусу",
	status_panel_group: "### ${emoji_Server_Stats} ${name}",
	status_panel_group_core: "Основні сервіси",
	status_panel_service_gateway: "HorizonGateway (API)",
	status_panel_service_lavalink: "Lavalink (музика)",
	status_panel_service_website: "Сайт iHorizon",
	status_panel_row: "${status} **${name}** · ${detail}",
	status_panel_row_detail: "`${ping} ms` · `${uptime}`",
	status_panel_row_offline: "Офлайн",
	status_panel_row_maintenance: "Технічні роботи",
	status_panel_row_pending: "Перевірка",
	status_panel_incident: "### ${emoji_Warning_Icon} ${title}\n${content}",
	status_panel_footer:
		"-# ${emoji_Timer} Оновлено ${time} · оновлюється щохвилини",
	status_panel_kuma_unavailable:
		"-# ${emoji_Warn} Uptime Kuma недоступний, показано власні перевірки бота.",
	status_panel_loading:
		"${emoji_Discord_Loading} Завантаження панелі статусу...",
	status_panel_card_title: "Статус інфраструктури",
	status_panel_card_summary: "${upCount}/${totalCount} сервісів онлайн",
	status_panel_card_uptime_24h: "Аптайм 24 год",
	status_panel_card_uptime_30d: "Аптайм 30 дн.",
	status_panel_card_response: "Середній відгук",
	status_panel_card_ws: "Пінг Discord",
	status_panel_card_col_history: "Останні 60 перевірок",
	status_panel_card_col_ping: "Пінг",
	status_panel_card_col_uptime: "30 дн.",
	status_panel_card_chart: "Середній час відгуку",

	// i18n sweep 2026-11: buttons, embeds and selects that were hard-coded
	button_invite_ihorizon: "Запросити iHorizon",
	dm_only_server_desc:
		"# Ой!\n\nВи використовуєте iHorizon в особистих повідомленнях, але ця команда працює лише на сервері Discord.\n\nДодайте мене на сервер, щоб нею скористатися!",
	topgg_vote_button: "Проголосувати за iHorizon",
	dm_message_from: "Повідомлення від ${guild}",
	dm_message_by: "Повідомлення від ${user}",
	ticket_panel_button_saved: "Збережено",
	economy_balance_wallet_title: "Гаманець ${user}",
	reactionroles_help_embed_title: "Довідка /reactionroles",
	command_error_title: "**Під час виконання команди сталася помилка.**",
	command_error_report:
		"**Будь ласка, повідомте про цю проблему через `/report`.**",
	guild_blacklisted_leave_desc:
		"Вітаємо, <@${ownerId}>. На жаль, ви в чорному списку iHorizon.\nТому я залишаю ваш сервер. Якщо маєте запитання, зверніться до моїх розробників.\n\nДякуємо за розуміння.",
	status_field_cpu: "ЦП",
	status_field_memory: "Пам'ять",
	status_field_machine_uptime: "Час роботи машини",
	status_field_bot_uptime: "Час роботи бота",
	status_field_os: "ОС",
	status_field_bot_version: "Версія бота",
	status_field_bun_version: "Версія Bun",
	owner_guild_title: "Власники сервера",
	var_discord_permission: "Дозвіл Discord",
	rate_nothing: "нічого",
	embed_default_footer: "Нижній колонтитул",
	music_history_file_title:
		"Історія музики ${guild} (останні 30 днів, спочатку нові)",
	music_history_requested_by: "запросив(-ла) ${user}",
	music_history_live: "наживо",
	tempvoice_region_singapore: "Сінгапур",
	tempvoice_region_sydney: "Австралія (Сідней)",
	tempvoice_region_russia: "Росія",
	tempvoice_region_india: "Індія",
	tempvoice_region_hongkong: "Гонконг",
	tempvoice_region_southafrica: "Південна Африка",
	tempvoice_region_rotterdam: "Нідерланди (Роттердам)",
	tempvoice_region_japan: "Японія (Токіо)",
	tempvoice_region_southkorea: "Південна Корея",
	tempvoice_region_useast: "США Схід",
	tempvoice_region_ussouth: "США Південь",
	tempvoice_region_uswest: "США Захід",
	tempvoice_region_uscentral: "США Центр",
	tempvoice_region_brazil: "Бразилія",

	// logs V2 cards
	logs_ban_add_title: "Учасника забанено",
	logs_ban_remove_title: "Учасника розбанено",
	logs_kick_title: "Учасника вигнано",
	logs_boost_add_title: "Новий буст",
	logs_boost_remove_title: "Буст знято",
	logs_channel_update_title: "Канал змінено",
	logs_message_delete_title: "Повідомлення видалено",
	logs_message_update_title: "Повідомлення змінено",
	logs_roles_update_title: "Ролі змінено",
	logs_voice_title: "Голосова активність",
	logs_channel_label: "Канал",
	logs_jump_to_message: "Перейти до повідомлення",
	logs_message_delete_embeds:
		"Ембеди повідомлення (${count}) показано нижче.",

	// schedule V2 cards
	schedule_reminder_title: "Нагадування #${scheduleCode} настало!",

	// invites V2 cards
	invites_reset_title: "Скидання менеджера запрошень",

	// economy V2 cards
	economy_leaderboard_your_rank:
		"Ваше місце: **#${rank}** з ${count} · ${wealth}",
	economy_leaderboard_not_ranked: "Вас поки немає в рейтингу.",
	economy_leaderboard_count: "Учасників у рейтингу: ${count}",

	// guildconfig V2 cards
	guildconfig_perm_level: "Рівень ${level}",
	guildconfig_antiexe_enabled:
		"🔐 **Anti-Bin** увімкнено: виконувані файли буде видалено.",
	guildconfig_antiexe_disabled:
		"🔓 **Anti-Bin** вимкнено: виконувані файли знову дозволено.",
	guildconfig_list_react_title: "Автоматичні реакції",

	// hard-coded strings
	updates_button_releases: "Релізи",
	updates_button_commit: "Коміт",
	warn_reason_piconly: "Автоматичне покарання: канал лише для зображень",
	warn_reason_antiexe: "Anti-Exe: надіслано виконуваний файл",
	warn_reason_punishpub: "Автоматичне покарання: реклама",
	warn_reason_antispam: "Автоматичне покарання: спам",
	automod_block_custom_message: "Це повідомлення заблоковано iHorizon",
	derogation_role_name: "керується iHorizon",
	ticket_transcript_footer: "Експортовано повідомлень: {number}",
	music_playlist_fallback_name: "Плейлист ${platform}",
	music_apo_node_unreachable: "аудіосервер недоступний (${message})",

	// owner list refusal
	owner_list_not_allowed:
		"Цю команду можуть використовувати лише власник сервера та учасники списку власників сервера.",

	// owner list & permission rules fix
	owner_list_only_discord_owner:
		"Лише власник сервера (власник у Discord) може вилучити когось зі списку власників або внести учасника цього списку до чорного списку.",

	// warnings fix
	warn_err_owner: "${emoji_No} Не можна попередити власника сервера.",
	warn_sanction_kept:
		"${sanction} не застосовано: поточний тайм-аут учасника триває довше і зберігається (до ${until})",
	clear_allwarns_log_desc:
		"Видалено попереджень: ${count}, учасників: ${members}.",

	// embeds fix
	embed_replace_not_bot_message:
		"Я можу замінити ембед лише в повідомленні, яке надіслав сам!",
	embed_save_uploads_dropped:
		"-# Завантажені файлом зображення не зберігаються в збереженому ембеді: вони є лише в цьому повідомленні. Використайте посилання на зображення, щоб воно показувалося всюди, де використовується цей ID.",

	// authrestore fix
	rc_forcejoin_nobody:
		"Усі перевірені учасники вже на цьому сервері: додавати нікого. Ваш ключ не змінився.",
	rc_forcejoin_failed:
		"Примусове додавання не вдалося запустити: HorizonGateway відмовив або недоступний. Нікого не додано, ваш ключ не змінився.",
	rc_forcejoin_stopped:
		"Примусове додавання зупинилося до завершення. Учасників, підрахованих вище, додано, а ваш ключ уже замінено: новий нижче.",

	// logs fix
	logs_antispam_title_mute: "[АнтіСпам] Нове заглушення",
	logs_antispam_title_kick: "[АнтіСпам] Нове вигнання",
	logs_antispam_title_ban: "[АнтіСпам] Новий бан",
	logs_antispam_desc_mute: "${bot} **заглушив** ${user}",
	logs_antispam_desc_kick: "${bot} **вигнав** ${user}",
	logs_antispam_desc_ban: "${bot} **забанив** ${user}",

	// backup refusal
	backup_use_not_allowed:
		"Тут резервними копіями може користуватися лише власник сервера. Він може відкрити їх усім адміністраторам через `/backup manage`.",

	// authrestore fix
	rc_set_key_already_set:
		"У цього сервера вже є ключ AuthRestore, тому новий я не створив: повторний `/authrestore set` замінив би його, і поточний ключ перестав би працювати.\nЩоб почати знову з новим ключем, спершу виконайте `/authrestore delete` (прибирає кнопку перевірки; уже перевірені учасники зберігаються), а потім знову `/authrestore set`.",

	// google forms
	gforms_new_response: "Нова відповідь на **${form}**",
	gforms_test_mark: "Тестова відповідь: не враховується в статистиці",
	gforms_label_member: "Учасник",
	gforms_member_not_found: "${query} (не знайдено на сервері)",
	gforms_label_submitted: "Надіслано",
	gforms_no_answer: "Немає відповіді",
	gforms_more_answers: "Ще відповідей: ${count}",
	gforms_role_reason: "Відповідь у Google Forms (${name})",
	gforms_review_accept: "Прийняти",
	gforms_review_refuse: "Відхилити",
	gforms_review_pending: "Очікує рішення",
	gforms_review_accepted: "✅ Прийнято: ${user} ${time}",
	gforms_review_refused: "❌ Відхилено: ${user} ${time}",
	gforms_review_reason: "Причина: ${reason}",
	gforms_review_not_reviewer:
		"Вирішувати можуть лише перевіряльники цієї форми.",
	gforms_review_already: "Щодо цієї заявки вже ухвалено рішення.",
	gforms_review_not_found: "Цієї заявки більше немає.",
	gforms_review_modal_title: "Відхилити заявку",
	gforms_review_modal_reason:
		"Причина (необов'язково, буде надіслана кандидату)",
	gforms_review_dm_title: "Ваша заявка",
	gforms_review_dm_accepted:
		"Вашу заявку **${name}** на сервері **${guild}** прийнято.",
	gforms_review_dm_refused:
		"Вашу заявку **${name}** на сервері **${guild}** відхилено.",

	// /confession panel
	confession_panel_button_default_label: "Зізнатися",
	confession_panel_title: "Панель зізнань",
	confession_panel_state_on: "Зізнання увімкнено",
	confession_panel_state_off: "Зізнання вимкнено",
	confession_panel_field_channel: "Канал панелі",
	confession_panel_no_channel: "ще не опубліковано",
	confession_panel_field_threads: "Гілки обговорення",
	confession_panel_value_on: "увімкнено",
	confession_panel_value_off: "вимкнено",
	confession_panel_field_cooldown: "Затримка",
	confession_panel_field_embed: "Embed",
	confession_panel_embed_default: "за замовчуванням",
	confession_panel_embed_missing:
		"`${code}` не знайдено, показано embed за замовчуванням",
	confession_panel_field_button: "Кнопка",
	confession_panel_channel_placeholder: "Опублікувати панель у…",
	confession_panel_action_enable: "Увімкнути",
	confession_panel_action_disable: "Вимкнути",
	confession_panel_action_threads_on: "Увімкнути гілки",
	confession_panel_action_threads_off: "Вимкнути гілки",
	confession_panel_action_cooldown: "Затримка",
	confession_panel_action_edit_button: "Текст і емодзі",
	confession_panel_action_reset_button: "Скинути кнопку",
	confession_panel_action_embed: "Код embed",
	confession_panel_style_placeholder: "Колір кнопки",
	confession_panel_style_primary: "Синій",
	confession_panel_style_secondary: "Сірий",
	confession_panel_style_success: "Зелений",
	confession_panel_style_danger: "Червоний",
	confession_panel_modal_cooldown_title: "Затримка зізнань",
	confession_panel_modal_cooldown_label: "Час між двома зізнаннями",
	confession_panel_modal_cooldown_desc: "Наприклад 30s, 10m або 3h.",
	confession_panel_modal_button_title: "Кнопка панелі",
	confession_panel_modal_label_label: "Текст",
	confession_panel_modal_label_desc:
		"Від 1 до 80 символів. Порожньо: «${default}».",
	confession_panel_modal_emoji_label: "Емодзі",
	confession_panel_modal_emoji_desc:
		"Емодзі Unicode або сервера (<:name:id>). Порожньо: без емодзі.",
	confession_panel_modal_embed_title: "Embed панелі",
	confession_panel_modal_embed_label: "Код embed",
	confession_panel_modal_embed_desc:
		"Код, збережений через /embed. Порожньо: embed за замовчуванням.",
	confession_panel_emoji_invalid:
		"Це не емодзі, яке можна поставити на кнопку.",
	confession_panel_emoji_unusable:
		"Я не можу використати це емодзі: воно має бути з цього сервера.",
	confession_panel_embed_not_found: "Embed з кодом `${code}` не знайдено.",
	confession_panel_cooldown_invalid:
		"Неправильний час. Використайте, наприклад, 30s, 10m або 3h.",
	confession_panel_channel_no_access:
		"Ви маєте бачити ${channel} і мати змогу писати в ньому.",
	confession_panel_send_failed:
		"Не вдалося опублікувати панель у ${channel}: перевірте мої дозволи там.",
	confession_panel_posted: "Панель опубліковано в ${channel}.",
	confession_panel_saved: "Збережено.",
	confession_panel_saved_refreshed:
		"Збережено, опубліковану панель оновлено.",
	confession_panel_saved_not_refreshed:
		"Збережено. Не вдалося оновити опубліковану панель: виберіть її канал ще раз, щоб опублікувати знову.",
	confession_panel_expired:
		"Термін дії панелі минув, запустіть команду знову.",

	// Music library on Discord: Love button, /music playlist
	music_love_button: "Подобається",
	music_love_added: "❤️ **${track}** тепер у розділі «${playlist}».",
	music_love_already: "**${track}** вже у розділі «${playlist}».",
	music_love_remove_button: "Прибрати з «${playlist}»",
	music_love_removed: "**${track}** прибрано з розділу «${playlist}».",
	music_love_limit:
		"Розділ «${playlist}» заповнено (не більше ${max}): спершу приберіть щось у плеєрі панелі керування.",
	music_love_unavailable:
		"**${track}** не можна додати до розділу «${playlist}».",
	music_playlist_title: "Ваша музична бібліотека",
	music_playlist_stats: "Плейлисти: ${playlists}/${max}",
	music_playlist_tracks: "Треки: ${count}",
	music_playlist_no_playlists:
		"Плейлистів поки немає: створіть їх у плеєрі панелі керування.",
	music_playlist_empty:
		"Ваша бібліотека поки порожня. Натисніть **${button}** у плеєрі, щоб зберегти поточний трек у «${playlist}», або створіть плейлисти в панелі керування: ${url}",
	music_playlist_select: "Відкрити плейлист",
	music_playlist_play: "Слухати",
	music_playlist_back: "Назад",
	music_playlist_no_tracks: "Цей список порожній.",
	music_playlist_queued: "**${name}** додано до черги (треків: ${count}).",
	music_playlist_not_found:
		"Плейлист із такою назвою не знайдено: ось ваша бібліотека.",
	music_playlist_gone: "Цього плейлиста більше немає.",

	// Boost message (/guildconfig set boost-message)
	boostmsg_panel_title: "Повідомлення про буст",
	boostmsg_panel_desc:
		"Дякуйте учасникам, які бустять сервер, і прощайтеся, коли їхній буст закінчується.",
	boostmsg_side_boost: "Буст",
	boostmsg_side_unboost: "Зняття бусту",
	boostmsg_field_status: "Статус:",
	boostmsg_field_channel: "Канал:",
	boostmsg_field_dm: "Особисте повідомлення:",
	boostmsg_field_text: "Текст:",
	boostmsg_field_embed: "Embed:",
	boostmsg_field_message: "Повідомлення",
	boostmsg_field_variables: "Змінні",
	boostmsg_on: "Увімкнено",
	boostmsg_off: "Вимкнено",
	boostmsg_none: "Немає",
	boostmsg_default_label: "типовий текст",
	boostmsg_text_needed_hint: "Без embed текст однаково надсилається.",
	boostmsg_no_target_hint:
		"Увімкнено, але нічого не буде надіслано: виберіть канал або увімкніть особисте повідомлення.",
	boostmsg_variables_help:
		"{boostCount}: кількість бустів сервера · {boostTier}: рівень бусту (від 0 до 3)",
	boostmsg_button_enable: "Увімкнути",
	boostmsg_button_disable: "Вимкнути",
	boostmsg_button_dm_enable: "Увімкнути ОП",
	boostmsg_button_dm_disable: "Вимкнути ОП",
	boostmsg_button_text_enable: "Увімкнути текст",
	boostmsg_button_text_disable: "Вимкнути текст",
	boostmsg_button_message: "Змінити повідомлення",
	boostmsg_button_embed: "Код embed",
	boostmsg_button_test: "Надіслати тест",
	boostmsg_channel_placeholder: "Канал для повідомлення (порожньо = немає)",
	boostmsg_channel_invalid:
		"Цей канал не можна використати: виберіть текстовий канал або канал оголошень.",
	boostmsg_channel_no_access:
		"Щоб вибрати ${channel}, ви маєте бачити його й писати в ньому.",
	boostmsg_channel_bot_no_access:
		"Я не бачу ${channel} або не можу писати в ньому: спершу надайте мені доступ.",
	boostmsg_modal_message_title: "Повідомлення про буст",
	boostmsg_modal_message_label: "Повідомлення (порожньо = типове)",
	boostmsg_modal_embed_title: "Код embed",
	boostmsg_modal_embed_label: "Код embed (порожньо = без embed)",
	boostmsg_embed_not_found:
		"Під кодом `${embed_id}` немає збереженого embed: нічого не змінено.",
	boostmsg_test_tag: "Тест повідомлення про буст (${side})",
	boostmsg_test_nothing:
		"Нічого надсилати: виберіть канал або увімкніть особисте повідомлення.",
	boostmsg_test_channel_ok: "Тест надіслано в ${channel}.",
	boostmsg_test_channel_fail:
		"Не вдалося надіслати тест у ${channel} (бракує прав?).",
	boostmsg_test_dm_ok: "Тест надіслано вам в особисті.",
	boostmsg_test_dm_fail:
		"Не вдалося доставити повідомлення (особисті закрито?).",
	boostmsg_default_boost:
		"💎 Щиро дякуємо, {memberMention}, за буст **{guildName}**! Завдяки тобі сервер тепер має {boostCount} бустів (рівень {boostTier}).",
	boostmsg_default_unboost:
		"{memberMention} більше не бустить **{guildName}**. Дякуємо за підтримку весь цей час! 💜"
} satisfies LanguageData;
