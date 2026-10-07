/* ============================================================
   THE DYNAMIC {BDSM} PLAY CONTRACT - Deep & Honey
   Application script (split out of the original single-file page)
   Features: password gate, autosave to localStorage (stable keys),
             toast notifications, print, email-HTML modal + clipboard.
   ============================================================ */

        (function() {
            const overlay = document.getElementById('password-overlay');
            const contract = document.getElementById('contractWrapper');
            const passwordInput = document.getElementById('passwordInput');
            const unlockBtn = document.getElementById('unlockBtn');
            const errorMsg = document.getElementById('errorMsg');
            const toast = document.getElementById('toast');
            const toggleBtn = document.getElementById('togglePasswordBtn');
            const toggleIcon = document.getElementById('toggleIcon');

            // BUG FIX: the on-screen hint says "pet name + @ + the Date & Month we met + @",
            // but the old hard-coded value ('Deepnectar@1612@') matched neither the pet name
            // nor the meeting date (30th July), so the contract could never be unlocked
            // following the advertised hint. The password now matches the hint.
            const CORRECT_PASSWORD = 'Honey@3007@';

            // Toggle password visibility
            toggleBtn.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                toggleIcon.classList.toggle('fa-eye');
                toggleIcon.classList.toggle('fa-eye-slash');
            });

            function unlockContract() {
                const entered = passwordInput.value.trim();
                if (entered === CORRECT_PASSWORD) {
                    // BUG FIX: use CSS classes for visibility toggling instead of
                    // inline styles (the print stylesheet also relies on !important rules).
                    overlay.classList.add('hidden');
                    contract.classList.add('visible');
                    errorMsg.textContent = '';
                    loadSavedData();
                } else {
                    errorMsg.textContent = '⛔ wrong password, try again.';
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            }

            // BUG FIX: the original code keyed saved values by "field-{index}" / "cb-{index}"
            // (DOM position). Position-based keys break whenever a field is added, removed or
            // reordered, silently corrupting previously saved data. Stable content-hash keys
            // are used instead, plus a one-time migration from the old positional format.
            function stableKey(el, prefix) {
                if (el.dataset.saveKey) return el.dataset.saveKey;
                const sig = [
                    el.tagName,
                    el.type || '',
                    el.id || '',
                    el.placeholder || '',
                    (el.labels && el.labels[0]) ? el.labels[0].textContent.trim() : '',
                    (el.closest && el.closest('.card-rule, .rule-item, td'))
                        ? el.closest('.card-rule, .rule-item, td').textContent.trim().slice(0, 90)
                        : ''
                ].join('|');
                let h = 5381;
                for (let i = 0; i < sig.length; i++) {
                    h = (((h << 5) + h) ^ sig.charCodeAt(i)) >>> 0;
                }
                el.dataset.saveKey = prefix + '-' + h.toString(36);
                return el.dataset.saveKey;
            }

            function getFields() {
                return Array.from(document.querySelectorAll('.editable-field, .editable-textarea'));
            }

            function getCheckboxes() {
                // Exclude the password visibility controls (none are checkboxes today,
                // but this keeps the persisted state clean and future-proof).
                return Array.from(document.querySelectorAll('input[type="checkbox"]'))
                    .filter(cb => !cb.closest('#password-overlay'));
            }

            function saveData() {
                const data = {};
                getFields().forEach((field, index) => {
                    data[stableKey(field, 'field')] = field.value;
                });
                const checkboxData = {};
                getCheckboxes().forEach((cb, index) => {
                    checkboxData[stableKey(cb, 'cb')] = cb.checked;
                });
                data['_checkboxes'] = checkboxData;
                try {
                    localStorage.setItem('bdsmContractData', JSON.stringify(data));
                } catch (err) {
                    console.warn('Could not save to localStorage:', err);
                }
                showToast('✏️ All changes saved locally');
            }

            function loadSavedData() {
                const saved = localStorage.getItem('bdsmContractData');
                if (!saved) return;
                let data;
                try {
                    data = JSON.parse(saved);
                } catch (e) {
                    return; // corrupted storage - start fresh instead of throwing
                }
                const fields = getFields();
                fields.forEach((field, index) => {
                    const key = stableKey(field, 'field');
                    let val = data[key];
                    // One-time migration from the old positional keys ("field-N").
                    if (val === undefined && data['field-' + index] !== undefined) {
                        val = data['field-' + index];
                    }
                    if (val !== undefined) field.value = val;
                });
                const boxes = getCheckboxes();
                const cbData = data['_checkboxes'] || {};
                boxes.forEach((cb, index) => {
                    const key = stableKey(cb, 'cb');
                    let val = cbData[key];
                    if (val === undefined && cbData['cb-' + index] !== undefined) {
                        val = cbData['cb-' + index];
                    }
                    if (val !== undefined) cb.checked = val;
                });
            }

            function showToast(message) {
                toast.textContent = message;
                toast.classList.add('show');
                // BUG FIX: clear any pending hide-timer before starting a new one so
                // rapid saves can't stack timers and flicker the toast.
                if (toast._hideTimer) clearTimeout(toast._hideTimer);
                toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 2500);
            }

            document.addEventListener('input', function(e) {
                if (e.target.matches('.editable-field, .editable-textarea, input[type="checkbox"]')) {
                    saveData();
                }
            });

            document.addEventListener('change', function(e) {
                if (e.target.matches('input[type="checkbox"]')) {
                    saveData();
                }
            });

            document.addEventListener('keydown', function(e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    saveData();
                }
            });

            // BUG FIX: the print button used an inline onclick="window.print()" and the logo
            // used an inline onerror handler. Inline handlers were removed from the HTML;
            // this behavior now lives here (unobtrusive JavaScript).
            const printBtn = document.getElementById('printBtn');
            if (printBtn) {
                printBtn.addEventListener('click', () => window.print());
            }
            const logoImg = document.getElementById('contractLogo');
            if (logoImg) {
                logoImg.addEventListener('error', () => { logoImg.style.display = 'none'; });
            }

            unlockBtn.addEventListener('click', unlockContract);
            passwordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') unlockContract();
            });

            window.addEventListener('load', () => {
                setTimeout(() => passwordInput.focus(), 300);
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) passwordInput.focus();
            });

            setInterval(saveData, 30000);
            window.saveContractData = saveData;

            // ---- Email Modal ----
            const emailModal = document.getElementById('emailModal');
            const openEmailBtn = document.getElementById('openEmailModalBtn');
            const closeEmailBtn = document.getElementById('closeEmailModalBtn');
            const emailOutput = document.getElementById('emailHtmlOutput');
            const copyBtn = document.getElementById('copyEmailBtn');
            const copyFeedback = document.getElementById('copyFeedback');
            const subjectInput = document.getElementById('emailSubjectInput');

            // Auto-subject default
            const DEFAULT_SUBJECT = '📜 Our BDSM Play Contract – Deep & Honey';

            function getEmailHTML() {
                // Grab the contract content from the page and wrap it in a clean HTML email template
                const contractContent = document.querySelector('.contract-content');
                const clone = contractContent.cloneNode(true);
                // Remove any editable fields (they don't work well in email) — but we keep them as text
                // Also remove print button, email button, etc.
                // We'll generate a simplified version

                // Get the main title and subhead
                const titleEl = clone.querySelector('.title-group h1');
                const subheadEl = clone.querySelector('.title-group .subhead');
                const logoImg = clone.querySelector('.logo-img');

                // Build email body manually for a clean, styled version
                // We'll extract all sections and rebuild with inline styles for email compatibility

                // Get all sections
                const sections = clone.querySelectorAll('.section');
                let sectionsHTML = '';
                sections.forEach(section => {
                    sectionsHTML += section.outerHTML;
                });

                // Get footer
                const footer = clone.querySelector('.footer-note');
                const footerHTML = footer ? footer.outerHTML : '';

                // Build email HTML
                return `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Our BDSM Play Contract – Deep & Honey</title>
                    <style>
                        body { font-family: 'Georgia', serif; background: #faf6f8; color: #1a1a1a; padding: 30px; max-width: 800px; margin: 0 auto; }
                        .contract-email { background: #ffffff; padding: 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
                        h1, h2, h3, h4 { font-family: 'Georgia', serif; color: #2a1a24; }
                        .main-header { border-bottom: 2px solid #2a1a24; padding-bottom: 12px; margin-bottom: 20px; }
                        .main-header h1 { font-size: 28px; margin-bottom: 4px; }
                        .subhead { color: #555; font-size: 14px; }
                        .section { margin-top: 24px; padding-top: 20px; border-top: 1px solid #ddd; }
                        .section-title { font-size: 20px; font-weight: 600; color: #2a1a24; margin-bottom: 12px; }
                        .card-rule { background: #f8f4f6; border-left: 3px solid #9f6a80; padding: 10px 18px; margin: 8px 0; border-radius: 0 8px 8px 0; }
                        .card-rule strong { color: #2a1a24; }
                        .highlight { background: #f0e6ea; padding: 2px 8px; border-radius: 20px; }
                        .badge { display: inline-block; background: #ddd; padding: 2px 12px; border-radius: 30px; font-size: 12px; font-weight: 600; margin-right: 6px; }
                        .grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 8px 0; }
                        .rule-item { background: #f5f0f2; padding: 8px 14px; border-radius: 8px; border: 1px solid #eee; }
                        .signature-block { background: #f5f0f2; border-radius: 12px; padding: 16px 20px; margin-top: 20px; border: 1px solid #ddd; display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-between; }
                        .signature-line { min-width: 160px; }
                        .signature-line .line { border-bottom: 2px solid #aaa; width: 160px; height: 28px; margin-top: 4px; }
                        .final-note { font-style: italic; color: #2a1a24; border-top: 1px solid #ddd; margin-top: 20px; padding-top: 18px; text-align: center; font-size: 16px; }
                        .footer-note { margin-top: 28px; padding-top: 16px; border-top: 1px solid #ddd; text-align: center; font-size: 14px; color: #666; }
                        .toy-table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 8px 0; }
                        .toy-table td, .toy-table th { padding: 6px 10px; border: 1px solid #ddd; }
                        .toy-table th { background: #eee; color: #1a1a1a; text-align: left; }
                        .rule-table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 8px 0; }
                        .rule-table td, .rule-table th { padding: 6px 10px; border: 1px solid #ddd; vertical-align: top; }
                        .rule-table th { background: #eee; color: #1a1a1a; text-align: left; }
                        .inline-check { display: inline-block; margin: 0 4px; }
                        .editable-field { border-bottom: 1px dashed #aaa; padding: 0 4px; background: #f8f4f6; font-family: inherit; font-size: inherit; }
                        .small-meta { color: #777; font-size: 13px; }
                        .fa-heart { color: #c47a9a; }
                        .fa, .fas, .far { font-family: 'Font Awesome 6 Free'; font-weight: 400; }
                        .logo-img { max-height: 70px; width: auto; border-radius: 8px; border: 1px solid #ddd; padding: 4px; background: #fff; }
                        .header-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
                        .print-btn, .email-btn { display: none; }
                        .section-title i { color: #9f6a80; margin-right: 8px; }
                        @media (max-width: 600px) { .grid-2col { grid-template-columns: 1fr; } body { padding: 10px; } .contract-email { padding: 16px; } .signature-block { flex-direction: column; } }
                        .check-group { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
                        .check-group label { display: flex; align-items: center; gap: 4px; font-size: 13px; }
                        input[type="checkbox"] { accent-color: #9f6a80; width: 14px; height: 14px; }
                    </style>
                </head>
                <body>
                    <div class="contract-email">
                        <div class="main-header">
                            <div>
                                <h1>THE DYNAMIC {BDSM} PLAY CONTRACT</h1>
                                <div class="subhead">
                                    <strong>Deep</strong> (Dominant / Top) & <strong>Honey</strong> (Submissive / Bottom) &nbsp;·&nbsp; 30th July, 2026 · ♾️ INFINITY
                                </div>
                            </div>
                        </div>
                        ${sectionsHTML}
                        ${footerHTML}
                    </div>
                </body>
                </html>
                `;
            }

            function generateAndShowEmail() {
                const html = getEmailHTML();
                emailOutput.value = html;
                emailModal.classList.add('active');
            }

            openEmailBtn.addEventListener('click', generateAndShowEmail);

            closeEmailBtn.addEventListener('click', function() {
                emailModal.classList.remove('active');
                copyFeedback.textContent = '';
            });

            emailModal.addEventListener('click', function(e) {
                if (e.target === emailModal) {
                    emailModal.classList.remove('active');
                    copyFeedback.textContent = '';
                }
            });

            copyBtn.addEventListener('click', function() {
                const text = emailOutput.value;
                navigator.clipboard.writeText(text).then(() => {
                    copyFeedback.textContent = '✅ Copied to clipboard! Paste it into your email editor.';
                    copyFeedback.style.color = '#c481a0';
                    setTimeout(() => { copyFeedback.textContent = ''; }, 4000);
                }).catch(() => {
                    // Fallback
                    emailOutput.select();
                    document.execCommand('copy');
                    copyFeedback.textContent = '✅ Copied! Paste it into your email editor.';
                    copyFeedback.style.color = '#c481a0';
                    setTimeout(() => { copyFeedback.textContent = ''; }, 4000);
                });
            });

            // Subject input auto-fill
            subjectInput.value = DEFAULT_SUBJECT;

            // Also include subject in the email HTML via a meta or hidden note
            // The subject is already in the modal, but we'll also add it as a comment in the HTML
            // The user will copy the HTML and paste it into an email editor — the subject is separate.
            // But we also add a note in the HTML itself.
            // Actually we already have it in the subject line above.

            // When generating email, we could also add a subject line meta but it's fine.

        })();
