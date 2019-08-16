/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

module.exports = function (source) {
	let arr = source.split('\n');

	arr = arr.map(line => {
		if (!line.startsWith(`import 'vs/css!`)) return line;
		const str1 = line.substring(0, 8); // import '
		const str2 = line.substring(15, line.length - 3); // actual path

		const transformmed = `${str1}${str2}.css';`;
		return transformmed;
	});

	return arr.join('\n');
};
