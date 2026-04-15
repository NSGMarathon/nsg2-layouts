import { BaseController } from './BaseController';
import type NodeCG from '@nodecg/types';
import type { Configschema } from 'types/schemas';
import { FeudService } from '../services/FeudService';

export class FeudController extends BaseController {
    constructor(nodecg: NodeCG.ServerAPI<Configschema>, feudService: FeudService) {
        super(nodecg);

        this.listen('feud:resetScores', () => feudService.resetScores());
        this.listen('feud:chooseQuestion', (data) => feudService.chooseQuestion(data.questionIndex, data.boardSize));
        this.listen('feud:setBuzzerWinner', (data) => feudService.setBuzzerWinner(data.team));
        this.listen('feud:undoBuzzer', () => feudService.undoBuzzer());
        this.listen('feud:completePlayOrPass', (data) => feudService.completePlayOrPass(data.teamToPlay));
        this.listen('feud:markAnswerGuessed', (data) => feudService.markAnswerGuessed(data.answerIndex));
        this.listen('feud:markNoAnswerGuessed', () => feudService.markNoAnswerGuessed());
        this.listen('feud:revealLowestAnswerNotGuessed', () => feudService.revealLowestAnswerNotGuessed());
        this.listen('feud:startNewRound', () => feudService.startNewRound());
    }
}
