import type NodeCG from '@nodecg/types';
import type { ActiveGameLayouts, ActiveSpeedrun, Configschema, PlayerNameplateAssignments } from 'types/schemas';
import { layouts } from 'types/Layouts';
import range from 'lodash/range';

export class NameplateAssignmentService {
    private readonly nodecg: NodeCG.ServerAPI<Configschema>;
    private readonly activeSpeedrun: NodeCG.ServerReplicantWithSchemaDefault<ActiveSpeedrun>;
    private readonly playerNameplateAssignments: NodeCG.ServerReplicantWithSchemaDefault<PlayerNameplateAssignments>;
    private readonly activeGameLayouts: NodeCG.ServerReplicantWithSchemaDefault<ActiveGameLayouts>;

    constructor(nodecg: NodeCG.ServerAPI<Configschema>) {
        this.nodecg = nodecg;
        this.activeSpeedrun = nodecg.Replicant('activeSpeedrun') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ActiveSpeedrun>;
        this.playerNameplateAssignments = nodecg.Replicant('playerNameplateAssignments') as unknown as NodeCG.ServerReplicantWithSchemaDefault<PlayerNameplateAssignments>;
        this.activeGameLayouts = nodecg.Replicant('activeGameLayouts') as unknown as NodeCG.ServerReplicantWithSchemaDefault<ActiveGameLayouts>;

        this.activeSpeedrun.on('change', newValue => {
            const nameplateCount = layouts[this.activeGameLayouts.value[0] as keyof typeof layouts]?.playerNameplateCount ?? 0;
            this.recalculateNameplateAssignments(nameplateCount, newValue);
        });
        this.activeGameLayouts.on('change', (newValue, oldValue) => {
            if (!oldValue) return;
            const oldLayoutMeta = layouts[oldValue[0] as keyof typeof layouts];
            const newLayoutMeta = layouts[newValue[0] as keyof typeof layouts];
            if (oldLayoutMeta?.playerNameplateCount !== newLayoutMeta?.playerNameplateCount) {
                this.recalculateNameplateAssignments(newLayoutMeta?.playerNameplateCount ?? 0, this.activeSpeedrun.value);
            }
        });
    }

    private recalculateNameplateAssignments(playerNameplateCount: number, activeSpeedrun: ActiveSpeedrun) {
        if (activeSpeedrun == null || playerNameplateCount === 0) {
            this.playerNameplateAssignments.value = [];
            return;
        }

        // todo: manual overrides
        this.playerNameplateAssignments.value = range(playerNameplateCount).map(nameplateIndex => {
            if (activeSpeedrun.relay) {
                // todo: super-theoretically; a relay can have 2+ players playing at once per team
                const team = activeSpeedrun.teams[nameplateIndex];
                if (team == null) {
                    return {
                        teamId: undefined,
                        playerIds: []
                    };
                }
                const previousActiveRelayPlayerId = this.playerNameplateAssignments.value.find(existingAssignment => existingAssignment.teamId === team.id)?.playerIds[0];
                const activeRelayPlayerId = previousActiveRelayPlayerId != null && team.playerIds.some(playerId => playerId.id === previousActiveRelayPlayerId)
                    ? previousActiveRelayPlayerId
                    : team.playerIds[0]?.id
                return {
                    teamId: team?.id,
                    playerIds: activeRelayPlayerId == null ? [] : [activeRelayPlayerId]
                };
            } else if (activeSpeedrun.teams.length === 1) {
                const team = activeSpeedrun.teams[0];
                if (playerNameplateCount === 1) {
                    return {
                        teamId: team.id,
                        playerIds: team.playerIds.map(playerId => playerId.id)
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
                    playerIds: team == null ? [] : team.playerIds.map(playerId => playerId.id)
                };
            }
        });
        this.nodecg.log.debug('Reassigned player nameplates');
    }
}
