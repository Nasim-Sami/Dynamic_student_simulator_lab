# Dynamic Student Simulator Lab

A web interface for testing a dynamic English MCQ student simulator.

The app lets users choose a student ability from 10 to 30, select a question, and see how the simulated student behaves. Each run can produce different results because the simulator uses probability distributions for perceived difficulty, answer choice, acting ability, and time taken.

## Features

- View a list of English MCQ questions
- Select student ability from 10 to 30
- Run a simulation for one question
- See chosen option, correctness, time taken, perceived difficulty, acting ability, and effective ability
- Compare how different ability students behave on the same question
- Re-run the same question to observe different sampled behavior

## Run Locally

Install dependencies:

```bash
pip install -r requirements.txt
