'use strict';

const fs = require('fs');
const path = require('path');

// Initialize constants
const config = require('config');

// Include local libraries
const fsAPI = require('../../lib/_common/fs');
const common = require('../../lib/cli-api/_common');

// Include B2C Commerce API functions
const b2cAuthenticate = require('../apis/ci/_authenticate');
const deploymentAPI = require('../apis/ci');
const codeVersions = require('../apis/ci/code-versions');

/**
 * @function _b2cDeployCode
 * @description This function is used to deploy the code to the B2C Commerce instance.
 * environment -- leveraging SFCC-CI's API to do the work.
 *
 * @param {Object} environmentDef Represents the already-validated environment details to use when performing the actions
 * @param {String} pathScope Describes the scope for the deployment folder (sfcc vs sfsc)
 * @param {String} pathElement Describes the parent sub-folder to be processed
 * @returns {Promise} Returns the deployment result
 */
module.exports = (environmentDef, pathScope, pathElement) =>
    new Promise(async (resolve, reject) => {

        // Roll-up the validation results to a single object
        const output = {
            apiCalls: {
                authenticate: {},
                deploy: {},
                codeVersionActivate: {},
                codeVersionGet: {}
            },
            outputDisplay: {
                authenticate: {}
            }
        };

        // Ensure the zip file exists
        const archiveName = fsAPI.getDeployArchiveName(
            environmentDef, pathElement);
        const archivePath = path.join(
            fsAPI.getDeployPath(pathScope,
                pathElement),
            archiveName);

        if (!fs.existsSync(archivePath)) {
            reject(`${config.get('errors.b2c.cannotFindCodeArchive')}`);
            return;
        }

        // Authenticate first
        try {
            // Audit the authorization token for future rest requests
            output.apiCalls.authenticate.authToken = await b2cAuthenticate(environmentDef);
            output.outputDisplay.authenticate.authToken = output.apiCalls.authenticate.authToken;
        } catch (e) {
            reject(`${config.get('errors.b2c.unableToAuthenticate')}: ${e}`);
            return;
        }

        // Then deploy the archive to the B2C Commerce instance
        try {
            output.apiCalls.deploy = await deploymentAPI.deploy(
                environmentDef,
                archivePath,
                output.apiCalls.authenticate.authToken
            );
        } catch (e) {
            console.log(e);
            reject(`${config.get('errors.b2c.unableToDeployCodeArchive')}: ${e}`);
            return;
        }

        // Then activate the code version
        try {
            output.apiCalls.codeVersionActivate.activationResult = await codeVersions.activate(
                environmentDef,
                output.apiCalls.authenticate.authToken,
                output.apiCalls.deploy
            );
            output.outputDisplay.codeVersionActivate = output.apiCalls.codeVersionActivate.activationResult;
        } catch (e) {
            console.log(e);
            reject(`${config.get('errors.b2c.unableToActivateCodeVersion')}: ${e}`);
            return;
        }

        // Finally get the code version details
        try {
            const getDetailResults = await codeVersions.getDetail(
                environmentDef,
                output.apiCalls.authenticate.authToken,
                output.apiCalls.deploy
            );

            output.apiCalls.codeVersionGet.getDetailResults = common.createCodeVersionSummary([getDetailResults.data])[0];

            // Prepare the data to be displayed in the output
            output.outputDisplay.codeVersionGet = [
                output.apiCalls.codeVersionGet.getDetailResults.id,
                output.apiCalls.codeVersionGet.getDetailResults.active,
                output.apiCalls.codeVersionGet.getDetailResults.lastModificationTime,
                output.apiCalls.codeVersionGet.getDetailResults.compatibilityMode,
                output.apiCalls.codeVersionGet.getDetailResults.webDavUrl
            ];
        } catch (e) {

            reject(`${config.get('errors.b2c.unableToRetrieveCodeVersion')}`);
            return;
        }

        resolve(output);

    });
