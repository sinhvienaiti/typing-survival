# Tuyến Cuối S1 "Chương 1 · Hành Lang VC-7": đặc tả thực thi (24/10/2026)

> **Dành cho:** AI làm code, AI phản biện, chủ dự án (mục 18).
> **Nguồn:** [`SURVIVAL_MODE_PLAN.md`](SURVIVAL_MODE_PLAN.md) (§4.0 Hành Trình, §4.2 súng, §4.5 quái, §4.6 boss, §11 lộ trình S1), [`BUILD_NOTES.md`](BUILD_NOTES.md) (§7 review S0, §8 cân bằng), [`changelog/`](changelog/) (nhất là `2026-10-23-balance.md`), `docs/games/BALANCE.md` ở repo cha (§3 dải đích, §4 đòn bẩy, §6 bot, §7 cổng B1–B9, §9.3).
> **Thứ tự ưu tiên:** mã hiện tại > file này > kế hoạch gốc. Khi file này lệch kế hoạch, mục 1.2 ghi lý do. Các số ghi "khởi điểm" sẽ chỉnh bằng bot; **đích** (mục 11) thì không đổi nếu chưa hỏi chủ dự án.
> **Repo:** `games/typing-survival`, nhánh `main`, chưa có remote. Không đẩy.

## 0. Mục tiêu của S1

S0 trả lời được câu "gõ để nạp đạn, quét biển quái có đã tay không". Nhưng S0 chỉ có **một** quyết định chiến thuật: gõ từ của bến nào. Vì vậy cổng B6 trượt ở Thử thách (+7 điểm, cần +10).

S1 phải trả lời ba câu:

1. **Chọn có nghĩa không?** Năm súng, mỗi súng một kiểu băng đạn. Quái có **khắc chế** thật (Vỏ, khiên, tách, tổ ở xa). Có chọn súng đầu chương, chọn cửa và thưởng giữa các ải, và chọn bến khi đang đánh. Người chơi khéo phải thắng nhiều hơn người chơi vụng cùng tốc gõ, nhưng người vụng vẫn qua được.
2. **Mỗi ải có khác nhau không?** Mười ải của Chương 1, mỗi ải một **Luật Ải** (mục tiêu, hiểm họa, luật học, đội quái), dạy dần từng thứ. Có Mốc ở ải 5 và boss ở ải 10.
3. **Học có còn rõ nhất không?** Có thêm 3 bến, luật Thiếu chữ, luật Nghĩa, từ chặn của boss. Khung học vẫn không rung, không bị số đè, chữ không nhỏ hơn S0.

## 1. Hiện trạng và lệch kế hoạch

### 1.1 Mã hiện tại (giữ, xây tiếp)

| Phần | Có gì (mã `main`, `00ed734`) |
|---|---|
| Sân | Hành lang 24 × 40 m (`FIELD.gateZ` 40; kế hoạch ghi 60 m, review S0 đổi). Camera 36°, ống kính 42°. Vạch đáy z 2,4, nòng z 1,7 |
| Súng | 2 bến cố định: **Xung** (24 viên / 2,4 s, 7 sát thương, tầm 10 m) và **Tia** (tia 12 m, rộng 1,4 m, 2,5 s, 6 mỗi nhịp 0,1 s). Gõ xong từ nạp 1 băng, tối đa 2. Chuẩn: ×1,06 và chí mạng +4 %; Nhanh: tốc bắn ×1,15 |
| Quái | Bầy (`mine`, 14 HP), Lính (`scout`, 56 HP, đứng 6–9 m bắn tàu). Thuộc tính tinh anh "Giáp" (HP ×2) do bộ điều nhịp thêm hoặc bớt |
| Ải | Một ải 180 s: đoàn tiên phong, nhịp thường × triều, 2 đỉnh tràn (27 % là "dữ dội"), quãng lặng |
| Cân bằng | Đầu trận `{mode, pace, expected, director}`; k 0,75–1,30; vùng hút giáp từ 16 m; FlowMeter, PaceDirector (bậc `spawn`, `elite`, `peak`, `lull`, `support`); 3 chế độ; bot gõ giống người qua `installKeys`; `pnpm survival:balance` in §3 và B1–B9 |
| Kết quả cân bằng S0 | B1–B5, B7, B8 đạt; **B6 trượt** ở Thử thách (+7); B9 thiếu số; Q ≈ 77 % (tầm súng ngắn); N thấp ở Cân bằng |
| Hình, tiếng | Kit `feedback` (bậc T0–T5, rung, dừng hình, số WebGL, mảnh vỡ); chủ đề "Vành Chân Trời"; âm tổng hợp bằng mã qua `SceneAudio`; 25 id âm trong `docs/audio/THEME_SOUND_LIST.md` |
| Hiệu năng | Đỉnh ~170 quái: khung TB 0,72 ms, p95 1,3 ms; `flood(700)` p95 1,4–1,5 ms; 37–38 draw call |
| Mã | ~6.100 dòng (chưa kể `src/kit`); `src/app/main.ts` 656 dòng |

Model sẵn có của họ `rainbow` qua `/assets/space-typing/models/`: `mine`, `scout`, `tank`, `shield`, `splitter`, `carrier`, `healer`, `commander`, `jammer`, `leech`, `cloaker`, `destroyer`, `oppressor`, `sniper`, cùng boss `warden-rainbow` và `lieutenant-rainbow`. Lưu ý: `rainbow-tank` và `rainbow-scout` đang là **bản sao tạm** của model họ `prism` (chủ dự án có thể làm lại).

### 1.2 S1 làm khác kế hoạch ở đâu

| Kế hoạch gốc | S1 làm | Vì sao |
|---|---|---|
| S1 làm Chương 1–3 | **Chương 1** (10 ải). Chương 2–3 và bộ sinh ải chuyển sang S1b | Yêu cầu của bước này. Ưu tiên một chương thật kỹ hơn ba chương thô (chủ dự án từng loại bản "thô"). Ma trận bot cho 10 ải × 3 chế độ × 100 seed sẽ mất khoảng 30–40 phút |
| "Máu giữ qua các ải, không tự hồi" | **Giáp đầy lại ở đầu mỗi ải.** Thứ giữ qua chương là **Lõi Trạm** (số mạng), Giáp tối đa, bộ súng, cấp Rèn, sao | Dải BALANCE §3 tính theo **ải**. Ở Cân bằng, bot Chuẩn mất khoảng 46 % giáp mỗi ải. Nếu cộng dồn qua 10 ải thì hoặc ải phải dễ đến nhàm, hoặc chương không qua nổi. Lõi Trạm vẫn giữ được cái giá của thua |
| Thưởng "Vàng" và Chợ | **Bỏ Vàng khỏi S1.** Vàng và Chợ đi cùng nhau ở S1b | Có vàng mà không có chỗ tiêu thì không có quyết định nào |
| Cửa có biểu tượng thưởng của **ải sau** (kiểu Hades) | Chọn cửa xong **nhận thưởng ngay**, rồi vào ải kế | Các ải trong chương cố định, nên chọn cửa chỉ là chọn thưởng. Hoãn thưởng chỉ thêm việc ghi sổ |
| "Sửa: hồi 30 % máu", "Lõi: +máu tối đa" | **Sửa:** +1 Lõi Trạm. **Lõi:** +10 Giáp tối đa | Theo nghĩa mới của giáp ở trên |
| Thử thách: không có Mốc | **Mọi chế độ đều có Mốc** ở S1 | Nếu không có Mốc: ở Thử thách mỗi ải thắng 50–75 %, có 3 Lõi, thì qua cả chương lần đầu chỉ khoảng 15 % (mục 11.4). "Không Mốc" sẽ là một tùy chọn Độ Sâu Hố Đen (S4b) |
| Thư viện bản đầu: 4 Mục tiêu, 4 Hiểm họa, 3 Luật học | **3 Mục tiêu + Boss, 3 Hiểm họa, 3 Luật học.** Chỉ làm những gì Chương 1 dạy | Chương 1 dạy mỗi ải một thứ mới (§4.0b "dạy dần"). Món nào chưa dùng ở Chương 1 thì làm cùng Chương 2–3 |
| 4 súng (Xung, Tán, Ray, Pháo Sao) | **5 súng**: giữ Tia của S0 | Tia đã có, đã cân bằng, và là súng cắt cụm tốt nhất |
| Boss bộ phận gắn từ (S4) | **Boss 3 pha và từ chặn** (một từ báo trước để chặn đòn lớn). Chưa có bộ phận gắn từ | Bộ phận gắn từ cần hệ quái gắn từ (S4). Từ chặn thì đã dùng được yếu tố 9 "phản xạ báo trước" của BALANCE |
| Thuộc tính tinh anh "Giáp" | Đổi tên thành **"Bọc Thép"** (vẫn HP ×2) | Tránh trùng với thanh GIÁP của tuyến và chỉ số **Vỏ** mới của quái |
| Ô súng tối đa 6, mở dần | S1: **2 bến**, mở **bến 3** khi qua Mốc | Chữ ô súng phải ≥ 26 px ở 1280×720. Bố cục 4 cột vừa với 3 bến và khung học |
| Kho Vũ Khí, mở súng (S4b) | Cả 5 súng **mở sẵn** để chọn đầu chương | Chưa có Trạm Mẹ |

## 2. Phạm vi

| Trong S1 | Ngoài S1 (để sau) |
|---|---|
| Súng mới: **Tán, Ray, Pháo Sao**, mỗi súng một kiểu băng đạn, có đủ đầu nòng, đạn, va chạm, hạ | Nhánh băng đạn khi Rèn, Ấn, Song Ấn, tiến hóa (S1b); ô nguyên tố (S2) |
| Bến 2–3, chọn 2 súng đầu chương, Rèn cấp 1–3, "Băng Hoàn hảo xuyên Vỏ" | Bến 4–6, Kho Vũ Khí, cấp vĩnh viễn (S4b) |
| Quái mới: **Trâu** (Vỏ), **Khiên**, **Tách**; biến thể **Đầu Đàn**; **Tổ** (vật thể đẻ quái); boss **Cai Ngục** | 9 hành vi còn lại, quái gắn từ, tinh nhuệ theo biến thể (S4) |
| Mục tiêu: **Trụ vững, Săn Đầu Đàn, Phá Tổ, Boss** | Giữ trạm, hộ tống, nhặt tinh thể, gỡ bom bằng từ, chặn hai đầu, Quét Triều (S1b, S4) |
| Hiểm họa: **Vết nứt, Bão ion, Giếng hấp dẫn** | Mưa thiên thạch, sương tinh vân, Lóa chân trời, tường di động… (S1b, S4) |
| Luật học: **Chuẩn, Thiếu chữ, Nghĩa** | Nghe, Cụm từ, Từ loại, Chủ đề (S3, S4) |
| **Chương 1** (10 ải), Mốc, boss, Lõi Trạm, cửa (Súng, Rèn, Lõi, Sửa), chọn cửa bằng gõ từ khóa, sao, lưu giữa ải, chơi lại ải lấy sao, tổng kết chương | Chương 2–3, bộ sinh ải, 600 ải, Vàng, Chợ, Tinh nhuệ, Thử Thách Chữ (S1b, S4) |
| Bot chọn súng, cửa, thưởng, bến theo khắc chế; báo cáo **theo ải** và **theo chương**; cổng B1–B9 và G1–G8 | Hiệu chỉnh theo người thật (B9) cần chủ dự án chơi |
| Âm tổng hợp bằng mã cho mọi id mới | File âm thật (theo `THEME_SOUND_LIST.md`, sau khi chủ dự án nghe) |

