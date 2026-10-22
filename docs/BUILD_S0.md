# Sinh Tồn, giai đoạn S0 "Bản thử dọc": đặc tả thực thi (23/10/2026)

> **Dành cho:** AI làm code và AI phản biện.
> **Kế hoạch gốc:** [`SURVIVAL_MODE_PLAN.md`](SURVIVAL_MODE_PLAN.md) (luật, lý do). File này chốt **phạm vi và số** của S0. Hai file khác nhau thì theo file này.
> **Worktree:** `games/.wt-survival`, nhánh `feat/survival-s0`. Chủ dự án đã duyệt kế hoạch; không cần hỏi lại các mặc định ở đây.

## 0. Mục tiêu của S0

Một trận ngắn (một ải, 3 phút) đủ để trả lời: **gõ để nạp đạn, quét đám đông có máu thật, có thấy "đã tay" không, và chữ học có luôn rõ không.** Chưa có chương, cửa, Ấn, Chợ, boss, Trạm Mẹ (S1 trở đi).

## 1. Luật không đổi

- Sim tất định, cố định 60 Hz, thuần TypeScript (không DOM, không đồng hồ, ngẫu nhiên chỉ từ `src/platform/rng.ts`), như TD. Hình đọc trạng thái sim, không ghi vào sim.
- Chữ cái chỉ để gõ. Phím lệnh không phải chữ cái. Bộ gõ tiếng Việt: dùng `src/scene3d/keys.ts` (`isComposingKey`, `typedLetter`, `vietnameseInputSign`).
- **Phím không bao giờ bị nuốt**, kể cả khi đang dừng hình.
- Không media mới trong Git. Chỉ dùng model, texture đã có trong repo hoặc tạo bằng mã. Trang phải chạy được ở bản clone sạch (thiếu model thì dùng hình khối thay thế, không lỗi).
- Không sửa luật của các chế độ khác. `src/feedback/` là module mới, chưa chế độ cũ nào dùng ở S0.

## 2. Cấu trúc mã

```text
survival.html                 trang mới, thêm vào vite.config.ts
src/survival/
  sim/        world, step, spawn (dòng quái, nhóm đội hình), move (trường hướng + đẩy nhau bằng lưới),
              weapons (băng đạn), projectiles, hits (lưới không gian), ship (máu), words (ô súng)
  content/    rules.ts (mọi số), stage-s0.ts (một ải)
  app/        main, session (vòng khung bằng src/platform/frame-loop.ts), input, dev handle window.__survival
  view/       scene (Three.js, dùng src/scene3d khi hợp), crowd (InstancedMesh), weapons fx, hud (DOM)
src/feedback/ tiers, trauma, hitstop, numbers (WebGL), reaction, debris, audio-cues (mục 5)
tests/survival-*.test.ts, tests/feedback-*.test.ts
scripts/visual/scenarios/survival-s0-*.mjs
```

- `tests/mode-isolation.test.ts`: thêm `survival/` vào danh sách được dùng `scene3d/`; thêm ca "không ai ngoài `survival/` import `survival/`"; khóa lưu `survival.*` qua `safe-storage`.
- Test ranh giới mới `survival-boundary`: `survival/sim`, `survival/content` không dùng DOM, đồng hồ, `Math.random`, chỉ import nhau và `src/platform/rng.ts`.

## 3. Ải S0

- **Sân:** hành lang 24 m × 60 m, nhìn từ trên xuống nghiêng 55°, camera cố định (chỉ rung, xung). Nền không gian tối có sao và tinh vân nhẹ (tạo bằng mã hoặc dùng nền có sẵn của Campaign 3D). Tường hai bên là hàng cột năng lượng (mã).
- **Tàu:** ở đáy giữa, đứng yên, xoay nòng về mục tiêu. Mặc định `vanguard` (model và model đạn có sẵn; thiếu thì khối thay thế). Có tùy chọn Draconis (cầu lửa có sẵn).
- **Máu tàu:** 100. Quái chạm vạch đáy: trừ máu theo loại rồi biến mất (có lóe, tiếng).
- **Thời lượng:** 180 s. Hết giờ mà còn sống thì thắng. Hết máu thì thua. Màn kết: thời gian, số hạ, độ chuẩn, từ đã gõ (từ + nghĩa).

## 4. Quái

| Loại | Model | Máu | Tốc | Ghi chú |
|---|---|---|---|---|
| Bầy (`mine`) | `mine-3d` của một họ (mặc định `rainbow`) | 2 viên Xung (≈ 14) | 3,2 m/s, lắc ngang nhẹ | 85 % số quái. Chạm đáy: −3 máu |
| Lính (`scout`) | `scout-3d` cùng họ | 8 viên Xung (≈ 56) | 1,8 m/s | Dừng ở 30–40 m, bắn đạn chậm (6 m/s) vào tàu mỗi 3 s, −4 máu; đạn bắn rơi được. Chạm đáy: −6 |

