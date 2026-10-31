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
