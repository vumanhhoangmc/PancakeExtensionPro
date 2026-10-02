# Ghi chú cho AI tiếp quản

Đọc `PROJECT_HANDOFF.md` trước khi sửa mã; `README.md` dành cho người dùng. Đây là extension Chrome Manifest V3 không có build step. Các file hoạt động chính là `content.js`, `product-summary.js`, `pricing.js`, `popup.js` và `manifest.json`.

Giữ năm tính năng có công tắc riêng. Extension **không tự tích Miễn phí giao hàng**. Tự điều chỉnh giá Miến Sâm đọc kg từ tên và số lượng sản phẩm, dùng bảng giá trong `pricing.js`, rồi chỉ điền **Giảm giá** khi tổng tiền cao hơn mốc. Nút Tạo đơn nằm trong `.crm-platform .box-footer`, ngoài `.view-order`. Tín hiệu đơn mới đáng tin cậy là ID mới trong `.crm-platform .recent-orders`; đừng chỉ chờ tin nhắn chat. Tag đang tích có `.ellipse`; sau tạo đơn chỉ giữ **Đã Lên Đơn** và **Đã Gửi**.

Kiểm tra cú pháp bằng `node --check content.js` và `node --check popup.js`; kiểm tra phép tính bằng `node --test product-summary.test.js pricing.test.js`. Đối chiếu bộ chọn trên giao diện Pancake đang đăng nhập trước khi sửa luồng DOM. Không tạo đơn thật chỉ để thử mã. Cập nhật `README.md` và `PROJECT_HANDOFF.md` khi thay đổi hành vi.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **PancakeExtensionPro** (103 symbols, 276 relationships, 14 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/PancakeExtensionPro/context` | Codebase overview, check index freshness |
| `gitnexus://repo/PancakeExtensionPro/clusters` | All functional areas |
| `gitnexus://repo/PancakeExtensionPro/processes` | All execution flows |
| `gitnexus://repo/PancakeExtensionPro/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