- **Ra đều theo nhóm** (`SURVIVAL_MODE_PLAN.md` 4.5): nhóm 4–12 con, đội hình khối, nêm hoặc hàng, vào từ đầu trên ở vị trí ngẫu nhiên theo luồng `spawn`.
- **Nhịp ra** (con mỗi giây): 0–30 s là 1,5; 30–60 s là 2,5; 60–90 s là **đỉnh tràn 1** (5,0 trong 8 s) rồi 3,0; 90–150 s là 3,5; 150–165 s là **đỉnh tràn 2** (6,5 trong 10 s); 165–180 s là 3,0.
- Mục tiêu: người gõ 35 WPM thấy 40–80 quái trên màn hình lúc thường và 120–160 lúc đỉnh.
- **Trần kỹ thuật** (an toàn): High 700. Vượt trần thì quái mới chờ ở cổng.
- Model quái chỉ có clip `Enemy_Idle`. Đi, nhún, lắc, nghiêng làm bằng shader hoặc ma trận instanced theo vận tốc. Không khung xương cho quái bầy.

## 5. Súng: gõ là nạp băng đạn

- **2 ô:** trái là **Xung**, phải là **Tia**.
- Mỗi ô hiện tên súng (nhỏ), **một từ** (to), nghĩa tiếng Việt (nhỏ), thanh đạn (2 băng tối đa).
- **Gõ xong từ = nạp 1 băng** (cộng dồn tối đa 2). Ô lấy từ mới ngay. Chữ đầu của 2 ô không trùng nhau. Chọn từ: cấp 1–3 của `shared/vocabulary`, độ dài theo tốc E (mặc định 35 WPM; bảng `LENGTH_BY_E` như TD), không lặp tới khi hết dải.

| Súng | Một băng | Bắn | Sát thương |
|---|---|---|---|
| Xung | 24 viên trong 2,4 s | Liên thanh vào quái gần đáy nhất trong nón 50° | 7 mỗi viên |
| Tia | Cột 2,5 s, rộng 1,4 m | Bắt đầu ở cụm quái dày nhất, quét ngang 3 m/s về phía cụm kế | 6 mỗi nhịp 0,1 s cho mọi quái trong cột |

- **Chất lượng gõ** của từ nạp băng: Chuẩn (0 lỗi) thì sát thương băng ×1,15 và chí mạng +10 %. Nhanh (≤ 0,7 thời gian mong đợi) thì tốc bắn ×1,15. Hoàn hảo (0 lỗi và nhanh) thì cả hai, và các viên chí mạng của băng này hiện kiểu "HOÀN HẢO" (mục 6).
- Gõ sai: phím sai tính lỗi, không mất từ, không phạt khác. Backspace về 0 thì nhả khóa (như TD).
- Ô có từ đang gõ dở thì từ đó sáng hơn; chữ đã gõ đổi màu.

## 6. `src/feedback/` bản đầu

| File | Làm gì | Số khởi điểm |
|---|---|---|
| `tiers.ts` | Bảng T0–T5 (`SURVIVAL_MODE_PLAN.md` 5.2) → trauma, dừng hình, kiểu số, hạt, tiếng | Như kế hoạch |
| `trauma.ts` | Rung = trauma², giảm 1,8/s; xung có hướng (ngược hướng bắn 2–6 px, lò xo 120 ms). **Nhân với cài đặt rung của người chơi** (đọc `settings.screenShake` như Campaign 3D, 0 thì tắt) và tắt khi "giảm chuyển động" | Rung tối đa 14 px ở 1080p |
| `hitstop.ts` | Đặt tốc thế giới 0,05 trong N ms. Không áp cho HUD, ô súng, khung học. Hai lần cách nhau ≥ 150 ms. Phím đi thẳng vào bộ gõ; đạn của từ vừa xong xếp hàng | T2 12 ms, T3 35 ms, T4 45 ms; quét ≥ 30 con trong 0,5 s: 25 ms một lần |
| `numbers.ts` | Số sát thương bằng WebGL instanced (atlas chữ số vẽ bằng canvas lúc nạp). Gộp cùng mục tiêu trong 150 ms; Tia gộp theo 0,3 s ("×6"). Hướng bay theo hướng đòn. Kiểu: thường, chí mạng (vàng), hoàn hảo (trắng xanh ngọc có chữ nhỏ "HOÀN HẢO"), nhịp | Trần High 160; bỏ số nhỏ nhất trước |
| `numbers.ts` (tránh) | Vùng cấm: khung học, 2 ô súng, thanh máu (hình chữ nhật màn hình, do HUD công bố mỗi khi đổi cỡ). Số rơi vào thì dời lên hoặc bỏ | 0 số đè vùng cấm |
| `reaction.ts` | Thuộc tính instanced: lóe (trắng nóng 1–4 khung), giật lùi giả (dời hình theo hướng đòn, lò xo về, vị trí sim không đổi), co giãn (0,91 / 1,07 trong 120 ms) | Không thêm draw call |
| `debris.ts` | Quái chết vỡ 4–8 mảnh tinh thể màu họ, văng theo hướng đòn, nằm trên sàn 8 s rồi mờ. Instanced, pool | Trần High 900 |
| `audio-cues.ts` | Tiếng tổng hợp bằng mã (như `td/view/audio-min.ts`): trúng = đầu nhọn + thân, lớp trầm từ T2; tiếng hạ thành **chuỗi nốt đi lên** khi hạ nhiều trong 1 s; phím: 5 biến thể, lệch cao độ ±3 %; phím sai: tiếng đục nhỏ. Gom tiếng trúng 30–45 ms, tối đa 4 nổ trong 120 ms | — |

