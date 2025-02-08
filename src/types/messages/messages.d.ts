import { ObsConfig, ObsConnectionInfo, Talent, VideoInputAssignment } from '../schemas';
import { ScheduleItem } from '../ScheduleHelpers';
import { ObsSceneItemTransform } from '../../extension/services/ObsConnectorService';
import { IgdbGameData } from '../../extension/services/IgdbService';

export interface MessageInputMap {
    'log:warning': string

    'schedule:import': { slug: string, mergeExisting: boolean }
    'schedule:setInterstitialCompleted': { scheduleItemId: string, completed: boolean }
    'schedule:updateItem': ScheduleItem

    'oengus:login': { username: string, password: string, twoFactorCode?: string }

    'speedrun:seekToNextRun': never
    'speedrun:seekToPreviousRun': never
    'speedrun:setActiveSpeedrun': { scheduleItemId: string }

    'nameplate:setActiveRelayPlayer': { teamId: string, playerId: string }
    'nameplate:setCustomAssignments': { feedIndex: number, doAutomaticAssignments: boolean, nameplatePlayerIds?: { talentId: string, teamId: string }[][] }

    'talent:updateTalentItems': Talent
    'talent:setCurrentHost': Talent[number]
    'talent:removeCurrentHost': never

    'timer:start': never
    'timer:stop': { teamId?: string, forfeit?: boolean } | undefined
    'timer:undoStop': { teamId?: string } | undefined
    'timer:pause': never
    'timer:reset': never

    'obs:connect': ObsConnectionInfo
    'obs:setConfig': ObsConfig
    'obs:setEnabled': { enabled: boolean }
    'obs:setCurrentScene': { sceneName: string }
    'obs:getSourceScreenshot': { sourceName: string }
    'obs:getSceneItemTransform': { sceneItemId: number, sceneName?: string }
    'obs:setSceneItemCrop': { sceneName: string, sceneItemId: number, crop: { cropTop: number, cropRight: number, cropBottom: number, cropLeft: number } }
    'obs:setVideoInputAssignments': { type: 'game' | 'camera', feedIndex: number, assignments: (VideoInputAssignment | null)[] }
    'obs:setVideoInputPositions': { feedIndex: number, positions: ObsVideoInputPositions[number] }

    'tracker:newDonation': { amount: number, displayName: string | undefined | null }

    'twitch:logout': never
    'twitch:findCategory': { name: string }
    'twitch:startCommercial': { length: number }

    'igdb:findGame': { name: string }
}

type MessagesWithoutReturnValues = Exclude<keyof MessageInputMap, keyof InnerMessageResultMap>;

interface InnerMessageResultMap {
    'twitch:findCategory': { id: string, name: string, boxArtUrl: string }[] | undefined

    'igdb:findGame': IgdbGameData[] | undefined

    'obs:getSourceScreenshot': string
    'obs:getSceneItemTransform': ObsSceneItemTransform
}

export type MessageResultMap = InnerMessageResultMap & {
    [Key in MessagesWithoutReturnValues]: void
}
