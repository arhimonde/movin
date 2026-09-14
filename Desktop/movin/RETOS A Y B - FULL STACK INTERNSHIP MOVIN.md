# Movin Challenges

You have to choose **two challenges**: one from Part A (computer vision) and one from Part B (application stack).

If you're running over, stop and write about what you'd have done instead. We'd rather read a clear account of an unfinished thing than receive a rushed complete one.

---

## Shared context

We're a moving company. Customers photograph the rooms of their home with a phone, and we need to estimate what's in the house so we can quote the job: how many people, how big a truck, how many hours.

What matters to us is **large objects**. A sofa changes the quote. A pencil does not. Our target output for a property is an itemised inventory with an estimated **total volume in m³**.

We use:

- TypeScript + React,
- Vercel 
- AWS, (storage of images)
- MongoDB, (storage of data about quotes/clients/companies...)
- Roboflow, (for CV models)

---



## Rules for both parts

**Allowed and encouraged:** AI coding assistants, any library, any tutorial, pre-trained models, Roboflow Universe models. We will ask you to explain and extend your own work, so ship only what you understand.

**Not allowed:** submitting anything you can't walk through line by line.

**Dataset (Part A only):** you'll receive a sample of room photos under separate cover. The set is not clean — that's deliberate.

**If something is ambiguous, email us.** Asking a good question is a positive signal, not a negative one.

---

---



# PART A — Computer Vision

**We are not asking you to build a production model.** Three days is not enough, and we know it. We're asking how you'd approach the problem: what you'd measure, what you'd fix first, and how the system grows.

### Deliverable for any Part A challenge

A written report (Markdown or PDF, aim for 1,500–2,500 words) plus whatever code, notebook, or Roboflow workspace you used to support it. **The report is the deliverable; the code is evidence.**

---



## A1 — Dataset Triage

*Emphasis: data quality and what makes a training set trustworthy.*

The dataset contains images that shouldn't be in it. Some are obvious, some aren't.

### Do this

1. **Define what "unsuitable" means** for our use case, as a written policy with categories. Don't just list files you didn't like — write the rule you applied, so someone else could apply it identically.
2. **Build a repeatable process** that flags them. Automated, semi-automated, or a hybrid with human confirmation — your call, but justify it.
3. **Report your results:** how many images you flagged, in what categories, and your estimate of how many bad images you *missed*. Include examples of borderline cases and explain how you decided.
4. **Define the object taxonomy** — the list of classes worth detecting for a moving quote. Justify inclusions and exclusions.
5. **Train a baseline** on the cleaned set (Roboflow makes this quick) and report per-class metrics. This is supporting evidence, not the main event.
6. **Quantify the cleaning.** Did removing bad images actually help? How would you prove that rather than assume it?



### Also answer

- How would this run continuously as customers upload new photos, rather than as a one-off cleanup?
- What's the cost of wrongly deleting a good image versus keeping a bad one?



### Hard parts you'll run into

Some images are near-duplicates of each other — the same room from a slightly different angle. Think carefully about what that does to a train/test split. "Empty room with no furniture" might be unsuitable for training, or might be a valuable negative example; argue your position. Some photos will contain people or identifiable personal items, which is a category of problem beyond model quality.

---



## A2 — Defining and Measuring Accuracy

*Emphasis: evaluation methodology and error analysis.*

Someone tells you the model is "85% accurate". That number is close to meaningless for our business. Your job is to replace it with something we can actually make decisions from.

### Do this

1. **Define the metric that matters** for quoting a move, and argue for it. mAP@50 is the standard object-detection number — explain what it does and doesn't tell us here.
2. **Build an evaluation harness** on a held-out set you construct yourself. Explain how you split the data and why.
3. **Establish a baseline** using an off-the-shelf model (Roboflow Universe, or a COCO-pretrained model whose classes partly overlap ours). Measure it with your metric.
4. **Do error analysis.** Categorise the failures. Which classes are worst? Which confusions are most expensive? Show examples.
5. **Recommend what to fix first,** ranked, with your reasoning about effort versus impact.



