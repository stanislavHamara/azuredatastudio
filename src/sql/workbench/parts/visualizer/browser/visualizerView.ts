/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/chartView';

import { IPanelView } from 'sql/base/browser/ui/panel/panel';
import { Insight } from './insight';
import QueryRunner from 'sql/platform/query/common/queryRunner';
import { ChartOptions, IChartOption, ControlType } from './chartOptions';
import { Extensions, IInsightRegistry } from 'sql/platform/dashboard/browser/insightRegistry';
import { IInsightData } from './interfaces';
import { Registry } from 'vs/platform/registry/common/platform';
import * as DOM from 'vs/base/browser/dom';
import { SelectBox } from 'sql/base/browser/ui/selectBox/selectBox';
import { IContextViewService } from 'vs/platform/contextview/browser/contextView';
import { InputBox } from 'vs/base/browser/ui/inputbox/inputBox';
import { IDisposable, dispose, Disposable } from 'vs/base/common/lifecycle';
import { attachSelectBoxStyler, attachInputBoxStyler } from 'vs/platform/theme/common/styler';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { isUndefinedOrNull } from 'vs/base/common/types';
import { CreateInsightAction, CopyAction, SaveImageAction, IChartActionContext } from 'sql/workbench/parts/charts/browser/actions';
import { Taskbar } from 'sql/base/browser/ui/taskbar/taskbar';
import { Checkbox } from 'sql/base/browser/ui/checkbox/checkbox';
import { ChartState, IInsightOptions, ChartType } from 'sql/workbench/parts/charts/common/interfaces';
import { Dropdown } from 'sql/base/parts/editableDropdown/browser/dropdown';
import { IDropdownOptions } from 'vs/base/browser/ui/dropdown/dropdown';
import { localize } from 'vs/nls';
import { ChartView } from 'sql/workbench/parts/charts/browser/chartView';
import { ContextViewService } from 'vs/platform/contextview/browser/contextViewService';
import { ChartTab } from 'sql/workbench/parts/charts/browser/chartTab';
import { VisualizerState } from 'sql/workbench/parts/visualizer/common/interfaces';
declare class Proxy {
	constructor(object, handler);
}

const insightRegistry = Registry.as<IInsightRegistry>(Extensions.InsightContribution);

export class VisualizerView extends Disposable implements IPanelView {
	private dropdown: SelectBox;
	private currentVisualizerExtension: string;
	private visualizerState: VisualizerState;

	// For Charts
	private charts: ChartView;
	private insight: Insight;
	private _currentData: { batchId: number, resultId: number };
	private _state: ChartState;
	private readonly _selectVisualizerExtensionString: string = localize("selectVisualizerExtension", "Select Visualizer");
	private extensionOptions = {
		Charts: "charts",
		Sanddance: "msrvida-azdata-sanddance"
	};

	private options: IInsightOptions = {
		type: ChartType.Bar
	};

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

	private optionDisposables: IDisposable[] = [];

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

		this.optionMap["Charts"] = {element: this.chartContainer};


		//TODO: create all the containers and visualizer option instances?


