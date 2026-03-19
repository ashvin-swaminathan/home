/**
 * main.js — Client-side JS for Ashvin Swaminathan's academic website
 */

(function () {
  'use strict';

  // ── Abstract dropdowns ────────────────────────────────────────────
  function initAbstracts() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.abstract-toggle');
      if (!btn) return;
      var targetId = btn.getAttribute('data-target');
      var content = document.getElementById(targetId);
      if (!content) return;

      var isOpen = btn.classList.contains('open');
      btn.classList.toggle('open');
      content.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(!isOpen));

      if (isOpen) {
        content.style.maxHeight = '0';
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  }

  // ── Mobile navigation ─────────────────────────────────────────────
  function initMobileNav() {
    var menuBtn = document.querySelector('.menu-toggle');
    var navLinks = document.querySelector('.nav-links');
    if (!menuBtn || !navLinks) return;

    menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var expanded = navLinks.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(expanded));
    });

    navLinks.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        navLinks.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('click', function (e) {
      if (!navLinks.contains(e.target) && !menuBtn.contains(e.target)) {
        navLinks.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ── Footer year ───────────────────────────────────────────────────
  function initFooterYear() {
    var el = document.querySelector('.current-year');
    if (el) el.textContent = new Date().getFullYear();
  }

  // ── Bootstrap ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    initAbstracts();
    initMobileNav();
    initFooterYear();
  });
})();
