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
| Thử thách: không có Mốc | **Mọi chế độ đều có Mốc** ở S1 | Ở Thử thách mỗi ải thắng 50–75 %, có 3 Lõi, nên chỉ khoảng 15–45 % lượt chương qua được mà không vỡ (mục 11.4, G1). Không có Mốc thì mỗi lần vỡ, kể cả ở ải 9, đều phải đi lại từ ải 1: 25–30 phút mất trắng, dễ nản. "Không Mốc" sẽ là một tùy chọn Độ Sâu Hố Đen (S4b) |
| Thư viện bản đầu: 4 Mục tiêu, 4 Hiểm họa, 3 Luật học | **3 Mục tiêu + Boss, 3 Hiểm họa, 3 Luật học.** Chỉ làm những gì Chương 1 dạy | Chương 1 dạy mỗi ải một thứ mới (§4.0b "dạy dần"). Món nào chưa dùng ở Chương 1 thì làm cùng Chương 2–3 |
| 4 súng (Xung, Tán, Ray, Pháo Sao) | **5 súng**: giữ Tia của S0 | Tia đã có, đã cân bằng, và là súng cắt cụm tốt nhất |
| Boss bộ phận gắn từ (S4) | **Boss 3 pha và từ chặn** (một từ báo trước để chặn đòn lớn). Chưa có bộ phận gắn từ | Bộ phận gắn từ cần hệ quái gắn từ (S4). Từ chặn thì đã dùng được yếu tố 9 "phản xạ báo trước" của BALANCE |
| Thuộc tính tinh anh "Giáp" | Đổi tên thành **"Bọc Thép"** (vẫn HP ×2) | Tránh trùng với thanh GIÁP của tuyến và chỉ số **Vỏ** mới của quái |
| Ô súng tối đa 6, mở dần | S1: **2 bến**, mở **bến 3** khi qua Mốc | Chữ ô súng phải ≥ 26 px ở 1280×720. Bố cục 4 cột vừa với 3 bến và khung học |
| Trâu: "cần Ray, Tia, nguyên tố phá giáp" (§4.5) | Khắc Vỏ là **Ray**. Pháo Sao và Xung đã Rèn là lối thứ hai. **Tia kém** với Vỏ | Vỏ trừ ở mỗi đòn, mà Tia gây 6 mỗi nhịp, nên gần như mất hết sát thương. Tia lại quét từ cụm này sang cụm kia, không đứng trên một con. Nguyên tố phá giáp để S2. Vì Trâu có mặt ở 7 trong 9 ải thường, nguy cơ "Ray bắt buộc" có cổng riêng: G2(d) |
| Kho Vũ Khí, mở súng (S4b) | Cả 5 súng **mở sẵn** để chọn đầu chương | Chưa có Trạm Mẹ |

## 2. Phạm vi

| Trong S1 | Ngoài S1 (để sau) |
|---|---|
| Súng mới: **Tán, Ray, Pháo Sao**, mỗi súng một kiểu băng đạn, có đủ đầu nòng, đạn, va chạm, hạ | Nhánh băng đạn khi Rèn, Ấn, Song Ấn, tiến hóa (S1b); ô nguyên tố (S2) |
| Bến 2–3, chọn 2 súng đầu chương, Rèn cấp 1–3, "Băng Chuẩn xuyên Vỏ" | Bến 4–6, Kho Vũ Khí, cấp vĩnh viễn (S4b) |
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
- **Học luôn rõ nhất:** khung học và các bến là DOM ngoài canvas, không rung. Chữ của từ trên bến **32 px như S0** ở 1280×720; chỉ từ dài mới được tự co, và không dưới 26 px. Tương phản ≥ 7 : 1. ~~Khung học rộng 420 px và nằm giữa đáy như S0.~~ Từ lượt cảm giác (26/10, `docs/FEEL_PASS_S1.md` §2): dòng từ cao 56 px ngay trên mũi tàu (y 416–472, rộng tối đa 420 px, tấm ôm từ), bến hai bên tàu dưới vạch đáy (y 508–608); IPA và nghĩa ở bến đang gõ. 0 số sát thương đè lên vùng cấm.
- Không sửa kit `balance` (hồ sơ gõ, `paceK`, bộ điều nhịp). Game chỉ ghép các hàm có sẵn: `paceK`, `familiarityMix`, `telegraphScale`, và mẫu `telegraph` của `updateSkill`. Game cấp **bảng bậc theo ải** và hệ số học ρ (mục 11.1).
- Chú thích trong mã bằng tiếng Anh, ngắn. Tài liệu tiếng Việt có dấu. Mỗi đợt (R1, R2, R3) có `docs/changelog/<ngày>-s1-r<n>.md`.
- Máy 16 GB RAM, nhiều agent chạy cùng lúc: mỗi lần chỉ **một** dev server (`pnpm dev`: cổng 3007, `--strictPort`, `vite.config.ts`) và **một** Chrome. Tắt mọi tiến trình đã mở khi xong. Bản trước ghi cổng 3047 (quy ước cũ trên Dell); từ 25/10 file process cố định cổng 3007 cho game này.

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
| **Sao** | Mỗi ải 3 sao: ★ thắng · ★ giáp còn ≥ 50 % Giáp tối đa · ★ độ chính xác ≥ 95 % (ải Thiếu chữ và Nghĩa: ≥ 90 %, vì đoán sai một chữ ẩn cũng tính lỗi; sao không được phạt người đang học). Lưu theo ải và chế độ. Ải đã qua chơi lại được (chọn súng tự do, không ảnh hưởng chương) để lấy sao và ôn từ |
| **Chơi một ải lẻ** (chơi lại lấy sao; ở R1 là mọi ải) | Dùng **bộ đồ tham chiếu** của ải đó (mục 8): số bến, cấp Rèn, Giáp tối đa. Súng chọn trước nhận cấp cao hơn. Như vậy người chơi gặp đúng ải mà ma trận theo ải đã cân, không dễ hơn vì bộ đồ cuối chương, cũng không khó hơn vì súng cấp 1 |
| **Lưu giữa ải** | `survival.journey` (JSON, phiên bản 1): chương, chế độ, seed chương, ải, lần thử, bộ súng và cấp, số bến, Giáp tối đa, Lõi, sao, ảnh chụp Mốc. Lưu ở màn Chọn cửa và Bảng tin ải. Thoát ở đó thì lần sau "Tiếp tục hành trình" về đúng chỗ |
| Bỏ dở giữa trận | Tính là thua ải (−1 Lõi). Hồ sơ gõ ghi là "bỏ dở" như S0 (không đổi số đo). Có hỏi lại trước khi thoát. Lúc vào trận, bản lưu ghi cờ `inFight` (ải, lần thử). Đóng tab hay tải lại trang giữa trận thì lần sau tính như bỏ dở. Như vậy không né được việc mất Lõi bằng cách đóng tab. Màn chính báo rõ: "Trận ải n bị bỏ dở: −1 Lõi" |

- **Chế độ** (Thư giãn, Cân bằng, Thử thách) chọn khi bắt đầu chương. Đổi chế độ thì bắt đầu chương mới.
- **Seed:** seed chương rút một lần khi bắt đầu chương. Seed của ải = hàm trộn (seed chương, số ải, lần thử). Mỗi trận vẫn là một replay riêng có đầu trận đầy đủ.

### 4.2 Bản đồ, bảng tin, nạp súng (DOM, bàn phím trước)

- **Bản đồ chương:** 10 nút trên một đường ray thép. Mỗi nút có biểu tượng mục tiêu, hiểm họa, luật học, sao đã có, và một dấu "MỐC" hoặc "BOSS". Có đèn LED Lõi Trạm và tóm tắt bộ súng (tên, cấp, bến). Người chơi thấy trước cả chương để tính đường.
- **Bảng tin ải:** tên ải, mục tiêu có số ("Hạ 3 trong 5 Đầu Đàn"), hiểm họa và cách báo trước, luật học, danh sách quái kèm thẻ khắc chế lấy từ `COUNTERS` (game hiện: "Trâu · Vỏ 4 · 220 máu, dẫn 5 bầy · khắc: RAY"; hàng Trâu của `COUNTERS` không có súng ○ nào, nên thẻ không có vế "được"). Súng trong bộ đồ khắc được quái nào thì sáng lên; quái chưa có súng khắc thì có dấu cảnh báo vàng. Enter vào trận.
- **Nạp súng** (đầu chương, hoặc khi chơi lại một ải): 5 thẻ súng. Chọn bằng phím 1–5 hoặc ← →, Enter chọn hoặc bỏ chọn, đủ 2 thì Bắt đầu. Mỗi thẻ ghi kiểu băng, tầm, khắc gì, bị gì khắc, độ dài từ ("dài tới +1 chữ" ở súng nặng).
  - Trên màn có dải **"Chương này gặp gì"**: các quái và hiểm họa của ải 1–5 (ải 6–10 hiện mờ). Mỗi mục có thẻ khắc chế. Bộ 2 súng đang chọn mà chưa khắc được mục nào thì mục đó có dấu cảnh báo vàng. Đây chỉ là gợi ý, không chặn lựa chọn.
  - Người mới chọn súng khi chưa biết Vỏ là gì. Hai luật sau giữ cho một lựa chọn sai không thành cái bẫy: Trâu đã xuất hiện ở ải 1 (mục 8), và có **cửa bảo hiểm** (mục 9).
- **Kho súng** ở màn chính (trước đây là giữ chỗ) nay hiện đủ 5 thẻ với số lấy từ `content/guns.ts`.

## 5. Súng và băng đạn

### 5.1 Năm súng (cấp 1, số khởi điểm)

| Súng | Kiểu băng (một băng) | Tầm | Sát thương | Vỏ | Khiên | Từ | Vai |
|---|---|---|---|---|---|---|---|
| **Xung** (S0) | 24 viên trong 2,4 s, liên thanh vào quái gần vạch nhất trong nón 50°; bắn rơi đạn lính trước | 10 m | 7 mỗi viên | tính đủ | bị chặn | dải E | Dọn bầy sát tuyến, chặn đạn lính |
| **Tia** (S0) | Tia 12 m, rộng 1,4 m, cháy 2,5 s, nhịp 0,1 s, quét 3 m/s từ cụm dày sang cụm kế | 12 m | 6 mỗi nhịp, mọi quái trong tia | tính đủ | đốt khiên trước (sát thương vào khiên), khiên vỡ thì xuyên qua | dải E | Cắt cụm dày, cắt hàng |
| **Tán** (mới) | 6 loạt trong 2,0 s; mỗi loạt 7 viên xòe trong nón ±18°; **đẩy lùi** 0,35 m mỗi viên trúng (không đẩy Trâu, Đầu Đàn, Tổ, Boss) | 7 m | 5 mỗi viên | tính đủ | bị chặn | dải E | Chặn tràn sát vạch, giảm rỉ giáp, dọn mảnh của Tách |
| **Ray** (mới) | 3 phát trong 2,4 s, mỗi phát nạp 0,15 s rồi bắn tức thì; **xuyên** tối đa 6 quái trên một đường, mỗi quái xuyên qua thì sát thương ×0,85. Ưu tiên: Đầu Đàn > Tổ > Boss > Trâu > Khiên > Lính > đường có nhiều quái nhất | 30 m | 70 mỗi quái | **× 0,25** | phá khiên ngay (khiên tính là một quái bị xuyên) | dải E, **+1 chữ ở đầu dài** (E ≥ 60: ở đầu ngắn, vì đầu dài chạm trần 10) | Hạ quái to, Tổ, Đầu Đàn ở xa; xiên hàng |
| **Pháo Sao** (mới) | 6 quả trong 3,0 s, bay vòng 0,7 s, nổ bán kính 3 m vào cụm nặng nhất (tính theo HP) ở 8–24 m | 8–24 m | 26 ở tâm, giảm đều còn 13 ở mép | tính đủ | **bỏ qua** (rơi từ trên xuống) | dải E, **+1 chữ ở đầu dài** (E ≥ 60: ở đầu ngắn) | Đánh cụm, đánh toán có khiên, đánh Tổ; vô dụng khi quái đã sát vạch (dưới 8 m) |