## 3. Luật không đổi

- **Sim tất định:** cố định 60 Hz, TS thuần, không DOM, không đồng hồ, không `Math.random`, không lượng giác, không lũy thừa ngoài căn bậc hai. Hướng nón của Tán viết sẵn thành hằng số (cặp cos, sin dạng số), không gọi `Math.cos` khi nạp module. Cùng seed, cùng phím, cùng **đầu trận** (nay có thêm ải và bộ súng) phải ra cùng mã băm ở Node và Chrome.
- **Kit:** không sửa tay `src/kit`. S1 dự kiến **không cần đổi kit**. Nếu thật sự cần (ví dụ một kiểu số mới trong `feedback/numbers`), sửa ở `shared/game-kit` kèm test, giữ tương thích ngược, rồi chạy `node scripts/sync-game-kit.mjs --target games/typing-survival` ở repo cha. **Không đụng `shared/game-kit/typing`**: một workflow khác đang sửa module đó, và phần gõ của game này nằm ở `src/sim/words.ts`.
- **Không media trong Git.** Không dựng model nhân vật, quái, công trình, đồ vật bằng mã. Quái, tổ, boss dùng model của thư viện Space (thiếu thì dùng khối giữ chỗ như S0). Khiên, vết nứt, giếng, tia, nổ là **hiệu ứng** bằng shader và hạt (được phép).
- **Phím không bao giờ bị nuốt**, kể cả khi đang dừng hình, khi bến bị Bão ion làm tê, hay khi đang có từ chặn.
- **Học luôn rõ nhất:** khung học và các bến là DOM ngoài canvas, không rung. Chữ của từ trên bến ≥ 26 px ở 1280×720, tương phản ≥ 7 : 1. 0 số sát thương đè lên vùng cấm.
- Không đổi hồ sơ gõ, nhịp k, bộ điều nhịp của kit. Game chỉ cấp **bảng bậc theo ải**.
- Chú thích trong mã bằng tiếng Anh, ngắn. Tài liệu tiếng Việt có dấu. Mỗi đợt (R1, R2, R3) có `docs/changelog/<ngày>-s1-r<n>.md`.
- Máy 16 GB RAM, nhiều agent chạy cùng lúc: mỗi lần chỉ **một** dev server (`npx vite --host 127.0.0.1 --port 3047 --strictPort`) và **một** Chrome. Tắt mọi tiến trình đã mở khi xong. Cổng 3007 vẫn là cổng mặc định của game.

## 4. Chương và ải

### 4.1 Cấu trúc

```text
Màn chính ─▶ Hành Trình ─▶ Bản đồ Chương 1 ─▶ Nạp súng (chọn 2 trong 5)
   ┌───────────────────────────────────────────────────────────────┐
   ▼                                                               │
 Bảng tin ải ─▶ Trận (2–4 phút) ─▶ Kết ải (sao) ─▶ Chọn cửa ─▶ Nhận thưởng ─┘
                    │ thua: −1 Lõi Trạm, chơi lại ải này (seed mới, cùng bộ súng)
                    └─ hết Lõi: chương vỡ → về Mốc (nếu đã qua ải 5) hoặc về đầu chương
 Ải 5 = Mốc (lưu bộ đồ, mở bến 3) · Ải 10 = Boss · Qua ải 10: Tổng kết chương
```

| Khái niệm | Luật |
|---|---|
| **Giáp** (thanh GIÁP) | Đầy lại ở đầu mỗi ải, bằng **Giáp tối đa** (100 ở đầu chương, +10 mỗi thưởng Lõi, trần 140). Hết giáp thì thua ải |
| **Lõi Trạm** | Số lần được thua trong chương: Thư giãn 4, Cân bằng 3, Thử thách 3. Thua một ải thì −1 Lõi và chơi lại ải đó với seed mới, cùng bộ súng. Còn 0 Lõi mà thua nữa thì **chương vỡ** |
| **Mốc** (ải 5) | Qua ải 5 thì lưu ảnh chụp bộ đồ (súng, cấp, số bến, Giáp tối đa). Chương vỡ sau Mốc thì chơi lại từ ải 6 với ảnh chụp đó, Lõi đầy lại. Chương vỡ trước Mốc thì làm lại từ đầu chương, chọn súng lại |
| **Bến** | 2 bến từ đầu chương. Qua Mốc thì mở **bến 3** và được chọn ngay 1 trong 3 súng để đặt vào (ngoài phần thưởng của cửa) |
| **Sao** | Mỗi ải 3 sao: ★ thắng · ★ giáp còn ≥ 50 % Giáp tối đa · ★ độ chính xác ≥ 95 %. Lưu theo ải và chế độ. Ải đã qua chơi lại được (chọn súng tự do, không ảnh hưởng chương) để lấy sao và ôn từ |
| **Lưu giữa ải** | `survival.journey` (JSON, phiên bản 1): chương, chế độ, seed chương, ải, lần thử, bộ súng và cấp, số bến, Giáp tối đa, Lõi, sao, ảnh chụp Mốc. Lưu ở màn Chọn cửa và Bảng tin ải. Thoát ở đó thì lần sau "Tiếp tục hành trình" về đúng chỗ |
| Bỏ dở giữa trận | Tính là thua ải (−1 Lõi). Hồ sơ gõ ghi là "bỏ dở" như S0 (không đổi số đo). Có hỏi lại trước khi thoát |

- **Chế độ** (Thư giãn, Cân bằng, Thử thách) chọn khi bắt đầu chương. Đổi chế độ thì bắt đầu chương mới.
- **Seed:** seed chương rút một lần khi bắt đầu chương. Seed của ải = hàm trộn (seed chương, số ải, lần thử). Mỗi trận vẫn là một replay riêng có đầu trận đầy đủ.

### 4.2 Bản đồ, bảng tin, nạp súng (DOM, bàn phím trước)

- **Bản đồ chương:** 10 nút trên một đường ray thép. Mỗi nút có biểu tượng mục tiêu, hiểm họa, luật học, sao đã có, và một dấu "MỐC" hoặc "BOSS". Có đèn LED Lõi Trạm và tóm tắt bộ súng (tên, cấp, bến). Người chơi thấy trước cả chương để tính đường.
- **Bảng tin ải:** tên ải, mục tiêu có số ("Hạ 3 trong 5 Đầu Đàn"), hiểm họa và cách báo trước, luật học, danh sách quái kèm thẻ khắc chế ("Trâu · Vỏ 4 · khắc: Ray, Pháo Sao"). Súng trong bộ đồ khắc được quái nào thì sáng lên; quái chưa có súng khắc thì có dấu cảnh báo vàng. Enter vào trận.
- **Nạp súng** (đầu chương, hoặc khi chơi lại một ải): 5 thẻ súng. Chọn bằng phím 1–5 hoặc ← →, Enter chọn hoặc bỏ chọn, đủ 2 thì Bắt đầu. Mỗi thẻ ghi kiểu băng, tầm, khắc gì, bị gì khắc, độ dài từ ("+1 chữ").
- **Kho súng** ở màn chính (trước đây là giữ chỗ) nay hiện đủ 5 thẻ với số lấy từ `content/guns.ts`.

## 5. Súng và băng đạn

### 5.1 Năm súng (cấp 1, số khởi điểm)

| Súng | Kiểu băng (một băng) | Tầm | Sát thương | Vỏ | Khiên | Từ | Vai |
|---|---|---|---|---|---|---|---|
| **Xung** (S0) | 24 viên trong 2,4 s, liên thanh vào quái gần vạch nhất trong nón 50°; bắn rơi đạn lính trước | 10 m | 7 mỗi viên | tính đủ | bị chặn | dải E | Dọn bầy sát tuyến, chặn đạn lính |
| **Tia** (S0) | Tia 12 m, rộng 1,4 m, cháy 2,5 s, nhịp 0,1 s, quét 3 m/s từ cụm dày sang cụm kế | 12 m | 6 mỗi nhịp, mọi quái trong tia | tính đủ | đốt khiên trước (sát thương vào khiên), khiên vỡ thì xuyên qua | dải E | Cắt cụm dày, cắt hàng |
| **Tán** (mới) | 6 loạt trong 2,0 s; mỗi loạt 7 viên xòe trong nón ±18°; **đẩy lùi** 0,35 m mỗi viên trúng (không đẩy Trâu, Đầu Đàn, Tổ, Boss) | 7 m | 5 mỗi viên | tính đủ | bị chặn | dải E | Chặn tràn sát vạch, giảm rỉ giáp, dọn mảnh của Tách |
| **Ray** (mới) | 3 phát trong 2,4 s, mỗi phát nạp 0,15 s rồi bắn tức thì; **xuyên** tối đa 6 quái trên một đường, mỗi quái xuyên qua thì sát thương ×0,85. Ưu tiên: Đầu Đàn > Tổ > Boss > Trâu > Khiên > Lính > đường có nhiều quái nhất | 30 m | 70 mỗi quái | **× 0,25** | phá khiên ngay (khiên tính là một quái bị xuyên) | dải E **+1 chữ** | Hạ quái to, Tổ, Đầu Đàn ở xa; xiên hàng |
| **Pháo Sao** (mới) | 6 quả trong 3,0 s, bay vòng 0,7 s, nổ bán kính 3 m vào cụm nặng nhất (tính theo HP) ở 8–24 m | 8–24 m | 26 ở tâm, giảm đều còn 13 ở mép | tính đủ | **bỏ qua** (rơi từ trên xuống) | dải E **+1 chữ** | Đánh cụm, đánh toán có khiên, đánh Tổ; vô dụng khi quái đã sát vạch (dưới 8 m) |

