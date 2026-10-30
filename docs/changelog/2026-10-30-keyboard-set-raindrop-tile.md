# 30/10/2026 · Last Line · bộ tiếng phím thứ 33: Raindrop Tile

Worktree `games/.wt-ts-typefx`, nhánh `ts-typefx`. Chủ dự án 30/10: thêm Raindrop Tile (bản A: đuôi tự nhiên và giọt nước, không EQ) làm bộ tiếng phím thứ 33 ở mọi game. Mặc định vẫn `bright-clack`.

## Bộ âm và danh mục

- Chép nguyên byte từ staging `~/AudioLab/review/staging/keys-firefly/`: danh mục gốc mới (33 bộ) và thư mục `raindrop-tile/` (17 `key-NN.ogg`, 8 `space-NN.ogg`, `preview.ogg` 1 s, `keys-manifest.json` schema `typing-keys-firefly/2`). Danh mục cũ 32 bộ khớp `keys-manifest.32-sets.bak.json` của staging.
- Raindrop Tile nằm trong họ Crisp ngay sau Crisp Silk (`order` 18); các bộ sau lùi một bậc, Clear thành 19. Danh mục ghi `score: null`, `ownerPick: true`: không đặt điểm (thước đo 218 trừ điểm phần đuôi dài chủ dự án muốn). Kit bỏ qua điểm không phải số, nên lựa chọn này không có `score` và không bị khóa hay ghi chú.
- OGG Vorbis stereo 48 kHz (32 bộ kia mono); phím 154–450 ms, Space 401–535 ms.
- Git giữ thêm một JSON (`raindrop-tile/keys-manifest.json`; nay 34 JSON), OGG vẫn bị bỏ qua. `media.md5` thêm 26 dòng OGG của bộ, theo thứ tự đường dẫn (giữa `deep/` và `rounded/`). Thư mục keys: 2.710 OGG + 34 JSON, 19.619.008 byte.

## Đuôi dài

- Kiểm cái gì có thể cắt đuôi: kit không giới hạn độ dài sample (`source.start(t)` không offset, không duration); preview phát đúng `KEYBOARD_PREVIEW_SECONDS` = 1 s, bằng độ dài `preview.ogg`; ngưỡng sẵn sàng của kit (10 phím, 3 Space) dưới 17/8; xáo biến thể tránh 8 lần gần nhất vẫn đủ với 17 phím.
- Giọng: 6 giọng phím, 2 giọng Space. Ở 10 chữ/giây đuôi 450 ms chồng tối đa 5 giọng, không bị cướp. Chỉ khi gõ nhanh hơn khoảng 13 chữ/giây liên tục, hoặc Space cách nhau dưới khoảng 270 ms, giọng cũ nhất mới bị cắt (mờ 4 ms) ở cuối đuôi của nó. Không đổi kit.
- Chú thích trong `src/app/keyboard.ts`: 33 bộ, bộ nhả khi đổi giữa chừng có 25–88 buffer.

## Kiểm

- Test trước (hỏng 6 test trên danh mục 32 bộ, qua sau khi thêm bộ): danh mục 33 bộ, `order` 0–32, mỗi bộ đúng các file manifest của nó (2.677 sample, 33 preview); Raindrop Tile `score: null`, `ownerPick: true`, đứng giữa Crisp Silk và Clear, cỡ họ Crisp 7; chọn bộ tải đúng manifest, preview, 17 phím, 8 Space (stereo 48 kHz) và chỉ phát các file đó; 60 phím và Space ở 10 chữ/giây phát trọn, không giọng bị cướp, không `stop`, không giới hạn độ dài; bảng Sound có 35 lựa chọn (Off, Relay, 33 bộ).
- `pnpm check`: kit 84 file khớp, 24 file test, **274/274 test qua**, typecheck và production build qua.
- Trình duyệt (`ts-typefx-dev`, cổng 4193): bảng Sound có 35 lựa chọn (Off, Relay, 33 bộ); Raindrop Tile dưới tiêu đề Crisp ngay sau Crisp Silk; rê chuột 1 s tải `raindrop-tile/preview.ogg`; chọn bộ tải manifest và đủ 17 phím, 8 Space, lưu `survival.settings.typingFx.soundProfile = "raindrop-tile"`; trong Trial gõ hai từ: 9 sample stereo phát trọn (`start` một tham số), không lỗi console; tải lại trang thì bộ đã lưu nạp lại đủ 25 sample.
- Chưa nghe bằng tai; media chưa `media:push`.
