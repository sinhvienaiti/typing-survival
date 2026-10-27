# Tuyến Cuối · Lượt cảm giác S1: đặc tả (26/10/2026)

> **Dành cho:** AI làm code, AI phản biện, chủ dự án (§7.6).
> **Vì sao có file này:** chủ dự án chơi Tuyến Cuối trên Mac ngày 26/10 và chê: "chán vì VFX và CGI; gõ từng chữ không có hiệu ứng gì; đạn và laser nhạt dù có model 3D cho mọi thứ; tàu như đứng yên, nên tiến về phía quái đến; chữ gõ nằm ở dưới, khó nhìn quái và chữ cùng lúc: đưa chữ lên cao, để chỗ mắt nhìn khi gõ vẫn thấy đạn trúng quái". Cảm giác muốn có là Typing Break (`typing_break.mov`, chủ dự án quay, chỉ ở máy): "gõ thấy sống, có lực, đẹp".
> **Nguồn đo** (trong `tmp/mac-2026-10-26/feel/`, không vào Git): `study-a.md` (Typing Break từng khung), `study-b.md` (Tuyến Cuối hôm nay vẽ gì, hở ở đâu), `study-c.md` (đặt dải chữ ở đâu). Mọi số "hôm nay" dưới đây lấy từ đó: Mac mini M4, 26/10, mã `a697e45`–`b6f562c`.
> **Thứ tự ưu tiên:** mã hiện tại > file này > `BUILD_S1.md` > kế hoạch gốc, **ở các điểm file này nêu**: bố cục đáy (§2), hình và tiếng của trận (§3–§5). File này thay `BUILD_S1.md` §3 câu "khung học rộng 420 px và nằm giữa đáy", §10 "Bố cục đáy màn hình", một phần §12, và `SURVIVAL_MODE_PLAN.md` §4.1 "tàu đứng yên", §4.2 "hai bên đáy có bến súng", §6.2 "ở giữa đáy". Bước F1 (§8) sửa các chỗ đó.
> **Quy ước:** px ghi ở 1280×720; ở 1920×1080 nhân 1,5 (`--ui` 1,5, camera theo tỉ lệ 16:9). "f" là một khung 60 Hz (16,7 ms). Màu là token của chủ đề "Vành Chân Trời" (`src/view/theme.css`, `src/view/theme.ts`).

## 0. Tóm tắt

| Lời chủ dự án | Hôm nay (đo) | Đặc tả này | Mục |
|---|---|---|---|
| Gõ từng chữ không có hiệu ứng | Phím chỉ đổi màu một chữ. Trên sân, khung sau phím đổi ngang khung giữa hai phím (MAE 2,6–5,6 so với 2,6–6,7). HUD đổi 0,4–0,9. `combat.ts:217-220` chỉ phát tiếng | Mỗi chữ đúng: chữ bật lên ở dòng từ, mảnh năng lượng bay vào lõi tàu, lõi sáng dần theo số chữ, vòng sáng trên sàn dưới tàu, một nốt trong thang âm. Phím sai, xong từ, bến đầy, chuỗi sạch đều có hình và tiếng riêng | §3 |
| Đạn, laser nhạt dù có model 3D | Viên Xung là vệt ~30 × 5 px, lóe nòng 3–5 khung, không có đèn. 12 model `skills/*-bolt` có sẵn, game không nạp | Xung, Tán, Pháo Sao bắn model bolt thật. Ray hiện model lúc đã nạp. Mọi phát có quầng sáng màu súng chiếu lên sàn thép và quái (4 đèn động ở bậc Cao). Lóe trúng dài hơn. Quái vỡ thành khối bay vòng cung | §4 |
| Tàu như đứng yên | `ship.ts:41` đặt tàu ở x = 0. Rig `Hero` có lái ngang nhưng `ship.ts:101` truyền 0 | Tàu trôi ngang ±1,6 m về phía quái gần, nghiêng theo, lao lên 0,35 m khi nạp băng, giật lùi theo từng súng, lơ lửng, động cơ sáng theo lực. Chỉ ở hình, sim giữ x = 0 | §5 |
| Chữ ở đáy, khó nhìn cả hai | Mắt nhảy 386–451 px. Mắt → đòn trúng trung vị 355 px. 0,4 % đòn trúng nằm trong 5° | Dòng từ cao 56 px ngay trên vạch đáy (y 416–472), bến xuống hai bên tàu (y 508–608). Mắt → đòn trung vị 200 px; 46 % đòn trong 5° | §2 |
| Chán vì VFX, CGI | Kho hiệu ứng chỉ dùng ≤ 25 % billboard, ≤ 7 % tia lửa, ≤ 37 % mảnh. Draw call 38–40 / 160 | Ngân sách mới: ≤ 60 draw call, khung JS tăng ≤ 1 ms. Mọi đích có chuỗi khung để kiểm | §6, §7 |

**Không đổi:** luật sim, mã băm, vết vàng Trận thử, cân bằng. Mọi thứ ở file này là hình, tiếng và DOM (§1.1).

**Đo được khác lời brief:** Typing Break **không** bắn một phát mỗi phím. Súng bắn theo đồng hồ riêng (0,2 s; đoạn boss 0,1 s) khi đã có đạn: 6 phím chỉ có 4 lần lóe (study A §3.3). Cái theo từng phím ở đó là chữ. Vì vậy file này không thêm phát bắn giả theo phím (§3.1 ghi lý do).

## 1. Luật của lượt này

### 1.1 Không đổi sim

- **File không được sửa:** `src/sim/**`, `src/content/**`, `src/kit/**`, `src/app/input.ts`, `src/app/session.ts`, `src/app/skill.ts`. Bot và báo cáo cân bằng nhập ba file app này. Lượt này chỉ sửa `src/view/**`, `src/audio/**`, `src/app/main.ts`, `src/app/dev.ts`, CSS, kịch bản, tài liệu.
- View chỉ **đọc** `World` (vòng sự kiện, kho quái, kho đạn, súng). Không gửi lệnh, không ghi vào `World`.
- Hình được lệch khỏi sim ở hai chỗ, đều có giới hạn: tàu trôi (§5.3) và đầu đường đạn nhập vào đường của sim trong 3 m đầu (§4.1). Chỗ trúng, giờ trúng, quái chết là của sim.
- Dừng hình vẫn chỉ qua `HitStop` của kit (§4.6). Khi chơi thật nó đổi tick mà phím rơi vào, nhưng replay ghi tick, nên mã băm không đổi (như hiện nay).
- Cách kiểm: §7.1.

### 1.2 Học vẫn rõ nhất (giữ ý của BUILD_S1 §3)

- Dòng từ và các bến là DOM ngoài canvas, không rung, không bị hậu kỳ.
- Hiệu ứng chữ chỉ đổi cỡ, màu, vị trí **của chính chữ** trong ≤ 100 ms, rồi chữ đứng yên. Không gì vẽ đè lên chữ.
- Chữ trên bến 32 px (từ dài co tới 26 px). Từ đang gõ 42 px. Tương phản ≥ 7 : 1, đo trên khung thật ở pixel nền p99 (§2.3).
- Phím không bao giờ bị nuốt.

### 1.3 Bản quyền (`SURVIVAL_MODE_PLAN.md` §9)

Học nguyên lý của Typing Break. Không chép giao diện, tên, màu, hình, tiếng, nhịp hoạt ảnh.

| Typing Break làm (không chép) | Tuyến Cuối làm |
|---|---|
| Chữ vừa gõ hiện 1,6×, nổ mảnh mực trắng đen, vòng khuyết quay; 8 f | Chữ trồi lên 6 px từ đáy dòng, 1,25× → 1×, trắng nóng → màu súng, một vạch quét dưới chữ; 6 f. Mảnh năng lượng bay **xuống** lõi tàu (chữ ký của kế hoạch: "mảnh chữ bay vào lò"). Vòng sáng nằm trên sàn dưới tàu, không quanh chữ |
| Chữ khổng lồ 3–4× đóng dấu lên mọi ô súng còn khớp | Không đóng dấu. Sọc đầu bến đầy dần như thanh nạp; bến khác mờ đi (đã có) |
| Quầng trắng ấm 9–21 % chiều cao khung quanh súng | Quầng màu súng trên sàn thép, 4–12 % chiều cao màn tùy súng, từ kho đèn động riêng |
| Khối vụn hồng xám nằm 3–6 s | Khối thép tối, mép cam nóng nguội dần về màu thép, nằm 8 s |
| Chữ dồn trên dòng gõ khi gõ liền (chuỗi) | Đèn LED "SẠCH ×N" đếm từ gõ sạch liên tiếp |
| Vệt cọ hồng xoáy cả màn (tối thượng) | Không có ở lượt này (Nova là vòng chữ, S2) |

### 1.4 Âm theo hình dạng hành động (Q6)

Luật Q6 (`tools/audio-lab/DECISIONS.md` ở repo cha; `docs/audio/THEME_SOUND_LIST.md` §2):

- Âm hành động có đủ phần mà hành động có: chuẩn bị, phát, thân, đuôi vang hành lang thép.
- Cỡ âm theo cỡ nguồn.
- Cấm "bụp, thụp", pop, puff, tiếng trầm ngắn đứng riêng, kiểu đồ chơi, retro.
- Dải 1–4 kHz chỉ ở đầu tiếng (tắt ≤ 30 ms). Đuôi dưới 1 kHz hoặc trên 4 kHz, vì từ được đọc ngay sau khi gõ xong.
- Âm lặp mỗi từ giữ đuôi thấp, để nghe 20 lần không mệt.

Mọi âm mới vẫn tổng hợp bằng mã. Mỗi id mới có mục trong `THEME_SOUND_LIST.md`. Hai âm hiện tại trái Q6, lượt này sửa: `key.bad` (sin 105 → 72 Hz, một tiếng đục đứng riêng) và `gun.phao.launch` (BUILD_S1 §12 ghi "bụp, rít").

### 1.5 Trợ năng và bậc hình

- **Giảm chuyển động:** tắt trôi, lao, lơ lửng của tàu; giật lùi × 0,3; rung 0 (đã có). Giữ lóe, đèn, số, tiếng.
- Thanh rung camera 0–100 % áp vào mọi cú đẩy ở §4.6 (đã có trong `Trauma`).
- **Bậc hình:** Thấp không vẽ model đạn, không đèn động. Vừa có model, 2 đèn. Cao có 4 đèn và bloom. Cực cao 6 đèn (kế hoạch §8.1).

## 2. Bố cục: dòng từ trên mũi tàu

**Đã chọn theo đề xuất** của study C (phương án B). Số đo của study C (400 trận Node, khung Chrome ở hai cỡ):

