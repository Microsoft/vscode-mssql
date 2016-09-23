/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {Component, OnInit, Inject, forwardRef, ViewChild, ViewChildren, QueryList} from '@angular/core';
import {IColumnDefinition} from './slickgrid/ModelInterfaces';
import {IObservableCollection} from './slickgrid/BaseLibrary';
import {IGridDataRow} from './slickgrid/SharedControlInterfaces';
import {ISlickRange} from './slickgrid/SelectionModel';
import {SlickGrid} from './slickgrid/SlickGrid';
import {DataService} from './data.service';
import {Observable} from 'rxjs/Rx';
import {VirtualizedCollection} from './slickgrid/VirtualizedCollection';
import { Tabs } from './tabs';
import { Tab } from './tab';
import { ContextMenu } from './contextmenu.component';
import { FieldType } from './slickgrid/EngineAPI';

enum SelectedTab {
    Results = 0,
    Messages = 1,
}

/**
 * Top level app component which runs and controls the SlickGrid implementation
 */
@Component({
    selector: 'my-app',
    directives: [SlickGrid, Tabs, Tab, ContextMenu],
    templateUrl: 'app/app.html',
    providers: [DataService]
})

export class AppComponent implements OnInit {
    private dataSets: {
        dataRows: IObservableCollection<IGridDataRow>,
        columnDefinitions: IColumnDefinition[],
        totalRows: number,
        batchId: number,
        resultId: number}[] = [];
    private messages: string[] = [];
    private selected: SelectedTab;
    private windowSize = 50;
    private c_key = 67;
    public SelectedTab = SelectedTab;
    @ViewChild(ContextMenu) contextMenu: ContextMenu;
    @ViewChildren(SlickGrid) slickgrids: QueryList<SlickGrid>;


    constructor(@Inject(forwardRef(() => DataService)) private dataService: DataService) {}

    /**
     * Called by Angular when the object is initialized
     */
    ngOnInit(): void {
        const self = this;
        this.dataService.numberOfBatchSets().then((numberOfBatches: number) => {
            for (let batchId = 0; batchId < numberOfBatches; batchId++) {
                self.dataService.getMessages(batchId).then(data => {
                    self.messages = self.messages.concat(data);
                    self.selected = SelectedTab.Messages;
                });
                self.dataService.numberOfResultSets(batchId).then((numberOfResults: number) => {
                    for (let resultId = 0; resultId < numberOfResults; resultId++) {
                        let totalRowsObs = self.dataService.getNumberOfRows(batchId, resultId);
                        let columnDefinitionsObs = self.dataService.getColumns(batchId, resultId);
                        Observable.forkJoin([totalRowsObs, columnDefinitionsObs]).subscribe((data: any[]) => {
                            let dataSet: {
                                dataRows: IObservableCollection<IGridDataRow>,
                                columnDefinitions: IColumnDefinition[],
                                totalRows: number,
                                batchId: number,
                                resultId: number} = {
                                    dataRows: undefined,
                                    columnDefinitions: undefined,
                                    totalRows: undefined,
                                    batchId: batchId,
                                    resultId: resultId
                                };
                            let totalRows = data[0];
                            let columnData = data[1];
                            let columnDefinitions = [];

                            for (let i = 0; i < columnData.length; i++) {
                                if (columnData[i].isXml) {
                                    columnDefinitions.push({
                                        id: columnData[i].columnName,
                                        type: self.stringToFieldType('string'),
                                        formatter: self.hyperLinkFormatter,
                                        asyncPostRender: self.xmlLinkHandler
                                    });
                                } else {
                                    columnDefinitions.push({
                                        id: columnData[i].columnName,
                                        type: self.stringToFieldType('string')
                                    });
                                }

                            }
                            let loadDataFunction = (offset: number, count: number): Promise<IGridDataRow[]> => {
                                return new Promise<IGridDataRow[]>((resolve, reject) => {
                                    self.dataService.getRows(offset, count, batchId, resultId).subscribe(rows => {
                                        let gridData: IGridDataRow[] = [];
                                        for (let i = 0; i < rows.rows.length; i++) {
                                            gridData.push({
                                                values: rows.rows[i]
                                            });
                                        }
                                        resolve(gridData);
                                    });
                                });
                            };

                            let virtualizedCollection = new VirtualizedCollection<IGridDataRow>(self.windowSize,
                                                                                                totalRows,
                                                                                                loadDataFunction,
                                                                                                (index) => {
                                                                                                    return { values: [] };
                                                                                                });
                            dataSet.columnDefinitions = columnDefinitions;
                            dataSet.totalRows = totalRows;
                            dataSet.dataRows = virtualizedCollection;
                            self.dataSets.push(dataSet);
                            self.selected = SelectedTab.Results;
                        });
                    }
                });
            }
        });
    }

    /**
     * Used to convert the string to a enum compatible with SlickGrid
     */
    private stringToFieldType(input: string): FieldType {
        let fieldtype: FieldType;
        switch (input) {
            case 'string':
                fieldtype = FieldType.String;
                break;
            case 'boolean':
                fieldtype = FieldType.Boolean;
                break;
            case 'decimal':
                fieldtype = FieldType.Decimal;
                break;
            default:
                fieldtype = FieldType.String;
                break;
        }
        return fieldtype;
    }

    /**
     * Send save result set request to service
     */
    handleContextClick(event: {type: string, batchId: number, resultId: number, selection: ISlickRange[]}): void {
        switch (event.type) {
            case 'csv':
                this.dataService.sendSaveRequest(event.batchId, event.resultId, 'csv', event.selection);
                break;
            case 'json':
                this.dataService.sendSaveRequest(event.batchId, event.resultId, 'json', event.selection);
                break;
            default:
                break;
        }
    }

    openContextMenu(event: {x: number, y: number}, batchId, resultId, index): void {
        let selection = this.slickgrids.toArray()[index].getSelectedRanges();
        this.contextMenu.show(event.x, event.y, batchId, resultId, selection);
    }

    /**
     * Updates the internal state for what tab is selected; propogates down to the tab classes
     * @param to The tab was the selected
     */
    tabChange(to: SelectedTab): void {
        this.selected = to;
    }

    /**
     * Add handler for clicking on xml link
     */
    xmlLinkHandler = (cellRef: string, row: number, dataContext: JSON, colDef: any) => {
        const self = this;
        let value = dataContext[colDef.field];
        $(cellRef).children('.xmlLink').click(function(): void {
            self.dataService.openLink(value, colDef.field);
        });
    }

    /**
     * Format xml field into a hyperlink
     */
    public hyperLinkFormatter(row: number, cell: any, value: any, columnDef: any, dataContext: any): string {
        let valueToDisplay = (value + '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        let cellClasses = 'grid-cell-value-container';
        if (value) {
            cellClasses += ' xmlLink';
            return '<a class="' + cellClasses + '" href="#" >'
                + valueToDisplay
                + '</a>';
        } else {
            cellClasses += ' missing-value';
            return '<span title="' + valueToDisplay + '" class="' + cellClasses + '">' + valueToDisplay + '</span>';
        }
    }

    /**
     * Handles keyboard events on angular, currently only needed for copy-paste
     */
    onKey(e: any, batchId: number, resultId: number, index: number): void {
        if ((e.ctrlKey || e.metaKey) && e.which === this.c_key) {
            let selection = this.slickgrids.toArray()[index].getSelectedRanges();
            this.dataService.copyResults(selection, batchId, resultId);
        }
    }
}
