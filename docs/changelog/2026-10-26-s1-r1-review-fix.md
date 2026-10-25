# 2026-10-26 — S1 R1: sửa sau phản biện độc lập (phím tới đạn, luật (b) ở trần, G3c ải 4, ải 3, công cụ cân bằng, kịch bản)

Repo: `games/typing-survival`, nhánh `main`. Đặc tả: [`BUILD_S1.md`](../BUILD_S1.md) §5.1, §11.3, §11.4, §13, §14 (cổng "R1 xong khi"), §16, §17. Lượt trước: [`2026-10-25-s1-r1-mac.md`](2026-10-25-s1-r1-mac.md) (bước 1 trên Mac) và [`2026-10-25-s1-r1-report.md`](2026-10-25-s1-r1-report.md) (bước 2, báo cáo).

Máy: **Mac mini M4** (macOS, Apple M4 10 nhân, 16 GB), Node 24.22, pnpm 11.21, Chrome 155 headless (ANGLE Metal). Ba lane khác chạy cùng máy (tải trung bình 3,4–11 trong lượt này); việc nặng qua `.local/bin/heavy.sh`. Mọi số đo là **số Apple M4**. Bằng chứng ở `tmp/mac-2026-10-25/review-fix/` (không vào Git): `bal/` (hai báo cáo 100 seed), `spill/` (luật (b) ở trần), `s3-loss.md`, `s3-lever/` (ải 3), `hitch/` (dò khung dài), `gpu*/` (§17), `visual*/`, `fit/` (thẻ), `counters.txt`, `scripts/`. Phần kiểm cuối (26/10 sáng, sau khi lượt bị ngắt lúc khoảng 03:00 vì hết hạn mức): `tmp/mac-2026-10-26/feel/r1-review-fix/` (`pnpm check`, mã băm 152 trận chương, Kho súng chụp lại).

## Kết luận

- **Cổng R1 (BUILD_S1 §14) vẫn chưa đạt.** Lượt này sửa 25 mục phản biện và đổi đúng một luật chơi (luật (b) ở trần). Báo cáo 100 seed chạy trên mã đã commit, **cả seed 1–100 và 101–200**:
  - trượt: B1 ở cả 4 ải (43 / 40 chỉ số lệch), B7 ở cả 4 ải, G3c vế "tốt nhất ≤ 97 %" ở ải 2 (99 / 100 %) và ải 4 (100 / 98 %);
  - đạt trên cả hai bộ seed: `pnpm check`, B2–B5, B6 gộp ải (+11,0 / +11,3 ở Cân bằng), B8, G3, G3m, G3c ở ải 1 và 3, G5, G6, G8, §7.6.
- **§17 phím tới đạn:** nguồn khung dài là phím đầu tiên khởi động âm thanh (106–107 ms trong trình nghe `keydown`), không phải shader, GC hay đường phím. Kịch bản nay khởi động âm trước khi đo và gộp 40 từ. Sáu lần chạy (3 mỗi cỡ, 240 từ): 0 khung dài, phím tới đạn p95 18,2–19,8 ms, tối đa 31,7 ms (trần 50); phím tới hình p95 17,1–17,8 ms.
- **Luật (b) ở trần** ("đã chọn theo đề xuất" của phản biện): chữ thêm mà trần 10 không nhận ở đầu dài chuyển sang đầu ngắn, nên E ≥ 60 lấy 7–10 thay vì 6–10 (bằng súng nhẹ). Chỉ bot Nhanh đổi: nhàn I giảm ở cả 8 ô.
- **Chẩn đoán đã sửa:** G3c ải 4 không phải "Tia + súng khác" (Tán + Pháo Sao 97 / 98 cũng vượt trần). Ải 3 thua kiểu vực vì đoàn của đỉnh tràn giây 55 tới vạch ở giây 60–90, không vì Vết nứt. Phương sai thật giữa hai bộ seed: chênh thắng trung vị 4, lớn nhất 16 điểm.
- **Sim chỉ đổi ở luật (b) ở trần:** 152 trận chương trên HEAD với `HEAVY.spill=0` băm trùng từng dòng với `7e53835`; như commit thì chỉ 8 trận của Nhanh đổi. Vết vàng Trận thử không đổi.

## Quyết định đã chọn theo đề xuất

| Việc | Tài liệu ghi | Đã làm |
|---|---|---|
| Từ súng nặng ở E ≥ 60 | Phản biện 26/10, mục 2: "ghi hệ quả … hoặc giữ +1 ở đầu ngắn khi đầu dài đã chạm trần" | Làm cả hai: ghi hệ quả kèm bảng dải theo E (BUILD_S1 §5.1) và đổi luật (`HEAVY.spill` 1, `src/content/balance.ts:39`, `84136f2`). Đo trước khi giữ (mục "Luật (b) ở trần"). BUILD_S1 §5.1 ghi "đã chọn theo đề xuất" |

## Sửa sau phản biện

Phản biện độc lập của lượt Mac (`2026-10-25-s1-r1-mac.md`, `2026-10-25-s1-r1-report.md`): ba người kiểm (tĩnh, trình duyệt, cân bằng) trên `7e53835`, 25 mục đã xác nhận. Mỗi mục được kiểm lại trước khi sửa.

