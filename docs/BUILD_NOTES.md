# Sinh Tồn S0: ghi chú khi làm

Đi kèm [`BUILD_S0.md`](BUILD_S0.md) (phạm vi, số) và [`SURVIVAL_MODE_PLAN.md`](SURVIVAL_MODE_PLAN.md) (ý đồ). Nhánh `feat/survival-s0`, worktree `games/.wt-survival`. Ngày 23/10/2026.

---

## 1. Đã làm gì

| BUILD_S0 | Ở đâu | Ghi chú |
|---|---|---|
| §2 Trang | `index.html`, mục `survival` trong `vite.config.ts` | Thẻ mở đầu chọn tàu (Vanguard, Draconis) và bậc chất lượng; Enter bắt đầu, Esc tạm dừng, Enter chơi lại |
| §1 Sim tất định | `src/sim/` (world, spawn, move, weapons, projectiles, hits, words, stores, events, hash) | Bước cố định 60 Hz, mảng số (SoA) có ngăn rỗng, ngẫu nhiên chỉ từ `src/platform/rng.ts`, không lượng giác (lắc ngang bằng parabol Bhaskara). Mã băm như TD |
| §3–§4 Ải | `src/content/rules.ts`, `stage-s0.ts`, `deck.ts` | Mọi số ở `rules.ts`; bảng nhịp ra quái ở `stage-s0.ts` |
| §4 Quái | `sim/spawn.ts`, `sim/move.ts` | Nhóm 4–12 (khối, nêm, hàng), lính ở hàng sau; trường hướng trên lưới 2 m (thẳng xuống, cong dần về tàu khi gần, tránh tường) + đẩy nhau qua lưới; trần theo bậc, quái chờ ở cổng |
| §5 Súng | `sim/weapons.ts`, `sim/words.ts` | Gõ xong từ nạp 1 băng (tối đa 2, kể cả băng đang bắn); Chuẩn, Nhanh, Hoàn hảo; Xung không bắn thừa vào quái coi như đã chết (đếm sát thương đang bay tới); Tia chờ khi không có gì trong tầm |
| §6 `src/feedback/` | `tiers`, `trauma`, `hitstop`, `numbers`, `reaction`, `debris`, `audio-cues`, `quads` | Chưa chế độ cũ nào dùng. `quads.ts` là hàm dựng quad instanced dùng chung |
| §6 Đầu nòng, va chạm, chết | `src/view/combat.ts`, `fx.ts` | Đầu nòng lóe 60–80 ms + giật lùi tàu + xung 2 px; trúng: sao 4 tia (T1), 8 tia + vụn (T2), 12 tia + vòng (T3); chết: lóe, sao, sóng tròn trên sàn, mảnh vỡ, tia lửa; nhiều con chết cùng ô 3 m trong một khung thành một vụ nổ cỡ √N |
| §6 Đếm hạ | `view/hud.ts` | "×N" hạ trong 3 s, nảy khi tăng, vàng khi ≥ 15 |
| §7 Khung học, HUD | `view/hud.ts`, `view/survival.css` | DOM ngoài canvas; canvas rung bằng `setViewOffset` của camera, HUD không bao giờ rung |
| §7 Phát âm | `app/main.ts` | `speakEnglish` lần đầu mỗi từ trong trận, cách nhau ≥ 3 s; Tab đọc lại từ đang gõ; súng và va chạm −6 dB khi đọc (sự kiện `space-typing:pronunciation` của `src/speech.ts`) |
| §8 Bậc chất lượng | `view/scene.ts` (`VIEW_TIERS`), `content/rules.ts` (`FOE_CAP`, `BULLET_CAP`) | Low / Medium / High / Ultra: trần quái 200/400/700/1.000, đạn, hạt, số, mảnh vỡ, tỉ lệ điểm ảnh, bloom từ High. Mặc định High |
| §9 Test | `tests/survival-sim.test.ts`, `tests/survival-boundary.test.ts`, `tests/feedback-numbers.test.ts`, `tests/feedback-motion.test.ts`, `tests/mode-isolation.test.ts` | Mục 4 dưới đây |
| §9 Kịch bản | `scripts/visual/scenarios/survival-s0-{boot,fight,perf,keys,frames}.mjs` (+ `survival-s0-lib.mjs`) | Đều đạt ở 1280×720 và 1920×1080 |
| Phát lại | `scripts/replay.ts` | Chạy lại nhật ký lệnh của trang trong Node, so mã băm |
| Cân bằng | `scripts/balance.ts`, `tests/survival/bot.ts` | Bot gõ 25/35/45/60 WPM, in số quái trên sân mỗi 15 s |

Model dùng: `rainbow-mine-3d`, `rainbow-scout-3d`, tàu `vanguard` hoặc `draconis-v3` (qua manifest model). Thiếu file (bản clone sạch không có `rainbow-mine-3d`) thì quái là khối gai làm bằng mã, tàu là thân nón; đã thử bằng một máy chủ Vite không phục vụ model cục bộ: trang chạy, không lỗi console. Nền, sàn, tường, cổng, hạt, số, âm thanh đều làm bằng mã. Không thêm media vào Git.

## 2. Lệch so với BUILD_S0 và lý do

> Review S0 (§7) thay các mục 1 (camera), 2 (tầm), 3 (đỉnh tràn), 7 (số Tia), 13 (Tia), 14 (vẽ to ở xa) và đổi nhịp ra quái của §4. Các mục dưới đây giữ nguyên để biết vì sao bản đầu làm vậy.

