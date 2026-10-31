# 31/10/2026 · Sửa sau review: gắn icon Last Line

Review độc lập phần gắn icon 149–153 (`2026-10-31-ui-icons-wire.md`) nêu 3 lỗi P2 và 7 lỗi P3. Lượt này sửa cả ba P2 và các P3 rẻ, đúng hướng; P3 nào thuộc kit hay thuộc người chấm ảnh thì ghi ở "Còn lại". Mã sim, nội dung, `src/kit` và `media.md5` không đổi; 152 mã băm chương và ván vàng S0 khớp.

## P2

- **Mũi tên Rift gần như vô hình trên tấm cam.** Icon Rift và mũi tên `part-arrow` trên tấm `.sv-strip-warn` và `.sv-warn` nay nằm trên chip tối màu mực của tấm (`--ink`, bo 3 px, viền 2 px bằng `box-shadow` nên không đổi cỡ ảnh). Mũi tên lên 16 / 24 (chỗ `small`); bản trái vẫn lật bằng `.sv-art.is-left`. Đo trên trình duyệt (màu trung bình của ảnh theo alpha so với nền ngay dưới): Rift **3,67 : 1**, mũi tên **6,52 : 1** (trước đó trên cam 2,11 và 1,19). Kịch bản kiểm `warnContrast` ≥ 3 : 1 cho cả ba ảnh.
- **Ô đạn thành vệt 4 px, mất màu súng, nháy bến đầy chỉ còn quầng mờ.** Ô vẽ trên khung vuông 24 / 36 (ô 6 × 17 px ở 720p, 9 × 26 ở 1080p, trước 5 × 12); `.sv-mags` lấy lại chiều cao bằng lề âm nên đầu bến không cao thêm. Lõi kính của ô đầy nhận màu súng: một lớp màu phẳng `--tint` (mặc định `var(--gun)`) phủ đúng vùng kính (62 % × 76 % ô), hòa `color`, nên ảnh giữ sáng tối và khung thép không bị nhuộm. Từ gõ vào bến đầy (`is-overfull`): `--tint` thành `--urgent`, ô sáng ×1,35 và có quầng; hud.ts vẫn bật tắt lớp này theo nhịp nháy nên chính các ô nháy. Kịch bản kiểm `magCells` (cỡ ô, màu ô = màu súng, hai súng hai màu) và `overfullCells` (bến 1 chuyển `rgb(255, 176, 32)`, bến kia giữ màu súng).
- **Sao kết quả nhỏ, đạt và trượt khó phân biệt.** `BOX.star` 28 → 40: ảnh chiếm 70 % khung, nên ngôi sao hiện 28 px, đúng cỡ LL-50 đo cho ký tự "★" cũ (1080p: 60 / 42). Sao trượt: `grayscale(1) brightness(0.6)`, mờ 0,45; sao đạt: hai lớp quầng (`--led` sát, `--led-glow` rộng). Thẻ kết quả vẫn không cuộn ở 1280 × 720. Sao trong danh sách ải giữ như cũ.

## P3

