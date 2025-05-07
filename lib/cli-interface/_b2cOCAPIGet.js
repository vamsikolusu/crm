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
 * @function b2cOCAPIGet
 * @description Retrieves the OCAPI configuration settings for a given B2C Instance.  Commands are abstracted in
 * this manner to facilitate unit testing of each command separately.
 *
 * @param {Object} commandProgram Represents the CLI program to which the getEnvironment command is appended
 * @returns {Object} Returns the updated commandProgram -- including the command that was just attached
 */
module.exports = commandProgram => {

    // Append the environment-get command to the parent program
    commandProgram
        .command('crm-sync:b2c:ocapi:get')
        .requiredOption(
            config.get('cliOptions.b2cHostName.cli'),
            config.get('cliOptions.b2cHostName.description'),
            getProgramOptionDefault('b2cHostName')
        )
        .requiredOption(
            config.get('cliOptions.b2cUsername.cli'),
            config.get('cliOptions.b2cUsername.description'),
            getProgramOptionDefault('b2cUsername')
        )
        .requiredOption(
            config.get('cliOptions.b2cAccessKey.cli'),
            config.get('cliOptions.b2cAccessKey.description'),
            getProgramOptionDefault('b2cAccessKey')
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
        .description('Attempts to retrieve the OCAPI configuration for the B2C Instance using BM User ' +
            'Credentials -- defaults to the .env; can be overridden via the CLI')
        .action(async commandObj => {

            // Initialize constants
            const commandOptions = commandObj.opts();
            // Retrieve the runtime environment
            const environmentDef = cliAPI.getRuntimeEnvironment(commandOptions);
            // Generate the validation results for all dependent attributes
            const b2cConnProperties = common.getB2CConnProperties(environmentDef);

            // Initialize local variables
            let ocapiConfigResults;

            try {

                // Output the environment details
                cliUi.cliCommandBookend(commandObj._name, 'start');
                console.log(' -- Attempting to retrieve OCAPI configuration settings for the B2C Instance');
                cliUi.outputEnvironmentDef(environmentDef);

                // Were any validation errors found with the connection properties?
                if (b2cConnProperties.isValid !== true) {
                    cliUi.outputResults(undefined, config.get('errors.b2c.badEnvironment'));
                    throw new Error(config.get('errors.b2c.badEnvironment'));
                }

                // Attempt to authenticate using BM User credentials
                const resultObj = await cliAPI.b2cAuthBMUser(environmentDef);
                cliUi.outputResults(
                    [resultObj.outputDisplay],
                    undefined,
                    'cliTableConfig.b2cAuthTokenOutput');

                // Was the authToken successfully received?  If not, exit early
                if (resultObj.success === false) {
                    throw new Error('Unable to authenticate using Business Manager credentials; please try again');
                }

                // Retrieve the OCAPI config for the B2C Instance
                console.log(' -- Retrieving the OCAPI Data and Shop API configuration JSON from the B2C Instance');
                ocapiConfigResults = await cliAPI.b2cOCAPIGet(
                    environmentDef, resultObj.authToken);

                // Was an OCAPI config successfully retrieved?
                if (ocapiConfigResults.ocapiConfig.success === true) {

                    // Audit the OCAPI results to the config-dx directory


                    // Output the OCAPI global API properties
                    console.log(' -- Outputting the Global OCAPI Shop and Data configuration values');
                    cliUi.outputResults(
                        ocapiConfigResults.outputDisplay.global,
                        undefined,
                        'cliTableConfig.ocapiConfig');

                    // Were site configuration values found?
                    if (ocapiConfigResults.outputDisplay.sites.length > 0) {

                        // Output the OCAPI site-specific API properties
                        console.log(' -- Outputting the site-specific OCAPI Shop and Data configuration values');
                        cliUi.outputResults(
                            ocapiConfigResults.outputDisplay.sites,
                            undefined,
                            'cliTableConfig.ocapiConfig');

                    }

                } else {

                    // Otherwise, output the error details
                    cliUi.outputResults(
                        ocapiConfigResults.outputDisplay.global,
                        undefined,
                        'cliTableConfig.genericFault');

                }

            } catch (e) {

                cliUi.outputResults(undefined, e);

            } finally {

                cliUi.cliCommandBookend(commandObj._name, 'end');

            }

        });

    // Return the program with the appended command
    return commandProgram;

};