1. **Góc camera.** "Nhìn từ trên xuống nghiêng 55°" được hiểu là nghiêng 55° so với phương thẳng đứng, tức camera nhìn xuống 35° dưới đường chân trời. Khi thử 55° dưới chân trời, cả hành lang 60 m chỉ thành một dải hẹp giữa màn hình (rộng khoảng 1/4 màn) và quái chỉ 12–15 px. Ở 35° hành lang gần tàu rộng gần hết màn hình, quái gần to, đám đông xa dồn thành "biển quái". Camera vẫn cố định, chỉ rung.
2. **Tầm súng, độ tỏa đạn, chiều dài cột Tia** (BUILD_S0 không ghi): Xung bắn quái trong 42 m, lệch ngẫu nhiên ±0,08 rad; cột Tia dài 24 m từ tàu. Với số §5 mà không có tầm, mọi quái chết ngay khi qua cổng và sân chỉ có 10–25 quái. Chỉnh bằng bot cho tới khi người gõ 35 WPM thấy 40–80 quái lúc thường (bot 35 WPM, 90–150 s: trung vị khoảng 48).
3. **Đỉnh tràn 120–160 quái không đạt được với bảng §4.** Quái bầy đi 3,2 m/s qua 60 m (18,75 s); ngay cả khi không giết con nào, sân chỉ có tối đa 108 quái (đo bằng sim không gõ). Bot 35 WPM: đỉnh tràn 2 khoảng 81–90. Muốn 120–160 thì phải tăng nhịp ra hoặc làm quái chậm hơn ở S1.
4. **Lính đi tiếp sau 12 s đứng bắn.** Nếu đứng mãi thì luật "chạm đáy −6" không bao giờ xảy ra.
5. **Đỉnh tràn 2:** 150–160 s nhịp 6,5; 160–165 s nhịp 3,5 (bảng ghi khoảng 150–165 s nhưng đỉnh chỉ 10 s).
6. **Dừng hình là lệnh `stop` trong nhật ký**, làm tròn theo tick 60 Hz (12 ms = 1 tick, 25 và 35 ms = 2 tick, 45 ms = 3 tick). Trong lúc dừng, thế giới chạy 0,05 và súng giữ đạn (băng của từ vừa xong chờ); phần gõ chạy đủ mỗi tick nên không phím nào bị chậm hay mất. T2 dừng cho chí mạng Xung và khi hạ lính, không dừng cho nhịp Tia (Tia trúng mỗi 0,1 s, dừng sẽ thành giật). Ngoài khoảng cách chung 150 ms, mỗi bậc có khoảng riêng (T2 300 ms, T3 400 ms) để chuỗi chí mạng không thành giật.
7. **Số của Tia gộp theo đoạn 3 m của cột**, không theo từng quái: một cột cắt qua 10–20 quái mỗi nhịp, gộp theo quái tạo thành một chồng số. Theo đoạn, cột chỉ có 4–6 số, mỗi số ghi tổng và "×N". Số mới bị đẩy lên khi đè số cũ.
8. **Đạn Xung là vệt sáng làm bằng mã**, không dùng model `vanguard-bolt` (không có trong Git). Draconis bắn "cầu lửa" bằng vệt cam có quầng, không dùng model `dragon-fireball`.
9. **Mảnh vỡ là tinh thể trắng xanh và hồng**, phát sáng nhẹ. Họ rainbow có quái màu hồng nên mảnh màu hồng sẽ lẫn vào quái.
10. **Quái bầy dùng model `rainbow-mine-3d` (6.000 tam giác) ở mọi bậc**, chưa dùng bản `-lod`. Lúc thử tải 700 quái là 4,1 triệu tam giác, vẫn trên 120 khung/giây không khóa vsync trên M4.
11. **Âm thanh tổng hợp bằng mã** (không có file mới). Chưa nghe thử bằng tai; mới kiểm bằng code.
12. **Bậc chất lượng chọn ở thẻ mở đầu** (`?q=`, lưu `survival.quality`), đổi bậc thì tải lại trang.
13. **Tia tắt khi trong tầm 24 m không còn quái** và giữ phần thời gian còn lại cho lần sau (BUILD_S0 chỉ ghi "cột 2,5 s"). Nếu không, cột cháy trên sàn trống sau khi đã giết hết cụm đầu, nhìn như bắn hụt và phí từ đã gõ.
14. **Quái và đòn ở xa được vẽ to hơn** (quái tới 1,4×, nổ và sao tới 1,5× ở cổng), chỉ là hình: vị trí, va chạm trong sim không đổi. Người gõ nhanh giết quái ở mép tầm 30–42 m, nơi phối cảnh làm mọi thứ nhỏ.
15. **Quái bầy vẽ to hơn thân** (1,55 m so với bán kính 0,5 m) để một bầy đọc như một khối.

## 3. Số đo

> Số của bản đầu, trước review. Số sau review ở §7.3–§7.5.

Máy: Apple M4, Chrome headless (ANGLE Metal), High, DPR 1.

### 3.1 Sim (Node, `tests/survival-sim.test.ts`)

- Một bước với 700 quái và khoảng 2.000 đạn: trung vị 0,33 ms, p95 0,35 ms (ngân sách 1,5 ms).
- Trận 180 s với bot: khoảng 0,003 ms mỗi bước.

### 3.2 Bot (`node --import tsx scripts/balance.ts`, lỗi gõ 4 %, nghỉ 0,25 s giữa các từ)

| WPM | Kết quả | Máu còn | Hạ | Đỉnh quái | Quái trên sân mỗi 15 s |
|---|---|---|---|---|---|
| 25 | Thắng | 50 | 494 | 88 | 14, 9, 21, 18, 45, 43, 53, 58, 65, 72, 83, 50 |
| 35 | Thắng | 93 | 504 | 86 | 14, 9, 20, 19, 44, 36, 40, 48, 54, 50, 85, 48 |
| 45 | Thắng | 100 | 501 | 79 | 14, 9, 18, 16, 45, 35, 42, 43, 49, 45, 77, 52 |
| 60 | Thắng | 100 | 518 | 64 | 13, 8, 18, 18, 33, 24, 29, 30, 36, 31, 63, 35 |

Không gõ gì: thua (hết máu do quái chạm đáy).

### 3.3 Trình duyệt

`survival-s0-perf`: gõ thật 70 WPM qua CDP, cửa sổ 10 s mỗi phần. "Khung" là chi phí script của trang mỗi khung (bước sim + sự kiện + HUD, và vẽ); "khoảng khung" là thời gian giữa hai khung, gồm cả GPU. Hai lần đo: khóa vsync (60 Hz như người chơi) và bỏ khóa (`CHROME_FLAGS="--disable-gpu-vsync --disable-frame-rate-limit"`) để thấy thời gian thật của một khung.

| Phần | Cỡ | Khung TB / p95 (vsync) | Khoảng khung TB / p95 (không vsync) | Khung/giây không vsync | Draw call | Tam giác |
|---|---|---|---|---|---|---|
| Đỉnh: ~153 quái + đạn + cột + số + mảnh vỡ | 1280×720 | 0,94 / 1,6 ms | 2,9 / 4,8 ms | 334 | 34 | 0,89 triệu |
| | 1920×1080 | 0,76 / 1,2 ms | 4,5 / 6,2 ms | 203 | 34 | 0,87 triệu |
| Tải `flood(700)`: ~663 quái | 1280×720 | 1,06 / 1,7 ms | 5,2 / 7,6 ms | 188 | 35 | 3,9 triệu |
| | 1920×1080 | 0,88 / 1,5 ms | 7,2 / 9,7 ms | 126 | 35 | 4,1 triệu |

Ngân sách §8 (đỉnh: TB ≤ 6 ms, p95 ≤ 10 ms; tải 700: p95 ≤ 14 ms; draw call ≤ 160): đạt ở cả hai cách đo. Có vsync trang giữ 57–59 khung/giây (đo cả thời gian của kịch bản đọc trạng thái). Lúc đo, một agent khác cũng chạy Chrome trên cùng máy.

Các kịch bản (`scripts/visual/scenarios/survival-s0-*.mjs`), cả hai cỡ, không lỗi console, không ngoại lệ:

| Kịch bản | Kết quả |
|---|---|
| `boot` | Thẻ mở đầu, Enter vào trận; hai ô có từ khác chữ đầu, chữ 32 px (48 px ở 1080p), tương phản 14,6 : 1 (tính với nền sau panel là trắng, trường hợp xấu nhất); HUD đủ, 4 vùng cấm |
| `fight` (45 WPM, 180 s) | 1280×720: thắng, 100 máu, 521 hạ, 148 từ, đỉnh 72 quái, tối đa 416 mảnh vỡ; 0 lần số đè vùng cấm hay khung học; nhật ký 848 lệnh chạy lại trong Node ra cùng mã băm `a4e8faee`. 1920×1080: thắng, 100 máu, 512 hạ, 146 từ, đỉnh 76 quái, 422 mảnh vỡ; 0 lần đè; 841 lệnh, Node khớp mã băm `a416d644` |
| `keys` (120 WPM, 15 s, dừng T3 mỗi 150 ms) | 148/148 phím vào nhật ký đúng thứ tự, 148 phím vào bộ gõ, 0 phím sai; 111–113 lần dừng; 32–41 phím rơi đúng lúc thế giới đang dừng; Node phát lại khớp |
| `frames` | 12 khung cách đúng 50 ms (đồng hồ khung của trang được giữ và bước) quanh một băng Tia vào cụm 220 quái: cột bật, số Tia lớn dần theo đoạn ("35×4" → "117×15"), 14–16 quái chết trong 0,6 s |
| `perf` | Bảng trên |

