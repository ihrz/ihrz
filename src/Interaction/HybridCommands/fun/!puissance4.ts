import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    ComponentType,
    Message,
} from 'discord.js';

import { LanguageData } from '../../../../types/languageData.js';
import { SubCommand } from '../../../../types/command.js';
const { Connect4 } = require('discord-gamecord');

interface GameResult {
    winner: string;
    score: number;
}

export const subCommand: SubCommand = {
    run: async (
        client: Client,
        interaction: ChatInputCommandInteraction | Message,
        lang: LanguageData,
        args?: string[]
    ) => {
        if (interaction instanceof ChatInputCommandInteraction) {
            const opponent = interaction.options.getUser("user");

            if (!opponent) {
                const response = {
                    content: lang.tictactoe_no_opponent,
                    ephemeral: true,
                } as const;
                return interaction.deferred
                    ? interaction.editReply(response)
                    : interaction.reply(response);
            }

            if (opponent.id === interaction.user.id) {
                const response = {
                    content: lang.tictactoe_against_yourself,
                    ephemeral: true,
                } as const;
                return interaction.deferred
                    ? interaction.editReply(response)
                    : interaction.reply(response);
            }

            // Lancer une partie de Connect 4
            const approvalOptions = {
                embed: {
                    requestTitle: 'Demande de jeu',
                    requestColor: '#57F287',
                    rejectTitle: 'Demande annulée',
                    rejectColor: '#ED4245'
                },
                buttons: {
                    accept: 'Accepter',
                    reject: 'Rejeter'
                },
                reqTimeoutTime: 30000,
                requestMessage: '{player} vous a invité à une partie.',
                rejectMessage: 'Le joueur a refusé votre demande de partie.',
                reqTimeoutMessage: 'Partie abandonnée car le joueur n\'a pas répondu.'
            };

            const Game = new Connect4({
                message: interaction,
                isSlashGame: true,
                opponent,
                embed: {
                    title: 'Jeu de Puissance 4',
                    statusTitle: 'Statut',
                    color: '#5865F2',
                },
                emojis: {
                    board: '⚪',
                    player1: '🔴',
                    player2: '🟡',
                },
                mentionUser: true,
                timeoutTime: 60000,
                buttonStyle: 'PRIMARY',
                turnMessage: '{emoji} | C\'est au tour de **{player}**.',
                winMessage: '{emoji} | **{player}** a gagné le jeu de Connect 4 !',
                tieMessage: 'Match nul ! Personne n\'a gagné.',
                timeoutMessage: 'Le jeu est inachevé ! Personne n\'a gagné.',
                playerOnlyMessage: 'Seuls {player} et {opponent} peuvent utiliser ces boutons.',
                approvalOptions: approvalOptions
            });

            Game.startGame();
            Game.on('gameOver', (result: GameResult) => {
                console.log(result); // Résultat du jeu
            });
        }
    },
};
