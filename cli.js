'use strict';

//----------------------------------------------
// Imports & Initialization
//----------------------------------------------
import config from 'config';
import { Command } from 'commander';
import dotenv from 'dotenv';
import * as cliInterface from './lib/cli-interface.js';

// Load environment variables
dotenv.config();

// Retrieve project version safely
let projectVersionNo;
try {
    projectVersionNo = config.get('versionNo').toString();
} catch (err) {
    console.error('⚠️  Missing versionNo in config. Defaulting to 1.0.0');
    projectVersionNo = '1.0.0';
}

// Initialize CLI program
const program = new Command();
program.version(projectVersionNo);

//----------------------------------------------
// Helper: Attach CLI Commands in Bulk
//----------------------------------------------
function attachCommands(commandList = []) {
    commandList.forEach(cmd => {
        if (typeof cliInterface[cmd] === 'function') {
            cliInterface[cmd](program);
        } else {
            console.warn(`⚠️  Skipping unknown command: ${cmd}`);
        }
    });
}

//----------------------------------------------
// Environment Commands
//----------------------------------------------
attachCommands([
    'getEnvironment'
]);

//----------------------------------------------
// B2C Commerce Commands
//----------------------------------------------
attachCommands([
    'b2cGetEnvironment',
    'b2cVerifySites',
    'b2cCodeVersionsList',
    'b2cCodeVersionVerify',
    'b2cCodeVersionActivate',
    'b2cCodeVersionToggle',
    'b2cVerify',
    'b2cAuthClientCredentials',
    'b2cAuthBMUser',
    'b2cAuthJWT',
    'b2cOCAPIGet',
    'b2cDeploySetup',
    'b2cDeployCodeReset',
    'b2cDeployDataReset',
    'b2cDeployData',
    'b2cDeployCode',
    'b2cCodeZip',
    'b2cDataZip',
    'b2cSitePrefsActivate',
    'b2cSitesCartridgesRemove',
    'b2cSitesCartridgesAdd',
    'b2cServicesCreate',
    'b2cOOBOPasswordDisplay',
    'b2cOOBOCustomersCreate',
    'b2cOOBOCustomersDelete',
    'b2cOOBOCustomersVerify',
    'b2cBuild'
]);

//----------------------------------------------
// Salesforce DX Commands
//----------------------------------------------
attachCommands([
    'sfCertPublicKeyGet',
    'sfGetEnvironment',
    'sfGetScratchOrgEnvironment',
    'sfConnectedAppsCreate',
    'sfDuplicateRulesCreate',
    'sfTrustedSitesCreate',
    'sfRemoteSitesCreate',
    'sfNamedCredentialsOOBOCreate',
    'sfTemplateSetup',
    'sfAuthenticateUserCredentials',
    'sfScratchOrgCreate',
    'sfScratchOrgBuild',
    'sfOrgDeploy',
    'sfOrgDetails',
    'sfOrgOpen',
    'sfUserDetails',
    'sfB2CInstanceSetup',
    'sfB2CClientIDSetup'
]);

//----------------------------------------------
// Parse CLI Arguments
//----------------------------------------------
if (process.argv.length <= 2) {
    program.help(); // Show help if no command provided
}

program.parse(process.argv);
