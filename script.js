const SOLSCAN_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

function formatNumber(num) {
  if (num === undefined || num === null) return 'N/A';
  return Number(num).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error('Network');
  const data = await res.json();
  return data;
}

async function showResults(fromFloating) {
  const ca = fromFloating
    ? document.getElementById('floatingInput')?.value || document.getElementById('mobileInput')?.value
    : document.getElementById('tokenInput').value;

  if (!ca || ca.length < 6) {
    showError();
    return;
  }

  try {
    const meta = await fetchJSON(
      `https://pro-api.solscan.io/v2.0/token/meta?address=${ca.toLowerCase()}`,
      { headers: { token: SOLSCAN_API_KEY } }
    );
    if (!meta || !meta.data || !meta.data.symbol) throw new Error('bad');

    document.getElementById('tokenLogo').src = meta.data.icon || 'assets/logo.png';
    document.getElementById('tokenName').innerHTML = `${meta.data.name} (${meta.data.symbol}) <span class="price" id="tokenPrice"></span>`;

    await populateData(ca.toLowerCase());

    document.getElementById('intro').style.display = 'none';
    document.getElementById('results').classList.remove('hidden');
    document.getElementById('error-message').classList.add('hidden');
    document.getElementById('floating-search')?.classList.remove('hidden');
    document.getElementById('floating-button')?.classList.remove('hidden');
    document.getElementById('recent-searches')?.classList.remove('hidden');

    let recents = JSON.parse(localStorage.getItem('recents') || '[]');
    recents = [ca, ...recents.filter(x => x !== ca)].slice(0, 5);
    localStorage.setItem('recents', JSON.stringify(recents));
    const ul = document.getElementById('recent-list');
    if (ul) ul.innerHTML = recents.map(x => `<li onclick="loadRecent('${x}')">${x}</li>`).join('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    showError();
  }
}

function loadRecent(ca) {
  document.getElementById('floatingInput').value = ca;
  showResults(true);
}

function showError() {
  document.getElementById('results').classList.add('hidden');
  document.getElementById('error-message').classList.remove('hidden');
}

function toggleMobileSearch() {
  const el = document.getElementById('mobile-search');
  el.classList.toggle('hidden');
}

// ---- data population ----
async function populateData(address) {
  try {
    const priceData = await fetchJSON(`https://solana-gateway.moralis.io/token/mainnet/${address}/price`);
    document.getElementById('tokenPrice').innerText = `$${formatNumber(priceData.usdPrice)}`;
  } catch {}

  try {
    const market = await fetchJSON(`https://solana-gateway.moralis.io/token/mainnet/${address}/market-data`);
    document.getElementById('marketCap').innerText = `Market Cap: $${formatNumber(market.marketCapUsd)}`;
    document.getElementById('liquidity').innerText = `Liquidity: $${formatNumber(market.liquidityUsd)}`;
    document.getElementById('supply').innerText = `Supply: ${formatNumber(market.totalSupply)}`;
  } catch {}

  document.getElementById('price-chart-widget-container').innerHTML =
    `<iframe src="https://solana-gateway.moralis.io/price/chart?tokenAddress=${address}" width="100%" height="300" style="border:0;"></iframe>`;

  loadTopHolders(address);
  setupHolderTabs(address);
  loadRecentSwaps(address);
  setupRatioTabs(address);
}

async function loadTopHolders(address) {
  try {
    const data = await fetchJSON(`https://solana-gateway.moralis.io/token/mainnet/${address}/top-holders?limit=10`);
    const list = document.getElementById('top-holders');
    list.innerHTML = data.result.slice(0, 10).map(h =>
      `<li><a href="https://solscan.io/address/${h.address}" target="_blank">${h.address}</a> - ${formatNumber(h.percentageRelativeToTotalSupply)}%</li>`
    ).join('');
  } catch {}
}

function setupHolderTabs(address) {
  const ranges = ['5m', '1h', '6h', '24h', '3d', '7d', '30d'];
  const container = document.getElementById('holder-change-tabs');
  container.innerHTML = ranges.map(r => `<button data-range="${r}">${r}</button>`).join(' ');
  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => loadHolderChange(address, btn.dataset.range));
  });
  loadHolderChange(address, '5m');
}

async function loadHolderChange(address, range) {
  try {
    const data = await fetchJSON(`https://pro-api.solscan.io/v2.0/token/holders?address=${address}&time=${range}`,
      { headers: { token: SOLSCAN_API_KEY } });
    if (!data || !data.data) throw new Error('no');
    const { change, changePercent } = data.data;
    document.getElementById('holder-change-value').innerText = `${formatNumber(change)} (${formatNumber(changePercent)}%)`;
  } catch {
    document.getElementById('holder-change-value').innerText = 'N/A';
  }
}

async function loadRecentSwaps(address) {
  try {
    const data = await fetchJSON(`https://solana-gateway.moralis.io/token/mainnet/${address}/swaps?limit=5`);
    const list = document.getElementById('recent-swaps');
    list.innerHTML = data.result.map(tx => {
      const type = tx.side === 'buy' ? 'green' : 'red';
      const value = formatNumber(tx.quoteTokenAmountUsd);
      return `<li style="color:${type}"><a href="https://solscan.io/tx/${tx.transactionHash}" target="_blank">${tx.walletAddress}</a> - ${value}</li>`;
    }).join('');
  } catch {}
}

function setupRatioTabs(address) {
  const ranges = ['5m', '1h', '6h', '24h'];
  const container = document.getElementById('ratio-tabs');
  container.innerHTML = ranges.map(r => `<button data-range="${r}">${r}</button>`).join(' ');
  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => loadRatio(address, btn.dataset.range));
  });
  loadRatio(address, '5m');
}

async function loadRatio(address, range) {
  try {
    const data = await fetchJSON(`https://deep-index.moralis.io/api/v2.2/tokens/${address}/analytics?timeFrame=${range}`);
    const buy = Number(data.totalBuyVolume || 0);
    const sell = Number(data.totalSellVolume || 0);
    const percent = buy + sell === 0 ? 50 : (buy / (buy + sell)) * 100;
    document.getElementById('ratio-fill').style.width = `${percent}%`;
    document.getElementById('ratio-fill').style.background = percent >= 50 ? 'green' : 'red';
  } catch {
    document.getElementById('ratio-fill').style.width = '50%';
    document.getElementById('ratio-fill').style.background = '#ccc';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const isSearchResultsVisible = !document.getElementById('results')?.classList.contains('hidden');
  if (!isSearchResultsVisible) {
    const idsToHide = ['floating-search', 'mobile-search', 'floating-button', 'recent-searches'];
    idsToHide.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.classList.contains('hidden')) {
        el.classList.add('hidden');
      }
    });
    const infoBox = document.getElementById('project-info');
    if (infoBox) infoBox.style.display = 'none';
  }
});
