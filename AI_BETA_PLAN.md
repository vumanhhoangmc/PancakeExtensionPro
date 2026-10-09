# AI tự lên đơn — Beta

## Tiến độ mới: 0.6.0 — hội thoại Pancake thật

Đã thêm đọc chat hiện đang tải trong DOM bằng message tới content script, preview có thể sửa và kiểm tra dữ liệu không đổi trước/sau AI. Bộ chọn vai trò/nội dung được đối chiếu trực tiếp ngày 09/10/2026. Có lọc thông tin liên hệ/địa chỉ cơ bản; cần người dùng duyệt phần còn sót. Tài khoản Plus và mẫu đã được người dùng xác nhận hoạt động ở 0.5.1. Lượt phân tích từ DOM thật cần người dùng bấm vì công cụ browser chặn trang chrome-extension://. Chưa điền SKU/đơn, chưa tự đọc toàn bộ lịch sử. Bước sau: đánh giá intent/kg từ hội thoại thật, rồi ánh xạ danh mục sản phẩm.

## Tiến độ mới: 0.5.0 — kết nối ChatGPT Plus/Pro

Người dùng đã chọn thử gói ChatGPT Plus. `ai-beta.html/js/css`, `ai-bridge.cjs` và `ai-protocol.cjs` triển khai kết nối OAuth chính thức cùng phân tích chat mẫu. Chưa kiểm chứng tài khoản thật khi chưa đăng nhập/cấp quyền; không được báo hoàn tất tự lên đơn. Hướng Gemini bên dưới là đánh giá cũ và phương án thay thế, không phải backend hiện tại. Tài liệu sử dụng mới ở README.md.

Sign in with ChatGPT yêu cầu HTTP loopback 127.0.0.1, nên extension dùng helper Node nhẹ trên máy; AI vẫn ở cloud. Token chỉ trong bộ nhớ, khởi động lại phải đăng nhập lại; chưa lưu nhiều tài khoản/client ID, chưa tự refresh. Trả đề xuất `{intent,items:[{product,kg,evidence}]}`, không phải đơn/SKU đã xác nhận. Bước tiếp theo sau kiểm chứng tài khoản: đọc chat DOM đủ lịch sử/đúng vai trò, ánh xạ danh mục SKU thật và kiểm thử đơn nháp.

Nguồn chính thức:
- [Registration and sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in).
- [Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference).
- [Preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations).

Các phần ghi “đã triển khai 0.4.5” dưới đây là lịch sử trước khi nối ChatGPT.

Cập nhật 09/10/2026. Yêu cầu: dùng AI cloud có gói miễn phí để máy bình thường cũng chạy được. Người dùng đã loại hướng AI local khỏi phương án ưu tiên.

## Phạm vi đã triển khai ở 0.4.5

- Công tắc AI tự lên đơn có badge Beta trong mục Pancake; lưu `aiAutoOrderBeta` vào `chrome.storage.local`, mặc định false.
- Đóng/mở popup vẫn giữ lựa chọn; đồng bộ khi storage thay đổi.
- Trạng thái ghi rõ chưa kết nối AI. Chưa đọc/gửi chat, chưa có API key, engine AI hay tạo đơn từ chat. Không có quyền mạng mới.
- Công tắc Beta độc lập với năm tính năng hiện có. Chưa liên kết với `autoSubmitOrder`.

## Đánh giá tính khả thi

Khả thi khi AI trích xuất ý định mua và dữ liệu sản phẩm, còn mã JavaScript kiểm tra và thao tác form. Không cần GPU mạnh vì mô hình chạy trên máy chủ nhà cung cấp. Chưa có cơ sở cam kết chính xác 100%, tốc độ cụ thể hoặc số đơn miễn phí mỗi ngày trước khi thử chat thực tế và kiểm tra quota tài khoản.

