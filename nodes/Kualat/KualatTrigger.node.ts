import { createHmac, timingSafeEqual } from 'node:crypto';

import { NodeOperationError } from 'n8n-workflow';
import type {
    IDataObject,
    IHookFunctions,
    ILoadOptionsFunctions,
    INodePropertyOptions,
    INodeType,
    INodeTypeDescription,
    IWebhookFunctions,
    IWebhookResponseData,
} from 'n8n-workflow';

import { kualatApiRequest } from './GenericFunctions';

const TOLERANCE_SECONDS = 300;

const SECRET_PREFIX = 'whsec_';

function secretKey(secret: string): Buffer {
    if (secret.startsWith(SECRET_PREFIX)) {
        const encoded = secret.slice(SECRET_PREFIX.length);

        if (encoded.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
            const decoded = Buffer.from(encoded, 'base64');

            if (decoded.length > 0) {
                return decoded;
            }
        }

        return Buffer.from(encoded, 'utf8');
    }

    return Buffer.from(secret, 'utf8');
}

async function removeSubscription(this: IHookFunctions, staticData: IDataObject): Promise<void> {
    const id = staticData.subscriptionId;

    delete staticData.subscriptionId;
    delete staticData.secret;

    if (!id) {
        return;
    }

    try {
        await kualatApiRequest.call(this, 'DELETE', `/webhooks/${id}`);
    } catch {
        // Intentionally ignored, see the doc comment above.
    }
}

function rawBody(this: IWebhookFunctions): string {
    const request = this.getRequestObject() as unknown as {
        rawBody?: Buffer | string | IDataObject;
    };
    const raw = request.rawBody;

    if (Buffer.isBuffer(raw)) {
        return raw.toString('utf8');
    }

    if (typeof raw === 'string') {
        return raw;
    }

    if (raw && typeof raw === 'object') {
        return JSON.stringify(raw);
    }

    throw new NodeOperationError(this.getNode(), 'The raw request body is not available, so the signature cannot be verified.');
}

function assertSignature(this: IWebhookFunctions, staticData: IDataObject): void {
    const secret = staticData.secret as string | undefined;

    if (!secret) {
        throw new NodeOperationError(
            this.getNode(),
            'This trigger has no signing secret yet. Deactivate and reactivate the workflow so it can register a subscription.',
        );
    }

    const headers = this.getHeaderData() as IDataObject;
    const id = String(headers['webhook-id'] ?? '');
    const timestamp = String(headers['webhook-timestamp'] ?? '');
    const signature = String(headers['webhook-signature'] ?? '');

    if (id === '' || signature === '' || !/^\d+$/.test(timestamp)) {
        throw new NodeOperationError(this.getNode(), 'The delivery is missing its Standard Webhooks headers.');
    }

    if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > TOLERANCE_SECONDS) {
        throw new NodeOperationError(this.getNode(), 'The delivery timestamp is outside the accepted window.');
    }

    const expected = createHmac('sha256', secretKey(secret))
        .update(`${id}.${timestamp}.${rawBody.call(this)}`)
        .digest('base64');

    for (const candidate of signature.split(' ')) {
        if (!candidate.startsWith('v1,')) {
            continue;
        }

        const received = candidate.slice(3);

        if (received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected))) {
            return;
        }
    }

    throw new NodeOperationError(this.getNode(), 'The delivery signature does not match the subscription secret.');
}

export class KualatTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Kualat Trigger',
        name: 'kualatTrigger',
        icon: 'file:kualat.svg',
        group: ['trigger'],
        version: 1,
        description: 'Starts the workflow when a link event happens in kua.lat',
        defaults: {
            name: 'Kualat Trigger',
        },
        inputs: [],
        outputs: ['main'],
        credentials: [
            {
                name: 'kualatApi',
                required: true,
            },
        ],
        webhooks: [
            {
                name: 'default',
                httpMethod: 'POST',
                responseMode: 'onReceived',
                path: 'kualat',
            },
        ],
        properties: [
            {
                displayName: 'Events',
                name: 'events',
                type: 'multiOptions',
                required: true,
                default: ['link.created'],
                typeOptions: {
                    loadOptionsMethod: 'getEvents',
                },
                description: 'Which link events start this workflow',
            },
            {
                displayName: 'Verify Signature',
                name: 'verify',
                type: 'boolean',
                default: true,
                description:
                    'Whether to reject requests whose Standard Webhooks signature does not match the subscription secret. Keep this on outside of testing.',
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

    async checkExists(this: IHookFunctions): Promise<boolean> {
        const staticData = this.getWorkflowStaticData('node');

        if (!staticData.subscriptionId) {
            return false;
        }

        try {
            const response = await kualatApiRequest.call(this, 'GET', `/webhooks/${staticData.subscriptionId}`);

            // A paused subscription still exists, but the workflow would never
            // fire, so treat it as missing and register a fresh one.
            return Boolean(response?.data?.active);
        } catch {
            return false;
        }
    }

    async create(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl('default') as string;
        const staticData = this.getWorkflowStaticData('node');

        await removeSubscription.call(this, staticData);

        const response = await kualatApiRequest.call(this, 'POST', '/webhooks', {
            name: `n8n: ${this.getNode().name}`.slice(0, 100),
            url: webhookUrl,
            events: this.getNodeParameter('events') as string[],
        });

        staticData.subscriptionId = response?.data?.id;
        staticData.secret = response?.data?.secret;

        if (!staticData.subscriptionId || !staticData.secret) {
            throw new NodeOperationError(this.getNode(), 'The API did not return a subscription id and signing secret.');
        }

        return true;
    }

    async delete(this: IHookFunctions): Promise<boolean> {
        await removeSubscription.call(this, this.getWorkflowStaticData('node'));

        return true;
    }

    async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
        const staticData = this.getWorkflowStaticData('node');

        if (this.getNodeParameter('verify', 0) as boolean) {
            assertSignature.call(this, staticData);
        }

        const body = this.getBodyData() as IDataObject;

        return {
            workflowData: [[{ json: body }]],
        };
    }
}
