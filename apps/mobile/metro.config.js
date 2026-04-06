const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.transformer = {
  ...config.transformer,
  minifierPath: 'react-native-minify-transformer',
};

config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'cjs', 'json'],
  resolveRequest: (context, moduleName, platform) => {
    if (platform === 'ios' || platform === 'android') {
      return {
        filePath: moduleName,
        type: 'sourceFile',
      };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
