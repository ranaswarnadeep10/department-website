// ===== SIMPLIFIED IMAGE EDITOR =====
class SimpleImageEditor {
    constructor() {
        this.fileInput = document.getElementById('profile-pic');
        this.uploadContainer = document.getElementById('image-upload-container');
        this.uploadPlaceholder = document.getElementById('upload-placeholder');
        this.imagePreview = document.getElementById('image-preview');
        this.cropContainer = document.getElementById('crop-container');
        this.cropCanvas = document.getElementById('crop-canvas');
        this.cropBtn = document.getElementById('crop-btn');
        this.saveCropBtn = document.getElementById('save-crop-btn');
        this.cancelCropBtn = document.getElementById('cancel-crop-btn');
        
        if (this.cropCanvas) {
            this.ctx = this.cropCanvas.getContext('2d');
        }
        this.originalImage = null;
        this.isCropping = false;
        this.cropStartX = 0;
        this.cropStartY = 0;
        this.cropWidth = 0;
        this.cropHeight = 0;
        this.isDrawing = false;
        this.croppedImageData = null;
        this.toast = window.toastManager || new ToastManager();
        
        this.init();
    }
    
    init() {
        this.setupFileInput();
        this.setupDragAndDrop();
        this.setupCropButtons();
        this.setupCanvasEvents();
    }
    
