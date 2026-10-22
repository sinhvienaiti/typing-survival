# Space Typing "Sinh Tồn": kế hoạch chế độ mới, cảm giác chiến đấu và học (22/10/2026)

> **Dành cho:** chủ dự án; ChatGPT (đọc để góp ý); AI làm tiếp.
> **Trạng thái:** **chỉ là kế hoạch.** Chưa code. Làm khi chủ dự án duyệt.
> **Nguồn:**
> - Video tham khảo Typing Break (83 s, chủ dự án quay, chỉ để ở máy, không vào Git). Đã xem toàn bộ, mỗi giây một khung, và xem dày ở 12–13 s và 44–46 s.
> - Brief của ChatGPT "Combat Feedback, VFX/CGI & Learning Integration" (chủ dự án gửi trong chat 22/10).
> - Hai bản audit code Space Typing (22/10): hiệu ứng chiến đấu, VFX, âm, camera; phần học, quái, tàu.
>
> **Luật bản quyền:** học **nguyên lý** cảm giác chiến đấu, không chép giao diện, tên súng, màu, hình, tiếng hay nhịp hoạt ảnh của Typing Break. Mục 9 liệt kê chỗ dễ giống và cách làm khác.

## 0. Tóm tắt

1. **Chế độ mới "Sinh Tồn"** (`survival.html`): tàu (hoặc Draconis) giữ cửa một hành lang không gian, quái của 8 họ sẵn có tràn xuống. Chơi theo **chuyến bay nhiều ải** kiểu roguelite như Hades (mục 4.0): mỗi phòng 1,5–2 phút, xong phòng thì chọn thưởng và chọn cửa kế tiếp, càng đi sâu càng khó nhưng bộ súng và nâng cấp càng mạnh. Chết là hết chuyến, nhưng tiền vĩnh viễn kiếm từ việc học vẫn giữ.
2. **Súng gắn với từ vựng:** mỗi ô súng mang một **từ đang học**. Gõ đúng từ thì súng bắn, rồi ô lấy từ mới. Đây là chỗ học chính, không phải chữ dán lên quái.
3. **"Tri thức thành năng lượng":** mỗi chữ cái gõ đúng thành tia năng lượng bay vào lò của tàu. Gõ xong từ là xả đòn. Gõ chuẩn thì đòn mạnh và sạch.
4. **Cảm giác chiến đấu nhiều lớp:** số sát thương, lóe trúng, giật lùi, dừng hình ngắn, rung camera có hướng, mảnh vỡ, tiếng va chạm nhiều lớp. Tất cả đi qua **một bộ phản hồi chung** để dùng lại cho Campaign 3D, Defense, TD.
5. **Học luôn rõ nhất:** khung học (từ, IPA, nghĩa) nằm ở lớp riêng, không rung, không bị số hay hiệu ứng đè.
6. **Dùng lại đồ có sẵn:** 112 model quái 3D, 27 boss, 12 tàu và Draconis, 14 hành vi quái của bản 2D, hệ hạt và đám đông instanced của Defense, kho từ 18.000 từ có nghĩa và IPA, lõi chấm độ thuộc từ của repo cha.

---

## 1. Xem gì trong video (Typing Break)

| Thời điểm | Thấy gì | Nguyên lý rút ra |
|---|---|---|
| 6–11 s | Súng cố định ở đáy hành lang. Hai bên là ô súng (Turret, Fury, Shotgun, Pistol); mỗi ô có một từ (sour, five, path, tire). Gõ xong thì ô đổi từ | **Mỗi súng một từ, gõ là bắn, rồi đổi từ.** Gõ là quyết định chiến thuật: chọn súng nào |
| 6–12 s | Quái vỡ thành nhiều khối nhỏ nằm lại trên sàn. Số sát thương dày, nhiều cỡ, số to cho đòn nặng | **Mảnh vỡ lưu lại** cho thấy trận đã khốc liệt tới đâu. **Cỡ số theo độ mạnh** |
| 12,3–13,3 s | Người chơi bị đánh: màn hình tách màu RGB, rung, chữ ô súng nhòe; thanh máu tụt | **Bị đánh phải thấy ngay** bằng hậu kỳ ngắn. Nhưng chữ bị nhòe là điều **ta không làm** (học phải rõ) |
| 14–21 s | Lên cấp: 3 thẻ A/B/C trượt từ trên xuống, có nút đổi thẻ | **Chọn nâng cấp giữa trận** (kiểu Vampire Survivors) |
| 22–31 s | Laser là cột sáng, lửa làm quái bốc cháy. Ô có thanh hồi | **Mỗi súng một chữ ký hình riêng**, có thời gian hồi thấy được |
| 28, 42–46 s | Gõ liên tiếp "FLAME TURRET LASER": chữ hiện to ở giữa đáy, có vòng thời gian chuỗi; đòn kết hợp mang lửa | **Chuỗi kết hợp:** gõ liền nhiều từ trong một khoảng ngắn thì đòn sau mạnh hơn và đổi tính chất |
| 37 s | Fury: vệt chém hồng khổng lồ quét cả màn hình | **Đòn tối thượng** phải khác hẳn đòn thường |
| 42–49 s | Quái có chữ cái (Q, X, W) trên đầu | **Quái đặc biệt** cần gõ trực tiếp |
| 50–60 s | Boss có chữ trên từng bộ phận (defeat, make, indoor) | **Phá boss theo bộ phận bằng từ** |
| Mọi lúc | Mỗi phím in một chữ cái to lên ô súng; gõ xong ô lóe viền, đầu nòng lóe | **Mỗi phím có phản hồi ngay; từ xong có phản hồi riêng** |

**Điểm yếu của video, ta không học theo:**
- Số sát thương chồng thành đống không đọc được.
- Chữ ô súng bị nhòe khi rung.
- Không có nghĩa hay phát âm: từ chỉ là phím bấm, không phải để học.

