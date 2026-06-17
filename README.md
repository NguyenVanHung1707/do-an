# 🎓 Hệ Thống Thi Trực Tuyến Tích Hợp Giám Thị & Điểm Danh AI (Online Exam Proctoring & Attendance System)

Hệ thống thi trực tuyến hoàn chỉnh được thiết kế theo kiến trúc **Microservices** phân tán hiện đại, tích hợp Trí tuệ nhân tạo (AI/Computer Vision) để tự động điểm danh nhận diện khuôn mặt và giám sát chống gian lận thi cử thời gian thực. 

Nền tảng mang lại giải pháp chuyển đổi số toàn diện cho trường học, tối ưu hóa công tác tổ chức kiểm tra, quản lý lớp học và nâng cao tính minh bạch, khách quan trong kiểm tra trực tuyến.

🌐 **Trải nghiệm trực tuyến tại địa chỉ chính thức**: [https://lophocso.io.vn](https://lophocso.io.vn)

---

## 🌟 Các Phân Hệ & Tính Năng Nổi Bật (Key Features)

Hệ thống được thiết kế đồng bộ trên cả nền tảng Web và Ứng dụng di động native, đáp ứng nhu cầu thực tế của cả Giảng viên, Sinh viên và Giám thị:

### 1. Phân Hệ Web Quản Trị & Đào Tạo (`FE_WEB`)
Nền tảng vận hành chính trên trình duyệt dành cho Quản trị viên (Admin), Giảng viên và Học viên với giao diện Premium tối giản, tối ưu hóa trải nghiệm người dùng:
*   **Quản trị viên (Admin)**: 
    *   Phê duyệt/Từ chối kích hoạt các tài khoản giảng viên đăng ký mới.
    *   Theo dõi biểu đồ thống kê lưu lượng người dùng thời gian thực (`traffic`) và giám sát tài nguyên máy chủ (`performance`).
    *   Quản lý chu kỳ học kỳ của trường học (kích hoạt, thiết lập ngày bắt đầu/kết thúc và tuần học).
*   **Giảng viên**: 
    *   Tổ chức lớp học phần, duyệt sinh viên vào lớp.
    *   **Quản lý tài liệu lớp học phân cấp**: Khởi tạo thư mục bài học, tải lên slide bài giảng, giáo trình PDF/ZIP. Hỗ trợ phân quyền chi tiết (Upload/Download) cho từng sinh viên hoặc áp dụng hàng loạt.
    *   **Soạn thảo đề thi & Import Excel**: Soạn câu hỏi thi trắc nghiệm, trả ngắn, tự luận; import đề thi hàng loạt từ file Excel. Thiết lập trọng số điểm, thời gian làm bài, ngày giờ thi, chế độ phát điểm (`AUTOMATIC` hoặc `MANUAL`).
    *   **Quản lý lịch học**: Cấu hình lịch dạy chi tiết theo các ca học trong tuần.
    *   **Diễn đàn thảo luận**: Đăng bài viết, viết bình luận thời gian thực, xóa bài spam, ghim bài viết quan trọng lên đầu lớp học.
    *   **Chấm thi trực tuyến**: Chấm điểm tự luận trực quan, xem phản hồi chi tiết câu hỏi, đồng thời tích hợp trình xem video bằng chứng gian lận do AI ghi nhận để đưa ra quyết định trừ điểm.
*   **Học viên**: 
    *   Xem thời khóa biểu cá nhân, tham gia diễn đàn thảo luận lớp học phần, tải tài liệu học tập.
    *   Làm bài kiểm tra trực tuyến, lưu bản nháp (Save Draft), tra cứu bảng điểm và xem nhận xét chi tiết cho từng câu hỏi từ giảng viên.
*   **Bảo mật tài khoản**: Tích hợp tính năng **Đổi mật khẩu an toàn**, xác thực mật khẩu cũ thông qua hệ thống Single Sign-On (SSO) Keycloak trước khi thay đổi.

### 2. Ứng Dụng Di Động Học Viên (`frontend_student`)
Ứng dụng di động native chạy mượt mà trên iOS và Android dành riêng cho học viên, mang lại sự tiện lợi tối đa:
*   **Đăng Nhập Sinh Trắc Học SSO**: Sau lần đăng nhập Keycloak đầu tiên, học viên có thể mở khóa nhanh bằng Vân tay (Fingerprint) hoặc FaceID của thiết bị. Sử dụng cơ chế lưu trữ an toàn cấp phần cứng (`react-native-keychain`) kết hợp tự động quay vòng Token (Token Rotation) để duy trì phiên làm việc bảo mật tuyệt đối.
*   **Thông Báo Đẩy Thông Minh (FCM)**: Tích hợp Firebase Cloud Messaging nhận thông báo thời gian thực về lịch thi mới, lịch học thay đổi đột xuất, hoặc tin nhắn thảo luận lớp học phần.
*   **Chuyển Hướng Sâu (Deep Linking)**: Nhấp vào thông báo đẩy để mở trực tiếp màn hình chi tiết lớp học hoặc diễn đàn thảo luận ngay cả khi ứng dụng đang chạy ngầm hoặc đã tắt hoàn toàn.
*   **Điểm Danh & Thi Trực Tuyến Tích Hợp Chống GPS Giả Lập**:
    *   **Chống Giả Lập Vị Trí (GPS Anti-Spoofing)**: Hệ thống chủ động phát hiện và chặn các hành vi sử dụng phần mềm giả lập GPS (Mock Location Spoofing) để gian lận điểm danh.
    *   **Geofencing Phòng Thi**: Tích hợp xác thực tọa độ vị trí thực tế của thiết bị học viên đối với cấu hình Geofencing của đề thi. Học viên chỉ được phép bắt đầu làm bài và nộp bài thi nếu nằm trong bán kính cho phép quanh phòng thi.
*   **Đăng Ký Hồ Sơ Sinh Trắc Học Face ID**: Chụp chân dung qua App di động để tạo bộ khuôn mẫu đặc trưng (Face Embeddings) phục vụ cho đối khớp nhận diện thi hộ và điểm danh nhóm lớp học.

### 3. Ứng Dụng Di Động Giảng Viên (`frontend_teacher`)
Cánh tay nối dài của giảng viên trong công tác quản lý lớp học và giảng dạy từ xa:
*   **Đăng Nhập 1 Chạm**: Bảo mật sinh trắc học vân tay/khuôn mặt cao cấp tích hợp SSO Keycloak, giúp giảng viên đăng nhập nhanh chóng mà không cần nhập mật khẩu phức tạp trên thiết bị di động.
*   **Cấu Hình Quy Tắc Điểm Danh Thông Minh**: Giảng viên có thể khởi tạo nhiều form điểm danh trong một ca học và thiết lập quy tắc chuyên cần (ví dụ: sinh viên cần check-in thành công tối thiểu 2/3 lần điểm danh ngẫu nhiên mới được tính là có mặt).
*   **Duyệt Kết Quả Điểm Danh Nhận Diện Face ID**:
    *   AI tự động phát hiện, cắt mặt với 15% padding và so khớp với khuôn mẫu gốc qua mô hình ArcFace từ một bức ảnh chụp tập thể lớp học phần do giảng viên tải lên.
    *   Giảng viên xem trước (preview) kết quả và phê duyệt hoặc chỉnh sửa thủ công nhanh chóng.
*   **Đẩy Tin FCM & Định Tuyến Sâu**: Nhận tin nhắn thông báo tức thì khi có yêu cầu phê duyệt mới, bài thảo luận mới từ sinh viên, và tự động điều hướng sâu đến màn hình phê duyệt hay phòng thảo luận.
*   **Đổi Mật Khẩu Tiện Lợi**: Giao diện đổi mật khẩu tài khoản trực quan tích hợp ngay trong trang hồ sơ cá nhân giúp giảng viên chủ động quản lý bảo mật.

### 4. Phân Hệ Giám Thị AI Thời Gian Thực (Real-time AI Proctoring)
Thuật toán Học máy và Thị giác máy tính tiên tiến chạy trực tiếp trên luồng camera của thí sinh để đảm bảo tính minh bạch tối đa:
*   **Theo Dõi Ánh Mắt (Gaze Tracking)**: Xác định hướng nhìn thông qua so sánh tọa độ tâm con ngươi (Iris Landmarks) với khóe mắt trong phạm vi tỉ lệ 0.32 - 0.68. Cảnh báo khi thí sinh liếc nhìn hướng khác rời khỏi màn hình quá 3 giây.
*   **Ước Lượng Tư Thế Đầu 3D (solvePnP)**: Sử dụng các điểm mốc khuôn mặt 2D từ MediaPipe FaceMesh khớp với mô hình 3D chuẩn bằng giải thuật solvePnP để đo chính xác góc quay đầu (yaw > 30 độ hoặc pitch > 20 độ). Phát hiện hành vi cúi đầu quay cóp hoặc quay đầu sang hai bên.
*   **Phát Hiện Vắng Mặt (No Face Detected)**: Tự động ghi nhận vi phạm quy chế thi khi camera hoàn toàn không phát hiện khuôn mặt của thí sinh trước màn hình làm bài.
*   **Tự Động Ghi Hình & Transcoding H.264**: Tự động trích xuất và lưu trữ tệp video bằng chứng dài **10 giây** (bao gồm 5 giây trước và 5 giây sau vi phạm) định dạng `.mp4` lên máy chủ khi phát hiện vi phạm liên tục vượt quá 3 giây. Video được chuyển mã bằng `ffmpeg` sang định dạng **H.264 Baseline Profile** nhằm tương thích tốt nhất với tất cả trình phát web HTML5.

---

## 🛠️ Kiến Trúc Công Nghệ & Vận Hành (Technology Stack)

Hệ thống được phát triển và vận hành dựa trên các tiêu chuẩn công nghệ hàng đầu:
*   **Java Spring Boot 3.2.3**: Xây dựng Main REST API Gateway bảo mật cao, kết hợp Hibernate JPA và PostgreSQL. Tích hợp thư viện **Apache POI** để đọc ghi dữ liệu Excel.
*   **Keycloak Identity Provider**: Cung cấp giải pháp đăng nhập một lần (SSO) chuẩn OAuth2/OpenID Connect bảo mật tối đa cho toàn bộ hệ thống Web và App di động.
*   **ReactJS, Vite & Tailwind CSS**: Trải nghiệm giao diện Web siêu nhanh, mượt mà và tương thích tốt trên nhiều loại thiết bị.
*   **React Native**: Xây dựng hai ứng dụng di động native dành cho Giảng viên và Học viên, hỗ trợ đầy đủ các cảm biến sinh trắc học, định vị GPS, và thông báo đẩy.
*   **FastAPI, MediaPipe, RetinaFace & DeepFace (ArcFace model)**: Động cơ AI hiệu năng cao xử lý phân tích hình ảnh camera thời gian thực qua WebSockets và nhận diện khuôn mặt nhóm lớp học có độ chính xác cao.
*   **Docker & Nginx Reverse Proxy**: Đóng gói cô lập các dịch vụ, hỗ trợ chứng chỉ bảo mật SSL HTTPS Let's Encrypt giúp bảo vệ tuyệt đối dữ liệu người dùng trên môi trường Internet.

---
🎉 **Chào mừng bạn đến với kỷ nguyên tổ chức thi và quản lý lớp học thông minh, minh bạch cùng Thư Viện Số AI!**