- **Vỏ** của quái: mỗi đòn trừ Vỏ, còn ít nhất 1. Ray chỉ tính Vỏ × 0,25.
- **Tầm với quái to:** với quái có bán kính > 0,8 (Trâu, Đầu Đàn, Tổ, Boss; xem mục 6), quái ở trong tầm khi **một phần thân chạm dải tầm** của súng, không cần tâm nằm trong dải. Tầm xa tính tới mép gần (z − bán kính), tầm gần của Pháo Sao tính tới mép xa (z + bán kính). Quả Pháo Sao rơi vào điểm của thân nằm trong dải.
  - Nhờ vậy Tán (tới z 8,7) vẫn với được Tổ đứng ở z 10 và boss đứng ở z 8.
  - Pháo Sao (tầm gần 8 m, tức z 9,7) vẫn đánh được boss ở z 8, vì mép xa của boss ở z 10,6. Nếu chỉ tính tâm thì Pháo Sao bị mù ở cả pha cuối của boss, trái ràng buộc 6 của mục 7.5.
- **Chất lượng gõ** (giữ số của S0): Chuẩn (0 lỗi) thì sát thương ×1,06 (ở ải chương: ×1 từ R1 đóng, xem dưới) và chí mạng +4 %. Nhanh (≤ 0,7 thời gian mong đợi) thì tốc bắn ×1,15. Luật mới: **Băng Chuẩn xuyên Vỏ**. Băng của từ gõ không lỗi chỉ tính Vỏ × 0,75 (với Ray là × 0,19). Gõ chuẩn thì đòn sạch hơn, đúng tinh thần "tri thức thành năng lượng".
  - **Ở ải chương, băng Chuẩn không thêm sát thương** (R1 đóng, 25/10; **đã chọn theo đề xuất** của changelog [`2026-10-25-s1-r1-close.md`](changelog/2026-10-25-s1-r1-close.md), mục "Còn lại" 2a). Phần thưởng của gõ chuẩn ở chương là **xuyên Vỏ** và chí mạng +4 %. Trận thử giữ ×1,06 của S0.
  - Đề xuất 2a ghi "bỏ ×1,15; cân nhắc cả ×1,06". **Bỏ luôn ×1,06 là lựa chọn của lane** trong phạm vi đề xuất đó, không phải phần bắt buộc. Phép so ở vòng r1 lẫn hai biến: `A1` là bỏ ×1,15 với Ray 110, `A2` là bỏ cả hai với Ray 112 (`tmp/mac-2026-10-25/rounds/r1/variants.txt`). Với Vỏ 5 của lúc đó, `A1` để lại đúng một ngưỡng chỉ người gõ sạch có: phát Ray Chuẩn 2 × 115,7 = 231 ≥ 220 (2 phát), phát có lỗi 2 × 108,75 = 217,5 (3 phát). Nếu xét lại thì đo `A1` với Ray 112.
  - Lý do: lượt review R1 thêm ×1,15 lên trên ×1,06 (×1,219). Tia vượt nửa máu một bầy (7,3 ≥ 7, hạ trong 2 nhịp thay vì 3), vòng nổ chết người của Pháo Sao rộng ra. Hai ngưỡng này chỉ người gõ sạch có, nên ở ải chương S của Chậm chắc hơn Ẩu 50 điểm (Trận thử: 9). k của nhịp (BALANCE §4.1) không thấy các ngưỡng đó.
  - Bù cho súng (đo ở [changelog 2026-10-25-s1-r1-mac](changelog/2026-10-25-s1-r1-mac.md)): Tia ở ải chương 7 mỗi nhịp (mọi người gõ đều hạ bầy trong 2 nhịp), Ray 112 (2 phát một Trâu, Chuẩn hay không), Pháo Sao 23, Vỏ của Trâu 4.
  - Không gắn luật này với Hoàn hảo (Chuẩn và Nhanh cùng lúc). Lý do: "Nhanh" so với chính E của người chơi, nên chỉ những từ gõ nhanh bất thường mới đạt. Với CV 0,25 thì chỉ khoảng 9 % số từ đạt Nhanh; với CV 0,35 là khoảng 19 %. Ước tính theo phân phối log-normal: bot Chuẩn có ~7 % băng Hoàn hảo, Chậm chắc ~4 %, Ẩu ~8 %. Nếu gắn với Hoàn hảo thì luật thưởng cho người gõ **không đều** và làm B4 yếu đi.
  - Gắn với Chuẩn thì tỉ lệ băng xuyên Vỏ đi theo độ chính xác: Chậm chắc ~95 %, Chuẩn ~80 %, Ẩu ~48 %. Cổng B4 vì vậy mạnh thêm thật. Hoàn hảo vẫn giữ nghĩa của S0, và có số kiểu `perfect`.
  - Băng Chuẩn làm Vỏ nhẹ đi với người gõ chuẩn. Bản đầu đặt Vỏ khởi điểm của Trâu là 5, để G3 vẫn đạt **với băng Chuẩn** (Ray hạ Trâu nhanh ≥ 2× Xung). **R1 đóng: Vỏ 4** (`foes.ts:46`), vì băng Chuẩn ở ải chương mất phần sát thương thêm. Nay với Trâu (220 máu, Vỏ 4): viên Xung Chuẩn 7 − 4 × 0,75 = **4**, viên có lỗi 7 − 4 = **3**; băng Xung ở ải chương 27 viên, tức 108 / 81 sát thương một băng. Phát Ray 112 − 4 × 0,25 = 111 (Chuẩn 111,25), 2 phát hạ một Trâu. Tính theo mỗi chữ gõ ở E 35 (dải nhẹ 3–6, trung bình 4,5 chữ; dải nặng 3–7, trung bình 5): Xung Chuẩn khoảng 24, Xung có lỗi 18, Ray khoảng 67 sát thương mỗi chữ. G3 đo trên sim: Ray / Xung Chuẩn 2,80×.
- **Rèn** (thưởng trong chương): cấp 2 thì sát thương mỗi đòn ×1,2. Cấp 3 thì ×1,4, và súng giữ tối đa **3 băng**. Vì Vỏ trừ thẳng, Rèn có lợi nhất cho súng đòn nhỏ: Xung cấp 3 (7 × 1,4 = 9,8) bắn Trâu (Vỏ 4) được 5,8 mỗi viên thay vì 3 (băng có lỗi), hoặc 6,8 thay vì 4 (băng Chuẩn).
- **Độ dài từ:** bảng `LENGTH_BY_E` như S0. Súng nặng (Ray, Pháo Sao) lấy từ **dài hơn 1 chữ ở đầu dài của dải** (đầu ngắn giữ nguyên), trần **10 chữ**, để băng mạnh phải trả bằng nhiều phím hơn. R1 đóng, **đã chọn theo đề xuất** (mục "Còn lại" 2b của changelog R1 close): bản trước thêm 1 chữ ở cả hai đầu; từ nào cũng dài thêm thì người gõ ẩu sai nhiều hơn hẳn chứ không chỉ "trả thêm một phím" (bỏ hẳn chữ thêm thì cách S Chậm chắc − Ẩu từ 50 còn 32). Giữ ở đầu dài để băng nặng vẫn có giá. Trần là 10 vì dải của E ≥ 60 đã là 6–10 chữ: trần 9 sẽ làm từ của súng nặng **ngắn hơn** súng nhẹ với người gõ nhanh. 10 chữ vẫn vừa bến 190 px ở 26 px (mục 10).
  - **Chữ trần không nhận thì sang đầu ngắn** (phản biện R1, 26/10; **đã chọn theo đề xuất** của phản biện). Với E ≥ 60, đầu dài 10 đã chạm trần, nên luật (b) đứng một mình cho súng nặng đúng dải 6–10 của súng nhẹ: hai câu "băng mạnh phải trả bằng nhiều phím hơn" và "băng nặng vẫn có giá" đều sai với người gõ nhanh, và thẻ súng hứa "+1 chữ" sai. Nay chữ mà trần từ chối ở đầu dài chuyển sang đầu ngắn (`HEAVY.spill` 1, `lengthFor`, `src/content/balance.ts:39`). E < 60 không đổi.

    | E | Dải súng nhẹ | Súng nặng trước R1 đóng | Luật (b) đứng một mình | Nay |
    |---|---|---|---|---|
    | < 20 (Trẻ em 15) | 3–5 | 4–6 | 3–6 | 3–6 |
    | 20–44 (Mới, Chậm chắc 25; Chuẩn 35) | 3–6 | 4–7 | 3–7 | 3–7 |
    | 45–59 (Khá, Ẩu 50) | 4–7 | 5–8 | 4–8 | 4–8 |
    | ≥ 60 (Nhanh 70) | 6–10 | 7–10 | **6–10** (bằng súng nhẹ) | 7–10 |

  - Đo trên bot Nhanh (bot duy nhất có E ≥ 60), Cân bằng, 100 seed, cùng mã, `--set=HEAVY.spill=0` so với 1: nhàn I giảm ở cả 8 ô (ải 1–4, seed 1–100: 14 → 11, 11 → 8,2, 8,8 → 6, 16 → 12 %; seed 101–200: 14 → 11, 12 → 8, 8,9 → 6,2, 16 → 12 %), S ải 4 giảm 3–4 điểm (36 → 33, 34 → 30). Số chỉ số lệch dải của Nhanh 9 → 10 (seed 1–100) và 9 → 8 (seed 101–200). Luật giữ vì nó đúng ý thiết kế và kéo nhàn của người gõ nhanh về dải, đúng chỗ B1 trượt nhiều nhất. Mọi bến dùng chung một danh sách "đã dùng" (không lặp từ trước khi hết dải). Chữ đầu của mọi từ đang hiện (các bến và từ chặn) luôn khác nhau.
- **Bến:** mỗi bến một súng. Bến có súng đã đầy băng thì gõ từ của nó cũng không nạp được gì (như S0). Thay súng (thưởng Súng) thì súng cũ mất cấp Rèn.

### 5.2 Bảng khắc chế (dữ liệu `COUNTERS`, dùng cho bảng tin, thẻ súng và bot)

Bảng dưới là **dự kiến**. `COUNTERS` trong mã không viết tay theo cảm tính: test G3m (mục 11.4) đo từng ô bằng kịch bản nhỏ, và test hỏng khi bảng khác số đo.

| Quái ↓ / Súng → | Xung | Tia | Tán | Ray | Pháo Sao |
|---|---|---|---|---|---|
| Bầy giữa sân (12–24 m) | ✕ (ngoài tầm) | ○ | ✕ | ○ | ● |
| Bầy sát vạch (≤ 8 m) | ● | ● | ● | ✕ (3 phát; bầy dàn ngang, ít con thẳng hàng) | ✕ |
| Lính và đạn lính | ● (bắn rơi đạn) | ○ | ○ | ● | ✕ (bay 0,7 s, lính đi lại) |
| Trâu, Đầu Đàn (Vỏ) | ✕ | ✕ | ✕ | ● | ○ |
| Khiên (và toán sau khiên) | ✕ | ○ | ✕ | ● | ● |
| Tách và mảnh | ○ | ● | ● | ✕ | ○ |
| Tổ (xa) | ✕ | ○ (khi Tổ bò tới gần) | ✕ | ● | ● |
| Boss Cai Ngục (thân, Vỏ 4) | ✕ | ✕ | ✕ | ● | ○ |
| Hộ tống của boss | ● | ● | ● | ○ | ○ |

● khắc · ○ được · ✕ kém. **Cách đo** (G3m): mỗi ô là một kịch bản nhỏ trong sim Node. Mọi súng nhận cùng số chữ gõ (tính cả chữ thêm của súng nặng), rồi đo thời gian dọn hết quái của hàng. Nếu thời gian ≤ 1,25 × súng nhanh nhất của hàng thì là ●. Nếu ≥ 2 × súng nhanh nhất, hoặc súng không với tới, thì là ✕. Còn lại là ○.

Bảng này giữ ba ràng buộc:
- Không súng nào ● ở mọi hàng.
- Mỗi súng ● ở ít nhất hai hàng, và ✕ ở ít nhất hai hàng.
- Mọi bộ 2 súng đều có ít nhất một hàng mà **cả hai súng đều không ●**. Bộ nào cũng có chỗ hở, nên không có bộ "giải xong".

Ray là súng có nhiều ● nhất (5 hàng), và là ● duy nhất ở hàng Trâu và hàng Boss. Đây là chỗ dễ thành "súng bắt buộc", nên:
- Ray ✕ ở bầy sát vạch. Đúng với G3 (Tán giữ đợt 40 bầy ở 6 m, mất giáp ít hơn Ray ≥ 30 %). Bản trước ghi ○, nên Ray chỉ có một ✕, trái ràng buộc thứ hai ở trên.
- Lối thứ hai với Vỏ phải dùng được thật: Pháo Sao ○, và Xung đã Rèn với băng Chuẩn (mục 5.1). G2(d) đo việc này bằng tỉ lệ thắng.

