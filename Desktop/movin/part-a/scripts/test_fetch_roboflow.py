import unittest

from fetch_roboflow import build_fixture, normalize_response, roboflow_bbox_to_xywh


class RoboflowAdapterTests(unittest.TestCase):
    def test_center_bbox_is_converted_to_top_left_xywh(self):
        self.assertEqual(
            roboflow_bbox_to_xywh({"x": 100, "y": 80, "width": 40, "height": 20}),
            [80, 70, 40, 20],
        )

    def test_normalize_maps_classes_and_marks_immovable(self):
        detections = normalize_response({"predictions": [
            {"class": "couch", "confidence": 0.91, "x": 100, "y": 80, "width": 40, "height": 20},
            {"class": "door", "confidence": 0.88, "x": 20, "y": 20, "width": 10, "height": 30},
        ]})
        self.assertEqual(detections[0]["class"], "sofa")
        self.assertTrue(detections[0]["movable"])
        self.assertEqual(detections[1]["class"], "door")
        self.assertFalse(detections[1]["movable"])

    def test_empty_predictions_are_valid(self):
        self.assertEqual(normalize_response({"predictions": []}), [])
        self.assertEqual(normalize_response({}), [])

    def test_malformed_prediction_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "confidence"):
            normalize_response({"predictions": [{
                "class": "chair", "confidence": "bad", "x": 1, "y": 1, "width": 2, "height": 2,
            }]})

    def test_fixture_preserves_room_and_photo_identity(self):
        manifest = [
            {"roomId": "r1", "roomName": "Living room", "photoId": "p1", "image": "one.jpg"},
            {"roomId": "r1", "roomName": "Living room", "photoId": "p2", "image": "two.jpg"},
        ]
        fixture = build_fixture("prop_1", manifest, {
            "p1": {"predictions": []},
            "p2": {"predictions": []},
        })
        self.assertEqual(fixture["propertyId"], "prop_1")
        self.assertEqual(fixture["rooms"][0]["roomId"], "r1")
        self.assertEqual(
            [photo["photoId"] for photo in fixture["rooms"][0]["photos"]],
            ["p1", "p2"],
        )


if __name__ == "__main__":
    unittest.main()
