import type NodeCG from '@nodecg/types';
import type {
    ActiveGameLayouts,
    ActiveRelayPlayers,
    ActiveSpeedrun,
    Configschema,
    PlayerNameplateAssignments
} from 'types/schemas';
import { layouts } from 'types/Layouts';
import range from 'lodash/range';
import cloneDeep from 'lodash/cloneDeep';

export class NameplateAssignmentService {
    private readonly nodecg: NodeCG.ServerAPI<Configschema>;
    private readonly activeSpeedrun: NodeCG.ServerReplicantWithSchemaDefault<ActiveSpeedrun>;
    private readonly playerNameplateAssignments: NodeCG.ServerReplicantWithSchemaDefault<PlayerNameplateAssignments>;
    private readonly activeGameLayouts: NodeCG.ServerReplicantWithSchemaDefault<ActiveGameLayouts>;
    private readonly activeRelayPlayers: NodeCG.ServerReplicantWithSchemaDefault<ActiveRelayPlayers>;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        this.nodecg = nodecg;
        this.activeSpeedrun = nodecg.Replicant('activeSpeedrun') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ActiveSpeedrun>;
        this.playerNameplateAssignments = nodecg.Replicant('playerNameplateAssignments') as unknown as NodeCG.ServerReplicantWithSchemaDefault<PlayerNameplateAssignments>;
        this.activeGameLayouts = nodecg.Replicant('activeGameLayouts') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ActiveGameLayouts>;
        this.activeRelayPlayers = nodecg.Replicant('activeRelayPlayers') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ActiveRelayPlayers>;

        this.activeSpeedrun.on('change', newValue => {
            this.recalculateActiveRelayPlayers(newValue);
            this.activeGameLayouts.value.forEach((layout, i) => {
                const nameplateCount = layouts[layout as keyof typeof layouts]?.playerNameplateCount ?? 0;
                this.recalculateNameplateAssignments(i, nameplateCount, newValue);
            });
        });
        this.activeGameLayouts.on('change', (newValue, oldValue) => {
            if (!oldValue) return;
            newValue.forEach((newLayout, i) => {
                const oldLayoutMeta = layouts[oldValue[i] as keyof typeof layouts];
                const newLayoutMeta = layouts[newLayout as keyof typeof layouts];
                if (oldLayoutMeta?.playerNameplateCount !== newLayoutMeta?.playerNameplateCount) {
                    this.recalculateNameplateAssignments(i, newLayoutMeta?.playerNameplateCount ?? 0, this.activeSpeedrun.value);
                }
            });
        });
    }

    setActiveRelayPlayer(teamId: string, playerId: string) {
        if (this.activeSpeedrun.value == null) {
            throw new Error('No speedrun is active');
        }
        if (!this.activeSpeedrun.value.relay) {
            throw new Error('Active speedrun is not a relay');
        }

        const team = this.activeSpeedrun.value.teams.find(team => team.id === teamId);
        if (team == null || !team.playerIds.some(teamPlayer => teamPlayer.id === playerId)) {
            throw new Error('Given player does not exist on given team');
        }

        const teamActivePlayers = this.activeRelayPlayers.value.find(activePlayers => activePlayers.teamId === teamId);
        if (teamActivePlayers == null) {
            throw new Error('Could not find active player assignments for given team');
        }
        teamActivePlayers.playerIds = [playerId];
        this.activeGameLayouts.value.forEach((layout, i) => {
            const nameplateCount = layouts[layout as keyof typeof layouts]?.playerNameplateCount ?? 0;
            this.recalculateNameplateAssignments(i, nameplateCount, this.activeSpeedrun.value);
        });
    }

    private recalculateActiveRelayPlayers(activeSpeedrun: ActiveSpeedrun) {
        if (activeSpeedrun == null || !activeSpeedrun.relay) {
            this.activeRelayPlayers.value = [];
            return;
        }

        this.activeRelayPlayers.value = activeSpeedrun.teams.map(team => {
            const existingActivePlayers = this.activeRelayPlayers.value.find(activePlayers => activePlayers.teamId === team.id);
            if (existingActivePlayers == null) {
                return {
                    teamId: team.id,
                    playerIds: [team.playerIds[0].id]
                };
            } else {
                const validPlayerIds = existingActivePlayers.playerIds.filter(activePlayerId => team.playerIds.some(teamPlayer => teamPlayer.id === activePlayerId));
                if (validPlayerIds.length > 0) {
                    return existingActivePlayers;
                } else {
                    return {
                        teamId: team.id,
                        playerIds: [team.playerIds[0].id]
                    };
                }
            }
        });
    }

    private recalculateNameplateAssignments(feedIndex: number, playerNameplateCount: number, activeSpeedrun: ActiveSpeedrun) {
        if (activeSpeedrun == null || playerNameplateCount === 0) {
            this.playerNameplateAssignments.value[feedIndex] = [];
            return;
        }

        // todo: manual overrides
        this.playerNameplateAssignments.value[feedIndex] = range(playerNameplateCount).map(nameplateIndex => {
            if (activeSpeedrun.relay) {
                const activePlayers = this.activeRelayPlayers.value[nameplateIndex];
                if (activePlayers == null) {
                    return {
                        teamId: undefined,
                        playerIds: []
                    };
                }

                return {
                    teamId: activePlayers.teamId,
                    playerIds: cloneDeep(activePlayers.playerIds)
                };
            } else if (activeSpeedrun.teams.length === 1) {
                const team = activeSpeedrun.teams[0];
                if (playerNameplateCount === 1) {
                    return {
                        teamId: team.id,
                        playerIds: team.playerIds.map(player => player.id)
                    };
                } else {
                    const player = team.playerIds[nameplateIndex];
                    return {
                        teamId: player == null ? undefined : team.id,
                        playerIds: player == null ? [] : [player.id]
                    };
                }
            } else {
                const team = activeSpeedrun.teams[nameplateIndex];
                return {
                    teamId: team?.id,
                    playerIds: team == null ? [] : team.playerIds.map(player => player.id)
                };
            }
        });
        this.nodecg.log.debug(`[Feed #${feedIndex + 1}] Reassigned player nameplates`);
    }
}
