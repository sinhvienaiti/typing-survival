# 2026-10-28 — Tuyến Cuối: lóe và đèn mới hiện trọn ở khung đầu (phiếu Codex 035)

Chuẩn VFX nhiều lớp (`docs/games/VFX_STANDARD.md` của repo cha) §3.1 luật 5, §3.4, §5.6: hiệu ứng và đèn mới sinh phải được vẽ ở tuổi 0 ngay khung tạo ra chúng. Codex viết mã theo phiếu `docs/codex-queue/035-ts-first-frame.md` (repo cha), không có trình duyệt; Claude duyệt, chạy lại các kiểm, đo trên trình duyệt rồi commit trên nhánh `ts-vfx` (tách từ `ce9dea3`, **chưa gộp** vào `main`).

Commit: `5d9c8cb` (mã và test của phiếu), cùng commit giấy tờ này.

## Lỗi và cách sửa

- `Glows.step` cộng `dt` vào tuổi trước lần ghi đầu, nên một lóe "3 khung" hiện 44 %, 11 % rồi tắt thay vì 100 %, 44 %, 11 %. `GunLights.update` cũng vậy: ở khung đầu đèn Xung 44 %, Tán và phát đầu băng Xung 63 %, Ray 69 %, Pháo Sao 74 %, hạ quái to 79 %.
- Nay mỗi burst mang cờ "mới": `step` không già hóa nó, `flush` ghi nó ở tuổi 0 rồi xóa cờ. Stamp ghi vào mảng riêng và được chép sau các burst, nên burst tạo trong pha vẽ sau một stamp (vòng giậm của Trâu) không còn để lại một ô dữ liệu của khung trước. Đèn `flash` là mới tới lần `update` kế.
- Bỏ tham số tạm `early` của N4/N6 (8 lời gọi `burst(…, NaN, F)`): sau bản sửa nó sẽ cho hai khung đầy, sáng hơn thiết kế.
- Chỉ đụng view: mã băm 152 chương giữ nguyên (`ae7e9859…626e`). Không đổi cường độ, đời, cỡ hay công thức mờ dần.

## Kiểm

- `pnpm check`: 151/151 test, 15 file (lượt đầu chỉ test đo thời gian bước sim hỏng khi máy tải nặng; lượt lại đạt), `tsc` và `vite build` đạt.
- `tests/first-frame.test.ts` (9 ca): 7 ca hỏng trên mã cũ; hai đột biến (già hóa burst mới, bỏ nhánh đèn mới) làm hỏng đúng ca 1–5 và 7–8.

## Đo trên trình duyệt (Mac mini M4, Chrome có GPU)

Máy chủ Vite riêng của nhánh (`127.0.0.1:4161`), đồng hồ giữ, ải 1 chương 1, seed 3, bộ điều phối tắt, một bầy đặt sẵn; mỗi súng gõ một băng, chụp **mọi khung** (16,7 ms) từ khung trước phím cuối, có và không có HUD. Đo bằng `tools/vfx-sheet` (phiếu 037, nhánh `vfx` của repo cha): năng lượng sáng trong đĩa quanh nòng (bán kính 1,5 lần lóe của §4.2) so với khung ngay trước phát bắn. "Trước" là bốn file view của `ce9dea3` trên cùng máy chủ, cùng kịch bản.

| Súng | Cỡ | Khung đầu / đỉnh (≥ 0,95) | Năng lượng f0 trước → sau | Trắng xóa vùng sân (max, ≤ 6 %) | Tương phản dòng từ p99 (≥ 7) |
|---|---|---|---|---|---|
| Xung | 720p | 1,00 → 1,00 | 8.911 → 9.175 | 1,04 % → 1,03 % | 8,94 → 8,90 |
| | 1080p | 1,00 → 1,00 | 18.089 → 19.215 | 1,06 % → 1,06 % | 8,70 → 8,90 |
| Tán | 720p | 1,00 → 1,00 | 16.488 → 16.987 | 1,22 % → 1,26 % | 7,53 → 7,53 |
| | 1080p | 1,00 → 1,00 | 36.199 → 37.469 | 1,22 % → 1,22 % | 7,53 → 7,50 |
| Ray | 720p | 1,00 → 1,00 | 18.466 → 20.174 | 1,72 % → 1,72 % | 7,80 → 7,69 |
| | 1080p | 1,00 → 1,00 | 41.183 → 44.173 | 1,63 % → 1,70 % | 7,76 → 7,66 |
| Pháo Sao | 720p | 1,00 → 1,00 | 4.662 → 5.028 | 0,84 % → 0,84 % | 10,89 → 10,79 |
| | 1080p | 1,00 → 1,00 | 9.699 → 10.235 | 0,88 % → 0,87 % | 11,07 → 10,98 |

