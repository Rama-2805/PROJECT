import requests
import sys

def main():
    print("Testing Gateway authentication and Unknown Faces endpoints...")
    base_url = "http://localhost:4000/api"

    # 1. Log in
    login_url = f"{base_url}/auth/login"
    credentials = {
        "email": "teacher@smartcampus.edu",
        "password": "teacher123"
    }
    
    print(f"Logging in to {login_url} with {credentials['email']}...")
    try:
        r = requests.post(login_url, json=credentials)
        print(f"Response status: {r.status_code}")
        if r.status_code != 200 and r.status_code != 201:
            print("Login failed:", r.text)
            sys.exit(1)
        
        resp_data = r.json()
        print("Login response structure:", resp_data.keys())
        
        # In NestJS gateway, the structure may be {"success": true, "data": { "tokens": { "accessToken": "..." } }}
        # or similar. Let's inspect the data.
        data = resp_data.get("data", {})
        tokens = data.get("tokens", {})
        token = tokens.get("accessToken")
        
        if not token:
            token = resp_data.get("accessToken")
            
        if not token:
            print("Access token not found in response:", resp_data)
            sys.exit(1)
            
        print("Successfully obtained access token!")
        
        # 2. Get unknown faces
        headers = {
            "Authorization": f"Bearer {token}"
        }
        unknown_faces_url = f"{base_url}/attendance/unknown-faces"
        print(f"Fetching unknown faces from {unknown_faces_url}...")
        r_faces = requests.get(unknown_faces_url, headers=headers)
        print(f"Get faces status: {r_faces.status_code}")
        if r_faces.status_code != 200:
            print("Failed to fetch faces:", r_faces.text)
            sys.exit(1)
            
        faces_data = r_faces.json()
        print("Faces response structure:", faces_data)
        
    except Exception as e:
        print("Error during gateway test:", e)
        sys.exit(1)

if __name__ == "__main__":
    main()
