# Cập nhật qua GitHub — Windows / Chrome

## Cài một lần trên mỗi máy

1. Cài **Node.js 22 trở lên** nếu máy chưa có. Giữ Node.js sau khi cài trình cập nhật.
2. Tải `PancakeAssistantPro-Windows.zip` từ [GitHub Releases](https://github.com/vumanhhoangmc/PancakeExtensionPro/releases), giải nén rồi chạy `install-update.cmd`. Không chạy khi còn ở bên trong ZIP.
3. Trình cài chép extension vào `%LOCALAPPDATA%\PancakeAssistantPro\extension`. Mở `chrome://extensions`, bật Developer mode, **tắt bản cũ** và Load unpacked từ thư mục này. Lần đầu đổi thư mục làm ID thay đổi: chọn lại các công tắc; dữ liệu của bản cũ không bị xóa. Không bật hai bản cùng lúc.
4. Mở popup bản mới → **Cập nhật qua GitHub** → mở hướng dẫn và sao chép ID. Dán ID vào cửa sổ trình cài để đăng ký. Không cần quyền quản trị. Mỗi tài khoản Windows hỗ trợ một ID; nhiều hồ sơ Chrome có thể dùng cùng đường dẫn/ID.
5. Repo riêng tư: nhập **fine-grained personal access token** giới hạn repo `vumanhhoangmc/PancakeExtensionPro`, quyền **Contents: Read-only**. Repo công khai: Enter bỏ qua. Token được lưu bằng DPAPI theo tài khoản Windows trong `github-token.xml`, không gửi cho extension, không đưa vào GitHub hoặc gói phát hành. Token hết hạn/thu hồi thì chạy lại trình cài để thay token. Muốn xóa token: chạy `powershell -NoProfile -ExecutionPolicy Bypass -File updater/install.ps1 -ClearToken` trong gói cài, rồi Enter bỏ qua.
6. Mở popup → **Kiểm tra bản mới**. Cài xong có thể đóng terminal. Chrome tự gọi helper khi khởi động, sau cài và mỗi 60 phút khi trình duyệt đang chạy.

Nếu chưa có Release hoặc token không đọc được repo, popup hiện lỗi rõ; bản hiện tại vẫn dùng bình thường. Repo không có bản phát hành không đồng nghĩa với “đã dùng bản mới nhất”. Trình cập nhật chỉ đọc **GitHub Release ổn định**, không tự lấy commit trên nhánh và không dùng bản draft/prerelease.

## Khi có bản mới

- Popup hiển thị phiên bản và trạng thái. Khi còn bất kỳ tab `pancake.vn`/subdomain nào, extension chờ bạn đóng các tab đó.
- Sau khi đóng hết tab Pancake/POS, Chrome tải gói, kiểm tra SHA-256 từ GitHub, version/tag, manifest và từng file. Gói được ghi vào thư mục tạm trước, sau đó đổi thư mục. Không nạp JavaScript tải về trực tiếp trong extension.
- Thay file thất bại hoặc bị dừng giữa chừng: journal và bản sao `update-backup` dùng để khôi phục vào lần gọi tiếp theo. Lỗi vẫn hiện trong popup; không báo thành công giả. Helper không ghi vào checkout có `.git`.
- Thay file xong, extension tự gọi `chrome.runtime.reload()`. Đường dẫn cài và ID giữ nguyên, nên các công tắc trong `chrome.storage.local` được giữ. Mở lại Pancake/POS để chạy bản mới. Nếu mở tab trong lúc tải, extension chờ đóng tab trước khi reload.
- AI Beta helper đang chạy vẫn là tiến trình cũ: nếu bản phát hành thay helper AI, dừng/chạy lại `node ai-bridge.cjs <ID>` trong **thư mục extension đã cài** theo hướng dẫn AI. Trình cập nhật không tự dừng phiên AI.
- Trình Native Messaging nằm riêng ngoài extension, không tự thay mã của chính nó. Khi giao thức helper thay đổi trong tương lai, chạy lại gói cài Windows mới. Giữ Node ở đường dẫn đã cài; nếu đổi đường dẫn Node, chạy lại trình cài.

## Phát hành bản mới từ source

Không cần build để phát triển extension. Đóng gói chỉ dành cho phát hành:

```powershell
node updater/build-release.cjs
Compress-Archive -LiteralPath dist/PancakeAssistantPro -DestinationPath dist/PancakeAssistantPro-Windows.zip -Force
```

Tăng `version` trong `manifest.json`, kiểm thử, commit/push thay đổi rồi tạo/push tag **`v<version>`**, ví dụ `v0.10.0`. Workflow `.github/workflows/release.yml` kiểm tra tag trùng manifest, chạy tests, tạo `pancake-update.json` và ZIP Windows rồi xuất bản Release ổn định. **Đẩy tag là thao tác phát hành tới các máy đã cài tự cập nhật.** Chỉ làm sau khi bản đó sẵn sàng. GitHub Actions cần được bật và có quyền Contents write qua `GITHUB_TOKEN` của workflow.

Thêm file runtime phải cập nhật `updater/runtime-files.json`. Gói chỉ chứa file chạy cần thiết; không có `.git`, cookie, token, fixture, hay ghi chú nội bộ. Các file runtime hiện dùng ở cấp gốc; helper v1 không nhận đường dẫn con hoặc file thực thi Windows.

## Gỡ trình cập nhật

Gỡ extension trên `chrome://extensions`. Xóa khóa registry `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.pancakeassistant.updater` và thư mục `%LOCALAPPDATA%\PancakeAssistantPro` nếu không còn dùng (thư mục chứa cả bản sao và token đã mã hóa). Không có service Windows hay tác vụ khởi động nền được tạo.
