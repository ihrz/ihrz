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
	// ar-EG : Arabic

	// Variable
	var_member: "أعضاء",
	var_user: "مستخدم",
	var_author: "مؤلف",
	var_reason: "سبب",
	var_guild: "الجمعية",
	var_sanction: "عقوبة",
	var_time: "وقت",
	var_message: "رسالة",
	var_no_set: "غير محدد",
	var_none: "لا شيء",
	var_roles: "أدوار",
	var_names: "أسماء",
	var_text_channel: "قناة نصية",
	var_voice_channel: "قناة صوتية",
	var_creator: "مؤسس",
	var_doesnt_have_permissions:
		"أنت غير مصرح لك بذلك. تحتاج إلى إذن {permission}.",
	var_ihorizon: "iHorizon",
	var_developer: "مطور",
	var_chance: "حظ",
	var_other: "أخرى",
	var_unknown: "مجهول",
	var_secure: "آمن",
	var_unsecure: "غير آمن",
	var_prefix: "بادئة",
	var_slash: "شرطة مائلة",
	var_discord: "ديسكورد",
	var_network: "شبكة",
	var_latency: "كمون",
	var_bot: "روبوت",
	var_true: "صحيح",
	var_false: "خطأ",
	var_enabled: "مفعل",
	var_disabled: "معطل",
	var_yes: "نعم",
	var_no: "لا",
	var_colour: "لون",
	var_length: "طول",
	var_good: "جيد",
	var_size: "حجم",
	var_level: "مستوى",
	var_add: "أضف",
	var_remove: "إزالة",
	var_edit: "تعديل",
	var_confirm: "تأكيد",
	var_succes: "نجاح",
	var_page: "صفحة",
	var_previous: "السابق",
	var_next: "التالي",
	var_permission: "إذن",
	var_usage: "الاستخدام",
	var_aliases: "الأسماء المستعارة",
	var_dont_have_perm:
		"ليس لديك الصلاحيات اللازمة للقيام بذلك. (تتطلب صلاحية {perm})",
	var_price: "السعر",
	var_boost: "تعزيز",
	var_uses: "الاستخدامات",
	var_vc_stats: "إحصائيات الصوت",
	var_1d: "يوم واحد",
	var_7d: "7 أيام",
	var_14d: "14 يومًا",
	var_year: "سنة/سنوات",
	var_mo: "شهر/أشهر",
	var_w: "أسبوع/أسابيع",
	var_d: "يوم/أيام",
	var_h: "ساعة/ساعات",
	var_m: "دقيقة/دقائق",
	var_s: "ثانية/ثوانٍ",
	var_ms: "ميلي ثانية",
	var_banned_user: "المستخدم/المستخدمون المحظورون",
	var_no_one_banned: "لا يوجد أي مستخدم محظور في هذا الخادم.",
	var_category: "الفئة",
	var_total: "المجموع",
	var_online_members: "عضو/أعضاء متصل",
	var_boost_level: "مستوى التعزيز",
	var_features: "الميزات",
	var_guild_icon: "أيقونة الخادم",
	var_guild_banner: "راية الخادم",
	var_guild_splash: "صورة البداية للخادم",
	var_unknown_guild_name: "اسم خادم غير معروف",
	var_preview: "معاينة",
	var_form: "نموذج",
	var_original_message: "الرسالة الأصلية",
	var_click_here: "انقر هنا",
	var_s_message: "رسالة {nickname}",
	var_source: "الموسيقى من: ",
	var_online_call: "في مكالمة صوتية",
	var_online: "متصل",
	var_stream: "يبث مباشرة",
	var_boosts: "التعزيزات",
	var_muted: "مكتوم",
	var_camera: "الكاميرا قيد التشغيل",

	// Discord Permission Name
	perm_createinstantinvite_name: "إنشاء دعوة فورية",
	perm_kickmembers_name: "طرد الأعضاء",
	perm_banmembers_name: "حظر الأعضاء",
	perm_administrator_name: "المسؤول",
	perm_managechannels_name: "إدارة القنوات",
	perm_manageguild_name: "إدارة الخادم",
	perm_addreactions_name: "إضافة ردود فعل",
	perm_viewauditlog_name: "عرض سجل التدقيق",
	perm_priorityspeaker_name: "المتحدث المميز",
	perm_stream_name: "البث",
	perm_viewchannel_name: "عرض القناة",
	perm_sendmessages_name: "إرسال الرسائل",
	perm_sendttsmessages_name: "إرسال رسائل TTS",
	perm_managemessages_name: "إدارة الرسائل",
	perm_embedlinks_name: "إضافة الروابط",
	perm_attachfiles_name: "إرفاق الملفات",
	perm_readmessagehistory_name: "قراءة سجل الرسائل",
	perm_mentioneveryone_name: "منشن للجميع",
	perm_useexternalemojis_name: "استخدام الإيموجي الخارجي",
	perm_viewguildinsights_name: "عرض إحصاءات الخادم",
	perm_connect_name: "الاتصال",
	perm_speak_name: "التحدث",
	perm_mutemembers_name: "إسكات الأعضاء",
	perm_deafenmembers_name: "كتم صوت الأعضاء",
	perm_movemembers_name: "نقل الأعضاء",
	perm_usevad_name: "استخدام الكشف عن الصوت",
	perm_changenickname_name: "تغيير اللقب",
	perm_managenicknames_name: "إدارة الألقاب",
	perm_manageroles_name: "إدارة الأدوار",
	perm_managewebhooks_name: "إدارة الويب هوكس",
	perm_manageemojisandstickers_name: "إدارة الإيموجي والملصقات",
	perm_manageguildexpressions_name: "إدارة تعبيرات الخادم",
	perm_useapplicationcommands_name: "استخدام أوامر التطبيق",
	perm_requesttospeak_name: "طلب التحدث",
	perm_manageevents_name: "إدارة الأحداث",
	perm_managethreads_name: "إدارة المواضيع",
	perm_createpublicthreads_name: "إنشاء مواضيع عامة",
	perm_createprivatethreads_name: "إنشاء مواضيع خاصة",
	perm_useexternalstickers_name: "استخدام الملصقات الخارجية",
	perm_sendmessagesinthreads_name: "إرسال الرسائل في المواضيع",
	perm_useembeddedactivities_name: "استخدام الأنشطة المدمجة",
	perm_moderatemembers_name: "إدارة الأعضاء",
	perm_viewcreatormonetizationanalytics_name: "عرض تحليلات الربح",
	perm_usesoundboard_name: "استخدام لوحة الصوت",
	perm_createguildexpressions_name: "إنشاء تعبيرات الخادم",
	perm_createevents_name: "إنشاء الأحداث",
	perm_useexternalsounds_name: "استخدام الأصوات الخارجية",
	perm_sendvoicemessages_name: "إرسال الرسائل الصوتية",
	perm_sendpolls_name: "إرسال الاستطلاعات",
	perm_useexternalapps_name: "استخدام التطبيقات الخارجية",

	// Ticket commands
	// /add, /close, /delete, /sethereticket, /open, /remove, /transript, /disableticket
	ticket_disabled_command:
		"لا يمكنك استخدام هذا الأمر لأن المسؤول قام بتعطيل أمر التذاكر!",

	// /add
	add_disabled_command:
		"لا يمكنك استخدام هذا الأمر لأن المسؤول قام بتعطيل أمر التذاكر!",
	add_command_work: "تمت إضافة ${memberTag} إلى تذكرتك بنجاح!",
	add_command_error: "حدث خطأ، يرجى المحاولة مرة أخرى",

	// /close
	close_disabled_command:
		"لا يمكنك استخدام هذا الأمر لأن المسؤول قام بتعطيل أمر التذاكر!",
	close_title_sourcebin: "تذكرة تمت أرشفتها بواسطة iHorizon",
	close_description_sourcebin: " ",
	close_error_command: "حدث خطأ، يرجى المحاولة مرة أخرى!",
	close_command_work_channel:
		"لقد قمت بإغلاق تذكرتك. لقد أرسل لك iHorizon النسخة المترجمة",
	close_command_work_notify_channel: "تم إغلاق التذكرة بنجاح!",
	close_command_error: "حدث خطأ، يرجى المحاولة مرة أخرى!",
	close_not_in_ticket: "لا يمكنك استخدام هذا الأمر خارج قناة التذاكر!",

	// /delete
	delete_disabled_command:
		"لا يمكنك استخدام هذا الأمر لأن المسؤول قام بتعطيل أمر التذاكر!",
	delete_not_in_ticket: "لا يمكنك استخدام هذا الأمر خارج قناة التذاكر!",
	ticket_deleted:
		"تم حذف التذكرة ${ticketOwnerMention} بواسطة <@${deletedByUserId}>. إليك النص:",

	// /sethereticket
	sethereticket_panel_select_embed_desc:
		"# اسم اللوحة\n```${panelName}```\n{msg}\n\n## الفئة\n```{category}```\n",

	// /open
	open_disabled_command:
		"لا يمكنك استخدام هذا الأمر لأن المسؤول قام بتعطيل أمر التذاكر!",
	open_command_work: "تمت إعادة فتح ${channel} بنجاح",
	open_command_error: "حدث خطأ، يرجى المحاولة مرة أخرى!",
	open_not_in_ticket: "لا يمكنك استخدام هذا الأمر خارج قناة التذاكر!",

	// /remove
	remove_disabled_command:
		"لا يمكنك استخدام هذا الأمر لأن المسؤول قام بتعطيل أمر التذاكر!",
	remove_not_in_ticket: "لا يمكنك استخدام هذا الأمر خارج قناة التذاكر!",
	remove_command_error: "حدث خطأ، يرجى المحاولة مرة أخرى",
	remove_command_work: "تمت إزالة ${memberTag} من تذكرتك بنجاح!",

	// /transript
	transript_disabled_command:
		"لا يمكنك استخدام هذا الأمر لأن المسؤول قام بتعطيل أمر التذاكر!",
	transript_name_sourcebin: " ",
	transript_title_sourcebin: "نسخة محادثة التذكرة لـ ${channelName}",
	transript_command_error: "حدث خطأ، يرجى المحاولة مرة أخرى!",
	transript_command_work:
		"لقد قمت بإغلاق تذكرتك. لقد أرسل لك iHorizon النسخة المترجمة",
	transript_not_in_ticket: "لا يمكنك استخدام هذا الأمر خارج قناة التذاكر!",

	// /disableticket
	disableticket_not_admin:
		":x: | يجب أن تكون مسؤولاً في هذا الخادم لتنفيذ هذا الأمر!",
	disableticket_logs_embed_title_disable: "سجلات تعطيل التذاكر",
	disableticket_logs_embed_description_disable:
		"<@${authorId}> قام بتعطيل أوامر التذاكر!",
	disableticket_command_work_disable: "لقد قمت بتعطيل أوامر التذاكر بنجاح!",
	disableticket_logs_embed_title_enable: "سجلات تفعيل التذاكر",
	disableticket_logs_embed_description_enable:
		"<@${authorId}> قام بتفعيل أوامر التذاكر!",
	disableticket_command_work_enable: "لقد قمت بتفعيل أوامر التذاكر بنجاح!",

	// /setticketcategory
	setticketcategory_not_admin:
		":x: | يجب أن تكون مسؤولاً في هذا الخادم لتنفيذ هذا الأمر!",
	setticketcategory_disabled_command:
		"لا يمكنك استخدام هذه الأوامر لأن المسؤول قام بتعطيل أوامر التذاكر!",
	setticketcategory_not_a_category:
		"القناة المحددة ليست فئة، يرجى المحاولة مرة أخرى.",
	setticketcategory_command_work:
		"<@${authorId}>, لقد قمت بتعيين الفئة لقناة التذاكر إلى `${categoryName}`!",

	// /ticket log-channel
	ticket_logchannel_embed_title: "قناة سجلات التذاكر",
	ticket_logchannel_embed_desc:
		"${author}, لقد قمت بتعيين قناة سجلات وحدة التذاكر إلى ${channel}!",

	// /ticket panel
	ticket_panel_default_placeholder: "اختر فئة لفتح تذكرة",
	ticket_panel_embed_title: "لوحة التذاكر #",
	ticket_panel_embed_desc: "تخصيص تضمين التذكرة بخيارات محددة",
	ticket_panel_saved_conf: "💾 تم حفظ التكوين",
	ticket_panel_related_embed: "🕸️ التضمين المرتبط",
	ticket_panel_role_to_ping: "📌 الدور للتنبيه",
	ticket_panel_ping_user: "📎 تنبيه المستخدم",
	ticket_panel_placeholder: "🏷️ النص التوضيحي",
	ticket_panel_category: "📤 الفئة",
	ticket_panel_option_fields: "📔 حقول الخيارات",
	ticket_panel_form: "📝 النموذج",
	ticket_panel_panel_placeholder: "اختر الخيارات",
	ticket_panel_panel_1_label: "حفظ التكوين الحالي",
	ticket_panel_panel_2_label: "عرض المعاينة",
	ticket_panel_panel_3_label: "تغيير التضمين المرتبط الحالي",
	ticket_panel_panel_4_label: "إضافة/إزالة دور للتنبيه",
	ticket_panel_panel_5_label: "تغيير النص التوضيحي",
	ticket_panel_panel_6_label: "تغيير الفئة",
	ticket_panel_panel_7_label: "تغيير تنبيه المستخدم",
	ticket_panel_panel_8_label: "إضافة/إزالة حقول الخيارات",
	ticket_panel_panel_9_label: "تغيير النموذج",
	ticket_panel_button_send: "إرسال التضمين",
	ticket_panel_change_category_channelSelect_placeholder: "اختر فئة",
	ticket_panel_select_channel_to_send: "اختر قناة لإرسال التضمين",
	ticket_panel_change_placeholder_modal_title: "تغيير النص التوضيحي",
	ticket_panel_change_placeholder_modal_placeholder: "نص توضيحي جديد",
	ticket_panel_need_save_config:
		"تحتاج إلى حفظ التكوين الحالي قبل إرسال التضمين",
	ticket_panel_need_1_option: "تحتاج إلى خيار واحد على الأقل لإرسال التضمين",
	ticket_panel_related_embed_dont_exist: "التضمين المرتبط غير موجود",
	ticket_panel_channel_error:
		"القناة غير موجودة أو ليس لدي صلاحية إرسال رسائل فيها",
	ticket_panel_embed_been_send: "تم إرسال التضمين إلى القناة",
	ticket_panel_successfully_saved: "تم حفظ التكوين بنجاح",
	ticket_panel_change_role_roleSelect_placeholder: "اختر دورًا",
	ticket_panel_change_role_interaction_content:
		"اختر دورًا لتغيير الدور الذي سيتم تنبيهه عند فتح تذكرة",
	ticket_panel_change_embed_modal_title: "تغيير التضمين المرتبط",
	ticket_panel_change_embed_modal_placeholder: "معرف التضمين",
	ticket_panel_change_embed_dont_exist: "التضمين غير موجود",
	ticket_panel_change_option_select_placeholder: "اختر خيارًا",
	ticket_panel_change_option_select_1_label: "إضافة حقل خيار جديد",
	ticket_panel_change_option_select_2_label: "إزالة حقل الخيار",
	ticket_panel_change_option_interaction_content:
		"اختر خيارًا لإضافة أو إزالة حقول الخيارات",
	ticket_panel_add_option_max_10: "لا يمكنك إضافة أكثر من 10 حقول خيارات",
	ticket_panel_add_option_modal_title: "إضافة حقل خيار",
	ticket_panel_add_option_modal_field1_label: "الاسم",
	ticket_panel_add_option_modal_field2_label: "الوصف",
	ticket_panel_add_option_modal_field3_label: "الرمز التعبيري",
	ticket_panel_remove_option_empty: "لا توجد حقول خيارات للإزالة",
	ticket_panel_remove_option_select_placeholder: "اختر خيارًا للإزالة",
	ticket_panel_rempve_option_interaction_content: "اختر خيارًا للإزالة",
	ticket_panel_change_form_select_placeholder_1: "إضافة حقل نموذج",
	ticket_panel_change_form_select_placeholder_2: "إزالة حقل نموذج",
	ticket_panel_change_form_interaction_content:
		"اختر خيارًا لإضافة أو إزالة حقول النموذج",
	ticket_panel_add_form_max_3: "لا يمكنك إضافة أكثر من 3 حقول نموذج",
	ticket_panel_add_form_modal_title: "إضافة حقل نموذج",
	ticket_panel_add_form_modal_field1_label: "عنوان السؤال",
	ticket_panel_add_form_modal_field2_label: "النص التوضيحي للسؤال",
	ticket_panel_preview_message: "معاينة لوحة التذاكر",
	ticket_panel_option_change_category: "اختر خيارًا لتغيير الفئة",
	ticket_panel_panel_10_label: "تغيير الفئة لخيار واحد محدد",
	ticket_panel_channel_panel_embed_id: "معرف تضمين قناة التذاكر",
	ticket_panel_panel_11_label: "تغيير لوحة تضمين قناة التذاكر",
	ticket_panel_select_user: "قائمة لإضافة أعضاء إلى التذكرة",
	ticket_panel_button_delete: "زر لحذف التذكرة",
	ticket_panel_button_transcript: "زر لإنشاء محضر",
	ticket_panel_panel_12_label: "عرض قائمة إضافة/إزالة الأعضاء من التذكرة",
	ticket_panel_panel_13_label: "عرض زر حذف التذكرة",
	ticket_panel_panel_14_label: "عرض زر النص المحفوظ",
	ticket_panel_tip_about_variable1:
		"${emoji_VC_OpenChat} **هل تعلم؟** عندما تستخدم `/utils embed` لإنشاء embed، يمكنك إدخال المتغير **`{category}`**، والذي سيتم استبداله بالفئة التي اختارها المستخدم.",
	ticket_panel_no_question_to_delete: "لا توجد أسئلة للحذف.",
	ticket_panel_chose_a_question: "اختر سؤالاً",
	ticket_panel_select_question_to_delete: "حدد سؤالاً لحذفه.",
	ticket_panel_panel_15_label: "إعداد تضمين لكل خيار",
	ticket_panel_panel_16_label: "إعداد نموذج لكل خيار",
	ticket_panel_panel_17_label:
		"قم بتكوين الأدوار التي سيتم الإشارة إليها لكل خيار",
	ticket_panel_mode: "⚙️ الوضع",
	ticket_panel_mode_simple: "بسيط",
	ticket_panel_mode_advanced: "متقدم",
	ticket_panel_mode_simple_desc:
		"زر واحد يفتح تذكرة، بدون اختيارات أو أسئلة.",
	ticket_panel_mode_advanced_desc: "قائمة بخيارات وإعدادات لكل خيار ونماذج.",
	ticket_panel_panel_18_label: "تغيير الوضع (بسيط / متقدم)",
	ticket_panel_simple_default_title: "الدعم",
	ticket_panel_simple_default_desc:
		"تحتاج مساعدة؟ اضغط على الزر أدناه لفتح تذكرة.",
	ticket_panel_manage_form_title: "إدارة النموذج للخيار: **${optionName}**",
	ticket_panel_change_embed_options:
		"اختر خيارًا لتعديل معرف التضمين في لوحة القناة.",
	ticket_panel_change_embed_options_null:
		"لا توجد خيارات لتعديل معرف التضمين في لوحة القناة.",
	ticket_panel_change_embed_options_chose:
		"اختر الفئة لتعديل معرف لوحة القناة.",
	ticket_panel_add_a_question: "إضافة سؤال",
	ticket_panel_remove_a_question: "حذف سؤال",
	ticket_panel_option_invalid: "❌ خيار غير صالح.",
	ticket_panel_chose_option_to_form: "حدد خيارًا لتكوين نموذجه.",
	var_chose_option: "اختر خياراً",
	ticket_panel_saved_and_sended_panel:
		"تم إرسال لوحة التذاكر #${panelCode} في ${channel}. يرجى الاحتفاظ بالكود في مكان ما في حال احتجت لتعديل اللوحة.",
	var_title: "العنوان",
	var_action: "الإجراء",

	// /ticket rename
	ticket_rename_ok: "تم تغيير اسم قناة التذكرة!",
	ticket_rename_error: "حدث خطأ أثناء إعادة تسمية القناة النصية.",

	// /ticket unlink
	ticket_unlink_command_ok:
		"${emoji_Yes} | **تم فصل القناة عن نظام التذاكر.**",
	ticket_unlink_panel_edited_content:
		"كانت هذه القناة تذكرة قديمة. قام المستخدم {user} بفصل هذه القناة.",

	// /ticket remind
	ticket_remind_embed_title: "أوه-أوه! تذكير بالتذكرة",
	ticket_remind_embed_desc:
		"أنت لست نشطًا كثيرًا، لا بأس بذلك، لكن تذكرتك لا تزال قيد المعالجة! تفضل بالرد عليها!",
	ticket_remind_embed_fields_1_name: "آخر رد",
	ticket_remind_command_ok: "لقد أرسلت رسالة تذكير إلى المستخدم.",
	var_never: "أبدًا",

	// Ranks commands
	// /level, /setxpchannels, /disablexp

	// /disablexp
	disablexp_not_admin:
		":x: | يجب أن تكون مسؤولاً في هذا الخادم لتنفيذ هذا الأمر!",
	disablexp_logs_embed_title_disable: "سجلات تعطيل XP",
	disablexp_logs_embed_description_disable: "<@${authorId}> قام بتعطيل XP!",
	disablexp_command_work_disable: "لقد قمت بتعطيل رسالة المستوى (XP) بنجاح",
	disablexp_logs_embed_title_enable: "سجلات تفعيل XP",
	disablexp_logs_embed_description_enable: "<@${authorId}> قام بتفعيل XP!",
	disablexp_command_work_enable: "لقد قمت بتفعيل رسالة المستوى (XP) بنجاح",
	disablexp_command_work_disable_entierly:
		"لقد قمت بتعطيل وحدة الرتب بنجاح! (لا رسائل بعد الآن، ولن يحصل المستخدمون على مستوى)",

	// /setxpchannels
	setxpchannels_not_admin:
		":x: | يجب أن تكون مسؤولاً في هذا الخادم لتنفيذ هذا الأمر!",
	setxpchannels_logs_embed_title_disable: "سجلات تعيين قنوات XP",
	setxpchannels_logs_embed_description_disable:
		"<@${authorId}> قام بتعطيل قنوات XP المخصصة. لقد قمت بإعادة تعيين الإعدادات الافتراضية...",
	setxpchannels_already_disabled_disable:
		"قنوات XP المخصصة قد تم تعطيلها بالفعل!",
	setxpchannels_command_work_disable: "لقد قمت بتعطيل قناة XP المخصصة بنجاح!",
	setxpchannels_command_error_disable: "خطأ: إذن مفقود أو القناة غير موجودة",
	setxpchannels_logs_embed_title_enable: "سجلات تعيين قنوات XP",
	setxpchannels_logs_embed_description_enable:
		"<@${authorId}> قام بتعيين قنوات XP المخصصة إلى: <#${argsid}>",
	setxpchannels_valid_channel_message: "يجب عليك تحديد قناة صالحة لإعداداتك.",
	setxpchannels_already_with_this_config:
		"قنوات XP المخصصة قد تم إعدادها بالفعل مع هذا معرف القناة!",
	setxpchannels_confirmation_message: "**تم تعيين قناة XP المخصصة هنا!**",
	setxpchannels_command_work_enable:
		"لقد قمت بتعيين قناة XP المخصصة إلى <#${argsid}> بنجاح",
	setxpchannels_command_error_enable: "خطأ: إذن مفقود أو القناة غير موجودة",

	// /level
	level_embed_title: "__**مستوى XP**__: `${userUsername}`",
	level_embed_fields1_name: ":arrow_up:・__المستويات:__",
	level_embed_fields1_value: "`${currentxp}/${xpNeeded}`",
	level_embed_fields2_name: ":money_with_wings:・__الخبرة:__",
	level_embed_fields2_value: "`${level}`",
	level_embed_description:
		"`${expNeededForLevelUp}` **نقاط الخبرة المطلوبة للمستوى التالي!**",
	level_xp_needed_for_new_level: "نقاط الخبرة المطلوبة للمستوى التالي:",
	level_xp_total: "مجموع نقاط الخبرة:",

	// /ranks leaderboard
	ranks_leaderboard_top_txt: "أفضل #${i}",
	ranks_leaderboard_top_txt_raw: "أفضل #${i} ${rawText}\n",
	ranks_leaderboard_txt_text:
		"👤 ${user} `(${userGlobalName})`\n⭐ ➥ **المستوى**: `${level}`\n🔱 ➥ **إجمالي XP**: `${xpTotal}`",
	ranks_leaderboard_embed_title: "🏆 لوحة صدارة الأساطير في الخادم",
	ranks_leaderboard_embed_footer:
		"الصفحة ${cPage} من ${totalPages} • مُرتبة حسب إجمالي النقاط",

	// /ranks ignore-channels
	ranks_ignorechannels_embed_title: "إعدادات وحدة الرتب",
	ranks_ignorechannels_embed_desc:
		"عندما يتم إرسال رسالة جديدة في أحد هذه القنوات، ستتجاهل وحدة الرتب الرسالة.",

	// /ranks set-message
	ranksSetMessage_not_admin:
		":x: | يجب أن تكون مسؤولاً في هذا الخادم لتنفيذ هذا الأمر!",
	ranksSetMessage_help_embed_title: "مساعدة /ranks set-message",
	ranksSetMessage_help_embed_description: "/ranks set-message",
	ranksSetMessage_help_embed_fields_name: "كيفية الاستخدام؟",
	ranksSetMessage_logs_embed_title_on_enable: "سجلات تعيين رسالة الرتب",
	ranksSetMessage_logs_embed_description_on_enable:
		"<@${authorId}> قام بتعيين رسالة الرتب!",
	ranksSetMessage_command_work_on_enable:
		"${emoji_GreenTick} | تم تعيين رسالة الرتب بنجاح.",
	ranksSetMessage_logs_embed_title_on_disable: "سجلات حذف رسالة الرتب",
	ranksSetMessage_logs_embed_description_on_disable:
		"<@${authorId}> قام بحذف رسالة الرتب!",
	ranksSetMessage_command_work_on_disable:
		"${emoji_Yes} | تم حذف رسالة الرتب المخصصة بنجاح.",
	ranksSetMessage_command_work_ls: "رسالة الرتب هي:",
	ranksSetMessage_help_embed_fields_custom_name: "رسالة مخصصة",
	ranksSetMessage_help_embed_fields_custom_name_empy: "لم يتم تعيينها!",
	ranksSetMessage_help_embed_fields_default_name_empy: "الرسالة الافتراضية",
	ranksSetMessage_help_embed_desc:
		"{memberUsername} => اسم المستخدم\n{memberMention} => ذكر العضو\n{memberCount} => عدد أعضاء الخادم\n{guildName} => اسم الخادم\n{createdAt} => تاريخ إنشاء الحساب بصيغة dd/mm/yyyy\n{xpLevel} => مستوى XP للمستخدم\n{accountCreationTimestamp} => طابع زمني لإنشاء الحساب",
	ranksSetMessage_button_set_name: "تعيين الرسالة",
	ranksSetMessage_buttom_del_name: "الرسالة الافتراضية",
	ranksSetMessage_awaiting_response: "اكتب رسالة الرتب المخصصة الجديدة.",
	ranksSetMessage_embed_fields_xpmessage: "رسالة الرتب",

	// /ranks ranks-ureset
	reset_uranks_are_you_sure:
		"**هل أنت متأكد حقًا أنك تريد حذف جميع بيانات الرتب؟\nهذا الإجراء دائم ولن تتمكن من التراجع عنه.**\n**هذا الإجراء مدمر!!**",
	reset_uranks_logs_embed_title: "سجلات وحدة الرتب (إجراء خطير)",
	reset_uranks_logs_embed_desc:
		"${author} قام بحذف جميع بيانات وحدة الرتب لـ ${user}!",

	// /ranks config
	ranks_config_embed_title: "🏆 تكوين أدوار الرتب",
	ranks_config_embed_desc:
		"قم بتخصيص مكافآت الأدوار المستندة إلى نقاط الخبرة في الخادم الخاص بك!",
	ranks_config_autofields_name: "🌟 المستوى ${level}",
	ranks_config_autofields_value:
		"الدور: <@&${roleId}>\n🔓 يتم فتحه عند المستوى ${level}",
	ranks_config_nofields_name: "🚫 لا توجد أدوار مهيأة",
	ranks_config_nofields_value:
		"قم بإعداد أدوار الرتب لمكافأة الأعضاء النشطين!",
	ranks_config_help_footer:
		"الصفحة ${currentPage} من ${totalPage} • إجمالي الرتب: ${totalRanks}",
	ranks_config_btn_add_name: "إضافة دور",
	ranks_config_btn_remove_name: "إزالة دور",
	ranks_config_add_max_roles:
		"لقد وصلت إلى الحد الأقصى لعدد أدوار الرتب (25).",
	ranks_config_add_role_menu_placeholder: "اختر دورًا",
	ranks_config_awaiting1_response: "اختر الدور الذي تريد تعيينه لمستوى معين.",
	ranks_config_add_modal_title: "تحديد مستوى للدور",
	ranks_config_add_modal_fields1_placeholder: "متطلب المستوى",
	ranks_config_add_invalid_level: "مستوى غير صالح! يرجى إدخال رقم موجب.",
	ranks_config_add_invalid_role:
		"الدور {role} موجود بالفعل. يمكن تعيين الدور لمستوى واحد فقط.",
	ranks_config_add_command_work:
		"تم إضافة الدور ${selectedRole} للمستوى ${level}!",
	ranks_config_add_command_warn:
		"# تحذير ⚠️ الدور ${selectedRole} لديه الأذونات الحساسة التالية:\n\n${_}",
	ranks_config_remove_no_rank: "لا توجد أدوار رتب مهيأة للإزالة.",
	ranks_config_var_level: "المستوى {level}",
	ranks_config_remove_string_menu_desc: "إزالة الدور عند المستوى ${level}",
	ranks_config_remove_string_menu1_placeholder: "اختر دورًا لإزالته",
	ranks_config_remove_awaiting_response: "اختر الدور الذي تريد إزالته.",
	ranks_config_remove_command_work:
		"تمت إزالة الدور عند المستوى ${levelToRemove}!",

	// Owner commands
	// /owner, /unowner, /blacklist, /unblacklist

	// /owner
	owner_not_owner:
		"أنت لست مالك مشاريع iHorizon. لا يمكنك استخدام هذا الأمر.",
	owner_already_owner: "هذا المستخدم هو بالفعل مالك!",
	owner_is_now_owner: "${memberUsername} هو الآن مالك مشاريع iHorizon",

	// /unowner
	unowner_not_owner:
		"أنت لست مالك مشاريع iHorizon. لا يمكنك استخدام هذا الأمر.",
	unowner_cant_unowner_creator:
		"لا يمكن إزالة هذا المستخدم، فهو منشئ مشاريع iHorizon.",
	unowner_command_work: "${memberUsername} لم يعد مالكًا",

	// /blacklist
	blacklist_not_owner:
		"أنت لست مالك مشاريع iHorizon. لا يمكنك استخدام هذا الأمر.",
	blacklist_bot_lol: "لا يمكن حظر نفسي x)",
	blacklist_command_work: "${memberUsername} تم حظره الآن",
	blacklist_blacklisted_but_can_ban_him:
		"${emoji_No} تم حظره الآن، لا يمكن حظر هذا العضو هنا، هل تفتقد الإذن؟",
	blacklist_already_blacklisted: "${memberUsername} محظور بالفعل!",
	blacklist_no_one_blacklist: "${emoji_No} لم يتم العثور على أي شخص محظور!",
	blacklist_var_no_reason: "لم يتم العثور على سبب",
	blacklist_embed_title: "القائمة السوداء - الصفحة ${page}",
	blacklist_command_work_shard:
		"✅ تم حظر ${username} في **${totalSuccess}** خادم عبر جميع الشظايا (`{score}`)",

	// /unblacklist
	unblacklist_not_owner:
		"أنت لست مالك مشاريع iHorizon. لا يمكنك استخدام هذا الأمر.",
	unblacklist_command_work: "<@${memberId}> لم يعد محظورًا",
	unblacklist_not_blacklisted: "<@${memberId}> لم يكن محظورًا",
	unblacklist_unblacklisted_but_can_unban_him:
		"${emoji_No} تم إزالة الحظر عنه، لا يمكن رفع الحظر عن هذا العضو هنا، هل تفتقد الإذن أو تم رفع الحظر بالفعل؟",
	unblacklist_user_is_not_exist: "لم أتمكن من العثور على المستخدم",
	unblacklist_command_work_across_all_shard:
		"✅ تم رفع الحظر عن ${bannedMemberUsername} في **${totalSuccess}** خادم عبر جميع الشظايا (`${score}`)",

	// Invite Manager commands
	// /addinvites, /invites, /leaderboard, /removeinvites

	// /addinvites
	addinvites_confirmation_embed_description:
		"تمت إضافة ${amount} دعوات لـ ${user}",
	addinvites_logs_embed_title: "سجلات مدير الدعوات",
	addinvites_logs_embed_description:
		"<@${authorId}> أضاف ${amount} دعوات إلى <@${userId}>!",

	// /invites

	// /leaderboard

	// /removeinvites
	removeinvites_not_admin_embed_description:
		"تحتاج إلى صلاحيات المسؤول لاستخدام هذا!",
	removeinvites_confirmation_embed_description:
		"تمت إزالة ${amount} دعوات من ${user}",
	removeinvites_logs_embed_title: "سجلات مدير الدعوات",
	removeinvites_logs_embed_description:
		"<@${authorId}> أزال ${amount} دعوات من <@${userId}>!",

	// /invites reset-all
	resetallinvites_warning_msg:
		"**هل أنت متأكد من أنك تريد حذف جميع بيانات مدير الدعوات؟\nهذه العملية دائمة ولا يمكن التراجع عنها.**\n**هذه العملية مدمرة!!**",
	resetallinvites_yes_button: "حذف الكل",
	resetallinvites_no_button: "إلغاء العملية",
	resetallinvites_succes_on_delete: "تم الحذف بنجاح!",
	resetallinvites_logs_embed_title: "سجلات مدير الدعوات (إجراء خطير)",
	resetallinvites_logs_embed_desc:
		"${author} قام بحذف جميع بيانات مدير الدعوات!",

	// Bot commands
	// /botinfo, /invite, /kisakay, /ping, /status

	// /links
	links_message: "انقر على الروابط أدناه للتعرف علي!",
	links_website: "موقعي الإلكتروني",
	links_gitlab: "حسابي على GitLab",

	// /botinfo
	botinfo_embed_fields_myname: "اسمي:",
	botinfo_embed_fields_mychannels: "قنواتي:",
	botinfo_embed_fields_myservers: "خوادمي:",
	botinfo_embed_fields_members: "الأعضاء:",
	botinfo_embed_fields_libraires: "المكتبات:",
	botinfo_embed_fields_created_at: "أنشأت في:",
	botinfo_embed_fields_created_by: "أنشأه:",

	// /invite
	invite_embed_title: "شكراً لإضافة iHorizon!",
	invite_embed_description: "أحبك، أظهر لي محبتك بالمقابل! دعني في خادمك!",

	// /kisakay
	kisakay_message:
		"${emoji_Sparkles} Kisakay هي المبدعة والمطورة الخاصة بي. بفضلها وبفضل لوحة مفاتيحها، جئت إلى الحياة. أنا ممتن لها بشدة!✨ ❤️❤️",

	// /andru
	andru_message:
		'أندرو هو متعاون ومطور. "الرجل المتعدد المهام"، يدير التسويق والمجتمع...',

	// /ether
	ether_message:
		"${emoji_Sparkles} Ether كان مساهمًا وعضوًا في فريق مشروع iHorizon. أنشأ وثائق iHorizon وسكربت تثبيت iHorizon، وأدار ترجمات البوت لجعلها (شبه) مثالية! غادر في <t:1785567600:f>.",

	// /Irisweb
	irisweb_message: "😼 IrisWeb هو مطور/مساهم الثاني لي، IrisWeb x Kisakay ❤️",

	// /ping
	pong_message: "【:ballot_box_with_check:】__**Pong**__ : ",

	// /status
	status_be_bot_dev: ":x: | **يجب أن تكون مطور البوت للقيام بذلك!**",

	// /help
	help_tip_embed:
		"```${botName} ・ قائمة المساعدة```\n${emoji_Pin} ・ **${categorieCount}** فئة أوامر متاحة\n${emoji_Slash_Bot_Badge} ・ **${slashCount}** أوامر سلاش متاحة\n${emoji_Crown} ・ **أنشأه** <@${owner1}>, <@${owner2}>\n\n```هل تعلم؟ ・ نصائح```\n${emoji_VC_Region} ・ ${botName} هو **100% متعدد اللغات**\n${emoji_Slash_Bot_Badge} ・ `/setlang language:Japanese`",
	help_mod_fields: "إدارة",
	help_ranks_fields: "الرتب",
	help_fun_fields: "متعة",
	help_utils_fields: "أدوات",
	help_giveaway_fields: "سحب",
	help_bot_fields: "بوت",
	help_music_fields: "موسيقى",
	help_backup_fields: "نسخ احتياطي",
	help_guildconf_fields: "إعدادات الخادم",
	help_prof_fields: "تخصيص الملف الشخصي",
	help_economy_fields: "الاقتصاد",
	help_owner_fields: "مالك",
	help_roler_fields: "تفاعل الدور",
	help_invitem_fields: "مدير الدعوات",
	help_ticket_fields: "تذكرة",
	help_memberc_fields: "عدد الأعضاء",
	help_newftrs_fields: "ميزات جديدة",
	help_mod_dsc:
		"> *قم بإدارة خادم Discord الخاص بك دون ضغط مع أوامر iHorizon.*",
	help_ranks_dsc:
		"> *استمتع بتتبع مستوى خبرتك لمعرفة من هو الأكثر نشاطًا على الخادم!*",
	help_fun_dsc:
		"> *هل تجد Discord ممل؟ حسنًا، تم تصميم هذه الفئة لك! سيعيد iHorizon الابتسامة إلى وجهك!*",
	help_utils_dsc:
		"> *تحتاج إلى أوامر محددة تكون مفيدة في بعض الحالات؟ حسنًا! هنا هي!*",
	help_giveaway_dsc:
		"> *هل تشعر بالكرم؟ تريد منح شيء لمجتمعك؟ هنا أوامري لمساعدتك!*",
	help_bot_dsc:
		"> *هل أنت فضولي وتريد معرفة المزيد عني؟ هذه الأوامر هنا من أجلك!*",
	help_music_dsc: "> *هل تحب الموسيقى؟ إليك هدية لك :)*",
	help_backup_dsc: "> *تحتاج إلى نسخ احتياطي سريع لخادمك؟ أنا هنا!*",
	help_guildconf_dsc: "> *تبحث عن إعداد متقدم وسهل الإعداد؟ أنا هنا :3*",
	help_prof_dsc:
		"> *هل تهتم بمظهرك؟ إليك بعض الأوامر لضمان حصولك على ملف شخصي رائع بين المستخدمين :)*",
	help_economy_dsc:
		"> *هل تهتم بمحفظتك؟ أو ترغب ببساطة في القيام بعمليات شراء؟ أنا هنا :)*",
	help_owner_dsc: "> *هذه الفئة مخصصة للمالكين ومديري مشاريع iHorizon!*",
	help_roler_dsc: "> *تريد إعداد دور تفاعل في خادمك؟ أنا هنا!*",
	help_invitem_dsc: "> *هل تريد التحقق من دعوات الأعضاء؟ هنا هو!*",
	help_ticket_dsc:
		"> *هل ترغب في إنشاء تذكرة أو استخدام إحدى وظائفها؟ بالطبع!*",
	help_memberc_dsc: "> *تريد إعداد قنوات صوتية لعدد الأعضاء؟ بالطبع :smile:*",
	help_newftrs_dsc: "> *هنا بعض الميزات الجديدة والمثيرة!*",
	help_not_for_you: "هذه التفاعل ليست لك",
	help_protection_fields: "حماية",
	help_protection_dsc:
		"> *منع المستخدمين غير المدرجين من القيام ببعض الأفعال لحماية الخادم.*",
	help_suggestion_fields: "اقتراح",
	help_suggestion_dsc:
		"> *امنح مستخدميك القدرة على التعبير عن أنفسهم، وتمكنهم من تقديم الاقتراحات في قناة مخصصة!*",
	help_security_fields: "أمن",
	help_security_dsc:
		"> *قم بإدارة اختبارات CAPTCHA لأعضائك الجدد لتأمين الوصول إلى خادمك.*",
	help_schedule_fields: "جدول",
	help_schedule_dsc:
		"> *إنشاء تذكيرات برسائل مبرمجة سيرسلها لك البوت في رسالة خاصة*",
	help_pfps_fields: "صور الملف الشخصي",
	help_pfps_dsc: "> *إرسال صورة عشوائية للمستخدمين في القناة!*",
	help_voicedashboard_fields: "لوحة القيادة الصوتية",
	help_voicedashboard_dsc: "> *إنشاء قناة صوتية مخصصة مع واجهة!*",
	help_select_menu: "قم بإجراء اختيار!",
	help_select_menu_fields_desc: "${commandCount} أوامر",
	help_back_to_menu: "العودة إلى القائمة الرئيسية",
	help_back_to_menu_desc: "العودة إلى القائمة الأولية",
	help_confession_dsc:
		"> *هل لديك اعتراف لتقديمه؟ حسنًا، مهما كان مريعًا، iHorizon هنا من أجلك!*",
	help_confession_fields: "اعتراف",
	help_antispam_dsc:
		"> *هل سئمت من الرسائل المزعجة؟ حسنًا! iHorizon هنا، لمراقبة بعض الرسائل المزعجة!*",
	help_antispam_fields: "مكافحة الرسائل المزعجة",
	help_stats_fields: "إحصائيات المستخدم",
	help_stats_dsc:
		"> *شوف عدد الرسائل ونشاط الصوت الخاص بالمستخدم في السيرفر*",
	help_notifier_dsc: "> *خليك متبلغ لما يوتيوبر أو ستريمر ينشر فيديو!*",
	help_notifier_fields: "المُبلغ",
	help_authrestore_fields: "استعادة كورد",
	help_authrestore_dsc:
		"> *التحقق من الخادم باستخدام oAuth2. عندما يتعرض خادمك لهجوم أو يُلغى، يمكنك استعادة الأعضاء القدامى باستخدام oAuth2!*",
	help_tags_fields: "العلامات المخصصة",
	help_tags_dsc: "> *قم بإنشاء رسائل علامات لخادمك واستخدمها في خادمك!*",
	help_starboard_dsc:
		"> *عرض أكثر الرسائل حصولاً على نجوم في خادم الديسكورد.*",
	help_starboard_fields: "لوحة النجوم",
	help_blogger_dsc:
		"تابع موجزات RSS المفضلة لديك وتلقَّ الإشعارات عند نشر مقالات جديدة عبر iHorizon",
	help_blogger_fields: "المدونة",
	help_lastfm_dsc:
		"> *اربط حساب Last.fm الخاص بك واعمل scrobble تلقائيًا للمقاطع التي يشغلها iHorizon طالما أنك باقٍ في القناة الصوتية.*",
	help_lastfm_fields: "LastFM Scrobbler",
	help_honeypot_fields: "Honeypot",
	help_honeypot_dsc:
		"> *قم بإعداد قناة فخ لاكتشاف الحسابات المخترقة وتنظيف الرسائل المزعجة الحديثة على خادمك تلقائيًا.*",

	// /h
	h_suite: "(تتمة)",
	h_suite_desc: "*استمرار أوامر الفئة*",
	helpall_no_perms_defined:
		"لا توجد أذونات مخصصة محددة على هذا السيرفر، لذا فإن `helpall` غير مفيد هنا — استخدم `${botPrefix}h` بدلاً من ذلك.",
	helpall_no_access:
		"ليس لديك حق الوصول إلى أي أمر يتطلب أذونات على هذا السيرفر.",

	// /say
	say_footer_msg: "\n\nأُرسل من `/say` بواسطة ${author}",

	// /ping
	ping_down_msg: "**غير متصل**",
	ping_embed_desc:
		"# بونج! إحصائيات الشبكة لـ ${botName}:\n\n**[Ping موقع Discord]** >> `${_net03}` مللي ثانية.\n**[Ping Cloudflare]** >> `${_net02}` مللي ثانية.\n**[Ping Google]** >> `${_net01}` مللي ثانية.\n\n${emoji_Crown} **[Ping موقع iHorizon]** >> `${_net04}` مللي ثانية.\n${emoji_Crown} **[Websocket Ping]** `${ping}` مللي ثانية.\n\n## ${emoji_Pointer} **[المتوسط]** >> (avg)`${averagePing}` مللي ثانية.",

	// /custom
	custom_avatar_reset:
		"لقد قررت إعادة تعيين صورة ملف تعريف البوت على الخادم. ستعود تذييلات الرسائل المضمنة إلى حالتها الافتراضية، بالإضافة إلى صورة ملف تعريف البوت على الخادم.",
	custom_avatar_set:
		"${emoji_Yes} **لقد قررت تغيير صورة ملف تعريف البوت على الخادم. تم الآن تعديل تذييلات الرسائل المضمنة، بالإضافة إلى صورة ملف تعريف البوت على الخادم.**\n${emoji_Crown} القيمة الجديدة: `${x}`",
	custom_name_reset:
		"لقد قررت إعادة تعيين اسم البوت على الخادم. ستعود تذييلات الرسائل المضمنة إلى حالتها الافتراضية، بالإضافة إلى اسم البوت على الخادم.",
	custom_name_set:
		"${emoji_Yes} **لقد قررت تغيير اسم البوت على الخادم. تم الآن تعديل تذييلات الرسائل المضمنة، بالإضافة إلى اسم البوت على الخادم.**\n${emoji_Crown} القيمة الجديدة: `${name}`",
	custom_desc_reset:
		"لقد قررت إعادة تعيين وصف البوت على الخادم. ستعود تذييلات الرسائل المضمنة إلى حالتها الافتراضية، بالإضافة إلى وصف البوت على الخادم.",
	custom_desc_set:
		"${emoji_Yes} **لقد قررت تغيير وصف البوت على الخادم. تم الآن تعديل تذييلات الرسائل المضمنة، بالإضافة إلى وصف البوت على الخادم.**\n${emoji_Crown} القيمة الجديدة: `${desc}`",
	custom_banner_reset: "لقد قررت إعادة تعيين لافتة البوت على الخادم.",
	custom_banner_set:
		"${emoji_Yes} **لقد قررت تغيير لافتة البوت على الخادم.**\n${emoji_Crown} القيمة الجديدة: `${x}`",
	custom_sdk_only:
		"هذا الأمر متاح في بيئة الإنتاج فقط للخوادم التي لديها اشتراك `Custom iHorizon Profile`.",
	custom_sdk_only_title: "ادعم iHorizon عبر Custom iHorizon Profile",
	custom_sdk_only_description:
		"البوت الخاص بنا مجاني ومفتوح المصدر منذ 2022. نحن بحاجة إلى دخل لمواصلة تشغيل البوت وتطويره واستضافته. تكاليف التشغيل لدينا تقارب 500 يورو سنوياً بين الخوادم والـ boosts والنطاقات والتراخيص.\n\nأمر `/custom` يتيح لك تغيير هوية iHorizon داخل خادمك عبر تعديل الصورة الرمزية والاسم والبنر والنبذة. عند استخدامه، تختفي الهوية البصرية لـ iHorizon من خادمك.\n\nلذلك أضفنا اشتراكاً مدمجاً في Discord بسعر 2.99 دولار أمريكي شهرياً.\n\nعند شراء هذا الاشتراك، ستتمكن من استخدام هذا الأمر. اعتبره بوتاً مخصصاً بأسلوب OWN-IHRZ، لكن بشكل مستقر ونظيف وعملي بالكامل.",

	// أوامر المرح
	// /caracteres, /cats, /hack, /hug, /kiss, /morse, /poll, /question, /slap

	// Fun Var
	fun_var_down_api: "خطأ: الـ API غير متصل!",
	fun_var_good_sentence: "يرجى إرسال جملة جيدة!",

	// /cats

	// /duck

	// /panda

	// /fox

	// /dolphin

	// /frog

	// /squirrel

	// /hack
	hack_embed_description: "<@${victimId}> تم اختراقه بواسطة <@${authorId}> !",

	// /hug

	// /kiss

	// /poll
	poll_not_admin: "ليس لديك الصلاحيات لتنفيذ هذا الأمر!",

	// /question
	question_not_full: "يرجى إدخال سؤال كامل يتكون من 3 كلمات أو أكثر!",
	question_s: [
		"نعم.",
		"لا.",
		"لا أعلم.",
		"لست متأكدًا!",
		"أنت مجنون!",
		"لا شكرًا.",
		"لا.",
		"نعم."
	],
	question_fields_input_embed: ":question:__**السؤال**__",
	question_fields_output_embed: ":grey_exclamation:__**الإجابة:**__",
	question_embed_title: "__**السؤال**__: `${authorUsername}`",

	// /slap

	// /dogs
	dogs_embed_command_error: "خطأ في استرجاع صورة الكلب.",

	// /love
	love_embed_description:
		"**${user1Username}** + **${user2Username}** = __${randomNumber}%__ من الحب 💗",
	love_command_error: "حدث خطأ أثناء محاولة إنشاء الصورة.",

	// /fun disable
	fun_disable_command_msg: "${author}، انت ${action_type} فئة الترفيه!",
	fun_category_disable:
		"مش مسموحلك تستخدم الأمر ده، فئة الأوامر الترفيهية معطلة.",

	// /fun gay

	// /fun stench

	// /fun rate

	// /fun caracteres
	fun_caracteres_command_ok: "يرجى إدخال نص لتحويله!",
	fun_caracteres_embed_desc:
		"النص الأصلي: **${inputText}**\n\nاختر نمطًا من القائمة المنسدلة أدناه لتحويل النص.",
	fun_caracteres_select_menu_placeholder: "اختر نمط الخط...",

	// /fun random dice

	// /fun random heads-tails
	fun_coinflip_result_heads: "صورة",
	fun_coinflip_result_tails: "كتابة",

	// /fun random number

	// +transgender

	// Economy commands
	// /addmoney, /balance, /daily, /monthly, /pay, /removemoney, /rob, /weekly, /work

	economy_cooldown_error:
		"انتظر **${time}** قبل أن تتمكن من تنفيذ هذا الأمر مرة أخرى!",

	// /addmoney
	addmoney_not_admin:
		"لا يمكنك تنفيذ هذا الأمر لأنك لا تمتلك الصلاحيات اللازمة `ADMINISTRATOR`",
	addmoney_logs_embed_title: "سجلات الاقتصاد",
	addmoney_logs_embed_description:
		"<@${authorId}> أضاف ${amountValue} عملة لـ <@${userId}> !",
	addmoney_command_work: "تمت إضافة `${amountValue}`$ بنجاح إلى <@${userId}>",

	// /balance
	balance_dont_have_wallet: "👛 لا تمتلك محفظة... !",
	balance_he_dont_have_wallet: "${emoji_Wallet} ${user} لا يمتلك محفظة... !",
	balance_have_wallet: "👛 لديك ${bal} عملة(ات) !",
	balance_he_have_wallet: "${emoji_Wallet} ${user} يمتلك ${bal} عملة(ات) !",
	balance_embed_fields1_name: "البنك",
	balance_embed_fields2_name: "الرصيد",

	// /daily
	daily_cooldown_error:
		"عذرًا، يجب عليك الانتظار **${time}** قبل تنفيذ هذا الأمر!",
	daily_embed_title: "يومي",
	daily_embed_description: "**مكافأة يومية**",
	daily_embed_fields: "تم جمعه",

	// /monthly
	monthly_cooldown_error:
		"عذرًا، يجب عليك الانتظار **${time}** قبل تنفيذ هذا الأمر!",
	monthly_embed_title: "شهري",
	monthly_embed_description: "**مكافأة شهرية**",
	monthly_embed_fields: "تم جمعه",

	// /pay
	pay_negative_number_error: "لا يمكن دفع مبلغ سلبي.",
	pay_dont_have_enought_to_give: "هذا المبلغ أكثر من رصيدك. حاول مرة أخرى.",
	pay_command_work:
		"${authorUsername}, لقد قمت بدفع مبلغ ${amount}$ بنجاح إلى ${userUsername}.",

	// /removemoney
	removemoney_not_admin:
		"لا يمكنك تنفيذ هذا الأمر لأنك لا تمتلك الصلاحيات اللازمة `ADMINISTRATOR`.",
	removemoney_embed_title: "تم إزالة المال!",
	removemoney_embed_fields: "المبلغ",
	removemoney_embed_second_fields: "تحديث الرصيد",
	removemoney_logs_embed_description:
		"<@${authorId}> قام بإزالة ${amount} عملة من <@${userId}>!",
	removemoney_logs_embed_title: "سجلات الاقتصاد",

	// /rob
	rob_cooldown_error: "**انتظر 50 دقيقة قبل محاولة سرقة مستخدم آخر!**",
	rob_dont_enought_error: ":x: تحتاج إلى 250$ على الأقل لسرقة شخص ما.",
	rob_him_dont_enought_error: ":x: ${userUsername} لا يمتلك ما يكفي لسرقته.",
	rob_embed_description:
		"<@${authorId}> قمت بسرقة <@${userId}> ونجحت في الهروب بمبلغ ${random}!",

	// /weekly
	weekly_cooldown_error:
		"عذرًا، يجب عليك الانتظار **${time}** قبل تنفيذ هذا الأمر!",
	weekly_embed_title: "أسبوعي",
	weekly_embed_description: "**مكافأة أسبوعية**",
	weekly_embed_fields: "تم جمعه",

	// /work
	work_cooldown_error:
		"<@${authorId}>, **انتظر ${time} دقيقة قبل محاولة العمل مرة أخرى!**",
	work_embed_author: "${authorUsername}, لقد أثمر عملك!",
	work_embed_description: "${authorUsername}, لقد عملت وكسبت ${amount}$!",

	// /withdraw
	withdraw_cannot_abuse:
		"${emoji_No} | لا يمكنك سحب مبلغ أكبر من الذي تمتلكه في البنك!",
	withdraw_embed_title: "سحب من البنك",
	withdraw_embed_desc:
		"${author}, لقد قمت بسحب ${toWithdraw}${emoji_Coin} من بنكك",
	withdraw_embed_fields1_name: "البنك",

	// /deposit
	deposit_cannot_abuse:
		"${emoji_No} | لا يمكنك إيداع مبلغ أكبر من الذي تمتلكه في المحفظة!",
	deposit_embed_title: "إيداع في البنك",
	deposit_embed_desc:
		"${author}, لقد قمت بإيداع ${toDeposit}${emoji_Coin} في بنكك",
	deposit_embed_fields1_name: "البنك",

	// /leaderboard
	economy_leaderboard_embed_title:
		"قائمة المتصدرين الاقتصادية لـ `${guildName}`",
	economy_leaderboard_embed_fields_value:
		"<@${userId}> - البنك: `${bank}`${emoji_Coin} | الرصيد: `${money}`${emoji_Coin}",

	// /economy (money and cooldown commands)
	economy_action_in_progress:
		"${emoji_No} | لا يزال أمر الاقتصاد السابق قيد التنفيذ، حاول مرة أخرى بعد لحظة.",

	// /economy disable
	economy_disable_not_admin:
		":x: | يجب أن تكون مشرفًا في هذا الخادم لتنفيذ هذا الأمر!",
	economy_disable_already_disable:
		"<@${authorId}>, تم تعطيل وحدة الاقتصاد بالفعل!",
	economy_disable_already_enable:
		"<@${authorId}>, تم تفعيل وحدة الاقتصاد بالفعل!",
	economy_disable_set_enable:
		"<@${authorId}>, لقد قمت بتفعيل وحدة الاقتصاد بنجاح!",
	economy_disable_set_disable:
		"<@${authorId}>, لقد قمت بتعطيل وحدة الاقتصاد بنجاح!",
	economy_disable_logs_embed_desc:
		"<@${authorId}> قام بتعيين حالة وحدة الاقتصاد إلى `${state}`!",
	economy_disable_logs_embed_title: "سجلات الاقتصاد",

	// /economy boost-set
	economy_boost_role_not_found: "الدور غير موجود. يجب تحديد سعر للدور.",
	economy_boost_embed_title: "نظام الاقتصاد - الأدوار القابلة للشراء",
	economy_boost_embed_desc: "جميع الأدوار القابلة للشراء مدرجة أدناه.",

	// /economy role add
	economy_role_add_no_role: "لا توجد أدوار قابلة للشراء للحذف.",
	economy_role_add_max_20_roles:
		"يمكنك فقط أن تضيف حتى 20 دورًا قابلاً للشراء.",
	economy_role_add_canceled: "لم يتم إضافة الدور إلى الأدوار القابلة للشراء.",
	economy_role_add_prompt_dangerous:
		"هل أنت متأكد أنك تريد إضافة هذا الدور إلى الأدوار القابلة للشراء؟\n**تحذير:** هذا الدور لديه أذونات خطيرة.\nالأذونات: ${stringDangerousPermissions}",

	// /economy shop
	economy_shop_embed_title: "🛍️ متجر `${guildName}`",
	economy_shop_embed_desc:
		"يتيح لك المتجر شراء العناصر/الأدوار باستخدام أموالك. يمكنك رؤية الأدوار المتاحة للشراء أدناه.",
	economy_shop_not_available: "الدور الذي اخترته غير متاح للشراء.",
	economy_shop_already_own_role: "أنت تملك هذا الدور بالفعل.",
	economy_shop_not_enough_money: "ليس لديك ما يكفي من المال لشراء هذا الدور.",
	economy_shop_role_purchased:
		"لقد قمت بشراء الدور **{roleName}** بنجاح مقابل **${rolePrice}** 💰.",
	economy_shop_unknown_role: "دور غير معروف",
	economy_shop_not_set:
		"لا توجد أدوار متاحة للشراء في هذا الخادم. يرجى الاتصال بمسؤول الخادم للحصول على مزيد من المعلومات.",
	economy_shop_already_owned: "تمتلكه بالفعل",
	economy_shop_menu_placeholder: "اختر دورًا للشراء",

	// /economy manage-rewards set-cooldown
	economy_manage_rewards_cooldown_invalid_time:
		"صيغة الوقت غير صالحة. يرجى استخدام صيغة وقت صحيحة.",
	economy_manage_rewards_cooldown_command_ok:
		"تم تعيين وقت الانتظار لـ ${type} إلى ${stime} بنجاح.",

	// /economy mange-rewards set-money
	economy_manage_rewards_set_money:
		"تم تعيين المال لـ ${type} إلى ${money} بنجاح.",

	// /economy role list
	economy_role_list_no_buyable_roles: "لا توجد رتب قابلة للشراء لعرضها.",
	economy_role_list_embed_title: "نظام الاقتصاد - الرتب القابلة للشراء",
	economy_role_list_embed_desc: "جميع الرتب القابلة للشراء مذكورة أدناه.",

	// /economy economy-ureset
	reset_ueconomy_are_you_sure:
		"**هل أنت متأكد حقًا أنك تريد حذف جميع بيانات الاقتصاد؟\nهذا الإجراء نهائي ولا يمكن التراجع عنه.**\n**هذا الإجراء خطير ومدمّر!!**",
	reset_ueconomy_logs_embed_title: "سجلات وحدة الاقتصاد (إجراء خطير)",
	reset_ueconomy_logs_embed_desc:
		"${author} قام بحذف جميع بيانات وحدة الاقتصاد الخاصة بـ ${user}!",

	// /economy economy-greset
	reset_geconomy_are_you_sure:
		"**هل أنت متأكد حقًا أنك تريد حذف جميع بيانات الاقتصاد لجميع أعضاء الخوادم؟\nهذا الإجراء نهائي ولا يمكن التراجع عنه.**\n**هذا الإجراء خطير ومدمّر!!**",
	reset_geconomy_logs_embed_title: "سجلات وحدة الاقتصاد (إجراء خطير جدًا)",
	reset_geconomy_logs_embed_desc:
		"${author} قام بحذف جميع بيانات وحدة الاقتصاد للجميع!",

	// Profil Customisation commands
	// /setprofilage, /setprofildescriptions, /profil

	// /setprofilage
	setprofilage_command_work: "**تم تحديث عمرك في الملف الشخصي بنجاح.**",

	// /setprofildescriptions
	setprofildescriptions_command_work: "**تم تحديث الوصف بنجاح.**",

	// /profil
	profil_not_description_set: "لم يتم تعيين الوصف!",
	profil_unknown: "غير معروف",
	profil_embed_title: "${emoji_Pin} __ملف تعريف ${memberTag}__",
	profil_embed_fields_nickname: "📝 ・ __اللقب__",
	profil_embed_fields_money: "🪙 ・ __المال__",
	profil_embed_fields_money_value: " عملات",
	profil_embed_fields_xplevels: "💳 ・ __مستويات XP__",
	profil_embed_fields_xplevels_value: " مستويات XP",
	profil_embed_fields_age: "🎂 ・ __العمر__",
	profil_embed_fields_age_value: " سنوات",
	profil_embed_fields_gender: "👤 ・ __الجنس__",
	profil_embed_fields_pronouns: "📌 ・ __الضمائر__",
	profil_embed_fields_birthdate: "🎂 ・ __تاريخ عيد الميلاد__",

	// /تعيين-تاريخ-الميلاد
	profil_birthday_month_button_label: "تعيين الشهر",
	profil_birthday_day_button_label: "تعيين اليوم",
	profil_birthday_year_button_label: "تعيين السنة",
	profil_birthday_embed_title: "🎂 ・ تعيين تاريخ ميلادك!",
	profil_birthday_embed_introduction:
		"${emoji_Sparkles} **مثل كل البشر، لديك عيد ميلاد!**${emoji_Sparkles}\n\n${emoji_Crown} ・ مرحباً، ${author}\n:tada: ・ من أجل الاحتفال به، حان الوقت لتعيينه!\n",
	profil_birthday_embed_current_birthday:
		"${emoji_Pin} ・ **تاريخ الميلاد الحالي**: `${birthdayMonth}/${birthdayDay}/${birthdayYear}` (بتنسيق شهر/يوم/سنة)",
	profil_birthday_modal1_title: "أدخل سنة ميلادك",
	profil_birthday_modal1_fields1_label: "السنة",
	profil_birthday_invalid_year: "سنة غير صالحة! الرجاء إدخال سنة صالحة.",
	profil_birthday_year_already_set: "تم تعيين السنة مسبقاً.",
	profil_birthday_year_set: "تم تعيين السنة!",
	profil_birthday_modal2_title: "أدخل شهر ميلادك",
	profil_birthday_modal2_fields1_label: "الشهر",
	profil_birthday_invalid_month: "شهر غير صالح! الرجاء إدخال شهر صالح.",
	profil_birthday_month_already_set: "تم تعيين الشهر مسبقاً.",
	profil_birthday_month_set: "تم تعيين الشهر!",
	profil_birthday_modal3_title: "أدخل يوم ميلادك",
	profil_birthday_modal3_fields1_label: "اليوم",
	profil_birthday_invalid_day: "يوم غير صالح! الرجاء إدخال يوم صالح.",
	profil_birthday_day_already_set: "تم تعيين اليوم مسبقاً.",
	profil_birthday_day_set: "تم تعيين اليوم!",

	// Utils commands
	// /serverinfo, /snipe, /userinfo, /renew

	// /serverinfo

	// /setrankroles
	setrankroles_not_admin:
		"${emoji_No} أنت لست مشرفًا في هذا الخادم. لا يمكنك تنفيذ هذه الأوامر!",
	setrankroles_already_this_in_db:
		"${emoji_No} الأدوار التصنيفية موجودة بالفعل في قاعدة بيانات هذا الخادم.",
	setrankroles_not_roles_typed:
		"${emoji_No} لم تقم بإدراج أي أدوار في أوامرك!",
	setrankroles_logs_embed_description_enable:
		"<@${authorId}> قام بتعيين دور التصنيف إلى <@&${argsid}>",
	setrankroles_logs_embed_title_enable: "تعيين دور التصنيف",
	setrankroles_logs_embed_description_disable:
		"<@${authorId}> قام بحذف دور التصنيف!",
	setrankroles_logs_embed_title_disable: "تعيين دور التصنيف",
	setrankroles_command_work_disable:
		"<@${authorId}>, لقد قمت بحذف دور التصنيف!",
	setrankroles_command_error:
		"${emoji_No} حدث خطأ في الأمر! يرجى المحاولة مرة أخرى لاحقًا.",

	// /snipe
	snipe_no_previous_message_deleted: "لا توجد رسائل محذوفة في هذه القناة!",

	// /userinfo
	userinfo_wait_please: "${emoji_Timer} يرجى الانتظار...",
	userinfo_var_notfound: "`لم يتم العثور عليه`",
	userinfo_button_label: "ملف المستخدم",

	// /renew
	renew_channel_send_success: "${author} تم إعادة إنشاء القناة!",
	renew_dont_have_permission: ":x: **لا يمكن** `لا تملك الإذن!`",
	renew_not_administrator: ":x: **أنت لست مشرفًا لاستخدام هذا الأمر!**",

	// /renewvc
	renewvc_not_in_voice:
		"${emoji_No} يجب أن تكون متصلاً بقناة صوتية لاستخدام هذا الأمر!",
	renewvc_region_success:
		"${emoji_Yes} تم تعيين المنطقة الصوتية لـ ${targetVc} إلى تلقائي!",
	renewvc_dont_have_permission: ":x: **لا يمكن** `لا تملك الإذن!`",

	// /prevnames
	prevnames_undetected: "لم يتم العثور على بيانات!",
	prevnames_not_admin: "ليس لديك صلاحية `ADMINISTRATOR` لتنفيذ هذا الأمر!",
	prevnames_data_erased:
		"تمت إزالة أسماء المستخدمين السابقة بالكامل بناءً على طلبك!",
	prevnames_embed_footer_text: "iHorizon | الصفحة ${page}/${pageCount}",

	// /blockbot
	blockbot_not_owner: ":x: **أنت لست مالك الخادم!**",
	blockbot_logs_enable_title: "سجل BlockBot",
	blockbot_logs_enable_description:
		"${author} (مالك الخادم) __قام بتمكين__ `BlockBot`. الآن لا يمكن إضافة البوت إلى هذا الخادم!",
	blockbot_command_work_on_enable:
		"**لقد قمت بتمكين `BlockBot`**\nالآن لا يمكن إضافة البوت إلى هذا الخادم!",
	blockbot_command_work_on_disable:
		"**لقد قمت بتعطيل `BlockBot`**\nالآن يمكن إضافة البوت إلى هذا الخادم!",
	blockbot_logs_disable_commmand_work: "سجل BlockBot",
	blockbot_logs_disable_description:
		"${author} (مالك الخادم) __قام بتعطيل__ `BlockBot`. الآن يمكن إضافة البوت إلى هذا الخادم!",

	// /banner
	banner_guild_no_banner: "الخادم ليس لديه راية.",
	banner_user_no_banner: "هذا المستخدم ليس لديه راية.",

	// /massiverole
	massiverole_too_much_member:
		"عدد كبير جدًا من الأعضاء، لا يمكن تنفيذ ذلك بسبب احتمالية وجود حد معدل!",

	// /nickrole
	nickrole_too_much_member:
		"عدد كبير جدًا من الأعضاء، لا يمكن متابعة التنفيذ بسبب احتمالية وجود حد معدل!",

	// /emoji
	emoji_send_new_emoji:
		"__تم إنشاء رمز تعبيري جديد__ بالاسم **${emojiName}**! (${emoji})",
	emoji_send_err_emoji:
		"__حدث خطأ عند إنشاء رمز تعبيري__ بالاسم **${emojiName}**!",

	// /derank
	derank_msg_failed: "حدث خطأ أثناء إزالة الأدوار.",
	derank_no_role: "هذا العضو ليس لديه أدوار للإزالة.",

	// /action unban all
	action_unban_all_no_banned_members: "لا يوجد أعضاء محظورين.",

	// /action unban undo

	// /vc
	vc_embed_desc:
		"## حالات الصوت\n`${voiceCount}` عضو/أعضاء في القناة الصوتية :\n${emoji_iHorizon_Streaming} **=>** ${streaming}\n${emoji_iHorizon_Deaf} **=>** ${deafened}\n${emoji_iHorizon_Mute} **=>** ${muted}\n${emoji_iHorizon_Camera} **=>** ${video}\n## حالات الأعضاء\n`${memberCount}` عضو/أعضاء في الخادم :\n${emoji_DND} **=>** ${dnd}\n${emoji_Online} **=>** ${online}\n${emoji_Idle} **=>** ${idle}\n${emoji_Invisible} **=>** ${offline}\n## حالات التعزيز\n`${boostCount}` تعزيز/تعزيزات في الخادم،\n${members}",

	vc_embed_fields_1_name: "・عدد الأعضاء",
	vc_embed_fields_1_value: "```py\n${memberCount} أعضاء```",
	vc_embed_fields_2_name: "・عدد القنوات",
	vc_embed_fields_2_value:
		"```py\n${textChannelSize} قناة نصية\n${voiceChannelSize} قناة صوتية```",
	vc_embed_short_desc:
		"## حالات الصوت\n`${voiceCount}` عضو/أعضاء في قناة صوتية:\n${emoji_iHorizon_Streaming} **=>** ${total_members_vc_streaming}\n${emoji_iHorizon_Deaf} **=>** ${total_members_vc_deaf}\n${emoji_iHorizon_Mute} **=>** ${total_members_vc_mute}\n${emoji_iHorizon_Camera} **=>** ${total_members_vc_video}\n## حالات الأعضاء\n`${total_members_size}` عضو/أعضاء في الخادم:\n${emoji_DND} **=>** ${total_members_states_dnd}\n${emoji_Online} **=>** ${total_members_states_online}\n${emoji_Idle} **=>** ${total_members_states_idle}",

	// /massmove
	massmove_too_much_member:
		"عدد كبير جدًا من الأعضاء، لا يمكن تنفيذ ذلك بسبب احتمالية وجود حد معدل!",

	// /all-admins
	all_admins_nobody_admins: "لا يوجد مشرفون في هذا الخادم!",
	all_admins_unrank_button_label: "إلغاء التصنيف لجميع",
	all_admins_unrank_not_owner:
		"فقط مالك الخادم يمكنه إلغاء تصنيف جميع المشرفين في الخادم",

	// /allbots

	// /addrole
	utils_addrole_highter_or_egal_roles_msg:
		"${emoji_Stop} لا يمكنك إضافة دور إلى مستخدم يمتلك دورًا أعلى منك...",
	utils_addrole_command_ok:
		"${author} قام بإضافة الدور ${role} بنجاح إلى ${user}",
	utils_addrole_not_wl:
		"${emoji_No} | الدور الذي تريد إضافته للمستخدم غير مدرج في القائمة البيضاء. يجب على المسؤول إضافته أولاً! (باستخدام `/utils wlroles`)",
	utils_addrole_cant_level:
		"العضو مش أدمن، وعايز تديه دور أدمن؟ أنت بتهزر؟ عايز تفجر السيرفر؟",
	utils_addrole_try2brain:
		"البوت مكانه تحت في ترتيب الأدوار. مش قادر أديه الدور ده حتى لو شكله بايخ.",

	// /delrole
	utils_delrole_highter_or_egal_roles_msg:
		"${emoji_Stop} لا يمكنك إزالة دور من مستخدم يمتلك دورًا أعلى منك...",
	utils_delrole_command_ok:
		"${author} قام بإزالة الدور ${role} بنجاح من ${user}",
	utils_delrole_not_wl:
		"${emoji_No} | الدور الذي تريد حذفه من المستخدم غير مدرج في القائمة البيضاء. يجب على المسؤول إضافته أولاً! (باستخدام `/utils wlroles`)",
	utils_delrole_try2brain:
		"البوت مكانه تحت في ترتيب الأدوار. مش قادر أشيل الدور الغبي ده.",

	// /utils wlroles
	utils_wlroles_embed_title: "الأدوار المسموح بها",
	utils_wlroles_embed_desc:
		"هذه هي جميع الأدوار المسموح بها التي يمكن إعطاؤها باستخدام أوامر `addrole` و `delrole`!",
	utils_wlRoles_logsEmbed_title: "وحدة أدوار القائمة البيضاء",
	utils_wlRoles_logsEmbed_desc:
		"${author} قام بتحرير أدوار القائمة البيضاء (لأوامر `addrole` و `delrole`)",
	utils_derogation_already_exists:
		"${emoji_No} تم إعداد دور الاستثناء ${role} بالفعل بشكل صحيح",
	utils_derogation_created:
		"${emoji_Yes} تم إنشاء دور الاستثناء ${role}. القنوات المتزامنة: `${updatedChannels}`. الإخفاقات: `${failedChannels}`",
	utils_derogation_resynced:
		"${emoji_Yes} كان دور الاستثناء ${role} موجودًا بالفعل، وقد أعدت مزامنة `${updatedChannels}` قناة. الإخفاقات: `${failedChannels}`",

	// /utils dm
	utils_dm: "${emoji_Yes} الرسالة اتبعتت بنجاح لـ ${targetMember}",
	utils_dm_cant:
		"${emoji_No} معرفتش أبعت الرسالة لـ ${targetMember}. يمكن يكون قافل الرسائل الخاصة أو يكون حظرني!",

	// /utils pic-only
	utils_pic_only_embed_title: "قنوات الوسائط فقط",
	utils_pic_only_emnbed_desc:
		"قناة يُسمح فيها فقط بالصور/الفيديوهات. يتم حظر المحتويات الأخرى (مثل الرسائل النصية العادية) بواسطة البوت",
	utils_piconly_embed_fields_3_name: "مدة المهلة",
	utils_piconly_select1_option1_label: "تغيير مدة المهلة",
	utils_piconly_select1_option2_label: "تغيير الحد",
	utils_piconly_modal1_title: "MediaOnly - إعدادات الوقت",
	utils_piconly_modal1_fields1_placeholder: "مدة الكتم",
	utils_piconly_modal1_fields1_label: "مدة الكتم",
	utils_piconly_modal2_title: "MediaOnly - إعداد الحد",
	utils_piconly_modal2_fields1_placeholder: "الحد قبل الكتم",
	utils_piconly_modal2_fields1_label: "الحد",
	utils_piconly_embed_fields2_placeholder: "إنشاء موضوع تحت الصورة/الفيديو",
	utils_piconly_var_thread_name: "موضوع بواسطة {name}",

	// /zip-emojis
	zip_emojis_doesnt_have_perm: "ليس لديك إذن لإدارة الرموز التعبيرية.",
	zip_emojis_command_work:
		"🎉 اكتمل التصدير في **${calcTime}** مللي ثانية! إليك الأرشيف الذي يحتوي على ${emojiCount} رمز تعبيري.",
	zip_emojis_command_error: "حدث خطأ أثناء تصدير الرموز التعبيرية.",

	// /zip-stickers
	zip_stickers_doesnt_have_perm: "ليس لديك إذن لإدارة الملصقات.",
	zip_stickers_command_work:
		"🎉 تم التصدير في **${calcTime}** مللي ثانية! إليك الأرشيف الذي يحتوي على ${stickerCount} ملصقات.",
	zip_stickers_command_error: "حدث خطأ أثناء تصدير الملصقات.",

	// +sticker
	sticket_no_sticker: "لم يتم العثور على ملصق في الرسالة التي تم الرد عليها.",
	sticket_command_work: "تم إنشاء الملصق `${name}` بنجاح.",
	sticker_command_error: "تعذر إنشاء الملصق. حدث خطأ: `${errMessage}`.",
	sticket_command_error2: "يرجى الرد على رسالة تحتوي على ملصق.",

	// /util nick-kicker
	util_nick_kicker_embed_desc:
		"عندما ينضم العضو، إذا كان لقبه يحتوي على كلمة محددة، سيتم طرده",
	util_nick_kicker_words: "الكلمات",
	util_nick_kicker_select_to_remove: "اختر كلمة لإزالتها",
	util_nick_kicker_remove_word: "إزالة هذه الكلمة",
	util_nick_kicker_no_word_to_remove: "لا توجد كلمة للإزالة",
	util_nick_kicker_add_word: "إضافة كلمة",
	util_nick_kicker_words_max_15: "لا يمكنك إضافة أكثر من 15 كلمة",
	util_nick_kicker_disable: "تعطيل",
	util_nick_kicker_remove_word2: "إزالة كلمة",
	util_nick_kicker_remove_desc: "إزالة كلمة من طارد الألقاب",
	util_nick_kicker_add_desc: "إضافة كلمة إلى طارد الألقاب",
	util_nick_kicker_disable_desc: "تعطيل طارد الألقاب",
	util_nick_kicker_enable_desc: "تفعيل طارد الألقاب",

	// /util wakeup
	util_wakeup_yourself:
		"يا أخي؟ أنت مجنون أم ماذا؟ لا تقلي أنك نائم على الكيبورد وتكتب هذا الأمر في نفس الوقت ههه",
	util_wakeup_not_in_vc:
		"يا أخي، البوت مش هيستنسخ ${userDisplayName} بنفس الصورة والبانر عشان يخليك تفتكر إنه صحي... هو أصلاً مش في الروم الصوتي 😂",
	util_wakeup_command_work: "يبدأ الآن الإيقاظ لـ ${user} !",

	// /util talk
	util_talk_not_in_vc: "يجب أن تكون في قناة صوتية لاستخدام هذا الأمر.",
	util_talk_audit_reason: "تم تفعيل وضع التحدث الصوتي",
	util_talk_logs_title: "التحدث الصوتي",
	util_talk_logs_description:
		"${author} قام بتفعيل وضع التحدث في ${voiceChannel} وكتم ${mutedCount} عضو(أعضاء). تم تخطي ${skippedCount} عضو(أعضاء).",
	util_talk_command_work:
		"تم الآن تفعيل وضع التحدث في ${voiceChannel}. تم كتم ${mutedCount} عضو(أعضاء) وتخطي ${skippedCount} عضو(أعضاء).",

	// /util untalk
	util_untalk_nothing_active: "لا يوجد وضع تحدث نشط لهذا السيرفر.",
	util_untalk_audit_reason: "تم تعطيل وضع التحدث الصوتي",
	util_untalk_logs_title: "إلغاء التحدث الصوتي",
	util_untalk_logs_description:
		"${author} قام بتعطيل وضع التحدث في ${voiceChannel} وإلغاء كتم ${unmutedCount} عضو(أعضاء).",
	util_untalk_command_work:
		"تم تعطيل وضع التحدث في ${voiceChannel}. تم إلغاء كتم ${unmutedCount} عضو(أعضاء).",

	// /util freeze
	util_freeze_logs_title: "تجميد القناة الصوتية",
	util_freeze_logs_description:
		"${author} قام بتجميد الوصول إلى ${voiceChannel}.",
	util_freeze_command_work: "القناة الصوتية ${voiceChannel} مجمدة الآن.",

	// /util wlvc
	util_wlvc_no_member:
		"يجب تحديد عضو للسماح له بالدخول إلى القناة الصوتية المجمدة.",
	util_wlvc_no_freeze: "لا توجد قناة صوتية مجمدة نشطة في هذا السيرفر.",
	util_wlvc_logs_title: "السماح في التجميد الصوتي",
	util_wlvc_logs_description:
		"${author} سمح لـ ${member} بالانضمام إلى القناة الصوتية المجمدة.",
	util_wlvc_command_work:
		"${member} مسموح له الآن بالانضمام إلى القناة الصوتية المجمدة.",

	// /util unwlvc
	util_unwlvc_no_member:
		"يجب تحديد عضو لإزالته من القائمة البيضاء للقناة الصوتية المجمدة.",
	util_unwlvc_no_freeze: "لا توجد قناة صوتية مجمدة نشطة في هذا السيرفر.",
	util_unwlvc_not_whitelisted:
		"${member} غير مسموح له بالدخول إلى القناة الصوتية المجمدة.",
	util_unwlvc_logs_title: "إزالة السماح من التجميد الصوتي",
	util_unwlvc_logs_description:
		"${author} قام بإزالة ${member} من القائمة البيضاء للقناة الصوتية المجمدة.",
	util_unwlvc_command_work:
		"${member} لم يعد بإمكانه الانضمام إلى القناة الصوتية المجمدة.",

	// /util unfreeze
	util_unfreeze_no_freeze: "لا توجد قناة صوتية مجمدة نشطة في هذا السيرفر.",
	util_unfreeze_logs_title: "إلغاء تجميد القناة الصوتية",
	util_unfreeze_logs_description:
		"${author} قام بإزالة التجميد الصوتي النشط.",
	util_unfreeze_command_work: "لم تعد القناة الصوتية مجمدة.",

	// /util leash
	util_leash_too_naugthy:
		"أيها الشقي الصغير، لا يمكنك وضع أكثر من 3 أشخاص في الحبل :D",
	util_leah_already_owned:
		"أيها الشقي الصغير، أنت تمتلك هؤلاء بالفعل :smirk:",
	util_leash_confirm_message:
		"${emoji_No} | العضو الذي تريد وضعه في الحبل ليس في قناة صوتية!\n${emoji_Warning_Icon} | هل أنت متأكد أنك تريد القيام بهذا الإجراء؟",
	util_leash_canceled_leash: "${emoji_Yes} | تم إلغاء إعدادات المقود",
	util_leash_confirmed_leash:
		"${emoji_Yes} | لقد نجحت في ربط المستخدم بالمقود في هذا الخادم :smirk:",

	// /util unleash
	util_unleash_not_in_leash: "${emoji_No} | هذا المستخدم ليس مربوطاً لديك!",
	util_unleash_command_ok:
		"${emoji_Yes} | لقد قمت بتحرير هذا المستخدم بنجاح في هذا السيرفر :)",

	// /utilss leashlist
	util_leashlist_no_data:
		"${emoji_No} | لا توجد أي رباطة نشطة في هذا السيرفر.",
	util_leashlist_embed_title: "الرباطات النشطة",

	// /util lockname, /util unlockname
	util_lockname_not_in_guild: "${emoji_No} | هذا العضو ليس في السيرفر!",
	util_lockname_not_manageable:
		"${emoji_No} | ليس لدي صلاحية إدارة لقب هذا العضو!",
	util_lockname_already_locked: "${emoji_No} | لقب هذا العضو مقفل بالفعل!",
	util_lockname_success:
		"${emoji_Yes} | تم قفل لقب ${member} على **${nick}**!",
	util_lockname_success_reset: "${emoji_Yes} | تم قفل لقب ${member}!",
	util_unlockname_not_locked: "${emoji_No} | لقب هذا العضو غير مقفل!",
	util_unlockname_success: "${emoji_Yes} | تم فتح قفل لقب ${member}!",
	util_lockname_logs_embed_title: "سجلات قفل الألقاب",
	util_lockname_logs_embed_description:
		"<@${authorId}> قفل لقب <@${memberId}>",
	util_unlockname_logs_embed_description:
		"<@${authorId}> فتح قفل لقب <@${memberId}>",

	util_locknamelist_empty:
		"${emoji_No} | لا يوجد لقب مقفل في هذا السيرفر! `/utilss lockname` لإنشاء واحد.",
	util_locknamelist_embed_title: "الألقاب المقفلة",

	// /util autorenew
	util_autorenew_time_too_short:
		"يجب أن يكون الوقت بين تجديد القناة أكثر من دقيقة واحدة",
	util_autorenew_time_too_long:
		"يجب أن تكون الفترة الزمنية بين تجديد الصالون أقل من 30 يوماً",
	util_autorenew_command_ok:
		"${emoji_Yes} الآن، سيتم حذف-إنشاء قناة ${channel} تلقائياً (تجديد) كل ${time}!\nلإيقاف تجديد القناة، فقط قم بحذفها بنفسك.",
	event_autorenew_channel_renewed: "لقد تم تجديد القناة!",
	event_autorenew_channel_warning:
		"تم تكوين وحدة AutoRenew لتجديد هذه القناة. التجديد التالي بعد ${time}.",

	// /util where
	var_video: "فيديو",
	var_whereis: "أين هو",
	util_not_in_vc: "الأعضاء ليسوا في قناة صوتية",

	// /util allwebhooks
	util_no_webhooks: "لا توجد webhooks في هذه الخادم.",
	util_allwebhooks_embed_title: "جميع الويب هوكس",
	util_allwebhooks_deleting: "جاري حذف جميع الويب هوكس...",
	util_allwebhooks_deleted: "**`${u}`** ويب هوك تم حذفه!",

	// /util unzip-emojis
	util_unzip_emojis_command_work:
		"🎉 اكتمل فك الضغط في ${calcTime} ملي ثانية! لقد قمت بإنشاء ${emojiCount} رمز تعبيري في السيرفر.",
	util_unzip_emojis_command_error: "حدث خطأ أثناء فك ضغط الرموز التعبيرية.",
	util_unzip_emojis_command_no_file:
		"يرجى إرفاق ملف مضغوط يحتوي على رموز تعبيرية.",

	// /util vkick
	vkick_member_not_in_guild: "العضو ليس في النقابة.",
	vkick_not_in_vc: "العضو ليس في قناة صوتية.",
	vkick_not_admin_kick: "لا يمكنك فصل مسؤول من قناة صوتية.",
	vkick_logEmbed_title: "طرد صوتي",
	vkick_logEmbed_desc:
		"${author} قام بفصل ${member} من القناة الصوتية ${voiceChannel}.",
	vkick_command_work:
		"${author}، لقد نجحت في فصل ${member} من ${voiceChannel}.",

	// /util sync
	util_sync_embed_description_0:
		"جميع القنوات في الفئة لديها بالفعل أذونات متزامنة.",

	// /util securewebhook
	util_securewebhook_action_create: "رابط Webhook Discord غير صالح",
	util_securewebhook_action_create_error:
		"خطأ أثناء إنشاء الويب هوك: `${status}`",
	util_securewebhook_action_create_ok:
		"تم إنشاء الويب هوك بنجاح\n> الرابط: ${url}\n> الاستخدام: ${use}",
	util_securewebhook_action_delete_any: "ليس لديك أي ويب هوك",
	util_securewebhook_action_delete_not_owner: "أنت لست مالك هذا الويب هوك",
	util_securewebhook_action_delete_error: "خطأ أثناء حذف الويب هوك",
	util_securewebhook_actiom_list_ok: ":star: __**الويب هوك الخاص بك**__:\n",

	// /util admin-roles
	admin_roles_nobody_roles: "لا يوجد دور مسؤول في هذا الخادم!",
	admin_roles_remove_button_label: "إزالة المسؤول من الجميع",
	admin_roles_remove_not_owner: "أنت لست مالك الخادم!",

	// /util rolelimit
	util_rolelimit_bad_opt:
		"${emoji_No} | الخيارات المقدمة غير صالحة. يرجى التحقق من الإدخال.",
	util_rolelimit_good:
		"${emoji_Crown} | الدور: ${role} | الحد الأقصى للأعضاء: ${limit_count}\n- لن يتمكن المستخدمون الجدد من الحصول على هذا الدور إذا كان ${limit_count} عضوًا يمتلكونه بالفعل.",

	// /util inviteinfo
	util_inviteinfo_not_valid_invite: "رابط الدعوة `discord_invite` غير صالح!",

	// /util cooldown
	util_cooldown_command_ok:
		"تم تغيير وضع البطء في القناة إلى ${duration_in_string}.",

	// /util role-members
	util_role_members_no_one: "لا يوجد أي شخص لديه هذا الدور في الخادم",

	// /util vanity-generator
	util_vanity_generator_invalid_code:
		"رمز URL Vanity `${VanityCode}` غير صالح. يجب أن تكون السلسلة أبجدية رقمية ويمكن أن تحتوي على شرطات بين الكلمات. الحد الأقصى للطول هو 32 حرفًا. لا يمكن أن تكون الشرطات في بداية أو نهاية السلسلة.",
	util_vanity_generator_already_claimed:
		"رمز URL Vanity هذا مُستخدم بالفعل! اختر رمزًا آخر.",
	util_vanity_generator_command_err:
		"حدث خطأ أثناء إنشاء رمز vanity. يرجى المحاولة مرة أخرى لاحقًا.",

	// +top
	utils_top_no_message: "لا توجد رسائل في هذه القناة",
	utils_top_command_ok: "الرسالة الأولى في هذه القناة موجودة [هنا](${link})",

	// +bringall
	bringall_no_from_channel: "الرجاء تحديد قناة صوتية مصدر.",
	bringall_invalid_category: "الرجاء تحديد فئة صالحة.",
	bringall_no_voice_channels: "الفئة المحددة لا تحتوي على قنوات صوتية.",
	bringall_no_members: "لا يوجد أعضاء في القناة الصوتية المصدر.",

	// /util move
	util_move_not_in_vc: "العضو الذي تريد نقله غير متصل بأي قناة صوتية",
	util_move_impossible_to_move_admin:
		"العضو الذي تريد نقله مسؤول، وأنت لست مسؤولًا أيضًا.",
	util_move_command_ok: "${member} الآن في ${channel}",

	// Guild Config commands
	// /blockpub, /guildprofil, /setchannels, /setjoindm, /setjoinmessage, /setjoinroles, /setleavemessage, /setup

	// /blockpub
	blockpub_not_admin: ":x: | يجب أن تكون مشرفًا في هذا الخادم!",
	blockpub_now_enable:
		"📌 | تم تفعيل نظام مكافحة الإعلانات (يعمل مع الجميع باستثناء المشرفين)",
	blockpub_now_disable: "📌 | تم تعطيل نظام مكافحة الإعلانات!",

	// /guildprofil
	guildprofil_not_admin: ":x: | يجب أن تكون مشرفًا في هذا الخادم!",
	guildprofil_not_set_reactionrole: "لم يتم تعيينه!",
	guildprofil_set_reactionrole:
		"**MessageID**: `${i}` -> ${emoji} يعطي <@&${rolesID}> دور\n",
	guildprofil_not_set_ticketFetched: "لم يتم تعيينه!",
	guildprofil_set_ticketFetched: "",
	guildprofil_not_set_punishPub: "لم يتم تعيينه!",
	guildprofil_set_punishPub:
		"`${punishementType}`: أقصى: `${amountMax}` علامات.",
	guildprofil_not_set_supportConfig: "لم يتم تعيينه!",
	guildprofil_set_supportConfig:
		"`${input}` في السيرة الذاتية يعطي <@&${rolesId}> دور.",
	guildprofil_not_set_setchannelsjoin: "لم يتم تعيينه!",
	guildprofil_set_setchannelsjoin: "",
	guildprofil_not_set_setchannelsleave: "لم يتم تعيينه!",
	guildprofil_set_setchannelsleave: "",
	guildprofil_not_set_joinmessage: "لم يتم تعيينه!",
	guildprofil_set_joinmessage: "",
	guildprofil_not_set_leavemessage: "لم يتم تعيينه!",
	guildprofil_set_leavemessage: "",
	guildprofil_not_set_joinroles: "لم يتم تعيينه!",
	guildprofil_set_joinroles: "",
	guildprofil_not_set_joinDmMessage: "لم يتم تعيينه!",
	guildprofil_set_joinDmMessage: "",
	guildprofil_not_set_blockpub: "مغلق",
	guildprofil_set_blockpub: "مفتوح",
	guildprofil_embed_description: "`إعدادات الخادم:` ${guildName}!",
	guildprofil_embed_fields_joinmessage: "رسالة الانضمام",
	guildprofil_embed_fields_leavemessage: "رسالة الخروج",
	guildprofil_embed_fields_setchannelsjoin: "قناة الانضمام",
	guildprofil_embed_fields_setchannelsleave: "قناة الخروج",
	guildprofil_embed_fields_joinroles: "دور الانضمام",
	guildprofil_embed_fields_joinDmMessage: "رسالة DM عند الانضمام",
	guildprofil_embed_fields_blockpub: "حظر الإعلانات",
	guildprofil_embed_fields_punishPub: "عقوبة الإعلانات",
	guildprofil_embed_fields_supportConfig: "الدعم",
	guildprofil_embed_fields_ticketFetched: "التذاكر",
	guildprofil_embed_fields_reactionrole: "دور التفاعل",
	guildprofil_not_logs_set: "لم يتم تعيين قناة السجلات",
	guildprofil_blockbot_on: "تم تفعيل حظر البوت",
	guildprofil_blockbot_off: "تم تعطيل حظر البوت",
	guildprofil_disable_xp: "تعطيل الرسائل",
	guildprofil_enable_xp: "تفعيل الرسائل",
	guildprofil_another_enable_xp: "تفعيل الرسائل المرسلة في <#${xpChannels}>",
	guildprofil_embed_fields_blockbot: "حظر البوت",
	guildprofil_embed_fields_logs: "السجلات",
	guildprofil_embed_fields_ranks: "الرتب",

	// /setchannels
	setchannels_not_admin:
		":x: | يجب أن تكون مشرفًا في هذا الخادم لطلب هذه الأوامر!",
	setchannels_not_specified_args: "يجب أن تحدد قناة صالحة لوحدتك.",
	setchannels_already_this_channel_on_join:
		"الوحدة مكونة بالفعل بهذا القناة!",
	setchannels_confirmation_message_on_join:
		"**قناة الانضمام تم تعيينها هنا!** :tada:",
	setchannels_command_error_on_join:
		"خطأ: صلاحيات مفقودة أو القناة غير موجودة",
	setchannels_command_work_on_join:
		"لقد قمت بنجاح بتعيين قناة الانضمام إلى <#${argsidId}>",
	setchannels_logs_embed_title_on_join: "تعيين قناة السجلات",
	setchannels_logs_embed_description_on_join:
		"<@${authorId}> قام بتعيين قناة الانضمام إلى: <#${argsidId}>",
	setchannels_already_this_channel_on_leave:
		"الوحدة مكونة بالفعل بهذا القناة!",
	setchannels_confirmation_message_on_leave:
		"**قناة الخروج تم تعيينها هنا!** :tada:",
	setchannels_command_error_on_leave:
		"خطأ: صلاحيات مفقودة أو القناة غير موجودة",
	setchannels_command_work_on_leave:
		"لقد قمت بنجاح بتعيين قناة الخروج إلى <#${argsidId}>",
	setchannels_logs_embed_title_on_leave: "تعيين قناة السجلات",
	setchannels_logs_embed_description_on_leave:
		"<@${authorId}> قام بتعيين قناة الخروج إلى: <#${argsidId}>",
	setchannels_already_on_off: "قنوات الانضمام والخروج معطلة بالفعل",
	setchannels_command_work_on_off:
		"لقد قمت بنجاح بتعطيل قنوات الانضمام والخروج!",
	setchannels_logs_embed_title_on_off: "تعيين قناة السجلات",
	setchannels_logs_embed_description_on_off:
		"<@${authorId}> حذف جميع إعدادات قنوات الانضمام/الخروج!",
	setchannels_button_join: "تغيير قناة الانضمام",
	setchannels_button_leave: "تغيير قناة الخروج",
	setchannels_button_delete: "حذف الإعداد",
	setchannels_embed_fields_value_join: "قناة الانضمام",
	setchannels_embed_fields_value_leave: "قناة الخروج",
	setchannels_not_a_text_channel:
		"${emoji_Warning_Icon} القناة المحددة ليست قناة نصية!",
	setchannels_which_channel: "<@${authorId}>, أي قناة تريد تعيينها؟",
	setchannels_title_embed_panel: "لوحة الإعداد لقنوات GuildConfig",

	// /setjoindm
	setjoindm_not_admin:
		":x: | يجب أن تكون مشرفًا في هذا الخادم لطلب هذه الأوامر!",
	setjoindm_logs_embed_title_on_enable: "تعيين سجل JoinDm",
	setjoindm_logs_embed_description_on_enable:
		"<@${authorId}> قام بتعيين رسالة DM عند الانضمام!",
	setjoindm_not_specified_args_on_enable:
		"يجب أن تحدد رسالة صالحة لـ DM عند الانضمام.",
	setjoindm_confirmation_message_on_enable:
		"لقد قمت بنجاح بتعيين DM عند الانضمام إلى :```${dm_msg}``` وتفعيله",
	setjoindm_command_error_on_enable:
		"خطأ: صلاحيات مفقودة أو القناة غير موجودة",
	setjoindm_logs_embed_title_on_disable: "تعيين سجل JoinDm",
	setjoindm_logs_embed_description_on_disable:
		"<@${authorId}> قام بتعطيل رسالة DM عند الانضمام!",
	setjoindm_confirmation_message_on_disable:
		"لقد قمت بنجاح بتعطيل DM عند الانضمام!",
	setjoindm_command_error_on_disable:
		"خطأ: صلاحيات مفقودة أو القناة غير موجودة",
	setjoindm_already_disable: "رسالة DM عند الانضمام معطلة بالفعل!",
	setjoindm_not_setup_ls: "لا توجد إعدادات DM عند الانضمام هنا!",
	setjoindm_command_work_ls:
		"رسالة DM عند الانضمام هي: \n```${already_off}```",
	setjoindm_help_embed_title: "مساعدة تعيين رسالة JoinDM!",
	setjoindm_help_embed_desc:
		"{memberUsername} => اسم المستخدم للعضو\n{memberMention} => ذكر العضو\n{memberCount} => عدد الأعضاء في الخادم\n{guildName} => اسم الخادم\n{createdAt} => تاريخ إنشاء الحساب باليوم/الشهر/السنة\n{accountCreationTimestamp} => توقيت تاريخ إنشاء الحساب",
	setjoindm_buttom_set_name: "تعيين الرسالة",
	setjoindm_buttom_delete_name: "حذف رسالة DM",
	setjoindm_awaiting_response: "اكتب رسالة JoinDM جديدة مخصصة في القناة.",

	// /setjoinmessage
	setjoinmessage_not_admin:
		":x: | يجب أن تكون مشرفًا في هذا الخادم لطلب هذه الأوامر!",
	setjoinmessage_help_embed_title: "مساعدة setjoinmessage!",
	setjoinmessage_help_embed_description:
		"/setjoinmessage <تشغيل / إيقاف التشغيل / عرض الرسالة المحددة> <رسالة الانضمام>",
	setjoinmessage_help_embed_fields_name: "كيف تستخدم؟",
	setjoinmessage_help_embed_fields_value:
		"استخدم ```/setjoinmessage <تشغيل / إيقاف التشغيل / عرض الرسالة المحددة> <الرسالة>```\n{user} = اسم المستخدم للعضو\n{membercount} = عدد أعضاء الخادم\n{createdat} = تاريخ إنشاء حساب العضو\n{guild} = اسم الخادم\n{inviter} = اسم المستخدم والتمييز للداعي\n{invites} = عدد الدعوات للعضو",
	setjoinmessage_logs_embed_title_on_enable: "سجلات SetJoinMessage",
	setjoinmessage_logs_embed_description_on_enable:
		"<@${authorId}> قام بتعيين رسالة الانضمام!",
	setjoinmessage_command_work_on_enable:
		"${emoji_GreenTick} | تم تعيين رسالة الانضمام المخصصة بنجاح.",
	setjoinmessage_logs_embed_title_on_disable: "سجلات SetJoinMessage",
	setjoinmessage_logs_embed_description_on_disable:
		"<@${authorId}> حذف رسالة الانضمام!",
	setjoinmessage_command_work_on_disable:
		"${emoji_Yes} | تم حذف رسالة الانضمام المخصصة بنجاح.",
	setjoinmessage_command_work_ls: "رسالة الانضمام هي:",
	setjoinmessage_help_embed_fields_custom_name: "الرسالة المخصصة",
	setjoinmessage_help_embed_fields_custom_name_empy: "لم يتم تعيينها!",
	setjoinmessage_help_embed_fields_default_name_empy: "الرسالة الافتراضية",
	setjoinmessage_help_embed_desc:
		"{memberUsername} => اسم المستخدم للعضو\n{memberMention} => ذكر العضو\n{inviterUsername} => اسم المستخدم للداعي\n{inviterMention} => ذكر الداعي\n{memberCount} => عدد الأعضاء في الخادم\n{invitesCount} => عدد الدعوات من الداعي\n{guildName} => اسم الخادم\n{createdAt} => تاريخ إنشاء الحساب باليوم/الشهر/السنة\n{accountCreationTimestamp} => توقيت تاريخ إنشاء الحساب",
	setjoinmessage_button_set_name: "تعيين الرسالة",
	setjoinmessage_buttom_del_name: "الرسالة الافتراضية",
	setjoinmessage_awaiting_response: "اكتب رسالة الانضمام المخصصة الجديدة.",
	setjoinmessage_image_default_text:
		"أهلا بك {memberUsername} في {guildName}<br>نحن الآن {memberCount} في الخادم",
	setjoinmessage_change_image_button_title: "تغيير الصورة",
	setjoinmessage_default_image_button_title: "الصورة الافتراضية",
	setjoinmessage_var_enable_image: "تمكين الصورة",
	setjoinmessage_var_disable_image: "حذف الصورة",
	setjoinmessage_var_image_card: "بطاقة رسالة الترحيب",
	setjoinmessage_change_image_propreties_background: "تغيير الخلفية",
	setjoinmessage_change_image_propreties_frame_color:
		"تغيير لون الإطار الدائري",
	setjoinmessage_change_image_propreties_text_colour: "تغيير لون النص",
	setjoinmessage_change_image_propreties_text_message: "تغيير رسالة النص",
	setjoinmessage_change_image_propreties_text_size: "تغيير حجم النص",
	setjoinmessage_change_image_propreties_avatar_size:
		"تغيير حجم الصورة الرمزية",
	setjoinmessage_modal_fields_background_url: "رابط صورة الخلفية",
	setjoinmessage_change_image_menu_frame_color_profil:
		"بناءً على لون ملف المستخدم الشخصي",
	setjoinmessage_change_image_menu_frame_status_profil:
		"بناءً على حالة المستخدم",
	setjoinmessage_modal_fields_hex_color: "لون www.color-hex.com",
	setjoinmessage_modal_fields_message: "الرسالة التي تريدها",
	setjoinmessage_var_text_size: "حجم النص: ",
	setjoinmessage_var_avatar_size: "حجم الصورة الرمزية: ",
	setjoinmessage_change_image_invalid_url:
		"عنوان URL للصورة غير صالح. يرجى المحاولة باستخدام مزود صور آخر.",

	// /setjoinroles
	setjoinroles_var_none: "لا شيء",
	setjoinroles_var_perm_admin: "مشرف",
	setjoinroles_var_perm_manage_guild: "إدارة الخادم",
	setjoinroles_var_perm_manage_role: "إدارة الأدوار",
	setjoinroles_var_perm_use_mention: "استخدام @everyone @here وذكر الأدوار",
	setjoinroles_var_perm_ban_members: "حظر الأعضاء",
	setjoinroles_var_perm_kick_members: "طرد الأعضاء",
	setjoinroles_var_perm_manage_webhooks: "إدارة الويب هوكس",
	setjoinroles_var_perm_manage_channels: "إدارة القنوات",
	setjoinroles_var_perm_manage_expression:
		"إدارة الرموز التعبيرية، الملصقات والصوتيات",
	setjoinroles_var_perm_view_monetization_analytics:
		"عرض تحليلات وإيرادات المبدعين",
	setjoinroles_var_perm_issue: "لا أملك إذن لإدارة الأدوار.",
	setjoinroles_var_timesup: "انتهى الوقت لاختيار الدور.",
	setjoinroles_warn_dangerous_perm:
		"الأدوار التالية تحتوي على صلاحيات خطيرة. هل تريد فعلاً تعيينها؟",
	setjoinroles_warn_title: "تحذير!",
	setjoinroles_timesup_button: "انتهى الوقت!",
	setjoinroles_action_canceled: "تم إلغاء الإجراء",
	setjoinroles_too_highter_roles:
		"الأدوار التالية لها موضع أعلى مقارنة بموقعي.",
	setjoinroles_not_admin:
		":x: | يجب أن تكون مشرفًا في هذا الخادم لطلب هذه الأوامر!",
	setjoinroles_help_embed_title: "وحدة JoinRoles",
	setjoinroles_help_embed_description:
		"هنا جميع الأدوار التي أعطيها للأعضاء الجدد",
	setjoinroles_help_embed_fields_1_name: "جميع الأدوار المسجلة",
	setjoinroles_logs_embed_title_on_enable: "سجلات SetJoinRoles",
	setjoinroles_logs_embed_description_on_enable:
		"<@${authorId}> قام بتعيين الأدوار عند الانضمام!",
	setjoinroles_already_on_enable:
		"الأدوار عند الانضمام مكونة بالفعل بهذا الدور!",

	// /welcomer
	welcomer_panel_title: "الترحيب",
	welcomer_section_placeholder: "اختر ما تريد ضبطه",
	welcomer_section_channels: "القنوات",
	welcomer_embed_label: "إمبيد مخصص",
	welcomer_text_label: "النص",
	welcomer_embed_set_button: "تعيين الإمبيد",
	welcomer_embed_remove_button: "إزالة الإمبيد",
	welcomer_embed_modal_title: "تعيين إمبيد مخصص",
	welcomer_embed_modal_label: "معرّف الإمبيد (من منشئ الإمبيد)",
	welcomer_embed_not_found:
		"لم يتم العثور على إمبيد محفوظ بالمعرّف `${embed_id}`. أنشئ واحدًا أولاً باستخدام منشئ الإمبيد.",
	welcomer_embed_set_ok:
		"سيتم الآن إرسال الإمبيد المخصص `${embed_id}` لهذا الحدث. يتم استبدال المتغيرات مثل {memberMention} تلقائيًا.",
	welcomer_embed_removed_ok:
		"تمت إزالة الإمبيد المخصص. العودة إلى البطاقة الافتراضية.",
	welcomer_text_enable_button: "تفعيل النص",
	welcomer_text_disable_button: "تعطيل النص",
	welcomer_components_enable_button: "تفعيل Components",
	welcomer_components_disable_button: "تعطيل Components",
	welcomer_render_mode_label: "وضع العرض",
	welcomer_render_mode_components: "Components (بطاقة)",
	welcomer_render_mode_simple: "رسالة بسيطة",

	// /setleavemessage
	setleavemessage_not_admin:
		":x: | يجب أن تكون مشرفًا في هذا الخادم لطلب هذه الأوامر!",
	setleavemessage_help_embed_title: "مساعدة /setleavemessage!",
	setleavemessage_help_embed_description:
		"/setleavemessage <تشغيل / إيقاف التشغيل / عرض الرسالة المحددة> <رسالة الخروج>",
	setleavemessage_help_embed_fields_name: "كيف تستخدم؟",
	setleavemessage_help_embed_fields_value:
		"استخدم ```/setleavemessage <تشغيل / إيقاف التشغيل / عرض الرسالة المحددة> <الرسالة>```\n{user} = اسم المستخدم للعضو\n{membercount} = عدد أعضاء الخادم\n{guild} = اسم الخادم",
	setleavemessage_logs_embed_title_on_enable: "سجلات SetLeaveMessage",
	setleavemessage_logs_embed_description_on_enable:
		"<@${authorId}> قام بتعيين رسالة الخروج!",
	setleavemessage_command_work_on_enable:
		"${emoji_Yes} | تم تعيين رسالة الخروج المخصصة بنجاح.",
	setleavemessage_logs_embed_title_on_disable: "سجلات SetLeaveMessage",
	setleavemessage_logs_embed_description_on_disable:
		"<@${authorId}> حذف رسالة الخروج!",
	setleavemessage_command_work_on_disable:
		"${emoji_Yes} | تم حذف رسالة الخروج المخصصة بنجاح.",
	setleavemessage_command_work_ls: "رسالة الخروج هي:",
	setleavemessage_awaiting_response: "اكتب رسالة الخروج المخصصة الجديدة.",

	// /setup
	setup_not_admin: ":x: | يجب أن تكون مشرفًا في هذا الخادم!",
	setup_command_work: "${emoji_Yes} | إعداد القناة",
	setup_command_error:
		"لقد قام البوت بالفعل بإعداد قنوات السجلات! أو أن البوت ليس لديه إذن...",

	// /setlogschannel
	setlogschannel_not_admin:
		":x: | يجب أن تكون مشرفًا في هذا الخادم لطلب هذه الأوامر!",
	setlogschannel_not_specified_args:
		"يجب أن تحدد قناة صالحة للوحدة الخاصة بك.",
	setlogschannel_confirmation_message:
		"${emoji_Yes} | تم إعداد `${typeOfLogs}` هنا بواسطة <@${authorId}>!",
	setlogschannel_already_this_channel: "تمت إعداد القناة لهذا الخادم بالفعل!",
	setlogschannel_already_deleted: "لم يعد لهذا الخادم `SERVER_LOGS`!",
	setlogschannel_command_error: "خطأ؟",
	setlogschannel_command_work:
		"لقد قمت بنجاح بإعداد `${typeOfLogs}` في <#${argsidId}>!",
	setlogschannel_utils_command_work:
		"لقد قمت بنجاح بإعداد `${typeOfLogs}` في ${argsidId}!",
	setlogschannel_command_work_on_delete:
		"لقد قمت بنجاح بحذف جميع `SERVER_LOGS` في **${guildName}**",
	setlogschannel_logs_embed_title: "تعيين سجلات الخادم",
	setlogschannel_logs_embed_description_on_enable:
		"<@${authorId}> قام بتعيين `${typeOfLogs}` إلى <#${argsidId}>",
	setlogschannel_logs_embed_title_on_off: "تعيين سجلات الخادم",
	setlogschannel_logs_embed_description_on_off:
		"<@${authorId}> حذف جميع `SERVER_LOGS` في الخادم!",
	setlogschannel_var_roles: "سجلات الأدوار",
	setlogschannel_var_mods: "سجلات الإدارة",
	setlogschannel_var_voice: "سجلات الصوت",
	setlogschannel_var_msg: "سجلات الرسائل",
	setlogschannel_var_boost: "سجلات التعزيز",
	setlogschannel_var_tickets: "سجلات التذاكر",
	setlogschannel_var_antispam: "سجلات مكافحة الرسائل المزعجة",
	setlogschannel_var_channel: "سجلات القناة",
	setlogschannel_var_confession: "سجلات الاعترافات",
	setlogschannel_all_already_exist: "جميع قنوات السجلات مكونة بالفعل!",
	setlogschannel_var_economy: "سجلات الاقتصاد",

	// /join-ghostping add
	joinghostping_add_already_set: "القناة ${channel} تم إعدادها بالفعل!",
	joinghostping_add_sent_to_channel:
		"من الآن فصاعدًا، عند انضمام عضو إلى الخادم، سأرسل رسالة وهمية **هنا**.",
	joinghostping_add_ok_embed_title: "وحدة Join GhostPing",
	joinghostping_add_ok_embed_desc:
		"سأرسل الآن رسالة وهمية في هذه القناة كلما انضم عضو إلى الخادم!",
	joinghostping_add_ok_embed_fields_name: "جميع القنوات المسجلة",
	joinghostping_add_logs_embed_title: "سجلات Join GhostPing",
	joinghostping_add_logs_embed_desc:
		"${author} قام بإضافة ${channel} إلى وحدة Join GhostPing!",

	// /join-ghostping remove
	joinghostping_remove_isnt_set: "القناة ${channel} غير مهيأة!",
	joinghostping_remove_ok_embed_desc:
		"تم حذف القنوات من وحدة Join GhostPing!",
	joinghostping_remove_logs_embed_desc:
		"${author} قام بحذف ${channel} من وحدة Join GhostPing!",

	// /automod
	automod_panel_title: "لوحة تحكم AutoMod",
	automod_panel_desc:
		"قم بتهيئة كل قاعدة AutoMod من iHorizon: فعّلها أو عطّلها، وحدد قناة السجلات، واختر الأدوار التي يمكنها تجاوزها.",
	automod_panel_overview_title: "القواعد المحمية",
	automod_panel_select_placeholder: "اختر قاعدة لإعدادها",
	automod_panel_label_logs: "قناة السجلات",
	automod_panel_label_bypass: "أدوار التجاوز",
	automod_panel_label_mention_limit: "حد الإشارات",
	automod_panel_rule_spam_name: "رسائل السبام",
	automod_panel_rule_spam_desc: "يحظر الفيض والرسائل المتكررة في الخادم.",
	automod_panel_rule_mass_mention_name: "الإشارات الجماعية",
	automod_panel_rule_mass_mention_desc:
		"يحظر الرسائل التي تحتوي على عدد مفرط من الإشارات.",
	automod_panel_rule_antipub_name: "الروابط والإعلانات",
	automod_panel_rule_antipub_desc:
		"يحظر روابط الإعلانات، مع قائمة آمنة (GitHub و Tenor و YouTube ...).",
	automod_panel_rule_media_name: "دعوات Discord",
	automod_panel_rule_media_desc:
		"يحظر روابط دعوة خوادم Discord المرسلة في الرسائل.",
	automod_panel_rule_telegram_name: "روابط Telegram",
	automod_panel_rule_telegram_desc:
		"يحظر روابط Telegram (t.me و telegram.me و tg://...).",
	automod_panel_logs_placeholder: "اختر قناة استقبال سجلات هذه القاعدة",
	automod_panel_bypass_placeholder: "اختر الأدوار التي تتجاوز هذه القاعدة",
	automod_panel_enable_button: "تفعيل",
	automod_panel_disable_button: "تعطيل",
	automod_panel_back_button: "رجوع",
	automod_panel_refresh_button: "تحديث",
	automod_panel_close_button: "إغلاق اللوحة",
	automod_panel_rule_enabled: "تم تفعيل القاعدة **${rule}**!",
	automod_panel_rule_disabled: "تم تعطيل القاعدة **${rule}**!",
	automod_panel_bypass_saved: "تم تحديث أدوار تجاوز **${rule}**!",
	automod_panel_logs_saved: "تم إرسال سجلات **${rule}** الآن في ${channel}.",
	automod_panel_logs_reset: "تمت إزالة قناة سجلات **${rule}**!",
	automod_panel_api_error:
		"لم أتمكن من تطبيق هذا التغيير، تأكد من أن لدي إذن `إدارة الخادم` وأن قواعد AutoMod الافتراضية في Discord معطّلة، ثم حاول مرة أخرى.",

	// /guildconfig block too-new-account
	too_new_account_dont_specified_time_on_enable:
		"لم تقم بتحديد وقت. لتمكين هذه الوحدة، يلزم أن يكون عمر الحساب الأدنى محددًا!",
	too_new_account_invalid_time_on_enable:
		"الوقت الذي أدخلته غير صالح! **مثال على الوقت الصحيح**: `3h; 30m; 4w; 4y` -> 3 ساعات؛ 30 دقيقة؛ 4 أسابيع؛ 4 سنوات",
	too_new_account_logEmbed_title: "وحدة الحسابات الجديدة جدًا",
	too_new_account_logEmbed_desc_on_enable:
		"${author} قام بتفعيل وحدة TooNewAccount. يجب أن يكون عمر الحسابات الآن على الأقل ${beautifulTime}، وإذا انضم المستخدم أكثر من `${maxJoin}` مرة، سيتم حظره.",
	too_new_account_command_work_on_enable:
		"${author}, الآن، سيتم طرد الأعضاء الجدد الذين ينضمون إلى **${guildName}** بحسابات أقل من `${beautifulTime}`.",
	too_new_account_command_work_on_enable2:
		"\n-#  ${emoji_Sparkles} بعد أن ينضم الحساب إلى الخادم **`${maxJoin}`** مرة، سيتم حظره.",
	too_new_account_logEmbed_desc_on_disable:
		"${author} قد قام بإيقاف هذه الوحدة!",
	too_new_account_command_work_on_disable:
		"${author}, تم تعطيل الوحدة بنجاح. لن يتم التحقق بعد الآن من تواريخ إنشاء الحسابات للأعضاء الجدد.",

	// /guildconfig set-bot footer-name
	guildconfig_setbot_footername_footer_too_long_msg:
		"اسم التذييل طويل جدًا، سيكون عرضه غير جميل.",
	guildconfig_setbot_footername_is_good:
		"تم التغيير بنجاح، جميع الرسائل المدمجة من iHorizon ستستخدم `${footerName}` كتذييل!",
	guildconfig_setbot_footername_is_reset:
		"تم حذف اسم التذييل. الآن جميع الرسائل المدمجة من iHorizon ستستخدم `اسم البوت`.",
	guildconfig_setbot_footername_not_found:
		"لم يتم العثور على اسم التذييل. يرجى المحاولة مرة أخرى!",

	// /guildconfig set-bot footer-pfp
	guildconfig_setbot_footeravatar_is_good:
		"تم التغيير بنجاح، جميع الرسائل المدمجة من iHorizon ستستخدم `الصورة` كتذييل!",
	guildconfig_setbot_footeravatar_incorect:
		"الملف لا يتوافق مع صورة. يرجى المحاولة مرة أخرى بصورة.",
	guildconfig_setbot_footeravatar_is_reset:
		"تم حذف صورة التذييل. الآن جميع الرسائل المدمجة من iHorizon ستستخدم `صورة البوت`.",

	// /guildconfig set-bot prefix
	guildconfig_setbot_prefix_prefix_now_mention:
		"الرمز المميز للبوت لأوامر الرسائل هو الآن الإشارة! `@Ping-Me`",
	guildconfig_setbot_prefix_prefix_specify_prefix:
		"يجب عليك تحديد رمز مميز للبوت.",
	guildconfig_setbot_prefix_prefix_too_long:
		"رمز التميز للبوت طويل جدًا، سيكون من الصعب استخدامه.",
	guildconfig_setbot_prefix_prefix_is_good:
		"تم تغيير رمز التميز بنجاح، الآن يمكن استخدام الأوامر الرسائل بـ: `${formatedPrefix}`",

	// /guildconfig config save
	guildconfig_config_save_check_dm:
		"يرجى التحقق من الرسائل المباشرة الخاصة بك. إذا لم تستلم الرسالة، حاول التحقق مما إذا كنت تقبل الرسائل المباشرة.",
	guildconfig_config_save_user_msg:
		"هذه نسخة احتياطية من إعدادات `${guildName}`!",
	guildconfig_config_save_user_msg_2:
		"إليك الرابط لتنزيل نسخة احتياطية من الخادم!\n",

	// /guildconfig config restore
	guildconfig_config_restore_err_msg: "حدث خطأ أثناء تنزيل الملف.",
	guildconfig_config_restore_msg: "تم تعيين البيانات في قاعدة بياناتي.",
	guildconfig_config_restore_wrong_guild:
		"هذه النسخة الاحتياطية لا تخص هذا الخادم أو غير صالحة، لذلك لم تتم استعادتها.",

	// /perm add
	perm_add_args_error:
		"لم تحدد الأوامر التي تريد تغييرها أو الأذونات التي تريد تعيينها.",

	// /perm list
	perm_list_embed_title: "أذونات جميع المستخدمين:",
	perm_list_unknown_user: "مستخدم غير معروف (ID: ${userId})",
	perm_list_no_user: "لم يتم العثور على المستخدم",
	var_command: "أمر",
	var_subcommand: "أمر فرعي",
	var_subcommand_group: "مجموعة الأوامر الفرعية",
	var_unreachable_command: "الأمر غير موجود",
	perm_list_no_command_set:
		"لا توجد أوامر تم تعيين أذونات لها في هذه الخادم!",

	// /perm set
	perm_set_deleted: "${user} تم **حذف** أذنه!",
	perm_set_ok: "${user} تم تغيير أذنه إلى **`${perm}`**",
	perm_set_warn_message: "${author}، لا يمكنك منح إذن أعلى أو مساوٍ لك!",
	perm_set_chng_perm_lvl: "تم تغيير مستوى الصلاحية",
	perm_set_add_role: "تم إضافة دور",
	perm_set_add_usr: "تم إضافة مستخدم",
	perm_rmv_role: "تم إزالة الدور",
	perm_rmv_usr: "تم إزالة المستخدم",
	perm_set_command_reset: "تم إعادة تعيين هذا الأمر",
	perm_set_no_modified: "لم يتم تعديل أي صلاحية",
	perm_command_delete_dont_exist: "الأمر المحدد ليس له أي صلاحيات مضبوطة.",
	perm_command_delete_command_deleted: "تم حذف صلاحيات الأمر: `${commands}`",
	perm_command_delete_specify_command: "تحتاج إلى تحديد أمر لحذف صلاحياته.",
	perm_command_delete_all_one: "تحتاج إلى تحديد خيار واحد لحذف صلاحية.",
	perm_command_delete_all_one_option:
		"يمكنك تحديد خيار واحد فقط لحذف صلاحية.",
	perm_command_delete_all_zero_change:
		"نوع الصلاحية الذي حددته لم يتم استخدامه في أي أمر.",
	perm_command_delete_all_command_ok:
		"\nتم حذف **${changeCount}** صلاحية متداخلة من نوع `${type}` (${value}) من قاعدة البيانات بنجاح.",
	commandlimit_current_value: "${count} use(s) per ${time}",
	commandlimit_invalid_value: "القيم المقدمة لحد استخدام الأمر غير صالحة.",
	commandlimit_missing_command: "يجب تحديد أمر.",
	commandlimit_set_success:
		"تم تعيين حد استخدام `${command}` إلى `${limit}`.",
	commandlimit_reset_success: "تم إعادة تعيين حد استخدام `${command}`.",
	commandlimit_reset_missing: "لا يوجد حد استخدام معد للأمر `${command}`.",
	commandlimit_list_title: "حدود استخدام الأوامر المعدة",
	commandlimit_list_item: "- `${command}`: ${limit}",
	commandlimit_list_empty: "لا يوجد أي حد لاستخدام الأوامر في هذا الخادم.",
	commandlimit_rate_limited:
		"لقد وصلت إلى الحد الأقصى لهذا الأمر. حاول مرة أخرى بعد ${time}.",

	// /perm roles
	perm_roles_created_role: "الأدوار اللي اتعملت: ${roles}",
	perm_roles_already_upate: "كل الأدوار موجودة وحديثة.",
	perm_roles_error: "حصل خطأ أثناء إنشاء أو تحديث الأدوار.",
	perm_roles_not_owner: "مالك الخادم فقط يمكنه إضافة أدوار مستوى الإذن.",

	// /perm edit-roles
	perm_edit_roles_command_ok: "تم تعديل دور الإذن ${permName} إلى ${strRole}",

	// /toggle-react
	toggle_react_command_work:
		"<@${authorId}>, الآن عندما يرسل أحد الأعضاء رسالة ترحيب، البوت **{activeMsg}**",
	toggle_react_doesnt_react: "لن يتفاعل بعد الآن",
	toggle_react_react: "سيتفاعل",

	// /remove-react
	remove_react_command_work:
		"<@${authorId}>, الآن عندما يرسل أحد الأعضاء `${message}`، البوت **لن يتفاعل**.",

	// /add-react
	add_react_command_err_emojis: "الرمز التعبيري `{emoji}` للتفاعل غير صحيح!",
	add_react_command_err_message:
		"يجب عليك تحديد الرسالة التي ستؤدي إلى التفاعل!",
	add_react_command_bad_word:
		"لا يمكن استخدام هذه الكلمة كتفاعل تلقائي: يجب ألا تحتوي على نقطة.",
	add_react_command_work:
		"<@${authorId}>, الآن عندما يرسل أحد الأعضاء `${message}`، البوت **سيتفاعل** بـ {emoji}",

	// /list-react
	list_react_nothing_found:
		"لم يتم العثور على أي بيانات، يرجى إضافة بعض منها أولاً.",
	list_react_embed_msg:
		"عندما يرسل أحد الأشخاص **`${key}`**، سأ**تفاعل** بـ ${value}\n",

	// /autoreact
	autoreact_embed_title: "تكوين التفاعل التلقائي",
	autoreact_embed_desc:
		"عندما يتم إرسال رسالة جديدة في القناة المحددة، سيقوم البوت بالتفاعل مع الرموز التعبيرية المحددة.",
	autoreact_embed_autofields_value: "التفاعل: ${reaction}",
	autoreact_embed_autofields_none_value:
		"لم يتم إعداد أي تكوين للتفاعل التلقائي.",
	autoreact_embed_footer:
		"الصفحة ${currentPage} من ${totalPage} • إجمالي التفاعلات: ${totalReact}",
	autoreact_btn_add_name: "إضافة قناة",
	autoreact_btn_remove_name: "إزالة قناة",
	autoreact_max_25: "يمكن إعداد حد أقصى يبلغ 25 تكوينًا للتفاعل التلقائي.",
	autoreact_menu_add_place: "اختر قناة لإضافتها",
	autoreact_awaiting1_msg:
		"يرجى اختيار قناة لإضافتها إلى وحدة التفاعل التلقائي.",
	autoreact_modal_title: "تكوين التفاعل التلقائي",
	autoreact_modal_fields1_label: "التفاعل (الإيموجي)",
	autoreact_invalid_emoji: "رمز تعبيري غير صالح. يرجى إدخال رمز تعبيري صالح.",
	autoreact_add_command_ok: "تم تعيين تكوين التفاعل التلقائي.",
	autoreact_remove_not_found: "لم يتم إعداد أي تكوين للتفاعل التلقائي.",
	autoreact_menu_remove_place: "اختر قناة للإزالة",
	autoreact_awaiting_remove_msg:
		"يرجى اختيار قناة لإزالتها من وحدة التفاعل التلقائي.",
	autoreact_remove_command_ok:
		"تمت إزالة تكوين التفاعل التلقائي لهذه القناة.",

	// Member Count commands
	// /setmembercount

	// /setmembercount
	setmembercount_not_admin:
		":x: | يجب أن تكون مسؤولًا عن الخادم لتطلب هذا الأمر!",
	setmembercount_helpembed_title: "مساعدة Set MemberCount!",
	setmembercount_helpembed_description:
		"/membercount <تفعيل / إيقاف> <اسم القناة>",
	setmembercount_helpembed_fields_name: "كيف تستخدمه؟",
	setmembercount_helpembed_fields_value:
		"{MemberCount} = عدد الأعضاء في السيرفر\n{RolesCount} = عدد الرتب\n{BotCount} = عدد البوتات في السيرفر\n{ChannelCount} = عدد القنوات في السيرفر\n{BoostCount} = عدد التعزيزات في السيرفر\n{VoiceCount} = إجمالي عدد الأعضاء في القنوات الصوتية في السيرفر\n{OnlineCount} = إجمالي الأعضاء المتصلين في السيرفر",
	setmembercount_logs_embed_title_on_enable: "سجلات Set MemberCount",
	setmembercount_logs_embed_description_on_enable:
		"<@${authorId}> قام بتعيين MemberCount في <#${channelId}> إلى `${messagei}`!",
	setmembercount_command_work_on_enable:
		"${emoji_Yes} | تم تعيين MemberCount بنجاح.",
	setmembercount_command_work_on_disable:
		"${emoji_Yes} | تم إزالة MemberCount بنجاح.",
	setmembercount_logs_embed_title_on_disable: "سجلات Set MemberCount",
	setmembercount_logs_embed_description_on_disable:
		"<@${authorId}> قام بإزالة MemberCount من هذا الخادم!",

	// Music commands
	// /p, /loop, /nowplaying, /pause, /resume, /skip, /stop, /queue, /shuffle

	music_cannot:
		"${emoji_No} يجب أن تكون في نفس القناة الصوتية معي لاستخدام هذا الأمر!",

	// /p
	p_not_in_voice_channel:
		"يجب أن تكون متصلاً بقناة صوتية لاستخدام هذا الأمر!",
	p_embed_title: "لا توجد نتائج",
	p_not_allowed:
		"الرابط الذي أرسلته غير مدعوم من قبل هذا البوت. يرجى استخدام خدمات بث الموسيقى المعتمدة مثل Deezer و Spotify و Soundcloud، إلخ.",
	p_attachment_too_large:
		"${emoji_No} الملف المرفق يتجاوز الحد الأقصى البالغ 10 ميجابايت ولا يمكن قراءته.",

	// /loop
	loop_no_queue: "لا توجد قائمة تشغيل!",
	loop_command_work: "{mode} | تم تحديث وضع التكرار",

	// /nowplaying
	nowplaying_no_queue: "لا يوجد شيء يتم تشغيله حاليًا",
	nowplaying_message_embed_title: "الآن يتم التشغيل",
	nowplaying_resume_button: "${author} **استأنف** الموسيقى!",
	nowplaying_pause_button: "${author} **أوقف** الموسيقى!",
	nowplaying_lyrics_button: "لم يتم العثور على كلمات هذه الأغنية",
	nowplaying_stop_buttom: "${author} **أوقف** الموسيقى!",
	nowplaying_header: "يتم التشغيل الآن في ${channel}",
	nowplaying_requested_by: "بطلب من ${user}",
	nowplaying_paused: "متوقف مؤقتًا",
	nowplaying_live: "بث مباشر",
	nowplaying_volume: "مستوى الصوت ${volume}%",
	nowplaying_loop_off: "التكرار متوقف",
	nowplaying_loop_track: "تكرار المقطع",
	nowplaying_loop_queue: "تكرار القائمة",
	nowplaying_queue_count: "${count} في القائمة",
	nowplaying_up_next: "التالي: ${track}",
	nowplaying_queue_end: "آخر مقطع في القائمة",
	nowplaying_ended: "لم يعد هذا المقطع قيد التشغيل.",
	nowplaying_button_pause: "إيقاف مؤقت",
	nowplaying_button_resume: "استئناف",
	nowplaying_button_skip: "تخطي",
	nowplaying_button_stop: "إيقاف",
	nowplaying_button_lyrics: "الكلمات",
	nowplaying_button_open: "فتح",
	nowplaying_skip_button: "${author} **تخطى** المقطع!",
	nowplaying_loop_button: "${author} غيّر وضع التكرار: **${mode}**",

	// /pause
	pause_no_queue: "${emoji_Warning_Icon} - أنت لست في قناة صوتية!",
	pause_nothing_playing: "لا يوجد شيء يتم تشغيله",
	pause_var_paused: "موقوف",
	pause_var_err: "حدث خطأ ما",

	// /resume
	resume_nothing_playing: "لا يوجد شيء يتم تشغيله",
	resume_command_work: "تم الاستئناف بنجاح",

	// /skip
	skip_not_in_voice_channel: "${emoji_Warning_Icon} - أنت لست في قناة صوتية!",
	skip_nothing_playing: "لا يوجد شيء يتم تشغيله",
	skip_command_work: "تم تخطي {queue}",

	// /stop
	stop_nothing_playing: "لا يوجد شيء يتم تشغيله",
	stop_command_work: "تم إيقاف قائمة التشغيل",

	// /queue
	queue_iam_not_voicec: "أنا لست في قناة صوتية",
	queue_no_queue: "لا توجد قائمة تشغيل",
	queue_title: "قائمة التشغيل",
	queue_time_left: "متبقي ${duration}",
	queue_now_playing: "قيد التشغيل",
	queue_up_next: "التالي",
	queue_page: "الصفحة ${page}/${pages}",
	queue_button_shuffle: "خلط",
	queue_button_refresh: "تحديث",
	queue_jump_placeholder: "الانتقال إلى مقطع…",
	queue_shuffled: "قام ${author} **بخلط** قائمة التشغيل!",
	queue_jumped: "انتقل ${author} إلى ${track}!",

	// /shuffle
	shuffle_no_queue: "أنا لست في قناة صوتية",
	shuffle_no_enought: "لا توجد **مسارات كافية** في القائمة لتشغيل وضع الخلط",
	shuffle_command_work: "قمت بـ **خلط** قائمة التشغيل",

	// /music history
	history_no_entries: "لا توجد إدخالات في هذه المسابقة.",
	history_title: "ما تم تشغيله مؤخرًا على ${guild}",
	history_summary: "${count} مقطع، ${duration} من الموسيقى خلال آخر 30 يومًا",
	history_top_artist: "الفنان الأكثر تشغيلًا: **${artist}** (${count})",
	history_top_listener: "أكثر الطلبات: ${user} (${count})",
	history_legacy_note: "سُجّل قبل حفظ تفاصيل المقاطع:",
	history_page: "الصفحة ${page} من ${pages}",
	history_kept: "يُحفظ لمدة 30 يومًا",
	history_button_previous: "السابق",
	history_button_next: "التالي",
	history_button_export: "تصدير",
	history_button_clear: "مسح",
	history_clear_confirm:
		"${emoji} مسح سجل الموسيقى بالكامل لهذا السيرفر؟ لا يمكن التراجع.",
	history_button_confirm_clear: "مسح السجل",
	history_button_cancel: "إلغاء",
	history_cleared: "${emoji} تم مسح سجل الموسيقى لهذا السيرفر.",
	history_clear_forbidden: "${emoji} تحتاج صلاحية إدارة السيرفر لمسح السجل.",
	history_not_yours:
		"${emoji} هذه الأزرار لمن فتح هذا السجل. استخدم /music history لفتح سجلك.",
	history_export_ready: "${emoji} السجل الكامل، الأحدث أولًا:",

	// /music lyrics
	lyrics_embed_title_unknown: "العنوان غير معروف",
	lyrics_embed_author_name_unknown: "الكاتب غير معروف",
	lyrics_not_found: "لم يتم العثور على كلمات",

	// /music clear-queue
	clear_queue_command_ok:
		"${emoji_Security} | تم مسح قائمة انتظار الموسيقى في خادم Discord هذا.",

	// /music trackinfo
	music_lyrics: "كلمات",

	music_volume_command_ok:
		"${emoji_Yes} **تم ضبط مستوى الصوت إلى** `${query}`%",

	// /music apo
	music_apo_download_failed:
		"${emoji_No} | تعذّر تنزيل الملف، حاول مرة أخرى.",
	music_apo_no_node: "${emoji_No} | لا توجد عقدة صوت متصلة حاليًا.",
	music_apo_unsupported:
		"${emoji_No} | عقدة الصوت هذه لا تدعم فلاتر APO (تحتاج Wavyzon مع إضافة `apo`).",
	music_apo_invalid:
		"${emoji_No} | رفضت عقدة الصوت هذه الإعدادات: `${error}`",
	music_apo_warnings: "الأسطر المتجاهلة (${count}):",

	// Giveaway commands
	// /end, /start, /reroll

	// /end
	end_not_admin: "يجب أن تكون لديك أذونات إدارة الرسائل لإنهاء هذه المسابقة.",
	end_not_find_giveaway: "لم يتم العثور على مسابقة لـ `${gw}`.",
	end_confirmation_message: "ستنتهي المسابقة خلال (${timeEstimate}) ثوانٍ...",
	end_logs_embed_title: "سجلات المسابقات",
	end_logs_embed_description:
		"<@${authorId}> أنهى المسابقات بهذا المعرف: ${messageId}",
	end_command_error: "هذه المسابقة انتهت بالفعل!",

	// /start
	start_not_perm: "يجب أن تكون لديك أذونات إدارة الرسائل لبدء المسابقات.",
	start_is_not_valid: "يجب عليك تحديد عدد الفائزين الصحيح!",
	start_confirmation_command: "تم بدء المسابقة في ${giveawayChannel}!",
	start_logs_embed_title: "سجلات المسابقات",
	start_logs_embed_description:
		"<@${authorId}> بدأ مسابقة في: ${giveawayChannel}",
	start_time_not_valid:
		"${author}, مدة المسابقة التي حددتها غير صحيحة، يرجى المحاولة مرة أخرى!",
	start_invalid_invites_req_value:
		"${emoji_No} | القيمة لـ 'دعوات' غير صالحة! يجب أن يكون عدد الدعوات للانضمام إلى الهدية!",
	start_invalid_messages_req_value:
		"${emoji_No} | القيمة لـ 'رسائل' غير صالحة! يجب أن يكون عدد الرسائل للانضمام إلى الهدية!",
	start_invalid_roles_req_value:
		"${emoji_No} | الدور لقيمة 'الأدوار' غير موجود! يجب إدخال معرف الدور للانضمام إلى الهدية!",

	// /reroll
	reroll_not_perm:
		"يجب أن تكون لديك أذونات إدارة الرسائل لإنهاء هذه المسابقة.",
	reroll_dont_find_giveaway: "لم يتم العثور على مسابقة لـ `{args}`.",
	reroll_command_work: "تم إعادة تشغيل المسابقة!",
	reroll_logs_embed_title: "سجلات المسابقات",
	reroll_logs_embed_description:
		"<@${authorId}> أعاد تشغيل المسابقة بهذا المعرف: ${messageId}",
	reroll_command_error: "حدث خطأ!",
	reroll_giveaway_not_over: "لم تنتهِ هذه المسابقة بعد!",

	// /get-all
	gw_getall_embed_title: "قائمة المسابقات لـ ${guildName}",
	gw_getall_embed_fields:
		"${Channel} [شاهد هنا](${MessageURL}) \n**تنتهي في** ${ExpireIn}",

	// /get-data
	gw_getdata_embed_title: "معلومات المسابقة!",
	gw_getdata_embed_fields_channel: "القناة",
	gw_getdata_embed_fields_amountWinner: "عدد الفائزين",
	gw_getdata_embed_fields_value_amountWinner: "`${winnerCount}` فائز/ة",
	gw_getdata_embed_fields_prize: "الجائزة",
	gw_getdata_embed_fields_value_prize: "`${prize}`",
	gw_getdata_embed_fields_hostedBy: "مستضيف",
	gw_getdata_embed_fields_isEnded: "هل انتهت؟",
	gw_getdata_embed_fields_isValid: "هل هي صالحة؟",
	gw_getdata_embed_fields_time: "تنتهي في",
	gw_getdata_embed_fields_entriesAmount: "عدد المشاركين",
	gw_getdata_embed_fields_winners: "الفائزون",
	gw_getdata_embed_fields_value_entriesAmount:
		"**${entries}** (استخدم `/gw list-entries giveaway-id:${giveawayId}` لمزيد من المعلومات)",
	gw_getdata_yes: "`نعم`",
	gw_getdata_no: "`لا`",
	gw_doesnt_exit: "المسابقة غير قابلة للوصول، أو لا توجد.",

	// /go
	gw_go_panel_title: "لوحة الجوائز",
	gw_go_panel_desc:
		"جهّز الجائزة أدناه ثم أطلقها. استخدم القوائم لتعديل كل إعداد.",
	gw_go_select_placeholder: "تعديل إعداد",
	gw_go_opt_prize: "الجائزة",
	gw_go_opt_duration: "المدة",
	gw_go_opt_winners: "الفائزون",
	gw_go_opt_requirement: "شرط المشاركة",
	gw_go_opt_image: "صورة المعاينة",
	gw_go_channel_placeholder: "قناة الجائزة",
	gw_go_launch_buttontitle: "إطلاق",
	gw_go_cancel_buttontitle: "إلغاء",
	gw_go_req_none: "بدون",
	gw_go_req_invites: "الدعوات",
	gw_go_req_messages: "الرسائل",
	gw_go_req_roles: "الرتب",
	gw_go_req_value_dsc: "القيمة المطلوبة: **${value}**",
	gw_go_started: "تم إطلاق الجوائز في ${channel}!",
	gw_go_cancelled: "تم إغلاق اللوحة، لم يتم إطلاق شيء.",
	gw_go_expired: "انتهت صلاحية اللوحة قبل إطلاق الجوائز.",
	gw_go_need_prize: "${emoji_No} | يجب تحديد جائزة قبل إطلاق الجوائز!",
	gw_go_need_duration: "${emoji_No} | يجب تحديد مدة صحيحة قبل إطلاق الجوائز!",
	gw_go_need_winners:
		"${emoji_No} | يجب تحديد عدد فائزين صحيح قبل إطلاق الجوائز!",
	gw_go_channel_error:
		"${emoji_No} | القناة المحددة لا يمكنها استقبال الرسائل!",
	gw_go_invalid_image: "${emoji_No} | رابط الصورة غير صالح!",
	gw_go_modal_prize: "تحديد الجائزة",
	gw_go_modal_prize_label: "الجائزة",
	gw_go_modal_duration: "تحديد المدة",
	gw_go_modal_duration_label: "المدة (مثال: 2d أو 12h30)",
	gw_go_modal_winners: "تحديد عدد الفائزين",
	gw_go_modal_winners_label: "عدد الفائزين",
	gw_go_modal_req_title: "شرط المشاركة",
	gw_go_modal_req_type_label: "نوع الشرط",
	gw_go_modal_req_value_label: "قيمة الشرط (معرف الرتبة أو رقم)",
	gw_go_modal_image: "تحديد صورة المعاينة",
	gw_go_modal_image_label: "رابط الصورة",

	// Moderation commands
	// /ban, /kick, /clear, /lock, /unlock, /avatar, /lockall,
	// /unban, /tempmute, /unmute
	// /avatar

	// /ban
	ban_not_permission: "${emoji_No} | ليس لديك إذن لحظر الأعضاء.",
	ban_dont_found_member: "🔍 | لا يمكن العثور على هذا العضو",
	ban_dont_have_perm_myself: "${emoji_No} | ليس لدي إذن لحظر الأعضاء!",
	ban_try_to_ban_yourself: "${emoji_No} | لا يمكنك حظر نفسك!",
	ban_attempt_ban_higter_member:
		"${emoji_Stop} لا يمكنك حظر عضو لديه دور أعلى منك...",
	ban_cant_ban_member: "${emoji_No} | لا أستطيع حظر هذا العضو",
	ban_message_to_the_banned_member:
		"لقد تم حظرك من هذا الخادم: `${guildName}` للسبب: **`${reason}`**",
	ban_command_work: "<@${memberId}> تم حظره بواسطة <@${authorId}>",
	ban_logs_embed_title: "سجلات الحظر",
	ban_logs_embed_description: "<@${memberId}> تم حظره بواسطة <@${authorId}>",

	// /kick
	kick_not_permission: "${emoji_No} | ليس لديك إذن لطرد الأعضاء.",
	kick_dont_have_permission: "${emoji_No} | ليس لدي إذن لطرد الأعضاء!",
	kick_attempt_kick_your_self: "${emoji_No} | لا يمكنك طرد نفسك!",
	kick_attempt_kick_higter_member:
		"${emoji_Stop} لا يمكنك طرد عضو لديه دور أعلى منك...",
	kick_message_to_the_banned_member:
		"لقد تم طردك من هذا الخادم: **${guildName}** بواسطة `${authorUsername}`",
	kick_command_work: "${member} تم طرده بواسطة ${author}",
	kick_logs_embed_title: "سجلات الطرد",
	kick_logs_embed_description: "${member} طرد بواسطة <@${authorId}>",

	// /clear
	clear_dont_have_permission: "${emoji_No} | ليس لديك إذن `إدارة الرسائل`.",
	clear_max_message_limit:
		"${emoji_No} | لا أستطيع حذف أكثر من 99 رسالة في مرة واحدة!",
	clear_channel_message_deleted: "${messageCount} رسالة تم حذفها!",
	clear_confirmation_message: "${messageCount} رسالة تم حذفها!",
	clear_logs_embed_title: "سجلات حذف الرسائل",
	clear_logs_embed_description:
		"<@${authorId}> حذف ${messageCount} رسالة في <#${channelId}>",
	clear_command_no_message: "لا توجد رسائل لحذفها في هذه القناة",

	// /lock
	lock_embed_message_description: "تم قفل القناة بواسطة <@${authorId}>.",
	lock_dont_have_permission: "${emoji_No} | ليس لديك إذن لقفل القنوات.",
	lock_logs_embed_title: "سجلات قفل القنوات",
	lock_logs_embed_description: "<@${authorId}> قفل <#${channelId}>",

	// /unlock
	unlock_embed_message_description: "تم فتح القناة بنجاح!",
	unlock_dont_have_permission: "${emoji_No} | ليس لديك إذن لفتح القناة.",
	unlock_logs_embed_title: "سجلات فتح القنوات",
	unlock_logs_embed_description: "<@${authorId}> فتح <#${channelId}>",

	// /lockall
	lockall_dont_have_permission:
		"${emoji_No} | ليس لديك إذن لقفل جميع القنوات.",
	lockall_embed_message_description:
		"تم قفل جميع القنوات بواسطة <@${authorId}>.",
	lockall_logs_embed_title: "سجلات قفل جميع القنوات",
	lockall_logs_embed_description: "<@${authorId}> قفل جميع القنوات!",

	// /unlockall
	unlockall_embed_message_description:
		"تم فك قفل جميع القنوات بواسطة <@${authorId}>.",
	unlockall_logs_embed_title: "سجلات فك قفل جميع القنوات",
	unlockall_logs_embed_description: "<@${authorId}> فكّ قفل جميع القنوات!",

	// /unban
	unban_dont_have_permission: "${emoji_No} | ليس لديك إذن لفك حظر الأعضاء.",
	unban_bot_dont_have_permission: "${emoji_No} | ليس لدي إذن.",
	unban_there_is_nobody_banned:
		"${emoji_No} | **لا يوجد أي عضو محظور في هذا الخادم!**",
	unban_the_member_is_not_banned:
		"${emoji_No} | **الرقم المحدد ليس محظورًا من هذا الخادم**!",
	unban_is_now_unbanned: "<@${userID}> تم رفع حظره من هذا الخادم الآن!",
	unban_logs_embed_title: "سجلات فك الحظر",
	unban_logs_embed_description:
		"<@${userID}> تم رفع حظره من الخادم بواسطة <@${authorId}>!",
	unban_reason: "لم يتم تقديم سبب.",

	// /tempmute
	tempmute_dont_have_permission:
		"${emoji_No} | ليس لديك إذن لتحديد مدة الميوت.",
	tempmute_i_dont_have_permission: "${emoji_No} | ليس لدي إذن.",
	tempmute_cannot_mute_yourself: "${emoji_No} | لا يمكنك إسكات نفسك!",
	tempmute_already_muted: "هذا العضو مُسكَت بالفعل!",
	tempmute_command_work:
		"<@${tomuteId}> تم كتمه لمدة ${duration}\n**السبب**: `${reason}`",
	tempmute_unmuted_by_time: "<@${tomuteId}> تم رفع الميوت!",
	tempmute_logs_embed_title: "سجلات الميوت المؤقت",
	tempmute_logs_embed_description:
		"<@${authorId}> قام بكتم <@${tomuteId}> لمدة ${duration}\n**السبب**: `${reason}`",
	tempmute_reason_create_roles: "إنشاء دور مؤقت للميوت!",
	tempmute_tomute_is_admin:
		"${emoji_No} | المستخدم لديه صلاحيات المسؤول، لا أستطيع كتمه.",
	tempmute_tomute_highest_role_or_same:
		"${emoji_No} | **دوري في هذا الخادم أقل أو مساوٍ لـ ${tomute}. لا أستطيع معاقبة هذا العضو.**",
	tempmute_cannot_mute_higher_role:
		"${emoji_No} | **${tomute}'s role is higher than or equal to yours. You cannot timeout this member.**",
	tempmute_tomute_max_time_passed:
		"\n-# ${emoji_VC_OpenChat} لدى ديسكورد حد أقصى قدره 28 يومًا للكتم. لقد قمت بتطبيق 28 يومًا.",

	// /temprole
	temprole_dont_have_permission:
		"${emoji_No} | ليس لديك الإذن لإضافة أدوار مؤقتة للأعضاء.",
	temprole_i_dont_have_permission: "${emoji_No} | ليس لدي الإذن.",
	temprole_cannot_add_yourself:
		"${emoji_No} | لا يمكنك إضافة دور مؤقت لنفسك!",
	temprole_already_has_role: "هذا المستخدم لديه هذا الدور المؤقت بالفعل!",
	temprole_command_work:
		"<@${tomuteId}> تم منحه الدور لمدة ${duration}\n**السبب**: `${reason}`",
	temprole_removed_by_time: "تمت إزالة الدور المؤقت من <@${tomuteId}>!",
	temprole_logs_embed_title: "سجل الأدوار المؤقتة",
	temprole_logs_embed_description:
		"<@${authorId}> أضاف دوراً مؤقتاً لـ <@${tomuteId}> لمدة ${duration}\n**السبب**: `${reason}`",
	temprole_tomute_is_admin:
		"${emoji_No} | هذا المستخدم لديه صلاحيات المدير، لا يمكنني إضافة دور مؤقت له.",
	temprole_tomute_highest_role_or_same:
		"${emoji_No} | **دوري في هذا الخادم أقل أو مساوٍ لـ ${tomute}. لا يمكنني إدارة هذا العضو.**",
	temprole_tomute_max_time_passed:
		"\n-# ${emoji_VC_OpenChat} الحد الأقصى لمدة الدور المؤقت هو سنة واحدة. لقد طبقت سنة كاملة.",

	// /unmute
	unmute_dont_have_permission: "${emoji_No} | ليس لديك إذن لرفع الميوت.",
	unmute_attempt_mute_your_self: "${emoji_No} | لا يمكنك رفع ميوت نفسك!",
	unmute_i_dont_have_permission: "${emoji_No} | ليس لدي إذن.",
	unmute_not_muted: "هذا العضو ليس مُسكَت!",
	unmute_muted_role_doesnt_exist:
		"دور `المسكت` غير موجود. يرجى إسكات العضو **قبل** إنشاء أدوار الميوت...",
	unmute_command_work: "<@${tomuteId}> تم رفع ميوته!",
	unmute_logs_embed_title: "سجلات رفع الميوت",
	unmute_logs_embed_description: "<@${authorId}> رفع ميوت <@${tomuteId}>",
	unmuteall_no_muted_members: "لم يتم العثور على أعضاء مكتومين.",
	unmuteall_audit_reason: "رفع الميوت عن الجميع",
	unmuteall_command_work: "تم رفع الميوت عن ${unmuted}/${total} عضو.",
	unmuteall_logs_embed_title: "سجلات رفع الميوت عن الجميع",
	unmuteall_logs_embed_description:
		"<@${authorId}> رفع الميوت عن ${unmuted}/${total} عضو.",

	// /warn
	warn_command_work:
		"${emoji_Yes} ${member} اتحذر! **السبب**: `${reason}`\n__رقم التحذير__: `${warnId}`",
	warn_logEmbed_title: "سجلات التحذير",
	warn_logEmbed_desc: "${author} حذر ${member} بسبب `${reason}`",
	warn_dont_have_permission:
		"${emoji_No} | ليس لديك إذن لتحذير عضو في هذا السيرفر.",

	// /unwarn
	unwarn_cannot_found:
		"${emoji_No} ${member} شكله مفيش تحذيرات ليه في قاعدة البيانات بتاعتي!",
	unwarn_cannot_found_id:
		"${emoji_No} ${member} رقم التحذير اللي إديته مش موجود في قاعدة البيانات بتاعتي",
	unwarn_logEmbed_title: "سجلات إلغاء التحذير",
	unwarn_logEmbed_desc: "${author} ألغى تحذير ${member}",
	unwarn_dont_have_permission:
		"${emoji_No} | ليس لديك إذن لإزالة تحذير من عضو في هذا السيرفر.",

	// /clear-allwarns
	clear_allwarns_confirmation_message:
		"**هل أنت متأكد حقاً من رغبتك في حذف جميع بيانات التحذيرات؟ هذا الإجراء دائم ولا يمكن التراجع عنه.** **هذا الإجراء مدمر!!**",
	clear_allwarns_command_ok: "تم حذف جميع التحذيرات في هذا السيرفر.",

	// /warnlist
	warnlist_no_data:
		"${emoji_No} ${member} شكله مفيش تحذيرات ليه في قاعدة البيانات بتاعتي!",
	warnlist_dont_have_permission:
		"${emoji_No} | ليس لديك إذن لإدارة تحذيرات الأعضاء في هذا السيرفر.",

	// /baninfo
	baninfo_not_banned: "المستخدم غير محظور",
	baninfo_user_not_found: "المستخدم غير موجود",
	var_banned_by: "محظور من قبل",
	var_ban_date: "تاريخ الحظر",

	// /مسح_التحذيرات
	clearwarn_command_ok:
		"${emoji_Yes} ${author}, تم مسح **`${allWarnCount}`** تحذير(ات) من ${member}",

	// /tempban
	tempban_dont_have_permission: "ليس لديك صلاحية لحظر الأعضاء مؤقتًا.",
	tempban_i_dont_have_permission: "ليس لدي صلاحية لحظر الأعضاء.",
	tempban_cannot_ban_yourself: "لا يمكنك حظر نفسك!",
	tempban_already_banned: "هذا المستخدم محظور مؤقتًا بالفعل!",
	tempban_command_work:
		"**<@${userId}>** تم حظره مؤقتًا لمدة **${duration}**\n**السبب**: `${reason}`",
	tempban_unbanned_by_time: "**<@${userId}>** تم رفع الحظر عنه!",
	tempban_logs_embed_title: "سجلات الحظر المؤقت",
	tempban_logs_embed_description:
		"**<@${executorId}>** قام بحظر **<@${userId}>** مؤقتًا لمدة **${duration}**\n**السبب**: `${reason}`",
	tempban_user_is_admin: "هذا المستخدم لديه صلاحيات المدير، لا يمكنني حظره.",
	tempban_user_highest_role_or_same:
		"رتبتي في الخادم أقل أو مساوية لـ **user_mention**. لا يمكنني تنفيذ إجراء على هذا العضو.",
	tempban_max_time_passed:
		"\n*الحد الأقصى للحظر المؤقت هو سنة واحدة. تم تطبيق سنة واحدة.*",
	tempban_user_not_in_guild:
		"هذا المستخدم ليس في الخادم لكنه ما زال قابلًا للحظر.",

	// Backup commands
	// /backup

	// /backup
	backup_wait_please: "⏲ يرجى الانتظار...",
	backup_not_admin:
		":x: | يجب أن تكون مشرفاً في هذا الخادم لطلب نسخة احتياطية!",
	backup_i_dont_have_permission: "ليس لدي إذن `ADMINISTRATOR`",
	backup_command_work_on_creation:
		":white_check_mark: تم إنشاء النسخة الاحتياطية بنجاح.",
	backup_command_work_info_on_creation:
		"تم إنشاء النسخة الاحتياطية! ID: `${id}`!",
	backup_logs_embed_title_on_creation: "سجلات النسخ الاحتياطي",
	backup_logs_embed_description_on_creation:
		"<@${authorId}> أنشأ نسخة احتياطية!",
	backup_dont_have_perm_on_load:
		":x: | يجب أن تكون مشرفاً في هذا الخادم لتحميل نسخة احتياطية!",
	backup_i_dont_have_perm_on_load: "ليس لدي إذن `ADMINISTRATOR`",
	backup_unvalid_id_on_load: ":x: | يجب تحديد ID صحيح للنسخة الاحتياطية!",
	backup_waiting_on_load: "${emoji_Yes} - جاري التحميل...",
	backup_error_on_load:
		":x: | عذراً، حدث خطأ... يرجى التحقق من أن لدي إذن المشرف!",
	backup_error_when_fetch_backup_on_load:
		":x: | لم يتم العثور على نسخة احتياطية لـ ${backupID}!",
	backup_this_is_not_your_backup: "${emoji_No} | هذه ليست نسختك الاحتياطية!",
	backup_backup_doesnt_exist: "خطأ؟ النسخة الاحتياطية غير موجودة.",
	backup_string_see_v:
		":placard:・عدد الفئات: `${categoryCount}`\n:hash:・عدد القنوات: `${channelCount}`",
	backup_all_of_your_backup: "**كل نسخك الاحتياطية:**",
	backup_string_see_another_v:
		":placard:・عدد الفئات: `${categoryCount}`\n:hash:・عدد القنوات: `${channelCount}`",
	backup_load_confirm:
		"${author},\n# إجراء خطير للغاية\n# هل أنت متأكد أنك تريد تحميل هذه النسخة الاحتياطية؟\nسيتم استبدال جميع القنوات، الأدوار، الرموز التعبيرية، الحظر، الإعدادات... الحالية في الخادم.\nهَذَا الإِجْرَاء غَيْر قَابِل للإِرْجَاع!",
	backup_not_load:
		"لم يتم تحميل النسخة الاحتياطية، تم إلغاء الإجراء بناءً على طلبك.",

	// /backup delete
	backup_really_want:
		"${emoji_Warning_Icon} هل تريد حقاً حذف هذه النسخة الاحتياطية؟",
	backup_confirm_button: "نعم، احذف هذه النسخة الاحتياطية",
	backup_cancel_button: "إلغاء العملية",
	backup_embed_title_succefully_deleted:
		"${emoji_Yes} تم حذف النسخة الاحتياطية بنجاح!",
	backup_embed_title_cancel_deletion:
		"${emoji_Yes} تم الحفاظ على النسخة الاحتياطية!",
	backup_embed_title_timesup_deletion:
		"${emoji_No} انتهى الوقت. تم الحفاظ على النسخة الاحتياطية!",

	// /backup manage
	backup_manage_nique_tes_mort:
		"تم رفض الوصول. هذا الأمر مخصص لصاحب الخادم فقط.\n# لا يمكنك تعطيل حماية النسخ الاحتياطي للإضرار بأمان الخادم.\n# سيتم الإبلاغ عن أي محاولة إساءة وايقافها.",
	backup_manage_admin: "جميع المدراء",
	backup_manage_owner: "مالك الخادم",
	backup_manage_command_ok:
		"تم تحديث وحدة النسخ الاحتياطي. الآن يمكن لـ ${allowed_user_string} إنشاء / تحميل النسخ الاحتياطية على هذا الخادم.",

	// Role Reactions
	// /reactionroles

	// /reactionroles
	reactionroles_dont_admin_added:
		":x: | يجب أن تكون مشرفاً في هذا الخادم لطلب هذه الأوامر!",
	reactionroles_embed_message_description_added:
		"__كيفية الاستخدام؟__\n/rolesreaction add `<message id>` `<reaction>` `<rolesid>`\n/rolesreaction remove `<message id>` `<reaction>`\n/rolesreaction list `<message id>`",
	reactionroles_missing_reaction_added: "مفقود: رمز التعبير",
	reactionroles_invalid_emote_format_added:
		"${emoji_No} | لا يمكنك إرسال `CUSTOM_EMOJI` بصيغة `<::xxx>`! أحتاج فقط إلى ID الخاص بها!",
	reactionroles_logs_embed_title_added: "سجلات ردود الفعل للأدوار",
	reactionroles_logs_embed_description_added:
		"<@${authorId}> قام بتعيين ردود فعل للأدوار: رسالة: `${messagei}` | رد فعل: `${reaction}` | دور: ${role}",
	reactionroles_command_work_added:
		"${reaction} تمت إضافته إلى رسالة ${messagei} لإعطاء ${role}",
	reactionroles_missing_remove: "مفقود: رمز التعبير",
	reactionroles_missing_reaction_remove:
		"لم يتم العثور على ردود الفعل للأدوار في قاعدة البيانات الخاصة بي...",
	reactionroles_cant_fetched_reaction_remove:
		"لا يمكن جلب رد الفعل المستهدف على هذه الرسالة!",
	reactionroles_logs_embed_title_remove: "سجلات ردود الفعل للأدوار",
	reactionroles_logs_embed_description_remove:
		"<@${authorId}> حذف رد فعل للأدوار: رسالة: `${messagei}` | رد فعل: `${reaction}`",
	reactionroles_command_work_remove:
		"${reaction} تم حذفه من رسالة ${messagei}",
	reactionroles_dont_message_found:
		"لا أستطيع استرجاع الرسالة باستخدام ID الرسالة الحالي، أو أن الرموز التعبيرية التي اخترتها ليست على خادم أكون عليه!",

	// /buttonreaction
	buttonreaction_logs_embed_title_added: "سجلات ButtonReaction",
	buttonreaction_logs_embed_description_added:
		"<@${authorId}> أضاف رد فعل باستخدام الزر: الرسالة: `${messagei}` | رد الفعل: `${reaction}` | الدور: ${role}",
	buttonreaction_dont_message_found:
		"لا يمكن إضافة هذا الزر، يبدو أن الأدوار تم تعيينها بالفعل في زر موجود!",
	buttonreaction_roles_not_found: "الوسائط مفقودة: لم تحدد الأدوار لتعيينها!",
	buttonreaction_message_other_user_error:
		"في ديسكورد، لا يمكن لروبوت ديسكورد تعديل مكونات رسالة مستخدم آخر. تحتاج لاختيار رسالة أرسلتها بنفسي. نصيحة: استخدم `/utils embed` لإنشاء تضمين جميل خاص بك!",

	// /roleselect
	roleselect_invalid_message_id:
		"معرّف الرسالة غير صالح. يرجى تقديم معرّف رسالة صالح.",
	roleselect_message_not_found:
		"لم يتم العثور على الرسالة في القناة المحددة.",
	roleselect_default_placeholder: "اختر الأدوار المكونة",
	roleselect_menu1_placeholder: "اختر إجراءً",
	roleselect_menu1_add: "إضافة خيار دور",
	roleselect_menu1_remove: "إزالة خيار دور",
	roleselect_menu1_change_placeholder: "تغيير عنصر النائب للقائمة",
	roleselect_menu1_save: "حفظ وتطبيق التهيئة",
	roleselect_menu1_cancel: "إلغاء",
	roleselect_menu1_embed_title: "تكوين اختيار الدور",
	roleselect_menu1_embed_description:
		"عند اختيار المستخدم للحقول في القائمة المنسدلة، سيحصل على الدور المحدد",
	roleselect_modal1_title: "إضافة خيار دور",
	roleselect_modal1_fields1_label: "الرمز التعبيري",
	roleselect_modal1_fields1_placeholder:
		"اختر رمزًا تعبيريًا لخيار الدور (اختياري)",
	roleselect_modal1_fields2_label: "عنوان الخيار",
	roleselect_modal1_fields2_placeholder: "عنوان قصير لخيار الدور",
	roleselect_modal1_fields3_label: "الوصف",
	roleselect_modal1_fields3_placeholder: "صف خيار الدور (اختياري)",
	roleselect_awaiting1_msg: "اختر دورًا لهذا الخيار",
	roleselect_awaiting1_menu_placeholder: "اختر دورًا",
	roleselect_role_already_exist: "الدور موجود بالفعل في التكوين.",
	roleselect_no_role_found: "لا توجد خيارات أدوار للإزالة.",
	roleselect_all_role_removed: "تمت إزالة جميع خيارات الأدوار.",
	roleselect_last_role_removed: "تمت إزالة آخر خيار دور بنجاح.",
	roleselect_save_command_ok: "تم حفظ تكوين اختيار الدور بنجاح!",
	roleselect_failed_to_save_config:
		"فشل في حفظ التكوين. يرجى المحاولة مرة أخرى.",
	roleselect_canceled_command_ok: "تم إلغاء تكوين اختيار الدور.",
	roleselect_modal2_title: "عنصر نائب للقائمة المنسدلة",
	roleselect_modal2_label: "عنصر نائب",
	roleselect_modal2_placeholder: "عنصر نائب للقائمة المنسدلة",

	// New feature commands
	// /punishpub, /report, /support

	// /punishpub
	punishpub_not_admin:
		":x: | يجب أن تكون مشرفاً في هذا الخادم لطلب هذه الأوامر!",
	punishpub_too_hight_enable: "العدد الذي حددته مرتفع جداً! غير موصى به!",
	punishpub_negative_number_enable: "لا يمكنك إدخال عدد سلبي!",
	punishpub_zero_number_enable: "العدد 0 غير ممكن!",
	punishpub_confirmation_message_enable:
		"لقد قمت بنجاح **بتفعيل** PunishPub مع عدد أقصى من العلامات قدره **${amount}** وعقوبة قدرها **${punishement}**!",
	punishpub_logs_embed_title: "سجلات PunishPub",
	punishpub_logs_embed_description:
		"<@${authorId}> قام بتفعيل PunishPUB مع عدد أقصى من العلامات قدره ${amount} مع عقوبة ${punishement}!",
	punishpub_confirmation_disable: "لقد قمت بنجاح بإيقاف PunishPub",
	punishpub_logs_embed_title_disable: "سجلات PunishPub",
	punishpub_logs_embed_description_disable:
		"<@${authorId}> قام بإيقاف PunishPUB!",

	// /report
	report_cooldown_command:
		"عذراً، يجب عليك الانتظار **${time}** قبل تشغيل هذا الأمر!",
	report_owner_need:
		":x: | **يجب أن تكون مالك الخادم لتتمكن من تشغيل هذا الأمر!**",
	report_specify: "يرجى تحديد المشكلة، يرجى كتابة جمل جيدة!",
	report_command_work: "**شكراً لتقديمك المشكلة!**",

	// /support
	support_not_admin:
		":x: | يجب أن تكون مشرفاً في هذا الخادم لطلب هذه الأوامر!",
	support_command_work:
		"لقد قمت بإعداد وحدة الدعم لـ **${guildName}**.\nعندما يكون لدى المستخدم في سيرتهم:\n**${input}**.\nيجب أن أعطيهم دور <@&${rolesId}>!",
	support_command_work_on_disable:
		"لقد قمت بإعداد وحدة الدعم لـ **${guildName}**.\nلا أحد يمكنه الحصول على دور الآن!",
	support_command_not_role: ":x: | لم تقم بتحديد الدور!",
	support_command_not_type:
		":x: | إنت ماحددتش نوع الدعم اللي عايزه في بروفايل المستخدم (bio = نبذة، مثال: رابط السيرفر؛ tag = تاج السيرفر)!",
	support_command_guild_not_have_tag:
		":x: | السيرفر مافيهوش أي تاجات حالياً.",
	support_command_work_2:
		"إنت ضبطت موديول الدعم لـ ${guildName}.\nولما أي مستخدم يحط تاج السيرفر،\nهأدي له رول <@&${rolesId}>!",

	// /setserverlang

	updates_embed_title: "تحديثات iHorizon",
	updates_embed_description: "هذه هي أحدث التغييرات والتحديثات لـ iHorizon.",
	updates_field_version: "الإصدار",
	updates_field_commit: "آخر Commit",
	updates_field_branch: "الفرع",
	updates_field_links: "روابط",
	updates_changelog_attached: "سجل التغييرات الكامل مرفق بصيغة PDF.",
	newsletter_dm_title: "iHorizon {version} - Release Notes",
	newsletter_dm_body:
		"مرحباً {owner},\n\nتم نشر نسخة رئيسية جديدة من iHorizon.\n\n**الإصدار**: {version}\n**الرابط**: {releaseUrl}\n\nسجل التغييرات الكامل مرفق بصيغة PDF.\n\nتحتاج مساعدة؟ انضم إلى خادم الدعم: https://discord.gg/ihorizon\n-# استخدم +updates أو الزر أدناه لإدارة اشتراكك.",
	newsletter_btn_unsubscribe: "Unsubscribe from newsletter",
	newsletter_btn_subscribe: "Subscribe to newsletter",
	newsletter_not_owner:
		"آها، يسعدني أن أعرف أنني أثير اهتمامك لدرجة أنك تريد رؤية تغييرات الكود في الوقت الفعلي :3\n\n**لكن مهلاً، عليك إضافتي إلى خادم Discord أولاً:**\n\n<https://discord.com/oauth2/authorize?client_id=${clientId}>\n**سأبقيك على اطلاع بهذه الطريقة.**\n\n> بديل آخر: يمكنك الانضمام إلى discord.gg/ihorizon. مؤسساتي يقمن بعمل ping مع التغييرات عند كل تحديث. الخيار لك :3",
	newsletter_toggle_enabled: "Newsletter notifications enabled.",
	newsletter_toggle_disabled: "Newsletter notifications disabled.",
	setserverlang_not_admin:
		":x: | يجب أن تكون مشرفاً في هذا الخادم لطلب هذه الأوامر!",
	setserverlang_logs_embed_title_on_enable: "سجلات تغيير اللغة",
	setserverlang_logs_embed_description_on_enable:
		"<@${authorId}> قام بتغيير لغة iHorizon إلى **${type}**!",
	setserverlang_already: "أنا بالفعل على هذه اللغة!",
	setserverlang_command_work_enable: "لغتي الآن هي **${type}**",
	setserverlang_panel_title: "اختيار اللغة",
	setserverlang_panel_description:
		"اختر اللغة التي تريد أن يستخدمها iHorizon على هذا الخادم.",
	setserverlang_panel_current: "اللغة الحالية",
	setserverlang_panel_select: "اختر لغة...",
	setserverlang_panel_saved: "تم تغيير اللغة بنجاح!",
	setserverlang_command_error_enable: "خطأ!",

	// /الإيمبد
	embed_placeholder_string_select_menu_builder: "ماذا تريد أن تفعل؟",
	embed_placeholder_option_copy_embed: "نسخ الإيمبد",
	embed_placeholder_option_edit_title: "تعديل العنوان",
	embed_placeholder_option_delete_title: "حذف العنوان",
	embed_placeholder_option_edit_description: "تعديل الوصف",
	embed_placeholder_option_delete_description: "حذف الوصف",
	embed_placeholder_option_edit_author: "تعديل المؤلف",
	embed_placeholder_option_delete_author: "حذف المؤلف",
	embed_placeholde_option_change_footer_image: "تغيير أيقونة التذييل",
	embed_placeholder_option_edit_footer: "تعديل التذييل",
	embed_placeholder_option_delete_footer: "حذف التذييل",
	embed_placeholder_option_edit_thumbnail: "تعديل الصورة المصغرة",
	embed_placeholder_option_edit_image: "تعديل الصورة",
	embed_placeholder_option_edit_titleurl: "تعديل عنوان URL للعنوان",
	embed_placeholder_option_edit_color: "تعديل اللون",
	embed_placeholder_option_delete_color: "حذف اللون",
	embed_btn_save: "حفظ الإيمبد",
	embed_btn_send: "إرسال الإيمبد",
	embed_btn_cancel: "إلغاء",
	embed_interaction_not_for_you: "هذه التفاعل ليست لك",
	embed_first_message: "ماذا تريد أن تفعل؟",
	embed_save_message:
		"<@${authorId}>, **لقد قررت حفظ إعدادات الإيمبد!**```Embed ID: ${embedId}```",
	embed_cancel_message:
		"<@${authorId}>, **لقد قررت التخلي عن إعدادات الإيمبد!**",
	embed_send_message:
		"<@${authorId}>, **في أي قناة يجب أن أرسل هذا الإيمبد؟**",
	embed_timeout_getbtn:
		"<@${authorId}>, **لقد استغرقت وقتاً طويلاً للرد، سأقوم بإلغاء العملية الجارية!**",
	embed_choose_0: "ما الرسالة التي تريد تضمينها في الإيمبد الخاص بك؟",
	embed_choose_1: "ما العنوان الذي تريد تضمينه في الإيمبد الخاص بك؟",
	embed_choose_2: "تم حذف عنوان الإيمبد بنجاح!",
	embed_choose_3: "ما الوصف الذي تريد تضمينه في الإيمبد الخاص بك؟",
	embed_choose_4: "تم حذف وصف الإيمبد بنجاح!",
	embed_choose_5: "ما المؤلف الذي تريد تضمينه في الإيمبد الخاص بك؟",
	embed_choose_6: "تم حذف مؤلف الإيمبد بنجاح!",
	embed_choose_7: "ما التذييل الذي تريد تضمينه في الإيمبد الخاص بك؟",
	embed_choose_7bis:
		"ما أيقونة التذييل التي تريد تضمينها في الرسالة المدمجة؟",
	embed_choose_8: "تم حذف تذييل الإيمبد بنجاح!",
	embed_choose_9: "ما الصورة المصغرة التي تريد تضمينها في الإيمبد الخاص بك؟",
	embed_choose_10: "ما الصورة التي تريد تضمينها في الإيمبد الخاص بك؟",
	embed_choose_11: "ما عنوان URL الذي تريد تضمينه في الإيمبد الخاص بك؟",
	embed_choose_12:
		"ما اللون الذي تريد تضمينه في الإيمبد الخاص بك؟ **www.color-hex.com**",
	embed_choose_12_error:
		"${emoji_No} | لون غير صالح! يرجى التحقق من **www.color-hex.com**",
	embed_choose_13: "تم حذف لون الإيمبد بنجاح!",
	embed_send_embed_work:
		"<@${authorId}>, **لقد قمت بنجاح بإرسال الإيمبد إلى قناة <#${messageContent}>!**",
	embed_copy_bad_guild_msg:
		"الخادم الذي توجد فيه الرسالة ليس هو نفسه ${guildName}",
	embed_copy_bad_channel_msg: "القناة التي توجد فيها الرسالة غير متاحة!",
	embed_copy_bad_message_msg: "الرسالة غير متاحة!",
	embed_copy_bad_embed_message_msg: "الرسالة لا تحتوي على إيمبد!",
	embed_copy_bad_url_msg:
		"رابط غير صالح، يرجى المحاولة مرة أخرى. التنسيق الصحيح هو: https://discord.com/channels/${messageGuildId}/${channelId}/${id}",
	embed_btn_replace: "استبدال التضمين",
	embed_replace_question_msg:
		"ما هو عنوان URL الجديد للرسالة التي تحتاج إلى استبدال التضمين فيها؟",
	embed_replace_message:
		"{user}، تم استبدال التضمين الجديد بالتضمين الخاص بـ {messageUrl}",

	// /rolesaver
	rolesaver_embed_title: "وحدة حفظ الأدوار",
	rolesaver_embed_desc:
		"عندما يغادر الأعضاء الخادم، يتم حفظ أدوارهم في قاعدة البيانات. الآن عندما يعودون، يقوم iHorizon بإعادة أدوارهم.",
	rolesaver_embed_fields_1_name: "تفعيل",
	rolesaver_embed_fields_2_name: "إعادة منح أدوار المشرفين",
	rolesaver_embed_fields_3_name: "الوقت المنقضي",
	rolesaver_on_off_already_set: "الوحدة بالفعل مُعطلة!",
	rolesaver_on_off_embed_title: "وحدة حفظ الأدوار",
	rolesaver_on_off_embed_desc:
		"عندما يغادر الأعضاء الخادم، لا يتم حفظ أدوارهم في قاعدة البيانات. الآن، iHorizon لم يعد يستعيد الأدوار القديمة للأعضاء عند عودتهم إلى الخادم.",
	rolesaver_on_off_embed_fields_1_name: "تفعيل",

	// /nigthmode
	var_nm_role_app_dont_exist:
		"${emoji_Warning_Icon} البوت لا يمتلك دور التطبيق. يرجى إعادة إضافة البوت بشكل صحيح.\n",
	var_nm_role_app_not_high:
		"${emoji_Warning_Icon} البوت ليس في أعلى الأدوار. يرجى وضعه في الأعلى.\n",
	var_nm_role_app_not_admin:
		"${emoji_Warning_Icon} دور البوت لا يملك صلاحيات المشرف.\n",
	var_nm_end_main: "ينتهي الوضع الليلي.\n\n",
	var_nm_start_main: "الوضع الليلي على وشك البدء.\n\n",
	var_nm_edited_roles: "تم تعديل الأدوار التالية:",
	var_nm_running: "البدء",
	var_nm_stopping: "التوقف",
	var_nm_running2: "يبدأ",
	var_nm_stopping2: "ينتهي",
	var_nm_title: "الوضع الليلي",
	var_nm_ping_embed_title: "الوضع الليلي ${type}",
	var_nm_ping_embed_fields_0_name: "الفترة الزمنية",
	var_nm_error_occured: "# حدثت مشكلة أثناء ${type} الوضع الليلي.\n",
	nightmode_embed_desc:
		"# ⭐️ الوضع الليلي\n> *ما هو الوضع الليلي؟* الوضع الليلي هو حماية **[صنع بواسطة iHorizon](https://www.ihorizon.org)** يسمح بإلغاء جميع صلاحيات المشرف على سيرفر ديسكورد خلال فترة معينة.\n> *مثال، أنت على سيرفر ديسكورد مع الكثير من الطاقم، تريد إزالة جميع صلاحيات المشرف ليلاً لتجنب المداهمة، سرقة vanity ديسكورد، إلخ*\n> *أنت في المكان الصحيح عزيزي. **iHorizon سيكون دائماً الحل.***\n\n---\n",
	nightmode_embed_fields_0_name: "تفعيل الوحدة",
	nightmode_embed_fields_1_name: "إشعار مالك السيرفر",
	nightmode_embed_fields_2_name: "خفض رتبة البوتات؟",
	nightmode_embed_fields_3_name: "البوتات في القائمة البيضاء",
	nightmode_embed_fields_4_name: "الفترة الزمنية",
	nightmode_select_placeholder: "تكوين الوضع الليلي على السيرفر.",
	nightmode_select_0_label: "تفعيل الوضع الليلي",
	nightmode_select_0_desc: "تفعيل/إلغاء تفعيل الوضع الليلي.",
	nightmode_select_1_label: "تحذير مالك السيرفر",
	nightmode_select_1_desc: "إشعار مالك السيرفر عند التفعيل/الإلغاء",
	nightmode_select_2_label: "تكوين الفترة الزمنية للوضع الليلي",
	nightmode_select_2_desc:
		"الفترة الزمنية حيث يتم إزالة صلاحيات المشرف تلقائياً.",
	nightmode_select_3_label: "خفض رتبة البوتات",
	nightmode_select_3_desc: "هل يجب خفض رتبة البوتات أثناء الليل؟",
	nightmode_select_4_label: "تغيير المنطقة الزمنية (UTC)",
	nightmode_select_4_desc: "إذا كان لديك وقت محدد يجب وضعه (تنسيق رقم UTC)",
	nightmode_select1_placeholder: "البوتات المسموحة بأن تكون مشرف أثناء الليل",
	nightmode_change_timezone_question: "اختر UTC لسيرفر ديسكورد الخاص بك",
	nightmode_modal_hours_window_fields0_label:
		"وقت البدء (مثال: 21:30 أو 2130)",
	nightmode_modal_hours_window_fields1_label:
		"وقت الانتهاء (مثال: 06:15 أو 0615)",
	nightmode_modal_hours_window_title:
		"الوضع الليلي - الفترة الزمنية (تنسيق 24 ساعة مع الدقائق)",
	nightmode_invalid_hour_morning:
		"${emoji_No} وقت البدء غير صالح. استخدم التنسيق: 21:30 أو 2130",
	nightmode_invalid_hour_night:
		"${emoji_No} وقت الانتهاء غير صالح. استخدم التنسيق: 06:15 أو 0615",
	nightmode_utc_timezone_on: "المنطقة الزمنية UTC على",

	// /git lines
	git_lines_avoiding_spam:
		"عذراً، ولكن لمنع الرسائل المزعجة، نحن نحدد عدد الأسطر المعروضة بـ 50",
	git_lines_avoiding_limit:
		"عذراً ولكن هناك حد أقصى 2000 حرف على Discord، لذا لم نتمكن من عرض المقطع المطلوب",
	git_lines_work: "✅ تم تفعيل Git Lines الآن.",
	git_lines_work_disabled: "❌ تم إلغاء تفعيل Git Lines الآن.",
	git_lines_borred_warning:
		"\n-# ${emoji_VC_OpenChat} هل أزعجك؟ يمكنك كتابة `/git lines` لإلغاء تفعيل هذا الوحدة!",

	// /counter config
	counter_config_command_action_on:
		"${author}، لقد قمت بتعيين وحدة العداد إلى `تشغيل`.\nإذا لم تكن القناة موجودة، قم بإعدادها باستخدام الأمر: **/counter channel**.",
	counter_config_command_action_off:
		"${author}، لقد قمت بتعيين وحدة العداد إلى `إيقاف`.",

	// /counter channel
	counter_channel_embed_title: "تم تعيين وحدة العداد هنا!",
	counter_channel_embed_desc:
		"${author} قام بتعيين وحدة العداد هنا!\nيمكن للمستخدمين الآن العد في هذه القناة!",
	counter_channel_command_work:
		"${author}، تم تعيين وحدة العداد بنجاح إلى القناة ${channel}!",
	counter_channel_command_error:
		"${author}، حدث خطأ أثناء تنفيذ الأمر. يرجى التحقق من أن القناة المحددة موجودة وأن وحدة العداد مفعلة!",

	counter_actual_number: "✨ **الرقم الحالي:** {number}",

	// Suggestion commands
	// /setsuggest, /suggest

	// /suggest accept
	suggest_accept_not_admin: "أنت لست مشرفاً!",
	suggest_acceptnot_good_channel:
		"يجب تشغيل هذا الأمر في قناة وحدة الاقتراحات (<#${channel}>)!\nيرجى التحقق من عدم تعطيل وحدة الاقتراحات!",
	suggest_accept_not_found_db: "لم يتم العثور على الاقتراح في قاعدة بياناتي!",
	suggest_accept_already_replied: "تم الرد على هذا الاقتراح بالفعل!",
	suggest_accept_embed_fields_to_put: "رد من ${authorUsername} (قبول)",
	suggest_acceptembed_title_to_put: "[قبول] ${title}",
	suggest_accept_command_work:
		"لقد قمت بقبول الاقتراح!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_accept_command_error: "لم يتم العثور على الاقتراح في قناة Discord!",

	// /suggest deny
	suggest_deny_not_admin: "أنت لست مشرفاً!",
	suggest_deny_not_good_channel:
		"يجب تشغيل هذا الأمر في قناة وحدة الاقتراحات (<#${channel}>)!\nيرجى التحقق من عدم تعطيل وحدة الاقتراحات!",
	suggest_deny_not_found_db: "لم يتم العثور على الاقتراح في قاعدة بياناتي!",
	suggest_deny_already_replied: "تم الرد على هذا الاقتراح بالفعل!",
	suggest_deny_embed_fields_to_put: "رد من ${authorUsername} (رفض)",
	suggest_deny_embed_title_to_put: "[رفض] ${title}",
	suggest_deny_command_work:
		"لقد قمت برفض الاقتراح!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_deny_command_error: "لم يتم العثور على الاقتراح في قناة Discord!",

	// /suggest reply
	suggest_reply_not_admin: "أنت لست مشرفاً!",
	suggest_reply_not_good_channel:
		"يجب تشغيل هذا الأمر في قناة وحدة الاقتراحات (<#${channel}>)!\nيرجى التحقق من عدم تعطيل وحدة الاقتراحات!",
	suggest_replynot_found_db: "لم يتم العثور على الاقتراح في قاعدة بياناتي!",
	suggest_reply_already_replied: "تم الرد على هذا الاقتراح بالفعل!",
	suggest_reply_embed_fields_to_put: "رد من ${authorUsername}",
	suggest_reply_embed_title_to_put: "[تم الرد] ${title}",
	suggest_reply_command_work:
		"لقد قمت بإرسال رد على الاقتراح!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_reply_command_error: "لم يتم العثور على الاقتراح في قناة Discord!",

	// /suggest delete
	suggest_delete_not_delete: "أنت لست مشرفاً!",
	suggest_delete_not_good_channel:
		"يجب تشغيل هذا الأمر في قناة وحدة الاقتراحات (<#${channel}>)!\nيرجى التحقق من عدم تعطيل وحدة الاقتراحات!",
	suggest_delete_not_found_db: "لم يتم العثور على الاقتراح في قاعدة بياناتي!",
	suggest_delete_command_work: "لقد قمت بحذف الاقتراح!",
	suggest_delete_command_error: "لم يتم العثور على الاقتراح في قناة Discord!",

	// /setsuggest disable
	setsuggest_disable_not_admin: "أنت لست مشرفاً!",
	setsuggest_disable_pw_on: "${author}, لقد قمت بتفعيل وحدة الاقتراحات!",
	setsuggest_disable_pw_off: "${author}, لقد قمت بإيقاف وحدة الاقتراحات!",

	// /setsuggest channel
	setsuggest_channel_not_admin: "أنت لست مشرفاً!",
	setsuggest_channel_already_set_with_that:
		"${author}, قناة وحدة الاقتراحات تم تعيينها بالفعل إلى ${channel}!",
	setsuggest_channel_embed_title: "تم تعيين قناة وحدة الاقتراحات هنا!",
	setsuggest_channel_embed_desc:
		"الآن، جميع المستخدمين المسموح لهم بإرسال الرسائل هنا يمكنهم تقديم اقتراحات عن طريق إرسال رسالة فقط!",
	setsuggest_channel_command_work:
		"${author}, لقد قمت بتعيين قناة وحدة الاقتراحات إلى ${channel}!",

	// Security Command
	// /security

	// /security disable
	security_disable_not_admin: "أنت لست مشرفاً!",
	security_disable_pw_on: "${author}, لقد قمت بتفعيل وحدة الأمان!",
	security_disable_pw_off: "${author}, لقد قمت بإيقاف وحدة الأمان!",

	// /security role-to-give
	security_role_to_give_not_admin: "أنت لست مشرفاً!",
	security_role_to_give_command_work:
		"${author}, لقد قمت بتعيين الدور إلى ${role} لوحدة الأمان!",

	// /security channel
	security_channel_not_admin: "أنت لست مشرفاً!",
	security_channel_command_work:
		"${author}, لقد قمت بتعيين القناة إلى ${channel} لوحدة الأمان!",

	// Schedule Command
	// /schedule

	// /schedule
	schedule_menu_placeholder: "ماذا تريد أن تفعل؟",
	schedule_menu_choice_0: "إنشاء جدول",
	schedule_menu_choice_1: "حذف جدول",
	schedule_menu_choice_2: "حذف جميع الجداول",
	schedule_menu_choice_3: "عرض جميع الجداول",
	schedule_modal_title: "مدير الجداول",
	schedule_modal_fields_1_label: "اسم الجدول؟",
	schedule_modal_fields_2_label: "وصف الجدول؟",
	schedule_delete_question: "ما هو معرّف الجدول الذي تريد حذفه؟",
	schedule_deleteall_question: "هل أنت متأكد من حذف جميع جداولك؟ (Y/n)",
	schedule_delete_not_found: "لا توجد جداول (${arg0}) لهذا العضو!",
	schedule_delete_title_embed: "حذف جدول (${arg0})",
	schedule_delete_confirm: "تم حذف الجدول!",
	schedule_deleteall_title_embed: "حذف جميع الجداول",
	schedule_deleteall_desc_embed: "تم حذف جميع جداولك!",
	schedule_deleteall_confirm: "تم حذف جميع جداولك!",
	schedule_deleteall_cancel: "تم إلغاء إجراء `DELETE_ALL`!",
	schedule_list_not_schedule: "لا توجد جداول لهذا العضو!",
	schedule_list_title_embed: "عرض جميع الجداول",
	schedule_list_fields_embed:
		"**انتهى في**: ${expiresAt}```${title}``````${description}```\n",
	schedule_list_content_message: "هذه هي قائمة جميع جداولك!",
	schedule_create_title_embed: "إنشاء جدول",
	schedule_create_when_question:
		"متى تريد أن يتم إعلامك بهذا الجدول؟ (مثال: 6d = 6 أيام، 2h = 2 ساعات، 10m = 10 دقائق، 10s = 10 ثواني)",
	schedule_create_not_number_time:
		"${author}, ردك (الوقت الذي تريد أن يتم إعلامك به بهذا الجدول) ليس رقماً!",
	schedule_create_embed_fields_name_confirm: "تاريخ الإعلام",
	schedule_create_embed_title_confirm: "#${scheduleCode} تم إنشاء الجدول!",
	schedule_create_confirm_msg:
		"${author}, تم إنشاء جدولك!\nالرمز: `${scheduleCode}`",

	// PFPS Command
	// /pfps channel, /pfps config

	// /pfps config
	pfps_config_not_admin: ":x: أنت لا تمتلك صلاحيات الإدارة لتنفيذ هذا الأمر",
	pfps_config_command_action_on:
		"${author}, لقد قمت بتفعيل وحدة PFPS.\nإذا كانت القناة غير موجودة، قم بتكوينها باستخدام الأمر: **/pfps channel**.",
	pfps_config_command_action_off: "${author}, لقد قمت بإيقاف وحدة PFPS.",

	// /pfps channel
	pfps_channel_not_admin: ":x: أنت لا تمتلك صلاحيات الإدارة لتنفيذ هذا الأمر",
	pfps_channel_embed_title: "تم تعيين وحدة PFPS هنا!",
	pfps_channel_embed_desc:
		"${author} قد قام بتعيين وحدة PFPS هنا!\nالآن كل 30 ثانية، سأرسل صورة عشوائية من مستخدم في هذه الخادم!\nسأبذل قصارى جهدي!",
	pfps_channel_command_work:
		"${author}, لقد قمت بنجاح بتعيين وحدة PFPS إلى القناة ${channel}!",
	pfps_channel_command_error:
		"${author}, الأمر أرجع خطأ. يرجى التحقق من أن القناة التي حددتها موجودة، وتحقق من تمكين وحدة PFPS!",

	// Protection Module
	// /protect, /allowlist add, /allowlist remove, /allowlist show

	// /protect panel
	authorization_actions_not_permited:
		"فقط مالك الخادم يمكنه تعديل قاعدة الإذن المتعلقة بوحدة الحماية!",
	authorization_actions_everyone: "الجميع",
	authorization_actions_allowlist: "الأعضاء في القائمة المسموحة",
	authorization_actions_nobody: "لا أحد. (باستثناء صاحب الخادم)",
	protect_panel_title: "لوحة تحكم Protect",
	protect_panel_desc:
		"قم بتهيئة كل قاعدة حماية: فعّلها أو عطّلها، واختر من يمكنه تجاوزها، وحدد العقوبة المطبقة على العضو المسؤول.",
	protect_panel_global_label: "العقوبة العامة",
	protect_panel_global_hint: "تُطبَّق على كل قاعدة بدون عقوبة خاصة",
	protect_panel_select_placeholder: "اختر قاعدة لإعدادها",
	protect_panel_mode_placeholder: "اختر من يمكنه تجاوز هذه القاعدة",
	protect_panel_sanction_placeholder: "اختر العقوبة المطبقة",
	protect_panel_bypass_label: "التجاوز",
	protect_panel_sanction_label: "العقوبة",
	protect_panel_rule_help:
		"عند تفعيل هذه القاعدة، يُلغى الإجراء تلقائيًا وتُطبَّق العقوبة على العضو المسؤول.",
	protect_panel_enable_button: "تفعيل",
	protect_panel_disable_button: "تعطيل",
	protect_panel_all_rules: "كل القواعد",
	protect_panel_all_rules_desc: "تعديل كل القواعد مرة واحدة",
	protect_panel_all_status: "${enabledCount}/${ruleCount} قواعد مفعّلة",
	protect_panel_all_help:
		"ينطبق التجاوز والعقوبة على كل القواعد المفعّلة مرة واحدة.",
	protect_panel_all_mixed: "مختلط",
	protect_panel_enable_all_button: "تفعيل الكل",
	protect_panel_disable_all_button: "تعطيل الكل",
	protect_panel_all_mode_saved:
		"أصبحت **${ruleCount}** قواعد تسمح بمرور: **${mode}**.",
	protect_panel_all_sanction_saved:
		"أصبحت عقوبة **${ruleCount}** قواعد: **${sanction}**.",
	protect_panel_all_enabled: "تم تفعيل **${ruleCount}** قواعد!",
	protect_panel_all_disabled: "تم تعطيل **${ruleCount}** قواعد!",
	protect_panel_back_button: "رجوع",
	protect_panel_refresh_button: "تحديث",
	protect_panel_close_button: "إغلاق اللوحة",
	protect_panel_rule_enabled: "تم تفعيل القاعدة **${rule}**!",
	protect_panel_rule_disabled: "تم تعطيل القاعدة **${rule}**!",
	protect_panel_mode_saved:
		"تجاوز القاعدة **${rule}** الآن بواسطة: **${mode}**.",
	protect_panel_sanction_saved: "عقوبة **${rule}** الآن: **${sanction}**.",
	protect_panel_global_saved: "العقوبة العامة الآن: **${sanction}**.",
	protect_panel_api_error:
		"لم أتمكن من تطبيق هذا التغيير، تأكد من أن لدي إذن `مشرف` ثم حاول مرة أخرى.",
	protect_panel_sanction_global: "القيمة العامة الافتراضية",
	protect_panel_sanction_cancel: "إلغاء الإجراءات فقط",
	protect_panel_sanction_derank: "إلغاء + تخفيض الرتبة",
	protect_panel_sanction_ban: "إلغاء + حظر",
	protect_panel_sanction_kick: "إلغاء + طرد",
	protect_panel_sanction_mute: "إلغاء + كتم (10 دقائق)",
	protect_panel_group_server: "الخادم و Webhooks",
	protect_panel_group_channels: "القنوات",
	protect_panel_group_roles: "الأدوار",
	protect_panel_group_members: "الأعضاء",
	protect_panel_rule_webhook_name: "Webhooks",
	protect_panel_rule_updateguild_name: "تعديلات الخادم",
	protect_panel_rule_createchannel_name: "إنشاء القنوات",
	protect_panel_rule_updatechannel_name: "تعديل القنوات",
	protect_panel_rule_deletechannel_name: "حذف القنوات",
	protect_panel_rule_createrole_name: "إنشاء الأدوار",
	protect_panel_rule_deleterole_name: "حذف الأدوار",
	protect_panel_rule_updaterole_name: "تعديل الأدوار",
	protect_panel_rule_updatemember_name: "تعديل أدوار الأعضاء",
	protect_panel_rule_banmembers_name: "حظر الأعضاء",
	protect_panel_rule_kickmember_name: "طرد الأعضاء",
	protect_panel_rule_unbanmembers_name: "رفع الحظر",
	protect_panel_rule_add_admin_roles_name: "منح أدوار المشرف",
	// /allowlist show
	allowlist_show_not_permited:
		"أنت غير مسموح لك باستخدام هذا الأمر! يجب أن تكون في القائمة المسموحة!",
	allowlist_show_embed_author: "القائمة المسموحة",

	// /allowlist add
	allowlist_add_not_permited:
		"أنت غير مصرح لك باستخدام هذا الأمر! يجب أن تكون في القائمة المسموحة!",
	allowlist_add_not_owner:
		"فقط مالك الخادم يمكنه إضافة/إزالة الأعضاء من القائمة المسموحة!",
	allowlist_add_already_in:
		"العضو الذي تريد إضافته إلى القائمة المسموحة موجود بالفعل!",
	allowlist_add_command_work: "${member} تم إضافته إلى القائمة المسموحة!",

	// /allowlist delete
	allowlist_delete_not_permited:
		"أنت غير مصرح لك باستخدام هذا الأمر! يجب أن تكون في القائمة المسموحة!",
	allowlist_delete_not_owner:
		"فقط مالك الخادم يمكنه إضافة/إزالة الأعضاء من القائمة المسموحة!",
	allowlist_delete_member_unreachable:
		"العضو الذي تريد إزالته من القائمة المسموحة غير متاح!",
	allowlist_delete_cant_remove_owner:
		"لا يمكن حذف مالك الخادم من القائمة المسموحة!",
	allowlist_delete_isnt_in:
		"العضو الذي تريد إزالته من القائمة المسموحة ليس موجوداً فيها!",
	allowlist_delete_command_work: "${member} تم إزالته من القائمة المسموحة!",

	// Custom Tag Module
	// /tag create, ... delete, ... edit, ... list, ... info

	tag_name: "الوسم",
	tag_embed_created_at: "تم الإنشاء في",
	tag_embed_last_update: "آخر تحديث",
	tag_embed_last_updated_by: "آخر تحديث بواسطة",

	// /tag create
	tag_create_not_permited:
		"غير مسموح لك بإنشاء وسم.\nتحتاج إلى صلاحيات المسؤول أو يجب أن تكون في القائمة البيضاء (`tag wlroles-create`).",
	tag_create_not_good_name:
		"يجب ألا يحتوي اسم الوسم على مسافات أو نقاط وألا يتجاوز 16 حرفًا.",
	tag_create_command_work: "تم إنشاء الوسم `${tag_name}`.",
	tag_create_already_exist: "الوسم موجود بالفعل.",
	tag_create_embed_doesnt_exist: "الإطار المضمن غير موجود.",

	// /tag delete
	tag_no_one_found: "لا توجد وسوم محفوظة في هذا السيرفر!",
	tag_delete_dnt_exist: "الوسم `${tag_name}` غير موجود.",
	tag_delete_command_ok: "تم حذف الوسم `${tag_name}`.",

	// /tag info
	tag_doesnt_exist: "الوسم `${tag_name}` غير موجود!",

	// /tag wlcreate
	tag_wlcreate_embed_title: "القائمة البيضاء للإنشاء - الوسوم",
	tag_wlcreate_embed_desc: "جميع الأدوار المسموح لها بإنشاء الوسوم.",

	// /tag wluse
	tag_wluse_embed_title: "القائمة البيضاء للاستخدام - الوسوم",
	tag_wluse_embed_desc: "جميع الأدوار المسموح لها باستخدام الوسوم.",

	// /tag list
	tag_list_no_anything: "لا توجد وسوم محفوظة في هذا السيرفر!",

	// /tag use
	tag_use_not_allowed:
		"غير مسموح لك باستخدام الوسم `${tag_name}`.\nتحتاج إلى صلاحيات المسؤول أو يمكنك أن تطلب من مالك الوسم <@${createBy}> إضافتك إلى القائمة البيضاء (`tag wlroles-use`).",
	tag_use_command_work: "تم إرسال الوسم `${tag_name}`.",

	// /tag edit
	tag_edit_error_perm:
		"لتعديل الوسم، تحتاج إلى الحصول على أذونات المدير أو أن تكون مالك الوسم.",
	tag_edit_command_ok:
		"تم تعديل اسم الوسم الحالي من **`${current_tag_name}`** إلى **`${new_tag_name}`**",

	// TempVoice Module
	// /text, /voice, /status, /staff

	// /voice interface set-text-channel
	tempvoice_if_text_not_admin:
		"<@${authorId}>, ليس لديك الصلاحية لاستخدام هذا الأمر!",
	tempvoice_if_text_desc_embed:
		"## واجهة TempVoice\nهذه **الواجهة** يمكن استخدامها لإدارة قنوات الصوت المؤقتة.\n",
	tempvoice_if_text_fields_value_limit: "${emoji_VC_Limit} **تغيير الحد**",
	tempvoice_if_text_fields_value_name: "${emoji_VC_Name} **تغيير الاسم**",
	tempvoice_if_text_fields_value_region:
		"${emoji_VC_Region} **تغيير المنطقة**",
	tempvoice_if_text_fields_value_trust: "${emoji_VC_Trust} **ثقة**",
	tempvoice_if_text_fields_value_untrust: "${emoji_VC_Untrust} **عدم الثقة**",
	tempvoice_if_text_fields_value_block: "${emoji_VC_Block} **حظر**",
	tempvoice_if_text_fields_value_unblock:
		"${emoji_VC_Unblock} **إلغاء الحظر**",
	tempvoice_if_text_fields_value_claim: "${emoji_VC_Claim} **التحقق**",
	tempvoice_if_text_fields_value_privacy: "${emoji_VC_Privacy} **الخصوصية**",
	tempvoice_if_text_fields_value_transfer: "${emoji_VC_Transfer} **نقل**",
	tempvoice_if_text_fields_value_delete: "${emoji_VC_Delete} **حذف**",

	// /voice inteface set-voice-channel
	tempvoice_vc_not_admin:
		"<@${authorId}>, ليس لديك الصلاحية لاستخدام هذه الأوامر!",

	// /voice interface set-staff-role
	tempvoice_staff_not_admin:
		"<@${authorId}>, ليس لديك الصلاحية لاستخدام هذا الأمر!",
	tempvoice_staff_desc_embed:
		"## دور طاقم TempVoice\nيمكن للأدوار هنا الآن دخول القناة والإشراف!\n",

	// Confessionn Module
	// /cooldown, /disable, /channel

	// /confession channel
	confession_channel_command_work: "تم إرسال لوحة الاعتراف إلى ${channel}",
	confession_channel_panel_embed_desc:
		"# **الاعترافات المجهولة**\n\nاضغط على الزر أدناه لفتح نموذج الاعتراف. يمكنك كتابة ما تريد الاعتراف به. إذا أردت، يمكنك اختيار جعل اعترافك خاصًا.\nضع في اعتبارك أن الاعترافات قد لا تظل مجهولة — قد يتمكن مالكو الخوادم أو أي شخص لديه حق الوصول إلى سجلات الاعترافات من التعرف على المستخدمين إذا تم تمكين التسجيل.\n\n## **قم بالاعتراف**\n\n*ملاحظة: لجعل اعترافك خاصًا، اكتب الخيار المناسب في النموذج.*",
	confession_channel_log_embed_title: "إعداد قناة اعترافات",
	confession_channel_log_embed_desc:
		"${author} قام بتعيين القناة إلى ${channel}",

	// /confession cooldown
	confession_coolodwn_command_work:
		"${author}, وقت التهدئة للاعترافات الآن هو **${time}** !",
	confession_cooldown_log_embed_title: "إعداد وقت التهدئة للاعترافات",
	confession_cooldown_log_embed_desc:
		"${author} قام بتعيين الوقت إلى `${time}`",

	// /confession disable
	confession_disable_command_work_on: "وحدة الاعترافات الآن مفعلّة.",
	confession_disable_command_work_off: "وحدة الاعترافات الآن معطّلة.",
	confession_log_embed_title_on_enable: "تفعيل/تعطيل الاعترافات",
	confession_log_embed_desc_on_enable:
		"${author} قام بتفعيل وحدة الاعترافات!",
	confession_log_embed_desc_on_disabled:
		"${author} قام بتعطيل وحدة الاعترافات!",

	// /confession thread
	confession_thread_enabled:
		"من الآن فصاعداً، عندما يعترف شخص ما، سأقوم بإنشاء موضوع نقاش تحت الرسالة المضمنة.",
	confession_thread_disabled:
		"لن أقوم بإنشاء موضوع نقاش تحت الرسالة المضمنة.",

	// AntiSpam Module
	// /antispam manage

	// /antispam manage
	antispam_manage_embed_title: "إعدادات وحدة مكافحة السبام",
	antispam_manage_choices_1_label: "تفعيل الوحدة",
	antispam_manage_choices_1_desc: "تفعيل أو تعطيل وحدة مكافحة السبام",
	antispam_manage_choices_2_label: "تجاهل الروبوتات",
	antispam_manage_choices_2_desc: "تجاهل السبام من الروبوتات في الخادم",
	antispam_manage_choices_3_label: "نوع العقوبة",
	antispam_manage_choices_3_desc: "ما هو نوع العقوبة التي سأعطيها للمستخدم",
	antispam_manage_choices_4_label: "مدة العقوبة",
	antispam_manage_choices_4_desc: "مدة العقوبة",
	antispam_manage_choices_5_label: "مضاعف وقت العقوبة",
	antispam_manage_choices_5_desc: "إذا تم مضاعفة مدة العقوبة لكل عقوبة",
	antispam_manage_choices_6_label: "حذف الرسائل",
	antispam_manage_choices_6_desc: "حذف الرسائل المسيئة",
	antispam_manage_choices_7_label: "الحد الأقصى للفترة بين الرسائل",
	antispam_manage_choices_7_desc: "أقصى فترة بين الرسائل لتصنيفها كسبام",
	antispam_manage_choices_8_label: "الحد الأقصى للرسائل المكررة",
	antispam_manage_choices_8_desc: "أقصى عدد من الرسائل المكررة قبل العقوبة",
	antispam_manage_choices_9_label: "الحد الأقصى للفترة بين الرسائل المكررة",
	antispam_manage_choices_9_desc:
		"الفترة بين الرسائل المكررة لتمييز المستخدم",
	antispam_manage_choices_10_label: "الحد الأقصى للرسائل المشابهة",
	antispam_manage_choices_10_desc: "أقصى عدد من الرسائل المشابهة قبل العقوبة",
	antispam_manage_choices_12_label: "الحد الأقصى قبل العقوبة",
	antispam_manage_choices_12_desc: "الحد الأقصى قبل العقوبة",
	antispam_manage_select_menu_punish_mute_label: "كتم الأعضاء",
	antispam_manage_modal_title: "نموذج مكافحة السبام",
	antispam_manage_button_label: "حفظ الإعدادات",
	antispam_manage_preset_level1_name: "وضع الاسترخاء",
	antispam_manage_preset_level2_name: "وضع الحماية",
	antispam_manage_preset_level3_name: "وضع الحماية الشديد",
	antispam_manage_button_preset_label: "تحميل الإعدادات المسبقة",
	antispam_manage_selectstring_preset_label: "إعدادات مسبقة",

	// /antispam bypass-roles
	antispan_bypassroles_embed_desc:
		"جميع الأدوار أدناه يمكنها تجاوز وحدة مكافحة السبام",

	// /antispam bypass-roles
	antispam_ignorechannels_embed_desc:
		"جميع الرسائل المرسلة في أحد هذه القنوات أدناه يمكنها تجاوز وحدة مكافحة السبام",

	// Stats Module
	// /stats ustats

	// /stats ustats
	header_h1_value: "إحصائيات الرسائل الخاصة بـ {author_username}",
	messages_word: "الرسائل",
	voice_activity: "نشاط الصوت",
	minutes_word: "دقائق",
	top_voice: "أفضل قنوات الصوت",
	top_message: "أفضل قنوات الرسائل",
	var_members: "عضو/أعضاء",

	// Starboard Module
	// lazy

	// /starboard channel
	starboard_channel_command_ok:
		"${emoji_Yes} | **تم تعيين قناة Starboard الآن إلى: ${channel}**. الآن، عندما يتفاعل أعضاء الخادم برمز '⭐' وتجاوز عدد التفاعلات **`${threshold}`**، سيتم إرسال الرسالة إلى ${channel}!",

	// /starboard config
	starboard_config_command_ok:
		"${emoji_Yes} | **تم الآن ${action} وحدة Starboard**",

	// /starboard threshold
	starboard_threshold_command_ok:
		"${emoji_Yes} | الآن، عندما يتفاعل أعضاء الخادم برمز '⭐' وتتجاوز التفاعلات الحد **`${amount}`**، سيتم إرسال الرسالة إلى القناة المحددة!",

	// /starboard create-thread
	starboard_create_thread_command_ok:
		"${emoji_Yes} | الآن، عندما يتفاعل أعضاء الخادم برمز '⭐' وتتجاوز التفاعلات الحد **`${amount}`**، سيتم إرسال الرسالة إلى القناة المحددة **`${action}`**",
	starboard_create_thread_yes: "وسيتم إنشاء موضوع مناقشة",
	starboard_create_thread_no: "ولن يتم إنشاء موضوع مناقشة",

	// /skullboard channel
	skullboard_channel_command_ok:
		"${emoji_Yes} | **تم تحديد قناة Skullboard لتكون: ${channel}**. الآن، عندما يقوم أعضاء السيرفر بالرد على الرسائل بـ '💀' ويتجاوز الحد **`${threshold}`**، يتم إرسال الرسالة إلى ${channel}!",

	// /skullboard config
	skullboard_config_command_ok:
		"${emoji_Yes} | **تم الآن ${action} وحدة Skullboard**",

	// /skullboard threshold
	skullboard_threshold_command_ok:
		"${emoji_Yes} | الآن، عندما يقوم أعضاء السيرفر بالرد على الرسائل بـ '💀' ويتجاوز الحد **`${amount}`**، يتم إرسال الرسالة إلى القناة المحددة!",

	// /skullboard create-thread
	skullboard_create_thread_command_ok:
		"${emoji_Yes} | الآن، عندما يقوم أعضاء السيرفر بالرد على الرسائل بـ '💀' ويتجاوز الحد **`${amount}`**، يتم إرسال الرسالة إلى القناة المحددة **`${action}`**",

	// وحدة التنبيه
	// مؤلف المنبه, إعدادات المنبه

	// /notifier author add
	notifier_author_add_author_doesnt_exist:
		"المؤلف غير موجود. من فضلك تحقق من الـ ID.",

	// /notifier config channel
	notifier_config_channel_logsEmbed_title: "وحدة قناة التنبيه",
	notifier_config_channel_logsEmbed_desc:
		"<@${authorId}> قام بتعيين وحدة قناة التنبيه إلى ${channel}",
	notifier_config_message_command_ok:
		"دلوقتي، لما ستريمر أو يوتيوبر ينشر فيديو، هبعت رسالة في ${channel}",

	// /notifier config message
	notifier_config_message_helpEmbed_title: "رسالة التنبيه المخصصة",
	notifier_config_message_helpEmbed_desc:
		"{artistAuthor} => اسم المستخدم للستريمر أو اليوتيوبر\n{artistLink} => رابط قناة الستريمر أو اليوتيوبر\n{mediaURL} => رابط الفيديو للستريمر أو اليوتيوبر",
	notifier_config_message_embed_fields_notifyMessage: "رسالة التنبيه",
	notifier_config_message_awaiting_response: "اكتب رسالة التنبيه.",
	notifier_config_message_command_work_on_enable:
		"${emoji_GreenTick} | تم تعيين رسالة التنبيه بنجاح.",

	// وحدة المدونة

	blogger_generateBlogsEmbed_embed_desc: "قائمة موجزات RSS المكوّنة:\n\n",
	blogger_generateBlogsEmbed_embed_title: "📰 إعدادات مدونات RSS",
	blogger_generateConfigurationEmbed_embed_title: "📰 إعدادات المدونة",
	blogger_no_rss: "لم يتم تكوين أي موجز RSS.",
	blogger_generateConfigurationEmbed_embed_fields_1_name: "الحالة",
	blogger_generateConfigurationEmbed_embed_fields_2_name: "إجمالي المدونات",
	blogger_unknown_blog: "مدونة غير معروفة",
	blogger_on_new_article_default_message:
		"📰 تم نشر مقال جديد!\n**{articleTitle}** بواسطة {articleAuthor}\n{articleLink}",
	blogger_config_status_enabled:
		"✅ تم **تفعيل** وحدة المدونة. سيتم مراقبة موجزات RSS.",
	blogger_config_status_disabled:
		"❌ تم **تعطيل** وحدة المدونة. لن يتم مراقبة موجزات RSS.",
	blogger_read_article: "اقرأ المقال",
	blogger_blog_add_invalid_channel:
		"نوع القناة غير صالح. يرجى اختيار قناة نصية.",
	blogger_blog_add_success:
		"✅ تم إضافة موجز RSS **${validationName}**! سيتم إرسال الإشعارات إلى ${channel} (المعرف: `${blogId}`)",
	blogger_blog_add_invalid_rss:
		"❌ موجز RSS المقدم غير صالح أو غير قابل للوصول. يرجى التحقق من الرابط والمحاولة مرة أخرى.",
	blogger_blog_remove_success: "✅ تم إزالة موجز RSS بالمعرف `${blogId}`.",
	blogger_blog_remove_not_found: "❌ لم يتم العثور على موجز RSS بهذا المعرف.",
	lastfm_module_not_configured:
		"${emoji_No} | وحدة Last.fm غير مُعدّة على البوت. عيّن `LASTFM_API_KEY` و `LASTFM_SHARED_SECRET` في ملف `.env` الخاص بالبوت.",
	lastfm_config_login_required:
		"${emoji_No} | يجب عليك استخدام `/lastfm login` قبل تفعيل الوحدة.",
	lastfm_config_enabled:
		"${emoji_Yes} | تم الآن تفعيل scrobbling الخاص بـ Last.fm لحسابك.",
	lastfm_config_disabled:
		"${emoji_Yes} | تم الآن تعطيل scrobbling الخاص بـ Last.fm لحسابك.",
	lastfm_login_invalid_session: "${emoji_No} | لم يُرجع Last.fm جلسة صالحة.",
	lastfm_login_success:
		"${emoji_Yes} | تم الآن ربط حساب Last.fm الخاص بك `${username}` وتم تفعيل scrobbling.",
	lastfm_embed_title: "إعداد Last.fm لـ ${userLabel}",
	lastfm_embed_field_status: "الحالة",
	lastfm_embed_field_account: "الحساب المتصل",
	lastfm_embed_field_connected_at: "تاريخ الاتصال",
	lastfm_api_error_login: "${emoji_No} | تعذر الاتصال بـ Last.fm: ${error}",
	lastfm_api_error_nowplaying:
		"${emoji_No} | تعذر إرسال Now Playing إلى Last.fm: ${error}",
	lastfm_api_error_scrobble:
		"${emoji_No} | تعذر scrobble هذه الأغنية: ${error}",
	lastfm_api_error_unknown: "خطأ غير معروف",

	// وحدة AuthRestore
	// دور، إعداد، حذف، الحصول على، الانضمام القسري

	rc_key_doesnt_exist:
		"${emoji_No} وحدة AuthRestore بمفتاح: **${secretCode}** مش موجودة!",
	rc_verify: "تحقق",

	// /authrestore دور
	rc_role_embed_title: "تعديل جديد في AuthRestore",
	rc_role_embed_field1_name: "الدور الجديد المعطى بعد التحقق",

	// /authrestore إعداد
	rc_command_ok:
		'${author}، تم إعداد وحدة "AuthRestore". دلوقتي، لما عضو في السيرفر يضغط على الزر ويسجل الدخول عن طريق OAuth2، هيضاف لقاعدة البيانات. بعدين هيقدر يدخل السيرفر أوتوماتيكياً باستخدام OAuth2.\n# اقرأ بعناية\nالرسالة ${msgLink} دلوقتي فيها زر بيستخدم كتحقق.\nده الكود الخاص اللي لازم تحتفظ بيه. أي شخص معاه الكود ده ممكن يحذف الوحدة أو يضيف أعضاء لسيرفره... احتفظ بيه في مكان آمن. iHorizon مش هيقدمه ليك تاني:\n```${secretCode}```',
	rc_command_ok_dm:
		"# كود AuthRestore للسيرفر ${guildName}\n```${secretCode}```",
	rc_command_dm_failed:
		"حاولت أبعتهولك في رسالة خاصة، بس انت مقفل الرسائل :/",
	rc_command_dm_ok: "لو ما أخدتش بالك، بعتلك الكود في رسالة خاصة!",
	rc_command_horizongw_down: "خطأ: ممكن HorizonGateway تكون مش شغالة",

	// /authrestore حذف
	rc_delete_config_not_found: "إعداد الوحدة في السيرفر ده مش موجود!",
	rc_delete_command_ok:
		'${author}، لقد قمت بحذف إعداد وحدة "AuthRestore". لأسباب أمنية (البيانات)، هحذف الزر فقط، بس بيانات oauth2 والكود السري هيتم حذفهم بعد 48 ساعة!',

	// /authrestore الحصول على
	rc_get_mainEmbed_title: "معلومات عامة عن AuthRestore",
	rc_get_mainEmbed_field1_name: "رقم السيرفر",
	rc_get_mainEmbed_field2_name: "الدور المعطى بعد التحقق",
	rc_get_mainEmbed_field3_name: "تاريخ الإنشاء",
	rc_get_mainEmbed_field3_value: "*التاريخ بصيغة MM/DD/YYYY HH:mm*",
	rc_get_mainEmbed_field4_name: "عدد استخدامات المفتاح",
	rc_get_mainEmbed_field5_name: "مؤلف التهيئة",
	rc_get_secondEmbed_title: "المستخدمين المخزنين",
	rc_get_secondEmbed_footer: "صفحة ${from} / ${to}",
	rc_get_locale: "الإعدادات المحلية",
	rc_get_username: "اسم المستخدم",
	rc_get_unkwnon_user: "مستخدم غير معروف (${authorId})",

	// /authrestore انضمام قسري
	rc_forceJoin_embed_title: "AuthRestore - انضمام قسري",
	rc_forceJoin_embed_desc:
		"## هل أنت متأكد من ضم الأعضاء إلى السيرفر؟\n### اقرأ بعناية:\nإذا أكدت هذا، الكود الحالي سيتم تدميره، وهيتم تزويدك بكود جديد.\n\n\n",
	rc_forceJoin_embed_field1: "الأعضاء الموجودين",
	rc_forceJoin_embed_field2: "الأعضاء الحاليين",
	rc_forceJoin_embed_field3: "الانضمام الممكن",
	rc_forceJoin_embed_2_field1: "الانضمام الممكن",
	rc_forceJoin_embed_2_field2: "المنضمين",
	rc_forceJoin_ws_size: "# جاهزين لإضافة **${value2}** عضو للسيرفر.",
	rc_forceJoin_ws_start: "# عملية الانضمام القسري بدأت...",
	rc_forceJoin_ws_end: "# عملية الانضمام القسري انتهت.",
	rc_forceJoin_ws_end_renew_msg:
		"# اقرأ بعناية\nده الكود الخاص اللي لازم تحتفظ بيه. أي شخص معاه الكود ده ممكن يحذف الوحدة أو يضيف أعضاء لسيرفره... احتفظ بيه في مكان آمن. iHorizon مش هيقدمه ليك تاني:\n```${value2}```",

	// Misc category
	// media manipulation

	// media cooldown
	media_gen_cooldown:
		"يجب أن تنتظر `1 دقيقة و 30 ثانية` بين عمليات إنشاء الوسائط!",
	media_gen_error_args: "يرجى تقديم رابطين صالحين للصور.",

	// ar-EG.yml (Arabic - Egypt)
	batch_ban_process: "🔄 جاري حظر ${memberUsername} في ${guildCount} خادم...",
	batch_unban_process: "🔄 جاري إلغاء حظر ${bannedMemberCount} عضو...",
	batch_unblacklist_process:
		"🔄 جاري إزالة ${bannedMemberUsername} من القائمة السوداء في ${guildObjectCount} خادم...",
	unbanall_undo_command_err:
		"لا يوجد أعضاء لإعادة حظرهم. استخدم أمر إلغاء الحظر للجميع أولاً.",

	// -----------------------------/ \-----------------------------
	// Confession Module Events
	confession_module_modal_title: "أرسل اعترافاً",
	confession_module_modal_components1_label: "ماذا تريد أن تعترف؟",
	confession_module_modal_components1_placeholder: "ممم",
	confession_module_modal_components2_label: "هل هذا خاص؟",

	// أحداث مشغل الموسيقى
	even_mp_playerStart_tip:
		"> ${emoji_LastFM_Logo} هل تعلم أنك تستطيع تتبع موسيقاك باستخدام `/lastfm` على iHorizon ؟ ${emoji_Sunglass}",
	event_mp_audioTrackAdd:
		"${emoji_Player_Queue_Add} - تم إضافة ${trackTitle} إلى قائمة الانتظار!",
	event_mp_playerError: "توجد مشكلة في الاتصال => ${errorMessage}",
	event_mp_error: "حدثت مشكلة في قائمة الأغاني => ${errorMessage}",
	event_mp_emptyChannel:
		"${emoji_No} | لا يوجد أحد في القناة الصوتية، سيتم مغادرة القناة...",
	event_mp_playerSkip: "${emoji_Music_Icon} - تم تخطي **${trackTitle}**!",
	event_mp_emptyQueue:
		"${emoji_Warning_Icon} - توقفت الموسيقى لأنه لا يوجد المزيد من الأغاني في قائمة الانتظار!",

	// أحداث إنشاء القنوات
	event_channel_create_message_embed_title: "تم الإعداد بنجاح!",
	event_channel_create_message_embed_description:
		"تم إعداد البوت بشكل مثالي. لا حاجة لفعل أي شيء (zen) بعد الآن.\n\nسيتم عرض جميع سجلات الإشراف المتعلقة بـ iHorizon هنا",

	// أحداث الترحيب
	event_welcomer_inviter:
		"{memberMention} (تم إنشاء الحساب في {accountCreationTimestamp}) انضم إلى الخادم. تمت دعوته بواسطة **{inviterUsername}** (**{invitesCount}** دعوات)، نحن الآن {memberCount} في {guildName}",
	event_welcomer_default:
		"{memberMention} (تم إنشاء الحساب في {accountCreationTimestamp}) انضم إلى الخادم. نحن الآن {memberCount} في {guildName}",

	// أحداث وداع
	event_goodbye_inviter:
		"`{memberUsername}` (تم إنشاء الحساب في {accountCreationTimestamp}) غادر الخادم. تمت دعوته بواسطة **{inviterUsername}** (**{invitesCount}** دعوات)، نحن الآن {memberCount} في {guildName}",
	event_goodbye_default:
		"`{memberUsername}` (تم إنشاء الحساب في {accountCreationTimestamp}) غادر الخادم. نحن الآن {memberCount} في {guildName}",

	// أحداث مستوى XP
	event_xp_level_earn:
		"**تهانينا**، {memberMention} لقد ارتفعت بمستوى واحد في XP (المستوى: **{xpLevel}**)",
	event_xp_level_additional_info:
		"\n-#  ${emoji_VC_OpenChat} هل تجد هذه الرسالة مزعجة؟ يمكنك تعطيل هذه الرسالة عن طريق تعطيل نظام المستويات باستخدام الأمر `/ranks config`",

	// أحداث وحدة التذاكر
	event_ticket_embed_description:
		"مرحبًا ${userUsername}، مرحبًا بك في تذكرتك! يرجى التحلي بالصبر، وسنكون معك قريبًا. إذا كنت ترغب في إغلاق هذه التذكرة، يرجى تشغيل الأمر `/ticket close`",
	event_ticket_add_member:
		"${author} لقد **أضاف** ${addedMembers} إلى التذكرة ${channel}!",
	event_ticket_del_member:
		"${author} لقد **أزال** ${removedMembers} من التذكرة ${channel}!",
	event_ticket_button_name: "إنشاء تذكرة",
	event_ticket_category_awaiting_response:
		"ما هي الفئة [${emoji}] >> ${name}",
	event_ticket_reason_awaiting_response:
		"${author} هل يجب على المستخدم تقديم سبب قبل إنشاء التذكرة؟",
	event_ticket_create_reason_modal_title: "ما هو سبب تذكرتك",
	event_ticket_create_reason_modal_fields_1_label: "سبب التذكرة",
	event_ticket_reason_embed_desc: "# سبب التذكرة\n```${reason}```",

	// أحداث التفاعل
	iC_event_cooldown: "توقف، يرجى الانتظار قليلاً بين الأوامر!",
	iC_event_connection_error: "خطأ في الاتصال!",

	// التبريد
	Msg_cooldown: "هل يمكنك الانتظار قليلاً قبل تنفيذ الأمر؟",

	// وحدة التذاكر
	ticket_module_button_delete: "حذف التذكرة",
	ticket_module_button_transcript: "نسخة من التذكرة",
	ticket_module_button_addmember: "إضافة عضو",
	ticket_module_button_removemember: "إزالة عضو",
	ticket_module_add_question:
		"من تريد إضافته إلى تذكرتك؟ (حدد معرف المستخدم)!",
	ticket_module_remove_question:
		"من هو المستخدم الذي تريد إزالته من تذكرتك؟ (حدد معرف المستخدم)!",
	ticket_transcript_failed_to_send:
		"لقد حاولت إرسال الملف لك في رسالة خاصة، لكن لقد قمت بحظر الرسائل الخاصة بك :/",

	// سجلات الخادم
	event_srvLogs_banAdd_description: "<@${executorId}> **حظر** <@${targetId}>",
	event_srvLogs_banAdd_fields_name: "السبب",
	event_srvLogs_banAdd_fields_value: "```{reason}```",
	event_srvLogs_banRemove_description:
		"<@${executorId}> **رفع الحظر** عن ${targetUsername}",
	event_srvLogs_guildMemberRemove_description:
		"<@${executorId}> **طرد** <@${targetId}>",
	event_srvLogs_guildMemberUpdate_description:
		"📤 <@${executorId}> أزال الدور ${removedRoles} من ${oldMemberUserUsername}",
	event_srvLogs_guildMemberUpdate_2_description:
		"📥 <@${executorId}> أضاف الدور ${addedRoles} إلى ${oldMemberUserUsername}",
	event_srvLogs_messageDelete_description:
		"**تم حذف الرسالة في <#${messageChannelId}>**\n${messageContent}",
	event_srvLogs_messageUpdate_description:
		"**تم تعديل الرسالة** [في](xxx) **<#${oldMessageChannelId}>**",
	event_srvLogs_messageUpdate_footer_1: "قبل",
	event_srvLogs_messageUpdate_footer_2: "بعد",
	event_srvLogs_voiceStateUpdate_description:
		"📤 <@${targetUserId}> غادر القناة <#${OchannelID}>",
	event_srvLogs_voiceStateUpdate_2_description:
		"📥 <@${targetUserId}> انضم إلى القناة <#${channelID}>",
	event_srvLogs_voiceStateUpdate_3_description:
		"<@${targetUserId}> كتم سماعات الرأس الخاصة به في القناة <#${channelID}>",
	event_srvLogs_voiceStateUpdate_4_description:
		"<@${targetUserId}> ألغى كتم سماعات الرأس الخاصة به في القناة <#${channelID}>",
	event_srvLogs_voiceStateUpdate_5_description:
		"<@${targetUserId}> كتم نفسه في القناة <#${channelID}>",
	event_srvLogs_voiceStateUpdate_6_description:
		"<@${targetUserId}> ألغى كتم نفسه في القناة <#${channelID}>",
	event_srvLogs_channelUpdate_disabled_for:
		"-    ❌ ${perm} تم إلغاء تفعيلها لـ ${target}\n",
	event_srvLogs_channelUpdate_enabled_for:
		"-    ✅ ${perm} تم تفعيلها لـ ${target}\n",
	event_srvLogs_channelUpdate_allowed_for:
		"-    ✅ ${perm} مسموح بها لـ ${target}\n",
	event_srvLogs_channelUpdate_unallowed_for:
		"-    ❌ ${perm} تم رفضها لـ ${target}\n",
	event_srvLogs_channelUpdate_field_name: "🎫 الاسم: ${newChannelName}\n",
	event_srvLogs_channelUpdate_perm_added:
		"🛡 تمت إضافة الأذونات لـ ${target}:\n",
	event_srvLogs_channelUpdate_embed_desc: "تم تحديث ${newChannel}",

	// حدث الترقية
	event_rank_role: "<@${messageAuthorId}>, لديك الآن الدور <@&${id}>",

	// حدث الاقتراح
	event_suggestion_embed_author: "اقتراح جديد من ${messageAuthorUsername}",

	// حدث الأمان
	event_security_title: "مرحبًا بك في ${guild}!",
	event_security: "${member}، يرجى كتابة رمز التحقق الظاهر في هذه الرسالة.",
	event_security_expiry:
		"{emoji} طرد تلقائي ${timestamp} (**${attempts}** محاولة/محاولات متبقية).",
	event_security_footer:
		"لن يستغرق هذا سوى بضع ثوانٍ ويساعد في الحفاظ على أمان مجتمعنا.",
	event_security_kick_reason: "فشل في اجتياز عملية التحقق الأمني",

	// حدث التذكرة
	event_ticket_whenCreated_msg:
		"${author}, تم إنشاء تذكرتك، قم بزيارة <#${channelId}>!",
	event_ticket_logsChannel_onCreation_embed_title:
		"تذكرة السجل - إنشاء اللوحة",
	event_ticket_logsChannel_onCreation_embed_desc:
		"تم إنشاء لوحة التذاكر المسماة `${name}` في ${interaction}!",
	event_ticket_logsChannel_onCreationChannel_embed_title:
		"تذكرة السجل - إنشاء التذكرة",
	event_ticket_logsChannel_onCreationChannel_embed_desc:
		"تم إنشاء التذكرة: ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onClose_embed_title: "تذكرة السجل - إغلاق التذكرة",
	event_ticket_logsChannel_onClose_embed_desc:
		"تم الآن إغلاق التذكرة بواسطة ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onRemoveMember_embed_title:
		"تذكرة السجل - إزالة عضو من التذكرة",
	event_ticket_logsChannel_onRemoveMember_embed_desc:
		"${member} تم إزالته من التذكرة بواسطة ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onAddMember_embed_title:
		"تذكرة السجل - إضافة عضو إلى التذكرة",
	event_ticket_logsChannel_onAddMember_embed_desc:
		"${member} تم إضافته إلى التذكرة بواسطة ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onReopen_embed_title:
		"تذكرة السجل - إعادة فتح التذكرة",
	event_ticket_logsChannel_onReopen_embed_desc:
		"${author} أعاد فتح التذكرة (<#${channelId}>)!",
	event_ticket_logsChannel_onDelete_embed_title: "تذكرة السجل - حذف التذكرة",
	event_ticket_logsChannel_onDelete_embed_desc:
		"${author} قام بحذف التذكرة (#${channelName})!",
	event_ticket_logsChannel_onAddMember2_embed_title:
		"تذكرة السجل - إضافة/إزالة أعضاء من التذكرة",
	event_ticket_logsChannel_onAddMember2_embed_desc:
		"${author}\nتمت إزالة: ${removedMembers}.\nتمت إضافة: ${addedMembers}.\n في التذكرة (${channel})!",
	event_ticket_already_opened:
		"عذرًا، لديك بالفعل تذكرة مفتوحة (<#${channelId}>)! يرجى إغلاقها قبل فتح واحدة جديدة.",

	// حدث السحب
	event_gw_reroll_win_msg: "تهانينا ${winners}! فزت بـ **${prize}**!",
	event_gw_reroll_cannot_win_msg:
		"لا توجد مشاركات صالحة، لذا لم يتم تحديد فائز!",
	event_gw_finnish_msg: "تهانينا ${winners}! فزت بـ **${prize}**!",
	event_gw_finnish_cannot_msg:
		"لا توجد مشاركات صالحة، لذا لم يتم تحديد فائز!",
	event_gw_finnish_button_title: "السحب انتهى",
	event_gw_entries_button_title: "قائمة المشاركين",
	event_gw_removeentries_msg: "${author} لقد انسحبت من هذه السحوبات!",
	event_gw_leave_button_placeholder: "انسحب من السحب",
	event_gw_confirm_leave_msg:
		"${author} هل أنت متأكد من أنك تريد الانسحاب من هذه السحوبات؟",
	event_gw_embed_desc:
		"ينتهي: ${end_string} (${end_string2})\nمستضاف من قبل: <@${hostedBy}>\nالمشاركات: **0**\nالفائزون: **${winners_amount}**",
	event_gw_ended_embed_desc:
		"انتهت: ${time1} (${time2})\nمستضاف من قبل: <@${hostedBy}>\nالمشاركات **${entrieCount}**\nالفائزون: ${winners}",
	event_gw_entries_words: "المشاركات",
	event_gw_ended_word:
		"انتهت: ${ended} (${time2})\nمستضاف من قبل: <@${hostedBy}>\nالمشاركات **${entries}**\nالفائزون: ${winners}",
	event_gw_break_req:
		"${emoji_No} إنت مش متوافق مع الشروط المطلوبة للمشاركة في الهدايا.\nالنوع: `${requirementType}`\nالقيمة: `${requirementValue}`",

	// أحداث تعزيز السرفر
	event_boostlog_add:
		"<@${newMemberUserId}> **قام بتعزيز** الخادم! (**${boostCount}** تعزيزات إجمالية)",
	event_boostlog_sub:
		"<@${newMemberUserId}> **أزال تعزيزهم** من الخادم! (**${boostCount}** تعزيزات إجمالية)",

	// وحدة الاقتصاد
	economy_disable_msg:
		"<@${authorId}>, وحدة `الاقتصاد` في هذا الخادم **معطلة**. لا يمكنك استخدام وحدة الاقتصاد بعد الآن!",

	// Permission Event
	event_permission_wrong:
		"${author}, مش مسموحلك تستخدم الأمر ده! محتاج صلاحية: ${neededPerm}",

	// وحدة الصوت المؤقت
	temporary_voice_title_embec: "## التعديلات على قناتك الصوتية المؤقتة",
	temporary_voice_unblocked_member: "الأعضاء غير المحظورين",
	temporary_voice_blocked_mmeber: "الأعضاء المحظورين",
	temporary_voice_no_one: "لا أحد",
	temporary_voice_new_member: "المالك الجديد",
	temporary_voice_old_member: "المالك القديم",
	temporary_voice_modal_title: "لوحة تحكم الصوت في iHorizon",
	temporary_voice_new_userlimit: "الحد الأقصى الجديد للمستخدمين",
	temporary_voice_new_name: "الاسم الجديد",
	temporary_voice_new_region: "المنطقة الجديدة",
	temporary_voice_untrusted_member: "الأعضاء غير الموثوقين",
	temporary_voice_trusted_member: "الأعضاء الموثوقين",

	// أزرار
	temporary_voice_block_button_menu_placeholder:
		"سيتم رفض هؤلاء المستخدمين للانضمام",

	temporary_voice_delete_button_desc_embed:
		"## حذف القناة\nتم حذف القناة بنجاح!",

	temporary_voice_limit_button_menu_label: "ما هو حد المستخدمين للقناة؟",
	temporary_voice_limit_button_not_integer: "${emoji_No} | الإدخال ليس عددًا",

	temporary_voice_name_button_menu_label: "ما هو اسم القناة؟",

	temporary_voice_privacy_menu_placeholder: "اختر خيار الخصوصية",
	temporary_voice_privacy_menu_lock_label: "قفل القناة",
	temporary_voice_privacy_menu_lock_desc:
		"فقط الأعضاء الموثوقين يمكنهم الانضمام إلى قناتك الصوتية",
	temporary_voice_privacy_menu_unlock_label: "فتح القناة",
	temporary_voice_privacy_menu_unlock_desc:
		"يمكن للجميع الانضمام إلى قناتك الصوتية",
	temporary_voice_privacy_menu_invisible_label: "غير مرئي",
	temporary_voice_privacy_menu_invisible_desc:
		"فقط الأعضاء الموثوقين يمكنهم عرض قناتك الصوتية",
	temporary_voice_privacy_menu_visible_label: "مرئي",
	temporary_voice_privacy_menu_visible_desc: "يمكن للجميع عرض قناتك الصوتية",
	temporary_voice_privacy_menu_closechat_label: "إغلاق الدردشة",
	temporary_voice_privacy_menu_closechat_desc:
		"فقط الأعضاء الموثوقين يمكنهم إرسال الرسائل في الدردشة الخاصة بك",
	temporary_voice_privacy_menu_openchat_label: "فتح الدردشة",
	temporary_voice_privacy_menu_openchat_desc:
		"يمكن للجميع إرسال الرسائل في الدردشة الخاصة بك",

	temporary_voice_region_menu_placeholder: "اختر منطقة",

	temporary_voice_transfer_menu_placeholder:
		"المستخدم المحدد لنقل القناة الصوتية",

	temporary_voice_transfer_trust_placeholder:
		"المستخدمون المحددون سيصبحون موثوقين للانضمام",

	temporary_voice_transfer_unblocked_placeholder:
		"المستخدمون المحددون سيتم إلغاء حظرهم للانضمام",

	temporary_voice_transfer_untrust_placeholder:
		"المستخدمون المحددون سيتم رفضهم للانضمام",

	temporary_voice_channel_name: "قناة {nickname}",

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
	tempvoice_cfg_remove_hub: "إزالة قناة الإنشاء",
	tempvoice_cfg_saved: "TempVoice settings saved!",
	tempvoice_cfg_expired: "Configuration panel expired. Run /tempvoice again.",
	tempvoice_cfg_modal_title: "Set the channel name",
	tempvoice_cfg_modal_label: "Name | Variable: {Username}",
	// وحدة الحماية
	// رسالة الحدث

	protection_avoid_channel_delete:
		"**وضع الحماية مفعل**\n<@${channelGuildOwnerId}>, تم إعادة إنشاء القناة، <@${executorId}> حاول حذف القناة!",
	protection_blockbot_embed_title: "⚠️ خطر في ${memberGuildName} ⚠️",
	protection_blockbot_embed_desc:
		"# تحذير إضافة بوت\nشخص ما حاول إضافة بوت ديسكورد.",
	var_target_bot: "البوت المستهدف",
	var_not_detected: "غير مكتشف",

	// وحدة مكافحة الرسائل المزعجة
	// رسالة التحذير الأساسية
	antispam_base_warn_message:
		"تحذير ${mentionedMembers}, أنت تقوم بالرسائل المزعجة وقد تتعرض للعقوبة.",

	// رسائل التحذير الإضافية بناءً على نوع العقوبة
	antispam_more_ban_msg: "إذا استمررت، سيتم حظرك من الخادم.",
	antispam_more_mute_msg: "إذا استمررت، سيتم كتمك.",
	antispam_more_kick_msg: "إذا استمررت، سيتم طردك من الخادم.",

	// سجلات مضاد الرسائل المزعجة
	antispam_log_embed_title: "[مضاد الرسائل المزعجة] جديد ${actionType}",
	antispam_log_embed_desc: "${bot} قد **${actionType}** ${user}",

	// الأوامر الهجينة
	// رسالة الحدث

	hybridcommands_global_prefix_mention: "`@Ping-Me`",
	hybridcommands_global_prefix_cleaned_mention: "@Ping-Me ",
	hybridcommands_args_error_embed_desc:
		'```ts\nاسم الأمر: ${currentCommandName}\n```\n```cs\n${botPrefix}${fullNameCommand} ${argsString}\n${errorPosition}\nحدث خطأ عند إرسال الوسيطة "${wrongArgumentName}".\n```',
	hybridcommands_embed_help_title: "دليل ${commandName}",
	hybridcommands_embed_help_fields_value:
		"**الألقاب:** ${aliases}\n**الاستخدام:** ${use}",
	hybridcommands_embed_footer_text:
		"الخيارات داخل [...] مطلوبة، بينما الخيارات داخل <...> اختيارية.\nاستخدم الأمر: ${botPrefix}help [command] لمزيد من المعلومات.",

	ping_bot_show_info_msg:
		"مرحبًا ${messageAuthor}, أنا 100% في `أوامر التفاعل` (${emoji_Slash_Bot_Badge}) وقابل للاستخدام بنسبة 85% عبر الأوامر البادئة. بادئتي على **هذا الخادم** هي `${prefix}`!",
	ping_bot_show_info_msg_about_change_prefix:
		"\n-# ${emoji_VC_OpenChat} مش عاجبك البريفكس؟ استخدم **`/guildconfig bot prefix`** لتغييره!",

	// وحدة التنبيه
	notifier_on_new_media_default_message:
		"@everyone **[{artistAuthor}](<{artistLink}>)** نشر فيديو جديد **[اضغط هنا]({mediaURL})",
	notifier_on_new_media_default_button_label: "اتفرج!",
	notifier_generateAuthorsEmbed_embed_desc:
		"هذه قائمة بكل الستريمر/اليوتيوبر:\n",
	notifier_generateAuthorsEmbed_embed_title:
		"جميع الستريمر/اليوتيوبر في الخادم",
	notifier_generateConfigurationEmbed_embed_title: "إعدادات وحدة التنبيه",
	notifier_generateConfigurationEmbed_embed_fields_1_name: "قناة التنبيه",
	notifier_generateConfigurationEmbed_embed_fields_2_name: "رسالة التنبيه",

	// ButtonReaction
	buttonreaction_role_doesnt_exit:
		"الدور في قاعدة بياناتي لم يعد موجودًا في الخادم!",
	buttonreaction_role_too_high:
		"الدور مرتفع جدًا، لا أستطيع إعطاء/إزالة الدور. تحتاج إلى تغيير أذوناتي!",
	buttonreaction_role_add: "لديك الآن دور ${role} :tada:",
	buttonreaction_role_remove: "لم تعد لديك دور ${role} ✅",
	rolepanel_setup_embed_title: "إعداد لوحة الأدوار",
	rolepanel_setup_embed_desc:
		"حدد الأدوار لإضافتها أو إزالتها من ${member}. إذا كان ${member} يملك دورًا محددًا بالفعل، فسيتم إزالته. سيتم تجاهل الأدوار غير المسموح بها.",
	rolepanel_setup_embed_roles_field: "الأدوار المسموح بها",
	rolepanel_setup_embed_refused_field: "الأدوار المرفوضة",
	rolepanel_setup_select_placeholder: "حدد الأدوار المعروضة",
	rolepanel_setup_apply_button: "إنشاء اللوحة",
	rolepanel_setup_no_roles: "لم يتم تحديد أي دور صالح.",
	rolepanel_setup_saved: "تم إرسال لوحة الأدوار.",
	rolepanel_panel_embed_title: "لوحة الأدوار",
	rolepanel_panel_embed_desc: "اختر الأدوار لإضافتها أو إزالتها من ملفك.",
	rolepanel_panel_select_placeholder: "اختر أدوارك",
	rolepanel_role_managed_or_everyone: "دور نظام أو @everyone",
	rolepanel_role_too_high_bot: "دور أعلى من البوت",
	rolepanel_role_too_high_user: "دور أعلى منك",
	rolepanel_role_missing_permissions: "الأذونات الناقصة: ${permissions}",
	rolepanel_logs_embed_title_create: "سجلات لوحة الأدوار",
	rolepanel_logs_embed_desc_create:
		"<@${authorId}> أنشأ لوحة أدوار (${messageId}) مع: ${roles}",
	rolepanel_logs_embed_title_apply: "سجلات استخدام لوحة الأدوار",
	rolepanel_logs_embed_desc_apply:
		"<@${authorId}> عدّل أدوار <@${memberId}> عبر لوحة. تمت الإضافة: ${addedRoles} | تمت الإزالة: ${removedRoles}",

	// AuthRestore HTML
	rc_created_by: "تم الإنشاء بواسطة:",
	rc_created_on: "تاريخ الإنشاء:",
	rc_total_membres: "إجمالي الأعضاء",
	rc_total_verification: "إجمالي عمليات التحقق",
	rc_total_key_used_count: "عدد مرات استخدام المفتاح",
	rc_recent_locales_distribution: "توزيع مواقع الأعضاء",
	rc_recent_verifications: "عمليات التحقق الأخيرة",
	rc_registration_over_time: "التسجيلات عبر الزمن",

	// وحدة الصور فقط
	piconly_module_punish_msg:
		"${messageAuthor}, تم إيقافك مؤقتًا لمدة 10 دقائق لإرسال الكثير من الرسائل بدون صور في قناة مخصصة للصور.",
	piconly_module_warn_msg:
		"${messageAuthor}, هذه القناة تقبل فقط الرسائل التي تحتوي على صور (التنسيقات المقبولة: JPG, PNG, GIF, WEBP, BMP, TIFF). تحذير ${userWarningCount}/${threshold}",
	piconly_module_timeout_reason:
		"إرسال رسائل متكررة بدون صور في قناة مخصصة للصور فقط",

	// Nick Module
	event_nick_kicker_kick_reason: "كلمة محظورة في اسم المستخدم - طارد الألقاب",
	event_nick_kicker_kick_msg:
		"في السيرفر `${memberGuildName}`، يحتوي اسم المستخدم الخاص بك على كلمة محظورة. تم طردك من السيرفر.",

	// وحدة الصور الشخصية
	pfps_embed_user_title: "صورة ${username} **الشخصية**",
	pfps_embed_guild_title: "صورة ${username} **للسيرفر**",
	pfps_download_user_button: "تحميل الصورة الشخصية",
	pfps_download_guild_button: "تحميل صورة السيرفر",
	// -----------------------------\ /-----------------------------

	// AddRoleReact Command
	addrolereact_role_not_found: "Rôle introuvable.",
	addrolereact_cannot_check_permissions:
		"Impossible de vérifier vos permissions.",
	addrolereact_role_too_high:
		"Vous ne pouvez pas ajouter un rôle supérieur ou égal à votre plus haut rôle.",
	addrolereact_must_be_text_channel:
		"Cette commande doit être exécutée dans un canal texte.",
	addrolereact_message_not_found: "Message introuvable.",
	addrolereact_no_reactions: "Ce message n'a pas de réactions.",
	addrolereact_adding_role: "Ajout du rôle {role} en cours...",
	addrolereact_adding_role_progress:
		"Ajout du rôle {role} en cours pour {count} utilisateurs...",
	addrolereact_role_added:
		"Ajout du rôle {role} terminé. {count} utilisateurs ont reçu le rôle.",
	addrolereact_error: "Erreur lors de l'exécution de la commande.",

	// أوامر إخفاء/إظهار القنوات
	channel_hide_in_progress: "...جاري إخفاء القناة الحالية",
	channel_hide_success: "تم إخفاء القناة عن @everyone",
	channel_hide_already_hidden: "هذه القناة مخفية بالفعل عن @everyone",
	channel_unhide_in_progress: "...جاري إظهار القناة الحالية",
	channel_unhide_success: "القناة مرئية الآن لـ @everyone",
	channel_unhide_already_visible: "هذه القناة مرئية بالفعل لـ @everyone",
	channel_hideall_in_progress: "...جاري إخفاء جميع القنوات",
	channel_hideall_success:
		"!**تم الإخفاء**\n:**الإحصائيات**\n• **{hiddenCount}** قناة تم إخفاؤها\n• **{errorCount}** أخطاء واجهتها",
	channel_hideall_error: ".حدث خطأ أثناء إخفاء القنوات",
	channel_unhideall_in_progress: "...جاري إظهار جميع القنوات",
	channel_unhideall_success:
		"!**تم الإظهار**\n:**الإحصائيات**\n• **{unhiddenCount}** قناة تم إظهارها\n• **{errorCount}** أخطاء واجهتها",
	channel_unhideall_error: ".حدث خطأ أثناء إظهار القنوات",

	// ar-EG.yml (Arabic - Egypt)
	new_guild_embed_title: [
		"!أهلاً وسهلاً بكم في خادمكم 🎉",
		"!تحياتي، يا رفاق ديسكورد 👋",
		"!iHorizon انضم إلى المحادثة 💬",
		"!إنه طائر، إنه طائرة، لا، إنه iHorizon 🦸‍♂",
		"!دعونا نرحب ترحيباً حاراً بـ iHorizon 🔥",
		"!مرحباً بالمغامرة الجديدة 🚀",
		"!عضو جديد رائع انضم إلينا ✨"
	],
	new_guild_embed_desc:
		"## ${randomMessage}\n!مرحباً بكم، أصدقائي الأعزاء\n\n.أنا iHorizon، بوت متطور مصمم لجعل تجربتكم على ديسكورد استثنائية ومليئة بالمرح\n\n:✨ ما يمكنني فعله لكم\n• إدارة الخادم بذكاء واحترافية\n• ألعاب تفاعلية وترفيه لا محدود\n• أدوات مفيدة لتنظيم المجتمع\n• دعم فني متاح على مدار الساعة\n\n.استكشفوا أوامري واكتشفوا عالماً من الإمكانيات اللامحدودة\n!معاً سنبني مجتمعاً رائعاً ومليئاً بالذكريات الجميلة\n\n!شكراً لاختياركم لي، فلنبدأ المغامرة 🌟",
	new_guild_owner_dm_title: "أهلاً بك في عائلة iHorizon!",
	new_guild_owner_dm_description:
		"# شكراً لإضافة iHorizon إلى خادمك!\n\n> *انتظر... هل هذا كل شيء؟ لا، بالتأكيد لا.*\n\niHorizon هو بوت Discord، حسناً؟ لكن ليس هذا فقط. إنه أيضاً مجتمع، قصة، مشروع بُني على مدى أكثر من 6 سنوات (2020).\nاستخدام iHorizon ليس مجرد الحصول على بوت Discord كامل، مجاني إلى الأبد **ومفتوح المصدر**. إنه أيضاً تبني **مفهوم**.\n\n> **بوت Discord المجاني يمكنه القيام بعمل أفضل من البوتات المدفوعة.**\n*نعم، هذا هو iHorizon: بوت كامل، تمت صيانته لمدة 6 سنوات من قبل أشخاص شغوفين.*\n\nإذاً نعم... بعد هذه الرسالة، شكراً.\nنحن فيلق. #ihorizon",
	guild_create_btn_invite: "دعوة iHorizon",
	guild_create_btn_website: "موقع iHorizon",
	guild_create_btn_search: "بحث iHorizon",
	guild_create_btn_repos: "مستودعات iHorizon",
	guild_create_btn_support: "خادم الدعم",
	guild_create_btn_docs: "مستندات iHorizon",
	bot_server_bio:
		"{wink_emoji} **iHorizon Discord Bot** **`+{count} أمر`**\n> *« صُنع بواسطة أشخاص منذ عام 2022، من أجل مجتمعك. »*\n**https://www.ihorizon.org**",
	guild_leave_data_clear_notice_title: "غادر iHorizon ${guildName}",
	guild_leave_data_clear_notice_description:
		"واااه، هذا محزن. لقد طردت البوت من `${guildName}`. سيتم حذف بيانات الخادم ${deleteAt} إذا لم يعد iHorizon قبل ذلك.",
	guild_leave_data_clear_notice_message:
		"واااه، هذا محزن. لقد طردت iHorizon من `${guildName}`. سيتم حذف البيانات ${deleteAt}.",
	guild_leave_data_clear_cancelled_title: "عاد iHorizon إلى ${guildName}",
	guild_leave_data_clear_cancelled_description:
		"ياااي، شكرًا لإعادة إضافة iHorizon إلى `${guildName}`. تم إلغاء حذف البيانات المجدول.",
	guild_leave_data_clear_cancelled_message:
		"ياااي، شكرًا لإعادة إضافة iHorizon إلى `${guildName}`. بيانات خادمك آمنة.",

	// Confession Event
	confession_embed_logs_title: "اعتراف جديد",
	confession_channel_button_name: "الرد بشكل مجهول",
	confession_1_embed_log_title: "رد جديد على الاعتراف",

	// Context Menu Interaction
	global_unknown_message: "الرسالة غير موجودة.",
	global_error: "❌ خطأ",
	global_not_atc: "الرسالة المحددة لا تحتوي على مرفق.",
	global_not_valid_atc: "المرفق المحدد ليس ملفًا صوتيًا صالحًا.",
	global_too_heavy_file:
		"ملف MP4 المُولّد كبير جدًا (${fileSize} MB). حدّ Discord هو 25 MB.",
	global_convert_ok: "✅ تم التحويل بنجاح",
	global_convert_ok_desc: "تم تحويل ملفك الصوتي إلى MP4 (${fileSize} MB).",

	// Economy logs titles
	economy_logs_add_money_title: "سجلات الاقتصاد - إضافة أموال",
	economy_logs_remove_money_title: "سجلات الاقتصاد - إزالة أموال",
	economy_logs_boost_role_title: "سجلات الاقتصاد - تعزيز رتبة",
	economy_logs_config_title: "سجلات الاقتصاد - إعدادات الوحدة",
	economy_logs_role_add_title: "سجلات الاقتصاد - إضافة رتبة إلى المتجر",
	economy_logs_role_remove_title: "سجلات الاقتصاد - إزالة رتبة من المتجر",
	economy_logs_pay_title: "سجلات الاقتصاد - دفع",
	economy_logs_rob_title: "سجلات الاقتصاد - سرقة",
	economy_logs_set_cooldown_title: "سجلات الاقتصاد - تعيين وقت الانتظار",
	economy_logs_set_money_title: "سجلات الاقتصاد - تعيين المال",
	economy_logs_withdraw_title: "سجلات الاقتصاد - سحب",
	economy_logs_deposit_title: "سجلات الاقتصاد - إيداع",

	// Economy logs descriptions
	economy_logs_add_money_desc:
		"{author} أضاف إلى {target} `{amount}$` {coin}",
	economy_logs_remove_money_desc:
		"{author} أزال من {target} `{amount}$` {coin}",
	economy_logs_boost_role_desc:
		"{author} قام بتعيين التعزيز لرتبة {role}. التعزيز الآن: `x{amount}`",
	economy_logs_config_desc: "{author} قام {state} وحدة الاقتصاد",
	economy_logs_role_add_desc:
		"{author} أضاف رتبة {role} إلى المتجر. السعر: `{amount}$`",
	economy_logs_role_remove_desc: "{author} أزال رتبة {role} من المتجر.",
	economy_logs_pay_desc: "{author} أرسل `{amount}$` إلى {target}",
	economy_logs_rob_desc: "{author} سرق `{amount}$` من {target}",
	economy_logs_set_cooldown_desc:
		"{author} عيّن وقت الانتظار لـ `{type}` إلى **{time}**",
	economy_logs_set_money_desc:
		"{author} عيّن المال لـ `{type}` إلى **{money}**",
	economy_logs_withdraw_desc: "{author} سحب من البنك **${money}**",
	economy_logs_deposit_desc: "{author} أودع **${money}** في البنك",

	// Generic vars
	var_on: "مفعل",
	var_off: "معطل",
	global_command_cooldown_msg:
		"${emoji} يجب عليك الانتظار **${time}** بين كل استخدام لـ **`${ctxCommandPath}`**",

	global_warn_embed_title: "تم تحذيرك - القضية **`${id}`**",
	global_warn_embed_desc:
		"> **السبب:** ${reason}\n> **المسؤول:** @${authorUsername} (*${authorRolesHighestName}*)\nتم إنشاء التحذير ${time}",
	global_warn_component_button_label: "مرسل من ${authorGuildName}",

	counter_error_too_much_u:
		"<@${messageAuthorId}> أَخْطَأَ عند **${number}**!! الرقم التالي هو **1**. **لا يمكنك العد مرتين على التوالي.**",
	counter_error_syntaxic:
		"<@${messageAuthorId}> أَخْطَأَ!! الرقم التالي هو **1**. ",

	global_blacklist_msg_to_send:
		"تم حظرك تلقائيًا من هذا السيرفر لأن حسابك مدرج في القائمة السوداء العالمية الخاصة بـ iHorizon.\n\nالسبب: `${reason}`\n\nوفقًا للبند 3 من شروط الخدمة الخاصة بنا، فإن السيرفرات التي تستخدم iHorizon توافق على أن يقوم البوت بتطبيق العقوبات المرتبطة بهذه القائمة السوداء العالمية تلقائيًا.\n\nإذا كنت تعتقد أن هذا خطأ أو ترغب في الاستئناف على هذا القرار، يمكنك القيام بذلك هنا:\nAppeal: <https://www.ihorizon.org/appeal>\n\nشروط الخدمة: <https://www.ihorizon.org/tos>",
	global_blacklist_reason:
		"عقوبة مشروع iHorizon - القائمة السوداء | السبب: ${reason}",
	server_blacklist_msg_to_send:
		"تم حظرك لأنك مدرج في القائمة السوداء لهذا الخادم.\nالسبب: `${data2Reason}`",
	server_blacklist_reason: "القائمة السوداء | السبب: ${data2Reason}",
	help_sticky_fields: "Sticky",
	help_sticky_dsc:
		"> *أبقِ رسالة مهمة مرئية دائمًا في قنواتك عبر إعادة نشر تلقائية.*",
	sticky_channel_command_error:
		"${emoji_No} | ${author}، لم أتمكن من العثور على قناة نصية صالحة.",
	sticky_text_command_missing_message:
		"${emoji_No} | ${author}، يجب عليك تقديم رسالة sticky.",
	sticky_text_command_work:
		"${emoji_Yes} | ${author}، أصبحت رسالة sticky النصية مفعلة الآن في ${channel}.",
	sticky_embed_command_embed_not_found:
		"${emoji_No} | ${author}، لم أتمكن من العثور على الـ embed `${embed_id}`.",
	sticky_embed_command_work:
		"${emoji_Yes} | ${author}، أصبح الـ embed sticky `${embed_id}` مفعلاً الآن في ${channel}.",
	sticky_disable_command_not_found:
		"${emoji_No} | ${author}، لا توجد رسالة sticky مُعدّة في ${channel}.",
	sticky_disable_command_work:
		"${emoji_Yes} | ${author}، تم تعطيل رسالة sticky في ${channel}.",
	sticky_refresh_command_not_found:
		"${emoji_No} | ${author}، لا توجد رسالة sticky مُعدّة في ${channel}.",
	sticky_refresh_command_missing_embed:
		"${emoji_No} | ${author}، تشير رسالة sticky في ${channel} إلى embed لم يعد موجودًا.",
	sticky_refresh_command_missing_permissions:
		"${emoji_No} | ${author}، لا يمكنني إعادة نشر رسالة sticky في ${channel}. تحقّق من صلاحياتي.",
	sticky_refresh_command_work:
		"${emoji_Yes} | ${author}، تمت إعادة نشر رسالة sticky في ${channel}.",
	sticky_show_command_not_found:
		"${emoji_No} | ${author}، لا توجد رسالة sticky مُعدّة في ${channel}.",
	sticky_show_embed_title: "إعداد رسالة sticky",
	sticky_show_embed_fields_channel: "القناة",
	sticky_show_embed_fields_type: "النوع",
	sticky_show_embed_fields_status: "الحالة",
	sticky_show_embed_fields_message: "الرسالة",
	sticky_show_embed_fields_embed: "معرّف الـ embed",
	sticky_show_embed_fields_last_message: "معرّف آخر رسالة sticky",
	sticky_list_embed_title: "قنوات sticky",
	sticky_list_embed_desc_empty:
		"لا توجد أي قناة sticky مُعدّة على هذا الخادم.",
	sticky_list_embed_desc_line_text: "${channel} - Sticky نصي",
	sticky_list_embed_desc_line_embed:
		"${channel} - Sticky embed (`${embed_id}`)",
	sticky_list_embed_desc_line_text_embed:
		"${channel} - Sticky نص + embed (`${embed_id}`)",
	sticky_var_text: "نص",
	sticky_var_embed: "Embed",
	sticky_var_text_embed: "نص + embed",
	sticky_var_enabled: "مفعّل",
	sticky_var_disabled: "معطّل",
	sticky_var_none: "لا يوجد",

	// /honeypot config
	honeypot_config_not_allowed:
		"يجب أن تكون مسؤولاً أو موجوداً في allowlist لكي تقوم بإعداد Honeypot.",
	honeypot_config_embed_title: "إعداد Honeypot",
	honeypot_config_embed_desc:
		"قم بإعداد قناة الفخ، وقناة السجلات، والإجراء التلقائي المستخدم عندما يرسل أحدهم رسالة في قناة *Honeypot*.",
	honeypot_config_embed_field_status: "الحالة",
	honeypot_config_embed_field_trap_channel: "قناة الفخ",
	honeypot_config_embed_field_logs_channel: "قناة السجلات",
	honeypot_config_embed_field_action: "الإجراء",
	honeypot_config_embed_field_message: "الرسالة المرسلة",
	honeypot_config_embed_field_notes: "ملاحظات",
	honeypot_config_embed_field_credit: "الاعتمادات",
	honeypot_config_notes_value:
		"- **ضع رتبة iHorizon فوق جميع رتب الأعضاء.**\n- **قنوات Honeypot التي يتم إنشاؤها تلقائياً يتم نقلها إلى أعلى الخادم.**\n- **يمكنك تغيير اسم قناة Honeypot بدون كسر النظام.**",
	honeypot_config_credit_value: "*مستوحى من Honeypot بواسطة RiskyMH*\n${url}",
	honeypot_config_select_trap_placeholder: "اختر قناة الفخ",
	honeypot_config_select_logs_placeholder: "اختر قناة السجلات",
	honeypot_config_select_action_placeholder: "اختر الإجراء الذي سيتم تطبيقه",
	honeypot_config_button_send: "إرسال الـ embed",
	honeypot_config_button_preview: "معاينة",
	honeypot_config_button_enable: "تفعيل Honeypot",
	honeypot_config_button_disable: "تعطيل Honeypot",
	honeypot_config_send_success:
		"تم إرسال embed الخاص بـ Honeypot في ${channel}.",
	honeypot_config_enable_success: "تم تفعيل Honeypot الآن في ${channel}.",
	honeypot_config_disable_success: "تم تعطيل Honeypot الآن.",
	honeypot_config_missing_logs_channel:
		"يجب عليك إعداد قناة سجلات قبل تفعيل Honeypot.",
	honeypot_config_generic_error: "حدث خطأ أثناء تحديث Honeypot.",
	honeypot_config_select_action_kick: "طرد المستخدمين",
	honeypot_config_select_action_ban: "حظر المستخدمين",
	honeypot_config_select_action_none: "حذف الرسائل فقط",
	honeypot_config_select_action_del_messages: "حذف الرسائل",
	honeypot_default_channel_name: "🍯・general-chat",
	honeypot_action_none: "حذف الرسائل فقط",
	honeypot_action_failed: "فشل الإجراء",
	honeypot_dm_action_kicked: "لقد تم طردك!",
	honeypot_dm_action_banned: "لقد تم حظرك!",
	honeypot_dm_action_none: "تم حذف رسائلك",
	honeypot_trap_embed_title: "لا ترسل رسائل في هذه القناة",
	honeypot_trap_embed_desc:
		"*يتم استخدام هذه القناة للقبض على بوتات السبام.*\n*أي رسالة يتم إرسالها هنا سوف **تفعل** حماية الخادم التلقائية.*",
	honeypot_trap_embed_footer:
		"مستوحى من Honeypot لـ RiskyMH، تحقق منه!\n${url}",
	honeypot_dm_title: "تم تفعيل Honeypot!",
	honeypot_dm_desc:
		"رسالة أرسلتها في قناة *Honeypot* على الخادم التالي: **`${guild}`** **أدت** إلى تفعيل الحماية المُعدّة.\n\n__الإجراء المتخذ ضدك:__ **`${action}`**\n\n*الرسائل التي أرسلتها خلال الساعتين الماضيتين يتم حذفها من الخادم. إذا كنت تعتقد أنك قد تم اختراقك، غيّر كلمة المرور الخاصة بك وقم بتفعيل 2FA على حساب Discord الخاص بك. إذا كان هذا خطأ من جانبك، يرجى الاتصال بفريق الخادم لحل المشكلة.*",
	honeypot_log_title: "تفعيل Honeypot - ${action}",
	honeypot_log_field_author: "الكاتب",
	honeypot_log_field_channel: "القناة",
	honeypot_log_field_message: "الرسالة المحذوفة",
	honeypot_log_field_attachments: "المرفقات",
	honeypot_log_field_stickers: "الملصقات",
	honeypot_log_field_embeds: "Embeds",
	honeypot_log_field_deleted_messages: "الرسائل المحذوفة",
	honeypot_log_field_triggered_messages: "الرسائل التي فعّلت المصيدة",
	honeypot_log_field_dm_status: "حالة الرسالة الخاصة",
	honeypot_log_field_result: "النتيجة",
	honeypot_log_dm_open: "تم التسليم",
	honeypot_log_dm_closed: "مغلقة أو غير قابلة للوصول",
	honeypot_log_no_content: "لا يوجد محتوى نصي",
	honeypot_log_action_ban: "تم حظر المستخدم",
	honeypot_log_action_kick: "تم طرد المستخدم",
	honeypot_log_action_none: "لم يتم اتخاذ أي إجراء",

	// وحدة TTS
	// /tts join, /tts leave, /tts info, /tts lang

	help_tts_fields: "TTS",
	help_tts_dsc: "> *حول النص إلى كلام في القنوات الصوتية مع iHorizon!*",

	// /tts join
	tts_join_not_in_voice:
		"${emoji_No} يجب أن تكون متصلاً بقناة صوتية لاستخدام هذا الأمر!",
	tts_join_already_enabled:
		"${emoji_No} وحدة TTS مفعلة بالفعل على هذا الخادم!",
	tts_join_music_playing:
		"${emoji_No} يتم تشغيل الموسيقى حالياً على هذا الخادم. يرجى إيقاف الموسيقى قبل تفعيل TTS.",
	tts_join_enabled: "${emoji_Yes} تم تفعيل وضع TTS في ${voiceChannel}!",
	tts_join_error: "${emoji_No} حدث خطأ أثناء تفعيل وضع TTS.",
	tts_join_lang_fallback: "ar-EG",

	// /tts leave
	tts_leave_not_active:
		"${emoji_No} وحدة TTS غير نشطة حالياً على هذا الخادم!",
	tts_leave_not_in_voice:
		"${emoji_No} يجب أن تكون في القناة الصوتية TTS لتعطيلها!",
	tts_leave_disabled: "${emoji_Yes} تم تعطيل وضع TTS على هذا الخادم!",

	// /tts info
	tts_info_embed_title: "معلومات وحدة TTS",
	tts_info_embed_description:
		"تتيح وحدة TTS (تحويل النص إلى كلام) لـ iHorizon قراءة الرسائل بصوت عالٍ في قناة صوتية. عند التفعيل، سيتم نطق كل رسالة مرسلة في القناة النصية المكونة من قبل الأعضاء الموجودين في القناة الصوتية بواسطة iHorizon.",
	tts_info_field_status: "الحالة",
	tts_info_field_lang: "لغة TTS",
	tts_info_field_howto: "كيفية الاستخدام",
	tts_info_howto_value:
		"استخدم `/tts join` لبدء TTS في قناتك الصوتية.\nاستخدم `/tts leave` لإيقاف TTS.\nاستخدم `/tts lang` لتغيير لغة الصوت.",

	// /tts lang
	tts_lang_not_active: "${emoji_No} وحدة TTS غير نشطة حالياً على هذا الخادم!",
	tts_lang_set: "${emoji_Yes} تم تعيين لغة TTS إلى `${language}`.",

	// TTS Embed
	tts_embed_title: "تم تفعيل وضع TTS",
	tts_embed_description:
		"وحدة TTS نشطة الآن في ${voiceChannel}.\nسيتم قراءة جميع الرسائل المرسلة هنا من قبل الأعضاء في القناة الصوتية بصوت عالٍ.\n\n**الأعضاء في الصوت:** ${members}",
	tts_embed_footer: "استخدم /tts leave لإيقاف TTS",
	tts_join_not_text_based:
		"${emoji_No} هذه القناة الصوتية لا تدعم الرسائل النصية. يرجى تفعيل النص في الصوت أو استخدام قناة صوتية أخرى.",
	tts_music_blocked:
		"${emoji_No} وحدة TTS نشطة حالياً. يرجى تعطيل TTS قبل تشغيل الموسيقى.",
	tts_voice_status: "وضع TTS - تحويل النص إلى كلام",

	// H24/7 module
	// /h247 join, /h247 leave

	help_h247_fields: "H24/7",
	help_h247_dsc: "> *اجعل iHorizon متصلاً في غرفة صوتية على مدار الساعة!*",

	// /h247 join
	h247_join_invalid_channel: "${emoji_No} يرجى تحديد غرفة صوتية صحيحة!",
	h247_join_already_active:
		"${emoji_No} وحدة H24/7 مفعلة بالفعل في ${voiceChannel}!",
	h247_join_music_playing:
		"${emoji_No} يتم تشغيل الموسيقى حالياً على هذا السيرفر. يرجى إيقاف الموسيقى قبل تفعيل وحدة H24/7.",
	h247_join_tts_active:
		"${emoji_No} وحدة TTS مفعلة حالياً في غرفة صوتية أخرى. يرجى تعطيل TTS قبل تفعيل وحدة H24/7.",
	h247_joined:
		"${emoji_Yes} سيبقى iHorizon متصلاً في ${voiceChannel} على مدار الساعة!",
	h247_join_error: "${emoji_No} حدث خطأ أثناء تفعيل وحدة H24/7.",

	// /h247 leave
	h247_leave_not_active:
		"${emoji_No} وحدة H24/7 غير مفعلة حالياً على هذا السيرفر!",
	h247_left: "${emoji_Yes} تم تعطيل وحدة H24/7 على هذا السيرفر!",
	h247_leave_error: "${emoji_No} حدث خطأ أثناء تعطيل وحدة H24/7.",

	// /h247 info
	h247_info_embed_title: "معلومات وحدة H24/7",
	h247_info_embed_description:
		"تحافظ وحدة H24/7 على بقاء iHorizon متصلاً بغرفة صوتية على مدار الساعة، حتى بدون تشغيل أي شيء. وهي مفيدة للحفاظ على سلسلة النشاط الصوتي للسيرفر.\nطالما أن هذه الوحدة مفعلة، لا يمكن تشغيل الموسيقى أو TTS إلا داخل الغرفة الصوتية H24/7.\nيعود الاتصال تلقائياً بعد إعادة التشغيل أو توقف المشغل.",
	h247_info_field_status: "الحالة",
	h247_info_field_howto: "كيفية الاستخدام",
	h247_info_howto_value:
		"استخدم `/h247 join` لإبقاء iHorizon في غرفة صوتية.\nاستخدم `/h247 leave` لتعطيل الوحدة.\nاستخدم `/h247 info` لعرض هذه اللوحة.",

	// /music play
	h247_play_refused:
		"${emoji_No} وحدة H24/7 مفعلة على هذا السيرفر. انضم إلى الغرفة الصوتية H24/7 لتشغيل الموسيقى!",

	// /tts join
	h247_tts_refused:
		"${emoji_No} وحدة H24/7 مفعلة على هذا السيرفر. انضم إلى الغرفة الصوتية H24/7 لتفعيل TTS!",
	gw_go_duration_too_low: "${emoji_No} | المدة الدنيا هي 3 دقائق!",

	// Components V2 cards: /avatar, /serverinfo, /allbots
	avatar_card_title: "صورة ${user}",
	card_download: "تنزيل",
	serverinfo_label_owner: "المالك",
	serverinfo_label_members: "الأعضاء",
	serverinfo_label_created: "تاريخ الإنشاء",
	serverinfo_label_joined: "انضممت",
	serverinfo_label_roles: "الرتب",
	serverinfo_label_channels: "القنوات",
	serverinfo_label_boosts: "التعزيزات",
	serverinfo_boost_value: "${count} (المستوى ${tier})",
	serverinfo_label_verification: "التحقق",
	serverinfo_label_language: "اللغة",
	serverinfo_label_id: "المعرّف",
	serverinfo_verif_none: "بدون",
	serverinfo_verif_low: "منخفض",
	serverinfo_verif_medium: "متوسط",
	serverinfo_verif_high: "مرتفع",
	serverinfo_verif_highest: "الأعلى",
	all_bots_card_title: "البوتات في ${guild}",
	all_bots_card_count: "${count} بوت",
	all_bots_none: "لا يوجد أي بوت في هذا السيرفر.",

	// Components V2 cards: /unbanall, /media-only, /nick-kicker, /sync, /wlroles
	unbanall_card_progress: "جارٍ فك حظر `${count}` عضو…",
	unbanall_card_undo_progress: "جارٍ إعادة حظر `${count}` عضو…",
	unbanall_card_title: "فك حظر الجميع",
	unbanall_card_undo_title: "تم التراجع عن فك الحظر",
	unbanall_label_unbanned: "تم فك حظرهم",
	unbanall_label_banned: "أعيد حظرهم",
	unbanall_label_failed: "فشل",
	sync_card_title: "تمت مزامنة الصلاحيات",
	sync_card_desc: "هذه القنوات تتبع الآن صلاحيات ${category}:",
	media_only_card_title: "قنوات الوسائط فقط",
	utils_label_save: "حفظ",
	nick_kicker_card_title: "الطرد بسبب الاسم المستعار",
	nick_kicker_label_status: "الحالة",
	nick_kicker_label_words: "الكلمات",
	wlroles_card_title: "الرتب المسموح بها",
	wlroles_card_warn_title: "صلاحيات خطيرة",
	wlroles_card_high_title: "رتب أعلى من رتبتي",

	// Components V2 cards: /userinfo, /banner, /inviteinfo, /serverpic, /where, /vc, /snipe
	userinfo_label_badges: "الشارات",
	userinfo_label_username: "اسم المستخدم",
	userinfo_label_created: "تاريخ إنشاء الحساب",
	userinfo_label_joined: "انضم إلى الخادم",
	userinfo_label_nitro: "Nitro",
	userinfo_label_roles: "الأدوار",
	userinfo_label_id: "المعرّف",
	userinfo_card_loading: "جارٍ تحميل الملف الشخصي…",
	banner_card_guild_title: "لافتة ${guild}",
	banner_card_user_title: "لافتة ${user}",
	inviteinfo_label_channel: "القناة",
	inviteinfo_label_inviter: "الداعي",
	inviteinfo_label_created: "تاريخ إنشاء الخادم",
	inviteinfo_label_expires: "تنتهي",
	inviteinfo_label_members: "الأعضاء",
	inviteinfo_label_online: "متصل",
	inviteinfo_label_boosts: "التعزيزات",
	inviteinfo_label_features: "الميزات",
	serverpic_card_title: "أيقونة ${guild}",
	serverpic_card_no_icon: "لا يملك هذا الخادم أيقونة.",
	where_card_title: "أين ${member}",
	where_label_member: "العضو",
	where_label_channel: "القناة الصوتية",
	where_label_stream: "يبث",
	where_label_video: "الكاميرا",
	where_label_mute: "كتم الميكروفون",
	where_label_deaf: "كتم الصوت",
	vc_card_title: "النشاط الصوتي",
	vc_label_members: "الأعضاء",
	vc_label_online: "متصلون",
	vc_label_in_voice: "في الصوت",
	vc_label_streaming: "يبثون",
	vc_label_boosts: "التعزيزات",
	vc_label_camera: "الكاميرا مفعّلة",
	vc_label_muted: "مكتومون",
	snipe_card_title: "آخر رسالة محذوفة",
	snipe_label_author: "الكاتب",
	snipe_label_sent: "أُرسلت",

	// Components V2 cards: /delrole, /derank, /massiverole, /massmove, /nickrole, /setmentionrole, /util bringall, /util move
	utils_label_member: "العضو",
	utils_label_role: "الرتبة",
	utils_label_by: "بواسطة",
	utils_label_failed: "فشل",
	utils_label_from: "من",
	utils_label_to: "إلى",
	utils_label_moved: "تم نقلهم",
	utils_label_name_filter: "الاسم يحتوي على",
	derank_card_progress: "جارٍ إزالة ${count} رتب من ${member}…",
	derank_card_title: "تمت إزالة رتب العضو",
	derank_label_removed: "الرتب المُزالة",
	massiverole_card_progress_add: "جارٍ إضافة الرتبة إلى ${count} أعضاء…",
	massiverole_card_progress_sub: "جارٍ إزالة الرتبة من ${count} أعضاء…",
	massiverole_card_title_add: "تم منح الرتبة للأعضاء",
	massiverole_card_title_sub: "تمت إزالة الرتبة من الأعضاء",
	massiverole_label_added: "حصلوا عليها",
	massiverole_label_already: "كانت لديهم مسبقًا",
	massiverole_label_removed: "فقدوها",
	massiverole_label_without: "لم تكن لديهم",
	nickrole_label_skipped: "تم تخطيهم",
	massmove_card_title: "تم نقل الأعضاء",
	bringall_card_title: "تم توزيع الأعضاء",
	bringall_label_category: "الفئة",
	bringall_label_channels: "القنوات الصوتية",
	setmentionrole_card_title: "تم تفعيل رتبة الإشارة",
	setmentionrole_card_desc: "عندما يشير إليّ عضو، أمنحه هذه الرتبة.",
	setmentionrole_card_note:
		"يحصل على الرتبة فقط الأعضاء الذين يحتوي اسم المستخدم أو الاسم المعروض لديهم على هذا النص. إذا أزالوه تُزال الرتبة، وتُعاد عندما يضيفونه مجددًا.",

	// Components V2 cards: /admin-users, /admin-roles, /allwebhooks, /role-members, /prevnames, /emojis, /leashlist, /locknamelist
	card_bot: "بوت",
	card_working: "جارٍ التنفيذ…",
	card_label_requested_by: "بطلب من",
	card_label_failed: "فشل",
	admin_users_card_title: "المسؤولون",
	admin_users_card_count: "${count} عضو لديهم صلاحية المسؤول",
	admin_users_card_only_bots: "البوتات فقط لديها هذه الصلاحية.",
	admin_users_button_hide_bots: "إخفاء البوتات",
	admin_users_button_show_bots: "إظهار البوتات",
	admin_users_card_done_title: "تم تخفيض رتب المسؤولين",
	admin_users_label_unranked: "الأعضاء المخفّضون",
	admin_roles_card_title: "رتب المسؤول",
	admin_roles_card_count: "${count} رتبة لديها صلاحية المسؤول",
	admin_roles_card_managed: "تديرها إضافة",
	admin_roles_card_done_title: "تمت إزالة صلاحية المسؤول",
	admin_roles_label_modified: "الرتب المعدّلة",
	allwebhooks_card_count: "${count} ويب هوك",
	allwebhooks_button_delete: "حذف الكل",
	role_members_card_title: "أعضاء ${role}",
	role_members_card_count: "${count} عضو",
	prevnames_card_title: "الأسماء السابقة لـ ${user}",
	prevnames_card_count: "${count} اسم مسجّل",
	prevnames_button_erase: "مسح سجلي",
	prevnames_label_username: "اسم المستخدم",
	prevnames_label_display_name: "الاسم المعروض",
	prevnames_label_nickname: "اللقب في ${guild}",
	emoji_card_title: "تمت إضافة الرموز التعبيرية",
	emoji_card_count: "تم إنشاء ${count} رمز تعبيري في ${guild}",
	util_leashlist_card_count: "${count} مقود نشط",
	util_leashlist_card_expires: "ينتهي",
	util_locknamelist_card_count: "${count} لقب مقفل",
	util_locknamelist_card_by: "أقفله ${user}",

	// Components V2 cards: /invites, /leaderboard, /addinvites, /removeinvites
	invites_card_title: "إحصائيات الدعوات",
	invites_label_total: "المجموع",
	invites_label_regular: "عادية",
	invites_label_left: "غادروا",
	invites_label_bonus: "إضافية",
	invites_label_invited_by: "دعاه",
	leaderboard_card_title: "ترتيب الدعوات",
	leaderboard_card_count: "${count} عضو في ترتيب ${guild}",
	leaderboard_card_your_rank: "ترتيبك: ${rank}/${count} مع ${invites} دعوة",
	leaderboard_card_not_ranked: "لست في الترتيب بعد.",
	leaderboard_card_empty: "لا أحد لديه دعوات في هذا الخادم بعد.",
	leaderboard_card_generated: "تم الإنشاء في ${elapsed} ms",

	// Components V2 cards: /fun caracteres, catsay, hack, hug, kiss, slap, love, poll, question, tweet, youtube
	caracteres_card_title: "اختر نمط النص",
	caracteres_card_result_title: "نصك بنمط ${style}",
	caracteres_label_original: "الأصلي",
	caracteres_label_converted: "المحوَّل",
	catsay_card_title: "لقد تكلّم القط",
	hack_card_title: "اكتمل الاختراق",
	hack_label_ip: "عنوان IP",
	hack_label_email: "البريد الإلكتروني",
	hack_label_password: "كلمة السر",
	hug_card_title: "وقت العناق",
	hug_card_desc: "${author} يعانق ${target} بحرارة.",
	kiss_card_title: "قبلة",
	kiss_card_desc: "${author} يقبّل ${target}.",
	slap_card_title: "صفعة",
	slap_card_desc: "${author} يصفع ${target}.",
	love_card_title: "حاسبة الحب",
	love_card_desc: "**${user1}** + **${user2}** = `${percent}%` من الحب",
	poll_card_title: "استطلاع من ${author}",
	poll_card_vote: "تفاعل بـ ${yes} للموافقة أو ${no} للرفض.",
	question_card_title: "${author} يسأل",
	question_label_question: "السؤال",
	question_label_answer: "الجواب",
	tweet_card_title: "منشور جديد من ${user}",
	youtube_card_title: "تعليق جديد من ${user}",

	// Components V2 cards: fun animal pictures (/cat /dog /dolphin /duck /fox /frog /panda /squirrel) and random results (/dice /heads-tails /number /rate /gay /trans /stench /transgender)
	fun_card_cat_title: "مياو",
	fun_card_dog_title: "هو هو",
	fun_card_dolphin_title: "إيي-إيي، طق طق",
	fun_card_duck_title: "كواك كواك",
	fun_card_fox_title: "وا-با-با-با-با",
	fun_card_frog_title: "نق نق",
	fun_card_panda_title: "مواا",
	fun_card_squirrel_title: "تشيك تشيك",
	fun_card_animal_hint: "صورة عشوائية، خصيصًا لك.",
	fun_card_dice_title: "رمي النرد",
	fun_card_coinflip_title: "ملك أم كتابة",
	fun_card_number_title: "رقم عشوائي",
	fun_card_gay_title: "مقياس المثلية",
	fun_card_trans_title: "مقياس العبور الجنسي",
	fun_card_stench_title: "مقياس الرائحة",
	fun_card_rate_title: "تقييمي",
	fun_card_transgender_title: "صورة فخر العابرين",
	fun_label_dice: "النرد",
	fun_label_rolls: "الرميات",
	fun_label_total: "المجموع",
	fun_label_result: "النتيجة",
	fun_label_range: "النطاق",
	fun_label_score: "النتيجة",
	fun_label_rated: "المُقيَّم",

	// Components V2 cards: /ban, /kick, /baninfo, /banlist, /mutelist, /warnlist, /unwarn, /rolepanel
	mod_label_moderator: "المشرف",
	mod_label_warn_id: "معرف التحذير",
	ban_card_title: "تم حظر العضو",
	kick_card_title: "تم طرد العضو",
	baninfo_card_title: "حظر ${user}",
	banlist_card_title: "الأعضاء المحظورون",
	banlist_card_count: "${count} عضو محظور",
	mutelist_card_title: "الأعضاء المكتومون",
	mutelist_card_count: "${count} عضو مكتوم",
	mutelist_card_ends: "ينتهي ${time}",
	mutelist_button_unmute_all: "إزالة كل الكتم",
	mutelist_card_cleared_title: "تمت إزالة الكتم",
	mutelist_card_cleared_desc: "يمكن لـ ${count} عضو التحدث مجددًا.",
	warnlist_card_title: "تحذيرات ${user}",
	warnlist_card_count: "${count} تحذير",
	unwarn_card_title: "تمت إزالة التحذير",
	rolepanel_card_done_title: "تم تحديث الرتب",
	rolepanel_label_added: "أضيفت",
	rolepanel_label_removed: "أزيلت",
	rolepanel_label_refused: "مرفوضة",

	// /stats rebuilt: Components V2 card and resvg pages
	stats_locale: "ar-EG",
	stats_view_overview: "نظرة عامة",
	stats_view_overview_desc: "الإجماليات والاتجاه والقنوات المفضلة",
	stats_view_rhythm: "الإيقاع",
	stats_view_rhythm_desc: "متى يحدث ذلك، ساعة بساعة",
	stats_view_members: "الأعضاء",
	stats_view_members_desc: "من يكتب ومن يتواجد في الصوت",
	stats_view_channels: "القنوات",
	stats_view_channels_desc: "أكثر القنوات النصية والصوتية نشاطًا",
	stats_select_placeholder: "اختر طريقة العرض",
	stats_label_messages: "الرسائل",
	stats_label_voice: "الوقت في الصوت",
	stats_label_active_days: "أيام النشاط",
	stats_label_rank: "الترتيب",
	stats_label_active_members: "الأعضاء النشطون",
	stats_label_members: "الأعضاء",
	stats_label_peak: "الذروة",
	stats_label_avg_length: "متوسط الطول",
	stats_label_sessions: "الجلسات الصوتية",
	stats_label_longest_session: "أطول جلسة",
	stats_label_best_streak: "أفضل سلسلة",
	stats_note_change_up: "+${change} % عن الأسبوع الماضي",
	stats_note_change_down: "-${change} % عن الأسبوع الماضي",
	stats_note_new: "جديد هذا الأسبوع",
	stats_note_steady: "مثل الأسبوع الماضي",
	stats_note_streak: "سلسلة ${days} أيام",
	stats_note_rank_of: "من ${count} عضو",
	stats_note_unranked: "غير مصنف بعد",
	stats_note_chars: "حرف لكل رسالة",
	stats_note_avg_session: "${duration} في المتوسط",
	stats_note_days_in_row: "أيام متتالية",
	stats_chart_daily: "النشاط اليومي",
	stats_chart_voice_minutes: "الصوت (دقيقة)",
	stats_chart_messages_per_day: "الرسائل يوميًا",
	stats_text_channels: "القنوات النصية",
	stats_voice_channels: "القنوات الصوتية",
	stats_top_messages: "الأكثر رسائل",
	stats_top_voice: "الأكثر وقتًا في الصوت",
	stats_heat_messages: "الرسائل",
	stats_heat_voice: "الصوت",
	stats_peak_note: "الذروة: ${day} ${hour}",
	stats_empty: "لا شيء بعد",
	stats_footer_zone: "الأوقات: ${zone} · آخر 30 يومًا",
	stats_title_user: "نشاط ${user}",
	stats_title_guild: "النشاط في ${guild}",
	stats_title_channel: "النشاط في ${channel}",
	stats_title_compare: "${a} و ${b}",
	stats_title_top_messages: "الأكثر رسائل",
	stats_title_top_voice: "الأكثر في الصوت",
	stats_period_1d: "آخر 24 ساعة",
	stats_period_7d: "آخر 7 أيام",
	stats_period_30d: "آخر 30 يومًا",
	stats_insight_peak: "الأكثر نشاطًا يوم ${day} حوالي ${hour}.",
	stats_insight_up: "رسائل أكثر بنسبة ${change} % من الأسبوع الماضي.",
	stats_insight_down: "رسائل أقل بنسبة ${change} % من الأسبوع الماضي.",
	stats_insight_channel: "القناة المفضلة: ${channel}.",
	stats_insight_streak: "نشط ${days} أيام متتالية.",
	stats_insight_leader: "${user} في الصدارة بـ ${value}.",
	stats_insight_compare: "${user} متقدم في ${count} من ${total} مقاييس.",
	stats_insight_tie: "متقاربان جدًا.",
	stats_compare_same: "اختر عضوين مختلفين.",
	stats_wrong_channel: "اختر قناة نصية أو صوتية.",

	// /stats rebuilt: Components V2 card and resvg pages
	stats_card_no_data: "لم يُسجَّل أي نشاط خلال آخر 30 يومًا.",

	// /music apo panel
	music_apo_panel_title: "Equalizer APO",
	music_apo_panel_on: "الوحدة مفعّلة",
	music_apo_panel_off: "الوحدة معطّلة",
	music_apo_panel_applied: "مطبّق افتراضيًا: **${name}**",
	music_apo_panel_nothing_applied: "لا يوجد إعداد مطبّق افتراضيًا",
	music_apo_panel_count:
		"${count}/${max} إعدادات · الإعداد المطبّق يشكّل كل ما يشغّله السيرفر",
	music_apo_panel_empty:
		"لا توجد إعدادات بعد. أضف ملف Equalizer APO بصيغة .txt بالزر أدناه.",
	music_apo_badge_applied: "مطبّق",
	music_apo_badge_frozen: "مجمّد",
	music_apo_config_meta:
		"بواسطة ${user} · عُدّل ${time} · ${lines} سطر · ${size}",
	music_apo_button_manage: "إدارة",
	music_apo_button_add: "إضافة إعداد",
	music_apo_button_enable: "تفعيل",
	music_apo_button_disable: "تعطيل",
	music_apo_button_apply: "تطبيق افتراضيًا",
	music_apo_button_unapply: "إيقاف التطبيق",
	music_apo_button_rename: "إعادة التسمية",
	music_apo_button_replace: "استبدال الملف",
	music_apo_button_freeze: "تجميد",
	music_apo_button_unfreeze: "إلغاء التجميد",
	music_apo_button_delete: "حذف",
	music_apo_button_confirm_delete: "حذف نهائي",
	music_apo_button_cancel: "إلغاء",
	music_apo_frozen_note:
		"جمّده ${user}: يمكن تطبيقه، لكن لا يمكن إعادة تسميته أو استبداله أو حذفه.",
	music_apo_confirm_delete: "حذف **${name}**؟ لا يمكن التراجع.",
	music_apo_modal_add_title: "إضافة إعداد APO",
	music_apo_modal_replace_title: "استبدال الملف",
	music_apo_modal_rename_title: "إعادة تسمية الإعداد",
	music_apo_field_name: "الاسم",
	music_apo_field_name_desc: "يظهر في اللوحة، ${max} حرفًا كحد أقصى",
	music_apo_field_file: "ملف Equalizer APO",
	music_apo_field_file_desc:
		"ملف .txt بحد أقصى ${kb} كيلوبايت و${lines} سطر أوامر",
	music_apo_no_permission:
		"${emoji} يمكن فقط لمشرفي السيرفر ومالكيه إدارة إعدادات APO الخاصة به.",
	music_apo_full:
		"${emoji} لدى هذا السيرفر ${max} إعدادات بالفعل. احذف واحدًا أولًا.",
	music_apo_name_taken: "${emoji} يوجد إعداد باسم **${name}** بالفعل.",
	music_apo_name_empty: "${emoji} أعطِ الإعداد اسمًا.",
	music_apo_not_txt: "${emoji} أرسل ملفًا بصيغة .txt.",
	music_apo_too_big: "${emoji} حجم الملف يتجاوز ${kb} كيلوبايت.",
	music_apo_too_many_lines:
		"${emoji} يحتوي الملف على أكثر من ${lines} سطر أوامر.",
	music_apo_empty_file: "${emoji} الملف فارغ.",
	music_apo_frozen: "${emoji} **${name}** مجمّد: ألغِ تجميده أولًا.",
	music_apo_cannot_unfreeze:
		"${emoji} يمكن فقط لـ ${user} أو مالكي السيرفر أو البوت إلغاء تجميده.",
	music_apo_saved: "${emoji} تم حفظ **${name}** (${stages} مراحل)."
} satisfies LanguageData;
