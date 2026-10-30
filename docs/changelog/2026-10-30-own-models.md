# 30/10/2026 · Model riêng của Last Line

Phiếu 205 sửa TS-M1-01 (G7: tài nguyên phải thuộc gói game) và TS-M1-14 (G4: bậc chất lượng phải chọn đúng GLB). Game dùng `/assets/typing-survival/models/manifest.json`; bỏ plugin Vite phục vụ thư viện Space. Nhập nguyên byte 12 id × High/Medium; không nén, giảm mặt hoặc đổi texture. Chỉ manifest được Git theo dõi; GLB vẫn bị bỏ qua.

`modelTier()` chọn Medium cho Low/Medium, High cho High/Ultra. Trang truyền bậc vào `Crowd.load()` và `Ship.load()`; hai hàm dùng bảng yêu cầu thuần trong `models.ts`. Bỏ bốn id dự phòng không nhập. `world.header.kit.guns` đi qua Combat vào Bolts; chỉ súng được chọn mới hỏi model đạn. Draconis dùng dragon-fireball cho Pulse Gun; Heat Beam không hỏi GLB. Low giữ tàu/quái 3D và giữ quy tắc đạn chỉ có vệt sáng.

Viết 30 test mới trước mã: lượt đầu 26 đỏ/4 xanh; sau sửa 30/30 xanh. `pnpm check` trước 206 test/22 file, sau 236 test/23 file; kit 61/61 ở cả hai lượt. TypeScript và Vite build xanh. SHA-256 ván vàng không đổi; 152 dòng hash chương trước/sau giống hệt. Không đổi sim, luật hay chữ người chơi thấy.

24 GLB khớp byte và SHA-256 nguồn, mọi `?v=` khớp 10 ký tự đầu hash. Tổng High 12.318.692 B, Medium 4.423.884 B, manifest 8.408 B. Gói có 76 file/18.273.794 B, 0 file chứa `/assets/space-typing/`, 0 lỗi `foreign-asset`. `pnpm deploy:pack` vẫn mã 1 do duy nhất `local-host` của phiếu 207; không nới bộ kiểm.

Dung lượng model lần đầu (cộng manifest, Pulse Gun + Heat Beam, lấy từ bảng yêu cầu của mã): Vanguard High 6.641.356 B (6,334 MiB), Medium 2.282.576 B (2,177 MiB); Draconis High 8.177.928 B (7,799 MiB), Medium 2.958.284 B (2,821 MiB). Cả hai High vượt 4 MB; không thu nhỏ model. Đây là phép tính trên file, chưa đo mạng hay kiểm trình duyệt.

Claude cần quyết mâu thuẫn Low của tài liệu tách (ghi bỏ 3D) với luật chủ dự án (giữ model thật), đạn Low chỉ có vệt sáng, và ngân sách High. Vanguard là bản chép tạm chờ Lightbearer; không đổi phi công/socket. Chưa chạy server, trình duyệt hoặc `media:push`; Claude duyệt/gộp, nhập GLB vào cây chính, đẩy media và kiểm ở 1280/1920. Báo cáo và danh sách media nằm ở repo cha: `docs/codex-queue/205-report.md`, `docs/codex-queue/205/`.
