// ═══════════════════════════════════════════════════════════════
//  LearNova — Profile Page Logic
//  Handles: load profile, avatar upload, save form
// ═══════════════════════════════════════════════════════════════

(async function initProfile() {
    await waitForAuth();
    const userId = window.LN_USER?.id;
    if (!userId) return;

    // ── Load profile + stats ──────────────────────────────────────
    const [{ data: profile }, { data: enrollments }] = await Promise.all([
        supabaseClient.from('profiles').select('*').eq('id', userId).single(),
        supabaseClient.from('enrollments').select('id, progress_pct').eq('student_id', userId),
    ]);

    if (profile) {
        const xp = profile.xp ?? 0;
        const XP_PER_LEVEL = 500;
        const level = Math.floor(xp / XP_PER_LEVEL) + 1;
        const tier = level <= 3 ? 'Beginner' : level <= 8 ? 'Intermediate' : level <= 15 ? 'Advanced' : 'Expert';

        // Populate sidebar level
        const sbl = document.getElementById('sidebar-level-label');
        if (sbl) sbl.textContent = `${profile.role === 'teacher' ? 'Instructor' : 'Student'} · Level ${level}`;

        // Sidebar avatar image
        if (profile.avatar_url) {
            const sbAv = document.getElementById('sb-avatar');
            if (sbAv) { sbAv.style.backgroundImage = `url(${profile.avatar_url})`; sbAv.textContent = ''; }
        }

        // Stats card
        const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        set('ps-xp', xp.toLocaleString() + ' XP');
        set('ps-level', `Lv.${level}`);
        set('ps-courses', (enrollments?.length ?? 0).toString());
        const certs = enrollments?.filter(e => e.progress_pct >= 100).length ?? 0;
        set('ps-certs', certs.toString());

        // Member since
        if (profile.created_at) {
            const d = new Date(profile.created_at);
            set('ps-member-since', `Member since ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
        }

        // Headline display
        const dh = document.getElementById('display-headline');
        if (dh) dh.textContent = profile.headline || `${tier} Learner at LearNova`;

        // Fill form fields
        const val = (id, v) => { const e = document.getElementById(id); if (e) e.value = v || ''; };
        val('f-name', profile.full_name);
        val('f-phone', profile.phone);
        val('f-headline', profile.headline);
        val('f-bio', profile.bio);
        val('f-website', profile.website);
        val('f-github', profile.social_links?.github || '');
        val('f-linkedin', profile.social_links?.linkedin || '');
        val('f-twitter', profile.social_links?.twitter || '');

        // Avatar preview
        if (profile.avatar_url) {
            const prev = document.getElementById('avatar-preview');
            if (prev) { prev.style.backgroundImage = `url(${profile.avatar_url})`; prev.textContent = ''; }
        }
    }

    // ── Avatar upload ─────────────────────────────────────────────
    document.getElementById('avatar-input')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('File too large (max 5 MB)', 'error'); return; }

        // Local preview immediately
        const reader = new FileReader();
        reader.onload = (ev) => {
            const prev = document.getElementById('avatar-preview');
            if (prev) { prev.style.backgroundImage = `url(${ev.target.result})`; prev.textContent = ''; }
            const sbAv = document.getElementById('sb-avatar');
            if (sbAv) { sbAv.style.backgroundImage = `url(${ev.target.result})`; sbAv.textContent = ''; }
        };
        reader.readAsDataURL(file);

        // Upload to Supabase Storage
        const spinner = document.getElementById('avatar-spinner');
        if (spinner) spinner.style.display = 'flex';
        const ext = file.name.split('.').pop().toLowerCase();
        const path = `${userId}/avatar.${ext}`;
        const { error: upErr } = await supabaseClient.storage.from('avatars').upload(path, file, { upsert: true });

        if (upErr) {
            showToast('Upload failed: ' + upErr.message, 'error');
        } else {
            const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(path);
            const avatarUrl = urlData.publicUrl + '?t=' + Date.now();
            await supabaseClient.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
            showToast('Avatar updated ✅', 'success');
        }
        if (spinner) spinner.style.display = 'none';
    });

    // ── Save profile form ─────────────────────────────────────────
    document.getElementById('profile-form')?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const btn = document.getElementById('save-btn');
        btn.disabled = true; btn.textContent = 'Saving…';

        const fullName = document.getElementById('f-name').value.trim();
        const headline = document.getElementById('f-headline').value.trim();
        const bio = document.getElementById('f-bio').value.trim();
        const phone = document.getElementById('f-phone').value.trim();
        const website = document.getElementById('f-website').value.trim();
        const github = document.getElementById('f-github').value.trim();
        const linkedin = document.getElementById('f-linkedin').value.trim();
        const twitter = document.getElementById('f-twitter').value.trim();

        const { error } = await supabaseClient.from('profiles').upsert({
            id: userId,
            full_name: fullName,
            headline,
            bio,
            phone,
            website,
            social_links: { github, linkedin, twitter },
        }, { onConflict: 'id' });

        btn.disabled = false; btn.textContent = '💾 Save Changes';

        if (error) {
            showToast('Error: ' + error.message, 'error');
        } else {
            // Update displayed name in the page
            document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = fullName);
            const dh = document.getElementById('display-headline');
            if (dh) dh.textContent = headline || 'Learner at LearNova';
            showToast('Profile saved ✅', 'success');
        }
    });

    // ── Helpers ───────────────────────────────────────────────────
    function waitForAuth() {
        return new Promise(r => {
            if (window.LN_USER) return r();
            const t = setInterval(() => { if (window.LN_USER) { clearInterval(t); r(); } }, 50);
            setTimeout(() => { clearInterval(t); r(); }, 5000);
        });
    }

    function showToast(msg, type = 'success') {
        const t = document.getElementById('toast');
        if (!t) return;
        t.textContent = msg;
        t.className = `toast ${type} show`;
        setTimeout(() => t.classList.remove('show'), 3000);
    }
})();
