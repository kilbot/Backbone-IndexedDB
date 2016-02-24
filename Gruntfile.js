module.exports = function(grunt) {

  grunt.initConfig({

    watch: {
      js: {
        files: ['src/*.js'],
        tasks: ['webpack', 'jshint', 'karma']
      },
      test: {
        files: ['tests/*.spec.js'],
        tasks: ['jshint', 'karma']
      }
    },

    jshint: {
      options: {
        jshintrc: true,
        reporter: require('jshint-stylish'),
        verbose: true
      },
      files: ['src/*.js']
    },

    webpack: {
      options: {
        entry: {
          'backbone-indexeddb': './index.js'
        },
        resolve: {
          alias: {
            underscore: 'lodash'
          },
          modulesDirectories: ['node_modules']
        },
        externals: {
          jquery: 'jQuery',
          lodash: '_',
          underscore: '_',
          backbone: 'Backbone',
          'idb-wrapper': 'IDBStore'
        },
        cache: true,
        watch: true
      },
      build: {
        output: {
          path: './dist',
          filename: '[name].js'
        }
      }
    },

    karma: {
      unit: {
        configFile: 'karma.conf.js'
      }
    }

  });

  require('load-grunt-tasks')(grunt);
  grunt.registerTask('default', ['webpack', 'jshint', 'karma']);
  grunt.registerTask('dev', ['default', 'watch']);

}