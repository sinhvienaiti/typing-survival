# 30/10/2026 · Ba núm luật bến đầy · Phiếu 220

**Chưa ứng viên nào bot đạt đủ các cổng trên cả hai bộ seed.** F4 (`FULL_BAY.boost=0.3`) đứng đầu ở c1-s1 theo luật chọn của phiếu, nhưng còn 4 điều kiện trượt cộng hai bộ. Khuyến nghị giữ mặc định tắt; dùng F4 làm ứng viên để Claude xem tiếp, chưa áp V6 hay luật mới vào game. Ở bốn ải, F4 làm B6 Cân bằng ải 2 giảm từ +10/+10 xuống +8/+8 điểm; ải 4 bộ sau còn đảo Thử thách −8 điểm (Nhanh − Mới). Vì vậy chưa khuyến nghị áp luật nào.

Ba núm FULL_BAY mặc định 0, chỉ ở ải chương: extra lấy sàn và chặn sức chứa MAG_CAP; spill nạp sang bến ít băng nhất, hòa chọn chỉ số nhỏ; boost tăng sát thương băng cuối một lần. Khi ghép, spill trước boost; S0 giữ luật cũ. Không áp số V6 vào content.

Test mới: 21 đỏ trước mã → 21 xanh sau mã. Đột biến R2/R3/R1: 6/4/5 đỏ; trả mã: 21 xanh. pnpm check: 296 test / 26 file → 317 / 27; kit 61/61, TypeScript/build xanh. Golden S0 giữ SHA-256; 152 dòng mã băm chương không đổi. V6 tái tạo và phần c1-s1 của ba báo cáo bốn ải đều 0 ô/trường lệch.

Sửa theo kiểm lại 230 (Claude):
- 230-F6: `words.ts` import thẳng `fullBayWord`; bỏ thuộc tính `loadMagazine.fullBayWord` trong `weapons.ts`.
- 230-F7: test R3 cho bến 3 băng (Rèn cấp 3; R1 `extra=1`): ô 2 giữ dấu cũ sau `nextMagazine`, chỉ `loadMagazine` xóa. Đột biến M7 (không xóa dấu): 2 test đỏ.
- 230-F8: `tests/chapter-hashes.test.ts` ghim 152 mã băm chương (`tests/golden/chapter-hashes.txt`, núm tắt, trùng byte `220/chapter-before.txt`). `scripts/chapter-hashes.ts` dùng chung `scripts/chapter-hash-lines.ts`, in ra không đổi byte. Đột biến M14 (thêm mảng tầng đầu vào `guns`): đỏ.
- pnpm check: 324 test / 28 file, kit 61/61, TypeScript/build xanh. Golden S0 giữ SHA-256 `42e4e5a9…`.

## Tổng biến thể · c1-s1

| Bản · seed | B1 ô (chỉ số) | I Khá / Nhanh CB | B3 Mới / Trẻ | B6 CB / TT | B7 sát mép | G3c kém / tốt | TT Nhanh − Mới | Chặn |
|---|---|---|---|---|---|---|---|---|
| V6 · 1–100 | 4 (7) | 14,9 / 10,9 | 86 / 91 | +12 / +35 | TRƯỢT | 73 / 98 | +3 | B1, B7, G3c |
| V6 · 101–200 | 3 (3) | 15,1 / 11,2 | 85 / 89 | +11 / +32 | TRƯỢT | 62 / 90 | +3 | B1, B7 |
| F1 · 1–100 | 6 (11) | 12,7 / 9,2 | 89 / 91 | +7 / +23 | TRƯỢT | 76 / 100 | +13 | B1, B6, B7, G3c |
| F1 · 101–200 | 6 (9) | 12,6 / 9,2 | 85 / 90 | +14 / +38 | TRƯỢT | 71 / 97 | +10 | B1, B7 |
| F2 · 1–100 | 6 (11) | 17,8 / 13,6 | 88 / 89 | +6 / +23 | TRƯỢT | 72 / 97 | -4 | B1, B6, B7 |
| F2 · 101–200 | 6 (8) | 17,7 / 14 | 87 / 90 | +10 / +28 | TRƯỢT | 62 / 95 | -6 | B1, B7, G3c, Thứ bậc Thử thách |
| F3 · 1–100 | 3 (4) | 1,1 / 0,6 | 84 / 86 | +13 / +32 | TRƯỢT | 71 / 98 | +12 | B1, B7, G3c |
| F3 · 101–200 | 1 (1) | 1,2 / 0,6 | 86 / 88 | +14 / +23 | TRƯỢT | 68 / 92 | +0 | B1, B7 |
| F4 · 1–100 | 3 (4) | 1,2 / 0,7 | 85 / 88 | +11 / +34 | TRƯỢT | 67 / 96 | +7 | B1, B7 |
| F4 · 101–200 | 1 (1) | 1,3 / 0,7 | 81 / 89 | +14 / +23 | TRƯỢT | 68 / 91 | +2 | B1, B7 |

