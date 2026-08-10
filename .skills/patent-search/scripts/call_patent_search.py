#!/usr/bin/env python3
"""Call patent list/detail APIs and print one JSON line."""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


ENDPOINTS = {
    "list": "https://app-dm7baw05jabl-api-79jKP8yo70AL-gateway.appmiaoda.com/enterprise/patent/list",
    "detail": "https://app-dm7baw05jabl-api-eLMlJ2jB4oj9-gateway.appmiaoda.com/enterprise/patent/detail",
}


def fail(message):
    """打印错误信息并以非零状态退出。"""
    print(message, file=sys.stderr)
    sys.exit(1)


def load_json(resp):
    """读取响应体并解析为 JSON。"""
    text = resp.read().decode("utf-8", errors="replace")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        fail("Response is not valid JSON: " + text[:500])


def post_query(endpoint, params, timeout):
    """调用上游接口并返回响应。"""
    api_key = os.environ.get("INTEGRATIONS_API_KEY")
    if not api_key:
        fail("INTEGRATIONS_API_KEY is required")

    url = endpoint + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(
        url,
        data=b"",
        method="POST",
        headers={
            "Content-Type": "application/json;charset=UTF-8",
            "Accept": "application/json",
            "X-Gateway-Authorization": "Bearer " + api_key,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return load_json(resp)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        fail("HTTP %s: %s" % (exc.code, body[:1000]))
    except urllib.error.URLError as exc:
        fail("Network error: " + str(exc.reason))
    except TimeoutError:
        fail("Request timed out")


def main():
    """入口：调用专利列表或详情接口并打印结果。"""
    parser = argparse.ArgumentParser(description="Query patent list or detail.")
    sub = parser.add_subparsers(dest="command", required=True)

    list_parser = sub.add_parser("list", help="query patent list")
    list_parser.add_argument("--keyword", required=True, help="检索关键词")
    list_parser.add_argument("--page-no", default="1", help="页码，默认 1")
    list_parser.add_argument("--page-size", default="10", help="每页条数，默认 10，最大 10")
    list_parser.add_argument("--timeout", type=int, default=600, help="request timeout in seconds")

    detail_parser = sub.add_parser("detail", help="query patent detail")
    detail_parser.add_argument("--id", required=True, help="专利 ID")
    detail_parser.add_argument("--timeout", type=int, default=600, help="request timeout in seconds")

    args = parser.parse_args()
    if args.command == "list":
        params = {"keyword": args.keyword, "pageNo": args.page_no, "pageSize": args.page_size}
    else:
        params = {"id": args.id}

    result = post_query(ENDPOINTS[args.command], params, args.timeout)
    print(json.dumps({"status": "succeed", "result": result}, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main()
