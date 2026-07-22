function highlightText(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="search-highlight">$1</mark>');
}

function renderTree(nodes, parentElement, isRoot = false) {
    const ul = document.createElement('ul');
    ul.className = 'tree';
    nodes.forEach((node) => {
        const li = document.createElement('li');
        li.className = 'node';
        if (isRoot) li.classList.add('root-objective');
        li.setAttribute('data-object-id', node.id);

        li.addEventListener('dragover', onObjectiveDragOver);
        li.addEventListener('dragleave', onObjectiveDragLeave);
        li.addEventListener('drop', onObjectiveDrop);

        let objectiveColorClass = '';
        if (node.keyResults && node.keyResults.length) {
            const targetKRs = node.keyResults.filter(kr => kr.targetValue > 0 || kr.initialValue > 0);
            if (targetKRs.length > 0) {
                const allAchieved = targetKRs.every(kr => calculateKRProgress(kr) >= 100);
                objectiveColorClass = allAchieved ? 'okr-green' : 'okr-yellow';
            }
        }
        if (objectiveColorClass) li.classList.add(objectiveColorClass);

        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'node-content';
        nodeDiv.dataset.objectId = node.id;

        const objNumber = (node.position ?? 0) + 1;
        const objCode = node.parentId ? `O${objNumber}:` : 'O:';
        let nameHtml = '';
        const handleHtml = `<span class="drag-handle" draggable="true">⠿</span>`;
        const hlName = highlightText(node.name, searchQuery);
        if (node.keyResults && node.keyResults.length) {
            nameHtml += `<span><span class="caret" title="${node.name}"></span>${handleHtml}<span class="objective-label"><span class="objective-number">${objCode}</span> <span class="objective-name" title="${node.name}">${hlName}</span></span></span>`;
        } else {
            nameHtml += `<span>${handleHtml}<span class="objective-label"><span class="objective-number">${objCode}</span> <span class="objective-name" title="${node.name}">${hlName}</span></span></span>`;
        }
        nodeDiv.innerHTML = nameHtml;

        // Objective drag handle events
        const objHandle = nodeDiv.querySelector('.drag-handle');
        if (objHandle) {
            objHandle.addEventListener('dragstart', (e) => {
                if (!editMode) { e.preventDefault(); return; }
                e.dataTransfer.setData('text/plain', 'obj:' + node.id);
                e.dataTransfer.effectAllowed = 'move';
                li.classList.add('dragging');
            });
            objHandle.addEventListener('dragend', () => {
                li.classList.remove('dragging');
                document.querySelectorAll('.node.drop-before, .node.drop-after, .node.drop-child, .kr-row.drop-before, .kr-row.drop-after')
                    .forEach(el => el.classList.remove('drop-before', 'drop-after', 'drop-child'));
            });
        }

        if (node.docLink) {
            const linkIcon = document.createElement('a');
            linkIcon.href = node.docLink;
            linkIcon.target = '_blank';
            linkIcon.rel = 'noopener noreferrer';
            linkIcon.className = 'ms-1 text-decoration-none';
            linkIcon.innerHTML = '🔗';
            linkIcon.title = 'Open docs';
            nodeDiv.appendChild(linkIcon);
        }

        if (node.teamName) {
            const badge = document.createElement('span');
            badge.className = 'badge badge-team';
            badge.textContent = '👥 ' + node.teamName;
            nodeDiv.appendChild(badge);
        }
        if (node.managerName) {
            const badge = document.createElement('span');
            badge.className = 'badge badge-manager';
            badge.textContent = '👤 ' + node.managerName;
            nodeDiv.appendChild(badge);
        }

        if (editMode) {
            const btnEdit = document.createElement('button');
            btnEdit.className = 'btn btn-outline-secondary btn-sm py-0';
            btnEdit.textContent = '✎';
            btnEdit.onclick = (e) => { e.stopPropagation(); editObjective(node.id); };
            nodeDiv.appendChild(btnEdit);
            const btnDel = document.createElement('button');
            btnDel.className = 'btn btn-outline-danger btn-sm py-0';
            btnDel.textContent = '🗑️';
            btnDel.onclick = (e) => { e.stopPropagation(); deleteObjective(node.id); };
            nodeDiv.appendChild(btnDel);
            const btnObj = document.createElement('button');
            btnObj.className = 'btn btn-outline-warning btn-sm py-0';
            btnObj.textContent = '+Obj';
            btnObj.title = 'Add Sub-Objective';
            btnObj.onclick = (e) => {
                e.stopPropagation();
                prepareObjForm(node.id, node.teamId, node.managerId);
                bootstrap.Modal.getOrCreateInstance(document.getElementById('objModal')).show();
            };
            nodeDiv.appendChild(btnObj);
            const btnKR = document.createElement('button');
            btnKR.className = 'btn btn-outline-success btn-sm py-0';
            btnKR.textContent = '+KR';
            btnKR.onclick = (e) => { e.stopPropagation(); addKR(node.id, objCode, node.name); };
            nodeDiv.appendChild(btnKR);
            const btnInit = document.createElement('button');
            btnInit.className = 'btn btn-outline-info btn-sm py-0';
            btnInit.textContent = '+Init';
            btnInit.title = 'Add Initiative';
            btnInit.onclick = (e) => { e.stopPropagation(); addInitiative(node.id); };
            nodeDiv.appendChild(btnInit);
        }

        li.appendChild(nodeDiv);

        if (node.keyResults && node.keyResults.length) {
            const krDiv = document.createElement('div');
            krDiv.className = 'kr-item';
            node.keyResults.forEach((kr) => {
                const krNumber = node.parentId ? `KR${objNumber}.${(kr.position ?? 0) + 1}` : `KR${(kr.position ?? 0) + 1}`;
                const pct = calculateKRProgress(kr);
                let krClass = '';
                if ((kr.targetValue > 0 || kr.initialValue > 0) && pct >= 0) {
                    krClass = pct >= 100 ? 'kr-green' : 'kr-yellow';
                }
                let lastUpdated = '—';
                if (kr.lastUpdated) {
                    const d = new Date(kr.lastUpdated + 'Z');
                    lastUpdated = isNaN(d) ? '—' : d.toLocaleString();
                }
                const source = kr.source === 'api' ? 'external API' : 'manual edit';
                const progressTitle = pct === -1
                    ? 'Progress: N/A (not configured)\nInitial: 0\nCurrent: 0\nTarget: 0\nValue last updated: —\nSource: —'
                    : `Progress: ${Math.round(pct)}%\nInitial: ${kr.initialValue || 0}\nCurrent: ${kr.currentValue}\nTarget: ${kr.targetValue} ${kr.unit}\nValue last updated: ${lastUpdated}\nSource: ${source}`;
                const pctClass = pct === -1 ? 'progress-bar-empty' : pct >= 70 ? 'progress-bar-high' : pct >= 25 ? 'progress-bar-mid' : 'progress-bar-low';
                const krRow = document.createElement('div');
                krRow.className = 'kr-row ' + krClass;
                krRow.dataset.krId = kr.id;

                krRow.addEventListener('click', (e) => {
                    if (editMode) return;
                    if (e.target.closest('.drag-handle, .btn, .progress')) return;
                    showKRDetail(kr, krNumber);
                });

                const robotIcon = kr.source === 'api' ? '<span class="ms-1" title="Updated automatically via external API call">🤖</span>' : '';
                const krHandleHtml = `<span class="drag-handle" draggable="true">⠿</span>`;
                const confVal = kr.confidence || 'medium';
                const confLabel = confVal === 'medium' ? 'Med' : confVal.charAt(0).toUpperCase() + confVal.slice(1);
                krRow.innerHTML = `
                    ${krHandleHtml}📊 <span class="kr-label"><strong class="kr-number">${krNumber}:</strong> <strong class="kr-name" title="${kr.name}">${highlightText(kr.name, searchQuery)}</strong></span> (${kr.currentValue} / ${kr.targetValue} ${kr.unit})
                    <div class="progress" title="${progressTitle.replace(/"/g, '&quot;')}"><div class="progress-bar ${pctClass}" style="width:${pct === -1 ? 100 : pct}%">${pct === -1 ? 'N/A' : Math.round(pct) + '%'}</div></div>${robotIcon}<span class="cs cs-${confVal}" title="Confidence Score">${confLabel}</span>`;

                // KR drag handle events
                const krHandle = krRow.querySelector('.drag-handle');
                if (krHandle) {
                    krHandle.addEventListener('dragstart', (e) => {
                        if (!editMode) { e.preventDefault(); return; }
                        e.dataTransfer.setData('text/plain', 'kr:' + kr.id);
                        e.dataTransfer.effectAllowed = 'move';
                        krRow.classList.add('dragging');
                    });
                    krHandle.addEventListener('dragend', () => {
                        krRow.classList.remove('dragging');
                        document.querySelectorAll('.node.drop-before, .node.drop-after, .kr-row.drop-before, .kr-row.drop-after')
                            .forEach(el => el.classList.remove('drop-before', 'drop-after'));
                    });
                }

                // KR drop handlers
                krRow.addEventListener('dragover', onKRDragOver);
                krRow.addEventListener('dragleave', onKRDragLeave);
                krRow.addEventListener('drop', onKRDrop);

                if (editMode) {
                    const btnEdit = document.createElement('button');
                    btnEdit.className = 'btn btn-outline-secondary btn-sm py-0 ms-2';
                    btnEdit.textContent = '✎';
                    btnEdit.onclick = () => editKR(kr.id, krNumber, node.name);
                    krRow.appendChild(btnEdit);
                    const btnDel = document.createElement('button');
                    btnDel.className = 'btn btn-outline-danger btn-sm py-0';
                    btnDel.textContent = '🗑️';
                    btnDel.onclick = () => deleteKR(kr.id);
                    krRow.appendChild(btnDel);
                }
                krDiv.appendChild(krRow);
            });
            li.appendChild(krDiv);
        }

        if (node.initiatives && node.initiatives.length) {
            const initDiv = document.createElement('div');
            initDiv.className = 'kr-item';
            node.initiatives.forEach((init) => {
                const initNumber = node.parentId ? `I${objNumber}.${(init.position ?? 0) + 1}` : `I${(init.position ?? 0) + 1}`;
                const initRow = document.createElement('div');
                initRow.className = 'init-row';
                initRow.dataset.initiativeId = init.id;

                const statusMap = { backlog: 'Backlog', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };
                const initStatus = init.status || 'backlog';
                const initHandleHtml = `<span class="drag-handle" draggable="true">⠿</span>`;
                initRow.innerHTML = `
                    ${initHandleHtml}📋 <span class="init-label"><strong class="init-number">${initNumber}:</strong> <strong class="init-name" title="${init.name}">${highlightText(init.name, searchQuery)}</strong></span>
                    <span class="status status-${initStatus}">${statusMap[initStatus] || initStatus}</span>`;

                initRow.addEventListener('click', (e) => {
                    if (editMode) return;
                    if (e.target.closest('.drag-handle, .btn')) return;
                    showInitiativeDetail(init, initNumber, objNumber, node.name);
                });

                const initHandle = initRow.querySelector('.drag-handle');
                if (initHandle) {
                    initHandle.addEventListener('dragstart', (e) => {
                        if (!editMode) { e.preventDefault(); return; }
                        e.dataTransfer.setData('text/plain', 'init:' + init.id);
                        e.dataTransfer.effectAllowed = 'move';
                        initRow.classList.add('dragging');
                    });
                    initHandle.addEventListener('dragend', () => {
                        initRow.classList.remove('dragging');
                        document.querySelectorAll('.node.drop-before, .node.drop-after, .kr-row.drop-before, .kr-row.drop-after, .init-row.drop-before, .init-row.drop-after')
                            .forEach(el => el.classList.remove('drop-before', 'drop-after'));
                    });
                }

                initRow.addEventListener('dragover', onInitiativeDragOver);
                initRow.addEventListener('dragleave', onInitiativeDragLeave);
                initRow.addEventListener('drop', onInitiativeDrop);

                if (editMode) {
                    const btnEdit = document.createElement('button');
                    btnEdit.className = 'btn btn-outline-secondary btn-sm py-0 ms-2';
                    btnEdit.textContent = '✎';
                    btnEdit.onclick = () => editInitiative(init.id);
                    initRow.appendChild(btnEdit);
                    const btnDel = document.createElement('button');
                    btnDel.className = 'btn btn-outline-danger btn-sm py-0';
                    btnDel.textContent = '🗑️';
                    btnDel.onclick = () => deleteInitiative(init.id);
                    initRow.appendChild(btnDel);
                }
                initDiv.appendChild(initRow);
            });
            li.appendChild(initDiv);
        }

        if (node.children && node.children.length) {
            renderTree(node.children, li, false);
        }
        ul.appendChild(li);
    });
    parentElement.appendChild(ul);
}

