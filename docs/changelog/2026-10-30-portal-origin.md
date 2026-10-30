# Nguồn portal lúc build · 30/10/2026

Phiếu 207: bản phát hành Last Line không còn mặc định gửi sự kiện học tới
`https://typing-game.local`. `src/app/portal.ts` tập trung `portalHome()` và
`createPortalBridge()`; `learning.ts` dùng adapter này, vẫn giữ một cầu nối
ở mức module. Hàm `resetLearningBridge()` dành cho test có thể truyền host và
storage, không đổi đường gọi khi chơi.

`VITE_PORTAL_URL` là một URL HTTP(S) tuyệt đối, không có user/password. URL
sai làm Vite dừng với lỗi có tên biến. Có giá trị thì dùng phần nguồn của
URL; ví dụ `https://portal.example/learn/?x=1` → `https://portal.example`.
Trống, chỉ khoảng trắng hoặc không đặt thì host không có `parent`, kể cả khi
game đang nằm trong iframe: không `postMessage`, không xả hay xóa hàng đợi.
Khi có portal được cấu hình, giữ cách gửi/nhận và xả hàng đợi hiện tại của kit.

Plugin Vite `enforce: "pre"` đọc `loadEnv` theo mode, chỉ thay khai báo
`PARENT_ORIGIN` trong `src/kit/learning/contract.ts` khi biên dịch. Không có
đúng một khai báo thì `this.error` dừng build. Giá trị thay được giữ nguyên
ký tự, kể cả `$&`. Kit trên đĩa giữ nguyên byte, không chạy `kit:sync`.

## Cách đóng gói

- Phát hành độc lập: `pnpm deploy:pack`, không đặt biến.
- Demo nhà: `VITE_PORTAL_URL=https://typing-game.local/ pnpm deploy:pack:local`.
- Tắt biến đang có trong môi trường: `VITE_PORTAL_URL= pnpm deploy:pack`.

`--allow-local-host` chỉ cho phép nguồn nhà trong bộ kiểm, không tự đặt biến.
README đã ghi các lệnh và bỏ câu nguồn portal còn chặn production.

## Số đo và kiểm

Đo trên nhánh `ts-codex`, HEAD `184c90d`, có phần model riêng của phiếu 205
chưa commit. Bằng chứng ở repo cha: `docs/codex-queue/207/`.

| Kiểm | Trước | Sau |
| --- | ---: | ---: |
| `deploy:pack` production, mã thoát | 1 | 0 |
| Lỗi `local-host` / tổng lỗi | 1 / 1 | 0 / 0 |
| Chuỗi `typing-game.local` trong toàn bộ dist | 1 | 0 |
| File dist | 76 | 76 |
| Byte dist | 18.273.794 | 18.274.078 |

Tăng 284 byte. Quét đủ 12 file HTML/JS/CSS/JSON production: 0 chuỗi local;
inventory có đường, byte và SHA-256 của cả 76 file. Demo nhà đạt 0 lỗi,
18.274.393 byte, có 2 chuỗi local được cấu hình rõ. Đã dựng lại production
không biến để bàn giao, inventory khớp bản production đã kiểm.

Test trước mã: 29 đỏ, 1 xanh trong 3 file. Test bổ sung phép thay `$&` có
1 đỏ trước sửa; sau cùng 30/30 xanh. `pnpm check` xanh 265/265 test trong
25 file; `verify-kit` xanh 61/61. Không có test thời gian đỏ nên không cần
chạy riêng ba lần. Test build dùng `write: false`, thực thi JS bằng Node;
fixture nằm trong `tmp/` của game và tự xóa.

Giữ nguyên SHA-256 của 62 file kit kể cả manifest, 20 file sim, 9 file
content và golden S0. Golden:
`42e4e5a9534bc78a0c252353ea7ee4670a1bec9e43eb42ef38c886aade530eea`;
test bộ bài vẫn nhận `7f073fa2`. Không đổi luật chơi hoặc chữ người chơi thấy.

Không sửa script repo cha, kit, media hoặc phần bắt tay `hello`/`ack`.
Claude cần đặt biến cho Play/dev ở máy nhà và cập nhật mục 9 của tài liệu
triển khai độc lập; nếu chưa đặt, sự kiện học tiếp tục nằm trong hàng đợi.
Không chạy server, trình duyệt hay mạng; chưa kết luận toàn bộ G7 đã đạt.
