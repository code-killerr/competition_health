"""把一个 PDF 通过 Docling 转成 lab-knowledge-local 的有版本 JSON。"""

from __future__ import annotations

import importlib.metadata
import json
import sys
from pathlib import Path
from typing import Any

from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling_core.types.doc.items.table.table import TableItem
from docling_core.types.doc.items.text import SectionHeaderItem, TitleItem


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: docling_runner.py <input.pdf>", file=sys.stderr)
        return 2

    input_path = Path(sys.argv[1])
    try:
        # 第一轮只接受带文本层的 PDF，关闭 OCR 和表格模型以保证本地 CPU 链路可运行。
        converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(
                    pipeline_options=PdfPipelineOptions(
                        do_ocr=False,
                        do_table_structure=False,
                        force_backend_text=True,
                    ),
                ),
            },
        )
        result = converter.convert(input_path)
        blocks = []
        for index, (item, _level) in enumerate(result.document.iterate_items(), start=1):
            if isinstance(item, (SectionHeaderItem, TitleItem)):
                text = item.text.strip()
                if text:
                    blocks.append({
                        "kind": "heading",
                        "location": location(item, index),
                        "content": text,
                        "page": page_number(item),
                        "level": heading_level(item),
                    })
            elif isinstance(item, TableItem):
                blocks.extend(table_blocks(item, index))
            elif hasattr(item, "text"):
                text = str(item.text).strip()
                if text:
                    blocks.append({
                        "kind": "text",
                        "location": location(item, index),
                        "content": text,
                        "page": page_number(item),
                    })

        payload = {
            "schemaVersion": 1,
            "parser": {"name": "docling", "version": docling_version()},
            "blocks": blocks,
        }
        json.dump(payload, sys.stdout, ensure_ascii=False, separators=(",", ":"))
        sys.stdout.write("\n")
        return 0
    except Exception as error:  # 通过进程退出码向 Host 报告 runner 失败
        print(f"docling conversion failed: {error}", file=sys.stderr)
        return 1


def docling_version() -> str:
    try:
        return importlib.metadata.version("docling")
    except importlib.metadata.PackageNotFoundError:
        return "unknown"


def page_number(item: Any) -> int | None:
    provenance = getattr(item, "prov", None) or []
    return getattr(provenance[0], "page_no", None) if provenance else None


def location(item: Any, index: int) -> str:
    page = page_number(item)
    return f"page:{page}:item:{index}" if page is not None else f"item:{index}"


def heading_level(item: Any) -> int:
    value = getattr(item, "level", 1)
    return value if isinstance(value, int) and value > 0 else 1


def table_blocks(item: TableItem, index: int) -> list[dict[str, Any]]:
    grid = getattr(getattr(item, "data", None), "grid", None)
    rows = []
    for row in grid or []:
        rows.append([str(getattr(cell, "text", "")).strip() for cell in row])
    rows = [row for row in rows if any(cell for cell in row)]
    if len(rows) < 2:
        return []
    headers = rows[0]
    if not any(headers):
        return []
    blocks = []
    for row_number, row in enumerate(rows[1:], start=1):
        content = " | ".join(
            f"{header}: {row[column] if column < len(row) else ''}".strip()
            for column, header in enumerate(headers)
            if header
        )
        if content:
            blocks.append({
                "kind": "table",
                "location": f"{location(item, index)}:row:{row_number}",
                "content": content,
                "page": page_number(item),
                "tableHeaders": headers,
                "tableRow": row_number,
            })
    return blocks


if __name__ == "__main__":
    raise SystemExit(main())
