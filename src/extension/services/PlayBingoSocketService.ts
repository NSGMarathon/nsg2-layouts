import { BingoState } from 'types/schemas/bingoState';
import { HasNodecgLogger } from '../helpers/HasNodecgLogger';
import axios, { AxiosInstance } from 'axios';
import type NodeCG from '@nodecg/types';
import type { Configschema } from 'types/schemas';
import { generateUserAgent } from '../helpers/GenerateUserAgent';
import { BingoConfig } from 'types/schemas/bingoConfig';
import WebSocket from 'ws';
import { isBlank } from 'shared/StringHelper';

interface PlayBingoPlayer {
    id: string
    nickname: string
    color: string
    goalCount: number
    raceStatus: PlayBingoRaceStatusDisconnected | PlayBingoRaceStatusConnected
    spectator: boolean
    monitor: boolean
    showInRoom: boolean
}
interface PlayBingoRaceStatusDisconnected {
    connected: false
}
interface PlayBingoRaceStatusConnected {
    connected: true
    /**
     * Username connected to this player for the race, if it is separate from PlayBingo
     */
    username: string
    ready?: boolean
    /**
     * Race finish time (ISO 8601 duration)
     */
    finishTime?: string
}

interface PlayBingoRoomData {
    name: string
    game: string
    slug: string
    gameSlug: string
    newGenerator: boolean
    /**
     * The auto-authentication token generated for the logged in user.
     */
    token?: string
}

type PlayBingoBoard = PlayBingoRevealedBoard | PlayBingoHiddenBoard;
interface PlayBingoRevealedBoard {
    board: PlayBingoCell[][]
    hidden?: false
}
interface PlayBingoHiddenBoard {
    hidden: true
}


interface PlayBingoGoal {
    id: string
    goal: string
    description: string | null
    difficulty?: number | null
    categories?: string[]
}

interface PlayBingoCell {
    goal: PlayBingoGoal
    completedPlayers: string[]
}

type PlayBingoChatMessage = (string | { contents: string; color: string })[];

type PlayBingoServerMessage = (
    {
        action: "chat";
        message: PlayBingoChatMessage;
    }
    | {
        action: 'cellUpdate'
        row: number
        col: number
        cell: PlayBingoCell
    }
    | {
        action: 'syncBoard'
        board: PlayBingoBoard
    }
    | {
        action: 'connected'
        board: PlayBingoBoard
        chatHistory: PlayBingoChatMessage[]
        roomData?: PlayBingoRoomData
    }
    | {
        action: 'unauthorized'
    }
    | {
        action: 'disconnected'
    }
    | {
        action: 'forbidden'
    }
    ) & {
        players?: PlayBingoPlayer[]
        connectedPlayer?: PlayBingoPlayer
    };

interface PlayBingoAuthorizeResponse {
    authToken: string
}

const expectedSocketClosureCode = 4001;

export class PlayBingoSocketService extends HasNodecgLogger {
    private readonly nodecg: NodeCG.ServerAPI<Configschema>;
    private readonly bingoState: NodeCG.ServerReplicantWithSchemaDefault<BingoState>;
    private readonly bingoConfig: NodeCG.ServerReplicantWithSchemaDefault<BingoConfig>;
    private readonly axios: AxiosInstance;
    private socket?: WebSocket;
    private socketReconnectionTimeout?: NodeJS.Timeout;
    private socketPingInterval?: NodeJS.Timeout;
    private isFirstReconnection = true;
    private authToken?: string;
    private cardRevealRequested: boolean = false;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        super(nodecg);

        this.nodecg = nodecg;
        this.axios = axios.create({
            baseURL: 'https://playbingo.gg/api',
            headers: {
                'User-Agent': generateUserAgent(nodecg),
                Accept: 'application/json'
            }
        });
        this.bingoState = nodecg.Replicant('bingoState') as unknown as NodeCG.ServerReplicantWithSchemaDefault<BingoState>;
        this.bingoConfig = nodecg.Replicant('bingoConfig') as unknown as NodeCG.ServerReplicantWithSchemaDefault<BingoConfig>;

