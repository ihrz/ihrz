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

import {
	ApplicationCommandOptionType,
	ApplicationCommandType
} from "discord.js";

import { Command } from "../../../../types/command.js";

export const command: Command = {
	name: "lastfm",

	description: "Connect your Last.fm account and control music scrobbling.",
	description_localizations: {
		fr: "Connectez votre compte Last.fm et gérez le scrobbling musical.",
		ja: "Last.fmアカウントを接続してスクロブルを管理。",
		ru: "Подключите аккаунт Last.fm и управляйте скробблингом.",
		"es-ES":
			"Conecta tu cuenta de Last.fm y controla el scrobbling de música.",
		ko: "Last.fm 계정을 연결하고 음악 스크로블링을 관리해요.",
		uk: "Підключіть акаунт Last.fm і керуйте скроблінгом музики.",
		de: "Verbinde dein Last.fm-Konto und steuere das Scrobbling.",
		it: "Collega il tuo account Last.fm e gestisci lo scrobbling.",
		"pt-BR": "Conecte sua conta do Last.fm e controle o scrobbling.",
		pl: "Połącz konto Last.fm i zarządzaj scrobblingiem."
	},

	options: [
		{
			name: "config",
			prefixName: "config",
			description:
				"Enable or disable Last.fm scrobbling for your account.",
			description_localizations: {
				fr: "Activez ou désactivez le scrobbling Last.fm pour votre compte.",
				ja: "アカウントのLast.fmスクロブルを有効化または無効化。",
				ru: "Включить или отключить скробблинг Last.fm для вашего аккаунта.",
				"es-ES":
					"Habilitar o deshabilitar el scrobbling de Last.fm para tu cuenta.",
				ko: "내 계정의 Last.fm 스크로블링을 켜거나 꺼요.",
				uk: "Увімкнути або вимкнути скроблінг Last.fm для вашого акаунта.",
				de: "Last.fm-Scrobbling für dein Konto aktivieren oder deaktivieren.",
				it: "Attiva o disattiva lo scrobbling Last.fm per il tuo account.",
				"pt-BR":
					"Ative ou desative o scrobbling do Last.fm na sua conta.",
				pl: "Włącz lub wyłącz scrobbling Last.fm dla swojego konta."
			},
			ephemeral: true,
			options: [
				{
					name: "power",
					description: "Power On or Power Off the module",
					description_localizations: {
						fr: "Activer ou désactiver le module",
						ja: "モジュールをオンまたはオフ",
						ru: "Включить или выключить модуль",
						"es-ES": "Encender o Apagar el módulo",
						ko: "모듈 켜기 또는 끄기",
						uk: "Увімкнути або вимкнути модуль",
						de: "Modul ein- oder ausschalten",
						it: "Attiva o disattiva il modulo",
						"pt-BR": "Ligar ou desligar o módulo",
						pl: "Włącz lub wyłącz moduł"
					},
					type: ApplicationCommandOptionType.String,
					choices: [
						{
							name: "Power On",
							name_localizations: {
								fr: "Activer",
								ja: "power_on",
								ru: "power_on",
								"es-ES": "power_on",
								ko: "켜기",
								uk: "Увімкнути",
								de: "Einschalten",
								it: "Attiva",
								"pt-BR": "Ligar",
								pl: "Włącz"
							},
							value: "on"
						},
						{
							name: "Power Off",
							name_localizations: {
								fr: "Désactiver",
								ja: "power_off",
								ru: "power_off",
								"es-ES": "power_off",
								ko: "끄기",
								uk: "Вимкнути",
								de: "Ausschalten",
								it: "Disattiva",
								"pt-BR": "Desligar",
								pl: "Wyłącz"
							},
							value: "off"
						}
					],
					required: true,
					permission: null
				}
			],
			type: ApplicationCommandOptionType.Subcommand,
			permission: null
		},
		{
			name: "login",
			prefixName: "login",
			description: "Login to Last.fm and store your scrobbling session.",
			description_localizations: {
				fr: "Connectez-vous à Last.fm et enregistrez votre session de scrobbling.",
				ja: "Last.fmにログインしてスクロブルセッションを保存。",
				ru: "Войти в Last.fm и сохранить сессию скробблинга.",
				"es-ES":
					"Iniciar sesión en Last.fm y guardar tu sesión de scrobbling.",
				ko: "Last.fm에 로그인하고 스크로블링 세션을 저장해요.",
				uk: "Увійти в Last.fm і зберегти сесію скроблінгу.",
				de: "Melde dich bei Last.fm an und speichere deine Scrobbling-Sitzung.",
				it: "Accedi a Last.fm e salva la tua sessione di scrobbling.",
				"pt-BR": "Entre no Last.fm e guarde sua sessão de scrobbling.",
				pl: "Zaloguj się do Last.fm i zapisz sesję scrobblingu."
			},
			ephemeral: true,
			options: [
				{
					name: "username",
					description: "Your Last.fm username or email address",
					description_localizations: {
						fr: "Votre nom d’utilisateur ou email Last.fm",
						ja: "Last.fmのユーザー名またはメールアドレス",
						ru: "Ваше имя пользователя или email Last.fm",
						"es-ES":
							"Tu nombre de usuario o dirección de correo de Last.fm",
						ko: "Last.fm 사용자명 또는 이메일 주소",
						uk: "Ваше ім'я користувача або email Last.fm",
						de: "Dein Last.fm-Benutzername oder deine E-Mail-Adresse",
						it: "Il tuo nome utente o indirizzo email di Last.fm",
						"pt-BR": "Seu nome de usuário ou e-mail do Last.fm",
						pl: "Twoja nazwa użytkownika lub e-mail Last.fm"
					},
					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				},
				{
					name: "password",
					description: "Your Last.fm password",
					description_localizations: {
						fr: "Votre mot de passe Last.fm",
						ja: "Last.fmのパスワード",
						ru: "Ваш пароль Last.fm",
						"es-ES": "Tu contraseña de Last.fm",
						ko: "Last.fm 비밀번호",
						uk: "Ваш пароль Last.fm",
						de: "Dein Last.fm-Passwort",
						it: "La tua password di Last.fm",
						"pt-BR": "Sua senha do Last.fm",
						pl: "Twoje hasło Last.fm"
					},
					type: ApplicationCommandOptionType.String,
					required: true,
					permission: null
				}
			],
			type: ApplicationCommandOptionType.Subcommand,
			permission: null
		},
		{
			name: "status",
			prefixName: "status",
			description:
				"Your Last.fm link: account, scrobbling and the song playing now.",
			description_localizations: {
				fr: "Votre liaison Last.fm : compte, scrobbling et titre en cours.",
				ja: "Last.fm連携の状態：アカウント、スクロブル、再生中の曲。",
				ru: "Ваша привязка Last.fm: аккаунт, скробблинг и текущий трек.",
				"es-ES":
					"Tu enlace con Last.fm: cuenta, scrobbling y canción actual.",
				ko: "Last.fm 연결 상태: 계정, 스크로블링, 지금 듣는 곡.",
				uk: "Ваш зв'язок із Last.fm: акаунт, скроблінг і поточний трек.",
				de: "Deine Last.fm-Verknüpfung: Konto, Scrobbling und aktueller Titel.",
				it: "Il tuo collegamento Last.fm: account, scrobbling e brano in corso.",
				"pt-BR":
					"Seu vínculo com o Last.fm: conta, scrobbling e faixa atual.",
				pl: "Twoje połączenie z Last.fm: konto, scrobbling i bieżący utwór."
			},
			ephemeral: true,
			type: ApplicationCommandOptionType.Subcommand,
			permission: null
		},
		{
			name: "overview",
			prefixName: "overview",
			description:
				"A Last.fm profile at a glance: figures, recent listens and tops.",
			description_localizations: {
				fr: "Un aperçu d'un profil Last.fm : chiffres, écoutes récentes et tops.",
				ja: "Last.fmプロフィールの概要：統計、最近の再生、トップ。",
				ru: "Обзор профиля Last.fm: статистика, недавние треки и топы.",
				"es-ES":
					"Un resumen de un perfil de Last.fm: cifras, escuchas recientes y tops.",
				ko: "Last.fm 프로필 한눈에 보기: 통계, 최근 곡, 톱 차트.",
				uk: "Огляд профілю Last.fm: статистика, нещодавні треки й топи.",
				de: "Ein Überblick über ein Last.fm-Profil: Zahlen, letzte Titel und Tops.",
				it: "Una panoramica di un profilo Last.fm: numeri, ascolti recenti e top.",
				"pt-BR":
					"Um resumo de um perfil do Last.fm: números, faixas recentes e tops.",
				pl: "Przegląd profilu Last.fm: statystyki, ostatnie utwory i topy."
			},
			options: [
				{
					name: "user",
					description:
						"The member whose profile to show (you by default)",
					description_localizations: {
						fr: "Le membre dont voir le profil (vous par défaut)",
						ja: "プロフィールを見るメンバー（既定は自分）",
						ru: "Участник, чей профиль показать (по умолчанию вы)",
						"es-ES": "El miembro cuyo perfil ver (tú por defecto)",
						ko: "프로필을 볼 멤버 (기본: 나)",
						uk: "Учасник, чий профіль показати (типово ви)",
						de: "Das Mitglied, dessen Profil du sehen willst (standardmäßig du)",
						it: "Il membro di cui vedere il profilo (tu per impostazione predefinita)",
						"pt-BR": "O membro cujo perfil ver (você por padrão)",
						pl: "Członek, którego profil pokazać (domyślnie ty)"
					},
					type: ApplicationCommandOptionType.User,
					required: false,
					permission: null
				},
				{
					name: "period",
					description:
						"The period of the tops (last 7 days by default)",
					description_localizations: {
						fr: "La période des tops (7 jours par défaut)",
						ja: "トップの期間（既定は7日間）",
						ru: "Период топов (по умолчанию 7 дней)",
						"es-ES": "El periodo de los tops (7 días por defecto)",
						ko: "톱 차트 기간 (기본: 7일)",
						uk: "Період топів (типово 7 днів)",
						de: "Zeitraum der Tops (standardmäßig 7 Tage)",
						it: "Il periodo dei top (7 giorni per impostazione predefinita)",
						"pt-BR": "O período dos tops (7 dias por padrão)",
						pl: "Okres topów (domyślnie 7 dni)"
					},
					type: ApplicationCommandOptionType.String,
					choices: [
						{
							name: "Last 7 days",
							name_localizations: {
								fr: "7 derniers jours",
								ja: "過去7日間",
								ru: "Последние 7 дней",
								"es-ES": "Últimos 7 días",
								ko: "최근 7일",
								uk: "Останні 7 днів",
								de: "Letzte 7 Tage",
								it: "Ultimi 7 giorni",
								"pt-BR": "Últimos 7 dias",
								pl: "Ostatnie 7 dni"
							},
							value: "7day"
						},
						{
							name: "Last month",
							name_localizations: {
								fr: "Dernier mois",
								ja: "過去1か月",
								ru: "Последний месяц",
								"es-ES": "Último mes",
								ko: "최근 1개월",
								uk: "Останній місяць",
								de: "Letzter Monat",
								it: "Ultimo mese",
								"pt-BR": "Último mês",
								pl: "Ostatni miesiąc"
							},
							value: "1month"
						},
						{
							name: "Last 3 months",
							name_localizations: {
								fr: "3 derniers mois",
								ja: "過去3か月",
								ru: "Последние 3 месяца",
								"es-ES": "Últimos 3 meses",
								ko: "최근 3개월",
								uk: "Останні 3 місяці",
								de: "Letzte 3 Monate",
								it: "Ultimi 3 mesi",
								"pt-BR": "Últimos 3 meses",
								pl: "Ostatnie 3 miesiące"
							},
							value: "3month"
						},
						{
							name: "Last 6 months",
							name_localizations: {
								fr: "6 derniers mois",
								ja: "過去6か月",
								ru: "Последние 6 месяцев",
								"es-ES": "Últimos 6 meses",
								ko: "최근 6개월",
								uk: "Останні 6 місяців",
								de: "Letzte 6 Monate",
								it: "Ultimi 6 mesi",
								"pt-BR": "Últimos 6 meses",
								pl: "Ostatnie 6 miesięcy"
							},
							value: "6month"
						},
						{
							name: "Last year",
							name_localizations: {
								fr: "Dernière année",
								ja: "過去1年",
								ru: "Последний год",
								"es-ES": "Último año",
								ko: "최근 1년",
								uk: "Останній рік",
								de: "Letztes Jahr",
								it: "Ultimo anno",
								"pt-BR": "Último ano",
								pl: "Ostatni rok"
							},
							value: "12month"
						},
						{
							name: "All time",
							name_localizations: {
								fr: "Depuis toujours",
								ja: "全期間",
								ru: "За всё время",
								"es-ES": "Desde siempre",
								ko: "전체 기간",
								uk: "За весь час",
								de: "Gesamter Zeitraum",
								it: "Da sempre",
								"pt-BR": "Desde sempre",
								pl: "Od zawsze"
							},
							value: "overall"
						}
					],
					required: false,
					permission: null
				}
			],
			type: ApplicationCommandOptionType.Subcommand,
			permission: null
		}
	],
	thinking: true,
	category: "lastfm",
	type: ApplicationCommandType.ChatInput,

	permission: null
};
