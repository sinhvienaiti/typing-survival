# Tuyến Cuối — bộ âm "Vành Chân Trời"

> Ngày 23/10/2026. Chủ đề: một trạm thép cũ giữ hành lang cuối cùng ở mép hố đen. Âm **industrial**: synth trầm, trống máy, bass; trong trận là thép, súng nặng, điện, kim loại vỡ. Khác hẳn tiếng laser và nhạc điện tử vũ trụ của Space Typing.
> **Hiện tại mọi âm đều tổng hợp bằng mã** (`src/audio/theme-audio.ts`, `src/audio/music.ts`, khối dựng `src/audio/synth.ts`), không có file. Danh sách này để sau này làm file thật: mỗi id một mục, khi nào phát, cảm giác, và một prompt cho công cụ tạo âm.

## 1. Cách âm chạy

- Phát qua `SceneAudio` của kit (`src/kit/audio`), với bảng bus riêng `BUSES` trong `theme-audio.ts`. Mỗi bus có một "insert" (âm lượng của cài đặt + một bộ nén nhẹ) nên 40 quái chết một lúc không vỡ tiếng.
- **Nhường tiếng khi đọc từ** (sự kiện `PRONUNCIATION_EVENT` của kit speech): súng và va chạm −6 dB (×0,5), nổ −5 dB, phím −4,4 dB, nhạc −4 dB (×0,63), cảnh báo −2 dB. Không tắt hẳn tiếng nào.
- Gom tiếng như `AudioCues` của kit: tiếng trúng gom 38 ms rồi phát một lần (to hơn khi nhiều), tối đa 4 tiếng nổ trong 120 ms, tiếng hạ liên tiếp leo dần một thang ngũ cung. Bậc va chạm lấy từ bảng `tiers` của kit feedback.
- Chưa có tiếng nào phát trước lần bấm phím hay chuột đầu tiên (trình duyệt chặn).

| Bus | Mức | Khi đọc từ | Âm trên bus |
|---|---|---|---|
| `keys` | 0,5 | ×0,6 | `key.*` |
| `guns` | 0,42 | ×0,5 | `gun.xung`, `gun.tia.start`, `gun.tia.end` |
| `impacts` | 0,6 | ×0,5 | `hit.*`, `gun.tia.pulse`, `foe.shot.down` |
| `kills` | 0,55 | ×0,56 | `kill.*` |
| `alerts` | 0,8 | ×0,8 | `word.*`, `foe.shot`, `hurt.*`, `alarm.surge`, `end.*` |
| `ui` | 0,55 | ×0,7 | `ui.*` |
| `music` | 0,9 | ×0,63 | `music.calm`, `music.surge` |

## 2. Khi có file thật

- Đặt file ở `public/assets/typing-survival/audio/<id>.ogg` (Git bỏ qua). Nguồn gốc (bản WAV, prompt, công cụ, lần thử) lưu ở `art-src/audio/`. Đẩy lên kho media của repo cha khi kho có mục cho game này. **Không commit file âm.**
- Mỗi tiếng ngắn: 48 kHz, mono (trừ nhạc và `end.*`), đỉnh −1 dBFS, cắt im lặng đầu file (tiếng phải bắt đầu ngay, dưới 5 ms). Tiếng lặp nhiều (`key.ok`, `gun.xung`, `hit.t1`, `kill.swarm`) cần 4–6 biến thể.
- Nhạc: hai stem cùng nhịp **96 BPM, La thứ**, vòng 8 ô nhịp (20 s) lặp liền, −16 LUFS. `music.calm` và `music.surge` chơi cùng lúc, trộn theo độ đông của bầy quái (`hordeIntensity` trong `music.ts`).
- Đổi `sounds: {}` trong `ThemeAudio` thành bảng file; mã tổng hợp giữ làm dự phòng khi file chưa tải xong.
- Prompt dưới đây viết bằng tiếng Anh vì các công cụ tạo âm hiểu tiếng Anh tốt nhất.

## 3. Gõ và nạp đạn

