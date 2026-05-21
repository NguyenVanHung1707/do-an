Hello, welcome to my graduation_thesis_ver2_BE

![License](https://img.shields.io/github/license/hung2004/Graduation_thesis_ver2_BE) ![Issues](https://img.shields.io/github/issues/hung2004/Graduation_thesis_ver2_BE) ![Stars](https://img.shields.io/github/stars/hung2004/Graduation_thesis_ver2_BE) ![Forks](https://img.shields.io/github/forks/hung2004/Graduation_thesis_ver2_BE)


## Tính Năng

- **Quản lí lớp học**: CRUD lớp học.
- **Quản lí người học**: CRUD người học.
- **Quản lí điểm danh**: CRUD bản ghi điểm danh, có thể tạo và trả lời form điểm danh.
- **API thân thiện**: Cung cấp API dễ sử dụng để tích hợp vào các ứng dụng khác.
- **Mở rộng dễ dàng**: Dễ dàng mở rộng và tùy chỉnh cho các nhu cầu cụ thể của bạn.

## Yêu Cầu Hệ Thống

- Java 21 hoặc mới hơn

## Cài Đặt

1. **Clone repo**:
    ```bash
    git clone https://github.com/hung2004/Graduation_thesis_ver2_BE.git
    cd Graduation_thesis_ver2_BE
    ```
2. **Thiết lập DB**: vào file [application.properties](src/main/resources/application.properties) để thiết lập đường dẫn đến DB của bạn

3. **Cài đặt Keycloak**: tải Keycloak version 24.0.1, sau đó chọn tạo realm mới, import file [realm-export.json](src/main/resources/realm-export.json) vào.

4. **Chạy chương trình**:
    ```bash
    cd /path/to/your/spring-boot-project
    mvn spring-boot:run
    ```

## Hướng Dẫn Sử Dụng

Bạn có thể sử dụng phần backend này bằng cách gọi API (sử dụng Postman để thử, import file [graduation_thesis_ver2.postman_collection.json](./src/main/resources/graduation_thesis_ver2.postman_collection.json) vào Postman).

