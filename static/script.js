const imageToCrop = document.getElementById('imageToCrop');
const cropButton = document.getElementById('saveButton');
const cancelButton = document.getElementById('cancelButton');
const updateButton = document.getElementById('updateButton');
const cancelUploadButton = document.getElementById('cancelUploadButton');
let originalFileExtension = 'png'

let cropper;

Dropzone.options.dropzoneContainer = {
  url: "#",
  maxFiles: 1,
  acceptedFiles: "image/*",
  autoProcessQueue: false,  // Prevent Dropzone from uploading immediately
  init: function() {
      this.on("addedfile", function(file) {
          originalFileExtension = file.name.split('.').pop();
          const reader = new FileReader();
          this.removeAllFiles(true);
          reader.onload = function(e) {
              document.getElementById('imageToCrop').src = e.target.result;
              document.getElementById('uploadModal').style.display = 'none';
              document.getElementById('cropModal').style.display = 'flex';
          };
          reader.readAsDataURL(file);
      });
  }
};

imageToCrop.onload = function() {
  if (cropper) cropper.destroy();
  cropper = new Cropper(imageToCrop, {
    aspectRatio: 1,
    viewMode: 1, // restrict crop box to not go outside the image boundaries
    autoCropArea: 1, // make the initial crop box as large as the container size
    cropBoxResizable: false, // disable manual resizing of the crop box
    data: {
      width: 512,
      height: 512
    }
  });
};

cropButton.addEventListener('click', () => {
  if (cropper) {
      const croppedCanvas = cropper.getCroppedCanvas({
        width: 512,
        height: 512,
        imageSmoothingQuality: 'high'
      });
      const croppedImageData = croppedCanvas.toDataURL('image/png');
      // Convert Data URL to Blob
      fetch(croppedImageData)
      .then(res => res.blob())
      .then(blob => {
          const uniqueFilename = 'avatar_' + Date.now() + '.' + originalFileExtension;
          const formData = new FormData();
          formData.append('avatar', blob, uniqueFilename);

          // Send the Blob data to the server
          fetch('/upload', {
              method: 'POST',
              body: formData,
          })
          .then(response => response.json())
          .then(data => {
              console.log(data);
              const avatarUrl = data.imageUrl;
              const borderColor = data.borderColor;
              document.getElementById('avatar').src = avatarUrl;
              document.getElementById('avatar').style.display = 'block';
              document.getElementById('avatar-container').style.display = 'block';
              document.getElementById('avatar-container').style.border = '15px ridge';
              document.getElementById('avatar-container').style.borderColor = borderColor;
              document.getElementById('cropModal').style.display = 'none';
              })
          .catch((error) => {
              console.error('Error uploading image:', error);
          });
      });
  } else {
      alert('Please select an image and crop it before clicking Crop.');
  }
});

cancelButton.addEventListener('click', () => {
  if (cropper) {
    document.getElementById('cropModal').style.display = 'none';
  }
});

updateButton.addEventListener('click', () => {
  document.getElementById('uploadModal').style.display = 'flex';
});

cancelUploadButton.addEventListener('click', () => {
  document.getElementById('uploadModal').style.display = 'none';
});