---

## 2. Đánh giá brief của ChatGPT

Điểm: **8/10.** Đúng về nguyên lý cảm giác chiến đấu và luật "học không bị đè". Nhưng brief viết chung, chưa biết Space Typing đã có gì, và chưa có **luật chơi** của chế độ Sinh Tồn.

| Ý của brief | Quyết định | Ghi chú |
|---|---|---|
| Một đòn là nhiều lớp phản hồi (§5) | **Giữ** | Lõi của mục 5 |
| Tri thức thành năng lượng (§3, §6.2) | **Giữ, làm chữ ký** | Mục 4.4 |
| Hệ số sát thương có phân loại, chống chồng (§10) | **Giữ** | Vẽ bằng WebGL, không DOM (mục 5.4) |
| Lóe trúng, giật lùi giả, co giãn (§11–§13) | **Giữ** | Model quái chỉ có clip đứng yên, nên làm bằng code (mục 5.5) |
| Dừng hình ngắn, bộ đệm phím (§14, §60) | **Giữ, có luật** | Chỉ dừng thế giới; gõ không bao giờ dừng (mục 5.3) |
| Camera trauma, xung có hướng (§15–§16) | **Giữ** | Gộp 4 cách rung đang có thành một |
| Khung học không rung (§17, §36) | **Giữ, bắt buộc** | Mục 6.2 |
| Hậu kỳ: tách màu, mờ xuyên tâm, méo nhiệt (§24–§29) | **Một phần** | Chỉ khi bị đánh và khi phá boss; có công tắc tắt |
| Bậc va chạm T0–T5 (§30) | **Giữ** | Mục 5.2 |
| Bus sự kiện phản hồi (§31–§32) | **Giữ** | Đặt ở `src/feedback/`, dùng chung các chế độ |
| Cách học: nhớ lại, thông thạo thành sức mạnh, nghe (§41–§45) | **Giữ, chỉnh cân bằng** | Mục 6 |
| Nhạc động nhiều lớp (§52) | **Giữ** | Dùng song engine có sẵn (mục 7) |
| Ngân sách, 4 bậc chất lượng, trợ năng (§55–§58) | **Giữ** | Mục 8 |
| Chế độ giọng nói (§42) | **Để sau** | ASR chưa có engine chính thức |

---

## 3. Có gì sẵn trong code (audit 22/10)

| Phần | Có ở đâu | Quyết định |
|---|---|---|
| Số sát thương | Duel `combat-juice.ts` (chống chồng, trần theo bậc), Defense dùng DOM (28 cái) | **Thay** bằng bộ số WebGL dùng chung, lấy luật từ Duel |
| Hạt 3D | `scene3d/particles.ts` (`ParticlePool`, `Ribbon`, `FlameTrail`, `Streaks`), `scene3d/fx.ts` (nổ, sóng, phun) | **Giữ, mở rộng** |
| Hiệu ứng mật độ cao | Defense `view/vfx.ts`: billboard instanced, không cấp phát giữa đợt | **Giữ, mở rộng**: nền cho Sinh Tồn |
| Đám đông quái | Defense `view/crowd.ts`: 400 quái, khoảng 12 draw call, 442 quái 3,7 ms | **Giữ** |
| Lóe trúng | Có ở cả 2D, 3D, Defense | **Giữ** |
| Giật lùi, co giãn quái | Không có ở chế độ nào | **Thiếu** |
| Rung camera | 4 cách khác nhau; Campaign 3D bỏ qua cài đặt rung | **Làm lại**: một bộ chung |
| Dừng hình | 2D, Defense, Duel mỗi chế độ một kiểu; Campaign 3D không có | **Làm lại**: một bộ chung |
| Bậc chất lượng 3D | Chỉ 2 bậc, trong khi cài đặt có 4 | **Làm lại**: 4 bậc |
| Đạn tàu 3D | Mỗi tàu một model đạn; Draconis có cầu lửa. Dùng `setTimeout` (bỏ qua tạm dừng và dừng hình) | **Mở rộng**; đổi sang đồng hồ của game |
| Chuỗi | 2D ×2/×3/×4; Duel 9 bậc có giọng; Defense 3 bậc | **Gộp** thành một bảng bậc |
| Âm | 2D có nhóm, nhường tiếng khi phát âm, va chạm nhiều lớp, nhạc 2 stem; 3D chỉ có một kênh | **Mở rộng** `SceneAudio` có bus và nhường tiếng |
| Phát âm | `speech.ts` (Web Speech, từ mới nhất thắng) | **Giữ** |
| IPA, nghĩa trong trận | 3 bản khác nhau (2D, Campaign 3D, Defense) | **Gộp** thành một khung học chung |
| Độ thuộc từ | Repo cha `shared/learning` (thuộc 0–100, lịch ôn); con chỉ gửi sự kiện | **Giữ**; Sinh Tồn gửi sự kiện |
| Kế hoạch từ mới / ôn | Chưa có ở 2D, 3D | **Thiếu**; dựa vào `adaptive-mix.mjs` |
| Quái | 14 hành vi (2D), 112 model 3D (chỉ clip Idle), 27 boss có clip trúng, chết, ra mắt | **Dùng lại** |
| Nâng cấp | 12 relic theo từ gõ, kỹ năng, trang bị, mẫu chọn thẻ của Defense | **Dùng lại** làm thẻ lên cấp |
| Kiểm hiệu năng | Kịch bản `defense-perf`, `td-1a-perf`, gate p95 | **Dùng lại** |

---

## 4. Luật chơi Sinh Tồn

### 4.0 Cấu trúc: chuyến bay nhiều ải (roguelite)

Chủ dự án chốt (23/10): không làm một ải 15 phút. Làm **vượt ải dài**: càng về sau càng khó, nhưng trang bị, kỹ năng ngày càng đa dạng và mạnh; sau mỗi ải có nhiều lựa chọn (nâng cấp, súng mới, mua máu…), như Hades.

