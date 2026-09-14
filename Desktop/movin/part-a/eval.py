import argparse
import json
from pathlib import Path
from ultralytics import YOLO
import pandas as pd

CLASS_MAP = {
    'bench': 'sofa',
    'couch': 'sofa',
    'bed': 'double_bed',
    'chair': 'armchair',
    'dining table': 'coffee_table',
    'tv': 'tv',
    'refrigerator': 'refrigerator'
}

VOLUMES = {
    'sofa': 1.8,
    'double_bed': 2.2,
    'armchair': 0.7,
    'coffee_table': 0.35,
    'tv': 0.15,
    'refrigerator': 1.1
}

ROOT = Path(__file__).resolve().parents[1]
IMAGES_DIR = ROOT / 'Images' / 'Living Room'
GT_FILE = Path(__file__).with_name('ground_truth.json')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--images-dir', type=Path, default=IMAGES_DIR)
    parser.add_argument('--ground-truth', type=Path, default=GT_FILE)
    parser.add_argument('--model', type=Path, default=Path(__file__).with_name('yolov8n.pt'))
    parser.add_argument('--confidence', type=float, default=0.25)
    parser.add_argument('--output', type=Path, default=Path(__file__).with_name('eval_results.json'))
    args = parser.parse_args()
    model = YOLO(str(args.model)) 
    
    with open(args.ground_truth, 'r') as f:
        ground_truth = json.load(f)
        
    test_images = list(ground_truth.keys())
    
    total_vwae = 0.0
    results = []

    for img_name in test_images:
        img_path = args.images_dir / img_name
        preds = model(str(img_path), conf=args.confidence, verbose=False)
        
        detected_counts = {}
        for r in preds:
            for c in r.boxes.cls:
                class_name = model.names[int(c)]
                if class_name in CLASS_MAP:
                    mapped_name = CLASS_MAP[class_name]
                    detected_counts[mapped_name] = detected_counts.get(mapped_name, 0) + 1
                    
        gt_counts = ground_truth[img_name]
        
        # Calculate errors for this image
        all_classes = set(list(detected_counts.keys()) + list(gt_counts.keys()))
        img_error_vol = 0.0
        
        error_details = []
        for cls in all_classes:
            pred_qty = detected_counts.get(cls, 0)
            gt_qty = gt_counts.get(cls, 0)
            diff = pred_qty - gt_qty
            
            if diff != 0:
                vol = VOLUMES.get(cls, 0)
                err_vol = abs(diff) * vol
                img_error_vol += err_vol
                total_vwae += err_vol
                
                err_type = "False Positive (Hallucination)" if diff > 0 else "False Negative (Missed)"
                error_details.append(f"{cls}: {diff:+} ({err_type})")
                
        results.append({
            'Image': img_name,
            'VWAE (m³)': img_error_vol,
            'Errors': "; ".join(error_details) if error_details else "Perfect"
        })
        
    df = pd.DataFrame(results)
    print("\n=== EVALUATION RESULTS ===")
    print(df.to_string(index=False))
    print(f"\nTotal Volume-Weighted Absolute Error (VWAE): {total_vwae:.2f} m³")
    args.output.write_text(json.dumps({'confidence': args.confidence, 'total_vwae_m3': total_vwae, 'results': results}, indent=2) + '\n')

if __name__ == '__main__':
    main()
