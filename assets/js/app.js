// Modal Toggle
window.openModal = (id) => document.getElementById(id)?.classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id)?.classList.add('hidden');

// Tab Switcher
document.querySelectorAll('.tabs button, .tab[data-tab], .mgmt-tabs .tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target || btn.dataset.tab;
    // Reset siblings
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Show content
    if(target) {
      document.querySelectorAll('.tab-content, .auth-form').forEach(c => c.classList.add('hidden'));
      const targetEl = document.getElementById(target);
      if(targetEl) targetEl.classList.remove('hidden');
    }
  });
});

// Auth Toggle (Vendor)
window.switchAuth = (targetId) => {
  document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
  document.getElementById(targetId)?.classList.remove('hidden');
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.target === targetId));
};

// Filter Toggle (Generic)
document.querySelectorAll('.order-filters .filter').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.parentElement.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Placeholder for Dynamic Data
document.addEventListener('DOMContentLoaded', () => {
  // Gantikan dengan fetch ke Firebase/Supabase/Backend anda
  console.log('UI Ready. Hubungkan ke database untuk populate data.');
});