Không được đọc bảng bằng cách đếm ●. Ray và Pháo Sao có nhiều ● ở các hàng quái to, nhưng quái to chỉ là vài phần trăm số quái. Bầy (70–85 % số quái, và là nguồn rỉ giáp chính) mới là hai hàng nặng nhất. Bot và bảng tin cân các hàng theo trọng số của ải (mục 11.2).

## 6. Quái

| Loại | Model (`rainbow-…-3d`) | HP | Vỏ | Tốc (m/s) | Bán kính | Chạm vạch | Rỉ giáp (trọng số) | Hành vi |
|---|---|---|---|---|---|---|---|---|
| **Bầy** (S0) | `mine` | 14 | 0 | 2,6 | 0,5 | −3 | 1 | Như S0: đi theo trường hướng, chậm dần khi áp sát |
| **Lính** (S0) | `scout` | 56 | 0 | 1,8 | 0,8 | −6 | 2 | Đứng 6–9 m, bắn đạn −3 mỗi 3 s, đi tiếp sau 12 s |
| **Trâu** | `tank` | 240 | 5 (R1 đóng: 4) | 1,25 | 1,1 | −12 | 4 | Chậm, nặng: đẩy bầy sang bên (khối lượng 4), không bị Tán đẩy lùi. Thường đi đầu một toán 5 bầy |
| **Khiên** | `shield` | 80 + khiên 100 | 0 | 1,9 | 0,8 | −6 | 2 | **Khiên năng lượng** quay về phía tàu: đoạn chắn rộng 2,6 m đặt 0,8 m trước thân. Đạn Xung và viên Tán chạm đoạn chắn thì dừng (0 sát thương), nên cả **toán đi sau** nó cũng được che. Ray phá khiên ngay; Tia đốt khiên; Pháo Sao bỏ qua. Khiên vỡ thì không hồi. Đi đầu một toán 6 bầy hình nêm |
| **Tách** | `splitter` | 42 | 0 | 2,2 | 0,7 | −4 | 1,5 | Chết thì vỡ thành **3 mảnh** (bầy nhỏ: 9 HP, 3,0 m/s, bán kính 0,4, chạm vạch −2, rỉ 0,5) văng ra ±1,2 m |
| **Đầu Đàn** | `tank` + đèn hiệu | 360 | 3 | 1,1 | 1,3 | **−15** | 6 | Mục tiêu của "Săn". Có toán hộ tống 8 bầy đi trước. Phải nhận ra ngay giữa đám Trâu cùng model: vẽ to hơn Trâu 1,25×, viền phát sáng vàng, cột đèn hiệu, vạch dọc trên sàn, và một mũi tên ở mép màn khi nó còn ngoài khung nhìn. Là biến thể của họ Trâu, nên `checkChapter` tính chung với Trâu là một quái |
| **Tổ** | `carrier` (đứng yên, bò) | 800 | 2 | bò 0,2 | 1,8 | — | 0 | Mục tiêu của "Phá Tổ". Xuất hiện ở z 30–36, bò tới z 10 thì dừng. Đẻ 6 bầy mỗi 7 s, khoảng đẻ ngắn dần còn 3,5 s ở giây 180 (× chế độ × k, × bậc `spawn` của bộ điều nhịp) |
| **Boss Cai Ngục** | `warden-rainbow` (chuyển động do AI làm, mục 12.1) | 5.000 | 4 | 0,35 | 2,6 | không chạm (đứng cuối ở z 8) | 8 khi trong 16 m | Mục 7.4 |

- Thuộc tính tinh anh **Bọc Thép** (tên mới của "Giáp" ở S0) vẫn là HP ×2, do bộ điều nhịp thêm hoặc bớt. Nó chỉ áp lên **toán thường** (bầy, lính, Tách). Không áp lên Trâu, Khiên (cả khiên), Đầu Đàn, Tổ, Boss. Lý do: Trâu Bọc Thép sẽ có 440 HP, Vỏ 4. Với bộ súng không khắc thì một con cần khoảng 5–6 băng Xung có lỗi (27 viên × 3 = 81 một băng; bản đầu với Vỏ 5 và băng 24 viên là khoảng 10). Bậc `elite` khi đó thành một bức tường, không còn là một nấc khó. `eliteCost` và W của bộ điều nhịp tính theo thành phần quái của từng ải (`chapter-1.ts`), không dùng số của S0.
- Quái to (bán kính > 0,8: Trâu, Đầu Đàn, Tổ, Boss) nằm trong một **danh sách riêng** (tối đa 32), thử va chạm tuyến tính. Lưới 2 m giữ `MAX_RADIUS` **0,8 như hiện tại** (`sim/hits.ts`), để truy vấn không nở ra và vết sự kiện của Trận thử không đổi (R1 bước 1). Vì vậy Khiên có bán kính 0,8 (bằng Lính). Bản trước ghi "giữ 0,9" và Khiên 0,9: mã đang là 0,8, nên Khiên sẽ lọt khỏi truy vấn của lưới.
- Khiên là một **danh sách đoạn chắn** (tối đa 32). Đạn Xung, viên Tán thử đoạn chắn trước rồi mới thử thân quái. Xung **chọn mục tiêu khôn**: bỏ qua quái mà đường bắn bị khiên chặn, để không phí băng.

## 7. Luật Ải: thư viện S1

### 7.1 Mục tiêu

| Mục tiêu | Thắng khi | Thua khi | Số khởi điểm |
|---|---|---|---|
| **Trụ vững** (S0) | Hết giờ mà còn giáp | Hết giáp | 150–180 s |
| **Săn Đầu Đàn** | Hạ đủ N trong M Đầu Đàn. Ngay lúc đó **bầy rút lui**: quái còn lại mờ đi trong 2 s, không gây hại nữa, ải kết thúc | Hết giáp, hoặc số Đầu Đàn lọt qua vạch > M − N | Ải 2: 3/5, đến ở giây 20, 50, 80, 110, 140. Ải 7: 4/6, đến mỗi 25 s từ giây 20. Trần an toàn 240 s |
| **Phá Tổ** | Hạ hết Tổ. Bầy rút lui như trên | Hết giáp, hoặc tới trần 300 s ("Tổ nở", thua) | Ải 5: 2 Tổ. Ải 8: 3 Tổ. Luồng thường của ải vẫn chạy, ở mức thấp |
| **Boss** | Hạ boss | Hết giáp, hoặc tới trần an toàn 600 s (chỉ để không có trận vô tận; G6 kiểm không trận nào chạm trần) | Mục 7.4 |

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
| **Thiếu chữ** | Từ có 1 chữ ẩn (từ ≤ 6 chữ) hoặc 2 chữ ẩn (≥ 7 chữ), hiện thành ô "_". **Không bao giờ ẩn chữ đầu** (khóa bến cần nó), không ẩn hai chữ liền nhau. Chữ ẩn chọn bằng một luồng riêng `hide` (tất định), để dãy từ được chia giống hệt khi không có luật này | IPA và nghĩa luôn hiện để gợi nhớ. Gõ tới đâu chữ hiện tới đó. **Gợi ý:** gõ sai ở một ô ẩn thì ô đó hiện chữ đúng ngay (lần sai vẫn tính lỗi). Người chơi không bao giờ phải đoán mò quá một phím | `learning` |
| **Nghĩa** | **Nghĩa tiếng Việt** (to, cùng cỡ chữ với từ ở luật Chuẩn: 32 px, co tới 26 px, tối đa 2 dòng) + chữ đầu tiếng Anh và số ô chữ ("h · · · ·") | Đang gõ: nghĩa và các chữ đã gõ. IPA và từ đầy đủ chỉ hiện khi gõ xong, kèm phát âm. **Gợi ý:** từ đã hiện 5 s mà chưa gõ xong, hoặc đã khóa mà 2 s không có phím đúng, thì cả từ hiện mờ trên bến và trong khung học (Thư giãn: 3 s và 1,2 s). Từ đã có gợi ý không tính Chuẩn | trộn `new` 0,6 + `learning` 0,4 |

- **Từ của ải Nghĩa:** Nghĩa là bài **nhớ lại**, nên chỉ dùng từ người chơi **đã gõ ít nhất một lần** (`survival.seen`), ưu tiên từ đã gặp trong chính chương này. Danh sách chỉ số từ (`recall`) đi vào đầu trận để replay tái lập được. Trong bot và Trận thử, `recall` rỗng nghĩa là dùng cả dải.
  - Bỏ những từ mà bộ (nghĩa, chữ đầu, số chữ) trùng với một từ khác trong dải, để mỗi đề chỉ có một đáp án.
  - Bỏ những từ có nghĩa quá dài, không vừa 2 dòng ở 26 px trên bến. Kiểm việc này khi dựng dải từ.
  - `seen` còn ít (dưới 60 từ hợp lệ, ví dụ khi chơi lẻ ải 9 sớm) thì phần thiếu lấy từ dải. Từ chưa từng gặp thì hiện gợi ý ngay từ đầu, không bắt người chơi nhớ một từ chưa học.
- **Nhịp của ải theo luật học:** nhịp không lấy thẳng từ `paceK` với d mới. k của kit bị kẹp ở 0,75–1,30; bot Mới đã nằm ở sàn 0,75 (k thô ≈ 0,70), nên ải Nghĩa sẽ không thưa đi chút nào cho người gõ chậm, trong khi người Chuẩn được thưa đi 21 %. Thay vào đó, game nhân k của hồ sơ (đã kẹp) với **hệ số học ρ**:
  - ρ = C(E_eff; ℓ̄; d_luật) / C(E_eff; ℓ̄; d_known), tính bằng hàm `capacity` và `familiarityMix` của kit, kẹp trong 0,6–1,0, làm tròn 1/1000, và ghi vào đầu trận.
  - Số dự kiến: Chuẩn có ρ = 0,87 ở Thiếu chữ và 0,79 ở Nghĩa; Mới có ρ = 0,78 ở Nghĩa.
- Ràng buộc: luật học khó (Thiếu chữ, Nghĩa) không đi chung với hiểm họa nặng trong một ải.
- Hồ sơ gõ: trận có luật Thiếu chữ hoặc Nghĩa **không cập nhật E và CV** (gõ theo trí nhớ chậm hơn thật). Trận đó chỉ ghi độ chính xác, thời gian nhận từ theo độ quen, và số lần dùng gợi ý.

### 7.4 Boss Cai Ngục (ải 10)

| Pha | HP | Boss làm gì | Hộ tống | Đòn Sập |
|---|---|---|---|---|
| Ra mắt | — | Ở giây 20 bước qua cổng. Camera zoom chậm 6 % trong 2 s. Biển "CAI NGỤC · BẦY HỐ ĐEN". Thanh máu boss ở giữa trên, có vạch chia pha | — | — |
| P1 | 100–66 %, **tối đa 50 s** | Đi tới z 22 rồi đứng | 6 bầy mỗi 8 s từ hai bên boss | mỗi 20 s |
| P2 | 66–33 %, **tối đa 50 s** | Gầm, sóng chấn (T4); đi tới z 15 | Thêm một toán Khiên mỗi 16 s | mỗi 17 s |
| P3 | < 33 % | Cuồng nộ; đi tới z 8 | Tách mỗi 10 s. "Gầm": hộ tống nhanh thêm 20 % trong 5 s, mỗi 20 s | mỗi 14 s |

