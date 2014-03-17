/*global module:true */

module.exports = function (grunt) {

    'use strict';

    var config = grunt.file.readJSON('config.json'),
        distFile = config.dist + '/fbp.js',
        distMinFile = config.dist + '/fbp.min.js';

    grunt.initConfig({
        banner: config.banner,
        header: config.header,
        clean: {
            src: config.dist
        },
        concat: {
            options: {
                banner: config.banner + config.header,
                footer: config.footer
            },
            dist: {
                src: config.src,
                dest: distFile
            }
        },
        uglify: {
            options: {
                banner: config.banner
            },
            dist: {
                src: distFile,
                dest: distMinFile
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('default', ['clean', 'concat', 'uglify']);

};