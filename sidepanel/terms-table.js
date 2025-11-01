(function () {
  function renderTermsTables(data, mount, opts = {}) {
    const {
      naToken = "NA",
      sectionOrder = Object.keys(data || {}),
      keyLabelMap = {},
      hideSectionIfNo = false,
      compact = true,
    } = opts;

    const mnt = typeof mount === "string" ? document.querySelector(mount) : mount;
    if (!mnt) throw new Error("renderTermsTables: mount element not found");

    const normalize = (v) => {
      if (v == null) return naToken;
      const s = String(v).trim();
      if (!s || /^not\s*specified$/i.test(s) || s.toLowerCase() === 'na') return naToken;
      return s;
    };
    const toLabel = (k) =>
      keyLabelMap[k] || k.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

    mnt.innerHTML = "";
    let totalSectionsDisplayed = 0;

    for (const section of sectionOrder) {
      console.log("Handling section : " + section)
      if (!data || typeof data[section] !== "object") continue;

      const kv = data[section];
      const allowed = String(kv?.allowed ?? "").toLowerCase();
      if (hideSectionIfNo && allowed === "no") continue;

      // Filter out NA rows
      const filteredKeys = Object.keys(kv).filter((k) => normalize(kv[k]) !== naToken);
      if (filteredKeys.length === 0) continue;

      // Header above table (centered)
      const header = document.createElement("h2");
      header.className = "text-lg font-semibold text-blue-700 text-center mt-2 mb-2";
      header.textContent = toLabel(section);

      // Table (no thead)
      const table = document.createElement("table");
      table.className = "w-full border-collapse text-sm bg-white shadow-sm rounded-lg overflow-hidden";
      const tbody = document.createElement("tbody");

      for (const key of filteredKeys) {
        const val = normalize(kv[key]);
        const tr = document.createElement("tr");
        tr.className = "even:bg-slate-50";

        const tdKey = document.createElement("td");
        tdKey.className = `border border-slate-200 ${compact ? "px-3 py-2" : "px-4 py-3"} font-medium text-slate-900 align-top w-1/3`;
        tdKey.textContent = toLabel(key);

        const tdVal = document.createElement("td");
        tdVal.className = `border border-slate-200 ${compact ? "px-3 py-2" : "px-4 py-3"} text-slate-800 align-top whitespace-pre-wrap break-words`;
        tdVal.textContent = val;

        tr.appendChild(tdKey);
        tr.appendChild(tdVal);
        tbody.appendChild(tr);
      }

      table.appendChild(tbody);

      const container = document.createElement("div");
      container.className = "space-y-2";
      container.appendChild(header);
      container.appendChild(table);

      mnt.appendChild(container);
      totalSectionsDisplayed += 1
    }

    if (totalSectionsDisplayed === 0) {
      const noDetailsFound = document.createElement("h3");
      noDetailsFound.textContent = "No subscription or payment related information was found in page"
      mnt.appendChild(noDetailsFound)
    }

  }

  // Optional: an HTML string builder if you prefer innerHTML assignment
  function buildTermsTablesHTML(data, opts) {
    const temp = document.createElement("div");
    renderTermsTables(data, temp, opts);
    return temp.innerHTML;
  }

  // Expose globally
  window.renderTermsTables = renderTermsTables;
  window.buildTermsTablesHTML = buildTermsTablesHTML;
})();