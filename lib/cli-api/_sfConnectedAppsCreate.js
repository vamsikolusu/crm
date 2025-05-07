'use strict';

// Initialize constants
const nanoid = require('nanoid-esm');
const config = require('config');
const fs = require('fs');
const path = require('path');
const commonFs = require('../_common/fs');

// Include the helper library to retrieve the environment details
const b2cSitesVerify = require('./_b2cSitesVerify');
const createSFTemplateInstance = require('./_common/_createSFTemplateInstance');
const cleanSiteIdForConnectedApp = require('./_common/_cleanSiteIdForConnectedApp');

/**
 * @private
 * @function renderConnectedAppCredentials
 * @description Helper function to render the connectedAppCredentials template
 *
 * @param {Object} appDetails Represents the connectedAppCredential details to process
 * @param {String} instanceName Represents the instanceName for the current B2C Instance
 */
function renderConnectedAppCredentials(appDetails, instanceName) {

    // Default the base path to the dx configuration directory
    const basePath = config.get('paths.source.dx.config').toString();
    // Create the filePath to render -- and make it specific to the B2C Instance
    const filePath = path.join(basePath, instanceName + '.' + config.get('paths.connectedAppFileName').toString());
    // Stringify the contents of the file
    const fileContents = JSON.stringify(appDetails, null, 2);
    // Write the file to the config directory
    fs.writeFileSync(filePath, fileContents);

}

/**
 * @function _sfConnectedAppsCreate
 * @description Attempts to create a version of the CSP TrustedSites SFDX metadata template
 * leveraging environment data provided. Attempts to create a separate connectedApp definition for
 * each of the verified B2C Commerce storefronts configured.
 *
 * @param {Object} environmentDef Represents the already-validated environment details to use when performing the actions
 * @returns {Promise} Returns the result of the connectedApp creation activity
 */
module.exports = environmentDef => new Promise(async (resolve, reject) => {

    // Initialize local variables
    const connectedAppBasePath = `${config.get('paths.source.dx.base')}${config.get('paths.source.dx.deployPath')}`;
    const fileExtension = config.get('paths.source.dx.meta-ext').toString();
    const presetName = config.get('sfScratchOrg.syncPermSetName');
    const templateFolder = 'connectedApps/';
    let output = {};

    try {

        // Create the connectedApp folder(s)
        await commonFs.verifyAndCreateFolder(`${connectedAppBasePath}connectedApps`);

        // Only generate templates for sites that were validated
        output = await b2cSitesVerify(environmentDef);
        output.totalSites = output.siteResults.success.length;
        output.outputDisplay.siteIds = [];
        output.outputDisplay.siteTemplateResults = {};
        output.outputDisplay.connectedAppCredentials = {
            siteIds: [],
            credentials: {}
        };

        // Build out the suffix to the template file
        const templateSuffix = `template.connectedApp${fileExtension}`;

        // Build out the template path so we can read-in the template as a string
        const templatePath = path.join(config.get('paths.source.dx.templates').toString(), templateFolder, templateSuffix);

        // Read in the template file that will be customized
        const templateFileAsString = fs.readFileSync(templatePath, 'utf8');

        // Create a separate connectedApp for each B2C Commerce storefront configured
        output.siteResults.success.filter(site => site.status === 200).forEach(site => {

            // Initialize the connectedApp properties and clean-up the siteId incorporated into the connectedApp identifier
            const connectedAppId = `${environmentDef.b2cInstanceName}_${cleanSiteIdForConnectedApp(site.siteId)}_${presetName}`;
            const consumerKey = nanoid(128);
            const consumerSecret = nanoid(32);

            // Replace the template place-holders with unique values
            let templateFileInstanceAsString = templateFileAsString.toString();
            templateFileInstanceAsString = templateFileInstanceAsString.replace('{{SITEID}}', site.siteId);
            templateFileInstanceAsString = templateFileInstanceAsString.replace('{{CONSUMERKEY}}', consumerKey);
            templateFileInstanceAsString = templateFileInstanceAsString.replace('{{CONSUMERSECRET}}', consumerSecret);

            // Create the destination file's filename and suffix; personalized with the B2C Instance Name
            // Create and write the template instance in question
            const fileSuffix = `${connectedAppId}.connectedApp${fileExtension}`;
            const filePath = createSFTemplateInstance(templateFolder, fileSuffix, templateFileInstanceAsString);

            // Audit the template site and siteResults
            output.outputDisplay.siteIds.push(site.siteId);

            // Audit the connectedApp template results
            output.outputDisplay.siteTemplateResults[site.siteId] = {
                success: true,
                filePath: filePath,
                fileContents: templateFileInstanceAsString
            };

            // Default the object managing connectedApp details
            output.outputDisplay.connectedAppCredentials.siteIds.push(site.siteId);

            // Audit the connected app credential details
            output.outputDisplay.connectedAppCredentials.credentials[site.siteId] = {
                appId: connectedAppId,
                consumerKey: consumerKey,
                consumerSecret: consumerSecret
            };

        });

        // Default the output properties
        output.success = true;

        // Render the connectedApp configuration.json
        renderConnectedAppCredentials(output.outputDisplay.connectedAppCredentials, environmentDef.b2cInstanceName);

        // If so, carry it forward as such
        resolve(output);

    } catch (e) {

        // Audit the error
        output.success = false;
        output.error = e;
        output.stack = e.stack;

        // Reject the error
        reject(output);

    }

});
