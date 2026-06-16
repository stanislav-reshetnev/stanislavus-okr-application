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
