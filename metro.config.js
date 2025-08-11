const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Add support for path aliases
config.resolver.alias = {
    '@': __dirname + '/src',
}

module.exports = config