// ── Objective DnD ─────────────────────────────────────────────────

let _draggedId = null;
let _dragType = null;

function onObjectiveDragOver(e) {
    if (!editMode) return;
    if (!e.dataTransfer.types.length) return;
    e.preventDefault();
    e.stopPropagation();

    document.querySelectorAll('.node.drop-before, .node.drop-after, .node.drop-child')
        .forEach(el => el.classList.remove('drop-before', 'drop-after', 'drop-child'));

    const li = e.currentTarget;
    const childUl = li.querySelector(':scope > ul.tree');
    const targetEl = e.target.nodeType === 1 ? e.target : e.target.parentElement;
    const isChildHover = childUl && childUl.contains(targetEl) && targetEl.closest('li') === li;

    if (isChildHover) {
        li.classList.add('drop-child');
        return;
    }

    const rect = li.getBoundingClientRect();
    const insertAfter = e.clientY > rect.top + rect.height / 2;
    li.classList.toggle('drop-before', !insertAfter);
    li.classList.toggle('drop-after', insertAfter);
}

function onObjectiveDragLeave(e) {
    const li = e.currentTarget;
    li.classList.remove('drop-before', 'drop-after', 'drop-child');
}

async function onObjectiveDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const targetLi = e.currentTarget;
    targetLi.classList.remove('drop-before', 'drop-after', 'drop-child');

    const raw = e.dataTransfer.getData('text/plain');
    if (!raw || !raw.startsWith('obj:')) return;
    const draggedId = raw.slice(4);
    const targetId = targetLi.dataset.objectId;
    if (!draggedId || draggedId === targetId) return;

    const childUl = targetLi.querySelector(':scope > ul.tree');
    const targetEl = e.target.nodeType === 1 ? e.target : e.target.parentElement;
    const isChildDrop = childUl && childUl.contains(targetEl) && targetEl.closest('li') === targetLi;

    if (isChildDrop) {
        // Drop on children area → insert as child
        const oldLi = document.querySelector(`li[data-object-id="${draggedId}"]`);
        if (oldLi) {
            const oldIds = Array.from(oldLi.parentElement.querySelectorAll(':scope > .node[data-object-id]'))
                .map(el => el.dataset.objectId).filter(id => id !== draggedId);
            if (oldIds.length) {
                await fetch('/api/objectives/reorder', {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({items: oldIds.map((id, i) => ({id, position: i}))})
                });
            }
        }
        await fetch(`/api/objectives/${draggedId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({parentId: targetId})
        });
        await refreshTree({ skipSkeleton: true });
        return;
    }

    // Sibling insertion
    const ul = targetLi.parentElement;
    const siblings = Array.from(ul.querySelectorAll(':scope > .node[data-object-id]'));
    const rect = targetLi.getBoundingClientRect();
    const insertAfter = e.clientY > rect.top + rect.height / 2;
    const ids = siblings.map(el => el.dataset.objectId);

    const fromIdx = ids.indexOf(draggedId);
    if (fromIdx !== -1) {
        ids.splice(fromIdx, 1);
        const toIdx = ids.indexOf(targetId) + (insertAfter ? 1 : 0);
        ids.splice(toIdx, 0, draggedId);
        reorderObjectives(ids.map((id, i) => ({id, position: i})));
        return;
    }

    // Cross-parent sibling move
    const parentLi = ul.closest('li[data-object-id]');
    const newParentId = parentLi ? parentLi.dataset.objectId : null;

    const oldLi = document.querySelector(`li[data-object-id="${draggedId}"]`);
    if (oldLi) {
        const oldIds = Array.from(oldLi.parentElement.querySelectorAll(':scope > .node[data-object-id]'))
            .map(el => el.dataset.objectId).filter(id => id !== draggedId);
        if (oldIds.length) {
            await fetch('/api/objectives/reorder', {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({items: oldIds.map((id, i) => ({id, position: i}))})
            });
        }
    }

    const toIdx = ids.indexOf(targetId) + (insertAfter ? 1 : 0);
    ids.splice(toIdx, 0, draggedId);
    const newItems = ids.map((id, i) => ({id, position: i}));

    await fetch(`/api/objectives/${draggedId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({parentId: newParentId})
    });
    await reorderObjectives(newItems);
}