| # | Mục | Đã làm | Trạng thái |
|---|---|---|---|
| 1 | §17 phím tới đạn trượt 2/11 lần ở 1280×720 (một khung dài 67–383 ms; 20 từ nên p95 là từ chậm nhất), mà `AGENTS.md` và changelog report ghi "đạt" | Tìm nguồn bằng kịch bản dò có `PerformanceObserver("long-animation-frame")` (`tmp/.../review-fix/scripts/hitch-probe.mjs`): hai lần chạy (1280×720 20 từ, 1920×1080 38 từ, 4 625 và 8 494 khung) đều chỉ có **một** khung dài, 100 ms, ở phím đầu tiên; script trong khung đó là `DOMWindow.onkeydown` 106–107 ms, tức `audio.resume()` (`main.ts:489`): AudioContext, các bus, lớp nhạc. Không phải shader dùng lần đầu (chương trình 28 → 29 ở 525 ms, khung 16,7 ms), không phải GC (heap rơi 3 MB mỗi ~0,7 s, khung vẫn 16,7 ms), không phải Vite tải lại (mục 15). Khi chơi thật, phím đầu tiên rơi vào màn chính; kịch bản mở thẳng vào trận nên phím đầu là phím gõ từ. Kịch bản nay khởi động âm bằng Shift (sim bỏ qua) trước khi đo, và gộp 2 trận × 20 từ (40 từ) (`cbdcc16`). Đo lại: mục "Hiệu năng §17". Dòng trạng thái `AGENTS.md` và changelog report đã sửa | đã sửa |
| 2 | Luật (b) xóa giá của súng nặng với E ≥ 60 (dải 6–10 bằng súng nhẹ), tài liệu và thẻ vẫn hứa "+1 chữ" | Chữ mà trần 10 không nhận ở đầu dài chuyển sang đầu ngắn (`HEAVY.spill` 1, `lengthFor`, `84136f2`): E ≥ 60 lấy 7–10, E < 60 không đổi. Đo Nhanh (E 70) cùng mã với `--set=HEAVY.spill=0`: nhàn I giảm ở cả 8 ô (mục "Luật (b) ở trần"). BUILD_S1 §5.1 có bảng dải theo E và hai hàng Ray / Pháo Sao của bảng súng ghi đúng; chữ trên thẻ ("từ dài tới +1 chữ", "từ có thể dài hơn 1 chữ") nay đúng ở mọi E. "Đã chọn theo đề xuất" của phản biện | đã sửa |
| 3 | G3c ải 4: "cặp mạnh nhất là Tia + súng khác" sai, hãm `TIA_DUTY` không đóng được cổng | Kiểm lại cả hai bộ seed (mục "G3c hai bộ seed"): ở ải 4 có Tán + Pháo Sao 97 / 98 và Xung + Pháo Sao 96 / 97, cặp không có Tia cũng vượt trần. Sửa "Vì sao chưa đóng được", "Còn lại" 4 của changelog Mac, dòng "Next" của `AGENTS.md`: đòn bẩy cho ải 4 là sức ép chung của ải hoặc Pháo Sao ở ải có khiên; ải 2 vẫn là Tia (mọi cặp > 97 đều có Tia) | đã sửa (tài liệu) |
| 4 | Ải 3: bot nhanh thua kiểu vực ở seed 101–200; "thêm đỉnh tràn thứ ba" đẩy sai hướng; phương sai giữa hai bộ seed lớn hơn ±4 | Chấm B1 trên cả hai bộ seed (mục "Báo cáo 100 seed"). Tìm nguồn thua (`review-fix/scripts/s3-loss.ts`, mục "Ải 3: nguồn thua"): trận thua mất 67–85 giáp vì bầy chạm vạch, phần lớn ở giây 60–90 (đoàn của đỉnh tràn giây 55 tới vạch), trong khi bến vẫn có băng và 41–71 quái trong 10 m; ≤ 10 s sau Vết nứt chỉ 1–12 giáp. Thử một biến thể (đỉnh tràn đầu dàn 8 → 12 s, cùng số quái): hết vực của Ẩu, Nhanh ở seed 101–200 (73 → 76, 70 → 76) nhưng B1 không lợi (lệch 13 / 11 so với 10 / 11): chưa commit. Bỏ hướng "đỉnh tràn thứ ba" ở "Còn lại" 3; BUILD_S1 §11.3 và changelog ghi phương sai thật | đã chẩn đoán; chỉnh ở lượt chỉnh tới |
| 5 | Chữ trong game còn dạy "Gõ không lỗi thì đòn mạnh hơn" (sai ở ải chương từ `f20c073`) | Dòng dẫn màn chính: "Gõ không lỗi thì đạn xuyên Vỏ và dễ chí mạng"; Kho súng: "Gõ không lỗi: xuyên Vỏ (Vỏ chỉ chặn 75 %) và dễ chí mạng; ở Trận thử đòn mạnh thêm 6 %" (`8f2ae2d`). Chụp lại Kho súng ở 1280×720 (mục "Đã xem khung hình") | đã sửa |
| 6 | BUILD_S1, chú thích mã, ví dụ thẻ còn số cũ (Vỏ 5, ×1,06, "được: Pháo Sao") | BUILD_S1: Vỏ 4 và luật mới (viên Xung Chuẩn 7 − 3 = 4, có lỗi 7 − 4 = 3; Ray 111 một phát; mỗi chữ: Xung 24 / 18, Ray 67), ví dụ Rèn (5,8 / 6,8 thay 3 / 4), Bọc Thép (440 HP, 5–6 băng), hai ví dụ thẻ theo chữ game hiện ("Trâu · Vỏ 4 · 220 máu, dẫn 5 bầy · khắc: RAY"). `guns.ts`: chú thích `nominal` của Tia nói lý do giữ 168 (`84136f2`) | đã sửa |
| 7 | G3m: ✕ thứ hai của Tia chỉ đứng nhờ biên ±8 %; đổi cách đo rỉ của cảnh chưa trình như đổi cổng | BUILD_S1 hàng G3m: ghi là đổi cách đo, số Tia / Tán 27,3 / 13,9 = 1,96× và 25,7 / 13,3 = 1,93× (đo lại 26/10, `review-fix/counters.txt`), ô Khiên của Pháo Sao cũng trong biên (1,27×). Cảnh trung tính: ghi là hướng cân nhắc, chưa làm (đổi cảnh lần nữa là đổi cổng lần nữa) | đã ghi |
| 8 | Vài tuyên bố cổng chỉ đứng trên seed 1–100 | Báo cáo đủ trên seed 101–200 (mục "Báo cáo 100 seed"). Changelog Mac và report: ghi biên G3c ải 1 (cách 29 điểm ở seed 101–200), "Mới và Ẩu trong dải ở ải 1 và 4" chỉ đúng ở seed 1–100 (seed 101–200: Mới ải 4 thắng 92), B4 hẹp nhất ở ải 2 (1,29 / 1,32 s). "52 → 42" vẫn đứng (seed 101–200: 41) | đã sửa (tài liệu) |
| 9 | Ghi sổ cổng lệch đặc tả: B6 gộp đạt +11; luật chạy lại ô lệch ≤ 3 điểm chưa áp; "740 s cho phần bot" | `scripts/balance.ts` in "B6 gộp" và danh sách "B1/B7 chạy lại" (`scripts/rollup.ts`, `777a137`); luật chạy lại áp trên báo cáo lượt này (mục "Cổng R1"). Changelog Mac: B6 gộp +11 / +37,5 đạt; 740 s là cả lệnh | đã sửa |
| 10 | Test bước sim §17 nhẹ hơn đặc tả, "least" luôn đúng; hàng khung đỉnh và flood đo với 2 bến | Test nạp 2.000 viên và 63 quả trước mỗi bước (ô 64 để cho quả của Pháo Sao), kiểm số đó trước bước và Pháo Sao có phóng, in số còn lại sau bước (`931a2b9`). BUILD_S1 §17 ghi: khung là thời gian JS, R1 đo 2 bến trong trình duyệt, test chạy trong `pnpm check` với biên mỏng khi máy bận. Giữ test trong `pnpm check` (như test S0), lấy tốt nhất trong 3 seed | đã sửa |
| 11 | `--set` theo ải lan sang ải khác qua object dùng chung; `*=` trên `drainFrom` vắng lấy gốc 1; lỗi giữa chừng không hoàn lại | Đường dẫn theo ải chép object trên đường trước khi ghi; `drainFrom` vắng lấy `DRAIN.from` (16); mục lỗi hoàn lại các mục trước rồi mới ném; ba case mới trong `tests/overrides.test.ts` (`777a137`). Các vòng r1–r6 không đi qua đường dùng chung (phản biện đã xem), nên số đã đo không đổi | đã sửa |
| 12 | `--g3c=only` thoát trước khi ghi `--out`/`--json` | Bỏ `process.exit`, nhánh chung ghi file (`777a137`); thử lại: `.md` có bảng G3c | đã sửa |
| 13 | Thiếu test trực tiếp cho luật (a) ở ải chương và Tia 7; tên test ghi "×1.15, +10 %" | Hai test mới trong `tests/guns.test.ts` (băng Chuẩn ở ải chương 1, ở Trận thử 1,06, Rèn vẫn nhân; Tia 7 ở ải chương, 6 ở Trận thử, sạch hay không). Thử đổi ngược `chapterCleanDamage` 1,15 và Tia 6: cả hai test hỏng. Tên test của Trận thử sửa (`931a2b9`) | đã sửa |
| 14 | `survival-s1-stage` có thể đạt trên trận bị cắt ngang | Thêm `missingEnded`; tick đi lùi (trang tải lại) là trượt; replay phải có lệnh và chạy tới tick cuối đã đọc (`cbdcc16`) | đã sửa |
| 15 | `vite.config.ts` không bỏ qua `tmp/`: dev server tải lại cả trang khi agent khác ghi vào `tmp/` | `server.watch.ignored: ["**/tmp/**"]` kèm chú thích (`cbdcc16`); BUILD_S1 §16 ghi | đã sửa |
| 16 | `survival-s1-loadout` không mở Kho súng; chú thích "Ray + Pháo Sao không để hở hàng nào" sai | Thêm bước Kho súng (5 thẻ trong khung, có "Trận thử: 24 viên", có ảnh); chú thích sửa: mọi cặp đều hở một hàng, Ray + Pháo Sao hở Bầy sát vạch (`cbdcc16`) | đã sửa |
| 17 | `survival-s1-perf` không kiểm khoảng khung | In khoảng khung (p95, tối đa), số khung lỡ một nhịp làm tươi, khung mỗi giây; chú thích và BUILD_S1 §17 ghi "khung" của §17 là thời gian JS của trang (`cbdcc16`). Không chấm vì GPU và máy bận quyết định khoảng khung | đã sửa |
| 18 | Chữ thẻ nạp súng và bảng tin chỉ 10–12 px ở 1280×720 | Thẻ nạp súng: p 12 → 13, small 11 → 12, nhãn 10 → 12 px; bảng tin: nhãn MỚI 10 → 12, dòng phụ khoảng 11 → 12 px; Kho súng: dòng phụ 12 → 13 px (`8f2ae2d`). Kiểm không tràn bằng `review-loadout.mjs` và `-loadout` | đã sửa |
| 19 | Kho súng ngắt dòng giữa số và đơn vị | Khoảng trắng không ngắt giữa số và "m"/"s", U+2060 quanh dấu "–" của "6–24" (`guns.ts`, `main.ts`, `screens-journey.ts`; `84136f2`, `8f2ae2d`); "75 %", "6 %" (`ccb34e2`) và "thêm 6 %" (`d5f20ca`) cũng không ngắt. Chụp lại Kho súng ở hai cỡ sau `d5f20ca` (mục "Đã xem khung hình") | đã sửa |
| 20 | Phép so A1/A2 lẫn Ray 110 với 112; bỏ ×1,06 là lane chọn | BUILD_S1 §5.1 ghi rõ: bỏ ×1,06 là lựa chọn của lane trong phạm vi đề xuất 2a; `A1` (Ray 110) và `A2` (Ray 112) lẫn hai biến; xét lại thì đo `A1` với Ray 112 | đã ghi |
| 21 | Ngân sách chỉnh: "6 vòng" thực là 47 biến thể | Ghi số biến thể cạnh số vòng (lượt này: 1 vòng B1 = 1 biến thể `HEAVY.spill` × 2 bộ seed; 1 vòng thử ải 3 = 1 biến thể × 2 bộ seed, không commit). Một vòng được bao nhiêu biến thể: coordinator chốt (mục "Còn lại") | đã ghi; chờ coordinator |
| 22 | §13: `guns.ts` chạm trần 170 / 170; changelog không liệt kê file quá trần có từ trước | Bớt chú thích: `guns.ts` 162 dòng (`84136f2`). `balance.ts` giữ 174 (thêm `spill` nhưng gộp chú thích). Danh sách đủ ở BUILD_S1 §13 và mục "Ngân sách dòng" | đã sửa |
| 23 | Changelog Mac thiếu mục "Mục review đã xử lý" | Thêm bảng nối mục "Còn lại" và "Chờ chủ dự án" của R1 close với việc đã làm | đã sửa |
| 24 | `AGENTS.md` dặn dev server cổng 3047 | `AGENTS.md`, chú thích các kịch bản, BUILD_S1 (dòng 77, §16, bảng rủi ro): `pnpm dev`, cổng 3007 | đã sửa |
| 25 | Script bằng chứng trong `tmp` luôn ghi "exit 0" | Sửa `r1-report/scripts/visual.sh`, `gpu.sh`, `review-browser/scripts/run.sh`: lưu `e=$?` ngay sau lệnh node. Script của lượt này (`review-fix/scripts/browser.sh`) làm đúng từ đầu. Không vào Git | đã sửa (ngoài Git) |

