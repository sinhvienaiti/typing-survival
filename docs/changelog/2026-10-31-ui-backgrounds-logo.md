# 31/10/2026 · Nền màn, logo Last Line và ảnh ải v2

Điều phối (Claude) chấm và nhận ba nhóm ảnh lúc 16:30 ngày 31/10. Lượt này gắn chúng vào game. Không tạo ảnh mới. Mã sim, nội dung, `src/kit` và ván vàng S0 không đổi.

## Ảnh được nhận

- **Sáu nền màn (phiếu 121, chấm 8–8,5, hướng B Lightbearer chủ game chọn ngày 29/10):** `bg-menu`, `bg-journey`, `bg-briefing`, `bg-loadout`, `bg-results-win`, `bg-results-lose`. Nguồn `ui/screens-epic/*-bg`, cắt `1536x864+0+80`. Trong `selection.json` các mục này có `accepted: true` và verdict "CODEX_QUEUE 121: Nhận 31/10 16:30 (Claude chấm 8–8,5)". Mã đã vẽ `artHtml(bgRole(...), "bg")` sau các bảng từ lượt 206, nên mỗi màn có nền thật mà không phải sửa màn.
- **Logo "Last Line" (phiếu 121, chấm 8):** dùng bản tách nền sạch `art-src/_review/121/logo-clean.alpha.png` (2172 × 724, RGBA). Bản này được chép nguyên byte sang file mới `art-src/ui/screens-epic/logo-clean.png`; md5 hai file trùng nhau (`610b1d21c930137af6788198ff224ac4`). Hai file `logo.alpha.png` và `logo.512.png` là lần tách hỏng đầu tiên nên không dùng và không sửa.
- **Ảnh ải v2 c1-s1..c1-s4 (phiếu 126, chấm 8,5):** bốn mục `ui/stages-v2/*` được nhận và thay bốn mục `ui/stages/*` của phiếu 109 (chuyển `accepted: false`). Mỗi vai chỉ có một mục được nhận. Verdict: "CODEX_QUEUE 126: Nhận 31/10 16:30 (Claude chấm 8,5), thay 109".

## Kiểu ảnh `logo` trong `prepare.mjs`

- Có thêm kiểu `logo`: tỉ lệ 3:1, xuất ở bề rộng 640 và 1280 (cao 213 và 427), lấy từ một ảnh nguồn cỡ đầy. Công cụ báo lỗi khi nguồn không đúng 3:1 ("Logo requires a 3:1 source"), khi nguồn nhỏ hơn bản cần xuất (không phóng to), và khi nguồn không có pixel trong suốt ("Logo requires real alpha"). Kiểu này dùng cách mã hóa WebP giữ alpha của icon (q90, `-alpha_q 100`, chuyển sang lossless nếu PSNR < 35).
- Mọi kiểm tra cũ vẫn còn: đường dẫn nguồn, mỗi vai một mục được nhận, `--check` so md5 và bảng chạy. Kết quả: `logo.640.webp` 27 KB, `logo.1280.webp` 73 KB, cả hai còn alpha.

## Màn tiêu đề

- Chữ "LAST LINE" dựng bằng font được thay bằng logo vẽ. Thẻ `<h1 class="sv-title-logo">` vẫn là tiêu đề trang. Nội dung nhìn thấy của nó là ảnh logo có `alt="Last Line"`, nên trình đọc màn hình đọc "Last Line". Khi bảng ảnh không có vai `logo`, màn quay về `<h1 class="sv-title-name">LAST LINE</h1>` cũ, giống các vai ảnh khác.
- Logo nằm bên phải bảng tiêu đề, trên bầu trời hố đen. Ô `BOX.logo` là 600 × 200 px × `--ui`, tức 600 px ở 720p và 900 px ở 1080p. Logo đặt `position: absolute` (top 72, right 36 px × `--ui`) nên không đẩy bảng xuống. Bóng đổ dùng `--shadow`.
- Đo ở 720p: logo `[644, 72, 1244, 272]`, bảng `[51, 52, 571, 668]`, menu `[80, 201, 542, 584]`, nút góc tới y 48. Đo ở 1080p: logo `[966, 108, 1866, 408]`, bảng `[77, 82, 857, 998]`, nút góc tới y 72. Logo không chạm bảng, menu hay nút góc. Bảng tiêu đề thấp đi 81 px vì không còn dòng chữ tên.
- Golden chữ `tests/golden/ui-text-206.json` (màn `title`) được sửa có chủ ý. Văn bản trước là "…EVENT HORIZONLAST LINEHOLD THE LINE…", nay là "Last LineSTATION VC-7 · EVENT HORIZONHOLD THE LINE…": tên game giờ là alt của ảnh và đứng trước bảng.

