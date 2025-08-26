'use strict';

//----------------------------------------------
// Wallaby.js Configuration
//----------------------------------------------

// Default NODE_ENV to 'test' if not already set
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

/**
 * Wallaby configuration (ESM style).
 * Defines how files, tests, and coverage are handled.
 */
export default function wallabyConfig() {
    return {

        //------------------------------------------
        // Runtime Execution
        //------------------------------------------
        debug: false,
        trace: false,

        //------------------------------------------
        // Code Coverage Thresholds
        //------------------------------------------
        lowCoverageThreshold: 90,
        coverageThresholds: {
            statements: 90,
            branches: 85,
            functions: 90,
            lines: 90
        },

        //------------------------------------------
        // Files to Include
        //------------------------------------------
        files: [
            'config/**',
            'lib/**/*.js',
            '!wallaby.js',
            '!test/**/*.test.js' // Exclude tests from "files"
        ],

        //------------------------------------------
        // Tests to Execute
        //------------------------------------------
        tests: [
            'test/**/*.test.js',
            '!test/cli-interface/**/*.cli.test.js'
        ],

        //------------------------------------------
        // Files Ignored for Coverage
        //------------------------------------------
        filesWithNoCoverageCalculated: [
            'lib/**/index.js',
            'lib/qa/**/*.js',
            'lib/cli-interface/ui/*.js',
            'lib/cli-interface/*.js'
        ],

        //------------------------------------------
        // Test Framework
        //------------------------------------------
        testFramework: {
            type: 'mocha'
        },

        //------------------------------------------
        // Node Environment
        //------------------------------------------
        env: {
            type: 'node',
            runner: 'node'
        },

        //------------------------------------------
        // Worker Management
        //------------------------------------------
        workers: {
            recycle: true,
            initial: 1,
            regular: 1
        }
    };
}