// ── KR DnD ────────────────────────────────────────────────────────

function onKRDragOver(e) {
    if (!editMode) return;
    if (!e.dataTransfer.types.length) return;
    e.preventDefault();
    e.stopPropagation();

    document.querySelectorAll('.kr-row.drop-before, .kr-row.drop-after')
        .forEach(el => el.classList.remove('drop-before', 'drop-after'));

    const row = e.currentTarget;
    const rect = row.getBoundingClientRect();
    const insertAfter = e.clientY > rect.top + rect.height / 2;
    row.classList.toggle('drop-before', !insertAfter);
    row.classList.toggle('drop-after', insertAfter);
}

function onKRDragLeave(e) {
    const row = e.currentTarget;
    row.classList.remove('drop-before', 'drop-after');
}

function onKRDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const targetRow = e.currentTarget;
    targetRow.classList.remove('drop-before', 'drop-after');

    const raw = e.dataTransfer.getData('text/plain');
    if (!raw || !raw.startsWith('kr:')) return;
    const draggedId = raw.slice(3);
    const container = targetRow.parentElement;
    if (!container) return;

    const siblings = Array.from(container.querySelectorAll(':scope > .kr-row[data-kr-id]'));
    const targetId = targetRow.dataset.krId;
    if (!draggedId || draggedId === targetId) return;

    const rect = targetRow.getBoundingClientRect();
    const insertAfter = e.clientY > rect.top + rect.height / 2;
    const ids = siblings.map(el => el.dataset.krId);

    const fromIdx = ids.indexOf(draggedId);
    if (fromIdx === -1) return;
    ids.splice(fromIdx, 1);
    const toIdx = ids.indexOf(targetId) + (insertAfter ? 1 : 0);
    ids.splice(toIdx, 0, draggedId);

    const items = ids.map((id, i) => ({id, position: i}));
    reorderKRs(items);
}