## Lớp màn trên nền vẽ

- Trước lượt này, các màn có nền phủ một lớp màn tối 0,66 ở giữa và 0,9 ở mép, được làm từ lượt 206 khi nền còn chờ. Lớp đó che gần hết ảnh nền: độ sáng trung bình của cả khung ở 720p là 0,086–0,119.
- Bảng giờ là khung vẽ 127. Phần kính của khung đục hoàn toàn (alpha 1, đo trên `panel-large.alpha`). Vì vậy lớp màn trên màn có nền đổi sang hai biến mới `--veil-art` 0,3 và `--veil-art-edge` 0,58 trong `theme.css`. Độ sáng trung bình của khung lên 0,135–0,152. Không thêm gradient mới nào làm nền chữ.
- Màn không có nền (tạm dừng, Options trên cảnh 3D) giữ lớp màn cũ. Màn tiêu đề giữ lớp màn trái sang phải của nó.

## Test

- `tests/ui-art.test.ts`: 91 vai được nhận trên 106 mục. Phiếu 121 và 126 được nhận; 109 và 157 không. Ảnh ải được nhận đều từ `ui/stages-v2/`. Mục logo trỏ tới `ui/screens-epic/logo-clean`. Bề rộng và tỉ lệ của `bg-*` (1280, 1536; 16:9) và `logo` (640, 1280; 3,004695). Có thêm test chọn bản cho `logo` và `bg-menu`, test thẻ h1 logo đứng trước bảng, và test quay về chữ khi bảng thiếu vai `logo`. Test "pending" chuyển sang vai không có trong bảng (`icon-ship`), vì không còn vai nào đang chờ.
- `tests/ui-art-prepare.test.ts`: kế hoạch cho logo (640/1280 từ nguồn 3:1, không phóng to, lỗi khi không đúng 3:1 hay thiếu nguồn, các kiểm tra chọn ảnh). Ảnh mẫu thật: logo xuất ra còn alpha, logo đục bị từ chối.
- `pnpm ui-art:prepare --art-src art-src`: 32 file được ghi (12 nền, 2 logo, 16 ảnh ải, manifest và bảng). `--check`: OK.
- `pnpm check`: kit OK (84 file), 35 file test, **474 test** đạt (trước 466), build đạt.

## Trình duyệt (bản build trên host chơi)

- Build qua repo cha với `pnpm build:survival`. `dist/index.html` vẫn có preconnect tới `https://feel.typing-game.local`. Mười hai file `bg-*`, hai file `logo.*` và mười sáu file `stage-c1-s*` đều có trong `dist/assets/typing-survival/ui/`. Quét bằng curl mọi URL trong `ui-art.json` trên `https://survival.typing-game.local/`: 262/262 trả 200 `image/webp`.
- Kịch bản `scripts/visual/scenarios/survival-ui-art.mjs` có các phần sau:
  - Mở trang với `debug=1`, nên chạy được trên bản build ở host chơi.
  - Các kiểm tra mới: `backgrounds` (sáu màn có nền của mình, phủ đủ cửa sổ), `logo` (h1, alt, không chạm bảng, menu và nút góc, rộng 600 × `--ui`), `artRequests` (mọi yêu cầu ảnh UI trả 2xx hoặc lấy từ cache) và `panelText`.
  - `panelText` đo độ tương phản chữ của bảng chính trên mỗi màn có nền. Mỗi đoạn chữ được so với mọi pixel trong dải chữ của nó, lấy từ một khung chụp với chữ trong suốt. p5 là 5 % pixel kém nhất. Ngưỡng là 4,5 : 1, hay 3 : 1 với chữ lớn.
- Kết quả ở 1280 × 720 và 1920 × 1080: **37/37 kiểm đạt** mỗi cỡ. Có 97 yêu cầu ảnh UI, tất cả trả 200. Không có cảnh báo `[ui-art]`. Ngoài cảnh không-WebGL mà kịch bản cố ý gây ra, không có ngoại lệ trang nào. p5 kém nhất của chữ bảng theo màn (720p; 1080p giống, sai khác ≤ 0,5):

