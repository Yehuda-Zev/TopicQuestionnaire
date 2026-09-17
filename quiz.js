const TOPIC_LABELS = {
  python: "Python",
  java: "Java",
  csharp: "C#",
  rust: "Rust",
  acronyms: "CompSci Acronyms",
  algorithms: "Algorithms",
  pokemon: "Name That Pok\u00e9mon!",
  minecraft: "Minecraft Trivia",
  nms: "No Man's Sky Lore",
  vocab: "Vocabulary"
};

const TIME_PER_QUESTION = 20; // seconds

let state = {
  topic: null,
  questions: [],
  current: 0,
  answers: [],       // index chosen per question, or null if timed out
  timeLeft: TIME_PER_QUESTION,
  timerId: null,
  startedAt: null
};

function $(sel) { return document.querySelector(sel); }

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
}

function buildTopicGrid() {
  const grid = $("#topic-grid");
  grid.innerHTML = "";
  Object.keys(QUESTIONS).forEach(key => {
    const btn = document.createElement("button");
    btn.className = "topic-btn";
    btn.textContent = TOPIC_LABELS[key] || key;
    btn.onclick = () => startQuiz(key);
    grid.appendChild(btn);
  });
}

function startQuiz(topicKey) {
  state.topic = topicKey;
  state.questions = QUESTIONS[topicKey];
  state.current = 0;
  state.answers = new Array(state.questions.length).fill(null);
  state.startedAt = Date.now();
  showScreen("#quiz-screen");
  renderQuestion();
}

function renderQuestion() {
  clearInterval(state.timerId);
  state.timeLeft = TIME_PER_QUESTION;

  const q = state.questions[state.current];
  const total = state.questions.length;

  $("#q-counter").textContent = `Question ${state.current + 1} / ${total}`;
  $("#progress-fill").style.width = `${(state.current / total) * 100}%`;

  const card = $("#question-card");
  const diffClass = q.diff || "medium";
  card.innerHTML = `
    <span class="difficulty-tag ${diffClass}">${diffClass}</span>
    <div class="question-text">${escapeHtml(q.q)}</div>
    <div class="choices" id="choices"></div>
    <button class="next-btn" id="next-btn" disabled>Next</button>
  `;

  const choicesEl = $("#choices");
  q.choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = choice;
    btn.onclick = () => selectChoice(i);
    choicesEl.appendChild(btn);
  });

  $("#next-btn").onclick = () => {
    if (state.current + 1 < total) {
      state.current++;
      renderQuestion();
    } else {
      finishQuiz();
    }
  };

  updateTimerDisplay();
  state.timerId = setInterval(() => {
    state.timeLeft--;
    updateTimerDisplay();
    if (state.timeLeft <= 0) {
      clearInterval(state.timerId);
      lockChoices();
      $("#next-btn").disabled = false;
      $("#next-btn").click();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = $("#timer");
  el.textContent = `${state.timeLeft}s`;
  el.classList.toggle("low", state.timeLeft <= 5);
}

function selectChoice(i) {
  if (state.answers[state.current] !== null) return; // already answered
  state.answers[state.current] = i;
  clearInterval(state.timerId);
  lockChoices();
  document.querySelectorAll(".choice-btn")[i].classList.add("selected");
  $("#next-btn").disabled = false;
}

function lockChoices() {
  document.querySelectorAll(".choice-btn").forEach(b => b.disabled = true);
}

function finishQuiz() {
  clearInterval(state.timerId);
  const elapsedSec = Math.round((Date.now() - state.startedAt) / 1000);
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;

  let score = 0;
  const reviewHtml = state.questions.map((q, i) => {
    const userIdx = state.answers[i];
    const isCorrect = userIdx === q.correct;
    if (isCorrect) score++;
    const yourAnswerText = userIdx === null ? "No answer (time ran out)" : q.choices[userIdx];
    return `
      <div class="review-item ${isCorrect ? "correct" : "incorrect"}">
        <div class="review-q">${state.current >= 0 ? "" : ""}${escapeHtml(`${i + 1}. ${q.q}`)}</div>
        <div class="review-line your-answer ${isCorrect ? "right" : "wrong"}">Your answer: ${escapeHtml(yourAnswerText)}</div>
        ${!isCorrect ? `<div class="review-line your-answer right">Correct answer: ${escapeHtml(q.choices[q.correct])}</div>` : ""}
        <div class="review-explain">${escapeHtml(q.exp)}</div>
      </div>
    `;
  }).join("");

  $("#score-num").textContent = `${score} / ${state.questions.length}`;
  $("#score-time").textContent = `Topic: ${TOPIC_LABELS[state.topic]} \u00b7 Time: ${mins}m ${secs}s`;
  $("#review-list").innerHTML = reviewHtml;

  showScreen("#results-screen");
}

function restart() {
  showScreen("#topic-screen");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
  buildTopicGrid();
  $("#restart-btn").onclick = restart;
});
