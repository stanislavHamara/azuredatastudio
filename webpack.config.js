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
		alias: {
			"onigasm-umd": path.resolve(__dirname, 'node_modules', 'onigasm-umd', 'release', 'main')
		},
		extensions: ['.ts', '.tsx', '.js'],
		modules: [
			path.resolve(__dirname, 'src'),
			path.resolve(__dirname, 'node_modules')
		]
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					{
						loader: 'style-loader'
					},
					{
						loader: 'css-loader'
					}
				]
			},
			{
				test: /\.ttf$/,
				use: [
					{
						loader: 'file-loader'
					}
				]
			},
			{
				test: /\.(svg|png|gif|jpe?g)$/,
				use: [
					{
						loader: 'file-loader'
					}
				]
			},
			{
				test: /\.tsx?$/,
				use: [
					{
						loader: 'ts-loader',
						options: {
							transpileOnly: true
						}
					},
					{
						loader: path.resolve(__dirname, 'mycssloader.js')
					}
				]
			}
		]
	},
	mode: 'development'
};
