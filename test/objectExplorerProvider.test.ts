/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as vscode from 'vscode';
import * as TypeMoq from 'typemoq';
import { ObjectExplorerProvider } from '../src/objectExplorer/objectExplorerProvider';
import { ObjectExplorerService } from '../src/objectExplorer/objectExplorerService';
import ConnectionManager from '../src/controllers/connectionManager';
import SqlToolsServiceClient from '../src/languageservice/serviceclient';
import { expect } from 'chai';
import { TreeNodeInfo } from '../src/objectExplorer/treeNodeInfo';
import { ConnectionCredentials } from '../src/models/connectionCredentials';
import { Deferred } from '../src/protocol';
import { AddConnectionTreeNode } from '../src/objectExplorer/addConnectionTreeNode';
import * as LocalizedConstants from '../src/constants/localizedConstants';
import { AccountSignInTreeNode } from '../src/objectExplorer/accountSignInTreeNode';
import { ConnectTreeNode } from '../src/objectExplorer/connectTreeNode';

suite('Object Explorer Provider Tests', () => {

    let objectExplorerService: TypeMoq.IMock<ObjectExplorerService>;
    let connectionManager: TypeMoq.IMock<ConnectionManager>;
    let client: TypeMoq.IMock<SqlToolsServiceClient>;
    let objectExplorerProvider: ObjectExplorerProvider;

    setup(() => {
        connectionManager = TypeMoq.Mock.ofType(ConnectionManager, TypeMoq.MockBehavior.Loose);
        connectionManager.setup(c => c.client).returns(() => client.object);
        client = TypeMoq.Mock.ofType(SqlToolsServiceClient, TypeMoq.MockBehavior.Loose);
        client.setup(c => c.onNotification(TypeMoq.It.isAny(), TypeMoq.It.isAny()));
        connectionManager.object.client = client.object;
        objectExplorerProvider = new ObjectExplorerProvider(connectionManager.object);
        expect(objectExplorerProvider, 'Object Explorer Provider is initialzied properly').is.not.equal(undefined);
        objectExplorerService = TypeMoq.Mock.ofType(ObjectExplorerService, TypeMoq.MockBehavior.Loose, connectionManager.object);
        objectExplorerService.setup(s => s.currentNode).returns(() => undefined);
        objectExplorerProvider.objectExplorerService = objectExplorerService.object;
    });

    test('Test Create Session', () => {
        expect(objectExplorerService.object.currentNode, 'Current Node should be undefined').is.equal(undefined);
        expect(objectExplorerProvider.objectExplorerExists, 'Object Explorer should not exist until started').is.equal(undefined);
        const promise = new Deferred<TreeNodeInfo>();
        objectExplorerService.setup(s => s.createSession(promise, undefined)).returns(() => {
            return new Promise((resolve, reject) => {
                objectExplorerService.setup(s => s.currentNode).returns(() => TypeMoq.It.isAny());
                objectExplorerProvider.objectExplorerExists = true;
                promise.resolve(new TreeNodeInfo(undefined, undefined,
                    undefined, undefined,
                    undefined, undefined,
                    undefined, undefined,
                    undefined));
            });
        });
        objectExplorerProvider.createSession(promise, undefined).then(async () => {
            expect(objectExplorerService.object.currentNode, 'Current Node should not be undefined').is.not.equal(undefined);
            expect(objectExplorerProvider.objectExplorerExists, 'Object Explorer session should exist').is.equal(true);
            let node = await promise;
            expect(node, 'Created session node not be undefined').is.not.equal(undefined);
        });
    });

    test('Test Refresh Node', (done) => {
        let treeNode = TypeMoq.Mock.ofType(TreeNodeInfo, TypeMoq.MockBehavior.Loose);
        objectExplorerService.setup(s => s.refreshNode(TypeMoq.It.isAny())).returns(() => Promise.resolve(TypeMoq.It.isAny()));
        objectExplorerProvider.refreshNode(treeNode.object).then((node) => {
            expect(node, 'Refreshed node should not be undefined').is.not.equal(undefined);
        });
        done();
    });

    test('Test Connection Credentials', () => {
        let connectionCredentials = TypeMoq.Mock.ofType(ConnectionCredentials, TypeMoq.MockBehavior.Loose);
        objectExplorerService.setup(s => s.getConnectionCredentials(TypeMoq.It.isAnyString())).returns(() => connectionCredentials.object);
        let credentials = objectExplorerProvider.getConnectionCredentials('test_session_id');
        expect(credentials, 'Connection Credentials should not be null').is.not.equal(undefined);
    });

    test('Test remove Object Explorer node', async () => {
        let isNodeDeleted = false;
        objectExplorerService.setup(s => s.removeObjectExplorerNode(TypeMoq.It.isAny(), TypeMoq.It.isAny())).returns(() => {
            isNodeDeleted = true;
            return Promise.resolve(undefined);
        });
        await objectExplorerProvider.removeObjectExplorerNode(TypeMoq.It.isAny(), TypeMoq.It.isAny());
        expect(isNodeDeleted, 'Node should be deleted').is.equal(true);
    });

    test('Test Get Children from Object Explorer Provider', (done) => {
        const parentTreeNode = TypeMoq.Mock.ofType(TreeNodeInfo, TypeMoq.MockBehavior.Loose);
        const childTreeNode = TypeMoq.Mock.ofType(TreeNodeInfo, TypeMoq.MockBehavior.Loose);
        objectExplorerService.setup(s => s.getChildren(TypeMoq.It.isAny())).returns(() => Promise.resolve([childTreeNode.object]));
        objectExplorerProvider.getChildren(parentTreeNode.object).then((children) => {
            children.forEach((child) => expect(child, 'Children nodes should not be undefined').is.not.equal(undefined));
        });
        done();
    });
});

