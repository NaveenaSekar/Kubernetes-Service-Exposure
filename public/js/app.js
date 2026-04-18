(() => {
  const AUTH_KEY = "isLoggedIn";
  const USER_KEY = "loginUser";
  const TASKS_KEY_PREFIX = "tasks";

  const page = document.body.dataset.page;
  let completedChart = null;
  let pendingChart = null;

  function isLoggedIn() {
    return localStorage.getItem(AUTH_KEY) === "true";
  }

  function getUsername() {
    return localStorage.getItem(USER_KEY) || "Student";
  }

  function getUserTaskKey() {
    const username = getUsername().trim().toLowerCase().replace(/\s+/g, "_");
    return `${TASKS_KEY_PREFIX}_${username || "student"}`;
  }

  function setLogin(identifier) {
    localStorage.setItem(AUTH_KEY, "true");
    localStorage.setItem(USER_KEY, identifier);
  }

  function logout() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function renderNavbar() {
    const root = document.getElementById("navbar-root");
    if (!root) return;

    const loggedIn = isLoggedIn();
    const links = [
      { href: "/index.html", label: "Home", show: true, key: "home" },
      { href: "/dashboard.html", label: "Dashboard", show: loggedIn, key: "dashboard" },
      { href: "/login.html", label: "Login", show: !loggedIn, key: "login" },
    ].filter((item) => item.show);

    root.innerHTML = `
      <header class="navbar">
        <div class="navbar-inner">
          <div class="brand"><i class="fa-solid fa-graduation-cap"></i> Student Task Tracker</div>
          <button id="nav-toggle" class="nav-toggle" aria-label="Toggle menu"><i class="fa-solid fa-bars"></i></button>
          <nav id="nav-links" class="nav-links">
            ${links
              .map(
                (item) =>
                  `<a class="nav-link ${page === item.key ? "active" : ""}" href="${item.href}">${item.label}</a>`
              )
              .join("")}
            ${
              loggedIn
                ? `<button id="logout-btn" class="btn btn-danger" type="button">Logout</button>`
                : ""
            }
          </nav>
        </div>
      </header>
    `;

    const navToggle = document.getElementById("nav-toggle");
    const navLinks = document.getElementById("nav-links");
    if (navToggle && navLinks) {
      navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
    }

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        logout();
        window.location.href = "/login.html";
      });
    }
  }

  function routeGuard() {
    if (page === "dashboard" && !isLoggedIn()) {
      window.location.href = "/login.html";
      return false;
    }
    if (page === "login" && isLoggedIn()) {
      window.location.href = "/dashboard.html";
      return false;
    }
    return true;
  }

  function getTasks() {
    try {
      const parsed = JSON.parse(localStorage.getItem(getUserTaskKey()) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.map((task) => ({
        id: String(task.id ?? Date.now()),
        title: String(task.title ?? "").trim(),
        type: String(task.type ?? "Assignment"),
        dueDate: String(task.dueDate ?? ""),
        status: String(task.status ?? "pending").toLowerCase() === "completed" ? "completed" : "pending",
      }));
    } catch (_err) {
      return [];
    }
  }

  function saveTasks(tasks) {
    localStorage.setItem(getUserTaskKey(), JSON.stringify(tasks));
  }

  function calculateTotals(tasks) {
    const total = tasks.length;
    const completed = tasks.filter((task) => String(task.status).toLowerCase() === "completed").length;
    const pending = total - completed;
    return { total, completed, pending };
  }
  function filterTasks(tasks, filter) {
    if (filter === "all") return tasks;
    return tasks.filter((task) => task.status === filter);
  }

  function searchTasks(tasks, query) {
    if (!query) return tasks;
    return tasks.filter((task) => task.title.toLowerCase().includes(query.toLowerCase()));
  }


  function calculateProgress(tasks) {
    const { total, completed } = calculateTotals(tasks);
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }

  function setupLoginPage() {
    const form = document.getElementById("login-form");
    if (!form) return;

    const username = document.getElementById("username");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const usernameError = document.getElementById("username-error");
    const emailError = document.getElementById("email-error");
    const passwordError = document.getElementById("password-error");
    const togglePasswordBtn = document.getElementById("toggle-password");
    const googleLoginBtn = document.getElementById("google-login-btn");

    const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    togglePasswordBtn?.addEventListener("click", () => {
      const isPassword = password.type === "password";
      password.type = isPassword ? "text" : "password";
      togglePasswordBtn.innerHTML = isPassword
        ? '<i class="fa-regular fa-eye-slash"></i>'
        : '<i class="fa-regular fa-eye"></i>';
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      usernameError.textContent = "";
      emailError.textContent = "";
      passwordError.textContent = "";

      const usernameValue = username.value.trim();
      const emailValue = email.value.trim();
      const passValue = password.value.trim();
      let isValid = true;

      if (!usernameValue) {
        usernameError.textContent = "Username is required.";
        isValid = false;
      } else if (usernameValue.length < 3) {
        usernameError.textContent = "Username must be at least 3 characters.";
        isValid = false;
      }

      if (!emailValue) {
        emailError.textContent = "Email is required.";
        isValid = false;
      } else if (!validEmail(emailValue)) {
        emailError.textContent = "Enter a valid email address.";
        isValid = false;
      }

      if (!passValue) {
        passwordError.textContent = "Password is required.";
        isValid = false;
      }

      if (!isValid) return;

      setLogin(usernameValue);
      window.location.href = "/dashboard.html";
    });

    googleLoginBtn?.addEventListener("click", () => {
      setLogin("Google Student");
      window.location.href = "/dashboard.html";
    });
  }

  function renderTasks(tasks) {
    const list = document.getElementById("task-list");
    const empty = document.getElementById("empty-state");
    if (!list || !empty) return;

    const filtered = [...tasks];

    if (filtered.length === 0) {
      list.innerHTML = "";
      empty.style.display = "block";
      return;
    }

    empty.style.display = "none";
    list.innerHTML = filtered
      .map(
        (task) => `
          <article class="task-item">
            <div>
              <strong>${task.title}</strong>
              <div class="task-meta">
                <span class="badge ${task.type.toLowerCase()}">${task.type}</span>
                <span>Due: ${task.dueDate}</span>
                <span class="status ${task.status}">${task.status}</span>
              </div>
            </div>
            <div class="task-actions">
              <label class="task-check" for="task-toggle-${task.id}">
                <input id="task-toggle-${task.id}" class="task-toggle" type="checkbox" data-id="${task.id}" ${
          task.status === "completed" ? "checked" : ""
        } />
                <span>Done</span>
              </label>
              <button class="btn btn-danger" data-action="delete" data-id="${task.id}" type="button">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderFilteredTasks(tasks, filter, query) {
    const list = document.getElementById("filtered-task-list");
    const empty = document.getElementById("filtered-empty-state");
    if (!list || !empty) return;

    let filtered = filterTasks([...tasks], filter);
    filtered = searchTasks(filtered, query);

    if (filtered.length === 0) {
      list.innerHTML = "";
      empty.style.display = "block";
      return;
    }

    empty.style.display = "none";
    list.innerHTML = filtered
      .map(
        (task) => `
          <article class="task-item">
            <div>
              <strong>${task.title}</strong>
              <div class="task-meta">
                <span class="badge ${task.type.toLowerCase()}">${task.type}</span>
                <span>Due: ${task.dueDate}</span>
                <span class="status ${task.status}">${task.status}</span>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }

  function updateDashboard(tasks) {
    const totals = calculateTotals(tasks);
    const progress = calculateProgress(tasks);

    const totalCount = document.getElementById("total-count");
    const completedCount = document.getElementById("completed-count");
    const pendingCount = document.getElementById("pending-count");
    const progressCount = document.getElementById("progress-count");
    const progressBar = document.getElementById("progress-bar");

    if (totalCount) totalCount.textContent = String(totals.total);
    if (completedCount) completedCount.textContent = String(totals.completed);
    if (pendingCount) pendingCount.textContent = String(totals.pending);
    if (progressCount) progressCount.textContent = `${progress}%`;
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
      progressBar.textContent = `${progress}%`;
    }
  }

  function renderChart(tasks) {
    const completedCanvas = document.getElementById("completed-chart");
    const pendingCanvas = document.getElementById("pending-chart");
    if (!completedCanvas || !pendingCanvas || typeof Chart === "undefined") return;

    const palette = [
      "#2563eb",
      "#16a34a",
      "#dc2626",
      "#f59e0b",
      "#7c3aed",
      "#0ea5e9",
      "#ec4899",
      "#84cc16",
      "#14b8a6",
      "#f97316",
      "#4f46e5",
      "#22c55e",
    ];

    const completedTasks = tasks.filter((task) => task.status === "completed");
    const pendingTasks = tasks.filter((task) => task.status === "pending");

    const makeData = (items, emptyLabel) => {
      const safe = items.length > 0 ? items : [{ title: emptyLabel }];
      return {
        labels: safe.map((task) => task.title),
        values: safe.map(() => 1),
        colors: safe.map((_, idx) => palette[idx % palette.length]),
      };
    };

    const completedData = makeData(completedTasks, "No Completed Tasks");
    const pendingData = makeData(pendingTasks, "No Pending Tasks");

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
        },
      },
    };

    if (completedChart) {
      completedChart.data.labels = completedData.labels;
      completedChart.data.datasets[0].data = completedData.values;
      completedChart.data.datasets[0].backgroundColor = completedData.colors;
      completedChart.update();
    } else {
      completedChart = new Chart(completedCanvas, {
        type: "doughnut",
        data: {
          labels: completedData.labels,
          datasets: [
            {
              data: completedData.values,
              backgroundColor: completedData.colors,
              borderWidth: 0,
            },
          ],
        },
        options: chartOptions,
      });
    }

    if (pendingChart) {
      pendingChart.data.labels = pendingData.labels;
      pendingChart.data.datasets[0].data = pendingData.values;
      pendingChart.data.datasets[0].backgroundColor = pendingData.colors;
      pendingChart.update();
    } else {
      pendingChart = new Chart(pendingCanvas, {
        type: "doughnut",
        data: {
          labels: pendingData.labels,
          datasets: [
            {
              data: pendingData.values,
              backgroundColor: pendingData.colors,
              borderWidth: 0,
            },
          ],
        },
        options: chartOptions,
      });
    }
  }

  function addTask(task) {
    const tasks = getTasks();
    tasks.unshift({
      ...task,
      status: String(task.status).toLowerCase() === "completed" ? "completed" : "pending",
    });
    saveTasks(tasks);
    return tasks;
  }

  function deleteTask(id) {
    const tasks = getTasks().filter((task) => task.id !== id);
    saveTasks(tasks);
    return tasks;
  }

  function toggleTaskStatus(id) {
    const tasks = getTasks().map((task) => {
      if (task.id !== id) return task;
      const current = String(task.status).toLowerCase() === "completed" ? "completed" : "pending";
      return {
        ...task,
        status: current === "completed" ? "pending" : "completed",
      };
    });
    saveTasks(tasks);
    return tasks;
  }

  function setupDashboardPage() {
    const welcome = document.getElementById("welcome-name");
    if (welcome) welcome.textContent = getUsername();

    const form = document.getElementById("task-form");
    const title = document.getElementById("task-title");
    const type = document.getElementById("task-type");
    const dueDate = document.getElementById("task-due-date");
    const titleError = document.getElementById("task-title-error");
    const typeError = document.getElementById("task-type-error");
    const dateError = document.getElementById("task-date-error");
    const list = document.getElementById("task-list");
    const searchInput = document.getElementById("search-task");
    const filterButtons = document.querySelectorAll("[data-filter]");
    const today = new Date().toISOString().split("T")[0];
    dueDate.min = today;

    let activeFilter = "all";
    let searchQuery = "";
    let tasks = getTasks();
    saveTasks(tasks);

    const refresh = () => {
      updateDashboard(tasks);
      renderTasks(tasks);
      renderFilteredTasks(tasks, activeFilter, searchQuery);
      renderChart(tasks);
    };

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      titleError.textContent = "";
      typeError.textContent = "";
      dateError.textContent = "";

      const titleValue = title.value.trim();
      const typeValue = type.value;
      const dateValue = dueDate.value;
      let valid = true;

      if (!titleValue) {
        titleError.textContent = "Task title is required.";
        valid = false;
      }
      if (!typeValue) {
        typeError.textContent = "Task type is required.";
        valid = false;
      }
      if (!dateValue) {
        dateError.textContent = "Due date is required.";
        valid = false;
      } else if (dateValue < today) {
        dateError.textContent = "Due date cannot be before today.";
        valid = false;
      }
      if (!valid) return;

      tasks = addTask({
        id: Date.now().toString(),
        title: titleValue,
        type: typeValue,
        dueDate: dateValue,
        status: "pending",
      });
      form.reset();
      refresh();
    });

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        filterButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        activeFilter = button.dataset.filter;
        refresh();
      });
    });

    searchInput?.addEventListener("input", () => {
      searchQuery = searchInput.value.trim();
      refresh();
    });

    list?.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target) return;
      const id = target.dataset.id;
      const action = target.dataset.action;
      if (action === "delete") {
        tasks = deleteTask(id);
      }
      refresh();
    });

    list?.addEventListener("change", (event) => {
      const target = event.target;
      if (!target.matches("input.task-toggle")) return;
      const id = target.dataset.id;
      tasks = toggleTaskStatus(id);
      refresh();
    });

    refresh();
  }

  if (!routeGuard()) return;
  renderNavbar();
  setupLoginPage();
  setupDashboardPage();
})();
