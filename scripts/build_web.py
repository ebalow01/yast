# Build script for web deployment
import subprocess
import sys
import os

def build_web_app():
    """Build the React web application"""
    print("Building React web application...")
    
    # Change to React directory
    react_dir = "yast-react"
    if not os.path.exists(react_dir):
        print(f"ERROR: React directory {react_dir} not found!")
        return False
    
    try:
        # Install dependencies
        print("Installing dependencies...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
        
        # Generate web data
        print("Generating web data...")
        subprocess.run([sys.executable, "scripts/generate_web_data.py"], check=True)
        
        # Copy HTML dashboard to React public folder
        print("Copying HTML dashboard...")
        import shutil
        dashboard_files = ["dashboard_preview.html", "dashboard_fresh.html"]
        for dashboard in dashboard_files:
            if os.path.exists(dashboard):
                shutil.copy2(dashboard, os.path.join(react_dir, "public", "dashboard.html"))
                print(f"Copied {dashboard} to React public folder")
                break
        
        # Check if npm is available
        try:
            subprocess.run(["npm", "--version"], check=True, capture_output=True)
            npm_available = True
        except (subprocess.CalledProcessError, FileNotFoundError):
            npm_available = False
            
        if npm_available:
            # Build React app
            print("Building React app...")
            subprocess.run(["npm", "install"], cwd=react_dir, check=True)
            subprocess.run(["npm", "run", "build"], cwd=react_dir, check=True)
            
            print("SUCCESS: Web application built successfully!")
            print(f"Built files are in: {react_dir}/dist/")
        else:
            print("WARNING: npm not found. Skipping React build.")
            print("Data generation completed successfully.")
            print("React build will be handled by Netlify.")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"ERROR: Build failed: {e}")
        return False
    except (OSError, FileNotFoundError) as e:
        print(f"ERROR: File/directory error: {e}")
        return False

if __name__ == "__main__":
    success = build_web_app()
    sys.exit(0 if success else 1)
