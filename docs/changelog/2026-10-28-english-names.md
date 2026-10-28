# 2026-10-28 — Đổi tên danh từ sang tiếng Anh

Phiếu 052, worktree `games/.wt-ts-names`, nhánh `ts-names`, từ `main` tại `ea8e0f9`. Theo bảng tên của repo cha `docs/games/NAMES_EN.md` và quyết định của Claude ngày 27/10/2026.

- Súng: XUNG → Pulse Gun, TIA → Heat Beam, TÁN → Scatter Gun, RAY → Rail Gun, PHÁO SAO → Star Mortar.
- Quái: Bầy → Swarm, Lính → Scout, Trâu → Brute, Khiên → Shield Guard, Tách → Splitter, Mảnh → Shard, Đầu Đàn → Pack Leader.
- Hiểm họa Vết nứt → Rift. Tên ải Đầu Đàn, Vách nứt, Khiên sáng giữ tiếng Việt; giữ Giáp, Vỏ, lượng khiên, chế độ và tên phe Bầy Hố Đen.

Đổi 50 dòng nguồn trong `src/app/{journey,main,results}.ts`, `src/content/{balance,foes,guns,stage-rules}.ts`, `src/view/{hud,screens-journey}.ts`: tên, bảng khắc chế, mô tả, mục tiêu Săn, biển rút lui và cảnh báo Rift. Có 66 lượt tên–dòng, gồm 60 lượt của 12 tên trong bảng và 6 lượt Rift đã chốt bổ sung.

Thêm nghĩa Việt trong ngoặc vào mô tả đang có ở thẻ súng, danh sách quái trong bản giới thiệu ải, thẻ MỚI và mô tả Rift. Dòng mô tả Swarm ghép thêm tiền tố trước số máu động; không đổi số hay cách tính. Không có hàm rút gọn tên cần sửa, không thêm thành phần giao diện.

Không có assert/fixture trong danh sách test cần đổi. Đồng bộ 3 dòng kiểm tên hiển thị trong `scripts/visual/scenarios/survival-s1-loadout.mjs` (Brute, Rail Gun, Pulse Gun, Scatter Gun), giữ logic kiểm. Script đạt `node --check`; chưa chạy trình duyệt theo phạm vi phiếu.

Kiểm trên worktree: `pnpm check` đạt **142/142 test, 14/14 file**, gồm **18 ca golden Trận thử**; kit 59 file, typecheck và build đạt. Build còn cảnh báo chunk trên 500 kB. `scripts/chapter-hashes.ts` trước/sau đều có 152 dòng, `diff -u` rỗng, exit 0. SHA-256 đầu ra cả hai: `ae7e9859269b2aece6a7bacbd946dfa93b9a131aeb68a5f5dbed97830dfe626e`.

Rà AST từ bảng tên: 0 chỗ sót trong 9 file chứa literal; 0 id/khóa khác trên 636 mục của 9 file nội dung. Golden, từ phải gõ, id, đường dẫn asset và các file `src/view/fx*`, `src/view/glows*` giữ nguyên. Báo cáo đầy đủ ở repo cha: `docs/codex-queue/052-report.md`.

Claude cần kiểm Pulse Gun, Heat Beam, Scatter Gun, Rail Gun, Shield Guard và các mô tả có nghĩa Việt mới trong trình duyệt trước commit; lượt này chưa xác nhận bố cục.
