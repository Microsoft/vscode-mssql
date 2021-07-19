/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestType } from 'vscode-languageclient';

export enum BindingType {
    input,
    output
}

export class InsertSqlBindingParams {
    filePath: string;
    functionName: string;
    objectName: string;
    bindingType: BindingType;
}

export class ResultStatus {
    success: boolean;
    errorMessage: string;
}

export class GetAzureFunctionsParams {
    filePath: string;
}

export class GetAzureFunctionsResult extends ResultStatus {
    azureFunctions: string[];
}

// ------------------------------- < Metadata Events > ------------------------------------

export namespace InsertSqlBindingRequest {
    export const type = new RequestType<InsertSqlBindingParams, ResultStatus, void, void>('azureFunctions/sqlBinding');
}

export namespace GetAzureFunctionsRequest {
    export const type = new RequestType<GetAzureFunctionsParams, GetAzureFunctionsResult, void, void>('azureFunctions/getAzureFunctions');
}
