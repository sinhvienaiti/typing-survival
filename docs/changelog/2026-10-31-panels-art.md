# 31/10/2026 · Last Line · Bảng Settings/Sound: kit da mới, phần đầy thanh trượt 244, icon phiếu 243

Last Line nhận bản kit bảng nhanh mà Dragonhold (`0ca70a8`) và Wordwoven (`47a1698`) đã nhận: kit của repo cha
`18722b41` (da mới) và `b8a224d0` (lượt sửa theo giám khảo), rồi gắn ảnh điều phối viên đã nhận chiều 31/10: phiếu 243
(chấm 17:40, cỡ thật) và phần đầy thanh trượt của phiếu 244 (chấm 18:00). `shared/game-kit` không đổi trong lượt này.

## Đã làm

### 1. Đồng bộ kit

- `node scripts/sync-game-kit.mjs --target games/typing-survival` ở repo cha: 7 file của `src/kit/ui/quick-settings`
  và `kit-manifest.json` (kit `b8a224d0`). `src/kit` không sửa tay; `verify-kit` OK.

### 2. Da bảng theo móc mới của kit (`src/app/quick.ts`, `src/view/survival.css`)

| Việc | Cách làm |
|---|---|
| Phần đầy thanh trượt | `QuickSkin.sliderEmpty` = rãnh 225 (`slider-track`), `sliderFill` = phần đầy 244 (`slider-fill`, lam điện sáng), núm 225. Kit cắt phần đầy đúng tâm núm (`--kit-qs-v`). Bỏ `paintRanges` và lớp tối `--v` cũ (cùng biến `--groove-dark` của `theme.css`). |
| Hai đầu phần đầy khớp rãnh | Đo trên ảnh 1024 × 64: rãnh phủ cả khung (hộp alpha 1024 × 64), phần đầy thụt 12 px mỗi đầu (hộp 1000 × 64 ở x 12). Rãnh cắt `0 64` (mũ vàng và vát kênh), mũ vẽ bằng chiều cao rãnh (10 px ở 720p, 15 px ở 1080p: 64 px → chiều cao rãnh). Phần đầy cắt `0 76` (12 + 64), mũ `× 1,1875` (76/64) và đẩy ra ngoài mỗi đầu `× 0,1875` chiều cao rãnh (12/64, `border-image-outset`): mũ của phần đầy nằm đúng trên mũ của rãnh ở mọi cỡ, đoạn kênh giữa bắt đầu cùng chỗ. Chỉ áp khi có ảnh phần đầy riêng (`.kit-qs--fill-art`). |
| Mọi rãnh dài bằng nhau | Mute vào cột riêng của kit (`--kit-qs-aside-w` 70 px × tỉ lệ); bỏ luật lưới cũ `:has(> .kit-qs__control > .kit-qs__range)` (không còn khớp cấu trúc mới). |
| Núm | Ô núm 30 px × tỉ lệ (ảnh 225 chiếm 70 %: 21 px vẽ ở 720p, gấp đôi chiều cao rãnh); trước 22 px (15 px vẽ). |
| Hàng tắt tiếng | Luật Master khi Mute đổi từ `.kit-qs__range` sang `.kit-qs__slider`: tối cả hai lớp rãnh và núm. |
| Danh sách âm phím trên tấm vẽ | `listRow` = tấm `frame-button`, `listRowActive` = tấm `frame-button-active` (127, `ui/frames-epic`), cắt theo số cắt của bảng ảnh trên bản 896 px (`framePlate()` trong `ui-art.ts`: 82,1 / 87,9 / 80,23 / 87,9 px), mép 9 px trên dưới, 10 px hai bên như nút của bảng, nhân theo tỉ lệ bảng (`LIST_ROW_VARS`). Dòng, tiêu đề họ, nút nghe thử cao theo tỉ lệ bảng (8 dòng, 272 px ở 720p). Dòng đang chọn trên tấm sáng, chữ `--volt-hi`, quầng lam nhạt như chip đang chọn. Bỏ luật listbox cũ (`.sv-hud .kit-keyboards …`). |
| Focus là quầng sáng lam | `--kit-qs-glow: var(--volt)`; nút, chip, dòng danh sách, nút nghe thử, núm và icon góc hiện focus bằng `--kit-qs-glow-filter` ôm theo ảnh, không còn viền phẳng. Rê chuột trên nút và chip: sáng lên kèm quầng lam (thay vòng 1 px CSS). |
| Font | Tựa bảng qua `--kit-qs-title-font` (Chakra Petch); nhãn, tiêu đề mục, nút, chip và dòng âm phím Chakra Petch như menu (`--kit-qs-label-font`, `--kit-qs-button-font`); ghi chú nhỏ Be Vietnam Pro. |
| Icon ô hàng | `--kit-qs-icon-size` 28 px × tỉ lệ (thay luật kích thước riêng). |
| Màn tựa không có Resume, Quit to title | `context: () => (mode === "start" ? "title" : "play")` (`main.ts`, qua `QuickHooks.context`). |