| | Hôm nay | B |
|---|---|---|
| Mắt → đòn trúng, trung vị (720p / 1080p) | 355 / 533 px | 200 / 300 px |
| Đòn trong 5° (cửa sổ 720p) | 0,4 % | 46 % |
| Đòn trong 10° (toàn màn 1080p) | 3 % | 67 % |
| Che đòn trúng / lần hạ / quái / chỗ Lính bắn / đường đạn | 0 | 1,7 / 1,3 / 0,4 / 4,7 / 19 % |
| Che quái vùng gần (≤ 7 m) | 0 | 37 % (tấm 420 px); 23 % (tấm ôm từ) |

Cái giá là che quái vùng gần; §2.4 bù bằng dấu báo. Phương án A che 98 % vùng gần, C che 31 % đòn trúng.

### 2.1 Vị trí

| Phần | 1280×720 | 1920×1080 | Ghi chú |
|---|---|---|---|
| Dòng từ | Cao 56, đáy ở y 456 (~~472~~), giữa màn. Tấm ôm từ, đệm 16 px mỗi bên, rộng tối đa 420 | Cao 84, đáy ở y 684 (~~708~~), rộng tối đa 630 | ~~Ngay trên dải sọc vạch đáy (y 477–500). Đáy dòng = phép chiếu của mép trên dải sọc, trừ 5 px.~~ Từ lượt sửa sau test 27/10 (§11): đáy dòng = phép chiếu (`stage.project`) của sàn cách vạch đáy 1,8 m, trừ 4 px; lóe nòng, lưỡi lửa Tán và gốc tia hiện giữa mũi tàu và tấm. Không viết px cứng, để còn đúng nếu camera đổi |
| Bến 1, bến 2 | 230 × 100, y 508–608; x 236–466 và 814–1044 | 345 × 150, y 762–912; x 354–699 và 1221–1566 | Dưới vạch đỏ, không che nó. Phần sàn này có 0 mẫu quái, đòn, đường đạn trong 400 trận |
| Bến 3, bến 4 | 208 × 100, cùng hàng; x 16–224 và 1056–1264 | 312 × 150; x 24–336 và 1584–1896 | Mờ tới khi mở (như nay) |
| Tàu | Thân y ≈ 495–600, giữa bến 1 và bến 2 | | Khoảng trống giữa hai bến 348 px; tàu rộng ≈ 97 px |
| Đèn "SẠCH ×N" | Sát phải tấm dòng từ, cách 8 px, cao 22 | Cao 33 | §3.6 |

Bàn điều khiển cũ (y 590–708) thành sàn.

### 2.2 Nội dung và trạng thái

| Trạng thái | Dòng từ | Bến đang gõ |
|---|---|---|
| Chưa khóa từ | Ẩn (opacity 0) | Như nay: từ 32 px, nghĩa 15 px |
| Phím đầu khóa một bến | Tấm mở từ 90 % → 100 % bề ngang trong 80 ms, cùng hiệu ứng chữ đầu (§3.1) | Viền màu súng (đã có). ~~IPA 17 px · nghĩa 15 px trên một dòng~~ Từ 27/10 (§11): bến thành mục từ điển, từ 22 px kèm IPA 14 px, nghĩa 14 px tối đa 2 dòng |
| Đang gõ | Từ 42 px, Be Vietnam Pro 800. Phần đã gõ màu súng (`--gun`), phần còn lại `--text` #f4f1eb. Thiếu chữ: "_" như trên bến | Phần đã gõ màu súng. Sọc đầu bến đầy theo tỉ lệ đã gõ (§3.1) |
| Xong từ | "từ · nghĩa ✓" màu `--typing` #7ff5e0, 26 px, 600 ms (như khung học cũ). ~~Không vừa 420 px thì chỉ "từ ✓", nghĩa ở lại bến 600 ms~~ Từ 27/10 (§11): không vừa một dòng thì hai dòng, "từ ✓" 22 px trên nghĩa 17 px; nghĩa không bao giờ nằm ở bến dưới từ mới | Bến lóe (đã có `sv-load`, `sv-perfect`) |
| Bến đầy, không nạp | "từ ✓ · ĐẦY", chữ ĐẦY màu `--urgent` #ffb020 | Không lóe nạp; vạch băng chớp vàng (§3.4) |
| Luật Nghĩa (R2) | Nghĩa và các chữ đã gõ; từ đủ và IPA khi xong | |
| Từ chặn của boss (R3) | Hiện ở chỗ dòng từ, tấm đỏ | |

### 2.3 Tấm nền và tương phản

- Token mới trong `theme.css`: `--strip: rgba(7, 9, 11, 0.72)` cho dòng từ, `--bay-glass: rgba(7, 9, 11, 0.6)` cho bến.
- Lý do (study C §5.2): dòng từ cần tấm đặc ≥ 0,70 để giữ 7 : 1 khi tia Tia chạy ngay sau (nền p99 0,97). Bến cần ≥ 0,52–0,58. Tấm mỏng hơn hôm nay (0,97) nên chớp trúng và quái sau tấm vẫn lộ một phần.
- Sau bước F3 (đèn động, bloom mạnh hơn), đo lại nền p99 dưới dòng từ và dưới bến trên khung thật, ở cả hai cỡ (§7.3).

### 2.4 Dấu báo quái sau tấm

- Khi có quái vùng gần (z ≤ 7 m) mà hình chiếu nằm sau tấm dòng từ: viền dưới tấm hiện một vạch `--danger` #ff4a4a dài 24 px, cao 3 px, ở đúng cột x của quái.
- Vạch chớp 4 Hz cho tới khi quái ra khỏi tấm. Tối đa 6 vạch.
- Đọc vị trí từ `w.foes`, chỉ hiển thị.

### 2.5 Vùng cấm số sát thương

`protectedRects()` đọc hộp DOM của tấm dòng từ (khi hiện), các bến, thanh giáp, biển mục tiêu. Đích vẫn 0 lần đè. Study C ước 0,7–1,1 % số rơi vào dòng từ; số đó được dời lên như nay.

### 2.6 Phải sửa kèm (bước F1)

| Loại | Chỗ | Sửa |
|---|---|---|
| Tài liệu | `BUILD_S1.md` §3, §10 | Khung học 420 px giữa đáy → bảng §2.1 của file này |
| Tài liệu | `BUILD_S1.md` §12 | Pháo Sao "thụp cối", tiếng "bụp" → §4.3; Ray đường giữ 0,35 s; lưỡi lửa Tán 2,2 m |
| Tài liệu | `BUILD_S1.md` §16, §17 | Thêm kịch bản `survival-feel`; khoảng khung được chấm ở lượt này (§6) |
| Tài liệu | `SURVIVAL_MODE_PLAN.md` §4.1, §4.2, §6.2 | Tàu trôi ±1,6 m chỉ ở hình; bến hai bên tàu; dòng từ trên mũi tàu, IPA và nghĩa ở bến |
| Mã | Chú thích đầu `src/view/hud.ts`, `src/view/ship.ts` | Theo bố cục và chuyển động mới |
| Kịch bản | `survival-s1-loadout` | Đang kiểm khung học 420 px ở đáy |
| Kịch bản | `survival-s0-fight` | Đọc `.sv-learn` để đếm số đè |
| Kịch bản | `survival-s0-boot` | Đếm 4 vùng cấm (dòng từ ẩn khi chưa khóa); tương phản đo qua alpha với nền giả định → đo trên khung thật theo p99 |
| Kịch bản | `survival-s1-stage` | Vùng cấm có dòng từ |

## 3. Gõ

### 3.1 Mỗi chữ đúng (`EV.keyOk`: bến, chữ cái, số chữ đã gõ)

f0 = khung đầu tiên vẽ sau phím (đích §17: ≤ 1 khung sau phím).

| Khung | Dòng từ (DOM) | Sân (WebGL) |
|---|---|---|
| f0 | Chữ hiện ở chỗ của nó, cỡ 1,25×, lệch xuống 6 px, ~~màu trắng nóng #fff0d8~~ màu súng 65 % trên trắng nóng (27/10, §11), quầng chữ `0 0 14px var(--gun-glow)` và viền 4 px màu súng; vạch quét dài 40 % ngay từ f0; viền tấm lóe màu súng 3 f | 4 mảnh năng lượng (vệt `Strips` dài 0,25 m, rộng 0,06 m, lõi trắng, viền màu súng) rời điểm ngay dưới chữ (chiếu ngược đáy chữ lên mặt phẳng y 0,95 m) |
| f1–f2 | 1,12×, lệch 3 px. Vạch quét 2 px màu súng chạy dưới chữ, trái → phải, 50 ms | Mảnh bay xuống, nhanh dần, vào lõi tàu (socket `FX_CORE`; thiếu socket thì tâm thân tàu). Mỗi mảnh bay 70–100 ms, so le 0–25 ms |
| f3–f5 | 1,03× → 1×. Màu chuyển sang màu súng, xong ở 120 ms | Lõi nhận mảnh: sáng thêm 30 %, tắt dần trong 90 ms. Vòng sáng nằm trên sàn dưới tàu (`CELL.ring + FLAT`), bán kính 0,8 → 2,0 m, 150 ms, màu súng, alpha 0,55 |
| f6 | Chữ đứng yên ở 1×. Quầng chữ tắt hẳn ở 160 ms | Mảnh cuối vào lõi |

- **Bến đang gõ:** chữ vừa gõ đổi màu súng (đã có). Sọc đầu bến (`.sv-slot::before`, 5 px) đầy từ trái theo tỉ lệ đã gõ / độ dài: phần đầy đậm 1,0, phần còn lại 0,35. Không đóng dấu chữ lên bến.
- **Đồng hồ:** mọi hiệu ứng chữ chạy theo đồng hồ khung của trang (`now` truyền vào `hud.update`), không dùng CSS keyframes. Như vậy đồng hồ giữ (`__survival.hold/advance`) chụp đúng từng khung. Study B thấy CSS chạy lệch 0,3× dưới đồng hồ giữ.
- **Mật độ:** gõ 10 phím/s (120 WPM) thì có ≤ 2 vòng sàn và ≤ 8 mảnh sống cùng lúc.
- **Không bắn giả theo phím.** Phát bắn là của sim (giờ, đích, sát thương). Một phát chỉ có hình, không trúng gì, sẽ nhìn như bắn trượt. Nó cũng trái nguyên lý P4 của study A: mọi phát của sim đều thấy, không thêm phát trong view. Typing Break cũng không bắn theo phím (§0). Một phát có sát thương theo phím là đổi luật, nằm ngoài lượt này.

