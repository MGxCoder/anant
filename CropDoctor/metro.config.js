const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('tflite'); // bundle crop_disease_model.tflite as an asset

module.exports = config;
