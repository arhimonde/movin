# A3 — Growing the MOVIN taxonomy

## Recommended schema

Keep the detector classes coarse (`sofa`, `bed`, `wardrobe`) and store optional attributes separately: `style`, `material`, `is_builtin`, `dimensions`, and `variant_confidence`. This avoids turning every style into a new detector class and keeps the quote stable when sales asks for a new variant. An example object is:

```json
{"class":"piano","attributes":{"type":"upright|grand|unknown"},"confidence":0.82,"needsReview":false}
```

## Adding a new class: piano

1. Product and operations define what counts as a piano and whether upright/grand changes volume.
2. Write positive/negative annotation guidance, including partial occlusion and keyboard-only views.
3. Sample diverse rooms and relabel historical images that may contain pianos; do not treat unlabeled positives as clean negatives.
4. Have two annotators label a pilot and review disagreements. Record agreement before scaling.
5. Split by property/room, not by individual photo, to prevent near-duplicate leakage.
6. Train the candidate and compare per-class precision/recall, VWAE, unknown-volume rate, and regression on existing classes.
7. Release in shadow mode, require human review for low-confidence pianos, and define rollback if false positives inflate quotes or existing-class metrics regress.

## Cost and rollout

A first pilot of 100 images at 2–3 minutes per image is roughly 3–5 annotation hours, plus review and engineering time. The dominant cost is not just drawing boxes: it is finding representative positives and correcting historical negatives. A practical rollout is a one-week annotation pilot, one training/evaluation cycle, then a guarded shadow release. Exact cost depends on the annotation vendor and hourly rate.

## Visual detection versus customer questions

Detect the existence and rough geometry of a piano visually; ask the customer for upright versus grand, stairs/access constraints, and exact dimensions when those facts affect crew or price. Attributes with weak visual learnability should be questions rather than forced model labels.

## Feedback loop

Store corrections from the confirmation screen, sample low-confidence and high-cost disagreements for annotation, monitor class frequency and VWAE drift by room type, and periodically retrain only after a held-out regression check. Keep a versioned taxonomy and model metadata so a quote can be traced to the model that produced it.