- **Icon chỉ hiện 70 % khung.** Đúng là ảnh có lề 15 % mỗi bên, nhưng đó là quy cách của phiếu (149 mục "Lề": hộp bao 68–72 % cạnh, như 108), cỡ trong phiếu là cỡ khung và ảnh đã được chấm ở đúng cỡ đó; không phóng cả bộ. Chỉ tăng hai chỗ icon đứng cạnh chữ lớn: bàn phím ở dòng báo nhập (chữ 20 px) 16 → 24, cảnh báo ở "START · UNCOVERED" (chữ 17 px) 16 → 20. Các ảnh đọc sai nghĩa hay thành khối ở 720p (`menu-play` đọc như "tiếp", `next-stage` như "⊖", `hazard` ở 20 px; `new-badge`, `bay-full`, `kills`, `music`, `shake`) chuyển cho người chấm ảnh, không sửa trong mã.
- **Đèn mục menu.** `BOX.led` 8 → 10 (đèn hiện 7 px, 1080p 11 px); đèn sáng của mục đang chọn có quầng cam `--hot` như viền chọn, nên sáng và tắt khác nhau cả độ sáng chứ không chỉ sắc.
- **Câu luật học mất tân ngữ với trình đọc màn hình.** `ArtOpts` có thêm `alt`; dấu check trong câu là `alt="check"` (không `aria-hidden`), nên đọc thành "Finished words get a check.". Bản chữ chuẩn đọc chữ thay của ảnh có tên (`plain206`), nên `tests/golden/ui-text-206.json` nay ghi "…get a check." thay vì "…get a .".
- **Ảnh CSS không có nền dự phòng.** Mỗi `var(--art-*)` có giá trị dự phòng: mặt phím là ô thép phẳng (`--steel-800`, phím chọn `--steel-600`), ô đạn là rãnh `--track` rồi màu `--tint`. `applyArtVars()` (thay vòng lặp trong `main.ts`) đặt biến lên `<html>`, tải thử từng ảnh; ảnh lỗi báo `[ui-art] missing image` một lần và bị bỏ biến để CSS về nền phẳng. Sửa lại chú thích của `artVars()`.
- **Chỗ trong danh mục còn thiếu ảnh.** LL-32: tấm Săn có chân dung Pack Leader sau icon mục tiêu (20 / 30); để chữ "PACK LEADER 0/3 · ESCAPED 0/2" vẫn một dòng giữa đồng hồ và số hạ ở 720p (cần 319 px), tấm có icon dùng lề trong 10 px, khe 6 px, giãn chữ 0,12 em, chân dung sát icon 3 px; kịch bản kiểm `goalPlate` một dòng. LL-02: báo không có WebGL là tấm `.sv-nogl` có icon cảnh báo (24 / 36). LL-52: từ lần đầu gõ được (lịch sử `survival.seen` báo "new" trước khi gõ) có huy hiệu mới (`alt="New"`) thay dấu check ở kết quả; `main.ts` giữ tập chỉ số từ đó, `runWords` nhận thêm hàm `fresh`.
- **Test chưa phủ.** Thêm: `quickOptions(...).skin` bằng `quickSkin()`; `applyArtVars` (đặt đủ biến, ảnh lỗi bỏ biến và báo một lần); `main.ts` gọi `applyArtVars(document.documentElement)` trước khi dựng trận, báo không WebGL có icon, từ mới được đánh dấu. Kịch bản trình duyệt thêm dòng báo nhập (phím "ă" thật qua CDP) và trang không WebGL (chặn ngữ cảnh WebGL bằng script đầu trang; lỗi và cảnh báo của trang đó tách khỏi các kiểm chung).

## Kiểm

- `pnpm check` (exit 0): kit OK (84 file), 35 file test, **459 test** đạt (trước 453), build đạt. `chapter-hashes` và `s0-trace` đạt.
- Trình duyệt: `scripts/visual/scenarios/survival-ui-art.mjs`, dev server 127.0.0.1:3175 (1280 × 720) và :3176 (1920 × 1080), 20 màn mỗi cỡ: **29/29 kiểm đạt** ở cả hai cỡ (exit 0). Cỡ đo: sao 40 / 60, đèn 10 / 15, mũi tên Rift 16 / 24, ô đạn 6 × 17,3 / 9 × 25,9. Tờ tổng hợp và số đo: `tmp/ui-wire/sheet-ui-wire-fix-1280x720.jpg`, `sheet-ui-wire-fix-1920x1080.jpg`, `ui-wire-fix-summary.json`; ảnh thô đã xóa bằng `tools/capture-prune`. Hai tờ `sheet-ui-wire-*.jpg` cũ của lượt gắn là bản trước sửa.

## Còn lại

- Thanh trượt có da không hiện mức đầy (Music 0 và 100 cùng một rãnh sáng, chỉ khác vị trí núm). Cần lớp tô trong kit (`shared/game-kit`, ví dụ biến `--kit-qs-fill` hay ảnh `sliderFill`); báo cho người giữ kit, lượt này không sửa kit. Số bên cạnh thanh vẫn cho biết giá trị.
- Ảnh đọc sai nghĩa ở cỡ nhỏ (xem P3 đầu) chờ người chấm ảnh.
- Trang không WebGL chưa có `--ui` (đặt sau khi dựng cảnh), nên tấm báo giữ cỡ 720p ở màn lớn.
- Ở hồ sơ mới mọi từ trong kết quả đều mang huy hiệu mới (đúng: chưa gõ lần nào); dấu check cho từ đã gặp được kiểm bằng test đơn vị, chưa có ảnh chụp.
