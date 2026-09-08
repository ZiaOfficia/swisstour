/* ═══════════════════════════════════════════════════════════
   SwissRail — landing page behaviour
   ─────────────────────────────────────────────────────────
   ►► PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL BELOW ◄◄
   ═══════════════════════════════════════════════════════════ */

const CONFIG = {
  // Deploy Code.gs as a Web App ("Anyone" access),
  // then paste the /exec URL here.
  SHEET_ENDPOINT: "https://script.google.com/macros/s/AKfycbxfvmDKiuvsaJbw9yPJIR-JVdAnMj7KXIXtC6Gi97NafiELbD_OeqtuxxjS59dCCOXFAg/exec",

  // Shown to the user if the endpoint is unreachable.
  FALLBACK_EMAIL: "hello@example.com"
};

/* ─────────────────────────────────────────────────────────
   helpers
   ───────────────────────────────────────────────────────── */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const isoToday = () => new Date().toISOString().slice(0, 10);

/* ─────────────────────────────────────────────────────────
   theme
   ───────────────────────────────────────────────────────── */
(() => {
  const KEY = "sr-theme";
  const root = document.documentElement;
  const saved = localStorage.getItem(KEY);
  const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;

  root.setAttribute("data-theme", saved || (prefersDark ? "dark" : "light"));

  $("#themeBtn")?.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem(KEY, next);
  });
})();

/* ─────────────────────────────────────────────────────────
   header: stuck state, mobile nav, scrollspy
   ───────────────────────────────────────────────────────── */
(() => {
  const hdr    = $("#hdr");
  const nav    = $("#nav");
  const burger = $("#burger");
  const mcta   = $("#mcta");
  const totop  = $("#totop");

  const onScroll = () => {
    const y = scrollY;
    hdr.classList.toggle("is-stuck", y > 12);
    totop.classList.toggle("is-on", y > 700);
    mcta.classList.toggle("is-on", y > 700);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const closeNav = () => {
    nav.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  };

  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("nav-open", open);
  });

  nav.addEventListener("click", e => { if (e.target.closest("a")) closeNav(); });
  addEventListener("keydown", e => { if (e.key === "Escape") closeNav(); });

  totop.addEventListener("click", () =>
    scrollTo({ top: 0, behavior: "smooth" }));

  // scrollspy
  const links = $$('.nav > a[href^="#"]:not(.btn)');
  const targets = links
    .map(a => ({ a, el: $(a.getAttribute("href")) }))
    .filter(t => t.el);

  if (targets.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(l => l.classList.remove("is-active"));
        targets.find(t => t.el === en.target)?.a.classList.add("is-active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    targets.forEach(t => spy.observe(t.el));
  }
})();

/* ─────────────────────────────────────────────────────────
   scroll reveal
   ───────────────────────────────────────────────────────── */
(() => {
  const items = $$(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach(i => i.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add("is-in");
      obs.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  items.forEach(i => io.observe(i));
})();

/* ─────────────────────────────────────────────────────────
   animated stat counters
   ───────────────────────────────────────────────────────── */
(() => {
  const nums = $$("[data-count]");
  if (!nums.length) return;

  const run = el => {
    const end = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const decimals = (String(end).split(".")[1] || "").length;
    const dur = 1400;
    const t0 = performance.now();

    const tick = now => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (end * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (!("IntersectionObserver" in window)) {
    nums.forEach(n => n.textContent = n.dataset.count + (n.dataset.suffix || ""));
    return;
  }
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      run(en.target);
      obs.unobserve(en.target);
    });
  }, { threshold: 0.6 });
  nums.forEach(n => io.observe(n));
})();

/* ─────────────────────────────────────────────────────────
   dates
   ───────────────────────────────────────────────────────── */
(() => {
  const today = isoToday();
  ["#p_date", "#travelDate"].forEach(sel => {
    const el = $(sel);
    if (el) el.min = today;
  });
})();

/* ─────────────────────────────────────────────────────────
   hero trip planner  →  prefills the booking form
   ───────────────────────────────────────────────────────── */
