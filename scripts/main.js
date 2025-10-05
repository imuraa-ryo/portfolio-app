const header = document.querySelector('.site-header');
const navToggle = document.querySelector('[data-nav-toggle]');
const primaryNav = document.getElementById('primary-navigation');

if (header && navToggle && primaryNav) {
  const closeNav = () => {
    header.setAttribute('data-nav-open', 'false');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  const openNav = () => {
    header.setAttribute('data-nav-open', 'true');
    navToggle.setAttribute('aria-expanded', 'true');
  };

  navToggle.addEventListener('click', () => {
    const isOpen = header.getAttribute('data-nav-open') === 'true';
    if (isOpen) {
      closeNav();
    } else {
      openNav();
    }
  });

  primaryNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      closeNav();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeNav();
    }
  });
}

const contactForm = document.getElementById('contact-form');

if (contactForm) {
  const statusEl = contactForm.querySelector('.form-status');
  const submitButton = contactForm.querySelector('[data-contact-submit]');
  let endpoint = contactForm.getAttribute('data-endpoint') || '/api/contact';

  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    const fallbackEndpoint = contactForm.getAttribute('data-dev-endpoint');
    if (fallbackEndpoint) {
      endpoint = fallbackEndpoint;
    }
  }

  const setStatus = (type, message) => {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.classList.remove('is-success', 'is-error');
    if (type) {
      statusEl.classList.add(type);
    }
  };

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!contactForm.reportValidity()) {
      return;
    }

    const formData = new FormData(contactForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.classList.add('is-loading');
      }
      setStatus(null, '送信しています…');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.message || '送信に失敗しました。時間をおいて再度お試しください。');
      }

      contactForm.reset();
      setStatus('is-success', '送信が完了しました。担当者より折り返しご連絡いたします。');
    } catch (error) {
      setStatus('is-error', error.message);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.classList.remove('is-loading');
      }
    }
  });
}
