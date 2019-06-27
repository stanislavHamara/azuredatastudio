/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { AppContext } from '../appContext';
import { TreeNode } from './tree/treeNode';
import { AddControllerDialog } from './dialog/addControllerDialog';
import { ControllerTreeDataProvider } from './tree/controllerTreeDataProvider';
import { ControllerNode } from './tree/controllerTreeNode';
import { IEndPoint } from './controller/types';

const localize = nls.loadMessageBundle();

export function registerCommands(appContext: AppContext, treeDataProvider: ControllerTreeDataProvider): void {
	addBdcController(appContext, treeDataProvider);
	deleteBdcController(appContext, treeDataProvider);
	refresh(appContext, treeDataProvider);
}

function addBdcController(appContext: AppContext, treeDataProvider: ControllerTreeDataProvider): void {
	appContext.apiWrapper.registerCommand('aris.resource.registerArisController', (node: TreeNode) => {
		let prefilledValues = node ? {
			url: node['url'],
			username: node['username']
		} : undefined;

		let d = new AddControllerDialog(prefilledValues);
		d.showDialog(async (res, rememberPassword) => {
			if (res && res.request) {
				let masterInstance: IEndPoint = undefined;
				if (res.endPoints) {
					masterInstance = res.endPoints.find(e => e.name && e.name === 'sql-server-master');
				}
				treeDataProvider.addController(res.request.url, res.request.username, res.request.password, rememberPassword, masterInstance);
				await treeDataProvider.saveControllers();
				vscode.window.showInformationMessage(res.endPoints[0].endpoint);
			}
		}, () => {
		}, error => {
			vscode.window.showInformationMessage(`${error.message}, What?!!`);
		}, );
	});
}

function deleteBdcController(appContext: AppContext, treeDataProvider: ControllerTreeDataProvider): void {
	appContext.apiWrapper.registerCommand('bdcControllers.controller.delete', async (node?: TreeNode) => {
		if (!(node instanceof ControllerNode)) {
			return;
		}
		let n = node as ControllerNode;
		appContext.apiWrapper.showWarningMessage(
			`${localize('bdcControllers.confirmDeleteController', 'Are you sure you want to delete')} ${node.label}?`,
			localize('bdcControllers.yes', 'Yes'),
			localize('bdcControllers.no', 'No')).then(async (result) => {
				if (result && result === localize('bdcControllers.yes', 'Yes')) {
					let deleted = treeDataProvider.deleteController(n.url, n.username);
					if (deleted){
						await treeDataProvider.saveControllers();
					}
				}
			});
	});
}

function refresh(appContext: AppContext, treeDataProvider: ControllerTreeDataProvider): void {
	appContext.apiWrapper.registerCommand('bdcControllers.controller.refresh', (node: TreeNode) => {
		if (!node) {
			return;
		}
		treeDataProvider.notifyNodeChanged(node);
	});
}
