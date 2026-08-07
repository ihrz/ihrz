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

// Translation map: English → { ja, ru, es-ES }
// Used by scripts/apply_translations.ts

const translations: Record<
	string,
	{ ja: string; ru: string; "es-ES": string }
> = {
	// === CHOICES / NAMES ===
	"Power On": { ja: "有効", ru: "Включить", "es-ES": "Activar" },
	"Power Off": { ja: "無効", ru: "Выключить", "es-ES": "Desactivar" },
	Activer: { ja: "有効", ru: "Включить", "es-ES": "Activar" },
	Désactiver: { ja: "無効", ru: "Выключить", "es-ES": "Desactivar" },
	"Default prefix": {
		ja: "デフォルトプレフィックス",
		ru: "Префикс по умолчанию",
		"es-ES": "Prefijo por defecto"
	},
	"Préfixe par défaut": {
		ja: "デフォルトプレフィックス",
		ru: "Префикс по умолчанию",
		"es-ES": "Prefijo por defecto"
	},
	"Change prefix": {
		ja: "プレフィックスを変更",
		ru: "Изменить префикс",
		"es-ES": "Cambiar prefijo"
	},
	"Changer le préfixe": {
		ja: "プレフィックスを変更",
		ru: "Изменить префикс",
		"es-ES": "Cambiar prefijo"
	},
	"[COMING SOON] ALL": {
		ja: "[近日公開] 全て",
		ru: "[СКОРО] ВСЕ",
		"es-ES": "[PRÓXIMAMENTE] TODO"
	},
	"[COMING SOON] Select": {
		ja: "[近日公開] 選択",
		ru: "[СКОРО] Выбрать",
		"es-ES": "[PRÓXIMAMENTE] Seleccionar"
	},
	ON: { ja: "オン", ru: "ВКЛ", "es-ES": "ENCENDIDO" },
	OFF: { ja: "オフ", ru: "ВЫКЛ", "es-ES": "APAGADO" },
	Punish: { ja: "罰する", ru: "Наказать", "es-ES": "Castigar" },
	"Simulate (no actions)": {
		ja: "シミュレート（アクションなし）",
		ru: "Симуляция (без действий)",
		"es-ES": "Simular (sin acciones)"
	},
	Clear: { ja: "クリア", ru: "Очистить", "es-ES": "Limpiar" },
	Kick: { ja: "キック", ru: "Кик", "es-ES": "Expulsar" },
	Ban: { ja: "バン", ru: "Бан", "es-ES": "Banear" },
	Unban: { ja: "バン解除", ru: "Разбан", "es-ES": "Desbanear" },
	Mute: { ja: "ミュート", ru: "Мут", "es-ES": "Silenciar" },
	Unmute: { ja: "ミュート解除", ru: "Размут", "es-ES": "Desilenciar" },
	Warn: { ja: "警告", ru: "Предупреждение", "es-ES": "Advertir" },
	Tempmute: {
		ja: "一時的ミュート",
		ru: "Временный мут",
		"es-ES": "Silenciar temporalmente"
	},
	Tempban: {
		ja: "一時的バン",
		ru: "Временный бан",
		"es-ES": "Banear temporalmente"
	},
	Invite: { ja: "招待", ru: "Приглашение", "es-ES": "Invitación" },
	Sticker: { ja: "スタンプ", ru: "Стикер", "es-ES": "Sticker" },
	Emoji: { ja: "絵文字", ru: "Эмодзи", "es-ES": "Emoji" },
	Role: { ja: "ロール", ru: "Роль", "es-ES": "Rol" },
	channel: { ja: "チャンネル", ru: "канал", "es-ES": "canal" },
	message: { ja: "メッセージ", ru: "сообщение", "es-ES": "mensaje" },
	user: { ja: "ユーザー", ru: "пользователь", "es-ES": "usuario" },
	"#channel": { ja: "#チャンネル", ru: "#канал", "es-ES": "#canal" },
	"Play from Link": {
		ja: "リンクから再生",
		ru: "Воспроизвести по ссылке",
		"es-ES": "Reproducir desde enlace"
	},
	"Search Track": {
		ja: "曲を検索",
		ru: "Поиск трека",
		"es-ES": "Buscar canción"
	},
	Track: { ja: "トラック", ru: "Трек", "es-ES": "Pista" },
	Queue: { ja: "キュー", ru: "Очередь", "es-ES": "Cola" },
	None: { ja: "なし", ru: "Нет", "es-ES": "Ninguno" },
	Song: { ja: "曲", ru: "Песня", "es-ES": "Canción" },
	"All the queue": {
		ja: "全てのキュー",
		ru: "Вся очередь",
		"es-ES": "Toda la cola"
	},
	Enable: { ja: "有効化", ru: "Включить", "es-ES": "Habilitar" },
	Disable: { ja: "無効化", ru: "Выключить", "es-ES": "Deshabilitar" },
	large: { ja: "大", ru: "большой", "es-ES": "grande" },
	brief: { ja: "簡易", ru: "краткий", "es-ES": "breve" },
	Add: { ja: "追加", ru: "Добавить", "es-ES": "Añadir" },
	Remove: { ja: "削除", ru: "Удалить", "es-ES": "Eliminar" },
	Delete: { ja: "削除", ru: "Удалить", "es-ES": "Eliminar" },
	Edit: { ja: "編集", ru: "Редактировать", "es-ES": "Editar" },
	Create: { ja: "作成", ru: "Создать", "es-ES": "Crear" },
	List: { ja: "一覧", ru: "Список", "es-ES": "Lista" },
	Show: { ja: "表示", ru: "Показать", "es-ES": "Mostrar" },
	Save: { ja: "保存", ru: "Сохранить", "es-ES": "Guardar" },
	Restore: { ja: "復元", ru: "Восстановить", "es-ES": "Restaurar" },
	Accept: { ja: "承認", ru: "Принять", "es-ES": "Aceptar" },
	Deny: { ja: "拒否", ru: "Отклонить", "es-ES": "Denegar" },
	Reply: { ja: "返信", ru: "Ответить", "es-ES": "Responder" },
	Profile: { ja: "プロフィール", ru: "Профиль", "es-ES": "Perfil" },
	Statistics: { ja: "統計", ru: "Статистика", "es-ES": "Estadísticas" },
	Leaderboard: {
		ja: "ランキング",
		ru: "Таблица лидеров",
		"es-ES": "Tabla de clasificación"
	},
	Config: { ja: "設定", ru: "Конфигурация", "es-ES": "Configuración" },
	Configuration: { ja: "設定", ru: "Конфигурация", "es-ES": "Configuración" },
	Setup: { ja: "セットアップ", ru: "Настройка", "es-ES": "Configuración" },
	Manage: { ja: "管理", ru: "Управление", "es-ES": "Gestionar" },
	Information: { ja: "情報", ru: "Информация", "es-ES": "Información" },
	Reset: { ja: "リセット", ru: "Сброс", "es-ES": "Restablecer" },
	Channel: { ja: "チャンネル", ru: "Канал", "es-ES": "Canal" },
	Message: { ja: "メッセージ", ru: "Сообщение", "es-ES": "Mensaje" },
	Status: { ja: "ステータス", ru: "Статус", "es-ES": "Estado" },
	Balance: { ja: "残高", ru: "Баланс", "es-ES": "Saldo" },
	Deposit: { ja: "預金", ru: "Депозит", "es-ES": "Depositar" },
	Withdraw: { ja: "引き出し", ru: "Вывод", "es-ES": "Retirar" },
	Pay: { ja: "支払い", ru: "Оплатить", "es-ES": "Pagar" },
	Rob: { ja: "強奪", ru: "Ограбить", "es-ES": "Robar" },
	Work: { ja: "仕事", ru: "Работа", "es-ES": "Trabajar" },
	Daily: { ja: "デイリー", ru: "Ежедневно", "es-ES": "Diario" },
	Weekly: { ja: "ウィークリー", ru: "Еженедельно", "es-ES": "Semanal" },
	Monthly: { ja: "マンスリー", ru: "Ежемесячно", "es-ES": "Mensual" },
	Shop: { ja: "ショップ", ru: "Магазин", "es-ES": "Tienda" },
	Buy: { ja: "購入", ru: "Купить", "es-ES": "Comprar" },
	Sell: { ja: "売却", ru: "Продать", "es-ES": "Vender" },
	Set: { ja: "設定", ru: "Установить", "es-ES": "Establecer" },
	Get: { ja: "取得", ru: "Получить", "es-ES": "Obtener" },
	Rename: { ja: "名前変更", ru: "Переименовать", "es-ES": "Renombrar" },
	Close: { ja: "閉じる", ru: "Закрыть", "es-ES": "Cerrar" },
	Open: { ja: "開く", ru: "Открыть", "es-ES": "Abrir" },
	Transcript: {
		ja: "トランスクリプト",
		ru: "Транскрипт",
		"es-ES": "Transcripción"
	},
	Pause: { ja: "一時停止", ru: "Пауза", "es-ES": "Pausar" },
	Resume: { ja: "再開", ru: "Возобновить", "es-ES": "Reanudar" },
	Stop: { ja: "停止", ru: "Остановить", "es-ES": "Detener" },
	Skip: { ja: "スキップ", ru: "Пропустить", "es-ES": "Saltar" },
	Shuffle: { ja: "シャッフル", ru: "Перемешать", "es-ES": "Mezclar" },
	Loop: { ja: "ループ", ru: "Повтор", "es-ES": "Repetir" },
	Volume: { ja: "音量", ru: "Громкость", "es-ES": "Volumen" },
	Lyrics: { ja: "歌詞", ru: "Текст песни", "es-ES": "Letra" },
	"Now Playing": {
		ja: "再生中",
		ru: "Сейчас играет",
		"es-ES": "Reproduciendo"
	},
	History: { ja: "履歴", ru: "История", "es-ES": "Historial" },
	"Clear Queue": {
		ja: "キューをクリア",
		ru: "Очистить очередь",
		"es-ES": "Limpiar cola"
	},
	Lock: { ja: "ロック", ru: "Заблокировать", "es-ES": "Bloquear" },
	Unlock: { ja: "ロック解除", ru: "Разблокировать", "es-ES": "Desbloquear" },
	"Lock All": {
		ja: "全てロック",
		ru: "Заблокировать все",
		"es-ES": "Bloquear todo"
	},
	"Unlock All": {
		ja: "全てロック解除",
		ru: "Разблокировать все",
		"es-ES": "Desbloquear todo"
	},
	Slowmode: {
		ja: "低速モード",
		ru: "Замедленный режим",
		"es-ES": "Modo lento"
	},
	"[COMING SOON] Changer": {
		ja: "[近日公開] 変更",
		ru: "[СКОРО] Изменить",
		"es-ES": "[PRÓXIMAMENTE] Cambiar"
	},
	Choose: { ja: "選択", ru: "Выбрать", "es-ES": "Elegir" },

	// === DESCRIPTIONS ===
	"": { ja: "", ru: "", "es-ES": "" },
	"<Power on /Power off>": {
		ja: "<オン / オフ>",
		ru: "<Вкл / Выкл>",
		"es-ES": "<Encender / Apagar>"
	},
	"Accept an suggestion (need admin permission)!": {
		ja: "提案を承認（管理者権限が必要）！",
		ru: "Принять предложение (требуются права администратора)!",
		"es-ES": "Aceptar una sugerencia (requiere permiso de administrador)!"
	},
	"Action to apply on command limits": {
		ja: "コマンド制限に適用するアクション",
		ru: "Действие для применения к лимитам команд",
		"es-ES": "Acción a aplicar en los límites de comandos"
	},
	"Action to do": {
		ja: "実行するアクション",
		ru: "Выполняемое действие",
		"es-ES": "Acción a realizar"
	},
	"Add Streamer/Youtuber/Twitcher": {
		ja: "ストリーマー/YouTuber/Twitcherを追加",
		ru: "Добавить стримера/YouTube/Twitch",
		"es-ES": "Añadir Streamer/Youtuber/Twitcher"
	},
	"Add a blog RSS feed": {
		ja: "ブログのRSSフィードを追加",
		ru: "Добавить RSS-ленту блога",
		"es-ES": "Añadir un feed RSS de blog"
	},
	"Add a channel": {
		ja: "チャンネルを追加",
		ru: "Добавить канал",
		"es-ES": "Añadir un canal"
	},
	"Add a member into your ticket!": {
		ja: "チケットにメンバーを追加！",
		ru: "Добавить участника в тикет!",
		"es-ES": "Añadir un miembro a tu ticket!"
	},
	"Add a role for a certain amount of money!": {
		ja: "特定の金額でロールを追加！",
		ru: "Добавить роль за определенную сумму!",
		"es-ES": "Añadir un rol por una cierta cantidad de dinero!"
	},
	"Add a role to all users who reacted to a specific message": {
		ja: "特定のメッセージにリアクションした全ユーザーにロールを追加",
		ru: "Добавить роль всем, кто отреагировал на сообщение",
		"es-ES":
			"Añadir un rol a todos los usuarios que reaccionaron a un mensaje específico"
	},
	"Add a sticker from the replied message": {
		ja: "返信メッセージからスタンプを追加",
		ru: "Добавить стикер из ответного сообщения",
		"es-ES": "Añadir un sticker del mensaje respondido"
	},
	"Add a user to the blacklist!": {
		ja: "ユーザーをブラックリストに追加！",
		ru: "Добавить пользователя в черный список!",
		"es-ES": "Añadir un usuario a la lista negra!"
	},
	"Add bubble on top of your own image": {
		ja: "自分の画像の上に吹き出しを追加",
		ru: "Добавить пузырек поверх вашего изображения",
		"es-ES": "Añadir burbuja encima de tu propia imagen"
	},
	"Add emojis to your server easly": {
		ja: "サーバーに絵文字を簡単に追加",
		ru: "Легко добавить эмодзи на сервер",
		"es-ES": "Añadir emojis a tu servidor fácilmente"
	},
	"Add invites to a user!": {
		ja: "ユーザーに招待を追加！",
		ru: "Добавить приглашения пользователю!",
		"es-ES": "Añadir invitaciones a un usuario!"
	},
	"Add money to a user!": {
		ja: "ユーザーにお金を追加！",
		ru: "Добавить деньги пользователю!",
		"es-ES": "Añadir dinero a un usuario!"
	},
	"Add reaction by iHorizon when user send message": {
		ja: "ユーザーがメッセージを送信したらiHorizonがリアクションを追加",
		ru: "Добавить реакцию iHorizon при отправке сообщения",
		"es-ES":
			"Añadir reacción de iHorizon cuando el usuario envía un mensaje"
	},
	"Add role to user": {
		ja: "ユーザーにロールを追加",
		ru: "Добавить роль пользователю",
		"es-ES": "Añadir rol al usuario"
	},
	"Add text on top of your own image": {
		ja: "自分の画像の上にテキストを追加",
		ru: "Добавить текст поверх вашего изображения",
		"es-ES": "Añadir texto encima de tu propia imagen"
	},
	"Add/Remove roles to everyone on the server": {
		ja: "サーバー内の全員にロールを追加/削除",
		ru: "Добавить/удалить роли всем на сервере",
		"es-ES": "Añadir/Quitar roles a todos en el servidor"
	},
	"Adding an user in the allowlist!": {
		ja: "許可リストにユーザーを追加！",
		ru: "Добавить пользователя в белый список!",
		"es-ES": "Añadiendo un usuario a la lista de permitidos!"
	},
	"All of the roles wich bypass the antispam": {
		ja: "アンチスパムをバイパスする全てのロール",
		ru: "Все роли, обходящие антиспам",
		"es-ES": "Todos los roles que evitan el antispam"
	},
	"Allow a member to join the frozen voice channel": {
		ja: "凍結されたボイスチャンネルへの参加を許可",
		ru: "Разрешить участнику войти в замороженный голосовой канал",
		"es-ES": "Permitir a un miembro unirse al canal de voz congelado"
	},
	"Allow/Unallow the user to send Telegram links into them messages!": {
		ja: "ユーザーがTelegramリンクを送信するのを許可/禁止！",
		ru: "Разрешить/запретить отправку ссылок Telegram!",
		"es-ES":
			"Permitir/Denegar al usuario enviar enlaces de Telegram en sus mensajes!"
	},
	"Allow/Unallow the user to send a server invites into them messages!": {
		ja: "ユーザーがサーバー招待を送信するのを許可/禁止！",
		ru: "Разрешить/запретить отправку приглашений сервера!",
		"es-ES":
			"Permitir/Denegar al usuario enviar invitaciones de servidor en sus mensajes!"
	},
	"Allow/Unallow the user to send links into them messages!": {
		ja: "ユーザーがリンクを送信するのを許可/禁止！",
		ru: "Разрешить/запретить отправку ссылок!",
		"es-ES": "Permitir/Denegar al usuario enviar enlaces en sus mensajes!"
	},
	"Ask a question to the bot !": {
		ja: "ボットに質問する！",
		ru: "Задать вопрос боту!",
		"es-ES": "Hacer una pregunta al bot!"
	},
	"Ban a user!": {
		ja: "ユーザーをバン！",
		ru: "Забанить пользователя!",
		"es-ES": "Banear a un usuario!"
	},
	"Block accounts that are too new from joining your server": {
		ja: "新しすぎるアカウントのサーバー参加をブロック",
		ru: "Блокировать слишком новые аккаунты от входа на сервер",
		"es-ES": "Bloquear cuentas demasiado nuevas para unirse a tu servidor"
	},
	"Block the ability to add new bots into this server": {
		ja: "このサーバーに新しいボットを追加する機能をブロック",
		ru: "Заблокировать возможность добавления новых ботов на сервер",
		"es-ES": "Bloquear la capacidad de añadir nuevos bots a este servidor"
	},
	"Block the spam message in this server!": {
		ja: "このサーバーでのスパムメッセージをブロック！",
		ru: "Блокировать спам-сообщения на этом сервере!",
		"es-ES": "Bloquear los mensajes de spam en este servidor!"
	},
	"Block the spam which have mass-mention in this message!": {
		ja: "大量メンションを含むスパムをブロック！",
		ru: "Блокировать спам с массовыми упоминаниями!",
		"es-ES": "Bloquear el spam que tiene menciones masivas en este mensaje!"
	},
	"Block/Protect someting/behaviours into this guild!": {
		ja: "このサーバー内の何か/行動をブロック/保護！",
		ru: "Заблокировать/защитить что-либо на этом сервере!",
		"es-ES": "Bloquear/Proteger algo/comportamientos en este servidor!"
	},
	"Blog RSS feed manipulation": {
		ja: "ブログRSSフィードの操作",
		ru: "Управление RSS-лентами блога",
		"es-ES": "Manipulación de feeds RSS de blog"
	},
	"Cat say (insert text here)": {
		ja: "猫が言う（ここにテキストを入力）",
		ru: "Кот говорит (вставьте текст)",
		"es-ES": "El gato dice (insertar texto aquí)"
	},
	"Change the bot prefix on the guild": {
		ja: "サーバーのボットプレフィックスを変更",
		ru: "Изменить префикс бота на сервере",
		"es-ES": "Cambiar el prefijo del bot en el servidor"
	},
	"Change the channel which are send the most skulled messages": {
		ja: "最も多くの skulled メッセージが送信されるチャンネルを変更",
		ru: "Изменить канал для сообщений с черепами",
		"es-ES": "Cambiar el canal donde se envían los mensajes más skulled"
	},
	"Change the channel which are send the most starred messages": {
		ja: "最も多くのスター付きメッセージが送信されるチャンネルを変更",
		ru: "Изменить канал для сообщений со звездами",
		"es-ES": "Cambiar el canal donde se envían los mensajes más destacados"
	},
	"Change the cooldown between confession!": {
		ja: "告白間のクールダウンを変更！",
		ru: "Изменить задержку между признаниями!",
		"es-ES": "Cambiar el enfriamiento entre confesiones!"
	},
	"Change the iHorizon avatar into your server": {
		ja: "サーバーのiHorizonアバターを変更",
		ru: "Изменить аватар iHorizon на сервере",
		"es-ES": "Cambiar el avatar de iHorizon en tu servidor"
	},
	"Change the iHorizon banner into your server": {
		ja: "サーバーのiHorizonバナーを変更",
		ru: "Изменить баннер iHorizon на сервере",
		"es-ES": "Cambiar el banner de iHorizon en tu servidor"
	},
	"Change the iHorizon bio into your server": {
		ja: "サーバーのiHorizonの自己紹介を変更",
		ru: "Изменить описание iHorizon на сервере",
		"es-ES": "Cambiar la biografía de iHorizon en tu servidor"
	},
	"Change the iHorizon name into the server": {
		ja: "サーバーのiHorizonの名前を変更",
		ru: "Изменить имя iHorizon на сервере",
		"es-ES": "Cambiar el nombre de iHorizon en el servidor"
	},
	"Change the message commands's prefix in this guild!": {
		ja: "このサーバーのメッセージコマンドのプレフィックスを変更！",
		ru: "Изменить префикс текстовых команд на сервере!",
		"es-ES":
			"Cambiar el prefijo de los comandos de mensaje en este servidor!"
	},
	"Channel manipulation for the Join GhostPing Module": {
		ja: "Join GhostPingモジュールのチャンネル操作",
		ru: "Управление каналами для модуля Join GhostPing",
		"es-ES": "Manipulación de canales para el módulo Join GhostPing"
	},
	"Channel operating commands": {
		ja: "チャンネル操作コマンド",
		ru: "Команды управления каналами",
		"es-ES": "Comandos de operación de canales"
	},
	"Check if user is banned and why": {
		ja: "ユーザーがバンされているかとその理由を確認",
		ru: "Проверить, забанен ли пользователь и почему",
		"es-ES": "Comprobar si el usuario está baneado y por qué"
	},
	"Choose an actions to Deny/Allow for the user!": {
		ja: "ユーザーに対して拒否/許可するアクションを選択！",
		ru: "Выберите действия для запрета/разрешения пользователю!",
		"es-ES": "Elegir acciones para Denegar/Permitir al usuario!"
	},
	"Choose the action": {
		ja: "アクションを選択",
		ru: "Выберите действие",
		"es-ES": "Elegir la acción"
	},
	"Choose the keywords wanted in the bio": {
		ja: "自己紹介に含めたいキーワードを選択",
		ru: "Выберите ключевые слова для описания",
		"es-ES": "Elegir las palabras clave deseadas en la biografía"
	},
	"Choose the punishement": {
		ja: "罰を選択",
		ru: "Выберите наказание",
		"es-ES": "Elegir el castigo"
	},
	"Choose the sanction to applied for the flagged user!": {
		ja: "フラグされたユーザーに適用する制裁を選択！",
		ru: "Выберите санкцию для отмеченного пользователя!",
		"es-ES": "Elegir la sanción a aplicar para el usuario marcado!"
	},
	"Choose the status of the module": {
		ja: "モジュールのステータスを選択",
		ru: "Выберите статус модуля",
		"es-ES": "Elegir el estado del módulo"
	},
	"Claim a daily reward!": {
		ja: "デイリー報酬を獲得！",
		ru: "Получить ежедневную награду!",
		"es-ES": "Reclamar una recompensa diaria!"
	},
	"Claim a monthly reward!": {
		ja: "マンスリー報酬を獲得！",
		ru: "Получить ежемесячную награду!",
		"es-ES": "Reclamar una recompensa mensual!"
	},
	"Claim a weekly reward!": {
		ja: "ウィークリー報酬を獲得！",
		ru: "Получить еженедельную награду!",
		"es-ES": "Reclamar una recompensa semanal!"
	},
	"Claim a work reward!": {
		ja: "仕事の報酬を獲得！",
		ru: "Получить награду за работу!",
		"es-ES": "Reclamar una recompensa de trabajo!"
	},
	"Clear a amount of message in the channel !": {
		ja: "チャンネル内のメッセージを一括削除！",
		ru: "Очистить количество сообщений в канале!",
		"es-ES": "Limpiar una cantidad de mensajes en el canal!"
	},
	"Clear all warns of all users across the server": {
		ja: "サーバー全体の全ユーザーの警告をクリア",
		ru: "Очистить все предупреждения всех пользователей",
		"es-ES":
			"Limpiar todas las advertencias de todos los usuarios del servidor"
	},
	"Clear all warns of a user": {
		ja: "ユーザーの全ての警告をクリア",
		ru: "Очистить все предупреждения пользователя",
		"es-ES": "Limpiar todas las advertencias de un usuario"
	},
	"Clear the music queue in this guild!": {
		ja: "このサーバーの音楽キューをクリア！",
		ru: "Очистить музыкальную очередь на сервере!",
		"es-ES": "Limpiar la cola de música en este servidor!"
	},
	"Close a ticket!": {
		ja: "チケットを閉じる！",
		ru: "Закрыть тикет!",
		"es-ES": "Cerrar un ticket!"
	},
	"Compare statistics between multiple users": {
		ja: "複数ユーザー間の統計を比較",
		ru: "Сравнить статистику нескольких пользователей",
		"es-ES": "Comparar estadísticas entre múltiples usuarios"
	},
	"Config the Git Lines modules": {
		ja: "Git Linesモジュールを設定",
		ru: "Настроить модули Git Lines",
		"es-ES": "Configurar los módulos de Git Lines"
	},
	"Configuration for the Blogger Module": {
		ja: "Bloggerモジュールの設定",
		ru: "Настройка модуля Blogger",
		"es-ES": "Configuración para el módulo Blogger"
	},
	"Configuration for the Notifier Module": {
		ja: "Notifierモジュールの設定",
		ru: "Настройка модуля Notifier",
		"es-ES": "Configuración para el módulo Notifier"
	},
	"Configure role selection for a specific message": {
		ja: "特定のメッセージのロール選択を設定",
		ru: "Настроить выбор ролей для сообщения",
		"es-ES": "Configurar la selección de roles para un mensaje específico"
	},
	"Configure the Honeypot protection panel.": {
		ja: "ハニーポット保護パネルを設定。",
		ru: "Настроить панель защиты Honeypot.",
		"es-ES": "Configurar el panel de protección Honeypot."
	},
	"Connect your Last.fm account and control music scrobbling.": {
		ja: "Last.fmアカウントを接続してスクロブルを管理。",
		ru: "Подключите аккаунт Last.fm и управляйте скробблингом.",
		"es-ES":
			"Conecta tu cuenta de Last.fm y controla el scrobbling de música."
	},
	"Coolodwn's time like 3h/30m/10s...": {
		ja: "クールダウン時間（例: 3h/30m/10s...）",
		ru: "Время задержки, например 3ч/30м/10с...",
		"es-ES": "Tiempo de enfriamiento como 3h/30m/10s..."
	},
	"Count number into a channel": {
		ja: "チャンネル内でカウント",
		ru: "Считать число в канале",
		"es-ES": "Contar número en un canal"
	},
	"Create a backup!": {
		ja: "バックアップを作成！",
		ru: "Создать резервную копию!",
		"es-ES": "Crear una copia de seguridad!"
	},
	"Create a beautiful embed!": {
		ja: "美しい埋め込みを作成！",
		ru: "Создать красивый эмбед!",
		"es-ES": "Crear un embed hermoso!"
	},
	"Create a poll!": {
		ja: "投票を作成！",
		ru: "Создать опрос!",
		"es-ES": "Crear una encuesta!"
	},
	"Create a tag": {
		ja: "タグを作成",
		ru: "Создать тег",
		"es-ES": "Crear una etiqueta"
	},
	"Create an thread upside the confession ?": {
		ja: "告白の上にスレッドを作成しますか？",
		ru: "Создать ветку над признанием?",
		"es-ES": "Crear un hilo encima de la confesión?"
	},
	"Create one fake-admin role managed by iHorizon": {
		ja: "iHorizonが管理する偽管理者ロールを作成",
		ru: "Создать роль фейк-админа, управляемую iHorizon",
		"es-ES": "Crear un rol de falso administrador gestionado por iHorizon"
	},
	"Create or update an embed sticky message": {
		ja: "埋め込みの固定メッセージを作成または更新",
		ru: "Создать или обновить закрепленное сообщение-эмбед",
		"es-ES": "Crear o actualizar un mensaje fijo con embed"
	},
	"Create or update a text sticky message": {
		ja: "テキストの固定メッセージを作成または更新",
		ru: "Создать или обновить закрепленное текстовое сообщение",
		"es-ES": "Crear o actualizar un mensaje fijo de texto"
	},
	"Create roles for the permission": {
		ja: "権限用のロールを作成",
		ru: "Создать роли для разрешений",
		"es-ES": "Crear roles para los permisos"
	},
	"Create zip files with all guild emojis in!": {
		ja: "サーバーの全絵文字を含むZIPファイルを作成！",
		ru: "Создать ZIP-файлы со всеми эмодзи сервера!",
		"es-ES": "Crear archivos zip con todos los emojis del servidor!"
	},
	"Create zip files with all guild stickers in!": {
		ja: "サーバーの全スタンプを含むZIPファイルを作成！",
		ru: "Создать ZIP-файлы со всеми стикерами сервера!",
		"es-ES": "Crear archivos zip con todos los stickers del servidor!"
	},
	"Custom the bot profile in your discord server": {
		ja: "Discordサーバーでボットのプロフィールをカスタマイズ",
		ru: "Настроить профиль бота на вашем сервере",
		"es-ES": "Personalizar el perfil del bot en tu servidor de Discord"
	},
	"Define allowed roles for addrole & delrole command": {
		ja: "addrole と delrole コマンドの許可ロールを定義",
		ru: "Определить разрешенные роли для команд addrole и delrole",
		"es-ES": "Definir roles permitidos para los comandos addrole y delrole"
	},
	"Delete a channel": {
		ja: "チャンネルを削除",
		ru: "Удалить канал",
		"es-ES": "Eliminar un canal"
	},
	"Delete a iHorizon ticket!": {
		ja: "iHorizonチケットを削除！",
		ru: "Удалить тикет iHorizon!",
		"es-ES": "Eliminar un ticket de iHorizon!"
	},
	"Delete all data of InviteManager in the guild": {
		ja: "サーバー内のInviteManagerの全データを削除",
		ru: "Удалить все данные InviteManager на сервере",
		"es-ES": "Eliminar todos los datos de InviteManager en el servidor"
	},
	"Delete an suggestion (need admin permission)!": {
		ja: "提案を削除（管理者権限が必要）！",
		ru: "Удалить предложение (требуются права администратора)!",
		"es-ES": "Eliminar una sugerencia (requiere permiso de administrador)!"
	},
	"Delete a role for a certain amount of money!": {
		ja: "特定の金額でロールを削除！",
		ru: "Удалить роль за определенную сумму!",
		"es-ES": "Eliminar un rol por una cierta cantidad de dinero!"
	},
	"Delete a tag": {
		ja: "タグを削除",
		ru: "Удалить тег",
		"es-ES": "Eliminar una etiqueta"
	},
	"Delete every message containing binary files": {
		ja: "バイナリファイルを含む全てのメッセージを削除",
		ru: "Удалить все сообщения с бинарными файлами",
		"es-ES": "Eliminar cada mensaje que contenga archivos binarios"
	},
	"Delete the AuthRestore module button": {
		ja: "AuthRestoreモジュールのボタンを削除",
		ru: "Удалить кнопку модуля AuthRestore",
		"es-ES": "Eliminar el botón del módulo AuthRestore"
	},
	"Delete your backup from the list": {
		ja: "リストからバックアップを削除",
		ru: "Удалить резервную копию из списка",
		"es-ES": "Eliminar tu copia de seguridad de la lista"
	},
	"Deny an suggestion (need admin permission)!": {
		ja: "提案を拒否（管理者権限が必要）！",
		ru: "Отклонить предложение (требуются права администратора)!",
		"es-ES": "Denegar una sugerencia (requiere permiso de administrador)!"
	},
	"Deposit coin in your bank!": {
		ja: "銀行にコインを預ける！",
		ru: "Положить монеты в банк!",
		"es-ES": "Depositar monedas en tu banco!"
	},
	"Disable a sticky message in one channel": {
		ja: "1つのチャンネルの固定メッセージを無効化",
		ru: "Отключить закрепленное сообщение в канале",
		"es-ES": "Deshabilitar un mensaje fijo en un canal"
	},
	"Disable or enable the Security Module feature!": {
		ja: "セキュリティモジュール機能を無効化または有効化！",
		ru: "Отключить или включить модуль безопасности!",
		"es-ES": "Deshabilitar o habilitar la función del módulo de seguridad!"
	},
	"Disable talk mode and unmute everyone": {
		ja: "トークモードを無効化して全員のミュートを解除",
		ru: "Отключить режим разговора и размутить всех",
		"es-ES": "Deshabilitar el modo de conversación y desilenciar a todos"
	},
	"Disable the economy module into your guild": {
		ja: "サーバーの経済モジュールを無効化",
		ru: "Отключить экономический модуль на сервере",
		"es-ES": "Deshabilitar el módulo de economía en tu servidor"
	},
	"Disable the fun category": {
		ja: "Funカテゴリを無効化",
		ru: "Отключить категорию развлечений",
		"es-ES": "Deshabilitar la categoría de diversión"
	},
	"Disable ticket commands on a guild!": {
		ja: "サーバーでチケットコマンドを無効化！",
		ru: "Отключить команды тикетов на сервере!",
		"es-ES": "Deshabilitar los comandos de ticket en un servidor!"
	},
	"Disconnect a member from a voice channel": {
		ja: "メンバーをボイスチャンネルから切断",
		ru: "Отключить участника от голосового канала",
		"es-ES": "Desconectar a un miembro de un canal de voz"
	},
	"Do you want to power On/Off the module ?": {
		ja: "モジュールをオン/オフしますか？",
		ru: "Включить или выключить модуль?",
		"es-ES": "Quieres encender/apagar el módulo?"
	},
	"Do you want to save message(s) ?": {
		ja: "メッセージを保存しますか？",
		ru: "Сохранить сообщения?",
		"es-ES": "Quieres guardar los mensajes?"
	},
	"Edit a tag": {
		ja: "タグを編集",
		ru: "Редактировать тег",
		"es-ES": "Editar una etiqueta"
	},
	"Edit blacklist reason": {
		ja: "ブラックリストの理由を編集",
		ru: "Изменить причину черного списка",
		"es-ES": "Editar razón de lista negra"
	},
	"Edit the permission roles into the guild": {
		ja: "サーバーの権限ロールを編集",
		ru: "Редактировать роли разрешений на сервере",
		"es-ES": "Editar los roles de permiso en el servidor"
	},
	"Embed's ID": {
		ja: "埋め込みのID",
		ru: "ID эмбеда",
		"es-ES": "ID del embed"
	},
	"Enable / Disable the reaction when user greets someone": {
		ja: "ユーザーが挨拶した時のリアクションを有効/無効",
		ru: "Включить/выключить реакцию при приветствии",
		"es-ES":
			"Habilitar / Deshabilitar la reacción cuando un usuario saluda a alguien"
	},
	"Enable or disable the Blogger module": {
		ja: "Bloggerモジュールを有効化または無効化",
		ru: "Включить или отключить модуль Blogger",
		"es-ES": "Habilitar o deshabilitar el módulo Blogger"
	},
	"Enable or Disable the confession module!": {
		ja: "告白モジュールを有効化または無効化！",
		ru: "Включить или отключить модуль признаний!",
		"es-ES": "Habilitar o Deshabilitar el módulo de confesiones!"
	},
	"Enable or Disable the counter module!": {
		ja: "カウンターモジュールを有効化または無効化！",
		ru: "Включить или отключить модуль счетчика!",
		"es-ES": "Habilitar o Deshabilitar el módulo contador!"
	},
	"Enable or disable the module": {
		ja: "モジュールを有効化または無効化",
		ru: "Включить или отключить модуль",
		"es-ES": "Habilitar o deshabilitar el módulo"
	},
	"Enable or Disable the PFPS module!": {
		ja: "PFPSモジュールを有効化または無効化！",
		ru: "Включить или отключить модуль PFPS!",
		"es-ES": "Habilitar o Deshabilitar el módulo PFPS!"
	},
	"Enable talk mode in your current voice channel": {
		ja: "現在のボイスチャンネルでトークモードを有効化",
		ru: "Включить режим разговора в текущем голосовом канале",
		"es-ES": "Habilitar el modo de conversación en tu canal de voz actual"
	},
	"End a giveaway!": {
		ja: "ギブアウェイを終了！",
		ru: "Завершить розыгрыш!",
		"es-ES": "Terminar un sorteo!"
	},
	"Find the lyrics of a title!": {
		ja: "曲の歌詞を検索！",
		ru: "Найти текст песни!",
		"es-ES": "Encontrar la letra de una canción!"
	},
	"First user to compare": {
		ja: "比較する1人目のユーザー",
		ru: "Первый пользователь для сравнения",
		"es-ES": "Primer usuario a comparar"
	},
	"Force all members of your AuthRestore module to join the guild": {
		ja: "AuthRestoreモジュールの全メンバーをサーバーに強制参加",
		ru: "Принудительно заставить всех участников AuthRestore присоединиться",
		"es-ES":
			"Forzar a todos los miembros de tu módulo AuthRestore a unirse al servidor"
	},
	"Freeze access to your current voice channel": {
		ja: "現在のボイスチャンネルへのアクセスを凍結",
		ru: "Заморозить доступ к текущему голосовому каналу",
		"es-ES": "Congelar el acceso a tu canal de voz actual"
	},
	"Fun commands related about image": {
		ja: "画像関連のFunコマンド",
		ru: "Развлекательные команды с изображениями",
		"es-ES": "Comandos divertidos relacionados con imágenes"
	},
	"Fun commands related about text style": {
		ja: "テキストスタイル関連のFunコマンド",
		ru: "Развлекательные команды со стилями текста",
		"es-ES": "Comandos divertidos relacionados con estilos de texto"
	},
	"Fun commands related to animals": {
		ja: "動物関連のFunコマンド",
		ru: "Развлекательные команды с животными",
		"es-ES": "Comandos divertidos relacionados con animales"
	},
	"Fun slash related to luck (chance)": {
		ja: "運（確率）関連のFunコマンド",
		ru: "Развлекательные команды, связанные с удачей",
		"es-ES": "Comandos divertidos relacionados con la suerte (azar)"
	},
	"Gender that fits you the most": {
		ja: "最も合う性別",
		ru: "Пол, который вам подходит",
		"es-ES": "Género que más te queda"
	},
	"Generate a random number between two values": {
		ja: "2つの値の間のランダムな数字を生成",
		ru: "Сгенерировать случайное число между двумя значениями",
		"es-ES": "Generar un número aleatorio entre dos valores"
	},
	"Get a list of all the commands!": {
		ja: "全コマンドのリストを取得！",
		ru: "Получить список всех команд!",
		"es-ES": "Obtener una lista de todos los comandos!"
	},
	"Get a picture of cat!": {
		ja: "猫の画像を取得！",
		ru: "Получить картинку кота!",
		"es-ES": "Obtener una imagen de un gato!"
	},
	"Get a picture of dog!": {
		ja: "犬の画像を取得！",
		ru: "Получить картинку собаки!",
		"es-ES": "Obtener una imagen de un perro!"
	},
	"Get a picture of dolphin!": {
		ja: "イルカの画像を取得！",
		ru: "Получить картинку дельфина!",
		"es-ES": "Obtener una imagen de un delfín!"
	},
	"Get a picture of duck!": {
		ja: "アヒルの画像を取得！",
		ru: "Получить картинку утки!",
		"es-ES": "Obtener una imagen de un pato!"
	},
	"Get a picture of fox!": {
		ja: "キツネの画像を取得！",
		ru: "Получить картинку лисы!",
		"es-ES": "Obtener una imagen de un zorro!"
	},
	"Get a picture of frog!": {
		ja: "カエルの画像を取得！",
		ru: "Получить картинку лягушки!",
		"es-ES": "Obtener una imagen de una rana!"
	},
	"Get a picture of panda!": {
		ja: "パンダの画像を取得！",
		ru: "Получить картинку панды!",
		"es-ES": "Obtener una imagen de un panda!"
	},
	"Get a picture of squirrel!": {
		ja: "リスの画像を取得！",
		ru: "Получить картинку белки!",
		"es-ES": "Obtener una imagen de una ardilla!"
	},
	"Get all informations about the AuthRestore module of the guild": {
		ja: "サーバーのAuthRestoreモジュールの全情報を取得",
		ru: "Получить всю информацию о модуле AuthRestore сервера",
		"es-ES":
			"Obtener toda la información sobre el módulo AuthRestore del servidor"
	},
	"Get information about a user!": {
		ja: "ユーザーの情報を取得！",
		ru: "Получить информацию о пользователе!",
		"es-ES": "Obtener información sobre un usuario!"
	},
	"Get information about the bot!": {
		ja: "ボットの情報を取得！",
		ru: "Получить информацию о боте!",
		"es-ES": "Obtener información sobre el bot!"
	},
	"Get information about the server!": {
		ja: "サーバーの情報を取得！",
		ru: "Получить информацию о сервере!",
		"es-ES": "Obtener información sobre el servidor!"
	},
	"Get information about the TTS module!": {
		ja: "TTSモジュールの情報を取得！",
		ru: "Получить информацию о модуле TTS!",
		"es-ES": "Obtener información sobre el módulo TTS!"
	},
	"Get informations about a giveaway (JSON Body)": {
		ja: "ギブアウェイの情報を取得（JSONデータ）",
		ru: "Получить информацию о розыгрыше (JSON)",
		"es-ES": "Obtener información sobre un sorteo (cuerpo JSON)"
	},
	"Get informations about the discord invite link": {
		ja: "Discord招待リンクの情報を取得",
		ru: "Получить информацию о пригласительной ссылке Discord",
		"es-ES": "Obtener información sobre el enlace de invitación de Discord"
	},
	"Get necessary information about my developer, Kisakay": {
		ja: "開発者Kisakayの基本情報を取得",
		ru: "Получить информацию о разработчике Kisakay",
		"es-ES": "Obtener información necesaria sobre mi desarrollador, Kisakay"
	},
	"Get statistics about the lang in the iHorizon Discord Bot": {
		ja: "iHorizon Discord Botの言語統計を取得",
		ru: "Получить статистику языков в iHorizon",
		"es-ES":
			"Obtener estadísticas sobre el idioma en el Bot de Discord iHorizon"
	},
	"Get the balance of a user!": {
		ja: "ユーザーの残高を取得！",
		ru: "Получить баланс пользователя!",
		"es-ES": "Obtener el saldo de un usuario!"
	},
	"Get the banner of a specified user!": {
		ja: "指定ユーザーのバナーを取得！",
		ru: "Получить баннер указанного пользователя!",
		"es-ES": "Obtener el banner de un usuario especificado!"
	},
	"Get the banner of the server!": {
		ja: "サーバーのバナーを取得！",
		ru: "Получить баннер сервера!",
		"es-ES": "Obtener el banner del servidor!"
	},
	"Get the bot invite link!": {
		ja: "ボットの招待リンクを取得！",
		ru: "Получить ссылку приглашения бота!",
		"es-ES": "Obtener el enlace de invitación del bot!"
	},
	"Get the bot latency!": {
		ja: "ボットのレイテンシを取得！",
		ru: "Получить задержку бота!",
		"es-ES": "Obtener la latencia del bot!"
	},
	"Get the bot status!": {
		ja: "ボットのステータスを取得！",
		ru: "Получить статус бота!",
		"es-ES": "Obtener el estado del bot!"
	},
	"Get the current playing song!": {
		ja: "現在再生中の曲を取得！",
		ru: "Получить текущую песню!",
		"es-ES": "Obtener la canción actual!"
	},
	"Get the guild configuration!": {
		ja: "サーバー設定を取得！",
		ru: "Получить конфигурацию сервера!",
		"es-ES": "Obtener la configuración del servidor!"
	},
	"Get the invites amount of a user!": {
		ja: "ユーザーの招待数を取得！",
		ru: "Получить количество приглашений пользователя!",
		"es-ES": "Obtener la cantidad de invitaciones de un usuario!"
	},
	"Get the last message deleted in this channel!": {
		ja: "このチャンネルで最後に削除されたメッセージを取得！",
		ru: "Получить последнее удаленное сообщение в канале!",
		"es-ES": "Obtener el último mensaje eliminado en este canal!"
	},
	"Get the link of the first message in the channel": {
		ja: "チャンネル内の最初のメッセージのリンクを取得",
		ru: "Получить ссылку первого сообщения в канале",
		"es-ES": "Obtener el enlace del primer mensaje en el canal"
	},
	"Get the list of all bot in the guild": {
		ja: "サーバー内の全ボットのリストを取得",
		ru: "Получить список всех ботов на сервере",
		"es-ES": "Obtener la lista de todos los bots en el servidor"
	},
	"Get the queue!": {
		ja: "キューを取得！",
		ru: "Получить очередь!",
		"es-ES": "Obtener la cola!"
	},
	"Get the shop of the guild!": {
		ja: "サーバーのショップを取得！",
		ru: "Получить магазин сервера!",
		"es-ES": "Obtener la tienda del servidor!"
	},
	"Get the transript of a ticket message!": {
		ja: "チケットメッセージのトランスクリプトを取得！",
		ru: "Получить транскрипт тикета!",
		"es-ES": "Obtener la transcripción de un mensaje de ticket!"
	},
	"Get the users balance's leaderboard of the guild!": {
		ja: "サーバーのユーザー残高ランキングを取得！",
		ru: "Получить таблицу лидеров по балансу!",
		"es-ES": "Obtener la tabla de clasificación de saldos del servidor!"
	},
	"Get the user's xp level!": {
		ja: "ユーザーのXPレベルを取得！",
		ru: "Получить уровень XP пользователя!",
		"es-ES": "Obtener el nivel de XP del usuario!"
	},
	"Get the voice states of the guild!": {
		ja: "サーバーのボイス状態を取得！",
		ru: "Получить состояния голосовых каналов!",
		"es-ES": "Obtener los estados de voz del servidor!"
	},
	"Get the xp's leaderboard of the guild!": {
		ja: "サーバーのXPランキングを取得！",
		ru: "Получить таблицу лидеров по XP!",
		"es-ES": "Obtener la tabla de clasificación de XP del servidor!"
	},
	"Get unnecessary information about my contributor andru": {
		ja: "貢献者andruの不要な情報を取得",
		ru: "Получить ненужную информацию об участнике andru",
		"es-ES": "Obtener información innecesaria sobre mi contribuidor andru"
	},
	"Get unnecessary information about my contributor noaimie": {
		ja: "貢献者noaimieの不要な情報を取得",
		ru: "Получить ненужную информацию об участнице noaimie",
		"es-ES":
			"Obtener información innecesaria sobre mi contribuidora noaimie"
	},
	"Get unnecessary information about my developper Iris": {
		ja: "開発者Irisの不要な情報を取得",
		ru: "Получить ненужную информацию о разработчице Iris",
		"es-ES": "Obtener información innecesaria sobre mi desarrolladora Iris"
	},
	"Get unnecessary information about my former contributor Ether": {
		ja: "元貢献者Etherの不要な情報を取得",
		ru: "Получить ненужную информацию о бывшем участнике Ether",
		"es-ES":
			"Obtener información innecesaria sobre mi antiguo contribuidor Ether"
	},
	"Get your own vanity URL in discord.wf format!": {
		ja: "discord.wf形式で自分のバニティURLを取得！",
		ru: "Получить вашу персональную ссылку в формате discord.wf!",
		"es-ES": "Obtener tu propia URL de vanidad en formato discord.wf!"
	},
	"Give ability to speak of all users in this text!": {
		ja: "このテキスト内の全ユーザーに発言権限を付与！",
		ru: "Дать возможность говорить всем в этом текстовом канале!",
		"es-ES": "Dar capacidad de hablar a todos los usuarios en este texto!"
	},
	"Give a role temporary to a server member": {
		ja: "サーバーメンバーに一時的にロールを付与",
		ru: "Временно выдать роль участнику сервера",
		"es-ES": "Dar un rol temporal a un miembro del servidor"
	},
	"Give a specific role to the user who pings me!": {
		ja: "ピンしたユーザーに特定のロールを付与！",
		ru: "Дать определенную роль тому, кто меня упомянет!",
		"es-ES": "Dar un rol específico al usuario que me mencione!"
	},
	"Give selected roles to a member through a panel": {
		ja: "パネルを通じて選択したロールをメンバーに付与",
		ru: "Выдать выбранные роли участнику через панель",
		"es-ES": "Dar roles seleccionados a un miembro a través de un panel"
	},
	"Hack a user!": {
		ja: "ユーザーをハッキング！",
		ru: "Взломать пользователя!",
		"es-ES": "Hackear a un usuario!"
	},
	"Heads or tail?": {
		ja: "表か裏か？",
		ru: "Орел или решка?",
		"es-ES": "Cara o cruz?"
	},
	"Help menu for og user lmao": {
		ja: "OGユーザー向けヘルプメニュー（笑）",
		ru: "Меню помощи для OG пользователей",
		"es-ES": "Menú de ayuda para usuario OG lol"
	},
	"Hide all channels in the server from everyone": {
		ja: "サーバー内の全チャンネルを全員から非表示",
		ru: "Скрыть все каналы от всех на сервере",
		"es-ES": "Ocultar todos los canales del servidor a todos"
	},
	"Hide the current channel from everyone": {
		ja: "現在のチャンネルを全員から非表示",
		ru: "Скрыть текущий канал от всех",
		"es-ES": "Ocultar el canal actual de todos"
	},
	"How much money you want to set": {
		ja: "設定したい金額",
		ru: "Сколько денег вы хотите установить",
		"es-ES": "Cuánto dinero quieres establecer"
	},
	"Hug a user!": {
		ja: "ユーザーをハグ！",
		ru: "Обнять пользователя!",
		"es-ES": "Abrazar a un usuario!"
	},
	"I have two sides meme generator": {
		ja: "i have two sides ミームジェネレーター",
		ru: "Генератор мема i have two sides",
		"es-ES": "Generador de meme i have two sides"
	},
	"ID of your panel": {
		ja: "パネルのID",
		ru: "ID вашей панели",
		"es-ES": "ID de tu panel"
	},
	"If you have an embed's ID!": {
		ja: "埋め込みのIDがある場合！",
		ru: "Если у вас есть ID эмбеда!",
		"es-ES": "Si tienes un ID de embed!"
	},
	"Ignore this channels in the AntiSpam Module": {
		ja: "アンチスパムモジュールでこのチャンネルを無視",
		ru: "Игнорировать эти каналы в модуле антиспама",
		"es-ES": "Ignorar estos canales en el módulo AntiSpam"
	},
	"Ignore this channels in the Ranks Module": {
		ja: "ランクモジュールでこのチャンネルを無視",
		ru: "Игнорировать эти каналы в модуле рангов",
		"es-ES": "Ignorar estos canales en el módulo de Rangos"
	},
	"Image file": {
		ja: "画像ファイル",
		ru: "Файл изображения",
		"es-ES": "Archivo de imagen"
	},
	"Image showed on the giveaway's embed": {
		ja: "ギブアウェイの埋め込みに表示される画像",
		ru: "Изображение в эмбеде розыгрыша",
		"es-ES": "Imagen mostrada en el embed del sorteo"
	},
	"Info of a tag": {
		ja: "タグの情報",
		ru: "Информация о теге",
		"es-ES": "Información de una etiqueta"
	},
	"Interaction between users": {
		ja: "ユーザー間の交流",
		ru: "Взаимодействие между пользователями",
		"es-ES": "Interacción entre usuarios"
	},
	"Is private ?": {
		ja: "非公開ですか？",
		ru: "Приватный?",
		"es-ES": "Es privado?"
	},
	"Javascript code": {
		ja: "JavaScriptコード",
		ru: "Код JavaScript",
		"es-ES": "Código JavaScript"
	},
	"Join the voice channel and enable TTS mode!": {
		ja: "ボイスチャンネルに参加してTTSモードを有効化！",
		ru: "Войти в голосовой канал и включить TTS!",
		"es-ES": "Unirse al canal de voz y habilitar el modo TTS!"
	},
	"Kawaeine meme generator": {
		ja: "kawaeine ミームジェネレーター",
		ru: "Генератор мема kawaeine",
		"es-ES": "Generador de meme kawaeine"
	},
	"Kick a user!": {
		ja: "ユーザーをキック！",
		ru: "Кикнуть пользователя!",
		"es-ES": "Expulsar a un usuario!"
	},
	"Kiss a user!": {
		ja: "ユーザーにキス！",
		ru: "Поцеловать пользователя!",
		"es-ES": "Besar a un usuario!"
	},
	"Leash a member in the guild": {
		ja: "サーバー内のメンバーをリードでつなぐ",
		ru: "Привязать участника на сервере",
		"es-ES": "Atar a un miembro en el servidor"
	},
	"Leave the voice channel and disable TTS mode!": {
		ja: "ボイスチャンネルから退出してTTSモードを無効化！",
		ru: "Выйти из голосового канала и отключить TTS!",
		"es-ES": "Salir del canal de voz y deshabilitar el modo TTS!"
	},
	"Let me rate the followed subject": {
		ja: "指定された対象を評価します",
		ru: "Позволь оценить указанный предмет",
		"es-ES": "Déjame calificar el tema indicado"
	},
	"Limit the number of member(s) in the same role": {
		ja: "同じロールのメンバー数を制限",
		ru: "Ограничить количество участников с одной ролью",
		"es-ES": "Limitar el número de miembros en el mismo rol"
	},
	"List all entries in giveaway!": {
		ja: "ギブアウェイの全エントリーを一覧表示！",
		ru: "Показать всех участников розыгрыша!",
		"es-ES": "Listar todas las entradas en el sorteo!"
	},
	"List all registered webhook on the server": {
		ja: "サーバーに登録された全Webhookを一覧表示",
		ru: "Показать все вебхуки на сервере",
		"es-ES": "Listar todos los webhooks registrados en el servidor"
	},
	"List all roles that you can buy!": {
		ja: "購入可能な全ロールを一覧表示！",
		ru: "Показать все роли, которые можно купить!",
		"es-ES": "Listar todos los roles que puedes comprar!"
	},
	"List all sticky channels": {
		ja: "全固定チャンネルを一覧表示",
		ru: "Показать все закрепленные каналы",
		"es-ES": "Listar todos los canales fijos"
	},
	"List all tags": {
		ja: "全タグを一覧表示",
		ru: "Показать все теги",
		"es-ES": "Listar todas las etiquetas"
	},
	"List the users in the allowlist!": {
		ja: "許可リストのユーザーを一覧表示！",
		ru: "Показать пользователей в белом списке!",
		"es-ES": "Listar los usuarios en la lista de permitidos!"
	},
	"List your backup(s)!": {
		ja: "バックアップを一覧表示！",
		ru: "Показать ваши резервные копии!",
		"es-ES": "Listar tus copias de seguridad!"
	},
	"Load your backup to initialize!": {
		ja: "バックアップを読み込んで初期化！",
		ru: "Загрузить резервную копию для инициализации!",
		"es-ES": "Cargar tu copia de seguridad para inicializar!"
	},
	"Login to Last.fm and store your scrobbling session.": {
		ja: "Last.fmにログインしてスクロブルセッションを保存。",
		ru: "Войти в Last.fm и сохранить сессию скробблинга.",
		"es-ES": "Iniciar sesión en Last.fm y guardar tu sesión de scrobbling."
	},
	"Loop Type": {
		ja: "ループタイプ",
		ru: "Тип повтора",
		"es-ES": "Tipo de bucle"
	},
	"Make a dice roll": {
		ja: "サイコロを振る",
		ru: "Бросить кости",
		"es-ES": "Hacer una tirada de dado"
	},
	"Make a status embed about iHorizon": {
		ja: "iHorizonのステータス埋め込みを作成",
		ru: "Создать эмбед статуса iHorizon",
		"es-ES": "Hacer un embed de estado sobre iHorizon"
	},
	"Making a panel for custom ticket configuration": {
		ja: "カスタムチケット設定用パネルを作成",
		ru: "Создание панели для настройки тикетов",
		"es-ES": "Crear un panel para configuración de tickets personalizada"
	},
	"Manage command rate limits": {
		ja: "コマンドのレート制限を管理",
		ru: "Управление лимитами команд",
		"es-ES": "Gestionar límites de velocidad de comandos"
	},
	"Manager for schedule category!": {
		ja: "スケジュールカテゴリの管理！",
		ru: "Управление категорией расписания!",
		"es-ES": "Gestor para la categoría de horarios!"
	},
	"Manage sticky messages in text channels": {
		ja: "テキストチャンネルの固定メッセージを管理",
		ru: "Управление закрепленными сообщениями",
		"es-ES": "Gestionar mensajes fijos en canales de texto"
	},
	"Manage the antispam module": {
		ja: "アンチスパムモジュールを管理",
		ru: "Управление модулем антиспама",
		"es-ES": "Gestionar el módulo antispam"
	},
	"Manage the backup system into this guild": {
		ja: "このサーバーのバックアップシステムを管理",
		ru: "Управление системой резервного копирования",
		"es-ES": "Gestionar el sistema de copias de seguridad en este servidor"
	},
	"Manage the cooldown of the actions!": {
		ja: "アクションのクールダウンを管理！",
		ru: "Управление задержкой действий!",
		"es-ES": "Gestionar el enfriamiento de las acciones!"
	},
	"Manage voice's interface": {
		ja: "ボイスインターフェースを管理",
		ru: "Управление голосовым интерфейсом",
		"es-ES": "Gestionar la interfaz de voz"
	},
	"Mass action about unban": {
		ja: "一斉バン解除アクション",
		ru: "Массовое действие по разбану",
		"es-ES": "Acción masiva sobre desbaneo"
	},
	"Maximum join before ban": {
		ja: "バン前の最大参加回数",
		ru: "Максимум входов до бана",
		"es-ES": "Máximo de uniones antes del ban"
	},
	"Maximum number of uses in the window": {
		ja: "ウィンドウ内の最大使用回数",
		ru: "Максимальное количество использований в окне",
		"es-ES": "Número máximo de usos en la ventana"
	},
	"Maximum value": {
		ja: "最大値",
		ru: "Максимальное значение",
		"es-ES": "Valor máximo"
	},
	"Member you want": {
		ja: "対象のメンバー",
		ru: "Участник, которого вы хотите",
		"es-ES": "Miembro que deseas"
	},
	"Member you want to leash": {
		ja: "リードでつなぎたいメンバー",
		ru: "Участник для привязки",
		"es-ES": "Miembro que quieres atar"
	},
	"Member you want to unleash": {
		ja: "リードを外したいメンバー",
		ru: "Участник для отвязки",
		"es-ES": "Miembro que quieres desatar"
	},
	"Mention the user": {
		ja: "ユーザーにメンション",
		ru: "Упомянуть пользователя",
		"es-ES": "Mencionar al usuario"
	},
	"Message ID to configure role selection": {
		ja: "ロール選択を設定するメッセージID",
		ru: "ID сообщения для настройки выбора ролей",
		"es-ES": "ID del mensaje para configurar la selección de roles"
	},
	"Message's ID to reply": {
		ja: "返信するメッセージのID",
		ru: "ID сообщения для ответа",
		"es-ES": "ID del mensaje para responder"
	},
	"Message with the embed": {
		ja: "埋め込み付きメッセージ",
		ru: "Сообщение с эмбедом",
		"es-ES": "Mensaje con el embed"
	},
	"Minimum seniority time": {
		ja: "最低アカウント経過時間",
		ru: "Минимальное время существования аккаунта",
		"es-ES": "Tiempo mínimo de antigüedad"
	},
	"Minimum value": {
		ja: "最小値",
		ru: "Минимальное значение",
		"es-ES": "Valor mínimo"
	},
	"Move an user from voice-channel.": {
		ja: "ユーザーをボイスチャンネルから移動。",
		ru: "Переместить пользователя из голосового канала.",
		"es-ES": "Mover a un usuario de un canal de voz."
	},
	"Name of the tag": {
		ja: "タグの名前",
		ru: "Название тега",
		"es-ES": "Nombre de la etiqueta"
	},
	"Number of dice to roll": {
		ja: "振るサイコロの数",
		ru: "Количество костей",
		"es-ES": "Número de dados a lanzar"
	},
	"Number of faces on the dice": {
		ja: "サイコロの面の数",
		ru: "Количество граней кости",
		"es-ES": "Número de caras del dado"
	},
	"Number of invites you want to add": {
		ja: "追加したい招待数",
		ru: "Количество приглашений для добавления",
		"es-ES": "Número de invitaciones que quieres añadir"
	},
	"Number of invites you want to substract": {
		ja: "減らしたい招待数",
		ru: "Количество приглашений для вычитания",
		"es-ES": "Número de invitaciones que quieres restar"
	},
	"Number of winner for the giveaways": {
		ja: "ギブアウェイの当選者数",
		ru: "Количество победителей розыгрыша",
		"es-ES": "Número de ganadores del sorteo"
	},
	"Optional text content sent with the embed": {
		ja: "埋め込みと共に送信するオプションのテキスト",
		ru: "Дополнительный текст с эмбедом",
		"es-ES": "Contenido de texto opcional enviado con el embed"
	},
	"Pause the current playing song!": {
		ja: "現在再生中の曲を一時停止！",
		ru: "Поставить текущую песню на паузу!",
		"es-ES": "Pausar la canción actual!"
	},
	"Pay a user a certain amount!": {
		ja: "ユーザーに特定の金額を支払う！",
		ru: "Заплатить пользователю определенную сумму!",
		"es-ES": "Pagar a un usuario una cierta cantidad!"
	},
	"Permission level to edit": {
		ja: "編集する権限レベル",
		ru: "Уровень разрешений для редактирования",
		"es-ES": "Nivel de permiso a editar"
	},
	"Permission you want to set for the member": {
		ja: "メンバーに設定したい権限",
		ru: "Разрешение, которое вы хотите установить",
		"es-ES": "Permiso que quieres establecer para el miembro"
	},
	"Permit to send custom tweet !": {
		ja: "カスタムツイートを送信可能に！",
		ru: "Разрешить отправку пользовательского твита!",
		"es-ES": "Permitir enviar tweet personalizado!"
	},
	"Pick the avatar of a user!": {
		ja: "ユーザーのアバターを取得！",
		ru: "Взять аватар пользователя!",
		"es-ES": "Tomar el avatar de un usuario!"
	},
	"Pick the banner of specified things (Server/User)": {
		ja: "指定されたもののバナーを取得（サーバー/ユーザー）",
		ru: "Взять баннер указанного объекта (Сервер/Пользователь)",
		"es-ES": "Tomar el banner de cosas especificadas (Servidor/Usuario)"
	},
	"Play a song!": {
		ja: "曲を再生！",
		ru: "Воспроизвести песню!",
		"es-ES": "Reproducir una canción!"
	},
	"Please make your choice.": {
		ja: "選択してください。",
		ru: "Пожалуйста, сделайте выбор.",
		"es-ES": "Por favor, haz tu elección."
	},
	"Power On or Power Off": {
		ja: "オンまたはオフ",
		ru: "Включить или Выключить",
		"es-ES": "Encender o Apagar"
	},
	"Power On or Power Off the module": {
		ja: "モジュールをオンまたはオフ",
		ru: "Включить или выключить модуль",
		"es-ES": "Encender o Apagar el módulo"
	},
	"Pronoun that fits you the most": {
		ja: "最も合う代名詞",
		ru: "Местоимение, которое вам подходит",
		"es-ES": "Pronombre que más te queda"
	},
	"Punish user when he send too much advertisement!": {
		ja: "広告を送りすぎたユーザーを罰する！",
		ru: "Наказать пользователя за чрезмерную рекламу!",
		"es-ES": "Castigar al usuario cuando envía demasiada publicidad!"
	},
	"Rap vs reality meme generator": {
		ja: "rap vs reality ミームジェネレーター",
		ru: "Генератор мема rap vs reality",
		"es-ES": "Generador de meme rap vs reality"
	},
	"Re-gave Administrator role ?": {
		ja: "管理者ロールを再付与しますか？",
		ru: "Заново выдать роль администратора?",
		"es-ES": "Volver a dar el rol de administrador?"
	},
	"Re-Gave old roles when User re-join the guild!": {
		ja: "ユーザーが再参加した時に以前のロールを再付与！",
		ru: "Вернуть старые роли при повторном входе!",
		"es-ES":
			"Volver a dar roles antiguos cuando el usuario se reúne al servidor!"
	},
	"...": { ja: "...", ru: "...", "es-ES": "..." },
	"Recreate all emojis from a zip file": {
		ja: "ZIPファイルから全絵文字を再作成",
		ru: "Воссоздать все эмодзи из ZIP-файла",
		"es-ES": "Recrear todos los emojis desde un archivo zip"
	},
	"Remove Streamer/Youtuber/Twitcher": {
		ja: "ストリーマー/YouTuber/Twitcherを削除",
		ru: "Удалить стримера/YouTube/Twitch",
		"es-ES": "Eliminar Streamer/Youtuber/Twitcher"
	},
	"Remove a blog RSS feed": {
		ja: "ブログのRSSフィードを削除",
		ru: "Удалить RSS-ленту блога",
		"es-ES": "Eliminar un feed RSS de blog"
	},
	"Remove a member from your ticket!": {
		ja: "チケットからメンバーを削除！",
		ru: "Удалить участника из тикета!",
		"es-ES": "Eliminar a un miembro de tu ticket!"
	},
	"Remove all roles of an members": {
		ja: "メンバーの全ロールを削除",
		ru: "Удалить все роли у участников",
		"es-ES": "Eliminar todos los roles de los miembros"
	},
	"Remove invites from a user!": {
		ja: "ユーザーから招待を削除！",
		ru: "Удалить приглашения у пользователя!",
		"es-ES": "Eliminar invitaciones de un usuario!"
	},
	"Remove money from a user!": {
		ja: "ユーザーからお金を削除！",
		ru: "Убрать деньги у пользователя!",
		"es-ES": "Quitar dinero a un usuario!"
	},
	"Remove reaction by iHorizon when user send message": {
		ja: "ユーザーがメッセージを送信した時のiHorizonのリアクションを削除",
		ru: "Удалить реакцию iHorizon при отправке сообщения",
		"es-ES":
			"Eliminar reacción de iHorizon cuando el usuario envía un mensaje"
	},
	"Remove the active voice freeze": {
		ja: "アクティブなボイス凍結を解除",
		ru: "Снять активную заморозку голосового канала",
		"es-ES": "Eliminar la congelación de voz activa"
	},
	"Remove role to user": {
		ja: "ユーザーからロールを削除",
		ru: "Удалить роль у пользователя",
		"es-ES": "Quitar rol al usuario"
	},
	"Removed the cooldown on the current channel": {
		ja: "現在のチャンネルのクールダウンを解除",
		ru: "Снять задержку с текущего канала",
		"es-ES": "Eliminar el enfriamiento en el canal actual"
	},
	"Removing an user in the allowlist!": {
		ja: "許可リストからユーザーを削除！",
		ru: "Удалить пользователя из белого списка!",
		"es-ES": "Eliminando un usuario de la lista de permitidos!"
	},
	"Renew automaticaly X time a channel": {
		ja: "チャンネルを自動的にX回更新",
		ru: "Автоматически обновлять канал X раз",
		"es-ES": "Renovar automáticamente un canal X veces"
	},
	"Rename a ticket!": {
		ja: "チケットの名前を変更！",
		ru: "Переименовать тикет!",
		"es-ES": "Renombrar un ticket!"
	},
	"Re-open a closed ticket!": {
		ja: "閉じたチケットを再オープン！",
		ru: "Переоткрыть закрытый тикет!",
		"es-ES": "Reabrir un ticket cerrado!"
	},
	"Reply to the suggestion (need admin permission)!": {
		ja: "提案に返信（管理者権限が必要）！",
		ru: "Ответить на предложение (требуются права администратора)!",
		"es-ES":
			"Responder a la sugerencia (requiere permiso de administrador)!"
	},
	"Report a bug, error, spell error to the iHorizon's dev!": {
		ja: "バグ、エラー、スペルミスをiHorizonの開発者に報告！",
		ru: "Сообщить об ошибке разработчикам iHorizon!",
		"es-ES":
			"Reportar un bug, error o falta de ortografía a los desarrolladores de iHorizon!"
	},
	"Repost the sticky message in one channel": {
		ja: "1つのチャンネルで固定メッセージを再投稿",
		ru: "Переотправить закрепленное сообщение в канале",
		"es-ES": "Volver a publicar el mensaje fijo en un canal"
	},
	"Reroll a giveaway winner(s)!": {
		ja: "ギブアウェイの当選者を再抽選！",
		ru: "Перевыбрать победителя(ей) розыгрыша!",
		"es-ES": "Volver a sortear ganador(es) del sorteo!"
	},
	"Reset profil": {
		ja: "プロフィールをリセット",
		ru: "Сбросить профиль",
		"es-ES": "Restablecer perfil"
	},
	"Reset the balance of an user": {
		ja: "ユーザーの残高をリセット",
		ru: "Сбросить баланс пользователя",
		"es-ES": "Restablecer el saldo de un usuario"
	},
	"Reset the economy balance of every user in the guild": {
		ja: "サーバー内の全ユーザーの経済残高をリセット",
		ru: "Сбросить баланс всех пользователей на сервере",
		"es-ES":
			"Restablecer el saldo de economía de todos los usuarios del servidor"
	},
	"Reset the ranks level of an user": {
		ja: "ユーザーのランクレベルをリセット",
		ru: "Сбросить уровень ранга пользователя",
		"es-ES": "Restablecer el nivel de rango de un usuario"
	},
	"Reset the ranks level of every user in the guild": {
		ja: "サーバー内の全ユーザーのランクレベルをリセット",
		ru: "Сбросить уровень ранга всех пользователей",
		"es-ES": "Restablecer el nivel de rango de cada usuario en el servidor"
	},
	"Restore an backup": {
		ja: "バックアップを復元",
		ru: "Восстановить резервную копию",
		"es-ES": "Restaurar una copia de seguridad"
	},
	"Resume the current playing song!": {
		ja: "現在再生中の曲を再開！",
		ru: "Возобновить текущую песню!",
		"es-ES": "Reanudar la canción actual!"
	},
	"Rob a user!": {
		ja: "ユーザーから奪う！",
		ru: "Ограбить пользователя!",
		"es-ES": "Robar a un usuario!"
	},
	"Role Permission to edit": {
		ja: "編集するロール権限",
		ru: "Разрешение роли для редактирования",
		"es-ES": "Permiso de rol a editar"
	},
	"Roles whitelist for creating tags": {
		ja: "タグ作成用のホワイトリストロール",
		ru: "Белый список ролей для создания тегов",
		"es-ES": "Roles de lista blanca para crear etiquetas"
	},
	"Roles whitelist for using tags": {
		ja: "タグ使用用のホワイトリストロール",
		ru: "Белый список ролей для использования тегов",
		"es-ES": "Roles de lista blanca para usar etiquetas"
	},
	"Run Javascript program (only for developers)!": {
		ja: "JavaScriptプログラムを実行（開発者のみ）！",
		ru: "Запустить программу JavaScript (только для разработчиков)!",
		"es-ES": "Ejecutar programa Javascript (solo para desarrolladores)!"
	},
	"Save a backup": {
		ja: "バックアップを保存",
		ru: "Сохранить резервную копию",
		"es-ES": "Guardar una copia de seguridad"
	},
	"Search a music into the Internet": {
		ja: "インターネットで音楽を検索",
		ru: "Искать музыку в интернете",
		"es-ES": "Buscar música en Internet"
	},
	"Search the command or subcommand": {
		ja: "コマンドまたはサブコマンドを検索",
		ru: "Искать команду или подкоманду",
		"es-ES": "Buscar el comando o subcomando"
	},
	"Second user to compare": {
		ja: "比較する2人目のユーザー",
		ru: "Второй пользователь для сравнения",
		"es-ES": "Segundo usuario a comparar"
	},
	"Secure webhook": {
		ja: "Webhookを保護",
		ru: "Защитить вебхук",
		"es-ES": "Asegurar webhook"
	},
	"See all server member(s) who have the same roles": {
		ja: "同じロールを持つ全サーバーメンバーを表示",
		ru: "Показать участников с одинаковыми ролями",
		"es-ES":
			"Ver todos los miembros del servidor que tienen los mismos roles"
	},
	"See guild leaderboard": {
		ja: "サーバーランキングを表示",
		ru: "Показать таблицу лидеров сервера",
		"es-ES": "Ver tabla de clasificación del servidor"
	},
	"See profil": {
		ja: "プロフィールを表示",
		ru: "Посмотреть профиль",
		"es-ES": "Ver perfil"
	},
	"See statistics for a specific channel": {
		ja: "特定のチャンネルの統計を表示",
		ru: "Посмотреть статистику канала",
		"es-ES": "Ver estadísticas de un canal específico"
	},
	"See the iHorizon's profil of the member!": {
		ja: "メンバーのiHorizonプロフィールを表示！",
		ru: "Посмотреть профиль iHorizon участника!",
		"es-ES": "Ver el perfil de iHorizon del miembro!"
	},
	"See top users by messages": {
		ja: "メッセージ数トップユーザーを表示",
		ru: "Показать топ пользователей по сообщениям",
		"es-ES": "Ver usuarios top por mensajes"
	},
	"See top users by voice activity": {
		ja: "ボイスアクティビティトップユーザーを表示",
		ru: "Показать топ пользователей по голосовой активности",
		"es-ES": "Ver usuarios top por actividad de voz"
	},
	"Send a 67 gif": {
		ja: "67のGIFを送信",
		ru: "Отправить гифку 67",
		"es-ES": "Enviar un gif de 67"
	},
	"Send a private message to the user1": {
		ja: "ユーザー1にプライベートメッセージを送信",
		ru: "Отправить личное сообщение пользователю1",
		"es-ES": "Enviar un mensaje privado al usuario1"
	},
	"Sending random user avatar in channel!": {
		ja: "ランダムなユーザーアバターをチャンネルに送信！",
		ru: "Отправить случайный аватар в канал!",
		"es-ES": "Enviar avatar de usuario aleatorio en el canal!"
	},
	"Sending the channel where the members is": {
		ja: "メンバーがいるチャンネルを送信",
		ru: "Отправить канал, где находится участник",
		"es-ES": "Enviar el canal donde está el miembro"
	},
	"Sending the guild image": {
		ja: "サーバー画像を送信",
		ru: "Отправить изображение сервера",
		"es-ES": "Enviar la imagen del servidor"
	},
	"Sent a message throught the bot!": {
		ja: "ボットを通じてメッセージを送信！",
		ru: "Отправить сообщение через бота!",
		"es-ES": "Enviar un mensaje a través del bot!"
	},
	"Sent specified emoji when new message in specified channel": {
		ja: "指定チャンネルの新規メッセージに指定絵文字を送信",
		ru: "Отправить эмодзи при новом сообщении в канале",
		"es-ES":
			"Enviar emoji especificado cuando haya nuevo mensaje en el canal especificado"
	},
	"Set a cooldown in the current channel": {
		ja: "現在のチャンネルにクールダウンを設定",
		ru: "Установить задержку в текущем канале",
		"es-ES": "Establecer un enfriamiento en el canal actual"
	},
	"Set a custom message when user earn level": {
		ja: "ユーザーがレベルアップした時のカスタムメッセージを設定",
		ru: "Установить сообщение при повышении уровня",
		"es-ES":
			"Establecer un mensaje personalizado cuando el usuario gana nivel"
	},
	"Set a join message when user join the guild!": {
		ja: "ユーザーがサーバーに参加した時の参加メッセージを設定！",
		ru: "Установить приветственное сообщение!",
		"es-ES":
			"Establecer un mensaje de bienvenida cuando el usuario se une al servidor!"
	},
	"Set a join roles when user join the guild!": {
		ja: "ユーザーがサーバーに参加した時の参加ロールを設定！",
		ru: "Установить роли при входе на сервер!",
		"es-ES":
			"Establecer roles de bienvenida cuando el usuario se une al servidor!"
	},
	"Set a leave message when user leave the guild!": {
		ja: "ユーザーがサーバーを退出した時の退出メッセージを設定！",
		ru: "Установить прощальное сообщение!",
		"es-ES":
			"Establecer un mensaje de despedida cuando el usuario sale del servidor!"
	},
	"Set a logs channel for Audits Logs!": {
		ja: "監査ログ用のログチャンネルを設定！",
		ru: "Установить канал для аудита!",
		"es-ES":
			"Establecer un canal de registros para los registros de auditoría!"
	},
	"Set a member count channels!": {
		ja: "メンバーカウントチャンネルを設定！",
		ru: "Установить каналы счетчика участников!",
		"es-ES": "Establecer canales de conteo de miembros!"
	},
	"Set a money boost for a certain role!": {
		ja: "特定のロールにマネーブーストを設定！",
		ru: "Установить денежный бонус для роли!",
		"es-ES": "Establecer un impulso de dinero para un cierto rol!"
	},
	"Set a role for a certain amount of money!": {
		ja: "特定の金額でロールを設定！",
		ru: "Установить роль за определенную сумму!",
		"es-ES": "Establecer un rol por una cierta cantidad de dinero!"
	},
	"Set a roles when user react to a button with specific emoji": {
		ja: "特定の絵文字でボタンにリアクションした時にロールを設定",
		ru: "Установить роли при реакции на кнопку с эмодзи",
		"es-ES":
			"Establecer roles cuando el usuario reacciona a un botón con emoji específico"
	},
	"Set a roles when user react to a message with specific emoji": {
		ja: "特定の絵文字でメッセージにリアクションした時にロールを設定",
		ru: "Установить роли при реакции на сообщение с эмодзи",
		"es-ES":
			"Establecer roles cuando el usuario reacciona a un mensaje con emoji específico"
	},
	"Set a specific permission to use one command": {
		ja: "1つのコマンドを使用するための特定の権限を設定",
		ru: "Установить разрешение для использования команды",
		"es-ES": "Establecer un permiso específico para usar un comando"
	},
	"Set all the logs channel automaticaly": {
		ja: "全ログチャンネルを自動設定",
		ru: "Автоматически настроить все каналы логов",
		"es-ES": "Establecer todos los canales de registro automáticamente"
	},
	"Set loop mode of the guild!": {
		ja: "サーバーのループモードを設定！",
		ru: "Установить режим повтора на сервере!",
		"es-ES": "Establecer el modo de bucle del servidor!"
	},
	"Set new roles for the AuthRestore module": {
		ja: "AuthRestoreモジュールの新しいロールを設定",
		ru: "Установить новые роли для модуля AuthRestore",
		"es-ES": "Establecer nuevos roles para el módulo AuthRestore"
	},
	"Set permission to user": {
		ja: "ユーザーに権限を設定",
		ru: "Установить разрешения пользователю",
		"es-ES": "Establecer permiso al usuario"
	},
	"Set someting/behaviours in the bot!": {
		ja: "ボット内の何か/行動を設定！",
		ru: "Установить что-либо в боте!",
		"es-ES": "Establecer algo/comportamientos en el bot!"
	},
	"Set someting/behaviours into this guild!": {
		ja: "このサーバー内の何か/行動を設定！",
		ru: "Установить что-либо на этом сервере!",
		"es-ES": "Establecer algo/comportamientos en este servidor!"
	},
	"Set the autorole": {
		ja: "自動ロールを設定",
		ru: "Установить автороль",
		"es-ES": "Establecer el autorol"
	},
	"Set the category where ticket are create!": {
		ja: "チケットが作成されるカテゴリを設定！",
		ru: "Установить категорию для создания тикетов!",
		"es-ES": "Establecer la categoría donde se crean los tickets!"
	},
	"Set the channel for Join4Create!": {
		ja: "Join4Createのチャンネルを設定！",
		ru: "Установить канал для Join4Create!",
		"es-ES": "Establecer el canal para Join4Create!"
	},
	"Set the channel where the bot will send message when user leave/join guild!":
		{
			ja: "ユーザーの参加/退出時にボットがメッセージを送信するチャンネルを設定！",
			ru: "Установить канал для сообщений о входе/выходе!",
			"es-ES":
				"Establecer el canal donde el bot enviará mensajes cuando un usuario salga/se una al servidor!"
		},
	"Set the confession module's channel!": {
		ja: "告白モジュールのチャンネルを設定！",
		ru: "Установить канал модуля признаний!",
		"es-ES": "Establecer el canal del módulo de confesiones!"
	},
	"Set the counter module's channel!": {
		ja: "カウンターモジュールのチャンネルを設定！",
		ru: "Установить канал модуля счетчика!",
		"es-ES": "Establecer el canal del módulo contador!"
	},
	"Set the current message for AuthRestore button": {
		ja: "AuthRestoreボタン用の現在のメッセージを設定",
		ru: "Установить текущее сообщение для кнопки AuthRestore",
		"es-ES": "Establecer el mensaje actual para el botón AuthRestore"
	},
	"Set the default TTS language for the guild!": {
		ja: "サーバーのデフォルトTTS言語を設定！",
		ru: "Установить язык TTS по умолчанию!",
		"es-ES": "Establecer el idioma TTS predeterminado para el servidor!"
	},
	"Set the join dm message !": {
		ja: "参加DMメッセージを設定！",
		ru: "Установить приветственное сообщение в ЛС!",
		"es-ES": "Establecer el mensaje de DM de bienvenida!"
	},
	"Set the join message !": {
		ja: "参加メッセージを設定！",
		ru: "Установить приветственное сообщение!",
		"es-ES": "Establecer el mensaje de bienvenida!"
	},
	"Set the leave message !": {
		ja: "退出メッセージを設定！",
		ru: "Установить прощальное сообщение!",
		"es-ES": "Establecer el mensaje de despedida!"
	},
	"Set the pfps module's channel!": {
		ja: "PFPSモジュールのチャンネルを設定！",
		ru: "Установить канал модуля PFPS!",
		"es-ES": "Establecer el canal del módulo PFPS!"
	},
	"Set the server language!": {
		ja: "サーバーの言語を設定！",
		ru: "Установить язык сервера!",
		"es-ES": "Establecer el idioma del servidor!"
	},
	"Set the welcomer module !": {
		ja: "ウェルカマーモジュールを設定！",
		ru: "Настроить модуль приветствия!",
		"es-ES": "Establecer el módulo de bienvenida!"
	},
	"Setup the logs channel about the bot!": {
		ja: "ボットのログチャンネルを設定！",
		ru: "Настроить канал логов бота!",
		"es-ES": "Configurar el canal de registros sobre el bot!"
	},
	"Set your age on the iHorizon's Profil !": {
		ja: "iHorizonプロフィールに年齢を設定！",
		ru: "Установить возраст в профиле iHorizon!",
		"es-ES": "Establecer tu edad en el perfil de iHorizon!"
	},
	"Set your birthday on the iHorizon's Profil!": {
		ja: "iHorizonプロフィールに誕生日を設定！",
		ru: "Установить день рождения в профиле iHorizon!",
		"es-ES": "Establecer tu cumpleaños en el perfil de iHorizon!"
	},
	"Set your description on the iHorizon's Profil!": {
		ja: "iHorizonプロフィールに説明を設定！",
		ru: "Установить описание в профиле iHorizon!",
		"es-ES": "Establecer tu descripción en el perfil de iHorizon!"
	},
	"Set your gender on the iHorizon's Profil!": {
		ja: "iHorizonプロフィールに性別を設定！",
		ru: "Установить пол в профиле iHorizon!",
		"es-ES": "Establecer tu género en el perfil de iHorizon!"
	},
	"Set your pronoun on the iHorizon's Profil!": {
		ja: "iHorizonプロフィールに代名詞を設定！",
		ru: "Установить местоимение в профиле iHorizon!",
		"es-ES": "Establecer tu pronombre en el perfil de iHorizon!"
	},
	"Show a list with all banned member": {
		ja: "バンされた全メンバーのリストを表示",
		ru: "Показать список забаненных участников",
		"es-ES": "Mostrar una lista con todos los miembros baneados"
	},
	"Show a list with all muted member": {
		ja: "ミュートされた全メンバーのリストを表示",
		ru: "Показать список замученных участников",
		"es-ES": "Mostrar una lista con todos los miembros silenciados"
	},
	"Show all configured blog RSS feeds": {
		ja: "設定された全ブログRSSフィードを表示",
		ru: "Показать все настроенные RSS-ленты блогов",
		"es-ES": "Mostrar todos los feeds RSS de blog configurados"
	},
	"Show all granted user in the guild": {
		ja: "サーバー内の権限付与ユーザーを全て表示",
		ru: "Показать всех пользователей с правами",
		"es-ES": "Mostrar todos los usuarios con permisos en el servidor"
	},
	"Show all links about iHorizon": {
		ja: "iHorizonに関する全リンクを表示",
		ru: "Показать все ссылки iHorizon",
		"es-ES": "Mostrar todos los enlaces sobre iHorizon"
	},
	"Show all specific messages saved to be react": {
		ja: "リアクション用に保存された全特定メッセージを表示",
		ru: "Показать сохраненные сообщения для реакций",
		"es-ES":
			"Mostrar todos los mensajes específicos guardados para reaccionar"
	},
	"Show all warns of a user": {
		ja: "ユーザーの全警告を表示",
		ru: "Показать все предупреждения пользователя",
		"es-ES": "Mostrar todas las advertencias de un usuario"
	},
	"Show how gay you are": {
		ja: "あなたのゲイ度を表示",
		ru: "Показать, насколько вы гей",
		"es-ES": "Mostrar qué tan gay eres"
	},
	"Show how much stench you are": {
		ja: "あなたの臭さ度を表示",
		ru: "Показать, насколько вы вонючий",
		"es-ES": "Mostrar qué tan apestoso eres"
	},
	"Show how trans you are": {
		ja: "あなたのトランス度を表示",
		ru: "Показать, насколько вы транс",
		"es-ES": "Mostrar qué tan trans eres"
	},
	"Show informations about blacklisted user!": {
		ja: "ブラックリストユーザーの情報を表示！",
		ru: "Показать информацию о пользователе в черном списке!",
		"es-ES": "Mostrar información sobre el usuario en la lista negra!"
	},
	"Show mode (large, brief)": {
		ja: "表示モード（大、簡易）",
		ru: "Режим отображения (большой, краткий)",
		"es-ES": "Modo de visualización (grande, breve)"
	},
	"Show our best partner": {
		ja: "最高のパートナーを表示",
		ru: "Показать нашего лучшего партнера",
		"es-ES": "Mostrar nuestro mejor socio"
	},
	"Show Streamer/Youtuber/Twitcher": {
		ja: "ストリーマー/YouTuber/Twitcherを表示",
		ru: "Показать стримера/YouTube/Twitch",
		"es-ES": "Mostrar Streamer/Youtuber/Twitcher"
	},
	"Show the guild invites's leaderboard!": {
		ja: "サーバー招待ランキングを表示！",
		ru: "Показать таблицу лидеров по приглашениям!",
		"es-ES":
			"Mostrar la tabla de clasificación de invitaciones del servidor!"
	},
	"Show the sticky configuration of one channel": {
		ja: "1つのチャンネルの固定設定を表示",
		ru: "Показать конфигурацию закрепленных сообщений канала",
		"es-ES": "Mostrar la configuración fija de un canal"
	},
	"Show your love compatibilty with the user!": {
		ja: "ユーザーとの恋愛相性を表示！",
		ru: "Показать совместимость в любви с пользователем!",
		"es-ES": "Mostrar tu compatibilidad amorosa con el usuario!"
	},
	"Shuffle the queue!": {
		ja: "キューをシャッフル！",
		ru: "Перемешать очередь!",
		"es-ES": "Mezclar la cola!"
	},
	"Skip the current playing song!": {
		ja: "現在再生中の曲をスキップ！",
		ru: "Пропустить текущую песню!",
		"es-ES": "Saltar la canción actual!"
	},
	"Slap a user!": {
		ja: "ユーザーを平手打ち！",
		ru: "Дать пощечину пользователю!",
		"es-ES": "Abofetear a un usuario!"
	},
	"Specified logs category": {
		ja: "指定されたログカテゴリ",
		ru: "Указанная категория логов",
		"es-ES": "Categoría de registros especificada"
	},
	"Start a giveaway!": {
		ja: "ギブアウェイを開始！",
		ru: "Начать розыгрыш!",
		"es-ES": "Iniciar un sorteo!"
	},
	"Stop the current playing song!": {
		ja: "現在再生中の曲を停止！",
		ru: "Остановить текущую песню!",
		"es-ES": "Detener la canción actual!"
	},
	"Streamer/Youtuber/Twitcher manipulation": {
		ja: "ストリーマー/YouTuber/Twitcherの操作",
		ru: "Управление стримерами/YouTube/Twitch",
		"es-ES": "Manipulación de Streamer/Youtuber/Twitcher"
	},
	"Subcommand category for blogger RSS feeds!": {
		ja: "ブロガーRSSフィードのサブコマンドカテゴリ！",
		ru: "Категория подкоманд для RSS-лент блога!",
		"es-ES": "Categoría de subcomando para feeds RSS de blogger!"
	},
	"Subcommand category for notifier!": {
		ja: "通知のサブコマンドカテゴリ！",
		ru: "Категория подкоманд для уведомлений!",
		"es-ES": "Categoría de subcomando para notificador!"
	},
	"SubCommand category for utils command": {
		ja: "ユーティリティコマンドのサブコマンドカテゴリ",
		ru: "Категория подкоманд для утилит",
		"es-ES": "Categoría de subcomando para comandos de utilidad"
	},
	"Subcommand for antispam category!": {
		ja: "アンチスパムカテゴリのサブコマンド！",
		ru: "Подкоманда для категории антиспама!",
		"es-ES": "Subcomando para la categoría antispam!"
	},
	"Subcommand for automod category!": {
		ja: "オートモデレーションカテゴリのサブコマンド！",
		ru: "Подкоманда для категории автомода!",
		"es-ES": "Subcomando para la categoría automod!"
	},
	"Subcommand for backup category!": {
		ja: "バックアップカテゴリのサブコマンド！",
		ru: "Подкоманда для категории резервного копирования!",
		"es-ES": "Subcomando para la categoría de copias de seguridad!"
	},
	"Subcommand for command permission!": {
		ja: "コマンド権限のサブコマンド！",
		ru: "Подкоманда для разрешений команд!",
		"es-ES": "Subcomando para permisos de comando!"
	},
	"Subcommand for confession category!": {
		ja: "告白カテゴリのサブコマンド！",
		ru: "Подкоманда для категории признаний!",
		"es-ES": "Subcomando para la categoría de confesiones!"
	},
	"Subcommand for economy category!": {
		ja: "経済カテゴリのサブコマンド！",
		ru: "Подкоманда для категории экономики!",
		"es-ES": "Subcomando para la categoría de economía!"
	},
	"Subcommand for fun category!": {
		ja: "Funカテゴリのサブコマンド！",
		ru: "Подкоманда для категории развлечений!",
		"es-ES": "Subcomando para la categoría de diversión!"
	},
	"Subcommand for giveaway category!": {
		ja: "ギブアウェイカテゴリのサブコマンド！",
		ru: "Подкоманда для категории розыгрышей!",
		"es-ES": "Subcomando para la categoría de sorteos!"
	},
	"Subcommand for guildconfig category!": {
		ja: "サーバー設定カテゴリのサブコマンド！",
		ru: "Подкоманда для категории настройки сервера!",
		"es-ES": "Subcomando para la categoría de configuración del servidor!"
	},
	"Subcommand for honeypot configuration!": {
		ja: "ハニーポット設定のサブコマンド！",
		ru: "Подкоманда для настройки Honeypot!",
		"es-ES": "Subcomando para la configuración de honeypot!"
	},
	"Subcommand for iHorizon's guild config restore/save": {
		ja: "iHorizonのサーバー設定の復元/保存用サブコマンド",
		ru: "Подкоманда для сохранения/восстановления конфигурации iHorizon",
		"es-ES":
			"Subcomando para restaurar/guardar la configuración del servidor de iHorizon"
	},
	"Subcommand for invites manager category!": {
		ja: "招待管理カテゴリのサブコマンド！",
		ru: "Подкоманда для категории управления приглашениями!",
		"es-ES": "Subcomando para la categoría de gestor de invitaciones!"
	},
	"Subcommand for moderation category!": {
		ja: "モデレーションカテゴリのサブコマンド！",
		ru: "Подкоманда для категории модерации!",
		"es-ES": "Subcomando para la categoría de moderación!"
	},
	"Subcommand for music category!": {
		ja: "音楽カテゴリのサブコマンド！",
		ru: "Подкоманда для категории музыки!",
		"es-ES": "Subcomando para la categoría de música!"
	},
	"Subcommand for profil category!": {
		ja: "プロフィールカテゴリのサブコマンド！",
		ru: "Подкоманда для категории профиля!",
		"es-ES": "Subcomando para la categoría de perfil!"
	},
	"Subcommand for protection category!": {
		ja: "保護カテゴリのサブコマンド！",
		ru: "Подкоманда для категории защиты!",
		"es-ES": "Subcomando para la categoría de protección!"
	},
	"Subcommand for ranks category!": {
		ja: "ランクカテゴリのサブコマンド！",
		ru: "Подкоманда для категории рангов!",
		"es-ES": "Subcomando para la categoría de rangos!"
	},
	"Subcommand for security category!": {
		ja: "セキュリティカテゴリのサブコマンド！",
		ru: "Подкоманда для категории безопасности!",
		"es-ES": "Subcomando para la categoría de seguridad!"
	},
	"Subcommand for stats category!": {
		ja: "統計カテゴリのサブコマンド！",
		ru: "Подкоманда для категории статистики!",
		"es-ES": "Subcomando para la categoría de estadísticas!"
	},
	"Subcommand for suggestion category!": {
		ja: "提案カテゴリのサブコマンド！",
		ru: "Подкоманда для категории предложений!",
		"es-ES": "Subcomando para la categoría de sugerencias!"
	},
	"Subcommand for the category of tags message": {
		ja: "タグメッセージカテゴリのサブコマンド",
		ru: "Подкоманда для категории тегов сообщений",
		"es-ES": "Subcomando para la categoría de mensajes de etiquetas"
	},
	"Subcommand for ticket category!": {
		ja: "チケットカテゴリのサブコマンド！",
		ru: "Подкоманда для категории тикетов!",
		"es-ES": "Subcomando para la categoría de tickets!"
	},
	"Subcommand for TTS (Text-to-Speech) category!": {
		ja: "TTS（テキスト読み上げ）カテゴリのサブコマンド！",
		ru: "Подкоманда для категории TTS (озвучивание текста)!",
		"es-ES": "Subcomando para la categoría TTS (Texto a Voz)!"
	},
	"SubCommand group for Starboard category": {
		ja: "スターボードカテゴリのサブコマンドグループ",
		ru: "Группа подкоманд для категории Starboard",
		"es-ES": "Grupo de subcomando para la categoría Starboard"
	},
	"Subcommand group for voice's manager": {
		ja: "ボイス管理のサブコマンドグループ",
		ru: "Группа подкоманд для управления голосом",
		"es-ES": "Grupo de subcomando para el gestor de voz"
	},
	"Sync all channels to the parent category": {
		ja: "全てのチャンネルを親カテゴリに同期",
		ru: "Синхронизировать все каналы с родительской категорией",
		"es-ES": "Sincronizar todos los canales con la categoría principal"
	},
	"Temporarily ban a user from the server": {
		ja: "ユーザーをサーバーから一時的にバン",
		ru: "Временно забанить пользователя на сервере",
		"es-ES": "Banear temporalmente a un usuario del servidor"
	},
	"Temporarily mute a user!": {
		ja: "ユーザーを一時的にミュート！",
		ru: "Временно замутить пользователя!",
		"es-ES": "Silenciar temporalmente a un usuario!"
	},
	"The action you want to do": {
		ja: "実行したいアクション",
		ru: "Действие, которое вы хотите выполнить",
		"es-ES": "La acción que quieres realizar"
	},
	"The after sucks": {
		ja: "after 側が最低",
		ru: "after отстой",
		"es-ES": "El after apesta"
	},
	"The amount of money you want to add": {
		ja: "追加したい金額",
		ru: "Сумма денег для добавления",
		"es-ES": "La cantidad de dinero que quieres añadir"
	},
	"The avatar": { ja: "アバター", ru: "Аватар", "es-ES": "El avatar" },
	"The backup to load": {
		ja: "読み込むバックアップ",
		ru: "Резервная копия для загрузки",
		"es-ES": "La copia de seguridad a cargar"
	},
	"The banner": { ja: "バナー", ru: "Баннер", "es-ES": "El banner" },
	"The before sucks": {
		ja: "before 側が最低",
		ru: "before отстой",
		"es-ES": "El before apesta"
	},
	"The blog RSS feed ID": {
		ja: "ブログRSSフィードのID",
		ru: "ID RSS-ленты блога",
		"es-ES": "El ID del feed RSS del blog"
	},
	"The boost you want to add": {
		ja: "追加したいブースト",
		ru: "Бонус, который вы хотите добавить",
		"es-ES": "El impulso que quieres añadir"
	},
	"The button title": {
		ja: "ボタンのタイトル",
		ru: "Название кнопки",
		"es-ES": "El título del botón"
	},
	"The cat say...": {
		ja: "猫が言う...",
		ru: "Кот говорит...",
		"es-ES": "El gato dice..."
	},
	"The category for the ticket.": {
		ja: "チケットのカテゴリ。",
		ru: "Категория для тикета.",
		"es-ES": "La categoría para el ticket."
	},
	"The category to sync channels to": {
		ja: "チャンネルを同期するカテゴリ",
		ru: "Категория для синхронизации каналов",
		"es-ES": "La categoría a la que sincronizar los canales"
	},
	"The category you want": {
		ja: "希望するカテゴリ",
		ru: "Желаемая категория",
		"es-ES": "La categoría que deseas"
	},
	"The channel": { ja: "チャンネル", ru: "Канал", "es-ES": "El canal" },
	"The channel!": { ja: "チャンネル！", ru: "Канал!", "es-ES": "El canal!" },
	"The channel containing the target message": {
		ja: "対象メッセージを含むチャンネル",
		ru: "Канал с целевым сообщением",
		"es-ES": "El canal que contiene el mensaje objetivo"
	},
	"The channel to analyze": {
		ja: "分析するチャンネル",
		ru: "Канал для анализа",
		"es-ES": "El canal a analizar"
	},
	"The channel to renew every x times": {
		ja: "X回ごとに更新するチャンネル",
		ru: "Канал для обновления каждые X раз",
		"es-ES": "El canal a renovar cada X veces"
	},
	"The channel where is the message": {
		ja: "メッセージがあるチャンネル",
		ru: "Канал, где находится сообщение",
		"es-ES": "El canal donde está el mensaje"
	},
	"The channel you want": {
		ja: "希望するチャンネル",
		ru: "Желаемый канал",
		"es-ES": "El canal que deseas"
	},
	"The channel you want your logs message!": {
		ja: "ログメッセージを送信したいチャンネル！",
		ru: "Канал для сообщений логов!",
		"es-ES": "El canal donde quieres tus mensajes de registro!"
	},
	"The command name you want information": {
		ja: "情報が欲しいコマンド名",
		ru: "Имя команды, о которой нужна информация",
		"es-ES": "El nombre del comando del que quieres información"
	},
	"The command you want to update": {
		ja: "更新したいコマンド",
		ru: "Команда, которую вы хотите обновить",
		"es-ES": "El comando que quieres actualizar"
	},
	"The comment": {
		ja: "コメント",
		ru: "Комментарий",
		"es-ES": "El comentario"
	},
	"The current tag name": {
		ja: "現在のタグ名",
		ru: "Текущее название тега",
		"es-ES": "El nombre actual de la etiqueta"
	},
	"The description": {
		ja: "説明",
		ru: "Описание",
		"es-ES": "La descripción"
	},
	"The description of you ticket's panel.": {
		ja: "チケットパネルの説明。",
		ru: "Описание вашей панели тикетов.",
		"es-ES": "La descripción de tu panel de tickets."
	},
	"The discord invite / code": {
		ja: "Discord招待 / コード",
		ru: "Приглашение / код Discord",
		"es-ES": "La invitación / código de Discord"
	},
	"The duration of the ban (e.g., 1h, 3d, 1w)": {
		ja: "バン期間（例: 1h, 3d, 1w）",
		ru: "Длительность бана (напр., 1ч, 3д, 1н)",
		"es-ES": "La duración del baneo (ej., 1h, 3d, 1s)"
	},
	"The duration of the slowmode": {
		ja: "低速モードの時間",
		ru: "Длительность замедленного режима",
		"es-ES": "La duración del modo lento"
	},
	"The duration of the user's tempmute": {
		ja: "ユーザーの一時的ミュート期間",
		ru: "Длительность временного мута",
		"es-ES": "La duración del silencio temporal del usuario"
	},
	"The embed identifier": {
		ja: "埋め込み識別子",
		ru: "Идентификатор эмбеда",
		"es-ES": "El identificador del embed"
	},
	"The giveaway's prize": {
		ja: "ギブアウェイの賞品",
		ru: "Приз розыгрыша",
		"es-ES": "El premio del sorteo"
	},
	"The id of the user you want to unban !": {
		ja: "バン解除したいユーザーのID！",
		ru: "ID пользователя для разбана!",
		"es-ES": "El ID del usuario que quieres desbanear!"
	},
	"The max amount of flags before punishement": {
		ja: "罰前の最大フラグ数",
		ru: "Максимальное количество флагов до наказания",
		"es-ES": "La cantidad máxima de marcas antes del castigo"
	},
	"The maximum member you want on the sane role": {
		ja: "同じロールに許可する最大メンバー数",
		ru: "Максимум участников с одинаковой ролью",
		"es-ES": "El máximo de miembros que deseas en el mismo rol"
	},
	"The member to wake up": {
		ja: "起こすメンバー",
		ru: "Участник, которого нужно разбудить",
		"es-ES": "El miembro a despertar"
	},
	"The member who wants to delete of the owner list": {
		ja: "オーナーリストから削除したいメンバー",
		ru: "Участник для удаления из списка владельцев",
		"es-ES": "El miembro que quiere eliminar de la lista de propietarios"
	},
	"The member who will receive the roles": {
		ja: "ロールを受け取るメンバー",
		ru: "Участник, который получит роли",
		"es-ES": "El miembro que recibirá los roles"
	},
	"The member who you want to add money": {
		ja: "お金を追加したいメンバー",
		ru: "Участник, которому добавить деньги",
		"es-ES": "El miembro al que quieres añadir dinero"
	},
	"The member you want": {
		ja: "対象のメンバー",
		ru: "Желаемый участник",
		"es-ES": "El miembro que deseas"
	},
	"The member you want to add the role": {
		ja: "ロールを追加したいメンバー",
		ru: "Участник, которому добавить роль",
		"es-ES": "El miembro al que quieres añadir el rol"
	},
	"The member you want to allow": {
		ja: "許可したいメンバー",
		ru: "Участник, которого вы хотите разрешить",
		"es-ES": "El miembro que quieres permitir"
	},
	"The member you want to ban": {
		ja: "バンしたいメンバー",
		ru: "Участник, которого вы хотите забанить",
		"es-ES": "El miembro que quieres banear"
	},
	"The member you want to check": {
		ja: "確認したいメンバー",
		ru: "Участник для проверки",
		"es-ES": "El miembro que quieres comprobar"
	},
	"The member you want to clear": {
		ja: "クリアしたいメンバー",
		ru: "Участник для очистки",
		"es-ES": "El miembro que quieres limpiar"
	},
	"The member you want to delete the message": {
		ja: "メッセージを削除したいメンバー",
		ru: "Участник, чьи сообщения удалить",
		"es-ES": "El miembro del que quieres eliminar el mensaje"
	},
	"The member you want to disconnect": {
		ja: "切断したいメンバー",
		ru: "Участник для отключения",
		"es-ES": "El miembro que quieres desconectar"
	},
	"The member you want to donate the money": {
		ja: "お金を寄付したいメンバー",
		ru: "Участник, которому пожертвовать деньги",
		"es-ES": "El miembro al que quieres donar el dinero"
	},
	"The member you want to kick": {
		ja: "キックしたいメンバー",
		ru: "Участник, которого вы хотите кикнуть",
		"es-ES": "El miembro que quieres expulsar"
	},
	"The member you want to lookup": {
		ja: "検索したいメンバー",
		ru: "Участник для поиска",
		"es-ES": "El miembro que quieres buscar"
	},
	"The member you want to move": {
		ja: "移動したいメンバー",
		ru: "Участник для перемещения",
		"es-ES": "El miembro que quieres mover"
	},
	"The member you want to remove": {
		ja: "削除したいメンバー",
		ru: "Участник для удаления",
		"es-ES": "El miembro que quieres eliminar"
	},
	"The member you want to remove invites": {
		ja: "招待を削除したいメンバー",
		ru: "Участник, у которого убрать приглашения",
		"es-ES": "El miembro del que quieres quitar invitaciones"
	},
	"The member you want to rob a money": {
		ja: "お金を奪いたいメンバー",
		ru: "Участник, которого ограбить",
		"es-ES": "El miembro al que quieres robar dinero"
	},
	"The member you want to show them invites": {
		ja: "招待数を表示したいメンバー",
		ru: "Участник, чьи приглашения показать",
		"es-ES": "El miembro al que quieres mostrar sus invitaciones"
	},
	"The member you want to unwarn": {
		ja: "警告を解除したいメンバー",
		ru: "Участник для снятия предупреждения",
		"es-ES": "El miembro al que quieres quitar la advertencia"
	},
	"The member you want to warn": {
		ja: "警告したいメンバー",
		ru: "Участник для предупреждения",
		"es-ES": "El miembro al que quieres advertir"
	},
	"The message displayed on the survey": {
		ja: "アンケートに表示されるメッセージ",
		ru: "Сообщение, отображаемое в опросе",
		"es-ES": "El mensaje mostrado en la encuesta"
	},
	"The music level": {
		ja: "音楽レベル",
		ru: "Уровень музыки",
		"es-ES": "El nivel de música"
	},
	"The name": { ja: "名前", ru: "Имя", "es-ES": "El nombre" },
	"The name of you ticket's panel.": {
		ja: "チケットパネルの名前。",
		ru: "Название вашей панели тикетов.",
		"es-ES": "El nombre de tu panel de tickets."
	},
	"The new name of the ticket channel.": {
		ja: "チケットチャンネルの新しい名前。",
		ru: "Новое название канала тикета.",
		"es-ES": "El nuevo nombre del canal de ticket."
	},
	"The new prefix": {
		ja: "新しいプレフィックス",
		ru: "Новый префикс",
		"es-ES": "El nuevo prefijo"
	},
	"The new reason": {
		ja: "新しい理由",
		ru: "Новая причина",
		"es-ES": "La nueva razón"
	},
	"The new roles for your AuthRestore config": {
		ja: "AuthRestore設定の新しいロール",
		ru: "Новые роли для конфигурации AuthRestore",
		"es-ES": "Los nuevos roles para tu configuración AuthRestore"
	},
	"The new tag name": {
		ja: "新しいタグ名",
		ru: "Новое название тега",
		"es-ES": "El nuevo nombre de la etiqueta"
	},
	"The number of message you want to delete !": {
		ja: "削除したいメッセージ数！",
		ru: "Количество сообщений для удаления!",
		"es-ES": "El número de mensajes que quieres eliminar!"
	},
	"The part including in the nickname": {
		ja: "ニックネームに含める部分",
		ru: "Часть, включаемая в никнейм",
		"es-ES": "La parte a incluir en el apodo"
	},
	"The permission for the selected command": {
		ja: "選択したコマンドの権限",
		ru: "Разрешение для выбранной команды",
		"es-ES": "El permiso para el comando seleccionado"
	},
	"The position type you want": {
		ja: "希望する位置タイプ",
		ru: "Желаемый тип позиции",
		"es-ES": "El tipo de posición que deseas"
	},
	"The private key of your AuthRestore config": {
		ja: "AuthRestore設定のプライベートキー",
		ru: "Приватный ключ вашей конфигурации AuthRestore",
		"es-ES": "La clave privada de tu configuración AuthRestore"
	},
	"The private message": {
		ja: "プライベートメッセージ",
		ru: "Приватное сообщение",
		"es-ES": "El mensaje privado"
	},
	"The reason for the ban": {
		ja: "バンの理由",
		ru: "Причина бана",
		"es-ES": "La razón del baneo"
	},
	"The reason for unbanning this user.": {
		ja: "このユーザーのバン解除の理由。",
		ru: "Причина разбана этого пользователя.",
		"es-ES": "La razón para desbanear a este usuario."
	},
	"The reason of the bannisement": {
		ja: "バンの理由",
		ru: "Причина бана",
		"es-ES": "La razón del baneo"
	},
	"The reason of the kick": {
		ja: "キックの理由",
		ru: "Причина кика",
		"es-ES": "La razón de la expulsión"
	},
	"The reason why you added this role": {
		ja: "このロールを追加した理由",
		ru: "Причина добавления этой роли",
		"es-ES": "La razón por la que añadiste este rol"
	},
	"The reason why you tempmuted": {
		ja: "一時的ミュートの理由",
		ru: "Причина временного мута",
		"es-ES": "La razón por la que silenciaste temporalmente"
	},
	"The reason why you want to blacklist this member": {
		ja: "このメンバーをブラックリストに入れる理由",
		ru: "Причина добавления в черный список",
		"es-ES":
			"La razón por la que quieres poner en lista negra a este miembro"
	},
	"The reason why you want to warn this member": {
		ja: "このメンバーを警告する理由",
		ru: "Причина предупреждения этого участника",
		"es-ES": "La razón por la que quieres advertir a este miembro"
	},
	"The requirement to enter into the giveaway": {
		ja: "ギブアウェイ参加要件",
		ru: "Требование для участия в розыгрыше",
		"es-ES": "El requisito para entrar en el sorteo"
	},
	"The requirement value": {
		ja: "要件の値",
		ru: "Значение требования",
		"es-ES": "El valor del requisito"
	},
	"The role": { ja: "ロール", ru: "Роль", "es-ES": "El rol" },
	"The role to add to users": {
		ja: "ユーザーに追加するロール",
		ru: "Роль для добавления пользователям",
		"es-ES": "El rol a añadir a los usuarios"
	},
	"The role you want to add": {
		ja: "追加したいロール",
		ru: "Роль, которую вы хотите добавить",
		"es-ES": "El rol que quieres añadir"
	},
	"The role you want to add to the member": {
		ja: "メンバーに追加したいロール",
		ru: "Роль для добавления участнику",
		"es-ES": "El rol que quieres añadir al miembro"
	},
	"The role you want to add to the user": {
		ja: "ユーザーに追加したいロール",
		ru: "Роль для добавления пользователю",
		"es-ES": "El rol que quieres añadir al usuario"
	},
	"The role you want to check": {
		ja: "確認したいロール",
		ru: "Роль для проверки",
		"es-ES": "El rol que quieres comprobar"
	},
	"The role you want to configure": {
		ja: "設定したいロール",
		ru: "Роль, которую вы хотите настроить",
		"es-ES": "El rol que quieres configurar"
	},
	"The role you want to delete": {
		ja: "削除したいロール",
		ru: "Роль, которую вы хотите удалить",
		"es-ES": "El rol que quieres eliminar"
	},
	"The role you want to give": {
		ja: "付与したいロール",
		ru: "Роль, которую вы хотите выдать",
		"es-ES": "El rol que quieres dar"
	},
	"The role you want to manage": {
		ja: "管理したいロール",
		ru: "Роль, которой вы хотите управлять",
		"es-ES": "El rol que quieres gestionar"
	},
	"The role you want to modify the boost": {
		ja: "ブーストを変更したいロール",
		ru: "Роль, для которой изменить бонус",
		"es-ES": "El rol para el que quieres modificar el impulso"
	},
	"The role you want to remove to the user": {
		ja: "ユーザーから削除したいロール",
		ru: "Роль, которую нужно убрать у пользователя",
		"es-ES": "El rol que quieres quitar al usuario"
	},
	"The roles to give for our member": {
		ja: "メンバーに付与するロール",
		ru: "Роли для выдачи участнику",
		"es-ES": "Los roles a dar a nuestro miembro"
	},
	"The RSS feed URL": {
		ja: "RSSフィードのURL",
		ru: "URL RSS-ленты",
		"es-ES": "La URL del feed RSS"
	},
	"The rule are bypassable for who?": {
		ja: "ルールをバイパスできるのは誰？",
		ru: "Для кого правила обходятся?",
		"es-ES": "Las reglas son evitables para quién?"
	},
	"The specific channel for xp message !": {
		ja: "XPメッセージ用の特定チャンネル！",
		ru: "Конкретный канал для сообщений XP!",
		"es-ES": "El canal específico para mensajes de XP!"
	},
	"The specific roles to give !": {
		ja: "付与する特定のロール！",
		ru: "Конкретные роли для выдачи!",
		"es-ES": "Los roles específicos a dar!"
	},
	"The specified role you want to add": {
		ja: "追加したい指定ロール",
		ru: "Указанная роль для добавления",
		"es-ES": "El rol especificado que quieres añadir"
	},
	"The sticky message content": {
		ja: "固定メッセージの内容",
		ru: "Содержание закрепленного сообщения",
		"es-ES": "El contenido del mensaje fijo"
	},
	"The Streamer/Youtuber/Twitcher ID": {
		ja: "ストリーマー/YouTuber/TwitcherのID",
		ru: "ID стримера/YouTube/Twitch",
		"es-ES": "El ID del Streamer/Youtuber/Twitcher"
	},
	"The text channel": {
		ja: "テキストチャンネル",
		ru: "Текстовый канал",
		"es-ES": "El canal de texto"
	},
	"The things": { ja: "もの", ru: "вещи", "es-ES": "Las cosas" },
	"The threshold": { ja: "しきい値", ru: "Порог", "es-ES": "El umbral" },
	"The time duration of the giveaways": {
		ja: "ギブアウェイの開催時間",
		ru: "Длительность розыгрыша",
		"es-ES": "La duración del sorteo"
	},
	"The time the member will keep the role": {
		ja: "メンバーがロールを保持する時間",
		ru: "Время, на которое участник получит роль",
		"es-ES": "El tiempo que el miembro mantendrá el rol"
	},
	"The time you want to set": {
		ja: "設定したい時間",
		ru: "Время, которое вы хотите установить",
		"es-ES": "El tiempo que quieres establecer"
	},
	"The track title you want": {
		ja: "希望するトラックのタイトル",
		ru: "Название желаемого трека",
		"es-ES": "El título de la pista que deseas"
	},
	"The user that you want to add to the owner list": {
		ja: "オーナーリストに追加したいユーザー",
		ru: "Пользователь для добавления в список владельцев",
		"es-ES": "El usuario que quieres añadir a la lista de propietarios"
	},
	"The user that you want to add to the user list": {
		ja: "ユーザーリストに追加したいユーザー",
		ru: "Пользователь для добавления в список",
		"es-ES": "El usuario que quieres añadir a la lista de usuarios"
	},
	"The user that you want to react check": {
		ja: "リアクションを確認したいユーザー",
		ru: "Пользователь для проверки реакций",
		"es-ES": "El usuario del que quieres comprobar la reacción"
	},
	"The user you want": {
		ja: "対象のユーザー",
		ru: "Желаемый пользователь",
		"es-ES": "El usuario que deseas"
	},
	"The user you want to ban": {
		ja: "バンしたいユーザー",
		ru: "Пользователь, которого нужно забанить",
		"es-ES": "El usuario que quieres banear"
	},
	"The user you want to delete the message": {
		ja: "メッセージを削除したいユーザー",
		ru: "Пользователь, чьи сообщения удалить",
		"es-ES": "El usuario del que quieres eliminar el mensaje"
	},
	"The user you want to lookup": {
		ja: "検索したいユーザー",
		ru: "Пользователь для поиска",
		"es-ES": "El usuario que quieres buscar"
	},
	"The user you want to remove from the owner list": {
		ja: "オーナーリストから削除したいユーザー",
		ru: "Пользователь для удаления из списка владельцев",
		"es-ES": "El usuario que quieres eliminar de la lista de propietarios"
	},
	"The user you want to remove from the user list": {
		ja: "ユーザーリストから削除したいユーザー",
		ru: "Пользователь для удаления из списка",
		"es-ES": "El usuario que quieres eliminar de la lista de usuarios"
	},
	"The voice channel": {
		ja: "ボイスチャンネル",
		ru: "Голосовой канал",
		"es-ES": "El canal de voz"
	},
	"The voice channel to disable the TTS!": {
		ja: "TTSを無効にするボイスチャンネル！",
		ru: "Голосовой канал для отключения TTS!",
		"es-ES": "El canal de voz para deshabilitar el TTS!"
	},
	"The voice channel you want": {
		ja: "希望するボイスチャンネル",
		ru: "Желаемый голосовой канал",
		"es-ES": "El canal de voz que deseas"
	},
	"The volume you want": {
		ja: "希望する音量",
		ru: "Желаемая громкость",
		"es-ES": "El volumen que deseas"
	},
	"The wanted bio": {
		ja: "希望する自己紹介",
		ru: "Желаемое описание",
		"es-ES": "La biografía deseada"
	},
	"The wanted name": {
		ja: "希望する名前",
		ru: "Желаемое имя",
		"es-ES": "El nombre deseado"
	},
	"The warn ID": {
		ja: "警告ID",
		ru: "ID предупреждения",
		"es-ES": "El ID de la advertencia"
	},
	"This command...": {
		ja: "このコマンド...",
		ru: "Эта команда...",
		"es-ES": "Este comando..."
	},
	"To where user should be moved ?": {
		ja: "ユーザーをどこに移動するべきか？",
		ru: "Куда переместить пользователя?",
		"es-ES": "A dónde debe ser movido el usuario?"
	},
	"Toggle blacklist on / off": {
		ja: "ブラックリストのオン/オフを切り替え",
		ru: "Включить/выключить черный список",
		"es-ES": "Activar/desactivar lista negra"
	},
	"Track info for an another song": {
		ja: "別の曲のトラック情報",
		ru: "Информация о другом треке",
		"es-ES": "Información de pista para otra canción"
	},
	"Transfer the property of the voice channel": {
		ja: "ボイスチャンネルの所有権を譲渡",
		ru: "Передать права на голосовой канал",
		"es-ES": "Transferir la propiedad del canal de voz"
	},
	"Unban an user!": {
		ja: "ユーザーのバンを解除！",
		ru: "Разбанить пользователя!",
		"es-ES": "Desbanear a un usuario!"
	},
	"Unleash the member in the guild": {
		ja: "サーバー内のメンバーのリードを外す",
		ru: "Отвязать участника на сервере",
		"es-ES": "Desatar al miembro en el servidor"
	},
	"Unmute all muted members!": {
		ja: "全ミュートメンバーのミュートを解除！",
		ru: "Размутить всех замученных участников!",
		"es-ES": "Desilenciar a todos los miembros silenciados!"
	},
	"Unmute a user!": {
		ja: "ユーザーのミュートを解除！",
		ru: "Размутить пользователя!",
		"es-ES": "Desilenciar a un usuario!"
	},
	"Unwarn a user!": {
		ja: "ユーザーの警告を解除！",
		ru: "Снять предупреждение с пользователя!",
		"es-ES": "Quitar advertencia a un usuario!"
	},
	"User to compare with": {
		ja: "比較するユーザー",
		ru: "Пользователь для сравнения",
		"es-ES": "Usuario con quien comparar"
	},
	"View the settings of the guild": {
		ja: "サーバーの設定を表示",
		ru: "Просмотреть настройки сервера",
		"es-ES": "Ver la configuración del servidor"
	},
	"Warn a user!": {
		ja: "ユーザーを警告！",
		ru: "Предупредить пользователя!",
		"es-ES": "Advertir a un usuario!"
	},
	"What you want to do?": {
		ja: "何をしたいですか？",
		ru: "Что вы хотите сделать?",
		"es-ES": "Que quieres hacer?"
	},
	"Which user you want to check": {
		ja: "確認したいユーザー",
		ru: "Какого пользователя проверить",
		"es-ES": "Qué usuario quieres comprobar"
	},
	"add user to owner list (can't be used by normal member)!": {
		ja: "ユーザーをオーナーリストに追加（一般メンバーは使用不可）！",
		ru: "Добавить пользователя в список владельцев (не для обычных участников)!",
		"es-ES":
			"Añadir usuario a la lista de propietarios (no puede ser usado por miembros normales)!"
	},
	"all humans have rights": {
		ja: "全ての人間には権利がある",
		ru: "все люди имеют права",
		"es-ES": "todos los humanos tienen derechos"
	},
	"amount of $ you want add": {
		ja: "追加したい金額",
		ru: "сумма для добавления",
		"es-ES": "cantidad de $ que quieres añadir"
	},
	"amount of nitro": {
		ja: "Nitroの数",
		ru: "количество nitro",
		"es-ES": "cantidad de nitro"
	},
	"change the volume of the player in the guild": {
		ja: "サーバーのプレイヤーの音量を変更",
		ru: "изменить громкость плеера на сервере",
		"es-ES": "cambiar el volumen del reproductor en el servidor"
	},
	"edit blacklist reason": {
		ja: "ブラックリスト理由を編集",
		ru: "изменить причину черного списка",
		"es-ES": "editar razón de lista negra"
	},
	"help menu for og user lmao": {
		ja: "OGユーザー向けヘルプメニュー（笑）",
		ru: "меню помощи для OG пользователей",
		"es-ES": "menú de ayuda para usuario OG lol"
	},
	"i have two sides meme generator": {
		ja: "i have two sides ミームジェネレーター",
		ru: "генератор мема i have two sides",
		"es-ES": "generador de meme i have two sides"
	},
	"is private ?": {
		ja: "非公開ですか？",
		ru: "приватный?",
		"es-ES": "es privado?"
	},
	"javascript code": {
		ja: "JavaScriptコード",
		ru: "код JavaScript",
		"es-ES": "código JavaScript"
	},
	"kawaeine meme generator": {
		ja: "kawaeine ミームジェネレーター",
		ru: "генератор мема kawaeine",
		"es-ES": "generador de meme kawaeine"
	},
	"rap vs reality meme generator": {
		ja: "rap vs reality ミームジェネレーター",
		ru: "генератор мема rap vs reality",
		"es-ES": "generador de meme rap vs reality"
	},
	"the after sucks": {
		ja: "after 側が最低",
		ru: "after отстой",
		"es-ES": "el after apesta"
	},
	"the before sucks": {
		ja: "before 側が最低",
		ru: "before отстой",
		"es-ES": "el before apesta"
	},
	"the music level": {
		ja: "音楽レベル",
		ru: "уровень музыки",
		"es-ES": "el nivel de música"
	},
	"the things": { ja: "もの", ru: "вещи", "es-ES": "las cosas" },
	"the threshold": { ja: "しきい値", ru: "порог", "es-ES": "el umbral" },
	"transgender user": {
		ja: "トランスジェンダーユーザー",
		ru: "трансгендерный пользователь",
		"es-ES": "usuario transgénero"
	},
	"user to compare with": {
		ja: "比較するユーザー",
		ru: "пользователь для сравнения",
		"es-ES": "usuario con quien comparar"
	},
	// French-origin descriptions that still need translation
	"L'utilisateur que vous voulez rechercher": {
		ja: "検索したいユーザー",
		ru: "Пользователь, которого вы хотите найти",
		"es-ES": "El usuario que quieres buscar"
	},

	// More choices/name entries
	blacklist: {
		ja: "ブラックリスト",
		ru: "черный список",
		"es-ES": "lista negra"
	},
	reason: { ja: "理由", ru: "причина", "es-ES": "razón" },
	change: { ja: "変更", ru: "изменить", "es-ES": "cambiar" },
	set: { ja: "設定", ru: "установить", "es-ES": "establecer" },
	add: { ja: "追加", ru: "добавить", "es-ES": "añadir" },
	remove: { ja: "削除", ru: "удалить", "es-ES": "eliminar" },
	delete: { ja: "削除", ru: "удалить", "es-ES": "eliminar" },
	user1: { ja: "ユーザー1", ru: "пользователь1", "es-ES": "usuario1" },
	user2: { ja: "ユーザー2", ru: "пользователь2", "es-ES": "usuario2" },
	text: { ja: "テキスト", ru: "текст", "es-ES": "texto" },
	url: { ja: "URL", ru: "URL", "es-ES": "URL" },
	"force-join": {
		ja: "強制参加",
		ru: "Принудительное присоединение",
		"es-ES": "Forzar unión"
	},
	roles: { ja: "ロール", ru: "Роли", "es-ES": "Roles" },
	key: { ja: "キー", ru: "Ключ", "es-ES": "Clave" },
	message_id: {
		ja: "メッセージID",
		ru: "ID сообщения",
		"es-ES": "ID del mensaje"
	},
	"compte-trop-recent": {
		ja: "新しすぎるアカウント",
		ru: "слишком новый аккаунт",
		"es-ES": "cuenta-demasiado-nueva"
	},
	"minimum-date": {
		ja: "最低日付",
		ru: "Минимальная дата",
		"es-ES": "Fecha mínima"
	},
	"maximum-join": {
		ja: "最大参加回数",
		ru: "Максимум входов",
		"es-ES": "Máximo de uniones"
	},
	"join-dm": {
		ja: "参加DM",
		ru: "ЛС при входе",
		"es-ES": "DM de bienvenida"
	},
	"join-message": {
		ja: "参加メッセージ",
		ru: "Приветственное сообщение",
		"es-ES": "Mensaje de bienvenida"
	},
	"join-role": {
		ja: "参加ロール",
		ru: "Роль при входе",
		"es-ES": "Rol de bienvenida"
	},
	"leave-message": {
		ja: "退出メッセージ",
		ru: "Прощальное сообщение",
		"es-ES": "Mensaje de despedida"
	},
	"backup-to-load": {
		ja: "読み込むバックアップ",
		ru: "Резервная копия для загрузки",
		"es-ES": "Copia de seguridad a cargar"
	},
	"command-name": {
		ja: "コマンド名",
		ru: "Название команды",
		"es-ES": "Nombre del comando"
	},
	block: { ja: "ブロック", ru: "Блокировать", "es-ES": "Bloquear" },
	bot: { ja: "ボット", ru: "Бот", "es-ES": "Bot" },
	"too-new-account": {
		ja: "新しすぎるアカウント",
		ru: "Слишком новый аккаунт",
		"es-ES": "Cuenta demasiado nueva"
	},
	prefix: { ja: "プレフィックス", ru: "Префикс", "es-ES": "Prefijo" },
	discord_invite_link: {
		ja: "Discord招待リンク",
		ru: "Пригласительная ссылка Discord",
		"es-ES": "Enlace de invitación de Discord"
	},
	link: { ja: "リンク", ru: "Ссылка", "es-ES": "Enlace" },
	"mass-mention": {
		ja: "大量メンション",
		ru: "Массовое упоминание",
		"es-ES": "Mención masiva"
	},
	spam: { ja: "スパム", ru: "Спам", "es-ES": "Spam" },
	telegram_link: {
		ja: "Telegramリンク",
		ru: "Ссылка Telegram",
		"es-ES": "Enlace de Telegram"
	},
	automod: {
		ja: "オートモデレーション",
		ru: "Автомодерация",
		"es-ES": "Automod"
	},
	perm: { ja: "権限", ru: "Разрешения", "es-ES": "Permisos" },
	"set-user": {
		ja: "ユーザー設定",
		ru: "Установить пользователя",
		"es-ES": "Establecer usuario"
	},
	"create-roles": {
		ja: "ロール作成",
		ru: "Создать роли",
		"es-ES": "Crear roles"
	},
	"edit-roles": {
		ja: "ロール編集",
		ru: "Редактировать роли",
		"es-ES": "Editar roles"
	},
	list: { ja: "一覧", ru: "Список", "es-ES": "Lista" },
	"join-ghostping": {
		ja: "Join GhostPing",
		ru: "Join GhostPing",
		"es-ES": "Join GhostPing"
	},
	"bypass-roles": {
		ja: "バイパスロール",
		ru: "Роли обхода",
		"es-ES": "Roles de derivación"
	},
	"ignore-channels": {
		ja: "無視チャンネル",
		ru: "Игнорируемые каналы",
		"es-ES": "Canales ignorados"
	},
	"set-staff-role": {
		ja: "スタッフロール設定",
		ru: "Установить роль персонала",
		"es-ES": "Establecer rol de staff"
	},
	"set-text-channel": {
		ja: "テキストチャンネル設定",
		ru: "Установить текстовый канал",
		"es-ES": "Establecer canal de texto"
	},
	"set-voice-channel": {
		ja: "ボイスチャンネル設定",
		ru: "Установить голосовой канал",
		"es-ES": "Establecer canal de voz"
	},
	"set-voice-channel-catgory": {
		ja: "ボイスチャンネルカテゴリ設定",
		ru: "Установить категорию голосовых каналов",
		"es-ES": "Establecer categoría de canal de voz"
	},
	"set-voice-channel-name": {
		ja: "ボイスチャンネル名設定",
		ru: "Установить имя голосового канала",
		"es-ES": "Establecer nombre del canal de voz"
	},
	"set-voice-channel-position": {
		ja: "ボイスチャンネル位置設定",
		ru: "Установить позицию голосового канала",
		"es-ES": "Establecer posición del canal de voz"
	},
	"temps-mute": {
		ja: "一時的ミュート",
		ru: "Временный мут",
		"es-ES": "Silencio temporal"
	},
	"clear-all-warns": {
		ja: "全警告クリア",
		ru: "Очистить все предупреждения",
		"es-ES": "Limpiar todas las advertencias"
	},
	clearwarn: {
		ja: "警告クリア",
		ru: "Очистить предупреждение",
		"es-ES": "Limpiar advertencia"
	},
	"lock-all": {
		ja: "全ロック",
		ru: "Заблокировать все",
		"es-ES": "Bloquear todo"
	},
	"unlock-all": {
		ja: "全ロック解除",
		ru: "Разблокировать все",
		"es-ES": "Desbloquear todo"
	},
	"unmute-all": {
		ja: "全ミュート解除",
		ru: "Размутить всех",
		"es-ES": "Desilenciar a todos"
	},
	unmute: { ja: "ミュート解除", ru: "Размутить", "es-ES": "Desilenciar" },
	unwarn: {
		ja: "警告解除",
		ru: "Снять предупреждение",
		"es-ES": "Quitar advertencia"
	},
	mutelist: {
		ja: "ミュートリスト",
		ru: "Список замученных",
		"es-ES": "Lista de silenciados"
	},
	banlist: {
		ja: "バンリスト",
		ru: "Список забаненных",
		"es-ES": "Lista de baneados"
	},
	baninfo: {
		ja: "バン情報",
		ru: "Информация о бане",
		"es-ES": "Información de baneo"
	},
	rolepanel: {
		ja: "ロールパネル",
		ru: "Панель ролей",
		"es-ES": "Panel de roles"
	},
	warn: { ja: "警告", ru: "Предупреждение", "es-ES": "Advertencia" },
	warnlist: {
		ja: "警告リスト",
		ru: "Список предупреждений",
		"es-ES": "Lista de advertencias"
	},
	unban: { ja: "バン解除", ru: "Разбан", "es-ES": "Desbanear" },
	kick: { ja: "キック", ru: "Кик", "es-ES": "Expulsar" },
	ban: { ja: "バン", ru: "Бан", "es-ES": "Banear" },
	lock: { ja: "ロック", ru: "Блокировка", "es-ES": "Bloquear" },
	unlock: { ja: "ロック解除", ru: "Разблокировка", "es-ES": "Desbloquear" },
	clear: { ja: "クリア", ru: "Очистить", "es-ES": "Limpiar" },
	setup: { ja: "セットアップ", ru: "Настройка", "es-ES": "Configuración" },
	shop: { ja: "ショップ", ru: "Магазин", "es-ES": "Tienda" },
	leaderboard: {
		ja: "ランキング",
		ru: "Таблица лидеров",
		"es-ES": "Tabla de clasificación"
	},
	balance: { ja: "残高", ru: "Баланс", "es-ES": "Saldo" },
	deposit: { ja: "預金", ru: "Депозит", "es-ES": "Depositar" },
	withdraw: { ja: "引き出し", ru: "Вывод", "es-ES": "Retirar" },
	pay: { ja: "支払い", ru: "Оплатить", "es-ES": "Pagar" },
	rob: { ja: "強奪", ru: "Ограбить", "es-ES": "Robar" },
	work: { ja: "仕事", ru: "Работа", "es-ES": "Trabajar" },
	daily: { ja: "デイリー", ru: "Ежедневно", "es-ES": "Diario" },
	weekly: { ja: "ウィークリー", ru: "Еженедельно", "es-ES": "Semanal" },
	monthly: { ja: "マンスリー", ru: "Ежемесячно", "es-ES": "Mensual" },
	reset: { ja: "リセット", ru: "Сброс", "es-ES": "Restablecer" },

	// === Additional untranslated strings ===
	"1 hour": { ja: "1時間", ru: "1 час", "es-ES": "1 hora" },
	"1 minute": { ja: "1分", ru: "1 минута", "es-ES": "1 minuto" },
	"10 minutes": { ja: "10分", ru: "10 минут", "es-ES": "10 minutos" },
	"10 seconds": { ja: "10秒", ru: "10 секунд", "es-ES": "10 segundos" },
	"15 minutes": { ja: "15分", ru: "15 минут", "es-ES": "15 minutos" },
	"15 seconds": { ja: "15秒", ru: "15 секунд", "es-ES": "15 segundos" },
	"2 minutes": { ja: "2分", ru: "2 минуты", "es-ES": "2 minutos" },
	"30 seconds": { ja: "30秒", ru: "30 секунд", "es-ES": "30 segundos" },
	"5 minutes": { ja: "5分", ru: "5 минут", "es-ES": "5 minutos" },
	"5 seconds": { ja: "5秒", ru: "5 секунд", "es-ES": "5 segundos" },
	"6 hours": { ja: "6時間", ru: "6 часов", "es-ES": "6 horas" },
	"Add another": {
		ja: "別のものを追加",
		ru: "Добавить еще",
		"es-ES": "Añadir otro"
	},
	"All admin(s)": {
		ja: "全管理者",
		ru: "Все администраторы",
		"es-ES": "Todos los administradores"
	},
	"All of member": {
		ja: "全メンバー",
		ru: "Все участники",
		"es-ES": "Todos los miembros"
	},
	"AntiSpam Logs": {
		ja: "アンチスパムログ",
		ru: "Логи антиспама",
		"es-ES": "Registros de AntiSpam"
	},
	Arabic: { ja: "アラビア語", ru: "Арабский", "es-ES": "Árabe" },
	"Boost Logs": {
		ja: "ブーストログ",
		ru: "Логи бустов",
		"es-ES": "Registros de Boost"
	},
	"Bot Avatar": {
		ja: "ボットアバター",
		ru: "Аватар бота",
		"es-ES": "Avatar del bot"
	},
	"Bot Name": { ja: "ボット名", ru: "Имя бота", "es-ES": "Nombre del bot" },
	"Change command permission": {
		ja: "コマンド権限を変更",
		ru: "Изменить разрешение команды",
		"es-ES": "Cambiar permiso del comando"
	},
	"Channel Logs": {
		ja: "チャンネルログ",
		ru: "Логи каналов",
		"es-ES": "Registros de canales"
	},
	"Channel where are been the verification process for new member(s)!": {
		ja: "新規メンバーの認証プロセスが行われるチャンネル！",
		ru: "Канал для процесса верификации новых участников!",
		"es-ES":
			"Canal donde se realiza el proceso de verificación para nuevos miembros!"
	},
	"Confession Logs": {
		ja: "告白ログ",
		ru: "Логи признаний",
		"es-ES": "Registros de confesiones"
	},
	"Config the message when user earn new xp level message!": {
		ja: "ユーザーが新しいXPレベルを獲得した時のメッセージを設定！",
		ru: "Настроить сообщение при получении нового уровня XP!",
		"es-ES":
			"Configurar el mensaje cuando el usuario gana un nuevo nivel de XP!"
	},
	"Create thread": {
		ja: "スレッドを作成",
		ru: "Создать ветку",
		"es-ES": "Crear hilo"
	},
	Default: { ja: "デフォルト", ru: "По умолчанию", "es-ES": "Por defecto" },
	"Default Bot Description": {
		ja: "デフォルトのボット説明",
		ru: "Описание бота по умолчанию",
		"es-ES": "Descripción predeterminada del bot"
	},
	"Define channels for only pictures/videos sending (block other content)": {
		ja: "画像/動画のみ送信可能なチャンネルを定義（他のコンテンツをブロック）",
		ru: "Определить каналы только для картинок/видео (блокировать другое содержимое)",
		"es-ES":
			"Definir canales solo para enviar imágenes/videos (bloquear otro contenido)"
	},
	"Delete all settings": {
		ja: "全設定を削除",
		ru: "Удалить все настройки",
		"es-ES": "Eliminar todas las configuraciones"
	},
	"Delete command permission": {
		ja: "コマンド権限を削除",
		ru: "Удалить разрешение команды",
		"es-ES": "Eliminar permiso del comando"
	},
	"Disable the module": {
		ja: "モジュールを無効化",
		ru: "Отключить модуль",
		"es-ES": "Deshabilitar el módulo"
	},
	"Disable the module (don't send any message and user don't earn xp level)":
		{
			ja: "モジュールを無効化（メッセージを送信せず、ユーザーはXPを獲得しない）",
			ru: "Отключить модуль (не отправлять сообщения и не начислять XP)",
			"es-ES":
				"Deshabilitar el módulo (no enviar mensajes y el usuario no gana nivel de XP)"
		},
	"Disable the suggestion module (need admin permission)!": {
		ja: "提案モジュールを無効化（管理者権限が必要）！",
		ru: "Отключить модуль предложений (требуются права администратора)!",
		"es-ES":
			"Deshabilitar el módulo de sugerencias (requiere permiso de administrador)!"
	},
	"Do the same thing as authrestore with link verification button under iHorizon message":
		{
			ja: "iHorizonメッセージの下のリンク確認ボタンでauthrestoreと同じことを行う",
			ru: "Сделать то же, что и authrestore, с кнопкой проверки ссылки под сообщением iHorizon",
			"es-ES":
				"Hacer lo mismo que authrestore con el botón de verificación de enlace bajo el mensaje de iHorizon"
		},
	"Don't create thread": {
		ja: "スレッドを作成しない",
		ru: "Не создавать ветку",
		"es-ES": "No crear hilo"
	},
	"Down (Bottom)": {
		ja: "下（最下部）",
		ru: "Вниз (снизу)",
		"es-ES": "Abajo (Inferior)"
	},
	"Economy Logs": {
		ja: "経済ログ",
		ru: "Логи экономики",
		"es-ES": "Registros de economía"
	},
	"Enable / Disable the auto response when user says something (only in fr-ME lang)":
		{
			ja: "ユーザーが発言した時の自動応答を有効/無効（fr-ME言語のみ）",
			ru: "Включить/выключить автоответ при сообщении пользователя (только для fr-ME)",
			"es-ES":
				"Habilitar / Deshabilitar la respuesta automática cuando el usuario dice algo (solo en idioma fr-ME)"
		},
	"Enable or disable Last.fm scrobbling for your account.": {
		ja: "アカウントのLast.fmスクロブルを有効化または無効化。",
		ru: "Включить или отключить скробблинг Last.fm для вашего аккаунта.",
		"es-ES":
			"Habilitar o deshabilitar el scrobbling de Last.fm para tu cuenta."
	},
	"Enable the module": {
		ja: "モジュールを有効化",
		ru: "Включить модуль",
		"es-ES": "Habilitar el módulo"
	},
	"Enter your input to encrypt/decrypt in morse": {
		ja: "モールス信号で暗号化/復号化する入力を入力",
		ru: "Введите текст для шифрования/дешифрования азбукой Морзе",
		"es-ES": "Ingresa tu entrada para encriptar/desencriptar en morse"
	},
	"Get the list of all guild member whose have admin permissions": {
		ja: "管理者権限を持つ全サーバーメンバーのリストを取得",
		ru: "Получить список всех участников с правами администратора",
		"es-ES":
			"Obtener la lista de todos los miembros del servidor que tienen permisos de administrador"
	},
	"Get the list of all guild roles whose have admin permissions": {
		ja: "管理者権限を持つ全サーバーロールのリストを取得",
		ru: "Получить список всех ролей с правами администратора",
		"es-ES":
			"Obtener la lista de todos los roles del servidor que tienen permisos de administrador"
	},
	"Give a roles when guild's member have something about your server on them bio!":
		{
			ja: "サーバーメンバーの自己紹介にサーバーに関する情報がある場合にロールを付与！",
			ru: "Выдать роли, если у участника в описании есть информация о сервере!",
			"es-ES":
				"Dar roles cuando el miembro del servidor tiene algo sobre tu servidor en su biografía!"
		},
	"Give ability to speak of all users in all channels!": {
		ja: "全チャンネルで全ユーザーに発言権限を付与！",
		ru: "Дать возможность говорить всем во всех каналах!",
		"es-ES":
			"Dar capacidad de hablar a todos los usuarios en todos los canales!"
	},
	"How much coin you want to deposit in your bank?": {
		ja: "銀行にいくら預けますか？",
		ru: "Сколько монет вы хотите положить в банк?",
		"es-ES": "Cuántas monedas quieres depositar en tu banco?"
	},
	"How much coin you want to withdraw from your bank?": {
		ja: "銀行からいくら引き出しますか？",
		ru: "Сколько монет вы хотите снять из банка?",
		"es-ES": "Cuántas monedas quieres retirar de tu banco?"
	},
	KICK: { ja: "キック", ru: "КИК", "es-ES": "EXPULSAR" },
	"Kick a user if their nickname contains a specific word": {
		ja: "ニックネームに特定の単語が含まれているユーザーをキック",
		ru: "Кикнуть пользователя, если его ник содержит определенное слово",
		"es-ES":
			"Expulsar a un usuario si su apodo contiene una palabra específica"
	},
	"La partie du surnom que vous souhaitez que la personne ait dans son surnom":
		{
			ja: "相手のニックネームに含めたい部分",
			ru: "Часть ника, которую вы хотите видеть в нике человека",
			"es-ES":
				"La parte del apodo que deseas que la persona tenga en su apodo"
		},
	Large: { ja: "大", ru: "Большой", "es-ES": "Grande" },
	"Lookup an Discord User, and see this previous username !": {
		ja: "Discordユーザーを検索し、以前のユーザー名を確認！",
		ru: "Найти пользователя Discord и посмотреть его предыдущие имена!",
		"es-ES":
			"Buscar un usuario de Discord y ver su nombre de usuario anterior!"
	},
	MUTE: { ja: "ミュート", ru: "МУТ", "es-ES": "SILENCIAR" },
	"Make a embed for allowing to user to create a ticket!": {
		ja: "ユーザーがチケットを作成できるようにする埋め込みを作成！",
		ru: "Создать эмбед для возможности создания тикетов!",
		"es-ES": "Crear un embed para permitir al usuario crear un ticket!"
	},
	"Manage how much money you can get from daily, weekly and monthly!": {
		ja: "デイリー、ウィークリー、マンスリーで獲得できる金額を管理！",
		ru: "Управлять количеством денег, получаемых ежедневно, еженедельно и ежемесячно!",
		"es-ES":
			"Gestionar cuánto dinero puedes obtener de diario, semanal y mensual!"
	},
	"Messages Logs": {
		ja: "メッセージログ",
		ru: "Логи сообщений",
		"es-ES": "Registros de mensajes"
	},
	"Moderation Logs": {
		ja: "モデレーションログ",
		ru: "Логи модерации",
		"es-ES": "Registros de moderación"
	},
	"Need Specific invitations amount": {
		ja: "特定の招待数が必要",
		ru: "Требуется определенное количество приглашений",
		"es-ES": "Necesita cantidad específica de invitaciones"
	},
	"Need specific roles": {
		ja: "特定のロールが必要",
		ru: "Требуются определенные роли",
		"es-ES": "Necesita roles específicos"
	},
	"Need specific messages number": {
		ja: "特定のメッセージ数が必要",
		ru: "Требуется определенное количество сообщений",
		"es-ES": "Necesita número específico de mensajes"
	},
	"Number of users to show (default: 10, max: 25)": {
		ja: "表示するユーザー数（デフォルト: 10, 最大: 25）",
		ru: "Количество пользователей для отображения (по умолчанию: 10, макс: 25)",
		"es-ES": "Número de usuarios a mostrar (predeterminado: 10, máx: 25)"
	},
	"Only owner": {
		ja: "オーナーのみ",
		ru: "Только владелец",
		"es-ES": "Solo propietario"
	},
	"Only the allowlist": {
		ja: "許可リストのみ",
		ru: "Только белый список",
		"es-ES": "Solo la lista de permitidos"
	},
	"Permit to send custom youtube comment (real) !": {
		ja: "カスタムYouTubeコメントを送信可能に（実際のコメント）！",
		ru: "Разрешить отправку пользовательского комментария YouTube (настоящего)!",
		"es-ES": "Permitir enviar comentario personalizado de YouTube (real)!"
	},
	"Please copy the identifiant of the message you want to configure": {
		ja: "設定したいメッセージの識別子をコピーしてください",
		ru: "Пожалуйста, скопируйте идентификатор сообщения, которое вы хотите настроить",
		"es-ES":
			"Por favor, copia el identificador del mensaje que quieres configurar"
	},
	Portuguese: {
		ja: "ポルトガル語",
		ru: "Португальский",
		"es-ES": "Portugués"
	},
	"Power Off the Suggestion Module": {
		ja: "提案モジュールをオフ",
		ru: "Выключить модуль предложений",
		"es-ES": "Apagar el módulo de sugerencias"
	},
	"Power Off the module (don't send any message but user still earn xp level)":
		{
			ja: "モジュールをオフ（メッセージを送信しないが、ユーザーはXPを獲得する）",
			ru: "Выключить модуль (не отправлять сообщения, но XP начисляется)",
			"es-ES":
				"Apagar el módulo (no enviar mensajes pero el usuario aún gana nivel de XP)"
		},
	"Power On the Suggestion Module": {
		ja: "提案モジュールをオン",
		ru: "Включить модуль предложений",
		"es-ES": "Encender el módulo de sugerencias"
	},
	"Power On the module (send message when user earn xp level)": {
		ja: "モジュールをオン（ユーザーがXPレベルを獲得した時にメッセージを送信）",
		ru: "Включить модуль (отправлять сообщение при получении уровня XP)",
		"es-ES":
			"Encender el módulo (enviar mensaje cuando el usuario gana nivel de XP)"
	},
	"Power off": { ja: "オフ", ru: "Выключить", "es-ES": "Apagar" },
	"Power on": { ja: "オン", ru: "Включить", "es-ES": "Encender" },
	"Power on the module": {
		ja: "モジュールをオン",
		ru: "Включить модуль",
		"es-ES": "Encender el módulo"
	},
	"Power on the module (send xp message on a specific channel)": {
		ja: "モジュールをオン（特定のチャンネルにXPメッセージを送信）",
		ru: "Включить модуль (отправлять XP сообщения в указанный канал)",
		"es-ES":
			"Encender el módulo (enviar mensaje de XP en un canal específico)"
	},
	"Randomly distribute members from a voice channel to all voice channels in a category":
		{
			ja: "ボイスチャンネルのメンバーをカテゴリ内の全ボイスチャンネルにランダムに分散",
			ru: "Случайно распределить участников из голосового канала по всем каналам в категории",
			"es-ES":
				"Distribuir aleatoriamente miembros de un canal de voz a todos los canales de voz en una categoría"
		},
	"Re-created a channels (cloning permission and all configurations). nuke equivalent":
		{
			ja: "チャンネルを再作成（権限と全設定をクローン）。nuke相当",
			ru: "Пересоздать канал (клонирование прав и всех настроек). Аналог nuke",
			"es-ES":
				"Recrear un canal (clonando permisos y todas las configuraciones). Equivalente a nuke"
		},
	"Remind the ticket owner that they not have responded since while !": {
		ja: "チケット所有者がしばらく応答していないことを通知！",
		ru: "Напомнить владельцу тикета, что он давно не отвечал!",
		"es-ES":
			"Recordar al propietario del ticket que no ha respondido desde hace tiempo!"
	},
	"Remove a member from the frozen voice channel whitelist": {
		ja: "凍結ボイスチャンネルのホワイトリストからメンバーを削除",
		ru: "Удалить участника из белого списка замороженного голосового канала",
		"es-ES":
			"Eliminar a un miembro de la lista blanca del canal de voz congelado"
	},
	"Remove ability to speak of all users in all channels!": {
		ja: "全チャンネルで全ユーザーの発言権限を削除！",
		ru: "Убрать возможность говорить у всех во всех каналах!",
		"es-ES":
			"Quitar la capacidad de hablar a todos los usuarios en todos los canales!"
	},
	"Remove ability to speak of all users in this text channel!": {
		ja: "このテキストチャンネルで全ユーザーの発言権限を削除！",
		ru: "Убрать возможность говорить у всех в этом текстовом канале!",
		"es-ES":
			"Quitar la capacidad de hablar a todos los usuarios en este canal de texto!"
	},
	"Remove one": {
		ja: "1つ削除",
		ru: "Удалить один",
		"es-ES": "Eliminar uno"
	},
	"Remove the module": {
		ja: "モジュールを削除",
		ru: "Удалить модуль",
		"es-ES": "Eliminar el módulo"
	},
	"Removew role to user": {
		ja: "ユーザーからロールを削除",
		ru: "Удалить роль у пользователя",
		"es-ES": "Quitar rol al usuario"
	},
	Russian: { ja: "ロシア語", ru: "Русский", "es-ES": "Ruso" },
	"See the history of all the music played in this guild!": {
		ja: "このサーバーで再生された全音楽の履歴を表示！",
		ru: "Посмотреть историю всей музыки, воспроизведенной на сервере!",
		"es-ES":
			"Ver el historial de toda la música reproducida en este servidor!"
	},
	"Send an interface to the channel to manage their own voice channel": {
		ja: "自分のボイスチャンネルを管理するためのインターフェースをチャンネルに送信",
		ru: "Отправить интерфейс в канал для управления своим голосовым каналом",
		"es-ES":
			"Enviar una interfaz al canal para gestionar su propio canal de voz"
	},
	"Set a channel for the Suggestion Module (need admin permission)!": {
		ja: "提案モジュール用のチャンネルを設定（管理者権限が必要）！",
		ru: "Установить канал для модуля предложений (требуются права администратора)!",
		"es-ES":
			"Establecer un canal para el módulo de sugerencias (requiere permiso de administrador)!"
	},
	"Set a channel where iHorizon sent a logs about tickets!": {
		ja: "iHorizonがチケットに関するログを送信するチャンネルを設定！",
		ru: "Установить канал для логов iHorizon о тикетах!",
		"es-ES":
			"Establecer un canal donde iHorizon envíe registros sobre tickets!"
	},
	"Set a join dm message when user join the guild!": {
		ja: "ユーザーがサーバーに参加した時のDMメッセージを設定！",
		ru: "Установить приветственное сообщение в ЛС при входе на сервер!",
		"es-ES":
			"Establecer un mensaje de DM de bienvenida cuando el usuario se une al servidor!"
	},
	"Set an role for bypassing TempChannel's permission": {
		ja: "TempChannelの権限をバイパスするロールを設定",
		ru: "Установить роль для обхода прав TempChannel",
		"es-ES": "Establecer un rol para omitir los permisos de TempChannel"
	},
	"Set one": {
		ja: "1つ設定",
		ru: "Установить один",
		"es-ES": "Establecer uno"
	},
	"Set the channel where the voice channel will be created!": {
		ja: "ボイスチャンネルが作成されるチャンネルを設定！",
		ru: "Установить канал, где будет создан голосовой канал!",
		"es-ES": "Establecer el canal donde se creará el canal de voz!"
	},
	"Set the channel where user earn new xp level message!": {
		ja: "ユーザーが新しいXPレベルメッセージを獲得するチャンネルを設定！",
		ru: "Установить канал для сообщений о новом уровне XP!",
		"es-ES":
			"Establecer el canal donde el usuario recibe el mensaje de nuevo nivel de XP!"
	},
	"Set the voice channel name when it will be created!": {
		ja: "ボイスチャンネル作成時の名前を設定！",
		ru: "Установить имя голосового канала при его создании!",
		"es-ES": "Establecer el nombre del canal de voz cuando se cree!"
	},
	"Set the voice channel position in the category when it will be created!": {
		ja: "ボイスチャンネル作成時のカテゴリ内の位置を設定！",
		ru: "Установить позицию голосового канала в категории при создании!",
		"es-ES":
			"Establecer la posición del canal de voz en la categoría cuando se cree!"
	},
	"Setup all channels": {
		ja: "全チャンネルをセットアップ",
		ru: "Настроить все каналы",
		"es-ES": "Configurar todos los canales"
	},
	Short: { ja: "短", ru: "Краткий", "es-ES": "Corto" },
	"Simply Cancel Actions": {
		ja: "アクションをキャンセルのみ",
		ru: "Просто отменить действия",
		"es-ES": "Simplemente cancelar acciones"
	},
	"Simply Cancel Actions + Ban": {
		ja: "アクションをキャンセル + バン",
		ru: "Отменить действия + Бан",
		"es-ES": "Simplemente cancelar acciones + Banear"
	},
	"Something in the bio": {
		ja: "自己紹介に何か",
		ru: "Что-то в описании",
		"es-ES": "Algo en la biografía"
	},
	Spanish: { ja: "スペイン語", ru: "Испанский", "es-ES": "Español" },
	"Target a user for see their current balance or keep blank for yourself": {
		ja: "残高を確認するユーザーを指定（空白で自分）",
		ru: "Укажите пользователя для просмотра баланса или оставьте пустым для себя",
		"es-ES":
			"Selecciona un usuario para ver su saldo actual o déjalo en blanco para ti"
	},
	"The ID of the message to check reactions from": {
		ja: "リアクションを確認するメッセージのID",
		ru: "ID сообщения для проверки реакций",
		"es-ES": "El ID del mensaje para comprobar las reacciones"
	},
	"The ID of your backup you want to delete from the list": {
		ja: "リストから削除したいバックアップのID",
		ru: "ID резервной копии, которую вы хотите удалить из списка",
		"es-ES":
			"El ID de tu copia de seguridad que quieres eliminar de la lista"
	},
	"The Streamer/Youtuber/Twitcher platform": {
		ja: "ストリーマー/YouTuber/Twitcherのプラットフォーム",
		ru: "Платформа стримера/YouTube/Twitch",
		"es-ES": "La plataforma del Streamer/Youtuber/Twitcher"
	},
	"The amount of money you want to donate to them": {
		ja: "寄付したい金額",
		ru: "Сумма денег, которую вы хотите пожертвовать",
		"es-ES": "La cantidad de dinero que quieres donarles"
	},
	"The category containing voice channels to distribute members to": {
		ja: "メンバーを分散するボイスチャンネルを含むカテゴリ",
		ru: "Категория с голосовыми каналами для распределения участников",
		"es-ES":
			"La categoría que contiene los canales de voz a los que distribuir miembros"
	},
	"The channel where notifications will be sent": {
		ja: "通知が送信されるチャンネル",
		ru: "Канал, куда будут отправляться уведомления",
		"es-ES": "El canal donde se enviarán las notificaciones"
	},
	"The channel you want logs when user break the rules": {
		ja: "ユーザーがルールを破った時のログを送信するチャンネル",
		ru: "Канал для логов при нарушении правил",
		"es-ES":
			"El canal donde quieres los registros cuando el usuario rompe las reglas"
	},
	"The channel you want logs when user break the rules!": {
		ja: "ユーザーがルールを破った時のログを送信するチャンネル！",
		ru: "Канал для логов при нарушении правил!",
		"es-ES":
			"El canal donde quieres los registros cuando el usuario rompe las reglas!"
	},
	"The channel you want the dashboard interface are sent": {
		ja: "ダッシュボードインターフェースを送信するチャンネル",
		ru: "Канал для отправки интерфейса панели управления",
		"es-ES": "El canal donde quieres que se envíe la interfaz del panel"
	},
	"The custom role you want to set for the command": {
		ja: "コマンドに設定したいカスタムロール",
		ru: "Пользовательская роль для команды",
		"es-ES": "El rol personalizado que quieres establecer para el comando"
	},
	"The custom user you want to set for the command": {
		ja: "コマンドに設定したいカスタムユーザー",
		ru: "Пользователь для команды",
		"es-ES":
			"El usuario personalizado que quieres establecer para el comando"
	},
	"The giveaway id (is the message id of the embed's giveaways)": {
		ja: "ギブアウェイID（埋め込みギブアウェイのメッセージID）",
		ru: "ID розыгрыша (это ID сообщения эмбеда розыгрыша)",
		"es-ES": "El ID del sorteo (es el ID del mensaje del embed del sorteo)"
	},
	"The guild tag (Boost perks)": {
		ja: "サーバータグ（ブースト特典）",
		ru: "Тег сервера (бонусы буста)",
		"es-ES": "La etiqueta del servidor (Beneficios de Boost)"
	},
	"The member who wants to delete of the owner list (Only Owner of ihorizon)!":
		{
			ja: "オーナーリストから削除したいメンバー（iHorizonオーナーのみ）！",
			ru: "Участник для удаления из списка владельцев (Только владелец iHorizon)!",
			"es-ES":
				"El miembro que quiere eliminar de la lista de propietarios (Solo propietario de iHorizon)!"
		},
	"The member you want to made owner of the iHorizon Projects": {
		ja: "iHorizonプロジェクトのオーナーにしたいメンバー",
		ru: "Участник, которого вы хотите сделать владельцем проектов iHorizon",
		"es-ES":
			"El miembro que quieres hacer propietario de los proyectos iHorizon"
	},
	"The name you want | Variable: {Username}": {
		ja: "希望する名前 | 変数: {Username}",
		ru: "Желаемое имя | Переменная: {Username}",
		"es-ES": "El nombre que deseas | Variable: {Username}"
	},
	"The question you want to give for the bot": {
		ja: "ボットに与えたい質問",
		ru: "Вопрос, который вы хотите задать боту",
		"es-ES": "La pregunta que quieres dar al bot"
	},
	"The role that will be given to new member(s) when process to the Captcha verification!":
		{
			ja: "キャプチャ認証時に新規メンバーに付与されるロール！",
			ru: "Роль, которая будет выдана новым участникам при прохождении капчи!",
			"es-ES":
				"El rol que se dará a los nuevos miembros cuando pasen la verificación Captcha!"
		},
	"The source voice channel to move members from": {
		ja: "メンバーを移動する元のボイスチャンネル",
		ru: "Исходный голосовой канал для перемещения участников",
		"es-ES": "El canal de voz de origen para mover miembros"
	},
	"The track title you want (you can put URL as you want)": {
		ja: "希望するトラックタイトル（URLでも可）",
		ru: "Название трека (можно указать URL)",
		"es-ES":
			"El título de la pista que deseas (puedes poner URL como quieras)"
	},
	"The type of reward you want to set": {
		ja: "設定したい報酬の種類",
		ru: "Тип награды, которую вы хотите установить",
		"es-ES": "El tipo de recompensa que quieres establecer"
	},
	"The user": { ja: "ユーザー", ru: "Пользователь", "es-ES": "El usuario" },
	"The user with whom you want to know love compatibility": {
		ja: "恋愛相性を知りたい相手のユーザー",
		ru: "Пользователь, с которым вы хотите узнать совместимость в любви",
		"es-ES": "El usuario con quien quieres saber la compatibilidad amorosa"
	},
	"The user you want to add into your ticket": {
		ja: "チケットに追加したいユーザー",
		ru: "Пользователь, которого вы хотите добавить в тикет",
		"es-ES": "El usuario que quieres añadir a tu ticket"
	},
	"The user you want to add role": {
		ja: "ロールを追加したいユーザー",
		ru: "Пользователь, которому нужно добавить роль",
		"es-ES": "El usuario al que quieres añadir rol"
	},
	"The user you want to blacklist...": {
		ja: "ブラックリストに入れたいユーザー...",
		ru: "Пользователь, которого вы хотите добавить в черный список...",
		"es-ES": "El usuario que quieres poner en lista negra..."
	},
	"The user you want to edit the reason": {
		ja: "理由を編集したいユーザー",
		ru: "Пользователь, для которого нужно изменить причину",
		"es-ES": "El usuario del que quieres editar la razón"
	},
	"The user you want to hack": {
		ja: "ハッキングしたいユーザー",
		ru: "Пользователь, которого вы хотите взломать",
		"es-ES": "El usuario que quieres hackear"
	},
	"The user you want to hug": {
		ja: "ハグしたいユーザー",
		ru: "Пользователь, которого вы хотите обнять",
		"es-ES": "El usuario que quieres abrazar"
	},
	"The user you want to kiss": {
		ja: "キスしたいユーザー",
		ru: "Пользователь, которого вы хотите поцеловать",
		"es-ES": "El usuario que quieres besar"
	},
	"The user you want to know your love compatibility": {
		ja: "恋愛相性を知りたいユーザー",
		ru: "Пользователь для проверки совместимости в любви",
		"es-ES":
			"El usuario con quien quieres conocer tu compatibilidad amorosa"
	},
	"The user you want to look at...": {
		ja: "確認したいユーザー...",
		ru: "Пользователь, которого вы хотите посмотреть...",
		"es-ES": "El usuario que quieres mirar..."
	},
	"The user you want to lookup, keep blank if you want to show your stats": {
		ja: "検索したいユーザー（空白で自分の統計を表示）",
		ru: "Пользователь для поиска, оставьте пустым для показа своей статистики",
		"es-ES":
			"El usuario que quieres buscar, déjalo en blanco si quieres mostrar tus estadísticas"
	},
	"The user you want to remove into your ticket": {
		ja: "チケットから削除したいユーザー",
		ru: "Пользователь, которого вы хотите удалить из тикета",
		"es-ES": "El usuario que quieres eliminar de tu ticket"
	},
	"The user you want to reset the ranks data": {
		ja: "ランクデータをリセットしたいユーザー",
		ru: "Пользователь, чьи данные рангов нужно сбросить",
		"es-ES": "El usuario al que quieres restablecer los datos de rango"
	},
	"The user you want to slap": {
		ja: "平手打ちしたいユーザー",
		ru: "Пользователь, которому вы хотите дать пощечину",
		"es-ES": "El usuario que quieres abofetear"
	},
	"The user you want to temporarily ban": {
		ja: "一時的にバンしたいユーザー",
		ru: "Пользователь для временного бана",
		"es-ES": "El usuario que quieres banear temporalmente"
	},
	"The user you want to unblacklist (Only Owner of ihorizon)": {
		ja: "ブラックリストから解除したいユーザー（iHorizonオーナーのみ）",
		ru: "Пользователь для удаления из черного списка (Только владелец iHorizon)",
		"es-ES":
			"El usuario que quieres quitar de la lista negra (Solo propietario de iHorizon)"
	},
	"The user you want to unblacklist (Only Owner of ihorizon)!": {
		ja: "ブラックリストから解除したいユーザー（iHorizonオーナーのみ）！",
		ru: "Пользователь для удаления из черного списка (Только владелец iHorizon)!",
		"es-ES":
			"El usuario que quieres quitar de la lista negra (Solo propietario de iHorizon)!"
	},
	"The user you want to unmuted": {
		ja: "ミュート解除したいユーザー",
		ru: "Пользователь для размута",
		"es-ES": "El usuario que quieres desilenciar"
	},
	"The voice channel to move members from": {
		ja: "メンバーを移動する元のボイスチャンネル",
		ru: "Голосовой канал, откуда перемещать участников",
		"es-ES": "El canal de voz desde donde mover miembros"
	},
	"The voice channel to move members to": {
		ja: "メンバーを移動する先のボイスチャンネル",
		ru: "Голосовой канал, куда перемещать участников",
		"es-ES": "El canal de voz al que mover miembros"
	},
	"The warn id": {
		ja: "警告ID",
		ru: "ID предупреждения",
		"es-ES": "El ID de la advertencia"
	},
	"The x time": { ja: "X回", ru: "X раз", "es-ES": "Las X veces" },
	"The zip file to recreate emojis": {
		ja: "絵文字を再作成するZIPファイル",
		ru: "ZIP-файл для воссоздания эмодзи",
		"es-ES": "El archivo zip para recrear emojis"
	},
	"Ticket Logs": {
		ja: "チケットログ",
		ru: "Логи тикетов",
		"es-ES": "Registros de tickets"
	},
	"Time period (daily, weekly, monthly)": {
		ja: "期間（デイリー、ウィークリー、マンスリー）",
		ru: "Период (ежедневно, еженедельно, ежемесячно)",
		"es-ES": "Período de tiempo (diario, semanal, mensual)"
	},
	"Transform a string into a Morse!": {
		ja: "文字列をモールス信号に変換！",
		ru: "Преобразовать строку в азбуку Морзе!",
		"es-ES": "Transformar una cadena en Morse!"
	},
	Twitch: { ja: "Twitch", ru: "Twitch", "es-ES": "Twitch" },
	"UnLeash a member in the guild": {
		ja: "サーバー内のメンバーのリードを外す",
		ru: "Отвязать участника на сервере",
		"es-ES": "Desatar a un miembro en el servidor"
	},
	"Unban a user!": {
		ja: "ユーザーのバンを解除！",
		ru: "Разбанить пользователя!",
		"es-ES": "Desbanear a un usuario!"
	},
	"Unhide all channels in the server from everyone": {
		ja: "サーバー内の全チャンネルを全員に表示",
		ru: "Показать все каналы всем на сервере",
		"es-ES": "Mostrar todos los canales del servidor a todos"
	},
	"Unhide the current channel from everyone": {
		ja: "現在のチャンネルを全員に表示",
		ru: "Показать текущий канал всем",
		"es-ES": "Mostrar el canal actual a todos"
	},
	"Up (TOP)": {
		ja: "上（最上部）",
		ru: "Вверх (сверху)",
		"es-ES": "Arriba (Superior)"
	},
	"Use a tag": {
		ja: "タグを使用",
		ru: "Использовать тег",
		"es-ES": "Usar una etiqueta"
	},
	"Vanity URL code": {
		ja: "バニティURLコード",
		ru: "Код персональной ссылки",
		"es-ES": "Código de URL de vanidad"
	},
	"Voice Logs": {
		ja: "ボイスログ",
		ru: "Логи голосовых каналов",
		"es-ES": "Registros de voz"
	},
	"Wake up an user with mass mooving randomly in voice channel": {
		ja: "ボイスチャンネルでランダムに大量移動してユーザーを起こす",
		ru: "Разбудить пользователя массовым случайным перемещением по голосовому каналу",
		"es-ES":
			"Despertar a un usuario moviéndolo masivamente de forma aleatoria en el canal de voz"
	},
	"What do you want to do ?": {
		ja: "何をしたいですか？",
		ru: "Что вы хотите сделать?",
		"es-ES": "Que quieres hacer?"
	},
	"What do you want to do?": {
		ja: "何をしたいですか？",
		ru: "Что вы хотите сделать?",
		"es-ES": "Que quieres hacer?"
	},
	"What is the problem? Please make a good sentences": {
		ja: "問題は何ですか？良い文章で説明してください",
		ru: "В чем проблема? Пожалуйста, составьте хорошее предложение",
		"es-ES": "Cual es el problema? Por favor, haz una buena oración"
	},
	"What message you want reply?": {
		ja: "どのメッセージに返信しますか？",
		ru: "На какое сообщение вы хотите ответить?",
		"es-ES": "A qué mensaje quieres responder?"
	},
	"What reason for you accepting ?": {
		ja: "承認する理由は？",
		ru: "Причина принятия?",
		"es-ES": "Que razón tienes para aceptar?"
	},
	"What reason for you denying ?": {
		ja: "拒否する理由は？",
		ru: "Причина отказа?",
		"es-ES": "Que razón tienes para denegar?"
	},
	"What the action you want to do?": {
		ja: "実行したいアクションは？",
		ru: "Какое действие вы хотите выполнить?",
		"es-ES": "Cual es la acción que quieres realizar?"
	},
	"What the emoji then?": {
		ja: "どの絵文字ですか？",
		ru: "Какой эмодзи?",
		"es-ES": "Cual es el emoji entonces?"
	},
	"What the id of the suggestion?": {
		ja: "提案のIDは？",
		ru: "Какой ID предложения?",
		"es-ES": "Cual es el ID de la sugerencia?"
	},
	"What the the role ?": {
		ja: "どのロールですか？",
		ru: "Какая роль?",
		"es-ES": "Cual es el rol?"
	},
	"What the user then?": {
		ja: "どのユーザーですか？",
		ru: "Какой пользователь?",
		"es-ES": "Cual es el usuario entonces?"
	},
	"What you want to do ?": {
		ja: "何をしたいですか？",
		ru: "Что вы хотите сделать?",
		"es-ES": "Que quieres hacer?"
	},
	"What's type of input you user have to?": {
		ja: "ユーザーが入力するタイプは？",
		ru: "Какой тип ввода у пользователя?",
		"es-ES": "Que tipo de entrada tiene el usuario?"
	},
	"Whats is the backup id?": {
		ja: "バックアップIDは？",
		ru: "Какой ID резервной копии?",
		"es-ES": "Cual es el ID de la copia de seguridad?"
	},
	"Whats is the member then?": {
		ja: "どのメンバーですか？",
		ru: "Какой участник?",
		"es-ES": "Cual es el miembro entonces?"
	},
	"Whats is the rule to configure?": {
		ja: "設定するルールは？",
		ru: "Какое правило настроить?",
		"es-ES": "Cual es la regla a configurar?"
	},
	"Whats is the sanction then?": {
		ja: "どの制裁ですか？",
		ru: "Какая санкция?",
		"es-ES": "Cual es la sanción entonces?"
	},
	"When user earn a ranks's level, give it a role!": {
		ja: "ユーザーがランクレベルを獲得したらロールを付与！",
		ru: "Когда пользователь получает уровень ранга, выдать роль!",
		"es-ES": "Cuando el usuario gana un nivel de rango, darle un rol!"
	},
	"Where you want the logs": {
		ja: "ログを送信する場所",
		ru: "Куда вы хотите отправлять логи",
		"es-ES": "Donde quieres los registros"
	},
	"Withdraw coin from your bank!": {
		ja: "銀行からコインを引き出す！",
		ru: "Снять монеты из банка!",
		"es-ES": "Retirar monedas de tu banco!"
	},
	"Your Last.fm username or email address": {
		ja: "Last.fmのユーザー名またはメールアドレス",
		ru: "Ваше имя пользователя или email Last.fm",
		"es-ES": "Tu nombre de usuario o dirección de correo de Last.fm"
	},
	"Your age on the iHorizon's profil": {
		ja: "iHorizonプロフィールの年齢",
		ru: "Ваш возраст в профиле iHorizon",
		"es-ES": "Tu edad en el perfil de iHorizon"
	},
	"Your descriptions on the iHorizon's profil": {
		ja: "iHorizonプロフィールの説明",
		ru: "Ваше описание в профиле iHorizon",
		"es-ES": "Tu descripción en el perfil de iHorizon"
	},
	Youtube: { ja: "YouTube", ru: "YouTube", "es-ES": "YouTube" },
	caracteres: { ja: "文字", ru: "символы", "es-ES": "caracteres" },
	"clear all warns of a user": {
		ja: "ユーザーの全警告をクリア",
		ru: "очистить все предупреждения пользователя",
		"es-ES": "limpiar todas las advertencias de un usuario"
	},
	"clear all warns of all users across the server": {
		ja: "サーバー全体の全ユーザーの警告をクリア",
		ru: "очистить все предупреждения всех пользователей",
		"es-ES":
			"limpiar todas las advertencias de todos los usuarios del servidor"
	},
	config: { ja: "設定", ru: "конфигурация", "es-ES": "configuración" },
	content: { ja: "内容", ru: "содержимое", "es-ES": "contenido" },
	create: { ja: "作成", ru: "создать", "es-ES": "crear" },
	deny: { ja: "拒否", ru: "отклонить", "es-ES": "denegar" },
	dice: { ja: "サイコロ", ru: "кости", "es-ES": "dado" },
	duck: { ja: "アヒル", ru: "утка", "es-ES": "pato" },
	duration: { ja: "期間", ru: "длительность", "es-ES": "duración" },
	economy: { ja: "経済", ru: "экономика", "es-ES": "economía" },
	"edit the permission roles into the guild": {
		ja: "サーバーの権限ロールを編集",
		ru: "редактировать роли разрешений на сервере",
		"es-ES": "editar los roles de permiso en el servidor"
	},
	faces: { ja: "面", ru: "грани", "es-ES": "caras" },
	"get-all": { ja: "全て取得", ru: "получить все", "es-ES": "obtener todo" },
	"get-data": {
		ja: "データ取得",
		ru: "получить данные",
		"es-ES": "obtener datos"
	},
	hack: { ja: "ハック", ru: "взлом", "es-ES": "hackear" },
	"heads-tails": { ja: "表裏", ru: "орел-решка", "es-ES": "cara-cruz" },
	history: { ja: "履歴", ru: "история", "es-ES": "historial" },
	"image file": {
		ja: "画像ファイル",
		ru: "файл изображения",
		"es-ES": "archivo de imagen"
	},
	interface: { ja: "インターフェース", ru: "интерфейс", "es-ES": "interfaz" },
	kiss: { ja: "キス", ru: "поцелуй", "es-ES": "beso" },
	lang: { ja: "言語", ru: "язык", "es-ES": "idioma" },
	language: { ja: "言語", ru: "язык", "es-ES": "idioma" },
	level: { ja: "レベル", ru: "уровень", "es-ES": "nivel" },
	load: { ja: "読み込み", ru: "загрузить", "es-ES": "cargar" },
	loop: { ja: "ループ", ru: "повтор", "es-ES": "bucle" },
	love: { ja: "愛", ru: "любовь", "es-ES": "amor" },
	"member you want to leash": {
		ja: "リードでつなぎたいメンバー",
		ru: "участник для привязки",
		"es-ES": "miembro que quieres atar"
	},
	"member you want to unleash": {
		ja: "リードを外したいメンバー",
		ru: "участник для отвязки",
		"es-ES": "miembro que quieres desatar"
	},
	music: { ja: "音楽", ru: "музыка", "es-ES": "música" },
	number: { ja: "数字", ru: "число", "es-ES": "número" },
	"other (say my name)": {
		ja: "その他（私の名前を言って）",
		ru: "другое (скажи мое имя)",
		"es-ES": "otro (di mi nombre)"
	},
	perm_level: {
		ja: "権限レベル",
		ru: "уровень разрешений",
		"es-ES": "nivel de permiso"
	},
	"permission you want to set for the member": {
		ja: "メンバーに設定したい権限",
		ru: "разрешение для участника",
		"es-ES": "permiso que quieres establecer para el miembro"
	},
	prize: { ja: "賞品", ru: "приз", "es-ES": "premio" },
	"re-open a closed ticket!": {
		ja: "閉じたチケットを再オープン！",
		ru: "переоткрыть закрытый тикет!",
		"es-ES": "reabrir un ticket cerrado!"
	},
	reply: { ja: "返信", ru: "ответить", "es-ES": "responder" },
	reroll: { ja: "再抽選", ru: "перевыбрать", "es-ES": "volver a sortear" },
	resume: { ja: "再開", ru: "возобновить", "es-ES": "reanudar" },
	"role-to-give": {
		ja: "付与するロール",
		ru: "роль для выдачи",
		"es-ES": "rol a dar"
	},
	rule: { ja: "ルール", ru: "правило", "es-ES": "regla" },
	security: { ja: "セキュリティ", ru: "безопасность", "es-ES": "seguridad" },
	"set-birthday": {
		ja: "誕生日設定",
		ru: "установить день рождения",
		"es-ES": "establecer cumpleaños"
	},
	"set-gender": {
		ja: "性別設定",
		ru: "установить пол",
		"es-ES": "establecer género"
	},
	"set-pronoun": {
		ja: "代名詞設定",
		ru: "установить местоимение",
		"es-ES": "establecer pronombre"
	},
	setlang: {
		ja: "言語設定",
		ru: "установить язык",
		"es-ES": "establecer idioma"
	},
	"she/her": {
		ja: "彼女 (she/her)",
		ru: "она (she/her)",
		"es-ES": "ella (she/her)"
	},
	show: { ja: "表示", ru: "показать", "es-ES": "mostrar" },
	"show all granted user in the guild": {
		ja: "サーバー内の権限付与ユーザーを全て表示",
		ru: "показать всех пользователей с правами",
		"es-ES": "mostrar todos los usuarios con permisos en el servidor"
	},
	"show all warns of a user": {
		ja: "ユーザーの全警告を表示",
		ru: "показать все предупреждения пользователя",
		"es-ES": "mostrar todas las advertencias de un usuario"
	},
	shuffle: { ja: "シャッフル", ru: "перемешать", "es-ES": "mezclar" },
	slap: { ja: "平手打ち", ru: "пощечина", "es-ES": "bofetada" },
	support: { ja: "サポート", ru: "поддержка", "es-ES": "soporte" },
	"the channel you want": {
		ja: "希望するチャンネル",
		ru: "желаемый канал",
		"es-ES": "el canal que deseas"
	},
	"the discord invite / code": {
		ja: "Discord招待 / コード",
		ru: "приглашение / код Discord",
		"es-ES": "la invitación / código de Discord"
	},
	"the duration of the user's tempmute": {
		ja: "ユーザーの一時的ミュート期間",
		ru: "длительность временного мута",
		"es-ES": "la duración del silencio temporal"
	},
	"the member you want to add invites": {
		ja: "招待を追加したいメンバー",
		ru: "участник, которому добавить приглашения",
		"es-ES": "el miembro al que quieres añadir invitaciones"
	},
	"the member you want to add the money": {
		ja: "お金を追加したいメンバー",
		ru: "участник, которому добавить деньги",
		"es-ES": "el miembro al que quieres añadir dinero"
	},
	"the member you want to ban": {
		ja: "バンしたいメンバー",
		ru: "участник для бана",
		"es-ES": "el miembro que quieres banear"
	},
	"the member you want to check": {
		ja: "確認したいメンバー",
		ru: "участник для проверки",
		"es-ES": "el miembro que quieres comprobar"
	},
	"the member you want to kick": {
		ja: "キックしたいメンバー",
		ru: "участник для кика",
		"es-ES": "el miembro que quieres expulsar"
	},
	"the member you want to remove invites": {
		ja: "招待を削除したいメンバー",
		ru: "участник, у которого убрать приглашения",
		"es-ES": "el miembro del que quieres quitar invitaciones"
	},
	"the member you want to show them invites": {
		ja: "招待数を表示したいメンバー",
		ru: "участник, чьи приглашения показать",
		"es-ES": "el miembro al que quieres mostrar sus invitaciones"
	},
	"the new reason": {
		ja: "新しい理由",
		ru: "новая причина",
		"es-ES": "la nueva razón"
	},
	"the private message": {
		ja: "プライベートメッセージ",
		ru: "приватное сообщение",
		"es-ES": "el mensaje privado"
	},
	"the reason of the bannisement": {
		ja: "バンの理由",
		ru: "причина бана",
		"es-ES": "la razón del baneo"
	},
	"the reason of the kick": {
		ja: "キックの理由",
		ru: "причина кика",
		"es-ES": "la razón de la expulsión"
	},
	"the reason why you tempmuted": {
		ja: "一時的ミュートの理由",
		ru: "причина временного мута",
		"es-ES": "la razón del silencio temporal"
	},
	"the role that you want to hide into the channel": {
		ja: "チャンネルで非表示にしたいロール",
		ru: "роль, которую нужно скрыть в канале",
		"es-ES": "el rol que quieres ocultar en el canal"
	},
	"the role that you want to unhide into all guild channels": {
		ja: "全サーバーチャンネルで表示したいロール",
		ru: "роль, которую нужно показать во всех каналах",
		"es-ES": "el rol que quieres mostrar en todos los canales del servidor"
	},
	"the role that you want to unhide into the channel": {
		ja: "チャンネルで表示したいロール",
		ru: "роль, которую нужно показать в канале",
		"es-ES": "el rol que quieres mostrar en el canal"
	},
	"the user": { ja: "ユーザー", ru: "пользователь", "es-ES": "el usuario" },
	the_things: { ja: "もの", ru: "вещи", "es-ES": "las cosas" },
	"they/them": {
		ja: "彼ら (they/them)",
		ru: "они (they/them)",
		"es-ES": "elle (they/them)"
	},
	threshold: { ja: "しきい値", ru: "порог", "es-ES": "umbral" },
	transgender: {
		ja: "トランスジェンダー",
		ru: "трансгендер",
		"es-ES": "transgénero"
	},
	"unban-all": {
		ja: "全バン解除",
		ru: "разбанить всех",
		"es-ES": "desbanear a todos"
	},
	undo: { ja: "元に戻す", ru: "отменить", "es-ES": "deshacer" },
	"unwarn a user": {
		ja: "ユーザーの警告を解除",
		ru: "снять предупреждение",
		"es-ES": "quitar advertencia"
	},
	"user you want to lookup": {
		ja: "検索したいユーザー",
		ru: "пользователь для поиска",
		"es-ES": "usuario que quieres buscar"
	},
	"warn a user": {
		ja: "ユーザーを警告",
		ru: "предупредить пользователя",
		"es-ES": "advertir a un usuario"
	},
	winner: { ja: "当選者", ru: "победитель", "es-ES": "ganador" },
	"without comment": {
		ja: "コメントなし",
		ru: "без комментария",
		"es-ES": "sin comentario"
	},
	"xe/xem": { ja: "xe/xem", ru: "xe/xem", "es-ES": "xe/xem" },
	"your captions": {
		ja: "あなたの字幕",
		ru: "ваши подписи",
		"es-ES": "tus subtítulos"
	},
	"your cool nickname to transform !": {
		ja: "変換したいクールなニックネーム！",
		ru: "ваш крутой ник для преобразования!",
		"es-ES": "tu apodo genial para transformar!"
	},
	"ze/zem": { ja: "ze/zem", ru: "ze/zem", "es-ES": "ze/zem" },
	English: { ja: "英語", ru: "Английский", "es-ES": "Inglés" },
	French: { ja: "フランス語", ru: "Французский", "es-ES": "Francés" },
	German: { ja: "ドイツ語", ru: "Немецкий", "es-ES": "Alemán" },
	Italian: { ja: "イタリア語", ru: "Итальянский", "es-ES": "Italiano" },
	Japanese: { ja: "日本語", ru: "Японский", "es-ES": "Japonés" },
	"he/him": { ja: "彼 (he/him)", ru: "он (he/him)", "es-ES": "él (he/him)" },

	// === Round 2: untranslated strings ===
	"Max amount of mention allowed in only one message !": {
		ja: "1つのメッセージで許可される最大メンション数！",
		ru: "Максимальное количество упоминаний в одном сообщении!",
		"es-ES": "Cantidad máxima de menciones permitidas en un solo mensaje!"
	},
	"Show the current configuration about protection authorization/rule & allow list!":
		{
			ja: "保護認証/ルールと許可リストの現在の設定を表示！",
			ru: "Показать текущую конфигурацию авторизации/правил и белого списка!",
			"es-ES":
				"Mostrar la configuración actual sobre autorización/reglas de protección y lista de permitidos!"
		},
	"What the channel for the suggestion place?": {
		ja: "提案を設置するチャンネルは？",
		ru: "Какой канал для размещения предложений?",
		"es-ES": "Cual es el canal para colocar las sugerencias?"
	},
	"When a Streamer/Youtuber/Twitcher publish a video, iHorizon send a message in channel":
		{
			ja: "ストリーマー/YouTuber/Twitcherが動画を公開したら、iHorizonがチャンネルにメッセージを送信",
			ru: "Когда стример/YouTube/Twitch публикует видео, iHorizon отправляет сообщение в канал",
			"es-ES":
				"Cuando un Streamer/Youtuber/Twitcher publica un video, iHorizon envía un mensaje en el canal"
		},
	"When a Streamer/Youtuber/Twitcher publish a video, iHorizon send a message":
		{
			ja: "ストリーマー/YouTuber/Twitcherが動画を公開したら、iHorizonがメッセージを送信",
			ru: "Когда стример/YouTube/Twitch публикует видео, iHorizon отправляет сообщение",
			"es-ES":
				"Cuando un Streamer/Youtuber/Twitcher publica un video, iHorizon envía un mensaje"
		},
	"Your Last.fm password": {
		ja: "Last.fmのパスワード",
		ru: "Ваш пароль Last.fm",
		"es-ES": "Tu contraseña de Last.fm"
	},
	"Transform image to gif": {
		ja: "画像をGIFに変換",
		ru: "Преобразовать изображение в GIF",
		"es-ES": "Transformar imagen a gif"
	},
	"Transform a string into a DarkSasuke!": {
		ja: "文字列をDarkSasukeに変換！",
		ru: "Преобразовать строку в DarkSasuke!",
		"es-ES": "Transformar una cadena en DarkSasuke!"
	},
	"The emojis you want": {
		ja: "使用したい絵文字",
		ru: "Эмодзи, которые вы хотите",
		"es-ES": "Los emojis que deseas"
	},
	"Unlink a ticket!": {
		ja: "チケットのリンクを解除！",
		ru: "Отвязать тикет!",
		"es-ES": "Desvincular un ticket!"
	},
	"The channel to set the member count": {
		ja: "メンバーカウントを設定するチャンネル",
		ru: "Канал для установки счетчика участников",
		"es-ES": "El canal para establecer el conteo de miembros"
	},
	"Time window like 10s, 1m, 5m, 1h": {
		ja: "時間枠（例: 10s, 1m, 5m, 1h）",
		ru: "Временное окно, например 10с, 1м, 5м, 1ч",
		"es-ES": "Ventana de tiempo como 10s, 1m, 5m, 1h"
	},
	"Set the star threshold needed for being referenced into the channel": {
		ja: "チャンネルで参照されるために必要なスターのしきい値を設定",
		ru: "Установить порог звезд для попадания в канал",
		"es-ES":
			"Establecer el umbral de estrellas necesario para ser referenciado en el canal"
	},
	"Create a thread bellow the message into the star channel ?": {
		ja: "スターチャンネルのメッセージの下にスレッドを作成しますか？",
		ru: "Создать ветку под сообщением в звездном канале?",
		"es-ES": "Crear un hilo debajo del mensaje en el canal de estrellas?"
	},
	"Set skull threshold needed for being referenced into the channel": {
		ja: "チャンネルで参照されるために必要な skull のしきい値を設定",
		ru: "Установить порог черепов для попадания в канал",
		"es-ES":
			"Establecer el umbral de skulls necesario para ser referenciado en el canal"
	},
	"Create a thread bellow the message into the skull channel ?": {
		ja: "skullチャンネルのメッセージの下にスレッドを作成しますか？",
		ru: "Создать ветку под сообщением в канале черепов?",
		"es-ES": "Crear un hilo debajo del mensaje en el canal de skulls?"
	},
	"What language you want ?": {
		ja: "どの言語がいいですか？",
		ru: "Какой язык вы хотите?",
		"es-ES": "Que idioma quieres?"
	},
	"What you want the bot to say!": {
		ja: "ボットに何を言わせたいですか！",
		ru: "Что вы хотите, чтобы бот сказал!",
		"es-ES": "Que quieres que el bot diga!"
	},
	"Make the backup system only working for guild owner": {
		ja: "バックアップシステムをサーバーオーナーのみに制限",
		ru: "Сделать систему резервного копирования доступной только владельцу сервера",
		"es-ES":
			"Hacer que el sistema de copias de seguridad solo funcione para el propietario del servidor"
	},
	"Get informations about all giveaways in a guild (JSON Body)": {
		ja: "サーバー内の全ギブアウェイの情報を取得（JSONデータ）",
		ru: "Получить информацию о всех розыгрышах на сервере (JSON)",
		"es-ES":
			"Obtener información sobre todos los sorteos en un servidor (cuerpo JSON)"
	},
	"the member you want to rob a money": {
		ja: "お金を奪いたいメンバー",
		ru: "участник, у которого вы хотите украсть деньги",
		"es-ES": "el miembro al que quieres robar dinero"
	},
	"Les actions que vous souhaitez définir": {
		ja: "設定したいアクション",
		ru: "Действия, которые вы хотите определить",
		"es-ES": "Las acciones que deseas definir"
	},
	"The user you want to reset the economy data": {
		ja: "経済データをリセットしたいユーザー",
		ru: "Пользователь, чьи экономические данные нужно сбросить",
		"es-ES": "El usuario al que quieres restablecer los datos de economía"
	},
	"What the channel ?": {
		ja: "どのチャンネルですか？",
		ru: "Какой канал?",
		"es-ES": "Cual es el canal?"
	},
	"The role that will be removed to new member(s) when process to the Captcha verification!":
		{
			ja: "キャプチャ認証時に新規メンバーから削除されるロール！",
			ru: "Роль, которая будет снята с новых участников при прохождении капчи!",
			"es-ES":
				"El rol que se quitará a los nuevos miembros cuando pasen la verificación Captcha!"
		},
	"the member you want": {
		ja: "対象のメンバー",
		ru: "желаемый участник",
		"es-ES": "el miembro que deseas"
	},
	"Give a roles to all user who have specified char in their username!": {
		ja: "ユーザー名に特定の文字を含む全ユーザーにロールを付与！",
		ru: "Выдать роли всем пользователям с указанными символами в имени!",
		"es-ES":
			"Dar roles a todos los usuarios que tengan un carácter específico en su nombre de usuario!"
	},
	"Move all members connected in a voice channel to another one": {
		ja: "ボイスチャンネルに接続中の全メンバーを別のチャンネルに移動",
		ru: "Переместить всех участников из одного голосового канала в другой",
		"es-ES": "Mover todos los miembros conectados en un canal de voz a otro"
	},
	"The user you want to remove role": {
		ja: "ロールを削除したいユーザー",
		ru: "Пользователь, у которого нужно удалить роль",
		"es-ES": "El usuario al que quieres quitar el rol"
	},
	"the role that you want to hide into all guild channels": {
		ja: "全サーバーチャンネルで非表示にしたいロール",
		ru: "роль, которую нужно скрыть во всех каналах сервера",
		"es-ES": "el rol que quieres ocultar en todos los canales del servidor"
	},
	"Unban all member of the guild": {
		ja: "サーバーの全メンバーのバンを解除",
		ru: "Разбанить всех участников сервера",
		"es-ES": "Desbanear a todos los miembros del servidor"
	},
	"Undo the unban all of all members": {
		ja: "全メンバーの一斉バン解除を取り消し",
		ru: "Отменить разбан всех участников",
		"es-ES": "Deshacer el desbaneo masivo de todos los miembros"
	},
	"The TTS language to use!": {
		ja: "使用するTTS言語！",
		ru: "Язык TTS для использования!",
		"es-ES": "El idioma TTS a usar!"
	},
	"Webhook URL or webhook code": {
		ja: "WebhookのURLまたはWebhookコード",
		ru: "URL вебхука или код вебхука",
		"es-ES": "URL del webhook o código del webhook"
	},
	"Giveaway's ID": {
		ja: "ギブアウェイのID",
		ru: "ID розыгрыша",
		"es-ES": "ID del sorteo"
	},
	"Stop a giveaway!": {
		ja: "ギブアウェイを停止！",
		ru: "Остановить розыгрыш!",
		"es-ES": "Detener un sorteo!"
	},
	"⭐️ (VERY UHQ) Git Lines": {
		ja: "⭐️ (VERY UHQ) Git Lines",
		ru: "⭐️ (VERY UHQ) Git Lines",
		"es-ES": "⭐️ (VERY UHQ) Git Lines"
	},
	"⭐️ (VERY UHQ) NightMode": {
		ja: "⭐️ (VERY UHQ) NightMode",
		ru: "⭐️ (VERY UHQ) NightMode",
		"es-ES": "⭐️ (VERY UHQ) NightMode"
	}
};

export default translations;