- **Vỏ** của quái: mỗi đòn trừ Vỏ, còn ít nhất 1. Ray chỉ tính Vỏ × 0,25.
- **Chất lượng gõ** (giữ số của S0): Chuẩn (0 lỗi) thì sát thương ×1,06 và chí mạng +4 %. Nhanh (≤ 0,7 thời gian mong đợi) thì tốc bắn ×1,15. **Hoàn hảo** (cả hai) thêm luật mới: **Băng Hoàn hảo xuyên Vỏ**, Vỏ chỉ tính × 0,5 (với Ray là × 0,125). Gõ chuẩn thì đòn sạch hơn, đúng tinh thần "tri thức thành năng lượng". Cổng B4 (chuẩn thắng ẩu) mạnh thêm.
- **Rèn** (thưởng trong chương): cấp 2 thì sát thương mỗi đòn ×1,2. Cấp 3 thì ×1,4, và súng giữ tối đa **3 băng**. Vì Vỏ trừ thẳng, Rèn có lợi nhất cho súng đòn nhỏ: Xung cấp 3 bắn Trâu được 5,8 mỗi viên thay vì 3.
- **Độ dài từ:** bảng `LENGTH_BY_E` như S0. Súng nặng (Ray, Pháo Sao) lấy từ **dài hơn 1 chữ**, trần 9 chữ, để băng mạnh phải trả bằng nhiều phím hơn. Mọi bến dùng chung một danh sách "đã dùng" (không lặp từ trước khi hết dải). Chữ đầu của mọi từ đang hiện (các bến và từ chặn) luôn khác nhau.
- **Bến:** mỗi bến một súng. Bến có súng đã đầy băng thì gõ từ của nó cũng không nạp được gì (như S0). Thay súng (thưởng Súng) thì súng cũ mất cấp Rèn.

### 5.2 Bảng khắc chế (dữ liệu `COUNTERS`, dùng cho bảng tin, thẻ súng và bot)

| Quái ↓ / Súng → | Xung | Tia | Tán | Ray | Pháo Sao |
|---|---|---|---|---|---|
| Bầy (xa) | ○ | ● | ✕ | ○ | ● |
| Bầy (sát vạch) | ● | ● | ● | ○ | ✕ |
| Lính và đạn lính | ● (bắn rơi đạn) | ○ | ○ | ● | ○ |
| Trâu, Đầu Đàn (Vỏ) | ✕ | ✕ | ✕ | ● | ● |
| Khiên (và toán sau khiên) | ✕ | ○ | ✕ | ● | ● |
| Tách và mảnh | ○ | ● | ● | ✕ | ● |
| Tổ (xa) | ✕ | ○ (khi Tổ bò tới gần) | ✕ | ● | ● |
| Boss Cai Ngục | ○ | ○ | ✕ | ● | ○ |

● khắc · ○ được · ✕ kém. Không súng nào ● ở mọi hàng. Mỗi súng ● ở ít nhất hai hàng (cổng G2, G3).

## 6. Quái

| Loại | Model (`rainbow-…-3d`) | HP | Vỏ | Tốc (m/s) | Bán kính | Chạm vạch | Rỉ giáp (trọng số) | Hành vi |
|---|---|---|---|---|---|---|---|---|
| **Bầy** (S0) | `mine` | 14 | 0 | 2,6 | 0,5 | −3 | 1 | Như S0: đi theo trường hướng, chậm dần khi áp sát |
| **Lính** (S0) | `scout` | 56 | 0 | 1,8 | 0,8 | −6 | 2 | Đứng 6–9 m, bắn đạn −3 mỗi 3 s, đi tiếp sau 12 s |
| **Trâu** | `tank` | 240 | 4 | 1,25 | 1,1 | −12 | 4 | Chậm, nặng: đẩy bầy sang bên (khối lượng 4), không bị Tán đẩy lùi. Thường đi đầu một toán 5 bầy |
| **Khiên** | `shield` | 80 + khiên 100 | 0 | 1,9 | 0,9 | −6 | 2 | **Khiên năng lượng** quay về phía tàu: đoạn chắn rộng 2,6 m đặt 0,8 m trước thân. Đạn Xung và viên Tán chạm đoạn chắn thì dừng (0 sát thương), nên cả **toán đi sau** nó cũng được che. Ray phá khiên ngay; Tia đốt khiên; Pháo Sao bỏ qua. Khiên vỡ thì không hồi. Đi đầu một toán 6 bầy hình nêm |
| **Tách** | `splitter` | 42 | 0 | 2,2 | 0,7 | −4 | 1,5 | Chết thì vỡ thành **3 mảnh** (bầy nhỏ: 9 HP, 3,0 m/s, bán kính 0,4, chạm vạch −2, rỉ 0,5) văng ra ±1,2 m |
| **Đầu Đàn** | `tank` + đèn hiệu | 360 | 3 | 1,1 | 1,3 | **−15** | 6 | Mục tiêu của "Săn". Có toán hộ tống 8 bầy đi trước. Có đèn hiệu vàng và vạch dọc trên sàn để thấy từ xa |
| **Tổ** | `carrier` (đứng yên, bò) | 800 | 2 | bò 0,2 | 1,8 | — | 0 | Mục tiêu của "Phá Tổ". Xuất hiện ở z 30–36, bò tới z 10 thì dừng. Đẻ 6 bầy mỗi 7 s, khoảng đẻ ngắn dần còn 3,5 s ở giây 180 (× chế độ × k, × bậc `spawn` của bộ điều nhịp) |
| **Boss Cai Ngục** | `warden-rainbow` (dùng clip ra mắt, trúng, chết nếu model có) | 5.000 | 4 | 0,35 | 2,6 | không chạm (dừng ở 10 m) | 8 khi trong 16 m | Mục 7.4 |

- Thuộc tính tinh anh **Bọc Thép** (tên mới của "Giáp" ở S0) vẫn là HP ×2 cho cả toán, do bộ điều nhịp thêm hoặc bớt. Không bao giờ áp lên Đầu Đàn, Tổ, Boss.
- Quái to (bán kính > 0,9: Trâu, Đầu Đàn, Tổ, Boss) nằm trong một **danh sách riêng** (tối đa 32), thử va chạm tuyến tính. Lưới 2 m vẫn giữ `MAX_RADIUS` 0,9 cho đám đông, để truy vấn không nở ra.
- Khiên là một **danh sách đoạn chắn** (tối đa 32). Đạn Xung, viên Tán thử đoạn chắn trước rồi mới thử thân quái. Xung **chọn mục tiêu khôn**: bỏ qua quái mà đường bắn bị khiên chặn, để không phí băng.

## 7. Luật Ải: thư viện S1

### 7.1 Mục tiêu

| Mục tiêu | Thắng khi | Thua khi | Số khởi điểm |
|---|---|---|---|
| **Trụ vững** (S0) | Hết giờ mà còn giáp | Hết giáp | 150–180 s |
| **Săn Đầu Đàn** | Hạ đủ N trong M Đầu Đàn. Ngay lúc đó **bầy rút lui**: quái còn lại mờ đi trong 2 s, không gây hại nữa, ải kết thúc | Hết giáp, hoặc số Đầu Đàn lọt qua vạch > M − N | Ải 2: 3/5, đến ở giây 20, 50, 80, 110, 140. Ải 7: 4/6, đến mỗi 25 s từ giây 20. Trần an toàn 240 s |
| **Phá Tổ** | Hạ hết Tổ. Bầy rút lui như trên | Hết giáp, hoặc tới trần 300 s ("Tổ nở", thua) | Ải 5: 2 Tổ. Ải 8: 3 Tổ. Luồng thường của ải vẫn chạy, ở mức thấp |
| **Boss** | Hạ boss | Hết giáp | Mục 7.4 |

### 7.2 Hiểm họa (luôn báo trước ≥ 2,5 s bằng hình và tiếng)

| Hiểm họa | Nặng / nhẹ | Luật | Quyết định của người chơi |
|---|---|---|---|
| **Vết nứt** | nhẹ | Chu kỳ 30 s (ải 7: 35 s), lần đầu ở giây 25. Báo trước 2,5 s: vết nứt sáng cam trên tường trái hoặc phải (theo seed), ở z 9–13. Rồi đổ ra 8 bầy (× chế độ × k, kẹp 4–12) trong 1 s, ngay trong tầm súng | Giữ một súng gần (Xung, Tán) có băng khi sắp tới lượt nứt. Pháo Sao vô dụng ở cự ly này |
| **Bão ion** | nặng | Chu kỳ 30 s, lần đầu ở giây 20. Báo trước 2,5 s: bến sắp bị chọn (theo seed, không trùng bến lần trước) chớp lam và đếm ngược. Rồi bến đó **tê 6 s**: súng của nó ngừng bắn, băng và thời gian băng đứng yên. **Vẫn gõ được**, và từ gõ xong vẫn nạp vào băng chờ | Nạp các bến khác trong lúc báo trước; đừng tiêu từ vào bến đang tê. Chữ trên bến tê **vẫn rõ** (chỉ khung bến có nhiễu điện) |
| **Giếng hấp dẫn** | nặng | Một giếng ở x = ±4 (theo seed), z = 18, bán kính 8 m. Kéo quái về tâm 1,2 m/s × (1 − r/8), làm quái **dồn cụm**. Bẻ đạn Xung và viên Tán bằng gia tốc 60 m/s² × (1 − r/8)², nên trượt nhiều. Ray, Tia không bị bẻ. Quả Pháo Sao rơi lệch 1 m về tâm | Súng vùng (Pháo Sao, Tia, Tán) mạnh lên; Xung yếu đi khi bắn qua giếng |

- Hiểm họa nặng: giảm 50 % xác suất "đỉnh tràn dữ dội" của ải đó, để không chồng hai cú sốc.

### 7.3 Luật học

