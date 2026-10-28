# 29/10/2026 · Last Line · Toàn bộ giao diện bằng tiếng Anh

Phiếu 130 áp dụng quyết định ngôn ngữ của chủ dự án tối 28/10, thay luật 27/10. Tên trò chơi ở màn tựa, tiêu đề trang và trạng thái tải là **Last Line**; trang khai báo `lang="en"`. Menu, gợi ý phím, briefing, chọn ải, loadout, thẻ quái, HUD, banner, kết quả, hồ sơ gõ và mô tả súng đều chuyển sang tiếng Anh kiểu Mỹ. Nghĩa `vi` của từ đang học và danh sách từ dự phòng giữ nguyên.

Tên súng và quái giữ theo bảng tên chung: Pulse Gun, Heat Beam, Scatter Gun, Rail Gun, Star Mortar; Swarm, Scout, Brute, Shield Guard, Splitter, Shard, Pack Leader. Vanguard và Draconis giữ tên riêng. Máu tàu hiển thị Hull; Vỏ quái hiển thị armor. Các tên ải lần lượt là First Shift, Leader Hunt, Rift Wall, Shining Shields.

Bảy lời khuyên có bản tiếng Anh cục bộ ở `src/app/english.ts`; kit vẫn chọn cùng id lời khuyên. `FEEL.numbers.label` ghi đè riêng thành PERFECT. Không sửa bản chép kit. Diagnostic kiểm nội dung đổi thành `: more Forge levels than bays` ở lượt duyệt, nên test quét không còn miễn trừ nào ngoài kit và nghĩa từ dự phòng.

Kiểm tra trước/sau: `pnpm check` đạt 193 → 196 test, 20 → 21 file test; kit 59/59 file khớp manifest. `tests/s0-trace.test.ts` đạt 18/18. `scripts/chapter-hashes.ts` cho 152/152 dòng giống hệt, không sửa golden, số cân bằng, sim, id, event hay khóa lưu trữ. Test mới quét TS/JS, template, CSS và trang HTML, giữ ngoại lệ nghĩa từ trong FALLBACK và chú thích GLSL. Thêm tạm `Bắt đầu` vào file UI làm test đỏ; khôi phục file làm test xanh.

Rà nguồn độ dài menu: 5.304 lượt, 69 biến thể nhãn/ghi chú/giá trị, không trường nào dài hơn 120% bản cũ.

Báo cáo và các bảng duyệt ở **repo cha**: `docs/codex-queue/130-report.md`, `docs/codex-queue/130/{strings-before,strings,remaining}.md`.

## Claude duyệt (29/10)

Duyệt bảng chữ và diff, sửa thẳng trong worktree khoảng 80 chuỗi:

- **Còn sót tiếng Việt không dấu:** `Hunt 3 trong 5 Pack Leader` → `Hunt 3 of 5 Pack Leaders` (chọn ải, briefing, thẻ vào trận); `PICK 2 TRONG 5` → `PICK 2 OF 5` (loadout). Máy quét chỉ bắt chữ có dấu nên không thấy hai chỗ này.
- **Nhãn viết tắt bỏ:** Rig → Ship, BGM → Music, Med/Hi → Medium/High, Lv 2 → Stage 2, KO → Kills (kết quả), `KO / 3 s` → `kills / 3 s`, MAX → FULL (băng đầy), PAST → ESCAPED (Pack Leader lọt).
- **Trùng nghĩa:** luật học `Gaps` trùng nút `START · GAPS ⚠` (mối đe dọa chưa có súng khắc). Luật học thành `Missing letters`, nút thành `START · ⚠ UNCOVERED`; `Normal` → `Standard`, dòng ải `Rule Normal` → `Words: Standard`.
- **Câu máy:** `Flawless words face 75 % armor…` → `Flawless words pierce armor (it blocks only 75%) and crit more often…`; `End Stage 2 to start a new trial` → `Abandon Stage 2 for a new trial`; `vs:`/`bad:` trên thẻ súng → `Strong:`/`Weak:`; `vs:` trong bảng quái → `Best:`; kết quả hồ sơ, hint `Enter play` ở tạm dừng/kết quả → `Enter confirm`, dòng tựa `THE HORIZON` → `EVENT HORIZON`, `CLEARED!` → `STAGE CLEAR!`, tiêu đề súng, mô tả hiểm họa và mục tiêu.
- **Kiểu Mỹ:** số thập phân dùng dấu chấm (`×1.00`, `1.2 s`, `⚠ Rift · 1.5 s`, trước là dấu phẩy), phần trăm liền số (`95%`), số ít `PICK 1 GUN`, `Played 1 run`.
- **Tràn chữ (trình duyệt 1280×720 và 1920×1080):** lời dẫn màn tựa lên 3 dòng làm thẻ tựa cuộn 18 px ở 720p, rút còn 2 dòng; tên ải 2 `Hunt Pack Leader` làm tiêu đề thẻ vào trận xuống 2 dòng, đổi thành `Leader Hunt`; tiêu đề súng dài làm Armory cuộn ngang 21 px, rút gọn (`rapid-fire cannon`, `sweeping beam`, `knockback spread`); luật học Standard rút gọn để không mồ côi `a ✓.`; tiêu đề Armory `ARMORY · LEARN` → `ARMORY · LEARNING`. Tên ải 4 `Shield Glow` → `Shining Shields`.
- Không đổi id, khóa lưu, event, số hay luật: `scripts/chapter-hashes.ts` 152/152 dòng giống hệt bản trước phiếu; `pnpm check` xanh 21 file, 196 test; kit 59/59.
- Còn lại (chưa sửa, có từ trước): ở 1280×720 huy hiệu `BAY 2` trên thẻ Star Mortar xuống dòng dưới tên súng (cùng độ dài với `BẾN 2` cũ); ở 1920 vừa một dòng.