### 3.2 Lõi tàu: năng lượng của từ đang gõ

- Mức nạp L = số chữ đã gõ / độ dài từ (0…1) của bến đang khóa.
- Lõi vẽ ở `FX_CORE`: billboard `CELL.core`, bán kính 0,35 + 0,5·L m, cường độ 1,2 + 1,6·L (HDR; bloom bắt từ L ≈ 0,3), màu súng của bến đang gõ.
- Thả khóa (Backspace về 0): lõi tắt trong 200 ms.
- Ở L ≥ 0,5: nòng (`FX_MUZZLE`) có một tia lửa mồi nhỏ (`CELL.star4` 0,3 m, chớp 12 Hz), báo "súng sắp có đạn".
- Đang có băng khác bắn: lõi vẫn theo từ đang gõ (màu bến đang gõ), nòng theo súng đang bắn.

### 3.3 Phím sai (`EV.keyBad`)

| Loại | Dòng từ | Sân | Tiếng |
|---|---|---|---|
| Sai trong từ đang khóa (bến ≥ 0) | Chữ đáng gõ có gạch dưới 3 px màu `--danger` #ff4a4a và quầng đỏ, 220 ms. Viền tấm chớp đỏ 120 ms. Không rung, không đổi cỡ chữ. Thiếu chữ: chữ gợi ý hiện ra (sim) cùng gạch đỏ | Lõi tụt một nấc: cường độ −25 % trong 200 ms, chập chờn 3 f. 3 tia lửa `--danger` xì ra ở lõi | `key.bad` mới (§3.5) |
| Không bến nào bắt đầu bằng chữ đó (bến −1) | Chữ vừa gõ hiện mờ ở giữa dòng (42 px, `--danger`, alpha 0,6), tắt trong 250 ms. Chữ đầu của mọi từ đang có trên bến nảy 1,15× trong 200 ms, để người chơi thấy chữ nào gõ được | Không có | `key.bad`, nhỏ hơn 3 dB, không có nốt |

### 3.4 Gõ xong từ (`EV.word`, kèm `EV.load` nếu nạp được)

f0 = khung vẽ phím cuối.

| Khung | Dòng từ | Lõi, tàu, nòng | Bến |
|---|---|---|---|
| f0–f1 | Cả từ trắng nóng #fff0d8, 2 f | Lõi lóe: bán kính × 1,8, cường độ 4, 3 f. Một luồng năng lượng (vệt rộng 0,35 m, màu súng) chạy từ lõi tới nòng trong 3 f | Lóe nạp `sv-load` 350 ms (đã có); sọc đầu bến sáng đầy |
| f1–f2 | | Phát đầu của băng (sim) với lóe phát đầu (§4.2). Tàu lao lên 0,35 m (§5.2) | Vạch băng đầy (đã có) |
| f0–f9 | Vạch quét màu súng chạy dưới cả từ, trái → phải, 100 ms. Từ phồng 1 → 1,06 → 1 trong 160 ms | | |
| f3–f36 | "từ · nghĩa ✓" màu `--typing`, 600 ms, rồi tắt trong 120 ms. Khóa từ mới thì thay ngay | | |

- **Hoàn hảo** (sạch và nhanh): thêm vòng sàn màu `PALETTE.perfect` #9ffff2 quanh tàu, bán kính 1 → 3,5 m, 250 ms. Bến `sv-perfect` 500 ms (đã có).
- **Bến đầy** (`EV.word` không kèm `EV.load`; study B §0 điểm 1):
  - Không lóe lõi, không luồng năng lượng, không lóe nạp ở bến.
  - Mảnh của phím cuối văng ngang rồi tắt, không vào lõi.
  - Vạch băng của bến chớp `--urgent` 2 lần (120 ms sáng, 120 ms tắt).
  - Dòng từ hiện "từ ✓ · ĐẦY". Từ vẫn được tính là đã học.
  - Tiếng `word.full` (§3.5), không phát `word.load`.
- **Ray đang hồi** (study B: 0,69–0,74 s không có gì sau khi xong từ): ngay ở `EV.load` của bến Ray, model `frost-seraph-bolt` hiện ở nòng (§4.2, hàng Ray). Người chơi thấy "đã nạp" từ f0.

### 3.5 Thang âm phím và âm xong từ (Q6)

Nhạc của game ở La thứ (96 BPM, `THEME_SOUND_LIST.md` §2). Phím đi lên thang ngũ cung La thứ theo vị trí chữ trong từ. Xong từ về nốt gốc một quãng tám trên. Mỗi từ là một câu "tụ lực rồi xả".

| Chữ thứ | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Xong từ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Nốt | La3 | Đô4 | Rê4 | Mi4 | Sol4 | La4 | Đô5 | Rê5 | Mi5 | Sol5 | La5 |
| Hz | 220 | 261,6 | 293,7 | 329,6 | 392 | 440 | 523,3 | 587,3 | 659,3 | 784 | 880 |

| Id | Chuẩn bị | Phát | Thân | Đuôi | Mức |
|---|---|---|---|---|---|
| `key.ok` (sửa) | — (phím là phần chuẩn bị của từ) | Rơ-le thép như nay: nhiễu dải 2,7 kHz 12 ms + tách 3,3 kHz 18 ms (dải 1–4 kHz tắt ≤ 20 ms) | Nốt nạp ở cao độ của bảng: sin, bội âm lọc thấp 1 kHz, lên 4 ms, tắt 60 ms, −14 dB so với tiếng rơ-le | Cộng hưởng bàn thép ở nửa cao độ (< 600 Hz), 90 ms, −20 dB | Bus `keys` như nay; lệch ±3 % như nay |
| `key.bad` (sửa, Q6) | — | Rơ-le đóng không ăn: cùng tiếng tách, −6 dB, lọc thấp 1,2 kHz | Xì điện 25 ms (3 hạt tách, lọc cao 5 kHz, −18 dB); nốt của chữ trước tụt nửa cung rồi tắt trong 30 ms | Không | Thay tiếng đục 105 → 72 Hz |
| `word.load` (sửa) | Các phím của từ | Chốt khóa: nhiễu lọc cao 3,2 kHz, 20 ms (như nay) | Luồng năng lượng: răng cưa lọc, trượt từ nốt của phím cuối lên 880 Hz trong 90 ms; rồi cú đóng băng đạn 170 → 52 Hz và thép tấm (như nay) | Vang hành lang: nhiễu lọc thấp < 900 Hz + thép dầm 233 Hz, 350 ms, −10 dB | Bus `alerts`; nghe 20 lần không mệt |
| `word.perfect` (sửa) | Như trên | Như trên | Như trên, cộng tiếng rít nạp điện đi qua dải 1–4 kHz trong ≤ 60 ms và dừng trên 4 kHz. Nay: 620 → 1.900 Hz trong 220 ms, nằm trọn dải giọng đọc | Như trên + tách điện 6,5 kHz (như nay) | |
| `word.full` (mới) | — | Chốt va mà không khóa: tách kim loại 2,2 kHz, 15 ms | Lò xo rung 600–900 Hz, 80 ms | Không (chốt không ăn thì không có đuôi) | −6 dB so với `word.load` |
| `streak.up` (mới) | — | Hai tiếng gõ thanh thép nhỏ, La5 rồi Mi6 cách 60 ms; nốt gốc tắt ≤ 30 ms | Bội âm 5,3 và 7,9 kHz | Ngân trên 4 kHz, 200 ms | −12 dB so với `word.load`; chỉ ở mốc 3, 6, 10, 20 |

- Chuỗi sạch bậc 2 trở lên (§3.6): nốt nạp của `key.ok` thêm bội âm quãng tám, −12 dB.
- Âm phím không có đuôi dài, nên 8–10 phím/s chồng nhau vẫn không thành tiếng ù.

### 3.6 Chuỗi sạch (chỉ hiển thị)

- Đếm số từ gõ sạch liên tiếp (cờ `clean` của `EV.word`).
- Đặt lại về 0 ngay ở phím sai đầu tiên của một từ đang khóa. Phím lạc (bến −1) không đặt lại.
- Chuỗi gắn với luật thật đã có: băng sạch được chí mạng +4 % và gặp Vỏ × 0,75 (Trận thử thêm ×1,06). Chuỗi **không** thêm sát thương. Chuỗi kiểu kế hoạch §4.3 (cửa sổ 1,2 s, +6 % mỗi bậc) là luật sim: để S2.
- **Đèn:** "SẠCH ×N", Chakra Petch 700, 13 px, màu `--led` #ffb347, quầng `--led-glow`. Hiện từ N = 3. Mỗi lần tăng nảy 1,2 → 1 trong 160 ms.
- **Đứt:** đèn chuyển `--muted`, mờ hết trong 400 ms. Không tiếng phạt.

| Bậc | N | Thêm |
|---|---|---|
| 1 | 3–5 | 5 mảnh mỗi phím; vòng sàn × 1,15 |
| 2 | 6–9 | Bội âm quãng tám ở `key.ok`; lõi giữ sáng nền 0,2 giữa hai từ |
| 3 | 10–19 | Động cơ tàu sáng × 1,3; viền tấm dòng từ 1 px màu súng |
| 4 | ≥ 20 | Thêm vòng sàn màu `--typing` mỗi phím |

## 4. Súng

### 4.1 Luật chung

- **Nòng thật.** Mọi lóe nòng, vệt, tia đi ra từ socket của model tàu: Xung luân phiên `FX_MUZZLE_L` / `FX_MUZZLE_R`; Tán, Ray, Tia từ `FX_MUZZLE`; Pháo Sao từ `FX_CORE`, hướng lên. Khối giữ chỗ (không có socket) dùng công thức hiện tại, hai nòng Xung lệch ±0,45 m. `Ship.muzzle()` trả về vị trí socket thật.
- **Nhập đường sim.** Sim bắn mọi súng từ (0; 1,7) (`aim.ts:41`, `tan.ts:45`, `ray.ts:67`, `phao.ts:19`).
  - Đường vẽ = đường của sim + o × max(0, 1 − s / 3 m). o là nòng thật trừ nòng sim lúc bắn; s là quãng đã bay.
  - Ray và Tia vẽ thành đường gấp: nòng thật → điểm trên đường sim cách nòng 3 m → điểm cuối của sim.
  - Study C §2.2: p10 độ sâu của mọi đòn trúng là z 8 m (6,3 m từ nòng); của Tán, súng gần nhất, là z 6 m (4,3 m từ nòng). Vậy ≥ 90 % đòn trúng nằm ngoài đoạn nhập, và chỗ trúng vẽ đúng chỗ của sim.