- **Đổi pha theo HP hoặc theo giờ.** Ở z 22, mép thân boss là z 19,4, ngoài tầm Xung (z 11,7), Tia (z 13,7) và Tán (z 8,7). Nếu pha chỉ đổi theo HP, bộ đồ toàn súng gần sẽ không gây được sát thương nào. Boss sẽ đứng mãi ở P1, và trận chỉ kết thúc khi tuyến bị rỉ hết giáp: đó là thế kẹt không thể thắng. Vì vậy mỗi pha có trần thời gian. Hết giờ thì boss **bước tới** pha sau, dù HP còn cao; thanh máu boss ghi "TIẾN LÊN". Ở P3, boss đứng ở z 8 (mép thân z 5,4), trong tầm của mọi súng.
- **Đòn Sập** báo trước bằng một **làn đỏ** có sọc cảnh báo trên sàn, từ boss tới vạch, và một **từ chặn** (từ đã thuộc, chữ đầu khác mọi bến). Từ chặn hiện trên một dải đỏ riêng, ngay trên khung học. Khung học không bị che.
  - Độ dài từ chặn theo E của người chơi: 3–4 chữ khi E < 20, 3–5 chữ khi E 20–44, 4–5 chữ khi E ≥ 45.
  - Thời gian báo trước phải đủ cho chính người đang chơi. Lấy T = max(2,5 s; 0,6 s + 1,6 × (ℓ + 1) × 12 / E_eff), rồi nhân với `telegraphScale(phản xạ)` của kit (× 0,85–1,5 theo yếu tố 9 của hồ sơ). Kẹp T trong 2,5–6 s (Thư giãn: 3,5–8 s). Hệ số `telegraph` đi vào đầu trận.
  - Số dự kiến khi phản xạ mặc định (× 1,0) và từ chặn 4 chữ: Chuẩn khoảng 3,9 s, Mới khoảng 5,6 s. Trẻ em gõ từ 3 chữ ở Thư giãn: khoảng 7,6 s. Phản xạ mặc định của trẻ em là 0,6 (× 1,19), nên số này chạm trần 8 s.
  - Không dùng 1/k ở đây. Dùng 1/k thì người gõ nhanh có ít thời gian hơn. Nhưng chặn được hay không là phản xạ (yếu tố 9 của BALANCE §2), không phải sức gõ. Sức gõ đã được tính vào T qua E_eff.
  - Gõ kịp: "CHẶN!", lóe khiên ở vạch (T3), không mất gì.
  - Không kịp: −10 giáp (Thư giãn −5, Thử thách −14) và đòn T4 vào tuyến.
  - Đang gõ dở một bến mà muốn chặn thì phải gõ xong hoặc Backspace về 0. Đó là một quyết định thật.
  - Hết trận, số lần chặn được trên tổng số Đòn Sập đi vào mẫu `telegraph` của `updateSkill`, để kit học phản xạ của người chơi.
- Boss không bị Bọc Thép. HP boss chỉnh sao cho bộ đồ tham chiếu ải 10 hạ boss trong 150–240 s (G6). Mọi bộ 3 súng đều phải thắng được (G6, mục 11.4).

### 7.5 Ràng buộc của chương (`checkChapter`, test)

1. Không hai ải trong chương có cùng bộ ba (Mục tiêu, Hiểm họa, Luật học).
2. Mỗi thứ mới (quái, mục tiêu, hiểm họa, luật học) xuất hiện lần đầu ở một ải có tên trong cột "Dạy" (mục 8). Chưa dạy thì chưa dùng.
3. Mỗi ải dạy tối đa **một** cơ chế mới (mục tiêu, hiểm họa hoặc luật học) và tối đa **một** quái mới.
4. Luật học khó không đi với hiểm họa nặng.
5. Ải dựng tay: ải 5 (Mốc) và ải 10 (Boss).
6. Không có thứ gì chỉ hạ được bằng súng ngoài tầm. Mọi mục tiêu của ải (Đầu Đàn, Tổ, boss ở pha cuối) phải tới được trong tầm của mọi súng (thân chạm dải tầm, kể cả tầm gần 8 m của Pháo Sao; mục 5.1), hoặc có trần thời gian đẩy nó lại gần.
7. Mỗi ải đạt ngân sách chú ý (mục 7.6) trên dòng thời gian dự kiến.

### 7.6 Ngân sách chú ý (không ngộp)

Chủ dự án muốn trận căng mà không ngộp. Từ S1, mắt người chơi phải theo nhiều thứ: 3 bến, từ chặn, hiểm họa, biển mục tiêu, Đầu Đàn và đỉnh tràn. Vì vậy số thứ đòi chú ý cùng lúc có trần cứng, và test kiểm trần này.

| Luật | Trần |
|---|---|
| Từ sống (gõ được) cùng lúc | ≤ 4: 3 bến + 1 từ chặn. Từ khóa cửa chỉ có ở màn chương, khi thế giới đã dừng |
| Báo trước đang chạy cùng lúc (hiểm họa, Đòn Sập, tiếng tù và của Đầu Đàn, biển "ĐỈNH TRÀN") | ≤ 1. Hai lần báo trước liền nhau bắt đầu cách nhau ≥ 4 s. Bộ lập lịch (`plan.ts`) dời cái đến sau, rồi ghi sự kiện `plan` vào nhật ký để soi lại |
| Hiểm họa so với đỉnh tràn | Không nổ trong 3 s đầu của một đỉnh tràn. Vết nứt không rơi vào đỉnh "dữ dội" |
| Biển giữa màn | ≤ 1 cùng lúc. Biển mục tiêu cố định ở trên, không nhấp nháy, chỉ đổi số |
| Thứ mới trong ải | ≤ 1 cơ chế + 1 quái (mục 7.5). Lần đầu nó xuất hiện có một thẻ nhỏ 2 s ở vùng biển trên ("MỚI · TRÂU · Vỏ 4"). Trận không dừng |
| Khung học | Không lớp nào đè lên. Dải từ chặn nằm ngoài khung |

- Test (`tests/stage-rules.test.ts`): chạy dòng thời gian của 10 ải, mỗi ải 20 seed ở cả 3 chế độ, đếm số lần có hai báo trước chồng nhau. Đích là 0.
- Kịch bản `survival-s1-hazards` và `survival-s1-boss` chụp lúc có báo trước, rồi kiểm rằng chỉ có một báo trước trên màn.

## 8. Chương 1 "Hành Lang VC-7" (họ `rainbow` dưới lớp Bầy Hố Đen)

Số ở k = 1, Cân bằng, là **khởi điểm**. Đỉnh tràn vẫn nhân sức rút từ seed như S0, xác suất "dữ dội" 15 % ở ải 1–3 và 25 % ở ải 4–9. Mọi nhịp nhân hệ số của chế độ và k.

| # | Tên | Mục tiêu | Hiểm họa | Luật học | Toán (tỉ lệ toán) | Nhịp thường (con/s) | Đỉnh tràn (giây) | Dài / trần | Dạy | Bộ đồ tham chiếu |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Ca trực đầu | Trụ vững | — | Chuẩn | bầy 85 · lính 12 · trâu 3 (toán Trâu từ giây 80) | 2,9 | 50, 115 | 150 s | luồng, 2 bến, Trâu (Vỏ) | 2 bến cấp 1, giáp 100 |
| 2 | Đầu Đàn | Săn 3/5 | — | Chuẩn | bầy 80 · lính 12 · trâu 8 | 2,6 | 70 | trần 240 s | Săn, Đầu Đàn (họ Trâu) | như ải 1 |
| 3 | Vách nứt | Trụ vững | Vết nứt | Chuẩn | bầy 80 · lính 12 · trâu 8 | 2,8 | 55, 140 | 165 s | Vết nứt | như ải 1 |
| 4 | Khiên sáng | Trụ vững | — | Thiếu chữ | bầy 75 · lính 12 · khiên 13 | 2,7 | 55, 140 | 165 s | Khiên, Thiếu chữ | 1 súng cấp 2 |
| 5 | Tổ ngầm (**Mốc**, dựng tay) | Phá 2 Tổ | — | Chuẩn | bầy 70 · lính 10 · trâu 10 · khiên 10, cộng bầy do Tổ đẻ | 1,6 | — (Tổ đẻ dồn dần); giây 40 có "Đoàn hộ tổ": 1 trâu + 2 khiên | trần 300 s | Phá Tổ | 1 súng cấp 2, giáp 110 |
| 6 | Bão ion | Trụ vững | Bão ion | Chuẩn | bầy 75 · lính 10 · khiên 7 · trâu 8 | 2,9 | 50, 135 | 165 s | Bão ion, bến 3 | 3 bến, 1 súng cấp 2, giáp 110 |
| 7 | Bầy tách | Săn 4/6 | Vết nứt | Chuẩn | bầy 70 · tách 14 · trâu 8 · lính 8 | 2,7 | 80 | trần 240 s | Tách | 3 bến, 2 súng cấp 2, giáp 110 |
| 8 | Giếng đen | Phá 3 Tổ | Giếng hấp dẫn | Chuẩn | bầy 70 · tách 12 · khiên 10 · lính 8 | 1,8 | — | trần 300 s | Giếng hấp dẫn | 3 bến, cấp 2/2/1, giáp 120 |
| 9 | Lời của trạm | Trụ vững | Vết nứt | Nghĩa | bầy 65 · lính 10 · trâu 9 · tách 9 · khiên 7 | 3,0 | 55, 120, 160 | 180 s | Nghĩa | 3 bến, cấp 3/2/1, giáp 120 |
| 10 | Cai Ngục (**Boss**, dựng tay) | Boss | — | Chuẩn | boss + hộ tống theo pha | 1,6 (20 s đầu) | — (Đòn Sập) | đến khi xong | Boss, từ chặn | 3 bến, cấp 3/2/2, giáp 120 |

- Bộ ba (Mục tiêu, Hiểm họa, Luật học) của 10 ải đều khác nhau. Thiếu chữ (ải 4) và Nghĩa (ải 9) chỉ đi với "không" hoặc Vết nứt (nhẹ).
- **Trâu ra mắt ở ải 1, không phải ải 2.** Bản đầu của đặc tả dồn vào ải 2 cả Vỏ, Trâu, Đầu Đàn lẫn mục tiêu Săn: hai quái mới và một cơ chế mới, trái ràng buộc 3. Ải 2 lại là ải đầu tiên mà bộ súng chọn mù ở đầu chương bị thử thật. Nay ải 1 cho thấy vài toán Trâu ở nửa sau (bảng tin có thẻ "Trâu · Vỏ 4 · 220 máu, dẫn 5 bầy · khắc: RAY"). Người chơi gặp Vỏ ở một ải dễ, rồi mới tới cửa đầu tiên (có cửa bảo hiểm, mục 9). Sau đó ải 2 chỉ dạy Săn và Đầu Đàn.
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
- Rút cửa bằng luồng `loot` từ seed chương, trọng số Súng 30 · Rèn 35 · Lõi 20 · Sửa 15. Hai cửa không trùng loại. Chơi lại cùng seed chương thì ra cùng cửa (test). Cửa là hàm thuần của (seed chương, số ải, trạng thái hành trình).
- **Cửa bảo hiểm:** sau ải 1–4, nếu bộ súng chưa có súng nào ● với quái chính của ải kế, thì một trong các cửa mời **chắc chắn là Súng**. Quái chính là quái có trọng số lớn nhất ngoài bầy (mục 11.2). Thưởng Súng khi đó luôn có ít nhất một súng khắc được quái ấy. Luật này giữ cho lựa chọn mù ở đầu chương không thành cái bẫy kéo dài ba ải, mà vẫn để lựa chọn tốt ở đầu chương có giá trị: người chọn tốt được cửa Rèn hay Lõi thay vì phải lấy Súng.
- **Chọn bằng gõ từ khóa tiếng Anh** (kế hoạch §4.7, học thêm) hoặc phím 1/2/3 (trợ năng). Mỗi thẻ cửa hiện từ khóa, nghĩa tiếng Việt và thưởng. Không có "đổi cửa" ở S1 (cần Vàng).
- **Thẻ thưởng** cũng chọn bằng gõ hoặc phím 1/2/3. Thẻ súng dùng tên tiếng Anh của súng: `pulse`, `beam`, `scatter`, `rail`, `flak`. Thẻ Rèn dùng tên súng được rèn. Chữ đầu các thẻ trên một màn luôn khác nhau.

## 10. Học trong S1

- Khung học, phát âm, gửi sự kiện học với `gameId` `typing-survival`: như S0. Thêm: từ chặn của boss và từ khóa của cửa cũng gửi sự kiện học khi gõ xong.
- **Bố cục** (từ lượt cảm giác 26/10, `docs/FEEL_PASS_S1.md` §2, phương án B của study C; bản cũ "khung học 420 px giữa đáy, bến hai bên khung" bỏ vì mắt phải nhảy 386–451 px giữa chữ và chỗ đạn trúng). Số ở 1280×720, `--ui` 1; 1920×1080 nhân 1,5:
  - **Dòng từ** (`src/view/strip.ts`): cao 56 px, đáy ở y 472, giữa màn. Tấm ôm từ (đệm 16 px mỗi bên), rộng tối đa 420 px, nền `--strip` (đặc 0,72). Chỉ có từ đang gõ, 42 px; ẩn khi chưa khóa từ; gõ xong hiện "từ · nghĩa ✓" 0,6 s. Đáy dòng tính từ phép chiếu của mép xa dải sọc vạch đáy (476 px) trừ 4 px, không viết px cứng.
  - **Bến**: `[bến 3 · 208][bến 1 · 230] tàu [bến 2 · 230][bến 4 · 208]`, cao 100 px, y 508–608 (dưới quầng vạch đỏ, tính bằng phép chiếu), x 16–224, 236–466, 814–1044, 1056–1264. Nền `--bay-glass` (đặc 0,64). Bến đang gõ hiện IPA · nghĩa trên một dòng.
  - Ô bến 3 và bến 4 có ngay từ đầu, là tấm thép tối. Ô bến 3 ghi "MỞ Ở MỐC"; ô bến 4 chỉ có biểu tượng khóa. Qua Mốc thì ô bến 3 sáng lên, và bố cục không nhảy.
  - Đầu bến gọn: tên súng 12 px; thanh băng 2–3 vạch 22 px cùng hàng với tên. Kịch bản `survival-s1-loadout` và `survival-feel` (cảnh `layout`, 3 vạch băng) kiểm không phần tử nào trong bến bị tràn (`scrollWidth ≤ clientWidth`).
  - Chữ trên bến 32 px như S0. Từ ≥ 8 chữ được tự co, nhưng không dưới 26 px. Nghĩa trên bến giữ một dòng có "…" như S0, trừ ở luật Nghĩa (mục 7.3).
  - Quái vùng gần (≤ 7 m) nằm sau dòng từ: một vạch đỏ 24 × 3 px dưới tấm ở đúng cột x của quái, chớp 4 Hz, tối đa 6.
