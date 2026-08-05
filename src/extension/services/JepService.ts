import type NodeCG from '@nodecg/types';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';
import { ConfigJepBoard, Configschema } from 'types/schemas';
import { JepPlayers } from 'types/schemas/jepPlayers';
import { CluePosition, JepState } from 'types/schemas/jepState';
import { JepBoard } from 'types/schemas/jepBoard';
import {
    JEP_CATEGORY_COUNT,
    JEP_CLUE_VALUE_MULTIPLIER,
    JEP_CLUES_PER_CATEGORY,
    JEP_DAILY_DOUBLE_MIN_WAGER,
    JEP_FINAL_JEOPARDY_CATEGORY_COUNT,
    JEP_FINAL_JEOPARDY_CLUES_PER_CATEGORY,
    JEP_FINAL_JEOPARDY_MIN_MAX_WAGER_SIZE,
    JEP_PLAYER_COUNT,
    JepPlayerUpdate
} from 'shared/JepConstants';
import { DeepReadonly } from 'ts-essentials';
import { DateTime } from 'luxon';
import cloneDeep from 'lodash/cloneDeep';

type MapToOmitEntryTime<T> = T extends any ? Omit<T, 'enteredAt'> : never;
type JepStateWithoutEntryTime = MapToOmitEntryTime<JepState>;

// Jep means Jeopardy. welcome to the state machine
export class JepService extends HasNodecgLogger {
    private readonly nodecg: NodeCG.ServerAPI<Configschema>;
    private readonly jepBoard: NodeCG.ServerReplicantWithSchemaDefault<JepBoard>;
    private readonly jepPlayers: NodeCG.ServerReplicantWithSchemaDefault<JepPlayers>;
    private readonly jepState: NodeCG.ServerReplicantWithSchemaDefault<JepState>;
    private readonly configIsValid: boolean;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        super(nodecg);

        this.nodecg = nodecg;
        this.jepBoard = nodecg.Replicant('jepBoard') as unknown as NodeCG.ServerReplicantWithSchemaDefault<JepBoard>;
        this.jepPlayers = nodecg.Replicant('jepPlayers') as unknown as NodeCG.ServerReplicantWithSchemaDefault<JepPlayers>;
        this.jepState = nodecg.Replicant('jepState') as unknown as NodeCG.ServerReplicantWithSchemaDefault<JepState>;
        this.configIsValid = JepService.isConfigValid(nodecg.bundleConfig);

