// ═══════════════════════════════════════════════════════════════
//  LearNova — Supabase Client
//  Loaded via CDN (UMD build). Exposes window.supabaseClient.
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://rwkdbshnsyelvdgcmxei.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3a2Ric2huc3llbHZkZ2NteGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTIxODIsImV4cCI6MjA4ODU2ODE4Mn0.kWN1ppp1qBvG5lKvUCPw6SYKJIwC-XNyFllmb8M9oYk';

// The CDN script (added before this file in each HTML page) exposes `supabase`
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Helpers ──────────────────────────────────────────────────────

/** Returns the active session, or null */
async function getSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
}

/** Returns the profile row for a given user id */
async function getUserProfile(userId) {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) console.warn('Profile fetch error:', error.message);
    return data || null;
}

/** Creates (or upserts) a profile row right after sign-up */
async function createProfile(userId, fullName, role = 'student') {
    const { error } = await supabaseClient
        .from('profiles')
        .upsert({ id: userId, full_name: fullName, role }, { onConflict: 'id' });
    if (error) console.warn('Profile create error:', error.message);
}

/** Initials helper — "Jane Doe" → "JD" */
function getInitials(name = '') {
    return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}
