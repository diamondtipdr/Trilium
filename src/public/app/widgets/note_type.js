import server from '../services/server.js';
import mimeTypesService from '../services/mime_types.js';
import NoteContextAwareWidget from "./note_context_aware_widget.js";
import dialogService from "../services/dialog.js";

const NOTE_TYPES = [
    { type: "file", title: "File", selectable: false },
    { type: "image", title: "Image", selectable: false },
    { type: "search", title: "Saved Search", selectable: false },
    { type: "noteMap", mime: '', title: "Note Map", selectable: false },
    { type: "launcher", mime: '', title: "Launcher", selectable: false },
    { type: "doc", mime: '', title: "Doc", selectable: false },
    { type: "contentWidget", mime: '', title: "Widget", selectable: false },

    { type: "text", mime: "text/html", title: "Text", selectable: true },
    { type: "relationMap", mime: "application/json", title: "Relation Map", selectable: true },
    { type: "mindMap", mime: "application/json", "title": "Mind Map", selectable: true },
    { type: "render", mime: '', title: "Render Note", selectable: true },
    { type: "canvas", mime: 'application/json', title: "Canvas", selectable: true },
    { type: "mermaid", mime: 'text/mermaid', title: "Mermaid Diagram", selectable: true },
    { type: "book", mime: '', title: "Book", selectable: true },
    { type: "webView", mime: '', title: "Web View", selectable: true },
    { type: "code", mime: 'text/plain', title: "Code", selectable: true }
];

const NOT_SELECTABLE_NOTE_TYPES = NOTE_TYPES.filter(nt => !nt.selectable).map(nt => nt.type);

const TPL = `
<div class="dropdown note-type-widget">
    <style>
    .note-type-dropdown {
        max-height: 500px;
        overflow-y: auto;
        overflow-x: hidden;
    }
    </style>
    <button type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" class="btn btn-sm dropdown-toggle note-type-button">
        <span class="note-type-desc"></span>
        <span class="caret"></span>
    </button>
    <div class="note-type-dropdown dropdown-menu dropdown-menu-left"></div>
</div>
`;

export default class NoteTypeWidget extends NoteContextAwareWidget {
    doRender() {
        this.$widget = $(TPL);

        this.$widget.on('show.bs.dropdown', () => this.renderDropdown());

        this.$noteTypeDropdown = this.$widget.find(".note-type-dropdown");
        this.$noteTypeButton = this.$widget.find(".note-type-button");
        this.$noteTypeDesc = this.$widget.find(".note-type-desc");

        this.$widget.on('click', '.dropdown-item',
            () => this.$widget.find('.dropdown-toggle').dropdown('toggle'));
    }

    async refreshWithNote(note) {
        this.$noteTypeButton.prop("disabled",
            () => NOT_SELECTABLE_NOTE_TYPES.includes(note.type));

        this.$noteTypeDesc.text(await this.findTypeTitle(note.type, note.mime));

        this.$noteTypeButton.dropdown('hide');
    }

    /** the actual body is rendered lazily on note-type button click */
    async renderDropdown() {
        this.$noteTypeDropdown.empty();

        for (const noteType of NOTE_TYPES.filter(nt => nt.selectable)) {
            let $typeLink;

            if (noteType.type !== "code") {
                $typeLink = $('<a class="dropdown-item">')
                    .attr("data-note-type", noteType.type)
                    .append('<span class="check">&check;</span> ')
                    .append($('<span>').text(noteType.title))
                    .on('click', e => {
                        const type = $typeLink.attr('data-note-type');
                        const noteType = NOTE_TYPES.find(nt => nt.type === type);

                        this.save(noteType.type, noteType.mime);
                    });
            } else {
                this.$noteTypeDropdown
                    .append('<div class="dropdown-divider"></div>');
                $typeLink = $('<a class="dropdown-item disabled">')
                    .attr("data-note-type", noteType.type)
                    .append('<span class="check">&check;</span> ')
                    .append($('<strong>').text(noteType.title));
            }
        
            if (this.note.type === noteType.type) {
                $typeLink.addClass("selected");
            }

            this.$noteTypeDropdown.append($typeLink);
        }

        for (const mimeType of await mimeTypesService.getMimeTypes()) {
            if (!mimeType.enabled) {
                continue;
            }

            const $mimeLink = $('<a class="dropdown-item">')
                .attr("data-mime-type", mimeType.mime)
                .append('<span class="check">&check;</span> ')
                .append($('<span>').text(mimeType.title))
                .on('click', e => {
                    const $link = $(e.target).closest('.dropdown-item');

                    this.save('code', $link.attr('data-mime-type'));
                });

            if (this.note.type === 'code' && this.note.mime === mimeType.mime) {
                $mimeLink.addClass("selected");

                this.$noteTypeDesc.text(mimeType.title);
            }

            this.$noteTypeDropdown.append($mimeLink);
        }
    }

    async findTypeTitle(type, mime) {
        if (type === 'code') {
            const mimeTypes = await mimeTypesService.getMimeTypes();
            const found = mimeTypes.find(mt => mt.mime === mime);

            return found ? found.title : mime;
        }
        else {
            const noteType = NOTE_TYPES.find(nt => nt.type === type);

            return noteType ? noteType.title : type;
        }
    }

    async save(type, mime) {
        if (type === this.note.type && mime === this.note.mime) {
            return;
        }

        if (type !== this.note.type && !await this.confirmChangeIfContent()) {
            return;
        }

        await server.put(`notes/${this.noteId}/type`, { type, mime });
    }

    async confirmChangeIfContent() {
        const blob = await this.note.getBlob();

        if (!blob.content || !blob.content.trim().length) {
            return true;
        }

        return await dialogService.confirm("It is not recommended to change note type when note content is not empty. Do you want to continue anyway?");
    }

    async entitiesReloadedEvent({loadResults}) {
        if (loadResults.isNoteReloaded(this.noteId)) {
            this.refresh();
        }
    }
}