### 3. Ảnh đã nhận (qua `scripts/ui-art/selection.json`, `pnpm ui-art:prepare --art-src art-src`)

| Vai | Nguồn | Phiếu | Chỗ hiện |
|---|---|---|---|
| `hud-settings` | `ui/quick-settings/selected/hud-settings.r2` | 243 | Bánh răng góc (bản cũ đọc ra bông hoa) |
| `vol-effects`, `vol-interface` | `ui/quick-settings/selected/*.r2` | 243 | Hàng Effects, Interface của bảng Sound |
| `icon-menu-settings` | `ui/icons/menu-settings.r2` | 243 | Mục Options ở màn tựa và màn tạm dừng |
| `icon-ship` (mới) | `ui/icons/ship` | 243 | Hàng Ship ở Options (trước không có icon) |
| `icon-letter-style`, `icon-effect-strength`, `icon-word-size` (mới) | `ui/icons/*` | 243 | Ba hàng hiệu ứng gõ của bảng Settings, qua tên icon của kit `fx-style`, `fx-strength`, `fx-size` (`QUICK_ROW_ART` trong `ui-art.ts`) |
| `slider-fill` (mới, `track`) | `ui/quick-settings/sliders/slider-fill` | 244 | Phần đầy của mọi thanh trượt |

- Bốn vai vẽ lại đổi nguồn ngay trong mục cũ (mỗi vai một mục được nhận, như 242); verdict
  `CODEX_QUEUE 243: Nhận 31/10 17:40 (cỡ thật)` và `CODEX_QUEUE 244: Nhận 31/10 18:00 (cỡ thật)`; icon giữ `fill` 0,85.
- Hàng Keyboard volume: kit nay đặt tên `vol-keyboard-volume`; Last Line không có ảnh riêng nên tên đó vẽ bằng ảnh
  `vol-keyboard` đã nhận (bỏ phần đè icon trong `soundRows`).
- Không gắn `pace-director.r2`, `shake.r2` (trượt, phiếu 247 vẽ lại) và không gắn gì của phiếu 245–249 (test giữ điều này).
- Ảnh vào `public/assets/typing-survival/ui/` (bỏ qua trong Git): 28 file WebP mới; `--check` OK (97 vai được nhận trên
  112 mục, trước 92 trên 107).

### 4. Kịch bản và test

- Kịch bản mới `scripts/visual/scenarios/survival-quick-panels.mjs` (hai bảng ở màn tựa và trong trận; ảnh, yêu cầu,
  ngoại lệ; Resume/Quit theo ngữ cảnh; icon mọi hàng; rãnh bằng nhau; mép phải phần đầy đo bằng điểm ảnh so với tâm núm ở
  0/50/100 khi ẩn núm; hai đầu phần đầy so với hai đầu rãnh khi bỏ cắt; tấm danh sách; Tab ở trong bảng với quầng lam;
  mũi tên đổi giá trị; Esc đóng; chọn một bộ Typing Feel trong bảng rồi gõ một phím ra đúng một tiếng).
- `survival-ui-art.mjs`: `sliderSkin` kiểm thêm lớp phần đầy và hai ảnh; `sliderFill` đọc `--kit-qs-v` của kit thay
  `--v`; `quickIcons` thêm ba icon hiệu ứng gõ; `optionsIcons` thêm `icon-ship`.
- Test mới `tests/panels-art.test.ts` (7); sửa `ui-art-roles.ts`, `ui-art-icons`, `ui-art`, `ui-art-wiring` (hàng Ship nay
  có icon), `ui-pass3`, `theme` (biến lớp của kit `QUICK_SETTINGS_VARS` thay `--v` và `--kit-qs-skin-track`).

## Kiểm

