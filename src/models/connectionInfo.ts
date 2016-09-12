'use strict';
import Constants = require('./constants');
import Interfaces = require('./interfaces');
const figures = require('figures');
import * as symbols from '../utils/symbol';
import * as Utils from './utils';

/**
 * Sets sensible defaults for key connection properties, especially
 * if connection to Azure
 *
 * @export connectionInfo/fixupConnectionCredentials
 * @param {Interfaces.IConnectionCredentials} connCreds connection to be fixed up
 * @returns {Interfaces.IConnectionCredentials} the updated connection
 */
export function fixupConnectionCredentials(connCreds: Interfaces.IConnectionCredentials): Interfaces.IConnectionCredentials {
    if (!connCreds.server) {
        connCreds.server = '';
    }

    if (!connCreds.database) {
        connCreds.database = '';
    }

    if (!connCreds.user) {
        connCreds.user = '';
    }

    if (!connCreds.password) {
        connCreds.password = '';
    }

    if (!connCreds.connectTimeout) {
        connCreds.connectTimeout = Constants.defaultConnectionTimeout;
    }

    // default value for encrypt
    if (!connCreds.encrypt) {
        connCreds.encrypt = false;
    }

    // default value for appName
    if (!connCreds.applicationName) {
        connCreds.applicationName = Constants.extensionName;
    }

    if (isAzureDatabase(connCreds.server)) {
        // always encrypt connection if connecting to Azure SQL
        connCreds.encrypt = true;

        // Ensure minumum connection timeout if connecting to Azure SQL
        if (connCreds.connectTimeout < Constants.azureSqlDbConnectionTimeout) {
            connCreds.connectTimeout = Constants.azureSqlDbConnectionTimeout;
        }
    }
    return connCreds;
}

// return true if server name ends with '.database.windows.net'
function isAzureDatabase(server: string): boolean {
    return (server ? server.endsWith(Constants.sqlDbPrefix) : false);
}

/**
 * Gets a label describing a connection in the picklist UI
 *
 * @export connectionInfo/getPicklistLabel
 * @param {Interfaces.IConnectionCredentials} connCreds connection to create a label for
 * @param {Interfaces.CredentialsQuickPickItemType} itemType type of quickpick item to display - this influences the icon shown to the user
 * @returns {string} user readable label
 */
export function getPicklistLabel(connCreds: Interfaces.IConnectionCredentials, itemType: Interfaces.CredentialsQuickPickItemType): string {
    let profile: Interfaces.IConnectionProfile = <Interfaces.IConnectionProfile> connCreds;

    let icon: string = itemType === Interfaces.CredentialsQuickPickItemType.Mru ? figures.play : symbols.star;

    if (profile.profileName) {
        return `${icon} ${profile.profileName}`;
    } else {
        return `${icon} ${connCreds.server}`;
    }
}

/**
 * Gets a description for a connection to display in the picklist UI
 *
 * @export connectionInfo/getPicklistDescription
 * @param {Interfaces.IConnectionCredentials} connCreds connection
 * @returns {string} description
 */
export function getPicklistDescription(connCreds: Interfaces.IConnectionCredentials): string {
    let desc: string = `[${getConnectionDisplayString(connCreds)}]`;
    return desc;
}

/**
 * Gets detailed information about a connection, which can be displayed in the picklist UI
 *
 * @export connectionInfo/getPicklistDetails
 * @param {Interfaces.IConnectionCredentials} connCreds connection
 * @returns {string} details
 */
export function getPicklistDetails(connCreds: Interfaces.IConnectionCredentials): string {
    // In the current spec this is left empty intentionally. Leaving the method as this may change in the future
    return undefined;
}

/**
 * Gets a display string for a connection. This is a concise version of the connection
 * information that can be shown in a number of different UI locations
 *
 * @export connectionInfo/getConnectionDisplayString
 * @param {Interfaces.IConnectionCredentials} conn connection
 * @returns {string} display string that can be used in status view or other locations
 */