| Luật | Trên bến | Trong khung học | Độ quen cho nhịp k (d) |
|---|---|---|---|
| **Chuẩn** (S0) | Từ (to) + nghĩa (nhỏ) | Đang gõ: từ, IPA, nghĩa. Xong: "từ · nghĩa ✓" 0,6 s | `known` |
| **Thiếu chữ** | Từ có 1 chữ ẩn (từ ≤ 6 chữ) hoặc 2 chữ ẩn (≥ 7 chữ), hiện thành ô "_". **Không bao giờ ẩn chữ đầu** (khóa bến cần nó), không ẩn hai chữ liền nhau. Chữ ẩn chọn bằng luồng `words` (tất định) | IPA và nghĩa luôn hiện để gợi nhớ. Gõ tới đâu chữ hiện tới đó | `learning` |
| **Nghĩa** | **Nghĩa tiếng Việt** (to, ≥ 22 px ở 720p) + chữ đầu tiếng Anh và số ô chữ ("h · · · ·") | Đang gõ: nghĩa và các chữ đã gõ. IPA và từ đầy đủ chỉ hiện khi gõ xong, kèm phát âm | trộn `new` 0,6 + `learning` 0,4 |

- Nhịp k của ải tính lại theo d của luật học (`familiarityMix`, `paceK` của kit), nên ải Nghĩa tự thưa hơn mà không cần số riêng.
- Ràng buộc: luật học khó (Thiếu chữ, Nghĩa) không đi chung với hiểm họa nặng trong một ải.
- Hồ sơ gõ: trận có luật Thiếu chữ hoặc Nghĩa **không cập nhật E và CV** (gõ theo trí nhớ chậm hơn thật), chỉ ghi độ chính xác và thời gian nhận từ theo độ quen.

### 7.4 Boss Cai Ngục (ải 10)

| Pha | HP | Boss làm gì | Hộ tống | Đòn Sập |
|---|---|---|---|---|
| Ra mắt | — | Ở giây 20 bước qua cổng. Camera zoom chậm 6 % trong 2 s. Biển "CAI NGỤC · BẦY HỐ ĐEN". Thanh máu boss ở giữa trên, có vạch chia pha | — | — |
| P1 | 100–66 % | Đi tới z 22 rồi đứng | 6 bầy mỗi 8 s từ hai bên boss | mỗi 20 s |
| P2 | 66–33 % | Gầm, sóng chấn (T4); đi tới z 15 | Thêm một toán Khiên mỗi 16 s | mỗi 17 s |
| P3 | < 33 % | Cuồng nộ; đi tới z 10 | Tách mỗi 10 s. "Gầm": hộ tống nhanh thêm 20 % trong 5 s, mỗi 20 s | mỗi 14 s |

- **Đòn Sập** báo trước bằng một **làn đỏ** có sọc cảnh báo trên sàn, từ boss tới vạch, và một **từ chặn** (3–5 chữ, từ đã thuộc, chữ đầu khác mọi bến). Từ chặn hiện trên một dải đỏ riêng, ngay trên khung học. Khung học không bị che.
  - Thời gian báo trước: 3,0 s × 1/k, kẹp trong 2,5–4,0 s (Thư giãn luôn 4,0 s).
  - Gõ kịp: "CHẶN!", lóe khiên ở vạch (T3), không mất gì.
  - Không kịp: −10 giáp (Thư giãn −5, Thử thách −14) và đòn T4 vào tuyến.
  - Đang gõ dở một bến mà muốn chặn thì phải gõ xong hoặc Backspace về 0. Đó là một quyết định thật (yếu tố 9 "phản xạ báo trước" của BALANCE §2).
- Boss không bị Bọc Thép. HP boss chỉnh sao cho bộ đồ tham chiếu ải 10 hạ boss trong 150–240 s (G6).

### 7.5 Ràng buộc của chương (`checkChapter`, test)

1. Không hai ải trong chương có cùng bộ ba (Mục tiêu, Hiểm họa, Luật học).
2. Mỗi thứ mới (quái, mục tiêu, hiểm họa, luật học) xuất hiện lần đầu ở một ải có tên trong cột "Dạy" (mục 8). Chưa dạy thì chưa dùng.
3. Mỗi ải dạy tối đa **một** cơ chế mới (mục tiêu, hiểm họa hoặc luật học) và tối đa **một** quái mới.
4. Luật học khó không đi với hiểm họa nặng.
5. Ải dựng tay: ải 5 (Mốc) và ải 10 (Boss).

## 8. Chương 1 "Hành Lang VC-7" (họ `rainbow` dưới lớp Bầy Hố Đen)

Số ở k = 1, Cân bằng, là **khởi điểm**. Đỉnh tràn vẫn nhân sức rút từ seed như S0, xác suất "dữ dội" 15 % ở ải 1–3 và 25 % ở ải 4–9. Mọi nhịp nhân hệ số của chế độ và k.

| # | Tên | Mục tiêu | Hiểm họa | Luật học | Toán (tỉ lệ toán) | Nhịp thường (con/s) | Đỉnh tràn (giây) | Dài / trần | Dạy | Bộ đồ tham chiếu |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Ca trực đầu | Trụ vững | — | Chuẩn | bầy 85 · lính 15 | 2,9 | 50, 115 | 150 s | luồng, 2 bến | 2 bến cấp 1, giáp 100 |
| 2 | Đầu Đàn | Săn 3/5 | — | Chuẩn | bầy 80 · lính 12 · trâu 8 | 2,6 | 70 | trần 240 s | Trâu, Vỏ, Săn | như ải 1 |
| 3 | Vách nứt | Trụ vững | Vết nứt | Chuẩn | bầy 80 · lính 12 · trâu 8 | 2,8 | 55, 140 | 165 s | Vết nứt | như ải 1 |
| 4 | Khiên sáng | Trụ vững | — | Thiếu chữ | bầy 75 · lính 12 · khiên 13 | 2,7 | 55, 140 | 165 s | Khiên, Thiếu chữ | 1 súng cấp 2 |
| 5 | Tổ ngầm (**Mốc**, dựng tay) | Phá 2 Tổ | — | Chuẩn | bầy 70 · lính 10 · trâu 10 · khiên 10, cộng bầy do Tổ đẻ | 1,6 | — (Tổ đẻ dồn dần); giây 40 có "Đoàn hộ tổ": 1 trâu + 2 khiên | trần 300 s | Phá Tổ | 1 súng cấp 2, giáp 110 |
| 6 | Bão ion | Trụ vững | Bão ion | Chuẩn | bầy 75 · lính 10 · khiên 7 · trâu 8 | 2,9 | 50, 135 | 165 s | Bão ion, bến 3 | 3 bến, 1 súng cấp 2, giáp 110 |
| 7 | Bầy tách | Săn 4/6 | Vết nứt | Chuẩn | bầy 70 · tách 14 · trâu 8 · lính 8 | 2,7 | 80 | trần 240 s | Tách | 3 bến, 2 súng cấp 2, giáp 110 |
| 8 | Giếng đen | Phá 3 Tổ | Giếng hấp dẫn | Chuẩn | bầy 70 · tách 12 · khiên 10 · lính 8 | 1,8 | — | trần 300 s | Giếng hấp dẫn | 3 bến, cấp 2/2/1, giáp 120 |
| 9 | Lời của trạm | Trụ vững | Vết nứt | Nghĩa | bầy 65 · lính 10 · trâu 9 · tách 9 · khiên 7 | 3,0 | 55, 120, 160 | 180 s | Nghĩa | 3 bến, cấp 3/2/1, giáp 120 |
| 10 | Cai Ngục (**Boss**, dựng tay) | Boss | — | Chuẩn | boss + hộ tống theo pha | 1,6 (20 s đầu) | — (Đòn Sập) | đến khi xong | Boss, từ chặn | 3 bến, cấp 3/2/2, giáp 120 |

- Bộ ba (Mục tiêu, Hiểm họa, Luật học) của 10 ải đều khác nhau. Thiếu chữ (ải 4) và Nghĩa (ải 9) chỉ đi với "không" hoặc Vết nứt (nhẹ).
- **Răng cưa:** áp lực tăng dần từ ải 1 đến ải 5, giảm nhẹ ở ải 6 (vừa qua Mốc, có bến 3), rồi tăng tới boss. Sức tăng đến từ cơ chế mới và thành phần quái, không phải từ máu quái.
- **Bộ đồ tham chiếu** dùng cho ma trận theo ải (mục 11.3): số bến, cấp Rèn, Giáp tối đa mà một người chơi "Vừa" thường có ở ải đó. Súng thì bot tự chọn theo chiến thuật của nó (mục 11.2).
- Từ vựng: cấp 1–3 của kho như S0 (kế hoạch từ mới / ôn theo độ thuộc là S3).
- **Trận thử** (ải S0 nguyên bản) vẫn ở màn chính để chơi nhanh. Các kịch bản S0 (`fight`, `perf`, `keys`, `frames`) chạy trên nó để giữ đường hồi quy.

## 9. Cửa và thưởng

| Cửa | Từ khóa gõ | Thưởng (nhận ngay) | Khi nào được mời |
|---|---|---|---|
| **Súng** | `arms` | Chọn 1 trong 3 súng chưa có. Đặt vào bến trống, hoặc thay một súng (súng cũ mất cấp Rèn) | Còn súng chưa có |
| **Rèn** | `forge` | +1 cấp cho một súng (trần cấp 3) | Có súng chưa tới cấp 3 |
| **Lõi** | `core` | +10 Giáp tối đa (trần 140) | Giáp tối đa < 140 |
| **Sửa** | `repair` | +1 Lõi Trạm (trần theo chế độ) | Đã mất ít nhất 1 Lõi |

- Sau ải 1–4: mời **2 cửa**. Sau ải 5–8: mời **3 cửa**. Sau ải 9: mời 2 cửa trong {Rèn, Lõi, Sửa} (chuẩn bị đánh boss).
- Ải 5 (Mốc) còn có thưởng riêng: mở bến 3 và chọn 1 trong 3 súng cho bến đó.
- Rút cửa bằng luồng `loot` từ seed chương, trọng số Súng 30 · Rèn 35 · Lõi 20 · Sửa 15. Hai cửa không trùng loại. Chơi lại cùng seed chương thì ra cùng cửa (test).
- **Chọn bằng gõ từ khóa tiếng Anh** (kế hoạch §4.7, học thêm) hoặc phím 1/2/3 (trợ năng). Mỗi thẻ cửa hiện từ khóa, nghĩa tiếng Việt và thưởng. Không có "đổi cửa" ở S1 (cần Vàng).

## 10. Học trong S1

