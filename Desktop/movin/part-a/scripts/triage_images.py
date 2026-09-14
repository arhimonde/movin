#!/usr/bin/env python3
"""Create a reproducible image-quality triage manifest for the MOVIN corpus."""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
from typing import Any

IMAGE_EXTENSIONS={'.jpg','.jpeg','.png','.webp'}
def inspect(path: Path, root: Path) -> dict[str, Any]:
    record={'path':str(path.relative_to(root)), 'status':'review', 'flags':[], 'bytes':path.stat().st_size, 'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    try:
        from PIL import Image
        with Image.open(path) as image:
            record['width'],record['height']=image.size
            if image.width < 320 or image.height < 240: record['flags'].append('low_resolution')
            ratio=image.width/image.height
            if ratio < .45 or ratio > 2.3: record['flags'].append('extreme_aspect_ratio')
            image.verify()
    except ImportError:
        record['flags'].append('manual_visual_review_required')
    except Exception:
        record['flags'].append('unreadable_or_corrupt')
    record['status']='flagged' if record['flags'] else 'pass'
    return record

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument('--root',type=Path,default=Path(__file__).parents[2]/'Images')
    parser.add_argument('--output',type=Path,default=Path(__file__).parents[1]/'triage_manifest.json')
    args=parser.parse_args()
    records=[inspect(path,args.root) for path in sorted(args.root.rglob('*')) if path.suffix.lower() in IMAGE_EXTENSIONS]
    seen={};
    for record in records:
        if record['sha256'] in seen: record['flags'].append('duplicate'); record['status']='flagged'; record['duplicate_of']=seen[record['sha256']]
        else: seen[record['sha256']]=record['path']
    args.output.write_text(json.dumps({'root':str(args.root),'imageCount':len(records),'records':records},indent=2)+'\n',encoding='utf-8')
    print(f'Wrote {len(records)} records to {args.output}')
if __name__=='__main__': main()
