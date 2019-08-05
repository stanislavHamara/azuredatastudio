/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/chartView';

import { IPanelView } from 'sql/base/browser/ui/panel/panel';
import { Insight } from './insight';
import QueryRunner from 'sql/platform/query/common/queryRunner';
import { Extensions, IInsightRegistry } from 'sql/platform/dashboard/browser/insightRegistry';
import { Registry } from 'vs/platform/registry/common/platform';
import * as DOM from 'vs/base/browser/dom';
import { SelectBox } from 'sql/base/browser/ui/selectBox/selectBox';
import { IContextViewService } from 'vs/platform/contextview/browser/contextView';
import { Disposable } from 'vs/base/common/lifecycle';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ChartState, IInsightOptions, ChartType } from 'sql/workbench/parts/charts/common/interfaces';
import { ChartView } from 'sql/workbench/parts/charts/browser/chartView';
declare class Proxy {
	constructor(object, handler);
}

const insightRegistry = Registry.as<IInsightRegistry>(Extensions.InsightContribution);

export class VisualizerView extends Disposable implements IPanelView {
	private dropdown: SelectBox;
	private currentVisualizerExtension: string;

	// For Charts
	private charts: ChartView;
	private insight: Insight;
	private _currentData: { batchId: number, resultId: number };
	private _state: ChartState;

	/** parent container */
	private container: HTMLElement;
	/** container for the insight */
	private insightContainer: HTMLElement;
	/** container for dropdown menu */
	private dropdownContainer: HTMLElement;
	/** container for visualizer extension */
	private extensionContainer: HTMLElement;

	/** container for charts */
	private chartContainer: HTMLElement;


	// Maps name of extensiont to HTML container containing webview from extension
	private optionMap: { [x: string]: { element: HTMLElement } } = {};

	constructor(
		@IContextViewService private _contextViewService: IContextViewService,
		@IThemeService private _themeService: IThemeService,
		@IInstantiationService private _instantiationService: IInstantiationService,
	) {
		super();

		// Dropdown
		this.dropdownContainer = DOM.$('div.dropdown-container');
		this.dropdown = new SelectBox(["Charts", "Extension2"], "Charts", this._contextViewService, this.dropdownContainer, { ariaLabel: "Select Visualizer Extension" });
		this.dropdown.render(this.dropdownContainer);
		this.dropdown.onDidSelect(e => { this.visualizerExtensionSelected(e.selected); });
		this.currentVisualizerExtension = "Charts";

		// Create chart
		this.charts = _instantiationService.createInstance(ChartView);
		const self = this;

		this.chartContainer = DOM.$('div.chartFull-container');
		this.charts.render(this.chartContainer);

		this.optionMap = {
			'type': this.optionMap['type']
		};

		// Store "Charts" as the first and only extension available
		this.optionMap["Charts"] = { element: this.chartContainer };
	}

	render(container: HTMLElement): void {
		if (!this.container) {
			this.container = DOM.$('div.chart-parent-container');
			this.container.appendChild(this.dropdownContainer);
			this.extensionContainer = DOM.$('div.extension-container');
			this.extensionContainer.appendChild(this.chartContainer);
			this.container.appendChild(this.extensionContainer);
		}

		container.appendChild(this.container);
		this.verifyOptions();

	}

	// call "chart" function from charts instance
	public chart(dataId: { batchId: number, resultId: number }) {
		this.charts.chart(dataId);
		this.state.dataId = dataId;
		this._currentData = dataId;
	}

	// PRIVATE HELPERS for Visualiser Extensions /////////////////////////////////////////////////////
	private visualizerExtensionSelected(visualizerExtensionName: string) {
		console.log("VisualizerExtension changed to: " + visualizerExtensionName);
		this.currentVisualizerExtension = visualizerExtensionName;

		if (!this.optionMap.hasOwnProperty(visualizerExtensionName)) {
			this.createOption(visualizerExtensionName);
		}
		this.verifyOptions();

	}

	// Displays only the container of currentVisualizerExtension
	private verifyOptions() {
		for (let key in this.optionMap) {
			if (key === this.currentVisualizerExtension) {
				DOM.show(this.optionMap[key].element);
			} else {
				DOM.hide(this.optionMap[key].element);
			}
		}
	}

	// If extension is requested and has not been called before, create a container store its webview
	private createOption(extensionId: string) {
		// Create container
		let optionContainer = DOM.$('div.option-container');
		let setFunc: (val) => void;

		// Add to option map
		this.optionMap[extensionId] = { element: optionContainer };
		this.extensionContainer.appendChild(optionContainer);
	}

	public clear() {
		this.charts.clear();
	}

	public dispose() {
		this.charts.dispose();
		super.dispose();
	}

	public set queryRunner(runner: QueryRunner) {
		this.charts.queryRunner = runner;
	}

	public set state(val: ChartState) {
		this.charts.state = val;
		this._state = val;
		// TODO: update state for other extensions
	}

	public get state(): ChartState {
		return this._state;
	}

	focus(): void {
	}

	layout(dimension: DOM.Dimension): void {
		if (this.insight) {
			this.insight.layout(new DOM.Dimension(DOM.getContentWidth(this.insightContainer), DOM.getContentHeight(this.insightContainer)));
		}
	}

}
