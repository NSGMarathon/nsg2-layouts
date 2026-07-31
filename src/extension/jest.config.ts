export default {
    preset: 'ts-jest/presets/js-with-ts',
    clearMocks: true,
    restoreMocks: true,
    moduleDirectories: ['node_modules', 'src'],
    transform: {
        '^.+\\.m?[tj]sx?$': 'ts-jest'
    },
    transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
    setupFilesAfterEnv: [
        './__mocks__/mockNodecg.ts',
        './__mocks__/MockBaseController.ts'
    ]
};
