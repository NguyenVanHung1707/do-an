import os
import subprocess

STORAGE_ROOT = os.getenv("STORAGE_ROOT", "/app/data/future_ai_feature")

def transcode_videos():
    print(f"[*] Starting media migration. Scanning directory: {STORAGE_ROOT}")
    if not os.path.exists(STORAGE_ROOT):
        print(f"[!] Storage directory does not exist: {STORAGE_ROOT}")
        return

    transcoded_count = 0
    skipped_count = 0
    error_count = 0

    for root, dirs, files in os.walk(STORAGE_ROOT):
        for file in files:
            if file.endswith(".mp4") and not file.startswith("temp_") and not file.startswith("transcoding_"):
                file_path = os.path.join(root, file)
                print(f"[*] Checking file: {file_path}")
                
                # Check video codec using ffprobe if available
                is_h264 = False
                try:
                    probe_cmd = [
                        "ffprobe", "-v", "error", 
                        "-select_streams", "v:0", 
                        "-show_entries", "stream=codec_name", 
                        "-of", "csv=p=0", 
                        file_path
                    ]
                    codec = subprocess.check_output(probe_cmd).decode().strip()
                    if codec == "h264":
                        is_h264 = True
                except Exception:
                    # If ffprobe fails or is not found, we'll proceed with transcoding
                    pass

                if is_h264:
                    print(f"    [~] Video is already H.264. Skipping: {file}")
                    skipped_count += 1
                    continue

                print(f"    [+] Transcoding {file} to H.264...")
                temp_path = os.path.join(root, f"transcoding_{file}")
                
                try:
                    cmd = [
                        "ffmpeg", "-y", "-i", file_path,
                        "-vcodec", "libx264",
                        "-pix_fmt", "yuv420p",
                        "-profile:v", "baseline", "-level", "3.0",
                        temp_path
                    ]
                    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    if result.returncode == 0:
                        if os.path.exists(file_path):
                            os.remove(file_path)
                        os.rename(temp_path, file_path)
                        print(f"    [V] Successfully transcoded: {file}")
                        transcoded_count += 1
                    else:
                        print(f"    [X] Failed to transcode {file}: {result.stderr.decode()}")
                        if os.path.exists(temp_path):
                            os.remove(temp_path)
                        error_count += 1
                except Exception as err:
                    print(f"    [X] Error running ffmpeg: {err}")
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                    error_count += 1

    print(f"\n[+] Migration completed!")
    print(f"    - Transcoded: {transcoded_count} files")
    print(f"    - Already H.264 (Skipped): {skipped_count} files")
    print(f"    - Errors: {error_count} files")

if __name__ == "__main__":
    transcode_videos()