- **Mọi phát của sim đều thấy.** Không bỏ vệt nào, không thêm phát nào.
- **Model đạn** từ thư viện Space (`/assets/space-typing/models/skills/`): mỗi cái 3.000 tam giác, có ảnh phát sáng, socket `FX_TRAIL`, dài 2 đơn vị. Một `InstancedMesh` mỗi loại; mũi theo vận tốc; phát sáng × 2,5 để bloom bắt. Quá trần số instance thì phát đó chỉ còn vệt (như nay). Bậc Thấp không vẽ model.
- **Quầng sáng trên sàn và quái.**
  - Kho đèn động: 4 `PointLight` ở bậc Cao (Vừa 2, Thấp 0, Cực cao 6). Tạo lúc dựng cảnh với cường độ 0: số đèn cố định, shader chỉ biên dịch một lần. Tầm 7 m, decay 2.
  - Thép và quái (MeshStandardMaterial) nhận đèn sẵn. Sàn là `ShaderMaterial` riêng: thêm mảng uniform 4 đèn (vị trí, bán kính, màu × cường độ) và cộng `màu × I × (1 − d/r)²`.
  - Hết đèn thì xếp ưu tiên: nổ Pháo Sao 5 > phát Ray 4 > loạt Tán 3 = phát đầu Xung 3 > Tia 2 > viên Xung 1. Đèn mới lấy chỗ có (ưu tiên × cường độ còn lại) thấp nhất.
  - 0 draw call thêm.
- **Bloom** (bậc Cao, Cực cao): UnrealBloom sức 0,6 → 0,85, bán kính 0,3 → 0,45, ngưỡng giữ 1,0 (chỉ thứ phát sáng HDR mới nở). Kiểm: độ sáng nền p50 dưới dòng từ tăng ≤ 0,02.
- Cỡ trên màn ghi theo % chiều cao màn (720 px: 4 % = 29 px). Người làm đổi ra mét theo phép chiếu. Kiểm đo trên khung (§7.3).

### 4.2 Hình theo súng

| Súng | Model / thân đạn | Lóe nòng | Vệt hoặc tia | Quầng sáng | Trúng | Hạ (khối, §4.5) |
|---|---|---|---|---|---|---|
| **Xung** (chương: 27 viên / 2,4 s; Trận thử: 24) | `vanguard-bolt` (lõi lam điện), dài 1,4 m (× 0,7), xoay 12 rad/s quanh trục; trần 32 instance | Sao 4 tia 0,5 → 1,1 m + quầng tròn bán kính 4 % (29 px), 3 f; màu `--xung` #3db8ff, lõi #fff0d8. **Phát đầu của băng:** 8 % (58 px), 4 f, thêm 6 tia lửa `--volt-hi` #a6e0ff | Vệt sau đầu đạn dài 3,7 m (0,08 s × 46 m/s; nay 2,3 m), rộng 0,18 m, lõi trắng 0,9 | Vũng sáng bán kính 1,8 m trên sàn, 2 f. Đèn ưu tiên 1: 1,0 → 0 trong 50 ms (phát đầu 2,0, 80 ms) | Sao 4 tia 0,45 → 1,1 m màu `--volt-hi`, 3 f; 4 tia lửa. Chí mạng: sao 8 tia `PALETTE.crit` #ffc23a. Hoàn hảo: sao 12 tia + vòng `PALETTE.perfect` (đã có, T3) | Bầy 7 khối; Lính 10 khối + phóng điện lam (đã có) |
| **Tia** (2,5 s, nhịp 0,1 s, 12 m) | Không model (tia). Lõi trắng nóng #fff0d8 rộng 0,22 m; quầng `--tia` #ff7a1f rộng 1,1 m, cường độ × 1,3; lớp mờ ngoài rộng 2,4 m, alpha 0,25 (mới) | Bật: lóe trắng bán kính 7 % (50 px), 3 f; tia mọc từ nòng tới cuối trong 3 f. Đang cháy: sao 8 tia quay ở nòng, 50 px (đã có) | Tắt: tia mảnh dần về 0 trong 6 f; vết cháy trên sàn ở lại 2,4 s (đã có) | Đèn ưu tiên 2 ở nòng: 1,6, giữ suốt lúc cháy. Đèn thứ hai trượt theo tia ở 60 % chiều dài: 1,0. Dải sáng trên sàn (đã có) | Mỗi nhịp: quái trong tia lóe trắng 2 f; sao 4 tia 0,4 → 0,95 m; tia lửa mỗi 2 lần trúng (đã có); số gộp theo 4 m (đã có) | Khối văng ngang theo hướng quét, 6–8 khối mỗi bầy |
| **Tán** (6 loạt / 2,3 s, 7 viên ±18°, 9 m) | `solar-lance-bolt` (vàng hổ phách) cho viên, dài 0,6 m (× 0,3); trần 28 instance | Quạt 3 lưỡi lửa dài 2,2 m (nay 1,6), rộng 0,6 m, 4 f, màu `--tan` #ffc53d. Quầng #fff0d8 bán kính 10 % (72 px), 4 f. Khói xám #58616b bay lên 1,5 m trong 0,5 s. 2 tia lửa vỏ đạn `--hot-hi` văng ngang | Vệt viên dài 2 m (0,05 s × 40 m/s; nay 1,4), rộng 0,16 m | Vũng sáng hình quạt: 3 vũng phẳng dọc quạt tới 3 m, 3 f. Đèn ưu tiên 3: 2,0 → 0 trong 80 ms | Sao 4 tia 0,3 → 0,9 m (đã có) + 3 tia lửa `--tan` theo hướng đẩy; quái bị đẩy (sim) và giật giả (kit) | Khối bay theo hướng đẩy, 4–6 m/s |
| **Ray** (3 phát / 2,4 s, nạp 0,15 s, xuyên ≤ 6, 30 m) | `frost-seraph-bolt` (trắng băng) hiện ở nòng khi bến có băng mà chưa nạp: dài 0,9 m (× 0,45), lơ lửng 0,25 m trên nòng, xoay 2 rad/s, phát sáng nhịp 2 Hz. Lúc nạp 150 ms: sáng × 3, thu vào nòng (cỡ 1 → 0,3); lõi co lại (đã có). Trần 2 instance | Vệt lóe dài 3,4 m, 5 f (nay 80 ms), màu `rayCore` #f2f7ff; sao 8 tia bán kính 12 % (86 px), 4 f | Đường thẳng tức thì: lõi 0,12 m #f2f7ff, quầng 0,5 m `--ray` #c4d2ff, giữ 0,35 s (nay 0,25) rồi mờ; vòng ion mỗi 3,2 m (đã có) | Đèn ưu tiên 4 ở nòng: 3,0 → 0 trong 100 ms. Dải sáng phẳng dọc đường, rộng 1,2 m, 0,3 s | Mỗi quái bị xuyên: sao 8 tia 0,6 → 2 m, 4 f; 6 tia lửa `rayCore` theo đường bắn (đã có). Vỏ chặn: tia lửa `clank` #ff9a2e + keng (đã có). Băng sạch xuyên Vỏ: vệt `pierce` (đã có) | Khối bắn dọc đường, 6–9 m/s |
| **Pháo Sao** (4 quả / 3 s, bay 0,7 s, nổ 2,5 m) | `crimson-talon-bolt` (đen viền đỏ) làm quả, dài 1,0 m (× 0,5), mũi theo tiếp tuyến vòng cung, xoay 8 rad/s quanh trục; vệt và quầng (đã có); trần 8 instance | Phóng: lóe hướng lên dài 2,5 m, 5 f, `--phao` #ff3f6c; lõi lóe 6 % (43 px), 3 f; cột khói 0,7 s (đã có) | Vòng cung parabol khớp giờ rơi của sim (đã có); vòng `--danger` chỗ rơi, siết dần (đã có) | Nổ: đèn ưu tiên 5 ở 1,5 m trên điểm nổ, 3,5 → 0 trong 120 ms; vũng sáng sàn bán kính 4 m | Nổ: lõi lóe bán kính 12 % (86 px) #fff0d8, sao 8 tia `--phao`, vòng sóng trên sàn tới 2,2 × bán kính, vết cháy (đã có); tia lửa 14 → 24, phun lên; quái trong vòng lóe 3 f | Khối văng tỏa tròn từ tâm nổ, lên 5–8 m/s: vòng cung cao nhất trong 5 súng |

| Biến thể | Khác gì |
|---|---|
| Trận thử (Xung 24 viên, Tia 6 mỗi nhịp) | Hình và tiếng như hàng Xung, Tia ở trên. Số viên do sim quyết định |
| Tàu Draconis | Xung dùng `dragon-fireball` (4.000 tam giác), dài 1,2 m, vệt lửa (đã có), lóe nòng màu `PALETTE.hot`. Tia thành luồng lửa #ff5a1f (`PILOT_COLORS`) |

Chọn model theo màu súng, trên ảnh gốc 2D của chúng (`games/space-typing/art-src/projectiles/`, đã xem ở `tmp/mac-2026-10-26/feel/spec/projectiles-2d.jpg`): `01 vanguard` lõi lam, `03 solar-lance` vàng, `05 crimson-talon` đen viền đỏ, `06 frost-seraph` trắng băng. Bước F3 xem lại màu thật của GLB trong khung đầu tiên; lệch màu thì nhân màu phát sáng theo token của súng.

### 4.3 Tiếng theo súng (Q6)