(() => {
  const planner = $("#planner");
  if (!planner) return;

  planner.addEventListener("submit", e => {
    e.preventDefault();

    // carry the hero selection into the booking form
    setProduct($("#p_ticket").value);

    if ($("#p_date").value) $("#travelDate").value = $("#p_date").value;

    const pax = $("#p_pax").value;
    const adults = pax.match(/(\d+)\s*adult/i);
    const kids   = pax.match(/(\d+)\s*child/i);
    if (adults) setSelect($("#adults"), adults[1]);
    setSelect($("#children"), kids ? kids[1] : "0");
    if (/group/i.test(pax)) setSelect($("#adults"), "6+");

    goToForm();
  });
})();

/* product shortcut buttons on cards */
$$(".js-pick").forEach(btn => {
  btn.addEventListener("click", () => {
    setProduct(btn.dataset.product);
    goToForm();
  });
});

function setSelect(sel, value) {
  if (!sel) return;
  const found = [...sel.options].find(o => o.value === value || o.text === value);
  if (found) sel.value = found.value;
}

function setProduct(name) {
  const sel = $("#product");
  if (!sel || !name) return;
  const norm = s => s.toLowerCase().replace(/\b(ticket|mount|mt\.?)\b/g, "")
                     .replace(/[^a-z0-9]+/g, " ").trim();
  const want = norm(name);
  const opts = [...sel.options];
  const opt = opts.find(o => o.text.trim().toLowerCase() === name.trim().toLowerCase())
           || opts.find(o => norm(o.text) === want);
  if (opt) sel.value = opt.value;
}

function goToForm() {
  const target = $("#book");
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  // highlight the form once it is in view
  const form = $(".bform");
  setTimeout(() => {
    form?.animate(
      [
        { boxShadow: "0 0 0 0 rgba(227,6,19,.45)" },
        { boxShadow: "0 0 0 14px rgba(227,6,19,0)" }
      ],
      { duration: 900, easing: "ease-out" }
    );
    $("#name")?.focus({ preventScroll: true });
  }, 620);
}

/* ─────────────────────────────────────────────────────────
   pricing / coupon
   ─────────────────────────────────────────────────────────
   The page runs on a standard discount. A valid coupon lifts it to the
   coupon rate and re-prices everything that carries [data-base].

   Accepted codes are never stored in clear text here — only the FNV-1a
   digest of each one — so no code can be read off the page or its source.
   Client-side checking is a convenience; the discount that actually
   applies is confirmed by a specialist against the quote.
   ───────────────────────────────────────────────────────── */
const PRICING = {
  STANDARD_OFF: 15,   // what every visitor gets
  COUPON_OFF:   25,   // what a valid coupon unlocks
  CODE_DIGESTS: ["d87de64b", "3fb6bb58"]
};

/* FNV-1a, 32-bit → 8 hex chars. */
function digest(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

const normaliseCode = v => v.trim().toUpperCase().replace(/\s+/g, "");
const isValidCode = code =>
  code !== "" && PRICING.CODE_DIGESTS.includes(digest("sr:" + code));

/* the discount in force right now */
let currentOff = PRICING.STANDARD_OFF;
let appliedCode = "";

/** Repaints every percentage label and every price on the page. */
function applyDiscount(pct) {
  currentOff = pct;
  $(".offerbar")?.classList.toggle("is-coupon", pct === PRICING.COUPON_OFF);

  $$(".js-pct").forEach(el => { el.textContent = pct + "%"; });

  $$("[data-base]").forEach(el => {
    const base = parseFloat(el.dataset.base);
    const now = $(".price__now", el);
    if (!now || !isFinite(base)) return;
    now.textContent = "$" + Math.floor(base * (1 - pct / 100));
  });
}

/** Sends the visitor to the booking form with the coupon field ready to type in. */
function goToCoupon() {
  const target = $("#book");
  const input  = $("#coupon");
  if (!target || !input) return;

  target.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => {
    input.focus({ preventScroll: true });
    input.select();
    $("#couponBox")?.animate(
      [
        { boxShadow: "0 0 0 0 rgba(227,6,19,.5)" },
        { boxShadow: "0 0 0 12px rgba(227,6,19,0)" }
      ],
      { duration: 900, easing: "ease-out" }
    );
  }, 620);
}