## Đã làm

| Commit | Nội dung |
|---|---|
| `777a137` | `--set`: chép object trên đường đi của một ải trước khi ghi; `drainFrom` vắng lấy `DRAIN.from`; mục lỗi hoàn lại các mục trước. `--g3c=only` ghi `--out`/`--json`. Cuối báo cáo: "B6 gộp" và "B1/B7 chạy lại" (`scripts/rollup.ts`, file mới 45 dòng); dòng thời gian ghi trận bot, trận G3c và cả lệnh. Test: 5 case |
| `84136f2` | `HEAVY.spill` (luật (b) ở trần), test dải theo E. `guns.ts` 170 → 162 dòng (bớt lịch sử trong chú thích; lịch sử ở các changelog R1), chú thích `nominal` của Tia, đơn vị không ngắt dòng trong tầm và băng |
| `8f2ae2d` | Chữ dạy luật gõ chuẩn (màn chính, Kho súng); "tầm" không ngắt dòng; cỡ chữ thẻ và bảng tin; `info()` của tay cầm dev có số chương trình shader |
| `931a2b9` | Test luật (a) ở ải chương và Tia 7 / 6; test bước sim §17 đủ 2.000 viên, 63 + 1 quả |
| `cbdcc16` | Kịch bản `-latency`, `-stage`, `-loadout`, `-perf`; Vite bỏ qua `tmp/`; cổng 3007 trong chú thích |
| `ccb34e2` | "75 %", "6 %" của Kho súng không ngắt dòng |
| `a697e45` | `-stage`: tay cầm dev biến mất (trang tải lại) cũng tính là tải lại |
| `d5f20ca` | Kho súng: "thêm 6 %" không ngắt dòng (khoảng trắng không ngắt sau "thêm"; `ccb34e2` chỉ giữ số với "%") |
| commit tài liệu | Changelog này; sửa tại chỗ changelog Mac và report; BUILD_S1 §5.1, §6, §8, §11.3, §11.4, §13, §16, §17; BUILD_NOTES §9.6; `AGENTS.md` |

## Luật (b) ở trần

`lengthFor` (`src/content/balance.ts:39`): đầu dài lấy `min(10, hi + 1)`; chữ trần từ chối (`hi + 1 − 10`) cộng vào đầu ngắn (× `HEAVY.spill`). Dải theo E: BUILD_S1 §5.1. Chỉ bot Nhanh (E 70) có E ≥ 60.

Đo cùng mã `84136f2`, bot Nhanh, Cân bằng, 100 seed, `--set=HEAVY.spill=0` (luật cũ) so với 1 (`tmp/.../review-fix/spill/`). Thắng · S · P · I:

| Ải | Seed 1–100, spill 0 | spill 1 | Seed 101–200, spill 0 | spill 1 |
|---|---|---|---|---|
| 1 | 91 · 65 · 21 · 14 | 92 · 68 · 22 · 11 | 81 · 65 · 21 · 14 | 82 · 63 · 22 · 11 |
| 2 | 92 · 96 · 5,5 · 11 | 92 · 95 · 6,1 · 8,2 | 86 · 96 · 6,5 · 12 | 84 · 95 · 6,5 · 8 |
| 3 | 87 · 90 · 8,8 · 8,8 | 86 · 89 · 8,9 · 6 | 72 · 88 · 9,9 · 8,9 | 70 · 88 · 10 · 6,2 |
| 4 | 85 · 36 · 34 · 16 | 86 · 33 · 34 · 12 | 90 · 34 · 33 · 16 | 84 · 30 · 35 · 12 |

- Nhàn I giảm 2,7–4 điểm ở cả 8 ô: người gõ nhanh trả thêm phím cho băng nặng, đúng ý luật. Ải 2 seed 1–100 và 101–200, I về dải (≤ 10).
- S ải 4 giảm 3–4 điểm (xuống dưới đáy 35). Ải 1 seed 1–100, S lên 68 (trên 65).
- Chỉ số lệch dải của Nhanh: 9 → 10 (seed 1–100), 9 → 8 (seed 101–200). Không lợi rõ cho tổng B1, nhưng luật đúng thiết kế và kéo đúng chỉ số mà người gõ nhanh trượt (I; changelog Mac, "Vì sao chưa đóng được"). Giữ.
- Đây là 1 vòng của họ B1 / B7 trong lượt sửa này (1 biến thể × 2 bộ seed).

## Báo cáo 100 seed trên mã đã commit (hai bộ seed)

Lệnh: `node --import tsx scripts/balance.ts --stages=c1-s1,c1-s2,c1-s3,c1-s4 --g3c --time [--first=101] --json=… --out=…`, mỗi bộ seed một tiến trình, chạy song song qua `heavy.sh`, HEAD `cbdcc16` (các commit sau chỉ đổi chữ của Kho súng và kịch bản trình duyệt, không đổi sim). **Số Apple M4:** mỗi bộ 18 400 trận (14 400 bot, 4 000 G3c); cả lệnh 915 s và 928 s (15:15 và 15:28, hai báo cáo chạy cùng lúc, tải 4,6 → 8,7); bộ nhớ thường trú đỉnh 350 và 355 MB. Báo cáo: `bal/f1.md`, `bal/f101.md`, `.json`; bảng: `bal/both.md`, `bal/tables.md`.