		// ChartOptions.general[0].options = insightRegistry.getAllIds();
		// ChartOptions.general.map(o => {
		// 	this.createOption(o, generalControls);
		// });
		// this.buildOptions();
	}


	// PRIVATE HELPERS for Visualiser Extensions /////////////////////////////////////////////////////
	private visualizerExtensionSelected(visualizerExtensionName: string) {
		console.log("VisualizerExtension changed to: " + visualizerExtensionName);
		this.currentVisualizerExtension = visualizerExtensionName;

		if (!this.optionMap.hasOwnProperty(visualizerExtensionName)) {
			this.createOption(visualizerExtensionName);
		}
		this.verifyOptions();

		// if (visualizerExtensionName === "Charts") {
		// 	console.log("true, changed to: " + this.currentVisualizerExtension);
		// 	this.getChartsView();
		// } else {
		// 	console.log("true, changed to: " + this.currentVisualizerExtension);
		// 	this.getVisualizerExtensionView();
		// }
	}

	private getCurrentVisualizerExtentionName() {

	}


	public clear() {
		// clear all extensions?
		this.charts.clear();
	}

	public dispose() {
		dispose(this.optionDisposables);
		this.charts.dispose();
		super.dispose();
	}

	private getChartsView(): void {
		console.log("calling getChartView");
		this.chartContainer.hidden = false;


	}

	private getVisualizerExtensionView(): void {
		console.log("calling getVisualizerExtensionView");
		this.chartContainer.hidden = true;
	}

	render(container: HTMLElement): void {
		if (!this.container) {
			this.container = DOM.$('div.chart-parent-container');
			this.container.appendChild(this.dropdownContainer);
			this.extensionContainer = DOM.$('div.extension-container');
			// this.chartContainer = DOM.$('div.chartFull-container');

			// this.charts.render(this.chartContainer);
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
		//this.charts.chart(this._currentData);
	}

	layout(dimension: DOM.Dimension): void {
		if (this.insight) {
			this.insight.layout(new DOM.Dimension(DOM.getContentWidth(this.insightContainer), DOM.getContentHeight(this.insightContainer)));
		}
	}

	focus(): void {
	}

	public set queryRunner(runner: QueryRunner) {
		this.charts.queryRunner = runner;
		//this._queryRunner = runner;
		//this.shouldGraph();
	}



	private buildOptions() {
		// The first element in the disposables list is for the chart type: the master dropdown that controls other option controls.
		// whiling rebuilding the options we should not dispose it, otherwise it would react to the theme change event
		if (this.optionDisposables.length > 1) {
			dispose(this.optionDisposables.slice(1));
			this.optionDisposables.splice(1);
		}

		// this.optionMap = {
		// 	'type': this.optionMap['type']
		// };
		// DOM.clearNode(this.typeControls);

		//this.updateActionbar();
		// ChartOptions[this.options.type].map(o => {
		// 	this.createOption(o, this.typeControls);
		// });


		// if (this.insight) {
		// 	this.insight.options = this.options;
		// }

		// Add extentsion html to OptionMap
		//this.createOption()
		this.verifyOptions();
	}

	private verifyOptions() {
		//this.updateActionbar();
		for (let key in this.optionMap) {
			// if (this.optionMap.hasOwnProperty(key)) {
			// 	//let option = ChartOptions[this.options.type].find(e => e.configEntry === key);
			// 	if (option && option.if) {
			// 		if (option.if(this.options)) {
			// 			DOM.show(this.optionMap[key].element);
			// 		} else {
			// 			DOM.hide(this.optionMap[key].element);
			// 		}
			// 	}
			// }
			if (key === this.currentVisualizerExtension) {
				DOM.show(this.optionMap[key].element);
			} else {
				DOM.hide(this.optionMap[key].element);
			}
		}
	}

	private createOption(extensionId: string) {
		let optionContainer = DOM.$('div.option-container');
		let setFunc: (val) => void;
		// Create Instance of New extension
		// notify with option container

		// Add to option map
		this.optionMap[extensionId]= {element: optionContainer};
		this.extensionContainer.appendChild(optionContainer);
	}


	//private createOption(option: IChartOption, container: HTMLElement) {
	// 	let label = DOM.$('div');
	// 	label.innerText = option.label;
	// 	let optionContainer = DOM.$('div.option-container');
	// 	optionContainer.appendChild(label);
	// 	let setFunc: (val) => void;
	// 	let value = this.state ? this.state.options[option.configEntry] || option.default : option.default;
	// 	switch (option.type) {
	// 		case ControlType.checkbox:
	// 			let checkbox = new Checkbox(optionContainer, {
	// 				label: '',
	// 				ariaLabel: option.label,
	// 				checked: value,
	// 				onChange: () => {
	// 					if (this.options[option.configEntry] !== checkbox.checked) {
	// 						this.options[option.configEntry] = checkbox.checked;
	// 						if (this.insight) {
	// 							this.insight.options = this.options;
	// 						}
	// 					}
	// 				}
	// 			});
	// 			setFunc = (val: boolean) => {
	// 				checkbox.checked = val;
	// 			};
	// 			break;
	// 		case ControlType.combo:
	// 			let dropdown = new SelectBox(option.displayableOptions || option.options, undefined, this._contextViewService);
	// 			dropdown.select(option.options.indexOf(value));
	// 			dropdown.render(optionContainer);
	// 			dropdown.onDidSelect(e => {
	// 				if (this.options[option.configEntry] !== option.options[e.index]) {
	// 					this.options[option.configEntry] = option.options[e.index];
	// 					if (this.insight) {
	// 						this.insight.options = this.options;
	// 					}
	// 				}
	// 			});
	// 			setFunc = (val: string) => {
	// 				if (!isUndefinedOrNull(val)) {
	// 					dropdown.select(option.options.indexOf(val));
	// 				}
	// 			};
	// 			this.optionDisposables.push(attachSelectBoxStyler(dropdown, this._themeService));
	// 			break;
	// 		case ControlType.input:
	// 			let input = new InputBox(optionContainer, this._contextViewService);
	// 			input.value = value || '';
	// 			input.onDidChange(e => {
	// 				if (this.options[option.configEntry] !== e) {
	// 					this.options[option.configEntry] = e;
	// 					if (this.insight) {
	// 						this.insight.options = this.options;
	// 					}
	// 				}
	// 			});
	// 			setFunc = (val: string) => {
	// 				if (!isUndefinedOrNull(val)) {
	// 					input.value = val;
	// 				}
	// 			};
	// 			this.optionDisposables.push(attachInputBoxStyler(input, this._themeService));
	// 			break;
	// 		case ControlType.numberInput:
	// 			let numberInput = new InputBox(optionContainer, this._contextViewService, { type: 'number' });
	// 			numberInput.value = value || '';
	// 			numberInput.onDidChange(e => {
	// 				if (this.options[option.configEntry] !== Number(e)) {
	// 					this.options[option.configEntry] = Number(e);
	// 					if (this.insight) {
	// 						this.insight.options = this.options;
	// 					}
	// 				}
	// 			});
	// 			setFunc = (val: string) => {
	// 				if (!isUndefinedOrNull(val)) {
	// 					numberInput.value = val;
	// 				}
	// 			};
	// 			this.optionDisposables.push(attachInputBoxStyler(numberInput, this._themeService));
	// 			break;
	// 		case ControlType.dateInput:
	// 			let dateInput = new InputBox(optionContainer, this._contextViewService, { type: 'datetime-local' });
	// 			dateInput.value = value || '';
	// 			dateInput.onDidChange(e => {
	// 				if (this.options[option.configEntry] !== e) {
	// 					this.options[option.configEntry] = e;
	// 					if (this.insight) {
	// 						this.insight.options = this.options;
	// 					}
	// 				}
	// 			});
	// 			setFunc = (val: string) => {
	// 				if (!isUndefinedOrNull(val)) {
	// 					dateInput.value = val;
	// 				}
	// 			};
	// 			this.optionDisposables.push(attachInputBoxStyler(dateInput, this._themeService));
	// 			break;
	// 	}
	// 	this.optionMap[option.configEntry] = { element: optionContainer, set: setFunc };
	// 	container.appendChild(optionContainer);
	// 	this.options[option.configEntry] = value;
	// }

	public set state(val: ChartState) {
		this.charts.state = val;
		this._state = val;
		// if (this.state.options) {
		// 	for (let key in this.state.options) {
		// 		if (this.state.options.hasOwnProperty(key) && this.optionMap[key]) {
		// 			this.options[key] = this.state.options[key];
		// 			this.optionMap[key].set(this.state.options[key]);
		// 		}
		// 	}
		// }
		// if (this.state.dataId) {
		// 	this.charts.chart(this.state.dataId);
		// }
	}

	public get state(): ChartState {
		return this._state;
	}
}
