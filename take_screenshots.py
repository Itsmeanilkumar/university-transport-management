import os
import time
from playwright.sync_api import sync_playwright

def capture_screenshots():
    out_dir = r"C:\Users\omvis\.gemini\antigravity\scratch\unitransit\public\screenshots"
    os.makedirs(out_dir, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # 1. Login / Gateway Page
        print("Capturing 1: Login Gateway...")
        page.goto("http://localhost:5000", wait_until="networkidle")
        time.sleep(1)
        page.screenshot(path=os.path.join(out_dir, "01_login_gateway.png"))

        # 2. Driver Self-Registration Form
        print("Capturing 2: Driver Self-Registration...")
        page.evaluate("setAuthMode('register-driver')")
        time.sleep(1)
        page.screenshot(path=os.path.join(out_dir, "02_driver_registration.png"))

        # 3. Student Self-Registration Form
        print("Capturing 3: Student Self-Registration...")
        page.evaluate("setAuthMode('register-student')")
        time.sleep(1)
        page.screenshot(path=os.path.join(out_dir, "03_student_registration.png"))

        # 4. Management Overview Dashboard
        print("Capturing 4: Management Overview Dashboard...")
        page.evaluate("setAuthMode('login')")
        time.sleep(0.5)
        page.fill("#login-username", "management")
        page.fill("#login-password", "management")
        page.click("button[type='submit']")
        time.sleep(2)
        page.screenshot(path=os.path.join(out_dir, "04_management_overview.png"))

        # 5. Management Driver Route Allocation Table
        print("Capturing 5: Management Driver Allocation...")
        page.evaluate("navigate('drivers')")
        time.sleep(1.5)
        page.screenshot(path=os.path.join(out_dir, "05_management_driver_allocation.png"))

        # 6. Live GPS Radar (Leaflet Map)
        print("Capturing 6: Live GPS Fleet Radar...")
        page.evaluate("navigate('tracking')")
        time.sleep(2.5) # allow Leaflet tiles to load
        page.screenshot(path=os.path.join(out_dir, "06_live_gps_radar.png"))

        # 7. Student Transit Pass Directory (Management View)
        print("Capturing 7: Student Transit Passes...")
        page.evaluate("navigate('students')")
        time.sleep(1.5)
        page.screenshot(path=os.path.join(out_dir, "07_student_pass_directory.png"))

        # 8. Driver Cockpit / Driver Dashboard
        print("Capturing 8: Driver Dashboard...")
        page.evaluate("logout()")
        time.sleep(1)
        page.fill("#login-username", "driver1")
        page.fill("#login-password", "driver1")
        page.click("button[type='submit']")
        time.sleep(2)
        page.screenshot(path=os.path.join(out_dir, "08_driver_dashboard.png"))

        # 9. Driver Boarding Scanner / Attendance
        print("Capturing 9: Driver Boarding Attendance...")
        page.evaluate("navigate('attendance')")
        time.sleep(1.5)
        page.screenshot(path=os.path.join(out_dir, "09_driver_boarding_scanner.png"))

        # 10. Student Transit Hub & Pass
        print("Capturing 10: Student Transit Hub...")
        page.evaluate("logout()")
        time.sleep(1)
        page.fill("#login-username", "student1")
        page.fill("#login-password", "student1")
        page.click("button[type='submit']")
        time.sleep(2)
        page.screenshot(path=os.path.join(out_dir, "10_student_transit_hub.png"))

        browser.close()
        print("All 10 screenshots captured successfully!")

if __name__ == "__main__":
    capture_screenshots()