Đủ bảng §3 (BALANCE.md): thắng · S · P · I · O (%) · N · Q (%), thêm thời gian hạ quái (BUILD_S1 §11.3). Cân bằng, bộ điều nhịp bật, súng do bot tự chọn; Trẻ em ở Thư giãn chỉ chấm B3. Dải Cân bằng: thắng 75–90 %, S 35–65 %, P 15–35 %, I ≤ 10 %, O ≤ 8 %, N 0,3–1 (mềm), Q 50–70 % (mềm). So với báo cáo trên `a4376a0`, seed 1–100 chỉ đổi hàng Nhanh (luật (b) ở trần); mọi hàng khác trùng từng số.

**Ải 1 (Trụ vững 150 s, rỉ × 2)**

| Bot | Seed 1–100: thắng · S · P · I · O · N · Q | Hạ quái (s) | Lệch dải | Seed 101–200: thắng · S · P · I · O · N · Q | Hạ quái (s) | Lệch dải |
|---|---|---|---|---|---|---|
| Mới | 86 · 65 · 22 · 2,7 · 0 · 0,15 · 66 | 1,43 | trong dải | 87 · 63 · 23 · 3,2 · 0 · 0,19 · 65 | 1,47 | trong dải |
| Chậm chắc | 96 · 76 · 18 · 3,3 · 0 · 0,09 · 62 | 1,20 | thắng↑ S↑ | 92 · 69 · 19 · 3,5 · 0 · 0,09 · 63 | 1,32 | thắng↑ S↑ |
| Chuẩn | 93 · 69 · 22 · 6 · 0 · 0,16 · 63 | 1,22 | thắng↑ S↑ | 82 · 66 · 22 · 6,5 · 0 · 0,13 · 62 | 1,25 | S↑ |
| Khá | 92 · 71 · 20 · 15 · 0 · 0,09 · 62 | 1,03 | thắng↑ S↑ I↑ | 84 · 69 · 19 · 15 · 0 · 0,08 · 62 | 1,04 | S↑ I↑ |
| Ẩu | 86 · 60 · 24 · 6,9 · 0,6 · 0,20 · 65 | 1,29 | trong dải | 82 · 51 · 26 · 7,1 · 0,5 · 0,27 · 65 | 1,36 | trong dải |
| Nhanh | 92 · 68 · 22 · 11 · 0 · 0,11 · 62 | 1,08 | thắng↑ S↑ I↑ | 82 · 63 · 22 · 11 · 0 · 0,09 · 63 | 1,09 | I↑ |
| Chuẩn, tắt nhịp | 90 · 78 · 18 · 6,9 · 0 · 0,06 · 60 | 1,10 | S↑ | 92 · 73 · 18 · 7,4 · 0 · 0,09 · 59 | 1,12 | thắng↑ S↑ |
| Chuẩn · Tốt | 96 · 80 · 15 · 10 · 0 · 0,04 · 57 | 0,93 |  | 91 · 79 · 15 · 10 · 0 · 0,08 · 58 | 0,96 |  |
| Chuẩn · Kém | 90 · 44 · 35 · 1,9 · 0 · 0,32 · 77 | 2,27 |  | 82 · 36 · 35 · 2,1 · 0 · 0,38 · 77 | 2,36 |  |
| Trẻ em, Thư giãn | 90 · 67 · 21 · 1,6 · 0 · 0,15 · 77 | 2,91 | B3: đạt | 91 · 66 · 22 · 1,5 · 0 · 0,16 · 77 | 3,03 | B3: đạt |

**Ải 2 (Săn 3/5, rỉ × 1)**

| Bot | Seed 1–100: thắng · S · P · I · O · N · Q | Hạ quái (s) | Lệch dải | Seed 101–200: thắng · S · P · I · O · N · Q | Hạ quái (s) | Lệch dải |
|---|---|---|---|---|---|---|
| Mới | 93 · 94 · 13 · 3 · 0 · 0,04 · 65 | 1,40 | thắng↑ S↑ P↓ | 88 · 94 · 13 · 3,6 · 0 · 0,08 · 65 | 1,40 | S↑ P↓ |
| Chậm chắc | 96 · 96 · 11 · 3,5 · 0 · 0,03 · 61 | 1,22 | thắng↑ S↑ P↓ | 95 · 96 · 11 · 3,7 · 0 · 0,05 · 62 | 1,27 | thắng↑ S↑ P↓ |
| Chuẩn | 94 · 95 · 12 · 5,4 · 0 · 0,05 · 63 | 1,18 | thắng↑ S↑ P↓ | 93 · 94 · 13 · 6,1 · 0,1 · 0,10 · 63 | 1,29 | thắng↑ S↑ P↓ |
| Khá | 93 · 96 · 5,7 · 12 · 0 · 0,02 · 57 | 0,83 | thắng↑ S↑ P↓ I↑ | 86 · 96 · 6,5 · 12 · 0 · 0,01 · 58 | 0,88 | S↑ P↓ I↑ |
| Ẩu | 90 · 94 · 15 · 6,2 · 0,6 · 0,07 · 65 | 1,33 | S↑ | 85 · 93 · 15 · 7,1 · 0,6 · 0,09 · 66 | 1,32 | S↑ P↓ |
| Nhanh | 92 · 95 · 6,1 · 8,2 · 0 · 0,02 · 59 | 0,86 | thắng↑ S↑ P↓ | 84 · 95 · 6,5 · 8 · 0 · 0,01 · 60 | 0,87 | S↑ P↓ |
| Chuẩn, tắt nhịp | 97 · 96 · 10 · 6,1 · 0 · 0,02 · 59 | 1,10 | thắng↑ S↑ P↓ | 93 · 96 · 11 · 6,5 · 0 · 0,03 · 60 | 1,18 | thắng↑ S↑ P↓ |
| Chuẩn · Tốt | 96 · 97 · 5,2 · 7,5 · 0 · 0,03 · 54 | 0,81 |  | 95 · 97 · 6,5 · 8,1 · 0 · 0,08 · 54 | 0,91 |  |
| Chuẩn · Kém | 86 · 60 · 30 · 2,8 · 0,1 · 0,15 · 77 | 2,58 |  | 85 · 59 · 30 · 2,9 · 0,2 · 0,10 · 77 | 2,61 |  |
| Trẻ em, Thư giãn | 90 · 77 · 19 · 2,5 · 0 · 0,12 · 77 | 3,08 | B3: đạt | 93 · 83 · 18 · 2,5 · 0 · 0,08 · 77 | 3,01 | B3: đạt |

**Ải 3 (Trụ vững 165 s, Vết nứt, rỉ × 1)**

| Bot | Seed 1–100: thắng · S · P · I · O · N · Q | Hạ quái (s) | Lệch dải | Seed 101–200: thắng · S · P · I · O · N · Q | Hạ quái (s) | Lệch dải |
|---|---|---|---|---|---|---|
| Mới | 88 · 77 · 17 · 2,2 · 0 · 0,12 · 66 | 1,54 | S↑ | 87 · 74 · 18 · 2,4 · 0 · 0,13 · 69 | 1,61 | S↑ |
| Chậm chắc | 94 · 87 · 14 · 2,3 · 0 · 0,07 · 65 | 1,37 | thắng↑ S↑ P↓ | 93 · 80 · 14 · 2,6 · 0 · 0,08 · 63 | 1,36 | thắng↑ S↑ P↓ |
| Chuẩn | 90 · 86 · 16 · 4,1 · 0 · 0,07 · 65 | 1,32 | S↑ | 81 · 76 · 16 · 4,7 · 0 · 0,11 · 66 | 1,38 | S↑ |
| Khá | 87 · 90 · 8 · 9,4 · 0 · 0,02 · 61 | 0,94 | S↑ P↓ | 78 · 90 · 9,4 · 9,5 · 0 · 0,06 · 61 | 1,02 | S↑ P↓ |
| Ẩu | 84 · 78 · 19 · 5 · 0,4 · 0,15 · 67 | 1,44 | S↑ | 73 · 64 · 19 · 5,8 · 0,4 · 0,12 · 68 | 1,50 | thắng↓ |
| Nhanh | 86 · 89 · 8,9 · 6 · 0 · 0,03 · 64 | 0,98 | S↑ P↓ | 70 · 88 · 10 · 6,2 · 0 · 0,02 · 64 | 1,06 | thắng↓ S↑ P↓ |
| Chuẩn, tắt nhịp | 93 · 89 · 14 · 4,7 · 0 · 0,03 · 62 | 1,20 | thắng↑ S↑ P↓ | 89 · 82 · 15 · 5,1 · 0 · 0,03 · 61 | 1,28 | S↑ P↓ |
| Chuẩn · Tốt | 94 · 93 · 7,2 · 6 · 0 · 0,06 · 57 | 0,94 |  | 87 · 92 · 8,7 · 6 · 0 · 0,05 · 58 | 1,04 |  |
| Chuẩn · Kém | 85 · 47 · 32 · 1,8 · 0,1 · 0,23 · 78 | 2,63 |  | 82 · 45 · 30 · 2,1 · 0,1 · 0,22 · 78 | 2,62 |  |
| Trẻ em, Thư giãn | 90 · 59 · 21 · 1,5 · 0 · 0,13 · 77 | 3,17 | B3: đạt | 88 · 70 · 22 · 1,5 · 0 · 0,16 · 77 | 3,24 | B3: đạt |