```text
TRẠM MẸ (ngoài chuyến) ──▶ CHUYẾN BAY: Vùng 1 ─▶ Vùng 2 ─▶ Vùng 3 ─▶ Vùng 4 ─▶ Lõi Hố Đen (boss cuối)
                                          │
                     Vùng = 6 phòng + Trạm Nghỉ + Boss vùng (khoảng 12–15 phút)
                     Phòng = 1 trận 90–120 s ─▶ nhận thưởng ─▶ chọn 1 trong 2–3 cửa kế tiếp
```

| Tầng | Là gì | Dài |
|---|---|---|
| **Chuyến bay** | 4 Vùng + boss cuối. Chết là hết chuyến | 50–60 phút nếu đi hết |
| **Vùng** | Một họ quái (màu, nền, model). Mỗi chuyến chọn ngẫu nhiên 4 trong 8 họ, xếp theo độ khó | 12–15 phút |
| **Phòng** | Một trận: sống qua các đợt tới hết giờ, hoặc hạ đủ số quái | 90–120 s |
| **Trạm Nghỉ** | Giữa vùng: hồi máu **hoặc** rèn súng, không đánh | — |
| **Boss vùng** | Boss bộ phận gắn từ (mục 4.6) | 2–3 phút |

**Chọn cửa.** Xong phòng, hiện 2–3 cửa. Mỗi cửa có biểu tượng **loại thưởng** của phòng sau, nên người chơi lên kế hoạch được:

| Cửa | Thưởng khi xong phòng đó |
|---|---|
| Súng mới | Chọn 1 trong 3 súng (thêm vào ô trống, hoặc thay súng cũ) |
| Ấn | Chọn 1 trong 3 **Ấn** của một Nguồn (mục dưới) |
| Rèn | +1 cấp cho một súng; cấp 5 + Ấn đúng thì **tiến hóa** |
| Vàng | Vàng để mua ở Chợ |
| Lõi | +máu tối đa |
| Sửa | Hồi 30 % máu |
| Chợ | Không đánh. Mua súng, Ấn, máu, bùa dùng một lần, đổi lại lựa chọn |
| Tinh nhuệ | Phòng khó hơn, thưởng 2 lần |
| Thử Thách Chữ | Không có quái. Sự kiện học: nghe và gõ, nhìn nghĩa gõ từ, ghép cụm từ. Thưởng theo số câu đúng |

**Ấn (nâng cấp trong chuyến).**
- Có 5 **Nguồn**, mỗi nguồn một kiểu chơi:
  - Lửa: cháy, nổ.
  - Băng: chậm, đóng băng.
  - Ion: sét lan, phá giáp.
  - Hư Không: hút quái, xuyên.
  - Ánh Sáng: hồi máu, khiên, chí mạng khi gõ chuẩn.
- Mỗi Ấn có bậc hiếm (thường, hiếm, sử thi). Hai Nguồn có thể mở **Song Ấn** (đòn kết hợp riêng).
- **Relic theo từ gõ** có sẵn (12 cái) trở thành Ấn, ví dụ từ hoàn hảo bắn sét 3 quái.

**Giữ gì, mất gì.**

| | Trong chuyến (qua phòng, qua vùng) | Khi chết |
|---|---|---|
| Súng, cấp súng, Ấn, bùa | **Giữ** | Mất |
| Vàng | Giữ | Mất |
| Máu | Giữ (không tự hồi giữa phòng) | — |
| **Tri Thức** (tiền vĩnh viễn) | Tích lũy | **Giữ** |
| **Mảnh Sao** (rơi từ boss) | Tích lũy | **Giữ** |

**Tiền vĩnh viễn gắn với học:**
- **Tri Thức** đến chủ yếu từ việc học: gõ đúng từ mới, gõ đúng từ cần ôn, Thử Thách Chữ, tổng kết cuối chuyến.
- **Mảnh Sao** đến từ boss.
- Vì vậy học tốt là cách chắc nhất để mạnh lên lâu dài.

**Trạm Mẹ (ngoài chuyến).**
- Cây nâng cấp vĩnh viễn, trả bằng Tri Thức: máu gốc, số ô súng đầu chuyến, thêm một lần chọn lại, hồi sinh một lần.
- Mở súng, Ấn, tàu mới vào kho rơi, trả bằng Mảnh Sao.
- Chọn tàu: 12 tàu và Draconis; mỗi tàu một súng khởi đầu và một nội tại.
- **Độ Sâu Hố Đen:** người chơi tự bật điều kiện khó (quái nhanh hơn, ít máu hơn…) để có thưởng cao hơn khi đã quen.
- **Thư Viện Từ:** xem lại các từ đã gặp, nghe phát âm, ôn nhanh.

**Độ khó tăng dần.** Mỗi phòng: máu và số quái +4 %. Mỗi vùng: hành vi quái mới, tinh nhuệ dày hơn, boss mạnh hơn. Bù lại: mỗi phòng có một thưởng, nên tới Vùng 3–4 người chơi có 5–6 súng, nhiều Ấn và Song Ấn.

**Lưu giữa phòng.** Thoát lúc chọn cửa thì lần sau tiếp tục đúng chỗ.

**Ô súng.** Đầu chuyến có 2 ô (súng của tàu + 1 súng chọn). Tối đa 6 ô, mở bằng thưởng hoặc Trạm Mẹ.

### 4.1 Sân và góc nhìn

- **Hành lang không gian** rộng khoảng 24 m, dài 60 m, nhìn từ trên xuống nghiêng 55°. Quái vào ở đầu trên. Tàu người chơi ở đáy, đứng yên, xoay nòng.
- Bối cảnh theo họ quái của màn: tinh vân, vành đai thiên thạch, trạm vỡ. Dùng lại nền và màu của 8 họ.
- Sân cố định, không cuộn. Camera chỉ rung, có xung nhẹ và zoom chậm khi có boss.

