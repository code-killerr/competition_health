# @deepseek-ai/dsh-experimental-lab-knowledge-local

[English](README.md) | 中文

第一阶段 Provider-owned 本地知识库。它在 SQLite 中保存不可变资料内容和文档元数据，使用 FTS5 为文本区块建索引，返回带版本的引用，并支持重建派生索引。

第一增量支持类文本文件和 CSV/TSV 字节。分隔文本会保留每个非空行及稳定的列元数据，并处理带引号的字段。PDF 通过 opt-in 的本地 `DoclingAdapter` 解析；没有配置该适配器时，PDF 会保留为失败导入，不会猜测生成文本。

## 本地 Docling PDF 录入

适配器通过 Harness subprocess 服务启动受信任的 Python runner，不调用远程 PDF 服务，也不接受浏览器或 Agent 输入的可执行路径、shell 参数。第一轮部署统一使用 Python 3.13.x；使用实验 `lab-mvp` bundle 时配置 `docling: {}` 即可采用包内 runner，也可以为 Python 3.13 虚拟环境配置部署自有的 `pythonCommand` 和 `runnerPath`。运行环境需要单独安装 `docling`；此 TypeScript 包不捆绑 Python 或 Docling。

在仓库根目录设置代理后运行 `pnpm run docling:setup`。该命令会创建 `.venv`、校验 Python 3.13.x，并安装 `runtime/requirements.txt` 中的依赖。然后执行 `export DOCLING_PYTHON="$PWD/.venv/bin/python"`，启动实验室 bundle，再运行 `pnpm run docling:smoke`，即可使用真实 Adapter 解析当前仓库中第一个可用的 PDF fixture。Docling 首次转换可能下载模型文件并初始化 CPU 模型，Adapter 默认超时为 10 分钟，也可以在受信任部署配置中覆盖，因此 smoke 运行也要保留相同的代理环境变量。

包内第一轮 runner 使用 Docling 的快速文本层路径：支持文本型 PDF、标题和段落，不启动 OCR 或表格结构模型。Adapter 协议已经可以接收经过校验的基础表格行，后续增加表格 pipeline profile 时可以复用。原始 PDF 字节仍由现有 SQLite/FTS5 和引用流程保存并索引。只有 OCR 的 PDF 会返回 `DOCLING_NO_TEXT`；OCR、坐标高亮、表格恢复和模型增强留到后续轮次。导入状态会暴露稳定的 `errorCode`，例如 `PDF_INPUT_INVALID`、`DOCLING_RUNTIME_UNAVAILABLE`、`DOCLING_TIMEOUT`、`DOCLING_PROCESS_FAILED` 和 `DOCLING_OUTPUT_INVALID`。

## 模型体验

### 受控实验上下文

#### 模型看到的内容

模型通过类型化服务或 `lab_*` 工具看到已批准计划、受控运行状态和有边界的观察结果。

#### Token 影响

仅返回请求的计划字段、当前步骤状态和有边界的证据；本地存储细节留在宿主侧。

#### KV Cache 影响

实验、计划、Skill 修订和运行 id 保持稳定，使重复步骤结果保持紧凑并利于复用前缀。
## 已知限制与暂缓事项

- 本实验包提供本地类型化能力，不承诺生产持久化、恢复或硬件集成。
- SQLite 打开后使用同步 API，面向本地原型。
