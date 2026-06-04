from __future__ import annotations

import importlib.util
import os
from pathlib import Path
from typing import Any

import numpy as np
from flask import Flask, jsonify, render_template, request


DEFAULT_SIMULATOR_PATH = (
    "/Users/sami/Documents/4-2/Thesis/Latest working/Adaptive_RL_English/"
    "may_31_building_own_env/dynamic_student_simulator.py"
)
BUNDLED_SIMULATOR_PATH = Path(__file__).with_name("dynamic_student_simulator.py")


def load_simulator() -> Any:
    simulator_path = Path(
        os.environ.get(
            "SIMULATOR_PATH",
            str(BUNDLED_SIMULATOR_PATH if BUNDLED_SIMULATOR_PATH.exists() else DEFAULT_SIMULATOR_PATH),
        )
    ).expanduser()
    if not simulator_path.exists():
        raise FileNotFoundError(
            f"Simulator file not found at {simulator_path}. Set SIMULATOR_PATH to override it."
        )

    spec = importlib.util.spec_from_file_location("dynamic_student_simulator", simulator_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load simulator module from {simulator_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.__loaded_from__ = str(simulator_path)
    return module


simulator = load_simulator()
app = Flask(__name__)


def as_json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): as_json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [as_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [as_json_safe(item) for item in value]
    if isinstance(value, np.generic):
        return value.item()
    return value


def get_question(question_id: str) -> dict[str, Any]:
    for question in simulator.QUESTIONS_WITH_METADATA:
        if question["question_id"] == question_id:
            return question
    raise KeyError(f"Unknown question_id: {question_id}")


def option_payload(question: dict[str, Any]) -> list[dict[str, str]]:
    return [
        {"key": option, "text": question[f"option_{option}"]}
        for option in simulator.OPTIONS
    ]


def question_payload(question: dict[str, Any]) -> dict[str, Any]:
    return {
        "question_id": question["question_id"],
        "question": question["question"],
        "topic": question["topic"],
        "subtopic": question["subtopic"],
        "answer": question["answer"],
        "options": option_payload(question),
        "inherent_difficulty": question["inherent_difficulty"],
        "base_time": question["base_time"],
    }


def fresh_student(ability: int) -> dict[str, Any]:
    ability = int(round(simulator.clip(float(ability), simulator.MIN_ABILITY, simulator.MAX_ABILITY)))
    return simulator.create_student(student_id=f"web_A{ability}", ability=ability)


def restore_or_create_student(payload: dict[str, Any], ability: int) -> dict[str, Any]:
    raw_student = payload.get("student")
    if isinstance(raw_student, dict) and int(raw_student.get("ability", ability)) == int(ability):
        return simulator.ensure_dynamic_student(raw_student)
    return fresh_student(ability)


def effective_scales(student: dict[str, Any], acting_ability: int, question: dict[str, Any]) -> dict[str, Any]:
    acting_student = simulator.with_updated_ability(student, acting_ability)
    ability_scale = simulator.ability_to_difficulty_scale(acting_student["ability"])
    topic = str(question["topic"])
    topic_bias = float(acting_student.get("topic_mastery_bias", {}).get(topic, 0.0))
    confidence = float(acting_student.get("confidence", 0.50))
    fatigue = float(acting_student.get("fatigue", 0.0))
    guessing = float(acting_student.get("guessing_tendency", 0.10))

    # Mirrors the current dynamic simulator formulas so the UI can explain the run.
    answer_scale = ability_scale + topic_bias + 0.75 * (confidence - 0.50) - 1.05 * fatigue - 0.45 * guessing
    time_scale = ability_scale + topic_bias + 0.50 * (confidence - 0.50) - 0.85 * fatigue

    return {
        "topic_mastery_bias": round(topic_bias, 3),
        "effective_answer_scale": round(float(answer_scale), 3),
        "effective_time_scale": round(float(time_scale), 3),
    }


def simulate_one(
    ability: int,
    question_id: str,
    student: dict[str, Any] | None = None,
    update_state: bool = False,
) -> dict[str, Any]:
    question = get_question(question_id)
    active_student = simulator.ensure_dynamic_student(student) if student else fresh_student(ability)
    active_student = simulator.with_updated_ability(active_student, ability)
    rng = np.random.default_rng()

    result = simulator.simulate_answer(active_student, question, rng)
    result.update(effective_scales(active_student, int(result["acting_ability"]), question))
    result["option_text"] = {
        option["key"]: option["text"]
        for option in option_payload(question)
    }

    student_after = active_student
    if update_state:
        time_ratio = float(result["time_taken"]) / max(float(question["base_time"]), 1.0)
        student_after = simulator.update_dynamic_student_state(
            active_student,
            question,
            bool(result["is_correct"]),
            time_ratio,
        )

    return {
        "result": as_json_safe(result),
        "student_before": as_json_safe(active_student),
        "student_after": as_json_safe(student_after),
        "question": question_payload(question),
    }


@app.get("/")
def index() -> str:
    return render_template("index.html")


@app.get("/api/questions")
def questions() -> Any:
    all_questions = [question_payload(question) for question in simulator.QUESTIONS_WITH_METADATA]
    topics = sorted({question["topic"] for question in simulator.QUESTIONS_WITH_METADATA})
    return jsonify(
        {
            "questions": all_questions,
            "topics": topics,
            "ability_min": simulator.MIN_ABILITY,
            "ability_max": simulator.MAX_ABILITY,
            "difficulty_low": simulator.DIFFICULTY_LOW,
            "difficulty_high": simulator.DIFFICULTY_HIGH,
            "source_path": getattr(simulator, "__loaded_from__", DEFAULT_SIMULATOR_PATH),
        }
    )


@app.post("/api/simulate")
def simulate() -> Any:
    payload = request.get_json(force=True) or {}
    try:
        ability = int(payload.get("ability", 20))
        question_id = str(payload.get("question_id", "Q1"))
        update_state = bool(payload.get("update_state", False))
        student = restore_or_create_student(payload, ability) if update_state else fresh_student(ability)
        return jsonify(simulate_one(ability, question_id, student, update_state))
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@app.post("/api/compare")
def compare() -> Any:
    payload = request.get_json(force=True) or {}
    try:
        question_id = str(payload.get("question_id", "Q1"))
        abilities = payload.get("abilities") or list(range(simulator.MIN_ABILITY, simulator.MAX_ABILITY + 1))
        rows = []
        for ability in abilities:
            row = simulate_one(int(ability), question_id, fresh_student(int(ability)), False)["result"]
            rows.append(row)
        return jsonify(
            {
                "question": question_payload(get_question(question_id)),
                "rows": as_json_safe(rows),
            }
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
