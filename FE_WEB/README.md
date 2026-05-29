# 🌐 Phân Hệ Web Quản Trị & Đào Tạo - Thư Viện Số AI (Vite + ReactJS SPA)

Phân hệ Web Frontend chính của hệ thống là ứng dụng trang đơn (SPA) hiệu năng cao, được xây dựng trên nền tảng **ReactJS** hiện đại kết hợp **Vite** và **Tailwind CSS**. 

Nền tảng cung cấp giao diện trực quan, sang trọng, hỗ trợ chế độ thích ứng Light/Dark Mode thông minh, đóng vai trò là trung tâm quản trị và học tập trực tuyến kết nối chặt chẽ với cơ sở dữ liệu chung và cổng định danh **Keycloak SSO**.

---

## 🌟 Các Tính Năng Theo Vai Trò Người Dùng (User Roles & Features)

Ứng dụng phân quyền động dựa trên Realm Roles của Keycloak, cung cấp không gian làm việc chuyên biệt cho 3 nhóm đối tượng:

### 1. Vai Trò Quản Trị Viên (Admin Portal)
*   **Bảng Điều Khiển Giám Sát (Admin Dashboard)**: Theo dõi biểu đồ lưu lượng truy cập hệ thống theo thời gian thực (ngày/tuần/tháng), giám sát hiệu năng API và tài nguyên hệ thống.
*   **Phê Duyệt Giảng Viên (Teacher Approval)**: Tiếp nhận danh sách hồ sơ đăng ký của giảng viên, xét duyệt quyền hạn hoặc từ chối kèm lý do phản hồi chi tiết.
*   **Quản Lý Học Kỳ (Semester Management)**: Thiết lập cấu trúc các năm học, phân loại học kỳ hoạt động và tự động chia tuần học thuật cho toàn hệ thống.

### 2. Vai Trò Giảng Viên (Teacher Portal)
*   **Bảng Tin Sư Phạm (Teacher Dashboard)**: Xem nhanh lịch dạy trong tuần, danh sách các lớp học phần đang phụ trách và thống kê chuyên cần tổng quát.
*   **Quản Lý Lớp Học Phần**:
    *   Tự động tải danh sách sinh viên lớp học từ tệp Excel mẫu hoặc thêm mới thủ công qua tìm kiếm Autocomplete.
    *   Cấu hình thông số lớp, phân quyền đăng tải tài liệu học tập của sinh viên.
*   **Quản Lý Học Liệu (Mini-Drive Classroom)**: Kho lưu trữ bài giảng phân cấp thư mục. Giảng viên có quyền tải lên, xóa và phân quyền tải/chấm điểm bài tập của từng sinh viên.
*   **Điểm Danh Công Nghệ Cao**:
    *   **Điểm danh qua Ảnh chụp (FaceID)**: Tải ảnh tập thể lớp lên để hệ thống tự động quét, nhận dạng khuôn mặt và đối khớp với cơ sở dữ liệu sinh trắc học để tích hợp chuyên cần.
    *   **Điểm danh mã Code & GPS**: Thiết lập phòng điểm danh trực tiếp kết hợp khóa tọa độ địa lý (GPS Geofence).
*   **Quản Lý Đề Thi & Chấm Điểm**:
    *   Tạo đề kiểm tra trắc nghiệm hoặc tự luận từ ngân hàng câu hỏi, hỗ trợ nhập câu hỏi hàng loạt bằng Excel.
    *   Thiết lập hàng rào bảo mật: khóa thời gian thi, yêu cầu GPS vị trí làm bài, hoặc bắt buộc bật Camera Giám sát AI chống gian lận.
    *   Giao diện chấm thi tự luận trực quan, ghi nhận xét phản hồi chi tiết cho sinh viên.

### 3. Vai Trò Sinh Viên (Student Portal)
*   **Thời Khóa Biểu Cá Nhân (Timetable)**: Theo dõi lịch học, ca học trực quan theo ngày/tuần thích ứng giao diện Sáng/Tối.
*   **Học Phần Của Tôi (My Courses)**: Quản lý danh sách lớp học phần đang tham gia, tham gia thảo luận bài viết trên diễn đàn tương tác với giảng viên và bạn bè.
*   **FaceID Registration (Đăng ký nhận diện)**: Chụp và tải ảnh chân dung chính thức lên hệ thống AI phục vụ đối khớp chuyên cần và bảo mật phòng thi.
*   **Làm Bài Thi Trực Tuyến**: Giao diện làm bài thi tập trung, tự động lưu nháp liên tục (Auto-save) và hiển thị đồng hồ đếm ngược sinh động.
*   **Tra Cứu Kết Quả (Grades Analytics)**: Biểu đồ theo dõi kết quả học tập trực quan, xem chi tiết điểm số, bài làm đúng/sai cùng nhận xét chi tiết của giảng viên.

### 4. Tính Năng Chung Bảo Mật (Unified Profile & Security)
*   **Hồ Sơ Cá Nhân (Profile)**: Xem chi tiết thông tin cá nhân trên hệ thống, trực quan hóa mã Access Token JWT được mã hóa đang hoạt động và thông số Realm Server Keycloak.
*   **Đổi Mật Khẩu Hệ Thống (Secure Change Password)**: Tích hợp form đổi mật khẩu tài khoản trực quan. Đòi hỏi xác thực mật khẩu cũ trực tiếp qua cổng Keycloak để bảo vệ quyền sở hữu tối đa. Chức năng khả dụng đồng bộ cho cả Admin, Giảng viên và Sinh viên.

---

## 💎 Điểm Nhấn Thiết Kế Giao Diện (Design & Experience)
*   **Premium Visuals**: Curated harmonious HSL color palettes, deep smooth shadows, and subtle micro-animations for high-fidelity interactive elements.
*   **Fully Adaptive Dark Mode**: 100% theme-adaptive layout transitions using Tailwind dark classes, preventing text-burn or high contrast glare during long hours.
*   **Premium Components**: Dynamic modal dialogs, tab switchers, and fluid charts using high-quality rendering.
