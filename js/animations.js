// ── LEARNOVA ANIMATIONS ─────────────────────────────

// Scroll-reveal with IntersectionObserver
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

const initReveal = () => {
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
        revealObserver.observe(el);
    });
};

// Animated Number Counter
const animateCounter = (el) => {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        el.textContent = prefix + Math.floor(current).toLocaleString() + suffix;
    }, 16);
};

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const initCounters = () => {
    document.querySelectorAll('[data-counter]').forEach(el => counterObserver.observe(el));
};

// Sticky Nav on scroll
const initStickyNav = () => {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
};

// Mobile nav toggle
const initMobileNav = () => {
    const burger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    if (!burger || !mobileMenu) return;
    burger.addEventListener('click', () => {
        const open = mobileMenu.classList.toggle('open');
        burger.querySelectorAll('span').forEach((s, i) => {
            s.style.transform = open
                ? [i === 0 ? 'rotate(45deg) translate(5px,5px)' : i === 2 ? 'rotate(-45deg) translate(5px,-5px)' : 'scaleX(0)'][0]
                : '';
        });
        // simpler toggle
        if (open) {
            burger.children[0].style.transform = 'rotate(45deg) translate(5px,5px)';
            burger.children[1].style.opacity = '0';
            burger.children[2].style.transform = 'rotate(-45deg) translate(5px,-5px)';
        } else {
            burger.children[0].style.transform = '';
            burger.children[1].style.opacity = '';
            burger.children[2].style.transform = '';
        }
    });
};

// Progress bars animated via CSS var
const initProgressBars = () => {
    document.querySelectorAll('.progress-bar[data-progress]').forEach(bar => {
        bar.style.setProperty('--progress', bar.dataset.progress + '%');
    });
};

document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    initCounters();
    initStickyNav();
    initMobileNav();
    initProgressBars();
});
