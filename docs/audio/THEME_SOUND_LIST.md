# Tuyến Cuối — bộ âm "Vành Chân Trời"

> Ngày 23/10/2026. Chủ đề: một trạm thép cũ giữ hành lang cuối cùng ở mép hố đen. Âm **industrial**: synth trầm, trống máy, bass; trong trận là thép, súng nặng, điện, kim loại vỡ. Khác hẳn tiếng laser và nhạc điện tử vũ trụ của Space Typing.
> **Cập nhật 29/10/2026:** tiếng phím Firefly đã dùng file thật (phiếu 191, mục 2.1). Relay và âm trận vẫn tổng hợp bằng mã (`src/audio/theme-audio.ts`, `src/audio/music.ts`, khối dựng `src/audio/synth.ts`). Các mục dưới giữ mô tả và prompt cho việc thay âm trận bằng file sau này.

## 1. Cách âm chạy

- Phát qua `SceneAudio` của kit (`src/kit/audio`), với bảng bus riêng `BUSES` trong `theme-audio.ts`. Mỗi bus có một "insert" (âm lượng của cài đặt + một bộ nén nhẹ) nên 40 quái chết một lúc không vỡ tiếng.
- **Nhường tiếng khi đọc từ** (sự kiện `PRONUNCIATION_EVENT` của kit speech): súng và va chạm −6 dB (×0,5), nổ −5 dB, phím −4,4 dB, nhạc −4 dB (×0,63), cảnh báo −2 dB. Không tắt hẳn tiếng nào.
- Gom tiếng như `AudioCues` của kit: tiếng trúng gom 38 ms rồi phát một lần (to hơn khi nhiều), tối đa 4 tiếng nổ trong 120 ms, tiếng hạ liên tiếp leo dần một thang ngũ cung. Bậc va chạm lấy từ bảng `tiers` của kit feedback.
- Chưa có tiếng nào phát trước lần bấm phím hay chuột đầu tiên (trình duyệt chặn).

| Bus | Mức | Khi đọc từ | Âm trên bus |
|---|---|---|---|
| `keys` | 0,5 | ×0,6 | `key.*` |
| `guns` | 0,42 | ×0,5 | `gun.xung`, `gun.xung.tail`, `gun.tia.start`, `gun.tia.loop`, `gun.tia.end`, `gun.tan.fire`, `gun.ray.*`, `gun.phao.launch` |
| `impacts` | 0,6 | ×0,5 | `hit.*`, `gun.tia.pulse`, `foe.shot.down`, `gun.phao.burst`, `shield.*` |
| `kills` | 0,55 | ×0,56 | `kill.*`, `foe.split`, `leader.down` |
| `alerts` | 0,8 | ×0,8 | `word.*`, `streak.up`, `foe.shot`, `hurt.*`, `support.repair`, `alarm.surge`, `end.*`, `leader.horn`, `rift.*` |
| `ui` | 0,55 | ×0,7 | `ui.*`, `star.get` |
| `music` | 0,9 | ×0,63 | `music.calm`, `music.surge` |

## 2. Khi có file thật