- `pnpm check` (exit 0): kit OK (84 file), **39 file test, 516 test** đạt (trước 38 file, 509 test), build đạt.
- `pnpm ui-art:prepare --art-src art-src --check`: OK.
- Build qua repo cha: `pnpm build:survival` đạt.
- Host chơi `https://survival.typing-game.local/`, Chrome không giao diện, `survival-quick-panels.mjs` ở 1280 × 720 và
  1920 × 1080: **22/22 kiểm đạt** ở cả hai cỡ; 0 ảnh hỏng, 0 yêu cầu lỗi, 0 ngoại lệ, 0 lỗi console.
  - Rãnh sáu hàng trượt bằng nhau: 351 px ở 720p, 527,5 px ở 1080p (chiều cao 10 / 15 px, ô núm 30 / 45 px).
  - Mép phải phần đầy (cột sáng cuối cùng, núm ẩn) so với tâm núm tính từ giá trị: 720p 513 / 673,5 / 834 → đo
    513 / 674 / 834; 1080p 769 / 1010,25 / 1251,5 → đo 769 / 1011 / 1252 (lệch ≤ 0,5 px, phần lẻ của cột cuối).
  - Hai đầu (bỏ cắt, từng lớp riêng trên nền bảng): rãnh 498–849, phần đầy 498–849 ở 720p; 747–1274 cả hai ở 1080p.
  - Màn tựa: Settings không có Resume, Quit to title; trong trận có đủ. Bảng Sound 626 px, Settings 628 px ở 720p, không cuộn.
  - Tab: 14 lần Tab đều ở trong bảng (Close, núm, Mute, danh sách, nút nghe thử, Keyboard volume, …, quay về Close); quầng
    `rgb(61, 184, 255)` trên nút và dòng danh sách, không viền; mũi tên trái 50 → 49; Esc đóng bảng.
  - Âm phím: catalogue Typing Feel `ready` (34 bộ); chọn Deep trong bảng, đóng, đếm ngược xong, gõ một chữ:
    `stats.played` 0 → 1, không bị Relay thay.
  - Ở 0 núm che hết kênh sáng (kênh của phần đầy bắt đầu khoảng 7 px trong rãnh, núm vẽ từ 4,5 px): bên trái núm chỉ còn
    mũ vàng như của rãnh; từ 1 % một vệt lam sáng hiện ra bên trái núm.
- `survival-ui-art.mjs` trên host chơi (đúng như header của nó): **60/60 kiểm đạt** ở 1280 × 720 và 1920 × 1080, kể cả
  `sliderSkin` (lớp phần đầy, `slider-fill.1024`, rãnh rỗng `slider-track.1024`), `sliderFill` (sáu rãnh bằng nhau, `--kit-qs-v`
  đúng giá trị), `quickIcons`, `optionsIcons` (có `icon-ship`), `frames`, `artRequests`; lỗi duy nhất trong log là trang thử
  không có WebGL của chính kịch bản (`noglMessage`).
- Tờ ghép: `lastline-1280x720.jpg`, `lastline-1920x1080.jpg` (thư mục `panels-art/` trong scratchpad của phiên điều
  phối); số đo JSON ở `tmp/panels-art/`; 203 ảnh thô (137,8 MB) đã xoá bằng `tools/capture-prune/prune.mjs`.

## Còn lại

- Ảnh của phiếu 245 (tấm dòng danh sách riêng, nút Close icon) và 246–249 chưa gắn: làn Codex còn đang vẽ. Khi có,
  `listRow`/`listRowActive` và `close` của `quickSkin()` là chỗ gắn.
- Pace (`icon-pace-director`) và Screen shake (`icon-shake`) giữ ảnh cũ tới khi phiếu 247 xong.
- `media.md5` chưa cập nhật: cần `pnpm media:push` ở repo cha cho 28 file WebP mới (ngoài phạm vi lượt này).

## Lượt sửa theo giám khảo sau bước gắn ảnh (31/10, đêm)

Giám khảo chấm bảng sau lượt gắn ảnh và ghi 6 mục (3 thuộc kit, 3 thuộc game). Kit sửa ở repo cha `fc7f4a11` (Master
tắt tiếng, nút Listen, thanh cuộn) cùng `ba2b4d65` (Tab và Shift+Tab, một người sửa khác làm), rồi chép vào Last Line:
`node scripts/sync-game-kit.mjs --target games/typing-survival` (7 file của `ui/quick-settings` và `feedback/typing-fx/audio.ts`,
thêm `focus.ts`), `verify-kit` OK.

