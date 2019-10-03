/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import SqlToolsServiceClient from '../languageservice/serviceclient';
import ConnectionManager from '../controllers/connectionManager';
import { ScriptingRequest, ScriptingParams, ScriptOperation, ScriptingObject, ScriptOptions } from '../models/contracts/scripting/scriptingRequest';
import { TreeNodeInfo } from '../objectExplorer/treeNodeInfo';

export class ScriptingService {

    private _client: SqlToolsServiceClient;

    constructor(
        private _connectionManager: ConnectionManager
    ) {
        this._client = this._connectionManager.client;
    }

    // map for the version of SQL Server (default is 140)
    readonly scriptCompatibilityOptionMap = {
        90: 'Script90Compat',
        100: 'Script100Compat',
        105: 'Script105Compat',
        110: 'Script110Compat',
        120: 'Script120Compat',
        130: 'Script130Compat',
        140: 'Script140Compat'
    };

    // map for the target database engine edition (default is Enterprise)
    readonly targetDatabaseEngineEditionMap = {
        0: 'SqlServerEnterpriseEdition',
        1: 'SqlServerPersonalEdition',
        2: 'SqlServerStandardEdition',
        3: 'SqlServerEnterpriseEdition',
        4: 'SqlServerExpressEdition',
        5: 'SqlAzureDatabaseEdition',
        6: 'SqlDatawarehouseEdition',
        7: 'SqlServerStretchEdition'
    };

    /**
     * Helper to get the object name and schema name
     * @param node
     */
    private getObjectNames(node: TreeNodeInfo): string[] {
        let fullName = node.label;
        let objects = fullName.split('.');
        return objects;
    }

    public async scriptSelect(node: TreeNodeInfo, uri: string): Promise<string> {
        const objectNames = this.getObjectNames(node);
        let scriptingObject: ScriptingObject = {
            type: node.nodeType,
            schema: objectNames[objectNames.length - 2],
            name: objectNames[objectNames.length - 1]
        };
        let serverInfo = this._connectionManager.getServerInfo(node.connectionCredentials);
        let scriptOptions: ScriptOptions = {
            scriptCreateDrop: 'ScriptSelect',
            typeOfDataToScript: 'SchemaOnly',
            scriptStatistics: 'ScriptStatsNone',
            targetDatabaseEngineEdition:
            serverInfo.engineEditionId ? this.targetDatabaseEngineEditionMap[serverInfo.engineEditionId] : 'SqlServerEnterpriseEdition',
            targetDatabaseEngineType: serverInfo.isCloud ? 'SqlAzure' : 'SingleInstance',
            scriptCompatibilityOption: serverInfo.serverMajorVersion ?
                this.scriptCompatibilityOptionMap[serverInfo.serverMajorVersion] : 'Script140Compat'
        };
        let scriptingParams: ScriptingParams = {
            filePath: undefined,
            scriptDestination: 'ToEditor',
            connectionString: undefined,
            scriptingObjects: [scriptingObject],
            includeObjectCriteria: undefined,
            excludeObjectCriteria: undefined,
            includeSchemas: undefined,
            excludeSchemas: undefined,
            includeTypes: undefined,
            excludeTypes: undefined,
            scriptOptions: scriptOptions,
            connectionDetails: undefined,
            ownerURI: uri,
            selectScript: undefined,
            operation: ScriptOperation.Select
        };
        const result = await this._client.sendRequest(ScriptingRequest.type, scriptingParams);
        return result.script;
    }

}