### Also answer

- Missing a wardrobe means we under-quote and lose money. Inventing a wardrobe that isn't there means we over-quote and lose the customer. How does that asymmetry set your confidence threshold, and does it differ per class?
- We have five photos of the same living room. The sofa appears in three of them. How does your evaluation handle that, and how does the production system avoid counting it three times?



### Hard parts

The set is class-imbalanced — far more chairs than pianos — so a single averaged number will hide the failures that cost most. Detections give you a box, not a volume, and the business needs m³. Chairs tucked under tables are barely visible but still need moving.

---



## A3 — Growing the Taxonomy

*Emphasis: how the system extends without collapsing.*

The model detects a "sofa". Sales now wants to distinguish a vintage sofa from a modern one, because vintage means fragile and fragile means specialist packing. They also want a 4-seat round table distinguished from a 6-seat rectangular one, because that changes truck loading.

### Do this

1. **Design a label schema** that supports this. Flat classes (`sofa_vintage`, `sofa_modern`, `sofa_sectional`) are one option. Coarse detection plus a separate attribute stage is another. There are others. Pick one and defend it against the alternatives.
2. **Write the process for adding a new object class** end to end — from "sales asks for it" to "it's live" — including how you'd know it was safe to ship.
3. **Demonstrate it on one variant split.** Take a single class from the dataset, split it into two variants, label a small sample, and produce *some* evidence about whether the distinction is learnable. A small experiment with honest numbers beats a large claim.
4. **Cost it.** How many labelled examples does a new class need? How long? What does that mean in money and calendar time?



### Also answer

- You add "piano" as a class. Your existing 5,000 annotated images contain pianos that were never labelled, because the class didn't exist. What happens when you train on that, and what do you do about it?
- Which variant distinctions are genuinely visual, and which would be cheaper to get by simply asking the customer? Not every problem should be solved with a model.
- How do you use production traffic to improve the model over time?



### Hard parts

Variants multiply combinatorially, and every combination needs enough examples to learn from. Some distinctions humans disagree on — two annotators will not reliably agree on "vintage", and a label your own team can't apply consistently cannot be learned consistently.

---

---



# PART B — Application Stack

**Scope note:** these are deliberately small. We are not asking you to build a product. Do not gold-plate, and do not add features we didn't ask for. Doing one thing carefully scores better than doing three things roughly.

Everything you need is in this document. Free tiers are sufficient throughout.

### Deliverables for any Part B challenge

- A git repository with readable commit history
- Whatever the challenge asks for specifically
- A short `NOTES.md` — half a page to a page, not an essay:
  1. What you did, and any decision you hesitated over
  2. What you deliberately left out
  3. Anything broken or half-finished, stated plainly. We check. A disclosed gap costs you far less than one we discover.
  4. The answers to the challenge's own questions

---



## B1 — One Endpoint, Done Properly

*Emphasis: backend fundamentals and deployment.* 

Build the smallest possible upload slice, from nothing, and deploy it.

### Must have

Two endpoints and one plain page.

1. `POST /api/photos` — the browser asks permission to upload a room photo.
  - Accepts `filename`, `contentType`, `sizeBytes`, `roomType`
  - Validates all four; rejects bad input with appropriate status codes
  - Creates a record in MongoDB with status `awaiting_upload`
  - Returns a **presigned upload URL** the browser can PUT the file to directly
2. `POST /api/photos/:id/confirm` — the browser reports the upload finished; the record moves to `uploaded`.
3. A plain page that exercises both and lists what's been uploaded. The page should tell the user when something is uploading and when something failed. Silence during a slow operation is a bug, not a styling preference.
4. **Visual design is not graded here** but it will be well considered if worked out.

Deploy it to Vercel and send us the URL.

### On the storage

S3 is what we use, but **any S3-compatible storage is fully acceptable** — Cloudflare R2, Supabase Storage, MinIO. Say which you chose in `NOTES.md`.

### Answer in [NOTES.md](http://NOTES.md)