Người gõ 45 WPM không lỗi qua CDP giết quái ngay ở mép tầm, nên sân thưa hơn số của bot (bot có 4 % lỗi và nghỉ giữa từ). Ảnh "đông" hơn: chạy `fight` với `WPM=30` (ảnh trong thư mục `wpm30`).

## 4. Test

- `tests/survival-sim.test.ts`: tất định (cùng seed và nhật ký thì cùng mã băm; phát lại khớp; có dừng hình và lũ quái), nhịp ra quái theo bảng (đếm theo cửa sổ 1 s), nhóm 4–12, trần chờ ở cổng, băng đạn (nạp, cộng dồn ≤ 2, 24 viên trong 2,4 s, Tia 2,5 s, nhân chất lượng, Nhanh), gõ (khóa, lỗi giữ từ, Backspace nhả khóa), lưới so với từng cặp (12 seed × 300 truy vấn), Tia bắt đầu ở cụm dày và quét về cụm kế, dừng hình không mất phím và giữ đạn, bot 35 WPM thắng với 40–80 quái lúc thường, chi phí bước.
- `tests/feedback-numbers.test.ts`: gộp 150 ms, Tia 0,3 s "×N", bay theo hướng đòn, trần (bỏ số nhỏ nhất, giữ T3), vùng cấm (dời lên hoặc bỏ; 600 số ngẫu nhiên không đè lần nào).
- `tests/feedback-motion.test.ts`: bảng bậc, trauma² và giảm 1,8/s, nhân cài đặt rung (0 thì không rung), giảm chuyển động, xung 2–6 px về trong 120 ms, dừng hình (bậc, 150 ms, quét 30 con), phản ứng quái.
- `tests/survival-boundary.test.ts`: `index.html` và mục build; `sim/`, `content/` chỉ import nhau và `src/platform/rng`; không DOM, đồng hồ, `Math.random`, lượng giác, lũy thừa (quét mã và biên dịch không thư viện DOM); `src/feedback` không import chế độ nào.
- `tests/mode-isolation.test.ts`: `survival/` được dùng `scene3d/`; không ai ngoài `survival/` import `survival/`; chỉ ghi khóa `survival.*` (và chỉ đọc `spaceTypingSettingsV1`) qua `safe-storage`.

## 5. Cách chạy

```bash
# Worktree (node_modules là symlink): gọi thẳng, không qua pnpm.
npx vite --config scripts/dev/vite.worktree.config.ts --host 127.0.0.1 --port 3120 --strictPort
# http://127.0.0.1:3120/index.html  (?q=low|medium|high|ultra, ?pilot=draconis, ?seed=1, ?autostart=1, ?shake=0)
URL=http://127.0.0.1:3120/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/survival-s0-fight.mjs --width=1280 --height=720
node --import tsx scripts/balance.ts 25 35 45 60 --seeds=24   # thắng, máu, quái trên màn lúc thường / đỉnh, nơi quái chết
WPM=35 URL=… OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/survival-s0-fight.mjs --width=1280 --height=720   # trận gõ 35 WPM
node --import tsx scripts/replay.ts <OUT_DIR>/survival-s0-fight-replay-1280x720.json
```

`window.__survival` (chỉ để kịch bản dùng): `ready, models, start, mode, flags, send, flood, hash, snapshot, state` (có `onScreen`: quái trên sân và hàng chờ ngay trên cổng), `slots, costs, info` (có số geometry, texture của renderer), `numbers, rects, motion` (cài đặt rung, độ lệch rung lúc này), `hold, advance, forceStops`.

Đừng sửa file trong `src/` khi kịch bản đang chạy: Vite tải lại trang và trận đang gõ bị cắt (review gặp một lần).

## 6. Còn lại, nên làm tiếp

1. ~~**Mật độ đỉnh tràn.**~~ Đã làm ở review (§7): hành lang 40 m, quái chậm lại khi áp sát, tầm súng ngắn, đỉnh tràn 15 và 11 con/s.
2. **Nghe thử âm thanh** bằng tai và chỉnh mức các bus; thêm nhạc nền (song engine sẵn có).
3. **Model LOD** cho quái bầy khi đông (`rainbow-mine-lod`), và bậc Low dùng model nhẹ.
4. **Học (S3):** gửi sự kiện học về repo cha, hiện nghĩa theo độ thuộc, kế hoạch từ mới / ôn; "Nhanh" đo theo E thật của người chơi thay vì 35 cố định.
5. **Trợ năng:** thanh trượt rung 0–100 % (hiện đọc công tắc rung của game), cường độ lóe, chế độ số chỉ số lớn.
6. **Mã:** 4.200 dòng TS (mục tiêu 4.000); phần GLSL nằm trong `scene.ts`, `fx.ts`, `crowd.ts` có thể tách thành module shader dùng chung khi Campaign 3D và Defense chuyển sang `src/feedback/` (S7).

## 7. Review S0 (23/10/2026)

Một AI khác (không làm bản đầu) phản biện, sửa và chỉnh cảm giác theo nhận xét khi xem ảnh của trưởng nhóm: (a) camera nhìn dọc một hành lang rất dài nên quái nhỏ và dồn ở cổng; (b) Xung tầm 42 m giết quái ngay ở mép xa, nửa sân gần tàu thường trống, đám đông không bao giờ ép tới tàu; (c) lúc đỉnh tràn bot 35 WPM chỉ thấy khoảng 90 quái, đích là 120–160.

### 7.1 Chỉnh cảm giác (thay các mục 1, 2, 3, 7, 13, 14 của §2)

