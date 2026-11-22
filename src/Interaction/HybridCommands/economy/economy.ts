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
	ApplicationCommandType,
	GuildMember,
	PermissionFlagsBits
} from "discord.js";

import { LanguageData } from "../../../../types/languageData.js";
import { Command } from "../../../../types/command.js";
import { DatabaseStructure } from "../../../../types/database_structure.js";

export const command: Command = {
	name: "economy",
	name_localizations: {
		fr: "économie",
		ja: "economy",
		ru: "economy",
		"es-ES": "economy",
		ko: "economy",
		uk: "economy",
		de: "economy",
		it: "economy",
		"pt-BR": "economy",
		pl: "economy"
	},

	description: "Subcommand for economy category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie d'économie",
		ja: "経済カテゴリのサブコマンド！",
		ru: "Подкоманда для категории экономики!",
		"es-ES": "Subcomando para la categoría de economía!",
		ko: "경제 하위 명령어!",
		uk: "Підкоманда категорії економіки!",
		de: "Unterbefehle der Wirtschafts-Kategorie!",
		it: "Sottocomandi della categoria economia!",
		"pt-BR": "Subcomandos da categoria economia!",
		pl: "Podkomendy kategorii ekonomii!"
	},

	options: [
		{
			name: "balance-add",
			prefixName: "addmoney",

			description: "Add money to a user!",
			description_localizations: {
				fr: "Ajoutez de l'argent à un utilisateur",
				ja: "ユーザーにお金を追加！",
				ru: "Добавить деньги пользователю!",
				"es-ES": "Añadir dinero a un usuario!",
				ko: "사용자에게 돈을 추가해요!",
				uk: "Додати гроші користувачу!",
				de: "Füge einem Nutzer Geld hinzu!",
				it: "Aggiungi denaro a un utente!",
				"pt-BR": "Adicione dinheiro a um usuário!",
				pl: "Dodaj pieniądze użytkownikowi!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "amount",
					type: ApplicationCommandOptionType.Number,

					description: "The amount of money you want to add",
					description_localizations: {
						fr: "Le montant d'argent que vous souhaitez ajouter",
						ja: "追加したい金額",
						ru: "Сумма денег для добавления",
						"es-ES": "La cantidad de dinero que quieres añadir",
						ko: "추가할 금액",
						uk: "Сума грошей, яку ви хочете додати",
						de: "Der Geldbetrag, den du hinzufügen willst",
						it: "La somma di denaro da aggiungere",
						"pt-BR":
							"A quantia de dinheiro que você quer adicionar",
						pl: "Kwota, którą chcesz dodać"
					},

					required: true,

					permission: null
				},
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "The member who you want to add money",
					description_localizations: {
						fr: "Le membre à qui vous souhaitez ajouter de l'argent",
						ja: "お金を追加したいメンバー",
						ru: "Участник, которому добавить деньги",
						"es-ES": "El miembro al que quieres añadir dinero",
						ko: "돈을 추가할 멤버",
						uk: "Учасник, якому ви хочете додати гроші",
						de: "Das Mitglied, dem du Geld hinzufügen willst",
						it: "Il membro a cui aggiungere denaro",
						"pt-BR": "O membro a quem você quer adicionar dinheiro",
						pl: "Członek, któremu chcesz dodać pieniądze"
					},

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "balance-remove",
			prefixName: "removemoney",

			description: "Remove money from a user!",
			description_localizations: {
				fr: "Retirer de l'argent à un utilisateur",
				ja: "ユーザーからお金を削除！",
				ru: "Убрать деньги у пользователя!",
				"es-ES": "Quitar dinero a un usuario!",
				ko: "사용자의 돈을 차감해요!",
				uk: "Забрати гроші в користувача!",
				de: "Entferne Geld von einem Nutzer!",
				it: "Rimuovi denaro a un utente!",
				"pt-BR": "Remova dinheiro de um usuário!",
				pl: "Odejmij pieniądze użytkownikowi!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "amount",
					type: ApplicationCommandOptionType.Number,

					description: "amount of $ you want add",
					description_localizations: {
						fr: "montant de $ que vous souhaitez ajouter",
						ja: "追加したい金額",
						ru: "сумма для добавления",
						"es-ES": "cantidad de $ que quieres añadir",
						ko: "추가할 금액($)",
						uk: "Сума в $, яку ви хочете забрати",
						de: "Betrag in $, den du hinzufügen willst",
						it: "Quantità di $ da aggiungere",
						"pt-BR": "Quantia de $ que você quer adicionar",
						pl: "Kwota w $, którą chcesz dodać"
					},

					required: true,

					permission: null
				},
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "the member you want to add the money",
					description_localizations: {
						fr: "le membre auquel vous souhaitez ajouter de l'argent",
						ja: "お金を追加したいメンバー",
						ru: "участник, которому добавить деньги",
						"es-ES": "el miembro al que quieres añadir dinero",
						ko: "돈을 추가할 멤버",
						uk: "Учасник, у якого ви хочете забрати гроші",
						de: "Das Mitglied, dem du Geld hinzufügst",
						it: "Il membro a cui aggiungere denaro",
						"pt-BR": "O membro a quem você quer adicionar dinheiro",
						pl: "Członek, któremu dodać pieniądze"
					},

					required: true,
					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "balance",

			description: "Get the balance of a user!",
			description_localizations: {
				fr: "Obtenir le solde d'un utilisateur",
				ja: "ユーザーの残高を取得！",
				ru: "Получить баланс пользователя!",
				"es-ES": "Obtener el saldo de un usuario!",
				ko: "사용자의 잔액을 확인해요!",
				uk: "Отримати баланс користувача!",
				de: "Zeige das Guthaben eines Nutzers!",
				it: "Ottieni il saldo di un utente!",
				"pt-BR": "Veja o saldo de um usuário!",
				pl: "Pokaż saldo użytkownika!"
			},

			aliases: ["wallet", "coins", "bal"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description:
						"Target a user for see their current balance or keep blank for yourself",
					description_localizations: {
						fr: "Ciblez un utilisateur pour voir son solde actuel",
						ja: "残高を確認するユーザーを指定（空白で自分）",
						ru: "Укажите пользователя для просмотра баланса или оставьте пустым для себя",
						"es-ES":
							"Selecciona un usuario para ver su saldo actual o déjalo en blanco para ti",
						ko: "잔액을 볼 사용자 (비워 두면 내 잔액)",
						uk: "Користувач, чий баланс показати, або залиште порожнім для себе",
						de: "Mitglied, dessen Kontostand du sehen willst; leer = du selbst",
						it: "Utente di cui vedere il saldo; vuoto = te stesso",
						"pt-BR":
							"Usuário cujo saldo você quer ver; vazio = você mesmo",
						pl: "Użytkownik, którego saldo chcesz zobaczyć; puste = ty"
					},

					required: false,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "config",
			prefixName: "ecconfig",

			description: "Disable the economy module into your guild",
			description_localizations: {
				fr: "Désactiver entièrement le module d'économie sur un serveur",
				ja: "サーバーの経済モジュールを無効化",
				ru: "Отключить экономический модуль на сервере",
				"es-ES": "Deshabilitar el módulo de economía en tu servidor",
				ko: "서버의 경제 모듈을 비활성화해요",
				uk: "Вимкнути модуль економіки на вашому сервері",
				de: "Wirtschaftsmodul auf deinem Server deaktivieren",
				it: "Disattiva il modulo economia nel tuo server",
				"pt-BR": "Desative o módulo de economia no seu servidor",
				pl: "Wyłącz moduł ekonomii na swoim serwerze"
			},

			type: ApplicationCommandOptionType.Subcommand,

			options: [
				{
					name: "action",

					description: "What do you want to do ?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "Que quieres hacer?",
						ko: "무엇을 할까요?",
						uk: "Що ви хочете зробити?",
						de: "Was möchtest du tun?",
						it: "Cosa vuoi fare?",
						"pt-BR": "O que você quer fazer?",
						pl: "Co chcesz zrobić?"
					},

					type: ApplicationCommandOptionType.String,

					choices: [
						{
							name: "Enable the module",
							name_localizations: {
								fr: "Activer",
								ja: "enable_the_module",
								ru: "enable_the_module",
								"es-ES": "enable_the_module",
								ko: "모듈 활성화",
								uk: "Увімкнути модуль",
								de: "Modul aktivieren",
								it: "Attiva il modulo",
								"pt-BR": "Ativar o módulo",
								pl: "Włącz moduł"
							},
							value: "on"
						},
						{
							name: "Disable the module",
							name_localizations: {
								fr: "Désactiver",
								ja: "disable_the_module",
								ru: "disable_the_module",
								"es-ES": "disable_the_module",
								ko: "모듈 비활성화",
								uk: "Вимкнути модуль",
								de: "Modul deaktivieren",
								it: "Disattiva il modulo",
								"pt-BR": "Desativar o módulo",
								pl: "Wyłącz moduł"
							},
							value: "off"
						}
					],

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "leaderboard",
			prefixName: "economy-leaderboard",

			description: "Get the users balance's leaderboard of the guild!",
			description_localizations: {
				fr: "Obtenez le classement du solde des utilisateurs du serveur",
				ja: "サーバーのユーザー残高ランキングを取得！",
				ru: "Получить таблицу лидеров по балансу!",
				"es-ES":
					"Obtener la tabla de clasificación de saldos del servidor!",
				ko: "서버의 잔액 순위표를 확인해요!",
				uk: "Отримати таблицю лідерів сервера за балансом!",
				de: "Zeige die Guthaben-Rangliste des Servers!",
				it: "Ottieni la classifica dei saldi del server!",
				"pt-BR": "Veja o ranking de saldos do servidor!",
				pl: "Pokaż ranking sald serwera!"
			},

			aliases: ["eclb", "eco-lb", "economy-lb"],

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "deposit",

			description: "Deposit coin in your bank!",
			description_localizations: {
				fr: "Déposez des pièces dans votre banque",
				ja: "銀行にコインを預ける！",
				ru: "Положить монеты в банк!",
				"es-ES": "Depositar monedas en tu banco!",
				ko: "은행에 코인을 입금해요!",
				uk: "Покласти монети на свій банківський рахунок!",
				de: "Zahle Münzen auf dein Konto ein!",
				it: "Deposita monete nella tua banca!",
				"pt-BR": "Deposite moedas no seu banco!",
				pl: "Wpłać monety do banku!"
			},

			aliases: ["dep"],

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "how-much",
					type: ApplicationCommandOptionType.String,

					description:
						"How much coin you want to deposit in your bank?",
					description_localizations: {
						fr: "Combien de pièces vous souhaitez déposer dans votre banque",
						ja: "銀行にいくら預けますか？",
						ru: "Сколько монет вы хотите положить в банк?",
						"es-ES":
							"Cuántas monedas quieres depositar en tu banco?",
						ko: "은행에 입금할 코인 수",
						uk: "Скільки монет ви хочете покласти в банк?",
						de: "Wie viele Münzen möchtest du einzahlen?",
						it: "Quante monete vuoi depositare in banca?",
						"pt-BR": "Quantas moedas quer depositar no banco?",
						pl: "Ile monet chcesz wpłacić do banku?"
					},

					required: true,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "daily",

			description: "Claim a daily reward!",
			description_localizations: {
				fr: "Réclamez une récompense quotidienne",
				ja: "デイリー報酬を獲得！",
				ru: "Получить ежедневную награду!",
				"es-ES": "Reclamar una recompensa diaria!",
				ko: "일일 보상을 받아요!",
				uk: "Отримати щоденну винагороду!",
				de: "Hol dir deine Tagesbelohnung!",
				it: "Riscuoti la ricompensa giornaliera!",
				"pt-BR": "Resgate sua recompensa diária!",
				pl: "Odbierz dzienną nagrodę!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "monthly",

			description: "Claim a monthly reward!",
			description_localizations: {
				fr: "Réclamez une récompense mensuelle",
				ja: "マンスリー報酬を獲得！",
				ru: "Получить ежемесячную награду!",
				"es-ES": "Reclamar una recompensa mensual!",
				ko: "월간 보상을 받아요!",
				uk: "Отримати щомісячну винагороду!",
				de: "Hol dir deine Monatsbelohnung!",
				it: "Riscuoti la ricompensa mensile!",
				"pt-BR": "Resgate sua recompensa mensal!",
				pl: "Odbierz miesięczną nagrodę!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "weekly",

			description: "Claim a weekly reward!",
			description_localizations: {
				fr: "Réclamez une récompense hebdomadaire",
				ja: "ウィークリー報酬を獲得！",
				ru: "Получить еженедельную награду!",
				"es-ES": "Reclamar una recompensa semanal!",
				ko: "주간 보상을 받아요!",
				uk: "Отримати щотижневу винагороду!",
				de: "Hol dir deine Wochenbelohnung!",
				it: "Riscuoti la ricompensa settimanale!",
				"pt-BR": "Resgate sua recompensa semanal!",
				pl: "Odbierz tygodniową nagrodę!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "pay",

			description: "Pay a user a certain amount!",
			description_localizations: {
				fr: "Payer à un utilisateur un certain montant",
				ja: "ユーザーに特定の金額を支払う！",
				ru: "Заплатить пользователю определенную сумму!",
				"es-ES": "Pagar a un usuario una cierta cantidad!",
				ko: "사용자에게 일정 금액을 지불해요!",
				uk: "Заплатити користувачу певну суму!",
				de: "Zahle einem Nutzer einen bestimmten Betrag!",
				it: "Paga una certa somma a un utente!",
				"pt-BR": "Pague uma certa quantia a um usuário!",
				pl: "Zapłać użytkownikowi określoną kwotę!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "amount",
					type: ApplicationCommandOptionType.Number,

					description:
						"The amount of money you want to donate to them",
					description_localizations: {
						fr: "Le montant d’argent que vous souhaitez lui donner",
						ja: "寄付したい金額",
						ru: "Сумма денег, которую вы хотите пожертвовать",
						"es-ES": "La cantidad de dinero que quieres donarles",
						ko: "기부할 금액",
						uk: "Сума грошей, яку ви хочете подарувати",
						de: "Der Geldbetrag, den du spenden willst",
						it: "La somma di denaro che vuoi donare",
						"pt-BR": "A quantia de dinheiro que você quer doar",
						pl: "Kwota, którą chcesz im podarować"
					},

					required: true,

					permission: null
				},
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "The member you want to donate the money",
					description_localizations: {
						fr: "Le membre à qui vous souhaitez donner de l'argent",
						ja: "お金を寄付したいメンバー",
						ru: "Участник, которому пожертвовать деньги",
						"es-ES": "El miembro al que quieres donar el dinero",
						ko: "돈을 기부할 멤버",
						uk: "Учасник, якому ви хочете подарувати гроші",
						de: "Das Mitglied, dem du Geld spenden willst",
						it: "Il membro a cui donare denaro",
						"pt-BR": "O membro a quem você quer doar dinheiro",
						pl: "Członek, któremu chcesz podarować pieniądze"
					},

					required: true,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "rob",

			description: "Rob a user!",
			description_localizations: {
				fr: "Volé de l'argent d'un utilisateur",
				ja: "ユーザーから奪う！",
				ru: "Ограбить пользователя!",
				"es-ES": "Robar a un usuario!",
				ko: "사용자의 돈을 훔쳐요!",
				uk: "Пограбувати користувача!",
				de: "Raube ein Mitglied aus!",
				it: "Deruba un utente!",
				"pt-BR": "Roube um usuário!",
				pl: "Okradnij użytkownika!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "member",
					type: ApplicationCommandOptionType.User,

					description: "the member you want to rob a money",
					description_localizations: {
						fr: "le membre à qui tu veux voler de l'argent",
						ja: "お金を奪いたいメンバー",
						ru: "участник, у которого вы хотите украсть деньги",
						"es-ES": "el miembro al que quieres robar dinero",
						ko: "돈을 훔칠 멤버",
						uk: "Учасник, якого ви хочете пограбувати",
						de: "Das Mitglied, das du ausrauben willst",
						it: "Il membro da derubare",
						"pt-BR": "O membro que você quer roubar",
						pl: "Członek do okradzenia"
					},

					required: true,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "withdraw",

			description: "Withdraw coin from your bank!",
			description_localizations: {
				fr: "Retirer des pièces de votre banque",
				ja: "銀行からコインを引き出す！",
				ru: "Снять монеты из банка!",
				"es-ES": "Retirar monedas de tu banco!",
				ko: "은행에서 코인을 출금해요!",
				uk: "Зняти монети з банківського рахунку!",
				de: "Hebt Münzen von deiner Bank ab!",
				it: "Preleva monete dalla tua banca!",
				"pt-BR": "Saque moedas do seu banco!",
				pl: "Wypłać monety ze swojego banku!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "how-much",
					type: ApplicationCommandOptionType.String,

					description:
						"How much coin you want to withdraw from your bank?",
					description_localizations: {
						fr: "Combien de pièces vous souhaitez retirer de votre banque",
						ja: "銀行からいくら引き出しますか？",
						ru: "Сколько монет вы хотите снять из банка?",
						"es-ES": "Cuántas monedas quieres retirar de tu banco?",
						ko: "은행에서 출금할 코인 수",
						uk: "Скільки монет ви хочете зняти з банку?",
						de: "Wie viele Münzen möchtest du abheben?",
						it: "Quante monete vuoi prelevare dalla banca?",
						"pt-BR": "Quantas moedas quer sacar do banco?",
						pl: "Ile monet chcesz wypłacić z banku?"
					},

					required: true,

					permission: null
				}
			],

			permission: null
		},
		{
			name: "work",

			description: "Claim a work reward!",
			description_localizations: {
				fr: "Réclamez une récompense de travail",
				ja: "仕事の報酬を獲得！",
				ru: "Получить награду за работу!",
				"es-ES": "Reclamar una recompensa de trabajo!",
				ko: "노동 보상을 받아요!",
				uk: "Отримати винагороду за роботу!",
				de: "Hol dir deine Arbeitsbelohnung!",
				it: "Riscuoti la ricompensa del lavoro!",
				"pt-BR": "Resgate sua recompensa de trabalho!",
				pl: "Odbierz nagrodę za pracę!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "role",
			prefixName: "ecrole",

			description: "Set a role for a certain amount of money!",
			description_localizations: {
				fr: "Définir un rôle pour un certain montant d'argent",
				ja: "特定の金額でロールを設定！",
				ru: "Установить роль за определенную сумму!",
				"es-ES": "Establecer un rol por una cierta cantidad de dinero!",
				ko: "일정 금액으로 살 수 있는 역할을 설정해요!",
				uk: "Налаштувати роль за певну суму грошей!",
				de: "Legt eine Rolle für einen bestimmten Geldbetrag fest!",
				it: "Imposta un ruolo per una certa somma di denaro!",
				"pt-BR": "Define um cargo para uma certa quantia de dinheiro!",
				pl: "Ustawia rolę za określoną kwotę!"
			},

			type: ApplicationCommandOptionType.SubcommandGroup,

			options: [
				{
					name: "add",
					prefixName: "economy-role-add",

					description: "Add a role for a certain amount of money!",
					description_localizations: {
						fr: "Ajouter un rôle pour un certain montant d'argent",
						ja: "特定の金額でロールを追加！",
						ru: "Добавить роль за определенную сумму!",
						"es-ES":
							"Añadir un rol por una cierta cantidad de dinero!",
						ko: "일정 금액에 판매할 역할을 추가해요!",
						uk: "Додати роль за певну суму грошей!",
						de: "Füge eine Rolle für einen bestimmten Betrag hinzu!",
						it: "Aggiungi un ruolo per una certa somma di denaro!",
						"pt-BR":
							"Adicione um cargo por uma certa quantia de dinheiro!",
						pl: "Dodaj rolę za określoną kwotę!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "role",
							type: ApplicationCommandOptionType.Role,

							description: "The role you want to add",
							description_localizations: {
								fr: "Le rôle que vous souhaitez ajouter",
								ja: "追加したいロール",
								ru: "Роль, которую вы хотите добавить",
								"es-ES": "El rol que quieres añadir",
								ko: "추가할 역할",
								uk: "Роль, яку ви хочете додати",
								de: "Die Rolle, die du hinzufügen willst",
								it: "Il ruolo da aggiungere",
								"pt-BR": "O cargo que você quer adicionar",
								pl: "Rola do dodania"
							},

							required: true,

							permission: null
						},
						{
							name: "amount",
							type: ApplicationCommandOptionType.Number,

							description: "The amount of money you want to add",
							description_localizations: {
								fr: "Le montant d'argent que vous souhaitez ajouter",
								ja: "追加したい金額",
								ru: "Сумма денег для добавления",
								"es-ES":
									"La cantidad de dinero que quieres añadir",
								ko: "추가할 금액",
								uk: "Сума грошей, яку ви хочете додати",
								de: "Der Geldbetrag, den du hinzufügen willst",
								it: "La somma di denaro da aggiungere",
								"pt-BR":
									"A quantia de dinheiro que você quer adicionar",
								pl: "Kwota, którą chcesz dodać"
							},

							required: true,

							permission: null
						}
					],

					permission: PermissionFlagsBits.ManageGuild
				},
				{
					name: "delete",
					prefixName: "economy-role-delete",

					description: "Delete a role for a certain amount of money!",
					description_localizations: {
						fr: "Supprimer un rôle pour un certain montant d'argent",
						ja: "特定の金額でロールを削除！",
						ru: "Удалить роль за определенную сумму!",
						"es-ES":
							"Eliminar un rol por una cierta cantidad de dinero!",
						ko: "판매 중인 역할을 삭제해요!",
						uk: "Видалити роль за певну суму грошей!",
						de: "Lösche eine Rolle für einen bestimmten Betrag!",
						it: "Elimina un ruolo per una certa somma di denaro!",
						"pt-BR":
							"Exclua um cargo por uma certa quantia de dinheiro!",
						pl: "Usuń rolę za określoną kwotę!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "role",
							type: ApplicationCommandOptionType.Role,

							description: "The role you want to delete",
							description_localizations: {
								fr: "Le rôle que vous souhaitez supprimer",
								ja: "削除したいロール",
								ru: "Роль, которую вы хотите удалить",
								"es-ES": "El rol que quieres eliminar",
								ko: "삭제할 역할",
								uk: "Роль, яку ви хочете видалити",
								de: "Die Rolle, die du löschen willst",
								it: "Il ruolo da eliminare",
								"pt-BR": "O cargo que você quer excluir",
								pl: "Rola do usunięcia"
							},

							required: true,

							permission: null
						}
					],

					permission: PermissionFlagsBits.ManageGuild
				},
				{
					name: "list",
					prefixName: "economy-role-list",

					description: "List all roles that you can buy!",
					description_localizations: {
						fr: "Liste de tous les rôles que vous pouvez acheter",
						ja: "購入可能な全ロールを一覧表示！",
						ru: "Показать все роли, которые можно купить!",
						"es-ES": "Listar todos los roles que puedes comprar!",
						ko: "구매할 수 있는 모든 역할 목록을 확인해요!",
						uk: "Показати всі ролі, які можна купити!",
						de: "Alle kaufbaren Rollen auflisten!",
						it: "Elenca tutti i ruoli che puoi comprare!",
						"pt-BR": "Liste todos os cargos que você pode comprar!",
						pl: "Wyświetl wszystkie role, które możesz kupić!"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: PermissionFlagsBits.ManageGuild
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "boost-set",
			prefixName: "economy-boost-set",

			description: "Set a money boost for a certain role!",
			description_localizations: {
				fr: "Définir un boost d'argent pour un certain rôle",
				ja: "特定のロールにマネーブーストを設定！",
				ru: "Установить денежный бонус для роли!",
				"es-ES": "Establecer un impulso de dinero para un cierto rol!",
				ko: "특정 역할의 돈 부스트를 설정해요!",
				uk: "Встановити грошовий бонус для певної ролі!",
				de: "Legt einen Geld-Boost für eine Rolle fest!",
				it: "Imposta un boost di denaro per un ruolo!",
				"pt-BR": "Define um bônus de dinheiro para um cargo!",
				pl: "Ustawia bonus pieniężny dla roli!"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "role",
					type: ApplicationCommandOptionType.Role,

					description: "The role you want to modify the boost",
					description_localizations: {
						fr: "Le rôle que vous souhaitez modifier le boost",
						ja: "ブーストを変更したいロール",
						ru: "Роль, для которой изменить бонус",
						"es-ES":
							"El rol para el que quieres modificar el impulso",
						ko: "부스트를 변경할 역할",
						uk: "Роль, для якої ви хочете змінити бонус",
						de: "Die Rolle, deren Boost du ändern willst",
						it: "Il ruolo di cui modificare il boost",
						"pt-BR": "O cargo cujo bônus você quer modificar",
						pl: "Rola, której bonus chcesz zmienić"
					},

					required: true,

					permission: null
				},
				{
					name: "boost",
					type: ApplicationCommandOptionType.String,

					description: "The boost you want to add",
					description_localizations: {
						fr: "Le boost que vous souhaitez ajouter",
						ja: "追加したいブースト",
						ru: "Бонус, который вы хотите добавить",
						"es-ES": "El impulso que quieres añadir",
						ko: "추가할 부스트",
						uk: "Бонус, який ви хочете додати",
						de: "Der Boost, den du hinzufügen willst",
						it: "Il boost da aggiungere",
						"pt-BR": "O bônus que você quer adicionar",
						pl: "Bonus, który chcesz dodać"
					},

					choices: [
						{
							name: "Default",
							name_localizations: {
								fr: "Défaut",
								ja: "default",
								ru: "default",
								"es-ES": "default",
								ko: "기본값",
								uk: "Типово",
								de: "Standard",
								it: "Predefinito",
								"pt-BR": "Padrão",
								pl: "Domyślne"
							},
							value: "1"
						},
						{
							name: "x2",
							name_localizations: {
								fr: "x2",
								ja: "x2",
								ru: "x2",
								"es-ES": "x2",
								ko: "x2",
								uk: "x2",
								de: "x2",
								it: "x2",
								"pt-BR": "x2",
								pl: "x2"
							},
							value: "2"
						},
						{
							name: "x3",
							name_localizations: {
								fr: "x3",
								ja: "x3",
								ru: "x3",
								"es-ES": "x3",
								ko: "x3",
								uk: "x3",
								de: "x3",
								it: "x3",
								"pt-BR": "x3",
								pl: "x3"
							},
							value: "3"
						},
						{
							name: "x4",
							name_localizations: {
								fr: "x4",
								ja: "x4",
								ru: "x4",
								"es-ES": "x4",
								ko: "x4",
								uk: "x4",
								de: "x4",
								it: "x4",
								"pt-BR": "x4",
								pl: "x4"
							},
							value: "4"
						},
						{
							name: "x5",
							name_localizations: {
								fr: "x5",
								ja: "x5",
								ru: "x5",
								"es-ES": "x5",
								ko: "x5",
								uk: "x5",
								de: "x5",
								it: "x5",
								"pt-BR": "x5",
								pl: "x5"
							},
							value: "5"
						}
					],

					required: true,

					permission: null
				}
			],

			permission: PermissionFlagsBits.ManageGuild
		},
		{
			name: "manage-rewards",

			description:
				"Manage how much money you can get from daily, weekly and monthly!",
			description_localizations: {
				fr: "Gérer combien d'argent vous pouvez obtenir quotidiennement, hebdomadairement et mensuellement",
				ja: "デイリー、ウィークリー、マンスリーで獲得できる金額を管理！",
				ru: "Управлять количеством денег, получаемых ежедневно, еженедельно и ежемесячно!",
				"es-ES":
					"Gestionar cuánto dinero puedes obtener de diario, semanal y mensual!",
				ko: "일간·주간·월간 보상 금액을 관리해요!",
				uk: "Керувати сумою щоденних, щотижневих і щомісячних винагород!",
				de: "Lege fest, wie viel Geld es täglich, wöchentlich und monatlich gibt!",
				it: "Gestisci quanto denaro ottieni da giornaliero, settimanale e mensile!",
				"pt-BR":
					"Gerencie quanto dinheiro você recebe no diário, semanal e mensal!",
				pl: "Zarządzaj kwotami nagród dziennych, tygodniowych i miesięcznych!"
			},

			type: ApplicationCommandOptionType.SubcommandGroup,
			options: [
				{
					name: "set-money",
					description:
						"Manage how much money you can get from daily, weekly and monthly!",
					description_localizations: {
						fr: "Gérer combien d'argent vous pouvez obtenir quotidiennement, hebdomadairement et mensuellement",
						ja: "デイリー、ウィークリー、マンスリーで獲得できる金額を管理！",
						ru: "Управлять количеством денег, получаемых ежедневно, еженедельно и ежемесячно!",
						"es-ES":
							"Gestionar cuánto dinero puedes obtener de diario, semanal y mensual!",
						ko: "일간·주간·월간 보상 금액을 관리해요!",
						uk: "Керувати сумою щоденних, щотижневих і щомісячних винагород!",
						de: "Lege fest, wie viel Geld es täglich, wöchentlich und monatlich gibt!",
						it: "Gestisci quanto denaro ottieni da giornaliero, settimanale e mensile!",
						"pt-BR":
							"Gerencie quanto dinheiro você recebe no diário, semanal e mensal!",
						pl: "Zarządzaj kwotami nagród dziennych, tygodniowych i miesięcznych!"
					},
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "type",
							type: ApplicationCommandOptionType.String,
							description: "The type of reward you want to set",
							description_localizations: {
								fr: "Le type de récompense que vous souhaitez définir",
								ja: "設定したい報酬の種類",
								ru: "Тип награды, которую вы хотите установить",
								"es-ES":
									"El tipo de recompensa que quieres establecer",
								ko: "설정할 보상 종류",
								uk: "Тип винагороди, яку ви хочете налаштувати",
								de: "Die Art der Belohnung, die du festlegen willst",
								it: "Il tipo di ricompensa da impostare",
								"pt-BR":
									"O tipo de recompensa que você quer definir",
								pl: "Rodzaj nagrody do ustawienia"
							},
							choices: [
								{
									name: "Daily",
									name_localizations: {
										fr: "Quotidien",
										ja: "daily",
										ru: "daily",
										"es-ES": "daily",
										ko: "일간",
										uk: "Щоденна",
										de: "Täglich",
										it: "Giornaliero",
										"pt-BR": "Diário",
										pl: "Dziennie"
									},
									value: "daily"
								},
								{
									name: "Weekly",
									name_localizations: {
										fr: "Hebdomadaire",
										ja: "weekly",
										ru: "weekly",
										"es-ES": "weekly",
										ko: "주간",
										uk: "Щотижнева",
										de: "Wöchentlich",
										it: "Settimanale",
										"pt-BR": "Semanal",
										pl: "Tygodniowo"
									},
									value: "weekly"
								},
								{
									name: "Monthly",
									name_localizations: {
										fr: "Mensuel",
										ja: "monthly",
										ru: "monthly",
										"es-ES": "monthly",
										ko: "월간",
										uk: "Щомісячна",
										de: "Monatlich",
										it: "Mensile",
										"pt-BR": "Mensal",
										pl: "Miesięcznie"
									},
									value: "monthly"
								}
							],
							required: true,

							permission: null
						},
						{
							name: "how-much",
							type: ApplicationCommandOptionType.Number,
							description: "How much money you want to set",
							description_localizations: {
								fr: "Combien d'argent vous souhaitez définir",
								ja: "設定したい金額",
								ru: "Сколько денег вы хотите установить",
								"es-ES": "Cuánto dinero quieres establecer",
								ko: "설정할 금액",
								uk: "Яку суму грошей ви хочете встановити",
								de: "Welchen Betrag möchtest du festlegen?",
								it: "Quanto denaro vuoi impostare",
								"pt-BR": "Quanto dinheiro quer definir",
								pl: "Jaką kwotę chcesz ustawić"
							},
							required: true,

							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				},
				{
					name: "set-cooldown",
					description: "Manage the cooldown of the actions!",
					description_localizations: {
						fr: "Gérer le temps de recharge des actions",
						ja: "アクションのクールダウンを管理！",
						ru: "Управление задержкой действий!",
						"es-ES": "Gestionar el enfriamiento de las acciones!",
						ko: "작업 쿨다운을 관리해요!",
						uk: "Керувати затримкою дій!",
						de: "Wartezeiten der Aktionen verwalten!",
						it: "Gestisci il tempo di attesa delle azioni!",
						"pt-BR": "Gerencie o tempo de espera das ações!",
						pl: "Zarządzaj czasem oczekiwania akcji!"
					},
					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "type",
							type: ApplicationCommandOptionType.String,
							description:
								"Les actions que vous souhaitez définir",
							description_localizations: {
								fr: "Les actions que vous souhaitez définir",
								ja: "設定したいアクション",
								ru: "Действия, которые вы хотите определить",
								"es-ES": "Las acciones que deseas definir",
								ko: "설정할 작업",
								uk: "Дії, які ви хочете налаштувати",
								de: "Die Aktionen, die du festlegen möchtest",
								it: "Le azioni che vuoi definire",
								"pt-BR": "As ações que você quer definir",
								pl: "Akcje, które chcesz ustawić"
							},
							choices: [
								{
									name: "Rob",
									name_localizations: {
										fr: "Voler",
										ja: "rob",
										ru: "rob",
										"es-ES": "rob",
										ko: "강탈",
										uk: "Пограбування",
										de: "Ausrauben",
										it: "Rapina",
										"pt-BR": "Roubar",
										pl: "Okradnij"
									},
									value: "rob"
								},
								{
									name: "Work",
									name_localizations: {
										fr: "Travailler",
										ja: "work",
										ru: "work",
										"es-ES": "work",
										ko: "일하기",
										uk: "Робота",
										de: "Arbeiten",
										it: "Lavora",
										"pt-BR": "Trabalhar",
										pl: "Pracuj"
									},
									value: "work"
								}
							],
							required: true,
							permission: null
						},
						{
							name: "time",
							type: ApplicationCommandOptionType.String,
							description: "The time you want to set",
							description_localizations: {
								fr: "Le temps que vous souhaitez définir",
								ja: "設定したい時間",
								ru: "Время, которое вы хотите установить",
								"es-ES": "El tiempo que quieres establecer",
								ko: "설정할 시간",
								uk: "Час, який ви хочете встановити",
								de: "Die Zeit, die du festlegen willst",
								it: "Il tempo da impostare",
								"pt-BR": "O tempo que você quer definir",
								pl: "Czas do ustawienia"
							},
							required: true,
							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				}
			],

			permission: null
		},
		{
			name: "shop",
			prefixName: "shop",

			description: "Get the shop of the guild!",
			description_localizations: {
				fr: "Obtenez le magasin du serveur",
				ja: "サーバーのショップを取得！",
				ru: "Получить магазин сервера!",
				"es-ES": "Obtener la tienda del servidor!",
				ko: "서버 상점을 확인해요!",
				uk: "Відкрити магазин сервера!",
				de: "Zeige den Shop des Servers!",
				it: "Ottieni il negozio del server!",
				"pt-BR": "Veja a loja do servidor!",
				pl: "Pokaż sklep serwera!"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: null
		},
		{
			name: "ureset",
			prefixName: "economy-ureset",

			description: "Reset the balance of an user",
			description_localizations: {
				fr: "Supprimer les données économique d'un utilisateur",
				ja: "ユーザーの残高をリセット",
				ru: "Сбросить баланс пользователя",
				"es-ES": "Restablecer el saldo de un usuario",
				ko: "사용자의 잔액을 초기화해요",
				uk: "Скинути баланс користувача",
				de: "Guthaben eines Nutzers zurücksetzen",
				it: "Azzera il saldo di un utente",
				"pt-BR": "Redefinir o saldo de um usuário",
				pl: "Zresetuj saldo użytkownika"
			},

			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: "user",
					type: ApplicationCommandOptionType.User,

					description: "The user you want to reset the economy data",
					description_localizations: {
						fr: "L'utilisateur que vous voulez supprimer du module d'économie.",
						ja: "経済データをリセットしたいユーザー",
						ru: "Пользователь, чьи экономические данные нужно сбросить",
						"es-ES":
							"El usuario al que quieres restablecer los datos de economía",
						ko: "경제 데이터를 초기화할 사용자",
						uk: "Користувач, чиї дані економіки ви хочете скинути",
						de: "Das Mitglied, dessen Wirtschaftsdaten zurückgesetzt werden",
						it: "L'utente di cui azzerare i dati dell'economia",
						"pt-BR":
							"O usuário cujos dados de economia serão redefinidos",
						pl: "Użytkownik, któremu zresetować dane ekonomii"
					},

					required: true,
					permission: null
				}
			],

			permission: PermissionFlagsBits.Administrator
		},
		{
			name: "greset",
			prefixName: "economy-greset",

			description: "Reset the economy balance of every user in the guild",
			description_localizations: {
				fr: "Supprimer les données économique de tout les utilisateur",
				ja: "サーバー内の全ユーザーの経済残高をリセット",
				ru: "Сбросить баланс всех пользователей на сервере",
				"es-ES":
					"Restablecer el saldo de economía de todos los usuarios del servidor",
				ko: "서버 모든 사용자의 경제 잔액을 초기화해요",
				uk: "Скинути баланс економіки всіх користувачів сервера",
				de: "Setzt das Wirtschaftsguthaben aller Mitglieder des Servers zurück",
				it: "Reimposta il saldo dell'economia di tutti gli utenti del server",
				"pt-BR":
					"Redefine o saldo da economia de todos os usuários do servidor",
				pl: "Resetuje saldo ekonomii wszystkich użytkowników serwera"
			},

			type: ApplicationCommandOptionType.Subcommand,

			permission: PermissionFlagsBits.Administrator
		}
	],
	thinking: false,
	category: "economy",
	type: ApplicationCommandType.ChatInput,
	permission: null
};
