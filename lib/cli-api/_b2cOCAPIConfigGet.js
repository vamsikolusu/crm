'use strict';

// Initialize local libraries
const dataAPIs = require('../../lib/apis/sfcc/ocapi/data');
const b2cRequestLib = require('../../lib/_common/request');
const auditOCAPIConfig = require('../../lib/cli-api/_common/_auditOCAPIConfig');

/**
 * @function _b2cOCAPIConfigGet
 * @description Attempts to retrieve the OCAPI Config for the configured B2C Client ID
 *
 * @param {Object} environmentDef Represents the already-validated environment details to use when performing the actions
 * @param {String} b2cAdminAuthToken Represents the B2C Commerce authToken used to perform REST API calls
 * @returns {Promise} Returns the result of the OCAPI configuration get-attempt
 */
module.exports = (environmentDef, b2cAdminAuthToken) => new Promise(async (resolve, reject) => {

    // Initialize local variables
    let output,
        baseRequest,
        ocapiConfigResults,
        siteId;

    // Initialize the output property
    output = {
        ocapiConfig: [],
        outputDisplay: {
            global: [],
            sites: []
        },
        hasGlobalData: false,
        hasGlobalShop: false,
        hasSites: {}
    };

    // Initialize the base request leveraged by this process
    baseRequest = b2cRequestLib.createRequestInstance(environmentDef);

    try {

        // Force the update to the preferenceGroup and set the customerId for the related storefront
        ocapiConfigResults = await dataAPIs.ocapiConfigGet(
            baseRequest, environmentDef, b2cAdminAuthToken
        );

        // Audit the configResults response
        output.ocapiConfig = ocapiConfigResults;

        // Was the siteResults update successful?
        if (ocapiConfigResults.success === true) {

            // Were global configuration results found?
            if (ocapiConfigResults.global.length > 0) {

                // Build out the global display for OCAPI shop / data API preferences
                output.outputDisplay.global = ocapiConfigResults.global[0].site_configs.map(ocapiConfig => {
                    return [ocapiConfig.api_type, JSON.stringify(ocapiConfig, null, 4)];
                });

            } else {

                // Build the output display and default the API contents
                output.outputDisplay.global.push(
                    ['data', '---'],
                    ['shop', '---']
                );

            }

            // Were site-specific configuration results found?
            if (Object.prototype.hasOwnProperty.call(ocapiConfigResults, 'ocapiConfigResults')) {

                // Iterate over the global results and generate the output display
                output.outputDisplay.sites = ocapiConfigResults.sites.map(ocapiConfig => {

                    // Replace the identifiers from the site_id in the OCAPI config
                    siteId = ocapiConfig.site_id.replace('Sites-', '').replace('-Site', '');

                    // Build the site-specific output display
                    return [siteId, JSON.stringify(ocapiConfig, null, 4)];

                });

            }

            // Audit the OCAPI configuration to a local file
            auditOCAPIConfig(environmentDef, ocapiConfigResults);

        } else {

            // Build the error display
            output.outputDisplay.global.push(
                ['status', ocapiConfigResults.status],
                ['errorType', ocapiConfigResults.data.fault.type],
                ['errorMessage', ocapiConfigResults.data.fault.message]
            );

        }

        // Return the processed results
        resolve(output);

    } catch (e) {

        // Reject and return the error
        reject(e);

    }

});