| Gì | Trước | Sau | Vì sao |
|---|---|---|---|
| Hành lang | 24 × 60 m | **24 × 40 m** (`FIELD.gateZ`) | Camera tới gần đầu xa: quái ở cổng cao khoảng 25 px ở 720p (trước 15), quái gần tàu vẫn khoảng 52 px. Rộng 24 m giữ chỗ cho boss sau này |
| Camera | nhìn xuống 35°, ống kính 56° | 36°, **ống kính 42°** | Cùng khung (tàu ở y −0,56, cổng ở 0,8 NDC), phối cảnh bớt "đường hầm" |
| Vẽ to ở xa | quái 1,4×, đòn 1,5× ở cổng | quái 1,2×, đòn 1,3× | Camera gần nên bớt cần |
| Tốc quái bầy | 3,2 m/s đều | 2,6 m/s, **chậm dần khi áp sát** (`PRESS`: 0,4× từ 6 m vào, đủ tốc từ 24 m ra, mượt ở giữa) | Đám đông dồn thành bức tường trước súng thay vì chảy qua |
| Xung tầm | 42 m | **10 m** (theo chiều sâu, tới z 11,7 m) | Quái đi gần hết sân mới bị bắn; trận diễn ra ở nửa gần tàu |
| Tia | cột thẳng đứng trên sàn dài 24 m, nối với tàu bằng một tia gãy chữ L | **tia thẳng từ nòng**, dài 12 m (với tới xa hơn Xung một chút), đầu xa quét 3 m/s (sim tính khoảng cách tới đoạn tia) | Khi ngắn lại, cột sàn + tia gãy nhìn sai; tia từ nòng quét như đèn pha đọc đúng là "cắt biển quái". Tia với xa hơn Xung nên gặp mép đám đông trước và cắt vào nó; khi Xung với xa hơn (thử 12 / 11 m) Tia hay ngồi chờ với 2 băng đầy |
| Lính dừng ở | 30–40 m | **6–9 m** | Ngoài tầm súng mới, lính bắn tàu thoải mái (bot thua vì đạn lính) |
| Nhịp ra (con/s) | 1,5 / 2,5 / **5** / 3 / 3,5 / **6,5** / 3,5 / 3 | 2 / 3,2 / **15** (60–68 s) / 3,8 / 4,2 / **11** (150–160 s) / 4,2 / 3,8 | Với bảng cũ không ai thấy 120–160 quái (tối đa 108 khi không giết con nào) |
| Số Tia | gộp theo đoạn 3 m của cột, số mới bị đẩy lên khi đè số cũ (thành tháp số) | gộp theo đoạn 4 m dọc tia; **số rơi lên một số trẻ (≤ 0,3 s) cùng kiểu, dưới T3 thì nhập vào**, khác kiểu thì đặt cạnh, chỉ sau đó mới đẩy lên | Hết tháp số; một cụm đòn đọc thành một số lớn dần |
| Đòn nặng hơn | giật lùi giả T1 0,12 m, T2 0,22 m | T1 0,18 m, T2 0,3 m; **cú đẩy camera** 2–5 px theo hướng đòn khi hạ ≥ 4 con trong một khung hoặc hạ lính (tối đa mỗi 220 ms) | Thấy được lực đòn ở nơi quái to |

Đo bằng bot (`node --import tsx scripts/balance.ts 25 35 45 60 --seeds=24`, lỗi 4 %, nghỉ 0,25 s giữa từ; "trên màn" = quái trên sân và hàng chờ ngay trên cổng, z ≤ cổng + 4 m):

| WPM | Thắng (24 seed) | Máu còn | Lúc thường (90–150 s) | Đỉnh tràn 1 | Đỉnh tràn 2 | Độ sâu nơi quái chết (trung vị) | Chạm đáy |
|---|---|---|---|---|---|---|---|
| 25 trước → sau | 24 → **11** | 71 → 0 | 57 → 67 | 47 → 149 | 96 → 138 | 23,5 m / 60 → 10,6 m / 40 | 3 → 21 |
| **35** trước → sau | 24 → **23** | 96 → **86** (thua 1 trận) | 49 → **60** | 45 → **145** (142–152) | 90 → **134** (128–142 ở các trận thắng) | 25,5 m / 60 (43 %) → **11,2 m / 40 (28 %)** | 0 → 4 |
| 45 trước → sau | 24 → 24 | 100 → 100 | 42 → 58 | 44 → 145 | 83 → 130 | 29,8 → 11,3 m | 0 → 0 |
| 60 trước → sau | 24 → 24 | 100 → 100 | 32 → 57 | 42 → 145 | 67 → 130 | 35,7 → 11,4 m | 0 → 0 |

Trận thua của 35 WPM (seed 18) là trận bot gõ chậm hẳn (55 từ ở 100 s): 13 phát đạn lính trúng tàu (Xung hết đạn nên không bắn rơi) và 16 quái chạm đáy.

Phân bố độ sâu lúc đỉnh tràn (bot 35 WPM, trung bình số quái mỗi dải 4 m): trước, không con nào gần hơn 16 m và một nửa đứng ở ≥ 44 m (sát cổng); sau, đám đông trải đều từ 8 m tới cổng (8–12 m: 4, 12–16 m: 12, rồi 13–18 mỗi dải). Tia giết khoảng 65 % số quái, Xung 35 %. Trên màn 1280×720, mép đám đông lúc đỉnh nằm khoảng giữa màn (y ≈ 300–330), trước kia ở 1/4 trên cùng.

Mép đám đông luôn nằm ở tầm với của súng: thử tăng nhịp đỉnh (tới 24 con/s), cho quái đi nhanh hơn, hay cho Tia chỉ bật khi quái tới gần đều không kéo mép vào gần hơn; chỉ có tầm ngắn hơn. Muốn đám đông ép sát hơn nữa thì đặt Xung 9 m, Tia 10 m: bot 35 WPM vẫn thắng 16/16 (máu 75), nhưng 25 WPM chỉ thắng 1/16. Review chọn 10 / 12 m.

Hệ quả có chủ ý: người gõ 25 WPM giờ thua hơn nửa số trận S0 (11/24 thắng). S0 được chỉnh cho 35 WPM; S1 nên co nhịp ra theo E của người chơi (§6).

### 7.2 Lỗi tìm được và cách sửa

| Mức | Lỗi | Sửa | Test (hỏng ở mã cũ) |
|---|---|---|---|
| Trung bình | **Test chập chờn:** `tests/feedback-motion.test.ts` "shakes trauma² (at most 14 px…)". Pha nhiễu rung lấy từ `Math.random`; hai trục đạt đỉnh cùng lúc thì độ rung tới √2 lần, quá mức 14 × 1,2 mà test cho phép. Đo 20.000 lần: hỏng 0,7 %. Đây cũng là lỗi thật: rung vượt trần 14 px ở 1080p của BUILD_S0 §6 (tới 17,5 px khi giữ trauma 1) | Nhiễu hai trục bị kẹp trong vòng tròn đơn vị; pha nhận hàm ngẫu nhiên từ ngoài (test cho pha cố định) | "never passes 14 px at 1080p, even held at full trauma…" (cũ: 16–17,5 px) |
| Thấp | Test chi phí bước sim có thể hỏng khi máy bận (cả bộ test trên mọi nhân, thêm Chrome): bản đầu ghi một lần hỏng "test đo thời gian" | Đo tối đa ba lần, lấy lần tốt nhất (ngân sách 1,5 ms không đổi; khi bận đo được 0,47–0,63 ms) | — |
| Trung bình | Hộp của số sát thương không tính độ nảy (1,12–1,5×): số T3 vừa nảy ngay trên khung học được vẽ đè lên khung khoảng 0,15 s mà phép kiểm (và kịch bản) vẫn báo 0 lần đè | `box()` tính cỡ đang vẽ (có nảy); `popScale` dùng chung cho hộp và hình | "counts a number's pop in its box…" |
| Trung bình | Số chồng thành tháp: số mới đè số cũ bị đẩy lên tới 4 lần. Thêm nữa, một số dài ra khi gộp ("6" → "159×21") hoặc trôi theo hướng đòn thì đè lên số bên cạnh (thấy trong ảnh khung của review) | Lúc sinh: nhập vào số trẻ cùng kiểu, đặt cạnh, rồi mới đẩy lên (§7.1). Mỗi khung: hai số chạm nhau thì số trẻ nhập vào số già (cùng kiểu, dưới T3) hoặc lên trên nó | "takes beam ticks … into one number, not a column", "… goes beside, not on top", "a number that grows onto its neighbour takes it in" |
| Trung bình | **Ẩn tab hoặc mất focus không dừng trận** (Campaign 3D dừng khi ẩn). Mất focus thì phím không tới trang mà quái vẫn ép tới | `installAutoPause`: ẩn tab hoặc `blur` thì tạm dừng; Esc chơi tiếp. Khi tạm dừng, hiệu ứng (mảnh vỡ, hạt, số) cũng đứng | "pauses when the tab is hidden or the window loses focus" + kịch bản `boot` |
| Thấp | Thông báo "Tắt bộ gõ tiếng Việt" hiện mãi sau một lần thấy dấu hiệu, kể cả khi đã tắt bộ gõ | `ImeNotice`: tắt 7 s sau dấu hiệu cuối (như Campaign 3D) | "shows after a sign and goes again…" |
| Thấp | Khung học: "từ · nghĩa ✓" với nghĩa dài tràn khỏi khung, đè lên hai ô súng (vd. "human · thuộc về con người ✓") | Dòng chữ to tự co cho vừa khung (`--fit`, tối thiểu 0,5×), nghĩa một dòng có "…", lúc "✓" ẩn dòng IPA và nghĩa trống để chữ nằm giữa | Xem ảnh |
| Thấp | Phiên cấp phát một mảng mới mỗi tick (`splice(0)`), trái "không cấp phát trong trận" | Hai mảng đổi chỗ | Đo bộ nhớ (§7.4) |
| Thấp | Giảm chuyển động: số hạ ở góc vẫn nảy to, biển "ĐỈNH TRÀN" vẫn phóng to | Khối CSS giảm chuyển động: chỉ mờ dần | Kịch bản `boot` (rung) |

