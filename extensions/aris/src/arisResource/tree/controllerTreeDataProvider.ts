/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { AppContext } from '../../appContext';
import { TreeNode } from './treeNode';
import { IControllerTreeChangeHandler } from './controllerTreeChangeHandler';
import { AddControllerTreeNode } from './addControllerTreeNode';
import { ControllerRootNode, ControllerNode } from './controllerTreeNode';
import { IEndPoint } from '../controller/types';

const localize = nls.loadMessageBundle();

export function registerTreeDataProvider(appContext: AppContext, treeDataProvider:ControllerTreeDataProvider): void {
	appContext.apiWrapper.registerTreeDataProvider('arisResourceExplorer', treeDataProvider);
}

export class ControllerTreeDataProvider implements vscode.TreeDataProvider<TreeNode>, IControllerTreeChangeHandler {

	private _onDidChangeTreeData: vscode.EventEmitter<TreeNode> = new vscode.EventEmitter<TreeNode>();
	public readonly onDidChangeTreeData: vscode.Event<TreeNode> = this._onDidChangeTreeData.event;
	private root: ControllerRootNode;

	constructor() {
		this.root = new ControllerRootNode({ treeChangeHandler: this });
		this.loadSavedControllers();
	}

	public async getChildren(element?: TreeNode): Promise<TreeNode[]> {
		if (element) {
			return element.getChildren();
		}

		if (this.root.hasChildren) {
			return this.root.getChildren();
		} else {
			return [new AddControllerTreeNode()];
		}
	}

	public getTreeItem(element: TreeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element.getTreeItem();
	}

	public addController(
		url: string,
		username: string,
		password: string,
		rememberPassword: boolean,
		masterInstance?: IEndPoint
	): void {
		this.root.addControllerNode(url, username, password, rememberPassword, masterInstance);
		this.notifyNodeChanged();
	}

	public deleteController(url: string, username: string): ControllerNode {
		let deleted = this.root.deleteControllerNode(url, username);
		if (deleted) {
			this.notifyNodeChanged();
		}
		return deleted;
	}

	public notifyNodeChanged(node?: TreeNode): void {
		if (!node) {
			this.root.children.forEach(c => {
				(c as ControllerNode).skipDialog();
			});
		}
		this._onDidChangeTreeData.fire(node);
	}

	public loadSavedControllers(): void {
		let config = vscode.workspace.getConfiguration('bigDataClusterControllers');
		if (config && config.controllers) {
			let controllers = config.controllers;
			this.root.clearChildren();
			for (let c of controllers) {
				this.root.addChild(new ControllerNode({
					url: c.url,
					username: c.username,
					password: c.password,
					rememberPassword: c.password !== undefined,
					parent: this.root,
					treeChangeHandler: this
				}));
			}
			this.notifyNodeChanged();
		}
	}

	public async saveControllers(): Promise<void> {
		let controllers = this.root.children.map(e => {
			let c = e as ControllerNode;
			return {
				url: c.url,
				username: c.username,
				password: c.rememberPassword ? c.password : undefined
			};
		});
		await vscode.workspace.getConfiguration('bigDataClusterControllers').update('controllers', controllers, true).then(
			() => { },
			error => {
				vscode.window.showErrorMessage(error.message);
			}
		);
	}
}
