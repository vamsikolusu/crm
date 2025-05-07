'use strict';

// Initialize constants
const config = require('config');

// Initialize the assertion library
const assert = require('chai').assert;

// Initialize the B2C Commerce REST APIs
const b2cCustomerListAPIs = require('../../../lib/qa/processes/_common/sfdc/b2cCustomerList');

// Initialize tearDown helpers
const useCaseProcesses = require('../../_common/processes');
const common = require('../_common');

// Initialize local libraries for SFDC
const flowAPIs = require('../../../lib/qa/processes/_common/sfdc/flow');
const sObjectAPIs = require('../../../lib/apis/sfdc/sObject');

// Initialize local libraries
const getRuntimeEnvironment = require('../../../lib/cli-api/_getRuntimeEnvironment');

describe('Progressive resolution of a B2C Commerce Customer error scenarios via the B2CContactProcess API', function () {

    // Establish a thirty-second time-out or multi-cloud unit tests
    // noinspection JSAccessibilityCheck
    this.timeout(config.get('unitTests.testData.describeTimeout'));

    // Configure the total number of retries supported per test
    // noinspection JSAccessibilityCheck
    this.retries(config.get('unitTests.testData.testRetryCount'));

    // Initialize local variables
    let environmentDef,
        disablePurge,
        initResults,
        testProfile,
        testContact,
        testEmail,
        customerListId,
        customerListIdAlt,
        siteId,
        b2cAdminAuthToken,
        sfdcAuthCredentials,
        syncGlobalEnable,
        sleepTimeout,
        purgeSleepTimeout;

    // Attempt to register the B2C Commerce Customer
    // noinspection DuplicatedCode
    before(async function () {

        // Retrieve the runtime environment
        environmentDef = getRuntimeEnvironment();

        // Default the disable purge property
        disablePurge = config.get('unitTests.testData.disablePurge');

        // Default the sleepTimeout to enforce in unit-tests
        sleepTimeout = config.get('unitTests.testData.sleepTimeout');
        purgeSleepTimeout = sleepTimeout / 2;

        // Retrieve the site and customerList used to testing
        customerListId = config.get('unitTests.testData.b2cCustomerList').toString();
        customerListIdAlt = config.get('unitTests.testData.b2cSiteCustomerLists.RefArchGlobal');
        siteId = config.util.toObject(config.get('unitTests.testData.b2cSiteCustomerLists'))[customerListId];

        // Retrieve a random email to leverage
        testEmail = common.getEmailForTestProfile();

        // Retrieve the b2c customer profile template that we'll use to exercise this test
        testProfile = config.util.toObject(config.get('unitTests.testData.profileTemplate'));

        // Update the email address with a random email
        testProfile.customer.email = testEmail;
        testProfile.customer.login = testEmail;

        // Initialize the testContact
        testContact = {
            Email: testProfile.customer.email,
            LastName: testProfile.customer.last_name
        };

        // Default the sync-configuration to leverage; sync-on-login and sync-once are enabled
        syncGlobalEnable = config.get('unitTests.b2cCRMSyncConfigManager.base');

        try {

            // Initialize the use-case test scenario (setup authTokens and purge legacy test-data)
            initResults = await useCaseProcesses.initUseCaseTests(environmentDef, siteId);

            // Shorthand the B2C administrative authToken
            b2cAdminAuthToken = initResults.multiCloudInitResults.b2cAdminAuthToken;

            // Audit the authorization token for future rest requests
            sfdcAuthCredentials = initResults.multiCloudInitResults.sfdcAuthCredentials;

            // Attempt to remove any stray and domain-specific customer records from B2C Commerce and the Salesforce Platform
            await useCaseProcesses.b2cCRMSyncCustomersPurgeManager(disablePurge, purgeSleepTimeout, b2cAdminAuthToken, sfdcAuthCredentials);

        } catch (e) {

            // Audit the error if one is thrown
            throw new Error(e);

        }

    });

    // Reset the output variable in-between tests
    beforeEach(async function () {

        // Attempt to remove any stray and domain-specific customer records from B2C Commerce and the Salesforce Platform
        await useCaseProcesses.b2cCRMSyncCustomersPurgeManager(disablePurge, purgeSleepTimeout, b2cAdminAuthToken, sfdcAuthCredentials);

    });

    //----------------------------------------------------------------
    // Error validation scenarios (enforce validation business rules in Flow)
    //----------------------------------------------------------------

    it('returns an error if non-identifiers are used without a B2C CustomerList for resolution via the B2CContactProcess service', async function () {

        // Initialize the output scope
        let output,
            customerListErrorMessage,
            sourceContact,
            resolveBody;

        // Default the expected customerList error message
        customerListErrorMessage = 'A B2C Commerce CustomerList ID is required for Contact Resolution with non Salesforce Platform identifiers.  Please include a B2C CustomerList ID and try again.';

        // Create the initial Contact footprint
        sourceContact = {
            LastName: testContact.LastName,
            Email: testContact.Email
        };

        // Create the object to be included in the services body
        resolveBody = _getB2CContactProcessBody(sourceContact);

        // Execute the process flow-request and examine the results
        output = await flowAPIs.postB2CContactProcess(environmentDef, sfdcAuthCredentials.conn.accessToken, resolveBody);

        // Attempt to validate the processing-result
        _validateB2CProcessResultIsError(output);

        // Verify that the specific errorMessage we're testing for is included in the errors collection
        assert.includeMembers(output.data[0].outputValues.errors, [customerListErrorMessage], '-- expected the errors to contain the B2C CustomerList error message');

    });

    it('returns an error if an invalid or unknown B2C CustomerList is included in the request', async function () {

        // Initialize the output scope
        let output,
            customerListErrorMessage,
            sourceContact,
            resolveBody;

        // Default the expected customerList error message
        customerListErrorMessage = 'Unable to verify the B2C CustomerList.  Please check the properties of the sourceContact -- and try again.';

        // Create the initial Contact footprint
        sourceContact = {
            LastName: testContact.LastName,
            Email: testContact.Email,
            B2C_CustomerList_ID__c: 'invalidCustomerListID'
        };

        // Create the object to be included in the services body
        resolveBody = _getB2CContactProcessBody(sourceContact);

        // Execute the process flow-request and examine the results
        output = await flowAPIs.postB2CContactProcess(environmentDef, sfdcAuthCredentials.conn.accessToken, resolveBody);

        // Attempt to validate the processing-result
        _validateB2CProcessResultIsError(output);

        // Verify that the specific errorMessage we're testing for is included in the errors collection
        assert.includeMembers(output.data[0].outputValues.errors, [customerListErrorMessage], '-- expected the errors to contain the B2C CustomerList error message');

    });

    it('returns an error if an invalid or unknown ContactID is included in the request', async function () {

        // Initialize the output scope
        let output,
            customerListErrorMessage,
            sourceContact,
            resolveBody;

        // Default the expected customerList error message
        customerListErrorMessage = 'No Contact was found with the ContactID specified in this request; please verify the Id value and try again.';

        // Create the initial Contact footprint
        sourceContact = {
            LastName: testContact.LastName,
            Email: testContact.Email,
            Id: '0018A00000dIEGyQAO'
        };

        // Create the object to be included in the services body
        resolveBody = _getB2CContactProcessBody(sourceContact);

        // Execute the process flow-request and examine the results
        output = await flowAPIs.postB2CContactProcess(environmentDef, sfdcAuthCredentials.conn.accessToken, resolveBody);

        // Attempt to validate the processing-result
        _validateB2CProcessResultIsError(output);

        // Verify that the specific errorMessage we're testing for is included in the errors collection
        assert.includeMembers(output.data[0].outputValues.errors, [customerListErrorMessage], '-- expected the errors to contain the B2C CustomerList error message');

    });

    it('returns an error if an invalid AccountID is provided with the specified ContactID', async function () {

        // Initialize the output scope
        let output,
            customerListErrorMessage,
            sourceContact,
            resolveBody;

        // Default the output
        output = {};

        // First, attempt to create the account / contact relationship
        output.createResult = await _createAccountContactRelationship(
            sfdcAuthCredentials, environmentDef, testContact);

        // Default the expected customerList error message
        customerListErrorMessage = 'The AccountID provided is not associated to the specific Contact.  Please verify this relationship -- and try again.';

        // Create the initial Contact footprint
        sourceContact = {
            LastName: testContact.LastName,
            Email: testContact.Email,
            Id: output.createResult.contactId,
            AccountId: '0018A00000dIEInQAO'
        };

        // Create the object to be included in the services body
        resolveBody = _getB2CContactProcessBody(sourceContact);

        // Execute the process flow-request and examine the results
        output = await flowAPIs.postB2CContactProcess(environmentDef, sfdcAuthCredentials.conn.accessToken, resolveBody);

        // Attempt to validate the processing-result
        _validateB2CProcessResultIsError(output);

        // Verify that the specific errorMessage we're testing for is included in the errors collection
        assert.includeMembers(output.data[0].outputValues.errors, [customerListErrorMessage], '-- expected the errors to contain the B2C CustomerList error message');

    });

    it('returns an error if a valid ContactID / AccountID pair are provided without a valid B2C CustomerList ID', async function () {

        // Initialize the output scope
        let output,
            customerListErrorMessage,
            sourceContact,
            resolveBody;

        // Default the output
        output = {};

        // First, attempt to create the account / contact relationship
        output.createResult = await _createAccountContactRelationship(
            sfdcAuthCredentials, environmentDef, testContact);

        // Default the expected customerList error message
        customerListErrorMessage = 'Only Contacts with a B2C CustomerList can be processed.  Please provide a B2C CustomerList value -- and try again.';

        // Create the initial Contact footprint
        sourceContact = {
            LastName: testContact.LastName,
            Email: testContact.Email,
            Id: output.createResult.contactId,
            AccountId: output.createResult.accountId
        };

        // Create the object to be included in the services body
        resolveBody = _getB2CContactProcessBody(sourceContact);

        // Execute the process flow-request and examine the results
        output = await flowAPIs.postB2CContactProcess(environmentDef, sfdcAuthCredentials.conn.accessToken, resolveBody);

        // Attempt to validate the processing-result
        _validateB2CProcessResultIsError(output);

        // Verify that the specific errorMessage we're testing for is included in the errors collection
        assert.includeMembers(output.data[0].outputValues.errors, [customerListErrorMessage], '-- expected the errors to contain the B2C CustomerList error message');

    });

    it('returns an error if the B2C CustomerList associated to a validated Contact is inActive', async function () {

        // Initialize the output scope
        let output,
            customerListErrorMessage,
            sourceContact,
            resolveBody;

        // Default the output
        output = {};

        // Update the testContact with a valid customerList
        testContact.B2C_CustomerList_ID__c = customerListId;

        // First, attempt to create the account / contact relationship
        output.createResult = await _createAccountContactRelationship(
            sfdcAuthCredentials, environmentDef, testContact);

        // Update the B2C CustomerList and deactivate the B2C CustomerList
        output.b2cCustomerListDeactivateResult = await useCaseProcesses.sfdcB2CCustomerListUpdate(
            sfdcAuthCredentials.conn, customerListId, false);

        // Create the initial Contact footprint
        sourceContact = {
            LastName: testContact.LastName,
            Email: testContact.Email,
            B2C_CustomerList_ID__c: customerListId,
            Id: output.createResult.contactId,
            AccountId: output.createResult.accountId
        };

        // Default the expected customerList error message
        customerListErrorMessage = 'B2C Commerce Integration is disabled for this B2C Instance, B2C CustomerList, or Contact.  Please check the Salesforce configuration -- and try again.';

        // Create the object to be included in the services body
        resolveBody = _getB2CContactProcessBody(sourceContact);

        // Execute the process flow-request and examine the results
        output.b2cContactProcessResults = await flowAPIs.postB2CContactProcess(environmentDef, sfdcAuthCredentials.conn.accessToken, resolveBody);

        // Attempt to validate the processing-result
        _validateB2CProcessResultIsError(output.b2cContactProcessResults);

        // Verify that the specific errorMessage we're testing for is included in the errors collection
        assert.includeMembers(output.b2cContactProcessResults.data[0].outputValues.errors, [customerListErrorMessage], '-- expected the errors to contain the B2C CustomerList error message');

    });

    it('returns an error if the parent B2C Instance to a validated Contact is inActive', async function () {

        // Initialize the output scope
        let output,
            customerListErrorMessage,
            sourceContact,
            resolveBody;

        // Default the output
        output = {};

        // Update the testContact with a valid customerList
        testContact.B2C_CustomerList_ID__c = customerListId;

        // First, attempt to create the account / contact relationship
        output.createResult = await _createAccountContactRelationship(
            sfdcAuthCredentials, environmentDef, testContact);

        // First, retrieve the customerList definition using the id / name provided
        output.customerListGet = await b2cCustomerListAPIs.getByName(
            sfdcAuthCredentials.conn, customerListId);

        // Deactivate the parent B2C Instance for this customerList
        await useCaseProcesses.sfdcB2CInstanceUpdate(
            sfdcAuthCredentials.conn, output.customerListGet[0].B2C_Instance__c, false);

        // Create the initial Contact footprint
        sourceContact = {
            LastName: testContact.LastName,
            Email: testContact.Email,
            B2C_CustomerList_ID__c: customerListId,
            Id: output.createResult.contactId,
            AccountId: output.createResult.accountId
        };

        // Default the expected customerList error message
        customerListErrorMessage = 'B2C Commerce Integration is disabled for this B2C Instance, B2C CustomerList, or Contact.  Please check the Salesforce configuration -- and try again.';

        // Create the object to be included in the services body
        resolveBody = _getB2CContactProcessBody(sourceContact);

        // Execute the process flow-request and examine the results
        output.b2cContactProcessResults = await flowAPIs.postB2CContactProcess(environmentDef, sfdcAuthCredentials.conn.accessToken, resolveBody);

        // Deactivate the parent B2C Instance for this customerList
        await useCaseProcesses.sfdcB2CInstanceUpdate(
            sfdcAuthCredentials.conn, output.customerListGet[0].B2C_Instance__c, true);

        // Attempt to validate the processing-result
        _validateB2CProcessResultIsError(output.b2cContactProcessResults);

        // Verify that the specific errorMessage we're testing for is included in the errors collection
        assert.includeMembers(output.b2cContactProcessResults.data[0].outputValues.errors, [customerListErrorMessage], '-- expected the errors to contain the B2C CustomerList error message');

    });

    it('returns an error if a validated Contact has integration disabled', async function () {

        // Initialize the output scope
        let output,
            customerListErrorMessage,
            sourceContact,
            resolveBody;

        // Default the output
        output = {};

        // Update the testContact with a valid customerList
        testContact.B2C_CustomerList_ID__c = customerListId;

        // First, attempt to create the account / contact relationship
        output.createResult = await _createAccountContactRelationship(
            sfdcAuthCredentials, environmentDef, testContact);

        // Disable integration for this Contact record
        output.contactDisableIntegrationResult = await sObjectAPIs.update(
            sfdcAuthCredentials.conn, 'Contact', {
                Id: output.createResult.contactId,
                B2C_Disable_Integration__c: true
            });

        // Create the initial Contact footprint
        sourceContact = {
            LastName: testContact.LastName,
            Email: testContact.Email,
            B2C_CustomerList_ID__c: customerListId,
            Id: output.createResult.contactId,
            AccountId: output.createResult.accountId
        };

        // Default the expected customerList error message
        customerListErrorMessage = 'B2C Commerce Integration is disabled for this B2C Instance, B2C CustomerList, or Contact.  Please check the Salesforce configuration -- and try again.';

        // Create the object to be included in the services body
        resolveBody = _getB2CContactProcessBody(sourceContact);

        // Execute the process flow-request and examine the results
        output.b2cContactProcessResults = await flowAPIs.postB2CContactProcess(environmentDef, sfdcAuthCredentials.conn.accessToken, resolveBody);

        // Attempt to validate the processing-result
        _validateB2CProcessResultIsError(output.b2cContactProcessResults);

        // Verify that the specific errorMessage we're testing for is included in the errors collection
        assert.includeMembers(output.b2cContactProcessResults.data[0].outputValues.errors, [customerListErrorMessage], '-- expected the errors to contain the B2C CustomerList error message');

    });

    // Reset the output variable in-between tests
    afterEach(async function () {

        // Attempt to remove any stray and domain-specific customer records from B2C Commerce and the Salesforce Platform
        await useCaseProcesses.b2cCRMSyncCustomersPurgeManager(disablePurge, purgeSleepTimeout, b2cAdminAuthToken, sfdcAuthCredentials);

        // Update the B2C CustomerList and activate the B2C CustomerList
        await useCaseProcesses.sfdcB2CCustomerListUpdate(sfdcAuthCredentials.conn, customerListId, true);
        await useCaseProcesses.sfdcB2CCustomerListUpdate(sfdcAuthCredentials.conn, customerListIdAlt, true);

    });

    // Reset the output variable in-between tests
    after(async function () {

        // Next, ensure that b2c-crm-sync is enabled in the specified environment
        await useCaseProcesses.b2cCRMSyncConfigManager(environmentDef, b2cAdminAuthToken, siteId, syncGlobalEnable);

    });

});