Phím (thêm `tests/survival-input.test.ts`): chữ hoa thường đều gõ, Backspace, Esc / Enter / Tab không bao giờ là chữ; phím đang ghép của bộ gõ (`isComposing`, `Process`, 229), Enter khi đang ghép, phím giữ, tổ hợp Ctrl và phím giả đều không gõ gì.

Đã kiểm, không có lỗi:
- **Tất định:** nhật ký lệnh của trang chạy lại trong Node ra cùng mã băm (`fight` hai cỡ, `keys` hai cỡ); sim mới vẫn chỉ dùng căn bậc hai (test ranh giới).
- **Dừng hình không nuốt phím:** `keys` 120 WPM với dừng T3 liên tục: mọi phím vào nhật ký đúng thứ tự, có phím rơi trong lúc dừng, Node khớp.
- **Băng đạn:** nạp, cộng dồn ≤ 2, Xung giữ đạn khi không có quái trong tầm (test mới), Tia tắt khi không còn gì trong tầm và giữ thời gian, nhân chất lượng. Gõ xong một từ khi súng đã đủ 2 băng thì từ đó không nạp (đúng §5, giữ nguyên; ô sáng viền "đầy").
- **Bảng ra quái:** cửa sổ 1 s khớp bảng mới trong một nhóm; nhóm 4–12; trần thì chờ ở cổng.
- **Vùng cấm:** 0 lần số đè vùng cấm hay khung học suốt trận ở hai cỡ (tính cả độ nảy).
- **Trợ năng:** `?shake=0` và giảm chuyển động (cài đặt Interface của game): camera không rung (độ lệch 0 px qua hai băng Xung vào 120 quái); lần đối chứng mặc định có rung.

### 7.3 Trình duyệt sau review

Chrome headless (ANGLE Metal, M4), High, DPR 1, khóa vsync; cùng lúc máy còn chạy Chrome của một agent khác (các kịch bản TD), nên số khung cao hơn §3.3 một chút.

| Kịch bản | 1280×720 | 1920×1080 |
|---|---|---|
| `boot` | Đạt: chữ ô súng 32 px, tương phản 14,6 : 1; `blur` → tạm dừng, Esc → chơi; rung tắt (`?shake=0`) và giảm chuyển động: độ lệch camera 0 px, trauma 0 qua hai băng Xung; đối chứng mặc định có rung | Đạt (chữ 48 px) |
| `fight` 45 WPM | Thắng, 100 máu, 739 hạ, 146 từ; trên màn tối đa 143 (thường 43, đỉnh 1 143, đỉnh 2 126); 0 số đè vùng cấm hay khung học; Node khớp mã băm (`a9a872d5`, 820 lệnh) | Thắng, 100 máu, 737 hạ; tối đa 143 (136 / 125); Node khớp (`b2e9f8a1`) |
| `fight` 35 WPM (`WPM=35`) | Thắng, 100 máu, 740 hạ, 112 từ; trên màn thường 43, đỉnh 1 136, đỉnh 2 124, tối đa 143; Node khớp (`bf20187a`) | Thắng, 81 máu, 723 hạ; 42 / 136 / 126; Node khớp (`a004342f`) |
| `keys` 120 WPM, dừng T3 liên tục | 148/148 phím đúng thứ tự, 0 phím sai, 111 lần dừng, 33 phím rơi trong lúc dừng; Node khớp | 148/148, 112 lần dừng, 36 phím trong lúc dừng; Node khớp |
| `frames` (chờ đám đông vào tầm rồi mới bắn Tia) | 17 quái chết trong 0,55 s, một số Tia lớn dần "35×6" → "297×40", không tháp số | 14 quái chết trong 0,55 s |
| `perf` | Đỉnh ~154 quái: khung TB 1,5 ms, p95 2,6 ms; `flood(700)` (~671 quái): p95 2,7 ms; 34–35 draw call; 58–59 khung/giây | Đỉnh: TB 1,4 ms, p95 2,5 ms; flood p95 2,5 ms; 34–35 draw call |

Ngân sách §8 (đỉnh TB ≤ 6 ms, p95 ≤ 10 ms; tải 700 p95 ≤ 14 ms; draw call ≤ 160; bước sim 700 quái + 2.000 đạn ≤ 1,5 ms: trung vị 0,4 ms lúc rảnh, 0,6–0,9 ms khi cả bộ test và Chrome cùng chạy) đều đạt. Không lỗi console, không ngoại lệ ở mọi kịch bản.

### 7.4 Bộ nhớ trong một trận dài

Trận 180 s (đồng hồ giữ, người gõ 35 WPM trong trang), đo heap sau GC mỗi 20 s: 6,45 MB ở 11 s, 7,00 ở 51 s, 7,19 ở 170 s, 7,16 ở 180 s. Phần tăng là nhật ký lệnh (~600 lệnh) và chuỗi nhãn số. Số geometry (25) và texture (29) của renderer không đổi suốt trận: các pool không rò.

### 7.5 Kiểm

- Hai cấu hình `tsc` sạch; `npx vitest run` ba lần liền: 413 file, 2.715 test đạt (1 bỏ qua có sẵn), không lần nào hỏng; `vite build` đạt (`index.html`, khối CSS giảm chuyển động được viết lại thành `[data-motion=reduced]`).
- Chạy các test mới trên `src/survival`, `src/feedback` của bản đầu: 10 test hỏng (rung giữ trauma 1 vượt 14 px: 16,1 px; bốn test số: gộp thành một, đặt cạnh, số dài ra đè số bên, nảy trong hộp; ba test sim: tia Tia, press, trận 35 WPM có đỉnh 120–160; hai test thông báo bộ gõ và tự dừng). Trên mã mới tất cả đạt.
- Ảnh: `fight` (thường, đỉnh 1, đỉnh 2, màn kết) ở hai cỡ và hai tốc gõ, chuỗi 12 khung của `frames`.

## 8. Cân bằng nhiều yếu tố (23/10/2026)

> Thay các số của §3.2 và §7.1 (bảng nhịp ra quái, "S0 chỉnh cho 35 WPM"). Chi tiết, bảng bot × chế độ và cổng B1–B9: [`changelog/2026-10-23-balance.md`](changelog/2026-10-23-balance.md). Khung chung: `docs/games/BALANCE.md` §9.3 ở repo cha.

