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
	// ko-KR: Korean

	// Variable
	var_member: "멤버",
	var_user: "사용자",
	var_author: "작성자",
	var_reason: "사유",
	var_guild: "서버",
	var_sanction: "제재",
	var_time: "시간",
	var_message: "메시지",
	var_no_set: "설정 안 됨",
	var_none: "없음",
	var_roles: "역할",
	var_names: "이름",
	var_text_channel: "텍스트 채널",
	var_voice_channel: "음성 채널",
	var_creator: "제작자",
	var_doesnt_have_permissions:
		"이 작업을 할 수 없어요. {permission} 권한이 필요해요.",
	var_ihorizon: "iHorizon",
	var_developer: "개발자",
	var_chance: "운",
	var_other: "기타",
	var_unknown: "알 수 없음",
	var_secure: "안전함",
	var_unsecure: "안전하지 않음",
	var_prefix: "접두사",
	var_slash: "슬래시",
	var_discord: "Discord",
	var_network: "네트워크",
	var_latency: "지연 시간",
	var_bot: "봇",
	var_true: "참",
	var_false: "거짓",
	var_enabled: "사용",
	var_disabled: "사용 안 함",
	var_yes: "예",
	var_no: "아니요",
	var_colour: "색상",
	var_length: "길이",
	var_good: "좋음",
	var_size: "크기",
	var_level: "레벨",
	var_add: "추가",
	var_remove: "제거",
	var_edit: "편집",
	var_confirm: "확인",
	var_succes: "성공",
	var_page: "페이지",
	var_previous: "이전",
	var_next: "다음",
	var_permission: "권한",
	var_usage: "사용법",
	var_aliases: "별칭",
	var_dont_have_perm: "이 작업을 할 수 없어요. {perm} 권한이 없어요!",
	var_price: "가격",
	var_boost: "부스트",
	var_uses: "사용 횟수",
	var_vc_stats: "통계",
	var_1d: "1일",
	var_7d: "7일",
	var_14d: "14일",
	var_year: "년",
	var_mo: "개월",
	var_w: "주",
	var_d: "일",
	var_h: "시간",
	var_m: "분",
	var_s: "초",
	var_ms: "밀리초",
	var_banned_user: "차단된 사용자",
	var_no_one_banned: "이 서버에서 차단된 사용자가 없어요.",
	var_category: "카테고리",
	var_total: "합계",
	var_online_members: "온라인 멤버",
	var_boost_level: "부스트 레벨",
	var_features: "기능",
	var_guild_icon: "서버 아이콘",
	var_guild_banner: "서버 배너",
	var_guild_splash: "서버 스플래시",
	var_unknown_guild_name: "알 수 없는 서버 이름",
	var_preview: "미리 보기",
	var_form: "양식",
	var_original_message: "원본 메시지",
	var_click_here: "여기를 클릭",
	var_s_message: "{nickname}님의 메시지",
	var_source: "음악 출처: ",
	var_online_call: "음성 채널 접속 중",
	var_online: "온라인",
	var_stream: "방송 중",
	var_boosts: "부스트",
	var_muted: "음소거됨",
	var_camera: "카메라 켜짐",

	// Discord Permission Name
	perm_createinstantinvite_name: "초대 코드 만들기",
	perm_kickmembers_name: "멤버 추방하기",
	perm_banmembers_name: "멤버 차단하기",
	perm_administrator_name: "관리자",
	perm_managechannels_name: "채널 관리하기",
	perm_manageguild_name: "서버 관리하기",
	perm_addreactions_name: "반응 추가하기",
	perm_viewauditlog_name: "감사 로그 보기",
	perm_priorityspeaker_name: "우선 발언권",
	perm_stream_name: "동영상",
	perm_viewchannel_name: "채널 보기",
	perm_sendmessages_name: "메시지 보내기",
	perm_sendttsmessages_name: "TTS 메시지 보내기",
	perm_managemessages_name: "메시지 관리하기",
	perm_embedlinks_name: "링크 첨부",
	perm_attachfiles_name: "파일 첨부",
	perm_readmessagehistory_name: "메시지 기록 보기",
	perm_mentioneveryone_name: "모두 멘션하기",
	perm_useexternalemojis_name: "외부 이모지 사용하기",
	perm_viewguildinsights_name: "서버 인사이트 보기",
	perm_connect_name: "연결",
	perm_speak_name: "말하기",
	perm_mutemembers_name: "멤버의 마이크 음소거하기",
	perm_deafenmembers_name: "멤버의 헤드셋 음소거하기",
	perm_movemembers_name: "멤버 이동",
	perm_usevad_name: "음성 감지 사용",
	perm_changenickname_name: "별명 변경하기",
	perm_managenicknames_name: "별명 관리하기",
	perm_manageroles_name: "역할 관리하기",
	perm_managewebhooks_name: "웹후크 관리하기",
	perm_manageemojisandstickers_name: "이모지 및 스티커 관리하기",
	perm_manageguildexpressions_name: "서버 표현 관리하기",
	perm_useapplicationcommands_name: "앱 명령어 사용하기",
	perm_requesttospeak_name: "발언권 요청하기",
	perm_manageevents_name: "이벤트 관리하기",
	perm_managethreads_name: "스레드 관리하기",
	perm_createpublicthreads_name: "공개 스레드 만들기",
	perm_createprivatethreads_name: "비공개 스레드 만들기",
	perm_useexternalstickers_name: "외부 스티커 사용하기",
	perm_sendmessagesinthreads_name: "스레드에서 메시지 보내기",
	perm_useembeddedactivities_name: "활동 사용하기",
	perm_moderatemembers_name: "멤버 타임아웃",
	perm_viewcreatormonetizationanalytics_name: "크리에이터 수익 분석 보기",
	perm_usesoundboard_name: "사운드보드 사용하기",
	perm_createguildexpressions_name: "서버 표현 만들기",
	perm_createevents_name: "이벤트 만들기",
	perm_useexternalsounds_name: "외부 사운드 사용하기",
	perm_sendvoicemessages_name: "음성 메시지 보내기",
	perm_sendpolls_name: "투표 만들기",
	perm_useexternalapps_name: "외부 앱 사용하기",

	// Ticket commands
	// /add, /close, /delete, /sethereticket, /open, /remove, /transript, /disableticket
	ticket_disabled_command:
		"관리자가 이 명령어를 비활성화해서 사용할 수 없어요",

	// /add
	add_disabled_command: "관리자가 이 명령어를 비활성화해서 사용할 수 없어요",
	add_command_work: "${memberTag}님을 티켓에 추가했어요!",
	add_command_error: "오류가 발생했어요. 다시 시도해 주세요",

	// /close
	close_disabled_command:
		"관리자가 이 명령어를 비활성화해서 사용할 수 없어요",
	close_title_sourcebin: "iHorizon 티켓 대화 기록",
	close_description_sourcebin: " ",
	close_error_command: "오류가 발생했어요. 다시 시도해 주세요!",
	close_command_work_channel:
		"티켓을 닫았어요. iHorizon이 대화 기록을 보내 드렸어요",
	close_command_work_notify_channel: "티켓을 닫았어요!",
	close_command_error: "오류가 발생했어요. 다시 시도해 주세요!",
	close_not_in_ticket: "티켓 채널 밖에서는 이 명령어를 사용할 수 없어요!",

	// /delete
	delete_disabled_command:
		"관리자가 이 명령어를 비활성화해서 사용할 수 없어요",
	delete_not_in_ticket: "티켓 채널 밖에서는 이 명령어를 사용할 수 없어요!",
	ticket_deleted:
		"<@${deletedByUserId}>님이 ${ticketOwnerMention}님의 티켓을 삭제했어요. 대화 기록은 다음과 같아요:",

	// /sethereticket
	sethereticket_panel_select_embed_desc:
		"# 패널 이름\n```${panelName}```\n{msg}\n\n## 카테고리\n```{category}```\n",

	// /open
	open_disabled_command: "관리자가 이 명령어를 비활성화해서 사용할 수 없어요",
	open_command_work: "${channel}을(를) 다시 열었어요.",
	open_command_error: "오류가 발생했어요. 다시 시도해 주세요!",
	open_not_in_ticket: "티켓 채널 밖에서는 이 명령어를 사용할 수 없어요!",

	// /remove
	remove_disabled_command:
		"관리자가 이 명령어를 비활성화해서 사용할 수 없어요",
	remove_not_in_ticket: "티켓 채널 밖에서는 이 명령어를 사용할 수 없어요!",
	remove_command_error: "오류가 발생했어요. 다시 시도해 주세요",
	remove_command_work: "${memberTag}님을 티켓에서 제거했어요!",

	// /transript
	transript_disabled_command:
		"관리자가 이 명령어를 비활성화해서 사용할 수 없어요!",
	transript_name_sourcebin: " ",
	transript_title_sourcebin: "${channelName}의 티켓 대화 기록",
	transript_command_error: "오류가 발생했어요. 다시 시도해 주세요!",
	transript_command_work:
		"티켓을 닫았어요. iHorizon이 티켓 내용의 대화 기록을 보내 드렸어요.",
	transript_not_in_ticket: "티켓 채널 밖에서는 이 명령어를 사용할 수 없어요!",

	// /disableticket
	disableticket_not_admin:
		":x: | 이 명령어를 사용하려면 이 서버의 관리자여야 해요!",
	disableticket_logs_embed_title_disable: "티켓 비활성화 로그",
	disableticket_logs_embed_description_disable:
		"<@${authorId}>님이 티켓 명령어를 비활성화했어요!",
	disableticket_command_work_disable: "티켓 명령어를 비활성화했어요!",
	disableticket_logs_embed_title_enable: "티켓 활성화 로그",
	disableticket_logs_embed_description_enable:
		"<@${authorId}>님이 티켓 명령어를 활성화했어요!",
	disableticket_command_work_enable: "티켓 명령어를 활성화했어요!",

	// /setticketcategory
	setticketcategory_not_admin:
		":x: | 이 명령어를 사용하려면 이 서버의 관리자여야 해요!",
	setticketcategory_disabled_command:
		"관리자가 티켓 명령어를 비활성화해서 이 명령어를 사용할 수 없어요!",
	setticketcategory_not_a_category:
		"지정한 채널이 카테고리가 아니에요. 다시 시도해 주세요.",
	setticketcategory_command_work:
		"<@${authorId}>님, 티켓 채널의 카테고리를 `${categoryName}`(으)로 설정했어요!",

	// /ticket log-channel
	ticket_logchannel_embed_title: "티켓 로그 채널",
	ticket_logchannel_embed_desc:
		"${author}님, 티켓 모듈의 로그 채널을 ${channel}(으)로 설정했어요!",

	// /ticket panel
	ticket_panel_default_placeholder: "티켓을 열 카테고리를 선택해 주세요",
	ticket_panel_embed_title: "티켓 패널 #",
	ticket_panel_embed_desc: "세부 옵션으로 티켓 임베드를 꾸며 보세요.",
	ticket_panel_saved_conf: "💾 저장된 설정",
	ticket_panel_related_embed: "🕸️ 연결된 임베드",
	ticket_panel_role_to_ping: "📌 멘션할 역할",
	ticket_panel_ping_user: "📎 사용자 멘션",
	ticket_panel_placeholder: "🏷️ 안내 문구",
	ticket_panel_category: "📤 카테고리",
	ticket_panel_option_fields: "📔 옵션 항목",
	ticket_panel_form: "📝 양식",
	ticket_panel_panel_placeholder: "옵션 선택",
	ticket_panel_panel_1_label: "현재 설정 저장",
	ticket_panel_panel_2_label: "미리 보기 표시",
	ticket_panel_panel_3_label: "연결된 임베드 변경",
	ticket_panel_panel_4_label: "멘션할 역할 추가/제거",
	ticket_panel_panel_5_label: "안내 문구 변경",
	ticket_panel_panel_6_label: "카테고리 변경",
	ticket_panel_panel_7_label: "멘션할 사용자 변경",
	ticket_panel_panel_8_label: "옵션 항목 추가/제거",
	ticket_panel_panel_9_label: "양식 변경",
	ticket_panel_button_send: "임베드 보내기",
	ticket_panel_change_category_channelSelect_placeholder: "카테고리 선택",
	ticket_panel_select_channel_to_send: "임베드를 보낼 채널을 선택해 주세요",
	ticket_panel_change_placeholder_modal_title: "안내 문구 변경",
	ticket_panel_change_placeholder_modal_placeholder: "새 안내 문구",
	ticket_panel_need_save_config:
		"임베드를 보내기 전에 현재 설정을 저장해야 해요.",
	ticket_panel_need_1_option:
		"임베드를 보내려면 옵션이 하나 이상 있어야 해요.",
	ticket_panel_related_embed_dont_exist: "연결된 임베드가 존재하지 않아요",
	ticket_panel_channel_error:
		"채널이 존재하지 않거나 그 채널에 메시지를 보낼 권한이 없어요.",
	ticket_panel_embed_been_send: "임베드를 채널에 보냈어요.",
	ticket_panel_successfully_saved: "설정을 저장했어요",
	ticket_panel_change_role_roleSelect_placeholder: "역할 선택",
	ticket_panel_change_role_interaction_content:
		"티켓이 열릴 때 멘션할 역할을 선택해 주세요.",
	ticket_panel_change_embed_modal_title: "연결된 임베드 변경",
	ticket_panel_change_embed_modal_placeholder: "임베드 ID",
	ticket_panel_change_embed_dont_exist: "임베드가 존재하지 않아요",
	ticket_panel_change_option_select_placeholder: "옵션 선택",
	ticket_panel_change_option_select_1_label: "새 옵션 항목 추가",
	ticket_panel_change_option_select_2_label: "옵션 항목 제거",
	ticket_panel_change_option_interaction_content:
		"옵션 항목을 추가하거나 제거하려면 옵션을 선택해 주세요",
	ticket_panel_add_option_max_10: "옵션 항목은 10개까지만 추가할 수 있어요",
	ticket_panel_add_option_modal_title: "옵션 항목 추가",
	ticket_panel_add_option_modal_field1_label: "이름",
	ticket_panel_add_option_modal_field2_label: "설명",
	ticket_panel_add_option_modal_field3_label: "이모지",
	ticket_panel_remove_option_empty: "제거할 옵션 항목이 없어요",
	ticket_panel_remove_option_select_placeholder: "제거할 옵션 선택",
	ticket_panel_rempve_option_interaction_content:
		"제거할 옵션을 선택해 주세요",
	ticket_panel_change_form_select_placeholder_1: "양식 항목 추가",
	ticket_panel_change_form_select_placeholder_2: "양식 항목 제거",
	ticket_panel_change_form_interaction_content:
		"양식 항목을 추가하거나 제거하려면 옵션을 선택해 주세요",
	ticket_panel_add_form_max_3: "양식 항목은 3개까지만 추가할 수 있어요",
	ticket_panel_add_form_modal_title: "양식 항목 추가",
	ticket_panel_add_form_modal_field1_label: "질문 제목",
	ticket_panel_add_form_modal_field2_label: "질문 안내 문구",
	ticket_panel_preview_message: "티켓 패널 미리 보기",
	ticket_panel_option_change_category:
		"카테고리를 변경할 옵션을 선택해 주세요",
	ticket_panel_panel_10_label: "특정 옵션의 카테고리 변경",
	ticket_panel_channel_panel_embed_id: "티켓 채널 임베드 ID",
	ticket_panel_panel_11_label: "티켓 채널 임베드 변경",
	ticket_panel_select_user: "티켓에 멤버를 추가하는 메뉴",
	ticket_panel_button_delete: "티켓 삭제 버튼",
	ticket_panel_button_transcript: "대화 기록 생성 버튼",
	ticket_panel_panel_12_label: "티켓 멤버 추가/제거 메뉴 표시",
	ticket_panel_panel_13_label: "티켓 삭제 버튼 표시",
	ticket_panel_panel_14_label: "대화 기록 버튼 표시",
	ticket_panel_tip_about_variable1:
		"${emoji_VC_OpenChat} **알고 계셨나요?** `/utils embed`로 임베드를 만들 때 **`{category}`** 변수를 넣으면 사용자가 선택한 카테고리로 바뀌어요.",
	ticket_panel_no_question_to_delete: "삭제할 질문이 없어요.",
	ticket_panel_chose_a_question: "질문 선택",
	ticket_panel_select_question_to_delete: "삭제할 질문을 선택해 주세요.",
	ticket_panel_panel_15_label: "옵션별 임베드 설정",
	ticket_panel_panel_16_label: "옵션별 양식 설정",
	ticket_panel_panel_17_label: "옵션별 멘션할 역할 설정",
	ticket_panel_mode: "⚙️ 모드",
	ticket_panel_mode_simple: "간단",
	ticket_panel_mode_advanced: "고급",
	ticket_panel_mode_simple_desc:
		"버튼 하나로 티켓을 열어요. 선택지나 질문이 없어요.",
	ticket_panel_mode_advanced_desc:
		"옵션 메뉴, 옵션별 설정과 양식을 제공해요.",
	ticket_panel_panel_18_label: "모드 전환 (간단 / 고급)",
	ticket_panel_simple_default_title: "지원",
	ticket_panel_simple_default_desc:
		"도움이 필요하신가요? 아래 버튼을 눌러 티켓을 열어 주세요.",
	ticket_panel_manage_form_title: "옵션 양식 관리: **${optionName}**",
	ticket_panel_change_embed_options:
		"채널 패널 임베드 ID를 편집할 옵션을 선택해 주세요.",
	ticket_panel_change_embed_options_null:
		"채널 패널 임베드 ID를 편집할 옵션이 없어요.",
	ticket_panel_change_embed_options_chose:
		"채널 패널 ID를 편집할 카테고리를 선택해 주세요.",
	ticket_panel_add_a_question: "질문 추가",
	ticket_panel_remove_a_question: "질문 제거",
	ticket_panel_option_invalid: "❌ 잘못된 옵션이에요.",
	ticket_panel_chose_option_to_form: "양식을 설정할 옵션을 선택해 주세요.",
	var_chose_option: "옵션 선택",
	ticket_panel_saved_and_sended_panel:
		"티켓 패널 #${panelCode}을(를) ${channel}에 보냈어요. 나중에 패널을 수정할 수 있도록 코드를 잘 보관해 주세요.",
	var_title: "제목",
	var_action: "작업",

	// /ticket rename
	ticket_rename_ok: "티켓 채널 이름을 변경했어요!",
	ticket_rename_error: "텍스트 채널 이름을 변경하는 중 오류가 발생했어요",

	// /ticket unlink
	ticket_unlink_command_ok:
		"${emoji_Yes} | **이제 이 채널은 티켓 모듈과 연결이 해제됐어요.**",
	ticket_unlink_panel_edited_content:
		"이 채널은 예전 티켓이에요. {user}님이 이 채널의 연결을 해제했어요.",

	// /ticket remind
	ticket_remind_embed_title: "앗! 티켓 알림",
	ticket_remind_embed_desc:
		"한동안 활동이 없으셨네요. 괜찮아요, 하지만 티켓은 아직 처리 중이에요! 와서 답장해 주세요!",
	ticket_remind_embed_fields_1_name: "마지막 답장",
	ticket_remind_command_ok: "사용자에게 알림 메시지를 보냈어요.",
	var_never: "없음",

	// Ranks commands
	// /level, /setxpchannels, /disablexp

	// /disablexp
	disablexp_not_admin:
		":x: | 이 명령어를 사용하려면 이 서버의 관리자여야 해요!",
	disablexp_logs_embed_title_disable: "경험치(XP) 비활성화 로그",
	disablexp_logs_embed_description_disable:
		"<@${authorId}>님이 경험치(XP)를 비활성화했어요!",
	disablexp_command_work_disable: "경험치(XP)를 비활성화했어요.",
	disablexp_logs_embed_title_enable: "경험치(XP) 활성화 로그",
	disablexp_logs_embed_description_enable:
		"<@${authorId}>님이 경험치(XP)를 활성화했어요!",
	disablexp_command_work_enable: "경험치(XP)를 활성화했어요.",
	disablexp_command_work_disable_entierly:
		"랭크 모듈을 완전히 비활성화했어요! (메시지가 더 이상 나오지 않고, 사용자도 레벨을 얻지 않아요)",

	// /setxpchannels
	setxpchannels_not_admin:
		":x: | 이 명령어를 사용하려면 이 서버의 관리자여야 해요!",
	setxpchannels_logs_embed_title_disable: "SetXpChannels 로그",
	setxpchannels_logs_embed_description_disable:
		"<@${authorId}>님이 사용자 지정 경험치(XP) 채널을 비활성화하고 설정을 기본값으로 초기화했어요.",
	setxpchannels_already_disabled_disable:
		"사용자 지정 경험치(XP) 채널이 이미 비활성화되어 있어요!",
	setxpchannels_command_work_disable:
		"사용자 지정 경험치(XP) 채널을 비활성화했어요!",
	setxpchannels_command_error_disable:
		"오류: 권한이 없거나 채널이 존재하지 않아요",
	setxpchannels_logs_embed_title_enable: "SetXpChannels 로그",
	setxpchannels_logs_embed_description_enable:
		"<@${authorId}>님이 사용자 지정 경험치(XP) 채널을 <#${argsid}>(으)로 설정했어요",
	setxpchannels_valid_channel_message:
		"설정에 사용할 올바른 채널을 지정해 주세요.",
	setxpchannels_already_with_this_config:
		"사용자 지정 경험치(XP) 채널이 이미 이 채널 ID로 설정되어 있어요!",
	setxpchannels_confirmation_message:
		"**사용자 지정 경험치(XP) 채널이 여기로 설정됐어요!**",
	setxpchannels_command_work_enable:
		"사용자 지정 경험치(XP) 채널을 <#${argsid}>(으)로 설정했어요",
	setxpchannels_command_error_enable:
		"오류: 권한이 없거나 채널이 존재하지 않아요",

	// /level
	level_embed_title: "__**경험치(XP) 레벨**__: `${userUsername}`",
	level_embed_fields1_name: ":arrow_up:・__레벨:__",
	level_embed_fields1_value: "`${currentxp}/${xpNeeded}`",
	level_embed_fields2_name: ":money_with_wings:・__경험치:__",
	level_embed_fields2_value: "`${level}`",
	level_embed_description:
		"`${expNeededForLevelUp}` **경험치가 더 있어야 다음 레벨로 올라가요!**",
	level_xp_needed_for_new_level: "다음 레벨까지 남은 경험치(XP):",
	level_xp_total: "총 경험치(XP):",

	// /ranks leaderboard
	ranks_leaderboard_top_txt: "Top #${i}",
	ranks_leaderboard_top_txt_raw: "Top #${i} ${rawText}\n",
	ranks_leaderboard_txt_text:
		"👤 ${user} `(${userGlobalName})`\n⭐ ➥ **레벨**: `${level}`\n🔱 ➥ **총 경험치(XP)**: `${xpTotal}`",
	ranks_leaderboard_embed_title: "🏆 서버 전설의 순위표",
	ranks_leaderboard_embed_footer:
		"${cPage} / ${totalPages} 페이지 • 총 경험치(XP) 기준 순위",

	// /ranks ignore-channels
	ranks_ignorechannels_embed_title: "랭크 모듈 설정",
	ranks_ignorechannels_embed_desc:
		"이 채널들에 새 메시지가 올라와도 랭크 모듈은 무시해요.",

	// /ranks set-message
	ranksSetMessage_not_admin:
		":x: | 이 명령어를 사용하려면 이 서버의 관리자여야 해요!",
	ranksSetMessage_help_embed_title: "/ranks set-message 도움말!",
	ranksSetMessage_help_embed_description: "/ranks set-message",
	ranksSetMessage_help_embed_fields_name: "사용 방법",
	ranksSetMessage_logs_embed_title_on_enable: "RanksSetMessage 로그",
	ranksSetMessage_logs_embed_description_on_enable:
		"<@${authorId}>님이 랭크 메시지를 설정했어요!",
	ranksSetMessage_command_work_on_enable:
		"${emoji_GreenTick} | 랭크 메시지를 설정했어요.",
	ranksSetMessage_logs_embed_title_on_disable: "RanksSetMessage 로그",
	ranksSetMessage_logs_embed_description_on_disable:
		"<@${authorId}>님이 랭크 메시지를 삭제했어요!",
	ranksSetMessage_command_work_on_disable:
		"${emoji_Yes} | 사용자 지정 랭크 메시지를 삭제했어요.",
	ranksSetMessage_command_work_ls: "랭크 메시지:",
	ranksSetMessage_help_embed_fields_custom_name: "사용자 지정 메시지",
	ranksSetMessage_help_embed_fields_custom_name_empy: "설정 안 됨!",
	ranksSetMessage_help_embed_fields_default_name_empy: "기본 메시지",
	ranksSetMessage_help_embed_desc:
		"{memberUsername} => 멤버의 사용자명\n{memberMention} => 멤버 멘션\n{memberCount} => 서버 멤버 수\n{guildName} => 서버 이름\n{createdAt} => 계정 생성일 (dd/mm/yyyy)\n{xpLevel} => 사용자의 경험치(XP) 레벨\n{accountCreationTimestamp} => 계정 생성 타임스탬프",
	ranksSetMessage_button_set_name: "메시지 설정",
	ranksSetMessage_buttom_del_name: "기본 메시지",
	ranksSetMessage_awaiting_response:
		"새 사용자 지정 랭크 메시지를 입력해 주세요.",
	ranksSetMessage_embed_fields_xpmessage: "랭크 메시지",

	// /ranks ranks-ureset
	reset_uranks_are_you_sure:
		"**정말로 모든 랭크 데이터를 삭제할까요?\n이 작업은 영구적이며 되돌릴 수 없어요.**\n**파괴적인 작업이에요!!**",
	reset_uranks_logs_embed_title: "랭크 모듈 로그 (위험한 작업)",
	reset_uranks_logs_embed_desc:
		"${author}님이 ${user}님의 랭크 모듈 데이터를 모두 삭제했어요!",

	// /ranks config
	ranks_config_embed_title: "🏆 랭크 역할 설정",
	ranks_config_embed_desc:
		"경험치(XP)에 따른 서버 역할 보상을 설정해 보세요!",
	ranks_config_autofields_name: "🌟 레벨 ${level}",
	ranks_config_autofields_value:
		"역할: <@&${roleId}>\n🔓 레벨 ${level}에서 잠금 해제",
	ranks_config_nofields_name: "🚫 설정된 역할 없음",
	ranks_config_nofields_value:
		"랭크 역할을 설정해 활발한 멤버에게 보상해 보세요!",
	ranks_config_help_footer:
		"${currentPage} / ${totalPage} 페이지 • 전체 랭크: ${totalRanks}",
	ranks_config_btn_add_name: "역할 추가",
	ranks_config_btn_remove_name: "역할 제거",
	ranks_config_add_max_roles: "랭크 역할 최대 개수(25개)에 도달했어요.",
	ranks_config_add_role_menu_placeholder: "역할 선택",
	ranks_config_awaiting1_response: "특정 레벨에 지급할 역할을 선택해 주세요.",
	ranks_config_add_modal_title: "역할 레벨 설정",
	ranks_config_add_modal_fields1_placeholder: "필요 레벨",
	ranks_config_add_invalid_level: "잘못된 레벨이에요! 양수를 입력해 주세요.",
	ranks_config_add_invalid_role:
		"{role} 역할이 이미 있어요. 한 역할은 하나의 레벨에만 지정할 수 있어요.",
	ranks_config_add_command_work:
		"레벨 ${level}에 ${selectedRole} 역할을 추가했어요!",
	ranks_config_add_command_warn:
		"# WARN ⚠️ 주의: ${selectedRole} 역할에 다음과 같은 민감한 권한이 있어요:\n\n${_}",
	ranks_config_remove_no_rank: "제거할 랭크 역할이 설정되어 있지 않아요.",
	ranks_config_var_level: "레벨 {level}",
	ranks_config_remove_string_menu_desc: "레벨 ${level}의 역할 제거",
	ranks_config_remove_string_menu1_placeholder: "제거할 역할 선택",
	ranks_config_remove_awaiting_response: "제거할 역할을 선택해 주세요.",
	ranks_config_remove_command_work:
		"레벨 ${levelToRemove}의 역할을 제거했어요!",

	// Owner commands
	// /owner, /unowner, /blacklist, /unblacklist

	// /owner
	owner_not_owner:
		"iHorizon 프로젝트의 소유자가 아니에요. 이 명령어를 사용할 수 없어요.",
	owner_already_owner: "이 사용자는 이미 소유자예요!",
	owner_is_now_owner:
		"${memberUsername}님은 이제 iHorizon 프로젝트의 소유자예요!",

	// /unowner
	unowner_not_owner:
		"iHorizon 프로젝트의 소유자가 아니에요. 이 명령어를 사용할 수 없어요.",
	unowner_cant_unowner_creator:
		"이 사용자는 제거할 수 없어요. iHorizon 프로젝트의 제작자예요.",
	unowner_command_work: "${memberUsername}님은 더 이상 소유자가 아니에요",

	// /blacklist
	blacklist_not_owner:
		"iHorizon 프로젝트의 소유자가 아니에요. 이 명령어를 사용할 수 없어요.",
	blacklist_bot_lol: "저 자신을 블랙리스트에 올릴 순 없어요 x)",
	blacklist_cant_blacklist_owner:
		"iHorizon 개발자만 봇 소유자를 블랙리스트에 올릴 수 있어요.",
	blacklist_command_work: "${memberUsername}님을 블랙리스트에 올렸어요",
	blacklist_blacklisted_but_can_ban_him:
		"${emoji_No} 블랙리스트에 올렸어요. 하지만 이 서버에서는 이 멤버를 차단할 수 없어요. 권한이 없는 걸까요?",
	blacklist_already_blacklisted:
		"${memberUsername}님은 이미 블랙리스트에 있어요!",
	blacklist_no_one_blacklist:
		"${emoji_No} 블랙리스트에 오른 사용자가 없어요!",
	blacklist_var_no_reason: "사유 없음",
	blacklist_embed_title: "블랙리스트 - ${page} 페이지",
	blacklist_command_work_shard:
		"✅ 모든 샤드에 걸쳐 **${totalSuccess}**개 서버에서 ${username}님을 차단했어요 (`{score}`)",

	// /unblacklist
	unblacklist_not_owner:
		"iHorizon 프로젝트의 소유자가 아니에요. 이 명령어를 사용할 수 없어요.",
	unblacklist_command_work: "<@${memberId}>님은 더 이상 블랙리스트에 없어요",
	unblacklist_not_blacklisted: "<@${memberId}>님은 블랙리스트에 없었어요",
	unblacklist_unblacklisted_but_can_unban_him:
		"${emoji_No} 블랙리스트에서 제거했어요. 하지만 이 서버에서는 이 멤버의 차단을 해제할 수 없어요. 권한이 없거나 이미 차단 해제된 걸까요?",
	unblacklist_user_is_not_exist: "사용자를 찾을 수 없어요.",
	unblacklist_command_work_across_all_shard:
		"✅ 모든 샤드에 걸쳐 **${totalSuccess}**개 서버에서 ${bannedMemberUsername}님의 차단을 해제했어요 (`${score}`)",

	// Invite Manager commands
	// /addinvites, /invites, /leaderboard, /removeinvites

	// /addinvites
	addinvites_confirmation_embed_description:
		"${user}님에게 초대 ${amount}회를 추가했어요",
	addinvites_logs_embed_title: "초대 관리자 로그",
	addinvites_logs_embed_description:
		"<@${authorId}>님이 <@${userId}>님에게 초대 ${amount}회를 추가했어요!",

	// /invites

	// /leaderboard

	// /removeinvites
	removeinvites_not_admin_embed_description:
		"이 명령어를 사용하려면 관리자여야 해요!",
	removeinvites_confirmation_embed_description:
		"${user}님의 초대 ${amount}회를 제거했어요",
	removeinvites_logs_embed_title: "초대 관리자 로그",
	removeinvites_logs_embed_description:
		"<@${authorId}>님이 <@${userId}>님의 초대 ${amount}회를 제거했어요!",

	// /invites reset-all
	resetallinvites_warning_msg:
		"**정말로 초대 관리자의 모든 데이터를 삭제할까요?\n이 작업은 영구적이며 되돌릴 수 없어요.**\n**파괴적인 작업이에요!!**",
	resetallinvites_yes_button: "모두 삭제",
	resetallinvites_no_button: "작업 취소",
	resetallinvites_succes_on_delete: "삭제했어요!",
	resetallinvites_logs_embed_title: "초대 관리자 로그 (위험한 작업)",
	resetallinvites_logs_embed_desc:
		"${author}님이 초대 관리자의 모든 데이터를 삭제했어요!",

	// Bot commands
	// /botinfo, /invite, /kisakay, /ping, /status

	// /links
	links_message: "아래 링크를 눌러 저에 대해 더 알아보세요!",
	links_website: "내 웹사이트",
	links_gitlab: "내 GitLab",

	// /botinfo
	botinfo_embed_fields_myname: "내 이름:",
	botinfo_embed_fields_mychannels: "내 채널:",
	botinfo_embed_fields_myservers: "내 서버:",
	botinfo_embed_fields_members: "멤버:",
	botinfo_embed_fields_libraires: "라이브러리:",
	botinfo_embed_fields_created_at: "생성일:",
	botinfo_embed_fields_created_by: "제작자:",

	// /invite
	invite_embed_title: "iHorizon을 추가해 주셔서 감사해요!",
	invite_embed_description: "사랑해요! 저를 초대해서 사랑을 보여 주세요!",

	// /kisakay
	kisakay_message:
		"${emoji_Sparkles} Kisakay는 제 제작자이자 개발자예요. 그녀와 그녀의 키보드 덕분에 제가 세상에 태어났어요. 정말 깊이 감사하고 있어요!✨ ❤️❤️",

	// /andru
	andru_message:
		'Andru는 협력자이자 개발자예요. "만능 재주꾼"으로, 마케팅과 커뮤니티 등을 관리하고 있어요...',

	// /ether
	ether_message:
		"${emoji_Sparkles} Ether는 iHorizon 프로젝트의 기여자이자 팀원이었어요. iHorizon 문서와 iHorizon 설치 스크립트를 만들었고, 봇 번역을 (거의) 완벽하게 다듬어 주었어요! <t:1785567600:f>에 팀을 떠났어요.",

	// /Irisweb
	irisweb_message:
		"😼 IrisWeb은 저의 두 번째 개발자/기여자예요, IrisWeb x Kisakay ❤️",

	// /ping
	pong_message: "【:ballot_box_with_check:】__**Pong**__ : ",

	// /status
	status_be_bot_dev: ":x: | **이 작업은 봇 개발자만 할 수 있어요!**",

	// /help
	help_tip_embed:
		"```${botName} ・ 도움말 메뉴```\n${emoji_Pin} ・ 사용 가능한 명령어 카테고리 **${categorieCount}**개\n${emoji_Slash_Bot_Badge} ・ 사용 가능한 슬래시 명령어 **${slashCount}**개\n${emoji_Crown} ・ **제작자** <@${owner1}>, <@${owner2}>\n\n```알고 계셨나요? ・ 팁```\n${emoji_VC_Region} ・ ${botName}은(는) **100% 다국어**를 지원해요\n${emoji_Slash_Bot_Badge} ・ `/setlang language:Japanese`",
	help_mod_fields: "모더레이션",
	help_ranks_fields: "랭크",
	help_fun_fields: "재미",
	help_utils_fields: "유틸리티",
	help_giveaway_fields: "경품 추첨",
	help_bot_fields: "봇",
	help_music_fields: "음악",
	help_backup_fields: "백업",
	help_guildconf_fields: "서버 설정",
	help_prof_fields: "프로필 꾸미기",
	help_economy_fields: "경제",
	help_owner_fields: "소유자",
	help_roler_fields: "반응 역할",
	help_invitem_fields: "초대 관리",
	help_ticket_fields: "티켓",
	help_memberc_fields: "멤버 수",
	help_newftrs_fields: "새 기능",
	help_mod_dsc:
		"> *iHorizon의 명령어로 스트레스 없이 Discord 서버를 관리하세요.*",
	help_ranks_dsc:
		"> *경험치 레벨을 확인하며 서버에서 누가 가장 활발한지 재미있게 알아보세요!*",
	help_fun_dsc:
		"> *Discord가 지루하다고요? 좋아요, 이 카테고리가 딱이에요! iHorizon이 다시 웃음을 찾아 드릴게요!*",
	help_utils_dsc:
		"> *특정 상황에 유용한 명령어가 필요하신가요? 좋아요! 여기 있어요!*",
	help_giveaway_dsc:
		"> *너그러운 기분인가요? 커뮤니티에 무언가를 나눠 주고 싶나요? 도와 드릴 명령어가 여기 있어요!*",
	help_bot_dsc:
		"> *저에 대해 궁금해서 더 알고 싶으신가요? 이 명령어들이 그걸 위해 있어요!*",
	help_music_dsc: "> *음악 좋아하세요? 선물을 준비했어요 :)*",
	help_backup_dsc: "> *서버를 빠르게 백업해야 하나요? 제가 왔어요!*",
	help_guildconf_dsc:
		"> *강력하면서도 설정하기 쉬운 구성을 찾고 계신가요? 제가 왔어요 :3*",
	help_prof_dsc:
		"> *외모에 신경 쓰시나요? 사용자들 사이에서 멋진 프로필을 갖출 수 있는 명령어들이에요 :)*",
	help_economy_dsc:
		"> *지갑 사정을 챙기시나요? 아니면 그냥 쇼핑을 하고 싶으신가요? 제가 여기 있어요 :)*",
	help_owner_dsc:
		"> *이 카테고리는 iHorizon 프로젝트의 소유자와 관리자 전용이에요!*",
	help_roler_dsc: "> *서버에 반응 역할을 설정하고 싶으신가요? 제가 왔어요!*",
	help_invitem_dsc:
		"> *멤버의 초대 현황을 확인하고 싶으신가요? 여기 있어요!*",
	help_ticket_dsc:
		"> *티켓을 만들거나 티켓 안에서 제 기능을 사용하고 싶으신가요? 물론이죠!*",
	help_memberc_dsc:
		"> *멤버 수를 표시하는 음성 채널을 설정하고 싶으신가요? 물론이죠 :smile:*",
	help_newftrs_dsc: "> *새롭고 아주 흥미로운 기능들이에요!*",
	help_not_for_you: "이 상호작용은 회원님을 위한 것이 아니에요",
	help_protection_fields: "보호",
	help_protection_dsc:
		"> *허용 목록에 없는 사용자가 특정 작업을 하지 못하게 막아 서버를 보호하세요.*",
	help_suggestion_fields: "건의",
	help_suggestion_dsc:
		"> *사용자들이 자유롭게 의견을 낼 수 있도록 전용 채널에서 건의를 제출하게 해 보세요!*",
	help_security_fields: "보안",
	help_security_dsc:
		"> *새 멤버에게 캡차 테스트를 진행해 서버 접근을 안전하게 지키세요.*",
	help_schedule_fields: "일정",
	help_schedule_dsc:
		"> *미리 작성한 메시지로 알림을 만들면 봇이 개인 메시지로 보내 드려요*",
	help_pfps_fields: "PFPS",
	help_pfps_dsc: "> *채널에 무작위 사용자 아바타를 보내요!*",
	help_voicedashboard_fields: "VoiceDashboard",
	help_voicedashboard_dsc:
		"> *인터페이스가 있는 맞춤 임시 음성 채널을 만들어 보세요!*",
	help_select_menu: "선택해 주세요!",
	help_select_menu_fields_desc: "명령어 ${commandCount}개",
	help_back_to_menu: "메인 메뉴",
	help_back_to_menu_desc: "처음 메뉴로 돌아가기",
	help_confession_dsc:
		"> *고백할 게 있으신가요? 좋아요, 아무리 부끄러운 이야기라도 iHorizon이 들어 드릴게요!*",
	help_confession_fields: "고백",
	help_antispam_dsc:
		"> *스팸에 질리셨나요? 좋아요! iHorizon이 스팸을 관리해 드릴게요!*",
	help_antispam_fields: "스팸 방지",
	help_stats_fields: "사용자 통계",
	help_stats_dsc: "> *서버에서 사용자의 메시지 수와 음성 활동을 확인하세요*",
	help_notifier_dsc:
		"> *유튜버나 스트리머가 영상을 올리면 알림을 받아 보세요!*",
	help_notifier_fields: "알림",
	help_authrestore_fields: "AuthRestore",
	help_authrestore_dsc:
		"> *OAuth2로 서버 멤버를 인증하세요. 서버가 테러를 당하거나 삭제되어도 기존 멤버를 되찾을 수 있어요!*",
	help_tags_fields: "맞춤 태그",
	help_tags_dsc: "> *서버용 태그 메시지를 만들어 서버에서 사용해 보세요!*",
	help_starboard_dsc:
		"> *Discord 서버에서 별을 가장 많이 받은 메시지를 확인하세요.*",
	help_starboard_fields: "스타보드",
	help_blogger_dsc:
		"> *좋아하는 RSS 피드를 구독하고 새 글이 올라오면 iHorizon을 통해 알림을 받으세요.*",
	help_blogger_fields: "블로거",
	help_lastfm_dsc:
		"> *Last.fm 계정을 연결하면 음성 채널에 있는 동안 iHorizon이 재생한 곡을 자동으로 스크로블해요.*",
	help_lastfm_fields: "LastFM 스크로블러",
	help_honeypot_fields: "허니팟",
	help_honeypot_dsc:
		"> *함정 채널을 설정해 해킹된 계정을 잡아내고 서버 전체의 최근 스팸을 자동으로 정리하세요.*",

	// /h
	h_suite: "(계속)",
	h_suite_desc: "*카테고리의 명령어 계속*",
	helpall_no_perms_defined:
		"이 서버에는 맞춤 권한이 설정되어 있지 않아서 `helpall`은 쓸모가 없어요. 대신 `${botPrefix}h`를 사용하세요.",
	helpall_no_access:
		"이 서버에서 권한이 필요한 명령어 중 사용할 수 있는 게 없어요.",

	// /say
	say_footer_msg: "\n\n${author}님이 `/say`로 보냄",

	// /ping
	ping_down_msg: "**다운**",
	ping_embed_desc:
		"# Pong! ${botName}의 네트워크 상태:\n\n**[Discord 웹사이트 핑]** >> `${_net03}` ms.\n**[Cloudflare 핑]** >> `${_net02}` ms.\n**[Google 핑]** >> `${_net01}` ms.\n\n${emoji_Crown} **[iHorizon 웹사이트 핑]** >> `${_net04}` ms.\n${emoji_Crown} **[웹소켓 핑]** `${ping}` ms.\n\n## ${emoji_Pointer} **[평균]** >> (avg)`${averagePing}` ms.",

	// /custom
	custom_avatar_reset:
		"서버에서 봇의 프로필 사진을 초기화했어요. 임베드 푸터와 서버에서의 봇 프로필 사진이 기본 상태로 돌아가요.",
	custom_avatar_set:
		"${emoji_Yes} **서버에서 봇의 프로필 사진을 변경했어요. 임베드 푸터와 서버에서의 봇 프로필 사진이 변경되었어요.**\n${emoji_Crown} 새 값: `${x}`",
	custom_name_reset:
		"서버에서 봇의 이름을 초기화했어요. 임베드 푸터와 서버에서의 봇 이름이 기본 상태로 돌아가요.",
	custom_name_set:
		"${emoji_Yes} **서버에서 봇의 이름을 변경했어요. 임베드 푸터와 서버에서의 봇 이름이 변경되었어요.**\n${emoji_Crown} 새 값: `${name}`",
	custom_desc_reset:
		"서버에서 봇의 소개를 초기화했어요. 임베드 푸터와 서버에서의 봇 소개가 기본 상태로 돌아가요.",
	custom_desc_set:
		"${emoji_Yes} **서버에서 봇의 소개를 변경했어요. 임베드 푸터와 서버에서의 봇 소개가 변경되었어요.**\n${emoji_Crown} 새 값: `${desc}`",
	custom_banner_reset: "서버에서 봇의 배너를 초기화했어요.",
	custom_banner_set:
		"${emoji_Yes} **서버에서 봇의 배너를 변경했어요.**\n${emoji_Crown} 새 값: `${x}`",
	custom_sdk_only:
		"이 명령어는 정식 버전에서 `Custom iHorizon Profile` 구독이 있는 서버에서만 사용할 수 있어요.",
	custom_sdk_only_title: "Custom iHorizon Profile로 iHorizon을 응원해 주세요",
	custom_sdk_only_description:
		"저희 봇은 2022년부터 무료 오픈 소스로 운영되어 왔어요. 봇을 계속 운영하고, 개발하고, 호스팅하려면 수익이 필요해요. 서버, 부스트, 도메인, 라이선스 등 운영 비용이 1년에 약 500 EUR 정도 들어요.\n\n`/custom` 명령어로 아바타, 이름, 배너, 소개를 편집해 서버에서 iHorizon의 정체성을 바꿀 수 있어요. 이 명령어를 사용하면 서버에서 iHorizon의 시각적 정체성이 사라져요.\n\n그래서 월 2.99 USD의 Discord 연동 구독을 추가했어요.\n\n이 구독을 구매하면 이 명령어를 사용할 수 있어요. OWN-IHRZ 같은 맞춤 봇이라고 생각하시면 되는데, 안정적이고 깔끔하며 모든 기능이 완벽하게 작동해요.",

	// Fun commands
	// /caracteres, /cats, /hack, /hug, /kiss, /morse, /poll, /question, /slap

	// Fun Var
	fun_var_down_api: "오류: API가 다운된 것 같아요!",
	fun_var_good_sentence: "제대로 된 문장을 보내 주세요!",

	// /cats

	// /duck

	// /panda

	// /fox

	// /dolphin

	// /frog

	// /squirrel

	// /hack
	hack_embed_description: "<@${authorId}>님이 <@${victimId}>님을 해킹했어요!",

	// /hug

	// /kiss

	// /poll
	poll_not_admin: "이 작업을 할 권한이 없어요!",

	// /question
	question_not_full: "3단어 이상으로 된 완전한 질문을 입력해 주세요!",
	question_s: [
		"네.",
		"아니요.",
		"모르겠어요.",
		"잘 모르겠네요!",
		"제정신이에요?!",
		"사양할게요.",
		"아니요.",
		"네."
	],
	question_fields_input_embed: ":question:__**질문**__",
	question_fields_output_embed: ":grey_exclamation:__**답변:**__",
	question_embed_title: "__**질문**__: `${authorUsername}`",

	// /slap

	// /dogs
	dogs_embed_command_error: "강아지 이미지를 가져오는 중 오류가 발생했어요.",

	// /love
	love_embed_description:
		"**${user1Username}** + **${user2Username}** = 사랑 __${randomNumber}%__ 💗",
	love_command_error: "이미지를 만드는 중 오류가 발생했어요",

	// /fun disable
	fun_disable_command_msg:
		"${author}님, 재미 카테고리를 ${action_type}(으)로 설정했어요!",
	fun_category_disable:
		"이 서버에서는 재미 명령어 카테고리가 사용 안 함으로 설정되어 있어서 이 명령어를 사용할 수 없어요.",

	// /fun gay

	// /fun stench

	// /fun rate

	// /fun caracteres
	fun_caracteres_command_ok: "변환할 텍스트를 입력해 주세요!",
	fun_caracteres_embed_desc:
		"원본 텍스트: **${inputText}**\n\n아래 드롭다운에서 스타일을 골라 텍스트를 변환해 보세요.",
	fun_caracteres_select_menu_placeholder: "글꼴 스타일 선택...",

	// /fun random dice

	// /fun random heads-tails
	fun_coinflip_result_heads: "앞면",
	fun_coinflip_result_tails: "뒷면",

	// /fun random number

	// +transgender

	// Economy commands
	// /addmoney, /balance, /daily, /monthly, /pay, /removemoney, /rob, /weekly, /work

	economy_cooldown_error:
		"**${time}** 후에 이 명령어를 다시 사용할 수 있어요!",

	// /addmoney
	addmoney_not_admin:
		"필요한 권한 `ADMINISTRATOR`가 없어서 이 명령어를 실행할 수 없어요",
	addmoney_logs_embed_title: "경제 로그",
	addmoney_logs_embed_description:
		"<@${authorId}>님이 <@${userId}>님에게 코인 ${amountValue}개를 추가했어요!",
	addmoney_command_work: "<@${userId}>님에게 `${amountValue}$`를 추가했어요",

	// /balance
	balance_dont_have_wallet: "👛 지갑이 없어요...",
	balance_he_dont_have_wallet: "${emoji_Wallet} ${user}님은 지갑이 없어요...",
	balance_have_wallet: "👛 코인 ${bal}개를 가지고 있어요!",
	balance_he_have_wallet:
		"${emoji_Wallet} ${user}님은 코인 ${bal}개를 가지고 있어요!",
	balance_embed_fields1_name: "은행",
	balance_embed_fields2_name: "잔액",

	// /daily
	daily_cooldown_error:
		"죄송해요, **${time}** 후에 이 명령어를 실행할 수 있어요!",
	daily_embed_title: "일일",
	daily_embed_description: "**일일 보상**",
	daily_embed_fields: "받은 금액",

	// /monthly
	monthly_cooldown_error:
		"죄송해요, **${time}** 후에 이 명령어를 실행할 수 있어요!",
	monthly_embed_title: "월간",
	monthly_embed_description: "**월간 보상**",
	monthly_embed_fields: "받은 금액",

	// /pay
	pay_negative_number_error: "음수 금액은 지불할 수 없어요.",
	pay_dont_have_enought_to_give:
		"잔액보다 많은 금액이에요. 다시 시도해 주세요.",
	pay_command_work:
		"${authorUsername}님, ${userUsername}님에게 `${amount}$`를 지불했어요.",

	// /removemoney
	removemoney_not_admin:
		"필요한 권한 `ADMINISTRATOR`가 없어서 이 명령어를 실행할 수 없어요",
	removemoney_embed_title: "돈을 제거했어요!",
	removemoney_embed_fields: "금액",
	removemoney_embed_second_fields: "갱신된 잔액",
	removemoney_logs_embed_description:
		"<@${authorId}>님이 <@${userId}>님에게서 코인 ${amount}개를 제거했어요!",
	removemoney_logs_embed_title: "경제 로그",

	// /rob
	rob_cooldown_error: "**50분 후에 다시 사용자를 털 수 있어요!**",
	rob_dont_enought_error: ":x: 누군가를 털려면 최소 250$가 필요해요.",
	rob_him_dont_enought_error:
		":x: ${userUsername}님은 털 만큼의 돈이 없어요.",
	rob_embed_description:
		"<@${authorId}>님, <@${userId}>님을 털어서 ${random}을(를) 챙겨 달아났어요!",

	// /weekly
	weekly_cooldown_error:
		"죄송해요, **${time}** 후에 이 명령어를 실행할 수 있어요!",
	weekly_embed_title: "주간",
	weekly_embed_description: "**주간 보상**",
	weekly_embed_fields: "받은 금액",

	// /work
	work_cooldown_error:
		"<@${authorId}>님, **${time}분 후에 다시 일할 수 있어요!**",
	work_embed_author: "${authorUsername}님, 노력의 대가예요!",
	work_embed_description:
		"${authorUsername}님, 열심히 일해서 ${amount}$를 벌었어요!",

	// /withdraw
	withdraw_cannot_abuse:
		"${emoji_No} | 은행에 있는 것보다 많은 코인은 출금할 수 없어요!",
	withdraw_embed_title: "은행에서 출금",
	withdraw_embed_desc:
		"${author}님, `은행`에서 ${toWithdraw}${emoji_Coin}을(를) 출금했어요",
	withdraw_embed_fields1_name: "은행",

	// /deposit
	deposit_cannot_abuse:
		"${emoji_No} | 지갑에 있는 것보다 많은 코인은 입금할 수 없어요!",
	deposit_embed_title: "은행에 입금",
	deposit_embed_desc:
		"${author}님, `은행`에 ${toDeposit}${emoji_Coin}을(를) 입금했어요",
	deposit_embed_fields1_name: "은행",

	// /leaderboard
	economy_leaderboard_embed_title: "`${guildName}`의 경제 순위표",
	economy_leaderboard_embed_fields_value:
		"<@${userId}> - 은행: `${bank}`${emoji_Coin} | 잔액: `${money}`${emoji_Coin}",

	// /economy (money and cooldown commands)
	economy_action_in_progress:
		"${emoji_No} | 이전 경제 명령어가 아직 실행 중이에요. 잠시 후 다시 시도해 주세요.",

	// /economy disable
	economy_disable_not_admin:
		":x: | 이 명령어를 사용하려면 이 서버의 관리자여야 해요!",
	economy_disable_already_disable:
		"<@${authorId}>님, 경제 모듈은 이미 **사용 안 함** 상태예요!",
	economy_disable_already_enable:
		"<@${authorId}>님, 경제 모듈은 이미 **사용** 중이에요!",
	economy_disable_set_enable:
		"<@${authorId}>님, 경제 모듈을 **사용**으로 설정했어요!",
	economy_disable_set_disable:
		"<@${authorId}>님, 경제 모듈을 **사용 안 함**으로 설정했어요!",
	economy_disable_logs_embed_desc:
		"<@${authorId}>님이 경제 모듈을 `${state}`(으)로 설정했어요!",
	economy_disable_logs_embed_title: "경제 로그",

	// /economy boost-set
	economy_boost_role_not_found:
		"역할을 찾을 수 없어요. 역할의 가격을 설정해야 해요.",
	economy_boost_embed_title: "경제 시스템 - 구매 가능한 역할",
	economy_boost_embed_desc: "구매 가능한 모든 역할이 아래에 있어요.",

	// /economy role add
	economy_role_add_no_role: "삭제할 구매 가능한 역할이 없어요.",
	economy_role_add_max_20_roles:
		"구매 가능한 역할은 최대 20개까지만 둘 수 있어요.",
	economy_role_add_canceled: "역할이 구매 가능한 역할에 추가되지 않았어요.",
	economy_role_add_prompt_dangerous:
		"이 역할을 구매 가능한 역할에 추가할까요?\n**경고:** 이 역할에는 위험한 권한이 있어요.\n권한: ${stringDangerousPermissions}",

	// /economy shop
	economy_shop_embed_title: "🛍️ `${guildName}`의 상점",
	economy_shop_embed_desc:
		"상점에서 돈으로 아이템/역할을 구매할 수 있어요. 구매 가능한 역할은 아래에서 확인하세요.",
	economy_shop_not_available: "선택한 역할은 구매할 수 없어요.",
	economy_shop_already_own_role: "이미 이 역할을 가지고 있어요.",
	economy_shop_not_enough_money: "이 역할을 구매할 돈이 부족해요.",
	economy_shop_role_add_failed:
		"이 역할을 지급할 수 없어서 결제되지 않았어요. 역할이 아직 존재하는지, 제 가장 높은 역할보다 아래에 있는지 관리자에게 확인을 요청해 주세요.",
	economy_shop_role_purchased:
		"**{roleName}** 역할을 **${rolePrice}** 💰에 구매했어요.",
	economy_shop_unknown_role: "알 수 없는 역할",
	economy_shop_not_set:
		"이 서버에는 구매 가능한 역할이 없어요. 자세한 내용은 서버 관리자에게 문의해 주세요.",
	economy_shop_already_owned: "이미 보유 중",
	economy_shop_menu_placeholder: "구매할 역할 선택",

	// /economy manage-rewards set-cooldown
	economy_manage_rewards_cooldown_invalid_time:
		"시간 형식이 올바르지 않아요. 올바른 시간 형식을 사용해 주세요.",
	economy_manage_rewards_cooldown_command_ok:
		"${type}의 쿨다운을 ${stime}(으)로 설정했어요",

	// /economy mange-rewards set-money
	economy_manage_rewards_set_money:
		"${type}의 금액을 ${money}(으)로 설정했어요",

	// /economy role list
	economy_role_list_no_buyable_roles: "표시할 구매 가능한 역할이 없어요.",
	economy_role_list_embed_title: "경제 시스템 - 구매 가능한 역할",
	economy_role_list_embed_desc: "구매 가능한 모든 역할이 아래에 있어요.",

	// /economy economy-ureset
	reset_ueconomy_are_you_sure:
		"**정말로 모든 경제 데이터를 삭제할까요?\n이 작업은 영구적이며 되돌릴 수 없어요.**\n**이 작업은 파괴적이에요!!**",
	reset_ueconomy_logs_embed_title: "경제 모듈 로그 (위험한 작업)",
	reset_ueconomy_logs_embed_desc:
		"${author}님이 ${user}님의 경제 모듈 데이터를 모두 삭제했어요!",

	// /economy economy-greset
	reset_geconomy_are_you_sure:
		"**정말로 서버의 모든 멤버에 대한 경제 데이터를 삭제할까요?\n이 작업은 영구적이며 되돌릴 수 없어요.**\n**이 작업은 파괴적이에요!!**",
	reset_geconomy_logs_embed_title: "경제 모듈 로그 (매우 위험한 작업)",
	reset_geconomy_logs_embed_desc:
		"${author}님이 **모든 사람**의 경제 모듈 데이터를 삭제했어요!",

	// Profile Customization commands
	// /setprofilage, /setprofildescriptions, /profil

	// /setprofilage
	setprofilage_command_work: "**프로필 나이를 업데이트했어요.**",

	// /setprofildescriptions
	setprofildescriptions_command_work: "**소개를 업데이트했어요.**",

	// /profil
	profil_not_description_set: "설정된 소개가 없어요!",
	profil_unknown: "알 수 없음",
	profil_embed_title: "${emoji_Pin} __${memberTag}님의 프로필__",
	profil_embed_fields_nickname: "📝 ・ __별명__",
	profil_embed_fields_money: "🪙 ・ __돈__",
	profil_embed_fields_money_value: " 코인",
	profil_embed_fields_xplevels: "💳 ・ __경험치(XP) 레벨__",
	profil_embed_fields_xplevels_value: " 경험치(XP) 레벨",
	profil_embed_fields_age: "🎂 ・ __나이__",
	profil_embed_fields_age_value: "세",
	profil_embed_fields_gender: "👤 ・ __성별__",
	profil_embed_fields_pronouns: "📌 ・ __대명사__",
	profil_embed_fields_birthdate: "🎂 ・ __생일__",

	// /profil set-birthday
	profil_birthday_month_button_label: "월 설정",
	profil_birthday_day_button_label: "일 설정",
	profil_birthday_year_button_label: "연도 설정",
	profil_birthday_embed_title: "🎂 ・ 생일을 설정하세요!",
	profil_birthday_embed_introduction:
		"${emoji_Sparkles} **모든 사람에게는 생일이 있죠!**${emoji_Sparkles}\n\n${emoji_Crown} ・ 안녕하세요, ${author}님\n:tada: ・ 생일을 축하할 수 있도록 지금 설정해 보세요!\n",
	profil_birthday_embed_current_birthday:
		"${emoji_Pin} ・ **현재 생일**: `${birthdayMonth}/${birthdayDay}/${birthdayYear}` (MM/DD/YYYY 형식)",
	profil_birthday_modal1_title: "태어난 연도를 입력하세요",
	profil_birthday_modal1_fields1_label: "연도",
	profil_birthday_invalid_year:
		"올바르지 않은 연도예요! 올바른 연도를 입력해 주세요.",
	profil_birthday_year_already_set: "연도가 이미 설정되어 있어요.",
	profil_birthday_year_set: "연도를 설정했어요!",
	profil_birthday_modal2_title: "태어난 월을 입력하세요",
	profil_birthday_modal2_fields1_label: "월",
	profil_birthday_invalid_month:
		"올바르지 않은 월이에요! 올바른 월을 입력해 주세요.",
	profil_birthday_month_already_set: "월이 이미 설정되어 있어요.",
	profil_birthday_month_set: "월을 설정했어요!",
	profil_birthday_modal3_title: "태어난 일을 입력하세요",
	profil_birthday_modal3_fields1_label: "일",
	profil_birthday_invalid_day:
		"올바르지 않은 일이에요! 올바른 일을 입력해 주세요.",
	profil_birthday_day_already_set: "일이 이미 설정되어 있어요.",
	profil_birthday_day_set: "일을 설정했어요!",

	// Utils commands
	// /serverinfo, /snipe, /userinfo, /renew

	// /serverinfo

	// /setrankroles
	setrankroles_not_admin:
		"${emoji_No} 이 서버의 관리자가 아니어서 이 명령어를 실행할 수 없어요!",
	setrankroles_already_this_in_db:
		"${emoji_No} 이 서버의 랭크 역할이 이미 데이터베이스에 있어요.",
	setrankroles_not_roles_typed:
		"${emoji_No} 명령어에 역할을 포함하지 않았어요!",
	setrankroles_logs_embed_description_enable:
		"<@${authorId}>님이 랭크 역할을 <@&${argsid}>(으)로 설정했어요",
	setrankroles_logs_embed_title_enable: "랭크 역할 설정",
	setrankroles_logs_embed_description_disable:
		"<@${authorId}>님이 랭크 역할을 삭제했어요!",
	setrankroles_logs_embed_title_disable: "랭크 역할 설정",
	setrankroles_command_work_disable:
		"<@${authorId}>님, 랭크 역할을 삭제했어요!",
	setrankroles_command_error:
		"${emoji_No} 명령어 실행 중 오류가 발생했어요! 나중에 다시 시도해 주세요.",

	// /snipe
	snipe_no_previous_message_deleted: "이 채널에서 삭제된 메시지가 없어요!",

	// /userinfo
	userinfo_wait_please: "${emoji_Timer} 잠시만 기다려 주세요...",
	userinfo_var_notfound: "`찾을 수 없음`",
	userinfo_button_label: "사용자 프로필",

	// /renew
	renew_channel_send_success: "${author}님, 채널을 다시 만들었어요!",
	renew_dont_have_permission: ":x: **할 수 없어요** `권한이 없어요!`",
	renew_not_administrator: ":x: **이 명령어를 사용하려면 관리자여야 해요!**",

	// /renewvc
	renewvc_not_in_voice:
		"${emoji_No} 이 명령어를 사용하려면 음성 채널에 연결되어 있어야 해요!",
	renewvc_region_success:
		"${emoji_Yes} ${targetVc}의 음성 지역을 자동으로 설정했어요!",
	renewvc_dont_have_permission: ":x: **할 수 없어요** `권한이 없어요!`",

	// /prevnames
	prevnames_undetected: "데이터가 없어요!",
	prevnames_not_admin: "이 명령어를 실행할 `ADMINISTRATOR` 권한이 없어요!",
	prevnames_data_erased: "요청에 따라 이전 사용자명을 모두 삭제했어요!",
	prevnames_embed_footer_text: "iHorizon | 페이지 ${page}/${pageCount}",

	// /blockbot
	blockbot_not_owner: ":x: **서버 소유자가 아니에요!**",
	blockbot_logs_enable_title: "BlockBot 로그",
	blockbot_logs_enable_description:
		"${author}님(서버 소유자)이 `BlockBot`을 __사용__으로 설정했어요. 이제 이 서버에 봇을 추가할 수 **없어요**!",
	blockbot_command_work_on_enable:
		"**`BlockBot`을 사용으로 설정했어요**\n이제 이 서버에 봇을 추가할 수 **없어요**!",
	blockbot_command_work_on_disable:
		"**`BlockBot`을 사용 안 함으로 설정했어요**\n이제 이 서버에 봇을 추가할 수 **있어요**!",
	blockbot_logs_disable_commmand_work: "BlockBot 로그",
	blockbot_logs_disable_description:
		"${author}님(서버 소유자)이 `BlockBot`을 __사용 안 함__으로 설정했어요. 이제 이 서버에 봇을 추가할 수 **있어요**!",

	// /banner
	banner_guild_no_banner: "서버에 배너가 없어요.",
	banner_user_no_banner: "이 사용자는 배너가 없어요.",

	// /massiverole
	massiverole_too_much_member:
		"멤버가 너무 많아요. 속도 제한에 걸릴 수 있어서 진행할 수 없어요!",

	// /nickrole
	nickrole_too_much_member:
		"멤버가 너무 많아요. 속도 제한에 걸릴 수 있어서 진행할 수 없어요!",

	// /emoji
	emoji_send_new_emoji:
		"**${emojiName}** 이름으로 __새 이모지를 만들었어요__! (${emoji})",
	emoji_send_err_emoji:
		"**${emojiName}** 이름으로 __새 이모지를 만드는 중 오류가 발생했어요__!",

	// /derank
	derank_msg_failed: "역할을 제거하는 중 오류가 발생했어요.",
	derank_no_role: "이 멤버에게는 제거할 역할이 없어요.",

	// /action unban all
	action_unban_all_no_banned_members: "차단된 멤버가 없어요.",
	action_mass_job_running:
		"이 서버에서 같은 종류의 일괄 작업이 이미 실행 중이에요. 끝날 때까지 기다려 주세요.",

	// /action unban undo

	// /vc
	vc_embed_desc:
		"## 음성 상태\n멤버 `${voiceCount}`명이 음성 채널에 있어요:\n${emoji_iHorizon_Streaming} **=>** ${streaming}\n${emoji_iHorizon_Deaf} **=>** ${deafened}\n${emoji_iHorizon_Mute} **=>** ${muted}\n${emoji_iHorizon_Camera} **=>** ${video}\n## 멤버 상태\n멤버 `${memberCount}`명이 서버에 있어요:\n${emoji_DND} **=>** ${dnd}\n${emoji_Online} **=>** ${online}\n${emoji_Idle} **=>** ${idle}\n${emoji_Invisible} **=>** ${offline}\n## 부스트 상태\n서버에 부스트 `${boostCount}`개,\n${members}",
	vc_embed_fields_1_name: "・멤버 수",
	vc_embed_fields_1_value: "```py\n멤버 ${memberCount}명```",
	vc_embed_fields_2_name: "・채널 수",
	vc_embed_fields_2_value:
		"```py\n텍스트 채널 ${textChannelSize}개\n음성 채널 ${voiceChannelSize}개```",
	vc_embed_short_desc:
		"## 음성 상태\n멤버 `${voiceCount}`명이 음성 채널에 있어요:\n${emoji_iHorizon_Streaming} **=>** ${total_members_vc_streaming}\n${emoji_iHorizon_Deaf} **=>** ${total_members_vc_deaf}\n${emoji_iHorizon_Mute} **=>** ${total_members_vc_mute}\n${emoji_iHorizon_Camera} **=>** ${total_members_vc_video}\n## 멤버 상태\n멤버 `${total_members_size}`명이 서버에 있어요:\n${emoji_DND} **=>** ${total_members_states_dnd}\n${emoji_Online} **=>** ${total_members_states_online}\n${emoji_Idle} **=>** ${total_members_states_idle}",

	// /massmove
	massmove_too_much_member:
		"멤버가 너무 많아요. 속도 제한에 걸릴 수 있어서 진행할 수 없어요!",

	// /all-admins
	all_admins_nobody_admins: "이 서버에는 관리자가 없어요!",
	all_admins_unrank_button_label: "모두 강등",
	all_admins_unrank_not_owner:
		"서버의 모든 관리자를 강등할 수 있는 건 서버 소유자뿐이에요",

	// /allbots

	// /addrole
	utils_addrole_highter_or_egal_roles_msg:
		"${emoji_Stop} 나보다 높은 역할을 가진 사용자에게는 역할을 추가할 수 없어요...",
	utils_addrole_command_ok:
		"${author}님이 ${user}님에게 ${role} 역할을 추가했어요",
	utils_addrole_not_wl:
		"${emoji_No} | 사용자에게 추가하려는 역할이 허용 목록에 없어요. 관리자가 먼저 추가해야 해요! (`/utils wlroles` 사용)",
	utils_addrole_cant_level:
		"관리자도 아닌 사용자한테 관리자 역할을 주려고요? 저 놀리는 거예요? 서버 날려 버리고 싶어요?",
	utils_addrole_try2brain:
		"봇의 역할이 계층에서 너무 낮아요. 그 말도 안 되는 역할은 지급할 수 없어요, 미안해요.",

	// /delrole
	utils_delrole_highter_or_egal_roles_msg:
		"${emoji_Stop} 나보다 높은 역할을 가진 사용자의 역할은 제거할 수 없어요...",
	utils_delrole_command_ok:
		"${author}님이 ${user}님에게서 ${role} 역할을 제거했어요",
	utils_delrole_not_wl:
		"${emoji_No} | 사용자에게서 제거하려는 역할이 허용 목록에 없어요. 관리자가 먼저 추가해야 해요! (`/utils wlroles` 사용)",
	utils_delrole_try2brain:
		"봇의 역할이 계층에서 너무 낮아요. 그 말도 안 되는 역할은 제거할 수 없어요, 미안해요.",

	// /utils wlroles
	utils_wlroles_embed_title: "허용 역할 목록",
	utils_wlroles_embed_desc:
		"`addrole`, `delrole` 명령어로 부여할 수 있는 허용 역할 목록이에요!",
	utils_wlRoles_logsEmbed_title: "허용 역할 모듈",
	utils_wlRoles_logsEmbed_desc:
		"${author} 님이 wlRoles(`addrole`, `delrole` 명령어용)를 편집했어요",
	utils_derogation_already_exists:
		"${emoji_No} 예외 역할 ${role}은(는) 이미 올바르게 설정되어 있어요",
	utils_derogation_created:
		"${emoji_Yes} 예외 역할 ${role}을(를) 만들었어요. 동기화된 채널: `${updatedChannels}`. 실패: `${failedChannels}`",
	utils_derogation_resynced:
		"${emoji_Yes} 예외 역할 ${role}이(가) 이미 있어서 채널 `${updatedChannels}`개를 다시 동기화했어요. 실패: `${failedChannels}`",

	// /utils dm
	utils_dm: "${emoji_Yes} ${targetMember} 님에게 메시지를 보냈어요.",
	utils_dm_cant:
		"${emoji_No} ${targetMember} 님에게 메시지를 보낼 수 없었어요. 개인 메시지를 막아 두었거나 저를 차단했을 수 있어요!",

	// /utils pic-only
	utils_pic_only_embed_title: "미디어 전용 채널",
	utils_pic_only_emnbed_desc:
		"사진/이미지/동영상만 허용되는 채널이에요. 다른 콘텐츠(일반 텍스트 메시지 등)는 봇이 막아요.",
	utils_piconly_embed_fields_3_name: "타임아웃 시간",
	utils_piconly_select1_option1_label: "타임아웃 시간 변경",
	utils_piconly_select1_option2_label: "임계값 변경",
	utils_piconly_modal1_title: "미디어 전용 - 시간 설정",
	utils_piconly_modal1_fields1_placeholder: "타임아웃 시간",
	utils_piconly_modal1_fields1_label: "타임아웃 시간",
	utils_piconly_modal2_title: "미디어 전용 - 임계값 설정",
	utils_piconly_modal2_fields1_placeholder: "타임아웃 전까지의 임계값",
	utils_piconly_modal2_fields1_label: "임계값",
	utils_piconly_embed_fields2_placeholder:
		"이미지/동영상 아래에 스레드 만들기",
	utils_piconly_var_thread_name: "{name} 님의 스레드",

	// /zip-emojis
	zip_emojis_doesnt_have_perm: "이모지를 관리할 권한이 없어요.",
	zip_emojis_command_work:
		"🎉 **${calcTime}**ms 만에 내보내기 완료! 이모지 ${emojiCount}개가 담긴 압축 파일이에요.",
	zip_emojis_command_error: "이모지를 내보내는 중 오류가 발생했어요.",

	// /zip-stickers
	zip_stickers_doesnt_have_perm: "스티커를 관리할 권한이 없어요.",
	zip_stickers_command_work:
		"🎉 **${calcTime}**ms 만에 내보내기 완료! 스티커 ${stickerCount}개가 담긴 압축 파일이에요.",
	zip_stickers_command_error: "스티커를 내보내는 중 오류가 발생했어요.",

	// +sticker
	sticket_no_sticker: "답장한 메시지에서 스티커를 찾을 수 없어요.",
	sticket_command_work: "스티커 `${name}`을(를) 만들었어요.",
	sticker_command_error:
		"스티커를 만들 수 없었어요. 오류가 발생했어요: `${errMessage}`.",
	sticket_command_error2: "스티커가 포함된 메시지에 답장해 주세요.",

	// /util nick-kicker
	util_nick_kicker_embed_desc:
		"멤버의 별명에 특정 단어가 들어 있으면 추방돼요.",
	util_nick_kicker_words: "단어",
	util_nick_kicker_select_to_remove: "제거할 단어를 선택하세요",
	util_nick_kicker_remove_word: "이 단어 제거",
	util_nick_kicker_no_word_to_remove: "제거할 단어가 없어요",
	util_nick_kicker_add_word: "단어 추가",
	util_nick_kicker_words_max_15: "단어는 15개까지만 추가할 수 있어요",
	util_nick_kicker_disable: "사용 안 함",
	util_nick_kicker_remove_word2: "단어 제거",
	util_nick_kicker_remove_desc: "nick-kicker에서 단어 제거",
	util_nick_kicker_add_desc: "nick-kicker에 단어 추가",
	util_nick_kicker_disable_desc: "nick-kicker 끄기",
	util_nick_kicker_enable_desc: "nick-kicker 켜기",

	// /util wakeup
	util_wakeup_yourself:
		"야, 정신 차려? 설마 이 명령어 치면서 키보드 위에서 자고 있는 건 아니지? ㅋㅋ",
	util_wakeup_not_in_vc:
		"야, 봇이 ${userDisplayName} 님을 같은 프로필 사진이랑 배너로 복제해서 깨어난 척하게 만들 순 없어... 음성 채널에 있지도 않잖아 ㅋㅋ",
	util_wakeup_command_work: "${user} 님 깨우러 가자!",

	// /util talk
	util_talk_not_in_vc: "이 명령어를 쓰려면 음성 채널에 있어야 해요.",
	util_talk_already_active:
		"${voiceChannel}에서 이미 발언 모드가 켜져 있어요. 먼저 거기서 꺼 주세요.",
	util_talk_audit_reason: "음성 발언 모드 사용",
	util_talk_logs_title: "음성 발언 모드",
	util_talk_logs_description:
		"${author} 님이 ${voiceChannel}에서 발언 모드를 켜고 멤버 ${mutedCount}명의 마이크를 껐어요. 멤버 ${skippedCount}명은 건너뛰었어요.",
	util_talk_command_work:
		"이제 ${voiceChannel}에서 발언 모드가 켜졌어요. 멤버 ${mutedCount}명의 마이크를 껐고 ${skippedCount}명은 건너뛰었어요.",

	// /util untalk
	util_untalk_nothing_active: "이 서버에는 활성화된 발언 모드가 없어요.",
	util_untalk_audit_reason: "음성 발언 모드 사용 안 함",
	util_untalk_logs_title: "음성 발언 모드 해제",
	util_untalk_logs_description:
		"${author} 님이 ${voiceChannel}에서 발언 모드를 끄고 멤버 ${unmutedCount}명의 마이크를 다시 켰어요.",
	util_untalk_command_work:
		"${voiceChannel}에서 발언 모드를 껐어요. 멤버 ${unmutedCount}명의 마이크를 다시 켰어요.",

	// /util freeze
	util_freeze_logs_title: "음성 채널 동결",
	util_freeze_logs_description:
		"${author} 님이 ${voiceChannel} 접근을 동결했어요.",
	util_freeze_command_work:
		"이제 음성 채널 ${voiceChannel}이(가) 동결되었어요.",

	// /util wlvc
	util_wlvc_no_member: "동결된 음성 채널에 허용할 멤버를 지정해야 해요.",
	util_wlvc_no_freeze: "이 서버에는 동결된 음성 채널이 없어요.",
	util_wlvc_logs_title: "음성 채널 동결 허용",
	util_wlvc_logs_description:
		"${author} 님이 ${member} 님의 동결된 음성 채널 입장을 허용했어요.",
	util_wlvc_command_work:
		"이제 ${member} 님은 동결된 음성 채널에 들어갈 수 있어요.",

	// /util unwlvc
	util_unwlvc_no_member:
		"동결된 음성 채널 허용 목록에서 제거할 멤버를 지정해야 해요.",
	util_unwlvc_no_freeze: "이 서버에는 동결된 음성 채널이 없어요.",
	util_unwlvc_not_whitelisted:
		"${member} 님은 동결된 음성 채널에 허용되어 있지 않아요.",
	util_unwlvc_logs_title: "음성 채널 동결 허용 제거",
	util_unwlvc_logs_description:
		"${author} 님이 ${member} 님을 동결된 음성 채널 허용 목록에서 제거했어요.",
	util_unwlvc_command_work:
		"이제 ${member} 님은 동결된 음성 채널에 들어갈 수 없어요.",

	// /util unfreeze
	util_unfreeze_no_freeze: "이 서버에는 동결된 음성 채널이 없어요.",
	util_unfreeze_logs_title: "음성 채널 동결 해제",
	util_unfreeze_logs_description:
		"${author} 님이 활성화된 음성 채널 동결을 해제했어요.",
	util_unfreeze_command_work: "음성 채널 동결이 해제되었어요.",

	// /util leash
	util_leash_too_naugthy: "이 장난꾸러기, 3명 넘게 목줄을 채울 순 없어요 :D",
	util_leah_already_owned:
		"이 장난꾸러기, 이 귀염둥이들은 이미 당신 거예요 :smirk:",
	util_leash_confirm_message:
		"${emoji_No} | 목줄을 채우려는 멤버가 음성 채널에 없어요!\n${emoji_Warning_Icon} | 정말 이 작업을 계속할까요?",
	util_leash_canceled_leash: "${emoji_Yes} | 목줄 설정을 취소했어요",
	util_leash_confirmed_leash:
		"${emoji_Yes} | 이 서버에서 사용자에게 목줄을 채웠어요 :smirk:",

	// /util unleash
	util_unleash_not_in_leash:
		"${emoji_No} | 이 사용자는 당신의 목줄에 묶여 있지 않아요!",
	util_unleash_command_ok:
		"${emoji_Yes} | 이 서버에서 사용자의 목줄을 풀었어요 :)",

	// /utilss leashlist
	util_leashlist_no_data: "${emoji_No} | 이 서버에는 활성화된 목줄이 없어요.",
	util_leashlist_embed_title: "활성화된 목줄",

	// /util lockname, /util unlockname
	util_lockname_not_in_guild: "${emoji_No} | 이 멤버는 서버에 없어요!",
	util_lockname_not_manageable:
		"${emoji_No} | 이 멤버의 별명을 관리할 권한이 없어요!",
	util_lockname_already_locked:
		"${emoji_No} | 이 멤버의 별명은 이미 잠겨 있어요!",
	util_lockname_success:
		"${emoji_Yes} | 이제 ${member} 님의 별명이 **${nick}**(으)로 잠겼어요!",
	util_lockname_success_reset:
		"${emoji_Yes} | 이제 ${member} 님의 별명이 잠겼어요!",
	util_unlockname_not_locked:
		"${emoji_No} | 이 멤버의 별명은 잠겨 있지 않아요!",
	util_unlockname_success:
		"${emoji_Yes} | ${member} 님의 별명 잠금을 해제했어요!",
	util_lockname_logs_embed_title: "별명 잠금 로그",
	util_lockname_logs_embed_description:
		"<@${authorId}> 님이 <@${memberId}> 님의 별명을 잠갔어요",
	util_unlockname_logs_embed_description:
		"<@${authorId}> 님이 <@${memberId}> 님의 별명 잠금을 해제했어요",

	util_locknamelist_empty:
		"${emoji_No} | 이 서버에는 잠긴 별명이 없어요! `/utilss lockname`으로 만들어 보세요.",
	util_locknamelist_embed_title: "잠긴 별명",

	// /util autorenew
	util_autorenew_time_too_short: "채널 갱신 간격은 1분보다 길어야 해요",
	util_autorenew_time_too_long: "채널 갱신 간격은 30일보다 짧아야 해요",
	util_autorenew_command_ok:
		"${emoji_Yes} 이제 ${channel} 채널이 ${time}마다 자동으로 삭제 후 다시 만들어져요(갱신)!\n갱신을 멈추려면 채널을 직접 삭제하면 돼요.",
	event_autorenew_channel_renewed: "AutoRenew가 채널을 갱신했어요!",
	event_autorenew_channel_warning:
		"AutoRenew 모듈이 이 채널을 갱신하도록 설정되어 있어요. 다음 갱신까지 ${time} 남았어요.",

	// /util where
	var_video: "동영상",
	var_whereis: "위치:",
	util_not_in_vc: "멤버들이 음성 채널에 없어요",

	// /util allwebhooks
	util_no_webhooks: "이 서버에는 웹후크가 없어요.",
	util_allwebhooks_embed_title: "모든 웹후크",
	util_allwebhooks_deleting: "모든 웹후크를 삭제하는 중...",
	util_allwebhooks_deleted: "웹후크 **`${u}`**개를 삭제했어요!",

	// /util unzip-emojis
	util_unzip_emojis_command_work:
		"🎉 **${calcTime}**ms 만에 압축 해제 완료! 서버에 이모지 ${emojiCount}개를 만들었어요.",
	util_unzip_emojis_command_error: "이모지 압축을 푸는 중 오류가 발생했어요.",
	util_unzip_emojis_command_no_file:
		"이모지가 담긴 zip 파일을 첨부해 주세요.",

	// /util vkick
	vkick_member_not_in_guild: "멤버가 서버에 없어요.",
	vkick_not_in_vc: "멤버가 음성 채널에 없어요.",
	vkick_not_admin_kick: "관리자를 음성 채널에서 연결 해제할 수 없어요.",
	vkick_logEmbed_title: "음성 채널 추방",
	vkick_logEmbed_desc:
		"${author} 님이 ${member} 님을 음성 채널 ${voiceChannel}에서 연결 해제했어요.",
	vkick_command_work:
		"${author} 님, ${member} 님을 ${voiceChannel}에서 연결 해제했어요",

	// /util sync
	util_sync_embed_description_0:
		"카테고리의 모든 채널 권한이 이미 동기화되어 있어요.",

	// /util securewebhook
	util_securewebhook_action_create: "잘못된 Discord 웹후크 URL이에요",
	util_securewebhook_action_create_error:
		"웹후크를 만드는 중 오류가 발생했어요: `${status}`",
	util_securewebhook_action_create_ok:
		"웹후크를 만들었어요\n> URL: ${url}\n> 사용법: ${use}",
	util_securewebhook_action_delete_any: "웹후크가 하나도 없어요",
	util_securewebhook_action_delete_not_owner: "이 웹후크의 소유자가 아니에요",
	util_securewebhook_action_delete_error:
		"웹후크를 삭제하는 중 오류가 발생했어요",
	util_securewebhook_actiom_list_ok: ":star: __**내 웹후크**__:\n",

	// /util admin-roles
	admin_roles_nobody_roles: "이 서버에는 관리자 역할이 없어요!",
	admin_roles_remove_button_label: "모든 역할에서 관리자 권한 제거",
	admin_roles_remove_not_owner:
		"서버 소유자만 역할에서 관리자 권한을 제거할 수 있어요",

	// /util rolelimit
	util_rolelimit_bad_opt:
		"${emoji_No} | 입력한 옵션이 올바르지 않아요. 입력값을 확인해 주세요.",
	util_rolelimit_good:
		"${emoji_Crown} | 역할: ${role} | 최대 멤버 수: ${limit_count}\n- 이미 멤버 ${limit_count}명이 이 역할을 가지고 있으면 새 사용자는 받을 수 없어요.",

	// /util inviteinfo
	util_inviteinfo_not_valid_invite: "이 `discord_invite`는 올바르지 않아요!",

	// /util cooldown
	util_cooldown_command_ok:
		"채널의 슬로우 모드를 ${duration_in_string}(으)로 설정했어요.",

	// /util role-members
	util_role_members_no_one: "서버에 이 역할을 가진 사람이 없어요",

	// /util vanity-generator
	util_vanity_generator_invalid_code:
		"맞춤 URL 코드 `${VanityCode}`이(가) 올바르지 않아요. 영문자와 숫자만 쓸 수 있고, 단어 사이에 하이픈을 넣을 수 있어요. 최대 길이는 32자이며, 하이픈은 맨 앞이나 맨 뒤에 올 수 없어요.",
	util_vanity_generator_already_claimed:
		"이미 사용 중인 맞춤 URL 코드예요! 다른 코드를 골라 주세요.",
	util_vanity_generator_command_err:
		"맞춤 URL 코드를 만드는 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",

	// +top
	utils_top_no_message: "이 채널에서 메시지를 찾을 수 없어요",
	utils_top_command_ok: "이 채널의 첫 메시지는 [여기](${link})예요",

	// +bringall
	bringall_no_from_channel: "출발 음성 채널을 지정해 주세요.",
	bringall_invalid_category: "올바른 카테고리를 지정해 주세요.",
	bringall_no_voice_channels: "지정한 카테고리에 음성 채널이 없어요.",
	bringall_no_members: "출발 음성 채널에 멤버가 없어요.",

	// /util move
	util_move_not_in_vc:
		"옮기려는 멤버가 어떤 음성 채널에도 연결되어 있지 않아요",
	util_move_impossible_to_move_admin:
		"옮기려는 멤버는 관리자인데, 당신은 관리자가 아니에요.",
	util_move_command_ok: "${member} 님이 이제 ${channel}에 있어요",

	// Guild Config commands
	// /blockpub, /guildprofil, /setchannels, /setjoindm, /setjoinmessage, /setjoinroles, /setleavemessage, /setup

	// /blockpub
	blockpub_not_admin: ":x: | 이 서버의 관리자여야 해요!",
	blockpub_now_enable:
		"📌 | 이제 홍보 차단이 작동해요(관리자를 제외한 모두에게 적용돼요)",
	blockpub_now_disable: "📌 | 홍보 차단을 껐어요!",

	// /guildprofil
	guildprofil_not_admin: ":x: | 이 서버의 관리자여야 해요!",
	guildprofil_not_set_reactionrole: "설정 안 됨!",
	guildprofil_set_reactionrole:
		"**메시지 ID**: `${i}` -> ${emoji} 반응 시 <@&${rolesID}> 역할 부여\n",
	guildprofil_not_set_ticketFetched: "설정 안 됨!",
	guildprofil_set_ticketFetched: "",
	guildprofil_not_set_punishPub: "설정 안 됨!",
	guildprofil_set_punishPub:
		"`${punishementType}`: 최대 `${amountMax}`회 적발.",
	guildprofil_not_set_supportConfig: "설정 안 됨!",
	guildprofil_set_supportConfig:
		"소개에 `${input}`이(가) 있으면 <@&${rolesId}> 역할 부여.",
	guildprofil_not_set_setchannelsjoin: "설정 안 됨!",
	guildprofil_set_setchannelsjoin: "",
	guildprofil_not_set_setchannelsleave: "설정 안 됨!",
	guildprofil_set_setchannelsleave: "",
	guildprofil_not_set_joinmessage: "설정 안 됨!",
	guildprofil_set_joinmessage: "",
	guildprofil_not_set_leavemessage: "설정 안 됨!",
	guildprofil_set_leavemessage: "",
	guildprofil_not_set_joinroles: "설정 안 됨!",
	guildprofil_set_joinroles: "",
	guildprofil_not_set_joinDmMessage: "설정 안 됨!",
	guildprofil_set_joinDmMessage: "",
	guildprofil_not_set_blockpub: "꺼짐",
	guildprofil_set_blockpub: "켜짐",
	guildprofil_embed_description: "`서버 설정:` ${guildName}!",
	guildprofil_embed_fields_joinmessage: "입장 메시지",
	guildprofil_embed_fields_leavemessage: "퇴장 메시지",
	guildprofil_embed_fields_setchannelsjoin: "입장 채널",
	guildprofil_embed_fields_setchannelsleave: "퇴장 채널",
	guildprofil_embed_fields_joinroles: "입장 역할",
	guildprofil_embed_fields_joinDmMessage: "입장 DM",
	guildprofil_embed_fields_blockpub: "홍보 차단",
	guildprofil_embed_fields_punishPub: "홍보 처벌",
	guildprofil_embed_fields_supportConfig: "서포트",
	guildprofil_embed_fields_ticketFetched: "티켓",
	guildprofil_embed_fields_reactionrole: "반응 역할",
	guildprofil_not_logs_set: "설정된 로그 채널 없음",
	guildprofil_blockbot_on: "봇 차단 사용",
	guildprofil_blockbot_off: "봇 차단 사용 안 함",
	guildprofil_disable_xp: "메시지 사용 안 함",
	guildprofil_enable_xp: "메시지 사용",
	guildprofil_another_enable_xp: "메시지 사용 - <#${xpChannels}>에 전송",
	guildprofil_embed_fields_blockbot: "봇 차단",
	guildprofil_embed_fields_logs: "로그",
	guildprofil_embed_fields_ranks: "랭크",

	// /setchannels
	setchannels_not_admin:
		":x: | 이 명령어를 쓰려면 이 서버의 관리자여야 해요!",
	setchannels_not_specified_args:
		"모듈에 사용할 올바른 채널을 지정해야 해요.",
	setchannels_already_this_channel_on_join:
		"모듈이 이미 이 채널로 설정되어 있어요!",
	setchannels_confirmation_message_on_join:
		"**입장 채널이 여기로 설정되었어요!** :tada:",
	setchannels_command_error_on_join:
		"오류: 권한이 없거나 채널이 존재하지 않아요",
	setchannels_command_work_on_join:
		"입장 채널 모듈을 <#${argsidId}>(으)로 설정했어요",
	setchannels_logs_embed_title_on_join: "채널 설정 로그",
	setchannels_logs_embed_description_on_join:
		"<@${authorId}> 님이 입장 채널 모듈을 <#${argsidId}>(으)로 설정했어요",
	setchannels_already_this_channel_on_leave:
		"모듈이 이미 이 채널로 설정되어 있어요!",
	setchannels_confirmation_message_on_leave:
		"**이제 퇴장 채널이 여기로 설정되었어요!** :tada:",
	setchannels_command_error_on_leave:
		"오류: 권한이 없거나 채널이 존재하지 않아요",
	setchannels_command_work_on_leave:
		"퇴장 채널 모듈을 <#${argsidId}>(으)로 설정했어요",
	setchannels_logs_embed_title_on_leave: "채널 설정 로그",
	setchannels_logs_embed_description_on_leave:
		"<@${authorId}> 님이 퇴장 채널을 <#${argsidId}>(으)로 설정했어요",
	setchannels_already_on_off: "입장 및 퇴장 채널이 이미 꺼져 있어요",
	setchannels_command_work_on_off: "퇴장 및 입장 채널을 껐어요!",
	setchannels_logs_embed_title_on_off: "채널 설정 로그",
	setchannels_logs_embed_description_on_off:
		"<@${authorId}> 님이 입장/퇴장 채널 설정을 모두 삭제했어요!",
	setchannels_button_join: "입장 채널 변경",
	setchannels_button_leave: "퇴장 채널 변경",
	setchannels_button_delete: "설정 삭제",
	setchannels_embed_fields_value_join: "입장 채널",
	setchannels_embed_fields_value_leave: "퇴장 채널",
	setchannels_not_a_text_channel:
		"${emoji_Warning_Icon} 지정한 채널은 텍스트 채널이 아니에요!",
	setchannels_which_channel: "<@${authorId}> 님, 어떤 채널을 설정할까요?",
	setchannels_title_embed_panel: "서버 설정 채널 구성 패널",

	// /setjoindm
	setjoindm_not_admin: ":x: | 이 명령어를 쓰려면 이 서버의 관리자여야 해요!",
	setjoindm_logs_embed_title_on_enable: "입장 DM 설정 로그",
	setjoindm_logs_embed_description_on_enable:
		"<@${authorId}> 님이 입장 DM 메시지를 설정했어요!",
	setjoindm_not_specified_args_on_enable:
		"입장 DM에 사용할 올바른 메시지를 지정해야 해요.",
	setjoindm_confirmation_message_on_enable:
		"입장 DM을 다음으로 설정하고 사용하도록 했어요:```${dm_msg}```",
	setjoindm_command_error_on_enable:
		"오류: 권한이 없거나 채널이 존재하지 않아요",
	setjoindm_logs_embed_title_on_disable: "입장 DM 설정 로그",
	setjoindm_logs_embed_description_on_disable:
		"<@${authorId}> 님이 입장 DM 메시지를 껐어요!",
	setjoindm_confirmation_message_on_disable: "입장 DM을 껐어요!",
	setjoindm_command_error_on_disable:
		"오류: 권한이 없거나 채널이 존재하지 않아요",
	setjoindm_already_disable: "입장 DM 메시지가 이미 꺼져 있어요!",
	setjoindm_not_setup_ls: "여기에는 설정된 입장 DM이 없어요!",
	setjoindm_command_work_ls: "입장 DM 메시지:\n```${already_off}```",
	setjoindm_help_embed_title: "입장 DM 메시지 설정 도움말!",
	setjoindm_help_embed_desc:
		"{memberUsername} => 멤버의 사용자명\n{memberMention} => 멤버 멘션\n{memberCount} => 서버의 멤버 수\n{guildName} => 서버 이름\n{createdAt} => 계정 생성일(dd/mm/yyyy)\n{accountCreationTimestamp} => 계정 생성일 타임스탬프",
	setjoindm_buttom_set_name: "메시지 설정",
	setjoindm_buttom_delete_name: "DM 메시지 삭제",
	setjoindm_awaiting_response:
		"새 맞춤 입장 DM 메시지를 채널에 입력해 주세요.",

	// /setjoinmessage
	setjoinmessage_not_admin:
		":x: | 이 명령어를 쓰려면 이 서버의 관리자여야 해요!",
	setjoinmessage_help_embed_title: "setjoinmessage 도움말!",
	setjoinmessage_help_embed_description:
		"/setjoinmessage <켜기/끄기/설정된 메시지 보기> <입장 메시지>",
	setjoinmessage_help_embed_fields_name: "사용 방법",
	setjoinmessage_help_embed_fields_value:
		"```/setjoinmessage <켜기/끄기/설정된 메시지 보기> <메시지>```를 사용하세요\n{user} = 멤버의 사용자명\n{membercount} = 서버의 멤버 수\n{createdat} = 멤버 계정 생성일\n{guild} = 서버 이름\n{inviter} = 초대한 사람의 사용자명과 태그\n{invites} = 사용자의 초대 수",
	setjoinmessage_logs_embed_title_on_enable: "입장 메시지 설정 로그",
	setjoinmessage_logs_embed_description_on_enable:
		"<@${authorId}> 님이 입장 메시지를 설정했어요!",
	setjoinmessage_command_work_on_enable:
		"${emoji_GreenTick} | 맞춤 입장 메시지를 설정했어요.",
	setjoinmessage_logs_embed_title_on_disable: "입장 메시지 설정 로그",
	setjoinmessage_logs_embed_description_on_disable:
		"<@${authorId}> 님이 입장 메시지를 삭제했어요!",
	setjoinmessage_command_work_on_disable:
		"${emoji_Yes} | 맞춤 입장 메시지를 삭제했어요.",
	setjoinmessage_command_work_ls: "입장 메시지:",
	setjoinmessage_help_embed_fields_custom_name: "맞춤 메시지",
	setjoinmessage_help_embed_fields_custom_name_empy: "설정 안 됨!",
	setjoinmessage_help_embed_fields_default_name_empy: "기본 메시지",
	setjoinmessage_help_embed_desc:
		"{memberUsername} => 멤버의 사용자명\n{memberMention} => 멤버 멘션\n{inviterUsername} => 초대한 사람의 사용자명\n{inviterMention} => 초대한 사람 멘션\n{memberCount} => 서버의 멤버 수\n{invitesCount} => 초대한 사람의 초대 수\n{guildName} => 서버 이름\n{createdAt} => 계정 생성일(dd/mm/yyyy)\n{accountCreationTimestamp} => 계정 생성일 타임스탬프",
	setjoinmessage_button_set_name: "메시지 설정",
	setjoinmessage_buttom_del_name: "기본 메시지",
	setjoinmessage_awaiting_response: "새 맞춤 입장 메시지를 입력해 주세요.",
	setjoinmessage_image_default_text:
		"{guildName}에 오신 걸 환영해요, {memberUsername} 님<br>이제 서버 멤버가 {memberCount}명이에요",
	setjoinmessage_change_image_button_title: "이미지 변경",
	setjoinmessage_default_image_button_title: "기본 이미지",
	setjoinmessage_var_enable_image: "이미지 사용",
	setjoinmessage_var_disable_image: "이미지 삭제",
	setjoinmessage_var_image_card: "입장 메시지 카드",
	setjoinmessage_change_image_propreties_background: "배경 변경",
	setjoinmessage_change_image_propreties_frame_color: "원형 테두리 색상 변경",
	setjoinmessage_change_image_propreties_text_colour: "텍스트 색상 변경",
	setjoinmessage_change_image_propreties_text_message: "텍스트 메시지 변경",
	setjoinmessage_change_image_propreties_text_size: "텍스트 크기 변경",
	setjoinmessage_change_image_propreties_avatar_size: "아바타 크기 변경",
	setjoinmessage_modal_fields_background_url: "배경 이미지 URL",
	setjoinmessage_change_image_menu_frame_color_profil:
		"사용자 프로필 색상 기준",
	setjoinmessage_change_image_menu_frame_status_profil: "사용자 상태 기준",
	setjoinmessage_modal_fields_hex_color: "색상 www.color-hex.com",
	setjoinmessage_modal_fields_message: "원하는 메시지",
	setjoinmessage_var_text_size: "텍스트 크기: ",
	setjoinmessage_var_avatar_size: "아바타 크기: ",
	setjoinmessage_change_image_invalid_url:
		"잘못된 이미지 URL이에요. 다른 이미지 호스팅 서비스로 시도해 주세요.",

	// /setjoinroles
	setjoinroles_var_none: "없음",
	setjoinroles_var_perm_admin: "관리자",
	setjoinroles_var_perm_manage_guild: "서버 관리하기",
	setjoinroles_var_perm_manage_role: "역할 관리하기",
	setjoinroles_var_perm_use_mention: "@everyone, @here, 모든 역할 멘션하기",
	setjoinroles_var_perm_ban_members: "멤버 차단하기",
	setjoinroles_var_perm_kick_members: "멤버 추방하기",
	setjoinroles_var_perm_manage_webhooks: "웹후크 관리하기",
	setjoinroles_var_perm_manage_channels: "채널 관리하기",
	setjoinroles_var_perm_manage_expression:
		"이모지, 스티커, 사운드보드 관리하기",
	setjoinroles_var_perm_view_monetization_analytics:
		"크리에이터 수익 창출 및 분석 보기",
	setjoinroles_var_perm_issue: "역할을 관리할 권한이 없어요.",
	setjoinroles_var_timesup: "역할 선택 시간이 끝났어요.",
	setjoinroles_warn_dangerous_perm:
		"다음 역할에는 위험한 권한이 있어요. 정말 부여할까요?",
	setjoinroles_warn_title: "경고!",
	setjoinroles_timesup_button: "시간 초과!",
	setjoinroles_action_canceled: "작업을 취소했어요",
	setjoinroles_too_highter_roles: "다음 역할은 제 역할보다 위치가 높아요.",
	setjoinroles_not_admin:
		":x: | 이 명령어를 쓰려면 이 서버의 관리자여야 해요!",
	setjoinroles_help_embed_title: "입장 역할 모듈",
	setjoinroles_help_embed_description: "새 멤버에게 부여하는 역할 목록이에요",
	setjoinroles_help_embed_fields_1_name: "등록된 모든 역할",
	setjoinroles_logs_embed_title_on_enable: "입장 역할 설정 로그",
	setjoinroles_logs_embed_description_on_enable:
		"<@${authorId}> 님이 입장 역할을 설정했어요!",
	setjoinroles_already_on_enable:
		"입장 역할이 이미 이 역할로 설정되어 있어요!",

	// /welcomer
	welcomer_panel_title: "환영 메시지",
	welcomer_section_placeholder: "설정할 항목을 선택하세요",
	welcomer_section_channels: "채널",
	welcomer_embed_label: "맞춤 임베드",
	welcomer_text_label: "텍스트",
	welcomer_embed_set_button: "임베드 설정",
	welcomer_embed_remove_button: "임베드 제거",
	welcomer_embed_modal_title: "맞춤 임베드 설정",
	welcomer_embed_modal_label: "임베드 ID(임베드 빌더에서 확인)",
	welcomer_embed_not_found:
		"ID가 `${embed_id}`인 저장된 임베드를 찾을 수 없어요. 먼저 임베드 빌더로 만들어 주세요.",
	welcomer_embed_set_ok:
		"이제 이 이벤트에 맞춤 임베드 `${embed_id}`를 보내요. {memberMention} 같은 변수는 자동으로 바뀌어요.",
	welcomer_embed_removed_ok:
		"맞춤 임베드를 제거했어요. 기본 카드로 돌아가요.",
	welcomer_text_enable_button: "텍스트 사용",
	welcomer_text_disable_button: "텍스트 사용 안 함",
	welcomer_components_enable_button: "컴포넌트 사용",
	welcomer_components_disable_button: "컴포넌트 사용 안 함",
	welcomer_render_mode_label: "표시 방식",
	welcomer_render_mode_components: "컴포넌트(카드)",
	welcomer_render_mode_simple: "일반 메시지",

	// /setleavemessage
	setleavemessage_not_admin:
		":x: | 이 명령어를 쓰려면 이 서버의 관리자여야 해요!",
	setleavemessage_help_embed_title: "/setleavemessage 도움말!",
	setleavemessage_help_embed_description:
		"/setleavemessage <켜기/끄기/설정된 메시지 보기> <퇴장 메시지>",
	setleavemessage_help_embed_fields_name: "사용 방법",
	setleavemessage_help_embed_fields_value:
		"```/setleavemessage <켜기/끄기/설정된 메시지 보기> <메시지>```를 사용하세요\n{user} = 멤버의 사용자명\n{membercount} = 서버의 멤버 수\n{guild} = 서버 이름",
	setleavemessage_logs_embed_title_on_enable: "퇴장 메시지 설정 로그",
	setleavemessage_logs_embed_description_on_enable:
		"<@${authorId}> 님이 퇴장 메시지를 설정했어요!",
	setleavemessage_command_work_on_enable:
		"${emoji_Yes} | 맞춤 퇴장 메시지를 설정했어요.",
	setleavemessage_logs_embed_title_on_disable: "퇴장 메시지 설정 로그",
	setleavemessage_logs_embed_description_on_disable:
		"<@${authorId}> 님이 퇴장 메시지를 삭제했어요!",
	setleavemessage_command_work_on_disable:
		"${emoji_Yes} | 맞춤 퇴장 메시지를 삭제했어요.",
	setleavemessage_command_work_ls: "퇴장 메시지:",
	setleavemessage_awaiting_response: "새 맞춤 퇴장 메시지를 입력해 주세요.",

	// /setup
	setup_not_admin: ":x: | 이 서버의 관리자여야 해요!",
	setup_command_work: "${emoji_Yes} | 채널 설정 완료",
	setup_command_error:
		"봇이 이미 로그 채널을 설정했거나, 봇에 권한이 부족해요...",

	// /setlogschannel
	setlogschannel_not_admin:
		":x: | 이 명령어를 쓰려면 이 서버의 관리자여야 해요!",
	setlogschannel_not_specified_args:
		"모듈에 사용할 올바른 채널을 지정해야 해요.",
	setlogschannel_confirmation_message:
		"${emoji_Yes} | 이제 여기가 `${typeOfLogs}` 채널이에요. <@${authorId}> 님이 설정했어요!",
	setlogschannel_already_this_channel:
		"이 서버는 이미 이 채널을 로그용으로 쓰고 있어요!",
	setlogschannel_already_deleted:
		"이 서버에는 `SERVER_LOGS`가 설정되어 있지 않아요!",
	setlogschannel_command_error: "오류가 발생했어요. 다시 시도해 주세요.",
	setlogschannel_command_work:
		"<#${argsidId}>에 `${typeOfLogs}`를 설정했어요!",
	setlogschannel_utils_command_work:
		"${argsidId}에 `${typeOfLogs}`를 설정했어요!",
	setlogschannel_command_work_on_delete:
		"**${guildName}**의 `SERVER_LOGS`를 모두 삭제했어요",
	setlogschannel_logs_embed_title: "서버 로그 설정",
	setlogschannel_logs_embed_description_on_enable:
		"<@${authorId}> 님이 `${typeOfLogs}`를 <#${argsidId}>(으)로 설정했어요",
	setlogschannel_logs_embed_title_on_off: "서버 로그 설정",
	setlogschannel_logs_embed_description_on_off:
		"<@${authorId}> 님이 서버의 `SERVER_LOGS`를 모두 삭제했어요!",
	setlogschannel_var_roles: "역할 로그",
	setlogschannel_var_mods: "모더레이션 로그",
	setlogschannel_var_voice: "음성 로그",
	setlogschannel_var_msg: "메시지 로그",
	setlogschannel_var_boost: "부스트 로그",
	setlogschannel_var_tickets: "티켓 로그",
	setlogschannel_var_antispam: "스팸 방지 로그",
	setlogschannel_var_channel: "채널 로그",
	setlogschannel_var_confession: "고백 로그",
	setlogschannel_var_economy: "경제 로그",

	setlogschannel_all_already_exist: "모든 로그 채널이 이미 설정되어 있어요!",

	// /join-ghostping add
	joinghostping_add_already_set: "${channel} 채널은 이미 설정되어 있어요!",
	joinghostping_add_sent_to_channel:
		"이제부터 멤버가 서버에 들어오면 **여기**에 고스트 메시지를 보낼게요.",
	joinghostping_add_ok_embed_title: "입장 고스트 핑 모듈",
	joinghostping_add_ok_embed_desc:
		"이제 멤버가 서버에 들어올 때마다 이 채널에 고스트 메시지를 보낼게요!",
	joinghostping_add_ok_embed_fields_name: "등록된 모든 채널",
	joinghostping_add_logs_embed_title: "입장 고스트 핑 로그",
	joinghostping_add_logs_embed_desc:
		"${author} 님이 ${channel} 채널을 입장 고스트 핑 모듈에 추가했어요!",

	// /join-ghostping remove
	joinghostping_remove_isnt_set: "${channel} 채널은 설정되어 있지 않아요!",
	joinghostping_remove_ok_embed_desc:
		"입장 고스트 핑 모듈에서 채널을 삭제했어요!",
	joinghostping_remove_logs_embed_desc:
		"${author} 님이 입장 고스트 핑 모듈에서 ${channel} 채널을 삭제했어요!",

	// /automod
	automod_panel_title: "자동 관리(AutoMod) 제어판",
	automod_panel_desc:
		"iHorizon의 모든 자동 관리(AutoMod) 규칙을 설정하세요: 사용 여부를 바꾸고, 로그 채널을 지정하고, 규칙을 우회할 수 있는 역할을 고를 수 있어요.",
	automod_panel_overview_title: "보호 규칙",
	automod_panel_select_placeholder: "설정할 규칙 선택",
	automod_panel_label_logs: "로그 채널",
	automod_panel_label_bypass: "우회 역할",
	automod_panel_label_mention_limit: "멘션 제한",
	automod_panel_rule_spam_name: "메시지 스팸",
	automod_panel_rule_spam_desc: "서버에서 도배와 반복 메시지를 차단해요.",
	automod_panel_rule_mass_mention_name: "대량 멘션",
	automod_panel_rule_mass_mention_desc:
		"과도한 수의 멘션이 포함된 메시지를 차단해요.",
	automod_panel_rule_antipub_name: "링크 및 홍보",
	automod_panel_rule_antipub_desc:
		"홍보 링크를 차단해요. 안전한 허용 목록(GitHub, Tenor, YouTube, ...)은 예외예요.",
	automod_panel_rule_media_name: "Discord 초대",
	automod_panel_rule_media_desc:
		"메시지로 보낸 Discord 서버 초대 링크를 차단해요.",
	automod_panel_rule_telegram_name: "Telegram 링크",
	automod_panel_rule_telegram_desc:
		"Telegram 링크(t.me, telegram.me, tg://...)를 차단해요.",
	automod_panel_logs_placeholder: "이 규칙의 로그를 받을 채널 선택",
	automod_panel_bypass_placeholder: "이 규칙을 우회할 역할 선택",
	automod_panel_enable_button: "사용",
	automod_panel_disable_button: "사용 안 함",
	automod_panel_back_button: "뒤로",
	automod_panel_refresh_button: "새로고침",
	automod_panel_close_button: "패널 닫기",
	automod_panel_rule_enabled: "**${rule}** 규칙을 이제 사용해요!",
	automod_panel_rule_disabled: "**${rule}** 규칙을 이제 사용하지 않아요!",
	automod_panel_bypass_saved: "**${rule}**의 우회 역할을 업데이트했어요!",
	automod_panel_logs_saved:
		"이제 **${rule}**의 로그가 ${channel} 채널로 전송돼요.",
	automod_panel_logs_reset: "**${rule}**의 로그 채널을 제거했어요!",
	automod_panel_api_error:
		"변경 사항을 적용하지 못했어요. 제게 `서버 관리하기` 권한이 있는지, Discord 기본 자동 관리(AutoMod) 규칙이 꺼져 있는지 확인한 뒤 다시 시도해 주세요.",

	// /guildconfig block too-new-account
	too_new_account_dont_specified_time_on_enable:
		"시간을 지정하지 않았어요. 이 모듈을 사용하려면 최소 계정 나이가 필요해요!",
	too_new_account_invalid_time_on_enable:
		"입력한 시간이 올바르지 않아요! **올바른 시간 예시**: `3h; 30m; 4mo; 4w; 4y` -> 3시간; 30분; 4개월; 4주; 4년",
	too_new_account_logEmbed_title: "신규 계정 차단 모듈",
	too_new_account_logEmbed_desc_on_enable:
		"${author} 님이 신규 계정 차단 모듈을 켰어요. 이제 계정은 최소 ${beautifulTime} 이상 되어야 하며, 사용자가 `${maxJoin}`번보다 많이 입장하면 차단돼요.",
	too_new_account_command_work_on_enable:
		"${author} 님, 이제 계정 나이가 `${beautifulTime}` 미만인 채로 **${guildName}**에 입장하는 새 멤버는 추방돼요.",
	too_new_account_command_work_on_enable2:
		"\n-# ${emoji_Sparkles} 해당 계정이 서버에 **`${maxJoin}`**번 입장하면 차단돼요.",
	too_new_account_logEmbed_desc_on_disable: "${author} 님이 모듈을 껐어요!",
	too_new_account_command_work_on_disable:
		"${author} 님, 모듈을 껐어요. 이제 새 멤버의 계정 생성일을 확인하지 않아요.",

	// /guildconfig set-bot footer-name
	guildconfig_setbot_footername_footer_too_long_msg:
		"봇 푸터가 너무 길어서 표시하면 보기 좋지 않아요.",
	guildconfig_setbot_footername_is_good:
		"변경했어요. 이제 iHorizon의 모든 임베드가 `${footerName}`을(를) 푸터로 사용해요!",
	guildconfig_setbot_footername_is_reset:
		"푸터 이름을 삭제했어요. 이제 iHorizon의 모든 임베드가 `봇 이름`을 사용해요.",
	guildconfig_setbot_footername_not_found:
		"푸터 이름을 찾을 수 없어요. 다시 시도해 주세요!",

	// /guildconfig set-bot footer-pfp
	guildconfig_setbot_footeravatar_is_good:
		"변경했어요. 이제 iHorizon의 모든 임베드가 `이미지`를 푸터로 사용해요!",
	guildconfig_setbot_footeravatar_incorect:
		"이미지 파일이 아니에요. 이미지로 다시 시도해 주세요.",
	guildconfig_setbot_footeravatar_is_reset:
		"푸터 아바타를 삭제했어요. 이제 iHorizon의 모든 임베드가 `봇 아바타`를 사용해요.",

	// /guildconfig set-bot prefix
	guildconfig_setbot_prefix_prefix_now_mention:
		"이제 메시지 명령어의 봇 접두사는 멘션이에요! `@Ping-Me`",
	guildconfig_setbot_prefix_prefix_specify_prefix:
		"봇 접두사를 지정해야 해요.",
	guildconfig_setbot_prefix_prefix_too_long:
		"봇 접두사가 너무 길어서 사용하기 어려워요.",
	guildconfig_setbot_prefix_prefix_is_good:
		"봇 접두사를 변경했어요. 이제 메시지 명령어는 `${formatedPrefix}`(으)로 사용할 수 있어요.",

	// /guildconfig config save
	guildconfig_config_save_check_dm:
		"DM을 확인해 주세요. 메시지를 받지 못했다면 DM 수신을 허용했는지 확인해 주세요.",
	guildconfig_config_save_user_msg: "`${guildName}`의 설정 백업이에요!",
	guildconfig_config_save_user_msg_2:
		"서버 백업을 내려받을 수 있는 링크예요!\n",

	// /guildconfig config restore
	guildconfig_config_restore_err_msg: "파일을 내려받는 중 오류가 발생했어요.",
	guildconfig_config_restore_msg: "데이터를 데이터베이스에 저장했어요.",
	guildconfig_config_restore_wrong_guild:
		"이 백업은 이 서버의 것이 아니거나 올바르지 않아서 복원하지 않았어요.",

	// /perm add
	perm_add_args_error: "변경할 명령어나 설정할 권한을 지정하지 않았어요.",

	// /perm list
	perm_list_embed_title: "모든 사용자 권한:",
	perm_list_unknown_user: "알 수 없는 사용자 (ID: ${userId})",
	perm_list_no_user: "사용자를 찾을 수 없어요",
	var_command: "명령어",
	var_subcommand: "하위 명령어",
	var_subcommand_group: "하위 명령어 그룹",
	var_unreachable_command: "명령어를 찾을 수 없어요",
	perm_list_no_command_set: "이 서버에는 별도 권한이 설정된 명령어가 없어요!",

	// /perm set
	perm_set_deleted: "${user} 님의 권한이 **삭제**되었어요!",
	perm_set_ok: "${user} 님의 권한이 **`${perm}`**(으)로 변경되었어요",
	perm_set_warn_message:
		"${author} 님, 본인과 같거나 더 높은 권한은 부여할 수 없어요!",
	perm_set_chng_perm_lvl: "권한 레벨 변경",
	perm_set_add_role: "역할 추가",
	perm_set_add_usr: "사용자 추가",
	perm_rmv_role: "역할 제거",
	perm_rmv_usr: "사용자 제거",
	perm_set_command_reset: "이 명령어를 초기화했어요",
	perm_set_no_modified: "변경된 권한이 없어요",
	perm_command_delete_dont_exist: "지정한 명령어에는 설정된 권한이 없어요.",
	perm_command_delete_command_deleted:
		"명령어의 권한을 삭제했어요: `${commands}`",
	perm_command_delete_specify_command:
		"권한을 삭제할 명령어를 지정해야 해요.",
	perm_command_delete_all_one: "권한을 삭제하려면 옵션을 하나 지정해야 해요.",
	perm_command_delete_all_one_option:
		"권한을 삭제할 때는 옵션을 하나만 지정할 수 있어요.",
	perm_command_delete_all_zero_change:
		"지정한 권한 유형을 사용하는 명령어가 없어요.",
	perm_command_delete_all_command_ok:
		"\n데이터베이스에서 `${type}` (${value}) 권한 **${changeCount}**개를 삭제했어요.",
	commandlimit_current_value: "${time}당 ${count}회 사용",
	commandlimit_invalid_value:
		"명령어 사용 제한에 입력한 값이 올바르지 않아요.",
	commandlimit_missing_command: "명령어를 지정해야 해요.",
	commandlimit_set_success:
		"`${command}`의 사용 제한을 `${limit}`(으)로 설정했어요.",
	commandlimit_reset_success: "`${command}`의 사용 제한을 초기화했어요.",
	commandlimit_reset_missing: "`${command}`에 설정된 사용 제한이 없어요.",
	commandlimit_list_title: "설정된 명령어 사용 제한",
	commandlimit_list_item: "- `${command}`: ${limit}",
	commandlimit_list_empty: "이 서버에 설정된 명령어 사용 제한이 없어요.",
	commandlimit_rate_limited:
		"이 명령어의 사용 한도에 도달했어요. ${time} 후에 다시 시도해 주세요.",

	// /perm roles
	perm_roles_created_role: "다음 역할을 만들었어요: ${roles}",
	perm_roles_already_upate: "모든 역할이 이미 존재하며 최신 상태예요.",
	perm_roles_error: "역할을 만들거나 업데이트하는 중 오류가 발생했어요.",
	perm_roles_not_owner: "권한 레벨 역할은 서버 소유자만 추가할 수 있어요.",

	// /perm edit-roles
	perm_edit_roles_command_ok:
		"${permName} 권한의 역할을 ${strRole}(으)로 변경했어요",

	// /toggle-react
	toggle_react_command_work:
		"<@${authorId}> 님, 이제 멤버가 환영 메시지를 보내면 봇이 **{activeMsg}**",
	toggle_react_doesnt_react: "더 이상 반응하지 않아요",
	toggle_react_react: "반응해요",

	// /remove-react
	remove_react_command_work:
		"<@${authorId}> 님, 이제 멤버가 `${message}`을(를) 보내도 봇이 **더 이상 반응하지 않아요**.",

	// /add-react
	add_react_command_err_emojis:
		"반응에 사용할 이모지 `{emoji}`은(는) 올바른 이모지가 아니에요!",
	add_react_command_err_message: "반응을 일으킬 메시지를 지정해야 해요!",
	add_react_command_bad_word:
		"이 단어는 자동 반응에 사용할 수 없어요: 마침표(.)가 들어가면 안 돼요.",
	add_react_command_work:
		"<@${authorId}> 님, 이제 멤버가 `${message}`을(를) 보내면 봇이 {emoji}(으)로 **반응해요**",

	// /list-react
	list_react_nothing_found: "데이터가 없어요. 먼저 추가해 주세요.",
	list_react_embed_msg:
		"누군가 **`${key}`**을(를) 보내면 ${value}(으)로 **반응해요**\n",

	// /autoreact
	autoreact_embed_title: "자동 반응 설정",
	autoreact_embed_desc:
		"지정한 채널에 새 메시지가 올라오면 봇이 지정한 이모지로 반응해요.",
	autoreact_embed_autofields_value: "반응: ${reaction}",
	autoreact_embed_autofields_none_value: "설정된 자동 반응이 없어요.",
	autoreact_embed_footer:
		"${totalPage}페이지 중 ${currentPage}페이지 • 전체: ${totalReact}",
	autoreact_btn_add_name: "채널 추가",
	autoreact_btn_remove_name: "채널 제거",
	autoreact_max_25: "자동 반응은 최대 25개까지 설정할 수 있어요.",
	autoreact_menu_add_place: "추가할 채널 선택",
	autoreact_awaiting1_msg: "자동 반응 모듈에 추가할 채널을 선택해 주세요.",
	autoreact_modal_title: "자동 반응 설정",
	autoreact_modal_fields1_label: "반응 (이모지)",
	autoreact_invalid_emoji:
		"올바르지 않은 이모지예요. 올바른 이모지를 입력해 주세요.",
	autoreact_add_command_ok: "자동 반응을 설정했어요.",
	autoreact_remove_not_found: "설정된 자동 반응이 없어요.",
	autoreact_menu_remove_place: "제거할 채널 선택",
	autoreact_awaiting_remove_msg:
		"자동 반응 모듈에서 제거할 채널을 선택해 주세요.",
	autoreact_remove_command_ok: "이 채널의 자동 반응 설정을 제거했어요.",

	// Member Count commands
	// /setmembercount

	// /setmembercount
	setmembercount_not_admin:
		":x: | 이 명령어를 사용하려면 이 서버의 관리자여야 해요!",
	setmembercount_helpembed_title: "멤버 수 설정 도움말!",
	setmembercount_helpembed_description:
		"/membercount <Enable / Disable> <Channel Name>",
	setmembercount_helpembed_fields_name: "어떻게 사용하나요?",
	setmembercount_helpembed_fields_value:
		"{MemberCount} = 서버의 멤버 수\n{RolesCount} = 역할 수\n{BotCount} = 서버의 봇 수\n{ChannelCount} = 서버의 채널 수\n{BoostCount} = 서버의 부스트 수\n{VoiceCount} = 서버 음성 채널에 있는 전체 멤버 수\n{OnlineCount} = 서버의 전체 온라인 멤버 수",
	setmembercount_logs_embed_title_on_enable: "멤버 수 설정 로그",
	setmembercount_logs_embed_description_on_enable:
		"<@${authorId}> 님이 <#${channelId}>의 멤버 수를 `${messagei}`(으)로 설정했어요!",
	setmembercount_command_work_on_enable:
		"${emoji_Yes} | 멤버 수를 설정했어요.",
	setmembercount_command_work_on_disable:
		"${emoji_Yes} | 멤버 수를 제거했어요.",
	setmembercount_logs_embed_title_on_disable: "멤버 수 설정 로그",
	setmembercount_logs_embed_description_on_disable:
		"<@${authorId}> 님이 이 서버의 멤버 수를 제거했어요!",

	// Music commands
	// /p, /loop, /nowplaying, /pause, /resume, /skip, /stop, /queue, /shuffle

	music_audio_unavailable:
		"🔄 음악 서버가 다시 시작되고 있어요. 몇 초 뒤 하던 곳부터 자동으로 이어서 재생돼요. 잠시 후 다시 시도해 주세요.",
	music_cannot:
		"${emoji_No} 이 명령어를 사용하려면 저와 같은 음성 채널에 있어야 해요!",

	// /p
	p_not_in_voice_channel:
		"이 명령어를 사용하려면 음성 채널에 접속해 있어야 해요!",
	p_embed_title: "결과 없음",
	p_not_allowed:
		"보낸 링크는 이 봇에서 지원하지 않아요. Deezer, Spotify, Soundcloud 등 허용된 음악 스트리밍 서비스를 이용해 주세요.",
	p_attachment_too_large:
		"${emoji_No} 첨부 파일이 10MB 제한을 넘어서 읽을 수 없어요.",

	// /loop
	loop_no_queue: "대기열이 없어요!",
	loop_command_work: "{mode} | 반복 모드를 변경했어요",

	// /nowplaying
	nowplaying_no_queue: "재생 중인 곡이 없어요",
	nowplaying_message_embed_title: "지금 재생 중",
	nowplaying_resume_button: "${author} 님이 음악을 **다시 재생**했어요!",
	nowplaying_pause_button: "${author} 님이 음악을 **일시정지**했어요!",
	nowplaying_lyrics_button: "이 곡의 가사를 찾을 수 없어요",
	nowplaying_stop_buttom: "${author} 님이 음악을 **정지**했어요!",
	nowplaying_header: "${channel}에서 지금 재생 중",
	nowplaying_requested_by: "${user} 님의 신청곡",
	nowplaying_paused: "일시정지됨",
	nowplaying_live: "라이브 스트림",
	nowplaying_volume: "볼륨 ${volume}%",
	nowplaying_loop_off: "반복 끔",
	nowplaying_loop_track: "곡 반복",
	nowplaying_loop_queue: "대기열 반복",
	nowplaying_queue_count: "대기열 ${count}곡",
	nowplaying_up_next: "다음 곡: ${track}",
	nowplaying_queue_end: "대기열의 마지막 곡",
	nowplaying_ended: "이 곡은 더 이상 재생되고 있지 않아요.",
	nowplaying_button_pause: "일시정지",
	nowplaying_button_resume: "다시 재생",
	nowplaying_button_skip: "건너뛰기",
	nowplaying_button_stop: "정지",
	nowplaying_button_lyrics: "가사",
	nowplaying_button_open: "열기",
	nowplaying_skip_button: "${author} 님이 곡을 **건너뛰었어요**!",
	nowplaying_loop_button:
		"${author} 님이 반복 모드를 변경했어요: **${mode}**",

	// /pause
	pause_no_queue: "${emoji_Warning_Icon} - 음성 채널에 있지 않아요!",
	pause_nothing_playing: "재생 중인 곡이 없어요",
	pause_var_paused: "일시정지했어요",
	pause_var_err: "문제가 발생했어요",

	// /resume
	resume_nothing_playing: "재생 중인 곡이 없어요",
	resume_command_work: "다시 재생했어요",

	// /skip
	skip_not_in_voice_channel:
		"${emoji_Warning_Icon} - 음성 채널에 있지 않아요!",
	skip_nothing_playing: "재생 중인 곡이 없어요",
	skip_command_work: "{queue}을(를) 건너뛰었어요",

	// /stop
	stop_nothing_playing: "재생 중인 곡이 없어요",
	stop_command_work: "대기열을 정지했어요",

	// /queue
	queue_iam_not_voicec: "저는 음성 채널에 있지 않아요",
	queue_no_queue: "대기열이 없어요",
	queue_title: "대기열",
	queue_time_left: "${duration} 남음",
	queue_now_playing: "지금 재생 중",
	queue_up_next: "다음 곡",
	queue_page: "${page}/${pages} 페이지",
	queue_button_shuffle: "셔플",
	queue_button_refresh: "새로고침",
	queue_jump_placeholder: "곡으로 건너뛰기…",
	queue_shuffled: "${author} 님이 대기열을 **셔플**했어요!",
	queue_jumped: "${author} 님이 ${track}(으)로 건너뛰었어요!",

	// /shuffle
	shuffle_no_queue: "저는 음성 채널에 있지 않아요",
	shuffle_no_enought: "대기열에 **셔플**할 만큼 **곡이 충분하지 않아요**",
	shuffle_command_work: "대기열을 **셔플**했어요",

	// /music history
	history_no_entries: "음악 기록에 항목이 없어요.",
	history_title: "${guild}에서 최근 재생한 곡",
	history_summary: "최근 30일 동안 ${count}곡, ${duration} 분량의 음악",
	history_top_artist:
		"가장 많이 재생한 아티스트: **${artist}** (${count}회 재생)",
	history_top_listener: "가장 많이 신청한 사람: ${user} (${count})",
	history_legacy_note: "곡 상세 정보를 저장하기 전에 기록된 항목:",
	history_page: "${pages}페이지 중 ${page}페이지",
	history_kept: "30일간 보관",
	history_button_previous: "이전",
	history_button_next: "다음",
	history_button_export: "내보내기",
	history_button_clear: "비우기",
	history_clear_confirm:
		"${emoji} 이 서버의 음악 기록을 모두 비울까요? 되돌릴 수 없어요.",
	history_button_confirm_clear: "기록 비우기",
	history_button_cancel: "취소",
	history_cleared: "${emoji} 이 서버의 음악 기록을 비웠어요.",
	history_clear_forbidden:
		"${emoji} 기록을 비우려면 서버 관리하기 권한이 필요해요.",
	history_not_yours:
		"${emoji} 이 버튼은 이 기록을 연 사람만 쓸 수 있어요. /music history를 실행해 직접 열어 보세요.",
	history_export_ready: "${emoji} 전체 기록이에요 (최신순):",

	// /music lyrics
	lyrics_embed_title_unknown: "알 수 없는 제목",
	lyrics_embed_author_name_unknown: "알 수 없는 아티스트",
	lyrics_not_found: "가사를 찾을 수 없어요",

	// /music clear-queue
	clear_queue_command_ok:
		"${emoji_Security} | 이 서버의 음악 대기열을 비웠어요.",

	// /music trackinfo
	music_lyrics: "가사",

	// /music volume
	music_volume_command_ok: "${emoji_Yes} `${query}`%로 **볼륨을 설정했어요**",

	// /music apo
	music_apo_download_failed:
		"${emoji_No} | 파일을 내려받지 못했어요. 다시 시도해 주세요.",
	music_apo_no_node: "${emoji_No} | 지금 연결된 오디오 노드가 없어요.",
	music_apo_unsupported:
		"${emoji_No} | 이 오디오 노드는 APO 필터를 지원하지 않아요 (`apo` 플러그인이 있는 Wavyzon이 필요해요).",
	music_apo_invalid:
		"${emoji_No} | 오디오 노드가 이 설정을 거부했어요: `${error}`",
	music_apo_warnings: "건너뛴 줄 (${count}):",

	// Giveaway commands
	// /end, /start, /reroll

	// /end
	end_not_admin: "이 경품 추첨을 종료하려면 메시지 관리 권한이 있어야 해요.",
	end_not_find_giveaway: "`${gw}`에 해당하는 경품 추첨을 찾을 수 없어요.",
	end_confirmation_message:
		"경품 추첨이 (${timeEstimate})초 안에 종료돼요...",
	end_logs_embed_title: "경품 추첨 로그",
	end_logs_embed_description:
		"<@${authorId}> 님이 다음 ID의 경품 추첨을 종료했어요: ${messageId}",
	end_command_error: "이미 종료된 경품 추첨이에요!",

	// /start
	start_not_perm: "경품 추첨을 시작하려면 메시지 관리 권한이 있어야 해요.",
	start_is_not_valid: "올바른 당첨자 수를 지정해야 해요!",
	start_confirmation_command:
		"${giveawayChannel}에서 경품 추첨을 시작했어요!",
	start_logs_embed_title: "경품 추첨 로그",
	start_logs_embed_description:
		"<@${authorId}> 님이 경품 추첨을 시작했어요: ${giveawayChannel}",
	start_time_not_valid:
		"${author} 님, 지정한 경품 추첨 기간이 올바르지 않아요. 다시 시도해 주세요!",
	start_invalid_invites_req_value:
		"${emoji_No} | 'invites' 값이 올바르지 않아요! 경품 추첨에 참가하는 데 필요한 초대 수를 지정해야 해요!",
	start_invalid_messages_req_value:
		"${emoji_No} | 'messages' 값이 올바르지 않아요! 경품 추첨에 참가하는 데 필요한 메시지 수를 지정해야 해요!",
	start_invalid_roles_req_value:
		"${emoji_No} | 'roles'의 역할을 찾을 수 없어요! 경품 추첨에 참가하는 데 필요한 역할 ID를 입력해야 해요!",

	// /reroll
	reroll_not_perm:
		"이 경품 추첨을 종료하려면 메시지 관리 권한이 있어야 해요.",
	reroll_dont_find_giveaway:
		"`{args}`에 해당하는 경품 추첨을 찾을 수 없어요.",
	reroll_command_work: "경품 추첨을 다시 진행했어요!",
	reroll_logs_embed_title: "경품 추첨 로그",
	reroll_logs_embed_description:
		"<@${authorId}> 님이 다음 ID의 경품 추첨 당첨자를 다시 뽑았어요: ${messageId}",
	reroll_command_error: "오류!",
	reroll_giveaway_not_over: "이 경품 추첨은 아직 끝나지 않았어요!",

	// /get-all
	gw_getall_embed_title: "${guildName}의 경품 추첨 목록",
	gw_getall_embed_fields:
		"${Channel} [여기서 보기](${MessageURL}) \n**종료까지** ${ExpireIn}",

	// /get-data
	gw_getdata_embed_title: "경품 추첨 정보!",
	gw_getdata_embed_fields_channel: "채널",
	gw_getdata_embed_fields_amountWinner: "당첨자 수",
	gw_getdata_embed_fields_value_amountWinner: "당첨자 `${winnerCount}`명",
	gw_getdata_embed_fields_prize: "상품",
	gw_getdata_embed_fields_value_prize: "`${prize}`",
	gw_getdata_embed_fields_hostedBy: "주최자",
	gw_getdata_embed_fields_isEnded: "종료 여부",
	gw_getdata_embed_fields_isValid: "유효 여부",
	gw_getdata_embed_fields_time: "종료 시각",
	gw_getdata_embed_fields_entriesAmount: "참가자 수",
	gw_getdata_embed_fields_winners: "당첨자",
	gw_getdata_embed_fields_value_entriesAmount:
		"**${entries}** (자세한 정보는 `/gw list-entries giveaway-id:${giveawayId}`를 사용하세요)",
	gw_getdata_yes: "`예`",
	gw_getdata_no: "`아니요`",
	gw_doesnt_exit: "경품 추첨에 접근할 수 없거나 존재하지 않아요.",

	// /go
	gw_go_panel_title: "경품 추첨 패널",
	gw_go_panel_desc:
		"아래에서 경품 추첨을 준비한 뒤 시작하세요. 메뉴로 각 설정을 편집할 수 있어요.",
	gw_go_select_placeholder: "설정 편집",
	gw_go_opt_prize: "상품",
	gw_go_opt_duration: "기간",
	gw_go_opt_winners: "당첨자",
	gw_go_opt_requirement: "참가 조건",
	gw_go_opt_image: "미리보기 이미지",
	gw_go_channel_placeholder: "경품 추첨 채널",
	gw_go_launch_buttontitle: "시작",
	gw_go_cancel_buttontitle: "취소",
	gw_go_req_none: "없음",
	gw_go_req_invites: "초대",
	gw_go_req_messages: "메시지",
	gw_go_req_roles: "역할",
	gw_go_req_value_dsc: "필요한 값: **${value}**",
	gw_go_started: "${channel}에서 경품 추첨을 시작했어요!",
	gw_go_cancelled: "패널을 닫았어요. 아무것도 시작하지 않았어요.",
	gw_go_expired: "경품 추첨을 시작하기 전에 패널이 만료되었어요.",
	gw_go_need_prize:
		"${emoji_No} | 경품 추첨을 시작하기 전에 상품을 설정해야 해요!",
	gw_go_need_duration:
		"${emoji_No} | 경품 추첨을 시작하기 전에 올바른 기간을 설정해야 해요!",
	gw_go_need_winners:
		"${emoji_No} | 경품 추첨을 시작하기 전에 올바른 당첨자 수를 설정해야 해요!",
	gw_go_channel_error: "${emoji_No} | 선택한 채널에 메시지를 보낼 수 없어요!",
	gw_go_invalid_image: "${emoji_No} | 올바른 이미지 URL이 아니에요!",
	gw_go_modal_prize: "상품 설정",
	gw_go_modal_prize_label: "상품",
	gw_go_modal_duration: "기간 설정",
	gw_go_modal_duration_label: "기간 (예: 2d 또는 12h30)",
	gw_go_modal_winners: "당첨자 수 설정",
	gw_go_modal_winners_label: "당첨자 수",
	gw_go_modal_req_title: "참가 조건",
	gw_go_modal_req_type_label: "조건 유형",
	gw_go_modal_req_value_label: "조건 값 (역할 ID 또는 숫자)",
	gw_go_modal_image: "미리보기 이미지 설정",
	gw_go_modal_image_label: "이미지 URL",

	// Moderation commands
	// /ban, /kick, /clear, /lock, /unlock, /avatar, /lockall,
	// /unban, /tempmute, /unmute

	// /avatar

	// /ban
	ban_not_permission: "${emoji_No} | 멤버를 차단할 권한이 없어요.",
	ban_dont_found_member: "🔍 | 이 멤버를 찾을 수 없어요",
	ban_dont_have_perm_myself:
		"${emoji_No} | 제게 멤버를 차단할 권한이 없어요!",
	ban_try_to_ban_yourself: "${emoji_No} | 자기 자신은 차단할 수 없어요!",
	ban_attempt_ban_higter_member:
		"${emoji_Stop} 본인보다 높은 역할을 가진 사용자는 차단할 수 없어요...",
	ban_cant_ban_member: "${emoji_No} | 그 멤버를 차단할 수 없어요",
	ban_message_to_the_banned_member:
		"`${guildName}` 서버에서 차단되었어요. 사유: **`${reason}`**",
	ban_command_work: "<@${authorId}> 님이 <@${memberId}> 님을 차단했어요",
	ban_logs_embed_title: "차단 로그",
	ban_logs_embed_description:
		"<@${authorId}> 님이 <@${memberId}> 님을 차단했어요",

	// /kick
	kick_not_permission: "${emoji_No} | 멤버를 추방할 권한이 없어요.",
	kick_dont_have_permission:
		"${emoji_No} | 제게 멤버를 추방할 권한이 없어요!",
	kick_attempt_kick_your_self: "${emoji_No} | 자기 자신은 추방할 수 없어요!",
	kick_attempt_kick_higter_member:
		"${emoji_Stop} 본인보다 높은 역할을 가진 사용자는 추방할 수 없어요...",
	kick_message_to_the_banned_member:
		"`${authorUsername}` 님이 **${guildName}** 서버에서 회원님을 추방했어요",
	kick_command_work: "${author} 님이 ${member} 님을 추방했어요",
	kick_logs_embed_title: "추방 로그",
	kick_logs_embed_description:
		"<@${authorId}> 님이 ${member} 님을 추방했어요",

	// /clear
	clear_dont_have_permission:
		"${emoji_No} | `MANAGE_MESSAGES` 권한이 없어요.",
	clear_max_message_limit:
		"${emoji_No} | 한 번에 99개보다 많은 메시지는 삭제할 수 없어요!",
	clear_channel_message_deleted: "메시지 ${messageCount}개를 삭제했어요!",
	clear_confirmation_message: "메시지 ${messageCount}개가 삭제되었어요!",
	clear_logs_embed_title: "메시지 삭제 로그",
	clear_logs_embed_description:
		"<@${authorId}> 님이 <#${channelId}>에서 메시지 ${messageCount}개를 삭제했어요",
	clear_command_no_message: "이 채널에 삭제할 메시지가 없어요",

	// /lock
	lock_embed_message_description: "<@${authorId}> 님이 채널을 잠갔어요.",
	lock_dont_have_permission: "${emoji_No} | 채널을 잠글 권한이 없어요.",
	lock_logs_embed_title: "잠금 로그",
	lock_logs_embed_description:
		"<@${authorId}> 님이 <#${channelId}> 채널을 잠갔어요",

	// /unlock
	unlock_embed_message_description: "채널 잠금을 해제했어요!",
	unlock_dont_have_permission:
		"${emoji_No} | 채널 잠금을 해제할 권한이 없어요.",
	unlock_logs_embed_title: "잠금 해제 로그",
	unlock_logs_embed_description:
		"<@${authorId}> 님이 <#${channelId}> 채널의 잠금을 해제했어요",

	// /lockall
	lockall_dont_have_permission:
		"${emoji_No} | 모든 채널을 잠글 권한이 없어요.",
	lockall_embed_message_description:
		"<@${authorId}> 님이 모든 채널을 잠갔어요.",
	lockall_logs_embed_title: "전체 잠금 로그",
	lockall_logs_embed_description: "<@${authorId}> 님이 모든 채널을 잠갔어요!",

	// /unlockall
	unlockall_embed_message_description:
		"<@${authorId}> 님이 모든 채널의 잠금을 해제했어요.",
	unlockall_logs_embed_title: "전체 잠금 해제 로그",
	unlockall_logs_embed_description:
		"<@${authorId}> 님이 모든 채널의 잠금을 해제했어요!",

	// /unban
	unban_dont_have_permission:
		"${emoji_No} | 멤버의 차단을 해제할 권한이 없어요.",
	unban_bot_dont_have_permission: "${emoji_No} | 제게 권한이 없어요.",
	unban_there_is_nobody_banned:
		"${emoji_No} | **이 서버에서 차단된 사람이 없어요!**",
	unban_the_member_is_not_banned:
		"${emoji_No} | **입력한 ID는 이 서버에서 차단되어 있지 않아요**!",
	unban_is_now_unbanned: "<@${userID}> 님의 이 서버 차단을 해제했어요!",
	unban_logs_embed_title: "차단 해제 로그",
	unban_logs_embed_description:
		"<@${authorId}> 님이 <@${userID}> 님의 서버 차단을 해제했어요!",
	unban_reason: "사유가 입력되지 않았어요.",

	// /tempmute
	tempmute_dont_have_permission:
		"${emoji_No} | 멤버에게 임시 타임아웃을 적용할 권한이 없어요.",
	tempmute_i_dont_have_permission: "${emoji_No} | 제게 권한이 없어요.",
	tempmute_cannot_mute_yourself:
		"${emoji_No} | 자기 자신에게 타임아웃을 적용할 수 없어요!",
	tempmute_already_muted: "이 사용자는 이미 타임아웃 상태예요!",
	tempmute_command_work:
		"<@${tomuteId}> 님에게 ${duration} 동안 타임아웃을 적용했어요\n**사유**: `${reason}`",
	tempmute_unmuted_by_time: "<@${tomuteId}> 님의 타임아웃이 해제되었어요!",
	tempmute_logs_embed_title: "임시 타임아웃 로그",
	tempmute_logs_embed_description:
		"<@${authorId}> 님이 <@${tomuteId}> 님에게 ${duration} 동안 타임아웃을 적용했어요\n**사유**: `${reason}`",
	tempmute_reason_create_roles: "임시 타임아웃용 역할 생성!",
	tempmute_tomute_is_admin:
		"${emoji_No} | 이 사용자는 관리자 권한이 있어서 타임아웃을 적용할 수 없어요.",
	tempmute_tomute_highest_role_or_same:
		"${emoji_No} | **이 서버에서 제 역할이 ${tomute} 님보다 낮거나 같아요. 이 멤버를 관리할 수 없어요.**",
	tempmute_cannot_mute_higher_role:
		"${emoji_No} | **${tomute} 님의 역할이 본인과 같거나 더 높아요. 이 멤버에게 타임아웃을 적용할 수 없어요.**",
	moderation_target_higher_role:
		"${emoji_No} | **${member} 님의 역할이 본인과 같거나 더 높아요. 이 멤버에게 이 작업을 할 수 없어요.**",
	tempmute_tomute_max_time_passed:
		"\n-# ${emoji_VC_OpenChat} Discord의 타임아웃은 최대 28일이에요. 28일로 적용했어요.",

	// /temprole
	temprole_dont_have_permission:
		"${emoji_No} | 멤버에게 임시 역할을 추가할 권한이 없어요.",
	temprole_i_dont_have_permission: "${emoji_No} | 저에게 권한이 없어요.",
	temprole_cannot_add_yourself:
		"${emoji_No} | 자기 자신에게는 임시 역할을 추가할 수 없어요!",
	temprole_already_has_role: "이 사용자는 이미 이 임시 역할을 가지고 있어요!",
	temprole_command_work:
		"<@${tomuteId}>님에게 ${duration} 동안 역할을 부여했어요\n**사유**: `${reason}`",
	temprole_removed_by_time: "<@${tomuteId}>님의 임시 역할이 제거되었어요!",
	temprole_logs_embed_title: "임시 역할 로그",
	temprole_logs_embed_description:
		"<@${authorId}>님이 <@${tomuteId}>님에게 ${duration} 동안 임시 역할을 추가했어요\n**사유**: `${reason}`",
	temprole_tomute_is_admin:
		"${emoji_No} | 이 사용자는 관리자 권한이 있어서 임시 역할을 추가할 수 없어요.",
	temprole_tomute_highest_role_or_same:
		"${emoji_No} | **이 서버에서 제 역할이 ${tomute}보다 낮거나 같아요. 이 멤버를 관리할 수 없어요.**",
	temprole_tomute_max_time_passed:
		"\n-# ${emoji_VC_OpenChat} 임시 역할의 최대 기간은 1년이에요. 1년으로 적용했어요.",

	// /unmute
	unmute_dont_have_permission:
		"${emoji_No} | 멤버를 임시 타임아웃할 권한이 없어요.",
	unmute_attempt_mute_your_self:
		"${emoji_No} | 자기 자신을 타임아웃할 수 없어요!",
	unmute_i_dont_have_permission: "${emoji_No} | 저에게 권한이 없어요.",
	unmute_not_muted: "이 사용자는 타임아웃 상태가 아니에요!",
	unmute_muted_role_doesnt_exist:
		"`muted` 역할이 존재하지 않아요. muted 역할이 생성되도록 먼저 사용자를 타임아웃해 주세요...",
	unmute_command_work: "<@${tomuteId}>님의 타임아웃을 해제했어요!",
	unmute_logs_embed_title: "타임아웃 해제 로그",
	unmute_logs_embed_description:
		"<@${authorId}>님이 <@${tomuteId}>님의 타임아웃을 해제했어요",
	unmuteall_no_muted_members: "타임아웃된 멤버를 찾지 못했어요.",
	unmuteall_audit_reason: "전체 타임아웃 해제",
	unmuteall_command_work:
		"멤버 ${unmuted}/${total}명의 타임아웃을 해제했어요.",
	unmuteall_logs_embed_title: "전체 타임아웃 해제 로그",
	unmuteall_logs_embed_description:
		"<@${authorId}>님이 멤버 ${unmuted}/${total}명의 타임아웃을 해제했어요.",

	// /warn
	warn_command_work:
		"${emoji_Yes} ${member}님에게 경고를 줬어요! **사유**: `${reason}`\n__경고 ID__: `${warnId}`",
	warn_logEmbed_title: "경고 로그",
	warn_logEmbed_desc:
		"${author}님이 ${member}님에게 `${reason}` 사유로 경고를 줬어요",
	warn_dont_have_permission:
		"${emoji_No} | 이 Discord 서버에서 멤버에게 경고를 줄 권한이 없어요.",

	// /unwarn
	unwarn_cannot_found:
		"${emoji_No} ${member}님은 제 데이터베이스에 경고 기록이 없는 것 같아요!",
	unwarn_cannot_found_id:
		"${emoji_No} ${member}님, 입력한 경고 ID가 제 데이터베이스에 없어요",
	unwarn_logEmbed_title: "경고 취소 로그",
	unwarn_logEmbed_desc: "${author}님이 ${member}님의 경고를 취소했어요",
	unwarn_dont_have_permission:
		"${emoji_No} | 이 Discord 서버에서 멤버의 경고를 제거할 권한이 없어요.",

	// /warnlist
	warnlist_no_data:
		"${emoji_No} ${member}님은 제 데이터베이스에 경고 기록이 없는 것 같아요!",
	warnlist_dont_have_permission:
		"${emoji_No} | 이 Discord 서버에서 멤버 경고를 관리할 권한이 없어요.",

	// /clear-allwarns
	clear_allwarns_confirmation_message:
		"**정말로 모든 경고 데이터를 삭제할까요?\n이 작업은 영구적이며 되돌릴 수 없어요.**\n**파괴적인 작업이에요!!**",
	clear_allwarns_command_ok: "이 Discord 서버의 모든 경고를 삭제했어요.",

	// /baninfo
	baninfo_not_banned: "차단된 사용자가 아니에요",
	baninfo_user_not_found: "사용자를 찾을 수 없어요",
	var_banned_by: "차단한 사람",
	var_ban_date: "차단 날짜",

	// /clearwarn
	clearwarn_command_ok:
		"${emoji_Yes} ${author}님, ${member}님의 경고 **`${allWarnCount}`**개를 지웠어요.",

	// /tempban
	tempban_dont_have_permission: "멤버를 임시 차단할 권한이 없어요.",
	tempban_i_dont_have_permission: "저에게 멤버를 차단할 권한이 없어요.",
	tempban_cannot_ban_yourself: "자기 자신을 차단할 수 없어요!",
	tempban_already_banned: "이 사용자는 이미 임시 차단되어 있어요!",
	tempban_command_work:
		"**<@${userId}>**님을 **${duration}** 동안 임시 차단했어요\n**사유**: `${reason}`",
	tempban_unbanned_by_time: "**<@${userId}>**님의 차단을 해제했어요!",
	tempban_logs_embed_title: "임시 차단 로그",
	tempban_logs_embed_description:
		"**<@${executorId}>**님이 **<@${userId}>**님을 **${duration}** 동안 임시 차단했어요\n**사유**: `${reason}`",
	tempban_user_is_admin: "이 사용자는 관리자 권한이 있어서 차단할 수 없어요.",
	tempban_user_highest_role_or_same:
		"이 서버에서 제 역할이 **${user}**보다 낮거나 같아요. 이 멤버를 관리할 수 없어요.",
	tempban_max_time_passed:
		"\n*임시 차단의 최대 기간은 1년이에요. 1년으로 적용했어요.*",
	tempban_user_not_in_guild: "이 사용자는 서버에 없지만 차단할 수는 있어요.",

	// Backup commands
	// /backup

	// /backup
	backup_wait_please: "⏲ 잠시만 기다려 주세요...",
	backup_not_admin: ":x: | 백업을 요청하려면 이 서버의 관리자여야 해요!",
	backup_i_dont_have_permission: "저에게 `ADMINISTRATOR` 권한이 없어요",
	backup_command_work_on_creation: ":white_check_mark: 백업을 생성했어요.",
	backup_command_work_info_on_creation: "백업이 생성되었어요! ID: `${id}`!",
	backup_logs_embed_title_on_creation: "백업 로그",
	backup_logs_embed_description_on_creation:
		"<@${authorId}>님이 백업을 생성했어요!",
	backup_dont_have_perm_on_load:
		":x: | 백업을 불러오려면 이 서버의 관리자여야 해요!",
	backup_i_dont_have_perm_on_load: "저에게 `ADMINISTRATOR` 권한이 없어요",
	backup_unvalid_id_on_load: ":x: | 올바른 백업 ID를 입력해 주세요!",
	backup_waiting_on_load: "${emoji_Yes} - 불러오는 중…",
	backup_error_on_load:
		":x: | 죄송해요, 오류가 발생했어요... 저에게 관리자 권한이 있는지 확인해 주세요!",
	backup_error_when_fetch_backup_on_load:
		":x: | ${backupID}에 해당하는 백업을 찾지 못했어요!",
	backup_this_is_not_your_backup: "${emoji_No} | 내 백업이 아니에요!",
	backup_backup_doesnt_exist: "오류: 이 백업은 존재하지 않아요.",
	backup_string_see_v:
		":placard:・카테고리 수: `${categoryCount}`\n:hash:・채널 수: `${channelCount}`",
	backup_all_of_your_backup: "**내 백업 전체:**",
	backup_string_see_another_v:
		":placard:・카테고리 수: `${categoryCount}`\n:hash:・채널 수: `${channelCount}`",
	backup_load_confirm:
		"${author}님,\n# 매우 위험한 작업이에요\n# 정말 이 백업을 불러올까요?\n서버의 현재 채널, 역할, 이모지, 차단, 설정 등이 모두 대체돼요.\n이 작업은 되돌릴 수 없어요!",
	backup_not_load: "요청에 따라 작업을 취소해서 백업을 불러오지 않았어요.",

	// /backup delete
	backup_really_want: "${emoji_Warning_Icon} 정말 이 백업을 삭제할까요?",
	backup_confirm_button: "네, 이 백업을 삭제할게요",
	backup_cancel_button: "작업 취소",
	backup_embed_title_succefully_deleted: "${emoji_Yes} 백업을 삭제했어요!",
	backup_embed_title_cancel_deletion: "${emoji_Yes} 백업을 유지했어요!",
	backup_embed_title_timesup_deletion:
		"${emoji_No} 시간이 초과됐어요. 백업을 유지했어요!",

	// /backup manage
	backup_manage_nique_tes_mort:
		"접근이 거부되었어요. 이 명령어는 서버 소유자 전용이에요.\n# 서버 보안을 위협하기 위해 백업 보호를 해제할 수 없어요.\n# 악용 시도는 모두 신고되고 차단돼요.",
	backup_manage_admin: "모든 관리자",
	backup_manage_owner: "서버 소유자",
	backup_manage_command_ok:
		"백업 모듈이 업데이트되었어요. 이제부터 ${allowed_user_string}만 이 서버에서 백업을 생성하거나 불러올 수 있어요.",
	// /backup panels
	backup_component_settings: "서버 설정",
	backup_component_settings_desc:
		"이름, 이미지, 레벨, 시스템 채널, 환영 화면",
	backup_component_roles: "역할",
	backup_component_roles_desc: "순서, 색상, 아이콘 및 권한",
	backup_component_channels: "채널",
	backup_component_channels_desc: "카테고리, 텍스트, 음성, 포럼 및 스레드",
	backup_component_permissions: "채널 권한",
	backup_component_permissions_desc: "각 채널의 역할 및 멤버별 권한 재정의",
	backup_component_emojis: "이모지",
	backup_component_emojis_desc: "서버의 모든 커스텀 이모지",
	backup_component_stickers: "스티커",
	backup_component_stickers_desc: "서버의 정적 및 움직이는 스티커",
	backup_component_bans: "차단",
	backup_component_bans_desc: "차단된 사용자와 사유",
	backup_component_automod: "자동 관리(AutoMod) 규칙",
	backup_component_automod_desc: "Discord 기본 관리 규칙",
	backup_component_events: "이벤트",
	backup_component_events_desc: "예약된 서버 이벤트",
	backup_component_messages: "메시지",
	backup_component_messages_desc: "각 채널의 최근 메시지 100개",
	backup_component_members: "멤버",
	backup_component_members_desc: "현재 멤버의 별명과 역할",
	backup_select_placeholder: "포함할 항목을 선택하세요",
	backup_usage: "백업 ${count}/${max}개 사용 중",
	backup_limit_reached:
		"백업 한도 **${max}개**에 도달했어요. 먼저 `/backup delete`로 하나를 삭제해 주세요.",
	backup_busy: "이미 백업 작업이 진행 중이에요. 잠시 후 다시 시도해 주세요.",
	backup_panel_expired:
		"이 패널이 만료되었어요. 명령어를 다시 실행해 주세요.",
	backup_btn_create: "백업 생성",
	backup_btn_all: "모두 선택",
	backup_btn_load: "초기화 후 복원",
	backup_btn_schedule_save: "일정 저장",
	backup_btn_schedule_disable: "끄기",
	backup_create_title: "새 백업",
	backup_create_desc: "**${guildName}**에서 저장할 항목을 선택하세요.",
	backup_create_progress:
		"${emoji} 백업을 생성하는 중이에요. 시간이 조금 걸릴 수 있어요...",
	backup_create_cancelled: "백업을 취소했어요.",
	backup_create_failed:
		"백업을 저장하지 못했어요. 목록에 아무것도 추가되지 않았어요.",
	backup_created_title: "백업 생성 완료",
	backup_created_desc:
		"백업 ID는 `${id}`예요. `/backup load`와 함께 사용하세요.",
	backup_created_partial: "**저장하지 못해서 복원되지 않는 항목:** ${parts}",
	backup_load_title: "백업 복원",
	backup_load_desc: "**${guildName}**의 백업, ${date}에 생성됨.",
	backup_load_warning:
		"**되돌릴 수 없어요.** 선택한 항목은 모두 이 서버에서 삭제된 뒤 복원돼요. 역할은 이름으로 매칭되어 업데이트되므로 멤버는 역할을 유지해요. 백업에 없는 역할은 채널도 함께 복원할 때만 제거돼요.",
	backup_load_progress:
		"${emoji} 복원하는 중이에요. 몇 분 정도 걸릴 수 있어요...",
	backup_load_done_title: "백업 복원 완료",
	backup_load_done_desc: "**${guildName}**을(를) 복원했어요.",
	backup_load_report_line: "${emoji} **${label}**: ${okCount}개 복원됨",
	backup_load_report_failed: "(${failedCount}개 실패)",
	backup_list_title: "내 백업",
	backup_list_empty: "아직 백업이 없어요. `/backup create`로 만들어 보세요.",
	backup_list_entry:
		"**${guildName}** · ${mode} · ${date}\n`${id}`\n카테고리 ${categoryCount}개, 채널 ${channelCount}개",
	backup_list_manual: "수동",
	backup_list_auto: "자동",
	backup_delete_title: "이 백업을 삭제할까요?",
	backup_delete_desc:
		"**${guildName}** `${id}`\n카테고리 ${categoryCount}개, 채널 ${channelCount}개",
	backup_delete_done: "백업을 삭제했어요.",
	backup_delete_cancelled: "백업을 유지했어요.",
	backup_schedule_title: "자동 백업",
	backup_schedule_desc:
		"자동 백업은 내 계정에 저장되며 한도에 포함돼요. 이 서버의 자동 백업은 최근 ${maxAuto}개만 보관돼요.",
	backup_schedule_owner_only: "서버 소유자만 자동 백업을 예약할 수 있어요.",
	backup_schedule_status_on: "사용 중: **${frequency}**, 다음 백업 ${next}",
	backup_schedule_status_off: "예약된 자동 백업이 없어요.",
	backup_schedule_frequency_placeholder: "주기를 선택하세요",
	backup_frequency_1d: "매일",
	backup_frequency_3d: "3일마다",
	backup_frequency_1w: "매주",
	backup_frequency_2w: "2주마다",
	backup_frequency_1m: "매월",
	backup_frequency_3m: "3개월마다",
	backup_frequency_6m: "6개월마다",
	backup_frequency_12m: "매년",
	backup_schedule_dm_limit:
		"**${guildName}**의 자동 백업을 건너뛰었어요: 백업 한도 ${max}개에 도달했어요. `/backup delete`로 하나를 삭제해 주세요.",
	backup_schedule_dm_failed:
		"**${guildName}**의 자동 백업에 실패했어요. 다음 예약 시간에 다시 시도할게요.",

	// Role Reactions
	// /reactionroles

	// /reactionroles
	reactionroles_dont_admin_added:
		":x: | 이 명령어를 사용하려면 이 서버의 관리자여야 해요!",
	reactionroles_embed_message_description_added:
		"__사용 방법__\n/rolesreaction add `<message id>` `<reaction>` `<rolesid>`\n/rolesreaction remove `<message id>` `<reaction>`\n/rolesreaction list `<message id>`",
	reactionroles_missing_reaction_added: "인수 누락: 반응 이모지",
	reactionroles_invalid_emote_format_added:
		"${emoji_No} | `CUSTOM_EMOJI`를 `<::xxx>` 형식으로 보내면 안 돼요! ID만 필요해요!",
	reactionroles_logs_embed_title_added: "반응 역할 로그",
	reactionroles_logs_embed_description_added:
		"<@${authorId}>님이 반응 역할을 설정했어요: 메시지: `${messagei}` | 반응: `${reaction}` | 역할: ${role}",
	reactionroles_command_work_added:
		"${role} 역할을 주도록 메시지 ${messagei}에 ${reaction}을(를) 추가했어요",
	reactionroles_missing_remove: "인수 누락: 반응 이모지",
	reactionroles_missing_reaction_remove:
		"제 데이터베이스에서 반응 역할을 찾지 못했어요...",
	reactionroles_cant_fetched_reaction_remove:
		"이 메시지에서 해당 반응을 가져올 수 없어요!",
	reactionroles_logs_embed_title_remove: "반응 역할 로그",
	reactionroles_logs_embed_description_remove:
		"<@${authorId}>님이 반응 역할을 삭제했어요: 메시지: `${messagei}` | 반응: `${reaction}`",
	reactionroles_command_work_remove:
		"메시지 ${messagei}에서 ${reaction}을(를) 삭제했어요",
	reactionroles_dont_message_found:
		"입력한 메시지 ID로 메시지를 가져올 수 없거나, 선택한 이모지가 제가 있는 서버의 이모지가 아니에요!",

	// /buttonreaction
	buttonreaction_logs_embed_title_added: "버튼 반응 로그",
	buttonreaction_logs_embed_description_added:
		"<@${authorId}>님이 버튼 반응을 설정했어요: 메시지: `${messagei}` | 반응: `${reaction}` | 역할: ${role}",
	buttonreaction_dont_message_found:
		"이 버튼을 추가할 수 없어요. 해당 역할이 이미 기존 버튼 중 하나에 설정되어 있는 것 같아요!",
	buttonreaction_roles_not_found:
		"인수 누락: 설정할 역할을 지정하지 않았어요!",
	buttonreaction_message_other_user_error:
		"다른 사용자의 메시지 구성 요소는 수정할 수 없어요. 제가 보낸 메시지를 선택해 주세요. 팁: `/utils embed`로 나만의 멋진 임베드를 만들어 보세요!",

	// /roleselect
	roleselect_invalid_message_id:
		"메시지 ID가 올바르지 않아요. 올바른 메시지 ID를 입력해 주세요.",
	roleselect_message_not_found: "지정한 채널에서 메시지를 찾지 못했어요.",
	roleselect_default_placeholder: "설정된 역할 선택",
	roleselect_menu1_placeholder: "작업 선택",
	roleselect_menu1_add: "역할 옵션 추가",
	roleselect_menu1_remove: "역할 옵션 제거",
	roleselect_menu1_change_placeholder: "선택 메뉴 안내 문구 변경",
	roleselect_menu1_save: "설정 저장 및 적용",
	roleselect_menu1_cancel: "취소",
	roleselect_menu1_embed_title: "역할 선택 설정",
	roleselect_menu1_embed_description:
		"사용자가 선택 메뉴에서 항목을 고르면 지정된 역할을 받아요",
	roleselect_modal1_title: "역할 옵션 추가",
	roleselect_modal1_fields1_label: "이모지",
	roleselect_modal1_fields1_placeholder:
		"이 역할 옵션의 이모지를 선택하세요 (선택 사항)",
	roleselect_modal1_fields2_label: "옵션 제목",
	roleselect_modal1_fields2_placeholder: "역할 옵션의 짧은 제목",
	roleselect_modal1_fields3_label: "설명",
	roleselect_modal1_fields3_placeholder:
		"역할 옵션을 설명해 주세요 (선택 사항)",
	roleselect_awaiting1_msg: "이 옵션에 사용할 역할을 선택하세요",
	roleselect_awaiting1_menu_placeholder: "역할 선택",
	roleselect_role_already_exist: "이미 설정에 있는 역할이에요.",
	roleselect_no_role_found: "제거할 역할 옵션이 없어요.",
	roleselect_all_role_removed: "모든 역할 옵션을 제거했어요.",
	roleselect_last_role_removed: "마지막 역할 옵션을 제거했어요.",
	roleselect_save_command_ok: "역할 선택 설정을 저장했어요!",
	roleselect_failed_to_save_config:
		"설정을 저장하지 못했어요. 다시 시도해 주세요.",
	roleselect_canceled_command_ok: "역할 선택 설정을 취소했어요.",
	roleselect_modal2_title: "선택 메뉴 안내 문구",
	roleselect_modal2_label: "안내 문구",
	roleselect_modal2_placeholder: "선택 메뉴 안내 문구",

	// New feature commands
	// /punishpub, /report, /support

	// /punishpub
	punishpub_not_admin:
		":x: | 이 명령어를 사용하려면 이 서버의 관리자여야 해요!",
	punishpub_too_hight_enable: "값이 너무 커요! 권장하지 않아요!",
	punishpub_negative_number_enable: "음수는 입력할 수 없어요!",
	punishpub_zero_number_enable: "0은 사용할 수 없어요!",
	punishpub_confirmation_message_enable:
		"PunishPub을 **사용**으로 설정했어요. 최대 감지 횟수는 **${amount}**회, 처벌은 **${punishement}**이에요!",
	punishpub_logs_embed_title: "PunishPub 로그",
	punishpub_logs_embed_description:
		"<@${authorId}>님이 PunishPUB을 켰어요. 최대 감지 횟수 ${amount}회, 처벌: ${punishement}!",
	punishpub_confirmation_disable: "PunishPub을 끄는 데 성공했어요",
	punishpub_logs_embed_title_disable: "PunishPub 로그",
	punishpub_logs_embed_description_disable:
		"<@${authorId}>님이 PunishPUB을 껐어요!",

	// /report
	report_cooldown_command:
		"죄송해요, 이 명령어를 다시 사용하려면 **${time}** 기다려야 해요!",
	report_owner_need: ":x: | **이 명령어를 사용하려면 서버 소유자여야 해요!**",
	report_specify:
		"버그 내용을 적어 주세요. 완전하고 알아보기 쉬운 문장으로 작성해 주세요!",
	report_command_work: "**버그를 제보해 주셔서 감사해요!**",

	// /support
	support_not_admin:
		":x: | 이 명령어를 사용하려면 이 서버의 관리자여야 해요!",
	support_command_work:
		"**${guildName}**의 서포트 모듈을 설정했어요.\n사용자 소개에 다음 내용이 있으면:\n**${input}**.\n<@&${rolesId}> 역할을 부여할게요!",
	support_command_work_on_disable:
		"**${guildName}**의 서포트 모듈을 설정했어요.\n이제 아무도 역할을 받지 않아요!",
	support_command_not_role: ":x: | 역할을 지정하지 않았어요!",
	support_command_not_type:
		":x: | 사용자 프로필에서 확인할 서포트 유형을 지정하지 않았어요 (bio = 소개, 예: 서버 링크 / tag = 서버의 Discord 태그)!",
	support_command_guild_not_have_tag: ":x: | 현재 서버에 태그가 없어요.",
	support_command_work_2:
		"${guildName}의 서포트 모듈을 설정했어요.\n사용자가 서버 태그를 달면\n<@&${rolesId}> 역할을 부여할게요!",

	// /setserverlang

	updates_embed_title: "iHorizon 업데이트",
	updates_embed_description: "iHorizon의 최신 변경 사항과 업데이트예요.",
	updates_field_version: "버전",
	updates_field_commit: "최신 커밋",
	updates_field_branch: "브랜치",
	updates_field_links: "링크",
	updates_changelog_attached: "전체 변경 내역은 PDF로 첨부되어 있어요.",
	newsletter_dm_title: "iHorizon {version} - 릴리스 노트",
	newsletter_dm_body:
		"안녕하세요 {owner}님,\n\niHorizon의 새로운 메이저 버전이 배포되었어요.\n\n**버전**: {version}\n**릴리스**: {releaseUrl}\n\n전체 변경 내역은 PDF로 첨부되어 있어요.\n\n도움이 필요하신가요? 서포트 서버에 참여하세요: https://discord.gg/ihorizon\n-# 구독 관리는 +updates를, 구독 취소는 아래 버튼을 사용하세요.",
	newsletter_btn_unsubscribe: "뉴스레터 구독 취소",
	newsletter_btn_subscribe: "뉴스레터 구독",
	newsletter_not_owner:
		"아하, 제 코드 변경 사항을 실시간으로 받아보고 싶을 만큼 관심을 가져 주시다니 기뻐요 :3\n\n**그런데 먼저 저를 Discord 서버에 추가해 주셔야 해요:**\n\n<https://discord.com/oauth2/authorize?client_id=${clientId}>\n**그러면 소식을 계속 전해 드릴게요.**\n\n> 다른 방법: discord.gg/ihorizon에 참여할 수도 있어요. 업데이트할 때마다 제 개발자들이 변경 내역과 함께 알림을 보내요. 선택은 자유예요 :3",
	newsletter_toggle_enabled: "뉴스레터 알림을 켰어요.",
	newsletter_toggle_disabled: "뉴스레터 알림을 껐어요.",
	setserverlang_not_admin:
		":x: | 이 명령어를 사용하려면 이 서버의 관리자여야 해요!",
	setserverlang_logs_embed_title_on_enable: "서버 언어 설정 로그",
	setserverlang_logs_embed_description_on_enable:
		"<@${authorId}>님이 iHorizon의 언어를 **${type}**(으)로 설정했어요!",
	setserverlang_already: "이미 이 언어로 설정되어 있어요!",
	setserverlang_command_work_enable: "이제 제 언어는 **${type}**이에요",
	setserverlang_panel_title: "언어 선택",
	setserverlang_panel_description:
		"이 서버에서 iHorizon이 사용할 언어를 선택하세요.",
	setserverlang_panel_current: "현재 언어",
	setserverlang_panel_select: "언어 선택...",
	setserverlang_panel_saved: "언어를 변경했어요!",
	setserverlang_command_error_enable: "오류!",

	// /embed
	embed_placeholder_string_select_menu_builder: "무엇을 할까요?",
	embed_placeholder_option_copy_embed: "임베드 복사",
	embed_placeholder_option_edit_title: "제목 편집",
	embed_placeholder_option_delete_title: "제목 삭제",
	embed_placeholder_option_edit_description: "설명 편집",
	embed_placeholder_option_delete_description: "설명 삭제",
	embed_placeholder_option_edit_author: "작성자 편집",
	embed_placeholde_option_change_footer_image: "푸터 아이콘 변경",
	embed_placeholder_option_delete_author: "작성자 삭제",
	embed_placeholder_option_edit_footer: "푸터 편집",
	embed_placeholder_option_delete_footer: "푸터 삭제",
	embed_placeholder_option_edit_thumbnail: "썸네일 편집",
	embed_placeholder_option_edit_image: "이미지 편집",
	embed_placeholder_option_edit_titleurl: "제목 URL 편집",
	embed_placeholder_option_edit_color: "색상 편집",
	embed_placeholder_option_delete_color: "색상 삭제",
	embed_btn_save: "임베드 저장",
	embed_btn_send: "임베드 보내기",
	embed_btn_cancel: "취소",
	embed_interaction_not_for_you: "이 상호작용은 당신을 위한 것이 아니에요",
	embed_first_message: "무엇을 할까요?",
	embed_save_message:
		"<@${authorId}>님, **임베드 설정을 저장하기로 했어요!**```임베드 ID: ${embedId}```",
	embed_cancel_message:
		"<@${authorId}>님, **임베드 설정을 취소하기로 했어요!**",
	embed_send_message:
		"<@${authorId}>님, **이 임베드를 어느 채널에 보낼까요?**",
	embed_timeout_getbtn:
		"<@${authorId}>님, **응답 시간이 너무 오래 걸려서 진행 중인 작업을 중단할게요!**",
	embed_choose_0: "임베드에 어떤 메시지를 넣을까요?",
	embed_choose_1: "임베드에 어떤 제목을 넣을까요?",
	embed_choose_2: "임베드 제목을 삭제했어요!",
	embed_choose_3: "임베드에 어떤 설명을 넣을까요?",
	embed_choose_4: "임베드 설명을 삭제했어요!",
	embed_choose_5: "임베드에 어떤 작성자를 넣을까요?",
	embed_choose_6: "임베드 작성자를 삭제했어요!",
	embed_choose_7: "임베드에 어떤 푸터를 넣을까요?",
	embed_choose_7bis: "임베드에 어떤 푸터 아이콘을 넣을까요?",
	embed_choose_8: "임베드 푸터를 삭제했어요!",
	embed_choose_9: "임베드에 어떤 썸네일 이미지를 넣을까요?",
	embed_choose_10: "임베드에 어떤 이미지를 넣을까요?",
	embed_choose_11: "임베드에 어떤 제목 URL을 넣을까요?",
	embed_choose_12: "임베드에 어떤 색상을 넣을까요? **www.color-hex.com**",
	embed_choose_12_error:
		"${emoji_No} | 올바르지 않은 색상이에요! **www.color-hex.com**을 확인해 주세요",
	embed_choose_13: "임베드 색상을 삭제했어요!",
	embed_send_embed_work:
		"<@${authorId}>님, **<#${messageContent}> 채널에 임베드를 보냈어요!**",
	embed_copy_bad_guild_msg: "메시지의 서버가 ${guildName}과(와) 달라요",
	embed_copy_bad_channel_msg: "메시지의 채널에 접근할 수 없어요!",
	embed_copy_bad_message_msg: "메시지에 접근할 수 없어요!",
	embed_copy_bad_embed_message_msg: "이 메시지에는 임베드가 없어요!",
	embed_copy_bad_url_msg:
		"URL이 올바르지 않아요. 다시 시도해 주세요. 올바른 형식: https://discord.com/channels/${messageGuildId}/${channelId}/${id}",
	embed_btn_replace: "임베드 교체",
	embed_replace_question_msg: "임베드를 교체할 메시지의 새 URL은 무엇인가요?",
	embed_replace_message:
		"{user}님, 새 임베드로 {messageUrl}의 임베드를 교체했어요",

	// /rolesaver
	rolesaver_embed_title: "역할 저장 모듈",
	rolesaver_embed_desc:
		"멤버가 서버를 나가면 역할이 데이터베이스에 저장돼요. 다시 들어오면 iHorizon이 역할을 돌려줘요.",
	rolesaver_embed_fields_1_name: "사용",
	rolesaver_embed_fields_2_name: "관리자 역할 복원",
	rolesaver_embed_fields_3_name: "제한 시간",
	rolesaver_on_off_already_set: "이 모듈은 이미 꺼져 있어요!",
	rolesaver_on_off_embed_title: "역할 저장 모듈",
	rolesaver_on_off_embed_desc:
		"멤버가 서버를 나가도 역할이 데이터베이스에 저장되지 않아요. 이제 iHorizon은 멤버가 서버에 돌아와도 예전 역할을 복원하지 않아요.",
	rolesaver_on_off_embed_fields_1_name: "사용",

	// /nigthmode
	var_nm_role_app_dont_exist:
		"${emoji_Warning_Icon} 봇에 애플리케이션 역할이 없어요. 봇을 올바르게 다시 추가해 주세요.\n",
	var_nm_role_app_not_high:
		"${emoji_Warning_Icon} 봇의 역할이 가장 높지 않아요. 맨 위로 올려 주세요.\n",
	var_nm_role_app_not_admin:
		"${emoji_Warning_Icon} 봇의 역할에 관리자 권한이 없어요.\n",
	var_nm_end_main: "야간 모드가 종료되고 있어요.\n\n",
	var_nm_start_main: "야간 모드가 곧 시작돼요.\n\n",
	var_nm_edited_roles: "다음 역할이 수정되었어요:",
	var_nm_running: "시작",
	var_nm_stopping: "종료",
	var_nm_running2: "시작",
	var_nm_stopping2: "종료",
	var_nm_title: "야간 모드",
	var_nm_ping_embed_title: "야간 모드 ${type}",
	var_nm_ping_embed_fields_0_name: "시간대",
	var_nm_error_occured: "# 야간 모드 ${type} 중에 문제가 발생했어요.\n",
	nightmode_embed_desc:
		"# ⭐️ 야간 모드\n> *야간 모드란?* 야간 모드는 **[iHorizon이 만든](https://www.ihorizon.org)** 보안 기능으로, 정해진 시간 동안 Discord 서버의 모든 관리자 권한을 비활성화해요.\n> *예를 들어 스태프가 많은 Discord 서버에서 습격, Discord 커스텀 초대 링크(vanity) 탈취 등을 막기 위해 밤에는 모든 관리자 권한을 없애고 싶을 때*\n> *제대로 찾아오셨어요. **iHorizon이 언제나 해결책이에요.***\n\n---\n",
	nightmode_embed_fields_0_name: "모듈 사용",
	nightmode_embed_fields_1_name: "서버 소유자에게 알림",
	nightmode_embed_fields_2_name: "봇 권한 해제?",
	nightmode_embed_fields_3_name: "허용 목록의 봇",
	nightmode_embed_fields_4_name: "시간대",
	nightmode_select_placeholder: "서버의 야간 모드를 설정하세요.",
	nightmode_select_0_label: "야간 모드 사용",
	nightmode_select_0_desc: "야간 모드를 켜거나 꺼요.",
	nightmode_select_1_label: "서버 소유자에게 알림",
	nightmode_select_1_desc: "켜거나 끌 때 서버 소유자에게 알려요",
	nightmode_select_2_label: "야간 모드 시간대 설정",
	nightmode_select_2_desc: "관리자 권한이 자동으로 제거되는 시간대예요.",
	nightmode_select_3_label: "봇 권한 해제",
	nightmode_select_3_desc: "밤 동안 봇의 권한도 해제할까요?",
	nightmode_select_4_label: "시간대 변경 (UTC)",
	nightmode_select_4_desc:
		"특정 시간대를 쓴다면 설정해야 해요 (UTC 숫자 형식)",
	nightmode_select1_placeholder: "밤 동안 관리자 권한을 유지할 수 있는 봇",
	nightmode_change_timezone_question: "Discord 서버의 UTC를 선택하세요",
	nightmode_modal_hours_window_fields0_label:
		"시작 시간 (예: 21:30 또는 2130)",
	nightmode_modal_hours_window_fields1_label:
		"종료 시간 (예: 06:15 또는 0615)",
	nightmode_modal_hours_window_title:
		"야간 모드 - 시간대 (24시간제, 분 포함)",
	nightmode_invalid_hour_morning:
		"${emoji_No} 시작 시간이 올바르지 않아요. 형식: 21:30 또는 2130",
	nightmode_invalid_hour_night:
		"${emoji_No} 종료 시간이 올바르지 않아요. 형식: 06:15 또는 0615",
	nightmode_utc_timezone_on: "UTC 시간대 사용",

	// /git lines
	git_lines_avoiding_spam:
		"죄송해요, 스팸 방지를 위해 표시되는 줄 수를 50줄로 제한하고 있어요",
	git_lines_avoiding_limit:
		"죄송해요, Discord에는 2000자 제한이 있어서 원하는 코드 조각을 표시할 수 없었어요",
	git_lines_work: "✅ Git Lines를 켰어요.",
	git_lines_work_disabled: "❌ Git Lines를 껐어요.",
	git_lines_borred_warning:
		"\n-# ${emoji_VC_OpenChat} 방해가 되나요? `/git lines`로 이 모듈을 끌 수 있어요!",

	// /counter config
	counter_config_command_action_on:
		"${author}님, 카운터 모듈을 `켜짐`으로 설정했어요.\n채널이 없다면 **/counter channel** 명령어로 설정해 주세요.",
	counter_config_command_action_off:
		"${author}님, 카운터 모듈을 `꺼짐`으로 설정했어요.",

	// /counter channel
	counter_channel_embed_title: "카운터 모듈이 여기에 설정되었어요!",
	counter_channel_embed_desc:
		"${author}님이 카운터 모듈을 여기에 설정했어요!\n이제 여기서 숫자를 셀 수 있어요!",
	counter_channel_command_work:
		"${author}님, 카운터 모듈을 ${channel} 채널에 설정했어요!",
	counter_channel_command_error:
		"${author}님, 명령어에서 오류가 발생했어요. 지정한 채널이 존재하는지, 카운터 모듈이 켜져 있는지 확인해 주세요!",

	counter_actual_number: "✨ **현재 숫자:** {number}",

	// Suggestion commands
	// /setsuggest, /suggest

	// /suggest accept
	suggest_accept_not_admin: "관리자가 아니에요!",
	suggest_acceptnot_good_channel:
		"이 명령어는 건의 모듈 채널(<#${channel}>)에서 실행해야 해요!\n건의 모듈이 꺼져 있지 않은지 확인해 주세요!",
	suggest_accept_not_found_db: "제 DB에서 건의를 찾지 못했어요!",
	suggest_accept_already_replied: "이 건의에는 이미 답변했어요!",
	suggest_accept_embed_fields_to_put: "${authorUsername}님의 답변 (수락)",
	suggest_accept_command_work:
		"건의를 수락했어요!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_accept_command_error: "Discord 채널에서 건의를 찾지 못했어요!",

	// /suggest deny
	suggest_deny_not_admin: "관리자가 아니에요!",
	suggest_deny_not_good_channel:
		"이 명령어는 건의 모듈 채널(<#${channel}>)에서 실행해야 해요!\n건의 모듈이 꺼져 있지 않은지 확인해 주세요!",
	suggest_deny_not_found_db: "제 DB에서 건의를 찾지 못했어요!",
	suggest_deny_already_replied: "이 건의에는 이미 답변했어요!",
	suggest_deny_embed_fields_to_put: "${authorUsername}님의 답변 (거절)",
	suggest_deny_command_work:
		"건의를 거절했어요!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_deny_command_error: "이 Discord 채널에서 건의를 찾지 못했어요!",

	// /suggest reply
	suggest_reply_not_admin: "관리자가 아니에요!",
	suggest_reply_not_good_channel:
		"이 명령어는 건의 모듈 채널(<#${channel}>)에서 실행해야 해요!\n건의 모듈이 꺼져 있지 않은지 확인해 주세요!",
	suggest_replynot_found_db: "제 DB에서 건의를 찾지 못했어요!",
	suggest_reply_already_replied: "이 건의에는 이미 답변했어요!",
	suggest_reply_embed_fields_to_put: "${authorUsername}님의 답변",
	suggest_reply_command_work:
		"건의에 답변을 보냈어요!\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",
	suggest_reply_command_error: "Discord 채널에서 건의를 찾지 못했어요!",

	// /suggest delete
	suggest_delete_not_delete: "관리자가 아니에요!",
	suggest_delete_not_good_channel:
		"이 명령어는 건의 모듈 채널(<#${channel}>)에서 실행해야 해요!\n건의 모듈이 꺼져 있지 않은지 확인해 주세요!",
	suggest_delete_not_found_db: "제 DB에서 건의를 찾지 못했어요!",
	suggest_delete_command_work: "건의를 삭제했어요!",
	suggest_delete_command_error: "이 Discord 채널에서 건의를 찾지 못했어요!",

	// /suggest status
	suggest_not_staff: "건의를 관리할 권한이 없어요.",
	suggest_status_pending: "대기 중",
	suggest_status_reviewing: "검토 중",
	suggest_status_accepted: "수락됨",
	suggest_status_planned: "예정됨",
	suggest_status_implemented: "반영됨",
	suggest_status_denied: "거절됨",
	suggest_notify_status:
		"<@${authorId}>님, 건의 상태가 **${status}**(으)로 바뀌었어요.",
	suggest_notify_reply: "<@${authorId}>님, 운영진이 건의에 답변했어요.",
	suggest_button_reply: "답변",
	suggest_modal_title: "건의에 답변하기",
	suggest_modal_label: "메시지",
	suggest_status_command_work:
		"건의 상태가 **${status}**(으)로 바뀌었어요.\nhttps://discord.com/channels/${guildId}/${channelId}/${messageId}",

	// /suggest list
	suggest_list_title: "건의 목록",
	suggest_list_empty: "표시할 건의가 없어요.",
	suggest_list_footer: "${totalCount}개 중 ${shownCount}개",

	// /setsuggest staff-role
	setsuggest_staff_role_set:
		"${author}님, 건의 운영진 역할이 이제 ${role}(이)에요.",
	setsuggest_staff_role_removed:
		"${author}님, 건의 운영진 역할을 제거했어요.",

	// /setsuggest disable
	setsuggest_disable_not_admin: "관리자가 아니에요!",
	setsuggest_disable_pw_on: "${author}님, 건의 모듈을 사용하도록 설정했어요!",
	setsuggest_disable_pw_off:
		"${author}님, 건의 모듈을 사용 안 함으로 설정했어요!",

	// /setsuggest channel
	setsuggest_channel_not_admin: "관리자가 아니에요!",
	setsuggest_channel_already_set_with_that:
		"${author}님, 건의 모듈 채널이 이미 ${channel}(으)로 설정되어 있어요!",
	setsuggest_channel_embed_title: "건의 모듈이 여기에 설정되었어요!",
	setsuggest_channel_embed_desc:
		"이제 이 채널에 메시지를 보낼 수 있는 모든 사용자는 메시지를 보내기만 하면 건의할 수 있어요!",
	setsuggest_channel_command_work:
		"${author}님, 건의 모듈 채널을 ${channel}(으)로 설정했어요!",

	// Security Command
	// /security

	// /security disable
	security_disable_not_admin: "관리자가 아니에요!",
	security_disable_pw_on: "${author}님, 보안 모듈을 켰어요!",
	security_disable_pw_off: "${author}님, 보안 모듈을 껐어요",

	// /security role-to-give
	security_role_to_give_not_admin: "관리자가 아니에요!",
	security_role_to_give_command_work:
		"${author}님, 보안 모듈의 역할을 ${role}(으)로 설정했어요!",

	// /security channel
	security_channel_not_admin: "관리자가 아니에요!",
	security_channel_command_work:
		"${author}님, 보안 모듈의 채널을 ${channel}(으)로 설정했어요!",

	// Schedule Command
	// /schedule

	// /schedule
	schedule_menu_placeholder: "무엇을 할까요?",
	schedule_menu_choice_0: "일정 만들기",
	schedule_menu_choice_1: "일정 삭제",
	schedule_menu_choice_2: "모든 일정 삭제",
	schedule_menu_choice_3: "모든 일정 보기",
	schedule_modal_title: "일정 관리",
	schedule_modal_fields_1_label: "일정 이름은?",
	schedule_modal_fields_2_label: "일정 설명은?",
	schedule_delete_question: "삭제할 일정의 ID가 무엇인가요?",
	schedule_deleteall_question: "정말 모든 일정을 삭제할까요? (Y/n)",
	schedule_delete_not_found: "이 멤버에게는 일정(${arg0})이 없어요!",
	schedule_delete_title_embed: "일정 삭제 중 (${arg0})",
	schedule_delete_confirm: "일정을 삭제했어요!",
	schedule_deleteall_title_embed: "모든 일정 삭제 중",
	schedule_deleteall_desc_embed: "모든 일정을 삭제했어요!",
	schedule_deleteall_confirm: "모든 일정을 삭제했어요!",
	schedule_deleteall_cancel: "`DELETE_ALL` 작업을 취소했어요!",
	schedule_list_not_schedule: "이 멤버에게는 일정이 없어요!",
	schedule_list_title_embed: "모든 일정 목록",
	schedule_list_fields_embed:
		"**종료 시각**: ${expiresAt}```${title}``````${description}```\n",
	schedule_list_content_message: "일정 목록이에요!",
	schedule_create_title_embed: "일정 만들기",
	schedule_create_when_question:
		"이 일정에 대해 언제 알림을 받을까요? (예: 6d = 6일, 2h = 2시간, 10m = 10분, 10s = 10초)",
	schedule_create_not_number_time:
		"${author}님, 입력한 값(이 일정의 알림을 받을 시간)이 숫자가 아니에요!",
	schedule_create_limit_reached:
		"${author}님, 이미 리마인더가 ${max}개 있어요. 새로 만들기 전에 하나를 삭제해 주세요.",
	schedule_create_embed_fields_name_confirm: "알림 날짜",
	schedule_create_embed_title_confirm: "#${scheduleCode} 일정을 만들었어요!",
	schedule_create_confirm_msg:
		"${author}님, 일정을 만들었어요!\n코드: `${scheduleCode}`",

	// PFPS Command
	// /pfps channel, /pfps config

	// /pfps config
	pfps_config_not_admin: ":x: 이 명령어를 실행할 관리자 권한이 없어요",
	pfps_config_command_action_on:
		"${author}님, PFPS 모듈을 `켜짐`으로 설정했어요.\n채널이 없다면 **/pfps channel** 명령어로 설정해 주세요.",
	pfps_config_command_action_off:
		"${author}님, PFPS 모듈을 `꺼짐`으로 설정했어요.",

	// /pfps channel
	pfps_channel_not_admin: ":x: 이 명령어를 실행할 관리자 권한이 없어요",
	pfps_channel_embed_title: "PFPS 모듈이 여기에 설정되었어요!",
	pfps_channel_embed_desc:
		"${author}님이 PFPS 모듈을 여기에 설정했어요!\n이제 30초마다 iHorizon이 이 서버의 무작위 사용자 아바타를 보내요!\n최선을 다해 볼게요!",
	pfps_channel_command_work:
		"${author}님, PFPS 모듈을 ${channel} 채널에 설정했어요!",
	pfps_channel_command_error:
		"${author}님, 명령어 실행 중 오류가 발생했어요. 지정한 채널이 존재하는지, PFPS 모듈이 켜져 있는지 확인해 주세요!",

	// Protection Module
	// /protect, /allowlist add, /allowlist remove, /allowlist show

	// /protect panel
	authorization_actions_not_permited:
		"보호 모듈의 권한 규칙은 서버 소유자만 편집할 수 있어요!",
	authorization_actions_everyone: "모두",
	authorization_actions_allowlist: "허용 목록의 멤버",
	authorization_actions_nobody: "아무도 없음 (서버 소유자 제외)",
	protect_panel_title: "보호 제어판",
	protect_panel_desc:
		"모든 보호 규칙을 설정하세요: 사용 여부, 규칙을 우회할 수 있는 대상, 책임자 멤버에게 적용할 제재를 선택할 수 있어요.",
	protect_panel_global_label: "전체 제재",
	protect_panel_global_hint: "개별 제재가 없는 모든 규칙에 적용돼요",
	protect_panel_select_placeholder: "설정할 규칙 선택",
	protect_panel_mode_placeholder: "이 규칙을 우회할 수 있는 대상 선택",
	protect_panel_sanction_placeholder: "적용할 제재 선택",
	protect_panel_bypass_label: "우회",
	protect_panel_sanction_label: "제재",
	protect_panel_rule_help:
		"이 규칙이 작동하면 해당 작업이 자동으로 되돌려지고, 책임자 멤버에게 제재가 적용돼요.",
	protect_panel_enable_button: "사용",
	protect_panel_disable_button: "사용 안 함",
	protect_panel_all_rules: "모든 규칙",
	protect_panel_all_rules_desc: "모든 규칙을 한 번에 변경",
	protect_panel_all_status:
		"규칙 ${ruleCount}개 중 ${enabledCount}개 사용 중",
	protect_panel_all_help:
		"우회 대상과 제재가 사용 중인 모든 규칙에 한 번에 적용돼요.",
	protect_panel_all_mixed: "혼합",
	protect_panel_enable_all_button: "모두 사용",
	protect_panel_disable_all_button: "모두 사용 안 함",
	protect_panel_all_mode_saved:
		"규칙 **${ruleCount}**개의 우회 대상: **${mode}**.",
	protect_panel_all_sanction_saved:
		"규칙 **${ruleCount}**개의 제재가 이제 **${sanction}**(이)에요.",
	protect_panel_all_enabled:
		"규칙 **${ruleCount}**개를 사용하도록 설정했어요!",
	protect_panel_all_disabled:
		"규칙 **${ruleCount}**개를 사용 안 함으로 설정했어요!",
	protect_panel_back_button: "뒤로",
	protect_panel_refresh_button: "새로고침",
	protect_panel_close_button: "패널 닫기",
	protect_panel_rule_enabled: "**${rule}** 규칙을 사용하도록 설정했어요!",
	protect_panel_rule_disabled:
		"**${rule}** 규칙을 사용 안 함으로 설정했어요!",
	protect_panel_mode_saved: "**${rule}** 규칙의 우회 대상: **${mode}**.",
	protect_panel_sanction_saved:
		"**${rule}**의 제재가 이제 **${sanction}**(이)에요.",
	protect_panel_global_saved: "전체 제재가 이제 **${sanction}**(이)에요.",
	protect_panel_api_error:
		"변경 사항을 적용하지 못했어요. 제게 `Administrator` 권한이 있는지 확인한 뒤 다시 시도해 주세요.",
	protect_panel_sanction_global: "전체 기본값",
	protect_panel_sanction_cancel: "작업만 취소",
	protect_panel_sanction_derank: "취소 + 역할 박탈",
	protect_panel_sanction_ban: "취소 + 차단",
	protect_panel_sanction_kick: "취소 + 추방",
	protect_panel_sanction_mute: "취소 + 타임아웃 (10분)",
	protect_panel_group_server: "서버 및 웹후크",
	protect_panel_group_channels: "채널",
	protect_panel_group_roles: "역할",
	protect_panel_group_members: "멤버",
	protect_panel_rule_webhook_name: "웹후크",
	protect_panel_rule_updateguild_name: "서버 편집",
	protect_panel_rule_createchannel_name: "채널 생성",
	protect_panel_rule_updatechannel_name: "채널 편집",
	protect_panel_rule_deletechannel_name: "채널 삭제",
	protect_panel_rule_createrole_name: "역할 생성",
	protect_panel_rule_deleterole_name: "역할 삭제",
	protect_panel_rule_updaterole_name: "역할 편집",
	protect_panel_rule_updatemember_name: "멤버 역할 편집",
	protect_panel_rule_banmembers_name: "멤버 차단",
	protect_panel_rule_kickmember_name: "멤버 추방",
	protect_panel_rule_unbanmembers_name: "멤버 차단 해제",
	protect_panel_rule_add_admin_roles_name: "관리자 역할 부여",
	// /allowlist show
	allowlist_show_not_permited:
		"이 명령어를 사용할 수 없어요! 허용 목록에 있어야 해요!",
	allowlist_show_embed_author: "허용 목록",

	// /allowlist add
	allowlist_add_not_permited:
		"이 명령어를 사용할 권한이 없어요! 허용 목록에 있어야 해요!",
	allowlist_add_not_owner:
		"허용 목록에 사용자를 추가/제거할 수 있는 건 서버 소유자뿐이에요!",
	allowlist_add_already_in: "추가하려는 멤버는 이미 허용 목록에 있어요!",
	allowlist_add_command_work: "${member}님을 허용 목록에 추가했어요!",

	// /allowlist delete
	allowlist_delete_not_permited:
		"이 명령어를 사용할 권한이 없어요! 허용 목록에 있어야 해요!",
	allowlist_delete_not_owner:
		"허용 목록에 사용자를 추가/제거할 수 있는 건 서버 소유자뿐이에요!",
	allowlist_delete_member_unreachable:
		"허용 목록에서 제거하려는 멤버를 찾을 수 없어요!",
	allowlist_delete_cant_remove_owner:
		"서버 소유자는 허용 목록에서 제거할 수 없어요!",
	allowlist_delete_isnt_in: "제거하려는 멤버가 허용 목록에 없어요!",
	allowlist_delete_command_work: "${member}님을 허용 목록에서 제거했어요!",

	// Custom Tag Module
	// /tag create, ... delete, ... edit, ... list, ... info

	tag_name: "태그",
	tag_embed_created_at: "생성일",
	tag_embed_last_update: "마지막 수정",
	tag_embed_last_updated_by: "마지막 수정자",

	// /tag create
	tag_create_not_permited:
		"태그를 만들 수 없어요.\n관리자 권한이 있거나 화이트리스트(`/tag wlroles-create`)에 있어야 해요.",
	tag_create_not_good_name:
		"태그 이름에는 공백이나 점을 넣을 수 없고, 16자를 넘을 수 없어요.",
	tag_create_command_work: "`${tag_name}` 태그를 만들었어요.",
	tag_create_already_exist: "이미 있는 태그예요.",
	tag_create_embed_doesnt_exist: "임베드가 존재하지 않아요.",

	// /tag delete
	tag_no_one_found: "이 서버에 저장된 태그가 없어요!",
	tag_delete_dnt_exist: "`${tag_name}` 태그가 존재하지 않아요.",
	tag_delete_command_ok: "`${tag_name}` 태그를 삭제했어요.",

	// /tag info
	tag_doesnt_exist: "`${tag_name}` 태그가 존재하지 않아요!",

	// /tag wlcreate
	tag_wlcreate_embed_title: "생성 화이트리스트 - 태그",
	tag_wlcreate_embed_desc: "태그를 만들 수 있는 모든 역할이에요.",

	// /tag wluse
	tag_wluse_embed_title: "사용 화이트리스트 - 태그",
	tag_wluse_embed_desc: "태그를 사용할 수 있는 모든 역할이에요.",

	// /tag list
	tag_list_no_anything: "이 서버에 저장된 태그가 없어요!",

	// /tag use
	tag_use_not_allowed:
		"`${tag_name}` 태그를 사용할 수 없어요.\n관리자 권한이 있어야 하며, 또는 태그 소유자 <@${createBy}>님에게 화이트리스트(`tag wlroles-use`)에 추가해 달라고 요청할 수 있어요.",
	tag_use_empty:
		"`${tag_name}` 태그가 비어 있어요: 텍스트도 임베드도 없어요.",
	tag_use_command_work: "`${tag_name}` 태그를 보냈어요.",

	// /tag edit
	tag_edit_error_perm:
		"태그를 수정하려면 관리자 권한이 있거나 태그 소유자여야 해요.",
	tag_edit_command_ok:
		"태그 이름을 **`${current_tag_name}`**에서 **`${new_tag_name}`**(으)로 변경했어요",

	// TempVoice Module
	// /text, /voice, /status, /staff

	// /voice interface set-text-channel
	tempvoice_if_text_not_admin:
		"<@${authorId}>님, 이 명령어를 사용할 권한이 없어요!",
	tempvoice_if_text_desc_embed:
		"## 임시 음성 채널 인터페이스\n이 **인터페이스**로 임시 음성 채널을 관리할 수 있어요.\n",
	tempvoice_if_text_fields_value_limit:
		"${emoji_VC_Limit} **인원 제한 변경**",
	tempvoice_if_text_fields_value_name: "${emoji_VC_Name} **이름 변경**",
	tempvoice_if_text_fields_value_region: "${emoji_VC_Region} **지역 변경**",
	tempvoice_if_text_fields_value_trust: "${emoji_VC_Trust} **신뢰**",
	tempvoice_if_text_fields_value_untrust: "${emoji_VC_Untrust} **신뢰 해제**",
	tempvoice_if_text_fields_value_block: "${emoji_VC_Block} **차단**",
	tempvoice_if_text_fields_value_unblock: "${emoji_VC_Unblock} **차단 해제**",
	tempvoice_if_text_fields_value_claim:
		"${emoji_VC_Claim} **소유권 가져오기**",
	tempvoice_if_text_fields_value_privacy: "${emoji_VC_Privacy} **공개 설정**",
	tempvoice_if_text_fields_value_transfer:
		"${emoji_VC_Transfer} **소유권 이전**",
	tempvoice_if_text_fields_value_delete: "${emoji_VC_Delete} **삭제**",

	// /voice inteface set-voice-channel
	tempvoice_vc_not_admin:
		"<@${authorId}>님, 이 명령어를 사용할 권한이 없어요!",

	// /voice interface set-staff-role
	tempvoice_staff_not_admin:
		"<@${authorId}>님, 이 명령어를 사용할 권한이 없어요!",
	tempvoice_staff_desc_embed:
		"## 임시 음성 채널 운영진 역할\n여기 나열된 역할은 이제 채널에 참여하고 관리할 수 있어요!\n",

	// Confession Module
	// /cooldown, /disable, /channel

	// /confession channel
	confession_channel_command_work: "고백 패널을 ${channel}에 보냈어요",
	confession_channel_panel_embed_desc:
		"# **익명 고백**\n\n아래 버튼을 클릭하면 고백 양식이 열려요. 고백하고 싶은 내용을 적어 주세요. 원한다면 고백을 비공개로 할 수도 있어요.\n고백이 항상 익명으로 유지되는 것은 아니라는 점을 기억해 주세요. 로그가 켜져 있으면 서버 소유자나 고백 로그에 접근할 수 있는 사람은 사용자를 확인할 수 있어요.\n\n## **고백하기**\n\n*참고: 고백을 비공개로 하려면 양식에 해당 옵션을 적어 주세요.*",
	confession_channel_log_embed_title: "고백 모듈 채널 설정",
	confession_channel_log_embed_desc:
		"${author}님이 채널을 ${channel}(으)로 설정했어요",

	// /confession cooldown
	confession_coolodwn_command_work:
		"${author}님, 고백 쿨다운이 이제 **${time}**(이)에요!",
	confession_cooldown_log_embed_title: "고백 모듈 쿨다운 설정",
	confession_cooldown_log_embed_desc:
		"${author}님이 쿨다운을 `${time}`(으)로 설정했어요",

	// /confession disable
	confession_disable_command_work_on: "고백 모듈을 사용하도록 설정했어요.",
	confession_disable_command_work_off:
		"고백 모듈을 사용 안 함으로 설정했어요.",
	confession_log_embed_title_on_enable: "고백 모듈 사용/사용 안 함",
	confession_log_embed_desc_on_enable:
		"${author}님이 고백 모듈을 사용하도록 설정했어요!",
	confession_log_embed_desc_on_disabled:
		"${author}님이 고백 모듈을 사용 안 함으로 설정했어요!",

	// /confession delete
	confession_sent_confirmation: "고백 **#${code}**을(를) 게시했어요.",
	confession_not_found: "코드 **#${code}**에 해당하는 고백이 없어요.",
	confession_delete_command_work: "고백 **#${code}**을(를) 삭제했어요.",
	confession_delete_log_embed_title: "고백 삭제",
	confession_delete_log_embed_desc:
		"${author}님이 고백 **#${code}**을(를) 삭제했어요",

	// /confession ban
	confession_ban_command_work:
		"고백 **#${code}**의 작성자는 이제 이 서버에서 고백할 수 없어요.",
	confession_ban_already:
		"고백 **#${code}**의 작성자는 이미 차단되어 있어요.",
	confession_ban_author_expired:
		"너무 오래된 고백이에요: 작성자 정보는 90일 후에 지워져요.",
	confession_ban_log_embed_title: "고백 작성자 차단",
	confession_ban_log_embed_desc:
		"${author}님이 고백 **#${code}**의 작성자를 차단했어요",
	confession_banned_error: "이 서버의 고백 모듈에서 차단되었어요.",

	// /confession unban
	confession_unban_command_work:
		"고백 **#${code}**에 연결된 차단을 해제했어요.",
	confession_unban_not_found: "고백 **#${code}**에 연결된 차단이 없어요.",
	confession_unban_log_embed_title: "고백 작성자 차단 해제",
	confession_unban_log_embed_desc:
		"${author}님이 고백 **#${code}**에 연결된 차단을 해제했어요",

	// /confession thread
	confession_thread_enabled:
		"이제부터 누군가 고백하면 임베드 아래에 토론 스레드를 만들게요.",
	confession_thread_disabled: "임베드 아래에 토론 스레드를 만들지 않아요.",

	// AntiSpam Module
	// /antispam manage

	// /antispam manage
	antispam_manage_embed_title: "스팸 방지 모듈 설정",
	antispam_manage_choices_1_label: "모듈 사용",
	antispam_manage_choices_1_desc: "스팸 방지 모듈 사용 여부 설정",
	antispam_manage_choices_2_label: "봇 무시",
	antispam_manage_choices_2_desc: "서버에 있는 봇의 스팸은 무시해요",
	antispam_manage_choices_3_label: "처벌 유형",
	antispam_manage_choices_3_desc: "사용자에게 어떤 제재를 줄지 선택해요",
	antispam_manage_choices_4_label: "처벌 기간",
	antispam_manage_choices_4_desc: "제재가 지속되는 기간",
	antispam_manage_choices_5_label: "처벌 기간 배수",
	antispam_manage_choices_5_desc:
		"처벌할 때마다 제재 기간을 배로 늘릴지 여부",
	antispam_manage_choices_6_label: "메시지 삭제",
	antispam_manage_choices_6_desc: "스팸 메시지를 삭제해요",
	antispam_manage_choices_7_label: "최대 메시지 간격",
	antispam_manage_choices_7_desc: "스팸으로 간주할 메시지 사이의 최대 간격",
	antispam_manage_choices_8_label: "최대 중복 메시지",
	antispam_manage_choices_8_desc: "제재 전까지 허용되는 최대 중복 메시지 수",
	antispam_manage_choices_9_label: "최대 중복 간격",
	antispam_manage_choices_9_desc:
		"사용자를 감지하기 위한 중복 메시지 사이의 간격",
	antispam_manage_choices_10_label: "최대 유사 메시지",
	antispam_manage_choices_10_desc: "제재 전까지 허용되는 최대 유사 메시지 수",
	antispam_manage_choices_12_label: "처벌 전 임계값",
	antispam_manage_choices_12_desc: "처벌 전까지의 최대 임계값",
	antispam_manage_select_menu_punish_mute_label: "멤버 타임아웃",
	antispam_manage_modal_title: "스팸 방지 설정",
	antispam_manage_button_label: "설정 저장",
	antispam_manage_preset_level1_name: "느긋한 모드",
	antispam_manage_preset_level2_name: "경계 모드",
	antispam_manage_preset_level3_name: "최고 보호 모드",
	antispam_manage_button_preset_label: "프리셋 불러오기",
	antispam_manage_selectstring_preset_label: "프리셋 설정",

	// /antispam bypass-roles
	antispan_bypassroles_embed_desc:
		"아래의 모든 역할은 스팸 방지 모듈을 우회할 수 있어요",

	// /antispam bypass-roles
	antispam_ignorechannels_embed_desc:
		"아래 채널에서 보낸 메시지는 스팸 방지 모듈을 우회해요",

	// Stats Module
	// /stats ustats

	// /stats ustats
	header_h1_value: "{author_username}님의 메시지 통계",
	messages_word: "메시지",
	voice_activity: "음성 활동",
	minutes_word: "분",
	top_voice: "상위 음성 채널",
	top_message: "상위 메시지 채널",
	var_members: "명",

	// Starboard Module
	// lazy

	// /starboard channel
	starboard_channel_command_ok:
		"${emoji_Yes} | **스타보드 채널이 이제 ${channel}(으)로 설정되었어요**. 이제 서버 멤버가 메시지에 '⭐' 반응을 남겨 **`${threshold}`**개 기준을 넘으면, 메시지가 ${channel}에 전송돼요!",

	// /starboard config
	starboard_config_command_ok:
		"${emoji_Yes} | **스타보드 모듈이 이제 ${action}**",

	// /starboard threshold
	starboard_threshold_command_ok:
		"${emoji_Yes} | 이제 서버 멤버가 메시지에 '⭐' 반응을 남겨 **`${amount}`**개 기준을 넘으면, 메시지가 지정된 채널에 전송돼요!",

	// /starboard create-thread
	starboard_create_thread_command_ok:
		"${emoji_Yes} | 이제 서버 멤버가 메시지에 '⭐' 반응을 남겨 **`${amount}`**개 기준을 넘으면, 메시지가 지정된 채널에 전송돼요 **`${action}`**",
	starboard_create_thread_yes: "토론 스레드도 만들어져요",
	starboard_create_thread_no: "토론 스레드는 만들어지지 않아요",

	// /skullboard channel
	skullboard_channel_command_ok:
		"${emoji_Yes} | **스컬보드 채널이 이제 ${channel}(으)로 설정되었어요**. 이제 서버 멤버가 메시지에 '💀' 반응을 남겨 **`${threshold}`**개 기준을 넘으면, 메시지가 ${channel}에 전송돼요!",

	// /skullboard config
	skullboard_config_command_ok:
		"${emoji_Yes} | **스컬보드 모듈이 이제 ${action}**",

	// /skullboard threshold
	skullboard_threshold_command_ok:
		"${emoji_Yes} | 이제 서버 멤버가 메시지에 '💀' 반응을 남겨 **`${amount}`**개 기준을 넘으면, 메시지가 지정된 채널에 전송돼요!",

	// /skullboard create-thread
	skullboard_create_thread_command_ok:
		"${emoji_Yes} | 이제 서버 멤버가 메시지에 '💀' 반응을 남겨 **`${amount}`**개 기준을 넘으면, 메시지가 지정된 채널에 전송돼요 **`${action}`**",

	// Notifier Module
	// notifier author, notifier config

	// /notifier author add
	notifier_author_add_author_doesnt_exist:
		"작성자가 존재하지 않아요. ID를 확인해 주세요.",

	// /notifier config channel
	notifier_config_channel_logsEmbed_title: "알림 채널 모듈",
	notifier_config_channel_logsEmbed_desc:
		"<@${authorId}>님이 알림 채널 모듈을 ${channel}(으)로 설정했어요",
	notifier_config_message_command_ok:
		"이제 스트리머나 유튜버가 영상을 올리면 ${channel}에 메시지를 보낼게요",

	// /notifier config message
	notifier_config_message_helpEmbed_title: "사용자 지정 알림 메시지",
	notifier_config_message_helpEmbed_desc:
		"{artistAuthor} => 스트리머/유튜버의 사용자명\n{artistLink} => 스트리머/유튜버의 링크\n{mediaURL} => 스트리머/유튜버의 영상 URL",
	notifier_config_message_embed_fields_notifyMessage: "알림 메시지",
	notifier_config_message_awaiting_response: "알림 메시지를 입력해 주세요.",
	notifier_config_message_command_work_on_enable:
		"${emoji_GreenTick} | 알림 메시지를 설정했어요.",

	// Blogger Module

	// blogger
	blogger_generateBlogsEmbed_embed_desc: "설정된 RSS 피드 목록:\n\n",
	blogger_generateBlogsEmbed_embed_title: "📰 RSS 블로그 설정",
	blogger_generateConfigurationEmbed_embed_title: "📰 블로거 설정",
	blogger_no_rss: "설정된 RSS 피드가 없어요.",
	blogger_generateConfigurationEmbed_embed_fields_1_name: "상태",
	blogger_generateConfigurationEmbed_embed_fields_2_name: "전체 블로그",
	blogger_unknown_blog: "알 수 없는 블로그",
	blogger_on_new_article_default_message:
		"📰 새 글이 올라왔어요!\n**{articleTitle}** - {articleAuthor}\n{articleLink}",
	blogger_config_status_enabled:
		"✅ 블로거 모듈을 **사용**하도록 설정했어요. RSS 피드를 모니터링해요.",
	blogger_config_status_disabled:
		"❌ 블로거 모듈을 **사용 안 함**으로 설정했어요. RSS 피드를 더 이상 모니터링하지 않아요.",
	blogger_read_article: "글 읽기",
	blogger_blog_add_invalid_channel:
		"잘못된 채널 유형이에요. 텍스트 채널을 선택해 주세요.",
	blogger_blog_add_success:
		"✅ RSS 피드 **${validationName}**을(를) 추가했어요! 알림은 ${channel}에 전송돼요 (ID: `${blogId}`)",
	blogger_blog_add_invalid_rss:
		"❌ 입력한 RSS 피드가 유효하지 않거나 접근할 수 없어요. URL을 확인하고 다시 시도해 주세요.",
	blogger_blog_remove_success: "✅ ID `${blogId}`의 RSS 피드를 제거했어요.",
	blogger_blog_remove_not_found: "❌ 이 ID의 RSS 피드를 찾을 수 없어요.",
	lastfm_module_not_configured:
		"${emoji_No} | 봇에 Last.fm 모듈이 설정되어 있지 않아요. 봇의 `.env`에 `LASTFM_API_KEY`와 `LASTFM_SHARED_SECRET`을 설정해 주세요.",
	lastfm_config_login_required:
		"${emoji_No} | 모듈을 사용하기 전에 `/lastfm login`을 먼저 사용해 주세요.",
	lastfm_config_enabled:
		"${emoji_Yes} | 내 계정에서 Last.fm 스크로블링을 사용하도록 설정했어요.",
	lastfm_config_disabled:
		"${emoji_Yes} | 내 계정에서 Last.fm 스크로블링을 사용 안 함으로 설정했어요.",
	lastfm_login_invalid_session:
		"${emoji_No} | Last.fm에서 유효한 세션을 받지 못했어요.",
	lastfm_login_success:
		"${emoji_Yes} | Last.fm 계정 `${username}`이(가) 연결되었고 스크로블링을 사용하도록 설정했어요.",
	lastfm_embed_title: "${userLabel}님의 Last.fm 설정",
	lastfm_embed_field_status: "상태",
	lastfm_embed_field_account: "연결된 계정",
	lastfm_embed_field_connected_at: "연결 날짜",
	lastfm_api_error_login:
		"${emoji_No} | Last.fm에 연결할 수 없어요: ${error}",
	lastfm_api_error_nowplaying:
		"${emoji_No} | Last.fm에 지금 재생 중인 곡을 알릴 수 없어요: ${error}",
	lastfm_api_error_scrobble:
		"${emoji_No} | 이 곡을 스크로블할 수 없어요: ${error}",
	lastfm_api_error_unknown: "알 수 없는 오류",

	// AuthRestore Module
	// role, set, delete, get, force-join

	rc_key_doesnt_exist:
		"${emoji_No} 키 **${secretCode}**에 해당하는 AuthRestore 모듈이 존재하지 않아요!",
	rc_verify: "인증",

	// /authrestore role
	rc_role_embed_title: "AuthRestore 새 변경 사항",
	rc_role_embed_field1_name: "인증 후 새로 부여할 역할",

	// /authrestore set
	rc_command_ok:
		'${author}님, "AuthRestore" 모듈을 설정했어요. 이제 Discord 서버의 멤버가 버튼을 클릭하고 OAuth2로 로그인하면 데이터베이스에 추가돼요. 나중에 OAuth2를 통해 서버에 자동으로 참여시킬 수 있어요.\n# 꼭 읽어 주세요\n이제 메시지 ${msgLink}에 인증용 버튼이 있어요.\n아래는 누구에게도 공개하면 안 되는 비공개 코드예요. 이 코드를 가진 사람은 설정을 삭제하거나 멤버를 자기 서버에 추가할 수 있어요... 안전한 곳에 보관하세요. iHorizon은 이 코드를 다시는 알려 주지 않아요:\n```${secretCode}```',
	rc_command_ok_dm: "# ${guildName}의 AuthRestore 코드\n```${secretCode}```",
	rc_command_dm_failed:
		"개인 메시지로 코드를 보내려고 했지만, DM이 막혀 있어요 :/",
	rc_command_dm_ok: "혹시 놓쳤을까 봐 개인 메시지로 코드를 보냈어요!",
	rc_command_horizongw_down: "오류: HorizonGateway가 다운되었을 수 있어요",

	// /authrestore delete
	rc_delete_config_not_found: "이 서버의 모듈 설정을 찾을 수 없어요!",
	rc_delete_command_ok:
		'${author}님, "AuthRestore" 모듈 설정을 삭제했어요. 보안(데이터) 상의 이유로 지금은 버튼만 삭제하고, OAuth2 데이터와 비밀 코드는 48시간 후에 삭제돼요!',

	// /authrestore get
	rc_get_mainEmbed_title: "AuthRestore 일반 정보",
	rc_get_mainEmbed_field1_name: "서버 ID",
	rc_get_mainEmbed_field2_name: "인증 후 부여할 역할",
	rc_get_mainEmbed_field3_name: "생성일",
	rc_get_mainEmbed_field3_value: "*날짜는 MM/DD/YYYY HH:mm 형식이에요*",
	rc_get_mainEmbed_field4_name: "키 사용 횟수",
	rc_get_mainEmbed_field5_name: "설정한 사람",
	rc_get_secondEmbed_title: "저장된 사용자",
	rc_get_secondEmbed_footer: "페이지 ${from} / ${to}",
	rc_get_locale: "언어",
	rc_get_username: "사용자명",
	rc_get_unkwnon_user: "알 수 없는 사용자 (${authorId})",

	// /authrestore force-join
	rc_forceJoin_embed_title: "AuthRestore - 강제 참여",
	rc_forceJoin_embed_desc:
		"## 정말 이 서버에 멤버를 강제로 참여시킬까요?\n### 꼭 읽어 주세요:\n이 작업을 확인하면 현재 비공개 키가 폐기돼요. 새 키가 발급될 거예요.\n\n\n",
	rc_forceJoin_embed_field1: "찾은 멤버",
	rc_forceJoin_embed_field2: "이미 있는 멤버",
	rc_forceJoin_embed_field3: "참여 가능",
	rc_forceJoin_embed_2_field1: "참여 가능",
	rc_forceJoin_embed_2_field2: "참여 완료",
	rc_forceJoin_ws_size:
		"# 멤버 **${value2}**명을 서버에 추가할 준비 중이에요.",
	rc_forceJoin_ws_start: "# 강제 참여 진행 중...",
	rc_forceJoin_ws_end: "# 강제 참여가 완료되었어요.",
	rc_forceJoin_ws_end_renew_msg:
		"# 꼭 읽어 주세요\n아래는 누구에게도 공개하면 안 되는 비공개 코드예요. 이 코드를 가진 사람은 설정을 삭제하거나 멤버를 자기 서버에 추가할 수 있어요... 안전한 곳에 보관하세요. iHorizon은 이 코드를 다시는 알려 주지 않아요:\n```${value2}```",

	// Misc category
	// media manipulation

	// media cooldown
	media_gen_cooldown: "미디어 생성 사이에는 `1분 30초`를 기다려야 해요!",
	media_gen_error_args: "유효한 이미지 URL 두 개를 입력해 주세요.",

	// Batch processing message
	batch_ban_process:
		"🔄 서버 ${guildCount}곳에서 ${memberUsername}님을 차단하는 중...",
	batch_unban_process:
		"🔄 멤버 ${bannedMemberCount}명의 차단을 해제하는 중...",
	batch_unblacklist_process:
		"🔄 서버 ${guildObjectCount}곳에서 ${bannedMemberUsername}님을 블랙리스트에서 제거하는 중...",
	unbanall_undo_command_err:
		"다시 차단할 멤버가 없어요. 먼저 전체 차단 해제 명령어를 사용해 주세요.",

	// -----------------------------/ \-----------------------------
	// Confession Module Events
	confession_module_modal_title: "고백 보내기",
	confession_module_modal_components1_label: "무엇을 고백하고 싶나요?",
	confession_module_modal_components1_placeholder: "음...",
	confession_module_modal_components2_label: "비공개인가요?",

	// Music Player Events

	even_mp_playerStart_tip:
		"> ${emoji_LastFM_Logo} iHorizon에서 `/lastfm`으로 음악을 스크로블할 수 있다는 사실, 알고 계셨나요? ${emoji_Sunglass}",
	event_mp_audioTrackAdd:
		"${emoji_Player_Queue_Add} - ${trackTitle}을(를) 대기열에 추가했어요!",
	event_mp_playerError: "연결에 문제가 있어요 => ${errorMessage}",
	event_mp_error: "곡 대기열에 문제가 생겼어요 => ${errorMessage}",
	event_mp_emptyChannel:
		"${emoji_No} | 음성 채널에 아무도 없어서 나갈게요...",
	event_mp_playerSkip:
		"${emoji_Music_Icon} - **${trackTitle}**을(를) 건너뛸게요!",
	event_mp_emptyQueue:
		"${emoji_Warning_Icon} - 대기열에 남은 곡이 없어서 음악을 멈췄어요!",

	// Channel Create Events
	event_channel_create_message_embed_title: "설정 완료!",
	event_channel_create_message_embed_description:
		"봇이 완벽하게 설정됐어요. 이제 더 이상 아무것도 하지 않으셔도 돼요 (zen).\n\niHorizon과 관련된 모든 모더레이션 로그가 여기에 표시돼요",

	// Welcome Message Events
	event_welcomer_inviter:
		"{memberMention}님(계정 생성일: {accountCreationTimestamp})이 서버에 들어왔어요. **{inviterUsername}**님(초대 **{invitesCount}**회)의 초대로 왔어요. 이제 {guildName}의 멤버는 {memberCount}명이에요",
	event_welcomer_default:
		"{memberMention}님(계정 생성일: {accountCreationTimestamp})이 서버에 들어왔어요. 이제 {guildName}의 멤버는 {memberCount}명이에요",

	// Goodbye Message Events
	event_goodbye_inviter:
		"`{memberUsername}`님(계정 생성일: {accountCreationTimestamp})이 서버를 떠났어요. **{inviterUsername}**님(초대 **{invitesCount}**회)의 초대로 왔었어요. 이제 {guildName}의 멤버는 {memberCount}명이에요",
	event_goodbye_default:
		"`{memberUsername}`님(계정 생성일: {accountCreationTimestamp})이 서버를 떠났어요. 이제 {guildName}의 멤버는 {memberCount}명이에요",

	// XP Level Events
	event_xp_level_earn:
		"**GG**, {memberMention}님 레벨이 올랐어요! (레벨: **{xpLevel}**)",
	event_xp_level_additional_info:
		"\n-# ${emoji_VC_OpenChat} 이 메시지가 귀찮으신가요? `/ranks config` 명령어로 레벨 시스템을 끄면 이 메시지도 사라져요.",

	// Ticket Module Events:
	event_ticket_embed_description:
		"${userUsername}님, 안녕하세요! 티켓에 오신 걸 환영해요. 곧 담당자가 도와드릴 테니 조금만 기다려 주세요. 티켓을 닫으려면 `/ticket close` 명령어를 사용해 주세요",
	event_ticket_add_member:
		"${author}님, ${addedMembers}을(를) 티켓 ${channel}에 **추가**했어요!",
	event_ticket_del_member:
		"${author}님, ${removedMembers}을(를) 티켓 ${channel}에서 **제거**했어요!",
	event_ticket_button_name: "티켓 만들기",
	event_ticket_category_awaiting_response:
		"어떤 카테고리인가요 [${emoji}] >> ${name}",
	event_ticket_reason_awaiting_response:
		"${author}님, 사용자가 티켓을 만들기 전에 사유를 입력하도록 할까요?",
	event_ticket_create_reason_modal_title: "티켓을 만드는 사유가 무엇인가요?",
	event_ticket_create_reason_modal_fields_1_label: "티켓 사유",
	event_ticket_reason_embed_desc: "# 티켓 사유\n```${reason}```",

	// interactionCreate Events:
	iC_event_cooldown: "쿨다운 중이에요. 명령어 사이에 잠시 기다려 주세요!",
	iC_event_connection_error: "연결 오류!",

	// Cooldown
	Msg_cooldown: "명령어를 실행하기 전에 잠시만 기다려 주시겠어요?",

	// Ticket Module
	ticket_module_button_delete: "티켓 삭제",
	ticket_module_button_transcript: "티켓 대화 기록",
	ticket_module_button_addmember: "멤버 추가",
	ticket_module_button_removemember: "멤버 제거",
	ticket_module_add_question:
		"티켓에 누구를 추가할까요? (사용자 ID를 입력해 주세요)!",
	ticket_module_remove_question:
		"티켓에서 제거할 사용자는 누구인가요? (사용자 ID를 입력해 주세요)!",
	ticket_transcript_failed_to_send:
		"개인 메시지로 파일을 보내려고 했지만, DM을 막아 두셨네요 :/",

	// Server Logs
	event_srvLogs_banAdd_description:
		"<@${executorId}>님이 <@${targetId}>님을 **차단**했어요",
	event_srvLogs_banAdd_fields_name: "사유",
	event_srvLogs_banAdd_fields_value: "```{reason}```",
	event_srvLogs_banRemove_description:
		"<@${executorId}>님이 ${targetUsername}님의 **차단을 해제**했어요",
	event_srvLogs_guildMemberRemove_description:
		"<@${executorId}>님이 <@${targetId}>님을 **추방**했어요",
	event_srvLogs_guildMemberUpdate_description:
		"📤 <@${executorId}>님이 ${oldMemberUserUsername}님에게서 ${removedRoles} 역할을 제거했어요",
	event_srvLogs_guildMemberUpdate_2_description:
		"📥 <@${executorId}>님이 ${oldMemberUserUsername}님에게 ${addedRoles} 역할을 추가했어요",
	event_srvLogs_messageDelete_description:
		"**<#${messageChannelId}>에서 메시지가 삭제됐어요**\n${messageContent}",
	event_srvLogs_messageUpdate_description:
		"**<#${oldMessageChannelId}>**[에서](xxx) **메시지가 편집됐어요**",
	event_srvLogs_messageUpdate_footer_1: "이전",
	event_srvLogs_messageUpdate_footer_2: "이후",
	event_srvLogs_voiceStateUpdate_description:
		"📤 <@${targetUserId}>님이 <#${OchannelID}> 채널에서 나갔어요",
	event_srvLogs_voiceStateUpdate_2_description:
		"📥 <@${targetUserId}>님이 <#${channelID}> 채널에 들어왔어요",
	event_srvLogs_voiceStateUpdate_3_description:
		"<@${targetUserId}>님이 <#${channelID}> 채널에서 헤드셋을 음소거했어요",
	event_srvLogs_voiceStateUpdate_4_description:
		"<@${targetUserId}>님이 <#${channelID}> 채널에서 헤드셋 음소거를 해제했어요",
	event_srvLogs_voiceStateUpdate_5_description:
		"<@${targetUserId}>님이 <#${channelID}> 채널에서 마이크를 음소거했어요",
	event_srvLogs_voiceStateUpdate_6_description:
		"<@${targetUserId}>님이 <#${channelID}> 채널에서 마이크 음소거를 해제했어요",
	event_srvLogs_channelUpdate_disabled_for:
		"-    ❌ ${target}에 대해 ${perm} 사용 안 함\n",
	event_srvLogs_channelUpdate_enabled_for:
		"-    ✅ ${target}에 대해 ${perm} 사용\n",
	event_srvLogs_channelUpdate_allowed_for:
		"-    ✅ ${target}에 대해 ${perm} 허용\n",
	event_srvLogs_channelUpdate_unallowed_for:
		"-    ❌ ${target}에 대해 ${perm} 허용 안 함\n",
	event_srvLogs_channelUpdate_field_name: "🎫 이름: ${newChannelName}\n",
	event_srvLogs_channelUpdate_perm_added: "🛡 ${target}에 대해 추가된 권한:\n",
	event_srvLogs_channelUpdate_embed_desc:
		"${newChannel} 채널이 업데이트됐어요",

	// RankUp event
	event_rank_role:
		"<@${messageAuthorId}>님, 이제 <@&${id}> 역할을 갖게 됐어요",

	// Suggestion Event
	event_suggestion_too_short:
		"<@${authorId}>님, 건의는 최소 5단어 이상이어야 해요. 메시지는 10초 후에 삭제되니, 다시 쓰고 싶다면 복사해 두세요.",
	event_suggestion_embed_author: "${messageAuthorUsername}님의 새 건의",

	// Security Event
	event_security_title: "${guild}에 오신 걸 환영해요!",
	event_security: "${member}님, 이 메시지에 표시된 캡차를 입력해 주세요.",
	event_security_expiry:
		"{emoji} ${timestamp} 자동 추방 (남은 시도 횟수: **${attempts}**회).",
	event_security_footer:
		"몇 초면 끝나요. 커뮤니티를 안전하게 지키는 데 도움이 돼요.",
	event_security_kick_reason: "보안 인증 실패",

	// Ticket Event
	event_ticket_whenCreated_msg:
		"${author}님, 티켓이 만들어졌어요. <#${channelId}>(으)로 가 보세요!",
	event_ticket_logsChannel_onCreation_embed_title: "티켓 로그 - 패널 생성",
	event_ticket_logsChannel_onCreation_embed_desc:
		"${interaction}에 `${name}` 티켓 패널이 만들어졌어요!",
	event_ticket_logsChannel_onCreationChannel_embed_title:
		"티켓 로그 - 티켓 생성",
	event_ticket_logsChannel_onCreationChannel_embed_desc:
		"티켓이 만들어졌어요: ${author} (<#${channelId}>)!",
	event_ticket_logsChannel_onClose_embed_title: "티켓 로그 - 티켓 닫힘",
	event_ticket_logsChannel_onClose_embed_desc:
		"${author}님이 티켓을 닫았어요 (<#${channelId}>)!",
	event_ticket_logsChannel_onRemoveMember_embed_title:
		"티켓 로그 - 티켓에서 멤버 제거",
	event_ticket_logsChannel_onRemoveMember_embed_desc:
		"${author}님이 ${member}님을 티켓에서 제거했어요 (<#${channelId}>)!",
	event_ticket_logsChannel_onAddMember_embed_title:
		"티켓 로그 - 티켓에 멤버 추가",
	event_ticket_logsChannel_onAddMember_embed_desc:
		"${author}님이 ${member}님을 티켓에 추가했어요 (<#${channelId}>)!",
	event_ticket_logsChannel_onReopen_embed_title: "티켓 로그 - 티켓 다시 열림",
	event_ticket_logsChannel_onReopen_embed_desc:
		"${author}님이 티켓을 다시 열었어요 (<#${channelId}>)!",
	event_ticket_logsChannel_onDelete_embed_title: "티켓 로그 - 티켓 삭제",
	event_ticket_logsChannel_onDelete_embed_desc:
		"${author}님이 티켓을 삭제했어요 (#${channelName})!",
	event_ticket_logsChannel_onLeave_embed_desc:
		"${author}님이 서버를 떠났어요. 해당 티켓(#${channelName})은 닫히고 삭제됐으며, 대화 기록을 첨부했어요.",
	event_ticket_logsChannel_onAddMember2_embed_title:
		"티켓 로그 - 티켓 멤버 추가/제거",
	event_ticket_logsChannel_onAddMember2_embed_desc:
		"${author}\n제거됨: ${removedMembers}.\n추가됨: ${addedMembers}.\n 티켓 (${channel})!",
	event_ticket_already_opened:
		"앗, 이미 열려 있는 티켓이 있어요 (<#${channelId}>)! 새 티켓을 열기 전에 먼저 닫아 주세요.",

	// Giveaway Event
	event_gw_reroll_win_msg: "축하해요 ${winners}! **${prize}**에 당첨됐어요!",
	event_gw_reroll_cannot_win_msg:
		"유효한 참가자가 없어서 당첨자를 정할 수 없었어요!",
	event_gw_finnish_msg: "축하해요 ${winners}! **${prize}**에 당첨됐어요!",
	event_gw_finnish_cannot_msg:
		"유효한 참가자가 없어서 당첨자를 정할 수 없었어요!",
	event_gw_finnish_button_title: "경품 추첨 종료",
	event_gw_entries_button_title: "참가자 목록",
	event_gw_removeentries_msg: "${author}님, 이 경품 추첨에서 나갔어요!",
	event_gw_leave_button_placeholder: "경품 추첨 나가기",
	event_gw_confirm_leave_msg: "${author}님, 정말 이 경품 추첨에서 나갈까요?",
	event_gw_embed_desc:
		"종료: ${end_string} (${end_string2})\n주최: <@${hostedBy}>\n참가자: **${entries}**\n당첨자 수: **${winners_amount}**",
	event_gw_ended_embed_desc:
		"종료됨: ${time1} (${time2})\n주최: <@${hostedBy}>\n참가자 **${entrieCount}**\n당첨자: ${winners}",
	event_gw_entries_words: "참가자",
	event_gw_ended_word:
		"종료됨: ${ended} (${time2})\n주최: <@${hostedBy}>\n참가자 **${entries}**\n당첨자: ${winners}",
	event_gw_break_req:
		"${emoji_No} 이 경품 추첨에 참가하기 위한 조건을 충족하지 않아요.\n유형: `${requirementType}`\n값: `${requirementValue}`",

	// Boost Logs Event
	event_boostlog_add:
		"<@${newMemberUserId}>님이 서버를 **방금 부스트했어요**! (총 부스트 **${boostCount}**회)",
	event_boostlog_sub:
		"<@${newMemberUserId}>님이 서버에서 **방금 부스트를 해제했어요**! (총 부스트 **${boostCount}**회)",

	// Economy Module
	economy_disable_msg:
		"<@${authorId}>님, 이 서버에서 `경제 모듈`은 **사용 안 함** 상태예요. 더 이상 경제 모듈을 사용할 수 없어요!",

	// Permission Event
	event_permission_wrong:
		"${author}님, 이 명령어를 사용할 수 없어요! 다음 권한이 필요해요: ${neededPerm}",

	// TempVoice Module
	// All components, globalVar...

	// GlobalVariable

	temporary_voice_title_embec: "## 임시 음성 채널 변경 사항",
	temporary_voice_unblocked_member: "차단 해제된 멤버",
	temporary_voice_blocked_mmeber: "차단된 멤버",
	temporary_voice_no_one: "없음",
	temporary_voice_new_member: "새 소유자",
	temporary_voice_old_member: "이전 소유자",
	temporary_voice_modal_title: "iHorizon 음성 대시보드",
	temporary_voice_new_userlimit: "새 사용자 수 제한",
	temporary_voice_new_name: "새 이름",
	temporary_voice_new_region: "새 지역",
	temporary_voice_untrusted_member: "신뢰 해제된 멤버",
	temporary_voice_trusted_member: "신뢰하는 멤버",

	// Buttons
	temporary_voice_block_button_menu_placeholder:
		"선택한 사용자는 신뢰가 해제되어 들어올 수 없어요",

	temporary_voice_delete_button_desc_embed:
		"## 채널 삭제\n채널을 삭제했어요!",

	temporary_voice_limit_button_menu_label:
		"채널 사용자 수 제한은 몇 명인가요?",
	temporary_voice_limit_button_not_integer:
		"${emoji_No} | 입력한 값이 숫자가 아니에요",

	temporary_voice_name_button_menu_label: "채널 이름은 무엇인가요?",

	temporary_voice_privacy_menu_placeholder: "공개 범위 옵션 선택",
	temporary_voice_privacy_menu_lock_label: "채널 잠그기",
	temporary_voice_privacy_menu_lock_desc:
		"신뢰하는 사용자만 음성 채널에 들어올 수 있어요",
	temporary_voice_privacy_menu_unlock_label: "채널 잠금 해제",
	temporary_voice_privacy_menu_unlock_desc:
		"누구나 음성 채널에 들어올 수 있어요",
	temporary_voice_privacy_menu_invisible_label: "숨기기",
	temporary_voice_privacy_menu_invisible_desc:
		"신뢰하는 사용자만 음성 채널을 볼 수 있어요",
	temporary_voice_privacy_menu_visible_label: "표시",
	temporary_voice_privacy_menu_visible_desc:
		"누구나 음성 채널을 볼 수 있어요",
	temporary_voice_privacy_menu_closechat_label: "채팅 닫기",
	temporary_voice_privacy_menu_closechat_desc:
		"신뢰하는 사용자만 채팅에 글을 쓸 수 있어요",
	temporary_voice_privacy_menu_openchat_label: "채팅 열기",
	temporary_voice_privacy_menu_openchat_desc:
		"누구나 채팅에 글을 쓸 수 있어요",

	temporary_voice_region_menu_placeholder: "지역 선택",

	temporary_voice_transfer_menu_placeholder: "음성 채널을 넘겨줄 사용자 선택",

	temporary_voice_transfer_trust_placeholder:
		"선택한 사용자는 신뢰받아 들어올 수 있어요",

	temporary_voice_transfer_unblocked_placeholder:
		"선택한 사용자는 차단이 해제되어 들어올 수 있어요",

	temporary_voice_transfer_untrust_placeholder:
		"선택한 사용자는 신뢰가 해제되어 들어올 수 없어요",

	temporary_voice_channel_name: "{nickname}의 채널",

	tempvoice_v2_embed_title: "## ${emoji_VC_Name} ${channelName}",
	tempvoice_v2_embed_desc:
		"${owner}님, 임시 음성 채널에 오신 걸 환영해요!\n아래 버튼으로 채널을 관리하세요.",
	tempvoice_v2_hint: "-# 채널 소유자만 이 메뉴를 사용할 수 있어요.",
	tempvoice_v2_select_placeholder: "음성 채널 관리...",

	tempvoice_cfg_panel_title: "임시 음성 채널 설정",
	tempvoice_cfg_panel_desc:
		"아래에서 임시 음성 채널 모듈을 설정하세요. 모든 변경 사항은 바로 적용되며, 생성된 음성 채널마다 전용 제어판이 생겨요.",
	tempvoice_cfg_hub: "입장 시 생성 채널",
	tempvoice_cfg_category: "채널 생성 위치",
	tempvoice_cfg_name: "채널 이름",
	tempvoice_cfg_position: "카테고리 내 위치",
	tempvoice_cfg_position_top: "맨 위",
	tempvoice_cfg_position_bottom: "맨 아래",
	tempvoice_cfg_staff: "스태프 역할 (권한 무시)",
	tempvoice_cfg_select_placeholder: "추가 설정...",
	tempvoice_cfg_opt_name: "채널 이름 변경",
	tempvoice_cfg_opt_position_top: "위치 설정: 맨 위",
	tempvoice_cfg_opt_position_bottom: "위치 설정: 맨 아래",
	tempvoice_cfg_done: "완료",
	tempvoice_cfg_remove_hub: "입장 시 생성 채널 제거",
	tempvoice_cfg_saved: "임시 음성 채널 설정을 저장했어요!",
	tempvoice_cfg_expired:
		"설정 패널이 만료됐어요. /tempvoice를 다시 실행해 주세요.",
	tempvoice_cfg_modal_title: "채널 이름 설정",
	tempvoice_cfg_modal_label: "이름 | 변수: {Username}",
	// Protection Module
	// Event message

	protection_avoid_channel_delete:
		"**보호 모드 켜짐**\n<@${channelGuildOwnerId}>님, <@${executorId}>님이 채널을 삭제하려고 해서 채널을 다시 만들었어요!",
	protection_blockbot_embed_title: "⚠️ ${memberGuildName}에 위험 감지 ⚠️",
	protection_blockbot_embed_desc:
		"# 봇 추가 경고\n누군가 Discord 봇을 추가하려고 했어요.",
	var_target_bot: "대상 봇",
	var_not_detected: "감지되지 않음",

	// AntiSpam Module
	// Event message

	// Base warning message
	antispam_base_warn_message:
		"${mentionedMembers}님, 경고예요. 스팸을 보내고 있어서 처벌받을 수 있어요.",

	// Additional warning messages based on punishment type
	antispam_more_ban_msg: "계속하면 서버에서 차단돼요.",
	antispam_more_mute_msg: "계속하면 타임아웃돼요.",
	antispam_more_kick_msg: "계속하면 서버에서 추방돼요.",

	// Embed Logs of AntiSpam
	antispam_log_embed_title: "[스팸 방지] 새 ${actionType}",
	antispam_log_embed_desc: "${bot}이(가) ${user}님을 **${actionType}**했어요",

	// Hybrid Commands
	// Event Message

	hybridcommands_global_prefix_mention: "`@Ping-Me`",
	hybridcommands_global_prefix_cleaned_mention: "@Ping-Me ",
	hybridcommands_args_error_embed_desc:
		'```ts\n명령어 이름: ${currentCommandName}\n```\n```cs\n${botPrefix}${fullNameCommand} ${argsString}\n${errorPosition}\n"${wrongArgumentName}" 인수를 처리하는 중 오류가 발생했어요.\n```',
	hybridcommands_embed_help_title: "${commandName} 도움말",
	hybridcommands_embed_help_fields_value:
		"**별칭:** ${aliases}\n**사용법:** ${use}",
	hybridcommands_embed_footer_text:
		"[...] 안의 옵션은 필수이고, <...> 안의 옵션은 선택이에요.\n자세한 정보는 ${botPrefix}help [command] 명령어를 사용하세요.",

	ping_bot_show_info_msg:
		"안녕하세요 ${messageAuthor}님, 저는 `슬래시 명령어`(${emoji_Slash_Bot_Badge})를 100% 지원하고, 접두사 명령어로도 85% 이상 사용할 수 있어요. **이 서버**에서 제 접두사는 `${prefix}`예요!\n",
	ping_bot_show_info_msg_about_change_prefix:
		"\n-# ${emoji_VC_OpenChat} 접두사가 마음에 안 드시나요? **`/guildconfig bot prefix`**로 바꿀 수 있어요!",

	// Notifier Module
	notifier_on_new_media_default_message:
		"@everyone **[{artistAuthor}](<{artistLink}>)**님이 새 영상을 올렸어요 [여기를 클릭]({mediaURL})",
	notifier_on_new_media_default_button_label: "보러 가기!",
	notifier_generateAuthorsEmbed_embed_desc:
		"모든 스트리머/유튜버 목록이에요:\n",
	notifier_generateAuthorsEmbed_embed_title: "서버의 모든 스트리머/유튜버",
	notifier_generateConfigurationEmbed_embed_title: "알림 모듈 설정",
	notifier_generateConfigurationEmbed_embed_fields_1_name: "알림 채널",
	notifier_generateConfigurationEmbed_embed_fields_2_name: "알림 메시지",

	// ButtonReaction
	buttonreaction_role_doesnt_exit:
		"데이터베이스에 있는 역할이 더 이상 서버에 존재하지 않아요!",
	buttonreaction_role_too_high:
		"역할이 너무 높아서 지급하거나 제거할 수 없어요. 제 권한을 변경해 주세요!",
	buttonreaction_role_add: "이제 ${role} 역할을 갖게 됐어요 :tada:",
	buttonreaction_role_remove: "더 이상 ${role} 역할을 갖고 있지 않아요 ✅",
	rolepanel_setup_embed_title: "역할 패널 설정",
	rolepanel_setup_embed_desc:
		"${member}님에게 추가하거나 제거할 역할을 선택하세요. ${member}님이 이미 선택한 역할을 갖고 있다면 제거돼요. 허용되지 않은 역할은 무시돼요.",
	rolepanel_setup_embed_roles_field: "허용된 역할",
	rolepanel_setup_embed_refused_field: "거부된 역할",
	rolepanel_setup_select_placeholder: "제공할 역할 선택",
	rolepanel_setup_apply_button: "패널 만들기",
	rolepanel_setup_no_roles: "유효한 역할이 선택되지 않았어요.",
	rolepanel_setup_saved: "역할 패널을 보냈어요.",
	rolepanel_panel_embed_title: "역할 패널",
	rolepanel_panel_embed_desc: "프로필에 추가하거나 제거할 역할을 선택하세요.",
	rolepanel_panel_select_placeholder: "역할 선택",
	rolepanel_role_managed_or_everyone: "시스템 역할 또는 @everyone",
	rolepanel_role_too_high_bot: "봇보다 높은 역할",
	rolepanel_role_too_high_user: "내 역할보다 높은 역할",
	rolepanel_role_missing_permissions: "권한 부족: ${permissions}",
	rolepanel_logs_embed_title_create: "역할 패널 로그",
	rolepanel_logs_embed_desc_create:
		"<@${authorId}>님이 역할 패널(${messageId})을 만들었어요: ${roles}",
	rolepanel_logs_embed_title_apply: "역할 패널 사용 로그",
	rolepanel_logs_embed_desc_apply:
		"<@${authorId}>님이 패널로 <@${memberId}>님의 역할을 변경했어요. 추가됨: ${addedRoles} | 제거됨: ${removedRoles}",

	// AuthRestore HTML
	rc_created_by: "만든 사람:",
	rc_created_on: "생성일:",
	rc_total_membres: "총 멤버 수",
	rc_total_verification: "총 인증 수",
	rc_total_key_used_count: "키 사용 횟수",
	rc_recent_locales_distribution: "멤버 언어 분포",
	rc_recent_verifications: "최근 인증",
	rc_registration_over_time: "기간별 등록 수",

	// PicOnly Module
	piconly_module_punish_msg:
		"${messageAuthor}님, 사진 전용 채널에 사진 없는 메시지를 너무 많이 보내서 10분 동안 타임아웃됐어요.",
	piconly_module_warn_msg:
		"${messageAuthor}님, 이 채널에는 사진이 포함된 메시지만 보낼 수 있어요 (허용 형식: JPG, PNG, GIF, WEBP, BMP, TIFF). 경고 ${userWarningCount}/${threshold}",
	piconly_module_timeout_reason: "사진 전용 채널에 사진 없는 메시지 도배",

	// Nick Kicker Event
	event_nick_kicker_kick_reason:
		"사용자명에 블랙리스트 단어 포함 - Nick Kicker",
	event_nick_kicker_kick_msg:
		"`${memberGuildName}` 서버에서 사용자명에 블랙리스트 단어가 포함되어 있어서 서버에서 추방됐어요.",

	// Pfps Module
	pfps_embed_user_title: "${username}님의 **사용자** 아바타",
	pfps_embed_guild_title: "${username}님의 **서버** 아바타",
	pfps_download_user_button: "사용자 아바타 다운로드",
	pfps_download_guild_button: "서버 아바타 다운로드",
	// -----------------------------\ /-----------------------------

	// AddRoleReact Command
	addrolereact_role_not_found: "역할을 찾을 수 없어요.",
	addrolereact_cannot_check_permissions: "권한을 확인할 수 없어요.",
	addrolereact_role_too_high:
		"내 가장 높은 역할보다 높거나 같은 역할은 추가할 수 없어요.",
	addrolereact_must_be_text_channel:
		"이 명령어는 텍스트 채널에서 실행해야 해요.",
	addrolereact_message_not_found: "메시지를 찾을 수 없어요.",
	addrolereact_no_reactions: "이 메시지에는 반응이 없어요.",
	addrolereact_adding_role: "{role} 역할을 추가하는 중...",
	addrolereact_adding_role_progress:
		"사용자 {count}명에게 {role} 역할을 추가하는 중...",
	addrolereact_role_added:
		"{role} 역할을 추가했어요. 사용자 {count}명이 역할을 받았어요.",
	addrolereact_error: "명령어를 실행하는 중 오류가 발생했어요.",

	// Channel hide/unhide commands
	channel_hide_in_progress: "현재 채널을 숨기는 중...",
	channel_hide_success: "@everyone에게서 채널을 숨겼어요",
	channel_hide_already_hidden: "이 채널은 이미 @everyone에게서 숨겨져 있어요",
	channel_unhide_in_progress: "현재 채널 숨김을 해제하는 중...",
	channel_unhide_success: "이제 @everyone이 채널을 볼 수 있어요",
	channel_unhide_already_visible: "이 채널은 이미 @everyone에게 보여요",
	channel_hideall_in_progress: "모든 채널을 숨기는 중...",
	channel_hideall_success:
		"**숨기기 완료!**\n**통계:**\n• 숨긴 채널 **{hiddenCount}**개\n• 발생한 오류 **{errorCount}**개",
	channel_hideall_error: "채널을 숨기는 중 오류가 발생했어요.",
	channel_unhideall_in_progress: "모든 채널 숨김을 해제하는 중...",
	channel_unhideall_success:
		"**숨김 해제 완료!**\n**통계:**\n• 숨김 해제한 채널 **{unhiddenCount}**개\n• 발생한 오류 **{errorCount}**개",
	channel_unhideall_error: "채널 숨김을 해제하는 중 오류가 발생했어요.",

	// New guild event
	new_guild_embed_title: [
		"서버에 오신 걸 환영해요! 🎉",
		"Discord 친구 여러분, 안녕하세요! 👋",
		"iHorizon이 채팅에 참여했어요! 💬",
		"새다! 비행기다! 아니, iHorizon이다! 🦸‍♂",
		"iHorizon을 뜨겁게 환영해 주세요! 🔥"
	],
	new_guild_embed_desc:
		"## ${randomMessage}\n안녕하세요! 이 서버에 들어와 커뮤니티의 일원이 되어 정말 기뻐요.\n제 이름은 iHorizon이고, 여러분에게 필요한 모든 걸 도와드리러 왔어요. 제 명령어를 자유롭게 사용하고 제가 제공하는 모든 기능을 둘러보세요.\n궁금한 점이 있거나 문제가 생기면 언제든 편하게 연락 주세요.\n이 서버에서 최고의 경험을 하실 수 있도록 도와드릴게요.\n저를 선택해 주셔서 고마워요. 함께 즐거운 시간 보내요!\n",
	new_guild_owner_dm_title: "iHorizon 가족이 되신 걸 환영해요!",
	new_guild_owner_dm_description:
		"# 서버에 iHorizon을 추가해 주셔서 고마워요!\n\n> *잠깐... 이게 끝이냐고요? 아뇨, 절대 아니에요.*\n\niHorizon은 Discord 봇이에요, 그렇죠? 하지만 그게 전부가 아니에요. 커뮤니티이자 세계관이고, 6년 넘게(2020년부터) 쌓아 온 프로젝트예요.\niHorizon을 쓴다는 건 영원히 **무료**이고 **오픈 소스**인 완전한 Discord 봇을 갖는 것만이 아니에요. 하나의 **철학**을 받아들이는 거예요.\n\n> **무료 Discord 봇도 유료 봇보다 더 잘할 수 있어요.**\n*네, 그게 바로 iHorizon이에요. 열정적인 사람들이 6년 동안 관리해 온 완전한 봇이죠.*\n\n그러니까... 이 메시지를 끝까지 읽어 주셔서 고마워요.\nWe are legion. #ihorizon",
	guild_create_btn_invite: "iHorizon 초대하기",
	guild_create_btn_website: "iHorizon 웹사이트",
	guild_create_btn_search: "iHorizon 검색",
	guild_create_btn_repos: "iHorizon 저장소",
	guild_create_btn_support: "지원 서버",
	guild_create_btn_docs: "iHorizon 문서",
	bot_server_bio:
		"{wink_emoji} **iHorizon Discord 봇** **`명령어 +{count}개`**\n> *« 2022년부터 사람들이 만들어 온, 여러분의 커뮤니티를 위한 봇. »*\n**https://www.ihorizon.org**",
	guild_leave_data_clear_notice_title: "iHorizon이 ${guildName}에서 나갔어요",
	guild_leave_data_clear_notice_description:
		"으앙, 슬퍼요. `${guildName}`에서 봇을 추방하셨네요. 그 전에 iHorizon이 돌아오지 않으면 서버 데이터는 ${deleteAt} 삭제돼요.",
	guild_leave_data_clear_notice_message:
		"으앙, 슬퍼요. `${guildName}`에서 iHorizon을 추방하셨네요. 데이터는 ${deleteAt} 삭제돼요.",
	guild_leave_data_clear_cancelled_title:
		"iHorizon이 ${guildName}에 돌아왔어요",
	guild_leave_data_clear_cancelled_description:
		"야호, `${guildName}`에 iHorizon을 다시 추가해 주셔서 고마워요. 예정된 데이터 삭제를 취소했어요.",
	guild_leave_data_clear_cancelled_message:
		"야호, `${guildName}`에 iHorizon을 다시 추가해 주셔서 고마워요. 서버 데이터는 안전해요.",

	// Confession Event
	confession_embed_logs_title: "새 고백",
	confession_channel_button_name: "익명으로 답장",
	confession_1_embed_log_title: "새 고백 답장",

	// Context Menu Interaction
	global_unknown_message: "메시지를 찾을 수 없어요.",
	global_error: "❌ 오류",
	global_not_atc: "선택한 메시지에 첨부 파일이 없어요.",
	global_not_valid_atc: "선택한 첨부 파일은 올바른 오디오 파일이 아니에요.",
	global_too_heavy_file:
		"생성된 MP4 파일이 너무 커요 (${fileSize} MB). Discord 제한은 25 MB예요.",
	global_convert_ok: "✅ 변환 성공",
	global_convert_ok_desc: "오디오 파일을 MP4로 변환했어요 (${fileSize} MB).",

	// Economy logs titles
	economy_logs_add_money_title: "경제 로그 - 돈 추가",
	economy_logs_remove_money_title: "경제 로그 - 돈 제거",
	economy_logs_boost_role_title: "경제 로그 - 역할 부스트",
	economy_logs_config_title: "경제 로그 - 모듈 설정",
	economy_logs_role_add_title: "경제 로그 - 상점에 새 역할 추가",
	economy_logs_role_remove_title: "경제 로그 - 상점에서 역할 제거",
	economy_logs_pay_title: "경제 로그 - 송금",
	economy_logs_rob_title: "경제 로그 - 강탈",
	economy_logs_set_cooldown_title: "경제 로그 - 쿨다운 설정",
	economy_logs_set_money_title: "경제 로그 - 돈 설정",
	economy_logs_withdraw_title: "경제 로그 - 출금",
	economy_logs_deposit_title: "경제 로그 - 입금",

	// Economy logs descriptions
	economy_logs_add_money_desc:
		"{author}님이 {target}님에게 `{amount}$` {coin}을(를) 추가했어요",
	economy_logs_remove_money_desc:
		"{author}님이 {target}님에게서 `{amount}$` {coin}을(를) 제거했어요",
	economy_logs_boost_role_desc:
		"{author}님이 {role} 역할의 부스트를 설정했어요. 현재 부스트: `x{amount}`",
	economy_logs_config_desc:
		"{author}님이 경제 모듈을 {state}(으)로 설정했어요",
	economy_logs_role_add_desc:
		"{author}님이 상점에 {role} 역할을 추가했어요. 가격: `{amount}$`",
	economy_logs_role_remove_desc:
		"{author}님이 상점에서 {role} 역할을 제거했어요.",
	economy_logs_pay_desc: "{author}님이 {target}님에게 `{amount}$`를 보냈어요",
	economy_logs_rob_desc:
		"{author}님이 {target}님에게서 `{amount}$`를 강탈했어요",
	economy_logs_set_cooldown_desc:
		"{author}님이 `{type}`의 쿨다운을 **{time}**(으)로 설정했어요",
	economy_logs_set_money_desc:
		"{author}님이 `{type}`의 돈을 **{money}**(으)로 설정했어요",
	economy_logs_withdraw_desc:
		"{author}님이 은행에서 **${money}**를 출금했어요",
	economy_logs_deposit_desc: "{author}님이 은행에 **${money}**를 입금했어요",

	// Generic vars
	var_on: "사용",
	var_off: "사용 안 함",
	global_command_cooldown_msg:
		"${emoji} **`${ctxCommandPath}`** 사이에 **${time}** 기다려야 해요",

	global_warn_embed_title: "경고를 받았어요 - 케이스 **`${id}`**",
	global_warn_embed_desc:
		"> **사유:** ${reason}\n> **담당자:** @${authorUsername} (*${authorRolesHighestName}*)\n경고 발행 ${time}",
	global_warn_component_button_label: "${authorGuildName}에서 보냄",

	counter_error_too_much_u:
		"<@${messageAuthorId}>님이 **${number}**에서 망쳤어요!! 다음 숫자는 **1**이에요. **연속으로 두 번 셀 수 없어요.**",
	counter_error_syntaxic:
		"<@${messageAuthorId}>님이 실수했어요!! 다음 숫자는 **1**이에요.",

	global_blacklist_msg_to_send:
		"계정이 iHorizon 전역 블랙리스트에 등록되어 있어서 이 서버에서 자동으로 차단됐어요.\n\n사유: `${reason}`\n\n이용약관 제3조에 따라, iHorizon을 사용하는 서버는 봇이 이 전역 블랙리스트와 관련된 제재를 자동으로 적용하는 데 동의해요.\n\n잘못된 조치라고 생각하거나 이의를 제기하고 싶다면 여기에서 할 수 있어요:\n이의 제기: <https://www.ihorizon.org/appeal>\n\n이용약관: <https://www.ihorizon.org/tos>",
	global_blacklist_reason:
		"iHorizon 프로젝트 제재 - 블랙리스트 | 사유: ${reason}",
	server_blacklist_msg_to_send:
		"이 서버의 블랙리스트에 등록되어 있어서 차단됐어요.\n사유: `${data2Reason}`",
	server_blacklist_reason: "블랙리스트 | 사유: ${data2Reason}",
	help_sticky_fields: "고정 메시지",
	help_sticky_dsc:
		"> *중요한 메시지를 자동으로 다시 올려 채널에서 항상 보이게 해요.*",
	sticky_channel_command_error:
		"${emoji_No} | ${author}님, 올바른 텍스트 채널을 찾을 수 없어요.",
	sticky_text_command_missing_message:
		"${emoji_No} | ${author}님, 고정 메시지를 입력해야 해요.",
	sticky_text_command_work:
		"${emoji_Yes} | ${author}님, 이제 ${channel}에서 고정 텍스트 메시지가 활성화됐어요.",
	sticky_embed_command_embed_not_found:
		"${emoji_No} | ${author}님, `${embed_id}` 임베드를 찾을 수 없어요.",
	sticky_embed_command_work:
		"${emoji_Yes} | ${author}님, 이제 ${channel}에서 고정 임베드 `${embed_id}`가 활성화됐어요.",
	sticky_disable_command_not_found:
		"${emoji_No} | ${author}님, ${channel}에 설정된 고정 메시지가 없어요.",
	sticky_disable_command_work:
		"${emoji_Yes} | ${author}님, ${channel}의 고정 메시지를 비활성화했어요.",
	sticky_refresh_command_not_found:
		"${emoji_No} | ${author}님, ${channel}에 설정된 고정 메시지가 없어요.",
	sticky_refresh_command_missing_embed:
		"${emoji_No} | ${author}님, ${channel}의 고정 메시지가 더 이상 존재하지 않는 임베드를 참조하고 있어요.",
	sticky_refresh_command_missing_permissions:
		"${emoji_No} | ${author}님, ${channel}에 고정 메시지를 다시 올릴 수 없어요. 제 권한을 확인해 주세요.",
	sticky_refresh_command_work:
		"${emoji_Yes} | ${author}님, ${channel}에 고정 메시지를 다시 올렸어요.",
	sticky_show_command_not_found:
		"${emoji_No} | ${author}님, ${channel}에 설정된 고정 메시지가 없어요.",
	sticky_show_embed_title: "고정 메시지 설정",
	sticky_show_embed_fields_channel: "채널",
	sticky_show_embed_fields_type: "유형",
	sticky_show_embed_fields_status: "상태",
	sticky_show_embed_fields_message: "메시지",
	sticky_show_embed_fields_embed: "임베드 ID",
	sticky_show_embed_fields_last_message: "마지막 고정 메시지 ID",
	sticky_list_embed_title: "고정 메시지 채널",
	sticky_list_embed_desc_empty: "이 서버에 설정된 고정 메시지 채널이 없어요.",
	sticky_list_embed_desc_line_text: "${channel} - 텍스트 고정 메시지",
	sticky_list_embed_desc_line_embed:
		"${channel} - 임베드 고정 메시지 (`${embed_id}`)",
	sticky_list_embed_desc_line_text_embed:
		"${channel} - 텍스트 + 임베드 고정 메시지 (`${embed_id}`)",
	sticky_var_text: "텍스트",
	sticky_var_embed: "임베드",
	sticky_var_text_embed: "텍스트 + 임베드",
	sticky_var_enabled: "사용",
	sticky_var_disabled: "사용 안 함",
	sticky_var_none: "없음",

	// /honeypot config
	honeypot_config_not_allowed:
		"허니팟을 설정하려면 관리자이거나 허용 목록에 있어야 해요.",
	honeypot_config_embed_title: "허니팟 설정",
	honeypot_config_embed_desc:
		"함정 채널, 로그 채널, 그리고 누군가 *허니팟* 채널에 메시지를 보내기 시작할 때 적용할 자동 조치를 설정해요.",
	honeypot_config_embed_field_status: "상태",
	honeypot_config_embed_field_trap_channel: "함정 채널",
	honeypot_config_embed_field_logs_channel: "로그 채널",
	honeypot_config_embed_field_action: "조치",
	honeypot_config_embed_field_message: "보낸 메시지",
	honeypot_config_embed_field_notes: "참고",
	honeypot_config_embed_field_credit: "크레딧",
	honeypot_config_notes_value:
		"- **효과를 극대화하려면 iHorizon 역할을 모든 멤버 역할보다 위에 두세요.**\n- **효과를 극대화하기 위해 자동 생성된 허니팟 채널은 서버 맨 위로 이동돼요.**\n- **허니팟 채널 이름은 바꿔도 아무 문제 없어요.**",
	honeypot_config_credit_value:
		"*RiskyMH의 Honeypot 봇에서 영감을 받았어요. 한번 확인해 보세요!*\n${url}",
	honeypot_config_select_trap_placeholder: "함정 채널 선택",
	honeypot_config_select_logs_placeholder: "로그 채널 선택",
	honeypot_config_select_action_placeholder: "적용할 조치 선택",
	honeypot_config_button_send: "임베드 보내기",
	honeypot_config_button_preview: "미리 보기",
	honeypot_config_button_enable: "허니팟 사용",
	honeypot_config_button_disable: "허니팟 사용 안 함",
	honeypot_config_send_success: "허니팟 임베드를 ${channel}에 보냈어요.",
	honeypot_config_enable_success:
		"이제 ${channel}에서 허니팟이 사용 중이에요.",
	honeypot_config_disable_success: "허니팟을 사용 안 함으로 설정했어요.",
	honeypot_config_missing_logs_channel:
		"허니팟을 사용하려면 먼저 로그 채널을 설정해야 해요.",
	honeypot_config_generic_error:
		"허니팟을 업데이트하는 중 오류가 발생했어요.",
	honeypot_config_select_action_kick: "사용자 추방",
	honeypot_config_select_action_ban: "사용자 차단",
	honeypot_config_select_action_none: "메시지만 삭제",
	honeypot_config_select_action_del_messages: "메시지 삭제",
	honeypot_default_channel_name: "🍯・일반-채팅",
	honeypot_action_none: "메시지만 삭제",
	honeypot_action_failed: "조치 실패",
	honeypot_dm_action_kicked: "추방되었어요!",
	honeypot_dm_action_banned: "차단되었어요!",
	honeypot_dm_action_none: "메시지가 삭제되었어요",
	honeypot_trap_embed_title: "이 채널에 메시지를 보내지 마세요",
	honeypot_trap_embed_desc:
		"*이 채널은 스팸 봇을 잡기 위한 채널이에요.*\n*여기에 보낸 메시지는 **반드시** 서버의 자동 보호 기능을 작동시켜요.*",
	honeypot_trap_embed_footer:
		"RiskyMH의 Honeypot 봇에서 영감을 받았어요. 한번 확인해 보세요!\n${url}",
	honeypot_dm_title: "허니팟 작동!",
	honeypot_dm_desc:
		"다음 서버의 *허니팟* 채널에 보낸 메시지가 설정된 보호 기능을 **작동시켰어요**: **`${guild}`**\n\n__적용된 조치:__ **`${action}`**\n\n*최근 2시간 동안 보낸 메시지가 서버에서 삭제되고 있어요. 계정이 해킹된 것 같다면 비밀번호를 변경하고 Discord 계정에서 2단계 인증을 켜 주세요. 단순한 실수였다면 서버 스태프에게 연락해 문제를 해결해 주세요.*",
	honeypot_log_title: "허니팟 작동 - ${action}",
	honeypot_log_field_author: "작성자",
	honeypot_log_field_channel: "채널",
	honeypot_log_field_message: "삭제된 메시지",
	honeypot_log_field_attachments: "첨부 파일",
	honeypot_log_field_stickers: "스티커",
	honeypot_log_field_embeds: "임베드",
	honeypot_log_field_deleted_messages: "삭제된 메시지",
	honeypot_log_field_triggered_messages: "작동시킨 메시지",
	honeypot_log_field_dm_status: "DM 상태",
	honeypot_log_field_result: "결과",
	honeypot_log_dm_open: "전달됨",
	honeypot_log_dm_closed: "닫혀 있거나 전달 불가",
	honeypot_log_no_content: "텍스트 내용 없음",
	honeypot_log_action_ban: "사용자 차단됨",
	honeypot_log_action_kick: "사용자 추방됨",
	honeypot_log_action_none: "조치 없음",

	// TTS module
	// /tts join, /tts leave, /tts info, /tts lang

	help_tts_fields: "TTS",
	help_tts_dsc:
		"> *iHorizon으로 음성 채널에서 텍스트를 음성으로 바꿔 보세요!*",

	// /tts join
	tts_join_not_in_voice:
		"${emoji_No} 이 명령어를 사용하려면 음성 채널에 접속해 있어야 해요!",
	tts_join_already_enabled:
		"${emoji_No} 이 서버에서는 이미 TTS 모듈을 사용 중이에요!",
	tts_join_music_playing:
		"${emoji_No} 이 서버에서 음악이 재생 중이에요. TTS를 켜기 전에 음악을 멈춰 주세요.",
	tts_join_enabled: "${emoji_Yes} ${voiceChannel}에서 TTS 모드를 켰어요!",
	tts_join_error: "${emoji_No} TTS 모드를 켜는 중 오류가 발생했어요.",
	tts_join_lang_fallback: "ko-KR",

	// /tts leave
	tts_leave_not_active:
		"${emoji_No} 현재 이 서버에서 TTS 모듈이 작동 중이 아니에요!",
	tts_leave_not_in_voice:
		"${emoji_No} TTS를 끄려면 TTS 음성 채널에 있어야 해요!",
	tts_leave_disabled: "${emoji_Yes} 이 서버에서 TTS 모드를 껐어요!",

	// /tts info
	tts_info_embed_title: "TTS 모듈 정보",
	tts_info_embed_description:
		"TTS(텍스트 음성 변환) 모듈은 iHorizon이 음성 채널에서 메시지를 소리 내어 읽어 주는 기능이에요. 켜져 있으면 음성 채널에 있는 멤버가 설정된 텍스트 채널에 보낸 모든 메시지를 iHorizon이 읽어 줘요.",
	tts_info_field_status: "상태",
	tts_info_field_lang: "TTS 언어",
	tts_info_field_howto: "사용 방법",
	tts_info_howto_value:
		"`/tts join`으로 음성 채널에서 TTS를 시작하세요.\n`/tts leave`로 TTS를 멈추세요.\n`/tts lang`으로 음성 언어를 바꾸세요.",

	// /tts lang
	tts_lang_not_active:
		"${emoji_No} 현재 이 서버에서 TTS 모듈이 작동 중이 아니에요!",
	tts_lang_set: "${emoji_Yes} TTS 언어를 `${language}`(으)로 설정했어요.",

	// TTS Embed
	tts_embed_title: "TTS 모드 켜짐",
	tts_embed_description:
		"이제 ${voiceChannel}에서 TTS 모듈이 작동 중이에요.\n음성 채널에 있는 멤버가 여기에 보낸 모든 메시지를 소리 내어 읽어 줄게요.\n\n**음성 채널의 멤버:** ${members}",
	tts_embed_footer: "/tts leave로 TTS를 멈출 수 있어요",
	tts_join_not_text_based:
		"${emoji_No} 이 음성 채널은 텍스트 메시지를 지원하지 않아요. 음성 채널 텍스트 채팅을 켜거나 다른 음성 채널을 사용해 주세요.",
	tts_music_blocked:
		"${emoji_No} 현재 TTS 모듈이 작동 중이에요. 음악을 재생하기 전에 TTS를 꺼 주세요.",
	tts_voice_status: "TTS 모드 - 텍스트 음성 변환",

	// H24/7 module
	// /h247 join, /h247 leave

	help_h247_fields: "H24/7",
	help_h247_dsc: "> *iHorizon을 음성 채널에 24시간 연결해 두세요!*",

	// /h247 join
	h247_join_invalid_channel: "${emoji_No} 올바른 음성 채널을 지정해 주세요!",
	h247_join_already_active:
		"${emoji_No} H24/7 모듈이 이미 ${voiceChannel}에서 작동 중이에요!",
	h247_join_music_playing:
		"${emoji_No} 이 서버에서 음악이 재생 중이에요. H24/7 모듈을 켜기 전에 음악을 멈춰 주세요.",
	h247_join_tts_active:
		"${emoji_No} 다른 음성 채널에서 TTS 모듈이 작동 중이에요. H24/7 모듈을 켜기 전에 TTS를 꺼 주세요.",
	h247_joined:
		"${emoji_Yes} iHorizon이 ${voiceChannel}에 24시간 연결되어 있을게요!",
	h247_join_error: "${emoji_No} H24/7 모듈을 켜는 중 오류가 발생했어요.",

	// /h247 leave
	h247_leave_not_active:
		"${emoji_No} 현재 이 서버에서 H24/7 모듈이 작동 중이 아니에요!",
	h247_left: "${emoji_Yes} 이 서버에서 H24/7 모듈을 껐어요!",
	h247_leave_error: "${emoji_No} H24/7 모듈을 끄는 중 오류가 발생했어요.",

	// /h247 info
	h247_info_embed_title: "H24/7 모듈 정보",
	h247_info_embed_description:
		"H24/7 모듈은 아무것도 재생하지 않을 때도 iHorizon을 음성 채널에 하루 종일 연결해 둬요. 서버의 음성 연속 기록을 유지할 때 유용해요.\n이 모듈이 켜져 있는 동안 음악과 TTS는 H24/7 음성 채널 안에서만 실행할 수 있어요.\n재시작이나 플레이어 종료 후에도 연결이 자동으로 복구돼요.",
	h247_info_field_status: "상태",
	h247_info_field_howto: "사용 방법",
	h247_info_howto_value:
		"`/h247 join`으로 iHorizon을 음성 채널에 머물게 하세요.\n`/h247 leave`로 모듈을 끄세요.\n`/h247 info`로 이 패널을 표시하세요.",

	// /music play
	h247_play_refused:
		"${emoji_No} 이 서버에서 H24/7 모듈이 작동 중이에요. 음악을 재생하려면 H24/7 음성 채널에 들어가 주세요!",

	// /tts join
	h247_tts_refused:
		"${emoji_No} 이 서버에서 H24/7 모듈이 작동 중이에요. TTS를 켜려면 H24/7 음성 채널에 들어가 주세요!",
	gw_go_duration_too_low: "${emoji_No} | 최소 기간은 3분이에요!",

	// Components V2 cards: /avatar, /serverinfo, /allbots
	avatar_card_title: "${user}님의 아바타",
	card_download: "다운로드",
	serverinfo_label_owner: "서버 소유자",
	serverinfo_label_members: "멤버",
	serverinfo_label_created: "생성일",
	serverinfo_label_joined: "내 참가일",
	serverinfo_label_roles: "역할",
	serverinfo_label_channels: "채널",
	serverinfo_label_boosts: "부스트",
	serverinfo_boost_value: "${count} (레벨 ${tier})",
	serverinfo_label_verification: "인증",
	serverinfo_label_language: "언어",
	serverinfo_label_id: "ID",
	serverinfo_verif_none: "없음",
	serverinfo_verif_low: "낮음",
	serverinfo_verif_medium: "보통",
	serverinfo_verif_high: "높음",
	serverinfo_verif_highest: "매우 높음",
	all_bots_card_title: "${guild}의 봇",
	all_bots_card_count: "봇 ${count}개",
	all_bots_none: "이 서버에는 봇이 없어요.",

	// Components V2 cards: /unbanall, /media-only, /nick-kicker, /sync, /wlroles
	unbanall_card_progress: "멤버 `${count}`명을 차단 해제하는 중…",
	unbanall_card_undo_progress: "멤버 `${count}`명을 다시 차단하는 중…",
	unbanall_card_title: "전체 차단 해제",
	unbanall_card_undo_title: "전체 차단 해제 취소됨",
	unbanall_label_unbanned: "차단 해제됨",
	unbanall_label_banned: "다시 차단됨",
	unbanall_label_failed: "실패",
	sync_card_title: "권한 동기화 완료",
	sync_card_desc: "이제 이 채널들은 ${category}의 권한을 따라요:",
	media_only_card_title: "미디어 전용 채널",
	utils_label_save: "저장",
	nick_kicker_card_title: "별명 추방기",
	nick_kicker_label_status: "상태",
	nick_kicker_label_words: "단어",
	wlroles_card_title: "허용 목록 역할",
	wlroles_card_warn_title: "위험한 권한",
	wlroles_card_high_title: "내 역할보다 높은 역할",

	// Components V2 cards: /userinfo, /banner, /inviteinfo, /serverpic, /where, /vc, /snipe
	userinfo_label_badges: "배지",
	userinfo_label_username: "사용자명",
	userinfo_label_created: "계정 생성일",
	userinfo_label_joined: "서버 참가일",
	userinfo_label_nitro: "Nitro",
	userinfo_label_roles: "역할",
	userinfo_label_id: "ID",
	userinfo_card_loading: "프로필 불러오는 중…",
	banner_card_guild_title: "${guild}의 배너",
	banner_card_user_title: "${user}님의 배너",
	inviteinfo_label_channel: "채널",
	inviteinfo_label_inviter: "초대한 사람",
	inviteinfo_label_created: "서버 생성일",
	inviteinfo_label_expires: "만료",
	inviteinfo_label_members: "멤버",
	inviteinfo_label_online: "온라인",
	inviteinfo_label_boosts: "부스트",
	inviteinfo_label_features: "기능",
	serverpic_card_title: "${guild}의 아이콘",
	serverpic_card_no_icon: "이 서버에는 아이콘이 없어요.",
	where_card_title: "${member}님은 어디에 있을까요",
	where_label_member: "멤버",
	where_label_channel: "음성 채널",
	where_label_stream: "방송 중",
	where_label_video: "카메라",
	where_label_mute: "마이크 음소거",
	where_label_deaf: "헤드셋 음소거",
	vc_card_title: "음성 활동",
	vc_label_members: "멤버",
	vc_label_online: "온라인",
	vc_label_in_voice: "음성 채널 접속 중",
	vc_label_streaming: "방송 중",
	vc_label_boosts: "부스트",
	vc_label_camera: "카메라 켜짐",
	vc_label_muted: "음소거됨",
	snipe_card_title: "마지막으로 삭제된 메시지",
	snipe_label_author: "작성자",
	snipe_label_sent: "보낸 시간",

	// Components V2 cards: /delrole, /derank, /massiverole, /massmove, /nickrole, /setmentionrole, /util bringall, /util move
	utils_label_member: "멤버",
	utils_label_role: "역할",
	utils_label_by: "실행자",
	utils_label_failed: "실패",
	utils_label_from: "출발",
	utils_label_to: "도착",
	utils_label_moved: "이동됨",
	utils_label_name_filter: "이름에 포함된 텍스트",
	derank_card_progress: "${member}님에게서 역할 ${count}개를 제거하는 중…",
	derank_card_title: "멤버 역할 박탈 완료",
	derank_label_removed: "제거된 역할",
	massiverole_card_progress_add: "멤버 ${count}명에게 역할을 추가하는 중…",
	massiverole_card_progress_sub: "멤버 ${count}명에게서 역할을 제거하는 중…",
	massiverole_card_title_add: "멤버에게 역할 지급 완료",
	massiverole_card_title_sub: "멤버에게서 역할 제거 완료",
	massiverole_label_added: "받음",
	massiverole_label_already: "이미 있음",
	massiverole_label_removed: "잃음",
	massiverole_label_without: "없었음",
	nickrole_label_skipped: "건너뜀",
	massmove_card_title: "멤버 이동 완료",
	bringall_card_title: "멤버 분산 완료",
	bringall_label_category: "카테고리",
	bringall_label_channels: "음성 채널",
	setmentionrole_card_title: "멘션 역할 사용",
	setmentionrole_card_desc: "멤버가 저를 멘션하면 이 역할을 드려요.",
	setmentionrole_card_note:
		"사용자명이나 표시 이름에 이 텍스트가 포함된 멤버만 역할을 받아요. 텍스트를 지우면 역할이 제거되고, 다시 넣으면 역할을 다시 드려요.",

	// Components V2 cards: /admin-users, /admin-roles, /allwebhooks, /role-members, /prevnames, /emojis, /leashlist, /locknamelist
	card_bot: "봇",
	card_working: "처리 중…",
	card_label_requested_by: "요청자",
	card_label_failed: "실패",
	admin_users_card_title: "관리자",
	admin_users_card_count: "관리자 권한이 있는 멤버 ${count}명",
	admin_users_card_only_bots: "이 권한은 봇만 가지고 있어요.",
	admin_users_button_hide_bots: "봇 숨기기",
	admin_users_button_show_bots: "봇 표시",
	admin_users_card_done_title: "관리자 권한 박탈 완료",
	admin_users_label_unranked: "권한이 박탈된 멤버",
	admin_roles_card_title: "관리자 역할",
	admin_roles_card_count: "관리자 권한이 있는 역할 ${count}개",
	admin_roles_card_managed: "연동으로 관리됨",
	admin_roles_card_done_title: "관리자 권한 제거 완료",
	admin_roles_label_modified: "수정된 역할",
	allwebhooks_card_count: "웹후크 ${count}개",
	allwebhooks_button_delete: "모두 삭제",
	role_members_card_title: "${role}의 멤버",
	role_members_card_count: "멤버 ${count}명",
	prevnames_card_title: "${user}님의 이전 이름",
	prevnames_card_count: "기록된 이름 ${count}개",
	prevnames_button_erase: "내 기록 지우기",
	prevnames_label_username: "사용자명",
	prevnames_label_display_name: "표시 이름",
	prevnames_label_nickname: "${guild}에서의 별명",
	emoji_card_title: "이모지 추가 완료",
	emoji_card_count: "${guild}에 이모지 ${count}개를 만들었어요",
	util_leashlist_card_count: "활성 목줄 ${count}개",
	util_leashlist_card_expires: "만료",
	util_locknamelist_card_count: "잠긴 별명 ${count}개",
	util_locknamelist_card_by: "${user}님이 잠금",

	// Components V2 cards: /invites, /leaderboard, /addinvites, /removeinvites
	invites_card_title: "초대 통계",
	invites_label_total: "합계",
	invites_label_regular: "일반",
	invites_label_left: "나감",
	invites_label_bonus: "보너스",
	invites_label_invited_by: "초대한 사람",
	leaderboard_card_title: "초대 순위표",
	leaderboard_card_count: "${guild}의 순위에 오른 멤버 ${count}명",
	leaderboard_card_your_rank: "내 순위: ${rank}/${count} · 초대 ${invites}회",
	leaderboard_card_not_ranked: "아직 순위에 오르지 않았어요.",
	leaderboard_card_empty: "아직 이 서버에서 초대한 사람이 없어요.",
	leaderboard_card_generated: "${elapsed}ms 만에 생성됨",

	// Components V2 cards: /fun caracteres, catsay, hack, hug, kiss, slap, love, poll, question, tweet, youtube
	caracteres_card_title: "텍스트 스타일 선택",
	caracteres_card_result_title: "${style} 스타일로 바꾼 텍스트",
	caracteres_label_original: "원본",
	caracteres_label_converted: "변환 결과",
	catsay_card_title: "고양이가 말했어요",
	hack_card_title: "해킹 완료",
	hack_label_ip: "IP 주소",
	hack_label_email: "이메일",
	hack_label_password: "비밀번호",
	hug_card_title: "포옹 타임",
	hug_card_desc: "${author}님이 ${target}님을 꼭 안아 줬어요.",
	kiss_card_title: "쪽",
	kiss_card_desc: "${author}님이 ${target}님에게 뽀뽀했어요.",
	slap_card_title: "찰싹",
	slap_card_desc: "${author}님이 ${target}님의 뺨을 때렸어요.",
	love_card_title: "사랑 계산기",
	love_card_desc: "**${user1}** + **${user2}** = 사랑 `${percent}%`",
	poll_card_title: "${author}님의 투표",
	poll_card_vote: "찬성은 ${yes}, 반대는 ${no}(으)로 반응해 주세요.",
	question_card_title: "${author}님의 질문",
	question_label_question: "질문",
	question_label_answer: "답변",
	tweet_card_title: "${user}님의 새 게시물",
	youtube_card_title: "${user}님의 새 댓글",

	// Components V2 cards: fun animal pictures (/cat /dog /dolphin /duck /fox /frog /panda /squirrel) and random results (/dice /heads-tails /number /rate /gay /trans /stench /transgender)
	fun_card_cat_title: "야옹",
	fun_card_dog_title: "멍멍",
	fun_card_dolphin_title: "끼익끼익, 딸깍딸깍",
	fun_card_duck_title: "꽥꽥",
	fun_card_fox_title: "와파파파파",
	fun_card_frog_title: "개굴개굴",
	fun_card_panda_title: "음와",
	fun_card_squirrel_title: "찍찍",
	fun_card_animal_hint: "오직 당신을 위한 랜덤 사진이에요.",
	fun_card_dice_title: "주사위 굴리기",
	fun_card_coinflip_title: "앞면 또는 뒷면",
	fun_card_number_title: "랜덤 숫자",
	fun_card_gay_title: "게이 측정기",
	fun_card_trans_title: "트랜스 측정기",
	fun_card_stench_title: "악취 측정기",
	fun_card_rate_title: "내 평가",
	fun_card_transgender_title: "트랜스 프라이드 아바타",
	fun_label_dice: "주사위",
	fun_label_rolls: "굴린 결과",
	fun_label_total: "합계",
	fun_label_result: "결과",
	fun_label_range: "범위",
	fun_label_score: "점수",
	fun_label_rated: "평가 대상",

	// Components V2 cards: /ban, /kick, /baninfo, /banlist, /mutelist, /warnlist, /unwarn, /rolepanel
	mod_label_moderator: "모더레이터",
	mod_label_warn_id: "경고 ID",
	ban_card_title: "멤버 차단됨",
	kick_card_title: "멤버 추방됨",
	baninfo_card_title: "${user}님의 차단 정보",
	banlist_card_title: "차단된 멤버",
	banlist_card_count: "차단된 멤버 ${count}명",
	mutelist_card_title: "타임아웃 중인 멤버",
	mutelist_card_count: "타임아웃 중인 멤버 ${count}명",
	mutelist_card_ends: "${time} 종료",
	mutelist_button_unmute_all: "모든 타임아웃 해제",
	mutelist_card_cleared_title: "타임아웃 해제 완료",
	mutelist_card_cleared_desc: "멤버 ${count}명이 다시 말할 수 있어요.",
	warnlist_card_title: "${user}님의 경고",
	warnlist_card_count: "경고 ${count}회",
	unwarn_card_title: "경고 제거됨",
	rolepanel_card_done_title: "역할 업데이트 완료",
	rolepanel_label_added: "추가됨",
	rolepanel_label_removed: "제거됨",
	rolepanel_label_refused: "거부됨",

	// /stats rebuilt: Components V2 card and resvg pages
	stats_locale: "ko-KR",
	stats_view_overview: "개요",
	stats_view_overview_desc: "합계, 추세, 자주 쓰는 채널",
	stats_view_rhythm: "리듬",
	stats_view_rhythm_desc: "시간대별 활동 시각",
	stats_view_members: "멤버",
	stats_view_members_desc: "누가 대화하고 누가 음성 채널에 머무는지",
	stats_view_channels: "채널",
	stats_view_channels_desc: "가장 활발한 텍스트 및 음성 채널",
	stats_select_placeholder: "보기 선택",
	stats_label_messages: "메시지",
	stats_label_voice: "음성 시간",
	stats_label_active_days: "활동한 날",
	stats_label_rank: "서버 순위",
	stats_label_active_members: "활동 멤버",
	stats_label_members: "멤버",
	stats_label_peak: "최고치",
	stats_label_avg_length: "평균 길이",
	stats_label_sessions: "음성 세션",
	stats_label_longest_session: "최장 세션",
	stats_label_best_streak: "최장 연속 기록",
	stats_note_change_up: "지난주 대비 +${change} %",
	stats_note_change_down: "지난주 대비 -${change} %",
	stats_note_new: "이번 주 신규",
	stats_note_steady: "지난주와 같음",
	stats_note_streak: "${days}일 연속",
	stats_note_rank_of: "멤버 ${count}명 중",
	stats_note_unranked: "아직 순위 없음",
	stats_note_chars: "메시지당 글자 수",
	stats_note_avg_session: "평균 ${duration}",
	stats_note_days_in_row: "일 연속",
	stats_chart_daily: "일별 활동",
	stats_chart_voice_minutes: "음성 (분)",
	stats_chart_messages_per_day: "일별 메시지",
	stats_text_channels: "텍스트 채널",
	stats_voice_channels: "음성 채널",
	stats_top_messages: "메시지 최다",
	stats_top_voice: "음성 시간 최다",
	stats_heat_messages: "메시지",
	stats_heat_voice: "음성",
	stats_peak_note: "최고치: ${day} ${hour}",
	stats_empty: "아직 없음",
	stats_footer_zone: "${zone} 기준 시간 · 최근 30일",
	stats_title_user: "${user}님의 활동",
	stats_title_guild: "${guild}의 활동",
	stats_title_channel: "${channel}의 활동",
	stats_title_compare: "${a} 및 ${b}",
	stats_title_top_messages: "메시지 순위",
	stats_title_top_voice: "음성 순위",
	stats_period_1d: "최근 24시간",
	stats_period_7d: "최근 7일",
	stats_period_30d: "최근 30일",
	stats_insight_peak: "${day} ${hour}쯤에 가장 활발해요.",
	stats_insight_up: "지난주보다 메시지가 ${change} % 많아요.",
	stats_insight_down: "지난주보다 메시지가 ${change} % 적어요.",
	stats_insight_channel: "자주 쓰는 채널: ${channel}.",
	stats_insight_streak: "${days}일 연속 활동 중이에요.",
	stats_insight_leader: "${user}님이 ${value}(으)로 1위예요.",
	stats_insight_compare:
		"${user}님이 ${total}개 지표 중 ${count}개에서 앞서요.",
	stats_insight_tie: "막상막하예요.",
	stats_compare_same: "서로 다른 멤버 두 명을 선택해 주세요.",
	stats_wrong_channel: "텍스트 또는 음성 채널을 선택해 주세요.",

	// /stats rebuilt: Components V2 card and resvg pages
	stats_card_no_data: "최근 30일 동안 기록된 활동이 없어요.",

	// /music apo panel
	music_apo_panel_title: "Equalizer APO",
	music_apo_panel_on: "모듈 켜짐",
	music_apo_panel_off: "모듈 꺼짐",
	music_apo_panel_applied: "기본 적용: **${name}**",
	music_apo_panel_nothing_applied: "기본으로 적용된 설정 없음",
	music_apo_panel_count:
		"설정 ${count}/${max}개 · 적용된 설정이 서버에서 재생되는 모든 소리에 반영돼요",
	music_apo_panel_empty:
		"아직 설정이 없어요. 아래 버튼으로 Equalizer APO .txt 파일을 추가하세요.",
	music_apo_badge_applied: "적용됨",
	music_apo_badge_frozen: "고정됨",
	music_apo_config_meta: "${user} · ${time} 업데이트 · ${lines}줄 · ${size}",
	music_apo_button_manage: "관리",
	music_apo_button_add: "설정 추가",
	music_apo_button_enable: "켜기",
	music_apo_button_disable: "끄기",
	music_apo_button_apply: "기본으로 적용",
	music_apo_button_unapply: "적용 중지",
	music_apo_button_rename: "이름 변경",
	music_apo_button_replace: "파일 교체",
	music_apo_button_freeze: "고정",
	music_apo_button_unfreeze: "고정 해제",
	music_apo_button_delete: "삭제",
	music_apo_button_confirm_delete: "영구 삭제",
	music_apo_button_cancel: "취소",
	music_apo_frozen_note:
		"${user}님이 고정함: 적용은 가능하지만 이름 변경, 교체, 삭제는 할 수 없어요.",
	music_apo_confirm_delete: "**${name}**을(를) 삭제할까요? 되돌릴 수 없어요.",
	music_apo_modal_add_title: "APO 설정 추가",
	music_apo_modal_replace_title: "파일 교체",
	music_apo_modal_rename_title: "설정 이름 변경",
	music_apo_field_name: "이름",
	music_apo_field_name_desc: "패널에 표시돼요. 최대 ${max}자",
	music_apo_field_file: "Equalizer APO 파일",
	music_apo_field_file_desc: ".txt 파일, 최대 ${kb} KiB 및 명령어 ${lines}줄",
	music_apo_no_permission:
		"${emoji} 서버의 관리자와 서버 소유자만 APO 설정을 관리할 수 있어요.",
	music_apo_full:
		"${emoji} 이 서버에는 이미 설정이 ${max}개 있어요. 먼저 하나를 삭제해 주세요.",
	music_apo_name_taken: "${emoji} **${name}**(이)라는 설정이 이미 있어요.",
	music_apo_name_empty: "${emoji} 설정 이름을 입력해 주세요.",
	music_apo_not_txt: "${emoji} .txt 파일을 보내 주세요.",
	music_apo_too_big: "${emoji} 파일이 ${kb} KiB를 넘어요.",
	music_apo_too_many_lines: "${emoji} 파일의 명령어가 ${lines}줄을 넘어요.",
	music_apo_empty_file: "${emoji} 파일이 비어 있어요.",
	music_apo_frozen:
		"${emoji} **${name}**은(는) 고정되어 있어요. 먼저 고정을 해제해 주세요.",
	music_apo_cannot_unfreeze:
		"${emoji} ${user}님, 서버 소유자 또는 봇 소유자만 고정을 해제할 수 있어요.",
	music_apo_saved: "${emoji} **${name}** 저장 완료 (${stages}단계).",
	// +shardinfo
	shardinfo_title: "샤드 정보",
	shardinfo_location:
		"이 서버는 샤드 **${shardId}**에 있어요. 명령어는 샤드 **${handlerShardId}**, 프로세스 `${pid}`에서 처리했어요.",
	shardinfo_member_data:
		"멤버 수: 정확 **${exactCount}**, 근사치 **${approximateCount}**, 누락 **${missingCount}**",
	shardinfo_offline_shards: "응답하지 않는 샤드: ${shards}",
	shardinfo_section_unavailable: "사용할 수 없는 서버",
	shardinfo_section_approximate: "근사치를 사용하는 서버",
	shardinfo_section_missing: "멤버 데이터가 없는 서버",
	shardinfo_card_title: "iHorizon 샤드",
	shardinfo_card_summary: "샤드 ${shardId}에서 렌더링 · 프로세스 ${pid}",
	shardinfo_card_pill: "${onlineCount}/${shardCount} 온라인",
	shardinfo_card_shard: "샤드 ${shardId}",
	shardinfo_card_state_online: "온라인",
	shardinfo_card_state_starting: "연결 중",
	shardinfo_card_state_offline: "오프라인",
	shardinfo_card_no_response: "응답 없음",
	shardinfo_card_servers: "서버",
	shardinfo_card_servers_unit: "개 서버",
	shardinfo_card_servers_detail: "${unavailableCount}개 사용 불가",
	shardinfo_card_members: "멤버",
	shardinfo_card_members_detail: "서버당 ${averageCount}명",
	shardinfo_card_ping: "평균 핑",
	shardinfo_card_ping_detail: "최고: ${ping}",
	shardinfo_card_shard_ping: "핑",
	shardinfo_card_memory: "메모리",
	shardinfo_card_memory_detail: "샤드당 ${size}",
	shardinfo_card_voice: "음성",
	shardinfo_card_voice_detail: "채널 ${channelCount}개",
	shardinfo_card_channels: "채널",
	shardinfo_card_uptime: "가동 시간",
	shardinfo_card_chart_servers: "샤드별 서버",
	shardinfo_card_chart_members: "샤드별 멤버",
	shardinfo_card_chart_average: "평균: ${value}",
	shardinfo_card_unit_day: "일",
	shardinfo_card_unit_hour: "시간",
	shardinfo_card_unit_minute: "분",
	// ?status-embed
	status_panel_title: "# ${emoji_Logo} iHorizon 상태",
	status_panel_headline:
		"${state} **${label}** · 서비스 ${upCount}/${totalCount}개 온라인",
	status_panel_label_operational: "모든 시스템 정상 작동",
	status_panel_label_maintenance: "점검 진행 중",
	status_panel_label_degraded: "일부 장애",
	status_panel_label_major: "주요 장애",
	status_panel_button: "상태 페이지",
	status_panel_group: "### ${emoji_Server_Stats} ${name}",
	status_panel_group_core: "핵심 서비스",
	status_panel_service_gateway: "HorizonGateway (API)",
	status_panel_service_lavalink: "Lavalink (음악)",
	status_panel_service_website: "iHorizon 웹사이트",
	status_panel_row: "${status} **${name}** · ${detail}",
	status_panel_row_detail: "`${ping} ms` · `${uptime}`",
	status_panel_row_offline: "오프라인",
	status_panel_row_maintenance: "점검 중",
	status_panel_row_pending: "확인 중",
	status_panel_incident: "### ${emoji_Warning_Icon} ${title}\n${content}",
	status_panel_footer:
		"-# ${emoji_Timer} ${time} 업데이트 · 1분마다 새로고침",
	status_panel_kuma_unavailable:
		"-# ${emoji_Warn} Uptime Kuma에 연결할 수 없어 봇 자체 점검 결과를 표시해요.",
	status_panel_loading: "${emoji_Discord_Loading} 상태 패널을 불러오는 중...",
	status_panel_card_title: "인프라 상태",
	status_panel_card_summary: "서비스 ${upCount}/${totalCount}개 온라인",
	status_panel_card_uptime_24h: "가동률 24시간",
	status_panel_card_uptime_30d: "가동률 30일",
	status_panel_card_response: "평균 응답",
	status_panel_card_ws: "Discord 핑",
	status_panel_card_col_history: "최근 60회 점검",
	status_panel_card_col_ping: "핑",
	status_panel_card_col_uptime: "30일",
	status_panel_card_chart: "평균 응답 시간"
} satisfies LanguageData;
