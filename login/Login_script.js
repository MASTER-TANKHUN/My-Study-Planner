let allowAutoRedirect = true;
let currentLang = localStorage.getItem('language') || 'th';

// Translation Dictionary
const translations = {
    th: {
        loginTab: "เข้าสู่ระบบ",
        registerTab: "สมัครสมาชิก",
        emailLabel: "อีเมล",
        emailPlaceholder: "กรอกอีเมลของคุณ",
        passwordLabel: "รหัสผ่าน",
        passwordPlaceholder: "กรอกรหัสผ่านของคุณ",
        rememberMe: "จดจำฉัน",
        forgotPassword: "ลืมรหัสผ่าน?",
        loginBtn: "เข้าสู่ระบบ",
        loginWith: "หรือเข้าสู่ระบบด้วย",
        noAccount: "ยังไม่มีบัญชี?",
        registerNow: "สมัครสมาชิกเลย",
        nameLabel: "ชื่อผู้ใช้",
        namePlaceholder: "ตั้งชื่อผู้ใช้ของคุณ",
        createPasswordPlaceholder: "ตั้งรหัสผ่าน",
        confirmPasswordLabel: "ยืนยันรหัสผ่าน",
        confirmPasswordPlaceholder: "ยืนยันรหัสผ่านอีกครั้ง",
        registerBtn: "สร้างบัญชี",
        registerWith: "หรือสมัครสมาชิกด้วย",
        hasAccount: "มีบัญชีอยู่แล้ว?",
        loginNow: "เข้าสู่ระบบเลย",
        loginTitle: "ยินดีต้อนรับกลับมา!",
        loginText: "เข้าสู่ระบบเพื่อจัดการแผนการเรียนของคุณ",
        registerTitle: "สร้างบัญชีใหม่",
        registerText: "เริ่มต้นวางแผนการเรียนของคุณกับเรา",
        validation: {
            emailEmpty: "กรุณากรอกอีเมล",
            passwordEmpty: "กรุณากรอกรหัสผ่าน",
            nameEmpty: "กรุณากรอกชื่อผู้ใช้",
            confirmEmpty: "กรุณายืนยันรหัสผ่าน",
            passwordMismatch: "รหัสผ่านไม่ตรงกัน",
            weak: "อ่อน",
            medium: "ปานกลาง",
            strong: "แข็งแรง",
            loginSuccess: "เข้าสู่ระบบสำเร็จ!",
            loginFailed: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
            createdSuccess: "สร้างบัญชีสำเร็จ!",
            googleSuccess: "เข้าสู่ระบบด้วย Google สำเร็จ!",
            googleFailed: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ"
        }
    },
    en: {
        loginTab: "Login",
        registerTab: "Register",
        emailLabel: "Email",
        emailPlaceholder: "Enter your email",
        passwordLabel: "Password",
        passwordPlaceholder: "Enter your password",
        rememberMe: "Remember me",
        forgotPassword: "Forgot Password?",
        loginBtn: "Login",
        loginWith: "Or login with",
        noAccount: "Don't have an account?",
        registerNow: "Register now",
        nameLabel: "Username",
        namePlaceholder: "Enter your username",
        createPasswordPlaceholder: "Create a password",
        confirmPasswordLabel: "Confirm Password",
        confirmPasswordPlaceholder: "Confirm your password",
        registerBtn: "Create Account",
        registerWith: "Or register with",
        hasAccount: "Already have an account?",
        loginNow: "Login now",
        loginTitle: "Welcome Back!",
        loginText: "Sign in to manage your study plans.",
        registerTitle: "Create Account",
        registerText: "Start planning your studies with us.",
        validation: {
            emailEmpty: "Email cannot be empty",
            passwordEmpty: "Password cannot be empty",
            nameEmpty: "Name cannot be empty",
            confirmEmpty: "Please confirm your password",
            passwordMismatch: "Passwords don't match",
            weak: "Weak",
            medium: "Medium",
            strong: "Strong",
            loginSuccess: "Login Success!",
            loginFailed: "Email or password is incorrect.",
            createdSuccess: "Account created successfully!",
            googleSuccess: "Login with Google Success!",
            googleFailed: "Google login failed"
        }
    }
};