- Khung học, phát âm, gửi sự kiện học với `gameId` `typing-survival`: như S0. Thêm: từ chặn của boss và từ khóa của cửa cũng gửi sự kiện học khi gõ xong.
- **Bố cục đáy màn hình** (1280×720, `--ui` 1): `[bến 1 220 px][bến 2 220 px] [khung học 380 px] [bến 3 220 px]`, khoảng cách 12 px, tổng 1.076 px. Chỗ của bến 4 để trống (S1b). Chữ trên bến tự co để vừa nhưng không dưới 26 px. Từ quá dài thì không cho vào bến ở dải đó (kiểm khi dựng dải từ).
- **Vùng cấm cho số sát thương:** 3 bến, khung học, dải từ chặn, thanh giáp, thanh máu boss, biển mục tiêu. Đích vẫn là 0 lần đè.
- Màn **Tổng kết chương:** từ đã gõ, **từ mới gặp** (lần đầu theo `survival.seen`), các từ gõ sai nhiều nhất (bấm để nghe), sao, thời gian, Lõi đã dùng.

## 11. Cân bằng

### 11.1 Đầu trận và bộ điều nhịp

- `RunHeader` thêm `stage` (ví dụ `"c1-s4"`, hoặc `"s0"` cho Trận thử) và `kit` `{ guns, levels, bays, armourMax }`. Đầu trận đi vào `createWorld`, mã băm, ảnh chụp, replay và `scripts/replay.ts`.
- k của ải = `paceK(effectiveE(…), { len, d: familiarityMix(luật học), ref: PACE_REF })`. k nhân vào tốc ra quái, sức đỉnh tràn, tốc đi (như S0), và vào khoảng đẻ của Tổ, kích thước toán của Vết nứt, nhịp hộ tống của boss.
- **Bảng bậc theo ải** (`PaceTable` lấy từ dữ liệu ải):

| Mục tiêu | Bậc khó lên | Bậc dễ đi |
|---|---|---|
| Trụ vững | spawn, elite, peak, lull (như S0) | support, spawn, elite, lull, peak |
| Săn | spawn, elite, peak | support, spawn, elite, peak |
| Phá Tổ | spawn (cả khoảng đẻ của Tổ), elite | support, spawn, elite |
| Boss | spawn (nhịp hộ tống), elite | support, spawn, elite |

- Bộ điều nhịp **không bao giờ** đổi số Đầu Đàn, số Tổ, HP của Tổ, boss, từ chặn hay hiểm họa. Trần của kit giữ nguyên: khoảng sinh ±15 %, W ±10 %, tối đa 2 bậc mỗi đợt.
- FlowMeter: "chữ sống" = số bến còn nhận băng (bến tê vẫn tính), cộng 1 khi có từ chặn. "Nguy hiểm" thêm: đang có làn Đòn Sập. "Hàng đợi" = HP trong vòng gần chia cho sát thương trung bình một băng của bộ súng đang có.

### 11.2 Bot

- `tests/survival/typist-bot.ts` lên N bến. Lựa chọn "danger" của mỗi bến = **giá trị của một băng lúc này** (`gunValue`: số mục tiêu trong tầm × sát thương sau Vỏ và khiên; Đầu Đàn ×4, Tổ ×3, quái trong 7 m ×2) × số băng còn thiếu. Bến đầy thì −1.
- Các cấp chiến thuật của kit giữ trọng số chọn mục tiêu (`TARGET_MIX`) và phản xạ (`REFLEX`). Thêm `tests/survival/tactics.ts` cho các quyết định ngoài trận:

| Quyết định | Tốt (`good`) | Vừa (`fair`) | Kém (`poor`) |
|---|---|---|---|
| Nạp súng đầu chương / chơi lại ải | Chấm 5 súng theo `COUNTERS` với thành phần quái và mục tiêu của các ải sắp tới, lấy 2 súng điểm cao nhất | 50 %: như Tốt; 50 %: ngẫu nhiên | Hai thẻ đầu (Xung, Tia) hoặc ngẫu nhiên |
| Chọn cửa | Sửa khi đã mất ≥ 1 Lõi và còn ≤ 1; Súng khi các ải tới có quái chưa ai khắc; còn lại Rèn súng khắc chính | 50 / 50 | Cửa đầu tiên |
| Thưởng Súng, Rèn | Theo điểm khắc chế | 50 / 50 | Thẻ đầu |
| Bão ion | Không gõ bến đang tê; nạp các bến khác lúc báo trước | Nửa số lần | Bỏ qua cảnh báo |
| Từ chặn | Theo `REFLEX` (Tốt 0,9; Vừa 0,75; Kém 0,5): bỏ từ đang gõ dở nếu cần | như bên trái | như bên trái |

- Độ quen theo luật học: Chuẩn `known`, Thiếu chữ `learning`, Nghĩa `new`. Mọi lựa chọn rút từ RNG của bot (có seed), nên mỗi trận vẫn tất định và chạy lại được.

### 11.3 Báo cáo

- `pnpm survival:balance --stages=c1-s1,…` (**ma trận theo ải**): mỗi ải, mỗi bot (9 bot chuẩn + "Chuẩn · Tốt / Kém"), mỗi chế độ, N seed. Mỗi trận vào ải với **bộ đồ tham chiếu** của ải (mục 8) và súng do bot tự chọn. In bảng §3 (thắng, S, P, I, O, N, Q), thời gian hạ quái, bậc mỗi đợt, giáp mất theo nguồn, thời lượng ải, tỉ lệ chặn đòn, súng đã chọn. Sau đó in B1–B9 và G1–G8.
- `pnpm survival:balance --chapter=1` (**ma trận theo chương**): bot chơi cả chương bằng quyết định của chính nó (nạp súng, cửa, thưởng, bến), có Lõi và Mốc. In: qua chương lần đầu, qua không mất Lõi, Lõi đã dùng, số lần quay lại Mốc, thời gian, sao trung bình, ải hay thua nhất, tỉ lệ chọn từng súng.
- Khi chỉnh dùng 40 seed (sai số tỉ lệ thắng ~6 điểm). Báo cáo của mỗi đợt dùng **100 seed** (~4 điểm). Chạy một tiến trình Node, ở nền, rồi đọc kết quả. Thời gian dự kiến: theo ải khoảng 30–40 phút cho cả 10 ải × 3 chế độ; theo chương khoảng 25 phút.

### 11.4 Đích

**Dải §3 theo chế độ**, áp cho **mỗi ải thường** (1–9) của ma trận theo ải:

| Chỉ số | Thư giãn | Cân bằng | Thử thách |
|---|---|---|---|
| Thắng | ≥ 92 % | 75–90 % | 50–75 % |
| Biên S (trung vị) | ≥ 70 % | 35–65 % | 15–45 % |
| Áp lực P | 5–15 % | 15–35 % | 30–50 % |
| Nhàn I | ≤ 20 % | ≤ 10 % | ≤ 5 % |
| Ngộp O | ≤ 3 % | ≤ 8 % | ≤ 15 % |
| Gần thua N (mỗi ải) | ~0 | 0,3–1 (mềm) | 1–2 (mềm) |
| Quãng Q (trung vị) | ≤ 45 % (mềm) | 50–70 % (mềm; S0 là 77 %, Ray và Pháo Sao giết xa nên dự kiến xuống 60–72 %) | 60–80 % (mềm) |

Ải Boss: thắng Thư giãn ≥ 90 %, Cân bằng 70–90 %, Thử thách 45–70 %. S, P, I, O theo dải của chế độ.

**Cổng B1–B9** (BALANCE §7, Cân bằng, bộ điều nhịp bật, 100 seed):

| # | Ngưỡng ở S1 |
|---|---|
| B1 | Mọi bot từ Mới đến Nhanh nằm trong dải (thắng, S, P, I, O) **ở từng ải 1–9**. Một ô lệch ≤ 3 điểm thì chạy lại với seed 101–200; vẫn lệch thì chỉnh |
| B2 | Không ô (bot × ải) nào có S ≥ 90 % kèm I ≥ 20 % |
| B3 | Bot Mới thắng ≥ 70 % mỗi ải ở Cân bằng; bot Trẻ em thắng ≥ 85 % mỗi ải ở Thư giãn |
| B4 | Chậm chắc có S cao hơn Ẩu ở mỗi ải; Chuẩn hạ quái nhanh hơn Ẩu |
| B5 | Không gõ thua ở mọi ải, mọi chế độ |
| B6 | **Tốt hơn Kém ≥ +10 điểm thắng ở Cân bằng và Thử thách** (gộp các ải 1–9; đích +15). Thêm ở ma trận chương: qua chương lần đầu Tốt hơn Kém ≥ +15 điểm |
| B7 | ≤ 3 bậc mỗi đợt; khoảng sinh trong ±15 %; tắt bộ điều nhịp thì bot Chuẩn vẫn trong dải ở ≥ 8/9 ải |
| B8 | Cổng học G5 đạt ở mọi bot có gõ |
| B9 | Chủ dự án chơi thử (mục 18); bot cùng hồ sơ lệch ≤ 15 % |

**Cổng riêng của S1:**

| # | Cổng | Ngưỡng |
|---|---|---|
| G1 | Chương qua được | Cân bằng, bot Chuẩn: qua chương lần đầu (không phải quay lại Mốc hay đầu chương) 70–90 %, qua không mất Lõi 10–35 %. Thư giãn: Trẻ em qua lần đầu ≥ 85 %, người lớn ≥ 95 %. Thử thách, bot Chuẩn: qua lần đầu 20–45 %, quay lại Mốc tối đa 2 lần thì ≥ 70 % |
| G2 | Không súng thống trị | Ở bot Tốt (Khá, Nhanh, Chuẩn · Tốt), 100 chương: mỗi súng chiếm 10–40 % số lần được chọn (đầu chương, Mốc, thưởng Súng); không bộ hai súng đầu chương nào > 40 % |
| G3 | Khắc chế đo được (sim Node, kịch bản nhỏ) | Ray hạ 6 Trâu nhanh ≥ 2× Xung. Pháo Sao hạ cụm 10 bầy ở 16 m nhanh ≥ 1,5× Xung. Tán giữ đợt 40 bầy lao vào 6 m, mất giáp ít hơn Ray ≥ 30 %. Xung và Tán gây 0 sát thương vào khiên từ phía trước; Ray phá khiên trong 1 phát. Tán và Pháo Sao dọn mảnh Tách nhanh hơn Ray. Băng Hoàn hảo của Xung hạ Trâu nhanh hơn băng thường ≥ 15 % |
| G3c | Không ải bắt buộc | Cả 10 bộ 2 súng: bot Chuẩn thắng ≥ 35 % ở mọi ải thường ở Cân bằng, kể cả bộ kém nhất; bộ tốt nhất ≤ 97 % |
| G4 | Răng cưa | Ở Cân bằng, P của bot Chuẩn không giảm quá 2 điểm từ ải này sang ải kế trong ải 1–5 và 6–9; ải 6 thấp hơn ải 5; boss có P cao nhất chương (± 3) |
| G5 | Học | Không lặp từ trước khi hết dải; chữ đầu của mọi từ đang hiện (các bến và từ chặn) luôn khác nhau; Thiếu chữ không bao giờ ẩn chữ đầu; ải Nghĩa luôn hiện nghĩa; bot Mới gõ ≥ 8 từ mỗi ải; 0 số đè vùng cấm (kịch bản) |
| G6 | Mục tiêu đúng giờ | Thời lượng trung vị ở Cân bằng, bot Chuẩn: Săn và Phá Tổ 110–190 s, Boss 150–240 s |
| G7 | Từ chặn | Tỉ lệ chặn của bot Chuẩn 60–85 %, Tốt ≥ 80 %, Kém ≤ 60 %. Trẻ em ở Thư giãn ≥ 50 % |
| G8 | Tất định | Cùng seed, phím, đầu trận (cả ải và bộ súng) thì cùng mã băm, cùng nhật ký `pace`, ở Node và Chrome. Replay của mọi kịch bản S1 khớp. Cửa và thưởng tái lập từ seed chương |