| Id | Khi nào | Chuẩn bị | Phát | Thân | Đuôi (hành lang thép) |
|---|---|---|---|---|---|
| `gun.xung` (sửa) | **Mỗi viên** (nay mỗi 2 viên) | Viên đầu: tiếng khóa nòng 15 ms | Tiếng nổ giòn lọc cao 1,9 kHz, 35 ms | Cú đấm 150 → 46 Hz: viên đầu 90 ms; viên sau 70 ms, −3 dB | Không ở từng viên |
| `gun.xung.tail` (mới) | Viên đầu của băng, rồi mỗi 0,5 s khi còn bắn, và sau viên cuối | — | — | — | Vỗ hành lang: nhiễu lọc thấp < 900 Hz, 350–450 ms |
| `gun.tia.start` (giữ) | Tia bật | Máy phát quay lên | Hồ quang bắt | Ù 55 Hz (như nay) | Ngắn |
| `gun.tia.loop` (mới) | Suốt lúc tia cháy | — | — | Ù hồ quang 55 Hz + lớp tách điện dải 5–7 kHz, lặp, −4 dB so với `start` | Dừng khi có `gun.tia.end` |
| `gun.tia.end` (sửa) | Tia tắt | — | — | Hạ điện (như nay) | Thêm vang < 1 kHz, 300 ms |
| `gun.tan.fire` (kiểm Q6) | Mỗi loạt | — | Tiếng nổ thép đanh, lọc cao | 120 → 40 Hz, 120 ms | Vỗ hành lang + vỏ đạn leng keng > 4 kHz, 250 ms |
| `gun.ray.armed` (mới) | Bến Ray có băng mà chưa nạp (model hiện ở nòng) | — | — | Ù tụ điện nhỏ < 400 Hz + lấp lánh > 5 kHz, lặp, −15 dB | Tắt khi có `gun.ray.charge` |
| `gun.ray.charge` (giữ) | Nạp 150 ms | Rít tụ điện đi lên, dừng gọn ở đỉnh | — | — | — |
| `gun.ray.fire` (kiểm Q6) | Phát | — | Tiếng nổ đanh | Tiếng xé điện 120 ms | Vang hành lang 0,5 s, < 1 kHz |
| `gun.phao.launch` (sửa, Q6) | Phóng quả | Tiếng khóa nòng 20 ms | Tiếng phóng giòn (không "bụp") | Tiếng rít tên lửa ở 4–8 kHz + rền < 300 Hz, 400 ms | Ngắn, < 1 kHz |
| `gun.phao.burst` (kiểm Q6) | Quả nổ | — | Tiếng nổ giòn | Nổ trầm 60–200 Hz, 250 ms + mảnh lách tách | Vang < 1 kHz, 600 ms. Nổ liền nhau cách 40–70 ms: mỗi tiếng cao hơn nửa cung; tối đa 4 tiếng / 120 ms (như nay) |

Tiếng trúng và hạ giữ cách gom hiện tại:
- Trúng gom 38 ms rồi phát một tiếng theo bậc (`hit.t1`, `hit.t2`, `hit.t4`); Vỏ chặn phát `hit.armour`.
- Hạ phát `kill.swarm` / `kill.elite`, leo thang ngũ cung khi hạ liên tục (đã có).
- Ray trúng ở bậc T2 (`hit.t2`). Với quái trong vòng nổ Pháo Sao, `gun.phao.burst` thay tiếng trúng: một tiếng, không chồng.

### 4.4 Trúng: lóe, số

- **Lóe trắng cả thân** (thuộc tính instanced, `Reactions` của kit): số khung theo bậc T1 2, T2 3, T3 4, T4 5, T5 6 (nay 1, 2, 3, 4, 4).
- Làm bằng một hồ sơ phản hồi riêng của game trong `src/view/` (`{ ...SHIP, tiers: … }`), truyền vào `Reactions`, `NumberField`, `HitStop`, `Debris`. Các module này đã nhận hồ sơ, nên không sửa kit.
- **Số sát thương:**
  - Cỡ gốc `chiều cao màn / 30`, kẹp 18–36 px: 720p 24 px (nay 21), 1080p 36 px (nay 30).
  - Nảy T1 1,25, T2 1,4, T3 1,6, T4 1,7, T5 1,9, rồi về 1× trong ≈ 140 ms.
  - Sống T1 0,55 s, T2 0,7, T3 0,9, T4 1,0, T5 1,2.
  - Phát hạ quái: số to thêm 15 %.
  - Gộp như nay (150 ms một đích, nhịp 0,3 s). Trần 160 số ở bậc Cao.
- Quái chết: giữ lóe trắng 3 f rồi ẩn. Khối vỡ sinh ở f1 của lần hạ.

### 4.5 Hạ: khối vỡ bay vòng cung

Hệ khối mới ở phía game (`src/view/chunks.ts`), không sửa kit. `Debris` của kit giữ cho kính khiên.

| Quái | Khối | Cỡ | Màu |
|---|---|---|---|
| Bầy | 7 (5–8) | 0,18–0,35 m | Thân thép tối `PALETTE.steelDark` #14181c; mép phát sáng `shardHot` #ff9448, nguội về `shardSteel` #6f7c88 trong 1,2 s |
| Lính | 10 | 0,2–0,45 m | Mép `--volt-hi` #a6e0ff |
| Tách / mảnh Tách | 6 / 3 | 0,15–0,3 m | Như bầy |
| Trâu | 14 + 3 khối lớn | 0,25–0,45 m; khối lớn 0,6–0,8 m | Như bầy |
| Đầu Đàn | 18 + 5 khối lớn | như Trâu | Mép `beacon` #ffcf4a |
| Bọc Thép | như loại gốc | | Mép `armour` #ffd27a |
| Khiên | 10 + kính lam 22 (kính đã có) | | |

- **Cụm:** nhiều con chết cùng ô 3 m trong một khung thành một cụm; số khối = min(48, khối của loại × √N) (luật √N đã có).
- **Chuyển động:**
  - Vận tốc đầu: lên 3–6 m/s (Pháo Sao 5–8), ngang 2–5 m/s theo hướng đòn ± 60°.
  - Trọng lực 14 m/s² (nặng hơn 9,8 để vòng cung gọn). Xoay 6–14 rad/s.
  - Nảy một lần (hệ số 0,3, ma sát 0,6), rồi nằm.
  - Vòng cung 0,45–0,9 s: trên tờ khung 33 ms thấy ≥ 3 khung đi lên và ≥ 3 khung đi xuống.