### 4.2 Bến súng

- Hai bên đáy có **bến súng**: đầu chuyến 2 ô, mở dần tới 6 ô (mục 4.0).
- Mỗi ô: **tên súng** (nhỏ), **từ đang học** (to), **nghĩa tiếng Việt** (nhỏ, theo luật mục 6.3), **thanh hồi**.
- Ô sẵn sàng thì từ sáng. Đang hồi thì từ mờ, không gõ được.
- Chữ đầu của các ô sáng **không trùng nhau**, dùng lại `scene3d/words.ts`.
- Gõ xong từ: súng bắn, ô lấy từ mới từ kế hoạch học, rồi hồi.
- **Sức đòn** = sát thương gốc × độ dài từ (0,8–1,3) × chất lượng gõ. Chất lượng gõ: Chuẩn 70 %, Tốc 30 % so với tốc mong đợi E.

| Súng (tên Space Typing) | Kiểu | Hồi | Chữ ký hình |
|---|---|---|---|
| **Xung** (Pulse) | 1 viên nhanh vào quái gần nhất | 0,6 s | Đạn của tàu đang chơi (model sẵn) |
| **Tán** (Scatter) | Nón 5 viên tầm gần | 1,4 s | Quạt tia ngắn |
| **Ray** (Rail) | Xuyên cả hàng, sát thương lớn | 2,5 s | Vệt thẳng mảnh, đầu nòng lóe dài |
| **Tia** (Beam) | Cột sáng 1,2 s, sát thương nhiều nhịp | 3 s | Cột sáng có lõi trắng |
| **Sét** (Arc) | Nhảy 4 quái | 2 s | Tia sét nhánh |
| **Pháo Sao** (Flak) | Nổ vùng 3 m | 2,2 s | Quả nổ có sóng tròn |
| **Nova** (tối thượng) | Quét cả hành lang | Theo lò năng lượng (mục 4.4) | Vòng chữ khổng lồ nổ từ lò |

- Draconis là "tàu" đặc biệt: Xung thành cầu lửa, Nova thành Mưa Lông Lửa (tái dùng cầu lửa có sẵn).

### 4.3 Chuỗi kết hợp

- Gõ xong một từ thì mở **cửa sổ chuỗi 1,2 s**. Gõ xong từ kế tiếp trong cửa sổ thì Chuỗi +1 và cửa sổ mở lại.
- Chuỗi tăng **sức đòn** (+6 % mỗi bậc, trần +60 %) và **độ hoành tráng** theo bậc (mục 5.7).
- **Ô nguyên tố** (mở bằng Ấn của một Nguồn): Băng, Lửa, Ion, Hư Không. Gõ từ của ô nguyên tố rồi gõ ngay từ của một súng thì súng đó mang nguyên tố (làm chậm, cháy, phá giáp, hút quái). Đây là bản Space Typing của "FLAME TURRET".
- Gõ sai một phím không làm đứt chuỗi; chỉ hết cửa sổ mới đứt.

### 4.4 Lò năng lượng và Nova ("Tri thức thành năng lượng")

- Mỗi chữ cái đúng: một **mảnh chữ** bay từ ô vào **lò** ở giữa đáy (hạt, không phải chữ to).
- Lò đầy (khoảng 120 chữ cái đúng): ô **Nova** sáng với một **cụm từ 2–3 từ** lấy từ dữ liệu học (collocation, cụm cố định), ví dụ "make a decision". Gõ xong là xả Nova.
- Nova là thời điểm duy nhất trong trận có cụm từ dài: giá trị cao, đáng để tập trung vài giây.

### 4.5 Quái

Dùng lại 14 hành vi của bản 2D (`src/enemies/kinds.ts`), model 3D của 8 họ:

| Nhóm | Hành vi (kind) | Vai trong Sinh Tồn |
|---|---|---|
| Bầy | `mine` (lao nhanh), `scout` (bắn nhịp) | Lấp sân, rơi nhiều EXP |
| Trâu | `tank`, `shield` (nhiều lớp) | Cần Ray, Tia, nguyên tố phá giáp |
| Nguy hiểm | `destroyer`, `oppressor`, `sniper` | Bắn vào tàu; báo trước bằng vạch đỏ |
| Hỗ trợ | `healer`, `commander` | **Quái gắn từ** (mục 4.6) |
| Phiền | `carrier` (đẻ quái con), `splitter` (vỡ đôi), `cloaker` (ẩn), `jammer` (làm mờ một ô súng 3 s), `leech` (hút năng lượng lò) | Tạo tình huống |

- Mỗi màn chọn **một họ** chính (màu, nền, model), trộn hành vi theo bảng đợt.
- Đợt mới mỗi khoảng 40 s. Tinh nhuệ dùng bộ biến thể có sẵn (nhanh, giáp, cuồng, dễ nổ).
- **Trần:** tối đa 350 quái sống cùng lúc ở bậc High (đám đông của Defense đã chịu 442).

### 4.6 Quái gắn từ và boss

- `healer`, `commander` và tinh nhuệ mang **một từ** trên đầu (thẻ nhỏ). Gõ từ đó thì bắn **Ray chính xác** vào nó, không tốn ô súng.
- Tối đa **2 quái gắn từ** cùng lúc. Từ ngắn (3–5 chữ).
- **Boss** (27 model có clip): mỗi 5 đợt. Boss có 2–4 **bộ phận gắn từ** (khiên, nòng, lõi). Gõ phá từng bộ phận rồi lõi lộ ra. Dùng lại cơ chế gõ boss của 2D: ngắt nạp, khiên theo thứ tự, điểm yếu.
- Boss báo đòn lớn trước 3 s: vạch đỏ trên sân và một **từ chặn**. Gõ kịp thì chặn đòn.

