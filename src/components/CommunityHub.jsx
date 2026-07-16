const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
if (!allowedTypes.includes(file.type)) {
  setUploadError('Invalid file format. Please select a JPEG, PNG, or WebP image.');
  event.target.value = '';
  setFileInputKey(Date.now());
  return;
}

setUploadError('');

if (file.size > MAX_IMAGE_SIZE_BYTES) {
  setUploadError(
    `Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 500 KB.`
  );
  event.target.value = '';
  setFileInputKey(Date.now());
  return;
}