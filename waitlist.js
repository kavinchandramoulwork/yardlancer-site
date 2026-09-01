// Pre-launch email capture -- posts straight to Supabase's REST API using
// the same public/anon key already embedded in the Yardlancer app itself
// (it's the "publishable" key, meant to be client-side; access is gated
// entirely by the waitlist_signups table's RLS policy + column grant, not
// by keeping this key secret). No SDK, no build step -- one fetch call.
(function () {
  const SUPABASE_URL = 'https://dcdataelskcllrrdbqbb.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable__eDMRXVx-ZOOKehbfGC0-A_dMngY9Ti';

  const form = document.getElementById('waitlist-form');
  if (!form) return;

  const status = document.getElementById('waitlist-status');
  const emailInput = document.getElementById('waitlist-email');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const button = form.querySelector('button');
    button.disabled = true;
    status.hidden = false;
    status.classList.remove('waitlist-status-error');
    status.textContent = 'Submitting…';

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/waitlist_signups`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ email: emailInput.value.trim() }),
      });

      if (response.ok) {
        form.querySelector('.waitlist-row').hidden = true;
        form.querySelector('.waitlist-label').hidden = true;
        status.textContent = "Thanks — we'll let you know when Yardlancer's live.";
      } else {
        status.textContent = "That didn't go through — double-check the email address and try again.";
        status.classList.add('waitlist-status-error');
        button.disabled = false;
      }
    } catch (err) {
      status.textContent = 'Something went wrong — try again in a moment.';
      status.classList.add('waitlist-status-error');
      button.disabled = false;
    }
  });
})();