- **Vùng cấm cho số sát thương:** 3 bến, dòng từ (ở bề rộng tối đa, kể cả khi đang ẩn), dải từ chặn, thanh giáp, thanh máu boss, biển mục tiêu. Đích vẫn là 0 lần đè.
- Màn **Tổng kết chương:** từ đã gõ, **từ mới gặp** (lần đầu theo `survival.seen`), các từ gõ sai nhiều nhất (bấm để nghe), sao, thời gian, Lõi đã dùng.

## 11. Cân bằng

### 11.1 Đầu trận và bộ điều nhịp

- `RunHeader` thêm các trường sau. Đầu trận đi vào `createWorld`, mã băm, ảnh chụp, replay và `scripts/replay.ts`.
  - `stage`: ví dụ `"c1-s4"`, hoặc `"s0"` cho Trận thử.
  - `kit`: `{ guns, levels, bays, armourMax }`.
  - `learn`: hệ số học ρ (mục 7.3), bằng 1 ở luật Chuẩn.
  - `telegraph`: hệ số báo trước từ `telegraphScale` (mục 7.4).
  - `recall`: danh sách từ cho luật Nghĩa (mục 7.3), có thể rỗng.
- Nhịp của ải: **k_ải = k × ρ**. k là `paceFor` của S0 (đã kẹp 0,75–1,30, d = `known`), đúng BALANCE §4.1. ρ là **hệ số của ải**, giống hệ số của chế độ (Thư giãn đã nhân tốc ra quái × 0,66), không phải một k thứ hai. Vì ρ nằm ngoài phần kẹp, người ở sàn 0,75 vẫn được thưa đi khi luật học khó hơn. k_ải nhân vào tốc ra quái, sức đỉnh tràn, tốc đi (như S0), và vào khoảng đẻ của Tổ, kích thước toán của Vết nứt, nhịp hộ tống của boss. Không nhân vào thời gian báo trước (mục 7.4).
- W (tổng HP quái của ải) và `eliteCost` của bộ điều nhịp tính theo thành phần quái của từng ải, không dùng HP bầy và lính của S0.
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
- **Chấm súng cho một ải** (dùng ở bot và ở bảng tin): điểm = Σ theo hàng của `COUNTERS` của w(hàng, ải) × v(ô), với v ● = 1, ○ = 0,5, ✕ = 0.
  - w là phần của hàng trong **mối nguy** của ải: phần HP của hàng trong thành phần quái, nhân với hệ số nguy.
  - Hệ số nguy: bầy sát vạch × 1,5 (nguồn rỉ giáp chính); mục tiêu của ải (Đầu Đàn, Tổ, boss) × 2; Lính × 1,2 (đạn bắn tàu).
  - Bộ 2 súng được chấm **cả bộ**: mỗi hàng lấy v lớn nhất của hai súng. Như vậy bộ phủ được nhiều hàng hơn thì điểm cao hơn, không phải hai súng "mạnh" nhất cộng lại.
  - Không đếm ●. Đếm ● thì bot Tốt sẽ luôn chọn Ray và Pháo Sao (nhiều ● ở các hàng quái to), và cổng G2 sẽ trượt ngay từ cách tính.
- Các cấp chiến thuật của kit giữ trọng số chọn mục tiêu (`TARGET_MIX`) và phản xạ (`REFLEX`). Thêm `tests/survival/tactics.ts` cho các quyết định ngoài trận:

| Quyết định | Tốt (`good`) | Vừa (`fair`) | Kém (`poor`) |
|---|---|---|---|
| Nạp súng đầu chương / chơi lại ải | Bộ (2 hoặc 3 súng, theo số bến) có điểm cao nhất. Đầu chương: tính trên các ải 1–5, trọng số giảm dần theo khoảng cách tới ải. Chơi lẻ một ải: chỉ ải đó | 50 %: như Tốt; 50 %: một bộ ngẫu nhiên | **Luôn** Xung + Tia (hai thẻ đầu, bộ của S0): người chơi giữ thứ quen, không đọc khắc chế. Ở ải có 3 bến (bộ đồ tham chiếu ải 6–10, bến 3 ở Mốc): thêm Tán (thẻ đầu còn lại) |
| Chọn cửa | Sửa khi đã mất ≥ 1 Lõi và còn ≤ 1; Súng khi các ải tới có quái chưa ai khắc; còn lại Rèn súng khắc chính | 50 / 50 | Cửa đầu tiên |
| Thưởng Súng, Rèn | Theo điểm khắc chế | 50 / 50 | Thẻ đầu |
| Bão ion | Không gõ bến đang tê; nạp các bến khác lúc báo trước | Nửa số lần | Bỏ qua cảnh báo |
| Từ chặn | Theo `REFLEX` (Tốt 0,9; Vừa 0,75; Kém 0,5): bỏ từ đang gõ dở nếu cần | như bên trái | như bên trái |

- Độ quen theo luật học: Chuẩn `known`, Thiếu chữ `learning`, Nghĩa `new`. Mọi lựa chọn rút từ RNG của bot (có seed), nên mỗi trận vẫn tất định và chạy lại được.
- **Bot nhớ lại** (khởi điểm, chỉnh theo B9). Bot của kit chỉ chép từ đang thấy, nên trước hết không biết quên. Ở hai luật học khó, bot rút thêm một lần "nhớ" cho mỗi từ:
  - Thiếu chữ: mỗi ô ẩn nhớ sai với xác suất 0,2 (Chuẩn), 0,3 (Mới), 0,4 (Trẻ em). Nhớ sai thì gõ một phím sai, ô hiện chữ đúng, rồi gõ tiếp.
  - Nghĩa: mỗi từ không nhớ ra với xác suất 0,15 (Chuẩn), 0,25 (Mới), 0,35 (Trẻ em). Không nhớ ra thì bot chờ gợi ý (mục 7.3) rồi mới gõ.
  - Khi không có hai luật này, mọi xác suất bằng 0, nên số đo ở luật Chuẩn không đổi.

### 11.3 Báo cáo

- `pnpm survival:balance --stages=c1-s1,…` (**ma trận theo ải**): mỗi ải, mỗi bot (9 bot chuẩn + "Chuẩn · Tốt / Kém"), mỗi chế độ, N seed. Mỗi trận vào ải với **bộ đồ tham chiếu** của ải (mục 8) và súng do bot tự chọn. In bảng §3 (thắng, S, P, I, O, N, Q), thời gian hạ quái, bậc mỗi đợt, giáp mất theo nguồn, thời lượng ải, tỉ lệ chặn đòn, súng đã chọn. Sau đó in B1–B9 và G1–G8.
- **Thời gian hạ quái** (vế thứ hai của B4, BALANCE §7): trung bình trên mọi con bị hạ, số giây con đó đã sống **trong vùng hút giáp** (từ lúc nó đi qua `drainFrom`, 14 m ở ải chương và 16 m ở Trận thử, tới lúc chết); con bị hạ trước khi vào vùng tính 0 s. Đây là cách đo của game này từ R1 lượt súng (`f975d02`, `src/sim/projectiles.ts`), đã chọn theo đề xuất của review: trước đó tính từ lúc sinh, nên súng xa giết sớm lại có thời gian dài nhất và B4 đo tầm của bộ súng chứ không đo cách gõ. Trận thử cũng đo theo cách này (chỉ `stats.lifeSum` của vết vàng đổi). Chủ BALANCE ở repo cha cần ghi cách đo này vào BALANCE §7 cho Tuyến Cuối.
- `pnpm survival:balance --chapter=1` (**ma trận theo chương**): bot chơi cả chương bằng quyết định của chính nó (nạp súng, cửa, thưởng, bến), có Lõi và Mốc. In: qua chương lần đầu, qua không mất Lõi, Lõi đã dùng, số lần quay lại Mốc, thời gian, sao trung bình, ải hay thua nhất, tỉ lệ chọn từng súng.
- Khi chỉnh dùng 40 seed (sai số tỉ lệ thắng ~6 điểm). Báo cáo của mỗi đợt dùng **100 seed** (~4 điểm). Số ~4 là sai số chuẩn của một tỉ lệ ở 100 seed (√(p(1 − p)/100) ≤ 5 điểm). Hai bộ 100 seed độc lập có thể chênh nhiều hơn: ở ải 3 (R1, 26/10), cùng mã, seed 1–100 và 101–200 chênh tới 16 điểm thắng (Nhanh 86 / 70, Ẩu 84 / 73, Chuẩn 90 / 81), khoảng 2,7σ của hiệu hai mẫu, và các ô chênh lớn cùng một hướng: seed quyết định kế hoạch trận cho mọi bot cùng lúc, nên các ô của một bộ seed không độc lập. Vì vậy mỗi vòng chỉnh được xác nhận trên seed 101–200, và một kết luận chỉ đứng trên một bộ seed thì ghi rõ bộ nào. Chạy một tiến trình Node, ở nền, rồi đọc kết quả. Thời gian dự kiến: theo ải khoảng 30–40 phút cho cả 10 ải × 3 chế độ; theo chương khoảng 25 phút.

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
| B1 | Mọi bot từ Mới đến Nhanh nằm trong dải (thắng, S, P, I, O) **ở từng ải 1–9**. Một ô lệch ≤ 3 điểm thì chạy lại với seed 101–200; vẫn lệch thì chỉnh. `scripts/balance.ts` in danh sách các ô đó ở cuối báo cáo (hàng "B1/B7 chạy lại", `scripts/rollup.ts`). Từ phản biện 26/10: mỗi vòng chỉnh được xác nhận trên bộ seed độc lập 101–200 (seed 1–40 của vòng chỉnh nằm trong bộ 1–100) |
| B2 | Không ô (bot × ải) nào có S ≥ 90 % kèm I ≥ 20 % |
| B3 | Bot Mới thắng ≥ 70 % mỗi ải ở Cân bằng; bot Trẻ em thắng ≥ 85 % mỗi ải ở Thư giãn |
| B4 | Chậm chắc có S cao hơn Ẩu ở mỗi ải; Chuẩn hạ quái nhanh hơn Ẩu |
| B5 | Không gõ thua ở mọi ải, mọi chế độ |
| B6 | **Tốt hơn Kém ≥ +10 điểm thắng ở Cân bằng và Thử thách** (gộp các ải 1–9; đích +15). Thêm ở ma trận chương: qua chương lần đầu Tốt hơn Kém ≥ +15 điểm. Báo cáo in số gộp (trung bình hiệu từng ải) cạnh số từng ải (hàng "B6 gộp") |
| B7 | ≤ 3 bậc mỗi đợt; khoảng sinh trong ±15 %; tắt bộ điều nhịp thì bot Chuẩn vẫn trong dải **ở mọi ải 1–9** (đúng như BALANCE §7; ô lệch ≤ 3 điểm thì chạy lại như B1). Bản đầu của đặc tả nới thành "≥ 8/9 ải": đó là đổi một cổng chung mà chưa hỏi chủ dự án, nên đã bỏ |
| B8 | Cổng học G5 đạt ở mọi bot có gõ |
| B9 | Chủ dự án chơi thử (mục 18); bot cùng hồ sơ lệch ≤ 15 % |

**Cổng riêng của S1:**