**Ải 4 (Trụ vững 165 s, Khiên, Thiếu chữ, rỉ × 2)**

| Bot | Seed 1–100: thắng · S · P · I · O · N · Q | Hạ quái (s) | Lệch dải | Seed 101–200: thắng · S · P · I · O · N · Q | Hạ quái (s) | Lệch dải |
|---|---|---|---|---|---|---|
| Mới | 89 · 62 · 21 · 3,1 · 0 · 0,16 · 56 | 1,18 | trong dải | 92 · 62 · 20 · 3,6 · 0 · 0,16 · 56 | 1,15 | thắng↑ |
| Chậm chắc | 96 · 71 · 17 · 3,8 · 0 · 0,15 · 53 | 1,00 | thắng↑ S↑ | 99 · 68 · 17 · 4 · 0 · 0,10 · 53 | 0,98 | thắng↑ S↑ |
| Chuẩn | 93 · 51 · 23 · 5,9 · 0 · 0,18 · 53 | 1,01 | thắng↑ | 96 · 53 · 23 · 6,3 · 0 · 0,19 · 53 | 1,04 | thắng↑ |
| Khá | 90 · 38 · 32 · 16 · 0 · 0,42 · 51 | 0,75 | I↑ | 93 · 36 · 31 · 17 · 0 · 0,48 · 51 | 0,74 | thắng↑ I↑ |
| Ẩu | 89 · 46 · 26 · 7,4 · 0,5 · 0,18 · 54 | 1,05 | trong dải | 87 · 44 · 26 · 7,6 · 0,3 · 0,24 · 54 | 1,11 | trong dải |
| Nhanh | 86 · 33 · 34 · 12 · 0 · 0,55 · 51 | 0,79 | S↓ I↑ | 84 · 30 · 35 · 12 · 0 · 0,66 · 52 | 0,82 | S↓ I↑ |
| Chuẩn, tắt nhịp | 95 · 58 · 20 · 6,5 · 0 · 0,06 · 52 | 0,91 | thắng↑ | 96 · 63 · 19 · 6,7 · 0 · 0,07 · 52 | 0,91 | thắng↑ |
| Chuẩn · Tốt | 97 · 60 · 22 · 11 · 0 · 0,11 · 49 | 0,63 |  | 98 · 53 · 22 · 11 · 0 · 0,10 · 50 | 0,65 |  |
| Chuẩn · Kém | 78 · 40 · 30 · 2,3 · 0,1 · 0,26 · 77 | 2,28 |  | 77 · 35 · 31 · 2,5 · 0,1 · 0,27 · 77 | 2,33 |  |
| Trẻ em, Thư giãn | 94 · 77 · 17 · 2 · 0 · 0,08 · 77 | 2,60 | B3: đạt | 96 · 82 · 15 · 2,2 · 0 · 0,12 · 76 | 2,56 | B3: đạt |

- N của mọi bot ở Cân bằng là 0,01–0,66, dưới dải mềm trừ Khá, Nhanh ở ải 4 (0,42–0,66). Q 49–69 % trong dải mềm, trừ Kém và Trẻ em (76–78 %).

**G3c hai bộ seed** (Chuẩn, Cân bằng, 100 seed mỗi bộ; cặp > 97 % in đậm; seed 1–100 trùng từng số báo cáo trên `a4376a0`, vì luật (b) ở trần không chạm bot Chuẩn):

| Ải | Seed 1–100: tốt nhất / kém nhất · cách | Seed 101–200: tốt nhất / kém nhất · cách | Cặp đứng đầu (1–100 / 101–200) | Kết quả |
|---|---|---|---|---|
| 1 | 95 / 72 · 23 | 94 / 65 · 29 | Xung + Pháo Sao, Tia + Tán, Tán + Ray 95 / Tia + Tán 94 | đạt cả hai (cách 29 sát trần 30) |
| 2 | 99 / 77 · 22 | 100 / 78 · 22 | **Tia + Tán 99, Tia + Ray 99**, Tán + Pháo Sao 97, Tán + Ray 96 / **Tia + Ray 100**, Tia + Tán 96 | trượt vế tốt nhất ở cả hai; mọi cặp > 97 có Tia |
| 3 | 94 / 68 · 26 | 94 / 66 · 28 | Tia + Tán, Tán + Ray 94 / Tia + Tán 94 | đạt cả hai |
| 4 | 100 / 72 · 28 | 98 / 72 · 26 | **Tia + Ray 100, Tia + Pháo Sao 98**, Tán + Pháo Sao 97, Xung + Pháo Sao 96, Tia + Tán 96 / **Tia + Ray 98, Tán + Pháo Sao 98**, Xung + Pháo Sao 97, Tia + Pháo Sao 97 | trượt vế tốt nhất ở cả hai; có cặp không Tia > 97 |

**Phương sai giữa hai bộ seed** (cùng mã, 36 ô thắng: 6 bot B1, Chuẩn tắt nhịp, Tốt, Kém × 4 ải): chênh trung vị 4 điểm, lớn nhất 16 (Nhanh ải 3: 86 / 70). 6 / 36 ô chênh quá 8 điểm, trong khi sai số chuẩn của hiệu hai mẫu 100 seed là khoảng 5 điểm. Các ô chênh lớn cùng một hướng: seed 101–200 khó hơn ở ải 1 (Chuẩn −11, Nhanh −10, Khá −8) và ải 3 (Nhanh −16, Ẩu −11, Chuẩn −9, Khá −9). Seed quyết định kế hoạch trận (nhịp sóng, bão, Vết nứt) cho mọi bot cùng lúc, nên các ô của một bộ seed không độc lập: "±4 điểm" là sai số của một ô, không phải của một kết luận đứng trên một bộ seed. Vì vậy từ nay mỗi vòng chỉnh được xác nhận trên seed 101–200 (BUILD_S1 §11.3, §11.4).

### Cổng R1 (BUILD_S1 §14) trên mã đã commit

