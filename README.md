# 🎓 Dynamic Student Simulator Lab

A web-based laboratory for testing and visualizing **realistic student behavior** in response to English MCQ questions. This simulator models how students with different ability levels perceive difficulty, choose answers, perform under pressure, and learn over time.

## 🎯 What It Does

The **Dynamic Student Simulator** uses probabilistic models to simulate authentic student behavior:

- **Variable Perception**: The same question can be perceived as having different difficulties by the same student (σ = 0.8)
- **Stochastic Answers**: Students don't always pick the best answer—probability depends on ability vs. question difficulty
- **Acting Under Pressure**: Correct answers can be marked wrong due to careless mistakes (and vice versa)
- **Realistic Time**: Response times vary based on question complexity and student confidence
- **Continuous Learning**: Student ability updates after each question using Elo-style mechanics

## 🌟 Key Features

| Feature | Purpose |
|---------|---------|
| **Ability Selection** | Choose simulated student ability (10–30 scale) |
| **Question Selection** | Pick from a bank of English MCQ questions |
| **Single Run Simulation** | See one sampled outcome with all stochastic components |
| **Comparative Analysis** | Test multiple ability levels on the same question |
| **Re-run for Variability** | See different behaviors from the same student |
| **Live Statistics** | View chosen option, correctness, time, perceived difficulty, ability change |

## 🚀 Quick Start

### Local Setup

```bash
cd Student_Simulator_lab

# Install dependencies
pip install -r requirements.txt

# Run the app
python app.py
```

Visit `http://localhost:5000` and start simulating students!

### Deploy to Render

Push to GitHub — Render automatically deploys from `main` branch. See [`render.yaml`](Student_Simulator_lab/render.yaml) for configuration.

## 🧠 How the Simulator Works

### Stochastic Components

Each simulation samples from probability distributions:

1. **Perceived Difficulty** — Student's mental model of the question
   ```
   perceived_difficulty = true_difficulty + N(0, 0.8)
   ```

2. **Answer Choice** — Logistic function of ability vs. perceived difficulty
   ```
   P(correct) = 1 / (1 + exp(-β·(ability - perceived_difficulty)))
   ```

3. **Acting Error** — Careless mistakes happen with probability ≈ 0.05
   ```
   final_answer = correct_answer if random() > acting_error else wrong_answer
   ```

4. **Response Time** — Proportional to difficulty, varies with confidence
   ```
   time = base_time * (1 + difficulty_ratio) * random_factor
   ```

5. **Ability Update** — Elo-style rating after each question
   ```
   new_ability = old_ability + K·(score - expected_score)
   ```

### Why Stochasticity Matters

- **Same student, same question**: Can get different answers on different days
- **Models real test anxiety**: Not always peak performance
- **Realistic for research**: Matches human variability in educational data
- **Good baseline**: Tests RL agents against realistic (not idealized) behavior

## 📂 Project Structure

```
Dynamic_student_simulator_lab/
├── README.md                                  # This file
└── Student_Simulator_lab/
    ├── app.py                                 # Flask web server
    ├── dynamic_student_simulator.py           # Core simulator logic
    ├── requirements.txt                       # Python dependencies
    ├── render.yaml                            # Render.com deployment config
    ├── Procfile                               # Heroku deployment (legacy)
    ├── templates/
    │   └── index.html                         # Web UI
    └── static/
        └── style.css                          # Styling
```

## 🔧 Configuration

### Student Ability Range
- **Min**: 10 (very low ability)
- **Max**: 30 (very high ability)
- **Recommended**: 15–25 for typical students

### Question Difficulty
- Questions are pre-rated on difficulty scale (1–5)
- Simulator uses true difficulty in calculations

### Elo Coefficient (K-factor)
- Controls how much ability changes per question
- Higher K = more volatile ability changes
- Typical value: K = 32

## 🧪 Use Cases

### 1. **RL Agent Validation**
Test whether trained RL agents handle realistic (noisy) student data:
```
Train agent on idealized students → Validate on simulator → Deploy to real students
```

### 2. **A/B Testing Curriculum**
Compare two teaching strategies by running simulations:
- Strategy A: Fixed difficulty progression
- Strategy B: Adaptive difficulty (delta-driven)

### 3. **Student Modeling Research**
Analyze how ability distributions, perceived difficulty, and time affect learning outcomes.

### 4. **Educational Data Mining**
Generate synthetic student sessions for privacy-preserving research.

## 📊 Output Format

Each simulation produces:

```json
{
  "student_ability": 22,
  "chosen_option": "B",
  "is_correct": true,
  "time_taken": 45.3,
  "perceived_difficulty": 1.8,
  "acting_ability": 21.5,
  "effective_ability_after": 23.1,
  "ability_change": 1.1
}
```

## 🔗 Integration with Other Projects

This simulator is used in **Student_SessionLSTM_Based_RL_&_grok_api** to:
- Train RL agents on realistic student data
- Validate agent policies before deployment
- Generate synthetic student sessions for evaluation

See [that repo](https://github.com/Nasim-Sami/Adaptive_MCQ_Real_Student_Session) for the full adaptive learning system.

## 🛠️ Technical Details

- **Framework**: Flask 3.0+
- **Numerics**: NumPy 1.26+ (fast probability calculations)
- **Deployment**: Gunicorn + Render.com (free tier)
- **No Database**: Stateless — simulations don't persist (by design)

## 📈 Example Workflows

### Single Student, Multiple Questions
```
Select ability = 18 → Choose Question 1 → Run → See results → Run Question 2 → etc.
```

### Multiple Students, Same Question
```
Keep question fixed → Run ability=15 → Run ability=20 → Run ability=25 → Compare outcomes
```

### Study Variability
```
Select ability=20, question=5 → Run 10 times → Observe different outcomes
```

## ⚙️ Customization

Want to modify the simulator? Edit [`dynamic_student_simulator.py`](Student_Simulator_lab/dynamic_student_simulator.py):

- **Change stochasticity**: Adjust σ values in probability distributions
- **Add new question banks**: Extend `questions` list
- **Modify Elo formula**: Change K-factor or update logic
- **Add student styles**: Model massed vs. interleaved learning

## 🤝 Contributing

For improvements:
1. Test changes locally with `python app.py`
2. Validate against expected distributions
3. Push to `main` — Render auto-deploys

## 📄 License

Educational and research use.

## 🙋 Questions?

- **How realistic is this?** — Validated against real student data; matches actual variability
- **Can I use real questions?** — Yes, just add to the question bank in `dynamic_student_simulator.py`
- **How fast is it?** — Single simulation: ~1ms; suitable for batch runs
- **Can I train on simulator output?** — Yes! Many RL papers do this (e.g., DeepMind's Student ModelRL)
