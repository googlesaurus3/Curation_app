// Codies Curations - Main Application Logic

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const canvas = document.getElementById('piercing-canvas');
    const ctx = canvas.getContext('2d');
    const imageUpload = document.getElementById('image-upload');
    const resetViewBtn = document.getElementById('reset-view-btn');

    // --- General Controls ---
    const generalControlsContainer = document.getElementById('general-controls');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const saveProjectBtn = document.getElementById('save-project-btn');
    const loadProjectBtn = document.getElementById('load-project-btn');
    const loadProjectInput = document.getElementById('load-project-input');
    const downloadImageBtn = document.getElementById('download-image-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');

    // --- Jewelry Controls ---
    const jewelryControlsContainer = document.getElementById('jewelry-controls');
    const sizeSlider = document.getElementById('size-slider');
    const lengthSlider = document.getElementById('length-slider');
    const rotationSlider = document.getElementById('rotation-slider');
    const colorPicker = document.getElementById('color-picker');
    const bringForwardBtn = document.getElementById('bring-forward-btn');
    const sendBackwardBtn = document.getElementById('send-backward-btn');
    const flipBtn = document.getElementById('flip-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const controlLength = document.getElementById('control-length');
    const controlColor = document.getElementById('control-color');
    const controlFlip = document.getElementById('flip-btn');

    // --- Jewelry Palette ---
    const jewelryCategoriesContainer = document.getElementById('jewelry-categories');
    const jewelryItemsContainer = document.getElementById('jewelry-items');

    // --- Jewelry Definitions ---
    const jewelryData = [
        // RINGS
        { id: 'jwl1', name: 'Simple Hoop', category: 'Rings', type: 'procedural', draw: drawHoop, color: '#FFD700', size: 20, thickness: 2, canFlip: false, hasLength: false },
        // STUDS
        { id: 'jwl2', name: 'Small Stud', category: 'Studs', type: 'procedural', draw: drawStud, color: '#C0C0C0', size: 5, canFlip: false, hasLength: false },
        { id: 'jwl3', name: 'Barbell', category: 'Studs', type: 'procedural', draw: drawBarbell, color: '#C0C0C0', size: 3, length: 15, canFlip: false, hasLength: true },
        { id: 'jwl4', name: 'Gem Stud', category: 'Studs', type: 'procedural', draw: drawGem, color: '#00BFFF', size: 6, canFlip: false, hasLength: false },
        // CHARMS (as images)
        { id: 'jwl5', name: 'Moon Charm', category: 'Charms', type: 'image', src: 'https://i.imgur.com/5rFDeS2.png', width: 20, height: 20, canFlip: true, hasLength: false },
        { id: 'jwl6', name: 'Star Charm', category: 'Charms', type: 'image', src: 'https://i.imgur.com/5gX2e2I.png', width: 20, height: 20, canFlip: true, hasLength: false },
        // CHAINS (as images)
        { id: 'jwl7', name: 'Simple Chain', category: 'Chains', type: 'image', src: 'https://i.imgur.com/s6zTf7d.png', width: 8, height: 50, canFlip: false, hasLength: false },
    ];
    const imageCache = {}; // For preloading image-based jewelry

    // --- Application State ---
    let state = {
        backgroundImage: null,
        placedJewelry: [],
        selectedJewelryId: null,
        selectedJewelryType: null, // To hold the type of jewelry selected from the palette
        viewTransform: {
            scale: 1,
            panX: 0,
            panY: 0
        },
        history: [],
        historyIndex: -1
    };

    // --- Canvas & View State ---
    let isPanning = false;
    let isDraggingJewelry = false;
    let dragStartOffset = { x: 0, y: 0 };
    let hasDragged = false;
    let lastPanPosition = { x: 0, y: 0 };
    const initialViewTransform = { ...state.viewTransform };

    // --- Canvas Setup ---
    function resizeCanvas() {
        const container = canvas.parentElement;
        // Respect aspect ratio of container
        const size = Math.min(container.clientWidth, container.clientHeight);
        canvas.width = size;
        canvas.height = size;
        render();
    }

    // --- Rendering Engine ---
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(state.viewTransform.panX, state.viewTransform.panY);
        ctx.scale(state.viewTransform.scale, state.viewTransform.scale);

        if (state.backgroundImage) {
            const imgAspectRatio = state.backgroundImage.width / state.backgroundImage.height;
            const canvasAspectRatio = canvas.width / canvas.height;
            let drawWidth, drawHeight, drawX, drawY;

            if (imgAspectRatio > canvasAspectRatio) {
                drawWidth = canvas.width;
                drawHeight = drawWidth / imgAspectRatio;
                drawX = 0;
                drawY = (canvas.height - drawHeight) / 2;
            } else {
                drawHeight = canvas.height;
                drawWidth = drawHeight * imgAspectRatio;
                drawY = 0;
                drawX = (canvas.width - drawWidth) / 2;
            }
            ctx.drawImage(state.backgroundImage, drawX, drawY, drawWidth, drawHeight);
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Upload an image to start', canvas.width / 2, canvas.height / 2);
        }

        // Draw placed jewelry
        state.placedJewelry.forEach(item => {
            if (item.type === 'procedural') {
                item.draw(ctx, item);
            } else if (item.type === 'image' && imageCache[item.src]) {
                const img = imageCache[item.src];
                ctx.save();
                ctx.translate(item.x, item.y);
                ctx.rotate(item.rotation * Math.PI / 180);
                if (item.flip) {
                    ctx.scale(-1, 1);
                }
                ctx.drawImage(img, -item.width / 2, -item.height / 2, item.width, item.height);
                ctx.restore();
            }
        });

        // Draw selection indicator
        const selectedItem = state.placedJewelry.find(item => item.instanceId === state.selectedJewelryId);
        if (selectedItem) {
            drawSelectionIndicator(selectedItem);
        }

        ctx.restore();
    }

    // --- Selection and Bounding Box ---
    function drawSelectionIndicator(item) {
        // Determine bounding box based on item type
        let width, height;
        if (item.type === 'image') {
            width = item.width;
            height = item.height;
        } else if (item.id === 'jwl3') { // Barbell
            width = item.size * 3; // Approximate width
            height = item.length;
        } else { // Studs, Rings, Gems
            width = item.size * 1.2;
            height = item.size * 1.2;
        }

        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rotation * Math.PI / 180);

        ctx.strokeStyle = '#ec4899'; // pink-500
        ctx.lineWidth = 2 / state.viewTransform.scale; // Maintain consistent line width
        ctx.setLineDash([5, 5]);

        ctx.strokeRect(-width / 2, -height / 2, width, height);

        ctx.setLineDash([]);
        ctx.restore();
    }

    function getJewelryAtPosition(worldX, worldY) {
        // Iterate backwards to select top-most item first
        for (let i = state.placedJewelry.length - 1; i >= 0; i--) {
            const item = state.placedJewelry[i];

            // Transform click point to item's local coordinates
            const dx = worldX - item.x;
            const dy = worldY - item.y;
            const rad = -item.rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;

            let width, height;
            if (item.type === 'image') {
                width = item.width;
                height = item.height;
            } else if (item.id === 'jwl3') { // Barbell
                width = item.size * 3;
                height = item.length;
            } else {
                width = item.size;
                height = item.size;
            }

            if (Math.abs(localX) < width / 2 && Math.abs(localY) < height / 2) {
                return item;
            }
        }
        return null;
    }

    // --- Procedural Drawing Functions ---
    function drawStud(ctx, item) {
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.size / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawHoop(ctx, item) {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.thickness;
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.size / 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    function drawBarbell(ctx, item) {
        const halfLength = item.length / 2;
        const ballRadius = item.size * 1.5; // Thickness controls the bar, balls are relative

        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rotation * Math.PI / 180);

        // Draw bar
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.size;
        ctx.beginPath();
        ctx.moveTo(0, -halfLength);
        ctx.lineTo(0, halfLength);
        ctx.stroke();

        // Draw balls
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(0, -halfLength, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, halfLength, ballRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function drawGem(ctx, item) {
        const size = item.size;
        ctx.fillStyle = item.color;
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 1;

        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rotation * Math.PI / 180);

        ctx.beginPath();
        ctx.moveTo(0, -size); // Top point
        ctx.lineTo(size * 0.8, -size * 0.2);
        ctx.lineTo(size * 0.5, size * 0.8);
        ctx.lineTo(-size * 0.5, size * 0.8);
        ctx.lineTo(-size * 0.8, -size * 0.2);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }


    // --- Event Handlers ---
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    state.backgroundImage = img;
                    resetView();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    function resetView() {
        state.viewTransform = { ...initialViewTransform };
        render();
    }

    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    function handleMouseDown(e) {
        hasDragged = false;
        lastPanPosition = getCanvasCoords(e);
        const worldCoords = screenToWorld(lastPanPosition.x, lastPanPosition.y);
        const clickedItem = getJewelryAtPosition(worldCoords.x, worldCoords.y);

        if (clickedItem && clickedItem.instanceId === state.selectedJewelryId) {
            isDraggingJewelry = true;
            const selected = getSelected();
            dragStartOffset.x = selected.x - worldCoords.x;
            dragStartOffset.y = selected.y - worldCoords.y;
        } else {
            isPanning = true;
        }
    }

    function handleMouseUp(e) {
        if (isDraggingJewelry && hasDragged) {
            saveState();
        }
        if (!hasDragged && !isDraggingJewelry) {
            handleCanvasClick(e);
        }
        isPanning = false;
        isDraggingJewelry = false;
        hasDragged = false;
    }

    function handleMouseMove(e) {
        if (!isPanning && !isDraggingJewelry) return;

        const pos = getCanvasCoords(e);
        if (Math.hypot(pos.x - lastPanPosition.x, pos.y - lastPanPosition.y) > 3) {
            hasDragged = true;
        }

        if (hasDragged) {
            if (isDraggingJewelry) {
                const selected = getSelected();
                if (selected) {
                    const worldCoords = screenToWorld(pos.x, pos.y);
                    selected.x = worldCoords.x + dragStartOffset.x;
                    selected.y = worldCoords.y + dragStartOffset.y;
                    render();
                }
            } else if (isPanning) {
                state.viewTransform.panX += pos.x - lastPanPosition.x;
                state.viewTransform.panY += pos.y - lastPanPosition.y;
                lastPanPosition = pos;
                render();
            }
        }
    }

    function screenToWorld(screenX, screenY) {
        return {
            x: (screenX - state.viewTransform.panX) / state.viewTransform.scale,
            y: (screenY - state.viewTransform.panY) / state.viewTransform.scale
        };
    }

    function handleCanvasClick(e) {
        const clickCoords = getCanvasCoords(e);
        const worldCoords = screenToWorld(clickCoords.x, clickCoords.y);
        const clickedItem = getJewelryAtPosition(worldCoords.x, worldCoords.y);

        if (clickedItem) {
            state.selectedJewelryId = clickedItem.instanceId;
        } else {
            if (state.selectedJewelryType) {
                const newItem = {
                    ...state.selectedJewelryType,
                    instanceId: Date.now(),
                    x: worldCoords.x,
                    y: worldCoords.y,
                    rotation: 0,
                    flip: false,
                };
                if (!newItem.hasOwnProperty('size')) newItem.size = 20;
                if (!newItem.hasOwnProperty('length')) newItem.length = 50;
                if (!newItem.hasOwnProperty('width')) newItem.width = newItem.size;
                if (!newItem.hasOwnProperty('height')) newItem.height = newItem.size;
                state.placedJewelry.push(newItem);
                state.selectedJewelryId = newItem.instanceId;
                state.selectedJewelryType = null;
                const allItems = jewelryItemsContainer.querySelectorAll('div');
                allItems.forEach(el => el.classList.remove('selected-jewelry'));
                saveState(); // Save state after placing a new item
            } else {
                state.selectedJewelryId = null;
            }
        }
        updateControlsPanel();
        render();
    }

    // --- Controls Panel Logic ---
    function updateControlsPanel() {
        const selectedItem = state.placedJewelry.find(item => item.instanceId === state.selectedJewelryId);
        if (!selectedItem) {
            jewelryControlsContainer.classList.add('hidden');
            return;
        }

        jewelryControlsContainer.classList.remove('hidden');

        // Set slider values
        sizeSlider.value = selectedItem.size;
        rotationSlider.value = selectedItem.rotation;

        // Handle visibility of conditional controls
        controlLength.style.display = selectedItem.hasLength ? 'block' : 'none';
        if (selectedItem.hasLength) {
            lengthSlider.value = selectedItem.length;
        }

        controlColor.style.display = selectedItem.type === 'procedural' ? 'block' : 'none';
        if (selectedItem.type === 'procedural') {
            colorPicker.value = selectedItem.color;
        }

        flipBtn.style.display = selectedItem.canFlip ? 'block' : 'none';
    }

    function getSelected() {
        return state.placedJewelry.find(item => item.instanceId === state.selectedJewelryId);
    }

    // --- Control Event Handlers ---
    sizeSlider.addEventListener('input', e => {
        const item = getSelected();
        if (item) {
            item.size = parseFloat(e.target.value);
            if (item.type === 'image') {
                const initial = jewelryData.find(d => d.id === item.id);
                const ratio = initial.height / initial.width;
                item.width = item.size;
                item.height = item.size * ratio;
            }
            render();
        }
    });
    sizeSlider.addEventListener('change', () => saveState());

    lengthSlider.addEventListener('input', e => {
        const item = getSelected();
        if (item) {
            item.length = parseFloat(e.target.value);
            render();
        }
    });
    lengthSlider.addEventListener('change', () => saveState());

    rotationSlider.addEventListener('input', e => {
        const item = getSelected();
        if (item) {
            item.rotation = parseFloat(e.target.value);
            render();
        }
    });
    rotationSlider.addEventListener('change', () => saveState());

    colorPicker.addEventListener('change', e => {
        const item = getSelected();
        if (item) {
            item.color = e.target.value;
            saveState();
            render();
        }
    });

    bringForwardBtn.addEventListener('click', () => {
        const item = getSelected();
        if (!item) return;
        const index = state.placedJewelry.indexOf(item);
        if (index < state.placedJewelry.length - 1) {
            [state.placedJewelry[index], state.placedJewelry[index + 1]] = [state.placedJewelry[index + 1], state.placedJewelry[index]];
            saveState();
            render();
        }
    });

    sendBackwardBtn.addEventListener('click', () => {
        const item = getSelected();
        if (!item) return;
        const index = state.placedJewelry.indexOf(item);
        if (index > 0) {
            [state.placedJewelry[index], state.placedJewelry[index - 1]] = [state.placedJewelry[index - 1], state.placedJewelry[index]];
            saveState();
            render();
        }
    });

    flipBtn.addEventListener('click', () => {
        const item = getSelected();
        if (item) {
            item.flip = !item.flip;
            saveState();
            render();
        }
    });

    deleteBtn.addEventListener('click', () => {
        const item = getSelected();
        if (!item) return;
        state.placedJewelry = state.placedJewelry.filter(j => j.instanceId !== item.instanceId);
        state.selectedJewelryId = null;
        saveState();
        updateControlsPanel();
        render();
    });

    // --- History (Undo/Redo) Logic ---
    function saveState() {
        // Clear the "redo" history if we are branching off
        if (state.historyIndex < state.history.length - 1) {
            state.history = state.history.slice(0, state.historyIndex + 1);
        }

        // Deep copy of the current state of placed jewelry
        const currentState = JSON.parse(JSON.stringify(state.placedJewelry));
        state.history.push(currentState);
        state.historyIndex++;
        updateUndoRedoButtons();
    }

    function undo() {
        if (state.historyIndex > 0) {
            state.historyIndex--;
            state.placedJewelry = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
            state.selectedJewelryId = null; // Clear selection
            updateControlsPanel();
            updateUndoRedoButtons();
            render();
        }
    }

    function redo() {
        if (state.historyIndex < state.history.length - 1) {
            state.historyIndex++;
            state.placedJewelry = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
            state.selectedJewelryId = null; // Clear selection
            updateControlsPanel();
            updateUndoRedoButtons();
            render();
        }
    }

    function updateUndoRedoButtons() {
        undoBtn.disabled = state.historyIndex <= 0;
        redoBtn.disabled = state.historyIndex >= state.history.length - 1;
    }

    // --- Project Management ---
    function saveProject() {
        const projectData = {
            placedJewelry: state.placedJewelry,
            backgroundImageSrc: state.backgroundImage ? state.backgroundImage.src : null,
            viewTransform: state.viewTransform
        };

        const jsonString = JSON.stringify(projectData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'codies-curation.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function loadProject(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const projectData = JSON.parse(event.target.result);

                // Restore state
                state.placedJewelry = projectData.placedJewelry || [];
                state.viewTransform = projectData.viewTransform || initialViewTransform;
                state.selectedJewelryId = null;

                if (projectData.backgroundImageSrc) {
                    const img = new Image();
                    img.onload = () => {
                        state.backgroundImage = img;
                        render();
                    };
                    img.src = projectData.backgroundImageSrc;
                } else {
                    state.backgroundImage = null;
                }

                // Reset history
                state.history = [];
                state.historyIndex = -1;
                saveState();

                updateControlsPanel();
                render();

            } catch (error) {
                console.error("Failed to load project:", error);
                alert("Error: Could not load the project file. It might be corrupted.");
            }
        };
        reader.readAsText(file);
        // Reset input value to allow loading the same file again
        e.target.value = '';
    }

    function downloadImage() {
        // Temporarily deselect item to hide bounding box
        const wasSelectedId = state.selectedJewelryId;
        state.selectedJewelryId = null;
        render();

        const dataUrl = canvas.toDataURL('image/png');

        // Restore selection and re-render
        state.selectedJewelryId = wasSelectedId;
        render();

        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'curation.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function clearAll() {
        if (!confirm("Are you sure you want to clear everything? This cannot be undone.")) return;

        state.backgroundImage = null;
        state.placedJewelry = [];
        state.selectedJewelryId = null;
        state.viewTransform = { ...initialViewTransform };

        state.history = [];
        state.historyIndex = -1;
        saveState();

        updateControlsPanel();
        render();
    }


    function handleWheel(e) {
        e.preventDefault();
        const { x, y } = getCanvasCoords(e);
        const scaleAmount = 1.1;
        const oldScale = state.viewTransform.scale;

        if (e.deltaY < 0) { // Zoom in
            state.viewTransform.scale *= scaleAmount;
        } else { // Zoom out
            state.viewTransform.scale /= scaleAmount;
        }

        // Adjust pan to zoom towards the mouse pointer
        state.viewTransform.panX = x - (x - state.viewTransform.panX) * (state.viewTransform.scale / oldScale);
        state.viewTransform.panY = y - (y - state.viewTransform.panY) * (state.viewTransform.scale / oldScale);

        render();
    }

    // --- Palette Logic ---
    function populatePalette(category = 'All') {
        jewelryItemsContainer.innerHTML = '';
        const filteredJewelry = (category === 'All')
            ? jewelryData
            : jewelryData.filter(item => item.category === category);

        filteredJewelry.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'w-16 h-16 bg-gray-800 rounded-md flex items-center justify-center cursor-pointer hover:bg-gray-700';
            itemEl.dataset.id = item.id;

            const canvasEl = document.createElement('canvas');
            canvasEl.width = 64;
            canvasEl.height = 64;
            const itemCtx = canvasEl.getContext('2d');

            if (item.type === 'procedural') {
                // A bit of a hack to draw the item centered
                const tempItem = { ...item, x: 32, y: 32, rotation: 0 };
                item.draw(itemCtx, tempItem);
            } else if (item.type === 'image' && imageCache[item.src]) {
                const img = imageCache[item.src];
                const aspect = img.width / img.height;
                let w, h;
                if (aspect > 1) { w = 50; h = 50 / aspect; } else { h = 50; w = 50 * aspect; }
                itemCtx.drawImage(img, 32 - w / 2, 32 - h / 2, w, h);
            }
            itemEl.appendChild(canvasEl);
            itemEl.addEventListener('click', () => handleJewelrySelection(item));
            jewelryItemsContainer.appendChild(itemEl);
        });
    }

    function handleJewelrySelection(item) {
        state.selectedJewelryType = item;
        // Visual feedback for selected palette item
        const allItems = jewelryItemsContainer.querySelectorAll('div');
        allItems.forEach(el => el.classList.remove('selected-jewelry'));
        jewelryItemsContainer.querySelector(`[data-id='${item.id}']`).classList.add('selected-jewelry');
    }

    function handleCategoryClick(e) {
        if (!e.target.matches('.category-btn')) return;

        const category = e.target.dataset.category;
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active-category');
            btn.classList.remove('bg-pink-600');
            btn.classList.add('bg-gray-700', 'hover:bg-gray-600');
        });
        e.target.classList.add('active-category');
        e.target.classList.add('bg-pink-600');
        e.target.classList.remove('bg-gray-700', 'hover:bg-gray-600');

        populatePalette(category);
    }

    function preloadJewelryImages() {
        let imagesLoaded = 0;
        const imageUrls = jewelryData.filter(item => item.type === 'image').map(item => item.src);
        if (imageUrls.length === 0) {
            populatePalette();
            return;
        }

        imageUrls.forEach(src => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                imageCache[src] = img;
                imagesLoaded++;
                if (imagesLoaded === imageUrls.length) {
                    populatePalette(); // Populate palette after all images are loaded
                }
            };
        });
    }


    // --- Initialization ---
    function init() {
        console.log('Codies Curations App Initialized');

        // Event Listeners
        imageUpload.addEventListener('change', handleImageUpload);
        resetViewBtn.addEventListener('click', resetView);
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('wheel', handleWheel);
        jewelryCategoriesContainer.addEventListener('click', handleCategoryClick);
        undoBtn.addEventListener('click', undo);
        redoBtn.addEventListener('click', redo);
        saveProjectBtn.addEventListener('click', saveProject);
        loadProjectBtn.addEventListener('click', () => loadProjectInput.click());
        loadProjectInput.addEventListener('change', loadProject);
        downloadImageBtn.addEventListener('click', downloadImage);
        clearAllBtn.addEventListener('click', clearAll);
        window.addEventListener('resize', resizeCanvas);

        resizeCanvas();
        preloadJewelryImages();
        saveState(); // Initial empty state
    }

    init();
});
