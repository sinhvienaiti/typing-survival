# Last Line · Kế hoạch "sống": bảng phủ và gói việc (01/11/2026, tối)

> **Dành cho:** điều phối, các AI làm gói, giám khảo, chủ dự án.
> **Vì sao có file này:** chủ dự án dừng mọi game khác để dồn 100 % vào Last Line (lời ở §1.1). Sáu bản soát chỉ đọc cho thấy gần như không gì ngoài phím gõ có chuyển động, hiệu ứng và tiếng thật. File này gom sáu bản soát thành một bảng phủ (§2), chia việc thành gói (§3) và xếp gói thành đợt chạy song song (§4).
> **Nguồn:** sáu bản soát ngày 01/11 trên snapshot `ts-wave1` `99a0c50`. Mã giống `main` `1679ea6`, chỉ khác `media.md5`. Bản build production, không cờ URL, phím thật, 1280×720 và 1920×1080.
> - **S:** màn ngoài trận.
> - **H:** HUD và gõ.
> - **C:** trận (súng, tàu, quái, rung, dừng hình, camera).
> - **W:** thế giới.
> - **A:** âm và nhạc.
> - **E:** đặc tả juice đo từ `typing_break.mov`, có ý kiến thứ hai của ChatGPT đã kiểm.
>
> **Bằng chứng:** `E:` là `/Users/toandx/htdocs/typing-game/games/.wt-ts-audit/tmp/audit/`. Ở đó có tờ khung, ảnh tĩnh và số đo JSON (99 MB); ảnh thô đã xóa. Mã nguồn trong bảng (S18, H06, C21, W14, A41, E3) là số dòng trong báo cáo của từng bản soát (kết quả workflow `wf_5aafed55-2ee`). Ba bản soát S, H, C còn có `findings.json` trong `E:oob/`, `E:hud/`, `E:combat/`; số đo của W và A nằm ở các JSON trong `E:world/` và `E:sound/`.
> **Thứ tự ưu tiên:**
> 1. mã hiện tại;
> 2. `AGENTS.md` và luật chủ dự án;
> 3. file này. File này thay `docs/games/QUALITY_RESCUE_2026-11-01.md` §3 đợt 2 (L5, L6, L8, L9, L10 gộp vào AL-06 và AL-08);
> 4. `docs/FEEL_PASS_S1.md` và `docs/games/maps/typing-survival-MAP_CONCEPTS.md` (concept vẫn là đích hình của thế giới).
>
> **Quy ước:**
> - px tính ở 1280×720 (1080p nhân 1,5).
> - f là một khung 60 Hz (16,7 ms).
> - [M] là số đo từ video Typing Break.
> - [H] là giá trị khởi điểm, chỉnh trong host chơi.
> - Tên mà người chơi đọc và danh từ game viết bằng tiếng Anh, theo `AGENTS.md`.
>
> **Trạng thái:** bản kế hoạch, chưa commit. Đã soát đủ (01/11, khuya): mọi loại sự kiện và mọi màn trong mã có dòng (§2.16), bảng giữ tệp không còn hai gói cùng đợt sửa một tệp (§4.2), phụ thuộc heroine và drone ở §4.3.

## 0. Tóm tắt

- **Bảng phủ:** 152 dòng: **P0 64, P1 73, P2 15**. Mọi dòng đều có đích và có gói. §2.16 đối chiếu từng loại sự kiện và từng màn trong mã với các dòng.
- **18 gói**, AL-00 đến AL-17. Gói P0 làm trước, và trong mỗi gói dòng P0 làm trước (§3).
- **Đợt:** đợt 0 là nền, đợt 1–5 chạy hai hay ba gói song song trên các tệp khác nhau, cuối cùng là nghiệm thu (§4):

  | Đợt | Gói |
  |---|---|
  | 0 | AL-00, AL-03 |
  | 1 | AL-01, AL-02, AL-05 |
  | 2 | AL-06, AL-08, AL-10 |
  | 3 | AL-07, AL-09, AL-12 |
  | 4 | AL-11, AL-13, AL-04 |
  | 5 | AL-14, AL-16, AL-15 |
  | cuối | AL-17 |

- **Sáu chỗ hở lớn nhất:**
  1. **Âm:** 0 file âm game. 96,5 % âm phát trong trận là âm tổng hợp bằng mã.
  2. **Chuyển màn:** mọi lần đổi màn là cắt cứng 1 khung, và ba lối vào trận tải lại cả trang.
  3. **Màn tĩnh:** title, kết quả và mọi menu đứng yên khi nghỉ (0 cặp khung đổi).
  4. **Súng:** năm súng dùng chung 8 sprite vẽ bằng mã. Chữ bay qua bầy che khung phát của súng.
  5. **Quái:** quái chỉ có clip idle, không ra đòn, và chết thành khối xám làm bằng mã.
  6. **Thế giới:** dựng bằng mã và không phản ứng với sự kiện nào (surge, thắng, thua đều như lúc nghỉ).
- **Heroine và drone:** mọi gói từ đợt 1 gọi giao diện `Pilot`, không gọi `Ship`; AL-15 chỉ thay phần cài đặt. Đường lùi khi model trễ ở §4.3.
- **Quyết định cần chủ dự án:** 7 câu ngắn (§5), cộng hai việc tay đang chờ.

## 1. Lời chủ dự án và mức nhận

### 1.1 Lời chủ dự án (01/11/2026, tối)

> "tạm thời dừng toàn bộ các phần game khác, tập trung 100% vào Last Line cho tôi, tôi muốn 1 game này được xử lý thật đẹp, từng chi tiết, mỗi action đều có hiệu ứng, có hiển thị, có cảm giác sống động, tôi không muốn bất kỳ một cái gì hiển thị chỉ đơ ra như mọi loại hiển thị cơ bản khác"

Các luật trước đó vẫn giữ:

- Hình phải cuốn hút, có gu, sang, thời trang, hiện đại. Đúng nhưng trơn, đơn giản hay chung chung thì trượt.
- Mọi chi tiết UI mang art thật. Không có hình vẽ bằng mã thay art: không SVG hay canvas làm cảnh, không icon dựng bằng CSS, không emoji.
- Âm là file thật làm qua `docs/games/AUDIO_PIPELINE.md`, không âm tổng hợp giữ chỗ.
- Mỗi sự kiện có cả VFX lẫn SFX: bảng phủ ở §2 chính là bảng đó cho Last Line.
- Mốc juice là `typing_break.mov`: mỗi phím là một cú bắn thấy được (bloom và tia lửa), mỗi chữ gõ đập vào to kèm một vụ bùng, quái vỡ thành mảnh bay.

### 1.2 Mức nhận

- **Đạt** khi hai giám khảo mù độc lập cùng chấm từ 8,5 trở lên. Chấm trong host chơi bản build, ở cài đặt của người chơi (mặc định High), không cờ URL, ở 1280×720 và 1920×1080. Áp cho art, model, map, VFX, UI và âm, 2D lẫn 3D.
- **Hệ dùng chung cần 9**, hai giám khảo cùng ≥ 9, không hạng mục con nào dưới 8,5, chủ dự án ký cuối (`docs/games/SHARED_SYSTEMS_BAR.md`). Trong Last Line gồm:
  - hiệu ứng gõ chữ (AL-05);
  - tiếng phím (AL-03, M052);
  - animation nhân vật (AL-15) và chuyển động đám đông quái (AL-09).
- **Không có đạt tạm.** Không "tốt nhất trong 3 lần", không "tốt hơn trước". Món đã gắn mà dưới mức là nợ trong sổ `QUALITY_RESCUE_2026-11-01.md` §6.
- Giám khảo chấm mức thị trường và độ cuốn hút so với bảng tham chiếu thương mại, không so với bản cũ của ta.

### 1.3 Cổng "sống" đo được

Các cổng dưới đây biến lời "không gì đơ ra" thành số. AL-00 dựng kịch bản đo; mọi gói dùng chung.

| Cổng | Luật | Hôm nay |
|---|---|---|
| G1 · Màn không đứng im | Màn ngoài trận khi nghỉ: ít nhất một nửa số cặp khung trong 1,5 s có đổi thấy được, nghĩa là ≥ 0,5 mức xám trung bình ở một vùng chiếm ≥ 10 % màn [H] | title, kết quả, menu: 0/22 cặp |
| G2 · Không cắt cứng | Đổi màn, mở hay đóng bảng có ≥ 8 khung trung gian. Không cặp khung nào đổi > 35 % pixel [H], trừ khung lóe có chủ đích. Bản giảm chuyển động hòa 150 ms | mọi đổi màn là 1 khung |
| G3 · Thế giới thở | Khi nghỉ, mỗi vùng bên ≥ 3 mức xám/s; cứ 6–10 s có một việc đáng chú ý; làn giữa vẫn sạch | 1,4–4,2 ở vùng bên, sàn gần 0,07–0,11 |
| G4 · Sự kiện đủ hình và tiếng | Mỗi dòng của §2 có VFX và SFX. Khung đầu ≥ 95 % đỉnh. Âm bắt đầu trong chính handler của sự kiện. Phím tới hình ≤ 1 khung (p95 ≤ 18 ms). Phím tới đạn ≤ 50 ms (≤ 70 ms khi đang dừng hình) | nhiều sự kiện không có tiếng hay hình (§2) |
| G5 · Chữ vẫn đọc rõ nhất | Tương phản chữ ≥ 7:1 (đo ở pixel nền p99). Không gì vẽ đè chữ chưa gõ. Trắng xóa ≤ 6 % pixel làn ở luma ≥ 0,95. Lóe toàn màn ≤ 2 lần/s. Không nháy đỏ | 7,40–7,49 sát sàn |
| G6 · Art và âm thật | Không hình vẽ bằng mã thay art (shader và VFX đạt chuẩn thì được). Không âm tổng hợp giữ chỗ | 0 file âm game; dải chữ, Line, sọc, nền trời đều vẽ bằng mã |
| G7 · Hiệu năng | `docs/FEEL_PASS_S1.md` §6 và `survival-s1-perf`: đỉnh trung bình ≤ 6 ms, đỉnh p95 ≤ 10 ms, lũ p95 ≤ 14 ms ở 1280×720 dpr 2 High; khoảng khung p95 ≤ 16,8 ms, lỡ nhịp ≤ 1 %. Câu Q6 hỏi về cổng này | 5,0–5,3 ms và 12,0–13,1 ms: còn khoảng 0,7 ms |
| G8 · Giảm chuyển động | Mỗi lớp khai giữ, làm dịu hay bỏ (VFX_STANDARD §3.8), qua `motionReduced()` (`src/app/motion.ts`). Chụp cả bản giảm | có ở phần gõ, thiếu ở phần mới |
| G9 · Chấm | §1.2 | — |

### 1.4 Không đổi, và giới hạn khi học Typing Break

- **Không đổi:** sim, content, ván vàng `s0-trace`, hash 152 lượt chương, cân bằng. Mọi việc ở đây là hình, tiếng và DOM.
  - AL-01 dựng lại thế giới tại chỗ bằng đúng đường tạo `World` hiện nay; hash không đổi.
  - Splitter, Shard và boss chỉ được đặc tả, không thêm vào stage (AL-16).
- **Học nguyên lý của Typing Break, không chép hình.** `SURVIVAL_MODE_PLAN.md` §9 và `FEEL_PASS_S1.md` §1.3 vẫn giữ.
  - Lấy từ Typing Break: thứ tự lớp (trắng, rồi tối, rồi màu, rồi dấu vết), khoảng cỡ phóng, độ dài tính bằng khung, cách nén từ khi đổi.
  - Hình là của ta: vòng glyph, mảnh tinh thể, màu súng và màu phe của ta.
  - Không dùng sao mực, vệt cọ hồng, kiểu chữ hay tên của họ.
  - Không lóe trắng cả làn như họ (luật trắng xóa ≤ 6 %). Không trễ 150–166 ms từ xong từ tới phát súng (ta giữ ≤ 50 ms).
- **Màu dành cho tín hiệu** (concept §1.6):
  - Tím là của bầy quái.
  - Đỏ chỉ cho đòn của quái.
  - Vàng chỉ cho Pack Leader; quanh làn, mọi vàng khác giữ thấp.
  - Ngà là nhóm nhân vật và đá sáng.
  - Cyan là heroine, drone, Line, Pulse Gun.
  - Cam là Heat Beam.
  - Ở HUD được dùng vàng cho plate thắng và bậc combo "gold", vì chúng không nằm trong làn.
- **Mâu thuẫn giữa các bản soát, đã chốt:**
  - **Mảnh vỡ:** bản soát trận muốn mảnh mờ sau 2–3 s; đặc tả juice muốn mảnh nằm lại. Chốt: mảnh nhỏ mờ sau 2–3 s; mảnh lớn, vết xém và vết mực nằm 6–8 s (vết xém trên sàn 30 s ở AL-10); tối đa 40 mảnh trên làn.
  - **Rung:** giữ trần của FEEL §6 (p95 ≤ 3 px, tối đa ≤ 8 px ở 1080p). Nâng mức cộng theo Eiserloh để sự kiện lớn thật sự rung, nhưng vẫn dưới trần.
  - **Hướng âm:** `AUDIO_PIPELINE.md` §8.3 còn tả âm "thép hành lang" của hướng A. Hướng B (Lightbearer: vòng glyph, tinh thể, kính) thắng, vì chủ dự án chọn B ngày 29/10. AL-03 sửa §8.3.
  - **Đích concept:** tranh try2 lệch bảng giá trị của chính concept. Tài liệu thắng, và vẽ lại try3 (M129).

### 1.5 Gộp và "đạt"

- **Gộp vào `main`** khi review nói gộp được, không lùi ở bất kỳ cổng nào của §1.3, và `pnpm check`, trace, hash đều đạt.
- **"Đạt"** chỉ khi qua §1.2. Gói đã gộp mà chưa đạt thì ghi nợ vào `QUALITY_RESCUE_2026-11-01.md` §6, không gọi là xong.
- **Media** (ảnh, model, âm, flipbook) phải đạt 8,5 (tiếng phím 9) **trước khi gắn**. Trong lúc chờ:
  - âm tổng hợp hiện có giữ chỗ và được ghi là nợ trong `src/view/coverage/`;
  - hình vẽ bằng mã hiện có giữ nguyên, không thêm hình vẽ bằng mã mới.

## 2. Bảng phủ

### 2.0 Cách đọc

**Các cột:**

- **#:** số dòng. Gói và changelog gọi dòng theo số này.
- **Nguồn:** số dòng ở các bản soát (S, H, C, W, A, E ở đầu file). QR là `QUALITY_RESCUE`.
- **Art:**
  - thật: tranh hay model thật;
  - mã: vẽ bằng mã thay art;
  - thiếu: chưa có;
  - một phần;
  - —: không cần art riêng.
- **V N H T R:** năm chỗ chuyển động: vào, nghỉ, hover hay nhấn, trúng hay đổi trạng thái, ra. Mỗi chỗ một ký hiệu: c (có đủ), y (yếu), k (không có), - (không áp dụng).
- **VFX:** c, y, k hoặc —.
- **SFX:** file, mã (tổng hợp), không, hoặc —.
- **Hiện tại:** những gì đang thấy, kèm đường dẫn khung dưới `E:`.
- **Đích:** một dòng.
- **Sev:**
  - P0: người chơi thấy suốt;
  - P1: thấy thường xuyên;
  - P2: thấy ít.
- **Gói:** gói việc ở §3.

Dòng gộp nhiều bản soát lấy mức nặng nhất trong các nguồn.

### 2.1 Luồng, tải, chuyển màn

| # | Phần tử / sự kiện | Nguồn | Art | V N H T R | VFX | SFX | Hiện tại (khung dưới `E:`) | Đích | Sev | Gói |
|---|---|---|---|---|---|---|---|---|---|---|
| M001 | Khởi động, màn tải | S21 | thiếu | k k - - k | k | không | Đen, rồi chữ xám "LAST LINE · loading…", rồi 1 khung cảnh 3D trần với menu không ảnh, rồi title bật (316→367 ms). `oob/sheets/sheet-720-screencast-boot-first-540ms.jpg` | Loader có logo trên tranh hố đen, vòng tiến độ theo tải thật; chờ ảnh title decode xong rồi hòa vào title trong 20–30 f | P1 | AL-01 |
| M002 | Host màn hình (mọi màn ngoài trận) | S2 | — | k - k - k | k | mã | Mỗi phím dựng lại cả overlay (`drawScreen()` gán `hud.overlay.innerHTML`, `main.ts` ~456); icon bật trễ 1 khung (167→183 ms). `oob/sheets/sheet-720-screencast-title-to-options-cut.jpg` | Một host giữ DOM, chỉ đổi phần đổi. Đổi màn 12–18 f: màn cũ trượt 24 px và mờ, nền hòa, màn mới 0,96→1 với vệt sáng dọc khung; whoosh (file) | P0 | AL-01 |
| M003 | START ở Loadout → vào stage | S1, A33, A3 | thiếu | k - - - k | k | không (nhạc tắt) | Tải lại cả trang: đen ~150 ms, thẻ stage với dải ảnh trống "LOADING…", ảnh hiện ~275 ms, lời nhắc ~490 ms; nhạc chạy lại từ ô nhịp 1; thẻ im 7 s. `oob/sheets/720r/sheet-720r-r-start-reload-first700.jpg` | Không tải lại: dựng thế giới tại chỗ. Phóng 0,6–1 s: loadout gập thành dải bay (ease-in 12 f), camera lao vào làn (dùng lại cú quét 0,9 s của Trial). Nhạc nối tiếp, có riser (file) | P0 | AL-01 |
| M004 | Retry, Main menu ở màn kết quả | S1 | thiếu | k - - - k | k | không | Cũng tải lại cả trang. `oob/sheets/720r/sheet-720r-retry-reload-first700.jpg`, `oob/sheets/1080/sheet-1080-42-win-to-menu-reload.jpg` | Dựng lại tại chỗ. Retry: thẻ gập, camera về dais 0,6 s. Main menu: hòa về title, nhạc nối | P0 | AL-01 |
| M005 | Done ở Options sau khi đổi tàu hay đồ họa | S (mục thắng 1) | — | k - - - k | k | không | Tải lại trang (đọc mã `main.ts` `reload()`) | Áp dụng tại chỗ; đổi bậc đồ họa thì dựng lại renderer sau màn che 0,4 s có logo | P1 | AL-01 |
| M006 | Ảnh bật trễ ở mọi màn | S2, S13, S21 | thật | k - - - - | — | — | Icon và tranh hiện 60–130 ms sau khi cắt; máy bận thì > 1,5 s. `oob/compare-stills/720-briefing-art-late-loadrun.jpg` | Decode ảnh trước (`img.decode()`); màn chỉ vào khi ảnh của nó đã sẵn | P1 | AL-01 |
| M007 | Độ nét tranh ở 1080p | S25 | thật (rộng 1536 px) | — | — | — | Phóng 1,25× ở 1920, hơi mềm. `oob/sheets/compare-1080-upscale-crops.jpg` | Bản 1920 và 2560 px cho mọi tranh nền | P2 | AL-12 |

### 2.2 Title, menu, cài đặt

