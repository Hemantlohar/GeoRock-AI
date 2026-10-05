"""
Computer Vision Slope Crack & Geological Discontinuity Analyzer
Uses OpenCV for rock slope fracture segmentation, crack skeletonization,
aperture width estimation, and visual hazard scoring.
"""

import os
import io
import base64
import cv2
import numpy as np

def create_synthetic_rockface(hazard_type: str = "fissured") -> np.ndarray:
    """
    Generates a realistic rock face image with geological joints and tension cracks for demonstration.
    """
    width, height = 640, 480
    np.random.seed(42 if hazard_type == "fissured" else 99)
    
    # Base rock texture: Perlin/fractal-like noise simulation
    base = np.zeros((height, width), dtype=np.float32)
    for scale in [16, 32, 64, 128]:
        noise = np.random.randn(height // scale + 2, width // scale + 2)
        resized = cv2.resize(noise, (width, height), interpolation=cv2.INTER_CUBIC)
        base += resized * (scale / 128.0)
        
    base = (base - base.min()) / (base.max() - base.min())
    rock_gray = (base * 140 + 50).astype(np.uint8)
    
    # Add granite/shale color tint (brownish grey)
    rock_bgr = cv2.applyColorMap(rock_gray, cv2.COLORMAP_BONE)
    
    # Draw rock benches / bedding planes
    for y in range(80, height, 110):
        variation = np.random.randint(-15, 15, size=width)
        points = [(x, min(height-1, max(0, y + variation[x]))) for x in range(0, width, 8)]
        for i in range(len(points) - 1):
            cv2.line(rock_bgr, points[i], points[i+1], (40, 40, 45), 2)
            
    if hazard_type == "critical":
        # Severe vertical tension crack cutting through benches
        pt = [width // 2, 20]
        crack_pts = [pt]
        for y in range(40, height - 30, 15):
            x_shift = int(np.random.normal(0, 7))
            pt = [max(80, min(width - 80, crack_pts[-1][0] + x_shift)), y]
            crack_pts.append(pt)
        for i in range(len(crack_pts) - 1):
            cv2.line(rock_bgr, tuple(crack_pts[i]), tuple(crack_pts[i+1]), (15, 15, 20), thickness=6)
            # Secondary branch
            if i % 4 == 0:
                branch_pt = (crack_pts[i][0] + np.random.randint(-50, 50), crack_pts[i][1] + 35)
                cv2.line(rock_bgr, tuple(crack_pts[i]), branch_pt, (25, 25, 30), thickness=3)
                
    elif hazard_type == "fissured":
        # Multiple moderate shear cracks
        for cx in [200, 440]:
            pt = [cx, 60]
            pts = [pt]
            for y in range(80, height - 60, 20):
                pt = [pt[0] + int(np.random.normal(0, 5)), y]
                pts.append(pt)
            for i in range(len(pts) - 1):
                cv2.line(rock_bgr, tuple(pts[i]), tuple(pts[i+1]), (20, 20, 25), thickness=4)
                
    return rock_bgr

class SlopeCrackAnalyzer:
    def __init__(self):
        self.sample_dir = os.path.join(os.path.dirname(__file__), "..", "data", "sample_images")
        os.makedirs(self.sample_dir, exist_ok=True)
        self._ensure_sample_images()

    def _ensure_sample_images(self):
        samples = {
            "critical_shear_crack.jpg": "critical",
            "moderate_fissures.jpg": "fissured",
            "stable_massive_bench.jpg": "stable"
        }
        for filename, hazard_type in samples.items():
            path = os.path.join(self.sample_dir, filename)
            if not os.path.exists(path):
                img = create_synthetic_rockface(hazard_type)
                cv2.imwrite(path, img)

    def analyze_image_bytes(self, image_bytes: bytes, scale_mm_per_pixel: float = 0.25) -> dict:
        """
        Analyzes a slope image buffer for rock cracks, fissures, and discontinuity statistics.
        """
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Invalid image file: Unable to decode image")
        return self._process_image(img, scale_mm_per_pixel)

    def analyze_sample(self, sample_name: str, scale_mm_per_pixel: float = 0.25) -> dict:
        path = os.path.join(self.sample_dir, sample_name)
        if not os.path.exists(path):
            path = os.path.join(self.sample_dir, "critical_shear_crack.jpg")
        img = cv2.imread(path)
        return self._process_image(img, scale_mm_per_pixel)

    def _process_image(self, img: np.ndarray, scale_mm_per_pixel: float) -> dict:
        h, w = img.shape[:2]
        
        # 1. Grayscale & Bilateral Filtering (removes surface noise while keeping crack edges sharp)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        filtered = cv2.bilateralFilter(gray, d=7, sigmaColor=50, sigmaSpace=50)
        
        # 2. Blackhat morphological transform to isolate dark cracks against rock background
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (13, 13))
        blackhat = cv2.morphologyEx(filtered, cv2.MORPH_BLACKHAT, kernel)
        
        # 3. Adaptive Thresholding on crack features
        thresh = cv2.adaptiveThreshold(
            blackhat, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 15, -4
        )
        
        # Clean isolated salt noise
        clean_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, clean_kernel)
        
        # 4. Find Crack Contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter genuine fissures by minimum area/length
        valid_cracks = []
        total_crack_pixels = 0
        max_width_px = 0.0
        total_length_px = 0.0
        
        annotated = img.copy()
        mask_overlay = np.zeros_like(img)
        
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < 30: # Ignore microscopic specks
                continue
                
            x, y, cw, ch = cv2.boundingRect(cnt)
            perimeter = cv2.arcLength(cnt, True)
            if perimeter == 0:
                continue
                
            # Aspect ratio or elongation check
            rect = cv2.minAreaRect(cnt)
            dim1, dim2 = rect[1]
            if dim1 == 0 or dim2 == 0:
                continue
            length = max(dim1, dim2)
            width = min(dim1, dim2)
            
            if length >= 12: # Significant linear crack
                valid_cracks.append(cnt)
                total_crack_pixels += area
                total_length_px += length
                max_width_px = max(max_width_px, width)
                
                # Draw crack contour highlight in bright cyan
                cv2.drawContours(mask_overlay, [cnt], -1, (0, 230, 255), thickness=cv2.FILLED)
                
                # Draw bounding box for major tension cracks
                if length > 50:
                    cv2.rectangle(annotated, (x, y), (x + cw, y + ch), (0, 70, 255), 2)
                    cv2.putText(
                        annotated, f"W:{width*scale_mm_per_pixel:.1f}mm",
                        (x, max(15, y - 5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 220, 255), 1, cv2.LINE_AA
                    )

        # Blend mask overlay onto annotated image (translucent neon highlight)
        alpha = 0.55
        annotated = cv2.addWeighted(annotated, 1.0, mask_overlay, alpha, 0)
        
        # Calculations
        crack_count = len(valid_cracks)
        total_length_mm = round(total_length_px * scale_mm_per_pixel, 1)
        max_width_mm = round(max_width_px * scale_mm_per_pixel, 1)
        surface_area_px = h * w
        fracture_density_pct = round((total_crack_pixels / surface_area_px) * 100, 2)
        
        # Visual Hazard Score (0 - 100)
        # Based on maximum crack width and density
        visual_score = min(100.0, (max_width_mm * 1.8) + (fracture_density_pct * 8.0) + (crack_count * 2.5))
        visual_score = round(visual_score, 1)
        
        if visual_score < 25.0:
            severity = "LOW"
            severity_color = "#10b981"
        elif visual_score < 55.0:
            severity = "MODERATE"
            severity_color = "#f59e0b"
        elif visual_score < 75.0:
            severity = "HIGH"
            severity_color = "#f97316"
        else:
            severity = "CRITICAL"
            severity_color = "#ef4444"
            
        # Add summary banner on annotated image
        cv2.rectangle(annotated, (10, 10), (320, 65), (15, 23, 42), cv2.FILLED)
        cv2.rectangle(annotated, (10, 10), (320, 65), (70, 80, 100), 1)
        cv2.putText(
            annotated, f"AI Crack Detection: {severity} ({visual_score}%)",
            (20, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA
        )
        cv2.putText(
            annotated, f"Fissures: {crack_count} | Max Width: {max_width_mm}mm",
            (20, 52), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (140, 200, 255), 1, cv2.LINE_AA
        )
        
        # Encode output images to base64
        _, orig_encoded = cv2.imencode(".jpg", img)
        _, annot_encoded = cv2.imencode(".jpg", annotated)
        
        orig_b64 = "data:image/jpeg;base64," + base64.b64encode(orig_encoded).decode("utf-8")
        annot_b64 = "data:image/jpeg;base64," + base64.b64encode(annot_encoded).decode("utf-8")
        
        return {
            "crack_count": crack_count,
            "max_width_mm": max_width_mm,
            "total_length_mm": total_length_mm,
            "fracture_density_pct": fracture_density_pct,
            "visual_hazard_score": visual_score,
            "visual_severity": severity,
            "severity_color": severity_color,
            "original_image": orig_b64,
            "annotated_image": annot_b64
        }

# Global singleton
cv_analyzer = SlopeCrackAnalyzer()

if __name__ == "__main__":
    res = cv_analyzer.analyze_sample("critical_shear_crack.jpg")
    print("Computer Vision Crack Analysis Test:")
    print(f"Cracks detected: {res['crack_count']}")
    print(f"Max crack width: {res['max_width_mm']} mm")
    print(f"Visual hazard score: {res['visual_hazard_score']}% ({res['visual_severity']})")
