
function showResults(fromFloating) {
  const ca = fromFloating
    ? document.getElementById("floatingInput")?.value || document.getElementById("mobileInput")?.value
    : document.getElementById("tokenInput").value;

  if (!ca || ca.length < 6) {
    showError();
    return;
  }

  let recents = JSON.parse(localStorage.getItem("recents") || "[]");
  recents = [ca, ...recents.filter(x => x !== ca)].slice(0, 5);
  localStorage.setItem("recents", JSON.stringify(recents));

  const ul = document.getElementById("recent-list");
  if (ul) ul.innerHTML = recents.map(x => `<li onclick="loadRecent('${x}')">${x}</li>`).join("");

  document.getElementById("intro").style.display = "none";
  document.getElementById("results").classList.remove("hidden");
  document.getElementById("error-message").classList.add("hidden");
  document.getElementById("floating-search")?.classList.remove("hidden");
  document.getElementById("floating-button")?.classList.remove("hidden");
  document.getElementById("recent-searches")?.classList.remove("hidden");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function loadRecent(ca) {
  document.getElementById("floatingInput").value = ca;
  showResults(true);
}

function showError() {
  document.getElementById("results").classList.add("hidden");
  document.getElementById("error-message").classList.remove("hidden");
}
function toggleMobileSearch() {
  const el = document.getElementById("mobile-search");
  el.classList.toggle("hidden");
}


// Hide floating search components on non-result pages using classList
window.addEventListener('DOMContentLoaded', () => {
  const isSearchResultsVisible = !document.getElementById('results')?.classList.contains('hidden');

  if (!isSearchResultsVisible) {
    const idsToHide = ['floating-search', 'mobile-search', 'floating-button', 'recent-searches'];
    idsToHide.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.classList.contains('hidden')) {
        el.classList.add('hidden');
      }

  // Also hide the left project info box on main page
  const infoBox = document.getElementById('project-info');
  if (!isSearchResultsVisible && infoBox) {
    infoBox.style.display = 'none';
  }

});
  }
});