| # | Phần tử / sự kiện | Nguồn | Art | V N H T R | VFX | SFX | Hiện tại (khung dưới `E:`) | Đích | Sev | Gói |
|---|---|---|---|---|---|---|---|---|---|---|
| M008 | Key art title (heroine, hai drone, hố đen) | S3, W22 | thật | k k - - k | k | không | 0/22 cặp khung đổi khi nghỉ. `oob/sheets/720/sheet-720-02-title-idle.jpg` | 3–5 lớp parallax (trôi 2–4 px, sin 6–8 s); shader cho đĩa bồi tụ quay (vòng 20–40 s); 30–60 tàn lửa và mảnh vụn; áo choàng lay; drone nhún ±4 px trong 2,4 s, lệch pha, mắt cyan nhịp | P0 | AL-12 |
| M009 | Logo | S3 | thật | k k - - k | k | không | Tĩnh, không có màn vào. `oob/compare-stills/720-title.jpg` | Vào 18 f (ease-out-back, blur 8→0), vệt sáng quét mỗi 6–8 s; sting ở phím đầu (M013) | P0 | AL-12 |
| M010 | Hàng menu title: focus, hover, nhấn | S5, A34, E13 | thật (khung, icon) | k k y - k | k | mã (tick 10 ms, ~−41 dBFS) | Đổi đúng 1 khung; hàng nào cũng có dòng phụ; "Resume" mờ vẫn hiện ở lần chơi đầu. `oob/sheets/720/sheet-720-03-title-select-before-after.jpg` | Thanh focus trượt 120–160 ms, cubic-bezier(.2,.8,.2,1), mép sáng quét. Hàng nhích 6–8 px, icon thở 1,2 s; chỉ hàng focus hiện dòng phụ. Nhấn: 0,965 (2 f) → 1,015 (f5) → 1 (f8), chùm tia 6 f. Hàng vào lệch nhau 40 ms. Hover, select, back, deny là file, 2–3 biến thể | P0 | AL-12 |
| M011 | Giá trị "Mode", gợi ý Esc | S6 | — | k - - - - | k | mã | Giá trị đổi trong 1 khung; gợi ý nói Esc quay lại nhưng Esc không làm gì ở title. `oob/sheets/720/sheet-720-06-title-mode-right.jpg` | Giá trị trượt ra rồi vào 8 f, mũi tên lóe; bỏ gợi ý Esc hoặc cho Esc một việc | P2 | AL-12 |
| M012 | Lời hứa của title, dòng "SHIP VANGUARD" | S4, C14 | — | — | — | — | Title và màn thua vẽ nữ xạ thủ, nhưng trận lái tàu Vanguard. `oob/compare-stills/720-title.jpg` | Heroine và drone vào trận (AL-15); dòng trạng thái đổi theo tên nhân vật | P1 | AL-15 |
| M013 | Âm title: sting, theme, nền | A1, S22 | — | — | — | không | Im lặng tới phím đầu. `sound/sheet-sound-events-1280x720.jpg` (title-idle) | Phím đầu: logo sting 2–3 s (crystal swell, sub đúng khung lóe logo). Theme 60–90 s lặp (stems). Nền hố đen ~−30 LUFS | P0 | AL-04 |
| M014 | Thoát về portal | S24 | thiếu | — | — | — | Không có mục này (đọc mã `src/app/portal.ts`) | "Exit to portal" ở title và pause, icon portal thật, chuyển cảnh hòa | P2 | AL-12 |
| M015 | Màn Options | S7 | một phần (đồng hồ âm lượng 10 ô CSS) | k k k - k | k | mã | 9 hàng chữ trên hành lang 3D trần; trùng bảng nhanh dưới tên khác ("Graphics" và "Quality (next run)"). `oob/compare-stills/720-options.jpg` | Gộp vào bảng của kit (một hệ cài đặt), hoặc nền console vẽ. Vạch chạy tới giá trị mới trong 8 f, đèn sáng lần lượt, mỗi đèn một tick (file) | P1 | AL-12 |
| M016 | Armory · Learning | S8 | thật (tranh súng 96 px) | k k k - k | k | mã | Hai cột thẻ chữ trên hành lang trần. `oob/compare-stills/720-armory.jpg` | Tủ trưng súng: model xoay hoặc vòng bắn với VFX riêng; chỉ số thành thanh; focus thì súng nạp, có tia và tiếng súng thật | P1 | AL-12 |
| M017 | Typing Profile | S9 | thật | k k - - k | k | mã | 4 ô tĩnh, lần đầu đều ghi "default". `oob/compare-stills/720-profile.jpg` | Số đếm lên 24 f; đường tốc độ tự vẽ (nét là dữ liệu, đặt trên khung đồ thị art thật; không lưới hay trục vẽ bằng CSS); huy hiệu hạng (art thật) | P2 | AL-12 |
| M018 | Bảng nhanh Settings (bánh răng) | S10, A36 | thật (skin kit) | k k y - k | k | không (di chuyển, đóng) | Mở và đóng trong 1 khung; hover bánh răng chỉ sáng lên. `oob/sheets/720/sheet-720-16-gear-open.jpg` | 0,95→1 và mờ vào 10 f, blur nền tăng dần; focus trượt giữa các hàng; mở, đóng, di chuyển có file | P1 | AL-14 |
| M019 | Bảng nhanh Sound (loa) | S10, A36 | thật | k k y - k | k | không | Như M018. `oob/compare-stills/720-quick-sound.jpg` | Như M018, thêm đồng hồ mức chạy khi nghe thử | P1 | AL-14 |
| M020 | Ô xem trước hiệu ứng gõ | S10 | — | - y - - - | y | file (phím) | ~85 % ô trống, chữ nhỏ lặp giữa ô. `oob/compare-stills/720-quick-settings.jpg` | Chữ xem trước lớn gấp ~3, lấp đầy ô | P1 | AL-14 |
| M021 | Đếm 3-2-1 sau bảng nhanh | S11, A36, E14 | thiếu (chữ trắng) | k - - - k | k | không | Số trắng trơn ở giữa phía trên. `oob/sheets/720/sheet-720-37-fight-qs-close-countdown.jpg` | Mỗi số đập 2→1 trong 3 f trên tấm art, vòng art cạn dần (mask trên art, không conic-gradient CSS); "GO" bùng, vệt quét dọc làn; tick và go (file) | P1 | AL-14 |
| M022 | Tooltip | S23 | thiếu (tooltip của trình duyệt) | k - - - - | k | không | `title` của trình duyệt trên chip quái ở Loadout và chip đe dọa (đọc mã `screens-journey.ts:65`, `:134`) | Tấm tooltip trên art word-plate, mờ vào 6 f, mở được bằng bàn phím | P2 | AL-13 |
| M023 | Âm UI chung: move, select, back, deny | S22, A34 | — | — | — | mã (move ~−41 dBFS) | Move không nghe được; select và back dài 54 ms, ~−23 dBFS. `sound/offline-renders.json` | Glass tick 20–40 ms (6 biến thể, ~−28 dBFS), crystal lock 120 ms, back rơi mềm, deny trầm | P0 | AL-03 |
| M024 | Nhạc menu | A2 | — | — | — | mã (pad ~−33,5 LUFS, 89 % dưới 120 Hz) | Một pad tổng hợp cho mọi màn. `sound/mix-campaign-1280x720.json` | Stems −16 LUFS: theme title, biến thể cho hành trình và briefing, lớp "armory" ở Loadout; hòa 0,8–1,2 s khi đổi màn | P0 | AL-04 |
| M025 | Pause, kể cả tự dừng khi cửa sổ mất focus | S17, A36; đọc mã `src/app/input.ts:81` `installAutoPause`, `main.ts:781` | thật (khung) | k - y - k | k | mã (Esc không có tiếng) | Màn che tối và bảng 3 hàng, mở và đóng trong 1 khung. Đổi tab hay cửa sổ mất focus cũng mở Pause như vậy, không nói vì sao. `oob/sheets/720/sheet-720-33-pause-open.jpg` | Thời gian chậm dần tới dừng trong 8 f, màu rút, blur tăng, bảng trượt vào; nhạc low-pass về 800 Hz; whoosh (file). Tự dừng: cùng chuyển cảnh, thêm dòng "Paused · window lost focus"; quay lại thì không tự chạy tiếp | P1 | AL-12 |
| M152 | Điều khiển trong bảng nhanh: slider, toggle, lựa chọn, Mute, Listen, Resume, Quit to title | S10; đọc mã `src/kit/ui/quick-settings/rows.ts:64-108` | thật (skin kit) | - - y y - | k | không (trừ tiếng nghe thử) | Vạch fill nhảy tới giá trị mới trong 1 khung; toggle và Mute đổi icon trong 1 khung; danh sách bộ phím ghi "Loading…" bằng chữ trơn; Quit to title cắt cứng | Fill chạy tới giá trị trong 6 f, đầu vạch có ánh; mỗi nấc 10 % một tick cao dần (file `ui.value`). Toggle trượt 8 f có tiếng chốt (file `ui.toggle`). Mute: loa hòa sang art loa tắt trong 6 f, hàng mờ dần, loa ở góc HUD đổi cùng khung (file `ui.mute`). Lựa chọn trượt ra vào 8 f. "Loading…" thành vòng chờ art nhỏ. Resume vào đếm M021; Quit to title đi qua host M002 | P1 | AL-14 |

### 2.3 Hành trình

| # | Phần tử / sự kiện | Nguồn | Art | V N H T R | VFX | SFX | Hiện tại (khung dưới `E:`) | Đích | Sev | Gói |
|---|---|---|---|---|---|---|---|---|---|---|
| M026 | Danh sách stage (Campaign) | S12 | thật (nền, thumbnail 96×54) | k k k - k | k | mã | Bốn hàng tĩnh; menu bỏ qua stage khóa nên không xem trước được. `oob/compare-stills/720-stages.jpg` | Bản đồ chương: nút dọc causeway trong tranh, đường sáng tới nút hiện tại (nhịp), nút khóa có xích và bóng hình | P0 | AL-13 |
| M027 | Mở khóa stage sau khi thắng | S12 | thiếu | — | k | không | Không có khoảnh khắc mở khóa | Xích vỡ, nút sáng lên trong 30 f, có tiếng (file) | P1 | AL-13 |
| M028 | Briefing | S13 | thật (tranh hangar, banner 760×120) | k k - - k | k | mã | ~90 chữ luật và các hàng quái. `oob/compare-stills/720-briefing.jpg` | Banner pan 1,02→1,06 trong 8 s; luật thành chip một dòng có icon; các hàng vào lệch nhịp | P1 | AL-13 |
| M029 | Quái mới trong briefing | S13 | một phần (icon nhỏ) | k - - - - | k | không | Quái mới chỉ là một hàng chữ. `oob/sheets/720/sheet-720-23-briefing-cut.jpg` | Chân dung lớn hoặc model xoay, dấu "NEW THREAT" 12 f có overshoot, sting báo động (file) | P1 | AL-13 |
| M030 | Thẻ súng ở Loadout: focus, chọn, bỏ | S14, A35 | thật | k k y - k | k | mã | Chọn đổi trong 1 khung (thẻ bay, glow, header lệch ~4 px). `oob/sheets/720/sheet-720-26-pick-crop.jpg` | Tranh súng bay vào ổ trong 14–18 f, lóe khóa, tiếng riêng của súng (−12 dB) và tiếng chốt; thẻ focus nhấc 6 px, viền sáng chạy; khi nghỉ, nòng súng thở sáng | P0 | AL-13 |
| M031 | Chọn súng thứ ba khi hai ổ đã đầy | S14 | — | - - k - - | k | mã (thump trầm) | Không có thông báo; focus nhảy sang START. `oob/sheets/720/sheet-720-27-loadout-full-3.jpg` | Thẻ rung ±6 px trong 6 f, dải ổ lóe đỏ, toast "Bays full · unpick one", deny (file) | P0 | AL-13 |
| M032 | Cặp gợi ý lần đầu báo "START · UNCOVERED" | S14 | — | — | — | — | Cảnh báo sai trên cặp súng gợi ý. `oob/compare-stills/720-loadout-first.jpg` | Sửa điều kiện: cặp gợi ý không bao giờ báo thiếu | P0 | AL-13 |
| M033 | Thẻ stage trước trận | S15, W21, A33 | thật | y k - - k | k | không | "PRESS ANY KEY TO PLAY" nháy cứng. `oob/compare-stills/720-intro.jpg` | Thẻ trượt lên và mờ vào 12 f, tranh pan, hai súng sáng lần lượt trong ổ; lời nhắc thở (độ mờ 0,6–1, chu kỳ 1,6 s); nền âm chạy ngay, có swell "deploy" (file) | P0 | AL-11 |
| M034 | Từ thẻ stage vào trận | S15, W21, E14 | — | k - - - k | k | mã (ui.select) | Phím cắt sang trận trong 1 khung (33 ms); camera đã ở tư thế trận. `oob/sheets/720r/sheet-720r-intro-to-fight.jpg`, `world/sheets/s1-enter-1280.jpg` | Thẻ zoom vào làn 10 f. Camera quét 2,5 s từ vai heroine tới mốc của stage, ease cubic về tư thế trận; phím nào cũng bỏ qua được, giảm chuyển động thì cắt thẳng. Line sáng trong 6 f (lóe trắng rồi cyan), đèn lan từ heroine tới cổng 0,6 s. Tên stage đập lớn 0,4 s, rồi GO. Whoosh và tiếng trạm khởi động (file) | P0 | AL-11 |
| M035 | Vào Trial từ title | S16 | mã (cầu và vòng phẳng) | k - - - k | k | mã | Cắt cứng sang hố đen 3D trần, quét camera 0,9 s, không thẻ, không banner. `oob/sheets/720/sheet-720-43-trial-start.jpg` | Hòa cảnh với khung hình khớp; hố đen 3D khớp tranh (shader đĩa của AL-10); "HOLD THE LINE!" đập vào | P1 | AL-11 |

### 2.4 Kết trận và kết quả

| # | Phần tử / sự kiện | Nguồn | Art | V N H T R | VFX | SFX | Hiện tại (khung dưới `E:`) | Đích | Sev | Gói |
|---|---|---|---|---|---|---|---|---|---|---|
| M036 | Kết trận thắng | S18, H17, C13, W19, A32 | thật (banner) | y - - - k | k | mã (end.win) | "STAGE CLEAR!" trên sân đóng băng ~0,9 s (tia đạn dừng giữa không trung, quái còn đứng), rồi cắt sang thẻ. `oob/sheets/720/sheet-720-38-win-cut.jpg`, `world/sheets/s1-end-1280.jpg` | Nhịp 1,5–2 s trước thẻ: chậm 0,3× trong 20 f; quái còn lại vỡ lần lượt (gân tắt 0,4 s, mảnh bay); súng nguội có gợn nhiệt; đèn chạy từ heroine tới cổng 1,2 s; đĩa lóe; camera lùi 4 % (ease-out cubic). Tiêu đề đập toàn chiều ngang có tia sáng. Victory sting và chime "all clear" (file). Hòa 300 ms sang thẻ | P0 | AL-11 |
| M037 | Kết trận thua | S18, H17, C12, W20, A32 | thật (banner) | y - - - k | k | mã (end.lose) | Hull 11→0, "STAGE LOST", tàu nguyên vẹn, cắt sang thẻ sau ~0,9 s. `combat/sheets/C-defeat-1080.jpg`, `oob/sheets/720r/sheet-720r-r-lose-beat.jpg` | Chậm 0,2× trong 0,6 s; Line vỡ từng đoạn từ chỗ thủng (0,8 s); đèn tắt từ cổng về Line trong 1,5 s, có tia; bầy tràn lên dais; kính nứt phủ màn; màu rút 40 % trong 1 s; camera đẩy 3 %. Khi có heroine: khiên vỡ, nàng quỳ, drone rơi và tắt đèn. Defeat sting (file) | P0 | AL-11 |
| M038 | Thẻ kết quả thắng: vào, số | S19 | thật (heroine vẽ) | k k - - k | k | mã | Số hiện sẵn giá trị cuối; khi nghỉ 0 cặp khung đổi. `oob/sheets/720/sheet-720-39-win-idle.jpg` | Thẻ trượt vào. Số đếm lên trong 500 ms (24–40 f) với tick nhanh dần, rồi 1→1,08→1. Các hàng cách nhau 60 ms. Dấu "NEW BEST". Danh sách từ đổ xuống. Nút stage sau lấp lánh. Tàn lửa trôi. Phím bất kỳ đếm xong ngay | P0 | AL-13 |
| M039 | Sao kết quả | S19, A32 | thật | y - - - - | y | mã (star.get một lần, ~0,9 s trước khi thẻ hiện) | Sao bật ở 0, 250, 500 ms; đó là chuyển động duy nhất. `oob/compare-stills/720-results-win.jpg` | Mỗi sao bừng có hạt và tiếng riêng (3 file, cao dần), đúng khung của nó; sao trượt thì nứt, có tiếng | P0 | AL-13 |
| M040 | Lỗi: mũi tên dựng lại thẻ, phát lại sao | S19 | — | — | — | — | Mỗi phím mũi tên phát lại hoạt ảnh sao. `oob/sheets/720/sheet-720-40-win-down.jpg` | Host giữ DOM (M002): mũi tên chỉ dời focus | P0 | AL-01 |
| M041 | Thẻ kết quả thua | S20 | thật | k k - - k | k | không | Tiêu đề đỏ, số, một dòng chữ, sao mờ. `oob/compare-stills/720-results-lose.jpg` | Một gợi ý việc nên làm có icon; kết quả tốt nhất; Retry thở; tàn lửa rơi chậm; sting trầm (file) | P1 | AL-13 |
| M042 | Lỗi: Accuracy 100 % khi gõ 0 phím | S20 | — | — | — | — | Đọc mã `src/app/results.ts:22`; luật sao lại tính 0. `oob/compare-stills/720-results-lose.jpg` | 0 phím thì hiện "—" và tính 0, như luật sao | P1 | AL-13 |
| M043 | Nhạc và âm màn kết quả | A32 | — | — | — | mã | Stinger tổng hợp 0,9–1,06 s, rồi pad calm chạy tiếp | Stinger thắng hay thua 3–4 s, rồi vòng nhạc kết quả; tick khi đếm số | P1 | AL-04 |

### 2.5 Gõ chữ (hệ dùng chung, mức 9)

| # | Phần tử / sự kiện | Nguồn | Art | V N H T R | VFX | SFX | Hiện tại (khung dưới `E:`) | Đích | Sev | Gói |
|---|---|---|---|---|---|---|---|---|---|---|
| M044 | Word plate (dải chữ đang gõ) | H01 | mã (gradient CSS của kit, `kit/feedback/typing-fx/css.ts:12`) | y k - y y | k | — | Hộp tối bo góc sau chữ 76 px. Art word-plate của game chỉ dùng ở ô xem trước của Settings (`survival.css:130`). `hud/sheets/720-word1-strip.jpg` | Tấm word-plate vẽ, viền trong màu súng. Khóa: 0,9→1,04→1 (f0–6), vệt sáng mép trên f2–12. Đang gõ: viền thở 1,5 s. Ra: gập về bay trong 8 f | P0 | AL-05 |
| M045 | Dấu chữ mỗi phím đúng | H08, E1, A6 | — | c - - c - | c | file (mẫu phím); không có lớp âm của game | Chữ lớn rơi vào, bùng cyan, vòng. Mọi phím một công thức; không leo theo combo ở 5 phím/s; `POP` ở `type-rules.ts` vẫn 1,25×. `hud/sheets/720-word1-strip.jpg` | Từng bước, không tween: chữ 2,6× và sao trắng (f0), đĩa trắng 1,9× (f1), vòng trắng (f2), vòng tối 2,1× với 2–4 mảnh (f3–4), cung trắng mảnh (f5), cung tối quay ~40° mỗi khung làm con trỏ (f6–8), sạch ở f9 (150 ms). Từ sạch lên bậc thì thêm tia và đổi sắc. "Glyph tick" có cao độ A3→G5 chồng lên mẫu phím | P0 | AL-05 |
| M046 | Tia phím vào lõi ("mỗi phím một phát") | E1, C1 | — | c - - - c | c | — | Tia từ chữ tới lõi tàu, sao ở hai đầu, vòng sàn (`KEY_MARK` 5 f); đọc như hiệu ứng, không như viên đạn. `combat/sheets/A-xung-1080-crop.jpg` | Theo Q1: đầu sáng chạy từ chữ tới lõi trong 2–3 f, vòng sàn nhỏ lại. Khi có heroine, tia vào `FX_CORE` của súng đang nạp (AL-15) | P0 | AL-05 |
| M047 | Vòng phím che nòng lúc phát | C1 | — | - - - y - | y | — | Mỗi phím một vòng trắng hay hổ phách 250 px quanh tàu, đè lên lóe nòng. `combat/sheets/B-ray-1080-crop.jpg` | Lúc xong từ, vòng phím và tấm chữ ở tàu tối đi 60–80 % trong 6–8 f để nòng giữ khung phát | P0 | AL-05 |
| M048 | Xong từ: chữ nạp vào súng | H02, E3, C1, A8 | — | c - - - y | c | mã (word.load ~−16 dBFS, cùng mốc với giọng đọc) | Chữ nhấc lên, tách hai nhóm trôi sang trái phải, bay qua bầy 0,6–1 s và che đường đạn; viền trống còn lại ~300 ms. `hud/sheets/720-word1-strip.jpg` | f0: cả từ lóe trắng 1 f, viền vượt 0,36 em. f1–3: chữ nén. f3–12: chữ bay thành một dòng có ribbon vào ô băng của bay vừa nạp. f12: ô đập 1,4→1 trắng nóng, 8–12 tia. Dải dọn bằng cú ép 6 f. `word.load` là file; giọng đọc chờ 150 ms sau đầu tiếng | P0 | AL-05 |
| M049 | Phím sai | H09, E2, A7 | — | - - - y - | y | file (cùng mẫu phím, gain 0,42) | Mép tấm đỏ ~120 ms; chữ đến lượt đỏ và gạch 220 ms; bản sao đỏ nhỏ; bay không phản ứng; chiếm ~2 % màn ở 1080. `hud/sheets/720-wrong-full-strip.jpg` | Chữ đến lượt giật +3, −3, +2, 0 px theo bước (không phóng to); gạch đỏ thẫm-magenta f0–5; bản sao nứt rơi 12 px rồi vỡ 2–3 mảnh tới f9; vết nứt trên mép bay f1–5. "Glass crack" trầm 60–90 ms, 6 biến thể. Không rung, không khóa phím | P1 | AL-05 |
| M050 | Phím lạc (không bay nào khớp) | H10, E2, A7 | — | - - - k - | k | file (gain 0,32) | Không thấy gì: bóng chữ bị ẩn ở host mode (`survival.css:125`), cú nhún chữ đầu không hiện. `hud/sheets/720-stray.jpg` | Bóng đỏ của chữ ở mốc chữ 1,4→1, rơi 20 px trong 15 f; chữ đầu mọi bay nhún 1,3× trong 8 f, có gạch sáng; tick câm (file) | P1 | AL-05 |
| M051 | Giọng đọc từ và thời điểm | A11, A8, A5 | — | — | — | TTS trình duyệt | 44/144 từ được đọc; giọng máy, tùy hệ thống; tiếng phím đi thẳng ra loa, không bị hạ khi đọc. `sound/play-campaign-1280x720.json` | Giọng chờ 150 ms sau đầu tiếng `word.load`; phím qua bus hạ −8 dB khi đọc (Q7); theo Q5, file giọng neural có giấy phép, TTS làm dự phòng | P1 | AL-02 |
| M052 | Bộ tiếng phím mặc định (`bright-clack`) | A5 | — | — | — | file (80 biến thể) | Critic chấm 6,40, chưa có hai giám khảo 9; ~70 % năng lượng nằm ở 1–4 kHz. `sound/keysets.json` | Theo Q4: đặt mặc định bộ chủ dự án chọn, hoặc nâng bộ này; hai giám khảo 9, chủ dự án ký; giữ đuôi tự nhiên. Relay (`key.ok`, tiếng phím riêng của game, là âm mã, phát khi Typing Feel không có) cũng thành file | P0 | AL-03 |
| M147 | Từ hoàn hảo (flawless, không phím sai) | đọc mã: cờ `perfect` của `EV.word`; `hud.ts:366` `is-perfect`; `typing-feel.ts:195`; `word.perfect` trong `theme-audio.ts` | — | - - - y - | y | mã (`word.perfect`) | Chỉ có class `is-perfect` trên bay và số "PERFECT" cyan; trên dải chữ không khác từ thường, nên người chơi không thấy luật "từ sạch xuyên giáp, dễ crit" của title và Armory | Dấu "FLAWLESS" trên tấm art ở f0–8, chữ lóe trắng-cyan thêm 1 f, ribbon của chữ bay (M048) có sợi trắng. Viên nạp từ từ hoàn hảo có đầu tinh thể trên ô băng (M059). `word.perfect` là chime tinh thể (file) đặt lên `word.load`, cao hơn 2 cung. Không dùng vàng (vàng của Leader) | P1 | AL-05 |
| M148 | Backspace và nhả khóa | đọc mã: `src/sim/words.ts:198` `backspace` (về 0 chữ thì nhả khóa); `typing-feel.ts:225` gửi `back` và `release` cho kit | — | - - - y y | y | không | Chữ vừa xóa biến mất trong 1 khung; về 0 chữ thì dải chữ mờ nhanh và các bay khác hết mờ cùng khung; không có tiếng | Backspace: chữ vừa xóa co về con trỏ 1→0,6 và mờ trong 4 f, con trỏ lùi trượt 3 f, tick lùi trầm (file `key.back`, 3 biến thể, dưới `key.glyph`). Nhả khóa: dải chữ gập xuống 8 f, viền khóa của bay nguội (M053), các bay khác sáng lại lệch nhau 30 ms, tiếng mềm (file `bay.release`). Không có hình đỏ | P1 | AL-05 |
| M149 | Missing letters (stage 4): chữ ẩn và lộ chữ | đọc mã: `LEARN_RULES.missing` ở `src/content/stage-rules.ts:75`, `chapter-1.ts:96`; kit `typing-fx/strip.ts:520` vẽ chữ ẩn là "_"; `words.ts:186` phím sai trên chữ ẩn thì lộ chữ | mã (ký tự "_") | - k - y - | k | không | Chữ ẩn là dấu "_" trơn trên dải chữ và trên bay; lộ chữ là đổi ký tự trong 1 khung | Ô chữ ẩn là art ô kính mờ cỡ chữ, lấp lánh chậm (chu kỳ 2,4 s, lệch pha). Gõ đúng chữ ẩn: kính vỡ, chữ bừng như M045, thêm một sao nhỏ (thưởng vì nhớ được). Lộ chữ sau phím sai: kính nứt rồi tan trong 6 f, chữ hiện nhạt để đánh dấu là gợi ý, tick mềm (file `key.reveal`). Bay dùng cùng art ở cỡ nhỏ (M056) | P1 | AL-05 |
| M150 | Nghĩa tiếng Việt và IPA (khoảnh khắc học) | đọc mã: kit `type-fx.ts` màu `meaning` #cdd2d6; `strip.ts:236` "word · meaning" 600 ms; `hud.ts:450` IPA và nghĩa trên bay | — | y - - y y | k | — | Nghĩa hiện cùng khung với chữ, chữ xám trơn, không có nhịp riêng; M048 cho chữ bay vào ô băng nhưng chưa nói nghĩa nằm đâu lúc đó | Sau f12 của M048, nghĩa nổi lên 8 px và rõ dần trong 8 f, ở lại ≥ 600 ms ở ≥ 7:1, rồi mờ 8 f; không bay theo chữ, không bị hạt đè. IPA là chip art nhỏ cạnh chữ trên bay đang khóa. Giọng đọc (M051) khớp nhịp này. Nghĩa là chữ duy nhất bằng tiếng Việt trong trận (`AGENTS.md`) | P1 | AL-05 |