// ── Initiative DnD ────────────────────────────────────────────────

function onInitiativeDragOver(e) {
    if (!editMode) return;
    if (!e.dataTransfer.types.length) return;
    e.preventDefault();
    e.stopPropagation();

    document.querySelectorAll('.init-row.drop-before, .init-row.drop-after')
        .forEach(el => el.classList.remove('drop-before', 'drop-after'));

    const row = e.currentTarget;
    const rect = row.getBoundingClientRect();
    const insertAfter = e.clientY > rect.top + rect.height / 2;
    row.classList.toggle('drop-before', !insertAfter);
    row.classList.toggle('drop-after', insertAfter);
}

function onInitiativeDragLeave(e) {
    const row = e.currentTarget;
    row.classList.remove('drop-before', 'drop-after');
}

function onInitiativeDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const targetRow = e.currentTarget;
    targetRow.classList.remove('drop-before', 'drop-after');

    const raw = e.dataTransfer.getData('text/plain');
    if (!raw || !raw.startsWith('init:')) return;
    const draggedId = raw.slice(5);
    const container = targetRow.parentElement;
    if (!container) return;

    const siblings = Array.from(container.querySelectorAll(':scope > .init-row[data-initiative-id]'));
    const targetId = targetRow.dataset.initiativeId;
    if (!draggedId || draggedId === targetId) return;

    const rect = targetRow.getBoundingClientRect();
    const insertAfter = e.clientY > rect.top + rect.height / 2;
    const ids = siblings.map(el => el.dataset.initiativeId);

    const fromIdx = ids.indexOf(draggedId);
    if (fromIdx === -1) return;
    ids.splice(fromIdx, 1);
    const toIdx = ids.indexOf(targetId) + (insertAfter ? 1 : 0);
    ids.splice(toIdx, 0, draggedId);

    const items = ids.map((id, i) => ({id, position: i}));
    reorderInitiatives(items);
}