G3m, B2–B5, B8, G5, G8 và §7.6 có đủ số/pass trong bảng chi tiết; không bỏ cổng trượt khi xếp hạng. **G3m chỉ thấy R1** qua sức chứa 3 trong cảnh một súng nạp thẳng; R2/R3 không chạy ở đó, nên không lấy G3m làm bằng chứng cho hai luật này.

I đếm `live <= 0 && !busy`: R2 không thay việc mọi bến đầy là hết chữ hữu ích, chỉ đổi I gián tiếp qua chọn bến và trận đấu. R3 cho bến đầy chưa tăng được tính live, nên một phần I giảm là do còn một lần gõ hữu ích theo định nghĩa mới.

## Bốn ải · V0 / V6 / ứng viên

Mỗi ải chạy độc lập, đủ hai bộ seed. Bảng dưới có cả ải 1 để đối chiếu. B6 trong bảng là hiệu từng ải; cổng B6 chung đọc số gộp bốn ải ở bảng kế tiếp. Các dấu B6 xấu hơn chỉ ra suy giảm cục bộ, không gọi số gộp là trượt.

| Ải · seed | Bản | B1 ô (chỉ số) | I Khá / Nhanh | B3 Mới / Trẻ | B6 CB / TT | B7 | G3c kém / tốt | TT Nhanh − Mới |
|---|---|---|---|---|---|---|---|---|
| c1-s1 · 1–100 | x-v0 | 4 (10) | 14,8 / 10,9 | 86 / 90 | +6 / +40 | TRƯỢT | 72 / 95 | -23 |
| c1-s1 · 1–100 | x-v6 | 4 (7) | 14,9 / 10,9 | 86 / 91 | +12 / +35 | TRƯỢT | 73 / 98 | +3 |
| c1-s1 · 1–100 | x-f4 | 3 (4) | 1,2 / 0,7 | 85 / 88 | +11 / +34 | TRƯỢT | 67 / 96 | +7 |
| c1-s1 · 101–200 | x-v0 | 4 (6) | 15 / 11,2 | 87 / 91 | +9 / +25 | TRƯỢT | 65 / 94 | -7 |
| c1-s1 · 101–200 | x-v6 | 3 (3) | 15,1 / 11,2 | 85 / 89 | +11 / +32 | TRƯỢT | 62 / 90 | +3 |
| c1-s1 · 101–200 | x-f4 | 1 (1) | 1,3 / 0,7 | 81 / 89 | +14 / +23 | TRƯỢT | 68 / 91 | +2 |
| c1-s2 · 1–100 | x-v0 | 6 (17) | 12 / 8,2 | 93 / 90 | +10 / +29 | TRƯỢT | 77 / 99 | +9 |
| c1-s2 · 1–100 | x-v6 | 6 (17) | 12 / 8,2 | 93 / 90 | +10 / +18 | TRƯỢT | 77 / 99 | +4 |
| c1-s2 · 1–100 | x-f4 | 6 (16) | 0,2 / 0 | 92 / 89 | +8 / +15 | TRƯỢT | 84 / 100 | +6 |
| c1-s2 · 101–200 | x-v0 | 6 (15) | 12,2 / 8 | 88 / 93 | +10 / +19 | TRƯỢT | 78 / 100 | +2 |
| c1-s2 · 101–200 | x-v6 | 6 (15) | 12,2 / 8 | 88 / 93 | +10 / +1 | TRƯỢT | 78 / 100 | -1 |
| c1-s2 · 101–200 | x-f4 | 6 (13) | 0,2 / 0 | 90 / 88 | +8 / +9 | TRƯỢT | 77 / 100 | -2 |
| c1-s3 · 1–100 | x-v0 | 6 (10) | 9,4 / 6 | 88 / 90 | +9 / +47 | TRƯỢT | 68 / 94 | +8 |
| c1-s3 · 1–100 | x-v6 | 6 (10) | 9,4 / 6 | 88 / 90 | +9 / +29 | TRƯỢT | 68 / 94 | +4 |
| c1-s3 · 1–100 | x-f4 | 6 (11) | 0,1 / 0 | 87 / 88 | +6 / +31 | TRƯỢT | 71 / 97 | +6 |
| c1-s3 · 101–200 | x-v0 | 6 (11) | 9,5 / 6,2 | 87 / 88 | +5 / +34 | TRƯỢT | 66 / 94 | +5 |
| c1-s3 · 101–200 | x-v6 | 6 (11) | 9,5 / 6,2 | 87 / 88 | +5 / +16 | TRƯỢT | 66 / 94 | -7 |
| c1-s3 · 101–200 | x-f4 | 5 (10) | 0,1 / 0 | 84 / 87 | +1 / +15 | TRƯỢT | 73 / 94 | -5 |
| c1-s4 · 1–100 | x-v0 | 4 (6) | 16,1 / 12,4 | 89 / 94 | +19 / +34 | TRƯỢT | 72 / 100 | -12 |
| c1-s4 · 1–100 | x-v6 | 4 (6) | 16,1 / 12,4 | 89 / 94 | +19 / +22 | TRƯỢT | 72 / 100 | -9 |
| c1-s4 · 1–100 | x-f4 | 3 (4) | 1,2 / 0,6 | 90 / 93 | +19 / +29 | TRƯỢT | 78 / 98 | -2 |
| c1-s4 · 101–200 | x-v0 | 5 (8) | 16,5 / 11,9 | 92 / 96 | +21 / +37 | TRƯỢT | 72 / 98 | -34 |
| c1-s4 · 101–200 | x-v6 | 5 (8) | 16,5 / 11,9 | 92 / 96 | +21 / +29 | TRƯỢT | 72 / 98 | -22 |
| c1-s4 · 101–200 | x-f4 | 3 (4) | 1,2 / 0,5 | 90 / 96 | +23 / +37 | TRƯỢT | 73 / 98 | -8 |

