import { BaseController } from './BaseController';
import type NodeCG from '@nodecg/types';
import type { Configschema } from 'types/schemas';
import { JepService } from '../services/JepService';

export class JepController extends BaseController {
    constructor(nodecg: NodeCG.ServerAPI<Configschema>, jepService: JepService) {
        super(nodecg);

        this.listen('jep:reset', (args) => jepService.reset(args.useTestBoard));
        this.listen('jep:setPlayerInfo', (args) => jepService.setPlayerInfo(args));
        this.listen('jep:revealCategory', () => jepService.revealCategory());
        this.listen('jep:pickClue', (position) => jepService.pickClue(position));
        this.listen('jep:makeDailyDoubleWager', (args) => jepService.makeDailyDoubleWager(args.amount));
        this.listen('jep:finishReadingClue', () => jepService.finishReadingClue());
        this.listen('jep:answerClue', (args) => jepService.answerClue(args.isCorrect));
        this.listen('jep:finishReadingAnswer', () => jepService.finishReadingAnswer());
        this.listen('finalJep:finishWagering', () => jepService.finalJepFinishWagering());
        this.listen('finalJep:finishReadingClue', () => jepService.finalJepFinishReadingClue());
        this.listen('finalJep:revealAnswer', (args) => jepService.finalJepRevealAnswer(args.playerIndex, args.amountWagered, args.isCorrect));
    }
}
