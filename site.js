// Shared script for every page: header, phone menu, videos and the waitlist
// success state. No library, no build step.
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function markCurrentPage() {
    document.querySelectorAll('.site-nav a, .menu-links a').forEach((link) => {
      if (link.getAttribute('href') === window.location.pathname) {
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  function setUpHeroHeader() {
    const header = document.querySelector('.site-header');
    const hero = document.querySelector('.hero');
    if (!header || !hero) return;

    new IntersectionObserver(
      ([entry]) => header.classList.toggle('is-solid', !entry.isIntersecting),
      { rootMargin: '-52px 0px 0px 0px' }
    ).observe(hero);

    window.addEventListener('scroll', () => hero.classList.add('is-scrolled'), {
      once: true,
      passive: true,
    });
  }

  function setUpMenu() {
    const menu = document.getElementById('menu');
    const openButton = document.querySelector('.menu-button');
    if (!menu || !openButton) return;

    let scrollY = 0;

    const unlockPage = () => {
      if (!document.body.classList.contains('is-locked')) return;
      document.body.classList.remove('is-locked');
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
    };

    const closeMenu = () => {
      if (menu.open) menu.close();
      unlockPage();
    };

    openButton.addEventListener('click', () => {
      scrollY = window.scrollY;
      document.body.style.top = `-${scrollY}px`;
      document.body.classList.add('is-locked');
      menu.showModal();
    });

    // Esc closes a <dialog> by itself, so this catches that path too. The
    // browser returns focus to the menu button either way.
    menu.addEventListener('close', unlockPage);
    menu.querySelector('.menu-close').addEventListener('click', closeMenu);
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  }

  // waitlist.js is left exactly as it is. On success it hides the row, so this
  // watches for that and puts the check mark and our wording in its status line.
  function setUpWaitlistSuccess() {
    const row = document.querySelector('.waitlist-row');
    const status = document.getElementById('waitlist-status');
    if (!row || !status) return;

    new MutationObserver(() => {
      if (!row.hidden) return;
      status.classList.add('is-success');
      status.innerHTML =
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>' +
        "You're on the list.";
    }).observe(row, { attributes: true, attributeFilter: ['hidden'] });
  }

  function setUpVideos() {
    const clips = [...document.querySelectorAll('[data-clip]')];
    if (clips.length === 0) return;

    const isPhone = window.matchMedia('(max-width: 767px)');
    const pageLoaded = new Promise((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve, { once: true });
    });

    const icon = (path) =>
      `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg>`;
    const PAUSE_ICON = icon('M3 2h4v12H3zM9 2h4v12H9z');
    const PLAY_ICON = icon('M4 2l10 6-10 6z');

    const players = clips.map((clip) => {
      const video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'none';
      video.setAttribute('aria-hidden', 'true');
      video.poster = clip.querySelector('img').currentSrc;
      clip.append(video);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'clip-toggle';
      clip.append(button);

      // With reduced motion only the button starts a video, so each one begins
      // as if the visitor had paused it.
      return { clip, video, button, userPaused: reduceMotion, onScreen: false };
    });

    const showState = (player) => {
      const isPaused = player.video.paused;
      player.button.innerHTML = isPaused ? PLAY_ICON : PAUSE_ICON;
      player.button.setAttribute('aria-label', isPaused ? 'Play video' : 'Pause video');
    };

    const play = (player) => {
      players.filter((other) => other !== player).forEach((other) => other.video.pause());
      // Autoplay can be refused, for example in Low Power Mode. The poster
      // stays up and the button offers Play.
      player.video.play().catch(() => showState(player));
    };

    const load = (player) => {
      if (player.video.src) return;
      const name = player.clip.dataset.clip;
      player.video.src = `/assets/hero/${name}-${isPhone.matches ? 'phone' : 'desktop'}.mp4`;
    };

    const nearScreen = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const player = players.find((candidate) => candidate.clip === entry.target);
          pageLoaded.then(() => {
            load(player);
            if (player.onScreen && !player.userPaused) play(player);
          });
          nearScreen.unobserve(entry.target);
        });
      },
      { rootMargin: '100% 0px' }
    );

    const onScreen = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const player = players.find((candidate) => candidate.clip === entry.target);
          player.onScreen = entry.isIntersecting;
          if (!entry.isIntersecting) {
            player.video.pause();
            if (reduceMotion) player.userPaused = true;
          } else if (player.video.src && !player.userPaused) {
            play(player);
          }
        });
      },
      { threshold: 0.25 }
    );

    players.forEach((player) => {
      showState(player);
      player.video.addEventListener('playing', () => player.clip.classList.add('is-playing'));
      player.video.addEventListener('play', () => showState(player));
      player.video.addEventListener('pause', () => showState(player));
      player.button.addEventListener('click', () => {
        load(player);
        player.userPaused = !player.video.paused;
        if (player.userPaused) player.video.pause();
        else play(player);
      });
      // With reduced motion the file isn't fetched until the button asks for it.
      if (!reduceMotion) nearScreen.observe(player.clip);
      onScreen.observe(player.clip);
    });
  }

  // The intro phones on Teens and Neighbors settle in once, as they enter view.
  function setUpEntrances() {
    const items = document.querySelectorAll('.settle');
    if (reduceMotion || items.length === 0) return;

    const seen = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        seen.unobserve(entry.target);
      });
    });
    items.forEach((item) => seen.observe(item));
  }

  // Teens: on wide screens one phone stays pinned while the steps scroll past
  // it. CSS sticky does the pinning, so the browser keeps full control of the
  // scroll; this only swaps the screen. Phones, short screens and reduced
  // motion keep the plain stacked steps, which is also the no-script layout.
  function setUpStory() {
    const story = document.querySelector('.story');
    if (!story || reduceMotion) return;

    const wide = window.matchMedia('(min-width: 768px) and (min-height: 600px)');
    const steps = [...story.querySelectorAll('.story-step')];
    let screens = [];

    const show = (index) => {
      screens.forEach((screen, i) => {
        screen.classList.toggle('is-active', i === index);
        screen.setAttribute('aria-hidden', String(i !== index));
      });
    };

    const buildStage = () => {
      const stage = document.createElement('div');
      stage.className = 'phone story-stage';
      const holder = document.createElement('div');
      holder.className = 'story-screens';
      screens = steps.map((step) => {
        const screen = document.createElement('div');
        screen.className = 'story-screen';
        screen.append(...step.querySelector('.phone').cloneNode(true).childNodes);
        screen.querySelectorAll('img').forEach((img) => {
          img.loading = 'eager';
        });
        holder.append(screen);
        return screen;
      });
      stage.append(holder);
      story.append(stage);
      show(0);

      const centerLine = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) show(steps.indexOf(entry.target));
          });
        },
        { rootMargin: '-50% 0px -50% 0px' }
      );
      steps.forEach((step) => centerLine.observe(step));
    };

    const applyLayout = () => {
      if (wide.matches && screens.length === 0) buildStage();
      story.classList.toggle('is-pinned', wide.matches);
    };

    wide.addEventListener('change', applyLayout);
    applyLayout();
  }

  // <details> opens by itself. Closing has no browser animation, so the answer
  // fades out first. With reduced motion it just closes.
  function setUpQuestions() {
    if (reduceMotion) return;

    document.querySelectorAll('.question').forEach((question) => {
      question.querySelector('summary').addEventListener('click', (event) => {
        if (!question.open) return;
        event.preventDefault();
        question.classList.add('is-closing');
        setTimeout(() => {
          question.classList.remove('is-closing');
          question.open = false;
        }, 250);
      });
    });
  }

  markCurrentPage();
  setUpHeroHeader();
  setUpMenu();
  setUpWaitlistSuccess();
  setUpVideos();
  setUpEntrances();
  setUpStory();
  setUpQuestions();
})();
