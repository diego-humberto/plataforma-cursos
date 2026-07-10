import subprocess
import re
import os

def get_video_duration_v1(video_path, timeout=15):
    command = ['ffmpeg', '-i', video_path]
    try:
        result = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        try:
            output = result.communicate(timeout=timeout)[0].decode('utf-8', errors='replace')
        except subprocess.TimeoutExpired:
            # Arquivo ainda sendo copiado/corrompido pode travar o ffmpeg;
            # matar o processo e seguir o scan (duração fica 0 e é
            # recalculada no próximo rescan)
            result.kill()
            result.communicate()
            return 0
        duration_match = re.search(r'Duration: (\d+):(\d+):(\d+(?:\.\d+)?)', output)
        if duration_match:
            hours = int(duration_match.group(1))
            minutes = int(duration_match.group(2))
            seconds = float(duration_match.group(3))
            total_seconds = hours * 3600 + minutes * 60 + int(seconds)
            return total_seconds
        else:
            return 0
    except Exception as e:
        return 0

def open_video(video_path):
    if os.path.exists(video_path):
        try:
            os.startfile(video_path)
        except:
            pass
        return

