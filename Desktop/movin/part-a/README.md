# Part A — computer vision work

- `REPORT_A1.md`: dataset triage policy and review process.
- `REPORT_A2.md`: baseline YOLOv8n evaluation and VWAE discussion.
- `REPORT_A3.md`: taxonomy growth and production feedback plan.
- `scripts/triage_images.py`: reproducible corpus triage.
- `scripts/fetch_roboflow.py`: Roboflow Hosted/Serverless inference adapter.

Run the triage:

```bash
python3 part-a/scripts/triage_images.py
```

Run Python unit tests:

```bash
cd part-a/scripts
python3 -m unittest -q
```

The Roboflow script asks for the API key interactively and never writes it to disk.
