# 🗄️ Phân Hệ Backend Trung Tâm - Core REST API Gateway & Authentication Services (Spring Boot)

Phân hệ Backend chính của hệ thống được phát triển trên nền tảng **Java Spring Boot** hiện đại, đóng vai trò là hạt nhân điều phối toàn bộ tài nguyên, quản lý dữ liệu và cung cấp API Gateway bảo mật cho cả phân hệ Web và hai ứng dụng di động native (Học viên & Giảng viên). 

Hệ thống được tích hợp cổng định danh chuẩn quốc tế **Keycloak SSO** nhằm cung cấp cơ chế đăng nhập một lần (SSO) an toàn và phân quyền người dùng chính xác theo vai trò hệ thống.

---

## 🌟 Các Tính Năng & Phân Hệ Core (Core Backend Modules)

Hệ thống backend được chia thành các phân hệ nghiệp vụ chặt chẽ, tối ưu hiệu năng và an toàn thông tin:

### 1. Cổng Định Danh & Xác Thực Hợp Nhất (Identity & Access Management - IAM)
*   **Tích hợp Keycloak SSO**: Giao thức OAuth2 / OpenID Connect tiêu chuẩn, thực hiện xác thực và phân quyền Realm Roles cho các đối tượng người dùng (Admin, Teacher, Student).
*   **Cơ chế Quay Vòng Token (Token Rotation)**: Hỗ trợ API trao đổi `refresh_token` lấy `access_token` mới, kết hợp chặt chẽ với cơ chế bảo mật sinh trắc học trên ứng dụng di động.
*   **Đổi Mật Khẩu An Toàn (Secure Password Management)**: Cung cấp API thay đổi mật khẩu tài khoản trực tiếp, tự động đối khớp mật khẩu cũ thông qua tài khoản Keycloak để tăng cường tính bảo mật trước khi cập nhật.

### 2. Quản Lý Đào Tạo & Lớp Học Phần (Academic & Roster Management)
*   **Cấu trúc Học kỳ chuyên nghiệp**: Tự động quản lý chu kỳ năm học, phân loại các kỳ học hoạt động và chia tuần học thuật phục vụ lịch trình giảng dạy.
*   **Quản lý lớp học phần**: CRUD thông tin lớp học, tự động hóa nhập/xuất danh sách sinh viên lớp học hàng loạt qua tệp Excel, đồng bộ hóa danh sách thành viên lớp học với Keycloak.

### 3. Điểm Danh Thông Minh Đa Phương Thức (Smart Attendance Engine)
*   **Điểm danh tọa độ GPS Geofencing**: API đối khớp mã điểm danh kết hợp đo lường khoảng cách tọa độ GPS thực tế của học viên với tọa độ của lớp học được giảng viên quy định, hỗ trợ thuật toán phát hiện và ngăn chặn giả lập vị trí.
*   **Điểm Danh Khuôn Mặt (FaceID Attendance)**: API đồng bộ dữ liệu hình ảnh sinh trắc học cá nhân, tích hợp đối khớp nhanh khuôn mặt học viên chụp tập thể để tự động đánh giá chuyên cần thông minh.

### 4. Quản Lý Đề Thi & Chấm Điểm (Assessment & Examination Hub)
*   **Ngân hàng câu hỏi & Đề thi**: Hỗ trợ lưu trữ câu hỏi trắc nghiệm và tự luận phân cấp theo môn học. Cung cấp API khởi tạo đề thi linh hoạt, thiết lập thời gian thi, và hạn chế khu vực làm bài.
*   **Đánh giá & Chấm điểm**: Tự động chấm điểm trắc nghiệm tức thì ngay sau khi sinh viên nộp bài. Cung cấp không gian chấm điểm tự luận trực quan dành cho giảng viên kèm ghi nhận xét chi tiết.
*   **Cấu hình Giám sát AI (AI Proctoring Config)**: Đồng bộ cấu hình các tham số bảo mật phòng thi (bật/tắt camera giám sát AI, theo dõi ánh mắt, tư thế đầu,...) cho từng bài thi cụ thể.

---

## 🛠️ Kiến Trúc Công Nghệ & Thành Phần Hệ Thống (Tech Stack Architecture)
*   **Java 21 / Spring Boot 3.2.3**: Framework phát triển ứng dụng doanh nghiệp mạnh mẽ, ổn định và hiệu năng cao.
*   **Spring Security & OAuth2 Resource Server**: Bảo vệ các điểm cuối API bằng cách xác thực mã thông báo JWT từ Keycloak.
*   **Spring Data JPA & PostgreSQL**: Quản lý truy xuất dữ liệu quan hệ tối ưu hóa, hỗ trợ giao dịch (Transactions) an toàn và toàn vẹn dữ liệu.
*   **Keycloak IAM**: Bộ quản lý định danh và quyền truy cập mã nguồn mở tiêu chuẩn cao của Red Hat.