### 4.7 Trong phòng, sau phòng, thua

- **Trong phòng không có màn chọn thẻ**, để không cắt ngang trận và không che khung học. Trong phòng chỉ nhặt vàng, hạt máu nhỏ, và nạp lò Nova.
- **Sau phòng:** hiện thưởng của phòng (đã biết từ lúc chọn cửa), rồi các cửa kế tiếp. Thế giới đã dừng nên đọc thoải mái.
- **Chọn thẻ bằng gõ từ khóa tiếng Anh** của thẻ ("pierce", "shield", "storm", "magnet"…), hoặc phím 1/2/3 (trợ năng). Chọn lại: gõ "reroll", dùng lượt chọn lại (mở ở Trạm Mẹ) hoặc vàng.
- Loại thẻ:
  - súng mới, rèn súng, tiến hóa;
  - Ấn (theo Nguồn), Song Ấn;
  - chỉ số (máu, hút vật phẩm, chí mạng);
  - **thẻ rủi ro** (sát thương +100 %, gõ sai mất 3 máu).
- Thua khi tàu hết máu. Màn kết thúc hiện:
  - vùng và phòng đã tới, thời gian, điểm;
  - **từ đã gõ, từ mới học, từ cần ôn** (bấm nghe phát âm);
  - Tri Thức và Mảnh Sao mang về Trạm Mẹ.

### 4.8 Học giữa các phòng

- Cửa **Thử Thách Chữ** (mục 4.0) là chỗ học sâu: nghe và gõ, nhìn nghĩa gõ từ, ghép cụm từ, ôn từ vừa gõ sai. Không có quái, không bị thời gian ép.
- **Trạm Nghỉ** giữa vùng có thêm "Nghe và gõ" không bắt buộc: game đọc 3 từ vừa gõ sai, người chơi gõ lại theo tai, thưởng Tri Thức. Bỏ qua được bằng Enter.

---

## 5. Hệ phản hồi chiến đấu (dùng chung)

### 5.1 Kiến trúc

```text
Luật Sinh Tồn (sim cố định 60 Hz, tất định như TD)
        │ sự kiện ngữ nghĩa: KEY_OK, KEY_BAD, WORD_DONE, WORD_PERFECT, SHOT,
        │ HIT{tier, pos, dir, dmg, crit, perfect}, KILL{class}, PLAYER_HIT, BOSS_BREAK, CHAIN_TIER, NOVA
        ▼
src/feedback/  (dùng chung mọi chế độ)
  ├─ tiers.ts        bảng bậc T0–T5 → hồ sơ phản hồi
  ├─ profile-*.ts    hồ sơ theo chủ đề: ship, dragon (sau: defense, td)
  ├─ trauma.ts       rung = trauma², xung có hướng, theo cài đặt
  ├─ hitstop.ts      dừng thế giới; gõ không dừng
  ├─ numbers.ts      số sát thương WebGL, gộp, tránh vùng học
  ├─ reaction.ts     lóe, giật lùi giả, co giãn
  ├─ debris.ts       mảnh vỡ instanced, lưu trên sàn
  ├─ glyph.ts        mảnh chữ bay vào lò
  └─ audio-cues.ts   ghép tiếng nhiều lớp theo bậc
```

- Luật không biết hiệu ứng có bao nhiêu hạt. Hồ sơ phản hồi quyết định.
- Campaign 3D, Defense, TD chuyển dần sang `src/feedback/` sau khi Sinh Tồn chạy ổn.

### 5.2 Bậc va chạm (số khởi điểm, chỉnh khi thử)

| Bậc | Khi nào | Trauma | Dừng hình | Hạt | Số | Tiếng |
|---|---|---|---|---|---|---|
| T0 | Phím đúng | 0 | 0 | 2–4 mảnh chữ | — | Tiếng phím |
| T1 | Xung, Tán trúng | +0,03 | 0 | Tia nhỏ | Nhỏ, 0,45 s | Đầu nhọn + thân |
| T2 | Ray, Pháo Sao, chí mạng thường | +0,08 | 12 ms | Sao 8 tia + vụn | Vừa, nảy 1,25 | + lớp trầm ngắn |
| T3 | Hoàn hảo, chí mạng do gõ chuẩn | +0,16 | 35 ms | Sao 12 tia, sóng tròn, mảnh vỡ | To, viền sáng, chữ "HOÀN HẢO" nhỏ | + lớp trầm |
| T4 | Hạ tinh nhuệ, nổ lớn | +0,30 | 45 ms | Sóng kép, mảnh vỡ nhiều | To + gộp | + đuôi vang |
| T5 | Nova, phá boss | +0,55 | 70 ms | Vòng chữ, lóe sáng, tách màu 60 ms | Rất to, giữa sân | Riêng, có câu nhạc |

- Rung tối đa ở 1080p: 14 px. Xung có hướng: ngược hướng bắn 2–6 px, về lại theo lò xo 120 ms.
- Phân biệt **chí mạng ngẫu nhiên** (số vàng) với **mạnh nhờ gõ chuẩn** (số trắng xanh ngọc kèm "HOÀN HẢO"). Người chơi hiểu đòn mạnh vì gõ tốt.

### 5.3 Dừng hình và phím

- Dừng hình chỉ làm **thế giới** chậm lại (tốc 0,05), không đóng băng hẳn. Khung học, ô súng, số trên HUD vẫn chạy.
- **Phím không bao giờ bị nuốt:** phím đi thẳng vào bộ gõ ngay khi nhấn. Đòn của từ vừa xong được xếp hàng và bắn khi thế giới chạy lại (tối đa 70 ms sau).
- Không dừng hình cho mọi phím, chỉ từ T2 trở lên. Hai lần dừng cách nhau ít nhất 150 ms.

### 5.4 Số sát thương

