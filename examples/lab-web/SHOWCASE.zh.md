# 实验展示手册

本手册用五到十分钟展示一条连续的 Project 流程。流程使用公开 Knowledge 命令、现有 Project/Session Facade 和确定性的本地 Provider，不需要模型密钥。

## 准备

在仓库根目录构建并启动已记录的组合：

    pnpm run build
    pnpm dsh --profile web --patch examples/lab-web/cordis.patch.yml --no-open

打开终端打印的本地地址。测试输入可以从 [docs/change_plan/pdf_knowledge](../../docs/change_plan/pdf_knowledge) 选择 PDF；该目录中的文件是测试材料，不会被自动加载。

## 演示路径

1. 打开 Projects，输入项目名称并创建 Project。页面只读展示由流程生成的 Project 身份。
2. 打开 Knowledge，选择 PDF 并导入，等待版本状态显示为 READY，再点击该来源的“加入当前 Project”。
3. 输入与文档匹配的简短问题并检索，确认引用显示来源/版本和页码或区块位置。用已确认引用创建 SOP，填写审阅人，完成审阅并发布。
4. 打开 Conversations 描述实验目标，再打开 Experiments。规划区会显示检索到的引用；点击“生成计划”得到带引用的确定性 Plan，再按页面顺序完成校验和人工批准。
5. 打开 Runs，启动已批准的 Plan；Runtime 请求时推进步骤，填写证据并确认步骤。打开 Evidence 请求并查看报告。
6. 返回 Overview。摘要卡片显示已选 Knowledge 数量、计划数量、Run 状态和证据数量；“继续流程”会指向下一个待完成的人工操作。

## 预期状态

READY 表示来源已进入公开 Knowledge 检索路径。unavailable 表示能力未安装或暂时无法连接。空态表示当前 Project 或 Session 中还没有记录。确定性演示标识代表无密钥 fixture 行为，不代表生产模型、设备或远程执行能力。

## 故障恢复

录入或检索失败时，留在 Knowledge 页面检查能力状态并重试相同操作。没有 Project 时先创建或打开 Project，再加入来源。计划操作不可用时，回到 Knowledge 确认至少一条引用，再返回 Experiments。Run 操作不可用时，先完成页面显示的 Skill 和 Plan 审批门。JSON 预览只用于诊断，不作为主要操作路径。

## 可选真实能力检查

只有需要模型规划检查时才配置 DEEPSEEK_API_KEY。确定性路径应作为基线展示；缺少 Docling 或模型凭据时应报告为可选能力 skipped，不应呈现为生产能力成功。