/* eslint-disable no-underscore-dangle */
// noinspection ExceptionCaughtLocallyJS

'use strict';

// Initialize module dependencies
const config = require('config');

// Initialize the CLI api
const cliAPI = require('../../lib/cli-api/');

// Initialize local libraries
const cliUi = require('../../lib/cli-interface/ui');
const common = require('../../lib/cli-api/_common');
const getProgramOptionDefault = require('../../lib/cli-api/_common/_getProgramOptionDefault');

/**
 * @function _b2cSitesCartridgesRemove
 * @description This function is used to remove app cartridges from the cartridge path.  Commands are
 * abstracted in this manner to facilitate unit testing of each command separately.
 *
 * @param {Object} commandProgram Represents the CLI program to which the getEnvironment command is appended
 * @return {Object} Returns the updated commandProgram -- including the command that was just attached
 */
module.exports = commandProgram => {

    // Append the environment-get command to the parent program
    commandProgram
        .command('crm-sync:b2c:site:cartridges:remove')
        .requiredOption(
            config.get('cliOptions.b2cHostName.cli'),
            config.get('cliOptions.b2cHostName.description'),
            getProgramOptionDefault('b2cHostName')
        )
        .requiredOption(
            config.get('cliOptions.b2cClientId.cli'),
            config.get('cliOptions.b2cClientId.description'),
            getProgramOptionDefault('b2cClientId')
        )
        .requiredOption(
            config.get('cliOptions.b2cClientSecret.cli'),
            config.get('cliOptions.b2cClientSecret.description'),
            getProgramOptionDefault('b2cClientSecret')
        )
        .requiredOption(
            config.get('cliOptions.b2cSiteIds.cli'),
            config.get('cliOptions.b2cSiteIds.description'),
            getProgramOptionDefault('b2cSiteIds')
        )
        .description('Attempts to remove individual app-cartridges from the B2C Commerce site ' +
            'environment cartridge path(s)')
        .action(async commandObj => {

            // Initialize constants
            const commandOptions = commandObj.opts();
            // Retrieve the runtime environment
            const environmentDef = cliAPI.getRuntimeEnvironment(commandOptions);
            // Generate the validation results for all dependent attributes
            const b2cConnProperties = common.getB2CConnProperties(environmentDef);

            try {

                // Open the output display
                cliUi.cliCommandBookend(
                    commandObj._name,
                    'start',
                    'Attempting to remove the b2c-crm-sync cartridges from the B2C site\'s cartridge path',
                    environmentDef);

                // Were any validation errors found with the connection properties?
                cliUi.validateConnectionProperties(
                    b2cConnProperties,
                    config.get('errors.b2c.badEnvironment'));

                // Retrieve and output the results of the cartridge-path remove activity
                const resultObj = await cliAPI.b2cSitesCartridgesRemove(environmentDef);

                // Render the authentication details
                cliUi.outputResults(
                    [resultObj.outputDisplay.authenticate],
                    undefined,
                    'cliTableConfig.b2cAuthTokenOutput');

                // Render the site verification details for success sites
                if (resultObj.outputDisplay.verifySites.success.length > 0) {
                    console.log(' -- Sites verification details - successfully verified these sites');
                    cliUi.outputResults(
                        resultObj.outputDisplay.verifySites.success,
                        undefined,
                        'cliTableConfig.siteOutput');
                }

                // Render the site verification details for error sites
                if (resultObj.outputDisplay.verifySites.error.length > 0) {
                    console.log(' -- Failed to verify the following B2C Commerce Storefronts');
                    cliUi.outputResults(
                        resultObj.outputDisplay.verifySites.error,
                        undefined,
                        'cliTableConfig.siteErrors');
                }

                // Render the cartridge add operation details
                console.log(' -- Cartridge remove operation details');
                cliUi.outputB2CCartridgeRemoveResults(resultObj);

            } catch (e) {

                cliUi.outputResults(undefined, e);
            } finally {

                cliUi.cliCommandBookend(commandObj._name, 'end');

            }
        });

    // Return the program with the appended command
    return commandProgram;
};
