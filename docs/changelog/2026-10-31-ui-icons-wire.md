# 31/10/2026 · Gắn icon và mảnh UI Last Line (149–153, 225)

Gắn bộ icon và mảnh UI Claude đã nhận ngày 31/10 (`CODEX_QUEUE` dòng 149–153, các phiếu làm lại 237–240, thanh trượt 225) vào đúng chỗ theo `docs/games/map1/UI_IMAGERY.md` §4 của repo cha. Đi qua đường ảnh của Codex 206: `scripts/ui-art/selection.json` → `pnpm ui-art:prepare` → `src/view/ui-art.json`. Mã sim, nội dung và `src/kit` không đổi.

## Bảng chọn và ảnh

- Bảng chọn 37 → 89 mục, 15 → 68 vai nhận: 43 icon (`icon-*`), 7 mảnh (`part-*`), núm và rãnh thanh trượt (`slider-thumb`, `slider-track`), chân dung Shard (`foe-shard`, 238 try2). Bản chọn của 237–240 đã được Codex ghi đè vào tên gốc (có bản sao trong `_review/<số>/prev/`), nên nguồn vẫn là `ui/icons/<tên>`; riêng `pace-director.v2`, `stat-wpm.v2` theo dòng 152.
- `prepare.mjs` có thêm loại `track`: rãnh 16:1, xuất 512 và 1024 rộng, lấy bản `.512.png` khi có, từ chối nguồn không đúng 16:1 hoặc phải phóng to.
- 158 WebP mới, 2.056.906 byte (100 bản lossless vì q90 dưới 35 dB; bản có mất mát thấp nhất 35,06 dB). Cả bộ: 207 WebP, 4.826.114 byte. Chạy lại ghi 0 file; `--check` đạt. Worktree xuất vào thư mục thật `public/assets/typing-survival/ui/` (script không cho symlink); sau khi gộp cần chạy lại ở checkout chính với `--art-src art-src`, rồi `media:push`.

## Chỗ gắn (cỡ ở 720p, ×1,5 ở 1080p)

- HUD (149, 150, 152): icon giáp, đồng hồ, số hạ ở ba tấm trên (20); icon mục tiêu trên tấm Săn (20); icon đợt tràn trên băng rôn "SURGE n" và icon tiếp tế trên "REPAIR +n HULL" (28); icon bàn phím trước dòng báo nhập thay ký tự "⌨" (16); icon Rift trên tấm cảnh báo bên tường và trên đồng hồ đếm cạnh dòng chữ (24), mũi tên `part-arrow` chỉ phía tường thay "◀ ▶" (12); icon chuỗi sạch trước "CLEAN ×n" (16); icon bến đầy trong đầu bến, chỉ hiện khi bến đầy, giữ chỗ để không xô (16); icon khóa thay ổ khóa vẽ bằng CSS ở bến 3–4 (24); huy hiệu mới trên thẻ ra mắt quái (16).
- Ô đạn: `part-mag-empty` làm nền, `part-mag-full` phủ lên và bị cắt từ trên xuống theo `--fill` khi băng đạn cạn. Ô cao 11 px (canvas 16 px), thay thanh 22 × 9 vẽ bằng CSS.
- Mặt phím: mọi `kbd` ở dòng gợi ý và số thẻ súng ở Nạp súng vẽ bằng `part-keycap` (nine-slice qua `border-image`, cao 16); thẻ đã chọn dùng `part-keycap-active`.
- Màn chính: huy hiệu trạm thay chấm nhấp nháy (20); icon 24 cho bảy mục (Campaign → menu-journey, Trial → clock, Resume → menu-play, Mode, Profile, Options, Armory); đèn `part-led-on/off` thay đèn CSS (8); mũi tên đổi giá trị thay "◀ ▶" (12).
- Options: sfx, music, shake, reduced-motion, read-aloud, pace-director, quality, Done → check (20). Hàng Ship giữ chỗ trống cùng cỡ: ảnh tàu là LL-10, chưa có.
- Hồ sơ gõ: stat-wpm, stat-accuracy, stat-new-word, stat-evenness cạnh số (24). Kho súng, hồ sơ: Back → back (20).
- Hành trình: huy hiệu chương trước "CHAPTER 1 · VC-7 CORRIDOR" (32); sao sáng/tối cạnh tên ải thay "★☆" (20, có `aria-label` "n of 3 stars"); ải khóa có icon khóa ở cùng chỗ; Back → back.
- Thẻ ải: objective, hazard, learning-rule, equipment trước bốn mục luật (20); "NEW" có huy hiệu mới, bỏ viên CSS (16); dấu "✓" trong câu luật học thành icon check (16); Loadout → load-guns, Back → back (20).
- Nạp súng: icon cảnh báo thay "⚠" ở chip mối nguy chưa phủ và ở "START · UNCOVERED" (16). Chip Splitter giờ có chân dung Shard.
- Tạm dừng: Resume → menu-play, Options → menu-settings, Main menu → back (20).
- Kết quả: sao sáng/tối 28 thay "★☆" (sao đạt có quầng sáng, sao trượt mờ đi vì hai ảnh chỉ khác lõi); icon số liệu cạnh số: Time → stat-time, Kills → kills, Accuracy → stat-accuracy, Words → keyboard (24); check trước mỗi từ đã học (16); Stage n → next-stage cạnh ảnh ải, Retry → retry, Stages → menu-journey, Main menu → back (20).
- Bảng Settings/Sound trong trận: `skin.sliderTrack` (rãnh 1024 × 64) và `skin.sliderThumb` (núm 128) qua `quickSkin()` trong `src/app/quick.ts`; `survival.css` bỏ màu phẳng của kit dưới rãnh và núm.