    setupFileInput() {
        if (!this.fileInput) return;
        
        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });
        
        if (this.uploadContainer) {
            this.uploadContainer.addEventListener('click', (e) => {
                e.preventDefault();
                this.fileInput.click();
            });
        }
    }
    
    setupDragAndDrop() {
        if (!this.uploadContainer) return;
        
        this.uploadContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadContainer.classList.add('dragover');
        });
        
        this.uploadContainer.addEventListener('dragleave', () => {
            this.uploadContainer.classList.remove('dragover');
        });
        
        this.uploadContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadContainer.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });
    }
    
    setupCropButtons() {
        if (this.cropBtn) {
            this.cropBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.startCrop();
            });
        }
        
        if (this.saveCropBtn) {
            this.saveCropBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveCrop();
            });
        }
        
        if (this.cancelCropBtn) {
            this.cancelCropBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.cancelCrop();
            });
        }
    }
    
    setupCanvasEvents() {
        if (!this.cropCanvas) return;
        
        // Mouse events
        this.cropCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.cropCanvas.addEventListener('mousemove', (e) => this.drawCropArea(e));
        this.cropCanvas.addEventListener('mouseup', () => this.stopDrawing());
        this.cropCanvas.addEventListener('mouseleave', () => this.stopDrawing());
        
        // Touch events for mobile
        this.cropCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches[0]) this.startDrawing(e.touches[0]);
        });
        
        this.cropCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches[0]) this.drawCropArea(e.touches[0]);
        });
        
        this.cropCanvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopDrawing();
        });
        
        this.cropCanvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.stopDrawing();
        });
    }
    
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.handleFile(file);
        }
    }
    
    handleFile(file) {
        if (!file.type.match('image.*')) {
            this.toast.error('Please select an image file');
            return;
        }
        
        if (!APP_CONSTANTS.ALLOWED_IMAGE_TYPES.includes(file.type)) {
            this.toast.error('Please select a valid image file (JPEG, PNG)');
            return;
        }
        
        if (file.size > APP_CONSTANTS.MAX_IMAGE_SIZE) {
            this.toast.error('Image size should be less than 5MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.originalImage = new Image();
            this.originalImage.onload = () => {
                this.showPreview(this.originalImage);
            };
            this.originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    showPreview(image) {
        if (this.uploadPlaceholder) this.uploadPlaceholder.style.display = 'none';
        if (this.imagePreview) {
            this.imagePreview.style.display = 'block';
            this.imagePreview.src = image.src;
        }
        
        // Set crop canvas size
        const maxSize = 400;
        let width = image.width;
        let height = image.height;
        
        if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
        }
        
        if (this.cropCanvas) {
            this.cropCanvas.width = width;
            this.cropCanvas.height = height;
            
            // Draw image on crop canvas
            this.ctx.clearRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
            this.ctx.drawImage(image, 0, 0, width, height);
        }
    }
    
    startCrop() {
        this.isCropping = true;
        if (this.cropContainer) this.cropContainer.style.display = 'block';
        if (this.imagePreview) this.imagePreview.style.display = 'none';
        
        if (this.cropCanvas) {
            // Draw initial crop area (centered square)
            const size = Math.min(this.cropCanvas.width, this.cropCanvas.height) * 0.8;
            this.cropStartX = (this.cropCanvas.width - size) / 2;
            this.cropStartY = (this.cropCanvas.height - size) / 2;
            this.cropWidth = size;
            this.cropHeight = size;
            
            this.drawCropOverlay();
        }
    }
    
    startDrawing(e) {
        if (!this.isCropping || !this.cropCanvas) return;
        
        const rect = this.cropCanvas.getBoundingClientRect();
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        const clientY = e.clientY || e.touches?.[0]?.clientY;
        
        if (clientX && clientY) {
            this.cropStartX = clientX - rect.left;
            this.cropStartY = clientY - rect.top;
            this.isDrawing = true;
        }
    }
    
    drawCropArea(e) {
        if (!this.isCropping || !this.isDrawing || !this.cropCanvas) return;
        e.preventDefault();
        
        const rect = this.cropCanvas.getBoundingClientRect();
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        const clientY = e.clientY || e.touches?.[0]?.clientY;
        
        if (clientX && clientY) {
            const currentX = clientX - rect.left;
            const currentY = clientY - rect.top;
            
            this.cropWidth = currentX - this.cropStartX;
            this.cropHeight = currentY - this.cropStartY;
            
            // Keep it square
            const size = Math.min(Math.abs(this.cropWidth), Math.abs(this.cropHeight));
            this.cropWidth = this.cropWidth < 0 ? -size : size;
            this.cropHeight = this.cropHeight < 0 ? -size : size;
            
            this.drawCropOverlay();
        }
    }
    
    stopDrawing() {
        this.isDrawing = false;
    }
    
    drawCropOverlay() {
        if (!this.cropCanvas || !this.ctx || !this.originalImage) return;
        
        // Clear and redraw image
        this.ctx.clearRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
        this.ctx.drawImage(this.originalImage, 0, 0, this.cropCanvas.width, this.cropCanvas.height);
        
        // Draw overlay outside crop area
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
        
        // Clear crop area
        this.ctx.clearRect(this.cropStartX, this.cropStartY, this.cropWidth, this.cropHeight);
        
        // Draw crop area border
        this.ctx.strokeStyle = '#4361ee';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(this.cropStartX, this.cropStartY, this.cropWidth, this.cropHeight);
        this.ctx.setLineDash([]);
    }
    
    saveCrop() {
        if (!this.isCropping || !this.cropCanvas || !this.originalImage) return;
        
        // Create a new canvas for the cropped image
        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d');
        
        // Set cropped canvas size (square, 400x400 for good quality)
        const size = 400;
        croppedCanvas.width = size;
        croppedCanvas.height = size;
        
        // Calculate source coordinates (adjust for canvas scaling)
        const scaleX = this.originalImage.width / this.cropCanvas.width;
        const scaleY = this.originalImage.height / this.cropCanvas.height;
        
        const sourceX = this.cropStartX * scaleX;
        const sourceY = this.cropStartY * scaleY;
        const sourceWidth = Math.abs(this.cropWidth) * scaleX;
        const sourceHeight = Math.abs(this.cropHeight) * scaleY;
        
        // Draw cropped image
        croppedCtx.drawImage(
            this.originalImage,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, size, size
        );
        
        // Update preview
        if (this.imagePreview) {
            this.imagePreview.src = croppedCanvas.toDataURL('image/jpeg', 0.9);
        }
        
        // Update crop canvas with the cropped version (for further editing)
        this.ctx.clearRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
        this.ctx.drawImage(croppedCanvas, 0, 0, this.cropCanvas.width, this.cropCanvas.height);
        
        // Exit crop mode
        this.isCropping = false;
        if (this.cropContainer) this.cropContainer.style.display = 'none';
        if (this.imagePreview) this.imagePreview.style.display = 'block';
        
        // Store the cropped image data
        this.croppedImageData = croppedCanvas.toDataURL('image/jpeg', 0.9);
        this.toast.success('Image cropped successfully!');
    }
    
    cancelCrop() {
        this.isCropping = false;
        if (this.cropContainer) this.cropContainer.style.display = 'none';
        if (this.imagePreview) this.imagePreview.style.display = 'block';
    }
    
    getCroppedImage() {
        return this.croppedImageData;
    }
    
    reset() {
        this.originalImage = null;
        this.isCropping = false;
        this.croppedImageData = null;
        
        if (this.uploadPlaceholder) this.uploadPlaceholder.style.display = 'flex';
        if (this.imagePreview) {
            this.imagePreview.style.display = 'none';
            this.imagePreview.src = '';
        }
        if (this.cropContainer) this.cropContainer.style.display = 'none';
        if (this.cropCanvas) {
            this.ctx.clearRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
        }
        if (this.fileInput) this.fileInput.value = '';
    }
}