# 2026-10-24 — Phản biện đặc tả S1

Repo: `games/typing-survival`, nhánh `main`, chưa đẩy. Chỉ có tài liệu, chưa đổi mã.

## Yêu cầu

- Đọc lại [`docs/BUILD_S1.md`](../BUILD_S1.md) (commit `169f271`) như một trưởng thiết kế khó tính.
- Đối chiếu với nguồn nó dẫn: `SURVIVAL_MODE_PLAN.md`, `BUILD_NOTES.md`, `docs/games/BALANCE.md` ở repo cha, và mã hiện tại.
- Đối chiếu với các yêu cầu lâu dài của chủ dự án: vui và không nhàm, chiến thuật có nghĩa, học luôn rõ, chuyển động và hiệu ứng đẹp do AI làm, không ngộp.
- Tự sửa đặc tả cho mọi mục mức cao và vừa.

Lần chạy đầu bị cắt vì hết lượt dùng. Các chỗ sửa của lần đó còn nằm trong cây làm việc, chưa commit. Lần này đã soát lại các chỗ đó, sửa tiếp, rồi commit cả hai lần cùng nhau.

## Mục review đã xử lý

### Lần chạy đầu (soát lại và giữ)

| # | Mức | Vấn đề | Sửa (mục của BUILD_S1) |
|---|---|---|---|
| 1 | cao | Ải 2 dạy cùng lúc Vỏ, Trâu, Đầu Đàn và Săn: hai quái mới và một cơ chế, trái ràng buộc 3 | Trâu ra mắt ở ải 1. Đầu Đàn tính là họ Trâu (§6, §8) |
| 2 | cao | Boss đứng ở z 22, ngoài tầm Xung, Tia, Tán, và chỉ đổi pha theo HP. Bộ súng gần bị kẹt, không thể thắng | Mỗi pha có trần 50 s, hết giờ thì boss "TIẾN LÊN". P3 ở z 8. Trần an toàn 600 s. G6 đo mọi bộ 3 súng (§7.4, §11.4) |
| 3 | cao | "Băng Hoàn hảo xuyên Vỏ": Hoàn hảo cần Nhanh, mà Nhanh so với chính E, nên chỉ ~4–8 % băng đạt. Ẩu còn được nhiều hơn Chậm chắc, nên B4 yếu đi | Đổi thành **Băng Chuẩn xuyên Vỏ** (Vỏ × 0,75). Vỏ của Trâu 4 → 5, để G3 vẫn đạt khi mọi băng đều Chuẩn (§5.1) |
| 4 | cao | Khung học bị thu còn 380 px và lệch khỏi giữa; chữ trên bến còn 26 px | Khung học giữ 420 px ở giữa đáy, chữ trên bến 32 px như S0, bố cục 4 ô (§3, §10) |
| 5 | cao | Ải Nghĩa: k bị kẹp ở 0,75, nên bot Mới không được thưa đi chút nào | Hệ số học ρ nhân ngoài phần kẹp (§7.3, §11.1) |
| 6 | cao | Báo trước Đòn Sập là 3 s × 1/k: người gõ nhanh có ít thời gian hơn, trẻ em không kịp | T tính theo E_eff và độ dài từ chặn, nhân `telegraphScale`; ghi mẫu `telegraph` cho hồ sơ gõ (§7.4) |
| 7 | vừa | G3c chỉ đòi bộ kém nhất thắng ≥ 35 %: chọn sai thành cái bẫy | ≥ 60 %, kém bộ tốt nhất ≤ 30 điểm (§11.4) |
| 8 | vừa | G2 đo bằng tỉ lệ chọn của bot, tức là đo cách bot chấm điểm, không đo game | Đo bằng tỉ lệ thắng của 10 bộ (§11.4) |
| 9 | vừa | `COUNTERS` viết tay theo cảm tính | Cổng G3m đo từng ô. Tách hai hàng bầy (giữa sân, sát vạch), thêm hàng hộ tống boss. Bot chấm súng theo trọng số nguy, không đếm ● (§5.2, §11.2) |
| 10 | vừa | B7 bị nới thành "≥ 8/9 ải" mà chưa hỏi chủ dự án | Trả lại đúng BALANCE §7 (§11.4) |
| 11 | vừa | Bọc Thép áp lên Trâu (480 HP, Vỏ 5) biến bậc `elite` thành một bức tường | Bọc Thép chỉ áp lên toán thường (§6) |
| 12 | vừa | Đóng tab giữa trận thì né được việc mất Lõi | Cờ `inFight` trong bản lưu (§4.1) |
| 13 | vừa | Chưa có trần cho số thứ đòi chú ý cùng lúc | Ngân sách chú ý, ràng buộc 7 của `checkChapter`, test (§7.5, §7.6) |
| 14 | vừa | Chọn súng đầu chương là chọn mù | Dải "Chương này gặp gì" và cửa bảo hiểm (§4.2, §9) |
| 15 | vừa | Thiếu chữ và Nghĩa không có gợi ý, người chơi phải đoán mò | Có gợi ý. Nghĩa chỉ dùng từ đã gặp (`recall` trong đầu trận) và bỏ đề trùng. Chữ ẩn dùng luồng `hide` riêng (§7.3) |
| 16 | vừa | Bot không biết quên, nên số đo ở luật học khó quá đẹp | Bot có xác suất nhớ sai (§11.2) |
| 17 | vừa | Chưa có đặc tả chuyển động do AI làm. Đầu Đàn khó nhận ra giữa đám Trâu | Thêm §12.1. Đầu Đàn to hơn 1,25×, có viền vàng và mũi tên ở mép màn. Số sát thương cho Vỏ dùng kiểu `tick` và `normal` của kit (§6, §12) |

