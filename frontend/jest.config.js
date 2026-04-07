/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.json",
      },
    ],
  },
  moduleNameMapper: {
    "^@/public/images/(.*)\\.(svg|png|jpg|jpeg|gif|webp)$": "<rootDir>/test/mocks/fileMock.ts",
    "^@/(.*)$": "<rootDir>/$1",
    "\\.(css|less|scss|sass)$": "<rootDir>/test/mocks/styleMock.ts",
    "\\.(svg|png|jpg|jpeg|gif|webp)$": "<rootDir>/test/mocks/fileMock.ts",
    "^next/image$": "<rootDir>/test/mocks/nextImageMock.tsx",
    "^next/link$": "<rootDir>/test/mocks/nextLinkMock.tsx",
    "^next/navigation$": "<rootDir>/test/mocks/nextNavigationMock.ts",
    "^echarts-for-react$": "<rootDir>/test/mocks/reactEchartsMock.tsx",
    "^hls.js$": "<rootDir>/test/mocks/hlsMock.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/__tests__/**/*.test.(ts|tsx)"],
  clearMocks: true,
};

module.exports = config;
