# Sinh Tồn S0: ghi chú khi làm

Đi kèm [`BUILD_S0.md`](BUILD_S0.md) (phạm vi, số) và [`SURVIVAL_MODE_PLAN.md`](SURVIVAL_MODE_PLAN.md) (ý đồ). Nhánh `feat/survival-s0`, worktree `games/.wt-survival`. Ngày 23/10/2026.

---

## 1. Đã làm gì

| BUILD_S0 | Ở đâu | Ghi chú |
|---|---|---|
| §2 Trang | `survival.html`, mục `survival` trong `vite.config.ts` | Thẻ mở đầu chọn tàu (Vanguard, Draconis) và bậc chất lượng; Enter bắt đầu, Esc tạm dừng, Enter chơi lại |
| §1 Sim tất định | `src/survival/sim/` (world, spawn, move, weapons, projectiles, hits, words, stores, events, hash) | Bước cố định 60 Hz, mảng số (SoA) có ngăn rỗng, ngẫu nhiên chỉ từ `src/platform/rng.ts`, không lượng giác (lắc ngang bằng parabol Bhaskara). Mã băm như TD |
| §3–§4 Ải | `src/survival/content/rules.ts`, `stage-s0.ts`, `deck.ts` | Mọi số ở `rules.ts`; bảng nhịp ra quái ở `stage-s0.ts` |
| §4 Quái | `sim/spawn.ts`, `sim/move.ts` | Nhóm 4–12 (khối, nêm, hàng), lính ở hàng sau; trường hướng trên lưới 2 m (thẳng xuống, cong dần về tàu khi gần, tránh tường) + đẩy nhau qua lưới; trần theo bậc, quái chờ ở cổng |
| §5 Súng | `sim/weapons.ts`, `sim/words.ts` | Gõ xong từ nạp 1 băng (tối đa 2, kể cả băng đang bắn); Chuẩn, Nhanh, Hoàn hảo; Xung không bắn thừa vào quái coi như đã chết (đếm sát thương đang bay tới); Tia chờ khi không có gì trong tầm |
| §6 `src/feedback/` | `tiers`, `trauma`, `hitstop`, `numbers`, `reaction`, `debris`, `audio-cues`, `quads` | Chưa chế độ cũ nào dùng. `quads.ts` là hàm dựng quad instanced dùng chung |
| §6 Đầu nòng, va chạm, chết | `src/survival/view/combat.ts`, `fx.ts` | Đầu nòng lóe 60–80 ms + giật lùi tàu + xung 2 px; trúng: sao 4 tia (T1), 8 tia + vụn (T2), 12 tia + vòng (T3); chết: lóe, sao, sóng tròn trên sàn, mảnh vỡ, tia lửa; nhiều con chết cùng ô 3 m trong một khung thành một vụ nổ cỡ √N |
| §6 Đếm hạ | `view/hud.ts` | "×N" hạ trong 3 s, nảy khi tăng, vàng khi ≥ 15 |
| §7 Khung học, HUD | `view/hud.ts`, `view/survival.css` | DOM ngoài canvas; canvas rung bằng `setViewOffset` của camera, HUD không bao giờ rung |
| §7 Phát âm | `app/main.ts` | `speakEnglish` lần đầu mỗi từ trong trận, cách nhau ≥ 3 s; Tab đọc lại từ đang gõ; súng và va chạm −6 dB khi đọc (sự kiện `space-typing:pronunciation` của `src/speech.ts`) |
| §8 Bậc chất lượng | `view/scene.ts` (`VIEW_TIERS`), `content/rules.ts` (`FOE_CAP`, `BULLET_CAP`) | Low / Medium / High / Ultra: trần quái 200/400/700/1.000, đạn, hạt, số, mảnh vỡ, tỉ lệ điểm ảnh, bloom từ High. Mặc định High |
| §9 Test | `tests/survival-sim.test.ts`, `tests/survival-boundary.test.ts`, `tests/feedback-numbers.test.ts`, `tests/feedback-motion.test.ts`, `tests/mode-isolation.test.ts` | Mục 4 dưới đây |
| §9 Kịch bản | `scripts/visual/scenarios/survival-s0-{boot,fight,perf,keys,frames}.mjs` (+ `survival-s0-lib.mjs`) | Đều đạt ở 1280×720 và 1920×1080 |
| Phát lại | `scripts/survival/replay.ts` | Chạy lại nhật ký lệnh của trang trong Node, so mã băm |
| Cân bằng | `scripts/survival/balance.ts`, `tests/survival/bot.ts` | Bot gõ 25/35/45/60 WPM, in số quái trên sân mỗi 15 s |