### Lần này

| # | Mức | Vấn đề | Sửa (mục của BUILD_S1) |
|---|---|---|---|
| 18 | cao | Các bước làm và test vẫn ghi luật cũ: §2 và R1 bước 2 ghi "Băng Hoàn hảo xuyên Vỏ", §15 ghi "Hoàn hảo × 0,5". Bảng tin ghi "Vỏ 4 · khắc: Ray, Pháo Sao". Người làm R1 sẽ làm sai luật | Sửa theo §5.1 và `COUNTERS`. Thẻ của bảng tin lấy từ `COUNTERS` (§2, §4.2, §8, §14, §15) |
| 19 | vừa | Mã đặt `MAX_RADIUS` của lưới là 0,8 (`sim/hits.ts`), mà đặc tả ghi "giữ 0,9" và cho Khiên bán kính 0,9. Khiên sẽ lọt khỏi truy vấn của lưới | Khiên có bán kính 0,8; quái to là quái có bán kính > 0,8; thêm `hits.ts` vào bảng file (§6, §13) |
| 20 | vừa | Pháo Sao có tầm gần 8 m (z 9,7), nên nếu tính theo tâm thì không bắn được boss ở P3 (z 8). Điều này trái câu "boss trong tầm của mọi súng" | Luật mới "thân chạm dải tầm", tính cả tầm gần (§5.1, §7.5, §15) |
| 21 | vừa | Bảng khắc chế nháp cho Ray chỉ một ✕, trái ràng buộc của chính bảng. Ray là ● duy nhất với Trâu và Boss, mà G2(a) không bắt được một súng thống trị | Ray ✕ ở hàng bầy sát vạch. Thêm G2(d): không súng nào nằm trong bộ đứng nhất ở quá 6 trong 9 ải. Ghi vào §1.2 chỗ lệch kế hoạch §4.5 (Tia không khắc Trâu) (§1.2, §5.2, §11.4) |
| 22 | vừa | Không nói ải lẻ dùng bộ đồ nào. Ải lẻ là ải chơi lại để lấy sao, và ở R1 là mọi ải | Ải lẻ dùng bộ đồ tham chiếu; súng chọn trước nhận cấp cao hơn (§4.1, §14) |
| 23 | vừa | Bến 190 px không chứa nổi phần đầu bến của S0 (khoảng 220 px). Ô bến 4 hiện chữ "S1B" cho người chơi | Phần đầu bến gọn lại (khoảng 150 px); kịch bản kiểm không tràn; ô bến 4 chỉ có biểu tượng khóa (§10) |
| 24 | vừa | Trần từ của súng nặng là 9 chữ, mà dải E ≥ 60 đã là 6–10. Với người gõ nhanh, từ của súng nặng sẽ ngắn hơn súng nhẹ | Trần 10 chữ (§5.1, §15) |
| 25 | vừa | G3c và G2 ghi "10 bộ 2 súng" cho cả ải 6–9, mà các ải đó có 3 bến | Ải 6–9 tính 10 bộ 3 súng. Bot Kém thêm Tán. Bot Tốt chọn bộ theo số bến (§11.2, §11.4) |
| 26 | thấp | Ngân sách dòng tự mâu thuẫn: `main.ts` 600 dòng, trái luật 480. Tổng trần từng file khoảng 10.700, cao hơn trần chung 9.000 | `main.ts` 480, trần chung 10.000, ghi rõ trần nào là ràng buộc chính (§13, §19) |
| 27 | thấp | Sao chính xác 95 % phạt người đang học. Ải Nghĩa thiếu từ khi `seen` còn ít. Kịch bản `learn` vẫn ghi 22 px. Rủi ro vẫn ghi G3c 35 %. R1 thiếu G3m. Test boss chỉ đổi pha theo HP | Ải học khó: sao ở 90 %. Thiếu từ thì lấy thêm từ dải, kèm gợi ý ngay. Sửa các chỗ còn lại cho khớp (§4.1, §7.3, §14–§16, §19) |

