function showConfirmModal(message, title = 'Confirm') {
    return new Promise((resolve) => {
        const id = 'modal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const div = document.createElement('div');
        div.className = 'modal fade';
        div.id = id;
        div.tabIndex = -1;
        div.setAttribute('data-bs-backdrop', 'static');
        div.setAttribute('data-bs-keyboard', 'false');
        div.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body"><p class="mb-0"></p></div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" id="${id}_confirm">Confirm</button>
                    </div>
                </div>
            </div>
        `;
        div.querySelector('.modal-body p').textContent = message;
        document.body.appendChild(div);

        const modal = new bootstrap.Modal(div);
        const confirmBtn = div.querySelector('#' + id + '_confirm');

        confirmBtn.addEventListener('click', () => {
            resolve(true);
            modal.hide();
        });

        div.addEventListener('hidden.bs.modal', () => {
            div.remove();
            resolve(false);
        }, { once: true });

        modal.show();
    });
}

function showPromptModal(message, defaultValue = '', title = 'Input') {
    return new Promise((resolve) => {
        const id = 'modal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const div = document.createElement('div');
        div.className = 'modal fade';
        div.id = id;
        div.tabIndex = -1;
        div.setAttribute('data-bs-backdrop', 'static');
        div.setAttribute('data-bs-keyboard', 'false');
        div.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-1"></p>
                        <input type="text" class="form-control" id="${id}_input">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="${id}_confirm">OK</button>
                    </div>
                </div>
            </div>
        `;
        div.querySelector('.modal-body p').textContent = message;
        document.body.appendChild(div);

        const modal = new bootstrap.Modal(div);
        const confirmBtn = div.querySelector('#' + id + '_confirm');
        const input = div.querySelector('#' + id + '_input');
        input.value = defaultValue;

        confirmBtn.addEventListener('click', () => {
            resolve(input.value);
            modal.hide();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                resolve(input.value);
                modal.hide();
            }
        });

        div.addEventListener('hidden.bs.modal', () => {
            div.remove();
            resolve(null);
        }, { once: true });

        modal.show();
        div.addEventListener('shown.bs.modal', () => {
            input.focus();
            input.select();
        }, { once: true });
    });
}

// ===== Modal Drag & Resize =====
// Applied to any modal whose .modal-dialog has class "modal-draggable".
// Drag by header (excluding interactive children), resize via bottom-right handle.
// Disabled on screens < MODAL_MOBILE_BREAKPOINT.

const MODAL_MIN_WIDTH = 400;
const MODAL_MOBILE_BREAKPOINT = 768;

function initModalDragResize(modalEl) {
    const dialog = modalEl.querySelector('.modal-dialog');
    if (!dialog || !dialog.classList.contains('modal-draggable')) return;

    const header = modalEl.querySelector('.modal-header');
    const content = modalEl.querySelector('.modal-content');
    if (!header || !content) return;

    // Inject resize handle once
    if (!content.querySelector('.modal-resize-handle')) {
        const handle = document.createElement('div');
        handle.className = 'modal-resize-handle';
        content.appendChild(handle);
    }
    const handle = content.querySelector('.modal-resize-handle');

    let mode = null; // 'drag' | 'resize' | null
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0, startWidth = 0;

    function switchToAbsolute() {
        const dRect = dialog.getBoundingClientRect();
        const cRect = content.getBoundingClientRect();
        dialog.style.position = 'absolute';
        dialog.style.left = dRect.left + 'px';
        dialog.style.top = dRect.top + 'px';
        dialog.style.transform = 'none';
        dialog.style.margin = '0';
        content.style.width = cRect.width + 'px';
    }

    header.addEventListener('mousedown', (e) => {
        if (window.innerWidth < MODAL_MOBILE_BREAKPOINT) return;
        if (e.button !== 0) return;
        // Don't start drag on interactive elements inside header
        if (e.target.closest('button, input, .nav-tabs, .nav-link, .form-control, .form-select, a, .btn-close')) return;

        mode = 'drag';
        dialog.classList.add('dragging');

        if (dialog.style.position !== 'absolute') switchToAbsolute();

        const rect = dialog.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;

        e.preventDefault();
    });

    handle.addEventListener('mousedown', (e) => {
        if (window.innerWidth < MODAL_MOBILE_BREAKPOINT) return;
        if (e.button !== 0) return;

        mode = 'resize';
        dialog.classList.add('resizing');

        if (dialog.style.position !== 'absolute') switchToAbsolute();

        const cRect = content.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startWidth = cRect.width;

        e.preventDefault();
        e.stopPropagation();
    });

    function onMouseMove(e) {
        if (!mode) return;

        if (mode === 'drag') {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            let newLeft = startLeft + dx;
            let newTop = startTop + dy;

            // Clamp: keep at least 100px of modal visible on either side;
            // keep header visible vertically.
            const minLeft = 100 - dialog.offsetWidth;
            const maxLeft = window.innerWidth - 100;
            const maxTop = window.innerHeight - 60;

            newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
            newTop = Math.max(0, Math.min(maxTop, newTop));

            dialog.style.left = newLeft + 'px';
            dialog.style.top = newTop + 'px';
        }

        if (mode === 'resize') {
            const dx = e.clientX - startX;
            const newWidth = Math.max(MODAL_MIN_WIDTH, Math.min(window.innerWidth * 0.95, startWidth + dx));

            content.style.width = newWidth + 'px';
            // Height auto-fits content; Chart.js auto-resizes via ResizeObserver.
        }
    }

    function onMouseUp() {
        if (mode) {
            dialog.classList.remove('dragging', 'resizing');
            mode = null;
        }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Reset to Bootstrap defaults on close so next open is centered.
    modalEl.addEventListener('hidden.bs.modal', () => {
        dialog.style.position = '';
        dialog.style.left = '';
        dialog.style.top = '';
        dialog.style.transform = '';
        dialog.style.margin = '';
        content.style.width = '';
        content.style.height = '';
        dialog.classList.remove('dragging', 'resizing');
        mode = null;
    });
}
