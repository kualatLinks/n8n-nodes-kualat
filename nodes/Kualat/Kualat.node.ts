import { NodeOperationError } from 'n8n-workflow';
import type {
    IDataObject,
    IExecuteFunctions,
    ILoadOptionsFunctions,
    INodeExecutionData,
    INodePropertyOptions,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';

import { kualatApiRequest, kualatApiRequestAllItems } from './GenericFunctions';

function compact(source: IDataObject): IDataObject {
    const out: IDataObject = {};

    for (const [key, value] of Object.entries(source)) {
        if (value === undefined || value === null || value === '') {
            continue;
        }

        out[key] = value;
    }

    return out;
}

export class Kualat implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Kualat',
        name: 'kualat',
        icon: 'file:kualat.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
        description: 'Shorten links, read click statistics and manage webhooks on a kua.lat installation',
        defaults: {
            name: 'Kualat',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'kualatApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    { name: 'Account', value: 'account' },
                    { name: 'Domain', value: 'domain' },
                    { name: 'Link', value: 'link' },
                    { name: 'Webhook', value: 'webhook' },
                ],
                default: 'link',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: { show: { resource: ['link'] } },
                options: [
                    {
                        name: 'Create',
                        value: 'create',
                        description: 'Shorten a URL',
                        action: 'Create a link',
                    },
                    {
                        name: 'Delete',
                        value: 'delete',
                        description: 'Delete a link permanently',
                        action: 'Delete a link',
                    },
                    {
                        name: 'Get',
                        value: 'get',
                        description: 'Get one link with its click statistics',
                        action: 'Get a link',
                    },
                    {
                        name: 'Get Many',
                        value: 'getAll',
                        description: 'List links',
                        action: 'Get many links',
                    },
                    {
                        name: 'Update',
                        value: 'update',
                        description: 'Change a link',
                        action: 'Update a link',
                    },
                ],
                default: 'create',
            },
            {
                displayName: 'URL',
                name: 'url',
                type: 'string',
                required: true,
                default: '',
                placeholder: 'https://example.com/page',
                displayOptions: { show: { resource: ['link'], operation: ['create'] } },
            },
            {
                displayName: 'Additional Fields',
                name: 'additionalFields',
                type: 'collection',
                placeholder: 'Add field',
                default: {},
                displayOptions: { show: { resource: ['link'], operation: ['create'] } },
                options: [
                    {
                        displayName: 'Custom Alias',
                        name: 'custom',
                        type: 'string',
                        default: '',
                        description: 'Readable alias instead of the generated one',
                    },
                    {
                        displayName: 'Description',
                        name: 'description',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Domain',
                        name: 'domain',
                        type: 'string',
                        default: '',
                        placeholder: 'link.your-domain.com',
                        description: 'A domain connected to the account; the default is used when empty',
                    },
                    {
                        displayName: 'Expiry',
                        name: 'expiry',
                        type: 'dateTime',
                        default: '',
                        description: 'When the link stops redirecting',
                    },
                    {
                        displayName: 'Meta Description',
                        name: 'metadescription',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Meta Title',
                        name: 'metatitle',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Password',
                        name: 'password',
                        type: 'string',
                        typeOptions: { password: true },
                        default: '',
                        description: 'Visitors must enter this password before being redirected',
                    },
                ],
            },
            {
                displayName: 'Link ID',
                name: 'linkId',
                type: 'string',
                required: true,
                default: '',
                displayOptions: {
                    show: { resource: ['link'], operation: ['get', 'update', 'delete'] },
                },
            },
            {
                displayName: 'URL',
                name: 'url',
                type: 'string',
                default: '',
                placeholder: 'https://example.com/new-destination',
                displayOptions: { show: { resource: ['link'], operation: ['update'] } },
            },
            {
                displayName: 'Fields to Set',
                name: 'updateFields',
                type: 'collection',
                placeholder: 'Add field',
                default: {},
                displayOptions: { show: { resource: ['link'], operation: ['update'] } },
                description: 'Updating a link replaces every optional setting that is not sent. Fill in each field you want to keep.',
                options: [
                    {
                        displayName: 'Custom Alias',
                        name: 'custom',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Description',
                        name: 'description',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Domain',
                        name: 'domain',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Expiry',
                        name: 'expiry',
                        type: 'dateTime',
                        default: '',
                    },
                    {
                        displayName: 'Meta Description',
                        name: 'metadescription',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Meta Title',
                        name: 'metatitle',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Password',
                        name: 'password',
                        type: 'string',
                        typeOptions: { password: true },
                        default: '',
                    },
                ],
            },
            {
                displayName: 'Return All',
                name: 'returnAll',
                type: 'boolean',
                default: false,
                description: 'Whether to return all results or only up to a given limit',
                displayOptions: {
                    show: { resource: ['link', 'domain', 'webhook'], operation: ['getAll'] },
                },
            },
            {
                displayName: 'Limit',
                name: 'limit',
                type: 'number',
                default: 50,
                typeOptions: { minValue: 1, maxValue: 100 },
                description: 'Max number of results to return',
                displayOptions: {
                    show: {
                        resource: ['link', 'domain', 'webhook'],
                        operation: ['getAll'],
                        returnAll: [false],
                    },
                },
            },
            {
                displayName: 'Filters',
                name: 'filters',
                type: 'collection',
                placeholder: 'Add filter',
                default: {},
                displayOptions: { show: { resource: ['link'], operation: ['getAll'] } },
                options: [
                    {
                        displayName: 'Search',
                        name: 'q',
                        type: 'string',
                        default: '',
                        description: 'Match the destination URL, alias or title',
                    },
                    {
                        displayName: 'Order By',
                        name: 'order',
                        type: 'options',
                        options: [
                            { name: 'Clicks', value: 'click' },
                            { name: 'Newest First', value: 'date' },
                        ],
                        default: 'date',
                    },
                ],
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: { show: { resource: ['domain'] } },
                options: [
                    {
                        name: 'Get Many',
                        value: 'getAll',
                        description: 'List connected domains',
                        action: 'Get many domains',
                    },
                ],
                default: 'getAll',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: { show: { resource: ['account'] } },
                options: [
                    {
                        name: 'Get',
                        value: 'get',
                        description: 'Read the account, plan and usage',
                        action: 'Get the account',
                    },
                ],
                default: 'get',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: { show: { resource: ['webhook'] } },
                options: [
                    {
                        name: 'Create',
                        value: 'create',
                        description: 'Subscribe an endpoint to events',
                        action: 'Create a webhook',
                    },
                    {
                        name: 'Delete',
                        value: 'delete',
                        description: 'Remove a subscription',
                        action: 'Delete a webhook',
                    },
                    {
                        name: 'Get Many',
                        value: 'getAll',
                        description: 'List subscriptions',
                        action: 'Get many webhooks',
                    },
                    {
                        name: 'Test',
                        value: 'test',
                        description: 'Send a ping and report the endpoint response',
                        action: 'Test a webhook',
                    },
                ],
                default: 'getAll',
            },
            {
                displayName: 'Webhook ID',
                name: 'webhookId',
                type: 'string',
                required: true,
                default: '',
                displayOptions: { show: { resource: ['webhook'], operation: ['delete', 'test'] } },
            },
            {
                displayName: 'Endpoint URL',
                name: 'endpointUrl',
                type: 'string',
                required: true,
                default: '',
                placeholder: 'https://example.com/hooks/kualat',
                displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
            },
            {
                displayName: 'Events',
                name: 'events',
                type: 'multiOptions',
                required: true,
                default: ['link.created'],
                typeOptions: { loadOptionsMethod: 'getEvents' },
                displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
            },
            {
                displayName: 'Label',
                name: 'webhookName',
                type: 'string',
                default: '',
                displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
            },
        ],
    };

    methods = {
        loadOptions: {
            async getEvents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                const response = await kualatApiRequest.call(this, 'GET', '/webhooks/events');
                const events = (response?.data ?? []) as IDataObject[];

                return events.map((event) => ({
                    name: String(event.label ?? event.event),
                    value: String(event.event),
                }));
            },
        },
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            const resource = this.getNodeParameter('resource', i) as string;
            const operation = this.getNodeParameter('operation', i) as string;

            try {
                if (resource === 'link') {
                    if (operation === 'create') {
                        const body: IDataObject = {
                            url: this.getNodeParameter('url', i) as string,
                            ...compact(this.getNodeParameter('additionalFields', i, {}) as IDataObject),
                        };

                        const response = await kualatApiRequest.call(this, 'POST', '/links', body);
                        returnData.push({ json: response.data as IDataObject });
                        continue;
                    }

                    if (operation === 'get') {
                        const linkId = this.getNodeParameter('linkId', i) as string;
                        const response = await kualatApiRequest.call(this, 'GET', `/links/${linkId}`);
                        returnData.push({ json: response.data as IDataObject });
                        continue;
                    }

                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i) as boolean;
                        const filters = compact(this.getNodeParameter('filters', i, {}) as IDataObject);

                        if (returnAll) {
                            const links = await kualatApiRequestAllItems.call(this, '/links', filters);

                            for (const link of links) {
                                returnData.push({ json: link });
                            }

                            continue;
                        }

                        const limit = this.getNodeParameter('limit', i) as number;
                        const response = await kualatApiRequest.call(this, 'GET', '/links', {}, { ...filters, limit });

                        for (const link of (response.data ?? []) as IDataObject[]) {
                            returnData.push({ json: link });
                        }

                        continue;
                    }

                    if (operation === 'update') {
                        const linkId = this.getNodeParameter('linkId', i) as string;
                        const body: IDataObject = compact({
                            url: this.getNodeParameter('url', i, '') as string,
                            ...compact(this.getNodeParameter('updateFields', i, {}) as IDataObject),
                        });

                        const response = await kualatApiRequest.call(this, 'PATCH', `/links/${linkId}`, body);
                        returnData.push({ json: response.data as IDataObject });
                        continue;
                    }

                    if (operation === 'delete') {
                        const linkId = this.getNodeParameter('linkId', i) as string;

                        await kualatApiRequest.call(this, 'DELETE', `/links/${linkId}`);

                        returnData.push({ json: { id: linkId, deleted: true } });
                        continue;
                    }
                }

                if (resource === 'domain' && operation === 'getAll') {
                    const returnAll = this.getNodeParameter('returnAll', i) as boolean;
                    const domains = returnAll
                        ? await kualatApiRequestAllItems.call(this, '/domains')
                        : ((
                              await kualatApiRequest.call(
                                  this,
                                  'GET',
                                  '/domains',
                                  {},
                                  { limit: this.getNodeParameter('limit', i) as number },
                              )
                          ).data ?? []);

                    for (const domain of domains as IDataObject[]) {
                        returnData.push({ json: domain });
                    }

                    continue;
                }

                if (resource === 'account' && operation === 'get') {
                    const response = await kualatApiRequest.call(this, 'GET', '/account');
                    returnData.push({ json: response.data as IDataObject });
                    continue;
                }

                if (resource === 'webhook') {
                    if (operation === 'getAll') {
                        const returnAll = this.getNodeParameter('returnAll', i) as boolean;
                        const webhooks = returnAll
                            ? await kualatApiRequestAllItems.call(this, '/webhooks')
                            : ((
                                  await kualatApiRequest.call(
                                      this,
                                      'GET',
                                      '/webhooks',
                                      {},
                                      { limit: this.getNodeParameter('limit', i) as number },
                                  )
                              ).data ?? []);

                        for (const webhook of webhooks as IDataObject[]) {
                            returnData.push({ json: webhook });
                        }

                        continue;
                    }

                    if (operation === 'create') {
                        const body: IDataObject = {
                            url: this.getNodeParameter('endpointUrl', i) as string,
                            events: this.getNodeParameter('events', i) as string[],
                            ...compact({ name: this.getNodeParameter('webhookName', i, '') as string }),
                        };

                        const response = await kualatApiRequest.call(this, 'POST', '/webhooks', body);
                        returnData.push({ json: response.data as IDataObject });
                        continue;
                    }

                    if (operation === 'test') {
                        const webhookId = this.getNodeParameter('webhookId', i) as string;
                        const response = await kualatApiRequest.call(this, 'POST', `/webhooks/${webhookId}/test`);
                        returnData.push({ json: response.data as IDataObject });
                        continue;
                    }

                    if (operation === 'delete') {
                        const webhookId = this.getNodeParameter('webhookId', i) as string;

                        await kualatApiRequest.call(this, 'DELETE', `/webhooks/${webhookId}`);

                        returnData.push({ json: { id: webhookId, deleted: true } });
                        continue;
                    }
                }

                throw new NodeOperationError(this.getNode(), `Unsupported operation "${operation}" for resource "${resource}".`);
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: (error as Error).message }, pairedItem: i });
                    continue;
                }

                throw error;
            }
        }

        return [returnData];
    }
}
