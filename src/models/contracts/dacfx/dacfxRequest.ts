/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestType } from 'vscode-languageclient';


export class ParseTSqlParams {
    objectTsql: string;
}

export class ParseTSqlResult {
    objectName: string;
    isTable: boolean;
    success: boolean;
    errorMessage: string;
}

// ------------------------------- < Metadata Events > ------------------------------------

export namespace ParseTSqlRequest {
    export const type = new RequestType<ParseTSqlParams, ParseTSqlResult, void, void>('dacfx/parsetsql');
}