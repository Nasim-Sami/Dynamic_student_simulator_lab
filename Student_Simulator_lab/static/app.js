const state = {
  questions: [],
  topics: [],
  selectedId: null,
  ability: 20,
  latest: null,
  history: [],
  compareRows: [],
  sessionStudent: null,
  stateful: false,
};

const els = {
  sourcePath: document.querySelector("#sourcePath"),
  questionCount: document.querySelector("#questionCount"),
  searchBox: document.querySelector("#searchBox"),
  topicFilter: document.querySelector("#topicFilter"),
  questionList: document.querySelector("#questionList"),
  abilityRange: document.querySelector("#abilityRange"),
  abilityNumber: document.querySelector("#abilityNumber"),
  abilityLabel: document.querySelector("#abilityLabel"),
  statefulToggle: document.querySelector("#statefulToggle"),
  resetStateButton: document.querySelector("#resetStateButton"),
  miniState: document.querySelector("#miniState"),
  selectedMeta: document.querySelector("#selectedMeta"),
  selectedTitle: document.querySelector("#selectedTitle"),
  questionText: document.querySelector("#questionText"),
  optionGrid: document.querySelector("#optionGrid"),
  simulateButton: document.querySelector("#simulateButton"),
  compareButton: document.querySelector("#compareButton"),
  runChip: document.querySelector("#runChip"),
  emptyResult: document.querySelector("#emptyResult"),
  resultContent: document.querySelector("#resultContent"),
  metricStrip: document.querySelector("#metricStrip"),
  distribution: document.querySelector("#distribution"),
  compareBody: document.querySelector("#compareBody"),
  compareCount: document.querySelector("#compareCount"),
  historyList: document.querySelector("#historyList"),
};

function fmt(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toFixed(digits);
}

function pct(value) {
  return `${Math.round(Number(value) * 100)}%`;
}

function selectedQuestion() {
  return state.questions.find((question) => question.question_id === state.selectedId);
}

async function apiPost(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function setAbility(value) {
  const clamped = Math.max(10, Math.min(30, Number.parseInt(value, 10) || 20));
  state.ability = clamped;
  state.sessionStudent = null;
  els.abilityRange.value = clamped;
  els.abilityNumber.value = clamped;
  els.abilityLabel.textContent = clamped;
  renderMiniState();
}

function renderMiniState() {
  if (!state.stateful) {
    els.miniState.textContent = "Independent random trials";
    return;
  }
  if (!state.sessionStudent) {
    els.miniState.textContent = "Stateful profile ready";
    return;
  }
  els.miniState.textContent = `Confidence ${fmt(state.sessionStudent.confidence, 2)} | Fatigue ${fmt(state.sessionStudent.fatigue, 2)}`;
}

function renderQuestionList() {
  const query = els.searchBox.value.trim().toLowerCase();
  const topic = els.topicFilter.value;
  const filtered = state.questions.filter((question) => {
    const haystack = [
      question.question_id,
      question.question,
      question.topic,
      question.subtopic,
    ].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (!topic || question.topic === topic);
  });

  els.questionCount.textContent = String(filtered.length);
  els.questionList.innerHTML = "";

  filtered.forEach((question) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `question-row${question.question_id === state.selectedId ? " selected" : ""}`;
    button.innerHTML = `
      <span class="qid">${question.question_id}</span>
      <span>
        <strong>${escapeHtml(question.question)}</strong>
        <span>${escapeHtml(question.topic)} | difficulty ${fmt(question.inherent_difficulty, 1)}</span>
      </span>
    `;
    button.addEventListener("click", () => {
      state.selectedId = question.question_id;
      state.latest = null;
      renderAll();
    });
    els.questionList.appendChild(button);
  });
}

function renderQuestion() {
  const question = selectedQuestion();
  if (!question) return;

  els.selectedMeta.textContent = `${question.question_id} | ${question.topic} | base time ${fmt(question.base_time, 1)}s`;
  els.selectedTitle.textContent = question.subtopic;
  els.questionText.textContent = question.question;
  els.optionGrid.innerHTML = "";

  const result = state.latest?.result;
  question.options.forEach((option) => {
    const isChosen = result?.chosen_option === option.key;
    const isCorrect = question.answer === option.key;
    const div = document.createElement("div");
    div.className = [
      "option-card",
      isChosen ? "chosen" : "",
      isCorrect ? "correct" : "",
      isChosen && !isCorrect ? "wrong-choice" : "",
    ].filter(Boolean).join(" ");
    div.innerHTML = `
      <span class="option-key">${option.key}</span>
      <span>${escapeHtml(option.text)}</span>
      ${isCorrect ? '<span class="answer-tag">Correct answer</span>' : ""}
    `;
    els.optionGrid.appendChild(div);
  });
}

function metric(label, value, detail = "") {
  return `
    <div class="metric">
      <span>${label}</span>
      <strong>${value}</strong>
      ${detail ? `<small>${detail}</small>` : ""}
    </div>
  `;
}