| Màn | Số đoạn chữ | Đoạn kém nhất | p5 | Trung vị |
| --- | --- | --- | --- | --- |
| tiêu đề | 23 | HOLD THE LINE | 5,63 | 8,75 |
| chiến dịch | 16 | CHAPTER 1 · VC-7 CORRIDOR | 5,77 | 7,05 |
| thẻ ải | 30 | (horde) 14 HP… | 6,63 | 11,69 |
| loadout | 97 | Star Mortar | 5,22 | 11,58 |
| thắng | 46 | STAGE 1 · FIRST SHIFT · BALANCED | 5,63 | 12,16 |
| thua | 23 | STAGE 1 · FIRST SHIFT · BALANCED | 5,77 | 7,08 |

## Còn lại

- Chữ phím trên nắp phím (`part-keycap`, phiếu 153) không thuộc nền. Trung vị của chúng là 8,0–8,6, nhưng p5 ở các phím 1–5 trên thẻ súng của Loadout chỉ 1,6–2,6, do viền sáng của nắp phím, nhất là nắp đang sáng `part-keycap-active`. Trên màn thua, phím ↑ ở 720p có p5 2,39. Nếu cần thì sửa ở ảnh nắp phím hay ở cỡ chữ phím, không sửa ở nền.
- Logo nằm trên vòng sáng cam của hố đen. Viền tối của chữ và bóng đổ giữ cho chữ đọc được (xem tờ tổng hợp), nhưng chữ "Last" nằm trên phần vòng sáng nhất. Nếu chủ game muốn logo ở chỗ khác, chỉ cần đổi `top` và `right` của `.sv-title-logo`.
- Lớp màn nhẹ hơn trên màn có nền là quyết định của lượt này. Muốn quay lại mức cũ thì đặt `--veil-art` và `--veil-art-edge` bằng `--veil` và `--veil-edge`.

## Lượt sửa (31/10, sau lần chấm của giám khảo)

Giám khảo nêu ba lỗi mã phải sửa. Cả ba đã sửa trong CSS của game (không đụng `src/kit`, không thêm ảnh). Vị trí và cỡ logo giữ nguyên.

### 1. Nút bánh răng và loa ở góc không có nền

- **Lỗi:** hai nút góc (phiếu 180) nằm trần trên vòng sáng của hố đen. Ở màn tiêu đề, lớp màn trong suốt từ 75 % bề ngang trở đi nên góc phải không được làm tối; nút loa chỉ đạt khoảng 1,9 : 1. Ở chiến dịch, thắng và thua hai nút còn 2,0–2,8 : 1, dưới mức 3 : 1 cho một nút điều khiển.
- **Sửa:** thêm một lớp tối dạng ellipse (`::after` của `.sv-overlay` khi màn có nền vẽ) nằm dưới cặp nút: `--corner-scrim` 0,78 ở lõi (tới 34 % bán kính), mờ dần về 0 ở 150 × 100 px × `--ui`. Lớp này thuộc nền của màn (z-index −1), nên chỉ làm tối ảnh nền; bảng và logo vẫn nằm trên nó. Lớp có trên cả sáu màn có nền, kể cả phần bên phải để trống của màn tiêu đề.
- Tâm lớp tối là tâm thật của cặp nút: `main.ts` (`resize`) đặt `--qs-at` từ khung của thanh nút, vì cỡ nút theo tỉ lệ riêng của kit (`--kit-qs-s`) và chỉ trùng `--ui` ở khung 16:9. `theme.css` giữ chỗ mặc định ở tỉ lệ 1.
- **Đo lại:** màu trung bình của icon so với mọi pixel trong ô nút, chụp với icon bị ẩn. "p90" là tỉ lệ ở 10 % pixel kém nhất. Hai cỡ cho kết quả gần như nhau (sai khác ≤ 0,01).

| Màn (720p) | Bánh răng trước → sau | Loa trước → sau |
| --- | --- | --- |
| tiêu đề | 1,42 → 5,38 | 1,11 → 3,98 |
| chiến dịch | 1,46 → 5,46 | 1,60 → 5,46 |
| thẻ ải | 2,70 → 5,93 | 2,07 → 5,67 |
| loadout | 2,13 → 5,76 | 3,09 → 5,93 |
| thắng | 1,52 → 5,48 | 1,41 → 5,37 |
| thua | 1,60 → 5,53 | 1,70 → 5,52 |

### 2. Ảnh ải trên thẻ ải che hai thanh dọc của khung

