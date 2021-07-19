/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import SqlToolsServiceClient from '../languageservice/serviceclient';
import ConnectionManager from '../controllers/connectionManager';
import { ParseTSqlParams, ParseTSqlRequest } from '../models/contracts/dacfx/dacfxRequest';
import { promises as fs } from 'fs';
import vscode = require('vscode');
import path = require('path');

export class DacFxService {

    private _client: SqlToolsServiceClient;

    constructor(
        private _connectionManager: ConnectionManager
    ) {
        this._client = this._connectionManager.client;
    }

    public async parseTSql(uri: vscode.Uri): Promise<void> {
        const fileContents = (await fs.readFile(uri.fsPath)).toString();
        const params: ParseTSqlParams = {
            objectTsql: fileContents
        };
        const result = await this._client.sendRequest(ParseTSqlRequest.type, params);

        const suggestedName = result.objectName !== null ? result.objectName : 'dbo.table1';

        const itemObjectName = await vscode.window.showInputBox({
            prompt: 'SQL binding object name:',
            value: `${suggestedName}`,
            ignoreFocusOut: true
        });

        if (!itemObjectName) {
            return;
        }

        const items: vscode.QuickPickItem[] = [];
        items.push({ label: 'SQL input binding' });
        items.push({ label: 'SQL output binding' });

        const snippet = (await vscode.window.showQuickPick(items, {
            canPickMany: false,
            placeHolder: 'Select sql binding to copy to clipboard'
        })).label;

        if (snippet === 'SQL input binding') {
            vscode.env.clipboard.writeText(`[Sql(\"select * from ${itemObjectName}\",\nCommandType = System.Data.CommandType.Text,\nConnectionStringSetting = \"SqlConnectionString\")] IEnumerable<Object> result`);
        } else {
            vscode.env.clipboard.writeText(`[Sql(\"${itemObjectName}\",\nConnectionStringSetting = \"SqlConnectionString\")]\nout Object output`);
        }

        vscode.window.showInformationMessage('Azure function SQL binding copied to clipboard. Paste in appropriate Azure function definition');
    }
}
