let selectedTeamId = '';
let selectedManagerId = '';
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