## Kiểm

- Chỉ có tài liệu: không đổi mã, không chạy test, không mở dev server hay Chrome. Chưa đổi luật trong mã, nên chưa chạy `pnpm survival:balance`. Báo cáo cân bằng (§3, B1–B9, G1–G8) bắt đầu ở R1.
- Đã đối chiếu với mã `00ed734`:
  - `content/rules.ts`: Xung 7 sát thương, tầm 10 m; Tia 6, dài 12 m; `QUALITY`; `LENGTH_BY_E`; `NEAR`, `DRAIN`.
  - `content/balance.ts` và `sim/hits.ts` (`MAX_RADIUS` 0,8).
  - `sim/weapons.ts`: mỗi băng giữ chất lượng của từ đã nạp nó, nên có thể làm "Băng Chuẩn".
  - `view/survival.css`: bến 290 px, chữ 32 px, khung học 420 px.
  - Kit `balance/pace.ts`: có `capacity`, `familiarityMix`, `telegraphScale`, `suggestDifficulty`. Kit `feedback/numbers.ts`: có kiểu số `tick`.
- Đã tính lại các số chính:
  - ρ của bot Chuẩn: 0,872 ở Thiếu chữ, 0,792 ở Nghĩa.
  - Báo trước Đòn Sập cho bot Chuẩn, từ chặn 4 chữ: T ≈ 3,86 s.
  - G1 theo phân phối nhị thức âm. Cân bằng: qua chương lần đầu ≈ 80 %, qua không mất Lõi ≈ 14 %. Thử thách: qua lần đầu ≈ 21 %.
  - Sát thương mỗi chữ khi đánh Trâu (Vỏ 5) với băng Chuẩn: Ray ≈ 2,1× Xung.

## Còn lại

- R1 "Súng và khắc chế": BUILD_S1 §14.
- Chủ dự án có thể đổi các mặc định ở §1.2. Mới thêm một mục: Tia không khắc Trâu.
- Bảng `COUNTERS` và các số khởi điểm (Vỏ, HP, nhịp) còn là dự kiến. Bảng phải khớp số đo của G3m, và các số phải qua được cổng G2(d) và G3c.