/**
 * @private
 * @function _getB2CContactProcessBody
 * @description Helper function to build out the B2CContactProcess REST API Body object.
 *
 * @param sourceContact {Object} Represents the sourceContact being submitted to the flow-service
 * @return {Object} Returns the service object-representation for processing
 */
function _getB2CContactProcessBody(sourceContact) {

    // Return the object structure expected by the service
    return {
        inputs: [{
            sourceContact: sourceContact
        }]
    };

}

/**
 * @private
 * @function _validateB2CProcessResultIsError
 * @description Helper function that conducts generic validation against the processing
 * results produced from calling the B2CContactProcess service.  This specific method tests
 * if an error was included in the processing results.
 *
 * @param processResults {Object} Represents the processing results returned by the service-call
 */
function _validateB2CProcessResultIsError(processResults) {

    // Initialize local variables
    let processResult;

    // Shorthand a reference to the response data
    processResult = processResults.data[0];

    // Validate that the REST response is well-formed and returns what was expected
    assert.equal(processResults.status, 200, ' -- expected a 200 status code from the Salesforce Platform');
    assert.isObject(processResult.outputValues, ' -- expected the outputValues property to exist on the output object');
    assert.isArray(processResult.outputValues.errors, ' -- expected the errors collection to contain at least one value');
    assert.isFalse(processResult.outputValues.isSuccess, ' -- expected the resolution process to fail because a B2C CustomerList ID was not present');
    assert.equal(processResult.outputValues.Flow__InterviewStatus, 'Finished', ' -- expected the Flow_InterviewStatus to have a value of Finished.');

}

/**
 * @private
 * @function _createAccountContactRelationship
 * @description Helper function to stand-up an Account / Contact record for the purpose of testing.  Use
 * this method to create these records when we need existing data created through external sources.
 *
 * @param sfdcAuthCredentials {Object} Represents the Salesforce Platform authentication credentials to leverage
 * @param environmentDef {Object} Represents the environment definition to leverage and infer the accountType from
 * @param contactObject {Object} Represents the contactObject to create
 */
async function _createAccountContactRelationship(sfdcAuthCredentials, environmentDef, contactObject) {

    let accountName,
        output;

    // Default the accountName to leverage
    accountName = config.get('unitTests.testData.defaultAccountName');

    // Execute the pre-test logic to seed the expected test data
    output = await useCaseProcesses.sfdcAccountContactCreate(sfdcAuthCredentials, contactObject, accountName, environmentDef.sfScratchOrgProfile);

    // Return the output variable
    return output;

}

