// ═══════════════════════════════════════════════════════════════
//  LearNova — Teacher Dashboard Data (Supabase)
//  Loads: teacher's courses, enrolled student count, recent students
//  Requires: supabase.js + auth-guard.js loaded before this file
// ═══════════════════════════════════════════════════════════════

(async function initTeacherPlatform() {
    // Wait for auth-guard to set LN_USER
    await new Promise(function (r) {
        if (window.LN_USER) return r();
        var t = setInterval(function () { if (window.LN_USER) { clearInterval(t); r(); } }, 50);
        setTimeout(function () { clearInterval(t); r(); }, 5000);
    });

    var userId = window.LN_USER && window.LN_USER.id;
    if (!userId) return;

    var path = window.location.pathname;

    // ── Global Loaders ──────────────────────────────────────────── 
    injectCreateCourseModal();
    var courses = await fetchTeacherCourses(userId);
    updateGlobalStats(courses);

    // ── Page Specific Loaders ─────────────────────────────────────
    if (path.includes('teacher.html')) {
        renderDashboard(courses, userId);
    } else if (path.includes('teacher-courses.html')) {
        renderCourseManagement(courses);
    } else if (path.includes('teacher-students.html')) {
        renderStudentManagement(courses);
    } else if (path.includes('teacher-sessions.html')) {
        renderSessions();
    } else if (path.includes('teacher-revenue.html')) {
        renderRevenue(courses);
    } else if (path.includes('teacher-curriculum.html')) {
        renderCurriculumManager();
    }

    // ── Core Data Fetchers ────────────────────────────────────────
    async function fetchTeacherCourses(uid) {
        var result = await supabaseClient
            .from('courses')
            .select('*')
            .eq('instructor_id', uid)
            .order('created_at', { ascending: false });
        if (result.error) console.error('Course fetch error:', result.error);
        return result.data || [];
    }

    // ── Renderers ──────────────────────────────────────────────────
    function renderDashboard(courses, uid) {
        renderCourseRowList(courses.slice(0, 3), 'teacher-course-list');
        fetchRecentEnrollments(courses.map(function (c) { return c.id; }));
    }

    function renderCourseManagement(courses) {
        renderCourseRowList(courses, 'courses-container');
    }

    function renderCourseRowList(courses, containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;

        if (courses.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:var(--sp-8);color:var(--txt-muted)"><p>No courses yet. Click "+ New Course" to create one!</p></div>';
            return;
        }

        container.innerHTML = courses.map(function (c) {
            var thumbHtml = c.thumbnail_url
                ? '<div class="course-row-thumb" style="background-image:url(\'' + c.thumbnail_url + '\');background-size:cover;background-position:center"></div>'
                : '<div class="course-row-thumb" style="background:' + (c.thumbnail_bg || 'var(--grad-primary)') + ';display:flex;align-items:center;justify-content:center;font-size:2rem">' + (c.thumbnail_emoji || '📚') + '</div>';

            var statusClass = c.is_published ? 'badge-green' : 'badge-amber';
            var statusText = c.is_published ? '✅ Published' : '⏸ Draft';
            var pubBtnClass = c.is_published ? 'btn-ghost' : 'btn-emerald';
            var pubBtnText = c.is_published ? '📦 Unpublish' : '🚀 Publish';

            return '<div class="course-row" id="course-row-' + c.id + '">' +
                thumbHtml +
                '<div class="course-row-info">' +
                '<div class="course-row-title">' + c.title + '</div>' +
                '<div class="course-row-meta" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
                '<span id="status-badge-' + c.id + '" class="badge ' + statusClass + '">' + statusText + '</span>' +
                '<span style="color:var(--txt-muted)">' + c.category + '</span>' +
                '<span style="color:var(--txt-muted)">· ' + (c.modules_count || 0) + ' modules</span>' +
                '</div>' +
                '</div>' +
                '<div class="course-row-stat"><strong>' + ((c.students_count || 0).toLocaleString()) + '</strong><span>enrolled</span></div>' +
                '<div class="course-row-actions" style="gap:6px">' +
                '<button id="pub-btn-' + c.id + '" class="btn btn-xs ' + pubBtnClass + '" onclick="toggleCoursePublish(\'' + c.id + '\',' + c.is_published + ')">' + pubBtnText + '</button>' +
                '<a href="teacher-curriculum.html?course=' + c.id + '" class="btn btn-primary btn-xs">✏️ Curriculum</a>' +
                '<button class="btn btn-ghost btn-xs" style="color:var(--clr-red)" onclick="deleteCourse(\'' + c.id + '\')">🗑</button>' +
                '</div>' +
                '</div>';
        }).join('');
    }

    async function fetchRecentEnrollments(courseIds) {
        if (!courseIds.length) return;
        var result = await supabaseClient
            .from('enrollments')
            .select('progress_pct, courses(title), profiles(full_name)')
            .in('course_id', courseIds)
            .order('enrolled_at', { ascending: false })
            .limit(5);

        var list = document.getElementById('recent-students-list');
        if (list && result.data) {
            list.innerHTML = result.data.map(function (e) {
                return '<div class="student-row">' +
                    '<div class="avatar avatar-xs" style="background:var(--grad-primary)">' + getInitials(e.profiles && e.profiles.full_name) + '</div>' +
                    '<div style="flex:1">' +
                    '<div class="student-name" style="font-size:12px">' + (e.profiles && e.profiles.full_name) + '</div>' +
                    '<div class="student-course" style="font-size:10px">' + (e.courses && e.courses.title && e.courses.title.split('—')[0]) + '</div>' +
                    '</div>' +
                    '<div class="student-progress">' + e.progress_pct + '%</div>' +
                    '</div>';
            }).join('');
        }
    }

    async function renderStudentManagement(courses) {
        var courseIds = courses.map(function (c) { return c.id; });
        if (!courseIds.length) return;

        var result = await supabaseClient
            .from('enrollments')
            .select('progress_pct, enrolled_at, last_accessed, courses(title), profiles(full_name)')
            .in('course_id', courseIds)
            .order('last_accessed', { ascending: false });

        var tbody = document.getElementById('students-tbody');
        if (tbody && result.data) {
            tbody.innerHTML = result.data.map(function (e) {
                return '<tr>' +
                    '<td><div class="student-cell">' +
                    '<div class="avatar avatar-sm" style="background:var(--grad-primary)">' + getInitials(e.profiles && e.profiles.full_name) + '</div>' +
                    '<div><strong>' + (e.profiles && e.profiles.full_name) + '</strong>' +
                    '<div style="font-size:10px;color:var(--txt-muted)">' + (e.profiles && e.profiles.email) + '</div></div>' +
                    '</div></td>' +
                    '<td>' + (e.courses && e.courses.title && e.courses.title.split('—')[0]) + '</td>' +
                    '<td><div style="display:flex;align-items:center;gap:8px">' +
                    '<div class="progress-bar-sm"><div class="progress-fill-sm" style="width:' + e.progress_pct + '%"></div></div>' +
                    '<span style="font-weight:700">' + e.progress_pct + '%</span>' +
                    '</div></td>' +
                    '<td>' + new Date(e.last_accessed).toLocaleDateString() + '</td>' +
                    '<td><button class="btn btn-ghost btn-xs">Message</button></td>' +
                    '</tr>';
            }).join('');
        }
    }

    function updateGlobalStats(courses) {
        var totalStudents = courses.reduce(function (acc, c) { return acc + (c.students_count || 0); }, 0);
        var avgRating = courses.length ? (courses.reduce(function (acc, c) { return acc + (c.rating || 0); }, 0) / courses.length).toFixed(1) : '—';

        function setVal(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
        setVal('stat-students', totalStudents.toLocaleString());
        setVal('stat-courses', courses.length);
        setVal('stat-rating', avgRating);
    }

    /** ── Helper: Upload to Supabase Storage ──────────────────────── */
    async function uploadToStorage(file, bucket, path) {
        if (!file) return null;
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const fullPath = `${path}/${fileName}`;

        const { data, error } = await supabaseClient.storage
            .from(bucket)
            .upload(fullPath, file);

        if (error) {
            console.error('Upload error:', error);
            throw new Error('Upload failed: ' + error.message);
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
            .from(bucket)
            .getPublicUrl(fullPath);

        return publicUrl;
    }

    function injectCreateCourseModal() {
        if (document.getElementById('create-course-modal')) return;

        var emojis = ['📚', '⚛️', '🤖', '🐍', '🌐', '🎨', '💰', '📊', '🚀', '☁️', '💻', '🧪', '🧠', '🎧', '⚡'];
        var emojiOptions = emojis.map(e => `<span class="emoji-opt" style="cursor:pointer;padding:4px;border-radius:4px;font-size:1.4rem;transition:all .2s" onclick="document.getElementById('cc-emoji').value='${e}';document.getElementById('cc-emoji-preview').textContent='${e}'">${e}</span>`).join('');

        var modalHtml = '<div id="create-course-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;backdrop-filter:blur(4px)" class="ln-overlay"></div>' +
            '<div id="create-course-modal" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1001;width:min(620px,96vw);background:var(--bg-card);border:1px solid var(--bdr-subtle);border-radius:var(--radius-xl);padding:var(--sp-8);box-shadow:var(--shadow-xl);max-height:92vh;overflow-y:auto" class="ln-modal">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-6)">' +
            '<h3 style="margin:0">➕ Create New Course</h3>' +
            '<button id="cc-close" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--txt-muted);line-height:1">&times;</button>' +
            '</div>' +
            '<form id="create-course-form">' +

            // Title and Emoji
            '<div style="display:grid;grid-template-columns:1fr 140px;gap:var(--sp-4);margin-bottom:var(--sp-4);align-items:start">' +
            '<div><label style="display:block;font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-2)">Course Title *</label>' +
            '<input id="cc-title" type="text" required placeholder="e.g. React 18 Masterclass" style="width:100%;padding:var(--sp-3) var(--sp-4);border:1.5px solid var(--bdr-subtle);border-radius:var(--radius-md);background:var(--bg-card-hover);color:var(--txt-primary);font-size:var(--text-sm);outline:none"></div>' +
            '<div style="text-align:center"><label style="display:block;font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-2)">Icon</label>' +
            '<div id="cc-emoji-preview" style="font-size:2.5rem;line-height:1;margin-bottom:8px">📚</div>' +
            '<input id="cc-emoji" type="hidden" value="📚">' +
            '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:2px;background:var(--bg-card-hover);padding:4px;border-radius:8px;border:1px solid var(--bdr-subtle)">' + emojiOptions + '</div>' +
            '</div>' +
            '</div>' +

            '<div style="margin-bottom:var(--sp-4)"><label style="display:block;font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-2)">Description</label>' +
            '<textarea id="cc-desc" rows="2" placeholder="Course details..." style="width:100%;padding:var(--sp-3) var(--sp-4);border:1.5px solid var(--bdr-subtle);border-radius:var(--radius-md);background:var(--bg-card-hover);color:var(--txt-primary);font-size:var(--text-sm);resize:vertical;outline:none"></textarea></div>' +

            // Category and Level
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);margin-bottom:var(--sp-4)">' +
            '<div><label style="display:block;font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-2)">Category *</label>' +
            '<select id="cc-category" style="width:100%;padding:var(--sp-3) var(--sp-4);border:1.5px solid var(--bdr-subtle);border-radius:var(--radius-md);background:var(--bg-card-hover);color:var(--txt-primary);font-size:var(--text-sm);outline:none">' +
            '<option>English</option><option>React</option><option>JavaScript</option><option>Python</option><option>AI/ML</option>' +
            '<option>Cloud</option><option>DevOps</option><option>Design</option><option>Business</option><option>Other</option>' +
            '</select></div>' +
            '<div><label style="display:block;font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-2)">Level *</label>' +
            '<select id="cc-level" style="width:100%;padding:var(--sp-3) var(--sp-4);border:1.5px solid var(--bdr-subtle);border-radius:var(--radius-md);background:var(--bg-card-hover);color:var(--txt-primary);font-size:var(--text-sm);outline:none">' +
            '<option>Beginner</option><option>Intermediate</option><option>Advanced</option>' +
            '</select></div>' +
            '</div>' +

            // File Uploads
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4);margin-bottom:var(--sp-4)">' +
            '<div><label style="display:block;font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-2)">Thumbnail (Optional)</label>' +
            '<div style="position:relative;display:flex;flex-direction:column;gap:8px">' +
            '<input id="cc-thumb-file" type="file" accept="image/*" style="font-size:11px;color:var(--txt-muted)">' +
            '<input id="cc-thumb-url" type="url" placeholder="...or paste Image URL" style="width:100%;padding:8px 12px;border:1px solid var(--bdr-subtle);border-radius:var(--radius-md);background:rgba(0,0,0,.2);color:var(--txt-primary);font-size:12px;outline:none">' +
            '</div></div>' +
            '<div><label style="display:block;font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-2)">Cover Photo (Optional)</label>' +
            '<div style="position:relative;display:flex;flex-direction:column;gap:8px">' +
            '<input id="cc-cover-file" type="file" accept="image/*" style="font-size:11px;color:var(--txt-muted)">' +
            '<input id="cc-cover-url" type="url" placeholder="...or paste Cover URL" style="width:100%;padding:8px 12px;border:1px solid var(--bdr-subtle);border-radius:var(--radius-md);background:rgba(0,0,0,.2);color:var(--txt-primary);font-size:12px;outline:none">' +
            '</div></div>' +
            '</div>' +

            // Price and Meta
            '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-4);margin-bottom:var(--sp-4)">' +
            '<div><label style="display:block;font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-2)">Price ($) *</label>' +
            '<input id="cc-price" type="number" min="0" value="49" required style="width:100%;padding:var(--sp-3) var(--sp-4);border:1.5px solid var(--bdr-subtle);border-radius:var(--radius-md);background:var(--bg-card-hover);color:var(--txt-primary);font-size:var(--text-sm);outline:none"></div>' +
            '<div><label style="display:block;font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-2)">Est. Hours</label>' +
            '<input id="cc-hours" type="number" min="1" value="8" style="width:100%;padding:var(--sp-3) var(--sp-4);border:1.5px solid var(--bdr-subtle);border-radius:var(--radius-md);background:var(--bg-card-hover);color:var(--txt-primary);font-size:var(--text-sm);outline:none"></div>' +
            '<div style="display:flex;flex-direction:column;justify-content:flex-end"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:var(--text-sm);font-weight:600;margin-bottom:var(--sp-3)">' +
            '<input id="cc-publish" type="checkbox" style="width:16px;height:16px;accent-color:var(--clr-electric)"> Publish Now</label></div>' +
            '</div>' +

            '<button type="submit" class="btn btn-emerald" style="width:100%;justify-content:center;height:48px;font-weight:700">Create Course</button>' +
            '<div id="cc-msg" style="margin-top:12px;font-size:12px;text-align:center"></div>' +
            '</form></div>' +
            '<style>' +
            '.ln-modal.open,.ln-overlay.open{display:block!important} ' +
            '.emoji-opt:hover{background:rgba(16,185,129,.15);transform:scale(1.2)}' +
            '</style>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        var overlay = document.getElementById('create-course-overlay');
        var modal = document.getElementById('create-course-modal');
        var closeBtn = document.getElementById('cc-close');
        var form = document.getElementById('create-course-form');
        var msgEl = document.getElementById('cc-msg');
        var emojiInput = document.getElementById('cc-emoji');
        var emojiPreview = document.getElementById('cc-emoji-preview');

        var closeModal = function () { overlay.classList.remove('open'); modal.classList.remove('open'); };
        var openModal = function () { overlay.classList.add('open'); modal.classList.add('open'); };

        closeBtn.onclick = closeModal;
        overlay.onclick = closeModal;
        emojiInput.oninput = function () { emojiPreview.textContent = emojiInput.value || '📚'; };

        document.querySelectorAll('[data-open-create-course]').forEach(function (btn) {
            btn.onclick = function (e) {
                e.preventDefault();
                form.reset();
                msgEl.textContent = '';
                emojiPreview.textContent = '📚';
                openModal();
            };
        });

        form.onsubmit = async function (e) {
            e.preventDefault();
            var btn = form.querySelector('button[type=submit]');
            btn.disabled = true;
            btn.textContent = 'Processing...';
            msgEl.textContent = '';

            try {
                // 1. Handle Uploads
                var thumbFile = document.getElementById('cc-thumb-file').files[0];
                var coverFile = document.getElementById('cc-cover-file').files[0];

                var thumbUrl = document.getElementById('cc-thumb-url').value.trim();
                var coverUrl = document.getElementById('cc-cover-url').value.trim();

                if (thumbFile) {
                    btn.textContent = 'Uploading Thumbnail...';
                    thumbUrl = await uploadToStorage(thumbFile, 'course-media', 'thumbnails');
                }
                if (coverFile) {
                    btn.textContent = 'Uploading Cover...';
                    coverUrl = await uploadToStorage(coverFile, 'course-media', 'covers');
                }

                // 2. Prepare Course Data
                var badgeMap = {
                    English: 'badge-indigo', React: 'badge-blue', 'AI/ML': 'badge-purple',
                    Python: 'badge-green', Cloud: 'badge-amber', DevOps: 'badge-blue',
                    JavaScript: 'badge-blue', Design: 'badge-purple', Business: 'badge-amber', Other: 'badge-blue'
                };

                var category = document.getElementById('cc-category').value;
                var teacherName = window.LN_NAME || 'Instructor';
                var shouldPublish = document.getElementById('cc-publish') && document.getElementById('cc-publish').checked;

                btn.textContent = 'Saving Course...';
                var result = await supabaseClient.from('courses').insert({
                    title: document.getElementById('cc-title').value.trim(),
                    description: document.getElementById('cc-desc').value.trim(),
                    instructor_id: userId,
                    instructor_name: teacherName,
                    category: category,
                    thumbnail_emoji: document.getElementById('cc-emoji').value.trim() || '📚',
                    thumbnail_url: thumbUrl || null,
                    cover_url: coverUrl || null,
                    thumbnail_bg: 'linear-gradient(135deg,#0A1F44,#1E3A8A)',
                    badge_color: badgeMap[category] || 'badge-blue',
                    price: parseFloat(document.getElementById('cc-price').value) || 0,
                    modules_count: 0,
                    duration_hours: parseInt(document.getElementById('cc-hours').value) || 8,
                    level: document.getElementById('cc-level').value,
                    is_published: shouldPublish
                });

                btn.disabled = false;
                btn.textContent = 'Create Course';

                if (result.error) throw result.error;

                msgEl.style.color = '#10B981';
                msgEl.textContent = '✓ Course created! ' + (shouldPublish ? 'It is now live.' : 'Go to Curriculum to add modules.');
                setTimeout(function () { closeModal(); window.location.reload(); }, 1500);

            } catch (err) {
                console.error('Final create error:', err);
                btn.disabled = false;
                btn.textContent = 'Create Course';
                msgEl.style.color = '#EF4444';
                msgEl.textContent = 'Error: ' + err.message;
            }
        };
    }

    async function renderSessions() {
        var list = document.getElementById('sessions-list');
        if (!list) return;
        list.innerHTML =
            '<div class="session-item">' +
            '<div class="session-time"><strong>3:00</strong><span>PM Today</span></div>' +
            '<div class="session-details"><h4>React Architecture Deep Dive</h4><p>👤 Maria S. · 1-on-1 · 60 min</p></div>' +
            '<button class="btn btn-primary btn-xs">Launch Zoom</button>' +
            '</div>' +
            '<div class="session-item">' +
            '<div class="session-time" style="background:var(--grad-purple)"><strong>10:00</strong><span>AM Tomorrow</span></div>' +
            '<div class="session-details"><h4>Design Patterns for JS</h4><p>👥 Group Session · 5 Students · 90 min</p></div>' +
            '<button class="btn btn-secondary btn-xs">Prep Materials</button>' +
            '</div>';
    }

    async function renderRevenue(courses) {
        var totalEarnings = courses.reduce(function (acc, c) { return acc + ((c.students_count || 0) * (c.price || 0) * 0.7); }, 0);
        var payoutEl = document.querySelector('.payout-card h2');
        if (payoutEl) payoutEl.textContent = '$' + totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function renderCurriculumManager() {
        // teacher-curriculum.html handles its own initialization inline
    }

    // ── Management Actions ─────────────────────────────────────────
    window.deleteCourse = async function (id) {
        if (!confirm('Are you sure you want to delete this course? This cannot be undone.')) return;
        var result = await supabaseClient.from('courses').delete().eq('id', id);
        if (result.error) {
            alert('Error deleting course: ' + result.error.message);
        } else {
            window.location.reload();
        }
    };

    window.editCourse = function (id) {
        window.location.href = 'teacher-curriculum.html?course=' + id;
    };

    window.toggleCoursePublish = async function (courseId, currentlyPublished) {
        var btn = document.getElementById('pub-btn-' + courseId);
        var badge = document.getElementById('status-badge-' + courseId);
        if (btn) { btn.disabled = true; btn.textContent = '…'; }

        var newStatus = !currentlyPublished;
        var result = await supabaseClient
            .from('courses').update({ is_published: newStatus }).eq('id', courseId);

        if (result.error) {
            alert('Failed to update: ' + result.error.message);
            if (btn) { btn.disabled = false; btn.textContent = currentlyPublished ? '📦 Unpublish' : '🚀 Publish'; }
        } else {
            if (badge) {
                badge.textContent = newStatus ? '✅ Published' : '⏸ Draft';
                badge.className = 'badge ' + (newStatus ? 'badge-green' : 'badge-amber');
            }
            if (btn) {
                btn.disabled = false;
                btn.textContent = newStatus ? '📦 Unpublish' : '🚀 Publish';
                btn.className = 'btn btn-xs ' + (newStatus ? 'btn-ghost' : 'btn-emerald');
                btn.setAttribute('onclick', "toggleCoursePublish('" + courseId + "'," + newStatus + ")");
            }
        }
    };

}());
