import JSZip from 'jszip';

export async function downloadImagesAsZip(images: string[], baseName: string = 'bottle-swap') {
  const zip = new JSZip();
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Add each image to the ZIP
  images.forEach((imageBase64, index) => {
    // Convert base64 to binary
    const imageData = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    zip.file(`${baseName}-${index + 1}.png`, imageData, { base64: true });
  });

  // Generate the ZIP file
  const content = await zip.generateAsync({ type: 'blob' });

  // Create a download link
  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = `${baseName}-${timestamp}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(link.href);
}