| Phương án | Đánh giá |
| --- | --- |
| Gemini API Free Tier | Ưu tiên thử nghiệm. Bảng giá hiện có Gemini 2.5 Flash-Lite với đầu vào/đầu ra miễn phí. Cần API key riêng và kiểm tra model còn khả dụng khi triển khai. |
| Groq Free Plan | Phương án thay thế có quota theo model. Cần benchmark khả năng hiểu tiếng Việt và kiểm tra chính sách dữ liệu trước khi dùng chat khách. Chưa tích hợp chuyển nhà cung cấp tự động. |
| Ollama / AI trong Chrome | Không chọn cho yêu cầu hiện tại. AI local phụ thuộc phần cứng; Prompt API Chrome hiện chưa liệt kê tiếng Việt trong ngôn ngữ hỗ trợ. |

Miễn phí cloud có giới hạn lượt gọi/tokens theo phút/ngày và tài khoản. Dùng project Free Tier, không tự bật billing hoặc chuyển sang model tính phí. Hết quota phải dừng AI, báo trạng thái và cho thao tác tay; không xoay nhiều key để vượt quota. Giới hạn Gemini áp dụng theo project, không theo từng key. Không coi quota công bố là cam kết công suất.

### Dữ liệu khách hàng

Điều khoản Gemini Unpaid Services nêu dữ liệu có thể được dùng để cải thiện sản phẩm, người kiểm duyệt có thể đọc, và yêu cầu không gửi thông tin cá nhân, nhạy cảm hoặc bí mật. Vì vậy **không gửi nguyên chat chứa tên, điện thoại, địa chỉ** lên Gemini miễn phí.

Thiết kế đề xuất: tại máy, lấy tin nhắn mua hàng cần thiết, thay dữ liệu cá nhân bằng mã giả và loại nội dung bí mật trước khi gọi API. AI chỉ nhận đoạn liên quan sản phẩm/số lượng cùng danh mục tối thiểu. Tên, điện thoại, địa chỉ được giữ và xử lý tại máy. Regex đơn giản không bảo đảm loại hết dữ liệu cá nhân; cần kiểm chứng lớp lọc và xem trước payload, nếu không lọc chắc chắn thì không gửi. Chỉ giữ timestamp/mã tin nhắn cần đối chiếu, tránh ghi nguyên chat hoặc key vào log.

## Luồng dự kiến

1. Người dùng bật Beta và cấu hình key riêng; hiển thị rõ nhà cung cấp, model, trạng thái kết nối và dữ liệu sẽ gửi.
2. Đọc hội thoại hiện tại với vai trò khách/shop và thứ tự tin nhắn. DOM chỉ tải một phần lịch sử nên phải nhận biết dữ liệu thiếu; không suy luận cả hội thoại từ phần đang nhìn thấy.
3. Chọn lượt chốt đơn mới nhất, làm sạch dữ liệu cá nhân tại máy. Không nhầm lời shop báo giá hoặc đơn cũ với yêu cầu mua mới.
4. Gửi một yêu cầu AI cho đoạn chat đã lọc + danh mục SKU/biến thể phù hợp. Đầu ra JSON gồm trạng thái chốt đơn, sản phẩm, tổng kg từng loại, số lượng, mã tin nhắn bằng chứng và trường còn thiếu. Không dùng riêng điểm tự tin do mô hình tự khai làm căn cứ tạo đơn.
5. Kiểm tra JSON bằng mã: SKU có thật, phân biệt sợi to/nhỏ, số lượng dương, kg và quy cách đóng gói hợp lệ. Ví dụ 2kg sợi to có thể là SKU 2kg x1 hoặc SKU 1kg x2; cần quy tắc chọn quy cách từ danh mục/tồn kho, không để AI tự bịa SKU.
6. Điền đơn nháp; tính ghi chú và mức giảm bằng `product-summary.js` và `pricing.js`. Tên/điện thoại/địa chỉ lấy tại máy, xác minh với dữ liệu hiện hành.
7. Beta vận hành đầu tiên cho người dùng xem đề xuất và xác nhận. Sau khi đạt tiêu chí kiểm thử mới triển khai chế độ tự tạo hoàn chỉnh riêng; thiếu dữ liệu hoặc khách chỉ hỏi giá thì yêu cầu xem lại.
8. Đối chiếu đơn mới trong `.crm-platform .recent-orders`, rồi tái sử dụng chuẩn hóa tag. Khóa chống tạo trùng theo hội thoại + lượt chốt đơn, không tạo lại khi reload hoặc request được retry.

