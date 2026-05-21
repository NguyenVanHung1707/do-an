import os
import time
import cv2
import numpy as np
import mediapipe as mp
import asyncio
from collections import deque
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List
import threading

app = FastAPI(title="AI Proctoring Gaze Tracking Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
STORAGE_ROOT = os.getenv("STORAGE_ROOT", "/app/data/future_ai_feature")
FPS = 30
VIOLATION_THRESHOLD_SEC = 3.0
BUFFER_BEFORE_SEC = 5.0
BUFFER_AFTER_SEC = 5.0

# MediaPipe FaceMesh setup
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Active sessions state
sessions: Dict[str, dict] = {}

class ProctorSessionRequest(BaseModel):
    student_id: str
    exam_id: str

class ViolationLog(BaseModel):
    student_id: str
    exam_id: str
    timestamp: str
    video_path: str
    details: str

def get_session_key(exam_id: str, student_id: str) -> str:
    return f"{exam_id}_{student_id}"

# Head Pose Estimation helper
def estimate_head_pose(landmarks, img_w, img_h):
    # Standard 3D Model Points of a face
    model_points = np.array([
        (0.0, 0.0, 0.0),             # Nose tip
        (0.0, -330.0, -65.0),        # Chin
        (-225.0, 170.0, -135.0),     # Left eye corner
        (225.0, 170.0, -135.0),      # Right eye corner
        (-150.0, -150.0, -125.0),    # Left mouth corner
        (150.0, -150.0, -125.0)      # Right mouth corner
    ], dtype=np.float64)

    # Selected 2D landmark indices from MediaPipe FaceMesh
    # Nose tip (1), Chin (152), Left Eye Corner (33), Right Eye Corner (263), Left Mouth Corner (57), Right Mouth Corner (287)
    indices = [1, 152, 33, 263, 57, 287]
    image_points = []
    for idx in indices:
        lm = landmarks[idx]
        image_points.append((lm.x * img_w, lm.y * img_h))
    image_points = np.array(image_points, dtype=np.float64)

    # Camera Matrix Approximation
    focal_length = img_w
    center = (img_w / 2, img_h / 2)
    camera_matrix = np.array([
        [focal_length, 0, center[0]],
        [0, focal_length, center[1]],
        [0, 0, 1]
    ], dtype=np.float64)

    dist_coeffs = np.zeros((4, 1)) # Assuming no lens distortion
    
    success, rotation_vector, translation_vector = cv2.solvePnP(
        model_points, image_points, camera_matrix, dist_coeffs, flags=cv2.SOLVEPNP_ITERATIVE
    )

    if not success:
        return 0.0, 0.0

    # Convert rotation vector to Euler Angles
    rmat, _ = cv2.Rodrigues(rotation_vector)
    proj_matrix = np.hstack((rmat, translation_vector))
    _, _, _, _, _, _, euler_angles = cv2.decomposeProjectionMatrix(proj_matrix)

    pitch = euler_angles[0, 0]
    yaw = euler_angles[1, 0]
    
    return pitch, yaw

# Analyze eye gaze ratio helper
def estimate_gaze(landmarks, img_w, img_h):
    # Left eye center / right eye center ratio against eye contour width
    # Check landmark 468 (Right eye iris center) and eye contours 33, 133
    right_iris = landmarks[468]
    right_left_corner = landmarks[33]
    right_right_corner = landmarks[133]
    
    # Distance ratio
    dist_total = abs(right_right_corner.x - right_left_corner.x)
    if dist_total == 0:
        return True
    dist_iris = abs(right_iris.x - right_left_corner.x)
    ratio = dist_iris / dist_total
    
    # Normal gazing range is between 0.32 and 0.68
    if ratio < 0.32 or ratio > 0.68:
        return False # Sideways gaze detected
    return True

def save_violation_video(session_key: str, exam_id: str, student_id: str, frame_buffer: List[np.ndarray], timestamp: str):
    try:
        # Create directories: STORAGE_ROOT/[exam_id]/[student_id]/
        output_dir = os.path.join(STORAGE_ROOT, exam_id, student_id)
        os.makedirs(output_dir, exist_ok=True)

        filename = f"violation_{timestamp}.mp4"
        file_path = os.path.join(output_dir, filename)

        if not frame_buffer:
            return

        h, w, _ = frame_buffer[0].shape
        fourcc = cv2.VideoWriter_fourcc(*'mp4v') # Standard MP4 encoding
        out = cv2.VideoWriter(file_path, fourcc, 15, (w, h))

        for frame in frame_buffer:
            out.write(frame)
        out.release()
        
        # Log database entry
        log_entry = {
            "student_id": student_id,
            "exam_id": exam_id,
            "timestamp": timestamp,
            "video_path": file_path,
            "details": "Thí sinh quay đầu hoặc dời mắt khỏi màn hình quá 3 giây liên tục."
        }
        if session_key in sessions:
            sessions[session_key]["logs"].append(log_entry)
            sessions[session_key]["recording_in_progress"] = False
        print(f"[AI Proctor] Recorded violation video successfully for {student_id}: {file_path}")
    except Exception as e:
        print(f"[AI Proctor] Error saving video: {e}")

@app.post("/api/proctor/start")
async def start_proctoring(req: ProctorSessionRequest):
    key = get_session_key(req.exam_id, req.student_id)
    if key in sessions and sessions[key]["is_active"]:
        return {"status": "already_active", "message": "Giám sát AI đã được kích hoạt từ trước."}
    
    # Store dynamic rolling buffer of frames (holds maximum 10s at ~30fps max)
    sessions[key] = {
        "gaze_buffer": deque(maxlen=int(FPS * (BUFFER_BEFORE_SEC + BUFFER_AFTER_SEC))),
        "violation_timer": 0.0,
        "is_active": True,
        "recording_in_progress": False,
        "logs": []
    }
    print(f"[AI Proctor] Session started for exam: {req.exam_id}, student: {req.student_id}")
    return {"status": "started", "message": "Bắt đầu giám sát webcam sinh viên thành công."}

@app.post("/api/proctor/stop")
async def stop_proctoring(req: ProctorSessionRequest):
    key = get_session_key(req.exam_id, req.student_id)
    if key not in sessions:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên giám thị đang hoạt động.")
    
    sessions[key]["is_active"] = False
    # Clear buffers to free RAM immediately
    sessions[key]["gaze_buffer"].clear()
    print(f"[AI Proctor] Session stopped for exam: {req.exam_id}, student: {req.student_id}")
    return {"status": "stopped", "message": "Đã tắt giám sát và giải phóng tài nguyên hệ thống."}

@app.get("/api/proctor/logs")
async def get_proctor_logs(exam_id: str, student_id: str):
    key = get_session_key(exam_id, student_id)
    if key in sessions:
        return {"logs": sessions[key]["logs"]}
    
    # Fallback to search directories on physical drive
    logs = []
    output_dir = os.path.join(STORAGE_ROOT, exam_id, student_id)
    if os.path.exists(output_dir):
        for file in os.listdir(output_dir):
            if file.endswith(".mp4"):
                timestamp = file.replace("violation_", "").replace(".mp4", "")
                logs.append({
                    "student_id": student_id,
                    "exam_id": exam_id,
                    "timestamp": timestamp,
                    "video_path": os.path.join(output_dir, file),
                    "details": "Vi phạm quy chế thi (Phát hiện từ file lưu trữ hệ thống)."
                })
    return {"logs": logs}

@app.websocket("/api/proctor/stream/{exam_id}/{student_id}")
async def websocket_stream(websocket: WebSocket, exam_id: str, student_id: str):
    await websocket.accept()
    key = get_session_key(exam_id, student_id)
    
    # Auto-initialize session if BE forgot to call /start
    if key not in sessions or not sessions[key]["is_active"]:
        sessions[key] = {
            "gaze_buffer": deque(maxlen=int(FPS * (BUFFER_BEFORE_SEC + BUFFER_AFTER_SEC))),
            "violation_timer": 0.0,
            "is_active": True,
            "recording_in_progress": False,
            "logs": []
        }

    sess = sessions[key]
    last_processed_time = time.time()
    
    try:
        while True:
            # Receive image frame as bytes/binary from frontend WebSocket client
            data = await websocket.receive_bytes()
            if not sess["is_active"]:
                break
                
            # Decode frame image
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None:
                continue

            current_time = time.time()
            dt = current_time - last_processed_time
            last_processed_time = current_time

            # Keep a rolling buffer of frames in memory
            sess["gaze_buffer"].append(frame)

            # Process AI detection
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb_frame)

            violation_detected = False
            
            if results.multi_face_landmarks:
                landmarks = results.multi_face_landmarks[0].landmark
                h, w, _ = frame.shape
                
                # 1. Analyze Head Pose
                pitch, yaw = estimate_head_pose(landmarks, w, h)
                # 2. Analyze Gaze Center
                focused = estimate_gaze(landmarks, w, h)
                
                # Check thresholds
                if abs(yaw) > 30.0 or abs(pitch) > 20.0 or not focused:
                    violation_detected = True
            else:
                # No face detected in frame is also a potential violation
                violation_detected = True

            # Track violation timing
            if violation_detected:
                sess["violation_timer"] += dt
                # Trigger violation if sustained for 3 seconds
                if sess["violation_timer"] >= VIOLATION_THRESHOLD_SEC and not sess["recording_in_progress"]:
                    sess["recording_in_progress"] = True
                    sess["violation_timer"] = 0.0 # reset timer
                    
                    timestamp_str = time.strftime("%Y%m%d_%H%M%S")
                    
                    # Capture the 5s BEFORE violation (already in queue)
                    # and wait for 5s AFTER violation before saving
                    asyncio.create_task(
                        delayed_recording_dump(
                            key, exam_id, student_id, timestamp_str
                        )
                    )
            else:
                # Reset timer if looking back at screen
                sess["violation_timer"] = max(0.0, sess["violation_timer"] - (dt * 2.0))

    except WebSocketDisconnect:
        print(f"[AI Proctor] WebSocket disconnected for student: {student_id}")
    finally:
        pass

async def delayed_recording_dump(key: str, exam_id: str, student_id: str, timestamp: str):
    # Wait for 5 seconds to capture the AFTER-violation frames
    await asyncio.sleep(BUFFER_AFTER_SEC)
    
    if key in sessions:
        # Copy the current rolling frame queue (contains ~10 seconds of video total)
        frames_to_save = list(sessions[key]["gaze_buffer"])
        
        # Save video asynchronously in a background thread to prevent blocking WebSocket
        threading.Thread(
            target=save_violation_video,
            args=(key, exam_id, student_id, frames_to_save, timestamp)
        ).start()