### 2.6 Thẻ súng (bay)

| # | Phần tử / sự kiện | Nguồn | Art | V N H T R | VFX | SFX | Hiện tại (khung dưới `E:`) | Đích | Sev | Gói |
|---|---|---|---|---|---|---|---|---|---|---|
| M053 | Khóa bay (phím đầu) | H03, E1 | thật (thẻ) | k - - k - | k | không | Viền đổi màu súng, chữ nhảy 48→33 px kèm IPA, tức thì (100→184 ms). `hud/sheets/720-word1-bay.jpg` | f0: viền trắng nóng 6 px vượt thẻ 10 %, halo 40 px, sáng +35 %; về viền màu súng 2 px ở f6 (tau 35 ms). Chữ co trong 4 f, ease-out. Lock-click (file). Nhả khóa (M148): đảo lại trong 6 f, viền nguội về thường | P0 | AL-06 |
| M054 | Chữ đầu đóng dấu lên mọi bay khớp | H03, E1 | — | - - - k - | k | — | Không có. `hud/sheets/compare-word-cycle-typingbreak-vs-bay.jpg` | Trước khi khóa: chữ đóng dấu lên mọi bay khớp, 3,0→2,35→1,6→1,0 trong 3 f, nghiêng −8°, rơi từ 28 px, kẹp trong ô của nó. Sau khi khóa: chỉ bay đã khóa | P0 | AL-06 |
| M055 | Đổi từ trên bay | H04, E3 | — | k - - - k | k | — | Từ mới hiện ngay; cú nạp chỉ là chớp sáng 0,35 s, mờ ở 1080. `hud/sheets/720-word1-bay.jpg` | Từ đứng yên ~100 ms, có vệt trắng 2–3 f. Từ và nghĩa cũ ép scaleX 1→0 trong 6 f (ease-in), trống 4 f, từ mới hiện đủ cỡ với gạch trắng 1 f. Sọc nạp đặt lại cùng nhịp | P0 | AL-06 |
| M056 | Bay khi nghỉ, chữ chờ | H05, QR L8 | thật | - k - - - | k | — | Tĩnh hoàn toàn. `hud/sheets/720-hud-overview-typing.jpg` | Vệt sáng quét khung mỗi 5 s (12 f, các bay lệch nhịp); ô có đạn thở 1 Hz. Chữ chờ gợn 1,5 px, chu kỳ 2,4 s, lệch pha 0,12 rad; chữ đầu thở 0,4→0,9 trong 1,6 s (đặc tả L8: không xoay, không phóng quá 1,03). Chữ ẩn của Missing letters dùng art ô kính của M149 ở cỡ bay | P0 | AL-06 |
| M057 | Bay khi bắn | H05 | thật | - - - k - | k | — | Trạng thái "is firing" có (`hud.ts:477`) nhưng không style nào dùng. `hud/sheets/1080-hud-overview-play.jpg` | Mỗi viên: icon súng lóe, thẻ nhích 1,5 px trong 3 f | P0 | AL-06 |
| M058 | Bay hết đạn | H05 | thật | - k - - - | k | — | Không khác bay còn đạn | Thẻ nguội đi 30 %, nhịp "reload" trên chữ | P1 | AL-06 |
| M059 | Đèn ô băng | H23, E3 | thật | y k - k - | k | — | Đầy và cạn mượt, không có cú bật. `hud/sheets/720-word1-bay.jpg` | Nạp: 1,4→1 trong 7 f, trắng nóng ở f0. Mỗi viên bắn, ô nháy. Ô cạn tóe tia nhỏ. Viên cuối nháy. Băng từ từ hoàn hảo (M147) có đầu tinh thể cho tới khi bắn hết | P1 | AL-06 |
| M060 | Gõ vào bay đầy | H11, H26, A9 | thật (icon 42 px, thành vệt ở 720) | - - - y - | y | mã (word.full ~−31 dBFS) | Dải chữ kết thúc như thường; LED chớp hổ phách hai lần; chữ của bay đầy vẫn sáng như mời gõ. `hud/sheets/720-wrong-full-bay.jpg` | Bay đầy: chữ mờ dưới cửa chớp "FULL" vẽ, các ô sáng ngà. Chữ gõ vào đập cửa và vỡ, chip "BAY FULL", tiếng chạm kính trầm (file, ~10 dB dưới word.load) | P1 | AL-06 |
| M061 | Chip bay khóa | H25 | thật | - k - - - | k | — | Thẻ mờ, icon khóa, "LOCKED". `hud/sheets/720-hud-overview-typing.jpg` | Lấp lánh thỉnh thoảng; ghi cách mở | P2 | AL-06 |

### 2.7 HUD: bảng, banner, số

| # | Phần tử / sự kiện | Nguồn | Art | V N H T R | VFX | SFX | Hiện tại (khung dưới `E:`) | Đích | Sev | Gói |
|---|---|---|---|---|---|---|---|---|---|---|
| M062 | Thanh hull, khi trúng | H06, E12 | thật (vignette vẽ bằng mã) | y - - y - | y | mã (hurt) | Thanh phân đoạn trượt 0,18 s; số đổi tức thì; vignette gradient CSS 0,45 s. `hud/sheets/720-hull-panel-zoom.jpg` | Đoạn mất lóe trắng 2 f, rồi thanh "bóng" đỏ cạn trong 24 f; số lăn xuống; bảng rung 4 px, tắt dần trong 8 f; nêm đỏ tối ở mép phía bị đánh (đỉnh f3, hết ở f9; art cạnh màn hoặc shader, thay vignette gradient CSS). Trúng lớn: tách RGB từ mép ~18 px ở 1080 trong 300 ms; HUD và chữ là DOM nên không bị tách | P0 | AL-07 |
| M063 | Hull thấp (≤ 30 %) | H06, A29, E12, C11 | mã (đỏ nháy) | - y - - - | y | không | Đỏ và nháy; không còi, không nhịp tim. `hud/sheets/720-lowhull-lost.jpg` | Nhịp tim chu kỳ 1,2 s (độ sáng lệch ≤ 10–15 %), vết nứt vẽ ở mép màn, còi trầm lặp (file), nhạc low-pass về 2 kHz; không nháy đỏ | P0 | AL-07 |
| M064 | Chuỗi sạch, combo | H12, E4, A10 | thật (chip 19,5 px) | y - - y - | k | mã (streak.up ở 3, 6, 10, 20) | "CLEAN ×N" bump 1,2×; badge "N COMBO" là chữ vàng trơn. `hud/sheets/720-word1-strip.jpg` | Đồng hồ combo có khung theo bậc (bronze 3, silver 6, gold 10, plasma 20). Mỗi từ sạch: số 1→1,08→1 trong 6 f. Lên bậc: số đập 2→1 trong 3 f, sao trắng, ribbon màu súng 12 f, mép bay sáng thêm một bậc; sting (file, cao thêm 0,3 cung mỗi bậc, tối đa +3) | P1 | AL-07 |
| M065 | Đứt chuỗi | H12, E4, A10 | — | - - - k - | k | không | Chip xám dần, không có tiếng | Chip nứt thành 3–5 mảnh rơi 20 px, mờ trong 250 ms; "shatter-lite" rơi 200 ms (file) | P1 | AL-07 |
| M066 | Độ chính xác trong trận | H13 | thiếu | — | — | — | Chỉ có ở màn kết quả | Vòng accuracy nhỏ trên chip combo, mỗi lỗi một vạch đỏ | P1 | AL-07 |
| M067 | Bảng kills | H14 | thật | y - - - - | k | không | "Kills in 3 s" lên rồi xuống theo cửa sổ trượt, đổi trắng và cam quanh mức 15; tổng nhỏ và tĩnh. `hud/sheets/720-kills-panel.jpg` | Bộ đếm chuỗi chỉ tăng; hết chuỗi thì dồn vào tổng, có lóe và số lăn; bùng ở 100 và 250 | P1 | AL-07 |
| M068 | Số sát thương | H15, C34, E6 | của ta (WebGL) | y - - c y | y | — | Chữ kem nghiêng, PERFECT cyan, pop 1,25–1,9×; nhiều số nhỏ phủ trên bầy; vẽ đè banner và thẻ quái mới (không có trong `protectedRects`, `hud.ts:331`). `hud/sheets/720-damage-numbers.jpg` | f0: 2,3× trắng nóng có sao, về 1× trong ~150 ms (ease-out); đọc được 0,3–0,6 s. Gộp theo quái (stacking), tối đa 6–8 số trên màn. Crit to hơn 1,25× có sunburst màu súng; trúng khiên là số xám. Bảo vệ banner, thẻ quái mới, chip rift | P1 | AL-07 |
| M069 | Banner Surge | H16, A4, W17 | thật | y k - - y | k | mã (siren ~−26 dBFS, nhỏ hơn mức trận) | 1,4→1 trong 220 ms, đứng yên 1,5 s, rồi mờ. `hud/sheets/720-surge-banner.jpg` | f0: lóe trắng trên plate. Hai nửa trượt vào trong 8 f; vệt kim loại quét f18–36; mép hổ phách nhịp 2 lần; "FIERCE" có dấu đỏ riêng. Ra: tách đôi và trượt đi 10 f. Horn và klaxon (file) | P1 | AL-07 |
| M070 | Banner vào stage | H17, A31, E9 | thật | y - - - y | k | mã (ui.select) | Một plate, một hoạt ảnh cho mọi banner. `hud/sheets/720-stage-intro-card.jpg` | Thẻ tiêu đề có huy chương và mục tiêu, vào từ chiều sâu 1,15→1 trong 18–27 f, viền nạp 15 f; stinger "deploy" 1,5 s (file) | P1 | AL-07 |
| M071 | Banner Clear, Lost, Retreat | H17, E9 | thật | y - - - y | k | mã | Cùng một plate; từ cuối còn đóng băng trên dải chữ. `hud/sheets/720-stage-clear.jpg`, `hud/sheets/720-swarm-retreats.jpg` | Clear: plate vàng, bùng sáng, mưa tia, bảng HUD trượt ra. Lost: plate đỏ-đen, màn rút màu, kính nứt. Retreat (Hunt xong): "SWARM RETREATS" dựng từ nét trong 300 ms, tiếng trận tắt dần 200–350 ms. Trial dùng "LINE HELD!" và "LINE LOST" trên cùng plate thắng, thua. Dải chữ được dọn | P1 | AL-07 |
| M072 | Thẻ quái mới | H18 | thật (bóng hình, chữ 19,5 px) | y - - - y | k | không | Mờ vào 0,2 s, giữ 2 s; số sát thương phủ lên. `hud/sheets/1080-newfoe-brute.jpg` | Rơi từ trên xuống 8 f có overshoot, mang chân dung quái, dấu "NEW THREAT"; vòng đánh dấu chính con quái đó trên sân 1 s; giữ 3 s; sting (file) | P1 | AL-07 |
| M073 | Bảng mục tiêu Hunt | H19, E9 | thật | k - - k - | k | không (chỉ có tiếng kill) | LED 0/3 → 1/3 im lặng. `hud/sheets/720-goal-update.jpg` | Số đập 1,8→1 với bùng vàng, icon Leader đóng dấu tick, toast "LEADER DOWN 1/3". Leader lọt qua: lóe đỏ, rung, còi (file) | P1 | AL-07 |
| M074 | Chip cảnh báo Rift | H20, E9, A25 | thật (~130×24 px) | y y - - k | y | mã (rift.warn ~−30 dBFS) | Đếm phần mười giây, glow nhịp; chip nằm đè lên vạch đỏ. `hud/sheets/720-rift-chip-zoom.jpg` | Vào: 1,3→1 với lóe trắng 1 f. Đồng hồ tròn quanh icon; dưới 1 s phóng 1,15× và nháy 4 Hz; chevron chạy về phía tường. Mở: vỡ thành mảnh hổ phách, lóe ở phía màn đó. Tick mỗi giây, cao dần trong 3 s cuối (file) | P1 | AL-07 |
| M075 | Vạch quái gần dưới tấm chữ | H21 | mã (`survival.css:173`) | - y - - - | k | — | Vạch đỏ CSS 24×3 px nháy 4 Hz, đọc như gạch lỗi chính tả. `hud/sheets/720-word1-strip.jpg` | Chevron nguy hiểm vẽ, chỉ về con quái bị che; hoặc tấm chữ mờ cục bộ ở chỗ đó | P1 | AL-07 |
| M076 | Đồng hồ | H22 | thật (LED) | - k - - - | k | không | Tĩnh. `hud/sheets/720-hud-overview-typing.jpg` | 10 s cuối: số lật, 1,15× mỗi giây, tick (file), lóe ở 0 | P1 | AL-07 |
| M077 | Gợi ý nhập | H24 | thật (plate) | k - - - k | k | — | "Type a word on a bay to load its gun", tĩnh. `hud/sheets/720-hud-overview-typing.jpg` | Trượt vào với art phím bàn phím, rời đi khi người chơi gõ | P2 | AL-07 |
| M078 | Gói sửa giáp, phần HUD | H27, E11, A30 | — | - - - k - | k | mã (support.repair) | Không thấy trong 4 lượt chơi: hull 83→0 trong ~10 s mà không có gói | Kiểm vì sao gói không ra. Khi ra: hull nhảy ngay, bóng trắng quét lên 300–400 ms, "+N" xanh 2→1 trong 6 f, chime (file) | P2 | AL-07 |
| M079 | Thanh boss | H28, E10 | thiếu | — | — | — | Boss chưa có (R3) | Đặc tả ở R3: giới thiệu ≤ 0,8–1,1 s không ngắt gõ; đổi pha có dừng hình 50 ms và vòng tối 12 f | P2 | AL-16 |
| M080 | Đọc "Shield of the Line" | H29 | thiếu | — | — | — | Chỉ có hull | Không thêm luật: hull là thước đo duy nhất; khiên của drone là hình của cú trúng (M110) | P2 | AL-15 |
| M151 | Thông báo trong trận: sai bàn phím (IME), word list offline, bộ tiếng phím không tải được | đọc mã: `main.ts:841` (thứ tự IME > offline > bộ phím > gợi ý M077), `hud.ts:384` `setNotice`, `input.ts:67` `ImeNotice` | thật (icon bàn phím) | k - - - k | k | không | Chữ và icon bật, tắt trong 1 khung. "Switch to an English keyboard" hiện mỗi khi IME tiếng Việt bắt phím, việc người chơi Việt hay gặp ngay ở phím đầu | Tấm cảnh báo art (viền hổ phách, không đỏ) trượt xuống 8 f từ dưới dải chữ, icon bàn phím lắc ±4° hai lần; lặp lại thì chỉ lóe viền, không dựng lại; ra trong 8 f. Mỗi trận một tiếng "deny" mềm ở lần đầu (file `notice.warn`). Tấm nằm trong `protectedRects`, không che chữ đang gõ | P1 | AL-07 |

### 2.8 Súng

