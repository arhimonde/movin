# A1 — Dataset triage

## Scope and policy

The corpus is organised by room under `Images/`. For quoting, an image is useful when it is readable, shows an interior context, and contains enough furniture to support inventory. The triage process flags unreadable/corrupt files, low-resolution files, extreme aspect ratios, exact duplicates, and files needing visual review. Empty rooms are retained as valid negative examples; they must not be silently deleted. People and private information are privacy-review flags, not automatic deletion, because they may still be useful for detecting/removing non-movable objects.

## Reproducible process

Run:

```bash
python3 part-a/scripts/triage_images.py
```

This writes `part-a/triage_manifest.json` with a row for every image, SHA-256 hash, dimensions when Pillow is available, status, and reasons. Exact duplicates are detected by hash. A human reviewer should inspect all flagged records and a random sample of passed records (at least 10%) for blur, irrelevant framing, privacy, and room-label correctness.

## Taxonomy

The quote taxonomy separates movable inventory (`sofa`, `armchair`, `bed`, `wardrobe`, tables, chairs, refrigerator, television, bookshelf) from installed/irrelevant classes (`door`, `window`, built-in appliances, person). Unknown objects remain visible and require review rather than being assigned volume zero.

## Quality trade-off

Deleting a usable image creates a false negative and may remove the only view of a large item. Retaining a bad image can create false detections and inflate the quote. The policy therefore prefers flag-and-review over automatic deletion, except for files that cannot be decoded. A missed bad-image estimate is obtained by reviewing a 10% random sample of passed records and extrapolating the flagged rate with a confidence interval; this is deliberately an estimate, not a claim of perfect automated triage.

## Limitations

This lightweight script cannot reliably judge blur, privacy, or semantic relevance without a visual reviewer. It creates an auditable first pass and a manifest for later cleaned/raw split comparisons; it does not claim that the corpus is fully cleaned or that a model trained on it is unbiased.