| # | Cổng | Ngưỡng |
|---|---|---|
| G1 | Chương qua được | Cân bằng, bot Chuẩn: qua chương lần đầu (không phải quay lại Mốc hay đầu chương) 70–90 %, qua không mất Lõi 10–35 %. Thư giãn: Trẻ em qua lần đầu ≥ 85 %, người lớn ≥ 95 %. Thử thách, bot Chuẩn: qua lần đầu 20–45 %, quay lại Mốc tối đa 2 lần thì ≥ 70 % |
| G2 | Không súng thống trị (đo bằng **thắng**, không đo bằng lựa chọn của bot) | Dùng ma trận G3c (10 bộ × ải 1–9, bot Chuẩn, Cân bằng, 100 seed). (a) Không bộ nào đứng nhất ở quá 3 trong 9 ải. (b) Mỗi súng có mặt trong một bộ top 3 ở ≥ 2 ải. (c) Ở mỗi ải, bộ đứng nhất hơn bộ đứng ba ≤ 12 điểm. (d) **Không súng nào** có mặt trong bộ đứng nhất ở quá 6 trong 9 ải. Lý do có (d): (a) chỉ xét từng bộ, nên bốn bộ khác nhau cùng có Ray có thể chia nhau đứng nhất mọi ải mà (a) vẫn đạt. Trượt (d) thì chỉnh lối thứ hai với Vỏ (Pháo Sao, Rèn của Xung) hoặc Vỏ của Trâu, không giảm Ray trước Tỉ lệ chọn của bot Tốt (đầu chương, Mốc, thưởng Súng; mỗi súng 10–40 %) chỉ in ra để xem, là đích mềm. Tỉ lệ đó đo cách bot chấm điểm, không đo game, nên không dùng làm cổng |
| G3 | Khắc chế đo được (sim Node, kịch bản nhỏ, cùng số chữ gõ) | Ray hạ 6 Trâu nhanh ≥ 2× Xung, **cả khi mọi băng đều Chuẩn**. Pháo Sao hạ cụm 10 bầy ở 16 m nhanh ≥ 1,5× Xung. Tán giữ đợt 40 bầy lao vào 6 m, mất giáp ít hơn Ray ≥ 30 %. Xung và Tán gây 0 sát thương vào khiên từ phía trước; Ray phá khiên trong 1 phát. Tán và Tia dọn mảnh Tách nhanh hơn Ray. Băng Chuẩn của Xung hạ Trâu nhanh hơn băng có lỗi ≥ 25 %. **Từ R1 review** (đổi đích, đã chọn theo đề xuất; [changelog](changelog/2026-10-24-s1-r1-fix.md)): viên Tán mài khiên × 0,5 sát thương (R1 đóng: × 0,8), nên vế khiên thành "Xung không gây sát thương vào khiên; khi khiên còn, Xung và Tán gây 0 sát thương vào thân người cầm khiên và toán sau khiên" |
| G3m | Bảng khắc chế khớp số đo | Chạy 9 hàng × 5 súng kịch bản nhỏ (mục 5.2), xếp ●/○/✕ theo ngưỡng 1,25× và 2×. `COUNTERS` phải khớp kết quả; mọi ràng buộc của mục 5.2 phải đạt (mỗi súng ≥ 2 ● và ≥ 2 ✕; mọi bộ 2 súng có một hàng không ●). **Từ R1 review** (đã chọn theo đề xuất; [changelog](changelog/2026-10-24-s1-r1-fix.md)): đo 16 seed; ô có chi phí trong ±8 % quanh ngưỡng 1,25× hoặc 2× thì khớp với cả hai dấu. **R1 đóng:** kịch bản (ở ải 1) rỉ giáp theo mức gốc của chương, không nhân `drainRate` của ải 1: `drainRate` là núm độ khó của một ải, không phải tính chất của súng (`tests/survival/arena.ts`). **Đây là đổi cách đo của cổng**, không phải sửa lỗi (phản biện 26/10): kịch bản vẫn giữ `drainFrom` 14 m của ải chương, chỉ bỏ hệ số rỉ của ải. Với `drainRate` 2, Tia chỉ còn 1 hàng ✕ (trái mục 5.2). Sau khi đổi, ✕ thứ hai của Tia (Bầy sát vạch) **đứng nhờ biên ±8 %**: Tia / Tán 27,3 / 13,9 = 1,96× và 25,7 / 13,3 = 1,93×, dưới ngưỡng 2× (`node --import tsx scripts/counters.ts`, 26/10). Ô Khiên của Pháo Sao cũng nằm trong biên (7,0 / 5,5 = 1,27×). Đo lại G3m sau mỗi lần đổi Tia hoặc Tán; một cảnh trung tính (không theo ải nào) là hướng cân nhắc, chưa làm |
| G3c | Không ải bắt buộc, chọn sai không thành bẫy | Cả 10 bộ súng, bot Chuẩn, Cân bằng, mọi ải thường, mỗi ải với bộ đồ tham chiếu của nó: ải 1–5 là 10 bộ 2 súng, ải 6–9 là 10 bộ 3 súng (cũng là C(5,3) = 10). Bộ kém nhất thắng **≥ 60 %** và kém bộ tốt nhất **≤ 30 điểm**; bộ tốt nhất ≤ 97 %. Bản đầu ghi "≥ 35 %", trái với mục 19 (bộ sai chỉ nên thua bộ đúng 15–25 điểm). Với 35 %, người chọn sai ở đầu chương sẽ mất trung bình khoảng 2 Lõi chỉ riêng ở ải 2 |
| G4 | Răng cưa | Ở Cân bằng, P của bot Chuẩn không giảm quá 2 điểm từ ải này sang ải kế trong ải 1–5 và 6–9; ải 6 thấp hơn ải 5; boss có P cao nhất chương (± 3) |
| G5 | Học | Không lặp từ trước khi hết dải; chữ đầu của mọi từ đang hiện (các bến và từ chặn) luôn khác nhau; Thiếu chữ không bao giờ ẩn chữ đầu; ải Nghĩa luôn hiện nghĩa; bot Mới gõ ≥ 8 từ mỗi ải; 0 số đè vùng cấm (kịch bản) |
| G6 | Mục tiêu đúng giờ, không kẹt | Thời lượng trung vị ở Cân bằng, bot Chuẩn: Săn và Phá Tổ 110–190 s, Boss 150–240 s. **Boss với mọi bộ 3 súng** (10 bộ, bộ đồ tham chiếu ải 10): bot Chuẩn thắng ≥ 45 % ở Cân bằng, boss luôn tới P3 trước giây 140, và không trận nào chạm trần 600 s |
| G7 | Từ chặn | Tỉ lệ chặn của bot Chuẩn 60–85 %, Tốt ≥ 80 %, Kém ≤ 60 %. Trẻ em ở Thư giãn ≥ 50 % |
| G8 | Tất định | Cùng seed, phím, đầu trận (cả ải và bộ súng) thì cùng mã băm, cùng nhật ký `pace`, ở Node và Chrome. Replay của mọi kịch bản S1 khớp. Cửa và thưởng tái lập từ seed chương |

## 12. Hình, chuyển động, tiếng

Mọi đòn đi qua các bậc phản hồi của kit (`tier()` T0–T5: rung, dừng hình, số, lóe, giật lùi, tia lửa, mảnh vỡ, lớp tiếng). Không thêm draw call cho mỗi quái: lóe, giật lùi, co giãn, đèn hiệu vẫn là thuộc tính instanced. Sau mỗi đợt, AI tự xem chuỗi khung chụp (50 ms mỗi khung) và sửa trước khi báo xong.

| Gì | Đầu nòng | Đạn / đường đi | Trúng | Hạ | Tiếng (id mới) |
|---|---|---|---|---|---|
| **Tán** | Quạt 3 tia lửa 50 ms; tàu giật lùi 0,25 m; cú đẩy camera 3 px ngược hướng bắn | 7 vệt ngắn sáng (`Strips`, sống 0,12 s) | T1: sao 4 tia nhỏ; quái bị đẩy lùi thấy rõ (đẩy thật trong sim + giật lùi giả) | T1, mảnh vỡ văng theo hướng đẩy; nhiều con chết cùng ô thì gom √N | `gun.tan.fire` (tiếng nổ đanh trên thép + vỏ đạn leng keng) |
| **Ray** | **Nạp** 150 ms: lõi trắng xanh co lại ở nòng (báo trước), rồi lóe dài 80 ms | Đường thẳng mảnh trắng xanh 0,25 s, có vòng gợn ion dọc đường, mờ dần | T2 ở mỗi quái bị xuyên: tia lửa theo hướng đường bắn. Trúng Vỏ: tia lửa cam kèm tiếng keng | T2/T3, dừng hình 12 ms (cách nhau ≥ 300 ms) | `gun.ray.charge`, `gun.ray.fire` (rít tụ điện rồi nổ đanh, có đuôi) |
| **Pháo Sao** | Thụp cối: quầng khói xám, lóe hướng lên | Quả sáng có vệt bay **vòng cung** (view vẽ parabol, sim chỉ biết điểm rơi và giờ rơi); vòng đỏ mảnh trên sàn đánh dấu điểm rơi 0,7 s | Nổ T2: sao 8 tia, **sóng tròn trên sàn** 3 m, lóe, mảnh vỡ | Gom √N; nổ liền nhau cách 40–70 ms ra hiệu ứng domino | `gun.phao.launch`, `gun.phao.burst` (bụp, rít, nổ trầm) |
| **Vỏ** (Trâu, Đầu Đàn, Tổ, Boss) | — | — | Đòn bị Vỏ chặn: tia lửa cam bật ngược, tiếng keng, số kiểu `tick` của kit (nhỏ, gộp; không cần kiểu số mới). Đòn của **băng Chuẩn xuyên Vỏ**: vệt xuyên trắng lam ngắn đi vào thân, số kiểu `normal`. Nhờ vậy người chơi thấy ngay rằng gõ chuẩn thì xuyên giáp. Băng Hoàn hảo vẫn hiện kiểu `perfect` như S0 | Trâu: T3 + mảnh vỡ nặng; Đầu Đàn: T4, đèn hiệu tắt, dừng hình 45 ms | `hit.armour`, `leader.horn` (khi Đầu Đàn tới), `leader.down` |
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

### 12.1 Chuyển động (AI làm, không dựng model bằng mã)

Model của thư viện chỉ cho **hình**. Phần lớn model chỉ có clip đứng yên. Mọi dáng đi, phản ứng và đòn của quái là chuyển động thủ tục, do AI viết. Phần này chạy trong shader instanced: dịch, nghiêng, lắc, co giãn theo thuộc tính của từng quái, như S0 (`crowd.ts`), không thêm draw call. Mỗi dòng dưới đây được duyệt bằng chuỗi khung chụp 50 ms (kịch bản `survival-s1-guns`, `survival-s1-boss`) trước khi báo xong.

| Quái | Dáng đi | Bị trúng / bị đẩy | Khoảnh khắc riêng |
|---|---|---|---|
| **Trâu** | Bước nặng, nhịp chậm (1,1 Hz). Mỗi bước thân hạ 6 cm rồi nhô lên. Sàn rung nhẹ (vòng bụi mờ) ở vài Trâu gần tàu nhất | Đòn bị Vỏ chặn: thân gần như không lùi (giật 0,03 m), chỉ lóe cam. Đòn xuyên: giật 0,12 m. Không bị Tán đẩy, nhưng hơi khựng 80 ms | Khi tới 10 m: cúi đầu, tăng tốc 10 % ("húc"), báo bằng hình chứ không bằng biển |
| **Đầu Đàn** | Như Trâu, to 1,25×. Đầu ngẩng, cột đèn hiệu đung đưa ngược nhịp bước | Như Trâu | Lúc vào cổng: dừng 0,6 s, ngẩng lên, cùng tiếng tù và `leader.horn`. Lúc chết: quỵ hai nhịp rồi đổ (0,5 s), đèn hiệu tắt sau cùng |
| **Khiên** | Đi khom, khiên luôn quay về tàu: xoay theo hướng tàu với tốc góc có trần, không giật | Trúng khiên: vòm lục giác gợn từ chỗ trúng ra. Khiên nứt dần theo % máu khiên (3 bậc vết nứt bằng shader) | Khiên vỡ: thân giật lùi 0,2 m, rồi đứng thẳng, đi nhanh hơn 10 % |
| **Tách** | Lảo đảo, nhún lệch pha (bước không đều), thân phập phồng theo nhịp 2 Hz | Như bầy S0 | Trước khi vỡ: phồng 1,15× trong 90 ms, rồi 3 mảnh bật ra theo hình cung (vị trí lấy từ sim; view chỉ thêm vòng cung giả) |
| **Tổ** | Bò: thân co lại rồi duỗi ra mỗi 1,5 s, tiến theo từng nhịp | Lóe cam, không lùi | Trước mỗi lần đẻ: phồng dần 0,8 s (khớp vân cam co bóp), rồi "nôn" bầy ra kèm vòng sóng nhỏ |
| **Boss Cai Ngục** | Bước chậm có lực: thân nghiêng về chân trụ, mỗi bước camera giật 1 px (tắt khi giảm chuyển động). Có clip thì dùng clip làm lớp nền, AI vẫn thêm lớp nghiêng và nhún | Đòn thường: giật 0,05 m. Mỗi 10 % máu mất: khựng 120 ms, mảnh vỏ văng | **Đòn Sập:** vươn lên 1,08× trong lúc báo trước (đọc được từ xa), khựng, rồi đập xuống khớp với giờ trúng của sim. **Đổi pha:** gầm (ngửa ra sau 0,4 s), sóng chấn. **"TIẾN LÊN"** (hết giờ pha): bước dài, sàn nứt sáng theo bước |
| **Đạn Pháo Sao** | Bay vòng cung (view vẽ parabol khớp giờ rơi của sim), quả xoay, vệt sáng mờ dần | — | Nổ liền nhau cách 40–70 ms thì thành chuỗi domino |

