// ── LEARNOVA UI INTERACTIONS ─────────────────────────

// ── Page Transitions ─────────────────────────────────
const initPageTransitions = () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.35s ease';
    requestAnimationFrame(() => { document.body.style.opacity = '1'; });
    document.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('http') || link.target === '_blank') return;
        link.addEventListener('click', e => {
            e.preventDefault();
            document.body.style.opacity = '0';
            setTimeout(() => { window.location.href = href; }, 320);
        });
    });
};

// ── Active Nav Link ───────────────────────────────────
const initActiveNav = () => {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.split('#')[0] === page) {
            link.style.color = 'var(--clr-electric)';
            link.style.fontWeight = '700';
        }
    });
};

// ── Toast Notification System ─────────────────────────
let _toastTimer;
const showToast = (type, msg, duration = 4000) => {
    let el = document.getElementById('ln-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'ln-toast';
        el.style.cssText = `
            position:fixed; bottom:28px; left:50%; transform:translateX(-50%) translateY(100px);
            background:#0F172A; color:#fff; padding:14px 22px; border-radius:14px;
            font-size:14px; font-weight:500; box-shadow:0 20px 60px rgba(0,0,0,0.4);
            z-index:9999; display:flex; align-items:center; gap:10px;
            transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
            border:1px solid rgba(255,255,255,0.1); white-space:nowrap; pointer-events:none;
        `;
        document.body.appendChild(el);
    }
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { el.style.transform = 'translateX(-50%) translateY(100px)'; }, duration);
};
window.showToast = showToast;

// ── Search Overlay ────────────────────────────────────
const initSearch = () => {
    const searchBtn = document.getElementById('nav-search-btn');
    if (!searchBtn) return;
    const overlay = document.createElement('div');
    overlay.id = 'search-overlay';
    overlay.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px);
        z-index:9000; display:flex; align-items:flex-start; justify-content:center;
        padding-top:80px; opacity:0; pointer-events:none;
        transition:opacity 0.25s ease;
    `;
    overlay.innerHTML = `
        <div style="width:100%;max-width:640px;padding:0 20px">
            <div style="background:var(--bg-card);border-radius:16px;padding:20px;box-shadow:0 40px 80px rgba(0,0,0,0.4);border:1px solid var(--bdr-subtle)">
                <div style="display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--bdr-subtle);padding-bottom:16px;margin-bottom:16px">
                    <span style="font-size:20px;opacity:0.5">🔍</span>
                    <input id="search-input-overlay" type="text" placeholder="Search courses, paths, mentors…"
                        style="flex:1;background:none;border:none;outline:none;font-size:16px;color:var(--txt-primary);font-family:inherit" />
                    <kbd style="background:var(--bg-card-hover);padding:2px 8px;border-radius:6px;font-size:11px;color:var(--txt-muted);border:1px solid var(--bdr-strong)">ESC</kbd>
                </div>
                <div>
                    <div style="font-size:12px;font-weight:700;color:var(--txt-muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">Popular Searches</div>
                    ${['React & Next.js', 'Machine Learning', 'Python Bootcamp', 'AWS Certification', 'UI/UX Design'].map(s => `
                    <div onclick="document.getElementById('search-input-overlay').value='${s}'" style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;cursor:pointer;transition:background .15s" onmouseover="this.style.background='var(--bg-card-hover)'" onmouseout="this.style.background=''">
                        <span>🔍</span><span style="font-size:14px;color:var(--txt-primary)">${s}</span>
                    </div>`).join('')}
                </div>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    const openSearch = () => { overlay.style.opacity = '1'; overlay.style.pointerEvents = 'all'; setTimeout(() => document.getElementById('search-input-overlay')?.focus(), 50); };
    const closeSearch = () => { overlay.style.opacity = '0'; overlay.style.pointerEvents = 'none'; };
    searchBtn.addEventListener('click', openSearch);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeSearch();
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
    });
};

