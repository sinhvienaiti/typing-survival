# 31/10/2026 · Last Line · Kit cho bước dữ liệu Typing Feel

Worktree `games/.wt-ts-typefx`, nhánh `ts-typefx`. Theo [`docs/games/TYPING_FEEL_SERVICE.md`](../../../../docs/games/TYPING_FEEL_SERVICE.md) của repo cha, giai đoạn G2 (chủ dự án duyệt 31/10).

## Kit

- Đồng bộ kit ở cha `590864fb`. Kit được thêm phần mới, không phá phần cũ:
  - danh mục đọc thêm `revision`, `defaultId`, `effects`;
  - `timedJson`, `settleKeyboardChoice`, `pendingKeyboardChoices`, `typingFeelKeysBase`;
  - `QuickSettings.setChoiceOptions`.
- Đợt giải mã đầu trộn tối đa 4 space với phím, để hết từ đầu tiên đã nghe đúng tiếng space.
- Kèm sửa kit TF2 ở cha `0a9a40a2`:
  - lớp chữ hiệu ứng rộng theo chữ;
  - sprite sáng làm một lần cho mỗi bảng màu;
  - cột nhãn bảng Settings cố định 9,5em.

## Game

- `tests/keyboard-sounds.test.ts`: hai test ghim thứ tự cũ "16 phím trước" và "phím Space phát tiếng phím" nay theo đợt đầu mới. Mã game chưa đổi.
- Game vẫn đọc bộ âm chép trong repo. Bước B3 (đọc từ `feel.typing-game.local`, bỏ bản chép) làm sau.

## Kiểm

- `pnpm check` xanh: 24 file, 279 test, tsc và build (lượt sửa của workflow G2).
- `kit:sync --check --target` báo OK.
