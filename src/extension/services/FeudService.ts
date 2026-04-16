import { HasNodecgLogger } from '../helpers/HasNodecgLogger';
import type NodeCG from '@nodecg/types';
import type { Configschema } from 'types/schemas';
import { DeepReadonly } from 'ts-essentials';
import { FeudState } from 'types/schemas/feudState';
import { FeudTeamInfo } from 'types/schemas/feudTeamInfo';
import { FeudTeam } from 'types/feud';
import { FeudBoard } from 'types/schemas/feudBoard';

// Welcome to the Family Feud State Machine
export class FeudService extends HasNodecgLogger {
    private readonly feudQuestions: DeepReadonly<NonNullable<Configschema['feudQuestions']>>;
    private readonly feudState: NodeCG.ServerReplicantWithSchemaDefault<FeudState>;
    private readonly feudTeamInfo: NodeCG.ServerReplicantWithSchemaDefault<FeudTeamInfo>;
    private readonly feudBoard: NodeCG.ServerReplicantWithSchemaDefault<FeudBoard>;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        super(nodecg);

        if (!FeudService.hasRequiredConfig(nodecg)) {
            throw new Error('FeudService was loaded without required config! This should never happen.');
        }

        this.feudQuestions = nodecg.bundleConfig.feudQuestions!.map((question) => ({
            ...question,
            board: question.board.toSorted((a, b) => b.value - a.value),
        }));
        this.feudState = nodecg.Replicant('feudState') as unknown as NodeCG.ServerReplicantWithSchemaDefault<FeudState>;
        this.feudTeamInfo = nodecg.Replicant('feudTeamInfo') as unknown as NodeCG.ServerReplicantWithSchemaDefault<FeudTeamInfo>;
        this.feudBoard = nodecg.Replicant('feudBoard') as unknown as NodeCG.ServerReplicantWithSchemaDefault<FeudBoard>;
    }

    markAnswerGuessed(answerIndex: number) {
        switch (this.feudState.value.state) {
            case 'WAITING_FOR_FACEOFF_ANSWER':
                return this.markAnswerGuessedFaceoff(answerIndex);
            case 'WAITING_FOR_ANSWER':
                return this.markAnswerGuessedNormal(answerIndex);
            case 'WAITING_FOR_STEAL':
                return this.markAnswerGuessedSteal(answerIndex);
            default:
                throw new Error('Cannot mark an answer as guessed at this time');
        }
    }

    markNoAnswerGuessed() {
        switch (this.feudState.value.state) {
            case 'WAITING_FOR_FACEOFF_ANSWER':
                return this.markNoAnswerGuessedFaceoff();
            case 'WAITING_FOR_ANSWER':
                return this.markNoAnswerGuessedNormal();
            case 'WAITING_FOR_STEAL':
                return this.markNoAnswerGuessedSteal();
            default:
                throw new Error('No guesses can be made at this time');
        }
    }

    resetScores() {
        this.feudTeamInfo.value.teamA.score = 0;
        this.feudTeamInfo.value.teamB.score = 0;
        this.feudBoard.value.roundNumber = 1;
    }

    chooseQuestion(index: number, boardSize: number) {
        if (this.feudState.value.state !== 'WAITING_FOR_QUESTION') {
            throw new Error('Cannot change the question at this time');
        }

        const question = this.feudQuestions[index];
        if (question == null) {
            throw new Error(`Could not find question at index ${index}`);
        }
        if (boardSize <= 0 || boardSize > 8) {
            throw new Error('Desired board size was too small or large');
        }

        this.feudBoard.value = {
            roundNumber: this.feudBoard.value.roundNumber,
            question: question.question,
            answers: question.board.slice(0, boardSize).map((boardItem) => ({
                answer: boardItem.answer,
                value: boardItem.value,
                guessed: false,
            })),
        };
        this.feudState.value = {
            state: 'WAITING_FOR_BUZZER'
        };
    }

    setBuzzerWinner(team: FeudTeam) {
        if (this.feudState.value.state !== 'WAITING_FOR_BUZZER') {
            throw new Error('Cannot buzz in at this time');
        }

        this.feudState.value = {
            state: 'WAITING_FOR_FACEOFF_ANSWER',
            firstToBuzz: team,
            teamInPlay: team,
            anyGuessMadeBy: {
                teamA: false,
                teamB: false,
            },
        };
    }

    undoBuzzer() {
        if (this.feudState.value.state !== 'WAITING_FOR_FACEOFF_ANSWER') {
            throw new Error('Cannot undo buzzer at this time');
        }

        if (this.feudState.value.anyGuessMadeBy.teamA || this.feudState.value.anyGuessMadeBy.teamB) {
            throw new Error('Cannot undo buzzer after guesses have been made');
        }

        this.feudState.value = {
            state: 'WAITING_FOR_BUZZER',
        };
    }

    private markAnswerGuessedFaceoff(answerIndex: number) {
        if (this.feudState.value.state !== 'WAITING_FOR_FACEOFF_ANSWER') {
            throw new Error('Cannot mark an answer as guessed at this time');
        }

        if (answerIndex < 0 || answerIndex >= (this.feudBoard.value.answers?.length ?? 0)) {
            throw new Error(`Answer at index ${answerIndex} does not exist`);
        }

        const newlyRevealedAnswer = this.feudBoard.value.answers[answerIndex];
        if (newlyRevealedAnswer.guessed) {
            throw new Error(`Answer at index ${answerIndex} has already been guessed`);
        }

        this.feudBoard.value.answers[answerIndex].guessed = true;
        this.feudState.value.anyGuessMadeBy[this.feudState.value.teamInPlay] = true;

        if (answerIndex === 0) {
            // The highest-value answer was revealed

            this.setFaceoffWinner(this.feudState.value.teamInPlay);
        } else {
            const alreadyRevealedAnswer = this.feudBoard.value.answers.find((answer) => answer.guessed);

            if (this.feudState.value.anyGuessMadeBy.teamA && this.feudState.value.anyGuessMadeBy.teamB) {
                // Both teams have made any guess

                let winningTeam: FeudTeam;
                if (alreadyRevealedAnswer != null) {
                    if (alreadyRevealedAnswer.value === newlyRevealedAnswer.value) {
                        winningTeam = this.feudState.value.firstToBuzz;
                    } else if (newlyRevealedAnswer.value > alreadyRevealedAnswer.value) {
                        winningTeam = this.feudState.value.teamInPlay;
                    } else {
                        winningTeam = this.getOpposingTeam(this.feudState.value.teamInPlay);
                    }
                } else {
                    winningTeam = this.feudState.value.teamInPlay;
                }

                this.setFaceoffWinner(winningTeam);
            } else {
                // One team hasn't guessed yet. Let them guess
                this.feudState.value.teamInPlay = this.getOpposingTeam(this.feudState.value.teamInPlay);
            }
        }
    }

    private markNoAnswerGuessedFaceoff() {
        if (this.feudState.value.state !== 'WAITING_FOR_FACEOFF_ANSWER') {
            throw new Error('Cannot play the face-off at this time');
        }

        this.feudState.value.anyGuessMadeBy[this.feudState.value.teamInPlay] = true;

        const alreadyRevealedAnswer = this.feudBoard.value.answers.find((answer) => answer.guessed);
        if (alreadyRevealedAnswer != null) {
            // The team in play didn't reveal an answer, but the previous team did. We have a winner!
            this.setFaceoffWinner(this.getOpposingTeam(this.feudState.value.teamInPlay));
        } else {
            this.feudState.value.teamInPlay = this.getOpposingTeam(this.feudState.value.teamInPlay);
        }
    }

    completePlayOrPass(teamToPlay: FeudTeam) {
        if (this.feudState.value.state !== 'WAITING_FOR_PLAY_OR_PASS') {
            throw new Error('Cannot play-or-pass at this time');
        }

        this.feudState.value = {
            state: 'WAITING_FOR_ANSWER',
            teamInPlay: teamToPlay,
            strikes: 0,
        };
    }

    private markAnswerGuessedNormal(answerIndex: number) {
        if (this.feudState.value.state !== 'WAITING_FOR_ANSWER') {
            throw new Error('Cannot mark an answer as guessed at this time');
        }

        if (answerIndex < 0 || answerIndex >= (this.feudBoard.value.answers?.length ?? 0)) {
            throw new Error(`Answer at index ${answerIndex} does not exist`);
        }

        const newlyRevealedAnswer = this.feudBoard.value.answers[answerIndex];
        if (newlyRevealedAnswer.guessed) {
            throw new Error(`Answer at index ${answerIndex} has already been guessed`);
        }

        this.feudBoard.value.answers[answerIndex].guessed = true;

        if (this.feudBoard.value.answers.every((answer) => answer.guessed)) {
            this.endRound(this.feudState.value.teamInPlay);
        }
    }

    private markNoAnswerGuessedNormal() {
        if (this.feudState.value.state !== 'WAITING_FOR_ANSWER') {
            throw new Error('Cannot mark an answer as guessed at this time');
        }

        const newStrikeCount = this.feudState.value.strikes + 1;

        if (newStrikeCount >= 3) {
            this.feudState.value = {
                state: 'WAITING_FOR_STEAL',
                teamInPlay: this.getOpposingTeam(this.feudState.value.teamInPlay),
            };
        } else {
            this.feudState.value.strikes = newStrikeCount;
        }
    }

    private markAnswerGuessedSteal(answerIndex: number) {
        if (this.feudState.value.state !== 'WAITING_FOR_STEAL') {
            throw new Error('Cannot try to steal at this time');
        }

        if (answerIndex < 0 || answerIndex >= (this.feudBoard.value.answers?.length ?? 0)) {
            throw new Error(`Answer at index ${answerIndex} does not exist`);
        }

        const newlyRevealedAnswer = this.feudBoard.value.answers[answerIndex];
        if (newlyRevealedAnswer.guessed) {
            throw new Error(`Answer at index ${answerIndex} has already been guessed`);
        }

        this.feudBoard.value.answers[answerIndex].guessed = true;
        this.endRound(this.feudState.value.teamInPlay, answerIndex);
    }

    private markNoAnswerGuessedSteal() {
        if (this.feudState.value.state !== 'WAITING_FOR_STEAL') {
            throw new Error('Cannot try to steal at this time');
        }

        this.endRound(this.getOpposingTeam(this.feudState.value.teamInPlay));
    }

    revealLowestAnswerNotGuessed() {
        if (this.feudState.value.state !== 'END_OF_ROUND') {
            throw new Error('Revealing answers not guessed may only be done at the end of a round');
        }

        const answerToRevealIndex = this.feudBoard.value.answers.findLastIndex((answer) => !answer.guessed);

        if (answerToRevealIndex === -1) {
            throw new Error('No answers left to reveal');
        }

        this.feudBoard.value.answers[answerToRevealIndex].guessed = true;
    }

    startNewRound() {
        const incrementRoundNumber = this.feudState.value.state !== 'WAITING_FOR_BUZZER' && this.feudState.value.state !== 'WAITING_FOR_FACEOFF_ANSWER';

        this.feudState.value = {
            state: 'WAITING_FOR_QUESTION',
        };
        this.feudBoard.value = {
            roundNumber: incrementRoundNumber ? this.feudBoard.value.roundNumber + 1 : this.feudBoard.value.roundNumber,
            question: null,
            answers: [],
        };
    }

    private endRound(winner: FeudTeam, excludeIndexFromSum?: number) {
        const summedAnswerValue = this.feudBoard.value.answers
            .filter((answer, i) => answer.guessed && (excludeIndexFromSum == null || excludeIndexFromSum !== i))
            .reduce((result, answer) => result + answer.value, 0);

        if (this.feudBoard.value.roundNumber === 3) {
            this.feudTeamInfo.value[winner].score += summedAnswerValue * 2;
        } else if (this.feudBoard.value.roundNumber === 4) {
            this.feudTeamInfo.value[winner].score += summedAnswerValue * 3;
        } else {
            this.feudTeamInfo.value[winner].score += summedAnswerValue;
        }
        this.feudState.value = {
            state: 'END_OF_ROUND',
            winner: winner,
        };
    }

    private setFaceoffWinner(winner: FeudTeam) {
        if (this.feudState.value.state !== 'WAITING_FOR_FACEOFF_ANSWER') return;

        this.feudState.value = {
            state: 'WAITING_FOR_PLAY_OR_PASS',
            faceoffWinner: winner,
        };
    }

    private getOpposingTeam(team: FeudTeam): FeudTeam {
        return team === 'teamA' ? 'teamB' : 'teamA';
    }

    static hasRequiredConfig(nodecg: NodeCG.ServerAPI<Configschema>) {
        return nodecg.bundleConfig.feudQuestions != null && nodecg.bundleConfig.feudQuestions.length > 0;
    }
}
