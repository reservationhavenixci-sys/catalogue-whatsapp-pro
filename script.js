/* =========================================================
   HAVENIXCI — Catalogue WhatsApp Pro
   Comportements interactifs de la page
   ========================================================= */
(function () {
  "use strict";

  var OFFER_PRICES = { starter: 20000, business: 40000 };
  var OFFER_LABELS = { starter: "Starter — 20 000 FCFA", business: "Business — 40 000 FCFA" };
  var selectedOffer = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    setFooterYear();
    bindOfferToggles();
    bindOfferConfirm();
    bindOrderSendLinks();
    bindFollowupToggles();
    bindPaymentInputs();
    bindAutosave();
    bindCatalogueAccess();
    bindScrollReveal();
  }

  function setFooterYear() {
    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  /* ---------- 1. "Voir les détails de l'offre" (accordéon entre les offres) ---------- */
  function bindOfferToggles() {
    var toggles = document.querySelectorAll(".offer-details-toggle");

    toggles.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        var expanded = btn.getAttribute("aria-expanded") === "true";

        // Referme automatiquement les détails des AUTRES offres (une seule ouverte à la fois)
        toggles.forEach(function (otherBtn) {
          if (otherBtn === btn) return;
          var otherPanel = document.getElementById(otherBtn.getAttribute("aria-controls"));
          otherBtn.setAttribute("aria-expanded", "false");
          if (otherPanel) otherPanel.hidden = true;
        });

        btn.setAttribute("aria-expanded", String(!expanded));
        if (panel) panel.hidden = expanded;
        btn.classList.remove("blink-btn"); // arrête de clignoter une fois consulté
      });
    });
  }

  /* ---------- 2. "Je prends cette offre" : bascule entre les détails et le formulaire ---------- */
  function bindOfferConfirm() {
    document.querySelectorAll(".confirm-offer-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var offer = btn.getAttribute("data-offer-confirm");
        var wrapper = document.getElementById("order-wrapper-" + offer);
        var details = document.querySelector('[data-offer-details="' + offer + '"]');
        var isFormOpen = btn.getAttribute("aria-expanded") === "true";

        if (!isFormOpen) {
          // Ouvre le formulaire à remplir et referme les détails pour rester compact
          if (details) details.hidden = true;
          if (wrapper) {
            wrapper.hidden = false;
            wrapper.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          btn.textContent = "← Revenir aux détails de l'offre";
          btn.setAttribute("aria-expanded", "true");
          selectOffer(offer);
        } else {
          // Referme le formulaire et rouvre les détails (le client garde la main)
          if (wrapper) wrapper.hidden = true;
          if (details) details.hidden = false;
          btn.textContent = "Je prends cette offre — remplir mes informations";
          btn.setAttribute("aria-expanded", "false");
        }
      });
    });
  }

  /* ---------- 3. Lien "Envoyer sur WhatsApp" (inclut le montant et l'acompte choisis) ---------- */
  function bindOrderSendLinks() {
    document.querySelectorAll(".order-send-link").forEach(function (link) {
      var form = link.closest("form");

      link.addEventListener("click", function (e) {
        e.preventDefault();

        // Vérifie les champs obligatoires (nom, boutique, ville, whatsapp)
        if (form && typeof form.reportValidity === "function" && !form.reportValidity()) {
          return; // le navigateur affiche le champ manquant, on n'envoie rien
        }

        if (form) {
          var offer = form.getAttribute("data-offer-form");
          var label = OFFER_LABELS[offer] || offer;
          var total = OFFER_PRICES[offer];
          var nom = getFieldValue(form, "nom");
          var boutique = getFieldValue(form, "boutique");
          var ville = getFieldValue(form, "ville");
          var whatsapp = getFieldValue(form, "whatsapp");
          var infos = getFieldValue(form, "infos");

          // Mode de paiement actuellement choisi (acompte 50% ou paiement intégral 100%)
          var checkedRadio = document.querySelector('input[name="acompte"]:checked');
          var pct = checkedRadio ? parseInt(checkedRadio.value, 10) : 50;
          var paiementLigne = "";

          if (total) {
            if (pct === 100) {
              paiementLigne = "Paiement : intégral — " + formatFCFA(total);
            } else {
              var acompte = Math.round((total * pct) / 100);
              var solde = total - acompte;
              paiementLigne =
                "Paiement : acompte " + pct + "% — " + formatFCFA(acompte) +
                " (solde " + formatFCFA(solde) + " à la livraison)";
            }
          }

          var text =
            "Bonjour, je souhaite l'offre " + label + ".\n\n" +
            "Voici mes informations :\n" +
            "Nom : " + nom + "\n" +
            "Nom de la boutique : " + boutique + "\n" +
            "Ville : " + ville + "\n" +
            "Contact WhatsApp : " + whatsapp + "\n" +
            "Autres informations : " + (infos || "—") +
            (paiementLigne ? "\n\n" + paiementLigne : "");

          window.open(
            "https://wa.me/2250151030957?text=" + encodeURIComponent(text),
            "_blank",
            "noopener"
          );

          var indicator = form.querySelector(".save-indicator");
          if (indicator) {
            indicator.textContent = "Envoyé sur WhatsApp ✓";
            indicator.classList.add("is-visible");
          }
        }
      });
    });
  }

  function getFieldValue(form, name) {
    var field = form.elements[name];
    return field ? field.value.trim() : "";
  }

  /* ---------- 4. Options de suivi (accordéon) ---------- */
  function bindFollowupToggles() {
    document.querySelectorAll(".followup-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        var expanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!expanded));
        if (panel) panel.hidden = expanded;
      });
    });
  }

  /* ---------- 5. Bloc paiement : calcul automatique ---------- */
  function selectOffer(offer) {
    selectedOffer = offer;
    var nameEl = document.querySelector('[data-payment="offer-name"]');
    if (nameEl) nameEl.textContent = OFFER_LABELS[offer] || "Offre inconnue";
    updatePaymentSummary();
    updateCatalogueAccessButton();

    var paymentBlock = document.getElementById("paiement");
    if (paymentBlock) {
      // Laisse le temps au scroll du formulaire de se terminer
      setTimeout(function () {
        paymentBlock.classList.add("payment-block--active");
      }, 300);
    }
  }

  /* ---------- 5bis. Bouton "Remplir mon catalogue" ---------- */
  // Débloqué uniquement une fois qu'une offre a été choisie.
  function updateCatalogueAccessButton() {
    // Le bouton "Remplir mon catalogue" n'est plus verrouillé :
    // il reste cliquable en permanence, qu'une offre ait été choisie ou non.
    var btn = document.getElementById("remplir-catalogue-btn");
    var hint = document.querySelector("[data-catalogue-hint]");
    if (!btn) return;
    btn.removeAttribute("aria-disabled");
    if (hint) hint.hidden = true;
  }

  function bindCatalogueAccess() {
    var btn = document.getElementById("remplir-catalogue-btn");
    if (!btn) return;
    updateCatalogueAccessButton();
  }

  function bindPaymentInputs() {
    document.querySelectorAll('input[name="acompte"]').forEach(function (radio) {
      radio.addEventListener("change", updatePaymentSummary);
    });
  }

  function updatePaymentSummary() {
    var total = OFFER_PRICES[selectedOffer];
    var totalEl = document.querySelector('[data-payment="total"]');
    var acompteEl = document.querySelector('[data-payment="acompte"]');
    var soldeEl = document.querySelector('[data-payment="solde"]');
    var acompteLabelEl = document.querySelector('[data-payment="acompte-label"]');
    var hintEl = document.querySelector('[data-payment="acompte-hint"]');

    if (!total) {
      if (totalEl) totalEl.textContent = "—";
      if (acompteEl) acompteEl.textContent = "—";
      if (soldeEl) soldeEl.textContent = "—";
      return;
    }

    var checked = document.querySelector('input[name="acompte"]:checked');
    var pct = checked ? parseInt(checked.value, 10) : 50;
    var acompte = Math.round((total * pct) / 100);
    var solde = total - acompte;

    if (totalEl) totalEl.textContent = formatFCFA(total);
    if (acompteEl) acompteEl.textContent = formatFCFA(acompte);
    if (soldeEl) soldeEl.textContent = formatFCFA(solde);
    if (acompteLabelEl) acompteLabelEl.textContent = pct === 100 ? "Montant à payer" : "Acompte à payer (50%)";
    if (hintEl) {
      hintEl.textContent = pct === 100
        ? "Paiement complet à la commande, aucun solde restant."
        : "Paiement partiel à la commande, solde à la livraison.";
    }
  }

  function formatFCFA(amount) {
    return amount.toLocaleString("fr-FR") + " FCFA";
  }

  /* ---------- 6. Sauvegarde automatique des formulaires ---------- */
  function bindAutosave() {
    document.querySelectorAll(".order-form").forEach(function (form) {
      var offer = form.getAttribute("data-offer-form");
      var indicator = form.querySelector(".save-indicator");
      var storageKey = "havenixci-order-" + offer;
      var saveTimeout = null;

      // Restaure les données précédemment saisies
      try {
        var saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
        Object.keys(saved).forEach(function (name) {
          var field = form.elements[name];
          if (field) field.value = saved[name];
        });
      } catch (err) {
        /* ignore une éventuelle donnée corrompue */
      }

      form.addEventListener("input", function () {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(function () {
          var data = {};
          Array.prototype.forEach.call(form.elements, function (field) {
            if (field.name) data[field.name] = field.value;
          });
          try {
            localStorage.setItem(storageKey, JSON.stringify(data));
          } catch (err) {
            /* stockage indisponible : on ignore silencieusement */
          }
          if (indicator) {
            indicator.textContent = "Enregistré";
            indicator.classList.add("is-visible");
          }
        }, 500);
      });
    });
  }

  /* ---------- 7. Apparition douce des blocs au défilement ---------- */
  function bindScrollReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    // Si le navigateur ne supporte pas IntersectionObserver, on affiche tout directement
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    items.forEach(function (el) { observer.observe(el); });
  }
})();
