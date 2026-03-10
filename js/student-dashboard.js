// ═══════════════════════════════════════════════════════════════
//  LearNova — Student Dashboard  (fully real data version)
//  Features: courses, XP, level, certificates, achievements,
//            course-progress overview, leaderboard, recommendations
// ═══════════════════════════════════════════════════════════════

(async function loadStudentDashboard() {
  // Wait for auth-guard to finish
  await new Promise(r => {
    if (window.LN_USER) return r();
    const t = setInterval(() => { if (window.LN_USER) { clearInterval(t); r(); } }, 50);
    setTimeout(() => { clearInterval(t); r(); }, 5000);
  });

  const userId = window.LN_USER?.id;
  if (!userId) return;

  // Dynamic greeting
  const hour = new Date().getHours();
  const tod = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const greetEl = document.querySelector('.dash-welcome h1');
  if (greetEl) {
    greetEl.innerHTML = `Good ${tod}, <span data-user-name>${window.LN_NAME || 'Learner'}</span> 👋`;
  }
  const subEl = document.querySelector('.dash-welcome p');
  if (subEl) subEl.textContent = 'Track your progress, earn XP, and keep learning every day.';

  await Promise.all([
    loadEnrollments(),
    loadXpAndProfile(),
    loadLeaderboard(),
  ]);

  // ──────────────────────────────────────────────────────────────
  async function loadEnrollments() {
    const { data: enrollments } = await supabaseClient
      .from('enrollments')
      .select(`
        id, progress_pct, current_module, last_accessed,
        courses (
          id, title, instructor_name, thumbnail_emoji, thumbnail_bg,
          badge_color, category, modules_count, duration_hours, rating, price, original_price, students_count
        )
      `)
      .eq('student_id', userId)
      .order('last_accessed', { ascending: false });

    const list = enrollments || [];
    const completed = list.filter(e => e.progress_pct >= 100);

    // ── Stat: Courses Active ─────────────────────────────────────
    const el = id => document.getElementById(id);
    if (el('stat-courses')) el('stat-courses').textContent = list.length;
    if (el('stat-courses-change')) el('stat-courses-change').textContent = list.length > 0 ? `${list.length} enrolled` : 'Enroll in your first course';

    // ── Stat: Hours Learned ──────────────────────────────────────
    const hours = list.reduce((s, e) =>
      s + Math.round((e.progress_pct / 100) * (e.courses?.duration_hours ?? 0)), 0);
    if (el('stat-hours')) el('stat-hours').textContent = hours + 'h';

    // ── Stat: Certificates ───────────────────────────────────────
    if (el('stat-certs')) el('stat-certs').textContent = completed.length;
    if (el('stat-certs-change')) el('stat-certs-change').textContent =
      completed.length > 0 ? `${completed.length} course${completed.length > 1 ? 's' : ''} completed!` : 'Complete a course to earn';

    // ── Continue Learning ────────────────────────────────────────
    const continueWrap = el('continue-learning-list');
    if (continueWrap) {
      if (list.length === 0) {
        continueWrap.innerHTML = `
          <div style="text-align:center;padding:var(--sp-8);color:var(--txt-muted)">
            <div style="font-size:3rem;margin-bottom:var(--sp-3)">📚</div>
            <p style="margin-bottom:var(--sp-4);font-size:var(--text-sm)">No courses yet. Start learning today!</p>
            <a href="index.html#courses" class="btn btn-primary btn-sm">Browse Courses →</a>
          </div>`;
      } else {
        continueWrap.innerHTML = list.map(e => {
          const c = e.courses;
          const pct = e.progress_pct;
          const barClass = pct >= 100 ? 'green' : pct >= 40 ? '' : 'purple';
          const isDone = pct >= 100;
          return `
            <div class="course-progress-card">
              <div class="course-thumb" style="background:${c.thumbnail_bg}">${c.thumbnail_emoji}</div>
              <div class="course-progress-info">
                <div class="course-progress-title">${c.title}</div>
                <div class="course-progress-meta">👤 ${c.instructor_name} · Module ${e.current_module} of ${c.modules_count}</div>
                <div class="progress-wrap" style="margin-top:var(--sp-2)">
                  <div class="progress-bar ${barClass}" style="--progress:${pct}%"></div>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:var(--sp-2)">
                <div class="course-progress-pct">${pct}%</div>
                ${isDone
              ? `<span style="font-size:11px;color:var(--clr-emerald);font-weight:700">🏆 Complete!</span>`
              : `<a href="course-reader.html?course=${c.id}&module=${e.current_module}"
                        class="btn btn-primary btn-sm"
                        style="white-space:nowrap;font-size:11px;padding:4px 10px;text-decoration:none">▶ Continue</a>`}
                <button onclick="openProgressModal('${e.id}','${c.title.replace(/'/g, "\\'")}',${pct},${c.modules_count})"
                  style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--txt-muted);padding:0">Update %</button>
              </div>
            </div>`;
        }).join('');
      }
    }

    // ── My Course Progress Overview panel ────────────────────────
    const progressWrap = el('course-progress-overview');
    if (progressWrap) {
      if (list.length === 0) {
        progressWrap.innerHTML = `<p style="color:var(--txt-muted);font-size:var(--text-sm);padding:var(--sp-4) 0">Enroll in a course to see your progress here.</p>`;
      } else {
        progressWrap.innerHTML = list.map(e => {
          const c = e.courses;
          const pct = e.progress_pct;
          const col = pct >= 100 ? 'var(--clr-emerald)' : pct >= 50 ? 'var(--clr-electric)' : 'var(--clr-amber)';
          return `
            <div style="display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-3) 0;border-bottom:1px solid var(--bdr-subtle)">
              <div style="font-size:1.8rem;width:40px;text-align:center">${c.thumbnail_emoji}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:var(--text-sm);font-weight:600;color:var(--txt-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.title}</div>
                <div style="display:flex;align-items:center;gap:var(--sp-2);margin-top:var(--sp-1)">
                  <div style="flex:1;height:6px;background:var(--bdr-subtle);border-radius:999px;overflow:hidden">
                    <div style="height:100%;width:${pct}%;background:${col};border-radius:999px;transition:width .4s ease"></div>
                  </div>
                  <span style="font-size:var(--text-xs);font-weight:700;color:${col};min-width:34px;text-align:right">${pct}%</span>
                </div>
                <div style="font-size:11px;color:var(--txt-muted);margin-top:2px">Module ${e.current_module}/${c.modules_count} · Last studied ${formatRelativeTime(e.last_accessed)}</div>
              </div>
              ${pct < 100
              ? `<a href="course-reader.html?course=${c.id}&module=${e.current_module}"
                      style="font-size:11px;color:var(--clr-electric);text-decoration:none;white-space:nowrap;font-weight:600">▶ Resume</a>`
              : `<span style="font-size:11px;color:var(--clr-emerald);font-weight:700">✓ Done</span>`}
            </div>`;
        }).join('');
      }
    }

    // ── Catalog & Recommendations ────────────────────────────────
    const { data: catalog } = await supabaseClient
      .from('courses')
      .select('id, title, instructor_name, thumbnail_emoji, thumbnail_url, thumbnail_bg, badge_color, category, rating, price, original_price, students_count')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    const recWrap = el('recommended-list');
    if (recWrap && catalog) {
      const enrolledIds = new Set(list.map(e => e.courses?.id));
      const recs = catalog.filter(c => !enrolledIds.has(c.id)).slice(0, 2);
      if (recs.length === 0) {
        recWrap.innerHTML = `<p style="color:var(--txt-muted);font-size:var(--text-sm)">You're enrolled in all available courses! 🎉</p>`;
      } else {
        recWrap.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4)">` +
          recs.map(c => `
            <div class="course-card" onclick="window.location='course-reader.html?course=${c.id}'" style="cursor:pointer">
              <div class="course-card-thumb" style="${c.thumbnail_url ? `background-image:url('${c.thumbnail_url}');background-size:cover;background-position:center;` : `background:${c.thumbnail_bg};`}height:130px">
                ${c.thumbnail_url ? '' : c.thumbnail_emoji}
                <span class="category-badge badge ${c.badge_color}" style="position:absolute;top:10px;left:10px">${c.category}</span>
              </div>
              <div class="course-card-body">
                <div class="course-card-title">${c.title}</div>
                <div class="course-card-meta" style="margin-top:var(--sp-2)">
                  <div class="course-rating">⭐ ${c.rating}</div>
                  <div class="course-price">$${c.price}${c.original_price ? ` <span class="original">$${c.original_price}</span>` : ''}</div>
                </div>
                <button onclick="enrollInCourse('${c.id}')" class="btn btn-primary btn-sm" style="margin-top:var(--sp-3);width:100%;justify-content:center">Enroll Now</button>
              </div>
            </div>`).join('') + `</div>`;
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  async function loadXpAndProfile() {
    const { data: profile } = await supabaseClient
      .from('profiles').select('xp, full_name, role').eq('id', userId).single();

    const xp = profile?.xp ?? 0;
    const XP_PER_LEVEL = 500;
    const level = Math.floor(xp / XP_PER_LEVEL) + 1;
    const xpInLevel = xp % XP_PER_LEVEL;
    const pct = Math.round((xpInLevel / XP_PER_LEVEL) * 100);
    const toNext = XP_PER_LEVEL - xpInLevel;
    const tier = level <= 3 ? 'Beginner' : level <= 8 ? 'Intermediate' : level <= 15 ? 'Advanced' : 'Expert';
    const role = profile?.role === 'teacher' ? 'Instructor' : 'Student';

    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };

    // XP stat card
    if (document.getElementById('stat-xp')) {
      document.getElementById('stat-xp').textContent = xp.toLocaleString();
      const xpChange = document.getElementById('stat-xp-change');
      if (xpChange) xpChange.textContent = `Level ${level} — ${tier}`;
    }

    // XP ring
    set('xp-value', xp.toLocaleString());
    set('xp-level', `Level ${level} — ${tier}`);
    set('xp-to-next', `${toNext} XP to Level ${level + 1}`);
    set('xp-pct-label', pct + '%');
    set('xp-lvl-current', `Level ${level}`);
    set('xp-lvl-next', `Level ${level + 1}`);
    const bar = document.getElementById('xp-bar');
    if (bar) bar.style.setProperty('--progress', pct + '%');

    // Update conic gradient on XP ring
    const ring = document.querySelector('.xp-ring');
    if (ring) ring.style.background =
      `conic-gradient(var(--clr-electric) 0% ${pct}%, var(--bdr-subtle) ${pct}% 100%)`;

    // Sidebar level label
    set('sidebar-level-label', `${role} · Level ${level}`);

    // Achievements — real earned badges based on XP and level
    loadAchievements(xp, level);
  }

  // ──────────────────────────────────────────────────────────────
  function loadAchievements(xp, level) {
    const ALL_BADGES = [
      { emoji: '🌱', label: 'First Step', earned: xp >= 1, tip: 'Earned your first XP' },
      { emoji: '🚀', label: 'Fast Learner', earned: xp >= 100, tip: 'Reached 100 XP' },
      { emoji: '📚', label: 'Bookworm', earned: xp >= 250, tip: 'Reached 250 XP' },
      { emoji: '⚡', label: 'Energized', earned: xp >= 500, tip: 'Reached Level 2' },
      { emoji: '🔥', label: 'On Fire', earned: xp >= 1000, tip: 'Reached 1,000 XP' },
      { emoji: '💡', label: 'Enlightened', earned: xp >= 2000, tip: 'Reached 2,000 XP' },
      { emoji: '🌟', label: 'Star Learner', earned: level >= 10, tip: 'Reached Level 10' },
      { emoji: '💎', label: 'Diamond', earned: level >= 15, tip: 'Reached Level 15' },
      { emoji: '👑', label: 'Legend', earned: level >= 20, tip: 'Reached Level 20' },
    ];

    const earned = ALL_BADGES.filter(b => b.earned);
    const locked = ALL_BADGES.filter(b => !b.earned);
    const badgeCount = document.getElementById('badge-count');
    if (badgeCount) badgeCount.textContent = `${earned.length}/${ALL_BADGES.length} earned`;

    const grid = document.getElementById('badges-grid');
    if (!grid) return;
    grid.innerHTML = [
      ...earned.map(b => `
        <div class="badge-item earned" title="${b.tip}">
          <span class="bi">${b.emoji}</span>
          <span>${b.label}</span>
        </div>`),
      ...locked.slice(0, 3).map(b => `
        <div class="badge-item" style="opacity:0.3" title="🔒 ${b.tip}">
          <span class="bi">${b.emoji}</span>
          <span>${b.label}</span>
        </div>`),
    ].join('');

    if (earned.length === 0) {
      grid.innerHTML = `<p style="color:var(--txt-muted);font-size:var(--text-sm);padding:var(--sp-2) 0">Complete modules to earn your first badge!</p>`;
    }
  }

  // ──────────────────────────────────────────────────────────────
  async function loadLeaderboard() {
    const lbWrap = document.getElementById('leaderboard-list');
    if (!lbWrap) return;

    const { data: top } = await supabaseClient
      .from('profiles')
      .select('id, full_name, xp')
      .order('xp', { ascending: false })
      .limit(5);

    const myXP = window.LN_PROFILE?.xp ?? 0;
    const medals = ['🥇', '🥈', '🥉'];
    const rankCols = ['rank-1', 'rank-2', 'rank-3'];
    const grads = [
      '135deg,#F59E0B,#EF4444', '135deg,#7C3AED,#4F46E5',
      '135deg,#10B981,#059669', '135deg,#2563EB,#06B6D4',
      '135deg,#EC4899,#8B5CF6',
    ];

    if (!top || top.length === 0) {
      lbWrap.innerHTML = `<p style="color:var(--txt-muted);font-size:var(--text-sm);padding:var(--sp-2) 0">No leaderboard data yet. Complete modules to earn XP!</p>`;
      return;
    }

    let html = top.map((u, i) => {
      const ini = getInitials(u.full_name || 'User');
      const isMe = u.id === userId;
      return `
        <div class="leaderboard-item"${isMe ? ' style="background:rgba(37,99,235,0.07);border-radius:var(--radius-md);margin:0 calc(-1*var(--sp-2));padding:var(--sp-1) var(--sp-2)"' : ''}>
          <div class="leaderboard-rank ${rankCols[i] || ''}">${medals[i] || (i + 1)}</div>
          <div class="avatar avatar-sm" style="background:linear-gradient(${grads[i % grads.length]})">${ini}</div>
          <div class="leaderboard-name">${u.full_name || 'Learner'}${isMe ? ' <span style="color:var(--clr-electric);font-size:10px">(You)</span>' : ''}</div>
          <div class="leaderboard-xp">${(u.xp ?? 0).toLocaleString()} XP</div>
        </div>`;
    }).join('');

    const inTop = top.some(u => u.id === userId);
    if (!inTop) {
      const ini = getInitials(window.LN_NAME || 'You');
      html += `
        <div style="border-top:1px solid var(--bdr-subtle);margin-top:var(--sp-3);padding-top:var(--sp-3)">
          <div class="leaderboard-item" style="background:rgba(37,99,235,0.07);border-radius:var(--radius-md);padding:var(--sp-2) var(--sp-3)">
            <div class="leaderboard-rank" style="color:var(--txt-muted)">—</div>
            <div class="avatar avatar-sm" style="background:var(--grad-primary)">${ini}</div>
            <div class="leaderboard-name">You</div>
            <div class="leaderboard-xp">${myXP.toLocaleString()} XP</div>
          </div>
        </div>`;
    }
    lbWrap.innerHTML = html;
  }

  // ──────────────────────────────────────────────────────────────
  //  Progress update modal
  // ──────────────────────────────────────────────────────────────
  window.openProgressModal = function (enrollmentId, title, currentPct, totalModules) {
    const modal = document.getElementById('progress-modal');
    const overlay = document.getElementById('progress-overlay');
    if (!modal) return;
    document.getElementById('pm-title').textContent = title;
    document.getElementById('pm-slider').value = currentPct;
    document.getElementById('pm-pct-display').textContent = currentPct + '%';
    document.getElementById('pm-enrollment-id').value = enrollmentId;
    document.getElementById('pm-total-modules').value = totalModules;
    updateSliderDisplay(currentPct);
    modal.classList.add('open');
    overlay.classList.add('open');
  };

  window.closeProgressModal = function () {
    document.getElementById('progress-modal')?.classList.remove('open');
    document.getElementById('progress-overlay')?.classList.remove('open');
  };

  document.getElementById('progress-overlay')?.addEventListener('click', window.closeProgressModal);

  const slider = document.getElementById('pm-slider');
  slider?.addEventListener('input', () => updateSliderDisplay(slider.value));

  function updateSliderDisplay(val) {
    const d = document.getElementById('pm-pct-display');
    if (d) d.textContent = val + '%';
  }

  document.getElementById('pm-save')?.addEventListener('click', async () => {
    const enrollmentId = document.getElementById('pm-enrollment-id').value;
    const newPct = parseInt(document.getElementById('pm-slider').value);
    const totalMods = parseInt(document.getElementById('pm-total-modules').value);
    const curMod = Math.max(1, Math.ceil((newPct / 100) * totalMods));
    const btn = document.getElementById('pm-save');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    const { error } = await supabaseClient
      .from('enrollments')
      .update({ progress_pct: newPct, current_module: curMod, last_accessed: new Date().toISOString() })
      .eq('student_id', userId)
      .eq('id', enrollmentId);
    btn.disabled = false;
    btn.textContent = 'Save Progress';
    if (error) { alert('Error: ' + error.message); }
    else { window.closeProgressModal(); window.location.reload(); }
  });

  // ──────────────────────────────────────────────────────────────
  //  Enroll helper
  // ──────────────────────────────────────────────────────────────
  window.enrollInCourse = async function (courseId) {
    const name = window.LN_NAME || window.LN_USER?.email?.split('@')[0] || 'Learner';
    await supabaseClient.from('profiles')
      .upsert({ id: userId, full_name: name, role: 'student', xp: 0 }, { onConflict: 'id', ignoreDuplicates: true });
    const { error } = await supabaseClient.from('enrollments')
      .upsert({ student_id: userId, course_id: courseId, progress_pct: 0, current_module: 1 },
        { onConflict: 'student_id,course_id', ignoreDuplicates: true });
    if (error) { alert('Could not enroll: ' + error.message); }
    else { window.location.reload(); }
  };

  // ──────────────────────────────────────────────────────────────
  //  Helpers
  // ──────────────────────────────────────────────────────────────
  function formatRelativeTime(iso) {
    if (!iso) return 'never';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 2) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return d === 1 ? 'yesterday' : `${d} days ago`;
  }

})();