- Mọi chuyển động trên tôn trọng "giảm chuyển động" (chỉ giữ lóe và mờ dần) và rung camera 0 %.
- Model thiếu (repo sạch, không có GLB) thì dùng khối giữ chỗ như S0, vẫn có đủ các chuyển động trên để duyệt nhịp.

## 13. Dữ liệu và mã (ngân sách dòng)

| File | Hiện tại | Sau S1 (trần) | Đợt | Nội dung |
|---|---|---|---|---|
| `src/content/guns.ts` | mới (R1: 162) | 170 | R1 | 5 súng, cấp Rèn, chất lượng gõ, `COUNTERS`, độ dài từ |
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
| `src/sim/hits.ts` | 116 | 170 | R1 | Lưới (giữ `MAX_RADIUS` 0,8), danh sách quái to, thử thân chạm dải tầm |
| `src/sim/stores.ts` | 134 | 190 | R1 | Cột mới cho quái (Vỏ, khiên, cờ to, đèn hiệu), kho `Shells`, `Shields` |
| `src/sim/words.ts` | 196 | 280 | R1, R3 | N bến, dải theo độ lệch chữ, che chữ, từ chặn |
| `src/sim/pace.ts` | 221 | 250 | R1 | Ảnh chụp N bến, bảng bậc theo ải |
| `src/sim/events.ts`, `hash.ts` | 51, 45 | 90, 55 | R1–R3 | Sự kiện mới; mã băm gồm mọi kho mới |
| `src/app/main.ts` | 656 | 480 | R2 | Tách luồng màn sang `journey.ts` (hiện đã quá trần 480; R1 không được làm nó dài thêm) |
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

- Trần chung: `src/` (không kể `src/kit`, tính cả CSS) ≤ **10.000 dòng**. Không file nào trong `src/` quá 480 dòng (từ cuối R2; `main.ts` được tạm vượt tới khi tách).
- Các trần trong bảng là trần **từng file**, không phải dự kiến. Cộng hết lại thì khoảng 10.200 dòng, thêm khoảng 530 dòng của các file không đổi (`hits.ts` đã có dòng riêng, `ship.ts`, `input.ts`, `menu.ts`…). Vì vậy trần chung mới là ràng buộc chính: không file nào được chạm trần của nó mà không bớt ở chỗ khác. Bản trước ghi trần chung 9.000, thấp hơn tổng các trần từng file khoảng 1.700 dòng, và để `main.ts` 600 dòng, trái luật 480.
- `tests/boundary.test.ts`, `tests/survival-boundary.test.ts`: `src/sim/guns/*`, `src/content/*` mới cũng chịu luật "không DOM, đồng hồ, `Math.random`, lượng giác".
- **Đang quá trần** (26/10, sau phản biện R1; dòng / trần): `stage-s0.ts` 92 / 70, `balance.ts` 174 / 170, `plan.ts` 117 / 110, `spawn.ts` 254 / 190, `move.ts` 238 / 210, `guns/tan.ts` 123 / 120, `projectiles.ts` 250 / 190, `stores.ts` 215 / 190, `pace.ts` 259 / 250, `events.ts` 92 / 90, `app/journey.ts` 307 / 280, `app/dev.ts` 86 / 40, `view/combat.ts` 438 / 430, `view/gunfx.ts` 347 / 320, `tests/guns.test.ts` 538 / 300, `tests/stage-rules.test.ts` 342 / 260, `tests/survival/typist-bot.ts` 277 / 260. `guns/aim.ts` (204) chưa có dòng riêng. Lượt phản biện không làm file `src/` nào dài thêm; tổng `src/` 9 924 dòng (trước 9 932). Tách các file này là việc của R2 (cùng lúc tách `main.ts`).
- **Lượt cảm giác, bước 1** (26/10, `docs/FEEL_PASS_S1.md` §2–§3, changelog `2026-10-26-feel-pass-s1.md`): file mới `view/strip.ts` 350, `view/typing-feel.ts` 310, `view/type-rules.ts` 98, `audio/type-audio.ts` 88 (chưa có dòng riêng trong bảng); `view/hud.ts` 362 → 386 (trần 400), `view/combat.ts` 438 → 434, `view/scene.ts` 464 → 477 (trần 480), `audio/theme-audio.ts` 416 → 411, `view/survival.css` + `theme.css` 229 + 99 → 254 + 103, `app/main.ts` 651 → 655. **Tổng `src/` (`.ts` + `.css`, trừ `kit/`) 9 924 → 10 839, vượt trần chung 10.000.** Đặc tả lượt cảm giác không có ngân sách dòng; F3–F5 (đạn 3D, khối vỡ, tàu) còn thêm. Cần quyết: nâng trần chung cho lượt này (đề xuất 12.000 kèm trần từng file mới ở trên) hoặc tách/bớt ở R2.
- **Lượt cảm giác, bước 2** (26/10, `FEEL_PASS_S1.md` §4, cùng changelog): file mới `view/shots.ts` 339, `view/beams.ts` 209, `view/chunks.ts` 227, `view/gun-rules.ts` 132, `view/lights.ts` 127, `view/bolts.ts` 120, `view/warm.ts` 21; `view/gunfx.ts` 347 → 207 (súng chuyển sang `shots.ts`, `beams.ts`; nay dưới trần 320), `view/combat.ts` 434 → 428 (dưới trần 430), `view/fx.ts` 314 → 346 (trần 360), `view/crowd.ts` 325 → 316, `view/scene.ts` 477 → 479 (trần 480), `view/ship.ts` 121 → 144, `view/models.ts` 8 → 58 (nạp lưới chung cho quái và đạn), `audio/gun-audio.ts` 118 → 213, `audio/theme-audio.ts` 411 → 449 (trần 470), `app/main.ts` 655 → 663. **Tổng `src/` 10 839 → 12 107**, vượt cả mức 12.000 đề xuất ở bước 1; F5 (tàu) còn thêm. Đề xuất mới: trần chung 12.500 cho hết lượt cảm giác, rồi tách ở R2 như đã định.
- **Lượt cảm giác, bước 3** (27/10, `FEEL_PASS_S1.md` §5, cùng changelog): file mới `view/ship-rules.ts` 169 (luật chuyển động tàu, có test), `view/probes.ts` 34 (thăm dò cho kịch bản); `view/ship.ts` 144 → 318, `view/combat.ts` 428 → 429 (trần 430), `view/shots.ts` 339 → 346, `view/beams.ts` 209 → 211, `app/main.ts` 663 → 667. **Tổng `src/` 12 107 → 12 498**, sát trần chung 12.500 đã đề xuất. Lượt cảm giác hết chỗ: việc sau (F6, R2) phải bớt trước khi thêm.

## 14. Thứ tự làm

Mỗi đợt: làm, tự xem ảnh và chuỗi khung, chạy cân bằng, rồi một AI khác phản biện và sửa. Mỗi đợt có changelog riêng (mục, đã làm, mục review đã xử lý, kiểm, còn lại) và một mục trong `BUILD_NOTES.md` §9.

### R1 "Súng và khắc chế" (chơi được riêng)

1. **Tách mã, chưa đổi luật.** Chuyển súng và quái sang `content/guns.ts`, `content/foes.ts`; tách `sim/guns/xung.ts`, `tia.ts`; bến thành mảng N. Trước khi bật luật mới, **vết sự kiện của Trận thử phải giống hệt** bản `00ed734`: 6 seed × 3 bot, so dãy (tick, loại, giá trị) của sự kiện và số liệu cuối trận. Mã băm thì được đổi (kho có thêm cột).
2. **Súng mới:** Tán, Ray, Pháo Sao; Vỏ; Băng Chuẩn xuyên Vỏ (mục 5.1); tầm với quái to; Rèn (chưa có cửa, chỉ dùng cho bộ đồ tham chiếu và test); độ dài từ +1.
3. **Quái mới:** Trâu, Khiên, Tách, Đầu Đàn.
4. **Luật Ải:** mục tiêu Trụ vững và Săn, hiểm họa Vết nứt, luật học Thiếu chữ; dữ liệu ải 1–4; đầu trận có ải và bộ súng.
5. **Màn:** màn chính có "Hành trình · Chương 1 (ải 1–4)" và "Trận thử". Chọn ải (mở dần theo ải đã qua) → Bảng tin → Nạp súng (2 trong 5) → Trận → Kết ải có sao. Mỗi ải dùng bộ đồ tham chiếu của nó (mục 4.1, "Chơi một ải lẻ"), nên ải 4 có một súng cấp 2. Kho súng hiện 5 súng.
6. **HUD:** bến theo súng (tên, màu, kiểu băng), biển mục tiêu ("ĐẦU ĐÀN 2/3"), cảnh báo Vết nứt, chữ che của Thiếu chữ.
7. **Hình và tiếng** của 3 súng mới, Vỏ, khiên, Tách, Đầu Đàn, Vết nứt (mục 12).
8. **Bot và báo cáo:** N bến, `gunValue`, `tactics.ts` (chọn súng); `--stages` cho Trận thử và ải 1–4; B1–B9, G3, G3m, G3c, G5, G6 (Săn), G8; G2 tính tạm trên ải 1–4 (chỉ in số).
9. **Kịch bản:** `survival-s1-loadout`, `survival-s1-guns`, `survival-s1-stage` (ải 2 và ải 4), `survival-s1-perf`; 5 kịch bản S0 vẫn đạt trên Trận thử.

**R1 xong khi:** chơi được ải 1–4 từ màn chính đến kết ải, với bất kỳ bộ 2 súng nào; `pnpm check` xanh; báo cáo 100 seed ải 1–4 đạt B1–B5, B7, B8, G3, G3m, G3c, G5, G8. B6 ở R1 là số đo (đích +10 có thể chờ tới R2, khi có cửa và bến 3). Hiệu năng mục 17 đạt.

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

- **Súng** (`tests/guns.test.ts`): số viên, loạt, phát, quả và thời gian mỗi băng; nạp và cộng dồn (2 băng, cấp 3 là 3); Vỏ trừ thẳng, còn ít nhất 1; Ray × 0,25; băng Chuẩn × 0,75 (Ray × 0,19), băng có lỗi tính đủ Vỏ; tầm với quái to (thân chạm dải tầm, cả tầm gần của Pháo Sao); Khiên và mọi quái bán kính ≤ 0,8 nằm trong lưới, quái to nằm trong danh sách riêng; Ray xuyên ≤ 6 quái và giảm ×0,85; Pháo Sao: tầm 8–24 m, nổ giảm đều, bỏ qua khiên; Tán: nón, đẩy lùi (không đẩy Trâu); khiên chặn Xung và Tán từ phía trước, che toán phía sau, Ray phá, Tia đốt; Xung không bắn vào quái bị khiên che; Rèn ×1,2 / ×1,4; độ dài từ +1, trần 10; cổng G3 (kịch bản nhỏ, nhiều seed).
- **Luật Ải** (`tests/stage-rules.test.ts`): Săn kết thúc đúng lúc hạ đủ N; thua khi lọt quá M − N; bầy rút lui không gây hại; Phá Tổ: Tổ bò, đẻ dồn dần, trần 300 s; Vết nứt: báo trước, vị trí, số con; Bão ion: báo trước, bến tê không bắn, vẫn gõ và nạp được, không phím nào mất; Giếng: kéo quái, bẻ đạn Xung, không bẻ Ray; Thiếu chữ: không ẩn chữ đầu, không hai chữ liền, tất định; Nghĩa; Boss: pha theo HP **hoặc** hết giờ pha ("TIẾN LÊN"), trần 600 s, thời gian báo trước theo E_eff và `telegraphScale`, Đòn Sập, từ chặn (kịp, không kịp, đang gõ dở), chữ đầu khác mọi bến; `checkChapter` đạt với Chương 1 và báo lỗi với một chương sai cố ý.
- **Hành trình** (`tests/journey.test.ts`): cửa tái lập từ seed chương, không trùng loại, đúng điều kiện mời; thưởng đúng; Lõi, thua, chương vỡ, quay về Mốc với đúng ảnh chụp; sao; lưu rồi đọc lại (kể cả JSON hỏng thì bắt đầu lại sạch).
- **Sim và cân bằng** (sửa test cũ): tất định có đầu trận mới; replay khớp; bot qua `installKeys` với 3 bến; ma trận nhỏ ra đủ 9 cổng; bước sim 700 quái + 2.000 đạn + 64 quả Pháo Sao + 3 bến cùng bắn ≤ 1,5 ms.
- **Ranh giới, chủ đề:** như S0; thêm mỗi id âm mới có mục trong `THEME_SOUND_LIST.md`; màu súng là biến trong `theme.css`.

