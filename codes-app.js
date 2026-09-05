import { CodesStore } from './src/codes-store.js';
import { categoryOrder, codeCategories, codes } from './src/data/codes.js';

const store = new CodesStore();
let searchQuery = '';
let selectedCategory = 'all';

function showToast(message) {
    const region = document.getElementById('toastRegion');
    if (!region) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    region.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => {
        toast.classList.remove('is-visible');
        setTimeout(() => toast.remove(), 250);
    }, 2000);
}

function spawnFloatingText(text, x, y) {
    const el = document.createElement('div');
    el.className = 'floating-copy-text';
    el.textContent = `COPIED ${text}!`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

function copyToClipboard(text, anchorElement, codeName, event) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`Copied "${codeName || text}" to clipboard!`);
        if (event && event.clientX && event.clientY) {
            spawnFloatingText(codeName || text, event.clientX, event.clientY);
        }
        if (anchorElement) {
            const original = anchorElement.textContent;
            anchorElement.textContent = 'Copied!';
            setTimeout(() => {
                anchorElement.textContent = original;
            }, 1200);
        }
    }).catch(() => {
        showToast('Unable to copy code to clipboard.');
    });
}

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderCategoryPills() {
    const container = document.getElementById('categoryPills');
    if (!container) return;

    container.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = `category-pill ${selectedCategory === 'all' ? 'is-active' : ''}`;
    allBtn.textContent = 'All Categories';
    allBtn.addEventListener('click', () => {
        selectedCategory = 'all';
        renderCategoryPills();
        renderCodes();
    });
    container.appendChild(allBtn);

    const categoriesInUse = categoryOrder || Object.keys(codeCategories);
    for (const catKey of categoriesInUse) {
        const catName = codeCategories[catKey];
        if (!catName) continue;
        const count = codes.filter(c => c.category === catKey).length;
        if (count === 0) continue;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `category-pill ${selectedCategory === catKey ? 'is-active' : ''}`;
        btn.textContent = `${catName} (${count})`;
        btn.addEventListener('click', () => {
            selectedCategory = catKey;
            renderCategoryPills();
            renderCodes();
        });
        container.appendChild(btn);
    }
}

function renderCodes() {
    const list = document.getElementById('codesList');
    const emptyState = document.getElementById('codesEmptyState');
    const countEl = document.getElementById('codesCount');
    if (!list) return;

    const query = searchQuery.trim().toLowerCase();
    const filteredCodes = codes.filter(item => {
        if (selectedCategory !== 'all' && item.category !== selectedCategory) {
            return false;
        }
        if (store.hideRedeemed && store.isRedeemed(item.code)) {
            return false;
        }
        if (query) {
            const categoryName = item.category ? (codeCategories[item.category] || item.category) : '';
            const haystack = `${item.code} ${item.reward || ''} ${item.source || ''} ${categoryName}`.toLowerCase();
            if (!haystack.includes(query)) return false;
        }
        return true;
    });

    const activeTotal = codes.filter(c => c.active).length;
    const redeemedCount = codes.filter(c => store.isRedeemed(c.code)).length;
    if (countEl) {
        countEl.textContent = `${codes.length - redeemedCount} / ${activeTotal} unredeemed`;
    }

    if (filteredCodes.length === 0) {
        list.innerHTML = '';
        if (emptyState) emptyState.hidden = false;
        return;
    }

    if (emptyState) emptyState.hidden = true;
    list.innerHTML = '';

    for (const item of filteredCodes) {
        const isRedeemed = store.isRedeemed(item.code);
        const row = document.createElement('div');
        row.className = `code-row ${isRedeemed ? 'is-redeemed' : ''}`;
        row.dataset.code = item.code;

        const categoryName = item.category ? (codeCategories[item.category] || item.category) : null;
        let sourceContent;
        if (item.link && item.link.trim()) {
            sourceContent = `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="code-source-link">
                    ${escapeHtml(item.source || categoryName || 'Source')}
                    <svg viewBox="0 0 24 24" aria-hidden="true" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6m4-3h6v6m-11 5L21 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
               </a>`;
        } else if (item.source && item.source.trim()) {
            sourceContent = `<span class="code-source-text">${escapeHtml(item.source)}</span>`;
        } else if (categoryName) {
            sourceContent = `<span class="code-category-badge">${escapeHtml(categoryName)}</span>`;
        } else {
            sourceContent = `<span class="code-source-text">—</span>`;
        }

        row.innerHTML = `
            <div class="code-value-cell">
                <button type="button" class="code-copy-pill" aria-label="Copy code ${escapeHtml(item.code)}" title="Click to copy">
                    <code>${escapeHtml(item.code)}</code>
                </button>
            </div>
            <div class="code-reward-cell">
                <span class="reward-tag">${escapeHtml(item.reward || 'Reward')}</span>
            </div>
            <div class="code-source-cell">
                ${sourceContent}
            </div>
            <div class="code-actions-cell">
                <button type="button" class="action-button code-action-copy" aria-label="Copy code ${escapeHtml(item.code)}">
                    Copy
                </button>
                <button type="button" class="action-button ${isRedeemed ? 'action-redeemed' : 'action-primary'}" aria-label="${isRedeemed ? 'Mark unredeemed' : 'Mark redeemed'} ${escapeHtml(item.code)}">
                    ${isRedeemed ? 'Redeemed' : 'Mark Redeemed'}
                </button>
            </div>
        `;

        const codePill = row.querySelector('.code-copy-pill');
        codePill.addEventListener('click', e => copyToClipboard(item.code, codePill.querySelector('code'), item.code, e));

        const copyBtn = row.querySelector('.code-action-copy');
        copyBtn.addEventListener('click', e => copyToClipboard(item.code, copyBtn, item.code, e));

        const redeemBtn = row.querySelectorAll('.code-actions-cell button')[1];
        redeemBtn.addEventListener('click', () => {
            store.toggleRedeem(item.code);
        });

        list.appendChild(row);
    }
}

function init() {
    const searchInput = document.getElementById('searchCodes');
    const hideRedeemedToggle = document.getElementById('hideRedeemedToggle');
    const redeemAllBtn = document.getElementById('redeemAllBtn');
    const unredeemAllBtn = document.getElementById('unredeemAllBtn');

    if (searchInput) {
        searchInput.addEventListener('input', e => {
            searchQuery = e.target.value;
            renderCodes();
        });
    }

    if (hideRedeemedToggle) {
        hideRedeemedToggle.checked = store.hideRedeemed;
        hideRedeemedToggle.addEventListener('change', e => {
            store.setHideRedeemed(e.target.checked);
        });
    }

    if (redeemAllBtn) {
        redeemAllBtn.addEventListener('click', () => {
            store.redeemAll(codes);
            showToast('All codes marked as redeemed!');
        });
    }

    if (unredeemAllBtn) {
        unredeemAllBtn.addEventListener('click', () => {
            store.unredeemAll();
            showToast('All codes marked as unredeemed.');
        });
    }

    store.subscribe(() => {
        if (hideRedeemedToggle) {
            hideRedeemedToggle.checked = store.hideRedeemed;
        }
        renderCodes();
    });

    window.addEventListener('storage', () => {
        store.reload();
    });

    renderCategoryPills();
    renderCodes();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

