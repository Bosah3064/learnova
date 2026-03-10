// ═══════════════════════════════════════════════════════════════
//  LearNova — Auth Guard
//  Include AFTER supabase.js on any protected page.
//  Redirects unauthenticated visitors to login.html and
//  populates user-name / user-avatar elements with real data.
// ═══════════════════════════════════════════════════════════════

(async function authGuard() {
    const session = await getSession();

    if (!session) {
        // Not logged in — send to login page
        window.location.replace('login.html');
        return;
    }

    const user = session.user;
    let profile = await getUserProfile(user.id);

    // ── Ensure profile row always exists ─────────────────────────
    if (!profile) {
        const displayName = user.user_metadata?.full_name
            || user.email?.split('@')[0]
            || 'Learner';
        const role = user.user_metadata?.role || 'student';

        await supabaseClient.from('profiles').upsert(
            { id: user.id, full_name: displayName, role: role, xp: 0 },
            { onConflict: 'id', ignoreDuplicates: true }
        );
        profile = await getUserProfile(user.id);
    }

    const currentRole = profile?.role || 'student';
    const currentPath = window.location.pathname;

    // ── Role-based Redirection (Basic) ──────────────────────────
    if (currentRole === 'teacher' && (currentPath.includes('student.html') || currentPath.includes('community.html') || currentPath.includes('my-courses.html'))) {
        // Teacher on a student page? This is usually fine, but dashboard should sync.
    } else if (currentRole === 'student' && currentPath.includes('teacher.html')) {
        // Student on teacher page? Redirect to student dashboard.
        window.location.replace('student.html');
        return;
    }

    const displayName = profile?.full_name
        || user.user_metadata?.full_name
        || user.email?.split('@')[0]
        || 'Learner';

    const initials = getInitials(displayName);

    // Inject into any element with these IDs/classes
    document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = displayName);
    document.querySelectorAll('[data-user-initials]').forEach(el => el.textContent = initials);
    document.querySelectorAll('[data-user-email]').forEach(el => el.textContent = user.email);

    // ── Avatar image (sidebar & navbar) ─────────────────────────
    if (profile?.avatar_url) {
        const sbAv = document.getElementById('sb-avatar');
        if (sbAv) {
            sbAv.style.backgroundImage = `url(${profile.avatar_url})`;
            sbAv.style.backgroundSize = 'cover';
            sbAv.style.backgroundPosition = 'center';
            sbAv.textContent = '';
        }
        // Also update any nav avatar
        document.querySelectorAll('.nav-actions .avatar').forEach(el => {
            el.style.backgroundImage = `url(${profile.avatar_url})`;
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
            el.textContent = '';
        });
    }

    // Store for other scripts
    window.LN_USER = user;
    window.LN_PROFILE = profile;
    window.LN_NAME = displayName;
    window.LN_INITIALS = initials;
})();

// ── Sign-out helper (called by Sign Out buttons) ─────────────────
async function signOut() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}
