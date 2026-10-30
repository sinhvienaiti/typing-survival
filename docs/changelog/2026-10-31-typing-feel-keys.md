# 31/10/2026 · Last Line · Âm phím đọc từ Typing Feel, bỏ bản chép

Worktree `games/.wt-ts-typefx`, nhánh `ts-typefx`. Bước B3 (giai đoạn G3) của [`docs/games/TYPING_FEEL_SERVICE.md`](../../../../docs/games/TYPING_FEEL_SERVICE.md) ở repo cha; chủ dự án duyệt 17 quyết định ngày 31/10. Kit giữ nguyên bản đồng bộ từ cha `590864fb`, không sửa `src/kit`.

## Đọc từ host Typing Feel

- `KEYS_BASE` (`src/app/keyboard.ts`) nay là `typingFeelKeysBase(import.meta.env.VITE_TYPING_FEEL_ORIGIN)`. Kiểu của biến khai ở `src/env.d.ts`. Mã không có giá trị mặc định, không có `.env.production`.
  - Không đặt biến (clone riêng, CI): `KEYS_BASE` là `null`, không gọi mạng, chỉ Off và Relay, không báo lỗi.
- Danh mục tải bằng `timedJson(3000)` (`no-cache`). Manifest bộ tải bằng `timedJson(3000, { cache: "default" })`.
  - Bảng Sound của kit không cho truyền `fetchJson` xuống `KeyboardSoundPreview`. Vì vậy game dùng `FeelSounds`, lớp con của `TypingSounds` (`keyboard.ts`): manifest chọn trong bảng cũng có hạn 3 s và dùng cache HTTP.
- Bộ mặc định lấy từ `default` của danh mục (`bright-clack` ở bản `r1`). `DEFAULT_KEYBOARD_SOUND` chỉ dùng khi danh mục không ghi `default`.
- `index.html` có `<link rel="preconnect" href="<origin>" crossorigin>`, chỉ khi build có biến. Plugin `typing-feel-preconnect` trong `vite.config.ts` chèn thẻ này, nên khi không có biến thì không có thẻ nào.

## Ba lỗi của mục 5.2

1. **`main.ts` chờ danh mục ở cấp cao nhất.** Nay `requestKeyboardCatalogue()` chạy ngay sau khi đọc save, song song với từ vựng và cảnh 3D. Khởi động chỉ còn `await loadVocab()` như trước.
2. **Danh mục hỏng thì ghi đè bộ của người chơi.** Bỏ `restoreKeyboardChoice` và `defaultKeyboard`.
   - `savedKeyboardId` đọc trường thô `typingFx.soundProfile` trước khi `loadSettings` điền mặc định cứng.
   - `startKeyboard` gọi `settleKeyboardChoice` của kit qua `settleKeyboard` (Relay là âm gốc, `bright-clack` là mặc định dự phòng). Game chỉ lưu khi `repaired`.
   - Bảng Sound dựng ngay với `pendingKeyboardChoices`: Off, Relay, và bộ đã lưu hiện "Loading…". Khi danh mục về, `quick.setChoiceOptions("keyboard", …)` thay danh sách, kể cả lúc bảng đang mở.
   - Người chơi chọn Off hoặc Relay trong lúc chờ thì lựa chọn đó giữ nguyên, không bị danh mục ghi đè.
3. **Cổng vào trận chờ `keyboardReady` không hạn giờ.** Nay `startKeyboard` gọi `playable` một lần, ở lúc sớm nhất trong ba lúc:
   - đợt giải mã đầu của bộ đã về;
   - lượt nạp kết thúc mà không có bộ nào;
   - `KEYBOARD_GATE_MS` (1,5 s) sau khi bắt đầu.

   Sau đó trận chạy dù chưa có âm, và bộ phát từ lúc đợt đầu về.
