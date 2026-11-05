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

// Work in progress: not loadable by guilds yet, may miss keys.
import type { LanguageData } from "../../../types/languageData.js";

export default {
	// Основной языковой файл для бота Discord iHorizon
	// ru-RU: Русский

	// Команды для тикетов
	// /add, /close, /delete, /sethereticket, /open, /remove, /transript, /disableticket
	ticket_disabled_command:
		"Ви не можете використовувати цю команду, оскільки адміністратор вимкнув команди для тікетів!",

	// /add
	add_disabled_command:
		"Ви не можете використовувати цю команду, оскільки адміністратор вимкнув команди для тікетів!",
	add_command_work: "Успішно додано ${memberTag} до вашого тікетів!",
	add_command_error: "Сталася помилка, будь ласка, спробуйте ще раз.",

	// /close
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

	// /delete
	delete_disabled_command:
		"Ви не можете використовувати цю команду, оскільки адміністратор вимкнув команди для тікетів!",
	delete_not_in_ticket:
		"Ви не можете використовувати цю команду поза каналом для тікетів!",

	// /sethereticket
	sethereticket_panel_select_embed_desc:
		"# Назва панелі\n```${panelName}```\n{msg}\n\n## Категорія\n```{category}```\n",

	// /open
	open_disabled_command:
		"Ви не можете використовувати цю команду, оскільки адміністратор вимкнув команди для тікетів!",
	open_command_work: "Знову відкрито ${channel}",
	open_command_error: "Сталася помилка, будь ласка, спробуйте ще раз!",
	open_not_in_ticket:
		"Ви не можете використовувати цю команду поза каналом для тікетів!",

	// /remove
	remove_disabled_command:
		"Ви не можете використовувати цю команду, оскільки адміністратор вимкнув команди для тікетів!",
	remove_not_in_ticket:
		"Ви не можете використовувати цю команду поза каналом для тікетів!",
	remove_command_error: "Сталася помилка, будь ласка, спробуйте ще раз.",
	remove_command_work: "Успішно видалено ${memberTag} з вашого тікету!",

	// /transript
	transript_disabled_command:
		"Ви не можете використовувати цю команду, оскільки адміністратор вимкнув команди для тікетів!",
	transript_name_sourcebin: " ",
	transript_title_sourcebin: "Транскрипт чату тікета для ${channelName}",
	transript_command_error: "Сталася помилка, будь ласка, спробуйте ще раз!",
	transript_command_work:
		"Ви закрили свій тікет. iHorizon надіслав вам транскрипт.",
	transript_not_in_ticket:
		"Ви не можете використовувати цю команду поза каналом для тікетів!",

	// /disableticket
	disableticket_not_admin:
		":x: | Ви повинні бути адміністратором цього сервера, щоб використовувати цю команду!",
	disableticket_logs_embed_title_disable: "Логи вимкнення тікетів",
	disableticket_logs_embed_description_disable:
		"Команди для тікетів були вимкнені!",
	disableticket_logs_embed_title_enable: "Логи увімкнення тікетів",
	disableticket_logs_embed_description_enable:
		"Команди для тікетів були увімкнені!",
	disableticket_command_work_disable:
		"Ви успішно вимкнули команди для тікетів!",
	disableticket_command_work_enable:
		"Ви успішно увімкнули команди для тікетів!",

	// /setticketcategory
	setticketcategory_not_admin:
		":x: | Ви повинні бути адміністратором цього сервера, щоб використовувати цю команду!",
	setticketcategory_disabled_command:
		"Ви не можете використовувати цю команду, оскільки адміністратор вимкнув команди для тікетів!",
	setticketcategory_not_a_category:
		"Вказаний канал не є категорією, будь ласка, спробуйте ще раз.",
	setticketcategory_command_work:
		"<@${authorId}>, ви встановили категорію для каналу тікетів на `${categoryName}`!",

	// /ticket log-channel
	ticket_logchannel_embed_title: "Канал логів тікетів",
	ticket_logchannel_embed_desc:
		"${author}, ви встановили канал логів модуля тікетів на ${channel}!",

	// Команды для рангов
	// /level, /setxpchannels, /disablexp

	// /disablexp
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

	// /setxpchannels
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

	// /level
	level_embed_title: "__**Рівень - XP**__: `${userUsername}`",
	level_embed_fields1_name: ":arrow_up:・__Рівень:__",
	level_embed_fields1_value: "`${currentxp}/${xpNeeded}`",
	level_embed_fields2_name: ":money_with_wings:・__XP:__",
	level_embed_fields2_value: "`${level}`",
	level_embed_description:
		"**Для підвищення рівня потрібно потрібно xp!** `${expNeededForLevelUp}`",

	// /ranks leaderboard
	ranks_leaderboard_embed_title: "Таблиця лідерів рівнів ${guildName}",
	ranks_leaderboard_top_txt: "Топ #${i}",
	ranks_leaderboard_top_txt_raw: "Топ #${i} ${rawText}\n",
	ranks_leaderboard_txt_text:
		"👤 ${user} `(${userGlobalName})`\n⭐ ➥ **Рівень**: `${level}`\n🔱 ➥ **Загальний XP**: `${xpTotal}`",

	// Команды владельца
	// /owner, /unowner, /blacklist, /unblacklist

	// /owner
	owner_not_owner:
		"Ви не є власником проекту iHorizon. Ви не можете використовувати цю команду.",
	owner_already_owner: "Цей користувач уже власник!",
	owner_is_now_owner: "${memberUsername} тепер власник проекту iHorizon",

	// /unowner
	unowner_not_owner:
		"Ви не є власником проекту iHorizon. Ви не можете використовувати цю команду.",
	unowner_cant_unowner_creator:
		"ННеможливо видалити цього користувача, оскільки він є творцем проекту iHorizon.",
	unowner_command_work: "${memberUsername} більше не є власником",

	// /blacklist
	blacklist_not_owner:
		"Ви не є власником проекту iHorizon. Ви не можете використовувати цю команду.",
	blacklist_bot_lol: "Не можу внести себе в чорний список x)",
	blacklist_command_work: "${memberUsername} тепер у чорному списку",
	blacklist_blacklisted_but_can_ban_him:
		"${emoji_No} Тепер у чорному списку, не можна заблокувати цього учасника тут, відсутні дозволи?",
	blacklist_already_blacklisted: "${memberUsername} уже у чорному списку!",
	blacklist_no_one_blacklist:
		"${emoji_No} Нікого не знайдено в чорному списку!",
	blacklist_var_no_reason: "Причину не знайдено",
	blacklist_embed_title: "Чорний список - Сторінка ${page}",

	// /unblacklist
	unblacklist_not_owner:
		"Ви не є власником проекту iHorizon. Ви не можете використовувати цю команду.",
	unblacklist_command_work: "<@${memberId}> більше не у чорному списку",
	unblacklist_not_blacklisted: "<@${memberId}> не був у чорному списку",
	unblacklist_unblacklisted_but_can_unban_him:
		"${emoji_No} Тепер не в чорному списку, не можна розблокувати цього учасника тут, відсутні дозволи або його вже розблоковано?",
	unblacklist_user_is_not_exist: "Я не можу знайти цього користувача",

	// Команды менеджера приглашений
	// /addinvites, /invites, /leaderboard, /removeinvites

	// /addinvites
	addinvites_confirmation_embed_description:
		"Додано ${amount} запрошень для ${user}",
	addinvites_logs_embed_title: "Логи менеджера запрошень",
	addinvites_logs_embed_description:
		"<@${authorId}> Додав ${amount} запрошень для <@${userId}>!",

	// /invites

	// /leaderboard

	// /removeinvites
	removeinvites_not_admin_embed_description:
		"Вам потрібні права адміністратора для використання цієї команди!",
	removeinvites_confirmation_embed_description:
		"Видалено ${amount} запрошень для ${user}",
	removeinvites_logs_embed_title: "Логи менеджера запрошень",
	removeinvites_logs_embed_description:
		"<@${authorId}> Видалив ${amount} запрошень для <@${userId}>!",

	// Команды бота
	// /botinfo, /invite, /kisakay, /ping, /status

	// /links
	links_message: "Натисніть на посилання нижче про мене!",
	links_website: "Мій веб-сайт",
	links_gitlab: "Мій GitLab",

	// /botinfo
	botinfo_embed_fields_myname: "Моє ім'я:",
	botinfo_embed_fields_mychannels: "Мої канали:",
	botinfo_embed_fields_myservers: "Мої сервери:",
	botinfo_embed_fields_members: "Учасники:",
	botinfo_embed_fields_libraires: "Бібліотеки:",
	botinfo_embed_fields_created_at: "Створений:",
	botinfo_embed_fields_created_by: "Створено:",

	// /invite
	invite_embed_title: "Дякую за довіру iHorizon!",
	invite_embed_description:
		"Я вас люблю, покажіть мені свою любов до мене! Запросіть мене!",

	// /kisakay
	kisakay_message:
		"${emoji_Sparkles} Kisakay - і мій творець і розробник. Завдяки їй та її клавіатурі я з'явився в цьому світі. Я глибоко вдячний їй!✨ ❤️❤️",

	// /Irisweb
	irisweb_message:
		"😼IrisWeb - мій другий розробник/співавтор , IrisWeb и Kisakay ❤️",

	// /ping
	pong_message: "【:ballot_box_with_check:】__**Понг**__ : ",

	// /status
	status_be_bot_dev:
		":x: | **Ви маєте бути розробником бота, щоб виконати це!**",

	// /help
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

	// /say
	say_footer_msg: "\n\nВідправлено з команди `/say` від ${author}",

	// /ping
	ping_down_msg: "**НЕДОСТУПНО**",
	ping_embed_desc:
		"# Понг! Статистика мережі ${botName}:\n\n**[Пінг веб-сайту Discord]** >> `${_net03}` мс.\n**[Пінг Cloudflare]** >> `${_net02}` мс.\n**[Пінг Google]** >> `${_net01}` мс.\n\n${emoji_Crown} **[Пінг веб-сайту iHorizon]** >> `${_net04}` мс.\n${emoji_Crown} **[Пінг веб-сокету]** `${ping}` мс.\n\n## ${emoji_Pointer} **[Середнє]** >> (ср)`${averagePing}` мс.",

	// Fun commands
	// /caracteres, /cats, /hack, /hug, /kiss, /morse, /poll, /question, /slap

	// Fun Var
	fun_var_down_api: "Помилка: API не доступно!",
	fun_var_good_sentence: "Будь ласка, надішліть гарну пропозицію!",

	// /cats

	// /duck

	// /hack
	hack_embed_description: "<@${victimId}> зламаний <@${authorId}> !",

	// /hug

	// /kiss

	// /poll
	poll_not_admin: "У вас немає прав для цього!",

	// /question
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

	// /slap

	// /dogs
	dogs_embed_command_error: "Помилка під час отримання зображення собаки.",

	// /love
	love_embed_description:
		"**${user1Username}** + **${user2Username}** = __${randomNumber}%__ любові 💗",
	love_command_error: "Сталася помилка під час створення зображення",

	// Economy commands
	// /addmoney, /balance, /daily, /monthly, /pay, /removemoney, /rob, /weekly, /work

	// /addmoney
	addmoney_not_admin:
		"Ви не можете виконати цю команду, оскільки у вас немає необхідних прав `АДМІНІСТРАТОР`.",
	addmoney_logs_embed_title: "Логи економіки",
	addmoney_logs_embed_description:
		"Адміністратор <@${authorId}> додав ${amountValue} монет користувачу <@${userId}>!",
	addmoney_command_work:
		"Успішно додано `${amountValue}`$ користувачу <@${userId}>.",

	// /balance
	balance_dont_have_wallet: "👛 У вас немає гаманця... !",
	balance_he_dont_have_wallet: "${emoji_Wallet} ${user} не має гаманця... !",
	balance_have_wallet: "👛 У вас є ${bal} монет(и) !",
	balance_he_have_wallet: "${emoji_Wallet} У ${user} є ${bal} монет(и) !",
	balance_embed_fields1_name: "Банк",
	balance_embed_fields2_name: "На рахунку",

	// /daily
	daily_cooldown_error:
		"Вибачте, вам потрібно зачекати ще **${time}**, перш ніж виконувати цю команду!",
	daily_embed_title: "Щоденна винагорода",
	daily_embed_description: "**Ви зібрали щоденну винагороду**",
	daily_embed_fields: "Зібрано",

	// /monthly
	monthly_cooldown_error:
		"Вибачте, вам потрібно зачекати **${time}**, перш ніж виконувати цю команду!",
	monthly_embed_title: "Щомісячна винагорода",
	monthly_embed_description: "**Ви отримали щомісячну винагороду**",
	monthly_embed_fields: "Зібрано",

	// /pay
	pay_negative_number_error: "Ви не можете перевести від'ємну суму.",
	pay_dont_have_enought_to_give:
		"Це більше коштів, ніж у вас на балансі. Спробуйте ще раз.",
	pay_command_work:
		"${authorUsername}, ви успішно переказали ${amount}$ користувачеві ${userUsername}.",

	// /removemoney
	removemoney_not_admin:
		"Ви не можете виконати цю команду, так як у вас немає необхідних прав `АДМІНІСТРАТОРА`",
	removemoney_embed_title: "Гроші успішно видалені!",
	removemoney_embed_fields: "Сума",
	removemoney_embed_second_fields: "Баланс оновлено",
	removemoney_logs_embed_description:
		"<@${authorId}> видалив ${amount} монет у користувача <@${userId}>!",
	removemoney_logs_embed_title: "Логи економіки",

	// /rob
	rob_cooldown_error:
		"**Зачекайте 50 хвилин, перш ніж знову грабувати користувача!**",
	rob_dont_enought_error:
		":x: Вам потрібно щонайменше 250$, щоб грабувати когось.",
	rob_him_dont_enought_error:
		":x: У ${userUsername} недостатньо коштів для грабежу.",
	rob_embed_description:
		"<@${authorId}>, ви пограбували <@${userId}> і втекли з ${random}!",

	// /weekly
	weekly_cooldown_error:
		"Вибачте, вам потрібно зачекати **${time}**, перш ніж виконати цю команду!",
	weekly_embed_title: "Щотижнево",
	weekly_embed_description: "**Щотижнева нагорода**",
	weekly_embed_fields: "Зібрано",

	// /work
	work_cooldown_error:
		"<@${authorId}>, **Зачекайте ${time} хвилин, перш ніж знову грабувати іншого користувача!**",
	work_embed_author: "${authorUsername}, це було вигідно!",
	work_embed_description:
		"${authorUsername}, ви працювали і заробили ${amount}$ !",

	// /withdraw
	withdraw_cannot_abuse:
		"${emoji_No} | Ви не можете зняти більшу суму монет, ніж у вас в банку!",
	withdraw_embed_title: "Зняття з вашого банку",
	withdraw_embed_desc:
		"${author}, ви зняли ${toWithdraw}${emoji_Coin} з вашого `банку`",
	withdraw_embed_fields1_name: "Банк",

	// /deposit
	deposit_cannot_abuse:
		"${emoji_No} | Ви не можете внести більшу суму монет, ніж у вас в гаманці!",
	deposit_embed_title: "Внесення в ваш банк",
	deposit_embed_desc:
		"${author}, ви внесли ${toDeposit}${emoji_Coin} в ваш `банк`",
	deposit_embed_fields1_name: "Банк",

	// /leaderboard
	economy_leaderboard_embed_title: "Лідерство за економікою `${guildName}`",
	economy_leaderboard_embed_fields_value:
		"<@${userId}> - Банк: `${bank}`${emoji_Coin} | Баланс: `${money}`${emoji_Coin}",

	// /economy disable
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

	// Profil Customisation commands
	// /setprofilage, /setprofildescriptions, /profil

	// /setprofilage
	setprofilage_command_work: "**Ваш вік у профілі успішно оновлено.**",

	// /setprofildescriptions
	setprofildescriptions_command_work: "**Ваш опис успішно оновлено.**",

	// /profil
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

	// Utils commands
	// /serverinfo, /snipe, /userinfo, /renew

	// /serverinfo

	// /setrankroles
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

	// /snipe
	snipe_no_previous_message_deleted:
		"У цьому каналі немає видалених повідомлень!",

	// /userinfo
	userinfo_wait_please: "${emoji_Timer} Будь ласка, зачекайте...",
	userinfo_var_notfound: "`Не знайдено`",
	userinfo_button_label: "Профіль користувача",

	// /renew
	renew_channel_send_success: "${author} канал було відновлено!",
	renew_dont_have_permission: ":x: **Не можна** `Не має дозволу!`",
	renew_not_administrator:
		":x: **Ви не є адміністратором для використання цієї команди!**",

	// /prevnames
	prevnames_undetected: "Дані не знайдено!",
	prevnames_not_admin:
		"У вас немає дозволу `АДМІНІСТРАТОРА` для виконання цієї команди!",
	prevnames_data_erased:
		"Ваші попередні імена користувача були повністю видалені за вашим запитом!",
	prevnames_embed_footer_text: "iHorizon | Сторінка ${page}/${pageCount}",

	// /blockbot
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

	// /banner

	// /massiverole
	massiverole_too_much_member:
		"Занадто багато учасників, операція не може бути виконана через можливі обмеження швидкості!",

	// /nickrole
	nickrole_too_much_member:
		"Занадто багато учасників, операція не може бути виконана через можливі обмеження швидкості!",

	// /emoji
	emoji_send_new_emoji:
		"__Створено новий емодзі__ з ім'ям **${emojiName}** ! (${emoji})",
	emoji_send_err_emoji:
		"__Помилка при створенні нового емодзі__ з ім'ям **${emojiName}** !",

	// /derank
	derank_msg_failed: "При видаленні ролей сталася помилка.",

	// /action unban all
	action_unban_all_no_banned_members: "Заблокованих учасників немає.",

	// /action unban undo

	// /vc
	vc_embed_desc:
		"## Стани Голосу\n`${voiceCount}` учасник(ів) у голосовому каналі:\n${emoji_iHorizon_Streaming} **=>** ${streaming}\n${emoji_iHorizon_Deaf} **=>** ${deafened}\n${emoji_iHorizon_Mute} **=>** ${muted}\n${emoji_iHorizon_Camera} **=>** ${video}\n## Стани Учасників\n`${memberCount}` учасник(ів) у гільдії:\n${emoji_DND} **=>** ${dnd}\n${emoji_Online} **=>** ${online}\n${emoji_Idle} **=>** ${idle}\n${emoji_Invisible} **=>** ${offline}\n## Стани Бустів\n`${boostCount}` буст(ів) у гільдії,\n${members}",
	vc_embed_fields_1_name: "・Кількість Учасників",
	vc_embed_fields_1_value: "```py\n${memberCount} учасників```",
	vc_embed_fields_2_name: "・Кількість Каналів",
	vc_embed_fields_2_value:
		"```py\n${textChannelSize} текстовий(і) канал(и)\n${voiceChannelSize} голосовий(і) канал(и)```",

	// /massmove
	massmove_too_much_member:
		"Занадто багато учасників, не можу перемістити усіх через можливе обмеження швидкості!",

	// Guild Config commands
	// /blockpub, /guildprofil, /setchannels, /setjoindm, /setjoinmessage, /setjoinroles, /setleavemessage, /setup

	// /blockpub
	blockpub_not_admin: ":x: | Ви повинні бути адміністратором цього сервера!",
	blockpub_now_enable:
		"📌 | Антиреклама тепер увімкнена (вона працює для всіх, крім адміністраторів)",
	blockpub_now_disable: "📌 | Антиреклама тепер вимкнена!",

	// /guildprofil
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

	// /setchannels
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

	// /setjoindm
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
		"{memberUsername} => Ім'я користувача учасника\n{memberMention} => Згадка учасника\n{memberCount} => Кількість учасників на сервері\n{guildName} => Назва сервера\n{createdAt} => Дата створення облікового запису у дд/мм/рррр",
	setjoindm_buttom_set_name: "Встановити повідомлення",
	setjoindm_buttom_delete_name: "Видалити повідомлення в ОП",
	setjoindm_awaiting_response:
		"Напишіть нове користувацьке повідомлення про вступ у приватних повідомленнях у каналі.",

	// /setjoinmessage
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
		"{memberUsername} => Ім'я користувача учасника\n{memberMention} => Згадка учасника\n{inviterUsername} => Ім'я запрошуючого\n{inviterMention} => Згадка запрошуючого\n{memberCount} => Кількість учасників на сервері\n{invitesCount} => Кількість запрошень запрошуючого\n{guildName} => Назва сервера\n{createdAt} => Дата створення облікового запису у форматі ДД/ММ/РРРР",
	setjoinmessage_button_set_name: "Встановити повідомлення",
	setjoinmessage_buttom_del_name: "Стандартне повідомлення",
	setjoinmessage_awaiting_response:
		"Написав нове повідомлення про приєднання.",

	// /setjoinroles
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

	// /setleavemessage
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

	// /setup
	setup_not_admin:
		":x: | Для виконання цієї команди ви повинні бути адміністратором цього сервера!",
	setup_command_work: "${emoji_Yes} | Налаштування каналів",
	setup_command_error:
		"Бот вже налаштував канали для журналів! Або у бота немає дозволів...",

	// /setlogschannel
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

	// /join-ghostping add
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

	// /join-ghostping remove
	joinghostping_remove_isnt_set: "Канал ${channel} не встановлено!",
	joinghostping_remove_ok_embed_desc:
		"Канали були видалені з модуля Join GhostPing!",
	joinghostping_remove_logs_embed_desc:
		"${author} видалив ${channel} з модуля Join GhostPing!",

	// /automod block mass-mention

	// /automod block pub

	// /automod block spam

	// /guildconfig block too-new-account
	too_new_account_dont_specified_time_on_enable:
		"Ви не вказали час. Для включення цього модуля необхідний мінімальний вік облікового запису!",
	too_new_account_invalid_time_on_enable:
		"Введений вами час недійсний! **Приклад допустимого часу**: `3h; 30m; 4w; 4y` -> 3 години; 30 хвилин; 4 тижні; 4 роки",
	too_new_account_logEmbed_title: "Модуль TooNewAccount",
	too_new_account_logEmbed_desc_on_enable:
		"${author} увімкнув модуль TooNewAccount. Тепер для облікових записів потрібний мінімальний вік ${beautifulTime}!",
	too_new_account_command_work_on_enable:
		"${author}, нові учасники, які приєдналися до **${guildName}** з обліковими записами молодше `${beautifulTime}`, будуть видалені.",
	too_new_account_logEmbed_desc_on_disable: "${author} вимкнув модуль!",
	too_new_account_command_work_on_disable:
		"${author}, модуль успішно вимкнено. Дати створення нових облікових записів учасників більше не будуть перевірятися.",

	// Commandes de décompte des membres
	// /setmembercount

	// /setmembercount
	setmembercount_not_admin:
		":x: | Ви повинні бути адміністратором цього сервера, щоб використовувати цю команду!",
	setmembercount_helpembed_title:
		"Помічник з налаштування лічильника учасників!",
	setmembercount_helpembed_description:
		"/setmembercount <Увімкнути / Вимкнути> <Назва каналу>",
	setmembercount_helpembed_fields_name: "Як використовувати?",
	setmembercount_helpembed_fields_value:
		"Використовуйте ```/setjoinmessage <Увімкнути / Вимкнути / Показати встановлене повідомлення> <повідомлення>```\n{membercount} = Кількість учасників сервера\n{rolescount} = Кількість ролей\n{botcount} = Кількість ботів на сервері",
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

	// Команды музыки
	// /p, /loop, /nowplaying, /pause, /resume, /skip, /stop, /queue, /shuffle

	// /p
	p_not_in_voice_channel:
		"Ви повинні бути в голосовому каналі, щоб використовувати цю команду!",
	p_embed_title: "Немає результатів",
	p_not_allowed:
		"Посилання, яке ви відправили, не підтримується цим ботом. Будь ласка, використовуйте авторизовані музичні сервіси, такі як Deezer, Spotify, Soundcloud та інші.",

	// /loop
	loop_no_queue: "Відсутній список відтворення!",
	loop_command_work: "{mode} | Режим повторення оновлено",

	// /nowplaying
	nowplaying_no_queue: "Зараз нічого не відтворюється",
	nowplaying_message_embed_title: "Зараз відтворюється",
	nowplaying_resume_button: "${author} **продовжив** відтворення музики!",
	nowplaying_pause_button: "${author} **поставив(ла) на паузу** музику!",
	nowplaying_lyrics_button: "Текст для цієї пісні не знайдено",
	nowplaying_stop_buttom: "${author} **зупинив(ла)** музику!",

	// /pause
	pause_no_queue:
		"${emoji_Warning_Icon} - Ви не перебуваєте в голосовому каналі!",
	pause_nothing_playing: "Зараз нічого не відтворюється",
	pause_var_paused: "Пауза",
	pause_var_err: "Щось пішло не так",

	// /resume
	resume_nothing_playing: "Зараз нічого не відтворюється",
	resume_command_work: "Успішно відновлено",

	// /skip
	skip_not_in_voice_channel:
		"${emoji_Warning_Icon} - Ви не перебуваєте у голосовому каналі!",
	skip_nothing_playing: "Зараз нічого не відтворюється",
	skip_command_work: "Пропущено {queue}",

	// /stop
	stop_nothing_playing: "Зараз нічого не відтворюється",
	stop_command_work: "Чергу зупинено",

	// /queue
	queue_iam_not_voicec: "Я не знаходжусь у голосовому каналі",
	queue_no_queue: "Черги немає",

	// /shuffle
	shuffle_no_queue: "Я не знаходжуся у голосовому каналі",
	shuffle_no_enought: "Недостатньо треків у черзі для перемішування",
	shuffle_command_work: "Я **перемішав** чергу",

	// /music history
	history_no_entries: "У цьому конкурсі немає записів.",

	// /music lyrics
	lyrics_embed_title_unknown: "Невідомий заголовок",
	lyrics_embed_author_name_unknown: "Невідомий автор",
	lyrics_not_found: "Тексти не знайдено",

	// /music clear-queue
	clear_queue_command_ok:
		"${emoji_Security} | Музичну чергу на цьому Discord-сервері було очищено.",

	// Команды раздачи призов
	// /end, /start, /reroll

	// /end
	end_not_admin:
		"Для завершення цієї розіграшу призів вам потрібні дозволи на керування повідомленнями.",
	end_not_find_giveaway: "Не вдалося знайти розіграш для `${gw}`.",
	end_confirmation_message:
		"Розіграш завершиться менш ніж через (${timeEstimate}) секунд...",
	end_logs_embed_title: "Журнали завершення розіграшу призів",
	end_logs_embed_description:
		"<@${authorId}> завершив розіграші з ідентифікатором: ${messageId}",
	end_command_error: "Цей розіграш вже завершено!",

	// /start
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

	// /reroll
	reroll_not_perm:
		"Для перезапуску цієї розіграшу призів вам потрібні дозволи на керування повідомленнями.",
	reroll_dont_find_giveaway: "Не вдалося знайти розіграш для `{args}`.",
	reroll_command_work: "Розіграш призів перезапущено!",
	reroll_logs_embed_title: "Журнали розіграшу призів",
	reroll_logs_embed_description:
		"<@${authorId}> перезапустив розіграш з ідентифікатором: ${messageId}",
	reroll_command_error: "Помилка!",
	reroll_giveaway_not_over: "Цей розіграш ще не завершено!",

	// /get-all
	gw_getall_embed_title: "Список розіграшів для ${guildName}",
	gw_getall_embed_fields:
		"${Channel} [Переглянути тут](${MessageURL}) \n**Закінчується через** ${ExpireIn}",

	// /get-data
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

	// Команды модерации
	// /ban, /kick, /clear, /lock, /unlock, /avatar, /lockall,
	// /unban, /tempmute, /unmute

	// /avatar

	// /ban
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
		"Ви були заблоковані на цьому сервері: **${guildName}** користувачем `${authorUsername}`",
	ban_command_work: "<@${memberId}> заблокований користувачем <@${authorId}>",
	ban_logs_embed_title: "Логи блокувань",
	ban_logs_embed_description:
		"<@${memberId}> заблокований користувачем <@${authorId}>",

	// /kick
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

	// /clear
	clear_dont_have_permission:
		"${emoji_No} | У вас немає дозволу на керування повідомленнями (`MANAGE_MESSAGES`).",
	clear_max_message_limit:
		"${emoji_No} | Я не можу видалити більше 99 повідомлень за один раз!",
	clear_channel_message_deleted: "Видалено ${messageCount} повідомлень!",
	clear_confirmation_message: "${messageCount} повідомлень було видалено!",
	clear_logs_embed_title: "Логи видалення повідомлень",
	clear_logs_embed_description:
		"<@${authorId}> видалив ${messageCount} повідомлень в <#${channelId}>",

	// /lock
	lock_embed_message_description:
		"Канал заблоковано користувачем <@${authorId}>.",
	lock_dont_have_permission:
		"${emoji_No} | У вас немає дозволу на блокування каналів.",
	lock_logs_embed_title: "Логи блокування каналів",
	lock_logs_embed_description:
		"<@${authorId}> заблокував канал <#${channelId}>",

	// /unlock
	unlock_embed_message_description: "Канал успішно розблоковано!",
	unlock_dont_have_permission:
		"${emoji_No} | У вас немає дозволу на розблокування каналу.",
	unlock_logs_embed_title: "Логи розблокування каналів",
	unlock_logs_embed_description:
		"<@${authorId}> розблокував канал <#${channelId}>",

	// /lockall
	lockall_dont_have_permission:
		"${emoji_No} | У вас немає дозволу на блокування всіх каналів.",
	lockall_embed_message_description:
		"Всі канали заблоковані користувачем <@${authorId}>.",
	lockall_logs_embed_title: "Логи блокування всіх каналів",
	lockall_logs_embed_description: "<@${authorId}> заблокував всі канали!",

	// /unban
	unban_dont_have_permission:
		"${emoji_No} | У вас немає дозволу на розблокування учасників.",
	unban_bot_dont_have_permission: "${emoji_No} | У мене немає дозволу.",
	unban_there_is_nobody_banned:
		"${emoji_No} | **На цьому сервері немає забанених учасників!**",
	unban_the_member_is_not_banned:
		"${emoji_No} | **Вказаний ID не забанений на цьому сервері**!",
	unban_is_now_unbanned: "<@${userID}> тепер розбанений на цьому сервері!",
	unban_logs_embed_title: "Логи розбанів",
	unban_logs_embed_description:
		"<@${userID}> тепер розбанений на сервері користувачем ${authorId}!",
	unban_reason: "Причина не вказана.",

	// /tempmute
	tempmute_dont_have_permission:
		"${emoji_No} | У вас немає дозволу на тимчасове блокування учасників.",
	tempmute_i_dont_have_permission: "${emoji_No} | У мене немає дозволу.",
	tempmute_cannot_mute_yourself:
		"${emoji_No} | Ви не можете тимчасово заблокувати самі себе!",
	tempmute_already_muted: "Цей користувач вже заблокований!",
	tempmute_command_work: "<@${tomuteId}> був заблокований на ${duration}",
	tempmute_unmuted_by_time: "<@${tomuteId}> був розблокований!",
	tempmute_logs_embed_title: "Логи тимчасової блокування",
	tempmute_logs_embed_description:
		"<@${authorId}> заблокував <@${tomuteId}> на ${duration}",
	tempmute_reason_create_roles: "Створено роль для тимчасового блокування!",

	// /unmute
	unmute_dont_have_permission:
		"${emoji_No} | У вас немає дозволу на розблокування учасників.",
	unmute_attempt_mute_your_self:
		"${emoji_No} | Ви не можете розблокувати самі себе!",
	unmute_i_dont_have_permission: "${emoji_No} | У мене немає дозволу.",
	unmute_not_muted: "Цей користувач не заблокований!",
	unmute_muted_role_doesnt_exist:
		"Роль `muted` не існує. Будь ласка, заблокуйте користувача **перед** створенням ролей для блокування...",
	unmute_command_work: "<@${tomuteId}> був розблокований!",
	unmute_logs_embed_title: "Логи розблокування",
	unmute_logs_embed_description: "<@${authorId}> розблокував <@${tomuteId}>",
	unmuteall_no_muted_members: "Заглушених учасників не знайдено.",
	unmuteall_audit_reason: "Зняти заглушення з усіх",
	unmuteall_command_work: "Знято заглушення з ${unmuted}/${total} учасників.",
	unmuteall_logs_embed_title: "Логи масового зняття заглушення",
	unmuteall_logs_embed_description:
		"<@${authorId}> зняв заглушення з ${unmuted}/${total} учасників.",

	// Команды резервного копирования
	// /backup

	// /backup
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

	// /backup delete
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

	// Реакции ролей
	// /reactionroles

	// /reactionroles
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

	// New feature commands
	// /punishpub, /report, /support

	// /punishpub
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

	// /report
	report_cooldown_command:
		"Вибачте, ви повинні зачекати **${time}** перед виконанням цієї команди!",
	report_owner_need:
		":x: | **Ви повинні бути власником сервера, щоб виконати цю команду!**",
	report_specify:
		"Будь ласка, уточніть помилку та сформулюйте хорошу пропозицію!",
	report_command_work: "**Дякуємо за надсилання помилки!**",

	// /support
	support_not_admin:
		":x: | Ви повинні бути адміністратором сервера, щоб використовувати ці команди!",
	support_command_work:
		"Ви налаштували модуль підтримки для **${guildName}**.\nКоли у користувача є в біографії:\n**${input}**.\nЯ повинен дати їм роль <@&${rolesId}>!",
	support_command_work_on_disable:
		"Ви налаштували модуль підтримки для **${guildName}**.\nТепер ніхто не може мати роль!",
	support_command_not_role: ":x: | Ви не вказали роль!",

	// /setserverlang
	setserverlang_not_admin:
		":x: | Ви повинні бути адміністратором сервера, щоб використовувати цю команду!",
	setserverlang_logs_embed_title_on_enable: "Логи SetServerLang",
	setserverlang_logs_embed_description_on_enable:
		"<@${authorId}> встановив мову iHorizon на **${type}** !",
	setserverlang_already: "Я вже на цій мові!",
	setserverlang_command_work_enable: "Тепер моя мова - **${type}**",
	setserverlang_command_error_enable: "Помилка!",

	// /embed
	embed_placeholder_string_select_menu_builder: "Що ви хочете зробити?",
	embed_placeholder_option_copy_embed: "Скопіювати вбудовання",
	embed_placeholder_option_edit_title: "Змінити заголовок",
	embed_placeholder_option_delete_title: "Видалити заголовок",
	embed_placeholder_option_edit_description: "Змінити опис",
	embed_placeholder_option_delete_description: "Видалити опис",
	embed_placeholder_option_edit_author: "Змінити автора",
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
	embed_choose_0: "Яке повідомлення ви хочете включити в вбудовання?",
	embed_choose_1: "Який заголовок ви хочете включити в вбудовання?",
	embed_choose_2: "Заголовок вбудовання успішно видалено!",
	embed_choose_3: "Який опис ви хочете включити в вбудовання?",
	embed_choose_4: "Опис вбудовання успішно видалено!",
	embed_choose_5: "Якого автора ви хочете включити в вбудовання?",
	embed_choose_6: "Автор вбудовання успішно видалено!",
	embed_choose_7: "Який нижній колонтитул ви хочете включити в вбудовання?",
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

	// /rolesaver
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

	// Команды предложений
	// /setsuggest, /suggest

	// /suggest accept
	suggest_accept_not_admin: "Ви не є адміністратором!",
	suggest_acceptnot_good_channel:
		"Цю команду слід виконувати в каналі модуля пропозицій (<#${channel}>)!\nПереконайтеся, що модуль пропозицій не вимкнено!",
	suggest_accept_not_found_db: "Пропозиція не знайдена у моїй базі даних!",
	suggest_accept_already_replied: "На цю пропозицію вже було дано відповідь!",
	suggest_accept_embed_fields_to_put:
		"Відповідь від ${authorUsername} (Прийнято)",
	suggest_acceptembed_title_to_put: "[Прийнято] ${title}",
	suggest_accept_command_work:
		"Ви прийняли пропозицію!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_accept_command_error: "Пропозиція не знайдена на Discord-каналі!",

	// /suggest deny
	suggest_deny_not_admin: "Ви не є адміністратором!",
	suggest_deny_not_good_channel:
		"Цю команду слід виконувати в каналі модуля пропозицій (<#${channel}>)!\nПереконайтеся, що модуль пропозицій не вимкнено!",
	suggest_deny_not_found_db: "Пропозиція не знайдена у моїй базі даних!",
	suggest_deny_already_replied: "На цю пропозицію вже було дано відповідь!",
	suggest_deny_embed_fields_to_put:
		"Відповідь від ${authorUsername} (Відхилено)",
	suggest_deny_embed_title_to_put: "[Відхилено] ${title}",
	suggest_deny_command_work:
		"Ви відхилили пропозицію!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_deny_command_error: "Пропозиція не знайдена на Discord-каналі!",

	// /suggest reply
	suggest_reply_not_admin: "Ви не є адміністратором!",
	suggest_reply_not_good_channel:
		"Цю команду слід виконувати в каналі модуля пропозицій (<#${channel}>)!\nПереконайтеся, що модуль пропозицій не вимкнено!",
	suggest_replynot_found_db: "Пропозиція не знайдена у моїй базі даних!",
	suggest_reply_already_replied: "На цю пропозицію вже було дано відповідь!",
	suggest_reply_embed_fields_to_put: "Відповідь від ${authorUsername}",
	suggest_reply_embed_title_to_put: "[Відповідь] ${title}",
	suggest_reply_command_work:
		"Ви відправили відповідь на пропозицію!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_reply_command_error: "Пропозиція не знайдена на Discord-каналі!",

	// /suggest delete
	suggest_delete_not_delete: "Ви не адміністратор!",
	suggest_delete_not_good_channel:
		"Цю команду слід виконувати в каналі модуля пропозицій (<#${channel}>)!\nПереконайтеся, що модуль пропозицій не вимкнено!",
	suggest_delete_not_found_db: "Пропозиція не знайдена у моїй базі даних!",
	suggest_delete_command_work: "Ви видалили пропозицію!",
	suggest_delete_command_error: "Пропозиція не знайдена на Discord-каналі!",

	// /setsuggest disable
	setsuggest_disable_not_admin: "Ви не адміністратор!",
	setsuggest_disable_pw_on: "${author}, ви увімкнули модуль пропозицій!",
	setsuggest_disable_pw_off: "${author}, ви вимкнули модуль пропозицій!",

	// /setsuggest channel
	setsuggest_channel_not_admin: "Ви не адміністратор!",
	setsuggest_channel_already_set_with_that:
		"${author}, канал модуля пропозицій вже встановлено в ${channel}!",
	setsuggest_channel_embed_title: "Модуль пропозицій встановлено тут!",
	setsuggest_channel_embed_desc:
		"Тепер усі користувачі, які мають право надсилати повідомлення тут, можуть пропонувати свої ідеї, надсилаючи повідомлення!",
	setsuggest_channel_command_work:
		"${author}, ви встановили канал модуля пропозицій в ${channel}!",

	// Команда безопасности
	// /security

	// /security disable
	security_disable_not_admin: "Ви не є адміністратором!",
	security_disable_pw_on: "${author}, ви увімкнули модуль безпеки!",
	security_disable_pw_off: "${author}, ви вимкнули модуль безпеки!",

	// /security role-to-give
	security_role_to_give_not_admin: "Ви не є адміністратором!",
	security_role_to_give_command_work:
		"${author}, ви встановили роль ${role} для модуля безпеки!",

	// /security channel
	security_channel_not_admin: "Ви не є адміністратором!",
	security_channel_command_work:
		"${author}, ви встановили канал ${channel} для модуля безпеки!",

	// Команда расписания
	// /schedule

	// /schedule
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
	schedule_create_embed_fields_name_confirm: "Дата сповіщення",
	schedule_create_embed_title_confirm: "Розклад #${scheduleCode} створено!",
	schedule_create_confirm_msg:
		"${author}, ваш розклад був створений!\nКод: `${scheduleCode}`",

	// Команда PFPS
	// /pfps channel, /pfps config

	// /pfps config
	pfps_config_not_admin:
		":x: У вас немає прав адміністратора для виконання цієї команди",
	pfps_config_command_action_on:
		"${author}, ви увімкнули модуль PFPS.\nЯкщо канал не існує, налаштуйте його за допомогою команди: **/pfps channel**.",
	pfps_config_command_action_off: "${author}, ви вимкнули модуль PFPS.",

	// /pfps channel
	pfps_channel_not_admin:
		":x: У вас немає прав адміністратора для виконання цієї команди",
	pfps_channel_embed_title: "Модуль PFPS налаштовано тут!",
	pfps_channel_embed_desc:
		"${author} налаштував модуль PFPS тут!\nТепер кожні 30 секунд iHorizon буде відправляти аватар випадкового користувача у цій гільдії!\nЯ зроблю все можливе!",
	pfps_channel_command_work:
		"${author}, ви успішно налаштували модуль PFPS для каналу ${channel}!",
	pfps_channel_command_error:
		"${author}, команда повернула помилку. Будь ласка, перевірте, чи існує зазначений канал і чи увімкнено модуль PFPP!",

	// Protection Module
	// /authorization actions, ... sanction, ... config-show, /allowlist show, ... add, ... delete

	// /authorization actions
	authorization_actions_not_permited:
		"Тільки власник сервера може редагувати правило авторизації модуля захисту!",
	authorization_actions_everyone: "Всі",
	authorization_actions_allowlist: "Учасник(и) списку дозволених",

	// /authorization sanction

	// /authorization config-show

	// /allowlist show
	allowlist_show_not_permited:
		"Ви не маєте дозволу використовувати цю команду! Ви повинні бути у списку дозволів!",
	allowlist_show_embed_author: "Список дозволів",

	// /allowlist add
	allowlist_add_not_permited:
		"У вас немає дозволу використовувати цю команду! Ви повинні бути у списку дозволів!",
	allowlist_add_not_owner:
		"Тільки власник сервера може додавати/видаляти користувачів зі списку дозволів!",
	allowlist_add_already_in:
		"Учасник, якого ви хочете додати до списку дозволів, вже там є!",
	allowlist_add_command_work: "${member} був доданий до списку дозволів!",

	// /allowlist delete
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

	// TempVoice Module
	// /text, /voice, /status, /staff

	// /voice interface set-text-channel
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

	// /voice inteface set-voice-channel
	tempvoice_vc_not_admin:
		"<@${authorId}>, у вас немає прав на використання цієї команди!",

	// /voice interface set-staff-role
	tempvoice_staff_not_admin:
		"<@${authorId}>, у вас немає прав на використання цієї команди!",
	tempvoice_staff_desc_embed:
		"## Роль персоналу тимчасового голосового каналу\nТепер <@&${targetedRoleId}> може увійти в канал у режимі модератора!\n",

	// Confessionn Module
	// /cooldown, /disable, /channel

	// /confession channel
	confession_channel_command_work:
		"Панель исповедей була надіслана у ${channel}",
	confession_channel_panel_embed_desc:
		"# **Анонімні Сповіді**\n\nНатисніть кнопку нижче, щоб відкрити форму сповіді. Ви можете написати те, що хочете сповідати. Якщо хочете, можете зробити вашу сповідь приватною.\n\n## **Зробити Сповідь**\n\n*Примітка: Щоб зробити вашу сповідь приватною, вкажіть відповідний варіант у формі.*",
	confession_channel_log_embed_title: "Модуль Установки Каналу Сповідей",
	confession_channel_log_embed_desc:
		"${author} встановив канал на ${channel}",

	// /confession cooldown
	confession_coolodwn_command_work:
		"${author}, час очікування для сповіді тепер складає **${time}**!",
	confession_cooldown_log_embed_title:
		"Модуль Встановлення Часу Очікування Сповідей",
	confession_cooldown_log_embed_desc:
		"${author} встановив час очікування на `${time}`",

	// /confession disable
	confession_disable_command_work_on: "Модуль сповідей тепер увімкнено.",
	confession_disable_command_work_off: "Модуль сповідей тепер вимкнено.",
	confession_log_embed_title_on_enable: "Увімкнення/Вимкнення Сповідей",
	confession_log_embed_desc_on_enable: "${author} увімкнув модуль сповідей!",
	confession_log_embed_desc_on_disabled: "${author} вимкнув модуль сповідей!",

	// Модуль AntiSpam
	// /antispam manage

	// /antispam manage
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

	// /antispam bypass-roles
	antispan_bypassroles_embed_desc:
		"Усі ролі нижче можуть обійти модуль антиспаму",

	// -----------------------------/ \-----------------------------
	// События Модуля Исповедей
	confession_module_modal_title: "Надіслати сповідь",
	confession_module_modal_components1_label: "Що ви хочете сповідати?",
	confession_module_modal_components1_placeholder: "Ммхх",
	confession_module_modal_components2_label: "Це приватно?",

	// События проигрывателя музыки

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

	// События создания канала
	event_channel_create_message_embed_title: "Успішно налаштовано!",
	event_channel_create_message_embed_description:
		"Бот було налаштовано і він готовий до роботи. Вам більше нічого не потрібно робити.\n\nУсі журнали модерації, пов'язані з iHorizon, будуть відображатися тут",

	// События приветствия
	event_welcomer_inviter:
		"{memberMention} (аккаунт створено {createdAt}) приєднався до серверу. його запросив **{inviterUsername}** (**{invitesCount}** Запрошення), тепер нас {memberCount} на {guildName}",
	event_welcomer_default:
		"{memberMention} (аккаунт створено {createdAt}) приєднався до серверу. Тепер нас {memberCount} на {guildName}",

	// События прощания
	event_goodbye_inviter:
		"{memberUsername} (аккаунт створено {createdAt}) покинув сервер. його запросив **{inviterUsername}** (**{invitesCount}** Запрошення), тепер нас {memberCount} у {guildName}",
	event_goodbye_default:
		"{memberUsername} (аккаунт створено {createdAt}) покинув сервер. Тепер нас {memberCount} у {guildName}",

	// События уровня XP
	event_xp_level_earn:
		"**Новий рівень**, {memberMention}, ви отримали новий рівень, ваш поточний рівень: **{xpLevel}**",

	// События модуля билетов:
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

	// События interactionCreate:
	iC_event_cooldown: "Кулдаун, будь ласка, зачекайте трохи між командами!",
	iC_event_connection_error: "Помилка підключення!",

	// Кулдаун
	Msg_cooldown: "Можете почекати секунду перед виконанням команди?",

	// Модуль билетов
	ticket_module_button_delete: "Видалити тікет",
	ticket_module_button_transcript: "Транскрипт тікету",
	ticket_module_button_addmember: "Додати учасника",
	ticket_module_button_removemember: "Видалити учасника",
	ticket_module_add_question:
		"Кого ви хочете додати до тікету? (Вкажіть їх ідентифікатор користувача)!",
	ticket_module_remove_question:
		"Кого ви хочете видалити з тікету? (Вкажіть їх ідентифікатор користувача)!",

	// Журналы сервера
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

	// RankUp event
	event_rank_role: "<@${messageAuthorId}>, у вас тепер є нова роль <@&${id}>",

	// Событие предложения
	event_suggestion_embed_author:
		"Нова пропозиція від ${messageAuthorUsername}",

	// Событие безопасности
	event_security:
		"${member}, будь ласка, введіть капчу, надіслану в цьому повідомленні.\nВаша відповідь має бути в правильному синтаксисі!\n__У вас є 30 секунд на відповідь.__",

	// Событие по билетам
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
	event_ticket_logsChannel_onAddMember2_embed_title:
		"Логи тікетів - Додавання/видалення учасників з тікету",
	event_ticket_logsChannel_onAddMember2_embed_desc:
		"${author}\nВидалені: ${removedMembers}.\nДодані: ${addedMembers}.\n в тікеті (${channel})!",

	// Событие раздачи подарков
	event_gw_reroll_win_msg: "Вітаємо ${winners}! ваш приз **${prize}**!",
	event_gw_reroll_cannot_win_msg:
		"Немає дійсних учасників, тому переможець не може бути визначений!",
	event_gw_finnish_msg: "Вітаємо ${winners}! Ваш приз **${prize}**!",
	event_gw_finnish_cannot_msg:
		"Немає дійсних учасників, тому переможець не може бути визначений!",
	event_gw_finnish_button_title: "Розіграш завершено",
	event_gw_entries_button_title: "Список учасників",
	event_gw_removeentries_msg: "${author}, ви покинули цей конкурс!",

	// Событие логов улучшения
	event_boostlog_add:
		"<@${newMemberUserId}> **лише що покращив(ла)** сервер! (**${boostCount}** всього покращень)",
	event_boostlog_sub:
		"<@${newMemberUserId}> **лише що зняв(ла) своє покращення** з сервера! (**${boostCount}** всього покращень)",

	// Модуль Экономики
	economy_disable_msg:
		"<@${authorId}>, `Модуль Економіки` на цьому сервері **відключено**. Тепер ви не можете використовувати модуль економіки!",

	// Модуль TempVoice
	// Все компоненты, глобальные переменные...

	// Глобальные переменные

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

	// Кнопки
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

	// Модуль Защиты
	// Сообщение о событии

	protection_avoid_channel_delete:
		"**РЕЖИМ ЗАХИСТУ УВІМКНЕНО**\n<@${channelGuildOwnerId}>, канал було відновлено, <@${executorId}> намагався видалити канал!",

	// Модуль AntiSpam
	// Событийное сообщение

	// Базовое предупреждающее сообщение
	antispam_base_warn_message:
		"Увага, ${mentionedMembers}, ви спамите і можете бути покарані.",

	// Дополнительные предупреждающие сообщения в зависимости от типа наказания
	antispam_more_ban_msg: " Якщо ви продовжите, вас буде забанено на сервері.",
	antispam_more_mute_msg: " Якщо ви продовжите, вас буде вимкнено.",
	antispam_more_kick_msg: " Якщо ви продовжите, вас буде вилучено з сервера.",

	// Команди приховування/показу каналів
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

	// Встроенные логи AntiSpam
	antispam_log_embed_title: "[АнтіСпам] Новий ${actionType}",
	antispam_log_embed_desc: "${bot} **${actionType}** ${user}"
	// -----------------------------/ \-----------------------------
} satisfies Partial<LanguageData>;
