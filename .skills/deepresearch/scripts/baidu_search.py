#!/usr/bin/env python3
"""Call the Baidu AI search (Qianfan ai_search) API and print one JSON result.

Observe:
    {
        "status", "log_file", "log_schema",
        "this_call": {"search_results": [{"phase", "query", "url", "title", "date", "website", "rerank_score", "preview"}]}
    }
Log:
    <project_root>/outputs/research/research_log.json
        {
        "search": [{"phase", "query", "recency_filter", "results": [{"url", "title", "snippet", "date", "website", ...}]}],
        "fetch": [{"phase", "url", "status", "content_file"}]
    }
Also checks/fixes 研究任务.json status based on conclusions/ directory.
"""

import argparse
import http.client
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request


# ENDPOINT = "https://app-dbg3596z1ce9-api-ELbWqrZ1krJY-gateway-evaluation.appmiaoda.com/v2/ai_search/chat/completions"
ENDPOINT = "https://api-rY7JZ6jqr6dL@app-dm7baw05jabl-api-ELbWqrZ1krJY-gateway.appmiaoda.com/v2/ai_search/chat/completions"

# 脚本位置 → 项目根（向上 3 级）
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", ".."))
LOG_DIR = os.path.join(DEFAULT_PROJECT_ROOT, "outputs")
RESEARCH_DIR = os.path.join(LOG_DIR, "research")

FIXED_TOP_K = 20
SNIPPET_PREVIEW_LEN = 150


def die(message):
    """打印错误信息并以非零状态退出。"""
    print(message, file=sys.stderr)
    sys.exit(1)


def load_log():
    """读取 log 文件，返回 (path, {search: [...], fetch: [...]}) 结构。"""
    log_file = os.path.join(RESEARCH_DIR, "research_log.json")
    log_data = {"search": [], "fetch": []}
    if os.path.isfile(log_file):
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                loaded = json.load(f)
            if isinstance(loaded, dict):
                if isinstance(loaded.get("search"), list):
                    log_data["search"] = loaded["search"]
                if isinstance(loaded.get("fetch"), list):
                    log_data["fetch"] = loaded["fetch"]
        except (json.JSONDecodeError, OSError) as exc:
            print(f"WARNING: 读取 log 文件失败，使用新文件: {exc}", file=sys.stderr)
    return log_file, log_data


def save_log(log_file, log_data):
    """将 log 数据写回文件。"""
    os.makedirs(RESEARCH_DIR, exist_ok=True)
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(log_data, f, ensure_ascii=False, indent=2)


def build_search_results(references):
    """保留 API 全部字段，snippet 存完整，剔除 content 字段。"""
    results = []
    for ref in references:
        entry = {k: v for k, v in ref.items() if k != "content"}
        entry["snippet"] = ref.get("snippet") or ref.get("content", "")
        results.append(entry)
    return results