## 12. Hình, chuyển động, tiếng

Mọi đòn đi qua các bậc phản hồi của kit (`tier()` T0–T5: rung, dừng hình, số, lóe, giật lùi, tia lửa, mảnh vỡ, lớp tiếng). Không thêm draw call cho mỗi quái: lóe, giật lùi, co giãn, đèn hiệu vẫn là thuộc tính instanced. Sau mỗi đợt, AI tự xem chuỗi khung chụp (50 ms mỗi khung) và sửa trước khi báo xong.

| Gì | Đầu nòng | Đạn / đường đi | Trúng | Hạ | Tiếng (id mới) |
|---|---|---|---|---|---|
| **Tán** | Quạt 3 tia lửa 50 ms; tàu giật lùi 0,25 m; cú đẩy camera 3 px ngược hướng bắn | 7 vệt ngắn sáng (`Strips`, sống 0,12 s) | T1: sao 4 tia nhỏ; quái bị đẩy lùi thấy rõ (đẩy thật trong sim + giật lùi giả) | T1, mảnh vỡ văng theo hướng đẩy; nhiều con chết cùng ô thì gom √N | `gun.tan.fire` (tiếng nổ đanh trên thép + vỏ đạn leng keng) |
| **Ray** | **Nạp** 150 ms: lõi trắng xanh co lại ở nòng (báo trước), rồi lóe dài 80 ms | Đường thẳng mảnh trắng xanh 0,25 s, có vòng gợn ion dọc đường, mờ dần | T2 ở mỗi quái bị xuyên: tia lửa theo hướng đường bắn. Trúng Vỏ: tia lửa cam kèm tiếng keng | T2/T3, dừng hình 12 ms (cách nhau ≥ 300 ms) | `gun.ray.charge`, `gun.ray.fire` (rít tụ điện rồi nổ đanh, có đuôi) |
| **Pháo Sao** | Thụp cối: quầng khói xám, lóe hướng lên | Quả sáng có vệt bay **vòng cung** (view vẽ parabol, sim chỉ biết điểm rơi và giờ rơi); vòng đỏ mảnh trên sàn đánh dấu điểm rơi 0,7 s | Nổ T2: sao 8 tia, **sóng tròn trên sàn** 3 m, lóe, mảnh vỡ | Gom √N; nổ liền nhau cách 40–70 ms ra hiệu ứng domino | `gun.phao.launch`, `gun.phao.burst` (bụp, rít, nổ trầm) |
| **Vỏ** (Trâu, Đầu Đàn, Tổ, Boss) | — | — | Tia lửa cam bật ngược; số sát thương nhỏ hơn và màu xám (kiểu số `normal`, cỡ nhỏ); Băng Hoàn hảo xuyên Vỏ hiện số kiểu "HOÀN HẢO" | Trâu: T3 + mảnh vỡ nặng; Đầu Đàn: T4, đèn hiệu tắt, dừng hình 45 ms | `hit.armour`, `leader.horn` (khi Đầu Đàn tới), `leader.down` |
| **Khiên** | — | — | Đạn chạm: vòm lục giác lóe tại chỗ trúng, tia lửa trượt sang bên | Vỡ khiên: mảnh kính lam (T3) | `shield.hit`, `shield.break` |
| **Tách** | — | — | — | Lóe nứt, 3 mảnh bay ra (là quái thật) | `foe.split` |
| **Tổ** | — | — | Nhịp đẻ: quầng cam co bóp trước mỗi lần đẻ | Vỡ: T4, dừng hình 45 ms, sóng kép, mưa mảnh vỡ | `nest.spawn`, `nest.down` |
| **Vết nứt** | — | Báo trước: đường nứt sáng cam chạy dọc tường; mở: tia lửa và khói tràn ra | — | — | `rift.warn`, `rift.open` |
| **Bão ion** | — | Báo trước: khung bến chớp lam, đếm ngược; trên sân: sét đánh xuống vị trí súng của bến đó | Lúc tê: nhiễu điện chạy quanh **khung** bến (CSS), chữ trên bến giữ nguyên độ rõ | — | `ion.warn`, `ion.jam`, `ion.clear` |
| **Giếng hấp dẫn** | — | Lõi tối với vòng bẻ sáng (shader trên một quad nằm ngang), hạt xoáy vào tâm, vệt đạn cong | — | — | `well.hum` (lặp, nhỏ) |
| **Boss** | — | Ra mắt: camera zoom, biển tên; làn Đòn Sập đỏ có sọc | Pha mới: T4, sóng chấn | Chặn được: khiên ở vạch lóe, "CHẶN!" (T3). Trúng tuyến: T5, tách màu 40 ms (chỉ ở thế giới). Boss chết: T5, dừng hình 70 ms, 5 vụ nổ cách nhau 120 ms, mưa mảnh vỡ | `boss.enter`, `boss.phase`, `boss.telegraph`, `block.ok`, `block.miss`, `boss.down` |
| **Màn chương** | — | — | — | — | `door.open`, `reward.take`, `star.get`, `chapter.clear` |

- **Nhạc:** thêm một lớp "boss" cho ải 10 (trống máy dày hơn, bass hạ một quãng), mờ vào khi boss ra mắt. Mỗi id âm mới có mục và prompt trong `docs/audio/THEME_SOUND_LIST.md` (test kiểm).
- **Màu súng** (biến trong `theme.css`, sọc cảnh báo của bến theo màu súng): Xung lam điện, Tia cam nóng, Tán hổ phách, Ray trắng xanh, Pháo Sao đỏ son. Hai súng không được trùng sắc.
- **Quái mới** dùng lớp vật liệu "Bầy Hố Đen" như S0. Trâu và Đầu Đàn có vân vàng đậm hơn, Khiên có vân lam. Tổ có vân cam co bóp theo nhịp đẻ.

## 13. Dữ liệu và mã (ngân sách dòng)

| File | Hiện tại | Sau S1 (trần) | Đợt | Nội dung |
|---|---|---|---|---|
| `src/content/guns.ts` | mới | 170 | R1 | 5 súng, cấp Rèn, chất lượng gõ, `COUNTERS`, độ dài từ |
| `src/content/foes.ts` | mới | 130 | R1 | Bảng quái (chuyển `FOES` khỏi `rules.ts`), mảnh Tách, Đầu Đàn, Tổ, Boss |
| `src/content/rules.ts` | 127 | 120 | R1 | Sân, rỉ giáp, ép, lính, sinh, trần (bỏ phần súng và quái) |
| `src/content/stage-rules.ts` | mới | 200 | R1–R2 | Thư viện Mục tiêu, Hiểm họa, Luật học và số của chúng; `checkChapter()` |
| `src/content/chapter-1.ts` | mới | 220 | R1 (ải 1–4), R2 (5–9), R3 (10) | Bảng 10 ải, bộ đồ tham chiếu, bảng bậc theo ải |
| `src/content/journey.ts` | mới | 160 | R2 | Lõi, cửa, thưởng, sao, Mốc (hàm thuần, có seed) |
| `src/content/stage-s0.ts` | 66 | 70 | R1 | Giữ nguyên, là "Trận thử" |
| `src/content/balance.ts` | 127 | 170 | R1 | Đầu trận có ải và bộ súng; k theo luật học |
| `src/sim/world.ts` | 155 | 230 | R1 | Ải, bộ súng, kết thúc theo mục tiêu |
| `src/sim/stage.ts` | mới | 200 | R1–R2 | Mục tiêu, Đầu Đàn, Tổ, bầy rút lui |
| `src/sim/hazards.ts` | mới | 170 | R1 (Vết nứt), R2 (Bão ion, Giếng) | |
| `src/sim/boss.ts` | mới | 180 | R3 | Pha, hộ tống, Đòn Sập, từ chặn |
| `src/sim/plan.ts` | 96 | 110 | R1 | Dòng thời gian lấy từ dữ liệu ải |
| `src/sim/spawn.ts` | 112 | 190 | R1–R2 | Toán theo tỉ lệ, toán Đầu Đàn, Vết nứt, Tổ đẻ, mảnh Tách |
| `src/sim/move.ts` | 148 | 210 | R1–R2 | Quái to, đẩy lùi, hướng khiên, Giếng, Tổ bò |
| `src/sim/weapons.ts` | 308 | 200 | R1 | Bến, băng, cấp, chia việc cho từng súng (Xung, Tia chuyển ra file riêng) |
| `src/sim/guns/{xung,tia,tan,ray,phao}.ts` | mới (Xung, Tia chuyển sang) | 130 / 170 / 120 / 150 / 150 | R1 | Một file mỗi súng |
| `src/sim/projectiles.ts` | 105 | 190 | R1 | Vỏ, đoạn chắn khiên, Tách vỡ, quả Pháo Sao |
| `src/sim/stores.ts` | 134 | 190 | R1 | Cột mới cho quái (Vỏ, khiên, cờ to, đèn hiệu), kho `Shells`, `Shields` |
| `src/sim/words.ts` | 196 | 280 | R1, R3 | N bến, dải theo độ lệch chữ, che chữ, từ chặn |
| `src/sim/pace.ts` | 221 | 250 | R1 | Ảnh chụp N bến, bảng bậc theo ải |
| `src/sim/events.ts`, `hash.ts` | 51, 45 | 90, 55 | R1–R3 | Sự kiện mới; mã băm gồm mọi kho mới |
| `src/app/main.ts` | 656 | 600 | R2 | Tách luồng màn sang `journey.ts` |
| `src/app/journey.ts` | mới | 280 | R1 (chọn ải, nạp súng), R2 (chương) | Luồng màn, lưu `survival.journey` |
| `src/app/skill.ts`, `dev.ts` | 161, 10 | 185, 40 | R1 | Loại E khỏi ải luật học khó; tay cầm kịch bản |
| `src/view/hud.ts` | 251 | 400 | R1–R3 | 2–3 bến, biển mục tiêu, cảnh báo hiểm họa, chữ che, dải từ chặn, thanh boss |
| `src/view/screens.ts` | 124 | 200 | R1 | Kho súng |
| `src/view/screens-journey.ts` | mới | 300 | R1–R2 | Bản đồ, bảng tin, nạp súng, kết ải, cửa, thưởng, tổng kết |
| `src/view/combat.ts` | 389 | 430 | R1 | Chia sự kiện cho `gunfx` |
| `src/view/gunfx.ts` | mới | 320 | R1 | Tán, Ray, Pháo Sao, Vỏ, khiên, Tách |
| `src/view/hazard-fx.ts` | mới | 260 | R1–R2 | Vết nứt, Bão ion, Giếng, Tổ |
| `src/view/boss-fx.ts` | mới | 220 | R3 | Ra mắt, pha, làn Đòn Sập, chặn, chết |
| `src/view/crowd.ts`, `fx.ts`, `scene.ts` | 293, 311, 464 | 380, 360, 480 | R1–R3 | Thêm loại quái, đèn hiệu, vòm khiên, vòng cung, đánh dấu trên sàn, zoom camera |
| `src/view/survival.css`, `theme.css`, `theme.ts` | 178, 89, 49 | 330, 100, 80 | R1–R2 | Biến màu súng, bến ×3, màn chương |
| `src/audio/theme-audio.ts`, `music.ts` | 385, 192 | 470, 220 | R1–R3 | Id mới; vượt 470 dòng thì tách `gun-audio.ts` |
| `tests/guns.test.ts` | mới | 300 | R1 | Băng, Vỏ, khiên, xuyên, vòng cung, đẩy lùi, G3 |
| `tests/stage-rules.test.ts` | mới | 260 | R1–R3 | Mục tiêu, hiểm họa, luật học, boss, `checkChapter` |
| `tests/journey.test.ts` | mới | 220 | R2 | Cửa, thưởng, Lõi, Mốc, lưu và đọc lại, sao |
| `tests/survival/tactics.ts`, `typist-bot.ts` | mới, 189 | 180, 260 | R1–R3 | Chọn súng, cửa, thưởng; N bến; từ chặn |
| `scripts/balance-lib.ts`, `balance.ts`, `replay.ts` | 144, 90, 53 | 260, 170, 70 | R1–R2 | `--stages`, `--chapter`, G1–G8 |

