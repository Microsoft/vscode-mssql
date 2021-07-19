/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import SqlToolsServiceClient from '../languageservice/serviceclient';
import ConnectionManager from '../controllers/connectionManager';
import { BindingType, GetAzureFunctionsParams, GetAzureFunctionsRequest, InsertSqlBindingParams, InsertSqlBindingRequest } from '../models/contracts/azureFunctions/azureFunctionsRequest';
import vscode = require('vscode');
import path = require('path');

export class AzureFunctionsService {

    private _client: SqlToolsServiceClient;

    constructor(
        private _connectionManager: ConnectionManager
    ) {
        this._client = this._connectionManager.client;
    }

    public async getAzureFunctions(uri: vscode.Uri): Promise<string[]> {
        if (!uri) {
            return [];
        }

        console.error('in get azure functions');

        // get all the azure functions in the file
        const params: GetAzureFunctionsParams = {
            filePath: uri.fsPath
        };

        const result = await this._client.sendRequest(GetAzureFunctionsRequest.type, params);

        console.error('result is ' + JSON.stringify(result));

        if (result.success) {
            return result.azureFunctions;
        } else {
            throw new Error(result.errorMessage);
        }
    }

    public async insertSqlInputBinding(uri: vscode.Uri): Promise<void> {
        if (!uri) {
            // this command only shows in the command palette when the active editor is a .cs file, so we can safely assume that's the scenario
            // when this is called without a uri (right click on .cs file in file explorer to invoke this command)
            uri = vscode.window.activeTextEditor.document.uri;
        }


        // input or output binding
        const intputOutputItems: vscode.QuickPickItem[] = [{ label: 'input' }, { label: 'output' }];

        const selectedBinding = (await vscode.window.showQuickPick(intputOutputItems, {
            canPickMany: false,
            title: 'Type of binding:'
        }))?.label;

        console.error('in insert sql input binding');

        // get all the azure functions in the file
        const azureFunctions = await this.getAzureFunctions(uri);
        console.error('Azure functions are ' + azureFunctions);

        if (azureFunctions.length === 0) {
            vscode.window.showErrorMessage('No Azure functions in the current file');
            return;
        }

        const items: vscode.QuickPickItem[] = [];

        for (const aFName of azureFunctions) {
            items.push({ label: aFName});
        }

        const azureFunctionName = (await vscode.window.showQuickPick(items, {
            canPickMany: false,
            title: 'Azure function in current file to add sql binding to:'
        }))?.label;

        if (!azureFunctionName) {
            return;
        }

        const objectName = await vscode.window.showInputBox({
            prompt: selectedBinding === 'input' ? 'Object to put in binding:' : 'Table to put in binding',
            value: '[dbo].[placeholder]',
            ignoreFocusOut: true
        });

        if (!objectName) {
            return;
        }

        const params: InsertSqlBindingParams = {
            filePath: uri.fsPath,
            functionName: azureFunctionName,
            objectName: objectName,
            bindingType: selectedBinding === 'input' ? BindingType.input : BindingType.output
        };

        const result = await this._client.sendRequest(InsertSqlBindingRequest.type, params);

        console.error("result is " + JSON.stringify(result));

        if (!result.success) {
            vscode.window.showErrorMessage(result.errorMessage);
        }
    }
}
