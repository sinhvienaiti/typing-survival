# 2026-10-23 — Phản hồi trận lấy từ kit (`src/kit/feedback`)

Repo: `games/typing-survival`, nhánh `main`. Kit: commit `89dc9ff5` của repo cha (`shared/game-kit`). Mã của game đổi trong cùng commit với tài liệu này.

## Yêu cầu

- Module `feedback` của kit được chép từ Sinh Tồn trước commit review S0 (`a292d1ac`, thẻ `survival-s0` của Space). Đưa mọi sửa của review đó vào kit, giữ API của kit.
- Chuyển game này sang `src/kit/feedback`, bỏ bản `src/feedback` riêng và các test đã nằm trong kit.
- Phản hồi chỉ là phần hình và tiếng: mã băm của cùng seed không được đổi.

## Đã làm

- **Kit bắt kịp `a292d1ac`** (ghi ở `shared/game-kit/DRIFT.md`):
  - Rung màn hình: cặp nhiễu (nx, ny) được giữ trong vòng tròn đơn vị, nên rung không vượt trần 14 px ở 1080p kể cả khi hai trục cùng đỉnh (trước đó đo được 16,2 px).
  - Độ giật lùi của quái: T1 0,18, T2 0,30.
  - Số sát thương: hộp của số tính cả lúc phồng; số mới rơi lên số cùng kiểu dưới T3 còn trẻ (≤ 0,3 s) thì gộp vào; không gộp được thì đặt sang hai bên trước rồi mới lên trên; `settle()` chạy mỗi khung nên số không chồng thành tháp.
- **Game dùng kit.** `kit.config.json` thêm `feedback`. `src/view/combat.ts`, `crowd.ts`, `fx.ts`, `hud.ts` import từ `../kit/feedback` (hồ sơ `ship` mặc định, đúng các số của S0).
- **Đổi theo API của kit.** `new AudioCues({ volume })` thay `new AudioCues(volume)`. Âm "nạp băng đạn" gọi `audio.word(perfect, pan)` với pan −0,35 cho súng Xung và 0,35 cho súng Tia, cùng tiếng như trước (1046,5 Hz; khi hoàn hảo là 1568 Hz kèm 2093 Hz). Bus `guns` của bản cũ nay tên là `shots`, cùng mức âm. `Debris`, `Trauma`, `HitStop`, `NumberField`, `NumberSprites`, `Reactions` gọi như cũ.
- **Xoá** `src/feedback/` (8 file) và `tests/feedback-motion.test.ts`, `tests/feedback-numbers.test.ts`. Các test này nay ở `shared/game-kit/feedback/*.test.ts`, có thêm test mới.
- **Test ranh giới** (`tests/survival-boundary.test.ts`): không còn `src/feedback`; `src/kit/feedback` chỉ import chính nó và `three`; `src/view`, `src/app` không import `src/feedback`.
- `AGENTS.md`: bỏ `src/feedback` khỏi phần bố cục, ghi rằng phản hồi trận là của kit.

## Mục review đã xử lý

Ba mục còn lại trong `2026-10-23-split.md` ("Còn lại", dòng kit):

- Rung vượt trần 14 px khi hai trục cùng đỉnh.
- Số đang phồng có thể đè khung học; số chồng thành tháp ở đám đông.
- Độ giật lùi T1, T2 thấp hơn bản review.

## Kiểm tra

| Cổng | Kết quả |
|---|---|
| Kit: `vitest run` (3 lần), `tsc --noEmit` | Đạt cả ba lần: 29 file, 212 test. Sạch |
| `npx tsc --noEmit` | Sạch |
| `npx vitest run` (2 lần) | Đạt cả hai lần: 5 file, 32 test (trước là 7 file, 49 test; 17 test phản hồi chuyển sang kit) |
| `pnpm build` | Đạt |
| `node src/kit/verify-kit.mjs` | Đạt: 45 file khớp `kit-manifest.json`, có `parentCommit` `89dc9ff5` |
| Cùng seed, cùng mã băm | Đạt. Bot chạy cả ải (seed 1 ở 35 WPM, seed 3 ở 60 WPM, seed 7 ở 45 WPM) ra `1afff8ab`, `ab395af3`, `8ad7e730`, giống hệt trước khi đổi. Nhật ký lệnh của `fight` và `keys` ở hai cỡ chạy lại trong Node ra đúng mã băm của trình duyệt |
| Kịch bản `survival-s0-*` ở 1280×720 và 1920×1080 | Đạt 10/10: `boot`, `frames`, `keys`, `perf`, `fight`. 0 lỗi console, 0 ngoại lệ. Trận 180 s gõ 45 WPM: thắng; lúc đỉnh 142–143 quái trên màn hình; không số nào đè vùng cấm hay khung học. Lúc đỉnh khung hình 0,96–1,17 ms trung bình (p95 2,2 ms), 34 draw call |
| Đo thêm trong trận | Rung lớn nhất 1,5–1,6 px (trần 9,3 px ở 720p, 14 px ở 1080p). Số trên màn hình nhiều nhất 8–9; nhiều nhất 4–5 số trên một đường dọc; hai số chạm nhau thì lần lấy mẫu sau (khoảng 40 ms) đã tách ra, trừ một lần kéo dài hai mẫu ở 1080p |
| Xem ảnh | Đã xem hai đỉnh của `fight` và khung dày nhất của `frames` ở cả hai cỡ: số gộp thành một ("200×27", "152×20"), đứng cạnh nhau, không thành tháp, không đè khung học |

## Còn lại

- `games/dragon-hold` chưa chép lại kit (đang có người làm trong đó). Lần chép tới sẽ mang các sửa trên; độ giật lùi T1, T2 của hồ sơ `dragon` cũng tăng theo.