| Id | Khi nào | Cảm giác | Mã hiện tại |
|---|---|---|---|
| `key.ok` | Mỗi phím đúng | Rơ-le đóng trên bàn phím thép: khô, ngắn, chắc tay; 5 cao độ xoay vòng ±3 % | Nhiễu dải 2,7 kHz 14 ms, "thock" vuông lọc thấp, tiếng tách kim loại 3,3 kHz |
| `key.bad` | Phím sai | Tiếng đục bị bóp, như gõ vào tấm thép dày; không còi, không chê | Sin 105 → 72 Hz, nhiễu lọc thấp 420 Hz |
| `word.load` | Gõ xong một từ: một băng đạn nạp vào súng | "Cạch-chắc": băng đạn đóng sập vào ổ, chốt khóa | Tiếng tách cao, rồi cú đập trầm 170 → 52 Hz và tiếng thép tấm |
| `word.perfect` | Gõ xong không lỗi | Như `word.load`, thêm tiếng nạp điện rít lên và vài tia lửa điện: phần thưởng cho gõ chuẩn | Thêm sin 620 → 1.900 Hz, vuông lọc, tiếng tách điện |

- `key.ok` — *Prompt:* "Single mechanical relay click on a heavy steel console, dry, tight, very short (40 ms), industrial keyboard, no reverb, no tail."
- `key.bad` — *Prompt:* "Muffled dull thud of a knuckle on a thick steel plate, short (70 ms), soft and low, not a buzzer, no ring."
- `word.load` — *Prompt:* "Heavy rifle magazine slammed into a steel receiver, two-part 'ka-chunk' with a latch click, close and punchy, 250 ms, industrial, dry."
- `word.perfect` — *Prompt:* "Heavy magazine slammed home followed by a rising electric charge-up whine and a few tiny electrical sparks, satisfying, 450 ms, industrial sci-fi, dry."

## 4. Súng

| Id | Khi nào | Cảm giác | Mã hiện tại |
|---|---|---|---|
| `gun.xung` | Viên Xung rời nòng (súng bắn 10 viên/s, tiếng phát cho một nửa số viên) | Pháo tự động hạng nặng: cú đấm trầm, tiếng nổ giòn, khóa nòng | Sin 150 → 46 Hz, nhiễu thông cao 1,9 kHz, nhiễu dải 720 Hz |
| `gun.tia.start` | Tia bật | Hồ quang điện quay lên, kêu ù của máy phát | Răng cưa 70 → 260 Hz qua lọc mở dần, nhiễu dải trượt lên, 7 tiếng tách, ù 55 Hz |
| `gun.tia.end` | Tia tắt | Máy phát hạ điện, tắt dần | Răng cưa 260 → 48 Hz, lọc đóng lại |
| `gun.tia.pulse` | Mỗi nhịp 0,1 s của Tia có trúng quái | Tia điện chích, to dần theo số quái bị cắt | Nhiễu thông cao 4,2 kHz 45 ms, vuông 1.900 → 880 Hz |

- `gun.xung` — *Prompt:* "Heavy autocannon single shot from a steel turret, deep punch with sharp crack and mechanical breech clack, 120 ms, close, no long reverb, industrial."
- `gun.tia.start` — *Prompt:* "Industrial electric arc ray igniting: generator spin-up, crackling high-voltage arc and a low 55 Hz hum, 600 ms, gritty, no music."
- `gun.tia.end` — *Prompt:* "High-voltage generator powering down, falling pitch with a short electrical fizzle, 400 ms, industrial, dry."
- `gun.tia.pulse` — *Prompt:* "Short electric zap of an arc burning through metal, crisp and sizzling, 50 ms, several variations."

## 5. Trúng, hạ, quái bắn

