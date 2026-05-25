import time
import psycopg2
import cv2
import os
from deepface import DeepFace
from retinaface import RetinaFace
import shutil
from fastapi import FastAPI, UploadFile, File, Form
from typing import List


app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def getImagePaths(ids):
    try:
        connection = psycopg2.connect(
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "hung2004"),
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            database=os.getenv("DB_NAME", "graduation_thesis_ver2")
        )
        cursor = connection.cursor()
        cursor.execute(f'SELECT id, image_path FROM student WHERE id IN ({",".join(map(str, ids))})')
        rows = cursor.fetchall()
        return {row[0]: row[1] for row in rows}

    except (Exception, psycopg2.Error) as error:
        print("Error while connecting to PostgreSQL", error)
    finally:
        if connection:
            cursor.close()
            connection.close()
            print("PostgreSQL connection is closed")

def checkAttendence(imagePath, listID):
    image = cv2.imread(imagePath)
    os.makedirs('tamthoi', exist_ok=True)
    
    start_time_x = time.time()  # Bắt đầu đo thời gian
    faces = RetinaFace.extract_faces(img_path=imagePath, align=True)
    for i, face in enumerate(faces):
        output_filename = f'tamthoi/face_{i + 1}.jpg'
        cv2.imwrite(output_filename, face)

    image_paths = getImagePaths(listID)
    results = []
    end_time_x = time.time()  # Kết thúc đo thời gian
    print(f"Time taken to extract faces: {end_time_x - start_time_x:.2f} seconds")  # In ra thời gian chạy

    for id in listID:
        ip = image_paths.get(id)
        if ip is None:
            results.append({'id': id, 'isAttendance': False})
            continue

        ss = False
        try:
            ss = any(
                DeepFace.verify(os.path.join('tamthoi', filename), ip, model_name='ArcFace', detector_backend='retinaface', enforce_detection=False)['verified']
                for filename in os.listdir('tamthoi')
                if filename.endswith('.jpg') or filename.endswith('.JPG')
            )
        except Exception as e:
            print(f"Error verifying student {id}: {e}")
            ss = False

        results.append({'id': id, 'isAttendance': ss})

    shutil.rmtree('tamthoi')
    return results

@app.post("/attendance")
async def attendance(image_ids: List[str] = Form(...), image_file: UploadFile = File(...)):
    start_time = time.time()  # Bắt đầu đo thời gian

    numbers_str = image_ids[0].split(',')
    numbers_int = [int(num) for num in numbers_str]

    os.makedirs('./temp', exist_ok=True)
    file_path = f"./temp/{image_file.filename}"
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(await image_file.read())
        results = checkAttendence(file_path, numbers_int)
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
    
    end_time = time.time()  # Kết thúc đo thời gian
    elapsed_time = end_time - start_time  # Tính toán thời gian chạy

    print(f"Time taken to process attendance: {elapsed_time:.2f} seconds")  # In ra thời gian chạy
    return results