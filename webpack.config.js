/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const path = require('path');

module.exports = {
	entry: path.resolve(__dirname, 'src', 'vs', 'code', 'browser', 'workbench', 'workbench.js'),
	output: {
		path: path.resolve(__dirname, 'webpack_dist'),
		filename: 'ads.bundle.js'
	},
	resolve: {
		extensions: ['.ts', '.tsx', '.js'],
		modules: [
			path.resolve(__dirname, 'src'),
			path.resolve(__dirname, 'node_modules')
		]
	},
	module: {
		rules: [{
			test: /\.tsx?$/,
			use: 'ts-loader'
		}]
	},
	mode: 'development'
};