- Vẽ bằng **WebGL instanced** dùng một atlas chữ số, không dùng DOM. Hồ sơ: thường, nhịp (cháy, tia), mạnh, chí mạng, hoàn hảo, quá tay, phá boss.
- **Gộp:** cùng mục tiêu trong 150 ms thì cộng dồn vào một số và nảy lại. Sát thương nhịp gộp theo 0,3 s, hiện "×6".
- **Tránh vùng học:** khung học, bến súng, thẻ boss công bố hình chữ nhật cấm. Số rơi vào đó thì dời lên, hoặc giảm ưu tiên.
- Trần: High 160 số sống, Medium 100, Low 50. Vượt trần thì bỏ số nhỏ nhất, không bỏ số T3 trở lên.
- Hướng bay theo hướng đòn, nghiêng 15°.

### 5.5 Quái phản ứng

- Model quái chỉ có clip Idle, nên phản ứng làm bằng **thuộc tính instanced** (không thêm draw call):
  - **Lóe:** trắng nóng 1–4 khung theo bậc.
  - **Giật lùi giả:** dời hình theo hướng đòn rồi về theo lò xo; vị trí thật không đổi (không phá đường đi).
  - **Co giãn:** 0,91 / 1,07 rồi về trong 120 ms.
  - **Choáng:** lắc nhẹ cho đòn T3 trở lên.
- **Chết:** dừng hình theo bậc, lóe, vỡ thành mảnh theo vật liệu của họ (8 vật liệu có sẵn ở 2D), sóng nhỏ, tiếng "xác nhận hạ" khác tiếng trúng.
- **Mảnh vỡ lưu lại:** mảnh tinh thể theo màu họ, nằm trên sàn 8 s rồi mờ. Đây là bản riêng của "đống vụn" trong video. Trần 600 mảnh (High).

### 5.6 Đạn và đầu nòng

- Mỗi đạn có lõi, quầng, vệt và tàn dư. Dùng `Ribbon`, `LightTrail` có sẵn.
- Đầu nòng lóe 30–80 ms, có tia hướng, vòng sốc nhỏ, và tàu giật lùi nhẹ.
- Đổi hẹn giờ đạn từ `setTimeout` sang đồng hồ của game (đang bỏ qua tạm dừng và dừng hình ở Campaign 3D).

### 5.7 Leo thang theo Chuỗi

| Chuỗi | Thêm gì |
|---|---|
| 0–4 | Cơ bản |
| 5–9 | Vệt đạn dài hơn, lò sáng hơn |
| 10–19 | Thêm tia ở va chạm, lớp nhạc trống |
| 20–29 | Ánh sáng sân đổi theo màu nguyên tố, lớp nhạc bass |
| 30+ | **Quá Tải:** đạn có vệt chữ cái của từ vừa gõ, lớp nhạc tối đa, viền sân phát sáng |

- Không có hiệu ứng nào phủ kín màn hình liên tục. Mức to nhất chỉ dành cho T5.

### 5.8 Bị đánh

- Tàu lóe đỏ, rung có hướng, viền màn tối 120 ms, tách màu 40 ms (chỉ ở thế giới).
- **Không làm nhòe chữ** của bến súng và khung học.

---

## 6. Học trong trận

### 6.1 Thứ tự ưu tiên trên màn hình

```text
TỪ ĐANG GÕ  >  ô súng sẵn sàng  >  đòn nguy hiểm của quái  >  tàu  >  số sát thương  >  cảnh nền
```

### 6.2 Khung học (lớp riêng, không rung)

- Ở **giữa đáy**, giữa hai dãy ô súng. Khi đang gõ một từ, khung hiện:

```text
        SHELTER            ← to nhất, chữ đã gõ sáng dần
      /ˈʃel.tər/           ← vừa
       nơi trú ẩn          ← nhỏ
```

- Khung học là DOM nằm ngoài canvas (không bị rung, không bị hậu kỳ). Hạt và mảnh vỡ có thể đi phía sau, nhưng không được che chữ.
- Sau khi gõ xong: khung giữ "SHELTER · nơi trú ẩn ✓" 0,6 s rồi tắt.

### 6.3 Hiện nghĩa theo độ thuộc từ

Độ thuộc lấy từ `shared/learning` (0–100):

| Độ thuộc | Trên ô súng | Trong khung học khi gõ |
|---|---|---|
| Từ mới | Từ + nghĩa + chấm "mới" | Từ + IPA + nghĩa; phát âm lần đầu |
| 0–39 | Từ + nghĩa | Từ + IPA + nghĩa |
| 40–69 | Chỉ từ | Nghĩa hiện **sau khi gõ xong** (nhớ lại) |
| 70+ | Chỉ từ | Không hiện, trừ khi bật trong cài đặt |

### 6.4 Từ đến từ đâu

- Kế hoạch từ của trận theo tỉ lệ khởi điểm: **60 % từ đang ở cấp**, **25 % từ cần ôn** (đến hạn hoặc yếu), **15 % từ mới**. Dựa vào `shared/learning/adaptive-mix.mjs`.
- Từ mới không xuất hiện ở ô súng có hồi ngắn (Xung, Tán), để người chơi có thời gian đọc nghĩa.
- Mọi lần gõ gửi sự kiện học về repo cha (như 2D đang làm). Sinh Tồn **không tự tính** độ thuộc.

### 6.5 Phát âm

- Phát âm khi một **từ mới** xuất hiện lần đầu ở ô súng, và khi gõ xong từ mới.
- Tối đa 1 lần mỗi 3 s. Không phát khi boss đang báo đòn.
- Khi phát âm: tiếng súng, tiếng va chạm hạ 6 dB, nhạc hạ 4 dB (xuống 80 ms, lên lại 400 ms). Không tắt hẳn tiếng nào.
- Không dừng trận khi phát âm. Phím Tab (hoặc bấm vào khung học) đọc lại từ đang gõ.