- Có biến mà danh mục không về (404, HTML mã 200, quá 3 s, CORS, không bộ nào dùng được): bảng hiện "Saved sound · unavailable", id trong save giữ nguyên, và HUD báo "Keyboard sounds unavailable" trong 6 s (đồng hồ trang). Không có biến thì không báo.
- Dev handle có thêm `__survival.keyboard()`: base, trạng thái danh mục, id đang chọn và id đã lưu, bộ đang phát, số lần phát, các mốc thời gian của cổng vào trận.

## Bỏ bản chép

- Xoá `public/assets/typing-survival/audio/keys/**`: 2.744 OGG (Git bỏ qua) và 35 `keys-manifest.json` đang theo dõi. Xoá năm dòng `!public/assets/typing-survival/...` trong `.gitignore`, vì chúng chỉ có để giữ các manifest này.
  - Trước khi xoá đã so md5: cả 1.032 md5 khác nhau của 2.744 OGG đều có trong `typing-feel/public/v1/keys/sets/` (0 thiếu).
- `media.md5`: bỏ 2.744 dòng `audio/keys`, còn 191 dòng, giữ nguyên thứ tự.
- `docs/audio/THEME_SOUND_LIST.md` §2.1 và `AGENTS.md` nay ghi cách mới. Ngoài changelog cũ, game không còn chỗ nào trỏ tới `/assets/typing-survival/audio/keys`.

## Script build (repo cha)

- `build:survival` (được `build:local` gọi) và `dev:survival:app` đặt `VITE_TYPING_FEEL_ORIGIN=https://feel.typing-game.local`.
- Script `dev` của game không đổi, nên repo game không mang nguồn nhà. `pnpm dev` chạy riêng thì Typing Feel tắt.

## Test

- `tests/feel-fixture.ts` là host mẫu: danh mục `catalogue-3` (7 bộ, 4 họ, `default` không phải bộ đầu, hai bộ không điểm), manifest `set-1` và byte giả. Test không đọc danh mục thật, không gọi mạng, nên chạy được trên clone riêng.
- `tests/keyboard-sounds.test.ts` có test mới cho các trường hợp sau:
  - không có origin: không gọi `fetch`; chỉ Off và Relay; id đã lưu giữ trong save; không báo lỗi; vào trận ngay;
  - host hỏng (404, HTML 200, thân không phải JSON, CORS, treo): id giữ nguyên, vào trận trong 1,5 s (treo: đúng 1.500 ms), báo một lần, không còn timer nào;
  - danh mục thiếu id: chuyển sang `default` và lưu đúng một lần, bảng không tự sửa thêm lần nữa;
  - danh mục về muộn: bảng thay danh sách, còn Relay hoặc Off người chơi vừa chọn vẫn giữ, không lưu thêm;
  - manifest dùng cache HTTP, cả ở bước khởi động lẫn ở bảng Sound;
  - OGG treo: vào trận ở 1,5 s; manifest treo: bỏ sau 3 s.
- `tests/quick-settings.test.ts` dùng danh mục mẫu, và kiểm bảng dựng trước khi danh mục về không sửa id đã lưu.
- Bỏ các test kiểm nội dung media thật (34 bộ, thứ tự Hail Stone và Raindrop Tile, stereo 48 kHz đọc từ OGG, 2.710 sample). Những thứ đó nay thuộc `typing-feel/`. Test "đuôi tự nhiên phát trọn" giữ lại, với độ dài giả 450 ms và 535 ms.
- Kiểm đột biến: bỏ hạn 1,5 s làm 7 test hỏng; bỏ qua lựa chọn của người chơi lúc chờ, 2 test; manifest `no-cache`, 8 test; báo lỗi cả khi không có origin, 2 test.

## Kiểm

- `pnpm check` mã 0:
  - kit 84 file khớp;
  - 24 file test, **259/259 test** (trước 279: `keyboard-sounds` từ 64 còn 43, `quick-settings` từ 7 lên 8);
  - tsc và build xanh.