- **Nằm** 8 s rồi chìm 0,7 s (hồ sơ `ship`, kế hoạch §5.5). Trần: Thấp 150, Vừa 400, Cao 900, Cực cao 1.400. Hết chỗ thì thu khối đã nằm lâu nhất.
- **Bóng:** một quad phẳng tối (#000, alpha 0,35) dưới mỗi khối, bán kính 1,3 × khối, nhạt dần theo độ cao (alpha × (1 − y / 2 m)). Một `InstancedMesh`, hòa trộn thường.
- **Hình khối** là hiệu ứng (như mảnh của kit hiện nay), dựng bằng mã: 3 dạng mảnh nhiều mặt, mỗi dạng 8–20 tam giác. Không dựng quái hay đồ vật bằng mã (BUILD_S1 §3).
- Draw call: 2 (khối, bóng).

### 4.6 Rung camera và dừng hình

Study A: Typing Break không rung, không zoom, không dừng hình. Lực đến từ ánh sáng, lóe trắng, tia lửa, mảnh, chữ. Tuyến Cuối giữ rung nhỏ.

| Nguồn | Cú đẩy (px ở 1080p, ngược hướng bắn) | Trauma thêm | Dừng hình | Hôm nay |
|---|---|---|---|---|
| Viên Xung | 0 | 0 | 0 | Đẩy 2 px mỗi viên: rung liên tục ở 10–11 viên/s |
| Phát đầu của băng Xung | 1,5 | 0 | 0 | |
| Tia (mỗi lần trúng) | 0 | 0 | 0 | 0,006 mỗi lần trúng: ≈ 1,5 px rung đều khi tia cắt 10 quái |
| Loạt Tán | 3 | 0 | 0 | 3 px (giữ) |
| Phát Ray | 4 | 0,08, một lần mỗi phát | 12 ms, cách ≥ 300 ms (T2, đã có) | Đẩy 2 px |
| Pháo Sao phóng / nổ | 0 / 0 | 0 / 0,05 | 0 | Giữ |
| Hạ ≥ 4 con hoặc Lính | ≤ 5, cách ≥ 220 ms (đã có) | ≤ 0,2 (đã có) | Lính: T2 (đã có) | Giữ |
| Hạ Trâu, Đầu Đàn; vỡ khiên | — | T3 / T4 (đã có) | 35 / 45 ms (đã có) | Giữ |
| Quét ≥ 30 con trong 0,5 s | — | — | 25 ms, nghỉ 1,5 s (kit, đã có) | Giữ |

Đích: độ lệch camera p95 ≤ 3 px, tối đa ≤ 8 px ở 1080p trong một ải R1 (chưa có boss). Rung lớn nhất (14 px) để dành cho T5 (R3).

## 5. Tàu

Mọi chuyển động dưới đây chỉ ở hình. Sim giữ tàu và nòng ở (0; 1,7).

### 5.1 Ngắm và xoay

- Đích ngắm: bến có đòn nặng nhất trong 300 ms gần nhất (Ray nạp > Pháo Sao phóng > Tán > Xung > Tia). Dùng hướng ngắm sim đã ghi (`G.aimX/aimZ`, điểm của `EV.charge`, `EV.launch`).
- Xoay cả thân, tối đa ±50° (±0,87 rad; nay ±0,9). Lò xo ζ 0,7, tốc góc ≤ 7 rad/s: hơi vượt rồi về, nên tàu "chộp" vào đích của Ray.
- Khi bắn Xung, thân lắc ±0,6° theo nòng trái phải.

### 5.2 Giật lùi theo súng, lao lên khi nạp

| Lúc | Dời (m) | Chúc / ngửa | Về lại |
|---|---|---|---|
| Viên Xung | Lùi 0,05 | Ngửa 1,2° | 80 ms |
| Loạt Tán | Lùi 0,28 (BUILD_S1 §12: 0,25) | Ngửa 4° | 180 ms |
| Ray nạp 150 ms | Rung 0,015 m ở 30 Hz, hạ 0,04 | | |
| Phát Ray | Lùi 0,4 | Ngửa 5° | 260 ms |
| Pháo Sao phóng | Hạ 0,08 | Chúc 3° | 220 ms |
| Tia đang cháy | Lùi 0,06 giữ suốt; rung 0,02 m ở 12 Hz | | 150 ms sau khi tắt |
| Nạp băng (`EV.load`) | **Lao lên 0,35** trong 120 ms | Chúc 3° | 600 ms |
| Tàu bị đánh | Như nay (`hero.hurt`) | | |

Mũi tàu không vượt z 2,1 m: vạch đáy ở 2,4 m, đáy dòng từ ứng với z ≈ 2,6 m (study C §6).

### 5.3 Trôi về phía quái đến

- **Điểm hiểm:** x_h = Σ wᵢ·xᵢ / Σ wᵢ trên mọi quái sống có z ≤ 16 m, với wᵢ = (1 − zᵢ/16)² × (3 nếu là quái to) × (2 nếu là Đầu Đàn).
- **Đích của tàu:** x_t = kẹp(0,25 × x_h; −1,6; 1,6) m khi Σw ≥ 0,5; không thì 0.
- **Lò xo bậc hai:** ω 2,6 rad/s, ζ 0,85 (tới 90 % sau ≈ 1 s), tốc ngang ≤ 2,4 m/s. Nghiêng thân −kẹp(vₓ × 7°; ±14°).
- **Không có quái gần:** trôi lững lờ ±0,25 m, chu kỳ 6,7 s (0,15 Hz).
- **Vì sao ±1,6 m:** ở z = 0 là ±58 px; khoảng trống giữa hai bến cho ±125 px (study C §6). Giới hạn nhỏ giữ đường nhập (§4.1) ngắn, nên chỗ trúng vẽ đúng.

### 5.4 Lơ lửng và động cơ

- Nhấp nhô 0,07 m ở 0,55 Hz; lăn ±1,5° ở 0,37 Hz; chúc ±1° ở 0,43 Hz. Ba tần số lệch nhau, nên không lặp đều.
- Động cơ ở `FX_ENGINE_L/R(/C)`: quầng 0,35 m, alpha 0,7, chập chờn ±10 % ở 18 Hz, màu `--xung` (Draconis: `PALETTE.ember`).
- Khi tốc ngang > 0,5 m/s, khi lao lên, khi giật lùi: quầng × 1,6, vệt lửa dài 0,6 → 1,4 m về phía camera. Dải đuôi động cơ (đã có) giữ nguyên.

### 5.5 Vì sao không cho tàu di chuyển thật trong sim

Cho tàu dời trong sim là đổi luật:

- Tầm và góc của súng tính từ x = 0: nón 50° của Xung, quạt ±18° và tầm 9 m của Tán, đường xuyên của Ray, điểm rơi của Pháo Sao. Bảng khắc chế `COUNTERS` (cổng G3m) đo từ đó.
- Bot gõ qua `installKeys` không biết tàu dời. 152 trận chương và vết vàng Trận thử sẽ băm khác.
- Phải chạy lại báo cáo 100 seed trên hai bộ seed (12–15 phút mỗi bộ), G3, G3m, G3c, và chỉnh lại B1, B7 đang trượt.

Lượt này không làm. Nếu chủ dự án muốn tàu dời thật (ví dụ thành một lựa chọn chiến thuật), cần một đặc tả riêng kèm số cân bằng.

## 6. Ngân sách

Đo trên khe GPU (`heavy.sh --gpu`; một lần đo hiệu năng giữ cả khe), Apple M4, bậc Cao, khóa 60 Hz, ở cả 1280×720 và 1920×1080.

| Đo | Đích | Hôm nay (26/10) |
|---|---|---|
| Khung JS, đỉnh ~150 quái, 2 bến (§17 hàng 1) | TB ≤ 6 ms, p95 ≤ 10 ms. So với trước lượt này trên cùng cảnh: TB tăng ≤ 1,0 ms, p95 tăng ≤ 2,0 ms | TB 0,59–1,03 ms, p95 1,1–1,9 ms |
| `flood(700)` (§17 hàng 2) | p95 ≤ 14 ms | p95 1,5–3,2 ms |
| Khoảng khung (cái màn hình hiện). **Chấm ở lượt này**, vì hiệu ứng tốn GPU mà không hiện trong thời gian JS | p95 ≤ 16,8 ms; khung lỡ nhịp ≤ 1 % | p95 16,7–16,8 ms; 0 lỡ nhịp |
| Draw call (§17) | ≤ 160; đích của lượt này ≤ 60 | 38–40 |
| Draw call thêm | Model đạn 4 (Xung, Tán, Ray, Pháo Sao), khối 1, bóng 1. Mảnh chữ, lõi, động cơ, đèn: 0 | |
| Tam giác | Thêm ≤ 250.000 lúc đỉnh. Trần instance Xung 32, Tán 28, Pháo 8, Ray 2: tối đa 70 × 3.000 = 210.000 | Đo mốc ở F0 |
| Chương trình shader | Không đổi sau 5 s đầu trận (số đèn cố định) | 28–29 |
| Phím tới hình (§17) | ≤ 1 khung (cách đọc của R1: p95 ≤ 18 ms). Chữ bật lên phải nằm trong chính khung đó | p95 17,1–17,8 ms |
| Phím tới đạn (§17) | ≤ 50 ms (≤ 70 ms khi đang dừng hình) | p95 18–20 ms, tối đa 32 ms |
| Kho hiệu ứng lúc đỉnh | Tia lửa ≤ 2.000 / 3.000; billboard ≤ 340 / 400; khối ≤ 800 / 900; số ≤ 120 / 160; đèn ≤ 4. Không mất hiệu ứng T3 trở lên vì đầy kho | Billboard 87–98, tia lửa 22–188, mảnh 211–331, số 0–7 |
| Hiệu ứng theo phím ở 10 phím/s | ≤ 12 billboard và vệt sống | 0 |
| Rung camera (§4.6) | p95 ≤ 3 px, tối đa ≤ 8 px ở 1080p | Đo mốc ở F0 |
| Bộ nhớ, 10 phút trận | Heap sau GC tăng ≤ 5 MB. Số geometry, texture không đổi sau khi model đạn nạp xong | |
| Bước sim | Không đổi (lượt này không sửa sim) | 0,88–0,91 ms |

`window.__survival.info()` thêm các trường: `bolts` (số instance mỗi loại), `chunks`, `lights` (đèn đang sáng), `shards`, `shake` (px hiện tại).

## 7. Kiểm (người phản biện chạy được)

Dev server riêng (cổng của workflow, hoặc 3007), `URL=http://127.0.0.1:<cổng>/`, Chrome qua `heavy.sh --gpu`. Bằng chứng để ở `tmp/<ngày>/feel/<bước>/` (không vào Git).

### 7.1 Sim không đổi

1. **Không sửa file sim:** `git diff --name-only <cha của commit mã đầu tiên>..HEAD -- src/sim src/content src/kit src/app/input.ts src/app/session.ts src/app/skill.ts` in ra rỗng.
2. **`pnpm check` đạt**, gồm vết vàng Trận thử `tests/s0-trace.test.ts` (18 trận: 6 seed × 3 bot).
3. **152 trận chương băm như cũ:** `node --import tsx scripts/chapter-hashes.ts > after.txt` trên HEAD và trên commit cha (một `git worktree` tạm), rồi `diff` phải rỗng. Chạy qua `heavy.sh`. Bước F0 chép `tmp/mac-2026-10-25/scripts/hashes.ts` (10 bộ súng × 4 ải × 3 seed với bot Chuẩn, cộng súng tự chọn của 4 bot × 4 ải × 2 seed) vào `scripts/chapter-hashes.ts`, sửa đường nhập, để ai cũng chạy được.
4. **Replay trình duyệt khớp:** `survival-s1-stage` ở cả hai cỡ; trận trình duyệt chạy lại trong Node ra cùng mã băm.

### 7.2 Chuỗi khung

Kịch bản mới `scripts/visual/scenarios/survival-feel.mjs`, mỗi cảnh ở 1280×720 và 1920×1080.

- Cảnh có `place` (lệnh có ghi log, như `survival-s1-guns`) chỉ dùng để chụp.
- Chụp trên đồng hồ giữ `__survival.hold/advance`, trừ F9.
- Ghép tờ khung bằng `magick montage`, nhãn là số khung, ms, phím. Trên macOS cần `-font /System/Library/Fonts/Supplemental/Arial.ttf`; thiếu thì magick báo lỗi phông và bỏ nhãn.
- Mỗi cảnh ghi `meta.json`: tick, phím, `info()` mỗi khung, hộp DOM.

| Cảnh | Trang | Chụp | Tờ khung phải thấy |
|---|---|---|---|
| F1 · Từng chữ | Trận thử `?seed=1`; gõ một từ Xung vào bến rảnh, 150 ms một phím | 16,7 ms, 12 khung quanh mỗi phím 2–4 | Chữ 1,25× ở f0, đứng yên ở f6; mảnh bay xuống lõi f1–f6; vòng sàn dưới tàu; lõi sáng hơn sau mỗi phím |
| F2 · Phím sai | Như F1, một phím sai ở chữ 3; một phím lạc khi chưa khóa | 16,7 ms, 10 khung | Gạch đỏ dưới chữ đáng gõ; lõi tụt, tia lửa đỏ; chữ lạc mờ đỏ rồi tắt; chữ đầu các bến nảy |
| F3 · Xong từ | Như F1, phím cuối | 16,7 ms, 24 khung | Từ trắng 2 f; vạch quét; lõi lóe; luồng lõi → nòng; phát đầu có lóe 8 %; tàu lao lên; "từ · nghĩa ✓" |
| F4 · Bến đầy | Bến Xung đã có 2 băng, gõ thêm một từ | 16,7 ms, 20 khung | Không lóe nạp; vạch băng chớp vàng; "ĐẦY" |
| F5 · Mỗi súng | `?seed=3&stage=c1-s1&director=0`, một súng mỗi lượt (`guns=xung,tia`, `tan,xung`, `ray,xung`, `phao,xung`), cụm 12 bầy đặt sẵn như `survival-s1-guns` | 33 ms, 24 khung quanh một băng (Pháo Sao 32) | Model đạn; lóe nòng; vệt hoặc tia; vũng sáng trên sàn, quái gần sáng lên; quái lóe trắng ≥ 2 khung; số 24 px; Ray: model ở nòng suốt lúc chờ hồi |
| F6 · Hạ | Như F5, Pháo Sao và Ray vào một Trâu và một cụm bầy | 33 ms, 40 khung; thêm 1 khung ở +6 s | Khối bay lên ≥ 3 khung rồi rơi ≥ 3 khung; có bóng; ở +6 s còn ≥ 50 % khối nằm trên sàn |
| F7 · Tàu trôi | `c1-s1`; đặt 10 bầy ở x = +8 m, z = 12 m | 50 ms, 60 khung (3 s); rồi 2 s rảnh ở 100 ms | Tàu dời sang phải và nghiêng; động cơ sáng hơn khi dời; lúc rảnh có nhấp nhô |
| F8 · Đỉnh tràn thật | Ải 1 và ải 4, gõ 40 WPM trên đồng hồ giữ (cách của study C) | 40 ms, 30 khung lúc yên và 30 khung lúc tràn | Dòng từ đọc rõ giữa trận; vạch đỏ dưới tấm khi có quái sau tấm; không số nào đè dòng từ |
| F9 · Thời gian thật | Mỗi súng một từ, CDP screencast | 17 ms, 2,6 s | Như F1, F3, F5 nhưng ở nhịp thật: kiểm hiệu ứng DOM chạy theo đồng hồ khung (§3.1) |

Boss (đòn lớn) chưa có ở R1: thêm cảnh khi làm R3.

### 7.3 Số đo tự động (kịch bản tự chấm)

| Kiểm | Đích | Mốc hôm nay |
|---|---|---|
| Đổi ảnh theo phím (MAE 0–255, cách `keydiff.py` của study B), vùng tấm dòng từ ± 80 px và hộp tàu | Khung sau phím ≥ 2 × trung vị khung giữa hai phím, ở ≥ 9/10 phím | ≈ 1× (sân 2,6–5,6 so với 2,6–6,7) |
| Đổi ảnh HUD sau phím | ≥ 3,0 | 0,4–0,9 |
| Cỡ chữ vừa gõ (hộp DOM) | f0–f1: cao ≥ 1,2 × lúc đứng; f7: bằng lúc đứng ± 1 px | Không đổi cỡ |
| Lõi khi xong từ | Độ sáng tối đa ≥ 0,95 trong hộp 40 px quanh `FX_CORE`, f0–f2 | Không có lõi |
| Lóe nòng | Bán kính vùng sáng > 0,8 quanh nòng ≥ 80 % đích của §4.2 | Xung ~30–50 px |
| Vũng sáng | Độ sáng sàn trung bình trong 1,5 m quanh nòng tăng ≥ 0,08 ở khung bắn so với khung trước | 0 |
| Model đạn | `info().bolts` > 0 khi súng có model đang bắn; đầu đạn Xung ≥ 20 × 6 px ở 720p khi cách 4–10 m | 0 |
| Khối | `info().chunks` ≥ số của §4.5 sau một lần hạ; một khối theo dõi được đi lên ≥ 3 khung rồi xuống | Vụn dẹt |
| Tàu trôi (F7) | Dời ≥ 40 px (720p) về phía cụm trong 1,5 s; về cách tâm ≤ 10 px trong 2,5 s sau khi cụm chết; nhấp nhô 2–5 px | 0 px |
| Mắt → đòn (F8; tâm dòng từ tới chỗ số sát thương sinh ra, như study B) | Trung vị ≤ 210 px ở 720p; ≥ 60 % trong 10° khi toàn màn 1080p (1° ≈ 37,9 px CSS) | 355 px; 3 % |
| Bố cục | Đáy dòng từ ≤ y vạch đáy − 4 px, mọi nòng thấp hơn đáy dòng ≥ 20 px; đỉnh dòng cách mép tầm Xung (z 11,7 m) ≥ ~~90~~ 70 px (27/10, §11); bến không đè vạch đỏ; không phần tử nào tràn (`scrollWidth ≤ clientWidth`) với 3 băng; ở cả hai cỡ | |
| Tương phản | ≥ 7 : 1 ở nền p99 dưới dòng từ và dưới bến, trên 400 khung thật mỗi cỡ (cách `contrast.mjs` của study C) | |
| Số đè | 0 số đè dòng từ, bến, thanh giáp, biển mục tiêu | 0 |
| Kho, rung, draw call | Như §6 | |
| Lỗi | 0 lỗi console, 0 ngoại lệ | 0 |

### 7.4 §17

`survival-s1-perf` và `survival-s1-latency` chạy lại sau F3 và sau F6, mỗi lần 3 lượt mỗi cỡ, trên khe GPU riêng. Số ghi vào bảng §6, cạnh số trước lượt này.

### 7.5 Âm

- Mỗi id mới (`word.full`, `streak.up`, `gun.xung.tail`, `gun.tia.loop`, `gun.ray.armed`) có mục và prompt trong `THEME_SOUND_LIST.md` (test `tests/theme.test.ts` kiểm). Thẻ spec Audio Lab ở repo cha (`tools/audio-lab/specs/typing-survival/`) là việc của repo cha.
- Mỗi âm mới hoặc sửa ghi đủ bốn phần như §3.5, §4.3.
- Kiểm dải giọng đọc trong Chrome (Node không có Web Audio): dựng từng âm bằng `src/audio/synth.ts` trong một `OfflineAudioContext`; năng lượng 1–4 kHz sau 30 ms phải ≤ −20 dB so với đỉnh. Áp cho `key.ok`, `key.bad`, `word.load`, `word.perfect`, `streak.up`, `gun.phao.launch`.
- Nghe: ghi 5 phút gõ liên tục ở 40 và 70 WPM (MediaRecorder trên bus chính) để chủ dự án nghe. Không commit file ghi âm.

### 7.6 Chủ dự án chơi thử (sau F6)

1. Gõ chậm một từ vào bến rảnh: mỗi chữ có thấy và nghe "nạp" không?
2. Mắt ở dòng chữ có thấy đạn trúng quái không? Bến hai bên tàu có dễ liếc không?
3. Từng súng có "nặng" và đẹp không? Ánh sáng trên sàn có rõ không?
4. Tàu có sống không, có theo hướng quái không, có làm rối mắt không?
5. Âm phím và âm xong từ sau 5 phút: có mệt không, có rẻ tiền không?
6. "SẠCH ×N" có làm muốn gõ sạch hơn không?

## 8. Thứ tự làm và commit

- Mỗi bước: commit nhỏ, tiêu đề tiếng Anh như log của repo, kết bằng dòng `Co-Authored-By`.
- Trước khi đẩy: `pnpm check`, §7.1, chuỗi khung của bước đó.
- Mỗi đợt có changelog `docs/changelog/<ngày>-feel-*.md`.
- Pha kiểm chia 3–4 người kiểm song song (tĩnh, trình duyệt × 2, hiệu năng), rồi một bước gộp.

| Bước | Việc | Kiểm của bước |
|---|---|---|
| F0 | `scripts/chapter-hashes.ts`; kịch bản `survival-feel.mjs` (khung, MAE, hộp DOM); `info()` thêm trường; đo mốc trước khi đổi gì (băm, §17, tam giác, rung, F1–F9 của bản hiện tại) | Mốc lưu ở `tmp/` |
| F1 | Bố cục (§2): dòng từ, bến hai bên tàu, token `--strip`, `--bay-glass`, dấu báo quái sau tấm; các sửa của §2.6 | Bố cục, tương phản, mắt → đòn, số đè; F8 |
| F2 | Gõ (§3): chữ, mảnh, lõi, phím sai, xong từ, bến đầy, Ray đã nạp, chuỗi sạch; âm §3.5 | F1–F4, F9; MAE; phím tới hình |
| F3 | Súng (§4.1–§4.4, §4.6): model đạn, nòng thật, đường nhập, đèn, bloom, lóe, số, rung; âm §4.3 | F5, F9; §17; kho; rung |
| F4 | Khối vỡ (§4.5) | F6; kho; bộ nhớ |
| F5 | Tàu (§5) | F7; chạy lại F5 (đường nhập) |
| F6 | Đo lại toàn bộ §6, §7; changelog; `AGENTS.md`; mời chủ dự án chơi (§7.6) | Tất cả |

## 9. Rủi ro

| Rủi ro | Dấu hiệu | Giảm |
|---|---|---|
| Hiệu ứng cộng sáng chồng nhiều lớp làm GPU trễ, dù thời gian JS thấp | Khoảng khung p95 > 16,8 ms ở 1080p | Chấm khoảng khung (§6); trần kho; bậc Vừa bỏ lớp mờ ngoài của Tia và vũng sáng của viên Xung |
| Quá nhiều thứ động quanh mắt làm khó đọc chữ | Chủ dự án thấy rối; tương phản < 7 : 1 | Hiệu ứng chữ ≤ 100 ms rồi đứng; mảnh bay xuống, không qua chữ; tấm đặc 0,72 |
| Model đạn 3.000 tam giác quá nặng khi bắn dày | Tam giác vượt ngân sách | Trần instance; bậc Thấp không model; cần thì chỉ vẽ model cho đạn trong 14 m đầu |
| Tàu trôi gây chóng mặt hoặc làm lệch đường đạn | Chủ dự án khó chịu; chỗ trúng vẽ lệch | ±1,6 m, lò xo êm; "giảm chuyển động" tắt trôi; đường nhập 3 m |
| Âm phím 8–10 nốt/s gây mệt | Chủ dự án tắt tiếng | Nốt −14 dB, không đuôi dài; thang ngũ cung hợp nhạc; nghe thử 5 phút (§7.5) |
| Lỡ đụng sim khi sửa view | Băm đổi | Danh sách file cấm (§1.1); §7.1 sau mỗi bước |
| Lane cân bằng sửa `src/content` cùng lúc | Xung đột khi rebase | Lượt này không sửa `src/content`; chạy lại §7.1 trên commit cha mới sau rebase |
| Hiệu ứng DOM lệch nhịp khi chụp bằng đồng hồ giữ | Tờ khung không khớp thời gian | Chạy theo đồng hồ khung (§3.1); thêm F9 thời gian thật |

## 10. Đã chọn theo đề xuất (chủ dự án đổi được)

Theo luật của chủ dự án (`docs/CLAUDE_PROCESS_2026-10-24.md` §2 ở repo cha), các điểm sau làm theo đề xuất của ba bản nghiên cứu, **đã chọn theo đề xuất**:

1. Bố cục B của study C (dòng từ trên mũi tàu, bến hai bên tàu), không phải A hay C.
2. Mỗi chữ "nạp" vào lõi tàu, không bắn một phát giả mỗi chữ.
3. Tàu trôi ±1,6 m chỉ ở hình; sim giữ x = 0.
4. Chuỗi sạch chỉ hiển thị, không thêm sát thương. Chuỗi có sát thương (kế hoạch §4.3) để S2.
5. Khối vỡ nằm 8 s (kế hoạch §5.5), không 3–6 s như video.
6. Rung camera giữ nhỏ (§4.6); lực đến từ ánh sáng, lóe, khối vỡ.

## 11. Đổi ở lượt sửa sau đợt test 27/10 (chủ dự án xem ở §7.6)

Đợt test chia theo màn 27/10 (ba người, changelog [`2026-10-27-test-pass.md`](changelog/2026-10-27-test-pass.md)) đặt khung của ta cạnh tờ Typing Break (`tmp/mac-2026-10-26/feel/study-a/seq/`) và thấy các chỗ dưới. Đã đổi, sim không đổi (152 trận chương băm trùng `3d495ad`):

1. **Nghĩa luôn đi cùng từ của nó.** Luật cũ của §2.2 ("không vừa thì nghĩa ở lại bến 600 ms") đặt nghĩa của từ vừa xong dưới từ mới của bến: người học đọc "perfect = thực sự". Nay dòng từ xuống hai dòng ("từ ✓" trên nghĩa) khi một dòng không vừa; bến không giữ nghĩa cũ.
2. **Bến đang gõ là một mục từ điển**: từ 22 px kèm IPA, nghĩa tối đa 2 dòng (IPA · nghĩa một dòng bị cắt ở 8/8 trận). Bến rảnh: nghĩa một dòng co tới 12 px rồi mới cắt (4/450 từ của bộ từ còn bị cắt).
3. **Dòng từ lên 16 px** (720p; đáy y 456): tấm đứng trên sàn cách vạch đáy 1,8 m thay vì mép dải sọc, nên lóe nòng, lưỡi lửa Tán, gốc tia Ray và Tia hiện giữa mũi tàu và tấm. Kiểm §7.3 "đỉnh dòng cách mép tầm Xung ≥ 90 px" thành ≥ 70 px; thêm "mọi nòng thấp hơn đáy dòng ≥ 20 px".
4. **Chữ vừa gõ có màu súng ngay f0** (65 % súng trên trắng nóng; trắng nóng thuần trùng màu chữ chưa gõ), quầng đậm hơn, vạch quét hiện từ f0 và ở lại làm gạch dưới phần đã gõ (0,55), viền tấm lóe màu súng 3 khung mỗi phím. Mực chữ đã gõ `--gun-ink` đặt theo từng lớp súng; Ray có mực riêng `--ray-ink` #8fa3ff (trắng xanh #c4d2ff cạnh chữ kem chỉ 1,33 : 1).
5. **Trên sân**: mảnh 0,6 × 0,16 m, vòng sàn từ 1,4 m (ngoài thân tàu) tới 2,8 m; Tia hẹp lại quanh tàu (sao ở nòng 2,6 → 1,5 m, lớp mờ 3 m đầu 1,4 m, đèn nòng 1,6 → 1,1) để tàu và lõi không thành một vệt trắng; quầng trắng quanh nòng của phát Ray nhỏ và ngắn hơn.
6. **Hạ quái to, nổ Pháo Sao, cú nứt**: Trâu và Đầu Đàn chết trong lóe trắng 4 khung, cột lửa, vòng sóng rộng, khói; khối vỡ thép sáng hơn, mép nguội vẫn còn viền mờ, khối lớn của quái to nóng gấp đôi lâu và bay cao hơn 1,4×. Quả Pháo Sao dài ≥ 4 % chiều cao màn ở mọi tầm; nổ: lóe trắng 1/5 màn 3 khung, cầu lửa 18 %, khói. Vết nứt mở: cột sáng 14 m 0,9 s, vòng trên sàn, tia lửa, khói, đẩy camera.
7. **Đếm ngược Vết nứt còn hiện cạnh dòng từ** phía vách sẽ nứt (biển ở mép giữ nguyên).


## 12. Đổi ở lượt N4/N6 (27/10, sau lần kiểm lại; chủ dự án xem ở §7.6)

Lần kiểm lại trên `4788022` còn hai lỗi nặng: N4 (mỗi phím trên sân vẫn nhạt: quanh tàu chỉ có một cung màu nhỏ dưới thân và một vệt ~25 px; khi Tia cháy không thấy mảnh hay vòng; Tia và Ray cùng bắn thì nửa trước tàu là một vệt trắng) và N6 (Trâu bị Ray hạ "biến vào một vòng": thân lóe trắng 4 khung rồi vòng sóng 7 m lấn hết, cột lửa trùng tia Ray, khói gần như không thấy, khối vỡ là vài chấm). Changelog: [`2026-10-27-feel-n4n6.md`](changelog/2026-10-27-feel-n4n6.md). Sim không đổi.

**Đơn vị.** Cỡ một billboard (`Glows.burst`) là **bề ngang cả quad** (m), không phải bán kính: vòng sáng (`CELL.ring`) có bán kính 0,4 × bề ngang. Vòng "1,4 → 2,8 m" của §11.5 thật ra có bán kính 0,56 → 1,12 m, nằm dưới thân tàu và trong vòng sơn của sàn (bán kính 2,6 m): đó là lý do nó thành "một cung màu nhỏ dưới thân".

**Bùng ở khung đầu.** Một burst tạo giữa hai khung đã già một khung khi vẽ lần đầu (`Glows.step` cộng `dt` trước khi vẽ): lóe "3 khung" thật ra hiện 44 % rồi 11 % rồi tắt. Burst mới của lượt này truyền `early = F` để hiện trọn ở khung đầu. Các burst cũ giữ nguyên (đổi hết là đổi cả độ sáng các súng, cần đo lại §4.1 và F8; để lượt sau).

### 12.1 Mỗi phím đúng (N4; `KEY_MARK` trong `type-rules.ts`, `typing-feel.ts`)

| Phần | Số | Khung |
|---|---|---|
| Tia sét màu súng từ mép dưới tấm dòng từ, ngay dưới chữ, vào lõi tàu | rộng 0,56 m (× 1,25 từ chuỗi sạch bậc 1), cường độ 4, lõi trắng 0,9; hai khớp lệch ngang 0,3 m, nhảy ở f2 và f4 | trọn f0–f1, tắt dần tới f4 |
| Sao 4 tia nơi tia rời tấm, 3 tia lửa rơi | ngang 1,2 → 2,4 m, cường độ 4 | f0–f3 |
| Sao 8 tia trong lõi | ngang 0,8 → 1,6 m, cường độ 3,4 | f0–f3 |
| Sàn dưới tàu sáng | ngang 3,2 → 4 m, cường độ 0,35 | f0–f2 |
| Vòng sàn | bán kính 1,4 → 3,2 m (qua vòng sơn 2,6 m), 0,16 s, cường độ 2,2 | f0–f9 |

- Mọi phần hiện trọn ở f0 (`early`). Mực của Ray trên sân là `#8fa3ff` (trắng xanh của nó chìm trong ánh Tia).
- Chữ không bị vẽ đè: tia rời từ mép dưới tấm (`WordStrip.anchor` trả về đáy tấm dưới chữ).
- Bến đầy: tia văng sang ngang 1,6 m, không vào lõi, không sao lõi, không vòng.
- Thay mảnh 0,6 m của §11.5. Đèn động riêng cho mỗi phím đã thử rồi bỏ: phủ thân tàu một quầng xanh trắng, lóe nòng của phát đầu không còn đọc được.
- **Giảm chuyển động:** tia đứng yên (khớp lệch 0,12 m, không nhảy), không tia lửa, vòng × 0,8 và cường độ × 0,6. Vẫn thấy rõ (đo ở `f1f` "reduced").
- **Ngân sách:** 7 billboard và vệt mỗi phím; 10 phím/s giữ ≤ 12 cùng lúc (`keyMarkLive`, test; `rate` của `survival-feel`). §6 dòng "Hiệu ứng theo phím" giữ ≤ 12.

### 12.2 Tia và Ray quanh tàu

- **Tia, 3 m đầu (đoạn từ nòng tới điểm nhập đường sim):** không lớp mờ; lõi và quầng × 0,7, quầng hẹp 0,55 m; vệt sàn × 0,49; sao ở nòng 1,5 → 1 m, cường độ 1,9 → 1,2; cột trên sàn mọc dần trong 2,4 m đầu (trước 0,48 m); đèn giữ ở 1,5 m ra phía trước (trước ở nòng, rọi trắng thân tàu), 1,1 → 0,9. Vết cháy mỗi nhịp 3 → 2, cường độ 0,85 → 0,6, chỉ từ 3 m trở ra (72 vết sống cùng lúc đã phủ cam nửa dưới màn).
- **Ray:** 3 m đầu × 0,6; sao 8 tia, lõi và quầng trắng ở nòng dời 1 m ra theo hướng bắn, quầng trắng 1,8 → 1,1; đèn ở 1,5 m ra phía trước.
- Phần xa của hai tia không đổi (độ sáng của súng giữ như build 2).

### 12.3 Hạ quái to (N6; `ShotFx.bigKill`)

Trâu, Đầu Đàn (và quái phụ của boss khi có cờ `big`). Đầu Đàn to hơn 1/4, màu vàng `beacon`. Cỡ theo màn (`v` = 16 % chiều cao màn ở độ sâu của nó):

| Phần | Số | Thời gian |
|---|---|---|
| Lóe riêng | lõi trắng nóng ngang 1,8 → 2,3 v, cường độ 3 (đĩa trắng ~13 % chiều cao màn, cộng bloom thì cả làn quanh nó trắng 2 khung), sao 12 tia vàng 2 → 3,6 v (tia dài tới ~29 % màn), sàn sáng 3 → 4 v (1,2); đèn `LIGHT.big` (ưu tiên 5, cường độ 5, vũng 6 m, 0,15 s) | f0–f2 (sao tới f4) |
| Cầu lửa | 7 cụm lửa (`CELL.puff`, vàng rồi cam), lăn lên 2,2–4,4 m/s và ra hai bên 1,1–3,3 m/s | 0,45–0,8 s |
| Khói | 9 cụm khói phủ (chế độ `smoke` của `Glows`, hòa trộn thường; xám sáng `#9a928b`, lõi muội `#3d3835`), alpha 0,75, bốc lên 0,7–1,4 m/s, nở 1,2 → 3,6–5,2 m | 2–3 s |
| Nền than hồng | vệt cam phẳng ngang 7–8 m, 0,55 | 3,5 s |
| Vòng sóng | bán kính 0,8 → 2 m, 1,1 (trước: vòng 7 m của bigKill và vòng ~10 m chung, lấn cả lóe) | 0,35 s |
| Tia lửa | 36 tia phun lên | ~0,8 s |

- Lóe khác tia Ray ở **màu** (vàng ấm, Ray trắng xanh), **hình** (tròn và tia tỏa, Ray là một đường mảnh) và **chỗ** (cầu lửa ra hai bên, không chạy dọc đường Ray).
- **Khối vỡ:** thép sáng `#56616c` (kim loại 0,25), viền thép nguội 0,45 (trước 0,3); Trâu 12 + 6 khối lớn (14 + 3), Đầu Đàn 14 + 8 (18 + 5); nhỏ 0,3–0,55 m, lớn 0,8–1,15 m (0,6–0,8); khối nhỏ của quái to nguội trong 2,4 s, khối lớn 4,2 s và văng xa 0,45 × (thành một đống trên nền than, không rải thành chấm dọc đường Ray). Khối của quái thường đổi màu thép và viền nguội như trên, số và cỡ giữ §4.5.
- Bầy và Lính hạ chung giữ cách cũ (`ShotFx.kill`, chuyển từ `combat.ts`).

### 12.4 Kiểm

- `survival-feel` cảnh `f1f`, `survival-feel-guns` cảnh `f6b` (§7.2): số đo, ngưỡng và tờ khung ở changelog. `f5` gõ phím cuối sau các phím khác 300 ms để khung trước nó không còn dấu phím trên sàn (§12.1 làm sàn quanh nòng sáng ở mọi phím).
- Draw call: thêm 1 (khói) khi có khói; chương trình shader thêm 1 (35), biên dịch sẵn ở `warm.ts`.
