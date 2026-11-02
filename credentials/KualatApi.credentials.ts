import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class KualatApi implements ICredentialType {
    name = 'kualatApi';

    displayName = 'Kualat API';

    properties: INodeProperties[] = [
        {
            displayName: 'Base URL',
            name: 'baseUrl',
            type: 'string',
            default: '',
            required: true,
            placeholder: 'https://your-domain.com/api',
            description:
                'API root of your kua.lat installation, including the /api prefix. Find it under Integrations → n8n in the dashboard.',
        },
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: { password: true },
            default: '',
            required: true,
            description:
                'Personal API key from Settings, or a scoped key from API Keys. It needs the permissions your operations use.',
        },
    ];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                Authorization: '=Bearer {{$credentials.apiKey}}',
            },
        },
    };

    // /account is the cheapest authenticated endpoint and answers 200 for every
    // key that is allowed to use the API at all.
    test: ICredentialTestRequest = {
        request: {
            baseURL: '={{$credentials.baseUrl.replace(new RegExp("/+$"), "")}}',
            url: '/account',
            method: 'GET',
        },
    };
}