// Initialize Language System
function initLanguage() {
    updateLanguage(currentLang);
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            if (lang !== currentLang) {
                currentLang = lang;
                localStorage.setItem('language', lang);
                updateLanguage(lang);
                document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const currentTab = document.querySelector('.form.login.active') ? 'login' : 'register';
                switchTab(currentTab);
            }
        });
    });
}

function updateLanguage(lang) {
    const t = translations[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (t[key]) el.placeholder = t[key];
    });
}

// Firebase Auth State
firebase.auth().onAuthStateChanged(user => {
    if (user && allowAutoRedirect) {
        window.location.href = "/app/index.html";
    }
});

document.addEventListener("DOMContentLoaded", function () {
    initLanguage();
    firebase.auth().onAuthStateChanged(user => {
        if (user && allowAutoRedirect) {
            window.location.href = "/app/index.html";
        }
    });
});

// Console Security Warning
if (window.console) {
    setTimeout(() => {
        console.log("%cWAIT! ✋", "color: red; font-size: 50px; font-weight: bold;");
        console.log("%cThis area is for developers only.\nIf someone told you to paste something here, it might be a trick to hack your account.", "font-size: 18px; color: #ff4444;");
    }, 1000);
}

// Tab Slider Width
const tabWidth = document.querySelector('.tab') ? document.querySelector('.tab').offsetWidth : 0;
if (document.querySelector('.tab-slider')) {
    document.querySelector('.tab-slider').style.width = tabWidth + 'px';
}

// Firestore User Doc
async function createUserDocIfNotExists(user) {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    if (!doc.exists) {
        await userRef.set({
            displayName: user.displayName || user.email.split("@")[0],
            email: user.email || "",
            photoURL: user.photoURL || "",
            theme: "light",
            createdAt: new Date(),
            lastWrite: new Date(),
            tasks: []
        });
    }
}

// Validation
function validateLoginForm() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    let isValid = true;
    const t = translations[currentLang].validation;
    if (email === '') { showError('login-email', t.emailEmpty); isValid = false; } else { clearError('login-email'); }
    if (password === '') { showError('login-password', t.passwordEmpty); isValid = false; } else { clearError('login-password'); }
    return isValid;
}

function validateRegisterForm() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const confirmPassword = document.getElementById('register-confirm-password').value.trim();
    let isValid = true;
    const t = translations[currentLang].validation;
    if (name === '') { showError('register-name', t.nameEmpty); isValid = false; } else { clearError('register-name'); }
    if (email === '') { showError('register-email', t.emailEmpty); isValid = false; } else { clearError('register-email'); }
    if (password === '') { showError('register-password', t.passwordEmpty); isValid = false; } else { clearError('register-password'); }
    if (confirmPassword === '') { showError('register-confirm-password', t.confirmEmpty); isValid = false; }
    else if (password !== confirmPassword) { showError('register-confirm-password', t.passwordMismatch); isValid = false; }
    else { clearError('register-confirm-password'); }
    return isValid;
}

function validatePasswordMatch() {
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const confirmPasswordField = document.getElementById('register-confirm-password');
    let errorMessage = document.getElementById('password-match-error');
    const t = translations[currentLang].validation;
    if (!errorMessage) {
        const newErr = document.createElement('div');
        newErr.id = 'password-match-error';
        newErr.style.cssText = 'color:#ff5252;font-size:12px;margin-top:5px;transition:all 0.3s ease;';
        confirmPasswordField.parentElement.insertAdjacentElement('afterend', newErr);
    }
    errorMessage = document.getElementById('password-match-error');
    if (password !== confirmPassword) {
        errorMessage.textContent = t.passwordMismatch;
        confirmPasswordField.style.borderColor = '#ff5252';
        return false;
    } else {
        errorMessage.textContent = '';
        confirmPasswordField.style.borderColor = '#66bb6a';
        return true;
    }
}

function showError(inputId, message) {
    const inputField = document.getElementById(inputId);
    const errorId = inputId + '-error';
    let errorElement = document.getElementById(errorId);
    inputField.style.borderColor = '#ff5252';
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = errorId;
        errorElement.style.cssText = 'color:#ff5252;font-size:12px;margin-top:5px;transition:all 0.3s ease;';
        inputField.parentElement.insertAdjacentElement('afterend', errorElement);
    }
    errorElement.textContent = message;
    inputField.style.animation = 'shake 0.5s';
    setTimeout(() => { inputField.style.animation = ''; }, 500);
}