| # | Phần tử / sự kiện | Nguồn | Art | V N H T R | VFX | SFX | Hiện tại (khung dưới `E:`) | Đích | Sev | Gói |
|---|---|---|---|---|---|---|---|---|---|---|
| M081 | Bộ sprite chung của mọi súng | C2 | mã (atlas Canvas2D 8 ô, `fx.ts:14-73`) | — | y | — | Pulse, Scatter và Heat Beam trúng ra cùng một sao nhỏ, chỉ khác màu. `combat/sheets/A-tan-1080-crop.jpg` | Flipbook riêng cho mỗi súng: lóe nòng, trúng, khói ăn mòn bằng nhiễu (L10). Mỗi súng một dáng: quạt, kim, viên, lửa, cầu lửa | P0 | AL-08 |
| M082 | Màu nổ khi giết | C3 | — | — | y | — | Mọi kill nổ cam (`C.swarm`), dù súng nào bắn. `combat/sheets/A-xung-720-full.jpg` | Cú trúng mang màu súng (lam điện, hổ phách, cobalt, đỏ nóng, son); ánh của quái chết là tím; màu lửa của ta không dùng cho quái | P1 | AL-08 |
| M083 | Chồng lớp ở nòng, chung cho mọi súng | E5 | — | — | y | — | Có lóe nhưng cỡ và thứ tự chưa chuẩn; chữ và vòng phím che lóe (M047). `combat/sheets/A-xung-1080-crop.jpg` | f0: lõi trắng ≤ 30 %, đèn điểm sáng hết cỡ. f0–1: sao màu súng 4–8 cánh (Scatter và Star Mortar thêm phụt tối). f1–4: tắt dần. Viên đạn tròn ở khung đầu rồi thành kim. Giật lò xo 6–10 f | P0 | AL-08 |
| M084 | Pulse Gun | C5, A12 | model bolt và sprite chung | — | y | mã (viên ~−21 dBFS; đuôi ~−39, không nghe được) | Pha A bị vòng phím che; pha R không thấy dưới quầng tấm chữ; đầu sao chổi lam 25–30×6–8 px ở 1080; trúng là sao nhỏ rồi nổ cam. `combat/sheets/A-xung-1080-crop.jpg` | Lóe trái và phải luân phiên 2–3 f, vỏ đạn văng, nòng nóng lên sau 10 viên. Đầu viên nhộng 0,6 m với ribbon lam 2 m. Trúng tóe điện xanh-trắng và làm mẻ vỏ quái. `gun.xung` 6 biến thể, đuôi nhịp 0,5 s (file) | P0 | AL-08 |
| M085 | Heat Beam | C6, A13 | strip shader, sao chung | — | y | mã (loop 55 Hz ~−29; end ~−35, không nghe được) | Vạch laser cam 6–8 px ở 1080, như bút laser; quái không nóng lên. `combat/sheets/B-tia-1080-crop.jpg` | Ba lớp: lõi 2–3 px trắng-vàng, thân 10–14 px cam cuộn nhiệt, haze nửa độ phân giải ở High và Ultra. Dồn nòng 12 f. Giọt nóng chảy ở điểm chạm. Quái đỏ rực trong 0,3 s và để lại xỉ. Âm: start 480–720 ms, loop 2 s, end, 4 pulse (file), cao độ theo số quái trúng | P0 | AL-08 |
| M086 | Scatter Gun | C7, A15 | sprite chung | — | y | mã (~−14,6 dBFS) | Quạt hổ phách ~80 px; 7 viên như bó kim song song; không thấy quái văng lùi. `combat/sheets/A-tan-1080-crop.jpg` | Lóe hình nón 60° trong 2 f; 7 viên đầu nóng xòe ±18° (8–10 tia [M]). Mỗi cú trúng một phụt, quái trượt lùi có bụi. Vết xém hình nón; vỏ đạn nảy. Blast-and-pump (file) | P1 | AL-08 |
| M087 | Rail Gun | C8, A14 | lớp tốt nhất game | — | c | mã (charge ~−45, không nghe được) | Bolt nạp ~8 px gần như không thấy; ở 1080, phát đầu ~800 ms sau khi xong từ, súng không có gì trong lúc chờ. `combat/sheets/B-ray-1080-crop.jpg` | Nạp hiện ngay khi xong từ: các cuộn nòng sáng lần lượt (2 f một cuộn), hồ quang bò dọc nòng. Vạch tối 1 f, sợi trắng có quầng cobalt ≤ 0,9. Vòng sóng ở nòng, FOV punch. Ribbon ion xoắn; lỗ xuyên tóe tia ra mặt sau; vết cháy trên sàn 2–3 s. Whine leo theo tiến độ gõ, đuôi ion 700 ms (file) | P1 | AL-08 |
| M088 | Star Mortar: phóng, bay | C9, A15 | sprite chung | — | k (A), y (T) | mã | Tàu không có gì lúc phóng; vệt hồng ~20 px; viên đạn là gạch hồng gần như vô hình. `combat/sheets/E-phao-720-crop.jpg` | Ống giật, lóe đứng, vòng khói, cổ tia 6–8 f. Viên sáng có ribbon khói dọc cả đường cung. Thump và tiếng huýt (file) | P0 | AL-08 |
| M089 | Star Mortar: nổ | C9, E8, A15 | sprite chung | — | y | mã | Đĩa trắng mềm 1–2 f (~160 px ở 720, ~290 ở 1080), rồi vòng đỏ mảnh; không có hố. `combat/sheets/C-phao-1080.jpg` | Lóe 3 f, lõi trắng ≤ 30 %. Flipbook cầu lửa 0,5 s, bán kính 2,5 m ±10 %. Vòm sóng 10–15 f, mảnh tối, vòng bụi, hố nguội dần 4–7 s. Nâng sáng làn +15–25 %, tối đa 3 f, có đo. Burst (file) | P0 | AL-08 |
| M090 | Phản ứng trúng theo súng | C20, E6 | — | - - - y - | y | — | Lóe trắng 2–6 f, chỉ đọc như một đốm trắng. `combat/sheets/A-tan-1080-crop.jpg` | Pulse và Rail: giật điện. Heat Beam: nóng đỏ. Scatter: trượt có bụi. Star Mortar: nảy lên. Mảnh vật liệu của chính con quái văng ra | P1 | AL-08 |
| M091 | Âm trúng theo bậc | A16, E6 | — | — | — | mã (t1 51 ms, t2 81 ms, t4 288 ms) | Chưa có `hit.sub`, `hit.tail`. `sound/offline-renders.json` | File đầu tiếng và thân cho từng bậc, cộng `hit.sub` và `hit.tail` dùng chung, ghép lúc chạy (AUDIO_PIPELINE §6.3 #3); hit-confirm khác tiếng súng | P0 | AL-03 |

### 2.9 Quái và đòn của quái

| # | Phần tử / sự kiện | Nguồn | Art | V N H T R | VFX | SFX | Hiện tại (khung dưới `E:`) | Đích | Sev | Gói |
|---|---|---|---|---|---|---|---|---|---|---|
| M092 | Quái xuất hiện | C15, W8, A20 | — | k - - - - | y (quầng cam) | không | Quầng cam mềm 0,5 s (`BLOW.spawn` #ff6a1a) dù màu phe là tím; cổng nằm dưới bảng HUD và banner nên quái chỉ "hiện ra". `combat/sheets/A-spawn-start-720.jpg` | Năm pha: kẽ ngưỡng cổng lóe tím 4 f; cổng xé tối, viền tím, 12 f; quái trồi lên, mở mình, gân bừng; bụi tối; tàn tím. Cổng ra khỏi vùng HUD. Tiếng nứt và tiếng bò (file, tối đa 3 lần/s, pan về cổng) | P1 | AL-09 |
| M093 | Quái đứng và đi | C16, A21 | thật (rainbow mượn, chỉ có clip `Enemy_Idle`) | - y - - - | y (gân) | không | Lắc, nhún, nghiêng bằng mã; cả bầy đọc như tấm thảm tối trôi xuống. `combat/sheets/C-riftopen-1080-crop.jpg` | Chu kỳ đi hay bò riêng cho mỗi loại (bake vào texture cho đám đông), gân nhịp theo bước chân, bụi; Scout bay lượn; đám đông lệch pha nhau (animation, mức 9) | P0 | AL-09 |
| M094 | Dáng từng loại quái | C17 | thật (mượn) | — | — | — | Swarm là bóng gai 25–35 px; Scout có cánh; Brute như chiếc "lá" magenta dẹt, không thấy nặng; Elite như nét vàng nguệch. `combat/stills/C-foes-1080-1to1.jpg` | Họ `cosmic` của Space (inventory §1, khuyến nghị 1), mỗi loại một bóng; Brute có khối và giáp; ánh sáng không làm quái ngả hồng dưới sàn đỏ | P1 | AL-09 |
| M095 | Đòn cận chiến, phá tuyến (breach) | C18, A28, E12 | — | - - - - - | y | mã (breach ~−13 dBFS) | Không gồng, không lao: quái đi vào vạch, hiện đĩa đỏ, vòng, tia; cú cúi đầu của Brute không thấy. `combat/sheets/D-breach-720.jpg` | Gồng 0,5 s riêng mỗi loại (cúi, gân đỏ-tím bừng, sàn sáng), rồi lao hay đập vào hàng rào Line: sóng tím, Line nứt, chạm khiên; Line lóe 4 f; còi ngắn (file) | P0 | AL-09 |
| M096 | Scout bắn | C19, A22, E12 | — | — | y | mã (~−41 dBFS) | Sao đỏ 0,12 s, rồi cầu đỏ lõi trắng ~15 px, không có vệt. `combat/sheets/C-phao-1080.jpg` | Nạp tím 3 f; đạn màu phe viền tối, có ribbon tím; trúng vào khiên. Tell 200–300 ms ~−20 dBFS, pan theo Scout (file) | P1 | AL-09 |
| M097 | Bắn hạ đạn Scout | A23, E12 | — | — | y | mã (~−32 dBFS) | Một sao tàn lửa nhỏ | Pop trắng và vòng 6 f; tick giòn ~−24 dBFS (file) | P2 | AL-09 |
| M098 | Swarm chết, mảnh vỡ | C21, A17, E7 | mã (khối xám `#56616c`) | - - - - k | y | mã (kill.swarm) | 3 f trắng rồi biến mất; mảnh là bát diện, nêm, phiến thép xám làm bằng mã, nằm 8 s, đọc như gạch be rải khắp làn. `combat/sheets/A-tan-1080-crop.jpg` | Gân tím cháy tàn 6–10 f; 4–6 mảnh cắt sẵn từ model thật (kính, vỏ, mép gân sáng) văng theo hướng đạn; khói mực tối, trộn thường; vệt tím. Mảnh nhỏ 2–3 s, mảnh lớn và vết 6–8 s, tối đa 40. N kill trong 100 ms gộp thành một bùng cỡ √N. `kill.swarm` và `kill.chime` (file) | P0 | AL-09 |
| M099 | Brute chết (big kill) | C22, A18, E8 | mã (mảnh xám) | — | c | mã (gọi tiếng swarm nhỏ) | Lóe ấm, cầu lửa, khói ba lớp, vết xém nứt sáng, 36–40 mảnh, dừng 35 ms; nhưng mảnh xám và màu là lửa của ta. `combat/sheets/A-tan-1080-crop.jpg` | Giữ các lớp; đổi sang màu quái (magenta, tím); thêm vòm sóng và mảnh model thật; bóng trắng cục bộ 2 f thay cho lóe cả làn; dừng 60–80 ms; camera nhích. Nổ riêng 1–1,5 s (file), nhạc hạ 3 dB trong 400 ms | P1 | AL-09 |
| M100 | Pack Leader đến | C23, W24, A24, A25 | — | y - - - - | y | mã (horn ~−22) | Lóe vàng và vòng ở cổng, dưới HUD; cột beacon ~2 px. `combat/stills/B-foes-leader-arrival-1080-crop.jpg` | Bầy tách ra 2 s trước khi Leader qua cổng (bắt đầu ở `EV.telegraph` loại `horn`, `spawn.ts:166`; hôm nay `gunfx.ts:102` bỏ qua nó); cột beacon 6–8 px có hạt bay lên; tên dựng từ nét trong 18–24 f. Horn đuôi dài và beacon hum (file). Camera nghiêng về cổng (AL-11) | P1 | AL-09 |
| M101 | Pack Leader chết | C23, A18 | — | — | y | mã (leader.down chỉ có ở Hunt) | Chết ở cổng xa, dưới bảng "PACK LEADER 2/3" và vùng chói của hố đen; dừng 45 ms. `combat/sheets/B-leader-death-1080.jpg` | Chậm 120 ms; gân vàng bùng thành cột sáng; vòm sóng; banner "LEADER DOWN" đặt gần chỗ chết; horn và tiếng đổ (file) | P1 | AL-09 |
| M102 | Elite (có giáp) | C24, A19 | — | — | y | mã (kill.elite ~−22) | Vẽ 1,22×, gân vàng, trúng giáp bật tia cam; đọc như nét vàng nguệch. `combat/stills/C-foes-1080-1to1.jpg` | Vỏ giáp có ánh, mảnh giáp bay khi bị xuyên; gân tím (vàng chỉ của Leader); tiếng kim loại khác nhau cho chặn và xuyên (file) | P1 | AL-09 |
| M103 | Shield Guard | C25, A26 | mã (thẻ shader lục giác phẳng ~60×35 px ở 1080) | — | y | mã (hit ~−34, không nghe được; break ~−23) | Gợn khi trúng, 3 mức nứt, vỡ có sao 12 cánh và 22 mảnh kính. `combat/stills/D-shield-1080-1to1.jpg` | Vòm năng lượng cong, viền fresnel; lục giác lóe ở điểm chạm; vết nứt lớn dần; vỡ thành 10–16 mảnh kính xoay bắt sáng, 2 f trắng. Tiếng trúng và vỡ kính (file) | P1 | AL-09 |
| M104 | Splitter, Shard | C26, A26 | thật | — | y | mã | Không xuất hiện ở chương 1 hay Trial | Khi có stage (c1-s7): vỏ nứt theo một đường trong 2 f, hai nửa xoay tách ra, cung tím nối hai nửa | P2 | AL-16 |
| M105 | Brute dậm chân | A24 | — | - y - - - | y (vòng bụi rất nhỏ) | không | Vòng bụi quá nhỏ để thấy | Bước chân 1,1 Hz có bụi thấy được; sub và tiếng đá (file) | P1 | AL-09 |
| M106 | Hút giáp (drain), sàn đỏ | C29, A27, E12 | shader tint | - y - - - | y | mã (~−39 dBFS) | Lóe đỏ đục rất thường; sàn đỏ cả mảng trong thời gian dài, che quái và hiệu ứng. `combat/sheets/C-hurt-1080.jpg` | Dải đỏ nhịp chỉ ở sát Line, đèn báo ở viền màn; giữa sàn sạch; khung giáp nhịp chậm theo từng tick drain; tiếng xèo ~−26 dBFS (file) | P1 | AL-09 |
| M107 | Boss | C27, E10 | thiếu | — | — | — | Chưa có (R3) | Thiết kế đủ: tell ≥ 1,2 s, đổi pha theo công thức ultimate, một khoảnh khắc camera | P2 | AL-16 |
| M108 | Tiếng của bầy (horde bed) | A21 | — | — | — | không | Không nghe thấy bầy | Nền rì rầm theo số quái và độ gần, pan theo làn (file) | P1 | AL-03 |

### 2.10 Nhân vật, tàu, drone

| # | Phần tử / sự kiện | Nguồn | Art | V N H T R | VFX | SFX | Hiện tại (khung dưới `E:`) | Đích | Sev | Gói |
|---|---|---|---|---|---|---|---|---|---|---|
| M109 | Tàu Vanguard → heroine và drone: nghỉ, presence | C10, C14 | thật (tàu) | - c - - - | y | — | Tàu ~100×80 px ở 720: lơ lửng, trôi ±1,6 m, nghiêng, lao lên khi nạp; vòng cam phẳng vẽ dưới tàu. `combat/sheets/A-xung-720-full.jpg` | Heroine giữ bay 1, drone ở vai phải giữ bay 2 (concept §1.7, QUALITY_RESCUE §4); presence theo lab `ts-presence-lab`; năm pha ở nòng thật (`FX_MUZZLE`). Trước khi có heroine: viền sáng và lõi sáng theo chuỗi gõ | P0 | AL-15 |
| M110 | Bị trúng | C11, A28, E12 | — | - - - y - | y (bị vòng phím che) | mã (~−13 dBFS) | Sao đỏ ở mũi, thân đỏ 0,6 s, 2 hồ quang, khói; không có trạng thái hư hại. `combat/sheets/B-hurt-720.jpg` | Khiên lục giác của drone lóe ở phía bị đánh; vết lõm sáng; tia chảy ra khi hull thấp, khói khi dưới 30 %. Tiếng va chạm, tiếng áo choàng, tiếng rên (file) | P1 | AL-15 |
| M111 | Drone: đón gói sửa, chặn đạn Scout | C30, E11 | thiếu | — | y | mã | Gói sửa chỉ là sao xanh, vòng và 24 tia; không có vật gói; chìm dưới vòng phím. `combat/sheets/C-repair-1080.jpg` | Gói rơi xuống có vệt, drone đón, sóng xanh chạy dọc thân; drone kẻ vạch ngắm tới đạn Scout và lóe khi hạ được | P2 | AL-15 |
| M112 | Giọng heroine, drone, người dẫn | A38 | — | — | — | không | Không có | "Surge incoming", "Line holding", "Stage clear", tiếng rên khi trúng, drone kêu chíp khi nạp (Q5) | P1 | AL-03 |
| M113 | Dais và vòng glyph | W15 | mã (vòng cam trong shader sàn) | - y - - - | y | — | Vòng cam quanh tàu trên tấm sàn dày hơn, sáng theo chữ gõ. `world/sheets/s1-lowerleft-crop-1280.jpg` | Dais đá tối (K5); vòng glyph khảm, quay 2°/s ở độ sáng 0,3, nạp theo từng chữ; Line là mép trước của dais | P0 | AL-10 |

### 2.11 Thế giới

| # | Phần tử / sự kiện | Nguồn | Art | V N H T R | VFX | SFX | Hiện tại (khung dưới `E:`) | Đích | Sev | Gói |
|---|---|---|---|---|---|---|---|---|---|---|
| M114 | Vực và đĩa bồi tụ (~37 % khung) | W1 | mã (mặt phẳng nền gắn camera, `SKY_FRAGMENT`) | - y - - - | k | mã (gió trong `music.calm`) | Xoáy navy và đỏ thẫm. Dải trống trên-trái có luma 0,066 (concept 0,32). Không có parallax. `world/sheets/compare-built-vs-concept-1280.jpg` | Mesh đĩa trong không gian thế giới, 1–3 km dưới causeway (K9). Dải plasma quay, trong nhanh ngoài chậm (~0,4°/s và ~0,08°/s); 2–3 lớp sâu. Lóe plasma mỗi 6–10 s (+25 % trong 1,2 s). Abyss drone loop 30–60 Hz (file) | P0 | AL-10 |
| M115 | Hố đen | W2 | mã (hai vòng tròn và một cung trắng) | - y - - - | k | không | Khối 40 px sáng nhất khung ở (550, 10), luma 0,82, ngay sau hàng quái và nửa sau đồng hồ. `world/sheets/s1-gate-band-crop-1280.jpg` | Bóng đen không đều, hai thùy (K8), cắt vào đĩa; viền ấm rất mảnh bẻ cong đĩa phía sau; lung linh 0,2–0,4 Hz, phồng ±2 % trong 10 s; viền lóe +20 % khi báo surge. Rumble (file) | P0 | AL-10 |
| M116 | Broken Ring (mốc chính) | W3 | thiếu | — | — | — | Dải trên-trái trống. `world/sheets/compare-zones-built-vs-concept-1280.jpg` | Hai thẻ alpha vẽ (cung gần sáng, sườn sau mờ trong haze), sáng nhất ở x 150–330, y 110–172; mảnh gãy rơi mỗi 8–15 s; cửa sổ nhấp nháy 0,1–0,3 Hz | P0 | AL-10 |
| M117 | Sàn (deck) | W4 | mã (shader một họ tấm) | - k - y - | y | — | Một họ tấm 4×3 m, không texture hay normal; vết xém 2,4 s, mảnh nằm 8 s rồi sàn sạch. `world/sheets/s1-lowerleft-crop-1280.jpg` | Mesh K1 với 2–3 họ tấm, normal và roughness ambientCG, anisotropy 16×, mặt nạ macro 60 m, 2–3 dải đá nhạt, 12–20 decal. Vệt inlay cyan quét mỗi 6–8 s. Vết trận ở lại: xém 30 s, mảnh kính tím 20 s, tối đa 40 | P0 | AL-10 |
| M118 | Sọc cảnh báo ở hai tường và trước Line | W5 | mã | - y - - - | — | — | Cam và đen là pixel ồn nhất màn, trùng màu Heat Beam. `world/sheets/s1-lowerleft-crop-1280.jpg` | Bỏ (concept §1.6). Việc của tường chuyển sang lan can (M120); tín hiệu đe dọa chuyển sang Line (M119) | P0 | AL-10 |
| M119 | Line và đe dọa sát tuyến | W6, W18 | mã (vạch đỏ, quầng đỏ) | - y - y - | y | không | Đỏ phủ 4,2 % vùng tập trung (concept 0 %). `world/sheets/s1-idle-1280.jpg` | Lõi cyan-trắng 2–3 px, có phần cứng phân đoạn ở mép dais, thở 0,5 Hz ±10 %. Quái chạm: lóe trắng 2 f ở chỗ chạm, gợn 300 ms chạy về hai phía, tia, barrier-zap (file). Bị dọa: các đoạn lách tách (không đỏ), đèn gần chỗ thủng lóe, hum theo mức đe dọa | P0 | AL-10 |
| M120 | Lan can, cột, đèn | W7 | mã (hộp) | - y - - - | k | không | Tường hộp, cột hộp, đèn là khối cam; cáp lam là chuyển động thường trực duy nhất. `world/sheets/s1-lowerleft-quadrant-1920.jpg` | K3: tường đá 1 m có mũ thép, cột 1,82 m đầu ngà mờ, đèn chạy cyan tắt khi nghỉ. Phản ứng với surge, thắng, thua do AL-11 điều khiển. Relay-click và hum (file) | P0 | AL-10 |
| M121 | Cổng và bãi tập kết | W8 | mã (torus dẹt, haze cộng sáng) | - k - - - | y | không | Không ngưỡng, không pháo đài, không hàng chờ. `world/sheets/s1-gate-band-crop-1280.jpg` | K4 và K11: ngưỡng 0,6 m, hai pháo đài thấp khối lớn với bóng tiếp xúc sâu; 2–3 bầy chờ lắc 0,3 Hz, gân lấp lánh. Máy cổng và tiếng rì rì của bầy (file) | P0 | AL-10 |
| M122 | Trụ đỡ dưới sàn | W9 | thiếu | — | — | — | Mép sàn rơi thẳng xuống nền; góc dưới-trái 50 % gần đen. `world/sheets/s1-lowerleft-quadrant-1920.jpg` | K6: trụ tối mỗi 12 m, mờ dần theo xa; đèn bảo trì nhỏ, tắt khi nghỉ | P0 | AL-10 |
| M123 | Thác làm mát | W10 | thiếu | — | — | — | Không có | Hai thác cyan hẹp (trái ở z 18, phải ở z 30): shader chảy 1,5–2 m/s, đầu bọt và bụi nước (Kenney Smoke, CC0), mờ vào sương trước y 372. Tiếng thác trái và phải (file) | P1 | AL-10 |
| M124 | Đoàn tàu con thoi | W11 | thiếu | — | — | — | Không có | 3 tàu tối băng qua x 1109–1178, y 110–136 mỗi 30–40 s, mỗi lần 8–10 s; ánh động cơ 4–6 Hz, vệt mảnh; tăng tốc khi surge (tàu của Space đổi màu) | P1 | AL-10 |
| M125 | Công trình xa và cầu dịch vụ | W12 | thiếu | — | — | — | Không có | Thẻ alpha vẽ 2–3 lớp (K7); cầu dịch vụ tối với đèn mép cam nhỏ nháy 0,25 Hz | P1 | AL-10 |
| M126 | Khí quyển | W13 | mã (sao lấp lánh) | - y - - - | k | — | Không sương, bụi, cột sáng hay gợn nhiệt; có sao lấp lánh mà concept đã bỏ khỏi trận. `world/sheets/s1-idle-motionmap-1280.jpg` | K10: sương theo độ cao, 200–400 hạt bụi bay lên 0,1–0,3 m/s, 2–3 cột hạt rộng ở trên-trái, lớp haze trôi, gợn nhiệt ở cổng; làn giữa sạch | P1 | AL-10 |
| M127 | Ánh sáng | W14 | — | - k - - - | — | — | 1 đèn hemisphere và 3 đèn directional; không bóng, sương hay IBL; luma trung bình 0,13 (concept 0,25). `world/compare-stills/run-1280_s1-mid.jpg` | K14: đĩa là key từ dưới-trước; fill navy từ trên; PMREM của vực cho viền sáng trên mọi model; một đèn đổ bóng trên sàn gần (High và Ultra, 2048, PCF); bóng tiếp xúc. Đèn đáp sự kiện: key +10 % trong 1,2 s mỗi lần lóe, fill −15 % khi surge | P0 | AL-10 |
| M128 | Khử răng cưa ở High (mặc định) | W26 | — | — | — | — | High không có AA từ lượt sửa đợt 1; cột, mép và sọc lên bậc thang 1 px. `world/sheets/s1-lowerleft-crop-1280.jpg` | SMAA hoặc FXAA ở High (~0,3 ms), giữ trong cổng `survival-s1-perf` | P1 | AL-10 |
| M129 | Đích concept: tranh try2 lệch tài liệu | W27 | — | — | — | — | Try2 phá luật của chính concept: dưới hai bên là cam, đèn cyan sáng lúc nghỉ, có sợi cam. `world/sheets/compare-built-vs-concept-1280.jpg` | Chốt một đích trước khi dựng: vẽ try3 trên ảnh nền (chủ dự án đính kèm), hoặc đánh dấu try2 theo bảng giá trị §4.5; giám khảo chấm theo tài liệu | P1 | AL-10 |
| M130 | Mỗi stage một dáng | W16 | — | — | — | — | `Stage` chỉ dựng theo bậc đồ họa; s1 và s2 chỉ khác pha xoáy (0,3–2,6 mức xám). `world/sheets/stage-cards-c1-s1-s4.jpg` | Mỗi stage một preset có mốc và ánh riêng: s2 Herald Monolith (ăng-ten sáng vàng khi Leader đến), s3 Torn Span, s4 Aegis Array; ánh ấm dần từ s1 tới s10 | P0 | AL-16 |
| M131 | Vết nứt Rift (stage 3) | W23, C28, A25 | mã (nứt cam cộng sáng, #ff6a12) | y - - - - | y | mã (rift.open ~−15) | Nứt cam nằm trên sọc cam nên gần như chìm; lúc mở là lóe cam 40–60 px. `world/sheets/s3-rift-wallfoot-crops-1280.jpg`, `combat/sheets/C-rift-720.jpg` | Năm pha: mép cựa quậy 2,5 s, có bụi và ánh tím dày dần; mở trong 6 f thành vực tối viền tím, có vòng sóng tối; quái bò ra; tấm sàn quanh đó nghiêng; camera lia 3–5 % về phía đó. Tiếng rên và tiếng xé (file) | P1 | AL-11 |

### 2.12 Đạo diễn: sự kiện thế giới, camera, thời gian

| # | Phần tử / sự kiện | Nguồn | Art | V N H T R | VFX | SFX | Hiện tại (khung dưới `E:`) | Đích | Sev | Gói |
|---|---|---|---|---|---|---|---|---|---|---|
| M132 | Surge trong thế giới | W17, A4 | — | - k - - - | k | mã (siren nhỏ hơn mức trận) | Có banner và siren; thế giới không đổi (vùng bên 1,5–5,6, sàn 0,35 mức xám/s, như lúc nghỉ); mix lúc surge còn nhỏ hơn lúc calm. `world/sheets/s1-surge-motionmap-1280.jpg` | Thế giới báo trước 2,5 s: đèn nhịp 3 lần từ cổng về heroine (mỗi lần 0,6 s, cách 0,4 s), hàng chờ ép vào ngưỡng, viền hố đen lóe, trống vào. Reverse swell 1,5 s; horn và taiko đúng khung banner; nhạc lên stem đỉnh; mix +2 dB trong 4 s. Hết surge (đỉnh về 0): đèn về nhịp nghỉ từ cổng về heroine trong 1,2 s, nhạc về stem calm đúng ô nhịp, một tiếng thở ra trầm (file `surge.end`); không banner | P0 | AL-11 |
| M133 | Rung màn | C31, E §4.2 | — | — | y | — | Trauma bình phương với mức cộng 0,03/0,08/0,16/0,3/0,55, nên dưới T4 gần như không rung; trong ảnh gần như không thấy | Ngân sách rung theo lớp sự kiện (xoay và dịch cho sự kiện lớn; cú đá có hướng cho Rail, Scatter, big kill); mức cộng theo Eiserloh (0,2 và 0,5) sau khi đo, vẫn dưới trần FEEL §6. Phím không bao giờ rung. Cài đặt Off, Low, Normal (AL-12 thêm vào `settings.ts` ở đợt 3; AL-11 đọc) | P1 | AL-11 |
| M134 | Hit-stop | C32 | — | — | y | — | T2 12 ms, T3 35 ms, Leader 45 ms: 1–2 khung, không cảm được | 50–80 ms cho big kill, Leader, vỡ khiên, thua; lóe trắng 1 f trên mục tiêu; Leader và thua có chậm rồi ease về. Không bao giờ nuốt phím | P1 | AL-11 |
| M135 | Camera trong trận | C33, W28 | — | - k - - - | — | — | Khung cố định; nền đi theo camera nên rung không có chiều sâu | Lắc nghỉ ±0,15° trong 6–8 s, lớp xa ở độ sâu thật để thấy parallax; FOV punch ±1,5° cho Rail và Star Mortar; đẩy chậm vào khi surge; tắt khi giảm chuyển động | P1 | AL-11 |

### 2.13 Âm: hệ thống

| # | Phần tử / sự kiện | Nguồn | Art | V N H T R | VFX | SFX | Hiện tại (khung dưới `E:`) | Đích | Sev | Gói |
|---|---|---|---|---|---|---|---|---|---|---|
| M136 | Đường phát file âm | A41, C4, H07, W25 | — | — | — | mã (96,5 % số tiếng bắt đầu là mã) | `ThemeAudio` dựng `SceneAudio` với bảng âm rỗng; 0 file của game. `sound/sound-mix-timeline-campaign.png` | Bảng và manifest ở `public/assets/typing-survival/audio/<id>.ogg`, có biến thể; mỗi id giữ âm mã cho tới khi file decode xong | P0 | AL-02 |
| M137 | Họ âm (hướng B) | A42 | — | — | — | mã (hướng A, thép) | Âm mã kể chuyện "hành lang thép" của hướng A; danh sách hướng B (37 hàng, 66 take) chưa có take nào | Tạo danh sách B theo thứ tự ưu tiên qua Audio Lab: cổng critic, chủ dự án nghe mù, rồi mới gắn | P0 | AL-03 |
| M138 | Nhạc trận | A3 | — | — | — | mã (dải động 1,3–1,9 LU) | Một vòng tổng hợp cho mọi stage; surge không to hơn. `sound/sound-mix-timeline-campaign.png` | Stems theo chương (calm, pressure, surge, peak), 96 BPM, La thứ, đổi đúng ô nhịp; riser 1,5 s vào surge; lớp đỉnh có brass hay choir; nhạc hạ 3 dB quanh big kill | P0 | AL-04 |
| M139 | Cân dải trên loa nhỏ | A39 | — | — | — | — | ~93 % năng lượng của mix dưới 250 Hz; nhạc mất 12 dB qua lọc 200 Hz. `sound/mix-campaign-1280x720.json` | Nâng dải giữa của nhạc và va chạm; mọi lô kiểm ở chế độ "loa nhỏ" | P0 | AL-02 |
| M140 | Bus tổng, limiter, snapshot | A40 | — | — | — | — | Không limiter tổng, không send vang, không snapshot; ở Effects 100 %, đỉnh lên ~0 dBFS | Limiter −1 dBTP, send vang không gian lớn, snapshot cho menu, trận, surge, pause, kết; nhạc nhường sự kiện lớn | P2 | AL-02 |
| M141 | Nền âm (ambience) | A37, W25 | — | — | — | mã (gió nằm trong nhạc) | Nhạc về 0 thì không còn gì | Bus riêng: rumble hố đen, gió mặt trời, hum trạm; không phụ thuộc âm lượng nhạc | P1 | AL-02 |
| M142 | Các âm không nghe được | A (mục thắng 4) | — | — | — | mã | Rail charge −45, cảnh báo Scout −41, tick menu −41, drain −39, word.full −31, beam end −35 dBFS. `sound/offline-renders.json` | Đưa cảnh báo và gồng lên −20…−26 dBFS ngay ở âm mã, rồi file thay | P1 | AL-02 |

### 2.14 Nền chung

| # | Phần tử / sự kiện | Nguồn | Art | V N H T R | VFX | SFX | Hiện tại (khung dưới `E:`) | Đích | Sev | Gói |
|---|---|---|---|---|---|---|---|---|---|---|
| M143 | Bảng phủ trong mã (sự kiện → VFX và SFX) | luật §1.1 | — | — | — | — | Không có; khe hở chỉ thấy khi soát tay | `src/view/coverage/` (mỗi gói một tệp) và test: mọi EV, mọi màn và mọi sự kiện UI (§2.16) có id VFX và id SFX; danh sách nợ chỉ được co lại | P0 | AL-00 |
| M144 | Thước đo "sống" | §1.3 | — | — | — | — | Sáu bản soát đo bằng tay | Kịch bản `survival-alive.mjs`: chuyển động nghỉ theo vùng, phát hiện cắt cứng, khung tới phản hồi, tờ khung 720 và 1080 | P0 | AL-00 |
| M145 | Tách tệp để chạy song song | §4 | — | — | — | — | `hud.ts` 594 dòng, `survival.css` 683 dòng; `combat.ts` điều phối mọi sự kiện | Tách `hud.ts` và `survival.css`; thêm cue bus ở `combat.ts` (không đổi một pixel nào) | P0 | AL-00 |
| M146 | Giữ bằng chứng soát | — | — | — | — | — | 99 MB tờ khung nằm trong `games/.wt-ts-audit/tmp/audit/` và sẽ mất khi gỡ worktree | Chép sang `games/typing-survival/tmp/alive-audit-0111/` | P1 | AL-00 |

### 2.15 Đếm theo mức

| Khu | P0 | P1 | P2 | Cộng |
|---|---|---|---|---|
| 2.1 Luồng, tải, chuyển màn | 3 | 3 | 1 | 7 |
| 2.2 Title, menu, cài đặt | 6 | 9 | 4 | 19 |
| 2.3 Hành trình | 6 | 4 | 0 | 10 |
| 2.4 Kết trận, kết quả | 5 | 3 | 0 | 8 |
| 2.5 Gõ chữ | 6 | 7 | 0 | 13 |
| 2.6 Thẻ súng | 5 | 3 | 1 | 9 |
| 2.7 HUD | 2 | 14 | 4 | 20 |
| 2.8 Súng | 7 | 4 | 0 | 11 |
| 2.9 Quái | 3 | 11 | 3 | 17 |
| 2.10 Nhân vật | 2 | 2 | 1 | 5 |
| 2.11 Thế giới | 11 | 7 | 0 | 18 |
| 2.12 Đạo diễn | 1 | 3 | 0 | 4 |
| 2.13 Âm hệ thống | 4 | 2 | 1 | 7 |
| 2.14 Nền | 3 | 1 | 0 | 4 |
| **Cộng** | **64** | **73** | **15** | **152** |

Theo gói:

| Gói | P0 | P1 | P2 | Cộng |
|---|---|---|---|---|
| AL-00 Nền | 3 | 1 | 0 | 4 |
| AL-01 Host màn hình | 4 | 3 | 0 | 7 |
| AL-02 Đường âm | 2 | 3 | 1 | 6 |
| AL-03 Nội dung âm | 4 | 2 | 0 | 6 |
| AL-04 Nhạc | 3 | 1 | 0 | 4 |
| AL-05 Gõ chữ | 5 | 6 | 0 | 11 |
| AL-06 Thẻ súng | 5 | 3 | 1 | 9 |
| AL-07 HUD | 2 | 14 | 2 | 18 |
| AL-08 Súng | 6 | 4 | 0 | 10 |
| AL-09 Quái | 3 | 10 | 1 | 14 |
| AL-10 Thế giới | 11 | 6 | 0 | 17 |
| AL-11 Đạo diễn | 5 | 5 | 0 | 10 |
| AL-12 Title, menu | 3 | 3 | 4 | 10 |
| AL-13 Hành trình, kết quả | 6 | 5 | 1 | 12 |
| AL-14 Bảng nhanh | 0 | 5 | 0 | 5 |
| AL-15 Heroine, drone | 1 | 2 | 2 | 5 |
| AL-16 Stage 2–4 | 1 | 0 | 3 | 4 |

### 2.16 Đối chiếu với mã (để không sót sự kiện hay màn nào)

Soát ngày 01/11 trên `main` `1679ea6`. `src/view/coverage/` (AL-00) dựng từ ba bảng này; một loại mới trong mã mà không có dòng ở đây thì test trượt.

**Sự kiện của sim** (`src/sim/events.ts`, 33 loại):

| EV | Dòng |
|---|---|
| `shot` 1 | M083, M084 |
| `hit` 2 | M068, M090, M091, M102 (giáp) |
| `kill` 3 | M067, M082, M098, M099, M101, M102 |
| `breach` 4 | M062, M095, M119 |
| `foeShot` 5 | M096 |
| `shotDown` 6 | M097, M111 |
| `playerHit` 7 | M062, M110 |
| `keyOk` 8 | M045, M046, M053 (phím đầu khóa bay), M054, M149 (chữ ẩn) |
| `keyBad` 9 | M049, M050 (không bay nào khớp), M065, M149 (lộ chữ) |
| `word` 10 | M048, M060 (bay đầy), M064, M147 (hoàn hảo), M150 |
| `load` 11 | M048, M055, M059 |
| `beamStart` 12, `beamPulse` 13, `beamEnd` 14 | M085 |
| `spawn` 15 | M092 |
| `end` 16 | M036, M037, M071 |
| `drain` 17 | M063, M106 |
| `support` 18 | M078, M111 |
| `pace` 19 | M132 (surge vào và ra), M138 (stem nhạc theo mức) |
| `volley` 20 | M086 |
| `charge` 21, `rail` 22 | M087 |
| `launch` 23 | M088 |
| `burst` 24 | M089 |
| `shieldHit` 25, `shieldBreak` 26 | M103, M134 |
| `split` 27 | M104 |
| `telegraph` 28 | `surge`: M132, M069; `rift`: M074, M131; `horn`: M100 |
| `leader` 29 | M100 |
| `objective` 30 | M073 (Hunt; Hold dùng đồng hồ M076) |
| `rift` 31 | M074, M131 |
| `plan` 32 | không hiện ra màn (việc nội bộ của planner) |
| `retreat` 33 | M071 |

**Thay đổi của dải gõ không có EV** (`typing-feel.ts`, loại của kit `TypingFxKind`): `advance` M045; `wrong` M049; `stray` M050; `done` M048, M147, M150; `back` M148; `release` M148, M053; chữ ẩn (`mask`) M149.

**Màn và lớp phủ:**

| Trong mã | Dòng |
|---|---|
| Loader (`index.html`, trước `main.ts`) | M001 |
| `Screen` ở `main.ts:177`: `title` | M008–M014 |
| `settings` (Options) | M015 |
| `armory` | M016 |
| `profile` | M017 |
| `pause` (cả tự dừng) | M025 |
| `intro` (thẻ stage) | M033, M034 |
| `end` (thẻ kết quả) | M038–M043 |
| `JourneyScreen` ở `journey.ts:91`: `stages`, `briefing`, `loadout` | M026–M032 |
| Bảng nhanh của kit: Settings, Sound, đếm 3-2-1, các điều khiển | M018–M021, M152 |
| Lớp HUD trong trận: dải chữ, bay, hull, combo, kills, đồng hồ, banner, thẻ quái mới, mục tiêu, chip rift, số sát thương | M044–M080 |
| Thông báo trong trận (`hud.ts:384`) | M077 (gợi ý), M151 (cảnh báo) |
| Trial (vào thẳng từ title) | M035 |
| `src/app/dev.ts` | chỉ cho dev, không vào host chơi |

## 3. Gói việc

### 3.0 Luật chung cho mọi gói

- **Worktree và nhánh:**
  - Mỗi gói một worktree `games/.wt-ts-al<nn>` trên nhánh `ts-al<nn>`, tách từ `main` sau khi đợt trước đã gộp.
  - Chỉ sửa các tệp gói đó giữ trong bảng §4.2. Cần đụng tệp của gói khác thì báo điều phối, không tự sửa.
  - Không gửi tin nhắn cho agent workflow đang chạy; chuyển việc qua file hoặc bước sau.
- **Không đổi sim** (§1.4):
  - Kit chỉ đổi ở `shared/game-kit` rồi chạy `pnpm kit:sync --target games/typing-survival`; mỗi đợt nhiều nhất một gói chạy kit:sync. Không sửa tay `src/kit/`.
  - Gói nào cũng phải giữ đạt `pnpm check`, ván vàng `s0-trace` và hash 152 lượt chương.
- **Hoạt ảnh chạy theo đồng hồ khung của trang** (`now`), không dùng CSS keyframes. Đây là quy ước của `strip.ts`: nhờ vậy kịch bản giữ đồng hồ chụp được từng khung.
- **Mỗi sự kiện mới:**
  - thêm một dòng vào tệp phủ của chính gói, `src/view/coverage/al<nn>.ts`, có id VFX, id SFX và số dòng M của §2; không sửa tệp phủ của gói khác;
  - âm phát qua `audio.cue(id, { pan, rate, gain })` của AL-00.
  - Id đã có âm mã thì giữ âm đó tới khi file đạt, và ghi nợ. Id mới im tới khi file đạt. **Không viết âm mã mới** (`AGENTS.md`: âm là file thật).
  - Id mới được AL-03 thêm vào `docs/audio/THEME_SOUND_LIST.md` (`AGENTS.md` của game). Gói gửi tên id cho làn AL-03, không tự sửa tệp đó.
- **Phiếu VFX** (`AGENTS.md`, `VFX_STANDARD.md`) ghi đủ năm thứ: chuẩn (VFX_STANDARD, năm pha), ảnh tham chiếu (tờ trong `E:juice/sheets/` hay `E:combat/`), loại hành động, kịch bản chụp, số nghiệm thu.
- **Tệp dùng chung mà nhiều gói cần** đi qua sổ đăng ký AL-00 dựng ở đợt 0, mỗi gói chỉ sửa module của mình:
  - `warm.ts` (shader), `probes.ts` và `src/app/dev.ts` (tay cầm cho kịch bản);
  - `scripts/visual/scenarios/survival-alive.mjs` nạp cảnh từ `scripts/visual/scenarios/alive/<gói>.mjs`;
  - token màu và thời gian DOM ở `theme-<khu>.css` theo khu (`tests/theme.test.ts` đọc cả nhóm);
  - kịch bản chụp có sẵn (`survival-s1-stage.mjs`, `survival-feel-guns.mjs`, …) thì chỉ chạy; cần cảnh mới thì thêm tệp cảnh riêng.
- **Hình:**
  - luật bloom: chỉ lõi mảnh HDR 3–6 được bloom, quầng giữ ≤ 0,9. Không chỉnh bloom, tone mapping hay exposure chung;
  - màu tín hiệu theo §1.4; chữ người chơi đọc bằng tiếng Anh;
  - bản giảm chuyển động cho mọi lớp (G8).
- **Media:**
  - không vào Git; đẩy bằng `pnpm media:push`;
  - giấy phép ghi vào `docs/games/THIRD_PARTY.md`;
  - art qua `game-art-pipeline`, âm qua `AUDIO_PIPELINE.md`;
  - quái dùng lại trước (`MONSTER_MODEL_INVENTORY.md`).
- **Ảnh chụp:**
  - để dưới `tmp/` của worktree, chạy qua `.local/bin/heavy.sh --gpu`;
  - đo hiệu năng bằng `heavy.sh --perf`, bật và tắt từng lớp, ở High và Ultra, dpr 1 và 2;
  - chấm xong thì xóa ảnh thô của mình bằng `node tools/capture-prune/prune.mjs <thư mục>` (chạy thử trước, rồi `--apply`); giữ tờ khung và JSON.
- **Chấm:**
  - theo §1.2; không quá 3 người kiểm song song, mỗi làn một lượt kiểm;
  - giám khảo chấm bản build của host chơi bằng phím thật;
  - kịch bản đo được dùng tay cầm `debug` trên bản dev, nhưng tờ khung để chấm phải lấy từ bản build không cờ.
- **Changelog:** mỗi gói viết `docs/changelog/2026-11-<dd>-al<nn>-<chủ đề>.md`, ghi các dòng M đã sửa, số đo trước và sau, và phần còn nợ.

### AL-00 · Nền: bảng phủ trong mã, thước đo "sống", tách tệp (P0, đợt 0)

- **Dòng:** M143–M146 (P0 3, P1 1).
- **Skill:**
  - `game-ui-ux-review` (bằng chứng phải nhìn thấy);
  - `game-vfx-layered` §6 (kịch bản chụp, VFX_STANDARD §4.5);
  - `game-ci-resumable` (worktree, nhánh).
- **Cách làm:**
  1. **Cue bus** trong `combat.ts`: `on(kind, fn)`. Phản ứng mới của mọi gói nằm ở tệp của gói đó; `combat.ts` chỉ còn điều phối. Cùng lúc tách các phần thường bị sửa ra tệp riêng, giữ nguyên hành vi:
     - `explode`/`gather` sang `src/view/kills.ts`, cùng cái chết lớn (`ShotFx.bigKill`, `CLOUD`) đang ở `shots.ts`;
     - `number()` sang `src/view/damage-numbers.ts`;
     - từ `gunfx.ts`: phần khiên, Leader, Splitter (`EV.shieldHit`, `shieldBreak`, `split`, `leader`) sang `src/view/foe-fx.ts`; phần mục tiêu, telegraph, rift (`EV.objective`, `telegraph`, `rift`) sang `src/view/stage-fx.ts`. `gunfx.ts` chỉ còn súng.
  2. **`src/view/coverage/`** (`index.ts` gộp, mỗi gói một tệp `al<nn>.ts`, danh sách nợ cũng theo gói) và `coverage.test.ts`:
     - Một dòng cho mỗi loại EV hiện ra màn hình (32 loại; trừ `plan` là việc nội bộ; `pace` tính là surge), theo bảng §2.16.
     - Một dòng cho mỗi sự kiện UI: vào và ra màn, dời focus, select, back, deny, đổi giá trị, kéo slider, bật tắt, Mute, mở và đóng bảng, đếm ngược, sao, đếm số, NEW BEST, mở khóa, lắp súng, khóa và nhả bay, Backspace, chữ ẩn và lộ chữ, từ hoàn hảo, bay đầy, phím lạc, lên và đứt combo, banner, thẻ quái mới, mục tiêu, 10 s cuối, hull thấp, thông báo trong trận, tự dừng.
     - Mỗi dòng ghi id VFX, id SFX, gói giữ và dòng M.
     - Test trượt khi một EV mới, một `Screen` mới hay một `TypingFxKind` mới không có dòng. Danh sách nợ (âm mã, hình chưa có) là ảnh chụp, chỉ được co lại.
  3. **`audio.cue(id, opts?)`** trong `theme-audio.ts`, `opts = { pan?, rate?, gain? }` (`rate` cho tick có cao độ của AL-05): một cửa cho mọi âm mới. Id chưa có thì im và ghi nợ. Chỉ thêm hàm này; phần còn lại của `src/audio` thuộc AL-02.
  4. **Tách tệp (thuần chuyển chỗ):**
     - `hud.ts` thành `hud.ts` (khung, `protectedRects`, thông báo), `hud-bays.ts`, `hud-panels.ts`, `hud-banners.ts`;
     - `survival.css` thành `screens.css`, `intro.css`, `results.css`, `journey.css`, `hud.css`, `bays.css`, `strip.css`, `quick.css` (skin bảng nhanh);
     - `theme.css` giữ token chung; token riêng của từng khu sang `theme-<khu>.css` cùng tên khu với CSS ở trên;
     - `screens.ts` thành `screens.ts` (title, Options, Armory, Profile, Pause), `screen-intro.ts` (thẻ stage), `screen-end.ts` (thẻ kết quả);
     - `items()` và `view()` của `main.ts` sang `src/app/screen-items.ts`, để các gói màn hình ở đợt 3–4 không phải sửa `main.ts`;
     - `scripts/ui-art/selection.json` và `src/view/ui-art.json` tách theo khu (`screens`, `intro`, `results`, `journey`, `hud`, `bays`, `strip`, `quick`); `prepare.mjs` và `ui-art.ts` đọc cả nhóm, `ui-art.ts` vẫn là nơi duy nhất dựng URL ảnh;
     - sổ đăng ký cho `warm.ts`, `probes.ts`, `dev.ts` và cảnh của `survival-alive.mjs` (§3.0).
  5. **Giao diện nhân vật bắn** ở `src/view/pilot.ts`, theo "giao diện Pilot" của QUALITY_RESCUE §4.7 (`muzzle`, `core`, `kick`, `cue`, `hurt`, `boost`, `drawFx`), cộng hai hook cho các gói sau: `shield(dir)` (cú trúng của quái, M095, M096, M106, M110) và `pose(name)` (`idle`, `win`, `lose`). Đặt tên kiểu là `PilotRig`, vì `ship.ts:27` đã có `type Pilot = "vanguard" | "draconis"` (lựa chọn tàu). Hằng `MUZZLE` và `PILOT_COLORS` chuyển sang `pilot.ts`. `Ship` cài `PilotRig`, không đổi pixel nào. `combat.ts`, `typing-feel.ts`, `type-fx.ts`, `gunfx.ts`, `shots.ts`, `beams.ts` nhận `PilotRig` thay vì `Ship`. Xem §4.3.
  6. **Kịch bản `scripts/visual/scenarios/survival-alive.mjs`**, dựng từ công cụ của các bản soát:
     - bot đọc từ trên bay: `/private/tmp/claude-501/-Users-toandx-htdocs-typing-game/f97baf5f-4f81-4f84-8ec0-79083d7e3ba9/scratchpad/hud-driver.mjs` (có ngày 01/11). Scratchpad mất khi khởi động lại máy hay hết phiên, nên điều phối chép nó sang `games/typing-survival/tmp/alive-audit-0111/tools/` ngay, trước khi đợt 0 bắt đầu; AL-00 đưa bản đã dọn vào `scripts/visual/`;
     - `E:sound/tools/{cdp.mjs,instrument.js,play.mjs,mix.py,timeline.py}`.

     Kịch bản đo:
     - Bản đồ chuyển động nghỉ theo vùng (G1, G3).
     - Bộ phát hiện cắt cứng và đếm số lần tải trang (G2).
     - Khung từ sự kiện tới phản hồi (G4).
     - Ghép tờ khung ở 720 và 1080.
     - Kiểm cổng DevTools trống và trang đầu là `about:blank`, như các bản soát.
  7. **Chép tờ khung và JSON** từ `E:` sang `games/typing-survival/tmp/alive-audit-0111/` để bằng chứng sống lâu hơn worktree `.wt-ts-audit` (`tmp/` đã nằm trong `.gitignore`, không vào Git).
- **Media:** không.
- **Nghiệm thu:**
  - `pnpm check` đạt; trace và hash như cũ.
  - `coverage.test.ts` có đủ dòng của §2.16 và trượt khi thử thêm một EV giả.
  - `Ship` qua kiểu `PilotRig` mà không có ép kiểu; ngoài `main.ts` và `probes.ts`, không module nào còn import từ `ship.ts` (hôm nay có 8 module).
  - Ảnh khác 0 pixel so với `main` ở `survival-s0-frames`, `survival-layout` và `survival-typefx`, cùng đồng hồ giữ.
  - `survival-alive.mjs` đo lại được số của các bản soát, lệch ≤ 10 %: title 0 cặp đổi; vùng bên của thế giới 1,4–4,2 mức xám/s; 3 lần tải trang trên đường chơi.
- **Kịch bản chụp:** `survival-alive.mjs` ở chế độ `idle`, `flow`, `events`, cả 720 và 1080.
- **Phụ thuộc:** không. **Công:** khoảng 2–2,5 ngày (thêm tách màn, `PilotRig`, sổ đăng ký).

### AL-01 · Một host màn hình, không tải lại trang, chuyển cảnh (P0, đợt 1)

- **Dòng:** M001–M006, M040 (P0 4, P1 3).
- **Skill:** `game-ui-ux-review`; `game-art-pipeline` (art cho loader); `threejs-*` (dựng lại thế giới và renderer tại chỗ, giải phóng tài nguyên GPU).
- **Tệp:**
  - `src/app/main.ts`, `menu.ts`, `journey.ts`, `screen-items.ts` (từ AL-00);
  - mới: `src/app/screen-host.ts`, `transitions.ts`, `loader.ts`;
  - `src/view/screens.ts`, `screen-intro.ts`, `screen-end.ts`, `screens-journey.ts`: chỉ phần host và đường nối;
  - `screens.css` và `journey.css`: chỉ lớp chuyển cảnh;
  - `index.html`;
  - `src/view/scene.ts`: chỉ thêm `Stage.reset()`.
- **Cách làm:**
  1. **Host màn hình** dựng mỗi màn một lần:
     - mỗi hàng có khóa; đổi trạng thái thì chỉ đổi class và chữ;
     - thanh focus là một phần tử riêng, dời bằng transform;
     - chuyển màn 12–18 f theo M002. Màn mới chỉ vào khi ảnh của nó đã `decode()`. Rảnh thì nạp trước ảnh của màn kế.
  2. **Bỏ `reload()`:** `restart(run)` bỏ thế giới cũ, tạo `World` mới bằng đúng đường cũ, gọi `stage.reset()`; renderer, `AudioContext` và nhạc giữ nguyên.
     - Đường phóng 0,6–1 s (M003) và đường Retry, Main menu (M004).
     - Đổi bậc đồ họa thì dựng lại renderer sau màn che 0,4 s (M005).
  3. **Loader** (M001): vòng tiến độ đi theo các promise thật (font, ảnh title, đợt model đầu); hòa vào title trong 20–30 f.
  4. **Nhạc và giọng:** gọi `audio.snapshot()` của AL-02. Ba chỗ gọi `speakEnglish` trong `main.ts` (`:213`, `:568`, `:646`) đổi sang `voice.say()` của AL-02. Hai gói cùng đợt nên điều phối nối các dòng gọi đó khi gộp.
  5. **Phím trong lúc chuyển cảnh** không mất: nó bỏ qua phần còn lại của chuyển cảnh. Giảm chuyển động thì hòa 150 ms.
- **Media:**
  - khung vòng tiến độ vẽ (phiếu ảnh qua `game-art-pipeline`; logo và tranh hố đen đã có);
  - whoosh và servo từ AL-03 lô 3.
- **Nghiệm thu:**
  - Số lần tải trang bằng 1 trên đường: title → stage 1 → kết quả → Retry → kết quả → Main menu → stage 2 (đếm `Page.frameNavigated`).
  - G2 trên mọi lần đổi màn.
  - Khung đầu của mỗi màn đã có ảnh.
  - Nút nhạc không dừng và chạy lại lúc vào stage (đo bằng tap âm).
  - Sau 10 lần chơi lại: heap sau GC tăng ≤ 5 MB, số geometry và texture về mức nền (FEEL §6).
  - Trace và hash không đổi.
  - Hai giám khảo ≥ 8,5 cho clip đi hết đường chơi.
- **Kịch bản chụp:** `survival-flow.mjs` mới, ở 720 và 1080, bản build, phím thật; `survival-s0-boot.mjs` sửa theo.
- **Phụ thuộc:** AL-00. **Công:** khoảng 2–3 ngày.

### AL-02 · Âm: đường file và cấu trúc mix (P0, đợt 1)

- **Dòng:** M051, M136, M139–M142 (P0 2, P1 3, P2 1).
- **Skill:** `game-art-pipeline` (`references/audio.md`); `docs/games/AUDIO_PIPELINE.md` §6.
- **Tệp:**
  - `src/audio/**`; ở `music.ts` chỉ phần định tuyến bus;
  - mới: `src/audio/voice.ts` (`voice.say(text)`: chờ 150 ms sau đầu tiếng `word.load` gần nhất, hạ bus phím trong lúc đọc, gọi `speakEnglish` của kit hay file giọng theo Q5);
  - bản đầu của `public/assets/typing-survival/audio/manifest.json` (rỗng, có schema và test ở `src/audio/manifest.ts`); từ khi AL-02 gộp, chỉ làn AL-03 sửa tệp này;
  - `.gitignore`: thêm `!public/assets/typing-survival/audio/` và `!public/assets/typing-survival/audio/manifest.json`, như manifest model; mọi `.ogg` vẫn bị bỏ qua.
  - Không đổi kit. `FileBank` của kit dùng nguyên như hiện có; nếu kit thiếu gì thì xếp sang đợt 5.
  - Cần một dòng ở tệp của gói khác cùng đợt, điều phối nối khi gộp: `type-fx.ts` (AL-05) truyền `destination: () => audio.bus("keys")` cho `TypingSounds` (hôm nay tiếng phím đi thẳng ra loa, `type-fx.ts:79`); `main.ts` (AL-01) gọi `voice.say`.
- **Cách làm:**
  1. **Bảng âm từ manifest:**
     - biến thể, cao độ ±2 %, ngẫu nhiên theo nhóm;
     - decode theo ưu tiên: id P0 của trận decode xong trước khi trận bắt đầu;
     - id chưa có file thì dùng âm mã của id đó.
  2. **Độ trễ:** `AudioContext({ latencyHint: "interactive" })`, ghi lại `baseLatency`. Âm bắt đầu ngay trong handler của sự kiện.
  3. **Bus:** keys, ui, alerts, shots, hits, kills, music, ambience, voice.
     - Limiter tổng −1 dBTP.
     - Send vang không gian lớn: IR CC0, ghi `THIRD_PARTY`.
     - Snapshot: menu, fight, surge, pause, end (`audio.snapshot(name)`).
     - Ducking:
       - phím −8 dB khi đọc;
       - nhạc −4 dB khi đọc (theo tài liệu game);
       - nhạc −3 dB trong 200–400 ms quanh big kill;
       - `word.load` chuyển sang bus hạ sâu hơn.
     - Giọng chờ 150 ms sau đầu tiếng `word.load` (AUDIO_PIPELINE §6.2, Q7).
  4. **Nâng ngay các âm mã không nghe được** (M142) lên −20…−26 dBFS ở mức mặc định. Thêm shelf cho dải giữa ở âm mã và nhạc mã trong lúc chờ file (M139).
  5. **Bus ambience** độc lập với âm lượng nhạc (M141); nội dung đến từ AL-03 lô 4.
- **Media:** IR vang CC0 (file vào Drive bằng `pnpm media:push`, không vào Git).
- **Nghiệm thu:**
  - Các bài AUDIO_PIPELINE §6.1.
  - `git check-ignore` vẫn bỏ qua mọi file âm dưới `public/assets/typing-survival/audio/`, chỉ manifest được theo dõi.
  - Đỉnh ≤ −1 dBTP ở Effects 100 %.
  - Cảnh báo và gồng ở −20…−26 dBFS.
  - Phím thấp hơn 8 dB khi đọc, đo được; giọng bắt đầu ≥ 150 ms sau đầu tiếng `word.load`.
  - Tap âm cho thấy âm bắt đầu cùng khung với sự kiện.
  - 0 lần decode giữa trận.
  - Số âm còn dùng mã do `src/view/coverage/` liệt kê.
  - Chủ dự án nghe bản mix trên Listening Board và chấm ≥ 8,5.
- **Kịch bản chụp:** `survival-audio-mix.mjs` mới, dựng từ công cụ `E:sound/tools/`; chạy campaign stage 1 ở 1280×720 và Trial ở 1920×1080.
- **Phụ thuộc:** AL-00. **Công:** khoảng 1,5–2 ngày.

### AL-03 · Âm: nội dung theo lô (làn media, chạy suốt các đợt)

- **Dòng:** M023, M052, M091, M108, M112, M137 (P0 4, P1 2), cộng phần SFX của mọi dòng khác ở §2.
- **Skill:** `game-art-pipeline` (`references/audio.md`, judging); `AUDIO_PIPELINE.md` §4–§5 (critic L1–L6, vòng tạo, luật dừng), §6.4 (vai trò tần số).
- **Tệp:**
  - `public/assets/typing-survival/audio/manifest.json`: chỉ làn này sửa, từ khi AL-02 (đợt 1) đã gộp bản đầu có schema; trước đó take đạt nằm ở `~/AudioLab/work/typing-survival/` kèm danh sách chờ ingest; mỗi lần ingest một commit (chỉ JSON, file âm lên Drive bằng `pnpm media:push`);
  - `docs/audio/THEME_SOUND_LIST.md`;
  - `docs/games/audio/firefly/typing-survival.md` (thêm hàng mới);
  - `AUDIO_PIPELINE.md` §8.3 (sửa sang hướng B).
- **Tên id:** id đã có trong mã và `THEME_SOUND_LIST.md` giữ tên cũ, để âm mã và file thay nhau trên cùng id: `ui.move` (hover), `alarm.surge` (siren của surge), `foe.split`, `key.ok` (Relay), `music.calm`, `music.surge`. `star.get` được thay bằng `star.1/2/3` (M039) và bỏ khi AL-13 gộp. Chỉ âm mới có tên mới.
- **Lô theo thứ tự cần:**
  - **Lô 1** (bắt đầu đợt 0, cần cho đợt 1–2): `word.load`, `word.perfect`, `word.full`, `word.whoosh`, `key.glyph`, `key.bad` (glass crack), `key.stray`, `key.back`, `key.reveal`, `bay.release`, `streak.up`, `streak.break`, `bay.lock`, `gun.xung`, `gun.xung.tail`, `gun.tia.start/loop/end/pulse`, `gun.tan.fire`, `gun.ray.armed/charge/fire`, `gun.phao.launch/whistle/burst`, `hit.t1/t2/t4/armour/sub/tail`, `kill.swarm`, `kill.chime`, `kill.elite`, `kill.big`. Bản ứng viên 1c đã có ở `~/AudioLab/work/typing-survival/{hit.t1,hit.t2,hit.t4,hit.sub,hit.tail}`.
  - **Lô 3, UI** (bắt đầu đợt 0, cần cho AL-01 ở đợt 1): `ui.move` (hover, 6 biến thể), `ui.select`, `ui.back`, `ui.deny`, `ui.value`, `ui.toggle`, `ui.mute`, `notice.warn`, `screen.whoosh`, `panel.open/close`, `title.sting`, `launch.riser`, `deploy.sting`, `countdown.tick/go`, `star.1/2/3`, `star.miss`, `stat.tick`, `stamp.newbest`, `stage.unlock`, `loadout.equip`, `bay.latch`, `pause.in/out`.
  - **Lô 2, quái và đòn** (đợt 2, cần cho đợt 3): `foe.spawn`, `horde.bed`, `brute.step`, `foe.windup`, `line.zap`, `leader.horn`, `leader.beacon`, `leader.down`, `foe.shot`, `foe.shot.down`, `shield.hit/break`, `foe.split`, `rift.warn/tick/open`, `hurt.hull/breach/drain`, `lowhull.loop`, `support.repair`, `objective.tick`, `newfoe.sting`, `clock.tick`, `banner.swish`, `combo.tier`.
  - **Lô 4, thế giới** (đợt 2, cần cho đợt 2–4): `amb.abyss`, `amb.blackhole`, `amb.station`, `lamp.relay`, `gate.machine`, `falls.roar`, `shuttle.pass`, `line.hum`, `alarm.surge`, `surge.horn`, `surge.riser`, `surge.end`, `end.win`, `end.lose`, `allclear.chime`, `rift.groan`, `rift.tear`.
  - **Giọng** (Q5): khoảng 20 câu của người dẫn, tiếng của heroine, tiếng drone; từ vựng để sau.
  - **Tiếng phím** (Q4): bộ mặc định đạt 9; Relay (`key.ok`) thành file, cũng ở mức 9 vì là tiếng phím.
- **Cách làm:**
  - Công cụ theo Q3: Firefly, hoặc Stable Audio 3 (chủ dự án đã cho phép).
  - Cổng critic L1–L6, rồi chủ dự án nghe mù trên Listening Board. Sau 2 vòng không lên thì đổi cách: thư viện CC0; không đưa Sonniss vào AI đám mây.
  - **Họ âm hướng B:** vòng glyph, tinh thể, kính, súng sentinel.
  - **Luật dải tần:**
    - sub chỉ dưới 120 Hz;
    - dải 1–4 kHz chỉ ở đầu tiếng, tắt trong ≤ 30 ms;
    - đuôi nằm dưới 1 kHz hoặc trên 4 kHz.
  - **Âm lặp nhiều** có 4–8 biến thể.
  - Mỗi âm ghép đầu tiếng, thân và đuôi. Giới hạn số đuôi chồng nhau theo họ súng.
- **Nghiệm thu:**
  - Qua cổng critic. Chủ dự án nghe mù ≥ 8,5 cho từng lô; tiếng phím ≥ 9.
  - Trong game: gõ ≥ 90 WPM trong 5 phút không mỏi tai (chủ dự án nghe).
  - Có dòng `THIRD_PARTY` và id trong `THEME_SOUND_LIST.md`.
- **Kịch bản chụp:** Listening Board; `survival-audio-mix.mjs` sau mỗi lần ingest.
- **Phụ thuộc:** Q3, Q4, Q5; AL-02 để gắn (file làm trước được). **Công:** theo lô, mỗi lô khoảng 1–2 ngày tạo và một buổi nghe.

### AL-04 · Nhạc (P0, media từ đợt 0, mã ở đợt 4)

- **Dòng:** M013, M024, M043, M138 (P0 3, P1 1).
- **Skill:** `game-art-pipeline` (audio); `AUDIO_PIPELINE.md` §8.3 (sửa sang hướng B).
- **Tệp:** `src/audio/music.ts`; media trong manifest qua làn AL-03.
- **Cách làm:**
  - **Nội dung:**
    - theme title 60–90 s lặp liền, có stems, và logo sting;
    - biến thể cho hành trình và briefing, lớp "armory" cho Loadout;
    - stems chương 1: calm, pressure, surge, peak, ở 96 BPM, La thứ;
    - riser 1,5 s cùng horn và taiko cho surge;
    - stinger thắng và thua 3–4 s; vòng nhạc kết quả.
  - **Chất liệu:** orchestra lai synth, có tinh thể (hướng B).
  - **Mã:**
    - stems đổi đúng ô nhịp theo mức pace; lớp đỉnh khi surge;
    - hòa 0,8–1,2 s khi đổi màn;
    - nhạc nối từ menu vào trận (cần AL-01).
- **Media:** Stable Audio 3, hoặc MIDI với bộ phát mẫu (AUDIO_PIPELINE §8.3). Chủ dự án nghe mù.
- **Nghiệm thu:**
  - Mỗi stem −16 LUFS.
  - Dải 200 Hz–4 kHz ≥ 40 % năng lượng [H].
  - Dải động trong một stage ≥ 6 LU [H] (hôm nay 1,3–1,9).
  - Surge to hơn calm 2 dB.
  - Điểm lặp không có tiếng click.
  - Chủ dự án ≥ 8,5.
- **Kịch bản chụp:** `survival-audio-mix.mjs` (dòng thời gian mức theo pha).
- **Phụ thuộc:** AL-02, AL-01; Q3. **Công:** media khoảng 2–3 ngày, mã khoảng 1 ngày.

### AL-05 · Cảm giác gõ dùng chung, mức 9 (P0, đợt 1)

- **Dòng:** M044–M050, M147–M150 (P0 5, P1 6).
- **Skill:**
  - `game-vfx-layered`, loại hành động "phím";
  - `game-ui-ux-review`;
  - luật `SHARED_SYSTEMS_BAR.md`;
  - `docs/games/TYPING_BREAK_STUDY.md` (T1–T16) và `docs/games/TYPING_FEEDBACK_REVIEW.md` §20 (host mode).
- **Tệp:**
  - ở repo cha: `shared/game-kit/feedback/typing-fx/**` và test, `tools/typing-feedback-lab/**`;
  - ở game: `src/kit/**` chỉ qua `kit:sync` (gói kit:sync duy nhất của đợt 1);
  - `src/view/type-fx.ts`, `typing-feel.ts`, `type-rules.ts`, `strip.ts` (chỉ phần skin tấm chữ của host), `strip.css`, `theme-strip.css`;
  - `hud-bays.ts`: chỉ thêm hàm đọc `targetRect(bay)` (ô băng, đích của chữ bay ở bước 2); đợt 1 chưa gói nào giữ tệp này;
  - không sửa `src/audio/type-audio.ts` (thuộc AL-02 ở đợt 1): tick có cao độ đi qua `audio.cue(id, { rate })`.
- **Cách làm:**
  1. **Kiểu "Load" mới cho host mode.** Last Line bật; các game khác không đổi (Q2).
     - Chuỗi bước của M045 theo bảng E1, với hình của ta (§1.4).
     - Lõi trắng ≤ 30 %; vòng tối rgba(20,12,12,.85).
     - Khung đầu ≥ 95 % đỉnh.
  2. **Chữ bay vào đích** (M048). Host đưa `targetRect(bay)`, tức ô băng của bay, và kit bay chữ thành một dòng có ribbon trong f3–12. Khi chữ tới, kit gọi `onArrive(bay)`; AL-06 làm cú đập của ô, còn trong lúc chờ thì ô lóe trắng.
  3. **Tấm word-plate vẽ** (M044): skin do host đưa vào, cắt 9 mảnh. Art word-plate của game đã có; chấm ở cỡ thật trước khi dùng.
  4. **Phím sai, phím lạc và các bước khác của dải chữ** (kit, cùng kiểu "Load"):
     - phím sai và phím lạc theo E2 (M049, M050); bóng chữ lạc quay lại trong host mode, do kit vẽ;
     - từ hoàn hảo (M147): dấu FLAWLESS và sợi trắng trên ribbon; kit đã nhận cờ `perfect` ở `progress("done", …)`;
     - Backspace và nhả khóa (M148): bước `back` và `release` có hình riêng thay cho mờ nhanh;
     - chữ ẩn (M149): skin ô kính do host đưa vào, thay ký tự `MASK_CHAR` ("_"); lộ chữ và gõ đúng chữ ẩn có hai bước khác nhau;
     - nghĩa và IPA (M150): nhịp riêng sau f12, không bay theo chữ.
  5. **Phía game:**
     - `typing-feel.ts`: vòng phím nhỏ lại và tối đi 60–80 % trong 6–8 f khi xong từ (M047); tia phím có đầu sáng chạy tới lõi trong 2–3 f (M046, Q1);
     - `type-rules.ts`: `POP` theo đường cong stamp của kit.
  6. **Âm:**
     - mỗi chữ `audio.cue("key.glyph", { rate })` theo nốt ngũ cung (`NOTE_HZ` ở `type-rules.ts`);
     - chữ cuối có `word.whoosh` (f0–6); từ hoàn hảo thêm `word.perfect`;
     - phím sai `key.bad`; phím lạc `key.stray`; Backspace `key.back`; nhả khóa `bay.release`; lộ chữ `key.reveal`;
     - `type-fx.ts` truyền `destination` là bus phím của AL-02 cho `TypingSounds` (một dòng, điều phối nối khi gộp).
- **Media:** art word-plate (đã có, phải đạt 8,5 ở cỡ thật, không thì ra phiếu); art ô kính chữ ẩn, tấm FLAWLESS, chip IPA (phiếu ảnh, chấm ở cỡ thật trong dải chữ); âm lô 1.
- **Nghiệm thu:**
  - Hai giám khảo cùng ≥ 9, không hạng mục con nào dưới 8,5 (SHARED_SYSTEMS_BAR §4); chủ dự án ký (Q2).
  - Phím tới hình ≤ 1 khung (p95 ≤ 18 ms); khung đầu ≥ 95 % đỉnh.
  - Xong từ tới đạn ≤ 50 ms (≤ 70 ms khi đang dừng hình).
  - Không hạt nào đè chữ chưa gõ; tương phản ≥ 7:1.
  - Ở 10 phím/s: ≤ 12 billboard và vệt (FEEL §6); 60 FPS ở 15 phím/s.
  - Khung phát: ở f0–6 sau khi xong từ, vùng nòng sáng hơn vòng phím (đo bằng `survival-feel-guns`).
  - Tỉ lệ gõ sai khi chơi thật không cao hơn hôm nay.
  - Nghĩa đọc được ≥ 600 ms ở ≥ 7:1 sau mỗi từ (M150); chữ ẩn không còn ký tự "_" trong host chơi (M149); Backspace và nhả khóa có hình ở khung của phím (M148).
  - Có bản giảm chuyển động.
- **Kịch bản chụp:**
  - lab `tools/typing-feedback-lab`, đặt cạnh `E:juice/sheets/w-kingtype.jpg` và `w-fateword.jpg`;
  - stage 4 (Missing letters) cho M149;
  - trong game: `survival-typefx.mjs`, `survival-feel.mjs`, `survival-s1-latency.mjs` ở 720 và 1080;
  - chơi thật bằng bot của AL-00.
- **Phụ thuộc:**
  - AL-00, Q1, Q2, âm lô 1;
  - AL-06 làm cú đập của ô băng ở đợt 2;
  - AL-15 đổi đích tia sang `FX_CORE`.
- **Công:** khoảng 4–5 ngày (thêm M147–M150), chưa kể các vòng chấm.

### AL-06 · Thẻ súng sống (P0, đợt 2; gồm L8 cũ)

- **Dòng:** M053–M061 (P0 5, P1 3, P2 1).
- **Skill:** `game-ui-ux-review`; `game-art-pipeline` (icon chấm ở cỡ thật, hàng 28–32 px); `game-vfx-layered` (lóe viền).
- **Tệp:** `src/view/hud-bays.ts`, `bays.css`, `theme-bays.css`, phần bay của `ui-art`.
- **Cách làm:**
  - Số đo theo các dòng M053–M061, chạy theo đồng hồ khung.
  - **Viền khóa:** sprite viền vẽ, nhuộm theo màu súng, không phải hình CSS.
  - **Chữ đầu đóng dấu** dùng hằng `STAMP_S` của kit, kẹp trong ô của nó.
  - **Chữ chờ sống** theo đặc tả L8 (QUALITY_RESCUE §3, dưới bảng đợt 2).
  - **Ô băng:**
    - đập khi nhận `onArrive(bay)` của AL-05;
    - nhích khi bắn, theo trạng thái `is-firing`;
    - nguội khi hết đạn;
    - băng từ từ hoàn hảo có đầu tinh thể (M059, M147).
  - Nhả khóa đảo lại viền khóa trong 6 f (M053, M148). Chữ ẩn trên bay dùng art ô kính của AL-05 (M056, M149).
  - Cửa chớp FULL, chip khóa.
- **Media** (phiếu ảnh, chấm ở cỡ thật, trong đúng chỗ UI):
  - sprite viền và halo;
  - tấm "FULL";
  - trạng thái ô sáng, ô cạn, viên cuối;
  - icon reload.
  - Âm `bay.lock`, `word.full` từ lô 1.
- **Nghiệm thu:**
  - Hai giám khảo ≥ 8,5 trong host chơi.
  - Đo trên tờ khung:
    - viền khóa ở f0 ≥ 95 % đỉnh, 6 px, vượt thẻ 10 %, về 2 px ở f6;
    - ép 6 f, trống 4 f;
    - ô đập 1,4→1 trong 7 f;
    - nhích 1,5 px trong 3 f.
  - Chữ ≥ 7:1 cả ở khung lóe.
  - Tỉ lệ gõ sai không tăng.
  - Khung JS tăng ≤ 0,3 ms.
  - Có bản giảm chuyển động.
- **Kịch bản chụp:** `survival-typefx.mjs`; chuỗi trạng thái bay trong `survival-alive.mjs`; tờ so với `E:hud/sheets/compare-word-cycle-typingbreak-vs-bay.jpg`.
- **Phụ thuộc:** AL-00, AL-05 (đã gộp ở đợt 1). **Công:** khoảng 2 ngày.

### AL-07 · HUD: bảng, banner, số (P0 hull, còn lại P1; đợt 3)

- **Dòng:** M062–M078, M151 (P0 2, P1 14, P2 2).
- **Skill:** `game-ui-ux-review`; `game-art-pipeline`; `game-vfx-layered` (lóe, tách RGB).
- **Tệp:**
  - `src/view/hud.ts` (khung, `protectedRects`, thông báo), `hud-panels.ts`, `hud-banners.ts`, `hud.css`, `theme-hud.css`;
  - `stage-fx.ts`: chỉ phần mục tiêu (`EV.objective`, M073); telegraph và rift để AL-11 ở đợt 4;
  - `strip.ts`: đèn chuỗi sạch, chip rift, vạch quái gần;
  - `damage-numbers.ts`; `gun-rules.ts`, chỉ bảng `POP` và `LIFE` của số;
  - `feel-bloom.ts`, chỉ pass tách RGB;
  - phần HUD của `ui-art`.
- **Cách làm:**
  - Theo từng dòng.
  - **Số sát thương** theo E6: dồn theo quái, tối đa 6–8 số, không vào vùng chữ, vùng bảo vệ thêm banner, thẻ quái mới và chip rift.
  - **Mỗi loại banner** có vào và ra riêng.
  - **Hull:** thanh bóng, số lăn, rung bảng, nêm đỏ ở mép; nhịp tim khi hull thấp (không nháy đỏ).
  - **Combo:** đồng hồ có bậc, vòng accuracy, chuỗi kills.
  - **Chip rift** có đồng hồ tròn; vạch quái gần đổi thành chevron vẽ.
  - **Đồng hồ trận:** 10 s cuối.
  - **Thông báo trong trận** (M151): tấm cảnh báo art, vào và ra 8 f, giữ thứ tự ưu tiên của `main.ts:841` (đọc, không sửa `main.ts`).
  - **Gói sửa giáp:** tìm vì sao gói không ra trong 4 lượt chơi (đọc luật director, không đổi sim; nếu là lỗi sim thì báo điều phối).
- **Media** (phiếu ảnh):
  - khung bậc combo (bronze, silver, gold, plasma), vòng accuracy, tấm đếm chuỗi;
  - tấm toast, dấu "NEW THREAT", chân dung quái (render từ GLB của ta), plate thắng và plate thua;
  - lớp kính nứt (dùng chung với AL-11), vết nứt mép màn khi hull thấp;
  - chevron, art phím bàn phím, khung đồng hồ rift, tấm cảnh báo (M151).
  - Âm từ lô 1, lô 2 và `notice.warn` của lô 3.
- **Nghiệm thu:**
  - Hai giám khảo ≥ 8,5.
  - Thanh bóng 24 f; rung bảng 4 px, tắt trong 8 f.
  - Hull thấp: độ sáng lệch ≤ 10–15 %, ≤ 2 lóe toàn màn/s.
  - Số sát thương ≤ 8; 0 số trong vùng chữ và vùng bảo vệ (kiểm tự động); f0 2,3× ±0,2.
  - Banner vào trong ≤ 8–10 f và không che chữ đang gõ.
  - Chữ HUD ≥ 7:1; có bản giảm chuyển động.
- **Kịch bản chụp:** `survival-layout.mjs` (vùng chữ nhật), `survival-s1-hazards.mjs` (rift), `survival-s1-stage.mjs` (banner, mục tiêu Hunt), chuỗi HUD của `survival-alive.mjs` (cảnh `alive/al07.mjs`, có phím mang dấu IME tiếng Việt cho M151, `vietnameseInputSign` ở `input.ts:30`).
- **Phụ thuộc:** AL-00, AL-06 (đã gộp), âm lô 2. **Công:** khoảng 3 ngày.

### AL-08 · Súng: năm pha, flipbook, màu riêng (P0, đợt 2; thay L5, L6, L9, L10)

- **Dòng:** M081–M090 (P0 6, P1 4).
- **Skill:**
  - `game-vfx-layered` (VFX_STANDARD §3, §5.6);
  - `game-art-pipeline` (Firefly Video cho flipbook);
  - tài liệu `~/.agents/skills/threejs-aaa-graphics-builder/references/{technical-art,shader-cookbook}.md`.
- **Tệp:**
  - `src/view/shots.ts`, `beams.ts`, `gunfx.ts` (sau AL-00 chỉ còn súng), `gun-rules.ts`, `fx.ts`, `bolts.ts`, `lights.ts`;
  - `kills.ts`, chỉ màu; `theme.ts` (bảng `BLOW` của súng và kill; gói duy nhất sửa nó ở đợt 2);
  - mới: `src/view/flipbooks.ts` và các module shader, mỗi module tự đăng ký vào `warm.ts`.
  - Muzzle, kick và cue chỉ qua `PilotRig` (AL-00), để AL-15 thay tàu mà không đụng lại phần súng.
- **Cách làm:**
  - Quy cách từng súng của QUALITY_RESCUE §3 (dưới bảng đợt 2), cộng đích ở các dòng M084–M089 và bảng E5.
  - Mỗi súng đủ năm pha, làm phía người bắn trước.
  - Flipbook theo danh sách L10:
    - lóe nòng, tóe tia, cầu lửa 6×6 ở 1024²;
    - khói;
    - dải lửa 512×128 liền mép, dải điện.
  - Khói ăn mòn bằng nhiễu; kill mang màu súng; ánh của quái là tím.
  - Giữ hợp đồng `DECK_LIGHTS` để vũng sáng của súng vẫn chiếu lên sàn mới của AL-10.
- **Media:**
  - clip Firefly Video do Claude làm trong tab của chủ dự án (không tốn credit), chuyển qua `tools/vfx-flipbook`; chấm trong game, không chấm clip rời;
  - âm súng từ lô 1.
- **Nghiệm thu:**
  - VFX_STANDARD §5.6; mỗi súng hai giám khảo ≥ 8,5 trong host chơi.
  - Chung: khung đầu ≥ 95 %; trắng xóa ≤ 6 %; lõi ≤ 30 % trắng.
  - Theo súng:
    - Heat Beam: FWHM ≤ 30 px ở 11 m (1080p), bão hòa ≥ 0,6;
    - Star Mortar: cầu lửa 2,5 m ±10 %;
    - Pulse Gun: đầu đạn ≥ 28×8 px ở 1080p;
    - Scatter Gun: thấy được quạt ±18°;
    - Rail Gun: thấy nạp trong 1 khung sau khi xong từ.
  - Phím tới đạn ≤ 50 ms.
  - Hiệu năng:
    - kho hiệu ứng và ≤ 60 draw call theo FEEL §6;
    - khung JS tăng ≤ 1 ms;
    - cổng `survival-s1-perf`; số chương trình shader đứng yên sau 5 s đầu.
- **Kịch bản chụp:** `survival-s1-guns.mjs`, `survival-feel-guns.mjs`, `survival-vfx-pair.mjs`.
  - Ở 720 và 1080, camera chơi và cận cảnh, nền sáng và nền tối.
  - Tờ có cột pha A, R, T, I, F.
  - Ảnh tham chiếu cho phiếu: `E:juice/sheets/w-fatezoom.jpg` (xong từ ra phát súng), `E:juice/sheets/w-cubekill.jpg` (cú trúng), và tờ của chính súng đó trong `E:combat/sheets/`.
- **Phụ thuộc:**
  - AL-00;
  - AL-05 cho phần chấm khung phát;
  - âm lô 1;
  - danh sách flipbook (câu O6 cũ của QUALITY_RESCUE, nếu còn mở).
- **Công:** khoảng 4–5 ngày, chưa kể ngày tạo flipbook.

### AL-09 · Quái: đi, ra đòn, chết vỡ thành mảnh (P0, đợt 3)

- **Dòng:** M092–M103, M105, M106 (P0 3, P1 10, P2 1).
- **Skill:**
  - `game-vfx-layered` (loại đòn của quái và cái chết);
  - `game-art-pipeline` (dùng lại quái; `MONSTER_MODEL_INVENTORY.md`);
  - `docs/games/CHARACTER_ANIMATION.md` (đám đông, mức 9);
  - `threejs-*` (instancing, texture hoạt ảnh).
- **Tệp:**
  - `src/view/crowd.ts`, `chunks.ts`, `hazard-fx.ts` (drain, dải đỏ), `models.ts`;
  - `kills.ts` (cái chết, cả cái chết lớn AL-00 đã chuyển từ `shots.ts`);
  - `foe-fx.ts` (khiên, Leader, Splitter; AL-00 đã chuyển từ `gunfx.ts`); mới: `foe-anim.ts`;
  - `theme.ts`: chỉ `BLOW.spawn`, `drain`, `shardHot`, `shardSteel` (sang màu phe); gói duy nhất sửa `theme.ts` ở đợt 3;
  - manifest model (gói duy nhất sửa nó ở đợt 3).
  - Cú trúng vào người chơi (breach, đạn Scout, drain) gọi `PilotRig.shield(dir)` và `hurt()`: trên tàu hôm nay, trên khiên drone khi AL-15 vào (§4.3).
- **Cách làm:**
  1. **Đổi quân sang họ `cosmic` của Space** (14 model; concept §1.8, inventory §1). Hạ viền vàng, trừ ở Leader. Brute có khối và giáp.
  2. **Chu kỳ đi và bò:** rig lại trong Blender hoặc dùng nền Mesh2Motion (CC0), rồi bake vào texture hoạt ảnh cho đám đông có instancing; các con lệch pha nhau.
  3. **Gồng, lao, đập** vào hàng rào Line, gọi API `line.hit(x)` của AL-10. Scout bắn với tell.
  4. **Cái chết:**
     - mảnh cắt sẵn cho từng model (Blender cell fracture, của ta);
     - shader cháy tàn dọc theo gân;
     - big kill giữ các lớp hiện có, đổi sang màu phe.
  5. **Pack Leader, Elite, Shield Guard** theo các dòng M100–M103.
  6. **Cổng xuất hiện:** dùng cổng mà AL-10 dựng.
- **Media:**
  - GLB họ `cosmic` (build từ bản gốc `art-src/3d` của Space vào manifest của Last Line);
  - GLB mảnh vỡ; clip hoạt ảnh;
  - texture vòm khiên.
  - Âm lô 2.
- **Nghiệm thu:**
  - Mỗi loại quái hai giám khảo ≥ 8,5 ở camera chơi.
  - Chuyển động đám đông hai giám khảo ≥ 9; chủ dự án ký.
  - Cái chết tan trong 6–10 f; tối đa 40 mảnh trên làn; gộp kill thành bùng √N.
  - Gồng ≥ 0,5 s; tell của Scout 200–300 ms.
  - Màu: đỏ chỉ ở sát Line; tím chỉ ở quái.
  - Hiệu năng:
    - FEEL §6: tam giác thêm ≤ 250.000 lúc đỉnh, `flood(700)` p95 ≤ 14 ms;
    - cổng `survival-s1-perf`.
- **Kịch bản chụp:**
  - `survival-horde-look.mjs`;
  - `survival-s1-hazards.mjs`, `survival-s1-stage.mjs` (Leader, khiên);
  - cận cảnh 1:1 ở 1080, đặt cạnh `E:combat/stills/C-foes-1080-1to1.jpg`;
  - ảnh tham chiếu cho phiếu cái chết: `E:juice/sheets/w-cubekill.jpg`, `w-blockkill.jpg`, `w-housekill.jpg`, `w-housekillzoom.jpg`.
- **Phụ thuộc:** AL-08 (màu trong `kills.ts`), AL-10 (cổng, Line), âm lô 2. **Công:** khoảng 5–7 ngày, vì hoạt ảnh phải đạt 9.

### AL-10 · Thế giới map 1 (P0, đợt 2)

- **Dòng:** M113–M129 (P0 11, P1 6).
- **Skill:**
  - `game-map-concept`: dựng theo concept; thứ tự sự sống trước, rồi nền và ánh sáng, rồi mốc, rồi trang trí;
  - `game-art-pipeline` (thẻ vẽ, giấy phép);
  - `game-vfx-layered` (thác, lóe plasma).
- **Bước 0 (từ đợt 0, chỉ media):** chốt đích hình (M129).
  - ChatGPT ở Chat mode, High, vẽ try3 trên ảnh nền do chủ dự án đính kèm.
  - Hai giám khảo chấm theo bảng giá trị của concept §4.5, mỗi người ≥ 8,5.
  - Gộp góp ý của ChatGPT (8,0) vào concept.
- **Tệp:**
  - `src/view/scene.ts` thành chỗ ráp;
  - mới: `src/view/world/{abyss,blackhole,ring,deck,dais,line,parapet,gate,outriggers,falls,shuttles,atmo,lightrig,palette}.ts`; màu thế giới ở `world/palette.ts`, không sửa `theme.ts` (AL-08 giữ ở đợt 2);
  - `feel-bloom.ts`, chỉ phần AA;
  - manifest model (gói duy nhất sửa nó ở đợt 2).
- **Cách làm:**
  - Theo bộ K1–K14 của concept §2.1 và các dòng M113–M128. Bỏ sọc cảnh báo.
  - API cho các gói sau:
    - `line.hit(x)`, `line.threat(v)`;
    - `lamps.pulse(from, to)`;
    - `rim.flare()`;
    - `queue.press(v)`;
    - `disk.flare()`.
  - Sàn mới vẫn nhận `DECK_LIGHTS`.
- **Media:**
  - thẻ alpha của Broken Ring (ChatGPT) và thẻ công trình xa (ứng viên ở phiếu 125);
  - albedo sàn (phiếu 125, chấm trước khi dùng); normal và roughness ambientCG (CC0); decal (phiếu 125);
  - mesh Blender: lan can, cổng, pháo đài, trụ;
  - tàu con thoi (tàu Space đổi màu); Kenney Smoke (CC0);
  - âm lô 4.
- **Nghiệm thu:**
  - Hai giám khảo ≥ 8,5 cho khung đã dựng. Đặt cạnh tranh đã duyệt và bảng tham chiếu, ở 1280×720 và 1920×1080, ở High (mặc định) và Ultra, không cờ URL.
  - Bảng giá trị:
    - dải trống trên-trái luma ≈ 0,32 ±0,05;
    - giữa phía trên ≤ 0,2;
    - trung bình khung ≈ 0,25 ±0,03;
    - 0 % đỏ ở vùng tập trung khi nghỉ;
    - cam chỉ ở vực;
    - khối 40 px sáng nhất nằm ở dải Ring.
  - G3.
  - Làn: chữ ≥ 7:1, trắng xóa ≤ 6 %.
  - AA ở High ≤ 0,3 ms; cổng hiệu năng theo Q6.
  - Mesh người chơi thấy gần (lan can, cột, dais, cổng, pháo đài) ≥ 2.000 tam giác và giữ normal, roughness theo `MODEL_QUALITY.md` (`AGENTS.md`, 29/10); cắt chỉ khi đo thấy vỡ ngân sách khung, theo thứ tự của tài liệu đó.
- **Kịch bản chụp:**
  - `survival-world.mjs` mới: bản đồ chuyển động nghỉ ở 1280 và 1920, bảng giá trị, ảnh cắt theo vùng so với concept (như `E:world/sheets/compare-zones-built-vs-concept-1280.jpg`);
  - `survival-s1-perf.mjs`.
- **Phụ thuộc:** AL-01 (`Stage.reset()`), bước 0, Q6, âm lô 4. **Công:** khoảng 6–8 ngày.

### AL-11 · Đạo diễn: thẻ stage, sự kiện thế giới, camera, thời gian, kết trận (P0, đợt 4)

- **Dòng:** M033–M037, M131–M135 (P0 5, P1 5).
- **Skill:** `game-vfx-layered`; `game-map-concept` (thế giới phản ứng); `game-ui-ux-review`.
- **Tệp:**
  - mới: `src/view/director.ts`, nghe qua cue bus các sự kiện `pace` (surge), `telegraph`, `rift`, `leader`, `objective`, `retreat`, `end`, `breach`;
  - mới: `src/view/camera-director.ts`: cú quét, lắc nghỉ, FOV punch, ngân sách rung, dừng hình;
  - `scene.ts`, chỉ phần camera;
  - `src/app/main.ts`: nhịp kết ở `settle()`, thẻ stage và cú quét ở `enterFight()`, truyền id stage cho AL-16;
  - `src/view/screen-intro.ts`, `intro.css`, `theme-intro.css` (thẻ stage, M033);
  - `stage-fx.ts` (telegraph, rift; AL-00 đã chuyển từ `gunfx.ts`), `hazard-fx.ts` (rift);
  - `gun-rules.ts`, chỉ bảng trauma và dừng hình;
  - đọc `settings.shakeLevel` mà AL-12 thêm ở đợt 3; không sửa `settings.ts`.
  - Tư thế thắng, thua gọi `PilotRig.pose("win" | "lose")`; tàu hôm nay không làm gì với hook này, AL-15 cài nó.
  - Khi AL-13 gắn âm sao (M039), bỏ dòng `audio.gun("star.get", …)` ở `main.ts:224`; điều phối nối khi gộp.
- **Cách làm:**
  - Kịch bản theo từng dòng; gọi API của AL-10, banner của AL-07, gồng của AL-09.
  - Chậm chỉ ở hình: sim không chậm theo và phím không mất.
  - Rung theo Eiserloh, đo xong mới chốt, giữ dưới trần FEEL §6.
- **Media:** lớp kính nứt (dùng chung với AL-07); âm lô 4; stem đỉnh của AL-04.
- **Nghiệm thu:**
  - Mỗi khoảnh khắc (vào stage, surge, rift, Leader, thắng, thua) hai giám khảo ≥ 8,5 trên clip.
  - Surge báo trước 2,5 s; đèn 3 nhịp, mỗi nhịp 0,6 s, cách 0,4 s.
  - Cú quét 2,5 s, phím nào cũng bỏ qua được và phím đó không mất.
  - Dừng hình 50–80 ms; phím tới đạn ≤ 70 ms khi đang dừng.
  - Rung p95 ≤ 3 px, tối đa ≤ 8 px ở 1080p.
  - ≤ 2 lóe toàn màn/s; nhịp kết ≤ 2 s rồi tới thẻ.
  - Giảm chuyển động: không quét, không chậm, không rung.
- **Kịch bản chụp:** `survival-director.mjs` mới: chạy stage có kịch bản ở 720 và 1080 (vào stage, surge 1, rift ở s3, Leader ở s2, thắng, thua).
- **Phụ thuộc:**
  - AL-10, AL-07, AL-09, AL-01;
  - phần heroine của thắng và thua làm trong AL-15.
- **Công:** khoảng 3–4 ngày.

### AL-12 · Title và menu (P0, đợt 3)

- **Dòng:** M007–M011, M014–M017, M025 (P0 3, P1 3, P2 4).
- **Skill:** `game-ui-ux-review`; `game-art-pipeline` (tách lớp key art, tranh 1920 và 2560).
- **Tệp:**
  - `src/view/screens.ts` (title, Options, Armory, Profile, Pause);
  - mới: `src/view/title-scene.ts` (các lớp, shader đĩa, hạt);
  - `screens.css`, `theme-screens.css`;
  - `src/app/menu.ts` (thanh focus, thứ tự hàng), `screen-items.ts` (hàng của title, Options, Armory, Profile, Pause; ẩn "Resume" ở lần chơi đầu, thêm "Exit to portal");
  - `src/app/settings.ts`: mức rung Off, Low, Normal (`shakeLevel`, đổi từ cờ `screenShake` có sẵn, đọc được bản lưu cũ; cả `quickValues`), hàng của nó trong Options và hàng game "Screen shake" của bảng nhanh ở `src/app/quick.ts` (toggle thành lựa chọn); AL-11 chỉ đọc;
  - `src/app/main.ts`: chỉ hook chậm dần của Pause và tự dừng (M025) và nhánh `shake` của `quickChange`; đợt 3 không gói nào khác giữ `main.ts`;
  - `src/app/portal.ts`; phần màn hình của `ui-art`.
- **Cách làm:**
  - **Key art** đã duyệt tách thành lớp: nền và đĩa, heroine và áo choàng, drone, mảnh vụn tiền cảnh, logo. Dùng ChatGPT hoặc Gemini để tách hay vẽ lại các lớp; chấm như mọi tranh.
  - **Lớp shader đĩa** khớp với tranh; thêm hạt.
  - **Hàng menu** theo M010. Options (M015): ở đợt 3 vẽ nền console, vì đợt 3 không có kit:sync; nếu chọn gộp vào bảng nhanh của kit thì việc đó sang AL-14 ở đợt 5.
  - **Armory:** súng xoay. Cho tới khi có model súng cầm tay, dùng vòng bắn với VFX của AL-08 trên bệ tối.
  - Profile, Pause, thoát về portal.
- **Media:** các lớp title; nền bệ hoặc console; huy hiệu hạng; icon portal; khung đồ thị của Profile; tranh 1920 và 2560. Tách lớp heroine và drone chỉ sau khi bản vẽ bốn hướng của workflow nhân vật đã duyệt (§4.3), để title không lệch model trong trận.
- **Nghiệm thu:**
  - Hai giám khảo ≥ 8,5 cho title (clip nghỉ 10 s) và cho menu.
  - G1, G2.
  - Sting phát cùng khung với phím đầu.
  - Chữ menu ≥ 7:1; có bản giảm chuyển động.
- **Kịch bản chụp:** `survival-s0-menu.mjs`, `survival-ui-art.mjs`, chế độ nghỉ của `survival-alive.mjs`.
- **Phụ thuộc:** AL-01, âm lô 3, sting của AL-04. **Công:** khoảng 3 ngày.

### AL-13 · Hành trình và kết quả (P0, đợt 4)

- **Dòng:** M022, M026–M032, M038, M039, M041, M042 (P0 6, P1 5, P2 1).
- **Skill:** `game-ui-ux-review`; `game-art-pipeline`.
- **Tệp:** `src/view/screens-journey.ts`, `screen-end.ts` (thẻ kết quả), `journey.css`, `results.css`, `theme-journey.css`, `theme-results.css`, `src/app/results.ts`, `src/app/journey.ts`, `screen-items.ts` (chỉ hàng của thẻ kết quả), phần hành trình của `ui-art`.
- **Cách làm:**
  - Bản đồ chương. Khoảnh khắc mở khóa dùng cờ "đã xem" trong bản lưu, không phải sim.
  - Briefing có chip và chân dung quái mới.
  - Loadout: súng bay vào ổ, báo ổ đầy, sửa lỗi "UNCOVERED".
  - Kết quả: thẻ vào, số đếm lên, sao đồng bộ với âm, dấu NEW BEST, danh sách từ.
  - Thẻ thua có gợi ý; sửa lỗi Accuracy; tooltip vẽ.
- **Media:**
  - tranh bản đồ chương (lấy từ concept map nếu đạt), trạng thái nút, xích;
  - trạng thái sao; chân dung quái (dùng chung với AL-07); icon luật; ổ súng; tấm tooltip.
- **Nghiệm thu:**
  - Hai giám khảo ≥ 8,5.
  - Đếm số 500 ms; phím bất kỳ đếm xong ngay.
  - Âm của mỗi sao lệch ≤ 1 khung so với khung sao bừng.
  - Mũi tên không phát lại sao.
  - Có test cho luật Accuracy.
  - G1, G2.
- **Kịch bản chụp:** `survival-s1-loadout.mjs`, `survival-s1-first-run.mjs`, `survival-s1-stage.mjs` (màn kết quả), `survival-alive.mjs`.
- **Phụ thuộc:** AL-01, âm lô 3, AL-07 (chân dung). **Công:** khoảng 3 ngày.

### AL-14 · Bảng nhanh và đếm ngược (P1, đợt 5)

- **Dòng:** M018–M021, M152 (P1 5).
- **Skill:** `game-ui-ux-review`; `docs/games/IN_GAME_SETTINGS.md`.
- **Tệp:**
  - ở repo cha: `shared/game-kit/ui/quick-settings/**`;
  - ở game: `src/kit/**` qua kit:sync (gói kit:sync của đợt 5), `src/app/quick.ts`, `quick.css`, `theme-quick.css`.
- **Cách làm:**
  - Bảng mở và đóng trong 10 f, blur nền tăng dần, focus trượt.
  - Điều khiển theo M152: fill slider, toggle, Mute, lựa chọn, vòng chờ của danh sách bộ phím. (Hàng "Screen shake" đã thành lựa chọn ở AL-12; gói này không sửa `settings.ts` hay `main.ts`.)
  - Âm qua các hook sẵn có.
  - Chữ xem trước lớn gấp 3; đồng hồ mức khi nghe thử.
  - Số đếm ngược đập vào; "GO".
  - Game khác chỉ nhận thay đổi khi đồng bộ lần sau; ghi vào `shared/game-kit/DRIFT.md`.
- **Media:** âm lô 3; art loa tắt (đã có `hud-sound-muted`), vòng chờ nhỏ.
- **Nghiệm thu:** hai giám khảo ≥ 8,5; fill chạy 6 f, toggle 8 f, không điều khiển nào đổi trong 1 khung; `pnpm kit:check` đạt; các mục kiểm của IN_GAME_SETTINGS §5; G2; có bản giảm chuyển động.
- **Kịch bản chụp:** `survival-quick-panels.mjs`.
- **Phụ thuộc:** âm lô 3. Nếu AL-15 cần sửa kit ở đợt 5 thì AL-14 lùi sang đợt 6. **Công:** khoảng 1–1,5 ngày.

### AL-15 · Heroine và drone vào trận (P0, đợt 5, khi có model)

- **Dòng:** M012, M080, M109–M111 (P0 1, P1 2, P2 2). Gói này cũng đổi đích của M046 và M083 (nòng thật) và làm phần heroine của M036, M037.
- **Skill:**
  - `game-character-design` (đã làm ở workflow nhân vật);
  - `game-hero-presence-vfx`;
  - `game-vfx-layered`;
  - `docs/games/CHARACTER_ANIMATION.md` (mức 9).
- **Đầu vào:**
  - Heroine, drone và 5 súng cầm tay đạt 8,5. Đang làm ở workflow `wf_33a34adc-e49`, theo cách B + D, phần dính thân theo C (`docs/games/CHARACTER_DESIGN_GUIDE.md` §7).
  - Kết quả lab presence trên nhánh `ts-presence-lab` `2a924d7`: các lớp, công thức, chi phí từng lớp.
- **Tệp:**
  - `src/view/ship.ts` thay bằng `hero.ts` và `drone.ts`, cả hai cài `PilotRig` của AL-00 (QUALITY_RESCUE §4.7); `pilot.ts` chỉ thêm, không đổi chữ ký;
  - tìm nòng theo bay trong `shots.ts` và `beams.ts`;
  - `typing-feel.ts` (tia vào `FX_CORE`);
  - `main.ts:94`; manifest model;
  - `screen-items.ts`: hàng "Ship" của Options và dòng trạng thái "SHIP …" của title (M012) đổi theo nhân vật; `?pilot=` của các kịch bản đổi theo.
- **Cách làm:**
  - QUALITY_RESCUE §4.5–4.7 và concept §1.7.
  - Lớp presence theo lab.
  - Drone: khiên khi bị trúng, đón gói sửa, vạch ngắm đạn Scout.
  - Tư thế thắng và thua nối vào hook của AL-11.
  - Tiếng rên từ AL-03.
  - Hình nộm Mannequin chỉ dùng trong lab `?debug=1`, không bao giờ vào host chơi.
- **Nghiệm thu:**
  - Model ≥ 8,5; presence ≥ 8,5 ở cỡ thật (68 px ở 720).
  - Animation hai giám khảo ≥ 9, chủ dự án ký.
  - Mỗi súng đủ năm pha ở nòng thật.
  - Trace và hash không đổi.
  - `survival-s1-perf` có `programsSteady`.
  - `survival-feel`: khung f8 và nền dưới dòng chữ tăng ≤ +0,02.
  - Chấm lại các dòng đã đạt trên tàu mà hình nằm ở nhân vật (§4.3): M046, M047, M083–M089 (pha A và R ở nòng), M095, M096, M106, M036, M037. Dòng nào tụt dưới 8,5 thì sửa trong gói này.
  - `survival-layout.mjs` đạt: nhân vật nằm trong cột trống 324 px (`hud.ts:66`), không bay hay banner nào phải dời.
- **Kịch bản chụp:** `survival-feel-ship.mjs` (đổi sang heroine), `survival-s1-guns.mjs`, cảnh thắng và thua của `survival-director.mjs`, `survival-layout.mjs`.
- **Phụ thuộc:** model đạt (§4.3); AL-05, AL-08, AL-09, AL-11 đã gộp. **Công:** khoảng 8–10 ngày (QUALITY_RESCUE §4.3, bước 4–7).

### AL-16 · Mỗi stage một dáng; đặc tả Splitter và boss (P0, đợt 5)

- **Dòng:** M079, M104, M107, M130 (P0 1, P2 3).
- **Skill:** `game-map-concept`; `game-vfx-layered`.
- **Tệp:** `src/view/world/stages/{s2,s3,s4}.ts` và thẻ của chúng. Không đổi sim hay content; id stage do AL-11 truyền vào.
- **Cách làm:**
  - Concept §6.1–6.3:
    - s2 Herald Monolith: ăng-ten sáng vàng khi Leader đến (hook của AL-11);
    - s3 Torn Span (tường rift);
    - s4 Aegis Array.
  - Ánh ấm dần theo stage.
  - Splitter, Shard, boss: chỉ đặc tả, dựng khi stage của chúng có.
- **Media:** tranh concept đã duyệt cho từng stage; thẻ alpha; mesh.
- **Nghiệm thu:**
  - Mỗi stage hai giám khảo ≥ 8,5, đặt cạnh tranh của nó.
  - Các stage khác nhau đo được, xa hơn hẳn mức 0,3–2,6 mức xám của hôm nay.
  - Đạt hiệu năng.
- **Kịch bản chụp:** `survival-world.mjs` với `SCENES=s2,s3,s4`.
- **Phụ thuộc:** AL-10, AL-11, tranh concept từng stage. **Công:** khoảng 2–3 ngày mỗi stage.

### AL-17 · Nghiệm thu toàn game (sau đợt 5)

- **Dòng:** cả 152 dòng.
- **Skill:** `game-art-pipeline` (chấm mù hai giám khảo), `game-ui-ux-review`, `game-vfx-layered` §6 (tờ năm pha), `AUDIO_PIPELINE.md` (nghe mù).
- **Kịch bản chụp:** `survival-alive.mjs` (`idle`, `flow`, `events`), `survival-director.mjs`, `survival-audio-mix.mjs`, `survival-s1-perf.mjs`, ở bản build không cờ; ảnh thô xóa bằng `capture-prune` sau khi chấm.
- **Cách chạy:**
  - Đi hết title, chương 1 từ s1 tới s4, màn kết quả và Trial.
  - Ở 1280×720 và 1920×1080; High (mặc định) và Ultra; một lượt giảm chuyển động.
  - Host chơi bản build (`typing-game.local`), không cờ URL.
- **Chấm:**
  - Hai giám khảo mù cho mỗi khu của §2.
  - Mức 9 cho gõ chữ, tiếng phím, hoạt ảnh đám đông và hoạt ảnh heroine.
  - Chủ dự án nghe, rồi xem một clip.
- **Cổng:**
  - `coverage.test.ts` hết nợ: mọi dòng có file âm và VFX; không còn id nào phát âm mã.
  - G1–G9; FEEL §6 và `survival-s1-perf`.
  - Sổ nợ QUALITY_RESCUE §6 cập nhật.
  - Changelog tổng.

## 4. Thứ tự chạy

### 4.1 Các đợt

Mỗi đợt có hai hay ba gói mã chạy song song trong worktree riêng, mỗi gói giữ tệp riêng (§4.2). Gộp hết đợt này rồi mới tách nhánh cho đợt sau. Làn media chạy song song suốt và vượt trước một đợt, vì không gói nào được gắn media chưa đạt.

| Đợt | Gói mã chạy song song | Làn media song song | Điều kiện vào |
|---|---|---|---|
| 0 | **AL-00** nền; **AL-03** (bắt đầu lô 1 và lô 3, không đụng mã) | AL-10 bước 0 (try3 trên ảnh nền); AL-04 phác theme và stems; flipbook L10 (Firefly Video) | Q1–Q7 có câu trả lời là tốt nhất; Q3 là bắt buộc để bắt đầu âm |
| 1 | **AL-01** host và không tải lại; **AL-02** đường âm; **AL-05** gõ chữ (gói kit:sync duy nhất) | lô 1 vào nghe mù; lô 3 xong; lô 2 bắt đầu | AL-00 đã gộp |
| 2 | **AL-06** thẻ súng; **AL-08** súng; **AL-10** thế giới | lô 2; lô 4; tranh bản đồ chương; các lớp title | Đợt 1 đã gộp; AL-10 cần bước 0 đạt và Q6 |
| 3 | **AL-07** HUD; **AL-09** quái; **AL-12** title và menu | stems nhạc vào nghe mù; chân dung quái | Đợt 2 đã gộp |
| 4 | **AL-11** đạo diễn; **AL-13** hành trình và kết quả; **AL-04** mã nhạc | tranh concept stage 2–4 | Đợt 3 đã gộp |
| 5 | **AL-14** bảng nhanh (kit:sync); **AL-16** stage 2–4; **AL-15** heroine và drone, khi model đạt | — | Đợt 4 đã gộp. AL-15 chỉ vào khi qua cổng model ở §4.3; chưa qua thì AL-15 thành đợt 6. Nếu AL-15 cần sửa kit thì AL-14 lùi sang đợt 6 |
| cuối | **AL-17** nghiệm thu | — | Mọi gói đã gộp |

Mỗi đợt nhiều nhất 3 người kiểm, mỗi làn một lượt kiểm. Người chấm thứ hai chỉ cho điểm sát ngưỡng (theo luật kiểm song song gọn).

### 4.2 Ai giữ tệp nào (để các worktree không đụng nhau)

| Tệp hay vùng | Đ0 | Đ1 | Đ2 | Đ3 | Đ4 | Đ5 |
|---|---|---|---|---|---|---|
| `src/app/main.ts` | AL-00 (chuyển `items()`, `view()`; `PilotRig`) | AL-01 (dòng `voice.say` của AL-02 qua điều phối) | — | AL-12 (hook Pause, tự dừng, nhánh `shake` của `quickChange`) | AL-11 (bỏ `star.get` cho AL-13 qua điều phối) | AL-15 (`:94`) |
| `src/app/screen-items.ts` | AL-00 (chuyển từ `main.ts`) | AL-01 | — | AL-12 (title, Options, Armory, Profile, Pause) | AL-13 (thẻ kết quả) | AL-15 (hàng Ship, dòng trạng thái) |
| `src/app/menu.ts` | — | AL-01 | — | AL-12 | — | — |
| `src/view/screens.ts`, `title-scene.ts`, `screens.css`, `theme-screens.css` | AL-00 (tách) | AL-01 (host) | — | AL-12 | — | — |
| `src/view/screen-intro.ts`, `intro.css`, `theme-intro.css` | AL-00 (tách) | AL-01 (host) | — | — | AL-11 | — |
| `src/view/screen-end.ts`, `results.css`, `theme-results.css` | AL-00 (tách) | AL-01 (host) | — | — | AL-13 | — |
| `src/view/screens-journey.ts`, `src/app/results.ts`, `src/app/journey.ts`, `journey.css`, `theme-journey.css` | AL-00 (tách CSS) | AL-01 (host) | — | — | AL-13 | — |
| `index.html`, `src/app/{screen-host,transitions,loader}.ts` | — | AL-01 | — | — | — | — |
| `src/app/portal.ts` | — | — | — | AL-12 | — | — |
| `src/app/settings.ts` | — | — | — | AL-12 (`shakeLevel`, `quickValues`) | — | — |
| `src/app/quick.ts` | — | — | — | AL-12 (hàng shake) | — | AL-14 |
| `src/view/scene.ts` | — | AL-01 (`reset`) | AL-10 | — | AL-11 (camera) | — |
| `src/view/world/**` | — | — | AL-10 | — | — | AL-16 (`stages/`) |
| `src/view/combat.ts` | AL-00 | — | — | — | — | — |
| `src/view/pilot.ts` | AL-00 | — | — | — | — | AL-15 (chỉ thêm) |
| `src/view/ship.ts`, `ship-rules.ts` | AL-00 (cài `PilotRig`) | — | — | — | — | AL-15 (thay bằng `hero.ts`, `drone.ts`) |
| `src/view/kills.ts` | AL-00 (tách, cả `bigKill`) | — | AL-08 (màu) | AL-09 | — | — |
| `src/view/damage-numbers.ts` | AL-00 (tách) | — | — | AL-07 | — | — |
| `src/view/gun-rules.ts` | — | — | AL-08 | AL-07 (`POP`, `LIFE` của số) | AL-11 (trauma, dừng hình) | — |
| `src/view/theme.ts` (bảng `BLOW`) | — | — | AL-08 | AL-09 (`spawn`, `drain`, `shard*`) | — | — |
| `shots.ts`, `beams.ts`, `gunfx.ts`, `fx.ts`, `bolts.ts`, `lights.ts`, `flipbooks.ts` | AL-00 (tách, `PilotRig`) | — | AL-08 | — | — | AL-15 (nòng) |
| `foe-fx.ts`, `foe-anim.ts` | AL-00 (tách từ `gunfx.ts`) | — | — | AL-09 | — | — |
| `stage-fx.ts` | AL-00 (tách từ `gunfx.ts`) | — | — | AL-07 (mục tiêu) | AL-11 (telegraph, rift) | — |
| `typing-feel.ts`, `type-fx.ts`, `type-rules.ts` | AL-00 (`PilotRig`) | AL-05 (dòng `destination` của AL-02 qua điều phối) | — | — | — | AL-15 (`FX_CORE`) |
| `strip.ts`, `strip.css`, `theme-strip.css` | AL-00 (tách CSS) | AL-05 | — | AL-07 | — | — |
| `hud.ts`, `hud-panels.ts`, `hud-banners.ts`, `hud.css`, `theme-hud.css` | AL-00 (tách) | — | — | AL-07 | — | — |
| `hud-bays.ts`, `bays.css`, `theme-bays.css` | AL-00 (tách) | AL-05 (chỉ `targetRect`) | AL-06 | — | — | — |
| `quick.css`, `theme-quick.css` | AL-00 (tách) | — | — | — | — | AL-14 |
| `crowd.ts`, `chunks.ts`, `models.ts` | — | — | — | AL-09 | — | — |
| `hazard-fx.ts` | — | — | — | AL-09 (drain) | AL-11 (rift) | — |
| `feel-bloom.ts` | — | — | AL-10 (AA) | AL-07 (tách RGB) | — | — |
| `theme.css` (token chung) | AL-00 (tách) | chỉ điều phối sửa | | | | |
| `warm.ts`, `probes.ts`, `src/app/dev.ts`, `survival-alive.mjs` | AL-00 (sổ đăng ký) | mỗi gói đăng ký từ module của mình; cảnh ở `scripts/visual/scenarios/alive/<gói>.mjs` | | | | |
| `src/view/coverage/` | AL-00 (`index.ts`, test) | mỗi gói chỉ sửa `al<nn>.ts` của mình | | | | |
| `scripts/ui-art/selection*.json`, `ui-art/*.json` theo khu | AL-00 (tách) | AL-01 (loader), AL-05 (strip) | AL-06 (bays) | AL-07 (hud), AL-12 (screens) | AL-11 (intro), AL-13 (journey, results) | AL-14 (quick) |
| `src/audio/**` | AL-00 (`cue`) | AL-02 | — | — | AL-04 (`music.ts`) | — |
| `public/assets/typing-survival/audio/manifest.json` | — | AL-02 (bản đầu, schema) | làn AL-03 | làn AL-03 | làn AL-03 | làn AL-03 |
| `docs/audio/THEME_SOUND_LIST.md`, `docs/games/audio/firefly/typing-survival.md` | làn AL-03, mọi đợt | | | | | |
| `public/assets/typing-survival/models/manifest.json` | — | — | AL-10 | AL-09 | — | AL-15 |
| `shared/game-kit/**` và `kit:sync` | — | AL-05 | — | — | — | AL-14 (hoặc AL-15) |
| `.gitignore` | — | AL-02 | — | — | — | — |

Ô "—" là không gói nào giữ trong đợt đó; gói cần sửa thì báo điều phối trước. Tệp không có trong bảng thì chỉ được đọc.

Tệp tài liệu dùng chung ở repo cha (`docs/games/THIRD_PARTY.md`, `QUALITY_RESCUE_2026-11-01.md` §6) có thể xung đột nhỏ khi gộp; điều phối gộp tay. Changelog mỗi gói là một tệp mới nên không đụng nhau.

### 4.3 Heroine và drone: phụ thuộc và đường lùi

Hôm nay trận lái tàu Vanguard. Heroine và drone (M012, M080, M109–M111) chờ model ở workflow nhân vật `wf_33a34adc-e49` và lab `ts-presence-lab` `2a924d7`. Mọi gói khác không được chờ việc này, và cũng không được làm việc phải bỏ đi khi nhân vật vào.

1. **Giao diện trước, nhân vật sau.** AL-00 dựng `PilotRig` (bước 5). Từ đợt 1, mọi gói chỉ gọi `PilotRig`:
   - AL-05: `core()` cho tia phím;
   - AL-08: `muzzle()`, `kick()`, `cue()`;
   - AL-09: `shield(dir)`, `hurt()` cho breach, đạn Scout, drain;
   - AL-11: `pose("win" | "lose")`.

   `ship.ts` đứng yên từ đợt 1 tới đợt 4: không thêm hình mới cho tàu, vì tàu sẽ bị thay. AL-15 chỉ thay phần cài đặt.
2. **Cổng vào AL-15.** Heroine, drone và 5 súng cầm tay đều đạt 8,5 (hai giám khảo mù), ở cỡ thật 68 px tại 720 trong host chơi. Lab presence đã rebase lên `main` của đợt 4.
3. **Model trễ.** Hết đợt 4 mà chưa qua cổng thì:
   - AL-15 sang đợt 6; AL-14 và AL-16 vẫn chạy đợt 5;
   - M012, M080, M109–M111 ghi nợ trong `QUALITY_RESCUE` §6;
   - AL-17 không đạt khi còn M109 (P0).

   Không dựng hình nộm hay tàu "tạm sống" thay cho nhân vật trong host chơi. Mannequin chỉ ở lab `?debug=1`.
4. **Chấm lại sau khi thay.** Các dòng sau đạt trên tàu nhưng hình nằm ở nhân vật, nên chấm lại trong AL-15: M046, M047, M083–M089 (pha A và R), M095, M096, M106, M036, M037.
5. **Bố cục.** Bay (AL-06) và vùng bảo vệ (AL-07) dựa trên cột trống 324 px (`hud.ts:66`). Nhân vật phải nằm trong cột đó, mũi súng không vượt `NOSE_MAX_Z` (QUALITY_RESCUE §4.7). Cần dời bố cục thì việc đó thuộc AL-15, kiểm lại bằng `survival-layout.mjs`.
6. **Tranh 2D.** Title (AL-12), màn thua và thẻ kết quả đã vẽ heroine. Tách lớp hay vẽ lại các tranh này chỉ sau khi bản vẽ bốn hướng của workflow nhân vật được duyệt. Nếu bible đổi sau đó, AL-15 ra phiếu vẽ lại (rủi ro ở QUALITY_RESCUE §4.8).
7. **Cài đặt.** Hàng "Ship" của Options, dòng "SHIP VANGUARD" (M012) và tàu Draconis do AL-15 quyết khi nhân vật vào. Hướng: bỏ lựa chọn tàu, giữ `?pilot=` cho kịch bản cũ tới khi chúng đổi.
8. **Sim không đổi.** Drone chỉ là hình (QUALITY_RESCUE §4.6). Khiên đỡ giáp thật là việc của R2, cần cân lại.

## 5. Câu cần chủ dự án quyết

| # | Câu hỏi | Đề xuất |
|---|---|---|
| Q1 | "Mỗi phím một phát": (a) tia từ chữ tới lõi đọc như một viên đạn sáng, hay (b) nòng phun một tia nhỏ mỗi phím, chỉ là hình. Cả hai không bắn thật theo phím; sim và cân bằng giữ nguyên | (a). Typing Break cũng không bắn theo phím; FEEL_PASS §3.1 bỏ kiểu bắn giả |
| Q2 | Thêm vào kit gõ chữ dùng chung một kiểu "Load": chữ bay vào ô băng, dấu chữ theo từng bước, tấm chữ vẽ. Chỉ Last Line bật; các game khác không đổi | Duyệt hướng. Anh ký sau khi hai giám khảo cùng ≥ 9 |
| Q3 | Ai tạo khoảng 90 âm của bốn lô và nhạc: anh tự làm trên Firefly như ngày 29/10, hay Claude chạy Firefly âm trong tab của anh (như Firefly Video) và Stable Audio 3 cho nhạc. Mỗi lô cần anh nghe mù khoảng 20–30 phút | Claude chạy trong tab của anh; anh chỉ nghe mù |
| Q4 | Bộ phím mặc định: chuyển sang `raindrop-tile` (bản anh chọn ngày 30/10), hay nâng `bright-clack` (critic 6,40) lên 9 | `raindrop-tile`, rồi chấm 9 |
| Q5 | Giọng: dùng file giọng neural có giấy phép thương mại (ví dụ ElevenLabs Starter, anh tự chạy) cho khoảng 20 câu người dẫn và tiếng heroine, từ vựng làm sau; hay giữ giọng của trình duyệt | Làm người dẫn trước; giọng trình duyệt giữ làm dự phòng |
| Q6 | Cổng khung ở High khi dựng thế giới mới. Hôm nay High chỉ còn khoảng 0,7 ms dưới cổng 6 ms không vsync | Cổng chính là cái người chơi thấy: khoảng khung p95 ≤ 16,8 ms, lỡ nhịp ≤ 1 % ở 1920×1080 trên máy anh. Nới cổng không vsync từ 6 lên 8 ms. Vượt nữa thì cắt theo thứ tự của `MODEL_QUALITY.md` |
| Q7 | Luật thời điểm giữa âm và giọng (AUDIO_PIPELINE §6.2) cho Last Line: giọng chờ 150 ms sau đầu tiếng `word.load`, phím hạ 8 dB khi đọc | Duyệt |

**Việc tay đang chờ:**

- Anh đính kèm ảnh nền map 1 vào chat ChatGPT để vẽ try3 (chờ từ 01/11).
- 7 model Tripo theo workflow nhân vật.

## 6. Nguồn

**Trong repo:**

- `AGENTS.md`; `docs/HANDOFF_CURRENT.md` (01/11 khoảng 21:50).
- `docs/games/QUALITY_RESCUE_2026-11-01.md` (§3 đợt 2, §4 nhân vật, §6 sổ nợ).
- `docs/games/maps/typing-survival-MAP_CONCEPTS.md` (§1.6 màu, §1.7 nhóm nhân vật, §1.8 bầy quái, §2.1 bộ K1–K14, §4 map 1, §6 các stage khác).
- `docs/games/VFX_STANDARD.md`, `SHARED_SYSTEMS_BAR.md`, `AUDIO_PIPELINE.md`, `TYPING_BREAK_STUDY.md`, `HERO_PRESENCE_VFX.md`, `CHARACTER_DESIGN_GUIDE.md` §7, `IN_GAME_SETTINGS.md`, `MONSTER_MODEL_INVENTORY.md`, `MODEL_QUALITY.md`, `ART_ACCEPTANCE.md`.
- `docs/games/audio/firefly/typing-survival.md`, `docs/audio/THEME_SOUND_LIST.md`.
- `games/typing-survival/docs/FEEL_PASS_S1.md` (§1.3 bản quyền, §6 ngân sách), `SURVIVAL_MODE_PLAN.md` §9.
- Skill: `.agents/skills/{game-vfx-layered,game-hero-presence-vfx,game-art-pipeline,game-character-design,game-map-concept,game-ui-ux-review}`.

**Bằng chứng:** `/Users/toandx/htdocs/typing-game/games/.wt-ts-audit/tmp/audit/`, gồm `oob/`, `hud/`, `combat/`, `world/`, `sound/` và `juice/`, mỗi thư mục có tờ khung, ảnh tĩnh và JSON số đo. Video tham chiếu ở `/Users/toandx/htdocs/typing-game/typing_break.mov`.
