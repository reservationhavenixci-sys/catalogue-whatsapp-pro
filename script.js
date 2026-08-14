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
    bindCatalogueLinks();
    bindAddProductButtons();
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

  /* ---------- 1. "Voir les détails de l'offre" ---------- */
  function bindOfferToggles() {
    document.querySelectorAll(".offer-details-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        var expanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!expanded));
        if (panel) panel.hidden = expanded;
        btn.classList.remove("blink-btn"); // arrête de clignoter une fois consulté
      });
    });
  }

  /* ---------- 2. "Je prends cette offre" ---------- */
  function bindOfferConfirm() {
    document.querySelectorAll(".confirm-offer-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var offer = btn.getAttribute("data-offer-confirm");
        var wrapper = document.getElementById("order-wrapper-" + offer);
        if (wrapper) {
          wrapper.hidden = false;
          wrapper.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        btn.hidden = true;
        selectOffer(offer);
      });
    });
  }

  /* ---------- 3. Lien "Envoyer sur WhatsApp" ---------- */
  function bindCatalogueLinks() {
    document.querySelectorAll(".catalogue-link").forEach(function (link) {
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
          var nom = getFieldValue(form, "nom");
          var boutique = getFieldValue(form, "boutique");
          var ville = getFieldValue(form, "ville");
          var whatsapp = getFieldValue(form, "whatsapp");
          var infos = getFieldValue(form, "infos");

          var text =
            "Bonjour, je souhaite l'offre " + label + ".\n\n" +
            "Voici mes informations :\n" +
            "Nom : " + nom + "\n" +
            "Nom de la boutique : " + boutique + "\n" +
            "Ville : " + ville + "\n" +
            "Contact WhatsApp : " + whatsapp + "\n" +
            "Autres informations : " + (infos || "—");

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

        // Révèle ensuite le bloc catalogue correspondant pour que le client puisse continuer
        var block = document.getElementById(link.getAttribute("data-catalogue-target"));
        if (block) {
          block.hidden = false;
          setTimeout(function () {
            block.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 300);
        }
      });
    });
  }

  function getFieldValue(form, name) {
    var field = form.elements[name];
    return field ? field.value.trim() : "";
  }

  /* ---------- 4. Ajouter / supprimer un produit du catalogue ---------- */
  function bindAddProductButtons() {
    var template = document.getElementById("product-row-template");
    if (!template) return;

    document.querySelectorAll(".add-product-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = btn.getAttribute("data-catalogue-target");
        var container = document.querySelector('.catalogue-products[data-catalogue="' + target + '"]');
        if (!container) return;

        var row = template.content.firstElementChild.cloneNode(true);
        container.appendChild(row);

        var removeBtn = row.querySelector(".product-remove");
        removeBtn.addEventListener("click", function () {
          row.remove();
        });

        var firstInput = row.querySelector(".p-name");
        if (firstInput) firstInput.focus();
      });
    });
  }

  /* ---------- 5. Options de suivi (accordéon) ---------- */
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

  /* ---------- 6. Bloc paiement : calcul automatique ---------- */
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

  /* ---------- 6bis. Bouton "Remplir mon catalogue" ---------- */
  // Ce bouton doit emmener le client vers SON catalogue (starter ou business),
  // celui qui correspond à l'offre qu'il vient de choisir — jamais vers un lien générique.
  function updateCatalogueAccessButton() {
    var btn = document.getElementById("remplir-catalogue-btn");
    var hint = document.querySelector("[data-catalogue-hint]");
    if (!btn) return;

    if (selectedOffer) {
      btn.setAttribute("aria-disabled", "false");
      btn.setAttribute("href", "#catalogue-" + selectedOffer);
      if (hint) hint.hidden = true;
    } else {
      btn.setAttribute("aria-disabled", "true");
      btn.setAttribute("href", "#offres");
      if (hint) hint.hidden = false;
    }
  }

  function bindCatalogueAccess() {
    var btn = document.getElementById("remplir-catalogue-btn");
    if (!btn) return;

    updateCatalogueAccessButton();

    btn.addEventListener("click", function (e) {
      if (!selectedOffer) {
        // Aucune offre choisie : on renvoie vers les offres au lieu d'un lien mort
        e.preventDefault();
        var offersSection = document.getElementById("offres");
        if (offersSection) offersSection.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      e.preventDefault();
      var block = document.getElementById("catalogue-" + selectedOffer);
      if (block) {
        block.hidden = false;
        block.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
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

  /* ---------- 7. Sauvegarde automatique des formulaires ---------- */
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

  /* ---------- 8. Apparition douce des blocs au défilement ---------- */
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