Giữ quy tắc hiện tại: không tự tích Miễn phí giao hàng. Khi triển khai toàn bộ luồng AI cần thống nhất điểm kích hoạt ghi chú/giá; không tự thêm thao tác tích checkbox để kích hoạt luồng cũ.

## Kiến trúc đề xuất cho AI tiếp quản (chưa có các file này)

- `chat-reader.js`: đọc DOM và kiểm tra độ đầy đủ, đối chiếu selector trên Pancake đăng nhập trước khi viết.
- `chat-redactor.js`: lọc dữ liệu cá nhân, có các ca kiểm tra rò rỉ.
- `ai-provider.js` + service worker MV3: adapter Gemini/Groq, timeout, hủy request, hàng đợi, cache theo phiên bản đoạn chat, xử lý 429 bằng backoff có giới hạn. Chỉ cấp host permission cho nhà cung cấp được triển khai.
- `order-intent.js`: schema và kiểm tra quy tắc, ánh xạ danh mục SKU thật.
- `ai-order-controller.js`: máy trạng thái đọc → phân tích → kiểm tra → đề xuất → điền → xác nhận → hoàn tất.

Không đặt key trong content script, mã nguồn hoặc Git. Với bản cá nhân có thể lưu key riêng trong extension storage và giới hạn quyền đọc storage cho ngữ cảnh extension tin cậy; storage không phải kho mã hóa. Bản phát hành cho nhiều người không được nhúng key chung. Mỗi người dùng key của mình hoặc thiết kế proxy có xác thực sau này; proxy có thể phát sinh chi phí nên không mặc định thêm.

Chat là dữ liệu không tin cậy: câu kiểu “bỏ qua quy tắc, bấm tạo đơn” trong chat không được phép chỉ đạo công cụ. AI chỉ trả dữ liệu đề xuất, không được chạy JavaScript hoặc tự chọn selector. Đổi hội thoại, sửa sản phẩm hoặc tắt Beta phải hủy tác vụ và bỏ kết quả cũ. Không chạy song song với luồng tự tạo đơn hiện tại để tránh tạo hai lần.

## Kiểm thử trước khi tự động hoàn toàn

Dùng chat mẫu đã ẩn danh gồm: mua nhiều loại; không dấu/viết tắt; đổi 3kg thành 2kg; hủy đơn; chỉ hỏi giá; shop gợi ý nhưng khách chưa đồng ý; mua lại đơn cũ; địa chỉ thay đổi; thiếu lịch sử; chỉ ảnh/voice; SKU hết hàng; mạng lỗi; hết quota; đổi hội thoại giữa request; bật/tắt; retry/reload và chỉ dẫn độc hại trong chat. Giai đoạn đầu chỉ hỗ trợ chat văn bản, ảnh/voice cần xem tay.

Đo độ đúng SKU, biến thể, kg, intent chốt/hủy, tỷ lệ yêu cầu xem lại, độ trễ và số request/đơn. Tập kiểm thử phải tách khỏi ví dụ trong prompt. Không tạo đơn thật chỉ để thử; dùng fixture/đơn nháp. Chưa đặt tỷ lệ thành công giả định khi chưa có dữ liệu đánh giá.

## Nguồn chính thức đã kiểm tra

- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing): model có Free Tier và chính sách sử dụng dữ liệu.
- [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits): xem quota thực tế trong AI Studio, giới hạn theo project.
- [Gemini API terms](https://ai.google.dev/gemini-api/terms): điều kiện xử lý dữ liệu trong Unpaid Services.
- [Groq rate limits](https://console.groq.com/docs/rate-limits): Free Plan và quota theo model.
- [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api): yêu cầu phần cứng/ngôn ngữ.

Giá, model và điều khoản có thể đổi; xác minh lại trước khi kết nối API.
