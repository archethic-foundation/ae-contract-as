import * as JSONRPC from "../jsonrpc";

@json
export class HttpRequest {
    uri: string;
    method: Method = Method.GET;
    headers: HttpHeader[] = [];
    body: string = "";
}

@json
class HttpHeader {
    key: string;
    value: string;
}

@json
export class HttpResponse {
    status: number;
    body: string;
}

export enum Method {
    GET, //= "GET",
    PUT, //= "PUT",
    POST, //= "POST",
    PATCH, //= "PATCH",
    DELETE, //= "DELETE",
}

export function request(req: HttpRequest): HttpResponse {
    return JSONRPC
        .request<HttpRequest, HttpResponse>("request", req)
        .unwrap()
}

export function requestMany(reqs: HttpRequest[]): HttpResponse[] {
    return JSONRPC
        .request<HttpRequest[], HttpResponse[]>("requestMany", reqs)
        .unwrap()
}