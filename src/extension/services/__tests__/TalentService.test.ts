import { beforeEach, describe, expect, it } from '@jest/globals';
import { mockNodecg, replicants } from '../../__mocks__/MockNodecg';
import { Schedule, Talent } from 'types/schemas';
import { TalentService } from '../TalentService';

describe('TalentService', () => {
    let talentService: TalentService;

    beforeEach(() => {
        talentService = new TalentService(mockNodecg);
    });

    describe('mergeNewTalentList', () => {
        it('merges old and new talent list', () => {
            replicants.talent = [
                // This line item will have new properties added.
                {
                    id: '123123',
                    externalId: '111',
                    name: 'Caster One',
                    socials: {}
                },
                // This line item will have minimal information in the input list. The data listed here shouldn't disappear.
                {
                    id: '234234',
                    externalId: '222',
                    name: 'Caster Two',
                    pronouns: 'they/them',
                    countryCode: 'DE',
                    socials: {
                        twitter: '@casterTwo',
                        youtube: 'castertwo',
                        twitch: 'caster_two',
                        speedruncom: 'caster-two'
                    }
                },
                // This line item will have minimal information in the input list, but with nulls instead of missing values.
                {
                    id: '567567',
                    externalId: '555',
                    name: 'Caster 2.5',
                    pronouns: 'she/her',
                    countryCode: 'IT',
                    socials: {
                        twitter: '@caster2point5',
                        youtube: 'caster2.5',
                        twitch: 'caster_2.5',
                        speedruncom: 'caster-2.5'
                    }
                },
                // This line item will have its properties changed.
                {
                    id: '909090',
                    externalId: '666',
                    name: 'Caster 2.75',
                    pronouns: 'she/they',
                    countryCode: 'FR',
                    socials: {
                        twitter: '@caster2point75',
                        youtube: 'caster2.75',
                        twitch: 'caster_2.75',
                        speedruncom: 'caster-2.75'
                    }
                },
                // This line item will have properties added.
                {
                    id: '345345',
                    externalId: '333',
                    name: 'Caster Three',
                    pronouns: null,
                    countryCode: null,
                    socials: {
                        twitter: null,
                        youtube: null,
                        twitch: null,
                        speedruncom: null,
                        mixer: null
                    }
                },
                // This line item won't be included in the input list.
                {
                    id: '456456',
                    externalId: '444',
                    name: 'Caster Four',
                    socials: {}
                }
            ] satisfies Talent;

            const result = talentService.mergeNewTalentList([
                {
                    id: '',
                    externalId: '333',
                    name: 'Caster Three',
                    pronouns: 'he/him',
                    countryCode: 'GB',
                    socials: {
                        twitter: '@casterThree',
                        youtube: 'casterthree',
                        twitch: 'caster_three',
                        speedruncom: 'caster-three'
                    }
                },
                {
                    id: '',
                    externalId: '111',
                    name: 'Caster One',
                    pronouns: 'he/she',
                    countryCode: 'US',
                    socials: {
                        twitter: '@casterOne',
                        youtube: 'casterone',
                        twitch: 'caster_one',
                        speedruncom: 'caster-one'
                    }
                },
                {
                    id: '',
                    externalId: '222',
                    name: 'Caster Two',
                    socials: {}
                },
                {
                    id: '',
                    externalId: '555',
                    name: 'Caster 2.5?',
                    pronouns: null,
                    countryCode: null,
                    socials: {
                        twitter: null,
                        youtube: null,
                        twitch: null,
                        speedruncom: null
                    }
                },
                {
                    id: '',
                    externalId: '666',
                    name: 'Caster 2.85',
                    pronouns: 'she/her',
                    countryCode: 'CH',
                    socials: {
                        twitter: '@caster2point85',
                        youtube: 'caster2.85',
                        twitch: 'caster_2.85',
                        speedruncom: 'caster-2.85'
                    }
                },
                {
                    id: '',
                    externalId: '9999',
                    name: 'Caster 99',
                    pronouns: 'he/they',
                    countryCode: 'GB',
                    socials: {
                        twitch: 'caster_99'
                    }
                }
            ]);

            expect(result).toEqual([
                {
                    id: '345345',
                    externalId: '333',
                    name: 'Caster Three',
                    pronouns: 'he/him',
                    countryCode: 'GB',
                    socials: {
                        twitter: '@casterThree',
                        youtube: 'casterthree',
                        twitch: 'caster_three',
                        speedruncom: 'caster-three',
                        mixer: null
                    }
                },
                {
                    id: '123123',
                    externalId: '111',
                    name: 'Caster One',
                    pronouns: 'he/she',
                    countryCode: 'US',
                    socials: {
                        twitter: '@casterOne',
                        youtube: 'casterone',
                        twitch: 'caster_one',
                        speedruncom: 'caster-one'
                    }
                },
                {
                    id: '234234',
                    externalId: '222',
                    name: 'Caster Two',
                    pronouns: 'they/them',
                    countryCode: 'DE',
                    socials: {
                        twitter: '@casterTwo',
                        youtube: 'castertwo',
                        twitch: 'caster_two',
                        speedruncom: 'caster-two'
                    }
                },
                {
                    id: '567567',
                    externalId: '555',
                    name: 'Caster 2.5?',
                    pronouns: 'she/her',
                    countryCode: 'IT',
                    socials: {
                        twitter: '@caster2point5',
                        youtube: 'caster2.5',
                        twitch: 'caster_2.5',
                        speedruncom: 'caster-2.5'
                    }
                },
                {
                    id: '909090',
                    externalId: '666',
                    name: 'Caster 2.85',
                    pronouns: 'she/her',
                    countryCode: 'CH',
                    socials: {
                        twitter: '@caster2point85',
                        youtube: 'caster2.85',
                        twitch: 'caster_2.85',
                        speedruncom: 'caster-2.85'
                    }
                },
                {
                    id: expect.any(String),
                    externalId: '9999',
                    name: 'Caster 99',
                    pronouns: 'he/they',
                    countryCode: 'GB',
                    socials: {
                        twitch: 'caster_99'
                    }
                },
                {
                    id: '456456',
                    externalId: '444',
                    name: 'Caster Four',
                    socials: {}
                }
            ]);
        });
    });

    describe('getScheduleWithTalentIds', () => {
        it('fills talent IDs with input', () => {
            const result = talentService.getScheduleWithTalentIds([
                {
                    type: 'OTHER',
                    title: 'Other Schedule Item',
                    talentIds: [
                        { id: '', externalId: '111' },
                        { id: 'test-talent-3', externalId: '333' }
                    ]
                },
                {
                    type: 'SETUP',
                    title: 'Setup Schedule Item',
                    talentIds: []
                },
                {
                    type: 'SPEEDRUN',
                    title: 'Speedrun!!',
                    teams: [
                        {
                            id: '1111',
                            name: 'Team One',
                            playerIds: [
                                { id: '', externalId: '111' },
                                { id: 'test-talent-3', externalId: '333' }
                            ]
                        },
                        {
                            id: '1111',
                            name: 'Team One',
                            playerIds: [
                                { id: '', externalId: '222' },
                                { id: 'test-talent-3', externalId: '333' }
                            ]
                        }
                    ],
                    commentatorIds: [
                        { id: '', externalId: '111' },
                        { id: 'test-talent-3', externalId: '333' }
                    ]
                }
            ] as Schedule['items'], [
                {
                    id: 'test-talent-1',
                    externalId: '111'
                },
                {
                    id: 'test-talent-2',
                    externalId: '222'
                }
            ] as Talent);

            expect(result).toEqual([
                {
                    type: 'OTHER',
                    title: 'Other Schedule Item',
                    talentIds: [
                        { id: 'test-talent-1', externalId: '111' },
                        { id: 'test-talent-3', externalId: '333' }
                    ]
                },
                {
                    type: 'SETUP',
                    title: 'Setup Schedule Item',
                    talentIds: []
                },
                {
                    type: 'SPEEDRUN',
                    title: 'Speedrun!!',
                    teams: [
                        {
                            id: '1111',
                            name: 'Team One',
                            playerIds: [
                                { id: 'test-talent-1', externalId: '111' },
                                { id: 'test-talent-3', externalId: '333' }
                            ]
                        },
                        {
                            id: '1111',
                            name: 'Team One',
                            playerIds: [
                                { id: 'test-talent-2', externalId: '222' },
                                { id: 'test-talent-3', externalId: '333' }
                            ]
                        }
                    ],
                    commentatorIds: [
                        { id: 'test-talent-1', externalId: '111' },
                        { id: 'test-talent-3', externalId: '333' }
                    ]
                }
            ])
        })

        it('handles talent missing from talent list', () => {
            const result = talentService.getScheduleWithTalentIds([
                {
                    type: 'OTHER',
                    title: 'Other Schedule Item',
                    talentIds: [
                        { id: '', externalId: '444' }
                    ]
                },
                {
                    type: 'SETUP',
                    title: 'Setup Schedule Item',
                    talentIds: []
                },
                {
                    type: 'SPEEDRUN',
                    title: 'Speedrun!!',
                    teams: [
                        {
                            id: '1111',
                            name: 'Team One',
                            playerIds: [
                                { id: '', externalId: '666' }
                            ]
                        },
                        {
                            id: '1111',
                            name: 'Team One',
                            playerIds: [
                                { id: '', externalId: '777' }
                            ]
                        }
                    ],
                    commentatorIds: [
                        { id: '', externalId: '888' }
                    ]
                }
            ] as Schedule['items'], [
                {
                    id: 'test-talent-1',
                    externalId: '111'
                },
                {
                    id: 'test-talent-2',
                    externalId: '222'
                }
            ] as Talent);

            expect(result).toEqual([
                {
                    type: 'OTHER',
                    title: 'Other Schedule Item',
                    talentIds: [
                        { id: '', externalId: '444' }
                    ]
                },
                {
                    type: 'SETUP',
                    title: 'Setup Schedule Item',
                    talentIds: []
                },
                {
                    type: 'SPEEDRUN',
                    title: 'Speedrun!!',
                    teams: [
                        {
                            id: '1111',
                            name: 'Team One',
                            playerIds: [
                                { id: '', externalId: '666' }
                            ]
                        },
                        {
                            id: '1111',
                            name: 'Team One',
                            playerIds: [
                                { id: '', externalId: '777' }
                            ]
                        }
                    ],
                    commentatorIds: [
                        { id: '', externalId: '888' }
                    ]
                }
            ])
        });

        it('throws if any talent in schedule has no IDs', () => {
            expect(() => talentService.getScheduleWithTalentIds([
                {
                    type: 'OTHER',
                    title: 'Other Schedule Item',
                    talentIds: [
                        { id: '', externalId: null }
                    ]
                }
            ] as Schedule['items'], [])).toThrow(new Error('Found talent in schedule with no IDs'));
        });
    });
});