- Build không có biến: `dist/index.html` không có thẻ preconnect.
- Build có `VITE_TYPING_FEEL_ORIGIN=https://feel.typing-game.local` (vào thư mục tạm): có đúng một thẻ preconnect. `check-pack` báo thêm `local-host` ở `index.html`, đúng như bản nhà.
- `check-pack` trên bản không có biến: mã 1, với hai lỗi đã có từ 29/10 (`2026-10-29-pack-and-kit.md`): `foreign-asset` vì model Space, `local-host` vì `PARENT_ORIGIN` của kit learning. Thay đổi này không thêm lỗi nào.

## Trình duyệt

Chrome headless (`src/kit/tools/cdp-run.mjs`), 1280×720, hồ sơ trình duyệt mới. Dev server cổng 4193, với `VITE_TYPING_FEEL_ORIGIN=http://127.0.0.1:18490`. Ở cổng 18490 là một server Node tạm, phục vụ `typing-feel/public` với CORS `*`, CORP `cross-origin`, `nosniff`, `audio/ogg`, và 404 khi thiếu file. Nginx `feel.typing-game.local` chưa chạy.

- **Host chạy, save trống:**
  - danh mục `r1` `ready`, 34 bộ, mặc định `bright-clack`;
  - mạng: danh mục 1 lần, đúng 1 manifest bộ, 88 OGG từ host feel; đợt đầu 12 phím + 4 space, xong hết trước khi đợt sau bắt đầu; 0 yêu cầu tới `/assets/typing-survival/audio/keys`;
  - bảng Sound có 36 lựa chọn (Off, Relay, 34 bộ) với 7 tiêu đề họ;
  - chọn Hail Stone: phát preview 1 s (stereo); tải 1 manifest, 25 phím, 8 space, 1 preview; lưu `hail-stone`;
  - gõ "nice" rồi Space: 4 sample `key-NN` (9–24 ms sau mỗi phím), Space phát `space-04` ngay khi bấm.
- **Host tắt** (server dừng, save `hail-stone`, `?autostart=1`):
  - danh mục `missing`, có báo "Keyboard sounds unavailable";
  - cổng âm phím mở sau 5 ms; trận chạy ngay khi trang sẵn sàng (lệch 0 ms), tick tăng;
  - save vẫn `hail-stone`; bảng có Off, Relay, "Saved sound unavailable" (tắt, đang chọn);
  - Relay: lưu `relay`, gõ 4 chữ ra 4 `key.ok`; Off: lưu `off`, 0 tiếng.
- **Host trả HTML mã 200 cho mọi đường:** `missing`, có báo, cổng mở sau 4 ms, save giữ `hail-stone`.
- **Host không trả lời:** cổng mở sau 1.501 ms; trận chạy 1.292 ms sau khi trang sẵn sàng; báo lỗi sau khoảng 3 s; save giữ `hail-stone`.
- Không có lỗi chưa bắt nào, không có cảnh báo hay lỗi console nào trong cả bốn lượt.
- Bằng chứng: `tmp/feel-keys/results.json` và `tmp/feel-keys/feel-keys-sheet.jpg`. Ảnh thô đã xoá bằng `tools/capture-prune/prune.mjs` (6 file, 2,69 MB).

## Sửa sau phản biện (hai người kiểm độc lập, cùng ngày)

1. **Bộ đã lưu không phát được thì im cả phiên** (P1 và P2, hai người cùng báo). Tài liệu mục 5.1 bước 5 và 5.3 hàng 3 nói phát âm gốc. Nay `startKeyboard` gọi `host.standIn(id)` khi bộ đã lưu không phát được: Typing Feel tắt hay hỏng (bộ thành "Saved sound · unavailable"), manifest hỏng hay quá 3 s, hoặc lượt nạp không giải mã được file nào.
   - `main.ts` giữ `keyboardStandIn` chỉ trong phiên. `soundLevels(settings, standIn)` bật synth của Relay khi bộ đang chọn chính là bộ được thay.
   - Save vẫn giữ id của bộ. Người chơi chọn bất kỳ âm phím nào thì Relay thôi thay.
   - Thanh trượt Keyboard volume nghe thử bằng Relay khi Relay đang thay.
