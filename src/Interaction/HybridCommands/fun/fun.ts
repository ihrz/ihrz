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
	APIApplicationCommandPermissionsConstant,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	PermissionFlagsBits
} from "discord.js";

import { Command } from "../../../../types/command.js";

function to(x: number) {
	const result = [];
	for (let i = 1; i <= x; i++) {
		result.push({
			name: `Amount: ${i}`,
			name_localizations: {
				fr: `Nombre: ${i}`,
				ja: "amount_i",
				ru: "amount_i",
				"es-ES": "amount_i",
				ko: `수량: ${i}`,
				uk: `Кількість: ${i}`
			},
			value: `${i}`
		});
	}
	return result;
}

export const command: Command = {
	name: "fun",
	name_localizations: {
		fr: "fun",
		ja: "fun",
		ru: "fun",
		"es-ES": "fun",
		ko: "fun",
		uk: "fun"
	},

	description: "Subcommand for fun category!",
	description_localizations: {
		fr: "Commande sous-groupé pour la catégorie d'amusement",
		ja: "Funカテゴリのサブコマンド！",
		ru: "Подкоманда для категории развлечений!",
		"es-ES": "Subcomando para la categoría de diversión!",
		ko: "재미 하위 명령어!",
		uk: "Підкоманда категорії розваг!"
	},

	options: [
		{
			name: "animals",
			name_localizations: {
				fr: "animaux",
				ja: "animals",
				ru: "animals",
				"es-ES": "animals",
				ko: "animals",
				uk: "animals"
			},

			description: "Fun commands related to animals",
			description_localizations: {
				fr: "commande liée au animaux",
				ja: "動物関連のFunコマンド",
				ru: "Развлекательные команды с животными",
				"es-ES": "Comandos divertidos relacionados con animales",
				ko: "동물 관련 재미 명령어",
				uk: "Розважальні команди про тварин"
			},

			options: [
				{
					name: "cat",
					name_localizations: {
						fr: "chat",
						ja: "cat",
						ru: "cat",
						"es-ES": "cat",
						ko: "cat",
						uk: "cat"
					},

					description: "Get a picture of cat!",
					description_localizations: {
						fr: "Obtenez une photo du chat",
						ja: "猫の画像を取得！",
						ru: "Получить картинку кота!",
						"es-ES": "Obtener una imagen de un gato!",
						ko: "고양이 사진을 받아요!",
						uk: "Отримати фото кота!"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: null
				},
				{
					name: "dog",
					name_localizations: {
						fr: "chien",
						ja: "dog",
						ru: "dog",
						"es-ES": "dog",
						ko: "dog",
						uk: "dog"
					},

					description: "Get a picture of dog!",
					description_localizations: {
						fr: "Obtenez une photo du chien",
						ja: "犬の画像を取得！",
						ru: "Получить картинку собаки!",
						"es-ES": "Obtener una imagen de un perro!",
						ko: "강아지 사진을 받아요!",
						uk: "Отримати фото собаки!"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: null
				},
				{
					name: "duck",
					name_localizations: {
						fr: "cannard",
						ja: "duck",
						ru: "duck",
						"es-ES": "duck",
						ko: "duck",
						uk: "duck"
					},

					description: "Get a picture of duck!",
					description_localizations: {
						fr: "Obtenez une photo de cannard",
						ja: "アヒルの画像を取得！",
						ru: "Получить картинку утки!",
						"es-ES": "Obtener una imagen de un pato!",
						ko: "오리 사진을 받아요!",
						uk: "Отримати фото качки!"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: null
				},
				{
					name: "panda",

					description: "Get a picture of panda!",
					description_localizations: {
						fr: "Obtenez une photo de panda",
						ja: "パンダの画像を取得！",
						ru: "Получить картинку панды!",
						"es-ES": "Obtener una imagen de un panda!",
						ko: "판다 사진을 받아요!",
						uk: "Отримати фото панди!"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: null
				},
				{
					name: "fox",

					description: "Get a picture of fox!",
					description_localizations: {
						fr: "Obtenez une photo de renard",
						ja: "キツネの画像を取得！",
						ru: "Получить картинку лисы!",
						"es-ES": "Obtener una imagen de un zorro!",
						ko: "여우 사진을 받아요!",
						uk: "Отримати фото лисиці!"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: null
				},
				{
					name: "dolphin",

					description: "Get a picture of dolphin!",
					description_localizations: {
						fr: "Obtenez une photo de dauphin",
						ja: "イルカの画像を取得！",
						ru: "Получить картинку дельфина!",
						"es-ES": "Obtener una imagen de un delfín!",
						ko: "돌고래 사진을 받아요!",
						uk: "Отримати фото дельфіна!"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: null
				},
				{
					name: "frog",

					description: "Get a picture of frog!",
					description_localizations: {
						fr: "Obtenez une photo de grenouille",
						ja: "カエルの画像を取得！",
						ru: "Получить картинку лягушки!",
						"es-ES": "Obtener una imagen de una rana!",
						ko: "개구리 사진을 받아요!",
						uk: "Отримати фото жаби!"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: null
				},
				{
					name: "squirrel",

					description: "Get a picture of squirrel!",
					description_localizations: {
						fr: "Obtenez une photo d'Écureuil",
						ja: "リスの画像を取得！",
						ru: "Получить картинку белки!",
						"es-ES": "Obtener una imagen de una ardilla!",
						ko: "다람쥐 사진을 받아요!",
						uk: "Отримати фото білки!"
					},

					type: ApplicationCommandOptionType.Subcommand,

					permission: null
				}
			],
			type: ApplicationCommandOptionType.SubcommandGroup,
			permission: null
		},
		{
			name: "image",

			description: "Fun commands related about image",
			description_localizations: {
				fr: "Commande lié à des manipulation d'image",
				ja: "画像関連のFunコマンド",
				ru: "Развлекательные команды с изображениями",
				"es-ES": "Comandos divertidos relacionados con imágenes",
				ko: "이미지 관련 재미 명령어",
				uk: "Розважальні команди із зображеннями"
			},

			options: [
				{
					name: "catsay",
					name_localizations: {
						fr: "le-chat-à-dis",
						ja: "catsay",
						ru: "catsay",
						"es-ES": "catsay",
						ko: "catsay",
						uk: "catsay"
					},

					description: "Cat say (insert text here)",
					description_localizations: {
						fr: "le chat à dit (insérer le texte ici)",
						ja: "猫が言う（ここにテキストを入力）",
						ru: "Кот говорит (вставьте текст)",
						"es-ES": "El gato dice (insertar texto aquí)",
						ko: "고양이가 말해요 (여기에 텍스트 입력)",
						uk: "Кіт каже (введіть текст тут)"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "text",

							description: "The cat say...",
							description_localizations: {
								fr: "Le chat dit...",
								ja: "猫が言う...",
								ru: "Кот говорит...",
								"es-ES": "El gato dice...",
								ko: "고양이가 말하길...",
								uk: "Кіт каже..."
							},

							required: true,
							type: ApplicationCommandOptionType.String,

							permission: null
						}
					],

					permission: null
				},
				{
					name: "togif",

					description: "Transform image to gif",
					description_localizations: {
						fr: "Transformer une image vers un gif",
						ja: "画像をGIFに変換",
						ru: "Преобразовать изображение в GIF",
						"es-ES": "Transformar imagen a gif",
						ko: "이미지를 GIF로 바꿔요",
						uk: "Перетворити зображення на GIF"
					},

					options: [
						{
							name: "image",

							description: "image file",
							description_localizations: {
								fr: "fichier image",
								ja: "画像ファイル",
								ru: "файл изображения",
								"es-ES": "archivo de imagen",
								ko: "이미지 파일",
								uk: "Файл зображення"
							},

							permission: null,
							type: ApplicationCommandOptionType.Attachment,
							required: true
						}
					],

					type: ApplicationCommandOptionType.Subcommand,

					permission: null
				},
				{
					name: "captions",

					description: "Add text on top of your own image",
					description_localizations: {
						fr: "ajouter du texte au dessus de votre image",
						ja: "自分の画像の上にテキストを追加",
						ru: "Добавить текст поверх вашего изображения",
						"es-ES": "Añadir texto encima de tu propia imagen",
						ko: "이미지 위에 텍스트를 추가해요",
						uk: "Додати текст поверх власного зображення"
					},

					options: [
						{
							name: "image",

							description: "image file",
							description_localizations: {
								fr: "fichier image",
								ja: "画像ファイル",
								ru: "файл изображения",
								"es-ES": "archivo de imagen",
								ko: "이미지 파일",
								uk: "Файл зображення"
							},

							permission: null,
							type: ApplicationCommandOptionType.Attachment,
							required: true
						},
						{
							name: "query",

							description: "your captions",
							description_localizations: {
								fr: "votre texte",
								ja: "あなたの字幕",
								ru: "ваши подписи",
								"es-ES": "tus subtítulos",
								ko: "캡션",
								uk: "Ваші підписи"
							},

							permission: null,
							type: ApplicationCommandOptionType.String,
							required: true
						}
					],

					type: ApplicationCommandOptionType.Subcommand,

					permission: null
				},
				{
					name: "bubbles",

					description: "Add bubble on top of your own image",
					description_localizations: {
						fr: "ajouter une bulle au dessus de votre image",
						ja: "自分の画像の上に吹き出しを追加",
						ru: "Добавить пузырек поверх вашего изображения",
						"es-ES": "Añadir burbuja encima de tu propia imagen",
						ko: "이미지 위에 말풍선을 추가해요",
						uk: "Додати бульбашку поверх власного зображення"
					},

					options: [
						{
							name: "image",

							description: "image file",
							description_localizations: {
								fr: "fichier image",
								ja: "画像ファイル",
								ru: "файл изображения",
								"es-ES": "archivo de imagen",
								ko: "이미지 파일",
								uk: "Файл зображення"
							},

							permission: null,
							type: ApplicationCommandOptionType.Attachment,
							required: true
						}
					],

					type: ApplicationCommandOptionType.Subcommand,

					permission: null
				},
				{
					name: "youtube",

					description:
						"Permit to send custom youtube comment (real) !",
					description_localizations: {
						fr: "Permis d'envoyer un commentaire YouTube personnalisé (réel)",
						ja: "カスタムYouTubeコメントを送信可能に（実際のコメント）！",
						ru: "Разрешить отправку пользовательского комментария YouTube (настоящего)!",
						"es-ES":
							"Permitir enviar comentario personalizado de YouTube (real)!",
						ko: "맞춤 YouTube 댓글을 보내요 (진짜)!",
						uk: "Створити власний коментар YouTube (справжній)!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "user",

							description: "The user",
							description_localizations: {
								fr: "L'utilisateur",
								ja: "ユーザー",
								ru: "Пользователь",
								"es-ES": "El usuario",
								ko: "사용자",
								uk: "Користувач"
							},

							required: true,
							type: ApplicationCommandOptionType.User,

							permission: null
						},
						{
							name: "comment",

							description: "The comment",
							description_localizations: {
								fr: "Le commentaire",
								ja: "コメント",
								ru: "Комментарий",
								"es-ES": "El comentario",
								ko: "코멘트",
								uk: "Коментар"
							},

							required: true,
							type: ApplicationCommandOptionType.String,

							permission: null
						}
					],

					permission: null
				},
				{
					name: "tweet",

					description: "Permit to send custom tweet !",
					description_localizations: {
						fr: "Permis d'envoyer un tweet personnalisé",
						ja: "カスタムツイートを送信可能に！",
						ru: "Разрешить отправку пользовательского твита!",
						"es-ES": "Permitir enviar tweet personalizado!",
						ko: "맞춤 트윗을 보내요!",
						uk: "Створити власний твіт!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "user",

							description: "The user",
							description_localizations: {
								fr: "L'utilisateur",
								ja: "ユーザー",
								ru: "Пользователь",
								"es-ES": "El usuario",
								ko: "사용자",
								uk: "Користувач"
							},

							required: true,
							type: ApplicationCommandOptionType.User,

							permission: null
						},
						{
							name: "comment",

							description: "The comment",
							description_localizations: {
								fr: "Le commentaire",
								ja: "コメント",
								ru: "Комментарий",
								"es-ES": "El comentario",
								ko: "코멘트",
								uk: "Коментар"
							},

							required: true,
							type: ApplicationCommandOptionType.String,

							permission: null
						}
					],

					permission: null
				},
				{
					name: "transgender",
					name_localizations: {
						fr: "transgenre",
						ja: "transgender",
						ru: "transgender",
						"es-ES": "transgender",
						ko: "transgender",
						uk: "transgender"
					},

					description: "all humans have rights",
					description_localizations: {
						fr: "tous les humains ont des droits",
						ja: "全ての人間には権利がある",
						ru: "все люди имеют права",
						"es-ES": "todos los humanos tienen derechos",
						ko: "모든 인간에게는 권리가 있다",
						uk: "Усі люди мають права"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "user",

							description: "the user",
							description_localizations: {
								fr: "l'utilisateur",
								ja: "ユーザー",
								ru: "пользователь",
								"es-ES": "el usuario",
								ko: "사용자",
								uk: "Користувач"
							},

							required: false,
							type: ApplicationCommandOptionType.User,

							permission: null
						}
					],

					permission: null
				}
			],

			type: ApplicationCommandOptionType.SubcommandGroup,
			permission: null
		},
		{
			name: "interaction",

			description: "Interaction between users",
			description_localizations: {
				fr: "Interaction entre utilisateurs",
				ja: "ユーザー間の交流",
				ru: "Взаимодействие между пользователями",
				"es-ES": "Interacción entre usuarios",
				ko: "사용자 간 상호작용",
				uk: "Взаємодія між користувачами"
			},

			options: [
				{
					name: "67",
					name_localizations: {
						fr: "67",
						ja: "67",
						ru: "67",
						"es-ES": "67",
						ko: "67",
						uk: "67"
					},

					description: "Send a 67 gif",
					description_localizations: {
						fr: "envoi un meme 67",
						ja: "67のGIFを送信",
						ru: "Отправить гифку 67",
						"es-ES": "Enviar un gif de 67",
						ko: "67 GIF를 보내요",
						uk: "Надіслати GIF 67"
					},

					type: ApplicationCommandOptionType.Subcommand,
					permission: null
				},
				{
					name: "hack",
					name_localizations: {
						fr: "piratage",
						ja: "hack",
						ru: "hack",
						"es-ES": "hack",
						ko: "hack",
						uk: "hack"
					},

					description: "Hack a user!",
					description_localizations: {
						fr: "Pirater un discordiens",
						ja: "ユーザーをハッキング！",
						ru: "Взломать пользователя!",
						"es-ES": "Hackear a un usuario!",
						ko: "사용자를 해킹해요!",
						uk: "Зламати користувача!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "user",
							type: ApplicationCommandOptionType.User,

							description: "The user you want to hack",
							description_localizations: {
								fr: "L'utilisateur que vous souhaitez pirater",
								ja: "ハッキングしたいユーザー",
								ru: "Пользователь, которого вы хотите взломать",
								"es-ES": "El usuario que quieres hackear",
								ko: "해킹할 사용자",
								uk: "Користувач, якого ви хочете зламати"
							},

							required: true,

							permission: null
						}
					],

					permission: null
				},
				{
					name: "kiss",
					name_localizations: {
						fr: "bisous",
						ja: "kiss",
						ru: "kiss",
						"es-ES": "kiss",
						ko: "kiss",
						uk: "kiss"
					},

					description: "Kiss a user!",
					description_localizations: {
						fr: "Embrasser un utilisateur",
						ja: "ユーザーにキス！",
						ru: "Поцеловать пользователя!",
						"es-ES": "Besar a un usuario!",
						ko: "사용자에게 뽀뽀해요!",
						uk: "Поцілувати користувача!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "user",
							type: ApplicationCommandOptionType.User,

							description: "The user you want to kiss",
							description_localizations: {
								fr: "L'utilisateur que vous voulez embrasser",
								ja: "キスしたいユーザー",
								ru: "Пользователь, которого вы хотите поцеловать",
								"es-ES": "El usuario que quieres besar",
								ko: "뽀뽀할 사용자",
								uk: "Користувач, якого ви хочете поцілувати"
							},

							required: true,

							permission: null
						}
					],

					permission: null
				},
				{
					name: "love",
					name_localizations: {
						fr: "amour",
						ja: "love",
						ru: "love",
						"es-ES": "love",
						ko: "love",
						uk: "love"
					},

					description: "Show your love compatibilty with the user!",
					description_localizations: {
						fr: "Montrez votre compatibilité amoureuse avec l'utilisateur",
						ja: "ユーザーとの恋愛相性を表示！",
						ru: "Показать совместимость в любви с пользователем!",
						"es-ES":
							"Mostrar tu compatibilidad amorosa con el usuario!",
						ko: "사용자와의 사랑 궁합을 보여줘요!",
						uk: "Показати вашу любовну сумісність із користувачем!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "user1",
							type: ApplicationCommandOptionType.User,

							description:
								"The user you want to know your love compatibility",
							description_localizations: {
								fr: "L'utilisateur avec qui vous souhaitez connaître votre compatibilité amoureuse",
								ja: "恋愛相性を知りたいユーザー",
								ru: "Пользователь для проверки совместимости в любви",
								"es-ES":
									"El usuario con quien quieres conocer tu compatibilidad amorosa",
								ko: "사랑 궁합을 볼 사용자",
								uk: "Користувач, з яким ви хочете дізнатися любовну сумісність"
							},

							required: false,

							permission: null
						},
						{
							name: "user2",
							type: ApplicationCommandOptionType.User,

							description:
								"The user with whom you want to know love compatibility",
							description_localizations: {
								fr: "L'utilisateur avec qui vous voulez connaître la compatibilité amoureuse",
								ja: "恋愛相性を知りたい相手のユーザー",
								ru: "Пользователь, с которым вы хотите узнать совместимость в любви",
								"es-ES":
									"El usuario con quien quieres saber la compatibilidad amorosa",
								ko: "사랑 궁합을 볼 사용자",
								uk: "Користувач, з яким ви хочете дізнатися любовну сумісність"
							},

							required: false,

							permission: null
						}
					],

					permission: null
				},
				{
					name: "poll",
					name_localizations: {
						fr: "sondage",
						ja: "poll",
						ru: "poll",
						"es-ES": "poll",
						ko: "poll",
						uk: "poll"
					},

					description: "Create a poll!",
					description_localizations: {
						fr: "Créer un sondage",
						ja: "投票を作成！",
						ru: "Создать опрос!",
						"es-ES": "Crear una encuesta!",
						ko: "투표를 만들어요!",
						uk: "Створити опитування!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "message",
							type: ApplicationCommandOptionType.String,

							description: "The message displayed on the survey",
							description_localizations: {
								fr: "Le message affiché sur le sondage",
								ja: "アンケートに表示されるメッセージ",
								ru: "Сообщение, отображаемое в опросе",
								"es-ES": "El mensaje mostrado en la encuesta",
								ko: "투표에 표시할 메시지",
								uk: "Повідомлення, що показується в опитуванні"
							},

							required: true,

							permission: null
						}
					],

					permission: PermissionFlagsBits.Administrator
				},
				{
					name: "question",

					description: "Ask a question to the bot !",
					description_localizations: {
						fr: "Poser une question au bot",
						ja: "ボットに質問する！",
						ru: "Задать вопрос боту!",
						"es-ES": "Hacer una pregunta al bot!",
						ko: "봇에게 질문해요!",
						uk: "Поставити питання боту!"
					},

					aliases: ["8ball"],

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "question",
							type: ApplicationCommandOptionType.String,

							description:
								"The question you want to give for the bot",
							description_localizations: {
								fr: "La question que vous souhaitez poser au bot",
								ja: "ボットに与えたい質問",
								ru: "Вопрос, который вы хотите задать боту",
								"es-ES": "La pregunta que quieres dar al bot",
								ko: "봇에게 할 질문",
								uk: "Питання, яке ви хочете поставити боту"
							},

							required: true,

							permission: null
						}
					],

					permission: null
				},
				{
					name: "slap",
					name_localizations: {
						fr: "giflé",
						ja: "slap",
						ru: "slap",
						"es-ES": "slap",
						ko: "slap",
						uk: "slap"
					},

					description: "Slap a user!",
					description_localizations: {
						fr: "Gifler un utilisateur",
						ja: "ユーザーを平手打ち！",
						ru: "Дать пощечину пользователю!",
						"es-ES": "Abofetear a un usuario!",
						ko: "사용자를 때려요!",
						uk: "Дати ляпаса користувачу!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "user",
							type: ApplicationCommandOptionType.User,

							description: "The user you want to slap",
							description_localizations: {
								fr: "L'utilisateur que vous voulez gifler",
								ja: "平手打ちしたいユーザー",
								ru: "Пользователь, которому вы хотите дать пощечину",
								"es-ES": "El usuario que quieres abofetear",
								ko: "때릴 사용자",
								uk: "Користувач, якому ви хочете дати ляпаса"
							},

							required: true,

							permission: null
						}
					],

					permission: null
				},

				{
					name: "hug",
					name_localizations: {
						fr: "calin",
						ja: "hug",
						ru: "hug",
						"es-ES": "hug",
						ko: "hug",
						uk: "hug"
					},

					description: "Hug a user!",
					description_localizations: {
						fr: "Faire un calin d'un utilisateur",
						ja: "ユーザーをハグ！",
						ru: "Обнять пользователя!",
						"es-ES": "Abrazar a un usuario!",
						ko: "사용자를 안아 줘요!",
						uk: "Обійняти користувача!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "user",
							type: ApplicationCommandOptionType.User,

							description: "The user you want to hug",
							description_localizations: {
								fr: "L'utilisateur que vous souhaitez faire un calin",
								ja: "ハグしたいユーザー",
								ru: "Пользователь, которого вы хотите обнять",
								"es-ES": "El usuario que quieres abrazar",
								ko: "안아 줄 사용자",
								uk: "Користувач, якого ви хочете обійняти"
							},

							required: true,

							permission: null
						}
					],

					permission: null
				}
			],

			type: ApplicationCommandOptionType.SubcommandGroup,
			permission: null
		},
		{
			name: "style",

			description: "Fun commands related about text style",
			description_localizations: {
				fr: "Commandes fun à propos de la stylisation du texte",
				ja: "テキストスタイル関連のFunコマンド",
				ru: "Развлекательные команды со стилями текста",
				"es-ES":
					"Comandos divertidos relacionados con estilos de texto",
				ko: "텍스트 스타일 관련 재미 명령어",
				uk: "Розважальні команди зі стилем тексту"
			},

			options: [
				{
					name: "caracteres",
					name_localizations: {
						fr: "caractères",
						ja: "caracteres",
						ru: "caracteres",
						"es-ES": "caracteres",
						ko: "caracteres",
						uk: "caracteres"
					},

					description: "Transform a string into a DarkSasuke!",
					description_localizations: {
						fr: "Transformez une chaîne de caractères en DarkSasuke",
						ja: "文字列をDarkSasukeに変換！",
						ru: "Преобразовать строку в DarkSasuke!",
						"es-ES": "Transformar una cadena en DarkSasuke!",
						ko: "문자열을 DarkSasuke 스타일로 바꿔요!",
						uk: "Перетворити рядок на стиль DarkSasuke!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "nickname",
							type: ApplicationCommandOptionType.String,

							description: "your cool nickname to transform !",
							description_localizations: {
								fr: "ton surnom cool à transformer",
								ja: "変換したいクールなニックネーム！",
								ru: "ваш крутой ник для преобразования!",
								"es-ES": "tu apodo genial para transformar!",
								ko: "변환할 멋진 별명!",
								uk: "Ваш крутий нікнейм для перетворення!"
							},

							required: true,

							permission: null
						}
					],

					permission: null
				},
				{
					name: "morse",

					description: "Transform a string into a Morse!",
					description_localizations: {
						fr: "Transformer une chaîne en Morse",
						ja: "文字列をモールス信号に変換！",
						ru: "Преобразовать строку в азбуку Морзе!",
						"es-ES": "Transformar una cadena en Morse!",
						ko: "문자열을 모스 부호로 바꿔요!",
						uk: "Перетворити рядок на азбуку Морзе!"
					},

					type: ApplicationCommandOptionType.Subcommand,
					options: [
						{
							name: "input",
							type: ApplicationCommandOptionType.String,

							description:
								"Enter your input to encrypt/decrypt in morse",
							description_localizations: {
								fr: "Entrez votre entrée pour crypter/décrypter en morse",
								ja: "モールス信号で暗号化/復号化する入力を入力",
								ru: "Введите текст для шифрования/дешифрования азбукой Морзе",
								"es-ES":
									"Ingresa tu entrada para encriptar/desencriptar en morse",
								ko: "모스 부호로 암호화/복호화할 내용을 입력하세요",
								uk: "Введіть текст для шифрування/розшифрування азбукою Морзе"
							},

							required: true,

							permission: null
						}
					],

					permission: null
				}
			],

			type: ApplicationCommandOptionType.SubcommandGroup,
			permission: null
		},
		{
			name: "random",
			name_localizations: {
				fr: "hasard",
				ja: "random",
				ru: "random",
				"es-ES": "random",
				ko: "random",
				uk: "random"
			},

			description: "Fun slash related to luck (chance)",
			description_localizations: {
				fr: "Commande liée au hasard",
				ja: "運（確率）関連のFunコマンド",
				ru: "Развлекательные команды, связанные с удачей",
				"es-ES":
					"Comandos divertidos relacionados con la suerte (azar)",
				ko: "운(확률) 관련 재미 슬래시 명령어",
				uk: "Розважальні команди на удачу (шанс)"
			},

			options: [
				{
					name: "dice",
					name_localizations: {
						fr: "dé",
						ja: "dice",
						ru: "dice",
						"es-ES": "dice",
						ko: "dice",
						uk: "dice"
					},

					description: "Make a dice roll",
					description_localizations: {
						fr: "Lance un ou plusieurs dés",
						ja: "サイコロを振る",
						ru: "Бросить кости",
						"es-ES": "Hacer una tirada de dado",
						ko: "주사위를 굴려요",
						uk: "Кинути кубик"
					},

					aliases: ["dé"],

					options: [
						{
							name: "number",
							name_localizations: {
								fr: "nombre",
								ja: "number",
								ru: "number",
								"es-ES": "number",
								ko: "number",
								uk: "number"
							},

							description: "Number of dice to roll",
							description_localizations: {
								fr: "Nombre de dés à lancer",
								ja: "振るサイコロの数",
								ru: "Количество костей",
								"es-ES": "Número de dados a lanzar",
								ko: "굴릴 주사위 개수",
								uk: "Кількість кубиків для кидка"
							},

							choices: to(7),

							type: ApplicationCommandOptionType.Number,
							permission: null
						},
						{
							name: "faces",
							name_localizations: {
								fr: "faces",
								ja: "faces",
								ru: "faces",
								"es-ES": "faces",
								ko: "faces",
								uk: "faces"
							},

							description: "Number of faces on the dice",
							description_localizations: {
								fr: "Nombre de faces sur le(s) dé(s)",
								ja: "サイコロの面の数",
								ru: "Количество граней кости",
								"es-ES": "Número de caras del dado",
								ko: "주사위 면 수",
								uk: "Кількість граней кубика"
							},

							choices: to(12),

							type: ApplicationCommandOptionType.Number,
							permission: null
						}
					],

					type: ApplicationCommandOptionType.Subcommand,
					permission: null
				},
				{
					name: "heads-tails",
					name_localizations: {
						fr: "pile-ou-face",
						ja: "heads-tails",
						ru: "heads-tails",
						"es-ES": "heads-tails",
						ko: "heads-tails",
						uk: "heads-tails"
					},

					description: "Heads or tail?",
					description_localizations: {
						fr: "Pile ou face ?",
						ja: "表か裏か？",
						ru: "Орел или решка?",
						"es-ES": "Cara o cruz?",
						ko: "앞면? 뒷면?",
						uk: "Орел чи решка?"
					},

					aliases: ["pileouface", "pile-ou-face"],

					type: ApplicationCommandOptionType.Subcommand,
					permission: null
				},
				{
					name: "number",
					name_localizations: {
						fr: "nombre",
						ja: "number",
						ru: "number",
						"es-ES": "number",
						ko: "number",
						uk: "number"
					},

					description: "Generate a random number between two values",
					description_localizations: {
						fr: "Génère un nombre aléatoire entre deux valeurs",
						ja: "2つの値の間のランダムな数字を生成",
						ru: "Сгенерировать случайное число между двумя значениями",
						"es-ES":
							"Generar un número aleatorio entre dos valores",
						ko: "두 값 사이의 무작위 숫자를 생성해요",
						uk: "Згенерувати випадкове число між двома значеннями"
					},

					options: [
						{
							name: "min",
							name_localizations: {
								fr: "minimum",
								ja: "min",
								ru: "min",
								"es-ES": "min",
								ko: "min",
								uk: "min"
							},

							description: "Minimum value",
							description_localizations: {
								fr: "Valeur minimale",
								ja: "最小値",
								ru: "Минимальное значение",
								"es-ES": "Valor mínimo",
								ko: "최솟값",
								uk: "Мінімальне значення"
							},
							type: ApplicationCommandOptionType.Number,

							required: false,
							permission: null
						},
						{
							name: "max",
							name_localizations: {
								fr: "maximum",
								ja: "max",
								ru: "max",
								"es-ES": "max",
								ko: "max",
								uk: "max"
							},

							description: "Maximum value",
							description_localizations: {
								fr: "Valeur maximale",
								ja: "最大値",
								ru: "Максимальное значение",
								"es-ES": "Valor máximo",
								ko: "최댓값",
								uk: "Максимальне значення"
							},

							type: ApplicationCommandOptionType.Number,

							required: false,
							permission: null
						}
					],

					type: ApplicationCommandOptionType.Subcommand,
					permission: null
				},
				{
					name: "gay",

					description: "Show how gay you are",
					description_localizations: {
						fr: "Affiche au combien tu es gay",
						ja: "あなたのゲイ度を表示",
						ru: "Показать, насколько вы гей",
						"es-ES": "Mostrar qué tan gay eres",
						ko: "얼마나 게이인지 보여줘요",
						uk: "Показати, наскільки ви гей"
					},

					options: [
						{
							name: "user",

							description: "the user",
							description_localizations: {
								fr: "l'user",
								ja: "ユーザー",
								ru: "пользователь",
								"es-ES": "el usuario",
								ko: "사용자",
								uk: "Користувач"
							},

							type: ApplicationCommandOptionType.User,
							required: false,
							permission: null
						}
					],
					thinking: false,
					type: ApplicationCommandOptionType.Subcommand,
					permission: null
				},
				{
					name: "rate",

					description: "Let me rate the followed subject",
					description_localizations: {
						fr: "Affiche au combien tu pue",
						ja: "指定された対象を評価します",
						ru: "Позволь оценить указанный предмет",
						"es-ES": "Déjame calificar el tema indicado",
						ko: "다음 주제를 제가 평가해 볼게요",
						uk: "Дозвольте оцінити вказану тему"
					},

					aliases: ["note"],

					options: [
						{
							name: "the_things",

							description: "the_things",
							description_localizations: {
								fr: "la chose",
								ja: "もの",
								ru: "вещи",
								"es-ES": "las cosas",
								ko: "the_things",
								uk: "Речі"
							},

							type: ApplicationCommandOptionType.String,
							required: true,
							permission: null
						}
					],
					thinking: false,
					type: ApplicationCommandOptionType.Subcommand,
					permission: null
				},
				{
					name: "trans",

					description: "Show how trans you are",
					description_localizations: {
						fr: "Affiche au combien tu es trans",
						ja: "あなたのトランス度を表示",
						ru: "Показать, насколько вы транс",
						"es-ES": "Mostrar qué tan trans eres",
						ko: "얼마나 트랜스인지 보여줘요",
						uk: "Показати, наскільки ви транс"
					},

					options: [
						{
							name: "user",

							description: "the user",
							description_localizations: {
								fr: "l'user",
								ja: "ユーザー",
								ru: "пользователь",
								"es-ES": "el usuario",
								ko: "사용자",
								uk: "Користувач"
							},

							type: ApplicationCommandOptionType.User,
							required: false,
							permission: null
						}
					],
					thinking: false,
					type: ApplicationCommandOptionType.Subcommand,
					permission: null
				},
				{
					name: "stench",

					description: "Show how much stench you are",
					description_localizations: {
						fr: "Affiche au combien tu pue",
						ja: "あなたの臭さ度を表示",
						ru: "Показать, насколько вы вонючий",
						"es-ES": "Mostrar qué tan apestoso eres",
						ko: "얼마나 냄새나는지 보여줘요",
						uk: "Показати, наскільки ви смердите"
					},

					aliases: [
						"odeur",
						"odeurs",
						"puanteurs",
						"puanteur",
						"arf",
						"pue"
					],

					options: [
						{
							name: "user",

							description: "the user",
							description_localizations: {
								fr: "l'user",
								ja: "ユーザー",
								ru: "пользователь",
								"es-ES": "el usuario",
								ko: "사용자",
								uk: "Користувач"
							},

							type: ApplicationCommandOptionType.User,
							required: false,
							permission: null
						}
					],
					thinking: false,
					type: ApplicationCommandOptionType.Subcommand,
					permission: null
				}
			],

			type: ApplicationCommandOptionType.SubcommandGroup,
			permission: null
		},
		{
			name: "config",
			prefixName: "fconfig",

			description: "Disable the fun category",
			description_localizations: {
				fr: "Désactiver la catégorie fun",
				ja: "Funカテゴリを無効化",
				ru: "Отключить категорию развлечений",
				"es-ES": "Deshabilitar la categoría de diversión",
				ko: "재미 카테고리를 비활성화해요",
				uk: "Вимкнути категорію розваг"
			},

			options: [
				{
					name: "action",

					description: "What do you want to do?",
					description_localizations: {
						fr: "Que voulez-vous faire ?",
						ja: "何をしたいですか？",
						ru: "Что вы хотите сделать?",
						"es-ES": "Que quieres hacer?",
						ko: "무엇을 할까요?",
						uk: "Що ви хочете зробити?"
					},

					choices: [
						{
							name: "Power On",
							name_localizations: {
								fr: "Activer",
								ja: "power_on",
								ru: "power_on",
								"es-ES": "power_on",
								ko: "켜기",
								uk: "Увімкнути"
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
								uk: "Вимкнути"
							},
							value: "off"
						}
					],

					required: true,
					type: ApplicationCommandOptionType.String,

					permission: null
				}
			],

			type: ApplicationCommandOptionType.Subcommand,
			permission: PermissionFlagsBits.Administrator
		}
	],
	integration_types: [0, 1],
	contexts: [0, 1, 2],

	thinking: true,
	category: "fun",
	type: ApplicationCommandType.ChatInput,
	permission: null
};
