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

## Claude kiểm trong trình duyệt (28/10)

Vite riêng 127.0.0.1:4167. Chụp ở 1280 × 720 và 1920 × 1080, cả bốn kịch bản đạt ở hai cỡ sau khi sửa: `survival-s1-loadout` (18/18 kiểm), `survival-s1-hazards`, `survival-s1-stage` (replay Node khớp hash), `survival-feel` (`SCENES=layout`), cùng một kịch bản một lần (không commit) đi qua màn chính ở ba chế độ, cài đặt, danh sách ải đã mở, giới thiệu và nạp súng ải 2–4, thẻ vào trận ải 2, thẻ MỚI Brute, Pack Leader, Shield Guard, Rift, biển Săn, màn thua. Một phép đo trong trang tìm chữ tràn hộp, ra ngoài khung và số dòng của từng tên. Splitter không có ải nào dạy nên thẻ MỚI của nó được viết vào đúng hộp để đo; biển "Swarm RÚT LUI" và băng "Swarm RÚT LUI!" vừa đo như vậy, vừa thấy thật trong `survival-s1-stage` (ải 2 thắng ở 1:51, 3/3 Pack Leader, cả hai cỡ).

- Lỗi do tên dài: ở màn nạp súng, thẻ đã chọn có nhãn "BẾN n" cạnh tên nên "Scatter Gun" và "Star Mortar" gãy làm hai dòng ("Scatter / Gun"), nhãn "BẾN 1 · RÈN 2" cũng gãy, ở cả hai cỡ. Sửa: đầu thẻ cho xuống hàng (`flex-wrap`), tên và nhãn giữ liền (`nowrap`); nhãn nào không vừa thì xuống dưới tên, canh phải. `survival-s1-loadout` thêm kiểm `cardNamesOneLine` (5 tên, mỗi tên 1 dòng).
- Kho súng: tên và mô tả ngắn giữ liền, mô tả không vừa thì xuống dòng nguyên cụm (trước đó còn "lùi", "thanh" rơi lẻ một dòng ở 1280 × 720).
- Bỏ nghĩa Việt trong ngoặc ở 5 mô tả súng: mô tả ngay dưới tên đã là nghĩa Việt, nên thành lặp ("(tia nhiệt) tia nhiệt quét", "(súng ray) súng ray xuyên hàng") và đẩy mô tả xuống hai dòng ở 4 thẻ.
- Hai kịch bản còn tìm tên cũ: `survival-s1-stage` (biển "ĐẦU ĐÀN …" / "BẦY RÚT LUI") và `survival-s1-hazards` ("VẾT NỨT") nay tìm "Pack Leader … / Swarm RÚT LUI" và "Rift".

Vừa khung, không tràn ở cả hai cỡ: tên súng trên bến (cả "Star Mortar"), thẻ vào trận "Pulse Gun · Scatter Gun", biển "Pack Leader 2/3 · LỌT 1/2", 4 thẻ MỚI (dài nhất là Shield Guard: 480 px ở 1280 × 720), "⚠ Rift · 2,3 s" và nhãn Rift cạnh dòng gõ, danh sách quái và mục tiêu Săn ở bản giới thiệu, bảng tỉ trọng, ghi chú Trận thử, chế độ và cài đặt, lời khuyên khi thua. Ghi chú Thư giãn xuống hai dòng như trước khi đổi tên (đo cả câu cũ "Bầy thưa…": cũng hai dòng).

Giữ như Codex: tên tiếng Anh viết theo kiểu chữ của nó cả trong biển HUD viết hoa ("Pack Leader 0/3 · LỌT 0/2", "Swarm RÚT LUI!", "MỚI · Brute · …"). `pnpm check` đạt 142/142 test, 14/14 file; băm chương 152 dòng trùng `ea8e0f9` (chạy lại trên bản xuất của `ea8e0f9`, SHA-256 `ae7e9859…e626e`); golden giữ nguyên.