- Ba chế độ Thư giãn / Cân bằng / Thử thách; nhịp k (0,75–1,30) từ hồ sơ gõ, ghi vào đầu replay; bộ điều nhịp trong trận (kit `balance`) đọc FlowMeter mỗi 0,1 s; áp lực liên tục: vùng hút giáp từ 16 m; mỗi lượt có "triều" và sức đỉnh tràn rút từ seed (có đỉnh "dữ dội").
- Số nằm ở `src/content/balance.ts`, `src/content/stage-s0.ts`, `src/content/rules.ts`. Chỉnh xong thì chạy `pnpm survival:balance` (100 seed) và `npx vitest run`.
- Bot gõ giống người (`tests/survival/typist-bot.ts`) đi qua `installKeys` như bàn phím thật.

## 9. S1 "Chương 1 · Hành Lang VC-7" (24/10/2026)

> Đặc tả: [`BUILD_S1.md`](BUILD_S1.md). Mỗi đợt có changelog riêng.

### 9.1 R1 "Súng và khắc chế"

Chi tiết, lệch đặc tả, bảng khắc chế đo được và số cân bằng: [`changelog/2026-10-24-s1-r1.md`](changelog/2026-10-24-s1-r1.md) (đợt làm), [`changelog/2026-10-24-s1-r1-fix.md`](changelog/2026-10-24-s1-r1-fix.md) (phản biện và sửa: mục review đã xử lý, chỉnh G3c, báo cáo 100 seed; lượt 2: ô Xung ở "Bầy sát vạch", hiệu năng trên GPU thật) , [`changelog/2026-10-24-s1-r1-guns.md`](changelog/2026-10-24-s1-r1-guns.md) (làm lại sức súng, §9.2) và [`changelog/2026-10-25-s1-r1-close.md`](changelog/2026-10-25-s1-r1-close.md) (review lượt súng, chỉnh tiếp, §9.3), [`changelog/2026-10-25-s1-r1-mac.md`](changelog/2026-10-25-s1-r1-mac.md) (hai luật §5.1, rỉ giáp từng ải, §17 trên M4, §9.4). Các gạch đầu dòng dưới là trạng thái sau lượt sửa; trạng thái hiện tại ở §9.4.

- Chơi được ải 1–4 từ màn chính: Hành trình → chọn ải → bảng tin → nạp súng (2 trong 5) → trận với bộ đồ tham chiếu của ải → kết ải 3 sao. Trận thử (ải S0) vẫn ở màn chính.
- Súng mới: Tán, Ray, Pháo Sao. Có Vỏ, Băng Chuẩn xuyên Vỏ, khiên, Tách. Quái mới: Trâu, Khiên, Tách (cùng mảnh của nó), Đầu Đàn. Luật ải: Trụ vững, Săn, Vết nứt, Thiếu chữ.
- Trận thử giữ đúng vết sự kiện của `00ed734` (18 trận vàng, vẫn khớp sau lượt sửa). `COUNTERS` là bảng đo được: 16 seed, ô nằm trong ±8 % quanh ngưỡng nhận cả hai dấu (đã chọn theo đề xuất); mọi dấu cũng khớp ở seed 17–32. Lượt 2: Xung ở "Bầy sát vạch" là ○ (Tán nhanh hơn 1,30 / 1,41 lần), nên Xung chỉ ● ở một hàng và G3m trượt; không có cách chỉnh nhỏ nào cho Xung ● thật ở đó, việc này thuộc lần làm lại sức súng.
- Lệch chính của đợt làm: Tán 7 sát thương, tầm 9 m; Pháo Sao 4 quả, 22 → 9, bán kính 2,5 m; Ray 75; Trâu 220 máu; Đầu Đàn đến cách nhau 38 s.
- Lệch thêm của lượt sửa: Tia trực tuyến khi bộ không có Xung; viên Tán mài khiên × 0,5 (vế khiên của G3 đổi, đã chọn theo đề xuất); Pháo Sao tầm gần 6 m; Vết nứt ở 11–15 m; Băng Chuẩn × 1,15 ở ải chương; Đầu Đàn 300 máu × chế độ × k; vùng hút giáp của ải chương từ 14 m; Mảnh 7 máu; nhịp thường 4,4 / 3,4 / 3,9 / 3,8. Lý do ở changelog.
- Báo cáo 100 seed ải 1–4 (laptop Dell, 18 400 trận gồm 4 000 của G3c, 18–30 phút): đạt B2, B5, B8, G3, G5, G6, G8 và ngân sách chú ý; G3m trượt (lượt 2). G3c: bộ kém nhất 82 / 78 / 69 / 77 % (bản đã commit: 25 / 0 / 1 / 17 %), cách bộ tốt nhất ≤ 28 điểm; vế "tốt nhất ≤ 97 %" còn trượt ở ải 1, 2, 4.
- **Hiệu năng §17 trên GPU thật** (số Dell, Windows Chrome 155, RTX 3050 Ti (ANGLE D3D11), headless, không khóa 60 Hz: 150–230 khung/giây; không phải số Apple M4). Khung của trang (cập nhật + vẽ), TB / p95, ở 1280×720 và 1920×1080: đỉnh khoảng 150 quái 0,66–1,67 / 1,0–2,6 ms (đích ≤ 6 / ≤ 10; quy về 60 Hz bằng `survival-s0-perf`: 1,3–2,8 ms TB); `flood(700)` p95 1,7–4,5 ms (đích ≤ 14); 37–40 draw call (≤ 160). `survival-s0-keys`: 140–142 phím trong 15 s, 33–34 phím rơi trong lúc dừng hình, Node khớp mã băm (phần replay chạy trong WSL). `survival-s0-perf`, `survival-s1-perf`, `survival-s0-keys` đạt ở hai cỡ. Số đầy đủ: changelog, mục "Hiệu năng trên GPU thật".
- **Cổng R1 chưa đạt (sau lượt sửa):** B1 (bot giỏi thắng và dư giáp quá nhiều), B3 (Trẻ em ở Thư giãn 63–76 % ở ải 1–3), B4 (ải 1, 4), B7 (ải 1, 2, 4), G3m (Xung chỉ ● ở một hàng), G3c (vế tốt nhất). Hiệu năng §17 chưa đo trên M4. Lần làm lại sức súng (§9.2) đóng G3m, B3, B4.

### 9.2 R1: làm lại sức súng

Chi tiết, bảng khắc chế, báo cáo 100 seed, các vòng chỉnh và đòn bẩy tiếp theo: [`changelog/2026-10-24-s1-r1-guns.md`](changelog/2026-10-24-s1-r1-guns.md). Commit `f975d02`, `49ba852`; lượt bị cắt giữa chừng vì hết hạn mức rồi làm tiếp trên cùng mã.

