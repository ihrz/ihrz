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
	// Основной языковой файл для бота Discord iHorizon
	// ru-RU: Русский

	// Variable
	var_member: "Участники",
	var_user: "Пользователь",
	var_author: "Автор",
	var_reason: "Причина",
	var_guild: "Гильдия",
	var_sanction: "Наказание",
	var_time: "Время",
	var_message: "Сообщение",
	var_no_set: "Не установлено",
	var_none: "Нет",
	var_roles: "Роли",
	var_names: "Имена",
	var_text_channel: "Текстовый канал",
	var_voice_channel: "Голосовой канал",
	var_creator: "Создатель",
	var_doesnt_have_permissions:
		"У вас нет прав на выполнение этого действия. Вам требуется разрешение {permission}.",
	var_ihorizon: "iHorizon",
	var_developer: "Разработчик",
	var_chance: "Шанс",
	var_other: "Другие",
	var_unknown: "Неизвестно",
	var_secure: "Безопасно",
	var_unsecure: "Не безопасно",
	var_prefix: "Префикс",
	var_slash: "Слэш",
	var_discord: "Дискорд",
	var_network: "Сеть",
	var_latency: "Задержка",
	var_bot: "Бот",
	var_true: "Правда",
	var_false: "Ложь",
	var_enabled: "Включено",
	var_disabled: "Отключено",
	var_yes: "Да",
	var_no: "Нет",
	var_colour: "Цвет",
	var_length: "Длина",
	var_good: "Хорошо",
	var_size: "Размер",
	var_level: "Уровень",
	var_add: "Добавить",
	var_remove: "Удалить",
	var_edit: "Редактировать",
	var_confirm: "Подтвердить",
	var_succes: "Успех",
	var_page: "Страница",
	var_previous: "Назад",
	var_next: "Вперёд",
	var_permission: "Разрешение",
	var_usage: "Использование",
	var_aliases: "Псевдонимы",
	var_dont_have_perm:
		"У вас нет необходимых разрешений для этого. (Требуется разрешение {perm})",
	var_price: "Цена",
	var_boost: "Ускорение",
	var_uses: "Использования",
	var_vc_stats: "Голосовая статистика",
	var_1d: "1 dia",
	var_7d: "7 dias",
	var_14d: "14 dias",
	var_year: "год(а/лет)",
	var_mo: "месяц(а/ев)",
	var_w: "неделя(и/ь)",
	var_d: "день(я/ей)",
	var_h: "час(а/ов)",
	var_m: "минута(ы)",
	var_s: "секунда(ы)",
	var_ms: "миллисекунда(ы)",
	var_banned_user: "Заблокированный пользователь(и)",
	var_no_one_banned: "В этом сервере никто не заблокирован.",
	var_category: "Категория",
	var_total: "Всего",
	var_online_members: "Онлайн участник(и)",
	var_boost_level: "Уровень буста",
	var_features: "Функции",
	var_guild_icon: "Иконка сервера",
	var_guild_banner: "Баннер сервера",
	var_guild_splash: "Заставка сервера",
	var_unknown_guild_name: "Неизвестное имя сервера",
	var_preview: "Предпросмотр",
	var_form: "Форма",
	var_original_message: "Оригинальное сообщение",
	var_click_here: "Нажмите здесь",
	var_s_message: "сообщение от {nickname}",
	var_source: "Музыка: ",
	var_online_call: "В голосовом канале",
	var_online: "В сети",
	var_stream: "Стримит",
	var_boosts: "Бусты",
	var_muted: "Без звука",
	var_camera: "Камера включена",

	// Discord Permission Name
	perm_createinstantinvite_name: "Создать мгновенное приглашение",
	perm_kickmembers_name: "Выгнать участников",
	perm_banmembers_name: "Заблокировать участников",
	perm_administrator_name: "Администратор",
	perm_managechannels_name: "Управление каналами",
	perm_manageguild_name: "Управление сервером",
	perm_addreactions_name: "Добавлять реакции",
	perm_viewauditlog_name: "Просмотр журнала аудита",
	perm_priorityspeaker_name: "Приоритетный спикер",
	perm_stream_name: "Трансляция",
	perm_viewchannel_name: "Просмотр канала",
	perm_sendmessages_name: "Отправлять сообщения",
	perm_sendttsmessages_name: "Отправлять TTS-сообщения",
	perm_managemessages_name: "Управление сообщениями",
	perm_embedlinks_name: "Встраивать ссылки",
	perm_attachfiles_name: "Прикреплять файлы",
	perm_readmessagehistory_name: "Читать историю сообщений",
	perm_mentioneveryone_name: "Упомянуть всех",
	perm_useexternalemojis_name: "Использовать внешние эмодзи",
	perm_viewguildinsights_name: "Просмотр статистики сервера",
	perm_connect_name: "Подключение",
	perm_speak_name: "Говорить",
	perm_mutemembers_name: "Отключение звука участников",
	perm_deafenmembers_name: "Заглушение участников",
	perm_movemembers_name: "Перемещение участников",
	perm_usevad_name: "Использование голосовой активности",
	perm_changenickname_name: "Изменить никнейм",
	perm_managenicknames_name: "Управление никнеймами",
	perm_manageroles_name: "Управление ролями",
	perm_managewebhooks_name: "Управление вебхуками",
	perm_manageemojisandstickers_name: "Управление эмодзи и стикерами",
	perm_manageguildexpressions_name: "Управление выражениями сервера",
	perm_useapplicationcommands_name: "Использование команд приложений",
	perm_requesttospeak_name: "Запрос на выступление",
	perm_manageevents_name: "Управление событиями",
	perm_managethreads_name: "Управление темами",
	perm_createpublicthreads_name: "Создание публичных тем",
	perm_createprivatethreads_name: "Создание приватных тем",
	perm_useexternalstickers_name: "Использовать внешние стикеры",
	perm_sendmessagesinthreads_name: "Отправлять сообщения в темах",
	perm_useembeddedactivities_name: "Использовать встроенные активности",
	perm_moderatemembers_name: "Модерация участников",
	perm_viewcreatormonetizationanalytics_name:
		"Просмотр аналитики монетизации",
	perm_usesoundboard_name: "Использовать звуковую панель",
	perm_createguildexpressions_name: "Создать выражения сервера",
	perm_createevents_name: "Создать события",
	perm_useexternalsounds_name: "Использовать внешние звуки",
	perm_sendvoicemessages_name: "Отправлять голосовые сообщения",
	perm_sendpolls_name: "Отправлять опросы",
	perm_useexternalapps_name: "Использовать внешние приложения",

	// Команды для тикетов
	// /add, /close, /delete, /sethereticket, /open, /remove, /transript, /disableticket
	ticket_disabled_command:
		"Вы не можете использовать эту команду, потому что администратор отключил команды для тикетов!",

	// /add
	add_disabled_command:
		"Вы не можете использовать эту команду, потому что администратор отключил команды для тикетов!",
	add_command_work: "Успешно добавлен ${memberTag} в ваш тикет!",
	add_command_error: "Произошла ошибка, пожалуйста, попробуйте снова",

	// /close
	close_disabled_command:
		"Вы не можете использовать эту команду, потому что администратор отключил команды для тикетов!",
	close_title_sourcebin: "Транскрипт тикета от iHorizon",
	close_description_sourcebin: " ",
	close_error_command: "Произошла ошибка, пожалуйста, попробуйте снова!",
	close_command_work_channel:
		"Вы закрыли свой тикет. iHorizon отправил вам транскрипт",
	close_command_work_notify_channel: "Тикет успешно закрыт!",
	close_command_error: "Произошла ошибка, пожалуйста, попробуйте снова!",
	close_not_in_ticket:
		"Вы не можете использовать эту команду вне канала для тикета!",

	// /delete
	delete_disabled_command:
		"Вы не можете использовать эту команду, потому что администратор отключил команды для тикетов!",
	delete_not_in_ticket:
		"Вы не можете использовать эту команду вне канала для тикета!",
	ticket_deleted:
		"Тикет ${ticketOwnerMention} был удалён пользователем <@${deletedByUserId}>. Вот транскрипт:",

	// /sethereticket
	sethereticket_panel_select_embed_desc:
		"# Название панели\n```${panelName}```\n{msg}\n\n## Категория\n```{category}```\n",

	// /open
	open_disabled_command:
		"Вы не можете использовать эту команду, потому что администратор отключил команды для тикетов!",
	open_command_work: "Успешно повторно открыт ${channel}",
	open_command_error: "Произошла ошибка, пожалуйста, попробуйте снова!",
	open_not_in_ticket:
		"Вы не можете использовать эту команду вне канала для тикета!",

	// /remove
	remove_disabled_command:
		"Вы не можете использовать эту команду, потому что администратор отключил команды для тикетов!",
	remove_not_in_ticket:
		"Вы не можете использовать эту команду вне канала для тикета!",
	remove_command_error: "Произошла ошибка, пожалуйста, попробуйте снова",
	remove_command_work: "Успешно удален ${memberTag} из вашего тикета!",

	// /transript
	transript_disabled_command:
		"Вы не можете использовать эту команду, потому что администратор отключил команды для тикетов!",
	transript_name_sourcebin: " ",
	transript_title_sourcebin: "Транскрипт чата тикета для ${channelName}",
	transript_command_error: "Произошла ошибка, пожалуйста, попробуйте снова!",
	transript_command_work:
		"Вы закрыли свой тикет. iHorizon отправил вам транскрипт",
	transript_not_in_ticket:
		"Вы не можете использовать эту команду вне канала для тикета!",

	// /disableticket
	disableticket_not_admin:
		":x: | Вы должны быть администратором этого сервера, чтобы использовать эту команду!",
	disableticket_logs_embed_title_disable: "Логи отключения тикетов",
	disableticket_logs_embed_description_disable:
		"Команды для тикетов отключены пользователем <@${authorId}>!",
	disableticket_logs_embed_title_enable: "Логи включения тикетов",
	disableticket_logs_embed_description_enable:
		"Команды для тикетов включены пользователем <@${authorId}>!",
	disableticket_command_work_disable:
		"Вы успешно отключили команды для тикетов!",
	disableticket_command_work_enable:
		"Вы успешно включили команды для тикетов!",

	// /setticketcategory
	setticketcategory_not_admin:
		":x: | Вы должны быть администратором этого сервера, чтобы использовать эту команду!",
	setticketcategory_disabled_command:
		"Вы не можете использовать эту команду, потому что администратор отключил команды для тикетов!",
	setticketcategory_not_a_category:
		"Указанный канал не является категорией, пожалуйста, попробуйте еще раз.",
	setticketcategory_command_work:
		"<@${authorId}>, вы установили категорию для канала тикета на `${categoryName}`!",

	// /ticket log-channel
	ticket_logchannel_embed_title: "Канал логов тикетов",
	ticket_logchannel_embed_desc:
		"${author}, вы установили канал логов модуля тикетов на ${channel}!",

	// /ticket panel
	ticket_panel_default_placeholder: "Выберите категорию для создания тикета",
	ticket_panel_embed_title: "Панель тикетов №",
	ticket_panel_embed_desc:
		"Настройте встраиваемое сообщение тикета с определенными опциями.",
	ticket_panel_saved_conf: "💾 Сохраненная конфигурация",
	ticket_panel_related_embed: "🕸️ Связанное встраиваемое сообщение",
	ticket_panel_role_to_ping: "📌 Роль для упоминания",
	ticket_panel_ping_user: "📎 Упоминать пользователя",
	ticket_panel_placeholder: "🏷️ Заполнитель",
	ticket_panel_category: "📤 Категория",
	ticket_panel_option_fields: "📔 Поля опций",
	ticket_panel_form: "📝 Форма",
	ticket_panel_panel_placeholder: "Выберите опции",
	ticket_panel_panel_1_label: "Сохранить текущую конфигурацию",
	ticket_panel_panel_2_label: "Показать предварительный просмотр",
	ticket_panel_panel_3_label:
		"Изменить текущее связанное встраиваемое сообщение",
	ticket_panel_panel_4_label: "Добавить/удалить роль для упоминания",
	ticket_panel_panel_5_label: "Изменить заполнитель",
	ticket_panel_panel_6_label: "Изменить категорию",
	ticket_panel_panel_7_label: "Изменить упоминание пользователя",
	ticket_panel_panel_8_label: "Добавить/удалить поля опций",
	ticket_panel_panel_9_label: "Изменить форму",
	ticket_panel_button_send: "Отправить встраиваемое сообщение",
	ticket_panel_change_category_channelSelect_placeholder:
		"Выберите категорию",
	ticket_panel_select_channel_to_send:
		"Выберите канал для отправки встраиваемого сообщения",
	ticket_panel_change_placeholder_modal_title: "Изменить заполнитель",
	ticket_panel_change_placeholder_modal_placeholder: "Новый заполнитель",
	ticket_panel_need_save_config:
		"Вы должны сохранить текущую конфигурацию перед отправкой встраиваемого сообщения.",
	ticket_panel_need_1_option:
		"Для отправки встраиваемого сообщения требуется как минимум одна опция.",
	ticket_panel_related_embed_dont_exist:
		"Связанное встраиваемое сообщение не существует",
	ticket_panel_channel_error:
		"Канал не существует или у меня нет прав на отправку сообщений в этом канале",
	ticket_panel_embed_been_send:
		"Встраиваемое сообщение было отправлено в канал",
	ticket_panel_successfully_saved: "Конфигурация успешно сохранена",
	ticket_panel_change_role_roleSelect_placeholder: "Выберите роль",
	ticket_panel_change_role_interaction_content:
		"Выберите роль для изменения роли, которая будет упоминаться при создании тикета.",
	ticket_panel_change_embed_modal_title:
		"Изменить связанное встраиваемое сообщение",
	ticket_panel_change_embed_modal_placeholder: "ID встраиваемого сообщения",
	ticket_panel_change_embed_dont_exist:
		"Встраиваемое сообщение не существует",
	ticket_panel_change_option_select_placeholder: "Выберите опцию",
	ticket_panel_change_option_select_1_label: "Добавить новое поле опций",
	ticket_panel_change_option_select_2_label: "Удалить поле опций",
	ticket_panel_change_option_interaction_content:
		"Выберите опцию для добавления или удаления полей опций",
	ticket_panel_add_option_max_10:
		"Вы не можете добавить более 10 полей опций",
	ticket_panel_add_option_modal_title: "Добавить поле опций",
	ticket_panel_add_option_modal_field1_label: "Название",
	ticket_panel_add_option_modal_field2_label: "Описание",
	ticket_panel_add_option_modal_field3_label: "Эмодзи",
	ticket_panel_remove_option_empty: "Нет полей опций для удаления",
	ticket_panel_remove_option_select_placeholder:
		"Выберите опцию для удаления",
	ticket_panel_rempve_option_interaction_content:
		"Выберите опцию для удаления",
	ticket_panel_change_form_select_placeholder_1: "Добавить поле формы",
	ticket_panel_change_form_select_placeholder_2: "Удалить поле формы",
	ticket_panel_change_form_interaction_content:
		"Выберите опцию для добавления или удаления полей формы",
	ticket_panel_add_form_max_3: "Вы не можете добавить более 3 полей формы",
	ticket_panel_add_form_modal_title: "Добавить поле формы",
	ticket_panel_add_form_modal_field1_label: "Заголовок вопроса",
	ticket_panel_add_form_modal_field2_label: "Заполнитель вопроса",
	ticket_panel_preview_message: "Предварительный просмотр панели тикетов",
	ticket_panel_option_change_category:
		"Выберите вариант для изменения категории",
	ticket_panel_panel_10_label:
		"Изменить категорию для одной конкретной опции",
	ticket_panel_channel_panel_embed_id: "ID встраивания канала тикетов",
	ticket_panel_panel_11_label: "Изменить панель встраивания канала тикетов",
	ticket_panel_select_user: "Меню для добавления участников в тикет",
	ticket_panel_button_delete: "Кнопка для удаления тикета",
	ticket_panel_button_transcript: "Кнопка для создания транскрипта",
	ticket_panel_panel_12_label:
		"Показать меню для добавления/удаления участников тикета",
	ticket_panel_panel_13_label: "Показать кнопку удаления тикета",
	ticket_panel_panel_14_label: "Показать кнопку стенограммы",
	ticket_panel_tip_about_variable1:
		"${emoji_VC_OpenChat} **Знали ли вы?** Когда вы используете `/utils embed` для создания embed, вы можете ввести переменную **`{category}`**, которая будет заменена категорией, выбранной пользователем.",
	ticket_panel_no_question_to_delete: "Нет вопросов для удаления.",
	ticket_panel_chose_a_question: "Выберите вопрос",
	ticket_panel_select_question_to_delete: "Выберите вопрос для удаления.",
	ticket_panel_panel_15_label: "Настроить embed для каждой опции",
	ticket_panel_panel_16_label: "Настроить форму для каждой опции",
	ticket_panel_panel_17_label:
		"Настройте роли для упоминания для каждого варианта",
	ticket_panel_mode: "⚙️ Режим",
	ticket_panel_mode_simple: "Простой",
	ticket_panel_mode_advanced: "Расширенный",
	ticket_panel_mode_simple_desc:
		"Одна кнопка открывает тикет, без выбора и вопросов.",
	ticket_panel_mode_advanced_desc:
		"Меню с вариантами, настройками для каждого варианта и формами.",
	ticket_panel_panel_18_label: "Сменить режим (простой / расширенный)",
	ticket_panel_simple_default_title: "Поддержка",
	ticket_panel_simple_default_desc:
		"Нужна помощь? Нажмите кнопку ниже, чтобы открыть тикет.",
	ticket_panel_manage_form_title:
		"Управление формой для опции: **${optionName}**",
	ticket_panel_change_embed_options:
		"Выберите опцию, чтобы изменить ID embed панели канала.",
	ticket_panel_change_embed_options_null:
		"Нет опций для изменения ID embed панели канала.",
	ticket_panel_change_embed_options_chose:
		"Выберите категорию, чтобы изменить ID панели канала.",
	ticket_panel_add_a_question: "Добавить вопрос",
	ticket_panel_remove_a_question: "Удалить вопрос",
	ticket_panel_option_invalid: "❌ Неверная опция.",
	ticket_panel_chose_option_to_form: "Выберите опцию для настройки её формы.",
	var_chose_option: "Выберите опцию",
	ticket_panel_saved_and_sended_panel:
		"Панель тикетов #${panelCode} успешно отправлена в ${channel}. Пожалуйста, сохраните код на случай, если нужно будет изменить панель.",
	var_title: "Заголовок",
	var_action: "Действие",

	// /ticket rename
	ticket_rename_ok: "Канал тикета был переименован!",
	ticket_rename_error: "Ошибка при переименовании текстового канала.",

	// /ticket unlink
	ticket_unlink_command_ok:
		"${emoji_Yes} | **Канал был отвязан от модуля тикетов.**",
	ticket_unlink_panel_edited_content:
		"Этот канал был старым тикетом. Пользователь {user} отвязал этот канал.",

	// /ticket remind
	ticket_remind_embed_title: "Ой-ой! Напоминание о тикете",
	ticket_remind_embed_desc:
		"Вы не были очень активны, это не проблема, но ваш тикет всё ещё обрабатывается! Пожалуйста, ответьте на него!",
	ticket_remind_embed_fields_1_name: "Последний ответ",
	ticket_remind_command_ok:
		"Я отправил пользователю сообщение с напоминанием.",
	var_never: "Никогда",

	// Команды для рангов
	// /level, /setxpchannels, /disablexp

	// /disablexp
	disablexp_not_admin:
		":x: | Вы должны быть администратором этого сервера, чтобы использовать эту команду!",
	disablexp_logs_embed_title_disable: "Логи отключения опыта",
	disablexp_logs_embed_description_disable: "<@${authorId}> отключил опыт!",
	disablexp_command_work_disable:
		"Вы успешно отключили сообщение о повышении уровня (опыт)!",
	disablexp_logs_embed_title_enable: "Логи включения опыта",
	disablexp_logs_embed_description_enable: "<@${authorId}> включил опыт!",
	disablexp_command_work_enable:
		"Вы успешно включили сообщение о повышении уровня (опыт)!",
	disablexp_command_work_disable_entierly:
		"Вы успешно отключили модуль рангов! (Больше сообщений и пользователи не получают уровни)",

	// /setxpchannels
	setxpchannels_not_admin:
		":x: | Вы должны быть администратором этого сервера, чтобы использовать эту команду!",
	setxpchannels_logs_embed_title_disable: "Логи установки каналов опыта",
	setxpchannels_logs_embed_description_disable:
		"<@${authorId}> отключил пользовательские каналы опыта. Я установил настройки по умолчанию...",
	setxpchannels_already_disabled_disable:
		"Пользовательские каналы опыта уже отключены!",
	setxpchannels_command_work_disable:
		"Вы успешно отключили пользовательский канал опыта!",
	setxpchannels_command_error_disable:
		"Ошибка: недостаточно прав или канал не существует",
	setxpchannels_logs_embed_title_enable: "Логи установки каналов опыта",
	setxpchannels_logs_embed_description_enable:
		"<@${authorId}> установил пользовательские каналы опыта на: <#${argsid}>",
	setxpchannels_valid_channel_message:
		"Вы должны указать действительный канал для ваших настроек.",
	setxpchannels_already_with_this_config:
		"Пользовательские каналы опыта уже настроены с этим идентификатором канала!",
	setxpchannels_confirmation_message:
		"**Пользовательский канал опыта установлен здесь!**",
	setxpchannels_command_work_enable:
		"Вы успешно установили пользовательский канал опыта на <#${argsid}>!",
	setxpchannels_command_error_enable:
		"Ошибка: недостаточно прав или канал не существует",

	// /level
	level_embed_title: "__**Уровень опыта**__: `${userUsername}`",
	level_embed_fields1_name: ":arrow_up:・__Уровни:__",
	level_embed_fields1_value: "`${currentxp}/${xpNeeded}`",
	level_embed_fields2_name: ":money_with_wings:・__Опыт:__",
	level_embed_fields2_value: "`${level}`",
	level_embed_description:
		"`${expNeededForLevelUp}` **опыта нужно для следующего уровня!**",
	level_xp_needed_for_new_level: "XP до следующего уровня:",
	level_xp_total: "Всего XP:",

	// /ranks leaderboard
	ranks_leaderboard_top_txt: "Топ #${i}",
	ranks_leaderboard_top_txt_raw: "Топ #${i} ${rawText}\n",
	ranks_leaderboard_txt_text:
		"👤 ${user} `(${userGlobalName})`\n⭐ ➥ **Уровень**: `${level}`\n🔱 ➥ **Общий опыт**: `${xpTotal}`",
	ranks_leaderboard_embed_title: "🏆 Таблица лидеров сервера легенд",
	ranks_leaderboard_embed_footer:
		"Страница ${cPage} из ${totalPages} • Сортировка по общему XP",

	// /ranks ignore-channels
	ranks_ignorechannels_embed_title: "Конфигурации модуля рангов",
	ranks_ignorechannels_embed_desc:
		"Когда новые сообщения отправляются в один из этих каналов, модуль рангов их игнорирует.",

	// /ranks set-message
	ranksSetMessage_not_admin:
		":x: | Вы должны быть администратором этого сервера, чтобы запросить эту команду!",
	ranksSetMessage_help_embed_title: "/ranks set-message Помощь!",
	ranksSetMessage_help_embed_description: "/ranks set-message",
	ranksSetMessage_help_embed_fields_name: "Как использовать?",
	ranksSetMessage_logs_embed_title_on_enable: "Журналы RanksSetMessage",
	ranksSetMessage_logs_embed_description_on_enable:
		"<@${authorId}> установил сообщение о рангах!",
	ranksSetMessage_command_work_on_enable:
		"${emoji_GreenTick} | Сообщение о рангах успешно установлено.",
	ranksSetMessage_logs_embed_title_on_disable: "Журналы RanksSetMessage",
	ranksSetMessage_logs_embed_description_on_disable:
		"<@${authorId}> удалил сообщение о рангах!",
	ranksSetMessage_command_work_on_disable:
		"${emoji_Yes} | Пользовательское сообщение о рангах успешно удалено.",
	ranksSetMessage_command_work_ls: "Сообщение о рангах:",
	ranksSetMessage_help_embed_fields_custom_name: "Пользовательское сообщение",
	ranksSetMessage_help_embed_fields_custom_name_empy: "Не установлено!",
	ranksSetMessage_help_embed_fields_default_name_empy:
		"Сообщение по умолчанию",
	ranksSetMessage_help_embed_desc:
		"{memberUsername} => Имя пользователя участника\n{memberMention} => Упомянуть участника\n{memberCount} => Количество участников в гильдии\n{guildName} => Название гильдии\n{createdAt} => Дата создания аккаунта в формате дд/мм/гггг\n{xpLevel} => Уровень XP пользователя\n{accountCreationTimestamp} => Метка времени создания аккаунта",
	ranksSetMessage_button_set_name: "Установить сообщение",
	ranksSetMessage_buttom_del_name: "Сообщение по умолчанию",
	ranksSetMessage_awaiting_response:
		"Напишите новое пользовательское сообщение о рангах.",
	ranksSetMessage_embed_fields_xpmessage: "Сообщение о рангах",

	// /ranks ranks-ureset
	reset_uranks_are_you_sure:
		"**Вы действительно уверены, что хотите удалить все данные о рангах?\nЭто действие необратимо и вы не сможете его отменить.**\n**Это действие разрушительно!!**",
	reset_uranks_logs_embed_title: "Журналы модуля рангов (ОПАСНОЕ ДЕЙСТВИЕ)",
	reset_uranks_logs_embed_desc:
		"${author} удалил все данные модуля рангов для ${user}!",

	// /ranks config
	ranks_config_embed_title: "🏆 Конфигурация Ранг Ролей",
	ranks_config_embed_desc:
		"Настройте роли-награды на основе XP вашего сервера!",
	ranks_config_autofields_name: "🌟 Уровень ${level}",
	ranks_config_autofields_value:
		"Роль: <@&${roleId}>\n🔓 Разблокируется на уровне ${level}",
	ranks_config_nofields_name: "🚫 Роли не настроены",
	ranks_config_nofields_value:
		"Настройте ранговые роли для награждения активных участников!",
	ranks_config_help_footer:
		"Страница ${currentPage} из ${totalPage} • Всего Рангов: ${totalRanks}",
	ranks_config_btn_add_name: "Добавить Роль",
	ranks_config_btn_remove_name: "Удалить Роль",
	ranks_config_add_max_roles:
		"Вы достигли максимального количества ранговых ролей (25).",
	ranks_config_add_role_menu_placeholder: "Выберите роль",
	ranks_config_awaiting1_response:
		"Выберите роль, которую вы хотите назначить на определённый уровень.",
	ranks_config_add_modal_title: "Задайте Уровень для Роли",
	ranks_config_add_modal_fields1_placeholder: "Требуемый уровень",
	ranks_config_add_invalid_level:
		"Недопустимый уровень! Пожалуйста, введите положительное число.",
	ranks_config_add_invalid_role:
		"Роль {role} уже существует. Роль может быть назначена только одному уровню.",
	ranks_config_add_command_work:
		"Роль ${selectedRole} добавлена на уровне ${level}!",
	ranks_config_add_command_warn:
		"# ВНИМАНИЕ ⚠️ Роль ${selectedRole} имеет следующие чувствительные разрешения:\n\n${_}",
	ranks_config_remove_no_rank: "Нет настроенных ранговых ролей для удаления.",
	ranks_config_var_level: "Уровень {level}",
	ranks_config_remove_string_menu_desc: "Удалить роль на уровне ${level}",
	ranks_config_remove_string_menu1_placeholder: "Выберите роль для удаления",
	ranks_config_remove_awaiting_response:
		"Выберите роль, которую вы хотите удалить.",
	ranks_config_remove_command_work:
		"Роль на уровне ${levelToRemove} была удалена!",

	// Команды владельца
	// /owner, /unowner, /blacklist, /unblacklist

	// /owner
	owner_not_owner:
		"Вы не являетесь владельцем проекта iHorizon. Вы не можете использовать эту команду.",
	owner_already_owner: "Этот пользователь уже владелец!",
	owner_is_now_owner: "${memberUsername} теперь владелец проекта iHorizon",

	// /unowner
	unowner_not_owner:
		"Вы не являетесь владельцем проекта iHorizon. Вы не можете использовать эту команду.",
	unowner_cant_unowner_creator:
		"Невозможно удалить этого пользователя, так как он является создателем проекта iHorizon.",
	unowner_command_work: "${memberUsername} больше не является владельцем",

	// /blacklist
	blacklist_not_owner:
		"Вы не являетесь владельцем проекта iHorizon. Вы не можете использовать эту команду.",
	blacklist_bot_lol: "Не могу внести себя в черный список x)",
	blacklist_command_work: "${memberUsername} теперь в черном списке",
	blacklist_blacklisted_but_can_ban_him:
		"${emoji_No} Теперь в черном списке, нельзя заблокировать этого участника здесь, отсутствуют разрешения?",
	blacklist_already_blacklisted: "${memberUsername} уже в черном списке!",
	blacklist_no_one_blacklist:
		"${emoji_No} Никого не найдено в черном списке!",
	blacklist_var_no_reason: "Причина не найдена",
	blacklist_embed_title: "Черный список - Страница ${page}",
	blacklist_command_work_shard:
		"✅ ${username} забанен на **${totalSuccess}** сервере(ах) во всех шардах (`{score}`)",

	// /unblacklist
	unblacklist_not_owner:
		"Вы не являетесь владельцем проекта iHorizon. Вы не можете использовать эту команду.",
	unblacklist_command_work: "<@${memberId}> больше не в черном списке",
	unblacklist_not_blacklisted: "<@${memberId}> не был в черном списке",
	unblacklist_unblacklisted_but_can_unban_him:
		"${emoji_No} Теперь не в черном списке, нельзя разблокировать этого участника здесь, отсутствуют разрешения или он уже разблокирован?",
	unblacklist_user_is_not_exist: "Я не могу найти этого пользователя",
	unblacklist_command_work_across_all_shard:
		"✅ ${bannedMemberUsername} разбанен на **${totalSuccess}** сервере(ах) во всех шардах (`${score}`)",

	// Команды менеджера приглашений
	// /addinvites, /invites, /leaderboard, /removeinvites

	// /addinvites
	addinvites_confirmation_embed_description:
		"Добавлено ${amount} приглашений для ${user}",
	addinvites_logs_embed_title: "Логи менеджера приглашений",
	addinvites_logs_embed_description:
		"<@${authorId}> Добавил ${amount} приглашений для <@${userId}>!",

	// /invites

	// /leaderboard

	// /removeinvites
	removeinvites_not_admin_embed_description:
		"Вам нужны права администратора для использования этой команды!",
	removeinvites_confirmation_embed_description:
		"Удалено ${amount} приглашений для ${user}",
	removeinvites_logs_embed_title: "Логи менеджера приглашений",
	removeinvites_logs_embed_description:
		"<@${authorId}> Удалил ${amount} приглашений для <@${userId}>!",

	// /invites reset-all
	resetallinvites_warning_msg:
		"**Вы действительно уверены, что хотите удалить все данные InviteManager?\nЭто действие необратимо и не может быть отменено.**\n**Это действие разрушительно!!**",
	resetallinvites_yes_button: "Удалить всё",
	resetallinvites_no_button: "Отменить действие",
	resetallinvites_succes_on_delete: "Успешно удалено!",
	resetallinvites_logs_embed_title:
		"Журналы Invite Manager (ОПАСНОЕ ДЕЙСТВИЕ)",
	resetallinvites_logs_embed_desc:
		"${author} удалил все данные Invite Manager!",

	// Команды бота
	// /botinfo, /invite, /kisakay, /ping, /status

	// /links
	links_message: "Нажмите на ссылки ниже обо мне!",
	links_website: "Мой веб-сайт",
	links_gitlab: "Мой GitLab",

	// /botinfo
	botinfo_embed_fields_myname: "Моё имя:",
	botinfo_embed_fields_mychannels: "Мои каналы:",
	botinfo_embed_fields_myservers: "Мои серверы:",
	botinfo_embed_fields_members: "Участники:",
	botinfo_embed_fields_libraires: "Библиотеки:",
	botinfo_embed_fields_created_at: "Создан:",
	botinfo_embed_fields_created_by: "Создан:",

	// /invite
	invite_embed_title: "Спасибо за добавление iHorizon!",
	invite_embed_description:
		"Я вас люблю, покажите мне свою любовь ко мне! Пригласите меня!",

	// /kisakay
	kisakay_message:
		"${emoji_Sparkles} Kisakay - и мой создатель и разработчик. Благодаря ей и её клавиатуре я появился в этом мире. Я глубоко благодарен ей!✨ ❤️❤️",

	// /andru
	andru_message:
		'Andru - сотрудник и разработчик. "Мастер на все руки", он управляет маркетингом, сообществом...',

	// /ether
	ether_message:
		"${emoji_Sparkles} Ether был контрибьютором и участником команды проекта iHorizon. Он создал документацию iHorizon и скрипт установки iHorizon, а также занимался переводами бота, чтобы сделать их (почти) идеальными! Он ушёл <t:1785567600:f>.",

	// /Irisweb
	irisweb_message:
		"😼IrisWeb - мой второй разработчик/соавтор , IrisWeb и Kisakay ❤️",

	// /ping
	pong_message: "【:ballot_box_with_check:】__**Понг**__ : ",

	// /status
	status_be_bot_dev:
		":x: | **Вы должны быть разработчиком бота, чтобы выполнить это!**",

	// /help
	help_tip_embed:
		"```${botName} ・ Меню помощи```\n${emoji_Pin} ・ **${categorieCount}** доступные категории команд\n${emoji_Slash_Bot_Badge} ・ **${slashCount}** доступные слэш-команды\n${emoji_Crown} ・ **Создано** <@${owner1}>, <@${owner2}>\n\n```Знаете ли вы? ・ Подсказки```\n${emoji_VC_Region} ・ ${botName} **100% многоязычный**\n${emoji_Slash_Bot_Badge} ・ `/setlang language:Japanese`",
	help_mod_fields: "Модерация",
	help_ranks_fields: "Ранги",
	help_fun_fields: "Развлечения",
	help_utils_fields: "Утилиты",
	help_giveaway_fields: "Розыгрыши",
	help_bot_fields: "Бот",
	help_music_fields: "Музыка",
	help_backup_fields: "Резервное копирование",
	help_guildconf_fields: "Настройка сервера",
	help_prof_fields: "Настройка профиля",
	help_economy_fields: "Экономика",
	help_owner_fields: "Владельцу",
	help_roler_fields: "Реакции на роли",
	help_invitem_fields: "Управление приглашениями",
	help_ticket_fields: "Тикеты",
	help_memberc_fields: "Счетчик участников",
	help_newftrs_fields: "Новые функции",
	help_mod_dsc:
		"> *Модерируйте свой сервер Discord без стресса с помощью команд iHorizon.*",
	help_ranks_dsc:
		"> *Забавляйтесь, отслеживая ваш уровень опыта, чтобы узнать, кто самый активный на сервере!*",
	help_fun_dsc:
		"> *Считаете Discord скучным? Хорошо, эта категория создана специально для вас! iHorizon вернет улыбку на ваше лицо!*",
	help_utils_dsc:
		"> *Нужны специфические команды, полезные в определенных случаях? Хорошо! Вот они!*",
	help_giveaway_dsc:
		"> *Щедры настроения? Хотите дарить что-то своему сообществу? Вот мои команды, чтобы помочь вам!*",
	help_bot_dsc:
		"> *Вам интересно и вы хотите узнать больше обо мне? Эти команды здесь для этого!*",
	help_music_dsc: "> *Вы любите музыку? Вот подарок для вас :)*",
	help_backup_dsc:
		"> *Нужна быстрая резервная копия вашего сервера? Вот я :3*",
	help_guildconf_dsc: "> *Ищете продвинутую и легкую настройку? Вот я :3*",
	help_prof_dsc:
		"> *Вы следите за своим внешним видом? Вот некоторые команды, чтобы обеспечить великолепный профиль среди пользователей :)*",
	help_economy_dsc:
		"> *Вы следите за своим кошельком? Или просто хотите что-то купить? Я здесь :)*",
	help_owner_dsc:
		"> *Эта категория зарезервирована для владельцев и администраторов проекта iHorizon!*",
	help_roler_dsc:
		"> *Хотите настроить реакции на роли для своего сервера? Вот я!*",
	help_invitem_dsc: "> *Хотите проверить приглашения участника? Это здесь!*",
	help_ticket_dsc:
		"> *Хотели бы вы создать тикет или использовать одну из моих функций внутри него? Конечно!*",
	help_memberc_dsc:
		"> *Хотите настроить голосовые каналы для подсчета участников? Конечно :smile:*",
	help_newftrs_dsc: "> *Вот некоторые новые и очень интересные функции!*",
	help_not_for_you: "Это взаимодействие не для вас",
	help_protection_fields: "Защита",
	help_protection_dsc:
		"> *Предотвращайте выполнение некоторых действий не в белом списке для защиты сервера.*",
	help_suggestion_fields: "Предложения",
	help_suggestion_dsc:
		"> *Предоставьте вашим пользователям возможность высказываться, дайте им возможность предлагать идеи в отдельном канале!*",
	help_security_fields: "Безопасность",
	help_security_dsc:
		"> *Проводите тесты CAPTCHA для новых участников, чтобы обеспечить безопасный доступ к вашему серверу.*",
	help_schedule_fields: "Планирование",
	help_schedule_dsc:
		"> *Создавайте напоминания с заранее заданными сообщениями, которые бот будет отправлять вам в личном сообщении*",
	help_pfps_fields: "PFPS",
	help_pfps_dsc: "> *Отправка случайного аватара пользователя в канал!*",
	help_voicedashboard_fields: "Голосовая панель",
	help_voicedashboard_dsc:
		"> *Создайте пользовательский временный голосовой канал с интерфейсом!*",
	help_select_menu: "Сделайте выбор!",
	help_select_menu_fields_desc: "${commandCount} Команды",
	help_back_to_menu: "Основное меню",
	help_back_to_menu_desc: "Вернуться в основное меню",
	help_confession_dsc:
		"> *Хотите сделать признание? Очень хорошо, каким бы мерзким оно ни было, iHorizon здесь для вас!*",
	help_confession_fields: "Исповедь",
	help_antispam_dsc:
		"> *Надоел спам? Отлично! iHorizon здесь, чтобы модерировать спам!*",
	help_antispam_fields: "AntiSpam",
	help_stats_fields: "Статистика пользователя",
	help_stats_dsc:
		"> *Посмотреть количество сообщений и голосовую активность пользователя в гильдии*",
	help_notifier_dsc:
		"> *Получайте уведомления, когда ютубер или стример публикует видео!*",
	help_notifier_fields: "Уведомитель",
	help_authrestore_fields: "AuthRestore",
	help_authrestore_dsc:
		"> *Проверка сервера с помощью oAuth2. Если ваш сервер был атакован или удален, вы можете восстановить своих старых участников с помощью oAuth2!*",
	help_tags_fields: "Пользовательские теги",
	help_tags_dsc:
		"> *Создайте сообщения с тегами для вашего сервера и используйте их на своем сервере!*",
	help_starboard_dsc:
		"> *Посмотреть самые отмеченные звёздами сообщения на сервере Discord.*",
	help_starboard_fields: "StarBoard",
	help_blogger_dsc:
		"Подписывайтесь на любимые RSS-ленты и получайте уведомления, когда через iHorizon публикуются новые статьи",
	help_blogger_fields: "Блогер",
	help_lastfm_dsc:
		"> *Подключите свой аккаунт Last.fm и автоматически скробблите треки, которые воспроизводит iHorizon, пока вы находитесь в голосовом канале.*",
	help_lastfm_fields: "LastFM Scrobbler",
	help_honeypot_fields: "Honeypot",
	help_honeypot_dsc:
		"> *Настройте канал-ловушку, чтобы выявлять скомпрометированные аккаунты и автоматически очищать недавний спам на сервере.*",

	// /h
	h_suite: "(Продолжение)",
	h_suite_desc: "*Продолжение команд категории*",
	helpall_no_perms_defined:
		"На этом сервере не настроены пользовательские права, поэтому `helpall` здесь бесполезен — используйте `${botPrefix}h`.",
	helpall_no_access:
		"У вас нет доступа ни к одной команде с правами на этом сервере.",

	// /say
	say_footer_msg: "\n\nОтправлено из `/говорить` от ${author}",

	// /ping
	ping_down_msg: "**НЕДОСТУПНО**",
	ping_embed_desc:
		"# Понг! Статистика сети ${botName}:\n\n**[Пинг веб-сайта Discord]** >> `${_net03}` мс.\n**[Пинг Cloudflare]** >> `${_net02}` мс.\n**[Пинг Google]** >> `${_net01}` мс.\n\n${emoji_Crown} **[Пинг веб-сайта iHorizon]** >> `${_net04}` мс.\n${emoji_Crown} **[Пинг веб-сокета]** `${ping}` мс.\n\n## ${emoji_Pointer} **[Среднее]** >> (ср)`${averagePing}` мс.",

	// /custom
	custom_avatar_reset:
		"Вы решили сбросить изображение профиля бота на сервере. Нижние колонтитулы встроенных сообщений вернутся к состоянию по умолчанию, а также изображение профиля бота на сервере.",
	custom_avatar_set:
		"${emoji_Yes} **Вы решили изменить изображение профиля бота на сервере. Нижние колонтитулы встроенных сообщений теперь изменены, а также изображение профиля бота на сервере.**\n${emoji_Crown} Новое значение: `${x}`",
	custom_name_reset:
		"Вы решили сбросить имя бота на сервере. Нижние колонтитулы встроенных сообщений вернутся к состоянию по умолчанию, а также имя бота на сервере.",
	custom_name_set:
		"${emoji_Yes} **Вы решили изменить имя бота на сервере. Нижние колонтитулы встроенных сообщений теперь изменены, а также имя бота на сервере.**\n${emoji_Crown} Новое значение: `${name}`",
	custom_desc_reset:
		"Вы решили сбросить описание бота на сервере. Нижние колонтитулы встроенных сообщений вернутся к состоянию по умолчанию, а также описание бота на сервере.",
	custom_desc_set:
		"${emoji_Yes} **Вы решили изменить описание бота на сервере. Нижние колонтитулы встроенных сообщений теперь изменены, а также описание бота на сервере.**\n${emoji_Crown} Новое значение: `${desc}`",
	custom_banner_reset: "Вы решили сбросить баннер бота на сервере.",
	custom_banner_set:
		"${emoji_Yes} **Вы решили изменить баннер бота на сервере.**\n${emoji_Crown} Новое значение: `${x}`",
	custom_sdk_only:
		"Эта команда доступна в production только для серверов с подпиской `Custom iHorizon Profile`.",
	custom_sdk_only_title: "Поддержите iHorizon через Custom iHorizon Profile",
	custom_sdk_only_description:
		"Наш бот бесплатный и с открытым исходным кодом с 2022 года. Нам нужен доход, чтобы продолжать поддерживать, разрабатывать и хостить бота. Наши расходы составляют около 500 EUR в год на серверы, boosts, домены и лицензии.\n\nКоманда `/custom` позволяет изменить идентичность iHorizon на вашем сервере, меняя аватар, имя, баннер и био. При её использовании визуальная идентичность iHorizon исчезает с вашего сервера.\n\nПоэтому мы добавили встроенную в Discord подписку стоимостью 2.99 USD в месяц.\n\nОформив эту подписку, вы сможете использовать эту команду. Считайте это custom-ботом в стиле OWN-IHRZ, но стабильным, чистым и полностью рабочим.",

	// Fun commands
	// /caracteres, /cats, /hack, /hug, /kiss, /morse, /poll, /question, /slap

	// Fun Var
	fun_var_down_api: "Ошибка: API не доступно!",
	fun_var_good_sentence: "Пожалуйста, отправьте хорошее предложение!",

	// /cats

	// /duck

	// /panda

	// /fox

	// /dolphin

	// /frog

	// /squirrel

	// /hack
	hack_embed_description: "<@${victimId}> взломан <@${authorId}> !",

	// /hug

	// /kiss

	// /poll
	poll_not_admin: "У вас нет прав для этого!",

	// /question
	question_not_full: "Введите полный вопрос с 3 или более словами!",
	question_s: [
		"Да.",
		"Нет.",
		"Я не знаю.",
		"Я не уверен!",
		"Ты сумасшедший!",
		"Нет, спасибо.",
		"Нет.",
		"Да."
	],
	question_fields_input_embed: ":question:__**Вопрос**__",
	question_fields_output_embed: ":grey_exclamation:__**Ответ:**__",
	question_embed_title: "__**Вопрос**__: `${authorUsername}`",

	// /slap

	// /dogs
	dogs_embed_command_error: "Ошибка при получении изображения собаки.",

	// /love
	love_embed_description:
		"**${user1Username}** + **${user2Username}** = __${randomNumber}%__ любви 💗",
	love_command_error: "Произошла ошибка при создании изображения",

	// /fun disable
	fun_disable_command_msg:
		"${author}, вы ${action_type} категорию развлечений!",
	fun_category_disable:
		"Вы не можете использовать эту команду, категория команд развлечений отключена.",

	// /fun gay

	// /fun stench

	// /fun rate

	// /fun caracteres
	fun_caracteres_command_ok: "Пожалуйста, введите текст для преобразования!",
	fun_caracteres_embed_desc:
		"Исходный текст: **${inputText}**\n\nВыберите стиль из выпадающего меню ниже, чтобы преобразовать текст.",
	fun_caracteres_select_menu_placeholder: "Выберите стиль шрифта...",

	// /fun random dice

	// /fun random heads-tails
	fun_coinflip_result_heads: "Орёл",
	fun_coinflip_result_tails: "Решка",

	// /fun random number

	// +transgender

	// Economy commands
	// /addmoney, /balance, /daily, /monthly, /pay, /removemoney, /rob, /weekly, /work

	economy_cooldown_error:
		"Подождите **${time}**, прежде чем вы сможете снова выполнить эту команду!",

	// /addmoney
	addmoney_not_admin:
		"Вы не можете выполнить эту команду, так как у вас нет необходимых прав `АДМИНИСТРАТОР`",
	addmoney_logs_embed_title: "Логи экономики",
	addmoney_logs_embed_description:
		"<@${authorId}> добавил ${amountValue} монет пользователю <@${userId}> !",
	addmoney_command_work:
		"Успешно добавлено `${amountValue}`$ пользователю <@${userId}>",

	// /balance
	balance_dont_have_wallet: "👛 У вас нет кошелька... !",
	balance_he_dont_have_wallet:
		"${emoji_Wallet} ${user} не имеет кошелька... !",
	balance_have_wallet: "👛 У вас есть ${bal} монет(ы) !",
	balance_he_have_wallet: "${emoji_Wallet} У ${user} есть ${bal} монет(ы) !",
	balance_embed_fields1_name: "Банк",
	balance_embed_fields2_name: "В балансе",

	// /daily
	daily_cooldown_error:
		"Извините, вы должны подождать **${time}** перед выполнением этой команды!",
	daily_embed_title: "Ежедневно",
	daily_embed_description: "**Ежедневное вознаграждение**",
	daily_embed_fields: "Собрано",

	// /monthly
	monthly_cooldown_error:
		"Извините, вы должны подождать **${time}** перед выполнением этой команды!",
	monthly_embed_title: "Ежемесячно",
	monthly_embed_description: "**Ежемесячное вознаграждение**",
	monthly_embed_fields: "Собрано",

	// /pay
	pay_negative_number_error: "Отрицательную сумму нельзя перевести.",
	pay_dont_have_enought_to_give:
		"Это больше денег, чем у вас есть на балансе. Попробуйте ещё раз.",
	pay_command_work:
		"${authorUsername}, Вы успешно перевели ${amount}$ пользователю ${userUsername}.",

	// /removemoney
	removemoney_not_admin:
		"Вы не можете выполнить эту команду, так как у вас нет необходимых прав `АДМИНИСТРАТОР`",
	removemoney_embed_title: "Удалено денег!",
	removemoney_embed_fields: "Сумма",
	removemoney_embed_second_fields: "Баланс обновлен",
	removemoney_logs_embed_description:
		"<@${authorId}> удалил ${amount} монет у пользователя <@${userId}> !",
	removemoney_logs_embed_title: "Логи экономики",

	// /rob
	rob_cooldown_error:
		"**Подождите 50 минут, прежде чем снова грабить пользователя!**",
	rob_dont_enought_error:
		":x: Вам нужно как минимум 250$, чтобы грабить кого-то.",
	rob_him_dont_enought_error:
		":x: У ${userUsername} недостаточно средств для грабежа.",
	rob_embed_description:
		"<@${authorId}> вы грабили <@${userId}> и сбежали с ${random}!",

	// /weekly
	weekly_cooldown_error:
		"Извините, вы должны подождать **${time}** перед выполнением этой команды!",
	weekly_embed_title: "Еженедельно",
	weekly_embed_description: "**Еженедельное вознаграждение**",
	weekly_embed_fields: "Собрано",

	// /work
	work_cooldown_error:
		"<@${authorId}>, **Подождите ${time} минут, прежде чем снова грабить другого пользователя!**",
	work_embed_author: "${authorUsername}, это окупилось!",
	work_embed_description:
		"${authorUsername}, вы поработали и заработали ${amount}$ !",

	// /withdraw
	withdraw_cannot_abuse:
		"${emoji_No} | Вы не можете снять большую сумму монет, чем у вас в банке!",
	withdraw_embed_title: "Снятие с вашего банка",
	withdraw_embed_desc:
		"${author}, вы сняли ${toWithdraw}${emoji_Coin} с вашего `банка`",
	withdraw_embed_fields1_name: "Банк",

	// /deposit
	deposit_cannot_abuse:
		"${emoji_No} | Вы не можете внести большую сумму монет, чем у вас в кошельке!",
	deposit_embed_title: "Внесение в ваш банк",
	deposit_embed_desc:
		"${author}, вы внесли ${toDeposit}${emoji_Coin} в ваш `банк`",
	deposit_embed_fields1_name: "Банк",

	// /leaderboard
	economy_leaderboard_embed_title: "Экономическое лидерство `${guildName}`",
	economy_leaderboard_embed_fields_value:
		"<@${userId}> - Банк: `${bank}`${emoji_Coin} | Баланс: `${money}`${emoji_Coin}",

	// /economy (money and cooldown commands)
	economy_action_in_progress:
		"${emoji_No} | Ваша предыдущая команда экономики ещё выполняется, попробуйте снова через мгновение.",

	// /economy disable
	economy_disable_not_admin:
		":x: | Вы должны быть администратором этого сервера, чтобы выполнить эту команду!",
	economy_disable_already_disable:
		"<@${authorId}>, Модуль Экономики уже **отключен**!",
	economy_disable_already_enable:
		"<@${authorId}>, Модуль Экономики уже **включен**!",
	economy_disable_set_enable:
		"<@${authorId}>, вы успешно **включили** Модуль Экономики!",
	economy_disable_set_disable:
		"<@${authorId}>, вы успешно **отключили** Модуль Экономики!",
	economy_disable_logs_embed_desc:
		"<@${authorId}> изменил(а) состояние Модуля Экономики на `${state}`!",
	economy_disable_logs_embed_title: "Логи Экономики",

	// /economy boost-set
	economy_boost_role_not_found:
		"Роль не найдена. Вы должны установить цену для роли.",
	economy_boost_embed_title: "Экономическая система - Покупаемые роли",
	economy_boost_embed_desc: "Все покупаемые роли перечислены ниже.",

	// /economy role add
	economy_role_add_no_role: "Нет ролей для удаления из покупаемых.",
	economy_role_add_max_20_roles:
		"Вы можете иметь не более 20 покупаемых ролей.",
	economy_role_add_canceled: "Роль не была добавлена в список покупаемых.",
	economy_role_add_prompt_dangerous:
		"Вы уверены, что хотите добавить эту роль в список покупаемых?\n**Внимание:** У этой роли есть опасные разрешения.\nРазрешения: ${stringDangerousPermissions}",

	// /economy shop
	economy_shop_embed_title: "🛍️ Магазин `${guildName}`",
	economy_shop_embed_desc:
		"Магазин позволяет покупать предметы/роли за ваши деньги. Вы можете увидеть доступные для покупки роли ниже.",
	economy_shop_not_available: "Выбранная вами роль недоступна для покупки.",
	economy_shop_already_own_role: "Вы уже владеете этой ролью.",
	economy_shop_not_enough_money:
		"У вас недостаточно денег для покупки этой роли.",
	economy_shop_role_add_failed:
		"Не удалось выдать вам эту роль, поэтому деньги не списаны. Попросите администратора проверить, что она существует и находится ниже моей высшей роли.",
	economy_shop_role_purchased:
		"Вы успешно купили роль **{roleName}** за **${rolePrice}** 💰.",
	economy_shop_unknown_role: "Неизвестная роль",
	economy_shop_not_set:
		"Нет ролей, доступных для покупки на этом сервере. Пожалуйста, свяжитесь с администратором сервера для получения дополнительной информации.",
	economy_shop_already_owned: "Уже есть",
	economy_shop_menu_placeholder: "Выберите роль для покупки",

	// /economy role list
	economy_role_list_no_buyable_roles:
		"Нет доступных для покупки ролей для отображения.",
	economy_role_list_embed_title: "Экономическая система – Покупаемые роли",
	economy_role_list_embed_desc:
		"Все доступные для покупки роли перечислены ниже.",

	// /economy economy-ureset
	reset_ueconomy_are_you_sure:
		"**Вы действительно уверены, что хотите удалить все данные экономики?\nЭто действие необратимо.**\n**Это разрушительное действие!!**",
	reset_ueconomy_logs_embed_title: "Логи модуля экономики (ОПАСНОЕ ДЕЙСТВИЕ)",
	reset_ueconomy_logs_embed_desc:
		"${author} удалил все данные модуля экономики для ${user}!",

	// /economy economy-greset
	reset_geconomy_are_you_sure:
		"**Вы действительно уверены, что хотите удалить все данные экономики ДЛЯ ВСЕХ УЧАСТНИКОВ СЕРВЕРА?\nЭто действие необратимо.**\n**Это разрушительное действие!!**",
	reset_geconomy_logs_embed_title:
		"Логи модуля экономики (ОЧЕНЬ ОПАСНОЕ ДЕЙСТВИЕ)",
	reset_geconomy_logs_embed_desc:
		"${author} удалил все данные модуля экономики для **ВСЕХ**!",

	// /economy manage-rewards set-cooldown
	economy_manage_rewards_cooldown_invalid_time:
		"Недействительный формат времени. Пожалуйста, используйте корректный формат.",
	economy_manage_rewards_cooldown_command_ok:
		"Задержка для ${type} успешно установлена на ${stime}.",

	// /economy mange-rewards set-money
	economy_manage_rewards_set_money:
		"Деньги для ${type} успешно установлены на ${money}.",

	// Profil Customisation commands
	// /setprofilage, /setprofildescriptions, /profil

	// /setprofilage
	setprofilage_command_work: "**Ваш возраст в профиле успешно обновлен.**",

	// /setprofildescriptions
	setprofildescriptions_command_work: "**Ваше описание успешно обновлено.**",

	// /profil
	profil_not_description_set: "Описание не установлено !",
	profil_unknown: "Неизвестно",
	profil_embed_title: "${emoji_Pin} __Профиль ${memberTag}__",
	profil_embed_fields_nickname: "📝 ・ __Никнейм__",
	profil_embed_fields_money: "🪙 ・ __Деньги__",
	profil_embed_fields_money_value: " монет",
	profil_embed_fields_xplevels: "💳 ・ __Уровень опыта__",
	profil_embed_fields_xplevels_value: " Уровней опыта",
	profil_embed_fields_age: "🎂 ・ __Возраст__",
	profil_embed_fields_age_value: " лет",
	profil_embed_fields_gender: "👤 ・ __Пол__",
	profil_embed_fields_pronouns: "📌 ・ __Местоимение__",
	profil_embed_fields_birthdate: "🎂 ・ __Дата дня рождения__",

	// /профиль установить-день-рождения
	profil_birthday_month_button_label: "Установить месяц",
	profil_birthday_day_button_label: "Установить день",
	profil_birthday_year_button_label: "Установить год",
	profil_birthday_embed_title: "🎂 ・ Установите свой день рождения!",
	profil_birthday_embed_introduction:
		"${emoji_Sparkles} **Как у каждого человека, у вас есть день рождения!**${emoji_Sparkles}\n\n${emoji_Crown} ・ Привет, ${author}\n:tada: ・ Чтобы отпраздновать его, пора его установить!\n",
	profil_birthday_embed_current_birthday:
		"${emoji_Pin} ・ **Текущий день рождения**: `${birthdayMonth}/${birthdayDay}/${birthdayYear}` (в формате ММ/ДД/ГГГГ)",
	profil_birthday_modal1_title: "Введите год рождения",
	profil_birthday_modal1_fields1_label: "Год",
	profil_birthday_invalid_year:
		"Неверный год! Пожалуйста, введите правильный год.",
	profil_birthday_year_already_set: "Ваш год уже установлен.",
	profil_birthday_year_set: "Ваш год установлен!",
	profil_birthday_modal2_title: "Введите месяц рождения",
	profil_birthday_modal2_fields1_label: "Месяц",
	profil_birthday_invalid_month:
		"Неверный месяц! Пожалуйста, введите правильный месяц.",
	profil_birthday_month_already_set: "Ваш месяц уже установлен.",
	profil_birthday_month_set: "Ваш месяц установлен!",
	profil_birthday_modal3_title: "Введите день рождения",
	profil_birthday_modal3_fields1_label: "День",
	profil_birthday_invalid_day:
		"Неверный день! Пожалуйста, введите правильный день.",
	profil_birthday_day_already_set: "Ваш день уже установлен.",
	profil_birthday_day_set: "Ваш день установлен!",

	// Utils commands
	// /serverinfo, /snipe, /userinfo, /renew

	// /serverinfo

	// /setrankroles
	setrankroles_not_admin:
		"${emoji_No} Вы не являетесь администратором этого сервера. Вы не можете выполнить эту команду!",
	setrankroles_already_this_in_db:
		"${emoji_No} Роли рангов уже есть в базе данных для этого сервера. ",
	setrankroles_not_roles_typed:
		"${emoji_No} Вы не включили ни одной роли в вашей команде!",
	setrankroles_logs_embed_description_enable:
		"<@${authorId}> установил роли рангов на <@&${argsid}>",
	setrankroles_logs_embed_title_enable: "Установить роли рангов",
	setrankroles_logs_embed_description_disable:
		"<@${authorId}> удалил роль рангов!",
	setrankroles_logs_embed_title_disable: "Установить роли рангов",
	setrankroles_command_work_disable:
		"<@${authorId}>, вы удалили роль рангов!",
	setrankroles_command_error:
		"${emoji_No} Команда столкнулась с ошибкой! Попробуйте еще раз позже.",

	// /snipe
	snipe_no_previous_message_deleted: "В этом канале нет удаленных сообщений!",

	// /userinfo
	userinfo_wait_please: "${emoji_Timer} Пожалуйста, подождите...",
	userinfo_var_notfound: "`Не найдено`",
	userinfo_button_label: "Профиль пользователя",

	// /renew
	renew_channel_send_success: "${author} канал был восстановлен!",
	renew_dont_have_permission: ":x: **Нельзя** `Нет разрешения!`",
	renew_not_administrator:
		":x: **Вы не являетесь администратором для использования этой команды!**",

	// /renewvc
	renewvc_not_in_voice:
		"${emoji_No} Вы должны быть подключены к голосовому каналу, чтобы использовать эту команду!",
	renewvc_region_success:
		"${emoji_Yes} Голосовой регион канала ${targetVc} установлен на автоматический!",
	renewvc_dont_have_permission: ":x: **Нельзя** `Нет разрешения!`",

	// /prevnames
	prevnames_undetected: "Данных не найдено!",
	prevnames_not_admin:
		"У вас нет разрешения `АДМИНИСТРАТОР` для выполнения этой команды!",
	prevnames_data_erased:
		"Ваши предыдущие имена пользователя были полностью удалены по вашему запросу!",
	prevnames_embed_footer_text: "iHorizon | Страница ${page}/${pageCount}",

	// /blockbot
	blockbot_not_owner: ":x: **Вы не являетесь владельцем сервера!**",
	blockbot_logs_enable_title: "Лог блокировки бота",
	blockbot_logs_enable_description:
		"${author} (Владелец сервера) __включил__ `BlockBot`. Теперь бот **не может** быть добавлен на этот сервер!",
	blockbot_command_work_on_enable:
		"**Вы включили `BlockBot`**\nТеперь бот **не может** быть добавлен на этот сервер!",
	blockbot_command_work_on_disable:
		"**Вы выключили `BlockBot`**\nТеперь бот **может** быть добавлен на этот сервер!",
	blockbot_logs_disable_commmand_work: "Лог блокировки бота",
	blockbot_logs_disable_description:
		"${author} (Владелец сервера) __выключил__ `BlockBot`. Теперь бот **может** быть добавлен на этот сервер!",

	// /banner
	banner_guild_no_banner: "На сервере нет баннера.",
	banner_user_no_banner: "У этого пользователя нет баннера.",

	// /massiverole
	massiverole_too_much_member:
		"Слишком много участников, операция не может быть выполнена из-за возможных ограничений скорости!",

	// /nickrole
	nickrole_too_much_member:
		"Слишком много участников, операция не может быть выполнена из-за возможных ограничений скорости!",

	// /emoji
	emoji_send_new_emoji:
		"__Создан новый смайлик__ с именем **${emojiName}** ! (${emoji})",
	emoji_send_err_emoji:
		"__Ошибка при создании нового смайлика__ с именем **${emojiName}** !",

	// /derank
	derank_msg_failed: "При удалении ролей произошла ошибка.",
	derank_no_role: "У этого участника нет ролей для удаления.",

	// /действие разблокировать все
	action_unban_all_no_banned_members: "Заблокированных участников нет.",

	// /действие отменить разблокировку

	// /vc
	vc_embed_desc:
		"## Состояния Голоса\n`${voiceCount}` участник(ов) в голосовом канале:\n${emoji_iHorizon_Streaming} **=>** ${streaming}\n${emoji_iHorizon_Deaf} **=>** ${deafened}\n${emoji_iHorizon_Mute} **=>** ${muted}\n${emoji_iHorizon_Camera} **=>** ${video}\n## Состояния Участников\n`${memberCount}` участник(ов) в гильдии:\n${emoji_DND} **=>** ${dnd}\n${emoji_Online} **=>** ${online}\n${emoji_Idle} **=>** ${idle}\n${emoji_Invisible} **=>** ${offline}\n## Состояния Бустов\n`${boostCount}` буст(ов) в гильдии,\n${members}",
	vc_embed_fields_1_name: "・Количество Участников",
	vc_embed_fields_1_value: "```py\n${memberCount} участников```",
	vc_embed_fields_2_name: "・Количество Каналов",
	vc_embed_fields_2_value:
		"```py\n${textChannelSize} текстовый(е) канал(ы)\n${voiceChannelSize} голосовой(е) канал(ы)```",
	vc_embed_short_desc:
		"## Голосовые Состояния\n`${voiceCount}` участник(ов) в голосовом канале:\n${emoji_iHorizon_Streaming} **=>** ${total_members_vc_streaming}\n${emoji_iHorizon_Deaf} **=>** ${total_members_vc_deaf}\n${emoji_iHorizon_Mute} **=>** ${total_members_vc_mute}\n${emoji_iHorizon_Camera} **=>** ${total_members_vc_video}\n## Состояния Участников\n`${total_members_size}` участник(ов) в гильдии:\n${emoji_DND} **=>** ${total_members_states_dnd}\n${emoji_Online} **=>** ${total_members_states_online}\n${emoji_Idle} **=>** ${total_members_states_idle}",

	// /massmove
	massmove_too_much_member:
		"Слишком много участников, не могу сделать это из-за возможного ограничения скорости!",

	// /all-admins
	all_admins_nobody_admins: "В этом сервере нет администраторов!",
	all_admins_unrank_button_label: "Разжаловать всех",
	all_admins_unrank_not_owner:
		"Только владелец сервера может разжаловать всех администраторов сервера",

	// /allbots

	// /addrole
	utils_addrole_highter_or_egal_roles_msg:
		"${emoji_Stop} Вы не можете добавить роль пользователю, у которого роль выше вашей...",
	utils_addrole_command_ok:
		"${author} успешно добавил роль ${role} пользователю ${user}",
	utils_addrole_not_wl:
		"${emoji_No} | Роль, которую вы хотите добавить пользователю, не внесена в белый список. Администратор должен сначала добавить её! (используйте `/utils wlroles`)",
	utils_addrole_cant_level:
		"Пользователь не админ, а ты хочешь дать ему роль админа? Ты издеваешься? Хочешь сломать сервер?",
	utils_addrole_try2brain:
		"У бота слишком низкая позиция в иерархии. Я не могу выдать эту глупую роль.",

	// /delrole
	utils_delrole_highter_or_egal_roles_msg:
		"${emoji_Stop} Вы не можете удалить роль у пользователя, у которого роль выше вашей...",
	utils_delrole_command_ok:
		"${author} успешно удалил роль ${role} у пользователя ${user}",
	utils_delrole_not_wl:
		"${emoji_No} | Роль, которую вы хотите удалить у пользователя, не внесена в белый список. Администратор должен сначала добавить её! (используйте `/utils wlroles`)",
	utils_delrole_try2brain:
		"У бота слишком низкая позиция в иерархии. Я не могу убрать эту глупую роль.",

	// /utils wlroles
	utils_wlroles_embed_title: "Роли в белом списке",
	utils_wlroles_embed_desc:
		"Вот все разрешённые роли, которые можно назначить с помощью команд `addrole` и `delrole`!",
	utils_wlRoles_logsEmbed_title: "Модуль белого списка ролей",
	utils_wlRoles_logsEmbed_desc:
		"${author} изменил роли в белом списке (для команд `addrole` и `delrole`)",
	utils_derogation_already_exists:
		"${emoji_No} Роль исключения ${role} уже настроена корректно",
	utils_derogation_created:
		"${emoji_Yes} Роль исключения ${role} была создана. Синхронизировано каналов: `${updatedChannels}`. Ошибок: `${failedChannels}`",
	utils_derogation_resynced:
		"${emoji_Yes} Роль исключения ${role} уже существовала, я повторно синхронизировал `${updatedChannels}` каналов. Ошибок: `${failedChannels}`",

	// /utils dm
	utils_dm: "${emoji_Yes} Сообщение было успешно отправлено ${targetMember}.",
	utils_dm_cant:
		"${emoji_No} Не удалось отправить сообщение пользователю ${targetMember}. Возможно, он заблокировал личные сообщения или заблокировал меня!",

	// /utils pic-only
	utils_pic_only_embed_title: "Каналы только для медиа",
	utils_pic_only_emnbed_desc:
		"Канал, где разрешены только изображения/видео. Другой контент (например, текстовые сообщения) блокируется ботом",
	utils_piconly_embed_fields_3_name: "Время тайм-аута",
	utils_piconly_select1_option1_label: "Изменить время тайм-аута",
	utils_piconly_select1_option2_label: "Изменить порог",
	utils_piconly_modal1_title: "MediaOnly - Настройки времени",
	utils_piconly_modal1_fields1_placeholder: "длительность мута",
	utils_piconly_modal1_fields1_label: "Время мута",
	utils_piconly_modal2_title: "MediaOnly - Настройка порога",
	utils_piconly_modal2_fields1_placeholder: "порог перед мутом",
	utils_piconly_modal2_fields1_label: "Порог",
	utils_piconly_embed_fields2_placeholder:
		"Создать тред под изображением/видео",
	utils_piconly_var_thread_name: "Тред от {name}",

	// /zip-emojis
	zip_emojis_doesnt_have_perm: "У вас нет разрешения на управление эмодзи.",
	zip_emojis_command_work:
		"🎉 Экспорт завершен за **${calcTime}** мс! Вот архив, содержащий ${emojiCount} эмодзи.",
	zip_emojis_command_error: "Произошла ошибка при экспорте эмодзи.",

	// /zip-stickers
	zip_stickers_doesnt_have_perm:
		"У вас нет разрешения на управление стикерами.",
	zip_stickers_command_work:
		"🎉 Экспорт завершен за **${calcTime}**мс! Вот архив, содержащий ${stickerCount} стикеров.",
	zip_stickers_command_error: "Произошла ошибка при экспорте стикеров.",

	// +sticker
	sticket_no_sticker: "Стикер не найден в ответном сообщении.",
	sticket_command_work: "Стикер `${name}` успешно создан.",
	sticker_command_error:
		"Не удалось создать стикер. Произошла ошибка: `${errMessage}`.",
	sticket_command_error2:
		"Пожалуйста, ответьте на сообщение, содержащее стикер.",

	// /util nick-kicker
	util_nick_kicker_embed_desc:
		"Когда участник присоединяется, если его никнейм содержит определенное слово, он будет исключен",
	util_nick_kicker_words: "слова",
	util_nick_kicker_select_to_remove: "Выберите слово для удаления",
	util_nick_kicker_remove_word: "Удалить это слово",
	util_nick_kicker_no_word_to_remove: "Нет слов для удаления",
	util_nick_kicker_add_word: "Добавить слово",
	util_nick_kicker_words_max_15: "Вы не можете добавить более 15 слов",
	util_nick_kicker_disable: "Отключить",
	util_nick_kicker_remove_word2: "Удалить слово",
	util_nick_kicker_remove_desc: "Удалить слово из кикера никнеймов",
	util_nick_kicker_add_desc: "Добавить слово в кикер никнеймов",
	util_nick_kicker_disable_desc: "Отключить кикер никнеймов",
	util_nick_kicker_enable_desc: "Включить кикер никнеймов",

	// /util wakeup
	util_wakeup_yourself:
		"Братан, ты что, глупый? Неужели ты пишешь эту команду, пока спишь на клавиатуре, лол",
	util_wakeup_not_in_vc:
		"Братан, бот не станет клонировать ${userDisplayName} с той же аватаркой и баннером, чтобы ты поверил, что человек проснулся... Его даже нет в голосовом канале лол",
	util_wakeup_command_work: "Давай разбудим ${user} !",

	// /util talk
	util_talk_not_in_vc:
		"Вы должны находиться в голосовом канале, чтобы использовать эту команду.",
	util_talk_audit_reason: "Режим голосового разговора включён",
	util_talk_logs_title: "Голосовой Разговор",
	util_talk_logs_description:
		"${author} включил(а) режим разговора в ${voiceChannel} и заглушил(а) ${mutedCount} участник(ов). ${skippedCount} участник(ов) были пропущены.",
	util_talk_command_work:
		"Режим разговора теперь включён в ${voiceChannel}. ${mutedCount} участник(ов) были заглушены, ${skippedCount} участник(ов) были пропущены.",

	// /util untalk
	util_untalk_nothing_active:
		"На этом сервере нет активного режима разговора.",
	util_untalk_audit_reason: "Режим голосового разговора выключен",
	util_untalk_logs_title: "Отключение Голосового Разговора",
	util_untalk_logs_description:
		"${author} выключил(а) режим разговора в ${voiceChannel} и снял(а) заглушение с ${unmutedCount} участник(ов).",
	util_untalk_command_work:
		"Режим разговора был выключен в ${voiceChannel}. С ${unmutedCount} участник(ов) было снято заглушение.",

	// /util freeze
	util_freeze_logs_title: "Заморозка Голоса",
	util_freeze_logs_description:
		"${author} заморозил(а) доступ к ${voiceChannel}.",
	util_freeze_command_work:
		"Голосовой канал ${voiceChannel} теперь заморожен.",

	// /util wlvc
	util_wlvc_no_member:
		"Вы должны указать участника, которому будет разрешён вход в замороженный голосовой канал.",
	util_wlvc_no_freeze:
		"На этом сервере нет активного замороженного голосового канала.",
	util_wlvc_logs_title: "Разрешение Заморозки Голоса",
	util_wlvc_logs_description:
		"${author} разрешил(а) ${member} войти в замороженный голосовой канал.",
	util_wlvc_command_work:
		"${member} теперь может войти в замороженный голосовой канал.",

	// /util unwlvc
	util_unwlvc_no_member:
		"Вы должны указать участника, которого нужно удалить из белого списка замороженного голосового канала.",
	util_unwlvc_no_freeze:
		"На этом сервере нет активного замороженного голосового канала.",
	util_unwlvc_not_whitelisted:
		"${member} не имеет доступа к замороженному голосовому каналу.",
	util_unwlvc_logs_title: "Удаление Разрешения Заморозки Голоса",
	util_unwlvc_logs_description:
		"${author} удалил(а) ${member} из белого списка замороженного голосового канала.",
	util_unwlvc_command_work:
		"${member} больше не может присоединяться к замороженному голосовому каналу.",

	// /util unfreeze
	util_unfreeze_no_freeze:
		"На этом сервере нет активного замороженного голосового канала.",
	util_unfreeze_logs_title: "Разморозка Голоса",
	util_unfreeze_logs_description:
		"${author} снял(а) активную голосовую заморозку.",
	util_unfreeze_command_work: "Голосовой канал больше не заморожен.",

	// /util leash
	util_leash_too_naugthy:
		"Шалунишка, ты не можешь привязать больше 3 человек :D",
	util_leah_already_owned:
		"Шалунишка, у тебя уже есть эти маленькие чудеса :smirk:",
	util_leash_confirm_message:
		"${emoji_No} | Участник, которого ты хочешь привязать, не находится в голосовом канале!\n${emoji_Warning_Icon} | Ты уверен, что хочешь выполнить это действие?",
	util_leash_canceled_leash: "${emoji_Yes} | Настройка поводка отменена",
	util_leash_confirmed_leash:
		"${emoji_Yes} | Вы успешно привязали пользователя на поводок в этом сервере :smirk:",

	// /util unleash
	util_unleash_not_in_leash:
		"${emoji_No} | Этот пользователь не находится под вашим контролем!",
	util_unleash_command_ok:
		"${emoji_Yes} | Вы успешно освободили пользователя на этом сервере :)",

	// /utilss leashlist
	util_leashlist_no_data:
		"${emoji_No} | На этом сервере нет активных привязок.",
	util_leashlist_embed_title: "Активные привязки",

	// /util lockname, /util unlockname
	util_lockname_not_in_guild: "${emoji_No} | Этого участника нет на сервере!",
	util_lockname_not_manageable:
		"${emoji_No} | У меня нет разрешения управлять ником этого участника!",
	util_lockname_already_locked:
		"${emoji_No} | Ник этого участника уже заблокирован!",
	util_lockname_success:
		"${emoji_Yes} | Ник ${member} теперь заблокирован на **${nick}**!",
	util_lockname_success_reset:
		"${emoji_Yes} | Ник ${member} теперь заблокирован!",
	util_unlockname_not_locked:
		"${emoji_No} | Ник этого участника не заблокирован!",
	util_unlockname_success: "${emoji_Yes} | Ник ${member} был разблокирован!",
	util_lockname_logs_embed_title: "Логи блокировки ников",
	util_lockname_logs_embed_description:
		"<@${authorId}> заблокировал ник <@${memberId}>",
	util_unlockname_logs_embed_description:
		"<@${authorId}> разблокировал ник <@${memberId}>",

	util_locknamelist_empty:
		"${emoji_No} | На этом сервере нет заблокированных ников! `/utilss lockname`, чтобы создать.",
	util_locknamelist_embed_title: "Заблокированные ники",

	// /util autorenew
	util_autorenew_time_too_short:
		"Время между обновлением канала должно быть более 1 минуты",
	util_autorenew_time_too_long:
		"Время между обновлением канала должно быть менее 30 дней",
	util_autorenew_command_ok:
		"${emoji_Yes} Теперь канал ${channel} будет автоматически удаляться-создаваться (обновляться) каждые ${time}!\nЧтобы остановить обновление канала, просто удалите его самостоятельно.",
	event_autorenew_channel_renewed: "AutoRenew обновил канал!",
	event_autorenew_channel_warning:
		"Модуль AutoRenew настроен на обновление этого канала. Следующее обновление через ${time}.",

	// /util where
	var_video: "Видео",
	var_whereis: "Где находится",
	util_not_in_vc: "Участники не находятся в голосовом канале",

	// /util allwebhooks
	util_no_webhooks: "В этом сервере нет webhooks.",
	util_allwebhooks_embed_title: "Все webhooks",
	util_allwebhooks_deleting: "Удаление всех webhooks...",
	util_allwebhooks_deleted: "**`${u}`** webhook(ов) удалено!",

	// /util unzip-emojis
	util_unzip_emojis_command_work:
		"🎉 Распаковка завершена за ${calcTime} мс! Я создал ${emojiCount} эмодзи в гильдии.",
	util_unzip_emojis_command_error: "Произошла ошибка при распаковке эмодзи.",
	util_unzip_emojis_command_no_file:
		"Пожалуйста, прикрепите zip-файл, содержащий эмодзи.",

	// /util vkick
	vkick_member_not_in_guild: "Участник не в гильдии.",
	vkick_not_in_vc: "Участник не в голосовом канале.",
	vkick_not_admin_kick:
		"Вы не можете отключить администратора от голосового канала.",
	vkick_logEmbed_title: "Голосовой Кик",
	vkick_logEmbed_desc:
		"${author} отключил ${member} от голосового канала ${voiceChannel}.",
	vkick_command_work:
		"${author}, вы успешно отключили ${member} от ${voiceChannel}.",

	// /util sync
	util_sync_embed_description_0:
		"Все каналы в категории уже имеют синхронизированные разрешения.",

	// /util securewebhook
	util_securewebhook_action_create:
		"Недействительный URL-адрес вебхука Discord",
	util_securewebhook_action_create_error:
		"Ошибка при создании вебхука: `${status}`",
	util_securewebhook_action_create_ok:
		"Вебхук успешно создан\n> URL: ${url}\n> Использование: ${use}",
	util_securewebhook_action_delete_any: "У вас нет вебхуков",
	util_securewebhook_action_delete_not_owner:
		"Вы не являетесь владельцем этого вебхука",
	util_securewebhook_action_delete_error: "Ошибка при удалении вебхука",
	util_securewebhook_actiom_list_ok: ":star: __**Ваши вебхуки**__:\n",

	// /util admin-roles
	admin_roles_nobody_roles: "В этом сервере нет роли администратора!",
	admin_roles_remove_button_label: "Снять права админа у всех",
	admin_roles_remove_not_owner: "Вы не владелец сервера!",

	// /util rolelimit
	util_rolelimit_bad_opt:
		"${emoji_No} | Указанные параметры недействительны. Пожалуйста, проверьте введённые данные.",
	util_rolelimit_good:
		"${emoji_Crown} | Роль: ${role} | Максимум участников: ${limit_count}\n- Новые пользователи не смогут получить эту роль, если её уже имеют ${limit_count} участников.",

	// /util inviteinfo
	util_inviteinfo_not_valid_invite:
		"Приглашение `discord_invite` недействительно!",

	// /util cooldown
	util_cooldown_command_ok:
		"Медленный режим канала установлен на ${duration_in_string}.",

	// /util role-members
	util_role_members_no_one: "На сервере нет никого с этой ролью",

	// /util vanity-generator
	util_vanity_generator_invalid_code:
		"Код URL Vanity `${VanityCode}` недействителен. Строка должна быть буквенно-цифровой и может содержать дефисы между словами. Максимальная длина — 32 символа. Дефисы не могут находиться в начале или конце строки.",
	util_vanity_generator_already_claimed:
		"Этот код URL Vanity уже занят! Выберите другой.",
	util_vanity_generator_command_err:
		"Произошла ошибка при создании vanity-кода. Пожалуйста, попробуйте позже.",

	// +top
	utils_top_no_message: "В этом канале не найдено сообщений",
	utils_top_command_ok:
		"Первое сообщение в этом канале находится [здесь](${link})",

	// +bringall
	bringall_no_from_channel: "Пожалуйста, укажите исходный голосовой канал.",
	bringall_invalid_category: "Пожалуйста, укажите действительную категорию.",
	bringall_no_voice_channels:
		"Указанная категория не содержит голосовых каналов.",
	bringall_no_members: "В исходном голосовом канале нет участников.",

	// /util move
	util_move_not_in_vc:
		"Участник, которого вы хотите переместить, не подключен ни к одному голосовому каналу",
	util_move_impossible_to_move_admin:
		"Участник, которого вы хотите переместить, является администратором, а вы нет.",
	util_move_command_ok: "${member} теперь находится в ${channel}",

	// Guild Config commands
	// /blockpub, /guildprofil, /setchannels, /setjoindm, /setjoinmessage, /setjoinroles, /setleavemessage, /setup

	// /blockpub
	blockpub_not_admin: ":x: | Вы должны быть администратором этого сервера!",
	blockpub_now_enable:
		"📌 | Антиреклама теперь включена (она работает для всех, кроме администраторов)",
	blockpub_now_disable: "📌 | Антиреклама теперь отключена!",

	// /guildprofil
	guildprofil_not_admin:
		":x: | Вы должны быть администратором этого сервера! ",
	guildprofil_not_set_reactionrole: "Не установлено!",
	guildprofil_set_reactionrole:
		"**MessageID**: `${i}` -> ${emoji} дает роль <@&${rolesID}>\n",
	guildprofil_not_set_ticketFetched: "Не установлено!",
	guildprofil_set_ticketFetched: "",
	guildprofil_not_set_punishPub: "Не установлено!",
	guildprofil_set_punishPub:
		"`${punishementType}`: максимум: `${amountMax}` флаги.",
	guildprofil_not_set_supportConfig: "Не установлено!",
	guildprofil_set_supportConfig: "`${input}` в био дает роль <@&${rolesId}>.",
	guildprofil_not_set_setchannelsjoin: "Не установлено!",
	guildprofil_set_setchannelsjoin: "",
	guildprofil_not_set_setchannelsleave: "Не установлено!",
	guildprofil_set_setchannelsleave: "",
	guildprofil_not_set_joinmessage: "Не установлено!",
	guildprofil_set_joinmessage: "",
	guildprofil_not_set_leavemessage: "Не установлено!",
	guildprofil_set_leavemessage: "",
	guildprofil_not_set_joinroles: "Не установлено!",
	guildprofil_set_joinroles: "",
	guildprofil_not_set_joinDmMessage: "Не установлено!",
	guildprofil_set_joinDmMessage: "",
	guildprofil_not_set_blockpub: "Выключено",
	guildprofil_set_blockpub: "Включено",
	guildprofil_embed_description: "`Настройки сервера:` ${guildName} !",
	guildprofil_embed_fields_joinmessage: "Сообщение о входе",
	guildprofil_embed_fields_leavemessage: "Сообщение о выходе",
	guildprofil_embed_fields_setchannelsjoin: "Канал для входа",
	guildprofil_embed_fields_setchannelsleave: "Канал для выхода",
	guildprofil_embed_fields_joinroles: "Роли при входе",
	guildprofil_embed_fields_joinDmMessage: "Личное сообщение при входе",
	guildprofil_embed_fields_blockpub: "Блокировка рекламы",
	guildprofil_embed_fields_punishPub: "Наказание за рекламу",
	guildprofil_embed_fields_supportConfig: "Поддержка",
	guildprofil_embed_fields_ticketFetched: "Тикеты",
	guildprofil_embed_fields_reactionrole: "Реакционные роли",
	guildprofil_not_logs_set: "Каналы журналов не настроены",
	guildprofil_blockbot_on: "Блокировка ботов включена",
	guildprofil_blockbot_off: "Блокировка ботов отключена",
	guildprofil_disable_xp: "Сообщения отключены",
	guildprofil_enable_xp: "Сообщения включены",
	guildprofil_another_enable_xp:
		"Сообщения включены для отправки в <#${xpChannels}>",
	guildprofil_embed_fields_blockbot: "Блокировка ботов",
	guildprofil_embed_fields_logs: "Журналы",
	guildprofil_embed_fields_ranks: "Ранги",

	// /setchannels
	setchannels_not_admin:
		":x: | Вы должны быть администратором этого сервера, чтобы выполнить эту команду!",
	setchannels_not_specified_args:
		"Вы должны указать допустимые каналы для вашего модуля.",
	setchannels_already_this_channel_on_join:
		"Модуль уже настроен на этот канал для входа!",
	setchannels_confirmation_message_on_join:
		"**Канал входа установлен здесь!** :tada:",
	setchannels_command_error_on_join:
		"Ошибка: отсутствуют разрешения или канал не существует",
	setchannels_command_work_on_join:
		"Вы успешно настроили модуль входа на <#${argsidId}>",
	setchannels_logs_embed_title_on_join: "Настройка журнала каналов",
	setchannels_logs_embed_description_on_join:
		"<@${authorId}> установил модуль входа на: <#${argsidId}>",
	setchannels_already_this_channel_on_leave:
		"Модуль уже настроен на этот канал для выхода!",
	setchannels_confirmation_message_on_leave:
		"**Канал выхода установлен здесь!** :tada:",
	setchannels_command_error_on_leave:
		"Ошибка: отсутствуют разрешения или канал не существует",
	setchannels_command_work_on_leave:
		"Вы успешно настроили модуль выхода на <#${argsidId}>",
	setchannels_logs_embed_title_on_leave: "Настройка журнала каналов",
	setchannels_logs_embed_description_on_leave:
		"<@${authorId}> установил канал выхода на: <#${argsidId}>",
	setchannels_already_on_off: "Каналы входа и выхода уже отключены",
	setchannels_command_work_on_off:
		"Вы успешно отключили каналы входа и выхода!",
	setchannels_logs_embed_title_on_off: "Настройка журнала каналов",
	setchannels_logs_embed_description_on_off:
		"<@${authorId}> удалил все настройки каналов входа и выхода!",
	setchannels_button_join: "Изменить канал присоединения",
	setchannels_button_leave: "Изменить канал выхода",
	setchannels_button_delete: "Удалить конфигурацию",
	setchannels_embed_fields_value_join: "Канал присоединения",
	setchannels_embed_fields_value_leave: "Канал выхода",
	setchannels_not_a_text_channel:
		"${emoji_Warning_Icon} Указанный канал не является текстовым каналом!",
	setchannels_which_channel:
		"<@${authorId}>, Какой канал вы хотите установить?",
	setchannels_title_embed_panel:
		"Панель конфигурации каналов для настроек гильдии",

	// /setjoindm
	setjoindm_not_admin:
		":x: | Для выполнения этой команды вы должны быть администратором этого сервера!",
	setjoindm_logs_embed_title_on_enable: "Журнал установки JoinDm",
	setjoindm_logs_embed_description_on_enable:
		"<@${authorId}> установил сообщение при входе в ЛС!",
	setjoindm_not_specified_args_on_enable:
		"Вы должны указать допустимое сообщение для сообщения при входе в ЛС.",
	setjoindm_confirmation_message_on_enable:
		"Вы успешно установили сообщение при входе в ЛС:```${dm_msg}``` и включили его",
	setjoindm_command_error_on_enable:
		"Ошибка: отсутствуют разрешения или канал не существует",
	setjoindm_logs_embed_title_on_disable: "Журнал отключения JoinDm",
	setjoindm_logs_embed_description_on_disable:
		"<@${authorId}> отключил сообщение при входе в ЛС!",
	setjoindm_confirmation_message_on_disable:
		"Вы успешно отключили сообщение при входе в ЛС!",
	setjoindm_command_error_on_disable:
		"Ошибка: отсутствуют разрешения или канал не существует",
	setjoindm_already_disable: "Сообщение при входе в ЛС уже отключено!",
	setjoindm_not_setup_ls: "Здесь не настроено сообщение при входе в ЛС!",
	setjoindm_command_work_ls:
		"Сообщение при входе в ЛС: \n```${already_off}```",
	setjoindm_help_embed_title:
		"Помощь в настройке сообщения о вступлении через ЛС!",
	setjoindm_help_embed_desc:
		"{memberUsername} => Имя пользователя участника\n{memberMention} => Упомянуть участника\n{memberCount} => Количество участников в гильдии\n{guildName} => Название гильдии\n{createdAt} => Дата создания аккаунта в формате дд/мм/гггг\n{accountCreationTimestamp} => Метка времени создания аккаунта",
	setjoindm_buttom_set_name: "Установить сообщение",
	setjoindm_buttom_delete_name: "Удалить сообщение в ЛС",
	setjoindm_awaiting_response:
		"Напишите новое пользовательское сообщение о вступлении через ЛС в канале.",

	// /setjoinmessage
	setjoinmessage_not_admin:
		":x: | Для выполнения этой команды вы должны быть администратором этого сервера!",
	setjoinmessage_help_embed_title: "Помощь по команде setjoinmessage!",
	setjoinmessage_help_embed_description:
		"/setjoinmessage <Включить / Выключить / Показать установленное сообщение> <сообщение при входе>",
	setjoinmessage_help_embed_fields_name: "Как использовать?",
	setjoinmessage_help_embed_fields_value:
		"Используйте ```/setjoinmessage <Включить / Выключить / Показать установленное сообщение> <сообщение>```\n{user} = Имя участника\n{membercount} = Количество участников сервера\n{createdat} = Дата создания аккаунта участника\n{guild} = Название сервера\n{inviter} = Имя и дискриминатор пригласившего пользователя\n{invites} = Количество приглашений пользователя",
	setjoinmessage_logs_embed_title_on_enable:
		"Журнал установки сообщения при входе",
	setjoinmessage_logs_embed_description_on_enable:
		"<@${authorId}> установил сообщение при входе!",
	setjoinmessage_command_work_on_enable:
		"${emoji_GreenTick}  | Сообщение при входе успешно установлено.",
	setjoinmessage_logs_embed_title_on_disable:
		"Журнал отключения сообщения при входе",
	setjoinmessage_logs_embed_description_on_disable:
		"<@${authorId}> удалил сообщение при входе!",
	setjoinmessage_command_work_on_disable:
		"${emoji_Yes} | Сообщение при входе успешно удалено.",
	setjoinmessage_command_work_ls: "Сообщение при входе:",
	setjoinmessage_help_embed_fields_custom_name: "Пользовательское сообщение",
	setjoinmessage_help_embed_fields_custom_name_empy: "Не установлено!",
	setjoinmessage_help_embed_fields_default_name_empy: "Стандартное сообщение",
	setjoinmessage_help_embed_desc:
		"{memberUsername} => Имя пользователя участника\n{memberMention} => Упомянуть участника\n{inviterUsername} => Имя пользователя пригласившего\n{inviterMention} => Упомянуть пригласившего\n{memberCount} => Количество участников в гильдии\n{invitesCount} => Количество приглашений пригласившего\n{guildName} => Название гильдии\n{createdAt} => Дата создания аккаунта в формате дд/мм/гггг\n{accountCreationTimestamp} => Метка времени создания аккаунта",
	setjoinmessage_button_set_name: "Установить сообщение",
	setjoinmessage_buttom_del_name: "Стандартное сообщение",
	setjoinmessage_awaiting_response:
		"Написал новое сообщение о присоединении.",
	setjoinmessage_image_default_text:
		"Добро пожаловать {memberUsername} в {guildName}<br>Теперь нас {memberCount} в гильдии",
	setjoinmessage_change_image_button_title: "Изменить изображение",
	setjoinmessage_default_image_button_title: "Изображение по умолчанию",
	setjoinmessage_var_enable_image: "Включить изображение",
	setjoinmessage_var_disable_image: "Удалить изображение",
	setjoinmessage_var_image_card: "Карточка приветственного сообщения",
	setjoinmessage_change_image_propreties_background: "Изменить фон",
	setjoinmessage_change_image_propreties_frame_color:
		"Изменить цвет круглой рамки",
	setjoinmessage_change_image_propreties_text_colour: "Изменить цвет текста",
	setjoinmessage_change_image_propreties_text_message:
		"Изменить текстовое сообщение",
	setjoinmessage_change_image_propreties_text_size: "Изменить размер текста",
	setjoinmessage_change_image_propreties_avatar_size:
		"Изменить размер аватара",
	setjoinmessage_modal_fields_background_url: "URL фонового изображения",
	setjoinmessage_change_image_menu_frame_color_profil:
		"На основе цвета профиля пользователя",
	setjoinmessage_change_image_menu_frame_status_profil:
		"На основе статуса пользователя",
	setjoinmessage_modal_fields_hex_color: "цвет www.color-hex.com",
	setjoinmessage_modal_fields_message: "сообщение, которое вы хотите",
	setjoinmessage_var_text_size: "Размер текста: ",
	setjoinmessage_var_avatar_size: "Размер аватара: ",
	setjoinmessage_change_image_invalid_url:
		"Недействительный URL-адрес изображения. Попробуйте другой источник изображений.",

	// /setjoinroles
	setjoinroles_var_none: "Нет",
	setjoinroles_var_perm_admin: "Администратор",
	setjoinroles_var_perm_manage_guild: "Управление сервером",
	setjoinroles_var_perm_manage_role: "Управление ролями",
	setjoinroles_var_perm_use_mention:
		"Использование @everyone @here и упоминание ролей",
	setjoinroles_var_perm_ban_members: "Бан участников",
	setjoinroles_var_perm_kick_members: "Исключение участников",
	setjoinroles_var_perm_manage_webhooks: "Управление вебхуками",
	setjoinroles_var_perm_manage_channels: "Управление каналами",
	setjoinroles_var_perm_manage_expression:
		"Управление эмодзи, стикерами и звуковыми досками",
	setjoinroles_var_perm_view_monetization_analytics:
		"Просмотр монетизации и аналитики создателя",
	setjoinroles_var_perm_issue: "У меня нет разрешения на управление ролями.",
	setjoinroles_var_timesup: "Время истекло для выбора роли.",
	setjoinroles_warn_dangerous_perm:
		"Следующие роли имеют опасные разрешения. Вы действительно хотите их назначить?",
	setjoinroles_warn_title: "Внимание!",
	setjoinroles_timesup_button: "Время вышло!",
	setjoinroles_action_canceled: "Действие отменено",
	setjoinroles_too_highter_roles:
		"Следующие роли имеют более высокую позицию, чем у меня.",
	setjoinroles_not_admin:
		":x: | Вы должны быть администратором этого сервера, чтобы использовать эту команду!",
	setjoinroles_help_embed_title: "Модуль ролей присоединения",
	setjoinroles_help_embed_description:
		"Вот все роли, которые я даю новому участнику.",
	setjoinroles_help_embed_fields_1_name: "Все зарегистрированные роли",
	setjoinroles_logs_embed_title_on_enable: "Логи ролей присоединения",
	setjoinroles_logs_embed_description_on_enable:
		"<@${authorId}> настроил роли присоединения!",
	setjoinroles_already_on_enable:
		"Роли присоединения уже настроены с этой ролью!",

	// /welcomer
	welcomer_panel_title: "Приветствие",
	welcomer_section_placeholder: "Выберите, что настроить",
	welcomer_section_channels: "Каналы",
	welcomer_embed_label: "Пользовательский эмбед",
	welcomer_text_label: "Текст",
	welcomer_embed_set_button: "Установить эмбед",
	welcomer_embed_remove_button: "Убрать эмбед",
	welcomer_embed_modal_title: "Установить эмбед",
	welcomer_embed_modal_label: "ID эмбеда (из конструктора эмбедов)",
	welcomer_embed_not_found:
		"Сохранённый эмбед с ID `${embed_id}` не найден. Сначала создайте его в конструкторе эмбедов.",
	welcomer_embed_set_ok:
		"Пользовательский эмбед `${embed_id}` теперь будет отправляться для этого события. Переменные вроде {memberMention} заменяются автоматически.",
	welcomer_embed_removed_ok:
		"Пользовательский эмбед убран. Возврат к стандартной карточке.",
	welcomer_text_enable_button: "Включить текст",
	welcomer_text_disable_button: "Выключить текст",
	welcomer_components_enable_button: "Включить Components",
	welcomer_components_disable_button: "Выключить Components",
	welcomer_render_mode_label: "Режим отображения",
	welcomer_render_mode_components: "Components (карточка)",
	welcomer_render_mode_simple: "Простое сообщение",

	// /setleavemessage
	setleavemessage_not_admin:
		":x: | Для выполнения этой команды вы должны быть администратором этого сервера!",
	setleavemessage_help_embed_title: "/setleavemessage Справка!",
	setleavemessage_help_embed_description:
		"/setleavemessage <Включить / Выключить / Показать установленное сообщение> <сообщение при выходе>",
	setleavemessage_help_embed_fields_name: "Как использовать?",
	setleavemessage_help_embed_fields_value:
		"Используйте ```/setleavemessage <Включить / Выключить / Показать установленное сообщение> <сообщение>```\n{user} = Имя участника\n{membercount} = Количество участников сервера\n{guild} = Название сервера",
	setleavemessage_logs_embed_title_on_enable:
		"Журнал установки сообщения при выходе",
	setleavemessage_logs_embed_description_on_enable:
		"<@${authorId}> установил сообщение при выходе!",
	setleavemessage_command_work_on_enable:
		"${emoji_Yes} | Успешно установлено пользовательское сообщение при выходе.",
	setleavemessage_logs_embed_title_on_disable:
		"Журнал отключения сообщения при выходе",
	setleavemessage_logs_embed_description_on_disable:
		"<@${authorId}> удалил сообщение при выходе!",
	setleavemessage_command_work_on_disable:
		"${emoji_Yes} | Успешно удалено пользовательское сообщение при выходе.",
	setleavemessage_command_work_ls: "Сообщение при выходе:",
	setleavemessage_awaiting_response: "Напишите оставьте сообщение.",

	// /setup
	setup_not_admin:
		":x: | Для выполнения этой команды вы должны быть администратором этого сервера!",
	setup_command_work: "${emoji_Yes} | Настройка каналов",
	setup_command_error:
		"Бот уже настроил каналы для журналов! Или у бота нет разрешения...",

	// /setlogschannel
	setlogschannel_not_admin:
		":x: | Для выполнения этой команды вы должны быть администратором этого сервера!",
	setlogschannel_not_specified_args:
		"Вы должны указать допустимый канал для вашего модуля.",
	setlogschannel_confirmation_message:
		"${emoji_Yes} | Теперь `${typeOfLogs}` настроен, установлено пользователем <@${authorId}> !",
	setlogschannel_already_this_channel:
		"На этом сервере уже есть этот канал для журналов!",
	setlogschannel_already_deleted: "На этом сервере уже нет `SERVER_LOGS`!",
	setlogschannel_command_error: "Ошибка?",
	setlogschannel_command_work:
		"Вы успешно настроили `${typeOfLogs}` в <#${argsidId}> !",
	setlogschannel_utils_command_work:
		"Вы успешно настроили `${typeOfLogs}` в ${argsidId} !",
	setlogschannel_command_work_on_delete:
		"Вы успешно удалили все `SERVER_LOGS` в **${guildName}**",
	setlogschannel_logs_embed_title: "Настройка ServerLogs",
	setlogschannel_logs_embed_description_on_enable:
		"<@${authorId}> установил `${typeOfLogs}` на <#${argsidId}>",
	setlogschannel_logs_embed_title_on_off: "Настройка ServerLogs",
	setlogschannel_logs_embed_description_on_off:
		"<@${authorId}> удалил все `SERVER_LOGS` на сервере!",
	setlogschannel_var_roles: "Журналы ролей",
	setlogschannel_var_mods: "Журналы модерации",
	setlogschannel_var_voice: "Журналы голоса",
	setlogschannel_var_msg: "Журналы сообщений",
	setlogschannel_var_boost: "Журналы Повышений",
	setlogschannel_var_tickets: "Журналы заявок",
	setlogschannel_var_antispam: "Журналы AntiSpam",
	setlogschannel_var_channel: "Журналы канала",
	setlogschannel_var_confession: "Журналы признаний",
	setlogschannel_all_already_exist: "Все каналы логов уже настроены!",
	setlogschannel_var_economy: "Журналы экономики",

	// /join-ghostping add
	joinghostping_add_already_set: "Канал ${channel} уже установлен!",
	joinghostping_add_sent_to_channel:
		"Теперь, когда участник присоединяется к серверу, я отправлю призрачное сообщение **сюда**.",
	joinghostping_add_ok_embed_title: "Модуль Join GhostPing",
	joinghostping_add_ok_embed_desc:
		"Теперь, когда участник присоединяется к серверу, я буду отправлять призрачное сообщение в этот канал!",
	joinghostping_add_ok_embed_fields_name: "Все зарегистрированные каналы",
	joinghostping_add_logs_embed_title: "Журналы Join GhostPing",
	joinghostping_add_logs_embed_desc:
		"${author} добавил ${channel} в модуль Join GhostPing!",

	// /join-ghostping remove
	joinghostping_remove_isnt_set: "Канал ${channel} не установлен!",
	joinghostping_remove_ok_embed_desc:
		"Каналы были удалены из модуля Join GhostPing!",
	joinghostping_remove_logs_embed_desc:
		"${author} удалил ${channel} из модуля Join GhostPing!",

	// /automod
	automod_panel_title: "Панель управления AutoMod",
	automod_panel_desc:
		"Настройте каждое правило AutoMod от iHorizon: включайте и выключайте их, задайте канал логов и выберите роли, которые могут обходить их.",
	automod_panel_overview_title: "Защищённые правила",
	automod_panel_select_placeholder: "Выберите правило для настройки",
	automod_panel_label_logs: "Канал логов",
	automod_panel_label_bypass: "Роли-исключения",
	automod_panel_label_mention_limit: "Лимит упоминаний",
	automod_panel_rule_spam_name: "Спам сообщениями",
	automod_panel_rule_spam_desc:
		"Блокирует флуд и повторяющиеся сообщения на сервере.",
	automod_panel_rule_mass_mention_name: "Массовые упоминания",
	automod_panel_rule_mass_mention_desc:
		"Блокирует сообщения со слишком большим количеством упоминаний.",
	automod_panel_rule_antipub_name: "Ссылки и реклама",
	automod_panel_rule_antipub_desc:
		"Блокирует рекламные ссылки, с безопасным списком разрешённых (GitHub, Tenor, YouTube, ...).",
	automod_panel_rule_media_name: "Приглашения Discord",
	automod_panel_rule_media_desc:
		"Блокирует ссылки-приглашения на серверы Discord в сообщениях.",
	automod_panel_rule_telegram_name: "Ссылки Telegram",
	automod_panel_rule_telegram_desc:
		"Блокирует ссылки Telegram (t.me, telegram.me, tg://...).",
	automod_panel_logs_placeholder:
		"Выберите канал, куда будут отправляться логи этого правила",
	automod_panel_bypass_placeholder: "Выберите роли, обходящие это правило",
	automod_panel_enable_button: "Включить",
	automod_panel_disable_button: "Выключить",
	automod_panel_back_button: "Назад",
	automod_panel_refresh_button: "Обновить",
	automod_panel_close_button: "Закрыть панель",
	automod_panel_rule_enabled: "Правило **${rule}** теперь включено!",
	automod_panel_rule_disabled: "Правило **${rule}** теперь выключено!",
	automod_panel_bypass_saved: "Роли-исключения для **${rule}** обновлены!",
	automod_panel_logs_saved:
		"Логи **${rule}** теперь отправляются в ${channel}.",
	automod_panel_logs_reset: "Канал логов для **${rule}** был удалён!",
	automod_panel_api_error:
		"Не удалось применить изменение. Убедитесь, что у меня есть разрешение `Управление сервером` и что стандартные правила AutoMod от Discord отключены, затем попробуйте снова.",

	// /guildconfig block too-new-account
	too_new_account_dont_specified_time_on_enable:
		"Вы не указали время. Для включения этого модуля требуется минимальный возраст аккаунта!",
	too_new_account_invalid_time_on_enable:
		"Введенное вами время недействительно! **Пример допустимого времени**: `3h; 30m; 4w; 4y` -> 3 часа; 30 минут; 4 недели; 4 года",
	too_new_account_logEmbed_title: "Модуль TooNewAccount",
	too_new_account_logEmbed_desc_on_enable:
		"${author} включил модуль TooNewAccount. Теперь аккаунтам должно быть не менее ${beautifulTime}, и если пользователь присоединится более `${maxJoin}` раз, он будет забанен.",
	too_new_account_command_work_on_enable:
		"${author}, новые участники, присоединившиеся к **${guildName}** с аккаунтами младше `${beautifulTime}`, будут удалены.",
	too_new_account_command_work_on_enable2:
		"\n-#  ${emoji_Sparkles} После того как аккаунт присоединится к серверу **`${maxJoin}`** раз, он будет забанен.",
	too_new_account_logEmbed_desc_on_disable: "${author} отключил модуль!",
	too_new_account_command_work_on_disable:
		"${author}, модуль успешно отключен. Даты создания новых аккаунтов участников больше не будут проверяться.",

	// /guildconfig set-bot footer-name
	guildconfig_setbot_footername_footer_too_long_msg:
		"Нижний колонтитул бота слишком длинный, его будет слишком некрасиво отображать.",
	guildconfig_setbot_footername_is_good:
		"Успешно изменено, все встраивания iHorizon будут использовать `${footerName}` как нижний колонтитул!",
	guildconfig_setbot_footername_is_reset:
		"Название нижнего колонтитула было удалено. Теперь все встраивания iHorizon будут использовать `имя бота`.",
	guildconfig_setbot_footername_not_found:
		"Название нижнего колонтитула не найдено. Пожалуйста, попробуйте снова!",

	// /guildconfig set-bot footer-pfp
	guildconfig_setbot_footeravatar_is_good:
		"Успешно изменено, все вставки iHorizon будут использовать `image` в качестве нижнего колонтитула!",
	guildconfig_setbot_footeravatar_incorect:
		"Файл не соответствует изображению. Пожалуйста, попробуйте снова с изображением.",
	guildconfig_setbot_footeravatar_is_reset:
		"Аватар нижнего колонтитула был удален. Теперь все встраивания iHorizon будут использовать `аватар бота`.",

	// /guildconfig set-bot prefix
	guildconfig_setbot_prefix_prefix_now_mention:
		"Префикс бота для команд теперь упоминание! `@Ping-Me`",
	guildconfig_setbot_prefix_prefix_specify_prefix:
		"Вам нужно указать префикс бота.",
	guildconfig_setbot_prefix_prefix_too_long:
		"Префикс бота слишком длинный, его будет слишком трудно использовать.",
	guildconfig_setbot_prefix_prefix_is_good:
		"Префикс бота успешно изменен, теперь команды можно использовать с: `${formatedPrefix}`.",

	// /guildconfig config save
	guildconfig_config_save_check_dm:
		"Пожалуйста, проверьте свои личные сообщения. Если вы не получили сообщение, убедитесь, что принимаете личные сообщения.",
	guildconfig_config_save_user_msg:
		"Это резервная копия настроек `${guildName}`!",
	guildconfig_config_save_user_msg_2:
		"Вот ссылка для загрузки резервной копии сервера!\n",

	// /guildconfig config restore
	guildconfig_config_restore_err_msg: "Произошла ошибка при загрузке файла.",
	guildconfig_config_restore_msg: "Данные были сохранены в моей базе данных.",
	guildconfig_config_restore_wrong_guild:
		"Эта резервная копия не принадлежит этому серверу или недействительна, поэтому она не была восстановлена.",

	// /perm add
	perm_add_args_error:
		"Вы не указали команды для изменения или разрешение для установки.",

	// /perm list
	perm_list_embed_title: "Разрешения всех пользователей:",
	perm_list_unknown_user: "Неизвестный пользователь (ID: ${userId})",
	perm_list_no_user: "Пользователь не найден",
	var_command: "Команда",
	var_subcommand: "Подкоманда",
	var_subcommand_group: "Группа подкоманд",
	var_unreachable_command: "Команда не найдена",
	perm_list_no_command_set:
		"В этом сервере нет команд с установленными конкретными разрешениями!",

	// /perm set
	perm_set_deleted: "${user} имеет разрешение **удалено**!",
	perm_set_ok: "${user} изменил свое разрешение на **`${perm}`**",
	perm_set_warn_message:
		"${author}, вы не можете назначить разрешения выше или равные вашим!",
	perm_set_chng_perm_lvl: "Уровень разрешений изменен",
	perm_set_add_role: "Роль добавлена",
	perm_set_add_usr: "Пользователь добавлен",
	perm_rmv_role: "Роль удалена",
	perm_rmv_usr: "Пользователь удален",
	perm_set_command_reset: "Эта команда была сброшена",
	perm_set_no_modified: "Разрешения не изменены",
	perm_command_delete_dont_exist:
		"Для указанной команды не установлены права доступа.",
	perm_command_delete_command_deleted:
		"Удалены права доступа для команды: `${commands}`",
	perm_command_delete_specify_command:
		"Вам необходимо указать команду для удаления её прав доступа.",
	perm_command_delete_all_one:
		"Вам необходимо указать один параметр для удаления права доступа.",
	perm_command_delete_all_one_option:
		"Вы можете указать только один параметр для удаления права доступа.",
	perm_command_delete_all_zero_change:
		"Указанный вами тип прав доступа не использовался ни в одной команде.",
	perm_command_delete_all_command_ok:
		"\nУспешно удалено **${changeCount}** вложенных прав доступа типа `${type}` (${value}) из базы данных.",
	commandlimit_current_value: "${count} use(s) per ${time}",
	commandlimit_invalid_value:
		"Указанные значения лимита команды недопустимы.",
	commandlimit_missing_command: "Необходимо указать команду.",
	commandlimit_set_success:
		"Лимит для `${command}` установлен на `${limit}`.",
	commandlimit_reset_success: "Лимит для `${command}` сброшен.",
	commandlimit_reset_missing: "Для `${command}` лимит не настроен.",
	commandlimit_list_title: "Настроенные лимиты команд",
	commandlimit_list_item: "- `${command}`: ${limit}",
	commandlimit_list_empty:
		"На этом сервере не настроен ни один лимит команд.",
	commandlimit_rate_limited:
		"Вы достигли лимита для этой команды. Повторите попытку через ${time}.",

	// /perm roles
	perm_roles_created_role: "Созданы следующие роли: ${roles}",
	perm_roles_already_upate: "Все роли уже существуют и актуальны.",
	perm_roles_error: "Произошла ошибка при создании или обновлении ролей.",
	perm_roles_not_owner:
		"Только владелец сервера может добавлять роли уровня разрешений.",

	// /perm edit-roles
	perm_edit_roles_command_ok:
		"Разрешение ${permName} было изменено на роль ${strRole}",

	// /toggle-react
	toggle_react_command_work:
		"<@${authorId}>, теперь, когда участник отправляет приветственное сообщение, бот **{activeMsg}**",
	toggle_react_doesnt_react: "больше не будет реагировать",
	toggle_react_react: "будет реагировать",

	// /remove-react
	remove_react_command_work:
		"<@${authorId}>, теперь, когда участник отправляет `${message}`, бот **больше не будет реагировать**.",

	// /add-react
	add_react_command_err_emojis:
		"Эмодзи `{emoji}` для реакции недействителен!",
	add_react_command_err_message:
		"Необходимо указать сообщение, которое будет вызывать реакцию!",
	add_react_command_bad_word:
		"Это слово нельзя использовать для автоматической реакции: оно не должно содержать точку.",
	add_react_command_work:
		"<@${authorId}>, теперь, когда участник отправляет `${message}`, бот **будет реагировать** с {emoji}",

	// /list-react
	list_react_nothing_found: "Данные не найдены, сначала добавьте их.",
	list_react_embed_msg:
		"Когда кто-то отправляет **`${key}`**, я **реагирую** с ${value}\n",

	// /autoreact
	autoreact_embed_title: "Настройка Авто-Реакции",
	autoreact_embed_desc:
		"Когда в указанном канале отправляется новое сообщение, бот реагирует заданными эмодзи.",
	autoreact_embed_autofields_value: "Реакция: ${reaction}",
	autoreact_embed_autofields_none_value: "Авто-реакция не настроена.",
	autoreact_embed_footer:
		"Страница ${currentPage} из ${totalPage} • Всего Реакций: ${totalReact}",
	autoreact_btn_add_name: "Добавить канал",
	autoreact_btn_remove_name: "Удалить канал",
	autoreact_max_25: "Можно настроить максимум 25 авто-реакций.",
	autoreact_menu_add_place: "Выберите канал для добавления",
	autoreact_awaiting1_msg:
		"Выберите канал для добавления в модуль авто-реакции.",
	autoreact_modal_title: "Настройка Авто-Реакции",
	autoreact_modal_fields1_label: "Реакция (эмодзи)",
	autoreact_invalid_emoji:
		"Недопустимое эмодзи. Пожалуйста, введите правильное эмодзи.",
	autoreact_add_command_ok: "Авто-реакция успешно настроена.",
	autoreact_remove_not_found: "Авто-реакции не настроены.",
	autoreact_menu_remove_place: "Выберите канал для удаления",
	autoreact_awaiting_remove_msg:
		"Выберите канал для удаления из модуля авто-реакции.",
	autoreact_remove_command_ok:
		"Настройка авто-реакции для этого канала была удалена.",

	// Commandes de décompte des membres
	// /setmembercount

	// /setmembercount
	setmembercount_not_admin:
		":x: | Вы должны быть администратором этого сервера, чтобы использовать эту команду!",
	setmembercount_helpembed_title: "Помощь по установке счетчика участников!",
	setmembercount_helpembed_description:
		"/membercount <Включить / Отключить> <Название канала>",
	setmembercount_helpembed_fields_name: "Как это использовать?",
	setmembercount_helpembed_fields_value:
		"{MemberCount} = количество участников на сервере\n{RolesCount} = количество ролей\n{BotCount} = количество ботов на сервере\n{ChannelCount} = количество каналов на сервере\n{BoostCount} = количество бустов на сервере\n{VoiceCount} = общее количество участников в голосовых каналах на сервере\n{OnlineCount} = общее количество участников онлайн на сервере",
	setmembercount_logs_embed_title_on_enable:
		"Журнал установки счетчика участников",
	setmembercount_logs_embed_description_on_enable:
		"<@${authorId}> установил счетчик участников на <#${channelId}> в `${messagei}`!",
	setmembercount_command_work_on_enable:
		"${emoji_Yes} | Успешно установлен счетчик участников.",
	setmembercount_command_work_on_disable:
		"${emoji_Yes} | Успешно удален счетчик участников.",
	setmembercount_logs_embed_title_on_disable:
		"Журнал удаления счетчика участников",
	setmembercount_logs_embed_description_on_disable:
		"<@${authorId}> удалил счетчик участников с этого сервера!",

	// Команды музыки
	// /p, /loop, /nowplaying, /pause, /resume, /skip, /stop, /queue, /shuffle

	music_cannot:
		"${emoji_No} Вы должны находиться в том же голосовом канале, что и я, чтобы использовать эту команду!",

	// /p
	p_not_in_voice_channel:
		"Вы должны находиться в голосовом канале, чтобы использовать эту команду!",
	p_embed_title: "Нет результатов",
	p_not_allowed:
		"Ссылка, которую вы отправили, не поддерживается этим ботом. Пожалуйста, используйте авторизованные музыкальные сервисы, такие как Deezer, Spotify, Soundcloud и т. д.",
	p_attachment_too_large:
		"${emoji_No} Прикреплённый файл превышает лимит в 10 МБ и не может быть прочитан.",

	// /loop
	loop_no_queue: "Очереди нет!",
	loop_command_work: "{mode} | Обновлен режим повторения",

	// /nowplaying
	nowplaying_no_queue: "Сейчас ничего не играет",
	nowplaying_message_embed_title: "Сейчас играет",
	nowplaying_resume_button: "${author} **возобновил(а)** музыку!",
	nowplaying_pause_button: "${author} **поставил(а) на паузу** музыку!",
	nowplaying_lyrics_button: "Тексты для этой песни не найдены",
	nowplaying_stop_buttom: "${author} **остановил(а)** музыку!",
	nowplaying_header: "Сейчас играет в ${channel}",
	nowplaying_requested_by: "Запросил(а) ${user}",
	nowplaying_paused: "На паузе",
	nowplaying_live: "Прямой эфир",
	nowplaying_volume: "Громкость ${volume}%",
	nowplaying_loop_off: "Повтор выключен",
	nowplaying_loop_track: "Повтор трека",
	nowplaying_loop_queue: "Повтор очереди",
	nowplaying_queue_count: "В очереди: ${count}",
	nowplaying_up_next: "Далее: ${track}",
	nowplaying_queue_end: "Последний трек в очереди",
	nowplaying_ended: "Этот трек больше не воспроизводится.",
	nowplaying_button_pause: "Пауза",
	nowplaying_button_resume: "Продолжить",
	nowplaying_button_skip: "Пропустить",
	nowplaying_button_stop: "Стоп",
	nowplaying_button_lyrics: "Текст",
	nowplaying_button_open: "Открыть",
	nowplaying_skip_button: "${author} **пропустил(а)** трек!",
	nowplaying_loop_button: "${author} изменил(а) режим повтора: **${mode}**",

	// /pause
	pause_no_queue:
		"${emoji_Warning_Icon} - Вы не находитесь в голосовом канале!",
	pause_nothing_playing: "Сейчас ничего не играет",
	pause_var_paused: "пауза",
	pause_var_err: "что-то пошло не так",

	// /resume
	resume_nothing_playing: "Сейчас ничего не играет",
	resume_command_work: "Успешно возобновлено",

	// /skip
	skip_not_in_voice_channel:
		"${emoji_Warning_Icon} - Вы не находитесь в голосовом канале!",
	skip_nothing_playing: "Сейчас ничего не играет",
	skip_command_work: "Пропущено {queue}",

	// /stop
	stop_nothing_playing: "ничего не играет",
	stop_command_work: "Очередь остановлена",

	// /queue
	queue_iam_not_voicec: "Я не нахожусь в голосовом канале",
	queue_no_queue: "Очереди нет",
	queue_title: "Очередь",
	queue_time_left: "осталось ${duration}",
	queue_now_playing: "Сейчас играет",
	queue_up_next: "Далее",
	queue_page: "Страница ${page}/${pages}",
	queue_button_shuffle: "Перемешать",
	queue_button_refresh: "Обновить",
	queue_jump_placeholder: "Перейти к треку…",
	queue_shuffled: "${author} **перемешал(а)** очередь!",
	queue_jumped: "${author} перешёл(ла) к ${track}!",

	// /shuffle
	shuffle_no_queue: "Я не нахожусь в голосовом канале",
	shuffle_no_enought: "Недостаточно треков в очереди для перемешивания",
	shuffle_command_work: "Я **перемешал** очередь",

	// /music history
	history_no_entries: "В этом конкурсе нет записей.",
	history_title: "Недавно играло на ${guild}",
	history_summary:
		"Треков: ${count}, музыки: ${duration} за последние 30 дней",
	history_top_artist: "Самый частый исполнитель: **${artist}** (${count})",
	history_top_listener: "Больше всего заказов: ${user} (${count})",
	history_legacy_note:
		"Записано до того, как начали сохраняться детали треков:",
	history_page: "Страница ${page} из ${pages}",
	history_kept: "Хранится 30 дней",
	history_button_previous: "Назад",
	history_button_next: "Вперёд",
	history_button_export: "Экспорт",
	history_button_clear: "Очистить",
	history_clear_confirm:
		"${emoji} Очистить всю музыкальную историю этого сервера? Это нельзя отменить.",
	history_button_confirm_clear: "Очистить историю",
	history_button_cancel: "Отмена",
	history_cleared: "${emoji} Музыкальная история этого сервера очищена.",
	history_clear_forbidden:
		"${emoji} Чтобы очистить историю, нужно право «Управлять сервером».",
	history_not_yours:
		"${emoji} Эти кнопки принадлежат тому, кто открыл эту историю. Используйте /music history, чтобы открыть свою.",
	history_export_ready: "${emoji} Полная история, сначала новые:",

	// /music lyrics
	lyrics_embed_title_unknown: "Неизвестный заголовок",
	lyrics_embed_author_name_unknown: "Неизвестный автор",
	lyrics_not_found: "Тексты не найдены",

	// /music clear-queue
	clear_queue_command_ok:
		"${emoji_Security} | Музыкальная очередь на этом Discord-сервере была очищена.",

	// /music trackinfo
	music_lyrics: "Тексты",

	music_volume_command_ok:
		"${emoji_Yes} **громкость установлена на** `${query}`%",

	// /music apo
	music_apo_download_failed:
		"${emoji_No} | Не удалось скачать файл, попробуйте ещё раз.",
	music_apo_no_node: "${emoji_No} | Сейчас нет подключённого аудиоузла.",
	music_apo_unsupported:
		"${emoji_No} | Этот аудиоузел не поддерживает APO-фильтры (нужен Wavyzon с плагином `apo`).",
	music_apo_invalid:
		"${emoji_No} | Аудиоузел отклонил эту конфигурацию: `${error}`",
	music_apo_warnings: "Пропущенные строки (${count}):",

	// Команды раздачи призов
	// /end, /start, /reroll

	// /end
	end_not_admin:
		"У вас должны быть разрешения на управление сообщениями, чтобы завершить эту раздачу призов.",
	end_not_find_giveaway: "Не удалось найти раздачу для `${gw}`.",
	end_confirmation_message:
		"Раздача завершится менее чем через (${timeEstimate}) секунд...",
	end_logs_embed_title: "Журналы раздачи призов",
	end_logs_embed_description:
		"<@${authorId}> завершил раздачи с этим идентификатором: ${messageId}",
	end_command_error: "Эта раздача уже завершена!",

	// /start
	start_not_perm:
		"У вас должны быть разрешения на управление сообщениями, чтобы начать раздачу призов.",
	start_is_not_valid: "Вы должны указать допустимое количество победителей!",
	start_confirmation_command: "Раздача началась в ${giveawayChannel}!",
	start_logs_embed_title: "Журналы раздачи призов",
	start_logs_embed_description:
		"<@${authorId}> начал раздачу в: ${giveawayChannel}",
	start_time_not_valid:
		"${author}, указанное вами время раздачи недействительно, пожалуйста, попробуйте снова!",
	start_invalid_invites_req_value:
		"${emoji_No} | Значение для 'приглашений' недействительно! Укажите количество приглашений для участия в розыгрыше!",
	start_invalid_messages_req_value:
		"${emoji_No} | Значение для 'сообщений' недействительно! Укажите количество сообщений для участия в розыгрыше!",
	start_invalid_roles_req_value:
		"${emoji_No} | Роль для значения 'roles' не найдена! Укажите ID роли для участия в розыгрыше!",

	// /reroll
	reroll_not_perm:
		"У вас должны быть разрешения на управление сообщениями, чтобы перезапустить эту раздачу призов.",
	reroll_dont_find_giveaway: "Не удалось найти раздачу для `{args}` .",
	reroll_command_work: "Раздача призов перезапущена!",
	reroll_logs_embed_title: "Журналы раздачи призов",
	reroll_logs_embed_description:
		"<@${authorId}> перезапустил раздачу с этим идентификатором: ${messageId}",
	reroll_command_error: "Error !",
	reroll_giveaway_not_over: "Этая раздача еще не завершена!",

	// /get-all
	gw_getall_embed_title: "Список розыгрышей для ${guildName}",
	gw_getall_embed_fields:
		"${Channel} [Смотреть здесь](${MessageURL}) \n**Истекает через** ${ExpireIn}",

	// /get-data
	gw_getdata_embed_title: "Информация о розыгрыше!",
	gw_getdata_embed_fields_channel: "Канал",
	gw_getdata_embed_fields_amountWinner: "Количество победителей",
	gw_getdata_embed_fields_value_amountWinner:
		"`${winnerCount}` победителя(ей)",
	gw_getdata_embed_fields_prize: "Приз",
	gw_getdata_embed_fields_value_prize: "`${prize}`",
	gw_getdata_embed_fields_hostedBy: "Организатор",
	gw_getdata_embed_fields_isEnded: "Завершено?",
	gw_getdata_embed_fields_isValid: "Действителен?",
	gw_getdata_embed_fields_time: "Заканчивается в",
	gw_getdata_embed_fields_entriesAmount: "Количество участников",
	gw_getdata_embed_fields_winners: "Победитель(и)",
	gw_getdata_embed_fields_value_entriesAmount:
		"**${entries}** (используйте `/gw list-entries giveaway-id:${giveawayId}` для получения дополнительной информации)",
	gw_getdata_yes: "`Да`",
	gw_getdata_no: "`Нет`",
	gw_doesnt_exit: "Подарки недоступны или не существуют.",

	// /go
	gw_go_panel_title: "Панель розыгрышей",
	gw_go_panel_desc:
		"Настройте розыгрыш ниже и запустите его. Используйте меню для изменения параметров.",
	gw_go_select_placeholder: "Изменить параметр",
	gw_go_opt_prize: "Приз",
	gw_go_opt_duration: "Длительность",
	gw_go_opt_winners: "Победители",
	gw_go_opt_requirement: "Условие участия",
	gw_go_opt_image: "Изображение",
	gw_go_channel_placeholder: "Канал розыгрыша",
	gw_go_launch_buttontitle: "Запустить",
	gw_go_cancel_buttontitle: "Отмена",
	gw_go_req_none: "Нет",
	gw_go_req_invites: "Приглашения",
	gw_go_req_messages: "Сообщения",
	gw_go_req_roles: "Роли",
	gw_go_req_value_dsc: "Требуемое значение: **${value}**",
	gw_go_started: "Розыгрыш запущен в ${channel}!",
	gw_go_cancelled: "Панель закрыта, розыгрыш не был запущен.",
	gw_go_expired: "Панель завершила работу до запуска розыгрыша.",
	gw_go_need_prize:
		"${emoji_No} | Перед запуском розыгрыша необходимо указать приз!",
	gw_go_need_duration:
		"${emoji_No} | Перед запуском розыгрыша необходимо указать действительную длительность!",
	gw_go_need_winners:
		"${emoji_No} | Перед запуском розыгрыша необходимо указать действительное число победителей!",
	gw_go_channel_error:
		"${emoji_No} | В выбранный канал нельзя отправлять сообщения!",
	gw_go_invalid_image: "${emoji_No} | Ссылка на изображение недействительна!",
	gw_go_modal_prize: "Указать приз",
	gw_go_modal_prize_label: "Приз",
	gw_go_modal_duration: "Указать длительность",
	gw_go_modal_duration_label: "Длительность (например: 2d или 12h30)",
	gw_go_modal_winners: "Указать число победителей",
	gw_go_modal_winners_label: "Количество победителей",
	gw_go_modal_req_title: "Условие участия",
	gw_go_modal_req_type_label: "Тип условия",
	gw_go_modal_req_value_label: "Значение условия (ID роли или число)",
	gw_go_modal_image: "Указать изображение",
	gw_go_modal_image_label: "Ссылка на изображение",

	// Команды модерации
	// /ban, /kick, /clear, /lock, /unlock, /avatar, /lockall,
	// /unban, /tempmute, /unmute

	// /avatar

	// /ban
	ban_not_permission: "${emoji_No} | У вас нет разрешения на бан участников.",
	ban_dont_found_member: "🔍 | Не удалось найти этого участника",
	ban_dont_have_perm_myself:
		"${emoji_No} | У меня нет разрешения на бан участников!",
	ban_try_to_ban_yourself: "${emoji_No} | Вы не можете забанить сами себя!",
	ban_attempt_ban_higter_member:
		"${emoji_Stop} Вы не можете забанить пользователя с более высокой ролью, чем у вас...",
	ban_cant_ban_member: "${emoji_No} | Я не могу забанить этого участника",
	ban_message_to_the_banned_member:
		"Вы были забанены на этом сервере: `${guildName}` по причине: **`${reason}`**",
	ban_command_work: "<@${memberId}> забанен пользователем <@${authorId}>",
	ban_logs_embed_title: "Логи банов",
	ban_logs_embed_description:
		"<@${memberId}> забанен пользователем <@${authorId}>",

	// /kick
	kick_not_permission:
		"${emoji_No} | У вас нет разрешения на кик участников.",
	kick_dont_have_permission:
		"${emoji_No} | У меня нет разрешения на кик участников!",
	kick_attempt_kick_your_self:
		"${emoji_No} | Вы не можете выгнать сами себя!",
	kick_attempt_kick_higter_member:
		"${emoji_Stop} Вы не можете выгнать пользователя с более высокой ролью, чем у вас...",
	kick_message_to_the_banned_member:
		"Вы были выгнаны с этого сервера: **${guildName}** пользователем `${authorUsername}`",
	kick_command_work: "${member} был выгнан пользователем ${author}",
	kick_logs_embed_title: "Логи киков",
	kick_logs_embed_description:
		"${member} был выгнан пользователем <@${authorId}>",

	// /clear
	clear_dont_have_permission:
		"${emoji_No} | У вас нет разрешения `MANAGE_MESSAGES`.",
	clear_max_message_limit:
		"${emoji_No} | Я не могу удалить более 99 сообщений за один раз!",
	clear_channel_message_deleted: "Удалено ${messageCount} сообщений!",
	clear_confirmation_message: "${messageCount} сообщений было удалено!",
	clear_logs_embed_title: "Логи удаления сообщений",
	clear_logs_embed_description:
		"<@${authorId}> удалил ${messageCount} сообщений в <#${channelId}>",
	clear_command_no_message: "Нет сообщений для удаления в этом канале",

	// /lock
	lock_embed_message_description:
		"Канал заблокирован пользователем <@${authorId}>.",
	lock_dont_have_permission:
		"${emoji_No} | У вас нет разрешения на блокировку каналов.",
	lock_logs_embed_title: "Логи блокировки каналов",
	lock_logs_embed_description:
		"<@${authorId}> заблокировал канал <#${channelId}>",

	// /unlock
	unlock_embed_message_description: "Канал успешно разблокирован!",
	unlock_dont_have_permission:
		"${emoji_No} | У вас нет разрешения на разблокировку канала.",
	unlock_logs_embed_title: "Логи разблокировки каналов",
	unlock_logs_embed_description:
		"<@${authorId}> разблокировал канал <#${channelId}>",

	// /lockall
	lockall_dont_have_permission:
		"${emoji_No} | У вас нет разрешения на блокировку всех каналов.",
	lockall_embed_message_description:
		"Все каналы заблокированы пользователем <@${authorId}>.",
	lockall_logs_embed_title: "Логи блокировки всех каналов",
	lockall_logs_embed_description: "<@${authorId}> заблокировал все каналы!",

	// /unlockall
	unlockall_embed_message_description:
		"Все каналы были разблокированы пользователем <@${authorId}>.",
	unlockall_logs_embed_title: "Логи разблокировки всех каналов",
	unlockall_logs_embed_description:
		"<@${authorId}> разблокировал все каналы!",

	// /unban
	unban_dont_have_permission:
		"${emoji_No} | У вас нет разрешения на разбан участников.",
	unban_bot_dont_have_permission: "${emoji_No} | У меня нет разрешения.",
	unban_there_is_nobody_banned:
		"${emoji_No} | **На этом сервере нет забаненных участников!**",
	unban_the_member_is_not_banned:
		"${emoji_No} | **Указанный ID не забанен на этом сервере**!",
	unban_is_now_unbanned: "<@${userID}> теперь разбанен на этом сервере!",
	unban_logs_embed_title: "Логи разбанов",
	unban_logs_embed_description:
		"<@${userID}> теперь разбанен на сервере пользователем <@${authorId}>!",
	unban_reason: "Причина не указана.",

	// /tempmute
	tempmute_dont_have_permission:
		"${emoji_No} | У вас нет разрешения на временную блокировку участников.",
	tempmute_i_dont_have_permission: "${emoji_No} | У меня нет разрешения.",
	tempmute_cannot_mute_yourself:
		"${emoji_No} | Вы не можете временно заблокировать сами себя!",
	tempmute_already_muted: "Этот пользователь уже заблокирован!",
	tempmute_command_work:
		"<@${tomuteId}> был замучен на ${duration}\n**Причина**: `${reason}`",
	tempmute_unmuted_by_time: "<@${tomuteId}> был разблокирован!",
	tempmute_logs_embed_title: "Логи временной блокировки",
	tempmute_logs_embed_description:
		"<@${authorId}> замутил <@${tomuteId}> на ${duration}\n**Причина**: `${reason}`",
	tempmute_reason_create_roles: "Создана роль для временной блокировки!",
	tempmute_tomute_is_admin:
		"${emoji_No} | У пользователя есть права администратора, я не могу его замьютить.",
	tempmute_tomute_highest_role_or_same:
		"${emoji_No} | **Моя роль на этом сервере ниже или равна ${tomute}. Я не могу модерировать этого участника.**",
	tempmute_cannot_mute_higher_role:
		"${emoji_No} | **${tomute}'s role is higher than or equal to yours. You cannot timeout this member.**",
	tempmute_tomute_max_time_passed:
		"\n-# ${emoji_VC_OpenChat} В Discord действует ограничение в 28 дней для мута. Я применил 28 дней.",

	// /temprole
	temprole_dont_have_permission:
		"${emoji_No} | У вас нет прав для добавления временных ролей участникам.",
	temprole_i_dont_have_permission: "${emoji_No} | У меня нет прав.",
	temprole_cannot_add_yourself:
		"${emoji_No} | Вы не можете выдать временную роль самому себе!",
	temprole_already_has_role:
		"У этого пользователя уже есть эта временная роль!",
	temprole_command_work:
		"<@${tomuteId}> получил роль на ${duration}\n**Причина**: `${reason}`",
	temprole_removed_by_time: "Временная роль <@${tomuteId}> была удалена!",
	temprole_logs_embed_title: "Логи временных ролей",
	temprole_logs_embed_description:
		"<@${authorId}> выдал временную роль <@${tomuteId}> на ${duration}\n**Причина**: `${reason}`",
	temprole_tomute_is_admin:
		"${emoji_No} | У пользователя есть права администратора, я не могу выдать ему временную роль.",
	temprole_tomute_highest_role_or_same:
		"${emoji_No} | **Моя роль на сервере ниже или равна роли ${tomute}. Я не могу модерировать этого участника.**",
	temprole_tomute_max_time_passed:
		"\n-# ${emoji_VC_OpenChat} Максимальное время для временной роли — 1 год. Я применил 1 год.",

	// /unmute
	unmute_dont_have_permission:
		"${emoji_No} | У вас нет разрешения на разблокировку участников.",
	unmute_attempt_mute_your_self:
		"${emoji_No} | Вы не можете разблокировать сами себя!",
	unmute_i_dont_have_permission: "${emoji_No} | У меня нет разрешения.",
	unmute_not_muted: "Этот пользователь не заблокирован!",
	unmute_muted_role_doesnt_exist:
		"Роль `muted` не существует. Пожалуйста, заблокируйте пользователя **перед** созданием ролей для блокировки...",
	unmute_command_work: "<@${tomuteId}> был разблокирован!",
	unmute_logs_embed_title: "Логи разблокировки",
	unmute_logs_embed_description:
		"<@${authorId}> разблокировал <@${tomuteId}>",
	unmuteall_no_muted_members: "Заглушенные участники не найдены.",
	unmuteall_audit_reason: "Снять заглушение со всех",
	unmuteall_command_work:
		"Снято заглушение с ${unmuted}/${total} участников.",
	unmuteall_logs_embed_title: "Логи массового снятия заглушения",
	unmuteall_logs_embed_description:
		"<@${authorId}> снял заглушение с ${unmuted}/${total} участников.",

	// /warn
	warn_command_work:
		"${emoji_Yes} ${member} получил предупреждение! **Причина**: `${reason}`\n__ID предупреждения__: `${warnId}`",
	warn_logEmbed_title: "Журнал предупреждений",
	warn_logEmbed_desc:
		"${author} выдал предупреждение ${member} за `${reason}`",
	warn_dont_have_permission:
		"${emoji_No} | У вас нет разрешения на предупреждение участника на этом сервере Discord.",

	// /unwarn
	unwarn_cannot_found:
		"${emoji_No} Похоже, у ${member} нет предупреждений в моей базе данных!",
	unwarn_cannot_found_id:
		"${emoji_No} ${member} предоставленный ID предупреждения отсутствует в моей базе данных",
	unwarn_logEmbed_title: "Журнал снятия предупреждений",
	unwarn_logEmbed_desc: "${author} снял предупреждение с ${member}",
	unwarn_dont_have_permission:
		"${emoji_No} | У вас нет разрешения на удаление предупреждения участника на этом сервере Discord.",

	// /clear-allwarns
	clear_allwarns_confirmation_message:
		"**Вы действительно уверены, что хотите удалить все данные предупреждений? Это действие необратимо и его нельзя отменить.** **Это действие разрушительно!!**",
	clear_allwarns_command_ok:
		"Все предупреждения на этом сервере Discord были удалены.",

	// /warnlist
	warnlist_no_data:
		"${emoji_No} Похоже, у ${member} нет предупреждений в моей базе данных!",
	warnlist_dont_have_permission:
		"${emoji_No} | У вас нет разрешения на управление предупреждениями участников на этом сервере Discord.",

	// /baninfo
	baninfo_not_banned: "Пользователь не заблокирован",
	baninfo_user_not_found: "Пользователь не найден",
	var_banned_by: "Заблокирован",
	var_ban_date: "Дата блокировки",

	// /очистить-предупреждения
	clearwarn_command_ok:
		"${emoji_Yes} ${author}, **`${allWarnCount}`** предупреждение(-я) участника ${member} удалено(-ы).",

	// /tempban
	tempban_dont_have_permission: "У вас нет прав временно банить участников.",
	tempban_i_dont_have_permission: "У меня нет прав банить участников.",
	tempban_cannot_ban_yourself: "Вы не можете забанить сами себя!",
	tempban_already_banned: "Этот пользователь уже временно забанен!",
	tempban_command_work:
		"**<@${userId}>** был временно забанен на **${duration}**\n**Причина**: `${reason}`",
	tempban_unbanned_by_time: "**<@${userId}>** был разбанен!",
	tempban_logs_embed_title: "Логи временного бана",
	tempban_logs_embed_description:
		"**<@${executorId}>** временно забанил **<@${userId}>** на **${duration}**\n**Причина**: `${reason}`",
	tempban_user_is_admin:
		"У пользователя есть права администратора, я не могу его забанить.",
	tempban_user_highest_role_or_same:
		"Моя роль на сервере ниже или равна роли **${user}**. Я не могу модерировать этого участника.",
	tempban_max_time_passed:
		"\n*Максимальный срок временного бана — 1 год. Я применил 1 год.*",
	tempban_user_not_in_guild:
		"Этот пользователь не находится на сервере, но его всё равно можно забанить.",

	// Команды резервного копирования
	// /backup

	// /backup
	backup_wait_please: "⏲ Подождите, пожалуйста...",
	backup_not_admin:
		":x: | Вы должны быть администратором сервера, чтобы запросить резервное копирование!",
	backup_i_dont_have_permission: "У меня нет разрешения `АДМИНИСТРАТОР`",
	backup_command_work_on_creation:
		":white_check_mark: Резервное копирование успешно создано.",
	backup_command_work_info_on_creation:
		"Резервная копия создана! ID: `${id}`!",
	backup_logs_embed_title_on_creation: "Логи резервного копирования",
	backup_logs_embed_description_on_creation:
		"<@${authorId}> Создано резервное копирование!",
	backup_dont_have_perm_on_load:
		":x: | Вы должны быть администратором сервера, чтобы загрузить резервное копирование!",
	backup_i_dont_have_perm_on_load: "У меня нет разрешения `АДМИНИСТРАТОР`",
	backup_unvalid_id_on_load:
		":x: | Вы должны указать действительный ID резервного копирования!",
	backup_waiting_on_load: "${emoji_Yes} - Загрузка...",
	backup_error_on_load:
		":x: | Извините, произошла ошибка... Пожалуйста, проверьте, что у меня есть права администратора!",
	backup_error_when_fetch_backup_on_load:
		":x: | Резервная копия не найдена для ${backupID}!",
	backup_this_is_not_your_backup:
		"${emoji_No} | Это не ваша резервная копия!",
	backup_backup_doesnt_exist: "Ошибка? Резервная копия не существует.",
	backup_string_see_v:
		":placard:・Количество категорий: `${categoryCount}`\n:hash:・Количество каналов: `${channelCount}`",
	backup_all_of_your_backup: "**Все ваши резервные копии:**",
	backup_string_see_another_v:
		":placard:・Количество категорий: `${categoryCount}`\n:hash:・Количество каналов: `${channelCount}`",
	backup_load_confirm:
		"${author},\n# ЧРЕЗВЫЧАЙНО ОПАСНОЕ ДЕЙСТВИЕ\n# Вы уверены, что хотите загрузить этот бэкап?\nЭто заменит все текущие каналы, роли, эмодзи, баны, настройки... вашего сервера.\nЭТО ДЕЙСТВИЕ НЕОБРАТИМО!",
	backup_not_load:
		"Резервная копия не была загружена, действие было отменено по вашему запросу.",

	// /backup delete
	backup_really_want:
		"${emoji_Warning_Icon} Вы действительно хотите удалить этот бэкап?",
	backup_confirm_button: "Да, удалить этот бэкап",
	backup_cancel_button: "Отменить действие",
	backup_embed_title_succefully_deleted: "${emoji_Yes} Бэкап успешно удален!",
	backup_embed_title_cancel_deletion: "${emoji_Yes} Бэкап сохранен!",
	backup_embed_title_timesup_deletion:
		"${emoji_No} Время вышло. Бэкап сохранен!",

	// /backup manage
	backup_manage_nique_tes_mort:
		"Доступ запрещен. Эта команда предназначена только для владельца сервера.\n# Вы не можете отключить защиту резервных копий, чтобы поставить под угрозу безопасность сервера.\n# Любая попытка злоупотребления будет зафиксирована и заблокирована.",
	backup_manage_admin: "все администраторы",
	backup_manage_owner: "владелец сервера",
	backup_manage_command_ok:
		"Модуль резервного копирования обновлён. Теперь ${allowed_user_string} может создавать и загружать резервные копии на этом сервере.",
	// /backup panels
	backup_component_settings: "Настройки сервера",
	backup_component_settings_desc:
		"Название, изображения, уровни, системные каналы, экран приветствия",
	backup_component_roles: "Роли",
	backup_component_roles_desc: "Порядок, цвета, значки и разрешения",
	backup_component_channels: "Каналы",
	backup_component_channels_desc:
		"Категории, текстовые и голосовые каналы, форумы и ветки",
	backup_component_permissions: "Разрешения каналов",
	backup_component_permissions_desc:
		"Переопределения для ролей и участников в каждом канале",
	backup_component_emojis: "Эмодзи",
	backup_component_emojis_desc: "Все пользовательские эмодзи сервера",
	backup_component_stickers: "Стикеры",
	backup_component_stickers_desc: "Статичные и анимированные стикеры сервера",
	backup_component_bans: "Баны",
	backup_component_bans_desc: "Забаненные пользователи и причины",
	backup_component_automod: "Правила AutoMod",
	backup_component_automod_desc: "Встроенные правила модерации Discord",
	backup_component_events: "События",
	backup_component_events_desc: "Запланированные события сервера",
	backup_component_messages: "Сообщения",
	backup_component_messages_desc: "Последние 100 сообщений каждого канала",
	backup_component_members: "Участники",
	backup_component_members_desc: "Никнеймы и роли текущих участников",
	backup_select_placeholder: "Выберите, что включить",
	backup_usage: "Использовано резервных копий: ${count}/${max}",
	backup_limit_reached:
		"Вы достигли лимита резервных копий: **${max}**. Сначала удалите одну с помощью `/backup delete`.",
	backup_busy:
		"Операция резервного копирования уже выполняется, повторите попытку чуть позже.",
	backup_panel_expired:
		"Срок действия этой панели истёк, выполните команду ещё раз.",
	backup_btn_create: "Создать резервную копию",
	backup_btn_all: "Выбрать всё",
	backup_btn_load: "Стереть и восстановить",
	backup_btn_schedule_save: "Сохранить расписание",
	backup_btn_schedule_disable: "Отключить",
	backup_create_title: "Новая резервная копия",
	backup_create_desc: "Выберите, что сохранить с сервера **${guildName}**.",
	backup_create_progress:
		"${emoji} Создание резервной копии, это может занять некоторое время...",
	backup_create_cancelled: "Резервное копирование отменено.",
	backup_create_failed:
		"Не удалось сохранить резервную копию. В ваш список ничего не добавлено.",
	backup_created_title: "Резервная копия создана",
	backup_created_desc:
		"ID вашей резервной копии: `${id}`. Используйте его с `/backup load`.",
	backup_created_partial:
		"**Не удалось сохранить, поэтому не будет восстановлено:** ${parts}",
	backup_load_title: "Восстановление резервной копии",
	backup_load_desc:
		"Резервная копия сервера **${guildName}**, создана ${date}.",
	backup_load_warning:
		"**Это действие необратимо.** Всё выбранное удаляется с этого сервера, а затем восстанавливается. Роли находятся по названию и обновляются, поэтому участники их сохраняют; роли, которых нет в резервной копии, удаляются только при восстановлении каналов.",
	backup_load_progress:
		"${emoji} Восстановление, это может занять несколько минут...",
	backup_load_done_title: "Резервная копия восстановлена",
	backup_load_done_desc: "Сервер **${guildName}** восстановлен.",
	backup_load_report_line: "${emoji} **${label}**: восстановлено ${okCount}",
	backup_load_report_failed: "(ошибок: ${failedCount})",
	backup_list_title: "Ваши резервные копии",
	backup_list_empty:
		"У вас пока нет резервных копий. Создайте её с помощью `/backup create`.",
	backup_list_entry:
		"**${guildName}** · ${mode} · ${date}\n`${id}`\nКатегорий: ${categoryCount}, каналов: ${channelCount}",
	backup_list_manual: "Вручную",
	backup_list_auto: "Автоматически",
	backup_delete_title: "Удалить эту резервную копию?",
	backup_delete_desc:
		"**${guildName}** `${id}`\nКатегорий: ${categoryCount}, каналов: ${channelCount}",
	backup_delete_done: "Резервная копия удалена.",
	backup_delete_cancelled: "Резервная копия сохранена.",
	backup_schedule_title: "Автоматические резервные копии",
	backup_schedule_desc:
		"Они сохраняются в вашем аккаунте и учитываются в вашем лимите. Хранятся только последние автоматические резервные копии этого сервера (${maxAuto}).",
	backup_schedule_owner_only:
		"Планировать автоматические резервные копии может только владелец сервера.",
	backup_schedule_status_on:
		"Активно: **${frequency}**, следующая резервная копия ${next}",
	backup_schedule_status_off:
		"Автоматическое резервное копирование не запланировано.",
	backup_schedule_frequency_placeholder: "Выберите периодичность",
	backup_frequency_1d: "Каждый день",
	backup_frequency_3d: "Каждые 3 дня",
	backup_frequency_1w: "Каждую неделю",
	backup_frequency_2w: "Каждые 2 недели",
	backup_frequency_1m: "Каждый месяц",
	backup_frequency_3m: "Каждые 3 месяца",
	backup_frequency_6m: "Каждые 6 месяцев",
	backup_frequency_12m: "Каждый год",
	backup_schedule_dm_limit:
		"Автоматическое резервное копирование сервера **${guildName}** пропущено: вы достигли лимита резервных копий (${max}). Удалите одну с помощью `/backup delete`.",
	backup_schedule_dm_failed:
		"Не удалось создать автоматическую резервную копию сервера **${guildName}**. Попытка будет повторена в следующее запланированное время.",

	// Реакции ролей
	// /reactionroles

	// /reactionroles
	reactionroles_dont_admin_added:
		":x: | Вы должны быть администратором сервера, чтобы запросить эту команду!",
	reactionroles_embed_message_description_added:
		"__как использовать?__\n/rolesreaction add `<ID сообщения>` `<реакция>` `<ID роли>`\n/rolesreaction remove `<ID сообщения>` `<реакция>`\n/rolesreaction list `<ID сообщения>`",
	reactionroles_missing_reaction_added: "Отсутствует аргумент: Emoji реакции",
	reactionroles_invalid_emote_format_added:
		"${emoji_No} | Вы не можете отправить мне `CUSTOM_EMOJI` в формате `<::xxx>`! Мне нужен только их ID!",
	reactionroles_logs_embed_title_added: "Логи реакций на роли",
	reactionroles_logs_embed_description_added:
		"<@${authorId}> установил реакцию на роли: Сообщение: `${messagei}` | Реакция: `${reaction}` | Роль: ${role}",
	reactionroles_command_work_added:
		"${reaction} была добавлена к сообщению ${messagei} для выдачи роли ${role}",
	reactionroles_missing_remove: "`Отсутствует аргумент: Emoji реакции",
	reactionroles_missing_reaction_remove:
		"Реакция на роли не найдена в моей базе данных...",
	reactionroles_cant_fetched_reaction_remove:
		"Не удается получить выбранную реакцию в этом сообщении!",
	reactionroles_logs_embed_title_remove: "Логи реакций на роли",
	reactionroles_logs_embed_description_remove:
		"<@${authorId}> удалил реакцию на роли: Сообщение: `${messagei}` | Реакция: `${reaction}`",
	reactionroles_command_work_remove:
		"${reaction} была удалена из сообщения ${messagei}",
	reactionroles_dont_message_found:
		"Я не могу получить сообщение с текущим ID сообщения, или выбранный вами эмодзи не находится на сервере, где я есть!",

	// /buttonreaction
	buttonreaction_logs_embed_title_added: "Журналы ButtonReaction",
	buttonreaction_logs_embed_description_added:
		"<@${authorId}> установил реакцию с помощью кнопки: Сообщение: `${messagei}` | Реакция: `${reaction}` | Роль: ${role}",
	buttonreaction_dont_message_found:
		"Не удалось добавить эту кнопку, похоже, роли уже установлены в одной из существующих кнопок!",
	buttonreaction_roles_not_found:
		"Недостаточно аргументов: вы не указали роли для установки!",
	buttonreaction_message_other_user_error:
		"В Discord бот не может изменять компоненты сообщения другого пользователя. Вам нужно выбрать сообщение, отправленное мной. Совет: используйте `/utils embed`, чтобы создать свой красивый embed!",

	// /roleselect
	roleselect_invalid_message_id:
		"Указан недопустимый идентификатор сообщения. Пожалуйста, введите действительный идентификатор.",
	roleselect_message_not_found: "Сообщение не найдено в указанном канале.",
	roleselect_default_placeholder: "Выберите настроенные роли",
	roleselect_menu1_placeholder: "Выберите действие",
	roleselect_menu1_add: "Добавить вариант роли",
	roleselect_menu1_remove: "Удалить вариант роли",
	roleselect_menu1_change_placeholder: "Изменить текст-заполнитель меню",
	roleselect_menu1_save: "Сохранить и применить конфигурацию",
	roleselect_menu1_cancel: "Отменить",
	roleselect_menu1_embed_title: "Настройка выбора роли",
	roleselect_menu1_embed_description:
		"Когда пользователь выбирает параметры в меню, ему будет назначена указанная роль.",
	roleselect_modal1_title: "Добавить вариант роли",
	roleselect_modal1_fields1_label: "Эмодзи",
	roleselect_modal1_fields1_placeholder:
		"Выберите эмодзи для этой роли (необязательно)",
	roleselect_modal1_fields2_label: "Название опции",
	roleselect_modal1_fields2_placeholder: "Краткое название для варианта роли",
	roleselect_modal1_fields3_label: "Описание",
	roleselect_modal1_fields3_placeholder:
		"Опишите вариант роли (необязательно)",
	roleselect_awaiting1_msg: "Выберите роль для этого варианта",
	roleselect_awaiting1_menu_placeholder: "Выберите роль",
	roleselect_role_already_exist: "Роль уже существует в конфигурации.",
	roleselect_no_role_found: "Нет ролей для удаления.",
	roleselect_all_role_removed: "Все варианты ролей удалены.",
	roleselect_last_role_removed: "Последний вариант роли успешно удален.",
	roleselect_save_command_ok: "Конфигурация выбора роли успешно сохранена!",
	roleselect_failed_to_save_config:
		"Не удалось сохранить конфигурацию. Попробуйте еще раз.",
	roleselect_canceled_command_ok: "Настройка выбора роли отменена.",
	roleselect_modal2_title: "Текст-заполнитель меню",
	roleselect_modal2_label: "Текст-заполнитель",
	roleselect_modal2_placeholder: "Текст-заполнитель меню выбора",

	// Команды новых функций
	// /punishpub, /report, /support

	// /punishpub
	punishpub_not_admin:
		":x: | Вы должны быть администратором сервера, чтобы использовать эти команды!",
	punishpub_too_hight_enable: "Ваша сумма слишком высока! Не рекомендуется!",
	punishpub_negative_number_enable:
		"Вы не можете вводить отрицательные числа!",
	punishpub_zero_number_enable: "Число 0 недопустимо!",
	punishpub_confirmation_message_enable:
		"Вы успешно **включили** PunishPub с максимальным количеством флагов **${amount}** и наказанием **${punishement}** !",
	punishpub_logs_embed_title: "Логи PunishPub",
	punishpub_logs_embed_description:
		"<@${authorId}> включил PunishPUB с количеством флагов ${amount} и наказанием ${punishement} !",
	punishpub_confirmation_disable: "Вы успешно отключили PunishPub",
	punishpub_logs_embed_title_disable: "Логи PunishPub",
	punishpub_logs_embed_description_disable:
		"<@${authorId}> отключил PunishPUB !",

	// /report
	report_cooldown_command:
		"Извините, вы должны подождать **${time}** перед выполнением этой команды!",
	report_owner_need:
		":x: | **Вы должны быть владельцем сервера, чтобы выполнить эту команду!**",
	report_specify: "Пожалуйста, уточните баг, составьте хорошее предложение!",
	report_command_work: "**Спасибо за отправку бага!**",

	// /support
	support_not_admin:
		":x: | Вы должны быть администратором сервера, чтобы использовать эти команды!",
	support_command_work:
		"Вы настроили модуль поддержки для **${guildName}**.\nКогда пользователь имеет в своей биографии:\n**${input}**.\nЯ должен дать им роль <@&${rolesId}>!",
	support_command_work_on_disable:
		"Вы настроили модуль поддержки для **${guildName}**.\nТеперь никто не может иметь роль!",
	support_command_not_role: ":x: | Вы не указали роль!",
	support_command_not_type:
		":x: | Вы не указали тип поддержки, который хотите видеть в профиле пользователя (bio = биография, например ссылка на сервер; tag = тег сервера)!",
	support_command_guild_not_have_tag: ":x: | На сервере сейчас нет тегов.",
	support_command_work_2:
		"Вы настроили модуль поддержки для ${guildName}.\nКогда пользователь укажет тег сервера,\nя выдам ему роль <@&${rolesId}>!",

	// /setserverlang

	updates_embed_title: "Обновления iHorizon",
	updates_embed_description: "Вот последние изменения и обновления iHorizon.",
	updates_field_version: "Версия",
	updates_field_commit: "Последний коммит",
	updates_field_branch: "Ветка",
	updates_field_links: "Ссылки",
	updates_changelog_attached: "Полный список изменений прилагается в PDF.",
	newsletter_dm_title: "iHorizon {version} - Release Notes",
	newsletter_dm_body:
		"Привет {owner},\n\nНовая мажорная версия iHorizon была развернута.\n\n**Версия**: {version}\n**Релиз**: {releaseUrl}\n\nПолный список изменений прилагается в PDF.\n\nНужна помощь? Присоединяйтесь к нашему серверу поддержки: https://discord.gg/ihorizon\n-# Используйте +updates или кнопку ниже для управления подпиской.",
	newsletter_btn_unsubscribe: "Unsubscribe from newsletter",
	newsletter_btn_subscribe: "Subscribe to newsletter",
	newsletter_not_owner:
		"Ахах, приятно знать, что я тебе интересен настолько, что ты хочешь видеть изменения моего кода в реальном времени :3\n\n**Но эй, сначала добавь меня на сервер Discord:**\n\n<https://discord.com/oauth2/authorize?client_id=${clientId}>\n**Так я буду держать тебя в курсе.**\n\n> Другая альтернатива: присоединяйся к discord.gg/ihorizon. Мои основательницы пингуют чейнджлог при каждом обновлении. Решать тебе :3",
	newsletter_toggle_enabled: "Newsletter notifications enabled.",
	newsletter_toggle_disabled: "Newsletter notifications disabled.",
	setserverlang_not_admin:
		":x: | Вы должны быть администратором сервера, чтобы использовать эту команду!",
	setserverlang_logs_embed_title_on_enable: "Логи SetServerLang",
	setserverlang_logs_embed_description_on_enable:
		"<@${authorId}> установил язык iHorizon на **${type}** !",
	setserverlang_already: "Я уже на этом языке!",
	setserverlang_command_work_enable: "Теперь мой язык **${type}**",
	setserverlang_panel_title: "Выбор языка",
	setserverlang_panel_description:
		"Выберите язык, который iHorizon будет использовать на этом сервере.",
	setserverlang_panel_current: "Текущий язык",
	setserverlang_panel_select: "Выберите язык...",
	setserverlang_panel_saved: "Язык успешно изменён!",
	setserverlang_command_error_enable: "Ошибка!",

	// /embed
	embed_placeholder_string_select_menu_builder: "Что вы хотите сделать?",
	embed_placeholder_option_copy_embed: "Скопировать встраивание",
	embed_placeholder_option_edit_title: "Изменить заголовок",
	embed_placeholder_option_delete_title: "Удалить заголовок",
	embed_placeholder_option_edit_description: "Изменить описание",
	embed_placeholder_option_delete_description: "Удалить описание",
	embed_placeholder_option_edit_author: "Изменить автора",
	embed_placeholder_option_delete_author: "Удалить автора",
	embed_placeholde_option_change_footer_image:
		"Изменить значок нижнего колонтитула",
	embed_placeholder_option_edit_footer: "Изменить нижний колонтитул",
	embed_placeholder_option_delete_footer: "Удалить нижний колонтитул",
	embed_placeholder_option_edit_thumbnail: "Изменить миниатюру",
	embed_placeholder_option_edit_image: "Изменить изображение",
	embed_placeholder_option_edit_titleurl: "Изменить URL заголовка",
	embed_placeholder_option_edit_color: "Изменить цвет",
	embed_placeholder_option_delete_color: "Удалить цвет",
	embed_btn_save: "Сохранить встраивание",
	embed_btn_send: "Отправить встраивание",
	embed_btn_cancel: "Отмена",
	embed_interaction_not_for_you: "Эта интеракция не для вас",
	embed_first_message: "Что вы хотите сделать?",
	embed_save_message:
		"<@${authorId}>, **Вы решили сохранить конфигурацию встраивания!**```ID встраивания: ${embedId}```",
	embed_cancel_message:
		"<@${authorId}>, **Вы решили отказаться от конфигурации встраивания!**",
	embed_send_message:
		"<@${authorId}>, **В каком канале вы хотите отправить это встраивание?**",
	embed_timeout_getbtn:
		"<@${authorId}>, **Вы слишком долго не отвечали, я прерываю текущую операцию!**",
	embed_choose_0: "Какое сообщение вы хотите включить во встраивание?",
	embed_choose_1: "Какой заголовок вы хотите включить во встраивание?",
	embed_choose_2: "Заголовок встраивания успешно удален!",
	embed_choose_3: "Какое описание вы хотите включить во встраивание?",
	embed_choose_4: "Описание встраивания успешно удалено!",
	embed_choose_5: "Какого автора вы хотите включить во встраивание?",
	embed_choose_6: "Автор встраивания успешно удален!",
	embed_choose_7:
		"Какой нижний колонтитул вы хотите включить во встраивание?",
	embed_choose_7bis: "Какую иконку подвала вы хотите включить в ваш embed?",
	embed_choose_8: "Нижний колонтитул встраивания успешно удален!",
	embed_choose_9:
		"Какое изображение миниатюры вы хотите включить во встраивание?",
	embed_choose_10: "Какое изображение вы хотите включить во встраивание?",
	embed_choose_11: "Какой URL заголовка вы хотите включить во встраивание?",
	embed_choose_12:
		"Какой цвет вы хотите включить во встраивание? **www.color-hex.com**",
	embed_choose_12_error:
		"${emoji_No} | Неверный цвет! Пожалуйста, проверьте **www.color-hex.com**",
	embed_choose_13: "Цвет встраивания успешно удален!",
	embed_send_embed_work:
		"<@${authorId}>, **Вы успешно отправили встраивание в канал <#${messageContent}>!**",
	embed_copy_bad_guild_msg:
		"Гильдия, где находится сообщение, не совпадает с ${guildName}",
	embed_copy_bad_channel_msg: "Канал, где находится сообщение, недоступен!",
	embed_copy_bad_message_msg: "Сообщение недоступно!",
	embed_copy_bad_embed_message_msg:
		"Сообщение не содержит встроенных данных!",
	embed_copy_bad_url_msg:
		"Неверный URL, пожалуйста, попробуйте снова. Правильный формат: https://discord.com/channels/${messageGuildId}/${channelId}/${id}",
	embed_btn_replace: "Заменить встраивание",
	embed_replace_question_msg:
		"Какой новый URL сообщения, в котором нужно заменить встраивание?",
	embed_replace_message:
		"{user}, новое встраивание заменило встраивание для {messageUrl}",

	// /rolesaver
	rolesaver_embed_title: "Модуль RoleSaver",
	rolesaver_embed_desc:
		"Когда участники покидают сервер, их роли сохраняются в базе данных. Теперь, когда они возвращаются, iHorizon восстанавливает их роли.",
	rolesaver_embed_fields_1_name: "Включить",
	rolesaver_embed_fields_2_name: "Повторное назначение ролей администратора",
	rolesaver_embed_fields_3_name: "Тайм-аут",
	rolesaver_on_off_already_set: "Модуль уже отключен!",
	rolesaver_on_off_embed_title: "Модуль RoleSaver",
	rolesaver_on_off_embed_desc:
		"Когда участники покидают сервер, их роли не сохраняются в базе данных. Теперь iHorizon больше не восстанавливает старые роли участникам при их возвращении на сервер.",
	rolesaver_on_off_embed_fields_1_name: "Включить",

	// /nigthmode
	var_nm_role_app_dont_exist:
		"${emoji_Warning_Icon} У бота нет роли приложения. Пожалуйста, добавьте бота правильно.\n",
	var_nm_role_app_not_high:
		"${emoji_Warning_Icon} Бот не имеет самой высокой роли. Пожалуйста, поставьте его наверх.\n",
	var_nm_role_app_not_admin:
		"${emoji_Warning_Icon} Роль бота не имеет прав администратора.\n",
	var_nm_end_main: "Ночной режим заканчивается.\n\n",
	var_nm_start_main: "Ночной режим начинается.\n\n",
	var_nm_edited_roles: "Следующие роли были изменены:",
	var_nm_running: "запуска",
	var_nm_stopping: "остановки",
	var_nm_running2: "начинается",
	var_nm_stopping2: "заканчивается",
	var_nm_title: "Ночной режим",
	var_nm_ping_embed_title: "Ночной режим ${type}",
	var_nm_ping_embed_fields_0_name: "Временной диапазон",
	var_nm_error_occured:
		"# Возникла проблема во время ${type} ночного режима.\n",
	nightmode_embed_desc:
		"# ⭐️ Ночной режим\n> *Что такое ночной режим?* Ночной режим - это функция безопасности **[made by iHorizon](https://www.ihorizon.org)**, которая позволяет отключить все права администратора на Discord-сервере в течение определенного периода.\n> *Например, вы находитесь на Discord-сервере с большим количеством модераторов, вы хотите убрать все права администратора на ночь, чтобы избежать рейда, снайпинга Discord vanity и т.д.*\n> *Вы в правильном месте, дорогой. **iHorizon всегда будет решением.***\n\n---\n",
	nightmode_embed_fields_0_name: "Включить модуль",
	nightmode_embed_fields_1_name: "Уведомить владельца сервера",
	nightmode_embed_fields_2_name: "Понизить ботов?",
	nightmode_embed_fields_3_name: "Бот в белом списке",
	nightmode_embed_fields_4_name: "Временной диапазон",
	nightmode_select_placeholder: "Настроить ночной режим на сервере.",
	nightmode_select_0_label: "Включить ночной режим",
	nightmode_select_0_desc: "Включить/Выключить ночной режим.",
	nightmode_select_1_label: "Предупредить владельца сервера",
	nightmode_select_1_desc:
		"Уведомить владельца сервера при включении/выключении",
	nightmode_select_2_label: "Настроить временной диапазон ночного режима",
	nightmode_select_2_desc:
		"Временной диапазон, в котором права администратора автоматически убираются.",
	nightmode_select_3_label: "Понизить ботов",
	nightmode_select_3_desc: "Следует ли понижать ботов в ночное время?",
	nightmode_select_4_label: "Изменить часовой пояс (UTC)",
	nightmode_select_4_desc:
		"Если у вас есть конкретное время, вы должны его установить (формат числа UTC)",
	nightmode_select1_placeholder: "Бот авторизован быть администратором ночью",
	nightmode_change_timezone_question:
		"Выберите UTC для вашего Discord-сервера",
	nightmode_modal_hours_window_fields0_label:
		"Время начала (например: 21:30 или 2130)",
	nightmode_modal_hours_window_fields1_label:
		"Время окончания (например: 06:15 или 0615)",
	nightmode_modal_hours_window_title:
		"Ночной режим - Временной диапазон (24-часовой формат с минутами)",
	nightmode_invalid_hour_morning:
		"${emoji_No} Время начала недействительно. Используйте формат: 21:30 или 2130",
	nightmode_invalid_hour_night:
		"${emoji_No} Время окончания недействительно. Используйте формат: 06:15 или 0615",
	nightmode_utc_timezone_on: "часовой пояс UTC на",

	// /git lines
	git_lines_avoiding_spam:
		"Извините, но чтобы предотвратить спам, мы ограничиваем количество отображаемых строк до 50",
	git_lines_avoiding_limit:
		"Извините, но в Discord есть ограничение в 2000 символов, поэтому мы не смогли отобразить желаемый фрагмент",
	git_lines_work: "✅ Git Lines теперь включен.",
	git_lines_work_disabled: "❌ Git Lines теперь отключен.",
	git_lines_borred_warning:
		"\n-# ${emoji_VC_OpenChat} Я тебя беспокою? ты можешь сделать `/git lines` чтобы отключить этот модуль!",

	// /counter config
	counter_config_command_action_on:
		"${author}, вы включили модуль счётчика (`Включено`).\nЕсли канал не существует, настройте его с помощью команды: **/counter channel**.",
	counter_config_command_action_off:
		"${author}, вы выключили модуль счётчика (`Выключено`).",

	// /counter channel
	counter_channel_embed_title: "Модуль счётчика установлен здесь!",
	counter_channel_embed_desc:
		"${author} установил модуль счётчика здесь!\nТеперь пользователи могут считать в этом канале!",
	counter_channel_command_work:
		"${author}, вы успешно установили модуль счётчика в канал ${channel}!",
	counter_channel_command_error:
		"${author}, команда вернула ошибку. Пожалуйста, проверьте, существует ли указанный канал и включён ли модуль счётчика!",

	counter_actual_number: "✨ **Текущее число:** {number}",

	// Команды предложений
	// /setsuggest, /suggest

	// /suggest accept
	suggest_accept_not_admin: "Вы не администратор!",
	suggest_acceptnot_good_channel:
		"Эта команда должна выполняться в канале модуля предложений (<#${channel}>)!\nПожалуйста, убедитесь, что модуль предложений не отключен!",
	suggest_accept_not_found_db: "Предложение не найдено в моей базе данных!",
	suggest_accept_already_replied: "На это предложение уже был ответ!",
	suggest_accept_embed_fields_to_put: "Ответ от ${authorUsername} (Принято)",
	suggest_accept_command_work:
		"Вы приняли предложение!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_accept_command_error: "Предложение не найдено в канале Discord!",

	// /suggest deny
	suggest_deny_not_admin: "Вы не администратор!",
	suggest_deny_not_good_channel:
		"Эта команда должна выполняться в канале модуля предложений (<#${channel}>)!\nПожалуйста, убедитесь, что модуль предложений не отключен!",
	suggest_deny_not_found_db: "Предложение не найдено в моей базе данных!",
	suggest_deny_already_replied: "На это предложение уже был ответ!",
	suggest_deny_embed_fields_to_put: "Ответ от ${authorUsername} (Отклонено)",
	suggest_deny_command_work:
		"Вы отклонили предложение!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_deny_command_error: "Предложение не найдено в канале Discord!",

	// /suggest reply
	suggest_reply_not_admin: "Вы не администратор!",
	suggest_reply_not_good_channel:
		"Эта команда должна выполняться в канале модуля предложений (<#${channel}>)!\nПожалуйста, убедитесь, что модуль предложений не отключен!",
	suggest_replynot_found_db: "Предложение не найдено в моей базе данных!",
	suggest_reply_already_replied: "На это предложение уже был ответ!",
	suggest_reply_embed_fields_to_put: "Ответ от ${authorUsername}",
	suggest_reply_command_work:
		"Вы отправили ответ на предложение!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_reply_command_error: "Предложение не найдено в канале Discord!",

	// /suggest delete
	suggest_delete_not_delete: "Вы не администратор!",
	suggest_delete_not_good_channel:
		"Эта команда должна выполняться в канале модуля предложений (<#${channel}>)!\nПожалуйста, убедитесь, что модуль предложений не отключен!",
	suggest_delete_not_found_db: "Предложение не найдено в моей базе данных!",
	suggest_delete_command_work: "Вы удалили предложение!",
	suggest_delete_command_error: "Предложение не найдено в канале Discord!",

	// /suggest status
	suggest_not_staff: "У вас нет прав на управление предложениями.",
	suggest_status_pending: "Ожидает",
	suggest_status_reviewing: "На рассмотрении",
	suggest_status_accepted: "Принято",
	suggest_status_planned: "Запланировано",
	suggest_status_implemented: "Реализовано",
	suggest_status_denied: "Отклонено",
	suggest_notify_status:
		"<@${authorId}>, статус вашего предложения: **${status}**.",
	suggest_notify_reply:
		"<@${authorId}>, персонал ответил на ваше предложение.",
	suggest_button_reply: "Ответить",
	suggest_modal_title: "Ответить на предложение",
	suggest_modal_label: "Ваше сообщение",
	suggest_status_command_work:
		"Статус предложения: **${status}**.\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",

	// /suggest list
	suggest_list_title: "Предложения",
	suggest_list_empty: "Нет предложений для показа.",
	suggest_list_footer: "${shownCount} из ${totalCount}",

	// /setsuggest staff-role
	setsuggest_staff_role_set:
		"${author}, роль персонала для предложений теперь ${role}.",
	setsuggest_staff_role_removed:
		"${author}, роль персонала для предложений убрана.",

	// /setsuggest disable
	setsuggest_disable_not_admin: "Вы не администратор!",
	setsuggest_disable_pw_on: "${author}, вы включили модуль предложений!",
	setsuggest_disable_pw_off: "${author}, вы выключили модуль предложений!",

	// /setsuggest channel
	setsuggest_channel_not_admin: "Вы не администратор!",
	setsuggest_channel_already_set_with_that:
		"${author}, канал модуля предложений уже установлен в ${channel}!",
	setsuggest_channel_embed_title: "Модуль предложений установлен здесь!",
	setsuggest_channel_embed_desc:
		"Теперь все пользователи, которым разрешено отправлять сообщения здесь, могут предлагать свои идеи, отправляя сообщение!",
	setsuggest_channel_command_work:
		"${author}, вы установили канал модуля предложений в ${channel}!",

	// Команда безопасности
	// /security

	// /security disable
	security_disable_not_admin: "Вы не являетесь администратором!",
	security_disable_pw_on: "${author}, вы включили модуль безопасности!",
	security_disable_pw_off: "${author}, вы выключили модуль безопасности",

	// /security role-to-give
	security_role_to_give_not_admin: "Вы не являетесь администратором!",
	security_role_to_give_command_work:
		"${author}, вы установили роль ${role} для модуля безопасности!",

	// /security channel
	security_channel_not_admin: "Вы не являетесь администратором!",
	security_channel_command_work:
		"${author}, вы установили канал ${channel} для модуля безопасности!",

	// Команда расписания
	// /schedule

	// /schedule
	schedule_menu_placeholder: "Что вы хотите сделать?",
	schedule_menu_choice_0: "Создать расписание",
	schedule_menu_choice_1: "Удалить расписание",
	schedule_menu_choice_2: "Удалить все расписания",
	schedule_menu_choice_3: "Список всех расписаний",
	schedule_modal_title: "Менеджер расписаний",
	schedule_modal_fields_1_label: "Название расписания?",
	schedule_modal_fields_2_label: "Описание расписания?",
	schedule_delete_question:
		"Какой идентификатор расписания вы хотите удалить?",
	schedule_deleteall_question:
		"Вы уверены, что хотите удалить все ваши расписания? (Y/n)",
	schedule_delete_not_found:
		"Не найдено РАСПИСАНИЕ (${arg0}) для этого участника!",
	schedule_delete_title_embed: "Удаление расписания (${arg0})",
	schedule_delete_confirm: "Расписание удалено!",
	schedule_deleteall_title_embed: "Удаление всех расписаний",
	schedule_deleteall_desc_embed: "Все ваши расписания были удалены!",
	schedule_deleteall_confirm: "Все ваши расписания удалены!",
	schedule_deleteall_cancel: "Действие `DELETE_ALL` отменено!",
	schedule_list_not_schedule: "Не найдено РАСПИСАНИЕ для этого участника!",
	schedule_list_title_embed: "Список всех расписаний",
	schedule_list_fields_embed:
		"**Заканчивается**: ${expiresAt}```${title}``````${description}```\n",
	schedule_list_content_message: "Это список всех ваших расписаний!",
	schedule_create_title_embed: "Создание расписания",
	schedule_create_when_question:
		"Когда вы хотите получать уведомление об этом расписании? (Пример: 6d = 6 дней, 2h = 2 часа, 10m = 10 минут, 10s = 10 секунд)",
	schedule_create_not_number_time:
		"${author}, ваш ответ (время, когда вы хотите получать уведомление об этом расписании) не является числом!",
	schedule_create_embed_fields_name_confirm: "Дата уведомления",
	schedule_create_embed_title_confirm: "Расписание #${scheduleCode} создано!",
	schedule_create_confirm_msg:
		"${author}, ваше расписание было создано!\nКод: `${scheduleCode}`",

	// Команда PFPS
	// /pfps channel, /pfps config

	// /pfps config
	pfps_config_not_admin:
		":x: У вас нет прав администратора для выполнения этой команды",
	pfps_config_command_action_on:
		"${author}, вы включили модуль PFPS.\nЕсли канал не существует, настройте его с помощью команды: **/pfps channel**.",
	pfps_config_command_action_off: "${author}, вы выключили модуль PFPS.",

	// /pfps channel
	pfps_channel_not_admin:
		":x: У вас нет прав администратора для выполнения этой команды",
	pfps_channel_embed_title: "Модуль PFPS настроен здесь!",
	pfps_channel_embed_desc:
		"${author} настроил модуль PFPS здесь!\nТеперь каждые 30 секунд iHorizon будет отправлять аватар случайного пользователя в этой гильдии!\nЯ постараюсь сделать все возможное!",
	pfps_channel_command_work:
		"${author}, вы успешно настроили модуль PFPS для канала ${channel} !",
	pfps_channel_command_error:
		"${author}, команда вернула ошибку. Пожалуйста, проверьте, существует ли указанный канал, и включен ли модуль PFPP!",

	// Protection Module
	// /protect, /allowlist add, /allowlist remove, /allowlist show

	// /protect panel
	authorization_actions_not_permited:
		"Только владелец сервера может редактировать правило авторизации модуля защиты!",
	authorization_actions_everyone: "Все",
	authorization_actions_allowlist: "Участник(ы) списка разрешений",
	authorization_actions_nobody: "Никто. (Кроме владельца сервера)",
	protect_panel_title: "Панель управления Protect",
	protect_panel_desc:
		"Настройте каждое правило защиты: включайте и выключайте его, выберите, кто может его обходить, и задайте санкцию для ответственного участника.",
	protect_panel_global_label: "Глобальная санкция",
	protect_panel_global_hint:
		"Применяется к каждому правилу без собственной санкции",
	protect_panel_select_placeholder: "Выберите правило для настройки",
	protect_panel_mode_placeholder: "Выберите, кто может обходить это правило",
	protect_panel_sanction_placeholder: "Выберите применяемую санкцию",
	protect_panel_bypass_label: "Обход",
	protect_panel_sanction_label: "Санкция",
	protect_panel_rule_help:
		"Когда это правило срабатывает, действие автоматически отменяется, а санкция применяется к ответственному участнику.",
	protect_panel_enable_button: "Включить",
	protect_panel_disable_button: "Выключить",
	protect_panel_all_rules: "Все правила",
	protect_panel_all_rules_desc: "Изменить все правила сразу",
	protect_panel_all_status: "Включено правил: ${enabledCount}/${ruleCount}",
	protect_panel_all_help:
		"Обход и наказание применяются сразу ко всем включённым правилам.",
	protect_panel_all_mixed: "Разные",
	protect_panel_enable_all_button: "Включить все",
	protect_panel_disable_all_button: "Отключить все",
	protect_panel_all_mode_saved:
		"Правила (**${ruleCount}**) теперь пропускают: **${mode}**.",
	protect_panel_all_sanction_saved:
		"Наказание для правил (**${ruleCount}**) теперь: **${sanction}**.",
	protect_panel_all_enabled: "Включено правил: **${ruleCount}**!",
	protect_panel_all_disabled: "Отключено правил: **${ruleCount}**!",
	protect_panel_back_button: "Назад",
	protect_panel_refresh_button: "Обновить",
	protect_panel_close_button: "Закрыть панель",
	protect_panel_rule_enabled: "Правило **${rule}** теперь включено!",
	protect_panel_rule_disabled: "Правило **${rule}** теперь выключено!",
	protect_panel_mode_saved:
		"Правило **${rule}** теперь обходит: **${mode}**.",
	protect_panel_sanction_saved:
		"Санкция для **${rule}** теперь: **${sanction}**.",
	protect_panel_global_saved: "Глобальная санкция теперь: **${sanction}**.",
	protect_panel_api_error:
		"Не удалось применить изменение. Убедитесь, что у меня есть разрешение `Администратор`, и попробуйте снова.",
	protect_panel_sanction_global: "Глобальное значение по умолчанию",
	protect_panel_sanction_cancel: "Только отменить действия",
	protect_panel_sanction_derank: "Отмена + Деранк",
	protect_panel_sanction_ban: "Отмена + Бан",
	protect_panel_sanction_kick: "Отмена + Кик",
	protect_panel_sanction_mute: "Отмена + Мьют (10 мин)",
	protect_panel_group_server: "Сервер и вебхуки",
	protect_panel_group_channels: "Каналы",
	protect_panel_group_roles: "Роли",
	protect_panel_group_members: "Участники",
	protect_panel_rule_webhook_name: "Вебхуки",
	protect_panel_rule_updateguild_name: "Изменения сервера",
	protect_panel_rule_createchannel_name: "Создание каналов",
	protect_panel_rule_updatechannel_name: "Изменения каналов",
	protect_panel_rule_deletechannel_name: "Удаление каналов",
	protect_panel_rule_createrole_name: "Создание ролей",
	protect_panel_rule_deleterole_name: "Удаление ролей",
	protect_panel_rule_updaterole_name: "Изменения ролей",
	protect_panel_rule_updatemember_name: "Изменения ролей участников",
	protect_panel_rule_banmembers_name: "Бан участников",
	protect_panel_rule_kickmember_name: "Кик участников",
	protect_panel_rule_unbanmembers_name: "Разбан участников",
	protect_panel_rule_add_admin_roles_name: "Выдача ролей администратора",
	// /список разрешений показать
	allowlist_show_not_permited:
		"У вас нет разрешения использовать эту команду! Вы должны быть в списке разрешений!",
	allowlist_show_embed_author: "Список разрешений",

	// /список разрешений добавить
	allowlist_add_not_permited:
		"У вас нет разрешения использовать эту команду! Вы должны быть в списке разрешений!",
	allowlist_add_not_owner:
		"Только владелец сервера может добавлять/удалять пользователей из списка разрешений!",
	allowlist_add_already_in:
		"Участник, которого вы хотите добавить из списка разрешений, уже там находится!",
	allowlist_add_command_work: "${member} был добавлен в список разрешений!",

	// /список разрешений удалить
	allowlist_delete_not_permited:
		"У вас нет разрешения использовать эту команду! Вы должны быть в списке разрешений!",
	allowlist_delete_not_owner:
		"Только владелец сервера может добавлять/удалять пользователей из списка разрешений!",
	allowlist_delete_member_unreachable:
		"Участник, которого вы хотели удалить из списка разрешений, недоступен!",
	allowlist_delete_cant_remove_owner:
		"Нельзя удалить владельца сервера из списка разрешений!",
	allowlist_delete_isnt_in:
		"Участник, которого вы хотите удалить из списка разрешений, не находится там!",
	allowlist_delete_command_work: "${member} был удален из списка разрешений!",

	// Custom Tag Module
	// /tag create, ... delete, ... edit, ... list, ... info

	tag_name: "Тег",
	tag_embed_created_at: "Создано",
	tag_embed_last_update: "Последнее обновление",
	tag_embed_last_updated_by: "Последнее обновление от",

	// /tag create
	tag_create_not_permited:
		"У вас нет разрешения на создание тега.\nНеобходимы права администратора или нахождение в белом списке (`tag wlroles-create`).",
	tag_create_not_good_name:
		"Имя тега не должно содержать пробелов и точек и не должно превышать 16 символов.",
	tag_create_command_work: "Тег `${tag_name}` был создан.",
	tag_create_already_exist: "Тег уже существует.",
	tag_create_embed_doesnt_exist: "Встраивание не существует.",

	// /tag delete
	tag_no_one_found: "На этом сервере нет сохраненных тегов!",
	tag_delete_dnt_exist: "Тег `${tag_name}` не существует.",
	tag_delete_command_ok: "Тег `${tag_name}` был удален.",

	// /tag info
	tag_doesnt_exist: "Тег `${tag_name}` не существует!",

	// /tag wlcreate
	tag_wlcreate_embed_title: "Белый список создания - Теги",
	tag_wlcreate_embed_desc: "Все роли, которым разрешено создавать теги.",

	// /tag wluse
	tag_wluse_embed_title: "Белый список использования - Теги",
	tag_wluse_embed_desc: "Все роли, которым разрешено использовать теги.",

	// /tag list
	tag_list_no_anything: "На этом сервере нет сохраненных тегов!",

	// /tag use
	tag_use_not_allowed:
		"У вас нет разрешения на использование тега `${tag_name}`.\nНеобходимы права администратора или вы можете попросить владельца тега <@${createBy}> добавить вас в белый список (`tag wlroles-use`).",
	tag_use_empty: "Тег `${tag_name}` пуст: в нём нет ни текста, ни эмбеда.",
	tag_use_command_work: "Тег `${tag_name}` был отправлен.",

	// /tag edit
	tag_edit_error_perm:
		"Чтобы изменить тег, вам нужны права администратора или вы должны быть владельцем тега.",
	tag_edit_command_ok:
		"Текущее имя тега изменено с **`${current_tag_name}`** на **`${new_tag_name}`**",

	// Модуль временного голосового канала
	// /текст, /голос, /статус, /персонал

	// /голос интерфейс установить текстовый канал
	tempvoice_if_text_not_admin:
		"<@${authorId}>, у вас нет прав на использование этой команды!",
	tempvoice_if_text_desc_embed:
		"## Интерфейс временного голосового канала\nЭтот **интерфейс** может быть использован для управления временными голосовыми каналами.\n",
	tempvoice_if_text_fields_value_limit:
		"${emoji_VC_Limit} **Изменить лимит**",
	tempvoice_if_text_fields_value_name:
		"${emoji_VC_Name} **Изменить название**",
	tempvoice_if_text_fields_value_region:
		"${emoji_VC_Region} **Изменить регион**",
	tempvoice_if_text_fields_value_trust: "${emoji_VC_Trust} **Доверие**",
	tempvoice_if_text_fields_value_untrust:
		"${emoji_VC_Untrust} **Не доверие**",
	tempvoice_if_text_fields_value_block: "${emoji_VC_Block} **Блокировать**",
	tempvoice_if_text_fields_value_unblock:
		"${emoji_VC_Unblock} **Разблокировать**",
	tempvoice_if_text_fields_value_claim: "${emoji_VC_Claim} **Присвоить**",
	tempvoice_if_text_fields_value_privacy:
		"${emoji_VC_Privacy} **Конфиденциальность**",
	tempvoice_if_text_fields_value_transfer:
		"${emoji_VC_Transfer} **Передать**",
	tempvoice_if_text_fields_value_delete: "${emoji_VC_Delete} **Удалить**",

	// /голос интерфейс установить голосовой канал
	tempvoice_vc_not_admin:
		"<@${authorId}>, у вас нет прав на использование этой команды!",

	// /голос интерфейс установить роль персонала
	tempvoice_staff_not_admin:
		"<@${authorId}>, у вас нет прав на использование этой команды!",
	tempvoice_staff_desc_embed:
		"## Роль персонала TempVoice\nРоли здесь теперь могут заходить в канал и модерировать!\n",

	// Модуль Исповедей
	// /cooldown, /disable, /channel

	// /confession channel
	confession_channel_command_work:
		"Панель исповедей была отправлена в ${channel}",
	confession_channel_panel_embed_desc:
		"# **Анонимные Исповеди**\n\nНажмите кнопку ниже, чтобы открыть форму исповеди. Вы можете написать то, что хотите исповедовать. Если хотите, вы можете сделать вашу исповедь приватной.\nУчтите, что исповеди могут не оставаться анонимными — владельцы сервера или любой, у кого есть доступ к журналам исповедей, может идентифицировать пользователей, если ведение журналов включено.\n\n## **Сделать Исповедь**\n\n*Примечание: Чтобы сделать вашу исповедь приватной, укажите соответствующий вариант в форме.*",
	confession_channel_log_embed_title: "Модуль SetChannel Исповедей",
	confession_channel_log_embed_desc:
		"${author} установил канал на ${channel}",

	// /confession cooldown
	confession_coolodwn_command_work:
		"${author}, время ожидания для исповеди теперь составляет **${time}**!",
	confession_cooldown_log_embed_title: "Модуль SetCooldown Исповедей",
	confession_cooldown_log_embed_desc:
		"${author} установил время ожидания на `${time}`",

	// /confession disable
	confession_disable_command_work_on: "Модуль исповедей теперь включен.",
	confession_disable_command_work_off: "Модуль исповедей теперь отключен.",
	confession_log_embed_title_on_enable: "Включение/Отключение Исповеди",
	confession_log_embed_desc_on_enable: "${author} включил модуль исповедей!",
	confession_log_embed_desc_on_disabled:
		"${author} отключил модуль исповедей!",

	// /confession delete
	confession_sent_confirmation: "Ваше признание **#${code}** опубликовано.",
	confession_not_found: "Признание с кодом **#${code}** не найдено.",
	confession_delete_command_work: "Признание **#${code}** удалено.",
	confession_delete_log_embed_title: "Удаление признания",
	confession_delete_log_embed_desc:
		"${author} удалил(а) признание **#${code}**",

	// /confession ban
	confession_ban_command_work:
		"Автор признания **#${code}** больше не может оставлять признания на этом сервере.",
	confession_ban_already: "Автор признания **#${code}** уже заблокирован.",
	confession_ban_author_expired:
		"Это признание слишком старое: автор забывается через 90 дней.",
	confession_ban_log_embed_title: "Блокировка автора признания",
	confession_ban_log_embed_desc:
		"${author} заблокировал(а) автора признания **#${code}**",
	confession_banned_error:
		"Вы заблокированы в модуле признаний на этом сервере.",

	// /confession unban
	confession_unban_command_work:
		"Блокировка, связанная с признанием **#${code}**, снята.",
	confession_unban_not_found:
		"С признанием **#${code}** не связана ни одна блокировка.",
	confession_unban_log_embed_title: "Разблокировка автора признания",
	confession_unban_log_embed_desc:
		"${author} снял(а) блокировку, связанную с признанием **#${code}**",

	// /confession thread
	confession_thread_enabled:
		"Отныне, когда кто-то признается, я создаю ветку обсуждения под встраиваемым сообщением.",
	confession_thread_disabled:
		"Я не создаю ветку обсуждения под встраиваемым сообщением.",

	// Модуль AntiSpam
	// /antispam manage

	// /antispam manage
	antispam_manage_embed_title: "Настройки модуля AntiSpam",
	antispam_manage_choices_1_label: "Включить модуль",
	antispam_manage_choices_1_desc: "Включить или отключить модуль антиспама",
	antispam_manage_choices_2_label: "Игнорировать ботов",
	antispam_manage_choices_2_desc: "Игнорировать спам от ботов на сервере",
	antispam_manage_choices_3_label: "Тип наказания",
	antispam_manage_choices_3_desc:
		"Какой тип санкции я буду применять к пользователю?",
	antispam_manage_choices_4_label: "Время наказания",
	antispam_manage_choices_4_desc: "Как долго длится санкция",
	antispam_manage_choices_5_label: "Множитель времени наказания",
	antispam_manage_choices_5_desc:
		"Умножается ли длительность санкции за каждое нарушение",
	antispam_manage_choices_6_label: "Удалять сообщения",
	antispam_manage_choices_6_desc: "Удалять спам-сообщения",
	antispam_manage_choices_7_label: "Максимальный интервал между сообщениями",
	antispam_manage_choices_7_desc:
		"Максимальный интервал между сообщениями, чтобы считать их спамом",
	antispam_manage_choices_8_label: "Максимум повторяющихся сообщений",
	antispam_manage_choices_8_desc:
		"Максимальное количество повторяющихся сообщений перед санкцией",
	antispam_manage_choices_9_label: "Максимальный интервал между повторами",
	antispam_manage_choices_9_desc:
		"Интервал между повторяющимися сообщениями для пометки пользователя",
	antispam_manage_choices_10_label: "Максимум похожих сообщений",
	antispam_manage_choices_10_desc:
		"Максимальное количество похожих сообщений перед санкцией",
	antispam_manage_choices_12_label: "Порог перед наказанием",
	antispam_manage_choices_12_desc: "Максимальный порог перед наказанием",
	antispam_manage_select_menu_punish_mute_label: "Заглушить участников",
	antispam_manage_modal_title: "Модальное окно AntiSpam",
	antispam_manage_button_label: "Сохранить настройки",
	antispam_manage_preset_level1_name: "Режим Расслабления",
	antispam_manage_preset_level2_name: "Режим Охраны",
	antispam_manage_preset_level3_name: "Режим Экстремальной Защиты",
	antispam_manage_button_preset_label: "Загрузить пресет",
	antispam_manage_selectstring_preset_label: "Конфигурации пресетов",

	// /antispam bypass-roles
	antispan_bypassroles_embed_desc:
		"Все роли ниже могут обойти модуль антиспама",

	// /antispam bypass-roles
	antispam_ignorechannels_embed_desc:
		"Все сообщения, отправленные в один из указанных ниже каналов, могут обходить модуль антиспама.",

	// Stats Module
	// /stats ustats

	// /stats ustats
	header_h1_value: "Статистика сообщений {author_username}",
	messages_word: "Сообщения",
	minutes_word: "Минуты",
	top_voice: "Лучшие голосовые каналы",
	top_message: "Лучшие каналы сообщений",
	voice_activity: "Активность в голосовых каналах",
	var_members: "участник(и)",

	// Starboard Module
	// lazy

	// /starboard channel
	starboard_channel_command_ok:
		"${emoji_Yes} | **Канал Starboard теперь установлен как: ${channel}**. Когда участники сервера реагируют на сообщение '⭐' и порог **`${threshold}`** превышен, сообщение будет отправлено в ${channel}!",

	// /starboard config
	starboard_config_command_ok:
		"${emoji_Yes} | **Модуль Starboard теперь ${action}**",

	// /starboard threshold
	starboard_threshold_command_ok:
		"${emoji_Yes} | Когда участники сервера реагируют на сообщение '⭐' и порог **`${amount}`** превышен, сообщение будет отправлено в указанный канал!",

	// /starboard create-thread
	starboard_create_thread_command_ok:
		"${emoji_Yes} | Когда участники сервера реагируют на сообщение '⭐' и порог **`${amount}`** превышен, сообщение будет отправлено в указанный канал **`${action}`**",
	starboard_create_thread_yes: "и будет создана тема для обсуждения",
	starboard_create_thread_no: "и тема для обсуждения не будет создана",

	// /skullboard channel
	skullboard_channel_command_ok:
		"${emoji_Yes} | **Канал Skullboard теперь установлен на: ${channel}**. Теперь, когда участники сервера реагируют на сообщения с '💀' и порог **`${threshold}`** превышен, сообщение будет отправлено в ${channel}!",

	// /skullboard config
	skullboard_config_command_ok:
		"${emoji_Yes} | **Модуль Skullboard теперь ${action}**",

	// /skullboard threshold
	skullboard_threshold_command_ok:
		"${emoji_Yes} | Теперь, когда участники сервера реагируют на сообщения с '💀' и порог **`${amount}`** превышен, сообщение будет отправлено в указанный канал!",

	// /skullboard create-thread
	skullboard_create_thread_command_ok:
		"${emoji_Yes} | Теперь, когда участники сервера реагируют на сообщения с '💀' и порог **`${amount}`** превышен, сообщение будет отправлено в указанный канал **`${action}`**",

	// Модуль уведомлений
	// автор уведомлений, настройка уведомлений

	// /notifier author add
	notifier_author_add_author_doesnt_exist:
		"Автор не существует. Пожалуйста, проверьте ID.",

	// /notifier config channel
	notifier_config_channel_logsEmbed_title: "Модуль Канала Уведомлений",
	notifier_config_channel_logsEmbed_desc:
		"<@${authorId}> установил модуль Канала Уведомлений на ${channel}",
	notifier_config_message_command_ok:
		"Теперь, когда Стример/Ютубер/Twitcher публикует видео, я отправлю сообщение в ${channel}",

	// /notifier config message
	notifier_config_message_helpEmbed_title:
		"Пользовательское Сообщение Уведомления",
	notifier_config_message_helpEmbed_desc:
		"{artistAuthor} => Имя пользователя Стримера/Ютубера\n{artistLink} => Ссылка на канал Стримера/Ютубера\n{mediaURL} => URL видео Стримера/Ютубера",
	notifier_config_message_embed_fields_notifyMessage: "Сообщение Уведомления",
	notifier_config_message_awaiting_response:
		"Напишите сообщение уведомления.",
	notifier_config_message_command_work_on_enable:
		"${emoji_GreenTick} | Сообщение уведомления успешно установлено.",

	// Модуль Blogger

	blogger_generateBlogsEmbed_embed_desc: "Список настроенных RSS-лент:\n\n",
	blogger_generateBlogsEmbed_embed_title: "📰 Настройки RSS-блогов",
	blogger_generateConfigurationEmbed_embed_title: "📰 Конфигурация Blogger",
	blogger_no_rss: "RSS-ленты не настроены.",
	blogger_generateConfigurationEmbed_embed_fields_1_name: "Статус",
	blogger_generateConfigurationEmbed_embed_fields_2_name: "Всего блогов",
	blogger_unknown_blog: "Неизвестный блог",
	blogger_on_new_article_default_message:
		"📰 Опубликована новая статья!\n**{articleTitle}** от {articleAuthor}\n{articleLink}",
	blogger_config_status_enabled:
		"✅ Модуль Blogger **включён**. RSS-ленты будут отслеживаться.",
	blogger_config_status_disabled:
		"❌ Модуль Blogger **отключён**. RSS-ленты не будут отслеживаться.",
	blogger_read_article: "Читать статью",
	blogger_blog_add_invalid_channel:
		"Недопустимый тип канала. Пожалуйста, выберите текстовый канал.",
	blogger_blog_add_success:
		"✅ RSS-лента **${validationName}** добавлена! Уведомления будут отправлены в ${channel} (ID: `${blogId}`)",
	blogger_blog_add_invalid_rss:
		"❌ Указанная RSS-лента недействительна или недоступна. Проверьте URL и попробуйте снова.",
	blogger_blog_remove_success: "✅ RSS-лента с ID `${blogId}` была удалена.",
	blogger_blog_remove_not_found: "❌ RSS-лента с таким ID не найдена.",
	lastfm_module_not_configured:
		"${emoji_No} | Модуль Last.fm не настроен на боте. Задайте `LASTFM_API_KEY` и `LASTFM_SHARED_SECRET` в файле `.env` бота.",
	lastfm_config_login_required:
		"${emoji_No} | Сначала нужно использовать `/lastfm login`, прежде чем включать модуль.",
	lastfm_config_enabled:
		"${emoji_Yes} | Скробблинг Last.fm теперь включён для вашего аккаунта.",
	lastfm_config_disabled:
		"${emoji_Yes} | Скробблинг Last.fm теперь отключён для вашего аккаунта.",
	lastfm_login_invalid_session:
		"${emoji_No} | Last.fm не вернул действительную сессию.",
	lastfm_login_success:
		"${emoji_Yes} | Ваш аккаунт Last.fm `${username}` теперь подключён, и скробблинг включён.",
	lastfm_embed_title: "Настройка Last.fm для ${userLabel}",
	lastfm_embed_field_status: "Статус",
	lastfm_embed_field_account: "Подключённый аккаунт",
	lastfm_embed_field_connected_at: "Подключён",
	lastfm_api_error_login:
		"${emoji_No} | Не удалось подключиться к Last.fm: ${error}",
	lastfm_api_error_nowplaying:
		"${emoji_No} | Не удалось отправить в Last.fm статус Now Playing: ${error}",
	lastfm_api_error_scrobble:
		"${emoji_No} | Не удалось заскробблить этот трек: ${error}",
	lastfm_api_error_unknown: "неизвестная ошибка",

	// Модуль AuthRestore
	// роль, установить, удалить, получить, принудительное присоединение

	rc_key_doesnt_exist:
		"${emoji_No} Модуль AuthRestore с ключом: **${secretCode}** не существует!",
	rc_verify: "Проверить",

	// /authrestore роль
	rc_role_embed_title: "Новое изменение в AuthRestore",
	rc_role_embed_field1_name: "Новая роль после проверки",

	// /authrestore установить
	rc_command_ok:
		'${author}, вы только что настроили модуль "AuthRestore". Теперь, когда участник сервера нажимает на кнопку и входит через OAuth2, он добавляется в базу данных. Впоследствии он сможет автоматически присоединиться к серверу через OAuth2.\n# ВНИМАНИЕ\nСообщение ${msgLink} теперь имеет кнопку, служащую для проверки.\nЭТО ПРИВАТНЫЙ КОД, КОТОРЫЙ НЕ СЛЕДУЕТ ПЕРЕДАВАТЬ НИКОМУ. ЧЕЛОВЕК С ЭТИМ КОДОМ СМОЖЕТ УДАЛЯТЬ И ДОБАВЛЯТЬ УЧАСТНИКОВ НА СВОЙ СЕРВЕР... ХРАНИТЕ ЕГО В БЕЗОПАСНОСТИ. iHorizon НЕ ПРЕДОСТАВИТ ЕГО СНОВА:\n```${secretCode}```',
	rc_command_ok_dm: "# Код AuthRestore для ${guildName}\n```${secretCode}```",
	rc_command_dm_failed:
		"Я попытался отправить вам код в личное сообщение, но вы заблокировали ЛС :/",
	rc_command_dm_ok:
		"На случай, если вы не заметили, я отправил вам код в личное сообщение!",
	rc_command_horizongw_down: "Ошибка: HorizonGateway может быть недоступен",

	// /authrestore удалить
	rc_delete_config_not_found: "Настройка модуля на этом сервере не найдена!",
	rc_delete_command_ok:
		'${author}, вы удалили настройку модуля "AuthRestore". По соображениям безопасности (данные) я удалю только кнопку, но данные OAuth2 и секретный код будут удалены через 48 часов!',

	// /authrestore получить
	rc_get_mainEmbed_title: "Общая информация о AuthRestore",
	rc_get_mainEmbed_field1_name: "ID сервера",
	rc_get_mainEmbed_field2_name: "Роль после проверки",
	rc_get_mainEmbed_field3_name: "Дата создания",
	rc_get_mainEmbed_field3_value: "*дата в формате MM/DD/YYYY HH:mm*",
	rc_get_mainEmbed_field4_name: "Количество использований ключа",
	rc_get_mainEmbed_field5_name: "Автор настройки",
	rc_get_secondEmbed_title: "Сохраненные пользователи",
	rc_get_secondEmbed_footer: "Страница ${from} / ${to}",
	rc_get_locale: "Локализация",
	rc_get_username: "Имя пользователя",
	rc_get_unkwnon_user: "Неизвестный пользователь (${authorId})",

	// /authrestore принудительное присоединение
	rc_forceJoin_embed_title: "AuthRestore - Принудительное присоединение",
	rc_forceJoin_embed_desc:
		"## Вы уверены, что хотите принудительно присоединить участников к этому серверу?\n### ВНИМАНИЕ:\nПОДТВЕРЖДЕНИЕ УНИЧТОЖИТ ТЕКУЩИЙ ПРИВАТНЫЙ КЛЮЧ, И ВАМ БУДЕТ ПРЕДОСТАВЛЕН НОВЫЙ.\n\n\n",
	rc_forceJoin_embed_field1: "Найденные участники",
	rc_forceJoin_embed_field2: "Текущие участники",
	rc_forceJoin_embed_field3: "Возможные присоединения",
	rc_forceJoin_embed_2_field1: "Возможные присоединения",
	rc_forceJoin_embed_2_field2: "Присоединившиеся",
	rc_forceJoin_ws_size:
		"# Подготовка к добавлению **${value2}** участников на сервер.",
	rc_forceJoin_ws_start: "# Процесс принудительного присоединения начался...",
	rc_forceJoin_ws_end: "# Процесс принудительного присоединения завершен.",
	rc_forceJoin_ws_end_renew_msg:
		"# ВНИМАНИЕ\nЭТО ПРИВАТНЫЙ КОД, КОТОРЫЙ НЕ СЛЕДУЕТ ПЕРЕДАВАТЬ НИКОМУ. ЧЕЛОВЕК С ЭТИМ КОДОМ СМОЖЕТ УДАЛЯТЬ И ДОБАВЛЯТЬ УЧАСТНИКОВ НА СВОЙ СЕРВЕР... ХРАНИТЕ ЕГО В БЕЗОПАСНОСТИ. iHorizon НЕ ПРЕДОСТАВИТ ЕГО СНОВА:\n```${value2}```",

	// Разное
	// манипуляция медиа

	// кулдаун медиа
	media_gen_cooldown:
		"Необходимо подождать `1 минуту и 30 секунд` между созданием медиа!",
	media_gen_error_args:
		"Пожалуйста, укажите два действительных URL изображений.",

	// ru-RU.yml (Russian - Russia)
	batch_ban_process: "🔄 Баню ${memberUsername} на ${guildCount} серверах...",
	batch_unban_process: "🔄 Разбаниваю ${bannedMemberCount} участников...",
	batch_unblacklist_process:
		"🔄 Удаляю ${bannedMemberUsername} из чёрного списка на ${guildObjectCount} серверах...",
	unbanall_undo_command_err:
		"Нет участников для повторного бана. Сначала используйте команду разбана всех.",

	// -----------------------------/ \-----------------------------
	// События Модуля Исповедей
	confession_module_modal_title: "Отправить исповедь",
	confession_module_modal_components1_label: "Что вы хотите исповедать?",
	confession_module_modal_components1_placeholder: "Ммхх",
	confession_module_modal_components2_label: "Это приватно?",

	// События проигрывателя музыки
	even_mp_playerStart_tip:
		"> ${emoji_LastFM_Logo} Знаешь ли ты, что можешь скробблить свою музыку с помощью `/lastfm` на iHorizon ? ${emoji_Sunglass}",
	event_mp_audioTrackAdd:
		"${emoji_Player_Queue_Add} - ${trackTitle} добавлена в очередь!",
	event_mp_playerError:
		"У меня возникли проблемы с подключением => ${errorMessage}",
	event_mp_error: "Возникла проблема с очередью песен => ${errorMessage}",
	event_mp_emptyChannel:
		"${emoji_No} | Никто не находится в голосовом канале, ухожу...",
	event_mp_playerSkip:
		"${emoji_Music_Icon} - Пропускается **${trackTitle}** !",
	event_mp_emptyQueue:
		"${emoji_Warning_Icon} - Музыка остановлена, так как в очереди больше нет музыки!",

	// События создания канала
	event_channel_create_message_embed_title: "Успешная настройка!",
	event_channel_create_message_embed_description:
		"Бот был настроен и готов к работе. Вам больше ничего не нужно делать.\n\nВсе журналы модерации, связанные с iHorizon, будут отображаться здесь",

	// События приветствия
	event_welcomer_inviter:
		"{memberMention} (аккаунт создан {accountCreationTimestamp}) присоединился к серверу. Их пригласил **{inviterUsername}** (**{invitesCount}** Приглашения), теперь нас {memberCount} в {guildName}",
	event_welcomer_default:
		"{memberMention} (аккаунт создан {accountCreationTimestamp}) присоединился к серверу. Теперь нас {memberCount} в {guildName}",

	// События прощания
	event_goodbye_inviter:
		"`{memberUsername}` (аккаунт создан {accountCreationTimestamp}) покинул сервер. Их пригласил **{inviterUsername}** (**{invitesCount}** Приглашения), теперь нас {memberCount} в {guildName}",
	event_goodbye_default:
		"`{memberUsername}` (аккаунт создан {accountCreationTimestamp}) покинул сервер. Теперь нас {memberCount} в {guildName}",

	// События уровня XP
	event_xp_level_earn:
		"**GG**, {memberMention}, вы получили +1 уровень, ваш текущий уровень: **{xpLevel}**",
	event_xp_level_additional_info:
		"\n-#  ${emoji_VC_OpenChat} Вам мешает это сообщение? Вы можете отключить его, отключив систему уровней с помощью команды `/ranks config`",

	// События модуля билетов:
	event_ticket_embed_description:
		"Привет, ${userUsername}, добро пожаловать в ваш бил",
	event_ticket_add_member:
		"${author}, вы **добавили** ${addedMembers} в билет ${channel} !",
	event_ticket_del_member:
		"${author}, вы **удалили** ${removedMembers} из билета ${channel} !",
	event_ticket_button_name: "Создать тикет",
	event_ticket_category_awaiting_response:
		"Выберите категорию [${emoji}] >> ${name}",
	event_ticket_reason_awaiting_response:
		"${author} нужен ли пользователю указать причину перед созданием тикета?",
	event_ticket_create_reason_modal_title: "В чем причина вашего обращения?",
	event_ticket_create_reason_modal_fields_1_label: "Причина обращения",
	event_ticket_reason_embed_desc: "# Причина обращения\n`${reason}`",

	// События interactionCreate:
	iC_event_cooldown:
		"Кулдаун, пожалуйста, подождите немного между командами!",
	iC_event_connection_error: "Ошибка подключения!",

	// Кулдаун
	Msg_cooldown: "Можете подождать секунду перед выполнением команды?",

	// Модуль билетов
	ticket_module_button_delete: "Удалить билет",
	ticket_module_button_transcript: "Транскрипт билета",
	ticket_module_button_addmember: "Добавить участника",
	ticket_module_button_removemember: "Удалить участника",
	ticket_module_add_question:
		"Кого вы хотите добавить в билет? (Укажите их идентификатор пользователя)!",
	ticket_module_remove_question:
		"Кого вы хотите удалить из билета? (Укажите их идентификатор пользователя)!",
	ticket_transcript_failed_to_send:
		"Я попытался отправить вам файл в личном сообщении, но вы заблокировали свои личные сообщения :/",

	// Журналы сервера
	event_srvLogs_banAdd_description:
		"<@${executorId}> **забанил** <@${targetId}>",
	event_srvLogs_banAdd_fields_name: "Причина",
	event_srvLogs_banAdd_fields_value: "`{reason}`",
	event_srvLogs_banRemove_description:
		"<@${executorId}> **снял бан** с ${targetUsername}",
	event_srvLogs_guildMemberRemove_description:
		"<@${executorId}> **выгнал** <@${targetId}>",
	event_srvLogs_guildMemberUpdate_description:
		"📤 <@${executorId}> снял роль ${removedRoles} с ${oldMemberUserUsername}",
	event_srvLogs_guildMemberUpdate_2_description:
		"📥 <@${executorId}> добавил роль ${addedRoles} к ${oldMemberUserUsername}",
	event_srvLogs_messageDelete_description:
		"**Сообщение удалено в <#${messageChannelId}>**\n${messageContent}",
	event_srvLogs_messageUpdate_description:
		"**Сообщение отредактировано** [в](xxx) **<#${oldMessageChannelId}>**",
	event_srvLogs_messageUpdate_footer_1: "До",
	event_srvLogs_messageUpdate_footer_2: "После",
	event_srvLogs_voiceStateUpdate_description:
		"📤 <@${targetUserId}> покинул канал <#${OchannelID}>",
	event_srvLogs_voiceStateUpdate_2_description:
		"📥 <@${targetUserId}> присоединился к каналу <#${channelID}>",
	event_srvLogs_voiceStateUpdate_3_description:
		"<@${targetUserId}> выключил микрофон в канале <#${channelID}>",
	event_srvLogs_voiceStateUpdate_4_description:
		"<@${targetUserId}> включил микрофон в канале <#${channelID}>",
	event_srvLogs_voiceStateUpdate_5_description:
		"<@${targetUserId}> выключил звук в канале <#${channelID}>",
	event_srvLogs_voiceStateUpdate_6_description:
		"<@${targetUserId}> включил звук в канале <#${channelID}>",
	event_srvLogs_channelUpdate_disabled_for:
		"-    ❌ ${perm} отключено для ${target}\n",
	event_srvLogs_channelUpdate_enabled_for:
		"-    ✅ ${perm} включено для ${target}\n",
	event_srvLogs_channelUpdate_allowed_for:
		"-    ✅ ${perm} разрешено для ${target}\n",
	event_srvLogs_channelUpdate_unallowed_for:
		"-    ❌ ${perm} не разрешено для ${target}\n",
	event_srvLogs_channelUpdate_field_name: "🎫 Название: ${newChannelName}\n",
	event_srvLogs_channelUpdate_perm_added:
		"🛡 Добавленные разрешения для ${target}:\n",
	event_srvLogs_channelUpdate_embed_desc: "${newChannel} был обновлён",

	// Событие повышения уровня
	event_rank_role: "<@${messageAuthorId}>, у вас теперь есть роль <@&${id}>",

	// Событие предложения
	event_suggestion_too_short:
		"<@${authorId}>, предложение должно содержать не менее 5 слов. Ваше сообщение будет удалено через 10 секунд, скопируйте его, если хотите переписать.",
	event_suggestion_embed_author:
		"Новое предложение от ${messageAuthorUsername}",

	// Событие безопасности
	event_security_title: "Добро пожаловать в ${guild}!",
	event_security:
		"${member}, пожалуйста, введите капчу, показанную в этом сообщении.",
	event_security_expiry:
		"{emoji} Автоматический кик ${timestamp} (осталось попыток: **${attempts}**).",
	event_security_footer:
		"Это займёт всего несколько секунд и поможет защитить наше сообщество.",
	event_security_kick_reason: "Не пройдена проверка безопасности",

	// Событие по билетам
	event_ticket_whenCreated_msg:
		"${author}, ваш билет был создан, посетите <#${channelId}>!",
	event_ticket_logsChannel_onCreation_embed_title:
		"Лог билетов - Создание панели",
	event_ticket_logsChannel_onCreation_embed_desc:
		"Панель билетов с названием `${name}` в ${interaction} создана!",
	event_ticket_logsChannel_onCreationChannel_embed_title:
		"Лог билетов - Создание билета",
	event_ticket_logsChannel_onCreationChannel_embed_desc:
		"Билет создан: ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onClose_embed_title:
		"Лог билетов - Закрытие билета",
	event_ticket_logsChannel_onClose_embed_desc:
		"Билет теперь закрыт ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onRemoveMember_embed_title:
		"Лог билетов - Удаление участника из билета",
	event_ticket_logsChannel_onRemoveMember_embed_desc:
		"${member} удален из билета ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onAddMember_embed_title:
		"Лог билетов - Добавление участника в билет",
	event_ticket_logsChannel_onAddMember_embed_desc:
		"${member} добавлен в билет ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onReopen_embed_title:
		"Лог билетов - Повторное открытие билета",
	event_ticket_logsChannel_onReopen_embed_desc:
		"${author} повторно открывает билет (<#${channelId}>)!",
	event_ticket_logsChannel_onDelete_embed_title:
		"Лог билетов - Удаление билета",
	event_ticket_logsChannel_onDelete_embed_desc:
		"${author} удалил билет (#${channelName})!",
	event_ticket_logsChannel_onAddMember2_embed_title:
		"Лог билетов - Добавление/удаление участников из билета",
	event_ticket_logsChannel_onAddMember2_embed_desc:
		"${author}\nУдаленные: ${removedMembers}.\nДобавленные: ${addedMembers}.\n в билете (${channel})!",
	event_ticket_already_opened:
		"Ой, у вас уже есть открытый тикет (<#${channelId}>)! Пожалуйста, закройте его, прежде чем открывать новый.",

	// Событие раздачи подарков
	event_gw_reroll_win_msg:
		"Поздравляем ${winners}! Вы выиграли **${prize}**!",
	event_gw_reroll_cannot_win_msg:
		"Нет действительных участников, поэтому победитель не может быть определен!",
	event_gw_finnish_msg: "Поздравляем ${winners}! Вы выиграли **${prize}**!",
	event_gw_finnish_cannot_msg:
		"Нет действительных участников, поэтому победитель не может быть определен!",
	event_gw_finnish_button_title: "Розыгрыш завершен",
	event_gw_entries_button_title: "Список участников",
	event_gw_removeentries_msg: "${author}, вы покинули этот конкурс!",
	event_gw_leave_button_placeholder: "Покинуть розыгрыш",
	event_gw_confirm_leave_msg:
		"${author}, вы уверены, что хотите покинуть этот розыгрыш?",
	event_gw_embed_desc:
		"Заканчивается: ${end_string} (${end_string2})\nОрганизатор: <@${hostedBy}>\nЗаписи: **0**\nПобедители: **${winners_amount}**",
	event_gw_ended_embed_desc:
		"Завершено: ${time1} (${time2})\nПровел: <@${hostedBy}>\nЗаписи **${entrieCount}**\nПобедители: ${winners}",
	event_gw_entries_words: "Записи",
	event_gw_ended_word:
		"Завершено: ${ended} (${time2})\nОрганизатор: <@${hostedBy}>\nЗаписи **${entries}**\nПобедители: ${winners}",
	event_gw_break_req:
		"${emoji_No} Вы не соответствуете необходимым условиям для участия в этом розыгрыше.\nТип: `${requirementType}`\nЗначение: `${requirementValue}`",

	// Событие логов улучшения
	event_boostlog_add:
		"<@${newMemberUserId}> **только что улучшил(а)** сервер! (**${boostCount}** всего улучшений)",
	event_boostlog_sub:
		"<@${newMemberUserId}> **только что убрал(а) свой улучшение** с сервера! (**${boostCount}** всего улучшений)",

	// Модуль Экономики
	economy_disable_msg:
		"<@${authorId}>, `Модуль Экономики` на этом сервере **отключен**. Теперь вы не можете использовать модуль экономики!",

	// Permission Event
	event_permission_wrong:
		"${author}, вам не разрешено использовать эту команду! Необходимое разрешение: ${neededPerm}",

	// Модуль TempVoice
	// Все компоненты, глобальные переменные...

	// Глобальные переменные

	temporary_voice_title_embec:
		"## Изменения в вашем временном голосовом канале",
	temporary_voice_unblocked_member: "Разблокированные участники",
	temporary_voice_blocked_mmeber: "Заблокированные участники",
	temporary_voice_no_one: "Никто",
	temporary_voice_new_member: "Новый владелец",
	temporary_voice_old_member: "Старый владелец",
	temporary_voice_modal_title: "Панель управления голосом iHorizon",
	temporary_voice_new_userlimit: "Новый лимит пользователей",
	temporary_voice_new_name: "Новое название",
	temporary_voice_new_region: "Новый регион",
	temporary_voice_untrusted_member: "Ненадежные участники",
	temporary_voice_trusted_member: "Доверенные участники",

	// Кнопки
	temporary_voice_block_button_menu_placeholder:
		"Выбранные пользователи не будут допущены",

	temporary_voice_delete_button_desc_embed:
		"## Удаление канала\nКанал успешно удален!",

	temporary_voice_limit_button_menu_label:
		"Каков лимит пользователей канала?",
	temporary_voice_limit_button_not_integer:
		"${emoji_No} | Введенное значение не является числом",

	temporary_voice_name_button_menu_label: "Какое название канала?",

	temporary_voice_privacy_menu_placeholder:
		"Выберите параметр конфиденциальности",
	temporary_voice_privacy_menu_lock_label: "Заблокировать канал",
	temporary_voice_privacy_menu_lock_desc:
		"Только доверенные пользователи смогут присоединиться к вашему голосовому каналу",
	temporary_voice_privacy_menu_unlock_label: "Разблокировать канал",
	temporary_voice_privacy_menu_unlock_desc:
		"Все смогут присоединиться к вашему голосовому каналу",
	temporary_voice_privacy_menu_invisible_label: "Невидимый",
	temporary_voice_privacy_menu_invisible_desc:
		"Только доверенные пользователи смогут видеть ваш голосовой канал",
	temporary_voice_privacy_menu_visible_label: "Видимый",
	temporary_voice_privacy_menu_visible_desc:
		"Все смогут видеть ваш голосовой канал",
	temporary_voice_privacy_menu_closechat_label: "Закрыть чат",
	temporary_voice_privacy_menu_closechat_desc:
		"Только доверенные пользователи смогут отправлять сообщения в ваш чат",
	temporary_voice_privacy_menu_openchat_label: "Открыть чат",
	temporary_voice_privacy_menu_openchat_desc:
		"Все смогут отправлять сообщения в ваш чат",

	temporary_voice_region_menu_placeholder: "Выберите регион",

	temporary_voice_transfer_menu_placeholder:
		"Выбранный пользователь для передачи голосового канала",

	temporary_voice_transfer_trust_placeholder:
		"Выбранные пользователи будут доверены для присоединения",

	temporary_voice_transfer_unblocked_placeholder:
		"Выбранные пользователи будут разблокированы для присоединения",

	temporary_voice_transfer_untrust_placeholder:
		"Выбранные пользователи не будут доверены для присоединения",

	temporary_voice_channel_name: "Канал {nickname}",

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
	tempvoice_cfg_remove_hub: "Убрать канал создания",
	tempvoice_cfg_saved: "TempVoice settings saved!",
	tempvoice_cfg_expired: "Configuration panel expired. Run /tempvoice again.",
	tempvoice_cfg_modal_title: "Set the channel name",
	tempvoice_cfg_modal_label: "Name | Variable: {Username}",
	// Модуль Защиты
	// Сообщение о событии

	protection_avoid_channel_delete:
		"**РЕЖИМ ЗАЩИТЫ ВКЛЮЧЕН**\n<@${channelGuildOwnerId}>, канал был воссоздан, <@${executorId}> пытался удалить канал!",
	protection_blockbot_embed_title: "⚠️ Опасность в ${memberGuildName} ⚠️",
	protection_blockbot_embed_desc:
		"# Предупреждение о добавлении бота\nКто-то попытался добавить Discord бота.",
	var_target_bot: "Целевой бот",
	var_not_detected: "Не обнаружен",

	// Модуль AntiSpam
	// Событийное сообщение

	// Базовое предупреждающее сообщение
	antispam_base_warn_message:
		"Внимание, ${mentionedMembers}, вы спамите и можете быть наказаны.",

	// Дополнительные предупреждающие сообщения в зависимости от типа наказания
	antispam_more_ban_msg:
		" Если вы продолжите, вы будете забанены на сервере.",
	antispam_more_mute_msg: " Если вы продолжите, вы будете отключены.",
	antispam_more_kick_msg:
		" Если вы продолжите, вы будете исключены с сервера.",

	// Встроенные логи AntiSpam
	antispam_log_embed_title: "[AntiSpam] Новый ${actionType}",
	antispam_log_embed_desc: "${bot} **${actionType}** ${user}",

	// Гибридные Команды
	// Сообщение о Событии

	hybridcommands_global_prefix_mention: "`@Ping-Me`",
	hybridcommands_global_prefix_cleaned_mention: "@Ping-Me ",
	hybridcommands_args_error_embed_desc:
		'```ts\nНазвание команды: ${currentCommandName}\n```\n```cs\n${botPrefix}${fullNameCommand} ${argsString}\n${errorPosition}\nОшибка при отправке аргумента "${wrongArgumentName}".\n```',
	hybridcommands_embed_help_title: "${commandName} Встроенная Помощь",
	hybridcommands_embed_help_fields_value:
		"**Псевдонимы:** ${aliases}\n**Использование:** ${use}",
	hybridcommands_embed_footer_text:
		"Параметры в [...] обязательны, а параметры в <...> — необязательны.\nИспользуйте команду: ${botPrefix}help [command] для получения дополнительной информации.",

	ping_bot_show_info_msg:
		"Привет ${messageAuthor}, я на 100% используюсь в `Slash Command` (${emoji_Slash_Bot_Badge}) и более чем на 85% в командном префиксе. Мой префикс на **этом сервере** — `${prefix}` !",
	ping_bot_show_info_msg_about_change_prefix:
		"\n-# ${emoji_VC_OpenChat} Не нравится мой префикс? Используй **`/guildconfig bot prefix`**, чтобы изменить его!",

	// Модуль уведомлений
	notifier_on_new_media_default_message:
		"@everyone **[{artistAuthor}](<{artistLink}>)** опубликовал новое видео [Нажмите здесь]({mediaURL})",
	notifier_on_new_media_default_button_label: "Смотреть!",
	notifier_generateAuthorsEmbed_embed_desc:
		"Это список всех стримеров/ютуберов:\n",
	notifier_generateAuthorsEmbed_embed_title:
		"Все стримеры/ютуберы на сервере",
	notifier_generateConfigurationEmbed_embed_title:
		"Конфигурация модуля уведомлений",
	notifier_generateConfigurationEmbed_embed_fields_1_name:
		"Канал уведомлений",
	notifier_generateConfigurationEmbed_embed_fields_2_name:
		"Сообщение уведомления",

	// ButtonReaction
	buttonreaction_role_doesnt_exit:
		"Роль в моей базе данных больше не существует на сервере!",
	buttonreaction_role_too_high:
		"Роль слишком высокая, я не могу дать/удалить эту роль. Мне нужно изменить свои права!",
	buttonreaction_role_add: "Теперь у вас есть роль ${role} :tada:",
	buttonreaction_role_remove: "У вас больше нет роли ${role} ✅",
	rolepanel_setup_embed_title: "Настройка панели ролей",
	rolepanel_setup_embed_desc:
		"Выберите роли, чтобы добавить или удалить их у ${member}. Если у ${member} уже есть выбранная роль, она будет удалена. Недоступные роли будут проигнорированы.",
	rolepanel_setup_embed_roles_field: "Разрешённые роли",
	rolepanel_setup_embed_refused_field: "Отклонённые роли",
	rolepanel_setup_select_placeholder: "Выберите роли для панели",
	rolepanel_setup_apply_button: "Создать панель",
	rolepanel_setup_no_roles: "Не выбрано ни одной допустимой роли.",
	rolepanel_setup_saved: "Панель ролей отправлена.",
	rolepanel_panel_embed_title: "Панель ролей",
	rolepanel_panel_embed_desc:
		"Выберите роли, чтобы добавить или удалить их из профиля.",
	rolepanel_panel_select_placeholder: "Выберите ваши роли",
	rolepanel_role_managed_or_everyone: "Системная роль или @everyone",
	rolepanel_role_too_high_bot: "Роль выше роли бота",
	rolepanel_role_too_high_user: "Роль выше вашей",
	rolepanel_role_missing_permissions: "Отсутствующие права: ${permissions}",
	rolepanel_logs_embed_title_create: "Логи панели ролей",
	rolepanel_logs_embed_desc_create:
		"<@${authorId}> создал панель ролей (${messageId}) с: ${roles}",
	rolepanel_logs_embed_title_apply: "Логи использования панели ролей",
	rolepanel_logs_embed_desc_apply:
		"<@${authorId}> изменил роли <@${memberId}> через панель. Добавлены: ${addedRoles} | Удалены: ${removedRoles}",

	// AuthRestore HTML
	rc_created_by: "Создано пользователем:",
	rc_created_on: "Создано на:",
	rc_total_membres: "Всего участников",
	rc_total_verification: "Всего проверок",
	rc_total_key_used_count: "Количество использований ключа",
	rc_recent_locales_distribution: "Распределение локалей участников",
	rc_recent_verifications: "Недавние проверки",
	rc_registration_over_time: "Регистрации с течением времени",

	// Модуль ТолькоКартинки
	piconly_module_punish_msg:
		"${messageAuthor}, вы получили тайм-аут на 10 минут за отправку слишком большого количества сообщений без изображений в канале, предназначенном только для изображений.",
	piconly_module_warn_msg:
		"${messageAuthor}, этот канал принимает только сообщения, содержащие изображения (допустимые форматы: JPG, PNG, GIF, WEBP, BMP, TIFF). Предупреждение ${userWarningCount}/${threshold}",
	piconly_module_timeout_reason:
		"Спам сообщениями без изображений в канале только для изображений",

	// Nick Kicker Event
	event_nick_kicker_kick_reason:
		"Запрещенное слово в имени пользователя - Кикер никнеймов",
	event_nick_kicker_kick_msg:
		"На сервере `${memberGuildName}` ваше имя пользователя содержит запрещенное слово. Вы были исключены с сервера.",

	// Модуль аватаров
	pfps_embed_user_title: "**Пользовательский** аватар ${username}",
	pfps_embed_guild_title: "**Серверный** аватар ${username}",
	pfps_download_user_button: "Скачать аватар пользователя",
	pfps_download_guild_button: "Скачать аватар сервера",
	// -----------------------------/ \-----------------------------

	// AddRoleReact Command
	addrolereact_role_not_found: "Роль не найдена.",
	addrolereact_cannot_check_permissions: "Невозможно проверить ваши права.",
	addrolereact_role_too_high:
		"Невозможно добавить роль, превышающую или равную вашей наивысшей роли.",
	addrolereact_must_be_text_channel:
		"Эта команда должна быть выполнена в текстовом канале.",
	addrolereact_message_not_found: "Сообщение не найдено.",
	addrolereact_no_reactions: "Это сообщение не имеет реакций.",
	addrolereact_adding_role: "Добавление роли {role}...",
	addrolereact_adding_role_progress:
		"Добавление роли {role} для {count} пользователей...",
	addrolereact_role_added:
		"Роль {role} добавлена. {count} пользователей получили роль.",
	addrolereact_error: "Ошибка при выполнении команды.",

	// Команды скрытия/показа каналов
	channel_hide_in_progress: "Скрытие текущего канала...",
	channel_hide_success: "Канал был скрыт от @everyone",
	channel_hide_already_hidden: "Этот канал уже скрыт от @everyone",
	channel_unhide_in_progress: "Показ текущего канала...",
	channel_unhide_success: "Канал теперь виден для @everyone",
	channel_unhide_already_visible: "Этот канал уже виден для @everyone",
	channel_hideall_in_progress: "Скрытие всех каналов в процессе...",
	channel_hideall_success:
		"**Скрытие завершено!**\n**Статистика:**\n• **{hiddenCount}** каналов скрыто\n• **{errorCount}** ошибок обнаружено",
	channel_hideall_error: "Произошла ошибка при скрытии каналов.",
	channel_unhideall_in_progress: "Показ всех каналов в процессе...",
	channel_unhideall_success:
		"**Показ завершен!**\n**Статистика:**\n• **{unhiddenCount}** каналов показано\n• **{errorCount}** ошибок обнаружено",
	channel_unhideall_error: "Произошла ошибка при показе каналов.",

	// ru-RU.yml (Russian - Russia)
	new_guild_embed_title: [
		"Добро пожаловать на ваш сервер! 🎉",
		"Приветствую, дорогие друзья Discord! 👋",
		"iHorizon присоединился к чату! 💬",
		"Это птица, это самолёт, нет, это iHorizon! 🦸‍♂",
		"Давайте тепло поприветствуем iHorizon! 🔥",
		"Новое приключение начинается! 🚀",
		"Фантастический участник прибыл! ✨"
	],
	new_guild_embed_desc:
		"## ${randomMessage}\nПривет, удивительные друзья!\n\nЯ iHorizon, продвинутый бот, созданный для того, чтобы сделать ваш Discord опыт исключительным и полным веселья.\n\n✨ **Что я могу сделать для вас:**\n• Управление сервером с интеллектом и профессионализмом\n• Интерактивные игры и безграничные развлечения\n• Полезные инструменты для организации сообщества\n• Техническая поддержка 24/7\n\nИсследуйте мои команды и погрузитесь в мир бесконечных возможностей.\nВместе мы построим фантастическое сообщество, полное прекрасных воспоминаний!\n\nСпасибо за то, что выбрали меня, давайте начнём это невероятное приключение! 🌟",
	new_guild_owner_dm_title: "Добро пожаловать в семью iHorizon!",
	new_guild_owner_dm_description:
		"# Спасибо, что добавили iHorizon на свой сервер!\n\n> *Подождите... Это всё? Нет, совсем нет.*\n\niHorizon — это Discord бот, да? Но не только. Это также сообщество, история, проект, создаваемый более 6 лет (2020).\nИспользовать iHorizon — это не просто иметь полного Discord бота, навсегда **бесплатного** и **открытого**. Это также принять **концепцию**.\n\n> **Бесплатный Discord бот может работать лучше платных.**\n*Да, это iHorizon: полный бот, поддерживаемый 6 лет увлечёнными людьми.*\n\nТак что да... после этого сообщения, спасибо.\nМы легион. #ihorizon",
	guild_create_btn_invite: "Пригласить iHorizon",
	guild_create_btn_website: "Сайт iHorizon",
	guild_create_btn_search: "Поиск iHorizon",
	guild_create_btn_repos: "Репозитории iHorizon",
	guild_create_btn_support: "Сервер поддержки",
	guild_create_btn_docs: "Документация iHorizon",
	bot_server_bio:
		"{wink_emoji} **iHorizon Discord Bot** **`+{count} команд`**\n> *« Сделано людьми с 2022 года для вашего сообщества. »*\n**https://www.ihorizon.org**",
	guild_leave_data_clear_notice_title: "iHorizon покинул ${guildName}",
	guild_leave_data_clear_notice_description:
		"Уааа, это грустно. Вы выгнали бота с `${guildName}`. Данные сервера будут удалены ${deleteAt}, если iHorizon не вернётся до этого времени.",
	guild_leave_data_clear_notice_message:
		"Уааа, это грустно. Вы выгнали iHorizon с `${guildName}`. Данные будут удалены ${deleteAt}.",
	guild_leave_data_clear_cancelled_title: "iHorizon вернулся на ${guildName}",
	guild_leave_data_clear_cancelled_description:
		"Урааа, спасибо, что добавили iHorizon обратно на `${guildName}`. Запланированное удаление данных отменено.",
	guild_leave_data_clear_cancelled_message:
		"Урааа, спасибо, что добавили iHorizon обратно на `${guildName}`. Данные вашего сервера в безопасности.",

	// Confession Event
	confession_embed_logs_title: "Новое признание",
	confession_channel_button_name: "Ответить анонимно",
	confession_1_embed_log_title: "Новый ответ на признание",

	// Context Menu Interaction
	global_unknown_message: "Сообщение не найдено.",
	global_error: "❌ Ошибка",
	global_not_atc: "В выбранном сообщении нет вложений.",
	global_not_valid_atc:
		"Выбранное вложение не является допустимым аудиофайлом.",
	global_too_heavy_file:
		"Созданный MP4 файл слишком большой (${fileSize} MB). Лимит Discord — 25 MB.",
	global_convert_ok: "✅ Конвертация выполнена успешно",
	global_convert_ok_desc:
		"Ваш аудиофайл был конвертирован в MP4 (${fileSize} MB).",

	// Economy logs titles
	economy_logs_add_money_title: "Логи экономики - Добавление денег",
	economy_logs_remove_money_title: "Логи экономики - Удаление денег",
	economy_logs_boost_role_title: "Логи экономики - Буст роли",
	economy_logs_config_title: "Логи экономики - Настройка модуля",
	economy_logs_role_add_title: "Логи экономики - Роль добавлена в магазин",
	economy_logs_role_remove_title: "Логи экономики - Роль удалена из магазина",
	economy_logs_pay_title: "Логи экономики - Платёж",
	economy_logs_rob_title: "Логи экономики - Ограбление",
	economy_logs_set_cooldown_title: "Логи экономики - Установка кулдауна",
	economy_logs_set_money_title: "Логи экономики - Установка денег",
	economy_logs_withdraw_title: "Логи экономики - Снятие",
	economy_logs_deposit_title: "Логи экономики - Пополнение",

	// Economy logs descriptions
	economy_logs_add_money_desc: "{author} добавил {target} `{amount}$` {coin}",
	economy_logs_remove_money_desc:
		"{author} удалил у {target} `{amount}$` {coin}",
	economy_logs_boost_role_desc:
		"{author} установил буст для роли {role}. Текущий буст: `x{amount}`",
	economy_logs_config_desc: "{author} {state} модуль экономики",
	economy_logs_role_add_desc:
		"{author} добавил роль {role} в магазин. Цена: `{amount}$`",
	economy_logs_role_remove_desc: "{author} удалил роль {role} из магазина.",
	economy_logs_pay_desc:
		"{author} отправил `{amount}$` пользователю {target}",
	economy_logs_rob_desc: "{author} ограбил {target} на `{amount}$`",
	economy_logs_set_cooldown_desc:
		"{author} установил кулдаун `{type}` на **{time}**",
	economy_logs_set_money_desc:
		"{author} установил деньги `{type}` на **{money}**",
	economy_logs_withdraw_desc: "{author} снял **${money}** из банка",
	economy_logs_deposit_desc: "{author} пополнил банк на **${money}**",

	// Generic vars
	var_on: "включено",
	var_off: "выключено",
	global_command_cooldown_msg:
		"${emoji} Вам нужно подождать **${time}** между каждым использованием **`${ctxCommandPath}`**",

	global_warn_embed_title: "Вы получили предупреждение – Дело **`${id}`**",
	global_warn_embed_desc:
		"> **Причина:** ${reason}\n> **Ответственный:** @${authorUsername} (*${authorRolesHighestName}*)\nПредупреждение создано ${time}",
	global_warn_component_button_label: "Отправлено с ${authorGuildName}",

	counter_error_too_much_u:
		"<@${messageAuthorId}> ОШИБСЯ НА **${number}**!! Следующее число — **1**. **Нельзя считать два раза подряд.**",
	counter_error_syntaxic:
		"<@${messageAuthorId}> СОВЕРШИЛ ОШИБКУ!! Следующее число — **1**.",

	global_blacklist_msg_to_send:
		"Вы были автоматически заблокированы на этом сервере, потому что ваш аккаунт находится в глобальном черном списке iHorizon.\n\nПричина: `${reason}`\n\nСогласно разделу 3 наших Условий использования, серверы, использующие iHorizon, соглашаются с тем, что бот может автоматически применять санкции, связанные с этим глобальным черным списком.\n\nЕсли вы считаете, что это ошибка или хотите оспорить это решение, вы можете подать апелляцию здесь:\nAppeal: <https://www.ihorizon.org/appeal>\n\nУсловия использования: <https://www.ihorizon.org/tos>",
	global_blacklist_reason:
		"Наказание проекта iHorizon - Чёрный список | Причина: ${reason}",
	server_blacklist_msg_to_send:
		"Вы были заблокированы, так как находитесь в чёрном списке этого сервера.\nПричина: `${data2Reason}`",
	server_blacklist_reason: "Чёрный список | Причина: ${data2Reason}",
	help_sticky_fields: "Sticky",
	help_sticky_dsc:
		"> *Держите важное сообщение всегда видимым в ваших каналах с автоматической повторной публикацией.*",
	sticky_channel_command_error:
		"${emoji_No} | ${author}, я не смог найти подходящий текстовый канал.",
	sticky_text_command_missing_message:
		"${emoji_No} | ${author}, вам нужно указать sticky-сообщение.",
	sticky_text_command_work:
		"${emoji_Yes} | ${author}, текстовое sticky-сообщение теперь активно в ${channel}.",
	sticky_embed_command_embed_not_found:
		"${emoji_No} | ${author}, я не смог найти embed `${embed_id}`.",
	sticky_embed_command_work:
		"${emoji_Yes} | ${author}, sticky-embed `${embed_id}` теперь активен в ${channel}.",
	sticky_disable_command_not_found:
		"${emoji_No} | ${author}, в ${channel} не настроено sticky-сообщение.",
	sticky_disable_command_work:
		"${emoji_Yes} | ${author}, sticky-сообщение было отключено в ${channel}.",
	sticky_refresh_command_not_found:
		"${emoji_No} | ${author}, в ${channel} не настроено sticky-сообщение.",
	sticky_refresh_command_missing_embed:
		"${emoji_No} | ${author}, sticky-сообщение в ${channel} ссылается на embed, которого больше не существует.",
	sticky_refresh_command_missing_permissions:
		"${emoji_No} | ${author}, я не могу заново опубликовать sticky-сообщение в ${channel}. Проверьте мои права.",
	sticky_refresh_command_work:
		"${emoji_Yes} | ${author}, sticky-сообщение было заново опубликовано в ${channel}.",
	sticky_show_command_not_found:
		"${emoji_No} | ${author}, в ${channel} не настроено sticky-сообщение.",
	sticky_show_embed_title: "Конфигурация sticky-сообщения",
	sticky_show_embed_fields_channel: "Канал",
	sticky_show_embed_fields_type: "Тип",
	sticky_show_embed_fields_status: "Статус",
	sticky_show_embed_fields_message: "Сообщение",
	sticky_show_embed_fields_embed: "ID embed",
	sticky_show_embed_fields_last_message: "ID последнего sticky-сообщения",
	sticky_list_embed_title: "Sticky-каналы",
	sticky_list_embed_desc_empty:
		"На этом сервере не настроен ни один sticky-канал.",
	sticky_list_embed_desc_line_text: "${channel} - Текстовый sticky",
	sticky_list_embed_desc_line_embed:
		"${channel} - Sticky с embed (`${embed_id}`)",
	sticky_list_embed_desc_line_text_embed:
		"${channel} - Текст + embed sticky (`${embed_id}`)",
	sticky_var_text: "Текст",
	sticky_var_embed: "Embed",
	sticky_var_text_embed: "Текст + embed",
	sticky_var_enabled: "Включено",
	sticky_var_disabled: "Отключено",
	sticky_var_none: "Нет",

	// /honeypot config
	honeypot_config_not_allowed:
		"Вы должны быть администратором или находиться в allowlist, чтобы настраивать Honeypot.",
	honeypot_config_embed_title: "Настройка Honeypot",
	honeypot_config_embed_desc:
		"Настройте канал-ловушку, канал логов и автоматическое действие, которое используется, когда кто-то начинает отправлять сообщения в канале *Honeypot*.",
	honeypot_config_embed_field_status: "Статус",
	honeypot_config_embed_field_trap_channel: "Канал-ловушка",
	honeypot_config_embed_field_logs_channel: "Канал логов",
	honeypot_config_embed_field_action: "Действие",
	honeypot_config_embed_field_message: "Отправленное сообщение",
	honeypot_config_embed_field_notes: "Примечания",
	honeypot_config_embed_field_credit: "Благодарности",
	honeypot_config_notes_value:
		"- **Разместите роль iHorizon выше всех ролей участников.**\n- **Автоматически созданные каналы Honeypot перемещаются в самый верх сервера.**\n- **Вы можете переименовать канал Honeypot без поломки системы.**",
	honeypot_config_credit_value: "*Вдохновлено Honeypot от RiskyMH*\n${url}",
	honeypot_config_select_trap_placeholder: "Выберите канал-ловушку",
	honeypot_config_select_logs_placeholder: "Выберите канал логов",
	honeypot_config_select_action_placeholder: "Выберите действие",
	honeypot_config_button_send: "Отправить embed",
	honeypot_config_button_preview: "Предпросмотр",
	honeypot_config_button_enable: "Включить Honeypot",
	honeypot_config_button_disable: "Выключить Honeypot",
	honeypot_config_send_success: "Embed Honeypot был отправлен в ${channel}.",
	honeypot_config_enable_success: "Honeypot теперь включен в ${channel}.",
	honeypot_config_disable_success: "Honeypot теперь выключен.",
	honeypot_config_missing_logs_channel:
		"Перед включением Honeypot необходимо настроить канал логов.",
	honeypot_config_generic_error: "Произошла ошибка при обновлении Honeypot.",
	honeypot_config_select_action_kick: "Исключить пользователей",
	honeypot_config_select_action_ban: "Забанить пользователей",
	honeypot_config_select_action_none: "Только удалить сообщения",
	honeypot_config_select_action_del_messages: "Удалить сообщения",
	honeypot_default_channel_name: "🍯・obshiy-chat",
	honeypot_action_none: "Только удалять сообщения",
	honeypot_action_failed: "Действие не выполнено",
	honeypot_dm_action_kicked: "ты был выпроченный!",
	honeypot_dm_action_banned: "ты был забанен!",
	honeypot_dm_action_none: "твои сообщения были удалены",
	honeypot_trap_embed_title: "НЕ ОТПРАВЛЯЙТЕ СООБЩЕНИЯ В ЭТОТ КАНАЛ",
	honeypot_trap_embed_desc:
		"*Этот канал используется для ловли спам-ботов.*\n*Любое сообщение, отправленное здесь, **ЗАПУСТИТ** автоматическую защиту сервера.*",
	honeypot_trap_embed_footer:
		"Вдохновлено Honeypot от RiskyMH, посмотрите!\n${url}",
	honeypot_dm_title: "Honeypot сработал!",
	honeypot_dm_desc:
		"Сообщение, которое вы отправили в канал *Honeypot* на следующем сервере: **`${guild}`** **запустило** настроенную защиту.\n\n__Действие, принятое против вас:__ **`${action}`**\n\n*Сообщения, которые вы отправили за последние 2 часа, удаляются с сервера. Если вы считаете, что вас взломали, измените пароль и включите 2FA в вашем аккаунте Discord. Если это была ошибка с вашей стороны, обратитесь к команде сервера для решения проблемы.*",
	honeypot_log_title: "Срабатывание Honeypot - ${action}",
	honeypot_log_field_author: "Автор",
	honeypot_log_field_channel: "Канал",
	honeypot_log_field_message: "Удалённое сообщение",
	honeypot_log_field_attachments: "Вложения",
	honeypot_log_field_stickers: "Стикеры",
	honeypot_log_field_embeds: "Embeds",
	honeypot_log_field_deleted_messages: "Удалённые сообщения",
	honeypot_log_field_triggered_messages: "Сообщения, вызвавшие срабатывание",
	honeypot_log_field_dm_status: "Статус ЛС",
	honeypot_log_field_result: "Результат",
	honeypot_log_dm_open: "Доставлено",
	honeypot_log_dm_closed: "Закрыто или недоступно",
	honeypot_log_no_content: "Нет текстового содержимого",
	honeypot_log_action_ban: "Пользователь заблокирован",
	honeypot_log_action_kick: "Пользователь исключен",
	honeypot_log_action_none: "Действие не предпринято",

	// Модуль TTS
	// /tts join, /tts leave, /tts info, /tts lang

	help_tts_fields: "TTS",
	help_tts_dsc:
		"> *Преобразуйте текст в речь в голосовых каналах с iHorizon!*",

	// /tts join
	tts_join_not_in_voice:
		"${emoji_No} Вы должны быть подключены к голосовому каналу, чтобы использовать эту команду!",
	tts_join_already_enabled:
		"${emoji_No} Модуль TTS уже активирован на этом сервере!",
	tts_join_music_playing:
		"${emoji_No} На этом сервере сейчас играет музыка. Пожалуйста, остановите музыку перед активацией TTS.",
	tts_join_enabled: "${emoji_Yes} Режим TTS активирован в ${voiceChannel}!",
	tts_join_error: "${emoji_No} Произошла ошибка при активации режима TTS.",
	tts_join_lang_fallback: "ru-RU",

	// /tts leave
	tts_leave_not_active:
		"${emoji_No} Модуль TTS в настоящее время не активен на этом сервере!",
	tts_leave_not_in_voice:
		"${emoji_No} Вы должны быть в голосовом канале TTS, чтобы отключить его!",
	tts_leave_disabled: "${emoji_Yes} Режим TTS отключен на этом сервере!",

	// /tts info
	tts_info_embed_title: "Информация о модуле TTS",
	tts_info_embed_description:
		"Модуль TTS (Text-to-Speech) позволяет iHorizon читать сообщения вслух в голосовом канале. Когда он активирован, каждое сообщение, отправленное в настроенном текстовом канале участниками голосового канала, будет озвучено iHorizon.",
	tts_info_field_status: "Статус",
	tts_info_field_lang: "Язык TTS",
	tts_info_field_howto: "Как использовать",
	tts_info_howto_value:
		"Используйте `/tts join`, чтобы запустить TTS в вашем голосовом канале.\nИспользуйте `/tts leave`, чтобы остановить TTS.\nИспользуйте `/tts lang`, чтобы изменить язык голоса.",

	// /tts lang
	tts_lang_not_active:
		"${emoji_No} Модуль TTS в настоящее время не активен на этом сервере!",
	tts_lang_set: "${emoji_Yes} Язык TTS установлен на `${language}`.",

	// TTS Embed
	tts_embed_title: "Режим TTS Активирован",
	tts_embed_description:
		"Модуль TTS теперь активен в ${voiceChannel}.\nВсе сообщения, отправленные здесь участниками голосового канала, будут прочитаны вслух.\n\n**Участники в голосовом канале:** ${members}",
	tts_embed_footer: "Используйте /tts leave, чтобы остановить TTS",
	tts_join_not_text_based:
		"${emoji_No} Этот голосовой канал не поддерживает текстовые сообщения. Пожалуйста, включите текст в голосовом канале или используйте другой голосовой канал.",
	tts_music_blocked:
		"${emoji_No} Модуль TTS в настоящее время активен. Пожалуйста, отключите TTS перед воспроизведением музыки.",
	tts_voice_status: "Режим TTS - Синтез Речи",

	// H24/7 module
	// /h247 join, /h247 leave

	help_h247_fields: "H24/7",
	help_h247_dsc: "> *Держите iHorizon на связи 24/7 в голосовом канале!*",

	// /h247 join
	h247_join_invalid_channel:
		"${emoji_No} Пожалуйста, укажите действительный голосовой канал!",
	h247_join_already_active:
		"${emoji_No} Модуль H24/7 уже активен в ${voiceChannel}!",
	h247_join_music_playing:
		"${emoji_No} На этом сервере сейчас играет музыка. Остановите музыку перед включением модуля H24/7.",
	h247_join_tts_active:
		"${emoji_No} Модуль TTS сейчас активен в другом голосовом канале. Отключите TTS перед включением модуля H24/7.",
	h247_joined:
		"${emoji_Yes} Теперь iHorizon будет на связи 24/7 в ${voiceChannel}!",
	h247_join_error: "${emoji_No} Произошла ошибка при включении модуля H24/7.",

	// /h247 leave
	h247_leave_not_active:
		"${emoji_No} Модуль H24/7 сейчас не активен на этом сервере!",
	h247_left: "${emoji_Yes} Модуль H24/7 был отключен на этом сервере!",
	h247_leave_error:
		"${emoji_No} Произошла ошибка при отключении модуля H24/7.",

	// /h247 info
	h247_info_embed_title: "Информация о модуле H24/7",
	h247_info_embed_description:
		"Модуль H24/7 держит iHorizon на связи в голосовом канале круглосуточно, даже без воспроизведения музыки. Это полезно для поддержания голосовой серии сервера.\nПока этот модуль активен, музыка и TTS работают только в голосовом канале H24/7.\nСоединение автоматически восстанавливается после перезапусков или остановки плеера.",
	h247_info_field_status: "Статус",
	h247_info_field_howto: "Как использовать",
	h247_info_howto_value:
		"Используйте `/h247 join`, чтобы оставить iHorizon в голосовом канале.\nИспользуйте `/h247 leave`, чтобы отключить модуль.\nИспользуйте `/h247 info`, чтобы показать эту панель.",

	// /music play
	h247_play_refused:
		"${emoji_No} На этом сервере активен модуль H24/7. Зайдите в голосовой канал H24/7, чтобы включить музыку!",

	// /tts join
	h247_tts_refused:
		"${emoji_No} На этом сервере активен модуль H24/7. Зайдите в голосовой канал H24/7, чтобы включить TTS!",
	gw_go_duration_too_low:
		"${emoji_No} | Минимальная длительность — 3 минуты!",

	// Components V2 cards: /avatar, /serverinfo, /allbots
	avatar_card_title: "Аватар ${user}",
	card_download: "Скачать",
	serverinfo_label_owner: "Владелец",
	serverinfo_label_members: "Участники",
	serverinfo_label_created: "Создан",
	serverinfo_label_joined: "Вы вступили",
	serverinfo_label_roles: "Роли",
	serverinfo_label_channels: "Каналы",
	serverinfo_label_boosts: "Бусты",
	serverinfo_boost_value: "${count} (уровень ${tier})",
	serverinfo_label_verification: "Проверка",
	serverinfo_label_language: "Язык",
	serverinfo_label_id: "ID",
	serverinfo_verif_none: "Нет",
	serverinfo_verif_low: "Низкий",
	serverinfo_verif_medium: "Средний",
	serverinfo_verif_high: "Высокий",
	serverinfo_verif_highest: "Максимальный",
	all_bots_card_title: "Боты на ${guild}",
	all_bots_card_count: "Ботов: ${count}",
	all_bots_none: "На этом сервере нет ботов.",

	// Components V2 cards: /unbanall, /media-only, /nick-kicker, /sync, /wlroles
	unbanall_card_progress: "Разбан `${count}` участников…",
	unbanall_card_undo_progress: "Повторный бан `${count}` участников…",
	unbanall_card_title: "Разбанить всех",
	unbanall_card_undo_title: "Разбан отменён",
	unbanall_label_unbanned: "Разбанено",
	unbanall_label_banned: "Забанено снова",
	unbanall_label_failed: "Не удалось",
	sync_card_title: "Права синхронизированы",
	sync_card_desc: "Эти каналы теперь используют права ${category}:",
	media_only_card_title: "Каналы только для медиа",
	utils_label_save: "Сохранить",
	nick_kicker_card_title: "Кик по никнейму",
	nick_kicker_label_status: "Статус",
	nick_kicker_label_words: "Слова",
	wlroles_card_title: "Разрешённые роли",
	wlroles_card_warn_title: "Опасные права",
	wlroles_card_high_title: "Роли выше моей",

	// Components V2 cards: /userinfo, /banner, /inviteinfo, /serverpic, /where, /vc, /snipe
	userinfo_label_badges: "Значки",
	userinfo_label_username: "Имя пользователя",
	userinfo_label_created: "Аккаунт создан",
	userinfo_label_joined: "Вступил на сервер",
	userinfo_label_nitro: "Nitro",
	userinfo_label_roles: "Роли",
	userinfo_label_id: "ID",
	userinfo_card_loading: "Загрузка профиля…",
	banner_card_guild_title: "Баннер ${guild}",
	banner_card_user_title: "Баннер ${user}",
	inviteinfo_label_channel: "Канал",
	inviteinfo_label_inviter: "Пригласил",
	inviteinfo_label_created: "Сервер создан",
	inviteinfo_label_expires: "Истекает",
	inviteinfo_label_members: "Участники",
	inviteinfo_label_online: "В сети",
	inviteinfo_label_boosts: "Бусты",
	inviteinfo_label_features: "Функции",
	serverpic_card_title: "Значок ${guild}",
	serverpic_card_no_icon: "У этого сервера нет значка.",
	where_card_title: "Где ${member}",
	where_label_member: "Участник",
	where_label_channel: "Голосовой канал",
	where_label_stream: "Трансляция",
	where_label_video: "Камера",
	where_label_mute: "Микрофон выключен",
	where_label_deaf: "Звук выключен",
	vc_card_title: "Голосовая активность",
	vc_label_members: "Участники",
	vc_label_online: "В сети",
	vc_label_in_voice: "В голосовых",
	vc_label_streaming: "Трансляции",
	vc_label_boosts: "Бусты",
	vc_label_camera: "Камера включена",
	vc_label_muted: "Без микрофона",
	snipe_card_title: "Последнее удалённое сообщение",
	snipe_label_author: "Автор",
	snipe_label_sent: "Отправлено",

	// Components V2 cards: /delrole, /derank, /massiverole, /massmove, /nickrole, /setmentionrole, /util bringall, /util move
	utils_label_member: "Участник",
	utils_label_role: "Роль",
	utils_label_by: "Кем",
	utils_label_failed: "Ошибки",
	utils_label_from: "Откуда",
	utils_label_to: "Куда",
	utils_label_moved: "Перемещено",
	utils_label_name_filter: "Имя содержит",
	derank_card_progress: "Снимаю ${count} ролей с ${member}…",
	derank_card_title: "Роли участника сняты",
	derank_label_removed: "Снято ролей",
	massiverole_card_progress_add: "Выдаю роль ${count} участникам…",
	massiverole_card_progress_sub: "Снимаю роль с ${count} участников…",
	massiverole_card_title_add: "Роль выдана участникам",
	massiverole_card_title_sub: "Роль снята с участников",
	massiverole_label_added: "Получили",
	massiverole_label_already: "Уже была",
	massiverole_label_removed: "Лишились",
	massiverole_label_without: "Не было",
	nickrole_label_skipped: "Пропущено",
	massmove_card_title: "Участники перемещены",
	bringall_card_title: "Участники распределены",
	bringall_label_category: "Категория",
	bringall_label_channels: "Голосовые каналы",
	setmentionrole_card_title: "Роль за упоминание включена",
	setmentionrole_card_desc:
		"Когда участник упоминает меня, я выдаю ему эту роль.",
	setmentionrole_card_note:
		"Роль получают только участники, чьё имя пользователя или отображаемое имя содержит этот текст. Если они уберут его, роль будет снята и возвращена, когда они добавят его снова.",

	// Components V2 cards: /admin-users, /admin-roles, /allwebhooks, /role-members, /prevnames, /emojis, /leashlist, /locknamelist
	card_bot: "Бот",
	card_working: "Выполняется…",
	card_label_requested_by: "Запросил",
	card_label_failed: "Ошибки",
	admin_users_card_title: "Администраторы",
	admin_users_card_count: "Участников с правом администратора: ${count}",
	admin_users_card_only_bots: "Это право есть только у ботов.",
	admin_users_button_hide_bots: "Скрыть ботов",
	admin_users_button_show_bots: "Показать ботов",
	admin_users_card_done_title: "Администраторы понижены",
	admin_users_label_unranked: "Понижено участников",
	admin_roles_card_title: "Роли администратора",
	admin_roles_card_count: "Ролей с правом администратора: ${count}",
	admin_roles_card_managed: "Управляется интеграцией",
	admin_roles_card_done_title: "Право администратора снято",
	admin_roles_label_modified: "Изменено ролей",
	allwebhooks_card_count: "Вебхуков: ${count}",
	allwebhooks_button_delete: "Удалить все",
	role_members_card_title: "Участники ${role}",
	role_members_card_count: "Участников: ${count}",
	prevnames_card_title: "Прежние имена ${user}",
	prevnames_card_count: "Сохранено имён: ${count}",
	prevnames_button_erase: "Стереть мою историю",
	prevnames_label_username: "Имя пользователя",
	prevnames_label_display_name: "Отображаемое имя",
	prevnames_label_nickname: "Ник на ${guild}",
	emoji_card_title: "Эмодзи добавлены",
	emoji_card_count: "Создано эмодзи в ${guild}: ${count}",
	util_leashlist_card_count: "Активных поводков: ${count}",
	util_leashlist_card_expires: "Истекает",
	util_locknamelist_card_count: "Заблокированных ников: ${count}",
	util_locknamelist_card_by: "Заблокировал ${user}",

	// Components V2 cards: /invites, /leaderboard, /addinvites, /removeinvites
	invites_card_title: "Статистика приглашений",
	invites_label_total: "Всего",
	invites_label_regular: "Обычные",
	invites_label_left: "Ушли",
	invites_label_bonus: "Бонус",
	invites_label_invited_by: "Пригласил",
	leaderboard_card_title: "Рейтинг приглашений",
	leaderboard_card_count: "Участников в рейтинге ${guild}: ${count}",
	leaderboard_card_your_rank:
		"Ваше место: ${rank}/${count}, приглашений: ${invites}",
	leaderboard_card_not_ranked: "Вас пока нет в рейтинге.",
	leaderboard_card_empty: "На этом сервере пока ни у кого нет приглашений.",
	leaderboard_card_generated: "Сформировано за ${elapsed} мс",

	// Components V2 cards: /fun caracteres, catsay, hack, hug, kiss, slap, love, poll, question, tweet, youtube
	caracteres_card_title: "Выбери стиль текста",
	caracteres_card_result_title: "Твой текст в стиле ${style}",
	caracteres_label_original: "Исходный",
	caracteres_label_converted: "Преобразованный",
	catsay_card_title: "Кот сказал своё слово",
	hack_card_title: "Взлом завершён",
	hack_label_ip: "IP-адрес",
	hack_label_email: "Электронная почта",
	hack_label_password: "Пароль",
	hug_card_title: "Время обнимашек",
	hug_card_desc: "${author} крепко обнимает ${target}.",
	kiss_card_title: "Чмок",
	kiss_card_desc: "${author} целует ${target}.",
	slap_card_title: "Пощёчина",
	slap_card_desc: "${author} даёт пощёчину ${target}.",
	love_card_title: "Калькулятор любви",
	love_card_desc: "**${user1}** + **${user2}** = `${percent}%` любви",
	poll_card_title: "Опрос от ${author}",
	poll_card_vote: "Поставь ${yes}, если да, или ${no}, если нет.",
	question_card_title: "${author} спрашивает",
	question_label_question: "Вопрос",
	question_label_answer: "Ответ",
	tweet_card_title: "Новый пост от ${user}",
	youtube_card_title: "Новый комментарий от ${user}",

	// Components V2 cards: fun animal pictures (/cat /dog /dolphin /duck /fox /frog /panda /squirrel) and random results (/dice /heads-tails /number /rate /gay /trans /stench /transgender)
	fun_card_cat_title: "Мяу",
	fun_card_dog_title: "Гав-гав",
	fun_card_dolphin_title: "Иии-иии, щёлк-щёлк",
	fun_card_duck_title: "Кря-кря",
	fun_card_fox_title: "Ва-па-па-па-па",
	fun_card_frog_title: "Ква-ква",
	fun_card_panda_title: "Мваа",
	fun_card_squirrel_title: "Цок-цок",
	fun_card_animal_hint: "Случайная картинка, специально для тебя.",
	fun_card_dice_title: "Бросок костей",
	fun_card_coinflip_title: "Орёл или решка",
	fun_card_number_title: "Случайное число",
	fun_card_gay_title: "Гей-метр",
	fun_card_trans_title: "Транс-метр",
	fun_card_stench_title: "Вонь-метр",
	fun_card_rate_title: "Моя оценка",
	fun_card_transgender_title: "Аватар транс-прайда",
	fun_label_dice: "Кости",
	fun_label_rolls: "Броски",
	fun_label_total: "Итого",
	fun_label_result: "Результат",
	fun_label_range: "Диапазон",
	fun_label_score: "Счёт",
	fun_label_rated: "Оценено",

	// Components V2 cards: /ban, /kick, /baninfo, /banlist, /mutelist, /warnlist, /unwarn, /rolepanel
	mod_label_moderator: "Модератор",
	mod_label_warn_id: "ID предупреждения",
	ban_card_title: "Участник забанен",
	kick_card_title: "Участник исключён",
	baninfo_card_title: "Бан ${user}",
	banlist_card_title: "Забаненные участники",
	banlist_card_count: "Забанено: ${count}",
	mutelist_card_title: "Участники в тайм-ауте",
	mutelist_card_count: "В тайм-ауте: ${count}",
	mutelist_card_ends: "Закончится ${time}",
	mutelist_button_unmute_all: "Снять все тайм-ауты",
	mutelist_card_cleared_title: "Тайм-ауты сняты",
	mutelist_card_cleared_desc: "Участники снова могут писать: ${count}.",
	warnlist_card_title: "Предупреждения ${user}",
	warnlist_card_count: "Предупреждений: ${count}",
	unwarn_card_title: "Предупреждение снято",
	rolepanel_card_done_title: "Роли обновлены",
	rolepanel_label_added: "Добавлены",
	rolepanel_label_removed: "Сняты",
	rolepanel_label_refused: "Отклонены",

	// /stats rebuilt: Components V2 card and resvg pages
	stats_locale: "ru-RU",
	stats_view_overview: "Обзор",
	stats_view_overview_desc: "Итоги, динамика и любимые каналы",
	stats_view_rhythm: "Ритм",
	stats_view_rhythm_desc: "Когда это происходит, по часам",
	stats_view_members: "Участники",
	stats_view_members_desc: "Кто пишет, а кто сидит в голосовых",
	stats_view_channels: "Каналы",
	stats_view_channels_desc: "Самые активные текстовые и голосовые каналы",
	stats_select_placeholder: "Выберите вид",
	stats_label_messages: "Сообщения",
	stats_label_voice: "Время в голосовых",
	stats_label_active_days: "Активные дни",
	stats_label_rank: "Место",
	stats_label_active_members: "Активные участники",
	stats_label_members: "Участники",
	stats_label_peak: "Пик",
	stats_label_avg_length: "Средняя длина",
	stats_label_sessions: "Голосовые сессии",
	stats_label_longest_session: "Самая долгая сессия",
	stats_label_best_streak: "Лучшая серия",
	stats_note_change_up: "+${change} % к прошлой неделе",
	stats_note_change_down: "-${change} % к прошлой неделе",
	stats_note_new: "Новое на этой неделе",
	stats_note_steady: "Как на прошлой неделе",
	stats_note_streak: "Серия: ${days} дн.",
	stats_note_rank_of: "из ${count} участников",
	stats_note_unranked: "Пока без места",
	stats_note_chars: "символов на сообщение",
	stats_note_avg_session: "${duration} в среднем",
	stats_note_days_in_row: "дней подряд",
	stats_chart_daily: "Активность по дням",
	stats_chart_voice_minutes: "Голос (мин)",
	stats_chart_messages_per_day: "Сообщений в день",
	stats_text_channels: "Текстовые каналы",
	stats_voice_channels: "Голосовые каналы",
	stats_top_messages: "Больше всего сообщений",
	stats_top_voice: "Больше всего в голосовых",
	stats_heat_messages: "Сообщения",
	stats_heat_voice: "Голос",
	stats_peak_note: "Пик: ${day} ${hour}",
	stats_empty: "Пока ничего",
	stats_footer_zone: "Время: ${zone} · последние 30 дней",
	stats_title_user: "Активность ${user}",
	stats_title_guild: "Активность на ${guild}",
	stats_title_channel: "Активность в ${channel}",
	stats_title_compare: "${a} и ${b}",
	stats_title_top_messages: "Топ по сообщениям",
	stats_title_top_voice: "Топ по голосу",
	stats_period_1d: "Последние 24 часа",
	stats_period_7d: "Последние 7 дней",
	stats_period_30d: "Последние 30 дней",
	stats_insight_peak: "Больше всего активности: ${day} около ${hour}.",
	stats_insight_up: "На ${change} % больше сообщений, чем на прошлой неделе.",
	stats_insight_down:
		"На ${change} % меньше сообщений, чем на прошлой неделе.",
	stats_insight_channel: "Любимый канал: ${channel}.",
	stats_insight_streak: "Активен ${days} дней подряд.",
	stats_insight_leader: "${user} лидирует: ${value}.",
	stats_insight_compare:
		"${user} впереди по ${count} из ${total} показателей.",
	stats_insight_tie: "Ноздря в ноздрю.",
	stats_compare_same: "Выберите двух разных участников.",
	stats_wrong_channel: "Выберите текстовый или голосовой канал.",

	// /stats rebuilt: Components V2 card and resvg pages
	stats_card_no_data: "За последние 30 дней активность не записана.",

	// /music apo panel
	music_apo_panel_title: "Equalizer APO",
	music_apo_panel_on: "Модуль включён",
	music_apo_panel_off: "Модуль выключен",
	music_apo_panel_applied: "Применяется по умолчанию: **${name}**",
	music_apo_panel_nothing_applied: "Конфигурация по умолчанию не выбрана",
	music_apo_panel_count:
		"${count}/${max} конфигураций · применённая влияет на всё, что играет сервер",
	music_apo_panel_empty:
		"Конфигураций пока нет. Добавьте .txt-файл Equalizer APO кнопкой ниже.",
	music_apo_badge_applied: "Применена",
	music_apo_badge_frozen: "Заморожена",
	music_apo_config_meta:
		"от ${user} · изменена ${time} · строк: ${lines} · ${size}",
	music_apo_button_manage: "Управлять",
	music_apo_button_add: "Добавить конфигурацию",
	music_apo_button_enable: "Включить",
	music_apo_button_disable: "Выключить",
	music_apo_button_apply: "Применять по умолчанию",
	music_apo_button_unapply: "Перестать применять",
	music_apo_button_rename: "Переименовать",
	music_apo_button_replace: "Заменить файл",
	music_apo_button_freeze: "Заморозить",
	music_apo_button_unfreeze: "Разморозить",
	music_apo_button_delete: "Удалить",
	music_apo_button_confirm_delete: "Удалить навсегда",
	music_apo_button_cancel: "Отмена",
	music_apo_frozen_note:
		"Заморожена ${user}: её можно применять, но нельзя переименовать, заменить или удалить.",
	music_apo_confirm_delete: "Удалить **${name}**? Это нельзя отменить.",
	music_apo_modal_add_title: "Добавить конфигурацию APO",
	music_apo_modal_replace_title: "Заменить файл",
	music_apo_modal_rename_title: "Переименовать конфигурацию",
	music_apo_field_name: "Название",
	music_apo_field_name_desc:
		"Показывается в панели, не больше ${max} символов",
	music_apo_field_file: "Файл Equalizer APO",
	music_apo_field_file_desc:
		"Файл .txt, не больше ${kb} КиБ и ${lines} строк команд",
	music_apo_no_permission:
		"${emoji} Управлять конфигурациями APO могут только администраторы и владельцы сервера.",
	music_apo_full:
		"${emoji} На этом сервере уже ${max} конфигураций. Сначала удалите одну.",
	music_apo_name_taken: "${emoji} Конфигурация **${name}** уже существует.",
	music_apo_name_empty: "${emoji} Дайте конфигурации название.",
	music_apo_not_txt: "${emoji} Отправьте файл .txt.",
	music_apo_too_big: "${emoji} Файл больше ${kb} КиБ.",
	music_apo_too_many_lines: "${emoji} В файле больше ${lines} строк команд.",
	music_apo_empty_file: "${emoji} Файл пуст.",
	music_apo_frozen:
		"${emoji} **${name}** заморожена: сначала разморозьте её.",
	music_apo_cannot_unfreeze:
		"${emoji} Разморозить могут только ${user}, владельцы сервера или бота.",
	music_apo_saved: "${emoji} **${name}** сохранена (этапов: ${stages}).",
	// +shardinfo
	shardinfo_title: "Информация о шардах",
	shardinfo_location:
		"Этот сервер находится на шарде **${shardId}**. Команду обработал шард **${handlerShardId}**, процесс `${pid}`.",
	shardinfo_member_data:
		"Участники: **${exactCount}** точно, **${approximateCount}** примерно, **${missingCount}** нет данных",
	shardinfo_offline_shards: "Шарды без ответа: ${shards}",
	shardinfo_section_unavailable: "Недоступные серверы",
	shardinfo_section_approximate: "Серверы с примерным числом",
	shardinfo_section_missing: "Серверы без данных об участниках",
	shardinfo_card_title: "Шарды iHorizon",
	shardinfo_card_summary: "Создано шардом ${shardId} · процесс ${pid}",
	shardinfo_card_pill: "${onlineCount}/${shardCount} в сети",
	shardinfo_card_shard: "Шард ${shardId}",
	shardinfo_card_state_online: "В сети",
	shardinfo_card_state_starting: "Подключение",
	shardinfo_card_state_offline: "Не в сети",
	shardinfo_card_no_response: "Нет ответа",
	shardinfo_card_servers: "Серверы",
	shardinfo_card_servers_unit: "серверов",
	shardinfo_card_servers_detail: "Недоступно: ${unavailableCount}",
	shardinfo_card_members: "Участники",
	shardinfo_card_members_detail: "${averageCount} на сервер",
	shardinfo_card_ping: "Средний пинг",
	shardinfo_card_ping_detail: "Максимум: ${ping}",
	shardinfo_card_shard_ping: "Пинг",
	shardinfo_card_memory: "Память",
	shardinfo_card_memory_detail: "${size} на шард",
	shardinfo_card_voice: "Голос",
	shardinfo_card_voice_detail: "Каналов: ${channelCount}",
	shardinfo_card_channels: "Каналы",
	shardinfo_card_uptime: "Аптайм",
	shardinfo_card_chart_servers: "Серверы по шардам",
	shardinfo_card_chart_members: "Участники по шардам",
	shardinfo_card_chart_average: "Среднее: ${value}",
	shardinfo_card_unit_day: "д",
	shardinfo_card_unit_hour: "ч",
	shardinfo_card_unit_minute: "мин",
	// ?status-embed
	status_panel_title: "# ${emoji_Logo} Статус iHorizon",
	status_panel_headline:
		"${state} **${label}** · Сервисов онлайн: ${upCount}/${totalCount}",
	status_panel_label_operational: "Все системы работают",
	status_panel_label_maintenance: "Идёт обслуживание",
	status_panel_label_degraded: "Частичный сбой",
	status_panel_label_major: "Серьёзный сбой",
	status_panel_button: "Страница статуса",
	status_panel_group: "### ${emoji_Server_Stats} ${name}",
	status_panel_group_core: "Основные сервисы",
	status_panel_service_gateway: "HorizonGateway (API)",
	status_panel_service_lavalink: "Lavalink (музыка)",
	status_panel_service_website: "Сайт iHorizon",
	status_panel_row: "${status} **${name}** · ${detail}",
	status_panel_row_detail: "`${ping} ms` · `${uptime}`",
	status_panel_row_offline: "Не в сети",
	status_panel_row_maintenance: "На обслуживании",
	status_panel_row_pending: "Проверка",
	status_panel_incident: "### ${emoji_Warning_Icon} ${title}\n${content}",
	status_panel_footer: "-# ${emoji_Timer} Обновлено ${time} · каждую минуту",
	status_panel_kuma_unavailable:
		"-# ${emoji_Warn} Uptime Kuma недоступен, показаны проверки самого бота.",
	status_panel_loading: "${emoji_Discord_Loading} Загрузка панели статуса...",
	status_panel_card_title: "Состояние инфраструктуры",
	status_panel_card_summary: "Сервисов онлайн: ${upCount}/${totalCount}",
	status_panel_card_uptime_24h: "Аптайм 24ч",
	status_panel_card_uptime_30d: "Аптайм 30д",
	status_panel_card_response: "Средний отклик",
	status_panel_card_ws: "Пинг Discord",
	status_panel_card_col_history: "Последние 60 проверок",
	status_panel_card_col_ping: "Пинг",
	status_panel_card_col_uptime: "30д",
	status_panel_card_chart: "Среднее время отклика"
} satisfies LanguageData;
