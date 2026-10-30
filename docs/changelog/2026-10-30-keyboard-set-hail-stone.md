# 30/10/2026 · Last Line · bộ tiếng phím thứ 34: Hail Stone

Worktree `games/.wt-ts-typefx`, nhánh `ts-typefx`. Chủ dự án 30/10: thêm Hail Stone (bản v4: mưa đá nhỏ rơi trên đá dày, xử lý tự nhiên như Raindrop Tile) làm bộ tiếng phím thứ 34 ở mọi game. Làm theo đúng cách của Raindrop Tile (`2026-10-30-keyboard-set-raindrop-tile.md`). Mặc định vẫn `bright-clack`.

## Bộ âm và danh mục

- Chép nguyên byte từ staging `~/AudioLab/review/staging/keys-firefly/`: danh mục gốc mới (34 bộ) và thư mục `hail-stone/` (25 `key-NN.ogg`, 8 `space-NN.ogg`, `preview.ogg` 1 s, `keys-manifest.json` schema `typing-keys-firefly/2`). Danh mục cũ 33 bộ khớp byte với `keys-manifest.33-sets.bak.json` của staging.
- Hail Stone nằm trong họ Solid ngay sau Solid Amber (`order` 12); các bộ sau lùi một bậc: Crisp Velvet thành 13, Raindrop Tile 19, Clear Velvet 20. Họ Solid có 3 bộ, Crisp vẫn 7. Danh mục ghi `score: null`, `ownerPick: true` như Raindrop Tile: không đặt điểm. Kit bỏ qua điểm không phải số, nên lựa chọn này không có `score` và không bị khóa hay ghi chú.
- OGG Vorbis stereo 48 kHz; phím 90–450 ms, Space 331–535 ms (đuôi dài nhất bằng Raindrop Tile, nên phân tích giọng và độ dài của Raindrop Tile vẫn đúng; 25 biến thể phím đủ cho vòng xáo tránh 8 lần gần nhất).
- Git giữ thêm một JSON (`hail-stone/keys-manifest.json`; nay 35 JSON), OGG vẫn bị bỏ qua (`.gitignore` `*.ogg`). `media.md5` thêm 34 dòng OGG của bộ, theo thứ tự đường dẫn (giữa `deep/` và `raindrop-tile/`); 2.744 dòng keys khớp đúng 2.744 OGG trên đĩa. Thư mục keys: 2.744 OGG + 35 JSON, 19.942.156 byte.
- Chú thích trong `src/app/keyboard.ts`: 34 bộ. Bộ nhả khi đổi giữa chừng vẫn có 25–88 buffer.

## Kiểm

- Test trước (hỏng 8 test trên danh mục 33 bộ, qua sau khi thêm bộ): danh mục 34 bộ, id không trùng, `order` 0–33, mỗi bộ đúng các file manifest của nó (2.710 sample, 34 preview); hai bộ ownerPick (Hail Stone, Raindrop Tile) `score: null`, đúng `order`, Hail Stone đứng giữa Solid Amber và Crisp Velvet, Raindrop Tile giữa Crisp Silk và Clear Velvet; họ Solid là Solid Velvet, Solid Amber, Hail Stone rồi tới Crisp; các họ liền mạch, cỡ họ Solid 3, Crisp 7; chọn, lưu và nạp lại `hail-stone`; chọn bộ tải đúng manifest, preview, 25 phím, 8 Space (stereo 48 kHz) và chỉ phát các file đó; đuôi phát trọn ở 10 chữ/giây; bảng Sound có 36 lựa chọn (Off, Relay, 34 bộ).
- `pnpm check`: kit 84 file khớp, 24 file test, **279/279 test qua**, typecheck và production build qua.
- Trình duyệt (`ts-typefx-dev`, cổng 4193, cỡ desktop): bảng Sound có 36 lựa chọn (Off, Relay, 34 bộ); Hail Stone dưới tiêu đề Solid ngay sau Solid Amber, rồi tới tiêu đề Crisp; rê chuột 1 s chỉ tải `hail-stone/preview.ogg`, chưa lưu; chọn bộ tải manifest và đủ 25 phím, 8 Space, không tải bộ khác, lưu `survival.settings.typingFx.soundProfile = "hail-stone"`; trong Trial gõ hai từ (8 chữ đúng, 2 Space): 10 sample stereo phát trọn (`start` một tham số, dài tới 512 ms), không lỗi console; tải lại trang thì bộ đã lưu nạp lại manifest và đủ 33 sample.
- Chưa nghe bằng tai; media chưa `media:push`.
