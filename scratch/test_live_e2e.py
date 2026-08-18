import time
import requests
import json
import os

API_URL = "http://localhost:4000/api"
AI_URL = "http://localhost:8000/api/v1"
HEADERS = {
    "Authorization": "Bearer mock-token-admin"
}

def run_live_e2e():
    print("=== SMARTCAMPUS AI: LIVE E2E PIPELINE TEST ===")
    
    # 1. Create Session
    create_res = requests.post(f"{API_URL}/enrollment/sessions", headers=HEADERS, json={
        "name": "Live Automated E2E Session"
    })
    assert create_res.status_code == 201, f"Failed creating session: {create_res.text}"
    session = create_res.json()
    session_id = session["id"]
    print(f"[1/8] Created Enrollment Session: {session_id}")

    # 2. Attach Video
    sample_videos = [
        "apps/ai-service/storage/enrollment/cmsu0sm8r0016nt6eu234uq1t/videos/1786776837491_2.mp4",
        "storage/enrollment/cmstenl0r0000dv6exgea3nzq/videos/1786762391217_1.mp4",
    ]
    chosen_video = None
    for sv in sample_videos:
        if os.path.exists(sv):
            chosen_video = os.path.abspath(sv)
            break
    assert chosen_video, "No sample video found on disk."
    
    upload_res = requests.post(
        f"{API_URL}/enrollment/sessions/{session_id}/videos",
        headers=HEADERS,
        json={"videoPaths": [chosen_video]}
    )
    assert upload_res.status_code in (200, 201), f"Failed attaching video: {upload_res.text}"
    print(f"[2/8] Attached Video to Session: {chosen_video}")

    # 3. Start AI Processing
    proc_res = requests.post(f"{API_URL}/enrollment/sessions/{session_id}/start", headers=HEADERS, json={
        "detector": "scrfd"
    })
    assert proc_res.status_code in (200, 201), f"Failed starting processing: {proc_res.text}"
    print(f"[3/8] Started AI Processing for session {session_id}")

    # 4. Wait for processing frames
    print("Waiting 10 seconds for real face detection, tracking, and crop extraction...")
    time.sleep(10)

    # 5. Stop and Cluster
    stop_res = requests.post(f"{API_URL}/enrollment/sessions/{session_id}/stop", headers=HEADERS)
    assert stop_res.status_code in (200, 201), f"Failed stopping session: {stop_res.text}"
    print(f"[4/8] Stopped session and triggered clustering: {stop_res.json()}")

    # 6. Fetch clusters from NestJS Postgres DB
    clusters_res = requests.get(f"{API_URL}/enrollment/sessions/{session_id}/clusters", headers=HEADERS)
    assert clusters_res.status_code == 200, f"Failed fetching clusters: {clusters_res.text}"
    clusters = clusters_res.json()
    print(f"[5/8] Retrieved {len(clusters)} clusters from Postgres DB!")
    assert len(clusters) > 0, "Expected at least 1 cluster generated from video."
    
    first_cluster = clusters[0]
    print(f"      Cluster 1: id={first_cluster['id']}, status={first_cluster['status']}, samples={first_cluster['sampleCount']}, qualityAvg={first_cluster['qualityAvg']}")

    # 7. Search Students and Assign
    students_res = requests.get(f"{API_URL}/students?limit=5", headers=HEADERS)
    assert students_res.status_code == 200
    students_data = students_res.json()["data"]
    chosen_student = students_data[0]
    student_id = chosen_student["id"]
    student_name = chosen_student["fullName"]
    student_usn = chosen_student["studentId"]
    print(f"[6/8] Assigning Student '{student_name}' (USN {student_usn}) to Cluster {first_cluster['id']}...")

    assign_res = requests.post(f"{API_URL}/enrollment/clusters/assign-student", headers=HEADERS, json={
        "clusterId": first_cluster["id"],
        "existingStudentId": student_id,
        "usn": student_usn,
        "fullName": student_name
    })
    assert assign_res.status_code in (200, 201), f"Failed assigning student: {assign_res.text}"
    print(f"[7/8] Assigned Student: {assign_res.json()}")

    # 8. Enroll in FAISS
    enroll_res = requests.post(f"{AI_URL}/sessions/{session_id}/enroll-cluster", json={
        "clusterId": f"cluster_{first_cluster['clusterNumber']:03d}",
        "usn": student_usn
    })
    assert enroll_res.status_code == 200, f"Failed FAISS enrollment: {enroll_res.text}"
    enroll_data = enroll_res.json()
    print(f"[8/8] FAISS Enrollment Result: {enroll_data}")
    assert enroll_data["success"] is True

    print("\n============================================================")
    print("ALL 8 PIPELINE STAGES PASSED SUCCESSFULLY!")
    print("============================================================")

if __name__ == "__main__":
    run_live_e2e()