export function getConnectionDisplayString(creds: Interfaces.IConnectionCredentials): string {
    // Update the connection text
    let text: string = creds.server;
    if (creds.database !== '') {
        text = appendIfNotEmpty(text, creds.database);
    } else {
        text = appendIfNotEmpty(text, Constants.defaultDatabaseLabel);
    }
    let user: string = getUserNameOrDomainLogin(creds);
    text = appendIfNotEmpty(text, user);
    return text;
}

function appendIfNotEmpty(connectionText: string, value: string): string {
    if (Utils.isNotEmpty(value)) {
        connectionText += ` : ${value}`;
    }
    return connectionText;
}

/**
 * Gets a formatted display version of a username, or the domain user if using Integrated authentication
 *
 * @export connectionInfo/getUserNameOrDomainLogin
 * @param {Interfaces.IConnectionCredentials} conn connection
 * @param {string} [defaultValue] optional default value to use if username is empty and this is not an Integrated auth profile
 * @returns {string}
 */
export function getUserNameOrDomainLogin(creds: Interfaces.IConnectionCredentials, defaultValue?: string): string {
    if (!defaultValue) {
        defaultValue = '';
    }

    if (creds.authenticationType === Interfaces.AuthenticationTypes[Interfaces.AuthenticationTypes.Integrated]) {
        return (process.platform === 'win32') ? process.env.USERDOMAIN + '\\' + process.env.USERNAME : '';
    } else {
        return creds.user ? creds.user : defaultValue;
    }
}

function addTooltipItem(creds: Interfaces.IConnectionCredentials, property: string): string {
    let value: any = creds[property];
    if (typeof value === 'undefined') {
        return '';
    } else if (typeof value === 'boolean') {
        return property + ': ' + (value ? 'true' : 'false') + '\r\n';
    } else {
        return property + ': ' + value + '\r\n';
    }
}

/**
 * Gets a detailed tooltip with information about a connection
 *
 * @export connectionInfo/getTooltip
 * @param {Interfaces.IConnectionCredentials} connCreds connection
 * @returns {string} tooltip
 */
export function getTooltip(connCreds: Interfaces.IConnectionCredentials): string {
    let tooltip: string =
           'server: ' + connCreds.server + '\r\n' +
           'database: ' + (connCreds.database ? connCreds.database : '<connection default>') + '\r\n' +
           'username: ' + connCreds.user + '\r\n' +
           'encrypt connection: ' + (connCreds.encrypt ? 'true' : 'false') + '\r\n' +
           'connection timeout: ' + connCreds.connectTimeout + ' s\r\n';

    tooltip += addTooltipItem(connCreds, 'port');
    tooltip += addTooltipItem(connCreds, 'applicationName');
    tooltip += addTooltipItem(connCreds, 'applicationIntent');
    tooltip += addTooltipItem(connCreds, 'attachDbFilename');
    tooltip += addTooltipItem(connCreds, 'authenticationType');
    tooltip += addTooltipItem(connCreds, 'connectRetryCount');
    tooltip += addTooltipItem(connCreds, 'connectRetryInterval');
    tooltip += addTooltipItem(connCreds, 'currentLanguage');
    tooltip += addTooltipItem(connCreds, 'failoverPartner');
    tooltip += addTooltipItem(connCreds, 'loadBalanceTimeout');
    tooltip += addTooltipItem(connCreds, 'maxPoolSize');
    tooltip += addTooltipItem(connCreds, 'minPoolSize');
    tooltip += addTooltipItem(connCreds, 'multipleActiveResultSets');
    tooltip += addTooltipItem(connCreds, 'multiSubnetFailover');
    tooltip += addTooltipItem(connCreds, 'packetSize');
    tooltip += addTooltipItem(connCreds, 'persistSecurityInfo');
    tooltip += addTooltipItem(connCreds, 'pooling');
    tooltip += addTooltipItem(connCreds, 'replication');
    tooltip += addTooltipItem(connCreds, 'trustServerCertificate');
    tooltip += addTooltipItem(connCreds, 'typeSystemVersion');
    tooltip += addTooltipItem(connCreds, 'workstationId');

    return tooltip;
}
