# 31/10/2026 · Last Line · Bảng Sound dùng hàm tải của game, Relay thay bộ chọn mà không phát được

Worktree `games/.wt-ts-typefx`, nhánh `ts-typefx`. Sửa sau B3 (giai đoạn G3) của [`docs/games/TYPING_FEEL_SERVICE.md`](../../../../docs/games/TYPING_FEEL_SERVICE.md) ở repo cha, mục 4.6 ("API đã làm ở G2") và 5.1. Đóng các mục "Còn mở" về kit trong [`2026-10-31-typing-feel-keys.md`](2026-10-31-typing-feel-keys.md).

## Kit

Đồng bộ kit từ `shared/game-kit` của cha (chưa commit ở cha lúc đồng bộ; điều phối commit). Chỉ thêm, không phá:
- `QuickSettings` nhận `keyboardFetch: { fetchJson?, fetchBytes? }`. Hàng âm phím của bảng Sound tải manifest bộ, file mẫu và preview bằng hai hàm này. Bỏ trống thì dùng fetch của kit như trước.
- `QuickSettings` nhận `onKeyboardLoad(result)` và `onKeyboardFail(choice)`. `onKeyboardFail` báo khi bộ người chơi vừa chọn trong bảng không phát được: không có mẫu nào, hoặc nạp lỗi. Chỉ lần chọn mới nhất báo. `KeyboardSoundPreview` có thêm `onFail`.
- `timedBytes(timeoutMs = 8000)`: tải file mẫu có hạn giờ, cùng cách với `timedJson`. Hằng `KEYBOARD_SAMPLE_TIMEOUT_MS` (8000) nay ở kit.
- `setChoiceOptions` dựng lại danh sách mà:
  - không phát preview, không dừng preview người chơi đang nghe;
  - không dời focus bàn phím: focus ở đúng dòng cũ (hay nút Listen cũ); dòng đó không còn thì về dòng đang chọn;
  - giữ dòng đang chọn và vị trí cuộn.
- Chuột đứng yên mà dòng khác trượt tới dưới nó khi danh sách dựng lại: không phát preview, không dừng gì, tới khi chuột thật sự di chuyển.
  - Chrome gửi `pointerover`/`pointerenter` cho dòng mới dưới chuột khoảng 0,5–0,8 s sau, không có `pointermove`. Trước đó kit phát preview của dòng đó (bản kiểm trước: Deep Amber, Deep Velvet).
  - `QuickSettings` nhớ chỗ chuột cuối cùng và đưa cho danh sách mới (`settle: { pointer }` của `KeyboardSoundChoices`). Sự kiện đúng chỗ đó là trình duyệt bắt kịp bố cục, ở chỗ khác là người chơi.
- Bảng Sound đang mở thì giữ nguyên mép trên khi danh sách dựng lại, tới khi đóng hay khung đổi cỡ. Trước đó danh mục về làm bảng căn giữa lại, nhảy lên khoảng 80–100 px, nên cú bấm nhắm vào Relay có thể chọn nhầm bộ khác.
- Đợt giải mã đầu (16 file) không giải mã được file nào thì `TypingSounds.load` dừng, không xin phần còn lại. Bộ chọn trong bảng trên host treo trước đó im khoảng 48 s (6 đợt × 8 s) rồi Relay mới thay; nay khoảng 8 s.
- Dòng vừa đang chọn vừa tắt ("Saved sound · unavailable") nay đọc được: chữ xám nhạt trên nền tối, có vạch xanh bên trái. Dòng đang chọn giữ nền xanh khi rê chuột (trước đó nền tối, chữ tối). Mọi trạng thái từ 4,5:1 trở lên.

## Game

- Bỏ `FeelSounds` (lớp con của `TypingSounds` chỉ để đổi hàm tải mặc định) và `timedBytes` riêng của game. `src/view/type-fx.ts` dùng thẳng `TypingSounds`.
  - `src/app/keyboard.ts`: `sampleBytes = timedBytes(KEYBOARD_SAMPLE_TIMEOUT_MS)` của kit; `manifestJson` giữ nguyên.
