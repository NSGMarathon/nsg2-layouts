import { ObsConfig, ObsConnectionInfo, Talent, VideoFile, VideoInputAssignment } from '../schemas';
import { ScheduleItem } from '../ScheduleHelpers';
import { ObsSceneItemTransform } from '../../extension/services/ObsConnectorService';
import { IgdbGameData } from '../../extension/services/IgdbService';
import { InterstitialVideoState } from '../schemas/interstitialVideoState';

export interface MessageInputMap {
    'log:warning': string

    'schedule:import': { slug: string, mergeExisting: boolean }
    'schedule:setInterstitialCompleted': { scheduleItemId: string, completed: boolean }
    'schedule:updateItem': ScheduleItem

    'oengus:login': { username: string, password: string, twoFactorCode?: string }

    'speedrun:seekToNextRun': never
    'speedrun:seekToPreviousRun': never
    'speedrun:setActiveSpeedrun': { scheduleItemId: string }

    'nameplate:setActiveRelayPlayer': { teamId: string, playerIndex: number }
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
    'obs:copyFeedVideoInputs': { fromFeedIndex: number, toFeedIndex: number }

    'tracker:newDonation': { amount: number, displayName: string | undefined | null }

    'twitch:logout': never
    'twitch:findCategory': { name: string }
    'twitch:startCommercial': { length: number }

    'igdb:findGame': { name: string }

    'videos:loadSpeedruns': never
    'videos:loadInterstitials': never
    'videos:playInterstitial': { file: VideoFile, returnToScene: InterstitialVideoState['returnToScene'] }

    'speedrunPlaylist:play': never
    'speedrunPlaylist:stop': never

    'todo:setCompleted': { categoryName: string, listItemName: string, completed: boolean }

    'stage-display:flash': never
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
