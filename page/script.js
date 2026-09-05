const SIMULATOR_URL = "https://automata-lab-sim.vercel.app/simulator";

document.addEventListener('DOMContentLoaded', () => {
  // Defensive Lenis Initialization
  let lenis;
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  } else {
    console.warn("Lenis scroll library failed to load. Falling back to native scrolling.");
  }

  // Smooth scroll for anchor links using Lenis or fallback
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        if (lenis) {
          lenis.scrollTo(target, { offset: -68 }); // Offset for sticky header
        } else {
          window.scrollTo({
            top: target.offsetTop - 68,
            behavior: 'smooth'
          });
        }
      }
    });
  });

  // Dynamic live fetch for Latest GitHub Release assets
  async function fetchLatestReleaseDetails() {
    try {
      const response = await fetch('https://api.github.com/repos/reeshavsinha/AutomataLab/releases/latest');
      if (!response.ok) return;
      const data = await response.json();

      const assets = data?.assets || [];
      const versionTag = data?.tag_name || 'latest';

      // Update version tag elements dynamically
      ['dl-win-ver', 'dl-deb-ver', 'dl-mac-ver'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = 'v' + versionTag.replace(/^v/, '');
      });

      // Map assets to columns dynamically
      assets.forEach(asset => {
        if (!asset?.name) return;
        const name = asset.name.toLowerCase();
        const sizeMB = (asset.size / (1024 * 1024)).toFixed(1);
        const url = asset.browser_download_url;

        if (name.endsWith('.exe') || name.endsWith('setup.exe')) {
          const btn = document.getElementById('dl-win-btn');
          if (btn) {
            btn.setAttribute('href', url);
            btn.textContent = `Download .exe (${sizeMB} MB)`;
          }
        } else if (name.endsWith('.deb')) {
          const btn = document.getElementById('dl-deb-btn');
          if (btn) {
            btn.setAttribute('href', url);
            btn.textContent = `Download .deb (${sizeMB} MB)`;
          }
        } else if (name.endsWith('.dmg')) {
          const btn = document.getElementById('dl-mac-btn');
          if (btn) {
            btn.setAttribute('href', url);
            btn.textContent = `Download .dmg (${sizeMB} MB)`;
          }
        }
      });

      // Extract and update SHA256 checksums from release notes body (if present)
      const bodyText = data?.body || '';
      if (bodyText) {
        const lines = bodyText.split('\n');
        let winSha = '', debSha = '', macSha = '';

        lines.forEach(line => {
          const match = line.match(/\b([a-fA-F0-9]{64})\b/);
          if (match) {
            const sha = match[1];
            const lowerLine = line.toLowerCase();
            if (lowerLine.includes('win') || lowerLine.includes('.exe') || lowerLine.includes('setup')) {
              winSha = sha;
            } else if (lowerLine.includes('deb') || lowerLine.includes('linux') || lowerLine.includes('ubuntu') || lowerLine.includes('.deb')) {
              debSha = sha;
            } else if (lowerLine.includes('mac') || lowerLine.includes('dmg') || lowerLine.includes('darwin') || lowerLine.includes('.dmg')) {
              macSha = sha;
            }
          }
        });

        if (winSha) {
          const winShaEl = document.getElementById('dl-win-sha');
          if (winShaEl) winShaEl.textContent = `SHA256: ${winSha}`;
        }
        if (debSha) {
          const debShaEl = document.getElementById('dl-deb-sha');
          if (debShaEl) debShaEl.textContent = `SHA256: ${debSha}`;
        }
        if (macSha) {
          const macShaEl = document.getElementById('dl-mac-sha');
          if (macShaEl) macShaEl.textContent = `SHA256: ${macSha}`;
        }
      }
    } catch (err) {
      console.warn('Failed to dynamically fetch latest release:', err);
    }
  }

  fetchLatestReleaseDetails();

  // Ambient Glow Parallax (stays centered, bulges towards cursor)
  const glow = document.querySelector('.lp-ambient-glow');
  if (glow) {
    document.addEventListener('mousemove', (e) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      
      // Pull 5% towards the cursor for full screen aurora
      const moveX = `${deltaX * 0.05}px`;
      const moveY = `${deltaY * 0.05}px`;
      
      glow.style.transform = `translate(${moveX}, ${moveY})`;
    });
  }

  // Spotlight Glow on Cards
  const grids = document.querySelectorAll('.lp-features-grid, .lp-docs-grid, .lp-downloads-grid');
  grids.forEach(grid => {
    grid.addEventListener('mousemove', (e) => {
      const cards = grid.querySelectorAll('.lp-feature-item, .lp-doc-item, .lp-download-item');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });
  });

  // Scroll Spy for Navigation Links
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.lp-nav-link');

  if (sections.length > 0 && navLinks.length > 0 && typeof IntersectionObserver !== 'undefined') {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(link => {
            link.classList.remove('lp-nav-active');
            if (link.getAttribute('href') === `#${entry.target.id}`) {
              link.classList.add('lp-nav-active');
            }
          });
        }
      });
    }, observerOptions);

    sections.forEach(section => {
      observer.observe(section);
    });
  }

  // Scroll Animation for Items
  const animatedItems = document.querySelectorAll('.lp-feature-item, .lp-doc-item, .lp-download-item, .lp-stat-item, .lp-section-header');
  if (animatedItems.length > 0 && typeof IntersectionObserver !== 'undefined') {
    const animationObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    }, { threshold: 0.1 });

    animatedItems.forEach(item => animationObserver.observe(item));
  }

  // Interactive Demo Logic
  const demoContainer = document.querySelector('.lp-demo-container');
  const demoOverlay = document.getElementById('demo-overlay');
  const demoExitBtn = document.getElementById('demo-exit-btn');
  const demoLaunchBtnIcon = document.getElementById('demo-launch-btn-icon');

  if (SIMULATOR_URL === null) {
    // Hide buttons until simulator receives its deployment
    if (demoExitBtn) demoExitBtn.style.display = 'none';
    if (demoOverlay) {
      demoOverlay.style.pointerEvents = 'none';
      if (demoLaunchBtnIcon) demoLaunchBtnIcon.style.display = 'none';
      const overlayText = demoOverlay.querySelector('.lp-demo-overlay-text');
      if (overlayText) overlayText.textContent = "Interactive Demo Coming Soon";
    }
  } else {
    if (demoExitBtn) demoExitBtn.setAttribute('href', SIMULATOR_URL + '?demo=true');
    
    if (demoOverlay && demoContainer && demoExitBtn) {
      demoOverlay.addEventListener('click', (e) => {
        e.preventDefault();
        window.open(SIMULATOR_URL + '?demo=true', '_blank', 'noopener,noreferrer');
      });
    }
  }

  // Initialize Download Accordions
  const accordions = document.querySelectorAll('.lp-download-accordion');
  accordions.forEach(acc => {
    const summary = acc.querySelector('.lp-accordion-summary');
    if (summary) {
      summary.addEventListener('click', () => {
        const isOpen = acc.classList.contains('open');
        
        // Close all other accordions
        accordions.forEach(other => other.classList.remove('open'));
        
        if (!isOpen) {
          acc.classList.add('open');
        }
      });
    }
  });

  // Copy to Clipboard logic for SHA256 hashes
  const copyBtns = document.querySelectorAll('.lp-copy-btn');
  copyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        const textToCopy = targetEl.textContent.replace('SHA256:', '').trim();
        navigator.clipboard.writeText(textToCopy).then(() => {
          // Temporarily show Copied! text
          const originalHTML = btn.innerHTML;
          btn.innerHTML = '<span style="color: #a6e22e; font-size: 0.75rem; font-family: \'JetBrains Mono\', monospace; font-weight: 600; padding: 0 4px;">Copied!</span>';
          setTimeout(() => {
            btn.innerHTML = originalHTML;
          }, 2000);
        }).catch(err => {
          console.error('Failed to copy text: ', err);
        });
      }
    });
  });
});