| Cổng | Kết quả | Số (seed 1–100 / seed 101–200) |
|---|---|---|
| `pnpm check` | đạt | `a697e45`: 59 file kit khớp, 11 file, 124 test, `tsc`, `vite build` |
| B1 | **trượt** ở cả 4 ải | Chỉ số lệch 10 / 17 / 10 / 6 (tổng 43) và 6 / 15 / 11 / 8 (tổng 40); bot lệch 4 / 6 / 6 / 4 và 4 / 6 / 6 / 5. Luật chạy lại (ô lệch ≤ 3 điểm, hàng "B1/B7 chạy lại" của báo cáo): seed 1–100 có ải 1 Nhanh, ải 4 Chuẩn, ải 4 Nhanh; ở seed 101–200 cả ba vẫn lệch (Nhanh ải 1 I 11; Chuẩn ải 4 thắng 96; Nhanh ải 4 S 30, I 12). Báo cáo seed 101–200 có bốn ô lệch ≤ 3 điểm khác (ải 1 Chuẩn S +0,5, Nhanh I +1,2; ải 3 Ẩu thắng −2; ải 4 Mới thắng +2): theo luật đó là ô chạy lại ở seed 201–300; lượt này không chạy, vì B1 đã trượt ở mọi ải bằng các ô lệch xa hơn |
| B2 | đạt | Không ô nào có S ≥ 90 % kèm I ≥ 20 % (gần nhất: Khá ải 2, S 96 % với I 12 %) |
| B3 | đạt | Mới ở Cân bằng 86 / 93 / 88 / 89 và 87 / 88 / 87 / 92 %; Trẻ em ở Thư giãn 90 / 90 / 90 / 94 và 91 / 93 / 88 / 96 % |
| B4 | đạt | S Chậm chắc / Ẩu 76 / 60, 96 / 94, 87 / 78, 71 / 46 và 69 / 51, 96 / 93, 80 / 64, 68 / 44 %. Hạ quái Chuẩn / Ẩu 1,22 / 1,29; 1,18 / 1,33; 1,32 / 1,44; 1,01 / 1,05 và 1,25 / 1,36; 1,29 / 1,32; 1,38 / 1,50; 1,04 / 1,11 s. Biên hẹp: ải 2 seed 101–200 (S cách 3, hạ quái cách 0,03 s) và ải 4 (0,04–0,07 s) |
| B5 | đạt | Bot không gõ thắng 0 % ở mọi ải, mọi chế độ |
| B6 (R1 chỉ đo) | đạt (gộp ải) | Cân bằng +6 / +10 / +9 / +19, **gộp +11,0**; và +9 / +10 / +5 / +21, **gộp +11,3**. Thử thách gộp +37,5 và +28,8 |
| B7 | **trượt** ở cả 4 ải | Bậc mỗi đợt tối đa 1,96 / 1,94 (≤ 3), khoảng sinh 86–114 % (trong ±15 %). Chuẩn tắt nhịp (thắng · S): 90 · 78, 97 · 96, 93 · 89, 95 · 58 và 92 · 73, 93 · 96, 89 · 82, 96 · 63; lệch quá 3 điểm ở mọi ải, nên không có ô chạy lại |
| B8 | đạt | Cổng học G5 đạt ở mọi bot có gõ |
| B9 | chờ chủ dự án | Buổi chơi thử (§18, sau R2) |
| G3 | đạt | `tests/guns.test.ts` trong `pnpm check` (mã súng không đổi; luật (b) ở trần không chạm E 35 của kịch bản) |
| G3m | đạt | Khớp seed 1–16 và 17–32 trên cả hai báo cáo; ✕ thứ hai của Tia đứng nhờ biên (1,96× / 1,93×) |
| G3c | **trượt một vế** | Mục "G3c hai bộ seed" |
| G5 | đạt | 13 200 trận có gõ mỗi báo cáo |
| G6 | đạt | Ải 2, Chuẩn, Cân bằng: trung vị 112 / 113 s (110–190) |
| G8 | đạt | 8 trận chạy lại trong Node mỗi báo cáo; replay từ Chrome khớp Node ở `-stage` (mục "Kịch bản trình duyệt") |
| §7.6 | đạt | 0 lần hai báo trước cách nhau < 4 s |
| §17 | đạt các hàng đo được; bộ nhớ một chương chờ R2 | Mục "Hiệu năng §17" |

**Kết luận cổng:** R1 chưa xong; ba chỗ trượt (B1, B7, G3c ở ải 2 và 4) đứng trên cả hai bộ seed.

## Ải 3: nguồn thua

`tmp/.../review-fix/scripts/s3-loss.ts`: ải 3, Cân bằng, Chuẩn, Ẩu, Nhanh, cùng đầu trận và súng như báo cáo, ghi từng lần quái chạm vạch (loại, giờ, bến có băng không, bao nhiêu quái trong 10 m). Trung bình mỗi trận thua (`s3-loss.md`):

| Bot · seed | Thắng | Bộ súng thua nhiều | Giáp mất: rỉ / chạm vạch / đạn lính | Chạm theo giờ: 60–90 s / 150 s+ / khác | Lúc chạm: bến có băng (hai / một / không) | Quái trong 10 m lúc chạm (thua / thắng) |
|---|---|---|---|---|---|---|
| Chuẩn · 1–100 | 90 | Xung + Ray 5 / 59 | 23 / 76 / 10 | 48 / 14 / 14 | 23 / 52 / 1 | 42 / 22 |
| Chuẩn · 101–200 | 81 | Xung + Ray 10 / 61, Xung + Tán 4 / 5 | 26 / 72 / 4 | 42 / 22 / 7 | 16 / 52 / 4 | 51 / 24 |
| Ẩu · 1–100 | 84 | Xung + Ray 6 / 59 | 28 / 73 / 9 | 46 / 15 / 12 | 17 / 50 / 6 | 47 / 16 |
| Ẩu · 101–200 | 73 | Xung + Ray 11 / 61, Xung + Tán 5 / 5 | 28 / 67 / 9 | 42 / 15 / 10 | 19 / 41 / 7 | 52 / 23 |
| Nhanh · 1–100 | 86 | Xung + Ray 14 / 100 | 18 / 85 / 1 | 53 / 32 / 0 | 49 / 35 / 0 | 71 / 37 |
| Nhanh · 101–200 | 70 | Xung + Ray 30 / 100 | 18 / 83 / 1 | 45 / 38 / 0 | 43 / 40 / 0 | 68 / 31 |

- Trận thua mất 67–85 giáp vì **bầy** chạm vạch (Trâu 0–7, lính 3–6). Trận thắng chỉ mất 3–11.
- Phần lớn rơi vào **giây 60–90**: đoàn của đỉnh tràn giây 55 (8 s, 8,5 con/s) đi tới vạch. ≤ 10 s sau một Vết nứt chỉ 1–12 giáp; trong cửa sổ đỉnh tràn 55–75 s chỉ 2–8.
- Lúc chạm, bến vẫn có băng (bến rỗng chỉ 0–7 giáp): súng không thiếu đạn mà bị **ngộp**. Xung bắn từng con một, Ray xiên hàng, mà trong 10 m có 42–71 quái (trận thắng: 16–37).
- Seed 101–200 có nhiều trận vỡ hơn ở cùng bộ súng (Nhanh: 14 → 30 trên 100 trận Xung + Ray).
- **Thử một đòn bẩy** (không commit; 1 biến thể × 2 bộ seed): đỉnh tràn đầu của ải 3 dàn 8 → 12 s, cùng số quái (`--set=c1-s3.surges.0.seconds=12,c1-s3.surges.0.rate*=0.6667`, `s3-lever/`). Seed 101–200: Ẩu 73 → 76, Nhanh 70 → 76 (về dải), Chuẩn 81 → 88, Khá 78 → 81 (so với báo cáo trên mã đã commit; phản biện ghi Nhanh 72 trên `7e53835`, trước luật (b) ở trần). Nhưng ải dễ đi với mọi người: Chậm chắc 93 → 99, Mới 87 → 92, S vẫn cao; chỉ số lệch 10 → 13 (seed 1–100), 11 → 11 (seed 101–200). Vực giảm, B1 không lợi. Hướng tiếp: dàn đỉnh tràn **và** bù sức ép đều (nhịp nền hoặc rỉ) cho bot mạnh, chấm trên cả hai bộ seed.
- Vì vậy bỏ hướng "đỉnh tràn thứ ba" của "Còn lại" 3 (changelog Mac): thêm một đỉnh nữa làm thêm một vực.

## Hiệu năng §17

**Số Apple M4**, Chrome 155 headless, GPU "ANGLE Metal Renderer: Apple M4", dev server `pnpm dev` cổng 3007, khung khóa 60 Hz (cách khung trung vị 16,7 ms). Tải máy 3,4–11 (các lane khác, hai báo cáo của lane này trong vài lần đo); mỗi lần đo hiệu năng giữ cả 3 chỗ trình duyệt của `heavy.sh`. Kết quả: `gpu/`, `gpu2/`, `gpu3/` (`.json`, tải ở `.load`).

**Dò khung dài** (`hitch/`, `scripts/hitch-probe.mjs`, trên mã của `931a2b9`, lúc đó chưa commit; kịch bản `-latency` cũ chưa đổi): cùng cách chơi với `-latency` cũ, mỗi khung ghi thời gian cập nhật / vẽ của trang, số chương trình shader, geometry, texture, heap JS; `PerformanceObserver("long-animation-frame")` ghi script của mọi khung > 50 ms.

