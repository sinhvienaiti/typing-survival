# 29/10/2026 · Last Line · Bộ tiếng phím Firefly và nghe thử trong Sound

Phiếu 191, worktree `games/.wt-ts-typefx`, nhánh `ts-typefx`, nền `0bc81b5` (Claude đã đồng bộ kit phiếu 190 từ cha `7b677b5a`). Status đầu sạch. Không sửa kit, sim, nội dung hoặc ván vàng.

## Bộ âm và danh mục

- Chép nguyên byte từ `~/AudioLab/review/staging/keys-firefly/` vào `public/assets/typing-survival/audio/keys/`: **98 OGG + 8 JSON = 106 file, 944.727 byte (0,945 MB)**; không chép WAV hoặc dấu nội bộ của trình dựng.
- `.gitignore` chỉ mở lại tám `keys-manifest.json`; file âm vẫn bị bỏ qua. `media.md5` thêm đúng 98 dòng OGG, giữ toàn bộ mục cũ. JSON đi qua Git; âm đi qua media của game, Claude thực hiện `media:push`.
- `src/app/keyboard.ts` gọi `loadKeyboardCatalog()` của kit, sắp Off, Relay, rồi bảy bộ theo danh mục; bỏ năm lựa chọn pending. Thiếu danh mục chỉ còn Off và Relay.
- Mặc định **Deep** theo phần điều phối của báo cáo 189: hằng số `DEFAULT_KEYBOARD_SOUND` trong `src/app/settings.ts`. Bộ đã lưu không còn tồn tại về mặc định khả dụng; nếu Deep cũng mất thì lấy bộ Firefly đầu còn lại, cuối cùng là Relay. Off và Relay lưu cũ được giữ.

## Phát và nghe thử

- Cùng instance `TypeFx.sounds` được truyền vào `QuickSettings.keyboardSounds`. Khởi động tải bộ đã lưu không phát preview; kết quả tải cũ không đè lựa chọn mới.
- Firefly đi thẳng vào destination của AudioContext chung ở **Master × Keyboard volume**; không qua Effects, không nhân hai lần. Chỉ Relay mở synth phím của game; Relay cũng dùng mức Keyboard riêng ngoài Effects. Off, Master mute/0 hoặc Keyboard volume 0 làm im tiếng phím.
- Driver gửi đúng một sample phím cho mỗi chữ đúng; hoàn tất từ không thêm sample cách vì game đã có âm nạp đạn. Phím sai/lạc theo mức của kit; Space gọi nhóm `space-*`, không gửi lệnh sim, giữ bộ chặn IME/shortcut/repeat.
- `ThemeAudio.prepare()` dựng context để giải mã mà chưa phát nhạc hoặc âm trận; `resume()` trên cử chỉ đầu tiên mới mở chúng. Trang chờ lượt tải tiếng phím ban đầu hoàn tất trước khi chạy sim.
- Hover/focus, chọn và nghe thử dùng thành phần phiếu 190: trễ 150 ms, preview **1 s**, rời/chuyển/đóng tắt dần 30 ms. Bảng mở và đếm 3-2-1 giữ luật tạm dừng và chặn gõ hiện có. Mẫu khi đổi Keyboard volume phát một phím của bộ đang dùng, không để bộ hẹn giờ cũ phát sau khi đổi bộ.
- Worktree chưa có ảnh icon phiếu 180: giữ nút chữ **Listen** của kit, không tạo hoặc mượn ảnh khác.

## Kiểm

- `pnpm check`: **24 file test, 238/238 test qua**, không lỗi/bỏ qua; xác minh 81 file kit, typecheck và production build qua.
- Thêm 23 test tiếng phím và 1 test Space; cập nhật 7 test settings theo danh mục. Chứng minh chọn đủ bảy bộ vào player gameplay, lưu/tải lại, file đúng bộ, biến thể không lặp liền, một tiếng mỗi chữ, mức nhân, mute/Off, tải cũ, preview và chuẩn bị context im lặng.
- **18/18 ván vàng S0 qua**, không đổi file golden. Test thời gian xanh: S0 median **0,546 ms**, chapter median **0,863 ms**, dưới cổng 1,5 ms; không cần chạy riêng ba lần.
- Kiểm offline **106/106 file giống staging và bản trong `dist`**, 98 OGG khớp MD5 và bị Git bỏ qua, 8 JSON không bị bỏ qua, WAV đã chép **0**. Kit, sim, content và golden không có diff.
- Chứng cứ và bảng file: `docs/codex-queue/191/`; báo cáo `docs/codex-queue/191-report.md` trong worktree này. Không mở server, trình duyệt hoặc mạng, không chạy lệnh Git có ghi. Chưa nghe/render trực tiếp; Claude kiểm phần đó và đẩy media.
