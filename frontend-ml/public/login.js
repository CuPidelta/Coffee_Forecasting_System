if (localStorage.getItem("isLoggedIn") === "true") {
  window.location.href = "index.html";
}

const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const btnText = loginBtn.querySelector(".btn-text");
const btnLoader = loginBtn.querySelector(".btn-loader");
const errorBox = document.getElementById("login-error-box");
const errorMsg = document.getElementById("login-error-msg");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const payload = {
    username: document.getElementById("username").value.trim(),
    password: document.getElementById("password").value,
  };

  setLoading(true);

  try {
    const response = await fetch("http://localhost:5001/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success) {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userRole", data.role || "Manager");
      window.location.href = "index.html";
    } else {
      showError(data.message || "Invalid credentials. Please try again.");
    }
  } catch (err) {
    console.error("Login connection error:", err);
    showError(
      "Could not connect to the auth server. Make sure auth.py is running on port 5001.",
    );
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  loginBtn.disabled = isLoading;
  btnText.hidden = isLoading;
  btnLoader.hidden = !isLoading;
}

function showError(message) {
  errorMsg.textContent = message;
  errorBox.style.display = "flex";
}

function hideError() {
  errorBox.style.display = "none";
  errorMsg.textContent = "";
}
