'use strict';

import * as azdata from 'azdata';

export class AgentUtils {

	private static _agentService: azdata.AgentServicesProvider;
	private static _connectionService: azdata.ConnectionProvider;
	private static _queryProvider: azdata.QueryProvider;

	public static async getAgentService(): Promise<azdata.AgentServicesProvider> {
		if (!AgentUtils._agentService) {
			let currentConnection = await azdata.connection.getCurrentConnection();
			this._agentService = azdata.dataprotocol.getProvider<azdata.AgentServicesProvider>(currentConnection.providerId, azdata.DataProviderType.AgentServicesProvider);
		}
		return AgentUtils._agentService;
	}

	public static async getDatabases(ownerUri: string): Promise<string[]> {
		if (!AgentUtils._connectionService) {
			let currentConnection = await azdata.connection.getCurrentConnection();
			this._connectionService = azdata.dataprotocol.getProvider<azdata.ConnectionProvider>(currentConnection.providerId, azdata.DataProviderType.ConnectionProvider);
		}
		return AgentUtils._connectionService.listDatabases(ownerUri).then(result => {
			if (result && result.databaseNames && result.databaseNames.length > 0) {
				return result.databaseNames;
			}
		});
	}

	public static async getQueryProvider(): Promise<azdata.QueryProvider> {
		if (!AgentUtils._queryProvider) {
			let currentConnection = await azdata.connection.getCurrentConnection();
			this._queryProvider = azdata.dataprotocol.getProvider<azdata.QueryProvider>(currentConnection.providerId, azdata.DataProviderType.QueryProvider);
		}
		return this._queryProvider;
	}

}