let selectedTeamId = '';
let selectedManagerId = '';
let searchQuery = '';
let editMode = false;
let viewMode = 'hierarchy';
let objectivesMap = {};

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

let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panScrollLeft = 0;
let panScrollTop = 0;

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

function collectObjectives(nodes) {
    nodes.forEach(node => {
        objectivesMap[node.id] = { id: node.id, parent_id: node.parent_id || null };
        if (node.children && node.children.length) {
            collectObjectives(node.children);
        }
    });
}

function isDescendant(descendantId, ancestorId) {
    let current = objectivesMap[descendantId];
    while (current) {
        if (current.id === ancestorId) return true;
        current = current.parent_id ? objectivesMap[current.parent_id] : null;
    }
    return false;
}

function calculateKRProgress(kr) {
    const init = parseFloat(kr.initial_value) || 0;
    const curr = parseFloat(kr.current_value) || 0;
    const tgt = parseFloat(kr.target_value) || 0;
    if (init === tgt) return 100;
    if (tgt > init) {
        const progress = ((curr - init) / (tgt - init)) * 100;
        return Math.min(100, Math.max(0, progress));
    } else {
        const progress = ((init - curr) / (init - tgt)) * 100;
        return Math.min(100, Math.max(0, progress));
    }
}