// ── Tree graphic view ─────────────────────────────────────────────

function renderTreeGraphic(nodes, container) {
    document.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => {
        const popover = bootstrap.Popover.getInstance(el);
        if (popover) popover.dispose();
    });

    container.innerHTML = '';
    if (!nodes.length) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'graph-wrapper';
    wrapper.id = 'graph-wrapper';

    function createNodeElement(node, isRoot = false) {
        const group = document.createElement('div');
        group.className = 'node-group';
        group.setAttribute('data-object-id', node.id);

        const box = document.createElement('div');
        box.className = 'node-box';
        if (isRoot) box.classList.add('root-node');

        let krClass = '';
        if (node.keyResults && node.keyResults.length) {
            const targetKRs = node.keyResults.filter(kr => kr.targetValue > 0 || kr.initialValue > 0);
            if (targetKRs.length > 0) {
                const allAchieved = targetKRs.every(kr => calculateKRProgress(kr) >= 100);
                krClass = allAchieved ? 'okr-green' : 'okr-yellow';
            }
        }
        if (krClass) box.classList.add(krClass);

        const objIndex = (node.position ?? 0) + 1;
        const objCode = node.parentId ? `O${objIndex}:` : 'O:';
        const objNumberSpan = `<span class="obj-number">${objCode}</span>`;
        let boxHtml = `<div class="objective-title">${objNumberSpan} ${highlightText(node.name, searchQuery)}`;
        if (node.docLink) {
            boxHtml += ` <a href="${node.docLink}" target="_blank" rel="noopener noreferrer" class="text-decoration-none" title="Open docs">🔗</a>`;
        }
        boxHtml += `</div>`;
        const meta = [];
        if (node.teamName) meta.push(`👥 ${node.teamName}`);
        if (node.managerName) meta.push(`👤 ${node.managerName}`);
        if (meta.length) boxHtml += `<div class="objective-meta">${meta.join(' · ')}</div>`;
        box.innerHTML = boxHtml;

        const popoverParts = [];
        if (node.keyResults && node.keyResults.length) {
            node.keyResults.forEach(kr => {
                const pct = calculateKRProgress(kr);
                const statusIcon = pct >= 100 ? '✅' : '📊';
                popoverParts.push(`<div class="mb-1">${statusIcon} <strong>${highlightText(kr.name, searchQuery)}</strong>: ${kr.currentValue} → ${kr.targetValue} ${kr.unit} (${Math.round(pct)}%)</div>`);
            });
        }
        if (node.initiatives && node.initiatives.length) {
            popoverParts.push(`<hr class="my-1" style="border-color:#e2e8f0"><div class="mb-1" style="color:#0891b2;font-weight:600;font-size:0.75rem">INITIATIVES</div>`);
            node.initiatives.forEach(init => {
                popoverParts.push(`<div class="mb-1">📋 <strong>${highlightText(init.name, searchQuery)}</strong></div>`);
            });
        }
        if (popoverParts.length) {
            box.setAttribute('data-bs-toggle', 'popover');
            box.setAttribute('data-bs-html', 'true');
            box.setAttribute('data-bs-trigger', 'hover focus');
            box.setAttribute('data-bs-placement', 'auto');
            box.setAttribute('data-bs-content', popoverParts.join(''));
        }

        group.appendChild(box);

        if (node.children && node.children.length) {
            const childrenRow = document.createElement('div');
            childrenRow.className = 'children-row';
            node.children.forEach((child) => {
                childrenRow.appendChild(createNodeElement(child, false));
            });
            group.appendChild(childrenRow);
        }
        return group;
    }

    const rootsRow = document.createElement('div');
    rootsRow.className = 'roots-row';
    nodes.forEach((node) => {
        rootsRow.appendChild(createNodeElement(node, true));
    });
    wrapper.appendChild(rootsRow);
    container.appendChild(wrapper);

    [].slice.call(wrapper.querySelectorAll('[data-bs-toggle="popover"]')).map(el => new bootstrap.Popover(el));

    graphCurrentRoots = nodes;
    drawGraphConnections(wrapper, nodes);

    if (graphResizeHandler) window.removeEventListener('resize', graphResizeHandler);
    graphResizeHandler = () => { drawGraphConnections(wrapper, nodes); };
    window.addEventListener('resize', graphResizeHandler);

    centerTreePanel();
}

