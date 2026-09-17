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

const TIME_PER_MCQ = 20;   // seconds
const TIME_PER_CODE = 60;  // seconds, coding questions need more room

let state = {
  topic: null,
  questions: [],
  current: 0,
  answers: [],       // index chosen (mcq) or code string (code), or null if unanswered
  timeLeft: TIME_PER_MCQ,
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

  const q = state.questions[state.current];
  const total = state.questions.length;
  const isCode = q.type === "code";
  state.timeLeft = isCode ? TIME_PER_CODE : TIME_PER_MCQ;

  $("#q-counter").textContent = `Question ${state.current + 1} / ${total}`;
  $("#progress-fill").style.width = `${(state.current / total) * 100}%`;

  const card = $("#question-card");
  const diffClass = q.diff || "medium";
  const existingAnswer = state.answers[state.current];
  const answered = isCode ? !!(existingAnswer && existingAnswer.trim()) : existingAnswer !== null;

  card.innerHTML = `
    <span class="difficulty-tag ${diffClass}">${diffClass}</span>
    ${isCode ? '<span class="difficulty-tag code-tag">write code</span>' : ""}
    <div class="question-text">${escapeHtml(q.q)}</div>
    <div id="answer-area"></div>
    <div class="nav-row">
      <button class="back-btn" id="back-btn" ${state.current === 0 ? "disabled" : ""}>Back</button>
      <button class="next-btn" id="next-btn" ${answered ? "" : "disabled"}>${state.current + 1 < total ? "Next" : "Finish"}</button>
    </div>
  `;

  const answerArea = $("#answer-area");

  if (isCode) {
    const textarea = document.createElement("textarea");
    textarea.className = "code-input";
    textarea.spellcheck = false;
    textarea.placeholder = q.starter || "// write your solution here";
    textarea.value = existingAnswer || "";
    textarea.oninput = () => {
      state.answers[state.current] = textarea.value;
      $("#next-btn").disabled = !textarea.value.trim();
    };
    answerArea.appendChild(textarea);
  } else {
    const choicesEl = document.createElement("div");
    choicesEl.className = "choices";
    q.choices.forEach((choice, i) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      if (existingAnswer === i) btn.classList.add("selected");
      btn.textContent = choice;
      btn.onclick = () => selectChoice(i);
      choicesEl.appendChild(btn);
    });
    answerArea.appendChild(choicesEl);
  }

  $("#back-btn").onclick = () => {
    if (state.current > 0) {
      state.current--;
      renderQuestion();
    }
  };

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
      lockAnswerInput();
      if (state.current + 1 < total) {
        state.current++;
        renderQuestion();
      } else {
        finishQuiz();
      }
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = $("#timer");
  el.textContent = `${state.timeLeft}s`;
  el.classList.toggle("low", state.timeLeft <= 5);
}

function selectChoice(i) {
  state.answers[state.current] = i;
  document.querySelectorAll(".choice-btn").forEach((btn, idx) => {
    btn.classList.toggle("selected", idx === i);
  });
  $("#next-btn").disabled = false;
}

function lockAnswerInput() {
  document.querySelectorAll(".choice-btn").forEach(b => b.disabled = true);
  const ta = document.querySelector(".code-input");
  if (ta) ta.disabled = true;
}

// Heuristic grading for code questions: checks that each required keyword/snippet
// appears somewhere in the submission. Not real execution - just a best-effort check.
function codeAnswerIsCorrect(q, submission) {
  if (!submission || !submission.trim()) return false;
  const normalized = submission.toLowerCase();
  return q.keywords.every(kw => normalized.includes(kw.toLowerCase()));
}

function finishQuiz() {
  clearInterval(state.timerId);
  const elapsedSec = Math.round((Date.now() - state.startedAt) / 1000);
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;

  let score = 0;
  const reviewHtml = state.questions.map((q, i) => {
    const userAnswer = state.answers[i];
    const isCode = q.type === "code";
    const isCorrect = isCode ? codeAnswerIsCorrect(q, userAnswer) : userAnswer === q.correct;
    if (isCorrect) score++;

    let yourAnswerHtml, explainHtml = "";
    if (isCode) {
      const shown = userAnswer && userAnswer.trim() ? userAnswer : "No answer (time ran out)";
      yourAnswerHtml = `<pre class="code-block">${escapeHtml(shown)}</pre>`;
      if (!isCorrect) {
        explainHtml = `
          <div class="review-line your-answer right">Sample solution:</div>
          <pre class="code-block">${escapeHtml(q.solution)}</pre>
          <div class="review-explain">${escapeHtml(q.exp)}</div>
        `;
      }
    } else {
      const text = userAnswer === null ? "No answer (time ran out)" : q.choices[userAnswer];
      yourAnswerHtml = `<div class="review-line your-answer ${isCorrect ? "right" : "wrong"}">Your answer: ${escapeHtml(text)}</div>`;
      if (!isCorrect) {
        explainHtml = `
          <div class="review-line your-answer right">Correct answer: ${escapeHtml(q.choices[q.correct])}</div>
          <div class="review-explain">${escapeHtml(q.exp)}</div>
        `;
      }
    }

    return `
      <div class="review-item ${isCorrect ? "correct" : "incorrect"}">
        <div class="review-q">${escapeHtml(`${i + 1}. ${q.q}`)}</div>
        ${yourAnswerHtml}
        ${explainHtml}
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
