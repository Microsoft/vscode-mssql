'use strict';
import vscode = require('vscode');
import path = require('path');
import Constants = require('./constants');
import LocalWebService from '../controllers/localWebService';
import Utils = require('./utils');
import Interfaces = require('./interfaces');
import QueryRunner from '../controllers/queryRunner';

export class SqlOutputContentProvider implements vscode.TextDocumentContentProvider {
    private _queryResultsMap: Map<string, QueryRunner> = new Map<string, QueryRunner>();
    public static providerName = 'tsqloutput';
    public static providerUri = vscode.Uri.parse('tsqloutput://');
    private _service: LocalWebService;
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    public onContentUpdated(): void {
        Utils.logDebug(Constants.msgContentProviderOnContentUpdated);
        this._onDidChange.fire(SqlOutputContentProvider.providerUri);
    }

    constructor(context: vscode.ExtensionContext) {
        const self = this;

        // create local express server
        this._service = new LocalWebService(context.extensionPath);

        // add http handler for '/'
        this._service.addHandler(Interfaces.ContentType.Root, function(req, res): void {
            Utils.logDebug(Constants.msgContentProviderOnRootEndpoint);
            let uri: string = decodeURI(req.query.uri);
            res.render(path.join(LocalWebService.staticContentPath, Constants.msgContentProviderSqlOutputHtml), {uri: uri});
        });

        // add http handler for '/resultsetsMeta' - return metadata about columns & rows in multiple resultsets
        this._service.addHandler(Interfaces.ContentType.ResultsetsMeta, function(req, res): void {

            Utils.logDebug(Constants.msgContentProviderOnResultsEndpoint);
            let batchSets: Interfaces.ISlickGridBatchMetaData[] = [];
            let uri: string = decodeURI(req.query.uri);
            for (let batchIndex = 0; batchIndex < self._queryResultsMap.get(uri).batchSets.length; batchIndex++) {
                let batch: Interfaces.ISlickGridBatchMetaData = {resultSets: [], messages: undefined};
                for (let resultIndex = 0; resultIndex < self._queryResultsMap.get(uri).batchSets[batchIndex].resultSetSummaries.length; resultIndex++) {
                    batch.resultSets.push( <Interfaces.ISlickGridResultSet> {
                        columnsUri: '/' + Constants.outputContentTypeColumns + '?batchId=' + batchIndex + '&resultId=' + resultIndex + '&uri=' + uri,
                        rowsUri: '/' + Constants.outputContentTypeRows +  '?batchId=' + batchIndex + '&resultId=' + resultIndex + '&uri=' + uri,
                        numberOfRows: self._queryResultsMap.get(uri).batchSets[batchIndex].resultSetSummaries[resultIndex].rowCount
                    });
                }
                batch.messages = self._queryResultsMap.get(uri).batchSets[batchIndex].messages;
                batchSets.push(batch);
            }
            let json = JSON.stringify(batchSets);
            // Utils.logDebug(json);
            res.send(json);
        });

        // add http handler for '/columns' - return column metadata as a JSON string
        this._service.addHandler(Interfaces.ContentType.Columns, function(req, res): void {
            let resultId = req.query.resultId;
            let batchId = req.query.batchId;
            Utils.logDebug(Constants.msgContentProviderOnColumnsEndpoint + resultId);
            let uri: string = decodeURI(req.query.uri);
            let columnMetadata = self._queryResultsMap.get(uri).batchSets[batchId].resultSetSummaries[resultId].columnInfo;
            let json = JSON.stringify(columnMetadata);
            // Utils.logDebug(json);
            res.send(json);
        });

        // add http handler for '/rows' - return rows end-point for a specific resultset
        this._service.addHandler(Interfaces.ContentType.Rows, function(req, res): void {
            let resultId = req.query.resultId;
            let batchId = req.query.batchId;
            let rowStart = req.query.rowStart;
            let numberOfRows = req.query.numberOfRows;
            Utils.logDebug(Constants.msgContentProviderOnRowsEndpoint + resultId);
            let uri: string = decodeURI(req.query.uri);
            self._queryResultsMap.get(uri).getRows(rowStart, numberOfRows, batchId, resultId).then(results => {
                let json = JSON.stringify(results.resultSubset);
                res.send(json);
            });
            // Utils.logDebug(json);
        });

        // start express server on localhost and listen on a random port
        try {
            this._service.start();
        } catch (error) {
            Utils.showErrorMsg(error);
            throw(error);
        }
    }

    private clear(uri: string): void {
        Utils.logDebug(Constants.msgContentProviderOnClear);
        this._queryResultsMap.delete(uri);
    }

    public show(uri: string, title: string): void {
        vscode.commands.executeCommand('vscode.previewHtml', uri, vscode.ViewColumn.Two, 'SQL Query Results: ' + title);
    }

    public runQuery(connectionMgr, statusView, uri: string, text: string, title: string): void {
        let queryRunner = new QueryRunner(connectionMgr, statusView, this);
        queryRunner.runQuery(uri, text, title);
    }

    public updateContent(queryRunner: QueryRunner): string {
        Utils.logDebug(Constants.msgContentProviderOnUpdateContent);
        let title = queryRunner.title;
        let uri = SqlOutputContentProvider.providerUri + title;
        this.clear(uri);
        this._queryResultsMap.set(uri, queryRunner);
        this.show(uri, title);
        this.onContentUpdated();
        return uri;
    }

    // Called by VS Code exactly once to load html content in the preview window
    public provideTextDocumentContent(uri: vscode.Uri): string {
        Utils.logDebug(Constants.msgContentProviderProvideContent + uri.toString());

        // return dummy html content that redirects to 'http://localhost:<port>' after the page loads
        return `
                <html>
                    <head>
                        <script type="text/javascript">
                            window.onload = function(event) {
                                event.stopPropagation(true);
                                window.location.href="${LocalWebService.getEndpointUri(Interfaces.ContentType.Root)}?uri=${uri.toString()}";
                            };
                        </script>
                    </head>
                    <body></body>
                </html>`;
    }
}
