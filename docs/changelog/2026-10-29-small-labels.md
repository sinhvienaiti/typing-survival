# Ba nhãn nhỏ · Phiếu 104

Thực hiện ngày 28/10/2026, sau phiếu 090 và 092, trên worktree `games/.wt-ts-codex`.

- Bến 3 khóa hiện cùng biểu tượng khóa như bến 4. Bỏ lời hứa mở ở Mốc vì R1 chưa có cơ chế này; cập nhật chú thích HUD.
- Viết lại hai phần Luật học thành câu ngắn, thay thuật ngữ IPA bằng “phiên âm”, giữ hướng dẫn về chữ ẩn và vị trí từ/nghĩa. Tám câu dài lần lượt 13/4/6/8 từ (Thiếu chữ), 6/9/8/9 từ (Chuẩn), tối đa 13 trên giới hạn 14.
- Đổi duy nhất `name` của ải 2 thành “Săn Pack Leader”. Hành trình dùng tên thường; trang giới thiệu ải, thẻ trước trận, banner vào trận và thẻ kết dùng tên viết hoa.
- Viết hoa toàn bộ biển đếm Pack Leader, biển/banner Swarm rút lui và bốn thẻ MỚI trong HUD. Chỉ cập nhật chuỗi so khớp của `huntPlateCounts`, giữ kịch bản.
- Thêm ba ca kiểm tra HTML Luật học và tên ải 2, chạy đỏ trước khi sửa mã: 3/3 hỏng; sau sửa: 3/3 đạt.

`pnpm check`: trước 156/156 ca trong 16 file; sau 159/159 ca trong 17 file, kit 59/59 file khớp, typecheck và build đạt. Băm chương trước/sau đều 152 dòng, diff 0 byte, cùng SHA-256 `ae7e9859269b2aece6a7bacbd946dfa93b9a131aeb68a5f5dbed97830dfe626e`. Hai lệnh tìm chuỗi cũ đều trả 0 dòng. Không sửa sim, luật, số, thứ tự ải, kit hay golden.

**Chưa hoàn tất Esc:** nhánh nhận Esc của thẻ trước trận nằm ở `src/app/main.ts`, ngoài danh sách được ghi của phiếu. Đã hỏi chủ dự án cho phép sửa tối thiểu file này; chưa có chấp thuận nên giữ nguyên. `screens.ts` chỉ dựng HTML, không sở hữu điều hướng. Bộ test hiện chạy Node, không có bộ DOM cho màn này. Claude cần xử lý nhánh Esc và kiểm bằng `survival-s1-loadout`, gồm bộ súng được giữ khi quay lại.

Không chạy dev server hay trình duyệt theo giới hạn phiếu. Claude cần kiểm thẻ ải 1/2, nạp súng, bến khóa, mục tiêu ải 2 và bốn thẻ MỚI ở 1280×720, 1920×1080; chữ viết hoa dài hơn chưa được xác nhận không tràn. Báo cáo và bằng chứng ở repo cha: `docs/codex-queue/104-report.md`, `docs/codex-queue/104/`.