| Lần dò | Khung | Khung > 50 ms | Script trong khung dài | Shader mới | Heap |
|---|---|---|---|---|---|
| 1280×720, 20 từ | 4 625 | 1 (100 ms, lúc 176 ms, phím đầu tiên) | `DOMWindow.onkeydown` 107 ms | 28 → 29 ở 527 ms, khung 16,7 ms | rơi 3 MB mỗi ~0,7 s, khung 16,7 ms |
| 1920×1080, 38 từ | 8 494 | 1 (100 ms, lúc 175 ms, phím đầu tiên) | `DOMWindow.onkeydown` 106 ms | 28 → 29 ở 525 ms, khung 16,7 ms | như trên |

Trình nghe `keydown` đó là `audio.resume()` (`src/app/main.ts:489`): phím hoặc chạm đầu tiên tạo AudioContext, các bus và lớp nhạc. Khi chơi thật, phím đầu tiên là Enter ở màn chính, ngoài trận. Ở trình duyệt người chơi, khoảng 0,1 s đó không rơi vào trận. Nếu sau này muốn nó ngắn hơn (ví dụ trận mở thẳng từ đường dẫn) thì dời phần dựng bus ra sau phím đầu; lượt này không đổi.

| §17 | Đích | Đo | 1280×720 | 1920×1080 |
|---|---|---|---|---|
| Phím tới hình | ≤ 1 khung | `survival-s1-latency` mới, lần 1: 386 phím (2 trận), trung vị / p95 / tối đa | 10,1 / 17,2 / 32,4 ms | 9,6 / 17,1 / 19,0 ms |
| Phím tới đạn | ≤ 50 ms | lần 1: 40 từ Xung (2 trận × 20), trung vị / p95 / tối đa; số từ > 50 ms | 10,7 / 19,0 / 22,9 ms; 0 | 10,5 / 18,2 / 18,9 ms; 0 |
| Khung dài (> 50 ms) | | khoảng khung tối đa, mọi trận | 0 (tối đa đúng 50,0 ms, một khung) | 0 (tối đa 33,3 ms) |
| Đỉnh khoảng 150 quái | TB ≤ 6, p95 ≤ 10 ms | `survival-s1-perf`, ải 4 Pháo Sao + Tia vào toán Khiên (148 / 148 quái), thời gian JS TB / p95 / tối đa | 0,65 / 1,2 / 2,2 ms | 0,59 / 1,1 / 1,8 ms |
| | | ải 3 Tán + Ray, Vết nứt (146 / 145 quái) | 0,68 / 1,3 / 3,6 ms | 0,78 / 1,5 / 3,4 ms |
| `flood(700)` | p95 ≤ 14 ms | Tán + Ray (655 / 652 quái) | 0,92 / 1,5 / 2,3 ms | 1,67 / 3,2 / 7,6 ms |
| Màn hình hiện (mới, không chấm) | | khoảng khung p95 / tối đa; khung lỡ nhịp; khung mỗi giây | 16,8 / 16,8 ms; 0; 60,1 ở cả ba cảnh | 16,7 / 16,8 ms; 0; 60,0–60,4 |
| Draw call | ≤ 160 | cả hai cảnh | 38–40 | 38–40 |
| Bước sim (Node) | ≤ 1,5 ms | test (`931a2b9`): ải 4, 3 bến, mỗi bước bắt đầu với 700 quái, 2.000 viên, 63 quả, 32 khiên | trung vị 0,877 ms riêng, 0,910 ms trong `pnpm check` (tải 11); hai lần `pnpm check` cuối 1,394 và 1,399 ms (tải 8,3 và 35–60): sát trần, xem "Kiểm" | |
| Bộ nhớ một chương 30 phút | heap sau GC tăng ≤ 15 MB | | chưa đo: chương có từ R2 | |

- **Lặp lại phím tới đạn:** chạy `-latency` 3 lần mỗi cỡ (`gpu/`, `gpu2/`, `gpu3/`; 01:15–02:24, tải 2,2–7,1), tức 12 trận, 240 từ Xung, 2 316 phím. Cả 6 lần đạt. Phím tới đạn p95 19,0 / 19,3 / 19,8 ms (1280×720) và 18,2 / 19,2 / 18,9 ms (1920×1080), tối đa 31,7 ms, 0 từ > 50 ms. Phím tới hình p95 17,1–17,8 ms, tối đa 32,4 ms. 0 khung dài: khoảng khung tối đa 16,8–50,0 ms. So với lượt phản biện (2/11 lần trượt, mỗi lần có một khung 67–383 ms): khung dài đó là phím khởi động âm thanh, nay nằm ngoài phần đo.
- So với lượt phản biện: phản biện thấy ở cảnh Khiên 1920×1080 khoảng khung p95 33,3 ms; lần này 16,7 ms, 0 khung lỡ nhịp. Hai lần đo cách nhau vài giờ, tải máy khác nhau; chưa đủ để nói cảnh đó luôn đủ 60 khung.
- Phím tới hình tối đa 32,4 ms ở 1280×720 (một phím, khung 50 ms do máy bận); p95 vẫn 17,2 ms.

## Kịch bản trình duyệt

Apple M4, Chrome 155 headless, dev server `pnpm dev` cổng 3007, qua `heavy.sh --gpu` (`review-fix/scripts/browser.sh`, mã thoát của chính kịch bản). Kết quả: `visual/`, `visual2/`, `fit/`. 0 lỗi console, 0 ngoại lệ ở mọi lần đạt.

| Kịch bản | 1280×720 | 1920×1080 |
|---|---|---|
| `survival-s1-loadout` (15 kiểm, có Kho súng) | đạt: 5 thẻ Kho súng trong khung, có "Trận thử: 24 viên"; chữ trên bến 32 px | đạt (chữ bến 48 px) |
| `survival-s1-stage` | lần 1 trượt vì trang tải lại (xem dưới); chạy lại đạt (11 kiểm): ải 2 thắng ở 112,6 s, giáp 96, "BẦY RÚT LUI", replay 469 lệnh khớp (`fa5f8ef2`); ải 4 thắng ở 165 s, giáp 72, 1 111 lần thấy chữ che, chữ đầu không bao giờ che, 0 số đè, replay 872 lệnh khớp (`7b6f0e02`) | đạt (11 kiểm): ải 2 thắng ở 112,6 s, giáp 90, "BẦY RÚT LUI", replay 471 lệnh khớp (`fe27b3b2`); ải 4 thắng ở 165 s, giáp 69, 1 107 lần thấy chữ che, chữ đầu không bao giờ che, 0 số đè, replay 868 lệnh khớp (`154adba3`) |
| `survival-s0-fight` | đạt (10 kiểm): 679 phím, thắng, giáp 59, tối đa 108 quái, 7 số và 599 mảnh cùng lúc, replay 809 lệnh khớp (`2f5dddb3`) | đạt (10 kiểm): 678 phím, thắng, giáp 59, tối đa 106 quái, replay 807 lệnh khớp (`0f2c1b55`) |
| `survival-s1-perf`, `-latency` | đạt (11, 8 kiểm) | đạt (11, 8 kiểm) |
| Kiểm thẻ nạp súng (`review-loadout.mjs` của phản biện, Ray + Pháo Sao) | đạt (7 kiểm): chữ nhỏ nhất trên thẻ 12 px, không phần tử nào tràn hay ra ngoài thẻ, khung 130–590 px trong màn cao 720 | đạt (7 kiểm): chữ nhỏ nhất 18 px |

- **Lần chạy đầu của `-stage` ở 1280×720 trượt vì chính lane:** lúc trận Săn đang ở giây 41, commit `ccb34e2` sửa `main.ts`, Vite tải lại trang. Kịch bản mới bắt được: `huntEnded` trượt và replay rỗng (0 lệnh, tick 67) làm `nodeReplaysToBrowserHash` trượt; kịch bản cũ sẽ cho replay rỗng "khớp". Sau đó `a697e45` tính cả lúc tay cầm dev biến mất là tải lại. Chạy lại trên mã đã commit: đạt (11 kiểm), số ở bảng trên.

## Đã xem khung hình

Ảnh ở `tmp/mac-2026-10-25/review-fix/` (không vào Git):