- **Lỗi:** dải ảnh ải (phiếu 126) rộng bằng cả mép ngoài của thẻ, nên che thanh dọc trái và phải của khung 127 từ dưới thanh tiêu đề tới dải sọc cảnh báo. Khung trông như bị gãy.
- **Sửa:** dải ảnh đứng lùi vào 9 px × `--ui` từ mép ngoài của thẻ (thanh dọc và vạch xanh của khung `panel-large` kết thúc ở 8,5 px với bề rộng viền 30 px). Thẻ rộng thêm hai thanh, thành 778 px × `--ui`, nên dải ảnh vẫn đúng `BOX.briefing` 760 × 120 và vẫn nằm trong vùng padding (không cuộn ngang). Dải có một đường tối 1 px ở mép trong (`outline` `--bevel-lo`, lùi −1 px) để ngồi trên kính của khung.
- **Đo lại:** dải lùi 9 px mỗi bên ở 720p và 13,5 px ở 1080p, rộng 760 và 1140 px. So màu trung bình của từng thanh dọc cạnh dải ảnh với đoạn thanh dọc ngay dưới (chênh lớn nhất trên một kênh, 0–255): trước 26 (trái) và 12 (phải), sau 3–5. Trong ảnh chụp, hai thanh chạy liền từ hoa góc trên xuống hoa góc dưới.

### 3. Nửa chữ "Last" của logo bị chìm vào vòng sáng

- **Lỗi:** "Last" nằm trên phần vòng màu kem cam sáng nhất. Mặt chữ crôm màu kem gần sáng bằng vòng, nên chữ chỉ đọc được nhờ viền tối mỏng; còn "Line" nằm trên đĩa tối nên nổi rõ.
- **Sửa:** thêm quầng tối bám sát chữ trước bóng đổ cũ: ba `drop-shadow` tại chỗ, 3, 8 và 18 px × `--ui`, với `--logo-halo-near` 0,9, `--logo-halo` 0,8 và `--logo-halo-far` 0,6. Quầng chỉ kéo vòng sáng xuống ngay quanh nét chữ; vị trí (top 72, right 36) và cỡ (600 × 200 × `--ui`) không đổi. Trong năm bản thử trên màn tiêu đề, bản này cho "Last" gần "Line" nhất mà không thành mảng đen (một ellipse tối phía sau cả logo làm tối luôn khoảng trống giữa các chữ).
- **Đo lại:** trung vị độ sáng mặt chữ so với dải 2–10 px × `--ui` quanh chữ (đã tính quầng). "Last": 1,96 → 3,88 ở 720p và 1,91 → 3,79 ở 1080p (độ sáng vòng quanh chữ 0,103 → 0,027). "Line": 5,24 → 5,38.

### Kịch bản, test, build

- `survival-ui-art.mjs` có ba kiểm tra mới: `cornerIcons` (hai icon ≥ 3 : 1 ở p90 trên cả sáu màn có nền), `briefingRails` (dải ảnh lùi ≥ 8,5 px × `--ui` mỗi bên, mỗi thanh dọc lệch ≤ 8 so với đoạn bên dưới) và `logoRing` ("Last" ≥ 3 : 1 so với dải quanh chữ). Trên bản build trước lượt sửa, cả ba đều trượt ở 720p.
- `tests/ui-art-fit.test.ts`: test cũ về dải ảnh đổi theo hình học mới (lùi theo thanh dọc, thẻ 760 + 2 × 9). Có thêm test cho đường tối, lớp tối ở góc (gradient, z-index, `--qs-at` từ `main.ts`) và quầng logo (thứ tự filter, vị trí và cỡ logo không đổi).
- `pnpm check`: kit OK (84 file), 35 file test, **477 test** đạt (trước 474), build đạt. `pnpm build:survival` từ repo cha đạt và `dist/index.html` vẫn preconnect tới `https://feel.typing-game.local`.
- Trình duyệt trên `https://survival.typing-game.local/`: **40/40 kiểm đạt** ở 1280 × 720 và 1920 × 1080. Không có cảnh báo `[ui-art]`, không có ngoại lệ trang (trừ cảnh không-WebGL cố ý). Chữ trên bảng không đổi: p5 kém nhất vẫn 5,22 (loadout, 720p) tới 6,63.
- Mục "Logo nằm trên vòng sáng cam…" trong "Còn lại" ở trên đã được xử lý bằng quầng tối, không phải dời logo.
