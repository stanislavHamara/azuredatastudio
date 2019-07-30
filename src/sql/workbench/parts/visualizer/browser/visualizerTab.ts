/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IPanelTab } from 'sql/base/browser/ui/panel/panel';
import { VisualizerView } from './visualizerView';
import QueryRunner from 'sql/platform/query/common/queryRunner';

import { localize } from 'vs/nls';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';

export class VisualizerTab implements IPanelTab {
	public readonly title = localize('VisualizerTabTitle', 'VisualizerS');
	public readonly identifier = 'VisualizerTab';
	public readonly view: VisualizerView;

	constructor(@IInstantiationService instantiationService: IInstantiationService) {
		this.view = instantiationService.createInstance(VisualizerView);
	}

	public set queryRunner(runner: QueryRunner) {
		this.view.queryRunner = runner;
	}

	public chart(dataId: { batchId: number, resultId: number }): void {
		this.view.chart(dataId);
	}

	public dispose() {
		this.view.dispose();
	}

	public clear() {
		this.view.clear();
	}
}