// ── Notification Bell ─────────────────────────────────
const initNotifications = () => {
    const bell = document.getElementById('notif-bell');
    if (!bell) return;
    const panel = document.createElement('div');
    panel.id = 'notif-panel';
    panel.style.cssText = `
        position:absolute; top:calc(100% + 8px); right:0; width:340px;
        background:var(--bg-card); border:1px solid var(--bdr-subtle);
        border-radius:16px; box-shadow:var(--shadow-xl); z-index:500;
        display:none; overflow:hidden; animation:fadeIn 0.2s ease;
    `;
    const notifs = [
        { icon: '🎉', title: 'Streak milestone!', desc: "You've hit a 21-day learning streak!", time: 'Just now', unread: true },
        { icon: '👤', title: 'New mentor available', desc: 'Sarah Rahman has open slots this week', time: '1h ago', unread: true },
        { icon: '📊', title: 'Weekly report ready', desc: 'You improved 23% in React this week', time: '3h ago', unread: true },
        { icon: '🏆', title: 'Certificate earned', desc: 'React Fundamentals certificate is ready', time: 'Yesterday', unread: false },
        { icon: '💬', title: 'Community reply', desc: 'Your question received 5 new answers', time: '2d ago', unread: false },
    ];
    panel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--bdr-subtle)">
            <h4 style="margin:0;font-size:15px">Notifications</h4>
            <button onclick="document.querySelectorAll('.notif-dot').forEach(d=>d.remove());document.getElementById('notif-badge').style.display='none'" style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--txt-accent);font-weight:600;font-family:inherit">Mark all read</button>
        </div>
        ${notifs.map(n => `
            <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 20px;border-bottom:1px solid var(--bdr-subtle);cursor:pointer;transition:background .15s;${n.unread ? 'background:rgba(37,99,235,0.04)' : ''}" onmouseover="this.style.background='var(--bg-card-hover)'" onmouseout="this.style.background='${n.unread ? 'rgba(37,99,235,0.04)' : ''}'">
                <div style="width:38px;height:38px;background:var(--bg-card-hover);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${n.icon}</div>
                <div style="flex:1;min-width:0">
                    <div style="font-size:13px;font-weight:700;color:var(--txt-primary)">${n.title}${n.unread ? '<span class="notif-dot" style="display:inline-block;width:6px;height:6px;background:var(--clr-electric);border-radius:50%;margin-left:6px;vertical-align:middle"></span>' : ''}</div>
                    <div style="font-size:12px;color:var(--txt-muted);margin-top:2px">${n.desc}</div>
                    <div style="font-size:11px;color:var(--txt-muted);margin-top:4px">${n.time}</div>
                </div>
            </div>`).join('')}
        <div style="padding:12px 20px;text-align:center"><a href="#" style="font-size:13px;color:var(--txt-accent);font-weight:600">View all notifications →</a></div>`;
    bell.style.position = 'relative';
    bell.appendChild(panel);

    const unreadCount = notifs.filter(n => n.unread).length;
    const badge = document.createElement('span');
    badge.id = 'notif-badge';
    badge.style.cssText = `position:absolute;top:-2px;right:-2px;width:16px;height:16px;background:#EF4444;border-radius:50%;font-size:9px;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;border:2px solid var(--bg-page)`;
    badge.textContent = unreadCount;
    bell.appendChild(badge);

    let panelOpen = false;
    bell.addEventListener('click', e => { if (e.target.closest('#notif-panel')) return; panelOpen = !panelOpen; panel.style.display = panelOpen ? 'block' : 'none'; });
    document.addEventListener('click', e => { if (!bell.contains(e.target)) { panelOpen = false; panel.style.display = 'none'; } });
};

// ── Tabs ──────────────────────────────────────────────
const initTabs = (scope = document) => {
    scope.querySelectorAll('.tabs').forEach(tabGroup => {
        tabGroup.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                const parent = btn.closest('[data-tabs-parent]') || document;
                parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                parent.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const panel = parent.querySelector(`[data-panel="${target}"]`);
                if (panel) panel.classList.add('active');
            });
        });
        const firstBtn = tabGroup.querySelector('.tab-btn');
        if (firstBtn && !tabGroup.querySelector('.tab-btn.active')) firstBtn.click();
    });
};

// ── AI Chat Widget ────────────────────────────────────
const initAIWidget = () => {
    const btn = document.getElementById('ai-toggle');
    const chat = document.getElementById('ai-chat');
    const form = document.getElementById('ai-form');
    const input = document.getElementById('ai-input');
    const msgs = document.getElementById('ai-messages');
    if (!btn || !chat) return;

    const botReplies = [
        "Great question! I can help you find the best learning path for your goals. 🎯",
        "Based on your progress, I recommend the JavaScript Advanced course next.",
        "You're on a 21-day streak! Keep it up — consistency is key 🔥",
        "I've generated a quiz for today's topic. Ready to test yourself?",
        "Your weekly report is ready. You improved 23% in Python this week! 📈",
        "I just analyzed your weaknesses — let's focus on async/await patterns today.",
    ];
    let replyIdx = 0;

    const addMessage = (text, type) => {
        const msg = document.createElement('div');
        msg.className = `chat-msg ${type}`;
        msg.style.cssText = type === 'user'
            ? 'background:var(--grad-primary);color:#fff;align-self:flex-end;margin-left:auto;padding:10px 14px;border-radius:12px 12px 2px 12px;max-width:80%'
            : 'background:var(--bg-card-hover);color:var(--txt-primary);align-self:flex-start;padding:10px 14px;border-radius:12px 12px 12px 2px;max-width:80%';
        msg.textContent = text;
        msgs.appendChild(msg);
        msgs.scrollTop = msgs.scrollHeight;
    };

    btn.addEventListener('click', () => chat.classList.toggle('open'));

    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;
            addMessage(text, 'user');
            input.value = '';
            const typing = document.createElement('div');
            typing.style.cssText = 'color:var(--txt-muted);font-size:12px;align-self:flex-start;padding:8px';
            typing.textContent = 'Nova is typing…';
            msgs.appendChild(typing);
            msgs.scrollTop = msgs.scrollHeight;
            setTimeout(() => {
                typing.remove();
                addMessage(botReplies[replyIdx % botReplies.length], 'bot');
                replyIdx++;
            }, 900);
        });
    }
};

