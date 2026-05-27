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
        let nameHtml = '';
        const handleHtml = `<span class="drag-handle" draggable="true">⠿</span>`;
        if (node.keyResults && node.keyResults.length) {
            nameHtml += `<span class="caret" title="${node.name}">`;
            nameHtml += `${handleHtml}<span class="objective-number">O${objNumber}:</span> <span class="objective-name" title="${node.name}">${node.name}</span></span>`;
        } else {
            nameHtml += `<span>${handleHtml}<span class="objective-number">O${objNumber}:</span> <span class="objective-name" title="${node.name}">${node.name}</span></span>`;
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
                document.querySelectorAll('.node.drop-before, .node.drop-after, .kr-row.drop-before, .kr-row.drop-after')
                    .forEach(el => el.classList.remove('drop-before', 'drop-after'));
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
            const btnKR = document.createElement('button');
            btnKR.className = 'btn btn-outline-success btn-sm py-0';
            btnKR.textContent = '+KR';
            btnKR.onclick = (e) => { e.stopPropagation(); addKR(node.id); };
            nodeDiv.appendChild(btnKR);
        }

        li.appendChild(nodeDiv);

        if (node.keyResults && node.keyResults.length) {
            const krDiv = document.createElement('div');
            krDiv.className = 'kr-item';
            node.keyResults.forEach((kr) => {
                const krNumber = `KR${objNumber}.${(kr.position ?? 0) + 1}`;
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
                    ${krHandleHtml}📊 <strong class="kr-number">${krNumber}:</strong> <strong class="kr-name" title="${kr.name}">${kr.name}</strong> (${kr.currentValue} / ${kr.targetValue} ${kr.unit})
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
                    btnEdit.onclick = () => editKR(kr.id);
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

    document.querySelectorAll('.node.drop-before, .node.drop-after')
        .forEach(el => el.classList.remove('drop-before', 'drop-after'));

    const li = e.currentTarget;
    const rect = li.getBoundingClientRect();
    const insertAfter = e.clientY > rect.top + rect.height / 2;
    li.classList.toggle('drop-before', !insertAfter);
    li.classList.toggle('drop-after', insertAfter);
}

function onObjectiveDragLeave(e) {
    const li = e.currentTarget;
    li.classList.remove('drop-before', 'drop-after');
}

function onObjectiveDrop(e) {
    e.preventDefault();
    const targetLi = e.currentTarget;
    targetLi.classList.remove('drop-before', 'drop-after');

    const raw = e.dataTransfer.getData('text/plain');
    if (!raw || !raw.startsWith('obj:')) return;
    const draggedId = raw.slice(4);
    const targetId = targetLi.dataset.objectId;
    if (!draggedId || draggedId === targetId) return;

    const ul = targetLi.parentElement;
    const siblings = Array.from(ul.querySelectorAll(':scope > .node[data-object-id]'));
    const rect = targetLi.getBoundingClientRect();
    const insertAfter = e.clientY > rect.top + rect.height / 2;
    const ids = siblings.map(el => el.dataset.objectId);

    const fromIdx = ids.indexOf(draggedId);
    if (fromIdx === -1) return;
    ids.splice(fromIdx, 1);
    const toIdx = ids.indexOf(targetId) + (insertAfter ? 1 : 0);
    ids.splice(toIdx, 0, draggedId);

    const items = ids.map((id, i) => ({id, position: i}));
    reorderObjectives(items);
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
        const objNumberSpan = `<span class="obj-number">O${objIndex}:</span>`;
        let boxHtml = `<div class="objective-title">${objNumberSpan} ${node.name}`;
        if (node.docLink) {
            boxHtml += ` <a href="${node.docLink}" target="_blank" rel="noopener noreferrer" class="text-decoration-none" title="Open docs">🔗</a>`;
        }
        boxHtml += `</div>`;
        const meta = [];
        if (node.teamName) meta.push(`👥 ${node.teamName}`);
        if (node.managerName) meta.push(`👤 ${node.managerName}`);
        if (meta.length) boxHtml += `<div class="objective-meta">${meta.join(' · ')}</div>`;
        box.innerHTML = boxHtml;

        if (node.keyResults && node.keyResults.length) {
            const krList = node.keyResults.map(kr => {
                const pct = calculateKRProgress(kr);
                const statusIcon = pct >= 100 ? '✅' : '📊';
                return `<div class="mb-1">${statusIcon} <strong>${kr.name}</strong>: ${kr.currentValue} → ${kr.targetValue} ${kr.unit} (${Math.round(pct)}%)</div>`;
            }).join('');
            box.setAttribute('data-bs-toggle', 'popover');
            box.setAttribute('data-bs-html', 'true');
            box.setAttribute('data-bs-trigger', 'hover focus');
            box.setAttribute('data-bs-placement', 'auto');
            box.setAttribute('data-bs-content', krList);
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
