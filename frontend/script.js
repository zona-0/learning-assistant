const API_URL = 'http://localhost:8080/api/login';

async function doLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const btn      = document.getElementById('btn-login');
  const alertBox = document.getElementById('alert-box');

  if (!username || !password) {
    showAlert('error', 'fill all fields!');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Verification...';
  hideAlert();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
<<<<<<< HEAD
      showAlert('success', `Login success, ${data.fullName}!`);
=======
      showAlert('success', `Login success dek, ${data.fullName}!`);
>>>>>>> 03f10ac5ce75b8a5842a1d409a218d057832acf7
      btn.textContent = 'Login Success';
    } else {
      showAlert('error', `${data.message}`);
      btn.disabled    = false;
<<<<<<< HEAD
      btn.textContent = 'Masuk';
    }
  } catch (err) {
    showAlert('error', 'server not connected backend');
=======
      btn.textContent = 'Masuk →';
    }
  } catch (err) {
    showAlert('error', 'server not connected backend.');
>>>>>>> 03f10ac5ce75b8a5842a1d409a218d057832acf7
    btn.disabled    = false;
    btn.textContent = 'Masuk →';
  }
}

function showAlert(type, msg) {
  const box = document.getElementById('alert-box');
  box.className = `alert ${type}`;
  box.textContent = msg;
}

function hideAlert() {
  document.getElementById('alert-box').className = 'alert hidden';
}

function togglePassword() {
  const pw = document.getElementById('password');
  pw.type = pw.type === 'password' ? 'text' : 'password';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});