| Mục của giám khảo | Đã làm |
|---|---|
| Master khi tắt tiếng nhìn yếu: nút vẫn "Mute", icon hàng vẫn là loa thường, số không gạch (kit) | Kit làm phần này: nút đọc "Unmute" trên tấm button-active, hàng Master mang loa tắt `hud-sound-muted` của phiếu 180 (128 px, đã có trong `quickIcons()`, không phải gắn thêm) khi tắt tiếng hoặc ở 0, con số gạch ngang và mờ 0,55, cả thanh trượt (hai lớp rãnh và núm) mờ. Game chỉ đặt độ mờ cũ của mình qua `--kit-qs-muted-filter: saturate(0.3) opacity(0.45)` và bỏ luật `:has(...)` cũ; nút trong cột 70 px lùi chữ còn 6 px mỗi bên để "Unmute" vừa (đo: không tràn ở cả hai cỡ). |
| Nút Listen không có phản hồi khi rê, khi nhấn, không cho biết mẫu đang kêu; icon cố định 24 px (kit) | Kit: icon `24px × --kit-qs-s` (36 px ở 1080p, bên dòng 51 px), rê chuột sáng 1,2 kèm quầng (ở Last Line là xanh `--volt`), nhấn thu 0,84, sáng `is-playing` đúng lúc mẫu kêu. Bỏ luật cỡ icon riêng của game (kit đã làm). Đo: rê đổi 17,9 % điểm ảnh quanh nút ở 720p (21,2 % ở 1080p), nhấn 14,1 % / 17,3 %, sáng khi kêu 13,2 % / 16,5 %; sáng 1,00 s / 0,99 s (mẫu nghe thử dài 1 s). |
| Chip đang chọn vẫn chữ trắng ngà, chỉ có tấm và quầng 12 px (game) | Chip đang chọn và nút bật (On) đọc màu xanh sáng `--volt-hi` (`--kit-qs-active-text`, cùng màu dòng âm phím đang chọn), chỉ khi có tấm button-active. Đo: `rgb(166, 224, 255)`; chip chưa chọn vẫn `rgb(244, 241, 235)`. |
| Nền sau bảng không mờ, menu màn tựa sắc nét và bị mép bảng cắt (game) | `.kit-qs__backdrop` mờ `blur(5px × --kit-qs-s)` như Dragonhold (5 px ở 720p, 7,5 px ở 1080p). |
| Ô xem thử trong Settings trống khoảng một phần tư vòng lặp, chỉ còn vòng va chạm nằm trên viền dưới (game) | `src/view/type-fx-preview.ts`: từ nay chữ sau hiện ngay bước sau chữ trước xong (`REST = 1`, 110 ms, đúng khoảng chờ của strip như trong trận; trước là 5 bước nghỉ cộng 1 bước hiện, chữ có phím sai thêm 1 bước). Điểm chữ bay về (`previewTargetY`) lùi lên trên dải viền dưới 12 px × tỉ lệ cộng 0,7125 cỡ vòng (vòng 1,425 lần ở nửa đời), nên vòng nằm trong khung. Đo 4,4 s trên host chơi: 0 % khung hình không có chữ (trước khi sửa 17 % với `REST = 2`), 0 lần vòng (còn ≥ 50 % độ đậm) vượt qua dải viền ở cả hai cỡ. |
| Shift+Tab từ khung hộp thoại không làm gì; thanh cuộn danh sách là thanh xám của hệ điều hành (kit) | Shift+Tab: `ba2b4d65` (kit tự giữ Tab khi bảng mở); đo: từ khung hộp thoại, Shift+Tab tới nút cuối của bảng (Settings: Screen shake ở màn tựa; Sound: Interface). Thanh cuộn: kit vẽ thanh mảnh, Last Line tô `--volt-glow` (`scrollbar-color: rgba(61, 184, 255, 0.38) transparent`). Chưa có ảnh con trượt cuộn nào được nhận nên chưa dùng ảnh. |

Kiểm:

- `pnpm check`: kit OK, **39 file, 521 test** đều qua (trước 516), build OK; `tests/panels-art.test.ts` thêm 5 test
  (Master tắt tiếng, màu chip, nền mờ, Listen và thanh cuộn, ô xem thử). `pnpm build:survival` ở repo cha OK.
- `survival-quick-panels.mjs` trên host chơi (thêm 13 kiểm cho các mục trên): **33/33** ở 1280 × 720 và 1920 × 1080;
  0 ảnh hỏng, 0 yêu cầu lỗi, 0 ngoại lệ; phần đầy đúng giá trị ở 0/50/100 (720p 513 / 674 / 834, cần 513 / 673,5 / 834;
  1080p 769 / 1011 / 1252, cần 769 / 1010,25 / 1251,5); sáu rãnh 351 px (720p) và 527,5 px (1080p); hai đầu phần đầy
  trùng rãnh; Tab ở trong bảng, mũi tên đổi thanh trượt, Esc đóng; chọn bộ Deep trong Sound, một phím kêu đúng một lần.
- `survival-ui-art.mjs`: **60/60** ở cả hai cỡ (ngoại lệ duy nhất là trang thử không WebGL của chính kịch bản).
- Tờ ghép `lastline-1280x720.jpg`, `lastline-1920x1080.jpg` (thư mục `panels-art/` trong scratchpad của phiên điều
  phối); số đo JSON ở `tmp/panels-art-fix/`; ảnh thô đã xoá bằng `tools/capture-prune/prune.mjs`.

Chưa làm: xoá bản `watchMute` riêng trong `src/app/quick.ts` của Dragonhold và Wordwoven (lượt này không được sửa game
khác); khi hai game chép bản kit `fc7f4a11` phải xoá bản đó cùng CSS của nó.
