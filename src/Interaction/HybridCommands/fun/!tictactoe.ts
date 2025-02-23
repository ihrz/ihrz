/*
・ iHorizon Discord Bot (https://github.com/ihrz/ihrz)

・ Licensed under the Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)

    ・   Under the following terms:

        ・ Attribution — You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.

        ・ NonCommercial — You may not use the material for commercial purposes.

        ・ ShareAlike — If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

        ・ No additional restrictions — You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.


・ Mainly developed by Kisakay (https://github.com/Kisakay)

・ Copyright 2020-2025 iHorizon
*/

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

export const subCommand: SubCommand = {
    run: async (client: Client, interaction: ChatInputCommandInteraction | Message, lang: LanguageData, args?: string[]) => {
        if (interaction instanceof ChatInputCommandInteraction) {
            const opponent = interaction.options.getUser("user");

            if (!opponent) {
                const response = {
                    content: lang.tictactoe_no_opponent,
                    ephemeral: true
                } as const;
                return interaction.deferred ? interaction.editReply(response) : interaction.reply({ withResponse: true, ...response });
            }

            if (opponent.id === interaction.user.id) {
                const response = {
                    content: lang.tictactoe_against_yourself,
                    ephemeral: true
                } as const;
                return interaction.deferred ? interaction.editReply(response) : interaction.reply({ withResponse: true, ...response });
            }

            if (opponent.bot) {
                const response = {
                    content: lang.tictactoe_cant_play_against_bot,
                    ephemeral: true
                } as const;
                return interaction.deferred ? interaction.editReply(response) : interaction.reply({ withResponse: true, ...response });
            }

            const response = {
                content: "Tu veut jouer?",
                components: [
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('play_yes')
                                .setLabel('Oui')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId('play_no')
                                .setLabel('Non')
                                .setStyle(ButtonStyle.Danger)
                        )
                ],
                ephemeral: true
            } as const;

            const message = await (interaction.deferred ? interaction.editReply(response) : interaction.reply({ withResponse: true, ...response })) as Message<boolean>;

            const filter = (i: any) => i.user.id === opponent.id;
            const collector = message.createMessageComponentCollector({ filter, time: 30 * 1000 });

            const timeoutResponse = setTimeout(async () => {
                await interaction.followUp({
                    content: 'D\'accord, peut-être une autre fois !',
                    components: []
                });
                collector.stop();
            }, 30 * 1000);

            collector.on('collect', async i => {
                clearTimeout(timeoutResponse);
                if (i.customId === 'play_yes') {
                    let currentPlayer = interaction.user.id;
                    const board = [
                        ['', '', ''],
                        ['', '', ''],
                        ['', '', '']
                    ];

                    // Delete the original prompt message
                    await message.delete();

                    // Send the game starting message
                    const gameResponse = {
                        content: lang.tictactoe_turn.replace('{user}', `<@${interaction.user.id}>`).replace('{opponent}', `<@${opponent.id}>`).replace('{currentPlayer}', currentPlayer === interaction.user.id ? `<@${interaction.user.id}>` : `<@${opponent.id}>`),
                        components: client.func.tictactoe.createBoard(board),
                        withResponse: true
                    };

                    const gameMessage = await i.reply(gameResponse);

                    const gameCollector = gameMessage.createMessageComponentCollector({
                        componentType: ComponentType.Button,
                        time: 5 * 60 * 1000 // 5 minutes
                    });

                    gameCollector.on('collect', async i => {
                        if (i.user.id !== currentPlayer) {
                            return i.update({
                                content: lang.tictactoe_turn.replace('{user}', `<@${interaction.user.id}>`).replace('{opponent}', `<@${opponent.id}>`).replace('{currentPlayer}', currentPlayer === interaction.user.id ? `<@${interaction.user.id}>` : `<@${opponent.id}>`),
                                components: client.func.tictactoe.createBoard(board)
                            });
                        }

                        const [_, row, col] = i.customId.split('_').map(Number);
                        board[row][col] = currentPlayer === interaction.user.id ? 'X' : 'O';

                        const winner = client.func.tictactoe.checkWin(board, board[row][col]);
                        const draw = client.func.tictactoe.isBoardFull(board);

                        if (winner || draw) {
                            await i.update({
                                content: winner ? lang.tictactoe_game_over_win.replace('{user}', `<@${i.user.id}>`) : lang.tictactoe_game_over_draw,
                                components: client.func.tictactoe.createBoard(board)
                            });
                            gameCollector.stop();
                            return;
                        }

                        currentPlayer = currentPlayer === interaction.user.id ? opponent.id : interaction.user.id;
                        await i.update({
                            content: lang.tictactoe_turn.replace('{user}', `<@${interaction.user.id}>`).replace('{opponent}', `<@${opponent.id}>`).replace('{currentPlayer}', `<@${currentPlayer}>`),
                            components: client.func.tictactoe.createBoard(board)
                        });
                    });

                    gameCollector.on('end', (collected, reason) => {
                        if (reason === 'time') {
                            interaction.editReply({
                                content: lang.tictactoe_game_over_inactivity,
                                components: []
                            });
                        }
                    });
                } else if (i.customId === 'play_no') {
                    await i.update({
                        content: 'D\'accord, peut-être une autre fois !',
                        components: []
                    });

                    await message.delete(); // Delete the original prompt message
                }
            });
        }
    }
}