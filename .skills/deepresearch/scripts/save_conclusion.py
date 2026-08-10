#!/usr/bin/env python3
"""Save a task/reflection conclusion with structural field validation (no word limit).

After saving a task conclusion, updates 研究任务.json status:
- current task → completed
- next task → in_progress
"""

import argparse
import json
import os
import re
import shutil
import sys


# --- 自动推断项目根路径（不依赖 cwd）---
# 本脚本位置：<project_root>/.skills/deepresearch/scripts/save_conclusion.py
# 项目根：向上 3 级
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", ".."))
DEFAULT_OUTPUT_DIR = os.path.join(DEFAULT_PROJECT_ROOT, "outputs")


# --- Required section patterns per conclusion type ---
TASK_REQUIRED = [
    (r"###\s*✅?\s*任务\s*\d+", "任务标题（### ✅ 任务 N ...）"),
    (r"\*\*对应章节\*\*", "**对应章节**"),
    (r"\*\*核心发现\*\*", "**核心发现**"),
    (r"\*\*定量数据\*\*", "**定量数据**"),
    (r"\*\*洞察\*\*", "**洞察**"),
    (r"\*\*意外发现\s*/\s*争议\*\*", "**意外发现 / 争议**"),
    (r"\*\*信息缺口\*\*", "**信息缺口**"),
    (r"\*\*引用来源\*\*", "**引用来源**"),
]

REFLECTION_REQUIRED = [
    (r"###\s*🔄?\s*阶段\s*5\s*反思补充（第\s*\d+\s*轮）", "反思标题（### 🔄 阶段 5 反思补充（第 N 轮））"),
    (r"\*\*本轮检查发现\*\*", "**本轮检查发现**"),
    (r"\*\*处理决策\*\*", "**处理决策**"),
]


def die(msg):
    print(f"ERROR: {msg}", file=sys.stderr)
    print("请修正上述问题后重新调用 save_conclusion.py。", file=sys.stderr)
    sys.exit(1)


def count_words(content):
    """Rough word count: Chinese chars + English words, excluding references section."""
    body = re.sub(r"\*\*引用来源\*\*.*$", "", content, flags=re.DOTALL)
    zh = len(re.findall(r"[\u4e00-\u9fff]", body))
    en = len(re.findall(r"[a-zA-Z]+", body))
    return zh + en


def validate(content, ctype):
    required = TASK_REQUIRED if ctype == "task" else REFLECTION_REQUIRED
    missing = [label for pattern, label in required if not re.search(pattern, content)]
    if missing:
        die(f"缺少必填字段: {', '.join(missing)}")


def resolve_target(args):
    if args.type == "task":
        target_dir = os.path.join(args.output_dir, "conclusions")
        target = os.path.join(target_dir, f"task_{args.task_id}.md")
        label = f"task_{args.task_id}.md"
    else:
        target_dir = os.path.join(args.output_dir, "reflection")
        target = os.path.join(target_dir, f"round_{args.round}.md")
        label = f"reflection/round_{args.round}.md"
    return target_dir, target, label


def resolve_output_dir(raw_output_dir):
    """把 --output-dir 参数解析为绝对路径，并对可疑相对路径发出警告。"""
    if os.path.isabs(raw_output_dir):
        return raw_output_dir
    abs_path = os.path.abspath(raw_output_dir)
    print(
        f"WARNING: --output-dir 是相对路径 ({raw_output_dir!r}), "
        f"已按当前 cwd 拼接为绝对路径 {abs_path!r}。"
        f"若结果与预期项目根不符，请显式传入绝对路径。",
        file=sys.stderr,
    )
    return abs_path


def main():
    parser = argparse.ArgumentParser(description="Save task or reflection conclusion with validation.")
    parser.add_argument("--type", choices=["task", "reflection"], required=True,
                        help="task = 任务结论, reflection = 阶段 5 反思结论")
    parser.add_argument("--task-id", type=int, help="任务编号（--type task 时必填）")
    parser.add_argument("--round", type=int, help="反思轮次（--type reflection 时必填）")
    parser.add_argument("--content-file", help="草稿 markdown 文件路径（若不提供则从 stdin 读取）")
    parser.add_argument("--force", action="store_true", help="覆盖已有文件（自动备份到 .bak）")
    parser.add_argument(
        "--output-dir",
        default=DEFAULT_OUTPUT_DIR,
        help=f"输出根目录（默认基于脚本位置自动推断：{DEFAULT_OUTPUT_DIR}）",
    )
    args = parser.parse_args()

    if args.type == "task" and args.task_id is None:
        die("--type=task 时必须指定 --task-id")
    if args.type == "reflection" and args.round is None:
        die("--type=reflection 时必须指定 --round")

    # 从 --content-file 或 stdin 读取内容
    if args.content_file:
        if not os.path.isfile(args.content_file):
            die(f"草稿文件不存在: {args.content_file}")
        with open(args.content_file, "r", encoding="utf-8") as f:
            content = f.read().strip()
    else:
        content = sys.stdin.read().strip()
    if not content:
        die("内容为空（未通过 --content-file 提供文件，stdin 也无输入）")

    validate(content, args.type)

    # 解析 output-dir 为绝对路径
    args.output_dir = resolve_output_dir(args.output_dir)

    target_dir, target, label = resolve_target(args)
    os.makedirs(target_dir, exist_ok=True)

    if os.path.exists(target):
        if not args.force:
            die(f"文件已存在: {target}（如需覆盖，加 --force）")
        shutil.copy2(target, target + ".bak")

    with open(target, "w", encoding="utf-8") as f:
        f.write(content + "\n")

    wc = count_words(content)
    print(f"OK: 已保存 {label}（约 {wc} 字，绝对路径 {target}）")

    # 更新研究任务.json 状态（仅 task 类型）
    if args.type == "task":
        try:
            update_task_plan_status(args.output_dir, args.task_id)
        except Exception as exc:
            print(f"WARNING: 更新研究任务.json 状态失败: {exc}", file=sys.stderr)


def update_task_plan_status(output_dir, completed_task_id):
    """将当前任务标记为 completed，下一个任务标记为 in_progress。"""
    plan_path = os.path.join(output_dir, "研究任务.json")
    if not os.path.isfile(plan_path):
        return

    with open(plan_path, "r", encoding="utf-8") as f:
        plan_data = json.load(f)

    steps = plan_data.get("plan", {}).get("steps", [])
    if not steps:
        return

    modified = False
    for i, step in enumerate(steps):
        step_num = int(re.search(r"\d+", step.get("id", "0")).group())
        if step_num == completed_task_id and step.get("status") != "completed":
            step["status"] = "completed"
            modified = True
        elif step_num == completed_task_id + 1 and step.get("status") == "pending":
            step["status"] = "in_progress"
            modified = True

    if modified:
        plan_data["last_updated_at"] = _now_iso()
        with open(plan_path, "w", encoding="utf-8") as f:
            json.dump(plan_data, f, ensure_ascii=False, indent=2)
        print(f"OK: 研究任务.json 已更新（task-{completed_task_id} → completed）")


def _now_iso():
    """返回当前 ISO 时间戳。"""
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


if __name__ == "__main__":
    main()