        this.bingoConfig.on('change', newValue => {
            if (newValue.enabled && !isBlank(newValue.roomSlug)) {
                this.start().catch(e => {
                    this.logError('Error connecting to Bingo socket', e);
                });
            } else {
                this.socket?.close(expectedSocketClosureCode);
                this.bingoState.value = {
                    connectionState: 'NOT_CONNECTED',
                    players: [],
                    board: []
                };
            }
        });
    }

    private async start() {
        const authorizeResponse = await this.axios.post<PlayBingoAuthorizeResponse>(`/rooms/${this.bingoConfig.value.roomSlug}/authorize`, {
            password: isBlank(this.bingoConfig.value.roomPassword) ? null : this.bingoConfig.value.roomPassword,
            spectator: true
        });
        this.authToken = authorizeResponse.data.authToken;

        this.isFirstReconnection = false;
        this.connect();
    }

    private connect() {
        this.bingoState.value.connectionState = 'CONNECTING';
        if (this.socketReconnectionTimeout) {
            clearTimeout(this.socketReconnectionTimeout);
        }

        if (this.socket) {
            this.socket.close(expectedSocketClosureCode);
        }

        this.cardRevealRequested = false;
        this.socket = new WebSocket(`wss://playbingo.gg/socket/${this.bingoConfig.value.roomSlug}`);

        this.socket.on('open', () => {
            this.logger.info('Bingo socket is open. Joining room...');
            if (this.socketReconnectionTimeout) {
                clearTimeout(this.socketReconnectionTimeout);
            }
            this.isFirstReconnection = true;
            this.heartbeat();

            this.socket?.send(JSON.stringify({
                action: 'join',
                payload: { nickname: this.nodecg.bundleName },
                authToken: this.authToken
            }));
        });

        this.socket.on('ping', () => {
            this.heartbeat();
        });

        this.socket.on('error', err => {
            if (this.usingDebugLogging) {
                this.logger.debug('Received error from Bingo socket:', err);
            } else {
                this.logger.error(`Received error from Bingo socket. Code: ${'code' in err ? err.code : '???'}; Message: ${err.message}`);
            }
        });

        this.socket.on('close', code => {
            if (this.socketPingInterval) {
                clearTimeout(this.socketPingInterval);
            }
            this.bingoState.value.connectionState = 'NOT_CONNECTED';
            if (code !== expectedSocketClosureCode) {
                this.attemptReconnection();
            }
        });

        this.socket.on('message', msg => {
            try {
                const parsedMessage = JSON.parse(msg.toString()) as PlayBingoServerMessage;

                switch (parsedMessage.action) {
                    case 'forbidden':
                    case 'unauthorized':
                        this.logger.warn(`Received "${parsedMessage.action}" message from Bingo socket`);
                        this.bingoState.value.connectionState = 'ERROR';
                        break;
                    case 'connected':
                        this.logger.info('Bingo socket is ready!');
                        this.bingoState.value.connectionState = 'CONNECTED';
                        this.updateBoard(parsedMessage.board);
                        if (parsedMessage.board.hidden && parsedMessage.chatHistory.some(this.isCardReveal)) {
                            this.requestCardReveal();
                        }
                        break;
                    case 'syncBoard':
                        this.updateBoard(parsedMessage.board);
                        break;
                    case 'disconnected':
                        this.socket?.close(4000);
                        break;
                    case 'cellUpdate': {
                        if (
                            this.bingoState.value.board.length <= parsedMessage.row
                            || this.bingoState.value.board[parsedMessage.row].length <= parsedMessage.col
                        ) {
                            break;
                        }

                        this.bingoState.value.board[parsedMessage.row][parsedMessage.col] = this.mapCell(parsedMessage.cell);
                        break;
                    }
                    case 'chat':
                        if (!this.cardRevealRequested && this.bingoState.value.board.length === 0 && this.isCardReveal(parsedMessage.message)) {
                            this.requestCardReveal();
                        }
                }

                if (parsedMessage.players != null) {
                    this.bingoState.value.players = parsedMessage.players.map(p => ({
                        id: p.id,
                        name: p.nickname,
                        color: this.colorToHex(p.color),
                        goalCount: p.goalCount
                    }))
                }
            } catch (e) {
                this.logError('Error handling Bingo socket message', e);
            }
        });
    }

    private colorToHex(color: string): string {
        switch (color) {
            case 'blue':
                return '#2440FB';
            case 'red':
                return '#EF3532';
            case 'orange':
                return '#EF7232';
            case 'green':
                return '#46EF32';
            case 'purple':
                return '#A233F4';
            default:
                return color;
        }
    }

    private requestCardReveal() {
        this.cardRevealRequested = true;
        this.socket?.send(JSON.stringify({
            action: 'revealCard',
            authToken: this.authToken
        }));
    }

    // When we reveal the board to ourselves is entirely up to us.
    // This is a little bit silly and a little more fragile than that,
    // but we choose to do so when any other player has revealed the board.
    private isCardReveal(message: PlayBingoChatMessage): boolean {
        return message.some(part => {
            const contents = typeof part === 'string' ? part : part.contents;
            return !contents.includes(':') && contents.toLowerCase().includes('revealed');
        });
    }

    private updateBoard(board: PlayBingoBoard) {
        if (board.hidden) {
            this.bingoState.value.board = [];
        } else {
            this.bingoState.value.board = board.board.map(row => row.map(this.mapCell));
        }
    }

    private mapCell(cell: PlayBingoCell): BingoState['board'][number][number] {
        return {
            id: cell.goal.id,
            goal: cell.goal.goal,
            description: cell.goal.description,
            completedByPlayers: cell.completedPlayers
        };
    }

    private attemptReconnection() {
        if (this.isFirstReconnection) {
            this.logger.warn('Bingo socket is closed');
        }
        this.socketReconnectionTimeout = setTimeout(() => {
            if (this.isFirstReconnection) {
                this.logger.info('Attempting to reconnect to Bingo socket...');
            }
            this.isFirstReconnection = false;
            this.connect();
        }, 5000);
    }

    private heartbeat() {
        if (this.socketPingInterval) {
            clearTimeout(this.socketPingInterval);
        }

        this.socketPingInterval = setTimeout(() => {
            this.socket?.ping('ping');
        }, 10000);
    }
}