Chữ giữ nguyên ở mọi chỗ icon đứng cạnh nhãn. Chữ đổi duy nhất là các ký tự làm icon (★☆⚠◀▶⌨✓) nay là ảnh; bản chữ chuẩn `tests/golden/ui-text-206.json` sửa đúng ba chỗ: "☆☆☆" ở danh sách ải, hai "⚠" ở Nạp súng, "✓" ở câu luật học.

## Sửa trong lượt

- Tấm mục tiêu ở ải 1 (giữ trận) hiện thành ô rỗng có icon vì luật `display: flex` của tấm thắng thuộc tính `hidden`. Luật giờ có `:not([hidden])`; test mới đỏ nếu tấm mục tiêu hay dòng báo nhập có `display` thiếu chốt đó; kịch bản trình duyệt kiểm `goalPlate`.

## Kiểm

- `pnpm check`: kit OK (84 file), 35 file test, 453 test đạt (trước 425), build đạt. Hash 152 lượt chương và ván vàng S0 khớp (`chapter-hashes`, `s0-trace`).
- Test mới: `tests/ui-art-icons.test.ts` (16: bảng chọn và nguồn từng vai, bảng chạy, `artVars`, `quickSkin`, menu, hành trình, thẻ ải, Nạp súng, kết quả, CSS), `tests/ui-art-roles.ts` (danh sách vai và phiếu), 11 test HUD và menu trong `tests/ui-art-wiring.test.ts` (tấm trên, tấm mục tiêu, bến đầy, băng rôn, dòng báo, Rift, chuỗi sạch; icon từng mục của `items()` trong `main.ts`), 1 test loại `track` trong `tests/ui-art-prepare.test.ts`.
- Trình duyệt: `scripts/visual/scenarios/survival-ui-art.mjs` viết lại cho 17 màn (title, Options, hồ sơ, kho súng, hành trình, thẻ ải, Nạp súng, thẻ trước trận, trận ải 1, băng rôn đợt tràn, trận Săn có chuỗi sạch, Rift ở ải 3, tạm dừng, Settings, Sound, thua, thắng). Ở 1280×720 và 1920×1080: 24/24 kiểm đạt (ảnh tải đủ, đúng cỡ BOX × `--ui` sai ≤ 1 px, nằm trong cửa sổ, không tràn ngang, thẻ không cuộn, không còn ký tự làm icon, mặt phím và ô đạn dùng ảnh, thanh trượt có da, không lỗi console). Cỡ đo: 8/12, 12/18, 16/24, 20/30, 24/36, 28/42, 32/48 px. Tờ tổng hợp và số đo: `tmp/ui-wire/sheet-ui-wire-1280x720.jpg`, `sheet-ui-wire-1920x1080.jpg`, `ui-wire-summary.json`; ảnh thô đã xóa bằng `tools/capture-prune`.

## Còn lại

- Hàng Ship ở Options chưa có ảnh (LL-10: ảnh tàu dựng từ GLB). Thanh LED âm lượng ở Options vẫn là ô CSS. Bảng Settings/Sound chưa có icon hàng và nút góc (phiếu 180, chưa chấm).
- Nền màn (121), khung bảng 9-slice (127), nút vẽ, đế băng rôn, vạch nguy hiểm vẫn là CSS cho tới khi có ảnh AD.
- Câu luật học "Finished words get a ✓" mô tả dòng xong của dải chữ cũ; dải chữ của kit (host mode) không hiện dấu check. Cần sửa câu trong lượt chữ.
- Ô đạn hẹp (ô 5 × 12 ở 720p), đúng cỡ 10/15 của phiếu; nếu chủ dự án thấy khó đọc thì tăng canvas.

Sửa sau review cùng ngày (ô đạn, mũi tên Rift, sao, đèn mục, chữ check, chân dung Pack Leader, báo không có WebGL, huy hiệu từ mới): `2026-10-31-ui-icons-wire-fix.md`. Hai mục "Còn lại" về câu luật học và ô đạn hẹp đã xử lý ở đó.
