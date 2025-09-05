import { BaseController } from './BaseController';
import type NodeCG from '@nodecg/types';
import type { Configschema } from 'types/schemas';
import { TodoListService } from '../services/TodoListService';

export class TodoListController extends BaseController {
    constructor(nodecg: NodeCG.ServerAPI<Configschema>, todoListService: TodoListService) {
        super(nodecg);

        this.listen('todo:setCompleted', data => {
            todoListService.setCompleted(data.categoryName, data.listItemName, data.completed);
        });
    }
}
