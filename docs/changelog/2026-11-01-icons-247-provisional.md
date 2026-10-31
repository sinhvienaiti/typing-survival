# 01/11/2026 · Năm icon của phiếu 247 gắn tạm

## Quyết định

Phiếu 247 do Claude vẽ bằng Adobe Firefly Image 5: 3 vòng, 21 lượt, sáu giám khảo mù chấm ở cỡ thật. Không icon nào đạt 8. Bản tốt nhất mỗi hàng được 6,5–7, còn bản thay thế ở các phiếu trước (`.r2`) chỉ được 4–5,5 (báo cáo `docs/codex-queue/247-report.md` ở repo cha).

Chủ dự án, 01/11: **"Gắn tạm"**. Năm icon này vào game như bản tạm, **chưa được nhận** theo luật 2D ≥ 8.

## Đã đổi

| Vai | Hiện ở đâu | Bản cũ | Bản tạm (art-src) | fill |
|---|---|---|---|---|
| `icon-stat-evenness` | Profile: Steadiness | `ui/icons/stat-evenness` (240) | `ui/icons/stat-evenness.r3` | 0,8 |
| `icon-stat-new-word` | Profile: New-word read | `ui/icons/stat-new-word` (152) | `ui/icons/stat-new-word.r5` | 0,8 |
| `icon-rift` | dải cảnh báo Rift (`src/view/strip.ts`) | `ui/icons/rift` (152) | `ui/icons/rift.r3` | 0,8 |
| `icon-pace-director` | Options: Adapt pace to your typing | `ui/icons/pace-director.v2` (152) | `ui/icons/pace-director.r5` | 0,8 |
| `icon-shake` | Options và bảng nhanh: Screen shake | `ui/icons/shake` (240) | `ui/icons/shake.r5` | 0,85 |

- `scripts/ui-art/selection.json`: thay nguồn ngay trong mục cũ (mỗi vai một mục, như các icon 242), `ticket: "247"`, `provisional: true`, lời phán `CODEX_QUEUE 247: Tạm 01/11 …`.
- `fill` 0,8 thay vì 0,85: giám khảo nói bốn icon đặc này nặng hơn các icon nét mảnh bên cạnh. Riêng Screen shake giữ 0,85, vì nó rộng gấp đôi chiều cao.
- `pnpm ui-art:prepare` ghi 15 ảnh WebP mới vào `public/` (bị bỏ qua, không vào Git) và cập nhật `src/view/ui-art.json`.

## Phép thử

Ba phép thử ghi cứng nội dung selection nên phải sửa:
- `tests/ui-art-roles.ts`: nguồn và phiếu mới của năm vai.
- `tests/ui-art-icons.test.ts`: mục của phiếu 247 phải có lời phán "Tạm 01/11" và `provisional: true`; các phiếu khác vẫn phải là "Nhận 31/10".
- `tests/panels-art.test.ts`: vẫn cấm hai bản `.r2` hỏng của 243. Phiếu 247 chỉ được có đúng năm mục tạm này, và vẫn không có gì của 246, 248–250.

`pnpm check`: kit khớp, 40 tệp và 527 phép thử đạt, build xong.

## Kiểm trong game (01/11, tác tử kiểm độc lập)

- **Cách chạy:** `survival-ui-art.mjs` ở 1280×720 và 1920×1080, `pass: true`, không lỗi console. Thêm một lượt riêng đặt bản cũ và bản mới ở cùng một khung.
- **Kỹ thuật:** đạt ở mọi chỗ có icon, gồm tải, cỡ, căn hàng, không cắt, không mờ:
  - Options: 28/42 px;
  - bảng Settings nhanh (F1): 28/42 px;
  - Profile: 32/48 px;
  - dải cảnh báo Rift: 32/48 px, độ tương phản trên chip 3,83:1.
  Màn kết quả không có Steadiness và New-word read: chúng chỉ ở Profile (`src/app/results.ts:77–78`).
- **Điểm cũ → mới** ở 720p 1×: Steadiness 5 → 5,5; New-word read 3,5 → 6; Rift 4,5 → 6,5; Adapt pace 5 → 6; Screen shake 4 → 5,5.
- **Tờ trước/sau:** `tmp/check-247/sheets/` (không vào Git).

## Còn mở
- Steadiness: liếc qua giống biển cảnh báo "!". Nghiêng cần lắc sẽ chữa được.
- Screen shake: hình rộng gấp đôi, fill tính theo cạnh dài, nên phần có hình chỉ cao 14 px trong ô 28 px; hai cung rung rất nhỏ.
- New-word read: chỉ rộng 22/32 px, là khối kem phẳng sáng nhất trong hàng.
- Adapt pace: vòng mũi tên lấn át, nhìn đầu tiên giống icon đồng bộ (sync).
- Cả năm icon là kiểu phẳng ngà–lam, lệch với bộ icon vẽ chi tiết ngà–vàng xung quanh.

- Năm icon vẫn dưới 8. Góp ý của giám khảo vòng 3 nằm trong báo cáo 247, để giao lại (Codex khi có hạn mức):
  - nghiêng cần lắc;
  - thẻ chữ có một ký tự đậm;
  - vết rách tím rộng;
  - vòng mũi tên bằng ngà hoặc vàng;
  - sóng rung dày hơn.
- Khi có bản đạt 8, đổi nguồn và bỏ `provisional`.
