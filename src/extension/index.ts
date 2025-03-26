import type NodeCG from '@nodecg/types';
import { Configschema } from 'types/schemas';
import { ScheduleController } from './controllers/ScheduleController';
import { OengusClient } from './clients/OengusClient';
import { ScheduleService } from './services/ScheduleService';
import { TalentService } from './services/TalentService';
import { SpeedrunService } from './services/SpeedrunService';
import { SpeedrunController } from './controllers/SpeedrunController';
import { TalentController } from './controllers/TalentController';
import { TimerService } from './services/TimerService';
import { TimerController } from './controllers/TimerController';
import { ObsConnectorService } from './services/ObsConnectorService';
import { ObsConnectorController } from './controllers/ObsConnectorController';
import { LogController } from './controllers/LogController';
import { NameplateAssignmentService } from './services/NameplateAssignmentService';
import { TrackerService } from './services/TrackerService';
import { NameplateAssignmentController } from './controllers/NameplateAssignmentController';
import { TwitchService } from './services/TwitchService';
import { TwitchOauthClient } from './clients/TwitchOauthClient';
import { TwitchClient } from './clients/TwitchClient';
import { TwitchController } from './controllers/TwitchController';
import { MusicService } from './services/MusicService';
import { MixerService } from './services/mixer/MixerService';
import { OengusService } from './services/OengusService';
import { OengusController } from './controllers/OengusController';
import { IgdbClient } from './clients/IgdbClient';
import { IgdbService } from './services/IgdbService';
import { IgdbController } from './controllers/IgdbController';
import { CountdownService } from './services/CountdownService';
import { VideoFileService } from './services/VideoFileService';
import { VideoFileController } from './controllers/VideoFileController';
import { SpeedrunPlaylistService } from './services/SpeedrunPlaylistService';
import { SpeedrunPlaylistController } from './controllers/SpeedrunPlaylistController';

export = (nodecg: NodeCG.ServerAPI<Configschema>): void => {
    const oengusClient = new OengusClient(nodecg);

    const hasTwitchConfig = TwitchOauthClient.hasRequiredConfig(nodecg);
    const twitchOauthClient = hasTwitchConfig ? new TwitchOauthClient(nodecg) : null;
    const twitchClient = twitchOauthClient ? new TwitchClient(nodecg, twitchOauthClient) : null;
    const igdbClient = twitchOauthClient ? new IgdbClient(nodecg, twitchOauthClient) : null;

    const igdbService = igdbClient ? new IgdbService(nodecg, igdbClient) : null;
    const talentService = new TalentService(nodecg);
    const scheduleService = new ScheduleService(nodecg, oengusClient, talentService, igdbService);
    const obsConnectorService = new ObsConnectorService(nodecg);
    const timerService = new TimerService(nodecg, obsConnectorService, scheduleService);
    const speedrunService = new SpeedrunService(nodecg, scheduleService, timerService, obsConnectorService);
    scheduleService.init(speedrunService);
    const nameplateAssignmentService = new NameplateAssignmentService(nodecg);
    new TrackerService(nodecg);
    const twitchService = new TwitchService(nodecg, twitchOauthClient, twitchClient, talentService, scheduleService);
    new MusicService(nodecg, obsConnectorService);
    new MixerService(nodecg, obsConnectorService);
    const oengusService = new OengusService(nodecg, oengusClient);
    new CountdownService(nodecg);
    const videoFileService = new VideoFileService(nodecg);
    const speedrunPlaylistService = new SpeedrunPlaylistService(nodecg, obsConnectorService, speedrunService, timerService);

    new ScheduleController(nodecg, scheduleService);
    new SpeedrunController(nodecg, speedrunService);
    new TalentController(nodecg, talentService);
    new TimerController(nodecg, timerService);
    new ObsConnectorController(nodecg, obsConnectorService);
    new LogController(nodecg);
    new NameplateAssignmentController(nodecg, nameplateAssignmentService);
    new TwitchController(nodecg, twitchService);
    new OengusController(nodecg, oengusService);
    new IgdbController(nodecg, igdbService);
    new VideoFileController(nodecg, videoFileService);
    new SpeedrunPlaylistController(nodecg, speedrunPlaylistService);
};