function renderResult() {
  if (!state.latest) {
    els.emptyResult.classList.remove("hidden");
    els.resultContent.classList.add("hidden");
    els.runChip.textContent = "No run yet";
    return;
  }

  const result = state.latest.result;
  els.emptyResult.classList.add("hidden");
  els.resultContent.classList.remove("hidden");
  els.runChip.textContent = result.is_correct ? "Correct sample" : "Wrong sample";

  els.metricStrip.innerHTML = [
    metric("Chosen option", result.chosen_option, result.is_correct ? "Matched answer" : `Correct was ${result.correct_answer}`),
    metric("Time taken", `${fmt(result.time_taken, 2)}s`, `Base ${fmt(result.base_time, 2)}s`),
    metric("Perceived difficulty", fmt(result.sampled_perceived_difficulty, 2), `Inherent ${fmt(result.inherent_difficulty, 1)}`),
    metric("Effective ability", fmt(result.effective_answer_scale, 2), `Acting ${result.acting_ability} (${result.acting_mode})`),
    metric("Real ability scale", fmt(result.student_ability_difficulty_scale, 2), `Real ability ${result.student_ability}`),
    metric("Acting ability scale", fmt(result.acting_ability_difficulty_scale, 2), `Mode ${result.acting_mode}`),
    metric("Confidence", fmt(result.student_confidence, 2), `Guessing ${fmt(result.student_guessing_tendency, 2)}`),
    metric("Fatigue", fmt(result.student_fatigue, 2), `Speed ${fmt(result.student_speed_tendency, 2)}`),
  ].join("");

  els.distribution.innerHTML = Object.entries(result.option_distribution)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, probability]) => `
      <div class="dist-row">
        <strong>${key}</strong>
        <div class="dist-bar"><div class="dist-fill" style="width: ${Math.max(2, probability * 100)}%"></div></div>
        <span>${pct(probability)}</span>
      </div>
    `).join("");
}

function renderCompare() {
  els.compareCount.textContent = String(state.compareRows.length);
  if (!state.compareRows.length) {
    els.compareBody.innerHTML = '<tr><td colspan="7" class="empty-cell">Press compare to sample abilities 10-30.</td></tr>';
    return;
  }

  els.compareBody.innerHTML = state.compareRows.map((row) => `
    <tr>
      <td><strong>${row.student_ability}</strong></td>
      <td><span class="mode ${row.acting_mode}">${row.acting_mode}</span></td>
      <td>${row.chosen_option}</td>
      <td><span class="status ${row.is_correct ? "ok" : "bad"}">${row.is_correct ? "Y" : "N"}</span></td>
      <td>${fmt(row.time_taken, 2)}s</td>
      <td>${fmt(row.sampled_perceived_difficulty, 2)}</td>
      <td>${fmt(row.effective_answer_scale, 2)}</td>
    </tr>
  `).join("");
}

function renderHistory() {
  if (!state.history.length) {
    els.historyList.innerHTML = '<div class="empty-state compact">No simulations yet.</div>';
    return;
  }

  els.historyList.innerHTML = state.history.slice(0, 10).map((item) => {
    const row = item.result;
    return `
      <div class="history-item">
        <span class="qid">${row.question_id}</span>
        <span>
          <strong>Ability ${row.student_ability} chose ${row.chosen_option}</strong>
          <span>${row.acting_mode}, perceived ${fmt(row.sampled_perceived_difficulty, 2)}, time ${fmt(row.time_taken, 2)}s</span>
        </span>
        <span class="status ${row.is_correct ? "ok" : "bad"}">${row.is_correct ? "Y" : "N"}</span>
      </div>
    `;
  }).join("");
}

function renderAll() {
  renderQuestionList();
  renderQuestion();
  renderResult();
  renderCompare();
  renderHistory();
  renderMiniState();
}

async function runSimulation() {
  const question = selectedQuestion();
  if (!question) return;

  els.simulateButton.disabled = true;
  els.simulateButton.textContent = "Running...";
  try {
    const data = await apiPost("/api/simulate", {
      ability: state.ability,
      question_id: question.question_id,
      update_state: state.stateful,
      student: state.stateful ? state.sessionStudent : null,
    });
    state.latest = data;
    state.history.unshift(data);
    if (state.history.length > 40) state.history.pop();
    if (state.stateful) state.sessionStudent = data.student_after;
    renderAll();
  } catch (error) {
    alert(error.message);
  } finally {
    els.simulateButton.disabled = false;
    els.simulateButton.textContent = "Run simulation";
  }
}

async function runCompare() {
  const question = selectedQuestion();
  if (!question) return;

  els.compareButton.disabled = true;
  els.compareButton.textContent = "Comparing...";
  try {
    const data = await apiPost("/api/compare", {
      question_id: question.question_id,
      abilities: Array.from({ length: 21 }, (_, index) => index + 10),
    });
    state.compareRows = data.rows;
    renderCompare();
  } catch (error) {
    alert(error.message);
  } finally {
    els.compareButton.disabled = false;
    els.compareButton.textContent = "Compare abilities";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function boot() {
  const response = await fetch("/api/questions");
  const data = await response.json();
  state.questions = data.questions;
  state.topics = data.topics;
  state.selectedId = state.questions[0]?.question_id || null;

  els.sourcePath.textContent = `Connected: ${data.source_path}`;
  els.abilityRange.min = data.ability_min;
  els.abilityRange.max = data.ability_max;
  els.abilityNumber.min = data.ability_min;
  els.abilityNumber.max = data.ability_max;

  state.topics.forEach((topic) => {
    const option = document.createElement("option");
    option.value = topic;
    option.textContent = topic;
    els.topicFilter.appendChild(option);
  });

  renderAll();
}

els.searchBox.addEventListener("input", renderQuestionList);
els.topicFilter.addEventListener("change", renderQuestionList);
els.abilityRange.addEventListener("input", (event) => setAbility(event.target.value));
els.abilityNumber.addEventListener("input", (event) => setAbility(event.target.value));
els.statefulToggle.addEventListener("change", (event) => {
  state.stateful = event.target.checked;
  state.sessionStudent = null;
  renderMiniState();
});
els.resetStateButton.addEventListener("click", () => {
  state.sessionStudent = null;
  renderMiniState();
});
els.simulateButton.addEventListener("click", runSimulation);
els.compareButton.addEventListener("click", runCompare);

boot().catch((error) => {
  els.sourcePath.textContent = "Simulator load failed";
  alert(error.message);
});
