/* ---------- PWA : service worker (installabilité + shell hors-ligne) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* pas grave si indisponible */ });
  });
}

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Année dans le footer ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Menu mobile ---------- */
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Animation au défilement ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => observer.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in-view'));
  }

  /* ---------- Accordéons : détail des offres ----------
     - Un seul détail ouvert à la fois : ouvrir une offre ferme l'offre précédente.
     - Si la carte ouverte sort de l'écran au scroll, elle se referme automatiquement.
  -------------------------------------------------------- */
  let currentOpenOfferBtn = null;

  function closeOfferPanel(btn) {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
  }
  function openOfferPanel(btn) {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
  }

  document.querySelectorAll('.offer-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      if (currentOpenOfferBtn && currentOpenOfferBtn !== btn) {
        closeOfferPanel(currentOpenOfferBtn);
      }

      if (isOpen) {
        closeOfferPanel(btn);
        currentOpenOfferBtn = null;
      } else {
        openOfferPanel(btn);
        currentOpenOfferBtn = btn;
      }
    });
  });

  const offerCards = document.querySelectorAll('.offer-card');
  if ('IntersectionObserver' in window && offerCards.length) {
    const offerObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const toggleBtn = entry.target.querySelector('.offer-toggle');
        if (!toggleBtn) return;
        const isOpen = toggleBtn.getAttribute('aria-expanded') === 'true';
        if (isOpen && !entry.isIntersecting) {
          closeOfferPanel(toggleBtn);
          if (currentOpenOfferBtn === toggleBtn) currentOpenOfferBtn = null;
        }
      });
    }, { threshold: 0, rootMargin: '-12% 0px -12% 0px' });
    offerCards.forEach(card => offerObserver.observe(card));
  }

  /* ---------- Accordéons : options de suivi ---------- */
  document.querySelectorAll('.followup-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!isOpen));
      panel.hidden = isOpen;
    });
  });

  /* ---------- Sélection d'offre + formulaire de commande ---------- */
  const OFFER_NAMES = {
    starter: 'Starter',
    business: 'Business',
    businesspro: 'Business Pro',
    surmesure: 'Sur mesure'
  };

  const orderEmpty = document.getElementById('orderEmpty');
  const orderActive = document.getElementById('orderActive');
  const orderBoxEl = document.getElementById('orderBox');
  const orderToggle = document.getElementById('orderToggle');
  const orderFormPanel = document.getElementById('orderFormPanel');
  const orderToggleLabel = document.getElementById('orderToggleLabel');
  const selectedOfferNameEl = document.getElementById('selectedOfferName');
  const payTotal = document.getElementById('payTotal');
  const payAcompte = document.getElementById('payAcompte');
  const paySolde = document.getElementById('paySolde');
  const payAcompteLabel = document.getElementById('payAcompteLabel');
  const orderForm = document.getElementById('orderForm');

  let selectedOffer = null;
  let selectedPrice = 0;

  function formatFCFA(n) {
    return n.toLocaleString('fr-FR') + ' FCFA';
  }

  function updatePaymentSummary() {
    if (!selectedOffer || selectedPrice <= 0) {
      payTotal.textContent = 'Sur devis';
      payAcompte.textContent = '—';
      paySolde.textContent = '—';
      return;
    }
    const acompteRadio = orderForm.querySelector('input[name="acompte"]:checked');
    const pct = acompteRadio ? Number(acompteRadio.value) : 50;
    const acompte = Math.round(selectedPrice * (pct / 100));
    const solde = selectedPrice - acompte;

    payTotal.textContent = formatFCFA(selectedPrice);
    payAcompte.textContent = formatFCFA(acompte);
    paySolde.textContent = formatFCFA(solde);
    payAcompteLabel.textContent = `Acompte à payer (${pct}%)`;
  }

  /* ---------- Ouverture / fermeture du formulaire "Vos informations" ----------
     Le formulaire reste accessible mais se replie automatiquement quand le
     client scrolle plus loin sur la page, pour ne pas encombrer l'écran.
     Il suffit de cliquer sur "Reprendre" pour le rouvrir, sans jamais
     perdre ce qui a été saisi.
  --------------------------------------------------------------------------- */
  function openOrderPanel() {
    if (!orderFormPanel) return;
    orderFormPanel.hidden = false;
    if (orderToggle) orderToggle.setAttribute('aria-expanded', 'true');
    if (orderToggleLabel) orderToggleLabel.textContent = 'Masquer';
  }

  function closeOrderPanel() {
    if (!orderFormPanel) return;
    orderFormPanel.hidden = true;
    if (orderToggle) orderToggle.setAttribute('aria-expanded', 'false');
    if (orderToggleLabel) orderToggleLabel.textContent = 'Reprendre';
  }

  if (orderToggle) {
    orderToggle.addEventListener('click', () => {
      const isOpen = orderToggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) closeOrderPanel(); else openOrderPanel();
    });
  }

  if ('IntersectionObserver' in window && orderBoxEl) {
    const orderVisibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!orderActive || orderActive.hidden) return; // pas encore d'offre choisie
        if (!entry.isIntersecting) {
          if (orderFormPanel && !orderFormPanel.hidden) closeOrderPanel();
        }
      });
    }, { threshold: 0, rootMargin: '-12% 0px -12% 0px' });
    orderVisibilityObserver.observe(orderBoxEl);
  }

  /* ---------- Sauvegarde automatique du formulaire (localStorage) ----------
     Les informations saisies restent disponibles même si le client ferme
     l'onglet, quitte le site ou actualise la page.
  ---------------------------------------------------------------------- */
  const STORAGE_KEY = 'havenixci_order_data';

  function saveOrderData() {
    if (!orderForm) return;
    const acompteRadio = orderForm.querySelector('input[name="acompte"]:checked');
    const data = {
      nom: orderForm.querySelector('#f-nom').value,
      boutique: orderForm.querySelector('#f-boutique').value,
      ville: orderForm.querySelector('#f-ville').value,
      whatsapp: orderForm.querySelector('#f-whatsapp').value,
      infos: orderForm.querySelector('#f-infos').value,
      acompte: acompteRadio ? acompteRadio.value : '50',
      selectedOffer,
      selectedPrice
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* stockage indisponible */ }
  }

  function loadOrderData() {
    let data;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      data = JSON.parse(raw);
    } catch (e) { return; }
    if (!data || !orderForm) return;

    if (data.nom) orderForm.querySelector('#f-nom').value = data.nom;
    if (data.boutique) orderForm.querySelector('#f-boutique').value = data.boutique;
    if (data.ville) orderForm.querySelector('#f-ville').value = data.ville;
    if (data.whatsapp) orderForm.querySelector('#f-whatsapp').value = data.whatsapp;
    if (data.infos) orderForm.querySelector('#f-infos').value = data.infos;
    if (data.acompte) {
      const radio = orderForm.querySelector(`input[name="acompte"][value="${data.acompte}"]`);
      if (radio) radio.checked = true;
    }
    if (data.selectedOffer && OFFER_NAMES[data.selectedOffer]) {
      selectedOffer = data.selectedOffer;
      selectedPrice = data.selectedPrice || 0;
      selectedOfferNameEl.textContent = OFFER_NAMES[selectedOffer];
      orderEmpty.hidden = true;
      orderActive.hidden = false;
      openOrderPanel();
      updatePaymentSummary();
    }
  }

  function clearOrderData() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    if (orderForm) orderForm.reset();
    selectedOffer = null;
    selectedPrice = 0;
    orderActive.hidden = true;
    orderEmpty.hidden = false;
  }

  document.querySelectorAll('.confirm-offer').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedOffer = btn.getAttribute('data-offer-confirm');
      const card = btn.closest('.offer-card');
      selectedPrice = Number(card.getAttribute('data-price')) || 0;

      selectedOfferNameEl.textContent = OFFER_NAMES[selectedOffer] || selectedOffer;
      orderEmpty.hidden = true;
      orderActive.hidden = false;
      openOrderPanel();

      updatePaymentSummary();
      saveOrderData();

      document.getElementById('commande').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  if (orderForm) {
    orderForm.querySelectorAll('input[name="acompte"]').forEach(radio => {
      radio.addEventListener('change', () => {
        updatePaymentSummary();
        saveOrderData();
      });
    });

    orderForm.querySelectorAll('#f-nom, #f-boutique, #f-ville, #f-whatsapp, #f-infos').forEach(field => {
      field.addEventListener('input', saveOrderData);
    });
  }

  const clearOrderBtn = document.getElementById('clearOrderBtn');
  if (clearOrderBtn) {
    clearOrderBtn.addEventListener('click', () => {
      if (window.confirm('Effacer les informations enregistrées sur cet appareil ?')) {
        clearOrderData();
      }
    });
  }

  loadOrderData();

  /* ---------- Envoi de la commande sur WhatsApp ---------- */
  if (orderForm) {
    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const nom = orderForm.querySelector('#f-nom').value.trim();
      const boutique = orderForm.querySelector('#f-boutique').value.trim();
      const ville = orderForm.querySelector('#f-ville').value.trim();
      const whatsapp = orderForm.querySelector('#f-whatsapp').value.trim();
      const infos = orderForm.querySelector('#f-infos').value.trim();
      const acompteRadio = orderForm.querySelector('input[name="acompte"]:checked');
      const pct = acompteRadio ? acompteRadio.value : '50';

      if (!nom || !boutique || !ville || !whatsapp) {
        orderForm.reportValidity();
        return;
      }

      const offerLabel = OFFER_NAMES[selectedOffer] || selectedOffer;
      const priceLabel = selectedPrice > 0 ? formatFCFA(selectedPrice) : 'Sur devis';

      let message = `Bonjour Havenixci Catalogue,\n\n`;
      message += `Je souhaite confirmer l'offre *${offerLabel}* (${priceLabel}).\n\n`;
      message += `Nom : ${nom}\n`;
      message += `Boutique : ${boutique}\n`;
      message += `Ville : ${ville}\n`;
      message += `Contact WhatsApp : ${whatsapp}\n`;
      if (selectedPrice > 0) {
        message += `Mode de paiement souhaité : ${pct}%\n`;
      }
      if (infos) {
        message += `Informations complémentaires : ${infos}\n`;
      }
      message += `\nMerci de me confirmer les prochaines étapes.`;

      const url = `https://wa.me/2250151030957?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank', 'noopener');
    });
  }

  /* ---------- Installation de l'app (PWA) ----------
     Sur ordinateur, le bouton "Installer l'app" dans le menu suffit.
     Sur téléphone, ce bouton est caché dans le menu ☰ et personne ne le
     trouve tout seul : on ajoute donc une bannière en bas d'écran qui
     explique comment installer, adaptée à Android (bouton direct) et à
     iPhone (Safari n'autorise pas l'installation automatique : il faut
     guider vers Partager → "Sur l'écran d'accueil").
  --------------------------------------------------------------------- */
  let deferredInstallPrompt = null;
  const installBtn = document.getElementById('installBtn');
  const installBanner = document.getElementById('installBanner');
  const installBannerText = document.getElementById('installBannerText');
  const installBannerAction = document.getElementById('installBannerAction');
  const installBannerClose = document.getElementById('installBannerClose');

  const IS_STANDALONE = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const UA = window.navigator.userAgent || '';
  const IS_IOS = /iphone|ipad|ipod/i.test(UA) && !window.MSStream;
  const DISMISS_KEY = 'havenixci_install_banner_dismissed_at';
  const DISMISS_DAYS = 14;

  function installBannerRecentlyDismissed() {
    try {
      const ts = Number(localStorage.getItem(DISMISS_KEY));
      return ts && (Date.now() - ts) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    } catch (e) { return false; }
  }

  function hideInstallBanner(remember) {
    if (installBanner) installBanner.classList.remove('is-visible');
    document.body.classList.remove('has-install-banner');
    if (remember) {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) { /* ignore */ }
    }
  }

  function showInstallBanner(mode) {
    if (!installBanner || IS_STANDALONE || installBannerRecentlyDismissed()) return;
    if (mode === 'ios') {
      if (installBannerText) {
        installBannerText.innerHTML = 'Appuyez sur <strong>Partager</strong> <span class="ib-share-icon" aria-hidden="true">⬆️</span> en bas de Safari, puis sur <strong>« Sur l\u2019écran d\u2019accueil »</strong>.';
      }
      if (installBannerAction) installBannerAction.hidden = true;
    } else {
      if (installBannerText) installBannerText.textContent = 'Accédez à votre catalogue en un tap, comme une vraie application.';
      if (installBannerAction) installBannerAction.hidden = false;
    }
    installBanner.classList.add('is-visible');
    document.body.classList.add('has-install-banner');
  }

  if (installBannerClose) {
    installBannerClose.addEventListener('click', () => hideInstallBanner(true));
  }

  if (installBannerAction) {
    installBannerAction.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
      }
      hideInstallBanner(true);
      if (installBtn) installBtn.hidden = true;
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (installBtn) installBtn.hidden = false;
    showInstallBanner('android'); // Chrome/Edge (Android + ordinateur) proposent l'installation directe
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installBtn.hidden = true;
      hideInstallBanner(true);
    });
  }

  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.hidden = true;
    deferredInstallPrompt = null;
    hideInstallBanner(true);
  });

  // iOS Safari ne déclenche jamais "beforeinstallprompt" : on guide manuellement.
  if (IS_IOS && !IS_STANDALONE) {
    window.setTimeout(() => showInstallBanner('ios'), 2000);
  }

  /* ---------- Partage d'une offre (WhatsApp, Facebook, copier le lien) ----------
     Sur mobile / navigateurs compatibles : menu de partage natif (navigator.share).
     Sinon : petit menu avec les options les plus utiles pour vendre en Côte d'Ivoire.
  --------------------------------------------------------------------------------- */
  const shareMenu = document.getElementById('shareMenu');
  const shareMenuWhatsapp = document.getElementById('shareMenuWhatsapp');
  const shareMenuFacebook = document.getElementById('shareMenuFacebook');
  const shareMenuCopy = document.getElementById('shareMenuCopy');
  const shareToast = document.getElementById('shareToast');
  let shareToastTimer = null;

  function buildOfferShareUrl(offerKey) {
    const url = new URL(window.location.href);
    url.hash = '';
    url.searchParams.set('offre', offerKey);
    return url.toString() + '#offres';
  }

  function buildOfferShareText(name, price) {
    const priceLabel = price && price !== 'Sur devis' ? ` (${price})` : '';
    return `Découvrez l'offre ${name}${priceLabel} de Havenixci Catalogue — votre boutique WhatsApp pro, prête en quelques jours.`;
  }

  function closeShareMenu() {
    if (!shareMenu) return;
    shareMenu.hidden = true;
    document.removeEventListener('click', onOutsideShareClick, true);
  }

  function onOutsideShareClick(e) {
    if (shareMenu && !shareMenu.contains(e.target)) closeShareMenu();
  }

  function openShareMenu(anchorBtn, { url, text }) {
    if (!shareMenu) return;
    shareMenu.hidden = false;

    const rect = anchorBtn.getBoundingClientRect();
    const menuWidth = shareMenu.offsetWidth || 190;
    let left = rect.left + window.scrollX;
    left = Math.min(left, window.scrollX + document.documentElement.clientWidth - menuWidth - 12);
    left = Math.max(left, window.scrollX + 12);
    let top = rect.bottom + window.scrollY + 8;
    const menuHeight = shareMenu.offsetHeight || 150;
    if (rect.bottom + menuHeight > window.innerHeight) {
      top = rect.top + window.scrollY - menuHeight - 8;
    }
    shareMenu.style.left = `${left}px`;
    shareMenu.style.top = `${top}px`;

    if (shareMenuWhatsapp) shareMenuWhatsapp.href = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
    if (shareMenuFacebook) shareMenuFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

    if (shareMenuCopy) {
      shareMenuCopy.onclick = async () => {
        try {
          await navigator.clipboard.writeText(url);
        } catch (e) {
          const tmp = document.createElement('textarea');
          tmp.value = url;
          document.body.appendChild(tmp);
          tmp.select();
          document.execCommand('copy');
          document.body.removeChild(tmp);
        }
        closeShareMenu();
        if (shareToast) {
          shareToast.hidden = false;
          window.clearTimeout(shareToastTimer);
          shareToastTimer = window.setTimeout(() => { shareToast.hidden = true; }, 2200);
        }
      };
    }

    window.setTimeout(() => document.addEventListener('click', onOutsideShareClick, true), 0);
  }

  document.querySelectorAll('.offer-share').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeShareMenu();
      const offerKey = btn.getAttribute('data-share-offer');
      const name = btn.getAttribute('data-share-name') || offerKey;
      const price = btn.getAttribute('data-share-price') || '';
      const url = buildOfferShareUrl(offerKey);
      const text = buildOfferShareText(name, price);

      if (navigator.share) {
        try {
          await navigator.share({ title: `Havenixci Catalogue — ${name}`, text, url });
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return; // l'utilisateur a annulé
        }
      }
      openShareMenu(btn, { url, text });
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeShareMenu();
  });

  /* ---------- Lien partagé : ouvrir directement l'offre concernée ----------
     Quand quelqu'un reçoit un lien "?offre=business", sa fiche s'affiche et
     s'ouvre automatiquement pour motiver le clic, sans qu'il ait à chercher.
  ----------------------------------------------------------------------------- */
  const sharedOfferKey = new URLSearchParams(window.location.search).get('offre');
  if (sharedOfferKey) {
    const targetCard = document.querySelector(`.offer-card[data-offer="${sharedOfferKey}"]`);
    if (targetCard) {
      const toggleBtn = targetCard.querySelector('.offer-toggle');
      window.setTimeout(() => {
        if (toggleBtn && toggleBtn.getAttribute('aria-expanded') !== 'true') {
          toggleBtn.click();
        }
        targetCard.classList.add('offer-card--linked');
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }

});
