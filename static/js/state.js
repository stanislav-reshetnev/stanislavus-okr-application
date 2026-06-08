let selectedCycleId = '';
let cyclesList = [];
let selectedTeamId = '';
let selectedManagerId = '';
let searchQuery = '';
let editMode = false;
let viewMode = 'hierarchy';

let graphResizeHandler = null;
let graphCurrentRoots = null;

const editModeToggle = document.getElementById('editModeToggle');
const createObjBtn = document.getElementById('createObjBtn');
const teamsBtn = document.getElementById('teamsBtn');
const managersBtn = document.getElementById('managersBtn');
const viewModeGroup = document.getElementById('viewModeGroup');
const body = document.body;
const treePanel = document.getElementById('treePanel');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const collapseKRBtn = document.getElementById('collapseKRBtn');
const usersBtn = document.getElementById('usersBtn');

let isLoading = false;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panScrollLeft = 0;
let panScrollTop = 0;

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast-notification ' + type;
    el.textContent = message;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
        el.classList.remove('show');
        el.addEventListener('transitionend', () => el.remove());
    }, duration);
}

function initTreePan() {
    const panel = document.getElementById('treePanel');
    if (!panel) return;

    panel.addEventListener('mousedown', (e) => {
        if (viewMode !== 'tree') return;
        if (e.button !== 0) return;
        if (e.target.closest('.node-box') || e.target.closest('button') ||
            e.target.closest('a') || e.target.closest('.popover') ||
            e.target.closest('.fullscreen-btn') || e.target.closest('.btn'))
            return;

        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panScrollLeft = panel.scrollLeft;
        panScrollTop = panel.scrollTop;
        panel.classList.add('panning');
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        panel.scrollLeft = panScrollLeft - dx;
        panel.scrollTop = panScrollTop - dy;
    });

    document.addEventListener('mouseup', () => {
        if (!isPanning) return;
        isPanning = false;
        panel.classList.remove('panning');
    });
}

function buildNumberedTree(objectives) {
    const objMap = {};
    objectives.forEach(o => {
        objMap[o.id] = { ...o, children: [] };
    });
    const roots = [];
    Object.values(objMap).forEach(o => {
        if (o.parentId && objMap[o.parentId]) {
            objMap[o.parentId].children.push(o);
        } else {
            roots.push(o);
        }
    });
    function sortByPosition(nodes) {
        nodes.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        nodes.forEach(n => sortByPosition(n.children));
    }
    sortByPosition(roots);
    const result = [];
    function walk(nodes, prefix) {
        nodes.forEach(node => {
            const localNum = (node.position ?? 0) + 1;
            const code = prefix ? `${prefix}.${localNum}` : `O${localNum}`;
            node.displayCode = code;
            result.push(node);
            if (node.children.length) walk(node.children, code);
        });
    }
    walk(roots, '');
    return result;
}

function calculateKRProgress(kr) {
    const init = parseFloat(kr.initialValue) || 0;
    const curr = parseFloat(kr.currentValue) || 0;
    const tgt = parseFloat(kr.targetValue) || 0;
    if (init === 0 && tgt === 0) return -1;
    if (init === tgt) return 100;
    if (tgt > init) {
        const progress = ((curr - init) / (tgt - init)) * 100;
        return Math.min(100, Math.max(0, progress));
    } else {
        const progress = ((init - curr) / (init - tgt)) * 100;
        return Math.min(100, Math.max(0, progress));
    }
}
