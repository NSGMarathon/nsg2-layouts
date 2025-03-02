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
import { ObsConnectorService } from './ObsConnectorService';

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

        this.activeSpeedrun.on('change', (newValue, oldValue) => {
            this.recalculateActiveRelayPlayers(newValue);
            const speedrunChanging = oldValue != null && newValue != null && newValue.id !== oldValue.id;
            this.activeGameLayouts.value.forEach((layout, i) => {
                const nameplateCount = layouts[layout as keyof typeof layouts]?.playerNameplateCount ?? 0;
                this.recalculateNameplateAssignments(i, nameplateCount, newValue, speedrunChanging);
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

    setActiveRelayPlayer(teamId: string, playerIndex: number) {
        if (this.activeSpeedrun.value == null) {
            throw new Error('No speedrun is active');
        }
        if (!this.activeSpeedrun.value.relay) {
            throw new Error('Active speedrun is not a relay');
        }

        const team = this.activeSpeedrun.value.teams.find(team => team.id === teamId);
        if (team == null || team.playerIds[playerIndex] == null) {
            throw new Error('Given player does not exist on given team');
        }

        const player = team.playerIds[playerIndex];

        const teamActivePlayers = this.activeRelayPlayers.value.find(activePlayers => activePlayers.teamId === teamId);
        if (teamActivePlayers == null) {
            throw new Error('Could not find active player assignments for given team');
        }
        teamActivePlayers.players = [{
            index: playerIndex,
            talentId: player.id
        }];
        this.activeGameLayouts.value.forEach((layout, i) => {
            const nameplateCount = layouts[layout as keyof typeof layouts]?.playerNameplateCount ?? 0;
            this.recalculateNameplateAssignments(i, nameplateCount, this.activeSpeedrun.value);
        });
    }

    setCustomAssignments(feedIndex: number, doAutomaticAssignments: boolean, nameplatePlayers?: { talentId: string, teamId: string }[][]) {
        const nameplateCount = layouts[this.activeGameLayouts.value[feedIndex] as keyof typeof layouts]?.playerNameplateCount ?? 0;
        if (!doAutomaticAssignments) {
            if (nameplatePlayers == null) {
                throw new Error('Nameplate player IDs must be defined if automatic assignments are not requested');
            }
            if (nameplatePlayers.length !== nameplateCount) {
                throw new Error(`Incorrect amount of nameplate assignments found (Expected ${nameplateCount}, found ${nameplatePlayers.length}`);
            }
            if (this.activeSpeedrun.value == null) {
                this.playerNameplateAssignments.value[feedIndex] = {
                    doAutomaticAssignments: false,
                    assignments: []
                };
                return;
            }

            const teamIdToPlayerIdsMap = this.getTeamIdToPlayerIdsMap();

            nameplatePlayers.forEach(nameplate => {
                nameplate.forEach(player => {
                    const teamPlayerIds = teamIdToPlayerIdsMap.get(player.teamId);
                    if (teamPlayerIds == null) {
                        throw new Error(`Could not find team in active speedrun with ID ${player.teamId}`);
                    }
                    if (!teamPlayerIds.has(player.talentId)) {
                        throw new Error(`Player ${player.talentId} is not playing for team ${player.teamId}`);
                    }
                });
            });

            this.playerNameplateAssignments.value[feedIndex] = {
                doAutomaticAssignments: false,
                assignments: nameplatePlayers.map(nameplate => ({ players: nameplate }))
            };
        } else {
            this.recalculateNameplateAssignments(feedIndex, nameplateCount, this.activeSpeedrun.value, true);
        }
    }

    private recalculateActiveRelayPlayers(activeSpeedrun: ActiveSpeedrun) {
        if (activeSpeedrun == null || !activeSpeedrun.relay) {
            this.activeRelayPlayers.value = [];
            return;
        }

        this.activeRelayPlayers.value = activeSpeedrun.teams.map(team => {
            if (team.playerIds.length === 0) {
                return {
                    teamId: team.id,
                    players: []
                };
            }

            const existingActivePlayers = this.activeRelayPlayers.value.find(activePlayers => activePlayers.teamId === team.id);
            if (existingActivePlayers == null || existingActivePlayers.players.length !== 1) {
                return {
                    teamId: team.id,
                    players: [{
                        index: 0,
                        talentId: team.playerIds[0].id
                    }]
                };
            } else {
                const existingActivePlayer = existingActivePlayers.players[0];
                if (team.playerIds[existingActivePlayer.index] == null) {
                    // If there's no longer a player in the given position, the team has shrunk.
                    // We move backwards to the last position available. How did we get here?
                    return {
                        teamId: team.id,
                        players: [{
                            index: team.playerIds.length - 1,
                            talentId: team.playerIds[team.playerIds.length - 1].id
                        }]
                    };
                } else {
                    // If the previously active player stayed in the same position, all is well.
                    // Presumably some players next up in line got swapped around.

                    // What if the player at the given index is no longer the player we expect them to be?
                    // Let's keep the index and assume the player change was expected.
                    // The UI for moving players around in teams reflects this behavior, so it shouldn't be unexpected.

                    return {
                        teamId: team.id,
                        players: [{
                            index: existingActivePlayer.index,
                            talentId: team.playerIds[existingActivePlayer.index].id
                        }]
                    };
                }
            }
        });
    }

    private recalculateNameplateAssignments(feedIndex: number, playerNameplateCount: number, activeSpeedrun: ActiveSpeedrun, forceAutomaticAssignment = false) {
        if (activeSpeedrun == null || playerNameplateCount === 0) {
            this.playerNameplateAssignments.value[feedIndex].assignments = [];
            return;
        }

        const existingFeedAssignment = this.playerNameplateAssignments.value[feedIndex];
        if (existingFeedAssignment.doAutomaticAssignments || forceAutomaticAssignment) {
            this.playerNameplateAssignments.value[feedIndex] = {
                doAutomaticAssignments: true,
                assignments: range(playerNameplateCount).map(nameplateIndex => {
                    if (activeSpeedrun.relay) {
                        const activePlayers = this.activeRelayPlayers.value[nameplateIndex];
                        if (activePlayers == null) {
                            return {
                                players: []
                            };
                        }
                        return {
                            players: activePlayers.players.map(activePlayer => ({
                                talentId: activePlayer.talentId,
                                teamId: activePlayers.teamId
                            }))
                        };
                    } else if (activeSpeedrun.teams.length === 1) {
                        const team = activeSpeedrun.teams[0];
                        if (playerNameplateCount === 1) {
                            return {
                                players: team.playerIds.map(player => ({
                                    talentId: player.id,
                                    teamId: team.id
                                }))
                            };
                        } else {
                            const player = team.playerIds[nameplateIndex];
                            return {
                                players: player == null ? [] : [{ talentId: player.id, teamId: team.id }]
                            };
                        }
                    } else {
                        const team = activeSpeedrun.teams[nameplateIndex];
                        return {
                            players: team == null ? [] : team.playerIds.map(player => ({ talentId: player.id, teamId: team.id }))
                        };
                    }
                })
            }
        } else {
            const teamIdToPlayerIdsMap = this.getTeamIdToPlayerIdsMap();
            const playerIdSet = new Set<string>();
            activeSpeedrun.teams.forEach(team => {
                team.playerIds.forEach(player => {
                    playerIdSet.add(player.id);
                });
            });
            this.playerNameplateAssignments.value[feedIndex] = {
                doAutomaticAssignments: false,
                assignments: range(playerNameplateCount).map(nameplateIndex => {
                    const existingAssignment = existingFeedAssignment.assignments[nameplateIndex];
                    if (existingAssignment == null) {
                        return {
                            players: []
                        };
                    } else {
                        return {
                            players: existingAssignment.players.filter(player => {
                                const teamPlayerIds = teamIdToPlayerIdsMap.get(player.teamId);
                                return teamPlayerIds != null && teamPlayerIds.has(player.talentId);
                            })
                        };
                    }
                })
            };
        }
        this.nodecg.log.debug(`[Feed #${feedIndex + 1}] Recalculated player nameplates`);
    }

    private getTeamIdToPlayerIdsMap() {
        const result = new Map<string, Set<string>>();
        this.activeSpeedrun.value?.teams.forEach(team => {
            const playerIdSet = new Set<string>();
            team.playerIds.forEach(player => {
                playerIdSet.add(player.id);
            });
            result.set(team.id, playerIdSet);
        });
        return result;
    }
}
