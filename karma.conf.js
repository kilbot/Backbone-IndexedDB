module.exports = function (config) {
  var seleniumLaunchers = require('./test/browsers');
  var appiumLaunchers = require('./test/appium');
  var launchers = Object.assign(seleniumLaunchers, appiumLaunchers);

  var configuration = {
    frameworks: ['mocha', 'chai'],

    files: [
      'node_modules/jquery/dist/jquery.js',
      'node_modules/lodash/lodash.js',
      'node_modules/backbone/backbone.js',
      'dist/backbone-indexeddb.js',
      'test/spec.js'
    ],

    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    reporters: ['mocha', 'saucelabs'],

    plugins: [
      'karma-mocha',
      'karma-chai',
      'karma-mocha-reporter',
      'karma-sauce-launcher'
    ],

    sauceLabs: {
      testName: 'Unit Tests',
      connectOptions: {
        port: 5757,
        logfile: 'sauce_connect.log'
      },
    },
    captureTimeout: 120000,
    customLaunchers: launchers,

    /**
     * mocha settings don't work :(
     */
    client: {
      mocha: {
        reporter: 'html',
        slow: 0
      }
    }
};

  if (process.env.TRAVIS) {
    configuration.browsers = Object.keys(launchers);
    configuration.singleRun = true;
  }

  config.set(configuration);
};