- **Số mới:** Xung ở ải chương 27 viên một băng (Trận thử giữ 24); Tán 6 loạt trong 2,3 s; Ray 95 mỗi quái và "trực tuyến" khi bộ không có súng gần (Ray + Pháo Sao: đường đông nhất trong 6 m trước); máu Trâu × chế độ × k như Đầu Đàn.
- **Thời gian hạ quái (B4):** con chết trước khi vào vùng gần tính 0 s, không tính từ lúc sinh; trước đó B4 đo tầm súng chứ không đo gõ. Vết vàng của Trận thử tạo lại có chủ ý: dãy sự kiện không đổi, chỉ `stats.lifeSum`.
- **G3m** đo trên ải chương (`COUNTER_STAGE` = `c1-s1`) và trên hai bộ seed, 1–16 và 17–32; mọi dấu phải khớp ở cả hai. `COUNTERS` đo lại; ràng buộc §5.2 đạt, `KNOWN_MISSES` rỗng.
- **Báo cáo 100 seed ải 1–4** trên `49ba852` (laptop Dell, 18 400 trận, 15 phút 31 giây; các lần trước 18–30 phút): đạt B2, B3, B4, B5, B8, G3, G3m, G5, G6, G8, §7.6. Trượt B1 và B7 ở cả 4 ải (S của bot 79–96 % ở ải 1–3, trần 65), và vế "tốt nhất ≤ 97 %" của G3c ở ải 1, 2, 4 (Tia + Tán 99–100 %, Tia + Ray 100 % ở ải 4); hai vế "không bẫy" của G3c đạt ở cả 4 ải (bộ kém nhất 83 / 88 / 69 / 77 %).
- **Vòng chỉnh sau commit** (9 vòng G3c, 5 vòng B1, 40 seed): nhịp, bão, giáp đầu ải, sát thương Tia, Băng Chuẩn × 1, gói sửa 40. Mọi đòn bẩy chung của ải giãn khoảng cách giữa các bộ (bộ yếu thua vì tràn vạch thành chuỗi, Tia + Tán thì không sụp), và tăng nhịp làm Ẩu, Mới, Trẻ em gãy trước khi Chuẩn vào dải. Không bộ số nào đạt thêm cổng mà giữ được các cổng đang đạt, nên mã giữ nguyên `49ba852`.
- **Hiệu năng §17** (Dell, Windows Chrome 155, RTX 3050 Ti (ANGLE D3D11)): chỉ hai hàng khung và draw call được đo. `survival-s1-perf` đạt ở hai cỡ; đỉnh khoảng 145 quái TB 1,05–1,52 ms, p95 1,7–2,5 ms; `flood(700)` (640–649 quái) p95 2,7 / 3,6 ms; 38–40 draw call. Các số này đo lúc lô chỉnh của chính lane đang chạy 4 tiến trình trong WSL, nên là cận trên (ghi thêm 25/10 theo review). "Phím tới hình / phím tới đạn" đo từ lượt sau (§9.3); Apple M4 chưa đo.
- **Cổng R1 vẫn chưa đạt:** B1, B7, G3c (vế tốt nhất). Đòn bẩy tiếp theo: sức của cặp mạnh nhất (Tia trực tuyến cùng Tán hoặc Ray, Tán + Pháo Sao), rồi Băng Chuẩn ở ải chương về × 1 cùng Ray khoảng 110, rồi mới nâng nhịp ải 1–3. R2 chưa bắt đầu. Lượt sau đã thử các đòn bẩy này: §9.3.

### 9.3 R1: xử lý review lượt súng, chỉnh tiếp cổng R1 (25/10/2026)

Chi tiết, bảng các vòng chỉnh và chẩn đoán: [`changelog/2026-10-25-s1-r1-close.md`](changelog/2026-10-25-s1-r1-close.md). Commit `ce953b8`, `27b93f4`, `0a85db9`, `531a511`, `abe5993` và commit tài liệu.

- **Review lượt súng (7 mục nhỏ) đã xử lý:** phần nhắm của Tia và Ray (S0, `TIA_DUTY`, `RAY_DUTY`) sang `src/sim/guns/aim.ts`, nên `tia.ts` 159 / 170 và `ray.ts` 120 / 150 dòng (120 trận ải chương cùng mã băm); kho súng ghi "27 viên … (Trận thử: 24 viên)" và đơn vị "từ còn nợ" của bộ điều nhịp lấy băng Xung theo ải; thời gian hạ quái của B4 định nghĩa ở BUILD_S1 §11.3 (giây trong vùng hút giáp, con chết trước khi vào vùng tính 0 s; chủ BALANCE ở repo cha cần ghi vào BALANCE §7); sửa các chỗ ghi sai của changelog lượt súng.
- **Phím tới hình / phím tới đạn (§17):** kịch bản mới `survival-s1-latency` (ải 1, Xung + Ray, gõ thật). Số ở changelog, mục "Hiệu năng §17".
- **Núm `drainRate`** của ải (nhân tốc rỉ giáp, mặc định 1, chưa ải nào dùng): đòn bẩy "mòn giáp" đã đo.
- **Sáu vòng chỉnh mỗi họ cổng (40 seed), không vòng nào vào mã:** nâng nhịp làm Ẩu, Mới, Trẻ em gãy trước khi bot mạnh vào dải; rỉ giáp hạ S êm và giữ B3, B4 nhưng thắng giảm chậm, Khá, Nhanh vẫn nhàn 13–14 %, ải 3 không chịu được rỉ × 2 (Vết nứt mở trong vùng hút giáp). Chẩn đoán ải 1: cách S giữa Chậm chắc và Ẩu là 50 điểm (Trận thử 9), do phần sát thương thêm của băng Chuẩn (bỏ hết: 18) và từ dài hơn 1 chữ của súng nặng (bỏ: 32), cả hai là luật §5.1. Bộ số gần nhất cho G3c (`i6`: Ray trực tuyến 8 m, Tán mài khiên × 0,8, rỉ giáp × 2 / 2,5 / 1 / 2,5, Khiên ở ải 4 10 %) đạt ba vế ở ải 2 và 3, trượt "tốt nhất ≤ 97 %" ở ải 1 và 4 (Tán + Ray, Tán + Pháo Sao 39/40).
- **Cổng R1 vẫn chưa đạt:** B1, B7 trượt cả 4 ải, G3c trượt vế "tốt nhất ≤ 97 %". Đề xuất chờ chủ dự án: băng Chuẩn ở ải chương không thêm sát thương, từ của súng nặng chỉ dài hơn ở đầu dài của dải. R2 chưa bắt đầu.

### 9.4 R1 trên Mac: hai luật §5.1 theo đề xuất, rỉ giáp từng ải, §17 trên Apple M4 (25/10/2026)

Chi tiết, các vòng chỉnh, bảng 100 seed đầy đủ: [`changelog/2026-10-25-s1-r1-mac.md`](changelog/2026-10-25-s1-r1-mac.md). Commit `53da6ff`, `1264940`, `f20c073`, `cf42a26` và commit tài liệu. Máy Mac mini M4; mọi số đo trong mục này là số Apple M4.

- **Hai luật §5.1, đã chọn theo đề xuất:** ở ải chương băng Chuẩn không thêm sát thương (phần thưởng là xuyên Vỏ và chí mạng; Trận thử giữ × 1,06); súng nặng lấy từ dài hơn 1 chữ chỉ ở đầu dài của dải.
- **Bù cho súng:** Tia ở ải chương 7 mỗi nhịp, Ray 112, Pháo Sao 23, Vỏ của Trâu 4, Tán mài khiên × 0,8, Ray trực tuyến 8 m. `COUNTERS` đo lại (3 ô).
- **Số của ải:** rỉ giáp × 2 ở ải 1 và 4 (ải 2, 3 giữ 1); toán Khiên ở ải 4 10 %; Vết nứt 13–17 m, 5 bầy.
- **Công cụ:** `--set` cho `scripts/balance.ts` và `scripts/counters.ts` (`scripts/overrides.ts`, có test). Kịch bản G3/G3m rỉ giáp theo mức gốc của chương: `drainRate` của ải 1 không làm lệch bảng khắc chế.
- **Báo cáo 100 seed trên `cf42a26`** (12 phút 21 giây, một tiến trình):
  - đạt B2–B5, B8, G3, G3m, G5, G6 (112 s), G8, §7.6;
  - G3c đủ ba vế ở ải 1 và 3;
  - B1 còn 42 chỉ số lệch dải (trước 52); Mới và Ẩu trong dải ở ải 1 và 4;
  - B6 (chỉ đo) đạt ở ải 2 và 4.
