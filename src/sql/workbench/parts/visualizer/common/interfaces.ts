/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import product from 'vs/platform/product/node/product';
import * as Constants from 'sql/workbench/contrib/extensions/constants';

export class VisualizerState {
	dataId: { batchId: number, resultId: number };
	type: VisualizerOptions.Charts;

	dispose() { }

	private getChartTypes() {
		let visualizerExtensions = product.recommendedExtensionsByScenario[Constants.visualizerExtensions];
		// filter by the extensions that are downloaded
	}
}

export enum VisualizerOptions {
	Charts = 'charts'
}