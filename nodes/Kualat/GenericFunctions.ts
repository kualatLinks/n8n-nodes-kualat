import { NodeApiError } from 'n8n-workflow';
import type {
    IDataObject,
    IExecuteFunctions,
    IHttpRequestMethods,
    IHttpRequestOptions,
    IHookFunctions,
    ILoadOptionsFunctions,
    IWebhookFunctions,
    JsonObject,
} from 'n8n-workflow';

type ApiCaller = IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions;

export function baseUrlOf(credentials: IDataObject): string {
    return String(credentials.baseUrl ?? '').replace(/\/+$/, '');
}

export async function kualatApiRequest(
    this: ApiCaller,
    method: IHttpRequestMethods,
    endpoint: string,
    body: IDataObject = {},
    query: IDataObject = {},
): Promise<any> {
    const options: IHttpRequestOptions = {
        method,
        url: `${baseUrlOf((await this.getCredentials('kualatApi')) as IDataObject)}${endpoint}`,
        json: true,
    };

    if (Object.keys(query).length > 0) {
        options.qs = query;
    }

    if (Object.keys(body).length > 0) {
        options.body = body;
    }

    try {
        return await this.helpers.httpRequestWithAuthentication.call(this, 'kualatApi', options);
    } catch (error) {
        // Surfaces the RFC 7807 detail from the API instead of a bare status code.
        throw new NodeApiError(this.getNode(), error as unknown as JsonObject);
    }
}

export async function kualatApiRequestAllItems(
    this: IExecuteFunctions,
    endpoint: string,
    query: IDataObject = {},
): Promise<IDataObject[]> {
    const results: IDataObject[] = [];
    let page = 1;
    let totalPages = 1;

    do {
        const response = await kualatApiRequest.call(this, 'GET', endpoint, {}, { ...query, page, limit: 100 });

        results.push(...((response?.data ?? []) as IDataObject[]));

        totalPages = Number(response?.meta?.pagination?.total_pages ?? 1);
        page += 1;
    } while (page <= totalPages);

    return results;
}