- `src/app/quick.ts`: `quickOptions(hooks)` dựng tuỳ chọn của bảng, có `keyboardFetch: { fetchJson: manifestJson, fetchBytes: sampleBytes }` và `onKeyboardFail`. `createQuickSettings` gọi hàm này.
  - Nhờ vậy preview 1 s của bảng cũng có hạn 8 s (trước đó tải bằng `defaultFetch` của kit, không hạn giờ).
- **Bộ chọn trong bảng mà không phát được thì Relay phát thay** (mục 5.3). Trước đó bộ đó im.
  - `pickFailed(choice, host)` (`keyboard.ts`): chỉ khi bộ đó vẫn là âm phím hiện tại, không phải Off hay Relay.
  - `main.ts` dùng chung `standInKeyboard` cho lúc khởi động và cho bảng. Save giữ id vừa chọn, không lưu Relay. Lần chọn sau thì Relay thôi thay (`quickChange`, như trước).
- `loadSavedKeyboard` (`keyboard.ts`) bỏ bộ đếm lỗi đợt đầu của riêng game: kit đã dừng sau đợt đầu hỏng, lúc khởi động cũng như khi chọn trong bảng. Bộ đếm còn lại chỉ để biết đợt đầu đã về (gọi `playable`).
- `docs/audio/THEME_SOUND_LIST.md` §2.1: thêm luật trên, hạn 8 s cho preview, và luật đợt đầu ở kit.

## Kiểm

- Test mới (`tests/keyboard-sounds.test.ts`, 5 test):
  - bảng nhận đúng `manifestJson`, `sampleBytes` và hook báo lỗi;
  - manifest 404: Relay thay, save giữ id, chọn lại thì hết thay;
  - OGG treo: Relay thay sau đúng một lần hết giờ 8 s (7999 ms chưa, 8000 ms có), chỉ một đợt 16 file được xin, không còn timer;
  - đổi lựa chọn trước khi lỗi về: không thay;
  - `pickFailed` chỉ thay cho âm phím hiện tại.
- Các test dùng preview của bảng nay dựng nó như `QuickSettings` dựng (`panelPreview`, từ `quickOptions`).
- Kiểm đột biến: bỏ `keyboardFetch` và `onKeyboardFail` khỏi `quickOptions` làm 10 test hỏng. Bỏ luật đợt đầu khỏi kit (`src/kit`) làm 3 test hỏng (2 test khởi động, 1 test bảng).
- `pnpm check` xanh: kit khớp manifest (84 file), 24 file test, 270 test, tsc và build.
- `kit:sync --check --target games/.wt-ts-typefx` báo OK.
- Kiểm trên trình duyệt (Chrome của Claude, khung 800×600). `vite` dev ở 127.0.0.1:18543 với `VITE_TYPING_FEEL_ORIGIN=http://127.0.0.1:18542`, host feel tĩnh tự dựng phục vụ `typing-feel/public`. Bằng chứng preview lấy từ log của host feel: bộ đệm resource timing của trang đầy 250 mục.
  - Danh mục trễ 2,9 s, save là Clear Pebble, chuột đặt lên dòng thứ ba ("Loading…") rồi để yên. Danh sách dựng lại lúc 3003 ms (3 → 36 dòng), mép trên bảng giữ ở 80 px. Lúc 3537 ms Chrome gửi `pointerenter` cho Deep Velvet ở đúng chỗ chuột, không có `pointermove`. Host feel không nhận preview nào.
  - Cũng vậy khi chuột để trên Relay (cùng dòng sau khi dựng lại) và trên hàng Voice, ngoài danh sách (Deep Cedar trượt tới dưới chuột lúc 3509 ms).
  - Rê chuột thật sang Deep Amber thì preview được xin 155 ms sau `pointerenter`.
  - Host treo mọi OGG của Warm Velvet (88 file), chọn trong bảng: 16 file được xin (12 phím, 4 space), Relay thay sau 8,5 s (đo mỗi 0,5 s).
  - Danh mục lỗi (503): dòng "Saved sound · unavailable" đang chọn có chữ `#C3C9D3` trên `#14161B`, vạch accent bên trái; rê chuột lên vẫn vậy. Console chỉ có lỗi 503 cố ý.