// ── Testimonials Carousel ─────────────────────────────
const initCarousel = () => {
    const track = document.querySelector('.carousel-track');
    if (!track) return;
    const slides = track.querySelectorAll('.carousel-slide');
    const dotsWrap = document.querySelector('.carousel-dots');
    const prevBtn = document.querySelector('.carousel-btn.prev');
    const nextBtn = document.querySelector('.carousel-btn.next');
    let current = 0;
    const visibleAt = () => window.innerWidth <= 768 ? 1 : 2;

    const dots = Array.from({ length: Math.ceil(slides.length / visibleAt()) }, (_, i) => {
        const d = document.createElement('div');
        d.className = 'dot-indicator' + (i === 0 ? ' active' : '');
        d.addEventListener('click', () => goTo(i));
        return d;
    });
    if (dotsWrap) dots.forEach(d => dotsWrap.appendChild(d));

    const update = () => {
        const visible = visibleAt();
        const maxIdx = Math.max(0, Math.ceil(slides.length / visible) - 1);
        current = Math.min(current, maxIdx);
        const offset = current * (100 / visible) * visible;
        track.style.transform = `translateX(-${offset}%)`;
        dots.forEach((d, i) => d.classList.toggle('active', i === current));
    };
    const goTo = idx => { current = idx; update(); };
    const next = () => { current = (current + 1) % Math.ceil(slides.length / visibleAt()); update(); };
    const prev = () => { current = (current - 1 + Math.ceil(slides.length / visibleAt())) % Math.ceil(slides.length / visibleAt()); update(); };

    if (nextBtn) nextBtn.addEventListener('click', next);
    if (prevBtn) prevBtn.addEventListener('click', prev);

    // Touch swipe
    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    });

    let autoplay = setInterval(next, 5500);
    track.addEventListener('mouseenter', () => clearInterval(autoplay));
    track.addEventListener('mouseleave', () => { autoplay = setInterval(next, 5500); });
    window.addEventListener('resize', update);
};

// ── Pricing Toggle (with animation) ──────────────────
const initPricingToggle = () => {
    const monthlyBtn = document.getElementById('monthly-btn');
    const annualBtn = document.getElementById('annual-btn');
    const prices = document.querySelectorAll('[data-monthly]');
    if (!monthlyBtn || !annualBtn) return;

    const setPricing = (type) => {
        const isAnnual = type === 'annual';
        monthlyBtn.classList.toggle('active', !isAnnual);
        annualBtn.classList.toggle('active', isAnnual);
        prices.forEach(el => {
            el.style.transition = 'all 0.2s ease';
            el.style.transform = 'scale(0.8)';
            el.style.opacity = '0';
            setTimeout(() => {
                el.textContent = isAnnual ? el.dataset.annual : el.dataset.monthly;
                el.style.transform = 'scale(1)';
                el.style.opacity = '1';
            }, 180);
        });
        const saveTag = document.querySelector('.annual-save');
        if (saveTag) saveTag.style.display = isAnnual ? 'inline-flex' : 'none';
    };

    monthlyBtn.addEventListener('click', () => setPricing('monthly'));
    annualBtn.addEventListener('click', () => setPricing('annual'));
    setPricing('monthly');
};

// ── Canvas Line Chart ─────────────────────────────────
const drawLineChart = (canvasId, labels, data, color = '#2563EB') => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth; const H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;
    const pad = { top: 20, right: 20, bottom: 30, left: 44 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const max = Math.max(...data) * 1.2;
    const xStep = chartW / (data.length - 1);
    const yScale = v => pad.top + chartH - (v / max) * chartH;
    const isDark = document.documentElement.dataset.theme === 'dark';

    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (chartH / 4) * i;
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
        ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'right';
        ctx.fillText('$' + Math.round(max * (4 - i) / 4 / 100) * 100, pad.left - 4, y + 4);
    }
    const gradient = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
    gradient.addColorStop(0, color + '50'); gradient.addColorStop(1, color + '00');
    ctx.beginPath(); ctx.moveTo(pad.left, yScale(data[0]));
    data.forEach((v, i) => ctx.lineTo(pad.left + i * xStep, yScale(v)));
    ctx.lineTo(pad.left + (data.length - 1) * xStep, H - pad.bottom);
    ctx.lineTo(pad.left, H - pad.bottom); ctx.closePath();
    ctx.fillStyle = gradient; ctx.fill();
    ctx.beginPath(); ctx.moveTo(pad.left, yScale(data[0]));
    data.forEach((v, i) => ctx.lineTo(pad.left + i * xStep, yScale(v)));
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
    data.forEach((v, i) => {
        ctx.beginPath(); ctx.arc(pad.left + i * xStep, yScale(v), 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
    });
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
    ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'center';
    labels.forEach((l, i) => ctx.fillText(l, pad.left + i * xStep, H - 6));
};

