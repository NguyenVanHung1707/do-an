# Hệ Thống Thi Trực Tuyến Tích Hợp Giám Thị & Điểm Danh AI (Online Exam Proctoring & Attendance System)

Hệ thống thi trực tuyến hoàn chỉnh được thiết kế theo kiến trúc **Microservices** phân tán hiện đại, tích hợp Trí tuệ nhân tạo (AI/Computer Vision) để tự động điểm danh nhận diện khuôn mặt và giám sát chống gian lận thi cử thời gian thực.

---

## 🚀 Kiến Trúc Hệ Thống (System Architecture)

Hệ thống bao gồm 4 dịch vụ cốt lõi hoạt động độc lập và được điều phối thông qua **Docker Compose**:

### 1. Main Backend Service (`Graduation_thesis_ver2_BE`)
*   **Công nghệ**: Java Spring Boot 3.2.3, Spring Security OAuth2, JPA Hibernate.
*   **Tính năng**: Quản lý kỳ thi, ngân hàng câu hỏi, bài làm của thí sinh, diễn đàn thảo luận môn học. Tích hợp phân quyền thông qua **Keycloak Identity Provider**.
*   **API Gateway/Proxy**: Định tuyến và đóng vai trò proxy điều hướng các yêu cầu giám thị AI trực tiếp từ Frontend đến module AI.

### 2. Main Frontend SPA (`FE_WEB`)
*   **Công nghệ**: ReactJS, Vite, TailwindCSS, Lucide Icons.
*   **Tính năng**: Giao diện làm bài thi trực quan của thí sinh, khu vực trao đổi/thảo luận, màn hình giám sát của giám thị.
*   **Khắc phục lỗi Webcam**: Tích hợp giải thuật state-aware callback ref (`ref={setVideoRef}`) giúp khắc phục triệt để hiện tượng đen màn hình webcam khi khởi động camera trên các trình duyệt hiện đại.

### 3. AI Proctoring Service (`ai-proctor`) - [NEW]
*   **Công nghệ**: Python FastAPI, MediaPipe FaceMesh, OpenCV, NumPy, WebSockets.
*   **Cơ chế hoạt động**:
    *   **Theo dõi ánh mắt (Gaze Tracking)**: Phân tích khoảng cách dịch chuyển của tròng đen mắt (Iris Landmarks) để xác định thí sinh có nhìn lệch ra ngoài màn hình hay không.
    *   **Tư thế đầu (Head Pose Estimation)**: Sử dụng thuật toán giải hệ phương trình PnP (Perspective-n-Point) trên các mốc khuôn mặt 3D để ước lượng góc quay đầu (Pitch/Yaw/Roll).
    *   **Tự động ghi hình gian lận**: Duy trì một hàng đợi vòng tròn (rolling queue) trong RAM. Khi thí sinh dời mắt khỏi màn hình liên tục quá 3 giây, hệ thống sẽ kích hoạt luồng phụ (asynchronous thread) tự động ghi và xuất tệp video dài **10 giây** (bao gồm 5 giây trước và 5 giây sau thời điểm vi phạm) dạng `.mp4` lưu trực tiếp vào thư mục máy chủ:
        ```bash
        E:\Data\future_ai_feature\[exam_id]\[student_id]\
        ```

### 4. Face Recognition Service (`detect-face`)
*   **Công nghệ**: Python FastAPI, OpenCV, Face Recognition.
*   **Tính năng**: Chụp ảnh nhận diện thí sinh khi bắt đầu vào phòng thi và đối khớp khuôn mặt với cơ sở dữ liệu đã đăng ký để điểm danh tự động.

---

## 🛠️ Danh Sách Cổng Hoạt Động (Port Mapping)

Khi chạy toàn bộ hệ thống bằng Docker Compose, các cổng dịch vụ được định tuyến như sau:

| Dịch vụ | Công nghệ | Cổng ngoài (Host Port) | Cổng trong Container |
| :--- | :--- | :--- | :--- |
| **`fe_web`** (Frontend) | React (Nginx Web Server) | **`5173`** | `80` |
| **`backend`** (Spring Boot) | Java 21 OpenJDK | **`8080`** | `8080` |
| **`ai_proctor`** (Giám thị AI) | Python FastAPI | **`8899`** | `8000` |
| **`detect_face`** (Điểm danh) | Python FastAPI | **`8888`** | `8888` |
| **`keycloak`** (Xác thực) | Keycloak Provider | **`9000`** | `8080` |
| **`postgres`** (Cơ sở dữ liệu) | PostgreSQL 15 | **`5433`** | `5432` |

---

## 📦 Hướng Dẫn Cài Đặt & Chạy Hệ Thống (Installation & Quick Start)

### Yêu cầu hệ thống:
*   Đã cài đặt **Docker Desktop** và **Docker Compose**.
*   (Tùy chọn) Thư mục lưu trữ dữ liệu video giám thị `E:\Data` trên Windows Host (đã được cấu hình Mount Volume tự động trong `docker-compose.yml`).

### Khởi chạy toàn bộ hệ thống:

Di chuyển vào thư mục chứa dự án Spring Boot và chạy lệnh xây dựng lại toàn bộ container:

```bash
cd Graduation_thesis_ver2_BE
docker compose up --build -d
```

Để kiểm tra trạng thái hoạt động của các container:
```bash
docker compose ps
```