| Id | Khi nào | Cảm giác | Mã hiện tại |
|---|---|---|---|
| `hit.t1` | Đạn Xung trúng (bậc T1), gom 38 ms | Tiếng keng ngắn trên vỏ thép | Nhiễu thông cao 3,6 kHz, thép dầm 430 Hz |
| `hit.t2` | Chí mạng, gõ chuẩn (T2, T3) | Keng nặng hơn, thêm cú thụi trầm | Như T1, thêm sin 115 → 40 Hz |
| `hit.t4` | Đòn lớn (T4 trở lên) | Thép dầm rung ngân, đuôi dài | Như T2, thêm nhiễu thấp 0,5 s và thép 233 Hz ngân 0,7 s |
| `kill.swarm` | Quái bầy chết (gom theo ô 3 m mỗi khung) | Kim loại vỡ vụn, một tiếng nổ trầm, một thanh thép gõ lên nốt cao dần khi giết liên tục | Nhiễu dải 1,15 kHz trượt xuống, mảnh vỡ thông cao, sin 150 → 38 Hz, thanh thép 523 Hz × thang ngũ cung |
| `kill.elite` | Quái tinh nhuệ (lính) chết | Như trên nhưng nặng hơn, thêm phóng điện | Nổ 95 Hz, răng cưa 1.100 → 120 Hz, tiếng tách điện |
| `foe.shot` | Lính bắn vào tuyến | Cảnh báo: cầu plasma nạp và phụt ra, nghe là biết có thứ đang bay tới | Răng cưa 340 → 880 Hz qua dải trượt, nhiễu dải 2,4 kHz |
| `foe.shot.down` | Xung bắn rơi đạn của lính | Tiếng bốp kim loại nhỏ | Nhiễu dải 3 kHz, thép 880 Hz |

- `hit.t1` — *Prompt:* "Small metallic bullet impact on a steel hull, short bright clank, 80 ms, several variations, dry."
- `hit.t2` — *Prompt:* "Heavy bullet impact on thick steel armor, clank with a low thump, 160 ms, punchy, dry."
- `hit.t4` — *Prompt:* "Massive impact on a steel beam, deep thump and a long ringing metal resonance, 900 ms, industrial."
- `kill.swarm` — *Prompt:* "Small metal creature shattering: crunchy breaking metal, scattering shards and a low boom, 250 ms, several variations, no voice."
- `kill.elite` — *Prompt:* "Large armored machine creature exploding: heavy metal tearing, deep boom and an electrical discharge crackle, 500 ms, no voice."
- `foe.shot` — *Prompt:* "Alien plasma blob charging and spitting out, rising buzzy whoosh, warning-like, 250 ms, sci-fi industrial."
- `foe.shot.down` — *Prompt:* "Small projectile shot down mid-air: short metallic pop with a tiny spark, 90 ms."

Chuỗi hạ: thanh thép của `kill.*` leo một nốt ngũ cung mỗi lần hạ cách nhau dưới 1 s (C5 trở lên, tối đa 12 bậc), rồi về gốc. Khi làm file thật, giữ phần "nốt" tách riêng (`kill.chime`) để mã vẫn chỉnh cao độ được.

## 6. Tuyến bị đánh, cảnh báo, kết trận

| Id | Khi nào | Cảm giác | Mã hiện tại |
|---|---|---|---|
| `hurt.breach` | Quái chạm vạch đáy | Thân trạm rung: tiếng nổ trầm, thép rên, còi báo hai nốt | Sin 82 → 28 Hz, răng cưa trầm lọc, hai bíp vuông 440 / 330 Hz |
| `hurt.hull` | Đạn lính trúng tàu | Tiếng thép bị đập mạnh, ngân ngắn | Thép dầm 176 Hz, sin 100 → 38 Hz |
| `alarm.surge` | Bắt đầu đỉnh tràn (biển "ĐỈNH TRÀN") | Còi báo động của trạm, hai lượt lên xuống, nền ù trầm | Răng cưa 420 ↔ 640 Hz qua lọc thấp, ù 55 Hz 1,25 s |
| `end.win` | Giữ được 3 phút | Hợp âm máy (power chord) mở dần, xả hơi nước: nhẹ nhõm, nặng nề | Ba răng cưa La 110 / 165 / 220 Hz, lọc mở 380 → 3.200 Hz, hơi xì |
| `end.lose` | Tuyến vỡ | Hạ điện, kim loại sụp từng mảng | Răng cưa rơi bốn quãng tám, năm tiếng thép thấp dần, nổ trầm |

- `hurt.breach` — *Prompt:* "Station hull breach: deep boom, groaning stressed steel and a short two-tone klaxon, 600 ms, industrial, ominous."
- `hurt.hull` — *Prompt:* "Heavy blow on a ship's steel hull, loud clang with short ring and low thud, 400 ms."
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
