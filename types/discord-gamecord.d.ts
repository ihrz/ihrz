declare module 'discord-gamecord' {
    import { Message, CommandInteraction, User } from 'discord.js';

    interface GameOptions {
        message: Message | CommandInteraction;
        isSlashGame?: boolean;
        opponent: User;
        embed?: {
            color?: string | number;
            timestamp?: boolean;
        };
        buttons?: {
            [key: string]: {
                style?: number;
                label?: string;
                emoji?: string;
            };
        };
        emojis?: {
            [key: string]: string;
        };
        timeoutTime?: number;
        buttonStyle?: 'PRIMARY' | 'SECONDARY' | 'SUCCESS' | 'DANGER';
        turnMessage?: string;
        winMessage?: string;
        tieMessage?: string;
        timeoutMessage?: string;
        playerOnlyMessage?: string;
        mentionUser?: boolean;
        gameID?: string;
        requestMessage?: string;
    }

    export class TicTacToe {
        constructor(options: GameOptions);
        startGame(): Promise<void>;
        on(event: 'gameOver' | 'turnStart', listener: (data: any) => void): this;
    }
}
