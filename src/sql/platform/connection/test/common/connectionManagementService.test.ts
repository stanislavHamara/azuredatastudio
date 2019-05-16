/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ConnectionDialogTestService } from 'sqltest/stubs/connectionDialogTestService';
import { ConnectionManagementService } from 'sql/platform/connection/common/connectionManagementService';
import { ConnectionStatusManager } from 'sql/platform/connection/common/connectionStatusManager';
import {
	INewConnectionParams, ConnectionType,
	IConnectionCompletionOptions, IConnectionResult,
	RunQueryOnConnectionMode
} from 'sql/platform/connection/common/connectionManagement';
import * as Constants from 'sql/platform/connection/common/constants';
import * as Utils from 'sql/platform/connection/common/utils';
import { IHandleFirewallRuleResult } from 'sql/workbench/services/resourceProvider/common/resourceProviderService';

import { WorkbenchEditorTestService } from 'sqltest/stubs/workbenchEditorTestService';
import { EditorGroupTestService } from 'sqltest/stubs/editorGroupService';
import { TestCapabilitiesService } from 'sql/platform/capabilities/test/common/testCapabilitiesService';
import { ConnectionProviderStub } from 'sqltest/stubs/connectionProviderStub';
import { ResourceProviderStub } from 'sqltest/stubs/resourceProviderServiceStub';

import * as azdata from 'azdata';

import { WorkspaceConfigurationTestService } from 'sqltest/stubs/workspaceConfigurationTestService';

import * as assert from 'assert';
import * as TypeMoq from 'typemoq';
import { IConnectionProfileGroup, ConnectionProfileGroup } from 'sql/platform/connection/common/connectionProfileGroup';
import { ConnectionProfile } from 'sql/platform/connection/common/connectionProfile';
import { AccountManagementTestService } from 'sqltest/stubs/accountManagementStubs';
import { TestStorageService } from 'vs/workbench/test/workbenchTestServices';
import { ConnectionStoreService } from 'sql/platform/connection/common/connectionStoreService';

