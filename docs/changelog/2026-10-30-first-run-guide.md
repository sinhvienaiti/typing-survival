# Hướng dẫn lần đầu · TS-M1-11, cổng G5

Last Line chọn sẵn Pulse Gun rồi Heat Beam khi người chơi mới mở Loadout
của ải 1, đặt con trỏ lên START để một lần Enter mở thẻ ải. Việc chọn sẵn
chỉ diễn ra một lần trong trang; bỏ chọn hết rồi Esc và quay lại vẫn trống.
Bộ súng đang có giữ nguyên thứ tự, kể cả khi quay về từ thẻ ải.

Hai súng này luôn có nhãn `Recommended` ở ải 1. Người chơi chưa từng bắt đầu
ải và đã chọn đủ súng thấy một dòng dưới START:
`Press Enter to start. Guns fire on their own; type words to load them.`

Trong trận, ô thông báo có thể hiện
`Type a word on a bay to load its gun`. Gợi ý tắt sau hai lần nạp thật;
gõ khi bến đầy không tính. Cảnh báo bàn phím và danh sách từ ngoại tuyến
được ưu tiên trước gợi ý. Gợi ý không hiện ở thẻ ải, lúc tạm dừng hay kết quả.

Bản ghi mới `survival.guide` có dạng `{ "started": boolean, "hint": boolean }`.
Bắt đầu ải ghi `started`, nạp thật hai lần ghi `hint`, mỗi thao tác giữ cờ
còn lại. Người đã qua bất kỳ ải nào được coi là đã xong hướng dẫn. Kho trống
hoặc dữ liệu hỏng bắt đầu với hai cờ false; lỗi ghi kho không chặn chơi.

Trước sửa: `pnpm check` đạt **265 test / 25 file**, kit **61/61**.
31 test mới viết trước mã: **26 đỏ, 5 xanh**; sau sửa **31/31 xanh**.
Sau sửa: **296 test / 26 file**, kit **61/61**, TypeScript và build đạt.
Đột biến bỏ chọn sẵn: **3 đỏ**; bỏ lưu gợi ý: **2 đỏ**; trả mã lại:
**58/58 xanh** gồm test mới, Esc thẻ ải và chữ tiếng Anh.
Luật chơi, ván vàng, 152 mã băm chương và bộ bài `7f073fa2` giữ nguyên.

Kịch bản trình duyệt đã viết, chỉ kiểm cú pháp; Claude kiểm ở 1280 và 1920,
gõ tay hai lần nạp và kiểm tải lại. Chưa kết luận về cảm quan hoặc độ vừa
của chữ trên trình duyệt.