## 16. Kịch bản trình duyệt

Chrome headless, gõ thật qua CDP, 1280×720 và 1920×1080, 0 lỗi console, 0 ngoại lệ. Máy chủ dev cổng 3007 `--strictPort` (`pnpm dev`; `vite.config.ts` bỏ qua `tmp/`, để cây mã agent khác giải nén vào đó không làm trang tải lại giữa kịch bản).

| Kịch bản | Kiểm |
|---|---|
| `survival-s1-loadout` | Màn chính → Hành trình → Bảng tin → Nạp súng bằng phím 1–5 và Enter; thẻ súng đủ số; cảnh báo "chưa có súng khắc" hiện đúng; Kho súng (5 thẻ trong khung, ghi "Trận thử: 24 viên"; có từ phản biện 26/10) |
| `survival-s1-guns` | Mỗi súng mới: 12 khung cách 50 ms quanh một băng vào cụm đông (đầu nòng, đạn, va chạm, hạ đều thấy); Ray xuyên hàng; Pháo Sao vòng cung và sóng tròn; Tán đẩy lùi; khiên lóe rồi vỡ; Tách vỡ 3 mảnh |
| `survival-s1-stage` | Ải 2 (Săn) và ải 4 (Thiếu chữ, Khiên) gõ 35 và 45 WPM; cả hai trận phải kết thúc (thắng hoặc thua) trên cùng trang, tải lại giữa trận là trượt; biển mục tiêu đếm đúng; bầy rút lui khi đủ; chữ che hiện "_", không bao giờ ở chữ đầu; 0 số đè vùng cấm; Node chạy lại khớp mã băm, với replay có lệnh và chạy tới tick cuối đã đọc |
| `survival-s1-hazards` | Vết nứt, Bão ion, Giếng: ảnh lúc báo trước và lúc xảy ra; chữ của bến tê vẫn ≥ 26 px, tương phản ≥ 7 : 1; không phím nào mất trong lúc tê |
| `survival-s1-journey` | Chương: ải 1 → cửa (gõ `forge`) → Rèn → ải 2; thua ải → −1 Lõi → chơi lại; tải lại trang ở màn cửa → Tiếp tục đúng chỗ; Mốc mở bến 3, bố cục 3 bến không chồng, chữ ≥ 26 px |
| `survival-s1-learn` | Ải 9 (Nghĩa): nghĩa trên bến 32 px (từ dài co tới ≥ 26 px, tối đa 2 dòng), IPA và từ hiện khi xong, phát âm, gợi ý hiện đúng giờ; khung học không bị che; tổng kết chương có từ mới và từ sai nhiều |
| `survival-s1-boss` | Boss ra mắt (camera zoom), Đòn Sập: làn đỏ + từ chặn, gõ kịp ("CHẶN!") và để trượt (T4); đổi pha; boss chết; 12 khung quanh lúc chặn |
| `survival-feel` | Lượt cảm giác (`docs/FEEL_PASS_S1.md` §7.2–§7.3): chuỗi khung trên đồng hồ giữ và tờ khung `magick montage` cho từng chữ, phím sai, phím lạc, xong từ, bến đầy, thời gian thật; bố cục (dòng từ trên vạch, cách tầm Xung ≥ 90 px, bến dưới vạch đỏ, không tràn với 3 vạch băng); quái vùng gần sau dòng từ (cảnh `marks`, quái đặt sẵn: vạch đỏ dưới tấm); 10 phím/s (≤ 8 mảnh); thời gian thật (ảnh chụp 50–65 ms một tấm, cộng biến đổi của từng chữ ở mọi khung thật đọc trong trang); hai ải 40 WPM (mắt → số, số đè, vạch quái sau tấm, tương phản p99 trên khung bỏ HUD); âm gõ dựng trong `OfflineAudioContext` (dải 1–4 kHz) |
| `survival-feel-guns` | Lượt cảm giác, bước 2 (`FEEL_PASS_S1.md` §4, §7.2–§7.3): mỗi súng trên ải 1 với bầy đặt sẵn, 24–36 khung cách 33 ms (lóe nòng đo bán kính vùng sáng > 0,8, vùng sàn quanh nòng sáng lên, model đạn, đèn, cỡ số); hạ (khối sau lần hạ, một khối lên ≥ 3 khung rồi xuống ≥ 3, còn nằm sau 6 s); rung và kho trong ải 1 và ải 3 ở 40 WPM; thời gian thật (bản ghi rAF); âm súng dựng trong `OfflineAudioContext` (dải 1–4 kHz) |
| `survival-feel-ship` | Lượt cảm giác, bước 3 (`FEEL_PASS_S1.md` §5, §7.2–§7.3), tư thế tàu đọc mỗi khung (`__survival.ship()`): F7 tàu trôi về cụm 10 bầy đặt ở x +8 m (≥ 40 px trong 1,5 s, nghiêng vào hướng dời, động cơ bùng khi dời), về cách tâm ≤ 10 px trong 2,5 s sau khi cụm hết, nhấp nhô 2–5 px (đỉnh tới đáy); mỗi súng: lao lên khi nạp 0,30–0,36 m (Tia trừ 0,06 m giữ lùi), mũi sau z 2,1, giật lùi ≥ 85 % số §5.2 và về trong thời gian của nó, xoay ≤ 7 rad/s và ≤ ±50°, Ray chộp có vượt; giảm chuyển động (không trôi, không lơ lửng, không lao, giật ≤ 30 %); thời gian thật (tư thế ở mọi khung rAF, không giật cục); đếm khung đen. `survival-feel` cảnh `f8` thêm độ phủ sáng lên bầy (quái nằm trong vùng sáng, phần sân sáng > 0,9) cho lượt cân bằng hiệu ứng |
| `survival-s1-perf` | Đo khung: ải 8 lúc đỉnh (3 bến, Pháo Sao + Tia + Giếng, ~150 quái); ải 10 với hộ tống; `flood(700)` khi cả 3 bến cùng bắn; số draw call. Lượt cảm giác thêm cửa sổ ải 1 Xung + Tán ~150 quái (nhiều model đạn nhất), tam giác, geometry, texture, số chương trình shader ở đầu và cuối mỗi cửa sổ đo (kiểm `programsSteady`: không biên dịch shader nào trong cửa sổ) |
| S0: `boot`, `menu`, `fight`, `keys`, `frames`, `perf`, `balance` | Vẫn đạt trên Trận thử (đường hồi quy) |

## 17. Hiệu năng (bậc Cao, Apple M4, khóa vsync, như cách đo của S0)

| Đo | Đích |
|---|---|
| Đỉnh ~150 quái + 3 bến cùng bắn + hiệu ứng (ải 8, ải 10) | khung TB ≤ 6 ms, p95 ≤ 10 ms |
| `flood(700)` + 3 bến cùng bắn | p95 ≤ 14 ms |
| Draw call | ≤ 160 (S0: 37–38; S1 dự kiến ≤ 70: mỗi model quái thêm 2–4) |
| Một bước sim: 700 quái, 2.000 đạn, 64 quả Pháo Sao, 32 khiên, 3 bến | ≤ 1,5 ms (Node) |
| Phím tới hình / phím tới đạn | ≤ 1 khung / ≤ 50 ms (≤ 70 ms khi đang dừng hình). `survival-s1-latency`: 2 trận × 20 từ Xung (40 từ, nên p95 không phải từ chậm nhất); âm thanh khởi động bằng một phím sim bỏ qua trước khi đo, như ở màn chính khi chơi thật (phím đầu tiên khởi động AudioContext, khoảng 107 ms trên Apple M4) |
| Bộ nhớ một chương 30 phút | Heap sau GC tăng ≤ 15 MB; số geometry và texture không đổi giữa các ải (model của loại mới nạp một lần) |
| Không cấp phát trong trận | Pool cho đạn, viên, quả, đoạn chắn, sự kiện. Màn chương (DOM) không nằm trong vòng khung |

- **"Khung" ở hàng 1, 2 là thời gian JS của trang mỗi khung** (cập nhật + vẽ, `window.__survival.costs`), như cách đo của S0. Khoảng khung (cái màn hình thực sự hiện) do GPU và máy bận quyết định thêm: `survival-s1-perf` in nó cạnh số kiểm (p95, tối đa, số khung lỡ một nhịp làm tươi, khung mỗi giây) nhưng không chấm.
- **R1 mới có 2 bến:** hàng 1, 2 đo trong trình duyệt với 2 bến cùng bắn (ải 4 Pháo Sao + Tia, ải 3 Tán + Ray), chưa phải 3. Hàng "một bước sim" đo đủ 3 bến trong test Node.
- **Test bước sim** (`tests/survival-sim.test.ts`): mỗi bước bắt đầu với 700 quái, 2.000 viên, 63 quả và 32 khiên; ô thứ 64 của kho quả để cho quả của chính Pháo Sao (kho đầy thì quả đó bị bỏ). Test chạy trong `pnpm check`, lấy trung vị tốt nhất của tối đa 3 seed. Khi máy bận (tải 7–8) trung vị có thể lên 1,35–1,40 ms (26/10: 1,394 ms ở tải 8,3; 1,399 ms ở tải 35–60), sát trần 1,5 ms: số §17 lấy từ lần chạy riêng test này. Nếu test bắt đầu trượt vì máy bận thì tách nó khỏi `pnpm check` thành một lệnh riêng.

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
| Khắc chế quá cứng làm B1 trượt với bot "Vừa" | Ô ↓ ở các ải có Trâu, Tổ | Cổng G3c (mọi bộ súng thắng ≥ 60 %, kém bộ tốt nhất ≤ 30 điểm) và G2(d) (Ray không bắt buộc). Chỉnh Vỏ và HP trước, nhịp sau. Mục tiêu: bộ súng sai thua kém bộ đúng khoảng 15–25 điểm, không hơn |
| B6 đạt nhờ bot, người chơi thật không thấy khác | Chủ dự án thấy súng nào cũng như nhau | Mục 18.1; B9; ảnh và số thời gian hạ quái trong bảng tin |
| Ma trận bot chạy lâu (30–40 phút) | Mỗi vòng chỉnh mất nửa giờ | 40 seed khi chỉnh, 100 seed cho báo cáo; chỉ chạy ải và bot vừa đổi (`--stages`, `--bots`); một tiến trình Node chạy nền |
| RAM 16 GB, nhiều agent | Chrome treo, kịch bản chập chờn | Một dev server (3007), một Chrome; tắt khi xong; đo hiệu năng hai lần, ghi lúc máy bận |
| Hiệu năng tụt vì thêm model quái, boss, hạt Pháo Sao | p95 tăng ở `perf` | Instanced theo model; quái to dùng danh sách riêng; trần hạt theo bậc; gom nổ √N; đo `perf` ở mỗi đợt |
| Khung học bị lấn (3 bến, từ chặn, biển mục tiêu, thanh boss) | Chữ < 26 px, số đè | Thêm vùng cấm; kịch bản `journey` và `learn` đo cỡ chữ và lần đè ở 1280×720 |
| Model tạm (`rainbow-tank`, `rainbow-scout` là bản sao họ `prism`; Tổ dùng `carrier`) | Hình không hợp vai | Dùng làm giữ chỗ, ghi danh sách cho chủ dự án; không dựng model bằng mã |
| `main.ts` phình | Dài hơn 656 dòng ở R1; > 480 dòng sau R2 | R1 đặt luồng màn mới vào `app/journey.ts` ngay; tách phần còn lại ở R2 |
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
