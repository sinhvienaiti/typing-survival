# 2026-10-28 — Chỉ cài handle trình duyệt ở dev hoặc khi bật debug

Phiếu 092, TS-M1-20 (P2), cổng G7: bản production mặc định không cài `window.__survival`. Bản dev vẫn có handle; bản build chỉ cài khi query có `debug=1`, chẳng hạn `?card=1&debug=1`.

Hàm thuần `devHandleWanted(dev, search)` trong `src/app/dev.ts` kiểm cờ dev hoặc giá trị `debug` từ `URLSearchParams`. `src/app/main.ts` gọi hàm này trước `installDevHandle`; đối tượng handle, tên hàm, thứ tự và nội dung các lệnh giữ nguyên. Handle vẫn nằm trong bundle để có thể kiểm bản build bằng `?debug=1`.

Thêm đúng chín ca trong `tests/dev-handle.test.ts`: hai ca dev luôn bật; bản production tắt khi thiếu query, bật với `?debug=1` và `?card=1&debug=1`, tắt với `?debug=0`, `?debug=`, `?debug=true`, `?nodebug=1`.

Các kịch bản trình duyệt hiện dùng `DEV_URL` trực tiếp hoặc qua hàm dùng chung, mặc định là dev server. Không sửa kịch bản; khi chạy trên bản build, cần thêm `debug=1` vào query trang được mở. Không chạy dev server hay trình duyệt trong phiếu này; Claude kiểm ba trạng thái trước khi commit.

Kiểm: `pnpm check` trước/sau đều đạt, từ **147** lên **156** test (thêm đúng **9** ca). Hash của **152** lượt chương trước/sau giống nhau, diff rỗng. Đột biến giá trị debug từ `"1"` thành `"0"` làm **3 ca hỏng, 6 ca đạt**; trả lại nguyên byte thì **9/9 ca đạt**. `pnpm build` đạt; chuỗi `__survival` vẫn có trong JavaScript của bản build. Cảnh báo chunk trên 500 kB đã có trước thay đổi.

Báo cáo và log kiểm ở repo cha: `docs/codex-queue/092-report.md`, `docs/codex-queue/092/`.