function clearError(inputId) {
    const inputField = document.getElementById(inputId);
    const errorElement = document.getElementById(inputId + '-error');
    inputField.style.borderColor = 'rgba(255, 255, 255, 0.1)';
    if (errorElement) errorElement.textContent = '';
}

function showToast(message) {
    const toast = document.querySelector('.toast');
    if (toast) {
        toast.querySelector('.toast-message').textContent = message;
        toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); }, 3000);
    }
}

const errorMessages = {
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'default': 'An error occurred. Please try again.'
};

// Login Handler
function handleLogin() {
    allowAutoRedirect = false;
    const t = translations[currentLang];
    if (!validateLoginForm()) return;
    const button = document.querySelector('.form.login .btn');
    const loader = button.querySelector('.loader');
    const text = button.querySelector('span');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    loader.style.display = 'block';
    text.textContent = t.loginBtn + '...';
    button.disabled = true;

    auth.signInWithEmailAndPassword(email, password)
        .then(async userCredential => {
            const user = userCredential.user;
            await createUserDocIfNotExists(user);
            if (document.getElementById('remember').checked) {
                localStorage.setItem('remember', user.uid);
            } else {
                localStorage.removeItem('remember');
            }
            window.location.href = "../app/index.html";
            loader.style.display = 'none';
            text.textContent = t.validation.loginSuccess;
            showToast(t.validation.loginSuccess);
            setTimeout(() => { text.textContent = t.loginBtn; button.disabled = false; }, 1800);
        })
        .catch(error => {
            loader.style.display = 'none';
            text.textContent = t.loginBtn;
            button.disabled = false;
            alert(t.validation.loginFailed + "\n" + (errorMessages[error.code] || errorMessages['default']));
        });
}

// Register Handler
async function handleRegister() {
    const t = translations[currentLang];
    if (!validateRegisterForm()) return;
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const confirmPassword = document.getElementById('register-confirm-password').value.trim();
    const button = document.querySelector('.form.register .btn');
    const loader = button.querySelector('.loader');
    const text = button.querySelector('span');

    if (password !== confirmPassword) { alert(t.validation.passwordMismatch); return; }
    allowAutoRedirect = false;
    loader.style.display = 'block';
    text.textContent = t.registerBtn + '...';
    button.disabled = true;

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        await user.updateProfile({ displayName: name });
        await user.reload();
        await db.collection('users').doc(user.uid).set({
            displayName: user.displayName || name,
            email: email,
            photoURL: user.photoURL || "",
            theme: "light",
            language: currentLang,
            createdAt: new Date(),
            tasks: []
        });
        loader.style.display = 'none';
        text.textContent = t.validation.createdSuccess;
        showToast(t.validation.createdSuccess);
        setTimeout(() => {
            text.textContent = t.registerBtn;
            button.disabled = false;
            setTimeout(() => { allowAutoRedirect = true; window.location.href = "../app/index.html"; }, 500);
        }, 3000);
    } catch (error) {
        allowAutoRedirect = true;
        loader.style.display = 'none';
        text.textContent = t.registerBtn;
        button.disabled = false;
        alert("Registration failed: " + error.message);
    }
}

// Google Login
function handleGoogleLogin() {
    allowAutoRedirect = false;
    const t = translations[currentLang];
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const button = document.querySelector('.form.login .btn') || document.querySelector('.form.register .btn');
    const loader = button?.querySelector('.loader');
    const text = button?.querySelector('span');
    if (loader && text) { loader.style.display = 'block'; text.textContent = 'Logging in...'; button.disabled = true; }

    auth.signInWithPopup(provider)
        .then(async result => {
            const user = result.user;
            await createUserDocIfNotExists(user);
            localStorage.setItem('rememberedUser', user.uid);
            if (loader && text) { loader.style.display = 'none'; text.textContent = t.validation.googleSuccess; }
            showToast(t.validation.googleSuccess);
            setTimeout(() => {
                if (button && text) { text.textContent = button.closest('.login') ? t.loginBtn : t.registerBtn; button.disabled = false; }
                allowAutoRedirect = true;
                window.location.href = "../app/index.html";
            }, 1200);
        })
        .catch(error => {
            if (loader && text) { loader.style.display = 'none'; text.textContent = button.closest('.login') ? t.loginBtn : t.registerBtn; button.disabled = false; }
            allowAutoRedirect = true;
            alert(t.validation.googleFailed + ": " + error.message);
        });
}

