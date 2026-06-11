const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 大量のファイルがあるフォルダを監視対象から除外してEMFILEを防ぐ
config.resolver.blockList = [
  /node_modules\/.*\/node_modules/,
  /ios\/Build/,
  /\.expo\/.*/
];

module.exports = config;