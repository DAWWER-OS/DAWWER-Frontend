/**
 * Deprecated: Standalone admin login has been unified into login.html.
 * Any incoming traffic is cleanly redirected to login.html.
 */
(function () {
  'use strict';
  if (typeof window !== 'undefined' && window.location) {
    const target = (window.location.protocol === 'file:') ? 'login.html' : '/login.html';
    window.location.replace(target);
  }
})();
