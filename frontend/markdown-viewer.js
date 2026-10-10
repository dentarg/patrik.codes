const fileInput = document.querySelector("#file-input");
const intro = document.querySelector("#viewer-intro");
const toolbar = document.querySelector("#viewer-toolbar");
const dropZone = document.querySelector("#drop-zone");
const documentPicker = document.querySelector("#document-picker");
const documentSelect = document.querySelector("#document-select");
const clearButton = document.querySelector("#clear-files");
const status = document.querySelector("#viewer-status");
const documentSection = document.querySelector("#document");
const documentName = document.querySelector("#document-name");
const preview = document.querySelector("#markdown-preview");
const maxFileSize = 1024 * 1024;

let files = [];
let worker;
let renderTimeout;
let renderVersion = 0;
let dragDepth = 0;

function showStatus(message, quiet = false) {
  status.textContent = message;
  status.classList.toggle("sr-only", quiet);
}

function stopRendering() {
  worker?.terminate();
  worker = undefined;
  clearTimeout(renderTimeout);
}

function preparePreview(html) {
  // A template keeps images inert until their URLs have been removed.
  const template = document.createElement("template");
  template.innerHTML = html;

  for (const image of template.content.querySelectorAll("img")) {
    const placeholder = document.createElement("span");
    placeholder.className = "image-placeholder";
    placeholder.textContent = `[Image: ${image.alt || "not loaded"}]`;
    image.replaceWith(placeholder);
  }

  for (const link of template.content.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href");
    if (/^https?:/i.test(href)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    } else if (!/^(#|mailto:)/i.test(href)) {
      link.removeAttribute("href");
      link.title = "Open this file separately in the viewer.";
    }
  }

  for (const table of template.content.querySelectorAll("table")) {
    const wrapper = document.createElement("div");
    wrapper.className = "table-scroll";
    table.replaceWith(wrapper);
    wrapper.append(table);
  }

  return template.content;
}

async function openFile(file) {
  stopRendering();
  const version = ++renderVersion;
  intro.hidden = false;
  documentSection.hidden = true;
  preview.replaceChildren();
  showStatus(`Reading ${file.name}…`);

  try {
    const markdown = await file.text();
    if (version !== renderVersion) return;

    if (!markdown.trim()) {
      showStatus(`${file.name} is empty.`);
      return;
    }

    worker = new Worker(new URL("./markdown-worker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => {
      if (version !== renderVersion) return;
      stopRendering();
      if (data.error) {
        showStatus(data.error);
        return;
      }

      preview.replaceChildren(preparePreview(data.html));
      documentName.textContent = file.name;
      intro.hidden = true;
      documentSection.hidden = false;
      showStatus(`Opened ${file.name}.`, true);
      window.scrollTo(0, 0);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      if (version !== renderVersion) return;
      stopRendering();
      showStatus("This file could not be rendered. Try another Markdown file.");
    };
    renderTimeout = setTimeout(() => {
      if (version !== renderVersion) return;
      stopRendering();
      showStatus("This file took too long to render. Try a smaller or simpler document.");
    }, 10000);
    worker.postMessage(markdown);
  } catch {
    if (version !== renderVersion) return;
    stopRendering();
    showStatus("This file could not be read. Try choosing it again.");
  }
}

function openFiles(selectedFiles) {
  const selection = Array.from(selectedFiles);
  if (!selection.length) return;

  if (selection.some((file) => !/\.(md|markdown|mdown|mkd)$/i.test(file.name))) {
    showStatus("Choose Markdown files (.md, .markdown, .mdown, or .mkd).");
    return;
  }
  if (selection.some((file) => file.size > maxFileSize)) {
    showStatus("Each Markdown file must be 1 MiB or smaller.");
    return;
  }

  files = selection;
  documentSelect.replaceChildren(...files.map((file, index) => new Option(file.name, index)));
  documentPicker.hidden = files.length < 2;
  toolbar.hidden = false;
  openFile(files[0]);
}

fileInput.addEventListener("change", () => {
  openFiles(fileInput.files);
  fileInput.value = "";
});

documentSelect.addEventListener("change", () => openFile(files[documentSelect.value]));

clearButton.addEventListener("click", () => {
  ++renderVersion;
  stopRendering();
  files = [];
  documentSelect.replaceChildren();
  documentPicker.hidden = true;
  toolbar.hidden = true;
  intro.hidden = false;
  documentSection.hidden = true;
  documentName.textContent = "";
  preview.replaceChildren();
  history.replaceState(null, "", location.pathname + location.search);
  showStatus("Choose or drop Markdown files to get started.");
  fileInput.focus();
});

function isFileDrag(event) {
  return Array.from(event.dataTransfer.types).includes("Files");
}

window.addEventListener("dragenter", (event) => {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  dragDepth += 1;
  dropZone.classList.add("is-dragging");
});

window.addEventListener("dragover", (event) => {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
});

window.addEventListener("dragleave", (event) => {
  if (!isFileDrag(event)) return;
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) dropZone.classList.remove("is-dragging");
});

window.addEventListener("drop", (event) => {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  dragDepth = 0;
  dropZone.classList.remove("is-dragging");
  openFiles(event.dataTransfer.files);
});

fileInput.disabled = false;
showStatus("Choose or drop Markdown files to get started.");