// Tab Switching
function switchTab(tab) {
    const t = translations[currentLang];
    document.querySelectorAll('.typing-title').forEach(el => el.textContent = '');
    document.querySelectorAll('.typing-text').forEach(el => el.textContent = '');
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    const activeTabIndex = tab === 'login' ? 0 : 1;
    document.querySelectorAll('.tab')[activeTabIndex].classList.add('active');
    if (document.querySelector('.tab-slider')) {
        document.querySelector('.tab-slider').style.transform = `translateX(${activeTabIndex * 100}%)`;
    }
    document.querySelectorAll('.form').forEach(el => { el.style.animation = 'none'; el.offsetHeight; el.style.animation = null; el.classList.remove('active'); });
    document.querySelector(`.form.${tab}`).classList.add('active');
    const activeTitle = document.querySelector(`.form.${tab} .typing-title`);
    const activeText = document.querySelector(`.form.${tab} .typing-text`);
    const titleText = tab === 'login' ? t.loginTitle : t.registerTitle;
    const bodyText = tab === 'login' ? t.loginText : t.registerText;
    if (activeTitle) { activeTitle.classList.add('typing-animation'); typeWriter(activeTitle, titleText, 0, 70); }
    if (activeText) { setTimeout(() => { activeText.classList.add('typing-animation'); typeWriter(activeText, bodyText, 0, 30); }, titleText.length * 70 + 200); }
}

function typeWriter(element, text, index, speed) {
    if (index < text.length) {
        element.textContent += text.charAt(index);
        setTimeout(() => typeWriter(element, text, index + 1, speed), speed);
    } else {
        element.classList.remove('typing-animation');
    }
}