suite('Object Explorer Node Types Test', () => {

    test('Test Add Connection Tree Node', () => {
        const addConnectionTreeNode = new AddConnectionTreeNode();
        expect(addConnectionTreeNode.label, 'Label should be the same as constant').is.equal(LocalizedConstants.msgAddConnection);
        expect(addConnectionTreeNode.command, 'Add Connection Tree Node has a dedicated command').is.not.equal(undefined);
        expect(addConnectionTreeNode.iconPath, 'Add Connection Tree Node has an icon').is.not.equal(undefined);
        expect(addConnectionTreeNode.collapsibleState, 'Add Connection Tree Node should have no collapsible state')
            .is.equal(vscode.TreeItemCollapsibleState.None);
    });

    test('Test Account Sign In Tree Node', () => {
        const parentTreeNode = new TreeNodeInfo('parent', undefined, undefined, undefined,
            undefined, undefined, undefined, undefined, undefined);
        const accountSignInNode = new AccountSignInTreeNode(parentTreeNode);
        expect(accountSignInNode.label, 'Label should be the same as constant').is.equal(LocalizedConstants.msgSignIn);
        expect(accountSignInNode.command, 'Account Sign In Node has a dedicated command').is.not.equal(undefined);
        expect(accountSignInNode.parentNode, 'Account Sign In Node should have a parent').is.not.equal(undefined);
        expect(accountSignInNode.collapsibleState, 'Account Sign In Node should have no collapsible state')
            .is.equal(vscode.TreeItemCollapsibleState.None);
    });

    test('Test Connect Tree Node', () => {
        const parentTreeNode = new TreeNodeInfo('parent', undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined);
        const connectNode = new ConnectTreeNode(parentTreeNode);
        expect(connectNode.label, 'Label should be the same as constant').is.equal(LocalizedConstants.msgConnect);
        expect(connectNode.command, 'Connect Node has a dedicated command').is.not.equal(undefined);
        expect(connectNode.parentNode, 'Connect Node should have a parent').is.not.equal(undefined);
        expect(connectNode.collapsibleState, 'Connect Node should have no collapsible state')
            .is.equal(vscode.TreeItemCollapsibleState.None);
    });
});