- Đặt file ở `public/assets/typing-survival/audio/<id>.ogg` (Git bỏ qua). Nguồn gốc (bản WAV, prompt, công cụ, lần thử) lưu ở `art-src/audio/`. Đẩy lên kho media của repo cha khi kho có mục cho game này. **Không commit file âm.**
- Mỗi tiếng ngắn: 48 kHz, mono (trừ nhạc và `end.*`), đỉnh −1 dBFS, cắt im lặng đầu file (tiếng phải bắt đầu ngay, dưới 5 ms). Tiếng lặp nhiều (`key.ok`, `gun.xung`, `hit.t1`, `kill.swarm`) cần 4–6 biến thể.
- Nhạc: hai stem cùng nhịp **96 BPM, La thứ**, vòng 8 ô nhịp (20 s) lặp liền, −16 LUFS. `music.calm` và `music.surge` chơi cùng lúc, trộn theo độ đông của bầy quái (`hordeIntensity` trong `music.ts`).
- Đổi `sounds: {}` trong `ThemeAudio` thành bảng file; mã tổng hợp giữ làm dự phòng khi file chưa tải xong.
- Prompt dưới đây viết bằng tiếng Anh vì các công cụ tạo âm hiểu tiếng Anh tốt nhất.
- **Âm hành động** (súng, trúng, nổ, quái chết, quái bắn, tuyến bị đánh; quyết định Q6 của chủ dự án ngày 24/10/2026, ghi ở `tools/audio-lab/DECISIONS.md` của repo cha): đủ các phần mà hành động có (nạp, khóa nòng; đầu tiếng có lực; thân; đuôi vang trong hành lang thép), cỡ âm theo nguồn. Lớp sub chỉ làm lớp dưới. Không dùng hướng "bụp, thụp", "pop", "puff", tiếng trầm ngắn đứng riêng, kiểu đồ chơi. Dải 1–4 kHz chỉ ở đầu tiếng; đuôi nằm dưới 1 kHz hoặc trên 4 kHz.
- **Mỗi file tự có thân và đuôi.** `theme-audio.ts` phát một tiếng cho mỗi bậc trúng (`flush`) và mỗi phát súng, không ghép lớp nào lúc chạy. Các lớp dùng chung hit.sub, hit.tail, gun.xung.tail mới là đề xuất của Audio Lab (`AUDIO_PIPELINE.md` §6.3 #3; §16 #6 còn mở). Audio Lab có ghép lớp thì ghép sẵn vào file của từng id.

### 2.1. Bộ tiếng phím Firefly (phiếu 191, 29/10/2026; 32 bộ từ 30/10/2026; 33 bộ từ tối 30/10/2026)

Danh mục gốc và 33 manifest bộ ở `public/assets/typing-survival/audio/keys/` được Git giữ; 2.710 OGG (32 bộ của bản dựng 218, mỗi bộ 70–80 `key-NN.ogg`, 8 `space-NN.ogg`, một `preview.ogg` 1 s; cộng Raindrop Tile, 17 `key-NN.ogg`, 8 `space-NN.ogg`, một `preview.ogg` 1 s) được ghi vào `media.md5` và đi qua kho media. Không chép WAV, không chép dấu nội bộ `.firefly-builder.json`. Nguồn: bản dựng `keys-firefly/218` (Codex 218) từ các lượt Adobe Firefly của chủ dự án, giấy phép ghi trong từng manifest; giữ nguyên byte của staging `~/AudioLab/review/staging/keys-firefly/`, không xử lý lại âm. Chủ dự án 30/10: giữ 32 bộ này; làm thêm bộ theo `docs/games/audio/KEYS_FIREFLY_HANDOFF.md` của repo cha.

Bộ thứ 33, `raindrop-tile` (Raindrop Tile, họ Crisp, ngay sau Crisp Silk, `order` 18; các bộ sau lùi một bậc): chủ dự án chọn bản A ngày 30/10 (đuôi tự nhiên và giọt nước, không EQ). Danh mục ghi `score: null`, `ownerPick: true`: không có điểm, vì thước đo 218 trừ điểm đúng phần đuôi dài chủ dự án muốn; đừng tự đặt điểm. Manifest bộ theo schema `typing-keys-firefly/2` (`files: [{file, set, durationMs}]`, `preview`). OGG Vorbis **stereo** 48 kHz (32 bộ kia mono); phím dài tới 450 ms, Space tới 535 ms. Kit phát hết đuôi: không cắt độ dài, preview đúng 1 s; ở 10 chữ/giây 6 giọng phím và 2 giọng Space đủ, không giọng nào bị cướp.

| Họ (tiêu đề trong Sound) | Số bộ | Id bộ (tên trong Sound) |
|---|---|---|
| Deep | 3 | `deep` (Deep Velvet), `deep-amber`, `deep-cedar` |
| Warm | 6 | `warm` (Warm Velvet), `warm-amber`, `warm-cedar`, `warm-pebble`, `warm-slate`, `warm-silk` |
| Rounded | 1 | `rounded` (Rounded Velvet) |
| Solid | 2 | `solid` (Solid Velvet), `solid-amber` |
| Crisp | 7 | `crisp` (Crisp Velvet), `crisp-amber`, `crisp-cedar`, `crisp-pebble`, `crisp-slate`, `crisp-silk`, `raindrop-tile` (Raindrop Tile) |
| Clear | 4 | `clear` (Clear Velvet), `clear-amber`, `clear-cedar`, `clear-pebble` |
| Bright Clack | 10 | `bright-clack` (Bright Clack Velvet, mặc định), `bright-clack-amber`, `-cedar`, `-pebble`, `-slate`, `-silk`, `-copper`, `-walnut`, `-moss`, `-ember` |

Bảy id cũ (`deep`, `warm`, `rounded`, `solid`, `crisp`, `clear`, `bright-clack`) vẫn còn, nên save cũ không đổi. Tên các bộ khác là "<Họ> <Chất>" (Amber, Cedar, Pebble, Slate, Silk, Copper, Walnut, Moss, Ember), trừ Raindrop Tile; thứ tự và điểm nằm trong `keys-manifest.json` gốc.

- Hàng Sound: Off, Relay (không có họ, không tiêu đề), rồi 33 bộ theo thứ tự danh mục, mỗi họ một tiêu đề của kit; PageUp/PageDown nhảy giữa các họ, mở bảng thì danh sách cuộn tới bộ đang chọn. Mặc định `DEFAULT_KEYBOARD_SOUND` trong `src/app/settings.ts` là `bright-clack` (chủ dự án 30/10). Save `survival.settings.typingFx.soundProfile` giữ lựa chọn; id đã mất về mặc định còn tồn tại.
- `TypingSounds` của kit chọn biến thể theo vòng xáo, không lặp trong 8 phím gần nhất; giải mã theo lô 16 file, đổi bộ thì nhả bộ cũ. Bộ đã lưu nạp lúc khởi động mà người chơi chọn bộ khác giữa chừng cũng được nhả (`loadSavedKeyboard`). Mỗi chữ đúng phát một `key-*`, Space phát `space-*`. Phím sai/lạc dùng cùng nhóm phím ở mức nhỏ hơn của kit. Hoàn tất từ chỉ giữ tiếng nạp đạn của game, không thêm một sample phím cách.
- Firefly đi vào destination của AudioContext chung ở Master × Keyboard volume, ngoài Effects và bus Relay. Relay cũng có mức Keyboard riêng ngoài Effects; chỉ chọn Relay mới mở synth `key.ok`/`key.bad`. Off hoặc Master mute/0 làm im tiếng phím.
- Có thể chuẩn bị context và giải mã bộ đã lưu trước khi chơi; nhạc và âm trận vẫn chờ cử chỉ đầu tiên. Trận chờ lượt nạp bộ ban đầu hoàn tất trước khi bước sim.
- Rê chuột/focus tên bộ: chờ 150 ms rồi phát preview 1 s; rời/chuyển/đóng bảng tắt dần 30 ms, do kit phiếu 190 quản lý. Mở bảng và đếm 3-2-1 tiếp tục khóa phím gõ và dừng trận.

## 3. Gõ và nạp đạn

Lượt cảm giác S1 (`docs/FEEL_PASS_S1.md` §3.5, 26/10) làm lại cả nhóm này theo Q6 (`src/audio/type-audio.ts`). Mỗi từ là một câu "tụ lực rồi xả": phím là phần chuẩn bị, mỗi phím một nốt đi lên thang ngũ cung La thứ (hợp nhạc nền 96 BPM La thứ), từ xong về La5 (880 Hz). Dải 1–4 kHz chỉ ở đầu mỗi cú đánh (tắt ≤ 30 ms); thân và đuôi nằm dưới 1 kHz hoặc trên 4 kHz, để từ được đọc ngay sau vẫn rõ.

| Chữ thứ | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Xong từ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Nốt | La3 | Đô4 | Rê4 | Mi4 | Sol4 | La4 | Đô5 | Rê5 | Mi5 | Sol5 | La5 |
| Hz | 220 | 261,6 | 293,7 | 329,6 | 392 | 440 | 523,3 | 587,3 | 659,3 | 784 | 880 |

| Id | Khi nào | Cảm giác | Mã hiện tại |
|---|---|---|---|
| `key.ok` | Mỗi phím đúng | Rơ-le đóng trên bàn phím thép, rồi một nốt nạp ở cao độ của chữ đó và bàn thép ngân khẽ một quãng tám dưới. Chuỗi sạch từ 6 từ: thêm bội âm quãng tám | Nhiễu dải 2,7 kHz 12 ms, tách 3,3 kHz 18 ms (rơ-le, 5 cao độ xoay vòng ±3 % như cũ); nốt tam giác lọc thấp 1 kHz, lên 4 ms, tắt 64 ms, −14 dB so với rơ-le; sin nửa cao độ 90 ms, −20 dB. Bỏ tiếng "thock" vuông 240 Hz cũ (tiếng trầm ngắn đứng riêng) |
| `key.bad` | Phím sai | Rơ-le đóng mà không ăn, xì điện một chút, nốt của chữ trước tụt nửa cung. Không còi, không chê. Phím lạc (không bến nào bắt đầu bằng nó): nhỏ hơn 3 dB, không nốt | Nhiễu lọc thấp 1,2 kHz 14 ms (−6 dB), 3 hạt tách thông cao 5 kHz trong 25 ms (−18 dB), nốt trước trượt xuống nửa cung trong 30 ms. Thay sin 105 → 72 Hz cũ |
| `word.load` | Gõ xong một từ: một băng đạn nạp vào súng | Chốt khóa, luồng năng lượng trượt lên La5, băng đạn đóng sập, đuôi vang ngắn trong hành lang thép | Nhiễu thông cao 3,2 kHz 20 ms; răng cưa lọc thấp 900 Hz trượt từ nốt của phím cuối lên 880 Hz trong 90 ms; ở 90 ms: nhiễu lọc thấp 900 Hz, sin 170 → 52 Hz, thép tấm gốc 310 Hz (cũ 1.380 Hz, nằm trong dải giọng); đuôi: nhiễu lọc thấp 800 → 300 Hz và thép dầm 233 Hz, 350 ms, −10 dB |
| `word.perfect` | Gõ xong không lỗi và nhanh | Như `word.load`, thêm tiếng rít nạp điện vượt qua dải giọng trong 25 ms đầu rồi ngân trên 4 kHz, vài tia lửa điện | Như trên + sin 1 → 4,6 kHz trong 25 ms, sin 4,6 → 6,4 kHz 200 ms, 4 tiếng tách 6,5 kHz. Cũ: 620 → 1.900 Hz trong 220 ms, nằm trọn dải giọng |
| `word.full` | Gõ xong một từ khi bến đã đầy (không nạp) | Chốt va mà không khóa, lò xo rung; không có đuôi | Nhiễu dải 2,2 kHz 15 ms và tách tam giác 2,2 kHz; tam giác 900 → 600 Hz lọc thấp 1 kHz 80 ms, sin 760 → 640 Hz 70 ms; −6 dB so với `word.load`; bus `alerts` |
| `streak.up` | Chuỗi gõ sạch đạt 3, 6, 10, 20 từ | Hai thanh thép nhỏ gõ liền, La5 rồi Mi6, thân tắt ngay, ngân trên 4 kHz | Hai cú cách 60 ms: tam giác 880 / 1.318,5 Hz tắt 30 ms, bội 6,02× và 8,98× (5,3 / 7,9 kHz và 7,9 / 11,8 kHz) ngân 180–200 ms; −12 dB so với `word.load`; bus `alerts` |

Kiểm dải giọng (§7.5 của đặc tả; kịch bản `survival-feel` cảnh `audio`, dựng từng âm trong `OfflineAudioContext` của Chrome): năng lượng 1–4 kHz ngoài 30 ms sau mỗi cú đánh phải ≤ −20 dB so với khung 10 ms to nhất của chính âm đó. Số đo nằm trong changelog `docs/changelog/2026-10-26-feel-pass-s1.md`.

- `key.ok` — *Prompt:* "Single mechanical relay click on a heavy steel console followed by a soft, short charging tone (one pitched note, sine-like, under 1 kHz, 60 ms) and a faint low steel-desk resonance, dry, tight, 120 ms total; record 10 pitches A3 C4 D4 E4 G4 A4 C5 D5 E5 G5."
- `key.bad` — *Prompt:* "A heavy relay closing without catching: a muffled steel click, a tiny electric fizz, a short pitch sag, 60 ms, soft, no buzzer, no ring, not a toy sound."
- `word.load` — *Prompt:* "Energy surging up into a weapon (a quick filtered rising tone to A5, 90 ms), then a heavy rifle magazine slammed into a steel receiver with a latch click, and a short low echo down a steel corridor, 450 ms, industrial, punchy, the tail under 1 kHz."
- `word.perfect` — *Prompt:* "Same as a heavy magazine slammed home after a rising energy surge, plus a very fast electric charge-up whine that sweeps up past 4 kHz in 25 ms and rings on high and thin with a few tiny sparks, satisfying, 500 ms, industrial sci-fi."
- `word.full` — *Prompt:* "A steel latch striking a full magazine well and failing to lock: a sharp metal click and a short spring rattle, 100 ms, dry, no echo, quieter than a reload."
- `streak.up` — *Prompt:* "Two tiny steel bars struck in quick succession (A5 then E6, 60 ms apart), the body dying at once and a bright high shimmer ringing above 4 kHz for 200 ms, delicate, rewarding, not a chime toy."

## 4. Súng

Lượt cảm giác S1 (`docs/FEEL_PASS_S1.md` §4.3, 26/10, bước 2) làm lại nhóm súng theo Q6 (`src/audio/gun-audio.ts`): khóa nòng, đầu tiếng giòn (dải 1–4 kHz chỉ ≤ 30 ms đầu), thân dưới 1 kHz hoặc ngân trên 4 kHz, đuôi vang hành lang dưới 1 kHz; không tiếng trầm đứng riêng.

| Id | Khi nào | Cảm giác | Mã hiện tại |
|---|---|---|---|
| `gun.xung` | **Mỗi** viên Xung rời nòng (10–11 viên/s; trước lượt cảm giác chỉ một nửa số viên) | Pháo tự động hạng nặng: viên đầu của băng có tiếng khóa nòng; tiếng nổ giòn, cú đấm trầm có thân | Viên đầu: nhiễu dải 3,4 kHz 15 ms + tam giác 5,2 kHz (khóa nòng); nhiễu thông cao 1,9 kHz 30 ms; sin 150 → 46 Hz 90 ms (viên sau 70 ms, −3 dB); nhiễu dải 640 Hz 70 ms |
| `gun.xung.tail` | Viên đầu của một loạt, rồi mỗi 0,5 s khi còn bắn, và 150 ms sau viên cuối | Tiếng nổ vỗ vào hành lang thép rồi lăn đi, dưới 900 Hz | Nhiễu lọc thấp 820 → 260 Hz 420 ms; thép dầm 150 Hz (ba bội thấp) 360 ms |
| `gun.tia.start` | Tia bật | Tia bật: máy phát quay lên, hồ quang bắt "xẹt" rồi kêu ù; vang hành lang thép ngắn | Răng cưa 70 → 260 Hz qua lọc mở dần, nhiễu dải trượt lên, 7 tiếng tách, ù 55 Hz |
| `gun.tia.loop` | Suốt lúc tia cháy (dừng khi tắt) | Hồ quang ù đều, lách tách điện ở dải cao; nhỏ hơn tiếng bật | Lặp: sin 55 Hz, răng cưa 110 Hz lọc thấp 320 Hz, nhiễu dải 6 kHz đóng mở 23 lần/s; vào 50 ms, tắt 60 ms |
| `gun.tia.end` | Tia tắt | Tia tắt: máy phát hạ điện, hồ quang xì tắt, tiếng ù chìm vào vang thép | Răng cưa 260 → 48 Hz, lọc đóng 900 → 200 Hz; vang: nhiễu lọc thấp 700 → 240 Hz 320 ms, thép dầm 120 Hz 300 ms |
| `gun.tia.pulse` | Mỗi nhịp 0,1 s của Tia có trúng quái | Tia điện chích, to dần theo số quái bị cắt | Nhiễu thông cao 4,2 kHz 45 ms, vuông 1.900 → 880 Hz |

- `gun.xung` — *Prompt:* "Heavy autocannon single shot from a steel turret: a breech clack, a deep punch with a sharp crack and a short thick body, a quick slap off the steel corridor, 350 ms, industrial."
- `gun.xung.tail` — *Prompt:* "The report of an autocannon burst slapping off the walls of a long steel corridor and rolling away, low and dark, no attack transient, under 900 Hz, 450 ms."
- `gun.tia.start` — *Prompt:* "Industrial electric arc ray igniting: a generator spinning up, a high-voltage arc striking and crackling over a low 55 Hz hum, short steel corridor echo, 600 ms, gritty."
- `gun.tia.loop` — *Prompt:* "Seamless loop of an industrial high-voltage arc burning steadily: a deep 55 Hz electrical hum with a fine crackle of sparks above 5 kHz, steady, not harsh, 2 s loop."
- `gun.tia.end` — *Prompt:* "High-voltage generator powering down: falling pitch, the arc fizzling out, the hum dying into a short steel corridor echo, 400 ms, industrial."
- `gun.tia.pulse` — *Prompt:* "Short electric zap of an arc burning through metal, crisp and sizzling, 50 ms, several variations."

## 5. Trúng, hạ, quái bắn

| Id | Khi nào | Cảm giác | Mã hiện tại |
|---|---|---|---|
| `hit.t1` | Đạn Xung trúng (bậc T1), gom 38 ms | Keng nhỏ, sáng trên vỏ thép: đầu tiếng giòn, thân thép gọn, ngân tắt nhanh vào vang hành lang thép ngắn và thấp. Phát tới 10 lần mỗi giây nên nhỏ, gọn, đuôi nối các phát thành loạt | Nhiễu thông cao 3,6 kHz, thép dầm 430 Hz |
| `hit.t2` | Chí mạng, gõ chuẩn (T2, T3) | Chí mạng: keng nặng hơn T1, nứt giòn ở đầu, thân thép dày, một lớp trầm nhẹ bên dưới (ít sub), ngân tắt vào vang hành lang thép ngắn | Như T1, thêm sin 115 → 40 Hz |
| `hit.t4` | Đòn lớn (T4 trở lên) | Đòn lớn: nện nặng vào dầm thép, nứt giòn, thân thép dày có trọng lượng, lớp trầm bên dưới, dầm ngân dài lăn dọc hành lang thép | Như T2, thêm nhiễu thấp 0,5 s và thép 233 Hz ngân 0,7 s |
| `kill.swarm` | Quái bầy chết (gom theo ô 3 m mỗi khung) | Kim loại vỡ vụn giòn, mảnh văng leng keng, một tiếng nổ trầm nhỏ ở dưới; vang hành lang thép ngắn. Thanh thép leo nốt khi giết liên tục tách riêng | Nhiễu dải 1,15 kHz trượt xuống, mảnh vỡ thông cao, sin 150 → 38 Hz, thanh thép 523 Hz × thang ngũ cung |
| `kill.elite` | Quái tinh nhuệ (lính) chết | Như trên nhưng nặng hơn: thép xé toạc, nổ trầm có thân, phóng điện lách tách, mảnh rơi; vang hành lang thép | Nổ 95 Hz, răng cưa 1.100 → 120 Hz, tiếng tách điện |
| `foe.shot` | Lính bắn vào tuyến | Cảnh báo: cầu plasma nạp rít lên, bắn ra có lực rồi lao tới tuyến; vang hành lang thép ngắn | Răng cưa 340 → 880 Hz qua dải trượt, nhiễu dải 2,4 kHz |
| `foe.shot.down` | Xung bắn rơi đạn của lính | Xung bắn rơi đạn của lính: viên đạn vỡ giữa không trung, tia lửa nhỏ tóe, mảnh kim loại leng keng; vang ngắn | Nhiễu dải 3 kHz, thép 880 Hz |

- `hit.t1` — *Prompt:* "Small bullet striking a steel hull plate: a bright crisp clank, a small tight steel body, the ring dying fast into a short low echo down the steel corridor, 140 ms, several variations."
- `hit.t2` — *Prompt:* "Heavy bullet striking thick steel armour: a hard bright crack, a dense steel clang with a solid body and a light low layer underneath, the ring fading into a short echo down the steel corridor, 260 ms, punchy."
- `hit.t4` — *Prompt:* "Massive blow on a steel beam: a hard crack, a heavy clang with a thick steel body and a deep layer underneath, a long ringing beam resonance rolling down the steel corridor, 900 ms, industrial."
- `kill.swarm` — *Prompt:* "Small metal creature shattering: crunchy breaking metal, shards scattering and ringing briefly, a low boom underneath, short steel corridor echo, 250 ms, several variations."
- `kill.elite` — *Prompt:* "Large armored machine creature exploding: heavy metal tearing, a deep boom with body, an electrical discharge crackle, debris falling, steel corridor echo, 500 ms."
- `foe.shot` — *Prompt:* "Alien plasma blob charging with a rising buzz, then spat out with force and rushing toward you, short steel corridor echo, 250 ms, sci-fi industrial."
- `foe.shot.down` — *Prompt:* "Small projectile shot down mid-air: a short crisp metallic crack, a tiny spark burst and fragments tinkling, short steel corridor echo, 150 ms."

Chuỗi hạ: thanh thép của `kill.*` leo một nốt ngũ cung mỗi lần hạ cách nhau dưới 1 s (C5 trở lên, tối đa 12 bậc), rồi về gốc. Khi làm file thật, giữ phần "nốt" tách riêng (`kill.chime`) để mã vẫn chỉnh cao độ được.

## 6. Tuyến bị đánh, cảnh báo, kết trận

| Id | Khi nào | Cảm giác | Mã hiện tại |
|---|---|---|---|
| `hurt.breach` | Quái chạm vạch đáy | Thân trạm rung: tiếng nổ trầm có thân, thép rên, còi báo hai nốt ngắn; vang dội dọc hành lang thép | Sin 82 → 28 Hz, răng cưa trầm lọc, hai bíp vuông 440 / 330 Hz |
| `hurt.hull` | Đạn lính trúng tàu | Tiếng thép bị đập mạnh: keng to có thân, ngân ngắn, rung trầm; vang hành lang thép | Thép dầm 176 Hz, sin 100 → 38 Hz |
| `hurt.drain` | Quái trong vùng hút rút giáp tuyến (mỗi điểm giáp, tối đa một tiếng mỗi 420 ms) | Lách tách điện khô trên tấm giáp, nhỏ: hồ quang ký sinh bám vào và hút điện; vang thép rất ngắn | Tách điện 3,6 kHz, răng cưa 220 → 150 Hz lọc thấp |
| `support.repair` | Bộ điều nhịp thả khoang sửa chữa khi tuyến gần vỡ (+giáp) | Động cơ servo rít lên, chốt khóa sập, xì hơi: được cứu một nhịp | Vuông 180 → 720 Hz, cú đập 150 → 60 Hz, thép thanh 520 Hz, xì cao |
| `alarm.surge` | Bắt đầu đỉnh tràn (biển "ĐỈNH TRÀN") | Còi báo động của trạm, hai lượt lên xuống, nền ù trầm | Răng cưa 420 ↔ 640 Hz qua lọc thấp, ù 55 Hz 1,25 s |
| `end.win` | Giữ được 3 phút | Hợp âm máy (power chord) mở dần, xả hơi nước: nhẹ nhõm, nặng nề | Ba răng cưa La 110 / 165 / 220 Hz, lọc mở 380 → 3.200 Hz, hơi xì |
| `end.lose` | Tuyến vỡ | Hạ điện, kim loại sụp từng mảng | Răng cưa rơi bốn quãng tám, năm tiếng thép thấp dần, nổ trầm |

- `hurt.breach` — *Prompt:* "Station hull breach: a deep boom with body, groaning stressed steel and a short two-tone klaxon, echoing down a steel corridor, 800 ms, industrial, ominous."
- `hurt.hull` — *Prompt:* "Heavy blow on a ship's steel hull: a loud clang with a dense body, a short ring and a low rumble, steel corridor echo, 400 ms."
- `hurt.drain` — *Prompt:* "Faint electrical crackle on steel armour plating: a small parasitic arc latching on and sapping power with a thin sizzle, quiet, short steel echo, 150 ms."
- `support.repair` — *Prompt:* "Repair pod docking on a steel station: servo whine rising, heavy lock clunk, short hiss of pressure, 900 ms, reassuring, industrial."
- `alarm.surge` — *Prompt:* "Industrial station siren, two rising and falling sweeps over a low drone, 1.3 s, urgent but not piercing, slightly distorted."
- `end.win` — *Prompt:* "Triumphant but heavy industrial stinger: distorted power chord in A swelling open with a filter sweep, ending with a hiss of steam, 2 s."
- `end.lose` — *Prompt:* "Industrial failure stinger: machines powering down, falling pitch, metal structure collapsing in several heavy clanks, low boom, 2 s."

## 7. Menu

| Id | Khi nào | Cảm giác | Mã hiện tại |
|---|---|---|---|
| `ui.move` | Đổi mục trong menu (↑ ↓, rê chuột), đổi giá trị cài đặt | Tiếng tách rơ-le nhỏ | Nhiễu dải 3,6 kHz 10 ms |
| `ui.select` | Chọn một mục (Enter, bấm) | Cần gạt công tắc nặng đóng xuống | Sin 190 → 70 Hz, nhiễu thấp, thép tấm 900 Hz |
| `ui.back` | Quay lại (Esc) | Như `ui.select`, thấp hơn | Như trên, cao độ ×0,75 |

- `ui.move` — *Prompt:* "Tiny relay tick on an industrial control panel, 15 ms, dry, several variations."
- `ui.select` — *Prompt:* "Heavy industrial toggle switch thrown into place, solid metal clunk, 150 ms, dry."
- `ui.back` — *Prompt:* "Heavy industrial switch thrown back off, lower and softer metal clunk, 150 ms, dry."

## 8. Nhạc

| Id | Khi nào | Cảm giác | Mã hiện tại (bản giữ chỗ) |
|---|---|---|---|
| `music.calm` | Luôn chơi từ lần bấm đầu: màn chính, lúc sân thưa | Trống trải, nặng, chờ đợi ở mép vực: pad synth trầm, tiếng gió của khoảng không, tiếng thép xa | Ba giọng răng cưa (mỗi giọng hai dây lệch vài cent) qua lọc thấp thở chậm, sub, nhiễu gió, một tiếng thép mỗi 2 ô nhịp; vòng La thứ – Fa – Rê thứ – Mi |
| `music.surge` | Lớp thêm khi bầy quái đông (từ ~25 quái trên sân, đầy ở ~120, đỉnh tràn ít nhất 75 %) | Máy móc dồn dập: trống máy, bass răng cưa lọc, tiếng tán đinh ở mức cao nhất | Trống (kick gãy nhịp, tiếng thép tấm ở phách 2 và 4, hi-hat), rồi bass, rồi tiếng tán đinh, chồng dần theo độ đông |

- Hai lớp **trộn theo độ đông** (`layerGains`): pad nhỏ dần còn 45 % khi đông nhất; trống vào từ 8 %, bass từ 30 %, tán đinh từ 72 %. Đổi mượt trong khoảng 1,5 s. Tạm dừng: nhạc còn 45 %; màn chính: 80 %, chỉ lớp lặng.
- `music.calm` — *Prompt:* "Dark industrial ambient loop, 96 BPM, A minor, chords Am–F–Dm–E (two bars each), deep detuned analog synth pads, sub bass drone, distant metallic clanks echoing in a huge steel hall, wind of the void, no drums, cinematic and heavy, seamless 8-bar loop."
- `music.surge` — *Prompt:* "Industrial combat layer, 96 BPM, A minor, same chord loop Am–F–Dm–E, mechanical drum machine with broken kick pattern, metal-plate snare hits, tight hats, driving filtered sawtooth bass, riveting machine percussion, aggressive but leaves room for a voice, seamless 8-bar loop, designed to play on top of a separate ambient pad layer."

## 9. S1: súng mới, quái mới, hiểm họa, sao (`src/audio/gun-audio.ts`)

Mọi id dưới đây đi qua `ThemeAudio.gun(id, pan, now)`: mỗi id có bus riêng và khoảng cách tối thiểu giữa hai lần phát (ví dụ `hit.armour` 90 ms), để một loạt đòn vào Vỏ chỉ nghe thành một tiếng keng, không thành tiếng rè.

| Id | Khi nào | Cảm giác | Mã hiện tại |
|---|---|---|---|
| `gun.tan.fire` | Tán bắn một loạt 7 viên | Khóa bơm cạch, nổ đanh có thân trên sàn thép, rồi vỏ đạn leng keng; vang hành lang thép ngắn | Nhiễu thông cao 1,4 kHz 30 ms (trước 50), sin 120 → 40 Hz, nhiễu dải 820 → 380 Hz, vỏ đạn: thép 4,7 và 5,3 kHz (trước 2,6 và 3,1 kHz, giữa dải giọng), vang: nhiễu lọc thấp 760 → 260 Hz 250 ms |
| `gun.ray.armed` | Bến Ray có băng mà chưa nạp (model đạn băng lơ lửng ở nòng); tắt khi nạp | Tụ điện nhỏ ù khẽ, lấp lánh điện rất cao: "súng đã sẵn" | Lặp: tam giác 196 Hz lọc thấp 380 Hz, sin 98 Hz, nhiễu dải 7,2 kHz đóng mở 9 lần/s; −15 dB |
| `gun.ray.charge` | Ray bắt đầu nạp một phát (0,15 s) | Tụ điện rít lên: phần chuẩn bị của phát Ray, dừng gọn ở đỉnh; đầu tiếng, thân và đuôi nằm ở gun.ray.fire | Răng cưa 900 → 3.600 Hz qua lọc dải mở dần, sin 1,8 → 7,2 kHz |
| `gun.ray.fire` | Ray bắn | Tiếng nổ đanh, cú đấm trầm, điện xé, đuôi ngân dài trong hành lang | Nhiễu thông cao 3 kHz 30 ms, sin 220 → 50 Hz, điện xé: nhiễu thông cao 4,8 → 7,2 kHz 120 ms + 6 tiếng tách 6,2 kHz; vang: nhiễu lọc thấp 800 → 220 Hz 0,5 s, thép dầm 196 Hz (ba bội thấp) 0,6 s. Bỏ răng cưa 2,4 kHz → 600 Hz 0,5 s và thép 740 Hz (nằm trong dải giọng) |
| `gun.phao.launch` | Pháo Sao bắn một quả | Đạn trượt vào ống cạch, tiếng phóng giòn (không "bụp"), tên lửa rít bay lên trên tiếng rền; vang ngắn | Khóa nòng: nhiễu dải 2,6 kHz 20 ms + tam giác 4,8 kHz; phóng: nhiễu thông cao 2,2 kHz 28 ms, sin 140 → 55 Hz 0,2 s; rít: nhiễu dải 6 → 4,6 kHz 0,4 s; rền: nhiễu lọc thấp 260 → 120 Hz 0,4 s; đuôi: nhiễu lọc thấp 700 Hz 0,25 s. Bỏ sin 95 → 38 Hz đứng riêng ("thụp") và sin 1,2 → 2,2 kHz 0,5 s (giữa dải giọng) |
| `gun.phao.burst` | Quả Pháo Sao nổ; nổ liền nhau cách ≤ 70 ms thì mỗi tiếng cao hơn nửa cung (tối đa 4 nấc). Quái trúng trong vòng nổ không phát thêm `hit.*` (một tiếng, không chồng; trước đó phát thêm `hit.t2` có tiếng trầm 115 → 40 Hz) | Tiếng nổ giòn, nổ trầm có thân, mảnh lách tách, vang dội hành lang thép | Nhiễu thông cao 2,2 kHz 25 ms + 4,2 kHz 20 ms; sin 180 → 58 Hz 0,25 s; nhiễu lọc thấp 210 → 90 Hz 0,25 s; 7 tiếng tách 5,6 kHz; vang: nhiễu lọc thấp 800 → 160 Hz 0,6 s |
| `hit.armour` | Một đòn bị Vỏ chặn gần hết | Tiếng keng của tấm thép dày | Thép tấm ~1 kHz 0,32 s, nhiễu thông cao 5,2 kHz 20 ms |
| `shield.hit` | Đạn chạm khiên năng lượng của Khiên | Tiếng chích điện giòn khi đạn chạm, tiếng ù như thủy tinh trượt xuống thấp, tắt vào vang hành lang thép ngắn | Tam giác 1.300 → 700 Hz qua lọc dải, nhiễu dải 5,2 kHz |
| `shield.break` | Khiên vỡ | Thủy tinh vỡ trên tiếng ù sụp xuống | Răng cưa 900 → 120 Hz, 14 tiếng tách 7,2 kHz, nhiễu thông cao 6 → 2,5 kHz |
| `foe.split` | Một con Tách vỡ thành 3 mảnh | Vỏ nứt toác, ba mảnh văng lách cách | Nhiễu dải 1,8 kHz, sin 260 → 120 Hz, ba tiếng nhiễu dải ngắn 3,6 → 2,6 kHz |
| `leader.horn` | Đầu Đàn bước vào cổng | Tù và chiến trầm, hai nốt, từ xa | Răng cưa 98 Hz rồi 73 Hz qua lọc thấp mở dần, sin 49 Hz 1,6 s |
| `leader.down` | Một Đầu Đàn bị hạ (Săn) | Thân nặng quỵ hai nhịp, đèn hiệu tắt | Sin 80 → 30 Hz rồi 66 → 24 Hz, thép dầm 196 Hz, vuông 880 → 220 Hz qua lọc đóng |
| `rift.warn` | Vết nứt báo trước (2,5 s) | Tường thép rên, nhiệt dồn lên | Răng cưa 55 → 70 Hz qua lọc mở 0,3 → 1,2 kHz, nhiễu dải 400 → 1.500 Hz, thép dầm 160 Hz |
| `rift.open` | Vết nứt mở, bầy tràn ra | Thép bị xé toạc, tia lửa đổ ra | Nhiễu dải 900 → 2.800 Hz 0,5 s, sin 110 → 40 Hz, 12 tiếng tách 4,6 kHz |
| `star.get` | Một sao ở màn kết ải | Thanh kim loại sáng gõ nhẹ, lấp lánh | Thép thanh 1.046 Hz, tam giác 2.093 Hz |

- `gun.tan.fire` — *Prompt:* "Close-range sci-fi scattergun blast on a steel deck: a pump clack, a sharp punchy crack with a heavy body, two spent shell casings ringing on metal, short steel corridor echo, 300 ms, industrial."
- `gun.ray.armed` — *Prompt:* "Seamless loop of a small charged capacitor waiting: a soft low hum under 400 Hz with a faint glittering electric shimmer above 5 kHz, quiet, steady, 2 s loop, sci-fi."
- `gun.ray.charge` — *Prompt:* "Capacitor charging before a rail shot: a rising high-pitched electric whine that stops cleanly at its peak, 150 ms, sci-fi, dry."
- `gun.ray.fire` — *Prompt:* "Rail gun discharge: an extremely sharp crack and a deep punch with weight, a long metallic singing tail ringing down the steel corridor, 700 ms, powerful, sci-fi industrial."
- `gun.phao.launch` — *Prompt:* "Mortar launch from a steel tube: a shell sliding in with a clank, a strong deep launch blast with a ringing tube body, the shell whistling up and away, short steel corridor echo, 500 ms, industrial sci-fi."
- `gun.phao.burst` — *Prompt:* "Heavy sci-fi mortar shell explosion on a steel deck: a sharp crack and a deep boom with body, debris and shrapnel rattling, echo rolling down the steel corridor, 600 ms, punchy."
- `hit.armour` — *Prompt:* "Bullet ricochet off thick armour plate: a bright metallic 'keng' with a solid plate body, the ring fading into the steel corridor, 300 ms, several variations."
- `shield.hit` — *Prompt:* "Energy shield absorbing a bullet: a crisp electric snap, a glassy resonant hum dipping low with a soft crackle, fading into a short low echo down the steel corridor, 180 ms, several variations, sci-fi."
- `shield.break` — *Prompt:* "Energy shield shattering: a straining electric whine, a burst like heavy glass breaking, crisp shards falling, the hum collapsing into a short steel corridor echo, 500 ms, sci-fi."
- `foe.split` — *Prompt:* "Chitinous alien shell cracking apart into three pieces that skitter across a steel floor, crunchy, short steel corridor echo, 250 ms."
- `leader.horn` — *Prompt:* "Distant low war horn of an alien brute leader: two long raw blasts, heavy and ominous, with a slight steel-hall echo, 1.6 s."
- `leader.down` — *Prompt:* "Huge armoured beast collapsing: a last groan, two heavy crashes on a steel floor, a dying electric beacon fizzle, the impact rumbling down the steel corridor, 900 ms, weighty."
- `rift.warn` — *Prompt:* "Steel wall groaning under heat and pressure: a rising rumble and creaks building up over 2.5 s, tense, industrial."
- `rift.open` — *Prompt:* "Thick steel plate tearing open: a rising groan, a violent rip with a burst of sparks pouring out, crackling, echo in the steel corridor, 700 ms, industrial."
- `star.get` — *Prompt:* "Bright reward chime, a struck metal bar with a short shimmer, 500 ms, clean, satisfying, game UI."