Model dùng: `rainbow-mine-3d`, `rainbow-scout-3d`, tàu `vanguard` hoặc `draconis-v3` (qua manifest model). Thiếu file (bản clone sạch không có `rainbow-mine-3d`) thì quái là khối gai làm bằng mã, tàu là thân nón; đã thử bằng một máy chủ Vite không phục vụ model cục bộ: trang chạy, không lỗi console. Nền, sàn, tường, cổng, hạt, số, âm thanh đều làm bằng mã. Không thêm media vào Git.

## 2. Lệch so với BUILD_S0 và lý do

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

Máy: Apple M4, Chrome headless (ANGLE Metal), High, DPR 1.

### 3.1 Sim (Node, `tests/survival-sim.test.ts`)

- Một bước với 700 quái và khoảng 2.000 đạn: trung vị 0,33 ms, p95 0,35 ms (ngân sách 1,5 ms).
- Trận 180 s với bot: khoảng 0,003 ms mỗi bước.

### 3.2 Bot (`node --import tsx scripts/survival/balance.ts`, lỗi gõ 4 %, nghỉ 0,25 s giữa các từ)

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
- `tests/survival-boundary.test.ts`: `survival.html` và mục build; `sim/`, `content/` chỉ import nhau và `src/platform/rng`; không DOM, đồng hồ, `Math.random`, lượng giác, lũy thừa (quét mã và biên dịch không thư viện DOM); `src/feedback` không import chế độ nào.
- `tests/mode-isolation.test.ts`: `survival/` được dùng `scene3d/`; không ai ngoài `survival/` import `survival/`; chỉ ghi khóa `survival.*` (và chỉ đọc `spaceTypingSettingsV1`) qua `safe-storage`.

## 5. Cách chạy

```bash
# Worktree (node_modules là symlink): gọi thẳng, không qua pnpm.
npx vite --config scripts/dev/vite.worktree.config.ts --host 127.0.0.1 --port 3120 --strictPort
# http://127.0.0.1:3120/survival.html  (?q=low|medium|high|ultra, ?pilot=draconis, ?seed=1, ?autostart=1, ?shake=0)
URL=http://127.0.0.1:3120/ OUT_DIR=… node scripts/visual/cdp-run.mjs scripts/visual/scenarios/survival-s0-fight.mjs --width=1280 --height=720
node --import tsx scripts/survival/balance.ts 25 35 45 60
node --import tsx scripts/survival/replay.ts <OUT_DIR>/survival-s0-fight-replay-1280x720.json
```

`window.__survival` (chỉ để kịch bản dùng): `ready, models, start, mode, flags, send, flood, hash, snapshot, state, slots, costs, info, numbers, rects, hold, advance, forceStops`.

## 6. Còn lại, nên làm tiếp

1. **Mật độ đỉnh tràn.** Bảng §4 chỉ cho tối đa 108 quái trên sân; muốn 120–160 thì ở S1 tăng nhịp đỉnh (khoảng 9–10 con/s) hoặc cho quái chậm lại khi dồn gần đáy. Người gõ nhanh (45 WPM không lỗi) giết quái ngay ở mép tầm 42 m nên nửa gần của sân thường trống: cân nhắc tầm Xung tăng theo Chuỗi, hoặc lính đứng gần hơn để Xung có tầm ngắn hơn.
2. **Nghe thử âm thanh** bằng tai và chỉnh mức các bus; thêm nhạc nền (song engine sẵn có).
3. **Model LOD** cho quái bầy khi đông (`rainbow-mine-lod`), và bậc Low dùng model nhẹ.
4. **Học (S3):** gửi sự kiện học về repo cha, hiện nghĩa theo độ thuộc, kế hoạch từ mới / ôn; "Nhanh" đo theo E thật của người chơi thay vì 35 cố định.
5. **Trợ năng:** thanh trượt rung 0–100 % (hiện đọc công tắc rung của game), cường độ lóe, chế độ số chỉ số lớn.
6. **Mã:** 4.200 dòng TS (mục tiêu 4.000); phần GLSL nằm trong `scene.ts`, `fx.ts`, `crowd.ts` có thể tách thành module shader dùng chung khi Campaign 3D và Defense chuyển sang `src/feedback/` (S7).