- **Vẫn trượt:**
  - B1 và B7 ở cả 4 ải;
  - G3c vế "tốt nhất ≤ 97 %" ở ải 2 (99 %) và 4 (100 %).
  - Lý do: ải 2 xong ở 112 s nên S 94–96 %; Khá và Nhanh nhàn 12–16 % vì súng không nhận thêm băng (nạp 32 từ/phút, như Chuẩn 30); ải 3 giữ rỉ × 1.
- **§17 trên Apple M4** (lần đầu, khung khóa 60 Hz): đạt khung (đỉnh khoảng 150 quái TB 0,8–1,3 ms, `flood(700)` p95 2,1–2,6 ms), draw call 38–40, phím tới hình (p95 17,4–17,7 ms), phím tới đạn (p95 18,5–20,4 ms) ở 1280×720 và 1920×1080. Còn bước sim với 700 quái và bộ nhớ một chương (chờ R2).
- Đòn bẩy tiếp theo, R2 chưa bắt đầu: changelog, mục "Còn lại".

### 9.5 R1: báo cáo 100 seed trên mã đã commit, kịch bản hai cỡ, §17 trên Apple M4 (25/10/2026)

Chi tiết, đủ bảng §3 từng ải và bảng cổng: [`changelog/2026-10-25-s1-r1-report.md`](changelog/2026-10-25-s1-r1-report.md). Commit `aff1045` và commit tài liệu. Lượt báo cáo, không đổi số cân bằng. Mọi số đo là số Apple M4, đo khi máy còn bận (sơ bộ).

- **Báo cáo 100 seed trên `a4376a0`** (12 phút 12 giây, một tiến trình): đúng từng chữ báo cáo trên `cf42a26`, trừ dòng thời gian; JSON 144 ô trùng. `aff1045` chỉ thêm test.
- **Cổng R1 vẫn chưa đạt:** B1 (42 chỉ số lệch dải) và B7 trượt ở cả 4 ải; G3c vế "tốt nhất ≤ 97 %" trượt ở ải 2 (99 %) và 4 (100 %). Đạt: `pnpm check`, B2–B5, B8, G3, G3m, G5, G6 (112 s), G8, §7.6.
- **Kịch bản trình duyệt** ở 1280×720 và 1920×1080: `survival-s1-loadout`, `-stage`, `-perf`, `-latency`, `survival-s0-fight` đạt. `-latency` ở 1920×1080 đạt ở lần chạy thứ hai; lần đầu có một khung dài 14 133 ms (chưa rõ nguyên nhân).
- **§17:** khung đỉnh khoảng 150 quái TB 0,74–1,21 ms, `flood(700)` p95 1,2–2,2 ms, draw call 38–40, phím tới hình p95 16,6–17,7 ms, phím tới đạn p95 16,7–20,1 ms (khung khóa 60 Hz).
- **Bước sim của ải chương** có test mới (`tests/survival-sim.test.ts`): ải 4, 700 quái, khoảng 1.900 viên, 56 quả, 32 khiên, 3 bến cùng bắn; trung vị 0,83–0,85 ms (trần 1,5). Còn mở: bộ nhớ một chương (chờ R2).
- **Mục 6.A của file process:** G3m đo seed 17–32 trong test từ `49ba852`; thời gian báo cáo trong `AGENTS.md` theo số đo hai máy (Mac 12 phút, Dell 15–30 phút).
- Việc kế: lượt chỉnh mới theo "Còn lại" của changelog bước 1 (luật bến đầy, sức ép ải 2, đỉnh tràn ải 3, hãm `TIA_DUTY`), ngân sách 6 vòng mỗi họ cổng.

### 9.6 R1: sửa sau phản biện độc lập (26/10/2026)

Chi tiết, bảng 25 mục phản biện và số đo: [`changelog/2026-10-26-s1-r1-review-fix.md`](changelog/2026-10-26-s1-r1-review-fix.md). Commit `777a137`, `84136f2`, `8f2ae2d`, `931a2b9`, `cbdcc16`, `ccb34e2`, `a697e45`, `d5f20ca` (chữ của Kho súng) và commit tài liệu. Số Apple M4.

- **Cổng R1 vẫn chưa đạt**, nay chấm trên cả seed 1–100 và 101–200: B1 (43 / 40 chỉ số lệch) và B7 trượt ở cả 4 ải; G3c vế "tốt nhất ≤ 97 %" trượt ở ải 2 và 4. Đạt trên cả hai bộ: `pnpm check` (124 test), B2–B5, B6 gộp ải (+11,0 / +11,3), B8, G3, G3m, G3c ở ải 1 và 3, G5, G6, G8, §7.6.
- **Luật (b) ở trần** ("đã chọn theo đề xuất" của phản biện): chữ thêm mà trần 10 không nhận ở đầu dài sang đầu ngắn (`HEAVY.spill`); E ≥ 60 lấy 7–10, không còn bằng súng nhẹ. Nhàn của Nhanh giảm ở cả 8 ô. Đây là thay đổi sim duy nhất của lượt: 152 trận chương trên HEAD với `HEAVY.spill=0` băm trùng `7e53835`; như commit chỉ 8 trận của Nhanh đổi; vết vàng Trận thử không đổi.
- **§17 phím tới đạn:** khung dài duy nhất của mỗi lần chạy là phím đầu tiên khởi động âm thanh (106–107 ms, dò bằng long-animation-frame). Kịch bản khởi động âm trước khi đo và gộp 40 từ: sáu lần chạy, 0 khung dài, p95 18,2–19,8 ms, tối đa 31,7 ms (trần 50).
- **Chẩn đoán sửa lại:** G3c ải 4 có cặp không Tia vượt trần (Tán + Pháo Sao 97 / 98); ải 3 thua kiểu vực vì đoàn đỉnh tràn giây 55 tới vạch ở giây 60–90 (súng còn băng nhưng ngộp), không vì Vết nứt; hai bộ seed chênh thắng tới 16 điểm và cùng hướng.
- **Công cụ:** `--set` chép object dùng chung trước khi ghi; báo cáo in B6 gộp và ô B1/B7 cần chạy lại (`scripts/rollup.ts`); `--g3c=only` ghi file. Kịch bản: `-stage` bắt trang tải lại và replay rỗng, `-loadout` mở Kho súng, `-perf` in khoảng khung; Vite bỏ qua `tmp/`.
- **Chữ:** luật gõ chuẩn dạy đúng ở màn chính và Kho súng; chữ thẻ và bảng tin 12–13 px ở 1280×720; số và đơn vị không ngắt dòng.
- Việc kế: ngân sách vòng (coordinator chốt số biến thể một vòng), luật bến đầy cho nhàn của Khá / Nhanh, ải 3 dàn đỉnh tràn kèm bù sức ép, G3c ải 2 hãm `TIA_DUTY`, ải 4 sức ép chung.