- `visual/survival-s1-loadout-armory-1280x720`: Kho súng, "tầm 30 m", "tầm 6–24 m" nằm trên một dòng; dòng học "Gõ không lỗi: xuyên Vỏ (Vỏ chỉ chặn 75 %) và dễ chí mạng; ở Trận thử đòn mạnh thêm 6 %". Ở ảnh này "6 %." xuống dòng một mình. `ccb34e2` chỉ giữ số với "%", nên "6 %." vẫn đứng riêng một dòng; `d5f20ca` thêm khoảng trắng không ngắt sau "thêm".
- `tmp/mac-2026-10-26/feel/r1-review-fix/visual/survival-s1-loadout-armory-1280x720` và `-1920x1080` (chụp lại với chữ của `d5f20ca`, `survival-s1-loadout` đạt 15 / 15 kiểm ở cả hai cỡ, dev server cổng 4270): "thêm 6 %." xuống dòng cùng nhau, không còn số đứng một mình; năm thẻ trong khung, "(Trận thử: 24 viên)", "tầm 30 m", "tầm 6–24 m" trên một dòng.
- `visual/survival-s1-loadout-cards-1280x720`: 5 thẻ nạp súng ở chữ 13 px, không tràn; thẻ Ray "tầm 30 m · từ dài tới +1 chữ", Pháo Sao "tầm 6–24 m · từ dài tới +1 chữ"; dấu vàng "Trâu, Đầu Đàn (Vỏ) · 9%".
- `visual/survival-s1-loadout-briefing-1280x720`: bảng tin ải 1, Trâu "MỚI" (nhãn 12 px), "Vỏ 4 · 220 máu, dẫn 5 bầy", "khắc: RAY"; dòng phụ 12 px đọc rõ.
- `gpu/survival-s1-latency-1280x720-run2`: ải 1, Xung + Ray, số "21", "14", "HOÀN HẢO", khung học "full · đầy ✓".
- `gpu/survival-s1-perf-shields-1920x1080`: ải 4, khoảng 150 quái, Thiếu chữ "h_use", "cho_se", số "208", "26" đọc được, khiên của toán Khiên.
- `visual2/survival-s1-stage-c1-s4-mid-1280x720` (lần chạy lại): ải 4, bến PHÁO SAO đang gõ "success" (phần đã gõ màu súng), bến XUNG "cos_" (Thiếu chữ, chữ đầu không che), vòng nổ đỏ của Pháo Sao, toán Khiên; giáp 98, còn 1:45.

## Kiểm

- **`pnpm check`** trên `a697e45` (qua `heavy.sh`, 05:18, tải 8,3): 59 file kit khớp, 11 file test, 124 test (trước 119), `tsc --noEmit`, `vite build`, 11,8 s. Trên cây cuối (`d5f20ca`; commit tài liệu không đổi mã): đạt, 05:46–06:02 (chờ lõi của `heavy.sh` khoảng 15 phút, tải 35–63), cùng 59 file kit, 11 file, 124 test, `tsc`, `vite build` (`tmp/mac-2026-10-26/feel/r1-review-fix/check.log`, `check-final.log`).
- **Test bước sim §17 sát trần khi máy bận:** lần `pnpm check` lúc 05:18 (tải 8,3) cho trung vị 1,394 ms, p95 1,506 ms; lúc 06:02 (tải 35–60) 1,399 ms, p95 1,754 ms; trần 1,5 ms (trung vị); lúc tải 11 (01:40) là 0,910 ms. Test lấy tốt nhất trong tối đa 3 seed chỉ khi trung vị > 1,5, nên chưa trượt, nhưng biên chỉ khoảng 7 %. Giữ trong `pnpm check` như test S0; nếu nó bắt đầu trượt vì máy bận thì tách nó ra một lệnh riêng (phản biện mục 10 đã gợi ý).
- **Vết vàng Trận thử** không đổi (`tests/s0-trace.test.ts` trong `pnpm check`): luật (b) ở trần chỉ chạm súng nặng, Trận thử không có.
- **152 trận chương băm như cũ, trừ đúng phần luật đổi** (`tmp/mac-2026-10-25/scripts/hashes.ts`: 10 bộ súng × 4 ải × 3 seed với bot Chuẩn, cộng súng bot tự chọn của Mới, Chậm chắc, Ẩu, Nhanh × 4 ải × 2 seed): HEAD `a697e45` với `--set=HEAVY.spill=0` trùng **từng dòng** với `7e53835` (mã phản biện đã đọc, `review-static/hashes-head-7e53835.txt`); HEAD như commit chỉ khác ở **8 dòng, đều của Nhanh** (E 70, bot duy nhất có E ≥ 60). Nghĩa là các commit của lượt này chỉ đổi sim ở đúng luật (b) ở trần; chữ, CSS, kịch bản và công cụ không chạm sim; `d5f20ca` sau đó chỉ đổi một chuỗi chữ trong `src/app/main.ts`, file sim không nhập (`tmp/mac-2026-10-26/feel/r1-review-fix/hashes-head*.txt`).
- **G3m:** `node --import tsx scripts/counters.ts` trên HEAD khớp hai bộ seed (`review-fix/counters.txt`).
- `git diff --check` sạch.

### Ngân sách dòng §13

`guns.ts` 170 → 162 / 170; `content/balance.ts` 174 / 170 (không dài thêm: luật mới thay chú thích dài); `main.ts` 651 (trần R1 656, không dài thêm); `screens-journey.ts` 120, `survival.css` 229 không đổi; `scripts/balance.ts` 170 / 170, `scripts/balance-lib.ts` 236 / 260; file mới `scripts/rollup.ts` 45. `scripts/overrides.ts` 64 → 86, `tests/overrides.test.ts` 33 → 74, `tests/guns.test.ts` 499 → 538, `tests/survival-sim.test.ts` 526 → 538. Tổng `src/` (không kể kit, có CSS) 9 932 → 9 924 dòng (trần 10 000). File quá trần có từ trước (lượt này không làm dài thêm): BUILD_S1 §13, mục "Đang quá trần".

## Còn lại

Cổng R1 chưa đạt. Thứ tự nên làm (mọi vòng chấm trên seed 1–100 **và** 101–200):

1. **Ngân sách vòng chỉnh** (phản biện, mục 21): coordinator chốt một vòng được bao nhiêu biến thể. Đề xuất: một vòng là một ý (một đòn bẩy), tối đa 4 biến thể của nó, mỗi biến thể chấm trên cả hai bộ seed. Lượt này dùng 1 vòng B1 (`HEAVY.spill`) và 1 vòng thử ải 3 (không commit).
2. **Nhàn của Khá, Nhanh (B1 ở ải 1, 2, 4):** luật §5.1 cho bến đầy (`MAG_MAX` 3 khi E ≥ 45, hoặc từ gõ vào bến đầy nạp "băng nhanh"). Ghi "đã chọn theo đề xuất" khi làm.
3. **Ải 3:** dàn đỉnh tràn đầu (hết vực của Xung + Ray) kèm bù sức ép đều cho bot mạnh. Không thêm đỉnh tràn thứ ba.
4. **G3c ải 2:** hãm `TIA_DUTY` khi bộ có Tán hoặc Ray (mọi cặp > 97 có Tia). **G3c ải 4:** sức ép chung của ải hoặc Pháo Sao ở ải có khiên (Tán + Pháo Sao, Xung + Pháo Sao 96–98 cũng vượt trần). Đo G3m hai bộ seed sau mỗi lần đổi Tia hoặc Tán (✕ thứ hai của Tia đứng nhờ biên).
5. **Ải 2 (Săn):** S 93–96 % ở mọi bot; dời đỉnh tràn rồi mới dời giờ Đầu Đàn (§7.6).
6. **B7** đi theo B1.
7. Nếu vẫn không đóng được: chủ dự án quyết có sang R2 với B1 / B7 còn trượt không.
8. **§17:** bộ nhớ một chương 30 phút chờ R2. Khoảng 0,1 s dựng âm ở phím đầu tiên: chỉ đáng sửa nếu có đường vào trận không qua màn chính.
9. **Chủ BALANCE ở repo cha:** cách đo hạ quái của B4 (BUILD_S1 §11.3) vào BALANCE §7. **B9:** chủ dự án chơi thử. Tải lại giữa trận ải chương vẫn vào Trận thử (cờ `inFight`, R2).