2. **Đổi một mục khác lúc host hỏng thì lưu luôn Relay** (P2). `storedSettings(settings, keyboardOwned)` (`src/app/settings.ts`) bỏ `typingFx.soundProfile` khỏi save cho tới khi save "có" âm phím: save cũ đã có trường này, danh mục sửa (`repaired`), hoặc người chơi tự chọn. Cả ba chỗ ghi save đều dùng hàm này: `saveSettings`, `?mode=`/`?adapt=`, và `choose`.
   - Vì vậy lúc danh mục chưa về cũng không lưu mặc định cứng `bright-clack`. Đây cũng là lỗi cũ với `?mode=` mà người làm đã ghi ở "Còn mở".
   - Lần sau host chạy lại, save không có trường thì theo `default` của danh mục.
3. **Chọn lại đúng bộ đã lưu khi nó đang nạp thì phím im tới khi bảng nạp xong** (P3). `startKeyboard` nhận `signal`. `quickChange("keyboard")` gọi `keyboardStartup.abort()`, nên lượt nạp khởi động dừng (kit nhả phần đang nạp của nó) và không gọi `use("off")` nữa.
4. **File OGG không có hạn giờ** (P3). `timedBytes(8000)` (`KEYBOARD_SAMPLE_TIMEOUT_MS`): file quá 8 s bị bỏ (tính là thiếu), nên lượt nạp luôn kết thúc. `FeelSounds` dùng nó làm mặc định, nên bảng Sound của kit cũng có hạn.
   - Cả 16 file của đợt đầu đều hỏng thì game thôi xin các file còn lại của bộ, và Relay thay ngay. Trước đó, một host treo phải chờ 8 s cho mỗi đợt.
5. `docs/audio/THEME_SOUND_LIST.md` §2.1 (P3): manifest bộ nay ghi schema `typing-feel/set-1` thay cho `typing-keys-firefly/2`. Câu "Bảng dưới là danh mục `r1`…" chuyển xuống ngay trên bảng. Thêm các luật mới ở trên.

**Không sửa trong worktree** (ngoài phạm vi, chuyển cho điều phối):
- `play.sh` chỉ so thời gian sửa file. Sau một `pnpm check` hay `pnpm build` trong game, `dist` không có origin feel mà `play.sh` vẫn coi là mới, nên host play phục vụ bản không có Typing Feel (P2). Cách sửa đề xuất: build lại khi `dist/index.html` thiếu thẻ preconnect tới `https://feel.typing-game.local`, viết chung để B4/B5 dùng lại.
- Mục 5.1 bước 1 của tài liệu ghi `pnpm dev` của game đặt origin. Thực tế chỉ `dev:survival:app` của repo cha đặt; `pnpm dev` chạy riêng thì Typing Feel tắt. Nên sửa tài liệu cho khớp (P3).
- Kit: `setChoiceOptions` dựng lại danh sách thì phát preview không ai yêu cầu và dời focus sang dòng đang chọn (P3). Dòng "Saved sound · unavailable" vừa tắt vừa đang chọn thì khó đọc (P3). Cả hai sửa ở `shared/game-kit` rồi `kit:sync`.
- `typing-feel/media.md5` chưa có (P3). Nên commit lock đó cùng lúc hoặc trước khi merge B3, để md5 của các OGG không rời lock này mà chưa vào lock kia.

**Test mới** (`tests/keyboard-sounds.test.ts`, `tests/quick-settings.test.ts`):
- host hỏng (5 kiểu) và không có origin: Relay thay, save giữ id; chọn Off hay Relay thì hết thay;
- OGG treo: vào trận ở 1,5 s; sau 8 s bỏ cả đợt đầu, chỉ 16 yêu cầu, Relay thay, không còn timer;
- OGG đều 404: dừng sau đợt đầu, Relay thay; đợt đầu có một file tốt thì vẫn nạp tiếp;
- manifest treo: Relay thay sau 3 s;
- save chưa có âm phím qua lúc host hỏng: đổi Mute không ghi trường; host chạy lại thì theo `default` của danh mục; người chơi tự chọn thì từ đó lưu;
- chọn lại bộ đã lưu khi nó đang nạp: lượt khởi động dừng, bộ không bị tắt;
- `soundLevels` với `standIn`, `storedSettings`.
- Kiểm đột biến: bỏ `standIn` làm 9 test hỏng; luôn lưu âm phím, 1; lượt khởi động bỏ qua lựa chọn, 1; bỏ hạn 8 s, 2; bỏ dừng sau đợt đầu, 2.