### B6 gộp bốn ải

| Bản · seed | CB | TT |
|---|---|---|
| x-v0 · 1 | +11 | +37,5 |
| x-v0 · 101 | +11,25 | +28,75 |
| x-v6 · 1 | +12,5 | +26 |
| x-v6 · 101 | +11,75 | +19,5 |
| x-f4 · 1 | +11 | +27,25 |
| x-f4 · 101 | +11,5 | +21 |

### Cổng và số làm xấu hơn ở ải 2–4

So ứng viên với từng nền cùng seed. “Mất cổng” chỉ việc từ đạt sang trượt; “số xấu hơn” ghi thêm dù cổng vốn đã đỏ. B1 dùng số ô/chỉ số lệch; B3 dùng biên tối thiểu; B6 dùng cả hai chế độ; G3c dùng khoảng cách tới ba ngưỡng.

| Ải · seed | So với | Mất cổng | Số xấu hơn |
|---|---|---|---|
| c1-s2 · 1 | x-v0 | B6 | B3, B6, G3c, TT Nhanh − Mới |
| c1-s2 · 1 | x-v6 | B6 | B3, B6, G3c |
| c1-s2 · 101 | x-v0 | B6 | B3, B6, B7 tắt nhịp, TT Nhanh − Mới |
| c1-s2 · 101 | x-v6 | không | B3, B6, B7 tắt nhịp, TT Nhanh − Mới |
| c1-s3 · 1 | x-v0 | không | B1, B3, B6, B7 tắt nhịp, TT Nhanh − Mới |
| c1-s3 · 1 | x-v6 | không | B1, B3, B6, B7 tắt nhịp |
| c1-s3 · 101 | x-v0 | không | B3, B6, B7 tắt nhịp, TT Nhanh − Mới |
| c1-s3 · 101 | x-v6 | không | B3, B6, B7 tắt nhịp |
| c1-s4 · 1 | x-v0 | không | B3, B6 |
| c1-s4 · 1 | x-v6 | không | B3 |
| c1-s4 · 101 | x-v0 | không | B7 tắt nhịp |
| c1-s4 · 101 | x-v6 | không | B7 tắt nhịp |

## Điều chưa quyết

- Dấu R3 nằm ngoài hashWorld; nếu chọn R3 cần đưa vào hash có chủ đích và cập nhật 152 mã băm.
- View chưa thể hiện luật mới; R1 cần kiểm thẻ 3 ô, R2 cần nối bến và nhãn tiếng Anh, R3 cần sự kiện/cờ, nhãn tiếng Anh và tiếng thật.
- B9 cần người thật chơi. Các số ở đây chỉ chứng minh bot.
- Claude duyệt ứng viên và quyết định luật; mọi mặc định vẫn tắt. Báo cáo đầy đủ và Δ cùng seed ở repo cha `docs/codex-queue/220-report.md`, `220/summary.md`, `220/decision.md`.