def sync_task_plan_status():
    """检查 conclusions/ 目录，修复 研究任务.json 中不一致的状态。"""
    plan_path = os.path.join(LOG_DIR, "研究任务.json")
    if not os.path.isfile(plan_path):
        return

    conclusions_dir = os.path.join(LOG_DIR, "conclusions")

    # 找出已完成的 task id
    completed_ids = set()
    if os.path.isdir(conclusions_dir):
        for fname in os.listdir(conclusions_dir):
            m = re.match(r"task_(\d+)\.md$", fname)
            if m:
                completed_ids.add(int(m.group(1)))

    with open(plan_path, "r", encoding="utf-8") as f:
        plan_data = json.load(f)

    steps = plan_data.get("plan", {}).get("steps", [])
    if not steps:
        return

    modified = False

    if not completed_ids:
        # 没有任何 task 完成，确保 step-1 为 in_progress
        for step in steps:
            step_match = re.search(r"\d+", step.get("id", "0"))
            if step_match and int(step_match.group()) == 1:
                if step.get("status") == "pending":
                    step["status"] = "in_progress"
                    modified = True
                break
    else:
        for step in steps:
            step_match = re.search(r"\d+", step.get("id", "0"))
            if not step_match:
                continue
            step_num = int(step_match.group())

            if step_num in completed_ids and step.get("status") != "completed":
                step["status"] = "completed"
                modified = True
            elif step_num not in completed_ids and step_num == max(completed_ids) + 1:
                if step.get("status") == "pending":
                    step["status"] = "in_progress"
                    modified = True

    if modified:
        from datetime import datetime, timezone
        plan_data["last_updated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        with open(plan_path, "w", encoding="utf-8") as f:
            json.dump(plan_data, f, ensure_ascii=False, indent=2)
        print("INFO: 研究任务.json 状态已同步修复", file=sys.stderr)


def main():
    """入口：解析参数，调用搜索接口并输出结果 JSON。"""
    parser = argparse.ArgumentParser(description="Call Baidu AI search and print one JSON result.")
    parser.add_argument("--query", help="Single user query. Ignored when --messages is provided.")
    parser.add_argument("--messages", help="JSON array of {role, content} messages, overrides --query.")
    parser.add_argument("--resource-type", action="append", choices=["web", "video"], default=[],
                         help="Resource type to include, can repeat (web/video).")
    parser.add_argument("--search-recency-filter", choices=["week", "month", "semiyear", "year"],
                         help="Time filter for search recency.")
    parser.add_argument("--phase", required=True,
                         help="阶段标记（task-1, task-2, ..., reflection），决定 log 文件名")
    args = parser.parse_args()

    api_key = os.environ.get("INTEGRATIONS_API_KEY")
    if not api_key:
        die("Missing INTEGRATIONS_API_KEY environment variable")

    if args.messages:
        try:
            messages = json.loads(args.messages)
        except json.JSONDecodeError as exc:
            die(f"Invalid JSON for --messages: {exc}")
    elif args.query:
        messages = [{"role": "user", "content": args.query}]
    else:
        die("Either --query or --messages is required")

    body = {"messages": messages}
    body["resource_type_filter"] = [
        {"type": t, "top_k": FIXED_TOP_K}
        for t in (args.resource_type or ["web"])
    ]
    if args.search_recency_filter:
        body["search_recency_filter"] = args.search_recency_filter

    # Strip userinfo from ENDPOINT to avoid IDNA label-too-long errors
    _parsed_ep = urllib.parse.urlsplit(ENDPOINT)
    _netloc = _parsed_ep.hostname + (f":{_parsed_ep.port}" if _parsed_ep.port else "")
    _clean_endpoint = urllib.parse.urlunsplit((
        _parsed_ep.scheme, _netloc, _parsed_ep.path, _parsed_ep.query, ""
    ))

    request = urllib.request.Request(
        _clean_endpoint,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Gateway-Authorization": f"Bearer {api_key}",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=600) as response:
            data = json.loads(response.read().decode("utf-8", errors="replace"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        if exc.code == 402:
            die(f"HTTP 402: 账户余额不足 - {detail}")
        if exc.code == 429:
            die(f"HTTP 429: 调用配额超限 - {detail}")
        die(f"HTTP {exc.code}: {detail}")
    except urllib.error.URLError as exc:
        die(f"Search request failed: {exc.reason}")
    except http.client.HTTPException as exc:
        # IncompleteRead / ChunkedEncodingError 等协议层异常，兜底避免 traceback
        die(f"HTTP protocol error: {type(exc).__name__}: {exc}")

    references = data.get("references", [])
    search_results = build_search_results(references)

    # 检查/修复研究任务.json 状态
    try:
        sync_task_plan_status()
    except Exception as exc:
        print(f"WARNING: 状态同步失败: {exc}", file=sys.stderr)

    # 追加到 log 文件
    log_file, log_data = load_log()
    log_data["search"].append({
        "phase": args.phase,
        "query": args.query or json.dumps(messages, ensure_ascii=False),
        "recency_filter": args.search_recency_filter,
        "results": search_results,
    })
    try:
        save_log(log_file, log_data)
    except Exception as exc:
        print(f"WARNING: 写入 log 文件失败: {exc}", file=sys.stderr)

    # 返回给 LLM
    output = {
        "status": "succeed",
        "log_file": "outputs/research/research_log.json",
        "log_schema": "{search: [{phase, query, recency_filter, results: [{url, title, snippet, date, website, ...}]}], fetch: [{phase, url, status, content_file}]}",
        "this_call": {
            "search_results": [
                {
                    "phase": args.phase,
                    "query": args.query or json.dumps(messages, ensure_ascii=False),
                    "url": r.get("url", ""),
                    "title": r.get("title", ""),
                    "date": r.get("date", ""),
                    "website": r.get("website", ""),
                    "rerank_score": r.get("rerank_score"),
                    "preview": (r.get("snippet", "") or "")[:SNIPPET_PREVIEW_LEN],
                }
                for r in search_results
            ],
        },
    }
    print(json.dumps(output, ensure_ascii=False))


if __name__ == "__main__":
    main()