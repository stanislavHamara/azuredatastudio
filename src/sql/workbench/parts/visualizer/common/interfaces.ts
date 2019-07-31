/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import product from 'vs/platform/product/node/product';
import { IExtensionsWorkbenchService, IExtension } from 'vs/workbench/contrib/extensions/common/extensions';
import * as Constants from 'sql/workbench/contrib/extensions/constants';


export interface AllOptions {
	[key: string]: any;
}
export class VisualizerState {
	dataId: { batchId: number, resultId: number };
	type: 'charts';
	installedVisualizerExtensions: AllOptions;

	constructor(@IExtensionsWorkbenchService private readonly extensionWorkbenchService: IExtensionsWorkbenchService) {
		this.installedVisualizerExtensions = {};
		this.getInstalledVisualizerExtensions();
	}

	dispose() { }

	private getInstalledVisualizerExtensions() {
		let visualizerExtensions = product.recommendedExtensionsByScenario[Constants.visualizerExtensions];
		let installedExtensions = this.extensionWorkbenchService.installed;
		visualizerExtensions.forEach(extension => {
			if (extension in installedExtensions) {
				this.installedVisualizerExtensions[extension] = extension;
			}
		});
	}
}