// ── Canvas Bar Chart ──────────────────────────────────
const drawBarChart = (canvasId, labels, data, color = '#10B981') => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth; const H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;
    const pad = { top: 24, right: 20, bottom: 30, left: 44 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const max = Math.max(...data) * 1.2;
    const barW = (chartW / data.length) * 0.55;
    const gap = chartW / data.length;
    const isDark = document.documentElement.dataset.theme === 'dark';

    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (chartH / 4) * i;
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    }
    data.forEach((v, i) => {
        const barH = (v / max) * chartH;
        const x = pad.left + i * gap + (gap - barW) / 2;
        const y = pad.top + chartH - barH;
        const grad = ctx.createLinearGradient(0, y, 0, pad.top + chartH);
        grad.addColorStop(0, color); grad.addColorStop(1, color + '60');
        ctx.fillStyle = grad;
        const r = 4; ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + barW - r, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
        ctx.lineTo(x + barW, pad.top + chartH); ctx.lineTo(x, pad.top + chartH);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.fill();
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
        ctx.font = 'bold 11px Inter,sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(v + 'm', x + barW / 2, y - 5);
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
        ctx.font = '11px Inter,sans-serif';
        ctx.fillText(labels[i], x + barW / 2, H - 6);
    });
};

// ── Course Filter ─────────────────────────────────────
const initCourseFilter = () => {
    const filterWrap = document.getElementById('course-filter');
    if (!filterWrap) return;
    filterWrap.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            filterWrap.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.dataset.cat;
            document.querySelectorAll('.course-card[data-cat]').forEach(card => {
                const show = cat === 'all' || card.dataset.cat === cat;
                card.style.transition = 'opacity 0.25s, transform 0.25s';
                if (show) { card.style.display = ''; requestAnimationFrame(() => { card.style.opacity = '1'; card.style.transform = 'scale(1)'; }); }
                else { card.style.opacity = '0'; card.style.transform = 'scale(0.95)'; setTimeout(() => { card.style.display = 'none'; }, 250); }
            });
        });
    });
};

// ── Inline Chat ───────────────────────────────────────
const initInlineChat = () => {
    const form = document.getElementById('inline-chat-form');
    const input = document.getElementById('inline-chat-input');
    const msgs = document.getElementById('inline-chat-msgs');
    if (!form || !input || !msgs) return;
    const replies = [
        "I can help! What topic are you struggling with?",
        "Based on your quiz results, focus on async/await patterns.",
        "Your learning pace is great! I suggest 40 mins/day sessions.",
        "I've created a personalised practice set for you ✏️",
    ];
    let idx = 0;
    const add = (text, type) => {
        const d = document.createElement('div');
        d.className = `chat-msg ${type}`;
        d.textContent = text;
        msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
    };
    form.addEventListener('submit', e => {
        e.preventDefault();
        const t = input.value.trim(); if (!t) return;
        add(t, 'user'); input.value = '';
        setTimeout(() => add(replies[idx++ % replies.length], 'bot'), 700);
    });
};

// ── Mobile menu close on link click ──────────────────
const initMobileMenuClose = () => {
    const mobileMenu = document.querySelector('.mobile-menu');
    const burger = document.querySelector('.hamburger');
    if (!mobileMenu || !burger) return;
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('open');
            burger.children[0].style.transform = '';
            burger.children[1].style.opacity = '';
            burger.children[2].style.transform = '';
        });
    });
};

// ── DOMContentLoaded ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initPageTransitions();
    initActiveNav();
    initTabs();
    initAIWidget();
    initCarousel();
    initPricingToggle();
    initInlineChat();
    initCourseFilter();
    initSearch();
    initNotifications();
    initMobileMenuClose();

    setTimeout(() => {
        drawLineChart('earnings-chart', ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'], [1800, 2400, 2100, 3200, 2800, 4100, 3700, 5200], '#2563EB');
        drawBarChart('activity-chart', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [45, 72, 38, 90, 55, 20, 65], '#10B981');
        drawLineChart('student-chart', ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'], [12, 18, 15, 24, 20, 30], '#7C3AED');
    }, 150);
});
