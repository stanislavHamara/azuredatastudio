/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { ITelemetryService, ITelemetryInfo } from 'vs/platform/telemetry/common/telemetry';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import * as platform from 'vs/base/common/platform';
import product from 'vs/platform/product/node/product';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { URI } from 'vs/base/common/uri';

export class GettingStarted implements IWorkbenchContribution {

	private static readonly hideWelcomeSettingskey = 'workbench.hide.welcome';

	private welcomePageURL?: string;
	private appName: string;

	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IOpenerService private readonly openerService: IOpenerService
	) {
		this.appName = product.nameLong;

		if (!product.welcomePage) {
			return;
		}

		if (environmentService.skipGettingStarted) {
			return;
		}

		if (environmentService.isExtensionDevelopment) {
			return;
		}

		this.welcomePageURL = product.welcomePage;
		this.handleWelcome();
	}

	private getUrl(telemetryInfo: ITelemetryInfo): string {
		return `${this.welcomePageURL}&&from=${this.appName}&&id=${telemetryInfo.machineId}`;
	}

	private openExternal(url: string) {
		// Don't open the welcome page as the root user on Linux, this is due to a bug with xdg-open
		// which recommends against running itself as root.
		if (platform.isLinux && platform.isRootUser()) {
			return;
		}
		this.openerService.open(URI.parse(url));
	}

	private handleWelcome(): void {
		//make sure the user is online, otherwise refer to the next run to show the welcome page
		if (!navigator.onLine) {
			return;
		}

		let firstStartup = !this.storageService.get(GettingStarted.hideWelcomeSettingskey, StorageScope.GLOBAL);

		if (firstStartup && this.welcomePageURL) {
			this.telemetryService.getTelemetryInfo().then(info => {
				let url = this.getUrl(info);
				this.openExternal(url);
				this.storageService.store(GettingStarted.hideWelcomeSettingskey, true, StorageScope.GLOBAL);
			});
		}
	}
}
