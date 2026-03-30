/**
 * Upload file to storage
 * @param file File to upload
 * @param path Storage path
 * @returns Public URL of the uploaded file
 */
export async function storagePut(file: File, path: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("path", path);

  const response = await fetch("/api/storage/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  const data = await response.json();
  return data.url;
}