- Khung phát bắn là khung sáng nhất ở cả hai bản, nên tỉ lệ "khung đầu / đỉnh" của §5.6 đạt cả trước lẫn sau; lõi lóe ở f0 đã gần trắng (bị cắt ở 255) nên f0 chỉ sáng thêm 3–9 %. Khác biệt thật nằm ở các khung sau: trong lõi nòng (bán kính 0,6 lóe) Ray 720p f1–f3 là 2.482 / 1.805 / 1.015 trước, 2.863 / 2.550 / 1.771 sau; Tán f3 1.575 → 1.804. Tức là đường mờ dần nay chậm đúng một khung so với trước: khung đầu là tuổi 0, đúng thiết kế.
- Nền dưới dòng từ ở 12 khung ngay sau phát bắn (p50, ẩn HUD): +0,004 tới +0,024 (Tán 720p +0,024, Ray 1080p +0,019). Đây là phép đo gắt hơn §4.1 (chỉ ngay sau phát bắn); phép đo của §4.1 là `f8` dưới đây.
- `survival-feel` `f8` (hai trận 70 s, ải 1 Xung + Tia và ải 4 Pháo Sao + Xung), so với số của `ce9dea3` trong changelog N4/N6: tương phản dòng từ p99 7,80 → **7,80** (720p), 7,83 / 7,80 → **7,69** (1080p); nền dưới dòng từ p50 0,208 → **0,204**, 0,188 / 0,192 → **0,204** (+0,012 tới +0,016, trần +0,02); hai bến 8,55 / 7,64 và 8,55 / 7,68 như cũ; quái bị ánh sáng che còn sống sau 0,5 s 2,4 % và 6,2 % (720p), 4,4 % và 4,3 % (1080p), trần 10 %; số đè dòng từ 0. Kiểm trượt duy nhất là "mắt → đòn" (224 và 219, đích 210), có từ bước 1 (trước 226 và 218 / 216).
- Không lỗi console, không ngoại lệ trang ở mọi lượt. Tờ khung và số: `tmp/035c/` của worktree (ngoài Git; khung thô đã xóa sau khi ghép tờ).

## Khi gộp vào `main`

- `main` đã đi tiếp (`ea8e0f9`, `f8fa756`, `3f63fcf`): `git merge-tree` báo **một xung đột** ở `src/view/shots.ts` dòng cụm lửa của lóe hạ to (`main` đổi đời cụm lửa thành `0.3 + r() * 0.15`, nhánh này bỏ `, F`). Cách gộp: giữ đời của `main`, bỏ `, F`. `fx.ts` tự gộp (`main` chỉ đổi shader).
- Sau khi gộp mới sửa tài liệu trên `main`: đoạn "Bùng ở khung đầu" của `FEEL_PASS_S1.md` §12 và dòng `early` ở mục cuối §12, dòng `Glows.burst(…, early = F)` trong `AGENTS.md`, mục "Lóe cũ mất khung đầu" của changelog N4/N6. Nhánh này không sửa các file đó để khỏi đụng làn đang ghi ở bản checkout chính.

## Đã gộp vào `main` (28/10, làn V của TS-M1-04)

Gộp `main` (`bf0e6f9`, đã có bản sửa khói và tên tiếng Anh) vào `ts-vfx` ở `b70f743`, rồi `main` tiến thẳng (fast-forward) lên nhánh này.