### 6.6 Thông thạo thành sức mạnh (có giới hạn)

- Từ ở độ thuộc 70+ cho đòn **có vệt chữ ký** (đẹp hơn), nhưng **không mạnh hơn** từ mới. Vì vậy người chơi không né từ mới.
- Từ mới gõ đúng lần đầu thưởng **+50 % EXP** của đòn đó. Học từ mới có lợi.

---

## 7. Âm thanh

- **Bus:** nhạc, nền, gõ, súng, va chạm, giọng / phát âm, UI, cảnh báo, rồi limiter. Mở rộng `SceneAudio` của 3D (hiện chỉ có một kênh); lấy luật nhóm và nhường tiếng của 2D (`audio/mix.ts`).
- **Tiếng va chạm nhiều lớp:** đầu nhọn khoảng 20 ms, thân, năng lượng, lớp trầm (chỉ T2 trở lên), mảnh vụn, đuôi vang. Ghép trong engine như `Sfx.ts` đang làm.
- **Tiếng phím:** pool 5 biến thể, lệch cao độ ±3 %, nâng nhẹ theo Chuỗi. Phím sai: tiếng đục, nhỏ, không còi.
- **Xác nhận hạ:** một tiếng "tách lõi" riêng, khác tiếng trúng.
- **Nhạc động:** song engine sẵn có (`scripts/music/render-songs.mjs`) render 3 stem cùng nhịp: nền, trống, quá tải. Lớp thêm theo Chuỗi (mục 5.7), mờ 2 s khi Chuỗi đứt.
- Âm gốc mới (nếu cần) theo cách của bộ prompt TD: tạo bằng công cụ AI, lưu `art-src/`, không vào Git.

## 8. Hiệu năng và trợ năng

### 8.1 Ngân sách (High, Mac M4, 1080p)

| Mục | Trần |
|---|---|
| Quái sống | 350 |
| Hạt chiến đấu | 2.400 (Medium 1.200, Low 500) |
| Số sát thương | 160 / 100 / 50 |
| Mảnh vỡ | 600 / 300 / 100 |
| Đèn động | 4 / 2 / 0 |
| Draw call | ≤ 150 |
| Khung hình | trung bình ≤ 8 ms, p95 ≤ 12 ms |
| Phím tới hình | ≤ 1 khung; phím tới đòn ≤ 50 ms (dừng hình ≤ 70 ms) |

- Không cấp phát đối tượng trong trận (pool hết). Hiệu ứng ưu tiên cao thay hiệu ứng ưu tiên thấp khi chạm trần.
- **3D có 4 bậc:** Low, Medium, High, Ultra (hiện chỉ có 2). Bloom từ High; méo nhiệt và tách màu chỉ từ High.

### 8.2 Trợ năng

- Rung camera 0–100 % (áp dụng thật, Campaign 3D hiện bỏ qua cài đặt này).
- Giảm chuyển động: bỏ rung, xung, zoom; giữ lóe, số, tiếng, hạt nhẹ.
- Cường độ lóe; tắt tách màu; mật độ hạt; số sát thương bật / tắt / chỉ số lớn.
- Cỡ khung học; hiện / ẩn IPA, nghĩa; âm lượng phát âm riêng.
- Chọn thẻ lên cấp bằng 1/2/3 thay cho gõ từ khóa.

---

## 9. Khác Typing Break thế nào (bản quyền)

| Chỗ dễ giống | Ta làm |
|---|---|
| Hành lang có tường lâu đài, ô súng hộp tím hai bên | Bến súng không gian: ô hình **khoang phóng** có viền neon của họ quái; nền tinh vân, vành đai thiên thạch |
| Tên súng Turret, Fury, Shotgun, Pistol, Sniper, Laser, Flame | Tên riêng: Xung, Tán, Ray, Tia, Sét, Pháo Sao, Nova; nguyên tố Băng, Lửa, Ion, Hư Không |
| Chữ cái khổng lồ đóng dấu lên ô khi gõ | **Mảnh chữ** bay từ ô vào lò năng lượng (chữ ký riêng) |
| Chữ đang gõ màu trắng có vòng tròn ở đáy | Khung học có IPA và nghĩa; vòng chuỗi là **vòng lò** quanh tàu |
| Khối vụn hồng xám nằm trên sàn | Mảnh tinh thể theo màu họ, có phát sáng nhẹ, mờ sau 8 s |
| Thẻ A/B/C có nút "REROLL" | Chọn bằng gõ **từ khóa tiếng Anh** của thẻ (học thêm) |
| Fury chém hồng cả màn | Nova là **vòng chữ** nổ từ lò, mang chữ của cụm từ vừa gõ |

---

## 10. Trả lời 10 câu hỏi của brief (mục J)

1. **Thiếu gì về phản hồi chiến đấu?** Báo trước đòn của quái (vạch đỏ); tiếng xác nhận hạ; phản hồi khi súng **hồi xong** (ô sáng lên, tiếng "tách" nhẹ) để người chơi biết gõ được.
2. **Thiếu gì về học?** Kế hoạch từ mới / ôn (chưa có ở 2D, 3D); "Nghe và gõ" khi nghỉ; tổng kết từ đã học cuối trận; từ khóa thẻ lên cấp; Sinh Tồn và Campaign 3D cần gửi sự kiện học.
3. **Hiệu ứng thừa?** Mờ xuyên tâm cho đòn thường; tách màu ngoài T5 và lúc bị đánh; đèn động cho từng phát đạn; méo nhiệt ở Low, Medium.
4. **Đơn giản hóa gì?** Một bộ rung và một bộ dừng hình thay cho 4; số sát thương một hệ; một bảng bậc Chuỗi; không dùng ECS mới, dùng pool và mảng như TD và Defense.
5. **Riêng hơn bằng cách nào?** Tri thức thành năng lượng (mảnh chữ, lò, Nova bằng cụm từ); súng gắn từ đang học; quái của 8 họ Space Typing; Draconis.
6. **Mạnh hơn bằng cách nào?** Nova là cụm từ: cảm giác "mình nói ra một câu thần chú"; chuỗi nguyên tố đổi luôn hình và tiếng; boss phá theo bộ phận.
7. **Đọc được khi hỗn loạn?** Khung học DOM ngoài canvas; vùng cấm cho số; trần hiệu ứng; số gộp; ô súng không rung.
8. **Làm gì trước?** Bản thử dọc (mục 11, giai đoạn S0): một tàu, một súng, một loại quái, một từ, đủ các lớp phản hồi.
9. **Để sau?** Chế độ giọng nói, méo nhiệt, phá cảnh, cảnh phim boss, hồ sơ phản hồi cho Defense và TD.
10. **Chỗ dễ giống nhất?** Bến súng hai bên với chữ to, thẻ A/B/C, chữ khổng lồ đóng dấu. Xem mục 9.

