// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const contractDir = path.resolve(projectRoot, '../../packages/gate-contract');
const contractEntry = path.join(contractDir, 'src/index.ts');

const config = getDefaultConfig(projectRoot);

// 이 앱은 Bun 워크스페이스에 속하지 않는다 — Expo가 요구하는 React 버전이 웹과
// 달라 한 node_modules에 섞이면 둘 중 하나가 깨진다. 웹과 공유하는 계약 패키지는
// 설치 대신 소스를 직접 가져온다.
config.watchFolders = [contractDir];

const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolve ?? context.resolveRequest;
  if (moduleName === '@prectxe/gate-contract') {
    return { type: 'sourceFile', filePath: contractEntry };
  }
  // 계약 패키지가 import하는 것(zod)은 이 앱의 node_modules에서 찾는다. 그대로
  // 두면 위로 올라가 레포 루트(웹 워크스페이스)의 것을 집거나, 루트 설치가 없는
  // 빌드 서버에서 못 찾는다.
  // 계약 안의 상대 경로(./qr 등)는 그대로 계약 폴더 기준으로 찾는다
  const isPackage = !moduleName.startsWith('.') && !path.isAbsolute(moduleName);
  if (
    isPackage &&
    context.originModulePath.startsWith(contractDir + path.sep)
  ) {
    return resolve(
      { ...context, originModulePath: path.join(projectRoot, 'package.json') },
      moduleName,
      platform
    );
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