Xem log thời gian thực của module giám thị AI:
```bash
docker compose logs -f ai_proctor
```

---

## 🔒 Bản Quyền & Bảo Mật
*   Tài khoản Keycloak và Database được cấu hình mặc định trong file `.env` và `docker-compose.yml`.
*   Các thông tin nhạy cảm và thư mục phát triển riêng của Mobile App (`Graduation_thesis_ver2_FE_2` và `frontend_student`) đã được loại bỏ hoàn toàn thông qua file cấu hình `.gitignore` để đảm bảo an toàn khi đưa lên kho chứa mã nguồn chung.

---

## 🌐 Triển Khai VPS & CI/CD Tự Động (VPS Deployment & Automated CI/CD)

Hệ thống đã được đóng gói, triển khai chính thức lên máy chủ VPS Viettel IDC (`27.71.29.232`) và ánh xạ hoàn chỉnh qua tên miền bảo mật **`https://thuvienso.io.vn`**.

### 1. Kiến Trúc Reverse Proxy Nginx & SSL HTTPS
Để bảo vệ an toàn cho luồng dữ liệu (đặc biệt là hình ảnh khuôn mặt và camera giám thị), toàn bộ các yêu cầu từ Client đều được bảo mật qua giao thức **SSL Let's Encrypt** và được định tuyến thông qua **Nginx Reverse Proxy** trên cổng chuẩn `80/443`:

```mermaid
graph TD
    User([Người dùng truy cập https://thuvienso.io.vn]) -->|Cổng HTTPS 443| Nginx[Nginx Reverse Proxy Host]
    Nginx -->|Định tuyến trang chủ /| FE[fe_web Container - Cổng 5173]
    Nginx -->|Định tuyến API /api & /ws| BE[backend Container - Cổng 8080]
    Nginx -->|Định tuyến Keycloak /realms, /resources, /admin| KC[keycloak Container - Cổng 9000]
    Nginx -->|Định tuyến AI Face ID /detect-face/| DF[detect_face Container - Cổng 8888]
    Nginx -->|Định tuyến WebSockets Giám thị /api/proctor/ws| AP[ai_proctor Container - Cổng 8899]
```

### 2. Quy Trình Tự Động Hóa CI/CD (GitHub Actions)
Hệ thống được tích hợp quy trình **Liên tục Tích hợp và Triển khai (CI/CD)**. Khi nhà phát triển đẩy mã nguồn mới lên nhánh `main` trên GitHub, pipeline tự động kích hoạt chạy kịch bản tại `.github/workflows/deploy.yml`:
1. Kết nối an toàn đến VPS bằng **SSH Deploy Key**.
2. Di chuyển vào thư mục `/root/do-an` trên máy chủ.
3. Kéo mã nguồn mới nhất (`git pull origin main`).
4. Rebuild các Docker containers có thay đổi (`docker compose up --build -d`).
5. Reload Nginx và dọn dẹp các tệp tin rác của Docker.

### 3. Hướng Dẫn Cấu Hình GitHub Secrets (Dành cho Chủ dự án)
Để kích hoạt tính năng tự động cập nhật này khi up code lên GitHub của bạn, vui lòng thực hiện các bước cấu hình sau trên giao diện Web của GitHub:

1. Truy cập vào kho lưu trữ GitHub: [NguyenVanHung1707/do-an](https://github.com/NguyenVanHung1707/do-an).
2. Chọn mục **Settings** (Cài đặt) -> **Secrets and variables** (Bí mật & Biến) -> **Actions**.
3. Bấm nút **New repository secret** (Tạo bí mật kho lưu trữ mới) và thêm lần lượt 3 khoá bảo mật sau:

*   **Khoá 1**:
    *   **Name**: `VPS_HOST`
    *   **Secret**: `27.71.29.232`
*   **Khoá 2**:
    *   **Name**: `VPS_USER`
    *   **Secret**: `root`
*   **Khoá 3**:
    *   **Name**: `VPS_SSH_KEY`
    *   **Secret**: *(Dán toàn bộ nội dung mã Private SSH Key được cung cấp bên dưới, chú ý copy cả phần bắt đầu và kết thúc)*:
        ```text
        -----BEGIN OPENSSH PRIVATE KEY-----
        b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
        QyNTUxOQAAACA3tnoqt2onC+aCMYFCPANvh2QuSEpD5dFwClpE+svd3wAAAJiytVoXsrVa
        FwAAAAtzc2gtZWQyNTUxOQAAACA3tnoqt2onC+aCMYFCPANvh2QuSEpD5dFwClpE+svd3w
        AAAEBk54D0KnbszFZTIqCg8ab2J+QbSgXbeoo7bDTHzY52cDe2eiq3aicL5oIxgUI8A2+H
        ZC5ISkPl0XAKWkT6y93fAAAAFWdpdGh1Yi1hY3Rpb25zLWRlcGxveQ==
        -----END OPENSSH PRIVATE KEY-----
        ```

> [!IMPORTANT]
> Sau khi cấu hình xong 3 Secrets trên, từ nay về sau bất cứ khi nào bạn `git push` code mới lên GitHub, máy chủ sẽ **tự động cập nhật trực tiếp** chỉ sau khoảng 1-2 phút mà bạn không cần phải đăng nhập SSH thủ công vào VPS nữa!