- Why does the browser upload straight to storage rather than sending the file through your endpoint? What specifically would break if it didn't?
- A user requests an upload URL and then closes the tab. What's in your database now, and what would you do about it?
- The confirm endpoint takes the client's word that the upload succeeded. Is that a problem? What would you do instead, and is the added complexity worth it?

---



## B2 — From Detections to a Quote

*Emphasis: domain logic and data modelling.* 

You'll build your own input data, then write the logic that turns it into a quote.

### Step 1 — Make your own fixture (about 45 minutes)

- Pick any public model from **Roboflow Universe** (or any open source CV modelthat detects furniture or indoor objects. It doesn't need to be good.
- Gather **6–8 room photos covering 3 rooms**, with at least one room photographed from two or three angles. Use your own home, or public real-estate listing photos. Don't overthink this.
- Run them through the model's hosted inference API and **save the raw JSON output** to your repo as a fixture.
- Build a small **volume lookup table** (m³ per object class) by researching typical furniture dimensions. Rough numbers are fine — cite roughly where you got them.

Commit the fixture and the table. They're part of the submission.

### Step 2 — Build the logic (the actual task)

A typed TypeScript module that turns the fixture into a quotable inventory. **No database, no deployment, no UI required.** A CLI that prints the result is plenty.

- Output: itemised inventory with quantities and a **total volume in m³**
- **Filter by confidence.** You pick the threshold. Justify it.
- **Map model classes to our inventory.** The model emits classes we don't care about. Decide what happens to each.
- **Handle objects that aren't moving.** Some detected things stay with the house.
- **Deduplicate across photos.** The same physical object appears in more than one photo of a room. It must count once.
- **Unit tests** covering your logic — including cases your fixture doesn't happen to contain. Construct those cases yourself.



### Answer in [NOTES.md](http://NOTES.md)

- What rule did you use for deduplication, and where does it fail? Give a concrete input that would break it.
- You set the confidence threshold at X. What happens to the quote at 0.9? At 0.3?
- Which of your decisions would you want a human to review before the quote reaches a customer?
- What's the most awkward case in your own fixture, and how did you handle it?



### Hard parts

Real detection output is messy: duplicate detections of one object, low-confidence noise, classes that make no sense for a move, and objects a moving company would never load into a truck. Deduplication has **no clean automatic answer** — make a decision and be honest about where it breaks. A missing entry in your volume table shouldn't crash anything or silently become zero.

---



## B3 — The Inventory Confirmation Screen

*Emphasis: frontend craft and UI quality. No accounts or backend needed. For this exercise use the Branding Guide to follow the brand guidelines of Movin.*

We've analysed a customer's room photos. Before we send them a price, they need to confirm the inventory is right.

Build that screen. Most customers open it **on a phone**, often while standing in the house they're moving out of.

### Must have

- Render the inventory from the fixture below, **grouped by room**
- A **running total volume in m³**, always visible, always correct as the customer edits
- The customer can **change a quantity**, **remove an item**, and **add an item we missed**
- **Items we're unsure about are visibly flagged** so the customer knows where to look first
- A **confirm action** that shows what would be submitted (a `console.log` or an on-screen summary is fine — there's no backend)
- Deploy it. Vercel's free tier handles this in a few minutes. Send us the URL.



### UI practices we do grade

We are **not** grading visual taste, brand, or how pretty it is. There is no design to match, and a plain interface done well beats a decorated one done badly. What we grade is craft:

**States.** Every screen has more than one. Handle loading (simulate a delay of a second or two), the empty case, and an error. A room with no detected items is one of these cases — the fixture contains one.

**Accessibility.** This is not optional polish.

- Everything reachable and operable by keyboard alone, in a sensible order
- Visible focus indicators — don't remove outlines without replacing them
- Text contrast that holds up
- Anything conveyed by colour alone must also be conveyed some other way

**Mobile.** Test it at 375px wide. Tap targets big enough for a thumb. Nothing overflowing or requiring horizontal scroll. Long text must not break the layout — the fixture includes an awkwardly long label on purpose.

**Feedback and safety.** Deleting an item is destructive. Decide how you handle that — confirmation, undo, or something else — and defend the choice in `NOTES.md`. Any action should visibly do something.

**Numbers.** Volumes are a customer-facing figure on which a price depends. Format them sensibly. `12.300000000000001 m³` on a quote is not acceptable.

A component library (Tailwind, shadcn, MUI, whatever) is fine. Note that a component library does not write your empty states or fix your keyboard order for you.

### Answer in [NOTES.md](http://NOTES.md)

- One item has no volume. How did you show the total, and why that way over the alternatives?
- How did you handle deleting an item, and what did you reject?
- What would you check before shipping this to real customers that you didn't have time to check here?
- Which part of this screen do you think is weakest?



### The fixture

```json
{
  "propertyId": "prop_8412",
  "generatedAt": "2026-09-02T09:14:00Z",
  "rooms": [
    {
      "roomId": "r1",
      "name": "Living room",
      "photoCount": 3,
      "items": [
        { "id": "i1", "label": "Sofa", "quantity": 1, "volumeM3": 1.8, "confidence": 0.94, "movable": true },
        { "id": "i2", "label": "Armchair", "quantity": 2, "volumeM3": 0.7, "confidence": 0.88, "movable": true },
        { "id": "i3", "label": "Coffee table", "quantity": 1, "volumeM3": 0.35, "confidence": 0.51, "movable": true },
        { "id": "i4", "label": "Television", "quantity": 1, "volumeM3": 0.15, "confidence": 0.97, "movable": true },
        { "id": "i5", "label": "Bookshelf", "quantity": 1, "volumeM3": null, "confidence": 0.79, "movable": true }
      ]
    },
    {
      "roomId": "r2",
      "name": "Kitchen",
      "photoCount": 2,
      "items": [
        { "id": "i6", "label": "Refrigerator", "quantity": 1, "volumeM3": 1.1, "confidence": 0.93, "movable": true },
        { "id": "i7", "label": "Built-in oven with integrated extractor hood unit", "quantity": 1, "volumeM3": 0.4, "confidence": 0.85, "movable": false },
        { "id": "i8", "label": "Dining chair", "quantity": 6, "volumeM3": 0.3, "confidence": 0.72, "movable": true },
        { "id": "i9", "label": "Dining table", "quantity": 1, "volumeM3": 0.9, "confidence": 0.31, "movable": true }
      ]
    },
    {
      "roomId": "r3",
      "name": "Bathroom",
      "photoCount": 1,
      "items": []
    },
    {
      "roomId": "r4",
      "name": "Bedroom",
      "photoCount": 2,
      "items": [
        { "id": "i10", "label": "Double bed", "quantity": 1, "volumeM3": 2.2, "confidence": 0.96, "movable": true },
        { "id": "i11", "label": "Wardrobe", "quantity": 2, "volumeM3": 1.5, "confidence": 0.9, "movable": true },
        { "id": "i12", "label": "Nightstand", "quantity": 2, "volumeM3": 0.2, "confidence": 0.44, "movable": true },
        { "id": "i13", "label": "Mirror", "quantity": 1, "volumeM3": 0.1, "confidence": 0.28, "movable": true }
      ]
    }
  ]
}
```



### Notes on the data

`movable: false` means the object stays with the house — it was detected, but it isn't moving. `volumeM3: null` means we have no volume estimate for that object. `confidence` is the model's certainty, from 0 to 1. What you do with each of these is part of the challenge, and we've deliberately not told you.

### Hard parts

Deciding what to show the customer versus what to hide is the real work here. Confidence scores are meaningful to us and mostly meaningless to a customer, so exposing raw numbers is probably wrong, but ignoring them entirely wastes the information. A total that quietly omits an unknown volume is misleading; one that refuses to show a total at all is unhelpful. There's no single right answer to either. Pick one and defend it.

---

---



## What we're actually grading in Part B

Not volume of code. We're looking at whether you handle failure cases, whether your types mean something, whether you can explain a decision you were unsure about, and whether your `NOTES.md` is honest.

A 200-line submission with clear reasoning beats a 2,000-line one without it.