        if (!this.configIsValid) {
            this.logger.info('Jeopardy config is missing or incomplete; only the testing board will be available.');
            this.jepBoard.value.usingTestBoard = true;
        }
    }

    reset(useTestBoard: boolean) {
        this.jepState.value = {
            state: 'WAITING_FOR_PLAYER_INFO',
            enteredAt: '1970-01-01T00:00:00Z'
        };
        this.jepPlayers.value = [];
        this.jepBoard.value = {
            round: 'NONE',
            usingTestBoard: !this.configIsValid || useTestBoard,
            categories: []
        };
    }

    setPlayerInfo(players: JepPlayerUpdate) {
        this.logger.debug('Updating contestant data');
        if (players.length !== JEP_PLAYER_COUNT) {
            throw new Error(`The game must have ${JEP_PLAYER_COUNT} contestants`);
        }

        const initializing = this.jepState.value.state === 'WAITING_FOR_PLAYER_INFO';

        this.jepPlayers.value = players.map((p, i) => {
            let score;
            if (initializing) {
                score = 0;
            } else if (p.score == null) {
                score = this.jepPlayers.value[i]?.score ?? 0;
            } else {
                score = p.score;
            }

            return ({
                name: p.name,
                signatureUrl: p.signatureUrl,
                symbolUrl: p.symbolUrl,
                score
            });
        });
        if (initializing) {
            this.setState({ state: 'STARTING_NEXT_ROUND' });
        }
    }

    revealCategory() {
        if (this.jepState.value.state === 'STARTING_NEXT_ROUND') {
            switch (this.jepBoard.value.round) {
                case 'NONE':
                    this.setBoard('JEOPARDY');
                    break;
                case 'JEOPARDY':
                    this.setBoard('DOUBLE_JEOPARDY');
                    break;
                case 'DOUBLE_JEOPARDY':
                    this.setBoard('FINAL_JEOPARDY');
                    break;
            }

            this.setState({
                state: 'REVEALING_CATEGORIES',
                lastRevealedCategoryIndex: -1
            });
        } else if (this.jepState.value.state === 'REVEALING_CATEGORIES') {
            if (this.jepBoard.value.round === 'FINAL_JEOPARDY') {
                this.setState({ state: 'FINAL_JEP_AWAITING_WAGERS' });
                this.logger.debug('Now awaiting Final Jeopardy wagers');
            } else if (this.jepState.value.lastRevealedCategoryIndex >= JEP_CATEGORY_COUNT - 1) {
                if (this.jepBoard.value.round === 'JEOPARDY') {
                    this.setState({ state: 'PICKING_CLUE', pickingPlayerIndex: 0 })
                } else {
                    const lowestScore = Math.min(...this.jepPlayers.value.map((p) => p.score));
                    const playersWithLowestScore = this.jepPlayers.value
                        .map((p, i) => ({ ...p, index: i }))
                        .filter((p) => p.score === lowestScore);

                    // todo: need to actually resolve ties
                    const selectedIndex = Math.floor(Math.random() * playersWithLowestScore.length);
                    this.setState({
                        state: 'PICKING_CLUE',
                        pickingPlayerIndex: playersWithLowestScore[selectedIndex].index
                    });
                }
            } else {
                this.jepState.value.lastRevealedCategoryIndex++;
            }
        } else {
            throw new Error('Cannot reveal clue categories at this time');
        }
    }

    pickClue(position: CluePosition) {
        if (this.jepState.value.state !== 'PICKING_CLUE') {
            throw new Error('Cannot pick a clue at this time');
        }
        if (position[0] < 0 || position[0] >= JEP_CATEGORY_COUNT || position[1] < 0 || position[1] >= JEP_CLUES_PER_CATEGORY) {
            throw new Error('Selected clue does not exist');
        }

        const clue = this.jepBoard.value.categories[position[0]].clues[position[1]];
        if (clue.answered) {
            throw new Error('Selected clue has already been answered');
        }

        this.setState({
            state: clue.isDailyDouble ? 'DAILY_DOUBLE_AWAITING_WAGER' : 'READING_CLUE',
            lastCluePickedByIndex: this.jepState.value.pickingPlayerIndex,
            cluePosition: position
        });
    }

    makeDailyDoubleWager(amount: number) {
        if (this.jepState.value.state !== 'DAILY_DOUBLE_AWAITING_WAGER') {
            throw new Error('Cannot wager for the Daily Double at this time');
        }

        const maxWagerAmount = Math.max(
            (JEP_CLUE_VALUE_MULTIPLIER * (this.jepBoard.value.round === 'DOUBLE_JEOPARDY' ? 2 : 1) * JEP_CLUES_PER_CATEGORY),
            this.jepPlayers.value[this.jepState.value.lastCluePickedByIndex].score);
        if (amount < JEP_DAILY_DOUBLE_MIN_WAGER || amount > maxWagerAmount) {
            throw new Error(`Wager must be between ${JEP_DAILY_DOUBLE_MIN_WAGER} and ${maxWagerAmount} points`);
        }

        this.setState({
            state: 'DAILY_DOUBLE_READING_CLUE',
            lastCluePickedByIndex: this.jepState.value.lastCluePickedByIndex,
            cluePosition: this.jepState.value.cluePosition,
            pointsWaged: amount
        });
    }

    finishReadingClue() {
        if (this.jepState.value.state === 'DAILY_DOUBLE_READING_CLUE') {
            this.setState({
                ...this.jepState.value,
                state: 'DAILY_DOUBLE_AWAITING_ANSWER'
            });
        } else if (this.jepState.value.state === 'READING_CLUE') {
            this.setState({
                ...this.jepState.value,
                state: 'AWAITING_BUZZER',
                guessesMadeByIndices: []
            });
        } else {
            throw new Error('Cannot finish reading a clue at this time');
        }
    }

    buzzerEvent(buzzedByIndex: number | null) {
        if (this.jepState.value.state !== 'AWAITING_BUZZER') {
            throw new Error('Cannot answer buzzer events at this time');
        }

        if (buzzedByIndex == null) {
            this.setState({
                state: 'READING_CORRECT_ANSWER',
                lastCluePickedByIndex: this.jepState.value.lastCluePickedByIndex,
                cluePosition: this.jepState.value.cluePosition,
                guessesMadeByIndices: this.jepState.value.guessesMadeByIndices
            });
        } else {
            if (buzzedByIndex < 0 || buzzedByIndex >= JEP_PLAYER_COUNT) {
                throw new Error(`Contestant ${buzzedByIndex + 1} does not exist`);
            }

            this.setState({
                state: 'AWAITING_ANSWER',
                buzzedByIndex,
                lastCluePickedByIndex: this.jepState.value.lastCluePickedByIndex,
                cluePosition: this.jepState.value.cluePosition,
                guessesMadeByIndices: this.jepState.value.guessesMadeByIndices
            });
        }
    }

    answerClue(isCorrect: boolean) {
        if (this.jepState.value.state !== 'DAILY_DOUBLE_AWAITING_ANSWER' && this.jepState.value.state !== 'AWAITING_ANSWER') {
            throw new Error('Cannot answer a clue at this time');
        }

        const isDailyDouble = this.jepState.value.state === 'DAILY_DOUBLE_AWAITING_ANSWER';

        const cluePos = this.jepState.value.cluePosition;
        this.jepBoard.value.categories[cluePos[0]].clues[cluePos[1]].answered = true;

        let answeringContestantIndex: number;
        let value: number;
        if (isDailyDouble) {
            answeringContestantIndex = this.jepState.value.lastCluePickedByIndex;
            // @ts-ignore: TS isn't smart enough to narrow down the type of jepState here
            value = this.jepState.value.pointsWaged;
        } else {
            // @ts-ignore: see above
            answeringContestantIndex = this.jepState.value.buzzedByIndex;
            value = this.getClueValue(cluePos);
        }

        if (isCorrect) {
            this.jepPlayers.value[answeringContestantIndex].score += value;
            if (this.anyCluesRemaining()) {
                this.setState({
                    state: 'PICKING_CLUE',
                    pickingPlayerIndex: answeringContestantIndex
                });
            } else {
                this.setState({
                    state: 'STARTING_NEXT_ROUND'
                });
            }
        } else {
            this.jepPlayers.value[answeringContestantIndex].score -= value;

            if (isDailyDouble) {
                this.setState({
                    state: 'READING_CORRECT_ANSWER',
                    lastCluePickedByIndex: this.jepState.value.lastCluePickedByIndex,
                    cluePosition: cluePos,
                    guessesMadeByIndices: [answeringContestantIndex]
                });
            } else {
                // @ts-ignore: see above
                let guessesMadeByIndices = this.jepState.value.guessesMadeByIndices;
                if (!guessesMadeByIndices.includes(answeringContestantIndex)) {
                    guessesMadeByIndices = guessesMadeByIndices.concat(answeringContestantIndex);
                }

                if (guessesMadeByIndices.length === this.jepPlayers.value.length) {
                    this.setState({
                        state: 'READING_CORRECT_ANSWER',
                        lastCluePickedByIndex: this.jepState.value.lastCluePickedByIndex,
                        cluePosition: cluePos,
                        guessesMadeByIndices
                    });
                } else {
                    this.setState({
                        state: 'AWAITING_BUZZER',
                        lastCluePickedByIndex: this.jepState.value.lastCluePickedByIndex,
                        guessesMadeByIndices,
                        cluePosition: cluePos
                    });
                }
            }
        }
    }

    finishReadingAnswer() {
        if (this.jepState.value.state !== 'READING_CORRECT_ANSWER') {
            throw new Error('Cannot finish reading the clue\'s answer at this time');
        }

        if (this.anyCluesRemaining()) {
            this.setState({
                state: 'PICKING_CLUE',
                // We assume this code is only reached if the last answer given was incorrect, or we just played a Daily Double
                pickingPlayerIndex: this.jepState.value.lastCluePickedByIndex
            });
        } else {
            this.setState({
                state: 'STARTING_NEXT_ROUND'
            });
        }
    }

    finalJepFinishWagering() {
        if (this.jepState.value.state !== 'FINAL_JEP_AWAITING_WAGERS') {
            throw new Error('Cannot continue the Final Jeopardy round at this time');
        }

        this.setState({ state: 'FINAL_JEP_READING_CLUE' });
    }

    finalJepFinishReadingClue() {
        if (this.jepState.value.state !== 'FINAL_JEP_READING_CLUE') {
            throw new Error('Cannot finish reading the Final Jeopardy clue at this time');
        }

        this.setState({ state: 'FINAL_JEP_AWAITING_ANSWERS' });
    }

    finalJepRevealAnswer(playerIndex: number, amountWagered: number, isCorrect: boolean) {
        const player = this.jepPlayers.value[playerIndex];
        if (player == null) {
            throw new Error('The selected player does not exist');
        }

        // We deviate from the rules by allowing players with zero or negative score to keep playing.
        // If you finished the round with a score between -5 and 5, your maximum wager is 5 points.
        const maxWager = Math.max(JEP_FINAL_JEOPARDY_MIN_MAX_WAGER_SIZE, Math.abs(player.score));
        if (amountWagered > maxWager) {
            throw new Error(`The largest allowed wager for the given player is ${maxWager} points`);
        }
        if (amountWagered < 0) {
            throw new Error('Final Jeopardy wager must not be negative');
        }

        if (this.jepState.value.state === 'FINAL_JEP_AWAITING_ANSWERS') {
            const contestantOrder = this.jepPlayers.value
                .map((player, i) => [player.score, i])
                .sort((a, b) => a[0] - b[0])
                .map((p) => p[1]);

            this.setState({
                state: 'FINAL_JEP_REVEALING_ANSWERS',
                contestantOrderBeforeRoundStart: contestantOrder,
                answerRevealedForIndices: [playerIndex]
            });
        } else if (this.jepState.value.state === 'FINAL_JEP_REVEALING_ANSWERS') {
            if (this.jepState.value.answerRevealedForIndices.includes(playerIndex)) {
                throw new Error('The answer has already been revealed for the given player');
            }

            if (this.jepState.value.answerRevealedForIndices.length === this.jepPlayers.value.length - 1) {
                this.setState({ state: 'VIEW_FINAL_RESULT' });
            } else {
                this.setState({
                    state: 'FINAL_JEP_REVEALING_ANSWERS',
                    contestantOrderBeforeRoundStart: this.jepState.value.contestantOrderBeforeRoundStart,
                    answerRevealedForIndices: this.jepState.value.answerRevealedForIndices.concat(playerIndex)
                });
            }
        } else {
            throw new Error('Cannot reveal a Final Jeopardy answer at this time');
        }

        if (isCorrect) {
            player.score += amountWagered;
        } else {
            player.score -= amountWagered;
        }
    }

    mostlyCompleteTestBoard() {
        if (!this.jepBoard.value.usingTestBoard) {
            throw new Error('This function is only available during testing');
        }

        const newBoard = cloneDeep(this.jepBoard.value.categories);
        let anyCluesLeftUnanswered = false;

        for (let i = 0; i < newBoard.length; i++) {
            const category = newBoard[i];
            for (let j = 0; j < category.clues.length; j++) {
                const clue = category.clues[j];
                if (!clue.answered) {
                    if (anyCluesLeftUnanswered) {
                        clue.answered = true;
                    } else {
                        anyCluesLeftUnanswered = true;
                    }
                }
            }
        }

        this.jepBoard.value.categories = newBoard;
    }

    private anyCluesRemaining() {
        return this.jepBoard.value.categories.some((cat) =>
            cat.clues.some((clue) => !clue.answered));
    }

    private getClueValue(position: CluePosition) {
        const multiplier = JEP_CLUE_VALUE_MULTIPLIER * (this.jepBoard.value.round === 'DOUBLE_JEOPARDY' ? 2 : 1);
        return (position[1] + 1) * multiplier;
    }

    private setBoard(round: JepBoard['round']) {
        const usingTestBoard = this.jepBoard.value.usingTestBoard;
        let board: DeepReadonly<ConfigJepBoard>;
        if (usingTestBoard) {
            const generateCategory = (categoryIndex: number, categoryName: string, dailyDoubleIndex?: number) => ({
                categoryName,
                clues: Array.from({ length: JEP_CLUES_PER_CATEGORY }, (_, i) =>
                    ({ prompt: `The ${this.prettyPrintOrdinal(i + 1)} clue in the "${categoryName}" category`, answer: `clue used for testing (${categoryIndex}; ${i})`, isDailyDouble: dailyDoubleIndex === i }))
            });

            switch (round) {
                case 'JEOPARDY':
                    board = [
                        generateCategory(0, 'Testing', 2),
                        generateCategory(1, 'Cresting'),
                        generateCategory(2, 'Jesting'),
                        generateCategory(3, 'Resting'),
                        generateCategory(4, 'Nesting'),
                        generateCategory(5, 'Besting')
                    ];
                    break;
                case 'DOUBLE_JEOPARDY':
                    board = [
                        generateCategory(0, 'Gaming'),
                        generateCategory(1, 'Acclaiming', 3),
                        generateCategory(2, 'Blaming'),
                        generateCategory(3, 'Flaming'),
                        generateCategory(4, 'Taming'),
                        generateCategory(5, 'Claiming', 4)
                    ];
                    break;
                case 'FINAL_JEOPARDY':
                    board = [
                        {
                            categoryName: 'Cephalopods',
                            clues: [{
                                prompt: 'The main characters in this shooter franchise are squid-like inklings who shoot multicolored goo at each other',
                                answer: 'Splatoon'
                            }]
                        }
                    ];
                    break;
                default:
                    board = [];
                    break;
            }
        } else {
            switch (round) {
                case 'JEOPARDY':
                    board = this.nodecg.bundleConfig.jeopardy!.firstRound!
                    break;
                case 'DOUBLE_JEOPARDY':
                    board = this.nodecg.bundleConfig.jeopardy!.doubleJeopardy!
                    break;
                case 'FINAL_JEOPARDY':
                    board = this.nodecg.bundleConfig.jeopardy!.finalJeopardy!
                    break;
                default:
                    board = [];
                    break;
            }
        }

        this.jepBoard.value = {
            round,
            usingTestBoard,
            categories: board.map((category) => ({
                name: category.categoryName,
                clues: category.clues.map((clue) => ({
                    prompt: clue.prompt,
                    answer: clue.answer,
                    isDailyDouble: clue.isDailyDouble,
                    answered: false
                }))
            }))
        };
    }

    private prettyPrintOrdinal(number: number): string {
        switch (number) {
            case 1:
                return '1st';
            case 2:
                return '2nd';
            case 3:
                return '3rd';
            default:
                return `${number}th`;
        }
    }

    private setState(state: JepStateWithoutEntryTime) {
        this.jepState.value = {
            ...state,
            enteredAt: DateTime.utc().toISO()
        };
    }

    static isConfigValid(config: DeepReadonly<Configschema>): boolean {
        const isValidBoard = (board: DeepReadonly<ConfigJepBoard> | undefined, categoryCount: number, cluesPerCategory: number) =>
            board != null && board.length === categoryCount && board.every((category) => category.clues.length === cluesPerCategory);

        const jepConfig = config.jeopardy;
        return jepConfig != null
            && isValidBoard(jepConfig.firstRound, JEP_CATEGORY_COUNT, JEP_CLUES_PER_CATEGORY)
            && isValidBoard(jepConfig.doubleJeopardy, JEP_CATEGORY_COUNT, JEP_CLUES_PER_CATEGORY)
            && isValidBoard(jepConfig.finalJeopardy, JEP_FINAL_JEOPARDY_CATEGORY_COUNT, JEP_FINAL_JEOPARDY_CLUES_PER_CATEGORY);
    }
}