- **Đầu nòng:** lóe 30–80 ms, tia hướng, tàu giật lùi nhẹ. **Va chạm:** sao tia nhỏ (T1), sao 8 tia + vụn (T2). **Chết:** lóe, mảnh vỡ, sóng nhỏ; nhiều con chết cùng chỗ trong một khung thì gom thành một vụ nổ cỡ √N.
- **Đếm hạ:** góc trên phải "×N" số hạ trong 3 s gần nhất, nảy khi tăng.
- Hạt dùng `src/scene3d/particles.ts` (`ParticlePool`, `Ribbon`, `Streaks`) khi hợp; vệt đạn là ribbon dùng chung.

## 7. Khung học và HUD (DOM, không rung)

- **Khung học** ở giữa đáy, giữa hai ô súng. Khi đang gõ một từ: từ to (chữ đã gõ sáng dần), IPA vừa, nghĩa nhỏ. Gõ xong: "từ · nghĩa ✓" 0,6 s.
- Phát âm (`src/speech.ts`) khi gõ xong một từ **lần đầu trong trận**, tối đa 1 lần mỗi 3 s; khi phát âm, tiếng súng và va chạm −6 dB (xuống 80 ms, lên 400 ms).
- Thanh máu tàu, thời gian còn lại, đếm hạ. Tất cả DOM ngoài canvas.
- Cỡ chữ của từ trên ô ≥ 26 px ở 1280×720; tương phản ≥ 7 : 1.

## 8. Chất lượng và hiệu năng

- 4 bậc Low / Medium / High / Ultra cho trang này (số ở kế hoạch 8.1). Mặc định High.
- **Ngân sách S0 (High, M4, 1280×720 và 1920×1080):** 160 quái + đạn + hiệu ứng: khung trung bình ≤ 6 ms, p95 ≤ 10 ms. **Thử tải** 700 quái (lệnh dev `__survival.flood(700)`): p95 ≤ 14 ms. Một bước sim với 700 quái, 2.000 đạn: ≤ 1,5 ms.
- Không cấp phát đối tượng trong trận (pool hết). Draw call ≤ 160.

## 9. Test và kịch bản

**Test (Vitest):**
- Sim tất định: cùng seed và nhật ký lệnh thì cùng mã băm; chạy lại = chạy thật.
- Nhịp ra quái đúng bảng mục 4 (đếm theo cửa sổ 1 s); nhóm 4–12; trần chờ ở cổng.
- Băng đạn: nạp, cộng dồn tối đa 2, số viên, thời gian, nhân chất lượng.
- Va chạm qua lưới khớp với cách so từng cặp (thuộc tính, nhiều seed).
- Tia quét về cụm dày.
- Gộp số, tránh vùng cấm, trần số.
- Dừng hình không làm mất phím: gõ trong lúc dừng hình thì mọi phím vẫn vào bộ gõ theo đúng thứ tự.
- Trauma nhân cài đặt rung; 0 thì không rung.
- Ranh giới, cô lập chế độ.

**Kịch bản trình duyệt** (CDP gõ thật như các kịch bản TD; 1280×720 và 1920×1080; không lỗi console):
- `survival-s0-boot.mjs`: trang dựng, HUD, 2 ô súng có từ.
- `survival-s0-fight.mjs`: gõ 45 WPM suốt 180 s, chụp lúc thường, lúc đỉnh tràn 1, lúc đỉnh tràn 2, màn kết; kiểm có quái chết, có số, có mảnh vỡ; **không số nào đè khung học**.
- `survival-s0-perf.mjs`: đo khung hình lúc đỉnh tràn và khi `flood(700)`; số draw call.
- `survival-s0-keys.mjs`: gõ dồn 120 WPM trong lúc liên tục có đòn T3 (dừng hình), kiểm không mất phím.
- `survival-s0-frames.mjs`: chụp liên tiếp 12 khung cách nhau 50 ms quanh một lần bắn Tia vào cụm đông, để xem nhịp hiệu ứng.

## 10. Xong khi

1. Hai cấu hình `tsc` sạch; toàn bộ `npx vitest run` xanh; `vite build` đạt.
2. Mọi kịch bản mục 9 đạt ở hai cỡ.
3. Ngân sách mục 8 đạt.
4. AI tự xem ảnh chụp và sửa chỗ xấu, khó đọc trước khi báo xong.
5. Ghi `docs/survival/BUILD_NOTES.md` (đã làm gì, lệch và lý do, số đo), changelog `docs/changelog/2026-10-23-survival-s0.md` và một dòng trong `docs/changelog/README.md`.