- **Một xung đột, đúng như dự đoán**, ở dòng cụm lửa của `ShotFx.bigKill` (`shots.ts`): giữ đời `0.3 + r() * 0.15` của `main`, bỏ `, F` của phiếu. Hai dòng độ sâu của shader khói (`vY` thành `vec2` ở vertex, `gl_FragDepth` ở fragment) lấy nguyên từ `main`. Sau khi gộp, cây chỉ khác `main` ở 6 file của phiếu: `fx.ts`, `lights.ts`, `shots.ts`, `typing-feel.ts`, `tests/first-frame.test.ts` và changelog này.
- **Giấy tờ sửa sau khi gộp**: đoạn "Bùng ở khung đầu" của `FEEL_PASS_S1.md` §12, dòng `early` ở §12.1 và mục "Còn mở" của §13.3; hai dòng về `early` và phiếu 035 trong `AGENTS.md`; hai mục "Lóe cũ mất khung đầu" của changelog N4/N6.

### Kiểm lại trên cây đã gộp (`b70f743`, Mac mini M4, Chrome có GPU, Vite riêng ở `127.0.0.1:4180`)

- `pnpm check`: 151/151 test trong 15 file (có `tests/s0-trace.test.ts`), `tsc` và `vite build` đạt.
- Mã băm 152 chương (`node --import tsx scripts/chapter-hashes.ts`) trùng từng dòng với `bf0e6f9`; `src/sim`, `src/content`, `tests/golden` không đổi.

| Kịch bản | 1280×720 | 1920×1080 |
|---|---|---|
| `survival-feel` `f8` | Đạt mọi kiểm trừ "mắt → đòn" (có từ bước 1): tương phản dòng từ p99 **7,80**; nền dưới dòng từ p50 **0,204** (bước 1: 0,200, tức +0,004, trần +0,02); hai bến 8,55 / 7,64; quái bị ánh sáng che còn sống sau 0,5 s: ải 1 **1,9 %**, ải 4 **6,5 %** (trần 10 %); số thô 3,2 / 8,2 %; số đè dòng từ 0; mắt → đòn gộp 228 px (ải 1 202, ải 4 283; đích 210) | Như vậy: **7,73**; **0,200** (bước 1: 0,192, +0,008); 8,55 / 7,68; **3,8 %** và **4,9 %** (thô 5,9 / 6,8 %); số đè 0; mắt → đòn 213 (195 / 276) |
| `survival-feel-guns` `f5` | Đạt: năm súng bắn ở khung phím cuối; bán kính lóe nòng Xung 81 px (cần 46), Tia 89 (40), Tán 99 (58), Ray 78 (69), Pháo Sao 58 (35); sàn quanh nòng sáng thêm 0,21–0,37 | Đạt: 120 / 133 / 152 / 124 / 83 px (cần 69 / 60 / 86 / 104 / 52); sàn +0,21–0,35 |
| `survival-feel-guns` `f6b` | Đạt cả 11 cảnh (`cloudKeepsFoes`, `cloudReads`, `emberStar`, `chunksLie`); độ lệch luma thấp nhất của quái trong hộp 0,115–0,172 | 10 / 11 cảnh đạt; `phao-leader` trượt `cloudKeepsFoes` (độ lệch của hộp vẫn ≥ 0,132; tỉ số với chính quái 0,36–0,57 ở 0,3–0,7 s và 2 s) |
| `survival-s1-stage` | Đạt mọi kiểm (hai trận kết thúc, bảng mục tiêu, chữ ẩn, không số đè, replay trong Node ra đúng mã băm) | Đạt mọi kiểm |

**Về `phao-leader` ở 1080p.** Chạy lại riêng cảnh này 3 lần trên cây gộp và 3 lần trên `bf0e6f9` (trước phiếu), cùng máy: `bf0e6f9` trượt 1 / 3 lần (hai khung 0,7–0,8 s, tỉ số thấp nhất 0,49), cây gộp trượt 1 / 3 lần (0,3–0,9 s, 0,285), cộng lượt trong chuỗi kiểm. Chỗ tụt là lúc loạt đạn kế của chính Pháo Sao rơi vào hộp (khung 2 s là một chùm nổ trắng), không phải đám khói: kiểm này đã lung lay trước khi gộp, và phiếu (lóe tắt chậm đúng một khung) có thể làm nó tụt sâu hơn một chút. Đề xuất: ở lô VFX thứ hai (TS-M1-16, có Pháo Sao) cho `cloudKeepsFoes` bỏ qua khung có chùm nổ Pháo Sao trong hộp, hoặc giảm lóe của chùm nổ đó.
