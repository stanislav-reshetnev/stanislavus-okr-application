function renderTree(nodes, parentElement, isRoot = false) {
    const ul = document.createElement('ul');
    ul.className = 'tree';
    nodes.forEach((node, idx) => {
        const objIndex = idx + 1;
        const li = document.createElement('li');
        li.className = 'node';
        if (isRoot) li.classList.add('root-objective');
        li.setAttribute('data-object-id', node.id);

        li.addEventListener('dragover', (e) => {
            if (!editMode) return;
            e.preventDefault();
            e.stopPropagation();
            li.classList.add('drag-over');
        });
        li.addEventListener('dragleave', () => { li.classList.remove('drag-over'); });
        li.addEventListener('drop', (e) => {
            if (!editMode) return;
            e.preventDefault();
            e.stopPropagation();
            li.classList.remove('drag-over');
            const draggedId = e.dataTransfer.getData('text/plain');
            const targetId = li.dataset.objectId;
            if (!draggedId || draggedId === targetId) return;
            if (isDescendant(targetId, draggedId)) {
                alert('Cannot move an objective inside its own descendant.');
                return;
            }
            moveObjective(draggedId, targetId);
        });

        let objectiveColorClass = '';
        if (node.keyresults && node.keyresults.length) {
            const targetKRs = node.keyresults.filter(kr => kr.target_value > 0 || kr.initial_value > 0);
            if (targetKRs.length > 0) {
                const allAchieved = targetKRs.every(kr => calculateKRProgress(kr) >= 100);
                objectiveColorClass = allAchieved ? 'okr-green' : 'okr-yellow';
            }
        }
        if (objectiveColorClass) li.classList.add(objectiveColorClass);

        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'node-content';
        nodeDiv.setAttribute('draggable', editMode ? 'true' : 'false');
        nodeDiv.dataset.objectId = node.id;

        nodeDiv.addEventListener('dragstart', (e) => {
            if (!editMode) { e.preventDefault(); return; }
            e.dataTransfer.setData('text/plain', node.id);
            e.dataTransfer.effectAllowed = 'move';
            nodeDiv.classList.add('dragging');
        });
        nodeDiv.addEventListener('dragend', () => { nodeDiv.classList.remove('dragging'); });

        let nameHtml = '';
        if (node.keyresults && node.keyresults.length) {
            nameHtml += `<span class="caret" title="${node.name}">`;
            nameHtml += `<span class="objective-number">O${objIndex}:</span> <span class="objective-name" title="${node.name}">${node.name}</span></span>`;
        } else {
            nameHtml += `<span><span class="objective-number">O${objIndex}:</span> <span class="objective-name" title="${node.name}">${node.name}</span></span>`;
        }
        nodeDiv.innerHTML = nameHtml;

        if (node.doc_link) {
            const linkIcon = document.createElement('a');
            linkIcon.href = node.doc_link;
            linkIcon.target = '_blank';
            linkIcon.rel = 'noopener noreferrer';
            linkIcon.className = 'ms-1 text-decoration-none';
            linkIcon.innerHTML = '🔗';
            linkIcon.title = 'Open docs';
            nodeDiv.appendChild(linkIcon);
        }

        if (node.team_name) {
            const badge = document.createElement('span');
            badge.className = 'badge bg-info text-dark';
            badge.textContent = '👥 ' + node.team_name;
            nodeDiv.appendChild(badge);
        }
        if (node.manager_name) {
            const badge = document.createElement('span');
            badge.className = 'badge bg-secondary';
            badge.textContent = '👤 ' + node.manager_name;
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

        if (node.keyresults && node.keyresults.length) {
            const krDiv = document.createElement('div');
            krDiv.className = 'kr-item';
            node.keyresults.forEach((kr, krIdx) => {
                const krNumber = `KR${objIndex}.${krIdx + 1}`;
                const pct = calculateKRProgress(kr);
                let krClass = '';
                if (kr.target_value > 0 || kr.initial_value > 0) {
                    krClass = pct >= 100 ? 'kr-green' : 'kr-yellow';
                }
                const lastUpdated = kr.last_updated ? new Date(kr.last_updated + 'Z').toLocaleString() : 'unknown';
                const source = kr.source === 'api' ? 'external API' : 'manual edit';
                const progressTitle = `Progress: ${Math.round(pct)}%\nInitial: ${kr.initial_value || 0}\nCurrent: ${kr.current_value}\nTarget: ${kr.target_value} ${kr.unit}\nLast updated: ${lastUpdated}\nSource: ${source}`;
                const krRow = document.createElement('div');
                krRow.className = 'kr-row ' + krClass;

                const robotIcon = kr.source === 'api' ? '<span class="ms-1" title="Updated automatically via external API call">🤖</span>' : '';
                krRow.innerHTML = `
                    📊 <strong class="kr-number">${krNumber}:</strong> <strong class="kr-name" title="${kr.name}">${kr.name}</strong> (${kr.current_value} / ${kr.target_value} ${kr.unit})
                    <div class="progress" title="${progressTitle.replace(/"/g, '&quot;')}"><div class="progress-bar" style="width:${pct}%">${Math.round(pct)}%</div></div>${robotIcon}`;
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

    function createNodeElement(node, objIndex, isRoot = false) {
        const group = document.createElement('div');
        group.className = 'node-group';
        group.setAttribute('data-object-id', node.id);

        const box = document.createElement('div');
        box.className = 'node-box';
        if (isRoot) box.classList.add('root-node');

        let krClass = '';
        if (node.keyresults && node.keyresults.length) {
            const targetKRs = node.keyresults.filter(kr => kr.target_value > 0 || kr.initial_value > 0);
            if (targetKRs.length > 0) {
                const allAchieved = targetKRs.every(kr => calculateKRProgress(kr) >= 100);
                krClass = allAchieved ? 'okr-green' : 'okr-yellow';
            }
        }
        if (krClass) box.classList.add(krClass);

        const objNumberSpan = `<span class="obj-number">O${objIndex}:</span>`;
        let boxHtml = `<div class="objective-title">${objNumberSpan} ${node.name}`;
        if (node.doc_link) {
            boxHtml += ` <a href="${node.doc_link}" target="_blank" rel="noopener noreferrer" class="text-decoration-none" title="Open docs">🔗</a>`;
        }
        boxHtml += `</div>`;
        const meta = [];
        if (node.team_name) meta.push(`👥 ${node.team_name}`);
        if (node.manager_name) meta.push(`👤 ${node.manager_name}`);
        if (meta.length) boxHtml += `<div class="objective-meta">${meta.join(' · ')}</div>`;
        box.innerHTML = boxHtml;

        if (node.keyresults && node.keyresults.length) {
            const krList = node.keyresults.map(kr => {
                const pct = calculateKRProgress(kr);
                const statusIcon = pct >= 100 ? '✅' : '📊';
                return `<div class="mb-1">${statusIcon} <strong>${kr.name}</strong>: ${kr.current_value} → ${kr.target_value} ${kr.unit} (${Math.round(pct)}%)</div>`;
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
            node.children.forEach((child, childIdx) => {
                childrenRow.appendChild(createNodeElement(child, childIdx + 1, false));
            });
            group.appendChild(childrenRow);
        }
        return group;
    }

    const rootsRow = document.createElement('div');
    rootsRow.className = 'roots-row';
    nodes.forEach((node, idx) => {
        rootsRow.appendChild(createNodeElement(node, idx + 1, true));
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

    krItems.forEach(item => item.classList.toggle('active'));
    carets.forEach(caret => caret.classList.toggle('caret-down'));
    btn.textContent = anyExpanded ? '⊞' : '⊟';
}