$$(".js-coupon-jump").forEach(el => el.addEventListener("click", goToCoupon));

(() => {
  const box   = $("#couponBox");
  const input = $("#coupon");
  const btn   = $("#couponBtn");
  const msg   = $("#couponMsg");
  if (!box || !input || !btn) return;

  const say = (text, kind) => {
    msg.textContent = text;
    msg.className = `coupon__msg is-on ${kind}`;
  };

  const clearCoupon = () => {
    appliedCode = "";
    box.classList.remove("is-applied");
    btn.textContent = "Apply";
    applyDiscount(PRICING.STANDARD_OFF);
  };

  const apply = () => {
    const code = normaliseCode(input.value);

    if (!code) {
      clearCoupon();
      say("Please enter a coupon code.", "bad");
      return;
    }

    if (!isValidCode(code)) {
      clearCoupon();
      say(`That coupon isn't valid. Your ${PRICING.STANDARD_OFF}% discount still applies.`, "bad");
      input.focus({ preventScroll: true });
      return;
    }

    input.value = code;
    appliedCode = code;
    box.classList.add("is-applied");
    btn.textContent = "Applied";
    applyDiscount(PRICING.COUPON_OFF);
    say(`Coupon applied — you're getting ${PRICING.COUPON_OFF}% off. Every price on this page has been updated.`, "ok");
  };

  btn.addEventListener("click", apply);

  // Enter inside the coupon field applies the code instead of submitting
  input.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    apply();
  });

  // editing an applied code drops back to the standard discount
  input.addEventListener("input", () => {
    msg.className = "coupon__msg";
    btn.textContent = appliedCode ? "Applied" : "Apply";
    if (appliedCode && normaliseCode(input.value) !== appliedCode) clearCoupon();
  });

  box.addEventListener("sr:reset", clearCoupon);

  // keep the markup and the script in step on load
  applyDiscount(PRICING.STANDARD_OFF);
})();

/* ─────────────────────────────────────────────────────────
   booking form: validation + Google Sheets submit
   ───────────────────────────────────────────────────────── */