function centerTreePanel() {
    const panel = document.getElementById('treePanel');
    const wrapper = document.getElementById('graph-wrapper');
    if (!panel || !wrapper) return;
    requestAnimationFrame(() => {
        const panelWidth = panel.clientWidth;
        const wrapperWidth = wrapper.scrollWidth;
        if (wrapperWidth > panelWidth) {
            panel.scrollLeft = (wrapperWidth - panelWidth) / 2;
        }
    });
}

function drawGraphConnections(wrapper, rootNodes) {
    const oldSvg = wrapper.querySelector('svg.graph-lines');
    if (oldSvg) oldSvg.remove();

    const wrapperRect = wrapper.getBoundingClientRect();
    if (wrapperRect.width === 0 || wrapperRect.height === 0) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('graph-lines');
    svg.setAttribute('width', wrapperRect.width);
    svg.setAttribute('height', wrapperRect.height);
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '0';
    svg.style.overflow = 'visible';

    function drawLines(node) {
        const parentEl = wrapper.querySelector(`.node-group[data-object-id="${node.id}"] > .node-box`);
        if (!parentEl || !node.children || !node.children.length) return;

        const parentRect = parentEl.getBoundingClientRect();
        const parentBottom = {
            x: parentRect.left - wrapperRect.left + parentRect.width / 2,
            y: parentRect.top - wrapperRect.top + parentRect.height
        };

        node.children.forEach(child => {
            const childEl = wrapper.querySelector(`.node-group[data-object-id="${child.id}"] > .node-box`);
            if (!childEl) return;
            const childRect = childEl.getBoundingClientRect();
            const childTop = {
                x: childRect.left - wrapperRect.left + childRect.width / 2,
                y: childRect.top - wrapperRect.top
            };

            const deltaY = childTop.y - parentBottom.y;
            const offsetY = Math.min(deltaY * 0.4, 40);
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d = `M ${parentBottom.x} ${parentBottom.y} C ${parentBottom.x} ${parentBottom.y + offsetY}, ${childTop.x} ${childTop.y - offsetY}, ${childTop.x} ${childTop.y}`;
            path.setAttribute('d', d);
            path.setAttribute('stroke', '#cbd5e1');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
            svg.appendChild(path);
        });

        node.children.forEach(child => drawLines(child));
    }

    rootNodes.forEach(node => drawLines(node));
    wrapper.appendChild(svg);
}

function toggleAllKRs() {
    const krItems = document.querySelectorAll('.kr-item');
    const carets = document.querySelectorAll('.caret');
    const btn = document.getElementById('collapseKRBtn');
    const anyExpanded = Array.from(krItems).some(item => item.classList.contains('active'));

    krItems.forEach(item => item.classList.toggle('active', !anyExpanded));
    carets.forEach(caret => caret.classList.toggle('caret-down', !anyExpanded));
    btn.textContent = anyExpanded ? '⊞' : '⊟';
}
