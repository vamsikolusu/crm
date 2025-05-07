/* eslint-disable no-underscore-dangle */
// noinspection ExceptionCaughtLocallyJS

'use strict';

// Initialize module dependencies
const config = require('config');

// Initialize the CLI api
const cliAPI = require('../../lib/cli-api/');

// Initialize local libraries
const cliUi = require('../../lib/cli-interface/ui');
const getProgramOptionDefault = require('../../lib/cli-api/_common/_getProgramOptionDefault');
const getRuntimeEnvironment = require('../../lib/cli-api/_getRuntimeEnvironment');

/**
 * @function b2cCodeZip
 * @description This function is create an archive using the specified code-version name.
 * Commands are abstracted in this manner to facilitate unit testing of each command separately.
 *
 * @param {Object} commandProgram Represents the CLI program to which the getEnvironment command is appended
 * @return {Object} Returns the updated commandProgram -- including the command that was just attached
 */
module.exports = commandProgram => {
    // Append the environment-get command to the parent program
    commandProgram
        .command('crm-sync:b2c:code:zip')
        .requiredOption(
            config.get('cliOptions.b2cCodeVersion.cli'),
            config.get('cliOptions.b2cCodeVersion.description'),
            getProgramOptionDefault('b2cCodeVersion'))
        .description('Creates an archive for the B2C Commerce cartridge code as a pre-cursor to ' +
            'deployment -- defaults to the .env; can be overridden via the CLI')
        .action(async commandObj => {

            // Initialize constants
            const commandOptions = commandObj.opts();
            // Retrieve the runtime environment
            const environmentDef = getRuntimeEnvironment(commandOptions);

            try {

                // Open the output display
                cliUi.cliCommandBookend(
                    commandObj._name,
                    'start',
                    'Attempting to zip the B2C cartridge code',
                    environmentDef);

                // Archive the B2C Commerce code-versions
                const resultObj = await cliAPI.b2cZip(
                    environmentDef,
                    config.get('paths.b2cLabel'),
                    config.get('paths.cartridgePathLabel'));

                // Render the zip result
                cliUi.outputResults(
                    [resultObj.outputDisplay],
                    undefined,
                    'cliTableConfig.zipSummary');

            } catch (e) {

                cliUi.outputResults(undefined, e);

            } finally {

                cliUi.cliCommandBookend(commandObj._name, 'end');

            }

        });

    // Return the program with the appended command
    return commandProgram;
};
