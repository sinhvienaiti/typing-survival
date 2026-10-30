# 30/10/2026 · Last Line · 32 bộ tiếng phím Firefly, xếp theo họ

Worktree `games/.wt-ts-typefx`, nhánh `ts-typefx`. Chủ dự án 30/10: giữ 32 bộ từ các lượt Adobe Firefly của mình; khi cần thêm bộ thì làm theo `docs/games/audio/KEYS_FIREFLY_HANDOFF.md` của repo cha.

## Kit

- Đồng bộ kit ở cha `4ae665b2` từ bản xuất sạch `tmp/kit-export` (sửa chưa commit trong `shared/` của cha không lọt vào game). Gồm Codex 219: danh sách Keyboard sound xếp theo họ (tiêu đề, PageUp/PageDown nhảy họ, mở bảng cuộn tới bộ đang chọn), bộ nhiều biến thể không lặp trong 8 phím, giải mã theo lô 16 file, đổi bộ thì nhả bộ cũ; và Codex 198: kho file âm theo manifest v2. Commit riêng.

## Bộ âm và danh mục

- Thay cả `public/assets/typing-survival/audio/keys/` bằng staging `~/AudioLab/review/staging/keys-firefly/` (bản dựng `keys-firefly/218`): **32 bộ, 2.684 OGG + 33 JSON = 2.717 file, 19.397.406 byte**. Mỗi bộ 70–80 `key-NN.ogg`, 8 `space-NN.ogg`, một `preview.ogg` 1 s. Không có WAV; bỏ dấu nội bộ `.firefly-builder.json`.
- Bảy họ theo thứ tự danh mục: Deep 3, Warm 6, Rounded 1, Solid 2, Crisp 6, Clear 4, Bright Clack 10. Bảy id cũ còn nguyên (bộ "Velvet" đứng đầu mỗi họ), nên save cũ không đổi; mặc định vẫn `bright-clack`, nay tên **Bright Clack Velvet**.
- `.gitignore` không đổi: chỉ các `keys-manifest.json` đi qua Git (33 file), âm vẫn bị bỏ qua. `media.md5` bỏ 98 dòng OGG cũ, thêm 2.684 dòng OGG mới, giữ các mục khác và thứ tự theo đường dẫn.

## Game

- `loadKeyboardChoices()` giữ Off và Relay đầu danh sách, không có họ (không tiêu đề), rồi 32 bộ theo thứ tự danh mục với `family` của từng bộ: picker của kit tự vẽ tiêu đề họ.
- `loadSavedKeyboard()`: người chơi chọn bộ khác trong lúc bộ đã lưu còn đang giải mã lúc khởi động thì bộ đó được nhả khi xong (trước đây 70–88 buffer của nó nằm lại trong bộ nhớ).
- Kịch bản chụp `scripts/visual/scenarios/survival-typefx.mjs` đọc picker nút của kit (tiêu đề họ, `aria-selected`) thay cho ô radio cũ; chưa chạy trong trình duyệt.

## Kiểm

- `pnpm check`: kit 84 file khớp, **24 file test, 264/264 test qua**, typecheck và production build qua.
- Test tiếng phím theo 32 bộ: danh mục đủ 32 id, 2.652 sample và 32 preview đều là OGG; họ liền nhau theo thứ tự, Off/Relay không họ; chọn từng bộ trong 32 bộ vào player gameplay, lưu và tải lại; 240 phím của bộ mặc định dùng đủ 80 biến thể và không lặp trong 8 phím; tải khởi động trễ không đè lựa chọn mới và bộ đó được nhả (test này hỏng nếu bỏ dòng nhả).
- Chưa nghe/render trong trình duyệt; media chưa `media:push`.
