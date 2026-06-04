# Dynamic Student Simulator Website

Flask website for testing `dynamic_student_simulator.py`.

The simulator is bundled in this project as `dynamic_student_simulator.py`, so the app can be deployed online and shared with a teacher.

## Run

```bash
python3 app.py
```

Then open:

```text
http://127.0.0.1:5000
```

The app loads the simulator from:

```text
./dynamic_student_simulator.py
```

To point at another simulator file:

```bash
SIMULATOR_PATH="/path/to/dynamic_student_simulator.py" python3 app.py
```

## Deploy

Use any Python web host that supports Flask.

Typical settings:

```text
Build command: pip install -r requirements.txt
Start command: gunicorn app:app
```

After deployment, the host will give you a public `https://...` URL that you can send to your teacher.
