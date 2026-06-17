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
                    
                    # Apply a 15% padding to keep the full context of the face (chin, forehead, ears) 
                    # and completely crop out any distracting background noise.
                    fw = x2 - x1
                    fh = y2 - y1
                    pad_w = int(fw * 0.15)
                    pad_h = int(fh * 0.15)
                    
                    x1 = max(0, x1 - pad_w)
                    y1 = max(0, y1 - pad_h)
                    x2 = min(w, x2 + pad_w)
                    y2 = min(h, y2 + pad_h)
                    
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
        student_verify_paths = {}
        for id in listID:
            s_info = student_data.get(id)
            if not s_info:
                continue
            ip = s_info.get("image_path")
            if not ip or not os.path.exists(ip):
                continue
                
            base_dir = os.path.dirname(ip)
            base_name = os.path.basename(ip)
            name_part, ext_part = os.path.splitext(base_name)
            ip_crop = os.path.join(base_dir, f"{name_part}_crop{ext_part}")

            # Automatically crop the registered image using RetinaFace on the first run or if original image was updated
            should_crop = False
            if os.path.exists(ip):
                mtime_orig = os.path.getmtime(ip)
                mtime_crop = os.path.getmtime(ip_crop) if os.path.exists(ip_crop) else 0
                if not os.path.exists(ip_crop) or mtime_orig > mtime_crop:
                    should_crop = True

            if should_crop:
                try:
                    if os.path.exists(ip_crop):
                        os.remove(ip_crop)
                    print(f"Creating lazy cropped face for student {id} registered image: {ip} -> {ip_crop}")
                    detections_reg = RetinaFace.detect_faces(ip)
                    if isinstance(detections_reg, dict) and "face_1" in detections_reg:
                        reg_img = cv2.imread(ip)
                        if reg_img is not None:
                            rh, rw, _ = reg_img.shape
                            rx1, ry1, rx2, ry2 = detections_reg["face_1"]["facial_area"]
                            
                            # Add matching 15% padding to keep identical cropping zoom/scale
                            rfw = rx2 - rx1
                            rfh = ry2 - ry1
                            rpad_w = int(rfw * 0.15)
                            rpad_h = int(rfh * 0.15)
                            
                            rx1 = max(0, rx1 - rpad_w)
                            ry1 = max(0, ry1 - rpad_h)
                            rx2 = min(rw, rx2 + rpad_w)
                            ry2 = min(rh, ry2 + rpad_h)
                            
                            reg_face_crop = reg_img[ry1:ry2, rx1:rx2]
                            cv2.imwrite(ip_crop, reg_face_crop)
                            print(f"Successfully created cropped registered face at {ip_crop}")
                    
                    if not os.path.exists(ip_crop):
                        shutil.copy(ip, ip_crop)
                        print(f"RetinaFace could not find face in registered image of student {id}. Fallback to copying original.")
                except Exception as e:
                    print(f"Error while cropping registered image for student {id}: {e}")
                    try:
                        shutil.copy(ip, ip_crop)
                    except Exception as copy_err:
                        print(f"Failed to copy fallback: {copy_err}")
            
            student_verify_paths[id] = {
                "verify_path": ip_crop if os.path.exists(ip_crop) else ip,
                "name": s_info.get("name", f"Student #{id}")
            }

        # Extract embeddings for all students (only once per student)
        student_embeddings = {}
        for id in listID:
            s_verify_info = student_verify_paths.get(id)
            if not s_verify_info:
                print(f"Student {id}: No registered image verified path.")
                continue
            ip_verify = s_verify_info["verify_path"]
            s_name = s_verify_info["name"]
            
            try:
                rep = DeepFace.represent(
                    img_path=ip_verify,
                    model_name='ArcFace',
                    detector_backend='skip',
                    enforce_detection=False
                )
                if rep and len(rep) > 0:
                    # Compatibility fix for different DeepFace versions
                    if isinstance(rep[0], dict):
                        emb = rep[0]["embedding"]
                    else:
                        emb = rep
                        
                    student_embeddings[id] = {
                        "embedding": emb,
                        "name": s_name
                    }
                    print(f"[AI Embeddings] Extracted embedding for Student {id} ({s_name})")
            except Exception as e:
                print(f"Error extracting embedding for student {id} ({s_name}): {e}")

        # Extract embeddings for all detected classroom faces (only once per face)
        face_embeddings = []
        for idx, face_item in enumerate(detected_faces):
            try:
                rep = DeepFace.represent(
                    img_path=face_item["filename"],
                    model_name='ArcFace',
                    detector_backend='skip',
                    enforce_detection=False
                )
                if rep and len(rep) > 0:
                    # Compatibility fix for different DeepFace versions
                    if isinstance(rep[0], dict):
                        emb = rep[0]["embedding"]
                    else:
                        emb = rep
                        
                    face_embeddings.append({
                        "idx": idx,
                        "embedding": emb,
                        "filename": face_item["filename"]
                    })
                    print(f"[AI Embeddings] Extracted embedding for face_{idx+1}")
            except Exception as e:
                print(f"Error extracting embedding for face_{idx+1}: {e}")

        # Compute cosine distance matrix cross-product
        import numpy as np
        def dst_cosine(a, b):
            a = np.array(a)
            b = np.array(b)
            return 1 - (np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

        all_matches = []
        threshold = 0.68  # ArcFace standard Cosine threshold in DeepFace
        
        for id, s_info in student_embeddings.items():
            s_emb = s_info["embedding"]
            s_name = s_info["name"]
            
            for f_info in face_embeddings:
                f_idx = f_info["idx"]
                f_emb = f_info["embedding"]
                
                try:
                    distance = float(dst_cosine(s_emb, f_emb))
                    verified = distance <= threshold
                    print(f"[AI Face ID Evaluation] Student {id} ({s_name}) vs face_{f_idx+1}: distance={distance:.4f}, threshold={threshold:.4f}, verified={verified}")
                    
                    if verified:
                        all_matches.append({
                            "student_id": id,
                            "student_name": s_name,
                            "face_idx": f_idx,
                            "distance": distance
                        })
                except Exception as e:
                    print(f"Error computing cosine distance for Student {id} vs face_{f_idx+1}: {e}")

        # Sort matches by distance (best matches first)
        all_matches.sort(key=lambda x: x["distance"])

        assigned_students = set()
        assigned_faces = set()
        
        for match in all_matches:
            s_id = match["student_id"]
            f_idx = match["face_idx"]
            dist = match["distance"]
            s_name = match["student_name"]
            
            if s_id not in assigned_students and f_idx not in assigned_faces:
                detected_faces[f_idx]["identified"] = True
                detected_faces[f_idx]["studentId"] = s_id
                detected_faces[f_idx]["studentName"] = s_name
                
                assigned_students.add(s_id)
                assigned_faces.add(f_idx)
                print(f"[AI Match Assigned] Student {s_id} ({s_name}) -> face_{f_idx+1}.jpg with distance={dist:.4f}")

        results = []
        for id in listID:
            is_present = id in assigned_students
            results.append({'id': id, 'isAttendance': is_present})

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