// Password Toggle
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.parentElement.querySelector('.password-toggle i');
    if (input.type === 'password') { input.type = 'text'; icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
    else { input.type = 'password'; icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
}

// Password Strength
function checkPasswordStrength(password) {
    const strengthBar = document.querySelector('.password-strength');
    const strengthText = document.querySelector('.password-strength-text');
    const t = translations[currentLang].validation;
    if (!strengthBar || !strengthText) return;
    strengthBar.className = 'password-strength';
    strengthText.className = 'password-strength-text';
    if (password.length === 0) { strengthBar.style.display = 'none'; strengthText.style.display = 'none'; return; }
    strengthBar.style.display = 'block';
    strengthText.style.display = 'block';
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (password.match(/([a-z].*[A-Z])|([A-Z].*[a-z])/)) strength += 1;
    if (password.match(/([a-zA-Z])/) && password.match(/([0-9])/)) strength += 1;
    if (password.match(/([!,%,&,@,#,$,^,*,?,_,~])/)) strength += 1;
    if (strength < 2) { strengthBar.classList.add('weak'); strengthText.classList.add('weak'); strengthText.textContent = t.weak; }
    else if (strength === 2) { strengthBar.classList.add('medium'); strengthText.classList.add('medium'); strengthText.textContent = t.medium; }
    else { strengthBar.classList.add('strong'); strengthText.classList.add('strong'); strengthText.textContent = t.strong; }
}

// Update Display Name
const updateDisplayName = async (newDisplayName) => {
    try {
        const user = auth.currentUser;
        if (user) { await user.updateProfile({ displayName: newDisplayName }); await user.reload(); }
    } catch (error) { console.error("Error updating display name:", error); }
};

// Input Focus Effects
document.querySelectorAll('.input-field').forEach(input => {
    input.addEventListener('focus', () => { input.parentElement.parentElement.classList.add('focused'); });
    input.addEventListener('blur', () => { if (input.value === '') input.parentElement.parentElement.classList.remove('focused'); });
});

// Window Onload
window.onload = function () {
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const registerName = document.getElementById('register-name');
    const registerEmail = document.getElementById('register-email');
    const registerPassword = document.getElementById('register-password');
    const registerConfirmPassword = document.getElementById('register-confirm-password');

    if (loginEmail) loginEmail.addEventListener('input', () => clearError('login-email'));
    if (loginPassword) loginPassword.addEventListener('input', () => clearError('login-password'));
    if (registerName) registerName.addEventListener('input', () => clearError('register-name'));
    if (registerEmail) registerEmail.addEventListener('input', () => clearError('register-email'));
    if (registerPassword) registerPassword.addEventListener('input', () => clearError('register-password'));
    if (registerConfirmPassword) registerConfirmPassword.addEventListener('input', validatePasswordMatch);

    switchTab('login');
    initRobotTracker();
};

/* Robot Tracker Logic */
function initRobotTracker() {
    const leftPupil = document.getElementById('left-pupil');
    const rightPupil = document.getElementById('right-pupil');
    const hands = document.getElementById('robot-hands');
    const handsPeek = document.getElementById('robot-hands-peek');
    const robotSvg = document.querySelector('.robot-face');

    if (!leftPupil || !rightPupil) return;

    // Track mouse
    document.addEventListener('mousemove', (e) => {
        if (hands.getAttribute('transform') === 'translate(0, -5)') return; // Blinded

        // If focusing on text/email inputs, don't track mouse to let it track typing
        const activeNode = document.activeElement;
        if (activeNode && (activeNode.type === 'text' || activeNode.type === 'email' || activeNode.tagName === 'TEXTAREA')) return;

        const rect = robotSvg.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;

        const maxMove = 3;

        // calculate normalized movement
        let moveX = (deltaX / window.innerWidth) * maxMove * 2;
        let moveY = (deltaY / window.innerHeight) * maxMove * 2;

        // clamp values
        moveX = Math.max(-maxMove, Math.min(maxMove, moveX));
        moveY = Math.max(-maxMove, Math.min(maxMove, moveY));

        leftPupil.setAttribute('transform', `translate(${moveX}, ${moveY})`);
        rightPupil.setAttribute('transform', `translate(${moveX}, ${moveY})`);
    });

    // Track Typing lengths (Text/Email)
    const textInputs = document.querySelectorAll('input[type="text"], input[type="email"]');
    textInputs.forEach(input => {
        const updateEyes = (e) => {
            const length = e.target.value.length;
            const maxMove = 4;
            // Map length 0-25 chars to -maxMove to +maxMove linearly
            let moveX = (length / 25) * (maxMove * 2) - maxMove;
            moveX = Math.max(-maxMove, Math.min(maxMove, moveX));

            // Look slightly down towards keyboard while typing
            leftPupil.setAttribute('transform', `translate(${moveX}, 2)`);
            rightPupil.setAttribute('transform', `translate(${moveX}, 2)`);
        };
        input.addEventListener('input', updateEyes);
        input.addEventListener('focus', updateEyes);
    });

    // Prevent input blur when clicking the show password toggle
    const toggles = document.querySelectorAll('.password-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('mousedown', (e) => e.preventDefault());
    });

    // Track Password Input
    const pwInputs = document.querySelectorAll('input[type="password"]');
    pwInputs.forEach(input => {
        input.addEventListener('focus', () => {
            // Cover eyes
            hands.setAttribute('transform', 'translate(0, -5)');
            handsPeek.setAttribute('opacity', '0');
            leftPupil.setAttribute('transform', `translate(0, 0)`);
            rightPupil.setAttribute('transform', `translate(0, 0)`);
        });

        input.addEventListener('blur', () => {
            // Drop hands
            hands.setAttribute('transform', 'translate(0, 100)');
            handsPeek.setAttribute('opacity', '0');
            handsPeek.setAttribute('transform', 'translate(0, 100)');
        });
    });

    // Handle Peek (Show Password toggle override)
    window.togglePassword = function (inputId) {
        const input = document.getElementById(inputId);
        const icon = input.parentElement.querySelector('.password-toggle i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');

            // Peek animation
            if (document.activeElement === input) {
                hands.setAttribute('transform', 'translate(0, 100)');
                handsPeek.setAttribute('opacity', '1');
                handsPeek.setAttribute('transform', 'translate(0, -15)');
                leftPupil.setAttribute('transform', `translate(0, -2)`); // Look up
                rightPupil.setAttribute('transform', `translate(0, -2)`);
            }
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');

            // Cover eyes again
            if (document.activeElement === input) {
                hands.setAttribute('transform', 'translate(0, -5)');
                handsPeek.setAttribute('opacity', '0');
                handsPeek.setAttribute('transform', 'translate(0, 100)');
            }
        }
    }
}