- Trần chung: `src/` (không kể `src/kit`) ≤ **9.000 dòng**. Không file nào trong `src/` quá 480 dòng.
- `tests/boundary.test.ts`, `tests/survival-boundary.test.ts`: `src/sim/guns/*`, `src/content/*` mới cũng chịu luật "không DOM, đồng hồ, `Math.random`, lượng giác".

## 14. Thứ tự làm

Mỗi đợt: làm, tự xem ảnh và chuỗi khung, chạy cân bằng, rồi một AI khác phản biện và sửa. Mỗi đợt có changelog riêng (mục, đã làm, mục review đã xử lý, kiểm, còn lại) và một mục trong `BUILD_NOTES.md` §9.

### R1 "Súng và khắc chế" (chơi được riêng)

1. **Tách mã, chưa đổi luật.** Chuyển súng và quái sang `content/guns.ts`, `content/foes.ts`; tách `sim/guns/xung.ts`, `tia.ts`; bến thành mảng N. Trước khi bật luật mới, **vết sự kiện của Trận thử phải giống hệt** bản `00ed734`: 6 seed × 3 bot, so dãy (tick, loại, giá trị) của sự kiện và số liệu cuối trận. Mã băm thì được đổi (kho có thêm cột).
2. **Súng mới:** Tán, Ray, Pháo Sao; Vỏ; Băng Hoàn hảo xuyên Vỏ; Rèn (chưa có cửa, chỉ dùng cho bộ đồ tham chiếu và test); độ dài từ +1.
3. **Quái mới:** Trâu, Khiên, Tách, Đầu Đàn.
4. **Luật Ải:** mục tiêu Trụ vững và Săn, hiểm họa Vết nứt, luật học Thiếu chữ; dữ liệu ải 1–4; đầu trận có ải và bộ súng.
5. **Màn:** màn chính có "Hành trình · Chương 1 (ải 1–4)" và "Trận thử". Chọn ải (mở dần theo ải đã qua) → Bảng tin → Nạp súng (2 trong 5) → Trận → Kết ải có sao. Kho súng hiện 5 súng.
6. **HUD:** bến theo súng (tên, màu, kiểu băng), biển mục tiêu ("ĐẦU ĐÀN 2/3"), cảnh báo Vết nứt, chữ che của Thiếu chữ.
7. **Hình và tiếng** của 3 súng mới, Vỏ, khiên, Tách, Đầu Đàn, Vết nứt (mục 12).
8. **Bot và báo cáo:** N bến, `gunValue`, `tactics.ts` (chọn súng); `--stages` cho Trận thử và ải 1–4; B1–B9, G3, G3c, G5, G6 (Săn), G8.
9. **Kịch bản:** `survival-s1-loadout`, `survival-s1-guns`, `survival-s1-stage` (ải 2 và ải 4), `survival-s1-perf`; 5 kịch bản S0 vẫn đạt trên Trận thử.

**R1 xong khi:** chơi được ải 1–4 từ màn chính đến kết ải, với bất kỳ bộ 2 súng nào; `pnpm check` xanh; báo cáo 100 seed ải 1–4 đạt B1–B5, B7, B8, G3, G3c, G5, G8. B6 ở R1 là số đo (đích +10 có thể chờ tới R2, khi có cửa và bến 3). Hiệu năng mục 17 đạt.

### R2 "Chương, cửa và hiểm họa"

1. Luồng chương: bản đồ, Lõi Trạm, cửa (gõ từ khóa hoặc 1/2/3), thưởng Súng, Rèn, Lõi, Sửa, Mốc và ảnh chụp, bến 3, lưu và tiếp tục, bỏ dở, tổng kết chương; chơi lại ải lấy sao. Tách `main.ts`.
2. Ải 5–9: Phá Tổ, Bão ion, Giếng hấp dẫn, Tách (đã có từ R1, nay vào chương), luật Nghĩa. Hình và tiếng của Tổ, Bão ion, Giếng.
3. Bot chơi cả chương (`tactics.ts`: cửa, thưởng, Bão ion); `--chapter=1`; G1 (tạm tính với ải 10 thay bằng ải Trụ vững), G2, G4.
4. Kịch bản `survival-s1-journey`, `survival-s1-hazards`, `survival-s1-learn`.

**R2 xong khi:** đi được ải 1–9 trong một chương có Lõi, Mốc, cửa, lưu giữa ải; B1–B8 đạt ở ải 1–9; **B6 ≥ +10 ở Cân bằng và Thử thách**; G2, G4, G5 đạt.

### R3 "Boss và hoàn thiện"

1. Ải 10 Cai Ngục: pha, hộ tống, Đòn Sập, từ chặn (sim, HUD, hình, camera, tiếng, lớp nhạc boss). Bot phản xạ từ chặn.
2. Cân bằng cuối: ma trận theo ải và theo chương, 100 seed, cả 3 chế độ; mọi cổng B1–B8 và G1–G8.
3. Kịch bản `survival-s1-boss`; đo hiệu năng mọi kịch bản ở hai cỡ; đo bộ nhớ một chương 30 phút.
4. Tài liệu: `BUILD_NOTES.md` §9, changelog, `AGENTS.md`, `THEME_SOUND_LIST.md`; xuất số cho B9 (mục 18).

**R3 xong khi:** mục 20.

## 15. Test (Vitest)

- **Súng** (`tests/guns.test.ts`): số viên, loạt, phát, quả và thời gian mỗi băng; nạp và cộng dồn (2 băng, cấp 3 là 3); Vỏ trừ thẳng, còn ít nhất 1; Ray × 0,25; Hoàn hảo × 0,5; Ray xuyên ≤ 6 quái và giảm ×0,85; Pháo Sao: tầm 8–24 m, nổ giảm đều, bỏ qua khiên; Tán: nón, đẩy lùi (không đẩy Trâu); khiên chặn Xung và Tán từ phía trước, che toán phía sau, Ray phá, Tia đốt; Xung không bắn vào quái bị khiên che; Rèn ×1,2 / ×1,4; độ dài từ +1, trần 9; cổng G3 (kịch bản nhỏ, nhiều seed).
- **Luật Ải** (`tests/stage-rules.test.ts`): Săn kết thúc đúng lúc hạ đủ N; thua khi lọt quá M − N; bầy rút lui không gây hại; Phá Tổ: Tổ bò, đẻ dồn dần, trần 300 s; Vết nứt: báo trước, vị trí, số con; Bão ion: báo trước, bến tê không bắn, vẫn gõ và nạp được, không phím nào mất; Giếng: kéo quái, bẻ đạn Xung, không bẻ Ray; Thiếu chữ: không ẩn chữ đầu, không hai chữ liền, tất định; Nghĩa; Boss: pha theo HP, Đòn Sập, từ chặn (kịp, không kịp, đang gõ dở), chữ đầu khác mọi bến; `checkChapter` đạt với Chương 1 và báo lỗi với một chương sai cố ý.
- **Hành trình** (`tests/journey.test.ts`): cửa tái lập từ seed chương, không trùng loại, đúng điều kiện mời; thưởng đúng; Lõi, thua, chương vỡ, quay về Mốc với đúng ảnh chụp; sao; lưu rồi đọc lại (kể cả JSON hỏng thì bắt đầu lại sạch).
- **Sim và cân bằng** (sửa test cũ): tất định có đầu trận mới; replay khớp; bot qua `installKeys` với 3 bến; ma trận nhỏ ra đủ 9 cổng; bước sim 700 quái + 2.000 đạn + 64 quả Pháo Sao + 3 bến cùng bắn ≤ 1,5 ms.
- **Ranh giới, chủ đề:** như S0; thêm mỗi id âm mới có mục trong `THEME_SOUND_LIST.md`; màu súng là biến trong `theme.css`.