**Trình duyệt lại** (Chrome headless, 1280×720; dev server 4193 với `VITE_TYPING_FEEL_ORIGIN=http://127.0.0.1:18499`, 4194 không có biến; server feel tạm ở 18499, điều khiển ở 18498; đã tắt hết):
- Host chạy, save trống: danh mục `r1`, 34 bộ; 1 danh mục, 1 manifest, 88 OGG, đợt đầu 12 phím + 4 space; 0 yêu cầu tới `/assets/typing-survival/audio/keys`; bảng 36 lựa chọn, 7 họ. Bấm Mute hai lần: hai lần ghi save, cả hai **không có** `soundProfile`.
- Chọn Hail Stone: preview phát; gõ "start" + Space ra 5 `key-NN` và 1 `space-NN` của Hail Stone; lưu `hail-stone`. Tải lại: Space của từ đầu phát `space-02`.
- Host tắt, HTML mã 200, treo: cổng mở sau 6 ms, 4 ms, 1.501 ms; báo lỗi; save giữ `hail-stone`; **Relay thay**: gõ 3 chữ ra 3 `key.ok`. Chọn Relay thì lưu `relay`; chọn Off thì lưu `off` và 0 tiếng.
- Manifest treo: cổng 1.502 ms, Relay thay, 3 `key.ok`. OGG treo: cổng 1.502 ms, đúng 16 OGG được xin, Relay thay sau 8 s, 3 `key.ok`.
- Save trống qua lúc host tắt (bấm Mute hai lần), rồi host chạy lại: save không có `soundProfile`, trang sau theo `bright-clack` của danh mục.
- OGG chậm 250 ms mỗi file, tắt cache, chọn lại Hail Stone 120 ms sau khi danh mục về: bộ đang phát là `hail-stone` ở mọi lần đo từ 356 ms tới 4 s (trước là `null` khoảng 1,75 s).
- Không có origin, save `hail-stone`: 0 yêu cầu tới host feel, 0 thẻ preconnect, không báo lỗi, Relay thay (3 `key.ok`), save giữ id.
- 0 lỗi chưa bắt, 0 promise bị từ chối, 0 cảnh báo hay lỗi console.
- Bằng chứng: `tmp/feel-keys-fix/results.json`, `tmp/feel-keys-fix/feel-keys-fix-sheet.jpg`. Ảnh thô đã xoá (5 file, 1,71 MB).

## Còn mở

- Kit: `QuickSettings` chưa có tuỳ chọn `fetchJson`/`fetchBytes` cho `KeyboardSoundPreview`. Khi kit thêm, bỏ `FeelSounds`. Preview 1 s của bảng vẫn tải bằng `defaultFetch` của kit, không có hạn giờ.
- Kit: dòng "Saved sound · unavailable" vừa tắt vừa đang chọn thì chữ xám trên nền xanh nhạt, khó đọc; `setChoiceOptions` phát preview và dời focus khi danh sách về muộn.
- `effects` của danh mục chưa được dùng làm mặc định hiệu ứng chữ. Ở bản `r1`, giá trị này trùng `FX_DEFAULTS` (stamp, normal, large, 1).
- Bộ người chơi chọn trong bảng mà không tải được thì vẫn im (kit chỉ báo qua `onLoad`, `QuickSettings` không đưa ra). Relay chỉ thay cho bộ đã lưu lúc khởi động.
- `play.sh` và mục 5.1 bước 1 của tài liệu (xem trên), `typing-feel/media.md5`.
- Chưa kiểm trên host play thật (`feel.typing-game.local`, HTTP/2). Việc đó cần chủ dự án chạy `pnpm setup:play`. Chưa nghe bằng tai.
