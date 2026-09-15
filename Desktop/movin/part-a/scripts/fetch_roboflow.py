#!/usr/bin/env python3
"""Fetch Roboflow hosted detections and normalize them for Part B.

The script intentionally keeps each raw Roboflow response next to the
normalized fixture so a quote can be traced back to model output.
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import re
import time
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, Mapping, Optional

import requests


DEFAULT_ENDPOINT = "https://serverless.roboflow.com"
# Public Roboflow Universe model selected for this project.
DEFAULT_MODEL = "furniture-o6003/2"
DEFAULT_VERSION = ""
DEFAULT_CONFIDENCE = 0.5
CLASS_MAP_VERSION = "2026-09-15-1"

# Adjust this map when the selected Universe model uses different labels.
CLASS_MAP = {
    "couch": "sofa",
    "sofa": "sofa",
    "chair": "dining_chair",
    "dining chair": "dining_chair",
    "dining_chair": "dining_chair",
    "dining table": "dining_table",
    "dining_table": "dining_table",
    "table": "dining_table",
    "bed": "double_bed",
    "double bed": "double_bed",
    "double_bed": "double_bed",
    "wardrobe": "wardrobe",
    "closet": "wardrobe",
    "bookshelf": "bookshelf",
    "bookcase": "bookshelf",
    "coffee table": "coffee_table",
    "coffee_table": "coffee_table",
    "tv": "tv",
    "television": "tv",
    "refrigerator": "refrigerator",
    "fridge": "refrigerator",
    "armchair": "armchair",
    "nightstand": "nightstand",
    "mirror": "mirror",
    "person": "person",
    "door": "door",
    "window": "window",
}

IMMOVABLE_CLASSES = {"door", "window", "built_in_oven", "oven", "sink"}


def slug(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_.-]+", "_", value).strip("_") or "photo"


def map_class(label: str) -> str:
    normalized = " ".join(label.strip().lower().replace("-", " ").split())
    return CLASS_MAP.get(normalized, normalized.replace(" ", "_"))


def roboflow_bbox_to_xywh(prediction: Mapping[str, Any]) -> list[float]:
    """Convert Roboflow's center x/y + width/height to top-left xywh."""
    try:
        x = float(prediction["x"])
        y = float(prediction["y"])
        width = float(prediction["width"])
        height = float(prediction["height"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("prediction must contain numeric x, y, width and height") from exc
    if width <= 0 or height <= 0:
        raise ValueError("prediction width and height must be positive")
    return [x - width / 2, y - height / 2, width, height]


def normalize_prediction(prediction: Mapping[str, Any]) -> Dict[str, Any]:
    label = prediction.get("class") or prediction.get("label")
    if not isinstance(label, str) or not label.strip():
        raise ValueError("prediction is missing a class label")
    confidence = prediction.get("confidence", prediction.get("score"))
    try:
        confidence_value = float(confidence)
    except (TypeError, ValueError) as exc:
        raise ValueError("prediction confidence must be numeric") from exc
    if not 0 <= confidence_value <= 1:
        raise ValueError("prediction confidence must be between 0 and 1")

    mapped = map_class(label)
    return {
        "class": mapped,
        "originalClass": label,
        "mappingVersion": CLASS_MAP_VERSION,
        "confidence": confidence_value,
        "bbox": roboflow_bbox_to_xywh(prediction),
        "movable": mapped not in IMMOVABLE_CLASSES,
        "sourceDetectionId": prediction.get("detection_id"),
        "needsReview": confidence_value < 0.6 or mapped not in CLASS_MAP.values(),
        "reviewReason": "near_confidence_threshold" if confidence_value < 0.6 else ("unknown_class_mapping" if mapped not in CLASS_MAP.values() else None),
    }


def normalize_response(response: Mapping[str, Any]) -> list[Dict[str, Any]]:
    predictions = response.get("predictions", [])
    if predictions is None:
        return []
    if not isinstance(predictions, list):
        raise ValueError("Roboflow response predictions must be a list")
    detections = []
    for index, prediction in enumerate(predictions):
        if not isinstance(prediction, Mapping):
            raise ValueError(f"prediction at index {index} must be an object")
        try:
            detections.append(normalize_prediction(prediction))
        except ValueError as exc:
            raise ValueError(f"invalid prediction at index {index}: {exc}") from exc
    return detections


def load_manifest(path: Path) -> list[Dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list) or not data:
        raise ValueError("manifest must be a non-empty JSON array")
    required = {"roomId", "roomName", "photoId", "image"}
    for index, item in enumerate(data):
        if not isinstance(item, Mapping) or not required.issubset(item):
            raise ValueError(f"manifest item {index} must contain {sorted(required)}")
    return [dict(item) for item in data]


def build_fixture(property_id: str, manifest: Iterable[Mapping[str, Any]], responses: Mapping[str, Mapping[str, Any]]) -> Dict[str, Any]:
    rooms: Dict[str, Dict[str, Any]] = {}
    for item in manifest:
        room_id = str(item["roomId"])
        room = rooms.setdefault(room_id, {"roomId": room_id, "name": str(item["roomName"]), "photos": []})
        room["photos"].append({
            "photoId": str(item["photoId"]),
            "detections": normalize_response(responses[str(item["photoId"])]),
            "sourceImage": str(item["image"]),
        })
    return {"propertyId": property_id, "rooms": list(rooms.values())}


def infer_image(session: requests.Session, endpoint: str, model: str, version: str, api_key: str, image_path: Path, confidence: float, timeout: float, retries: int, sleep: Callable[[float], None] = time.sleep) -> Dict[str, Any]:
    if endpoint.rstrip('/').endswith('serverless.roboflow.com'):
        url = f"{endpoint.rstrip('/')}/{model}"
        params = {"confidence": str(int(confidence * 100))}
        headers = {"Authorization": f"Bearer {api_key}"}
    else:
        url = f"{endpoint.rstrip('/')}/{model}/{version}"
        params = {"api_key": api_key, "confidence": str(int(confidence * 100))}
        headers = {}
    last_error: Optional[Exception] = None
    for attempt in range(retries + 1):
        try:
            with image_path.open("rb") as image_file:
                result = session.post(url, params=params, headers=headers, files={"file": (image_path.name, image_file, "image/jpeg")}, timeout=timeout)
            result.raise_for_status()
            payload = result.json()
            if not isinstance(payload, dict):
                raise ValueError("Roboflow response must be a JSON object")
            return payload
        except (requests.RequestException, ValueError) as exc:
            last_error = exc
            if attempt == retries:
                break
            sleep(2 ** attempt)
    raise RuntimeError(f"inference failed for {image_path}: {last_error}") from last_error


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=Path(__file__).with_name("image_manifest.json"))
    parser.add_argument("--output", type=Path, default=Path(__file__).parents[2] / "part-b/fixtures/detections.json")
    parser.add_argument("--raw-dir", type=Path, default=Path(__file__).parents[2] / "part-b/fixtures/roboflow_raw")
    parser.add_argument("--property-id", default=os.getenv("MOVIN_PROPERTY_ID", "prop_roboflow_001"))
    parser.add_argument("--model", default=os.getenv("ROBOFLOW_MODEL", DEFAULT_MODEL), help="model slug, e.g. furniture-detection")
    parser.add_argument("--version", default=os.getenv("ROBOFLOW_VERSION", DEFAULT_VERSION), help="legacy detect.roboflow version; serverless uses model/version")
    parser.add_argument("--endpoint", default=os.getenv("ROBOFLOW_ENDPOINT", DEFAULT_ENDPOINT))
    parser.add_argument("--confidence", type=float, default=float(os.getenv("ROBOFLOW_CONFIDENCE", DEFAULT_CONFIDENCE)))
    parser.add_argument("--timeout", type=float, default=60)
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument("--api-key", help="Roboflow key; omitted to read ROBOFLOW_API_KEY or prompt securely")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    api_key = args.api_key or os.getenv("ROBOFLOW_API_KEY")
    if not api_key:
        api_key = getpass.getpass("Roboflow API key (input hidden): ").strip()
    if not api_key:
        raise SystemExit("No Roboflow API key was provided")
    if not args.model or (not args.version and not args.endpoint.rstrip('/').endswith('serverless.roboflow.com')):
        raise SystemExit("Modelul/versiunea Roboflow lipsesc. Folosește Deploy Model și copiază model ID-ul.")
    if not 0 <= args.confidence <= 1:
        raise SystemExit("--confidence must be between 0 and 1")

    manifest = load_manifest(args.manifest)
    session = requests.Session()
    raw_responses: Dict[str, Dict[str, Any]] = {}
    args.raw_dir.mkdir(parents=True, exist_ok=True)
    for item in manifest:
        image_path = Path(str(item["image"]))
        if not image_path.is_absolute():
            image_path = (args.manifest.parent / image_path).resolve()
        if not image_path.is_file():
            raise SystemExit(f"image does not exist: {image_path}")
        raw = infer_image(session, args.endpoint, args.model, args.version, api_key, image_path, args.confidence, args.timeout, args.retries)
        photo_id = str(item["photoId"])
        raw_responses[photo_id] = raw
        (args.raw_dir / f"{slug(photo_id)}.json").write_text(json.dumps(raw, indent=2) + "\n", encoding="utf-8")

    fixture = build_fixture(args.property_id, manifest, raw_responses)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(fixture, indent=2) + "\n", encoding="utf-8")
    metadata = {
        "source": "Roboflow hosted inference",
        "model": args.model,
        "version": args.version,
        "endpoint": args.endpoint,
        "confidence": args.confidence,
        "photos": len(manifest),
        "rawResponses": str(args.raw_dir),
        "classMapVersion": CLASS_MAP_VERSION,
        "generatedAt": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    }
    (args.raw_dir / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote normalized fixture: {args.output}")
    print(f"Wrote raw responses: {args.raw_dir}")


if __name__ == "__main__":
    main()