suite('SQL ConnectionManagementService tests', () => {

	let capabilitiesService: TestCapabilitiesService;
	let connectionDialogService: TypeMoq.Mock<ConnectionDialogTestService>;
	let connectionStore: TypeMoq.Mock<ConnectionStoreService>;
	let workbenchEditorService: TypeMoq.Mock<WorkbenchEditorTestService>;
	let editorGroupService: TypeMoq.Mock<EditorGroupTestService>;
	let connectionStatusManager: ConnectionStatusManager;
	let mssqlConnectionProvider: TypeMoq.Mock<ConnectionProviderStub>;
	let workspaceConfigurationServiceMock: TypeMoq.Mock<WorkspaceConfigurationTestService>;
	let resourceProviderStubMock: TypeMoq.Mock<ResourceProviderStub>;
	let accountManagementService: TypeMoq.Mock<AccountManagementTestService>;

	let none: void;

	let connectionProfile: azdata.IConnectionProfile = {
		connectionName: 'new name',
		serverName: 'new server',
		databaseName: 'database',
		userName: 'user',
		password: 'password',
		authenticationType: 'integrated',
		savePassword: true,
		groupFullName: 'g2/g2-2',
		groupId: 'group id',
		providerName: 'MSSQL',
		options: {},
		saveProfile: true,
		id: undefined
	};
	let connectionProfileWithEmptySavedPassword: azdata.IConnectionProfile =
		Object.assign({}, connectionProfile, { password: '', serverName: connectionProfile.serverName + 1 });
	let connectionProfileWithEmptyUnsavedPassword: azdata.IConnectionProfile =
		Object.assign({}, connectionProfile, { password: '', serverName: connectionProfile.serverName + 2, savePassword: false });

	let connectionManagementService: ConnectionManagementService;
	let configResult: { [key: string]: any } = {};
	let handleFirewallRuleResult: IHandleFirewallRuleResult;
	let resolveHandleFirewallRuleDialog: boolean;
	let isFirewallRuleAdded: boolean;

	setup(() => {

		capabilitiesService = new TestCapabilitiesService();
		connectionDialogService = TypeMoq.Mock.ofType(ConnectionDialogTestService);
		connectionStore = TypeMoq.Mock.ofType(ConnectionStoreService, TypeMoq.MockBehavior.Loose, new TestStorageService());
		workbenchEditorService = TypeMoq.Mock.ofType(WorkbenchEditorTestService);
		editorGroupService = TypeMoq.Mock.ofType(EditorGroupTestService);
		connectionStatusManager = new ConnectionStatusManager(capabilitiesService);
		mssqlConnectionProvider = TypeMoq.Mock.ofType(ConnectionProviderStub);
		let resourceProviderStub = new ResourceProviderStub();
		resourceProviderStubMock = TypeMoq.Mock.ofInstance(resourceProviderStub);
		accountManagementService = TypeMoq.Mock.ofType(AccountManagementTestService);
		let root = new ConnectionProfileGroup(ConnectionProfileGroup.RootGroupName, undefined, ConnectionProfileGroup.RootGroupName, undefined, undefined);
		root.connections = [ConnectionProfile.fromIConnectionProfile(capabilitiesService, connectionProfile)];

		connectionDialogService.setup(x => x.showDialog(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny(), undefined)).returns(() => Promise.resolve(none));
		connectionDialogService.setup(x => x.showDialog(TypeMoq.It.isAny(), TypeMoq.It.isAny(), undefined, undefined)).returns(() => Promise.resolve(none));
		connectionDialogService.setup(x => x.showDialog(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny(), undefined)).returns(() => Promise.resolve(none));
		connectionDialogService.setup(x => x.showDialog(TypeMoq.It.isAny(), TypeMoq.It.isAny(), undefined, undefined)).returns(() => Promise.resolve(none));
		connectionDialogService.setup(x => x.showDialog(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny())).returns(() => Promise.resolve(none));

		connectionStore.setup(x => x.addRecentConnection(TypeMoq.It.isAny())).returns(() => Promise.resolve());
		connectionStore.setup(x => x.saveProfile(TypeMoq.It.isAny())).returns(() => Promise.resolve(connectionProfile));
		workbenchEditorService.setup(x => x.openEditor(undefined, TypeMoq.It.isAny(), TypeMoq.It.isAny())).returns(() => Promise.resolve(undefined));
		connectionStore.setup(x => x.addSavedPassword(TypeMoq.It.is<azdata.IConnectionProfile>(
			c => c.serverName === connectionProfile.serverName))).returns(() => Promise.resolve({ profile: connectionProfile, savedCred: true }));
		connectionStore.setup(x => x.addSavedPassword(TypeMoq.It.is<azdata.IConnectionProfile>(
			c => c.serverName === connectionProfileWithEmptySavedPassword.serverName))).returns(
				() => Promise.resolve({ profile: connectionProfileWithEmptySavedPassword, savedCred: true }));
		connectionStore.setup(x => x.addSavedPassword(TypeMoq.It.is<azdata.IConnectionProfile>(
			c => c.serverName === connectionProfileWithEmptyUnsavedPassword.serverName))).returns(
				() => Promise.resolve({ profile: connectionProfileWithEmptyUnsavedPassword, savedCred: false }));
		connectionStore.setup(x => x.isPasswordRequired(TypeMoq.It.isAny())).returns(() => true);
		connectionStore.setup(x => x.getConnectionProfileGroups(false, undefined)).returns(() => [root]);

		mssqlConnectionProvider.setup(x => x.connect(TypeMoq.It.isAny(), TypeMoq.It.isAny())).returns(() => undefined);

		// Setup resource provider
		handleFirewallRuleResult = {
			canHandleFirewallRule: false,
			ipAddress: '123.123.123.123',
			resourceProviderId: 'Azure'
		};
		resourceProviderStubMock.setup(x => x.handleFirewallRule(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
			.returns(() => Promise.resolve(handleFirewallRuleResult));

		resolveHandleFirewallRuleDialog = true;
		isFirewallRuleAdded = true;
		resourceProviderStubMock.setup(x => x.showFirewallRuleDialog(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()))
			.returns(() => {
				if (resolveHandleFirewallRuleDialog) {
					return isFirewallRuleAdded ? Promise.resolve(true) : Promise.resolve(false);
				} else {
					return Promise.reject(null).then();
				}
			});

		// Setup configuration to return a config that can be modified later.
		workspaceConfigurationServiceMock = TypeMoq.Mock.ofType(WorkspaceConfigurationTestService);
		workspaceConfigurationServiceMock.setup(x => x.getValue(Constants.sqlConfigSectionName))
			.returns(() => configResult);

		connectionManagementService = createConnectionManagementService();

		connectionManagementService.registerProvider('MSSQL', mssqlConnectionProvider.object);
	});

	function createConnectionManagementService(): ConnectionManagementService {
		let connectionManagementService = new ConnectionManagementService(
			connectionDialogService.object,
			undefined,
			workbenchEditorService.object,
			undefined,
			workspaceConfigurationServiceMock.object,
			capabilitiesService,
			undefined,
			editorGroupService.object,
			resourceProviderStubMock.object,
			undefined,
			accountManagementService.object,
			undefined
		);
		return connectionManagementService;
	}

	function verifyShowConnectionDialog(connectionProfile: azdata.IConnectionProfile, connectionType: ConnectionType, uri: string, connectionResult?: IConnectionResult, didShow: boolean = true): void {
		if (connectionProfile) {
			connectionDialogService.verify(x => x.showDialog(
				TypeMoq.It.isAny(),
				TypeMoq.It.is<INewConnectionParams>(p => p.connectionType === connectionType && (uri === undefined || p.input.uri === uri)),
				TypeMoq.It.is<azdata.IConnectionProfile>(c => c !== undefined && c.serverName === connectionProfile.serverName),
				connectionResult ? TypeMoq.It.is<IConnectionResult>(r => r.errorMessage === connectionResult.errorMessage && r.callStack === connectionResult.callStack) : undefined),
				didShow ? TypeMoq.Times.once() : TypeMoq.Times.never());

		} else {
			connectionDialogService.verify(x => x.showDialog(
				TypeMoq.It.isAny(),
				TypeMoq.It.is<INewConnectionParams>(p => p.connectionType === connectionType && ((uri === undefined && p.input === undefined) || p.input.uri === uri)),
				undefined,
				connectionResult ? TypeMoq.It.is<IConnectionResult>(r => r.errorMessage === connectionResult.errorMessage && r.callStack === connectionResult.callStack) : undefined),
				didShow ? TypeMoq.Times.once() : TypeMoq.Times.never());
		}
	}

	function verifyShowFirewallRuleDialog(connectionProfile: azdata.IConnectionProfile, didShow: boolean = true): void {
		resourceProviderStubMock.verify(x => x.showFirewallRuleDialog(
			TypeMoq.It.is<azdata.IConnectionProfile>(c => c.serverName === connectionProfile.serverName),
			TypeMoq.It.isAny(),
			TypeMoq.It.isAny()),
			didShow ? TypeMoq.Times.once() : TypeMoq.Times.never());
	}

	function verifyOptions(options?: IConnectionCompletionOptions, fromDialog?: boolean): void {

		if (options) {
			if (options.saveTheConnection) {
				connectionStore.verify(x => x.saveProfile(TypeMoq.It.isAny()), TypeMoq.Times.once());
			}
			if (options.showDashboard) {
				workbenchEditorService.verify(x => x.openEditor(undefined, TypeMoq.It.isAny(), TypeMoq.It.isAny()), TypeMoq.Times.once());
			}
		}

		if (fromDialog !== undefined && !fromDialog) {
			connectionStore.verify(x => x.addSavedPassword(TypeMoq.It.isAny()), TypeMoq.Times.once());
		}

	}

	function connect(uri: string, options?: IConnectionCompletionOptions, fromDialog?: boolean, connection?: ConnectionProfile, error?: string, errorCode?: number, errorCallStack?: string): Promise<IConnectionResult> {
		let connectionToUse = connection ? connection : connectionProfile;
		let id = connectionToUse.getOptionsKey();
		let defaultUri = 'connection://' + (id ? id : connectionToUse.serverName + ':' + connectionToUse.databaseName);
		// connectionManagementService.onConnectRequestSent(() => {
		// 	let info: azdata.ConnectionInfoSummary = {
		// 		connectionId: error ? undefined : 'id',
		// 		connectionSummary: {
		// 			databaseName: connectionToUse.databaseName,
		// 			serverName: connectionToUse.serverName,
		// 			userName: connectionToUse.userName
		// 		},
		// 		errorMessage: error,
		// 		errorNumber: errorCode,
		// 		messages: errorCallStack,
		// 		ownerUri: uri ? uri : defaultUri,
		// 		serverInfo: undefined
		// 	};
		// 	connectionManagementService.onConnectionComplete(0, info);
		// });
		return connectionManagementService.cancelConnectionForUri(uri).then(() => {
			return connectionManagementService.connect(connectionToUse, uri, options);
		});
	}

	test('showConnectionDialog should open the dialog with default type given no parameters', () => {
		return connectionManagementService.showConnectionDialog().then(() => {
			verifyShowConnectionDialog(undefined, ConnectionType.default, undefined);
		});
	});

	test('showConnectionDialog should open the dialog with given type given valid input', () => {
		let params: INewConnectionParams = {
			connectionType: ConnectionType.editor,
			input: {
				onConnectReject: undefined,
				onConnectStart: undefined,
				onDisconnect: undefined,
				onConnectSuccess: undefined,
				onConnectCanceled: undefined,
				uri: 'Editor Uri'
			},
			runQueryOnCompletion: RunQueryOnConnectionMode.executeQuery
		};
		return connectionManagementService.showConnectionDialog(params).then(() => {
			verifyShowConnectionDialog(undefined, params.connectionType, params.input.uri);
		});
	});

	test('showConnectionDialog should pass the model to the dialog if there is a model assigned to the uri', () => {
		let params: INewConnectionParams = {
			connectionType: ConnectionType.editor,
			input: {
				onConnectReject: undefined,
				onConnectStart: undefined,
				onDisconnect: undefined,
				onConnectSuccess: undefined,
				onConnectCanceled: undefined,
				uri: 'Editor Uri'
			},
			runQueryOnCompletion: RunQueryOnConnectionMode.executeQuery
		};

		return connect(params.input.uri).then(() => {
			let saveConnection = connectionManagementService.getConnectionProfile(params.input.uri);

			assert.notEqual(saveConnection, undefined, `profile was not added to the connections`);
			assert.equal(saveConnection.serverName, connectionProfile.serverName, `Server names are different`);
			connectionManagementService.showConnectionDialog(params).then(() => {
				verifyShowConnectionDialog(connectionProfile, params.connectionType, params.input.uri);
			});
		});
	});

	test('connect should save profile given options with saveProfile set to true', () => {
		let uri: string = 'Editor Uri';
		let options: IConnectionCompletionOptions = {
			params: undefined,
			saveTheConnection: true,
			showDashboard: false,
			showConnectionDialogOnError: false,
			showFirewallRuleOnError: true
		};

		return connect(uri, options).then(() => {
			verifyOptions(options);
		});
	});

	test('connect should pass the params in options to onConnectSuccess callback', () => {
		let uri: string = 'Editor Uri';
		let paramsInOnConnectSuccess: INewConnectionParams;
		let options: IConnectionCompletionOptions = {
			params: {
				connectionType: ConnectionType.editor,
				input: {
					onConnectSuccess: (params?: INewConnectionParams) => {
						paramsInOnConnectSuccess = params;
					},
					onConnectReject: undefined,
					onConnectStart: undefined,
					onDisconnect: undefined,
					onConnectCanceled: undefined,
					uri: uri
				},
				querySelection: undefined,
				runQueryOnCompletion: RunQueryOnConnectionMode.none
			},
			saveTheConnection: true,
			showDashboard: false,
			showConnectionDialogOnError: true,
			showFirewallRuleOnError: true
		};

		return connect(uri, options).then(() => {
			verifyOptions(options);
			assert.notEqual(paramsInOnConnectSuccess, undefined);
			assert.equal(paramsInOnConnectSuccess.connectionType, options.params.connectionType);
		});
	});

	test('connectAndSaveProfile should show not load the password', () => {
		let uri: string = 'Editor Uri';
		let options: IConnectionCompletionOptions = undefined;

		return connect(uri, options, true).then(() => {
			verifyOptions(options, true);
		});
	});

	test('connect with undefined uri and options should connect using the default uri', () => {
		let uri = undefined;
		let options: IConnectionCompletionOptions = undefined;

		return connect(uri, options).then(() => {
			assert.equal(connectionManagementService.isProfileConnected(connectionProfile), true);
		});
	});

	test('failed connection should open the dialog if connection fails', () => {
		let uri = undefined;
		let error: string = 'error';
		let errorCode: number = 111;
		let errorCallStack: string = 'error call stack';
		let expectedConnection: boolean = false;
		let options: IConnectionCompletionOptions = {
			params: undefined,
			saveTheConnection: false,
			showDashboard: false,
			showConnectionDialogOnError: true,
			showFirewallRuleOnError: true
		};

		let connectionResult: IConnectionResult = {
			connected: expectedConnection,
			errorMessage: error,
			errorCode: errorCode,
			callStack: errorCallStack
		};

		return connect(uri, options, false, connectionProfile, error, errorCode, errorCallStack).then(result => {
			assert.equal(result.connected, expectedConnection);
			assert.equal(result.errorMessage, connectionResult.errorMessage);
			verifyShowFirewallRuleDialog(connectionProfile, false);
			verifyShowConnectionDialog(connectionProfile, ConnectionType.default, uri, connectionResult);
		});
	});

	test('failed connection should not open the dialog if the option is set to false even if connection fails', () => {
		let uri = undefined;
		let error: string = 'error when options set to false';
		let errorCode: number = 111;
		let errorCallStack: string = 'error call stack';
		let expectedConnection: boolean = false;
		let options: IConnectionCompletionOptions = {
			params: undefined,
			saveTheConnection: false,
			showDashboard: false,
			showConnectionDialogOnError: false,
			showFirewallRuleOnError: true
		};

		let connectionResult: IConnectionResult = {
			connected: expectedConnection,
			errorMessage: error,
			errorCode: errorCode,
			callStack: errorCallStack
		};

		return connect(uri, options, false, connectionProfile, error, errorCode, errorCallStack).then(result => {
			assert.equal(result.connected, expectedConnection);
			assert.equal(result.errorMessage, connectionResult.errorMessage);
			verifyShowFirewallRuleDialog(connectionProfile, false);
			verifyShowConnectionDialog(connectionProfile, ConnectionType.default, uri, connectionResult, false);
		});
	});

	test('failed firewall rule should open the firewall rule dialog', () => {
		handleFirewallRuleResult.canHandleFirewallRule = true;
		resolveHandleFirewallRuleDialog = true;
		isFirewallRuleAdded = true;

		let uri = undefined;
		let error: string = 'error';
		let errorCode: number = 111;
		let expectedConnection: boolean = false;
		let expectedError: string = error;
		let options: IConnectionCompletionOptions = {
			params: undefined,
			saveTheConnection: false,
			showDashboard: false,
			showConnectionDialogOnError: true,
			showFirewallRuleOnError: true
		};

		return connect(uri, options, false, connectionProfile, error, errorCode).then(result => {
			assert.equal(result.connected, expectedConnection);
			assert.equal(result.errorMessage, expectedError);
			verifyShowFirewallRuleDialog(connectionProfile, true);
		});
	});

	test('failed firewall rule connection should not open the firewall rule dialog if the option is set to false even if connection fails', () => {
		handleFirewallRuleResult.canHandleFirewallRule = true;
		resolveHandleFirewallRuleDialog = true;
		isFirewallRuleAdded = true;

		let uri = undefined;
		let error: string = 'error when options set to false';
		let errorCallStack: string = 'error call stack';
		let errorCode: number = 111;
		let expectedConnection: boolean = false;
		let options: IConnectionCompletionOptions = {
			params: undefined,
			saveTheConnection: false,
			showDashboard: false,
			showConnectionDialogOnError: false,
			showFirewallRuleOnError: false
		};

		let connectionResult: IConnectionResult = {
			connected: expectedConnection,
			errorMessage: error,
			errorCode: errorCode,
			callStack: errorCallStack
		};

		return connect(uri, options, false, connectionProfile, error, errorCode, errorCallStack).then(result => {
			assert.equal(result.connected, expectedConnection);
			assert.equal(result.errorMessage, connectionResult.errorMessage);
			verifyShowFirewallRuleDialog(connectionProfile, false);
			verifyShowConnectionDialog(connectionProfile, ConnectionType.default, uri, connectionResult, false);
		});
	});

	test('failed firewall rule connection and failed during open firewall rule should open the firewall rule dialog and connection dialog with error', () => {
		handleFirewallRuleResult.canHandleFirewallRule = true;
		resolveHandleFirewallRuleDialog = false;
		isFirewallRuleAdded = true;

		let uri = undefined;
		let error: string = 'error when options set to false';
		let errorCode: number = 111;
		let errorCallStack: string = 'error call stack';
		let expectedConnection: boolean = false;
		let options: IConnectionCompletionOptions = {
			params: undefined,
			saveTheConnection: false,
			showDashboard: false,
			showConnectionDialogOnError: true,
			showFirewallRuleOnError: true
		};

		let connectionResult: IConnectionResult = {
			connected: expectedConnection,
			errorMessage: error,
			errorCode: errorCode,
			callStack: errorCallStack
		};

		return connect(uri, options, false, connectionProfile, error, errorCode, errorCallStack).then(result => {
			assert.equal(result.connected, expectedConnection);
			assert.equal(result.errorMessage, connectionResult.errorMessage);
			verifyShowFirewallRuleDialog(connectionProfile, true);
			verifyShowConnectionDialog(connectionProfile, ConnectionType.default, uri, connectionResult, true);
		});
	});

	test('failed firewall rule connection should open the firewall rule dialog. Then canceled firewall rule dialog should not open connection dialog', () => {
		handleFirewallRuleResult.canHandleFirewallRule = true;
		resolveHandleFirewallRuleDialog = true;
		isFirewallRuleAdded = false;

		let uri = undefined;
		let error: string = 'error when options set to false';
		let errorCallStack: string = 'error call stack';
		let errorCode: number = 111;
		let expectedConnection: boolean = false;
		let options: IConnectionCompletionOptions = {
			params: undefined,
			saveTheConnection: false,
			showDashboard: false,
			showConnectionDialogOnError: true,
			showFirewallRuleOnError: true
		};

		let connectionResult: IConnectionResult = {
			connected: expectedConnection,
			errorMessage: error,
			errorCode: errorCode,
			callStack: errorCallStack
		};

		return connect(uri, options, false, connectionProfile, error, errorCode, errorCallStack).then(result => {
			assert.equal(result.connected, expectedConnection);
			assert.equal(result.errorMessage, connectionResult.errorMessage);
			verifyShowFirewallRuleDialog(connectionProfile, true);
			verifyShowConnectionDialog(connectionProfile, ConnectionType.default, uri, connectionResult, false);
		});
	});

	test('connect when password is empty and unsaved should open the dialog', () => {
		let uri = undefined;
		let expectedConnection: boolean = false;
		let options: IConnectionCompletionOptions = {
			params: undefined,
			saveTheConnection: false,
			showDashboard: false,
			showConnectionDialogOnError: true,
			showFirewallRuleOnError: true
		};

		let connectionResult: IConnectionResult = {
			connected: expectedConnection,
			errorMessage: undefined,
			errorCode: undefined,
			callStack: undefined
		};

		return connect(uri, options, false, connectionProfileWithEmptyUnsavedPassword).then(result => {
			assert.equal(result.connected, expectedConnection);
			assert.equal(result.errorMessage, connectionResult.errorMessage);
			verifyShowConnectionDialog(connectionProfileWithEmptyUnsavedPassword, ConnectionType.default, uri, connectionResult);
			verifyShowFirewallRuleDialog(connectionProfile, false);
		});
	});

	test('connect when password is empty and saved should not open the dialog', () => {
		let uri = undefined;
		let expectedConnection: boolean = true;
		let options: IConnectionCompletionOptions = {
			params: undefined,
			saveTheConnection: false,
			showDashboard: false,
			showConnectionDialogOnError: true,
			showFirewallRuleOnError: true
		};

		let connectionResult: IConnectionResult = {
			connected: expectedConnection,
			errorMessage: undefined,
			errorCode: undefined,
			callStack: undefined
		};

		return connect(uri, options, false, connectionProfileWithEmptySavedPassword).then(result => {
			assert.equal(result.connected, expectedConnection);
			assert.equal(result.errorMessage, connectionResult.errorMessage);
			verifyShowConnectionDialog(connectionProfileWithEmptySavedPassword, ConnectionType.default, uri, connectionResult, false);
		});
	});

	test('connect from editor when empty password when it is required and saved should not open the dialog', () => {
		let uri = 'editor 3';
		let expectedConnection: boolean = true;
		let options: IConnectionCompletionOptions = {
			params: {
				connectionType: ConnectionType.editor,
				input: {
					onConnectSuccess: undefined,
					onConnectReject: undefined,
					onConnectStart: undefined,
					onDisconnect: undefined,
					onConnectCanceled: undefined,
					uri: uri
				},
				querySelection: undefined,
				runQueryOnCompletion: RunQueryOnConnectionMode.none
			},
			saveTheConnection: true,
			showDashboard: false,
			showConnectionDialogOnError: true,
			showFirewallRuleOnError: true
		};

		let connectionResult: IConnectionResult = {
			connected: expectedConnection,
			errorMessage: undefined,
			errorCode: undefined,
			callStack: undefined
		};

		return connect(uri, options, false, connectionProfileWithEmptySavedPassword).then(result => {
			assert.equal(result.connected, expectedConnection);
			assert.equal(result.errorMessage, connectionResult.errorMessage);
			verifyShowConnectionDialog(connectionProfileWithEmptySavedPassword, ConnectionType.editor, uri, connectionResult, false);
		});
	});

	test('doChangeLanguageFlavor should throw on unknown provider', () => {
		// given a provider that will never exist
		let invalidProvider = 'notaprovider';
		// when I call doChangeLanguageFlavor
		// Then I expect it to throw
		assert.throws(() => connectionManagementService.doChangeLanguageFlavor('file://my.sql', 'sql', invalidProvider));
	});

	test('doChangeLanguageFlavor should send event for known provider', () => {
		// given a provider that is registered
		let uri = 'file://my.sql';
		let language = 'sql';
		let flavor = 'MSSQL';
		// when I call doChangeLanguageFlavor
		let called = false;
		connectionManagementService.onLanguageFlavorChanged((changeParams: azdata.DidChangeLanguageFlavorParams) => {
			called = true;
			assert.equal(changeParams.uri, uri);
			assert.equal(changeParams.language, language);
			assert.equal(changeParams.flavor, flavor);
		});
		connectionManagementService.doChangeLanguageFlavor(uri, language, flavor);
		assert.ok(called, 'expected onLanguageFlavorChanged event to be sent');
	});

	test('ensureDefaultLanguageFlavor should not send event if uri is connected', () => {
		let uri: string = 'Editor Uri';
		let options: IConnectionCompletionOptions = {
			params: undefined,
			saveTheConnection: false,
			showDashboard: false,
			showConnectionDialogOnError: false,
			showFirewallRuleOnError: true
		};
		let connectionManagementService = createConnectionManagementService();
		let called = false;
		connectionManagementService.onLanguageFlavorChanged((changeParams: azdata.DidChangeLanguageFlavorParams) => {
			called = true;
		});
		return connect(uri, options).then(() => {
			connectionManagementService.ensureDefaultLanguageFlavor(uri);
			assert.equal(called, false, 'do not expect flavor change to be called');
		});
	});

	test('getConnectionId returns the URI associated with a connection that has had its database filled in', () => {
		// Set up the connection management service with a connection corresponding to a default database
		let dbName = 'master';
		let serverName = 'test_server';
		let userName = 'test_user';
		let connectionProfileWithoutDb: IConnectionProfile = Object.assign(connectionProfile,
			{ serverName: serverName, databaseName: '', userName: userName, getOptionsKey: () => undefined });
		let connectionProfileWithDb: IConnectionProfile = Object.assign(connectionProfileWithoutDb, { databaseName: dbName });
		// Save the database with a URI that has the database name filled in, to mirror Carbon's behavior
		let ownerUri = Utils.generateUri(connectionProfileWithDb);
		return connect(ownerUri, undefined, false, connectionProfileWithoutDb).then(() => {
			// If I get the URI for the connection with or without a database from the connection management service
			let actualUriWithDb = connectionManagementService.getConnectionUri(connectionProfileWithDb);
			let actualUriWithoutDb = connectionManagementService.getConnectionUri(connectionProfileWithoutDb);

			// Then the retrieved URIs should match the one on the connection
			let expectedUri = Utils.generateUri(connectionProfileWithoutDb);
			assert.equal(actualUriWithDb, expectedUri);
			assert.equal(actualUriWithoutDb, expectedUri);
		});
	});

	test('getTabColorForUri returns undefined when there is no connection for the given URI', () => {
		let connectionManagementService = createConnectionManagementService();
		let color = connectionManagementService.getTabColorForUri('invalidUri');
		assert.equal(color, undefined);
	});

	test('getTabColorForUri returns the group color corresponding to the connection for a URI', () => {
		// Set up the connection store to give back a group for the expected connection profile
		configResult['tabColorMode'] = 'border';
		let expectedColor = 'red';
		connectionStore.setup(x => x.getGroupFromId(connectionProfile.groupId)).returns(() => <IConnectionProfileGroup>{
			color: expectedColor
		});
		let uri = 'testUri';
		return connect(uri).then(() => {
			let tabColor = connectionManagementService.getTabColorForUri(uri);
			assert.equal(tabColor, expectedColor);
		});
	});

	test('getActiveConnectionCredentials returns the credentials dictionary for a connection profile', () => {
		let profile = Object.assign({}, connectionProfile);
		profile.options = { password: profile.password };
		profile.id = 'test_id';
		connectionStatusManager.addConnection('test_uri', profile);
		(connectionManagementService as any)._connectionStatusManager = connectionStatusManager;
		let credentials = connectionManagementService.getActiveConnectionCredentials(profile.id);
		assert.equal(credentials['password'], profile.options['password']);
	});

	test('getConnectionUriFromId returns a URI of an active connection with the given id', () => {
		let profile = Object.assign({}, connectionProfile);
		profile.options = { password: profile.password };
		profile.id = 'test_id';
		let uri = 'test_initial_uri';
		connectionStatusManager.addConnection(uri, profile);
		(connectionManagementService as any)._connectionStatusManager = connectionStatusManager;

		// If I call getConnectionUriFromId on the given connection
		let foundUri = connectionManagementService.getConnectionUriFromId(profile.id);

		// Then the returned URI matches the connection's original URI
		assert.equal(foundUri, uri);
	});

	test('getConectionUriFromId returns undefined if the given connection is not active', () => {
		let profile = Object.assign({}, connectionProfile);
		profile.options = { password: profile.password };
		profile.id = 'test_id';
		connectionStatusManager.addConnection(Utils.generateUri(profile), profile);
		(connectionManagementService as any)._connectionStatusManager = connectionStatusManager;

		// If I call getConnectionUriFromId with a different URI than the connection's
		let foundUri = connectionManagementService.getConnectionUriFromId('different_id');

		// Then undefined is returned
		assert.equal(foundUri, undefined);
	});

	test('addSavedPassword fills in Azure access tokens for Azure accounts', async () => {
		// Set up a connection profile that uses Azure
		let azureConnectionProfile = ConnectionProfile.fromIConnectionProfile(capabilitiesService, connectionProfile);
		azureConnectionProfile.authenticationType = 'AzureMFA';
		let username = 'testuser@microsoft.com';
		azureConnectionProfile.userName = username;
		let servername = 'test-database.database.windows.net';
		azureConnectionProfile.serverName = servername;

		// Set up the account management service to return a token for the given user
		accountManagementService.setup(x => x.getAccountsForProvider(TypeMoq.It.isAny())).returns(providerId => Promise.resolve<azdata.Account[]>([
			{
				key: {
					accountId: username,
					providerId: providerId
				},
				displayInfo: undefined,
				isStale: false,
				properties: undefined
			}
		]));
		let testToken = 'testToken';
		accountManagementService.setup(x => x.getSecurityToken(TypeMoq.It.isAny(), TypeMoq.It.isAny())).returns(() => Promise.resolve({
			azurePublicCloud: {
				token: testToken
			}
		}));
		connectionStore.setup(x => x.addSavedPassword(TypeMoq.It.is(profile => profile.authenticationType === 'AzureMFA'))).returns(profile => Promise.resolve({
			profile: profile,
			savedCred: false
		}));

		// If I call addSavedPassword
		let profileWithCredentials = await connectionManagementService.addSavedPassword(azureConnectionProfile);

		// Then the returned profile has the account token set
		assert.equal(profileWithCredentials.userName, username);
		assert.equal(profileWithCredentials.options['azureAccountToken'], testToken);
	});

	test('addSavedPassword fills in Azure access token for selected tenant', async () => {
		// Set up a connection profile that uses Azure
		let azureConnectionProfile = ConnectionProfile.fromIConnectionProfile(capabilitiesService, connectionProfile);
		azureConnectionProfile.authenticationType = 'AzureMFA';
		let username = 'testuser@microsoft.com';
		azureConnectionProfile.userName = username;
		let servername = 'test-database.database.windows.net';
		azureConnectionProfile.serverName = servername;
		let azureTenantId = 'testTenant';
		azureConnectionProfile.azureTenantId = azureTenantId;

		// Set up the account management service to return a token for the given user
		accountManagementService.setup(x => x.getAccountsForProvider(TypeMoq.It.isAny())).returns(providerId => Promise.resolve<azdata.Account[]>([
			{
				key: {
					accountId: username,
					providerId: providerId
				},
				displayInfo: undefined,
				isStale: false,
				properties: undefined
			}
		]));
		let testToken = 'testToken';
		let returnedTokens = {};
		returnedTokens['azurePublicCloud'] = { token: 'badToken' };
		returnedTokens[azureTenantId] = { token: testToken };
		accountManagementService.setup(x => x.getSecurityToken(TypeMoq.It.isAny(), TypeMoq.It.isAny())).returns(() => Promise.resolve(returnedTokens));
		connectionStore.setup(x => x.addSavedPassword(TypeMoq.It.is(profile => profile.authenticationType === 'AzureMFA'))).returns(profile => Promise.resolve({
			profile: profile,
			savedCred: false
		}));

		// If I call addSavedPassword
		let profileWithCredentials = await connectionManagementService.addSavedPassword(azureConnectionProfile);

		// Then the returned profile has the account token set corresponding to the requested tenant
		assert.equal(profileWithCredentials.userName, username);
		assert.equal(profileWithCredentials.options['azureAccountToken'], testToken);
	});
});
