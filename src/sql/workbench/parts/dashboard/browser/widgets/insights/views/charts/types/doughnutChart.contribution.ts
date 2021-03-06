/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { mixin, deepClone } from 'vs/base/common/objects';
import { IJSONSchema } from 'vs/base/common/jsonSchema';
import { registerInsight } from 'sql/platform/dashboard/browser/insightRegistry';
import { chartInsightSchema } from 'sql/workbench/parts/dashboard/browser/widgets/insights/views/charts/chartInsight.contribution';

import DoughnutChart from './doughnutChart.component';

const properties: IJSONSchema = {

};

const doughnutChartSchema = mixin(deepClone(chartInsightSchema), properties) as IJSONSchema;

registerInsight('doughnut', '', doughnutChartSchema, DoughnutChart);
