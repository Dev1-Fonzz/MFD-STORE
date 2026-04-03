// assets/js/utils.js

// 💰 Format Currency (MYR)
export const formatMYR = (amount) => {
  return new Intl.NumberFormat('ms-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2
  }).format(amount || 0);
};

// 🕐 Format Timestamp
export const formatDateTime = (timestamp) => {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('ms-MY', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

// 🎨 Status Badge Class
export const getStatusClass = (status) => {
  const map = {
    'Active': 'active',
    'Public': 'active', 
    'Completed': 'active',
    'Verified': 'active',
    'Pending': 'warning',
    'To Pay': 'warning',
    'To Ship': 'warning',
    'Private': 'warning',
    'Blocked': 'danger',
    'Blacklisted': 'danger',
    'Cancelled': 'danger',
    'Deleted': 'danger'
  };
  return map[status] || 'secondary';
};

// 📱 Responsive Table Helper
export const initResponsiveTables = () => {
  document.querySelectorAll('.table-wrapper').forEach(wrapper => {
    wrapper.addEventListener('scroll', (e) => {
      // Add shadow effects for scroll indication
      if (e.target.scrollLeft > 0) {
        wrapper.classList.add('scrolled-left');
      } else {
        wrapper.classList.remove('scrolled-left');
      }
      if (e.target.scrollLeft + e.target.clientWidth < e.target.scrollWidth) {
        wrapper.classList.add('scrolled-right');
      } else {
        wrapper.classList.remove('scrolled-right');
      }
    });
  });
};

// 🔍 Debounce Search
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// 📤 Copy to Clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return { success: true };
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return { success: true };
  }
};