---

## 11. Lộ trình (khi chủ dự án duyệt)

Mỗi giai đoạn: làm, phản biện độc lập, sửa; có test và kịch bản trình duyệt; changelog riêng.

| Giai đoạn | Làm gì | Xong khi |
|---|---|---|
| **S0 Bản thử dọc** | `survival.html`; sim cố định 60 Hz (tất định); 1 tàu, súng Xung, quái `scout`; `src/feedback/` bản đầu: bậc, trauma, dừng hình, số WebGL, phản ứng quái, mảnh vỡ, đầu nòng, tiếng nhiều lớp; khung học không rung | Một phát bắn cảm thấy "nặng" rõ rệt; chủ dự án xem video quay màn hình và duyệt |
| **S1 Phòng và chuyến** | Phòng 90–120 s, đợt trong phòng; 4 súng (Xung, Tán, Ray, Pháo Sao); 5 hành vi quái; thưởng sau phòng, chọn cửa (Súng, Rèn, Vàng, Lõi, Sửa); 1 Vùng đầy đủ có boss; máu, thua, tổng kết; lưu giữa phòng | Đi hết 1 Vùng (12–15 phút); bot gõ 35 WPM qua Vùng 1 khoảng 60 % số lần |
| **S1b Ấn và Chợ** | 5 Nguồn Ấn, bậc hiếm, Song Ấn; Chợ; Tinh nhuệ; Thử Thách Chữ; tiến hóa súng | Mỗi chuyến có ít nhất 3 kiểu build khác nhau |
| **S2 Gõ thành năng lượng** | Mảnh chữ, lò, Nova cụm từ, Chuỗi, ô nguyên tố, Hoàn hảo | Gõ thấy rõ là nạp sức |
| **S3 Học** | Kế hoạch từ 60/25/15, hiện nghĩa theo độ thuộc, phát âm có nhường tiếng, gửi sự kiện học, Nghe và gõ, tổng kết từ | Từ luôn rõ nhất; kịch bản đo 0 lần số đè khung học |
| **S4 Quái và boss** | 14 hành vi, quái gắn từ, tinh nhuệ, boss bộ phận gắn từ, báo đòn; đủ 4 Vùng và boss cuối | Đi hết một chuyến; 8 họ đều chơi được |
| **S4b Trạm Mẹ** | Tri Thức, Mảnh Sao, cây nâng cấp vĩnh viễn, mở súng và tàu, Độ Sâu Hố Đen, Thư Viện Từ | Chuyến thứ 5 mạnh hơn chuyến đầu rõ rệt; học nhiều thì mạnh nhanh hơn |
| **S5 Âm và nhạc** | Bus, nhường tiếng, 3 stem, tiếng theo bậc, xác nhận hạ | Tai người duyệt |
| **S6 Hiệu năng, trợ năng** | 4 bậc chất lượng 3D, trần, giảm chuyển động, thanh trượt | 350 quái + bão hiệu ứng: p95 ≤ 12 ms; mọi công tắc có tác dụng |
| **S7 Dùng chung** | Campaign 3D và Defense chuyển sang `src/feedback/` | Không mất cảm giác cũ; test cũ xanh |

**Kiểm (mọi giai đoạn):**
- Gõ: chậm (20 WPM), vừa, rất nhanh (120 WPM); sai nhiều; chuỗi hoàn hảo; bộ gõ tiếng Việt đang bật.
- Hình: 1 quái, 350 quái, boss, bão hiệu ứng.
- Học: từ mới, từ quen, từ thuộc; đang phát âm.
- Hiệu năng: Low, High, Ultra.
- Trợ năng: không rung, giảm chuyển động, không lóe.

**Số đo:** độ trễ phím tới hình và tới đòn; khung hình p95; draw call; hạt, số, mảnh vỡ sống; lần dọn rác; số lần số đè khung học (phải bằng 0).

## 12. Câu hỏi cho chủ dự án (đã có mặc định)

1. Sinh Tồn chơi bằng **tàu và Draconis** như Campaign 3D? Mặc định: có, chọn ở Trạm Mẹ.
2. ~~Một trận dài bao lâu?~~ Đã chốt (23/10): chuyến bay nhiều ải, mục 4.0.
3. ~~Có tiến trình ngoài trận không?~~ Đã chốt (23/10): có, Trạm Mẹ (S4b).
4. Thứ tự với TD: Sinh Tồn làm **sau** khi TD 1A.6 xong R2, R3? Mặc định: có, để không chạy hai việc lớn cùng lúc.
5. Có **Chế độ vô tận** sau khi thắng boss cuối (vùng lặp, khó dần mãi)? Mặc định: có, mở sau lần thắng đầu.
6. Có cho chơi lại **một Vùng** riêng để luyện (không tính tiến trình)? Mặc định: chưa.
