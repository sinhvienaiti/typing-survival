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
| `guns` | 0,42 | ×0,5 | `gun.xung`, `gun.tia.start`, `gun.tia.end`, `gun.tan.fire`, `gun.ray.*`, `gun.phao.launch` |
| `impacts` | 0,6 | ×0,5 | `hit.*`, `gun.tia.pulse`, `foe.shot.down`, `gun.phao.burst`, `shield.*` |
| `kills` | 0,55 | ×0,56 | `kill.*`, `foe.split`, `leader.down` |
| `alerts` | 0,8 | ×0,8 | `word.*`, `foe.shot`, `hurt.*`, `support.repair`, `alarm.surge`, `end.*`, `leader.horn`, `rift.*` |
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

## 3. Gõ và nạp đạn

| Id | Khi nào | Cảm giác | Mã hiện tại |
|---|---|---|---|
| `key.ok` | Mỗi phím đúng | Rơ-le đóng trên bàn phím thép: khô, ngắn, chắc tay; 5 cao độ xoay vòng ±3 % | Nhiễu dải 2,7 kHz 14 ms, "thock" vuông lọc thấp, tiếng tách kim loại 3,3 kHz |
| `key.bad` | Phím sai | Tiếng đục bị bóp, như gõ vào tấm thép dày; không còi, không chê | Sin 105 → 72 Hz, nhiễu lọc thấp 420 Hz |
| `word.load` | Gõ xong một từ: một băng đạn nạp vào súng | "Cạch-chắc": băng đạn đóng sập vào ổ, chốt khóa | Tiếng tách cao, rồi cú đập trầm 170 → 52 Hz và tiếng thép tấm |
| `word.perfect` | Gõ xong không lỗi | Như `word.load`, thêm tiếng nạp điện rít lên và vài tia lửa điện: phần thưởng cho gõ chuẩn | Thêm sin 620 → 1.900 Hz, vuông lọc, tiếng tách điện |

- `key.ok` — *Prompt:* "Single mechanical relay click on a heavy steel console, dry, tight, very short (40 ms), industrial keyboard, no reverb, no tail."
- `key.bad` — *Prompt:* "Muffled dull knock of a knuckle on a thick steel plate, short (70 ms), soft and low, not a buzzer, no ring."
- `word.load` — *Prompt:* "Heavy rifle magazine slammed into a steel receiver, two-part 'ka-chunk' with a latch click, close and punchy, 250 ms, industrial, dry."
- `word.perfect` — *Prompt:* "Heavy magazine slammed home followed by a rising electric charge-up whine and a few tiny electrical sparks, satisfying, 450 ms, industrial sci-fi, dry."

## 4. Súng

| Id | Khi nào | Cảm giác | Mã hiện tại |
|---|---|---|---|
| `gun.xung` | Viên Xung rời nòng (súng bắn 10 viên/s, tiếng phát cho một nửa số viên) | Pháo tự động hạng nặng: khóa nòng đóng, cú đấm trầm có thân, tiếng nổ giòn; vang hành lang thép rất ngắn trong file (đuôi dài khi ngừng bắn là đề xuất gun.xung.tail, mã chưa có) | Sin 150 → 46 Hz, nhiễu thông cao 1,9 kHz, nhiễu dải 720 Hz |
| `gun.tia.start` | Tia bật | Tia bật: máy phát quay lên, hồ quang bắt "xẹt" rồi kêu ù; vang hành lang thép ngắn | Răng cưa 70 → 260 Hz qua lọc mở dần, nhiễu dải trượt lên, 7 tiếng tách, ù 55 Hz |
| `gun.tia.end` | Tia tắt | Tia tắt: máy phát hạ điện, hồ quang xì tắt, tiếng ù chìm vào vang thép | Răng cưa 260 → 48 Hz, lọc đóng lại |
| `gun.tia.pulse` | Mỗi nhịp 0,1 s của Tia có trúng quái | Tia điện chích, to dần theo số quái bị cắt | Nhiễu thông cao 4,2 kHz 45 ms, vuông 1.900 → 880 Hz |

- `gun.xung` — *Prompt:* "Heavy autocannon single shot from a steel turret: a breech clack, a deep punch with a sharp crack and a short thick body, a quick slap off the steel corridor, 350 ms, industrial."
- `gun.tia.start` — *Prompt:* "Industrial electric arc ray igniting: a generator spinning up, a high-voltage arc striking and crackling over a low 55 Hz hum, short steel corridor echo, 600 ms, gritty."
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
| `gun.tan.fire` | Tán bắn một loạt 7 viên | Khóa bơm cạch, nổ đanh có thân trên sàn thép, rồi vỏ đạn leng keng; vang hành lang thép ngắn | Nhiễu thông cao 1,4 kHz 50 ms, sin 120 → 42 Hz, nhiễu dải 900 → 400 Hz, hai tiếng thép thanh 2,6 và 3,1 kHz |
| `gun.ray.charge` | Ray bắt đầu nạp một phát (0,15 s) | Tụ điện rít lên: phần chuẩn bị của phát Ray, dừng gọn ở đỉnh; đầu tiếng, thân và đuôi nằm ở gun.ray.fire | Răng cưa 900 → 3.600 Hz qua lọc dải mở dần, sin 1,8 → 7,2 kHz |
| `gun.ray.fire` | Ray bắn | Tiếng nổ đanh, cú đấm trầm, đuôi ngân dài | Nhiễu thông cao 3 kHz 30 ms, sin 220 → 50 Hz, răng cưa 2,4 kHz → 600 Hz qua lọc đóng dần, thép dầm 740 Hz 0,6 s |
| `gun.phao.launch` | Pháo Sao bắn một quả | Đạn trượt vào ống cạch, ống thép bắn mạnh có thân, quả đạn rít bay lên xa; vang hành lang thép | Sin 95 → 38 Hz, nhiễu thấp 700 Hz, sin 1,2 → 2,2 kHz mở chậm |
| `gun.phao.burst` | Quả Pháo Sao nổ | Tiếng nổ trầm có thân, mảnh vỡ rơi lách cách; vang dội hành lang thép | Sin 70 → 26 Hz 0,42 s, nhiễu thấp 900 → 160 Hz, nhiễu thông cao 4,2 kHz, 6 tiếng tách |
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
