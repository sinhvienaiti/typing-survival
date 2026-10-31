# Last Line

Chạy `pnpm deploy:pack` trong repo game, không đặt `VITE_PORTAL_URL`, để build bản phát hành độc lập rồi kiểm gói `dist/` bằng bộ kiểm của kit cho `typing-survival`; lệnh trả mã lỗi nếu build hoặc kiểm gói thất bại. Khi biến trống hoặc không đặt, cầu nối giữ sự kiện học trong hàng đợi cục bộ, kể cả khi game nằm trong iframe; không gửi tin và không xả hay xóa hàng đợi.

`VITE_PORTAL_URL` nhận một URL HTTP(S) tuyệt đối, không có user/password; URL sai làm build dừng. Khi có giá trị, cầu nối dùng phần nguồn của URL: `https://portal.example/learn/?x=1` → `https://portal.example`. Bản demo nhà dùng:

```bash
VITE_PORTAL_URL=https://typing-game.local/ pnpm deploy:pack:local
```

Nếu môi trường đang có biến, tắt rõ bằng `VITE_PORTAL_URL= pnpm deploy:pack`. Cờ `--allow-local-host` của bộ kiểm (được `deploy:pack:local` dùng) chỉ cho phép miền nhà, không tự đặt biến và vẫn chặn tài nguyên của game khác. Muốn lấy báo cáo JSON sau build, chạy `node src/kit/tools/deploy/check-pack.mjs dist --game typing-survival --json` (thêm `--allow-local-host` cho demo nhà). Các lệnh này chỉ build và kiểm `dist/`, chưa tải media hay đưa gói lên máy chủ.

## Models

Last Line dùng manifest riêng tại `public/assets/typing-survival/models/manifest.json`: 12 id trong lệnh dưới, mỗi id có High và Medium. Chạy từ repo cha để nhập lại nguyên byte:

```bash
pnpm models:prepare --root games/.wt-ts-codex \
  --out games/.wt-ts-codex/public/assets/typing-survival/models \
  --url-base /assets/typing-survival/models/ \
  --import games/space-typing/public/assets/space-typing/models/manifest.json \
  --only ships/vanguard,heroes/draconis-v3,enemies/rainbow-mine-3d,enemies/rainbow-scout-3d,enemies/rainbow-tank-3d,enemies/rainbow-shield-3d,enemies/rainbow-splitter-3d,skills/vanguard-bolt,skills/solar-lance-bolt,skills/frost-seraph-bolt,skills/crimson-talon-bolt,skills/dragon-fireball \
  --tiers high,medium --generated-at 2026-10-30T00:00:00.000Z
```

Low và Medium dùng model Medium; High và Ultra dùng High. Low giữ tàu và quái 3D, đạn chỉ có vệt sáng. Bậc khác chỉ nạp đạn của súng đã chọn; Heat Beam không có GLB đạn. Manifest vào Git, GLB không vào Git. Sau khi gộp, Claude nhập lại cho cây chính với `--root games/typing-survival` (bỏ `--out` và `--url-base`), rồi chạy `media:push`.
