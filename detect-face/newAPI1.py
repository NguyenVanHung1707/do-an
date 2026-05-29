import time
import psycopg2
import cv2
import os
from deepface import DeepFace
from retinaface import RetinaFace
import shutil
import traceback
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
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
    connection = None
    if not ids:
        print("getImagePaths: ids list is empty, returning empty dict.")
        return {}
    try:
        connection = psycopg2.connect(
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", ""),
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            database=os.getenv("DB_NAME", "graduation_thesis_ver2")
        )
        cursor = connection.cursor()
        cursor.execute(f'SELECT id, image_path, name FROM student WHERE id IN ({",".join(map(str, ids))})')
        rows = cursor.fetchall()
        return {row[0]: {"image_path": row[1], "name": row[2]} for row in rows}

    except Exception as error:
        print("Error while connecting to PostgreSQL:", error)
        return {}
    finally:
        if connection:
            cursor.close()
            connection.close()
            print("PostgreSQL connection is closed")


def checkAttendence(imagePath, listID):
    if not listID:
        print("checkAttendence: listID is empty.")
        return {"attendance": [], "faces": []}

    os.makedirs('tamthoi', exist_ok=True)
    try:
        image = cv2.imread(imagePath)
        if image is None:
            print(f"Error: Could not read image at {imagePath}")
            return {"attendance": [{'id': id, 'isAttendance': False} for id in listID], "faces": []}

        h, w, _ = image.shape
        obj_faces = []
        try:
            start_time_x = time.time()
            detections = RetinaFace.detect_faces(imagePath)
            end_time_x = time.time()
            print(f"Time taken to detect faces: {end_time_x - start_time_x:.2f} seconds")
            
            if isinstance(detections, dict):
                for face_key, face_data in detections.items():
                    facial_area = face_data.get("facial_area")
                    score = face_data.get("score", 0.0)
                    if facial_area and score > 0.8:
                        obj_faces.append({
                            "facial_area": [int(x) for x in facial_area],
                            "score": float(score)
                        })
        except Exception as e:
            print(f"Error detecting faces with RetinaFace: {e}")

        # Fallback to extract_faces if detect_faces finds nothing
        if not obj_faces:
            try:
                extracted = RetinaFace.extract_faces(img_path=imagePath, align=True)
                for i, face in enumerate(extracted):
                    output_filename = f'tamthoi/face_{i + 1}.jpg'
                    cv2.imwrite(output_filename, face)
                    # Fake box for frontend
                    obj_faces.append({
                        "filename": output_filename,
                        "box": [15, 15, 30, 30],
                        "facial_area": None
                    })
            except Exception as e:
                print(f"Error extracting faces as fallback: {e}")

        detected_faces = []
        if obj_faces:
            for i, face_obj in enumerate(obj_faces):
                if "filename" in face_obj:
                    detected_faces.append({
                        "filename": face_obj["filename"],
                        "box": face_obj["box"],
                        "identified": False,
                        "studentId": None,
                        "studentName": None
                    })
                else:
                    x1, y1, x2, y2 = face_obj["facial_area"]
                    x1, y1 = max(0, x1), max(0, y1)
                    x2, y2 = min(w, x2), min(h, y2)
                    
                    left_pct = (x1 / w) * 100
                    top_pct = (y1 / h) * 100
                    width_pct = ((x2 - x1) / w) * 100
                    height_pct = ((y2 - y1) / h) * 100
                    
                    face_crop = image[y1:y2, x1:x2]
                    output_filename = f'tamthoi/face_{i + 1}.jpg'
                    cv2.imwrite(output_filename, face_crop)
                    
                    detected_faces.append({
                        "filename": output_filename,
                        "box": [left_pct, top_pct, width_pct, height_pct],
                        "identified": False,
                        "studentId": None,
                        "studentName": None
                    })

        student_data = getImagePaths(listID)
        results = []
        
        for id in listID:
            s_info = student_data.get(id)
            if not s_info:
                print(f"Student {id}: No registered image found in DB.")
                results.append({'id': id, 'isAttendance': False})
                continue
                
            ip = s_info.get("image_path")
            s_name = s_info.get("name", f"Student #{id}")
            
            if not ip or not os.path.exists(ip):
                print(f"Student {id}: Registered image at '{ip}' does not exist on disk.")
                results.append({'id': id, 'isAttendance': False})
                continue

            is_student_present = False
            for face_item in detected_faces:
                try:
                    res = DeepFace.verify(
                        face_item["filename"], 
                        ip, 
                        model_name='ArcFace', 
                        detector_backend='retinaface', 
                        enforce_detection=False
                    )
                    if res.get('verified', False):
                        is_student_present = True
                        face_item["identified"] = True
                        face_item["studentId"] = id
                        face_item["studentName"] = s_name
                        print(f"Match found: Student {id} ({s_name}) matched {face_item['filename']}")
                        break
                except Exception as e:
                    print(f"Error verifying student {id} with {face_item['filename']}: {e}")

            results.append({'id': id, 'isAttendance': is_student_present})

        return_faces = []
        for face_item in detected_faces:
            return_faces.append({
                "box": face_item["box"],
                "identified": face_item["identified"],
                "studentId": face_item["studentId"],
                "studentName": face_item["studentName"]
            })

        return {"attendance": results, "faces": return_faces}

    finally:
        if os.path.exists('tamthoi'):
            try:
                shutil.rmtree('tamthoi')
            except Exception as e:
                print(f"Error removing 'tamthoi' directory: {e}")


@app.post("/attendance")
async def attendance(image_ids: List[str] = Form(...), image_file: UploadFile = File(...)):
    start_time = time.time()
    try:
        try:
            numbers_str = image_ids[0].split(',')
            numbers_int = [int(num) for num in numbers_str if num.strip()]
        except Exception as e:
            print(f"Error parsing image_ids: {e}")
            numbers_int = []

        if not numbers_int:
            print("Warning: Parsed numbers_int is empty.")
            return {"attendance": [], "faces": []}

        os.makedirs('./temp', exist_ok=True)
        file_path = f"./temp/{image_file.filename}"
        
        try:
            with open(file_path, "wb") as buffer:
                buffer.write(await image_file.read())
            results = checkAttendence(file_path, numbers_int)
        finally:
            if os.path.exists(file_path):
                os.remove(file_path)
        
        elapsed_time = time.time() - start_time
        print(f"Time taken to process attendance: {elapsed_time:.2f} seconds")
        return results

    except Exception as e:
        print("CRITICAL ERROR in /attendance endpoint:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI Face Recognition Service Error: {str(e)}")
