/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';

export enum BdcItemType {
	ControllerRoot = 'bigDataClusters.itemType.ControllerRootNode',
	Controller = 'bigDataClusters.itemType.ControllerNode',
	Folder = 'bigDataClusters.itemType.FolderNode',
	SqlMaster = 'bigDataClusters.itemType.SqlMasterNode',
	EndPoint = 'bigDataClusters.itemType.EndPointNode',
	AddController = 'bigDataClusters.itemType.AddControllerNode',
}

export class IconPath {
	private static extensionContext: vscode.ExtensionContext;

	public static ControllerNode: { dark: string, light: string };
	public static FolderNode: { dark: string, light: string };
	public static SqlMasterNode: { dark: string, light: string };
	public static EndPointNode: { dark: string, light: string };

	public static setExtensionContext(extensionContext: vscode.ExtensionContext) {
		IconPath.extensionContext = extensionContext;
		IconPath.ControllerNode = {
			dark: IconPath.extensionContext.asAbsolutePath('resources/light/bigDataCluster_controller.svg'),
			light: IconPath.extensionContext.asAbsolutePath('resources/light/bigDataCluster_controller.svg')
		};
		IconPath.FolderNode = {
			dark: IconPath.extensionContext.asAbsolutePath('resources/dark/folder_inverse.svg'),
			light: IconPath.extensionContext.asAbsolutePath('resources/light/folder.svg')
		};
		IconPath.SqlMasterNode = {
			dark: IconPath.extensionContext.asAbsolutePath('resources/dark/sql_bigdata_cluster_inverse.svg'),
			light: IconPath.extensionContext.asAbsolutePath('resources/light/sql_bigdata_cluster.svg')
		};
		IconPath.EndPointNode = {
			dark: IconPath.extensionContext.asAbsolutePath('resources/dark/endpoint_inverse.svg'),
			light: IconPath.extensionContext.asAbsolutePath('resources/light/endpoint.svg')
		};
	}
}