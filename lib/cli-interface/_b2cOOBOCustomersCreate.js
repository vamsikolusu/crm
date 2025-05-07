/* eslint-disable no-underscore-dangle */
// noinspection ExceptionCaughtLocallyJS,JSUnusedLocalSymbols

'use strict';

// Initialize module dependencies
const config = require('config');
// eslint-disable-next-line no-unused-vars
const colors = require('colors');

// Initialize the CLI api
const cliAPI = require('../../lib/cli-api/');

// Initialize local libraries
const cliUi = require('../../lib/cli-interface/ui');
const common = require('../../lib/cli-api/_common');

// Retrieve the helper function that calculates the default program option value
const getProgramOptionDefault = require('../../lib/cli-api/_common/_getProgramOptionDefault');

/**
 * @function OOBOCustomerCreate
 * @description This function is used to create the anonymous B2C Commerce Customer that is used
 * specifically for OOBO scenarios.
 *
 * @param {Object} commandProgram Represents the CLI program to which the getEnvironment command is appended
 * @return {Object} Returns the updated commandProgram -- including the command that was just attached
 */
module.exports = commandProgram => {

    // Append the environment-get command to the parent program
    commandProgram
        .command('crm-sync:oobo:customers:create')
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
        .requiredOption(
            config.get('cliOptions.sfHostName.cli'),
            config.get('cliOptions.sfHostName.description'),
            getProgramOptionDefault('sfHostName')
        )
        .requiredOption(
            config.get('cliOptions.sfLoginUrl.cli'),
            config.get('cliOptions.sfLoginUrl.description'),
            getProgramOptionDefault('sfLoginUrl')
        )
        .requiredOption(
            config.get('cliOptions.sfUsername.cli'),
            config.get('cliOptions.sfUsername.description'),
            getProgramOptionDefault('sfUsername')
        )
        .requiredOption(
            config.get('cliOptions.sfPassword.cli'),
            config.get('cliOptions.sfPassword.description'),
            getProgramOptionDefault('sfPassword')
        )
        .requiredOption(
            config.get('cliOptions.sfSecurityToken.cli'),
            config.get('cliOptions.sfSecurityToken.description'),
            getProgramOptionDefault('sfSecurityToken')
        )
        .description('Register and capture the OOBO user details for each configured storefront -- defaults ' +
            'to the storefronts defined in the .env; can be overridden via the CLI')
        .action(async commandObj => {

            // Initialize the command options
            const commandOptions = commandObj.opts();

            // Retrieve the runtime environment
            const environmentDef = cliAPI.getRuntimeEnvironment(commandOptions);
            const b2cConnProperties = common.getB2CConnProperties(environmentDef);

            // Initialize local variables
            let resultObj,
                customerResults,
                sitePreferenceResults;

            try {

                // Open the output display
                cliUi.cliCommandBookend(
                    commandObj._name,
                    'start',
                    'Attempting to register the OOBO Customer Profiles for each storefront',
                    environmentDef);

                // Were any validation errors found with the connection properties?
                cliUi.validateConnectionProperties(
                    b2cConnProperties,
                    config.get('errors.b2c.badEnvironment'));

                // Retrieve and output the results of the verification process
                resultObj = await cliAPI.verifyB2CSites(commandOptions);

                // Render the authentication details from site validation
                cliUi.outputResults(
                    [resultObj.outputDisplay.authenticate],
                    undefined,
                    'cliTableConfig.b2cAuthTokenOutput');

                // Output the validation results for the site collection (failure)
                if (resultObj.outputDisplay.verifySites.error.length > 0) {

                    // Render the site verification details for error sites
                    console.log(' -- Failed to verify the following B2C Commerce Storefronts');
                    cliUi.outputResults(
                        resultObj.outputDisplay.verifySites.error,
                        undefined,
                        'cliTableConfig.siteErrors');

                }

                // Output the validation results for the site collection (success)
                if (resultObj.outputDisplay.verifySites.success.length > 0) {

                    // Render the site verification details for success sites
                    console.log(' -- Successfully verified the following B2C Commerce Storefronts');
                    cliUi.outputResults(
                        resultObj.outputDisplay.verifySites.success,
                        undefined,
                        'cliTableConfig.siteOutput');

                    // Verify the existence of or create the OOBO Customers in B2C Commerce
                    console.log(' -- Verifying / creating the OOBO Anonymous Customer records for these B2C Storefronts');
                    customerResults = await cliAPI.b2cOOBOCustomersCreate(
                        environmentDef, resultObj.siteResults.success);

                    // Output the validationResults for each related customerList
                    for (let thisResult of customerResults) {

                        // Provide context about the customerProfile
                        if (thisResult.exists === true) {
                            console.log(' -- Verified that the following OOBO Anonymous Customer record exists; did ' +
                                'not create a new customerProfile');
                        } else {
                            console.log(' -- Could not verify the existence of an OOBO Anonymous Customer record; ' +
                                'Creating a new customerProfile');
                        }

                        // Output the validation and customer creation-results for each customerList
                        cliUi.outputResults(
                            thisResult.outputDisplay.customerGet,
                            undefined,
                            'cliTableConfig.customerDetails');

                        // Were we unable to verify the SFDC customer records?
                        if (thisResult.unableToVerifySFDC === true) {
                            console.log(' -- WARNING! Unable to verify the existence of the corresponding SFDC ' +
                                'B2C Customer Profile'.bold.red);
                            console.log(' -- Please consider deleting via crm-sync:oobo:customers:delete and ' +
                                're-create these relationships'.bold.red);
                        }

                        // Iterate over these customers and update the B2C Site definitions with the OOBO customers
                        await cliAPI.sfOOBOB2CSitesUpdate(
                            environmentDef, thisResult.profile);

                    }

                    // Take the collection of siteResults and the customerResults -- and update the customerId site preference
                    console.log(' -- Verifying / updating the OOBO Anonymous Customer customerId values to ' +
                        'sitePreferences for these sites');
                    sitePreferenceResults = await cliAPI.b2cOOBOSitePrefsUpdate(
                        environmentDef,
                        resultObj.outputDisplay.authenticate.authToken,
                        resultObj.siteResults.success,
                        customerResults);

                    // Output the sitePreference update results
                    for (let thisResult of sitePreferenceResults.outputDisplay) {

                        // Output the validation and customer creation-results for each customerList
                        cliUi.outputResults(
                            thisResult,
                            undefined,
                            'cliTableConfig.sitePreferenceDetails');

                    }

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
