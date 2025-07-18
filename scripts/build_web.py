# Build script for web deployment
import subprocess
import sys
import os
import json

def update_dashboard_with_fresh_data(dashboard_file):
    """Update the dashboard HTML file with fresh data from JSON files"""
    try:
        # Read the fresh data
        data_file = "yast-react/public/data/performance_data.json"
        if not os.path.exists(data_file):
            print(f"Fresh data file not found: {data_file}")
            return None
        
        with open(data_file, 'r') as f:
            fresh_data = json.load(f)
        
        # Read the dashboard HTML
        with open(dashboard_file, 'r', encoding='utf-8') as f:
            dashboard_content = f.read()
        
        # Find the fallback data section and replace it
        import re
        
        # Pattern to match the fallback data array
        pattern = r'const fallbackData = \[.*?\];'
        
        # Convert fresh data to JavaScript array format
        js_data = json.dumps(fresh_data, indent=12)
        replacement = f'const fallbackData = {js_data};'
        
        # Replace the fallback data in the HTML
        updated_content = re.sub(pattern, replacement, dashboard_content, flags=re.DOTALL)
        
        # Also update the timestamp
        from datetime import datetime
        current_date = datetime.now().strftime("%B %d, %Y")
        timestamp_pattern = r'<div class="timestamp">Last Updated: [^<]+</div>'
        timestamp_replacement = f'<div class="timestamp">Last Updated: {current_date}</div>'
        updated_content = re.sub(timestamp_pattern, timestamp_replacement, updated_content)
        
        if updated_content != dashboard_content:
            print(f"Successfully updated dashboard with {len(fresh_data)} fresh data entries and current timestamp")
            return updated_content
        else:
            print("No data replacement made in dashboard")
            return None
            
    except Exception as e:
        print(f"Error updating dashboard with fresh data: {e}")
        return None

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
        
        # Check if we have recent data (less than 6 hours old)
        data_file = "yast-react/public/data/performance_data.json"
        use_existing_data = False
        
        if os.path.exists(data_file):
            import time
            file_age_hours = (time.time() - os.path.getmtime(data_file)) / 3600
            if file_age_hours < 6:
                print(f"Using existing data (age: {file_age_hours:.1f} hours)")
                use_existing_data = True
        
        if not use_existing_data:
            print("Generating fresh data...")
            # Use a shorter analysis period for faster builds
            os.environ['QUICK_BUILD'] = '1'  # Signal for faster processing
            subprocess.run([sys.executable, "scripts/generate_web_data.py"], check=True, timeout=600)  # 10 minute timeout
        else:
            print("Skipping data generation - using existing recent data")
        
        # Copy HTML dashboard to React public folder
        print("Copying HTML dashboard...")
        import shutil
        dashboard_file = "dashboard_fresh.html"
        if os.path.exists(dashboard_file):
            # Update dashboard with fresh data if available
            updated_dashboard = update_dashboard_with_fresh_data(dashboard_file)
            if updated_dashboard:
                # Update the source file too so it gets committed
                with open(dashboard_file, 'w', encoding='utf-8') as f:
                    f.write(updated_dashboard)
                print("Updated source dashboard_fresh.html with fresh data and timestamp")
                
                # Copy to React public folder
                with open(os.path.join(react_dir, "public", "dashboard.html"), 'w', encoding='utf-8') as f:
                    f.write(updated_dashboard)
                print("Updated dashboard with fresh data and copied to React public folder")
            else:
                shutil.copy2(dashboard_file, os.path.join(react_dir, "public", "dashboard.html"))
                print(f"Copied {dashboard_file} to React public folder (no data update)")
        else:
            print(f"ERROR: {dashboard_file} not found!")
        
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
