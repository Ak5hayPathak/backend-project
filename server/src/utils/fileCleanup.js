import fs from "fs/promises";

const deleteLocalFiles = async (files) => {
  if (!files) return;

  const fileArrays = Object.values(files);

  for (const fileArray of fileArrays) {
    for (const file of fileArray) {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.error("Failed to delete temporary file:", file.path);
      }
    }
  }
};

export { deleteLocalFiles };
