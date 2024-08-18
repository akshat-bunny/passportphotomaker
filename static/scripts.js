let caman;
let currentFilename;
let cropper;

// Function to handle image background removal
document.querySelectorAll('.remove-bg-btn').forEach(button => {
    button.addEventListener('click', function () {
        const filename = this.getAttribute('data-filename');
        fetch(`/remove_background/${encodeURIComponent(filename)}`, {
            method: 'POST'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Background removal failed');
            }
            return response.blob();
        })
        .then(() => {
            location.reload();
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
});

// Function to handle image cropping
document.querySelectorAll('.crop-btn').forEach(button => {
    button.addEventListener('click', function () {
        currentFilename = this.getAttribute('data-filename');
        const image = document.getElementById('image-to-crop');
        image.src = `/uploads/${currentFilename}`;

        image.onload = function () {
            if (cropper) {
                cropper.destroy(); // Clean up any existing cropper instance
            }
            cropper = new Cropper(image, {
                aspectRatio: 1.33 / 1.5,
            });
            const cropModal = new bootstrap.Modal(document.getElementById('cropModal'));
            cropModal.show();
        };
    });
});

// Function to handle cropped image upload
document.getElementById('crop-confirm-btn').addEventListener('click', function () {
    if (cropper) {
        const canvas = cropper.getCroppedCanvas();

        // Convert the canvas to a Blob and send it via fetch
        canvas.toBlob(blob => {
            const formData = new FormData();
            formData.append('croppedImage', blob, currentFilename); // Append the image blob with the filename

            fetch(`/update_photo/${encodeURIComponent(currentFilename)}`, {
                method: 'POST',
                body: formData // Send the FormData containing the image blob
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Crop upload failed');
                }
                return response.blob(); // Return the response blob or handle it accordingly
            })
            .then(() => {
                // Reload the page to reflect the updated image
                location.reload();
            })
            .catch(error => {
                console.error('Error:', error);
            });
        }, 'image/jpeg'); // Specify the MIME type of the image (e.g., 'image/jpeg')
    }
});


// Function to handle background color change
document.querySelectorAll('.change-bg-btn').forEach(button => {
    button.addEventListener('click', function () {
        currentFilename = this.getAttribute('data-filename');
        const image = document.getElementById('bg-image-to-change');
        image.src = `/uploads/${currentFilename}`;
        const changeBgModal = new bootstrap.Modal(document.getElementById('changeBgModal'));
        changeBgModal.show();
    });
});

// Function to handle background color change confirmation
document.getElementById('change-bg-confirm-btn').addEventListener('click', function () {
    const color = document.getElementById('color-picker').value;
    fetch(`/change_background/${encodeURIComponent(currentFilename)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ color: color })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Change background failed');
        }
        return response.blob();
    })
    .then(() => {
        location.reload();
    })
    .catch(error => {
        console.error('Error:', error);
    });
});

// Function to handle border addition
document.querySelectorAll('.add-border-btn').forEach(button => {
    button.addEventListener('click', function () {
        currentFilename = this.getAttribute('data-filename');
        fetch(`/add_border/${encodeURIComponent(currentFilename)}`, {
            method: 'POST'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Add border failed');
            }
            return response.blob();
        })
        .then(() => {
            location.reload();
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
});

// Function to get filenames for printing
function getFilenames() {
    const filenamesSet = new Set();
    document.querySelectorAll('.card-body button').forEach(button => {
        const filename = button.getAttribute('data-filename');
        if (filename) {
            filenamesSet.add(encodeURIComponent(filename));
        }
    });
    return Array.from(filenamesSet).join(',');
}

// Function to handle print button click
document.getElementById('next-btn').addEventListener('click', () => {
    const filenames = getFilenames();
    const url = `/print_photos?filenames=${filenames}`;
    window.location.href = url;
});

// Function to handle image editing
document.querySelectorAll('.edit-photo-btn').forEach(button => {
    button.addEventListener('click', function () {
        currentFilename = this.getAttribute('data-filename');
        const image = document.getElementById('photo-to-edit');
        image.src = `/uploads/${currentFilename}`;

        image.onload = function () {
            caman = Caman(image, function () {
                this.render();
            });

            // Reset the range inputs
            document.getElementById('brightness-range').value = 0;
            document.getElementById('contrast-range').value = 0;
            document.getElementById('hue-range').value = 0;
            document.getElementById('saturation-range').value = 0;

            const editPhotoModal = new bootstrap.Modal(document.getElementById('editPhotoModal'));
            editPhotoModal.show();
        };
    });
});

// Function to apply filters live
function applyFilters() {
    if (caman) {
        caman.revert(false); // Revert to the original image before applying new filters
        caman.brightness(parseInt(document.getElementById('brightness-range').value));
        caman.contrast(parseInt(document.getElementById('contrast-range').value));
        caman.hue(parseInt(document.getElementById('hue-range').value));
        caman.saturation(parseInt(document.getElementById('saturation-range').value));
        caman.render();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const brightnessRange = document.getElementById('brightness-range');
    const contrastRange = document.getElementById('contrast-range');
    const hueRange = document.getElementById('hue-range');
    const saturationRange = document.getElementById('saturation-range');
    const photoToEdit = document.getElementById('photo-to-edit');
    let camanInstance;

    // Ensure the image is fully loaded before initializing CamanJS
    document.querySelectorAll('.edit-photo-btn').forEach(button => {
        button.addEventListener('click', function () {
            currentFilename = this.getAttribute('data-filename');
            photoToEdit.src = `/uploads/${currentFilename}`;

            photoToEdit.onload = function () {
                // Initialize CamanJS only when the image is loaded
                camanInstance = Caman(photoToEdit, function () {
                    this.render();
                });

                // Reset the range inputs
                brightnessRange.value = 0;
                contrastRange.value = 0;
                hueRange.value = 0;
                saturationRange.value = 0;

                const editPhotoModal = new bootstrap.Modal(document.getElementById('editPhotoModal'));
                editPhotoModal.show();
            };
        });
    });

    // Function to apply filters live
    function applyFilters() {
        if (camanInstance) {
            camanInstance.revert(false); // Revert to the original image before applying new filters
            camanInstance.brightness(parseInt(brightnessRange.value))
                .contrast(parseInt(contrastRange.value))
                .hue(parseInt(hueRange.value))
                .saturation(parseInt(saturationRange.value))
                .render();
        }
    }

    // Attach event listeners to range inputs for live editing
    brightnessRange.addEventListener('input', applyFilters);
    contrastRange.addEventListener('input', applyFilters);
    hueRange.addEventListener('input', applyFilters);
    saturationRange.addEventListener('input', applyFilters);

    // Function to handle edited image upload
    document.getElementById('edit-confirm-btn').addEventListener('click', function () {
        if (camanInstance) {
            camanInstance.render(function () {
                // Convert the CamanJS canvas to a Blob and send it via fetch
                this.canvas.toBlob(function (blob) {
                    console.log('Blob created:', blob);

                    const formData = new FormData();
                    formData.append('editedImage', blob, currentFilename); // Append the Blob with the filename

                    fetch(`/update_edited_photo/${encodeURIComponent(currentFilename)}`, {
                        method: 'POST',
                        body: formData // Send the FormData containing the image blob
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Edit upload failed: ' + response.statusText);
                        }
                        console.log('Upload successful, refreshing page...');
                        location.reload();
                    })
                    .catch(error => {
                        console.error('Error:', error);
                    });
                }, 'image/jpeg'); // Specify the MIME type of the image (e.g., 'image/jpeg')
            });
        } else {
            console.error('CamanJS is not initialized');
        }
    });
});