## 16. Kịch bản trình duyệt

Chrome headless, gõ thật qua CDP, 1280×720 và 1920×1080, 0 lỗi console, 0 ngoại lệ. Máy chủ dev cổng 3047 `--strictPort`.

| Kịch bản | Kiểm |
|---|---|
| `survival-s1-loadout` | Màn chính → Hành trình → Bảng tin → Nạp súng bằng phím 1–5 và Enter; thẻ súng đủ số; cảnh báo "chưa có súng khắc" hiện đúng; Kho súng |
| `survival-s1-guns` | Mỗi súng mới: 12 khung cách 50 ms quanh một băng vào cụm đông (đầu nòng, đạn, va chạm, hạ đều thấy); Ray xuyên hàng; Pháo Sao vòng cung và sóng tròn; Tán đẩy lùi; khiên lóe rồi vỡ; Tách vỡ 3 mảnh |
| `survival-s1-stage` | Ải 2 (Săn) và ải 4 (Thiếu chữ, Khiên) gõ 35 và 45 WPM; biển mục tiêu đếm đúng; bầy rút lui khi đủ; chữ che hiện "_", không bao giờ ở chữ đầu; 0 số đè vùng cấm; Node chạy lại khớp mã băm |
| `survival-s1-hazards` | Vết nứt, Bão ion, Giếng: ảnh lúc báo trước và lúc xảy ra; chữ của bến tê vẫn ≥ 26 px, tương phản ≥ 7 : 1; không phím nào mất trong lúc tê |
| `survival-s1-journey` | Chương: ải 1 → cửa (gõ `forge`) → Rèn → ải 2; thua ải → −1 Lõi → chơi lại; tải lại trang ở màn cửa → Tiếp tục đúng chỗ; Mốc mở bến 3, bố cục 3 bến không chồng, chữ ≥ 26 px |
| `survival-s1-learn` | Ải 9 (Nghĩa): nghĩa ≥ 22 px, IPA và từ hiện khi xong, phát âm; khung học không bị che; tổng kết chương có từ mới và từ sai nhiều |
| `survival-s1-boss` | Boss ra mắt (camera zoom), Đòn Sập: làn đỏ + từ chặn, gõ kịp ("CHẶN!") và để trượt (T4); đổi pha; boss chết; 12 khung quanh lúc chặn |
| `survival-s1-perf` | Đo khung: ải 8 lúc đỉnh (3 bến, Pháo Sao + Tia + Giếng, ~150 quái); ải 10 với hộ tống; `flood(700)` khi cả 3 bến cùng bắn; số draw call |
| S0: `boot`, `menu`, `fight`, `keys`, `frames`, `perf`, `balance` | Vẫn đạt trên Trận thử (đường hồi quy) |

## 17. Hiệu năng (bậc Cao, Apple M4, khóa vsync, như cách đo của S0)

| Đo | Đích |
|---|---|
| Đỉnh ~150 quái + 3 bến cùng bắn + hiệu ứng (ải 8, ải 10) | khung TB ≤ 6 ms, p95 ≤ 10 ms |
| `flood(700)` + 3 bến cùng bắn | p95 ≤ 14 ms |
| Draw call | ≤ 160 (S0: 37–38; S1 dự kiến ≤ 70: mỗi model quái thêm 2–4) |
| Một bước sim: 700 quái, 2.000 đạn, 64 quả Pháo Sao, 32 khiên, 3 bến | ≤ 1,5 ms (Node) |
| Phím tới hình / phím tới đạn | ≤ 1 khung / ≤ 50 ms (≤ 70 ms khi đang dừng hình) |
| Bộ nhớ một chương 30 phút | Heap sau GC tăng ≤ 15 MB; số geometry và texture không đổi giữa các ải (model của loại mới nạp một lần) |
| Không cấp phát trong trận | Pool cho đạn, viên, quả, đoạn chắn, sự kiện. Màn chương (DOM) không nằm trong vòng khung |

## 18. Chủ dự án chơi thử (sau R2 và sau R3)

1. **Chọn súng có nghĩa không?** Chơi ải 2 (Săn) với Xung + Tia, rồi chơi lại với Ray + Tia. Mong đợi: lần đầu Đầu Đàn rất lì, lần sau hạ gọn. Bảng tin có nói trước điều đó không?
2. **Mỗi súng có "đã" không?** Tán: tiếng nổ đanh, bầy bị hất lùi. Ray: nạp rồi xé một hàng. Pháo Sao: thấy quả bay vòng, nổ thành vòng, có lúc nổ dây chuyền. Thấy và nghe rõ cả lúc đông không?
3. **Khiên, Tách, Trâu** đọc được ngay không (đạn bật khỏi khiên, Tách vỡ 3 mảnh, Trâu lì, có tia lửa cam)?
4. **Hiểm họa:** báo trước Vết nứt, Bão ion có đủ sớm không? Bến bị tê vẫn đọc được từ không? Giếng có làm đạn Xung cong rõ không?
5. **Học:** Thiếu chữ, Nghĩa có vừa sức không, có nản không? Gõ từ khóa ở cửa (`arms`, `forge`, `core`, `repair`) thấy vui hay phiền?
6. **Chương:** thua một ải mất 1 Lõi rồi chơi lại có công bằng không? Qua Mốc rồi vỡ chương, có về đúng ải 6 với đúng bộ súng không? Thoát ở màn cửa rồi vào lại, có tiếp đúng chỗ không?
7. **Boss:** từ chặn có kịp không? Làn Đòn Sập có rõ không? Ba pha có khác nhau thấy được không?
8. **Nhịp cả chương** (khoảng 30 phút): đoạn nào chán, ải nào khó vô lý?
9. **Gửi số cho B9:** sau mỗi ải, `window.__survival.pace()` và `.profile()`, cùng nhật ký chương (`.journey()`). Bot cùng hồ sơ sẽ chạy lại các ải đó để so (lệch ≤ 15 %).

## 19. Rủi ro

| Rủi ro | Dấu hiệu | Cách giảm |
|---|---|---|
| Phạm vi lớn (3 súng, 4 loại quái, 3 hiểm họa, 2 mục tiêu, boss, luồng chương) | R1 kéo dài quá 1,5 lần dự kiến | R1 chỉ ải 1–4. Nếu trễ: dời Giếng hấp dẫn và Nghĩa sang S1b, thay ải 8 và 9 bằng tổ hợp đã có (vẫn qua `checkChapter`) |
| Khắc chế quá cứng làm B1 trượt với bot "Vừa" | Ô ↓ ở các ải có Trâu, Tổ | Cổng G3c (mọi bộ 2 súng thắng ≥ 35 %). Chỉnh Vỏ và HP trước, nhịp sau. Mục tiêu: bộ súng sai thua kém bộ đúng khoảng 15–25 điểm, không hơn |
| B6 đạt nhờ bot, người chơi thật không thấy khác | Chủ dự án thấy súng nào cũng như nhau | Mục 18.1; B9; ảnh và số thời gian hạ quái trong bảng tin |
| Ma trận bot chạy lâu (30–40 phút) | Mỗi vòng chỉnh mất nửa giờ | 40 seed khi chỉnh, 100 seed cho báo cáo; chỉ chạy ải và bot vừa đổi (`--stages`, `--bots`); một tiến trình Node chạy nền |
| RAM 16 GB, nhiều agent | Chrome treo, kịch bản chập chờn | Một dev server (3047), một Chrome; tắt khi xong; đo hiệu năng hai lần, ghi lúc máy bận |
| Hiệu năng tụt vì thêm model quái, boss, hạt Pháo Sao | p95 tăng ở `perf` | Instanced theo model; quái to dùng danh sách riêng; trần hạt theo bậc; gom nổ √N; đo `perf` ở mỗi đợt |
| Khung học bị lấn (3 bến, từ chặn, biển mục tiêu, thanh boss) | Chữ < 26 px, số đè | Thêm vùng cấm; kịch bản `journey` và `learn` đo cỡ chữ và lần đè ở 1280×720 |
| Model tạm (`rainbow-tank`, `rainbow-scout` là bản sao họ `prism`; Tổ dùng `carrier`) | Hình không hợp vai | Dùng làm giữ chỗ, ghi danh sách cho chủ dự án; không dựng model bằng mã |
| `main.ts` phình | > 600 dòng | Tách `app/journey.ts` ở R2 |
| Kit `typing` đang bị sửa ở workflow khác | Xung đột khi đồng bộ kit | Không dùng kit `typing`; chỉ đồng bộ kit khi thật cần (`feedback`, `balance`), chạy `--check` trước |
| Mã băm đổi khi tách mã | Không biết refactor có đổi luật không | R1 bước 1: so vết sự kiện của Trận thử với bản `00ed734` trước khi bật luật mới |
| Lõi Trạm làm người gõ chậm phải chơi lại nhiều | Trẻ em, bot Mới thua chương nhiều lần | Thư giãn 4 Lõi; Mốc ở mọi chế độ; gợi ý đổi chế độ của kit (`suggestDifficulty`) sau 2 lần vỡ chương |
| Đỉnh dữ dội chồng hiểm họa nặng | O vượt dải ở ải 6, 8 | Hiểm họa nặng giảm 50 % xác suất dữ dội (mục 7.2) |

## 20. Xong khi (hết R3)

1. `npx tsc --noEmit` sạch; `npx vitest run` xanh **hai lần liền**; `pnpm build` đạt; `node src/kit/verify-kit.mjs` đạt.
2. Đi được cả Chương 1 (10 ải, Mốc, boss) bằng bàn phím, ở cả 3 chế độ; lưu giữa ải và tiếp tục được.
3. Báo cáo 100 seed (theo ải và theo chương): B1–B8 đạt, B6 ≥ +10 ở Cân bằng và Thử thách, G1–G8 đạt. B9 có số khi chủ dự án đã chơi.
4. Mọi kịch bản mục 16 đạt ở hai cỡ. Ngân sách mục 17 đạt.
5. AI đã xem ảnh và chuỗi khung của từng súng, hiểm họa, boss, và sửa chỗ xấu hoặc khó đọc trước khi báo xong.
6. `BUILD_NOTES.md` §9 (đã làm, lệch và lý do, số đo), changelog của từng đợt, `AGENTS.md`, `docs/audio/THEME_SOUND_LIST.md` cập nhật. Không media trong Git, không đẩy.