(() => {
  const form = $("#bookingForm");
  if (!form) return;

  const btn = $("#submitBtn");
  const msg = $("#formMsg");

  const RULES = {
    name: v => (v.trim().length >= 2 ? "" : "Please enter your name."),
    email: v =>
      /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim())
        ? ""
        : "Please enter a valid email address.",
    phone: v =>
      v.trim() === "" || /^[+\d][\d\s()\-.]{5,}$/.test(v.trim())
        ? ""
        : "Please enter a valid phone number.",
    product: v => (v ? "" : "Please choose what you're interested in."),
    travelDate: v => (v ? "" : "Please pick a travel date.")
  };

  const showError = (name, text) => {
    const field = $(`#${name}`);
    const slot = $(`.err[data-for="${name}"]`);
    field?.closest(".fld")?.classList.toggle("is-bad", !!text);
    if (slot) {
      slot.textContent = text;
      slot.classList.toggle("is-on", !!text);
    }
    return !text;
  };

  // live-clear errors as the user fixes them
  Object.keys(RULES).forEach(name => {
    const el = $(`#${name}`);
    el?.addEventListener("input", () => {
      if (el.closest(".fld")?.classList.contains("is-bad")) {
        showError(name, RULES[name](el.value));
      }
    });
  });

  const validate = () => {
    let firstBad = null;
    let ok = true;

    for (const [name, rule] of Object.entries(RULES)) {
      const el = $(`#${name}`);
      if (!el) continue;
      const err = rule(el.value);
      if (!showError(name, err)) {
        ok = false;
        firstBad = firstBad || el;
      }
    }

    const consent = $("#consent");
    const consentErr = consent.checked ? "" : "Please accept the privacy policy.";
    const cSlot = $('.err[data-for="consent"]');
    cSlot.textContent = consentErr;
    cSlot.classList.toggle("is-on", !!consentErr);
    if (consentErr) {
      ok = false;
      firstBad = firstBad || consent;
    }

    if (firstBad) {
      firstBad.focus({ preventScroll: true });
      firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return ok;
  };

  const say = (text, kind) => {
    msg.textContent = text;
    msg.className = `formmsg is-on ${kind}`;
  };

  form.addEventListener("submit", async e => {
    e.preventDefault();
    msg.className = "formmsg";

    // honeypot — silently accept and do nothing
    if ($("#company").value.trim() !== "") return;

    if (!validate()) return;

    const payload = {
      timestamp:   new Date().toISOString(),
      name:        $("#name").value.trim(),
      email:       $("#email").value.trim(),
      phone:       $("#phone").value.trim(),
      product:     $("#product").value,
      travelDate:  $("#travelDate").value,
      duration:    $("#duration").value,
      adults:      $("#adults").value,
      children:    $("#children").value,
      travelClass: $("#travelClass").value,
      message:     $("#message").value.trim(),
      coupon:      appliedCode,
      discount:    currentOff + "%",
      consent:     $("#consent").checked ? "Yes" : "No",
      pageUrl:     location.href,
      referrer:    document.referrer || "direct",
      userAgent:   navigator.userAgent
    };

    btn.classList.add("is-busy");
    $(".btn__label", btn).textContent = "Sending…";

    try {
      await sendToSheet(payload);
      form.reset();
      $$(".fld.is-bad").forEach(f => f.classList.remove("is-bad"));
      $$(".err.is-on").forEach(f => f.classList.remove("is-on"));
      $("#couponBox")?.dispatchEvent(new Event("sr:reset"));
      say(
        `Thank you, ${payload.name.split(" ")[0]} — your request is in. ` +
        `A rail specialist will email ${payload.email} within one working day.`,
        "ok"
      );
    } catch (err) {
      console.error("[SwissRail] submit failed:", err);
      say(
        err.message === "NO_ENDPOINT"
          ? "This form isn't connected to a Google Sheet yet. Add your Apps Script " +
            "Web App URL to CONFIG.SHEET_ENDPOINT in assets/js/main.js."
          : `We couldn't send your request just now. Please try again, or email us at ${CONFIG.FALLBACK_EMAIL}.`,
        "bad"
      );
    } finally {
      btn.classList.remove("is-busy");
      $(".btn__label", btn).textContent = "Send my request";
    }
  });
})();

/**
 * Posts to the Apps Script Web App.
 *
 * Apps Script redirects POSTs to script.googleusercontent.com, which usually
 * carries CORS headers — so the normal request works and we can read the JSON
 * reply. When a browser or extension blocks that redirect we retry once in
 * `no-cors` mode: the response is opaque, but the row still reaches the sheet.
 */
async function sendToSheet(payload) {
  const url = CONFIG.SHEET_ENDPOINT;
  if (!url) throw new Error("NO_ENDPOINT");

  // URLSearchParams keeps the request "simple" — no CORS preflight.
  const body = new URLSearchParams(payload);

  try {
    const res = await fetch(url, { method: "POST", body });
    if (!res.ok) {
      const e = new Error(`Server responded ${res.status}`);
      e.fatal = true;
      throw e;
    }
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* plain-text reply is fine */ }
    if (data && data.result === "error") {
      const e = new Error(data.message || "The sheet rejected the submission.");
      e.fatal = true;
      throw e;
    }
    return true;
  } catch (err) {
    if (err.fatal) throw err;          // real server-side failure
    // network / CORS problem → opaque retry
    await fetch(url, { method: "POST", mode: "no-cors", body });
    return true;
  }
}

/* ─────────────────────────────────────────────────────────
   misc
   ───────────────────────────────────────────────────────── */
$("#yr").textContent = new Date().getFullYear();

// currency / language chips are decorative in this build
$$("#curBtn, #langBtn").forEach(b =>
  b.addEventListener("click", () =>
    console.info("[SwissRail] Hook up currency/language switching here.")
  )
);
